import { NextRequest, NextResponse } from 'next/server'
import { createServerPocketBase } from '@/lib/pocketbase/server'
import { createEmailService } from '@/lib/services/email-service'
import { brandingService } from '@/lib/services/branding-service'
import { generateBrandedEmailHTML, generateQuotationEmailContent } from '@/lib/email/branded-template'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST /api/quotations/[id]/send-email - 发送报价单邮件
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

    // 获取报价单信息
    const quotation = await pb.collection('quotations').getOne(id, {
      expand: 'customer,project',
    })

    // 创建邮件服务
    const emailService = await createEmailService(userId, pb)

    // 获取品牌配置 (图片已经是 base64 格式，直接使用)
    // 清除缓存确保获取最新数据
    brandingService.clearCache()
    const branding = await brandingService.getDocumentBranding('customer')
    
    // 直接从数据库获取配置，修复 brandingService 缓存问题
    const dbConfig = await pb
      .collection('app_config')
      .getFirstListItem('key = "document_branding"')
    const logoUrlFromDb = dbConfig?.value?.logo_url
    const companyNameFromDb = dbConfig?.value?.primary_office?.name // English for customer
    
    // 如果 brandingService 没有返回正确的值，使用数据库的值
    if (!branding.logoUrl && logoUrlFromDb) {
      branding.logoUrl = logoUrlFromDb
    }
    if (companyNameFromDb) {
      branding.companyName = companyNameFromDb
    }
    
    console.log('[Quotation Email] Branding loaded:', {
      logoUrl: branding.logoUrl,
      logoUrlFromDb,
      companyName: branding.companyName,
      companyNameFromDb,
    })

    // 准备附件
    const attachments = []
    if (pdfBase64) {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64')
      attachments.push({
        filename: `${quotation.code}.pdf`,
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

    // 计算有效期
    let validUntil = null;
    if (quotation.validity_days) {
      // 尝试从字符串中提取数字天数
      const daysMatch = quotation.validity_days.toString().match(/\d+/);
      if (daysMatch) {
        const days = parseInt(daysMatch[0]);
        validUntil = new Date(new Date(quotation.created).getTime() + days * 24 * 60 * 60 * 1000);
      }
    }

    // 生成邮件内容
    const bodyContent = message || generateQuotationEmailContent({
      quotationCode: quotation.code,
      date: formatDate(quotation.created),
      validUntil: validUntil ? formatDate(validUntil.toISOString()) : '-',
      totalAmount: `${quotation.currency} ${quotation.total_amount?.toLocaleString()}`,
    })

    // 构建品牌化邮件 HTML
    // 如果用户提供了自定义消息，将换行符转换为 <br> 标签
    const formattedMessage = message 
      ? message.replace(/\n/g, '<br>')
      : bodyContent
    
    // 如果用户提供了自定义消息，传 null 表示不显示 greeting（避免重复称呼）
    // 如果没有自定义消息，传客户名称显示个性化 greeting
    const html = generateBrandedEmailHTML({
      branding,
      language: 'en',
      recipientName: message ? null : quotation.expand?.customer?.name,
      subject,
      bodyContent: formattedMessage,
      attachmentNote: `${quotation.code}.pdf`,
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

    // 更新报价单状态为已发送
    if (quotation.status === 'draft') {
      await pb.collection('quotations').update(id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send quotation email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
