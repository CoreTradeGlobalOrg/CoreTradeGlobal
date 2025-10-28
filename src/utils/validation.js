/**
 * Validation utility functions
 * Separated for reusability and testing
 */

export const validators = {
  /**
   * Validates email format
   * @param {string} email - Email address to validate
   * @returns {Object} { isValid: boolean, error?: string }
   */
  email: (email) => {
    if (!email || email.trim() === '') {
      return { 
        isValid: false, 
        error: 'Email is required' 
      };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { 
        isValid: false, 
        error: 'Please enter a valid email address' 
      };
    }
    
    return { isValid: true };
  },

  /**
   * Sanitizes email (lowercase, trim)
   * @param {string} email - Email to sanitize
   * @returns {string} Sanitized email
   */
  sanitizeEmail: (email) => {
    return email.toLowerCase().trim();
  },
};

export default validators;