import { apiClient } from './client';
import type { LoginRequest, LoginResponse, User } from '@/types/auth.types';

export async function loginApi(
  credentials: LoginRequest
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    '/auth/login',
    credentials
  );
  return response.data;
}

export async function getMeApi(): Promise<User> {
  const response = await apiClient.get<{ success: boolean; data: User }>(
    '/auth/me'
  );
  return response.data.data;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout');
}
