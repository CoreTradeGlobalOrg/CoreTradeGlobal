"use client";

import React, { useState } from "react";
import EarthGlobe from "@/components/EarthGlobe";
import MobileEarthGlobe from "@/components/MobileEarthGlobe";

export default function Home() {
  const [activeTab, setActiveTab] = useState("desktop");

  return (
    <div className="app-container">
      {/* Navigation */}
      <nav className="navbar" id="main-nav">
        <div className="brand">
          <div className="brand-dot"></div>
          CORETRADE GLOBAL
        </div>
        <div className="nav-links" style={{ display: "flex", gap: "24px" }}>
          <button 
            onClick={() => setActiveTab("desktop")}
            style={{
              background: "none",
              border: "none",
              fontSize: "14px",
              fontWeight: "600",
              color: activeTab === "desktop" ? "#ffffff" : "var(--text-muted)",
              cursor: "pointer",
              borderBottom: activeTab === "desktop" ? "2px solid #FFD700" : "2px solid transparent",
              paddingBottom: "4px",
              transition: "all 0.2s ease"
            }}
          >
            DESKTOP TERMINAL
          </button>
          <button 
            onClick={() => setActiveTab("mobile")}
            style={{
              background: "none",
              border: "none",
              fontSize: "14px",
              fontWeight: "600",
              color: activeTab === "mobile" ? "#ffffff" : "var(--text-muted)",
              cursor: "pointer",
              borderBottom: activeTab === "mobile" ? "2px solid #FFD700" : "2px solid transparent",
              paddingBottom: "4px",
              transition: "all 0.2s ease"
            }}
          >
            MOBILE HERO
          </button>
        </div>
        <button className="btn-terminal">LAUNCH TERMINAL</button>
      </nav>

      {/* Hero Header */}
      <header className="hero" style={{ margin: "64px auto 48px auto", textAlign: "center", padding: "0 20px" }}>
        <span className="badge">Active Networks</span>
        <h1 style={{ fontSize: "42px", marginBottom: "20px", fontWeight: "800" }}>3D Earth Globe Component Options</h1>
        <p style={{ maxWidth: "720px", margin: "0 auto" }}>
          Select a component mode below to test its performance. Mounting only one WebGL canvas at a time unlocks the browser's native hardware frame rate (up to 120 FPS).
        </p>
      </header>

      {/* Centered Tabbed Globe Terminal Area */}
      <main style={{ maxWidth: "800px", width: "100%", margin: "0 auto 80px auto", padding: "0 20px" }}>
        {activeTab === "desktop" ? (
          <section className="glass-panel" id="desktop" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Option 1: Interactive Desktop Globe</span>
              <span className="badge" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#22c55e", border: "1px solid rgba(34, 197, 94, 0.3)" }}>INTERACTIVE</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0" }}>
              Drag to Rotate • Click Country to Zoom & Select • Click Ocean/Close to Zoom Out & Resume Spin.
            </p>
            <EarthGlobe showHoverEffect={true} showTooltip={true} />
          </section>
        ) : (
          <section className="glass-panel" id="mobile" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="card-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Option 2: Non-Interactive Mobile Hero</span>
              <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6", border: "1px solid rgba(59, 130, 246, 0.3)" }}>MOBILE OPTIMIZED</span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0" }}>
              Interaction disabled. Clicks pass through so users scroll page seamlessly. Capped DPR (1.5x) and medium precision shaders.
            </p>
            <MobileEarthGlobe />
          </section>
        )}
      </main>

      {/* Footer Status Nodes */}
      <footer className="footer-status">
        <div>© 2026 CoreTrade Global Inc. All rights reserved.</div>
        <div className="status-nodes">
          <div className="status-node">Rotterdam Hub</div>
          <div className="status-node">Singapore Hub</div>
          <div className="status-node">New York Hub</div>
        </div>
      </footer>
    </div>
  );
}
