'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Bell, Search } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/auth.store';
import { logoutApi } from '@/lib/api/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Header() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

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

  return (
    <header className="h-[61px] border-b flex items-center justify-between px-6 bg-white sticky top-0 z-40 flex-shrink-0 gap-4">
      {/* Search — desktop only */}
      <div className="relative hidden md:flex items-center w-64">
        <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          className="w-full h-9 pl-9 pr-3 rounded-[10px] border border-slate-200 bg-slate-50 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-300 focus:bg-white transition-all"
          placeholder="Cari…"
        />
      </div>

      <div className="flex-1 md:flex-none" />

      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="h-4 w-4" />
        </button>

        {/* User avatar / dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-slate-100 transition-colors">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                style={{
                  background:
                    'linear-gradient(135deg, var(--navy-700), var(--navy-950))',
                }}
              >
                {initials}
              </div>
              <span className="hidden md:block text-[13px] font-[550] text-slate-700">
                {user?.full_name?.split(' ')[0] ?? '-'}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {user?.full_name ?? '-'}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                @{user?.username}
              </p>
              <span
                className="inline-flex items-center h-5 px-2 rounded-full text-[10.5px] font-semibold border mt-1.5"
                style={{
                  background: 'var(--navy-50)',
                  color: 'var(--navy-800)',
                  borderColor: 'var(--navy-100)',
                }}
              >
                {user?.role === 'ADMIN' ? 'Administrator' : 'Kasir'}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
