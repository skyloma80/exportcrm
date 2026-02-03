/**
 * Shipment Hooks
 * 发货 React Hooks
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPocketBase } from '@/lib/pocketbase/auth';
import type {
  Shipment,
  ShipmentWithExpand,
  ShipmentItem,
  ShipmentItemWithExpand,
  ShipmentStatus,
  ShipmentCreateInput,
  ShipmentItemCreateInput,
} from '@/lib/pocketbase/services/shipments';

// ============================================================================
// Shipment Hooks
// ============================================================================

interface UseShipmentsOptions {
  orderId?: string;
  status?: ShipmentStatus;
  page?: number;
  perPage?: number;
}

export function useShipments(options: UseShipmentsOptions = {}) {
  const { orderId, status, page = 1, perPage = 20 } = options;

  const [shipments, setShipments] = useState<ShipmentWithExpand[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchShipments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      const filters: string[] = [];
      if (orderId) filters.push(`order = "${orderId}"`);
      if (status) filters.push(`status = "${status}"`);
      const filter = filters.length > 0 ? filters.join(' && ') : '';

      const result = await pb.collection('shipments').getList<ShipmentWithExpand>(page, perPage, {
        filter,
        sort: '-id',
        expand: 'order,order.customer,order.project',
      });

      setShipments(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch shipments'));
    } finally {
      setIsLoading(false);
    }
  }, [orderId, status, page, perPage]);

  useEffect(() => {
    fetchShipments();
  }, [fetchShipments]);

  return { shipments, totalItems, totalPages, isLoading, error, refetch: fetchShipments };
}

export function useShipment(id: string | null) {
  const [shipment, setShipment] = useState<ShipmentWithExpand | null>(null);
  const [items, setItems] = useState<ShipmentItemWithExpand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchShipment = useCallback(async () => {
    if (!id) {
      setShipment(null);
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pb = getPocketBase();
      const result = await pb.collection('shipments').getOne<ShipmentWithExpand>(id, {
        expand: 'order,order.customer,order.project,shipment_items_via_shipment,shipment_items_via_shipment.order_item,shipment_items_via_shipment.order_item.product',
      });
      setShipment(result);
      setItems(result.expand?.shipment_items_via_shipment || []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch shipment'));
      setShipment(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchShipment();
  }, [fetchShipment]);

  return { shipment, items, isLoading, error, refetch: fetchShipment };
}

export function useShipmentMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createShipment = useCallback(async (data: ShipmentCreateInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const { shipmentService } = await import('@/lib/pocketbase/services/shipments');
      return await shipmentService.createShipment(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create shipment'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateShipment = useCallback(async (id: string, data: Partial<Shipment>) => {
    setIsLoading(true);
    setError(null);
    try {
      const { shipmentService } = await import('@/lib/pocketbase/services/shipments');
      return await shipmentService.update(id, data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update shipment'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: ShipmentStatus) => {
    setIsLoading(true);
    setError(null);
    try {
      const { shipmentService } = await import('@/lib/pocketbase/services/shipments');
      return await shipmentService.updateStatus(id, status);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to update status'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteShipment = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { shipmentService } = await import('@/lib/pocketbase/services/shipments');
      await shipmentService.delete(id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to delete shipment'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, createShipment, updateShipment, updateStatus, deleteShipment };
}

export function useShipmentItemMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createItem = useCallback(async (data: ShipmentItemCreateInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const { shipmentItemService } = await import('@/lib/pocketbase/services/shipments');
      return await shipmentItemService.createItem(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to create item'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { shipmentItemService } = await import('@/lib/pocketbase/services/shipments');
      await shipmentItemService.delete(id);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to delete item'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, createItem, deleteItem };
}

export default {
  useShipments,
  useShipment,
  useShipmentMutations,
  useShipmentItemMutations,
};
