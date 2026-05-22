import { apiClient } from './client';

export type TransactionStatus =
  | 'PENDING'
  | 'UNPAID'
  | 'PARTIAL'
  | 'PAID'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'DEBIT'
  | 'CREDIT'
  | 'TRANSFER'
  | 'QRIS'
  | 'OTHER'
  | 'REFUND';

export type ItemType = 'PRODUCT' | 'SERVICE' | 'PACKAGE' | 'EXTERNAL';

export interface TransactionItem {
  id: number;
  transaction_id: number;
  item_type: ItemType;
  item_id: number | null;
  item_name: string;
  qty: number;
  base_price: string;
  discount_amount: string;
  sell_price: string;
  cost_price: string;
}

export interface Payment {
  id: number;
  transaction_id: number;
  user_id: number;
  amount: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  notes: string | null;
  date: string;
}

export interface Transaction {
  id: number;
  vehicle_id: number | null;
  user_id: number;
  mechanic_id: number | null;
  date: string;
  status: TransactionStatus;
  subtotal: string;
  discount_amount: string;
  total_amount: string;
  current_km: number | null;
  notes: string | null;
  items: TransactionItem[];
  payments: Payment[];
  payment_summary: {
    total_amount: number;
    total_paid: number;
    remaining: number;
  };
  vehicle?: {
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    customer?: { id: number; name: string };
  };
  mechanic?: { id: number; name: string };
  createdAt: string;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface CreateTransactionItem {
  item_type: ItemType;
  item_id?: number;
  qty: number;
  item_name?: string;
  base_price?: number;
  discount_amount?: number;
  custom_price?: number;
}

export interface CreateTransactionPayload {
  vehicle_id?: number;
  mechanic_id?: number;
  current_km?: number;
  discount_amount?: number;
  notes?: string;
  items: CreateTransactionItem[];
  initial_payment?: {
    amount: number;
    payment_method: PaymentMethod;
    reference_number?: string;
  };
}

export async function getTransactionsApi(params?: {
  status?: TransactionStatus;
  search?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}): Promise<TransactionsResponse> {
  const res = await apiClient.get<{ data: TransactionsResponse }>(
    '/transactions',
    { params }
  );
  return res.data.data;
}

export async function getTransactionApi(id: number): Promise<Transaction> {
  const res = await apiClient.get<{ data: Transaction }>(`/transactions/${id}`);
  return res.data.data;
}

export async function createTransactionApi(
  payload: CreateTransactionPayload
): Promise<Transaction> {
  const res = await apiClient.post<{ data: Transaction }>(
    '/transactions',
    payload
  );
  return res.data.data;
}

export async function addPaymentApi(
  id: number,
  payload: {
    amount: number;
    payment_method: PaymentMethod;
    reference_number?: string;
    notes?: string;
  }
): Promise<Transaction> {
  const res = await apiClient.post<{ data: Transaction }>(
    `/transactions/${id}/pay`,
    payload
  );
  return res.data.data;
}

export async function cancelTransactionApi(id: number): Promise<Transaction> {
  const res = await apiClient.put<{ data: Transaction }>(
    `/transactions/${id}/cancel`,
    {}
  );
  return res.data.data;
}
