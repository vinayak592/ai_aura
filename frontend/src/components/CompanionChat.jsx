// CompanionChat.jsx - Dedicated premium glassmorphic Personal AI Health Companion Chatbot
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Sparkles, Volume2, VolumeX, RefreshCw, Activity, Heart, Shield } from 'lucide-react';
import { speakText } from '../utils/voiceCommands';

export default function CompanionChat({ patient, apiBase }) {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: `Hello ${patient?.name || 'Jane'}! I am your personal Aura Companion, co-monitoring your clinical telemetry. Speak or type any health concerns or ask how your daily fatigue levels correlate with your symptoms. How can I guide you today?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const chatEndRef = useRef(null);

  // Auto-scroll chat window
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Suggested Prompts
  const suggestedPrompts = [
    { label: "Dry eyes relief tips", text: "What are some fast, actionable relief tips for digital dry eye strain?" },
    { label: "How is my stress score?", text: "Based on my webcam telemetry sessions, how is my stress rating and how can I optimize it?" },
    { label: "Book an Optometrist", text: "I would like to book a consultation session with an optometrist." }
  ];

  // Send message handler
  const handleSend = async (messageText) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    const userMessage = {
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Retrieve live patient averages to inject context for the AI
    let fatigue = 40;
    let attention = 90;
    try {
      const res = await fetch(`${apiBase}/api/patients/${patient?.id}/telemetry`);
      const logs = await res.json();
      if (res.ok && logs.length > 0) {
        fatigue = Math.round(logs.reduce((sum, l) => sum + l.fatigueScore, 0) / logs.length);
        attention = Math.round(logs.reduce((sum, l) => sum + l.attentionScore, 0) / logs.length);
      }
    } catch (e) {
      console.error('Error fetching context averages:', e);
    }

    const patientContext = {
      symptoms: patient?.symptoms || [],
      medicalHistory: patient?.medicalHistory || [],
      age: patient?.age,
      gender: patient?.gender,
      fatigueScore: fatigue,
      attentionScore: attention
    };

    try {
      const chatRes = await fetch(`${apiBase}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          patientContext
        })
      });
      const data = await chatRes.json();
      if (chatRes.ok) {
        const assistantMessage = {
          sender: 'assistant',
          text: data.response,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Speak response aloud if enabled
        if (voiceEnabled) {
          speakText(data.response);
        }
      } else {
        setMessages((prev) => [...prev, {
          sender: 'assistant',
          text: "I experienced an error compiling my response. Let's try again in a few moments.",
          timestamp: new Date()
        }]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, {
        sender: 'assistant',
        text: "Connection lost. I am unable to connect to my digital clinical logic centers.",
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const selectPrompt = (text) => {
    handleSend(text);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '30px', padding: '0 20px 40px 20px', height: 'calc(100vh - 120px)' }}>
      
      {/* LEFT COLUMN: CHAT INTERFACE */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '0' }}>
        
        {/* Chat Panel Header */}
        <div style={{ padding: '20px 30px', borderBottom: '1px solid var(--border-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={20} color="var(--primary-cyan)" className="animate-pulse" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Aura Companion Workspace</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reasoning Clinical AI Wellness Assistant</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="outline-btn"
              onClick={() => {
                if (voiceEnabled) {
                  window.speechSynthesis.cancel();
                  setVoiceEnabled(false);
                } else {
                  setVoiceEnabled(true);
                }
              }}
              style={{
                width: '40px',
                height: '40px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: voiceEnabled ? 'var(--primary-cyan)' : 'var(--border-muted)',
                color: voiceEnabled ? 'var(--primary-cyan)' : 'var(--text-dark)',
                background: voiceEnabled ? 'rgba(0, 242, 254, 0.05)' : 'transparent'
              }}
              title={voiceEnabled ? "Mute Aura Vocalizer" : "Unmute Aura Vocalizer"}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>

        {/* Message Window */}
        <div style={{ flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', background: 'rgba(0,0,0,0.05)' }}>
          {messages.map((m, idx) => {
            const isUser = m.sender === 'user';
            return (
              <div 
                key={idx}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  animation: 'fadeIn 0.2s ease'
                }}
              >
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: isUser ? 'flex-end' : 'flex-start', fontWeight: 600 }}>
                  {isUser ? 'Patient' : 'Aura Companion'}
                </span>
                
                <div
                  style={{
                    background: isUser ? 'var(--gradient-neon)' : 'rgba(22, 28, 62, 0.45)',
                    color: isUser ? '#060813' : 'var(--text-main)',
                    padding: '12px 18px',
                    borderRadius: isUser ? '16px 16px 0 16px' : '16px 16px 16px 0',
                    fontSize: '0.9rem',
                    fontWeight: isUser ? 500 : 400,
                    lineHeight: 1.5,
                    border: isUser ? 'none' : '1px solid var(--border-muted)',
                    boxShadow: isUser ? '0 4px 15px rgba(0, 242, 254, 0.15)' : 'none',
                    textAlign: 'justify'
                  }}
                >
                  {m.text}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '80%' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Aura Companion</span>
              <div style={{
                background: 'rgba(22, 28, 62, 0.3)',
                padding: '12px 25px',
                borderRadius: '16px 16px 16px 0',
                border: '1px solid var(--border-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ width: '6px', height: '6px', background: 'var(--primary-cyan)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate' }} />
                <div style={{ width: '6px', height: '6px', background: 'var(--primary-purple)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate 0.2s' }} />
                <div style={{ width: '6px', height: '6px', background: 'var(--primary-cyan)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate 0.4s' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '8px' }}>Gemma-4 is formulating health advice...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts Shelf */}
        {messages.length === 1 && !loading && (
          <div style={{ padding: '0 30px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>SUGGESTED WORKFLOW ACTIONS:</span>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {suggestedPrompts.map((p, i) => (
                <button 
                  key={i} 
                  className="outline-btn"
                  onClick={() => selectPrompt(p.text)}
                  style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: '20px', border: '1px solid rgba(0, 242, 254, 0.2)', background: 'rgba(0, 242, 254, 0.02)' }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input panel */}
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
          style={{ padding: '20px 30px', borderTop: '1px solid var(--border-muted)', display: 'flex', gap: '15px', background: 'rgba(0,0,0,0.1)' }}
        >
          <input
            type="text"
            placeholder="Type symptoms or ask health concerns..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="form-input"
            style={{ padding: '14px 20px', fontSize: '0.9rem', flex: 1 }}
          />
          <button 
            type="submit" 
            className="neon-btn glow-active"
            disabled={loading || !input.trim()}
            style={{ width: '50px', height: '50px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Send size={18} color="#060813" />
          </button>
        </form>

      </div>

      {/* RIGHT COLUMN: WELLNESS SUMMARY HUD */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Dynamic Context Card */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} color="var(--primary-cyan)" />
            Active Wellness Context
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Aura Companion incorporates your live symptoms, chronicle logs, and webcam diagnostics to tailor its suggestions specifically for you.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <div className="glass-card" style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Logged Symptoms</span>
              <span style={{ fontWeight: 700, color: 'var(--primary-cyan)' }}>{patient?.symptoms?.length || 0} active</span>
            </div>
            <div className="glass-card" style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Background History</span>
              <span style={{ fontWeight: 700 }}>{patient?.medicalHistory?.length || 0} logged</span>
            </div>
            <div className="glass-card" style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Webcam Verifications</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>Active ✓</span>
            </div>
          </div>
        </div>

        {/* Safety Guidelines */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px', borderLeft: '4px solid var(--danger)' }}>
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)' }}>
            <Shield size={18} />
            Clinical Safety Notice
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5, textAlign: 'justify' }}>
            Aura Companion provides health optimization insights. For severe pain, physical injury, visual impairments, or sudden discomfort, please visit the **Consultation Clinic** tab to book a direct virtual session with Dr. Vance or another specialist.
          </p>
        </div>

      </div>

    </div>
  );
}
