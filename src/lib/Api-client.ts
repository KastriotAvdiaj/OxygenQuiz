import Axios, { InternalAxiosRequestConfig } from 'axios';
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
  baseURL:"https://localhost:7153/api/",
});

api.interceptors.request.use(authRequestInterceptor);
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || error.message;
    useNotifications.getState().addNotification({
      type: 'error',
      title: 'Error',
      message,
    });

    if (error.response?.status === 401) {
      console.log(error);
      // const searchParams = new URLSearchParams();
      // const redirectTo = searchParams.get('redirectTo');
      // window.location.href = `/login?redirectTo=${redirectTo}`;
    }

    return Promise.reject(error);
  },
);
