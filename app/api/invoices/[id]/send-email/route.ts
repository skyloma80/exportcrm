import { NextRequest, NextResponse } from 'next/server'
import { createServerPocketBase } from '@/lib/pocketbase/server'
import { createEmailService } from '@/lib/services/email-service'
import { brandingService } from '@/lib/services/branding-service'
import { generateBrandedEmailHTML, generateInvoiceEmailContent } from '@/lib/email/branded-template'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/invoices/[id]/send-email - 发送形式发票邮件
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const pb = await createServerPocketBase()

    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = pb.authStore.record?.id
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    const body = await request.json()
    const { to, subject, message, pdfBase64 } = body

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject' },
        { status: 400 }
      )
    }

    // 获取发票信息
    const invoice = await pb.collection('proforma_invoices').getOne(id, {
      expand: 'order,order.customer,order.project',
    })

    // 创建邮件服务
    const emailService = await createEmailService(userId, pb)

    // 获取品牌配置 (图片已经是 base64 格式，直接使用)
    // 清除缓存确保获取最新数据
    brandingService.clearCache()
    const branding = await brandingService.getDocumentBranding('customer')
    console.log('[Invoice Email] Branding loaded:', {
      hasLogo: !!branding.logoBase64,
      logoLength: branding.logoBase64?.length || 0,
      companyName: branding.companyName,
    })

    // 准备附件
    const attachments = []
    if (pdfBase64) {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64')
      attachments.push({
        filename: `${invoice.code}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      })
    }

    // 格式化日期
    const formatDate = (date: string) => {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }

    // 生成邮件内容
    const bodyContent = message || generateInvoiceEmailContent({
      invoiceCode: invoice.code,
      issueDate: formatDate(invoice.issue_date || invoice.created),
      orderCode: invoice.expand?.order?.code,
      totalAmount: `${invoice.currency} ${invoice.total_amount?.toLocaleString()}`,
    })

    // 构建品牌化邮件 HTML
    // 如果用户提供了自定义消息，将换行符转换为 HTML 格式
    const formattedMessage = message 
      ? message.split('\n').map((line: string) => line.trim() ? `<p>${line}</p>` : '<br>').join('\n')
      : bodyContent
    
    const html = generateBrandedEmailHTML({
      branding,
      language: 'en',
      recipientName: invoice.expand?.order?.expand?.customer?.name,
      subject,
      bodyContent: formattedMessage,
      attachmentNote: `${invoice.code}.pdf`,
    })

    // 发送邮件
    const result = await emailService.sendEmail({
      to,
      subject,
      html,
      attachments,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      )
    }

    // 更新发票状态为已发送
    if (invoice.status === 'draft') {
      await pb.collection('proforma_invoices').update(id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send invoice email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
