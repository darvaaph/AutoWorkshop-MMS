import { apiClient } from './client';

export interface ShopSettings {
  id: number;
  shop_name: string;
  shop_address: string | null;
  shop_phone: string | null;
  shop_logo_url: string | null;
  printer_width: '58mm' | '80mm';
  footer_message: string | null;
  updated_at: string;
}

export interface AppUser {
  id: number;
  username: string;
  full_name: string;
  role: 'ADMIN' | 'CASHIER';
  is_active: boolean;
}

export async function getSettingsApi(): Promise<ShopSettings> {
  const res = await apiClient.get<{ data: ShopSettings }>('/settings');
  return res.data.data;
}

export async function updateSettingsApi(
  payload: Partial<Omit<ShopSettings, 'id' | 'updated_at'>>
): Promise<ShopSettings> {
  const res = await apiClient.put<{ data: ShopSettings }>('/settings', payload);
  return res.data.data;
}

export async function uploadLogoApi(form: FormData): Promise<ShopSettings> {
  const res = await apiClient.post<{ data: ShopSettings }>(
    '/settings/upload-logo',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data;
}

export async function getUsersApi(): Promise<AppUser[]> {
  const res = await apiClient.get<{ data: AppUser[] }>('/auth/users');
  return res.data.data;
}

export async function createUserApi(payload: {
  username: string;
  password: string;
  full_name: string;
  role: 'ADMIN' | 'CASHIER';
}): Promise<AppUser> {
  const res = await apiClient.post<{ data: AppUser }>(
    '/auth/register',
    payload
  );
  return res.data.data;
}

export async function toggleUserStatusApi(
  id: number,
  is_active: boolean
): Promise<AppUser> {
  const res = await apiClient.put<{ data: AppUser }>(
    `/auth/users/${id}/status`,
    { is_active }
  );
  return res.data.data;
}
