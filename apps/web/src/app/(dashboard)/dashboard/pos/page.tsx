'use client';

import { useState, useCallback } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  Car,
  ChevronDown,
  CheckCircle2,
  Printer,
} from 'lucide-react';
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
import type { Package } from '@/lib/api/packages';
import type {
  CreateTransactionItem,
  PaymentMethod,
} from '@/lib/api/transactions';
import { formatRupiah } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type ItemTab = 'PRODUCT' | 'SERVICE' | 'PACKAGE' | 'EXTERNAL';

interface CartItem {
  key: string;
  item_type: 'PRODUCT' | 'SERVICE' | 'PACKAGE' | 'EXTERNAL';
  item_id?: number;
  item_name: string;
  base_price: number;
  qty: number;
}

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Tunai' },
  { value: 'DEBIT', label: 'Debit' },
  { value: 'CREDIT', label: 'Kredit' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'QRIS', label: 'QRIS' },
  { value: 'OTHER', label: 'Lainnya' },
];

export default function PosPage() {
  const router = useRouter();

  // Selections
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleDropOpen, setVehicleDropOpen] = useState(false);
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
  const { data: vehicles, isLoading: vehiclesLoading } = useVehicles(
    vehicleSearch || undefined
  );
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
  const payAmt = parseFloat(paymentAmount) || total;
  const change = paymentMethod === 'CASH' ? payAmt - total : 0;

  const addToCart = useCallback((item: Omit<CartItem, 'key' | 'qty'>) => {
    const key = `${item.item_type}-${item.item_id ?? item.item_name}`;
    setCart(prev => {
      const existing = prev.find(c => c.key === key);
      if (existing) {
        return prev.map(c => (c.key === key ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...item, key, qty: 1 }];
    });
  }, []);

  function updateQty(key: string, delta: number) {
    setCart(prev =>
      prev
        .map(c => (c.key === key ? { ...c, qty: c.qty + delta } : c))
        .filter(c => c.qty > 0)
    );
  }

  function removeFromCart(key: string) {
    setCart(prev => prev.filter(c => c.key !== key));
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
                amount: payAmt,
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
              setSelectedVehicle(null);
              setSelectedMechanicId('');
              setCurrentKm('');
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
    <div className="space-y-5">
      <div>
        <h1
          className="text-[22px] font-[650] tracking-[-0.02em]"
          style={{ color: 'var(--navy-900)' }}
        >
          Transaksi Baru
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Buat servis atau penjualan
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
        {/* ── Left: vehicle + items ── */}
        <div className="space-y-4">
          {/* Vehicle & mechanic */}
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]">
              Kendaraan &amp; Mekanik
            </p>

            {/* Vehicle search */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  className="w-full h-10 pl-9 pr-3 rounded-[10px] border border-slate-200 bg-white text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-700/10"
                  placeholder="Cari kendaraan (plat, merk, model, pemilik)…"
                  value={vehicleSearch}
                  onChange={e => {
                    setVehicleSearch(e.target.value);
                    setVehicleDropOpen(true);
                    if (!e.target.value) {
                      setSelectedVehicle(null);
                    }
                  }}
                  onFocus={() => setVehicleDropOpen(true)}
                />
              </div>

              {vehicleDropOpen && vehicleSearch && (
                <div className="absolute z-20 mt-1 w-full rounded-[10px] border bg-white shadow-lg max-h-56 overflow-y-auto">
                  {vehiclesLoading ? (
                    <p className="px-4 py-3 text-[13px] text-slate-400">
                      Mencari…
                    </p>
                  ) : !vehicles || vehicles.length === 0 ? (
                    <p className="px-4 py-3 text-[13px] text-slate-400">
                      Tidak ada kendaraan ditemukan
                    </p>
                  ) : (
                    vehicles.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                        onClick={() => {
                          setSelectedVehicle(v);
                          setVehicleSearch(
                            `${v.license_plate} — ${v.brand} ${v.model}`
                          );
                          setCurrentKm(String(v.current_km));
                          setVehicleDropOpen(false);
                        }}
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
                        <span>
                          <p
                            className="text-[13px] font-[550]"
                            style={{ color: 'var(--navy-900)' }}
                          >
                            {v.brand} {v.model}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {v.customer?.name}
                          </p>
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedVehicle && (
              <div className="flex items-center gap-3 rounded-[10px] bg-slate-50 border px-3 py-2.5">
                <Car className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[12.5px] font-[550] truncate"
                    style={{ color: 'var(--navy-900)' }}
                  >
                    {selectedVehicle.customer?.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {selectedVehicle.brand} {selectedVehicle.model}
                  </p>
                </div>
                <input
                  type="number"
                  value={currentKm}
                  onChange={e => setCurrentKm(e.target.value)}
                  className="w-28 h-8 px-2 rounded-[8px] border border-slate-200 text-[12.5px] text-right outline-none focus:border-slate-700"
                  placeholder="KM saat ini"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11.5px] text-slate-500 uppercase tracking-[0.04em]">
                  Mekanik
                </Label>
                <div className="relative">
                  <select
                    value={selectedMechanicId}
                    onChange={e =>
                      setSelectedMechanicId(
                        e.target.value ? Number(e.target.value) : ''
                      )
                    }
                    className="w-full h-10 appearance-none border border-slate-200 rounded-[10px] px-3 pr-8 text-[13.5px] bg-white outline-none focus:border-slate-700"
                  >
                    <option value="">Pilih mekanik (opsional)</option>
                    {activeMechanics.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11.5px] text-slate-500 uppercase tracking-[0.04em]">
                  Catatan
                </Label>
                <input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full h-10 px-3 rounded-[10px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
                  placeholder="Keluhan, instruksi…"
                />
              </div>
            </div>
          </div>

          {/* Item selector */}
          <div className="rounded-xl border bg-white p-4 space-y-3">
            <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]">
              Tambah Item
            </p>

            {/* Tabs */}
            <div className="flex gap-1 flex-wrap">
              {(['PRODUCT', 'SERVICE', 'PACKAGE', 'EXTERNAL'] as ItemTab[]).map(
                tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      setItemSearch('');
                    }}
                    className="px-3 h-8 rounded-[8px] text-[12.5px] font-[550] transition-all"
                    style={
                      activeTab === tab
                        ? { background: 'var(--navy-800)', color: '#fff' }
                        : { background: '#f1f5f9', color: '#64748b' }
                    }
                  >
                    {tab === 'PRODUCT'
                      ? 'Produk'
                      : tab === 'SERVICE'
                      ? 'Jasa'
                      : tab === 'PACKAGE'
                      ? 'Paket'
                      : 'Lainnya'}
                  </button>
                )
              )}
            </div>

            {activeTab !== 'EXTERNAL' ? (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-9 h-9"
                    placeholder={
                      activeTab === 'PRODUCT'
                        ? 'Cari produk…'
                        : activeTab === 'SERVICE'
                        ? 'Cari jasa…'
                        : 'Cari paket…'
                    }
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                  />
                </div>

                <div className="max-h-52 overflow-y-auto divide-y rounded-[10px] border">
                  {activeTab === 'PRODUCT' &&
                    products.map((p: Product) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
                        onClick={() =>
                          addToCart({
                            item_type: 'PRODUCT',
                            item_id: p.id,
                            item_name: p.name,
                            base_price: parseFloat(p.price_sell),
                          })
                        }
                      >
                        <div>
                          <p className="text-[13px] font-[500]">{p.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {p.sku} · stok {p.stock}
                          </p>
                        </div>
                        <span
                          className="text-[12.5px] font-[600] flex-shrink-0 ml-3"
                          style={{
                            fontFamily: 'ui-monospace, monospace',
                            color: 'var(--navy-900)',
                          }}
                        >
                          {formatRupiah(p.price_sell)}
                        </span>
                      </button>
                    ))}

                  {activeTab === 'SERVICE' &&
                    filteredServices.map((s: Service) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left transition-colors"
                        onClick={() =>
                          addToCart({
                            item_type: 'SERVICE',
                            item_id: s.id,
                            item_name: s.name,
                            base_price: parseFloat(s.price),
                          })
                        }
                      >
                        <p className="text-[13px] font-[500]">{s.name}</p>
                        <span
                          className="text-[12.5px] font-[600] flex-shrink-0 ml-3"
                          style={{
                            fontFamily: 'ui-monospace, monospace',
                            color: 'var(--navy-900)',
                          }}
                        >
                          {formatRupiah(s.price)}
                        </span>
                      </button>
                    ))}

                  {activeTab === 'PACKAGE' &&
                    packages.map((pkg: Package) => (
                      <button
                        key={pkg.id}
                        type="button"
                        disabled={!pkg.calculated.is_available}
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() =>
                          addToCart({
                            item_type: 'PACKAGE',
                            item_id: pkg.id,
                            item_name: pkg.name,
                            base_price: parseFloat(pkg.price),
                          })
                        }
                      >
                        <div>
                          <p className="text-[13px] font-[500]">{pkg.name}</p>
                          <p className="text-[11px] text-slate-400">
                            {pkg.items.length} komponen
                            {!pkg.calculated.is_available && (
                              <span className="text-red-500 ml-1">
                                · Stok kurang
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className="text-[12.5px] font-[600] flex-shrink-0 ml-3"
                          style={{
                            fontFamily: 'ui-monospace, monospace',
                            color: 'var(--navy-900)',
                          }}
                        >
                          {formatRupiah(pkg.price)}
                        </span>
                      </button>
                    ))}

                  {(activeTab === 'PRODUCT' && products.length === 0) ||
                  (activeTab === 'SERVICE' && filteredServices.length === 0) ||
                  (activeTab === 'PACKAGE' && packages.length === 0) ? (
                    <p className="px-3 py-4 text-[13px] text-slate-400 text-center">
                      Tidak ada hasil
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <input
                  value={extName}
                  onChange={e => setExtName(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-[10px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
                  placeholder="Nama item"
                />
                <input
                  type="number"
                  value={extPrice}
                  onChange={e => setExtPrice(e.target.value)}
                  className="w-32 h-10 px-3 rounded-[10px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
                  placeholder="Harga"
                />
                <Button
                  type="button"
                  onClick={addExternal}
                  style={{ background: 'var(--navy-800)' }}
                  className="text-white hover:opacity-90 flex-shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="rounded-xl border bg-white overflow-hidden">
              <div
                className="px-4 py-2.5 border-b text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]"
                style={{ background: '#fafafa' }}
              >
                Keranjang ({cart.length} item)
              </div>
              <div className="divide-y">
                {cart.map(item => (
                  <div
                    key={item.key}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] font-[550] truncate"
                        style={{ color: 'var(--navy-900)' }}
                      >
                        {item.item_name}
                      </p>
                      <p
                        className="text-[11.5px] text-slate-400"
                        style={{ fontFamily: 'ui-monospace, monospace' }}
                      >
                        {formatRupiah(String(item.base_price))} × {item.qty} ={' '}
                        {formatRupiah(String(item.base_price * item.qty))}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(item.key, -1)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span
                        className="w-6 text-center text-[13px] font-[550]"
                        style={{ color: 'var(--navy-900)' }}
                      >
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.key, 1)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.key)}
                      className="text-red-400 hover:text-red-600 transition-colors ml-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: summary + payment ── */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-4 space-y-3 lg:sticky lg:top-4">
            <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em]">
              Ringkasan &amp; Pembayaran
            </p>

            {cart.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-[12.5px] text-slate-400">Keranjang kosong</p>
              </div>
            ) : (
              <>
                {/* Subtotal */}
                <div className="space-y-1.5 text-[12.5px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                      {formatRupiah(String(subtotal))}
                    </span>
                  </div>

                  {/* Discount */}
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
                      {formatRupiah(String(total))}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  {/* Payment method */}
                  <div className="space-y-1">
                    <Label className="text-[11.5px] text-slate-500 uppercase tracking-[0.04em]">
                      Metode Bayar
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {PAYMENT_METHODS.map(m => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() => setPaymentMethod(m.value)}
                          className="h-8 rounded-[8px] text-[12px] font-[550] border transition-all"
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
                  <div className="space-y-1">
                    <Label className="text-[11.5px] text-slate-500 uppercase tracking-[0.04em]">
                      Jumlah Bayar
                    </Label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full h-10 px-3 rounded-[10px] border border-slate-200 text-[13.5px] outline-none focus:border-slate-700"
                      placeholder={String(total)}
                    />
                  </div>

                  {paymentMethod !== 'CASH' && (
                    <div className="space-y-1">
                      <Label className="text-[11.5px] text-slate-500 uppercase tracking-[0.04em]">
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
                        {formatRupiah(String(change))}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  className="w-full h-11 text-[14px] font-[550] text-white"
                  style={{ background: 'var(--orange-500)' }}
                  disabled={cart.length === 0 || createTrx.isPending}
                  onClick={handleSubmit}
                >
                  {createTrx.isPending
                    ? 'Memproses…'
                    : `Proses Transaksi · ${formatRupiah(String(total))}`}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
