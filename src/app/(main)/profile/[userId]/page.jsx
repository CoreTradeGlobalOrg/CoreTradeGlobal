/**
 * Profile Page - Dynamic
 *
 * URL: /profile/[userId]
 * Protected route - requires authentication
 * Uses Dark Theme / Glassmorphism
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLogout } from '@/presentation/hooks/auth/useLogout';
import { useDeleteAccount } from '@/presentation/hooks/auth/useDeleteAccount';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { container } from '@/core/di/container';
import { COUNTRIES } from '@/core/constants/countries';
import { ProductList } from '@/presentation/components/features/product/ProductList/ProductList';
import { ProductForm } from '@/presentation/components/features/product/ProductForm/ProductForm';
import { RequestList } from '@/presentation/components/features/request/RequestList/RequestList';
import { RequestForm } from '@/presentation/components/features/request/RequestForm/RequestForm';
import { useProducts } from '@/presentation/hooks/product/useProducts';
import { useCreateProduct } from '@/presentation/hooks/product/useCreateProduct';
import { useUpdateProduct } from '@/presentation/hooks/product/useUpdateProduct';
import { useDeleteProduct } from '@/presentation/hooks/product/useDeleteProduct';
import { useRequests } from '@/presentation/hooks/request/useRequests';
import { useCreateRequest } from '@/presentation/hooks/request/useCreateRequest';
import { useUpdateRequest } from '@/presentation/hooks/request/useUpdateRequest';
import { useDeleteRequest } from '@/presentation/hooks/request/useDeleteRequest';
import { useCategories } from '@/presentation/hooks/category/useCategories';

export default function ProfilePage() {
  const { user: currentUser, loading: authLoading, isAuthenticated } = useAuth();
  const { logout } = useLogout();
  const { deleteAccount } = useDeleteAccount();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userId = params.userId;

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [isEditing, setIsEditing] = useState(false);

  // Delete account modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Request modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  // Product hooks
  const { products, loading: productsLoading, refetch: refetchProducts } = useProducts(userId);
  const { createProduct } = useCreateProduct();
  const { updateProduct } = useUpdateProduct();
  const { deleteProduct } = useDeleteProduct();

  // Request hooks
  const { requests, loading: requestsLoading, refetch: refetchRequests } = useRequests(userId);
  const { createRequest } = useCreateRequest();
  const { updateRequest } = useUpdateRequest();
  const { deleteRequest } = useDeleteRequest();

  // Category hook
  const { categories } = useCategories();

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
          router.push('/');
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
      <div className="min-h-screen flex items-center justify-center bg-radial-navy">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto"></div>
          <p className="mt-4 text-[#A0A0A0]">Loading...</p>
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

  // Handle tab change with URL update
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  // Product handlers
  const handleOpenProductModal = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (productData, imageFiles) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, userId, productData, imageFiles);
      } else {
        await createProduct(productData, imageFiles);
      }
      setProductModalOpen(false);
      setEditingProduct(null);
      refetchProducts();
    } catch (error) {
      // Error already shown by hook
      console.error('Product submit error:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await deleteProduct(productId, userId);
      refetchProducts();
    } catch (error) {
      // Error already shown by hook
      console.error('Product delete error:', error);
    }
  };

  const handleToggleProductStatus = async (productId, newStatus) => {
    try {
      await updateProduct(productId, userId, { status: newStatus });
      refetchProducts();
      toast.success(`Product ${newStatus === 'active' ? 'activated' : 'deactivated'}!`);
    } catch (error) {
      console.error('Product toggle status error:', error);
      toast.error('Failed to update product status');
    }
  };

  // Request handlers
  const handleOpenRequestModal = () => {
    setEditingRequest(null);
    setRequestModalOpen(true);
  };

  const handleEditRequest = (request) => {
    setEditingRequest(request);
    setRequestModalOpen(true);
  };

  const handleRequestSubmit = async (requestData) => {
    try {
      if (editingRequest) {
        await updateRequest(editingRequest.id, userId, requestData);
      } else {
        await createRequest(requestData);
      }
      setRequestModalOpen(false);
      setEditingRequest(null);
      refetchRequests();
    } catch (error) {
      // Error already shown by hook
      console.error('Request submit error:', error);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      await deleteRequest(requestId, userId);
      refetchRequests();
    } catch (error) {
      // Error already shown by hook
      console.error('Request delete error:', error);
    }
  };

  const handleCloseRequest = async (requestId) => {
    try {
      await updateRequest(requestId, userId, { status: 'closed' });
      refetchRequests();
      toast.success('Request closed!');
    } catch (error) {
      console.error('Request close error:', error);
      toast.error('Failed to close request');
    }
  };

  const handleReopenRequest = async (requestId) => {
    try {
      await updateRequest(requestId, userId, { status: 'active' });
      refetchRequests();
      toast.success('Request reopened!');
    } catch (error) {
      console.error('Request reopen error:', error);
      toast.error('Failed to reopen request');
    }
  };

  const handleSendMessage = (request) => {
    // TODO: Implement messaging functionality
    toast.success('Messaging feature coming soon!');
    console.log('Send message to request:', request);
  };

  return (
    <div className="min-h-screen bg-radial-navy pb-20">
      {/* Header */}
      <header className="border-b border-[rgba(255,255,255,0.1)] bg-[rgba(15,27,43,0.6)] backdrop-blur-md sticky top-0 z-50 pt-[100px] pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* User Info with Logo */}
            <div className="flex items-center gap-6">
              {/* Company Logo or Building Icon */}
              {profileUser?.companyLogo ? (
                <img
                  src={profileUser.companyLogo}
                  alt="Company logo"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[rgba(212,175,55,0.3)] shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1c304a] to-[#0F1B2B] border border-[rgba(255,255,255,0.1)] flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                  <span className="text-3xl">🏭</span>
                </div>
              )}

              {/* User Name and Position */}
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  {profileUser?.displayName || profileUser?.email || 'User'}
                </h1>
                <p className="text-[#A0A0A0] flex items-center gap-2">
                  <span className="text-[#D4AF37] font-medium">{profileUser?.companyName || 'No company'}</span>
                  {profileUser?.position && <span className="w-1 h-1 rounded-full bg-[#A0A0A0]"></span>}
                  {profileUser?.position && <span>{profileUser.position}</span>}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {isOwnProfile && currentUser?.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-6 py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)] transition-all font-medium"
                >
                  Admin Dashboard
                </button>
              )}
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)] transition-all font-medium"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-8 border-b border-[rgba(255,255,255,0.1)]">
          <nav className="-mb-px flex space-x-8">
            {['profile', 'products', 'requests', isOwnProfile && 'security'].filter(Boolean).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`${activeTab === tab
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-[#A0A0A0] hover:text-white hover:border-[rgba(255,255,255,0.3)]'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors`}
              >
                {tab === 'products' ? (isOwnProfile ? 'My Products' : 'Products') :
                  tab === 'requests' ? (isOwnProfile ? 'My Requests' : 'Requests') : tab}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Personal Information */}
            <div className="glass-card p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-1 h-6 bg-[#D4AF37] rounded-full"></span>
                  Personal Information
                </h2>
                {canEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[#D4AF37] hover:text-white text-sm font-semibold transition-colors uppercase tracking-wider"
                  >
                    Edit Details
                  </button>
                )}
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                {/* Display Name (Read-only) */}
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profileUser?.displayName || ''}
                    disabled
                    className="form-input-anasyf opacity-60 cursor-not-allowed"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileUser?.email || ''}
                    disabled
                    className="form-input-anasyf opacity-60 cursor-not-allowed"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={canEdit && isEditing ? phone : (profileUser?.phone || 'Not set')}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!canEdit || !isEditing}
                    placeholder="+1 234 567 8900"
                    className={`form-input-anasyf ${!canEdit || !isEditing ? 'opacity-80' : ''}`}
                  />
                </div>

                {/* About / Bio */}
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    About / Bio
                  </label>
                  <textarea
                    value={canEdit && isEditing ? about : (profileUser?.about || 'No bio available')}
                    onChange={(e) => setAbout(e.target.value)}
                    disabled={!canEdit || !isEditing}
                    rows={4}
                    className={`form-input-anasyf ${!canEdit || !isEditing ? 'opacity-80 text-[#A0A0A0]' : 'text-white'
                      }`}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Company Logo */}
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    Company Logo
                  </label>

                  {logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={logoPreview}
                        alt="Company logo"
                        className="w-24 h-24 object-cover rounded-lg border border-[rgba(255,255,255,0.1)]"
                      />
                      {canEdit && isEditing && (
                        <div className="space-x-2">
                          <label className="cursor-pointer">
                            <span className="inline-block px-4 py-2 bg-[#D4AF37] text-[#0F1B2B] font-bold rounded-md hover:bg-white transition-colors">
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
                            className="bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)]"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {!canEdit ? (
                        <p className="text-sm text-[#A0A0A0]">No logo uploaded</p>
                      ) : (
                        isEditing && (
                          <label className="cursor-pointer inline-block">
                            <span className="inline-block px-4 py-2 bg-[#D4AF37] text-[#0F1B2B] font-bold rounded-md hover:bg-white transition-colors">
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
                    <Button type="submit" className="bg-gradient-to-r from-[#FFD700] to-[#FDB931] text-[#0F1B2B] font-bold border-none hover:shadow-lg">
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      className="bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)] border-none"
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
            <div className="glass-card p-8">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-1 h-6 bg-[#D4AF37] rounded-full"></span>
                Company Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={profileUser?.companyName || 'Not set'}
                    disabled
                    className="form-input-anasyf opacity-60 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    Role
                  </label>
                  <input
                    type="text"
                    value={formatRole(profileUser?.role)}
                    disabled
                    className="form-input-anasyf opacity-60 cursor-not-allowed"
                  />
                </div>
                {profileUser?.country && (
                  <div>
                    <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={getCountryLabel(profileUser.country)}
                      disabled
                      className="form-input-anasyf opacity-60 cursor-not-allowed"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">
                {isOwnProfile ? 'My Products' : `${profileUser?.displayName || 'User'}'s Products`}
              </h2>
              {isOwnProfile && (
                <Button onClick={handleOpenProductModal} className="bg-[#D4AF37] text-[#0F1B2B] hover:bg-white font-bold border-none">
                  Add Product
                </Button>
              )}
            </div>
            <ProductList
              products={products}
              loading={productsLoading}
              isOwnProfile={isOwnProfile}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              onToggleStatus={handleToggleProductStatus}
            />
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="glass-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-white">
                {isOwnProfile ? 'My Requests' : `${profileUser?.displayName || 'User'}'s Requests`}
              </h2>
              {isOwnProfile && (
                <Button onClick={handleOpenRequestModal} className="bg-[#D4AF37] text-[#0F1B2B] hover:bg-white font-bold border-none">
                  Create Request
                </Button>
              )}
            </div>
            <RequestList
              requests={requests}
              categories={categories}
              loading={requestsLoading}
              isOwnProfile={isOwnProfile}
              onEdit={handleEditRequest}
              onDelete={handleDeleteRequest}
              onClose={handleCloseRequest}
              onReopen={handleReopenRequest}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}

        {/* Security Tab - Only for own profile */}
        {isOwnProfile && activeTab === 'security' && (
          <div className="space-y-6">
            {/* Change Password */}
            <div className="glass-card p-8">
              <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="form-input-anasyf"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="form-input-anasyf"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#A0A0A0] font-semibold tracking-wider uppercase mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="form-input-anasyf"
                  />
                </div>
                <div className="pt-4">
                  <Button type="submit" className="bg-[#D4AF37] text-[#0F1B2B] hover:bg-white font-bold border-none">
                    Update Password
                  </Button>
                </div>
              </form>
            </div>

            {/* Delete Account */}
            <div className="glass-card p-8 border border-red-900/30 bg-red-900/10">
              <h2 className="text-xl font-bold text-red-400 mb-4">Danger Zone</h2>
              <p className="text-[#A0A0A0] mb-6">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <Button
                variant="destructive"
                onClick={handleOpenDeleteModal}
                className="bg-red-600 hover:bg-red-700 text-white border-none"
              >
                Delete Account
              </Button>
            </div>
          </div>
        )}

        {/* Product Modal */}
        <Modal
          isOpen={productModalOpen}
          onClose={() => setProductModalOpen(false)}
          title={editingProduct ? 'Edit Product' : 'Add New Product'}
        >
          <ProductForm
            product={editingProduct}
            onSubmit={handleProductSubmit}
            onCancel={() => setProductModalOpen(false)}
            userId={userId}
          />
        </Modal>

        {/* Request Modal */}
        <Modal
          isOpen={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          title={editingRequest ? 'Edit Request' : 'Create New Request'}
        >
          <RequestForm
            request={editingRequest}
            categories={categories}
            onSubmit={handleRequestSubmit}
            onCancel={() => setRequestModalOpen(false)}
            userId={userId}
          />
        </Modal>
      </main>
    </div>
  );
}
