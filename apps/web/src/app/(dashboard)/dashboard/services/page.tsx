'use client';

import { type ChangeEvent, useState } from 'react';
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from '@/hooks/use-services';
import type { Service } from '@/lib/api/services';
import { formatRupiah, getImageUrl } from '@/lib/format';
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

const serviceSchema = z.object({
  name: z.string().min(1, 'Nama jasa wajib diisi'),
  price: z.coerce.number().min(0, 'Harga harus >= 0'),
  description: z.string().optional(),
});

type ServiceForm = z.infer<typeof serviceSchema>;

export default function ServicesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceForm>({ resolver: zodResolver(serviceSchema) });

  function openCreate() {
    setEditTarget(null);
    setImageFile(null);
    setImagePreview(null);
    reset({ name: '', price: 0, description: '' });
    setDialogOpen(true);
  }

  function openEdit(s: Service) {
    setEditTarget(s);
    setImageFile(null);
    setImagePreview(getImageUrl(s.image_url));
    reset({
      name: s.name,
      price: parseFloat(s.price),
      description: s.description ?? '',
    });
    setDialogOpen(true);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function onSubmit(values: ServiceForm) {
    const form = new FormData();
    form.append('name', values.name);
    form.append('price', String(values.price));
    if (values.description) form.append('description', values.description);
    if (imageFile) form.append('image', imageFile);

    if (editTarget) {
      updateService.mutate(
        { id: editTarget.id, form },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createService.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPending = createService.isPending || updateService.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jasa"
        description="Kelola daftar jasa bengkel"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Tambah
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !services || services.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Belum ada jasa bengkel.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {s.image_url ? (
                    <img
                      src={getImageUrl(s.image_url) ?? ''}
                      alt={s.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Wrench className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatRupiah(s.price)}
                  </p>
                  {s.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {s.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(s)}
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
              {editTarget ? 'Edit Jasa' : 'Tambah Jasa'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <div className="h-20 w-20 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Wrench className="h-8 w-8 text-slate-400" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">Nama Jasa</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="price">Harga</Label>
              <Input id="price" type="number" min={0} {...register('price')} />
              {errors.price && (
                <p className="text-xs text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Deskripsi</Label>
              <Input id="description" {...register('description')} />
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
        title="Hapus Jasa"
        description={`Yakin ingin menghapus jasa "${deleteTarget?.name}"? Data ini tidak dapat dikembalikan.`}
        loading={deleteService.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteService.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
