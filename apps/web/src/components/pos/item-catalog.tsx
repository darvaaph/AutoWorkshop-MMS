'use client';

import { Search, Package, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Product } from '@/lib/api/products';
import type { Service } from '@/lib/api/services';
import type { Package as PackageType } from '@/lib/api/packages';
import type { ItemType } from '@/lib/api/transactions';
import type { CartItem } from '@/hooks/use-cart';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TYPE_META } from './item-type-meta';

function ItemCard({
  Icon,
  badge,
  name,
  price,
  meta,
  metaDanger,
  disabled,
  onClick,
}: {
  Icon: LucideIcon;
  badge: string;
  name: string;
  price: string;
  meta?: string;
  metaDanger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group text-left rounded-xl border bg-white p-3 flex flex-col gap-2 transition-all hover:border-slate-300 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-slate-200"
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--navy-50)' }}
        >
          <Icon className="h-[18px] w-[18px]" style={{ color: 'var(--navy-700)' }} />
        </div>
        <span className="text-[9.5px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded text-slate-400 bg-slate-100">
          {badge}
        </span>
      </div>
      <p
        className="text-[13px] font-[550] leading-tight overflow-hidden [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] min-h-[34px]"
        style={{ color: 'var(--navy-900)' }}
      >
        {name}
      </p>
      <div className="flex items-end justify-between gap-2 mt-auto">
        <span
          className="text-[13.5px] font-[650]"
          style={{
            fontFamily: 'ui-monospace, monospace',
            color: 'var(--navy-900)',
          }}
        >
          {price}
        </span>
        {meta && (
          <span
            className={cn(
              'text-[10.5px] flex-shrink-0',
              metaDanger ? 'text-orange-600 font-[550]' : 'text-slate-400'
            )}
          >
            {meta}
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * Left column of the POS screen: catalog search + item grid for the active tab
 * (PRODUCT/SERVICE/PACKAGE), or the custom/non-catalog (EXTERNAL) item form.
 */
export function ItemCatalog({
  activeTab,
  searchPlaceholder,
  itemSearch,
  onSearchChange,
  products,
  services,
  packages,
  onAddToCart,
  extName,
  extPrice,
  onExtNameChange,
  onExtPriceChange,
  onAddExternal,
}: {
  activeTab: ItemType;
  searchPlaceholder: string;
  itemSearch: string;
  onSearchChange: (value: string) => void;
  products: Product[];
  services: Service[];
  packages: PackageType[];
  onAddToCart: (item: Omit<CartItem, 'key' | 'qty'>) => void;
  extName: string;
  extPrice: string;
  onExtNameChange: (value: string) => void;
  onExtPriceChange: (value: string) => void;
  onAddExternal: () => void;
}) {
  return (
    <div className="space-y-4">
      {activeTab !== 'EXTERNAL' ? (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-10 h-11 rounded-[12px] text-[13.5px]"
              placeholder={searchPlaceholder}
              value={itemSearch}
              onChange={e => onSearchChange(e.target.value)}
            />
          </div>

          {/* Catalog grid */}
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))',
            }}
          >
            {activeTab === 'PRODUCT' &&
              products.map((p: Product) => {
                const out = p.stock <= 0;
                return (
                  <ItemCard
                    key={p.id}
                    Icon={TYPE_META.PRODUCT.Icon}
                    badge={TYPE_META.PRODUCT.badge}
                    name={p.name}
                    price={formatRupiah(p.price_sell)}
                    meta={out ? 'Stok habis' : `Stok ${p.stock}`}
                    metaDanger={out}
                    disabled={out}
                    onClick={() =>
                      onAddToCart({
                        item_type: 'PRODUCT',
                        item_id: p.id,
                        item_name: p.name,
                        base_price: parseFloat(p.price_sell),
                        stock: p.stock,
                      })
                    }
                  />
                );
              })}

            {activeTab === 'SERVICE' &&
              services.map((s: Service) => (
                <ItemCard
                  key={s.id}
                  Icon={TYPE_META.SERVICE.Icon}
                  badge={TYPE_META.SERVICE.badge}
                  name={s.name}
                  price={formatRupiah(s.price)}
                  onClick={() =>
                    onAddToCart({
                      item_type: 'SERVICE',
                      item_id: s.id,
                      item_name: s.name,
                      base_price: parseFloat(s.price),
                    })
                  }
                />
              ))}

            {activeTab === 'PACKAGE' &&
              packages.map((pkg: PackageType) => {
                const unavailable = !pkg.calculated.is_available;
                return (
                  <ItemCard
                    key={pkg.id}
                    Icon={TYPE_META.PACKAGE.Icon}
                    badge={TYPE_META.PACKAGE.badge}
                    name={pkg.name}
                    price={formatRupiah(pkg.price)}
                    meta={
                      unavailable ? 'Stok kurang' : `${pkg.items.length} komponen`
                    }
                    metaDanger={unavailable}
                    disabled={unavailable}
                    onClick={() =>
                      onAddToCart({
                        item_type: 'PACKAGE',
                        item_id: pkg.id,
                        item_name: pkg.name,
                        base_price: parseFloat(pkg.price),
                      })
                    }
                  />
                );
              })}

            {((activeTab === 'PRODUCT' && products.length === 0) ||
              (activeTab === 'SERVICE' && services.length === 0) ||
              (activeTab === 'PACKAGE' && packages.length === 0)) && (
              <div className="col-span-full py-12 text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-[13px] text-slate-400">Tidak ada hasil</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* External / custom item form */
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]">
            Item Custom / Non-katalog
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={extName}
              onChange={e => onExtNameChange(e.target.value)}
              className="flex-1 h-11 px-3 rounded-[12px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
              placeholder="Nama item (mis. jasa las, sparepart luar)"
            />
            <input
              type="number"
              value={extPrice}
              onChange={e => onExtPriceChange(e.target.value)}
              className="w-full sm:w-40 h-11 px-3 rounded-[12px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
              placeholder="Harga"
            />
            <Button
              type="button"
              onClick={onAddExternal}
              disabled={!extName || !extPrice}
              style={{ background: 'var(--navy-800)' }}
              className="h-11 text-white hover:opacity-90 flex-shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah
            </Button>
          </div>
          <p className="text-[11.5px] text-slate-400">
            Item ini tidak memotong stok dan tidak terhubung ke katalog.
          </p>
        </div>
      )}
    </div>
  );
}
