/**
 * Terms of Service Page
 *
 * CoreTradeGlobal Platform Service Agreement
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, X } from 'lucide-react';

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="text-[#A0A0A0]">
              CoreTradeGlobal Platform Service Agreement
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="glass-card p-8 space-y-8">

          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">1. Introduction and Scope</h2>
            <p className="text-gray-300 mb-4">
              This Platform Service Agreement ("Agreement") is entered into between you ("User", "you") and CoreTradeGlobal.com ("CoreTradeGlobal", "we", "our", or "the Platform").
            </p>
            <p className="text-gray-300 mb-4">
              By accessing or using any CoreTradeGlobal service—including product listings, advertising, communications, or payment tools—you acknowledge that you have read, understood, and agreed to be legally bound by this Agreement and all related policies (including the Privacy Policy and Product Listing Policy).
            </p>
            <p className="text-gray-300">
              This Agreement governs all user activity on the Platform across the United Kingdom, the European Union (EU/EEA), and the United States (US).
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">2. Definitions</h2>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li><span className="text-white font-medium">Platform:</span> The CoreTradeGlobal website, mobile application, and related services enabling trade and communication between users.</li>
              <li><span className="text-white font-medium">User:</span> Any individual or entity that accesses or uses the Platform, including buyers, sellers, or advertisers.</li>
              <li><span className="text-white font-medium">Services:</span> Any digital tools, APIs, communications systems, or trading functions provided by CoreTradeGlobal.</li>
              <li><span className="text-white font-medium">Applicable Laws:</span> All relevant international, regional, and national laws, including the UK Data Protection Act 2018, UK GDPR, EU GDPR, Digital Services Act (DSA), U.S. FTC Act, and California CCPA/CPRA.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">3. Acceptance and Modification of Terms</h2>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.1 Acceptance</h3>
            <p className="text-gray-300 mb-4">
              By using the Platform, you confirm that you have read, understood, and accepted this Agreement and related policies.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.2 Modifications</h3>
            <p className="text-gray-300 mb-4">
              CoreTradeGlobal may modify this Agreement at any time. Updates become effective upon posting on the Platform. Continued use of the Services after posting constitutes acceptance of the updated version.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">3.3 Jurisdictional Applicability</h3>
            <p className="text-gray-300">
              Certain clauses may vary depending on user location to comply with local law (e.g., UK GDPR, EU GDPR, or U.S. CCPA/CPRA).
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">4. Platform Role and Limitations</h2>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">4.1 Neutral Intermediary</h3>
            <p className="text-gray-300 mb-4">
              CoreTradeGlobal is a neutral technology intermediary, not a party to any sales, service, or payment contract between users.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">4.2 No Guarantee</h3>
            <p className="text-gray-300 mb-4">
              We make no guarantees regarding the legality, authenticity, or quality of any product or service listed by users.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">4.3 Independent Users</h3>
            <p className="text-gray-300">
              All transactions occur directly between users at their own risk. CoreTradeGlobal does not act as agent, broker, or guarantor.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">5. User Responsibilities and Warranties</h2>
            <p className="text-gray-300 mb-4">You agree, represent, and warrant that:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>You will use the Platform in good faith and comply with all applicable laws, including consumer protection, trade, and taxation rules.</li>
              <li>You will not post, promote, or sell illegal, unsafe, or infringing products.</li>
              <li>All information provided is accurate, lawful, and complete.</li>
              <li>You will obtain and maintain any required licenses, certifications, or permits.</li>
              <li>You are solely responsible for payment of any applicable taxes, duties, or levies arising from your activities on the Platform.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">6. Prohibited Conduct</h2>
            <p className="text-gray-300 mb-4">Users may not:</p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Engage in fraud, deception, or data manipulation.</li>
              <li>Post counterfeit or prohibited listings.</li>
              <li>Use scraping tools or automated bots without authorization.</li>
              <li>Infringe third-party intellectual property rights.</li>
              <li>Use the Platform for spam, phishing, money laundering, or illegal solicitation.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">7. Disclaimer and Limitation of Liability</h2>
            <p className="text-gray-300 mb-4">
              The Platform is provided "as is" and "as available", without warranties of any kind. CoreTradeGlobal shall not be liable for indirect, incidental, or consequential damages; loss of profits, revenue, or goodwill; or actions or omissions of other users.
            </p>
            <p className="text-gray-300">
              Nothing in this Agreement excludes liability for fraud, gross negligence, or intentional misconduct.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">8. Governing Law and Dispute Resolution</h2>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">8.1 Governing Law</h3>
            <p className="text-gray-300 mb-4">
              This Agreement shall be governed by and construed in accordance with the laws of England and Wales.
            </p>

            <h3 className="text-lg font-semibold text-white mt-6 mb-3">8.2 Binding Arbitration</h3>
            <p className="text-gray-300 mb-4">
              Any dispute shall be finally resolved by binding arbitration under the Rules of the London Court of International Arbitration (LCIA).
            </p>
            <ul className="list-disc pl-6 text-gray-300 space-y-2">
              <li>Seat of arbitration: London, United Kingdom</li>
              <li>Governing law of arbitration: Laws of England and Wales</li>
              <li>Language: English</li>
              <li>Number of arbitrators: One (1)</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-xl font-bold text-[#FFD700] mb-4">9. Contact Information</h2>
            <p className="text-gray-300">
              <span className="text-white font-medium">Email:</span>{' '}
              <a href="mailto:info@coretradeglobal.com" className="text-[#FFD700] hover:underline">
                info@coretradeglobal.com
              </a>
            </p>
          </section>

          {/* Footer Note */}
          <div className="mt-8 p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl">
            <p className="text-sm text-gray-400">
              By using CoreTradeGlobal, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
