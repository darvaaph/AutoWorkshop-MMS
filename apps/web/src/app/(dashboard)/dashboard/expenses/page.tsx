'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '@/hooks/use-expenses';
import type { Expense, ExpenseCategory } from '@/lib/api/expenses';
import { formatRupiah, formatDate } from '@/lib/format';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth.store';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SALARY: 'Gaji',
  UTILITIES: 'Utilitas',
  PURCHASING: 'Pembelian',
  OTHER: 'Lainnya',
};

const CATEGORY_STYLE: Record<
  ExpenseCategory,
  { bg: string; color: string; border: string }
> = {
  SALARY: { bg: '#f0f4ff', color: '#3730a3', border: '#c7d2fe' },
  UTILITIES: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  PURCHASING: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  OTHER: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

const expenseSchema = z.object({
  category: z.enum(['SALARY', 'UTILITIES', 'PURCHASING', 'OTHER']),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  amount: z.coerce.number().min(1, 'Jumlah harus lebih dari 0'),
  date: z.string().min(1, 'Tanggal wajib diisi'),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

export default function ExpensesPage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>(
    ''
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const { data: expenses, isLoading } = useExpenses(
    categoryFilter ? { category: categoryFilter } : undefined
  );
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: 'OTHER', date: todayDate() },
  });

  const monthTotal =
    expenses
      ?.filter(e => {
        const d = new Date(e.date);
        const now = new Date();
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, e) => sum + parseFloat(e.amount), 0) ?? 0;

  function openCreate() {
    setEditTarget(null);
    reset({ category: 'OTHER', description: '', amount: 0, date: todayDate() });
    setDialogOpen(true);
  }

  function openEdit(e: Expense) {
    setEditTarget(e);
    reset({
      category: e.category,
      description: e.description,
      amount: parseFloat(e.amount),
      date: e.date.split('T')[0],
    });
    setDialogOpen(true);
  }

  function onSubmit(values: ExpenseForm) {
    if (editTarget) {
      updateExpense.mutate(
        { id: editTarget.id, ...values },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createExpense.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPending = createExpense.isPending || updateExpense.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[22px] font-[650] tracking-[-0.02em]"
            style={{ color: 'var(--navy-900)' }}
          >
            Pengeluaran
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {isLoading ? '…' : `${expenses?.length ?? 0} catatan`}
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            onClick={openCreate}
            style={{ background: 'var(--navy-800)' }}
            className="hover:opacity-90 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Catat Pengeluaran
          </Button>
        )}
      </div>

      {/* Monthly total card */}
      <div className="rounded-xl border bg-white p-4 flex items-center gap-4 w-fit">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center"
          style={{ background: '#fef2f2', color: '#b91c1c' }}
        >
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]">
            Total Bulan Ini
          </p>
          <p
            className="text-[22px] font-[650] tracking-[-0.02em] leading-none mt-0.5 text-red-700"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            {isLoading ? '…' : formatRupiah(String(monthTotal))}
          </p>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 flex-wrap">
        {(['', 'SALARY', 'UTILITIES', 'PURCHASING', 'OTHER'] as const).map(
          cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat as ExpenseCategory | '')}
              className="h-9 px-3 rounded-[10px] text-[12.5px] font-[550] border transition-all"
              style={
                categoryFilter === cat
                  ? {
                      background: 'var(--navy-800)',
                      color: '#fff',
                      borderColor: 'var(--navy-800)',
                    }
                  : {
                      background: '#fff',
                      color: '#64748b',
                      borderColor: '#e2e8f0',
                    }
              }
            >
              {cat === '' ? 'Semua' : CATEGORY_LABELS[cat]}
            </button>
          )
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[600px]">
        <div
          className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2.5 border-b"
          style={{
            gridTemplateColumns: '130px 120px 1fr 140px 80px',
            background: '#fafafa',
          }}
        >
          <div>Tanggal</div>
          <div>Kategori</div>
          <div>Deskripsi</div>
          <div className="text-right">Jumlah</div>
          {isAdmin && <div />}
        </div>

        {isLoading ? (
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : !expenses || expenses.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">
              {categoryFilter
                ? 'Tidak ada pengeluaran untuk kategori ini.'
                : 'Belum ada catatan pengeluaran.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {expenses.map(e => {
              const s = CATEGORY_STYLE[e.category];
              return (
                <div
                  key={e.id}
                  className="grid items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                  style={{
                    gridTemplateColumns: '130px 120px 1fr 140px 80px',
                  }}
                >
                  <div className="text-[12.5px] text-slate-500">
                    {formatDate(e.date)}
                  </div>

                  <div>
                    <span
                      className="inline-flex items-center h-[22px] px-2 rounded-full text-[11.5px] font-semibold border"
                      style={{
                        background: s.bg,
                        color: s.color,
                        borderColor: s.border,
                      }}
                    >
                      {CATEGORY_LABELS[e.category]}
                    </span>
                  </div>

                  <div
                    className="text-[13px] truncate pr-4"
                    style={{ color: 'var(--navy-900)' }}
                  >
                    {e.description}
                  </div>

                  <div
                    className="text-right text-[13px] font-[600] text-red-700"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {formatRupiah(e.amount)}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                        onClick={() => openEdit(e)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-600"
                        onClick={() => setDeleteTarget(e)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
        </div>
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Pengeluaran' : 'Catat Pengeluaran'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kategori</Label>
                <select
                  {...register('category')}
                  className="w-full h-10 border border-input rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {(
                    [
                      'SALARY',
                      'UTILITIES',
                      'PURCHASING',
                      'OTHER',
                    ] as ExpenseCategory[]
                  ).map(c => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Tanggal</Label>
                <Input type="date" {...register('date')} />
                {errors.date && (
                  <p className="text-xs text-destructive">
                    {errors.date.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Deskripsi</Label>
              <Input
                {...register('description')}
                placeholder="Keterangan pengeluaran"
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Jumlah (Rp)</Label>
              <Input type="number" min={1} {...register('amount')} />
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                style={{ background: 'var(--navy-800)' }}
                className="text-white hover:opacity-90"
              >
                {isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Hapus Pengeluaran"
        description={`Yakin ingin menghapus catatan "${deleteTarget?.description}"? Data ini tidak dapat dikembalikan.`}
        loading={deleteExpense.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteExpense.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
