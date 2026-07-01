import { apiClient } from './client';

export interface PackageItemComponent {
  id: number;
  package_id: number;
  product_id: number | null;
  service_id: number | null;
  qty: number;
  product?: {
    id: number;
    sku: string;
    name: string;
    price_sell: string;
    price_buy: string;
    stock: number;
  };
  service?: { id: number; name: string; price: string };
}

export interface PackageCalculated {
  component_cost: number;
  component_retail_price: number;
  margin: number;
  margin_percent: number;
  customer_savings: number;
  savings_percent: number;
  is_available: boolean;
  unavailable_reason: string | null;
  low_margin_alert: boolean;
}

export interface Package {
  id: number;
  name: string;
  price: string;
  description: string | null;
  is_active: boolean;
  image_url: string | null;
  createdAt: string;
  updatedAt: string;
  items: PackageItemComponent[];
  calculated: PackageCalculated;
}

export interface PackagesResponse {
  packages: Package[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

export interface CreatePackageItem {
  product_id?: number;
  service_id?: number;
  qty: number;
}

export interface CreatePackagePayload {
  name: string;
  price: number;
  description?: string;
  is_active?: boolean;
  items: CreatePackageItem[];
}

export async function getPackagesApi(params?: {
  search?: string;
  active_only?: boolean;
  page?: number;
  limit?: number;
}): Promise<PackagesResponse> {
  const res = await apiClient.get<{ data: PackagesResponse }>('/packages', {
    params,
  });
  return res.data.data;
}

export async function getPackageApi(id: number): Promise<Package> {
  const res = await apiClient.get<{ data: Package }>(`/packages/${id}`);
  return res.data.data;
}

export async function createPackageApi(
  payload: CreatePackagePayload
): Promise<Package> {
  const res = await apiClient.post<{ data: Package }>('/packages', payload);
  return res.data.data;
}

export async function updatePackageApi(
  id: number,
  payload: Partial<CreatePackagePayload>
): Promise<Package> {
  const res = await apiClient.put<{ data: Package }>(
    `/packages/${id}`,
    payload
  );
  return res.data.data;
}

export async function deletePackageApi(id: number): Promise<void> {
  await apiClient.delete(`/packages/${id}`);
}
