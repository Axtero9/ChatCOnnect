import React from 'react';
import { Video, MessageSquare, Shield, Zap, Sparkles, Lock, Users } from 'lucide-react';

export default function Landing({ mode, setMode, onStartChat }) {
  return (
    <div className="landing-container">
      {/* Top Badge */}
      <div className="hero-tag">
        <Sparkles size={16} />
        <span>Instant 1-on-1 Random Chat</span>
      </div>

      {/* Main Title & Subtitle */}
      <h1 className="hero-title">
        Connect with Strangers <br />
        <span style={{ color: '#6366f1' }}>Anywhere, Anytime.</span>
      </h1>
      
      <p className="hero-subtitle">
        Talk to random people worldwide via high-quality WebRTC video or lightning-fast text chat. No login required.
      </p>

      {/* Chat Mode Selection */}
      <div className="mode-selector">
        <div 
          className={`mode-card ${mode === 'video' ? 'active' : ''}`}
          onClick={() => setMode('video')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setMode('video')}
        >
          <div className="mode-icon-box">
            <Video size={28} />
          </div>
          <h3>Video + Text</h3>
          <p>Real-time P2P video & audio with integrated text messaging.</p>
        </div>

        <div 
          className={`mode-card ${mode === 'text' ? 'active' : ''}`}
          onClick={() => setMode('text')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setMode('text')}
        >
          <div className="mode-icon-box">
            <MessageSquare size={28} />
          </div>
          <h3>Text Only</h3>
          <p>Fast, lightweight anonymous chat without camera or microphone.</p>
        </div>
      </div>

      {/* CTA Start Button */}
      <button 
        className="btn btn-primary" 
        style={{ padding: '1rem 2.8rem', fontSize: '1.15rem', borderRadius: '16px' }}
        onClick={onStartChat}
      >
        <Zap size={20} />
        Start {mode === 'video' ? 'Video' : 'Text'} Chat
      </button>

      {/* Trust & Safety Highlights */}
      <div className="features-row">
        <div className="feature-pill">
          <Shield size={16} color="#10b981" />
          <span>Automatic Slur & Hate Filter</span>
        </div>
        <div className="feature-pill">
          <Lock size={16} color="#6366f1" />
          <span>Direct WebRTC P2P Encryption</span>
        </div>
        <div className="feature-pill">
          <Zap size={16} color="#f59e0b" />
          <span>Anti-Spam Rate Limiter</span>
        </div>
        <div className="feature-pill">
          <Users size={16} color="#06b6d4" />
          <span>Instant Auto-Queue Matching</span>
        </div>
      </div>
    </div>
  );
}
