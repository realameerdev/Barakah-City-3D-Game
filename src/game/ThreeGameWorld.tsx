/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Play, MessageSquare, MapPin, Users, Compass, Shield, Radio,
  User, Volume2, VolumeX, Maximize2, RotateCcw, Home, UserPlus,
  Settings, Menu, X, Check, Send, ChevronRight, Bed, Armchair, Sliders,
  Footprints, Zap, UserCheck, Smile, Hand, Activity, ChevronUp, ChevronDown, Layers,
  Coins, Award, Sparkles, Package, ListTodo, Map, Crosshair, CheckCircle2,
  ShoppingBag, BookOpen, Heart, Trophy, AlertTriangle, Gift, Briefcase,
  ArrowLeft, ChevronLeft, LogOut, Palette, RefreshCw, MessageCircle,
  Minimize2, Wifi, Globe2
} from 'lucide-react';
import AvatarCustomizerModal from './AvatarCustomizerModal';
import { 
  AvatarCustomization, GenderType, SkinToneId, HeadwearType, 
  HairStyleType, BeardStyleType, OutfitType, ShoeType, AccessoryType,
  SpeechBubble, FootballPhysicsState
} from './gameTypes';
import { OnlineCitizen, ChatMessage as RealtimeChatMessage } from './useRealtimeSocket';
import GtaRadarMinimap from '../components/GtaRadarMinimap';
import ExpandedWorldMapModal from '../components/ExpandedWorldMapModal';

export type PerformanceTier = 'high' | 'balanced' | 'performance';

interface CoinBalanceDisplayProps {
  coins: number;
  compact?: boolean;
}

export const CoinBalanceDisplay: React.FC<CoinBalanceDisplayProps> = ({ coins, compact = false }) => {
  const [displayValue, setDisplayValue] = useState(coins);
  const [animDelta, setAnimDelta] = useState<number | null>(null);
  const [pulseType, setPulseType] = useState<'gain' | 'loss' | null>(null);
  const prevValueRef = useRef(coins);

  useEffect(() => {
    const diff = coins - prevValueRef.current;
    if (diff !== 0) {
      setAnimDelta(diff);
      setPulseType(diff > 0 ? 'gain' : 'loss');

      const timeout = setTimeout(() => {
        setAnimDelta(null);
        setPulseType(null);
      }, 1400);

      // Smooth number animation / roll
      const startValue = prevValueRef.current;
      const endValue = coins;
      const duration = 350; // ms
      const startTime = performance.now();

      const animateRoll = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // easeOutQuad
        const ease = 1 - (1 - progress) * (1 - progress);
        const current = Math.round(startValue + (endValue - startValue) * ease);
        setDisplayValue(current);

        if (progress < 1) {
          requestAnimationFrame(animateRoll);
        } else {
          setDisplayValue(endValue);
        }
      };

      requestAnimationFrame(animateRoll);
      prevValueRef.current = coins;

      return () => clearTimeout(timeout);
    } else {
      setDisplayValue(coins);
      prevValueRef.current = coins;
    }
  }, [coins]);

  const isNegative = displayValue < 0;
  const isPositive = displayValue > 0;

  // Format string: e.g. "+5", "-20", "0"
  const formattedNumber = isPositive
    ? `+${displayValue.toLocaleString()}`
    : displayValue.toLocaleString();

  return (
    <div
      className={`relative inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap backdrop-blur-md ${
        compact ? 'px-2 py-0.5 rounded-xl text-xs' : 'px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm'
      } border transition-all duration-300 font-hud shadow-xl select-none pointer-events-auto ${
        isNegative
          ? 'bg-rose-950/85 border-rose-500/60 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
          : isPositive
          ? 'bg-emerald-950/85 border-emerald-400/60 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
          : 'bg-black/85 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
      } ${
        pulseType === 'gain'
          ? 'scale-105 ring-2 ring-emerald-400/70'
          : pulseType === 'loss'
          ? 'scale-105 ring-2 ring-rose-400/70 animate-shake'
          : ''
      }`}
      title={`Current Balance: ${formattedNumber} Coins (Allows continuous negative & positive values)`}
    >
      <div className="flex items-center gap-1">
        <span className={`${compact ? 'text-xs' : 'text-sm'} leading-none drop-shadow`}>🪙</span>
        {!compact && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 hidden xs:inline">
            BALANCE:
          </span>
        )}
      </div>

      <span
        className={`font-black tracking-wider transition-colors ${
          compact ? 'text-[11px]' : 'text-xs sm:text-sm'
        } ${
          isNegative
            ? 'text-rose-400'
            : isPositive
            ? 'text-emerald-300'
            : 'text-amber-300'
        }`}
      >
        {formattedNumber}
      </span>

      {/* Floating Delta Badge on Change (+5 or -10) */}
      {animDelta !== null && (
        <span
          className={`absolute -top-3 right-0 text-[10px] font-black px-1.5 py-0.5 rounded-full pointer-events-none animate-floatUp z-30 ${
            animDelta > 0
              ? 'bg-emerald-500 text-black shadow-lg font-extrabold'
              : 'bg-rose-500 text-white shadow-lg font-extrabold'
          }`}
        >
          {animDelta > 0 ? `+${animDelta}` : `${animDelta}`}
        </span>
      )}
    </div>
  );
};

// Helper: Calculate aspect-aware adaptive camera parameters for 3D third-person open-world
const getAdaptiveCameraParams = (w: number, h: number) => {
  const aspect = w / Math.max(1, h);
  let fov = 55;
  let baseDistance = 9.0;
  let heightRatio = 0.45;

  if (aspect >= 2.1) {
    // Ultrawide (21:9, 32:9) - broad panoramic expanse
    fov = 50;
    baseDistance = 9.5;
    heightRatio = 0.40;
  } else if (aspect >= 1.6) {
    // Standard Desktop (16:9, 16:10)
    fov = 55;
    baseDistance = 9.0;
    heightRatio = 0.44;
  } else if (aspect >= 1.25) {
    // Landscape Tablet / Laptop (4:3, 3:2)
    fov = 60;
    baseDistance = 9.2;
    heightRatio = 0.46;
  } else if (aspect >= 0.9) {
    // Squarish viewports
    fov = 66;
    baseDistance = 9.5;
    heightRatio = 0.48;
  } else if (aspect >= 0.65) {
    // Portrait Tablet (iPad portrait)
    fov = 72;
    baseDistance = 9.8;
    heightRatio = 0.50;
  } else if (aspect >= 0.48) {
    // Standard Phone Portrait (iPhone, Galaxy)
    fov = 78;
    baseDistance = 10.2;
    heightRatio = 0.52;
  } else {
    // Tall Narrow Phone (iPhone Pro Max, Galaxy Ultra)
    fov = 84;
    baseDistance = 10.6;
    heightRatio = 0.55;
  }

  return { fov, aspect, baseDistance, heightRatio };
};

interface OtherAvatar {
  id: string;
  name: string;
  city: string;
  outfitColor: number;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  rotation: number;
  isWalking: boolean;
  statusText: string;
  mesh?: THREE.Group;
}

export interface MovingVehicle {
  id: string;
  name: string;
  mesh: THREE.Group;
  colorHex: number;
  type: 'sedan' | 'taxi' | 'suv' | 'cruiser' | 'van';
  cruiseSpeed: number;
  currentSpeed: number;
  waypoints: THREE.Vector3[];
  waypointIndex: number;
  wheels: THREE.Mesh[];
  stoppedForPedestrian: boolean;
  stoppedForVehicle: boolean;
}

export interface SolidObstacle {
  id: string;
  name: string;
  type: 'building' | 'furniture' | 'wall' | 'car';
  penalty: number;
  minX?: number;
  maxX?: number;
  minZ?: number;
  maxZ?: number;
  centerX?: number;
  centerZ?: number;
  radius?: number;
}

export interface Mission {
  id: string;
  title: string;
  desc: string;
  reward: number;
  current: number;
  target: number;
  unit?: string;
  type: 'daily' | 'weekly';
  completed: boolean;
  claimed: boolean;
}

export interface CoinFeedback {
  amount: number;
  reason: string;
  timestamp: number;
}

export type ActionType = 'idle' | 'walk' | 'run' | 'sit' | 'stand' | 'laugh' | 'wave' | 'greet' | 'talk' | 'pray' | 'interact';
export type ExpressionType = 'Neutral' | 'Happy' | 'Smile' | 'Laugh' | 'Sad' | 'Angry' | 'Surprised' | 'Calm';

interface ThreeGameWorldProps {
  userProfile: {
    name: string;
    citizenId: string;
    city: string;
    world: string;
    outfit: string;
    gender?: 'male' | 'female';
  };
  onExitToLanding?: () => void;
  onUpdateProfile?: (updates: Partial<{ name: string; outfit: string; gender: 'male' | 'female' }>) => void;
  onInteractPlayer?: (playerName: string, city: string) => void;
  onSendChatMessage?: (text: string, channel?: string) => void;
  onAddFriend?: (friendName: string, city: string) => void;
  websocketSocket?: WebSocket | null;
  chatMessages?: Array<{ id: string; senderName: string; senderCity: string; text: string; timestamp: string; channel?: string }>;
  onlineCount?: number;
  onlineCitizens?: OnlineCitizen[];
  isConnected?: boolean;
}

const QUICK_CHAT_PHRASES = [
  'Assalamu Alaikum! 👋',
  'Heading to Grand Mosque 🕌',
  'Let’s pray in congregation ✨',
  'Meet me at Souq Al-Baraka 🏪',
  'Anyone up for football? ⚽',
  'Baraka Allahu Feek! 🤲',
  'JazakAllah Khair! 💫',
];

