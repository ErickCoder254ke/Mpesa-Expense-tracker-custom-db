import { Platform, Alert, Linking } from 'react-native';

// Conditionally import PermissionsAndroid only on native platforms
let PermissionsAndroid: any = null;
if (Platform.OS === 'android') {
  PermissionsAndroid = require('react-native').PermissionsAndroid;
}

export interface SMSPermissionStatus {
  canReadSMS: boolean;
  canReceiveSMS: boolean;
  hasRequestedPermissions: boolean;
  shouldShowRationale: boolean;
}

export interface SMSPermissionConfig {
  requestReadSMS: boolean;
  requestReceiveSMS: boolean;
  showEducationalDialog: boolean;
}

class SMSPermissionsService {
  private hasShownEducationalDialog = false;

  /**
   * Check current SMS permission status
   */
  async checkPermissions(): Promise<SMSPermissionStatus> {
    if (Platform.OS !== 'android' || !PermissionsAndroid) {
      return {
        canReadSMS: false,
        canReceiveSMS: false,
        hasRequestedPermissions: false,
        shouldShowRationale: false,
      };
    }

    try {
      const readSMSStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
      const receiveSMSStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);

      return {
        canReadSMS: readSMSStatus,
        canReceiveSMS: receiveSMSStatus,
        hasRequestedPermissions: readSMSStatus || receiveSMSStatus,
        shouldShowRationale: await this.shouldShowRequestPermissionRationale(),
      };
    } catch (error) {
      console.error('Error checking SMS permissions:', error);
      return {
        canReadSMS: false,
        canReceiveSMS: false,
        hasRequestedPermissions: false,
        shouldShowRationale: false,
      };
    }
  }

  /**
   * Request SMS permissions with educational dialog
   */
  async requestPermissions(config: SMSPermissionConfig): Promise<SMSPermissionStatus> {
    if (Platform.OS !== 'android' || !PermissionsAndroid) {
      return this.checkPermissions();
    }

    // Show educational dialog if requested
    if (config.showEducationalDialog && !this.hasShownEducationalDialog) {
      const shouldProceed = await this.showEducationalDialog();
      if (!shouldProceed) {
        return this.checkPermissions();
      }
      this.hasShownEducationalDialog = true;
    }

    try {
      // Check if we're running in Expo Go
      const isExpoGo = __DEV__ && !process.env.EXPO_PUBLIC_BUILD_TYPE;

      if (isExpoGo) {
        // In Expo Go, permissions might be limited
        Alert.alert(
          'Expo Go Limitation',
          'SMS permissions may not work properly in Expo Go. For full functionality, please build a development build or production app.',
          [{ text: 'OK' }]
        );
      }

      const permissionsToRequest = [];

      if (config.requestReadSMS) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.READ_SMS);
      }

      if (config.requestReceiveSMS) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
      }

      if (permissionsToRequest.length === 0) {
        return this.checkPermissions();
      }

      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      return {
        canReadSMS: config.requestReadSMS ? results[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED : false,
        canReceiveSMS: config.requestReceiveSMS ? results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED : false,
        hasRequestedPermissions: true,
        shouldShowRationale: await this.shouldShowRequestPermissionRationale(),
      };
    } catch (error) {
      console.error('Error requesting SMS permissions:', error);
      Alert.alert(
        'Permission Error',
        'Failed to request SMS permissions. This might be due to running in Expo Go. Try building a development build for full SMS functionality.',
        [{ text: 'OK' }]
      );
      return this.checkPermissions();
    }
  }

  /**
   * Show educational dialog explaining why SMS access is needed
   */
  private showEducationalDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        'SMS Access Required',
        'To automatically track your M-Pesa transactions, this app needs permission to read SMS messages.\n\n' +
        '• Only M-Pesa transaction messages will be processed\n' +
        '• Your messages remain private and secure\n' +
        '• You can disable this feature at any time\n' +
        '• Manual transaction entry is always available',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Grant Permission',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Show rationale for why permissions are needed
   */
  private async shouldShowRequestPermissionRationale(): Promise<boolean> {
    if (Platform.OS !== 'android' || !PermissionsAndroid) {
      return false;
    }

    try {
      const readSMSRationale = await PermissionsAndroid.shouldShowRequestPermissionRationale(
        PermissionsAndroid.PERMISSIONS.READ_SMS
      );
      const receiveSMSRationale = await PermissionsAndroid.shouldShowRequestPermissionRationale(
        PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
      );

      return readSMSRationale || receiveSMSRationale;
    } catch (error) {
      return false;
    }
  }

  /**
   * Open device settings for the app
   */
  async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening settings:', error);
    }
  }

  /**
   * Show permission denied dialog with options
   */
  showPermissionDeniedDialog(): Promise<'settings' | 'manual' | 'cancel'> {
    return new Promise((resolve) => {
      Alert.alert(
        'SMS Permission Required',
        'SMS access is needed to automatically track M-Pesa transactions. You can:\n\n' +
        '• Enable permissions in Settings\n' +
        '• Continue with manual transaction entry',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve('cancel'),
          },
          {
            text: 'Manual Entry',
            onPress: () => resolve('manual'),
          },
          {
            text: 'Open Settings',
            onPress: () => resolve('settings'),
          },
        ],
        { cancelable: false }
      );
    });
  }

  /**
   * Check if the app can request SMS permissions
   */
  async canRequestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android' || !PermissionsAndroid) {
      return false;
    }

    const status = await this.checkPermissions();
    return !status.hasRequestedPermissions || status.shouldShowRationale;
  }

  /**
   * Get permission status for display
   */
  getPermissionStatusText(status: SMSPermissionStatus): string {
    if (Platform.OS !== 'android') {
      return 'SMS access not available on iOS';
    }

    if (status.canReadSMS && status.canReceiveSMS) {
      return 'SMS access granted';
    }

    if (status.canReceiveSMS && !status.canReadSMS) {
      return 'New SMS detection enabled';
    }

    if (status.hasRequestedPermissions && !status.shouldShowRationale) {
      return 'SMS access denied - check Settings';
    }

    return 'SMS access not granted';
  }

  /**
   * Reset permission request state (for testing)
   */
  resetEducationalDialog(): void {
    this.hasShownEducationalDialog = false;
  }
}

export const smsPermissionsService = new SMSPermissionsService();
