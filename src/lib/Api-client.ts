import Axios, { InternalAxiosRequestConfig } from 'axios';

// import { useNotifications } from '@/components/ui/notifications';

function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = 'application/json';
  }

  config.withCredentials = true;
  return config;
}

export const api = Axios.create({
  baseURL:"https://localhost:7153/api/",
});

api.interceptors.request.use(authRequestInterceptor);
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // const message = error.response?.data?.message || error.message;
    // useNotifications.getState().addNotification({
    //   type: 'error',
    //   title: 'Error',
    //   message,
    // });

    if (error.response?.status === 401) {
      const searchParams = new URLSearchParams();
      const redirectTo = searchParams.get('redirectTo');
      window.location.href = `/signup?redirectTo=${redirectTo}`;
    }

    return Promise.reject(error);
  },
);
