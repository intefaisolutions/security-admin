import api from './axios';

export const loginAdmin = async (credentials) => {
  const response = await api.post('/auth/login/admin', credentials);
  const data = response.data;
  return data?.data ? data.data : data;
};

export const registerSuperAdmin = async (adminData) => {
  const response = await api.post('/auth/register/super-admin', adminData);
  return response.data?.data || response.data;
};

export const refreshTokenCall = async (refreshToken) => {
  const response = await api.post('/auth/refresh-token', { refreshToken });
  return response.data?.data || response.data;
};

export const logoutUser = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const verifyOtp = async ({ phone, otp }) => {
  const response = await api.post('/auth/verify-otp', { phone, otp });
  return response.data?.data || response.data;
};

export const resendOtp = async ({ phone }) => {
  const response = await api.post('/auth/resend-otp', { phone });
  return response.data?.data || response.data;
};

export const forgotPassword = async ({ phone, role = 'admin' }) => {
  const response = await api.post(`/auth/forgot-password/${role}`, { phone });
  return response.data?.data || response.data;
};

export const resetPassword = async ({ phone, otp, newPassword }) => {
  const response = await api.post('/auth/reset-password', { phone, otp, newPassword });
  return response.data?.data || response.data;
};

export const changePassword = async ({ currentPassword, newPassword }) => {
  const response = await api.post('/auth/change-password', { currentPassword, newPassword });
  return response.data?.data || response.data;
};

export const verifyAdminSignUp = async (data) => {
  const response = await api.post('/auth/verify-admin-signup', data);
  return response.data?.data || response.data;
};
