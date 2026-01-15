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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { BACKEND_URL } from '@/config/api';

type Step = 'setup' | 'confirm' | 'security';

const SECURITY_QUESTIONS = [
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your favorite color?",
  "What was your first phone number?",
];

export default function SetupPin() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<Step>('setup');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handlePinInput = (digit: string) => {
    if (step === 'setup') {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 4) {
        const newConfirmPin = confirmPin + digit;
        setConfirmPin(newConfirmPin);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'setup') {
      setPin(prev => prev.slice(0, -1));
    } else if (step === 'confirm') {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleContinue = () => {
    if (step === 'setup' && pin.length === 4) {
      setStep('confirm');
    } else if (step === 'confirm' && confirmPin.length === 4) {
      if (pin !== confirmPin) {
        Alert.alert('Error', 'PINs do not match. Please try again.');
        setConfirmPin('');
        return;
      }
      setStep('security');
    }
  };

  const handleSetupPin = async () => {
    if (!securityAnswer.trim()) {
      Alert.alert('Error', 'Please enter your security answer');
      return;
    }

    if (!BACKEND_URL) {
      Alert.alert('Error', 'Backend URL not configured');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/setup-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          pin,
          security_question: securityQuestion,
          security_answer: securityAnswer,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          Alert.alert('Error', errorData.detail || 'Failed to setup PIN');
        } catch {
          Alert.alert('Error', `Server error: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      await login(data.user_id);
      Alert.alert(
        'Success',
        'PIN and security question setup successful! Welcome to M-Pesa Expense Tracker.',
        [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
      );

    } catch (error) {
      console.error('Setup PIN error:', error);
      Alert.alert('Error', 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPinStep = () => {
    const currentPin = step === 'setup' ? pin : confirmPin;
    const title = step === 'setup' ? 'Create Your PIN' : 'Confirm Your PIN';
    const subtitle = step === 'setup'
      ? 'Choose a 4-digit PIN to secure your expense tracker'
      : 'Enter your PIN again to confirm';

    return (
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>M₱</Text>
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
          
          {step === 'confirm' && (
            <TouchableOpacity
              style={styles.backToSetupButton}
              onPress={() => {
                setStep('setup');
                setConfirmPin('');
                setPin('');
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
              style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                Continue
              </Text>
              <Ionicons 
                name="arrow-forward" 
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

  const renderSecurityStep = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={48} color="#00B894" />
          </View>
          
          <Text style={styles.title}>Security Question</Text>
          <Text style={styles.subtitle}>
            Set up a security question to recover your PIN if you forget it
          </Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Choose a Question</Text>
          <View style={styles.questionSelector}>
            {SECURITY_QUESTIONS.map((question, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.questionOption,
                  securityQuestion === question && styles.questionOptionSelected
                ]}
                onPress={() => setSecurityQuestion(question)}
              >
                <View style={styles.questionOptionContent}>
                  <Text 
                    style={[
                      styles.questionOptionText,
                      securityQuestion === question && styles.questionOptionTextSelected
                    ]}
                    numberOfLines={2}
                  >
                    {question}
                  </Text>
                  {securityQuestion === question && (
                    <Ionicons name="checkmark-circle" size={24} color="#00B894" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
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

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#74C69D" />
            <Text style={styles.infoText}>
              Keep your answer memorable but secure. You'll need it to reset your PIN.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButtonSecondary}
            onPress={() => {
              setStep('confirm');
              setSecurityAnswer('');
            }}
            disabled={isLoading}
          >
            <Ionicons name="arrow-back" size={20} color="#74C69D" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.continueButton,
              (!securityAnswer.trim() || isLoading) && styles.continueButtonDisabled
            ]}
            onPress={handleSetupPin}
            disabled={!securityAnswer.trim() || isLoading}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? 'Setting up...' : 'Complete Setup'}
            </Text>
            {!isLoading && (
              <Ionicons 
                name="checkmark" 
                size={20} 
                color="#FFFFFF" 
                style={styles.buttonIcon}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {step === 'security' ? renderSecurityStep() : renderPinStep()}
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
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
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
    transition: 'all 0.2s ease',
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
  formContainer: {
    flex: 1,
    marginVertical: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#74C69D',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionSelector: {
    marginBottom: 24,
    gap: 12,
  },
  questionOption: {
    backgroundColor: '#1B263B',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#415A77',
  },
  questionOptionSelected: {
    borderColor: '#00B894',
    backgroundColor: 'rgba(0, 184, 148, 0.1)',
  },
  questionOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  questionOptionText: {
    fontSize: 15,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 22,
  },
  questionOptionTextSelected: {
    color: '#00B894',
    fontWeight: '600',
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
    marginBottom: 16,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(116, 198, 157, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(116, 198, 157, 0.3)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#74C69D',
    lineHeight: 20,
  },
  footer: {
    paddingBottom: 20,
    paddingTop: 10,
  },
  backButtonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 12,
    gap: 8,
  },
  backButtonText: {
    color: '#74C69D',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
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
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
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
