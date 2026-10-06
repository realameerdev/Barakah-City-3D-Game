/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());

// In-Memory Server State for Real Multiplayer Citizens
interface ClientConnection {
  socket: WebSocket;
  citizenId: string;
  name: string;
  city: string;
  world: string;
  position: [number, number, number];
  outfit: string;
}

const activeClients = new Map<WebSocket, ClientConnection>();

interface ChatMessageData {
  id: string;
  channel: string; // 'global' | 'abuja' | 'cairo' | 'makkah' | 'dm:<id1>:<id2>'
  senderId: string;
  senderName: string;
  senderCity: string;
  recipientId?: string;
  text: string;
  timestamp: string;
}

// Server Message Stores
const channelMessages: Record<string, ChatMessageData[]> = {
  global: [
    {
      id: 'msg-init-1',
      channel: 'global',
      senderId: 'sys-server',
      senderName: 'BARAKA CITY NETWORK',
      senderCity: 'Global Server',
      text: 'Salam! Connected to Baraka City live multi-user server node. Real citizen chat active.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ],
};

// Broadcast payload helper
function broadcast(data: object, channelFilter?: string, excludeSocket?: WebSocket) {
  const payload = JSON.stringify(data);
  for (const [ws, client] of activeClients.entries()) {
    if (ws.readyState === WebSocket.OPEN && ws !== excludeSocket) {
      if (!channelFilter || client.world === channelFilter || channelFilter === 'global') {
        ws.send(payload);
      }
    }
  }
}

// Send to specific target citizen ID
function sendToCitizen(targetCitizenId: string, data: object) {
  const payload = JSON.stringify(data);
  for (const [ws, client] of activeClients.entries()) {
    if (ws.readyState === WebSocket.OPEN && (client.citizenId === targetCitizenId || client.name.toLowerCase() === targetCitizenId.toLowerCase())) {
      ws.send(payload);
    }
  }
}

// Attach WebSocket Server to HTTP server
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (socket: WebSocket) => {
  const defaultCitizenId = 'cit-' + Math.random().toString(36).substring(2, 9);
  
  // Register default client state
  const clientData: ClientConnection = {
    socket,
    citizenId: defaultCitizenId,
    name: 'Citizen_' + defaultCitizenId.slice(-4).toUpperCase(),
    city: 'Abuja',
    world: 'Abuja Metropolis',
    position: [0, 0, 0],
    outfit: 'Royal Emerald Jalabiyya',
  };

  activeClients.set(socket, clientData);

  // Send initial registration acknowledgment and active citizens list
  socket.send(
    JSON.stringify({
      type: 'registered',
      citizenId: defaultCitizenId,
      name: clientData.name,
      messages: channelMessages.global || [],
    })
  );

  broadcastOnlineCitizens();

  // Handle incoming WebSocket messages from real clients
  socket.on('message', (rawMessage: Buffer) => {
    try {
      const data = JSON.parse(rawMessage.toString());

      switch (data.type) {
        case 'auth:register': {
          clientData.name = data.name || clientData.name;
          clientData.citizenId = data.citizenId || clientData.citizenId;
          clientData.city = data.city || clientData.city;
          clientData.world = data.world || clientData.world;
          clientData.outfit = data.outfit || clientData.outfit;
          activeClients.set(socket, clientData);

          socket.send(
            JSON.stringify({
              type: 'auth:ok',
              citizenId: clientData.citizenId,
              name: clientData.name,
            })
          );

          broadcastOnlineCitizens();
          break;
        }

        case 'chat:send': {
          if (!data.text || !data.text.trim()) return;

          const channelKey = data.channel || 'global';
          const newMsg: ChatMessageData = {
            id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
            channel: channelKey,
            senderId: clientData.citizenId,
            senderName: clientData.name,
            senderCity: clientData.city,
            recipientId: data.recipientId,
            text: data.text.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          if (!channelMessages[channelKey]) {
            channelMessages[channelKey] = [];
          }
          channelMessages[channelKey].push(newMsg);
          if (channelMessages[channelKey].length > 100) {
            channelMessages[channelKey].shift();
          }

          // If direct message, send to sender and target recipient
          if (data.recipientId) {
            sendToCitizen(data.recipientId, {
              type: 'chat:receive',
              message: newMsg,
            });
            socket.send(
              JSON.stringify({
                type: 'chat:receive',
                message: newMsg,
              })
            );
          } else {
            // Channel broadcast to all real clients
            broadcast({
              type: 'chat:receive',
              message: newMsg,
            });
          }
          break;
        }

        case 'invite:send': {
          const targetId = data.targetCitizenId || data.targetName;
          sendToCitizen(targetId, {
            type: 'invite:receive',
            fromName: clientData.name,
            fromCity: clientData.city,
            world: clientData.world,
            timestamp: new Date().toLocaleTimeString(),
          });
          break;
        }

        case 'world:move': {
          if (data.position && Array.isArray(data.position)) {
            clientData.position = data.position as [number, number, number];
            clientData.world = data.world || clientData.world;
            
            broadcast(
              {
                type: 'world:player_moved',
                citizenId: clientData.citizenId,
                name: clientData.name,
                position: clientData.position,
                world: clientData.world,
              },
              clientData.world,
              socket
            );
          }
          break;
        }
      }
    } catch (err) {
      console.error('WebSocket parse error:', err);
    }
  });

  socket.on('close', () => {
    activeClients.delete(socket);
    broadcastOnlineCitizens();
  });
});

function broadcastOnlineCitizens() {
  const citizensList = Array.from(activeClients.values()).map((c) => ({
    citizenId: c.citizenId,
    name: c.name,
    city: c.city,
    world: c.world,
    outfit: c.outfit,
  }));

  broadcast({
    type: 'presence:update',
    onlineCount: activeClients.size,
    citizens: citizensList,
  });
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'online', activeCitizens: activeClients.size, timestamp: new Date() });
});

