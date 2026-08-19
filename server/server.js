const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { sanitizeMessage } = require('./profanityFilter');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Serve static client assets in production if available
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
}

// Log file for user reports
const REPORTS_FILE = path.join(__dirname, 'reports.log');

// State management
// Queues for each mode: Array of { socketId, mode, joinedAt }
const waitingQueues = {
  text: [],
  video: []
};

// Map of roomId -> { users: [socketId1, socketId2], mode, createdAt }
const activeRooms = new Map();

// Map of socketId -> roomId
const socketToRoom = new Map();

// Rate limiting for "Next" clicks: socketId -> Array of timestamps (ms)
const nextRateLimitMap = new Map();
const MAX_NEXT_PER_MINUTE = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Helper: Check and update rate limit
function isRateLimited(socketId) {
  const now = Date.now();
  let timestamps = nextRateLimitMap.get(socketId) || [];
  // Filter timestamps within the 1-minute window
  timestamps = timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  
  if (timestamps.length >= MAX_NEXT_PER_MINUTE) {
    nextRateLimitMap.set(socketId, timestamps);
    return true;
  }
  
  timestamps.push(now);
  nextRateLimitMap.set(socketId, timestamps);
  return false;
}

// Helper: Remove socket from all waiting queues
function removeFromQueues(socketId) {
  for (const mode of ['text', 'video']) {
    waitingQueues[mode] = waitingQueues[mode].filter(item => item.socketId !== socketId);
  }
}

// Helper: Process matchmaking queue
function processQueue(mode) {
  const queue = waitingQueues[mode];
  while (queue.length >= 2) {
    const peer1 = queue.shift();
    const peer2 = queue.shift();

    // Verify both sockets are still connected
    const socket1 = io.sockets.sockets.get(peer1.socketId);
    const socket2 = io.sockets.sockets.get(peer2.socketId);

    if (!socket1 && socket2) {
      queue.unshift(peer2);
      continue;
    }
    if (socket1 && !socket2) {
      queue.unshift(peer1);
      continue;
    }
    if (!socket1 && !socket2) {
      continue;
    }

    // Both active: create room
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    activeRooms.set(roomId, {
      users: [peer1.socketId, peer2.socketId],
      mode,
      createdAt: new Date().toISOString()
    });

    socketToRoom.set(peer1.socketId, roomId);
    socketToRoom.set(peer2.socketId, roomId);

    socket1.join(roomId);
    socket2.join(roomId);

    console.log(`[MATCH] Paired ${peer1.socketId} and ${peer2.socketId} in room ${roomId} (mode: ${mode})`);

    // Notify peers: peer1 is initiator for WebRTC offer
    socket1.emit('match-found', {
      roomId,
      partnerId: peer2.socketId,
      isInitiator: true,
      mode
    });

    socket2.emit('match-found', {
      roomId,
      partnerId: peer1.socketId,
      isInitiator: false,
      mode
    });
  }
}

