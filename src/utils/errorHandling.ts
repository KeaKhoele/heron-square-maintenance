import { useNotifications } from '../contexts/NotificationContext';

export interface ErrorDetails {
  code?: string;
  message: string;
  details?: any;
  context?: string;
}

export class AppError extends Error {
  public code?: string;
  public details?: any;
  public context?: string;
  public isAppError = true;

  constructor(message: string, code?: string, details?: any, context?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.context = context;
  }
}

export const ErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  GOOGLE_SHEETS_ERROR: 'GOOGLE_SHEETS_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Error handling utility functions
export const handleError = (error: unknown, context?: string): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error types
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new AppError(
        'Network connection failed. Please check your internet connection.',
        ErrorCodes.NETWORK_ERROR,
        error.message,
        context
      );
    }

    if (error.message.includes('auth') || error.message.includes('permission')) {
      return new AppError(
        'Authentication failed. Please sign in again.',
        ErrorCodes.AUTHENTICATION_ERROR,
        error.message,
        context
      );
    }

    if (error.message.includes('sheets') || error.message.includes('google')) {
      return new AppError(
        'Failed to sync with Google Sheets. Your data is saved locally.',
        ErrorCodes.GOOGLE_SHEETS_ERROR,
        error.message,
        context
      );
    }

    if (error.message.includes('email') || error.message.includes('resend')) {
      return new AppError(
        'Email notification failed. The issue was still saved.',
        ErrorCodes.EMAIL_ERROR,
        error.message,
        context
      );
    }

    // Generic error
    return new AppError(
      'An unexpected error occurred. Please try again.',
      ErrorCodes.UNKNOWN_ERROR,
      error.message,
      context
    );
  }

  // Non-Error object
  return new AppError(
    'An unexpected error occurred. Please try again.',
    ErrorCodes.UNKNOWN_ERROR,
    String(error),
    context
  );
};

// Hook for error handling with notifications
export const useErrorHandler = () => {
  const { showError, showWarning } = useNotifications();

  const handleErrorWithNotification = (error: unknown, context?: string) => {
    const appError = handleError(error, context);
    
    // Log error for debugging
    console.error(`[${appError.context || 'Unknown'}] ${appError.message}`, {
      code: appError.code,
      details: appError.details,
      stack: appError.stack,
    });

    // Show appropriate notification based on error type
    switch (appError.code) {
      case ErrorCodes.NETWORK_ERROR:
        showWarning(
          'Connection Issue',
          appError.message,
          6000
        );
        break;
      case ErrorCodes.AUTHENTICATION_ERROR:
        showError(
          'Authentication Error',
          appError.message,
          8000
        );
        break;
      case ErrorCodes.GOOGLE_SHEETS_ERROR:
        showWarning(
          'Sync Issue',
          appError.message,
          6000
        );
        break;
      case ErrorCodes.EMAIL_ERROR:
        showWarning(
          'Notification Issue',
          appError.message,
          5000
        );
        break;
      default:
        showError(
          'Error',
          appError.message,
          8000
        );
    }

    return appError;
  };

  const handleAsyncError = async <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleErrorWithNotification(error, context);
      return null;
    }
  };

  return {
    handleError: handleErrorWithNotification,
    handleAsyncError,
  };
};

// Validation utilities
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateRequired = (value: any, fieldName: string): void => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    throw new AppError(
      `${fieldName} is required`,
      ErrorCodes.VALIDATION_ERROR,
      { field: fieldName, value }
    );
  }
};

export const validateLength = (value: string, min: number, max: number, fieldName: string): void => {
  if (value.length < min) {
    throw new AppError(
      `${fieldName} must be at least ${min} characters long`,
      ErrorCodes.VALIDATION_ERROR,
      { field: fieldName, value, min }
    );
  }
  if (value.length > max) {
    throw new AppError(
      `${fieldName} must be no more than ${max} characters long`,
      ErrorCodes.VALIDATION_ERROR,
      { field: fieldName, value, max }
    );
  }
};

// Network status utilities
export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const waitForOnline = (): Promise<void> => {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve();
      return;
    }

    const handleOnline = () => {
      window.removeEventListener('online', handleOnline);
      resolve();
    };

    window.addEventListener('online', handleOnline);
  });
};

// Retry utility with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};
