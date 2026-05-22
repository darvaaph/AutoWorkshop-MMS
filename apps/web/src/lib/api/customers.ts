import { apiClient } from './client';

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  photo_url: string | null;
  createdAt: string;
}

export interface CustomersResponse {
  data: Customer[];
}

export async function getCustomersApi(search?: string): Promise<Customer[]> {
  const res = await apiClient.get<CustomersResponse>('/customers', {
    params: search ? { search } : undefined,
  });
  return res.data.data;
}

export async function createCustomerApi(form: FormData): Promise<Customer> {
  const res = await apiClient.post<{ data: Customer }>('/customers', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function updateCustomerApi(
  id: number,
  form: FormData
): Promise<Customer> {
  const res = await apiClient.put<{ data: Customer }>(
    `/customers/${id}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data;
}

export async function deleteCustomerApi(id: number): Promise<void> {
  await apiClient.delete(`/customers/${id}`);
}
