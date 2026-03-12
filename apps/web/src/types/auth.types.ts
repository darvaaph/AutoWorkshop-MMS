export type UserRole = 'ADMIN' | 'CASHIER';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}