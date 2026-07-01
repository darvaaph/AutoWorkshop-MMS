import { apiClient } from './client';

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  price_buy: string;
  price_sell: string;
  stock: number;
  min_stock_alert: number;
  image_url: string | null;
}

export interface ProductsResponse {
  products: Product[];
  categories: string[];
}

export async function getProductsApi(params?: {
  search?: string;
  category?: string;
}): Promise<ProductsResponse> {
  const res = await apiClient.get<{ data: ProductsResponse }>('/products', {
    params,
  });
  return res.data.data;
}

export async function createProductApi(form: FormData): Promise<Product> {
  const res = await apiClient.post<{ data: Product }>('/products', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function updateProductApi(
  id: number,
  form: FormData
): Promise<Product> {
  const res = await apiClient.put<{ data: Product }>(`/products/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function deleteProductApi(id: number): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}
