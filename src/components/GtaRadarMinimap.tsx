/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Compass, MapPin, Maximize2, GripHorizontal, RotateCcw, Plus, Minus, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface LandmarkBlip {
  name: string;
  x: number;
  z: number;
  color: string;
  type: 'mosque' | 'souq' | 'uni' | 'madrasa' | 'pitch' | 'home' | 'park' | 'school' | 'marina' | 'garden';
}

const CITY_LANDMARKS: LandmarkBlip[] = [
  // Global Cities & Historic Metropolises
  { name: 'Abuja Capital', x: 0, z: 0, color: '#10b981', type: 'mosque' },
  { name: 'Lagos Coastal City', x: -175, z: 65, color: '#38bdf8', type: 'marina' },
  { name: 'Kwara Cultural Citadel', x: 55, z: 85, color: '#f59e0b', type: 'souq' },
  { name: 'Makkah Sanctuary', x: 0, z: -85, color: '#fbbf24', type: 'mosque' },
  { name: 'Al-Madinah Oasis', x: -130, z: 90, color: '#10b981', type: 'garden' },
  { name: 'Cairo Citadel', x: 110, z: 120, color: '#eab308', type: 'mosque' },
  { name: 'Istanbul Bosphorus', x: 120, z: -125, color: '#ec4899', type: 'marina' },
  { name: 'Samarkand Silk Road', x: -150, z: -85, color: '#06b6d4', type: 'uni' },
  { name: 'Zanzibar Stone Town', x: -175, z: -60, color: '#14b8a6', type: 'marina' },
  { name: 'Muscat Gulf Citadel', x: 150, z: 80, color: '#8b5cf6', type: 'home' },
  { name: 'Fez Ancient Medina', x: -75, z: -150, color: '#047857', type: 'mosque' },
  { name: 'Cordoba Great Mosque', x: 75, z: -55, color: '#10b981', type: 'mosque' },
  { name: 'Baghdad Round City', x: -135, z: -35, color: '#0284c7', type: 'uni' },
  { name: 'Kano Ancient City', x: 2, z: 22, color: '#f59e0b', type: 'souq' },
  { name: 'Dakar Atlantic Coast', x: 25, z: -165, color: '#06b6d4', type: 'marina' },
  { name: 'Bukhara Silk Citadel', x: 135, z: 35, color: '#d97706', type: 'school' },
  { name: 'Jerusalem Al-Quds', x: -80, z: 0, color: '#eab308', type: 'mosque' },
  { name: 'Kuala Lumpur City', x: -80, z: -65, color: '#a855f7', type: 'garden' },

  // Masajids (Mosques)
  { name: 'Grand Mosque', x: 0, z: -58, color: '#10b981', type: 'mosque' },
  { name: 'Al-Andalus East Masjid', x: 130, z: -60, color: '#059669', type: 'mosque' },
  { name: 'Al-Madinah Oasis Masjid', x: -130, z: 90, color: '#10b981', type: 'mosque' },
  { name: 'Al-Qarawiyyin Masjid', x: -110, z: -110, color: '#047857', type: 'mosque' },
  { name: 'Sultan Baybars South Masjid', x: 110, z: 120, color: '#10b981', type: 'mosque' },

  // Schools, Academies & Universities
  { name: 'Bayt Al-Hikma Uni', x: -48, z: -25, color: '#3b82f6', type: 'uni' },
  { name: 'Madrasa Quran Academy', x: -22, z: -42, color: '#14b8a6', type: 'madrasa' },
  { name: 'Ibn Sina Medical School', x: 140, z: 40, color: '#2563eb', type: 'school' },
  { name: 'Al-Khwarizmi Astronomy Academy', x: -140, z: -40, color: '#0284c7', type: 'school' },
  { name: 'Al-Zahra Youth Academy', x: -70, z: 140, color: '#06b6d4', type: 'school' },
  { name: 'Dar Al-Quran Conservatory', x: 70, z: -130, color: '#0d9488', type: 'school' },

  // Community & Landmarks
  { name: 'Souq Al-Madina Bazaar', x: -28, z: 24, color: '#f59e0b', type: 'souq' },
  { name: 'Football Arena', x: -45, z: 52, color: '#10b981', type: 'pitch' },
  { name: 'Private Residence', x: 18, z: 18, color: '#a855f7', type: 'home' },
  { name: 'Public Park Fountain', x: 32, z: -28, color: '#06b6d4', type: 'park' },
  { name: 'Oasis Botanical Gardens', x: 150, z: -130, color: '#10b981', type: 'garden' },
  { name: 'Grand Marina Harbor', x: -160, z: 0, color: '#38bdf8', type: 'marina' },
];

