/**
 * HeroSearchBar Component
 *
 * The search bar and search type toggle within the hero overlay.
 * Handles product vs RFQ search type switching with mobile/desktop layouts.
 */

'use client';

const SEARCH_TAGS = ['Marble', 'Steel', 'Textile', 'Machinery', 'Cotton'];

/**
 * The `isMobile` prop is kept for backward compat / placeholder text
 * choice, but the *layout* is now CSS-driven: both switch variants
 * (above-the-bar on mobile, inside-the-bar on desktop) and all 5
 * category pills are rendered unconditionally, and a media query
 * hides the wrong one for the current viewport. This eliminates the
 * hydration-time layout shift that was pushing the search bar, CTA
 * buttons and Featured Products section down ~52px once the client
 * detected `window.innerWidth < 768` (was ~0.096 of the mobile CLS).
 *
 * @param {Object} props
 * @param {boolean} props.isMobile — for placeholder text only
 * @param {string} props.searchType - 'Products' | 'RFQs'
 * @param {Function} props.setSearchType
 * @param {string} props.searchQuery
 * @param {Function} props.setSearchQuery
 * @param {Function} props.onSearch - form submit handler
 */
export function HeroSearchBar({ isMobile, searchType, setSearchType, searchQuery, setSearchQuery, onSearch }) {
  const renderSwitch = (variantClass) => (
    <div className={`search-switch-container ${variantClass}`}>
      <div
        className="search-switch-slider"
        style={{
          transform: searchType === 'Products' ? 'translateX(0)' : 'translateX(100%)',
          background: searchType === 'Products' ? '#FFD700' : '#3B82F6'
        }}
      />
      <button
        type="button"
        className={`search-switch-btn ${searchType === 'Products' ? 'active' : ''}`}
        onClick={() => setSearchType('Products')}
        style={{ color: searchType === 'Products' ? '#0F1B2B' : '#fff' }}
      >
        Products
      </button>
      <button
        type="button"
        className={`search-switch-btn ${searchType === 'RFQs' ? 'active' : ''}`}
        onClick={() => setSearchType('RFQs')}
        style={{ color: searchType === 'RFQs' ? '#fff' : '#fff' }}
      >
        RFQs
      </button>
    </div>
  );

  return (
    <div className="search-bar-container">
      {/* Mobile-only switch above the bar. CSS hides it on desktop. */}
      <div className="search-switch-wrap-mobile">
        {renderSwitch('search-switch-mobile')}
      </div>

      <form className="search-bar" onSubmit={onSearch}>
        {/* Desktop-only switch inside the bar. CSS hides it on mobile. */}
        <div className="search-switch-wrap-desktop">
          {renderSwitch('search-switch-desktop')}
        </div>
        <input
          type="text"
          className="search-input"
          id="search-input"
          placeholder={searchType === 'Products'
            ? (isMobile ? "Search products..." : "Search for products, companies, or RFQs...")
            : (isMobile ? "Search RFQs..." : "Search for active RFQs...")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" className="search-btn">
          <svg className="search-icon" width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </button>
      </form>

      {/* All 5 tags always rendered. Mobile CSS hides tags 4-5 so the
          same 3 pills show on mobile as before, but the DOM shape
          doesn't flip during hydration. */}
      <div className="search-tags">
        {SEARCH_TAGS.map((tag) => (
          <span
            key={tag}
            className="search-tag-pill"
            onClick={() => setSearchQuery(tag)}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default HeroSearchBar;
