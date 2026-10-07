/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LocationId = 
  | 'home' 
  | 'mosque' 
  | 'madrasa' 
  | 'university' 
  | 'market' 
  | 'football_pitch' 
  | 'park' 
  | 'municipal_office' 
  | 'boulevard';

export type GenderType = 'brother' | 'sister';

export type SkinToneId = 'fair' | 'olive' | 'tan' | 'bronze' | 'cocoa' | 'ebony';

export type HeadwearType = 
  | 'none' 
  | 'white_taqiyah' 
  | 'gold_taqiyah' 
  | 'black_taqiyah' 
  | 'keffiyeh_red' 
  | 'keffiyeh_white' 
  | 'hijab_emerald' 
  | 'hijab_rose' 
  | 'hijab_obsidian' 
  | 'hijab_navy' 
  | 'hijab_pearl' 
  | 'green_turban';

export type HairStyleType = 'fade' | 'short_curls' | 'side_part' | 'waves' | 'buzz' | 'covered';

export type BeardStyleType = 'clean' | 'sunnah_beard' | 'trimmed_beard' | 'royal_goatee' | 'stubble';

export type OutfitType = 
  | 'emerald_jalabiyya' 
  | 'white_thobe' 
  | 'lagos_hoodie' 
  | 'kano_tunic' 
  | 'moroccan_djellaba' 
  | 'flowing_abaya' 
  | 'modest_blazer';

export type ShoeType = 
  | 'leather_sandals' 
  | 'urban_sneakers' 
  | 'velvet_slippers' 
  | 'oxford_shoes';

export type AccessoryType = 
  | 'none' 
  | 'amber_tasbih' 
  | 'gold_watch' 
  | 'tortoise_glasses' 
  | 'oud_bottle';

export interface AvatarCustomization {
  gender: GenderType;
  skinTone: SkinToneId;
  skinColorHex: number;
  headwear: HeadwearType;
  hairStyle: HairStyleType;
  hairColorHex: number;
  beardStyle: BeardStyleType;
  outfit: OutfitType;
  outfitColorHex: number;
  outfitSecondaryHex: number;
  shoes: ShoeType;
  shoeColorHex: number;
  accessory: AccessoryType;
  expression: string;
}

export interface SpeechBubbleEvent {
  id: string;
  citizenId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export interface SpeechBubble {
  id: string;
  senderName: string;
  text: string;
  isSelf: boolean;
  position: [number, number, number];
  timestamp: number;
  expiresAt: number;
}

export interface InteractiveLocation {
  id: LocationId;
  name: string;
  subName: string;
  description: string;
  category: 'Spiritual' | 'Education' | 'Commerce' | 'Sports' | 'Residential' | 'Civic' | 'Nature';
  position: [number, number, number];
  bounds?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  interactActions: {
    key: string;
    label: string;
    iconName: string;
    rewardCoins?: number;
    actionType: 'pray' | 'study' | 'lecture' | 'shop' | 'kick_ball' | 'sit' | 'sleep' | 'tea' | 'office_work';
  }[];
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  locationId: LocationId;
  position: [number, number, number];
  rotation?: number;
  avatarConfig?: Partial<AvatarCustomization>;
  dialogue: string[];
}

export interface OtherPlayer {
  id: string;
  name: string;
  city: string;
  position: [number, number, number];
  rotation?: number;
  action?: string;
  avatarConfig?: AvatarCustomization;
  lastMessage?: string;
  lastMessageTime?: number;
}

export interface FootballPhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  scoreHome: number;
  scoreAway: number;
  lastScorer?: string;
  goalCelebrationUntil?: number;
}

export interface ChatMessage {
  id: string;
  channel?: string;
  senderId?: string;
  senderName: string;
  senderCity?: string;
  recipientId?: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
}

export type TimeOfDay = 'morning' | 'midday' | 'sunset' | 'night';

export interface PlayerStats {
  name: string;
  city: string;
  citizenId: string;
  coins: number;
  health: number;
  energy: number;
  barakaScore: number;
  avatarConfig: AvatarCustomization;
  currentDistrict: string;
}
