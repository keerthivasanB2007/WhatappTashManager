import api from './axiosClient';

export const fetchTasks = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await api.get(`/api/tasks?${params.toString()}`);
  return response.data;
};

export const updateTaskStatus = async (id, status) => {
  const response = await api.patch(`/api/tasks/${id}`, { status });
  return response.data;
};

export const deleteTask = async (id) => {
  const response = await api.delete(`/api/tasks/${id}`);
  return response.data;
};

export const loginAuth = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const checkHealth = async () => {
    // Basic health route
    const response = await api.get('/health');
    return response.data;
};
