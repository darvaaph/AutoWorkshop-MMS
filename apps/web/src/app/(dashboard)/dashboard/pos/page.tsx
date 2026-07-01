'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Plus,
  Minus,
  ShoppingCart,
  Car,
  ChevronDown,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useVehicles } from '@/hooks/use-vehicles';
import { useMechanics } from '@/hooks/use-mechanics';
import { useProducts } from '@/hooks/use-products';
import { useServices } from '@/hooks/use-services';
import { usePackages } from '@/hooks/use-packages';
import { useCreateTransaction } from '@/hooks/use-transactions';
import { useCart } from '@/hooks/use-cart';
import type { Vehicle } from '@/lib/api/vehicles';
import type { Product } from '@/lib/api/products';
import type { Service } from '@/lib/api/services';
import type { Package as PackageType } from '@/lib/api/packages';
import type {
  CreateTransactionItem,
  PaymentMethod,
} from '@/lib/api/transactions';
import { formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { CheckoutSuccess } from '@/components/pos/checkout-success';
import { VehicleModal } from '@/components/pos/vehicle-modal';
import { ItemCatalog } from '@/components/pos/item-catalog';
import { TYPE_META } from '@/components/pos/item-type-meta';

type ItemTab = 'PRODUCT' | 'SERVICE' | 'PACKAGE' | 'EXTERNAL';

const TABS: Array<{ value: ItemTab; label: string }> = [
  { value: 'PRODUCT', label: 'Produk' },
  { value: 'SERVICE', label: 'Layanan' },
  { value: 'PACKAGE', label: 'Paket' },
  { value: 'EXTERNAL', label: 'Lainnya' },
];

// Order chosen so the first row matches the mockup (Tunai · Transfer · QRIS · Debit)
const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'DEBIT', label: 'Debit' },
  { value: 'CREDIT', label: 'Kredit' },
  { value: 'OTHER', label: 'Lainnya' },
];

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
  const { cart, addToCart, updateQty, removeFromCart, clearCart, subtotal } =
    useCart();

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
      <CheckoutSuccess
        trxId={successTrxId}
        onViewTransactions={() => router.push('/dashboard/transactions')}
        onNewTransaction={() => {
          setSuccessTrxId(null);
          clearCart();
          clearVehicle();
          setDiscount('');
          setNotes('');
          setPaymentAmount('');
          setRefNumber('');
        }}
      />
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
        <ItemCatalog
          activeTab={activeTab}
          searchPlaceholder={searchPlaceholder}
          itemSearch={itemSearch}
          onSearchChange={setItemSearch}
          products={products}
          services={filteredServices}
          packages={packages}
          onAddToCart={addToCart}
          extName={extName}
          extPrice={extPrice}
          onExtNameChange={setExtName}
          onExtPriceChange={setExtPrice}
          onAddExternal={addExternal}
        />

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
      <VehicleModal
        open={vehicleModalOpen}
        onOpenChange={setVehicleModalOpen}
        vehicles={vehicles}
        isLoading={vehiclesLoading}
        onSelect={selectVehicle}
        onWalkIn={() => {
          clearVehicle();
          setVehicleModalOpen(false);
        }}
      />
    </div>
  );
}
