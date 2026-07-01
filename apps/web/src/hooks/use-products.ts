import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getProductsApi,
  createProductApi,
  updateProductApi,
  deleteProductApi,
} from '@/lib/api/products';

export function useProducts(params?: { search?: string; category?: string }) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getProductsApi(params),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createProductApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil ditambahkan');
    },
    onError: () => toast.error('Gagal menambahkan produk'),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }: { id: number; form: FormData }) =>
      updateProductApi(id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil diperbarui');
    },
    onError: () => toast.error('Gagal memperbarui produk'),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteProductApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produk berhasil dihapus');
    },
    onError: () => toast.error('Gagal menghapus produk'),
  });
}
