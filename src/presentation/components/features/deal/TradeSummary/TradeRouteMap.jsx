/**
 * TradeRouteMap
 *
 * Dark-themed static SVG world map with origin/destination pins and a dashed route line.
 * Provides visual context only — exact coordinates are not required per user decision.
 *
 * Origin pin: gold (#FFD700) on the left side.
 * Destination pin: blue (#3B82F6) on the right side.
 * Route line: dashed SVG path between the two pins.
 */

'use client';

import { MapPin } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// World map SVG outline (simplified continental outlines for visual context)
// ─────────────────────────────────────────────────────────────────────────────

// Static pin positions (normalized to 400x180 viewport)
const ORIGIN_X = 80;
const ORIGIN_Y = 80;
const DEST_X = 320;
const DEST_Y = 90;

// Control point for the curve
const CTRL_X = 200;
const CTRL_Y = 30;

// ─────────────────────────────────────────────────────────────────────────────
// TradeRouteMap
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ originName?: string, destinationName?: string }} props
 */
export function TradeRouteMap({ originName = 'Origin', destinationName = 'Destination' }) {
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
          viewBox="0 0 400 180"
          className="w-full"
          style={{ height: '180px' }}
          aria-label="Trade route map"
        >
          {/* Dark ocean background */}
          <rect width="400" height="180" fill="#0b1626" />

          {/* Simplified continental landmass shapes for visual context */}
          {/* North America */}
          <path
            d="M 30 40 L 80 30 L 110 50 L 100 80 L 70 100 L 40 90 Z"
            fill="#1A283B"
            stroke="#2A3B52"
            strokeWidth="0.5"
            opacity="0.8"
          />
          {/* South America */}
          <path
            d="M 70 110 L 95 105 L 110 130 L 100 165 L 75 160 L 60 140 Z"
            fill="#1A283B"
            stroke="#2A3B52"
            strokeWidth="0.5"
            opacity="0.8"
          />
          {/* Europe */}
          <path
            d="M 165 30 L 210 25 L 220 50 L 195 60 L 175 55 Z"
            fill="#1A283B"
            stroke="#2A3B52"
            strokeWidth="0.5"
            opacity="0.8"
          />
          {/* Africa */}
          <path
            d="M 175 65 L 215 60 L 225 90 L 220 140 L 195 155 L 170 140 L 165 100 Z"
            fill="#1A283B"
            stroke="#2A3B52"
            strokeWidth="0.5"
            opacity="0.8"
          />
          {/* Asia */}
          <path
            d="M 225 25 L 340 20 L 370 45 L 365 80 L 330 90 L 290 85 L 240 70 L 220 50 Z"
            fill="#1A283B"
            stroke="#2A3B52"
            strokeWidth="0.5"
            opacity="0.8"
          />
          {/* Australia */}
          <path
            d="M 310 120 L 365 115 L 375 145 L 355 160 L 315 155 Z"
            fill="#1A283B"
            stroke="#2A3B52"
            strokeWidth="0.5"
            opacity="0.8"
          />

          {/* Dashed route line (quadratic bezier) */}
          <path
            d={`M ${ORIGIN_X} ${ORIGIN_Y} Q ${CTRL_X} ${CTRL_Y} ${DEST_X} ${DEST_Y}`}
            fill="none"
            stroke="#FFD700"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
          />

          {/* Origin pin */}
          <circle cx={ORIGIN_X} cy={ORIGIN_Y} r="7" fill="#FFD700" opacity="0.15" />
          <circle cx={ORIGIN_X} cy={ORIGIN_Y} r="4" fill="#FFD700" />
          {/* Origin label */}
          <text
            x={ORIGIN_X}
            y={ORIGIN_Y + 18}
            textAnchor="middle"
            fontSize="9"
            fill="#FFD700"
            fontFamily="sans-serif"
            fontWeight="600"
          >
            {originName.length > 12 ? originName.slice(0, 12) + '…' : originName}
          </text>

          {/* Destination pin */}
          <circle cx={DEST_X} cy={DEST_Y} r="7" fill="#3B82F6" opacity="0.15" />
          <circle cx={DEST_X} cy={DEST_Y} r="4" fill="#3B82F6" />
          {/* Destination label */}
          <text
            x={DEST_X}
            y={DEST_Y + 18}
            textAnchor="middle"
            fontSize="9"
            fill="#3B82F6"
            fontFamily="sans-serif"
            fontWeight="600"
          >
            {destinationName.length > 12 ? destinationName.slice(0, 12) + '…' : destinationName}
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
