import React from 'react';
import { Video, MessageSquare, X } from 'lucide-react';

export default function Waiting({ mode, onCancel }) {
  return (
    <div className="waiting-container">
      {/* Animated Radar Pulse Effect */}
      <div className="radar-wrapper">
        <div className="radar-ring" />
        <div className="radar-ring" />
        <div className="radar-ring" />
        <div className="radar-core">
          {mode === 'video' ? <Video size={32} /> : <MessageSquare size={32} />}
        </div>
      </div>

      <h2 style={{ fontSize: '1.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Looking for a stranger...
      </h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '420px' }}>
        Searching the {mode === 'video' ? 'video & text' : 'text-only'} queue for an available peer. You will be connected automatically.
      </p>

      {/* Cancel Button */}
      <button 
        className="btn btn-secondary btn-action" 
        onClick={onCancel}
        style={{ padding: '0.65rem 1.75rem', gap: '0.5rem' }}
      >
        <X size={18} />
        Cancel Search
      </button>
    </div>
  );
}
