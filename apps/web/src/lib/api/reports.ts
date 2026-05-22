import { apiClient } from './client';

export interface FinancialReport {
  period: { from: string; to: string };
  revenue: number;
  expenses: number;
  profit: number;
  transactions: Array<{
    id: number;
    date: string;
    total_amount: string;
    status: string;
    vehicle?: { license_plate: string };
  }>;
}

export interface SalesReport {
  period: { from: string; to: string };
  top_products: Array<{ name: string; qty: number; revenue: number }>;
  top_services: Array<{ name: string; qty: number; revenue: number }>;
  daily: Array<{ date: string; transactions: number; revenue: number }>;
}

export interface InventoryReport {
  total_products: number;
  total_value: number;
  low_stock: Array<{
    id: number;
    sku: string;
    name: string;
    stock: number;
    min_stock_alert: number;
    price_buy: string;
  }>;
  by_category: Array<{ category: string; count: number; value: number }>;
}

export async function getFinancialReportApi(params: {
  date_from: string;
  date_to: string;
}): Promise<FinancialReport> {
  const res = await apiClient.get<{ data: FinancialReport }>(
    '/reports/financial',
    { params }
  );
  return res.data.data;
}

export async function getSalesReportApi(params: {
  date_from: string;
  date_to: string;
}): Promise<SalesReport> {
  const res = await apiClient.get<{ data: SalesReport }>('/reports/sales', {
    params,
  });
  return res.data.data;
}

export async function getInventoryReportApi(): Promise<InventoryReport> {
  const res = await apiClient.get<{ data: InventoryReport }>(
    '/reports/inventory'
  );
  return res.data.data;
}
