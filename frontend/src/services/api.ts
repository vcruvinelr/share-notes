import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import config from '../config';

const api: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable sending cookies
});

// Request interceptor to add auth token and anonymous user ID
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // For anonymous users, send the ID from localStorage as a custom header
      const anonymousId = localStorage.getItem('anonymousUserId');
      if (anonymousId) {
        config.headers['X-Anonymous-User-Id'] = anonymousId;
      }
    }
    
    // Debug: log what we're sending
    console.log('[API] Request to:', config.url);
    console.log('[API] Auth header:', config.headers.Authorization ? 'Bearer token present' : 'None');
    console.log('[API] Anonymous ID:', config.headers['X-Anonymous-User-Id'] || 'None');
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
