/**
 * Profile Page - Dynamic
 *
 * URL: /profile/[userId]
 * Protected route - requires authentication
 * Uses Dark Theme / Glassmorphism
 */

'use client';

import { useAuth } from '@/presentation/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, Suspense, useLayoutEffect } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
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
import { CompanyDocuments } from '@/presentation/components/features/profile/CompanyDocuments/CompanyDocuments';

function ProfileContent() {
  const { user: currentUser, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId;

  // Scroll to top on page load
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Request modal state
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  // Pagination state
  const [productPage, setProductPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  // Responsive items per page
  useEffect(() => {
    const updateItemsPerPage = () => {
      setItemsPerPage(window.innerWidth < 768 ? 1 : 3);
    };
    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);
  const [categoryName, setCategoryName] = useState(null);
  const [showStickyHeader, setShowStickyHeader] = useState(false);

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
  const [linkedinProfile, setLinkedinProfile] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const [profileUpdating, setProfileUpdating] = useState(false);

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

        // Initialize form if can edit profile (own or admin)
        if (isOwnProfile || currentUser?.role === 'admin') {
          setPhone(userData.phone || '');
          setAbout(userData.about || '');
          setLinkedinProfile(userData.linkedinProfile || '');
          setCompanyWebsite(userData.companyWebsite || '');
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

  // Redirect to login if not authenticated (use replace to fix back button)
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace(`/login?redirect=/profile/${userId}`);
    }
  }, [authLoading, isAuthenticated, router, userId]);

  // Handle scroll for sticky header
  useEffect(() => {
    const handleScroll = () => {
      // Show sticky header after scrolling past 300px
      setShowStickyHeader(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch category name from Firebase
  useEffect(() => {
    const fetchCategory = async () => {
      if (!profileUser?.companyCategory) {
        setCategoryName(null);
        return;
      }

      try {
        const firestoreDS = container.getFirestoreDataSource();
        const categoryDoc = await firestoreDS.getById('categories', profileUser.companyCategory);
        if (categoryDoc && categoryDoc.name) {
          setCategoryName(categoryDoc.name);
        } else {
          setCategoryName(profileUser.companyCategory);
        }
      } catch (error) {
        console.error('Error fetching category:', error);
        setCategoryName(profileUser.companyCategory);
      }
    };

    fetchCategory();
  }, [profileUser?.companyCategory]);

  // Show loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-radial-navy">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700] mx-auto"></div>
          <p className="mt-4 text-[#A0A0A0]">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated or profile not loaded
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

  const formatCategory = (name) => {
    if (!name) return 'Not set';
    return name.toUpperCase();
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
      setLogoRemoved(false); // Reset removed flag when new file is selected
      setLogoLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setLogoLoading(false);
      };
      reader.onerror = () => {
        toast.error('Failed to load image');
        setLogoLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoRemoved(true); // Mark logo for removal
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    setProfileUpdating(true);

    try {
      const userRepository = container.getUserRepository();
      const storageDataSource = container.getFirebaseStorageDataSource();

      // Handle logo: upload new, remove, or keep existing
      let logoUrl = profileUser.companyLogo;

      if (logoRemoved) {
        // User wants to remove logo
        logoUrl = null;
      } else if (logoFile) {
        // Upload new logo
        const fileExtension = logoFile.name.split('.').pop();
        const path = `${userId}/company-logo/image.${fileExtension}`;
        logoUrl = await storageDataSource.uploadFile(path, logoFile);
      }

      // Update profile
      await userRepository.update(userId, {
        phone,
        about,
        linkedinProfile,
        companyWebsite,
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
      setLogoRemoved(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setProfileUpdating(false);
    }
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

  const isAdmin = currentUser?.role === 'admin' && !isOwnProfile;

  const handleProductSubmit = async (productData, imageFiles) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, userId, productData, imageFiles, { isAdmin });
      } else {
        await createProduct(productData, imageFiles);
        setProductPage(1); // Go to first page to see new product
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
      await deleteProduct(productId, userId, { isAdmin });
      // Adjust page if current page becomes empty
      const newTotal = (products?.length || 1) - 1;
      const maxPage = Math.ceil(newTotal / itemsPerPage) || 1;
      if (productPage > maxPage) setProductPage(maxPage);
      refetchProducts();
    } catch (error) {
      // Error already shown by hook
      console.error('Product delete error:', error);
    }
  };

  const handleToggleProductStatus = async (productId, newStatus) => {
    try {
      await updateProduct(productId, userId, { status: newStatus }, [], { isAdmin });
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
        await updateRequest(editingRequest.id, userId, requestData, { isAdmin });
      } else {
        await createRequest(requestData);
        setRequestPage(1); // Go to first page to see new request
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
      await deleteRequest(requestId, userId, { isAdmin });
      // Adjust page if current page becomes empty
      const newTotal = (requests?.length || 1) - 1;
      const maxPage = Math.ceil(newTotal / itemsPerPage) || 1;
      if (requestPage > maxPage) setRequestPage(maxPage);
      refetchRequests();
    } catch (error) {
      // Error already shown by hook
      console.error('Request delete error:', error);
    }
  };

  const handleCloseRequest = async (requestId) => {
    try {
      await updateRequest(requestId, userId, { status: 'closed' }, { isAdmin });
      refetchRequests();
      toast.success('Request closed!');
    } catch (error) {
      console.error('Request close error:', error);
      toast.error('Failed to close request');
    }
  };

  const handleReopenRequest = async (requestId) => {
    try {
      await updateRequest(requestId, userId, { status: 'active' }, { isAdmin });
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
      {/* Sticky Header - appears on scroll */}
      <header className={`border-b border-[rgba(255,255,255,0.1)] bg-[rgba(15,27,43,0.95)] backdrop-blur-md fixed top-[60px] md:top-[80px] left-0 right-0 z-40 py-4 transition-all duration-300 ${showStickyHeader ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* User Info with Logo */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Company Logo or Building Icon */}
              {profileUser?.companyLogo ? (
                <img
                  src={profileUser.companyLogo}
                  alt="Company logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[rgba(255,215,0,0.3)] shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1c304a] to-[#0F1B2B] border border-[rgba(255,255,255,0.1)] flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                  <span className="text-2xl sm:text-3xl">🏭</span>
                </div>
              )}

              {/* User Name and Position */}
              <div className="min-w-0">
                <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 truncate">
                  {profileUser?.displayName || profileUser?.email || 'User'}
                </h1>
                <p className="text-[#A0A0A0] flex items-center gap-2 text-sm sm:text-base flex-wrap">
                  <span className="text-[#FFD700] font-medium truncate">{profileUser?.companyName || 'No company'}</span>
                  {profileUser?.position && <span className="w-1 h-1 rounded-full bg-[#A0A0A0] hidden sm:block"></span>}
                  {profileUser?.position && <span className="hidden sm:inline truncate">{profileUser.position}</span>}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
              {isOwnProfile && currentUser?.role === 'admin' && (
                <button
                  onClick={() => router.push('/admin')}
                  className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)] transition-all font-medium text-sm sm:text-base"
                >
                  Admin
                </button>
              )}
              <button
                onClick={() => router.push('/')}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)] transition-all font-medium text-sm sm:text-base"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pt-[140px] pb-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Profile Card - Combined */}
        <div className="glass-card p-6">
          <form onSubmit={handleProfileUpdate}>
            {/* Header Row: Logo + Name + Edit Button */}
            <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
              {/* Logo Section */}
              <div className="flex-shrink-0">
                {logoLoading ? (
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#FFD700] bg-[rgba(255,215,0,0.1)] flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (isEditing ? logoPreview : profileUser?.companyLogo) ? (
                  <div className="relative">
                    <img
                      src={isEditing ? logoPreview : profileUser?.companyLogo}
                      alt="Company logo"
                      className="w-24 h-24 object-cover rounded-2xl border-2 border-[rgba(255,215,0,0.3)]"
                    />
                    {canEdit && isEditing && (
                      <div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-2">
                        <label className="cursor-pointer bg-[#FFD700] text-[#0F1B2B] text-xs px-2 py-1 rounded font-medium hover:bg-white transition-colors">
                          Change
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoChange}
                            className="sr-only"
                            disabled={profileUpdating}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          disabled={profileUpdating}
                          className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium hover:bg-red-400 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#1c304a] to-[#0F1B2B] border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
                      <span className="text-4xl">🏭</span>
                    </div>
                    {canEdit && isEditing && (
                      <label className="absolute -bottom-2 left-0 right-0 flex justify-center cursor-pointer">
                        <span className="bg-[#FFD700] text-[#0F1B2B] text-xs px-3 py-1 rounded font-medium hover:bg-white transition-colors">
                          Upload
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="sr-only"
                          disabled={profileUpdating}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Name & Bio Section */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {profileUser?.displayName || 'User'}
                    </h2>
                    <p className="text-[#FFD700] font-medium">
                      {profileUser?.companyName || 'No company'}
                      {profileUser?.position && <span className="text-[#A0A0A0]"> • {profileUser.position}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isOwnProfile && !isEditing && (
                      <Link
                        href="/settings"
                        className="text-sm text-[#A0A0A0] hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                    )}
                    {canEdit && !isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="px-5 py-2 text-sm font-bold bg-[#FFD700] text-[#0F1B2B] rounded-lg hover:bg-white transition-all"
                      >
                        Edit Profile
                      </button>
                    )}
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-4">
                  {isEditing ? (
                    <textarea
                      value={about}
                      onChange={(e) => {
                        setAbout(e.target.value);
                        // Auto-resize textarea
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                      ref={(el) => {
                        // Initial auto-resize when entering edit mode
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }
                      }}
                      placeholder="Tell us about yourself and your company..."
                      className="w-full bg-[rgba(255,255,255,0.05)] border-2 border-[#FFD700]/50 rounded-xl p-4 text-white text-sm leading-relaxed placeholder-[#A0A0A0] focus:outline-none focus:border-[#FFD700] resize-none min-h-[80px] overflow-hidden shadow-[0_0_15px_rgba(255,215,0,0.2)] animate-pulse-glow"
                    />
                  ) : (
                    <p className="text-[#A0A0A0] text-sm leading-relaxed whitespace-pre-wrap">
                      {profileUser?.about || 'No bio available'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Details Grid - 2x2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[rgba(255,255,255,0.1)]">
              {/* Company */}
              <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Company</p>
                <p className="text-white font-semibold text-lg truncate">{profileUser?.companyName || 'Not set'}</p>
              </div>

              {/* Category */}
              <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Category</p>
                <p className="text-white font-semibold text-lg truncate">{formatCategory(categoryName)}</p>
              </div>

              {/* Role */}
              <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Role</p>
                <p className="text-white font-semibold text-lg">{formatRole(profileUser?.role)}</p>
              </div>

              {/* Country */}
              <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Country</p>
                <p className="text-white font-semibold text-lg truncate">{getCountryLabel(profileUser?.country)}</p>
              </div>

              {/* Email - Only for own profile or admin */}
              {canEdit && (
                <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Email</p>
                    <span className="text-[10px] text-[#A0A0A0]/60">(Private)</span>
                  </div>
                  <p className="text-white font-semibold text-lg truncate">{profileUser?.email || 'Not set'}</p>
                </div>
              )}

              {/* Phone - Only for own profile or admin */}
              {canEdit && (
                <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-semibold uppercase tracking-wider bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Phone</p>
                    <span className="text-[10px] text-[#A0A0A0]/60">(Private)</span>
                  </div>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                      className="w-full bg-[rgba(255,255,255,0.05)] text-white font-semibold text-lg focus:outline-none focus:border-[#FFD700] border-2 border-[#FFD700]/50 rounded-xl px-3 py-2 shadow-[0_0_15px_rgba(255,215,0,0.2)] animate-pulse-glow"
                    />
                  ) : (
                    <p className="text-white font-semibold text-lg truncate">{profileUser?.phone || 'Not set'}</p>
                  )}
                </div>
              )}

              {/* LinkedIn Profile */}
              <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">LinkedIn</p>
                {canEdit && isEditing ? (
                  <input
                    type="url"
                    value={linkedinProfile}
                    onChange={(e) => setLinkedinProfile(e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full bg-[rgba(255,255,255,0.05)] text-white font-semibold text-base focus:outline-none focus:border-[#FFD700] border-2 border-[#FFD700]/50 rounded-xl px-3 py-2 shadow-[0_0_15px_rgba(255,215,0,0.2)] animate-pulse-glow"
                  />
                ) : profileUser?.linkedinProfile ? (
                  <a
                    href={profileUser.linkedinProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0A66C2] font-semibold text-base truncate block hover:underline"
                  >
                    {profileUser.linkedinProfile.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                ) : (
                  <p className="text-[#A0A0A0] font-semibold text-lg">{canEdit ? 'Not set - Add LinkedIn' : 'Not set'}</p>
                )}
              </div>

              {/* Company Website */}
              <div className="bg-[rgba(255,255,255,0.04)] rounded-2xl p-5 border border-[rgba(255,255,255,0.05)]">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2 bg-gradient-to-r from-[#C0C0C0] via-[#FFFFFF] to-[#C0C0C0] bg-clip-text text-transparent">Website</p>
                {canEdit && isEditing ? (
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    placeholder="https://www.company.com"
                    className="w-full bg-[rgba(255,255,255,0.05)] text-white font-semibold text-base focus:outline-none focus:border-[#FFD700] border-2 border-[#FFD700]/50 rounded-xl px-3 py-2 shadow-[0_0_15px_rgba(255,215,0,0.2)] animate-pulse-glow"
                  />
                ) : profileUser?.companyWebsite ? (
                  <a
                    href={profileUser.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFD700] font-semibold text-base truncate block hover:underline"
                  >
                    {profileUser.companyWebsite.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                ) : (
                  <p className="text-[#A0A0A0] font-semibold text-lg">{canEdit ? 'Not set - Add website' : 'Not set'}</p>
                )}
              </div>
            </div>

            {/* Save/Cancel Buttons */}
            {isEditing && (
              <div className="flex gap-3 mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)]">
                <Button
                  type="submit"
                  disabled={profileUpdating}
                  className="!bg-gradient-to-r !from-[#FFD700] !to-[#FDB931] !text-black font-bold border-none hover:shadow-lg disabled:opacity-70 text-sm px-6"
                >
                  {profileUpdating ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  type="button"
                  disabled={profileUpdating}
                  className="bg-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.2)] border-none text-sm"
                  onClick={() => {
                    setIsEditing(false);
                    setPhone(profileUser?.phone || '');
                    setAbout(profileUser?.about || '');
                    setLinkedinProfile(profileUser?.linkedinProfile || '');
                    setCompanyWebsite(profileUser?.companyWebsite || '');
                    setLogoPreview(profileUser?.companyLogo || null);
                    setLogoFile(null);
                    setLogoRemoved(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </div>

        {/* Company Documents Section */}
        <div className="glass-card p-6">
          <CompanyDocuments
            userId={userId}
            documents={profileUser?.companyDocuments || []}
            isOwnProfile={isOwnProfile}
            onDocumentsChange={(newDocs) => {
              setProfileUser(prev => ({ ...prev, companyDocuments: newDocs }));
            }}
          />
        </div>

        {/* Products Section */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 bg-[#FFD700] rounded-full"></span>
              <h3 className="text-base font-bold text-white">
                {isOwnProfile ? 'My Products' : 'Products'}{' '}
                <span className="text-sm text-[#A0A0A0] font-normal">({products?.length || 0})</span>
              </h3>
            </div>
            {canEdit && (
              <Button
                onClick={handleOpenProductModal}
                className="font-bold border-none text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
                style={{ backgroundColor: '#FFD700', color: '#0F1B2B' }}
              >
                + Add Product
              </Button>
            )}
          </div>
          <ProductList
            products={products?.slice((productPage - 1) * itemsPerPage, productPage * itemsPerPage)}
            loading={productsLoading}
            isOwnProfile={canEdit}
            onEdit={handleEditProduct}
            onDelete={handleDeleteProduct}
            onToggleStatus={handleToggleProductStatus}
          />
          {/* Products Pagination */}
          {products && products.length > itemsPerPage && (
            <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)]">
              <button
                onClick={() => setProductPage(p => Math.max(1, p - 1))}
                disabled={productPage === 1}
                className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all"
              >
                ← Previous
              </button>
              <span className="text-sm text-[#A0A0A0]">
                Page <span className="text-white font-medium">{productPage}</span> of <span className="text-white font-medium">{Math.ceil(products.length / itemsPerPage)}</span>
              </span>
              <button
                onClick={() => setProductPage(p => Math.min(Math.ceil(products.length / itemsPerPage), p + 1))}
                disabled={productPage >= Math.ceil(products.length / itemsPerPage)}
                className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Requests Section */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 bg-[#3b82f6] rounded-full"></span>
              <h3 className="text-base font-bold text-white">
                {isOwnProfile ? 'My Requests' : 'Requests'}{' '}
                <span className="text-sm text-[#A0A0A0] font-normal">({requests?.length || 0})</span>
              </h3>
            </div>
            {canEdit && (
              <Button onClick={handleOpenRequestModal} className="bg-[#3b82f6] text-white hover:bg-blue-400 font-bold border-none text-xs px-3 py-1.5 rounded-lg whitespace-nowrap">
                + Create Request
              </Button>
            )}
          </div>
          <RequestList
            requests={requests?.slice((requestPage - 1) * itemsPerPage, requestPage * itemsPerPage)}
            categories={categories}
            loading={requestsLoading}
            isOwnProfile={canEdit}
            onEdit={handleEditRequest}
            onDelete={handleDeleteRequest}
            onClose={handleCloseRequest}
            onReopen={handleReopenRequest}
            onSendMessage={handleSendMessage}
          />
          {/* Requests Pagination */}
          {requests && requests.length > itemsPerPage && (
            <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)]">
              <button
                onClick={() => setRequestPage(p => Math.max(1, p - 1))}
                disabled={requestPage === 1}
                className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all"
              >
                ← Previous
              </button>
              <span className="text-sm text-[#A0A0A0]">
                Page <span className="text-white font-medium">{requestPage}</span> of <span className="text-white font-medium">{Math.ceil(requests.length / itemsPerPage)}</span>
              </span>
              <button
                onClick={() => setRequestPage(p => Math.min(Math.ceil(requests.length / itemsPerPage), p + 1))}
                disabled={requestPage >= Math.ceil(requests.length / itemsPerPage)}
                className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[rgba(255,255,255,0.1)] transition-all"
              >
                Next →
              </button>
            </div>
          )}
        </div>

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
          variant="blue"
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

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-radial-navy">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD700] mx-auto"></div>
          <p className="mt-4 text-[#A0A0A0]">Loading...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
