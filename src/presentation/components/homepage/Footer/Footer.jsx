/**
 * Homepage Footer Component
 *
 * Dark themed footer for the public homepage
 * Matches design exactly from index.html
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNewsletter } from '@/hooks/useNewsletter';
import toast from 'react-hot-toast';

export function Footer() {
  const { email, setEmail, loading, subscribe } = useNewsletter();

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    try {
      const result = await subscribe({ source: 'footer' });
      if (result.success) {
        toast.success('Successfully subscribed!');
      }
    } catch (error) {
      toast.error('Failed to subscribe');
    }
  };

  return (
    <footer className="footer-section">
      <div className="footer-container">
        {/* Footer Grid */}
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col brand-col">
            <img src="/icons/ctg-logo-optimized.png" alt="CoreTradeGlobal" width={200} height={109} className="nav-logo-img" />
            <p>CoreTradeGlobal is an end-to-end B2B trade ecosystem that brings exporters, importers, and businesses involved in international trade together on a single platform.</p>
            <div className="flex flex-col gap-2 mt-4 text-sm text-gray-400">
              <a href="mailto:info@coretradeglobal.com" className="hover:text-[#FFD700] transition-colors !flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                <span>info@coretradeglobal.com</span>
              </a>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                <span>Warsaw, Poland</span>
              </span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="footer-col">
            <h4>Platform</h4>
            <Link href="/products">Browse Products</Link>
            <Link href="/requests">Requests for Quotation</Link>
            {/* TODO: Verified Partners sayfası hazır olduğunda açılacak
            <Link href="/companies">Verified Partners</Link>
            */}
            <Link href="/fairs">Trade Shows &amp; Fairs</Link>
          </div>

          {/* Company Links */}
          <div className="footer-col">
            <h4>Company</h4>
            <Link href="/about-us">About Us</Link>
            <Link href="/contact">Contact Support</Link>
            <Link href="/faq">FAQ</Link>
          </div>

          {/* Newsletter & Social */}
          <div className="footer-col">
            <h4>Stay Connected</h4>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="newsletter-box">
              <input
                type="email"
                className="footer-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <button
                type="submit"
                className="footer-btn hover:shadow-[0_0_20px_rgba(255,215,0,0.4)]"
                disabled={loading}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[#0F1B2B] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-[#0F1B2B]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                  </svg>
                )}
              </button>
            </form>

            {/* Social Links */}
            <div className="flex items-center gap-5 mt-4">
              <a
                href="https://x.com/CoreTradeglobal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://www.linkedin.com/company/coretg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#0A66C2] transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href="https://www.facebook.com/coretradeglobal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[#1877F2] transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <span>© 2026 CoreTradeGlobal Inc. All rights reserved.</span>
          <div className="footer-legal">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/cookie-policy">Cookie Policy</Link>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openCookieSettings'))}
              className="hover:text-[#FFD700] transition-colors"
            >
              Cookie Settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
