// Navbar.jsx - Glowing glassmorphism navigation header
import React from 'react';
import { Shield, Eye, Video, FileImage, BarChart2, LogOut, User, CheckCircle2, AlertTriangle, MessageSquare, FileText } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, patient, onLogout, onTriggerVerification, faceVerified }) {
  const links = [
    { id: 'dashboard', label: 'Dashboard', icon: User },
    { id: 'vision', label: 'Vision Telemetry', icon: Eye },
    { id: 'image', label: 'Image Diagnostics', icon: FileImage },
    { id: 'consultation', label: 'Consultation Clinic', icon: Video },
    { id: 'insights', label: 'Health Insights', icon: BarChart2 },
    { id: 'companion', label: 'Companion', icon: MessageSquare },
    { id: 'scribe', label: 'Scribe', icon: FileText }
  ];

  return (
    <header className="glass-panel" style={{
      margin: '20px',
      padding: '15px 30px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: '20px',
      zIndex: 100
    }}>
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'var(--gradient-neon)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(0, 242, 254, 0.4)'
        }}>
          <Shield size={22} color="#060813" />
        </div>
        <span className="glow-text" style={{
          fontFamily: 'Outfit',
          fontSize: '1.6rem',
          fontWeight: 800,
          background: 'var(--gradient-neon)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Aura AI
        </span>
      </div>

      {/* Nav Actions */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              style={{
                background: isActive ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                color: isActive ? 'var(--primary-cyan)' : 'var(--text-muted)',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--primary-cyan)' : '2px solid transparent',
                padding: '8px 16px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '6px 6px 0 0',
                transition: 'all 0.25s ease'
              }}
              className={isActive ? 'glow-text' : ''}
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Patient Profile Box */}
      {patient && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Facial Verification Badge */}
          {faceVerified ? (
            <div 
              className="badge-success" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '6px 12px', 
                borderRadius: '30px', 
                fontSize: '0.8rem',
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.2)'
              }}
            >
              <CheckCircle2 size={14} />
              <span>Face Verified</span>
            </div>
          ) : (
            <button 
              className="glow-active"
              onClick={onTriggerVerification}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '6px 12px', 
                borderRadius: '30px', 
                fontSize: '0.8rem',
                background: 'rgba(245, 158, 11, 0.1)',
                color: 'var(--warning)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              <AlertTriangle size={14} />
              <span>Verify Identity</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={16} color="var(--text-muted)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{patient.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Patient Account</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      )}
    </header>
  );
}
