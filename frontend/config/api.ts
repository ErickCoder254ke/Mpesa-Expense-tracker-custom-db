import Constants from 'expo-constants';

/**
 * Get the backend URL from environment variables or app.json extra config
 */
export const getBackendUrl = (): string => {
  console.log('🔧 Backend URL Resolution:');
  console.log('- Environment variable:', process.env.EXPO_PUBLIC_BACKEND_URL);
  console.log('- App.json extra:', Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL);

  // First try from app.json extra config (production Render URL)
  if (Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL) {
    console.log('✅ Using app.json extra config URL (Render)');
    return Constants.expoConfig.extra.EXPO_PUBLIC_BACKEND_URL;
  }

  // Then try environment variable (for development override)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    console.log('✅ Using environment variable URL');
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // Finally fall back to Render URL (default production)
  const renderUrl = 'https://mpesa-expense-tracker-custom-db.onrender.com';
  console.log('✅ Using default Render URL:', renderUrl);
  return renderUrl;
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
