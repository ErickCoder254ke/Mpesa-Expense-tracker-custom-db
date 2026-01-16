import Constants from 'expo-constants';

/**
 * Get the backend URL from environment variables or app.json extra config
 * Priority: Environment Variable > app.json extra > ERROR (no defaults)
 */
export const getBackendUrl = (): string => {
  console.log('🔧 Backend URL Resolution:');
  console.log('- Environment variable:', process.env.EXPO_PUBLIC_BACKEND_URL);
  console.log('- App.json extra:', Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL);

  // First priority: Environment variable (production deployment)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    console.log('✅ Using environment variable URL:', process.env.EXPO_PUBLIC_BACKEND_URL);
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // Second priority: app.json extra config (local development override)
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL) {
    console.log('✅ Using app.json extra config URL:', Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL);
    return Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL;
  }

  // NO DEFAULT FALLBACK - Force proper configuration
  const errorMessage =
    '❌ EXPO_PUBLIC_BACKEND_URL is not configured!\n' +
    'Set it via:\n' +
    '1. Environment variable: EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com\n' +
    '2. Or in app.json: extra.EXPO_PUBLIC_BACKEND_URL\n' +
    'The app cannot function without a backend URL.';

  console.error(errorMessage);
  throw new Error('EXPO_PUBLIC_BACKEND_URL environment variable is required');
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
