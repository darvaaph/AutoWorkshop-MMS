'use client';

import { type ReactNode, useState } from 'react';
import { ArrowDown, ArrowUp, ClipboardList, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useInventoryLogs,
  useStockIn,
  useStockAudit,
} from '@/hooks/use-inventory';
import { useProducts } from '@/hooks/use-products';
import type { InventoryLogType } from '@/lib/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type Tab = 'IN' | 'AUDIT' | 'HISTORY';

const TYPE_LABELS: Record<InventoryLogType, string> = {
  IN: 'Masuk',
  OUT: 'Keluar',
  ADJUSTMENT: 'Opname',
};

const TYPE_STYLE: Record<
  InventoryLogType,
  { bg: string; color: string; border: string }
> = {
  IN: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  OUT: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  ADJUSTMENT: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
};

const stockInSchema = z.object({
  product_id: z.coerce.number().min(1, 'Pilih produk'),
  qty: z.coerce.number().min(1, 'Jumlah minimal 1'),
  buy_price: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
  notes: z.string().optional(),
});

const auditSchema = z.object({
  product_id: z.coerce.number().min(1, 'Pilih produk'),
  actual_stock: z.coerce.number().min(0, 'Stok tidak boleh negatif'),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type StockInForm = z.infer<typeof stockInSchema>;
type AuditForm = z.infer<typeof auditSchema>;

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('IN');
  const [historyType, setHistoryType] = useState<InventoryLogType | ''>('');

  const { data: logs, isLoading: logsLoading } = useInventoryLogs(
    historyType ? { type: historyType } : undefined
  );
  const { data: productsData } = useProducts();
  const stockIn = useStockIn();
  const stockAudit = useStockAudit();

  const products = productsData?.products ?? [];

  const {
    register: regIn,
    handleSubmit: handleIn,
    reset: resetIn,
    formState: { errors: errIn },
  } = useForm<StockInForm>({ resolver: zodResolver(stockInSchema) });

  const {
    register: regAudit,
    handleSubmit: handleAudit,
    reset: resetAudit,
    formState: { errors: errAudit },
  } = useForm<AuditForm>({ resolver: zodResolver(auditSchema) });

  function onStockIn(values: StockInForm) {
    stockIn.mutate(values, { onSuccess: () => resetIn() });
  }

  function onAudit(values: AuditForm) {
    stockAudit.mutate(values, { onSuccess: () => resetAudit() });
  }

  const TABS: Array<{ key: Tab; label: string; icon: ReactNode }> = [
    { key: 'IN', label: 'Stok Masuk', icon: <ArrowDown className="h-4 w-4" /> },
    {
      key: 'AUDIT',
      label: 'Stok Opname',
      icon: <ClipboardList className="h-4 w-4" />,
    },
    { key: 'HISTORY', label: 'Riwayat', icon: <ArrowUp className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="text-[22px] font-[650] tracking-[-0.02em]"
          style={{ color: 'var(--navy-900)' }}
        >
          Inventori
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Manajemen stok dan pergerakan barang
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-[12px] w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-[10px] text-[13px] font-[550] transition-all"
            style={
              activeTab === t.key
                ? {
                    background: '#fff',
                    color: 'var(--navy-900)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }
                : { color: '#64748b' }
            }
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Stock In Tab */}
      {activeTab === 'IN' && (
        <div className="max-w-lg">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] mb-4">
              Tambah Stok Masuk
            </p>
            <form onSubmit={handleIn(onStockIn)} className="space-y-4">
              <div className="space-y-1">
                <Label>Produk</Label>
                <select
                  {...regIn('product_id')}
                  className="w-full h-10 border border-input rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Pilih produk</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — stok: {p.stock}
                    </option>
                  ))}
                </select>
                {errIn.product_id && (
                  <p className="text-xs text-destructive">
                    {errIn.product_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Jumlah</Label>
                  <Input type="number" min={1} {...regIn('qty')} />
                  {errIn.qty && (
                    <p className="text-xs text-destructive">
                      {errIn.qty.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Harga Beli per Unit</Label>
                  <Input type="number" min={0} {...regIn('buy_price')} />
                  {errIn.buy_price && (
                    <p className="text-xs text-destructive">
                      {errIn.buy_price.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label>Catatan</Label>
                <Input
                  {...regIn('notes')}
                  placeholder="Nama supplier, no. PO, dll."
                />
              </div>

              <p className="text-[11.5px] text-slate-400">
                Harga beli akan diperbarui otomatis menggunakan metode Moving
                Average.
              </p>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={stockIn.isPending}
                  style={{ background: 'var(--navy-800)' }}
                  className="text-white hover:opacity-90"
                >
                  {stockIn.isPending ? 'Menyimpan...' : 'Tambah Stok'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Tab */}
      {activeTab === 'AUDIT' && (
        <div className="max-w-lg">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] mb-4">
              Stok Opname
            </p>
            <form onSubmit={handleAudit(onAudit)} className="space-y-4">
              <div className="space-y-1">
                <Label>Produk</Label>
                <select
                  {...regAudit('product_id')}
                  className="w-full h-10 border border-input rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Pilih produk</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — stok sistem: {p.stock}
                    </option>
                  ))}
                </select>
                {errAudit.product_id && (
                  <p className="text-xs text-destructive">
                    {errAudit.product_id.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Stok Aktual (Fisik)</Label>
                  <Input type="number" min={0} {...regAudit('actual_stock')} />
                  {errAudit.actual_stock && (
                    <p className="text-xs text-destructive">
                      {errAudit.actual_stock.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Alasan</Label>
                  <Input
                    {...regAudit('reason')}
                    placeholder="STOCK_OPNAME, KOREKSI…"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Catatan</Label>
                <Input
                  {...regAudit('notes')}
                  placeholder="Penjelasan perbedaan stok"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={stockAudit.isPending}
                  style={{ background: 'var(--navy-800)' }}
                  className="text-white hover:opacity-90"
                >
                  {stockAudit.isPending ? 'Menyimpan...' : 'Simpan Opname'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-3">
          <div className="flex gap-1.5">
            {(['', 'IN', 'OUT', 'ADJUSTMENT'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setHistoryType(t as InventoryLogType | '')}
                className="h-9 px-3 rounded-[10px] text-[12.5px] font-[550] border transition-all"
                style={
                  historyType === t
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
                {t === '' ? 'Semua' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div className="rounded-xl border bg-white overflow-hidden">
            <div
              className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2.5 border-b"
              style={{
                gridTemplateColumns: '160px 1fr 90px 100px 160px 140px',
                background: '#fafafa',
              }}
            >
              <div>Tanggal</div>
              <div>Produk</div>
              <div className="text-center">Tipe</div>
              <div className="text-center">Qty</div>
              <div className="text-center">Stok Sebelum → Sesudah</div>
              <div>Referensi</div>
            </div>

            {logsLoading ? (
              <div className="divide-y">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="px-4 py-3">
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="py-16 text-center">
                <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-400">
                  Belum ada riwayat inventori.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {logs.map(log => {
                  const s = TYPE_STYLE[log.type];
                  return (
                    <div
                      key={log.id}
                      className="grid items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                      style={{
                        gridTemplateColumns: '160px 1fr 90px 100px 160px 140px',
                      }}
                    >
                      <div
                        className="text-[11.5px] text-slate-500"
                        style={{ fontFamily: 'ui-monospace, monospace' }}
                      >
                        {formatDate(log.createdAt)}
                      </div>

                      <div
                        className="text-[13px] truncate"
                        style={{ color: 'var(--navy-900)' }}
                      >
                        {log.product?.name ?? `Produk #${log.product_id}`}
                      </div>

                      <div className="flex justify-center">
                        <span
                          className="inline-flex items-center h-[22px] px-2 rounded-full text-[11px] font-semibold border"
                          style={{
                            background: s.bg,
                            color: s.color,
                            borderColor: s.border,
                          }}
                        >
                          {TYPE_LABELS[log.type]}
                        </span>
                      </div>

                      <div
                        className="text-center text-[13px] font-[600]"
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          color:
                            log.type === 'IN'
                              ? '#15803d'
                              : log.type === 'OUT'
                              ? '#b91c1c'
                              : '#92400e',
                        }}
                      >
                        {log.type === 'IN'
                          ? '+'
                          : log.type === 'OUT'
                          ? '-'
                          : '±'}
                        {Math.abs(log.qty)}
                      </div>

                      <div
                        className="text-center text-[12px] text-slate-500"
                        style={{ fontFamily: 'ui-monospace, monospace' }}
                      >
                        {log.stock_before} → {log.stock_after}
                      </div>

                      <div className="text-[11.5px] text-slate-400 truncate">
                        {log.reference_type
                          ? `${log.reference_type}${
                              log.reference_id ? ` #${log.reference_id}` : ''
                            }`
                          : log.notes ?? '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
