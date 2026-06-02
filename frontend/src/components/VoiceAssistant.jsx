// VoiceAssistant.jsx - Futuristic floating AI voice badge with audio waves and text-to-speech synthesis
import React, { useRef, useState, useEffect } from 'react';
import { Mic, MicOff, X, RefreshCw, Sparkles } from 'lucide-react';
import { speakText, parseVoiceCommand } from '../utils/voiceCommands';

export default function VoiceAssistant({ patient, apiBase, setActiveTab, onDoctorSearch, onAppointmentBooked }) {
  const recognitionRef = useRef(null);
  
  // States
  const [listening, setListening] = useState(false);
  const [speechBubble, setSpeechBubble] = useState(null); // { text, sender }
  const [processing, setProcessing] = useState(false);
  const [bubbleTimer, setBubbleTimer] = useState(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('⚠️ Web Speech Recognition is not supported on this browser.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setListening(true);
      showTemporaryBubble('Listening... Tell me a command.', 'assistant', 5000);
    };

    rec.onresult = async (e) => {
      const transcript = e.results[0][0].transcript;
      showTemporaryBubble(transcript, 'user', 6000);
      
      // Stop listening first to process command
      setListening(false);
      
      // Execute command router
      await handleVoiceActions(transcript);
    };

    rec.onerror = (err) => {
      console.error('Speech recognition error:', err);
      setListening(false);
      if (err.error === 'not-allowed') {
        showTemporaryBubble('Microphone access blocked. Enable permissions to speak.', 'assistant', 4000);
      }
    };

    rec.onend = () => {
      setListening(false);
    };

    recognitionRef.current = rec;

    // Natural greeting synthesis on load
    setTimeout(() => {
      speakText(`Hello ${patient?.name || 'Jane'}! I am Aura, your clinical voice assistant. Click my badge to speak commands, book appointments, or ask health questions.`);
      showTemporaryBubble(`Hello ${patient?.name || 'Jane'}! I am Aura, your clinical voice assistant. How can I help you today?`, 'assistant', 8000);
    }, 1500);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.name]);

  // Bubble manager
  function showTemporaryBubble(text, sender, duration = 6000) {
  if (bubbleTimer) clearTimeout(bubbleTimer);
  setSpeechBubble({ text, sender });
  const timer = setTimeout(() => {
    setSpeechBubble(null);
  }, duration);
  setBubbleTimer(timer);
}

  // 1. CHAT ACTION TRIGGERS & AI ROUTING
  async function handleVoiceActions(transcript) {
  setProcessing(true);

  // Core callback functions triggered by voice matches
  const actions = {
    navigate: (tabPath) => {
      // map url paths to navigation tabs
      let tab = tabPath.replace('/', '');
      if (tab === 'image-analysis') tab = 'image';
      setActiveTab(tab);
    },
    readPrescription: () => {
      const rx = `${patient?.name || 'Jane Doe'}, your current active prescription details are: Systane Ultra Lubricant eye drops. Apply one drop to both eyes three times daily as needed.Ergonomic instructions: Maintain screen distance at twenty-four inches, and ensure a five minute break every hour.`;
      speakText(rx);
      showTemporaryBubble(rx, 'assistant', 12000);
    },
    searchDoctor: (specialty) => {
      setActiveTab('dashboard');
      if (onDoctorSearch) onDoctorSearch(specialty);
    },
    bookAppointment: (doctorSearchName) => {
      setActiveTab('dashboard');
      if (onAppointmentBooked) onAppointmentBooked(doctorSearchName);
    },
    askAI: async (query) => {
      // Forward question to Gemini Voice Q&A endpoint
      try {
        const res = await fetch(`${apiBase}/api/voice/ask-health`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: query })
        });
        const data = await res.json();
        if (res.ok) {
          showTemporaryBubble(data.answer, 'assistant', 10000);
          speakText(data.answer);
        } else {
          showTemporaryBubble("I experienced an issue fetching that health answer.", 'assistant', 4000);
        }
      } catch (e) {
        console.error(e);
        showTemporaryBubble("Connection lost. Unable to consult my medical knowledge base.", 'assistant', 4000);
      }
    }
  };

  const response = parseVoiceCommand(transcript, actions);

  if (response.matched) {
    if (response.action !== 'ask-ai' && response.action !== 'read-prescription') {
      showTemporaryBubble(response.feedback, 'assistant', 5000);
      speakText(response.feedback);
    }
  } else {
    showTemporaryBubble(response.feedback, 'assistant', 6000);
    speakText(response.feedback);
  }

  setProcessing(false);
}
  // Toggle voice recognition
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition is unsupported on this browser. Chrome or Edge is highly recommended.');
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
    } else {
      window.speechSynthesis.cancel(); // Stop talking if currently speaking
      recognitionRef.current.start();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-end',
      gap: '15px'
    }}>
      
      {/* 1. FLOATING CHAT SPEECH BUBBLE */}
      {speechBubble && (
        <div className="glass-panel" style={{
          padding: '12px 18px',
          borderRadius: speechBubble.sender === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
          maxWidth: '300px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          border: '1px solid ' + (speechBubble.sender === 'user' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(155, 81, 224, 0.2)'),
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          background: speechBubble.sender === 'user' ? 'rgba(6, 8, 19, 0.9)' : 'rgba(13, 17, 39, 0.95)',
          alignSelf: 'center',
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              {speechBubble.sender === 'assistant' && <Sparkles size={10} color="var(--primary-purple)" />}
              {speechBubble.sender === 'user' ? 'You Spoke' : 'Aura Voice'}
            </span>
            <X size={10} style={{ cursor: 'pointer' }} onClick={() => setSpeechBubble(null)} />
          </div>
          <p style={{ fontSize: '0.85rem', lineHeight: 1.4, color: speechBubble.sender === 'user' ? '#fff' : 'var(--text-main)' }}>
            {speechBubble.text}
          </p>
        </div>
      )}

      {/* 2. GLOWING CIRCULAR MIC BADGE */}
      <div style={{ position: 'relative' }}>
        
        {/* Glowing aura halo */}
        {listening && (
          <div style={{
            position: 'absolute',
            left: '-10px',
            top: '-10px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 242, 254, 0.4) 0%, transparent 70%)',
            animation: 'ping 1.5s infinite ease-in-out'
          }} />
        )}

        <button 
          onClick={toggleListening}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: listening ? 'var(--danger)' : 'var(--gradient-neon)',
            border: 'none',
            color: '#060813',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: listening ? '0 0 25px rgba(239, 68, 68, 0.6)' : '0 0 20px rgba(0, 242, 254, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
            zIndex: 10
          }}
          className={listening ? '' : 'glow-active'}
          title="Click to speak with Aura AI"
        >
          {processing ? (
            <RefreshCw size={24} className="animate-spin" color="#060813" />
          ) : listening ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <MicOff size={22} color="#fff" />
              <div className="wave-container" style={{ height: '8px' }}>
                <div className="wave-bar" style={{ background: '#fff', width: '2px' }} />
                <div className="wave-bar" style={{ background: '#fff', width: '2px' }} />
                <div className="wave-bar" style={{ background: '#fff', width: '2px' }} />
              </div>
            </div>
          ) : (
            <Mic size={24} color="#060813" />
          )}
        </button>
      </div>

    </div>
  );
}
