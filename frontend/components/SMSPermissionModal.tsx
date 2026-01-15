import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSMSPermissions } from '../hooks/useSMSPermissions';
import { smsPermissionsService } from '../services/smsPermissions';

interface SMSPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
  onManualMode: () => void;
}

export const SMSPermissionModal: React.FC<SMSPermissionModalProps> = ({
  visible,
  onClose,
  onPermissionGranted,
  onManualMode,
}) => {
  const { requestPermissions, permissionStatus, isLoading } = useSMSPermissions();
  const [step, setStep] = useState<'intro' | 'requesting' | 'denied' | 'granted'>('intro');

  const handleRequestPermissions = async () => {
    setStep('requesting');

    try {
      const result = await requestPermissions({
        requestReadSMS: true,
        requestReceiveSMS: true,
        showEducationalDialog: false, // We're showing our own
      });

      // Wait a moment for state to update
      setTimeout(() => {
        if (result.canReadSMS || result.canReceiveSMS) {
          setStep('granted');
          setTimeout(() => {
            onPermissionGranted();
            onClose();
          }, 1500);
        } else {
          setStep('denied');
        }
      }, 500);
    } catch (error) {
      console.error('Permission request error:', error);
      setStep('denied');
    }
  };

  const handleOpenSettings = async () => {
    try {
      await smsPermissionsService.openAppSettings();
      onClose();
    } catch (error) {
      console.error('Error opening settings:', error);
      Alert.alert('Error', 'Could not open settings. Please open them manually.');
    }
  };

  const handleManualMode = () => {
    onManualMode();
    onClose();
  };

  const renderIntroStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={64} color="#00B894" />
        <Text style={styles.title}>Enable SMS Auto-Import</Text>
        <Text style={styles.subtitle}>
          Automatically track your M-Pesa transactions
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.benefitsList}>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color="#00B894" />
            <Text style={styles.benefitText}>
              Automatically import M-Pesa transactions
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color="#00B894" />
            <Text style={styles.benefitText}>
              Reduce manual data entry by 90%
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color="#00B894" />
            <Text style={styles.benefitText}>
              Smart categorization of transactions
            </Text>
          </View>
          <View style={styles.benefitItem}>
            <Ionicons name="checkmark-circle" size={24} color="#00B894" />
            <Text style={styles.benefitText}>
              Real-time transaction tracking
            </Text>
          </View>
        </View>

        <View style={styles.privacySection}>
          <Text style={styles.privacyTitle}>Your Privacy is Protected</Text>
          <View style={styles.privacyItem}>
            <Ionicons name="lock-closed" size={20} color="#74C69D" />
            <Text style={styles.privacyText}>
              Only M-Pesa messages are processed
            </Text>
          </View>
          <View style={styles.privacyItem}>
            <Ionicons name="eye-off" size={20} color="#74C69D" />
            <Text style={styles.privacyText}>
              Personal messages remain private
            </Text>
          </View>
          <View style={styles.privacyItem}>
            <Ionicons name="shield" size={20} color="#74C69D" />
            <Text style={styles.privacyText}>
              Data stored securely on your device
            </Text>
          </View>
          <View style={styles.privacyItem}>
            <Ionicons name="settings" size={20} color="#74C69D" />
            <Text style={styles.privacyText}>
              Can be disabled anytime in settings
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleRequestPermissions}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>
            Enable SMS Import
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={handleManualMode}
        >
          <Text style={styles.secondaryButtonText}>
            Continue with Manual Entry
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRequestingStep = () => (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Ionicons name="hourglass" size={64} color="#00B894" />
        <Text style={styles.title}>Requesting Permission</Text>
        <Text style={styles.subtitle}>
          Please grant SMS access in the system dialog.{"\n"}Note: This may not work in Expo Go.
        </Text>
      </View>
    </View>
  );

  const renderGrantedStep = () => (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Ionicons name="checkmark-circle" size={64} color="#00B894" />
        <Text style={styles.title}>Permission Granted!</Text>
        <Text style={styles.subtitle}>
          SMS auto-import is now enabled
        </Text>
      </View>
    </View>
  );

  const renderDeniedStep = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="warning" size={64} color="#E74C3C" />
        <Text style={styles.title}>Permission Denied</Text>
        <Text style={styles.subtitle}>
          SMS access is required for auto-import
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.deniedText}>
          To enable automatic M-Pesa transaction import, you can:
        </Text>
        
        <View style={styles.optionsList}>
          <View style={styles.optionItem}>
            <Ionicons name="settings-outline" size={24} color="#74C69D" />
            <Text style={styles.optionText}>
              Open Settings and grant SMS permissions
            </Text>
          </View>
          <View style={styles.optionItem}>
            <Ionicons name="create-outline" size={24} color="#74C69D" />
            <Text style={styles.optionText}>
              Continue with manual transaction entry
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={handleOpenSettings}
        >
          <Text style={styles.primaryButtonText}>
            Open Settings
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={handleManualMode}
        >
          <Text style={styles.secondaryButtonText}>
            Manual Entry
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (step) {
      case 'intro':
        return renderIntroStep();
      case 'requesting':
        return renderRequestingStep();
      case 'granted':
        return renderGrantedStep();
      case 'denied':
        return renderDeniedStep();
      default:
        return renderIntroStep();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#74C69D" />
          </TouchableOpacity>
        </View>
        {renderContent()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  closeButton: {
    padding: 8,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#74C69D',
    textAlign: 'center',
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  benefitsList: {
    marginBottom: 32,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  benefitText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  privacySection: {
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  privacyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  privacyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  privacyText: {
    fontSize: 14,
    color: '#74C69D',
    marginLeft: 12,
    flex: 1,
  },
  deniedText: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
    marginBottom: 24,
  },
  optionsList: {
    marginBottom: 32,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B263B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
    flex: 1,
  },
  actions: {
    paddingBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#00B894',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#415A77',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#74C69D',
  },
});
