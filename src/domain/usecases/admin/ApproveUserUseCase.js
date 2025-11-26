/**
 * Approve User Use Case
 *
 * Admin approves a user after verifying their information
 */

export class ApproveUserUseCase {
  /**
   * Constructor
   * @param {AuthRepository} authRepository
   */
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Execute user approval
   * @param {string} userId - User ID to approve
   * @returns {Promise<void>}
   */
  async execute(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    await this.authRepository.updateUserProfile(userId, {
      adminApproved: true,
      approvedAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export default ApproveUserUseCase;