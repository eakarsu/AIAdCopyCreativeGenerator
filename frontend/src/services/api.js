import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
  me: () => api.get('/auth/me'),
};

export const featuresAPI = {
  list: (feature, params = {}) => api.get(`/features/${feature}`, { params }),
  get: (feature, id) => api.get(`/features/${feature}/${id}`),
  create: (feature, data) => api.post(`/features/${feature}`, data),
  update: (feature, id, data) => api.put(`/features/${feature}/${id}`, data),
  delete: (feature, id) => api.delete(`/features/${feature}/${id}`),
};

export const aiAPI = {
  generate: (feature, prompt, context) => api.post('/ai/generate', { feature, prompt, context }),
};

export default api;
