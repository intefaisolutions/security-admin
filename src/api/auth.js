import api from './axios';

/**
 * Login Super Admin
 * Endpoint: POST /api/auth/login/admin
 * Body: { phone, password }
 * Returns: { user, accessToken, refreshToken }
 */
export const loginAdmin = async (credentials) => {
  const response = await api.post('/auth/login/admin', credentials);
  const data = response.data;
  
  // Exception handling: handles direct return { user, accessToken, refreshToken } 
  // as well as wrapped return { data: { user, accessToken, refreshToken } }
  return data?.data ? data.data : data;
};

/**
 * Register the single Super Admin account
 * Endpoint: POST /api/auth/register/super-admin
 * Note: Backend enforces single super admin. Registration fails (409) if one already exists.
 */
export const registerSuperAdmin = async (adminData) => {
  const response = await api.post('/auth/register/super-admin', adminData);
  return response.data?.data || response.data;
};

/**
 * Refresh Access Token
 * Endpoint: POST /api/auth/refresh-token
 */
export const refreshTokenCall = async (refreshToken) => {
  const response = await api.post('/auth/refresh-token', { refreshToken });
  return response.data?.data || response.data;
};

/**
 * Client-side logout helper to clear stored auth tokens
 */
export const logoutUser = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

/**
 * Verify OTP for Admin Account Activation
 * Endpoint: POST /api/auth/verify-otp
 * Body: { phone, otp }
 */
export const verifyOtp = async ({ phone, otp }) => {
  const response = await api.post('/auth/verify-otp', { phone, otp });
  return response.data?.data || response.data;
};

/**
 * Resend OTP Code
 * Endpoint: POST /api/auth/resend-otp
 * Body: { phone }
 */
export const resendOtp = async ({ phone }) => {
  const response = await api.post('/auth/resend-otp', { phone });
  return response.data?.data || response.data;
};

/**
 * Request Password Reset OTP
 * Endpoint: POST /api/auth/forgot-password/:role
 * Body: { phone }
 */
export const forgotPassword = async ({ phone, role = 'admin' }) => {
  const response = await api.post(`/auth/forgot-password/${role}`, { phone });
  return response.data?.data || response.data;
};

/**
 * Reset Password with OTP Code
 * Endpoint: POST /api/auth/reset-password
 * Body: { phone, otp, newPassword }
 */
export const resetPassword = async ({ phone, otp, newPassword }) => {
  const response = await api.post('/auth/reset-password', { phone, otp, newPassword });
  return response.data?.data || response.data;
};

/**
 * Change Password for Authenticated User (First Login Force Change)
 * Endpoint: POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await api.post('/auth/change-password', { currentPassword, newPassword });
  return response.data?.data || response.data;
};


