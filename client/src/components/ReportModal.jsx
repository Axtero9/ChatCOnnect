import React, { useState } from 'react';
import { ShieldAlert, X, Check } from 'lucide-react';

const REPORT_REASONS = [
  'Inappropriate or offensive behavior',
  'Severe slurs / hate speech',
  'Harassment or bullying',
  'Spam or bot activity',
  'Nudity or explicit content',
  'Other violation'
];

export default function ReportModal({ isOpen, onClose, onSubmitReport, partnerId }) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fullReason = additionalNotes.trim() 
      ? `${selectedReason} - ${additionalNotes.trim()}`
      : selectedReason;
      
    onSubmitReport(fullReason);
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f43f5e' }}>
              <ShieldAlert size={20} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Report Stranger</h3>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Reporting logs this user's active session ID (<code style={{ color: 'var(--accent-cyan)' }}>{partnerId || 'anonymous'}</code>) server-side for moderation review.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Select Reason
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {REPORT_REASONS.map((reason) => (
                <label 
                  key={reason}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.55rem 0.85rem',
                    borderRadius: '8px',
                    background: selectedReason === reason ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: `1px solid ${selectedReason === reason ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  <input 
                    type="radio" 
                    name="reason" 
                    value={reason} 
                    checked={selectedReason === reason} 
                    onChange={() => setSelectedReason(reason)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Additional Details (optional)
            </label>
            <input 
              type="text" 
              placeholder="e.g. details of what occurred"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                color: '#fff',
                fontSize: '0.88rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button 
              type="button" 
              className="btn btn-secondary btn-action" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-danger btn-action"
              disabled={submitting}
            >
              <Check size={16} />
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
