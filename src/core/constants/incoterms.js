/**
 * Incoterms 2020
 *
 * All 11 Incoterms 2020 with metadata for the offer form UI.
 * Data sourced from ICC Incoterms 2020 publication.
 *
 * Each entry includes:
 *   code                  - 3-letter Incoterm code (stored in Firestore)
 *   label                 - Display label with code and full name
 *   namedPlaceLabel       - Label for the "Named Place" input field (changes per Incoterm)
 *   namedPlacePlaceholder - Placeholder text for the Named Place input
 *   insuranceDefault      - Default insurance responsibility ('seller_provides' | 'buyer_provides')
 *   description           - Brief explanation for tooltip
 */
export const INCOTERMS_2020 = [
  {
    code: 'EXW',
    label: 'EXW — Ex Works',
    namedPlaceLabel: 'Place of Delivery',
    namedPlacePlaceholder: 'e.g., Factory, Warehouse',
    insuranceDefault: 'buyer_provides',
    description: 'Seller makes goods available at their premises. Buyer bears all costs and risk.',
  },
  {
    code: 'FCA',
    label: 'FCA — Free Carrier',
    namedPlaceLabel: 'Named Place',
    namedPlacePlaceholder: 'e.g., Airport, Terminal',
    insuranceDefault: 'buyer_provides',
    description: 'Seller delivers goods to carrier at named place. Risk transfers at delivery to carrier.',
  },
  {
    code: 'CPT',
    label: 'CPT — Carriage Paid To',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: 'e.g., Port of Destination',
    insuranceDefault: 'buyer_provides',
    description: 'Seller pays freight to named destination. Risk transfers when goods handed to carrier.',
  },
  {
    code: 'CIP',
    label: 'CIP — Carriage and Insurance Paid To',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: 'e.g., Port of Destination',
    insuranceDefault: 'seller_provides',
    description: 'Seller pays freight and insurance to named destination.',
  },
  {
    code: 'DAP',
    label: 'DAP — Delivered at Place',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: "e.g., Buyer's address",
    insuranceDefault: 'seller_provides',
    description: 'Seller delivers to named destination. Buyer handles import customs and duties.',
  },
  {
    code: 'DPU',
    label: 'DPU — Delivered at Place Unloaded',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: 'e.g., Port terminal, Warehouse',
    insuranceDefault: 'seller_provides',
    description: 'Seller delivers and unloads goods at named destination.',
  },
  {
    code: 'DDP',
    label: 'DDP — Delivered Duty Paid',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: "e.g., Buyer's premises",
    insuranceDefault: 'seller_provides',
    description: 'Maximum seller obligation. Seller pays all costs including duties.',
  },
  {
    code: 'FAS',
    label: 'FAS — Free Alongside Ship',
    namedPlaceLabel: 'Port of Shipment',
    namedPlacePlaceholder: 'e.g., Port of Istanbul',
    insuranceDefault: 'buyer_provides',
    description: 'Sea/inland waterway only. Seller delivers alongside vessel at named port.',
  },
  {
    code: 'FOB',
    label: 'FOB — Free on Board',
    namedPlaceLabel: 'Port of Loading',
    namedPlacePlaceholder: 'e.g., Port of Izmir',
    insuranceDefault: 'buyer_provides',
    description: 'Sea/inland waterway only. Risk transfers when goods loaded on vessel.',
  },
  {
    code: 'CFR',
    label: 'CFR — Cost and Freight',
    namedPlaceLabel: 'Port of Destination',
    namedPlacePlaceholder: 'e.g., Port of Rotterdam',
    insuranceDefault: 'buyer_provides',
    description: 'Sea only. Seller pays freight to destination port. Risk transfers at loading.',
  },
  {
    code: 'CIF',
    label: 'CIF — Cost, Insurance and Freight',
    namedPlaceLabel: 'Port of Destination',
    namedPlacePlaceholder: 'e.g., Port of Hamburg',
    insuranceDefault: 'seller_provides',
    description: 'Sea only. Seller pays freight and insurance to destination port.',
  },
];

/**
 * Get Incoterm metadata by code
 * @param {string} code - 3-letter Incoterm code (e.g., 'FOB')
 * @returns {Object|undefined} Incoterm entry or undefined if not found
 */
export function getIncotermByCode(code) {
  return INCOTERMS_2020.find((term) => term.code === code);
}

export default INCOTERMS_2020;
