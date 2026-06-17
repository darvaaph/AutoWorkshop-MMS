'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Minus,
  Search,
  ShoppingCart,
  Car,
  ChevronDown,
  CheckCircle2,
  Printer,
  Package,
  Wrench,
  PackageOpen,
  Tag,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useVehicles } from '@/hooks/use-vehicles';
import { useMechanics } from '@/hooks/use-mechanics';
import { useProducts } from '@/hooks/use-products';
import { useServices } from '@/hooks/use-services';
import { usePackages } from '@/hooks/use-packages';
import { useCreateTransaction } from '@/hooks/use-transactions';
import type { Vehicle } from '@/lib/api/vehicles';
import type { Product } from '@/lib/api/products';
import type { Service } from '@/lib/api/services';
import type { Package as PackageType } from '@/lib/api/packages';
import type {
  CreateTransactionItem,
  PaymentMethod,
} from '@/lib/api/transactions';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ItemTab = 'PRODUCT' | 'SERVICE' | 'PACKAGE' | 'EXTERNAL';

interface CartItem {
  key: string;
  item_type: ItemTab;
  item_id?: number;
  item_name: string;
  base_price: number;
  qty: number;
  // Available units for a catalog PRODUCT; undefined = unlimited (SERVICE / PACKAGE / EXTERNAL).
  // Client-side cap only — the server remains the source of truth at checkout.
  stock?: number;
}

const TABS: Array<{ value: ItemTab; label: string }> = [
  { value: 'PRODUCT', label: 'Produk' },
  { value: 'SERVICE', label: 'Layanan' },
  { value: 'PACKAGE', label: 'Paket' },
  { value: 'EXTERNAL', label: 'Lainnya' },
];

const TYPE_META: Record<ItemTab, { badge: string; Icon: LucideIcon }> = {
  PRODUCT: { badge: 'PRODUK', Icon: Package },
  SERVICE: { badge: 'LAYANAN', Icon: Wrench },
  PACKAGE: { badge: 'PAKET', Icon: PackageOpen },
  EXTERNAL: { badge: 'LAINNYA', Icon: Tag },
};

// Order chosen so the first row matches the mockup (Tunai · Transfer · QRIS · Debit)
const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'DEBIT', label: 'Debit' },
  { value: 'CREDIT', label: 'Kredit' },
  { value: 'OTHER', label: 'Lainnya' },
];

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

