/**
 * CompaniesSection Component
 *
 * Homepage section displaying trusted companies
 * Matches design exactly from index.html
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { container } from '@/core/di/container';
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';
import { COUNTRIES } from '@/core/constants/countries';

// Default companies for initial display (country = ISO code)
const DEFAULT_COMPANIES = [
  { id: '1', companyName: 'EuroLogistics GmbH', country: 'DE' },
  { id: '2', companyName: 'Ankara Marble Export', country: 'TR' },
  { id: '3', companyName: 'Shanghai Silk Co.', country: 'CN' },
  { id: '4', companyName: 'Tuscany Olive Oils', country: 'IT' },
  { id: '5', companyName: 'Seoul Solar Tech', country: 'KR' },
  { id: '6', companyName: 'Valencia Ceramics', country: 'ES' },
  { id: '7', companyName: 'Kyiv Steel Works', country: 'UA' },
  { id: '8', companyName: 'Mumbai Textiles', country: 'IN' },
];

// Get abbreviation from company name
const getAbbreviation = (name) => {
  if (!name) return '??';
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

// Helper to get country name from ISO code
const getCountryName = (countryCode) => {
  if (!countryCode) return 'Global';

  const found = COUNTRIES.find(c => c.value === countryCode);
  if (found) {
    // Remove emoji from label
    return found.label.replace(/^[\u{1F1E0}-\u{1F1FF}]{2}\s*/u, '').trim();
  }

  return countryCode; // Return code as fallback
};

export function CompaniesSection() {
  const [companies, setCompanies] = useState(DEFAULT_COMPANIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const firestoreDS = container.getFirestoreDataSource();
        const allUsers = await firestoreDS.query('users', { limit: 30 });

        if (allUsers && allUsers.length > 0) {
          const withCompany = allUsers.filter(u => u.companyName);
          const sorted = withCompany.sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return dateB - dateA;
          });

          if (sorted.length > 0) {
            // country field is already ISO code (e.g., "TR")
            setCompanies(sorted.slice(0, 8));
          }
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <section className="companies-section">
      <div className="companies-container">
        {/* Header */}
        <div className="companies-header">
          <div>
            <h2>Trusted Companies</h2>
            <p>Connect with verified suppliers worldwide.</p>
          </div>
          <Link href="/companies" className="btn-section-action">
            View All Companies →
          </Link>
        </div>

        {/* Companies Grid */}
        <div className="companies-grid">
          {loading ? (
            <>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="company-grid-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="comp-logo animate-pulse" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  <div className="comp-info">
                    <div className="h-4 bg-[rgba(255,255,255,0.1)] rounded animate-pulse mb-2" />
                    <div className="h-3 bg-[rgba(255,255,255,0.1)] rounded animate-pulse w-20" />
                  </div>
                </div>
              ))}
            </>
          ) : (
            companies.map((company) => (
              <Link
                key={company.id}
                href={`/profile/${company.id}`}
                className="company-grid-card"
              >
                <div className="comp-logo">{getAbbreviation(company.companyName)}</div>
                <div className="comp-info">
                  <div className="comp-name">{company.companyName}</div>
                  <div className="comp-meta flex items-center gap-1.5">
                    <CountryFlag countryCode={company.country} size={18} />
                    <span>{getCountryName(company.country)}</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default CompaniesSection;
