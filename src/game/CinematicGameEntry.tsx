/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Volume2, VolumeX, Compass, Users, Sparkles, ArrowRight, Eye, Play } from 'lucide-react';
import RabbitLogo from '../components/RabbitLogo';

interface CinematicGameEntryProps {
  onEnterWorld: (worldName?: string) => void;
  onStartTransition?: () => void;
  onlineCount?: number;
  initialWorld?: string;
}

interface MovingVehicle {
  mesh: THREE.Group;
  speed: number;
  direction: THREE.Vector3;
  pathStart: THREE.Vector3;
  pathEnd: THREE.Vector3;
}

interface AutonomousAvatar {
  mesh: THREE.Group;
  name: string;
  city: string;
  role: string;
  type: 'walker' | 'prayer' | 'talker' | 'sitter';
  pathStart?: THREE.Vector3;
  pathEnd?: THREE.Vector3;
  direction?: number;
  speed?: number;
  partner?: THREE.Group;
}

// Helper: Compute aspect-aware responsive FOV and camera framing
const calculateAdaptiveCamera = (w: number, h: number) => {
  const aspect = w / Math.max(1, h);
  let fov = 50;

  if (aspect >= 2.2) {
    // Ultrawide (21:9, 32:9)
    fov = 46;
  } else if (aspect >= 1.6) {
    // Standard desktop (16:9, 16:10)
    fov = 50;
  } else if (aspect >= 1.25) {
    // Landscape tablets, 4:3, laptops
    fov = 56;
  } else if (aspect >= 0.9) {
    // Square / squarish screens
    fov = 64;
  } else if (aspect >= 0.65) {
    // Portrait tablets (iPad, Galaxy Tab portrait)
    fov = 70;
  } else if (aspect >= 0.48) {
    // Standard portrait phones (Pixel, Galaxy, iPhone standard)
    fov = 78;
  } else {
    // Very tall/narrow phones (iPhone Pro Max, Galaxy Ultra, aspect < 0.48)
    fov = 84;
  }

  return { fov, aspect };
};

