import React from 'react';
import { Ionicons } from '@expo/vector-icons';

interface SafeIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

/**
 * List of known valid Ionicons names (subset of commonly used icons)
 * This helps catch invalid icon names before they cause errors
 */
const VALID_IONICONS = new Set([
  // Common icons used in the app
  'restaurant', 'car', 'flash', 'shopping-bag', 'music-note', 'medical',
  'school', 'receipt', 'ellipsis-horizontal', 'cash', 'trending-up',
  'trending-down', 'wallet', 'calendar', 'time', 'pricetag', 'checkmark',
  'checkmark-circle', 'close', 'add', 'remove', 'arrow-back', 'arrow-forward',
  'chevron-forward', 'chevron-down', 'chevron-up', 'settings', 'person',
  'mail-outline', 'lock-closed-outline', 'eye-outline', 'eye-off-outline',
  'alert-circle', 'information-circle', 'help-circle', 'warning',
  'shield-checkmark', 'home', 'analytics', 'list', 'create-outline',
  'trash-outline', 'search', 'filter', 'card', 'hourglass', 'bulb-outline',
  'repeat', 'expand', 'backspace', 'backspace-outline', 'key',
  'chatbubble-ellipses', 'cloud-upload', 'wallet-outline', 'shield',
  'lock-closed', 'eye-off', 'settings-outline', 'create',
  // Category icons
  'film', 'book', 'call', 'swap-horizontal', 'fast-food', 'basket',
  'nutrition', 'pizza', 'cafe', 'beer', 'wine',
]);

/**
 * SafeIcon component that validates icon names and provides a fallback
 * This prevents crashes from invalid Ionicons names (like emojis or invalid strings)
 */
export default function SafeIcon({ name, size = 24, color = '#000', style }: SafeIconProps) {
  // Check if the icon name is valid
  const isValidIcon = (iconName: string): boolean => {
    // Filter out emojis and special characters
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    if (emojiRegex.test(iconName)) {
      return false;
    }

    // Check if it's a known valid icon or follows Ionicons naming convention
    if (VALID_IONICONS.has(iconName)) {
      return true;
    }

    // Allow icons that follow Ionicons naming pattern (lowercase with hyphens)
    const ioniconsPattern = /^[a-z]+(-[a-z]+)*$/;
    if (ioniconsPattern.test(iconName)) {
      return true;
    }

    return false;
  };

  // Use the provided icon if valid, otherwise use a fallback
  const iconName = isValidIcon(name) ? name : 'help-circle';

  // Log a warning in development if an invalid icon is detected
  if (__DEV__ && iconName === 'help-circle' && name !== 'help-circle') {
    console.warn(`⚠️ Invalid icon name detected: "${name}". Using fallback icon.`);
  }

  return (
    <Ionicons
      name={iconName as any}
      size={size}
      color={color}
      style={style}
    />
  );
}
