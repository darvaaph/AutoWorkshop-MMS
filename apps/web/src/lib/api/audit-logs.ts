import { apiClient } from './client';

export interface AuditLog {
  id: number;
  user_id: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'READ';
  table_name: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  user?: { id: number; username: string; full_name: string } | null;
}

export interface AuditLogsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
  table_name?: string;
  date_from?: string;
  date_to?: string;
}

export async function getAuditLogsApi(
  params?: AuditLogsParams
): Promise<{ data: AuditLog[]; meta: AuditLogsMeta }> {
  const res = await apiClient.get<{
    data: AuditLog[];
    meta: AuditLogsMeta;
  }>('/audit-logs', { params });
  return { data: res.data.data, meta: res.data.meta };
}
