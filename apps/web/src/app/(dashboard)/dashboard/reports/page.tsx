'use client';

import { type ReactNode, useState } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, AlertTriangle, Wrench } from 'lucide-react';

import { useFinancialReport, useSalesReport, useInventoryReport } from '@/hooks/use-reports';
import { formatRupiah } from '@/lib/format';
import { Skeleton } from '@/components/ui/skeleton';

type Tab = 'financial' | 'sales' | 'inventory';

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(iso));
}

/* ── Summary Card ── */

function SummaryCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  iconColor,
  valueColor,
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11.5px] font-[550] text-slate-500 uppercase tracking-[0.04em]">{label}</p>
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <>
          <p
            className="text-[22px] font-[650] tracking-[-0.025em] leading-none"
            style={{ fontFamily: 'ui-monospace, monospace', color: valueColor ?? 'var(--navy-900)' }}
          >
            {value}
          </p>
          {sub && <p className="text-[11.5px] text-slate-400 mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

/* ── Daily Bar Chart ── */

function DailyChart({ data }: { data: Array<{ date: string; revenue: number; transactions: number }> }) {
  if (data.length === 0) return null;

  const last30 = data.slice(-30);
  const maxRevenue = Math.max(...last30.map(d => d.revenue), 1);

  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] mb-4">
        Tren Harian (Pendapatan)
      </p>
      <div className="flex items-end gap-px h-20">
        {last30.map(d => (
          <div
            key={d.date}
            className="group relative flex-1 min-w-0 rounded-t-[2px] cursor-default transition-opacity hover:opacity-70"
            style={{
              height: `${Math.max((d.revenue / maxRevenue) * 100, 3)}%`,
              background: 'var(--navy-700)',
            }}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center pointer-events-none z-10">
              <div
                className="whitespace-nowrap rounded-[8px] px-2.5 py-1.5 text-[11px] text-white shadow-lg"
                style={{ background: 'var(--navy-900)' }}
              >
                <div className="font-[550]">{fmtDate(d.date)}</div>
                <div className="font-mono">{formatRupiah(String(d.revenue))}</div>
                <div className="text-slate-400">{d.transactions} transaksi</div>
              </div>
              <div
                className="w-2 h-2 rotate-45 -mt-1"
                style={{ background: 'var(--navy-900)' }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-slate-400">{last30[0]?.date.slice(5).replace('-', '/')}</span>
        {last30.length > 2 && (
          <span className="text-[10px] text-slate-400">
            {last30[Math.floor(last30.length / 2)]?.date.slice(5).replace('-', '/')}
          </span>
        )}
        <span className="text-[10px] text-slate-400">{last30[last30.length - 1]?.date.slice(5).replace('-', '/')}</span>
      </div>
    </div>
  );
}

/* ── Top List ── */

function TopList({
  title,
  icon,
  accentBg,
  accentColor,
  items,
  emptyText,
  loading,
}: {
  title: string;
  icon: ReactNode;
  accentBg: string;
  accentColor: string;
  items: Array<{ name: string; qty: number; revenue: number }>;
  emptyText: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ background: '#fafafa' }}>
        <div
          className="w-5 h-5 rounded-[6px] flex items-center justify-center"
          style={{ background: accentBg, color: accentColor }}
        >
          {icon}
        </div>
        <span className="text-[11.5px] font-[550] text-slate-500 uppercase tracking-[0.04em]">{title}</span>
      </div>
      {loading ? (
        <div className="divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5">
              <Skeleton className="h-3.5 w-32 rounded" />
              <Skeleton className="h-3.5 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 py-8 text-[13px] text-slate-400 text-center">{emptyText}</p>
      ) : (
        <div className="divide-y">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-[650] flex-shrink-0"
                  style={{ background: accentBg, color: accentColor }}
                >
                  {i + 1}
                </span>
                <span className="text-[13px] truncate" style={{ color: 'var(--navy-900)' }}>
                  {item.name}
                </span>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p
                  className="text-[12.5px] font-[600]"
                  style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--navy-900)' }}
                >
                  {formatRupiah(String(item.revenue))}
                </p>
                <p className="text-[11px] text-slate-400">
                  {item.qty}× terjual
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page ── */

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('financial');
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const { data: financial, isLoading: finLoading } = useFinancialReport({ date_from: dateFrom, date_to: dateTo });
  const { data: sales, isLoading: salesLoading } = useSalesReport({ date_from: dateFrom, date_to: dateTo });
  const { data: inventory, isLoading: invLoading } = useInventoryReport();

  const TABS: Array<{ key: Tab; label: string }> = [
    { key: 'financial', label: 'Keuangan' },
    { key: 'sales', label: 'Penjualan' },
    { key: 'inventory', label: 'Inventori' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="text-[22px] font-[650] tracking-[-0.02em]"
          style={{ color: 'var(--navy-900)' }}
        >
          Laporan
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Ringkasan performa bisnis</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-[12px] w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className="px-5 h-9 rounded-[10px] text-[13px] font-[550] transition-all"
            style={
              activeTab === t.key
                ? { background: '#fff', color: 'var(--navy-900)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                : { color: '#64748b' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date range (financial + sales) */}
      {activeTab !== 'inventory' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[12.5px] text-slate-500 font-[550]">Dari</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 rounded-[10px] border border-slate-200 text-[13px] outline-none focus:border-slate-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12.5px] text-slate-500 font-[550]">Sampai</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 rounded-[10px] border border-slate-200 text-[13px] outline-none focus:border-slate-700"
            />
          </div>
        </div>
      )}

      {/* ── Financial tab ── */}
      {activeTab === 'financial' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              label="Total Tagihan"
              value={finLoading ? '…' : formatRupiah(String(financial?.income?.total_sales ?? 0))}
              sub={finLoading ? undefined : `${financial?.transaction_count ?? 0} transaksi`}
              icon={<TrendingUp className="h-4 w-4" />}
              iconBg="#f0fdf4"
              iconColor="#15803d"
              loading={finLoading}
            />
            <SummaryCard
              label="Diterima"
              value={finLoading ? '…' : formatRupiah(String(financial?.income?.total_received ?? 0))}
              sub={
                finLoading
                  ? undefined
                  : `Piutang: ${formatRupiah(String(financial?.income?.outstanding ?? 0))}`
              }
              icon={<DollarSign className="h-4 w-4" />}
              iconBg="var(--navy-50)"
              iconColor="var(--navy-800)"
              loading={finLoading}
            />
            <SummaryCard
              label="Laba Bersih"
              value={finLoading ? '…' : formatRupiah(String(financial?.profit?.gross ?? 0))}
              sub={
                finLoading
                  ? undefined
                  : `Pengeluaran: ${formatRupiah(String(financial?.expenses?.total ?? 0))}`
              }
              icon={<BarChart3 className="h-4 w-4" />}
              iconBg={
                (financial?.profit?.gross ?? 0) >= 0 ? '#f0fdf4' : '#fef2f2'
              }
              iconColor={
                (financial?.profit?.gross ?? 0) >= 0 ? '#15803d' : '#b91c1c'
              }
              valueColor={
                (financial?.profit?.gross ?? 0) >= 0 ? '#15803d' : '#b91c1c'
              }
              loading={finLoading}
            />
          </div>

          {/* Expense by category */}
          {!finLoading && financial && Object.keys(financial.expenses?.by_category ?? {}).length > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div
                className="px-4 py-2.5 border-b text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]"
                style={{ background: '#fafafa' }}
              >
                Rincian Pengeluaran
              </div>
              <div className="divide-y">
                {Object.entries(financial.expenses?.by_category ?? {}).map(([cat, amount]) => (
                  <div key={cat} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[13px] text-slate-700">{cat}</span>
                    <span
                      className="text-[12.5px] font-[600] text-red-700"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
                      {formatRupiah(String(amount))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction list */}
          {!finLoading && financial && (financial.transactions?.length ?? 0) > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div
                className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2.5 border-b"
                style={{ gridTemplateColumns: '100px 1fr 130px 90px', background: '#fafafa' }}
              >
                <div>Tanggal</div>
                <div>Kendaraan</div>
                <div className="text-right">Total</div>
                <div className="text-center">Status</div>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto">
                {(financial.transactions ?? []).map(t => (
                  <div
                    key={t.id}
                    className="grid items-center px-4 py-2.5"
                    style={{ gridTemplateColumns: '100px 1fr 130px 90px' }}
                  >
                    <div className="text-[11.5px] text-slate-500" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {fmtDate(t.date)}
                    </div>
                    <div className="text-[12.5px] text-slate-600 truncate">
                      {t.vehicle?.license_plate ?? `#${t.id}`}
                    </div>
                    <div
                      className="text-right text-[12.5px] font-[600]"
                      style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--navy-900)' }}
                    >
                      {formatRupiah(t.total_amount)}
                    </div>
                    <div className="text-center text-[11px] text-slate-500">{t.status}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Sales tab ── */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Transaksi',
                value: String(sales?.summary?.total_transactions ?? 0),
                mono: false,
              },
              {
                label: 'Total Penjualan',
                value: formatRupiah(String(sales?.summary?.total_sales ?? 0)),
                mono: true,
              },
              {
                label: 'Sudah Bayar',
                value: formatRupiah(String(sales?.summary?.total_paid ?? 0)),
                mono: true,
                color: '#15803d',
              },
              {
                label: 'Belum Bayar',
                value: formatRupiah(String(sales?.summary?.total_unpaid ?? 0)),
                mono: true,
                color: '#b91c1c',
              },
            ].map(item => (
              <div key={item.label} className="rounded-xl border bg-white p-3.5">
                <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] mb-2">
                  {item.label}
                </p>
                {salesLoading ? (
                  <Skeleton className="h-6 w-24 rounded" />
                ) : (
                  <p
                    className="text-[17px] font-[650] tracking-[-0.02em] leading-none"
                    style={{
                      fontFamily: item.mono ? 'ui-monospace, monospace' : undefined,
                      color: item.color ?? 'var(--navy-900)',
                    }}
                  >
                    {item.value}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Daily chart */}
          {salesLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (sales?.daily?.length ?? 0) > 0 ? (
            <DailyChart data={sales.daily} />
          ) : null}

          {/* Top products + services */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TopList
              title="Top Produk"
              icon={<Package className="h-3 w-3" />}
              accentBg="var(--navy-50)"
              accentColor="var(--navy-800)"
              items={sales?.top_products ?? []}
              emptyText="Belum ada penjualan produk"
              loading={salesLoading}
            />
            <TopList
              title="Top Jasa"
              icon={<Wrench className="h-3 w-3" />}
              accentBg="#fff7ed"
              accentColor="#c2410c"
              items={sales?.top_services ?? []}
              emptyText="Belum ada penjualan jasa"
              loading={salesLoading}
            />
          </div>
        </div>
      )}

      {/* ── Inventory tab ── */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              label="Total Produk"
              value={invLoading ? '…' : String(inventory?.summary?.total_products ?? 0)}
              sub={invLoading ? undefined : `${inventory?.summary?.out_of_stock ?? 0} habis stok`}
              icon={<Package className="h-4 w-4" />}
              iconBg="var(--navy-50)"
              iconColor="var(--navy-800)"
              loading={invLoading}
            />
            <SummaryCard
              label="Nilai Total Stok"
              value={invLoading ? '…' : formatRupiah(String(inventory?.summary?.total_stock_value ?? 0))}
              icon={<DollarSign className="h-4 w-4" />}
              iconBg="#f0fdf4"
              iconColor="#15803d"
              loading={invLoading}
            />
            <SummaryCard
              label="Stok Menipis"
              value={invLoading ? '…' : String(inventory?.summary?.low_stock ?? 0)}
              sub="produk di bawah batas minimum"
              icon={<AlertTriangle className="h-4 w-4" />}
              iconBg="#fef2f2"
              iconColor="#b91c1c"
              valueColor={(inventory?.summary?.low_stock ?? 0) > 0 ? '#b91c1c' : undefined}
              loading={invLoading}
            />
          </div>

          {/* By category */}
          {!invLoading && inventory && (inventory.by_category?.length ?? 0) > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div
                className="px-4 py-2.5 border-b text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]"
                style={{ background: '#fafafa' }}
              >
                Per Kategori
              </div>
              <div
                className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2 border-b"
                style={{ gridTemplateColumns: '1fr 80px 130px', background: '#fafafa' }}
              >
                <div>Kategori</div>
                <div className="text-center">Produk</div>
                <div className="text-right">Nilai Stok</div>
              </div>
              <div className="divide-y">
                {(inventory.by_category ?? []).map(cat => (
                  <div
                    key={cat.category}
                    className="grid items-center px-4 py-2.5"
                    style={{ gridTemplateColumns: '1fr 80px 130px' }}
                  >
                    <span className="text-[13px] font-[550]" style={{ color: 'var(--navy-900)' }}>
                      {cat.category}
                    </span>
                    <span className="text-center text-[12.5px] text-slate-500">{cat.count}</span>
                    <span
                      className="text-right text-[12.5px] font-[600]"
                      style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--navy-900)' }}
                    >
                      {formatRupiah(String(cat.value))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Low stock list */}
          {!invLoading && inventory && (inventory.low_stock?.length ?? 0) > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div
                className="px-4 py-2.5 border-b text-[11.5px] font-[550] flex items-center gap-2"
                style={{ background: '#fef2f2', borderColor: '#fecaca' }}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-500 uppercase tracking-[0.04em]">Produk Stok Menipis</span>
              </div>
              <div
                className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2 border-b"
                style={{ gridTemplateColumns: '90px 1fr 100px 100px 110px', background: '#fafafa' }}
              >
                <div>SKU</div>
                <div>Nama</div>
                <div className="text-center">Stok</div>
                <div className="text-center">Min Alert</div>
                <div className="text-right">Nilai Stok</div>
              </div>
              <div className="divide-y">
                {(inventory.low_stock ?? []).map(p => (
                  <div
                    key={p.id}
                    className="grid items-center px-4 py-3"
                    style={{ gridTemplateColumns: '90px 1fr 100px 100px 110px' }}
                  >
                    <div className="text-[11.5px] text-slate-500 truncate" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {p.sku}
                    </div>
                    <div className="text-[13px] font-[550] truncate" style={{ color: 'var(--navy-900)' }}>
                      {p.name}
                    </div>
                    <div className="text-center">
                      <span
                        className="text-[13px] font-[650] text-red-700"
                        style={{ fontFamily: 'ui-monospace, monospace' }}
                      >
                        {p.stock}
                      </span>
                    </div>
                    <div className="text-center text-[12px] text-slate-400" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {p.min_stock_alert}
                    </div>
                    <div className="text-right text-[12px] text-slate-600" style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {formatRupiah(String(p.stock * parseFloat(p.price_buy)))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
