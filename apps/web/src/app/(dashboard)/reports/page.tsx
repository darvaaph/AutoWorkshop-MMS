'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  useEffect(() => {
    // Redirect cashier to dashboard
    if (!isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Reports & Analytics
          </CardTitle>
          <CardDescription>
            Halaman reports akan dibuat di phase selanjutnya
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Fitur: Laporan penjualan, keuangan, inventory, profit margin.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}