export default function CinematicGameEntry({
  onEnterWorld,
  onStartTransition,
  onlineCount = 1420,
  initialWorld = 'Abuja Metropolis',
}: CinematicGameEntryProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Responsive Stepped Loading Sequence: 0% -> 45% -> 75% -> 100%
  const [loadingTarget, setLoadingTarget] = useState<number>(0);
  const [displayedProgress, setDisplayedProgress] = useState<number>(0);
  const [isGameReady, setIsGameReady] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [selectedWorld, setSelectedWorld] = useState(initialWorld);
  const [currentFocalArea, setCurrentFocalArea] = useState('Grand Mosque & Central Boulevard');
  const [isInteractiveLook, setIsInteractiveLook] = useState(false);

  // Stepped loading phase scheduler
  useEffect(() => {
    const t1 = setTimeout(() => setLoadingTarget(45), 200);
    const t2 = setTimeout(() => setLoadingTarget(75), 900);
    const t3 = setTimeout(() => setLoadingTarget(100), 1850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Smooth number interpolation animation frame
  useEffect(() => {
    let animId: number;
    const updateProgress = () => {
      setDisplayedProgress((current) => {
        if (current >= loadingTarget) {
          if (current >= 100) {
            setIsGameReady(true);
          }
          return current;
        }
        const diff = loadingTarget - current;
        const step = Math.max(0.65, diff * 0.12);
        const next = Math.min(loadingTarget, current + step);
        if (next >= 100) {
          setIsGameReady(true);
        }
        return next;
      });
      animId = requestAnimationFrame(updateProgress);
    };

    animId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animId);
  }, [loadingTarget]);

  // Audio synthesizer ref
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientOscRef = useRef<OscillatorNode | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);

  // Scene & Camera Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vehiclesRef = useRef<MovingVehicle[]>([]);
  const avatarsRef = useRef<AutonomousAvatar[]>([]);

  // Camera animation parameters
  const cameraProgressRef = useRef<number>(0);
  const cameraLookOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const prevMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Play harmonious chime
  const playEntranceChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioCtxRef.current || new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === 'suspended') ctx.resume();

      // Deep resonant spiritual chord (E minor / modal pentatonic)
      const frequencies = [164.81, 247.94, 329.63, 493.88];
      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12 / (idx + 1), ctx.currentTime + 0.15 + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + 2.5);
      });
    } catch {
      // Audio policy safe
    }
  }, []);

  const handleEnterClick = useCallback(() => {
    if (isEntering || !isGameReady) return;
    setIsEntering(true);
    onStartTransition?.();
    playEntranceChime();

    // Trigger smooth transition after cinematic fly-in
    setTimeout(() => {
      onEnterWorld(selectedWorld);
    }, 1200);
  }, [isEntering, isGameReady, onEnterWorld, onStartTransition, playEntranceChime, selectedWorld]);

  // Keyboard shortcut: Press Enter or Space to enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        if (!isEntering && isGameReady) {
          handleEnterClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEntering, isGameReady, handleEnterClick]);


  // Mouse drag for interactive camera look
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };
    setIsInteractiveLook(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMouseRef.current.x;
    const deltaY = e.clientY - prevMouseRef.current.y;

    cameraLookOffsetRef.current.x -= deltaX * 0.003;
    cameraLookOffsetRef.current.y = Math.max(-0.4, Math.min(0.4, cameraLookOffsetRef.current.y + deltaY * 0.003));

    prevMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Touch look on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      isDraggingRef.current = true;
      prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      setIsInteractiveLook(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length === 0) return;
    const deltaX = e.touches[0].clientX - prevMouseRef.current.x;
    const deltaY = e.touches[0].clientY - prevMouseRef.current.y;

    cameraLookOffsetRef.current.x -= deltaX * 0.004;
    cameraLookOffsetRef.current.y = Math.max(-0.4, Math.min(0.4, cameraLookOffsetRef.current.y + deltaY * 0.004));

    prevMouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Helper: Create 3D Human Avatar
  const createAvatar = (colorHex: number, hatColorHex = 0xffffff) => {
    const group = new THREE.Group();

    // Body / Robe
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.55, 1.4, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.45 });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.name = 'bodyMesh';
    bodyMesh.position.y = 0.9;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Gold Trim Sash
    const sashGeo = new THREE.CylinderGeometry(0.38, 0.4, 0.08, 16);
    const sashMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.2 });
    const sash = new THREE.Mesh(sashGeo, sashMat);
    sash.position.y = 1.0;
    group.add(sash);

    // Head
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe5c0a2, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.name = 'headMesh';
    head.position.y = 1.85;
    head.castShadow = true;
    group.add(head);

    // Hat / Tagiyah
    const hatGeo = new THREE.CylinderGeometry(0.31, 0.31, 0.18, 16);
    const hatMat = new THREE.MeshStandardMaterial({ color: hatColorHex, roughness: 0.3 });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 2.02;
    group.add(hat);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: colorHex });

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

  // Helper: Create 3D Car
  const createVehicleMesh = (colorHex: number) => {
    const carGroup = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(2.2, 0.9, 4.4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: colorHex, metalness: 0.65, roughness: 0.25 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    carGroup.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.8, 0.7, 2.2);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.3, -0.2);
    carGroup.add(cabin);

    // Headlights
    const lightGeo = new THREE.BoxGeometry(0.3, 0.2, 0.1);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const l1 = new THREE.Mesh(lightGeo, lightMat);
    l1.position.set(-0.8, 0.7, 2.22);
    carGroup.add(l1);

    const l2 = new THREE.Mesh(lightGeo, lightMat);
    l2.position.set(0.8, 0.7, 2.22);
    carGroup.add(l2);

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

  // Build Full 3D Cinematic Living World
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const skyHorizonColor = new THREE.Color(0x181e33);
    scene.background = skyHorizonColor;
    scene.fog = new THREE.FogExp2(0x181e33, 0.007);

    // Sky Dome with Sunset Twilight Gradient
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 512;
    skyCanvas.height = 512;
    const skyCtx = skyCanvas.getContext('2d');
    if (skyCtx) {
      const grad = skyCtx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#090d1c'); // Deep twilight zenith
      grad.addColorStop(0.48, '#1e1b4b'); // Royal indigo
      grad.addColorStop(0.72, '#7c2d12'); // Rich terracotta sunset
      grad.addColorStop(0.88, '#d97706'); // Warm amber horizon
      grad.addColorStop(1.0, '#f59e0b'); // Golden dusk
      skyCtx.fillStyle = grad;
      skyCtx.fillRect(0, 0, 512, 512);
    }
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    const skyGeo = new THREE.SphereGeometry(240, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, depthWrite: false });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // Distant City Skyline Silhouette
    const skylineGroup = new THREE.Group();
    const silMat = new THREE.MeshBasicMaterial({ color: 0x111625, fog: true });
    for (let i = 0; i < 32; i++) {
      const angle = (i / 32) * Math.PI * 2;
      const dist = 190 + (i % 3) * 15;
      const w = 14 + (i % 4) * 6;
      const h = 28 + ((i * 7) % 40);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 12), silMat);
      tower.position.set(Math.cos(angle) * dist, h / 2, Math.sin(angle) * dist);
      tower.rotation.y = -angle;
      skylineGroup.add(tower);

      if (i % 2 === 0) {
        const dDome = new THREE.Mesh(new THREE.SphereGeometry(w * 0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), silMat);
        dDome.position.set(Math.cos(angle) * dist, h, Math.sin(angle) * dist);
        skylineGroup.add(dDome);
      }
    }
    scene.add(skylineGroup);

    // Camera with aspect-aware adaptive FOV
    const { fov, aspect } = calculateAdaptiveCamera(width, height);
    const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 450);
    cameraRef.current = camera;
    camera.position.set(0, 18, 55);

    // Renderer (Performance-optimized for low-end to high-end devices)
    const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || width < 768;
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: !isMobileDevice,
      alpha: false,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobileDevice ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = isMobileDevice ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffedd5, 0x1e293b, 0.9);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.55);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfef3c7, 1.55);
    sunLight.position.set(65, 80, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = isMobileDevice ? 1024 : 2048;
    sunLight.shadow.mapSize.height = isMobileDevice ? 1024 : 2048;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Ground Base
    const groundGeo = new THREE.PlaneGeometry(320, 320);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Roads & Markings
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e2433, roughness: 0.45 });
    const lineYellowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const lineWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

    // East-West Road
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(300, 14), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.02, 0);
    roadH.receiveShadow = true;
    scene.add(roadH);

    const centerLineH = new THREE.Mesh(new THREE.PlaneGeometry(300, 0.25), lineYellowMat);
    centerLineH.rotation.x = -Math.PI / 2;
    centerLineH.position.set(0, 0.03, 0);
    scene.add(centerLineH);

    // North-South Road
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(14, 300), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(0, 0.02, 0);
    roadV.receiveShadow = true;
    scene.add(roadV);

    const centerLineV = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 300), lineYellowMat);
    centerLineV.rotation.x = -Math.PI / 2;
    centerLineV.position.set(0, 0.03, 0);
    scene.add(centerLineV);

    // Grand Mosque Plaza
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

    const grandPlaza = new THREE.Mesh(
      new THREE.PlaneGeometry(36, 60),
      new THREE.MeshStandardMaterial({ map: plazaTexture, roughness: 0.35, metalness: 0.1 })
    );
    grandPlaza.rotation.x = -Math.PI / 2;
    grandPlaza.position.set(0, 0.05, -35);
    grandPlaza.receiveShadow = true;
    scene.add(grandPlaza);

    // Sidewalk Borders
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const sidewalk1 = new THREE.Mesh(new THREE.BoxGeometry(300, 0.15, 3), sidewalkMat);
    sidewalk1.position.set(0, 0.08, 8.5);
    scene.add(sidewalk1);

    const sidewalk2 = new THREE.Mesh(new THREE.BoxGeometry(300, 0.15, 3), sidewalkMat);
    sidewalk2.position.set(0, 0.08, -8.5);
    scene.add(sidewalk2);

    // Street Lamps
    for (let x = -100; x <= 100; x += 30) {
      if (Math.abs(x) < 14) continue;
      [9.8, -9.8].forEach((z) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 5, 8), new THREE.MeshStandardMaterial({ color: 0x475569 }));
        pole.position.set(x, 2.5, z);
        scene.add(pole);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
        bulb.position.set(x, 5, z);
        scene.add(bulb);

        const light = new THREE.PointLight(0xfef08a, 1.2, 16);
        light.position.set(x, 4.8, z);
        scene.add(light);
      });
    }

    // GRAND MOSQUE (Location: [0, 0, -60])
    const mosqueGroup = new THREE.Group();

    const hall = new THREE.Mesh(new THREE.BoxGeometry(34, 11, 30), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 }));
    hall.position.set(0, 5.5, 0);
    hall.castShadow = true;
    mosqueGroup.add(hall);

    // Grand Central Dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(9.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.25, metalness: 0.5 })
    );
    dome.position.set(0, 16, 0);
    dome.castShadow = true;
    mosqueGroup.add(dome);

    // Golden Crescent Finial
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.25, 12, 24, Math.PI * 1.5),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 })
    );
    crescent.position.set(0, 26, 0);
    crescent.rotation.z = Math.PI / 4;
    mosqueGroup.add(crescent);

    // Dome Drum
    const domeBase = new THREE.Mesh(new THREE.CylinderGeometry(9.6, 9.6, 5, 32), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 }));
    domeBase.position.set(0, 13.5, 0);
    mosqueGroup.add(domeBase);

    // Drum Windows
    for (let w = 0; w < 8; w++) {
      const wAngle = (w / 8) * Math.PI * 2;
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.3), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      win.position.set(Math.cos(wAngle) * 9.65, 13.5, Math.sin(wAngle) * 9.65);
      win.rotation.y = -wAngle + Math.PI / 2;
      mosqueGroup.add(win);
    }

    // Monumental Entrance Arch
    const portal = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 3), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    portal.position.set(0, 5, 15.5);
    mosqueGroup.add(portal);

    const archInner = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.6, 6, 16, 1, false, 0, Math.PI),
      new THREE.MeshBasicMaterial({ color: 0x0f172a })
    );
    archInner.rotation.x = Math.PI / 2;
    archInner.position.set(0, 4, 16.5);
    mosqueGroup.add(archInner);

    // Minarets
    [[-19, -17], [19, -17], [-19, 17], [19, 17]].forEach(([mx, mz]) => {
      const minaret = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.5, 40, 16), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }));
      minaret.position.set(mx, 20, mz);
      minaret.castShadow = true;
      mosqueGroup.add(minaret);

      const spire = new THREE.Mesh(new THREE.ConeGeometry(1.8, 7, 16), new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85 }));
      spire.position.set(mx, 43.5, mz);
      mosqueGroup.add(spire);

      const lamp = new THREE.PointLight(0xfef08a, 1.4, 22);
      lamp.position.set(mx, 34, mz);
      mosqueGroup.add(lamp);
    });

    // Prayer Carpets on Courtyard
    for (let r = 0; r < 3; r++) {
      const carpet = new THREE.Mesh(new THREE.PlaneGeometry(24, 2.6), new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.9 }));
      carpet.rotation.x = -Math.PI / 2;
      carpet.position.set(0, 0.08, 19 + r * 3.6);
      carpet.receiveShadow = true;
      mosqueGroup.add(carpet);
    }

    mosqueGroup.position.set(0, 0, -60);
    scene.add(mosqueGroup);

    // ISLAMIC UNIVERSITY / CAMPUS ([-50, 0, -25])
    const uniGroup = new THREE.Group();
    const uniBody = new THREE.Mesh(new THREE.BoxGeometry(28, 12, 22), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 }));
    uniBody.position.set(0, 6, 0);
    uniBody.castShadow = true;
    uniGroup.add(uniBody);

    for (let c = -11; c <= 11; c += 5.5) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 7.5, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
      col.position.set(c, 3.75, 12.5);
      uniGroup.add(col);
    }
    const uniRoof = new THREE.Mesh(new THREE.BoxGeometry(30, 1.2, 4.5), new THREE.MeshStandardMaterial({ color: 0x059669 }));
    uniRoof.position.set(0, 8, 12.5);
    uniGroup.add(uniRoof);

    uniGroup.position.set(-50, 0, -25);
    scene.add(uniGroup);

    // BAZAAR SOUQ MARKETPLACE ([-28, 0, 26])
    const bazaarGroup = new THREE.Group();
    const stallColors = [0x059669, 0xd97706, 0x0284c7, 0xe11d48, 0x8b5cf6];
    for (let i = -2; i <= 2; i++) {
      const stallX = i * 8;
      const stall = new THREE.Mesh(new THREE.BoxGeometry(5, 1.3, 3.8), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 }));
      stall.position.set(stallX, 0.65, 0);
      stall.castShadow = true;
      bazaarGroup.add(stall);

      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(3.5, 1.8, 4),
        new THREE.MeshStandardMaterial({ color: stallColors[(i + 2) % stallColors.length], roughness: 0.5 })
      );
      canopy.position.set(stallX, 3.4, 0);
      canopy.rotation.y = Math.PI / 4;
      bazaarGroup.add(canopy);

      const bLamp = new THREE.PointLight(0xfef08a, 1.2, 10);
      bLamp.position.set(stallX, 2.4, 1.2);
      bazaarGroup.add(bLamp);
    }
    bazaarGroup.position.set(-28, 0, 26);
    scene.add(bazaarGroup);

    // RESIDENTIAL DISTRICT ([36, 0, 18] and [55, 0, -10])
    const resGroup = new THREE.Group();
    const apt1 = new THREE.Mesh(new THREE.BoxGeometry(18, 19, 15), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }));
    apt1.position.set(0, 9.5, 0);
    apt1.castShadow = true;
    resGroup.add(apt1);

    for (let f = 1; f <= 3; f++) {
      for (let w = -4.5; w <= 4.5; w += 4.5) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.2), new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 }));
        win.position.set(w, f * 4.6, 7.6);
        resGroup.add(win);
      }
    }
    resGroup.position.set(50, 0, 16);
    scene.add(resGroup);

    // PUBLIC PARK & FOUNTAIN ([32, 0, -28])
    const parkGroup = new THREE.Group();
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 }));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, 0.04, 0);
    lawn.receiveShadow = true;
    parkGroup.add(lawn);

    const fBase = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 0.9, 16), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    fBase.position.set(0, 0.45, 0);
    parkGroup.add(fBase);

    const water = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.8 }));
    water.position.set(0, 0.95, 0);
    parkGroup.add(water);

    // Benches
    [[-7, 0, 0], [7, 0, 0], [0, 0, -7], [0, 0, 7]].forEach(([bx, by, bz], idx) => {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x92400e }));
      bench.position.set(bx, 0.3, bz);
      if (idx < 2) bench.rotation.y = Math.PI / 2;
      parkGroup.add(bench);
    });
    parkGroup.position.set(32, 0, -28);
    scene.add(parkGroup);

    // Palm Trees
    [
      [-32, 16], [32, 16], [-32, -16], [32, -16],
      [-52, 32], [52, 32], [-52, -32], [52, -32],
      [-16, -35], [16, -35], [-16, 35], [16, 35]
    ].forEach(([px, pz]) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 7.5, 8), new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }));
      trunk.position.set(px, 3.75, pz);
      scene.add(trunk);

      const fronds = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.8, 4), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.6 }));
        frond.rotation.z = Math.PI / 3;
        frond.rotation.y = (i * Math.PI) / 3;
        frond.position.set(0, 7.4, 0);
        fronds.add(frond);
      }
      fronds.position.set(px, 0, pz);
      scene.add(fronds);
    });

    // 4 MOVING TRAFFIC VEHICLES
    const v1 = createVehicleMesh(0x0284c7);
    v1.position.set(-80, 0, -3.5);
    v1.rotation.y = Math.PI / 2; // Face Eastbound (+X)
    scene.add(v1);

    const v2 = createVehicleMesh(0xd97706);
    v2.position.set(80, 0, 3.5);
    v2.rotation.y = -Math.PI / 2; // Face Westbound (-X)
    scene.add(v2);

    const v3 = createVehicleMesh(0xf8fafc);
    v3.position.set(3.5, 0, -90);
    v3.rotation.y = 0; // Face Southbound (+Z)
    scene.add(v3);

    const v4 = createVehicleMesh(0x10b981);
    v4.position.set(-3.5, 0, 90);
    v4.rotation.y = Math.PI; // Face Northbound (-Z)
    scene.add(v4);

    vehiclesRef.current = [
      { mesh: v1, speed: 17, direction: new THREE.Vector3(1, 0, 0), pathStart: new THREE.Vector3(-130, 0, -3.5), pathEnd: new THREE.Vector3(130, 0, -3.5) },
      { mesh: v2, speed: 19, direction: new THREE.Vector3(-1, 0, 0), pathStart: new THREE.Vector3(130, 0, 3.5), pathEnd: new THREE.Vector3(-130, 0, 3.5) },
      { mesh: v3, speed: 16, direction: new THREE.Vector3(0, 0, 1), pathStart: new THREE.Vector3(3.5, 0, -130), pathEnd: new THREE.Vector3(3.5, 0, 130) },
      { mesh: v4, speed: 18, direction: new THREE.Vector3(0, 0, -1), pathStart: new THREE.Vector3(-3.5, 0, 130), pathEnd: new THREE.Vector3(-3.5, 0, -130) },
    ];

    // AUTONOMOUS POPULATION: 12 Active 3D Avatars
    const createdAvatars: AutonomousAvatar[] = [];

    // Walkers along Central Plaza & Sidewalks
    const walkerData = [
      { name: 'Tariq_KSA', city: 'Makkah', color: 0x10b981, start: new THREE.Vector3(-6, 0, -15), end: new THREE.Vector3(6, 0, -45), speed: 2.5 },
      { name: 'Fatima_Lagos', city: 'Lagos', color: 0x3b82f6, start: new THREE.Vector3(-12, 0, 10), end: new THREE.Vector3(-24, 0, 24), speed: 2.2 },
      { name: 'Amir_Cairo', city: 'Cairo', color: 0xf59e0b, start: new THREE.Vector3(16, 0, -5), end: new THREE.Vector3(30, 0, 14), speed: 2.8 },
      { name: 'Zainab_DXB', city: 'Dubai', color: 0xec4899, start: new THREE.Vector3(-35, 0, -18), end: new THREE.Vector3(-45, 0, -25), speed: 2.1 },
      { name: 'Youssef_Kano', city: 'Kano', color: 0x8b5cf6, start: new THREE.Vector3(2, 0, 16), end: new THREE.Vector3(2, 0, -20), speed: 2.4 },
    ];

    walkerData.forEach((wd) => {
      const mesh = createAvatar(wd.color);
      mesh.position.copy(wd.start);
      scene.add(mesh);
      createdAvatars.push({
        mesh,
        name: wd.name,
        city: wd.city,
        role: 'Citizen',
        type: 'walker',
        pathStart: wd.start,
        pathEnd: wd.end,
        direction: 1,
        speed: wd.speed,
      });
    });

    // Conversational Pair in Plaza
    const talker1Mesh = createAvatar(0x06b6d4);
    talker1Mesh.position.set(-4, 0, -22);
    talker1Mesh.rotation.y = Math.PI / 3;
    scene.add(talker1Mesh);

    const talker2Mesh = createAvatar(0xe11d48);
    talker2Mesh.position.set(-2.5, 0, -21);
    talker2Mesh.rotation.y = -Math.PI / 1.5;
    scene.add(talker2Mesh);

    createdAvatars.push(
      { mesh: talker1Mesh, name: 'Maryam_Abuja', city: 'Abuja', role: 'Architect', type: 'talker', partner: talker2Mesh },
      { mesh: talker2Mesh, name: 'Bilal_Casablanca', city: 'Casablanca', role: 'Merchant', type: 'talker', partner: talker1Mesh }
    );

    // Worshippers in Prayer at Mosque Courtyard Carpets
    const prayerPositions: [number, number, number][] = [
      [-4, 0, -41],
      [0, 0, -41],
      [4, 0, -41],
      [-2, 0, -44.5],
      [2, 0, -44.5],
    ];

    prayerPositions.forEach(([px, py, pz], idx) => {
      const pMesh = createAvatar(idx % 2 === 0 ? 0xffffff : 0x059669);
      pMesh.position.set(px, py, pz);
      // Face towards Qibla North (-Z)
      pMesh.rotation.y = Math.PI;
      scene.add(pMesh);
      createdAvatars.push({
        mesh: pMesh,
        name: `Scholar_${idx + 1}`,
        city: 'Baraka',
        role: 'Prayer Circle',
        type: 'prayer',
      });
    });

    avatarsRef.current = createdAvatars;

    // Responsive Window, Device Orientation & Container Resize
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      
      const { fov, aspect } = calculateAdaptiveCamera(w, h);
      cameraRef.current.aspect = aspect;
      cameraRef.current.fov = fov;
      cameraRef.current.updateProjectionMatrix();

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || w < 768;
      rendererRef.current.setSize(w, h, false);
      rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
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
  }, []);

  // 60FPS Game Loop with Sweeping Cinematic Drone Camera
  useEffect(() => {
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // 1. Vehicles
      vehiclesRef.current.forEach((veh) => {
        veh.mesh.position.addScaledVector(veh.direction, veh.speed * delta);
        if (veh.direction.x > 0 && veh.mesh.position.x > veh.pathEnd.x) veh.mesh.position.copy(veh.pathStart);
        if (veh.direction.x < 0 && veh.mesh.position.x < veh.pathEnd.x) veh.mesh.position.copy(veh.pathStart);
        if (veh.direction.z > 0 && veh.mesh.position.z > veh.pathEnd.z) veh.mesh.position.copy(veh.pathStart);
        if (veh.direction.z < 0 && veh.mesh.position.z < veh.pathEnd.z) veh.mesh.position.copy(veh.pathStart);
      });

      // 2. Avatars animation
      avatarsRef.current.forEach((av) => {
        if (av.type === 'walker' && av.pathStart && av.pathEnd) {
          const target = av.direction === 1 ? av.pathEnd : av.pathStart;
          const dir = new THREE.Vector3().subVectors(target, av.mesh.position);
          const dist = dir.length();

          if (dist < 1.2) {
            av.direction = av.direction === 1 ? -1 : 1;
          } else {
            dir.normalize();
            av.mesh.position.addScaledVector(dir, (av.speed || 2.2) * delta);
            av.mesh.rotation.y = THREE.MathUtils.lerp(av.mesh.rotation.y, Math.atan2(dir.x, dir.z), 0.1);

            const leftLeg = av.mesh.getObjectByName('leftLeg');
            const rightLeg = av.mesh.getObjectByName('rightLeg');
            const leftArm = av.mesh.getObjectByName('leftArm');
            const rightArm = av.mesh.getObjectByName('rightArm');

            const swing = Math.sin(elapsed * 7) * 0.55;
            if (leftLeg) leftLeg.rotation.x = swing;
            if (rightLeg) rightLeg.rotation.x = -swing;
            if (leftArm) leftArm.rotation.x = -swing * 0.8;
            if (rightArm) rightArm.rotation.x = swing * 0.8;
          }
        } else if (av.type === 'prayer') {
          // Continuous reverence prayer cycle
          const pCycle = (elapsed + av.mesh.position.x) % 10;
          const body = av.mesh.getObjectByName('bodyMesh');
          const leftArm = av.mesh.getObjectByName('leftArm');
          const rightArm = av.mesh.getObjectByName('rightArm');

          if (pCycle < 4) {
            // Qiyam: hands folded
            if (body) body.rotation.x = 0;
            if (leftArm) { leftArm.rotation.x = -0.5; leftArm.rotation.z = 0.2; }
            if (rightArm) { rightArm.rotation.x = -0.5; rightArm.rotation.z = -0.2; }
            av.mesh.position.y = 0;
          } else if (pCycle < 7) {
            // Ruku: bowing
            if (body) body.rotation.x = Math.PI / 2.3;
            if (leftArm) { leftArm.rotation.x = -0.2; leftArm.rotation.z = 0; }
            if (rightArm) { rightArm.rotation.x = -0.2; rightArm.rotation.z = 0; }
            av.mesh.position.y = 0;
          } else {
            // Sujud: prostration
            if (body) body.rotation.x = Math.PI / 1.9;
            av.mesh.position.y = -0.45;
          }
        } else if (av.type === 'talker') {
          // Subtle gesturing
          const rArm = av.mesh.getObjectByName('rightArm');
          if (rArm) {
            rArm.rotation.x = -0.6 + Math.sin(elapsed * 4 + av.mesh.position.x) * 0.25;
            rArm.rotation.z = -0.3;
          }
        }
      });

      // 3. Cinematic Camera Drone Path (Aspect & Orientation Aware)
      if (cameraRef.current) {
        const aspect = cameraRef.current.aspect || 1.6;
        const isPortrait = aspect < 1.0;
        const isUltrawide = aspect > 2.0;

        if (isEntering) {
          // Dynamic entrance rush: camera accelerates smoothly toward boulevard street level
          cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, isPortrait ? 4.0 : 3.2, 0.08);
          cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, isPortrait ? 23.0 : 20.0, 0.08);
          cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, 0, 0.08);
          cameraRef.current.lookAt(0, isPortrait ? 3.0 : 2.0, -30);
        } else {
          // Continuous, gentle cinematic glide through the city
          cameraProgressRef.current += delta * 0.12;
          const t = cameraProgressRef.current;

          // Adaptive figure-8 sweeping orbit path with smooth altitude breathing
          const orbitRadiusX = isPortrait ? 26 : isUltrawide ? 42 : 36;
          const orbitBaseZ = isPortrait ? 42 : 35;
          const orbitBaseY = isPortrait ? 18 : 14;

          const camX = Math.sin(t * 0.8) * orbitRadiusX;
          const camZ = orbitBaseZ + Math.cos(t * 0.6) * 22;
          const camY = orbitBaseY + Math.sin(t * 0.4) * 6;

          // Target focus transitions naturally based on camera position and viewport
          let lookTargetX = 0;
          let lookTargetY = isPortrait ? 11 : 8;
          let lookTargetZ = -45;

          // Determine current focal area label for HUD
          const normPhase = (t % (Math.PI * 4));
          if (normPhase < Math.PI) {
            setCurrentFocalArea('Grand Mosque & Ceremonial Plaza');
            lookTargetX = 0;
            lookTargetY = isPortrait ? 13 : 10;
            lookTargetZ = -55;
          } else if (normPhase < Math.PI * 2) {
            setCurrentFocalArea('Souq Al-Baraka Marketplace & Promenade');
            lookTargetX = -20;
            lookTargetY = isPortrait ? 7 : 5;
            lookTargetZ = 15;
          } else if (normPhase < Math.PI * 3) {
            setCurrentFocalArea('Islamic University Campus & Colonnade');
            lookTargetX = -38;
            lookTargetY = isPortrait ? 10 : 8;
            lookTargetZ = -20;
          } else {
            setCurrentFocalArea('Central Boulevard & Residential District');
            lookTargetX = 22;
            lookTargetY = isPortrait ? 9 : 7;
            lookTargetZ = 5;
          }

          // Apply gentle interactive look offset if user dragged or swiped
          const finalCamX = camX + cameraLookOffsetRef.current.x * (isPortrait ? 8 : 12);
          const finalCamY = Math.max(3.5, camY - cameraLookOffsetRef.current.y * (isPortrait ? 8 : 12));

          cameraRef.current.position.set(finalCamX, finalCamY, camZ);
          cameraRef.current.lookAt(lookTargetX, lookTargetY, lookTargetZ);
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isEntering]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#090a0f] select-none touch-none font-sora text-white"
    >
      {/* 3D WebGL Canvas filling 100% of the screen */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing touch-none" />

      {/* Cinematic Vignette Overlay with dynamic depth */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#090a0f]/95 via-transparent to-[#090a0f]/70" />
      <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-transparent to-black/60" />

      {/* TOP HEADER: Responsive Game HUD */}
      <div className="absolute top-0 inset-x-0 z-30 pt-[max(env(safe-area-inset-top),0.75rem)] px-3 xs:px-4 sm:px-6 md:px-8 pb-2 flex items-center justify-between pointer-events-none">
        {/* Left: Baraka City Rabbit Emblem & Title */}
        <div className="flex items-center gap-2 sm:gap-3 bg-black/70 border border-white/10 backdrop-blur-md px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl pointer-events-auto shadow-2xl">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/10 p-0.5 flex items-center justify-center shrink-0">
            <RabbitLogo size={20} inverted={true} />
          </div>
          <div>
            <span className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase bg-gradient-to-r from-white via-zinc-200 to-emerald-400 bg-clip-text text-transparent block leading-tight">
              BARAKA CITY
            </span>
            <span className="text-[8px] sm:text-[9px] font-hud text-zinc-400 uppercase tracking-widest block leading-none">
              LIVE 3D METROPOLIS
            </span>
          </div>
        </div>

        {/* Right: Live Server Cluster & Audio Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto">
          {/* Realm Indicator - Responsive badges */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-black/70 border border-white/10 backdrop-blur-md px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl text-[9px] xs:text-[10px] sm:text-[11px] font-bold shadow-xl">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span className="text-zinc-200 font-hud uppercase max-w-[80px] xs:max-w-[120px] sm:max-w-none truncate">{selectedWorld.toUpperCase()}</span>
            <span className="hidden xs:inline text-zinc-600">|</span>
            <span className="hidden xs:inline text-emerald-400 font-hud">{onlineCount.toLocaleString()} CITIZENS</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setIsAudioEnabled(!isAudioEnabled)}
            className="p-1.5 sm:px-3 sm:py-2 bg-black/70 border border-white/10 backdrop-blur-md text-white rounded-xl hover:border-emerald-500 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xl shrink-0"
            title="Toggle Ambient Audio"
            aria-label="Toggle Ambient Audio"
          >
            {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />}
            <span className="hidden md:inline text-[10px] font-bold uppercase">{isAudioEnabled ? 'AUDIO ON' : 'AUDIO OFF'}</span>
          </button>
        </div>
      </div>

      {/* CURRENT LOCATION TELEMETRY: Top Left Sub-Badge (adaptive position, hidden on tiny landscape screens) */}
      <div className="hidden xs:block absolute top-[calc(max(env(safe-area-inset-top),0.75rem)+3.25rem)] sm:top-[calc(max(env(safe-area-inset-top),0.75rem)+4.25rem)] left-3 xs:left-4 sm:left-6 md:left-8 z-20 pointer-events-none max-w-[85vw] sm:max-w-md">
        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-black/60 border border-emerald-500/30 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-hud text-zinc-300 shadow-xl truncate">
          <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400 animate-pulse shrink-0" />
          <span className="text-emerald-400 font-bold uppercase shrink-0">VIEW:</span>
          <span className="text-white font-medium uppercase tracking-wider truncate">{currentFocalArea}</span>
        </div>
      </div>

      {/* CENTERPIECE: Monumental Game Title, Animated Loading & BISMILLAH Entrance */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center justify-end text-center pointer-events-none pb-[max(env(safe-area-inset-bottom),1rem)] px-3 xs:px-4 sm:px-6">
        <div className="max-w-lg md:max-w-xl w-full pointer-events-auto flex flex-col items-center animate-fadeIn">
          
          {/* Arabic Basmala / Divine Invocation */}
          <div className="mb-1.5 sm:mb-2.5">
            <span className="text-sm xs:text-base sm:text-xl md:text-2xl font-serif text-emerald-400/90 tracking-widest drop-shadow-[0_2px_12px_rgba(16,185,129,0.35)] block leading-tight">
              بِسْمِ ٱللَّٰهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </span>
          </div>

          {/* Monumental Title */}
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight text-white mb-1.5 sm:mb-2 drop-shadow-[0_4px_24px_rgba(0,0,0,0.85)] leading-none">
            BARAKA CITY
          </h1>

          {/* Cinematic Tagline - Responsive text size, hidden on short mobile screens */}
          <p className="text-[11px] xs:text-xs sm:text-sm md:text-base text-zinc-300 font-medium max-w-sm sm:max-w-md mx-auto mb-3 sm:mb-5 leading-relaxed drop-shadow-md hidden [min-height:480px]:block">
            A living Islamic metropolis of faith, culture, commerce, and multiplayer fellowship.
          </p>

          {/* MINIMAL SLEEK LOADING INDICATOR */}
          <div className="w-full max-w-[280px] xs:max-w-xs sm:max-w-sm mb-3 sm:mb-4 flex flex-col items-center">
            <div className="w-full flex items-center justify-between text-[10px] sm:text-xs font-hud tracking-wider mb-1.5 px-1">
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${displayedProgress >= 100 ? 'bg-emerald-400' : 'bg-emerald-400 animate-ping'}`} />
                {displayedProgress < 45
                  ? 'INITIALIZING'
                  : displayedProgress < 75
                  ? 'LOADING CITY'
                  : displayedProgress < 100
                  ? 'LOADING WORLD'
                  : 'BARAKA CITY READY'}
              </span>
              <span className="font-mono font-bold text-white tracking-widest">{Math.round(displayedProgress)}%</span>
            </div>

            {/* Glowing Minimal Progress Track */}
            <div className="w-full h-1 sm:h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm p-[0.5px]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 rounded-full transition-all duration-150 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
                style={{ width: `${Math.min(100, Math.max(2, displayedProgress))}%` }}
              />
            </div>
          </div>

          {/* BISMILLAH / ENTER BARAKA CITY ACTION BUTTON */}
          <div className="w-full flex flex-col items-center justify-center pointer-events-auto">
            <button
              onClick={handleEnterClick}
              disabled={isEntering || !isGameReady}
              className={`group relative w-full sm:w-auto px-6 xs:px-8 sm:px-12 py-3 xs:py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-xs xs:text-sm sm:text-base tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2.5 sm:gap-3 border overflow-hidden cursor-pointer shadow-2xl active:scale-95 ${
                !isGameReady
                  ? 'bg-zinc-800/80 border-white/10 text-zinc-400 cursor-wait'
                  : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white border-emerald-300/30 shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:shadow-[0_0_55px_rgba(16,185,129,0.7)] hover:scale-105'
              } disabled:opacity-75 disabled:pointer-events-none`}
            >
              <span className="relative z-10 font-bold flex items-center gap-2 sm:gap-3">
                <span>
                  {isEntering
                    ? 'ENTERING BARAKA CITY...'
                    : !isGameReady
                    ? 'PREPARING WORLD...'
                    : 'BISMILLAH / ENTER BARAKA CITY'}
                </span>
                <ArrowRight
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 ${
                    isEntering ? 'translate-x-3 opacity-0' : 'group-hover:translate-x-1.5'
                  }`}
                />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
            </button>
          </div>

          {/* Desktop Keyboard Helper Prompt */}
          <div className="mt-2.5 sm:mt-3 hidden sm:flex items-center gap-2 text-[10px] font-hud text-zinc-400 tracking-wider">
            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/10 text-white font-bold">ENTER</span>
            <span>or</span>
            <span className="bg-white/10 px-2 py-0.5 rounded border border-white/10 text-white font-bold">SPACE</span>
            <span>TO STEP INTO THE WORLD</span>
          </div>

          {/* Explorable World Pillars Pills (Adaptive Wrap) */}
          <div className="mt-3 sm:mt-5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 text-[9px] xs:text-[10px] sm:text-[11px] font-semibold text-zinc-300 hidden [min-height:540px]:flex">
            <span className="bg-black/60 border border-white/10 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" /> 3D Open World
            </span>
            <span className="bg-black/60 border border-white/10 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /> Living Trade & Souq
            </span>
            <span className="bg-black/60 border border-white/10 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" /> Grand Mosque & Madrasa
            </span>
            <span className="bg-black/60 border border-white/10 backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" /> Multiplayer Arena
            </span>
          </div>
        </div>
      </div>

      {/* Free Look Indicator */}
      <div className="hidden sm:block absolute bottom-3 right-4 sm:bottom-4 sm:right-6 z-20 pointer-events-none">
        <span className="text-[9px] sm:text-[10px] font-hud text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-zinc-400" /> DRAG TO LOOK AROUND CITY
        </span>
      </div>

      {/* World Transition Veil when entering game */}
      <div
        className={`fixed inset-0 z-50 bg-[#090a0f] pointer-events-none transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isEntering ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
