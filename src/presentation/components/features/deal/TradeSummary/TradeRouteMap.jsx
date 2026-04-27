/**
 * TradeRouteMap
 *
 * Dark-themed static SVG world map with origin/destination pins and a dashed route line.
 * Uses Natural Earth 110m simplified equirectangular projection paths for recognizable
 * continental shapes. Provides visual context only — exact coordinates are not required.
 *
 * Projection: Equirectangular (Plate Carree)
 *   x = (lon + 180) / 360 * 800
 *   y = (90 - lat) / 180 * 400
 * ViewBox: 800x400 (2:1 ratio)
 *
 * Origin pin: gold (#FFD700) — Western Europe (~lon 10, lat 48)
 * Destination pin: blue (#3B82F6) — East Asia (~lon 120, lat 35)
 * Route line: dashed SVG quadratic bezier between the two pins.
 */

'use client';

import { MapPin } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Equirectangular pin positions (800x400 viewBox)
// Western Europe:  lon=10, lat=48  → x≈422, y≈93
// East Asia:       lon=120, lat=35 → x≈667, y≈122
// ─────────────────────────────────────────────────────────────────────────────
const ORIGIN_X = 422;
const ORIGIN_Y = 93;
const DEST_X = 667;
const DEST_Y = 122;

// Control point arcs upward for a great-circle-like curve
const CTRL_X = 544;
const CTRL_Y = 40;

// ─────────────────────────────────────────────────────────────────────────────
// Natural Earth 110m simplified continent paths (equirectangular, 800x400)
// Simplified to ~50-80 vertices per continent — recognizable at small display
// sizes without being excessively large. Antarctica omitted.
// ─────────────────────────────────────────────────────────────────────────────

// North America (including Central America stub)
const NORTH_AMERICA = `
  M 90,60 L 110,50 L 140,44 L 160,48 L 175,55 L 185,65 L 190,80
  L 185,95 L 175,105 L 165,108 L 155,100 L 148,110 L 140,120
  L 130,128 L 118,135 L 110,142 L 105,150 L 100,158
  L 92,155 L 88,145 L 80,135 L 75,120 L 70,108
  L 65,100 L 62,90 L 65,78 L 68,68 Z
`;

// Greenland
const GREENLAND = `
  M 178,20 L 200,14 L 218,18 L 225,28 L 220,40 L 208,48
  L 195,50 L 183,44 L 176,32 Z
`;

// South America
const SOUTH_AMERICA = `
  M 175,158 L 192,148 L 210,148 L 225,155 L 235,168
  L 240,185 L 245,205 L 248,225 L 245,248 L 240,265
  L 230,280 L 218,290 L 205,295 L 192,290 L 180,278
  L 172,260 L 168,242 L 165,220 L 163,198 L 165,178 Z
`;

// Europe (separate from Asia for clarity)
const EUROPE = `
  M 358,58 L 372,52 L 385,50 L 398,52 L 408,58 L 415,65
  L 418,72 L 412,78 L 405,82 L 395,80 L 385,85 L 375,80
  L 365,78 L 358,70 Z
`;

// Asia + Middle East (large landmass)
const ASIA = `
  M 415,65 L 430,58 L 450,52 L 475,48 L 500,45 L 525,42
  L 550,40 L 575,38 L 600,42 L 620,48 L 640,55 L 660,62
  L 675,72 L 685,85 L 680,100 L 668,112 L 655,118 L 640,122
  L 625,125 L 610,130 L 595,128 L 580,125 L 565,128 L 550,132
  L 535,130 L 520,125 L 505,120 L 490,118 L 475,115 L 460,112
  L 445,108 L 432,105 L 420,100 L 412,90 L 410,80 L 415,70 Z
`;

// Indian subcontinent (extends south from Asia)
const INDIA = `
  M 490,118 L 505,120 L 515,130 L 520,148 L 515,162
  L 505,170 L 495,165 L 488,152 L 485,138 L 488,125 Z
`;

// Southeast Asia peninsula (Indochina)
const SOUTHEAST_ASIA = `
  M 580,125 L 595,128 L 608,140 L 615,158 L 610,172
  L 600,178 L 592,170 L 585,158 L 578,142 L 575,130 Z
`;

