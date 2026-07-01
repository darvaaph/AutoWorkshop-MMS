import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getPackagesApi,
  createPackageApi,
  updatePackageApi,
  deletePackageApi,
  type CreatePackagePayload,
} from '@/lib/api/packages';

export function usePackages(params?: {
  search?: string;
  active_only?: boolean;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['packages', params],
    queryFn: () => getPackagesApi(params),
  });
}

export function useCreatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePackagePayload) => createPackageApi(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  });
}

export function useUpdatePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: { id: number } & Partial<CreatePackagePayload>) =>
      updatePackageApi(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  });
}

export function useDeletePackage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePackageApi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['packages'] }),
  });
}
