/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sliders, Zap, Footprints, Armchair, UserCheck, Compass,
  Hand, User, MessageSquare, Smile, X, ChevronUp, ChevronDown
} from 'lucide-react';
import { ActionType, ExpressionType } from '../game/ThreeGameWorld';

interface GtaActionControlsProps {
  onInteract: () => void;
  onWalk: () => void;
  onRun: () => void;
  onSit: () => void;
  onStand: () => void;
  onPray: () => void;
  onWave: () => void;
  onGreet: () => void;
  onTalk: () => void;
  onLaugh: () => void;
  onSelectExpression: (expr: ExpressionType) => void;
  currentAction: ActionType;
  isRunMode: boolean;
  isSitting: boolean;
  isPraying: boolean;
  currentExpression: ExpressionType;
  isMobile?: boolean;
  isPortrait?: boolean;
}

export default function GtaActionControls({
  onInteract,
  onWalk,
  onRun,
  onSit,
  onStand,
  onPray,
  onWave,
  onGreet,
  onTalk,
  onLaugh,
  onSelectExpression,
  currentAction,
  isRunMode,
  isSitting,
  isPraying,
  currentExpression,
  isMobile = false,
  isPortrait = false,
}: GtaActionControlsProps) {
  const [isWheelOpen, setIsWheelOpen] = useState(false);
  const [isExpressionsOpen, setIsExpressionsOpen] = useState(false);

  const expressionsList: ExpressionType[] = [
    'Neutral', 'Happy', 'Smile', 'Laugh', 'Calm', 'Sad', 'Angry', 'Surprised'
  ];

  const socialEmotes = [
    { id: 'wave', label: 'Wave', icon: Hand, handler: onWave, isActive: currentAction === 'wave' },
    { id: 'greet', label: 'Greet', icon: User, handler: onGreet, isActive: currentAction === 'greet' },
    { id: 'talk', label: 'Talk', icon: MessageSquare, handler: onTalk, isActive: currentAction === 'talk' },
    { id: 'laugh', label: 'Laugh', icon: Smile, handler: onLaugh, isActive: currentAction === 'laugh' },
    { id: 'pray', label: 'Pray', icon: Compass, handler: onPray, isActive: isPraying },
  ];

  const movementPostures = [
    { id: 'walk', label: 'Walk', icon: Footprints, handler: onWalk, isActive: !isRunMode && currentAction === 'walk' },
    { id: 'run', label: 'Sprint', icon: Zap, handler: onRun, isActive: isRunMode || currentAction === 'run' },
    { id: 'sit', label: 'Sit', icon: Armchair, handler: onSit, isActive: isSitting },
    { id: 'stand', label: 'Stand', icon: UserCheck, handler: onStand, isActive: !isSitting && !isPraying && currentAction === 'idle' },
  ];

  return (
    <div className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] right-[max(env(safe-area-inset-right),1rem)] z-30 pointer-events-auto select-none font-sora">
      
      {/* ========================================================================= */}
      {/* 1. EXPANDED CREATIVE ACTION WHEEL / CONSOLE MODAL                          */}
      {/* ========================================================================= */}
      {isWheelOpen && (
        <div className="absolute bottom-16 sm:bottom-20 right-0 w-[290px] xs:w-[320px] sm:w-[360px] bg-[#0d121c]/95 border-2 border-emerald-500/50 rounded-3xl p-3 sm:p-4 shadow-[0_12px_45px_rgba(0,0,0,0.85)] backdrop-blur-2xl animate-fadeIn space-y-3 z-40">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Smile className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase text-white tracking-wider block">
                  ACTION & EMOTE HUB
                </span>
                <span className="text-[8px] font-hud text-emerald-400 uppercase tracking-widest block">
                  CHARACTER EMOTES · POSTURE
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsWheelOpen(false)}
              className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close Action Hub"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Category A: Social Gestures & Emotes */}
          <div>
            <span className="text-[9px] font-hud text-zinc-400 uppercase tracking-wider block mb-1.5 font-bold">
              SOCIAL GESTURES & WORSHIP
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {socialEmotes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.handler();
                      // Keep open or give quick visual feedback
                    }}
                    className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 cursor-pointer ${
                      item.isActive
                        ? 'bg-emerald-500 border-emerald-400 text-black font-extrabold shadow-lg shadow-emerald-500/30'
                        : 'bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:border-emerald-500/40'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[8px] font-bold uppercase tracking-tight truncate max-w-[48px]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category B: Movement Stance & Postures */}
          <div>
            <span className="text-[9px] font-hud text-zinc-400 uppercase tracking-wider block mb-1.5 font-bold">
              MOVEMENT & POSTURE
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {movementPostures.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.handler();
                    }}
                    className={`py-2 px-1.5 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 cursor-pointer ${
                      item.isActive
                        ? 'bg-emerald-500 border-emerald-400 text-black font-extrabold shadow-lg shadow-emerald-500/30'
                        : 'bg-black/50 border-white/10 text-zinc-300 hover:text-white hover:border-emerald-500/40'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-[8px] font-bold uppercase tracking-tight truncate max-w-[55px]">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category C: Facial Expression Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-hud text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1">
                <Smile className="w-3 h-3" /> FACIAL EXPRESSION ({currentExpression.toUpperCase()})
              </span>
              <button
                onClick={() => setIsExpressionsOpen(!isExpressionsOpen)}
                className="text-[8px] font-hud text-zinc-400 hover:text-white underline cursor-pointer"
              >
                {isExpressionsOpen ? 'COLLAPSE' : 'EXPAND'}
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {(isExpressionsOpen ? expressionsList : expressionsList.slice(0, 4)).map((expr) => (
                <button
                  key={expr}
                  onClick={() => onSelectExpression(expr)}
                  className={`py-1.5 px-1 rounded-lg text-[8.5px] font-bold uppercase tracking-tight transition-all cursor-pointer truncate ${
                    currentExpression === expr
                      ? 'bg-amber-400 border border-amber-300 text-black font-black shadow-md'
                      : 'bg-black/40 border border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  {expr}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ERGONOMIC COMPACT ACTION POD (CLEAN, UNCLUTTERED, NON-SCATTERED)        */}
      {/* ========================================================================= */}
      <div className="flex items-end gap-2 sm:gap-2.5">
        
        {/* Quick Stance & Movement Mini-Cluster */}
        <div className="flex flex-col items-end gap-1.5 sm:gap-2">
          
          {/* Top Row: Emotes Trigger + Pray */}
          <div className="flex items-center gap-1.5">
            {/* Actions & Emotes Hub Toggle Button */}
            <button
              onClick={() => setIsWheelOpen(!isWheelOpen)}
              className={`h-9 px-2.5 sm:px-3 rounded-2xl flex items-center gap-1.5 border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                isWheelOpen
                  ? 'bg-amber-400 border-amber-300 text-black font-black ring-2 ring-amber-400/40'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400 hover:text-white'
              }`}
              title="Open Actions & Emotes Wheel [Emotes, Gestures, Expressions]"
            >
              <Smile className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                ACTIONS
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            {/* Pray Quick Button */}
            <button
              onClick={onPray}
              className={`w-9 h-9 rounded-2xl flex items-center justify-center border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                isPraying
                  ? 'bg-emerald-500 border-emerald-400 text-black font-bold ring-2 ring-emerald-400/50'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400'
              }`}
              title="Sanctuary Prayer & Remembrance [Key P]"
            >
              <Compass className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Bottom Row: Sprint/Walk + Sit/Stand */}
          <div className="flex items-center gap-1.5">
            {/* Smart Sit / Stand Toggle */}
            <button
              onClick={isSitting ? onStand : onSit}
              className={`h-9 px-2.5 rounded-2xl flex items-center gap-1.5 border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                isSitting
                  ? 'bg-emerald-500 border-emerald-400 text-black font-bold'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400'
              }`}
              title={isSitting ? 'Stand Up' : 'Sit on nearest bench or carpet'}
            >
              {isSitting ? <UserCheck className="w-3.5 h-3.5" /> : <Armchair className="w-3.5 h-3.5" />}
              <span className="text-[9px] font-black uppercase tracking-wider">
                {isSitting ? 'STAND' : 'SIT'}
              </span>
            </button>

            {/* Sprint / Walk Mode Toggle */}
            <button
              onClick={isRunMode ? onWalk : onRun}
              className={`h-9 px-2.5 rounded-2xl flex items-center gap-1.5 border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                isRunMode
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 border-emerald-300 text-black font-black ring-2 ring-emerald-400/40 shadow-emerald-500/20'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400'
              }`}
              title="Toggle Sprint / Walk [Shift]"
            >
              <Zap className={`w-3.5 h-3.5 ${isRunMode ? 'text-black' : 'text-amber-400'}`} />
              <span className="text-[9px] font-black uppercase tracking-wider">
                {isRunMode ? 'SPRINT' : 'WALK'}
              </span>
            </button>
          </div>
        </div>

        {/* HERO INTERACT BUTTON (Primary GTA action centerpiece) */}
        <button
          onClick={onInteract}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex flex-col items-center justify-center shadow-[0_4px_25px_rgba(16,185,129,0.5)] border-2 border-white active:scale-90 transition-all cursor-pointer group shrink-0"
          title="Interact with landmarks, shops, vehicles, and residents [Key E]"
        >
          <Sliders className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tighter mt-0.5 font-hud">
            INTERACT
          </span>
        </button>

      </div>
    </div>
  );
}
