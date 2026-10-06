/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MessageSquare, UserPlus, MapPin, Circle, Check, Search, Send, X } from 'lucide-react';

interface Friend {
  id: string;
  name: string;
  avatarLetter: string;
  avatarGradient: string;
  city: string;
  status: 'online' | 'in_game' | 'busy' | 'offline';
  statusText: string;
  currentWorld: string;
}

const initialFriends: Friend[] = [
  {
    id: 'f1',
    name: 'Tariq_KSA',
    avatarLetter: 'T',
    avatarGradient: 'from-emerald-500 to-teal-700',
    city: 'Makkah',
    status: 'in_game',
    statusText: 'In Ramadan Quiz Arena',
    currentWorld: 'Makkah Sanctuary',
  },
  {
    id: 'f2',
    name: 'Fatima_Lagos',
    avatarLetter: 'F',
    avatarGradient: 'from-blue-500 to-indigo-700',
    city: 'Lagos',
    status: 'online',
    statusText: 'Exploring Central District',
    currentWorld: 'Abuja Metropolis',
  },
  {
    id: 'f3',
    name: 'Amir_Cairo',
    avatarLetter: 'A',
    avatarGradient: 'from-amber-500 to-orange-700',
    city: 'Cairo',
    status: 'in_game',
    statusText: 'In Guild War Clash',
    currentWorld: 'Nilotic Citadel',
  },
  {
    id: 'f4',
    name: 'Zainab_DXB',
    avatarLetter: 'Z',
    avatarGradient: 'from-purple-500 to-pink-700',
    city: 'Dubai',
    status: 'online',
    statusText: 'Marketplace Bazaar',
    currentWorld: 'Dubai Marina',
  },
  {
    id: 'f5',
    name: 'Youssef_Kano',
    avatarLetter: 'Y',
    avatarGradient: 'from-emerald-600 to-cyan-800',
    city: 'Kano',
    status: 'busy',
    statusText: 'In Private Mosque Prayer',
    currentWorld: 'Kano Ancient Walls',
  },
];

interface FriendsListProps {
  onOpenModal: (title: string, description: string, type?: string) => void;
  onSendMessage?: (text: string, recipientId: string, recipientName: string) => void;
  realMessages?: Array<{ senderId: string; senderName: string; text: string; timestamp: string }>;
}

export default function FriendsList({ onOpenModal, onSendMessage, realMessages = [] }: FriendsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedFriends, setInvitedFriends] = useState<Record<string, boolean>>({});
  const [activeChatFriend, setActiveFriendChat] = useState<Friend | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Record<string, Array<{ sender: 'user' | 'friend'; text: string; time: string }>>>({
    f1: [
      { sender: 'friend', text: 'Salam Ibrahim! Joining the Ramadan Quiz Arena tonight?', time: '12:04' },
      { sender: 'user', text: 'Wa alaikum salam Tariq! Yes, squad is assembling now.', time: '12:05' },
    ],
    f2: [
      { sender: 'friend', text: 'Hey! Check out the new Jalabiyya customizer items in Abuja.', time: '11:30' },
    ],
  });

  const handleInvite = (friend: Friend) => {
    setInvitedFriends((prev) => ({ ...prev, [friend.id]: true }));
    onOpenModal(
      `Squad Invitation Sent to ${friend.name}`,
      `An instant multiplayer world invite to join Abuja Metropolis has been dispatched to ${friend.name}.`,
      'invite'
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChatFriend || !chatMessage.trim()) return;

    const messageText = chatMessage.trim();
    const newMsg = { sender: 'user' as const, text: messageText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    
    setChatHistory((prev) => ({
      ...prev,
      [activeChatFriend.id]: [...(prev[activeChatFriend.id] || []), newMsg],
    }));

    if (onSendMessage) {
      onSendMessage(messageText, activeChatFriend.id, activeChatFriend.name);
    }

    setChatMessage('');
  };

  const filteredFriends = initialFriends.filter(
    (f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.statusText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-[#12151f] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <span className="text-xs font-bold tracking-[0.3em] uppercase text-emerald-400 mb-1 block">
            CITIZEN NETWORK
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white flex items-center gap-2.5">
            <span className="w-2 h-6 bg-emerald-500 inline-block rounded-sm"></span>
            ACTIVE FRIENDS
          </h2>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search friends or cities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/50 border border-white/10 rounded-full text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Friends Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFriends.map((friend) => {
          const isInvited = !!invitedFriends[friend.id];
          return (
            <div
              key={friend.id}
              className="bg-black/40 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all group"
            >
              {/* Left: Avatar & Info */}
              <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
                <div className="relative shrink-0">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br ${friend.avatarGradient} flex items-center justify-center text-white font-black text-sm sm:text-base shadow-md`}
                  >
                    {friend.avatarLetter}
                  </div>
                  {/* Status indicator dot */}
                  <span
                    className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#12151f] ${
                      friend.status === 'in_game'
                        ? 'bg-emerald-400 animate-pulse'
                        : friend.status === 'online'
                        ? 'bg-blue-400'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider truncate group-hover:text-emerald-400 transition-colors">
                      {friend.name}
                    </h3>
                    <span className="text-[9px] sm:text-[10px] font-hud font-semibold text-zinc-400 uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                      {friend.city}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-emerald-400 font-medium truncate mt-0.5">
                    {friend.statusText}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-hud flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-zinc-600 shrink-0" /> {friend.currentWorld}
                  </p>
                </div>
              </div>

              {/* Right: Interactive Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                <button
                  onClick={() => setActiveFriendChat(friend)}
                  className="flex-1 sm:flex-none py-2 px-3 sm:p-2.5 rounded-xl border border-white/20 bg-white/5 hover:bg-white hover:text-black transition-all cursor-pointer text-zinc-300 hover:scale-105 text-xs font-semibold flex items-center justify-center gap-1.5"
                  title={`Message ${friend.name}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="sm:hidden">Message</span>
                </button>

                <button
                  onClick={() => handleInvite(friend)}
                  disabled={isInvited}
                  className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    isInvited
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                      : 'border-emerald-500 bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-105'
                  }`}
                >
                  {isInvited ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Invited
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" /> Invite
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Direct Messaging Chat Modal */}
      {activeChatFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12151f] border border-white/20 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col h-[500px] relative">
            {/* Modal Chat Header */}
            <div className="bg-[#171b26] p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${activeChatFriend.avatarGradient} flex items-center justify-center text-white font-black text-sm`}
                >
                  {activeChatFriend.avatarLetter}
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    {activeChatFriend.name}
                  </h3>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest block">
                    {activeChatFriend.statusText}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveFriendChat(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-black/40">
              {(chatHistory[activeChatFriend.id] || []).map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed font-medium ${
                      msg.sender === 'user'
                        ? 'bg-emerald-500 text-black rounded-br-xs font-semibold'
                        : 'bg-[#1e2333] text-white border border-white/10 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-zinc-500 mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-[#171b26] border-t border-white/10 flex items-center gap-2">
              <input
                type="text"
                placeholder={`Message ${activeChatFriend.name}...`}
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="flex-grow bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
