'use client';

import { Fragment, useState } from 'react';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  LogIn,
  LogOut,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { useAuditLogs } from '@/hooks/use-audit-logs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/format';

/* ── Helpers ── */

const TABLE_LABELS: Record<string, string> = {
  vehicles: 'Kendaraan',
  customers: 'Pelanggan',
  products: 'Produk',
  services: 'Jasa',
  packages: 'Paket',
  transactions: 'Transaksi',
  transaction_items: 'Item Transaksi',
  expenses: 'Pengeluaran',
  mechanics: 'Mekanik',
  users: 'Pengguna',
  inventory_logs: 'Inventori',
  settings: 'Pengaturan',
};

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; bg: string; text: string; border: string }
> = {
  CREATE: {
    label: 'Buat',
    icon: <Plus className="h-2.5 w-2.5" />,
    bg: '#f0fdf4',
    text: '#15803d',
    border: '#bbf7d0',
  },
  UPDATE: {
    label: 'Ubah',
    icon: <Pencil className="h-2.5 w-2.5" />,
    bg: '#eff6ff',
    text: '#1d4ed8',
    border: '#bfdbfe',
  },
  DELETE: {
    label: 'Hapus',
    icon: <Trash2 className="h-2.5 w-2.5" />,
    bg: '#fef2f2',
    text: '#b91c1c',
    border: '#fecaca',
  },
  LOGIN: {
    label: 'Masuk',
    icon: <LogIn className="h-2.5 w-2.5" />,
    bg: '#faf5ff',
    text: '#7e22ce',
    border: '#e9d5ff',
  },
  LOGOUT: {
    label: 'Keluar',
    icon: <LogOut className="h-2.5 w-2.5" />,
    bg: '#f8fafc',
    text: '#475569',
    border: '#cbd5e1',
  },
  READ: {
    label: 'Baca',
    icon: <Eye className="h-2.5 w-2.5" />,
    bg: '#f8fafc',
    text: '#64748b',
    border: '#e2e8f0',
  },
};

