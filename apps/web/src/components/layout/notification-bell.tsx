'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, MessageCircle } from 'lucide-react';
import { useDueServiceVehicles } from '@/hooks/use-dashboard';
import { useMarkContacted } from '@/hooks/use-vehicles';
import { toWaPhone } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { DueServiceVehicle } from '@/lib/api/vehicles';

const STATUS_CONFIG = {
  OVERDUE: { label: 'Terlambat', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  DUE_TODAY: { label: 'Hari ini', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  UPCOMING: { label: 'Segera', bg: '#f0f9ff', color: '#0369a1', border: '#bae6fd' },
};

function LicensePlate({ plate }: { plate: string }) {
  return (
    <span
      className="text-[11px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
      style={{
        background: '#1a1a1a',
        color: '#e8d84a',
        fontFamily: 'ui-monospace, monospace',
        letterSpacing: '0.04em',
      }}
    >
      {plate}
    </span>
  );
}

export function NotificationBell() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contactTarget, setContactTarget] = useState<DueServiceVehicle | null>(null);
  const [notes, setNotes] = useState('');
  // Responsive panel: bottom-sheet on mobile, right-drawer on desktop.
  // Defaults to mobile (false) for SSR; resolves before the sheet is ever opened.
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const { data: dueVehicles = [], isLoading } = useDueServiceVehicles();
  const markContacted = useMarkContacted();

  const badgeCount = dueVehicles.filter(v => !v.is_contacted).length;

  const sorted = [...dueVehicles].sort((a, b) => {
    if (a.is_contacted !== b.is_contacted) return a.is_contacted ? 1 : -1;
    const order = { OVERDUE: 0, DUE_TODAY: 1, UPCOMING: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  function openContact(v: DueServiceVehicle) {
    setContactTarget(v);
    setNotes('');
  }

  function handleMarkContacted() {
    if (!contactTarget) return;
    markContacted.mutate(
      { id: contactTarget.id, notes },
      { onSuccess: () => setContactTarget(null) }
    );
  }

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="Notifikasi"
      >
        <Bell className="h-4 w-4" />
        {badgeCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-[3px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </button>

      {/* Notification sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side={isDesktop ? 'right' : 'bottom'}
          className={cn(
            'p-0 overflow-y-auto',
            isDesktop
              ? 'w-full sm:max-w-md'
              : 'rounded-t-2xl max-h-[85dvh] pb-safe'
          )}
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b text-left">
            <SheetTitle className="flex items-center gap-2">
              Pengingat Servis
              {!isLoading && badgeCount > 0 && (
                <span
                  className="inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-semibold"
                  style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
                >
                  {badgeCount} belum dihubungi
                </span>
              )}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Daftar kendaraan yang perlu dihubungi untuk servis
            </SheetDescription>
          </SheetHeader>

          <div className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="py-16 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-300" />
                <p className="text-[13px] text-slate-400">
                  Tidak ada kendaraan yang perlu dihubungi
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {sorted.map(v => {
                  const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.UPCOMING;
                  const daysText =
                    v.status === 'OVERDUE'
                      ? `${Math.abs(v.days_until_due)} hari terlambat`
                      : v.status === 'DUE_TODAY'
                      ? 'Servis hari ini'
                      : `${v.days_until_due} hari lagi`;

                  return (
                    <div
                      key={v.id}
                      className="py-3 flex items-start justify-between gap-3"
                      style={{ opacity: v.is_contacted ? 0.6 : 1 }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <LicensePlate plate={v.license_plate} />
                          <span
                            className="inline-flex items-center h-[19px] px-2 rounded-full text-[10.5px] font-semibold border"
                            style={{
                              background: cfg.bg,
                              color: cfg.color,
                              borderColor: cfg.border,
                            }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p
                          className="text-[13px] font-[550] mt-1 truncate"
                          style={{ color: 'var(--navy-900)' }}
                        >
                          {v.customer?.name ?? '—'}
                        </p>
                        <p className="text-[11.5px] text-slate-500">
                          {v.brand} {v.model} · {daysText}
                        </p>
                        {v.is_contacted && (
                          <p className="text-[11px] text-green-600 mt-0.5 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Sudah dihubungi
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0 mt-0.5">
                        {!v.is_contacted ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[12px]"
                            onClick={() => openContact(v)}
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                            Hubungi
                          </Button>
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Contact dialog */}
      <Dialog
        open={!!contactTarget}
        onOpenChange={open => !open && setContactTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hubungi Pelanggan</DialogTitle>
          </DialogHeader>

          {contactTarget && (
            <div className="space-y-4">
              <div className="rounded-[10px] bg-slate-50 border p-3">
                <div className="flex items-center gap-2">
                  <LicensePlate plate={contactTarget.license_plate} />
                  <span
                    className="text-[13px] font-[550] truncate"
                    style={{ color: 'var(--navy-900)' }}
                  >
                    {contactTarget.customer?.name}
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-500 mt-1">
                  {contactTarget.brand} {contactTarget.model}
                </p>
                {contactTarget.customer?.phone && (
                  <p className="text-[11.5px] text-slate-500">
                    {contactTarget.customer.phone}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Catatan (opsional)</Label>
                <Input
                  placeholder="Contoh: sudah konfirmasi jadwal servis"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                {contactTarget.customer?.phone && (
                  <a
                    href={`https://wa.me/${toWaPhone(contactTarget.customer.phone)}?text=${encodeURIComponent(`Halo ${contactTarget.customer.name ?? ''}, kendaraan Anda (${contactTarget.license_plate}) sudah waktunya servis. Apakah bisa dijadwalkan?`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button
                      variant="outline"
                      className="w-full h-9 text-[13px] text-green-700 border-green-300 hover:bg-green-50"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                      WhatsApp
                    </Button>
                  </a>
                )}
                <Button
                  className="flex-1 h-9 text-[13px] text-white"
                  style={{ background: 'var(--navy-800)' }}
                  disabled={markContacted.isPending}
                  onClick={handleMarkContacted}
                >
                  {markContacted.isPending ? 'Menyimpan...' : 'Tandai Dihubungi'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
