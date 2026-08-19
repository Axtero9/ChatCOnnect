# ChatConnect 🚀
### Modern Omegle-Style Random Video & Text Chat Application

ChatConnect is a fullstack, peer-to-peer random chat application built with **React**, **Node.js**, **Express**, **Socket.io**, and **WebRTC** using Google's public STUN servers.

---

## 🌟 Features

- **Video & Text Chat Modes**: Instant toggle between P2P Video + Audio with Text, or lightweight Text-Only mode.
- **Matchmaking Queue**: Automated server-side pairing that groups two waiting peers into private rooms.
- **WebRTC P2P Video/Audio**: Direct low-latency media streaming with Google's public STUN servers (`stun:stun.l.google.com:19302`).
- **Interactive Chat Room**: Side-by-side mirrored local and remote video feeds, real-time message stream, typing indicators, and media controls (camera/mic toggles).
- **Graceful Disconnection Handling**: Instant notification when a stranger leaves with one-click "Next Stranger" rematching.
- **Safety & Moderation**:
  - **Server-Side Profanity Filter**: Automatically flags and censors severe slurs and hate speech with `***`.
  - **Anti-Spam Rate Limiter**: Enforces a max of 10 "Next" skips per minute per user.
  - **User Reporting**: One-click report button logging reported user session IDs to `server/reports.log`.
- **Responsive Dark Theme Design**: Sleek glassmorphism interface styled with modern typography (Outfit & Plus Jakarta Sans).

---

## 📁 Project Structure

```
OMEGLE/
├── server/
│   ├── server.js              # Express + Socket.io server (Queue, WebRTC signaling, rate limits)
│   ├── profanityFilter.js     # Text sanitizer & slur filter
│   ├── reports.log            # Server-side persistent log for user reports
│   └── package.json           # Backend dependencies (express, socket.io, cors, nodemon)
├── client/
│   ├── index.html             # HTML entry point with modern fonts
│   ├── vite.config.js         # Vite configuration with proxy to backend
│   ├── package.json           # Frontend dependencies (react, lucide-react, socket.io-client)
│   └── src/
│       ├── main.jsx           # React DOM render entry
│       ├── App.jsx            # State machine (Landing, Waiting, Chat) & WebRTC orchestration
│       ├── index.css          # Custom dark-theme styling, animations, and responsive layout
│       ├── components/
│       │   ├── Landing.jsx    # Mode selector (Video / Text) & Start Chat CTA
│       │   ├── Waiting.jsx    # Radar pulse searching animation with cancel action
│       │   ├── ChatRoom.jsx   # Video grid, chat panel, typing indicator, Next/Stop/Report
│       │   ├── VideoFeed.jsx  # Local/Remote video feeds with camera & mic toggles
│       │   └── ReportModal.jsx# User reporting popup with category selection
│       └── utils/
│           └── webrtc.js      # RTCPeerConnection manager with STUN servers & offer/answer
├── package.json               # Root scripts to run both servers concurrently
└── README.md                  # Project documentation & run guide
```

---

## 🛠️ Getting Started (Local Setup)

### 1. Install Dependencies
You can install dependencies for root, server, and client all at once or individually:

```bash
# Option A: Run all installs from root
npm run install:all

# Option B: Install individually
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Run in Development Mode
To run both the backend server and frontend client concurrently with one command from the project root:

```bash
npm run dev
```

- **Frontend Client**: [http://localhost:5173](http://localhost:5173)
- **Backend API & Socket.io**: [http://localhost:5000](http://localhost:5000)

### 3. Testing Random Chat Matching
1. Open [http://localhost:5173](http://localhost:5173) in your primary browser window.
2. Open [http://localhost:5173](http://localhost:5173) in an **Incognito / Private Window** (or a second browser).
3. Select either **Video + Text** or **Text Only** on both windows and click **Start Chat**.
4. Both windows will instantly match into a private chat room!
