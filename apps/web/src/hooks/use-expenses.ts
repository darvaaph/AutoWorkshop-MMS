import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createExpenseApi,
  deleteExpenseApi,
  getExpensesApi,
  updateExpenseApi,
  type ExpenseCategory,
} from '@/lib/api/expenses';

export function useExpenses(params?: {
  category?: ExpenseCategory;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ['expenses', params],
    queryFn: () => getExpensesApi(params),
  });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      category: ExpenseCategory;
      description: string;
      amount: number;
      date: string;
    }) => createExpenseApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Pengeluaran berhasil dicatat');
    },
    onError: () => toast.error('Gagal mencatat pengeluaran'),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number;
      category: ExpenseCategory;
      description: string;
      amount: number;
      date: string;
    }) => updateExpenseApi(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Pengeluaran berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui pengeluaran'),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteExpenseApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Pengeluaran berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus pengeluaran'),
  });
}
