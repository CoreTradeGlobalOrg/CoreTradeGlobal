/**
 * Profile Page - Dynamic
 *
 * URL: /profile/[userId]
 * Protected route - requires authentication
 *
 * Features:
 * - View any user's profile (if authenticated)
 * - Edit own profile only
 * - Admin can access admin dashboard
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLogout } from '@/presentation/hooks/auth/useLogout';
import { useDeleteAccount } from '@/presentation/hooks/auth/useDeleteAccount';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';

export default function ProfilePage() {
  const { user: currentUser, loading: authLoading, isAuthenticated } = useAuth();
  const { logout } = useLogout();
  const { deleteAccount } = useDeleteAccount();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  // Delete account modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Check if viewing own profile
  const isOwnProfile = currentUser?.uid === userId;

  // Check if user can edit this profile (own profile OR admin)
  const canEdit = isOwnProfile || currentUser?.role === 'admin';

  // Profile form state
  const [phone, setPhone] = useState('');
  const [about, setAbout] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Fetch profile user data
  useEffect(() => {
    const fetchProfileUser = async () => {
      if (!userId || authLoading) return;

      try {
        setLoading(true);
        const userRepository = container.getUserRepository();
        const userData = await userRepository.getById(userId);

        if (!userData) {
          toast.error('User not found');
          router.push('/dashboard');
          return;
        }

        setProfileUser(userData);

        // Initialize form if viewing own profile
        if (isOwnProfile) {
          setPhone(userData.phone || '');
          setAbout(userData.about || '');
          setLogoPreview(userData.companyLogo || null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfileUser();
  }, [userId, authLoading, isOwnProfile, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated || !profileUser) {
    return null;
  }

  // Helper function to get country label with flag
  const getCountryLabel = (countryCode) => {
    if (!countryCode) return 'Not set';
    const country = COUNTRIES.find(c => c.value === countryCode);
    return country ? country.label : countryCode;
  };

  // Helper function to capitalize role
  const formatRole = (role) => {
    if (!role) return 'Member';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(profileUser?.companyLogo || null);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    try {
      const userRepository = container.getUserRepository();
      const storageDataSource = container.getFirebaseStorageDataSource();

      // Upload new logo if selected
      let logoUrl = profileUser.companyLogo;
      if (logoFile) {
        // Get file extension
        const fileExtension = logoFile.name.split('.').pop();
        const path = `${userId}/company-logo/image.${fileExtension}`;

        logoUrl = await storageDataSource.uploadFile(path, logoFile);
      }

      // Update profile
      await userRepository.update(userId, {
        phone,
        about,
        companyLogo: logoUrl,
        updatedAt: new Date(),
      });

      // Refresh profile data
      const updatedUser = await userRepository.getById(userId);
      setProfileUser(updatedUser);
      setLogoPreview(updatedUser.companyLogo || null);

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      setLogoFile(null);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const authDataSource = container.getFirebaseAuthDataSource();
      await authDataSource.updatePassword(newPassword);

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Failed to change password. Please re-login and try again.');
    }
  };

  const handleOpenDeleteModal = () => {
    setDeleteModalOpen(true);
    setDeleteConfirmText('');
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteConfirmText('');
  };

  const handleDeleteAccount = async () => {
    try {
      // Call cloud function to hard delete user (Auth + Firestore)
      await deleteAccount(userId);

      // Close modal
      setDeleteModalOpen(false);
      setDeleteConfirmText('');

      // If deleting own account, logout and redirect
      if (isOwnProfile) {
        await logout();
        toast.success('Your account has been permanently deleted');
        router.push('/');
      } else {
        // Admin deleted another user's account
        toast.success('User account has been permanently deleted');
        router.push('/admin');
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error(error.message || 'Failed to delete account');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* User Info with Logo */}
            <div className="flex items-center gap-4">
              {/* Company Logo or Building Icon */}
              {profileUser?.companyLogo ? (
                <img
                  src={profileUser.companyLogo}
                  alt="Company logo"
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              )}

              {/* User Name and Position */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {profileUser?.displayName || profileUser?.email || 'User'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {profileUser?.companyName || 'No company'}{profileUser?.position && ` • ${profileUser.position}`}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {isOwnProfile && currentUser?.role === 'admin' && (
                <Button
                  onClick={() => router.push('/admin')}
                >
                  Admin Dashboard
                </Button>
              )}
              <Button onClick={() => router.push('/dashboard')} variant="secondary">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`${
                activeTab === 'products'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {isOwnProfile ? 'My Products' : 'Products'}
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`${
                activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {isOwnProfile ? 'My Requests' : 'Requests'}
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('security')}
                className={`${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Security
              </button>
            )}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                {canEdit && !isEditing && (
                  <Button onClick={() => setIsEditing(true)} variant="secondary">
                    Edit
                  </Button>
                )}
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                {/* Display Name (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <Input
                    type="text"
                    value={profileUser?.displayName || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  {canEdit && (
                    <p className="mt-1 text-xs text-gray-500">
                      Contact support to change your name
                    </p>
                  )}
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={profileUser?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  {canEdit && (
                    <p className="mt-1 text-xs text-gray-500">
                      Contact support to change your email
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={canEdit && isEditing ? phone : (profileUser?.phone || 'Not set')}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!canEdit || !isEditing}
                    placeholder="+1 234 567 8900"
                    className={!canEdit || !isEditing ? 'bg-gray-50' : ''}
                  />
                </div>

                {/* About / Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    About / Bio
                  </label>
                  <textarea
                    value={canEdit && isEditing ? about : (profileUser?.about || 'No bio available')}
                    onChange={(e) => setAbout(e.target.value)}
                    disabled={!canEdit || !isEditing}
                    rows={4}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      !canEdit || !isEditing ? 'bg-gray-50 text-gray-500' : ''
                    }`}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Company Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Logo
                  </label>

                  {logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={logoPreview}
                        alt="Company logo"
                        className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                      />
                      {canEdit && isEditing && (
                        <div className="space-x-2">
                          <label className="cursor-pointer">
                            <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                              Change
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="sr-only"
                            />
                          </label>
                          <Button
                            type="button"
                            onClick={handleRemoveLogo}
                            variant="secondary"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {!canEdit ? (
                        <p className="text-sm text-gray-500">No logo uploaded</p>
                      ) : (
                        isEditing && (
                          <label className="cursor-pointer inline-block">
                            <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                              Upload Logo
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoChange}
                              className="sr-only"
                            />
                          </label>
                        )
                      )}
                    </>
                  )}
                </div>

                {canEdit && isEditing && (
                  <div className="flex gap-3 pt-4">
                    <Button type="submit">
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setIsEditing(false);
                        setPhone(profileUser?.phone || '');
                        setAbout(profileUser?.about || '');
                        setLogoPreview(profileUser?.companyLogo || null);
                        setLogoFile(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </div>

            {/* Company Information (Read-only) */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Company Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    value={profileUser?.companyName || 'Not set'}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <Input
                    type="text"
                    value={formatRole(profileUser?.role)}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                {profileUser?.country && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <Input
                      type="text"
                      value={getCountryLabel(profileUser.country)}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {isOwnProfile ? 'My Products' : `${profileUser?.displayName || 'User'}'s Products`}
            </h2>
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
              <p className="mt-1 text-sm text-gray-500">
                {isOwnProfile ? 'Get started by creating a new product.' : 'This user has not listed any products yet.'}
              </p>
              {isOwnProfile && (
                <div className="mt-6">
                  <Button>Add Product</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {isOwnProfile ? 'My Requests' : `${profileUser?.displayName || 'User'}'s Requests`}
            </h2>
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                {isOwnProfile ? 'Get started by creating a new request.' : 'This user has not created any requests yet.'}
              </p>
              {isOwnProfile && (
                <div className="mt-6">
                  <Button>Create Request</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Tab - Only for own profile */}
        {isOwnProfile && activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit">
                  Update Password
                </Button>
              </form>
            </div>

            {/* Danger Zone */}
            <div className="bg-white shadow rounded-lg p-6 border-2 border-red-200">
              <h2 className="text-xl font-semibold text-red-600 mb-6">Danger Zone</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Delete Account</h3>
                    <p className="text-sm text-gray-500">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenDeleteModal}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Account
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Logout</h3>
                    <p className="text-sm text-gray-500">
                      Sign out of your account
                    </p>
                  </div>
                  <Button
                    onClick={handleLogout}
                    variant="secondary"
                  >
                    Logout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Delete Account Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Delete Account</h2>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                This action cannot be undone. This will permanently delete your account and all associated data.
              </p>

              <p className="text-gray-700 mb-4">
                Please type <span className="font-bold text-red-600">"Delete my account"</span> to confirm.
              </p>

              <Input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type here..."
                className="w-full"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'Delete my account'}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Delete Account
              </Button>
              <Button
                onClick={handleCloseDeleteModal}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
