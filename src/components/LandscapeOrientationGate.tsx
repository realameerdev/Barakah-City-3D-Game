/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

interface LandscapeOrientationGateProps {
  children: React.ReactNode;
}

export default function LandscapeOrientationGate({ children }: LandscapeOrientationGateProps) {
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // We enforce landscape for mobile / touch devices or any screen where height > width and width is phone/small tablet sized
      const isPortrait = height > width;
      const isMobileDevice = isTouch || width < 1024 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // Only lock if it is portrait AND it is a mobile/tablet-sized screen
      // (Desktop browsers with narrow windows can also be prompted if height is significantly greater than width)
      if (isPortrait && isMobileDevice) {
        setIsPortraitMobile(true);
      } else {
        setIsPortraitMobile(false);
      }
    };

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // Also listen to matchMedia if supported
    const mql = window.matchMedia('(orientation: portrait)');
    const handleMql = () => checkOrientation();
    if (mql.addEventListener) {
      mql.addEventListener('change', handleMql);
    } else {
      mql.addListener(handleMql);
    }

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleMql);
      } else {
        mql.removeListener(handleMql);
      }
    };
  }, []);

  return (
    <>
      {/* Full Screen Landscape Gate Overlay for Vertical Mobile Phones */}
      {isPortraitMobile && (
        <div className="fixed inset-0 z-[99999] bg-[#07090e] text-white flex flex-col items-center justify-center p-6 select-none font-sora">
          {/* Subtle Islamic geometric vignette & ambient glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,rgba(7,9,14,0.95)_70%)] pointer-events-none" />
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 animate-pulse" />

          <div className="relative z-10 flex flex-col items-center text-center max-w-sm mx-auto">
            {/* Animated Phone Rotation Graphic */}
            <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
              {/* Outer rotating pulse ring */}
              <div className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping opacity-30" />
              <div className="absolute inset-2 rounded-full border border-emerald-400/20 bg-emerald-950/20 backdrop-blur-md" />

              {/* Rotating Phone Icon with smooth CSS 90-degree keyframe */}
              <div className="relative flex items-center justify-center animate-[spin_3s_ease-in-out_infinite]">
                <div className="w-16 h-28 border-2 border-emerald-400 bg-black/60 rounded-2xl flex flex-col items-center justify-between p-1.5 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                  {/* Speaker notch */}
                  <div className="w-4 h-1 bg-white/40 rounded-full" />
                  {/* Screen content glow */}
                  <div className="w-full flex-1 my-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                    <RotateCw className="w-5 h-5 text-emerald-400 animate-spin" />
                  </div>
                  {/* Home indicator bar */}
                  <div className="w-6 h-1 bg-white/40 rounded-full" />
                </div>
              </div>
            </div>

            {/* Arabic Basmala blessing */}
            <div className="text-emerald-400 font-serif text-lg tracking-wider mb-2 drop-shadow-[0_2px_10px_rgba(16,185,129,0.4)]">
              بِسْمِ ٱللَّٰهِ
            </div>

            {/* Monumental GTA-Style Header */}
            <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2 leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
              ROTATE YOUR PHONE
            </h1>

            {/* Clear Prompt Statement */}
            <p className="text-emerald-400 font-bold text-sm tracking-wide uppercase mb-3 font-hud">
              Baraka City is designed for landscape mode
            </p>

            <p className="text-zinc-400 text-xs leading-relaxed max-w-xs mb-6">
              Turn your device horizontally to enter the full AAA 3D open-world experience. The city will load automatically once rotated.
            </p>

            {/* Status Indicator */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300 font-hud">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>AWAITING LANDSCAPE ORIENTATION</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Game Experience Container */}
      <div className={`w-full h-full ${isPortraitMobile ? 'hidden' : 'block'}`}>
        {children}
      </div>
    </>
  );
}