function ActionBadge({ action }: { action: string }) {
  const cfg = ACTION_CONFIG[action] ?? ACTION_CONFIG.READ;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-[600] border whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function safeParseJson(val: unknown): Record<string, unknown> | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object' && !Array.isArray(val)) return val as Record<string, unknown>;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

function displayValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Ya' : 'Tidak';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function DataDetail({
  oldValues,
  newValues,
  action,
}: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  action: string;
}) {
  const old = safeParseJson(oldValues);
  const next = safeParseJson(newValues);

  if (!old && !next) {
    return <p className="text-slate-400 text-[12px]">Tidak ada data detail.</p>;
  }

  if (action === 'CREATE' && next) {
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px]">
        {Object.entries(next).map(([key, val]) => (
          <Fragment key={key}>
            <span className="text-slate-400 font-mono">{key}</span>
            <span className="text-green-700 break-all">{displayValue(val)}</span>
          </Fragment>
        ))}
      </div>
    );
  }

  if (action === 'DELETE' && old) {
    return (
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12px]">
        {Object.entries(old).map(([key, val]) => (
          <Fragment key={key}>
            <span className="text-slate-400 font-mono">{key}</span>
            <span className="text-red-600 line-through break-all">{displayValue(val)}</span>
          </Fragment>
        ))}
      </div>
    );
  }

  const allKeys = Array.from(new Set([...Object.keys(old ?? {}), ...Object.keys(next ?? {})]));
  const changedKeys = allKeys.filter(
    key => JSON.stringify((old ?? {})[key]) !== JSON.stringify((next ?? {})[key])
  );

  if (changedKeys.length === 0) {
    return <p className="text-slate-400 text-[12px]">Tidak ada perubahan data.</p>;
  }

  return (
    <table className="text-[12px] w-full">
      <thead>
        <tr>
          <th className="text-left text-slate-400 font-[550] pb-2 pr-6 w-[140px]">Field</th>
          <th className="text-left text-slate-400 font-[550] pb-2 pr-6">Sebelum</th>
          <th className="text-left text-slate-400 font-[550] pb-2">Sesudah</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {changedKeys.map(key => (
          <tr key={key}>
            <td className="py-1.5 pr-6 font-mono text-slate-500 align-top">{key}</td>
            <td className="py-1.5 pr-6 text-red-600 break-all align-top">
              {displayValue((old ?? {})[key])}
            </td>
            <td className="py-1.5 text-green-700 break-all align-top">
              {displayValue((next ?? {})[key])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Page ── */

const LIMIT = 50;

const ALL_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const ALL_TABLES = [
  'vehicles', 'customers', 'products', 'services', 'packages',
  'transactions', 'expenses', 'mechanics', 'users', 'inventory_logs', 'settings',
];

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data, isLoading } = useAuditLogs({
    page,
    limit: LIMIT,
    action: filterAction || undefined,
    table_name: filterTable || undefined,
    date_from: filterDateFrom || undefined,
    date_to: filterDateTo || undefined,
  });

  const logs = data?.data ?? [];
  const meta = data?.meta;

  function toggleExpand(id: number) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function resetFilters() {
    setFilterAction('');
    setFilterTable('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setPage(1);
  }

  const hasFilters = filterAction || filterTable || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1
          className="text-[22px] font-[650] tracking-[-0.02em] flex items-center gap-2"
          style={{ color: 'var(--navy-900)' }}
        >
          <ScrollText className="h-5 w-5" />
          Audit Log
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          {isLoading ? '…' : `${meta?.total ?? 0} entri tercatat`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          className="h-[36px] px-2 pr-7 rounded-[9px] text-[12.5px] border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-navy-300"
        >
          <option value="">Semua aksi</option>
          {ALL_ACTIONS.map(a => (
            <option key={a} value={a}>{ACTION_CONFIG[a]?.label ?? a}</option>
          ))}
        </select>

        <select
          value={filterTable}
          onChange={e => { setFilterTable(e.target.value); setPage(1); }}
          className="h-[36px] px-2 pr-7 rounded-[9px] text-[12.5px] border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-navy-300"
        >
          <option value="">Semua tabel</option>
          {ALL_TABLES.map(t => (
            <option key={t} value={t}>{TABLE_LABELS[t] ?? t}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={filterDateFrom}
            onChange={e => { setFilterDateFrom(e.target.value); setPage(1); }}
            className="h-[36px] w-[140px] text-[12.5px]"
          />
          <span className="text-slate-400 text-xs">–</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={e => { setFilterDateTo(e.target.value); setPage(1); }}
            className="h-[36px] w-[140px] text-[12.5px]"
          />
        </div>

        {hasFilters && (
          <button
            onClick={resetFilters}
            className="h-[36px] px-3 rounded-[9px] text-[12.5px] text-slate-500 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-slate-100" style={{ background: 'var(--navy-50)' }}>
                <th className="text-left px-4 py-2.5 font-[600] text-slate-500 w-[160px]">Waktu</th>
                <th className="text-left px-4 py-2.5 font-[600] text-slate-500 w-[80px]">Aksi</th>
                <th className="text-left px-4 py-2.5 font-[600] text-slate-500 w-[110px]">Tabel</th>
                <th className="text-left px-4 py-2.5 font-[600] text-slate-500">Pengguna</th>
                <th className="text-left px-4 py-2.5 font-[600] text-slate-500 w-[80px]">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <Skeleton className="h-3.5 w-full rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                : logs.length === 0
                ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                      Tidak ada entri audit log.
                    </td>
                  </tr>
                )
                : logs.map(log => {
                    const expanded = expandedRows.has(log.id);
                    const hasDetail = log.old_values || log.new_values;
                    return (
                      <Fragment key={log.id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-[11.5px]">
                            {formatDateTime(log.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <ActionBadge action={log.action} />
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {TABLE_LABELS[log.table_name] ?? log.table_name}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {log.user?.full_name ?? `#${log.user_id}`}
                          </td>
                          <td className="px-4 py-3">
                            {hasDetail && (
                              <button
                                onClick={() => toggleExpand(log.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-[550] text-slate-500 hover:text-slate-800 transition-colors"
                              >
                                {expanded ? (
                                  <>Tutup <ChevronUp className="h-3 w-3" /></>
                                ) : (
                                  <>Lihat <ChevronDown className="h-3 w-3" /></>
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                        {expanded && hasDetail && (
                          <tr className="bg-slate-50/60">
                            <td colSpan={5} className="px-6 py-4">
                              <DataDetail
                                oldValues={log.old_values}
                                newValues={log.new_values}
                                action={log.action}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-slate-500">
            Halaman {meta.page} dari {meta.totalPages} · {meta.total} entri
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              disabled={meta.page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
              const p = meta.totalPages <= 7
                ? i + 1
                : meta.page <= 4
                ? i + 1
                : meta.page >= meta.totalPages - 3
                ? meta.totalPages - 6 + i
                : meta.page - 3 + i;
              return (
                <Button
                  key={p}
                  variant={p === meta.page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 p-0 text-[12px]"
                  style={p === meta.page ? { background: 'var(--navy-800)' } : undefined}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              disabled={meta.page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
