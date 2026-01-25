/**
 * Error Messages & Codes
 *
 * We manage all error messages centrally here
 *
 * Firebase Auth Error Codes:
 * https://firebase.google.com/docs/auth/admin/errors
 */

export const AUTH_ERRORS = {
  // Firebase Auth errors
  'auth/invalid-email': 'Invalid email address',
  'auth/user-disabled': 'This account has been disabled',
  'auth/user-not-found': 'User not found',
  'auth/wrong-password': 'Incorrect password',
  'auth/email-already-in-use': 'This email is already in use',
  'auth/weak-password': 'Password is too weak (minimum 6 characters)',
  'auth/operation-not-allowed': 'This operation is not allowed',
  'auth/invalid-credential': 'Invalid credentials',
  'auth/too-many-requests': 'Too many attempts, please try again later',

  // Custom validation errors
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PASSWORD: 'Password must be at least 6 characters',
  PASSWORDS_NOT_MATCH: 'Passwords do not match',
  EMPTY_FIELD: 'This field cannot be empty',
  INVALID_COMPANY_NAME: 'Company name must be at least 2 characters',
};

export const FIRESTORE_ERRORS = {
  'permission-denied': 'You do not have permission for this operation',
  'not-found': 'Record not found',
  'already-exists': 'This record already exists',
  'resource-exhausted': 'Request limit exceeded',
  'failed-precondition': 'Operation preconditions not met',
  'aborted': 'Operation aborted',
  'out-of-range': 'Invalid value range',
  'unimplemented': 'This feature is not yet supported',
  'internal': 'Server error occurred',
  'unavailable': 'Service temporarily unavailable',
  'data-loss': 'Data loss occurred',
  'unauthenticated': 'You need to sign in',
};

export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  MIN_LENGTH: (min) => `Must be at least ${min} characters`,
  MAX_LENGTH: (max) => `Must be at most ${max} characters`,
  MIN_VALUE: (min) => `Must be at least ${min}`,
  MAX_VALUE: (max) => `Must be at most ${max}`,
  INVALID_PHONE: 'Please enter a valid phone number',
  INVALID_URL: 'Please enter a valid URL',
};

// Generic fallback messages
export const GENERIC_ERRORS = {
  NETWORK_ERROR: 'Please check your internet connection',
  UNKNOWN_ERROR: 'An error occurred, please try again',
  TIMEOUT_ERROR: 'Operation timed out',
};

/**
 * Helper function: Convert Firebase error code to user-friendly message
 *
 * Usage:
 * catch (error) {
 *   const message = getErrorMessage(error.code)
 * }
 */
export const getErrorMessage = (errorCode) => {
  return (
    AUTH_ERRORS[errorCode] ||
    FIRESTORE_ERRORS[errorCode] ||
    GENERIC_ERRORS.UNKNOWN_ERROR
  );
};

const errorConstants = {
  AUTH_ERRORS,
  FIRESTORE_ERRORS,
  VALIDATION_ERRORS,
  GENERIC_ERRORS,
  getErrorMessage,
};

export default errorConstants;
