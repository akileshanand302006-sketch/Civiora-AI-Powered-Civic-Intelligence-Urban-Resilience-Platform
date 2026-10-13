// ============================================================
// CivicPulse Spatial Public Layout
// Multi-layer Atmospheric Environment + Floating Glass Dock + Location Modals
// ============================================================

import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';
import { AtmosphericCanvas } from '../design-system/environment/AtmosphericCanvas';
import { GlassDock } from '../design-system/components/GlassDock';
import { GlassCommandBar } from '../design-system/components/GlassCommandBar';
import { AuthGateModal } from '../components/guards/AuthGateModal';
import { LocationSwitcherModal } from '../components/location/LocationSwitcherModal';
import { useLocationStore } from '../stores/locationStore';
import { animatePageEnter } from '../motion/motionSystem';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const { initializeLocation } = useLocationStore();

  useEffect(() => {
    initializeLocation();
  }, [initializeLocation]);

  useEffect(() => {
    // Trigger smooth spatial page entrance animation on route switch
    const mainEl = document.getElementById('main-content-flow');
    if (mainEl) {
      animatePageEnter(mainEl);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const isFullScreenMap = location.pathname.startsWith('/live-map');

  return (
    <div className="d-flex flex-column min-vh-100 position-relative overflow-hidden">
      {/* ── Layer 1-4: Interactive Atmospheric Canvas ─────────── */}
      <AtmosphericCanvas />

      {/* ── Layer 5: Global Modals (Auth Gate & Location Switcher) */}
      <AuthGateModal />
      <LocationSwitcherModal />
      <GlassCommandBar />

      {/* ── Layer 6: Floating Glass Navbar ──────────────────── */}
      <PublicNavbar />

      {/* ── Layer 7: Main Content Stage ─────────────────────── */}
      <main
        id="main-content-flow"
        className="flex-grow-1 position-relative"
        style={{
          zIndex: 5,
          paddingTop: isFullScreenMap ? '64px' : '80px',
          paddingBottom: isFullScreenMap ? '0px' : '40px',
        }}
      >
        <Outlet />
      </main>

      {/* ── Layer 8: Spatial Floating Dock Navigation ───────── */}
      {!isFullScreenMap && <GlassDock />}

      {/* ── Layer 9: Premium Civiora Spatial Footer ─────────── */}
      {!isFullScreenMap && <PublicFooter />}
    </div>
  );
};

export default PublicLayout;
