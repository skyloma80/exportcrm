import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    const pb = await createServerPocketBase();

    if (!pb.authStore.isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    console.log('Updating shipment:', id, 'to status:', status);
    
    // Update shipment status
    const updatedShipment = await pb.collection('shipments').update(id, {
      status,
    });

    return NextResponse.json(updatedShipment);
  } catch (error: any) {
    console.error('Error updating shipment status:', error);
    console.error('Error details:', error.response);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to update shipment status',
        details: error.response?.data || error.response
      },
      { status: error.status || 500 }
    );
  }
}