// Helper: Leave and teardown an active room
function leaveCurrentRoom(socket, notifyPartner = true) {
  const socketId = socket.id;
  const roomId = socketToRoom.get(socketId);

  if (!roomId) return null;

  const room = activeRooms.get(roomId);
  socketToRoom.delete(socketId);
  socket.leave(roomId);

  if (room) {
    const partnerId = room.users.find(id => id !== socketId);
    if (partnerId) {
      socketToRoom.delete(partnerId);
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.leave(roomId);
        if (notifyPartner) {
          partnerSocket.emit('partner-disconnected', { roomId, reason: 'Stranger has disconnected.' });
        }
      }
    }
    activeRooms.delete(roomId);
    console.log(`[ROOM CLOSED] Room ${roomId} torn down.`);
    return partnerId;
  }

  return null;
}

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`[CONNECTED] Socket connected: ${socket.id}`);

  // 1. Join Queue
  socket.on('join-queue', ({ mode = 'text' }) => {
    // Teardown any existing active room
    leaveCurrentRoom(socket, true);
    // Remove if already in queue
    removeFromQueues(socket.id);

    const validMode = (mode === 'video') ? 'video' : 'text';
    waitingQueues[validMode].push({
      socketId: socket.id,
      mode: validMode,
      joinedAt: Date.now()
    });

    console.log(`[QUEUE] Socket ${socket.id} joined ${validMode} queue. (Queue size: ${waitingQueues[validMode].length})`);
    socket.emit('queue-status', { status: 'waiting', mode: validMode });

    // Attempt matching
    processQueue(validMode);
  });

  // 2. Leave Queue
  socket.on('leave-queue', () => {
    removeFromQueues(socket.id);
    console.log(`[QUEUE] Socket ${socket.id} left waiting queue.`);
    socket.emit('queue-status', { status: 'idle' });
  });

  // 3. WebRTC Signaling Events
  socket.on('webrtc-offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('webrtc-offer', { offer, senderId: socket.id });
  });

  socket.on('webrtc-answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('webrtc-answer', { answer, senderId: socket.id });
  });

  socket.on('ice-candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('ice-candidate', { candidate, senderId: socket.id });
  });

  // 4. Chat Messaging with Censorship
  socket.on('chat-message', ({ roomId, message }) => {
    if (!message || typeof message !== 'string' || !message.trim()) return;

    const { sanitized, flagged } = sanitizeMessage(message.trim());
    const messagePayload = {
      senderId: socket.id,
      text: sanitized,
      flagged,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    // Broadcast to the partner in the room
    socket.to(roomId).emit('chat-message', messagePayload);
    // Echo back to sender
    socket.emit('chat-message', { ...messagePayload, isSelf: true });
  });

  // 5. Typing indicator
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing', { isTyping, senderId: socket.id });
  });

  // 6. Next Button (Disconnect & Rematch with Rate Limiting)
  socket.on('next', ({ mode = 'text' }) => {
    if (isRateLimited(socket.id)) {
      socket.emit('rate-limited', {
        message: 'Rate limit exceeded: You can only skip a maximum of 10 times per minute. Please slow down.'
      });
      return;
    }

    console.log(`[NEXT] Socket ${socket.id} skipped to next partner.`);
    leaveCurrentRoom(socket, true);
    removeFromQueues(socket.id);

    const validMode = (mode === 'video') ? 'video' : 'text';
    waitingQueues[validMode].push({
      socketId: socket.id,
      mode: validMode,
      joinedAt: Date.now()
    });

    socket.emit('queue-status', { status: 'waiting', mode: validMode });
    processQueue(validMode);
  });

  // 7. Stop / Leave Room
  socket.on('leave-room', () => {
    console.log(`[STOP] Socket ${socket.id} ended chat.`);
    leaveCurrentRoom(socket, true);
    removeFromQueues(socket.id);
    socket.emit('queue-status', { status: 'idle' });
  });

  // 8. Report User
  socket.on('report-user', ({ roomId, reportedSocketId, reason = 'Inappropriate behavior' }) => {
    const reportEntry = {
      timestamp: new Date().toISOString(),
      reporterId: socket.id,
      reportedId: reportedSocketId || 'unknown',
      roomId: roomId || 'none',
      reason: reason
    };

    const logLine = `[REPORT] ${reportEntry.timestamp} | Reporter: ${reportEntry.reporterId} | Reported: ${reportEntry.reportedId} | Room: ${reportEntry.roomId} | Reason: ${reportEntry.reason}\n`;
    
    console.warn(`[SAFETY] Report submitted:`, reportEntry);

    // Append to file
    fs.appendFile(REPORTS_FILE, logLine, (err) => {
      if (err) console.error('[SAFETY] Failed to write report to log file:', err);
    });

    socket.emit('report-acknowledged', { success: true, message: 'Thank you. The user has been reported and logged for review.' });
  });

  // 9. Disconnect Cleanup
  socket.on('disconnect', () => {
    console.log(`[DISCONNECTED] Socket disconnected: ${socket.id}`);
    leaveCurrentRoom(socket, true);
    removeFromQueues(socket.id);
    nextRateLimitMap.delete(socket.id);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    activeRooms: activeRooms.size,
    waitingQueues: {
      text: waitingQueues.text.length,
      video: waitingQueues.video.length
    }
  });
});

// Fallback to client index.html for SPA routing if dist exists
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(clientDistPath, 'index.html'))) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.send('ChatConnect Backend is running. Launch the Vite client on port 5173 for development.');
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 ChatConnect Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready for WebRTC signaling`);
  console.log(`🛡️  Safety filters & rate limiter enabled`);
  console.log(`=========================================`);
});
