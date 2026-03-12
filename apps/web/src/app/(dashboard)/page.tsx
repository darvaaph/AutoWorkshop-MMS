'use client';

import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isAdmin } = useAuthStore();

  const menuItems = [
    {
      title: 'Point of Sale',
      description: 'Transaksi penjualan & servis',
      icon: ShoppingCart,
      href: '/pos',
      roles: ['ADMIN', 'CASHIER'],
    },
    {
      title: 'Inventory',
      description: 'Kelola produk & stok barang',
      icon: Package,
      href: '/inventory',
      roles: ['ADMIN', 'CASHIER'],
    },
    {
      title: 'Customers',
      description: 'Data pelanggan & kendaraan',
      icon: Users,
      href: '/customers',
      roles: ['ADMIN', 'CASHIER'],
    },
    {
      title: 'Reports',
      description: 'Laporan keuangan & penjualan',
      icon: BarChart3,
      href: '/reports',
      roles: ['ADMIN'],
    },
    {
      title: 'Settings',
      description: 'Pengaturan sistem',
      icon: Settings,
      href: '/settings',
      roles: ['ADMIN'],
    },
  ];

  // Filter menu by role
  const accessibleMenus = menuItems.filter(item =>
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                Selamat Datang, {user?.full_name}!
              </CardTitle>
              <CardDescription className="mt-2">
                Pilih menu di bawah untuk memulai
              </CardDescription>
            </div>
            <Badge variant={isAdmin() ? 'default' : 'secondary'}>
              {user?.role === 'ADMIN' ? 'Administrator' : 'Kasir'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Menu Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accessibleMenus.map((item) => (
          <Card
            key={item.href}
            className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            onClick={() => window.location.href = item.href}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center gap-2">
                    <item.icon className="h-5 w-5 text-primary" />
                    {item.title}
                  </CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Halaman menu (POS, Inventory, dll) akan dibuat di phase selanjutnya.
            Saat ini sistem authentication sudah aktif dan berfungsi dengan baik.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}