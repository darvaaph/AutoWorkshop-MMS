import { apiClient } from './client';

export type ExpenseCategory = 'SALARY' | 'UTILITIES' | 'PURCHASING' | 'OTHER';

export interface Expense {
  id: number;
  user_id: number;
  category: ExpenseCategory;
  description: string;
  amount: string;
  date: string;
  createdAt: string;
}

export async function getExpensesApi(params?: {
  category?: ExpenseCategory;
  date_from?: string;
  date_to?: string;
}): Promise<Expense[]> {
  const res = await apiClient.get<{ data: Expense[] }>('/expenses', { params });
  return res.data.data;
}

export async function createExpenseApi(payload: {
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
}): Promise<Expense> {
  const res = await apiClient.post<{ data: Expense }>('/expenses', payload);
  return res.data.data;
}

export async function updateExpenseApi(
  id: number,
  payload: {
    category: ExpenseCategory;
    description: string;
    amount: number;
    date: string;
  }
): Promise<Expense> {
  const res = await apiClient.put<{ data: Expense }>(
    `/expenses/${id}`,
    payload
  );
  return res.data.data;
}

export async function deleteExpenseApi(id: number): Promise<void> {
  await apiClient.delete(`/expenses/${id}`);
}
