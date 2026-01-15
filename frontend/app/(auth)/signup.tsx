import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BACKEND_URL } from '@/config/api';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = async () => {
    // Validation with specific error messages
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address');
      return;
    }

    if (!password.trim()) {
      Alert.alert('Password Required', 'Please enter a password');
      return;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Confirm Password', 'Please confirm your password');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address (e.g., user@example.com)');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Your password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords are the same');
      return;
    }

    if (!BACKEND_URL) {
      Alert.alert('Error', 'Backend URL not configured');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
          name: name.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          Alert.alert('Signup Failed', errorData.detail || 'Failed to create account');
        } catch {
          Alert.alert('Error', `Server error: ${response.status}`);
        }
        return;
      }

      const data = await response.json();

      console.log('✅ Signup successful:', {
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        has_token: !!data.access_token,
      });

      // Login user with JWT token
      await login({
        id: data.user_id,
        email: data.email,
        name: data.name,
      }, data.access_token);

      // Navigate directly to dashboard - smoother UX
      console.log('🚀 Navigating to dashboard...');
      router.replace('/(tabs)');

    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
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
        <ScrollView 
          style={styles.scrollContainer} 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>M₱</Text>
              </View>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Start tracking your M-Pesa expenses today
              </Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Name (Optional)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#74C69D" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor="#778DA9"
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <Text style={styles.inputLabel}>Email Address *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#74C69D" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@example.com"
                  placeholderTextColor="#778DA9"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>

              <Text style={styles.inputLabel}>Password *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#74C69D" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#778DA9"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons 
                    name={showPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#74C69D" 
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Confirm Password *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#74C69D" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#778DA9"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons 
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color="#74C69D" 
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={20} color="#74C69D" />
                <Text style={styles.infoText}>
                  Your password must be at least 6 characters long
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.signupButtonText}>Create Account</Text>
                    <Ionicons 
                      name="checkmark" 
                      size={20} 
                      color="#FFFFFF" 
                      style={styles.buttonIcon}
                    />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.loginPrompt}
                onPress={() => router.replace('/(auth)/login')}
                disabled={isLoading}
              >
                <Text style={styles.loginPromptText}>
                  Already have an account? <Text style={styles.loginPromptLink}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#00B894',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#74C69D',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 14,
    color: '#74C69D',
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#415A77',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  passwordInput: {
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(116, 198, 157, 0.1)',
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(116, 198, 157, 0.3)',
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#74C69D',
    lineHeight: 18,
  },
  signupButton: {
    backgroundColor: '#00B894',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#415A77',
  },
  loginPrompt: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginPromptText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  loginPromptLink: {
    color: '#00B894',
    fontWeight: '700',
  },
});
