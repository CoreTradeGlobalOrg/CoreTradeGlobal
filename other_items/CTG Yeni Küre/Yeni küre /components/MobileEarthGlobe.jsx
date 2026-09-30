"use client";

import dynamic from "next/dynamic";
import React from "react";

// Dynamically load the client-only mobile globe inner component to avoid SSR 'window is not defined' errors
const MobileEarthGlobeInner = dynamic(
  () => import("./MobileEarthGlobeInner"),
  {
    ssr: false,
    loading: () => (
      <div 
        style={{ 
          height: "350px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          background: "#0F1B2B",
          width: "100%"
        }}
      >
        {/* Sleek themed loader */}
        <div className="loader-spinner" style={{
          width: "40px",
          height: "40px",
          border: "3px solid rgba(59, 130, 246, 0.15)",
          borderTop: "3px solid #3b82f6",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }}></div>
      </div>
    )
  }
);

export default function MobileEarthGlobe({ height = 350 }) {
  return <MobileEarthGlobeInner height={height} />;
}
