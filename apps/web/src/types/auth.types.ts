export type UserRole = 'ADMIN' | 'CASHIER';

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

// eslint-disable-next-line no-unused-vars
export type LoginFn = (token: string, user: User) => void;
// eslint-disable-next-line no-unused-vars
export type SetUserFn = (user: User) => void;

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: LoginFn;
  logout: () => void;
  setUser: SetUserFn;
}
