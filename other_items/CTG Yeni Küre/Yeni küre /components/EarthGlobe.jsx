"use client";

import dynamic from "next/dynamic";
import React from "react";

// Dynamically import the real Globe component, disabling SSR to avoid window errors
const EarthGlobeInner = dynamic(() => import("./EarthGlobeInner"), {
  ssr: false,
  loading: () => (
    <div
      className="globe-container glow-effect"
      style={{
        height: "500px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0F1B2B",
        color: "var(--accent)"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div className="spinner"></div>
        <span
          style={{
            fontSize: "13px",
            fontWeight: 600,
            letterSpacing: "0.15em",
            color: "var(--text-muted)",
            textTransform: "uppercase"
          }}
        >
          Initializing WebGL Network...
        </span>
      </div>
    </div>
  )
});

export default function EarthGlobe({ showHoverEffect = true, showTooltip = true }) {
  return <EarthGlobeInner showHoverEffect={showHoverEffect} showTooltip={showTooltip} />;
}
