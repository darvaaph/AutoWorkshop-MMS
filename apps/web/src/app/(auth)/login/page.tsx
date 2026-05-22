'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { Wrench, Eye, EyeOff, ChevronRight } from 'lucide-react';

import { loginApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth.store';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type LoginFormData = z.infer<typeof loginSchema>;

const STATS = [
  { value: '1.2k+', label: 'Transaksi/hari' },
  { value: '98.7%', label: 'Uptime' },
  { value: '<300ms', label: 'Response' },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore(state => state.login);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await loginApi(data);
      login(response.data.token, response.data.user);
      document.cookie = `auth_token=${response.data.token}; path=/; max-age=86400; SameSite=Lax`;
      toast.success('Login berhasil!');
      router.push('/dashboard');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message ?? 'Login gagal'
        : 'Terjadi kesalahan, coba lagi';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const FormPanel = () => (
    <div className="flex flex-col h-full p-8 md:p-12 bg-white">
      {/* Mobile logo */}
      <div className="flex md:hidden items-center gap-2.5 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background:
              'linear-gradient(135deg, var(--navy-700), var(--navy-950))',
          }}
        >
          <Wrench className="h-5 w-5 text-white" />
        </div>
        <div className="flex flex-col leading-none">
          <span
            className="text-sm font-bold"
            style={{ color: 'var(--navy-900)' }}
          >
            AutoWorkshop MMS
          </span>
        </div>
      </div>

      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: 'var(--navy-900)' }}
        >
          Masuk ke akun Anda
        </h1>
        <p className="text-sm mt-1.5 text-slate-500">
          Gunakan kredensial yang diberikan oleh administrator.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 flex-1"
        >
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11.5px] font-[550] text-slate-500 uppercase tracking-[0.01em]">
                  Username
                </FormLabel>
                <FormControl>
                  <input
                    {...field}
                    autoComplete="username"
                    placeholder="Masukkan username"
                    className="w-full h-11 px-3 rounded-[10px] border border-slate-200 bg-white text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-700 focus:ring-3 focus:ring-slate-700/10"
                    style={
                      {
                        '--tw-ring-color': 'rgb(51 65 85 / 0.12)',
                      } as CSSProperties
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[11.5px] font-[550] text-slate-500 uppercase tracking-[0.01em]">
                  Password
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <input
                      {...field}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Masukkan password"
                      className="w-full h-11 px-3 pr-11 rounded-[10px] border border-slate-200 bg-white text-[13.5px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-700 focus:ring-3 focus:ring-slate-700/10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between text-[13px] pt-0.5">
            <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="accent-slate-800"
              />
              <span>Ingat saya selama 14 hari</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 rounded-[10px] text-[14px] font-[550] text-white flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-60"
            style={{ background: 'var(--navy-800)' }}
            onMouseOver={e => {
              if (!isLoading)
                (e.currentTarget as HTMLButtonElement).style.background =
                  'var(--navy-900)';
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'var(--navy-800)';
            }}
          >
            {isLoading ? (
              'Memproses...'
            ) : (
              <>
                Masuk
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      </Form>

      <div className="mt-auto pt-6 border-t flex justify-between text-[11.5px] text-slate-400">
        <span>© 2026 AutoWorkshop MMS</span>
        <span>Privasi · Bantuan</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#f0eee9' }}>
      {/* Left brand panel — desktop only */}
      <div
        className="hidden md:flex flex-col flex-1 p-10 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, var(--navy-800) 0%, var(--navy-950) 100%)',
        }}
      >
        {/* Decorative radial glows */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 80% 20%, rgba(240,137,58,0.18) 0%, transparent 50%), radial-gradient(circle at 10% 90%, rgba(30,45,100,0.4) 0%, transparent 50%)',
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <Wrench className="h-4 w-4 text-white" />
          </div>
          <span className="text-[15px] font-bold text-white tracking-tight">
            AutoWorkshop MMS
          </span>
        </div>

        {/* Hero copy */}
        <div className="relative flex-1 flex flex-col justify-center">
          <p
            className="text-[11px] font-semibold tracking-[0.18em] mb-4"
            style={{
              color: 'var(--orange-500)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {'// MECHANIC MANAGEMENT SYSTEM'}
          </p>
          <h2 className="text-[38px] font-bold leading-[1.05] tracking-[-0.03em] mb-4 text-white">
            Bengkel Anda,
            <br />
            <span style={{ color: 'var(--orange-500)' }}>terkendali</span>{' '}
            sepenuhnya.
          </h2>
          <p className="text-[14px] text-white/70 max-w-sm leading-relaxed">
            Kelola pelanggan, kendaraan, stok suku cadang, transaksi, hingga
            laporan keuangan — semua dalam satu tempat, di mana pun Anda berada.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-9">
            {STATS.map(s => (
              <div key={s.label}>
                <div
                  className="text-[22px] font-bold tracking-[-0.02em] text-white"
                  style={{ fontFamily: 'ui-monospace, monospace' }}
                >
                  {s.value}
                </div>
                <div className="text-[11px] text-white/55 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div
          className="relative text-[11px] text-white/40"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          v2.4.1 · build 20260522
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 md:flex-none md:w-[440px] flex flex-col">
        <FormPanel />
      </div>
    </div>
  );
}
