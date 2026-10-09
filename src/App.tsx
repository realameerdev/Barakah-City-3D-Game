/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Globe, Play, ChevronRight, Download, 
  X, CheckCircle2, Users, Radio, Flame, 
  Layers, Compass, MapPin, Calendar, Menu, Bell, Settings,
  User, Trophy, MessageSquare, ExternalLink, Check, Volume2, Sliders, FileText, Briefcase
} from 'lucide-react';

import RabbitLogo from './components/RabbitLogo';
import FriendsList from './components/FriendsList';
import RealtimeWorldChat from './components/RealtimeWorldChat';
import { AzanAudioController } from './components/AzanAudioController';
import ThreeGameWorld from './game/ThreeGameWorld';
import CinematicGameEntry from './game/CinematicGameEntry';
import { useRealtimeSocket } from './game/useRealtimeSocket';
import { SilkReveal } from './components/SilkReveal';
import LandscapeOrientationGate from './components/LandscapeOrientationGate';

// Photorealistic Islamic architectural & cultural imagery
import heroImg from './assets/images/hero_avatar_mosque_1791286969661.jpg';
import abujaImg from './assets/images/world_abuja_1791286984830.jpg';
import lagosImg from './assets/images/world_lagos_1791287003842.jpg';
import makkahImg from './assets/images/world_makkah_1791287014819.jpg';
import avatarBannerImg from './assets/images/banner_avatar_1791286062649.jpg';
import eventsBannerImg from './assets/images/banner_events_1791286073674.jpg';

import panoramicCityImg from './assets/images/world_panoramic_city_1791287026807.jpg';
import avatarJourneyImg from './assets/images/avatar_journey_1791287037799.jpg';
import multiplayerSceneImg from './assets/images/multiplayer_scene_1791287055254.jpg';
import eventQuizImg from './assets/images/event_ramadan_quiz_1791287071823.jpg';
import eventGuildImg from './assets/images/event_guild_war_1791287082782.jpg';
import eventMarketImg from './assets/images/event_night_market_1791287095562.jpg';
import customizerPreviewImg from './assets/images/avatar_customizer_preview_1791287838619.jpg';

interface CarouselSlide {
  id: number;
  kicker: string;
  title: string;
  subtitle: string;
  bgImage: string;
}

const slides: CarouselSlide[] = [
  {
    id: 1,
    kicker: "BARAKA CITY LIVE WORLDS",
    title: "ABUJA METROPOLIS",
    subtitle: "$200,000 Ramadan Grand Championship prize pool",
    bgImage: heroImg,
  },
  {
    id: 2,
    kicker: "CAIRO CITADEL SHOWDOWN",
    title: "NILOTIC SPARK",
    subtitle: "Experience 3D historic trading & live multiplayer guilds",
    bgImage: abujaImg,
  },
  {
    id: 3,
    kicker: "GLOBAL SANCTUARY LEAGUE",
    title: "MAKKAH GRAND ARENA",
    subtitle: "Join 100,000+ players in the annual spiritual quiz arena",
    bgImage: makkahImg,
  }
];

