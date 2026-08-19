import React, { useState, useRef, useEffect } from 'react';
import { Send, RotateCw, LogOut, ShieldAlert, AlertCircle, MessageSquare } from 'lucide-react';
import VideoFeed from './VideoFeed';
import ReportModal from './ReportModal';

export default function ChatRoom({
  mode,
  roomId,
  partnerId,
  messages,
  onSendMessage,
  onNext,
  onStop,
  onReport,
  isPartnerDisconnected,
  isPartnerTyping,
  onTyping,
  localStream,
  remoteStream,
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
  isConnected
}) {
  const [inputText, setInputText] = useState('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPartnerTyping]);

  // Handle message submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isPartnerDisconnected) return;
    onSendMessage(inputText);
    setInputText('');
    onTyping(false);
  };

  // Handle typing debounce
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    onTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1500);
  };

  return (
    <div className="chat-room-layout">
      {/* Left Area: Video Feeds (if video mode) OR Mode Summary + Actions */}
      <div className="video-stage">
        {mode === 'video' ? (
          <VideoFeed
            localStream={localStream}
            remoteStream={remoteStream}
            isCameraOn={isCameraOn}
            isMicOn={isMicOn}
            onToggleCamera={onToggleCamera}
            onToggleMic={onToggleMic}
            isConnected={isConnected}
            isPartnerDisconnected={isPartnerDisconnected}
          />
        ) : (
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <MessageSquare size={32} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem' }}>
              {isPartnerDisconnected ? 'Stranger Disconnected' : 'Connected to Stranger'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '360px' }}>
              {isPartnerDisconnected 
                ? 'Your chat partner has left the conversation. Click Next below to find another person.' 
                : 'You are in an anonymous text-only chat room. Say hello!'}
            </p>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="chat-controls-bar">
          <div className="controls-left">
            {/* Stop Button */}
            <button 
              className="btn btn-secondary btn-action" 
              onClick={onStop}
              title="Leave chat and return to landing page (Esc)"
            >
              <LogOut size={16} />
              <span>Stop</span>
            </button>

            {/* Next Button */}
            <button 
              className="btn btn-primary btn-action" 
              onClick={onNext}
              style={{
                background: isPartnerDisconnected 
                  ? 'linear-gradient(135deg, #10b981, #059669)' 
                  : undefined
              }}
              title="Disconnect and find a new partner (Esc)"
            >
              <RotateCw size={16} />
              <span>{isPartnerDisconnected ? 'Find New Stranger' : 'Next Stranger'}</span>
            </button>
          </div>

          <div className="controls-right">
            {/* Report Button */}
            <button 
              className="btn btn-danger btn-action" 
              onClick={() => setIsReportModalOpen(true)}
              title="Report stranger for inappropriate behavior"
            >
              <ShieldAlert size={16} />
              <span>Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right Area: Real-Time Chat Panel */}
      <div className="chat-panel glass-panel">
        {/* Chat Header */}
        <div className="chat-header">
          <div className="chat-status-indicator">
            <div className={`status-dot ${isPartnerDisconnected ? 'disconnected' : ''}`} />
            <span>
              {isPartnerDisconnected 
                ? 'Stranger disconnected' 
                : isConnected 
                  ? 'Connected with Stranger' 
                  : 'Connecting...'}
            </span>
          </div>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Room: {roomId ? roomId.substring(0, 14) : 'active'}
          </span>
        </div>

        {/* Messages Feed */}
        <div className="messages-list">
          {/* Welcome Message */}
          <div className="message-bubble system">
            <div className="bubble-content">
              You are now chatting with a random stranger. Always be respectful and keep your personal info safe!
            </div>
          </div>

          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`message-bubble ${msg.isSystem ? 'system' : msg.isSelf ? 'self' : 'stranger'}`}
            >
              <div className="bubble-content">
                {msg.text}
                {msg.flagged && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px', fontSize: '0.72rem', color: 'var(--accent-rose)' }}>
                    <AlertCircle size={11} /> filtered
                  </span>
                )}
              </div>
              {!msg.isSystem && (
                <div className="bubble-time">{msg.timestamp || 'just now'}</div>
              )}
            </div>
          ))}

          {/* Partner Disconnected Alert Card */}
          {isPartnerDisconnected && (
            <div className="message-bubble system">
              <div className="bubble-content" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#fda4af', borderColor: 'rgba(244, 63, 94, 0.3)' }}>
                <strong>Stranger has disconnected.</strong> Click "Find New Stranger" or "Next" to continue.
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        <div className="typing-indicator-bar">
          {isPartnerTyping && !isPartnerDisconnected && (
            <span>Stranger is typing...</span>
          )}
        </div>

        {/* Input Form */}
        <form className="chat-input-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={isPartnerDisconnected ? 'Stranger disconnected. Click Next to find a new stranger.' : 'Type your message here... (Press Enter to send)'}
            value={inputText}
            onChange={handleInputChange}
            disabled={isPartnerDisconnected}
            autoFocus
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.25rem', borderRadius: '12px' }}
            disabled={!inputText.trim() || isPartnerDisconnected}
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={onReport}
        partnerId={partnerId}
      />
    </div>
  );
}
