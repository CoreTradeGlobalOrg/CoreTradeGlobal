/**
 * Homepage Navbar Component
 *
 * Fixed navigation bar for the public homepage
 * Changes background on scroll - matches design exactly
 * Nav links are filtered by user role — unauthorized areas are hidden completely.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLogout } from '@/presentation/hooks/auth/useLogout';
import { Menu, X, User, LogOut } from 'lucide-react';
import { NotificationBell } from '@/presentation/components/common/NotificationBell/NotificationBell';
import { ROLES } from '@/core/constants/roles';

/**
 * NAV_LINKS
 *
 * roles: null  — visible to everyone (authenticated or not)
 * roles: [...]  — only visible when user.role is in the array
 *
 * User decision: menu items hidden completely for unauthorized areas (not greyed out).
 */
const NAV_LINKS = [
  { label: 'Products', href: '/products', roles: null },
  { label: 'RFQs', href: '/requests', roles: [ROLES.MEMBER, ROLES.ADMIN] },
  { label: 'My Deals', href: '/deals', roles: [ROLES.MEMBER, ROLES.ADMIN] },
  { label: 'Categories', href: '/categories', roles: null },
  { label: 'Fairs', href: '/fairs', roles: null },
  { label: 'News', href: '/news', roles: null },
  { label: 'FAQ', href: '/faq', roles: null },
  { label: 'About Us', href: '/about-us', roles: null },
  // Provider-only navigation
  {
    label: 'Provider Dashboard',
    href: '/provider/dashboard',
    roles: [ROLES.LOGISTICS_PROVIDER, ROLES.INSURANCE_PROVIDER],
  },
  // Lawyer-only navigation — admin included for oversight
  { label: 'Lawyer Dashboard', href: '/lawyer/dashboard', roles: [ROLES.LAWYER, ROLES.ADMIN] },
  { label: 'Client Channels', href: '/lawyer/channels', roles: [ROLES.LAWYER, ROLES.ADMIN] },
  { label: 'Deal Review', href: '/lawyer/deals', roles: [ROLES.LAWYER, ROLES.ADMIN] },
];

import { usePathname } from 'next/navigation';

export function Navbar() {
  const { user, isAuthenticated, loading } = useAuth();
  const { logout } = useLogout();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let rafId = null;

    const handleScroll = () => {
      if (rafId) return;

      rafId = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 50);
        rafId = null;
      });
    };

    // Set initial state
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

  const handleNavClick = (href, e) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const isActive = (path) => {
    return pathname === path || (path !== '/' && pathname.startsWith(path));
  };

  // Show loading state while role is still resolving (prevents flash of default nav)
  const roleLoading = loading || (isAuthenticated && !user?.role);

  /**
   * Filter nav links by user role.
   * - roles: null  → always visible
   * - roles: [...]  → only visible when user.role is in the list
   */
  const visibleLinks = NAV_LINKS.filter(
    (link) => link.roles === null || (user && link.roles.includes(user.role))
  );

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      {/* Logo Container */}
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
            src="/icons/ctg-logo.png"
            alt="CoreTradeGlobal"
            width={180}
            height={180}
            className="nav-logo-img"
            priority
          />
        </Link>
      </div>

      {/* Desktop Navigation Links */}
      <div className="nav-links hidden md:flex">
        {roleLoading ? (
          <div className="flex items-center gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-16 h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
            ))}
          </div>
        ) : (
          visibleLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${isActive(link.href) ? 'font-bold opacity-100' : ''}`}
              style={{ color: isActive(link.href) ? '#FFD700' : undefined }}
              onClick={(e) => handleNavClick(link.href, e)}
            >
              {link.label}
            </Link>
          ))
        )}

        {/* Auth Section */}
        {roleLoading ? (
          <div className="w-20 h-8 bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
        ) : isAuthenticated && user ? (
          <div className="flex items-center gap-3">
            {/* Messages Link */}
            <Link
              href="/messages"
              className="nav-link hover:text-[#3b82f6] transition-colors"
            >
              Messages
            </Link>
            <NotificationBell />
            <div className="relative group">
              <button
                className="btn-signup flex items-center gap-2"
                onClick={() => setShowUserMenu(!showUserMenu)}
                onMouseEnter={() => setShowUserMenu(true)}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>

            <div
              className={`absolute right-0 top-full mt-2 w-48 bg-[#0F1B2B] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-xl overflow-hidden transition-all duration-200 ${showUserMenu ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0'}`}
              onMouseLeave={() => setShowUserMenu(false)}
            >
              <Link
                href={`/profile/${user.uid}`}
                className="block px-4 py-3 text-sm text-white hover:bg-[rgba(255,255,255,0.1)]"
              >
                My Profile
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="block px-4 py-3 text-sm text-[var(--accent-gold)] hover:bg-[rgba(255,215,0,0.1)] font-semibold"
                >
                  Admin Dashboard
                </Link>
              )}
              <div className="h-px bg-[rgba(255,255,255,0.1)] my-1"></div>
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
            <Link href="/login" className="nav-link">
              Log In
            </Link>
            <Link href="/register" className="btn-signup">
              Register
            </Link>
          </>
        )}
      </div>

      {/* Mobile Menu Button & Notification */}
      <div className="md:hidden flex items-center gap-2">
        {isAuthenticated && user && (
          <>
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
          className="w-10 h-10 flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0F1B2B] border-t border-[rgba(255,255,255,0.1)] shadow-lg">
          <div className="px-6 py-4 space-y-1">
            {roleLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-24 h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse" />
                ))}
              </div>
            ) : (
              visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-3 transition-colors hover:text-[#FFD700]"
                  style={{ color: isActive(link.href) ? '#FFD700' : '#FFFFFF', fontWeight: isActive(link.href) ? 600 : 400 }}
                  onClick={(e) => handleNavClick(link.href, e)}
                >
                  {link.label}
                </Link>
              ))
            )}

            <div className="pt-4 mt-2 border-t border-[rgba(255,255,255,0.1)] space-y-1">
              {roleLoading ? (
                <div className="w-full h-10 bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
              ) : isAuthenticated && user ? (
                <>
                  <Link
                    href="/messages"
                    className="block py-3 transition-colors hover:text-[#FFD700]"
                    style={{ color: isActive('/messages') ? '#FFD700' : '#FFFFFF', fontWeight: isActive('/messages') ? 600 : 400 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Messages
                  </Link>
                  <Link
                    href={`/profile/${user.uid}`}
                    className="block py-3 transition-colors hover:text-[#FFD700]"
                    style={{ color: isActive(`/profile/${user.uid}`) ? '#FFD700' : '#FFFFFF', fontWeight: isActive(`/profile/${user.uid}`) ? 600 : 400 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      className="block py-3 transition-colors hover:text-[#FFD700]"
                      style={{ color: isActive('/admin') ? '#FFD700' : '#FFFFFF', fontWeight: isActive('/admin') ? 600 : 400 }}
                      onClick={() => setIsMobileMenuOpen(false)}
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
                <>
                  <div className="flex flex-col gap-3 mt-4">
                    <Link
                      href="/login"
                      className="btn-hero-secondary w-full text-center justify-center"
                      style={{ padding: '14px 24px', fontSize: '16px' }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Log In
                    </Link>
                    <Link
                      href="/register"
                      className="btn-hero-white w-full text-center"
                      style={{ padding: '14px 24px', fontSize: '16px' }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Register
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
