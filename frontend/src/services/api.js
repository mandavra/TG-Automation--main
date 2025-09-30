import axios from 'axios';
import config from '../config/config.js';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: config.api.baseURL,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAdminApi = url.startsWith('/admin') || url.includes('/admin/');
      const isOnAdminLogin = window.location.pathname === '/loginAdmin';
      const isAdminArea = window.location.pathname.startsWith('/admin');

      // If we're already on the admin login page, don't redirect; let the page show errors
      if (!isOnAdminLogin) {
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('user');
        localStorage.removeItem('auth');
        localStorage.removeItem('adminRole');
        const shouldGoToAdminLogin = isAdminApi || isAdminArea;
        window.location.href = shouldGoToAdminLogin ? '/loginAdmin' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

// OTP API calls
export const otpAPI = {
  // Send OTP to phone number
  sendOTP: async (phone) => {
    try {
      const response = await api.post('/otp/send-otp', { phone });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify OTP
  verifyOTP: async (phone, otp) => {
    try {
      const response = await api.post('/otp/verify-otp', { phone, otp });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reset OTP (if needed)
  resetOTP: async (phone) => {
    try {
      const response = await api.post('/otp/reset-otp', { phone });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// User API calls
export const userAPI = {
  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/user/profile');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userData) => {
    try {
      const response = await api.put('/user/profile', userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Payment API calls
export const paymentAPI = {
  // Create payment
  createPayment: async (paymentData) => {
    try {
      const response = await api.post('/payment/create', paymentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get payment status
  getPaymentStatus: async (paymentId) => {
    try {
      const response = await api.get(`/payment/status/${paymentId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// KYC API calls
export const kycAPI = {
  // Submit KYC form
  submitKYC: async (kycData) => {
    try {
      const response = await api.post('/kyc/submit', kycData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get KYC status
  getKYCStatus: async () => {
    try {
      const response = await api.get('/kyc/status');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Plan API calls
export const planAPI = {
  // Get all plans
  getPlans: async () => {
    try {
      const response = await api.get('/plans');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get plan by ID
  getPlanById: async (planId) => {
    try {
      const response = await api.get(`/plans/${planId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

// Admin API calls
export const adminAPI = {
  login: async (email, password) => {
    const response = await api.post('/admin/login', { email, password });
    return response.data;
  },
  me: async () => {
    const response = await api.get('/admin/me');
    return response.data;
  },
  createAdmin: async (email, password) => {
    const response = await api.post('/admin/create-admin', { email, password });
    return response.data;
  },
  listAdmins: async () => {
    const response = await api.get('/admin/list');
    return response.data;
  },
  updateEmail: async (id, email) => {
    const response = await api.put(`/admin/${id}/email`, { email });
    return response.data;
  },
  updatePassword: async (id, password) => {
    const response = await api.put(`/admin/${id}/password`, { password });
    return response.data;
  },
  deleteAdmin: async (id) => {
    const response = await api.delete(`/admin/${id}`);
    return response.data;
  },
};

export default api; 