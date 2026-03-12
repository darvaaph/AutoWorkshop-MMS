'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Customer Management
          </CardTitle>
          <CardDescription>
            Halaman customers akan dibuat di phase selanjutnya
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Fitur: Data pelanggan, kendaraan, service reminder, history transaksi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}