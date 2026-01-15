import { BACKEND_URL } from '@/config/api';

export const debugBackendConnection = async () => {
  console.log('🔍 Debugging Backend Connection...');
  console.log('Target URL:', BACKEND_URL);
  
  const tests = [
    { name: 'Root endpoint', url: `${BACKEND_URL}/` },
    { name: 'API root', url: `${BACKEND_URL}/api/` },
    { name: 'Health check', url: `${BACKEND_URL}/health` },
    { name: 'User status', url: `${BACKEND_URL}/api/auth/user-status` },
  ];

  for (const test of tests) {
    try {
      console.log(`\n📡 Testing: ${test.name}`);
      console.log(`URL: ${test.url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(test.url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        try {
          const data = await response.text();
          console.log(`Response:`, data.substring(0, 200) + (data.length > 200 ? '...' : ''));
        } catch (e) {
          console.log(`Response: [Binary or invalid data]`);
        }
      }
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`❌ Timeout: Request took more than 10 seconds`);
      } else {
        console.log(`❌ Error: ${error.message}`);
        console.log(`Error type: ${error.name}`);
      }
    }
  }
  
  console.log('\n🏁 Backend debugging complete');
};
