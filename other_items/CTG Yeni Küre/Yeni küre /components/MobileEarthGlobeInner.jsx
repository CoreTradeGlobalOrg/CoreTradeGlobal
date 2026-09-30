"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Globe from "react-globe.gl";

export default function MobileEarthGlobeInner({ height = 350 }) {
  const globeRef = useRef(null);
  const containerRef = useRef(null);
  const [countries, setCountries] = useState({ features: [] });
  const [dimensions, setDimensions] = useState({ width: 300, height: height });
  const [isVisible, setIsVisible] = useState(true);

  // Generate a solid 1x1 navy pixel data URL dynamically to override the default black globe sphere
  const navyTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#0a1122"; // Slate Navy matching desktop ocean
      ctx.fillRect(0, 0, 1, 1);
      return canvas.toDataURL();
    }
    return null;
  }, []);

  // Fetch GeoJSON data - deferred by 400ms to keep main thread clear during mobile page load
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch("https://cdn.jsdelivr.net/gh/vasturiano/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson")
        .then((res) => res.json())
        .then((data) => {
          setCountries(data);
        })
        .catch((err) => {
          console.error("Failed to load mobile globe GeoJSON:", err);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  // Control auto-rotation dynamically based on visibility observer
  useEffect(() => {
    if (globeRef.current && typeof globeRef.current.controls === "function") {
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = isVisible;
      }
    }
  }, [isVisible]);

  // Callback triggered exactly once when the WebGL scene is ready
  const handleGlobeReady = () => {
    if (globeRef.current) {
      if (typeof globeRef.current.controls === "function") {
        const controls = globeRef.current.controls();
        if (controls) {
          controls.autoRotate = isVisible;
          controls.autoRotateSpeed = 1.2; // Slow elegant spin for hero background
          controls.enableZoom = false;
          controls.enableRotate = false; // Block user manual rotation
          controls.enablePan = false;
        }
      }
      
      if (typeof globeRef.current.renderer === "function") {
        const renderer = globeRef.current.renderer();
        if (renderer) {
          const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
          // Mobile GPU safety: cap DPR at max 1.5 to prevent battery drain
          renderer.setPixelRatio(Math.min(dpr, 1.5));
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
          if (Math.abs(prev.width - roundedWidth) < 5) return prev;
          return { width: roundedWidth, height };
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height]);

  return (
    <div 
      ref={containerRef} 
      className="mobile-globe-wrapper" 
      style={{ 
        height: `${height}px`, 
        position: "relative",
        width: "100%",
        pointerEvents: "none", // Crucial for mobile scrolling over the hero section!
        overflow: "hidden"
      }}
    >
      <Globe
        ref={globeRef}
        onGlobeReady={handleGlobeReady}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#0F1B2B"
        globeImageUrl={navyTexture}
        showAtmosphere={true}
        atmosphereColor="#3b82f6"
        atmosphereAltitude={0.12}
        enablePointerInteraction={false} // Disable react-globe.gl interaction hooks
        
        // Pass optimized rendering configuration for mobile devices
        rendererConfig={{
          antialias: true, // Smooth edges on lines
          alpha: false,
          powerPreference: "high-performance",
          precision: "mediump" // Low-overhead shaders for mobile CPU/GPU
        }}
        
        // Polygons configurations (Clean matte look)
        polygonsData={countries.features}
        polygonCapColor={() => "#94a3b8"} // Solid matte slate grey
        polygonStrokeColor={() => "#0a1122"} // Blends boundaries with ocean
        polygonAltitude={0.008}
        polygonSideColor={() => "rgba(0,0,0,0)"}
        polygonsTransitionDuration={0}
      />
    </div>
  );
}
