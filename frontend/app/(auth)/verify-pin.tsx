import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BACKEND_URL } from '@/config/api';

export default function VerifyPin() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const router = useRouter();
  const { login } = useAuth();

  const MAX_ATTEMPTS = 5;

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      
      if (newPin.length === 4) {
        handleVerifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleVerifyPin = async (pinToVerify: string = pin) => {
    setIsLoading(true);
    try {
      if (!BACKEND_URL) {
        Alert.alert('Configuration Error', 'Backend URL not configured. Please check your setup.');
        setPin('');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin: pinToVerify }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setAttempts(prev => prev + 1);
          setPin('');

          if (attempts >= MAX_ATTEMPTS - 1) {
            Alert.alert(
              'Too Many Attempts',
              'You have exceeded the maximum number of PIN attempts. Please restart the app.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Invalid PIN',
              `Incorrect PIN. ${MAX_ATTEMPTS - attempts - 1} attempts remaining.`,
              [{ text: 'Try Again' }]
            );
          }
          return;
        } else if (response.status === 404) {
          Alert.alert(
            'Setup Required',
            'No user found. Please setup your PIN first.',
            [{ text: 'Setup PIN', onPress: () => router.replace('/(auth)/setup-pin') }]
          );
          return;
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = await response.json();
      await login(data.user_id);
      router.replace('/(tabs)');

    } catch (error) {
      console.error('Verify PIN error:', error);
      setPin('');

      if (error.message.includes('fetch')) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to server. Please ensure the backend server is running and try again.'
        );
      } else {
        Alert.alert('Error', 'Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>M₱</Text>
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Enter your 4-digit PIN to access your expense tracker
            </Text>
          </View>

          <View style={styles.pinContainer}>
            <View style={styles.pinDots}>
              {[1, 2, 3, 4].map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    pin.length > index && styles.pinDotFilled,
                  ]}
                />
              ))}
            </View>
            
            {attempts > 0 && (
              <Text style={styles.attemptsText}>
                {MAX_ATTEMPTS - attempts} attempts remaining
              </Text>
            )}
          </View>

          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keypadButton}
                onPress={() => handlePinInput(num.toString())}
                disabled={isLoading || attempts >= MAX_ATTEMPTS}
              >
                <Text style={styles.keypadButtonText}>{num}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity 
              style={styles.keypadButton}
              onPress={() => handlePinInput('0')}
              disabled={isLoading || attempts >= MAX_ATTEMPTS}
            >
              <Text style={styles.keypadButtonText}>0</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={handleDelete}
              disabled={isLoading || attempts >= MAX_ATTEMPTS}
            >
              <Ionicons name="backspace" size={24} color="#74C69D" />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => router.push('/(auth)/reset-pin')}
            >
              <Text style={styles.forgotButtonText}>Forgot PIN?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#74C69D',
    textAlign: 'center',
    lineHeight: 22,
  },
  pinContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#415A77',
  },
  pinDotFilled: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
  },
  attemptsText: {
    color: '#E74C3C',
    fontSize: 14,
    fontWeight: '500',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
  },
  keypadButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1B263B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#415A77',
  },
  keypadButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  forgotButton: {
    paddingVertical: 16,
  },
  forgotButtonText: {
    color: '#74C69D',
    fontSize: 16,
    fontWeight: '500',
  },
});
