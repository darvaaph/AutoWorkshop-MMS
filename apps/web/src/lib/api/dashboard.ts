import { apiClient } from './client';

export interface DashboardData {
  today: { sales: number; transactions: number };
  month: { sales: number; transactions: number };
  inventory: { totalProducts: number; lowStock: number };
  customers: { total: number; vehicles: number };
}

export async function getDashboardApi(): Promise<DashboardData> {
  const res = await apiClient.get<{ success: boolean; data: DashboardData }>(
    '/reports/dashboard'
  );
  return res.data.data;
}
