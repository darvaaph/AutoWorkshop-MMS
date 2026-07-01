import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getVehiclesApi,
  createVehicleApi,
  updateVehicleApi,
  deleteVehicleApi,
  markContactedApi,
  resetReminderApi,
  type Vehicle,
} from '@/lib/api/vehicles';

export function useVehicles(search?: string) {
  return useQuery({
    queryKey: ['vehicles', search],
    queryFn: () => getVehiclesApi(search),
  });
}

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Vehicle>) => createVehicleApi(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Kendaraan berhasil ditambahkan');
    },
    onError: () => toast.error('Gagal menambahkan kendaraan'),
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vehicle> }) =>
      updateVehicleApi(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Kendaraan berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui kendaraan'),
  });
}

export function useDeleteVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteVehicleApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Kendaraan berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus kendaraan'),
  });
}

export function useMarkContacted() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) =>
      markContactedApi(id, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Kendaraan ditandai sudah dihubungi');
    },
    onError: () => toast.error('Gagal menandai kendaraan'),
  });
}

export function useResetReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resetReminderApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Status reminder berhasil direset');
    },
    onError: () => toast.error('Gagal mereset reminder'),
  });
}
