'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Gift, AlertTriangle, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  usePackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
} from '@/hooks/use-packages';
import { useProducts } from '@/hooks/use-products';
import { useServices } from '@/hooks/use-services';
import type { Package, CreatePackageItem } from '@/lib/api/packages';
import { formatRupiah } from '@/lib/format';
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
import { useAuthStore } from '@/store/auth.store';

const packageSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  price: z.coerce.number().min(0, 'Harga tidak boleh negatif'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});
type PackageForm = z.infer<typeof packageSchema>;

type DraftItem = {
  tempId: string;
  type: 'product' | 'service';
  id: number;
  name: string;
  qty: number;
  unitPrice: number;
};

function AvailabilityBadge({
  available,
  reason,
}: {
  available: boolean;
  reason: string | null;
}) {
  if (available) {
    return (
      <span
        className="inline-flex items-center h-[20px] px-2 rounded-full text-[10.5px] font-semibold border"
        style={{
          background: '#f0fdf4',
          color: '#15803d',
          borderColor: '#bbf7d0',
        }}
      >
        Tersedia
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 h-[20px] px-2 rounded-full text-[10.5px] font-semibold border"
      style={{
        background: '#fef2f2',
        color: '#b91c1c',
        borderColor: '#fecaca',
      }}
      title={reason ?? ''}
    >
      <AlertTriangle className="h-3 w-3" />
      Stok Kurang
    </span>
  );
}

export default function PackagesPage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Package | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Package | null>(null);

  // Items builder state
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [itemTab, setItemTab] = useState<'product' | 'service'>('product');
  const [itemSearch, setItemSearch] = useState('');

  const { data, isLoading } = usePackages({
    search: search || undefined,
    active_only: showInactive ? false : undefined,
    limit: 100,
  });
  const { data: productsData } = useProducts({
    search: itemSearch || undefined,
  });
  const { data: services } = useServices();

  const createPkg = useCreatePackage();
  const updatePkg = useUpdatePackage();
  const deletePkg = useDeletePackage();

  const packages = data?.packages ?? [];
  const products = productsData?.products ?? [];
  const filteredServices = (services ?? []).filter(s =>
    itemSearch ? s.name.toLowerCase().includes(itemSearch.toLowerCase()) : true
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PackageForm>({
    resolver: zodResolver(packageSchema),
    defaultValues: { is_active: true },
  });

  function openCreate() {
    setEditTarget(null);
    setDraftItems([]);
    reset({ name: '', price: 0, description: '', is_active: true });
    setItemSearch('');
    setDialogOpen(true);
  }

  function openEdit(pkg: Package) {
    setEditTarget(pkg);
    const drafts: DraftItem[] = pkg.items.map(item => ({
      tempId: String(item.id),
      type: item.product ? 'product' : 'service',
      id: (item.product?.id ?? item.service?.id) as number,
      name: item.product?.name ?? item.service?.name ?? '',
      qty: item.qty,
      unitPrice: parseFloat(
        item.product?.price_sell ?? item.service?.price ?? '0'
      ),
    }));
    setDraftItems(drafts);
    reset({
      name: pkg.name,
      price: parseFloat(pkg.price),
      description: pkg.description ?? '',
      is_active: pkg.is_active,
    });
    setItemSearch('');
    setDialogOpen(true);
  }

  function addDraftItem(
    type: 'product' | 'service',
    id: number,
    name: string,
    price: number
  ) {
    const existing = draftItems.find(d => d.type === type && d.id === id);
    if (existing) {
      setDraftItems(prev =>
        prev.map(d =>
          d.type === type && d.id === id ? { ...d, qty: d.qty + 1 } : d
        )
      );
    } else {
      setDraftItems(prev => [
        ...prev,
        {
          tempId: `${type}-${id}-${Date.now()}`,
          type,
          id,
          name,
          qty: 1,
          unitPrice: price,
        },
      ]);
    }
    setItemSearch('');
  }

  function removeDraftItem(tempId: string) {
    setDraftItems(prev => prev.filter(d => d.tempId !== tempId));
  }

  function updateDraftQty(tempId: string, qty: number) {
    if (qty < 1) return;
    setDraftItems(prev =>
      prev.map(d => (d.tempId === tempId ? { ...d, qty } : d))
    );
  }

  function onSubmit(values: PackageForm) {
    if (draftItems.length === 0) return;

    const items: CreatePackageItem[] = draftItems.map(d => ({
      ...(d.type === 'product' ? { product_id: d.id } : { service_id: d.id }),
      qty: d.qty,
    }));

    if (editTarget) {
      updatePkg.mutate(
        { id: editTarget.id, ...values, items },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createPkg.mutate(
        { ...values, items },
        { onSuccess: () => setDialogOpen(false) }
      );
    }
  }

  const isPending = createPkg.isPending || updatePkg.isPending;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[22px] font-[650] tracking-[-0.02em]"
            style={{ color: 'var(--navy-900)' }}
          >
            Paket Servis
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {isLoading ? '…' : `${packages.length} paket`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInactive(v => !v)}
            className="h-9 px-3 rounded-[10px] text-[12.5px] font-[550] border transition-all"
            style={
              showInactive
                ? {
                    background: 'var(--navy-800)',
                    color: '#fff',
                    borderColor: 'var(--navy-800)',
                  }
                : {
                    background: '#fff',
                    color: '#64748b',
                    borderColor: '#e2e8f0',
                  }
            }
          >
            {showInactive ? 'Semua' : 'Aktif saja'}
          </button>
          {isAdmin && (
            <Button
              size="sm"
              onClick={openCreate}
              style={{ background: 'var(--navy-800)' }}
              className="hover:opacity-90 text-white border-0"
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah Paket
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <Input
        placeholder="Cari nama paket…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm h-9"
      />

      {/* Package cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="py-20 text-center">
          <Gift className="h-10 w-10 mx-auto mb-3 text-slate-300" />
          <p className="text-sm text-slate-400">Belum ada paket servis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map(pkg => {
            const calc = pkg.calculated;
            return (
              <div
                key={pkg.id}
                className="rounded-xl border bg-white p-4 flex flex-col gap-3"
                style={{ opacity: pkg.is_active ? 1 : 0.6 }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-[650] truncate"
                      style={{ color: 'var(--navy-900)' }}
                    >
                      {pkg.name}
                    </p>
                    <p
                      className="text-[18px] font-[650] tracking-[-0.02em] mt-0.5"
                      style={{
                        fontFamily: 'ui-monospace, monospace',
                        color: 'var(--navy-800)',
                      }}
                    >
                      {formatRupiah(pkg.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <AvailabilityBadge
                      available={calc.is_available}
                      reason={calc.unavailable_reason}
                    />
                    {!pkg.is_active && (
                      <span className="text-[10.5px] text-slate-400">
                        Nonaktif
                      </span>
                    )}
                  </div>
                </div>

                {/* Components */}
                <div className="space-y-1">
                  {pkg.items.map(item => {
                    const compName =
                      item.product?.name ?? item.service?.name ?? '—';
                    const compPrice = parseFloat(
                      item.product?.price_sell ?? item.service?.price ?? '0'
                    );
                    return (
                      <div
                        key={item.id}
                        className="flex justify-between text-[12px] text-slate-500"
                      >
                        <span className="truncate flex-1">
                          {item.qty > 1 && (
                            <span className="font-[600] mr-1">{item.qty}×</span>
                          )}
                          {compName}
                          {item.product && (
                            <span className="ml-1 text-[10.5px] text-slate-400">
                              (stok: {item.product.stock})
                            </span>
                          )}
                        </span>
                        <span className="ml-2 tabular-nums">
                          {formatRupiah(String(compPrice * item.qty))}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Savings info */}
                {calc.customer_savings > 0 && (
                  <p className="text-[11.5px] text-green-700 font-[550]">
                    Hemat {formatRupiah(String(calc.customer_savings))} (
                    {calc.savings_percent}%)
                  </p>
                )}

                {pkg.description && (
                  <p className="text-[11.5px] text-slate-400 line-clamp-2">
                    {pkg.description}
                  </p>
                )}

                {/* Actions */}
                {isAdmin && (
                  <div className="flex gap-1 pt-1 border-t mt-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[12px] text-slate-500 hover:text-slate-800"
                      onClick={() => openEdit(pkg)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[12px] text-red-400 hover:text-red-600"
                      onClick={() => setDeleteTarget(pkg)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Paket' : 'Tambah Paket Servis'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Nama Paket</Label>
                <Input {...register('name')} placeholder="Ganti Oli + Filter" />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Harga Jual (Rp)</Label>
                <Input type="number" min={0} {...register('price')} />
                {errors.price && (
                  <p className="text-xs text-destructive">
                    {errors.price.message}
                  </p>
                )}
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    {...register('is_active')}
                    className="rounded"
                  />
                  <span className="text-sm">Aktif</span>
                </label>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Deskripsi (opsional)</Label>
                <Input
                  {...register('description')}
                  placeholder="Keterangan paket…"
                />
              </div>
            </div>

            {/* Items builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-[600] text-slate-600 uppercase tracking-[0.04em]">
                  Komponen Paket
                </p>
                {draftItems.length === 0 && (
                  <p className="text-[11.5px] text-destructive">
                    Minimal 1 komponen
                  </p>
                )}
              </div>

              {/* Added items */}
              {draftItems.length > 0 && (
                <div className="rounded-lg border divide-y">
                  {draftItems.map(d => (
                    <div
                      key={d.tempId}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <span
                        className="text-[10.5px] px-1.5 rounded"
                        style={
                          d.type === 'product'
                            ? { background: '#eff6ff', color: '#1d4ed8' }
                            : { background: '#fdf4ff', color: '#7e22ce' }
                        }
                      >
                        {d.type === 'product' ? 'Produk' : 'Jasa'}
                      </span>
                      <span className="flex-1 text-[13px] truncate">
                        {d.name}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateDraftQty(d.tempId, d.qty - 1)}
                          className="h-6 w-6 rounded border text-slate-500 hover:bg-slate-50 text-sm leading-none"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-[13px]">
                          {d.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateDraftQty(d.tempId, d.qty + 1)}
                          className="h-6 w-6 rounded border text-slate-500 hover:bg-slate-50 text-sm leading-none"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-[12px] text-slate-500 w-24 text-right tabular-nums">
                        {formatRupiah(String(d.unitPrice * d.qty))}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDraftItem(d.tempId)}
                        className="text-slate-300 hover:text-red-500 ml-1"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="px-3 py-2 flex justify-between text-[12px] font-[600] text-slate-600 bg-slate-50">
                    <span>Total komponen</span>
                    <span className="tabular-nums">
                      {formatRupiah(
                        String(
                          draftItems.reduce(
                            (s, d) => s + d.unitPrice * d.qty,
                            0
                          )
                        )
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Add component */}
              <div className="rounded-lg border p-3 space-y-2 bg-slate-50/50">
                <div className="flex gap-1">
                  {(['product', 'service'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setItemTab(t);
                        setItemSearch('');
                      }}
                      className="px-3 h-7 rounded-lg text-[12px] font-[550] border transition-all"
                      style={
                        itemTab === t
                          ? {
                              background: 'var(--navy-800)',
                              color: '#fff',
                              borderColor: 'var(--navy-800)',
                            }
                          : {
                              background: '#fff',
                              color: '#64748b',
                              borderColor: '#e2e8f0',
                            }
                      }
                    >
                      {t === 'product' ? 'Produk' : 'Jasa'}
                    </button>
                  ))}
                </div>
                <Input
                  placeholder={
                    itemTab === 'product' ? 'Cari produk…' : 'Cari jasa…'
                  }
                  value={itemSearch}
                  onChange={e => setItemSearch(e.target.value)}
                  className="h-8 text-[13px]"
                />
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {itemTab === 'product'
                    ? products.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() =>
                            addDraftItem(
                              'product',
                              p.id,
                              p.name,
                              parseFloat(p.price_sell)
                            )
                          }
                          className="w-full flex justify-between items-center px-2 py-1.5 rounded hover:bg-white text-left border-transparent hover:border border transition-all"
                        >
                          <span className="text-[12.5px] truncate">
                            {p.name}
                          </span>
                          <span className="text-[11.5px] text-slate-400 tabular-nums ml-2 shrink-0">
                            {formatRupiah(p.price_sell)} · stok {p.stock}
                          </span>
                        </button>
                      ))
                    : filteredServices.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() =>
                            addDraftItem(
                              'service',
                              s.id,
                              s.name,
                              parseFloat(s.price)
                            )
                          }
                          className="w-full flex justify-between items-center px-2 py-1.5 rounded hover:bg-white text-left border-transparent hover:border border transition-all"
                        >
                          <span className="text-[12.5px] truncate">
                            {s.name}
                          </span>
                          <span className="text-[11.5px] text-slate-400 tabular-nums ml-2 shrink-0">
                            {formatRupiah(s.price)}
                          </span>
                        </button>
                      ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
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
                disabled={isPending || draftItems.length === 0}
                style={{ background: 'var(--navy-800)' }}
                className="text-white hover:opacity-90"
              >
                {isPending ? 'Menyimpan…' : 'Simpan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Hapus Paket"
        description={`Yakin ingin menghapus paket "${deleteTarget?.name}"? Data ini tidak dapat dikembalikan.`}
        loading={deletePkg.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deletePkg.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
