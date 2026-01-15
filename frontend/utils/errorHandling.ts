/**
 * Error handling utilities for the M-Pesa expense tracker app
 */

import { Alert } from 'react-native';

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

/**
 * Custom error classes
 */
export class NetworkError extends Error {
  code: string;
  details?: any;

  constructor(message: string, code: string = 'NETWORK_ERROR', details?: any) {
    super(message);
    this.name = 'NetworkError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends Error {
  code: string;
  field?: string;

  constructor(message: string, field?: string, code: string = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.field = field;
  }
}

export class AuthenticationError extends Error {
  code: string;

  constructor(message: string = 'Authentication failed', code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}

export class SMSError extends Error {
  code: string;
  originalMessage?: string;

  constructor(message: string, code: string = 'SMS_ERROR', originalMessage?: string) {
    super(message);
    this.name = 'SMSError';
    this.code = code;
    this.originalMessage = originalMessage;
  }
}

/**
 * Error logging service
 */
class ErrorLogger {
  private errors: ErrorInfo[] = [];

  log(error: Error | ErrorInfo, context?: string): void {
    const errorInfo: ErrorInfo = error instanceof Error ? {
      message: error.message,
      code: (error as any).code,
      details: {
        name: error.name,
        stack: error.stack,
        context,
      },
      timestamp: new Date(),
    } : error;

    this.errors.push(errorInfo);
    
    // Log to console in development
    if (__DEV__) {
      console.error(`[${errorInfo.timestamp.toISOString()}] ${context || 'Error'}:`, errorInfo);
    }

    // Keep only last 50 errors to prevent memory issues
    if (this.errors.length > 50) {
      this.errors = this.errors.slice(-50);
    }
  }

  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorsByType(errorType: string): ErrorInfo[] {
    return this.errors.filter(error => 
      error.details?.name === errorType || error.code?.includes(errorType)
    );
  }
}

export const errorLogger = new ErrorLogger();

/**
 * Network error handler
 */
export const handleNetworkError = (error: any, context?: string): void => {
  let networkError: NetworkError;

  if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
    networkError = new NetworkError(
      'Network connection failed. Please check your internet connection.',
      'CONNECTION_FAILED'
    );
  } else if (error.code === 'TIMEOUT') {
    networkError = new NetworkError(
      'Request timed out. Please try again.',
      'TIMEOUT'
    );
  } else if (error.status) {
    networkError = new NetworkError(
      getHttpErrorMessage(error.status),
      `HTTP_${error.status}`,
      { status: error.status, statusText: error.statusText }
    );
  } else {
    networkError = new NetworkError(
      'An unexpected network error occurred.',
      'UNKNOWN_NETWORK_ERROR',
      error
    );
  }

  errorLogger.log(networkError, context);
  showErrorAlert(networkError.message);
};

/**
 * Get user-friendly HTTP error messages
 */
const getHttpErrorMessage = (status: number): string => {
  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication failed. Please log in again.';
    case 403:
      return 'Access denied. You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'Conflict detected. The data may have been modified by another user.';
    case 422:
      return 'The data provided is invalid. Please check and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Server error. Please try again later.';
    case 502:
      return 'Server temporarily unavailable. Please try again later.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return `An error occurred (${status}). Please try again.`;
  }
};

/**
 * SMS parsing error handler
 */
export const handleSMSError = (error: any, originalMessage?: string): void => {
  let smsError: SMSError;

  if (error.message?.includes('parsing')) {
    smsError = new SMSError(
      'Failed to parse SMS message. Please check the message format.',
      'PARSING_FAILED',
      originalMessage
    );
  } else if (error.message?.includes('permission')) {
    smsError = new SMSError(
      'SMS permission required. Please grant permission to read SMS messages.',
      'PERMISSION_DENIED'
    );
  } else if (error.message?.includes('duplicate')) {
    smsError = new SMSError(
      'This SMS message has already been imported.',
      'DUPLICATE_MESSAGE',
      originalMessage
    );
  } else {
    smsError = new SMSError(
      'Failed to process SMS message. Please try again.',
      'SMS_PROCESSING_FAILED',
      originalMessage
    );
  }

  errorLogger.log(smsError, 'SMS Processing');
  showErrorAlert(smsError.message);
};

/**
 * Validation error handler
 */
export const handleValidationError = (error: ValidationError): void => {
  errorLogger.log(error, 'Validation');
  showErrorAlert(error.message);
};

/**
 * Authentication error handler
 */
export const handleAuthError = (error: any): void => {
  const authError = new AuthenticationError(
    error.message || 'Authentication failed. Please log in again.',
    error.code || 'AUTH_ERROR'
  );

  errorLogger.log(authError, 'Authentication');
  showErrorAlert(authError.message);
};

/**
 * Generic error handler
 */
export const handleError = (error: any, context?: string): void => {
  if (error instanceof NetworkError) {
    errorLogger.log(error, context);
    showErrorAlert(error.message);
  } else if (error instanceof ValidationError) {
    handleValidationError(error);
  } else if (error instanceof AuthenticationError) {
    handleAuthError(error);
  } else if (error instanceof SMSError) {
    errorLogger.log(error, context);
    showErrorAlert(error.message);
  } else if (error.name === 'TypeError' || error.code) {
    handleNetworkError(error, context);
  } else {
    const genericError: ErrorInfo = {
      message: error.message || 'An unexpected error occurred.',
      code: 'GENERIC_ERROR',
      details: error,
      timestamp: new Date(),
    };

    errorLogger.log(genericError, context);
    showErrorAlert(genericError.message);
  }
};

/**
 * Show error alert to user
 */
export const showErrorAlert = (message: string, title: string = 'Error'): void => {
  Alert.alert(title, message, [{ text: 'OK' }]);
};

/**
 * Show success alert to user
 */
export const showSuccessAlert = (message: string, title: string = 'Success'): void => {
  Alert.alert(title, message, [{ text: 'OK' }]);
};

/**
 * Show confirmation alert
 */
export const showConfirmationAlert = (
  message: string,
  onConfirm: () => void,
  title: string = 'Confirm'
): void => {
  Alert.alert(
    title,
    message,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onConfirm }
    ]
  );
};

/**
 * Retry mechanism for failed operations
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
};

/**
 * Safe async operation wrapper
 */
export const safeAsync = async <T>(
  operation: () => Promise<T>,
  fallbackValue?: T
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error) {
    handleError(error, 'Safe Async Operation');
    return fallbackValue;
  }
};

/**
 * Environment validation with error handling
 */
export const validateEnvironmentWithErrorHandling = (): boolean => {
  try {
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    
    if (!backendUrl) {
      throw new Error('Backend URL not configured. Please set EXPO_PUBLIC_BACKEND_URL environment variable.');
    }

    new URL(backendUrl);
    return true;
  } catch (error) {
    handleError(error, 'Environment Validation');
    return false;
  }
};

/**
 * Get error summary for debugging
 */
export const getErrorSummary = (): {
  totalErrors: number;
  networkErrors: number;
  validationErrors: number;
  authErrors: number;
  smsErrors: number;
  recentErrors: ErrorInfo[];
} => {
  const errors = errorLogger.getErrors();
  
  return {
    totalErrors: errors.length,
    networkErrors: errors.filter(e => e.code?.includes('NETWORK')).length,
    validationErrors: errors.filter(e => e.code?.includes('VALIDATION')).length,
    authErrors: errors.filter(e => e.code?.includes('AUTH')).length,
    smsErrors: errors.filter(e => e.code?.includes('SMS')).length,
    recentErrors: errors.slice(-5),
  };
};
