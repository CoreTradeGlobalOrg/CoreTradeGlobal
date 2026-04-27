/**
 * HeroSearchBar Component
 *
 * The search bar and search type toggle within the hero overlay.
 * Handles product vs RFQ search type switching with mobile/desktop layouts.
 */

'use client';

const SEARCH_TAGS = ['Marble', 'Steel', 'Textile', 'Machinery', 'Cotton'];

/**
 * @param {Object} props
 * @param {boolean} props.isMobile
 * @param {string} props.searchType - 'Products' | 'RFQs'
 * @param {Function} props.setSearchType
 * @param {string} props.searchQuery
 * @param {Function} props.setSearchQuery
 * @param {Function} props.onSearch - form submit handler
 */
export function HeroSearchBar({ isMobile, searchType, setSearchType, searchQuery, setSearchQuery, onSearch }) {
  return (
    <div className="search-bar-container">
      {/* Switch above bar on mobile */}
      {isMobile && (
        <div className="flex justify-center" style={{ marginBottom: '12px' }}>
          <div className="search-switch-container">
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
        </div>
      )}

      <form className="search-bar" onSubmit={onSearch}>
        {/* Switch inside bar on desktop only */}
        {!isMobile && (
          <div className="search-switch-container">
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
        )}
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

      <div className="search-tags">
        {(isMobile ? SEARCH_TAGS.slice(0, 3) : SEARCH_TAGS).map((tag) => (
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
