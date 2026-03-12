'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-bold">Terjadi Kesalahan</h2>
        <p className="text-muted-foreground max-w-md">
          {error.message || 'Aplikasi mengalami error. Silakan coba lagi.'}
        </p>
        <Button onClick={reset}>Coba Lagi</Button>
      </div>
    </div>
  );
}