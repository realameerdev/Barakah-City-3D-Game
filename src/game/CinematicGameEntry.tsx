/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Volume2, VolumeX, Play, Pause, ChevronLeft, ChevronRight, Compass } from 'lucide-react';

// Photorealistic Islamic architectural & cultural showcase imagery from project
import heroImg from '../assets/images/hero_avatar_mosque_1791286969661.jpg';
import abujaImg from '../assets/images/world_abuja_1791286984830.jpg';
import lagosImg from '../assets/images/world_lagos_1791287003842.jpg';
import makkahImg from '../assets/images/world_makkah_1791287014819.jpg';
import panoramicCityImg from '../assets/images/world_panoramic_city_1791287026807.jpg';
import multiplayerSceneImg from '../assets/images/multiplayer_scene_1791287055254.jpg';
import eventGuildImg from '../assets/images/event_guild_war_1791287082782.jpg';
import eventMarketImg from '../assets/images/event_night_market_1791287095562.jpg';
import customizerPreviewImg from '../assets/images/avatar_customizer_preview_1791287838619.jpg';

interface CinematicGameEntryProps {
  onEnterWorld: (worldName?: string) => void;
  onStartTransition?: () => void;
  onlineCount?: number;
  initialWorld?: string;
}

// 8 Interactive Showcase Cards representing the real Baraka City dashboard & game features
interface ShowcaseCard {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  highlight: string;
  image: string;
  stats: { label: string; value: string }[];
}

const SHOWCASE_CARDS: ShowcaseCard[] = [
  {
    id: 'world-map',
    category: '3D WORLD MAP & METROPOLISES',
    title: 'Global Islamic Metropolises',
    subtitle: 'Abuja · Lagos · Kwara · Makkah · Madinah · Cairo · Istanbul · Samarkand · Fez · Cordoba · Baghdad · Kano',
    highlight: 'Open-World Travel',
    image: panoramicCityImg,
    stats: [
      { label: 'Metropolises', value: '18 Live' },
      { label: 'Atmosphere', value: 'Clear Day / Night' },
    ],
  },
  {
    id: 'avatar-wardrobe',
    category: 'AVATAR & WARDROBE',
    title: 'Custom Avatar & Attire',
    subtitle: 'Royal Emerald Jalabiyya, Desert Kaftans, Hijabs & Kufis',
    highlight: 'Modest Halal Styles',
    image: customizerPreviewImg,
    stats: [
      { label: 'Wardrobe Sets', value: '32 Styles' },
      { label: 'Customizer', value: 'Realtime 3D' },
    ],
  },
  {
    id: 'wealth-level',
    category: 'ECONOMY & LEVEL SYSTEM',
    title: 'Baraka Coins & Halal Wealth',
    subtitle: 'Level 42 Al-Mu’allim · 28-Day Daily Prayer Streak',
    highlight: 'Zero Gambling',
    image: eventMarketImg,
    stats: [
      { label: 'Coins', value: '45,280 BRC' },
      { label: 'Status', value: 'Al-Mu’allim' },
    ],
  },
  {
    id: 'jobs-quests',
    category: 'CIVIC JOBS & SOUQ TRADING',
    title: 'Jobs, Trades & Community Quests',
    subtitle: 'Souq Merchant, City Architect, Library Scholar & Sadaqah',
    highlight: 'Halal Income',
    image: heroImg,
    stats: [
      { label: 'Daily Tasks', value: '12 Active' },
      { label: 'Civic Guilds', value: 'Connected' },
    ],
  },
  {
    id: 'houses-cars',
    category: 'ESTATE & PERFORMANCE CARS',
    title: 'Private Villas & Highway Cars',
    subtitle: 'Deadbolt Locks, Private Prayer Mat Room & City Sedans',
    highlight: '1 User Per House',
    image: abujaImg,
    stats: [
      { label: 'Residences', value: 'Private Villa' },
      { label: 'Garage', value: 'Falcon Turbo' },
    ],
  },
  {
    id: 'nikah-family',
    category: 'FAMILY & COMMUNITY BONDS',
    title: 'Marriage & Family Endowment',
    subtitle: 'Halal Nikah Registry, Shared Family Homes & Community Garden',
    highlight: 'Family Friendly',
    image: multiplayerSceneImg,
    stats: [
      { label: 'Community', value: '100k+ Strong' },
      { label: 'Sadaqah', value: 'Ongoing Box' },
    ],
  },
  {
    id: 'events-tournaments',
    category: 'ESPORTS & LIVE ARENA',
    title: 'Ramadan Grand Championship',
    subtitle: '$200,000 Grand Prize Pool, Cultural Football & Arena Matches',
    highlight: 'Grand Prize Pool',
    image: eventGuildImg,
    stats: [
      { label: 'Prize Pool', value: '$200,000' },
      { label: 'Arena', value: 'Live Matches' },
    ],
  },
  {
    id: 'sanctuary-leaderboard',
    category: 'SANCTUARY & CITIZEN RANKS',
    title: 'Sanctuary Quiz & Leaderboards',
    subtitle: 'Tariq_KSA (#1), Fatima_Lagos (#2), Amir_Cairo (#3)',
    highlight: 'Global Ranks',
    image: makkahImg,
    stats: [
      { label: 'Rank #1', value: '98.4% Accuracy' },
      { label: 'Sanctuary', value: 'Makkah League' },
    ],
  },
];

