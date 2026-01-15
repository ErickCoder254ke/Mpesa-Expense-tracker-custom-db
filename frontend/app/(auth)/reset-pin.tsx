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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BACKEND_URL } from '@/config/api';

type Step = 'verify' | 'newPin' | 'confirmPin';

export default function ResetPin() {
  const [step, setStep] = useState<Step>('verify');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const router = useRouter();

  React.useEffect(() => {
    fetchSecurityQuestion();
  }, []);

  const fetchSecurityQuestion = async () => {
    try {
      if (!BACKEND_URL) {
        Alert.alert('Error', 'Backend URL not configured');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/security-question`);
      if (response.ok) {
        const data = await response.json();
        setSecurityQuestion(data.question);
      } else {
        Alert.alert(
          'Error',
          'Could not fetch security question. Please contact support.',
          [{ text: 'Go Back', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('Error fetching security question:', error);
      Alert.alert(
        'Connection Error',
        'Cannot connect to server. Please try again later.',
        [{ text: 'Go Back', onPress: () => router.back() }]
      );
    }
  };

  const handlePinInput = (digit: string) => {
    const currentStep = step;
    if (currentStep === 'newPin') {
      if (newPin.length < 4) {
        setNewPin(prev => prev + digit);
      }
    } else if (currentStep === 'confirmPin') {
      if (confirmPin.length < 4) {
        setConfirmPin(prev => prev + digit);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'newPin') {
      setNewPin(prev => prev.slice(0, -1));
    } else if (step === 'confirmPin') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleVerifyAnswer = async () => {
    if (!securityAnswer.trim()) {
      Alert.alert('Error', 'Please enter your security answer');
      return;
    }

    setIsLoading(true);
    try {
      if (!BACKEND_URL) {
        Alert.alert('Error', 'Backend URL not configured');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/verify-security-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answer: securityAnswer }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert('Incorrect Answer', 'The security answer is incorrect. Please try again.');
          setSecurityAnswer('');
        } else {
          const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
          Alert.alert('Error', errorData.detail || 'Failed to verify security answer');
        }
        return;
      }

      setStep('newPin');
    } catch (error) {
      console.error('Verify answer error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (step === 'newPin' && newPin.length === 4) {
      setStep('confirmPin');
    } else if (step === 'confirmPin' && confirmPin.length === 4) {
      handleResetPin();
    }
  };

  const handleResetPin = async () => {
    if (newPin !== confirmPin) {
      Alert.alert('Error', 'PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    if (newPin.length !== 4) {
      Alert.alert('Error', 'PIN must be 4 digits');
      return;
    }

    setIsLoading(true);
    try {
      if (!BACKEND_URL) {
        Alert.alert('Error', 'Backend URL not configured');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/reset-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          new_pin: newPin,
          security_answer: securityAnswer 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        Alert.alert('Error', errorData.detail || 'Failed to reset PIN');
        return;
      }

      Alert.alert(
        'Success',
        'Your PIN has been reset successfully!',
        [
          {
            text: 'Login',
            onPress: () => {
              setNewPin('');
              setConfirmPin('');
              setSecurityAnswer('');
              router.replace('/(auth)/verify-pin');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Reset PIN error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderVerifyStep = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#74C69D" />
        </TouchableOpacity>
        
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={48} color="#00B894" />
        </View>
        
        <Text style={styles.title}>Reset Your PIN</Text>
        <Text style={styles.subtitle}>
          Answer your security question to verify your identity
        </Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.questionLabel}>Security Question</Text>
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>{securityQuestion || 'Loading...'}</Text>
        </View>

        <Text style={styles.inputLabel}>Your Answer</Text>
        <TextInput
          style={styles.input}
          value={securityAnswer}
          onChangeText={setSecurityAnswer}
          placeholder="Enter your answer"
          placeholderTextColor="#778DA9"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            (!securityAnswer.trim() || isLoading) && styles.primaryButtonDisabled
          ]}
          onPress={handleVerifyAnswer}
          disabled={!securityAnswer.trim() || isLoading}
        >
          <Text style={styles.primaryButtonText}>
            {isLoading ? 'Verifying...' : 'Verify Answer'}
          </Text>
          {!isLoading && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPinStep = () => {
    const currentPin = step === 'newPin' ? newPin : confirmPin;
    const title = step === 'newPin' ? 'Create New PIN' : 'Confirm New PIN';
    const subtitle = step === 'newPin'
      ? 'Choose a new 4-digit PIN'
      : 'Enter your new PIN again to confirm';

    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="key" size={48} color="#00B894" />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        <View style={styles.pinContainer}>
          <View style={styles.pinDots}>
            {[1, 2, 3, 4].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.pinDot,
                  currentPin.length > index && styles.pinDotFilled,
                ]}
              />
            ))}
          </View>
          
          {step === 'confirmPin' && (
            <TouchableOpacity
              style={styles.backToSetupButton}
              onPress={() => {
                setStep('newPin');
                setConfirmPin('');
                setNewPin('');
              }}
            >
              <Ionicons name="arrow-back" size={16} color="#74C69D" />
              <Text style={styles.backToSetupText}>Start over</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.keypadSection}>
          <View style={styles.keypad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.keypadButton}
                onPress={() => handlePinInput(num.toString())}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.keypadButtonText}>{num}</Text>
              </TouchableOpacity>
            ))}
            
            <View style={styles.keypadEmpty} />
            
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={() => handlePinInput('0')}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.keypadButtonText}>0</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.keypadButton}
              onPress={handleDelete}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="backspace-outline" size={26} color="#74C69D" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          {currentPin.length === 4 && (
            <TouchableOpacity
              style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>
                {isLoading ? 'Processing...' : step === 'newPin' ? 'Continue' : 'Reset PIN'}
              </Text>
              <Ionicons 
                name={isLoading ? "hourglass-outline" : "arrow-forward"} 
                size={20} 
                color="#FFFFFF" 
                style={styles.buttonIcon}
              />
            </TouchableOpacity>
          )}
          
          {currentPin.length < 4 && (
            <View style={styles.placeholderButton}>
              <Text style={styles.placeholderText}>
                Enter {4 - currentPin.length} more digit{4 - currentPin.length !== 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {step === 'verify' ? renderVerifyStep() : renderPinStep()}
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
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(0, 184, 148, 0.3)',
  },
  title: {
    fontSize: 26,
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
    flex: 1,
    justifyContent: 'center',
    marginVertical: 32,
  },
  questionLabel: {
    fontSize: 14,
    color: '#74C69D',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionBox: {
    backgroundColor: '#1B263B',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#415A77',
    marginBottom: 24,
  },
  questionText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#74C69D',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1B263B',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#415A77',
  },
  pinContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#415A77',
  },
  pinDotFilled: {
    backgroundColor: '#00B894',
    borderColor: '#00B894',
    transform: [{ scale: 1.1 }],
  },
  backToSetupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  backToSetupText: {
    color: '#74C69D',
    fontSize: 14,
    fontWeight: '500',
  },
  keypadSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 320,
  },
  keypadButton: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: '#1B263B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#415A77',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  keypadEmpty: {
    width: 75,
    height: 75,
  },
  keypadButtonText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  primaryButton: {
    backgroundColor: '#00B894',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00B894',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  placeholderButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#415A77',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#778DA9',
    fontSize: 15,
    fontWeight: '500',
  },
});
