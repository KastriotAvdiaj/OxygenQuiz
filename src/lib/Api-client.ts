import Axios, { InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { AUTH_COOKIE } from './authHelpers';
import { useNotifications } from '@/common/Notifications';

function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = 'application/json';

    // Retrieve the token from the cookie
    const token = Cookies.get(AUTH_COOKIE);
    if (token) {
      // Attach the token to the Authorization header
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }

  config.withCredentials = true;
  return config;
}

export const api = Axios.create({
  baseURL: "https://localhost:7153/api/",
});

api.interceptors.request.use(authRequestInterceptor);
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 401) {
      console.log('Unauthorized:', error);
      Cookies.remove(AUTH_COOKIE);
    } else {
      // Only add a notification for non-401 errors
      useNotifications.getState().addNotification({
        type: 'error',
        title: 'Error',
        message,//change this when deployed
      });
    }

    return Promise.reject(error);
  }
);

// Enhanced API with helper methods
export const apiService = {
  // Basic data-only methods (for backward compatibility)
  async get<T = any>(url: string, config = {}): Promise<T> {
    const response = await api.get<T>(url, config);
    return response.data;
  },
  
  async post<T = any>(url: string, data?: any, config = {}): Promise<T> {
    const response = await api.post<T>(url, data, config);
    return response.data;
  },
  
  async put<T = any>(url: string, data?: any, config = {}): Promise<T> {
    const response = await api.put<T>(url, data, config);
    return response.data;
  },
  
  async delete<T = any>(url: string, config = {}): Promise<T> {
    const response = await api.delete<T>(url, config);
    return response.data;
  },
  
  // Full response methods (when you need headers or other response data)
  async getWithMeta<T = any>(url: string, config = {}): Promise<AxiosResponse<T>> {
    return api.get<T>(url, config);
  },
  
  async postWithMeta<T = any>(url: string, data?: any, config = {}): Promise<AxiosResponse<T>> {
    return api.post<T>(url, data, config);
  },
  
  async putWithMeta<T = any>(url: string, data?: any, config = {}): Promise<AxiosResponse<T>> {
    return api.put<T>(url, data, config);
  },
  
  async deleteWithMeta<T = any>(url: string, config = {}): Promise<AxiosResponse<T>> {
    return api.delete<T>(url, config);
  }
};
