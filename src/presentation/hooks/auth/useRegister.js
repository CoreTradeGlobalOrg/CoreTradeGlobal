/**
 * useRegister Hook
 *
 * Custom hook for registration functionality
 * Handles registration state and calls the RegisterUseCase
 *
 * Usage in components:
 * const { register, loading, error } = useRegister()
 *
 * const handleSubmit = async (e) => {
 *   e.preventDefault()
 *   await register({ email, password, confirmPassword, displayName, companyName })
 * }
 */

'use client';

import { useState } from 'react';
import { container } from '@/core/di/container';
import { RegisterUseCase } from '@/domain/usecases/auth/RegisterUseCase';
import { Notification } from '@/domain/entities/Notification';

export function useRegister() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Register function
   * @param {Object} registerData
   * @param {string} registerData.email
   * @param {string} registerData.password
   * @param {string} registerData.confirmPassword
   * @param {string} registerData.displayName
   * @param {string} registerData.companyName
   * @returns {Promise<Object>} Created user
   */
  const register = async (registerData) => {
    console.log('📸 [useRegister] register called with data:', {
      ...registerData,
      companyLogoFile: registerData.companyLogoFile ? {
        name: registerData.companyLogoFile.name,
        type: registerData.companyLogoFile.type,
        size: registerData.companyLogoFile.size,
      } : 'NO_FILE',
    });

    setLoading(true);
    setError(null);

    try {
      // Get repository from DI container
      const authRepository = container.getAuthRepository();

      // Create use case with repository
      const registerUseCase = new RegisterUseCase(authRepository);

      // Execute registration
      const user = await registerUseCase.execute(registerData);

      // Send notification to all admins about new user
      try {
        const firestoreDS = container.getFirestoreDataSource();
        const notificationRepository = container.getNotificationRepository();

        // Get all admin users
        const allUsers = await firestoreDS.query('users', {
          where: [['role', '==', 'admin']],
          limit: 50,
        });

        if (allUsers && allUsers.length > 0) {
          const adminIds = allUsers.map(admin => admin.id);
          const notificationData = Notification.createNewUserApprovalNotification(
            user.uid,
            registerData.displayName,
            registerData.companyName,
            registerData.email
          );

          await notificationRepository.createForMultipleUsers(adminIds, notificationData);
          console.log(`📧 Sent approval notification to ${adminIds.length} admins`);
        }
      } catch (notifError) {
        // Don't fail registration if notification fails
        console.error('Failed to send admin notifications:', notifError);
      }

      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    register,
    loading,
    error,
  };
}

export default useRegister;
