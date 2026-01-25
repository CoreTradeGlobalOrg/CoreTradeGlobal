/**
 * Delete User Use Case
 *
 * Admin soft-deletes a user (marks as deleted)
 * NOTE: This does NOT delete Firebase Auth account (requires Firebase Admin SDK on backend)
 * The user will be marked as deleted and cannot login anymore
 */

export class DeleteUserUseCase {
  /**
   * Constructor
   * @param {AuthRepository} authRepository
   */
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Execute user soft deletion
   * @param {string} userId - User ID to delete
   * @returns {Promise<void>}
   */
  async execute(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Mark user as deleted (soft delete)
    // Also suspend them to prevent login
    await this.authRepository.updateUserProfile(userId, {
      isDeleted: true,
      isSuspended: true,
      deletedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export default DeleteUserUseCase;