interface GtaRadarMinimapProps {
  playerX: number;
  playerZ: number;
  playerRotation: number;
  currentDistrict: string;
  stamina: number; // 0 - 100
  health?: number; // 0 - 100
  otherPlayers?: Array<{ id: string; name: string; x: number; z: number }>;
  vehicles?: Array<{ id: string; x: number; z: number }>;
  onExpandMap?: () => void;
  isMobile?: boolean;
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void;
  hasCustomPosition?: boolean;
  onResetPosition?: () => void;
  mapScale?: number;
  onScaleChange?: (scale: number) => void;
  radarZoom?: number;
  onRadarZoomChange?: (zoom: number) => void;
}

export default function GtaRadarMinimap({
  playerX,
  playerZ,
  playerRotation,
  currentDistrict,
  stamina,
  health = 100,
  otherPlayers = [],
  vehicles = [],
  onExpandMap,
  isMobile = false,
  onDragStart,
  hasCustomPosition = false,
  onResetPosition,
  mapScale = 1.0,
  onScaleChange,
  radarZoom = 1.0,
  onRadarZoomChange,
}: GtaRadarMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Local state for long press dragging detection directly on map
  const longPressTimerRef = useRef<number | null>(null);
  const [isPressDragging, setIsPressDragging] = useState(false);
  const pressStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);

  const currentMapScale = mapScale;
  const currentRadarZoom = radarZoom;

  const handleEnlargeMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = Math.min(1.6, Math.round((currentMapScale + 0.2) * 10) / 10);
    onScaleChange?.(next);
  };

  const handleReduceMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = Math.max(0.7, Math.round((currentMapScale - 0.2) * 10) / 10);
    onScaleChange?.(next);
  };

  const handleToggleRadarZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycle zoom between 1.0x (normal), 1.5x (zoomed in detail), 0.7x (zoomed out wide)
    const next = currentRadarZoom === 1.0 ? 1.5 : currentRadarZoom === 1.5 ? 0.7 : 1.0;
    onRadarZoomChange?.(next);
  };

  // Direct Long-Press on Map to initiate Dragging
  const handleMapPressStart = (e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    pressStartPosRef.current = { x: clientX, y: clientY };
    hasMovedRef.current = false;

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    // 240ms long-press initiates drag mode directly from touching the map
    longPressTimerRef.current = window.setTimeout(() => {
      setIsPressDragging(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35);
      }
      onDragStart?.(e);
    }, 240);
  };

  const handleMapPressMove = (e: React.MouseEvent | React.TouchEvent) => {
    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const dist = Math.hypot(clientX - pressStartPosRef.current.x, clientY - pressStartPosRef.current.y);
    if (dist > 8) {
      hasMovedRef.current = true;
    }
  };

  const handleMapPressEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isPressDragging) {
      setIsPressDragging(false);
      return;
    }

    // If it was a quick click without long-press or drag:
    if (!hasMovedRef.current) {
      // Toggle map enlargement/zoom
      if (currentMapScale < 1.4) {
        onScaleChange?.(Math.round((currentMapScale + 0.25) * 100) / 100);
      } else {
        onScaleChange?.(0.85);
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radarRadius = center - 8;
    const scale = (radarRadius / 55) * currentRadarZoom; // Adjust scale by radar zoom factor

    // Clear
    ctx.clearRect(0, 0, size, size);

    // 1. Radar Circular Clipped Region
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radarRadius, 0, Math.PI * 2);
    ctx.clip();

    // Radar Dark Glass Background with faint grid
    const bgGrad = ctx.createRadialGradient(center, center, 10, center, center, radarRadius);
    bgGrad.addColorStop(0, '#0c111d');
    bgGrad.addColorStop(0.75, '#070a12');
    bgGrad.addColorStop(1, '#030509');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, size, size);

    // Subtle Range Rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    [0.33, 0.66, 1.0].forEach((rRatio) => {
      ctx.beginPath();
      ctx.arc(center, center, radarRadius * rRatio, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(center, center - radarRadius);
    ctx.lineTo(center, center + radarRadius);
    ctx.moveTo(center - radarRadius, center);
    ctx.lineTo(center + radarRadius, center);
    ctx.stroke();

    // 2. Render World Coordinate Roads & Blocks relative to Player
    ctx.save();
    // Offset context so player is at (center, center)
    ctx.translate(center, center);

    // Draw Main Roads relative to player
    ctx.lineWidth = 10 * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';

    // East-West Main Boulevard (z = 0 in world)
    const relEWRoadY = (0 - playerZ) * scale;
    ctx.beginPath();
    ctx.moveTo(-radarRadius * 1.5, relEWRoadY);
    ctx.lineTo(radarRadius * 1.5, relEWRoadY);
    ctx.stroke();

    // North-South Main Boulevard (x = 0 in world)
    const relNSRoadX = (0 - playerX) * scale;
    ctx.beginPath();
    ctx.moveTo(relNSRoadX, -radarRadius * 1.5);
    ctx.lineTo(relNSRoadX, radarRadius * 1.5);
    ctx.stroke();

    // Secondary Cross Streets
    ctx.lineWidth = 6 * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';

    // Grand Mosque Plaza ring
    const relMosqueX = (0 - playerX) * scale;
    const relMosqueZ = (-58 - playerZ) * scale;
    ctx.beginPath();
    ctx.arc(relMosqueX, relMosqueZ, 16 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Render Landmark Blips
    CITY_LANDMARKS.forEach((lm) => {
      const relX = (lm.x - playerX) * scale;
      const relZ = (lm.z - playerZ) * scale;
      const dist = Math.hypot(relX, relZ);

      // Clamp to edge if outside radius
      let drawX = relX;
      let drawZ = relZ;
      if (dist > radarRadius - 8) {
        const angle = Math.atan2(relZ, relX);
        drawX = Math.cos(angle) * (radarRadius - 10);
        drawZ = Math.sin(angle) * (radarRadius - 10);
      }

      ctx.beginPath();
      ctx.arc(drawX, drawZ, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = lm.color;
      ctx.shadowColor = lm.color;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 4. Render Traffic Vehicles
    vehicles.forEach((v) => {
      const relX = (v.x - playerX) * scale;
      const relZ = (v.z - playerZ) * scale;
      if (Math.hypot(relX, relZ) < radarRadius) {
        ctx.beginPath();
        ctx.arc(relX, relZ, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24'; // Amber vehicle blip
        ctx.fill();
      }
    });

    // 5. Render Other Players
    otherPlayers.forEach((p) => {
      const relX = (p.x - playerX) * scale;
      const relZ = (p.z - playerZ) * scale;
      if (Math.hypot(relX, relZ) < radarRadius) {
        ctx.beginPath();
        ctx.arc(relX, relZ, 3.0, 0, Math.PI * 2);
        ctx.fillStyle = '#34d399'; // Emerald online citizen blip
        ctx.fill();
      }
    });

    ctx.restore(); // Restore world offset

    // 6. Draw Player Marker (Central Emerald Directional Arrow)
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-playerRotation); // Orient arrow with character yaw

    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(0, 2.5);
    ctx.lineTo(-5, 5);
    ctx.closePath();

    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.restore(); // Restore radar clip

    // 7. Outer Glass Bezel Ring
    ctx.beginPath();
    ctx.arc(center, center, radarRadius, 0, Math.PI * 2);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.stroke();

    // North Indicator at top of bezel
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', center, 6);
  }, [playerX, playerZ, playerRotation, otherPlayers, vehicles, currentRadarZoom]);

  const radarDimension = Math.round((isMobile ? 104 : 124) * currentMapScale);

  return (
    <div 
      className={`flex flex-col items-start select-none pointer-events-auto transition-transform duration-75 relative ${
        isPressDragging ? 'scale-105 opacity-95' : ''
      }`}
    >
      {/* Active Drag Indicator Banner */}
      {isPressDragging && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-cyan-400 text-black px-2 py-0.5 rounded-full text-[8px] font-black font-hud uppercase tracking-wider shadow-[0_0_15px_rgba(34,211,238,0.9)] animate-pulse flex items-center gap-1">
          <Move className="w-2.5 h-2.5" />
          <span>DRAGGING MAP · DROP TO PLACE</span>
        </div>
      )}

      {/* Map Control Bar (Enlarge, Reduce, Zoom & Drag) */}
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{ width: `${radarDimension}px` }}
        className="flex items-center justify-between px-2 py-1 mb-1 bg-black/85 hover:bg-black/95 rounded-xl border border-white/15 cursor-grab active:cursor-grabbing backdrop-blur-md shadow-lg transition-all group"
        title="Hold & drag anywhere on map to move it, or tap buttons to resize"
      >
        <div className="flex items-center gap-1">
          <GripHorizontal className="w-3 h-3 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span className="text-[7.5px] font-black uppercase text-zinc-300 tracking-wider">
            {Math.round(currentMapScale * 100)}%
          </span>
        </div>

        {/* Map Size & Zoom Buttons */}
        <div className="flex items-center gap-1">
          {/* Reduce Size Button */}
          <button
            type="button"
            onClick={handleReduceMap}
            className="w-4 h-4 rounded bg-white/10 hover:bg-rose-500 hover:text-white text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
            title="Reduce Map Size (-)"
          >
            <Minus className="w-2.5 h-2.5" />
          </button>

          {/* Enlarge Size Button */}
          <button
            type="button"
            onClick={handleEnlargeMap}
            className="w-4 h-4 rounded bg-white/10 hover:bg-emerald-500 hover:text-black text-zinc-300 flex items-center justify-center transition-colors cursor-pointer"
            title="Enlarge Map Size (+)"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>

          {/* Radar Terrain Zoom Button */}
          <button
            type="button"
            onClick={handleToggleRadarZoom}
            className={`w-4 h-4 rounded flex items-center justify-center transition-colors cursor-pointer ${
              currentRadarZoom !== 1.0 ? 'bg-cyan-400 text-black font-black' : 'bg-white/10 text-zinc-300 hover:bg-white/20'
            }`}
            title={`Radar Range Zoom: ${currentRadarZoom}x (Click to cycle)`}
          >
            {currentRadarZoom >= 1.5 ? (
              <ZoomIn className="w-2.5 h-2.5" />
            ) : currentRadarZoom < 1.0 ? (
              <ZoomOut className="w-2.5 h-2.5" />
            ) : (
              <Compass className="w-2.5 h-2.5" />
            )}
          </button>

          {hasCustomPosition && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onResetPosition?.();
              }}
              className="text-[7px] font-black px-1 py-0.5 bg-white/10 hover:bg-emerald-500 hover:text-black rounded text-zinc-300 transition-colors uppercase flex items-center gap-0.5 cursor-pointer ml-0.5"
              title="Reset Radar Map back to default corner position"
            >
              <RotateCcw className="w-2 h-2" />
            </button>
          )}
        </div>
      </div>

      {/* Radar Screen Box (Direct Long-Press to Drag or Click to Enlarge/Zoom) */}
      <div
        onMouseDown={handleMapPressStart}
        onTouchStart={handleMapPressStart}
        onMouseMove={handleMapPressMove}
        onTouchMove={handleMapPressMove}
        onMouseUp={handleMapPressEnd}
        onTouchEnd={handleMapPressEnd}
        className={`relative group cursor-grab active:cursor-grabbing bg-black/85 rounded-full p-1 border shadow-[0_4px_24px_rgba(0,0,0,0.85)] transition-all backdrop-blur-md ${
          isPressDragging 
            ? 'border-cyan-400 ring-4 ring-cyan-400/60 shadow-[0_0_30px_rgba(34,211,238,0.8)]' 
            : 'border-white/15 hover:border-emerald-500/70'
        }`}
        title="Long-press & drag to move map anywhere. Click to enlarge or toggle zoom."
      >
        <canvas
          ref={canvasRef}
          width={radarDimension * 2}
          height={radarDimension * 2}
          style={{ width: `${radarDimension}px`, height: `${radarDimension}px` }}
          className="rounded-full block pointer-events-none"
        />

        {/* Hover / Touch Expand Icon Badge */}
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
          <Maximize2 className="w-5 h-5 text-emerald-400 drop-shadow" />
        </div>
      </div>

      {/* GTA-Style District Banner & Dual Vitality / Stamina Gauges */}
      <div 
        style={{ width: `${radarDimension}px` }}
        className="mt-1.5 flex flex-col bg-black/80 border border-white/10 backdrop-blur-md rounded-xl p-1.5 shadow-2xl transition-all"
      >
        {/* District Name */}
        <div className="flex items-center gap-1 mb-1 truncate">
          <MapPin className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
          <span className="text-[8px] font-hud text-white font-bold uppercase truncate tracking-wider">
            {currentDistrict}
          </span>
        </div>

        {/* Dual Gauges: Vitality (Health) & Stamina (Sprint) */}
        <div className="space-y-1">
          {/* Health Gauge (GTA Green Bar) */}
          <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-white/10 p-[0.5px]">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-150 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
              style={{ width: `${Math.max(0, Math.min(100, health))}%` }}
            />
          </div>

          {/* Stamina Gauge (GTA Blue/Cyan Bar) */}
          <div className="w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-white/10 p-[0.5px]">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-150 shadow-[0_0_6px_rgba(6,182,212,0.7)]"
              style={{ width: `${Math.max(0, Math.min(100, stamina))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
