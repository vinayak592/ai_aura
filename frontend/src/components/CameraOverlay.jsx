// CameraOverlay.jsx - Real-time webcam telemetry canvas overlay with facial stats and telemetry syncer
import React, { useRef, useState, useEffect } from 'react';
import { Camera, CameraOff, Brain, UserCheck, ShieldAlert, Award, Smile, Save, RefreshCw } from 'lucide-react';
import { analyzeFaceTelemetry, resetVisionBaseline } from '../utils/faceAnalyzer';

export default function CameraOverlay({ patient, apiBase, onTelemetryLogged }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const dbSyncRef = useRef(null);

  // States
  const [cameraActive, setCameraActive] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [loggingActive, setLoggingActive] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Start Camera
  const startCamera = async () => {
    resetVisionBaseline();
    setLoadingModels(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setCameraActive(true);
      
      // Start processing loop
      timerRef.current = setInterval(processFrame, 200); // 5 frames per second is highly efficient
      
      // Start database auto-save aggregator loop (every 10 seconds of active tracking)
      dbSyncRef.current = setInterval(accumulateTelemetrySession, 10000);
      
      setLoggingActive(true);
    } catch (err) {
      console.error('Error accessing webcam:', err);
      alert('Camera access denied or unavailable. Please connect a laptop webcam and approve permissions.');
    } finally {
      setLoadingModels(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (dbSyncRef.current) clearInterval(dbSyncRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setCameraActive(false);
    setTelemetry(null);
    setLoggingActive(false);
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Run face-api analysis on each frame
  const processFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video.videoWidth === 0) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const results = await analyzeFaceTelemetry(video);
    setTelemetry(results);
    
    // Draw visual feedback overlay on canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results && results.present && results.box) {
      const { x, y, width, height } = results.box;
      
      // Draw neon boundary box
      ctx.strokeStyle = results.microSleep ? '#ef4444' : '#00f2fe';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.shadowColor = results.microSleep ? 'rgba(239, 68, 68, 0.8)' : 'rgba(0, 242, 254, 0.8)';
      
      // Rounded bounding corner shapes
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 12);
      ctx.stroke();
      
      // Reset shadows
      ctx.shadowBlur = 0;
      
      // Draw tracking label
      ctx.fillStyle = results.microSleep ? '#ef4444' : '#00f2fe';
      ctx.font = 'bold 12px Inter';
      ctx.fillText(
        `AURA TRACKER - ${results.attention.toUpperCase()}`,
        x + 5,
        y > 20 ? y - 10 : y + 15
      );
    }
  };

  // Accumulate telemetry records to commit to DB
  const accumulateTelemetrySession = () => {
    setTelemetry((curr) => {
      if (curr && curr.present) {
        setSessionLogs((prev) => [...prev, curr]);
      }
      return curr;
    });
  };

  // Save vision session records directly to DB
  const commitTelemetryToDatabase = async () => {
    if (sessionLogs.length === 0) {
      // If session logs are empty but tracking is active, take the current snapshot
      if (telemetry && telemetry.present) {
        sessionLogs.push(telemetry);
      } else {
        alert('No webcam tracking data recorded in this session yet.');
        return;
      }
    }

    setSaveStatus('saving');
    
    // Calculate aggregate averages of all captured frames
    const count = sessionLogs.length;
    
    let sumFatigue = 0;
    let sumAttention = 0;
    let sumBlinkRate = 0;
    
    const avgEmotions = { happy: 0, sad: 0, neutral: 0, angry: 0, stressed: 0 };
    
    sessionLogs.forEach((log) => {
      sumFatigue += log.fatigueScore;
      sumAttention += log.attentionScore;
      sumBlinkRate += log.blinkRate;
      
      Object.keys(avgEmotions).forEach(k => {
        avgEmotions[k] += log.emotionData[k];
      });
    });

    const aggregatePayload = {
      emotionData: {
        happy: Math.round(avgEmotions.happy / count),
        sad: Math.round(avgEmotions.sad / count),
        neutral: Math.round(avgEmotions.neutral / count),
        angry: Math.round(avgEmotions.angry / count),
        stressed: Math.round(avgEmotions.stressed / count)
      },
      fatigueScore: Math.round(sumFatigue / count),
      blinkRate: Math.round(sumBlinkRate / count),
      attentionScore: Math.round(sumAttention / count),
      presenceDuration: count * 5 // 5 seconds per tick approximately
    };

    try {
      const res = await fetch(`${apiBase}/api/patients/${patient.id}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aggregatePayload)
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus('success');
        setSessionLogs([]); // clear
        if (onTelemetryLogged) onTelemetryLogged(data);
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      console.error(e);
      setSaveStatus('error');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: '30px', padding: '0 20px 40px 20px' }}>
      
      {/* LEFT COLUMN: CAMERA OVERLAY SCREEN */}
      <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
        
        {/* Alerts Block */}
        {telemetry && telemetry.present && telemetry.microSleep && (
          <div className="glow-danger" style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'var(--danger)',
            color: '#fff',
            padding: '12px 30px',
            borderRadius: '30px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '1rem',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.8)'
          }}>
            <ShieldAlert size={20} className="animate-pulse" />
            ⚠️ FATIGUE WARNING: MICRO-SLEEP ALARM ACTIVE
          </div>
        )}

        {telemetry && telemetry.present && telemetry.slouching && !telemetry.microSleep && (
          <div style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            background: 'rgba(245, 158, 11, 0.95)',
            color: '#000',
            padding: '10px 24px',
            borderRadius: '30px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem'
          }}>
            <Award size={18} />
            ⚠️ POSTURE NOTICE: SLOUCHING DETECTED
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Camera size={22} color="var(--primary-cyan)" />
            Real-Time Vision Health Camera
          </h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: (telemetry && telemetry.present) ? 'var(--success)' : 'var(--danger)',
              boxShadow: (telemetry && telemetry.present) ? '0 0 10px var(--success)' : '0 0 10px var(--danger)'
            }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {telemetry?.present ? 'Presence Verified' : 'No Patient Present'}
            </span>
          </div>
        </div>

        {/* Viewfinder block */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3',
          background: '#04060d',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--border-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {!cameraActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <div style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-dark)'
              }}>
                <CameraOff size={32} />
              </div>
              <button className="neon-btn" onClick={startCamera} disabled={loadingModels}>
                {loadingModels ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Booting Vision AI models...
                  </>
                ) : (
                  <>
                    <Camera size={18} />
                    Activate Vision Scanner
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', transform: 'scaleX(-1)' }}
              />
            </>
          )}
        </div>

        {cameraActive && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <button className="outline-btn" onClick={stopCamera} style={{ flex: 1, borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              Deactivate Camera
            </button>
            
            <button 
              className="neon-btn glow-active" 
              onClick={commitTelemetryToDatabase} 
              disabled={saveStatus === 'saving'}
              style={{ flex: 2, background: 'var(--gradient-neon)', color: '#060813' }}
            >
              <Save size={18} />
              {saveStatus === 'saving' ? 'Saving telemetry logs...' : 
               saveStatus === 'success' ? 'Telemetry logged successfully! ✓' : 
               'Commit Telemetry Session Logs'}
            </button>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: VISION HEALTH DIALS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Core Stats Dial Card */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={18} color="var(--primary-cyan)" />
            Real-Time Diagnostic Gauges
          </h3>

          {!telemetry || !telemetry.present ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dark)' }}>
              Activate the vision scanner to begin receiving live optical diagnostics.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Dynamic Dial Rings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                
                {/* Fatigue dial */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', gap: '10px', borderColor: telemetry.fatigueScore > 60 ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-muted)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Fatigue Score</span>
                  <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="32" stroke={telemetry.fatigueScore > 60 ? '#ef4444' : '#00f2fe'} strokeWidth="6" fill="none" strokeDasharray="201" strokeDashoffset={201 - (201 * telemetry.fatigueScore) / 100} strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '1.25rem', fontWeight: 800, color: telemetry.fatigueScore > 60 ? '#ef4444' : '#fff' }}>{telemetry.fatigueScore}</span>
                  </div>
                  <span className={telemetry.fatigueScore > 60 ? "badge-danger" : telemetry.fatigueScore > 35 ? "badge-warning" : "badge-success"} style={{ fontSize: '0.65rem' }}>
                    {telemetry.fatigueScore > 60 ? 'High Fatigue' : telemetry.fatigueScore > 35 ? 'Moderate' : 'Rested'}
                  </span>
                </div>

                {/* Attention Gaze dial */}
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '15px', gap: '10px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Screen Gaze</span>
                  <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                      <circle cx="40" cy="40" r="32" stroke="#9b51e0" strokeWidth="6" fill="none" strokeDasharray="201" strokeDashoffset={201 - (201 * telemetry.attentionScore) / 100} strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 0.3s ease' }} />
                    </svg>
                    <span style={{ position: 'absolute', fontSize: '1.15rem', fontWeight: 800 }}>{telemetry.attentionScore}%</span>
                  </div>
                  <span className={telemetry.attention === 'Attentive' ? "badge-success" : "badge-danger"} style={{ fontSize: '0.65rem' }}>
                    {telemetry.attention}
                  </span>
                </div>
              </div>

              {/* Blink rate telemetry & eye aspect metrics */}
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Ocular Aperture (Avg EAR)</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{telemetry.avgEAR}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Live Blink Rate</span>
                  <span style={{ fontWeight: 'bold' }}>{telemetry.blinkRate} bpm</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total Blinks Logged</span>
                  <span style={{ fontWeight: 'bold' }}>{telemetry.totalBlinks}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Prolonged Eye Closures</span>
                  <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}>{telemetry.isClosed ? 'Closed 👁️' : 'Open 👀'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Emotion Distribution Metrics */}
        {telemetry && telemetry.present && (
          <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smile size={18} color="var(--primary-purple)" />
              Socio-Emotional Distribution
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(telemetry.emotionData).map(([emotion, val]) => (
                <div key={emotion} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                    <span style={{ fontWeight: 500 }}>{emotion}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{val}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${val}%`, 
                      height: '100%', 
                      background: emotion === 'happy' ? 'var(--success)' : 
                                  emotion === 'sad' ? 'var(--accent-blue)' :
                                  emotion === 'neutral' ? 'var(--text-muted)' :
                                  emotion === 'angry' ? 'var(--danger)' : 
                                  'var(--primary-purple)',
                      borderRadius: '3px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
