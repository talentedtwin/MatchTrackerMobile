import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/constants';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    // Add auth token if available
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle errors globally
    console.error('API Error:', error.response?.data || error.message);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      // Token expired or invalid - handle logout
      AsyncStorage.removeItem('auth_token');
      // You can dispatch a logout action here if using Redux/Context
    }
    
    return Promise.reject(error);
  }
);

// Player API
export const playerApi = {
  async getAll() {
    return apiClient.get('/players');
  },
  
  async create(data) {
    return apiClient.post('/players', data);
  },
  
  async update(id, data) {
    return apiClient.put(`/players/${id}`, data);
  },
  
  async delete(id) {
    return apiClient.delete(`/players/${id}`);
  },
};

// Team API
export const teamApi = {
  async getAll() {
    return apiClient.get('/teams');
  },
  
  async create(data) {
    return apiClient.post('/teams', data);
  },
  
  async update(id, data) {
    return apiClient.put(`/teams/${id}`, data);
  },
  
  async delete(id) {
    return apiClient.delete(`/teams/${id}`);
  },
};

// Match API
export const matchApi = {
  async getAll() {
    return apiClient.get('/matches');
  },
  
  async getById(id) {
    return apiClient.get(`/matches/${id}`);
  },
  
  async create(data) {
    return apiClient.post('/matches', data);
  },
  
  async update(id, data) {
    return apiClient.put(`/matches/${id}`, data);
  },
  
  async delete(id) {
    return apiClient.delete(`/matches/${id}`);
  },
};

// Player Match Stats API
export const playerMatchStatsApi = {
  async getAll(params) {
    return apiClient.get('/player-match-stats', { params });
  },
  
  async create(data) {
    return apiClient.post('/player-match-stats', data);
  },
  
  async update(id, data) {
    return apiClient.put(`/player-match-stats/${id}`, data);
  },
  
  async delete(id) {
    return apiClient.delete(`/player-match-stats/${id}`);
  },
};

// Stats API
export const statsApi = {
  async getUserStats(userId) {
    return apiClient.get(`/stats?userId=${userId}`);
  },
};

// Health Check
export const healthApi = {
  async check() {
    return apiClient.get('/health');
  },
};

export default apiClient;

