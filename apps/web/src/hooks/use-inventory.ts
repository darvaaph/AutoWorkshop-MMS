import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  bulkStockAuditApi,
  getInventoryLogsApi,
  stockAuditApi,
  stockInApi,
  type InventoryLogType,
} from '@/lib/api/inventory';

export function useInventoryLogs(params?: {
  type?: InventoryLogType;
  product_id?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['inventory', params],
    queryFn: () => getInventoryLogsApi(params),
  });
}

export function useStockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      product_id: number;
      qty: number;
      buy_price: number;
      notes?: string;
    }) => stockInApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stok berhasil ditambahkan');
    },
    onError: () => toast.error('Gagal menambahkan stok'),
  });
}

export function useStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      product_id: number;
      actual_stock: number;
      reason?: string;
      notes?: string;
    }) => stockAuditApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stok opname berhasil disimpan');
    },
    onError: () => toast.error('Gagal menyimpan stok opname'),
  });
}

export function useBulkStockAudit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      items: Array<{
        product_id: number;
        actual_stock: number;
        reason?: string;
        notes?: string;
      }>
    ) => bulkStockAuditApi(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stok opname massal berhasil disimpan');
    },
    onError: () => toast.error('Gagal menyimpan stok opname massal'),
  });
}