app.get('/api/citizens/online', (req, res) => {
  const citizens = Array.from(activeClients.values()).map((c) => ({
    citizenId: c.citizenId,
    name: c.name,
    city: c.city,
    world: c.world,
    outfit: c.outfit,
  }));
  res.json({ count: citizens.length, citizens });
});

app.get('/api/messages', (req, res) => {
  const channel = (req.query.channel as string) || 'global';
  const msgs = channelMessages[channel] || channelMessages.global || [];
  res.json({ channel, messages: msgs });
});

app.post('/api/messages/send', (req, res) => {
  const { text, channel, senderId, senderName, senderCity, recipientId } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Text required' });
  }

  const channelKey = channel || 'global';
  const newMsg: ChatMessageData = {
    id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    channel: channelKey,
    senderId: senderId || 'cit-rest',
    senderName: senderName || 'Citizen',
    senderCity: senderCity || 'Abuja',
    recipientId,
    text: text.trim(),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  if (!channelMessages[channelKey]) {
    channelMessages[channelKey] = [];
  }
  channelMessages[channelKey].push(newMsg);
  if (channelMessages[channelKey].length > 100) {
    channelMessages[channelKey].shift();
  }

  broadcast({
    type: 'chat:receive',
    message: newMsg,
  });

  res.json({ status: 'ok', message: newMsg });
});

// Official Esports Rulebook PDF / Text Generation Download Endpoint
app.get('/api/download-rulebook', (req, res) => {
  const rulebookText = `================================================================================
BARAKA CITY GLOBAL ESPORTS OFFICIAL RULEBOOK 2026
S.U.P.E.R. (Standard & Universal Tournament Ruleset for Baraka City)
================================================================================

1. GENERAL PROVISIONS & CODE OF CONDUCT
1.1 Baraka City is a competitive 3D Islamic Life-Sim and Esports Metaverse Platform.
1.2 All players must adhere to high sportsmanship, respect, and modest Islamic values.
1.3 Harassment, offensive language, or dishonest play will result in immediate disqualification.

2. COMPETITION STRUCTURE & RAMADAN QUIZ ARENA
2.1 Tournament entries are verified live on regional nodes (Abuja, Makkah, Cairo, Lagos).
2.2 Quiz Arena participants earn score multipliers for consecutive correct answers.
2.3 Total Prize Pool Allocation: $200,000 USD distributed across top 50 global guilds.

3. SQUAD INVITATIONS & MULTIPLAYER MATCHES
3.1 Squads consist of 4 registered citizens.
3.2 Matches are hosted on server-authoritative 60Hz tickrate WebGL nodes.
3.3 Disconnections must be reconnected within 180 seconds.

4. FAIR PLAY & INTEGRITY
4.1 Third-party automation, scripts, or client modifications are strictly prohibited.
4.2 Anti-cheat verification operates continuously across all connected sessions.

Official Baraka City Corporation © 2019-2026. All Rights Reserved.
`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="Baraka_City_Official_Esports_Rulebook_2026.txt"');
  res.send(rulebookText);
});

// Configure Vite middleware in Dev Mode or static files in Production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  app.use(vite.middlewares);

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      let template = await vite.transformIndexHtml(url, `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Baraka City - 3D Islamic Multiplayer Life-Sim & Esports Arena</title>
    <meta name="description" content="Live 3D Islamic multiplayer life-sim game and esports tournament platform." />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body class="bg-[#090a0f] text-white font-['Sora',sans-serif] antialiased selection:bg-emerald-500 selection:text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`[Baraka City Server] Running on http://localhost:${PORT}`);
});
