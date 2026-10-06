/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MessageSquare, Send, Users, Radio, Globe, Shield, Wifi } from 'lucide-react';
import { ChatMessage, OnlineCitizen } from '../game/useRealtimeSocket';

interface RealtimeWorldChatProps {
  userCitizenId: string;
  userName: string;
  isConnected: boolean;
  onlineCount: number;
  onlineCitizens: OnlineCitizen[];
  messages: ChatMessage[];
  onSendMessage: (text: string, channel?: string) => void;
}

export default function RealtimeWorldChat({
  userCitizenId,
  userName,
  isConnected,
  onlineCount,
  onlineCitizens,
  messages,
  onSendMessage,
}: RealtimeWorldChatProps) {
  const [activeChannel, setActiveChannel] = useState<'global' | 'abuja' | 'cairo' | 'makkah'>('global');
  const [inputMessage, setInputMessage] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    onSendMessage(inputMessage.trim(), activeChannel);
    setInputMessage('');
  };

  const channelFilteredMessages = messages.filter(
    (m) => m.channel === activeChannel || m.channel === 'global' || !m.channel
  );

  return (
    <div className="bg-[#12151f] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Header with Server Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold tracking-[0.3em] uppercase text-emerald-400 block">
              LIVE METAVERSE SERVER NODE
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                isConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
              }`}
            >
              <Wifi className="w-3 h-3" />
              {isConnected ? 'LIVE WEBSOCKET CONNECTED' : 'RECONNECTING...'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-emerald-400 animate-pulse shrink-0" />
            REAL CITIZENS CHAT
          </h2>
        </div>

        {/* Live Citizens Presence Counter */}
        <div className="flex items-center gap-3 bg-black/60 border border-white/10 px-4 py-2 rounded-2xl backdrop-blur-md">
          <Users className="w-4 h-4 text-emerald-400" />
          <div className="text-left">
            <span className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">REAL CITIZENS ONLINE</span>
            <span className="text-sm font-hud font-bold text-white">{onlineCount} Active Connected</span>
          </div>
        </div>
      </div>

      {/* Channel Switcher Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[
          { id: 'global', name: 'GLOBAL METAVERSE', icon: Globe },
          { id: 'abuja', name: 'ABUJA DISTRICT', icon: MessageSquare },
          { id: 'cairo', name: 'CAIRO CITADEL', icon: MessageSquare },
          { id: 'makkah', name: 'MAKKAH ARENA', icon: MessageSquare },
        ].map((ch) => {
          const Icon = ch.icon;
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id as any)}
              className={`px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeChannel === ch.id
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-lg'
                  : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {ch.name}
            </button>
          );
        })}
      </div>

      {/* Messages Feed Box */}
      <div className="h-72 overflow-y-auto p-4 bg-black/50 border border-white/10 rounded-2xl space-y-3.5 shadow-inner">
        {channelFilteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
            <MessageSquare className="w-8 h-8 text-zinc-600" />
            <p className="text-xs font-medium">No real messages in this channel yet. Send the first message to live citizens!</p>
          </div>
        ) : (
          channelFilteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isSelf ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">
                  {msg.senderName}
                </span>
                {msg.senderCity && (
                  <span className="text-[9px] font-hud text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {msg.senderCity}
                  </span>
                )}
                <span className="text-[9px] font-hud text-zinc-500">{msg.timestamp}</span>
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-md ${
                  msg.isSelf
                    ? 'bg-emerald-500 text-black font-semibold rounded-tr-xs'
                    : 'bg-[#1a1f2e] text-white border border-white/10 rounded-tl-xs'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Real Message Input Form */}
      <form onSubmit={handleSend} className="flex items-center gap-3 bg-[#171b26] p-2 sm:p-2.5 rounded-2xl border border-white/10">
        <input
          type="text"
          placeholder={`Type message to real citizens in #${activeChannel.toUpperCase()}...`}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          className="flex-grow bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="px-6 py-3 bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">SEND REAL</span>
        </button>
      </form>

      {/* Real Citizens Currently Connected Row */}
      {onlineCitizens.length > 0 && (
        <div className="pt-3 border-t border-white/5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
          <span className="font-bold uppercase tracking-wider text-zinc-500 text-[10px]">CONNECTED CITIZENS:</span>
          {onlineCitizens.map((c, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 border border-white/10 text-white font-medium text-[10px]"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {c.name} ({c.city})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
