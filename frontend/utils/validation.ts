/**
 * Validation utility functions for the M-Pesa expense tracker app
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates transaction amount
 */
export const validateAmount = (amount: string): ValidationResult => {
  if (!amount || amount.trim() === '') {
    return { isValid: false, error: 'Amount is required' };
  }

  const numericAmount = parseFloat(amount);
  
  if (isNaN(numericAmount)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }

  if (numericAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (numericAmount > 1000000) {
    return { isValid: false, error: 'Amount cannot exceed KSh 1,000,000' };
  }

  // Check for more than 2 decimal places
  if (amount.includes('.') && amount.split('.')[1].length > 2) {
    return { isValid: false, error: 'Amount cannot have more than 2 decimal places' };
  }

  return { isValid: true };
};

/**
 * Validates transaction description
 */
export const validateDescription = (description: string): ValidationResult => {
  if (!description || description.trim() === '') {
    return { isValid: false, error: 'Description is required' };
  }

  if (description.trim().length < 2) {
    return { isValid: false, error: 'Description must be at least 2 characters long' };
  }

  if (description.length > 200) {
    return { isValid: false, error: 'Description cannot exceed 200 characters' };
  }

  return { isValid: true };
};

/**
 * Validates PIN (4 digits)
 */
export const validatePin = (pin: string): ValidationResult => {
  if (!pin || pin.trim() === '') {
    return { isValid: false, error: 'PIN is required' };
  }

  if (pin.length !== 4) {
    return { isValid: false, error: 'PIN must be exactly 4 digits' };
  }

  if (!/^\d{4}$/.test(pin)) {
    return { isValid: false, error: 'PIN must contain only numbers' };
  }

  // Check for weak PINs
  const weakPins = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
  if (weakPins.includes(pin)) {
    return { isValid: false, error: 'Please choose a more secure PIN' };
  }

  return { isValid: true };
};

/**
 * Validates budget amount
 */
export const validateBudgetAmount = (amount: string): ValidationResult => {
  const amountValidation = validateAmount(amount);
  if (!amountValidation.isValid) {
    return amountValidation;
  }

  const numericAmount = parseFloat(amount);
  
  if (numericAmount < 100) {
    return { isValid: false, error: 'Budget amount should be at least KSh 100' };
  }

  return { isValid: true };
};

/**
 * Validates category selection
 */
export const validateCategory = (categoryId: string): ValidationResult => {
  if (!categoryId || categoryId.trim() === '') {
    return { isValid: false, error: 'Please select a category' };
  }

  return { isValid: true };
};

/**
 * Validates transaction date
 */
export const validateDate = (date: Date): ValidationResult => {
  const now = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(now.getFullYear() - 1);

  if (date > now) {
    return { isValid: false, error: 'Transaction date cannot be in the future' };
  }

  if (date < oneYearAgo) {
    return { isValid: false, error: 'Transaction date cannot be more than 1 year ago' };
  }

  return { isValid: true };
};

/**
 * Validates SMS message content
 */
export const validateSMSMessage = (message: string): ValidationResult => {
  if (!message || message.trim() === '') {
    return { isValid: false, error: 'SMS message is required' };
  }

  if (message.length < 10) {
    return { isValid: false, error: 'SMS message is too short' };
  }

  if (message.length > 1000) {
    return { isValid: false, error: 'SMS message is too long' };
  }

  // Check if it contains M-Pesa keywords
  const mpesaKeywords = ['mpesa', 'm-pesa', 'safaricom', 'confirmed', 'ksh', 'transaction'];
  const hasKeyword = mpesaKeywords.some(keyword => 
    message.toLowerCase().includes(keyword.toLowerCase())
  );

  if (!hasKeyword) {
    return { isValid: false, error: 'This does not appear to be an M-Pesa SMS message' };
  }

  return { isValid: true };
};

/**
 * Formats amount for display
 */
export const formatAmount = (amount: number): string => {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `KSh ${safeAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Parses amount string to number
 */
export const parseAmount = (amount: string): number => {
  return parseFloat(amount) || 0;
};

/**
 * Validates network connectivity
 */
export const validateNetworkResponse = (response: Response): ValidationResult => {
  if (!response.ok) {
    if (response.status === 400) {
      return { isValid: false, error: 'Invalid request. Please check your input.' };
    } else if (response.status === 401) {
      return { isValid: false, error: 'Authentication failed. Please log in again.' };
    } else if (response.status === 403) {
      return { isValid: false, error: 'Access denied. You do not have permission.' };
    } else if (response.status === 404) {
      return { isValid: false, error: 'Resource not found.' };
    } else if (response.status >= 500) {
      return { isValid: false, error: 'Server error. Please try again later.' };
    } else {
      return { isValid: false, error: 'An unexpected error occurred.' };
    }
  }

  return { isValid: true };
};

/**
 * Validates environment configuration
 */
export const validateEnvironment = (): ValidationResult => {
  const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  
  if (!backendUrl) {
    return { 
      isValid: false, 
      error: 'Backend URL not configured. Please set EXPO_PUBLIC_BACKEND_URL environment variable.' 
    };
  }

  try {
    new URL(backendUrl);
  } catch {
    return {
      isValid: false,
      error: 'Invalid backend URL format. Please check EXPO_PUBLIC_BACKEND_URL configuration.'
    };
  }

  return { isValid: true };
};

/**
 * Sanitizes user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 1000); // Limit length
};

/**
 * Validates form data comprehensively
 */
export const validateTransactionForm = (data: {
  amount: string;
  description: string;
  categoryId: string;
  date: Date;
}): ValidationResult[] => {
  return [
    validateAmount(data.amount),
    validateDescription(data.description),
    validateCategory(data.categoryId),
    validateDate(data.date),
  ];
};

/**
 * Validates budget form data
 */
export const validateBudgetForm = (data: {
  amount: string;
  categoryId: string;
}): ValidationResult[] => {
  return [
    validateBudgetAmount(data.amount),
    validateCategory(data.categoryId),
  ];
};
