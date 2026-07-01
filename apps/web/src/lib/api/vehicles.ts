import { apiClient } from './client';

export interface Vehicle {
  id: number;
  customer_id: number;
  license_plate: string;
  brand: string;
  model: string;
  current_km: number;
  next_service_date: string | null;
  next_service_km: number | null;
  reminder_sent_at: string | null;
  reminder_notes: string | null;
  image_url: string | null;
  customer?: { id: number; name: string; phone: string };
}

export async function getVehiclesApi(search?: string): Promise<Vehicle[]> {
  const res = await apiClient.get<{ data: Vehicle[] }>('/vehicles', {
    params: search ? { search } : undefined,
  });
  return res.data.data;
}

export interface DueServiceVehicle extends Vehicle {
  days_until_due: number;
  status: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
  is_contacted: boolean;
}

export async function getDueServiceVehiclesApi(): Promise<DueServiceVehicle[]> {
  const res = await apiClient.get<{ data: DueServiceVehicle[] }>('/vehicles/due-service');
  return res.data.data;
}

export async function createVehicleApi(
  data: Partial<Vehicle>
): Promise<Vehicle> {
  const res = await apiClient.post<{ data: Vehicle }>('/vehicles', data);
  return res.data.data;
}

export async function updateVehicleApi(
  id: number,
  data: Partial<Vehicle>
): Promise<Vehicle> {
  const res = await apiClient.put<{ data: Vehicle }>(`/vehicles/${id}`, data);
  return res.data.data;
}

export async function deleteVehicleApi(id: number): Promise<void> {
  await apiClient.delete(`/vehicles/${id}`);
}

export async function markContactedApi(
  id: number,
  notes: string
): Promise<void> {
  await apiClient.post(`/vehicles/${id}/mark-contacted`, { notes });
}

export async function resetReminderApi(id: number): Promise<void> {
  await apiClient.post(`/vehicles/${id}/reset-reminder`, {});
}
