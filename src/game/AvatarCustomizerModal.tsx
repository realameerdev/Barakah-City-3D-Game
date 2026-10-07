/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  X, Check, RotateCcw, Sparkles, User, Palette, 
  Smile, Shield, ChevronRight, Eye, RefreshCw
} from 'lucide-react';
import { 
  AvatarCustomization, GenderType, SkinToneId, 
  HeadwearType, HairStyleType, BeardStyleType, 
  OutfitType, ShoeType, AccessoryType 
} from './gameTypes';

export interface AvatarCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: AvatarCustomization;
  onSaveConfig: (newConfig: AvatarCustomization) => void;
}

export const SKIN_TONES: { id: SkinToneId; label: string; hex: number }[] = [
  { id: 'fair', label: 'Fair Porcelain', hex: 0xfbd0b6 },
  { id: 'olive', label: 'Warm Olive', hex: 0xe0a97a },
  { id: 'tan', label: 'Sunlit Bronze', hex: 0xc68a4c },
  { id: 'bronze', label: 'Rich Terracotta', hex: 0xa1662f },
  { id: 'cocoa', label: 'Deep Cocoa', hex: 0x703e1e },
  { id: 'ebony', label: 'Golden Ebony', hex: 0x482813 },
];

export const PRIMARY_COLORS = [
  { label: 'Royal Emerald', hex: 0x059669 },
  { label: 'Makkah White', hex: 0xf8fafc },
  { label: 'Twilight Indigo', hex: 0x3b82f6 },
  { label: 'Kano Indigo Deep', hex: 0x1e1b4b },
  { label: 'Desert Terracotta', hex: 0xb45309 },
  { label: 'Obsidian Black', hex: 0x18181b },
  { label: 'Ruby Velvet', hex: 0x991b1b },
  { label: 'Gold Amber', hex: 0xd97706 },
  { label: 'Teal Oasis', hex: 0x0d9488 },
];

export const ACCENT_COLORS = [
  { label: 'Gold Embroidery', hex: 0xf59e0b },
  { label: 'Silver Thread', hex: 0xe2e8f0 },
  { label: 'Emerald Trim', hex: 0x10b981 },
  { label: 'Pure White', hex: 0xffffff },
  { label: 'Black Velvet', hex: 0x09090b },
  { label: 'Warm Copper', hex: 0xca8a04 },
];

