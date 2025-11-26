/**
 * Suspend User Use Case
 *
 * Admin suspends a user (temporarily blocks access)
 */

export class SuspendUserUseCase {
  /**
   * Constructor
   * @param {AuthRepository} authRepository
   */
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Execute user suspension
   * @param {string} userId - User ID to suspend
   * @param {boolean} suspend - true to suspend, false to unsuspend
   * @returns {Promise<void>}
   */
  async execute(userId, suspend = true) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const updateData = {
      isSuspended: suspend,
      updatedAt: new Date(),
    };

    if (suspend) {
      updateData.suspendedAt = new Date();
    } else {
      updateData.unsuspendedAt = new Date();
    }

    await this.authRepository.updateUserProfile(userId, updateData);
  }
}

export default SuspendUserUseCase;
