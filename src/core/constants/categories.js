/**
 * Company Categories
 *
 * Business categories for B2B platform
 */

export const COMPANY_CATEGORIES = [
  // Manufacturing & Production
  { value: 'automotive', label: 'Automotive & Auto Parts' },
  { value: 'electronics', label: 'Electronics & Electrical' },
  { value: 'machinery', label: 'Machinery & Equipment' },
  { value: 'textile', label: 'Textile & Apparel' },
  { value: 'food-beverage', label: 'Food & Beverage' },
  { value: 'chemicals', label: 'Chemicals & Plastics' },
  { value: 'metals', label: 'Metals & Minerals' },
  { value: 'wood-furniture', label: 'Wood & Furniture' },
  { value: 'paper-printing', label: 'Paper & Printing' },
  { value: 'pharmaceutical', label: 'Pharmaceutical & Medical' },

  // Construction & Materials
  { value: 'construction', label: 'Construction & Real Estate' },
  { value: 'building-materials', label: 'Building Materials' },
  { value: 'tools-hardware', label: 'Tools & Hardware' },

  // Agriculture & Food
  { value: 'agriculture', label: 'Agriculture & Farming' },
  { value: 'food-processing', label: 'Food Processing' },
  { value: 'packaging', label: 'Packaging & Containers' },

  // Energy & Environment
  { value: 'energy', label: 'Energy & Power' },
  { value: 'renewable-energy', label: 'Renewable Energy' },
  { value: 'environment', label: 'Environment & Recycling' },

  // Technology & Services
  { value: 'it-software', label: 'IT & Software' },
  { value: 'telecommunications', label: 'Telecommunications' },
  { value: 'logistics', label: 'Logistics & Transportation' },
  { value: 'consulting', label: 'Consulting & Professional Services' },
  { value: 'insurance', label: 'Insurance' },

  // Consumer Goods
  { value: 'consumer-electronics', label: 'Consumer Electronics' },
  { value: 'home-garden', label: 'Home & Garden' },
  { value: 'sports-leisure', label: 'Sports & Leisure' },
  { value: 'toys', label: 'Toys & Games' },
  { value: 'beauty-cosmetics', label: 'Beauty & Cosmetics' },

  // Healthcare
  { value: 'medical-devices', label: 'Medical Devices' },
  { value: 'healthcare', label: 'Healthcare Services' },

  // Other
  { value: 'wholesale-retail', label: 'Wholesale & Retail' },
  { value: 'import-export', label: 'Import & Export' },
  { value: 'other', label: 'Other' },
].sort((a, b) => a.label.localeCompare(b.label));

export default COMPANY_CATEGORIES;
