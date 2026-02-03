/**
 * Purchase Order Send Email API Route
 * 采购订单发送邮件API
 * 
 * POST /api/purchase-orders/[id]/send-email
 * Sends PO email to supplier with PDF attachment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { createEmailService } from '@/lib/services/email-service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SendEmailRequest {
  to: string;
  subject: string;
  message: string;
  pdfBase64: string;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: poId } = await params;
    const pb = await createServerPocketBase();

    // Check authentication
    if (!pb.authStore.isValid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = pb.authStore.record?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Parse request body
    const body: SendEmailRequest = await request.json();
    const { to, subject, message, pdfBase64 } = body;

    if (!to || !subject || !pdfBase64) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, pdfBase64' },
        { status: 400 }
      );
    }

    // Get PO details
    let po;
    try {
      po = await pb.collection('purchase_orders').getOne(poId);
    } catch (e: any) {
      if (e.status === 404) {
        return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });
      }
      throw e;
    }

    // Create email service
    let emailService;
    try {
      emailService = await createEmailService(userId, pb);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Failed to initialize email service' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Send email with PDF attachment
    const result = await emailService.sendEmail({
      to,
      subject,
      html: `<pre style="font-family: sans-serif; white-space: pre-wrap;">${message}</pre>`,
      attachments: [
        {
          filename: `${po.code}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    // Update PO status to 'sent' if currently draft
    if (po.status === 'draft') {
      await pb.collection('purchase_orders').update(poId, { status: 'sent' });
    }

    return NextResponse.json({
      success: true,
      message: `Email sent to ${to}`,
    });
  } catch (error: any) {
    console.error('[PO Send Email] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