// Floating golden light particles
const PARTICLES = [
  { left: '10%', delay: '0s', duration: '14s', size: 4 },
  { left: '22%', delay: '2.5s', duration: '17s', size: 5 },
  { left: '38%', delay: '1s', duration: '15s', size: 3.5 },
  { left: '55%', delay: '4s', duration: '18s', size: 4.5 },
  { left: '70%', delay: '1.8s', duration: '13s', size: 3.5 },
  { left: '85%', delay: '3.2s', duration: '16s', size: 5 },
  { left: '48%', delay: '6s', duration: '19s', size: 4 },
  { left: '92%', delay: '5s', duration: '15s', size: 3 },
];

export default function CinematicGameEntry({
  onEnterWorld,
  onStartTransition,
  onlineCount = 1420,
  initialWorld = 'Abuja Metropolis',
}: CinematicGameEntryProps) {
  // Stepped loading sequence: 0% -> 15% -> 45% -> 75% -> 100%
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [displayedProgress, setDisplayedProgress] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(false);

  // 3D Carousel Rotation & Drag Inertia State
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  // Carousel interactive animation refs
  const carouselContainerRef = useRef<HTMLDivElement>(null);
  const rotationYRef = useRef<number>(0);
  const tiltXRef = useRef<number>(0);
  const velocityRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Audio synthesizer ref
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Responsive ring radius state
  const [cylinderRadius, setCylinderRadius] = useState<number>(460);

  // Detect screen size & update radius
  useEffect(() => {
    const updateRadius = () => {
      const w = window.innerWidth;
      if (w < 480) {
        setCylinderRadius(240);
      } else if (w < 768) {
        setCylinderRadius(310);
      } else if (w < 1024) {
        setCylinderRadius(390);
      } else if (w < 1440) {
        setCylinderRadius(480);
      } else {
        setCylinderRadius(560);
      }
    };
    updateRadius();
    window.addEventListener('resize', updateRadius);
    return () => window.removeEventListener('resize', updateRadius);
  }, []);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setIsReducedMotion(mediaQuery.matches);
      if (mediaQuery.matches) {
        setIsAutoRotating(false);
      }
      const listener = (e: MediaQueryListEvent) => {
        setIsReducedMotion(e.matches);
        if (e.matches) setIsAutoRotating(false);
      };
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Stepped loading scheduler (15% -> 45% -> 75% -> 100%)
  useEffect(() => {
    const t1 = setTimeout(() => setLoadingStage(15), 350);
    const t2 = setTimeout(() => setLoadingStage(45), 1300);
    const t3 = setTimeout(() => setLoadingStage(75), 2350);
    const t4 = setTimeout(() => setLoadingStage(100), 3400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  // Smooth number interpolation between the paused stages
  useEffect(() => {
    let animId: number;
    const updateProgress = () => {
      setDisplayedProgress((curr) => {
        if (curr >= loadingStage) {
          if (curr >= 100 && !isLoaded) {
            setIsLoaded(true);
          }
          return curr;
        }
        const diff = loadingStage - curr;
        const step = Math.max(0.75, diff * 0.12);
        const next = Math.min(loadingStage, curr + step);
        if (next >= 100 && !isLoaded) {
          setIsLoaded(true);
        }
        return next;
      });
      animId = requestAnimationFrame(updateProgress);
    };

    animId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animId);
  }, [loadingStage, isLoaded]);

  // Entrance chime
  const playEntranceChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      const freqs = [164.81, 247.94, 329.63, 493.88];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12 / (idx + 1), ctx.currentTime + 0.15 + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + 2.3);
      });
    } catch {
      // Audio safe fallback
    }
  }, []);

  // Circular Enter Button click handler
  const handleEnterClick = useCallback(() => {
    if (isEntering || !isLoaded) return;
    setIsEntering(true);
    onStartTransition?.();
    playEntranceChime();

    setTimeout(() => {
      onEnterWorld(initialWorld);
    }, 800);
  }, [isEntering, isLoaded, onEnterWorld, onStartTransition, playEntranceChime, initialWorld]);

  // Global Keyboard shortcuts: Enter, Space, Arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || (e.code === 'Space' && isLoaded && e.target === document.body)) {
        if (!isEntering && isLoaded) {
          e.preventDefault();
          handleEnterClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEntering, isLoaded, handleEnterClick]);

  // Continuous 3D Carousel Render Loop with Inertia & Visibility Handling
  useEffect(() => {
    let isTabVisible = true;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const renderLoop = () => {
      if (!isTabVisible) {
        animFrameRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Apply drag inertia
      if (!isDraggingRef.current) {
        if (Math.abs(velocityRef.current) > 0.01) {
          rotationYRef.current += velocityRef.current;
          velocityRef.current *= 0.94; // Smooth damping
        } else if (isAutoRotating && !isReducedMotion) {
          // Slow, smooth continuous auto-rotation
          rotationYRef.current += 0.075;
        }
      }

      // Smooth tilt recovery
      if (!isDraggingRef.current) {
        tiltXRef.current *= 0.96;
      }

      // Update 3D DOM transform directly on the cylinder element for ultra 60fps performance
      if (carouselContainerRef.current) {
        carouselContainerRef.current.style.transform = `rotateX(${tiltXRef.current.toFixed(
          2
        )}deg) rotateY(${rotationYRef.current.toFixed(2)}deg)`;
      }

      // Determine front-most card for accessibility / indicator
      const normalizedAngle = ((-rotationYRef.current % 360) + 360) % 360;
      const anglePerCard = 360 / SHOWCASE_CARDS.length;
      const nearestCardIdx = Math.round(normalizedAngle / anglePerCard) % SHOWCASE_CARDS.length;
      setActiveCardIndex(nearestCardIdx);

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAutoRotating, isReducedMotion]);

  // Pointer Hand Controls (Mouse drag, Touch swipe, Pen)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag when interacting on background layer
    isDraggingRef.current = true;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    velocityRef.current = 0;

    // Pause auto-rotation while interacting
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastPointerRef.current.x;
    const deltaY = e.clientY - lastPointerRef.current.y;

    rotationYRef.current += deltaX * 0.35;
    tiltXRef.current = Math.max(-14, Math.min(14, tiltXRef.current - deltaY * 0.12));

    velocityRef.current = deltaX * 0.32;
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }

    // Resume auto-rotation gently a few seconds after letting go
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (!isReducedMotion) {
        setIsAutoRotating(true);
      }
    }, 2800);
  };

  // Wheel / Trackpad Scroll Control
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY * 0.5;
    velocityRef.current -= delta * 0.08;

    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      if (!isReducedMotion) {
        setIsAutoRotating(true);
      }
    }, 2800);
  };

  // Keyboard navigation on background region
  const handleRegionKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      velocityRef.current += 3.2;
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      velocityRef.current -= 3.2;
    } else if (e.code === 'Space') {
      // Space pauses or resumes rotation when region is focused
      e.preventDefault();
      setIsAutoRotating((prev) => !prev);
    }
  };

  const toggleOrbit = () => {
    setIsAutoRotating((prev) => !prev);
  };

  const stepCarousel = (direction: 'prev' | 'next') => {
    const step = (360 / SHOWCASE_CARDS.length) * (direction === 'next' ? -1 : 1);
    velocityRef.current += step * 0.18;
  };

  return (
    <div className="relative w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#06080d] text-white font-sora select-none flex flex-col justify-between">
      {/* =====================================================================
          NEW BACKGROUND: ROTATING 3D SHOWCASE OF THE WHOLE GAME
          Constructed from real dashboard features in 3D carousel cylinder
          Hand control: Pointer events (Mouse, Touch, Pen) with inertia
          ===================================================================== */}
      <div
        role="region"
        aria-label="Game preview, drag to explore"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        onKeyDown={handleRegionKeyDown}
        className="absolute inset-0 z-0 overflow-hidden cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
        style={{
          touchAction: 'pan-y',
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        {/* Soft Golden Light Sweep across the 3D scene */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          <div className="w-[60vw] h-[220vh] bg-gradient-to-r from-transparent via-amber-300/12 via-yellow-200/20 to-transparent -top-[60vh] absolute animate-gold-sweep pointer-events-none" />
        </div>

        {/* Floating Golden Light Particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {PARTICLES.map((p, idx) => (
            <div
              key={idx}
              className={`absolute rounded-full bg-amber-300/80 shadow-[0_0_10px_#fbbf24] pointer-events-none ${
                idx % 2 === 0 ? 'animate-particle-1' : 'animate-particle-2'
              }`}
              style={{
                left: p.left,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </div>

        {/* 3D ROTATING CYLINDER CONTAINER */}
        <div className="w-full h-full flex items-center justify-center relative pointer-events-none">
          <div
            ref={carouselContainerRef}
            className="w-0 h-0 relative flex items-center justify-center pointer-events-none"
            style={{
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
          >
            {SHOWCASE_CARDS.map((card, idx) => {
              const angle = (idx * 360) / SHOWCASE_CARDS.length;

              return (
                <div
                  key={card.id}
                  className="absolute pointer-events-none select-none"
                  style={{
                    transform: `rotateY(${angle}deg) translateZ(${cylinderRadius}px)`,
                    transformStyle: 'preserve-3d',
                    width: 'clamp(240px, 25vw, 360px)',
                    height: 'clamp(320px, 42vh, 440px)',
                    marginLeft: 'calc(-1 * clamp(240px, 25vw, 360px) / 2)',
                    marginTop: 'calc(-1 * clamp(320px, 42vh, 440px) / 2)',
                  }}
                >
                  {/* Visual-Only Showcase Card (Non-navigating, high-polish glassmorphism) */}
                  <div className="w-full h-full rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-b from-[#141824]/90 via-[#0c0f18]/95 to-[#070910] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(245,158,11,0.15)] flex flex-col justify-between p-3.5 sm:p-4 relative backdrop-blur-md">
                    {/* Upper Showcase Image */}
                    <div className="relative w-full h-[52%] sm:h-[55%] rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shrink-0">
                      <img
                        src={card.image}
                        alt={card.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover select-none pointer-events-none"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f18] via-transparent to-transparent pointer-events-none" />

                      {/* Top Pill Badge */}
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/75 border border-amber-400/40 backdrop-blur-md text-[9px] sm:text-[10px] font-hud text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="truncate">{card.highlight}</span>
                      </div>
                    </div>

                    {/* Lower Information Section */}
                    <div className="flex-1 flex flex-col justify-between pt-2.5 sm:pt-3">
                      <div>
                        <span className="text-[9px] sm:text-[10px] font-hud text-amber-300/80 uppercase tracking-widest font-bold block mb-0.5">
                          {card.category}
                        </span>
                        <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight font-sora drop-shadow line-clamp-1">
                          {card.title}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-zinc-300 line-clamp-2 mt-1 leading-snug font-medium">
                          {card.subtitle}
                        </p>
                      </div>

                      {/* Live Feature Stats Chips */}
                      <div className="grid grid-cols-2 gap-1.5 pt-2 mt-1 border-t border-white/10">
                        {card.stats.map((stat, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 flex flex-col"
                          >
                            <span className="text-[7.5px] sm:text-[8px] font-hud text-zinc-400 uppercase tracking-wider">
                              {stat.label}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-amber-300 truncate">
                              {stat.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subtle golden corner ambient sheen */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/10 to-transparent pointer-events-none rounded-tr-3xl" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ambient Ground Reflection Grid */}
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none z-10" />

        {/* Central Vignette Disc behind Logo Area to Guarantee Crystal Contrast without blur */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-[90vw] max-w-xl h-[480px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(6,8,13,0.85)_0%,rgba(6,8,13,0.55)_55%,transparent_100%)] pointer-events-none" />
        </div>

        {/* SHOWCASE ACCESSIBILITY HUD & CONTROLS (Pointer drag helper, Pause/Play orbit toggle) */}
        <div className="absolute bottom-14 sm:bottom-16 left-3 sm:left-6 z-20 pointer-events-auto flex items-center gap-2">
          {/* Pause / Play Orbit Button */}
          <button
            onClick={toggleOrbit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 border border-white/15 hover:border-amber-400/50 text-zinc-300 hover:text-amber-300 transition-all text-[10px] sm:text-[11px] font-hud uppercase tracking-wider backdrop-blur-md cursor-pointer shadow-xl"
            title={isAutoRotating ? 'Pause 3D showcase rotation' : 'Resume 3D showcase rotation'}
            aria-label={isAutoRotating ? 'Pause 3D showcase rotation' : 'Resume 3D showcase rotation'}
          >
            {isAutoRotating ? (
              <>
                <Pause className="w-3 h-3 text-amber-300" />
                <span className="hidden xs:inline">PAUSE PREVIEW</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-amber-300 fill-amber-300" />
                <span className="hidden xs:inline">ORBIT PREVIEW</span>
              </>
            )}
          </button>

          {/* Quick Manual Step Arrows */}
          <div className="hidden xs:flex items-center gap-1 bg-black/70 border border-white/15 rounded-xl p-0.5 backdrop-blur-md">
            <button
              onClick={() => stepCarousel('prev')}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Rotate Left (or use Left Arrow key)"
              aria-label="Previous showcase card"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => stepCarousel('next')}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Rotate Right (or use Right Arrow key)"
              aria-label="Next showcase card"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active Card Indicator */}
          <div className="hidden md:flex items-center gap-1 text-[9px] font-hud text-zinc-400 bg-black/60 px-2.5 py-1.5 rounded-xl border border-white/10 backdrop-blur-md">
            <Compass className="w-3 h-3 text-amber-400" />
            <span className="text-zinc-200 uppercase font-semibold">
              {SHOWCASE_CARDS[activeCardIndex]?.title || 'Game Showcase'}
            </span>
          </div>
        </div>

        {/* Drag to Explore Prompt (Bottom Right) */}
        <div className="hidden sm:block absolute bottom-14 sm:bottom-16 right-3 sm:right-6 z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-[9px] sm:text-[10px] font-hud text-zinc-400 uppercase tracking-widest shadow-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-ping" />
            <span>DRAG OR SWIPE TO ROTATE GAME PREVIEW</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TOP HEADER: Safe-Area Compliant Top Bar
          Left: Golden Mosque Emblem + "BARAKA CITY"
          Right: "FAITH • KNOWLEDGE • COMMUNITY • FUTURE" & Audio Toggle
          ===================================================================== */}
      <header className="relative z-30 pt-[max(env(safe-area-inset-top),0.75rem)] px-3 xs:px-5 sm:px-8 pb-2 flex items-center justify-between shrink-0 bg-black/60 md:bg-black/40 backdrop-blur-md border-b border-white/10 pointer-events-auto">
        {/* Left: Golden Mosque Arch Icon + "BARAKA CITY" */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300 flex items-center justify-center shrink-0">
            <svg
              viewBox="0 0 40 40"
              className="w-full h-full fill-none stroke-amber-300 stroke-[2.2] drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
            >
              <path d="M 6 36 L 6 18 C 6 11 13 5 20 5 C 27 5 34 11 34 18 L 34 36" />
              <path d="M 12 36 L 12 22 C 12 17 16 13 20 13 C 24 13 28 17 28 22 L 28 36" />
              <circle cx="20" cy="5" r="1.5" className="fill-amber-300" />
            </svg>
          </div>
          <span className="font-sora font-extrabold tracking-[0.2em] uppercase text-white text-[clamp(0.72rem,1.2vw,0.9rem)] leading-none drop-shadow">
            BARAKA CITY
          </span>
        </div>

        {/* Right: "FAITH • KNOWLEDGE • COMMUNITY • FUTURE" & Audio Toggle */}
        <div className="flex items-center gap-3 sm:gap-5">
          <nav className="hidden sm:flex items-center gap-2.5 text-[clamp(0.65rem,1vw,0.78rem)] font-hud text-amber-200/90 font-medium tracking-[0.22em] uppercase">
            <span>FAITH</span>
            <span className="text-amber-400/50">•</span>
            <span>KNOWLEDGE</span>
            <span className="text-amber-400/50">•</span>
            <span>COMMUNITY</span>
            <span className="text-amber-400/50">•</span>
            <span>FUTURE</span>
          </nav>

          {/* Audio Synthesizer Toggle */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className="p-1 sm:p-1.5 rounded-lg bg-black/60 border border-white/10 hover:border-amber-400/50 text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer flex items-center gap-1.5"
            title="Toggle Audio"
            aria-label="Toggle Audio"
          >
            {isAudioEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </button>
        </div>
      </header>

      {/* =====================================================================
          CENTERPIECE: 
          1. Letter drop animation (B-A-R-A-K-A, then CITY, emblem & tagline)
          3. Stepped Loader (15%, 45%, 75%, 100%)
          4. Circular Enter Button with rolling gold ring in loader's spot
          Boundaries: Above background layer, 100% clickable and visible
          ===================================================================== */}
      <main className="relative z-30 flex-1 flex flex-col items-center justify-center px-4 max-w-full my-auto pointer-events-none">
        <div className="flex flex-col items-center text-center w-full max-w-2xl pointer-events-auto">
          {/* THE MONUMENTAL BARAKA CITY LOGOTYPE CONTAINER */}
          <div className="relative flex flex-col items-center select-none mb-3 sm:mb-5">
            {/* The Golden Mosque Emblem (Sits behind the 'k' and 'a' of baraka) */}
            <div
              className="logo-emblem absolute pointer-events-none select-none z-0"
              style={{
                top: '-20%',
                right: '5%',
                width: 'clamp(58px, 14vw, 130px)',
                height: 'clamp(58px, 14vw, 130px)',
                animation: 'emblemFadeIn 0.8s ease-out forwards',
                animationDelay: '900ms',
                opacity: 0,
              }}
            >
              <svg
                viewBox="0 0 120 120"
                className="w-full h-full fill-amber-400 drop-shadow-[0_0_16px_rgba(245,158,11,0.6)]"
              >
                {/* Central Grand Dome */}
                <path
                  d="M60 22 C60 16 60 12 60 8 C60 8 59 13 58 15 C52 24 40 38 40 54 C40 66 49 72 60 72 C71 72 80 66 80 54 C80 38 68 24 62 15 C61 13 60 8 60 8 Z"
                  fill="#fbbf24"
                  opacity="0.95"
                />
                <circle cx="60" cy="6" r="3.5" fill="#fef08a" />
                <rect x="44" y="68" width="32" height="18" fill="#d97706" opacity="0.9" />
                <path
                  d="M48 86 A4 6 0 0 1 56 86 Z M56 86 A4 6 0 0 1 64 86 Z M64 86 A4 6 0 0 1 72 86 Z"
                  fill="#92400e"
                />
                {/* Left Minaret */}
                <rect x="30" y="38" width="6" height="48" fill="#f59e0b" />
                <polygon points="33,26 29,38 37,38" fill="#fef08a" />
                <rect x="28" y="48" width="10" height="2" fill="#d97706" />
                <rect x="28" y="62" width="10" height="2" fill="#d97706" />
                {/* Right Minaret */}
                <rect x="84" y="38" width="6" height="48" fill="#f59e0b" />
                <polygon points="87,26 83,38 91,38" fill="#fef08a" />
                <rect x="82" y="48" width="10" height="2" fill="#d97706" />
                <rect x="82" y="62" width="10" height="2" fill="#d97706" />
              </svg>
            </div>

            {/* Row 1: Letters b-a-r-a-k-a (Letter drop bounce, 120ms between letters) */}
            <div className="relative z-10 flex items-center justify-center font-pricedown font-black text-white leading-[0.88] tracking-[-0.04em] text-[clamp(3.1rem,9.2vw,7.4rem)]">
              {['b', 'a', 'r', 'a', 'k', 'a'].map((letter, i) => (
                <span
                  key={i}
                  className="logo-letter inline-block drop-shadow-[0_5px_0_#000] filter"
                  style={{
                    WebkitTextStroke: 'clamp(2.5px, 0.4vw, 5px) #000',
                    paintOrder: 'stroke fill',
                    animation: 'letterDropBounce 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    animationDelay: `${i * 120}ms`,
                    opacity: 0,
                  }}
                >
                  {letter}
                </span>
              ))}
            </div>

            {/* Row 2: city (Drops in below it the same way) */}
            <div className="relative z-10 flex items-center justify-center font-pricedown font-black text-white leading-[0.88] tracking-[-0.04em] text-[clamp(3.1rem,9.2vw,7.4rem)] -mt-[0.16em]">
              <div
                className="logo-city inline-flex items-center drop-shadow-[0_5px_0_#000] filter"
                style={{
                  WebkitTextStroke: 'clamp(2.5px, 0.4vw, 5px) #000',
                  paintOrder: 'stroke fill',
                  animation: 'cityDropBounce 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                  animationDelay: '720ms',
                  opacity: 0,
                }}
              >
                {['c', 'i', 't', 'y'].map((char, idx) => (
                  <span key={idx} className="inline-block">
                    {char}
                  </span>
                ))}
              </div>
            </div>

            {/* Tagline: "More Than a Game" (Fades in) */}
            <div
              className="logo-tagline relative z-10 font-yellowtail text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] -mt-1 sm:-mt-2 select-none tracking-wide text-[clamp(1.15rem,3.2vw,2.3rem)] italic"
              style={{
                animation: 'taglineFadeIn 0.8s ease-out forwards',
                animationDelay: '1050ms',
                opacity: 0,
              }}
            >
              More Than a Game
            </div>
          </div>

          {/* LOADER (15%, 45%, 75%, 100%) VS CIRCULAR ENTER BUTTON */}
          <div className="w-full max-w-[280px] xs:max-w-[320px] sm:max-w-[380px] min-h-[96px] sm:min-h-[110px] flex flex-col items-center justify-center">
            {!isLoaded ? (
              /* STEP 3: "Loading Baraka City…" Stepped Loader Bar */
              <div className="w-full flex flex-col items-center animate-fadeIn">
                <span className="text-[clamp(0.65rem,1.1vw,0.8rem)] font-hud tracking-[0.25em] text-zinc-300 uppercase font-semibold mb-2 block">
                  LOADING BARAKA CITY...
                </span>

                {/* Progress Bar Track & Golden Stepped Fill */}
                <div className="w-full h-2.5 sm:h-3 bg-black/75 border border-white/20 rounded-full overflow-hidden p-[1px] shadow-inner backdrop-blur-md">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                    style={{ width: `${Math.min(100, Math.max(3, displayedProgress))}%` }}
                  />
                </div>

                {/* Percentage Display */}
                <span className="text-amber-300 font-hud text-xs sm:text-sm font-bold mt-1.5 tracking-wider">
                  {Math.round(displayedProgress)}%
                </span>
              </div>
            ) : (
              /* STEP 4: Circular ENTER Button with rolling gold ring in loader's spot */
              <div className="relative flex flex-col items-center justify-center animate-pop-scale-glow">
                <button
                  type="button"
                  onClick={handleEnterClick}
                  disabled={isEntering}
                  className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center cursor-pointer select-none transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.55),0_10px_30px_rgba(0,0,0,0.95)]"
                  title="Enter Baraka City Dashboard"
                  aria-label="Enter Baraka City Dashboard"
                >
                  {/* Rolling Gold Ring around Circular Button */}
                  <div className="absolute -inset-1.5 rounded-full animate-roll-gold-ring pointer-events-none p-[2px]">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="goldRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="25%" stopColor="#fef08a" />
                          <stop offset="50%" stopColor="#d97706" />
                          <stop offset="75%" stopColor="#fef08a" />
                          <stop offset="100%" stopColor="#f59e0b" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="50"
                        cy="50"
                        r="46"
                        fill="none"
                        stroke="url(#goldRingGradient)"
                        strokeWidth="3.5"
                        strokeDasharray="95 18 55 18"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Inner Button Disc (Fixed, text does not rotate) */}
                  <div className="relative w-full h-full rounded-full bg-gradient-to-b from-[#181c28] via-[#0d1018] to-[#08090e] border border-amber-400/40 flex flex-col items-center justify-center shadow-[inset_0_0_20px_rgba(245,158,11,0.25)] group-hover:border-amber-300 group-hover:shadow-[inset_0_0_25px_rgba(245,158,11,0.4)] transition-all">
                    {/* Top gloss highlight */}
                    <div className="absolute top-1 inset-x-3 h-5 rounded-full bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

                    {/* Tiny gold pulse dot */}
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24] mb-0.5 animate-pulse" />

                    {/* FIXED ENTER TEXT (DOES NOT ROTATE) */}
                    <span className="font-sora font-black text-sm sm:text-base tracking-[0.22em] text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] select-none">
                      {isEntering ? 'ENTERING' : 'ENTER'}
                    </span>

                    <span className="text-[7.5px] sm:text-[8.5px] font-hud text-amber-300/90 tracking-widest uppercase">
                      CITY
                    </span>
                  </div>
                </button>

                {/* Keyboard & Tap Helper */}
                <span className="mt-2 text-[9px] sm:text-[10px] font-hud text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 opacity-90 drop-shadow">
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[9px] border border-white/10">
                    ENTER ↵
                  </span>
                  <span className="bg-white/10 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[9px] border border-white/10">
                    SPACE
                  </span>
                  <span>OR TAP</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* =====================================================================
          BOTTOM FOOTER: "EXPLORE • LEARN • BUILD • BELONG"
          Safe-area compliant, clean & non-obstructive
          ===================================================================== */}
      <footer className="relative z-30 pb-[max(env(safe-area-inset-bottom),0.75rem)] px-4 sm:px-8 pt-2 flex items-center justify-center shrink-0 bg-black/60 md:bg-black/40 backdrop-blur-md border-t border-white/10 pointer-events-auto">
        <span className="text-[clamp(0.65rem,1.1vw,0.85rem)] font-hud text-zinc-400 tracking-[0.3em] uppercase text-center font-medium drop-shadow">
          EXPLORE &nbsp;•&nbsp; LEARN &nbsp;•&nbsp; BUILD &nbsp;•&nbsp; BELONG
        </span>
      </footer>

      {/* Smooth Cinematic World Transition Veil */}
      <div
        className={`fixed inset-0 z-50 bg-black pointer-events-none transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isEntering ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
