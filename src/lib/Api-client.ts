import Axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import Cookies from "js-cookie";
import { AUTH_COOKIE } from "./authHelpers";
import { useNotifications } from "@/common/Notifications";

const CUSTOM_ERROR_PATTERNS = [
  "not found or you're not authorized",
  "used in a quiz and cannot be deleted",
  "already exists",
  "cannot be deleted",
  "not authorized",
  "insufficient permissions",
  "already have an active session",
];

function isCustomErrorMessage(message: string): boolean {
  return CUSTOM_ERROR_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
  );
}

function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = "application/json";

    // Retrieve the token from the cookie
    const token = Cookies.get(AUTH_COOKIE);
    if (token) {
      // Attach the token to the Authorization header
      config.headers["Authorization"] = `Bearer ${token}`;
    }
  }

  config.withCredentials = true;
  return config;
}

export const llmApi = Axios.create({
  baseURL: import.meta.env.VITE_LLM_URL,
});

llmApi.interceptors.response.use(
  (response) => {
    // Axios responses have the actual data inside a `data` property.
    // This unwraps it for you, so in your hooks you can just use `response`
    // instead of `response.data`.
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const api = Axios.create({
  baseURL: `https://d4h8e1xy4vtiq.cloudfront.net/api`,
  // baseURL: `https://localhost:7153/api`,
});

api.interceptors.request.use(authRequestInterceptor);
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;

    // If it's a 404, just reject the promise without a notification.
    // The loader's error handler will take care of the UI.
    if (status === 404) {
      return Promise.reject(error);
    }
    if (status === 401) {
      console.log("Unauthorized:", error);
      Cookies.remove(AUTH_COOKIE);
    } else {
      const isCustomMessage =
        error.response?.data?.isCustomMessage || isCustomErrorMessage(message);

      let displayMessage = message;

      if (!isCustomMessage) {
        displayMessage = "An unexpected error occurred. Please try again.";

        console.error("System error:", {
          status,
          message,
          url: error.config?.url,
          method: error.config?.method,
        });
      }

      useNotifications.getState().addNotification({
        type: "error",
        title: "Error",
        message: displayMessage,
      });
    }

    return Promise.reject(error);
  }
);

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
  async getWithMeta<T = any>(
    url: string,
    config = {}
  ): Promise<AxiosResponse<T>> {
    return api.get<T>(url, config);
  },

  async postWithMeta<T = any>(
    url: string,
    data?: any,
    config = {}
  ): Promise<AxiosResponse<T>> {
    return api.post<T>(url, data, config);
  },

  async putWithMeta<T = any>(
    url: string,
    data?: any,
    config = {}
  ): Promise<AxiosResponse<T>> {
    return api.put<T>(url, data, config);
  },

  async deleteWithMeta<T = any>(
    url: string,
    config = {}
  ): Promise<AxiosResponse<T>> {
    return api.delete<T>(url, config);
  },
};
