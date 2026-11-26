import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    const isAuthCall = url.startsWith('/auth/login') || url.startsWith('/auth/register');
    if (err.response?.status === 401 && !isAuthCall) {
      localStorage.removeItem('token');
      if (!location.pathname.startsWith('/login')) location.assign('/login');
    }
    return Promise.reject(err);
  }
);

// Turns an API/axios error into one readable sentence for the UI.
export function errMsg(err) {
  const d = err.response?.data;
  if (d?.errors?.length) return d.errors.map((e) => e.message).join('. ');
  return d?.message || err.message || 'Something went wrong';
}

export default api;
