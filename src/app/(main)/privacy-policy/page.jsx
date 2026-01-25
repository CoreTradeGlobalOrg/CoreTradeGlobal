/**
 * Privacy Policy Page
 *
 * CoreTradeGlobal Privacy Policy
 */

'use client';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-slate-500">
            Last updated: October 18, 2025
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 prose prose-slate max-w-none">

          <h2 className="text-2xl font-bold text-slate-900 mt-6 mb-4">1. Introduction and Scope</h2>
          <p className="text-slate-700 mb-4">
            CoreTradeGlobal ("we", "our", or "the Platform") values your privacy and is committed to protecting your personal data in compliance with international privacy regulations, including:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>The UK Data Protection Act 2018 and UK GDPR,</li>
            <li>The EU General Data Protection Regulation (GDPR),</li>
            <li>The California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA),</li>
            <li>Other applicable U.S. state privacy laws (Virginia CDPA, Colorado CPA, Connecticut DPA).</li>
          </ul>
          <p className="text-slate-700 mb-4">
            This Privacy Policy explains how we collect, use, share, and protect your personal data. It applies to all individuals ("users", "you") who access or use the Platform — whether as a visitor, registered buyer, seller, or business partner.
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">2. Data Responsibility</h2>
          <p className="text-slate-700 mb-4">
            For users located in the UK or EEA, CoreTradeGlobal acts as the Data Controller under UK GDPR / EU GDPR.
          </p>
          <p className="text-slate-700 mb-4">
            For users in the United States, CoreTradeGlobal acts as a "business" as defined by CCPA/CPRA.
          </p>
          <p className="text-slate-700 mb-4">
            <strong>U.S. Privacy Contact:</strong> <a href="mailto:info@coretradeglobal.com" className="text-blue-600 hover:underline">info@coretradeglobal.com</a>
          </p>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">3. Information We Collect</h2>
          <p className="text-slate-700 mb-4">
            We collect personal data necessary to operate, secure, and improve the Platform.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">(a) Information You Provide Directly</h3>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Name, company name, address, email, and phone number</li>
            <li>Account credentials (username, password)</li>
            <li>Tax or business registration information (for sellers)</li>
            <li>Communications via chat, support, or dispute resolution</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">(b) Automatically Collected Information</h3>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Device identifiers (IP address, browser type, OS version, approximate location)</li>
            <li>Usage logs, pages visited, and session time</li>
            <li>Cookies and analytics tags</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">(c) Information from Third Parties</h3>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Identity verification and KYC providers</li>
            <li>Payment processors and logistics partners</li>
            <li>Analytics, advertising, or fraud-prevention partners</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">4. Purpose and Legal Basis for Processing</h2>
          <p className="text-slate-700 mb-4">
            We process your personal data for defined and lawful purposes based on the following legal bases:
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Purpose</th>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Legal Basis (GDPR)</th>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">CCPA/CPRA Category</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Account registration</td>
                  <td className="border border-slate-300 px-4 py-2">Art. 6(1)(b) – Contract</td>
                  <td className="border border-slate-300 px-4 py-2">Providing services</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Fraud prevention</td>
                  <td className="border border-slate-300 px-4 py-2">Art. 6(1)(f) – Legitimate interest</td>
                  <td className="border border-slate-300 px-4 py-2">Detecting security incidents</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Customer support</td>
                  <td className="border border-slate-300 px-4 py-2">Art. 6(1)(b)/(f)</td>
                  <td className="border border-slate-300 px-4 py-2">Customer service</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Marketing communications</td>
                  <td className="border border-slate-300 px-4 py-2">Art. 6(1)(a) – Consent</td>
                  <td className="border border-slate-300 px-4 py-2">Advertising and marketing</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">5. Cookies and Tracking Technologies</h2>
          <p className="text-slate-700 mb-4">
            We use cookies, pixels, and similar technologies to enhance functionality and analyze performance. You can manage your preferences via our Cookie Consent Banner or browser settings.
          </p>
          <p className="text-slate-700 mb-4">
            Cookies are grouped as follows:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Strictly Necessary</li>
            <li>Functional</li>
            <li>Performance / Analytics</li>
            <li>Advertising / Targeting</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">6. Data Sharing and Disclosure</h2>
          <p className="text-slate-700 mb-4">
            We do not sell personal information for monetary gain. However, we may share data as necessary for legitimate business operations with:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Service providers (hosting, analytics, payment, communication)</li>
            <li>Affiliates and subsidiaries</li>
            <li>Legal or regulatory authorities where required</li>
            <li>Other users (e.g., buyer-seller communication)</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">8. Data Retention</h2>
          <p className="text-slate-700 mb-4">
            We retain data only as long as necessary for the purposes outlined in this Policy or to meet legal obligations.
          </p>
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full border border-slate-300">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Data Category</th>
                  <th className="border border-slate-300 px-4 py-2 text-left font-semibold">Retention Period</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Account information</td>
                  <td className="border border-slate-300 px-4 py-2">Until account deletion + 12 months</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Transaction records</td>
                  <td className="border border-slate-300 px-4 py-2">5 years (tax/audit purposes)</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Communication logs</td>
                  <td className="border border-slate-300 px-4 py-2">2 years</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-4 py-2">Marketing preferences</td>
                  <td className="border border-slate-300 px-4 py-2">Until consent withdrawal</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">10. Your Rights Under UK and EU GDPR</h2>
          <p className="text-slate-700 mb-4">
            If you are located in the UK or EU/EEA, you have the following rights:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Access your data (Art. 15)</li>
            <li>Rectify or erase data (Arts. 16–17)</li>
            <li>Restrict or object to processing (Arts. 18 & 21)</li>
            <li>Data portability (Art. 20)</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">11. Your Rights Under U.S. Privacy Laws (CCPA/CPRA)</h2>
          <p className="text-slate-700 mb-4">
            U.S. residents, particularly those in California, have the following rights:
          </p>
          <ul className="list-disc pl-6 mb-4 text-slate-700 space-y-2">
            <li>Right to Know – what categories of data we collect, use, or disclose</li>
            <li>Right to Delete – request deletion subject to legal exceptions</li>
            <li>Right to Correct – inaccurate information</li>
            <li>Right to Opt-Out – of sale or sharing</li>
            <li>Right to Limit Use – of sensitive personal data</li>
            <li>Right to Non-Discrimination</li>
          </ul>

          <h2 className="text-2xl font-bold text-slate-900 mt-8 mb-4">15. Contact Information</h2>
          <p className="text-slate-700 mb-4">
            <strong>U.S. Privacy Contact:</strong>{' '}
            <a href="mailto:privacy@coretradeglobal.com" className="text-blue-600 hover:underline">
              privacy@coretradeglobal.com
            </a>
          </p>

          <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-xs text-slate-600">
              By using CoreTradeGlobal, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.
            </p>
          </div>

        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <button
            onClick={() => window.close()}
            className="inline-flex items-center text-blue-600 hover:underline font-medium cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
