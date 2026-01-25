/**
 * Register Use Case
 *
 * Handles the business logic for user registration
 * Creates both auth user and user profile in Firestore
 */

import { AUTH_ERRORS } from '@/core/constants/errors';

export class RegisterUseCase {
  /**
   * Constructor
   * @param {AuthRepository} authRepository
   */
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Execute registration
   * @param {Object} registerData
   * @param {string} registerData.email
   * @param {string} registerData.password
   * @param {string} registerData.confirmPassword
   * @param {string} registerData.displayName
   * @param {string} registerData.companyName
   * @param {string} registerData.role - Optional, defaults to 'member'
   * @returns {Promise<Object>} Created user
   * @throws {Error} If validation fails or registration fails
   */
  async execute(registerData) {
    const {
      email,
      password,
      confirmPassword,
      displayName,
      companyName,
      role,
      // Additional registration data
      firstName,
      lastName,
      phone,
      position,
      companyCategory,
      companyWebsite,
      linkedinProfile,
      country,
      companyLogoFile,
    } = registerData;

    // 1. Validate all inputs
    this.validateEmail(email);
    this.validatePassword(password);
    this.validatePasswordMatch(password, confirmPassword);
    this.validateDisplayName(displayName);
    this.validateCompanyName(companyName);

    // 2. Call repository to perform registration (get userId first)
    try {
      // Prepare initial profile data (without logo URL yet)
      const profileData = {
        displayName,
        companyName,
        role: role || 'member',
        firstName,
        lastName,
        phone,
        position,
        companyCategory,
        companyWebsite: companyWebsite || null,
        linkedinProfile: linkedinProfile || null,
        country,
        companyLogo: null, // Will be updated after upload
        // Verification status
        emailVerified: false, // Will be updated when user verifies email
        adminApproved: false, // Admin must approve user
        isSuspended: false, // Admin can suspend users
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 3. Create user account
      const user = await this.authRepository.register(
        email,
        password,
        profileData
      );

      // 4. Upload company logo if provided
      if (companyLogoFile && user.uid) {
        console.log('📸 [RegisterUseCase] Starting logo upload for user:', user.uid);
        console.log('📸 [RegisterUseCase] Logo file details:', {
          name: companyLogoFile.name,
          type: companyLogoFile.type,
          size: companyLogoFile.size,
        });

        try {
          const logoUrl = await this.authRepository.uploadCompanyLogo(
            user.uid,
            companyLogoFile
          );

          console.log('📸 [RegisterUseCase] Logo uploaded successfully, URL:', logoUrl);

          // Update user profile with logo URL
          if (logoUrl) {
            await this.authRepository.updateUserProfile(user.uid, {
              companyLogo: logoUrl,
              updatedAt: new Date(),
            });
            console.log('📸 [RegisterUseCase] User profile updated with logo URL');
          }
        } catch (logoError) {
          console.error('❌ [RegisterUseCase] Failed to upload company logo:', logoError);
          console.error('❌ [RegisterUseCase] Error details:', logoError.message, logoError.stack);
          // Don't fail registration if logo upload fails
        }
      } else {
        console.log('📸 [RegisterUseCase] No logo to upload:', {
          hasFile: !!companyLogoFile,
          hasUserId: !!user.uid,
        });
      }

      // 5. Send email verification
      await this.authRepository.sendEmailVerification();

      return user;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate email
   * @param {string} email
   * @throws {Error}
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
   * @throws {Error}
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
   * Validate password confirmation
   * @param {string} password
   * @param {string} confirmPassword
   * @throws {Error}
   */
  validatePasswordMatch(password, confirmPassword) {
    if (password !== confirmPassword) {
      throw new Error(AUTH_ERRORS.PASSWORDS_NOT_MATCH);
    }
  }

  /**
   * Validate display name
   * @param {string} displayName
   * @throws {Error}
   */
  validateDisplayName(displayName) {
    if (!displayName || displayName.trim() === '') {
      throw new Error(AUTH_ERRORS.EMPTY_FIELD);
    }

    if (displayName.trim().length < 2) {
      throw new Error('Display name must be at least 2 characters');
    }
  }

  /**
   * Validate company name
   * @param {string} companyName
   * @throws {Error}
   */
  validateCompanyName(companyName) {
    if (!companyName || companyName.trim() === '') {
      throw new Error(AUTH_ERRORS.EMPTY_FIELD);
    }

    if (companyName.trim().length < 2) {
      throw new Error(AUTH_ERRORS.INVALID_COMPANY_NAME);
    }
  }

  /**
   * Handle Firebase errors
   * @param {Error} error
   * @returns {Error}
   */
  handleError(error) {
    const errorCode = error.code;
    const errorMessage = AUTH_ERRORS[errorCode] || error.message;
    return new Error(errorMessage);
  }
}

export default RegisterUseCase;
