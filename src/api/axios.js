import axios from "axios";

// Real base URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        clearAuthStorageAndRedirect();
        return Promise.reject(error);
      }
      try {
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        const responseData = refreshResponse.data;
        const newAccessToken =
          responseData?.accessToken ||
          responseData?.data?.accessToken ||
          responseData?.data;
        if (newAccessToken && typeof newAccessToken === 'string') {
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } else {
          clearAuthStorageAndRedirect();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        clearAuthStorageAndRedirect();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

function clearAuthStorageAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export default api;
