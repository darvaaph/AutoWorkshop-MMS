'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  ShoppingCart,
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  Car,
  Receipt,
  BarChart3,
  DollarSign,
  ArrowUpRight,
  Phone,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react';

import { useDashboard, useDueServiceVehicles } from '@/hooks/use-dashboard';
import { useMarkContacted } from '@/hooks/use-vehicles';
import type { Vehicle } from '@/lib/api/vehicles';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatRupiah,
  formatRupiahCompact,
  formatDate,
  toWaPhone,
} from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── Spark bar ── */
function SparkBar({ data = [40, 65, 50, 80, 60, 95, 75], color = '#1b2d5e' }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[3px] h-9">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-1.5 rounded-[2px]"
          style={{
            height: `${(v / max) * 100}%`,
            background: color,
            opacity: 0.3 + (i / data.length) * 0.7,
          }}
        />
      ))}
    </div>
  );
}

/* ── Stat card ── */
interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaUp?: boolean;
  spark?: number[];
  sparkColor?: string;
  icon: ReactNode;
  iconBg?: string;
  iconColor?: string;
  loading?: boolean;
}

function StatCard({
  label,
  value,
  delta,
  deltaUp = true,
  spark,
  sparkColor,
  icon,
  iconBg = '#eef1f8',
  iconColor = '#1b2d5e',
  loading,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-[18px]">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11.5px] font-[550] text-slate-500 flex items-center gap-1.5">
                {label}
              </p>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: iconBg, color: iconColor }}
              >
                {icon}
              </div>
            </div>
            <div
              className="text-[20px] md:text-[26px] font-[650] tracking-[-0.025em] leading-none mb-2 truncate"
              style={{
                color: 'var(--navy-900)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {value}
            </div>
            <div className="flex items-end justify-between gap-2">
              {delta && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-[12px]',
                    deltaUp ? 'text-green-700' : 'text-red-700'
                  )}
                >
                  <ArrowUpRight className="h-3 w-3" />
                  <span>{delta}</span>
                  <span className="text-slate-400 ml-1">vs kemarin</span>
                </div>
              )}
              {spark && (
                <SparkBar data={spark} color={sparkColor ?? '#1b2d5e'} />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Quick action card ── */
function QuickCard({
  icon,
  label,
  sub,
  href,
  accent,
}: {
  icon: ReactNode;
  label: string;
  sub: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md h-full',
          accent ? 'border-transparent' : ''
        )}
        style={
          accent ? { background: 'var(--navy-900)', color: '#fff' } : undefined
        }
      >
        <CardContent className="p-4 flex flex-col gap-2.5 min-h-[110px]">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center"
            style={{
              background: accent ? 'var(--orange-500)' : 'var(--navy-50)',
              color: accent ? '#fff' : 'var(--navy-800)',
            }}
          >
            {icon}
          </div>
          <div className="mt-auto">
            <p className="text-sm font-semibold tracking-tight">{label}</p>
            <p
              className="text-[11.5px] mt-0.5"
              style={{
                color: accent
                  ? 'rgba(255,255,255,0.6)'
                  : 'hsl(215.4 16.3% 46.9%)',
              }}
            >
              {sub}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboard();
  const { data: dueVehicles } = useDueServiceVehicles();
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.role === 'ADMIN';
  const [contactTarget, setContactTarget] = useState<Vehicle | null>(null);
  const [contactNotes, setContactNotes] = useState('');
  const markContacted = useMarkContacted();

  const greeting =
    new Date().getHours() < 12
      ? 'Selamat pagi'
      : new Date().getHours() < 17
      ? 'Selamat siang'
      : 'Selamat sore';

  const todayDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-[22px] font-[650] tracking-[-0.02em]"
            style={{ color: 'var(--navy-900)' }}
          >
            Dashboard
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {greeting}, {user?.full_name?.split(' ')[0]} — {todayDate}
          </p>
        </div>
        <Link
          href="/dashboard/pos"
          className="hidden md:flex items-center gap-2 h-9 px-3.5 rounded-[10px] text-[13.5px] font-[550] text-white transition-all"
          style={{ background: 'var(--orange-500)' }}
        >
          <ShoppingCart className="h-4 w-4" />
          Transaksi Baru
        </Link>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          label="Penjualan Hari Ini"
          value={
            isLoading ? (
              '—'
            ) : (
              <>
                <span className="sm:hidden">
                  {formatRupiahCompact(stats?.today.sales ?? 0)}
                </span>
                <span className="hidden sm:inline">
                  {formatRupiah(stats?.today.sales ?? 0)}
                </span>
              </>
            )
          }
          icon={<DollarSign className="h-3.5 w-3.5" />}
          iconBg="#f0fdf4"
          iconColor="#15803d"
          loading={isLoading}
        />
        <StatCard
          label="Transaksi Hari Ini"
          value={isLoading ? '—' : stats?.today.transactions ?? 0}
          icon={<Receipt className="h-3.5 w-3.5" />}
          iconBg="var(--orange-50)"
          iconColor="var(--orange-700)"
          loading={isLoading}
        />
        <StatCard
          label="Penjualan Bulan Ini"
          value={
            isLoading ? (
              '—'
            ) : (
              <>
                <span className="sm:hidden">
                  {formatRupiahCompact(stats?.month.sales ?? 0)}
                </span>
                <span className="hidden sm:inline">
                  {formatRupiah(stats?.month.sales ?? 0)}
                </span>
              </>
            )
          }
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          loading={isLoading}
        />
        <StatCard
          label="Transaksi Bulan Ini"
          value={isLoading ? '—' : stats?.month.transactions ?? 0}
          icon={<Receipt className="h-3.5 w-3.5" />}
          iconBg="#f8fafc"
          iconColor="#64748b"
          loading={isLoading}
        />
      </div>

      {/* Pelanggan/Kendaraan + Produk/Stok row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Card>
          <CardContent className="p-4 flex items-center gap-3 md:gap-5">
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                style={{
                  background: 'var(--navy-50)',
                  color: 'var(--navy-800)',
                }}
              >
                <Users className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]">
                  Total Pelanggan
                </p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-1" />
                ) : (
                  <p
                    className="text-[22px] font-[650] tracking-[-0.02em] leading-none mt-0.5"
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--navy-900)',
                    }}
                  >
                    {stats?.customers.total ?? '—'}
                  </p>
                )}
              </div>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div className="flex items-center gap-3 flex-1">
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                style={{
                  background: 'var(--orange-50)',
                  color: 'var(--orange-700)',
                }}
              >
                <Car className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]">
                  Total Kendaraan
                </p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-1" />
                ) : (
                  <p
                    className="text-[22px] font-[650] tracking-[-0.02em] leading-none mt-0.5"
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--navy-900)',
                    }}
                  >
                    {stats?.customers.vehicles ?? '—'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3 md:gap-5">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-slate-100 text-slate-600">
                <Package className="h-[18px] w-[18px]" />
              </div>
              <div>
                <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]">
                  Total Produk
                </p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-1" />
                ) : (
                  <p
                    className="text-[22px] font-[650] tracking-[-0.02em] leading-none mt-0.5"
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--navy-900)',
                    }}
                  >
                    {stats?.inventory.totalProducts ?? '—'}
                  </p>
                )}
              </div>
            </div>
            <div className="w-px h-10 bg-slate-100" />
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-[10px] flex items-center justify-center bg-red-50 text-red-700">
                <AlertTriangle className="h-[18px] w-[18px]" />
              </div>
              <div className="flex-1">
                <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]">
                  Stok Menipis
                </p>
                {isLoading ? (
                  <Skeleton className="h-6 w-16 mt-1" />
                ) : (
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p
                      className="text-[22px] font-[650] tracking-[-0.02em] leading-none text-red-700"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
                      {stats?.inventory.lowStock ?? '—'}
                    </p>
                    {isAdmin && (
                      <Link
                        href="/dashboard/products"
                        className="text-[11.5px] font-[550]"
                        style={{ color: 'var(--navy-700)' }}
                      >
                        Lihat →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2
          className="text-[17px] font-[650] tracking-[-0.015em] mb-3"
          style={{ color: 'var(--navy-900)' }}
        >
          Akses Cepat
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickCard
            icon={<ShoppingCart className="h-[18px] w-[18px]" />}
            label="Transaksi Baru"
            sub="Buat penjualan / servis"
            href="/dashboard/pos"
            accent
          />
          <QuickCard
            icon={<Users className="h-[18px] w-[18px]" />}
            label="Pelanggan"
            sub="Tambah & kelola"
            href="/dashboard/customers"
          />
          <QuickCard
            icon={<Car className="h-[18px] w-[18px]" />}
            label="Kendaraan"
            sub="Catat unit baru"
            href="/dashboard/vehicles"
          />
          <QuickCard
            icon={<Package className="h-[18px] w-[18px]" />}
            label="Produk"
            sub="Update inventori"
            href="/dashboard/products"
          />
          <QuickCard
            icon={<DollarSign className="h-[18px] w-[18px]" />}
            label="Pengeluaran"
            sub="Catat biaya"
            href="/dashboard/expenses"
          />
          <QuickCard
            icon={<BarChart3 className="h-[18px] w-[18px]" />}
            label="Laporan"
            sub="Lihat performa"
            href="/dashboard/reports"
          />
        </div>
      </div>

      {/* Service reminders */}
      {dueVehicles && dueVehicles.length > 0 && (
        <Card style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-[16px] font-[650] tracking-[-0.015em] text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {dueVehicles.length} kendaraan perlu servis
              </CardTitle>
              <p className="text-[12px] text-red-600/70 mt-1">
                Jadwal servis sudah mendekati atau terlewat
              </p>
            </div>
            <Link
              href="/dashboard/vehicles"
              className="text-[12.5px] font-[550] text-red-700"
            >
              Lihat semua →
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="px-5 divide-y divide-red-100">
              {dueVehicles.slice(0, 5).map(v => (
                <div key={v.id} className="flex items-center gap-3 py-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, #4b5e8a, #1b2d5e)',
                    }}
                  >
                    {v.customer?.name
                      ?.split(' ')
                      .map((p: string) => p[0])
                      .slice(0, 2)
                      .join('') ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-[550] truncate text-slate-800">
                        {v.customer?.name}
                      </span>
                      <span
                        className="text-[10.5px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: '#1a1a1a',
                          color: '#e8d84a',
                          fontFamily: 'ui-monospace, monospace',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {v.license_plate}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {v.brand} {v.model}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <div className="text-[12px] font-semibold text-red-700">
                      {v.next_service_date
                        ? new Intl.DateTimeFormat('id-ID', {
                            day: '2-digit',
                            month: 'short',
                          }).format(new Date(v.next_service_date))
                        : '—'}
                    </div>
                    {v.reminder_sent_at ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold cursor-default">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              Dihubungi
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[200px] space-y-1 text-left">
                            <p className="font-[550]">{formatDate(v.reminder_sent_at)}</p>
                            {v.reminder_notes && (
                              <p className="opacity-80">{v.reminder_notes}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold transition-colors"
                        style={{ background: 'rgba(255,255,255,0.9)', color: '#991b1b', border: '1px solid #fca5a5' }}
                        onClick={() => { setContactTarget(v); setContactNotes(''); }}
                      >
                        <Phone className="h-2.5 w-2.5" />
                        Hubungi
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact dialog */}
      <Dialog open={!!contactTarget} onOpenChange={open => !open && setContactTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tandai Sudah Dihubungi</DialogTitle>
          </DialogHeader>
          {contactTarget && (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center justify-center font-bold rounded px-2 py-0.5 text-[11px]"
                    style={{
                      background: '#1a1a1a',
                      color: '#e8d84a',
                      border: '1.5px solid #3a3620',
                      fontFamily: 'ui-monospace, monospace',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {contactTarget.license_plate}
                  </span>
                  <span className="text-[13px] text-slate-600 font-[550]">
                    {contactTarget.customer?.name}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-400 mt-1">
                  {contactTarget.brand} {contactTarget.model}
                </p>
              </div>
              {contactTarget.customer?.phone && (
                <a
                  href={`https://wa.me/${toWaPhone(contactTarget.customer.phone)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 h-9 px-3 rounded-lg text-[12.5px] font-[550] w-full transition-opacity hover:opacity-80"
                  style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' }}
                >
                  <MessageCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Buka WhatsApp</span>
                  <span className="ml-auto font-mono text-[11px] text-green-600">{contactTarget.customer.phone}</span>
                </a>
              )}
              <div className="space-y-1">
                <Label>Catatan (opsional)</Label>
                <textarea
                  className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={3}
                  placeholder="Hasil percakapan, janji servis, dsb."
                  value={contactNotes}
                  onChange={e => setContactNotes(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setContactTarget(null)}>
                  Batal
                </Button>
                <Button
                  size="sm"
                  disabled={markContacted.isPending}
                  style={{ background: 'var(--navy-800)' }}
                  className="text-white hover:opacity-90"
                  onClick={() => {
                    if (!contactTarget) return;
                    markContacted.mutate(
                      { id: contactTarget.id, notes: contactNotes },
                      { onSuccess: () => setContactTarget(null) }
                    );
                  }}
                >
                  {markContacted.isPending ? 'Menyimpan…' : 'Tandai Dihubungi'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