export default function PosPage() {
  const router = useRouter();
  const orderPanelRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  // Selections
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedMechanicId, setSelectedMechanicId] = useState<number | ''>('');
  const [currentKm, setCurrentKm] = useState('');

  // Items
  const [activeTab, setActiveTab] = useState<ItemTab>('PRODUCT');
  const [itemSearch, setItemSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);

  // External item form
  const [extName, setExtName] = useState('');
  const [extPrice, setExtPrice] = useState('');

  // Payment
  const [discount, setDiscount] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [refNumber, setRefNumber] = useState('');

  // Post-success
  const [successTrxId, setSuccessTrxId] = useState<number | null>(null);

  // API
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles();
  const { data: mechanics } = useMechanics();
  const { data: productsData } = useProducts(
    activeTab === 'PRODUCT' ? { search: itemSearch || undefined } : undefined
  );
  const { data: services } = useServices();
  const { data: packagesData } = usePackages(
    activeTab === 'PACKAGE'
      ? { search: itemSearch || undefined, active_only: true }
      : undefined
  );
  const createTrx = useCreateTransaction();

  const products = productsData?.products ?? [];
  const filteredServices = services
    ? services.filter(s =>
        itemSearch
          ? s.name.toLowerCase().includes(itemSearch.toLowerCase())
          : true
      )
    : [];
  const packages = packagesData?.packages ?? [];

  const subtotal = cart.reduce(
    (sum, item) => sum + item.base_price * item.qty,
    0
  );
  const discountAmt = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  // Empty field = "uang pas" (pay full). An explicit 0 stays 0 so a partial/unpaid
  // bon sementara can be recorded. Negatives are clamped away.
  const payAmt =
    paymentAmount === '' ? total : Math.max(0, parseFloat(paymentAmount) || 0);
  const change = paymentMethod === 'CASH' ? payAmt - total : 0;

  // Hide the floating cart bar once the real "Proses Transaksi" button is on
  // screen, so the shortcut bar never covers the actual checkout button.
  // rootMargin shrinks the bottom of the viewport by ~the bar's footprint so it
  // disappears just before it would overlap.
  useEffect(() => {
    const el = submitRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setCheckoutVisible(entry.isIntersecting),
      { rootMargin: '0px 0px -160px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [successTrxId]);

  function addToCart(item: Omit<CartItem, 'key' | 'qty'>) {
    const key = `${item.item_type}-${item.item_id ?? item.item_name}`;
    const existing = cart.find(c => c.key === key);
    if (existing && existing.stock != null && existing.qty >= existing.stock) {
      toast.error(`Stok ${existing.item_name} tinggal ${existing.stock}`);
      return;
    }
    setCart(prev => {
      const ex = prev.find(c => c.key === key);
      if (ex) {
        return prev.map(c => (c.key === key ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...item, key, qty: 1 }];
    });
  }

  function updateQty(key: string, delta: number) {
    if (delta > 0) {
      const c = cart.find(x => x.key === key);
      if (c && c.stock != null && c.qty >= c.stock) {
        toast.error(`Stok ${c.item_name} tinggal ${c.stock}`);
        return;
      }
    }
    setCart(prev =>
      prev
        .map(c => (c.key === key ? { ...c, qty: c.qty + delta } : c))
        .filter(c => c.qty > 0)
    );
  }

  function removeFromCart(key: string) {
    setCart(prev => prev.filter(c => c.key !== key));
  }

  function clearCart() {
    setCart([]);
  }

  function selectVehicle(v: Vehicle) {
    setSelectedVehicle(v);
    setCurrentKm(String(v.current_km));
    setVehicleModalOpen(false);
  }

  function clearVehicle() {
    setSelectedVehicle(null);
    setCurrentKm('');
    setSelectedMechanicId('');
  }

  function addExternal() {
    if (!extName || !extPrice) return;
    addToCart({
      item_type: 'EXTERNAL',
      item_name: extName,
      base_price: parseFloat(extPrice),
    });
    setExtName('');
    setExtPrice('');
  }

  async function handleSubmit() {
    if (cart.length === 0) return;

    const items: CreateTransactionItem[] = cart.map(c => ({
      item_type: c.item_type,
      item_id: c.item_id,
      qty: c.qty,
      item_name: c.item_type === 'EXTERNAL' ? c.item_name : undefined,
      base_price: c.item_type === 'EXTERNAL' ? c.base_price : undefined,
    }));

    createTrx.mutate(
      {
        vehicle_id: selectedVehicle?.id,
        mechanic_id: selectedMechanicId || undefined,
        current_km: currentKm ? parseInt(currentKm) : undefined,
        discount_amount: discountAmt || undefined,
        notes: notes || undefined,
        items,
        initial_payment:
          payAmt > 0
            ? {
                // Record only up to the bill total; cash overpayment is change, not revenue.
                amount: Math.min(payAmt, total),
                payment_method: paymentMethod,
                reference_number: refNumber || undefined,
              }
            : undefined,
      },
      {
        onSuccess: trx => {
          setSuccessTrxId(trx.id);
        },
      }
    );
  }

  const activeMechanics = mechanics?.filter(m => m.is_active) ?? [];

  const searchPlaceholder =
    activeTab === 'PRODUCT'
      ? 'Cari produk / sparepart…'
      : activeTab === 'SERVICE'
      ? 'Cari layanan…'
      : 'Cari paket…';

  if (successTrxId !== null) {
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
            TRX-{String(successTrxId).padStart(4, '0')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => window.open(`/print/${successTrxId}`, '_blank')}
            style={{ background: 'var(--navy-800)' }}
            className="text-white hover:opacity-90"
          >
            <Printer className="h-4 w-4 mr-2" />
            Cetak Struk
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/transactions')}
          >
            Lihat Transaksi
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSuccessTrxId(null);
              setCart([]);
              clearVehicle();
              setDiscount('');
              setNotes('');
              setPaymentAmount('');
              setRefNumber('');
            }}
          >
            Transaksi Baru
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[11.5px] text-slate-400 font-[550]">
            Kasir / Point of Sale
          </p>
          <h1
            className="text-[22px] font-[650] tracking-[-0.02em] mt-0.5"
            style={{ color: 'var(--navy-900)' }}
          >
            Transaksi Baru
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-[10px] bg-slate-100 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setActiveTab(tab.value);
                setItemSearch('');
              }}
              className="px-3.5 h-8 rounded-[8px] text-[12.5px] font-[550] transition-all"
              style={
                activeTab === tab.value
                  ? { background: 'var(--navy-800)', color: '#fff' }
                  : { background: 'transparent', color: '#64748b' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">
        {/* ── Left: search + catalog ── */}
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
                  onChange={e => setItemSearch(e.target.value)}
                />
              </div>

              {/* Catalog grid */}
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(168px, 1fr))',
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
                          addToCart({
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
                  filteredServices.map((s: Service) => (
                    <ItemCard
                      key={s.id}
                      Icon={TYPE_META.SERVICE.Icon}
                      badge={TYPE_META.SERVICE.badge}
                      name={s.name}
                      price={formatRupiah(s.price)}
                      onClick={() =>
                        addToCart({
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
                          unavailable
                            ? 'Stok kurang'
                            : `${pkg.items.length} komponen`
                        }
                        metaDanger={unavailable}
                        disabled={unavailable}
                        onClick={() =>
                          addToCart({
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
                  (activeTab === 'SERVICE' &&
                    filteredServices.length === 0) ||
                  (activeTab === 'PACKAGE' && packages.length === 0)) && (
                  <div className="col-span-full py-12 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-[13px] text-slate-400">
                      Tidak ada hasil
                    </p>
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
                  onChange={e => setExtName(e.target.value)}
                  className="flex-1 h-11 px-3 rounded-[12px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
                  placeholder="Nama item (mis. jasa las, sparepart luar)"
                />
                <input
                  type="number"
                  value={extPrice}
                  onChange={e => setExtPrice(e.target.value)}
                  className="w-full sm:w-40 h-11 px-3 rounded-[12px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
                  placeholder="Harga"
                />
                <Button
                  type="button"
                  onClick={addExternal}
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

        {/* ── Right: order panel ── */}
        <div
          ref={orderPanelRef}
          className="rounded-xl border bg-white lg:sticky lg:top-4 overflow-hidden scroll-mt-4"
        >
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 h-12 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart
                className="h-4 w-4"
                style={{ color: 'var(--navy-700)' }}
              />
              <span
                className="text-[14px] font-[600]"
                style={{ color: 'var(--navy-900)' }}
              >
                Pesanan
              </span>
              {cart.length > 0 && (
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: 'var(--navy-800)' }}
                >
                  {cart.length}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-[12px] font-[550] text-red-500 hover:text-red-600 transition-colors"
              >
                Kosongkan
              </button>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* Vehicle / customer */}
            <div className="space-y-2">
              <Label className="text-[11px] text-slate-500 uppercase tracking-[0.05em]">
                Kendaraan / Pelanggan
              </Label>

              {!selectedVehicle ? (
                <button
                  type="button"
                  onClick={() => setVehicleModalOpen(true)}
                  className="w-full flex items-center justify-between rounded-[10px] border border-slate-200 px-3 h-11 text-left hover:border-slate-300 transition-colors"
                >
                  <span className="flex items-center gap-2 text-[13px] text-slate-500">
                    <Car className="h-4 w-4 text-slate-400" />
                    Walk-in (Tanpa Kendaraan)
                  </span>
                  <span
                    className="text-[12px] font-[600]"
                    style={{ color: 'var(--navy-800)' }}
                  >
                    Pilih
                  </span>
                </button>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 rounded-[10px] bg-slate-50 border px-3 py-2.5">
                    <span
                      className="text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{
                        background: '#1a1a1a',
                        color: '#e8d84a',
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {selectedVehicle.license_plate}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12.5px] font-[550] truncate"
                        style={{ color: 'var(--navy-900)' }}
                      >
                        {selectedVehicle.customer?.name ?? 'Tanpa pelanggan'}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {selectedVehicle.brand} {selectedVehicle.model}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVehicleModalOpen(true)}
                      className="text-[11.5px] font-[550] text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0 px-1"
                      title="Ganti kendaraan"
                    >
                      Ganti
                    </button>
                    <button
                      type="button"
                      onClick={clearVehicle}
                      className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                      title="Ganti ke walk-in"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Mechanic + KM only when a vehicle is selected */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <select
                        value={selectedMechanicId}
                        onChange={e =>
                          setSelectedMechanicId(
                            e.target.value ? Number(e.target.value) : ''
                          )
                        }
                        className="w-full h-10 appearance-none border border-slate-200 rounded-[10px] px-3 pr-8 text-[12.5px] bg-white outline-none focus:border-slate-700"
                      >
                        <option value="">Mekanik…</option>
                        {activeMechanics.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                      <Car className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="number"
                        value={currentKm}
                        onChange={e => setCurrentKm(e.target.value)}
                        className="w-full h-10 pl-8 pr-2 rounded-[10px] border border-slate-200 text-[12.5px] text-right outline-none focus:border-slate-700"
                        placeholder="KM"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Cart items */}
            {cart.length === 0 ? (
              <div className="py-10 text-center border-y">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-[12.5px] text-slate-400">
                  Keranjang kosong
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Pilih item dari katalog
                </p>
              </div>
            ) : (
              <div className="border-y divide-y max-h-[38vh] overflow-y-auto -mx-1 px-1">
                {cart.map(item => (
                  <div key={item.key} className="flex items-center gap-2 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12.5px] font-[550] truncate"
                        style={{ color: 'var(--navy-900)' }}
                      >
                        {item.item_name}
                      </p>
                      <p className="text-[10.5px] text-slate-400">
                        <span className="uppercase tracking-[0.04em]">
                          {TYPE_META[item.item_type].badge}
                        </span>{' '}
                        ·{' '}
                        <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                          {formatRupiah(item.base_price)}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className="text-[12.5px] font-[600]"
                        style={{
                          fontFamily: 'ui-monospace, monospace',
                          color: 'var(--navy-900)',
                        }}
                      >
                        {formatRupiah(item.base_price * item.qty)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            item.qty === 1
                              ? removeFromCart(item.key)
                              : updateQty(item.key, -1)
                          }
                          className="w-8 h-8 rounded-md border flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span
                          className="w-8 text-center text-[12.5px] font-[550]"
                          style={{ color: 'var(--navy-900)' }}
                        >
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.key, 1)}
                          disabled={item.stock != null && item.qty >= item.stock}
                          className="w-8 h-8 rounded-md border flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500 uppercase tracking-[0.05em]">
                Catatan
              </Label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-[10px] border border-slate-200 text-[13px] outline-none focus:border-slate-700 resize-none"
                placeholder="cth. Service berkala 50.000 KM"
              />
            </div>

            {/* Payment method */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500 uppercase tracking-[0.05em]">
                Metode Bayar
              </Label>
              <div className="grid grid-cols-4 gap-1.5">
                {PAYMENT_METHODS.map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className="h-9 rounded-[8px] text-[12px] font-[550] border transition-all"
                    style={
                      paymentMethod === m.value
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
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment amount */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-slate-500 uppercase tracking-[0.05em]">
                Jumlah Bayar
              </Label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-[10px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
                  placeholder={String(total)}
                />
                <button
                  type="button"
                  onClick={() => setPaymentAmount(String(total))}
                  disabled={total <= 0}
                  className="px-3 h-10 rounded-[10px] border text-[12.5px] font-[550] text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  Uang Pas
                </button>
              </div>
            </div>

            {paymentMethod !== 'CASH' && (
              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-500 uppercase tracking-[0.05em]">
                  No. Referensi
                </Label>
                <input
                  value={refNumber}
                  onChange={e => setRefNumber(e.target.value)}
                  className="w-full h-10 px-3 rounded-[10px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
                  placeholder="Opsional"
                />
              </div>
            )}

            {paymentMethod === 'CASH' && change > 0 && (
              <div className="rounded-[10px] bg-green-50 border border-green-200 px-3 py-2 flex justify-between">
                <span className="text-[12.5px] text-green-700 font-[550]">
                  Kembalian
                </span>
                <span
                  className="text-[12.5px] font-[650] text-green-700"
                  style={{ fontFamily: 'ui-monospace, monospace' }}
                >
                  {formatRupiah(change)}
                </span>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1.5 text-[12.5px] border-t pt-3">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                  {formatRupiah(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-600 flex-shrink-0">Diskon</span>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="w-28 h-8 px-2 rounded-[8px] border border-slate-200 text-[12.5px] text-right outline-none focus:border-slate-700"
                  placeholder="0"
                />
              </div>
              <div
                className="flex justify-between font-[650] text-[15px] pt-1.5 border-t"
                style={{ color: 'var(--navy-900)' }}
              >
                <span>Total</span>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                  {formatRupiah(total)}
                </span>
              </div>
            </div>

            {/* Submit */}
            <Button
              ref={submitRef}
              className="w-full h-12 text-[14px] font-[600] text-white"
              style={{ background: 'var(--navy-900)' }}
              disabled={cart.length === 0 || createTrx.isPending}
              onClick={handleSubmit}
            >
              {createTrx.isPending ? (
                'Memproses…'
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Proses Transaksi · {formatRupiah(total)}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile floating cart bar — jumps to the order panel / checkout.
          Hidden on lg+ where the panel is already visible beside the catalog,
          and once the real checkout button is on screen (no overlap). */}
      {cart.length > 0 && !checkoutVisible && (
        <button
          type="button"
          onClick={() =>
            orderPanelRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            })
          }
          className="lg:hidden fixed left-4 right-4 bottom-nav-offset z-40 flex items-center justify-between h-14 px-4 rounded-[14px] text-white shadow-xl active:scale-[0.99] transition-transform"
          style={{ background: 'var(--navy-900)' }}
        >
          <span className="flex items-center gap-2 text-[13px] font-[600]">
            <ShoppingCart className="h-4 w-4" />
            {cart.reduce((n, c) => n + c.qty, 0)} item · Lihat Pesanan
          </span>
          <span
            className="text-[14px] font-[650]"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            {formatRupiah(total)}
          </span>
        </button>
      )}

      {/* Vehicle picker modal */}
      <Dialog open={vehicleModalOpen} onOpenChange={setVehicleModalOpen}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <DialogTitle
              className="text-[16px]"
              style={{ color: 'var(--navy-900)' }}
            >
              Pilih Kendaraan
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[55vh] overflow-y-auto divide-y">
            {vehiclesLoading ? (
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
                  onClick={() => selectVehicle(v)}
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
              onClick={() => {
                clearVehicle();
                setVehicleModalOpen(false);
              }}
            >
              <Car className="h-4 w-4 mr-2 text-slate-400" />
              Walk-in / tanpa kendaraan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
