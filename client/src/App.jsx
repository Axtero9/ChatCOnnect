import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { MessageSquare, Video, AlertTriangle, CheckCircle } from 'lucide-react';

import Landing from './components/Landing';
import Waiting from './components/Waiting';
import ChatRoom from './components/ChatRoom';
import { WebRTCManager } from './utils/webrtc';

// Connect to socket backend (using relative path which matches dev proxy or current origin)
const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [view, setView] = useState('landing'); // 'landing' | 'waiting' | 'chat'
  const [mode, setMode] = useState('video');   // 'video' | 'text'
  
  const [roomId, setRoomId] = useState(null);
  const [partnerId, setPartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isPartnerDisconnected, setIsPartnerDisconnected] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [toast, setToast] = useState(null);

  // Media states
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const webrtcManagerRef = useRef(null);
  const localStreamRef = useRef(null);

  // Helper to show transient toast alerts
  const showToast = (message, type = 'warning') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Helper: Request camera and microphone stream
  const setupLocalMedia = useCallback(async () => {
    try {
      if (localStreamRef.current) {
        return localStreamRef.current;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsCameraOn(true);
      setIsMicOn(true);
      return stream;
    } catch (err) {
      console.warn('[Media] Camera/Mic access denied or unavailable:', err);
      showToast('Camera/Microphone access was denied or not found. Switching to text-friendly mode.', 'warning');
      return null;
    }
  }, []);

  // Helper: Stop camera and microphone tracks
  const stopLocalMedia = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  // Toggle Camera
  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };

  // Toggle Mic
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  // Cleanup active WebRTC session
  const teardownWebRTC = useCallback(() => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.cleanup();
      webrtcManagerRef.current = null;
    }
    setRemoteStream(null);
    setIsConnected(false);
  }, []);

  // Socket.io initialization & event subscriptions
  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to ChatConnect server with ID:', newSocket.id);
    });

    // Match Found handler
    newSocket.on('match-found', async ({ roomId: newRoomId, partnerId: newPartnerId, isInitiator, mode: matchMode }) => {
      console.log(`[Socket] Match found! Room: ${newRoomId}, Initiator: ${isInitiator}, Mode: ${matchMode}`);
      
      setRoomId(newRoomId);
      setPartnerId(newPartnerId);
      setMessages([]);
      setIsPartnerDisconnected(false);
      setIsPartnerTyping(false);
      setView('chat');

      // Initialize WebRTC if in video mode
      if (matchMode === 'video') {
        teardownWebRTC();

        let stream = localStreamRef.current;
        if (!stream) {
          stream = await setupLocalMedia();
        }

        const rtcManager = new WebRTCManager({
          socket: newSocket,
          roomId: newRoomId,
          onRemoteStream: (rStream) => {
            console.log('[App] Remote stream received from peer.');
            setRemoteStream(rStream);
            setIsConnected(true);
          },
          onConnectionStateChange: (state) => {
            if (state === 'connected') {
              setIsConnected(true);
            } else if (state === 'disconnected' || state === 'failed') {
              setIsConnected(false);
            }
          }
        });

        rtcManager.createPeerConnection(stream);
        webrtcManagerRef.current = rtcManager;

        // If this client is initiator, create and send WebRTC Offer
        if (isInitiator) {
          await rtcManager.createOffer();
        }
      } else {
        setIsConnected(true);
      }
    });

    // WebRTC Signaling events
    newSocket.on('webrtc-offer', async ({ offer }) => {
      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.handleOffer(offer);
      }
    });

    newSocket.on('webrtc-answer', async ({ answer }) => {
      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.handleAnswer(answer);
      }
    });

    newSocket.on('ice-candidate', async ({ candidate }) => {
      if (webrtcManagerRef.current) {
        await webrtcManagerRef.current.addIceCandidate(candidate);
      }
    });

    // Chat messaging
    newSocket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Partner typing
    newSocket.on('typing', ({ isTyping }) => {
      setIsPartnerTyping(isTyping);
    });

    // Partner disconnected
    newSocket.on('partner-disconnected', ({ reason }) => {
      console.log('[Socket] Partner disconnected:', reason);
      setIsPartnerDisconnected(true);
      teardownWebRTC();
    });

    // Rate limited notification
    newSocket.on('rate-limited', ({ message }) => {
      showToast(message, 'warning');
    });

    // Report acknowledged notification
    newSocket.on('report-acknowledged', ({ message }) => {
      showToast(message, 'success');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      stopLocalMedia();
      teardownWebRTC();
    };
  }, [setupLocalMedia, stopLocalMedia, teardownWebRTC]);

  // Actions
  const handleStartChat = async () => {
    if (!socket) return;
    if (mode === 'video') {
      await setupLocalMedia();
    }
    setView('waiting');
    socket.emit('join-queue', { mode });
  };

  const handleCancelWaiting = () => {
    if (!socket) return;
    socket.emit('leave-queue');
    setView('landing');
    stopLocalMedia();
  };

  const handleNext = async () => {
    if (!socket) return;
    teardownWebRTC();
    setMessages([]);
    setIsPartnerDisconnected(false);
    setView('waiting');
    socket.emit('next', { mode });
  };

  const handleStop = () => {
    if (!socket) return;
    teardownWebRTC();
    stopLocalMedia();
    setMessages([]);
    setIsPartnerDisconnected(false);
    socket.emit('leave-room');
    setView('landing');
  };

  const handleSendMessage = (text) => {
    if (!socket || !roomId) return;
    socket.emit('chat-message', { roomId, message: text });
  };

  const handleTyping = (isTyping) => {
    if (!socket || !roomId) return;
    socket.emit('typing', { roomId, isTyping });
  };

  const handleReportUser = (reason) => {
    if (!socket || !roomId) return;
    socket.emit('report-user', {
      roomId,
      reportedSocketId: partnerId,
      reason
    });
  };

  return (
    <div className="app-root">
      {/* Background Animated Gradient Mesh */}
      <div className="bg-mesh">
        <div className="bg-mesh-blob1" />
        <div className="bg-mesh-blob2" />
      </div>

      {/* Header Bar */}
      <header className="app-header">
        <div className="brand-logo" onClick={handleStop}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Video size={18} />
          </div>
          <span>Chat<span style={{ color: '#6366f1' }}>Connect</span></span>
          <span className="brand-badge">P2P Live</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {view === 'chat' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {mode === 'video' ? <Video size={16} /> : <MessageSquare size={16} />}
              <span style={{ textTransform: 'capitalize' }}>{mode} Mode</span>
            </div>
          )}
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toast && (
        <div className={`toast-banner ${toast.type}`}>
          {toast.type === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
          <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}

      {/* Main View Router */}
      <main>
        {view === 'landing' && (
          <Landing
            mode={mode}
            setMode={setMode}
            onStartChat={handleStartChat}
          />
        )}

        {view === 'waiting' && (
          <Waiting
            mode={mode}
            onCancel={handleCancelWaiting}
          />
        )}

        {view === 'chat' && (
          <ChatRoom
            mode={mode}
            roomId={roomId}
            partnerId={partnerId}
            messages={messages}
            onSendMessage={handleSendMessage}
            onNext={handleNext}
            onStop={handleStop}
            onReport={handleReportUser}
            isPartnerDisconnected={isPartnerDisconnected}
            isPartnerTyping={isPartnerTyping}
            onTyping={handleTyping}
            localStream={localStream}
            remoteStream={remoteStream}
            isCameraOn={isCameraOn}
            isMicOn={isMicOn}
            onToggleCamera={handleToggleCamera}
            onToggleMic={handleToggleMic}
            isConnected={isConnected}
          />
        )}
      </main>
    </div>
  );
}
