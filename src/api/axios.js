import axios from 'axios';

// Get base URL from environment variables or fallback to default local backend API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor:
 * Automatically reads accessToken from localStorage and sets the Authorization header
 * for all outgoing requests to protected API endpoints.
 */
api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers['Authorization'] = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor:
 * Intercepts 401 Unauthorized responses to perform automatic token refresh.
 * Uses refreshToken from localStorage to get a new accessToken, updates storage,
 * and transparently retries the failed request.
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized and request hasn't been retried yet
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');

      // If no refresh token is stored, clear auth state and redirect to /login
      if (!refreshToken) {
        clearAuthStorageAndRedirect();
        return Promise.reject(error);
      }

      try {
        // Request new access token using stored refresh token
        // Use standard axios to avoid triggering this interceptor again
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        // Unpack new access token from response (handles direct & wrapped responses)
        const responseData = refreshResponse.data;
        const newAccessToken =
          responseData?.accessToken ||
          responseData?.data?.accessToken ||
          responseData?.data;

        if (newAccessToken && typeof newAccessToken === 'string') {
          // Save new token in localStorage
          localStorage.setItem('accessToken', newAccessToken);

          // Update headers on current failed request and future instance requests
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

          // Retry the original request
          return api(originalRequest);
        } else {
          clearAuthStorageAndRedirect();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        // Refresh token expired or invalid
        clearAuthStorageAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Helper to clear local auth state and redirect to login page
 */
function clearAuthStorageAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export default api;
