import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-bold">Halaman Tidak Ditemukan</h2>
        <p className="text-muted-foreground">
          Halaman yang Anda cari tidak ada.
        </p>
        <Button asChild>
          <Link href="/">Kembali ke Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}