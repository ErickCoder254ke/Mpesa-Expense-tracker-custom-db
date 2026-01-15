import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, hasUser, isLoading } = useAuth();
  const [minLoadingComplete, setMinLoadingComplete] = React.useState(false);

  // Ensure minimum splash screen time for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingComplete(true);
    }, 1500); // Minimum 1.5 seconds splash

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Don't navigate until both loading is complete AND minimum time has passed
    if (isLoading || !minLoadingComplete) return;

    const timer = setTimeout(() => {
      console.log('🔍 Navigation check:', { isAuthenticated, hasUser, isLoading });

      if (isAuthenticated) {
        // User is logged in, go to main app
        console.log('✅ User authenticated, navigating to tabs');
        router.replace('/(tabs)');
      } else if (hasUser) {
        // Users exist but not logged in, go to login
        console.log('🔐 User not authenticated but users exist, navigating to login');
        router.replace('/(auth)/login');
      } else {
        // No users exist, go to signup
        console.log('🆕 No users found, navigating to signup');
        router.replace('/(auth)/signup');
      }
    }, 500); // Small delay after loading complete

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasUser, isLoading, minLoadingComplete, router]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>M₱</Text>
          </View>
          <Text style={styles.title}>M-Pesa Expense Tracker</Text>
          <Text style={styles.subtitle}>Track • Budget • Analyze</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B894" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#74C69D',
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#74C69D',
    fontWeight: '500',
  },
});
