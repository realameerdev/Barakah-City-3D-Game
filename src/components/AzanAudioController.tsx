import React, { useEffect, useRef } from 'react';
import azanAudioUrl from '../assets/audio/azan.mp3';

interface AzanAudioControllerProps {
  activeView: 'landing' | 'dashboard';
  isFading?: boolean;
}

// Subtle, atmospheric ambient background level (respectful and cinematic, not jarring)
const TARGET_VOLUME = 0.20;
const PUBLIC_FALLBACK_AUDIO_PATH = '/assets/audio/azan.mp3';

// Singleton instance to prevent duplicate audio elements across fast refreshes or rerenders
let globalAudioInstance: HTMLAudioElement | null = null;
let globalFadeInterval: number | null = null;

export const AzanAudioController: React.FC<AzanAudioControllerProps> = ({
  activeView,
  isFading = false,
}) => {
  const isEnteringWorldRef = useRef(false);

  // Clear any active volume fading interval safely
  const clearFadeInterval = () => {
    if (globalFadeInterval !== null) {
      window.clearInterval(globalFadeInterval);
      globalFadeInterval = null;
    }
  };

  // Smoothly fade in audio to TARGET_VOLUME
  const fadeIn = (audio: HTMLAudioElement, targetVol = TARGET_VOLUME, durationMs = 1200) => {
    clearFadeInterval();
    const steps = 20;
    const intervalMs = Math.max(20, Math.floor(durationMs / steps));
    const stepIncrement = targetVol / steps;
    audio.volume = 0;

    globalFadeInterval = window.setInterval(() => {
      if (!globalAudioInstance || globalAudioInstance !== audio) {
        clearFadeInterval();
        return;
      }
      const nextVol = Math.min(targetVol, globalAudioInstance.volume + stepIncrement);
      globalAudioInstance.volume = nextVol;
      if (nextVol >= targetVol) {
        clearFadeInterval();
      }
    }, intervalMs);
  };

  // Smoothly fade out audio to 0 and pause
  const fadeOut = (audio: HTMLAudioElement, durationMs = 1000) => {
    clearFadeInterval();
    const currentVol = audio.volume;
    if (currentVol <= 0.01) {
      audio.pause();
      audio.volume = 0;
      return;
    }

    const steps = 20;
    const intervalMs = Math.max(20, Math.floor(durationMs / steps));
    const stepDecrement = currentVol / steps;

    globalFadeInterval = window.setInterval(() => {
      if (!globalAudioInstance || globalAudioInstance !== audio) {
        clearFadeInterval();
        return;
      }
      const nextVol = Math.max(0, globalAudioInstance.volume - stepDecrement);
      globalAudioInstance.volume = nextVol;
      if (nextVol <= 0.01) {
        globalAudioInstance.pause();
        globalAudioInstance.volume = 0;
        clearFadeInterval();
      }
    }, intervalMs);
  };

  useEffect(() => {
    // 1. Initialize single shared Audio instance once
    if (!globalAudioInstance && typeof window !== 'undefined') {
      const audio = new Audio();
      audio.src = azanAudioUrl || PUBLIC_FALLBACK_AUDIO_PATH;
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;

      // Gracefully handle source error by falling back to public static path
      audio.onerror = () => {
        if (audio.src !== window.location.origin + PUBLIC_FALLBACK_AUDIO_PATH) {
          audio.src = PUBLIC_FALLBACK_AUDIO_PATH;
          audio.load();
        }
      };

      globalAudioInstance = audio;
    }

    const audio = globalAudioInstance;
    if (!audio) return;

    // Check if we should play or fade out
    if (activeView === 'landing' && !isFading) {
      isEnteringWorldRef.current = false;

      // If already playing smoothly, do not interrupt or restart
      if (!audio.paused && audio.volume > 0) {
        return;
      }

      // If already started playing but volume was 0, fade in
      if (!audio.paused) {
        fadeIn(audio, TARGET_VOLUME, 1000);
        return;
      }

      // Try autoplaying immediately where browser audio policies permit
      audio.volume = 0;
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Autoplay permitted: smoothly fade in
            fadeIn(audio, TARGET_VOLUME, 1200);
          })
          .catch(() => {
            // Browser autoplay policy restricted audio before user gesture.
            // Setup listener on first user interaction anywhere on the window.
            const handleFirstUserInteraction = () => {
              if (!isEnteringWorldRef.current && audio.paused) {
                audio.volume = 0;
                audio
                  .play()
                  .then(() => {
                    fadeIn(audio, TARGET_VOLUME, 1000);
                  })
                  .catch(() => {});
              }
              cleanupUnlockListeners();
            };

            const cleanupUnlockListeners = () => {
              window.removeEventListener('pointerdown', handleFirstUserInteraction);
              window.removeEventListener('keydown', handleFirstUserInteraction);
              window.removeEventListener('touchstart', handleFirstUserInteraction);
              window.removeEventListener('click', handleFirstUserInteraction);
            };

            window.addEventListener('pointerdown', handleFirstUserInteraction, { once: true, passive: true });
            window.addEventListener('keydown', handleFirstUserInteraction, { once: true, passive: true });
            window.addEventListener('touchstart', handleFirstUserInteraction, { once: true, passive: true });
            window.addEventListener('click', handleFirstUserInteraction, { once: true, passive: true });
          });
      }
    } else {
      // Transitioning into game or leaving landing screen: smoothly fade out
      isEnteringWorldRef.current = true;
      if (!audio.paused) {
        fadeOut(audio, 1000);
      }
    }
  }, [activeView, isFading]);

  return null;
};
export default AzanAudioController;
