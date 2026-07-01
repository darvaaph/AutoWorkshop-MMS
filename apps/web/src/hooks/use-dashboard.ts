import { useQuery } from '@tanstack/react-query';
import { getDashboardApi } from '@/lib/api/dashboard';
import { getDueServiceVehiclesApi } from '@/lib/api/vehicles';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardApi,
  });
}

export function useDueServiceVehicles() {
  return useQuery({
    queryKey: ['vehicles', 'due-service'],
    queryFn: getDueServiceVehiclesApi,
  });
}
