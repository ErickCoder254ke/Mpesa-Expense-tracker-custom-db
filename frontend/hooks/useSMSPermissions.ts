import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import { 
  smsPermissionsService, 
  SMSPermissionStatus, 
  SMSPermissionConfig 
} from '../services/smsPermissions';

export interface UseSMSPermissionsReturn {
  permissionStatus: SMSPermissionStatus;
  isLoading: boolean;
  isSupported: boolean;
  requestPermissions: (config: SMSPermissionConfig) => Promise<SMSPermissionStatus>;
  checkPermissions: () => Promise<void>;
  openSettings: () => void;
  showPermissionDialog: () => Promise<'settings' | 'manual' | 'cancel'>;
  canRequestPermissions: boolean;
  permissionStatusText: string;
}

export const useSMSPermissions = (): UseSMSPermissionsReturn => {
  const [permissionStatus, setPermissionStatus] = useState<SMSPermissionStatus>({
    canReadSMS: false,
    canReceiveSMS: false,
    hasRequestedPermissions: false,
    shouldShowRationale: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [canRequestPermissions, setCanRequestPermissions] = useState(false);

  // SMS permissions are only supported on Android
  const isSupported = Platform.OS === 'android';

  /**
   * Check current permission status
   */
  const checkPermissions = useCallback(async () => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const status = await smsPermissionsService.checkPermissions();
      setPermissionStatus(status);
      
      const canRequest = await smsPermissionsService.canRequestPermissions();
      setCanRequestPermissions(canRequest);
    } catch (error) {
      console.error('Error checking SMS permissions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  /**
   * Request SMS permissions
   */
  const requestPermissions = useCallback(async (config: SMSPermissionConfig) => {
    if (!isSupported) return permissionStatus;

    try {
      setIsLoading(true);
      const status = await smsPermissionsService.requestPermissions(config);
      setPermissionStatus(status);

      const canRequest = await smsPermissionsService.canRequestPermissions();
      setCanRequestPermissions(canRequest);

      return status;
    } catch (error) {
      console.error('Error requesting SMS permissions:', error);
      return permissionStatus;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permissionStatus]);

  /**
   * Show permission denied dialog
   */
  const showPermissionDialog = useCallback(async () => {
    return await smsPermissionsService.showPermissionDeniedDialog();
  }, []);

  /**
   * Open device settings
   */
  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  /**
   * Get human-readable permission status text
   */
  const permissionStatusText = smsPermissionsService.getPermissionStatusText(permissionStatus);

  // Check permissions on mount and when app comes to foreground
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    permissionStatus,
    isLoading,
    isSupported,
    requestPermissions,
    checkPermissions,
    openSettings,
    showPermissionDialog,
    canRequestPermissions,
    permissionStatusText,
  };
};
