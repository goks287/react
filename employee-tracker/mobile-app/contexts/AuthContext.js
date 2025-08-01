import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI, storage, utils } from '../services/api';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case actionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false,
        error: null,
      };

    case actionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case actionTypes.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };

    case actionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });

      const token = await storage.getAuthToken();
      const user = await storage.getUser();

      if (token && user) {
        // Verify token is still valid by making a profile request
        try {
          const response = await authAPI.getProfile();
          dispatch({ type: actionTypes.SET_USER, payload: response.user });
        } catch (error) {
          // Token is invalid, clear stored data
          await storage.clearAuth();
          dispatch({ type: actionTypes.LOGOUT });
        }
      } else {
        dispatch({ type: actionTypes.SET_LOADING, payload: false });
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      dispatch({ type: actionTypes.SET_ERROR, payload: utils.formatError(error) });
    }
  };

  const sendOTP = async (phoneNumber) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      dispatch({ type: actionTypes.CLEAR_ERROR });

      const response = await authAPI.sendOTP(phoneNumber);
      dispatch({ type: actionTypes.SET_LOADING, payload: false });

      return {
        success: true,
        message: response.message,
        expiresAt: response.expiresAt,
      };
    } catch (error) {
      const errorMessage = utils.formatError(error);
      dispatch({ type: actionTypes.SET_ERROR, payload: errorMessage });
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const verifyOTP = async (phoneNumber, otp) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      dispatch({ type: actionTypes.CLEAR_ERROR });

      const response = await authAPI.verifyOTP(phoneNumber, otp);

      // Store auth data
      await storage.setAuthToken(response.token);
      await storage.setUser(response.user);

      dispatch({ type: actionTypes.SET_USER, payload: response.user });

      return {
        success: true,
        message: response.message,
        user: response.user,
      };
    } catch (error) {
      const errorMessage = utils.formatError(error);
      dispatch({ type: actionTypes.SET_ERROR, payload: errorMessage });
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const logout = async () => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });

      // Clear stored auth data
      await storage.clearAuth();

      dispatch({ type: actionTypes.LOGOUT });

      return { success: true };
    } catch (error) {
      console.error('Error during logout:', error);
      dispatch({ type: actionTypes.SET_ERROR, payload: utils.formatError(error) });
      return { success: false, message: utils.formatError(error) };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      dispatch({ type: actionTypes.SET_LOADING, payload: true });
      dispatch({ type: actionTypes.CLEAR_ERROR });

      const response = await authAPI.updateProfile(profileData);

      // Update stored user data
      await storage.setUser(response.user);

      dispatch({ type: actionTypes.SET_USER, payload: response.user });

      return {
        success: true,
        message: response.message,
        user: response.user,
      };
    } catch (error) {
      const errorMessage = utils.formatError(error);
      dispatch({ type: actionTypes.SET_ERROR, payload: errorMessage });
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      await storage.setUser(response.user);
      dispatch({ type: actionTypes.SET_USER, payload: response.user });
      return response.user;
    } catch (error) {
      console.error('Error refreshing profile:', error);
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: actionTypes.CLEAR_ERROR });
  };

  const value = {
    // State
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,

    // Actions
    sendOTP,
    verifyOTP,
    logout,
    updateProfile,
    refreshProfile,
    clearError,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;