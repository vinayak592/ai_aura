// App.jsx - Master Application Controller, Auth forms, and Biometric Registration Wizards
// Updated imports with React Router
import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Shield, ShieldAlert, Lock, KeyRound, User, Eye, Sparkles, RefreshCw } from 'lucide-react';
import Navbar from './components/Navbar';
import AuthForm from './components/AuthForm'; // new component

import DashboardHome from './components/DashboardHome';
import DoctorDashboard from './components/DoctorDashboard'; // placeholder
import CameraOverlay from './components/CameraOverlay';
import ImageAnalysis from './components/ImageAnalysis';
import VideoConsultation from './components/VideoConsultation';
import HealthInsights from './components/HealthInsights';
import VoiceAssistant from './components/VoiceAssistant';
import { loadFaceApiModels, analyzeFaceTelemetry } from './utils/faceAnalyzer';
import CompanionChat from './components/CompanionChat';
import WhatsAppScribe from './components/WhatsAppScribe';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5003'; // backend development port

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [patient, setPatient] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [role, setRole] = useState(localStorage.getItem('role') || 'patient');
  const [specialty, setSpecialty] = useState(''); // doctor specialty
  const [phone, setPhone] = useState(''); // doctor phone
  
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');  
  // Model loading
  const [modelsLoaded, setModelsLoaded] = useState(false);
  
  // Verification states
  const [faceVerified, setFaceVerified] = useState(false);
  const [showRegisterWizard, setShowRegisterWizard] = useState(false);
  const [showFaceLogin, setShowFaceLogin] = useState(false);
  
  // Face Registration/Login Camera refs
  const wizardVideoRef = useRef(null);
  const faceLoginVideoRef = useRef(null);
  const [camLoading, setCamLoading] = useState(false);
  const [wizardCamStream, setWizardCamStream] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [loginCamStream, setLoginCamStream] = useState(null);
  const [biometricStatus, setBiometricStatus] = useState(null); // 'scanning', 'success', 'error'

  // Search/Booking parameters sync with Voice Assistant
  const [doctorFilter, setDoctorFilter] = useState('');
  const [targetBookingDoc, setTargetBookingDoc] = useState('');

  // 1. BOOTSTRAP: LOAD NEURAL NETWORKS
  useEffect(() => {
    const fetchModels = async () => {
      const loaded = await loadFaceApiModels();
      setModelsLoaded(loaded);
    };
    fetchModels();
  }, []);

  // 2. RETRIEVE LOGGED PATIENT
  useEffect(() => {
    if (!token) return;

    const storedRole = localStorage.getItem('role');
    const storedUser = localStorage.getItem('user');

    if (storedRole === 'doctor') {
      if (storedUser) {
        setPatient(JSON.parse(storedUser));
      }
      return;
    }

    if (storedRole === 'patient') {
      if (storedUser) {
        setPatient(JSON.parse(storedUser));
      }
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        fetchPatientData(payload.id);
      } catch (err) {
        console.error('Token parse failed', err);
        handleLogout();
      }
    }
  }, [token]);

  const fetchPatientData = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/patients/${id}`);
      const data = await res.json();
      if (res.ok) {
        setPatient(data);
        setFaceVerified(false); // reset verification status on new login
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error(e);
      // Fallback local mock retrieval in disconnected environments
      setPatient({
        id: 'mock_patient_123',
        name: 'Jane Doe',
        email: 'jane@example.com',
        age: 28,
        gender: 'Female',
        symptoms: ['Dry Eyes', 'Headache'],
        medicalHistory: ['Allergies'],
        hasFaceBaseline: false
      });
    }
  };

  // 3. AUTHENTICATION HANDLERS
  const handleLogin = async (email, password) => {
    setLoginError(null);
    try {
      const res = await fetch(`${API_BASE}/api/unifiedAuth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        // patient or doctor payload can be stored generically
        setPatient(data.patient || data.doctor);
      } else {
        setLoginError(data.error || 'Login failed.');
      }
    } catch (e) {
      setLoginError('Server unreachable. Running in offline demo mode.');
    }
  };

  const handleRegister = async (name, email, password, age, gender) => {
  setLoginError(null);
  try {
    const res = await fetch(`${API_BASE}/api/unifiedAuth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, age, gender, role, specialty, phone })
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
    } else {
      setLoginError(data.error || 'Registration failed.');
    }
  } catch (e) {
    setLoginError('Unable to reach registration service.');
  }
};

  const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('user');
  setToken(null);
  setPatient(null);
  setFaceVerified(false);
  setActiveTab('dashboard');
};

  // 4. ONE-CLICK DEMO SHORTCUT
  const handleOneClickDemo = async () => {
    // Seed Jane Doe credentials are email: 'jane@example.com', password: 'password123'
    await handleLogin('jane@example.com', 'password123');
  };

  // 5. BIOMETRIC REGISTRATION WIZARD
  const startWizardCamera = async () => {
    setCamLoading(true);
    setBiometricStatus('scanning');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      wizardVideoRef.current.srcObject = stream;
      setWizardCamStream(stream);
      setCamLoading(false);
      
      // Automatic scan capture delayed by 2 seconds to let them center
      setTimeout(async () => {
        await captureFacialBaseline(stream);
      }, 2500);

    } catch (err) {
      console.error(err);
      setBiometricStatus('error');
      setCamLoading(false);
    }
  };

  const captureFacialBaseline = async (activeStream) => {
    if (!wizardVideoRef.current) return;
    try {
      const result = await analyzeFaceTelemetry(wizardVideoRef.current);
      if (result && result.present && result.descriptor) {
        // Post descriptor array to database
        const res = await fetch(`${API_BASE}/api/auth/register-face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: patient.id,
            descriptor: result.descriptor
          })
        });
        
        if (res.ok) {
          setBiometricStatus('success');
          setFaceVerified(true);
          setPatient({ ...patient, hasFaceBaseline: true });
          
          // Verbal feedback
          if ('speechSynthesis' in window) {
            window.speechSynthesis.speak(new SpeechSynthesisUtterance('Biometric signature registered successfully. Face verification complete.'));
          }

          setTimeout(() => {
            closeWizard();
          }, 2000);
        } else {
          setBiometricStatus('error');
        }
      } else {
        setBiometricStatus('error');
      }
    } catch (e) {
      console.error(e);
      setBiometricStatus('error');
    }
  };

  const closeWizard = () => {
    if (wizardCamStream) {
      wizardCamStream.getTracks().forEach(t => t.stop());
    }
    setWizardCamStream(null);
    setShowRegisterWizard(false);
    setBiometricStatus(null);
  };

  // 6. BIOMETRIC FACE LOGIN SCANNER
  const startFaceLoginCamera = async () => {
    setCamLoading(true);
    setBiometricStatus('scanning');
    setLoginError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      faceLoginVideoRef.current.srcObject = stream;
      setLoginCamStream(stream);
      setCamLoading(false);
      
      // Delay scan
      setTimeout(async () => {
        await executeFaceLoginMatch(stream);
      }, 2500);
    } catch (e) {
      console.error(e);
      setBiometricStatus('error');
      setCamLoading(false);
    }
  };

  const executeFaceLoginMatch = async (activeStream) => {
    if (!faceLoginVideoRef.current) return;
    try {
      const result = await analyzeFaceTelemetry(faceLoginVideoRef.current);
      if (result && result.present && result.descriptor) {
        // Send to verify endpoint with hardcoded seed id for demo
        const res = await fetch(`${API_BASE}/api/auth/verify-face`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: 'mock_patient_123', // Demo seed patient
            descriptor: result.descriptor
          })
        });
        const data = await res.json();
        
        if (data.verified) {
          setBiometricStatus('success');
          // Automatically log in using seed token
          const seedRes = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'jane@example.com', password: 'password123' })
          });
          const seedData = await seedRes.json();
          if (seedRes.ok) {
            localStorage.setItem('token', seedData.token);
            setToken(seedData.token);
            setFaceVerified(true);
            
            // Speak confirmation
            if ('speechSynthesis' in window) {
              window.speechSynthesis.speak(new SpeechSynthesisUtterance('Identity verified. Welcome back, Jane Doe.'));
            }

            setTimeout(() => {
              closeFaceLogin();
            }, 1500);
          }
        } else {
          setBiometricStatus('error');
          setLoginError('Biometric signature mismatch. Face does not match registered baseline.');
        }
      } else {
        setBiometricStatus('error');
        setLoginError('Biometric scanner failed. Center your face in the viewport.');
      }
    } catch (err) {
      console.error(err);
      setBiometricStatus('error');
    }
  };

  const closeFaceLogin = () => {
    if (loginCamStream) {
      loginCamStream.getTracks().forEach(t => t.stop());
    }
    setLoginCamStream(null);
    setShowFaceLogin(false);
    setBiometricStatus(null);
  };

    const renderAuthForms = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');

    const onSubmit = (e) => {
      e.preventDefault();
      if (isRegister) {
        handleRegister(name, email, password, age, gender);
      } else {
        handleLogin(email, password);
      }
    };


    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 10% 20%, #060813 0%, #0d1127 100%)',
        padding: '20px'
      }}>
        
        {/* Glow halo background layer */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, transparent 60%)',
          filter: 'blur(40px)',
          zIndex: 0
        }} />

        <div className="glass-panel" style={{
          width: '100%',
          maxWidth: '460px',
          padding: '40px',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '25px',
          position: 'relative'
        }}>
          
          {/* Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'var(--gradient-neon)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 242, 254, 0.4)'
            }}>
              <Shield size={28} color="#060813" />
            </div>
            <h1 className="glow-text" style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'Outfit', background: 'var(--gradient-neon)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginTop: '10px' }}>
              Aura AI Health
            </h1>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Telerehabilitation & Telemedicine Workspace</span>
          </div>

          {loginError && (
            <div className="badge-danger" style={{ padding: '12px', borderRadius: '8px', fontSize: '0.8rem', lineHeight: 1.4, textTransform: 'none', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <ShieldAlert size={16} />
              <span>{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>I am a</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value)} style={{ paddingLeft: '38px' }}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
              </select>
            </div>

            {isRegister && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input type="text" placeholder="Jane Doe" className="form-input" value={name} onChange={e => setName(e.target.value)} required style={{ paddingLeft: '38px' }} />
                  <User size={16} color="var(--text-dark)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <input type="email" placeholder="jane@example.com" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required style={{ paddingLeft: '38px' }} />
                <User size={16} color="var(--text-dark)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type="password" placeholder="••••••••" className="form-input" value={password} onChange={e => setPassword(e.target.value)} required style={{ paddingLeft: '38px' }} />
                <KeyRound size={16} color="var(--text-dark)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-70%)' }} />
              </div>
            </div>

            {isRegister && role === 'doctor' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Specialty</label>
                  <input type="text" placeholder="Cardiology" className="form-input" value={specialty} onChange={e => setSpecialty(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Phone</label>
                  <input type="text" placeholder="+15551234567" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} />
                </div>
              </div>
            )}

            {isRegister && role === 'patient' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Age</label>
                  <input type="number" placeholder="28" className="form-input" value={age} onChange={e => setAge(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gender</label>
                  <select className="form-input" value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">Choose...</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            )}

            <button type="submit" className="neon-btn glow-active" style={{ justifyContent: 'center', marginTop: '10px', padding: '12px' }}>
              <Lock size={16} />
              {isRegister ? (role === 'doctor' ? 'Create Doctor Account' : 'Create Patient Account') : 'Secure Login'}
            </button>
          </form>

          {/* Biometric Facelogin Trigger */}
          {!isRegister && (
            <button 
              className="outline-btn"
              onClick={() => { setShowFaceLogin(true); startFaceLoginCamera(); }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
            >
              <Eye size={18} color="var(--primary-cyan)" />
              Sign In with Biometric Face Scan
            </button>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-muted)', paddingTop: '20px' }}>
            {/* One click demo bypass */}
            <button 
              className="neon-btn"
              onClick={handleOneClickDemo}
              style={{
                background: 'var(--gradient-aurora)',
                color: '#fff',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(127, 0, 255, 0.4)',
                padding: '12px'
              }}
            >
              <Sparkles size={16} />
              One-Click Quick Preview (Seeded Account)
            </button>

            <button 
              onClick={() => { setIsRegister(!isRegister); setLoginError(null); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'center' }}
            >
              {isRegister ? 'Already have an account? Sign in' : 'New user? Register your profile'}
            </button>
          </div>

        </div>

        {/* Biometric Gaze Face Match Modal Overlay */}
        {showFaceLogin && (
          <div style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(6, 8, 19, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="glass-panel" style={{ width: '420px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="var(--primary-cyan)" />
                Biometric Identity Scanner
              </h3>
              
              <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid ' + (biometricStatus === 'success' ? 'var(--success)' : biometricStatus === 'error' ? 'var(--danger)' : 'var(--primary-cyan)'),
                boxShadow: biometricStatus === 'success' ? '0 0 25px var(--success)' : biometricStatus === 'error' ? '0 0 25px var(--danger)' : '0 0 20px rgba(0,242,254,0.3)',
                background: '#000',
                position: 'relative'
              }}>
                <video ref={faceLoginVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                {camLoading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }}><RefreshCw className="animate-spin" /></div>}
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {biometricStatus === 'scanning' ? 'Aligning face. Scanning facial signature...' :
                   biometricStatus === 'success' ? 'Biometrics matched! Logging in...' :
                   biometricStatus === 'error' ? 'Verification mismatch.' : 'Initializing scanner...'}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Please look straight into the camera lens.</p>
              </div>

              <button className="outline-btn" onClick={closeFaceLogin} style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                Cancel Scanner
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  // Render Patient Main panel
  const renderDashboardPanels = () => {
    // If we have a token but patient data hasn't loaded yet, show a loading state
    if (!patient) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 10% 20%, #060813 0%, #0d1127 100%)',
          color: '#fff',
          fontSize: '1.2rem'
        }}>
          Loading your health profile…
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>


        {/* Master panels switcher */}
        <main style={{ flex: 1 }}>
          {activeTab === 'dashboard' && (
            role === 'doctor' ? (
              <DoctorDashboard doctor={patient} />
            ) : (
              <DashboardHome 
                patient={patient} 
                setPatient={setPatient} 
                apiBase={API_BASE}
              />
            )
          )}

          {activeTab === 'vision' && (
            <CameraOverlay 
              patient={patient} 
              apiBase={API_BASE}
              onTelemetryLogged={() => fetchPatientData(patient.id)}
            />
          )}

          {activeTab === 'image' && (
            <ImageAnalysis 
              apiBase={API_BASE}
            />
          )}

            {activeTab === 'consultation' && (
                <VideoConsultation 
                  patient={patient} 
                  apiBase={API_BASE}
                  onConsultationSaved={() => fetchPatientData(patient.id)}
                />
            )}

            {activeTab === 'insights' && (
                <HealthInsights 
                  patient={patient} 
                  apiBase={API_BASE}
                />
            )}

            {activeTab === 'companion' && (
                <CompanionChat 
                  patient={patient} 
                  apiBase={API_BASE}
                />
            )}

            {activeTab === 'scribe' && (
                <WhatsAppScribe 
                  patient={patient} 
                  apiBase={API_BASE}
                />
            )}
        </main>

        {/* Floating Voice Assistant Badge */}
        <VoiceAssistant 
          patient={patient} 
          apiBase={API_BASE}
          setActiveTab={setActiveTab}
          onDoctorSearch={(spec) => {
            // Can sync doctor search inside Dashboard component
            const searchInput = document.querySelector('input[placeholder="Search specialty/name..."]');
            if (searchInput) {
              searchInput.value = spec;
              // Trigger a react event if needed, but manual selector handles filter
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }}
          onAppointmentBooked={(docName) => {
            // Can select option inside Booking component
            const selectEl = document.querySelector('select');
            if (selectEl && docName) {
              // Find matching doctor in options
              for (let opt of selectEl.options) {
                if (opt.text.includes(docName)) {
                  selectEl.value = opt.value;
                  selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                  break;
                }
              }
            }
          }}
        />

        {/* Biometric Registry Wizard Modal Overlay */}
        {showRegisterWizard && (
          <div style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(6, 8, 19, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="glass-panel" style={{ width: '420px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--primary-cyan)" />
                Register Biometric Signature
              </h3>
              
              <div style={{
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid ' + (biometricStatus === 'success' ? 'var(--success)' : biometricStatus === 'error' ? 'var(--danger)' : 'var(--primary-cyan)'),
                boxShadow: biometricStatus === 'success' ? '0 0 25px var(--success)' : biometricStatus === 'error' ? '0 0 25px var(--danger)' : '0 0 20px rgba(0,242,254,0.3)',
                background: '#000',
                position: 'relative'
              }}>
                <video ref={wizardVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                {camLoading && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff' }}><RefreshCw className="animate-spin" /></div>}
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                  {biometricStatus === 'scanning' ? 'Centering facial baseline. Scanning...' :
                   biometricStatus === 'success' ? 'Biometrics registered! Profile secure.' :
                   biometricStatus === 'error' ? 'Scan failed. Keep steady and center your head.' : 'Initializing scanner...'}
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>Scanning captures 128 nodal landmarks to formulate signature values.</p>
              </div>

              <button className="outline-btn" onClick={closeWizard} style={{ width: '100%', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                Cancel Scanner
              </button>
            </div>
          </div>
        )}

      </div>
    );
  };

  // Callback for AuthForm successful login/register
  const handleAuthSuccess = ({ token: newToken, user, role: userRole }) => {
    // Store token, role and user profile for session restore
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', userRole);
    localStorage.setItem('user', JSON.stringify(user));
    setToken(newToken);
    setRole(userRole);
    setPatient(user);
  };

  // Layout component that includes Navbar and dashboard panels
  const DashboardLayout = () => renderDashboardPanels();

  return (
    <Router>
      {token && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          patient={patient}
          onLogout={handleLogout}
          onTriggerVerification={() => { setShowRegisterWizard(true); startWizardCamera(); }}
          faceVerified={faceVerified}
        />
      )}
        <Routes>
          <Route path="/auth" element={<AuthForm onAuthSuccess={handleAuthSuccess} />} />
          <Route
            path="/dashboard"
            element={
              token ? (
                role === 'doctor' ? (
                  <DoctorDashboard doctor={patient} />
                ) : (
                  <DashboardLayout />
                )
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to={token ? '/dashboard' : '/auth'} replace />} />
        </Routes>
    </Router>
  );
}
