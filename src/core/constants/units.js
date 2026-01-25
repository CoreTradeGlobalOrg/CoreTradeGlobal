/**
 * Unit Constants
 *
 * UNECE-compliant unit definitions for international trade
 * Organized by category for easy selection and filtering
 *
 * Format: { code: 'UNECE_CODE', name: 'Unit Name', category: 'Category', label: 'Display Label' }
 */

// Unit Categories
export const UNIT_CATEGORIES = [
  { value: 'Quantity', label: 'Quantity' },
  { value: 'Weight', label: 'Weight' },
  { value: 'Volume', label: 'Volume' },
  { value: 'Length', label: 'Length' },
  { value: 'Area', label: 'Area' },
  { value: 'Logistics', label: 'Logistics' },
  { value: 'Energy', label: 'Energy' },
  { value: 'Technical', label: 'Technical' },
];

// All Units with UNECE Codes
export const UNITS = [
  // Quantity Units
  { code: 'PCE', name: 'Piece', category: 'Quantity', label: 'Piece (PCE)' },
  { code: 'SET', name: 'Set', category: 'Quantity', label: 'Set (SET)' },
  { code: 'PR', name: 'Pair', category: 'Quantity', label: 'Pair (PR)' },
  { code: 'DZN', name: 'Dozen', category: 'Quantity', label: 'Dozen (DZN)' },
  { code: 'GRO', name: 'Gross', category: 'Quantity', label: 'Gross (GRO)' },
  { code: 'KIT', name: 'Kit', category: 'Quantity', label: 'Kit (KIT)' },

  // Weight Units
  { code: 'KGM', name: 'Kilogram', category: 'Weight', label: 'Kilogram (KGM)' },
  { code: 'GRM', name: 'Gram', category: 'Weight', label: 'Gram (GRM)' },
  { code: 'TNE', name: 'Metric Ton', category: 'Weight', label: 'Metric Ton (TNE)' },
  { code: 'LBR', name: 'Pound', category: 'Weight', label: 'Pound (LBR)' },
  { code: 'MGM', name: 'Milligram', category: 'Weight', label: 'Milligram (MGM)' },
  { code: 'ONZ', name: 'Ounce', category: 'Weight', label: 'Ounce (ONZ)' },

  // Volume Units
  { code: 'LTR', name: 'Liter', category: 'Volume', label: 'Liter (LTR)' },
  { code: 'MLT', name: 'Milliliter', category: 'Volume', label: 'Milliliter (MLT)' },
  { code: 'MTQ', name: 'Cubic Meter', category: 'Volume', label: 'Cubic Meter (MTQ)' },
  { code: 'BLL', name: 'Barrel (Petroleum)', category: 'Volume', label: 'Barrel (BLL)' },
  { code: 'GLL', name: 'Gallon (US)', category: 'Volume', label: 'Gallon (GLL)' },

  // Length Units
  { code: 'MTR', name: 'Meter', category: 'Length', label: 'Meter (MTR)' },
  { code: 'CMT', name: 'Centimeter', category: 'Length', label: 'Centimeter (CMT)' },
  { code: 'MMT', name: 'Millimeter', category: 'Length', label: 'Millimeter (MMT)' },
  { code: 'INH', name: 'Inch', category: 'Length', label: 'Inch (INH)' },
  { code: 'FOT', name: 'Foot', category: 'Length', label: 'Foot (FOT)' },

  // Area Units
  { code: 'MTK', name: 'Square Meter', category: 'Area', label: 'Square Meter (MTK)' },
  { code: 'CMK', name: 'Square Centimeter', category: 'Area', label: 'Square Centimeter (CMK)' },

  // Logistics Units
  { code: 'CT', name: 'Carton / Box', category: 'Logistics', label: 'Carton / Box (CT)' },
  { code: 'PX', name: 'Pallet', category: 'Logistics', label: 'Pallet (PX)' },
  { code: 'PK', name: 'Package', category: 'Logistics', label: 'Package (PK)' },
  { code: 'CH', name: 'Container', category: 'Logistics', label: 'Container (CH)' },
  { code: 'ROLL', name: 'Roll', category: 'Logistics', label: 'Roll (ROLL)' },
  { code: 'SA', name: 'Bag / Sack', category: 'Logistics', label: 'Bag / Sack (SA)' },
  { code: 'CR', name: 'Crate', category: 'Logistics', label: 'Crate (CR)' },
  { code: 'BE', name: 'Bundle', category: 'Logistics', label: 'Bundle (BE)' },

  // Energy Units
  { code: 'KWH', name: 'Kilowatt-hour', category: 'Energy', label: 'Kilowatt-hour (KWH)' },
  { code: 'WTT', name: 'Watt', category: 'Energy', label: 'Watt (WTT)' },

  // Technical Units
  { code: 'AMP', name: 'Ampere', category: 'Technical', label: 'Ampere (AMP)' },
  { code: 'VLT', name: 'Volt', category: 'Technical', label: 'Volt (VLT)' },
];

/**
 * Get units by category
 * @param {string} category - Category name
 * @returns {Array} Filtered units
 */
export const getUnitsByCategory = (category) => {
  if (!category) return UNITS;
  return UNITS.filter((unit) => unit.category === category);
};

/**
 * Get unit by code
 * @param {string} code - UNECE unit code
 * @returns {Object|null} Unit object or null
 */
export const getUnitByCode = (code) => {
  return UNITS.find((unit) => unit.code === code) || null;
};

/**
 * Get formatted unit label
 * @param {string} code - UNECE unit code
 * @returns {string} Formatted label
 */
export const getUnitLabel = (code) => {
  const unit = getUnitByCode(code);
  return unit ? unit.label : code;
};

/**
 * Format quantity with unit
 * @param {number} quantity - Quantity value
 * @param {string} unitCode - UNECE unit code
 * @returns {string} Formatted string (e.g., "100 PCE")
 */
export const formatQuantityWithUnit = (quantity, unitCode) => {
  const unit = getUnitByCode(unitCode);
  return unit ? `${quantity} ${unit.code}` : `${quantity}`;
};

export default UNITS;