export default function AvatarCustomizerModal({
  isOpen,
  onClose,
  currentConfig,
  onSaveConfig,
}: AvatarCustomizerModalProps) {
  const [config, setConfig] = useState<AvatarCustomization>(() => ({ ...currentConfig }));
  const [activeTab, setActiveTab] = useState<'identity' | 'headwear' | 'hair_beard' | 'outfit' | 'shoes' | 'accessories' | 'colors'>('identity');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rotationRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const prevMouseXRef = useRef<number>(0);

  // Sync state if initial changes
  useEffect(() => {
    if (isOpen) {
      setConfig({ ...currentConfig });
    }
  }, [isOpen, currentConfig]);

  // Build 3D Preview Scene for Avatar Customization Studio
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0d14);

    const camera = new THREE.PerspectiveCamera(45, width / Math.max(1, height), 0.1, 50);
    camera.position.set(0, 1.35, 3.8);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 2.4);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-2, 3, -2);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x10b981, 1.2, 10);
    fillLight.position.set(0, 0.5, 2);
    scene.add(fillLight);

    // Studio Pedestal / Circular Rotating Platform
    const pedestalGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.15, 32);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.6,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, -0.075, 0);
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Glowing Emerald Ring on Platform
    const ringGeo = new THREE.RingGeometry(1.18, 1.22, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.005, 0);
    scene.add(ring);

    // Function to construct full customizable 3D Avatar
    const rebuildAvatar = (currentCfg: AvatarCustomization) => {
      if (avatarGroupRef.current) {
        scene.remove(avatarGroupRef.current);
        avatarGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
            else child.material.dispose();
          }
        });
      }

      const avatarGroup = new THREE.Group();
      const skinMat = new THREE.MeshStandardMaterial({ color: currentCfg.skinColorHex, roughness: 0.55 });
      const outfitMat = new THREE.MeshStandardMaterial({ color: currentCfg.outfitColorHex, roughness: 0.45 });
      const accentMat = new THREE.MeshStandardMaterial({ color: currentCfg.outfitSecondaryHex, roughness: 0.3, metalness: 0.4 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: currentCfg.shoeColorHex, roughness: 0.5 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.2 });

      const isSister = currentCfg.gender === 'sister';

      // 1. Head & Facial Features
      const headGeo = new THREE.SphereGeometry(0.38, 24, 24);
      const headMesh = new THREE.Mesh(headGeo, skinMat);
      headMesh.position.set(0, 1.72, 0);
      avatarGroup.add(headMesh);

      // Neck
      const neckGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.2, 16);
      const neckMesh = new THREE.Mesh(neckGeo, skinMat);
      neckMesh.position.set(0, 1.48, 0);
      avatarGroup.add(neckMesh);

      // Eyes
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
      const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
      [-0.11, 0.11].forEach((ex) => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(ex, 1.75, 0.33);
        avatarGroup.add(eye);
      });

      // Eyebrows
      const browGeo = new THREE.BoxGeometry(0.1, 0.02, 0.02);
      const browMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      [-0.11, 0.11].forEach((bx) => {
        const brow = new THREE.Mesh(browGeo, browMat);
        brow.position.set(bx, 1.81, 0.34);
        avatarGroup.add(brow);
      });

      // Glasses Accessory
      if (currentCfg.accessory === 'tortoise_glasses') {
        const glassesGroup = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.3 });
        [-0.11, 0.11].forEach((gx) => {
          const rim = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 8, 16), frameMat);
          rim.position.set(gx, 1.75, 0.36);
          glassesGroup.add(rim);
        });
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.015), frameMat);
        bridge.position.set(0, 1.75, 0.36);
        glassesGroup.add(bridge);
        avatarGroup.add(glassesGroup);
      }

      // 2. Headwear & Hijab
      if (currentCfg.headwear.startsWith('hijab_') || isSister) {
        // Sculpted Modest Hijab drape wrapping gracefully around head and shoulders
        let hijabColor = currentCfg.headwear === 'hijab_rose' ? 0xf43f5e 
          : currentCfg.headwear === 'hijab_obsidian' ? 0x18181b 
          : currentCfg.headwear === 'hijab_navy' ? 0x1e3a8a 
          : currentCfg.headwear === 'hijab_pearl' ? 0xf8fafc 
          : 0x059669;
        
        const hijabMat = new THREE.MeshStandardMaterial({ color: hijabColor, roughness: 0.45 });
        const hijabDome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 24), hijabMat);
        hijabDome.position.set(0, 1.76, -0.02);
        avatarGroup.add(hijabDome);

        const hijabShoulders = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.48, 20), hijabMat);
        hijabShoulders.position.set(0, 1.48, 0);
        avatarGroup.add(hijabShoulders);
      } else if (currentCfg.headwear.includes('taqiyah')) {
        const tColor = currentCfg.headwear === 'gold_taqiyah' ? 0xd97706 : currentCfg.headwear === 'black_taqiyah' ? 0x18181b : 0xffffff;
        const taqiyahMat = new THREE.MeshStandardMaterial({ color: tColor, roughness: 0.6 });
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.40, 0.22, 20), taqiyahMat);
        cap.position.set(0, 1.95, 0);
        avatarGroup.add(cap);
      } else if (currentCfg.headwear.includes('keffiyeh')) {
        const kColor = currentCfg.headwear === 'keffiyeh_red' ? 0x991b1b : 0xf8fafc;
        const keffiyehMat = new THREE.MeshStandardMaterial({ color: kColor, roughness: 0.5 });
        const wrap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 20, 20), keffiyehMat);
        wrap.position.set(0, 1.78, 0);
        avatarGroup.add(wrap);

        const agal = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.035, 8, 24), darkMat);
        agal.rotation.x = Math.PI / 2;
        agal.position.set(0, 1.96, 0);
        avatarGroup.add(agal);
      } else if (currentCfg.hairStyle !== 'covered') {
        // Natural Hair Geometry
        const hairMat = new THREE.MeshStandardMaterial({ color: currentCfg.hairColorHex, roughness: 0.8 });
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.40, 16, 16), hairMat);
        hair.position.set(0, 1.82, -0.04);
        avatarGroup.add(hair);
      }

      // Beard (for Brothers)
      if (!isSister && currentCfg.beardStyle !== 'clean') {
        const beardMat = new THREE.MeshStandardMaterial({ color: currentCfg.hairColorHex, roughness: 0.8 });
        const beardGeo = new THREE.BoxGeometry(0.26, 0.22, 0.18);
        const beardMesh = new THREE.Mesh(beardGeo, beardMat);
        beardMesh.position.set(0, 1.56, 0.22);
        avatarGroup.add(beardMesh);
      }

      // 3. Body & Clothing
      if (currentCfg.outfit.includes('thobe') || currentCfg.outfit.includes('jalabiyya') || currentCfg.outfit.includes('abaya') || currentCfg.outfit.includes('djellaba')) {
        // Traditional Flowing Full-Length Robe
        const robeGeo = new THREE.CylinderGeometry(0.34, 0.54, 1.45, 20);
        const robeMesh = new THREE.Mesh(robeGeo, outfitMat);
        robeMesh.position.set(0, 0.76, 0);
        robeMesh.castShadow = true;
        avatarGroup.add(robeMesh);

        // Ornate Neckline / Embroidery Placket
        const placketGeo = new THREE.PlaneGeometry(0.12, 0.42);
        const placket = new THREE.Mesh(placketGeo, accentMat);
        placket.position.set(0, 1.24, 0.35);
        avatarGroup.add(placket);
      } else {
        // Shirt/Hoodie + Trousers combo
        const torsoGeo = new THREE.BoxGeometry(0.68, 0.72, 0.36);
        const torsoMesh = new THREE.Mesh(torsoGeo, outfitMat);
        torsoMesh.position.set(0, 1.12, 0);
        torsoMesh.castShadow = true;
        avatarGroup.add(torsoMesh);

        // Trousers / Pants
        [-0.16, 0.16].forEach((lx) => {
          const legGeo = new THREE.CylinderGeometry(0.13, 0.12, 0.74, 12);
          const legMesh = new THREE.Mesh(legGeo, darkMat);
          legMesh.position.set(lx, 0.40, 0);
          legMesh.castShadow = true;
          avatarGroup.add(legMesh);
        });
      }

      // Arms & Sleeves
      [-0.42, 0.42].forEach((ax) => {
        const armGeo = new THREE.CylinderGeometry(0.11, 0.10, 0.65, 12);
        const armMesh = new THREE.Mesh(armGeo, outfitMat);
        armMesh.position.set(ax, 1.10, 0);
        armMesh.rotation.z = ax > 0 ? -0.15 : 0.15;
        armMesh.castShadow = true;
        avatarGroup.add(armMesh);

        // Hands
        const handGeo = new THREE.SphereGeometry(0.08, 12, 12);
        const handMesh = new THREE.Mesh(handGeo, skinMat);
        handMesh.position.set(ax > 0 ? ax + 0.05 : ax - 0.05, 0.72, 0);
        avatarGroup.add(handMesh);
      });

      // 4. Shoes / Footwear
      [-0.17, 0.17].forEach((sx) => {
        const shoeGeo = new THREE.BoxGeometry(0.18, 0.10, 0.32);
        const shoeMesh = new THREE.Mesh(shoeGeo, shoeMat);
        shoeMesh.position.set(sx, 0.05, 0.04);
        shoeMesh.castShadow = true;
        avatarGroup.add(shoeMesh);
      });

      // 5. Accessories
      if (currentCfg.accessory === 'amber_tasbih') {
        const tasbihMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.3 });
        const tasbih = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 8, 16), tasbihMat);
        tasbih.position.set(0.48, 0.70, 0.02);
        avatarGroup.add(tasbih);
      } else if (currentCfg.accessory === 'gold_watch') {
        const watch = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 12), goldMat);
        watch.position.set(-0.43, 0.78, 0);
        avatarGroup.add(watch);
      } else if (currentCfg.accessory === 'oud_bottle') {
        const flaskMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.1, metalness: 0.8 });
        const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 8), flaskMat);
        flask.position.set(0.47, 0.74, 0.02);
        avatarGroup.add(flask);
      }

      avatarGroup.position.set(0, 0, 0);
      avatarGroup.rotation.y = rotationRef.current;
      scene.add(avatarGroup);
      avatarGroupRef.current = avatarGroup;
    };

    rebuildAvatar(config);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      if (avatarGroupRef.current && !isDraggingRef.current) {
        // Slow auto turntable spin when idle
        avatarGroupRef.current.rotation.y += delta * 0.35;
        rotationRef.current = avatarGroupRef.current.rotation.y;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [isOpen, config]);

  // Pointer Drag Rotation Controls for 3D Preview
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    prevMouseXRef.current = e.clientX;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || !avatarGroupRef.current) return;
    const deltaX = e.clientX - prevMouseXRef.current;
    avatarGroupRef.current.rotation.y += deltaX * 0.015;
    rotationRef.current = avatarGroupRef.current.rotation.y;
    prevMouseXRef.current = e.clientX;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xl animate-fadeIn font-sora select-none">
      <div className="bg-[#0e121b] border border-emerald-500/40 rounded-3xl max-w-4xl w-full h-[92vh] max-h-[850px] flex flex-col shadow-2xl overflow-hidden text-white relative">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase text-white tracking-wide flex items-center gap-2">
                AVATAR CUSTOMIZATION STUDIO
              </h2>
              <span className="text-[10px] font-hud text-emerald-400">
                LIVING 3D CITIZEN IDENTITY · REAL-TIME IN-GAME PREVIEW
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body: 3D Preview (Left) + Options Deck (Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left / Center 3D Preview Column */}
          <div 
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative w-full md:w-1/2 h-56 md:h-full bg-gradient-to-b from-black/80 to-[#0a0d14] flex items-center justify-center cursor-grab active:cursor-grabbing border-b md:border-b-0 md:border-r border-white/10"
          >
            <canvas ref={canvasRef} className="w-full h-full block" />

            {/* Orbit Helper Prompt */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none bg-black/60 border border-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-hud text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin-slow" />
              <span>DRAG TO ROTATE 360°</span>
            </div>

            {/* Reset Rotation Button */}
            <button
              onClick={() => {
                if (avatarGroupRef.current) {
                  avatarGroupRef.current.rotation.y = 0;
                  rotationRef.current = 0;
                }
              }}
              className="absolute top-3 right-3 p-1.5 bg-black/60 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-[10px] flex items-center gap-1 cursor-pointer backdrop-blur-md"
              title="Reset Front Facing View"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="text-[9px] uppercase font-bold">Front</span>
            </button>
          </div>

          {/* Right Customization Controls Column */}
          <div className="w-full md:w-1/2 flex-1 flex flex-col overflow-hidden bg-[#121622]/60">
            
            {/* Category Navigation Bar */}
            <div className="flex items-center gap-1 p-2 bg-black/40 border-b border-white/10 overflow-x-auto no-scrollbar">
              {[
                { id: 'identity', label: 'Identity', icon: User },
                { id: 'headwear', label: 'Headwear & Hijab', icon: Shield },
                { id: 'hair_beard', label: 'Hair & Beard', icon: Smile },
                { id: 'outfit', label: 'Attire & Robes', icon: Palette },
                { id: 'accessories', label: 'Accessories', icon: Sparkles },
                { id: 'colors', label: 'Colors', icon: Palette },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500 text-black font-black shadow-lg'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Options Content Area */}
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5">
              
              {/* 1. IDENTITY: Gender & Skin Tone */}
              {activeTab === 'identity' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-emerald-400 block mb-2">
                      CITIZEN IDENTITY & GENDER
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { id: 'brother', label: 'Brother (Male)', desc: 'Thobe, Taqiyah, Beards & Modest Tailoring' },
                        { id: 'sister', label: 'Sister (Female)', desc: 'Silk Hijabs, Abayas & Modest Elegance' },
                      ].map((g) => (
                        <button
                          key={g.id}
                          onClick={() => {
                            setConfig((prev) => ({
                              ...prev,
                              gender: g.id as GenderType,
                              headwear: g.id === 'sister' ? 'hijab_emerald' : 'white_taqiyah',
                              outfit: g.id === 'sister' ? 'flowing_abaya' : 'white_thobe',
                            }));
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            config.gender === g.id
                              ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-lg'
                              : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase text-white">{g.label}</span>
                            {config.gender === g.id && <Check className="w-4 h-4 text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-zinc-400 mt-1 leading-snug">{g.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-emerald-400 block mb-2">
                      SKIN COMPLEXION & TONE
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SKIN_TONES.map((tone) => (
                        <button
                          key={tone.id}
                          onClick={() => setConfig((prev) => ({ ...prev, skinTone: tone.id, skinColorHex: tone.hex }))}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                            config.skinTone === tone.id
                              ? 'border-emerald-500 bg-emerald-500/20 shadow-md'
                              : 'border-white/10 bg-black/40 hover:border-white/20'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-full border border-white/20 shrink-0 shadow-inner"
                            style={{ backgroundColor: `#${tone.hex.toString(16).padStart(6, '0')}` }}
                          />
                          <span className="text-[10px] font-bold uppercase truncate">{tone.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. HEADWEAR & HIJAB */}
              {activeTab === 'headwear' && (
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                    {config.gender === 'sister' ? 'MODEST SILK HIJABS & WRAPS' : 'TAQIYAHS, KEFFIYEHS & TURBANS'}
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    {config.gender === 'sister' ? (
                      [
                        { id: 'hijab_emerald', label: 'Emerald Silk Hijab', desc: 'Lustrous deep green silk wrap' },
                        { id: 'hijab_rose', label: 'Rose Pearl Hijab', desc: 'Soft pastel crimson chiffon' },
                        { id: 'hijab_obsidian', label: 'Obsidian Black Hijab', desc: 'Classic formal black silk' },
                        { id: 'hijab_navy', label: 'Royal Navy Hijab', desc: 'Deep twilight blue wrap' },
                        { id: 'hijab_pearl', label: 'Pure Pearl Cashmere', desc: 'Elegant radiant white wrap' },
                      ].map((h) => (
                        <button
                          key={h.id}
                          onClick={() => setConfig((prev) => ({ ...prev, headwear: h.id as HeadwearType }))}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            config.headwear === h.id
                              ? 'border-emerald-500 bg-emerald-500/20 text-white'
                              : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase">{h.label}</span>
                            {config.headwear === h.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <span className="text-[9px] text-zinc-400 block mt-0.5">{h.desc}</span>
                        </button>
                      ))
                    ) : (
                      [
                        { id: 'white_taqiyah', label: 'Embroidered White Taqiyah', desc: 'Traditional geometric prayer cap' },
                        { id: 'gold_taqiyah', label: 'Gold Trim Taqiyah', desc: 'Celebratory amber embroidered cap' },
                        { id: 'black_taqiyah', label: 'Black Velvet Taqiyah', desc: 'Sleek dark formal cap' },
                        { id: 'keffiyeh_red', label: 'Red/White Keffiyeh & Agal', desc: 'Classic Arabian Ghutra' },
                        { id: 'keffiyeh_white', label: 'Pure White Keffiyeh', desc: 'Pristine white desert headdress' },
                        { id: 'none', label: 'No Headwear (Natural Hair)', desc: 'Show trimmed hairstyle' },
                      ].map((h) => (
                        <button
                          key={h.id}
                          onClick={() => setConfig((prev) => ({ ...prev, headwear: h.id as HeadwearType }))}
                          className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                            config.headwear === h.id
                              ? 'border-emerald-500 bg-emerald-500/20 text-white'
                              : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase">{h.label}</span>
                            {config.headwear === h.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <span className="text-[9px] text-zinc-400 block mt-0.5">{h.desc}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* 3. HAIR & BEARD */}
              {activeTab === 'hair_beard' && (
                <div className="space-y-4">
                  {config.gender === 'brother' && (
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block mb-2">
                        BEARD & FACIAL HAIR
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'sunnah_beard', label: 'Sunnah Full Beard' },
                          { id: 'trimmed_beard', label: 'Neat Trimmed Beard' },
                          { id: 'royal_goatee', label: 'Royal Goatee' },
                          { id: 'stubble', label: 'Light Stubble' },
                          { id: 'clean', label: 'Clean Shaven' },
                        ].map((b) => (
                          <button
                            key={b.id}
                            onClick={() => setConfig((prev) => ({ ...prev, beardStyle: b.id as BeardStyleType }))}
                            className={`p-2.5 rounded-xl border text-left text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-between ${
                              config.beardStyle === b.id
                                ? 'border-emerald-500 bg-emerald-500/20 text-white'
                                : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white'
                            }`}
                          >
                            <span>{b.label}</span>
                            {config.beardStyle === b.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block mb-2">
                      HAIRSTYLE & TEXTURE
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'fade', label: 'Modern Fade' },
                        { id: 'short_curls', label: 'Natural Curls' },
                        { id: 'side_part', label: 'Classic Part' },
                        { id: 'waves', label: 'Textured Waves' },
                        { id: 'buzz', label: 'Clean Buzz' },
                      ].map((hs) => (
                        <button
                          key={hs.id}
                          onClick={() => setConfig((prev) => ({ ...prev, hairStyle: hs.id as HairStyleType }))}
                          className={`p-2.5 rounded-xl border text-center text-xs font-bold uppercase transition-all cursor-pointer ${
                            config.hairStyle === hs.id
                              ? 'border-emerald-500 bg-emerald-500/20 text-white'
                              : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white'
                          }`}
                        >
                          {hs.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. ATTIRE & ROBES */}
              {activeTab === 'outfit' && (
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                    MODEST ATTIRE, JALABIYYAS & THOBES
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'emerald_jalabiyya', label: 'Royal Emerald Jalabiyya', desc: 'Embroidered silk Islamic robe' },
                      { id: 'white_thobe', label: 'Classic Makkah Thobe', desc: 'Pristine white tailored Saudi thobe' },
                      { id: 'flowing_abaya', label: 'Flowing Black Abaya', desc: 'Modest luxury kimono abaya' },
                      { id: 'lagos_hoodie', label: 'Lagos Street Hoodie & Pants', desc: 'Contemporary urban modest streetwear' },
                      { id: 'kano_tunic', label: 'Kano Royal Indigo Tunic', desc: 'Deep indigo Hausa embroidery' },
                      { id: 'moroccan_djellaba', label: 'Moroccan Pointed Djellaba', desc: 'Traditional wool Maghrebi robe' },
                      { id: 'modest_blazer', label: 'Modest Formal Blazer', desc: 'Tailored smart business suit' },
                    ].map((out) => (
                      <button
                        key={out.id}
                        onClick={() => setConfig((prev) => ({ ...prev, outfit: out.id as OutfitType }))}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          config.outfit === out.id
                            ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-lg'
                            : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase">{out.label}</span>
                          {config.outfit === out.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <span className="text-[9px] text-zinc-400 block mt-0.5">{out.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. ACCESSORIES */}
              {activeTab === 'accessories' && (
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block">
                    SPIRITUAL & CULTURAL ACCESSORIES
                  </span>

                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { id: 'amber_tasbih', label: 'Amber Tasbih Beads', desc: '33-bead amber prayer rosary held in hand' },
                      { id: 'gold_watch', label: 'Luxury Gold Chronograph', desc: 'High-end gold timepiece' },
                      { id: 'tortoise_glasses', label: 'Tortoiseshell Glasses', desc: 'Classic optical eyewear' },
                      { id: 'oud_bottle', label: 'Crystal Oud Fragrance', desc: 'Flask of pure Arabian agarwood perfume' },
                      { id: 'none', label: 'No Accessory', desc: 'Clean unadorned appearance' },
                    ].map((acc) => (
                      <button
                        key={acc.id}
                        onClick={() => setConfig((prev) => ({ ...prev, accessory: acc.id as AccessoryType }))}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                          config.accessory === acc.id
                            ? 'border-emerald-500 bg-emerald-500/20 text-white shadow-lg'
                            : 'border-white/10 bg-black/40 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase">{acc.label}</span>
                          {config.accessory === acc.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <span className="text-[9px] text-zinc-400 block mt-0.5">{acc.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. COLOR PALETTES */}
              {activeTab === 'colors' && (
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400 block mb-2">
                      PRIMARY ROBE / FABRIC COLOR
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {PRIMARY_COLORS.map((col) => (
                        <button
                          key={col.label}
                          onClick={() => setConfig((prev) => ({ ...prev, outfitColorHex: col.hex }))}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                            config.outfitColorHex === col.hex
                              ? 'border-emerald-500 bg-emerald-500/20 shadow-md'
                              : 'border-white/10 bg-black/40'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: `#${col.hex.toString(16).padStart(6, '0')}` }}
                          />
                          <span className="text-[10px] font-bold uppercase truncate">{col.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400 block mb-2">
                      EMBROIDERY & ACCENT TRIM COLOR
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {ACCENT_COLORS.map((col) => (
                        <button
                          key={col.label}
                          onClick={() => setConfig((prev) => ({ ...prev, outfitSecondaryHex: col.hex }))}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                            config.outfitSecondaryHex === col.hex
                              ? 'border-amber-500 bg-amber-500/20 shadow-md'
                              : 'border-white/10 bg-black/40'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: `#${col.hex.toString(16).padStart(6, '0')}` }}
                          />
                          <span className="text-[10px] font-bold uppercase truncate">{col.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Action Deck */}
            <div className="p-4 border-t border-white/10 bg-black/50 flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  onSaveConfig(config);
                  onClose();
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>SAVE & EQUIP IN CITY</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
