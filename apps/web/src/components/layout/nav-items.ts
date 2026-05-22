import {
  LayoutDashboard,
  Users,
  Car,
  ShoppingCart,
  Receipt,
  Package,
  Wrench,
  BarChart3,
  Settings,
  DollarSign,
  ClipboardList,
  UserCog,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { UserRole } from '@/types/auth.types';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  section: string;
  accent?: boolean;
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Utama',
  },
  {
    label: 'Transaksi Baru',
    href: '/dashboard/pos',
    icon: ShoppingCart,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Utama',
    accent: true,
  },
  {
    label: 'Riwayat',
    href: '/dashboard/transactions',
    icon: Receipt,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Utama',
  },
  {
    label: 'Pelanggan',
    href: '/dashboard/customers',
    icon: Users,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Master Data',
  },
  {
    label: 'Kendaraan',
    href: '/dashboard/vehicles',
    icon: Car,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Master Data',
  },
  {
    label: 'Produk',
    href: '/dashboard/products',
    icon: Package,
    roles: ['ADMIN'],
    section: 'Master Data',
  },
  {
    label: 'Jasa',
    href: '/dashboard/services',
    icon: Wrench,
    roles: ['ADMIN'],
    section: 'Master Data',
  },
  {
    label: 'Mekanik',
    href: '/dashboard/mechanics',
    icon: UserCog,
    roles: ['ADMIN'],
    section: 'Master Data',
  },
  {
    label: 'Inventori',
    href: '/dashboard/inventory',
    icon: ClipboardList,
    roles: ['ADMIN'],
    section: 'Manajemen',
  },
  {
    label: 'Pengeluaran',
    href: '/dashboard/expenses',
    icon: DollarSign,
    roles: ['ADMIN'],
    section: 'Manajemen',
  },
  {
    label: 'Laporan',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['ADMIN'],
    section: 'Manajemen',
  },
  {
    label: 'Pengaturan',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['ADMIN'],
    section: 'Manajemen',
  },
];

export const mobileNavItems: NavItem[] = navItems.filter(item =>
  [
    '/dashboard',
    '/dashboard/customers',
    '/dashboard/vehicles',
    '/dashboard/pos',
    '/dashboard/transactions',
  ].includes(item.href)
);

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter(item => item.roles.includes(role));
}
