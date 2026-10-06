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
  Footprints, Zap, UserCheck, Smile, Hand, Activity, ChevronUp, Layers
} from 'lucide-react';

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

interface MovingVehicle {
  mesh: THREE.Group;
  speed: number;
  direction: THREE.Vector3;
  pathStart: THREE.Vector3;
  pathEnd: THREE.Vector3;
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
  chatMessages?: Array<{ id: string; senderName: string; senderCity: string; text: string; timestamp: string }>;
  onlineCount?: number;
}

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

  // Slide-over minimal hamburger menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuTab, setMenuTab] = useState<'character' | 'friends' | 'messages' | 'settings'>('character');

  // Interactive In-World Chat Modal
  const [activeDirectChat, setActiveDirectChat] = useState<{ name: string; city: string } | null>(null);
  const [chatInput, setChatInput] = useState('');

  // Audio and View mode
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [cameraViewMode, setCameraViewMode] = useState<'third_person' | 'close_up'>('third_person');

  // Mobile viewport tracking for responsive radial control sizing
  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 640);
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

  // Helper to build 3D Humanoid Avatar Mesh with Facial Geometry
  const create3DAvatarMesh = (primaryColorHex: number, isSelf: boolean) => {
    const group = new THREE.Group();

    // Body / Tunic
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.55, 1.4, 16);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: primaryColorHex,
      roughness: 0.4,
      metalness: 0.1,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.name = 'bodyMesh';
    bodyMesh.position.y = 0.9;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Gold Trim Belt / Border
    const beltGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.08, 16);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.2 });
    const beltMesh = new THREE.Mesh(beltGeo, beltMat);
    beltMesh.position.y = 1.0;
    group.add(beltMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe5c0a2, roughness: 0.6 });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.name = 'headMesh';
    headMesh.position.y = 1.85;
    headMesh.castShadow = true;

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.038, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.name = 'leftEye';
    leftEye.position.set(-0.09, 0.04, 0.25);
    headMesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.name = 'rightEye';
    rightEye.position.set(0.09, 0.04, 0.25);
    headMesh.add(rightEye);

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.08, 0.018, 0.015);
    const browMat = new THREE.MeshBasicMaterial({ color: 0x334155 });

    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.name = 'leftBrow';
    leftBrow.position.set(-0.09, 0.11, 0.255);
    headMesh.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.name = 'rightBrow';
    rightBrow.position.set(0.09, 0.11, 0.255);
    headMesh.add(rightBrow);

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.12, 0.03, 0.02);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x9f1239 });
    const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    mouthMesh.name = 'mouthMesh';
    mouthMesh.position.set(0, -0.08, 0.26);
    headMesh.add(mouthMesh);

    group.add(headMesh);

    // Keffiyeh / Tagiyah Headwear
    const hatGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 16);
    const hatMat = new THREE.MeshStandardMaterial({ color: isSelf ? 0x059669 : 0xffffff, roughness: 0.3 });
    const hatMesh = new THREE.Mesh(hatGeo, hatMat);
    hatMesh.name = 'hatMesh';
    hatMesh.position.y = 2.02;
    group.add(hatMesh);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: primaryColorHex });
    const leftArm = new THREE.Mesh(armGeo, armMat);
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.45, 1.1, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, armMat);
    rightArm.name = 'rightArm';
    rightArm.position.set(0.45, 1.1, 0);
    group.add(rightArm);

    // Legs
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

    return group;
  };

  // Helper to create 3D Vehicle / Car Mesh
  const createVehicleMesh = (colorHex: number) => {
    const carGroup = new THREE.Group();

    // Body chassis
    const bodyGeo = new THREE.BoxGeometry(2.2, 0.9, 4.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.7, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    carGroup.add(body);

    // Roof cabin
    const cabinGeo = new THREE.BoxGeometry(1.8, 0.7, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.3, -0.2);
    carGroup.add(cabin);

    // Glowing Headlights
    const lightGeo = new THREE.BoxGeometry(0.3, 0.2, 0.1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const leftLight = new THREE.Mesh(lightGeo, lightMat);
    leftLight.position.set(-0.8, 0.7, 2.22);
    carGroup.add(leftLight);

    const rightLight = new THREE.Mesh(lightGeo, lightMat);
    rightLight.position.set(0.8, 0.7, 2.22);
    carGroup.add(rightLight);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x090a0f, roughness: 0.8 });
    const wheelPos: [number, number, number][] = [
      [-1.1, 0.35, 1.4],
      [1.1, 0.35, 1.4],
      [-1.1, 0.35, -1.4],
      [1.1, 0.35, -1.4],
    ];

    wheelPos.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      carGroup.add(wheel);
    });

    return carGroup;
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

    // Check distance to seats
    let nearestSeatDist = 999;
    SEAT_LOCATIONS.forEach((s) => {
      const d = pos.distanceTo(s);
      if (d < nearestSeatDist) nearestSeatDist = d;
    });

    if (distToMosque < 30.0) {
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
    } else if (distToBazaar < 16.0) {
      // Greet merchant in bazaar
      handleActionGreet();
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

    // Camera
    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 400);
    cameraRef.current = camera;
    camera.position.set(0, 5, 26);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Rich Ambient, Directional & Hemisphere Lighting
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 0.85);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfef3c7, 1.5);
    sunLight.position.set(60, 75, 45);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
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

    // 3. Moving Traffic / Cars on Roads
    const vehicle1 = createVehicleMesh(0x0284c7); // Blue sedan Eastbound
    vehicle1.position.set(-80, 0, -3.5);
    scene.add(vehicle1);

    const vehicle2 = createVehicleMesh(0xd97706); // Amber sedan Westbound
    vehicle2.position.set(80, 0, 3.5);
    vehicle2.rotation.y = Math.PI;
    scene.add(vehicle2);

    const vehicle3 = createVehicleMesh(0xf8fafc); // White SUV Southbound
    vehicle3.position.set(3.5, 0, -90);
    vehicle3.rotation.y = Math.PI / 2;
    scene.add(vehicle3);

    const vehicle4 = createVehicleMesh(0x10b981); // Emerald cruiser Northbound
    vehicle4.position.set(-3.5, 0, 90);
    vehicle4.rotation.y = -Math.PI / 2;
    scene.add(vehicle4);

    vehiclesRef.current = [
      {
        mesh: vehicle1,
        speed: 16,
        direction: new THREE.Vector3(1, 0, 0),
        pathStart: new THREE.Vector3(-120, 0, -3.5),
        pathEnd: new THREE.Vector3(120, 0, -3.5),
      },
      {
        mesh: vehicle2,
        speed: 18,
        direction: new THREE.Vector3(-1, 0, 0),
        pathStart: new THREE.Vector3(120, 0, 3.5),
        pathEnd: new THREE.Vector3(-120, 0, 3.5),
      },
      {
        mesh: vehicle3,
        speed: 15,
        direction: new THREE.Vector3(0, 0, 1),
        pathStart: new THREE.Vector3(3.5, 0, -120),
        pathEnd: new THREE.Vector3(3.5, 0, 120),
      },
      {
        mesh: vehicle4,
        speed: 17,
        direction: new THREE.Vector3(0, 0, -1),
        pathStart: new THREE.Vector3(-3.5, 0, 120),
        pathEnd: new THREE.Vector3(-3.5, 0, -120),
      },
    ];

    // 4. Landmarks & Buildings

    // A. PLAYER HOME RESIDENCE (Location: [18, 0, 18])
    const homeGroup = new THREE.Group();
    const houseBodyGeo = new THREE.BoxGeometry(10, 6, 12);
    const houseBodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const houseBody = new THREE.Mesh(houseBodyGeo, houseBodyMat);
    houseBody.position.set(0, 3, 0);
    houseBody.castShadow = true;
    houseBody.receiveShadow = true;
    homeGroup.add(houseBody);

    const roofGeo = new THREE.ConeGeometry(8, 3, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 7.5, 0);
    roof.rotation.y = Math.PI / 4;
    homeGroup.add(roof);

    const doorGeo = new THREE.BoxGeometry(2, 3.2, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 1.6, 6.01);
    homeGroup.add(door);

    const porchLight = new THREE.PointLight(0x10b981, 2, 12);
    porchLight.position.set(0, 3.8, 6.5);
    homeGroup.add(porchLight);

    homeGroup.position.set(18, 0, 18);
    scene.add(homeGroup);

    // B. GRAND MOSQUE (Location: [0, 0, -58]) - Majestic Islamic Architecture
    const mosqueGroup = new THREE.Group();

    // Mosque Elevated Base & Main Prayer Hall
    const hallGeo = new THREE.BoxGeometry(32, 10, 28);
    const hallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 });
    const hall = new THREE.Mesh(hallGeo, hallMat);
    hall.position.set(0, 5, 0);
    hall.castShadow = true;
    hall.receiveShadow = true;
    mosqueGroup.add(hall);

    // Grand Central Emerald & Gold Dome
    const domeGeo = new THREE.SphereGeometry(9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.25, metalness: 0.5 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 15, 0);
    dome.castShadow = true;
    mosqueGroup.add(dome);

    // Golden Crescent Finial on Dome
    const crescentGeo = new THREE.TorusGeometry(1.2, 0.25, 12, 24, Math.PI * 1.5);
    const crescentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
    const crescent = new THREE.Mesh(crescentGeo, crescentMat);
    crescent.position.set(0, 24.8, 0);
    crescent.rotation.z = Math.PI / 4;
    mosqueGroup.add(crescent);

    // Dome Drum with Illuminated Arched Windows
    const domeBaseGeo = new THREE.CylinderGeometry(9.2, 9.2, 5, 32);
    const domeBaseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const domeBase = new THREE.Mesh(domeBaseGeo, domeBaseMat);
    domeBase.position.set(0, 12.5, 0);
    mosqueGroup.add(domeBase);

    // Glowing Drum Windows
    for (let w = 0; w < 8; w++) {
      const wAngle = (w / 8) * Math.PI * 2;
      const winGeo = new THREE.BoxGeometry(1.2, 2.2, 0.3);
      const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const win = new THREE.Mesh(winGeo, winMat);
      win.position.set(Math.cos(wAngle) * 9.25, 12.5, Math.sin(wAngle) * 9.25);
      win.rotation.y = -wAngle + Math.PI / 2;
      mosqueGroup.add(win);
    }

    // Monumental Entrance Portal (Iwan Arch)
    const portalArchGeo = new THREE.BoxGeometry(14, 9, 3);
    const portalArchMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const portalArch = new THREE.Mesh(portalArchGeo, portalArchMat);
    portalArch.position.set(0, 4.5, 14.5);
    mosqueGroup.add(portalArch);

    const archInnerGeo = new THREE.CylinderGeometry(3.5, 3.5, 6, 16, 1, false, 0, Math.PI);
    const archInnerMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const archInner = new THREE.Mesh(archInnerGeo, archInnerMat);
    archInner.rotation.x = Math.PI / 2;
    archInner.position.set(0, 3.5, 15.5);
    mosqueGroup.add(archInner);

    // Warm Lanterns at Portal
    [-6, 6].forEach((px) => {
      const pLight = new THREE.PointLight(0xf59e0b, 1.8, 14);
      pLight.position.set(px, 5, 16);
      mosqueGroup.add(pLight);
    });

    // Four Majestic Minarets
    [[-18, -16], [18, -16], [-18, 16], [18, 16]].forEach(([mx, mz]) => {
      const minaretGeo = new THREE.CylinderGeometry(1.6, 2.4, 38, 16);
      const minaretMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
      const minaret = new THREE.Mesh(minaretGeo, minaretMat);
      minaret.position.set(mx, 19, mz);
      minaret.castShadow = true;
      mosqueGroup.add(minaret);

      // Balcony
      const balconyGeo = new THREE.CylinderGeometry(2.8, 2.4, 1.5, 16);
      const balconyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
      const balcony = new THREE.Mesh(balconyGeo, balconyMat);
      balcony.position.set(mx, 32, mz);
      mosqueGroup.add(balcony);

      const spireGeo = new THREE.ConeGeometry(1.8, 7, 16);
      const spireMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });
      const spire = new THREE.Mesh(spireGeo, spireMat);
      spire.position.set(mx, 41, mz);
      mosqueGroup.add(spire);

      // Minaret Lantern Light
      const mLamp = new THREE.PointLight(0xfef08a, 1.5, 20);
      mLamp.position.set(mx, 33, mz);
      mosqueGroup.add(mLamp);
    });

    // Prayer Terrace Carpets
    const carpetMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.9 });
    for (let r = 0; r < 3; r++) {
      const carpetGeo = new THREE.PlaneGeometry(22, 2.5);
      const carpet = new THREE.Mesh(carpetGeo, carpetMat);
      carpet.rotation.x = -Math.PI / 2;
      carpet.position.set(0, 0.08, 18 + r * 3.5);
      carpet.receiveShadow = true;
      mosqueGroup.add(carpet);
    }

    mosqueGroup.position.set(0, 0, -58);
    scene.add(mosqueGroup);

    // C. MADRASA & UNIVERSITY CAMPUS (Location: [-48, 0, -25])
    const uniGroup = new THREE.Group();
    const uniBodyGeo = new THREE.BoxGeometry(26, 11, 20);
    const uniBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 });
    const uniBody = new THREE.Mesh(uniBodyGeo, uniBodyMat);
    uniBody.position.set(0, 5.5, 0);
    uniBody.castShadow = true;
    uniGroup.add(uniBody);

    // Arched Colonnade Walkway
    for (let c = -10; c <= 10; c += 5) {
      const colGeo = new THREE.CylinderGeometry(0.3, 0.35, 7, 8);
      const colMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(c, 3.5, 11.5);
      uniGroup.add(col);
    }
    const uniRoof = new THREE.Mesh(new THREE.BoxGeometry(28, 1, 4), new THREE.MeshStandardMaterial({ color: 0x059669 }));
    uniRoof.position.set(0, 7.5, 11.5);
    uniGroup.add(uniRoof);

    uniGroup.position.set(-48, 0, -25);
    scene.add(uniGroup);

    // D. MARKETPLACE BAZAAR SOUQ (Location: [-26, 0, 26])
    const bazaarGroup = new THREE.Group();
    const stallColors = [0x059669, 0xd97706, 0x0284c7, 0xe11d48, 0x8b5cf6];
    for (let i = -2; i <= 2; i++) {
      const stallX = i * 7.5;
      // Stall table
      const stallGeo = new THREE.BoxGeometry(4.5, 1.2, 3.5);
      const stallMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const stall = new THREE.Mesh(stallGeo, stallMat);
      stall.position.set(stallX, 0.6, 0);
      stall.castShadow = true;
      bazaarGroup.add(stall);

      // Fabric Canopy Roof
      const canopyGeo = new THREE.ConeGeometry(3.2, 1.6, 4);
      const canopyMat = new THREE.MeshStandardMaterial({ color: stallColors[(i + 2) % stallColors.length], roughness: 0.5 });
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.set(stallX, 3.2, 0);
      canopy.rotation.y = Math.PI / 4;
      bazaarGroup.add(canopy);

      // Hanging Lantern
      const lanternGeo = new THREE.BoxGeometry(0.3, 0.5, 0.3);
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const lantern = new THREE.Mesh(lanternGeo, lanternMat);
      lantern.position.set(stallX, 2.2, 1.2);
      bazaarGroup.add(lantern);

      const stallLight = new THREE.PointLight(0xfef08a, 1.0, 8);
      stallLight.position.set(stallX, 2.2, 1.2);
      bazaarGroup.add(stallLight);
    }
    bazaarGroup.position.set(-26, 0, 26);
    scene.add(bazaarGroup);

    // E. PUBLIC PARK & FOUNTAIN (Location: [32, 0, -28])
    const parkGroup = new THREE.Group();
    // Grass lawn
    const lawnGeo = new THREE.PlaneGeometry(28, 28);
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 });
    const lawn = new THREE.Mesh(lawnGeo, lawnMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, 0.04, 0);
    lawn.receiveShadow = true;
    parkGroup.add(lawn);

    // Central Stone Fountain
    const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    fountainBase.position.set(0, 0.4, 0);
    parkGroup.add(fountainBase);

    const waterMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.8 });
    const water = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.0, 0.1, 16), waterMat);
    water.position.set(0, 0.85, 0);
    parkGroup.add(water);

    // Interactive Park Benches
    [[-6, 0, 0], [6, 0, 0], [0, 0, -6], [0, 0, 6]].forEach(([bx, by, bz], idx) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x92400e }));
      bench.position.set(bx, 0.3, bz);
      if (idx < 2) bench.rotation.y = Math.PI / 2;
      parkGroup.add(bench);
    });

    parkGroup.position.set(32, 0, -28);
    scene.add(parkGroup);

    // F. RESIDENTIAL APARTMENTS (Location: [52, 0, 15])
    const resGroup = new THREE.Group();
    const apt1 = new THREE.Mesh(new THREE.BoxGeometry(16, 18, 14), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
    apt1.position.set(0, 9, 0);
    apt1.castShadow = true;
    resGroup.add(apt1);

    // Mashrabiya Window Lattices
    for (let f = 1; f <= 3; f++) {
      for (let w = -4; w <= 4; w += 4) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.2), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 }));
        win.position.set(w, f * 4.5, 7.1);
        resGroup.add(win);
      }
    }
    resGroup.position.set(52, 0, 15);
    scene.add(resGroup);

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

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [userProfile.outfit, updateFacialFeatures]);

  // Keyboard Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement)?.tagName.toLowerCase())) return;
      keysRef.current[e.code] = true;

      // Quick key shortcuts
      if (e.code === 'KeyE') {
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
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSitting, isRunMode]);

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

  // Mobile Touch Controls: Dual Joystick (Left) and Camera Pan (Right)
  const handleTouchStart = (e: React.TouchEvent) => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.clientX < screenWidth * 0.45) {
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
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Update Joystick
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 50;
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(dy, dx);

        setJoystickVector({
          x: (Math.cos(angle) * clampedDist) / maxRadius,
          y: (Math.sin(angle) * clampedDist) / maxRadius,
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

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // 1. Update Moving Vehicles / Traffic
      vehiclesRef.current.forEach((veh) => {
        veh.mesh.position.addScaledVector(veh.direction, veh.speed * delta);
        if (veh.direction.x > 0 && veh.mesh.position.x > veh.pathEnd.x) {
          veh.mesh.position.copy(veh.pathStart);
        } else if (veh.direction.x < 0 && veh.mesh.position.x < veh.pathEnd.x) {
          veh.mesh.position.copy(veh.pathStart);
        } else if (veh.direction.z > 0 && veh.mesh.position.z > veh.pathEnd.z) {
          veh.mesh.position.copy(veh.pathStart);
        } else if (veh.direction.z < 0 && veh.mesh.position.z < veh.pathEnd.z) {
          veh.mesh.position.copy(veh.pathStart);
        }
      });

      // 2. Main Player Movement Input & Action State
      let moveForward = 0;
      let moveSide = 0;

      if (keysRef.current['KeyW'] || keysRef.current['ArrowUp']) moveForward += 1;
      if (keysRef.current['KeyS'] || keysRef.current['ArrowDown']) moveForward -= 1;
      if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) moveSide -= 1;
      if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) moveSide += 1;

      if (Math.abs(joystickVector.y) > 0.1) moveForward -= joystickVector.y;
      if (Math.abs(joystickVector.x) > 0.1) moveSide += joystickVector.x;

      // If user tapped WALK or RUN button, move physically forward continuous toggle
      const state = actionStateRef.current;
      if (state.toggleMovementMode === 'walk' && moveForward === 0 && moveSide === 0) {
        moveForward += 1;
      } else if (state.toggleMovementMode === 'run' && moveForward === 0 && moveSide === 0) {
        moveForward += 1;
      }

      const isSprinting = isRunMode || state.toggleMovementMode === 'run' || keysRef.current['ShiftLeft'] || keysRef.current['ShiftRight'];
      const speed = (isSprinting ? 9.5 : 4.8) * delta;

      const isMoving = (moveForward !== 0 || moveSide !== 0) && !isSitting && !isPraying && !isResting;

      if (isMoving) {
        const moveVector = new THREE.Vector3(moveSide, 0, -moveForward).normalize();
        moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleRef.current.horizontal);

        playerPositionRef.current.addScaledVector(moveVector, speed);

        // Clamp movement inside city borders
        playerPositionRef.current.x = Math.max(-100, Math.min(100, playerPositionRef.current.x));
        playerPositionRef.current.z = Math.max(-100, Math.min(100, playerPositionRef.current.z));

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

      // 3. Update Camera Following
      if (cameraRef.current) {
        const baseDistance = cameraDistanceRef.current;
        const camDistance = cameraViewMode === 'close_up' ? 4.5 : baseDistance;
        const camHeight = cameraViewMode === 'close_up' ? 2.2 : (camDistance * 0.45);

        const horiz = cameraAngleRef.current.horizontal;
        const vert = cameraAngleRef.current.vertical;

        const camX = playerPositionRef.current.x + camDistance * Math.sin(horiz) * Math.cos(vert);
        const camY = playerPositionRef.current.y + camHeight + camDistance * Math.sin(vert);
        const camZ = playerPositionRef.current.z + camDistance * Math.cos(horiz) * Math.cos(vert);

        cameraRef.current.position.set(camX, camY, camZ);
        cameraRef.current.lookAt(playerPositionRef.current.x, playerPositionRef.current.y + 1.6, playerPositionRef.current.z);
      }

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

  const handleAddFriendClick = (friendName: string, city: string) => {
    setAddedFriends((prev) => ({ ...prev, [friendName]: true }));
    if (onAddFriend) {
      onAddFriend(friendName, city);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    if (onSendChatMessage) {
      onSendChatMessage(chatInput.trim(), activeDirectChat ? 'dm' : 'global');
    }
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
      className="relative w-full h-screen overflow-hidden bg-black select-none touch-none font-sora"
    >
      {/* 3D WebGL Canvas filling 100% of the screen */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Top Floating World Header Navigation */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Top Left: Baraka City Brand Title */}
        <div className="flex items-center gap-3 bg-black/70 border border-white/10 backdrop-blur-md px-4 py-2 rounded-2xl pointer-events-auto shadow-2xl">
          <button
            onClick={() => onExitToLanding && onExitToLanding()}
            className="flex items-center gap-2.5 cursor-pointer group text-left"
            title="Return to Baraka City Homepage"
          >
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-sm font-black uppercase tracking-wider text-white group-hover:text-emerald-400 transition-colors">BARAKA CITY</span>
            <span className="text-[10px] font-hud text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
              ← MAIN SITE
            </span>
          </button>
        </div>

        {/* Center: Live World Status & Qibla Compass HUD */}
        <div className="hidden md:flex items-center gap-3 bg-black/70 border border-white/10 backdrop-blur-md px-4 py-1.5 rounded-2xl pointer-events-auto shadow-2xl">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
            <span className="text-[10px] font-hud font-bold text-white uppercase tracking-wider">QIBLA: GRAND MOSQUE NORTH</span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-[10px] font-hud text-emerald-400 font-bold uppercase">{userProfile.world || 'ABUJA'} LIVE · {onlineCount} CITIZENS</span>
          </div>
        </div>

        {/* Top Right: View Controls & Hamburger Drawer Toggle */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          {/* Camera View Switcher */}
          <button
            onClick={() => setCameraViewMode(cameraViewMode === 'third_person' ? 'close_up' : 'third_person')}
            className="px-3.5 py-2 bg-black/70 border border-white/10 backdrop-blur-md text-white rounded-xl text-xs font-extrabold uppercase tracking-wider hover:border-emerald-500 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
            title="Toggle Third Person / Close-up Camera View"
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{cameraViewMode === 'third_person' ? '3RD PERSON' : 'CLOSE UP'}</span>
          </button>

          {/* Audio Switcher */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className="p-2 bg-black/70 border border-white/10 backdrop-blur-md text-white rounded-xl hover:border-emerald-500 transition-all cursor-pointer shadow-lg"
            title="Toggle Ambient Sound"
          >
            {isAudioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-zinc-400" />}
          </button>

          {/* Minimal Overlay Hamburger Menu Drawer Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all cursor-pointer shadow-lg"
            title="Character Control Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

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
      <div className="absolute bottom-6 right-6 z-30 pointer-events-auto">
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
            const R = isMobileView ? act.radiusMobile : act.radiusDesktop;
            
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
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#12151f] border-2 border-emerald-400 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md animate-fadeIn">
          <div>
            <span className="text-xs font-black uppercase text-white block">NEARBY CITIZEN: {nearbyPlayer.name}</span>
            <span className="text-[10px] text-emerald-400 font-hud">{nearbyPlayer.city} Resident · {nearbyPlayer.distance}m away</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleActionTalk()}
              className="px-4 py-2 bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" /> TALK
            </button>

            <button
              onClick={() => handleAddFriendClick(nearbyPlayer.name, nearbyPlayer.city)}
              disabled={!!addedFriends[nearbyPlayer.name]}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
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
                  <UserPlus className="w-3.5 h-3.5" /> ADD FRIEND
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Player Home Entrance / Interior Controls */}
      {isNearHome && !nearbyPlayer && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-[#12151f] border-2 border-emerald-400 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md animate-fadeIn">
          <Home className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <span className="text-xs font-black uppercase text-white block">
              {isInPlayerHome ? 'PRIVATE RESIDENCE (INTERIOR)' : 'YOUR RESIDENCE HOME'}
            </span>
            <span className="text-[10px] text-zinc-400 font-hud">
              {isInPlayerHome ? 'Relax on your divan or rest on bed' : 'Press E to step into your private home'}
            </span>
          </div>

          <div className="flex items-center gap-2">
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
              className="px-4 py-2 bg-emerald-500 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl hover:bg-emerald-400 transition-all cursor-pointer whitespace-nowrap"
            >
              {isInPlayerHome ? 'EXIT HOME' : 'ENTER HOME [E]'}
            </button>
          </div>
        </div>
      )}

      {/* Direct In-World Chat Modal */}
      {activeDirectChat && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 bg-[#12151f] border-2 border-emerald-400 rounded-3xl p-5 max-w-md w-full shadow-2xl backdrop-blur-md animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
            <div>
              <span className="text-xs font-black uppercase text-white tracking-wider block">
                IN-WORLD CHAT WITH {activeDirectChat.name}
              </span>
              <span className="text-[10px] font-hud text-emerald-400">{activeDirectChat.city} Resident</span>
            </div>
            <button onClick={() => setActiveDirectChat(null)} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="h-44 overflow-y-auto p-3 bg-black/60 border border-white/10 rounded-2xl space-y-2 mb-3">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center pt-8">Type a message to send directly across WebSockets...</p>
            ) : (
              chatMessages.map((m) => (
                <div key={m.id} className="text-xs">
                  <span className="font-bold text-emerald-400 uppercase">{m.senderName}: </span>
                  <span className="text-white font-medium">{m.text}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChatMessage} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Message ${activeDirectChat.name}...`}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-grow bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            <button type="submit" className="p-2.5 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Minimal Overlay Hamburger Menu Drawer */}
      {isMenuOpen && (
        <div className="absolute top-16 right-4 z-50 bg-[#12151f]/95 border border-emerald-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl backdrop-blur-xl animate-fadeIn space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-base font-black uppercase tracking-wider text-white">CHARACTER & GAME CONTROL</h3>
            <button onClick={() => setIsMenuOpen(false)} className="text-zinc-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu Tabs */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-black/60 rounded-2xl border border-white/10">
            {(['character', 'friends', 'messages', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setMenuTab(tab)}
                className={`py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  menuTab === tab ? 'bg-emerald-500 text-black font-extrabold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {menuTab === 'character' && (
            <div className="space-y-4">
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
            <div className="space-y-4 text-xs font-bold uppercase text-zinc-300">
              <div className="flex items-center justify-between p-3 bg-black/50 rounded-2xl border border-white/10">
                <span>AMBIENT AUDIO</span>
                <button onClick={() => setIsAudioEnabled(!isAudioEnabled)} className="text-emerald-400">
                  {isAudioEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Desktop Keybind Helper Overlay */}
      <div className="hidden sm:flex absolute bottom-4 left-4 z-20 items-center gap-2 bg-black/70 border border-white/10 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider text-zinc-300 shadow-2xl">
        <span className="bg-white/10 px-2 py-0.5 rounded text-emerald-400 font-hud">WASD</span>
        <span>Move</span>
        <span className="text-zinc-600">·</span>
        <span className="bg-white/10 px-2 py-0.5 rounded text-emerald-400 font-hud">R</span>
        <span>Toggle Run</span>
        <span className="text-zinc-600">·</span>
        <span className="bg-white/10 px-2 py-0.5 rounded text-emerald-400 font-hud">F</span>
        <span>Sit/Stand</span>
        <span className="text-zinc-600">·</span>
        <span className="bg-white/10 px-2 py-0.5 rounded text-emerald-400 font-hud">P</span>
        <span>Pray</span>
        <span className="text-zinc-600">·</span>
        <span className="bg-white/10 px-2 py-0.5 rounded text-emerald-400 font-hud">E</span>
        <span>Interact</span>
      </div>

      {/* Mobile Touch Virtual Joystick */}
      {isMobileControlsVisible && (
        <div className="sm:hidden absolute bottom-6 left-6 z-30 w-24 h-24 rounded-full border-2 border-emerald-500/50 bg-black/40 backdrop-blur-md flex items-center justify-center pointer-events-auto">
          <div
            className="w-10 h-10 rounded-full bg-emerald-500 shadow-lg border border-white transition-transform"
            style={{
              transform: `translate(${joystickVector.x * 30}px, ${joystickVector.y * 30}px)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
