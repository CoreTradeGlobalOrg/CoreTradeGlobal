/**
 * Homepage Navbar Component
 *
 * Fixed navigation bar for the public homepage
 * Changes background on scroll - matches design exactly
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useLogout } from '@/presentation/hooks/auth/useLogout';
import { Menu, X, User, LogOut } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Products', href: '/products' },
  { label: 'RFQs', href: '/requests' },
  { label: 'Categories', href: '/categories' },
  { label: 'Fairs', href: '/fairs' },
  { label: 'FAQ', href: '#faq' },
  { label: 'About Us', href: '/about-us' },
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
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
      {/* Logo Container */}
      <div className="nav-logo-container">
        <Link href="/">
          <Image
            src="/Core-png.png"
            alt="CoreTradeGlobal"
            width={120}
            height={120}
            className="nav-logo-img"
            priority
          />
        </Link>
        <Link href="/" className="nav-brand-text">CoreTG</Link>
      </div>

      {/* Desktop Navigation Links */}
      <div className="nav-links hidden md:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link ${isActive(link.href) ? 'font-bold opacity-100' : ''}`}
            style={{ color: isActive(link.href) ? '#FFD700' : undefined }}
            onClick={(e) => handleNavClick(link.href, e)}
          >
            {link.label}
          </Link>
        ))}

        {/* Auth Section */}
        {loading ? (
          <div className="w-20 h-8 bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
        ) : isAuthenticated && user ? (
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

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden w-10 h-10 flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.1)] rounded-lg transition-colors"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-[#0F1B2B] border-t border-[rgba(255,255,255,0.1)] shadow-lg">
          <div className="px-6 py-4 space-y-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-white hover:text-[#FFD700] py-2 transition-colors"
                onClick={(e) => handleNavClick(link.href, e)}
              >
                {link.label}
              </Link>
            ))}

            <div className="pt-4 border-t border-[rgba(255,255,255,0.1)] space-y-3">
              {loading ? (
                <div className="w-full h-10 bg-[rgba(255,255,255,0.1)] rounded-full animate-pulse" />
              ) : isAuthenticated && user ? (
                <>
                  <Link
                    href={`/profile/${user.uid}`}
                    className="btn-signup w-full flex items-center justify-center gap-2"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    My Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2 text-center text-red-400 hover:text-red-300 font-medium"
                  >
                    Log Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block text-center text-white hover:text-[#FFD700] py-2 transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="btn-signup block text-center w-full"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
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
