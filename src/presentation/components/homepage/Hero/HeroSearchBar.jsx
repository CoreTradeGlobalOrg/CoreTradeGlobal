/**
 * HeroSearchBar Component
 *
 * The search bar and search type toggle within the hero overlay.
 * Handles product vs RFQ search type switching with mobile/desktop layouts.
 */

'use client';

/**
 * The `isMobile` prop is kept for backward compat / placeholder text
 * choice, but the *layout* is CSS-driven. The switch renders inside
 * the search bar at every viewport, and the "quick tags" row (Marble
 * / Steel / …) that used to live below the bar was removed at the
 * product owner's request — the switch already communicates the
 * search mode and tags were pushing the CTAs too far down.
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
      <form className="search-bar" onSubmit={onSearch}>
        {/* Switch sits inside the bar on every viewport now — mobile used
            to render it above the bar but the design moved it inline so
            the Products/RFQ chip and the hint text share one pill. */}
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
        <button type="submit" className="search-btn" aria-label="Search">
          <svg className="search-icon" width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </button>
      </form>
    </div>
  );
}

export default HeroSearchBar;
