import {
  LayoutDashboard,
  Users,
  Car,
  ShoppingCart,
  Package,
  PackageOpen,
  Wrench,
  BarChart3,
  Settings,
  DollarSign,
  ClipboardList,
  UserCog,
  ScrollText,
  Wallet,
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
  // ── Utama ──
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Utama',
  },
  {
    label: 'Transaksi (POS)',
    href: '/dashboard/pos',
    icon: ShoppingCart,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Utama',
    accent: true,
  },

  // ── Katalog ──
  {
    label: 'Produk',
    href: '/dashboard/products',
    icon: Package,
    roles: ['ADMIN'],
    section: 'Katalog',
  },
  {
    label: 'Layanan',
    href: '/dashboard/services',
    icon: Wrench,
    roles: ['ADMIN'],
    section: 'Katalog',
  },
  {
    label: 'Paket',
    href: '/dashboard/packages',
    icon: PackageOpen,
    roles: ['ADMIN'],
    section: 'Katalog',
  },

  // ── Data ──
  {
    label: 'Pelanggan',
    href: '/dashboard/customers',
    icon: Users,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Data',
  },
  {
    label: 'Kendaraan',
    href: '/dashboard/vehicles',
    icon: Car,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Data',
  },
  {
    label: 'Montir',
    href: '/dashboard/mechanics',
    icon: UserCog,
    roles: ['ADMIN'],
    section: 'Data',
  },

  // ── Operasional ──
  {
    label: 'Inventori',
    href: '/dashboard/inventory',
    icon: ClipboardList,
    roles: ['ADMIN'],
    section: 'Operasional',
  },
  {
    label: 'Pengeluaran',
    href: '/dashboard/expenses',
    icon: DollarSign,
    roles: ['ADMIN'],
    section: 'Operasional',
  },
  {
    label: 'Pembayaran',
    href: '/dashboard/transactions',
    icon: Wallet,
    roles: ['ADMIN', 'CASHIER'],
    section: 'Operasional',
  },

  // ── Lainnya ──
  {
    label: 'Laporan',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['ADMIN'],
    section: 'Lainnya',
  },
  {
    label: 'Audit Log',
    href: '/dashboard/audit-logs',
    icon: ScrollText,
    roles: ['ADMIN'],
    section: 'Lainnya',
  },
  {
    label: 'Pengaturan',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['ADMIN'],
    section: 'Lainnya',
  },
];

// Primary tabs for the mobile bottom nav (4 + a "Lainnya" sheet for everything else).
export const mobileNavItems: NavItem[] = navItems.filter(item =>
  [
    '/dashboard',
    '/dashboard/pos',
    '/dashboard/vehicles',
    '/dashboard/transactions',
  ].includes(item.href)
);

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter(item => item.roles.includes(role));
}
