/**
 * API Route: Send Order Email with PI Attachment
 * 发送订单邮件（附带PI文档）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerPocketBase } from '@/lib/pocketbase/server'
import { createEmailService } from '@/lib/services/email-service'
import { brandingService } from '@/lib/services/branding-service'
import { generateBrandedEmailHTML } from '@/lib/email/branded-template'
import { createStorage } from '@/lib/s3/storage'

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
    
    // Parse request body
    const body = await request.json()
    const { orderId, to, subject, body: emailBody, piPath } = body
    
    // Validate required fields
    if (!orderId || !to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Load order data
    const order = await pb.collection('orders').getOne(orderId, {
      expand: 'project,customer',
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
    if (piPath) {
      try {
        const storage = createStorage()
        const { data: blob, error } = await storage.download(piPath)
        
        if (!error && blob) {
          const arrayBuffer = await blob.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          
          attachments.push({
            filename: piPath.split('/').pop() || 'PI.pdf',
            content: buffer,
            contentType: 'application/pdf',
          })
        }
      } catch (error) {
        console.error('Error loading PI attachment:', error)
        // Continue without attachment
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
      attachmentNote: piPath ? piPath.split('/').pop() : undefined,
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
