/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Smartphone, RotateCcw } from 'lucide-react';

export interface OrientationContextType {
  isPortrait: boolean;
  isLandscape: boolean;
  orientation: 'portrait' | 'landscape';
  toggleOrientation: () => void;
}

const OrientationContext = createContext<OrientationContextType>({
  isPortrait: false,
  isLandscape: true,
  orientation: 'landscape',
  toggleOrientation: () => {},
});

export const useOrientation = () => useContext(OrientationContext);

interface LandscapeOrientationGateProps {
  children: React.ReactNode;
}

export default function LandscapeOrientationGate({ children }: LandscapeOrientationGateProps) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);
  const [showRotationHint, setShowRotationHint] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(isTouch);

      // Natural orientation calculation
      const isPortraitNow = height > width;
      setOrientation(isPortraitNow ? 'portrait' : 'landscape');
    };

    checkOrientation();

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

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

  const isPortrait = orientation === 'portrait';
  const isLandscape = orientation === 'landscape';

  // Optional manual orientation toggle helper (via Fullscreen / Screen Orientation API if supported)
  const toggleOrientation = async () => {
    try {
      if (typeof document !== 'undefined' && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.().catch(() => {});
      }
      // If Screen Orientation API is available and device allows locking
      const screenAny = screen as any;
      if (screenAny?.orientation?.lock) {
        if (isPortrait) {
          await screenAny.orientation.lock('landscape').catch(() => {});
        } else {
          await screenAny.orientation.lock('portrait').catch(() => {});
        }
      }
    } catch {
      // Ignored if user browser denies orientation lock
    }
  };

  return (
    <OrientationContext.Provider
      value={{
        isPortrait,
        isLandscape,
        orientation,
        toggleOrientation,
      }}
    >
      <div className="w-full h-full relative overflow-hidden bg-[#090a0f]">
        {/* The entire game and application renders seamlessly in BOTH straight mode and landscape mode */}
        {children}
      </div>
    </OrientationContext.Provider>
  );
}
