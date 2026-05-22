'use client';

import { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Car,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
} from '@/hooks/use-vehicles';
import { useCustomers } from '@/hooks/use-customers';
import type { Vehicle } from '@/lib/api/vehicles';
import { formatKm } from '@/lib/format';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const vehicleSchema = z.object({
  customer_id: z.coerce.number().min(1, 'Pilih pelanggan'),
  license_plate: z.string().min(1, 'Plat nomor wajib diisi'),
  brand: z.string().min(1, 'Merek wajib diisi'),
  model: z.string().min(1, 'Model wajib diisi'),
  current_km: z.coerce.number().min(0),
  next_service_date: z.string().optional(),
  next_service_km: z.coerce.number().optional(),
});

type VehicleForm = z.infer<typeof vehicleSchema>;

type ServiceStatus = 'ok' | 'due' | 'overdue';

function getServiceStatus(
  nextDate: string | null,
  nextKm: number | null,
  currentKm: number
): ServiceStatus {
  if (!nextDate) return 'ok';
  const due = new Date(nextDate);
  const today = new Date();
  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'overdue';
  if (diff <= 30) return 'due';
  if (nextKm && currentKm >= nextKm - 2000) return 'due';
  return 'ok';
}

function LicensePlate({ plate, large }: { plate: string; large?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-bold rounded',
        large ? 'px-2.5 py-1 text-[13.5px]' : 'px-2 py-0.5 text-[11px]'
      )}
      style={{
        background: '#1a1a1a',
        color: '#e8d84a',
        border: '1.5px solid #3a3620',
        fontFamily: 'ui-monospace, monospace',
        letterSpacing: '0.04em',
        lineHeight: 1,
      }}
    >
      {plate}
    </span>
  );
}

