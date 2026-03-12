import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ──────────────────────────────────────────────

export interface LoginPayload {
  username: string;
  password: string;
}

export interface User {
  id: number;
  username: string;
  role: "ADMIN" | "CASHIER";
  is_active: boolean;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<AuthResponse>("/auth/login", data),

  getMe: () =>
    api.get<{ success: boolean; data: User }>("/auth/me"),

  logout: () =>
    api.post("/auth/logout"),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.put("/auth/change-password", data),

  register: (data: { username: string; password: string; role: string }) =>
    api.post("/auth/register", data),

  getUsers: () =>
    api.get("/auth/users"),

  updateUserStatus: (id: number, data: { is_active: boolean }) =>
    api.put(`/auth/users/${id}/status`, data),
};

// ─── Dashboard / Reports API ──────────────────────────────

export const reportsApi = {
  getDashboard: () =>
    api.get("/reports/dashboard"),

  getFinancial: (params?: { start_date?: string; end_date?: string }) =>
    api.get("/reports/financial", { params }),

  getInventory: () =>
    api.get("/reports/inventory"),

  getSales: (params?: { start_date?: string; end_date?: string; group_by?: string }) =>
    api.get("/reports/sales", { params }),
};

// ─── Customers API ────────────────────────────────────────

export const customersApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/customers", { params }),

  getById: (id: number) =>
    api.get(`/customers/${id}`),

  create: (data: FormData) =>
    api.post("/customers", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id: number, data: FormData) =>
    api.put(`/customers/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id: number) =>
    api.delete(`/customers/${id}`),
};

// ─── Vehicles API ─────────────────────────────────────────

export const vehiclesApi = {
  getAll: (params?: { search?: string; customer_id?: number; page?: number; limit?: number }) =>
    api.get("/vehicles", { params }),

  getById: (id: number) =>
    api.get(`/vehicles/${id}`),

  getDueService: () =>
    api.get("/vehicles/due-service"),

  create: (data: FormData) =>
    api.post("/vehicles", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id: number, data: FormData) =>
    api.put(`/vehicles/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id: number) =>
    api.delete(`/vehicles/${id}`),

  markContacted: (id: number) =>
    api.post(`/vehicles/${id}/mark-contacted`),

  resetReminder: (id: number) =>
    api.post(`/vehicles/${id}/reset-reminder`),
};

// ─── Products API ─────────────────────────────────────────

export const productsApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/products", { params }),

  getById: (id: number) =>
    api.get(`/products/${id}`),

  getLowStock: () =>
    api.get("/products/low-stock"),

  create: (data: FormData) =>
    api.post("/products", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id: number, data: FormData) =>
    api.put(`/products/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id: number) =>
    api.delete(`/products/${id}`),
};

// ─── Services API ─────────────────────────────────────────

export const servicesApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/services", { params }),

  getById: (id: number) =>
    api.get(`/services/${id}`),

  create: (data: FormData) =>
    api.post("/services", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id: number, data: FormData) =>
    api.put(`/services/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id: number) =>
    api.delete(`/services/${id}`),
};

// ─── Packages API ─────────────────────────────────────────

export const packagesApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/packages", { params }),

  getById: (id: number) =>
    api.get(`/packages/${id}`),

  checkAvailability: (id: number) =>
    api.get(`/packages/${id}/check-availability`),

  create: (data: FormData) =>
    api.post("/packages", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id: number, data: FormData) =>
    api.put(`/packages/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  delete: (id: number) =>
    api.delete(`/packages/${id}`),
};

// ─── Mechanics API ────────────────────────────────────────

export const mechanicsApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get("/mechanics", { params }),

  getById: (id: number) =>
    api.get(`/mechanics/${id}`),

  getDetails: (id: number) =>
    api.get(`/mechanics/${id}/details`),

  create: (data: FormData) =>
    api.post("/mechanics", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (id: number, data: FormData) =>
    api.put(`/mechanics/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  updateDetails: (id: number, data: Record<string, string>) =>
    api.put(`/mechanics/${id}/details`, data),

  delete: (id: number) =>
    api.delete(`/mechanics/${id}`),
};

// ─── Transactions API ─────────────────────────────────────

export const transactionsApi = {
  getAll: (params?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    customer_id?: number;
    page?: number;
    limit?: number;
  }) => api.get("/transactions", { params }),

  getById: (id: number) =>
    api.get(`/transactions/${id}`),

  getPrint: (id: number) =>
    api.get(`/transactions/${id}/print`),

  create: (data: Record<string, unknown>) =>
    api.post("/transactions", data),

  pay: (id: number, data: Record<string, unknown>) =>
    api.post(`/transactions/${id}/pay`, data),

  cancel: (id: number) =>
    api.put(`/transactions/${id}/cancel`),
};

// ─── Inventory API ────────────────────────────────────────

export const inventoryApi = {
  getAll: (params?: { product_id?: number; page?: number; limit?: number }) =>
    api.get("/inventory", { params }),

  stockIn: (data: { product_id: number; quantity: number; price_buy: number; notes?: string }) =>
    api.post("/inventory/in", data),

  stockAudit: (data: { product_id: number; physical_count: number; notes?: string }) =>
    api.post("/inventory/stock-audit", data),

  bulkAudit: (data: { audits: Array<{ product_id: number; physical_count: number; notes?: string }> }) =>
    api.post("/inventory/stock-audit/bulk", data),

  getAuditHistory: (params?: { product_id?: number }) =>
    api.get("/inventory/stock-audit/history", { params }),

  getAuditReport: () =>
    api.get("/inventory/stock-audit/report"),
};

// ─── Expenses API ─────────────────────────────────────────

export const expensesApi = {
  getAll: (params?: { start_date?: string; end_date?: string; page?: number; limit?: number }) =>
    api.get("/expenses", { params }),

  getById: (id: number) =>
    api.get(`/expenses/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post("/expenses", data),

  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/expenses/${id}`, data),

  delete: (id: number) =>
    api.delete(`/expenses/${id}`),
};

// ─── Payments API ─────────────────────────────────────────

export const paymentsApi = {
  getAll: (params?: { transaction_id?: number; page?: number; limit?: number }) =>
    api.get("/payments", { params }),

  getById: (id: number) =>
    api.get(`/payments/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post("/payments", data),

  update: (id: number, data: Record<string, unknown>) =>
    api.put(`/payments/${id}`, data),

  delete: (id: number) =>
    api.delete(`/payments/${id}`),
};

// ─── Settings API ─────────────────────────────────────────

export const settingsApi = {
  get: () =>
    api.get("/settings"),

  update: (data: Record<string, unknown>) =>
    api.put("/settings", data),

  uploadLogo: (data: FormData) =>
    api.post("/settings/upload-logo", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ─── Audit Logs API ───────────────────────────────────────

export const auditLogsApi = {
  getAll: (params?: { page?: number; limit?: number }) =>
    api.get("/audit-logs", { params }),

  getById: (id: number) =>
    api.get(`/audit-logs/${id}`),
};
