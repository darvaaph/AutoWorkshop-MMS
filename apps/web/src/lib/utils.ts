import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import numeral from 'numeral';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return numeral(amount).format('0,0');
}

export function formatCurrencyIDR(amount: number): string {
  return `Rp ${formatCurrency(amount)}`;
}

export function parseCurrency(value: string): number {
  return numeral(value).value() || 0;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function getImageUrl(path: string | null): string {
  if (!path) return '/placeholder-image.png';
  const baseUrl = process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:3000/uploads';
  return `${baseUrl}/${path}`;
}

export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 2097152; // 2MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File terlalu besar (max 2MB)' };
  }
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Format file tidak didukung' };
  }
  return { valid: true };
}
