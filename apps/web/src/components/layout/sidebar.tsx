'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, Wrench } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useAuthStore } from '@/store/auth.store';
import { logoutApi } from '@/lib/api/auth';
import { getNavItemsForRole, mobileNavItems } from './nav-items';

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const filteredNav = user ? getNavItemsForRole(user.role) : [];

  const sections = filteredNav.reduce<Record<string, typeof filteredNav>>(
    (acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    },
    {}
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    } finally {
      logout();
      document.cookie = 'auth_token=; max-age=0; path=/';
      toast.success('Berhasil keluar');
      router.push('/login');
    }
  };

  const initials = user?.full_name ? getInitials(user.full_name) : 'U';
  const [moreOpen, setMoreOpen] = useState(false);
  // "Lainnya" tab is active whenever the current route isn't one of the primary tabs.
  const moreActive = !mobileNavItems.some(item => isActive(item.href));

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col h-screen border-r bg-white flex-shrink-0 w-60">
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-[61px] border-b px-4 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background:
                'linear-gradient(135deg, var(--navy-700), var(--navy-950))',
            }}
          >
            <Wrench className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span
              className="text-[13.5px] font-bold tracking-tight"
              style={{ color: 'var(--navy-900)' }}
            >
              AutoWorkshop
            </span>
            <span
              className="text-[9px] font-semibold tracking-[0.14em]"
              style={{ color: 'var(--navy-500)', marginTop: 2 }}
            >
              MMS
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0">
          {Object.entries(sections).map(([section, items], sectionIdx) => (
            <div
              key={section}
              className={cn('pb-3', sectionIdx > 0 && 'border-t pt-3')}
            >
              <p
                className="px-2.5 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em]"
                style={{ color: 'hsl(215.4 16.3% 60%)' }}
              >
                {section}
              </p>
              <div className="space-y-0.5">
                {items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13.5px] transition-colors relative',
                        active
                          ? 'font-[550]'
                          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      )}
                      style={
                        active
                          ? {
                              background: 'var(--navy-50)',
                              color: 'var(--navy-900)',
                            }
                          : undefined
                      }
                    >
                      {active && (
                        <span
                          className="absolute left-[-12px] top-2 bottom-2 w-[3px] rounded-r"
                          style={{ background: 'var(--orange-500)' }}
                        />
                      )}
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="flex-shrink-0 p-3">
          <div
            className="flex items-center gap-2.5 p-2.5 rounded-xl border"
            style={{ background: 'var(--navy-50)' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
              style={{
                background:
                  'linear-gradient(135deg, var(--navy-700), var(--navy-950))',
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[12.5px] font-semibold truncate"
                style={{ color: 'var(--navy-900)' }}
              >
                {user?.full_name ?? '-'}
              </p>
              <p
                className="text-[10.5px] truncate"
                style={{ color: 'var(--navy-500)' }}
              >
                {user?.role === 'ADMIN' ? 'Admin' : 'Kasir'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-7 h-7 rounded-lg hover:bg-white/60 transition-colors flex-shrink-0"
              title="Keluar"
              style={{ color: 'var(--navy-700)' }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white z-50 shadow-lg pb-safe">
        <div className="flex h-[68px]">
          {mobileNavItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const isPos = item.href === '/dashboard/pos';

            if (isPos) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center justify-center flex-1 gap-0.5"
                >
                  <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center -mt-3.5"
                    style={{
                      background: 'var(--orange-500)',
                      boxShadow: '0 4px 14px rgba(240,137,58,0.4)',
                    }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span
                    className="text-[10px] font-[550] mt-0.5"
                    style={{ color: 'var(--orange-600)' }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors',
                  active ? 'text-slate-900' : 'text-slate-400'
                )}
              >
                <Icon
                  className="h-5 w-5"
                  style={active ? { color: 'var(--orange-500)' } : undefined}
                />
                <span className="text-[10px] font-[550] leading-none truncate max-w-[60px] text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Lainnya — opens the full menu sheet */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors',
              moreActive ? 'text-slate-900' : 'text-slate-400'
            )}
          >
            <Menu
              className="h-5 w-5"
              style={moreActive ? { color: 'var(--orange-500)' } : undefined}
            />
            <span className="text-[10px] font-[550] leading-none">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Full-menu sheet (mobile only) */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl p-0 max-h-[80dvh] overflow-y-auto pb-safe"
        >
          <SheetHeader className="px-5 pt-5 pb-3 border-b text-left">
            <SheetTitle
              className="text-[16px]"
              style={{ color: 'var(--navy-900)' }}
            >
              Menu
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigasi seluruh halaman
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {Object.entries(sections).map(([section, items]) => (
              <div key={section}>
                <p className="px-1 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-slate-400">
                  {section}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {items.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors',
                          active
                            ? 'border-transparent'
                            : 'border-slate-100 hover:bg-slate-50'
                        )}
                        style={
                          active ? { background: 'var(--navy-50)' } : undefined
                        }
                      >
                        <Icon
                          className="h-5 w-5"
                          style={{ color: active ? 'var(--navy-800)' : '#64748b' }}
                        />
                        <span
                          className="text-[11px] font-[550] leading-tight"
                          style={{
                            color: active ? 'var(--navy-900)' : '#475569',
                          }}
                        >
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-red-100 text-red-600 text-[13px] font-[550] hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
