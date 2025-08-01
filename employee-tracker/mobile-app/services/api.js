import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:5000' // Development server
  : 'https://your-production-api.com'; // Replace with your production URL

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear stored token
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      
      // You might want to redirect to login screen here
      // Navigation should be handled by the calling component
    }

    // Return error in consistent format
    const errorMessage = error.response?.data?.message || error.message || 'Network error';
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data
    });
  }
);

// Auth API
export const authAPI = {
  // Send OTP to phone number
  sendOTP: (phoneNumber) => {
    return api.post('/auth/send-otp', { phoneNumber });
  },

  // Verify OTP and login
  verifyOTP: (phoneNumber, otp) => {
    return api.post('/auth/verify-otp', { phoneNumber, otp });
  },

  // Get user profile
  getProfile: () => {
    return api.get('/auth/profile');
  },

  // Update user profile
  updateProfile: (data) => {
    return api.put('/auth/profile', data);
  }
};

// Attendance API
export const attendanceAPI = {
  // Log attendance event
  logAttendance: (data) => {
    return api.post('/attendance/log', data);
  },

  // Get user's attendance logs
  getLogs: (params = {}) => {
    return api.get('/attendance/logs', { params });
  },

  // Get today's logs
  getTodayLogs: () => {
    return api.get('/attendance/logs/today');
  },

  // Get attendance summary
  getSummary: (params = {}) => {
    return api.get('/attendance/logs/summary', { params });
  }
};

// Geofence API
export const geofenceAPI = {
  // Get all geofence regions
  getRegions: () => {
    return api.get('/geofence/regions');
  },

  // Get specific region
  getRegion: (regionId) => {
    return api.get(`/geofence/regions/${regionId}`);
  },

  // Check if location is within any geofence
  checkLocation: (latitude, longitude) => {
    return api.post('/geofence/check-location', { latitude, longitude });
  }
};

// Storage helpers
export const storage = {
  // Store auth token
  setAuthToken: async (token) => {
    try {
      await AsyncStorage.setItem('authToken', token);
    } catch (error) {
      console.error('Error storing auth token:', error);
    }
  },

  // Get auth token
  getAuthToken: async () => {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  },

  // Store user data
  setUser: async (user) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error storing user data:', error);
    }
  },

  // Get user data
  getUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  // Clear all auth data
  clearAuth: async () => {
    try {
      await AsyncStorage.multiRemove(['authToken', 'user']);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  },

  // Store app settings
  setSettings: async (settings) => {
    try {
      await AsyncStorage.setItem('appSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error storing settings:', error);
    }
  },

  // Get app settings
  getSettings: async () => {
    try {
      const settings = await AsyncStorage.getItem('appSettings');
      return settings ? JSON.parse(settings) : {
        locationTracking: true,
        notifications: true,
        backgroundSync: true
      };
    } catch (error) {
      console.error('Error getting settings:', error);
      return {
        locationTracking: true,
        notifications: true,
        backgroundSync: true
      };
    }
  }
};

// Utility functions
export const utils = {
  // Format error message for display
  formatError: (error) => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    return 'An unexpected error occurred';
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    const token = await storage.getAuthToken();
    return !!token;
  },

  // Format phone number for display
  formatPhoneNumber: (phoneNumber) => {
    if (!phoneNumber) return '';
    // Remove country code for display if it's US number
    if (phoneNumber.startsWith('+1')) {
      const number = phoneNumber.substring(2);
      return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
    }
    return phoneNumber;
  },

  // Validate phone number format
  validatePhoneNumber: (phoneNumber) => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }
};

export default api;