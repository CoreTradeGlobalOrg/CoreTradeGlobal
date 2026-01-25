/**
 * Homepage Footer Component
 *
 * Dark themed footer for the public homepage
 * Matches design exactly from index.html
 */

'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="footer-section">
      <div className="footer-container">
        {/* Footer Grid */}
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col brand-col">
            <img src="/Core-png.png" alt="CoreTradeGlobal" className="nav-logo-img" />
            <p>CoreTradeGlobal is the world&apos;s leading premium B2B marketplace matched with AI-driven connections.</p>
          </div>

          {/* Platform Links */}
          <div className="footer-col">
            <h4>Platform</h4>
            <Link href="/products">Browse Products</Link>
            <Link href="/requests">Requests for Quotation</Link>
            <Link href="/companies">Verified Partners</Link>
            <Link href="/fairs">Trade Shows &amp; Fairs</Link>
          </div>

          {/* Company Links */}
          <div className="footer-col">
            <h4>Company</h4>
            <Link href="/about">About Us</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/contact">Contact Support</Link>
            <Link href="/success-stories">Success Stories</Link>
          </div>

          {/* Newsletter */}
          <div className="footer-col">
            <h4>Stay Connected</h4>
            <div className="newsletter-box">
              <input
                type="email"
                className="footer-input"
                placeholder="Enter your email"
              />
              <button className="footer-btn">&gt;</button>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <span>© 2025 CoreTradeGlobal Inc. All rights reserved.</span>
          <div className="footer-legal">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/cookies">Cookie Settings</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
