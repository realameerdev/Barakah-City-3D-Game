/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LocationId = 'home' | 'family' | 'mosque' | 'madrasa' | 'university' | 'market' | 'arena' | 'plaza';

export interface LocationInfo {
  id: LocationId;
  name: string;
  subName: string;
  description: string;
  position: [number, number, number]; // 3D world coords
  color: string;
  actionText: string;
  actionIcon: string;
}

export interface NPC {
  id: string;
  name: string;
  role: string;
  locationId: LocationId;
  position: [number, number, number];
  outfitColor: number;
  dialogue: string[];
}

export interface OtherPlayer {
  id: string;
  name: string;
  city: string;
  position: [number, number, number];
  outfitColor: number;
  currentAction: string;
  lastMessage?: string;
}

export interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  time: string;
  isUser: boolean;
}

export type TimeOfDay = 'morning' | 'midday' | 'sunset' | 'night';

export interface PlayerStats {
  name: string;
  city: string;
  level: number;
  xp: number;
  maxXp: number;
  citizenId: string;
  outfit: string;
  currentLocation: LocationInfo;
  lifeStage: 'Teenager' | 'Young Adult' | 'Adult' | 'Older Adult';
  streak: number;
  communityScore: number;
}
