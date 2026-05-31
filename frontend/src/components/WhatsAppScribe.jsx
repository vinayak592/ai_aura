// WhatsAppScribe.jsx - Dynamic voice recording workspace that transcribes speech, compiles report, and sends via Twilio WhatsApp
import React, { useRef, useState, useEffect } from 'react';
import { Mic, MicOff, MessageSquare, Send, RefreshCw, FileText, CheckCircle2, ShieldAlert, Key, Smartphone, FileCheck } from 'lucide-react';
import { speakText } from '../utils/voiceCommands';

export default function WhatsAppScribe({ patient, apiBase }) {
  const recognitionRef = useRef(null);

  // Recording & Transcript states
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState('');
  const [compiling, setCompiling] = useState(false);

  // Twilio Dispatch configurations (saved locally in state, easily testable)
  const [whatsappTo, setWhatsappTo] = useState('');
  const [customSid, setCustomSid] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  
  // Status feedback
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [dispatchError, setDispatchError] = useState(null);

  // Bootstrap speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech recognition unsupported in this browser.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e) => {
      let speechString = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) {
          speechString += e.results[i][0].transcript + ' ';
        }
      }
      if (speechString.trim()) {
        setTranscript((prev) => prev + speechString);
      }
    };

    rec.onerror = (err) => {
      console.error(err);
      setRecording(false);
    };

    rec.onend = () => {
      setRecording(false);
    };

    recognitionRef.current = rec;
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition engine failed to load or is unsupported on this browser.');
      return;
    }

    if (!recording) {
      window.speechSynthesis.cancel();
      setTranscript('');
      setReport('');
      setSuccessMsg(null);
      setDispatchError(null);
      recognitionRef.current.start();
      setRecording(true);
    } else {
      recognitionRef.current.stop();
      setRecording(false);
    }
  };

  // Compile checkup report via AI Gemma
  const generateCheckupReport = async () => {
    if (!transcript.trim()) {
      alert('Please speak or record some checkup notes first.');
      return;
    }

    setCompiling(true);
    setReport('');
    setSuccessMsg(null);
    setDispatchError(null);

    try {
      // Prompt Gemma on backend using the general health summarize route (or general completions via chat)
      const prompt = `
        You are a highly professional medical scribe.
        Compile a clear, patient-friendly "Aura Clinical Checkup Report" from the following spoken consultation notes:
        "${transcript}"
        
        Write a beautifully formatted summary outlining:
        1. DECLARED SYMPTOMS & HEALTH CONCERNS
        2. CLINICAL OBSERVATIONS
        3. RECOMMENDED WELLNESS PROTOCOL (Diet, exercise, micro-breaks)
        
        Format the summary using clear dividers, capital headings, and concise statements so it can be easily read as a single text message. Ensure maximum word count is under 150 words.
      `;

      const res = await fetch(`${apiBase}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ sender: 'user', text: prompt }],
          patientContext: {
            symptoms: patient?.symptoms || [],
            medicalHistory: patient?.medicalHistory || [],
            name: patient?.name
          }
        })
      });
      const data = await chatResponseHelper(res);
      if (res.ok) {
        setReport(data.response);
        speakText("Health checkup report compiled successfully.");
      } else {
        setDispatchError('Failed to compile report.');
      }
    } catch (e) {
      console.error(e);
      setDispatchError('Connection to AI compiler failed.');
    } finally {
      setCompiling(false);
    }
  };

  const chatResponseHelper = async (res) => {
    return res.json();
  };

  // Trigger Twilio dispatch endpoint
  const sendWhatsAppReport = async (e) => {
    if (e) e.preventDefault();
    if (!report) return;

    setSending(true);
    setSuccessMsg(null);
    setDispatchError(null);

    // Filtered body
    const now = new Date().toLocaleString();
    const suggestedDoctor = patient?.recommendedDoctor || 'Dr. Jane Doe';
    const msgBody = `*Aura AI Health Checkup Report*\nDate: ${now}\nSuggested Doctor: ${suggestedDoctor}\nFor: ${patient?.name || 'Jane Doe'}\n\n${report}\n\n_Notice: observational report only. Consult a doctor for clinical guidance._`;

    try {
      const res = await fetch(`${apiBase}/api/ai/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: msgBody,
          to: whatsappTo,
          customSid: customSid.trim() || undefined,
          customToken: customToken.trim() || undefined,
          customFrom: customFrom.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(`Report successfully dispatched to WhatsApp! Twilio SID: ${data.messageId}`);
        speakText("Report sent successfully.");
      } else {
        setDispatchError(data.error || 'WhatsApp transmission failed.');
      }
    } catch (err) {
      console.error(err);
      setDispatchError('Twilio gateway dispatch unreachable.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '4fr 3fr', gap: '30px', padding: '0 20px 40px 20px', height: 'calc(100vh - 120px)' }}>
      
      {/* LEFT COLUMN: VOICE SCRIBE & COMPILING */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', overflowY: 'auto' }}>
        
        {/* Voice Recorder Card */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Mic size={22} color="var(--primary-cyan)" />
            Voice Health checkup Scribe
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Start recording and state your symptoms, pain indices, or active complaints verbally. Browser Speech recognition will capture it in real-time.
          </p>

          {/* Recorder HUD */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 15px', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid var(--border-muted)', gap: '20px' }}>
            
            {recording && (
              <div className="wave-container" style={{ height: '30px', gap: '5px' }}>
                <div className="wave-bar" style={{ width: '4px', height: '24px' }} />
                <div className="wave-bar" style={{ width: '4px', height: '14px' }} />
                <div className="wave-bar" style={{ width: '4px', height: '32px' }} />
                <div className="wave-bar" style={{ width: '4px', height: '20px' }} />
                <div className="wave-bar" style={{ width: '4px', height: '10px' }} />
              </div>
            )}

            <button
              onClick={toggleRecording}
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: recording ? 'var(--danger)' : 'var(--gradient-neon)',
                border: 'none',
                color: '#060813',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: recording ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 0 15px rgba(0, 242, 254, 0.3)',
                transition: 'all 0.25s ease'
              }}
            >
              {recording ? <MicOff size={28} color="#fff" /> : <Mic size={28} color="#060813" />}
            </button>

            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {recording ? 'Scribing active… Speak your notes.' : 'Click to start voice recording'}
            </span>
          </div>

          {/* Transcript display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scribed Transcript</label>
            <textarea
              className="form-input"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Your transcribed dialogue will generate here…"
              style={{ minHeight: '120px', resize: 'vertical', fontSize: '0.9rem', lineHeight: 1.5, padding: '12px' }}
            />
          </div>

          <button 
            className="neon-btn glow-active"
            onClick={generateCheckupReport}
            disabled={compiling || !transcript.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            {compiling ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Compiling Professional Medical Checkup Report...
              </>
            ) : (
              <>
                <FileText size={16} />
                Generate Clinical Summary Report
              </>
            )}
          </button>
        </div>

        {/* Compiled Report Preview */}
        {report && (
          <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-cyan)' }}>
              <FileCheck size={20} />
              Aura Health Checkup Summary Report
            </h3>
            
            <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px', whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: 1.6, textAlign: 'justify', borderLeft: '4px solid var(--primary-cyan)' }}>
              {report}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: TWILIO DISPATCH CONFIG */}
      <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Smartphone size={20} color="var(--primary-purple)" />
          WhatsApp Dispatch Center
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Specify your WhatsApp recipient number and optional Twilio credentials. The clinical summary report will be dispatched instantly.
        </p>

        {successMsg && (
          <div className="badge-success" style={{ padding: '12px', borderRadius: '8px', lineHeight: 1.4, fontSize: '0.8rem', textTransform: 'none', whiteSpace: 'normal', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {dispatchError && (
          <div className="badge-danger" style={{ padding: '12px', borderRadius: '8px', lineHeight: 1.4, fontSize: '0.8rem', textTransform: 'none', whiteSpace: 'normal', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <ShieldAlert size={16} />
            <span>{dispatchError}</span>
          </div>
        )}

        <form onSubmit={sendWhatsAppReport} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>WhatsApp Recipient Phone</label>
            <input 
              type="text" 
              placeholder="+1234567890 (with country code)" 
              value={whatsappTo}
              onChange={(e) => setWhatsappTo(e.target.value)}
              className="form-input"
              required 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderTop: '1px solid var(--border-muted)', paddingTop: '15px', marginTop: '5px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary-purple)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} />
              CUSTOM TWILIO API CREDENTIALS (OPTIONAL)
            </span>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-dark)' }}>
              Leave blank to fallback to default backend environment configurations if available.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Twilio Account SID</label>
              <input 
                type="text" 
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx" 
                value={customSid}
                onChange={(e) => setCustomSid(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Twilio Auth Token</label>
              <input 
                type="password" 
                placeholder="••••••••••••••••••••••••••••" 
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Twilio From WhatsApp Phone</label>
              <input 
                type="text" 
                placeholder="+14155238886 (sandbox default)" 
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="neon-btn" 
            disabled={sending || !report}
            style={{ 
              justifyContent: 'center', 
              marginTop: '10px', 
              background: 'var(--gradient-aurora)', 
              color: '#fff',
              boxShadow: '0 0 15px rgba(127, 0, 255, 0.4)'
            }}
          >
            {sending ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Dispatching WhatsApp report via Twilio...
              </>
            ) : (
              <>
                <Send size={16} />
                Send via Twilio WhatsApp
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
