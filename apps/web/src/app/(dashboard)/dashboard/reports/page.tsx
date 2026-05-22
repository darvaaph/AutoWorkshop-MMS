'use client';

import { type ReactNode, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  AlertTriangle,
} from 'lucide-react';

import {
  useFinancialReport,
  useSalesReport,
  useInventoryReport,
} from '@/hooks/use-reports';
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

function SummaryCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  valueColor,
  loading,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11.5px] font-[550] text-slate-500 uppercase tracking-[0.04em]">
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <p
          className="text-[24px] font-[650] tracking-[-0.025em] leading-none"
          style={{
            fontFamily: 'ui-monospace, monospace',
            color: valueColor ?? 'var(--navy-900)',
          }}
        >
          {value}
        </p>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('financial');
  const [dateFrom, setDateFrom] = useState(firstOfMonthISO());
  const [dateTo, setDateTo] = useState(todayISO());

  const { data: financial, isLoading: finLoading } = useFinancialReport({
    date_from: dateFrom,
    date_to: dateTo,
  });
  const { data: sales, isLoading: salesLoading } = useSalesReport({
    date_from: dateFrom,
    date_to: dateTo,
  });
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
        <p className="text-[13px] text-slate-500 mt-0.5">
          Ringkasan performa bisnis
        </p>
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
                ? {
                    background: '#fff',
                    color: 'var(--navy-900)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }
                : { color: '#64748b' }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Date range (for financial + sales) */}
      {activeTab !== 'inventory' && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[12.5px] text-slate-500 font-[550]">
              Dari
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 px-3 rounded-[10px] border border-slate-200 text-[13px] outline-none focus:border-slate-700"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12.5px] text-slate-500 font-[550]">
              Sampai
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 px-3 rounded-[10px] border border-slate-200 text-[13px] outline-none focus:border-slate-700"
            />
          </div>
        </div>
      )}

      {/* Financial tab */}
      {activeTab === 'financial' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              label="Total Pendapatan"
              value={
                finLoading ? '…' : formatRupiah(String(financial?.revenue ?? 0))
              }
              icon={<TrendingUp className="h-4 w-4" />}
              iconBg="#f0fdf4"
              iconColor="#15803d"
              valueColor="#15803d"
              loading={finLoading}
            />
            <SummaryCard
              label="Total Pengeluaran"
              value={
                finLoading
                  ? '…'
                  : formatRupiah(String(financial?.expenses ?? 0))
              }
              icon={<DollarSign className="h-4 w-4" />}
              iconBg="#fef2f2"
              iconColor="#b91c1c"
              valueColor="#b91c1c"
              loading={finLoading}
            />
            <SummaryCard
              label="Laba Bersih"
              value={
                finLoading ? '…' : formatRupiah(String(financial?.profit ?? 0))
              }
              icon={<BarChart3 className="h-4 w-4" />}
              iconBg="var(--navy-50)"
              iconColor="var(--navy-800)"
              loading={finLoading}
            />
          </div>

          {financial?.transactions && financial.transactions.length > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div
                className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2.5 border-b"
                style={{
                  gridTemplateColumns: '160px 1fr 140px 100px',
                  background: '#fafafa',
                }}
              >
                <div>Tanggal</div>
                <div>Kendaraan</div>
                <div className="text-right">Total</div>
                <div className="text-center">Status</div>
              </div>
              <div className="divide-y max-h-80 overflow-y-auto">
                {financial.transactions.map(t => (
                  <div
                    key={t.id}
                    className="grid items-center px-4 py-2.5"
                    style={{ gridTemplateColumns: '160px 1fr 140px 100px' }}
                  >
                    <div
                      className="text-[11.5px] text-slate-500"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
                      {new Intl.DateTimeFormat('id-ID', {
                        day: '2-digit',
                        month: 'short',
                      }).format(new Date(t.date))}
                    </div>
                    <div className="text-[12.5px] text-slate-600 truncate">
                      {t.vehicle?.license_plate ?? `#${t.id}`}
                    </div>
                    <div
                      className="text-right text-[12.5px] font-[600]"
                      style={{
                        fontFamily: 'ui-monospace, monospace',
                        color: 'var(--navy-900)',
                      }}
                    >
                      {formatRupiah(t.total_amount)}
                    </div>
                    <div className="text-center text-[11px] text-slate-500">
                      {t.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales tab */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {salesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          ) : !sales ? null : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top products */}
              <div className="rounded-xl border bg-white overflow-hidden">
                <div
                  className="px-4 py-2.5 border-b text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]"
                  style={{ background: '#fafafa' }}
                >
                  Top Produk
                </div>
                {sales.top_products.length === 0 ? (
                  <p className="px-4 py-8 text-[13px] text-slate-400 text-center">
                    Belum ada data
                  </p>
                ) : (
                  <div className="divide-y">
                    {sales.top_products.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-[650] flex-shrink-0"
                            style={{
                              background: 'var(--navy-50)',
                              color: 'var(--navy-800)',
                            }}
                          >
                            {i + 1}
                          </span>
                          <span
                            className="text-[13px] truncate"
                            style={{ color: 'var(--navy-900)' }}
                          >
                            {p.name}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p
                            className="text-[12.5px] font-[600]"
                            style={{
                              fontFamily: 'ui-monospace, monospace',
                              color: 'var(--navy-900)',
                            }}
                          >
                            {formatRupiah(String(p.revenue))}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {p.qty} unit
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top services */}
              <div className="rounded-xl border bg-white overflow-hidden">
                <div
                  className="px-4 py-2.5 border-b text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]"
                  style={{ background: '#fafafa' }}
                >
                  Top Jasa
                </div>
                {sales.top_services.length === 0 ? (
                  <p className="px-4 py-8 text-[13px] text-slate-400 text-center">
                    Belum ada data
                  </p>
                ) : (
                  <div className="divide-y">
                    {sales.top_services.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-[650] flex-shrink-0"
                            style={{
                              background: 'var(--orange-50)',
                              color: 'var(--orange-600)',
                            }}
                          >
                            {i + 1}
                          </span>
                          <span
                            className="text-[13px] truncate"
                            style={{ color: 'var(--navy-900)' }}
                          >
                            {s.name}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p
                            className="text-[12.5px] font-[600]"
                            style={{
                              fontFamily: 'ui-monospace, monospace',
                              color: 'var(--navy-900)',
                            }}
                          >
                            {formatRupiah(String(s.revenue))}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {s.qty}× dikerjakan
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inventory tab */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard
              label="Total Produk"
              value={invLoading ? '…' : String(inventory?.total_products ?? 0)}
              icon={<Package className="h-4 w-4" />}
              iconBg="var(--navy-50)"
              iconColor="var(--navy-800)"
              loading={invLoading}
            />
            <SummaryCard
              label="Nilai Total Stok"
              value={
                invLoading
                  ? '…'
                  : formatRupiah(String(inventory?.total_value ?? 0))
              }
              icon={<DollarSign className="h-4 w-4" />}
              iconBg="#f0fdf4"
              iconColor="#15803d"
              loading={invLoading}
            />
            <SummaryCard
              label="Produk Stok Menipis"
              value={
                invLoading ? '…' : String(inventory?.low_stock.length ?? 0)
              }
              icon={<AlertTriangle className="h-4 w-4" />}
              iconBg="#fef2f2"
              iconColor="#b91c1c"
              valueColor="#b91c1c"
              loading={invLoading}
            />
          </div>

          {inventory && inventory.low_stock.length > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div
                className="px-4 py-2.5 border-b text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] flex items-center gap-2"
                style={{ background: '#fef2f2', borderColor: '#fecaca' }}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                <span className="text-red-500">Produk Stok Menipis</span>
              </div>
              <div
                className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2 border-b"
                style={{
                  gridTemplateColumns: '100px 1fr 120px 100px 100px',
                  background: '#fafafa',
                }}
              >
                <div>SKU</div>
                <div>Nama</div>
                <div className="text-center">Stok</div>
                <div className="text-center">Min Alert</div>
                <div className="text-right">Nilai Stok</div>
              </div>
              <div className="divide-y">
                {inventory.low_stock.map(p => (
                  <div
                    key={p.id}
                    className="grid items-center px-4 py-3"
                    style={{
                      gridTemplateColumns: '100px 1fr 120px 100px 100px',
                    }}
                  >
                    <div
                      className="text-[11.5px] text-slate-500 truncate"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
                      {p.sku}
                    </div>
                    <div
                      className="text-[13px] font-[550] truncate"
                      style={{ color: 'var(--navy-900)' }}
                    >
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
                    <div
                      className="text-center text-[12px] text-slate-400"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
                      {p.min_stock_alert}
                    </div>
                    <div
                      className="text-right text-[12px] text-slate-600"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
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
