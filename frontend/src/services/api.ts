import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Response interceptor: auto-logout on 401 ───────────────────────────────
// Dynamically import the store to avoid circular dependency at module init time
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth state without importing at top level
      const { useAuthStore } = await import('../store/authStore');
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Geo endpoints ──────────────────────────────────────────────────────────
export const getStates = async () => {
  const response = await apiClient.get('/geo/states');
  return response.data;
};

export const getDistricts = async (stateId: string) => {
  const response = await apiClient.get(`/geo/states/${stateId}/districts`);
  return response.data;
};

export const getSubDistricts = async (districtId: string) => {
  const response = await apiClient.get(`/geo/districts/${districtId}/sub-districts`);
  return response.data;
};

export const getVillages = async (subDistrictId: string, page = 1, limit = 100) => {
  const response = await apiClient.get(`/geo/sub-districts/${subDistrictId}/villages?page=${page}&limit=${limit}`);
  return response.data;
};

export const searchVillages = async (query: string) => {
  const response = await apiClient.get(`/geo/villages/search?q=${encodeURIComponent(query)}`);
  return response.data;
};

export const searchVillagesFiltered = async (params: {
  q: string;
  state?: string;
  district?: string;
  limit?: number;
}) => {
  const response = await apiClient.get('/geo/villages/search', { params });
  return response.data;
};

// ─── Auth ────────────────────────────────────────────────────────────────────
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
  }
};

// ─── Dashboard ──────────────────────────────────────────────────────────────
export const getDashboardMetrics = async () => {
  const response = await apiClient.get('/dashboard/metrics');
  return response.data;
};

export const getDashboardStats = async (period: '24h' | '7d' | '30d' = '24h') => {
  const response = await apiClient.get('/dashboard/stats', { params: { period } });
  return response.data;
};

// ─── API Keys ────────────────────────────────────────────────────────────────
export const getApiKeys = async () => {
  const response = await apiClient.get('/keys');
  return response.data;
};

export const createApiKey = async (name: string) => {
  const response = await apiClient.post('/keys', { name });
  return response.data;
};

export const revokeApiKey = async (id: string) => {
  const response = await apiClient.patch(`/keys/${id}/revoke`);
  return response.data;
};

export const deleteApiKey = async (id: string) => {
  const response = await apiClient.delete(`/keys/${id}`);
  return response.data;
};