export default function VehiclesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'due' | 'overdue'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vehicle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const { data: vehicles, isLoading } = useVehicles(search || undefined);
  const { data: customers } = useCustomers();
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VehicleForm>({ resolver: zodResolver(vehicleSchema) });

  function openCreate() {
    setEditTarget(null);
    reset({
      customer_id: 0,
      license_plate: '',
      brand: '',
      model: '',
      current_km: 0,
      next_service_date: '',
      next_service_km: undefined,
    });
    setDialogOpen(true);
  }

  function openEdit(v: Vehicle) {
    setEditTarget(v);
    reset({
      customer_id: v.customer_id,
      license_plate: v.license_plate,
      brand: v.brand,
      model: v.model,
      current_km: v.current_km,
      next_service_date: v.next_service_date?.slice(0, 10) ?? '',
      next_service_km: v.next_service_km ?? undefined,
    });
    setDialogOpen(true);
  }

  function onSubmit(values: VehicleForm) {
    if (editTarget) {
      updateVehicle.mutate(
        { id: editTarget.id, data: values },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createVehicle.mutate(values, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPending = createVehicle.isPending || updateVehicle.isPending;

  const filtered = (vehicles ?? []).filter(v => {
    if (filter === 'all') return true;
    const status = getServiceStatus(
      v.next_service_date ?? null,
      v.next_service_km ?? null,
      v.current_km
    );
    return status === filter;
  });

  const dueCount = (vehicles ?? []).filter(v => {
    const s = getServiceStatus(
      v.next_service_date ?? null,
      v.next_service_km ?? null,
      v.current_km
    );
    return s === 'due' || s === 'overdue';
  }).length;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[22px] font-[650] tracking-[-0.02em]"
            style={{ color: 'var(--navy-900)' }}
          >
            Kendaraan
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {isLoading
              ? '…'
              : `${vehicles?.length ?? 0} unit terdaftar${
                  dueCount > 0 ? ` · ${dueCount} perlu servis` : ''
                }`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <Filter className="h-3.5 w-3.5 mr-1.5" />
            Filter
          </Button>
          <Button
            size="sm"
            onClick={openCreate}
            style={{ background: 'var(--navy-800)' }}
            className="hover:opacity-90 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah Kendaraan
          </Button>
        </div>
      </div>

      {/* Search + filter chips */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9 h-[38px]"
            placeholder="Cari plat nomor, pemilik, atau merek…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(
            [
              { key: 'all', label: 'Semua' },
              { key: 'due', label: 'Perlu Servis' },
              { key: 'overdue', label: 'Servis Lewat' },
            ] as const
          ).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="h-[38px] px-3 rounded-[10px] text-[13px] font-[550] border transition-all"
              style={
                filter === f.key
                  ? {
                      background: 'var(--navy-50)',
                      color: 'var(--navy-900)',
                      borderColor: 'var(--navy-200)',
                    }
                  : {
                      background: 'white',
                      color: '#64748b',
                      borderColor: '#e2e8f0',
                    }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Car className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">
            {search || filter !== 'all'
              ? 'Tidak ada kendaraan untuk filter ini.'
              : 'Belum ada kendaraan.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filtered.map(v => {
            const status = getServiceStatus(
              v.next_service_date ?? null,
              v.next_service_km ?? null,
              v.current_km
            );
            return (
              <div
                key={v.id}
                className="rounded-xl border bg-white p-3 flex flex-col gap-2.5 relative hover:shadow-md transition-shadow"
              >
                {/* Status badge */}
                {status !== 'ok' && (
                  <span
                    className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 h-5 px-2 rounded-full text-[10px] font-semibold border"
                    style={
                      status === 'overdue'
                        ? {
                            background: '#fef2f2',
                            color: '#b91c1c',
                            borderColor: '#fecaca',
                          }
                        : {
                            background: '#fffbeb',
                            color: '#92400e',
                            borderColor: '#fde68a',
                          }
                    }
                  >
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {status === 'overdue' ? 'Servis Lewat' : 'Perlu Servis'}
                  </span>
                )}

                {/* Vehicle image placeholder */}
                <div
                  className="h-24 rounded-lg flex items-center justify-center"
                  style={{
                    background:
                      'repeating-linear-gradient(135deg, #f1f5f9 0 8px, #f8fafc 8px 16px)',
                  }}
                >
                  <Car className="h-7 w-7 text-slate-300" />
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <LicensePlate plate={v.license_plate} large />
                    <span
                      className="text-[10.5px] text-slate-400"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
                      {v.brand ? `${v.brand} ${v.model}` : ''}
                    </span>
                  </div>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: 'var(--navy-900)' }}
                  >
                    {v.brand}
                  </p>
                  <p className="text-[11.5px] text-slate-500">{v.model}</p>
                </div>

                <hr className="border-slate-100" />

                <div className="flex justify-between text-[11.5px]">
                  <div>
                    <div className="text-slate-400">KM Saat Ini</div>
                    <div
                      className="font-semibold mt-0.5"
                      style={{
                        color: 'var(--navy-900)',
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {formatKm(v.current_km)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400">Pemilik</div>
                    <div
                      className="font-semibold mt-0.5"
                      style={{ color: 'var(--navy-900)' }}
                    >
                      {v.customer?.name?.split(' ')[0] ?? '—'}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 justify-end mt-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-slate-700"
                    onClick={() => openEdit(v)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-400 hover:text-red-600"
                    onClick={() => setDeleteTarget(v)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Kendaraan' : 'Tambah Kendaraan'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label>Pelanggan</Label>
              <select
                {...register('customer_id')}
                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={0}>-- Pilih Pelanggan --</option>
                {customers?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.customer_id && (
                <p className="text-xs text-destructive">
                  {errors.customer_id.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Plat Nomor</Label>
                <Input
                  {...register('license_plate')}
                  placeholder="B 1234 ABC"
                />
                {errors.license_plate && (
                  <p className="text-xs text-destructive">
                    {errors.license_plate.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>KM Saat Ini</Label>
                <Input type="number" min={0} {...register('current_km')} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Merek</Label>
                <Input {...register('brand')} placeholder="Toyota" />
                {errors.brand && (
                  <p className="text-xs text-destructive">
                    {errors.brand.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Model</Label>
                <Input {...register('model')} placeholder="Avanza" />
                {errors.model && (
                  <p className="text-xs text-destructive">
                    {errors.model.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tgl Servis Berikutnya</Label>
                <Input type="date" {...register('next_service_date')} />
              </div>
              <div className="space-y-1">
                <Label>KM Servis Berikutnya</Label>
                <Input type="number" min={0} {...register('next_service_km')} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                style={{ background: 'var(--navy-800)' }}
                className="text-white hover:opacity-90"
              >
                {isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Hapus Kendaraan"
        description={`Yakin ingin menghapus kendaraan "${deleteTarget?.license_plate}"? Data ini tidak dapat dikembalikan.`}
        loading={deleteVehicle.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteVehicle.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
