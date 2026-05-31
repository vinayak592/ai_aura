// HealthInsights.jsx - Diagnostics & AI-driven Health Scores, SVG graphs, and advice cards
import React, { useState, useEffect } from 'react';
import { Heart, Activity, Award, ShieldAlert, Sparkles, BookOpen, Clock, Calendar, RefreshCw } from 'lucide-react';

export default function HealthInsights({ patient, apiBase }) {
  const [telemetryHistory, setTelemetryHistory] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch Telemetry history on mount
  useEffect(() => {
    fetchTelemetryData();
  }, [patient.id]);

  async function fetchTelemetryData() {
    try {
      const res = await fetch(`${apiBase}/api/patients/${patient.id}/telemetry`);
      const data = await res.json();
      if (res.ok) {
        setTelemetryHistory(data);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Generate Smart Insights
  const generateInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/ai/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: patient.id })
      });
      const data = await res.json();
      if (res.ok) {
        setInsights(data);
      } else {
        setError('Failed to fetch clinical insights.');
      }
    } catch (e) {
      console.error(e);
      setError('Connection failed. Unable to reach diagnostic AI backend.');
    } finally {
      setLoading(false);
    }
  };

  // Run automatically once if telemetry logs are available
  useEffect(() => {
    if (!patient?.id) return;
    fetchTelemetryData();
  }, [patient?.id]);

  // Math for custom SVG charts
  const renderTrendChart = () => {
    if (telemetryHistory.length < 2) {
      return (
        <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-dark)' }}>
          At least two telemetry session logs are required to compile visual diagnostic graphs.
        </div>
      );
    }

    // Sort ascending for graph plotting
    const sorted = [...telemetryHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).slice(-6); // last 6 points
    const width = 500;
    const height = 150;
    const padding = 25;
    
    // Draw fatigue points
    const pointsFatigue = sorted.map((t, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (sorted.length - 1);
      const y = height - padding - (t.fatigueScore * (height - 2 * padding)) / 100;
      return { x, y, score: t.fatigueScore };
    });

    // Draw attention points
    const pointsAttention = sorted.map((t, idx) => {
      const x = padding + (idx * (width - 2 * padding)) / (sorted.length - 1);
      const y = height - padding - (t.attentionScore * (height - 2 * padding)) / 100;
      return { x, y, score: t.attentionScore };
    });

    const createPathD = (points) => {
      return points.reduce((path, p, idx) => {
        return idx === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
      }, '');
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', fontSize: '0.75rem', fontWeight: 600 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '4px', background: 'var(--primary-cyan)', borderRadius: '2px' }} />
            <span style={{ color: 'var(--primary-cyan)' }}>Fatigue Score Trend</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '4px', background: 'var(--primary-purple)', borderRadius: '2px' }} />
            <span style={{ color: 'var(--primary-purple)' }}>Attention focus Gaze</span>
          </div>
        </div>

        <div style={{ width: '100%', overflowX: 'auto' }}>
          <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
            {/* Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.03)" />
            <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="rgba(255,255,255,0.03)" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.08)" />

            {/* Fatigue Line */}
            <path d={createPathD(pointsFatigue)} fill="none" stroke="var(--primary-cyan)" strokeWidth="3" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(0, 242, 254, 0.4))' }} />
            {pointsFatigue.map((p, i) => (
              <g key={'f'+i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#060813" stroke="var(--primary-cyan)" strokeWidth="2" />
                <text x={p.x} y={p.y - 8} fontSize="8" fill="var(--primary-cyan)" fontWeight="bold" textAnchor="middle">{p.score}</text>
              </g>
            ))}

            {/* Attention Line */}
            <path d={createPathD(pointsAttention)} fill="none" stroke="var(--primary-purple)" strokeWidth="3" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px rgba(155, 81, 224, 0.4))' }} />
            {pointsAttention.map((p, i) => (
              <g key={'a'+i}>
                <circle cx={p.x} cy={p.y} r="4" fill="#060813" stroke="var(--primary-purple)" strokeWidth="2" />
                <text x={p.x} y={p.y + 12} fontSize="8" fill="var(--primary-purple)" fontWeight="bold" textAnchor="middle">{p.score}%</text>
              </g>
            ))}

            {/* X-axis labels */}
            {sorted.map((t, idx) => {
              const x = padding + (idx * (width - 2 * padding)) / (sorted.length - 1);
              const dateStr = new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return (
                <text key={idx} x={x} y={height - 6} fontSize="7" fill="var(--text-dark)" textAnchor="middle">
                  {dateStr}
                </text>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '4fr 3fr', gap: '30px', padding: '0 20px 40px 20px' }}>
      
      {/* LEFT COLUMN: DIAGNOSTIC SCORES & RECOMMENDATIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '35px' }}>
        
        {/* Animated Score Rings Panel */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={22} color="var(--primary-cyan)" />
              Aura Smart Health Index
            </h2>
            
            <button className="outline-btn" style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={generateInsights} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Recalculate Scores
            </button>
          </div>

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '15px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid rgba(0, 242, 254, 0.1)',
                borderTop: '4px solid var(--primary-cyan)',
                borderRadius: '50%',
                animation: 'spin 1s infinite linear'
              }} className="animate-spin" />
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Synthesizing multi-session diagnostics...</span>
            </div>
          )}

          {error && !loading && (
            <div className="badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '15px', borderRadius: '8px', textTransform: 'none' }}>
              <ShieldAlert size={18} />
              <span>{error}</span>
            </div>
          )}

          {insights && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              
              {/* Circular Gauge Ring Layout */}
              <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '20px' }}>
                
                {/* Health Score */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Health Index</span>
                  <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <defs>
                        <linearGradient id="cyanPurpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--primary-cyan)" />
                          <stop offset="100%" stopColor="var(--primary-purple)" />
                        </linearGradient>
                      </defs>
                      <circle cx="45" cy="45" r="36" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" />
                      <circle cx="45" cy="45" r="36" stroke="url(#cyanPurpleGradient)" strokeWidth="6" fill="none" strokeDasharray="226" strokeDashoffset={226 - (226 * insights.healthScore) / 100} strokeLinecap="round" transform="rotate(-90 45 45)" />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '1.4rem', fontWeight: 800 }}>{insights.healthScore}</span>
                  </div>
                  <span className="badge-success" style={{ fontSize: '0.65rem' }}>Optimal</span>
                </div>

                {/* Wellness Score */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Wellness & rest</span>
                  <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <circle cx="45" cy="45" r="36" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" />
                      <circle cx="45" cy="45" r="36" stroke="var(--primary-cyan)" strokeWidth="6" fill="none" strokeDasharray="226" strokeDashoffset={226 - (226 * insights.wellnessScore) / 100} strokeLinecap="round" transform="rotate(-90 45 45)" />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '1.4rem', fontWeight: 800 }}>{insights.wellnessScore}</span>
                  </div>
                  <span className="badge-info" style={{ fontSize: '0.65rem' }}>Moderate</span>
                </div>

                {/* Risk Score */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Strain Risk</span>
                  <div style={{ position: 'relative', width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="90" height="90" viewBox="0 0 90 90">
                      <circle cx="45" cy="45" r="36" stroke="rgba(255,255,255,0.03)" strokeWidth="6" fill="none" />
                      <circle cx="45" cy="45" r="36" stroke="var(--danger)" strokeWidth="6" fill="none" strokeDasharray="226" strokeDashoffset={226 - (226 * insights.riskScore) / 100} strokeLinecap="round" transform="rotate(-90 45 45)" style={{ filter: insights.riskScore > 50 ? 'drop-shadow(0 0 3px var(--danger))' : 'none' }} />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '1.4rem', fontWeight: 800, color: insights.riskScore > 50 ? 'var(--danger)' : '#fff' }}>{insights.riskScore}</span>
                  </div>
                  <span className={insights.riskScore > 40 ? "badge-danger" : "badge-success"} style={{ fontSize: '0.65rem' }}>
                    {insights.riskScore > 40 ? 'Elevated' : 'Low Risk'}
                  </span>
                </div>

              </div>

              {/* Reasoning Card */}
              <div className="glass-card" style={{ background: 'rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>CLINICAL REASONING BRIEF</span>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: 'var(--text-main)' }}>
                  {insights.reasoning}
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Custom AI Recommendations */}
        {insights && !loading && (
          <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={18} color="var(--primary-cyan)" />
              Clinical Recommendations & Guidelines
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {insights.suggestions?.map((item, idx) => (
                <div key={idx} className="glass-card" style={{ borderLeft: '4px solid ' + (idx % 2 === 0 ? 'var(--primary-cyan)' : 'var(--primary-purple)'), display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: idx % 2 === 0 ? 'var(--primary-cyan)' : 'var(--primary-purple)' }}>{item.title}</span>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{item.desc}</p>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* RIGHT COLUMN: GRAPHS & TELEMETRY SESSION HISTORY */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Trend graphs card */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={20} color="var(--primary-cyan)" />
            Optical Telemetry Trends
          </h3>

          {renderTrendChart()}

        </div>

        {/* Vision session records */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="var(--primary-purple)" />
            Vision Session Logs
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '300px', overflowY: 'auto', paddingRight: '5px' }}>
            {telemetryHistory.map((t, idx) => {
              const dateObj = new Date(t.timestamp);
              return (
                <div key={t._id || idx} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignContent: 'center', alignItems: 'center', gap: '10px' }}>
                    <Calendar size={14} color="var(--text-muted)" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600 }}>{dateObj.toLocaleDateString()}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fatigue</span>
                      <span style={{ fontWeight: 700, color: t.fatigueScore > 60 ? 'var(--danger)' : 'var(--primary-cyan)' }}>{t.fatigueScore}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gaze Focus</span>
                      <span style={{ fontWeight: 700 }}>{t.attentionScore}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {telemetryHistory.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dark)' }}>No vision sessions archived.</div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
