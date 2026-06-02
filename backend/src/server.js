import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { connectDB, getDbStatus } from './config/db.js';
import { seedDemoData } from './config/seed.js';

// Import Routers
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import consultationRoutes from './routes/consultations.js';
import aiRoutes from './routes/ai.js';
import voiceRoutes from './routes/voice.js';
import unifiedAuthRoutes from './routes/unifiedAuth.js';
// unifiedAuth route moved below app initialization
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5003; // backend development port

// Middleware
app.use(cors({ origin: '*' })); // Allow open access for development
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Mount API Routers
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/unifiedAuth', unifiedAuthRoutes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    time: new Date(),
    databaseConnected: getDbStatus(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Setup standard HTTP Server
const server = createServer(app);

// Setup co-located WebSocket Server for WebRTC signaling
const wss = new WebSocketServer({ server });

// Map of roomId -> Set of connected WebSockets
const rooms = new Map();

wss.on('connection', (ws) => {
  let currentRoom = null;
  let userId = null;

  console.log('🔌 New WebSocket connection established.');

  ws.on('message', (message) => {
    try {
      const payload = JSON.parse(message.toString());
      const { type, room, sender, data } = payload;

      switch (type) {
        case 'join':
          currentRoom = room;
          userId = sender;

          if (!rooms.has(room)) {
            rooms.set(room, new Set());
          }
          rooms.get(room).add(ws);

          console.log(`👤 User [${userId}] joined room [${room}]. Room size: ${rooms.get(room).size}`);
          
          // Broadcast to other members in the room that a new peer has joined
          rooms.get(room).forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({ type: 'peer-joined', sender: userId }));
            }
          });
          break;

        case 'signal':
          // Relay WebRTC SDP offers, answers, and ICE candidates directly to other peers in the room
          if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'signal', sender, data }));
              }
            });
          }
          break;

        case 'chat':
          // Relay chat message immediately
          if (currentRoom && rooms.has(currentRoom)) {
            rooms.get(currentRoom).forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'chat', sender, data }));
              }
            });
          }
          break;

        default:
          console.warn(`⚠️ Unknown message type: ${type}`);
      }
    } catch (err) {
      console.error('❌ WebSocket message parse error:', err);
    }
  });

  ws.on('close', () => {
    console.log(`🔌 Connection closed for user [${userId}] in room [${currentRoom}].`);
    if (currentRoom && rooms.has(currentRoom)) {
      const roomSet = rooms.get(currentRoom);
      roomSet.delete(ws);
      if (roomSet.size === 0) {
        rooms.delete(currentRoom);
        console.log(`🗑️ Room [${currentRoom}] is now empty and has been removed.`);
      } else {
        // Broadcast disconnection to remaining peers
        roomSet.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'peer-left', sender: userId }));
          }
        });
      }
    }
  });
});

// Bootstrap Server & DB
const startServer = async () => {
  const connected = await connectDB();
  if (connected) {
    await seedDemoData();
  }
  server.listen(PORT, () => {
    console.log(`🚀 Aura AI backend listening on port ${PORT}`);
    console.log(`🔌 WebSocket server active on ws://localhost:${PORT}`);
  });
};

startServer();
