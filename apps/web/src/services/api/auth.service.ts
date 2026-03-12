import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { LoginRequest, LoginResponse, User } from '@/types/auth.types';

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      credentials
    );
    return data.data!;
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me');
    return data.data!;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};