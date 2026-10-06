/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';

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
}

export interface SquadInviteEvent {
  fromName: string;
  fromCity: string;
  world: string;
  timestamp: string;
}

export function useRealtimeSocket(userProfile: { name: string; citizenId: string; city: string; world: string; outfit: string }) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [onlineCitizens, setOnlineCitizens] = useState<OnlineCitizen[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [incomingInvite, setIncomingInvite] = useState<SquadInviteEvent | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

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
    sendMessage,
    sendSquadInvite,
    incomingInvite,
    clearInvite,
  };
}
