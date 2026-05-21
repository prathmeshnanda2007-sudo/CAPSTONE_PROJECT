import { apiClient } from './api';

// ─── Admin Stats ─────────────────────────────────────────────────────────────
export const getAdminStats = async () => {
  const res = await apiClient.get('/admin/stats');
  return res.data;
};

// ─── User Management ─────────────────────────────────────────────────────────
export const listAdminUsers = async (params: {
  page?: number; limit?: number;
  status?: string; plan?: string; search?: string;
} = {}) => {
  const res = await apiClient.get('/admin/users', { params });
  return res.data;
};

export const getAdminUser = async (id: string) => {
  const res = await apiClient.get(`/admin/users/${id}`);
  return res.data;
};

export const approveUser   = async (id: string) => (await apiClient.patch(`/admin/users/${id}/approve`)).data;
export const suspendUser   = async (id: string) => (await apiClient.patch(`/admin/users/${id}/suspend`)).data;
export const changePlan    = async (id: string, planType: string) => (await apiClient.patch(`/admin/users/${id}/plan`, { planType })).data;
export const changeRole    = async (id: string, role: string) => (await apiClient.patch(`/admin/users/${id}/role`, { role })).data;
export const grantState    = async (id: string, stateId: string) => (await apiClient.post(`/admin/users/${id}/state-access`, { stateId })).data;
export const revokeState   = async (id: string, stateId: string) => (await apiClient.delete(`/admin/users/${id}/state-access/${stateId}`)).data;

// ─── Logs ─────────────────────────────────────────────────────────────────────
export const getAdminLogs = async (params: {
  page?: number; limit?: number;
  userId?: string; status?: string; endpoint?: string;
} = {}) => {
  const res = await apiClient.get('/admin/logs', { params });
  return res.data;
};

// ─── Cache ────────────────────────────────────────────────────────────────────
export const flushCache = async () => (await apiClient.delete('/admin/cache')).data;
