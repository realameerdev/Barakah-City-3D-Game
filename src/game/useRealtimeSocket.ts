/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AvatarCustomization, SpeechBubbleEvent } from './gameTypes';

export interface ChatMessage {
  id: string;
  channel: string;
  senderId: string;
  senderName: string;
  senderCity: string;
  recipientId?: string;
  text: string;
  timestamp: string;
  isSelf?: boolean;
}

export interface OnlineCitizen {
  citizenId: string;
  name: string;
  city: string;
  world: string;
  outfit: string;
  customization?: AvatarCustomization;
}

export interface RemotePlayerLiveState {
  citizenId: string;
  name: string;
  position: [number, number, number];
  rotation: number;
  action: string;
  outfit: string;
  customization?: AvatarCustomization;
  lastUpdated: number;
}

export interface SquadInviteEvent {
  fromName: string;
  fromCity: string;
  world: string;
  timestamp: string;
}

export function useRealtimeSocket(userProfile: { 
  name: string; 
  citizenId: string; 
  city: string; 
  world: string; 
  outfit: string;
  customization?: AvatarCustomization;
}) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [onlineCitizens, setOnlineCitizens] = useState<OnlineCitizen[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [incomingInvite, setIncomingInvite] = useState<SquadInviteEvent | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayerLiveState>>(new Map());
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubbleEvent[]>([]);

  const socketRef = useRef<WebSocket | null>(null);

  // Clean up expired speech bubbles
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setSpeechBubbles((prev) => prev.filter((bubble) => now - bubble.timestamp < 6000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Connect to WebSocket server on location host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Register current user on socket connection
        ws.send(
          JSON.stringify({
            type: 'auth:register',
            citizenId: userProfile.citizenId,
            name: userProfile.name,
            city: userProfile.city,
            world: userProfile.world,
            outfit: userProfile.outfit,
            customization: userProfile.customization,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'registered':
            case 'auth:ok': {
              if (data.messages && Array.isArray(data.messages)) {
                setChatMessages(data.messages);
              }
              break;
            }

            case 'world:existing_players': {
              if (data.players && Array.isArray(data.players)) {
                setRemotePlayers((prev) => {
                  const updated = new Map(prev);
                  data.players.forEach((p: any) => {
                    if (p.citizenId !== userProfile.citizenId) {
                      updated.set(p.citizenId, {
                        citizenId: p.citizenId,
                        name: p.name || 'Citizen',
                        position: p.position || [0, 0, 0],
                        rotation: p.rotation || 0,
                        action: p.action || 'idle',
                        outfit: p.outfit || 'classic_white',
                        customization: p.customization,
                        lastUpdated: Date.now(),
                      });
                    }
                  });
                  return updated;
                });
              }
              break;
            }

            case 'presence:update': {
              setOnlineCount(data.onlineCount || 1);
              if (data.citizens && Array.isArray(data.citizens)) {
                setOnlineCitizens(data.citizens);
              }
              break;
            }

            case 'chat:receive': {
              if (data.message) {
                const isSelf = data.message.senderId === userProfile.citizenId || data.message.senderName === userProfile.name;
                const newMsg: ChatMessage = {
                  ...data.message,
                  isSelf,
                };
                setChatMessages((prev) => [...prev, newMsg]);
              }
              break;
            }

            case 'world:player_moved': {
              if (data.citizenId && data.citizenId !== userProfile.citizenId) {
                setRemotePlayers((prev) => {
                  const updated = new Map(prev);
                  const existing = updated.get(data.citizenId);
                  updated.set(data.citizenId, {
                    citizenId: data.citizenId,
                    name: data.name || existing?.name || 'Citizen',
                    position: data.position || existing?.position || [0, 0, 0],
                    rotation: typeof data.rotation === 'number' ? data.rotation : (existing?.rotation || 0),
                    action: data.action || existing?.action || 'idle',
                    outfit: data.outfit || existing?.outfit || 'classic_white',
                    customization: data.customization || existing?.customization,
                    lastUpdated: Date.now(),
                  });
                  return updated;
                });
              }
              break;
            }

            case 'world:player_action': {
              if (data.citizenId && data.citizenId !== userProfile.citizenId) {
                setRemotePlayers((prev) => {
                  const updated = new Map(prev);
                  const existing = updated.get(data.citizenId);
                  if (existing) {
                    updated.set(data.citizenId, {
                      ...existing,
                      action: data.action,
                      lastUpdated: Date.now(),
                    });
                  }
                  return updated;
                });
              }
              break;
            }

            case 'world:player_speech': {
              if (data.text) {
                const bubble: SpeechBubbleEvent = {
                  id: 'sp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                  citizenId: data.citizenId,
                  senderName: data.name,
                  text: data.text,
                  timestamp: data.timestamp || Date.now(),
                };
                setSpeechBubbles((prev) => [...prev.slice(-15), bubble]);
              }
              break;
            }

            case 'avatar:updated': {
              if (data.citizenId && data.citizenId !== userProfile.citizenId) {
                setRemotePlayers((prev) => {
                  const updated = new Map(prev);
                  const existing = updated.get(data.citizenId);
                  if (existing) {
                    updated.set(data.citizenId, {
                      ...existing,
                      customization: data.customization,
                      outfit: data.outfit || existing.outfit,
                    });
                  }
                  return updated;
                });
              }
              break;
            }

            case 'invite:receive': {
              setIncomingInvite({
                fromName: data.fromName,
                fromCity: data.fromCity,
                world: data.world,
                timestamp: data.timestamp,
              });
              break;
            }
          }
        } catch (e) {
          console.error('Error handling WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      ws.onerror = () => {
        // Silent disconnect handler - fallback to REST HTTP polling
        setIsConnected(false);
      };
    } catch (e) {
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [userProfile.citizenId, userProfile.name, userProfile.city, userProfile.world, userProfile.outfit]);

  // REST HTTP Polling Fallback if WebSocket is not connected
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchFallbackData = async () => {
      try {
        const [msgRes, citizenRes] = await Promise.all([
          fetch('/api/messages?channel=global').catch(() => null),
          fetch('/api/citizens/online').catch(() => null),
        ]);

        if (msgRes && msgRes.ok) {
          const msgData = await msgRes.json();
          if (msgData.messages && Array.isArray(msgData.messages)) {
            setChatMessages(msgData.messages);
          }
        }

        if (citizenRes && citizenRes.ok) {
          const citData = await citizenRes.json();
          if (citData.citizens && Array.isArray(citData.citizens)) {
            setOnlineCitizens(citData.citizens);
            setOnlineCount(Math.max(1, citData.count));
          }
        }
      } catch (err) {
        // Ignore REST polling errors
      }
    };

    if (!isConnected) {
      fetchFallbackData();
      interval = setInterval(fetchFallbackData, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected]);

  const sendMessage = useCallback((text: string, channel: string = 'global', recipientId?: string) => {
    if (!text || !text.trim()) return;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'chat:send',
          text: text.trim(),
          channel,
          recipientId,
        })
      );
    } else {
      // Fallback REST POST
      fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          channel,
          senderId: userProfile.citizenId,
          senderName: userProfile.name,
          senderCity: userProfile.city,
          recipientId,
        }),
      }).catch(() => null);
    }
  }, [userProfile.citizenId, userProfile.name, userProfile.city]);

  const sendPlayerMove = useCallback((position: [number, number, number], rotation: number, action?: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'world:move',
          position,
          rotation,
          action,
        })
      );
    }
  }, []);

  const sendPlayerAction = useCallback((action: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'world:action',
          action,
        })
      );
    }
  }, []);

  const sendSpeechBubble = useCallback((text: string) => {
    if (!text || !text.trim()) return;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'world:speech',
          text: text.trim(),
        })
      );
    }
  }, []);

  const updateAvatarCustomization = useCallback((customization: AvatarCustomization) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'avatar:update',
          customization,
          outfit: customization.outfit,
        })
      );
    }
  }, []);

  const sendSquadInvite = useCallback((targetCitizenId: string, targetName: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'invite:send',
          targetCitizenId,
          targetName,
        })
      );
    }
  }, []);

  const clearInvite = useCallback(() => {
    setIncomingInvite(null);
  }, []);

  return {
    isConnected,
    onlineCount,
    onlineCitizens,
    chatMessages,
    remotePlayers,
    speechBubbles,
    sendPlayerMove,
    sendPlayerAction,
    sendSpeechBubble,
    updateAvatarCustomization,
    sendMessage,
    sendSquadInvite,
    incomingInvite,
    clearInvite,
  };
}
