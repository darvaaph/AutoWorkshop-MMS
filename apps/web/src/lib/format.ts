export function toWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return '62' + digits;
}

export function formatRupiah(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
}

/**
 * Short currency for tight spaces (e.g. 2-up stat cards on mobile):
 * 1.250.000 -> "Rp1,3 jt", 450.000 -> "Rp450 rb", 2.1e9 -> "Rp2,1 M".
 */
export function formatRupiahCompact(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(num)) return 'Rp0';
  const abs = Math.abs(num);
  if (abs >= 1_000_000_000)
    return `Rp${(num / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`;
  if (abs >= 1_000_000)
    return `Rp${(num / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (abs >= 1_000)
    return `Rp${(num / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return `Rp${num.toLocaleString('id-ID')}`;
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** Date + time (e.g. "17 Jun 2026, 14.30") — used by transaction/inventory/audit lists. */
export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatKm(km: number | null | undefined): string {
  if (km == null) return '-';
  return `${km.toLocaleString('id-ID')} km`;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ??
  'http://localhost:3000';

export function getImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
}
