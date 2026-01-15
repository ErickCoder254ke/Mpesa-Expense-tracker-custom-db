import { BACKEND_URL, logBackendConfig } from '@/config/api';

/**
 * Test utility to verify backend connectivity and category loading
 */

export const testBackendConnection = async () => {
  
  console.log('🔍 Testing backend connection...');
  console.log('Backend URL:', BACKEND_URL);
  
  const results = {
    backend_url: BACKEND_URL,
    connection: false,
    auth_status: false,
    categories: false,
    categories_count: 0,
    errors: [] as string[]
  };

  try {
    // Test basic connectivity
    console.log('Testing basic connectivity...');
    const rootResponse = await fetch(`${BACKEND_URL}/api/`);
    if (rootResponse.ok) {
      results.connection = true;
      console.log('✅ Backend connection successful');
    } else {
      throw new Error(`Backend returned status ${rootResponse.status}`);
    }
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    results.errors.push(`Connection failed: ${error}`);
  }

  try {
    // Test user status
    console.log('Testing user status...');
    const statusResponse = await fetch(`${BACKEND_URL}/api/auth/user-status`);
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      results.auth_status = statusData.has_user;
      console.log('✅ User status check successful:', statusData);
    } else {
      throw new Error(`Status check returned ${statusResponse.status}`);
    }
  } catch (error) {
    console.error('❌ User status check failed:', error);
    results.errors.push(`Status check failed: ${error}`);
  }

  try {
    // Test categories
    console.log('Testing categories endpoint...');
    const categoriesResponse = await fetch(`${BACKEND_URL}/api/categories/`);
    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      results.categories = true;
      results.categories_count = categoriesData.length;
      console.log('✅ Categories loaded successfully:', categoriesData.length, 'categories');
      console.log('Categories:', categoriesData.map((c: any) => ({ id: c.id, name: c.name })));
    } else {
      throw new Error(`Categories returned status ${categoriesResponse.status}`);
    }
  } catch (error) {
    console.error('❌ Categories loading failed:', error);
    results.errors.push(`Categories failed: ${error}`);
  }

  console.log('🏁 Backend test completed:', results);
  return results;
};

export const logEnvironmentInfo = () => {
  console.log('📋 Environment Information:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- Platform:', process.env.EXPO_OS);
  logBackendConfig();
};
