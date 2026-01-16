import { Router } from 'expo-router';

/**
 * Safely navigate back with fallback to a default route
 * Prevents "not found" errors when back navigation would go to an invalid route
 */
export function safeGoBack(router: Router, fallbackRoute: string = '/(tabs)') {
  try {
    // Check if canGoBack method exists and if we can go back
    if (typeof router.canGoBack === 'function') {
      if (router.canGoBack()) {
        console.log('✅ Going back to previous screen');
        router.back();
      } else {
        console.log('⚠️ Cannot go back, navigating to fallback:', fallbackRoute);
        router.replace(fallbackRoute as any);
      }
    } else {
      // If canGoBack doesn't exist, try back() with error handling
      console.log('⚠️ canGoBack not available, attempting back()');
      try {
        router.back();
      } catch (backError) {
        console.log('⚠️ back() failed, using fallback:', fallbackRoute);
        router.replace(fallbackRoute as any);
      }
    }
  } catch (error) {
    console.error('❌ Navigation error, using fallback:', error);
    // On error, navigate to fallback route
    try {
      router.replace(fallbackRoute as any);
    } catch (replaceError) {
      console.error('❌ Even fallback navigation failed:', replaceError);
    }
  }
}

/**
 * Navigate to a specific route with error handling
 */
export function safeNavigate(router: Router, route: string, options?: { replace?: boolean }) {
  try {
    if (options?.replace) {
      router.replace(route as any);
    } else {
      router.push(route as any);
    }
  } catch (error) {
    console.error('❌ Navigation error:', error);
    // Fallback to tabs on navigation error
    router.replace('/(tabs)' as any);
  }
}

/**
 * Navigate back to a specific tab
 */
export function navigateToTab(router: Router, tab: 'index' | 'transactions' | 'analytics' | 'budget' | 'settings') {
  try {
    router.replace(`/(tabs)/${tab}` as any);
  } catch (error) {
    console.error('❌ Navigation error:', error);
    router.replace('/(tabs)' as any);
  }
}
