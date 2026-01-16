import Constants from 'expo-constants';

/**
 * Get the backend URL from environment variables or app.json extra config
 * Priority: Environment Variable > app.json extra > Default Fallback
 */
export const getBackendUrl = (): string => {
  console.log('🔧 Backend URL Resolution:');
  console.log('- Environment variable:', process.env.EXPO_PUBLIC_BACKEND_URL);
  console.log('- App.json extra:', Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL);

  // First priority: Environment variable (allows override in Render/Railway)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    console.log('✅ Using environment variable URL');
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // Second priority: app.json extra config (fallback for development)
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL) {
    console.log('✅ Using app.json extra config URL');
    return Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL;
  }

  // Final fallback (should rarely be used)
  const defaultUrl = 'https://mpesa-expense-tracker-custom-db.onrender.com';
  console.log('⚠️  Using default fallback URL:', defaultUrl);
  return defaultUrl;
};

export const BACKEND_URL = getBackendUrl();

/**
 * Log the current backend configuration for debugging
 */
export const logBackendConfig = () => {
  console.log('🔧 Backend Configuration:');
  console.log('- Environment variable:', process.env.EXPO_PUBLIC_BACKEND_URL);
  console.log('- App.json extra:', Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL);
  console.log('- Final URL:', BACKEND_URL);

  // Log Constants.expoConfig for debugging (using non-deprecated API)
  console.log('🔍 Expo Config:', {
    extra: Constants.expoConfig?.extra,
    name: Constants.expoConfig?.name,
    version: Constants.expoConfig?.version
  });

  if (BACKEND_URL.includes('localhost')) {
    console.log('⚠️  Using localhost - this may not work on physical devices');
    console.log('💡 For physical devices, set EXPO_PUBLIC_BACKEND_URL to your machine\'s IP');
  } else if (BACKEND_URL.includes('onrender.com')) {
    console.log('✅ Using Render hosted backend - works on all devices');
  }
};
