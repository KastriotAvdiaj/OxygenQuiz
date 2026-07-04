import Axios, { InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { getAccessToken, setAccessToken, clearAccessToken } from "./token-store";
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

    // Retrieve the token from the in-memory store (never a cookie/localStorage).
    const token = getAccessToken();
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
  // Base URL comes from the Vite env files (already includes the /api suffix):
  //   .env.development → https://localhost:7153/api
  //   .env.production  → https://api.oxygenquiz.com/api
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use(authRequestInterceptor);

// --- Silent refresh on 401 -------------------------------------------------
// The API now actually validates JWTs, so an expired access token yields 401.
// We try the refresh-token cookie once (POST /Authentication/refresh), store the
// new access token, and replay the original request. A single-flight promise
// makes concurrent 401s share one refresh call.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  // Bare axios call so we don't re-enter this interceptor. withCredentials sends
  // the HttpOnly refresh cookie.
  const response = await Axios.post(
    `${api.defaults.baseURL}/Authentication/refresh`,
    {},
    { withCredentials: true }
  );
  const newToken: string | undefined = response.data?.token;
  if (!newToken) {
    throw new Error("Refresh did not return a token");
  }
  setAccessToken(newToken);
  return newToken;
}

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    // ProblemDetails (RFC 7807): the message lives in detail/title, not `message`.
    const data = error.response?.data;
    const message =
      data?.detail || data?.title || data?.message || error.message;

    // If it's a 404, just reject the promise without a notification.
    // The loader's error handler will take care of the UI.
    if (status === 404) {
      return Promise.reject(error);
    }
    if (status === 401) {
      const originalRequest = error.config || {};
      const isRefreshCall =
        typeof originalRequest.url === "string" &&
        originalRequest.url.includes("Authentication/refresh");

      // Try a single silent refresh, then replay the original request once.
      if (!originalRequest._retry && !isRefreshCall) {
        originalRequest._retry = true;
        try {
          refreshPromise = refreshPromise ?? refreshAccessToken();
          const newToken = await refreshPromise;
          refreshPromise = null;

          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          refreshPromise = null;
          console.log("Refresh failed, signing out:", refreshError);
          clearAccessToken();
          return Promise.reject(error);
        }
      }

      console.log("Unauthorized:", error);
      clearAccessToken();
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
