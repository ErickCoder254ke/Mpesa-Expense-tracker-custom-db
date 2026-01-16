import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND_URL } from '@/config/api';
import { router } from 'expo-router';

/**
 * Get the authentication token from storage
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Get headers with authentication if token exists
 */
export const getAuthHeaders = async (): Promise<HeadersInit> => {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Make an authenticated API request
 * @param endpoint - API endpoint path
 * @param options - Fetch options (can include signal for AbortController)
 */
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = `${BACKEND_URL}${endpoint}`;
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  // Handle 401 Unauthorized - token expired or invalid
  if (response.status === 401) {
    console.warn('⚠️ Unauthorized request - token expired, redirecting to login');
    // Clear auth data
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('userData');
    await AsyncStorage.removeItem('isLoggedIn');

    // Notify AuthContext about logout (works on web)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('app:logout'));
    }

    // Redirect to login screen with correct route
    try {
      router.replace('/(auth)/login');
    } catch (navError) {
      console.error('Navigation error:', navError);
      // If navigation fails, at least the data is cleared
    }
  }

  return response;
};

/**
 * Make an authenticated GET request
 * @param endpoint - API endpoint path
 * @param options - Optional request options (e.g., signal for AbortController)
 */
export const apiGet = async (endpoint: string, options?: RequestInit): Promise<any> => {
  const response = await apiRequest(endpoint, {
    method: 'GET',
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Make an authenticated POST request
 * @param endpoint - API endpoint path
 * @param data - Request body data
 * @param options - Optional request options (e.g., signal for AbortController)
 */
export const apiPost = async (endpoint: string, data: any, options?: RequestInit): Promise<any> => {
  const response = await apiRequest(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Make an authenticated PUT request
 * @param endpoint - API endpoint path
 * @param data - Request body data
 * @param options - Optional request options (e.g., signal for AbortController)
 */
export const apiPut = async (endpoint: string, data: any, options?: RequestInit): Promise<any> => {
  const response = await apiRequest(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Make an authenticated DELETE request
 * @param endpoint - API endpoint path
 * @param options - Optional request options (e.g., signal for AbortController)
 */
export const apiDelete = async (endpoint: string, options?: RequestInit): Promise<any> => {
  const response = await apiRequest(endpoint, {
    method: 'DELETE',
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  // DELETE might not return JSON
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
};