// Africa
const AFRICA = `
  M 368,95 L 385,88 L 400,85 L 415,88 L 428,95 L 438,108
  L 445,122 L 450,140 L 452,160 L 450,180 L 445,200
  L 435,218 L 420,232 L 405,240 L 390,242 L 375,238
  L 362,228 L 352,212 L 348,195 L 348,175 L 350,155
  L 352,138 L 355,120 L 360,108 Z
`;

// Australia
const AUSTRALIA = `
  M 618,202 L 640,195 L 662,192 L 682,195 L 698,205
  L 710,218 L 715,235 L 712,252 L 702,265 L 688,272
  L 672,275 L 655,272 L 640,262 L 628,248 L 620,232
  L 615,215 Z
`;

// Japan (island group)
const JAPAN = `
  M 675,72 L 682,68 L 690,70 L 692,78 L 686,84 L 678,82 Z
`;

// British Isles
const BRITISH_ISLES = `
  M 352,52 L 358,48 L 364,50 L 366,58 L 360,62 L 354,60 Z
`;

// ─────────────────────────────────────────────────────────────────────────────
// TradeRouteMap
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ originName?: string, destinationName?: string }} props
 */
export function TradeRouteMap({ originName = 'Origin', destinationName = 'Destination' }) {
  const landStyle = {
    fill: '#1A283B',
    stroke: '#2A3B52',
    strokeWidth: '0.5',
    opacity: 0.9,
  };

  return (
    <div className="bg-[#0b1626] border border-[#1e2d47] rounded-xl overflow-hidden">
      {/* Map header */}
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <MapPin size={14} className="text-[#FFD700]" />
        <span className="text-xs font-semibold text-white">Trade Route</span>
      </div>

      {/* SVG map */}
      <div className="relative px-2 pb-2">
        <svg
          viewBox="0 0 800 400"
          className="w-full"
          style={{ height: '180px' }}
          aria-label="Trade route map"
        >
          {/* Dark ocean background */}
          <rect width="800" height="400" fill="#0b1626" />

          {/* ── Continent paths (Natural Earth 110m simplified) ── */}
          <path d={NORTH_AMERICA} {...landStyle} />
          <path d={GREENLAND} {...landStyle} />
          <path d={SOUTH_AMERICA} {...landStyle} />
          <path d={EUROPE} {...landStyle} />
          <path d={ASIA} {...landStyle} />
          <path d={INDIA} {...landStyle} />
          <path d={SOUTHEAST_ASIA} {...landStyle} />
          <path d={AFRICA} {...landStyle} />
          <path d={AUSTRALIA} {...landStyle} />
          <path d={JAPAN} {...landStyle} />
          <path d={BRITISH_ISLES} {...landStyle} />

          {/* ── Dashed route line (quadratic bezier) ── */}
          <path
            d={`M ${ORIGIN_X} ${ORIGIN_Y} Q ${CTRL_X} ${CTRL_Y} ${DEST_X} ${DEST_Y}`}
            fill="none"
            stroke="#FFD700"
            strokeWidth="2"
            strokeDasharray="10 6"
            opacity="0.75"
          />

          {/* ── Origin pin (gold) ── */}
          <circle cx={ORIGIN_X} cy={ORIGIN_Y} r="10" fill="#FFD700" opacity="0.12" />
          <circle cx={ORIGIN_X} cy={ORIGIN_Y} r="5" fill="#FFD700" />
          <text
            x={ORIGIN_X}
            y={ORIGIN_Y + 22}
            textAnchor="middle"
            fontSize="14"
            fill="#FFD700"
            fontFamily="sans-serif"
            fontWeight="600"
          >
            {originName.length > 12 ? originName.slice(0, 12) + '\u2026' : originName}
          </text>

          {/* ── Destination pin (blue) ── */}
          <circle cx={DEST_X} cy={DEST_Y} r="10" fill="#3B82F6" opacity="0.12" />
          <circle cx={DEST_X} cy={DEST_Y} r="5" fill="#3B82F6" />
          <text
            x={DEST_X}
            y={DEST_Y + 22}
            textAnchor="middle"
            fontSize="14"
            fill="#3B82F6"
            fontFamily="sans-serif"
            fontWeight="600"
          >
            {destinationName.length > 12 ? destinationName.slice(0, 12) + '\u2026' : destinationName}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="px-4 pb-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700]" />
          <span className="text-[10px] text-[#8899AA]">{originName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]" />
          <span className="text-[10px] text-[#8899AA]">{destinationName}</span>
        </div>
      </div>
    </div>
  );
}

export default TradeRouteMap;
