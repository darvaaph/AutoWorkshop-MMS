import { apiClient } from './client';

export interface Mechanic {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  photo_url: string | null;
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

export async function deleteMechanicApi(id: number): Promise<void> {
  await apiClient.delete(`/mechanics/${id}`);
}
