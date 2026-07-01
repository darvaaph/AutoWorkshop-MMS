import { apiClient } from './client';

export interface Service {
  id: number;
  name: string;
  price: string;
  description: string | null;
  image_url: string | null;
}

export async function getServicesApi(): Promise<Service[]> {
  const res = await apiClient.get<{ data: { services: Service[] } }>(
    '/services'
  );
  return res.data.data.services;
}

export async function createServiceApi(form: FormData): Promise<Service> {
  const res = await apiClient.post<{ data: Service }>('/services', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function updateServiceApi(
  id: number,
  form: FormData
): Promise<Service> {
  const res = await apiClient.put<{ data: Service }>(`/services/${id}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function deleteServiceApi(id: number): Promise<void> {
  await apiClient.delete(`/services/${id}`);
}
