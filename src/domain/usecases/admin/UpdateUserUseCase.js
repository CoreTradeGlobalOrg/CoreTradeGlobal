/**
 * Update User Use Case
 *
 * Admin updates user information
 */

export class UpdateUserUseCase {
  /**
   * Constructor
   * @param {AuthRepository} authRepository
   */
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Execute user update
   * @param {string} userId - User ID to update
   * @param {Object} userData - User data to update
   * @returns {Promise<void>}
   */
  async execute(userId, userData) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!userData || Object.keys(userData).length === 0) {
      throw new Error('User data is required');
    }

    // Add timestamp
    const updateData = {
      ...userData,
      updatedAt: new Date(),
    };

    await this.authRepository.updateUserProfile(userId, updateData);
  }
}

export default UpdateUserUseCase;
