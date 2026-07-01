'use client';

import { CheckCircle2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Post-checkout confirmation screen shown after a transaction is created.
 * Print/view actions are self-contained; the reset is delegated to the parent.
 */
export function CheckoutSuccess({
  trxId,
  onViewTransactions,
  onNewTransaction,
}: {
  trxId: number;
  onViewTransactions: () => void;
  onNewTransaction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: '#f0fdf4' }}
      >
        <CheckCircle2 className="h-8 w-8 text-green-600" />
      </div>
      <div className="text-center">
        <p
          className="text-[20px] font-[650] tracking-[-0.02em]"
          style={{ color: 'var(--navy-900)' }}
        >
          Transaksi Berhasil
        </p>
        <p className="text-[13px] text-slate-500 mt-1">
          TRX-{String(trxId).padStart(4, '0')}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={() => window.open(`/print/${trxId}`, '_blank')}
          style={{ background: 'var(--navy-800)' }}
          className="text-white hover:opacity-90"
        >
          <Printer className="h-4 w-4 mr-2" />
          Cetak Struk
        </Button>
        <Button variant="outline" onClick={onViewTransactions}>
          Lihat Transaksi
        </Button>
        <Button variant="ghost" onClick={onNewTransaction}>
          Transaksi Baru
        </Button>
      </div>
    </div>
  );
}
