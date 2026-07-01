'use client';

import { type ChangeEvent, type ReactNode, useState, useEffect } from 'react';
import { Settings, Users, Plus, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  useSettings,
  useUpdateSettings,
  useUploadLogo,
  useUsers,
  useCreateUser,
  useToggleUserStatus,
} from '@/hooks/use-settings';
import type { ShopSettings } from '@/lib/api/settings';
import { getImageUrl } from '@/lib/format';
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
import { useAuthStore } from '@/store/auth.store';

type Tab = 'shop' | 'users';

const shopSchema = z.object({
  shop_name: z.string().min(1, 'Nama bengkel wajib diisi'),
  shop_address: z.string().optional(),
  shop_phone: z.string().optional(),
  footer_message: z.string().optional(),
  printer_width: z.enum(['58mm', '80mm']),
});

const userSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter'),
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['ADMIN', 'CASHIER']),
});

type ShopForm = z.infer<typeof shopSchema>;
type UserForm = z.infer<typeof userSchema>;

export default function SettingsPage() {
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<Tab>('shop');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: users, isLoading: usersLoading } = useUsers();
  const updateSettings = useUpdateSettings();
  const uploadLogo = useUploadLogo();
  const createUser = useCreateUser();
  const toggleStatus = useToggleUserStatus();

  const {
    register: regShop,
    handleSubmit: handleShop,
    reset: resetShop,
    formState: { errors: errShop },
  } = useForm<ShopForm>({ resolver: zodResolver(shopSchema) });

  const {
    register: regUser,
    handleSubmit: handleUser,
    reset: resetUser,
    formState: { errors: errUser },
  } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'CASHIER' },
  });

  // Populate shop form when settings load
  useEffect(() => {
    if (settings) {
      resetShop({
        shop_name: settings.shop_name,
        shop_address: settings.shop_address ?? '',
        shop_phone: settings.shop_phone ?? '',
        footer_message: settings.footer_message ?? '',
        printer_width: settings.printer_width,
      });
      setLogoPreview(getImageUrl(settings.shop_logo_url));
    }
  }, [settings, resetShop]);

  function handleLogoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function onShopSubmit(values: ShopForm) {
    if (logoFile) {
      const form = new FormData();
      form.append('logo', logoFile);
      await uploadLogo.mutateAsync(form);
      setLogoFile(null);
    }
    const payload: Partial<Omit<ShopSettings, 'id' | 'updated_at'>> = {
      shop_name: values.shop_name,
      shop_address: values.shop_address || null,
      shop_phone: values.shop_phone || null,
      footer_message: values.footer_message || null,
      printer_width: values.printer_width,
    };
    updateSettings.mutate(payload);
  }

  function onUserSubmit(values: UserForm) {
    createUser.mutate(values, {
      onSuccess: () => {
        setUserDialogOpen(false);
        resetUser({ role: 'CASHIER' });
      },
    });
  }

  const TABS: Array<{ key: Tab; label: string; icon: ReactNode }> = [
    {
      key: 'shop',
      label: 'Informasi Bengkel',
      icon: <Building2 className="h-4 w-4" />,
    },
    { key: 'users', label: 'Pengguna', icon: <Users className="h-4 w-4" /> },
  ];

  const isShopSaving = updateSettings.isPending || uploadLogo.isPending;

  return (
    <div className="space-y-5">
      <div>
        <h1
          className="text-[22px] font-[650] tracking-[-0.02em]"
          style={{ color: 'var(--navy-900)' }}
        >
          Pengaturan
        </h1>
        <p className="text-[13px] text-slate-500 mt-0.5">
          Konfigurasi sistem dan pengguna
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-[12px] w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className="flex items-center gap-1.5 px-4 h-9 rounded-[10px] text-[13px] font-[550] transition-all"
            style={
              activeTab === t.key
                ? {
                    background: '#fff',
                    color: 'var(--navy-900)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }
                : { color: '#64748b' }
            }
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Shop settings tab */}
      {activeTab === 'shop' && (
        <div className="max-w-lg">
          {settingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-5">
              <p className="text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] mb-4">
                Identitas Bengkel
              </p>
              <form onSubmit={handleShop(onShopSubmit)} className="space-y-4">
                {/* Logo upload */}
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 overflow-hidden flex items-center justify-center transition-colors">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="logo"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-8 w-8 text-slate-300" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </label>
                  <div>
                    <p
                      className="text-[13px] font-[550]"
                      style={{ color: 'var(--navy-900)' }}
                    >
                      Logo Bengkel
                    </p>
                    <p className="text-[11.5px] text-slate-400 mt-0.5">
                      Klik untuk mengganti logo
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Nama Bengkel</Label>
                  <Input {...regShop('shop_name')} />
                  {errShop.shop_name && (
                    <p className="text-xs text-destructive">
                      {errShop.shop_name.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>No. Telepon</Label>
                    <Input {...regShop('shop_phone')} />
                  </div>
                  <div className="space-y-1">
                    <Label>Lebar Printer</Label>
                    <select
                      {...regShop('printer_width')}
                      className="w-full h-10 border border-input rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="58mm">58mm</option>
                      <option value="80mm">80mm</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Alamat</Label>
                  <Input {...regShop('shop_address')} />
                </div>

                <div className="space-y-1">
                  <Label>Pesan Footer Struk</Label>
                  <Input
                    {...regShop('footer_message')}
                    placeholder="Terima kasih telah mempercayai kami"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={!isAdmin || isShopSaving}
                    style={{ background: 'var(--navy-800)' }}
                    className="text-white hover:opacity-90"
                  >
                    {isShopSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                  </Button>
                </div>

                {!isAdmin && (
                  <p className="text-[12px] text-slate-400 text-center">
                    Hanya admin yang dapat mengubah pengaturan.
                  </p>
                )}
              </form>
            </div>
          )}
        </div>
      )}

      {/* Users tab */}
      {activeTab === 'users' && (
        <div className="space-y-3">
          {isAdmin && (
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  resetUser({ role: 'CASHIER' });
                  setUserDialogOpen(true);
                }}
                style={{ background: 'var(--navy-800)' }}
                className="hover:opacity-90 text-white border-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Pengguna
              </Button>
            </div>
          )}

          <div className="rounded-xl border bg-white overflow-hidden">
            <div
              className="grid text-[11.5px] font-[550] text-slate-400 uppercase tracking-[0.04em] px-4 py-2.5 border-b"
              style={{
                gridTemplateColumns: '1fr 1fr 100px 100px 100px',
                background: '#fafafa',
              }}
            >
              <div>Username</div>
              <div>Nama Lengkap</div>
              <div className="text-center">Role</div>
              <div className="text-center">Status</div>
              {isAdmin && <div />}
            </div>

            {usersLoading ? (
              <div className="divide-y">
                {[1, 2, 3].map(i => (
                  <div key={i} className="px-4 py-3">
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : !users || users.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-400">Belum ada pengguna.</p>
              </div>
            ) : (
              <div className="divide-y">
                {users.map(u => (
                  <div
                    key={u.id}
                    className="grid items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                    style={{
                      gridTemplateColumns: '1fr 1fr 100px 100px 100px',
                    }}
                  >
                    <div
                      className="text-[13px] font-[600] truncate"
                      style={{
                        fontFamily: 'ui-monospace, monospace',
                        color: 'var(--navy-900)',
                      }}
                    >
                      {u.username}
                    </div>

                    <div className="text-[13px] text-slate-700 truncate">
                      {u.full_name}
                    </div>

                    <div className="flex justify-center">
                      <span
                        className="inline-flex items-center h-[22px] px-2 rounded-full text-[11.5px] font-semibold border"
                        style={
                          u.role === 'ADMIN'
                            ? {
                                background: 'var(--navy-50)',
                                color: 'var(--navy-800)',
                                borderColor: 'var(--navy-100)',
                              }
                            : {
                                background: '#f8fafc',
                                color: '#64748b',
                                borderColor: '#e2e8f0',
                              }
                        }
                      >
                        {u.role === 'ADMIN' ? 'Admin' : 'Kasir'}
                      </span>
                    </div>

                    <div className="flex justify-center">
                      <span
                        className="inline-flex items-center h-[22px] px-2 rounded-full text-[11.5px] font-semibold border"
                        style={
                          u.is_active
                            ? {
                                background: '#f0fdf4',
                                color: '#15803d',
                                borderColor: '#bbf7d0',
                              }
                            : {
                                background: '#f8fafc',
                                color: '#94a3b8',
                                borderColor: '#e2e8f0',
                              }
                        }
                      >
                        {u.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="flex justify-end">
                        {u.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-[12px]"
                            disabled={toggleStatus.isPending}
                            onClick={() =>
                              toggleStatus.mutate({
                                id: u.id,
                                is_active: !u.is_active,
                              })
                            }
                          >
                            {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add user dialog */}
          <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Pengguna</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUser(onUserSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Username</Label>
                    <Input {...regUser('username')} autoComplete="off" />
                    {errUser.username && (
                      <p className="text-xs text-destructive">
                        {errUser.username.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <select
                      {...regUser('role')}
                      className="w-full h-10 border border-input rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="CASHIER">Kasir</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Nama Lengkap</Label>
                  <Input {...regUser('full_name')} />
                  {errUser.full_name && (
                    <p className="text-xs text-destructive">
                      {errUser.full_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    {...regUser('password')}
                    autoComplete="new-password"
                  />
                  {errUser.password && (
                    <p className="text-xs text-destructive">
                      {errUser.password.message}
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUserDialogOpen(false)}
                    disabled={createUser.isPending}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    disabled={createUser.isPending}
                    style={{ background: 'var(--navy-800)' }}
                    className="text-white hover:opacity-90"
                  >
                    {createUser.isPending ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* System info footer */}
      <div className="flex items-center gap-2 text-[11.5px] text-slate-400 pt-2">
        <Settings className="h-3.5 w-3.5" />
        <span>AutoWorkshop MMS · v2.4.1</span>
      </div>
    </div>
  );
}
