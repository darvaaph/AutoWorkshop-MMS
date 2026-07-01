import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getServicesApi,
  createServiceApi,
  updateServiceApi,
  deleteServiceApi,
} from '@/lib/api/services';

export function useServices() {
  return useQuery({ queryKey: ['services'], queryFn: getServicesApi });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createServiceApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success('Jasa berhasil ditambahkan');
    },
    onError: () => toast.error('Gagal menambahkan jasa'),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormData }) =>
      updateServiceApi(id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success('Jasa berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui jasa'),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteServiceApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] });
      toast.success('Jasa berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus jasa'),
  });
}
