/**
 * Shipment Items API
 * 发货明细 API
 * 
 * GET /api/shipments/[id]/items - 获取发货明细
 * POST /api/shipments/[id]/items - 保存发货明细
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerPocketBase } from '@/lib/pocketbase/server';

interface SOItem {
  id: string;
  part_number: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
}

interface ShipmentItem {
  id: string;
  shipment: string;
  order_item: string;
  quantity: number;
  packages?: number;
  gross_weight?: number;
  net_weight?: number;
  volume?: number;
  package_length?: number;
  package_width?: number;
  package_height?: number;
  part_number?: string;
  product_code?: string;
  product_name?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params;
    const pb = await createServerPocketBase();

    const items = await pb.collection('shipment_items').getFullList<ShipmentItem>({
      filter: `shipment = "${shipmentId}"`,
    });

    const formattedItems = items.map((item) => ({
      id: item.id,
      shipment: item.shipment,
      order_item: item.order_item,
      quantity: item.quantity,
      packages: item.packages,
      gross_weight: item.gross_weight,
      net_weight: item.net_weight,
      volume: item.volume,
      package_length: item.package_length,
      package_width: item.package_width,
      package_height: item.package_height,
      part_number: item.part_number,
      product_code: item.product_code,
      product_name: item.product_name,
    }));

    return NextResponse.json({ items: formattedItems });
  } catch (error: any) {
    console.error('Error fetching shipment items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shipment items' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shipmentId } = await params;
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items must be an array' },
        { status: 400 }
      );
    }

    const pb = await createServerPocketBase();

    // 获取发货单关联的 SO 订单，用于查找产品信息
    const shipment = await pb.collection('shipments').getOne<{ order: string }>(shipmentId);
    let soItemsMap = new Map<string, SOItem>();
    if (shipment.order) {
      try {
        const so = await pb.collection('so').getOne<{ items: SOItem[] }>(shipment.order);
        if (Array.isArray(so.items)) {
          so.items.forEach(item => soItemsMap.set(item.id, item));
        }
      } catch (e) {
        // SO not found, items stored without product info
      }
    }

    const existingItems = await pb.collection('shipment_items').getFullList<ShipmentItem>({
      filter: `shipment = "${shipmentId}"`,
    });
    const existingMap = new Map(existingItems.map(item => [item.order_item, item]));

    const results = [];
    const processedOrderItems = new Set<string>();

    for (const item of items) {
      const { orderItemId, quantity } = item;
      processedOrderItems.add(orderItemId);

      const soItem = soItemsMap.get(orderItemId);

      const existing = existingMap.get(orderItemId);

      if (existing) {
        const updated = await pb.collection('shipment_items').update(existing.id, {
          quantity,
          part_number: soItem?.part_number,
          product_name: soItem?.product_name,
          product_code: soItem?.part_number,
        });
        results.push(updated);
      } else {
        const created = await pb.collection('shipment_items').create({
          shipment: shipmentId,
          order_item: orderItemId,
          quantity,
          part_number: soItem?.part_number,
          product_name: soItem?.product_name,
          product_code: soItem?.part_number,
        });
        results.push(created);
      }
    }

    for (const existing of existingItems) {
      if (!processedOrderItems.has(existing.order_item)) {
        await pb.collection('shipment_items').delete(existing.id);
      }
    }

    return NextResponse.json({ items: results, success: true });
  } catch (error: any) {
    console.error('Error saving shipment items:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save shipment items' },
      { status: 500 }
    );
  }
}
