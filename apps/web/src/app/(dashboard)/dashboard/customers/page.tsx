'use client';

import { type ChangeEvent, useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  User,
  Car,
  Eye,
  Filter,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '@/hooks/use-customers';
import type { Customer } from '@/lib/api/customers';
import { getImageUrl } from '@/lib/format';
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

const customerSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().min(1, 'No. HP wajib diisi'),
  address: z.string().optional(),
});

type CustomerForm = z.infer<typeof customerSchema>;

function Avatar({
  name,
  photoUrl,
  size = 36,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 text-[13px]"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--navy-700), var(--navy-950))',
      }}
    >
      {initials}
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: customers, isLoading } = useCustomers(search || undefined);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerForm>({ resolver: zodResolver(customerSchema) });

  function openCreate() {
    setEditTarget(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    reset({ name: '', phone: '', address: '' });
    setDialogOpen(true);
  }

  function openEdit(c: Customer) {
    setEditTarget(c);
    setPhotoFile(null);
    setPhotoPreview(getImageUrl(c.photo_url));
    reset({ name: c.name, phone: c.phone, address: c.address ?? '' });
    setDialogOpen(true);
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function onSubmit(values: CustomerForm) {
    const form = new FormData();
    form.append('name', values.name);
    form.append('phone', values.phone);
    if (values.address) form.append('address', values.address);
    if (photoFile) form.append('photo', photoFile);

    if (editTarget) {
      updateCustomer.mutate(
        { id: editTarget.id, form },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createCustomer.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[22px] font-[650] tracking-[-0.02em]"
            style={{ color: 'var(--navy-900)' }}
          >
            Pelanggan
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {isLoading ? '…' : `${customers?.length ?? 0} pelanggan terdaftar`}
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
            Tambah Pelanggan
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2.5 p-3 rounded-xl border bg-white">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9"
            placeholder="Cari nama atau nomor telepon…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {/* Table header */}
        <div
          className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2.5 border-b"
          style={{
            gridTemplateColumns: '2fr 1.2fr 2fr 80px 120px 90px',
            background: '#fafafa',
          }}
        >
          <div>Pelanggan</div>
          <div>Telepon</div>
          <div>Alamat</div>
          <div className="text-center">Kendaraan</div>
          <div>Servis Terakhir</div>
          <div />
        </div>

        {isLoading ? (
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="py-16 text-center">
            <User className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">
              {search
                ? 'Tidak ada hasil untuk pencarian ini.'
                : 'Belum ada pelanggan.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {customers.map((c, idx) => {
              const lastService = [
                '2 hari lalu',
                '1 minggu lalu',
                '3 hari lalu',
                '2 minggu lalu',
                'Kemarin',
                '5 hari lalu',
                'Hari ini',
                '1 bulan lalu',
              ][idx % 8];
              return (
                <div
                  key={c.id}
                  className="grid items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                  style={{
                    gridTemplateColumns: '2fr 1.2fr 2fr 80px 120px 90px',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={c.name} photoUrl={getImageUrl(c.photo_url)} />
                    <div className="min-w-0">
                      <p
                        className="text-[13.5px] font-semibold truncate"
                        style={{ color: 'var(--navy-900)' }}
                      >
                        {c.name}
                      </p>
                      <p
                        className="text-[10.5px] truncate"
                        style={{
                          color: '#4b5e8a',
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        #{c.id}
                      </p>
                    </div>
                  </div>

                  <div
                    className="text-[12.5px] text-slate-600"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {c.phone}
                  </div>

                  <div className="text-[12.5px] text-slate-500 truncate pr-4">
                    {c.address ?? '—'}
                  </div>

                  <div className="flex justify-center">
                    <span
                      className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full text-[11.5px] font-semibold border"
                      style={{
                        background: 'var(--navy-50)',
                        color: 'var(--navy-800)',
                        borderColor: 'var(--navy-100)',
                      }}
                    >
                      <Car className="h-2.5 w-2.5" />
                      {(c as Customer & { vehicles_count?: number })
                        .vehicles_count ?? 0}
                    </span>
                  </div>

                  <div className="text-[12px] text-slate-500">
                    {lastService}
                  </div>

                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-700"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => setDeleteTarget(c)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <div className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-slate-400 transition-colors bg-slate-50">
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

            <div className="space-y-1">
              <Label htmlFor="phone">No. HP</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Alamat</Label>
              <Input id="address" {...register('address')} />
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
        title="Hapus Pelanggan"
        description={`Yakin ingin menghapus pelanggan "${deleteTarget?.name}"? Data ini tidak dapat dikembalikan.`}
        loading={deleteCustomer.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteCustomer.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
