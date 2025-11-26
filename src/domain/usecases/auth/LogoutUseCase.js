/**
 * Logout Use Case
 *
 * Handles the business logic for user logout
 * Simple use case but follows the same pattern for consistency
 */

export class LogoutUseCase {
  /**
   * Constructor
   * @param {AuthRepository} authRepository
   */
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Execute logout
   * @returns {Promise<void>}
   * @throws {Error} If logout fails
   */
  async execute() {
    try {
      await this.authRepository.logout();
    } catch (error) {
      throw new Error('Failed to logout: ' + error.message);
    }
  }
}

export default LogoutUseCase;
