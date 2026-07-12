import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';
import { generateOrderCode, setCodeGeneratorPb } from '@/lib/services/code-generator';

/**
 * Create an order from a template
 * @description Creates a new sales order by copying data from a saved template. Generates a compact order code, applies customer/project overrides, and copies template items into the new order.
 * @response 200:OrderSchema:Order created from template
 * @response 400:ErrorResponse:template_id is required
 * @response 401:ErrorResponse:Unauthorized
 * @response 404:ErrorResponse:Template not found
 * @response 500:ErrorResponse:Server error
 */
export async function POST(request: NextRequest) {
  try {
    const pb = await createServerPocketBase();
    const body = await request.json();

    const { template_id, customer, project, overrides } = body;

    if (!template_id) {
      return NextResponse.json(
        { error: 'template_id is required' },
        { status: 400 }
      );
    }

    // Get the template
    const template = await pb.collection('order_templates').getOne(template_id);

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Generate new order code in compact format: A{YY}{XXXX}
    setCodeGeneratorPb(pb);
    const code = await generateOrderCode(pb);

    // Create order from template
    const orderData = {
      code,
      customer: customer || template.template_data?.customer,
      project: project || template.template_data?.project,
      currency: overrides?.currency || template.template_data?.currency || 'USD',
      incoterm: overrides?.incoterm || template.template_data?.incoterm,
      payment_terms: overrides?.payment_terms || template.template_data?.payment_terms,
      delivery_port: overrides?.delivery_port || template.template_data?.delivery_port,
      destination_port: overrides?.destination_port || template.template_data?.destination_port,
      remarks: overrides?.remarks || template.template_data?.remarks,
      status: 'draft',
      total_amount: 0,
    };

    const newOrder = await pb.collection('so').create(orderData);

    // Create order items from template
    const templateItems = template.template_items || [];
    let totalAmount = 0;

    for (const item of templateItems) {
      const itemData = {
        order: newOrder.id,
        product: item.product,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit: item.unit || 'pcs',
        amount: item.quantity * item.unit_price,
        remarks: item.remarks,
      };
      
      totalAmount += itemData.amount;
      await pb.collection('order_items').create(itemData);
    }

    // Update order total
    await pb.collection('so').update(newOrder.id, {
      total_amount: totalAmount,
    });

    return NextResponse.json({
      order: { ...newOrder, total_amount: totalAmount },
      message: 'Order created from template successfully',
    });
  } catch (error: any) {
    console.error('Failed to create order from template:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
