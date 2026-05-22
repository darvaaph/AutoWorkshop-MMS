import { useQuery } from '@tanstack/react-query';

import {
  getFinancialReportApi,
  getInventoryReportApi,
  getSalesReportApi,
} from '@/lib/api/reports';

export function useFinancialReport(params: {
  date_from: string;
  date_to: string;
}) {
  return useQuery({
    queryKey: ['reports', 'financial', params],
    queryFn: () => getFinancialReportApi(params),
    enabled: !!params.date_from && !!params.date_to,
  });
}

export function useSalesReport(params: { date_from: string; date_to: string }) {
  return useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: () => getSalesReportApi(params),
    enabled: !!params.date_from && !!params.date_to,
  });
}

export function useInventoryReport() {
  return useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: getInventoryReportApi,
  });
}
