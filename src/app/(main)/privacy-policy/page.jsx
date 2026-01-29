/**
 * Privacy Policy Page
 *
 * CoreTradeGlobal Privacy Policy
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const [isNewTab, setIsNewTab] = useState(false);

  useEffect(() => {
    // Check if opened in new tab (no history to go back to)
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
              Privacy Policy
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
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">1. Introduction and Scope</h2>
            <p className="text-gray-300 mb-4">
              CoreTradeGlobal ("we", "our", or "the Platform") values your privacy and is committed to protecting your personal data in compliance with international privacy regulations, including:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>The UK Data Protection Act 2018 and UK GDPR</li>
              <li>The EU General Data Protection Regulation (GDPR)</li>
              <li>The California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA)</li>
              <li>Other applicable U.S. state privacy laws (Virginia CDPA, Colorado CPA, Connecticut DPA)</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">2. Data Responsibility</h2>
            <p className="text-gray-300 mb-4">
              For users located in the UK or EEA, CoreTradeGlobal acts as the Data Controller under UK GDPR / EU GDPR.
            </p>
            <p className="text-gray-300 mb-4">
              For users in the United States, CoreTradeGlobal acts as a "business" as defined by CCPA/CPRA.
            </p>
            <p className="text-gray-300">
              <span className="text-white font-medium">U.S. Privacy Contact:</span>{' '}
              <a href="mailto:info@coretradeglobal.com" className="text-[#FFD700] hover:underline">
                info@coretradeglobal.com
              </a>
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">3. Information We Collect</h2>
            <p className="text-gray-300 mb-4">
              We collect personal data necessary to operate, secure, and improve the Platform.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">(a) Information You Provide Directly</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Name, company name, address, email, and phone number</li>
              <li>Account credentials (username, password)</li>
              <li>Tax or business registration information (for sellers)</li>
              <li>Communications via chat, support, or dispute resolution</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">(b) Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Device identifiers (IP address, browser type, OS version, approximate location)</li>
              <li>Usage logs, pages visited, and session time</li>
              <li>Cookies and analytics tags</li>
            </ul>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">(c) Information from Third Parties</h3>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Identity verification and KYC providers</li>
              <li>Payment processors and logistics partners</li>
              <li>Analytics, advertising, or fraud-prevention partners</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">4. Purpose and Legal Basis for Processing</h2>
            <p className="text-gray-300 mb-4">
              We process your personal data for defined and lawful purposes based on the following legal bases:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
                <thead className="bg-[rgba(255,255,255,0.05)]">
                  <tr>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Purpose</th>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Legal Basis (GDPR)</th>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">CCPA/CPRA Category</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 text-sm">
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3">Account registration</td>
                    <td className="px-4 py-3">Art. 6(1)(b) – Contract</td>
                    <td className="px-4 py-3">Providing services</td>
                  </tr>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3">Fraud prevention</td>
                    <td className="px-4 py-3">Art. 6(1)(f) – Legitimate interest</td>
                    <td className="px-4 py-3">Detecting security incidents</td>
                  </tr>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3">Customer support</td>
                    <td className="px-4 py-3">Art. 6(1)(b)/(f)</td>
                    <td className="px-4 py-3">Customer service</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Marketing communications</td>
                    <td className="px-4 py-3">Art. 6(1)(a) – Consent</td>
                    <td className="px-4 py-3">Advertising and marketing</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">5. Cookies and Tracking Technologies</h2>
            <p className="text-gray-300 mb-4">
              We use cookies, pixels, and similar technologies to enhance functionality and analyze performance. You can manage your preferences via our Cookie Consent Banner or browser settings.
            </p>
            <p className="text-gray-300 mb-4">Cookies are grouped as follows:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Strictly Necessary</li>
              <li>Functional</li>
              <li>Performance / Analytics</li>
              <li>Advertising / Targeting</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">6. Data Sharing and Disclosure</h2>
            <p className="text-gray-300 mb-4">
              We do not sell personal information for monetary gain. However, we may share data as necessary for legitimate business operations with:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Service providers (hosting, analytics, payment, communication)</li>
              <li>Affiliates and subsidiaries</li>
              <li>Legal or regulatory authorities where required</li>
              <li>Other users (e.g., buyer-seller communication)</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">7. Data Retention</h2>
            <p className="text-gray-300 mb-4">
              We retain data only as long as necessary for the purposes outlined in this Policy or to meet legal obligations.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
                <thead className="bg-[rgba(255,255,255,0.05)]">
                  <tr>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Data Category</th>
                    <th className="border-b border-[rgba(255,255,255,0.1)] px-4 py-3 text-left text-white font-semibold">Retention Period</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 text-sm">
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3">Account information</td>
                    <td className="px-4 py-3">Until account deletion + 12 months</td>
                  </tr>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3">Transaction records</td>
                    <td className="px-4 py-3">5 years (tax/audit purposes)</td>
                  </tr>
                  <tr className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-4 py-3">Communication logs</td>
                    <td className="px-4 py-3">2 years</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Marketing preferences</td>
                    <td className="px-4 py-3">Until consent withdrawal</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">8. Your Rights Under UK and EU GDPR</h2>
            <p className="text-gray-300 mb-4">
              If you are located in the UK or EU/EEA, you have the following rights:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Access your data (Art. 15)</li>
              <li>Rectify or erase data (Arts. 16–17)</li>
              <li>Restrict or object to processing (Arts. 18 & 21)</li>
              <li>Data portability (Art. 20)</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">9. Your Rights Under U.S. Privacy Laws (CCPA/CPRA)</h2>
            <p className="text-gray-300 mb-4">
              U.S. residents, particularly those in California, have the following rights:
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Right to Know – what categories of data we collect, use, or disclose</li>
              <li>Right to Delete – request deletion subject to legal exceptions</li>
              <li>Right to Correct – inaccurate information</li>
              <li>Right to Opt-Out – of sale or sharing</li>
              <li>Right to Limit Use – of sensitive personal data</li>
              <li>Right to Non-Discrimination</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">10. Contact Information</h2>
            <p className="text-gray-300">
              <span className="text-white font-medium">U.S. Privacy Contact:</span>{' '}
              <a href="mailto:privacy@coretradeglobal.com" className="text-[#FFD700] hover:underline">
                privacy@coretradeglobal.com
              </a>
            </p>
          </section>

          {/* Footer Note */}
          <div className="mt-8 p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl">
            <p className="text-sm text-gray-400">
              By using CoreTradeGlobal, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
