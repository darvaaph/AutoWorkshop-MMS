'use client';

import { type ChangeEvent, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/use-products';
import type { Product } from '@/lib/api/products';
import { formatRupiah, getImageUrl } from '@/lib/format';
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

const productSchema = z.object({
  sku: z.string().min(1, 'SKU wajib diisi'),
  name: z.string().min(1, 'Nama produk wajib diisi'),
  category: z.string().min(1, 'Kategori wajib diisi'),
  price_buy: z.coerce.number().min(0),
  price_sell: z.coerce.number().min(0),
  stock: z.coerce.number().min(0),
  min_stock_alert: z.coerce.number().min(0),
});

type ProductForm = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data, isLoading } = useProducts({
    search: search || undefined,
    category: category || undefined,
  });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const products = data?.products ?? [];
  const categories = data?.categories ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) });

  function openCreate() {
    setEditTarget(null);
    setImageFile(null);
    setImagePreview(null);
    reset({
      sku: '',
      name: '',
      category: '',
      price_buy: 0,
      price_sell: 0,
      stock: 0,
      min_stock_alert: 5,
    });
    setDialogOpen(true);
  }

  function openEdit(p: Product) {
    setEditTarget(p);
    setImageFile(null);
    setImagePreview(getImageUrl(p.image_url));
    reset({
      sku: p.sku,
      name: p.name,
      category: p.category,
      price_buy: parseFloat(p.price_buy),
      price_sell: parseFloat(p.price_sell),
      stock: p.stock,
      min_stock_alert: p.min_stock_alert,
    });
    setDialogOpen(true);
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function onSubmit(values: ProductForm) {
    const form = new FormData();
    Object.entries(values).forEach(([k, v]) => form.append(k, String(v)));
    if (imageFile) form.append('image', imageFile);

    if (editTarget) {
      updateProduct.mutate(
        { id: editTarget.id, form },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else {
      createProduct.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  }

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[22px] font-[650] tracking-[-0.02em]"
            style={{ color: 'var(--navy-900)' }}
          >
            Produk &amp; Suku Cadang
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            {isLoading ? '…' : `${products.length} SKU`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={openCreate}
            style={{ background: 'var(--navy-800)' }}
            className="hover:opacity-90 text-white border-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* Search + category filter */}
      <div className="space-y-2.5">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-9 h-[38px]"
            placeholder="Cari SKU atau nama produk…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {categories.length > 0 && (
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="h-[38px] flex-1 sm:flex-none border border-input rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Semua Kategori</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
          <select className="h-[38px] flex-1 sm:flex-none border border-input rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring">
            <option>Semua Status</option>
            <option>Stok Normal</option>
            <option>Stok Menipis</option>
            <option>Habis</option>
          </select>
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden md:block rounded-xl border bg-white overflow-hidden">
        {/* Header */}
        <div
          className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2.5 border-b"
          style={{
            gridTemplateColumns: '130px 1fr 130px 120px 120px 140px 80px',
            background: '#fafafa',
          }}
        >
          <div>SKU</div>
          <div>Produk</div>
          <div>Kategori</div>
          <div className="text-right">Harga Beli</div>
          <div className="text-right">Harga Jual</div>
          <div className="text-center">Stok</div>
          <div />
        </div>

        {isLoading ? (
          <div className="divide-y">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">
              {search || category
                ? 'Tidak ada hasil untuk filter ini.'
                : 'Belum ada produk.'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {products.map(p => {
              const low = p.stock <= p.min_stock_alert;
              const out = p.stock === 0;
              return (
                <div
                  key={p.id}
                  className="grid items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                  style={{
                    gridTemplateColumns:
                      '130px 1fr 130px 120px 120px 140px 80px',
                  }}
                >
                  {/* SKU */}
                  <div
                    className="text-[12px] text-slate-500 truncate"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {p.sku}
                  </div>

                  {/* Product */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{
                        background:
                          'repeating-linear-gradient(135deg, #f1f5f9 0 6px, #f8fafc 6px 12px)',
                      }}
                    >
                      {p.image_url ? (
                        <img
                          src={getImageUrl(p.image_url) ?? ''}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-slate-300" />
                      )}
                    </div>
                    <span
                      className="text-[13px] font-[550] truncate"
                      style={{ color: 'var(--navy-900)' }}
                    >
                      {p.name}
                    </span>
                  </div>

                  {/* Category */}
                  <div>
                    <span
                      className="inline-flex items-center h-[22px] px-2 rounded-full text-[11.5px] font-semibold border"
                      style={{
                        background: '#f8fafc',
                        color: '#64748b',
                        borderColor: '#e2e8f0',
                      }}
                    >
                      {p.category}
                    </span>
                  </div>

                  {/* Price buy */}
                  <div
                    className="text-right text-[12.5px] text-slate-400"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    {formatRupiah(p.price_buy)}
                  </div>

                  {/* Price sell */}
                  <div
                    className="text-right text-[12.5px] font-semibold"
                    style={{
                      fontFamily: 'ui-monospace, monospace',
                      color: 'var(--navy-900)',
                    }}
                  >
                    {formatRupiah(p.price_sell)}
                  </div>

                  {/* Stock */}
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="text-[13px] font-semibold"
                      style={{
                        fontFamily: 'ui-monospace, monospace',
                        color: out
                          ? '#b91c1c'
                          : low
                          ? '#92400e'
                          : 'var(--navy-900)',
                      }}
                    >
                      {p.stock}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      min {p.min_stock_alert}
                    </span>
                    {out ? (
                      <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        Habis
                      </span>
                    ) : low ? (
                      <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Menipis
                      </span>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-700"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => setDeleteTarget(p)}
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

      {/* Cards — mobile */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border bg-white py-16 text-center">
            <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-400">
              {search || category
                ? 'Tidak ada hasil untuk filter ini.'
                : 'Belum ada produk.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {products.map(p => {
              const low = p.stock <= p.min_stock_alert;
              const out = p.stock === 0;
              return (
                <div
                  key={p.id}
                  className="rounded-xl border bg-white p-3.5 flex gap-3"
                >
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{
                      background:
                        'repeating-linear-gradient(135deg, #f1f5f9 0 6px, #f8fafc 6px 12px)',
                    }}
                  >
                    {p.image_url ? (
                      <img
                        src={getImageUrl(p.image_url) ?? ''}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package className="h-5 w-5 text-slate-300" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className="text-[13.5px] font-[550] truncate"
                        style={{ color: 'var(--navy-900)' }}
                      >
                        {p.name}
                      </span>
                      <span
                        className="text-[13px] font-semibold flex-shrink-0"
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          color: 'var(--navy-900)',
                        }}
                      >
                        {formatRupiah(p.price_sell)}
                      </span>
                    </div>

                    <div
                      className="text-[11px] text-slate-400 truncate mt-0.5"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
                      {p.sku}
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className="inline-flex items-center h-[20px] px-2 rounded-full text-[11px] font-semibold border"
                        style={{
                          background: '#f8fafc',
                          color: '#64748b',
                          borderColor: '#e2e8f0',
                        }}
                      >
                        {p.category}
                      </span>
                      <span
                        className="text-[11.5px] font-semibold"
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          color: out
                            ? '#b91c1c'
                            : low
                            ? '#92400e'
                            : '#64748b',
                        }}
                      >
                        Stok {p.stock}
                      </span>
                      {out ? (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          Habis
                        </span>
                      ) : low ? (
                        <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Menipis
                        </span>
                      ) : null}
                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-slate-700"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-600"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? 'Edit Produk' : 'Tambah Produk'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex justify-center">
              <label className="cursor-pointer">
                <div className="h-20 w-20 rounded-xl overflow-hidden flex items-center justify-center border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 transition-colors">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-slate-400" />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>SKU</Label>
                <Input {...register('sku')} />
                {errors.sku && (
                  <p className="text-xs text-destructive">
                    {errors.sku.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Kategori</Label>
                <Input {...register('category')} list="category-list" />
                <datalist id="category-list">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                {errors.category && (
                  <p className="text-xs text-destructive">
                    {errors.category.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Nama Produk</Label>
              <Input {...register('name')} />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Harga Beli</Label>
                <Input type="number" min={0} {...register('price_buy')} />
                {errors.price_buy && (
                  <p className="text-xs text-destructive">
                    {errors.price_buy.message}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Harga Jual</Label>
                <Input type="number" min={0} {...register('price_sell')} />
                {errors.price_sell && (
                  <p className="text-xs text-destructive">
                    {errors.price_sell.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Stok</Label>
                <Input type="number" min={0} {...register('stock')} />
              </div>
              <div className="space-y-1">
                <Label>Min. Stok Alert</Label>
                <Input type="number" min={0} {...register('min_stock_alert')} />
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
        title="Hapus Produk"
        description={`Yakin ingin menghapus produk "${deleteTarget?.name}"? Data ini tidak dapat dikembalikan.`}
        loading={deleteProduct.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteProduct.mutate(deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
          });
        }}
      />
    </div>
  );
}
