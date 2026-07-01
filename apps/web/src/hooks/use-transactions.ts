import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  addPaymentApi,
  cancelTransactionApi,
  createTransactionApi,
  getTransactionApi,
  getTransactionsApi,
  type CreateTransactionPayload,
  type PaymentMethod,
  type TransactionStatus,
} from '@/lib/api/transactions';

/** Surface the API's descriptive message (e.g. "Insufficient stock…") instead of a generic toast. */
function apiErrorMessage(error: unknown, fallback: string): string {
  const msg = (error as { response?: { data?: { message?: unknown } } })
    ?.response?.data?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : fallback;
}

export function useTransactions(params?: {
  status?: TransactionStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => getTransactionsApi(params),
  });
}

export function useTransaction(id: number | null) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => getTransactionApi(id!),
    enabled: id !== null,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTransactionPayload) =>
      createTransactionApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Transaksi berhasil dibuat');
    },
    onError: error =>
      toast.error(apiErrorMessage(error, 'Gagal membuat transaksi')),
  });
}

export function useAddPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      amount,
      payment_method,
      reference_number,
      notes,
    }: {
      id: number;
      amount: number;
      payment_method: PaymentMethod;
      reference_number?: string;
      notes?: string;
    }) =>
      addPaymentApi(id, { amount, payment_method, reference_number, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Pembayaran berhasil dicatat');
    },
    onError: error =>
      toast.error(apiErrorMessage(error, 'Gagal mencatat pembayaran')),
  });
}

export function useCancelTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cancelTransactionApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Transaksi dibatalkan, stok dikembalikan');
    },
    onError: error =>
      toast.error(apiErrorMessage(error, 'Gagal membatalkan transaksi')),
  });
}