export default function ThreeGameWorld({
  userProfile,
  onExitToLanding,
  onUpdateProfile,
  onInteractPlayer,
  onSendChatMessage,
  onAddFriend,
  websocketSocket,
  chatMessages = [],
  onlineCount = 12,
  onlineCitizens = [],
  isConnected = true,
}: ThreeGameWorldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Web Audio API Synthesizer
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientOscRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        try {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(110, ctx.currentTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(240, ctx.currentTime);

          gain.gain.setValueAtTime(0.03, ctx.currentTime);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start();

          ambientOscRef.current = osc;
          ambientGainRef.current = gain;
        } catch {
          // Fallback if browser audio policy blocks initial start
        }
      }
    }
  }, []);

  const playChime = useCallback((freq = 440, type: OscillatorType = 'sine', duration = 0.25) => {
    try {
      if (!audioCtxRef.current) initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio autoplay policy fallback
    }
  }, [initAudio]);

  // Melodic celebration chime when earning coins
  const playCoinChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;
      [587.33, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);
        gain.gain.setValueAtTime(0.10, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.35);
      });
    } catch {
      // Audio autoplay fallback
    }
  }, [initAudio]);

  // Subdued physical thud when bumping into a solid object or vehicle
  const playCollisionThud = useCallback(() => {
    try {
      if (!audioCtxRef.current) initAudio();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.22);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, t);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.22);
    } catch {
      // Audio autoplay fallback
    }
  }, [initAudio]);

  // Character Action & Expression States
  const [currentAction, setCurrentAction] = useState<ActionType>('idle');
  const [toggleMovementMode, setToggleMovementMode] = useState<'walk' | 'run' | null>(null);
  const [isRunMode, setIsRunMode] = useState(false);
  const [currentExpression, setCurrentExpression] = useState<ExpressionType>('Neutral');
  const [isExpressionPickerOpen, setIsExpressionPickerOpen] = useState(false);
  const [isPraying, setIsPraying] = useState(false);
  const [prayerPhase, setPrayerPhase] = useState<'qiyam' | 'ruku' | 'sujud' | 'tashahhud'>('qiyam');
  const [actionToast, setActionToast] = useState<string | null>(null);

  // HUD & Game World states
  const [nearbyPlayer, setNearbyPlayer] = useState<{ id: string; name: string; city: string; distance: number } | null>(null);
  const [isNearHome, setIsNearHome] = useState(false);
  const [isInPlayerHome, setIsInPlayerHome] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const targetSeatPosition = useRef<THREE.Vector3 | null>(null);
  const isWalkingToSeatRef = useRef(false);
  const [isResting, setIsResting] = useState(false);
  const [addedFriends, setAddedFriends] = useState<Record<string, boolean>>({});

  // 3D Avatar Customization Studio State
  const [avatarConfig, setAvatarConfig] = useState<AvatarCustomization>(() => {
    const isSister = userProfile.gender === 'female' || (userProfile.outfit && userProfile.outfit.toLowerCase().includes('abaya'));
    return {
      gender: isSister ? 'sister' : 'brother',
      skinTone: 'tan',
      skinColorHex: 0xc68a4c,
      headwear: isSister ? 'hijab_emerald' : 'white_taqiyah',
      hairStyle: 'fade',
      hairColorHex: 0x18181b,
      beardStyle: 'sunnah_beard',
      outfit: isSister ? 'flowing_abaya' : userProfile.outfit && userProfile.outfit.includes('Emerald') ? 'emerald_jalabiyya' : 'white_thobe',
      outfitColorHex: userProfile.outfit && userProfile.outfit.includes('Emerald') ? 0x059669 : 0xf8fafc,
      outfitSecondaryHex: 0xf59e0b,
      shoes: 'leather_sandals',
      shoeColorHex: 0x78350f,
      accessory: 'amber_tasbih',
      expression: 'Happy',
    };
  });
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Real-time 3D Floating Speech Bubbles for Proximity Multiplayer Chat
  const speechBubblesRef = useRef<SpeechBubble[]>([]);
  const [projectedSpeechBubbles, setProjectedSpeechBubbles] = useState<Array<{ id: string; senderName: string; text: string; isSelf: boolean; x: number; y: number; visible: boolean }>>([]);

  // Interactive Physical 3D Football Simulation State
  const footballMeshRef = useRef<THREE.Mesh | null>(null);
  const footballPhysicsRef = useRef<FootballPhysicsState>({
    x: -45,
    y: 0.35,
    z: 52,
    vx: 0,
    vy: 0,
    vz: 0,
    scoreHome: 0,
    scoreAway: 0,
  });
  const [footballScore, setFootballScore] = useState<{ home: number; away: number }>({ home: 0, away: 0 });
  const [goalCelebration, setGoalCelebration] = useState<string | null>(null);

  // Dynamic Context-Aware In-World Action Prompt
  const [contextPrompt, setContextPrompt] = useState<{
    text: string;
    actionKey: string;
    subText?: string;
    onExecute: () => void;
  } | null>(null);

  // Continuous Coins Economy & Real-time Balance State (Every new player starts with exactly 0 coins)
  const [coins, setCoins] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('baraka_city_player_coins');
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
    return 0; // Exactly 0 for all new players
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('baraka_city_player_coins', coins.toString());
    }
  }, [coins]);
  const [hasClaimedDailyReward, setHasClaimedDailyReward] = useState(false);
  const [coinFeedback, setCoinFeedback] = useState<CoinFeedback | null>(null);

  // Economy & Exploration Trackers
  const totalMetersWalkedRef = useRef<number>(0);
  const nextExplorationBonusRef = useRef<number>(200);
  const visitedDistrictsRef = useRef<Set<string>>(new Set(['Central Boulevard']));
  const lastCollisionRef = useRef<{ id: string; timestamp: number }>({ id: '', timestamp: 0 });
  const cameraShakeRef = useRef<number>(0);
  const greetingsGivenRef = useRef<number>(0);
  const [speedBoostUntil, setSpeedBoostUntil] = useState<number>(0);

  // Interactive In-World Modals
  const [isMissionsModalOpen, setIsMissionsModalOpen] = useState(false);
  const [isSouqShopOpen, setIsSouqShopOpen] = useState(false);
  const [isUniversityQuizOpen, setIsUniversityQuizOpen] = useState(false);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizFeedback, setQuizFeedback] = useState<string | null>(null);

  // Real-time Location District & Compass
  const currentDistrictRef = useRef('Central Boulevard');
  const [currentDistrict, setCurrentDistrict] = useState('Central Boulevard');

  // Minimap full-screen expand modal
  const [isMinimapExpanded, setIsMinimapExpanded] = useState(false);
  const [radarCoords, setRadarCoords] = useState<{ x: number; z: number; rot: number }>({ x: 0, z: 18, rot: 0 });
  const [stamina, setStamina] = useState(100);
  const staminaRef = useRef(100);
  const lastRadarUpdateRef = useRef(0);

  // Performance Quality Tier
  const [performanceTier, setPerformanceTier] = useState<PerformanceTier>(() => {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 640 || /Android|iPhone|iPad/i.test(navigator.userAgent);
      return isMobile ? 'balanced' : 'high';
    }
    return 'balanced';
  });

  // Daily & Weekly Missions with real live tracking
  const [missions, setMissions] = useState<Mission[]>([
    // DAILY MISSIONS
    { id: 'm_mosque', title: 'Visit the Grand Mosque', desc: 'Walk onto the Grand Mosque ceremonial prayer terrace', reward: 20, current: 0, target: 1, type: 'daily', completed: false, claimed: false },
    { id: 'm_prayer', title: 'Sanctuary Prayer & Remembrance', desc: 'Offer prayer at the Grand Mosque sanctuary (Key P or Pray button)', reward: 25, current: 0, target: 1, type: 'daily', completed: false, claimed: false },
    { id: 'm_class', title: 'Attend University Class', desc: 'Complete an ethics & heritage lecture at the Madrasa colonnade', reward: 25, current: 0, target: 1, type: 'daily', completed: false, claimed: false },
    { id: 'm_walk', title: 'Walk 500m in the City', desc: 'Explore the boulevards and promenades of Baraka City', reward: 20, current: 0, target: 500, unit: 'm', type: 'daily', completed: false, claimed: false },
    { id: 'm_greet', title: 'Greet 3 Fellow Citizens', desc: 'Wave or greet 3 fellow citizens or NPCs in the metropolis', reward: 15, current: 0, target: 3, type: 'daily', completed: false, claimed: false },
    { id: 'm_souq', title: 'Souq Community Trade & Task', desc: 'Help merchants organize shipments or trade at Souq Al-Baraka', reward: 30, current: 0, target: 1, type: 'daily', completed: false, claimed: false },
    // WEEKLY MISSIONS
    { id: 'w_districts', title: 'Discover 4 City Districts', desc: 'Explore Central Boulevard, Mosque, Souq, University, and Residential areas', reward: 75, current: 1, target: 4, type: 'weekly', completed: false, claimed: false },
    { id: 'w_walk', title: 'Endurance Pilgrimage (2,000m)', desc: 'Travel 2,000 total meters across the metropolis', reward: 100, current: 0, target: 2000, unit: 'm', type: 'weekly', completed: false, claimed: false },
    { id: 'w_activities', title: 'Community Leadership (5 Tasks)', desc: 'Complete 5 daily activities or community challenges', reward: 120, current: 0, target: 5, type: 'weekly', completed: false, claimed: false },
  ]);

  // Player Inventory
  const [inventory, setInventory] = useState([
    { id: 'inv1', name: 'Embroidered Prayer Rug', type: 'Sanctuary', count: 1, equipped: true },
    { id: 'inv2', name: 'Arabian Oud Essence', type: 'Fragrance', count: 3, equipped: false },
    { id: 'inv3', name: 'Natural Olive Miswak', type: 'Sunnah', count: 2, equipped: false },
    { id: 'inv4', name: 'Gold Dinar Pouch', type: 'Currency', count: 50, equipped: false },
    { id: 'inv5', name: 'Ajwa Dates Basket', type: 'Food', count: 12, equipped: false },
  ]);

  // Player Status HUD collapsible on mobile
  const [isPlayerHudMinimized, setIsPlayerHudMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });

  // Slide-over minimal hamburger menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuTab, setMenuTab] = useState<'character' | 'inventory' | 'missions' | 'shop' | 'friends' | 'messages' | 'settings'>('character');

  // Interactive In-World Chat & Realtime Multiplayer System
  const [activeDirectChat, setActiveDirectChat] = useState<{ name: string; city: string } | null>(null);
  const [isChatCardOpen, setIsChatCardOpen] = useState(true);
  const [isChatCardMinimized, setIsChatCardMinimized] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 640;
    }
    return false;
  });
  const [chatChannel, setChatChannel] = useState<'world' | 'district' | 'proximity' | 'dm'>('world');
  const [chatInput, setChatInput] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  // Audio and View mode
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [cameraViewMode, setCameraViewMode] = useState<'third_person' | 'close_up'>('third_person');

  // Responsive device and viewport tracking
  const [viewportProfile, setViewportProfile] = useState(() => {
    if (typeof window === 'undefined') {
      return { width: 1280, height: 720, isMobile: false, isTablet: false, isDesktop: true, isPortrait: false, isShortScreen: false };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      width: w,
      height: h,
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1024,
      isDesktop: w >= 1024,
      isPortrait: w < h,
      isShortScreen: h < 520,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setViewportProfile({
        width: w,
        height: h,
        isMobile: w < 640,
        isTablet: w >= 640 && w < 1024,
        isDesktop: w >= 1024,
        isPortrait: w < h,
        isShortScreen: h < 520,
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Mobile virtual joystick and camera touch state
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraTouchIdRef = useRef<number | null>(null);
  const previousCameraTouchRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pinchDistanceRef = useRef<number | null>(null);
  const cameraDistanceRef = useRef<number>(9.0);
  const [joystickVector, setJoystickVector] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isMobileControlsVisible, setIsMobileControlsVisible] = useState(false);

  // Controls Ref
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // 3D Scene Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerGroupRef = useRef<THREE.Group | null>(null);
  const playerPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 18));
  const playerRotationRef = useRef<number>(0);
  const cameraAngleRef = useRef<{ horizontal: number; vertical: number }>({ horizontal: 0, vertical: 0.3 });
  const currentLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.5, 18));
  const vehiclesRef = useRef<MovingVehicle[]>([]);

  // Action State Ref for 60fps game loop
  const actionStateRef = useRef({
    action: currentAction,
    toggleMovementMode,
    isRunMode,
    expression: currentExpression,
    isPraying,
    prayerPhase,
    isSitting,
    isResting,
  });

  useEffect(() => {
    actionStateRef.current = {
      action: currentAction,
      toggleMovementMode,
      isRunMode,
      expression: currentExpression,
      isPraying,
      prayerPhase,
      isSitting,
      isResting,
    };
  }, [currentAction, toggleMovementMode, isRunMode, currentExpression, isPraying, prayerPhase, isSitting, isResting]);

  // Other Player Avatars in World
  const otherAvatarsRef = useRef<OtherAvatar[]>([
    {
      id: 'p1',
      name: 'Tariq_KSA',
      city: 'Makkah',
      outfitColor: 0x10b981,
      position: new THREE.Vector3(8, 0, 4),
      targetPosition: new THREE.Vector3(18, 0, -10),
      rotation: 0,
      isWalking: true,
      statusText: 'Quiz Champion',
    },
    {
      id: 'p2',
      name: 'Fatima_Lagos',
      city: 'Lagos',
      outfitColor: 0x3b82f6,
      position: new THREE.Vector3(-12, 0, -8),
      targetPosition: new THREE.Vector3(-4, 0, 12),
      rotation: Math.PI / 2,
      isWalking: true,
      statusText: 'Bazaar Explorer',
    },
    {
      id: 'p3',
      name: 'Amir_Cairo',
      city: 'Cairo',
      outfitColor: 0xf59e0b,
      position: new THREE.Vector3(-20, 0, 2),
      targetPosition: new THREE.Vector3(-10, 0, 18),
      rotation: Math.PI,
      isWalking: true,
      statusText: 'Guild Leader',
    },
    {
      id: 'p4',
      name: 'Zainab_DXB',
      city: 'Dubai',
      outfitColor: 0xec4899,
      position: new THREE.Vector3(15, 0, -15),
      targetPosition: new THREE.Vector3(-5, 0, -25),
      rotation: -Math.PI / 4,
      isWalking: true,
      statusText: 'Trading Partner',
    },
    {
      id: 'p5',
      name: 'Youssef_Kano',
      city: 'Kano',
      outfitColor: 0x8b5cf6,
      position: new THREE.Vector3(2, 0, 22),
      targetPosition: new THREE.Vector3(-18, 0, 14),
      rotation: Math.PI / 3,
      isWalking: true,
      statusText: 'Heritage Scholar',
    },
    {
      id: 'p6',
      name: 'Maryam_Abuja',
      city: 'Abuja',
      outfitColor: 0x06b6d4,
      position: new THREE.Vector3(-6, 0, -38),
      targetPosition: new THREE.Vector3(6, 0, -42),
      rotation: 0,
      isWalking: true,
      statusText: 'Mosque Architect',
    },
    {
      id: 'p7',
      name: 'Bilal_Casablanca',
      city: 'Casablanca',
      outfitColor: 0xe11d48,
      position: new THREE.Vector3(-32, 0, 18),
      targetPosition: new THREE.Vector3(-18, 0, 28),
      rotation: Math.PI / 4,
      isWalking: true,
      statusText: 'Silk Merchant',
    },
    {
      id: 'p8',
      name: 'Amina_Dakar',
      city: 'Dakar',
      outfitColor: 0x14b8a6,
      position: new THREE.Vector3(22, 0, -5),
      targetPosition: new THREE.Vector3(30, 0, 10),
      rotation: -Math.PI / 2,
      isWalking: true,
      statusText: 'Esports Contender',
    },
    {
      id: 'p9',
      name: 'Kareem_Istanbul',
      city: 'Istanbul',
      outfitColor: 0xf97316,
      position: new THREE.Vector3(-38, 0, -18),
      targetPosition: new THREE.Vector3(-25, 0, -10),
      rotation: Math.PI / 6,
      isWalking: true,
      statusText: 'Campus Scholar',
    },
  ]);

  const [projectedTags, setProjectedTags] = useState<Array<{ id: string; name: string; city: string; x: number; y: number; visible: boolean; dist: number }>>([]);

  // Toast Helper
  const showToast = useCallback((msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3000);
  }, []);

  // Detect mobile
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobileControlsVisible(isTouch);
  }, []);

  // Helper to build 3D Humanoid Avatar Mesh with Facial Geometry and Full Customization
  const create3DAvatarMesh = (customCfg?: Partial<AvatarCustomization> | number, isSelf = false) => {
    const rawCfg: Partial<AvatarCustomization> = typeof customCfg === 'number' ? { outfitColorHex: customCfg } : (customCfg || {});
    const cfg: AvatarCustomization = {
      gender: rawCfg.gender || (isSelf ? avatarConfig.gender : 'brother'),
      skinTone: rawCfg.skinTone || (isSelf ? avatarConfig.skinTone : 'tan'),
      skinColorHex: rawCfg.skinColorHex || (isSelf ? avatarConfig.skinColorHex : 0xc68a4c),
      headwear: rawCfg.headwear || (isSelf ? avatarConfig.headwear : 'white_taqiyah'),
      hairStyle: rawCfg.hairStyle || (isSelf ? avatarConfig.hairStyle : 'fade'),
      hairColorHex: rawCfg.hairColorHex || (isSelf ? avatarConfig.hairColorHex : 0x18181b),
      beardStyle: rawCfg.beardStyle || (isSelf ? avatarConfig.beardStyle : 'sunnah_beard'),
      outfit: rawCfg.outfit || (isSelf ? avatarConfig.outfit : 'white_thobe'),
      outfitColorHex: rawCfg.outfitColorHex || (isSelf ? avatarConfig.outfitColorHex : (isSelf ? 0x059669 : 0x3b82f6)),
      outfitSecondaryHex: rawCfg.outfitSecondaryHex || (isSelf ? avatarConfig.outfitSecondaryHex : 0xf59e0b),
      shoes: rawCfg.shoes || (isSelf ? avatarConfig.shoes : 'leather_sandals'),
      shoeColorHex: rawCfg.shoeColorHex || (isSelf ? avatarConfig.shoeColorHex : 0x78350f),
      accessory: rawCfg.accessory || (isSelf ? avatarConfig.accessory : 'amber_tasbih'),
      expression: rawCfg.expression || (isSelf ? avatarConfig.expression : 'Happy'),
    };

    const group = new THREE.Group();
    const isSister = cfg.gender === 'sister';

    const skinMat = new THREE.MeshStandardMaterial({ color: cfg.skinColorHex, roughness: 0.55 });
    const outfitMat = new THREE.MeshStandardMaterial({ color: cfg.outfitColorHex, roughness: 0.45, metalness: 0.1 });
    const accentMat = new THREE.MeshStandardMaterial({ color: cfg.outfitSecondaryHex, roughness: 0.3, metalness: 0.4 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: cfg.shoeColorHex, roughness: 0.5 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });

    // 1. Body / Robe
    if (cfg.outfit.includes('thobe') || cfg.outfit.includes('jalabiyya') || cfg.outfit.includes('abaya') || cfg.outfit.includes('djellaba')) {
      const bodyGeo = new THREE.CylinderGeometry(0.34, 0.54, 1.45, 16);
      const bodyMesh = new THREE.Mesh(bodyGeo, outfitMat);
      bodyMesh.name = 'bodyMesh';
      bodyMesh.position.y = 0.9;
      bodyMesh.castShadow = true;
      group.add(bodyMesh);

      // Gold Trim Belt / Embroidery Placket
      const placket = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.45), accentMat);
      placket.position.set(0, 1.25, 0.35);
      group.add(placket);
    } else {
      const torsoGeo = new THREE.BoxGeometry(0.68, 0.72, 0.36);
      const bodyMesh = new THREE.Mesh(torsoGeo, outfitMat);
      bodyMesh.name = 'bodyMesh';
      bodyMesh.position.y = 1.15;
      bodyMesh.castShadow = true;
      group.add(bodyMesh);

      [-0.16, 0.16].forEach((lx) => {
        const legGeo = new THREE.CylinderGeometry(0.12, 0.11, 0.70, 8);
        const legMesh = new THREE.Mesh(legGeo, darkMat);
        legMesh.position.set(lx, 0.40, 0);
        group.add(legMesh);
      });
    }

    // 2. Head & Facial Geometry
    const headGeo = new THREE.SphereGeometry(0.32, 16, 16);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headMesh.name = 'headMesh';
    headMesh.position.y = 1.85;
    headMesh.castShadow = true;

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.name = 'leftEye';
    leftEye.position.set(-0.09, 0.04, 0.28);
    headMesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.name = 'rightEye';
    rightEye.position.set(0.09, 0.04, 0.28);
    headMesh.add(rightEye);

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.08, 0.018, 0.015);
    const browMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.name = 'leftBrow';
    leftBrow.position.set(-0.09, 0.11, 0.29);
    headMesh.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.name = 'rightBrow';
    rightBrow.position.set(0.09, 0.11, 0.29);
    headMesh.add(rightBrow);

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.12, 0.03, 0.02);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x9f1239 });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.name = 'mouthMesh';
    mouthMesh.position.set(0, -0.08, 0.29);
    headMesh.add(mouthMesh);

    group.add(headMesh);

    // 3. Headwear & Modest Hijab
    if (cfg.headwear.startsWith('hijab_') || isSister) {
      let hijabColor = cfg.headwear === 'hijab_rose' ? 0xf43f5e 
        : cfg.headwear === 'hijab_obsidian' ? 0x18181b 
        : cfg.headwear === 'hijab_navy' ? 0x1e3a8a 
        : cfg.headwear === 'hijab_pearl' ? 0xf8fafc 
        : 0x059669;
      
      const hijabMat = new THREE.MeshStandardMaterial({ color: hijabColor, roughness: 0.45 });
      const hijabDome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), hijabMat);
      hijabDome.name = 'hatMesh';
      hijabDome.position.set(0, 1.88, -0.02);
      group.add(hijabDome);

      const hijabShoulders = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.45, 16), hijabMat);
      hijabShoulders.position.set(0, 1.55, 0);
      group.add(hijabShoulders);
    } else if (cfg.headwear.includes('taqiyah')) {
      const tColor = cfg.headwear === 'gold_taqiyah' ? 0xd97706 : cfg.headwear === 'black_taqiyah' ? 0x18181b : 0xffffff;
      const taqiyahMat = new THREE.MeshStandardMaterial({ color: tColor, roughness: 0.5 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.33, 0.18, 16), taqiyahMat);
      cap.name = 'hatMesh';
      cap.position.set(0, 2.02, 0);
      group.add(cap);
    } else if (cfg.headwear.includes('keffiyeh')) {
      const kColor = cfg.headwear === 'keffiyeh_red' ? 0x991b1b : 0xf8fafc;
      const keffiyehMat = new THREE.MeshStandardMaterial({ color: kColor, roughness: 0.5 });
      const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), keffiyehMat);
      wrap.name = 'hatMesh';
      wrap.position.set(0, 1.90, 0);
      group.add(wrap);

      const agal = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.03, 6, 16), darkMat);
      agal.rotation.x = Math.PI / 2;
      agal.position.set(0, 2.04, 0);
      group.add(agal);
    } else {
      const hairMat = new THREE.MeshStandardMaterial({ color: cfg.hairColorHex, roughness: 0.8 });
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 16), hairMat);
      hair.name = 'hatMesh';
      hair.position.set(0, 1.90, -0.03);
      group.add(hair);
    }

    // Beard (for Brothers)
    if (!isSister && cfg.beardStyle !== 'clean') {
      const beardMat = new THREE.MeshStandardMaterial({ color: cfg.hairColorHex, roughness: 0.8 });
      const beardGeo = new THREE.BoxGeometry(0.24, 0.18, 0.16);
      const beardMesh = new THREE.Mesh(beardGeo, beardMat);
      beardMesh.position.set(0, 1.62, 0.22);
      group.add(beardMesh);
    }

    // 4. Arms
    const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: cfg.outfitColorHex });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.45, 1.1, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.name = 'rightArm';
    rightArm.position.set(0.45, 1.1, 0);
    group.add(rightArm);

    // 5. Legs & Shoes
    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.name = 'leftLeg';
    leftLeg.position.set(-0.2, 0.3, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.name = 'rightLeg';
    rightLeg.position.set(0.2, 0.3, 0);
    group.add(rightLeg);

    // 6. Accessories
    if (cfg.accessory === 'amber_tasbih') {
      const tasbihMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.3 });
      const tasbih = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16), tasbihMat);
      tasbih.position.set(0.48, 0.72, 0.05);
      group.add(tasbih);
    } else if (cfg.accessory === 'gold_watch') {
      const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.04, 12), goldMat);
      watch.position.set(-0.44, 0.80, 0);
      group.add(watch);
    }

    return group;
  };

  // Helper to create 3D Vehicle / Car Mesh with proper headlights, taillights, and wheel axes
  const createVehicleMesh = (colorHex: number, type: 'sedan' | 'taxi' | 'suv' | 'cruiser' | 'van' = 'sedan') => {
    const carGroup = new THREE.Group();
    const wheels: THREE.Mesh[] = [];

    // Dimensions according to vehicle classification
    const length = type === 'van' ? 5.2 : type === 'suv' ? 4.8 : 4.4;
    const width = type === 'suv' ? 2.4 : type === 'van' ? 2.3 : 2.2;
    const height = type === 'van' ? 1.2 : 0.9;

    // Body chassis
    const bodyGeo = new THREE.BoxGeometry(width, height, length);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      metalness: type === 'taxi' ? 0.35 : 0.7,
      roughness: type === 'taxi' ? 0.35 : 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height * 0.5 + 0.35;
    body.castShadow = true;
    carGroup.add(body);

    // Roof cabin
    const cabinHeight = type === 'van' ? 1.05 : type === 'suv' ? 0.85 : 0.72;
    const cabinLength = type === 'van' ? 3.4 : 2.3;
    const cabinGeo = new THREE.BoxGeometry(width * 0.85, cabinHeight, cabinLength);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, body.position.y + height * 0.5 + cabinHeight * 0.5, -0.2);
    carGroup.add(cabin);

    // Taxi Roof Light Sign
    if (type === 'taxi') {
      const taxiSignGeo = new THREE.BoxGeometry(0.8, 0.28, 0.38);
      const taxiSignMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const taxiSign = new THREE.Mesh(taxiSignGeo, taxiSignMat);
      taxiSign.position.set(0, cabin.position.y + cabinHeight * 0.5 + 0.18, -0.2);
      carGroup.add(taxiSign);
    }

    // Glowing Dual Front Headlights (Pointing along +Z Front)
    const lightGeo = new THREE.BoxGeometry(0.32, 0.18, 0.1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const leftLight = new THREE.Mesh(lightGeo, lightMat);
    leftLight.position.set(-width * 0.36, body.position.y + 0.05, length * 0.5 + 0.02);
    carGroup.add(leftLight);

    const rightLight = new THREE.Mesh(lightGeo, lightMat);
    rightLight.position.set(width * 0.36, body.position.y + 0.05, length * 0.5 + 0.02);
    carGroup.add(rightLight);

    // Headlight Beam Cones
    const beamGeo = new THREE.ConeGeometry(0.8, 3.5, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.15 });
    [-width * 0.36, width * 0.36].forEach((bx) => {
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.rotation.x = -Math.PI / 2;
      beam.position.set(bx, body.position.y - 0.1, length * 0.5 + 1.8);
      carGroup.add(beam);
    });

    // Glowing Dual Red Taillights (Pointing along -Z Back)
    const tailGeo = new THREE.BoxGeometry(0.3, 0.16, 0.08);
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const leftTail = new THREE.Mesh(tailGeo, tailMat);
    leftTail.position.set(-width * 0.36, body.position.y + 0.05, -length * 0.5 - 0.02);
    carGroup.add(leftTail);

    const rightTail = new THREE.Mesh(tailGeo, tailMat);
    rightTail.position.set(width * 0.36, body.position.y + 0.05, -length * 0.5 - 0.02);
    carGroup.add(rightTail);

    // Wheels
    const wheelRadius = type === 'suv' ? 0.42 : 0.36;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.8 });
    const halfW = width * 0.5 + 0.04;
    const halfL = length * 0.33;
    const wheelPos: [number, number, number][] = [
      [-halfW, wheelRadius, halfL],
      [halfW, wheelRadius, halfL],
      [-halfW, wheelRadius, -halfL],
      [halfW, wheelRadius, -halfL],
    ];

    wheelPos.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      carGroup.add(wheel);
      wheels.push(wheel);
    });

    return { carGroup, wheels };
  };

  // Dynamically update facial expression on 3D Head Mesh
  const updateFacialFeatures = useCallback((expression: ExpressionType) => {
    if (!playerGroupRef.current) return;
    const headMesh = playerGroupRef.current.getObjectByName('headMesh');
    if (!headMesh) return;

    const leftBrow = headMesh.getObjectByName('leftBrow');
    const rightBrow = headMesh.getObjectByName('rightBrow');
    const mouthMesh = headMesh.getObjectByName('mouthMesh');
    const leftEye = headMesh.getObjectByName('leftEye');
    const rightEye = headMesh.getObjectByName('rightEye');

    if (!leftBrow || !rightBrow || !mouthMesh || !leftEye || !rightEye) return;

    switch (expression) {
      case 'Neutral':
        leftBrow.rotation.z = 0;
        rightBrow.rotation.z = 0;
        leftBrow.position.y = 0.11;
        rightBrow.position.y = 0.11;
        mouthMesh.scale.set(1, 1, 1);
        mouthMesh.position.set(0, -0.08, 0.26);
        leftEye.scale.set(1, 1, 1);
        rightEye.scale.set(1, 1, 1);
        break;

      case 'Happy':
      case 'Smile':
        leftBrow.rotation.z = -0.15;
        rightBrow.rotation.z = 0.15;
        leftBrow.position.y = 0.13;
        rightBrow.position.y = 0.13;
        mouthMesh.scale.set(1.4, 2.2, 1);
        mouthMesh.position.set(0, -0.07, 0.26);
        leftEye.scale.set(1.1, 0.8, 1);
        rightEye.scale.set(1.1, 0.8, 1);
        break;

      case 'Laugh':
        leftBrow.rotation.z = -0.25;
        rightBrow.rotation.z = 0.25;
        leftBrow.position.y = 0.15;
        rightBrow.position.y = 0.15;
        mouthMesh.scale.set(1.8, 3.2, 1);
        mouthMesh.position.set(0, -0.09, 0.26);
        leftEye.scale.set(1.2, 0.6, 1);
        rightEye.scale.set(1.2, 0.6, 1);
        break;

      case 'Sad':
        leftBrow.rotation.z = 0.25;
        rightBrow.rotation.z = -0.25;
        leftBrow.position.y = 0.10;
        rightBrow.position.y = 0.10;
        mouthMesh.scale.set(1.1, 1.4, 1);
        mouthMesh.position.set(0, -0.10, 0.26);
        leftEye.scale.set(0.9, 0.9, 1);
        rightEye.scale.set(0.9, 0.9, 1);
        break;

      case 'Angry':
        leftBrow.rotation.z = -0.4;
        rightBrow.rotation.z = 0.4;
        leftBrow.position.y = 0.08;
        rightBrow.position.y = 0.08;
        mouthMesh.scale.set(1.2, 0.8, 1);
        mouthMesh.position.set(0, -0.09, 0.26);
        leftEye.scale.set(1, 1, 1);
        rightEye.scale.set(1, 1, 1);
        break;

      case 'Surprised':
        leftBrow.rotation.z = 0;
        rightBrow.rotation.z = 0;
        leftBrow.position.y = 0.18;
        rightBrow.position.y = 0.18;
        mouthMesh.scale.set(1.5, 3.0, 1);
        mouthMesh.position.set(0, -0.08, 0.26);
        leftEye.scale.set(1.4, 1.4, 1);
        rightEye.scale.set(1.4, 1.4, 1);
        break;

      case 'Calm':
        leftBrow.rotation.z = -0.05;
        rightBrow.rotation.z = 0.05;
        leftBrow.position.y = 0.12;
        rightBrow.position.y = 0.12;
        mouthMesh.scale.set(1.2, 1.2, 1);
        mouthMesh.position.set(0, -0.08, 0.26);
        leftEye.scale.set(1, 0.7, 1);
        rightEye.scale.set(1, 0.7, 1);
        break;
    }
  }, []);

  // Synchronize Ambient Audio Gain
  useEffect(() => {
    if (ambientGainRef.current && audioCtxRef.current) {
      if (isAudioEnabled) {
        if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
        ambientGainRef.current.gain.setTargetAtTime(0.03, audioCtxRef.current.currentTime, 0.1);
      } else {
        ambientGainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.1);
      }
    }
  }, [isAudioEnabled]);

  // Candidate Seat Positions throughout Baraka City (Plaza & Park Benches)
  const SEAT_LOCATIONS = [
    new THREE.Vector3(26, 0, -28), // Park Bench West
    new THREE.Vector3(38, 0, -28), // Park Bench East
    new THREE.Vector3(32, 0, -34), // Park Bench North
    new THREE.Vector3(32, 0, -22), // Park Bench South
    new THREE.Vector3(12, 0, 10),  // Plaza Promenade Bench East
    new THREE.Vector3(-12, 0, 10), // Plaza Promenade Bench West
    new THREE.Vector3(18, 0, 18),  // Residence Home Divan
  ];

  // =========================================================================
  // GENUINE DIRECT GAME ACTION CONTROLLER SYSTEM (TOGGLE & INSTANT EXECUTION)
  // No popups, no modals, no menus, no fake alerts. Direct character control.
  // =========================================================================

  // 1. WALK: Tap once -> character physically walks forward; Tap again -> stops & returns to idle
  const handleActionWalk = () => {
    if (toggleMovementMode === 'walk') {
      // Toggle OFF -> stop walking, return to idle
      setToggleMovementMode(null);
      setIsRunMode(false);
      setCurrentAction('idle');
      playChime(260, 'sine', 0.15);
    } else {
      // Toggle ON -> start physically walking forward
      setIsSitting(false);
      setIsPraying(false);
      setIsResting(false);
      setIsRunMode(false);
      setToggleMovementMode('walk');
      setCurrentAction('walk');
      playChime(340, 'triangle', 0.15);
    }
  };

  // 2. RUN: Tap once -> character physically runs forward; Tap again -> stops & returns to idle
  const handleActionRun = () => {
    if (toggleMovementMode === 'run' || isRunMode) {
      // Toggle OFF -> stop running, return to idle
      setToggleMovementMode(null);
      setIsRunMode(false);
      setCurrentAction('idle');
      playChime(260, 'sine', 0.15);
    } else {
      // Toggle ON -> start physically running through the world
      setIsSitting(false);
      setIsPraying(false);
      setIsResting(false);
      setIsRunMode(true);
      setToggleMovementMode('run');
      setCurrentAction('run');
      playChime(480, 'triangle', 0.15);
    }
  };

  // 3. PRAY: Tap once -> begins Salah sequence; Tap again -> stops & returns to idle standing
  // Activates when in appropriate prayer location (Mosque / Courtyard Sanctuary)
  const handleActionPray = () => {
    if (isPraying) {
      // Toggle OFF -> stop praying, smoothly stand back up
      setIsPraying(false);
      setCurrentAction('idle');
      if (playerGroupRef.current) {
        playerGroupRef.current.position.y = 0;
      }
      playChime(330, 'sine', 0.2);
    } else {
      const distToMosque = playerPositionRef.current.distanceTo(new THREE.Vector3(0, 0, -55));
      if (distToMosque > 48.0) {
        // Guide character naturally towards Grand Mosque entrance
        playerPositionRef.current.set(0, 0, -42);
      }
      // Toggle ON -> start prayer
      setToggleMovementMode(null);
      setIsSitting(false);
      setIsResting(false);
      setIsPraying(true);
      setCurrentAction('pray');
      setPrayerPhase('qiyam');

      // Face towards Qibla direction (Grand Mosque Sanctum [0, 0, -55])
      const qiblaDir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, -55), playerPositionRef.current);
      playerRotationRef.current = Math.atan2(qiblaDir.x, qiblaDir.z);
      playChime(220, 'sine', 0.5);

      // Reward Coins & Complete Sanctuary Prayer Mission
      setMissions((prev) =>
        prev.map((m) => {
          if (m.id === 'm_prayer' || m.id === 'm_mosque') {
            return { ...m, current: 1, completed: true };
          }
          return m;
        })
      );

      setCoins((c) => c + 25);
      playCoinChime();
      setCoinFeedback({
        amount: 25,
        reason: 'Sanctuary Prayer & Remembrance',
        timestamp: Date.now(),
      });
    }
  };

  // 4. SIT: Tap once -> character moves to nearest valid seat and sits naturally; Tap again -> stands up
  const handleActionSit = () => {
    if (isSitting) {
      // Toggle OFF -> Stand up smoothly
      setIsSitting(false);
      isWalkingToSeatRef.current = false;
      targetSeatPosition.current = null;
      setCurrentAction('idle');
      if (playerGroupRef.current) {
        playerGroupRef.current.position.y = 0;
      }
      playChime(392, 'sine', 0.2);
    } else {
      // Find nearest valid seat
      let nearestSeat = SEAT_LOCATIONS[0];
      let minDist = playerPositionRef.current.distanceTo(nearestSeat);
      SEAT_LOCATIONS.forEach((seat) => {
        const d = playerPositionRef.current.distanceTo(seat);
        if (d < minDist) {
          minDist = d;
          nearestSeat = seat;
        }
      });

      // Move player directly onto the seat and initiate sitting posture
      setToggleMovementMode(null);
      setIsPraying(false);
      setIsResting(false);
      playerPositionRef.current.copy(nearestSeat);
      setIsSitting(true);
      setCurrentAction('sit');
      playChime(261.63, 'sine', 0.25);

      // Award reflection bonus if in park
      const distToPark = playerPositionRef.current.distanceTo(new THREE.Vector3(32, 0, -28));
      if (distToPark < 14.0) {
        setCoins((c) => c + 15);
        playCoinChime();
        setCoinFeedback({
          amount: 15,
          reason: 'Peaceful Reflection · Public Park',
          timestamp: Date.now(),
        });
      }
    }
  };

  const handleActionStand = () => {
    setIsSitting(false);
    setIsPraying(false);
    setIsResting(false);
    setToggleMovementMode(null);
    targetSeatPosition.current = null;
    isWalkingToSeatRef.current = false;
    setCurrentAction('idle');
    if (playerGroupRef.current) {
      playerGroupRef.current.position.y = 0;
    }
    playChime(392, 'sine', 0.2);
  };

  // 5. WAVE: Tap -> immediately performs natural wave animation, then automatically returns to idle
  const waveTimeoutRef = useRef<number | null>(null);
  const handleActionWave = () => {
    if (waveTimeoutRef.current) clearTimeout(waveTimeoutRef.current);
    setToggleMovementMode(null);
    setIsSitting(false);
    setIsPraying(false);
    setCurrentAction('wave');
    setCurrentExpression('Happy');
    updateFacialFeatures('Happy');
    playChime(523.25, 'triangle', 0.22);

    greetingsGivenRef.current += 1;
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === 'm_greet') {
          const cur = greetingsGivenRef.current;
          return { ...m, current: Math.min(m.target, cur), completed: cur >= m.target };
        }
        return m;
      })
    );

    waveTimeoutRef.current = window.setTimeout(() => {
      setCurrentAction('idle');
    }, 2400);
  };

  // 6. LAUGH: Tap -> immediately performs natural laughing animation/expression, then returns to idle
  const laughTimeoutRef = useRef<number | null>(null);
  const handleActionLaugh = () => {
    if (laughTimeoutRef.current) clearTimeout(laughTimeoutRef.current);
    setToggleMovementMode(null);
    setIsSitting(false);
    setIsPraying(false);
    setCurrentAction('laugh');
    setCurrentExpression('Laugh');
    updateFacialFeatures('Laugh');
    playChime(659.25, 'sine', 0.15);
    setTimeout(() => playChime(880, 'sine', 0.2), 120);

    laughTimeoutRef.current = window.setTimeout(() => {
      setCurrentAction('idle');
    }, 2600);
  };

  // 7. GREET: Tap -> immediately performs modest respectful greeting gesture, then returns to idle
  const greetTimeoutRef = useRef<number | null>(null);
  const handleActionGreet = () => {
    if (greetTimeoutRef.current) clearTimeout(greetTimeoutRef.current);
    setToggleMovementMode(null);
    setIsSitting(false);
    setIsPraying(false);
    setCurrentAction('greet');
    setCurrentExpression('Calm');
    updateFacialFeatures('Calm');
    playChime(440, 'sine', 0.3);

    greetingsGivenRef.current += 1;
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id === 'm_greet') {
          const cur = greetingsGivenRef.current;
          return { ...m, current: Math.min(m.target, cur), completed: cur >= m.target };
        }
        return m;
      })
    );

    // If near someone, rotate towards them
    if (nearbyPlayer) {
      const otherAvatar = otherAvatarsRef.current.find((a) => a.id === nearbyPlayer.id);
      if (otherAvatar) {
        const dir = new THREE.Vector3().subVectors(otherAvatar.position, playerPositionRef.current);
        playerRotationRef.current = Math.atan2(dir.x, dir.z);
      }
    }

    greetTimeoutRef.current = window.setTimeout(() => {
      setCurrentAction('idle');
    }, 2500);
  };

  // 8. TALK: Tap -> immediately enters talking state directly when another player/NPC is nearby
  const talkTimeoutRef = useRef<number | null>(null);
  const handleActionTalk = () => {
    if (currentAction === 'talk') {
      // Toggle OFF -> stop talking, return to idle
      setCurrentAction('idle');
      if (talkTimeoutRef.current) clearTimeout(talkTimeoutRef.current);
      playChime(330, 'sine', 0.15);
      return;
    }

    if (talkTimeoutRef.current) clearTimeout(talkTimeoutRef.current);
    setToggleMovementMode(null);
    setIsSitting(false);
    setIsPraying(false);
    setCurrentAction('talk');
    playChime(587.33, 'triangle', 0.2);

    if (nearbyPlayer) {
      // Face the nearby citizen directly
      const otherAvatar = otherAvatarsRef.current.find((a) => a.id === nearbyPlayer.id);
      if (otherAvatar) {
        const dir = new THREE.Vector3().subVectors(otherAvatar.position, playerPositionRef.current);
        playerRotationRef.current = Math.atan2(dir.x, dir.z);
      }
      setActiveDirectChat({ name: nearbyPlayer.name, city: nearbyPlayer.city });
      setChatChannel('dm');
      setIsChatCardOpen(true);
      setIsChatCardMinimized(false);
      setTimeout(() => chatInputRef.current?.focus(), 60);
    } else {
      // Find closest citizen in city to turn toward and talk to
      let closest = otherAvatarsRef.current[0];
      let minD = playerPositionRef.current.distanceTo(closest.position);
      otherAvatarsRef.current.forEach((a) => {
        const d = playerPositionRef.current.distanceTo(a.position);
        if (d < minD) {
          minD = d;
          closest = a;
        }
      });
      if (closest && minD < 20.0) {
        const dir = new THREE.Vector3().subVectors(closest.position, playerPositionRef.current);
        playerRotationRef.current = Math.atan2(dir.x, dir.z);
      }
      setIsChatCardOpen(true);
      setIsChatCardMinimized(false);
      setTimeout(() => chatInputRef.current?.focus(), 60);
    }

    // Automatically blend back to idle after speaking gesture completes
    talkTimeoutRef.current = window.setTimeout(() => {
      setCurrentAction('idle');
    }, 3200);
  };

  // 9. INTERACT: Tap -> immediately perform the relevant interaction with nearby object/player/location
  const handleActionInteract = () => {
    const pos = playerPositionRef.current;
    const distToHome = pos.distanceTo(new THREE.Vector3(18, 0, 18));
    const distToMosque = pos.distanceTo(new THREE.Vector3(0, 0, -55));
    const distToBazaar = pos.distanceTo(new THREE.Vector3(-26, 0, 26));
    const distToUni = pos.distanceTo(new THREE.Vector3(-48, 0, -25));

    // Check distance to seats
    let nearestSeatDist = 999;
    SEAT_LOCATIONS.forEach((s) => {
      const d = pos.distanceTo(s);
      if (d < nearestSeatDist) nearestSeatDist = d;
    });

    if (distToUni < 18.0) {
      // Open University Quiz & Knowledge Lecture Modal
      setIsUniversityQuizOpen(true);
      setQuizFeedback(null);
      playChime(523.25, 'triangle', 0.2);
    } else if (distToBazaar < 18.0) {
      // Open Souq Al-Baraka Trading Stall & Tasks Modal
      setIsSouqShopOpen(true);
      playChime(587.33, 'triangle', 0.2);
    } else if (distToMosque < 32.0) {
      // Pray in mosque
      handleActionPray();
    } else if (nearestSeatDist < 3.5) {
      // Sit on bench
      handleActionSit();
    } else if (distToHome < 7.0) {
      // Step in/out of home
      handleToggleHome();
    } else if (nearbyPlayer) {
      // Talk with nearby player
      handleActionTalk();
    } else {
      // Modest wave to the city
      handleActionWave();
    }
  };

  const handleToggleHome = () => {
    setIsInPlayerHome((prev) => {
      const next = !prev;
      playChime(440, 'sine', 0.2);
      if (next) {
        playerPositionRef.current.set(18, 0, 18);
      } else {
        playerPositionRef.current.set(18, 0, 24);
      }
      return next;
    });
  };

  const handleFastTravel = (targetX: number, targetZ: number, districtName: string) => {
    playerPositionRef.current.set(targetX, 0, targetZ);
    playChime(580, 'triangle', 0.25);
    showToast(`Navigated to ${districtName}`);
  };

  const handleSelectExpression = (expr: ExpressionType) => {
    setCurrentExpression(expr);
    updateFacialFeatures(expr);
    setIsExpressionPickerOpen(false);
    playChime(600, 'sine', 0.18);
    showToast(`Facial Expression: ${expr}`);
  };

  // Build Full 3D Living City Environment Scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const skyHorizonColor = new THREE.Color(0x181e33);
    scene.background = skyHorizonColor;
    scene.fog = new THREE.FogExp2(0x181e33, 0.0075);

    // Dynamic Atmospheric Sky Dome with Sunset Twilight Gradient
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d');
    if (skyCtx) {
      const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#0a0d1a'); // Zenith deep dusk
      grad.addColorStop(0.45, '#1e1b4b'); // Twilight indigo
      grad.addColorStop(0.72, '#7c2d12'); // Rich terracotta sunset glow
      grad.addColorStop(0.88, '#d97706'); // Golden amber horizon
      grad.addColorStop(1.0, '#f59e0b'); // Warm glowing horizon
      skyCtx.fillStyle = grad;
      skyCtx.fillRect(0, 0, 512, 512);
    }
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    const skyGeo = new THREE.SphereGeometry(220, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Distant City Silhouette Horizon (Islamic city skyline of towers, arches and domes)
    const skylineGroup = new THREE.Group();
    const silMat = new THREE.MeshBasicMaterial({ color: 0x111625, fog: true });
    for (let i = 0; i < 28; i++) {
      const angle = (i / 28) * Math.PI * 2;
      const dist = 180 + (i % 3) * 15;
      const w = 12 + (i % 4) * 6;
      const h = 25 + ((i * 7) % 35);
      const d = 10;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), silMat);
      tower.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
      tower.rotation.y = -angle;
      skylineGroup.add(tower);

      if (i % 3 === 0) {
        const dDome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), silMat);
        dDome.position.set(Math.cos(angle) * dist, h, Math.sin(angle) * dist);
        skylineGroup.add(dDome);
      }
    }
    scene.add(skylineGroup);

    // Adaptive Perspective Camera with aspect-aware Field of View
    const { fov, aspect, baseDistance } = getAdaptiveCameraParams(width, height);
    cameraDistanceRef.current = baseDistance;
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 400);
    cameraRef.current = camera;
    camera.position.set(0, 5, 26);

    // Renderer with Performance Quality Adaptive Tuning
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || width < 768;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: !isMobileDevice && performanceTier !== 'performance',
      alpha: false,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height, false);
    
    // Performance Tier DPR handling
    const maxDpr = performanceTier === 'performance' ? 1.0 : performanceTier === 'balanced' ? 1.5 : 2.0;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    
    renderer.shadowMap.enabled = performanceTier !== 'performance';
    renderer.shadowMap.type = performanceTier === 'high' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;

    // Rich Ambient, Directional & Hemisphere Lighting
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfef3c7, 1.5);
    sunLight.position.set(60, 75, 45);
    sunLight.castShadow = performanceTier !== 'performance';
    const shadowRes = performanceTier === 'high' ? 2048 : 1024;
    sunLight.shadow.mapSize.width = shadowRes;
    sunLight.shadow.mapSize.height = shadowRes;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 250;
    const d = 75;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Ground Paving / Base Grid
    const groundGeo = new THREE.PlaneGeometry(300, 300);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 1. Roads Network & Sidewalks with Crisp Markings
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e2433, roughness: 0.45 });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
    const lineYellowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const lineWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    // Main East-West Road
    const roadHGeo = new THREE.PlaneGeometry(280, 14);
    const roadH = new THREE.Mesh(roadHGeo, roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.02, 0);
    roadH.receiveShadow = true;
    scene.add(roadH);

    // East-West Road Center Double Yellow Line
    const centerLineH = new THREE.Mesh(new THREE.PlaneGeometry(280, 0.25), lineYellowMat);
    centerLineH.rotation.x = -Math.PI / 2;
    centerLineH.position.set(0, 0.03, 0);
    scene.add(centerLineH);

    // East-West Dashed White Lane Markings
    for (let lx = -130; lx <= 130; lx += 8) {
      if (Math.abs(lx) < 9) continue;
      [-3.5, 3.5].forEach((lz) => {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.2), lineWhiteMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(lx, 0.03, lz);
        scene.add(dash);
      });
    }

    // Main North-South Road
    const roadVGeo = new THREE.PlaneGeometry(14, 280);
    const roadV = new THREE.Mesh(roadVGeo, roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(0, 0.02, 0);
    roadV.receiveShadow = true;
    scene.add(roadV);

    // North-South Center Yellow Line
    const centerLineV = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 280), lineYellowMat);
    centerLineV.rotation.x = -Math.PI / 2;
    centerLineV.position.set(0, 0.03, 0);
    scene.add(centerLineV);

    // Grand Mosque Ceremonial Plaza (Wide decorative Islamic patterned marble promenade)
    const plazaCanvas = document.createElement('canvas');
    plazaCanvas.width = 256;
    plazaCanvas.height = 256;
    const pCtx = plazaCanvas.getContext('2d');
    if (pCtx) {
      pCtx.fillStyle = '#f8fafc';
      pCtx.fillRect(0, 0, 256, 256);
      pCtx.strokeStyle = '#059669';
      pCtx.lineWidth = 4;
      pCtx.strokeRect(8, 8, 240, 240);
      pCtx.strokeStyle = '#d97706';
      pCtx.lineWidth = 2;
      pCtx.beginPath();
      pCtx.arc(128, 128, 80, 0, Math.PI * 2);
      pCtx.stroke();
    }
    const plazaTexture = new THREE.CanvasTexture(plazaCanvas);
    plazaTexture.wrapS = THREE.RepeatWrapping;
    plazaTexture.wrapT = THREE.RepeatWrapping;
    plazaTexture.repeat.set(8, 14);

    const plazaGeo = new THREE.PlaneGeometry(36, 60);
    const plazaMat = new THREE.MeshStandardMaterial({
      map: plazaTexture,
      roughness: 0.3,
      metalness: 0.1,
    });
    const grandPlaza = new THREE.Mesh(plazaGeo, plazaMat);
    grandPlaza.rotation.x = -Math.PI / 2;
    grandPlaza.position.set(0, 0.05, -35);
    grandPlaza.receiveShadow = true;
    scene.add(grandPlaza);

    // Sidewalk Borders
    const sidewalkGeo = new THREE.BoxGeometry(240, 0.15, 3);
    const sidewalk1 = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk1.position.set(0, 0.08, 7.5);
    scene.add(sidewalk1);

    const sidewalk2 = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalk2.position.set(0, 0.08, -7.5);
    scene.add(sidewalk2);

    // 2. Street Lamps along Sidewalks
    for (let x = -90; x <= 90; x += 30) {
      if (Math.abs(x) < 15) continue;
      [8.5, -8.5].forEach((z) => {
        const lampPoleGeo = new THREE.CylinderGeometry(0.1, 0.15, 5, 8);
        const lampPoleMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
        const pole = new THREE.Mesh(lampPoleGeo, lampPoleMat);
        pole.position.set(x, 2.5, z);
        scene.add(pole);

        const bulbGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.set(x, 5, z);
        scene.add(bulb);

        const lampLight = new THREE.PointLight(0xfef08a, 1.2, 18);
        lampLight.position.set(x, 4.8, z);
        scene.add(lampLight);
      });
    }

    // 3. Moving Traffic / Cars on Roads with Waypoint Road Routing
    const createdVehicles: MovingVehicle[] = [];

    // Vehicle 1: Blue Executive Sedan (East-West Boulevard Commuter)
    const v1Data = createVehicleMesh(0x0284c7, 'sedan');
    v1Data.carGroup.position.set(-80, 0, -3.5);
    v1Data.carGroup.rotation.y = Math.PI / 2; // Face Eastbound (+X)
    scene.add(v1Data.carGroup);
    createdVehicles.push({
      id: 'v1',
      name: 'Blue Executive Sedan',
      mesh: v1Data.carGroup,
      colorHex: 0x0284c7,
      type: 'sedan',
      cruiseSpeed: 15,
      currentSpeed: 15,
      waypointIndex: 0,
      wheels: v1Data.wheels,
      stoppedForPedestrian: false,
      stoppedForVehicle: false,
      waypoints: [
        new THREE.Vector3(120, 0, -3.5),
        new THREE.Vector3(126, 0, 0),
        new THREE.Vector3(120, 0, 3.5),
        new THREE.Vector3(-120, 0, 3.5),
        new THREE.Vector3(-126, 0, 0),
        new THREE.Vector3(-120, 0, -3.5),
      ],
    });

    // Vehicle 2: Amber Gold Metro Taxi (Central Cross & Intersection Ring Route)
    const v2Data = createVehicleMesh(0xf59e0b, 'taxi');
    v2Data.carGroup.position.set(70, 0, 3.5);
    v2Data.carGroup.rotation.y = -Math.PI / 2; // Face Westbound (-X)
    scene.add(v2Data.carGroup);
    createdVehicles.push({
      id: 'v2',
      name: 'Baraka Gold Metro Taxi',
      mesh: v2Data.carGroup,
      colorHex: 0xf59e0b,
      type: 'taxi',
      cruiseSpeed: 16,
      currentSpeed: 16,
      waypointIndex: 0,
      wheels: v2Data.wheels,
      stoppedForPedestrian: false,
      stoppedForVehicle: false,
      waypoints: [
        new THREE.Vector3(15, 0, 3.5),
        new THREE.Vector3(3.5, 0, 3.5),
        new THREE.Vector3(0, 0, 1.5),
        new THREE.Vector3(-3.5, 0, -3.5),
        new THREE.Vector3(-3.5, 0, -75),
        new THREE.Vector3(0, 0, -82),
        new THREE.Vector3(3.5, 0, -75),
        new THREE.Vector3(3.5, 0, -15),
        new THREE.Vector3(3.5, 0, -3.5),
        new THREE.Vector3(1.5, 0, 0),
        new THREE.Vector3(-3.5, 0, 3.5),
        new THREE.Vector3(-75, 0, 3.5),
        new THREE.Vector3(-82, 0, 0),
        new THREE.Vector3(-75, 0, -3.5),
        new THREE.Vector3(-15, 0, -3.5),
        new THREE.Vector3(-3.5, 0, -3.5),
        new THREE.Vector3(0, 0, -1.5),
        new THREE.Vector3(3.5, 0, 3.5),
        new THREE.Vector3(3.5, 0, 75),
        new THREE.Vector3(0, 0, 82),
        new THREE.Vector3(-3.5, 0, 75),
        new THREE.Vector3(-3.5, 0, 15),
        new THREE.Vector3(-3.5, 0, 3.5),
        new THREE.Vector3(-1.5, 0, 0),
        new THREE.Vector3(3.5, 0, -3.5),
        new THREE.Vector3(75, 0, -3.5),
        new THREE.Vector3(82, 0, 0),
        new THREE.Vector3(75, 0, 3.5),
      ],
    });

    // Vehicle 3: Pearl White Luxury SUV (North-South Highway Expressway)
    const v3Data = createVehicleMesh(0xf8fafc, 'suv');
    v3Data.carGroup.position.set(3.5, 0, -80);
    v3Data.carGroup.rotation.y = 0; // Face Southbound (+Z)
    scene.add(v3Data.carGroup);
    createdVehicles.push({
      id: 'v3',
      name: 'Pearl White SUV',
      mesh: v3Data.carGroup,
      colorHex: 0xf8fafc,
      type: 'suv',
      cruiseSpeed: 14,
      currentSpeed: 14,
      waypointIndex: 0,
      wheels: v3Data.wheels,
      stoppedForPedestrian: false,
      stoppedForVehicle: false,
      waypoints: [
        new THREE.Vector3(3.5, 0, 120),
        new THREE.Vector3(0, 0, 126),
        new THREE.Vector3(-3.5, 0, 120),
        new THREE.Vector3(-3.5, 0, -120),
        new THREE.Vector3(0, 0, -126),
        new THREE.Vector3(3.5, 0, -120),
      ],
    });

    // Vehicle 4: Emerald City Cruiser (Madrasa & Souq West Ring Loop)
    const v4Data = createVehicleMesh(0x10b981, 'cruiser');
    v4Data.carGroup.position.set(-3.5, 0, 70);
    v4Data.carGroup.rotation.y = Math.PI; // Face Northbound (-Z)
    scene.add(v4Data.carGroup);
    createdVehicles.push({
      id: 'v4',
      name: 'Emerald Cruiser',
      mesh: v4Data.carGroup,
      colorHex: 0x10b981,
      type: 'cruiser',
      cruiseSpeed: 15,
      currentSpeed: 15,
      waypointIndex: 0,
      wheels: v4Data.wheels,
      stoppedForPedestrian: false,
      stoppedForVehicle: false,
      waypoints: [
        new THREE.Vector3(-3.5, 0, 15),
        new THREE.Vector3(-3.5, 0, 3.5),
        new THREE.Vector3(-1.5, 0, 0),
        new THREE.Vector3(3.5, 0, -3.5),
        new THREE.Vector3(80, 0, -3.5),
        new THREE.Vector3(86, 0, 0),
        new THREE.Vector3(80, 0, 3.5),
        new THREE.Vector3(15, 0, 3.5),
        new THREE.Vector3(-80, 0, 3.5),
        new THREE.Vector3(-86, 0, 0),
        new THREE.Vector3(-80, 0, -3.5),
        new THREE.Vector3(-15, 0, -3.5),
        new THREE.Vector3(-3.5, 0, -3.5),
        new THREE.Vector3(0, 0, -1.5),
        new THREE.Vector3(3.5, 0, 3.5),
        new THREE.Vector3(3.5, 0, 75),
        new THREE.Vector3(0, 0, 82),
        new THREE.Vector3(-3.5, 0, 75),
      ],
    });

    // Vehicle 5: Slate Express Van (Marketplace Souq Logistics)
    const v5Data = createVehicleMesh(0x475569, 'van');
    v5Data.carGroup.position.set(60, 0, 3.5);
    v5Data.carGroup.rotation.y = -Math.PI / 2;
    scene.add(v5Data.carGroup);
    createdVehicles.push({
      id: 'v5',
      name: 'Souq Delivery Van',
      mesh: v5Data.carGroup,
      colorHex: 0x475569,
      type: 'van',
      cruiseSpeed: 13,
      currentSpeed: 13,
      waypointIndex: 0,
      wheels: v5Data.wheels,
      stoppedForPedestrian: false,
      stoppedForVehicle: false,
      waypoints: [
        new THREE.Vector3(-60, 0, 3.5),
        new THREE.Vector3(-66, 0, 0),
        new THREE.Vector3(-60, 0, -3.5),
        new THREE.Vector3(60, 0, -3.5),
        new THREE.Vector3(66, 0, 0),
        new THREE.Vector3(60, 0, 3.5),
      ],
    });

    // Vehicle 6: Crimson Sports Coupe
    const v6Data = createVehicleMesh(0xe11d48, 'cruiser');
    v6Data.carGroup.position.set(-3.5, 0, -60);
    v6Data.carGroup.rotation.y = Math.PI;
    scene.add(v6Data.carGroup);
    createdVehicles.push({
      id: 'v6',
      name: 'Crimson Coupe',
      mesh: v6Data.carGroup,
      colorHex: 0xe11d48,
      type: 'cruiser',
      cruiseSpeed: 17,
      currentSpeed: 17,
      waypointIndex: 0,
      wheels: v6Data.wheels,
      stoppedForPedestrian: false,
      stoppedForVehicle: false,
      waypoints: [
        new THREE.Vector3(-3.5, 0, -110),
        new THREE.Vector3(0, 0, -116),
        new THREE.Vector3(3.5, 0, -110),
        new THREE.Vector3(3.5, 0, 110),
        new THREE.Vector3(0, 0, 116),
        new THREE.Vector3(-3.5, 0, 110),
      ],
    });

    vehiclesRef.current = createdVehicles;

    // 4. Landmarks & Physical Enterable 3D Buildings
    
    // A. ENTERABLE PLAYER HOME RESIDENCE (Location: [18, 0, 18])
    const homeGroup = new THREE.Group();
    
    // House Floor
    const homeFloorGeo = new THREE.PlaneGeometry(12, 12);
    const homeFloorMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
    const homeFloor = new THREE.Mesh(homeFloorGeo, homeFloorMat);
    homeFloor.rotation.x = -Math.PI / 2;
    homeFloor.position.set(0, 0.05, 0);
    homeFloor.receiveShadow = true;
    homeGroup.add(homeFloor);

    // Living Room Geometric Wool Carpet
    const homeRugGeo = new THREE.PlaneGeometry(5, 5);
    const homeRugMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8 });
    const homeRug = new THREE.Mesh(homeRugGeo, homeRugMat);
    homeRug.rotation.x = -Math.PI / 2;
    homeRug.position.set(-1.5, 0.06, 0);
    homeGroup.add(homeRug);

    // Outer Perimeter Walls (with Open Walkway Front Door)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    
    // Back Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 5.5, 0.4), wallMat);
    backWall.position.set(0, 2.75, -6);
    homeGroup.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 12), wallMat);
    leftWall.position.set(-6, 2.75, 0);
    homeGroup.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 12), wallMat);
    rightWall.position.set(6, 2.75, 0);
    homeGroup.add(rightWall);

    // Front Wall Left Section
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.5, 0.4), wallMat);
    frontWallLeft.position.set(-3.6, 2.75, 6);
    homeGroup.add(frontWallLeft);

    // Front Wall Right Section
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(4.8, 5.5, 0.4), wallMat);
    frontWallRight.position.set(3.6, 2.75, 6);
    homeGroup.add(frontWallRight);

    // Roof Overhead (High ceiling so camera can look inside)
    const roofGeo = new THREE.ConeGeometry(9.5, 3.2, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 7.5, 0);
    roof.rotation.y = Math.PI / 4;
    homeGroup.add(roof);

    // Interior Furniture: L-Shaped Living Room Sofa
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.5 });
    const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.6, 1.2), sofaMat);
    sofaBase.position.set(-2.5, 0.3, -3.5);
    homeGroup.add(sofaBase);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.0, 0.3), sofaMat);
    sofaBack.position.set(-2.5, 0.8, -4.0);
    homeGroup.add(sofaBack);

    // Coffee Table with Moroccan Mint Tea Pot & Glasses
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 1.2), tableMat);
    table.position.set(-2.5, 0.22, -1.8);
    homeGroup.add(table);

    const teaPot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.25, 8), new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 }));
    teaPot.position.set(-2.5, 0.55, -1.8);
    homeGroup.add(teaPot);

    // Bedroom Corner: Comfortable Bed with Pillows
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.6 });
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 3.6), bedMat);
    bedFrame.position.set(3.8, 0.25, -3.2);
    homeGroup.add(bedFrame);

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 3.4), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 }));
    mattress.position.set(3.8, 0.55, -3.2);
    homeGroup.add(mattress);

    const pillow = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 0.8), new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 }));
    pillow.position.set(3.8, 0.75, -4.4);
    homeGroup.add(pillow);

    // Warm Ambient Living Room Chandelier Light
    const homeLight = new THREE.PointLight(0xfef08a, 2.2, 14);
    homeLight.position.set(0, 4.2, 0);
    homeGroup.add(homeLight);

    homeGroup.position.set(18, 0, 18);
    scene.add(homeGroup);

    // B. GRAND MOSQUE (Location: [0, 0, -58]) - Physical Enterable Sanctuary
    const mosqueGroup = new THREE.Group();

    // Mosque Interior Floor
    const mosqueFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 26),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
    );
    mosqueFloor.rotation.x = -Math.PI / 2;
    mosqueFloor.position.set(0, 0.05, 0);
    mosqueFloor.receiveShadow = true;
    mosqueGroup.add(mosqueFloor);

    // Interior Plush Prayer Carpets (Rows of Saff with gold border arches)
    for (let r = 0; r < 4; r++) {
      const carpetMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(24, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.9 })
      );
      carpetMesh.rotation.x = -Math.PI / 2;
      carpetMesh.position.set(0, 0.06, -7 + r * 4.5);
      carpetMesh.receiveShadow = true;
      mosqueGroup.add(carpetMesh);
    }

    // Mosque Outer Walls (with Open Archway at Front Entrance)
    const mWallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 });
    
    // North Wall with sculpted Mihrab Niche
    const mNorthWall = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 0.6), mWallMat);
    mNorthWall.position.set(0, 5, -13);
    mosqueGroup.add(mNorthWall);

    // Mihrab (Ornamental Prayer Niche Facing North / Qibla)
    const mihrabGeo = new THREE.CylinderGeometry(2.2, 2.2, 5.5, 16, 1, false, 0, Math.PI);
    const mihrabMat = new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.3, roughness: 0.2 });
    const mihrab = new THREE.Mesh(mihrabGeo, mihrabMat);
    mihrab.rotation.y = -Math.PI / 2;
    mihrab.position.set(0, 2.8, -12.7);
    mosqueGroup.add(mihrab);

    const mihrabLight = new THREE.PointLight(0xf59e0b, 2.5, 12);
    mihrabLight.position.set(0, 4.0, -11.5);
    mosqueGroup.add(mihrabLight);

    // Wooden Minbar Pulpit with steps
    const minbarGeo = new THREE.BoxGeometry(1.4, 3.2, 2.8);
    const minbarMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const minbar = new THREE.Mesh(minbarGeo, minbarMat);
    minbar.position.set(4.5, 1.6, -11.5);
    mosqueGroup.add(minbar);

    // Quran Recitation Rihla Stand with Open Quran
    const rihlaStand = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.6), new THREE.MeshStandardMaterial({ color: 0x92400e }));
    rihlaStand.position.set(-3.5, 0.45, -10.5);
    mosqueGroup.add(rihlaStand);

    const quranMesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }));
    quranMesh.position.set(-3.5, 0.95, -10.5);
    mosqueGroup.add(quranMesh);

    // East and West Mosque Walls
    const mWestWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 10, 26), mWallMat);
    mWestWall.position.set(-15, 5, 0);
    mosqueGroup.add(mWestWall);

    const mEastWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 10, 26), mWallMat);
    mEastWall.position.set(15, 5, 0);
    mosqueGroup.add(mEastWall);

    // Front Wall with Walkable Grand Arch Portal
    const mFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(11, 10, 0.6), mWallMat);
    mFrontLeft.position.set(-9.5, 5, 13);
    mosqueGroup.add(mFrontLeft);

    const mFrontRight = new THREE.Mesh(new THREE.BoxGeometry(11, 10, 0.6), mWallMat);
    mFrontRight.position.set(9.5, 5, 13);
    mosqueGroup.add(mFrontRight);

    // Grand Dome on High Drum
    const domeGeo = new THREE.SphereGeometry(9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.25, metalness: 0.5 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 15, 0);
    dome.castShadow = true;
    mosqueGroup.add(dome);

    // Golden Crescent Finial
    const crescentGeo = new THREE.TorusGeometry(1.2, 0.25, 12, 24, Math.PI * 1.5);
    const crescentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
    const crescent = new THREE.Mesh(crescentGeo, crescentMat);
    crescent.position.set(0, 24.8, 0);
    crescent.rotation.z = Math.PI / 4;
    mosqueGroup.add(crescent);

    // Four Minarets
    [[-17, -15], [17, -15], [-17, 15], [17, 15]].forEach(([mx, mz]) => {
      const minaret = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 38, 16), mWallMat);
      minaret.position.set(mx, 19, mz);
      minaret.castShadow = true;
      mosqueGroup.add(minaret);

      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.7, 7, 16), crescentMat);
      spire.position.set(mx, 41, mz);
      mosqueGroup.add(spire);

      const mLamp = new THREE.PointLight(0xfef08a, 1.6, 22);
      mLamp.position.set(mx, 33, mz);
      mosqueGroup.add(mLamp);
    });

    mosqueGroup.position.set(0, 0, -58);
    scene.add(mosqueGroup);

    // C. MADRASA & QURAN ACADEMY (Location: [-22, 0, -42])
    const madrasaGroup = new THREE.Group();
    
    // Madrasa Floor & Carpet
    const madrasaFloor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshStandardMaterial({ color: 0x1e1b4b }));
    madrasaFloor.rotation.x = -Math.PI / 2;
    madrasaFloor.position.set(0, 0.05, 0);
    madrasaGroup.add(madrasaFloor);

    // Walls with Open Walkway
    const madrasaWallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const madrasaBack = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.4), madrasaWallMat);
    madrasaBack.position.set(0, 3, -6);
    madrasaGroup.add(madrasaBack);

    const madrasaLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 12), madrasaWallMat);
    madrasaLeft.position.set(-7, 3, 0);
    madrasaGroup.add(madrasaLeft);

    const madrasaRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 12), madrasaWallMat);
    madrasaRight.position.set(7, 3, 0);
    madrasaGroup.add(madrasaRight);

    // Study Desks & Plush Floor Cushions
    for (let c = -4; c <= 4; c += 4) {
      // Low wooden rihla desk
      const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 0.9), new THREE.MeshStandardMaterial({ color: 0x78350f }));
      desk.position.set(c, 0.22, -2.5);
      madrasaGroup.add(desk);

      // Floor Cushion
      const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.2, 12), new THREE.MeshStandardMaterial({ color: 0x059669 }));
      cushion.position.set(c, 0.1, -1.2);
      madrasaGroup.add(cushion);
    }

    // Tall Mahogany Bookcases with Manuscripts
    const bookShelf = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 0.8), new THREE.MeshStandardMaterial({ color: 0x451a03 }));
    bookShelf.position.set(0, 2.3, -5.4);
    madrasaGroup.add(bookShelf);

    const madrasaLight = new THREE.PointLight(0xfef08a, 2.0, 14);
    madrasaLight.position.set(0, 4.5, 0);
    madrasaGroup.add(madrasaLight);

    madrasaGroup.position.set(-22, 0, -42);
    scene.add(madrasaGroup);

    // D. UNIVERSITY LECTURE AMPHITHEATER (Location: [-48, 0, -25])
    const uniGroup = new THREE.Group();
    
    // Tiered Classroom Floor
    const uniFloor = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    uniFloor.rotation.x = -Math.PI / 2;
    uniFloor.position.set(0, 0.05, 0);
    uniGroup.add(uniFloor);

    // Chalkboard on Front Wall
    const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(12, 4.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.6 }));
    boardMesh.position.set(0, 4.2, -8.8);
    uniGroup.add(boardMesh);

    // Professor Podium
    const podium = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    podium.position.set(0, 0.7, -6.5);
    uniGroup.add(podium);

    // Rows of Student Lecture Desks & Chairs
    for (let row = 0; row < 3; row++) {
      const zPos = -3 + row * 3.5;
      const deskRow = new THREE.Mesh(new THREE.BoxGeometry(16, 0.75, 0.9), new THREE.MeshStandardMaterial({ color: 0x92400e }));
      deskRow.position.set(0, 0.4 + row * 0.15, zPos);
      uniGroup.add(deskRow);
    }

    uniGroup.position.set(-48, 0, -25);
    scene.add(uniGroup);

    // E. SOUQ AL-MADINA MARKETPLACE & ENTERABLE SHOPS (Location: [-28, 0, 24])
    const bazaarGroup = new THREE.Group();
    const stallColors = [0x059669, 0xd97706, 0x0284c7, 0xe11d48, 0x8b5cf6];
    for (let i = -2; i <= 2; i++) {
      const stallX = i * 7.5;
      // Stall table counter
      const stallGeo = new THREE.BoxGeometry(4.5, 1.1, 3.2);
      const stallMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const stall = new THREE.Mesh(stallGeo, stallMat);
      stall.position.set(stallX, 0.55, 0);
      stall.castShadow = true;
      bazaarGroup.add(stall);

      // Fabric Canopy Roof
      const canopyGeo = new THREE.ConeGeometry(3.2, 1.6, 4);
      const canopyMat = new THREE.MeshStandardMaterial({ color: stallColors[(i + 2) % stallColors.length], roughness: 0.5 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(stallX, 3.2, 0);
      canopy.rotation.y = Math.PI / 4;
      bazaarGroup.add(canopy);

      // Spice bags and perfume bottles on counter
      const spiceBag = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
      spiceBag.position.set(stallX - 1.2, 1.3, 0);
      bazaarGroup.add(spiceBag);

      const perfumeOud = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x059669, metalness: 0.8 }));
      perfumeOud.position.set(stallX + 1.2, 1.3, 0);
      bazaarGroup.add(perfumeOud);

      const stallLight = new THREE.PointLight(0xfef08a, 1.2, 10);
      stallLight.position.set(stallX, 2.4, 1.2);
      bazaarGroup.add(stallLight);
    }
    bazaarGroup.position.set(-28, 0, 24);
    scene.add(bazaarGroup);

    // F. BARAKA COMMUNITY FOOTBALL PITCH & ARENA (Location: [-45, 0, 52])
    const footballPitchGroup = new THREE.Group();
    
    // Lush Green Football Turf (38m x 24m)
    const pitchTurfGeo = new THREE.PlaneGeometry(38, 24);
    const pitchTurfMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    const pitchTurf = new THREE.Mesh(pitchTurfGeo, pitchTurfMat);
    pitchTurf.rotation.x = -Math.PI / 2;
    pitchTurf.position.set(0, 0.05, 0);
    pitchTurf.receiveShadow = true;
    footballPitchGroup.add(pitchTurf);

    // Chalk Lines & Center Circle
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    
    // Perimeter Touchlines
    const touchLineL = new THREE.Mesh(new THREE.PlaneGeometry(38, 0.2), lineMat);
    touchLineL.rotation.x = -Math.PI / 2;
    touchLineL.position.set(0, 0.06, -11.8);
    footballPitchGroup.add(touchLineL);

    const touchLineR = new THREE.Mesh(new THREE.PlaneGeometry(38, 0.2), lineMat);
    touchLineR.rotation.x = -Math.PI / 2;
    touchLineR.position.set(0, 0.06, 11.8);
    footballPitchGroup.add(touchLineR);

    // Halfway Line & Center Circle
    const halfLine = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 23.6), lineMat);
    halfLine.rotation.x = -Math.PI / 2;
    halfLine.position.set(0, 0.06, 0);
    footballPitchGroup.add(halfLine);

    const centerCircle = new THREE.Mesh(new THREE.RingGeometry(3.8, 4.0, 32), lineMat);
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.set(0, 0.065, 0);
    footballPitchGroup.add(centerCircle);

    // Goalposts (Home Goal at West, Away Goal at East)
    const goalPostMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    [-18.5, 18.5].forEach((gx, gIdx) => {
      const goalPostGroup = new THREE.Group();
      
      // Left and right posts
      [-3.2, 3.2].forEach((pz) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 12), goalPostMat);
        post.position.set(0, 1.6, pz);
        goalPostGroup.add(post);
      });

      // Crossbar
      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6.4, 12), goalPostMat);
      crossbar.rotation.x = Math.PI / 2;
      crossbar.position.set(0, 3.2, 0);
      goalPostGroup.add(crossbar);

      // 3D Goal Net
      const netMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, wireframe: true, transparent: true, opacity: 0.6 });
      const net = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 6.4), netMat);
      net.position.set(gIdx === 0 ? -1.1 : 1.1, 1.6, 0);
      goalPostGroup.add(net);

      goalPostGroup.position.set(gx, 0, 0);
      footballPitchGroup.add(goalPostGroup);
    });

    // Floodlight Towers at corners
    [[-19, -12], [19, -12], [-19, 12], [19, 12]].forEach(([fx, fz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 14, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
      pole.position.set(fx, 7, fz);
      footballPitchGroup.add(pole);

      const fLight = new THREE.PointLight(0xffffff, 1.8, 30);
      fLight.position.set(fx, 13.5, fz);
      footballPitchGroup.add(fLight);
    });

    // Create Physical 3D Interactive Football Mesh
    const ballCanvas = document.createElement('canvas');
    ballCanvas.width = 128;
    ballCanvas.height = 128;
    const bCtx = ballCanvas.getContext('2d');
    if (bCtx) {
      bCtx.fillStyle = '#ffffff';
      bCtx.fillRect(0, 0, 128, 128);
      bCtx.fillStyle = '#0f172a';
      // Classic soccer pentagon patches
      bCtx.beginPath();
      bCtx.arc(64, 64, 28, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.beginPath();
      bCtx.arc(10, 10, 18, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.beginPath();
      bCtx.arc(118, 118, 18, 0, Math.PI * 2);
      bCtx.fill();
    }
    const ballTexture = new THREE.CanvasTexture(ballCanvas);
    const ballGeo = new THREE.SphereGeometry(0.42, 20, 20);
    const ballMat = new THREE.MeshStandardMaterial({ map: ballTexture, roughness: 0.3, metalness: 0.1 });
    const footballMesh = new THREE.Mesh(ballGeo, ballMat);
    footballMesh.position.set(-45, 0.42, 52);
    footballMesh.castShadow = true;
    scene.add(footballMesh);
    footballMeshRef.current = footballMesh;

    footballPitchGroup.position.set(-45, 0, 52);
    scene.add(footballPitchGroup);

    // G. PUBLIC PARK, CENTRAL FOUNTAIN & PERGOLAS (Location: [32, 0, -28])
    const parkGroup = new THREE.Group();
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 }));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, 0.04, 0);
    parkGroup.add(lawn);

    const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    fountainBase.position.set(0, 0.4, 0);
    parkGroup.add(fountainBase);

    const water = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.8 }));
    water.position.set(0, 0.85, 0);
    parkGroup.add(water);

    // Park Benches
    [[-6, 0, 0], [6, 0, 0], [0, 0, -6], [0, 0, 6]].forEach(([bx, by, bz], idx) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x92400e }));
      bench.position.set(bx, 0.3, bz);
      if (idx < 2) bench.rotation.y = Math.PI / 2;
      parkGroup.add(bench);
    });

    parkGroup.position.set(32, 0, -28);
    scene.add(parkGroup);

    // H. MUNICIPAL OFFICES & CIVIC HALL (Location: [50, 0, -18])
    const officeGroup = new THREE.Group();
    const officeBuilding = new THREE.Mesh(new THREE.BoxGeometry(18, 9, 14), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }));
    officeBuilding.position.set(0, 4.5, 0);
    officeGroup.add(officeBuilding);

    // Glass Windows
    for (let f = 1; f <= 2; f++) {
      for (let w = -6; w <= 6; w += 4) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.2), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 }));
        win.position.set(w, f * 3.5, 7.1);
        officeGroup.add(win);
      }
    }

    officeGroup.position.set(50, 0, -18);
    scene.add(officeGroup);

    // Palm trees surrounding streets
    [
      [-30, 15], [30, 15], [-30, -15], [30, -15],
      [-50, 30], [50, 30], [-50, -30], [50, -30]
    ].forEach(([px, pz]) => {
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 7, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(px, 3.5, pz);
      scene.add(trunk);

      const frondGroup = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const frondGeo = new THREE.ConeGeometry(1.0, 4.5, 4);
        const frondMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 });
        const frond = new THREE.Mesh(frondGeo, frondMat);
        frond.rotation.z = Math.PI / 3;
        frond.rotation.y = (i * Math.PI) / 3;
        frond.position.set(0, 6.8, 0);
        frondGroup.add(frond);
      }
      frondGroup.position.set(px, 0, pz);
      scene.add(frondGroup);
    });

    // Create Main Player Avatar
    const playerMesh = create3DAvatarMesh(
      userProfile.outfit.includes('Emerald') ? 0x10b981 : 0x3b82f6,
      true
    );
    playerMesh.position.copy(playerPositionRef.current);
    scene.add(playerMesh);
    playerGroupRef.current = playerMesh;

    // Apply initial facial expression
    updateFacialFeatures(currentExpression);

    // Create Other Player Avatars
    otherAvatarsRef.current.forEach((avatar) => {
      const avatarMesh = create3DAvatarMesh(avatar.outfitColor, false);
      avatarMesh.position.copy(avatar.position);
      scene.add(avatarMesh);
      avatar.mesh = avatarMesh;
    });

    // Window, Device Orientation & Container Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      const { fov, aspect } = getAdaptiveCameraParams(w, h);
      cameraRef.current.aspect = aspect;
      cameraRef.current.fov = fov;
      cameraRef.current.updateProjectionMatrix();

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || w < 768;
      rendererRef.current.setSize(w, h, false);
      const maxDpr = performanceTier === 'performance' ? 1.0 : performanceTier === 'balanced' ? 1.5 : 2.0;
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, [userProfile.outfit, updateFacialFeatures, performanceTier]);

  // Desktop Keyboard & Hotkey Listeners (WASD, Shift Sprint, Space Interact)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName.toLowerCase())) return;
      keysRef.current[e.code] = true;

      // Sprint modifier
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsRunMode(true);
      }

      // Quick key shortcuts
      if (e.code === 'Escape') {
        if (isMissionsModalOpen) setIsMissionsModalOpen(false);
        else if (isSouqShopOpen) setIsSouqShopOpen(false);
        else if (isUniversityQuizOpen) setIsUniversityQuizOpen(false);
        else if (isMenuOpen) setIsMenuOpen(false);
        else if (isExpressionPickerOpen) setIsExpressionPickerOpen(false);
        else if (onExitToLanding) onExitToLanding();
      }
      if (e.code === 'KeyE' || e.code === 'Space') {
        if (e.code === 'Space') e.preventDefault();
        handleActionInteract();
      }
      if (e.code === 'KeyF') {
        if (isSitting) handleActionStand();
        else handleActionSit();
      }
      if (e.code === 'KeyR') {
        if (isRunMode) handleActionWalk();
        else handleActionRun();
      }
      if (e.code === 'KeyP') {
        handleActionPray();
      }
      if (e.code === 'KeyC' || e.code === 'Enter') {
        e.preventDefault();
        setIsChatCardOpen(true);
        setIsChatCardMinimized(false);
        setTimeout(() => chatInputRef.current?.focus(), 50);
      }
      if (e.code === 'KeyM') {
        setIsMinimapExpanded((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (toggleMovementMode !== 'run') {
          setIsRunMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSitting, isRunMode, toggleMovementMode]);

  // Mouse Drag Camera Look Controls
  const isDraggingMouseRef = useRef(false);
  const previousMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingMouseRef.current = true;
    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMouseRef.current) return;
    const deltaX = e.clientX - previousMouseRef.current.x;
    const deltaY = e.clientY - previousMouseRef.current.y;

    cameraAngleRef.current.horizontal -= deltaX * 0.005;
    cameraAngleRef.current.vertical = Math.max(0.05, Math.min(1.2, cameraAngleRef.current.vertical + deltaY * 0.005));

    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingMouseRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    cameraDistanceRef.current = Math.max(4.0, Math.min(14.0, cameraDistanceRef.current + e.deltaY * 0.01));
  };

  // Mobile & Tablet Touch Controls: Virtual Joystick (Left) and Camera Pan/Pinch (Right)
  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent accidental camera drag when tapping interactive HUD or radial buttons
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, [data-interactive], [data-radial-control]')) {
      return;
    }

    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;

    // Detect pinch zoom (2 touches outside joystick)
    if (e.touches.length >= 2) {
      const nonJoystickTouches = Array.from(e.touches).filter((t) => t.identifier !== joystickTouchIdRef.current);
      if (nonJoystickTouches.length >= 2) {
        const dx = nonJoystickTouches[0].clientX - nonJoystickTouches[1].clientX;
        const dy = nonJoystickTouches[0].clientY - nonJoystickTouches[1].clientY;
        pinchDistanceRef.current = Math.hypot(dx, dy);
        return;
      }
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < screenWidth * 0.48) {
        if (joystickTouchIdRef.current === null) {
          joystickTouchIdRef.current = touch.identifier;
          joystickCenterRef.current = { x: touch.clientX, y: touch.clientY };
        }
      } else {
        if (cameraTouchIdRef.current === null) {
          cameraTouchIdRef.current = touch.identifier;
          previousCameraTouchRef.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Handle pinch zoom
    if (e.touches.length >= 2 && pinchDistanceRef.current !== null) {
      const nonJoystickTouches = Array.from(e.touches).filter((t) => t.identifier !== joystickTouchIdRef.current);
      if (nonJoystickTouches.length >= 2) {
        const dx = nonJoystickTouches[0].clientX - nonJoystickTouches[1].clientX;
        const dy = nonJoystickTouches[0].clientY - nonJoystickTouches[1].clientY;
        const currentDist = Math.hypot(dx, dy);
        const delta = currentDist - pinchDistanceRef.current;
        cameraDistanceRef.current = Math.max(4.0, Math.min(14.0, cameraDistanceRef.current - delta * 0.02));
        pinchDistanceRef.current = currentDist;
      }
    }

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Update Joystick
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 45;
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        // Quadratic curve for smooth analog feel (slow walk to full run)
        const normalizedPower = clampedDist / maxRadius;
        const curvedPower = normalizedPower * normalizedPower;

        setJoystickVector({
          x: Math.cos(angle) * curvedPower,
          y: Math.sin(angle) * curvedPower,
        });
      }
      // Update Touch Camera Pan
      if (touch.identifier === cameraTouchIdRef.current) {
        const deltaX = touch.clientX - previousCameraTouchRef.current.x;
        const deltaY = touch.clientY - previousCameraTouchRef.current.y;

        cameraAngleRef.current.horizontal -= deltaX * 0.007;
        cameraAngleRef.current.vertical = Math.max(0.05, Math.min(1.2, cameraAngleRef.current.vertical + deltaY * 0.007));

        previousCameraTouchRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchDistanceRef.current = null;
    }
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickVector({ x: 0, y: 0 });
      }
      if (touch.identifier === cameraTouchIdRef.current) {
        cameraTouchIdRef.current = null;
      }
    }
  };

  // Main 60FPS Game Loop with Procedural 3D Character Animations
  useEffect(() => {
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const SOLID_OBSTACLES: SolidObstacle[] = [
      { id: 'obs_home', name: 'Private Residence', type: 'building', penalty: 5, minX: 12.0, maxX: 24.0, minZ: 11.0, maxZ: 25.0 },
      { id: 'obs_mosque', name: 'Grand Mosque Sanctuary', type: 'building', penalty: 5, minX: -18.0, maxX: 18.0, minZ: -74.0, maxZ: -43.0 },
      { id: 'obs_uni', name: 'Islamic University Campus', type: 'building', penalty: 5, minX: -63.0, maxX: -33.0, minZ: -37.0, maxZ: -13.0 },
      { id: 'obs_bazaar', name: 'Souq Bazaar Stalls', type: 'furniture', penalty: 5, minX: -46.0, maxX: -6.0, minZ: 22.0, maxZ: 30.0 },
      { id: 'obs_apt', name: 'Residential Apartments', type: 'building', penalty: 5, minX: 43.0, maxX: 61.0, minZ: 7.0, maxZ: 23.0 },
      { id: 'obs_fountain', name: 'Central Stone Fountain', type: 'furniture', penalty: 5, centerX: 32.0, centerZ: -28.0, radius: 4.8 },
    ];

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // 1. UPDATE MOVING VEHICLES & REALISTIC ROAD TRAFFIC
      vehiclesRef.current.forEach((veh, vIdx) => {
        const currentPos = veh.mesh.position;
        const targetWp = veh.waypoints[veh.waypointIndex];
        const toWp = new THREE.Vector3(targetWp.x - currentPos.x, 0, targetWp.z - currentPos.z);
        const distToWp = toWp.length();

        // Advance to next waypoint if reached
        if (distToWp < 2.5) {
          veh.waypointIndex = (veh.waypointIndex + 1) % veh.waypoints.length;
        }

        // Steer vehicle towards target waypoint
        const desiredDir = toWp.clone().normalize();
        const targetYaw = Math.atan2(desiredDir.x, desiredDir.z);

        let diff = (targetYaw - veh.mesh.rotation.y) % (Math.PI * 2);
        if (diff > Math.PI) diff -= Math.PI * 2;
        if (diff < -Math.PI) diff += Math.PI * 2;
        veh.mesh.rotation.y += diff * Math.min(1, delta * 6.0);

        // Compute forward vector strictly aligned with vehicle facing direction
        const forward = new THREE.Vector3(Math.sin(veh.mesh.rotation.y), 0, Math.cos(veh.mesh.rotation.y));

        // Pedestrian / Player collision avoidance
        let targetSpeed = veh.cruiseSpeed;
        const toPlayer = new THREE.Vector3().subVectors(playerPositionRef.current, currentPos);
        toPlayer.y = 0;
        const distToPlayer = toPlayer.length();

        if (distToPlayer < 7.0 && forward.dot(toPlayer.clone().normalize()) > 0.65) {
          targetSpeed = 0; // Brake for player
          veh.stoppedForPedestrian = true;
        } else {
          veh.stoppedForPedestrian = false;
        }

        // Leading vehicle spacing and traffic awareness
        for (let j = 0; j < vehiclesRef.current.length; j++) {
          if (j === vIdx) continue;
          const otherVeh = vehiclesRef.current[j];
          const toOther = new THREE.Vector3().subVectors(otherVeh.mesh.position, currentPos);
          toOther.y = 0;
          const distToOther = toOther.length();
          if (distToOther < 9.5 && forward.dot(toOther.clone().normalize()) > 0.75) {
            targetSpeed = Math.min(targetSpeed, Math.max(0, otherVeh.currentSpeed - 2.0));
            veh.stoppedForVehicle = true;
            break;
          }
        }

        // Cornering speed reduction
        if (Math.abs(diff) > 0.35) {
          targetSpeed = Math.min(targetSpeed, 7.5);
        }

        // Smooth acceleration & braking physics
        if (veh.currentSpeed < targetSpeed) {
          veh.currentSpeed = Math.min(targetSpeed, veh.currentSpeed + 12.0 * delta);
        } else if (veh.currentSpeed > targetSpeed) {
          veh.currentSpeed = Math.max(targetSpeed, veh.currentSpeed - 22.0 * delta);
        }

        // Move strictly forward along vehicle heading
        veh.mesh.position.addScaledVector(forward, veh.currentSpeed * delta);

        // Spin wheels based on actual speed
        if (veh.wheels) {
          veh.wheels.forEach((w) => {
            w.rotation.x += veh.currentSpeed * delta * 2.8;
          });
        }
      });

      // 2. MAIN PLAYER MOVEMENT INPUT & REAL COLLISION SYSTEM
      let moveForward = 0;
      let moveSide = 0;

      if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) moveForward += 1;
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) moveForward -= 1;
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) moveSide -= 1;
      if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) moveSide += 1;

      if (Math.abs(joystickVector.y) > 0.1) moveForward -= joystickVector.y;
      if (Math.abs(joystickVector.x) > 0.1) moveSide += joystickVector.x;

      const state = actionStateRef.current;
      if (state.toggleMovementMode === 'walk' && moveForward === 0 && moveSide === 0) {
        moveForward += 1;
      } else if (state.toggleMovementMode === 'run' && moveForward === 0 && moveSide === 0) {
        moveForward += 1;
      }

      const wantsToSprint = isRunMode || state.toggleMovementMode === 'run' || keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight'];
      const isSprinting = wantsToSprint && staminaRef.current > 5;
      const hasSpeedBoost = speedBoostUntil > Date.now();
      const sprintMultiplier = hasSpeedBoost ? 1.45 : 1.0;
      const speed = (isSprinting ? 9.5 * sprintMultiplier : 4.8 * sprintMultiplier) * delta;

      const isMoving = (moveForward !== 0 || moveSide !== 0) && !isSitting && !isPraying && !isResting;

      // GTA-style Stamina Drainage and Regeneration
      if (isMoving && isSprinting) {
        staminaRef.current = Math.max(0, staminaRef.current - delta * 18);
      } else {
        staminaRef.current = Math.min(100, staminaRef.current + delta * 24);
      }

      if (isMoving) {
        const moveVector = new THREE.Vector3(moveSide, 0, -moveForward).normalize();
        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleRef.current.horizontal);

        const intendedPos = playerPositionRef.current.clone().addScaledVector(moveVector, speed);

        // COLLISION DETECTION WITH CARS, BUILDINGS, FURNITURE, AND WALLS
        let hitObstacle: { id: string; name: string; type: 'car' | 'building' | 'furniture' | 'wall'; penalty: number } | null = null;

        // Dynamic Moving Vehicles Collision
        for (let v = 0; v < vehiclesRef.current.length; v++) {
          const veh = vehiclesRef.current[v];
          const distToVeh = intendedPos.distanceTo(veh.mesh.position);
          if (distToVeh < 2.5) {
            hitObstacle = {
              id: `car_${veh.id}`,
              name: veh.name,
              type: 'car',
              penalty: 15,
            };
            const pushDir = new THREE.Vector3().subVectors(intendedPos, veh.mesh.position).normalize();
            pushDir.y = 0;
            if (pushDir.lengthSq() < 0.01) pushDir.set(1, 0, 0);
            intendedPos.copy(veh.mesh.position).addScaledVector(pushDir, 2.7);
            break;
          }
        }

        // Static Solid Obstacles Collision (Buildings, Stalls, Fountain)
        if (!hitObstacle) {
          for (let o = 0; o < SOLID_OBSTACLES.length; o++) {
            const obs = SOLID_OBSTACLES[o];
            if (obs.radius && obs.centerX !== undefined && obs.centerZ !== undefined) {
              const dist = Math.hypot(intendedPos.x - obs.centerX, intendedPos.z - obs.centerZ);
              if (dist < obs.radius) {
                hitObstacle = obs;
                const pushDir = new THREE.Vector3(intendedPos.x - obs.centerX, 0, intendedPos.z - obs.centerZ).normalize();
                intendedPos.set(obs.centerX + pushDir.x * obs.radius, intendedPos.y, obs.centerZ + pushDir.z * obs.radius);
                break;
              }
            } else if (obs.minX !== undefined && obs.maxX !== undefined && obs.minZ !== undefined && obs.maxZ !== undefined) {
              if (intendedPos.x >= obs.minX && intendedPos.x <= obs.maxX && intendedPos.z >= obs.minZ && intendedPos.z <= obs.maxZ) {
                hitObstacle = obs;
                intendedPos.copy(playerPositionRef.current);
                break;
              }
            }
          }
        }

        // Outer City Perimeter Walls
        if (!hitObstacle && (Math.abs(intendedPos.x) > 96 || Math.abs(intendedPos.z) > 96)) {
          hitObstacle = {
            id: 'obs_perimeter_wall',
            name: 'City Perimeter Wall',
            type: 'wall',
            penalty: 5,
          };
          intendedPos.x = Math.max(-96, Math.min(96, intendedPos.x));
          intendedPos.z = Math.max(-96, Math.min(96, intendedPos.z));
        }

        // Apply Coin Penalty with Non-Spam Cooldown
        if (hitObstacle) {
          const now = Date.now();
          const cooldown = 2400; // 2.4s cooldown per obstacle
          if (now - lastCollisionRef.current.timestamp > cooldown || lastCollisionRef.current.id !== hitObstacle.id) {
            lastCollisionRef.current = { id: hitObstacle.id, timestamp: now };
            const penalty = hitObstacle.penalty;
            setCoins((c) => c - penalty);
            playCollisionThud();
            cameraShakeRef.current = hitObstacle.type === 'car' ? 0.35 : 0.15;
            setCoinFeedback({
              amount: -penalty,
              reason: hitObstacle.type === 'car' ? 'Vehicle Bump · Keep to Sidewalks' : `${hitObstacle.name} · Obstacle Collision`,
              timestamp: now,
            });
          }
        }

        // Distance Odometer & Real-time Exploration Earning
        const stepDist = playerPositionRef.current.distanceTo(intendedPos);
        playerPositionRef.current.copy(intendedPos);

        if (stepDist > 0.001) {
          totalMetersWalkedRef.current += stepDist;
          if (totalMetersWalkedRef.current >= nextExplorationBonusRef.current) {
            nextExplorationBonusRef.current += 200;
            setCoins((c) => c + 10);
            playCoinChime();
            setCoinFeedback({
              amount: 10,
              reason: 'City Exploration · 200m Milestone',
              timestamp: Date.now(),
            });
          }
          setMissions((prev) =>
            prev.map((m) => {
              if (m.id === 'm_walk' || m.id === 'w_walk') {
                const cur = Math.floor(totalMetersWalkedRef.current);
                return { ...m, current: Math.min(m.target, cur), completed: cur >= m.target };
              }
              return m;
            })
          );
        }

        const targetRotation = Math.atan2(moveVector.x, moveVector.z);
        playerRotationRef.current = THREE.MathUtils.lerp(playerRotationRef.current, targetRotation, 0.18);

        // Animate legs and arm stride
        if (playerGroupRef.current) {
          const leftArm = playerGroupRef.current.getObjectByName('leftArm');
          const rightArm = playerGroupRef.current.getObjectByName('rightArm');
          const leftLeg = playerGroupRef.current.getObjectByName('leftLeg');
          const rightLeg = playerGroupRef.current.getObjectByName('rightLeg');

          const freq = isSprinting ? 18 : 10;
          const amp = isSprinting ? 0.85 : 0.55;

          const swing = Math.sin(elapsedTime * freq) * amp;
          if (leftLeg) leftLeg.rotation.x = swing;
          if (rightLeg) rightLeg.rotation.x = -swing;
          if (leftArm) leftArm.rotation.x = -swing * 0.9;
          if (rightArm) rightArm.rotation.x = swing * 0.9;
        }

        if (websocketSocket && websocketSocket.readyState === WebSocket.OPEN) {
          websocketSocket.send(
            JSON.stringify({
              type: 'world:move',
              position: [playerPositionRef.current.x, playerPositionRef.current.y, playerPositionRef.current.z],
              world: userProfile.world,
            })
          );
        }
      } else if (playerGroupRef.current) {
        // PROCEDURAL IDLE / ACTION ANIMATION STATES WHEN STATIONARY
        const leftArm = playerGroupRef.current.getObjectByName('leftArm');
        const rightArm = playerGroupRef.current.getObjectByName('rightArm');
        const leftLeg = playerGroupRef.current.getObjectByName('leftLeg');
        const rightLeg = playerGroupRef.current.getObjectByName('rightLeg');
        const bodyMesh = playerGroupRef.current.getObjectByName('bodyMesh');
        const headMesh = playerGroupRef.current.getObjectByName('headMesh');

        if (state.isPraying) {
          // PRAYER ANIMATION SEQUENCE (Takbir -> Ruku -> Sujud -> Tashahhud)
          const cycleTime = (elapsedTime % 12);

          if (cycleTime < 3) {
            // Takbir / Qiyam: Standing, hands raised to ears
            if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.1);
            if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.1);
            if (leftArm) {
              leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -1.8, 0.1);
              leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.4, 0.1);
            }
            if (rightArm) {
              rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -1.8, 0.1);
              rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.4, 0.1);
            }
            if (bodyMesh) bodyMesh.rotation.x = THREE.MathUtils.lerp(bodyMesh.rotation.x, 0, 0.1);
            if (playerGroupRef.current) playerGroupRef.current.position.y = 0;
          } else if (cycleTime < 6) {
            // Ruku: Bowing at waist
            if (bodyMesh) bodyMesh.rotation.x = THREE.MathUtils.lerp(bodyMesh.rotation.x, Math.PI / 2.2, 0.08);
            if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.2, 0.1);
            if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.2, 0.1);
            if (playerGroupRef.current) playerGroupRef.current.position.y = 0;
          } else {
            // Sujud: Prostration
            if (bodyMesh) bodyMesh.rotation.x = THREE.MathUtils.lerp(bodyMesh.rotation.x, Math.PI / 1.8, 0.1);
            if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, Math.PI / 2, 0.1);
            if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, Math.PI / 2, 0.1);
            if (playerGroupRef.current) playerGroupRef.current.position.y = -0.55;
          }
        } else if (state.isSitting) {
          // SITTING POSTURE
          if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, Math.PI / 2, 0.15);
          if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, Math.PI / 2, 0.15);
          if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0.3, 0.15);
          if (rightArm) rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0.3, 0.15);
          if (bodyMesh) bodyMesh.rotation.x = THREE.MathUtils.lerp(bodyMesh.rotation.x, 0, 0.15);
          if (playerGroupRef.current) playerGroupRef.current.position.y = -0.45;
        } else if (state.action === 'laugh') {
          // LAUGHING GESTURE
          const laughBob = Math.sin(elapsedTime * 16) * 0.08;
          if (headMesh) headMesh.position.y = 1.85 + laughBob;
          if (rightArm) rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.8, 0.1);
          if (leftArm) leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.8, 0.1);
          if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.1);
          if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.1);
          if (playerGroupRef.current) playerGroupRef.current.position.y = 0;
        } else if (state.action === 'wave') {
          // WAVING GESTURE
          const waveSwing = Math.sin(elapsedTime * 12) * 0.5;
          if (rightArm) {
            rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -1.8, 0.1);
            rightArm.rotation.x = waveSwing;
          }
          if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.1);
          if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.1);
          if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.1);
          if (playerGroupRef.current) playerGroupRef.current.position.y = 0;
        } else if (state.action === 'greet') {
          // GREET / RESPECTFUL MODEST GESTURE
          if (rightArm) {
            rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -1.2, 0.15);
            rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.6, 0.15);
          }
          if (leftArm) leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.15);
          if (bodyMesh) bodyMesh.rotation.x = THREE.MathUtils.lerp(bodyMesh.rotation.x, 0.18, 0.15); // Gentle respectful head bow
          if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.15);
          if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.15);
          if (playerGroupRef.current) playerGroupRef.current.position.y = 0;
        } else if (state.action === 'talk') {
          // TALKING GESTURE: Conversational hand expression & subtle head nodding
          const talkHandMotion = Math.sin(elapsedTime * 8) * 0.25;
          const talkHeadNod = Math.sin(elapsedTime * 6) * 0.08;
          if (rightArm) {
            rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, -0.8 + talkHandMotion, 0.15);
            rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.4, 0.15);
          }
          if (leftArm) {
            leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, -0.4 - talkHandMotion * 0.5, 0.15);
            leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.3, 0.15);
          }
          if (bodyMesh) bodyMesh.rotation.x = THREE.MathUtils.lerp(bodyMesh.rotation.x, talkHeadNod, 0.12);
          if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.12);
          if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.12);
          if (playerGroupRef.current) playerGroupRef.current.position.y = 0;
        } else {
          // NATURAL IDLE POSTURE with subtle breathing
          const breathing = Math.sin(elapsedTime * 2.5) * 0.02;
          if (leftLeg) leftLeg.rotation.x = THREE.MathUtils.lerp(leftLeg.rotation.x, 0, 0.12);
          if (rightLeg) rightLeg.rotation.x = THREE.MathUtils.lerp(rightLeg.rotation.x, 0, 0.12);
          if (leftArm) {
            leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, 0, 0.12);
            leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0.05 + breathing, 0.12);
          }
          if (rightArm) {
            rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, 0, 0.12);
            rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, -0.05 - breathing, 0.12);
          }
          if (bodyMesh) bodyMesh.rotation.x = THREE.MathUtils.lerp(bodyMesh.rotation.x, 0, 0.12);
          if (headMesh) headMesh.position.y = THREE.MathUtils.lerp(headMesh.position.y, 1.85 + breathing, 0.12);
          if (playerGroupRef.current) playerGroupRef.current.position.y = 0;
        }
      }

      // Update Player Mesh Position & Rotation in Scene
      if (playerGroupRef.current) {
        playerGroupRef.current.position.x = playerPositionRef.current.x;
        playerGroupRef.current.position.z = playerPositionRef.current.z;
        playerGroupRef.current.rotation.y = playerRotationRef.current;
      }

      // Synchronize GTA Radar Minimap & Stamina telemetry at ~12fps
      const nowMs = Date.now();
      if (nowMs - lastRadarUpdateRef.current > 80) {
        lastRadarUpdateRef.current = nowMs;
        setRadarCoords({
          x: Math.round(playerPositionRef.current.x * 10) / 10,
          z: Math.round(playerPositionRef.current.z * 10) / 10,
          rot: playerRotationRef.current,
        });
        setStamina(Math.round(staminaRef.current));
      }

      // 3. GTA-STYLE THIRD-PERSON CAMERA SYSTEM (Obstruction Avoidance, Weight & Damped Following)
      if (cameraRef.current) {
        const aspect = cameraRef.current.aspect || 1.6;
        const isPortrait = aspect < 1.0;
        const isCloseUp = cameraViewMode === 'close_up';

        const baseDistance = cameraDistanceRef.current;
        let camDistance = isCloseUp ? 4.2 : baseDistance;
        const heightRatio = isPortrait ? 0.50 : 0.42;
        const camHeight = isCloseUp ? 2.0 : (camDistance * heightRatio);

        const horiz = cameraAngleRef.current.horizontal;
        const vert = cameraAngleRef.current.vertical;

        // Calculate ideal unconstrained camera position
        let camX = playerPositionRef.current.x + camDistance * Math.sin(horiz) * Math.cos(vert);
        let camY = Math.max(1.6, playerPositionRef.current.y + camHeight + camDistance * Math.sin(vert));
        let camZ = playerPositionRef.current.z + camDistance * Math.cos(horiz) * Math.cos(vert);

        // Camera Obstruction & Collision Handling against City Buildings
        for (let o = 0; o < SOLID_OBSTACLES.length; o++) {
          const obs = SOLID_OBSTACLES[o];
          if (obs.minX !== undefined && obs.maxX !== undefined && obs.minZ !== undefined && obs.maxZ !== undefined) {
            // Buffer zone of 1.5m around building walls
            if (camX >= obs.minX - 1.2 && camX <= obs.maxX + 1.2 && camZ >= obs.minZ - 1.2 && camZ <= obs.maxZ + 1.2) {
              camDistance = Math.max(3.2, camDistance * 0.65);
              camX = playerPositionRef.current.x + camDistance * Math.sin(horiz) * Math.cos(vert);
              camY = Math.max(2.4, playerPositionRef.current.y + camDistance * heightRatio + camDistance * Math.sin(vert));
              camZ = playerPositionRef.current.z + camDistance * Math.cos(horiz) * Math.cos(vert);
              break;
            }
          }
        }

        // Apply smooth camera position spring interpolation (GTA camera weight)
        const targetCamPos = new THREE.Vector3(camX, camY, camZ);
        cameraRef.current.position.lerp(targetCamPos, 0.16);

        // Dynamic FOV speed breathing when sprinting
        const targetFov = isSprinting ? (isPortrait ? 82 : 62) : (isPortrait ? 76 : 56);
        cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFov, 0.08);
        cameraRef.current.updateProjectionMatrix();

        // Smooth camera look target follow (focusing on character upper body/head)
        const lookTargetY = isPortrait ? 1.75 : 1.45;
        const targetLook = new THREE.Vector3(
          playerPositionRef.current.x,
          playerPositionRef.current.y + lookTargetY,
          playerPositionRef.current.z
        );
        currentLookAtRef.current.lerp(targetLook, 0.22);
        cameraRef.current.lookAt(currentLookAtRef.current);
      }

      // 3. PHYSICAL 3D INTERACTIVE FOOTBALL SIMULATION
      const fb = footballPhysicsRef.current;
      if (footballMeshRef.current) {
        // Apply friction/drag decay
        fb.vx *= Math.pow(0.975, delta * 60);
        fb.vz *= Math.pow(0.975, delta * 60);

        // Apply gravity
        fb.vy -= 18.0 * delta;
        fb.y += fb.vy * delta;

        // Ground bounce
        if (fb.y <= 0.42) {
          fb.y = 0.42;
          if (Math.abs(fb.vy) > 0.8) {
            fb.vy = -fb.vy * 0.55;
          } else {
            fb.vy = 0;
          }
        }

        // Update position
        fb.x += fb.vx * delta;
        fb.z += fb.vz * delta;

        // Pitch lateral boundary bouncing
        if (fb.z < 40.5) { fb.z = 40.5; fb.vz = -fb.vz * 0.6; }
        if (fb.z > 63.5) { fb.z = 63.5; fb.vz = -fb.vz * 0.6; }

        // Goal Detection: Goal West (Home net at x < -63, z in [48.8, 55.2])
        if (fb.x < -63.5 && fb.z >= 48.8 && fb.z <= 55.2) {
          if (Date.now() - (fb.goalCelebrationUntil || 0) > 4000) {
            fb.goalCelebrationUntil = Date.now() + 4000;
            fb.scoreAway += 1;
            setFootballScore({ home: fb.scoreHome, away: fb.scoreAway });
            playCoinChime();
            setCoins((c) => c + 50);
            setGoalCelebration('⚽ GOAL! AWAY TEAM SCORED! +50 COINS');
            setTimeout(() => {
              fb.x = -45; fb.y = 0.42; fb.z = 52; fb.vx = 0; fb.vy = 0; fb.vz = 0;
              setGoalCelebration(null);
            }, 3000);
          }
        } else if (fb.x > -26.5 && fb.z >= 48.8 && fb.z <= 55.2) {
          // Goal East (Away net at x > -26.5, z in [48.8, 55.2])
          if (Date.now() - (fb.goalCelebrationUntil || 0) > 4000) {
            fb.goalCelebrationUntil = Date.now() + 4000;
            fb.scoreHome += 1;
            setFootballScore({ home: fb.scoreHome, away: fb.scoreAway });
            playCoinChime();
            setCoins((c) => c + 50);
            setGoalCelebration('⚽ GOOOAAAL! HOME TEAM SCORED! +50 COINS');
            setTimeout(() => {
              fb.x = -45; fb.y = 0.42; fb.z = 52; fb.vx = 0; fb.vy = 0; fb.vz = 0;
              setGoalCelebration(null);
            }, 3000);
          }
        }

        // Pitch outer boundary containment
        if (fb.x < -64) { fb.x = -64; fb.vx = -fb.vx * 0.6; }
        if (fb.x > -26) { fb.x = -26; fb.vx = -fb.vx * 0.6; }

        // Player kick & dribble collision
        const distToBall = playerPositionRef.current.distanceTo(new THREE.Vector3(fb.x, playerPositionRef.current.y, fb.z));
        if (distToBall < 1.4) {
          const kickDir = new THREE.Vector3().subVectors(new THREE.Vector3(fb.x, 0, fb.z), playerPositionRef.current).normalize();
          if (kickDir.lengthSq() < 0.01) kickDir.set(0, 0, 1);
          const kickPower = isSprinting ? 24 : 12;
          fb.vx = kickDir.x * kickPower;
          fb.vz = kickDir.z * kickPower;
          fb.vy = isSprinting ? 3.5 : 1.2;
          playChime(320, 'sine', 0.12);
        }

        // Sync mesh position & rolling spin
        footballMeshRef.current.position.set(fb.x, fb.y, fb.z);
        footballMeshRef.current.rotation.x += fb.vz * delta * 4;
        footballMeshRef.current.rotation.z -= fb.vx * delta * 4;
      }

      // District Telemetry Detection
      const px = playerPositionRef.current.x;
      const pz = playerPositionRef.current.z;
      let newDist = 'Central Boulevard';
      if (pz < -45) {
        newDist = 'Grand Mosque Sanctuary';
      } else if (px < -35 && pz > 38) {
        newDist = 'Baraka Football Arena';
      } else if (px < -14 && pz > 10) {
        newDist = 'Souq Al-Madina Bazaar';
      } else if (px < -15 && pz < -30) {
        newDist = 'Madrasa Quran Academy';
      } else if (px < -35 && pz < -10) {
        newDist = 'Bayt Al-Hikma University';
      } else if (px > 12 && pz > 10) {
        newDist = 'Residential Quarter';
      } else if (px > 20 && pz < -15) {
        newDist = 'Public Park & Fountain';
      } else {
        newDist = 'Central Boulevard';
      }
      if (newDist !== currentDistrictRef.current) {
        currentDistrictRef.current = newDist;
        setCurrentDistrict(newDist);
      }

      // 4. DYNAMIC CONTEXT-AWARE IN-WORLD INTERACTION DETECTION
      let detectedPrompt: { text: string; actionKey: string; subText?: string; onExecute: () => void } | null = null;

      // A. Mosque Sanctuary (Near Mihrab or Prayer Carpets)
      if (pz < -45 && Math.abs(px) < 14) {
        if (Math.hypot(px, pz - (-68)) < 5.0) {
          detectedPrompt = {
            text: 'PRAY SALAH IN MIHRAB SANCTUARY',
            subText: 'Join congregation & receive Baraka blessings (+25 Coins)',
            actionKey: 'P',
            onExecute: handleActionPray,
          };
        } else if (Math.hypot(px - (-3.5), pz - (-68.5)) < 3.0) {
          detectedPrompt = {
            text: 'RECITE QURAN MANUSCRIPT',
            subText: 'Contemplate sacred verses on wooden rihla (+20 Coins)',
            actionKey: 'E',
            onExecute: () => {
              playChime(660, 'sine', 0.4);
              setCoins((c) => c + 20);
              showToast('Reciting Surah Al-Fatiha · +20 Baraka Coins');
              setCoinFeedback({ amount: 20, reason: 'Quran Recitation in Sanctuary', timestamp: Date.now() });
            },
          };
        } else {
          detectedPrompt = {
            text: 'PERFORM CONGREGATIONAL PRAYER',
            subText: 'Align on prayer saff rows',
            actionKey: 'P',
            onExecute: handleActionPray,
          };
        }
      }
      // B. Madrasa (Near Study Desks & Cushions)
      else if (Math.hypot(px - (-22), pz - (-42)) < 5.5) {
        detectedPrompt = {
          text: 'STUDY TAJWEED & HADITH',
          subText: 'Sit on floor cushion & review sacred texts (+25 Coins)',
          actionKey: 'E',
          onExecute: () => {
            playChime(520, 'sine', 0.35);
            setCoins((c) => c + 25);
            showToast('Studied Hadith on Kindness · +25 Baraka Coins');
            setCoinFeedback({ amount: 25, reason: 'Madrasa Study Session', timestamp: Date.now() });
          },
        };
      }
      // C. University Classrooms (Lecture Seats)
      else if (Math.hypot(px - (-48), pz - (-25)) < 7.5) {
        detectedPrompt = {
          text: 'ATTEND ISLAMIC SCIENCE LECTURE',
          subText: 'Open Madrasa knowledge quiz & lecture challenge',
          actionKey: 'E',
          onExecute: () => setIsUniversityQuizOpen(true),
        };
      }
      // D. Souq Al-Madina Bazaar & Shops
      else if (Math.hypot(px - (-28), pz - 24) < 7.0) {
        detectedPrompt = {
          text: 'BROWSE SOUQ BAZAAR & TRADE',
          subText: 'Shop perfumes, spices, outfits & donate Sadaqah',
          actionKey: 'E',
          onExecute: () => setIsSouqShopOpen(true),
        };
      }
      // E. Baraka Football Arena
      else if (px >= -64 && px <= -26 && pz >= 40 && pz <= 64) {
        const distToBallPrompt = playerPositionRef.current.distanceTo(new THREE.Vector3(fb.x, playerPositionRef.current.y, fb.z));
        detectedPrompt = {
          text: distToBallPrompt < 2.5 ? 'KICK / DRIBBLE FOOTBALL' : 'FOOTBALL PITCH · SPRINT TO BALL',
          subText: `Score: Home ${fb.scoreHome} - ${fb.scoreAway} Away · Score to earn +50 Coins!`,
          actionKey: 'E',
          onExecute: () => {
            const kickDir = new THREE.Vector3().subVectors(new THREE.Vector3(fb.x, 0, fb.z), playerPositionRef.current).normalize();
            if (kickDir.lengthSq() < 0.01) kickDir.set(0, 0, 1);
            fb.vx = kickDir.x * 24;
            fb.vz = kickDir.z * 24;
            fb.vy = 3.5;
            playChime(440, 'sine', 0.15);
            showToast('Kicked Football with Power!');
          },
        };
      }
      // F. Player Residence (Living room, Bed, Tea)
      else if (Math.hypot(px - 18, pz - 18) < 6.5) {
        if (Math.hypot(px - 15.5, pz - 14.5) < 2.6) {
          detectedPrompt = {
            text: 'SIT ON LIVING ROOM SOFA',
            subText: 'Relax in your private residence',
            actionKey: 'F',
            onExecute: () => {
              if (isSitting) handleActionStand();
              else handleActionSit();
            },
          };
        } else if (Math.hypot(px - 21.8, pz - 14.8) < 2.6) {
          detectedPrompt = {
            text: 'SLEEP & REST IN BED',
            subText: 'Restores citizen energy and vitality to 100%',
            actionKey: 'E',
            onExecute: () => {
              playChime(330, 'sine', 0.5);
              setIsResting(true);
              showToast('Resting peacefully in bed · Energy 100% restored');
              setTimeout(() => setIsResting(false), 3000);
            },
          };
        } else if (Math.hypot(px - 15.5, pz - 16.2) < 2.2) {
          detectedPrompt = {
            text: 'DRINK MOROCCAN MINT TEA',
            subText: 'Grants +45% Speed Boost for 60 seconds',
            actionKey: 'E',
            onExecute: () => {
              playChime(580, 'sine', 0.3);
              setSpeedBoostUntil(Date.now() + 60000);
              showToast('Drank refreshing Moroccan Mint Tea · Speed Boost Active (60s)');
            },
          };
        } else {
          detectedPrompt = {
            text: 'PLAYER RESIDENCE',
            subText: 'Walk inside your home',
            actionKey: 'E',
            onExecute: () => showToast('Welcome home, Citizen!'),
          };
        }
      }
      // G. Public Park
      else if (Math.hypot(px - 32, pz - (-28)) < 6.5) {
        detectedPrompt = {
          text: 'SIT ON PARK BENCH',
          subText: 'Enjoy fountain view & serene nature',
          actionKey: 'F',
          onExecute: () => {
            if (isSitting) handleActionStand();
            else handleActionSit();
          },
        };
      }
      // H. Municipal Offices
      else if (Math.hypot(px - 50, pz - (-18)) < 6.5) {
        detectedPrompt = {
          text: 'REGISTER CIVIC COMMUNITY SERVICE',
          subText: 'Log your daily civic tasks at municipal terminal (+30 Coins)',
          actionKey: 'E',
          onExecute: () => {
            playCoinChime();
            setCoins((c) => c + 30);
            showToast('Civic Community Service Registered · +30 Baraka Coins');
            setCoinFeedback({ amount: 30, reason: 'Municipal Civic Service', timestamp: Date.now() });
          },
        };
      }

      setContextPrompt(detectedPrompt);

      // 4. Check Proximity to Player Home ([18, 0, 18])
      const distToHome = playerPositionRef.current.distanceTo(new THREE.Vector3(18, 0, 18));
      setIsNearHome(distToHome < 6.0);

      // 5. Update Other Player Avatars Walking around
      let closestPlayer: { id: string; name: string; city: string; distance: number } | null = null;
      let minDistance = Infinity;

      const newProjectedTags: Array<{ id: string; name: string; city: string; x: number; y: number; visible: boolean; dist: number }> = [];

      otherAvatarsRef.current.forEach((avatar) => {
        if (avatar.isWalking) {
          const dir = new THREE.Vector3().subVectors(avatar.targetPosition, avatar.position);
          const distToTarget = dir.length();

          if (distToTarget < 1.0) {
            avatar.targetPosition.set((Math.random() - 0.5) * 80, 0, (Math.random() - 0.5) * 80);
          } else {
            dir.normalize();
            avatar.position.addScaledVector(dir, 2.8 * delta);
            avatar.rotation = THREE.MathUtils.lerp(avatar.rotation, Math.atan2(dir.x, dir.z), 0.1);
          }
        }

        if (avatar.mesh) {
          avatar.mesh.position.copy(avatar.position);
          avatar.mesh.rotation.y = avatar.rotation;

          const leftLeg = avatar.mesh.getObjectByName('leftLeg');
          const rightLeg = avatar.mesh.getObjectByName('rightLeg');
          if (leftLeg) leftLeg.rotation.x = Math.sin(elapsedTime * 8) * 0.5;
          if (rightLeg) rightLeg.rotation.x = -Math.sin(elapsedTime * 8) * 0.5;
        }

        const distanceToMainPlayer = playerPositionRef.current.distanceTo(avatar.position);
        if (distanceToMainPlayer < minDistance) {
          minDistance = distanceToMainPlayer;
          if (distanceToMainPlayer <= 5.0) {
            closestPlayer = {
              id: avatar.id,
              name: avatar.name,
              city: avatar.city,
              distance: Math.round(distanceToMainPlayer * 10) / 10,
            };
          }
        }

        // Screen Tags Projection
        if (cameraRef.current && containerRef.current) {
          const headPos = avatar.position.clone().add(new THREE.Vector3(0, 2.4, 0));
          headPos.project(cameraRef.current);

          const isBehind = headPos.z > 1;
          const containerW = containerRef.current.clientWidth;
          const containerH = containerRef.current.clientHeight;

          const screenX = ((headPos.x + 1) * containerW) / 2;
          const screenY = ((-headPos.y + 1) * containerH) / 2;

          newProjectedTags.push({
            id: avatar.id,
            name: avatar.name,
            city: avatar.city,
            x: screenX,
            y: screenY,
            visible: !isBehind && distanceToMainPlayer < 45,
            dist: Math.round(distanceToMainPlayer),
          });
        }
      });

      // 6. Project 3D Floating Speech Bubbles for Proximity Chat
      if (cameraRef.current && containerRef.current) {
        const curTime = Date.now();
        speechBubblesRef.current = speechBubblesRef.current.filter((b) => b.expiresAt > curTime);
        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;
        const bubbles: Array<{ id: string; senderName: string; text: string; isSelf: boolean; x: number; y: number; visible: boolean }> = [];

        speechBubblesRef.current.forEach((b) => {
          const pos = new THREE.Vector3(b.position[0], b.position[1], b.position[2]);
          pos.project(cameraRef.current!);
          const isBehind = pos.z > 1;
          const sx = ((pos.x + 1) * containerW) / 2;
          const sy = ((-pos.y + 1) * containerH) / 2;
          bubbles.push({
            id: b.id,
            senderName: b.senderName,
            text: b.text,
            isSelf: b.isSelf,
            x: sx,
            y: sy,
            visible: !isBehind,
          });
        });
        setProjectedSpeechBubbles(bubbles);
      }

      setNearbyPlayer(closestPlayer);
      setProjectedTags(newProjectedTags);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [joystickVector, cameraViewMode, isRunMode, websocketSocket, userProfile.world]);

  // Sync incoming multiplayer chat messages to 3D speech bubbles
  useEffect(() => {
    if (!chatMessages || chatMessages.length === 0) return;
    const latest = chatMessages[chatMessages.length - 1];
    if (!latest) return;

    const senderAvatar = otherAvatarsRef.current.find((a) => a.name.toLowerCase() === latest.senderName.toLowerCase());
    const bubblePos: [number, number, number] = senderAvatar
      ? [senderAvatar.position.x, senderAvatar.position.y + 2.4, senderAvatar.position.z]
      : [playerPositionRef.current.x, playerPositionRef.current.y + 2.4, playerPositionRef.current.z];

    const newBubble: SpeechBubble = {
      id: latest.id || 'msg-' + Date.now(),
      senderName: latest.senderName,
      text: latest.text,
      isSelf: latest.senderName === userProfile.name,
      position: bubblePos,
      timestamp: Date.now(),
      expiresAt: Date.now() + 6500,
    };
    speechBubblesRef.current = [...speechBubblesRef.current.filter((b) => b.id !== newBubble.id), newBubble];
  }, [chatMessages, userProfile.name]);

  // Auto-scroll chat messages to bottom when new messages arrive
  useEffect(() => {
    if (chatMessagesEndRef.current && isChatCardOpen && !isChatCardMinimized) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatCardOpen, isChatCardMinimized]);

  const handleAddFriendClick = (friendName: string, city: string) => {
    setAddedFriends((prev) => ({ ...prev, [friendName]: true }));
    if (onAddFriend) {
      onAddFriend(friendName, city);
    }
  };

  const handleSendChatMessage = (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const raw = customText !== undefined ? customText : chatInput;
    if (!raw.trim()) return;
    const text = raw.trim();

    // Create 3D speech bubble over main player in Three.js scene
    const newBubble: SpeechBubble = {
      id: 'bubble-' + Date.now(),
      senderName: userProfile.name,
      text,
      isSelf: true,
      position: [playerPositionRef.current.x, playerPositionRef.current.y + 2.4, playerPositionRef.current.z],
      timestamp: Date.now(),
      expiresAt: Date.now() + 6500,
    };
    speechBubblesRef.current = [...speechBubblesRef.current, newBubble];

    const targetChannel = activeDirectChat
      ? `dm:${activeDirectChat.name}`
      : chatChannel === 'district'
      ? `district:${currentDistrict.toLowerCase().replace(/\s+/g, '_')}`
      : chatChannel === 'proximity'
      ? 'proximity'
      : 'global';

    if (onSendChatMessage) {
      onSendChatMessage(text, targetChannel);
    }
    playChime(587.33, 'triangle', 0.18);
    setChatInput('');
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[100dvh] min-h-[100dvh] overflow-hidden bg-black select-none touch-none font-sora"
    >
      {/* 3D WebGL Canvas filling 100% of the screen */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing touch-none" />

      {/* Top Floating World Header Navigation */}
      <div className="absolute top-[max(env(safe-area-inset-top),0.75rem)] sm:top-[max(env(safe-area-inset-top),1rem)] left-[max(env(safe-area-inset-left),0.75rem)] sm:left-[max(env(safe-area-inset-left),1rem)] right-[max(env(safe-area-inset-right),0.75rem)] sm:right-[max(env(safe-area-inset-right),1rem)] z-20 flex items-center justify-between pointer-events-none gap-1.5 sm:gap-2">
        {/* Top Left: Return to First Page & Brand Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto shrink-0">
          {/* Prominent Back to First Page Button - Never wraps into multiple lines */}
          <button
            onClick={() => onExitToLanding && onExitToLanding()}
            className="flex items-center gap-1.5 sm:gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 active:scale-95 border border-emerald-500/40 text-emerald-300 hover:text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-2xl backdrop-blur-md group shrink-0 whitespace-nowrap"
            title="Return to First Page / Baraka City Homepage [Esc]"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform shrink-0" />
            <span className="hidden sm:inline">BACK TO HOME</span>
            <span className="sm:hidden font-extrabold">HOME</span>
          </button>

          {/* Baraka City Brand Badge (Desktop / Tablet) */}
          <div className="hidden md:flex items-center gap-2 bg-black/70 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-2xl shrink-0">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
            <span className="text-xs font-black uppercase tracking-wider text-white whitespace-nowrap">BARAKA CITY</span>
          </div>
        </div>

        {/* Center: Dedicated Coin Balance Section & Qibla Compass HUD */}
        <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto shrink-0">
          {/* Small, Dedicated Real-time Continuous Coin Balance Section */}
          <CoinBalanceDisplay coins={coins} />

          {/* Live World Status & Qibla Compass HUD (Desktop / Tablet) */}
          <div className="hidden lg:flex items-center gap-3 bg-black/70 border border-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-2xl shadow-2xl shrink-0">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
              <span className="text-[10px] font-hud font-bold text-white uppercase tracking-wider">QIBLA: NORTH</span>
            </div>
            <span className="text-zinc-600">|</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] font-hud text-emerald-400 font-bold uppercase">{userProfile.world || 'ABUJA'} LIVE · {onlineCount}</span>
            </div>
          </div>
        </div>

        {/* Top Right: View Controls & Hamburger Drawer Toggle */}
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0">
          {/* Quick Chat Open Toggle Button */}
          <button
            onClick={() => {
              setIsChatCardOpen(true);
              setIsChatCardMinimized(false);
              setTimeout(() => chatInputRef.current?.focus(), 60);
            }}
            className={`p-1.5 sm:px-3 sm:py-2 border backdrop-blur-md rounded-xl transition-all cursor-pointer shadow-lg flex items-center justify-center gap-1.5 active:scale-95 shrink-0 ${
              isChatCardOpen && !isChatCardMinimized
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                : 'bg-black/70 border-white/10 text-white hover:border-emerald-500'
            }`}
            title="Real-Time Citizens World & Proximity Chat [Key C]"
          >
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider">CHAT</span>
            {onlineCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse hidden sm:inline" />
            )}
          </button>

          {/* Dedicated 3D Avatar Customization Studio Button */}
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="p-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg active:scale-95 border border-emerald-300/40 shrink-0"
            title="Open 3D Avatar Customizer Studio"
          >
            <Palette className="w-3.5 h-3.5 text-black shrink-0" />
            <span className="hidden sm:inline">CUSTOMIZE</span>
          </button>

          {/* Camera View Switcher (Desktop & Tablet) */}
          <button
            onClick={() => setCameraViewMode(cameraViewMode === 'third_person' ? 'close_up' : 'third_person')}
            className="hidden sm:flex px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-black/70 border border-white/10 backdrop-blur-md text-white rounded-xl text-xs font-extrabold uppercase tracking-wider hover:border-emerald-500 transition-all cursor-pointer items-center gap-1.5 shadow-lg shrink-0"
            title="Toggle Third Person / Close-up Camera View"
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{cameraViewMode === 'third_person' ? '3RD PERSON' : 'CLOSE UP'}</span>
          </button>

          {/* Audio Switcher */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className="p-1.5 sm:p-2 bg-black/70 border border-white/10 backdrop-blur-md text-white rounded-xl hover:border-emerald-500 transition-all cursor-pointer shadow-lg shrink-0 flex items-center justify-center"
            title="Toggle Ambient Sound"
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 shrink-0" />}
          </button>

          {/* Minimal Overlay Hamburger Menu Drawer Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 sm:p-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all cursor-pointer shadow-lg shrink-0 flex items-center justify-center"
            title="Character Control Drawer"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </button>
        </div>
      </div>

      {/* RESPONSIVE PLAYER STATUS HUD (Player Name, District Location, Health/Vitality, Tasks/Missions) */}
      <div className="absolute top-[calc(max(env(safe-area-inset-top),0.75rem)+2.75rem)] sm:top-[calc(max(env(safe-area-inset-top),1rem)+3.5rem)] left-[max(env(safe-area-inset-left),0.75rem)] sm:left-[max(env(safe-area-inset-left),1rem)] z-20 pointer-events-none max-w-[calc(100vw-1.5rem)] sm:max-w-xs transition-all duration-300">
        {isPlayerHudMinimized ? (
          /* Sleek Collapsed HUD Pill for Clean Mobile Immersion */
          <div className="bg-black/85 hover:bg-black/95 border border-emerald-500/40 backdrop-blur-xl px-2.5 py-1.5 rounded-2xl shadow-2xl pointer-events-auto flex items-center gap-2 animate-fadeIn transition-all">
            <button
              onClick={() => setIsPlayerHudMinimized(false)}
              className="flex items-center gap-1.5 text-left cursor-pointer group"
              title="Tap to Expand Citizen Status & Quests"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-[11px] font-black uppercase text-white tracking-wide truncate max-w-[100px] xs:max-w-[130px]">
                {userProfile.name}
              </span>
              <span className="text-[8px] font-hud text-emerald-400 bg-emerald-500/15 px-1 py-0.5 rounded font-bold uppercase shrink-0">
                100% HP
              </span>
            </button>

            <span className="text-zinc-600">|</span>

            <button
              onClick={() => setIsMissionsModalOpen(true)}
              className="flex items-center gap-1 text-[10px] text-zinc-300 hover:text-emerald-300 font-bold uppercase cursor-pointer"
              title="Open Tasks & Missions"
            >
              <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[9px] font-hud bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 py-0.2 rounded font-black">
                {missions.filter((m) => m.completed && !m.claimed).length > 0
                  ? `${missions.filter((m) => m.completed && !m.claimed).length} CLAIM`
                  : `${missions.filter((m) => m.completed).length}/${missions.length}`}
              </span>
            </button>

            <button
              onClick={() => setIsPlayerHudMinimized(false)}
              className="p-0.5 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Expand Player Card"
            >
              <ChevronDown className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          </div>
        ) : (
          /* Full Responsive HUD Glass Card (Clean, Uncluttered, No Duplicate Coins) */
          <div className="bg-black/85 border border-white/15 backdrop-blur-xl p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl pointer-events-auto flex flex-col gap-1.5 sm:gap-2 w-72 xs:w-80 sm:w-full animate-fadeIn transition-all">
            {/* Top Header: Player Name + Online Dot + Minimize/Collapse Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-xs font-black uppercase text-white truncate tracking-wide">
                  {userProfile.name}
                </span>
                <span className="text-[8px] font-hud text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                  ACTIVE
                </span>
              </div>
              
              {/* Collapse button for mobile comfort */}
              <button
                onClick={() => setIsPlayerHudMinimized(true)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase shrink-0"
                title="Minimize Player HUD to Pill"
              >
                <span className="text-[8px] hidden xs:inline text-zinc-400">MINIMIZE</span>
                <ChevronUp className="w-3.5 h-3.5 text-zinc-300" />
              </button>
            </div>

            {/* Location & Vitality Info */}
            <div className="flex items-center justify-between gap-2 text-[9px] font-hud text-zinc-300">
              <div className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate uppercase text-zinc-300 font-semibold">{currentDistrict}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Activity className="w-3 h-3 text-emerald-400" />
                <span className="text-[9px] text-emerald-400 font-bold">100% HEALTH</span>
              </div>
            </div>

            {/* Micro Health / Vitality Bar */}
            <div className="w-full h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
            </div>

            {/* Quick Access Missions / Quests Pill Button */}
            <button
              onClick={() => setIsMissionsModalOpen(true)}
              className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 px-2.5 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <span className="flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>TASKS & MISSIONS</span>
              </span>
              <span className="bg-emerald-400 text-black px-1.5 py-0.5 rounded font-black text-[8px]">
                {missions.filter((m) => m.completed && !m.claimed).length > 0
                  ? `${missions.filter((m) => m.completed && !m.claimed).length} CLAIMABLE`
                  : `${missions.filter((m) => m.completed).length}/${missions.length}`}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Coin Feedback Notification Chip */}
      {coinFeedback && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl shadow-2xl backdrop-blur-md border flex items-center gap-2.5 animate-bounce font-hud text-xs font-black uppercase tracking-wider pointer-events-none ${
            coinFeedback.amount > 0
              ? 'bg-emerald-950/95 border-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
              : 'bg-rose-950/95 border-rose-400 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.5)]'
          }`}
        >
          {coinFeedback.amount > 0 ? (
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          )}
          <span>
            {coinFeedback.amount > 0 ? `+${coinFeedback.amount} Coins` : `${coinFeedback.amount} Coins`}
          </span>
          <span className="text-zinc-300 text-[10px] font-medium lowercase">
            · {coinFeedback.reason}
          </span>
        </div>
      )}

      {/* Floating 3D Player Name Tags projected onto Screen */}
      {projectedTags.map((tag) => {
        if (!tag.visible) return null;
        return (
          <div
            key={tag.id}
            style={{
              position: 'absolute',
              left: `${tag.x}px`,
              top: `${tag.y}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="pointer-events-none z-10 flex flex-col items-center animate-fadeIn"
          >
            <div className="bg-black/80 border border-emerald-500/40 text-white px-3 py-1 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-1.5 whitespace-nowrap text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="uppercase text-white tracking-wider">{tag.name}</span>
              <span className="text-[9px] font-hud text-zinc-400">({tag.city})</span>
            </div>
            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-emerald-500/60 mt-0.5"></div>
          </div>
        );
      })}

      {/* Action Notification Toast Floating Above Action Bar */}
      {actionToast && (
        <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-40 bg-[#12151f] border border-emerald-500 text-white px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-fadeIn">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE-FIRST RADIAL/CIRCULAR ACTION CONTROL SYSTEM                        */}
      {/* ========================================================================= */}
      <div className="absolute bottom-[max(env(safe-area-inset-bottom),1.5rem)] right-[max(env(safe-area-inset-right),1.5rem)] z-30 pointer-events-auto">
        {/* Floating Expression Picker Popup */}
        {isExpressionPickerOpen && (
          <div className="absolute bottom-44 right-0 mb-4 bg-[#12151f]/95 border border-emerald-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-2 w-72">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[11px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5" /> SELECT FACIAL EXPRESSION
              </span>
              <button onClick={() => setIsExpressionPickerOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded hover:bg-white/5 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Neutral', 'Happy', 'Smile', 'Laugh', 'Sad', 'Angry', 'Surprised', 'Calm'] as ExpressionType[]).map((expr) => (
                <button
                  key={expr}
                  onClick={() => handleSelectExpression(expr)}
                  className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                    currentExpression === expr
                      ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                      : 'bg-black/60 border border-white/10 text-zinc-300 hover:text-white hover:border-white/30'
                  }`}
                >
                  {expr}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Curved Radial Buttons Cluster */}
        <div className="relative w-44 h-44 sm:w-56 sm:h-56">
          {/* Main Larger INTERACT Button (The Centerpiece of the Radial Menu) */}
          <button
            onClick={handleActionInteract}
            className="absolute bottom-0 right-0 w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500 text-black rounded-full flex flex-col items-center justify-center shadow-2xl border-2 border-white hover:bg-emerald-400 active:scale-95 transition-all cursor-pointer z-20 group"
            title="Interact with City landmarks, houses, vehicles, or players [Key E]"
          >
            <Sliders className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform" />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tighter mt-0.5">Interact</span>
          </button>

          {/* Curved radial action list */}
          {[
            // INNER ARC (Radius: 72px on mobile, 95px on desktop)
            { id: 'walk', label: 'Walk', icon: Footprints, angle: 90, radiusMobile: 72, radiusDesktop: 95, handler: handleActionWalk, isActive: toggleMovementMode === 'walk' || currentAction === 'walk' },
            { id: 'run', label: 'Run', icon: Zap, angle: 120, radiusMobile: 72, radiusDesktop: 95, handler: handleActionRun, isActive: toggleMovementMode === 'run' || isRunMode || currentAction === 'run' },
            { id: 'sit', label: 'Sit', icon: Armchair, angle: 150, radiusMobile: 72, radiusDesktop: 95, handler: handleActionSit, isActive: isSitting },
            { id: 'stand', label: 'Stand', icon: UserCheck, angle: 180, radiusMobile: 72, radiusDesktop: 95, handler: handleActionStand, isActive: !isSitting && !isPraying && toggleMovementMode === null && currentAction === 'idle' },

            // OUTER ARC (Radius: 130px on mobile, 170px on desktop)
            { id: 'pray', label: 'Pray', icon: Compass, angle: 90, radiusMobile: 130, radiusDesktop: 170, handler: handleActionPray, isActive: isPraying },
            { id: 'wave', label: 'Wave', icon: Hand, angle: 108, radiusMobile: 130, radiusDesktop: 170, handler: handleActionWave, isActive: currentAction === 'wave' },
            { id: 'greet', label: 'Greet', icon: User, angle: 126, radiusMobile: 130, radiusDesktop: 170, handler: handleActionGreet, isActive: currentAction === 'greet' },
            { id: 'talk', label: 'Talk', icon: MessageSquare, angle: 144, radiusMobile: 130, radiusDesktop: 170, handler: handleActionTalk, isActive: currentAction === 'talk' },
            { id: 'laugh', label: 'Laugh', icon: Smile, angle: 162, radiusMobile: 130, radiusDesktop: 170, handler: handleActionLaugh, isActive: currentAction === 'laugh' },
            { id: 'expression', label: 'Face', icon: Smile, angle: 180, radiusMobile: 130, radiusDesktop: 170, handler: () => setIsExpressionPickerOpen(!isExpressionPickerOpen), isActive: isExpressionPickerOpen, badge: currentExpression },
          ].map((act) => {
            const Icon = act.icon;
            
            // Calculate dynamic radial positions
            const angleRad = (act.angle * Math.PI) / 180;
            const R = viewportProfile.isMobile ? act.radiusMobile : act.radiusDesktop;
            
            // Positions fanned out from the bottom-right corner (0,0)
            const x = Math.cos(angleRad) * R;
            const y = Math.sin(angleRad) * R;

            return (
              <button
                key={act.id}
                onClick={act.handler}
                style={{
                  transform: `translate(${x}px, ${-y}px)`,
                }}
                className={`absolute bottom-3 right-3 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex flex-col items-center justify-center border shadow-xl backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
                  act.isActive
                    ? 'bg-emerald-500 border-emerald-400 text-black font-black scale-105 z-10'
                    : 'bg-[#12151f]/90 border-white/10 text-zinc-300 hover:text-white hover:border-white/30'
                }`}
                title={act.label}
              >
                <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="text-[7.5px] sm:text-[8px] font-black uppercase mt-0.5 tracking-tight truncate max-w-[40px]">
                  {act.id === 'expression' && act.badge ? act.badge : act.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Nearby Proximity Player Popup Card */}
      {nearbyPlayer && (
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 bg-[#12151f]/95 border-2 border-emerald-400 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 backdrop-blur-xl animate-fadeIn w-[calc(100vw-2rem)] max-w-sm sm:max-w-md pointer-events-auto">
          <div className="text-center sm:text-left truncate w-full sm:w-auto">
            <span className="text-xs sm:text-sm font-black uppercase text-white block truncate">
              CITIZEN: {nearbyPlayer.name}
            </span>
            <span className="text-[10px] text-emerald-400 font-hud">
              {nearbyPlayer.city} Resident · {nearbyPlayer.distance}m away
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            <button
              onClick={() => handleActionTalk()}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md active:scale-95"
            >
              <MessageSquare className="w-3.5 h-3.5" /> TALK
            </button>

            <button
              onClick={() => handleAddFriendClick(nearbyPlayer.name, nearbyPlayer.city)}
              disabled={!!addedFriends[nearbyPlayer.name]}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                addedFriends[nearbyPlayer.name]
                  ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              {addedFriends[nearbyPlayer.name] ? (
                <>
                  <Check className="w-3.5 h-3.5" /> FRIEND
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" /> ADD
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Player Home Entrance / Interior Controls */}
      {isNearHome && !nearbyPlayer && (
        <div className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 bg-[#12151f]/95 border-2 border-emerald-400 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 backdrop-blur-xl animate-fadeIn w-[calc(100vw-2rem)] max-w-sm sm:max-w-md pointer-events-auto">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <Home className="w-5 h-5 text-emerald-400 shrink-0 hidden sm:block" />
            <div>
              <span className="text-xs sm:text-sm font-black uppercase text-white block">
                {isInPlayerHome ? 'PRIVATE RESIDENCE (INTERIOR)' : 'YOUR RESIDENCE HOME'}
              </span>
              <span className="text-[10px] text-zinc-400 font-hud">
                {isInPlayerHome ? 'Relax on divan or rest on bed' : 'Press E to step into private home'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
            {isInPlayerHome && (
              <>
                <button
                  onClick={handleActionSit}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                    isSitting ? 'bg-emerald-500 text-black border-emerald-400' : 'bg-black/60 border-white/20 text-white hover:bg-white/10'
                  }`}
                >
                  <Armchair className="w-3.5 h-3.5" /> {isSitting ? 'SEATED' : 'DIVAN'}
                </button>
                <button
                  onClick={handleActionStand}
                  className="px-3 py-1.5 rounded-xl border border-white/20 bg-black/60 text-white hover:bg-white/10 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" /> STAND
                </button>
              </>
            )}

            <button
              onClick={handleToggleHome}
              className="px-4 py-2 bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer whitespace-nowrap shadow-lg active:scale-95"
            >
              {isInPlayerHome ? 'EXIT HOME' : 'ENTER HOME [E]'}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REAL-TIME MULTIPLAYER IN-GAME CITIZENS CHAT CARD                          */}
      {/* ========================================================================= */}
      {isChatCardOpen && (
        <div
          className={`absolute z-40 transition-all duration-300 pointer-events-auto ${
            isChatCardMinimized
              ? 'bottom-[calc(max(env(safe-area-inset-bottom),1rem)+6.5rem)] sm:bottom-[max(env(safe-area-inset-bottom),1.5rem)] left-[max(env(safe-area-inset-left),1rem)]'
              : 'bottom-[calc(max(env(safe-area-inset-bottom),1rem)+6.5rem)] sm:bottom-[max(env(safe-area-inset-bottom),1.5rem)] left-[max(env(safe-area-inset-left),1rem)] w-[calc(100vw-2rem)] sm:w-96 max-h-[48vh] sm:max-h-[420px]'
          }`}
        >
          {isChatCardMinimized ? (
            /* Minimized Sleek Pill for Mobile Ergonomics */
            <button
              onClick={() => setIsChatCardMinimized(false)}
              className="bg-[#12151f]/95 border border-emerald-500/50 hover:border-emerald-400 text-white px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2.5 transition-all cursor-pointer group active:scale-95"
            >
              <div className="relative">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase text-white tracking-wider">CITIZENS CHAT</span>
                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded font-hud font-bold">
                    {onlineCount} ONLINE
                  </span>
                </div>
                {chatMessages.length > 0 && (
                  <span className="text-[9px] text-zinc-400 truncate max-w-[150px] sm:max-w-[200px]">
                    {chatMessages[chatMessages.length - 1].senderName}: {chatMessages[chatMessages.length - 1].text}
                  </span>
                )}
              </div>
              <ChevronUp className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-transform" />
            </button>
          ) : (
            /* Expanded Full Responsive Glassmorphism Chat Card */
            <div className="bg-[#12151f]/95 border border-emerald-500/50 rounded-3xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-col max-h-[48vh] sm:max-h-[420px] animate-fadeIn">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5 gap-2">
                <div className="flex items-center gap-2 truncate">
                  <div className="relative">
                    <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 absolute top-0 right-0" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white">CITIZENS LIVE CHAT</h4>
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/30 font-hud font-bold">
                        {onlineCount} ACTIVE
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setIsChatCardMinimized(true)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Minimize Chat"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsChatCardOpen(false)}
                    className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Close Chat"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Channel Switcher Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2 scrollbar-none">
                {[
                  { id: 'world', label: '#WORLD', desc: 'Global Metaverse' },
                  { id: 'district', label: `#${currentDistrict.split(' ')[0].toUpperCase()}`, desc: currentDistrict },
                  { id: 'proximity', label: '#NEARBY', desc: 'Proximity Citizens' },
                  ...(activeDirectChat ? [{ id: 'dm', label: `@${activeDirectChat.name.toUpperCase()}`, desc: `Direct DM` }] : []),
                ].map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setChatChannel(ch.id as any)}
                    className={`px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                      chatChannel === ch.id
                        ? 'bg-emerald-500 text-black shadow-md font-extrabold'
                        : 'bg-black/50 border border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-black/60 border border-white/10 rounded-2xl mb-2 text-xs scrollbar-thin scrollbar-thumb-zinc-700 min-h-[110px] max-h-[180px]">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-3 text-zinc-500 space-y-1">
                    <MessageSquare className="w-5 h-5 text-zinc-600" />
                    <p className="text-[10px]">No messages in this channel yet.</p>
                    <span className="text-[9px] text-emerald-400">Type below or tap a quick phrase to broadcast live!</span>
                  </div>
                ) : (
                  chatMessages
                    .filter((msg) => {
                      if (chatChannel === 'dm' && activeDirectChat) {
                        return (
                          msg.channel === `dm:${activeDirectChat.name}` ||
                          msg.senderName.toLowerCase() === activeDirectChat.name.toLowerCase() ||
                          (msg.senderName === userProfile.name && msg.channel?.includes('dm'))
                        );
                      }
                      if (chatChannel === 'district') {
                        return msg.channel?.includes('district') || msg.channel === 'global' || !msg.channel;
                      }
                      if (chatChannel === 'proximity') {
                        return msg.channel === 'proximity' || msg.channel === 'global' || !msg.channel;
                      }
                      return true;
                    })
                    .map((msg) => {
                      const isSelf = msg.senderName === userProfile.name;
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                              {msg.senderName}
                            </span>
                            {msg.senderCity && (
                              <span className="text-[8px] font-hud text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">
                                {msg.senderCity}
                              </span>
                            )}
                            <span className="text-[8px] font-hud text-zinc-500">{msg.timestamp}</span>
                          </div>
                          <div
                            className={`px-3 py-1.5 rounded-2xl text-[11px] leading-relaxed max-w-[85%] shadow-sm ${
                              isSelf
                                ? 'bg-emerald-500 text-black font-semibold rounded-tr-xs'
                                : 'bg-[#1a1f2e] text-white border border-white/10 rounded-tl-xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                )}
                <div ref={chatMessagesEndRef} />
              </div>

              {/* Quick Chat Phrases for Mobile Comfort */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-1.5 scrollbar-none">
                {QUICK_CHAT_PHRASES.map((phrase, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChatMessage(undefined, phrase)}
                    className="px-2 py-0.5 bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 rounded-lg text-[9px] text-zinc-300 hover:text-emerald-300 whitespace-nowrap transition-all cursor-pointer shrink-0"
                  >
                    {phrase}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={(e) => handleSendChatMessage(e)} className="flex items-center gap-1.5">
                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder={
                    chatChannel === 'dm' && activeDirectChat
                      ? `Message ${activeDirectChat.name}...`
                      : `Message #${chatChannel.toUpperCase()}...`
                  }
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-grow bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-bold rounded-xl transition-all cursor-pointer shrink-0 shadow-md active:scale-95"
                  title="Send Message Across WebSockets & Emits 3D Speech Bubble"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TASKS & MISSIONS OBJECTIVES MODAL                                       */}
      {/* ========================================================================= */}
      {isMissionsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12151f] border border-emerald-500/40 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                    TASKS & MISSIONS
                  </h3>
                  <span className="text-[10px] font-hud text-emerald-400">
                    COMPLETE ACTIVITIES · EARN COINS & BLESSINGS
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMissionsModalOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 font-sora">
              {/* Daily Missions Section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> DAILY MISSIONS
                  </span>
                  <span className="text-[10px] font-hud text-zinc-400">RESETS DAILY</span>
                </div>

                <div className="space-y-2.5">
                  {missions
                    .filter((m) => m.type === 'daily')
                    .map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                          m.completed
                            ? 'bg-emerald-950/40 border-emerald-500/50'
                            : 'bg-black/50 border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {m.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              <span className="text-xs font-bold text-white uppercase">{m.title}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{m.desc}</p>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-xs font-black text-amber-400 font-hud">+{m.reward} Coins</span>
                            {m.completed && !m.claimed && (
                              <button
                                onClick={() => {
                                  setMissions((prev) =>
                                    prev.map((item) => (item.id === m.id ? { ...item, claimed: true } : item))
                                  );
                                  setCoins((c) => c + m.reward);
                                  playCoinChime();
                                  setCoinFeedback({
                                    amount: m.reward,
                                    reason: `Claimed: ${m.title}`,
                                    timestamp: Date.now(),
                                  });
                                }}
                                className="mt-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase rounded-lg shadow-lg active:scale-95 transition-all cursor-pointer"
                              >
                                CLAIM
                              </button>
                            )}
                            {m.claimed && (
                              <span className="text-[9px] font-bold text-emerald-400 mt-1 uppercase">CLAIMED ✓</span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-hud font-bold text-zinc-400 shrink-0">
                            {m.current} / {m.target} {m.unit || ''}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Weekly Missions Section */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> WEEKLY MISSIONS
                  </span>
                  <span className="text-[10px] font-hud text-zinc-400">HIGHER REWARDS</span>
                </div>

                <div className="space-y-2.5">
                  {missions
                    .filter((m) => m.type === 'weekly')
                    .map((m) => (
                      <div
                        key={m.id}
                        className={`p-3 sm:p-3.5 rounded-2xl border transition-all ${
                          m.completed
                            ? 'bg-emerald-950/40 border-emerald-500/50'
                            : 'bg-black/50 border-white/10'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              {m.completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              <span className="text-xs font-bold text-white uppercase">{m.title}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{m.desc}</p>
                          </div>

                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-xs font-black text-amber-400 font-hud">+{m.reward} Coins</span>
                            {m.completed && !m.claimed && (
                              <button
                                onClick={() => {
                                  setMissions((prev) =>
                                    prev.map((item) => (item.id === m.id ? { ...item, claimed: true } : item))
                                  );
                                  setCoins((c) => c + m.reward);
                                  playCoinChime();
                                  setCoinFeedback({
                                    amount: m.reward,
                                    reason: `Claimed: ${m.title}`,
                                    timestamp: Date.now(),
                                  });
                                }}
                                className="mt-1.5 px-3 py-1 bg-teal-500 hover:bg-teal-400 text-black text-[10px] font-black uppercase rounded-lg shadow-lg active:scale-95 transition-all cursor-pointer"
                              >
                                CLAIM
                              </button>
                            )}
                            {m.claimed && (
                              <span className="text-[9px] font-bold text-emerald-400 mt-1 uppercase">CLAIMED ✓</span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-400 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-hud font-bold text-zinc-400 shrink-0">
                            {m.current} / {m.target} {m.unit || ''}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SOUQ AL-BARAKA BAZAAR & COMMUNITY JOBS MODAL                           */}
      {/* ========================================================================= */}
      {isSouqShopOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12151f] border border-amber-500/40 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sora">
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                    SOUQ AL-BARAKA BAZAAR
                  </h3>
                  <span className="text-[10px] font-hud text-amber-400">
                    MERCHANT STALLS · COMMUNITY JOBS · SADAQAH
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSouqShopOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Community Jobs & Tasks */}
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2.5">
                  <Briefcase className="w-3.5 h-3.5" /> COMMUNITY JOBS (EARN COINS)
                </span>
                <div className="space-y-2">
                  <div className="p-3 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white uppercase block">Catalog Spice Shipment</span>
                      <span className="text-[10px] text-zinc-400">Help Merchant Amin arrange saffron & cinnamon crates</span>
                    </div>
                    <button
                      onClick={() => {
                        setCoins((c) => c + 35);
                        playCoinChime();
                        setMissions((prev) =>
                          prev.map((m) => (m.id === 'm_souq' ? { ...m, current: 1, completed: true } : m))
                        );
                        setCoinFeedback({
                          amount: 35,
                          reason: 'Merchant Spice Logistics Task',
                          timestamp: Date.now(),
                        });
                        setIsSouqShopOpen(false);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase rounded-xl transition-all active:scale-95 shadow-lg shrink-0 cursor-pointer"
                    >
                      +35 COINS
                    </button>
                  </div>

                  <div className="p-3 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-white uppercase block">Deliver Mosque Dates</span>
                      <span className="text-[10px] text-zinc-400">Carry fresh Ajwa dates to the Grand Mosque terrace</span>
                    </div>
                    <button
                      onClick={() => {
                        setCoins((c) => c + 30);
                        playCoinChime();
                        setMissions((prev) =>
                          prev.map((m) => (m.id === 'm_souq' ? { ...m, current: 1, completed: true } : m))
                        );
                        setCoinFeedback({
                          amount: 30,
                          reason: 'Dates Delivery Task',
                          timestamp: Date.now(),
                        });
                        setIsSouqShopOpen(false);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase rounded-xl transition-all active:scale-95 shadow-lg shrink-0 cursor-pointer"
                    >
                      +30 COINS
                    </button>
                  </div>
                </div>
              </div>

              {/* Bazaar Store: Spend Coins */}
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 mb-2.5">
                  <Package className="w-3.5 h-3.5" /> BAZAAR GOODS & BOOSTS (SPEND)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-3 bg-black/50 border border-white/10 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-white uppercase block">Zamzam Water</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">+45s Energetic Sprint Speed Boost</span>
                    </div>
                    <button
                      disabled={coins < 15}
                      onClick={() => {
                        setCoins((c) => c - 15);
                        setSpeedBoostUntil(Date.now() + 45000);
                        playChime(659.25, 'triangle', 0.3);
                        setCoinFeedback({
                          amount: -15,
                          reason: 'Purchased Zamzam Water (Speed Boost!)',
                          timestamp: Date.now(),
                        });
                        setIsSouqShopOpen(false);
                      }}
                      className="mt-2.5 w-full py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-[10px] font-black uppercase rounded-xl cursor-pointer"
                    >
                      BUY · 15 COINS
                    </button>
                  </div>

                  <div className="p-3 bg-black/50 border border-white/10 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-white uppercase block">Royal Emerald Thobe</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Equip ceremonial silk outfit</span>
                    </div>
                    <button
                      disabled={coins < 75}
                      onClick={() => {
                        setCoins((c) => c - 75);
                        if (onUpdateProfile) onUpdateProfile({ outfit: 'Royal Emerald Jalabiyya' });
                        playCoinChime();
                        setCoinFeedback({
                          amount: -75,
                          reason: 'Purchased Royal Emerald Thobe',
                          timestamp: Date.now(),
                        });
                        setIsSouqShopOpen(false);
                      }}
                      className="mt-2.5 w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-[10px] font-black uppercase rounded-xl cursor-pointer"
                    >
                      BUY · 75 COINS
                    </button>
                  </div>

                  <div className="p-3 bg-black/50 border border-white/10 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-white uppercase block">Arabian Oud Essence</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Traditional pure fragrance bottle</span>
                    </div>
                    <button
                      disabled={coins < 30}
                      onClick={() => {
                        setCoins((c) => c - 30);
                        playChime(523.25, 'sine', 0.3);
                        setCoinFeedback({
                          amount: -30,
                          reason: 'Purchased Arabian Oud Essence',
                          timestamp: Date.now(),
                        });
                        setIsSouqShopOpen(false);
                      }}
                      className="mt-2.5 w-full py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black text-[10px] font-black uppercase rounded-xl cursor-pointer"
                    >
                      BUY · 30 COINS
                    </button>
                  </div>

                  <div className="p-3 bg-black/50 border border-white/10 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-white uppercase block">Community Sadaqah</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Charity box for community blessings</span>
                    </div>
                    <button
                      disabled={coins < 20}
                      onClick={() => {
                        setCoins((c) => c - 20);
                        playCoinChime();
                        setCoinFeedback({
                          amount: -20,
                          reason: 'Donated to Sadaqah Community Box (Baraka Blessing!)',
                          timestamp: Date.now(),
                        });
                        setMissions((prev) =>
                          prev.map((m) => (m.id === 'm_souq' ? { ...m, current: 1, completed: true } : m))
                        );
                        setIsSouqShopOpen(false);
                      }}
                      className="mt-2.5 w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black text-[10px] font-black uppercase rounded-xl cursor-pointer"
                    >
                      DONATE · 20 COINS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ISLAMIC UNIVERSITY KNOWLEDGE CHALLENGE MODAL                            */}
      {/* ========================================================================= */}
      {isUniversityQuizOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12151f] border border-blue-500/40 rounded-3xl max-w-md w-full p-5 sm:p-6 flex flex-col shadow-2xl overflow-hidden font-sora">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wide">
                    MADRASA KNOWLEDGE LECTURE
                  </h3>
                  <span className="text-[10px] font-hud text-blue-400">
                    ANSWER HERITAGE QUESTION · EARN +25 COINS
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsUniversityQuizOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-black/50 border border-white/10 rounded-2xl">
                <span className="text-[10px] font-hud text-blue-400 font-bold uppercase block mb-1">
                  LECTURE QUESTION:
                </span>
                <p className="text-xs sm:text-sm font-bold text-white leading-relaxed">
                  In Islamic architectural heritage, what was the historic 'Bayt al-Hikmah' (House of Wisdom) in Baghdad renown for?
                </p>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'a', text: 'Translation, mathematics, astronomy, and science center', correct: true },
                  { id: 'b', text: 'A private gold vault and tax depot', correct: false },
                  { id: 'c', text: 'A military arms foundry', correct: false },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      if (opt.correct) {
                        setCoins((c) => c + 25);
                        playCoinChime();
                        setMissions((prev) =>
                          prev.map((m) => (m.id === 'm_class' ? { ...m, current: 1, completed: true } : m))
                        );
                        setCoinFeedback({
                          amount: 25,
                          reason: 'University Heritage Lecture Answered Correctly!',
                          timestamp: Date.now(),
                        });
                        setIsUniversityQuizOpen(false);
                      } else {
                        setQuizFeedback('Not quite! Review the lecture note and try again.');
                        playCollisionThud();
                      }
                    }}
                    className="w-full text-left p-3 rounded-2xl border border-white/10 bg-black/40 hover:bg-blue-950/40 hover:border-blue-400/50 text-xs text-zinc-200 hover:text-white transition-all cursor-pointer font-medium"
                  >
                    {opt.text}
                  </button>
                ))}
              </div>

              {quizFeedback && (
                <p className="text-xs text-rose-400 font-bold text-center animate-fadeIn">{quizFeedback}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. 3D AVATAR CUSTOMIZATION STUDIO ROOM MODAL                                */}
      {/* ========================================================================= */}
      {isCustomizerOpen && (
        <AvatarCustomizerModal
          isOpen={isCustomizerOpen}
          currentConfig={avatarConfig}
          onSaveConfig={(newCfg: AvatarCustomization) => {
            setAvatarConfig(newCfg);
            setIsCustomizerOpen(false);

            // Rebuild local player mesh in the Three.js scene
            if (playerGroupRef.current && sceneRef.current) {
              sceneRef.current.remove(playerGroupRef.current);
              const newMesh = create3DAvatarMesh(newCfg, true);
              newMesh.position.copy(playerPositionRef.current);
              newMesh.rotation.y = playerRotationRef.current;
              sceneRef.current.add(newMesh);
              playerGroupRef.current = newMesh;
            }

            // Sync with profile callback if present
            if (onUpdateProfile) {
              onUpdateProfile({
                gender: newCfg.gender === 'sister' ? 'female' : 'male',
                outfit: newCfg.outfit.replace('_', ' ').toUpperCase(),
              });
            }

            showToast('Character Customization Saved Successfully!');
          }}
          onClose={() => setIsCustomizerOpen(false)}
        />
      )}

      {/* Minimal Overlay Hamburger Menu Drawer */}
      {isMenuOpen && (
        <div className="absolute top-14 sm:top-16 right-2 sm:right-4 z-50 bg-[#12151f]/95 border border-emerald-500/40 rounded-3xl max-w-[calc(100vw-1rem)] sm:max-w-sm w-full p-4 sm:p-6 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">CHARACTER & GAME CONTROL</h3>
            <button onClick={() => setIsMenuOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Tabs */}
          <div className="grid grid-cols-6 gap-1 p-1 bg-black/60 rounded-2xl border border-white/10 text-[9px]">
            {(['character', 'missions', 'shop', 'friends', 'messages', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMenuTab(tab)}
                className={`py-2 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center ${
                  menuTab === tab ? 'bg-emerald-500 text-black font-extrabold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab === 'character' ? 'Char' : tab === 'missions' ? 'Quests' : tab === 'shop' ? 'Shop' : tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {menuTab === 'character' && (
            <div className="space-y-4">
              {/* Prominent 3D Avatar Customization Room Launcher */}
              <div className="p-3.5 bg-gradient-to-br from-emerald-950/80 to-black/80 border border-emerald-500/40 rounded-2xl space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">
                      3D AVATAR STUDIO
                    </span>
                  </div>
                  <span className="text-[9px] font-hud text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase">
                    {avatarConfig.gender} · {avatarConfig.skinTone}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-300">
                  Full 3D character creator with rotatable 3D avatar preview, modest thobes, abayas, hijabs, taqiyahs & colors.
                </p>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsCustomizerOpen(true);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black uppercase text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Palette className="w-4 h-4" />
                  <span>OPEN 3D AVATAR CUSTOMIZER</span>
                </button>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">CITIZEN NAME</label>
                <input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => onUpdateProfile && onUpdateProfile({ name: e.target.value })}
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">FACIAL EXPRESSION</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Neutral', 'Happy', 'Smile', 'Laugh', 'Sad', 'Angry', 'Surprised', 'Calm'] as ExpressionType[]).map((expr) => (
                    <button
                      key={expr}
                      onClick={() => handleSelectExpression(expr)}
                      className={`p-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-center transition-all cursor-pointer ${
                        currentExpression === expr
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/10 bg-black/40 text-zinc-300'
                      }`}
                    >
                      {expr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">EQUIPPED OUTFIT</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Royal Emerald Jalabiyya',
                    'Lagos Street Modest Hoodie',
                    'Makkah White Thobe',
                    'Kano Indigo Tunic',
                  ].map((outfit) => (
                    <button
                      key={outfit}
                      onClick={() => onUpdateProfile && onUpdateProfile({ outfit })}
                      className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider text-left transition-all cursor-pointer ${
                        userProfile.outfit === outfit
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-white/10 bg-black/40 text-zinc-300'
                      }`}
                    >
                      {outfit}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {menuTab === 'missions' && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">ACTIVE QUESTS</span>
              {missions.map((m) => (
                <div key={m.id} className="p-2.5 bg-black/50 border border-white/10 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white block">{m.title}</span>
                    <span className="text-[9px] text-zinc-400">{m.current}/{m.target} {m.unit || ''}</span>
                  </div>
                  <span className="text-amber-400 font-hud font-bold">+{m.reward}</span>
                </div>
              ))}
            </div>
          )}

          {menuTab === 'shop' && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">QUICK SOUQ BAZAAR ACCESS</span>
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsSouqShopOpen(true);
                }}
                className="w-full py-2.5 bg-amber-500 text-black font-black uppercase text-xs rounded-xl shadow-lg"
              >
                OPEN SOUQ MARKETPLACE
              </button>
            </div>
          )}

          {menuTab === 'friends' && (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {otherAvatarsRef.current.map((f) => (
                <div key={f.id} className="p-3 bg-black/50 border border-white/10 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase text-white block">{f.name}</span>
                    <span className="text-[10px] font-hud text-emerald-400">{f.city} Resident</span>
                  </div>
                  <button
                    onClick={() => handleAddFriendClick(f.name, f.city)}
                    className="px-3 py-1 bg-emerald-500 text-black text-[10px] font-bold uppercase rounded-lg"
                  >
                    {addedFriends[f.name] ? 'ADDED' : 'ADD'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {menuTab === 'messages' && (
            <div className="space-y-3">
              <div className="h-40 overflow-y-auto p-3 bg-black/60 border border-white/10 rounded-2xl space-y-2 text-xs">
                {chatMessages.map((m) => (
                  <div key={m.id}>
                    <span className="font-bold text-emerald-400">{m.senderName}: </span>
                    <span className="text-white">{m.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {menuTab === 'settings' && (
            <div className="space-y-3 text-xs font-bold uppercase text-zinc-300">
              <div className="flex items-center justify-between p-3 bg-black/50 rounded-2xl border border-white/10">
                <span className="flex items-center gap-1.5"><Maximize2 className="w-3.5 h-3.5 text-emerald-400" /> CAMERA VIEW</span>
                <button
                  onClick={() => setCameraViewMode(cameraViewMode === 'third_person' ? 'close_up' : 'third_person')}
                  className="px-2.5 py-1 bg-white/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                >
                  {cameraViewMode === 'third_person' ? '3RD PERSON' : 'CLOSE UP'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-black/50 rounded-2xl border border-white/10">
                <span>AMBIENT AUDIO</span>
                <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} className="text-emerald-400">
                  {isAudioEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="p-3 bg-black/50 rounded-2xl border border-white/10 flex items-center justify-between">
                <span>RETURN TO HOMEPAGE</span>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    onExitToLanding && onExitToLanding();
                  }}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black rounded-lg uppercase cursor-pointer"
                >
                  EXIT WORLD
                </button>
              </div>
            </div>
          )}

          {/* Quick Exit to First Page Banner inside Drawer */}
          <div className="pt-3 border-t border-white/10">
            <button
              onClick={() => {
                setIsMenuOpen(false);
                onExitToLanding && onExitToLanding();
              }}
              className="w-full py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>LEAVE WORLD · BACK TO FIRST PAGE</span>
            </button>
          </div>
        </div>
      )}

      {/* GTA-Style Contextual Interaction Prompt (Center Bottom) */}
      {contextPrompt && (
        <div className="absolute bottom-[calc(max(env(safe-area-inset-bottom),1rem)+5.5rem)] sm:bottom-[calc(max(env(safe-area-inset-bottom),1.25rem)+4.25rem)] left-1/2 -translate-x-1/2 z-35 pointer-events-auto animate-fadeIn">
          <button
            onClick={contextPrompt.onExecute}
            className="group flex items-center gap-2.5 bg-black/90 hover:bg-black border-2 border-emerald-400 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.9)] backdrop-blur-xl transition-all active:scale-95 cursor-pointer hover:border-emerald-300"
          >
            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-black font-black text-xs flex items-center justify-center font-hud shadow group-hover:scale-110 transition-transform shrink-0">
              {contextPrompt.actionKey}
            </span>
            <div className="flex flex-col text-left truncate max-w-[220px] sm:max-w-xs">
              <span className="text-[11px] sm:text-xs font-black uppercase text-white tracking-wider font-sora truncate">
                {contextPrompt.text}
              </span>
              {contextPrompt.subText && (
                <span className="text-[9px] font-hud text-emerald-400 truncate">
                  {contextPrompt.subText}
                </span>
              )}
            </div>
          </button>
        </div>
      )}

      {/* GTA-Style Bottom-Left HUD: Radar Minimap, District Strip & Vitality/Stamina */}
      <div className="absolute bottom-[max(env(safe-area-inset-bottom),1rem)] left-[max(env(safe-area-inset-left),1rem)] z-30 flex items-end gap-3 pointer-events-none">
        {/* Radar Minimap Component */}
        <GtaRadarMinimap
          playerX={radarCoords.x}
          playerZ={radarCoords.z}
          playerRotation={radarCoords.rot}
          currentDistrict={currentDistrict}
          stamina={stamina}
          health={100}
          otherPlayers={otherAvatarsRef.current.map((a) => ({ id: a.id, name: a.name, x: a.position.x, z: a.position.z }))}
          vehicles={vehiclesRef.current.map((v) => ({ id: v.id, x: v.mesh.position.x, z: v.mesh.position.z }))}
          onExpandMap={() => setIsMinimapExpanded(true)}
          isMobile={viewportProfile.isMobile}
        />

        {/* Desktop Keybind Helper Bar (alongside Radar) */}
        <div className="hidden xl:flex items-center gap-2 bg-black/70 border border-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-zinc-300 shadow-2xl pointer-events-auto">
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-400 font-hud">WASD</span>
          <span>Move</span>
          <span className="text-zinc-600">·</span>
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-400 font-hud">SHIFT</span>
          <span>Sprint</span>
          <span className="text-zinc-600">·</span>
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-400 font-hud">E</span>
          <span>Interact</span>
          <span className="text-zinc-600">·</span>
          <span className="bg-white/10 px-1.5 py-0.5 rounded text-emerald-400 font-hud">P</span>
          <span>Pray</span>
        </div>
      </div>

      {/* Interactive Expanded Full-Screen World Map Modal */}
      <ExpandedWorldMapModal
        isOpen={isMinimapExpanded}
        onClose={() => setIsMinimapExpanded(false)}
        playerX={radarCoords.x}
        playerZ={radarCoords.z}
        currentDistrict={currentDistrict}
        onFastTravel={handleFastTravel}
      />

      {/* Mobile & Tablet Touch Virtual Joystick (Floating in Left Safe Area) */}
      {(isMobileControlsVisible || viewportProfile.isMobile || viewportProfile.isTablet) && (
        <div className="absolute bottom-[calc(max(env(safe-area-inset-bottom),1rem)+9rem)] sm:bottom-[max(env(safe-area-inset-bottom),1.5rem)] left-[calc(max(env(safe-area-inset-left),1rem)+8.5rem)] sm:left-[max(env(safe-area-inset-left),10rem)] z-30 w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-emerald-500/40 bg-black/40 backdrop-blur-md flex items-center justify-center pointer-events-auto">
          <div
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 shadow-lg border border-white transition-transform"
            style={{
              transform: `translate(${joystickVector.x * 26}px, ${joystickVector.y * 26}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
