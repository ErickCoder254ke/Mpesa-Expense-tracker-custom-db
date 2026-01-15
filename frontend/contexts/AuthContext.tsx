import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '@/config/api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  hasUser: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: (user: User, accessToken: string) => Promise<void>;
  logout: () => Promise<void>;
  checkUserStatus: () => Promise<void>;
  getAuthHeader: () => { Authorization: string } | {};
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasUser, setHasUser] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Checking authentication status...');

      // Check if user is logged in locally
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedToken = await AsyncStorage.getItem('authToken');
      const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');

      if (storedUserData && storedToken && isLoggedIn === 'true') {
        const userData = JSON.parse(storedUserData);
        console.log('✅ Found stored user data:', { id: userData.id, email: userData.email });
        setUser(userData);
        setToken(storedToken);
        setIsAuthenticated(true);
        setHasUser(true);
      } else {
        console.log('❌ No stored credentials found, checking backend...');
        // Check user status from backend
        await checkUserStatus();
      }
    } catch (error) {
      console.error('❌ Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserStatus = async (retries: number = 3) => {
    try {
      if (!BACKEND_URL) {
        console.error('Backend URL not configured');
        setHasUser(false);
        return;
      }

      console.log('🔍 Checking user status at:', `${BACKEND_URL}/api/auth/user-status`);

      // Add timeout for backend cold starts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('⏰ Request timeout - backend might be sleeping or initializing');
      }, 30000); // 30 second timeout for cold starts

      const response = await fetch(`${BACKEND_URL}/api/auth/user-status`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      console.log('📡 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error');
        console.error('Backend response not ok:', response.status, errorText);

        // If server error (500+), retry a few times
        if (response.status >= 500 && retries > 0) {
          console.log(`⏳ Server error, retrying... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          return checkUserStatus(retries - 1);
        }

        // For 404 or other client errors, no users exist
        setHasUser(false);
        return;
      }

      const data = await response.json();
      console.log('✅ User status data:', data);

      setHasUser(data.has_user || false);
    } catch (error: any) {
      console.error('❌ User status check error:', {
        name: error.name,
        message: error.message,
        cause: error.cause,
      });

      if (error.name === 'AbortError') {
        console.log('🐌 Request was aborted due to timeout');
        // Retry once more for timeout
        if (retries > 0) {
          console.log(`⏳ Retrying after timeout... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return checkUserStatus(retries - 1);
        }
      } else if (error.message?.includes('Network request failed')) {
        console.log('🌐 Network request failed - possible connectivity issue');
      }

      // Default to no user on error - will show signup screen
      setHasUser(false);
    }
  };

  const login = async (userData: User, accessToken: string) => {
    try {
      console.log('🔐 Logging in user:', { id: userData.id, email: userData.email });
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await AsyncStorage.setItem('authToken', accessToken);
      await AsyncStorage.setItem('isLoggedIn', 'true');
      setUser(userData);
      setToken(accessToken);
      setIsAuthenticated(true);
      setHasUser(true);
      console.log('✅ User logged in successfully with token');
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out user...');

      // Clear all stored authentication data
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('isLoggedIn');

      // Reset all auth state
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      setHasUser(true); // Keep hasUser true so it goes to login, not signup

      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  };

  const getAuthHeader = () => {
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        hasUser,
        isLoading,
        user,
        token,
        login,
        logout,
        checkUserStatus,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
