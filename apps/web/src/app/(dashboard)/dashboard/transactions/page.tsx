'use client';

import { useState } from 'react';
import { Receipt, Search, Plus, Ban, Printer } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useTransactions,
  useTransaction,
  useAddPayment,
  useCancelTransaction,
} from '@/hooks/use-transactions';
import type {
  Transaction,
  TransactionStatus,
  PaymentMethod,
} from '@/lib/api/transactions';
import { formatRupiah } from '@/lib/format';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth.store';

const STATUS_LABELS: Record<TransactionStatus, string> = {
  PENDING: 'Menunggu',
  UNPAID: 'Belum Bayar',
  PARTIAL: 'Cicilan',
  PAID: 'Lunas',
  CANCELLED: 'Dibatalkan',
};

const STATUS_STYLE: Record<
  TransactionStatus,
  { bg: string; color: string; border: string }
> = {
  PENDING: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  UNPAID: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  PARTIAL: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  PAID: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  CANCELLED: { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' },
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tunai',
  DEBIT: 'Debit',
  CREDIT: 'Kredit',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  OTHER: 'Lainnya',
  REFUND: 'Refund',
};

const FILTER_STATUSES: Array<{ label: string; value: TransactionStatus | '' }> =
  [
    { label: 'Semua', value: '' },
    { label: 'Menunggu', value: 'PENDING' },
    { label: 'Belum Bayar', value: 'UNPAID' },
    { label: 'Cicilan', value: 'PARTIAL' },
    { label: 'Lunas', value: 'PAID' },
    { label: 'Dibatalkan', value: 'CANCELLED' },
  ];

const paymentSchema = z.object({
  amount: z.coerce.number().min(1, 'Jumlah wajib diisi'),
  payment_method: z.enum([
    'CASH',
    'DEBIT',
    'CREDIT',
    'TRANSFER',
    'QRIS',
    'OTHER',
  ]),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentForm = z.infer<typeof paymentSchema>;

function StatusBadge({ status }: { status: TransactionStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center h-[22px] px-2 rounded-full text-[11.5px] font-semibold border"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function LicensePlate({ plate }: { plate: string }) {
  return (
    <span
      className="inline-block text-[11px] font-bold px-1.5 py-0.5 rounded"
      style={{
        background: '#1a1a1a',
        color: '#e8d84a',
        fontFamily: 'ui-monospace, monospace',
        letterSpacing: '0.04em',
      }}
    >
      {plate}
    </span>
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function TransactionsPage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | ''>('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Transaction | null>(null);

  const { data, isLoading } = useTransactions({
    status: statusFilter || undefined,
    search: search || undefined,
  });
  const { data: detail, isLoading: detailLoading } = useTransaction(selectedId);
  const addPayment = useAddPayment();
  const cancelTrx = useCancelTransaction();

  const transactions = data?.transactions ?? [];

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { payment_method: 'CASH' },
  });

  const paymentMethod = watch('payment_method');

  function onPaySubmit(values: PaymentForm) {
    if (!selectedId) return;
    addPayment.mutate(
      { id: selectedId, ...values },
      {
        onSuccess: () => {
          setPaymentOpen(false);
          reset();
        },
      }
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[22px] font-[650] tracking-[-0.02em]"
            style={{ color: 'var(--navy-900)' }}
          >
            Riwayat Transaksi
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {isLoading ? '…' : `${data?.pagination.total ?? 0} transaksi`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9 h-[38px]"
            placeholder="Cari plat nomor atau nama pelanggan…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5">
          {FILTER_STATUSES.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value as TransactionStatus | '')}
              className="h-[38px] px-3 rounded-[10px] text-[12.5px] font-[550] border transition-all"
              style={
                statusFilter === f.value
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
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div
          className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2.5 border-b"
          style={{
            gridTemplateColumns: '160px 1fr 120px 130px 120px 80px',
            background: '#fafafa',
          }}
        >
          <div>Tanggal</div>
          <div>Kendaraan</div>
          <div>Mekanik</div>
          <div className="text-right">Total</div>
          <div className="text-center">Status</div>
          <div />
        </div>

        {isLoading ? (
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">
              {search || statusFilter
                ? 'Tidak ada hasil untuk filter ini.'
                : 'Belum ada transaksi.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {transactions.map(t => (
              <div
                key={t.id}
                className="grid items-center px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
                style={{
                  gridTemplateColumns: '160px 1fr 120px 130px 120px 80px',
                  opacity: t.status === 'CANCELLED' ? 0.55 : 1,
                }}
                onClick={() => setSelectedId(t.id)}
              >
                <div>
                  <div
                    className="text-[11.5px] text-slate-500"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {formatDate(t.date)}
                  </div>
                  <div
                    className="text-[10.5px] text-slate-400 mt-0.5"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    #{t.id}
                  </div>
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  {t.vehicle ? (
                    <>
                      <LicensePlate plate={t.vehicle.license_plate} />
                      <div className="min-w-0">
                        <p
                          className="text-[13px] font-[550] truncate"
                          style={{ color: 'var(--navy-900)' }}
                        >
                          {t.vehicle.customer?.name ?? '—'}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {t.vehicle.brand} {t.vehicle.model}
                        </p>
                      </div>
                    </>
                  ) : (
                    <span className="text-[13px] text-slate-400">Walk-in</span>
                  )}
                </div>

                <div className="text-[12.5px] text-slate-600 truncate">
                  {t.mechanic?.name ?? '—'}
                </div>

                <div
                  className="text-right text-[13px] font-[600]"
                  style={{
                    fontFamily: 'ui-monospace, monospace',
                    color: 'var(--navy-900)',
                  }}
                >
                  {formatRupiah(t.total_amount)}
                </div>

                <div className="flex justify-center">
                  <StatusBadge status={t.status} />
                </div>

                <div
                  className="flex justify-end"
                  onClick={e => e.stopPropagation()}
                >
                  {isAdmin && t.status !== 'CANCELLED' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => setCancelTarget(t)}
                    >
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      <Sheet
        open={selectedId !== null}
        onOpenChange={open => !open && setSelectedId(null)}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detail Transaksi</SheetTitle>
          </SheetHeader>

          {detailLoading || !detail ? (
            <div className="space-y-3 mt-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              {/* Header info */}
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-[11px] text-slate-400"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    #{detail.id}
                  </p>
                  <p className="text-[12.5px] text-slate-500 mt-0.5">
                    {formatDate(detail.date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={detail.status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-slate-700"
                    title="Cetak struk"
                    onClick={() => window.open(`/print/${detail.id}`, '_blank')}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {detail.vehicle && (
                <div className="rounded-[10px] bg-slate-50 border p-3 flex items-center gap-3">
                  <LicensePlate plate={detail.vehicle.license_plate} />
                  <div>
                    <p
                      className="text-[13px] font-[550]"
                      style={{ color: 'var(--navy-900)' }}
                    >
                      {detail.vehicle.customer?.name}
                    </p>
                    <p className="text-[11.5px] text-slate-500">
                      {detail.vehicle.brand} {detail.vehicle.model}
                      {detail.current_km
                        ? ` · ${detail.current_km.toLocaleString('id-ID')} km`
                        : ''}
                    </p>
                  </div>
                </div>
              )}

              {detail.mechanic && (
                <p className="text-[12.5px] text-slate-600">
                  <span className="font-[550]">Mekanik:</span>{' '}
                  {detail.mechanic.name}
                </p>
              )}

              {/* Items */}
              <div>
                <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] mb-2">
                  Item
                </p>
                <div className="divide-y rounded-[10px] border overflow-hidden">
                  {detail.items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-3 py-2.5 bg-white"
                    >
                      <div>
                        <p className="text-[13px] font-[500]">
                          {item.item_name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.qty} × {formatRupiah(item.sell_price)}
                        </p>
                      </div>
                      <p
                        className="text-[13px] font-[600]"
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          color: 'var(--navy-900)',
                        }}
                      >
                        {formatRupiah(
                          String(
                            parseFloat(item.sell_price) * item.qty -
                              parseFloat(item.discount_amount)
                          )
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-[10px] bg-slate-50 border p-3 space-y-1.5">
                <div className="flex justify-between text-[12.5px] text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatRupiah(detail.subtotal)}</span>
                </div>
                {parseFloat(detail.discount_amount) > 0 && (
                  <div className="flex justify-between text-[12.5px] text-green-700">
                    <span>Diskon</span>
                    <span>- {formatRupiah(detail.discount_amount)}</span>
                  </div>
                )}
                <div
                  className="flex justify-between text-[14px] font-[650] pt-1 border-t"
                  style={{ color: 'var(--navy-900)' }}
                >
                  <span>Total</span>
                  <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                    {formatRupiah(detail.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-[12.5px] text-slate-500 pt-1 border-t">
                  <span>Sudah dibayar</span>
                  <span>
                    {formatRupiah(String(detail.payment_summary.total_paid))}
                  </span>
                </div>
                {detail.payment_summary.remaining > 0 && (
                  <div className="flex justify-between text-[12.5px] font-[600] text-red-700">
                    <span>Sisa</span>
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {formatRupiah(String(detail.payment_summary.remaining))}
                    </span>
                  </div>
                )}
              </div>

              {/* Payments */}
              {detail.payments.length > 0 && (
                <div>
                  <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] mb-2">
                    Pembayaran
                  </p>
                  <div className="divide-y rounded-[10px] border overflow-hidden">
                    {detail.payments.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between px-3 py-2.5 bg-white"
                      >
                        <div>
                          <p className="text-[12.5px] font-[550]">
                            {PAYMENT_METHOD_LABELS[p.payment_method]}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDate(p.date)}
                            {p.reference_number
                              ? ` · ${p.reference_number}`
                              : ''}
                          </p>
                        </div>
                        <p
                          className="text-[13px] font-[600] text-green-700"
                          style={{ fontFamily: 'ui-monospace, monospace' }}
                        >
                          {formatRupiah(p.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add payment button */}
              {(detail.status === 'PARTIAL' ||
                detail.status === 'UNPAID' ||
                detail.status === 'PENDING') && (
                <Button
                  className="w-full text-white"
                  style={{ background: 'var(--navy-800)' }}
                  onClick={() => setPaymentOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Tambah Pembayaran
                </Button>
              )}

              {detail.notes && (
                <p className="text-[12px] text-slate-500 italic">
                  {detail.notes}
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add payment dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Pembayaran</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onPaySubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Jumlah Pembayaran</Label>
              <Input
                type="number"
                min={1}
                placeholder={
                  detail ? String(detail.payment_summary.remaining) : '0'
                }
                {...register('amount')}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">
                  {errors.amount.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label>Metode Pembayaran</Label>
              <select
                {...register('payment_method')}
                className="w-full h-10 border border-input rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(
                  [
                    'CASH',
                    'DEBIT',
                    'CREDIT',
                    'TRANSFER',
                    'QRIS',
                    'OTHER',
                  ] as PaymentMethod[]
                ).map(m => (
                  <option key={m} value={m}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>

            {paymentMethod !== 'CASH' && (
              <div className="space-y-1">
                <Label>No. Referensi</Label>
                <Input
                  {...register('reference_number')}
                  placeholder="Opsional"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label>Catatan</Label>
              <Input {...register('notes')} placeholder="Opsional" />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPaymentOpen(false);
                  reset();
                }}
                disabled={addPayment.isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={addPayment.isPending}
                style={{ background: 'var(--navy-800)' }}
                className="text-white hover:opacity-90"
              >
                {addPayment.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={open => !open && setCancelTarget(null)}
        title="Batalkan Transaksi"
        description={`Yakin ingin membatalkan transaksi #${cancelTarget?.id}? Stok produk akan dikembalikan.`}
        loading={cancelTrx.isPending}
        onConfirm={() => {
          if (!cancelTarget) return;
          cancelTrx.mutate(cancelTarget.id, {
            onSuccess: () => setCancelTarget(null),
          });
        }}
      />
    </div>
  );
}
