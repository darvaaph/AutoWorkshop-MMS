'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

export default function POSPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Point of Sale
          </CardTitle>
          <CardDescription>
            Halaman POS akan dibuat di phase selanjutnya
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Fitur: Transaksi penjualan, pilih produk/service, payment, print receipt.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}