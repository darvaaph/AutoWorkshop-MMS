'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  getPrintDataApi,
  type PrintData,
  type PrintType,
} from '@/lib/api/transactions';
import { getSettingsApi, type ShopSettings } from '@/lib/api/settings';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Tunai',
  DEBIT: 'Debit',
  CREDIT: 'Kredit',
  TRANSFER: 'Transfer',
  QRIS: 'QRIS',
  OTHER: 'Lainnya',
  REFUND: 'Refund',
};

function formatRp(n: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function PrintPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const type = (searchParams.get('type') ?? 'receipt') as PrintType;

  const [data, setData] = useState<PrintData | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPrintDataApi(Number(id), type),
      getSettingsApi().catch(() => null),
    ])
      .then(([printData, shopSettings]) => {
        setData(printData);
        setSettings(shopSettings);
      })
      .catch(err => {
        setError(err?.response?.data?.message ?? 'Gagal memuat data struk.');
      });
  }, [id, type]);

  useEffect(() => {
    if (data) {
      const timer = setTimeout(() => window.print(), 400);
      return () => clearTimeout(timer);
    }
  }, [data]);

  const width = settings?.printer_width === '58mm' ? '58mm' : '80mm';

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-slate-400">
        Memuat struk…
      </div>
    );
  }

  const isWorkOrder = type === 'workorder';

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f5f5f5; font-family: 'Courier New', monospace; }
        .receipt {
          background: #fff;
          width: ${width};
          max-width: 100%;
          margin: 0 auto;
          padding: 12px 10px;
          font-size: 11px;
          line-height: 1.5;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; }
        .indent { padding-left: 8px; }
        .item-name { flex: 1; }
        .item-price { text-align: right; min-width: 70px; }
        .total-row { font-weight: bold; font-size: 13px; }
        .no-print { margin: 16px auto; width: ${width}; max-width: 100%; text-align: center; }
        .btn {
          display: inline-block;
          margin: 4px;
          padding: 8px 20px;
          border: 1px solid #333;
          border-radius: 4px;
          background: #fff;
          font-size: 12px;
          cursor: pointer;
        }
        @media print {
          body { background: #fff; }
          .no-print { display: none !important; }
          @page { margin: 0; size: ${width} auto; }
        }
      `}</style>

      <div className="no-print">
        <button className="btn" onClick={() => window.print()}>
          🖨 Cetak
        </button>
        <button className="btn" onClick={() => window.close()}>
          ✕ Tutup
        </button>
        {!isWorkOrder && (
          <button
            className="btn"
            onClick={() => window.open(`/print/${id}?type=workorder`, '_blank')}
          >
            📋 Work Order
          </button>
        )}
      </div>

      <div className="receipt">
        {/* Header */}
        <div className="center bold" style={{ fontSize: 13 }}>
          {settings?.shop_name ?? 'BENGKEL'}
        </div>
        {settings?.shop_address && (
          <div className="center" style={{ fontSize: 10 }}>
            {settings.shop_address}
          </div>
        )}
        {settings?.shop_phone && (
          <div className="center" style={{ fontSize: 10 }}>
            {settings.shop_phone}
          </div>
        )}

        <div className="divider" />

        <div className="center bold">
          {isWorkOrder ? 'WORK ORDER' : 'STRUK PEMBAYARAN'}
        </div>

        <div className="divider" />

        {/* Transaction meta */}
        <div className="row">
          <span>No.</span>
          <span className="bold">
            TRX-{String(data.transaction_id).padStart(4, '0')}
          </span>
        </div>
        <div className="row">
          <span>Tanggal</span>
          <span>{formatDateTime(data.date)}</span>
        </div>
        {data.cashier && (
          <div className="row">
            <span>Kasir</span>
            <span>{data.cashier}</span>
          </div>
        )}
        {data.mechanic && (
          <div className="row">
            <span>Mekanik</span>
            <span>{data.mechanic}</span>
          </div>
        )}

        {/* Customer & vehicle */}
        {(data.customer || data.vehicle) && (
          <>
            <div className="divider" />
            {data.customer && (
              <div className="row">
                <span>Pelanggan</span>
                <span>{data.customer.name}</span>
              </div>
            )}
            {data.customer?.phone && (
              <div className="row">
                <span>Telp</span>
                <span>{data.customer.phone}</span>
              </div>
            )}
            {data.vehicle && (
              <>
                <div className="row">
                  <span>Kendaraan</span>
                  <span className="bold">{data.vehicle.license_plate}</span>
                </div>
                <div className="row">
                  <span></span>
                  <span>
                    {data.vehicle.brand} {data.vehicle.model}
                  </span>
                </div>
                {data.vehicle.current_km && (
                  <div className="row">
                    <span>KM</span>
                    <span>
                      {data.vehicle.current_km.toLocaleString('id-ID')} km
                    </span>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <div className="divider" />

        {/* Items */}
        {data.items.map((item, i) => {
          if (item.is_component) {
            return (
              <div
                key={i}
                className="indent"
                style={{ fontSize: 10, color: '#555' }}
              >
                {item.name} x{item.qty}
              </div>
            );
          }
          return (
            <div key={i}>
              <div className="bold">{item.name}</div>
              {!item.is_header && (
                <div className="row indent">
                  <span>
                    {item.qty} x {formatRp(item.price ?? 0)}
                  </span>
                  <span className="item-price">
                    {formatRp(item.subtotal ?? 0)}
                  </span>
                </div>
              )}
            </div>
          );
        })}

        <div className="divider" />

        {/* Totals */}
        <div className="row">
          <span>Subtotal</span>
          <span>{formatRp(data.subtotal)}</span>
        </div>
        {data.discount > 0 && (
          <div className="row">
            <span>Diskon</span>
            <span>-{formatRp(data.discount)}</span>
          </div>
        )}
        <div className="row total-row">
          <span>TOTAL</span>
          <span>{formatRp(data.total)}</span>
        </div>

        {/* Payments — only on receipt */}
        {!isWorkOrder && data.payments.length > 0 && (
          <>
            <div className="divider" />
            {data.payments.map((p, i) => (
              <div key={i} className="row">
                <span>{METHOD_LABELS[p.method] ?? p.method}</span>
                <span>{formatRp(p.amount)}</span>
              </div>
            ))}
            {data.remaining > 0 && (
              <div className="row">
                <span>Sisa</span>
                <span>{formatRp(data.remaining)}</span>
              </div>
            )}
            {data.paid >= data.total && data.paid - data.total > 0 && (
              <div className="row bold">
                <span>Kembalian</span>
                <span>{formatRp(data.paid - data.total)}</span>
              </div>
            )}
          </>
        )}

        {/* Notes */}
        {data.notes && (
          <>
            <div className="divider" />
            <div style={{ fontSize: 10 }}>Catatan: {data.notes}</div>
          </>
        )}

        <div className="divider" />

        {/* Footer */}
        <div className="center" style={{ fontSize: 10 }}>
          {settings?.footer_message ?? 'Terima kasih atas kunjungan Anda!'}
        </div>
      </div>
    </>
  );
}
