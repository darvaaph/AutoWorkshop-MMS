import { apiClient } from './client';

export interface Mechanic {
  id: number;
  name: string;
  is_active: boolean;
  photo_url: string | null;
  // only present when fetched via GET /:id/details (ADMIN)
  phone?: string | null;
  address?: string | null;
  emergency_contact?: string | null;
}

export interface MechanicDetails {
  id: number;
  name: string;
  is_active: boolean;
  photo_url: string | null;
  phone: string | null;
  address: string | null;
  emergency_contact: string | null;
}

export async function getMechanicsApi(): Promise<Mechanic[]> {
  const res = await apiClient.get<{ data: Mechanic[] }>('/mechanics');
  return res.data.data;
}

export async function createMechanicApi(form: FormData): Promise<Mechanic> {
  const res = await apiClient.post<{ data: Mechanic }>('/mechanics', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data;
}

export async function updateMechanicApi(
  id: number,
  form: FormData
): Promise<Mechanic> {
  const res = await apiClient.put<{ data: Mechanic }>(
    `/mechanics/${id}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return res.data.data;
}

export async function getMechanicDetailsApi(
  id: number
): Promise<MechanicDetails> {
  const res = await apiClient.get<{ data: MechanicDetails }>(
    `/mechanics/${id}/details`
  );
  return res.data.data;
}

export async function updateMechanicDetailsApi(
  id: number,
  payload: { phone?: string; address?: string; emergency_contact?: string }
): Promise<void> {
  await apiClient.put(`/mechanics/${id}/details`, payload);
}

export async function deleteMechanicApi(id: number): Promise<void> {
  await apiClient.delete(`/mechanics/${id}`);
}
