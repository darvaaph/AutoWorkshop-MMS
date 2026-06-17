import { apiClient } from './client';

export interface FinancialReport {
  period: { from: string; to: string };
  income: { total_sales: number; total_received: number; outstanding: number };
  expenses: { total: number; by_category: Record<string, number> };
  profit: { gross: number };
  transaction_count: number;
  transactions: Array<{
    id: number;
    date: string;
    status: string;
    total_amount: string;
    vehicle: { license_plate: string } | null;
  }>;
}

export interface SalesReport {
  summary: { total_transactions: number; total_sales: number; total_paid: number; total_unpaid: number };
  top_products: Array<{ name: string; qty: number; revenue: number }>;
  top_services: Array<{ name: string; qty: number; revenue: number }>;
  daily: Array<{ date: string; transactions: number; revenue: number }>;
  transactions: Array<{ id: number; date: string; status: string; total_amount: string; paid: number }>;
}

export interface OperationalReport {
  period: { from: string; to: string };
  summary: {
    total_visits: number;
    active_mechanics: number;
    vehicles_served: number;
    total_revenue: number;
    avg_value_per_visit: number;
  };
  mechanics: Array<{
    id: number | null;
    name: string;
    transactions: number;
    vehicles: number;
    service_revenue: number;
    total_revenue: number;
    avg_per_transaction: number;
  }>;
  top_vehicles: Array<{
    id: number;
    license_plate: string;
    brand: string;
    model: string;
    customer_name: string | null;
    visits: number;
    total_spend: number;
    last_visit: string;
  }>;
  top_customers: Array<{
    id: number;
    name: string;
    visits: number;
    vehicles: number;
    total_spend: number;
  }>;
}

export interface InventoryReport {
  summary: { total_products: number; low_stock: number; out_of_stock: number; total_stock_value: number };
  by_category: Array<{ category: string; count: number; value: number }>;
  low_stock: Array<{ id: number; sku: string; name: string; category: string; stock: number; min_stock_alert: number; price_buy: string; price_sell: string }>;
  products: Array<{ id: number; sku: string; name: string; category: string; stock: number; min_stock_alert: number; price_buy: string; price_sell: string }>;
}

export async function getFinancialReportApi(params: {
  date_from: string;
  date_to: string;
}): Promise<FinancialReport> {
  const res = await apiClient.get<{ data: FinancialReport }>('/reports/financial', { params });
  return res.data.data;
}

export async function getSalesReportApi(params: {
  date_from: string;
  date_to: string;
}): Promise<SalesReport> {
  const res = await apiClient.get<{ data: SalesReport }>('/reports/sales', { params });
  return res.data.data;
}

export async function getInventoryReportApi(): Promise<InventoryReport> {
  const res = await apiClient.get<{ data: InventoryReport }>('/reports/inventory');
  return res.data.data;
}

export async function getOperationalReportApi(params: {
  date_from: string;
  date_to: string;
}): Promise<OperationalReport> {
  const res = await apiClient.get<{ data: OperationalReport }>('/reports/operational', { params });
  return res.data.data;
}
