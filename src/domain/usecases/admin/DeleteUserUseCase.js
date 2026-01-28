/**
 * Delete User Use Case
 *
 * Admin hard-deletes a user via Cloud Function
 * Removes user from both Firebase Auth and Firestore
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from '@/core/config/firebase.config';

export class DeleteUserUseCase {
  /**
   * Constructor
   * @param {AuthRepository} authRepository
   */
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Execute user hard deletion via Cloud Function
   * @param {string} userId - User ID to delete
   * @returns {Promise<void>}
   */
  async execute(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Call Cloud Function to delete user from Auth and Firestore
    const functions = getFunctions(app);
    const deleteUserFn = httpsCallable(functions, 'deleteUser');

    const result = await deleteUserFn({ userId });

    if (!result.data.success) {
      throw new Error(result.data.message || 'Failed to delete user');
    }
  }
}

export default DeleteUserUseCase;
