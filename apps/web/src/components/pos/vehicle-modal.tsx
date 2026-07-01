'use client';

import { Car } from 'lucide-react';
import type { Vehicle } from '@/lib/api/vehicles';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Vehicle/customer picker for the POS order panel. `onSelect` chooses a vehicle,
 * `onWalkIn` clears the selection (walk-in / no vehicle).
 */
export function VehicleModal({
  open,
  onOpenChange,
  vehicles,
  isLoading,
  onSelect,
  onWalkIn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicles: Vehicle[] | undefined;
  isLoading: boolean;
  onSelect: (vehicle: Vehicle) => void;
  onWalkIn: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-[16px]" style={{ color: 'var(--navy-900)' }}>
            Pilih Kendaraan
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-y-auto divide-y">
          {isLoading ? (
            <p className="px-5 py-6 text-[13px] text-slate-400 text-center">
              Memuat…
            </p>
          ) : !vehicles || vehicles.length === 0 ? (
            <p className="px-5 py-6 text-[13px] text-slate-400 text-center">
              Belum ada kendaraan terdaftar
            </p>
          ) : (
            vehicles.map(v => (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(v)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    background: '#1a1a1a',
                    color: '#e8d84a',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {v.license_plate}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] font-[550] truncate"
                    style={{ color: 'var(--navy-900)' }}
                  >
                    {v.brand} {v.model}
                  </p>
                  <p className="text-[11.5px] text-slate-400 truncate">
                    {v.customer?.name ?? 'Tanpa pelanggan'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="p-3 border-t">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onWalkIn}
          >
            <Car className="h-4 w-4 mr-2 text-slate-400" />
            Walk-in / tanpa kendaraan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
