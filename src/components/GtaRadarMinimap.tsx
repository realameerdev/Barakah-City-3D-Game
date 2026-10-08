/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { Compass, MapPin, Maximize2 } from 'lucide-react';

interface LandmarkBlip {
  name: string;
  x: number;
  z: number;
  color: string;
  type: 'mosque' | 'souq' | 'uni' | 'madrasa' | 'pitch' | 'home' | 'park';
}

const CITY_LANDMARKS: LandmarkBlip[] = [
  { name: 'Grand Mosque', x: 0, z: -58, color: '#10b981', type: 'mosque' },
  { name: 'Souq Al-Madina', x: -28, z: 24, color: '#f59e0b', type: 'souq' },
  { name: 'Bayt Al-Hikma Uni', x: -48, z: -25, color: '#3b82f6', type: 'uni' },
  { name: 'Madrasa Academy', x: -22, z: -42, color: '#14b8a6', type: 'madrasa' },
  { name: 'Football Arena', x: -45, z: 52, color: '#10b981', type: 'pitch' },
  { name: 'Private Residence', x: 18, z: 18, color: '#a855f7', type: 'home' },
  { name: 'Public Park Fountain', x: 32, z: -28, color: '#06b6d4', type: 'park' },
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
}: GtaRadarMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radarRadius = center - 8;
    const scale = radarRadius / 55; // 55m radius in world space

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
  }, [playerX, playerZ, playerRotation, otherPlayers, vehicles]);

  const radarDimension = isMobile ? 104 : 124;

  return (
    <div className="flex flex-col items-start select-none pointer-events-auto">
      {/* Radar Screen Box */}
      <div
        onClick={onExpandMap}
        className="relative group cursor-pointer bg-black/75 rounded-full p-1 border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.85)] hover:border-emerald-500/60 transition-all backdrop-blur-md"
        title="Tap to Expand Full Baraka City World Map"
      >
        <canvas
          ref={canvasRef}
          width={radarDimension * 2}
          height={radarDimension * 2}
          style={{ width: `${radarDimension}px`, height: `${radarDimension}px` }}
          className="rounded-full block"
        />

        {/* Hover / Touch Expand Icon Badge */}
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
          <Maximize2 className="w-5 h-5 text-emerald-400 drop-shadow" />
        </div>
      </div>

      {/* GTA-Style District Banner & Dual Vitality / Stamina Gauges */}
      <div className={`mt-1.5 flex flex-col bg-black/80 border border-white/10 backdrop-blur-md rounded-xl p-1.5 shadow-2xl ${isMobile ? 'w-[104px]' : 'w-[124px]'}`}>
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
