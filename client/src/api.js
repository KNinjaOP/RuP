import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);
export const getMe = () => api.get('/auth/me');
export const updateTheme = (theme) => api.patch('/auth/theme', { theme });

// Expenses
export const getExpenses = () => api.get('/expenses');
export const createExpense = (data) => api.post('/expenses', data);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

// Groups
export const getGroups = () => api.get('/groups');
export const getGroup = (id) => api.get(`/groups/${id}`);
export const createGroup = (data) => api.post('/groups', data);
export const joinGroup = (joinCode) => api.post('/groups/join', { joinCode });
export const regenerateCode = (id) => api.post(`/groups/${id}/regenerate-code`);
export const removeMember = (groupId, memberId) => api.delete(`/groups/${groupId}/members/${memberId}`);
export const deleteGroup = (id) => api.delete(`/groups/${id}`);

// Group Expenses
export const getGroupExpenses = (groupId) => api.get(`/group-expenses/${groupId}`);
export const createGroupExpense = (groupId, data) => api.post(`/group-expenses/${groupId}`, data);
export const updateGroupExpense = (groupId, id, data) => api.put(`/group-expenses/${groupId}/${id}`, data);
export const deleteGroupExpense = (groupId, id) => api.delete(`/group-expenses/${groupId}/${id}`);
export const getGroupBalance = (groupId) => api.get(`/group-expenses/${groupId}/balance`);
export const recordSettlement = (groupId, data) => api.post(`/group-expenses/${groupId}/settle`, data);
export const getSettlements = (groupId) => api.get(`/group-expenses/${groupId}/settlements`);

export default api;
