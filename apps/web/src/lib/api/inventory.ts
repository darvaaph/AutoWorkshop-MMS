import { apiClient } from './client';

export type InventoryLogType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface InventoryLog {
  id: number;
  product_id: number;
  user_id: number;
  type: InventoryLogType;
  qty: number;
  stock_before: number;
  stock_after: number;
  price_per_unit: string | null;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  product?: { id: number; sku: string; name: string };
}

export async function getInventoryLogsApi(params?: {
  type?: InventoryLogType;
  product_id?: number;
  page?: number;
  limit?: number;
}): Promise<InventoryLog[]> {
  const res = await apiClient.get<{ data: InventoryLog[] }>('/inventory', {
    params,
  });
  return res.data.data;
}

export async function stockInApi(payload: {
  product_id: number;
  qty: number;
  buy_price: number;
  notes?: string;
}): Promise<{
  log: InventoryLog;
  product: { id: number; stock: number; price_buy: string };
}> {
  const res = await apiClient.post<{
    data: {
      log: InventoryLog;
      product: { id: number; stock: number; price_buy: string };
    };
  }>('/inventory/in', payload);
  return res.data.data;
}

export async function stockAuditApi(payload: {
  product_id: number;
  actual_stock: number;
  reason?: string;
  notes?: string;
}): Promise<InventoryLog> {
  const res = await apiClient.post<{ data: InventoryLog }>(
    '/inventory/stock-audit',
    payload
  );
  return res.data.data;
}

export async function bulkStockAuditApi(
  items: Array<{
    product_id: number;
    actual_stock: number;
    reason?: string;
    notes?: string;
  }>
): Promise<InventoryLog[]> {
  const res = await apiClient.post<{ data: InventoryLog[] }>(
    '/inventory/stock-audit/bulk',
    { items }
  );
  return res.data.data;
}
