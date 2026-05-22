import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getMechanicsApi,
  createMechanicApi,
  updateMechanicApi,
  deleteMechanicApi,
} from '@/lib/api/mechanics';

export function useMechanics() {
  return useQuery({ queryKey: ['mechanics'], queryFn: getMechanicsApi });
}

export function useCreateMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createMechanicApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mechanics'] });
      toast.success('Mekanik berhasil ditambahkan');
    },
    onError: () => toast.error('Gagal menambahkan mekanik'),
  });
}

export function useUpdateMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormData }) =>
      updateMechanicApi(id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mechanics'] });
      toast.success('Mekanik berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui mekanik'),
  });
}

export function useDeleteMechanic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteMechanicApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mechanics'] });
      toast.success('Mekanik berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus mekanik'),
  });
}
