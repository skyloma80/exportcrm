import { NextRequest, NextResponse } from 'next/server'
import { createServerPocketBase } from '@/lib/pocketbase/server'
import { createEmailService } from '@/lib/services/email-service'
import { brandingService } from '@/lib/services/branding-service'
import { generateBrandedEmailHTML } from '@/lib/email/branded-template'
import { createStorage } from '@/lib/s3/storage'

/**
 * Send an order email with PI attachment
 * @description Sends a branded email for a sales order, optionally attaching a PDF/XLSX PI document. Validates the order exists, builds branded HTML, and dispatches via the email service.
 * @request EmailSchema
 * @response 200:EmailResultSchema:Email sent successfully
 * @response 400:ErrorResponse:Missing required fields
 * @response 401:ErrorResponse:Unauthorized
 * @response 404:ErrorResponse:Order not found
 * @response 500:ErrorResponse:Server error
 */
export async function POST(request: NextRequest) {
  try {
    const pb = await createServerPocketBase()
    
    // Check authentication
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userId = pb.authStore.record?.id
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }
    
    const body = await request.json()
    const { orderId, to, subject, body: emailBody, attachmentBase64, attachmentName } = body
    
    // Validate required fields
    if (!orderId || !to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Load order data from so collection (FlatSO)
    const order = await pb.collection('so').getOne(orderId, {
      expand: 'project_id,customer_id',
    })
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    // Create email service
    const emailService = await createEmailService(userId, pb)
    
    // Get branding configuration
    brandingService.clearCache()
    const branding = await brandingService.getDocumentBranding('customer')
    
    // Get branding from database directly (fix cache issue)
    const dbConfig = await pb
      .collection('app_config')
      .getFirstListItem('key = "document_branding"')
    const logoUrlFromDb = dbConfig?.value?.logo_url
    const companyNameFromDb = dbConfig?.value?.primary_office?.name
    
    if (!branding.logoUrl && logoUrlFromDb) {
      branding.logoUrl = logoUrlFromDb
    }
    if (companyNameFromDb) {
      branding.companyName = companyNameFromDb
    }
    
    // Prepare attachments
    const attachments = []
    if (attachmentBase64 && attachmentName) {
      try {
        const buffer = Buffer.from(attachmentBase64, 'base64')
        attachments.push({
          filename: attachmentName,
          content: buffer,
          contentType: attachmentName.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      } catch (error) {
        console.error('Error processing attachment:', error)
      }
    }
    
    // Format message (convert newlines to <br>)
    const formattedMessage = emailBody.replace(/\n/g, '<br>')
    
    // Generate branded email HTML
    const html = generateBrandedEmailHTML({
      branding,
      language: 'en',
      recipientName: null, // User already included greeting in message
      subject,
      bodyContent: formattedMessage,
      attachmentNote: attachmentName,
    })
    
    // Send email
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
    
    // TODO: Update task status when task management is implemented
    // Mark "send_email" task as completed
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending order email:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
