"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Globe from "react-globe.gl";

export default function EarthGlobeInner({ showHoverEffect = true, showTooltip = true }) {
  const globeRef = useRef(null);
  const containerRef = useRef(null);
  const [countries, setCountries] = useState({ features: [] });
  const [hoveredPolygon, setHoveredPolygon] = useState(null);
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const justClickedCountryRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [isVisible, setIsVisible] = useState(true);

  // Generate a solid 1x1 navy pixel data URL dynamically to override the default black globe sphere
  const oceanTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0a1122"; // Deep Slate Navy
      ctx.fillRect(0, 0, 1, 1);
      return canvas.toDataURL();
    }
    return null;
  }, []);

  // Fetch geojson data - deferred by 600ms to keep main thread clear during load
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson")
        .then((res) => res.json())
        .then((data) => {
          setCountries(data);
        })
        .catch((err) => {
          console.error("Failed to load globe GeoJSON dataset:", err);
        });
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  // Control auto-rotation dynamically based on visibility observer and user selection
  useEffect(() => {
    if (globeRef.current && typeof globeRef.current.controls === "function") {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = isAutoRotating && isVisible;
      }
    }
  }, [isVisible, isAutoRotating]);

  // Callback triggered exactly once when the WebGL scene is ready and methods are bound
  const handleGlobeReady = () => {
    if (globeRef.current) {
      if (typeof globeRef.current.controls === "function") {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = isAutoRotating && isVisible;
          controls.autoRotateSpeed = 1.5;
          controls.enableDamping = true;
          controls.dampingFactor = 0.05;
          controls.enableZoom = false; // Disable zooming
        }
      }
      
      if (typeof globeRef.current.renderer === "function") {
        const renderer = globeRef.current.renderer();
        if (renderer) {
          const isLowEnd = typeof navigator !== "undefined" && 
            (navigator.hardwareConcurrency <= 4 || /Mobi|Android|iPhone/i.test(navigator.userAgent));
          const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
          // Set ratio to max 1.5 on low-end and max 2.0 on high-end to guarantee razor-sharp borders
          renderer.setPixelRatio(isLowEnd ? Math.min(dpr, 1.5) : Math.min(dpr, 2.0));
        }
      }

      if (typeof globeRef.current.globeMaterial === "function") {
        const material = globeRef.current.globeMaterial();
        if (material && material.color) {
          material.color.set("#ffffff");
          material.needsUpdate = true;
        }
      }
    }
  };

  // Intersection Observer to detect when the globe is out of view
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Handle responsive scaling to container width (using Math.floor and a 5px threshold to prevent infinite sub-pixel loops)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width } = entry.contentRect;
        const roundedWidth = Math.floor(width);
        setDimensions((prev) => {
          // Avoid triggering re-render if the rounded width change is under a 5px threshold
          if (Math.abs(prev.width - roundedWidth) < 5) return prev;
          return { width: roundedWidth, height: 500 };
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Detect hardware profiles for static configuration
  const hardwareProfile = useMemo(() => {
    if (typeof navigator === "undefined") return { isLowEnd: false };
    const isLowEnd = navigator.hardwareConcurrency <= 4 || /Mobi|Android|iPhone/i.test(navigator.userAgent);
    return { isLowEnd };
  }, []);

  return (
    <div ref={containerRef} className="globe-container glow-effect" style={{ height: "500px", position: "relative" }}>

      {/* Selected Country HUD Panel (Bottom-Left overlay) */}
      {selectedPolygon && (
        <div 
          className="fade-in"
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            background: "rgba(15, 27, 43, 0.85)",
            border: "1px solid rgba(255, 215, 0, 0.3)",
            borderRadius: "6px",
            padding: "10px 16px",
            color: "#ffffff",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            zIndex: 10,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(6px)",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            minWidth: "180px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#FFD700", fontWeight: "bold", letterSpacing: "0.05em", textTransform: "uppercase" }}>SELECTED REGION</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPolygon(null);
                setIsAutoRotating(true);
                if (globeRef.current && typeof globeRef.current.pointOfView === "function") {
                  globeRef.current.pointOfView({ altitude: 2.2 }, 1000);
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                fontSize: "16px",
                padding: "0 4px",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#ffffff", marginTop: "2px" }}>
            {selectedPolygon.properties.ADMIN}
          </div>
        </div>
      )}

      <Globe
        ref={globeRef}
        onGlobeReady={handleGlobeReady}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#0F1B2B"
        globeImageUrl={oceanTexture}
        showAtmosphere={true}
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.15}
        enablePointerInteraction={showHoverEffect || showTooltip} // Disable CPU calculations if no hover/tooltip needed
        
        // Pass optimized rendering configuration for graphics cards
        rendererConfig={{
          antialias: true, // Keep MSAA antialiasing active for razor-sharp borders
          alpha: false,
          powerPreference: "high-performance",
          precision: hardwareProfile.isLowEnd ? "mediump" : "highp"
        }}
        
        // Polygons configurations
        polygonsData={countries.features}
        polygonCapColor={(d) => {
          if (d === selectedPolygon) return "#FFD700";
          return (showHoverEffect && d === hoveredPolygon) ? "#FFD700" : "#94a3b8";
        }}
        polygonStrokeColor={(d) => {
          if (d === selectedPolygon) return "#FFD700";
          return (showHoverEffect && d === hoveredPolygon) ? "#FFD700" : "#0a1122";
        }}
        
        // Altitude at 0.01 provides excellent raycast depth separation while preventing Z-fighting
        polygonAltitude={0.01}
        polygonSideColor={() => "rgba(0,0,0,0)"}
        
        // Disable CPU-heavy interpolation animations on hover/color transitions
        polygonsTransitionDuration={0}
        
        // Hover and interaction callbacks
        onPolygonHover={showHoverEffect ? (polygon) => {
          setHoveredPolygon(polygon);
        } : null}
        
        onPolygonClick={(polygon, event, coords) => {
          // Flag that a country was clicked in this tick to prevent accidental globe deselect trigger
          justClickedCountryRef.current = true;
          setTimeout(() => { justClickedCountryRef.current = false; }, 100);

          setSelectedPolygon(polygon);
          setIsAutoRotating(false);
          if (globeRef.current && typeof globeRef.current.pointOfView === "function") {
            // Zoom closer (altitude 1.5) and center on the clicked country
            globeRef.current.pointOfView({ lat: coords.lat, lng: coords.lng, altitude: 1.5 }, 1000);
          }
        }}
        
        onGlobeClick={() => {
          // If a country click was just triggered in the same tick, do not trigger ocean deselection
          if (justClickedCountryRef.current) return;

          setSelectedPolygon(null);
          setIsAutoRotating(true);
          if (globeRef.current && typeof globeRef.current.pointOfView === "function") {
            // Zoom back out to default 2.2 altitude smoothly
            globeRef.current.pointOfView({ altitude: 2.2 }, 1000);
          }
        }}
        
        // Dynamic tooltip
        polygonLabel={showTooltip ? ({ properties: d }) => `
          <div class="globe-tooltip">
            ${d.ADMIN}
          </div>
        ` : null}
      />
    </div>
  );
}
