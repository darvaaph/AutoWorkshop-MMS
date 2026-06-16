import { useQuery } from '@tanstack/react-query';
import { getAuditLogsApi, type AuditLogsParams } from '@/lib/api/audit-logs';

export function useAuditLogs(params?: AuditLogsParams) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => getAuditLogsApi(params),
  });
}