export default function App() {
  // Synchronize route with URL path: "/" -> Public Landing, "/dashboard" -> Player Dashboard
  const [activeView, setActiveView] = useState<'landing' | 'dashboard'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/dashboard') {
      return 'dashboard';
    }
    return 'landing'; // Default root route "/" is the Public Landing Page
  });

  const [isAzanFading, setIsAzanFading] = useState(false);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeRegion, setActiveRegion] = useState('Global');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; description: string; type: string } | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Interactive Modal Engine States
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [graphicsQuality, setGraphicsQuality] = useState('Balanced (HD)');
  const [soundVolume, setSoundVolume] = useState(85);
  const [cameraSensitivity, setCameraSensitivity] = useState(70);
  const [partnershipForm, setPartnershipForm] = useState({ name: '', org: '', email: '', message: '', submitted: false });
  const [careerAppliedId, setCareerAppliedId] = useState<string | null>(null);
  const [socialFeedback, setSocialFeedback] = useState<string | null>(null);
  const [activeRulesTab, setActiveRulesTab] = useState<'overview' | 'conduct' | 'tournament' | 'anticheat'>('overview');
  const [activeLegalTab, setActiveLegalTab] = useState<'privacy' | 'terms' | 'conduct'>('privacy');
  const [notificationsList, setNotificationsList] = useState([
    { id: 1, title: 'Ramadan Quiz Championship', desc: 'Quarter-finals match lobby is now open in Makkah Sanctuary.', time: '10m ago', unread: true },
    { id: 2, title: 'Squad Invite from Tariq_KSA', desc: 'Invitation to explore Abuja Central District together.', time: '25m ago', unread: true },
    { id: 3, title: 'Baraka Citizen Reward', desc: '500 XP granted for community exploration.', time: '1h ago', unread: true },
  ]);

  // Silk Motion & Parallax States
  const [selectedWorld, setSelectedWorld] = useState('Abuja Metropolis');
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  // Deep dive preview modals for world districts, events, and citizens
  const [worldDetailModal, setWorldDetailModal] = useState<{
    name: string;
    category: string;
    desc: string;
    image: string;
    population: string;
    weather: string;
    landmarks: string[];
  } | null>(null);

  const [eventDetailModal, setEventDetailModal] = useState<{
    title: string;
    status: string;
    statusColor: string;
    time: string;
    location: string;
    desc: string;
    prizePool: string;
    image: string;
  } | null>(null);

  const [playerDetailModal, setPlayerDetailModal] = useState<{
    rank: number;
    name: string;
    city: string;
    score: string;
    badge: string;
    winRate: string;
    guild: string;
  } | null>(null);

  // Customizer state preview inside dashboard
  const [customCategory, setCustomCategory] = useState<'Face' | 'Hair' | 'Skin' | 'Outfit' | 'Accessories' | 'Expression'>('Outfit');
  const [selectedOutfit, setSelectedOutfit] = useState('Royal Emerald Jalabiyya');
  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('baraka_citizen_name');
      if (saved && saved.trim()) return saved.trim();
    }
    return 'Ibrahim_NG';
  });

  // Real Multi-User Server Connection
  const userProfile = React.useMemo(() => ({
    name: userName,
    citizenId: 'cit-84920',
    city: selectedWorld.includes('Lagos') ? 'Lagos' : selectedWorld.includes('Makkah') ? 'Makkah' : selectedWorld.includes('Cairo') ? 'Cairo' : 'Abuja',
    world: selectedWorld,
    outfit: selectedOutfit,
  }), [userName, selectedOutfit, selectedWorld]);

  const {
    isConnected,
    onlineCount,
    onlineCitizens,
    chatMessages,
    sendMessage,
    sendSquadInvite,
    incomingInvite,
    clearInvite,
  } = useRealtimeSocket(userProfile);

  const handleDownloadRulebook = () => {
    window.location.href = '/api/download-rulebook';
    openModal(
      'Official Esports Rulebook 2026',
      'Downloading official Baraka City S.U.P.E.R. tournament ruleset (Baraka_City_Official_Esports_Rulebook_2026.txt) directly from the live server node.',
      'download'
    );
  };

  // Parallax scroll listener with requestAnimationFrame
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.pageYOffset || document.documentElement.scrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync route state with browser history (popstate back/forward)
  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/dashboard') {
        setActiveView('dashboard');
      } else {
        setActiveView('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Silk-smooth programmatic navigation helper with cross-fade veil
  const navigateTo = (view: 'landing' | 'dashboard', targetWorld?: string) => {
    if (view === 'dashboard') {
      setIsAzanFading(true);
    } else {
      setIsAzanFading(false);
    }
    if (targetWorld) {
      setSelectedWorld(targetWorld);
    }
    setIsPageTransitioning(true);
    setTimeout(() => {
      setActiveView(view);
      const targetPath = view === 'dashboard' ? '/dashboard' : '/';
      if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
      if (view === 'landing') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => {
        setIsPageTransitioning(false);
      }, 150);
    }, 220);
  };

  // Silk-smooth scroll to section with sticky header offset
  const scrollToSection = (sectionId: string) => {
    setIsMobileMenuOpen(false);
    if (activeView !== 'landing') {
      navigateTo('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          const yOffset = -72;
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 350);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        const yOffset = -72;
        const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }
  };

  // Auto advance carousel smoothly
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const openModal = (title: string, description: string, type: string = 'info') => {
    setSocialFeedback(null);
    setModalContent({ title, description, type });
    setIsModalOpen(true);
  };

  const handleRegionClick = (region: string) => {
    setActiveRegion(region);
    openModal(`Region: ${region}`, `Connected to ${region} regional server cluster with ultra-low latency. All tournaments and leaderboards synchronized.`, 'region');
  };

  return (
    <LandscapeOrientationGate>
      <div className="h-[100dvh] min-h-[100dvh] w-full bg-[#090a0f] text-white flex flex-col font-sora selection:bg-emerald-500 selection:text-white overflow-hidden">
      <AzanAudioController activeView={activeView} isFading={isAzanFading} />
      
      {/* 3D CINEMATIC GAME ENTRY VIEW ("/") VS 3D PLAYABLE GAME WORLD ("/dashboard") */}
      {activeView === 'landing' ? (
        <main className="relative w-full h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#090a0f]">
          <CinematicGameEntry
            onStartTransition={() => setIsAzanFading(true)}
            onEnterWorld={(world) => navigateTo('dashboard', world)}
            onlineCount={onlineCount}
            initialWorld={selectedWorld}
          />
        </main>
      ) : (
        /* PLAYER / GAME DASHBOARD ROUTE ("/dashboard") - 100% Immersive 3D World */
        <main className="relative w-full h-[100dvh] min-h-[100dvh] overflow-hidden bg-black">
          <ThreeGameWorld
            userProfile={userProfile}
            onExitToLanding={() => navigateTo('landing')}
            onUpdateProfile={(updates) => {
              if (updates.name) {
                setUserName(updates.name);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('baraka_citizen_name', updates.name);
                }
              }
              if (updates.outfit) {
                setSelectedOutfit(updates.outfit);
              }
            }}
            onInteractPlayer={(name, city) => {
              openModal(
                `Proximity Interaction with ${name}`,
                `Approached citizen ${name} from ${city} in 3D world space. Opening proximity speech channel.`,
                'talk'
              );
            }}
            onSendChatMessage={(text, channel) => sendMessage(text, channel || 'global')}
            onAddFriend={(friendName, city) => {
              openModal(
                `Friend Added`,
                `Citizen ${friendName} from ${city} added to your Citizen Network contacts.`,
                'friend'
              );
              sendSquadInvite(friendName, friendName);
            }}
            websocketSocket={null}
            chatMessages={chatMessages}
            onlineCount={onlineCount}
            onlineCitizens={onlineCitizens}
            isConnected={isConnected}
          />
        </main>
      )}

      {/* Comprehensive Interactive Modal Engine */}
      {isModalOpen && modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12151f] border border-white/20 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-white/10">
              <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 p-1 flex items-center justify-center shadow-lg">
                <RabbitLogo size={32} inverted={true} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black uppercase text-white tracking-wider">{modalContent.title}</h3>
                <span className="text-[10px] font-hud text-emerald-400 font-bold uppercase tracking-widest">
                  Baraka City Interactive Engine · Connected
                </span>
              </div>
            </div>

            {/* Dynamic Interactive Modal Bodies */}
            {modalContent.type === 'settings' ? (
              <div className="space-y-5 text-xs">
                {/* Language Selector */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    Preferred Language & Localization
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { code: 'English', label: 'English', native: 'English' },
                      { code: 'Arabic', label: 'العربية', native: 'Arabic' },
                      { code: 'Hausa', label: 'Hausa', native: 'Hausa' },
                      { code: 'French', label: 'Français', native: 'French' },
                      { code: 'Turkish', label: 'Türkçe', native: 'Turkish' },
                      { code: 'Urdu', label: 'اردو', native: 'Urdu' },
                    ].map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setSelectedLanguage(lang.code)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          selectedLanguage === lang.code
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 font-bold'
                            : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <span className="font-bold">{lang.label}</span>
                        {selectedLanguage === lang.code && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Graphics Quality */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                    3D World Graphics Engine
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Performance (60 FPS)', 'Balanced (HD)', 'Ultra (Cinematic)'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setGraphicsQuality(preset)}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-[10px] font-bold uppercase ${
                          graphicsQuality === preset
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white'
                        }`}
                      >
                        {preset.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume & Camera Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 p-3.5 rounded-2xl border border-white/5">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      <span>Sound FX Volume</span>
                      <span className="text-emerald-400 font-hud">{soundVolume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={soundVolume}
                      onChange={(e) => setSoundVolume(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase mb-1">
                      <span>Camera Sensitivity</span>
                      <span className="text-emerald-400 font-hud">{cameraSensitivity}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={cameraSensitivity}
                      onChange={(e) => setCameraSensitivity(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

            ) : modalContent.type === 'notifications' ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {notificationsList.filter(n => n.unread).length} Unread Notifications
                  </span>
                  <button
                    onClick={() => setNotificationsList(prev => prev.map(n => ({ ...n, unread: false })))}
                    className="text-[10px] font-bold text-emerald-400 hover:underline cursor-pointer uppercase"
                  >
                    Mark All as Read
                  </button>
                </div>

                {notificationsList.map((notif) => (
                  <div key={notif.id} className="p-3 bg-black/40 border border-white/10 rounded-2xl flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-white uppercase text-xs">{notif.title}</span>
                        {notif.unread && <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>}
                      </div>
                      <p className="text-zinc-300 text-xs leading-relaxed">{notif.desc}</p>
                      <span className="text-[10px] text-zinc-500 font-hud mt-1 block">{notif.time}</span>
                    </div>
                    <button
                      onClick={() => { setIsModalOpen(false); navigateTo('dashboard'); }}
                      className="px-3 py-1.5 bg-emerald-500 text-black font-extrabold text-[10px] uppercase rounded-xl hover:bg-emerald-400 shrink-0 cursor-pointer"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>

            ) : modalContent.type === 'careers' ? (
              <div className="space-y-3.5 text-xs">
                <p className="text-zinc-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
                  Join our studio team building the future of 3D cultural metaverse entertainment. All positions offer competitive compensation and flexible remote working.
                </p>

                {[
                  { id: 'c1', title: 'Senior Three.js / WebGL Simulation Engineer', dept: 'Engineering', loc: 'Remote' },
                  { id: 'c2', title: 'Lead 3D Islamic Architecture Artist', dept: 'Art & Design', loc: 'Abuja / Remote' },
                  { id: 'c3', title: 'Global Esports Tournament Operations Director', dept: 'Esports', loc: 'Dubai / Remote' },
                ].map((job) => (
                  <div key={job.id} className="p-3.5 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase text-white block">{job.title}</span>
                      <span className="text-[10px] text-zinc-400 font-hud">{job.dept} · {job.loc}</span>
                    </div>
                    <button
                      onClick={() => setCareerAppliedId(job.id)}
                      className={`px-3.5 py-1.5 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                        careerAppliedId === job.id
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                          : 'bg-white text-black hover:bg-emerald-400'
                      }`}
                    >
                      {careerAppliedId === job.id ? 'Applied ✓' : 'Apply Now'}
                    </button>
                  </div>
                ))}
              </div>

            ) : modalContent.type === 'partners' || modalContent.type === 'sponsor' ? (
              <div className="space-y-4 text-xs">
                {partnershipForm.submitted ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h4 className="font-bold text-white text-sm uppercase">Partnership Proposal Submitted</h4>
                    <p className="text-zinc-300 text-xs">
                      Thank you for contacting Baraka City Global Partnerships. Our team will review your proposal and respond within 24 hours.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); setPartnershipForm(prev => ({ ...prev, submitted: true })); }} className="space-y-3">
                    <p className="text-zinc-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
                      Collaborate with Baraka City across hardware partnerships, tournament sponsorship, and educational institutions.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Your Name"
                        required
                        value={partnershipForm.name}
                        onChange={(e) => setPartnershipForm({ ...partnershipForm, name: e.target.value })}
                        className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="Organization / Brand"
                        required
                        value={partnershipForm.org}
                        onChange={(e) => setPartnershipForm({ ...partnershipForm, org: e.target.value })}
                        className="bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <input
                      type="email"
                      placeholder="Corporate Email"
                      required
                      value={partnershipForm.email}
                      onChange={(e) => setPartnershipForm({ ...partnershipForm, email: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <textarea
                      placeholder="Brief partnership or sponsorship inquiry..."
                      rows={2}
                      required
                      value={partnershipForm.message}
                      onChange={(e) => setPartnershipForm({ ...partnershipForm, message: e.target.value })}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer shadow-lg"
                    >
                      Submit Partnership Proposal
                    </button>
                  </form>
                )}
              </div>

            ) : modalContent.type === 'rules' ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10">
                  {(['overview', 'conduct', 'tournament', 'anticheat'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveRulesTab(tab)}
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        activeRulesTab === tab ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-zinc-300 leading-relaxed space-y-2">
                  {activeRulesTab === 'overview' && (
                    <p>Official Standard & Universal Regulations governing the 2026 Baraka City Global Esports League ($200,000 USD Annual Prize Pool across all regional guilds).</p>
                  )}
                  {activeRulesTab === 'conduct' && (
                    <p>High ethical conduct, respectful sportsmanship, zero tolerance for toxicity or hate speech, and adherence to Islamic cultural principles.</p>
                  )}
                  {activeRulesTab === 'tournament' && (
                    <p>Squads of 4 citizens compete across 60Hz tickrate WebGL simulation server nodes in Ramadan Quiz Arena and District Clan Wars.</p>
                  )}
                  {activeRulesTab === 'anticheat' && (
                    <p>Server-authoritative movement verification and automated heuristics active 24/7 across all connected sessions.</p>
                  )}
                </div>

                <button
                  onClick={handleDownloadRulebook}
                  className="w-full py-2.5 bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" /> Download Official Rulebook (.txt)
                </button>
              </div>

            ) : modalContent.type === 'legal' ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10">
                  {(['privacy', 'terms', 'conduct'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveLegalTab(tab)}
                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        activeLegalTab === tab ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-zinc-300 leading-relaxed text-xs space-y-2 max-h-48 overflow-y-auto">
                  {activeLegalTab === 'privacy' && (
                    <p>Baraka City respects your privacy. We collect minimal gameplay telemetry necessary for synchronized 3D multiplayer gameplay and tournament verification. We never sell your personal data.</p>
                  )}
                  {activeLegalTab === 'terms' && (
                    <p>By entering Baraka City, you agree to respectful participation, intellectual property protection, and our terms governing digital assets and tournament prize distribution.</p>
                  )}
                  {activeLegalTab === 'conduct' && (
                    <p>Fair play is strictly enforced. Harassment, unauthorized scripts, or exploiting simulation physics will result in immediate citizen suspension.</p>
                  )}
                </div>
              </div>

            ) : modalContent.type === 'region' ? (
              <div className="space-y-3 text-xs">
                <p className="text-zinc-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
                  Synchronize with ultra-low latency regional game cluster:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Nigeria', ping: '12ms', status: 'Optimal' },
                    { name: 'Middle East', ping: '24ms', status: 'Optimal' },
                    { name: 'Africa', ping: '18ms', status: 'Optimal' },
                    { name: 'Global', ping: '38ms', status: 'Active' },
                  ].map((r) => (
                    <button
                      key={r.name}
                      onClick={() => { setActiveRegion(r.name); setIsModalOpen(false); }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        activeRegion === r.name
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <span className="font-bold text-xs uppercase">{r.name}</span>
                      <span className="text-[10px] font-hud text-zinc-400 mt-1">{r.ping} · {r.status}</span>
                    </button>
                  ))}
                </div>
              </div>

            ) : modalContent.type === 'social' ? (
              <div className="space-y-3 text-xs">
                {socialFeedback ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl text-center space-y-2 animate-fadeIn">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h4 className="font-bold text-white text-sm uppercase">{socialFeedback}</h4>
                    <p className="text-zinc-300 text-xs">
                      Connected to the Baraka City citizen communication network.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-zinc-300 leading-relaxed bg-black/30 p-3 rounded-xl border border-white/5">
                      Connect with hundreds of thousands of active citizens across our official social and communication hubs:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button 
                        onClick={() => setSocialFeedback('Joined Baraka City Official Discord Server with 500,000+ members!')}
                        className="p-3 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/40 text-white hover:bg-[#5865F2] hover:text-white transition-all font-bold text-xs flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span>Discord</span>
                        <span className="text-[9px] text-zinc-300 font-hud">500k+ Online</span>
                      </button>
                      <button 
                        onClick={() => setSocialFeedback('Now following @BarakaCity on X!')}
                        className="p-3 rounded-2xl bg-white/10 border border-white/20 text-white hover:bg-white hover:text-black transition-all font-bold text-xs flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span>X (Twitter)</span>
                        <span className="text-[9px] text-zinc-300 font-hud">@BarakaCity</span>
                      </button>
                      <button 
                        onClick={() => setSocialFeedback('Subscribed to Baraka City Esports YouTube!')}
                        className="p-3 rounded-2xl bg-red-600/20 border border-red-600/40 text-white hover:bg-red-600 hover:text-white transition-all font-bold text-xs flex flex-col items-center gap-1 cursor-pointer"
                      >
                        <span>YouTube</span>
                        <span className="text-[9px] text-zinc-300 font-hud">Live Matches</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

            ) : (
              <p className="text-sm text-zinc-300 leading-relaxed mb-6 bg-black/30 p-4 rounded-xl border border-white/5">
                {modalContent.description}
              </p>
            )}

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-white/10">
              {modalContent.type === 'settings' ? (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer shadow-lg"
                >
                  Save & Apply Preferences
                </button>
              ) : modalContent.type === 'nav' || modalContent.type === 'events' ? (
                <button
                  onClick={() => { setIsModalOpen(false); navigateTo('dashboard'); }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer shadow-lg"
                >
                  Enter Arena Now
                </button>
              ) : (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer"
                >
                  Close / Continue
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* World District Detail Preview Modal */}
      {worldDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12151f] border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto hover-silk-card">
            <button 
              onClick={() => setWorldDetailModal(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden mb-5 border border-white/10">
              <img 
                src={worldDetailModal.image} 
                alt={worldDetailModal.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12151f] via-transparent to-transparent"></div>
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[11px] font-hud text-emerald-400">
                {worldDetailModal.weather}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                  {worldDetailModal.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                  {worldDetailModal.name}
                </h3>
                <span className="text-xs font-hud text-emerald-400 block mt-0.5">
                  {worldDetailModal.population}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium bg-black/30 p-3.5 rounded-xl border border-white/5">
                {worldDetailModal.desc}
              </p>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                  Key Cultural & Architectural Landmarks
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {worldDetailModal.landmarks.map((lm, idx) => (
                    <div key={idx} className="bg-black/50 border border-white/10 rounded-xl p-2.5 text-[11px] text-zinc-300 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{lm}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={() => setWorldDetailModal(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const worldTarget = worldDetailModal.name;
                    setWorldDetailModal(null);
                    navigateTo('dashboard', worldTarget);
                  }}
                  className="btn-silk px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer shadow-lg flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Enter {worldDetailModal.name} in 3D
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Preview Modal */}
      {eventDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12151f] border border-emerald-500/40 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto hover-silk-card">
            <button 
              onClick={() => setEventDetailModal(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden mb-5 border border-white/10">
              <img 
                src={eventDetailModal.image} 
                alt={eventDetailModal.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#12151f] via-transparent to-transparent"></div>
              <div className="absolute top-3 left-3">
                <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest text-white ${eventDetailModal.statusColor} shadow-md`}>
                  {eventDetailModal.status}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5" /> {eventDetailModal.time}
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase text-white tracking-wide">
                  {eventDetailModal.title}
                </h3>
                <span className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" /> {eventDetailModal.location}
                </span>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block mb-0.5">Tournament Prize Pool</span>
                <span className="text-base sm:text-lg font-black text-white font-hud">{eventDetailModal.prizePool}</span>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium bg-black/30 p-3.5 rounded-xl border border-white/5">
                {eventDetailModal.desc}
              </p>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={() => setEventDetailModal(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setEventDetailModal(null);
                    navigateTo('dashboard');
                  }}
                  className="btn-silk px-6 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer shadow-lg flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Enter Tournament in 3D Arena
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Citizen Leaderboard Profile Preview Modal */}
      {playerDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12151f] border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto hover-silk-card">
            <button 
              onClick={() => setPlayerDetailModal(null)}
              className="absolute top-5 right-5 text-zinc-400 hover:text-white p-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-5 pb-4 border-b border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg">
                {playerDetailModal.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black uppercase text-white tracking-wider">
                    {playerDetailModal.name}
                  </h3>
                  <span className="text-base">{playerDetailModal.badge}</span>
                </div>
                <span className="text-xs font-hud text-emerald-400">
                  Rank #{playerDetailModal.rank} · {playerDetailModal.city} Resident
                </span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-black/50 border border-white/10 p-3 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Seasonal Score</span>
                  <span className="text-base font-black text-white font-hud text-emerald-400">{playerDetailModal.score} PTS</span>
                </div>
                <div className="bg-black/50 border border-white/10 p-3 rounded-xl">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Win Ratio</span>
                  <span className="text-base font-black text-white font-hud">{playerDetailModal.winRate}</span>
                </div>
              </div>

              <div className="bg-black/50 border border-white/10 p-3 rounded-xl">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Guild Affiliation</span>
                <span className="text-xs font-bold text-white uppercase">{playerDetailModal.guild}</span>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    sendSquadInvite(playerDetailModal.name, playerDetailModal.name);
                    openModal('Squad Invite Sent', `Invitation sent to ${playerDetailModal.name} across regional node.`, 'friend');
                    setPlayerDetailModal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs uppercase tracking-wider hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Invite to Squad
                </button>
                <button
                  onClick={() => {
                    setPlayerDetailModal(null);
                    navigateTo('dashboard');
                  }}
                  className="btn-silk px-5 py-2 rounded-xl bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer shadow-lg"
                >
                  Meet in 3D City
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silk Page Transition Veil */}
      <div
        className={`fixed inset-0 z-[100] bg-[#090a0f] pointer-events-none transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isPageTransitioning ? 'opacity-100' : 'opacity-0'
        }`}
      />

      </div>
    </LandscapeOrientationGate>
  );
}
