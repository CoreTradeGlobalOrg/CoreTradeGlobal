/**
 * Cookie Policy Page
 *
 * CoreTradeGlobal Cookie Policy
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';

export default function CookiePolicyPage() {
  const router = useRouter();
  const [isNewTab, setIsNewTab] = useState(false);

  useEffect(() => {
    setIsNewTab(window.history.length <= 1 || document.referrer === '');
  }, []);

  const handleBack = () => {
    if (isNewTab) {
      window.close();
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen pt-[120px] pb-20 bg-radial-navy">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back/Close Button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-[#FFD700] mb-8 transition-colors group"
        >
          {isNewTab ? (
            <>
              <X className="w-5 h-5" />
              <span className="font-medium">Close</span>
            </>
          ) : (
            <>
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back</span>
            </>
          )}
        </button>

        {/* Header */}
        <div className="glass-card p-8 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#FFD700]/10 blur-[80px] rounded-full pointer-events-none" />
          <div className="relative z-10">
            <h1
              className="text-3xl md:text-4xl font-bold mb-2"
              style={{
                background: 'linear-gradient(180deg, #ffffff 20%, #909090 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              Cookie Policy
            </h1>
            <p className="text-[#A0A0A0]">
              Last updated: October 18, 2025
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="glass-card p-8 space-y-8">

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">1. What Are Cookies?</h2>
            <p className="text-gray-300 mb-4">
              Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you visit a website. They help the website remember your preferences and improve your browsing experience.
            </p>
            <p className="text-gray-300">
              CoreTradeGlobal uses cookies and similar technologies to provide, protect, and improve our Platform.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">2. Types of Cookies We Use</h2>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.1 Strictly Necessary Cookies</h3>
            <p className="text-gray-300 mb-4">
              These cookies are essential for the Platform to function properly. They enable core functionality such as security, authentication, and session management. You cannot opt out of these cookies.
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
                <thead className="bg-[rgba(255,255,255,0.05)]">
                  <tr>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Cookie</th>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Purpose</th>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 text-sm">
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3 font-medium text-white">session</td>
                    <td className="px-4 py-3">Maintains your login session and authentication state</td>
                    <td className="px-4 py-3">7 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-white">cookie_consent</td>
                    <td className="px-4 py-3">Stores your cookie preferences</td>
                    <td className="px-4 py-3">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.2 Functional Cookies</h3>
            <p className="text-gray-300 mb-4">
              These cookies enable enhanced functionality and personalization, such as remembering your language preferences and region settings.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.3 Analytics Cookies</h3>
            <p className="text-gray-300 mb-4">
              We use analytics cookies to understand how visitors interact with our Platform. This helps us improve our services and user experience. When you consent to analytics cookies, we may collect:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2 mb-4">
              <li><span className="text-white font-medium">Page Views & Navigation:</span> Which pages you visit and how you navigate through the site</li>
              <li><span className="text-white font-medium">Session Duration:</span> How long you spend on each page and overall session time</li>
              <li><span className="text-white font-medium">Click Tracking:</span> Which buttons, links, and elements you interact with</li>
              <li><span className="text-white font-medium">Heatmaps:</span> Aggregated visual representations of where users click and scroll</li>
              <li><span className="text-white font-medium">User Journey:</span> The path you take through our Platform to complete actions</li>
            </ul>
            <p className="text-gray-300">
              This data is collected anonymously and used solely to improve our Platform's usability and performance. You can opt out of analytics cookies at any time through the Cookie Settings.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.4 Third-Party Cookies</h3>
            <p className="text-gray-300">
              Some cookies are placed by third-party services that appear on our pages, such as Firebase (for authentication and database services). These third parties have their own privacy policies.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">3. Managing Your Cookie Preferences</h2>
            <p className="text-gray-300 mb-4">
              You can control and manage cookies in several ways:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><span className="text-white font-medium">Browser Settings:</span> Most browsers allow you to refuse or accept cookies, delete existing cookies, and set preferences for certain websites.</li>
              <li><span className="text-white font-medium">Cookie Banner:</span> When you first visit our Platform, you can set your preferences using our cookie consent banner.</li>
              <li><span className="text-white font-medium">Opt-Out Links:</span> For third-party analytics, you can opt out through their respective websites.</li>
            </ul>
            <p className="text-gray-300 mt-4">
              Please note that disabling certain cookies may affect the functionality of the Platform.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">4. Your Rights</h2>
            <p className="text-gray-300 mb-4">
              Under GDPR, UK GDPR, and CCPA, you have the right to:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Know what cookies we use and why</li>
              <li>Opt out of non-essential cookies</li>
              <li>Request deletion of your data</li>
              <li>Withdraw your consent at any time</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">5. Updates to This Policy</h2>
            <p className="text-gray-300">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. We encourage you to review this page periodically for the latest information.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">6. Contact Us</h2>
            <p className="text-gray-300">
              If you have any questions about our use of cookies, please contact us at:{' '}
              <a href="mailto:privacy@coretradeglobal.com" className="text-[#FFD700] hover:underline">
                privacy@coretradeglobal.com
              </a>
            </p>
          </section>

          {/* Footer Note */}
          <div className="mt-8 p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl">
            <p className="text-sm text-gray-400">
              By continuing to use CoreTradeGlobal, you acknowledge that you have read and understood this Cookie Policy.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
