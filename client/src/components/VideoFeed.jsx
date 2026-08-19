import React, { useEffect, useRef } from 'react';
import { Camera, CameraOff, Mic, MicOff, User, EyeOff, Radio } from 'lucide-react';

export default function VideoFeed({
  localStream,
  remoteStream,
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
  isConnected,
  isPartnerDisconnected
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="video-grid">
      {/* Stranger (Remote) Video Feed */}
      <div className="video-box">
        {remoteStream && isConnected && !isPartnerDisconnected ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
          />
        ) : (
          <div className="video-avatar-placeholder">
            <div className="video-avatar-icon">
              {isPartnerDisconnected ? <EyeOff size={32} color="var(--accent-rose)" /> : <User size={32} />}
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {isPartnerDisconnected 
                ? 'Stranger disconnected' 
                : isConnected 
                  ? 'Connecting video stream...' 
                  : 'Stranger feed'}
            </span>
          </div>
        )}

        {/* Remote Status Badge */}
        <div className="video-box-overlay">
          <div className={`status-dot ${(!isConnected || isPartnerDisconnected) ? 'disconnected' : ''}`} />
          <span>Stranger</span>
          {isConnected && !isPartnerDisconnected && (
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '2px' }}>
              <Radio size={10} /> Live
            </span>
          )}
        </div>
      </div>

      {/* Self (Local) Video Feed */}
      <div className="video-box self">
        {localStream && isCameraOn ? (
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted // Always mute self to prevent audio feedback
          />
        ) : (
          <div className="video-avatar-placeholder">
            <div className="video-avatar-icon">
              <CameraOff size={30} />
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Camera is off</span>
          </div>
        )}

        {/* Self Overlay & Controls */}
        <div className="video-box-overlay" style={{ justifyContent: 'space-between', width: 'calc(100% - 1.5rem)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div className="status-dot" />
            <span>You</span>
          </div>

          {/* Quick Media Toggles */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={onToggleMic}
              title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
              style={{
                background: isMicOn ? 'rgba(255, 255, 255, 0.15)' : 'rgba(244, 63, 94, 0.4)',
                border: 'none',
                color: '#fff',
                padding: '0.3rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isMicOn ? <Mic size={14} /> : <MicOff size={14} />}
            </button>
            <button
              onClick={onToggleCamera}
              title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
              style={{
                background: isCameraOn ? 'rgba(255, 255, 255, 0.15)' : 'rgba(244, 63, 94, 0.4)',
                border: 'none',
                color: '#fff',
                padding: '0.3rem',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {isCameraOn ? <Camera size={14} /> : <CameraOff size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
