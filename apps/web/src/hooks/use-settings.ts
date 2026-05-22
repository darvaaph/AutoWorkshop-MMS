import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  createUserApi,
  getSettingsApi,
  getUsersApi,
  toggleUserStatusApi,
  updateSettingsApi,
  uploadLogoApi,
  type ShopSettings,
} from '@/lib/api/settings';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: getSettingsApi,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Omit<ShopSettings, 'id' | 'updated_at'>>) =>
      updateSettingsApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Pengaturan berhasil disimpan');
    },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });
}

export function useUploadLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form: FormData) => uploadLogoApi(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Logo berhasil diunggah');
    },
    onError: () => toast.error('Gagal mengunggah logo'),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsersApi,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      username: string;
      password: string;
      full_name: string;
      role: 'ADMIN' | 'CASHIER';
    }) => createUserApi(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Pengguna berhasil ditambahkan');
    },
    onError: () => toast.error('Gagal menambahkan pengguna'),
  });
}

export function useToggleUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      toggleUserStatusApi(id, is_active),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Status pengguna diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui status pengguna'),
  });
}
