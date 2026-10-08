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
        <>
          {/* Mobile backdrop to dismiss cleanly when tapping outside */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 sm:hidden"
            onClick={() => setIsWheelOpen(false)}
          />

          {/* Modal Container: On mobile, fixed bottom-sheet centered/inset with max z-index (z-50) so it's NEVER covered by any card or minimap; On sm+, docked sleek flyout above buttons */}
          <div className="fixed sm:absolute bottom-3 sm:bottom-16 left-3 right-3 sm:left-auto sm:right-0 sm:w-[360px] max-w-sm sm:max-w-none mx-auto sm:mx-0 bg-[#0d121c]/98 border-2 border-emerald-500/70 rounded-3xl p-3.5 sm:p-4 shadow-[0_16px_50px_rgba(0,0,0,0.95)] backdrop-blur-2xl animate-fadeIn space-y-3 z-50 max-h-[82vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Smile className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-black uppercase text-white tracking-wider block">
                    ACTION & EMOTE HUB
                  </span>
                  <span className="text-[8px] font-hud text-emerald-400 uppercase tracking-widest block font-bold">
                    CHARACTER EMOTES · POSTURE
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsWheelOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
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
                      }}
                      className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all active:scale-95 cursor-pointer ${
                        item.isActive
                          ? 'bg-emerald-500 border-emerald-400 text-black font-extrabold shadow-lg shadow-emerald-500/30'
                          : 'bg-black/60 border-white/10 text-zinc-300 hover:text-white hover:border-emerald-500/40'
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
                          : 'bg-black/60 border-white/10 text-zinc-300 hover:text-white hover:border-emerald-500/40'
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
                        : 'bg-black/50 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {expr}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. ERGONOMIC COMPACT ACTION POD (WITH WALK, RUN, SIT, STAND, PRAY, INTERACT OUTSIDE) */}
      {/* ========================================================================= */}
      <div className="flex items-end gap-1.5 sm:gap-2.5">
        
        {/* Quick Stance & Movement Cluster */}
        <div className="flex flex-col items-end gap-1.5 sm:gap-2">
          
          {/* Top Row: Emotes/Actions Wheel Trigger + Dedicated Stand Button + Pray Button */}
          <div className="flex items-center gap-1.5">
            {/* Actions & Emotes Hub Toggle Button */}
            <button
              onClick={() => setIsWheelOpen(!isWheelOpen)}
              className={`h-9 px-2 sm:px-2.5 rounded-2xl flex items-center gap-1 border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                isWheelOpen
                  ? 'bg-amber-400 border-amber-300 text-black font-black ring-2 ring-amber-400/40'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400 hover:text-white'
              }`}
              title="Open Actions & Emotes Hub [Emotes, Gestures, Expressions]"
            >
              <Smile className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider">
                ACTIONS
              </span>
            </button>

            {/* Stand Outside Button */}
            <button
              onClick={onStand}
              className={`h-9 px-2 sm:px-2.5 rounded-2xl flex items-center gap-1 border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                !isSitting && !isPraying
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400'
              }`}
              title="Stand Up upright [Key Space or Stand]"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider">
                STAND
              </span>
            </button>

            {/* Pray Outside Button */}
            <button
              onClick={onPray}
              className={`h-9 px-2 sm:px-2.5 rounded-2xl flex items-center gap-1 border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                isPraying
                  ? 'bg-emerald-500 border-emerald-400 text-black font-bold ring-2 ring-emerald-400/50'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400'
              }`}
              title="Sanctuary Prayer & Remembrance [Key P]"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider">
                PRAY
              </span>
            </button>
          </div>

          {/* Bottom Row: Sit Outside + Sprint/Walk Mode Toggle */}
          <div className="flex items-center gap-1.5">
            {/* Dedicated Sit Button */}
            <button
              onClick={onSit}
              className={`h-9 px-2 sm:px-2.5 rounded-2xl flex items-center gap-1 border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                isSitting
                  ? 'bg-emerald-500 border-emerald-400 text-black font-bold ring-2 ring-emerald-400/50'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400'
              }`}
              title="Sit down on rug, bench or floor"
            >
              <Armchair className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider">
                SIT
              </span>
            </button>

            {/* Walk Quick Button */}
            <button
              onClick={onWalk}
              className={`h-9 px-2 sm:px-2.5 rounded-2xl flex items-center gap-1 border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                !isRunMode
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 font-bold'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400'
              }`}
              title="Regular Walking Pace"
            >
              <Footprints className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider">
                WALK
              </span>
            </button>

            {/* Sprint / Run Mode Toggle */}
            <button
              onClick={isRunMode ? onWalk : onRun}
              className={`h-9 px-2 sm:px-2.5 rounded-2xl flex items-center gap-1 border shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                isRunMode
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 border-emerald-300 text-black font-black ring-2 ring-emerald-400/40 shadow-emerald-500/20'
                  : 'bg-[#101520]/90 border-white/15 text-zinc-200 hover:border-emerald-400'
              }`}
              title="Toggle Sprint / Fast Run [Shift]"
            >
              <Zap className={`w-3.5 h-3.5 ${isRunMode ? 'text-black' : 'text-amber-400'}`} />
              <span className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-wider">
                {isRunMode ? 'SPRINT' : 'RUN'}
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
