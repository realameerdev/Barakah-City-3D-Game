/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, MapPin, Compass, Users, Sparkles, Navigation } from 'lucide-react';

interface ExpandedWorldMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerX: number;
  playerZ: number;
  currentDistrict: string;
  onFastTravel?: (targetX: number, targetZ: number, districtName: string) => void;
}

const DISTRICT_ZONES = [
  { name: 'Grand Mosque & Mihrab Sanctuary', x: 0, z: -58, color: '#10b981', desc: 'Central congregational prayer hall, four towering minarets, and courtyard terrace.' },
  { name: 'Madrasa Quran Academy', x: -22, z: -42, color: '#14b8a6', desc: 'Historic manuscript library, low wooden study rihlas, and ethical debate colonnade.' },
  { name: 'Bayt Al-Hikma University', x: -48, z: -25, color: '#3b82f6', desc: 'Higher learning lecture amphitheater, scholarship podium, and academic symposiums.' },
  { name: 'Souq Al-Madina Marketplace', x: -28, z: 24, color: '#f59e0b', desc: 'Living merchant bazaar, spice stalls, community jobs, and sadaqah donation counters.' },
  { name: 'Baraka Football Arena', x: -45, z: 52, color: '#10b981', desc: 'Full regulation soccer pitch with floodlights, goal nets, and dynamic dribbling physics.' },
  { name: 'Central Boulevard & Esplanade', x: 0, z: 0, color: '#e2e8f0', desc: 'Broad four-lane avenue with autonomous traffic, palm promenades, and civic streetlamps.' },
  { name: 'Residential Quarter & Private Homes', x: 18, z: 18, color: '#a855f7', desc: 'Comfortable citizen apartments with private Moroccan divans, bedrooms, and gardens.' },
  { name: 'Public Park & Central Fountain', x: 32, z: -28, color: '#06b6d4', desc: 'Lush green lawns, stone water fountain, peaceful shaded pergolas, and park benches.' },
];

export default function ExpandedWorldMapModal({
  isOpen,
  onClose,
  playerX,
  playerZ,
  currentDistrict,
  onFastTravel,
}: ExpandedWorldMapModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn font-sora">
      <div className="bg-[#0e121b] border-2 border-emerald-500/50 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                BARAKA CITY · SATELLITE RADAR MAP
              </h3>
              <span className="text-[10px] font-hud text-emerald-400">
                LIVING 3D METROPOLIS · CURRENT DISTRICT: {currentDistrict.toUpperCase()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Holographic City Map Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Visual 2D Map Container */}
          <div className="relative w-full aspect-[16/10] bg-[#07090e] border border-white/10 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
            {/* Ambient Grid Lines */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
            
            {/* Main Road Cross Axes */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 bg-zinc-800/60 border-y border-white/10 flex items-center justify-center">
              <span className="text-[8px] font-hud text-zinc-500 tracking-widest uppercase">CENTRAL BOULEVARD (EAST - WEST)</span>
            </div>
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-zinc-800/60 border-x border-white/10 flex items-center justify-center">
              <span className="text-[8px] font-hud text-zinc-500 tracking-widest uppercase [writing-mode:vertical-lr] rotate-180">NORTH - SOUTH PROMENADE</span>
            </div>

            {/* Landmark Markers on 2D map */}
            {DISTRICT_ZONES.map((dist) => {
              // Map world coords [-90, 90] to percentage [5%, 95%]
              const posX = 50 + (dist.x / 110) * 45;
              const posZ = 50 + (dist.z / 110) * 45;

              return (
                <div
                  key={dist.name}
                  style={{ left: `${posX}%`, top: `${posZ}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                  onClick={() => {
                    onFastTravel?.(dist.x, dist.z, dist.name);
                    onClose();
                  }}
                >
                  <div
                    style={{ backgroundColor: dist.color }}
                    className="w-4 h-4 rounded-full border-2 border-white shadow-lg group-hover:scale-125 transition-transform flex items-center justify-center"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-black/70" />
                  </div>
                  <span className="mt-1 px-1.5 py-0.5 rounded bg-black/80 border border-white/10 text-[9px] font-bold uppercase whitespace-nowrap text-zinc-200 group-hover:text-emerald-300">
                    {dist.name.split(' ')[0]}
                  </span>
                </div>
              );
            })}

            {/* Current Player Indicator */}
            {(() => {
              const pLeft = 50 + (playerX / 110) * 45;
              const pTop = 50 + (playerZ / 110) * 45;
              return (
                <div
                  style={{ left: `${pLeft}%`, top: `${pTop}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-20"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/30 border-2 border-emerald-400 animate-ping absolute" />
                  <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg">
                    <Navigation className="w-2.5 h-2.5 text-black" />
                  </div>
                  <span className="mt-1 px-2 py-0.5 rounded-full bg-emerald-500 text-black font-black text-[8px] uppercase tracking-wider shadow">
                    YOU ARE HERE
                  </span>
                </div>
              );
            })()}
          </div>

          {/* District Directory & Fast Wayfinding */}
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-emerald-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> DISTRICT DIRECTORY & FAST WAYFINDING
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DISTRICT_ZONES.map((dist) => (
                <div
                  key={dist.name}
                  className="p-3 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-between gap-3 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dist.color }} />
                      <span className="text-xs font-bold text-white uppercase truncate">{dist.name}</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate mt-0.5">{dist.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      onFastTravel?.(dist.x, dist.z, dist.name);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer shrink-0 active:scale-95 shadow"
                  >
                    GO TO
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
