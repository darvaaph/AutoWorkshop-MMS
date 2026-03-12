import { UserRole } from '@/types/auth.types';

export const PERMISSIONS = {
  'products.create': ['ADMIN'],
  'products.update': ['ADMIN'],
  'products.delete': ['ADMIN'],
  'products.read': ['ADMIN', 'CASHIER'],
  'services.create': ['ADMIN'],
  'services.update': ['ADMIN'],
  'services.delete': ['ADMIN'],
  'services.read': ['ADMIN', 'CASHIER'],
  'transactions.create': ['ADMIN', 'CASHIER'],
  'transactions.read': ['ADMIN', 'CASHIER'],
  'transactions.update': ['ADMIN'],
  'transactions.delete': ['ADMIN'],
  'reports.financial': ['ADMIN'],
  'reports.sales': ['ADMIN', 'CASHIER'],
  'settings.update': ['ADMIN'],
} as const;

export function hasPermission(
  userRole: UserRole | null | undefined,
  permission: keyof typeof PERMISSIONS
): boolean {
  if (!userRole) return false;
  return (PERMISSIONS[permission] as readonly UserRole[])?.includes(userRole) || false;
}