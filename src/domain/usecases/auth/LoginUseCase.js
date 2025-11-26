/**
 * Login Use Case
 *
 * Handles the business logic for user login
 * This is where validation and business rules live
 *
 * Why Use Cases?
 * - Single Responsibility: One class = one business operation
 * - Reusable: Can be called from anywhere
 * - Testable: Easy to unit test business logic
 * - Framework independent: No React, no Next.js dependencies
 */

import { AUTH_ERRORS } from '@/core/constants/errors';

export class LoginUseCase {
  /**
   * Constructor
   * @param {AuthRepository} authRepository
   */
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Execute login
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User data
   * @throws {Error} If validation fails or login fails
   */
  async execute(email, password) {
    // 1. Validate inputs
    this.validateEmail(email);
    this.validatePassword(password);

    // 2. Call repository to perform login
    try {
      const user = await this.authRepository.login(email, password);

      // 3. Check if user is suspended or deleted
      if (user.isSuspended || user.isDeleted) {
        throw new Error('Your account has been suspended. Please contact support at support@coretradeglobal.com');
      }

      return user;
    } catch (error) {
      // Handle and transform Firebase errors
      throw this.handleError(error);
    }
  }

  /**
   * Validate email
   * @param {string} email
   * @throws {Error} If email is invalid
   */
  validateEmail(email) {
    if (!email || email.trim() === '') {
      throw new Error(AUTH_ERRORS.EMPTY_FIELD);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(AUTH_ERRORS.INVALID_EMAIL);
    }
  }

  /**
   * Validate password
   * @param {string} password
   * @throws {Error} If password is invalid
   */
  validatePassword(password) {
    if (!password || password.trim() === '') {
      throw new Error(AUTH_ERRORS.EMPTY_FIELD);
    }

    if (password.length < 6) {
      throw new Error(AUTH_ERRORS.INVALID_PASSWORD);
    }
  }

  /**
   * Handle Firebase errors and convert to user-friendly messages
   * @param {Error} error
   * @returns {Error}
   */
  handleError(error) {
    const errorCode = error.code;
    const errorMessage = AUTH_ERRORS[errorCode] || error.message;
    return new Error(errorMessage);
  }
}

export default LoginUseCase;
