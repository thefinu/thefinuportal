import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Remove trailing slash if any
const cleanBaseURL = baseURL.replace(/\/$/, '');

const api = axios.create({
    baseURL: cleanBaseURL,
});

api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export const getAccounts = () => api.get('/accounts');
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getAccountById = (id: string) => api.get(`/accounts/${id}`);
export const createAccount = (data: Record<string, unknown>) => api.post('/accounts', data);
export const updateAccount = (accountId: string, data: Record<string, unknown>) => api.patch(`/accounts/update-account/${accountId}`, data);
export const deleteAccount = (id: string) => api.delete(`/accounts/admin/${id}`);
export const unsubscribeUser = (email: string) => api.post('/payment/unsubscribe', { email });
export const setFreeUser = (userId: string) => api.post(`/users/${userId}/set-free-user`);

export default api;