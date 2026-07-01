'use client';

import { type ChangeEvent, useState } from 'react';
import { Plus, Pencil, Trash2, User, CheckCircle, XCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useQueryClient } from '@tanstack/react-query';
import {
  useMechanics,
  useCreateMechanic,
  useUpdateMechanic,
  useDeleteMechanic,
} from '@/hooks/use-mechanics';
import type { Mechanic } from '@/lib/api/mechanics';
import {
  getMechanicDetailsApi,
  updateMechanicDetailsApi,
} from '@/lib/api/mechanics';
import { useAuthStore } from '@/store/auth.store';
import { getImageUrl } from '@/lib/format';
import { PageHeader } from '@/components/shared/page-header';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const mechanicSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().optional(),
  address: z.string().optional(),
  emergency_contact: z.string().optional(),
  is_active: z.boolean(),
});

type MechanicForm = z.infer<typeof mechanicSchema>;

export default function MechanicsPage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Mechanic | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Mechanic | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: mechanics, isLoading } = useMechanics();
  const createMechanic = useCreateMechanic();
  const updateMechanic = useUpdateMechanic();
  const deleteMechanic = useDeleteMechanic();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MechanicForm>({ resolver: zodResolver(mechanicSchema) });

  const isActive = watch('is_active');

  function openCreate() {
    setEditTarget(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    reset({ name: '', phone: '', address: '', is_active: true });
    setDialogOpen(true);
  }

  async function openEdit(m: Mechanic) {
    setEditTarget(m);
    setPhotoFile(null);
    setPhotoPreview(getImageUrl(m.photo_url));
    reset({
      name: m.name,
      phone: '',
      address: '',
      emergency_contact: '',
      is_active: m.is_active,
    });
    setDialogOpen(true);

    if (isAdmin) {
      try {
        const details = await getMechanicDetailsApi(m.id);
        reset({
          name: m.name,
          phone: details.phone ?? '',
          address: details.address ?? '',
          emergency_contact: details.emergency_contact ?? '',
          is_active: m.is_active,
        });
      } catch {
        // non-fatal: form still works without contact details
      }
    }
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function onSubmit(values: MechanicForm) {
    const form = new FormData();
    form.append('name', values.name);
    form.append('is_active', String(values.is_active));
    if (photoFile) form.append('photo', photoFile);

    setIsSaving(true);
    try {
      if (editTarget) {
        await new Promise<void>((resolve, reject) =>
          updateMechanic.mutate(
            { id: editTarget.id, form },
            { onSuccess: () => resolve(), onError: reject }
          )
        );
        await updateMechanicDetailsApi(editTarget.id, {
          phone: values.phone || undefined,
          address: values.address || undefined,
          emergency_contact: values.emergency_contact || undefined,
        });
        await queryClient.invalidateQueries({ queryKey: ['mechanics'] });
      } else {
        await new Promise<void>((resolve, reject) =>
          createMechanic.mutate(form, {
            onSuccess: () => resolve(),
            onError: reject,
          })
        );
      }
      setDialogOpen(false);
    } catch {
      // errors surfaced by mutation toasts if configured
    } finally {
      setIsSaving(false);
    }
  }

  const isPending =
    createMechanic.isPending || updateMechanic.isPending || isSaving;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mekanik"
        description="Kelola data mekanik bengkel"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !mechanics || mechanics.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Belum ada mekanik.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mechanics.map(m => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {m.photo_url ? (
                    <img
                      src={getImageUrl(m.photo_url) ?? ''}
                      alt={m.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{m.name}</p>
                    {m.is_active ? (
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {m.is_active ? 'Aktif' : 'Tidak aktif'}
                    {isAdmin && (
                      <span className="ml-1.5 text-slate-300">
                        · Edit untuk lihat detail
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(m)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(m)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Mekanik' : 'Tambah Mekanik'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <div className="h-20 w-20 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <p className="text-[11px] font-[600] text-slate-400 uppercase tracking-[0.06em]">
                Informasi Kontak
                {editTarget && (
                  <span className="ml-1 font-normal normal-case text-slate-300">
                    (dimuat dari server…)
                  </span>
                )}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="phone">No. HP</Label>
                  <Input
                    id="phone"
                    placeholder="08xx…"
                    {...register('phone')}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emergency_contact">Kontak Darurat</Label>
                  <Input
                    id="emergency_contact"
                    placeholder="Nama / nomor"
                    {...register('emergency_contact')}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">Alamat</Label>
                <Input
                  id="address"
                  placeholder="Alamat tempat tinggal"
                  {...register('address')}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setValue('is_active', !isActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  isActive ? 'bg-slate-900' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <Label
                className="cursor-pointer"
                onClick={() => setValue('is_active', !isActive)}
              >
                {isActive ? 'Aktif' : 'Tidak Aktif'}
              </Label>
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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Hapus Mekanik"
        description={`Yakin ingin menghapus mekanik "${deleteTarget?.name}"? Data ini tidak dapat dikembalikan.`}
        loading={deleteMechanic.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteMechanic.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
