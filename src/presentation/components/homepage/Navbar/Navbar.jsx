/**
 * Homepage Navbar Component
 *
 * Fixed navigation bar with dropdown menus.
 * Nav items grouped into: Marketplace, Services, News & Events, My Account, About.
 * My Account only visible to authenticated users.
 * Role-based items hidden for unauthorized roles.
 */

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLogout } from '@/presentation/hooks/auth/useLogout';
import {
  Menu,
  X,
  User,
  LogOut,
  Settings as SettingsIcon,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { ROLES } from '@/core/constants/roles';
import toast from 'react-hot-toast';
import { usePathname } from 'next/navigation';

// Lazy-load non-critical components
const NotificationBell = dynamic(
  () =>
    import('@/presentation/components/common/NotificationBell/NotificationBell').then(
      (mod) => mod.NotificationBell
    ),
  { ssr: false, loading: () => <div className="w-8 h-8" /> }
);

const CurrencyTicker = dynamic(
  () =>
    import('@/presentation/components/homepage/CurrencyTicker/CurrencyTicker').then(
      (mod) => mod.CurrencyTicker
    ),
  { ssr: false, loading: () => <div className="w-full h-8 bg-[rgba(255,255,255,0.03)]" /> }
);

/**
 * Dropdown menu definitions.
 * Each group has a label and items.
 * Items with roles are only shown when user.role matches.
 * Groups with authOnly are only shown to authenticated users.
 */
const getNavGroups = (user) => [
  {
    label: 'Marketplace',
    items: [
      { label: 'Products', href: '/products' },
      { label: 'RFQs', href: '/requests' },
      { label: 'Categories', href: '/categories' },
    ],
  },
  {
    label: 'Services',
    items: [
      { label: 'Logistics', href: '/provider/dashboard', roles: [ROLES.LOGISTICS_PROVIDER, ROLES.INSURANCE_PROVIDER, ROLES.ADMIN] },
      { label: 'Insurance', href: '/provider/dashboard', roles: [ROLES.INSURANCE_PROVIDER, ROLES.LOGISTICS_PROVIDER, ROLES.ADMIN] },
      { label: 'Legal Support', href: '/lawyer/dashboard', roles: [ROLES.LAWYER, ROLES.ADMIN] },
      { label: 'Deal Review', href: '/lawyer/deals', roles: [ROLES.LAWYER, ROLES.ADMIN] },
    ],
  },
  {
    label: 'News & Events',
    items: [
      { label: 'Trade News', href: '/news' },
      { label: 'Fairs', href: '/fairs' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Freight Estimator', href: '/freight-estimator' },
    ],
  },
  {
    label: 'My Account',
    authOnly: true,
    items: [
      { label: 'My Deals', href: '/deals', roles: [ROLES.MEMBER, ROLES.ADMIN] },
      { label: 'Messages', href: '/messages' },
      { label: 'Lawyer Dashboard', href: '/lawyer/dashboard', roles: [ROLES.LAWYER, ROLES.ADMIN] },
      { label: 'Provider Dashboard', href: '/provider/dashboard', roles: [ROLES.LOGISTICS_PROVIDER, ROLES.INSURANCE_PROVIDER] },
      { label: 'Settings', href: '/settings' },
    ],
  },
  {
    label: 'About',
    items: [
      { label: 'About Us', href: '/about-us' },
      // { label: 'Pricing', href: '/pricing' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact', href: '/contact' },
    ],
  },
];

/**
 * Desktop dropdown component — opens on hover.
 */
function DesktopDropdown({ group, isActive, onNavigate }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  const hasActiveChild = group.items.some((item) => isActive(item.href));

  return (
    <div
      className="relative px-3 -mx-3 py-2 -my-2"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        className="nav-link flex items-center gap-1"
        style={{
          color: (open || hasActiveChild) ? '#FFD700' : undefined,
          fontWeight: (open || hasActiveChild) ? 700 : undefined,
          opacity: (open || hasActiveChild) ? 1 : undefined,
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {group.label}
        <ChevronDown
          className="w-3.5 h-3.5 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      <div
        className={`absolute left-0 top-full pt-2 z-50 transition-all duration-200 ${
          open ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
        }`}
      >
        <div
          className="min-w-[200px] rounded-xl border border-[rgba(255,255,255,0.1)] shadow-xl overflow-hidden"
          style={{ backgroundColor: '#0F1B2B' }}
        >
          {group.items.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="block px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] hover:text-[#FFD700] transition-colors"
              style={{
                color: isActive(item.href) ? '#FFD700' : undefined,
                fontWeight: isActive(item.href) ? 600 : undefined,
              }}
              onClick={() => {
                setOpen(false);
                onNavigate();
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile accordion dropdown.
 */
function MobileAccordion({ group, isActive, onNavigate }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        className="w-full flex items-center justify-between py-3 text-white hover:text-[#FFD700] transition-colors"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-medium">{group.label}</span>
        <ChevronDown
          className="w-4 h-4 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>
      {open && (
        <div className="pl-4 pb-2 space-y-1">
          {group.items.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className="block py-2 text-sm transition-colors hover:text-[#FFD700]"
              style={{
                color: isActive(item.href) ? '#FFD700' : 'rgba(255,255,255,0.8)',
                fontWeight: isActive(item.href) ? 600 : 400,
              }}
              onClick={onNavigate}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { user, isAuthenticated, loading } = useAuth();
  const { logout } = useLogout();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef(null);
  const pathname = usePathname();
  const navRef = useRef(null);

  // Track navbar height and expose as CSS variable
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updateHeight = () => {
      document.documentElement.style.setProperty(
        '--navbar-height',
        `${nav.offsetHeight}px`
      );
    };

    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let rafId = null;

    const handleScroll = () => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 50);
        rafId = null;
      });
    };

    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      // Clear session cookie before reload so middleware doesn't redirect
      await fetch('/api/auth/session', { method: 'DELETE' }).catch(() => {});
      window.location.reload();
    } catch (error) {
      console.error('Logout failed', error);
      toast.error('Failed to log out. Please try again.');
    }
  }, [logout]);

  const isActive = useCallback(
    (path) => pathname === path || (path !== '/' && pathname.startsWith(path)),
    [pathname]
  );

  const roleLoading = loading || (isAuthenticated && !user?.role);

  /**
   * Build visible nav groups: filter out authOnly groups for unauthenticated users,
   * and filter out role-restricted items within each group.
   * Drop groups that end up with zero visible items.
   */
  const visibleGroups = useMemo(() => {
    const groups = getNavGroups(user);
    return groups
      .filter((group) => {
        if (group.authOnly && !isAuthenticated) return false;
        return true;
      })
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => !item.roles || (user && item.roles.includes(user.role))
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [user, user?.role, isAuthenticated]);

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);

  return (
    <nav ref={navRef} className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      {/* Main nav row */}
      <div className="navbar-content">
        {/* Logo */}
        <div className="nav-logo-container">
          <Link
            href="/"
            onClick={(e) => {
              if (pathname === '/') {
                e.preventDefault();
                window.location.reload();
              }
            }}
          >
            <Image
              src="/icons/ctg-logo-optimized.png"
              alt="CoreTradeGlobal"
              width={200}
              height={109}
              className="nav-logo-img"
              priority
            />
          </Link>
        </div>

        {/* Desktop Navigation — Dropdown Groups */}
        <div className="nav-links hidden md:flex">
          {roleLoading ? (
            <div className="flex items-center gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-16 h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
              ))}
            </div>
          ) : (
            visibleGroups.map((group) => (
              <DesktopDropdown
                key={group.label}
                group={group}
                isActive={isActive}
                onNavigate={() => {}}
              />
            ))
          )}

          {/* Auth Section */}
          {roleLoading ? (
            <div className="w-20 h-8 bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* Messages Icon */}
              <Link
                href="/messages"
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                aria-label="Messages"
                title="Messages"
              >
                <MessageSquare
                  className="w-5 h-5"
                  style={{ color: isActive('/messages') ? '#FFD700' : '#F5F5F5' }}
                />
              </Link>
              <NotificationBell />
              {/* User Avatar Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  aria-expanded={showUserMenu}
                  aria-haspopup="menu"
                  aria-label={`Account menu for ${user.companyName || user.displayName || 'Account'}`}
                >
                  {user.companyLogo || user.photoURL ? (
                    <img
                      src={user.companyLogo || user.photoURL}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover object-center border border-[#FFD700]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#FFD700] flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-[#0F1B2B]" />
                    </div>
                  )}
                  <span className="text-white text-sm font-medium">
                    {user.companyName || user.displayName || 'Account'}
                  </span>
                </button>

                <div
                  style={{ backgroundColor: '#0F1B2B' }}
                  className={`absolute right-0 top-full mt-2 w-48 border border-[rgba(255,255,255,0.1)] rounded-xl shadow-xl overflow-hidden transition-all duration-200 z-50 ${
                    showUserMenu ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                  }`}
                >
                  <Link
                    href={`/profile/${user.uid}`}
                    className="block px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.1)]"
                    onClick={() => setShowUserMenu(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    href="/settings"
                    className="block px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center gap-2"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <SettingsIcon className="w-4 h-4" />
                    Settings
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="block px-4 py-3 text-sm text-[var(--accent-gold)] hover:bg-[rgba(255,215,0,0.1)] font-semibold"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <div className="h-px bg-[rgba(255,255,255,0.1)] my-1" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-[rgba(255,50,50,0.1)] flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <a href="/login" className="nav-link">
                Log In
              </a>
              <a href="/register" className="btn-signup">
                Register
              </a>
            </>
          )}
        </div>

        {/* Mobile Menu Button & Notification */}
        <div className="md:hidden flex items-center gap-2">
          {isAuthenticated && user && (
            <>
              <Link
                href="/messages"
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                aria-label="Messages"
              >
                <MessageSquare
                  className="w-5 h-5"
                  style={{ color: isActive('/messages') ? '#FFD700' : '#F5F5F5' }}
                />
              </Link>
              <NotificationBell />
              <Link
                href={`/profile/${user.uid}`}
                className="w-10 h-10 flex-shrink-0 rounded-full overflow-hidden border-2 border-[#FFD700] hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#FFD700' }}
              >
                {user.companyLogo || user.photoURL ? (
                  <img
                    src={user.companyLogo || user.photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#FFD700]">
                    <User className="w-5 h-5 text-[#0F1B2B]" />
                  </div>
                )}
              </Link>
            </>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-10 h-10 flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
      {/* end navbar-content */}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden absolute top-full left-0 right-0 bg-[#0F1B2B] border-t border-[rgba(255,255,255,0.1)] shadow-lg overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - var(--navbar-height, 100px))' }}
        >
          <div className="px-6 py-4 space-y-1">
            {roleLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-24 h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
                ))}
              </div>
            ) : (
              visibleGroups.map((group) => (
                <MobileAccordion
                  key={group.label}
                  group={group}
                  isActive={isActive}
                  onNavigate={closeMobileMenu}
                />
              ))
            )}

            <div className="pt-4 mt-2 border-t border-[rgba(255,255,255,0.1)] space-y-1">
              {roleLoading ? (
                <div className="w-full h-10 bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
              ) : isAuthenticated && user ? (
                <>
                  <Link
                    href={`/profile/${user.uid}`}
                    className="block py-3 transition-colors hover:text-[#FFD700]"
                    style={{
                      color: isActive(`/profile/${user.uid}`) ? '#FFD700' : '#FFFFFF',
                      fontWeight: isActive(`/profile/${user.uid}`) ? 600 : 400,
                    }}
                    onClick={closeMobileMenu}
                  >
                    My Profile
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="block py-3 transition-colors hover:text-[#FFD700]"
                      style={{
                        color: isActive('/admin') ? '#FFD700' : '#FFFFFF',
                        fontWeight: isActive('/admin') ? 600 : 400,
                      }}
                      onClick={closeMobileMenu}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 text-left text-red-400 hover:text-red-300 font-medium"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 mt-4">
                  <a
                    href="/login"
                    className="btn-hero-secondary w-full text-center justify-center"
                    style={{ padding: '14px 24px', fontSize: '16px' }}
                    onClick={closeMobileMenu}
                  >
                    Log In
                  </a>
                  <a
                    href="/register"
                    className="btn-hero-white w-full text-center"
                    style={{ padding: '14px 24px', fontSize: '16px' }}
                    onClick={closeMobileMenu}
                  >
                    Register
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Currency ticker */}
      <CurrencyTicker />
    </nav>
  );
}

export default Navbar;
