'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Inventory Management
          </CardTitle>
          <CardDescription>
            Halaman inventory akan dibuat di phase selanjutnya
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Fitur: Kelola produk, stok in/out, low stock alert, categories.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}