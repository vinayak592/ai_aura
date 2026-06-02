// ImageAnalysis.jsx - Multimodal AI Medical Diagnostics (Skin Dermal analysis + Tablet Pill Identification)
import React, { useRef, useState, useEffect } from 'react';
import { FileImage, Camera, Upload, Trash2, ShieldAlert, Award, FileText, CheckCircle2, RefreshCw, Pill, Eye, Info, AlertTriangle } from 'lucide-react';

export default function ImageAnalysis({ apiBase }) {
  const [analysisType, setAnalysisType] = useState('dermal'); // 'dermal' or 'pill'
  const [activeMode, setActiveMode] = useState('upload'); // 'upload' or 'camera'
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Camera capture states
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState(null);

  // Analysis result states
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Drag and Drop State
  const [dragOver, setDragOver] = useState(false);

  // 1. FILE UPLOAD HANDLERS
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCapturedBlob(null);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCapturedBlob(null);
      setResult(null);
      setError(null);
    }
  };

  // 2. WEBCAM SNAP HANDLERS
  const startCamera = async () => {
    setResult(null);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      console.error(err);
      alert('Camera access denied or unavailable. Connecting a laptop webcam is required.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setCameraActive(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    
    // Create temporary canvas to extract snapshot
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    // Mirror horizontally for user convenience
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
      setSelectedFile(null);
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  const clearImage = () => {
    setSelectedFile(null);
    setCapturedBlob(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  // 3. EXECUTE AI ANALYSIS
  const analyzeMedicalImage = async () => {
    if (!selectedFile && !capturedBlob) {
      alert('Please upload an image file or take a webcam snapshot first.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append('image', selectedFile);
    } else if (capturedBlob) {
      formData.append('image', capturedBlob, 'captured_wound.jpg');
    }

    const endpoint = analysisType === 'pill' ? 'identify-pill' : 'analyze-image';

    try {
      const res = await fetch(`${apiBase}/api/ai/${endpoint}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.error || 'Imaging diagnostics analysis failed.');
      }
    } catch (e) {
      console.error(e);
      setError('Connection failure. Unable to reach clinical imaging backend.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Cleanup camera on mode switch or unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [activeMode, analysisType]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '5fr 4fr', gap: '30px', padding: '0 20px 40px 20px' }}>
      
      {/* LEFT COLUMN: UPLOADER OR VIEWPORT Snaps */}
      <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Double-tab header navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-muted)', paddingBottom: '10px', gap: '15px' }}>
          <button
            onClick={() => { setAnalysisType('dermal'); clearImage(); }}
            style={{
              background: 'none',
              border: 'none',
              color: analysisType === 'dermal' ? 'var(--primary-cyan)' : 'var(--text-muted)',
              fontSize: '1.2rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'inherit',
              borderBottom: analysisType === 'dermal' ? '2px solid var(--primary-cyan)' : '2px solid transparent',
              paddingBottom: '8px'
            }}
          >
            <FileImage size={20} />
            Skin Dermal Diagnostics
          </button>
          
          <button
            onClick={() => { setAnalysisType('pill'); clearImage(); }}
            style={{
              background: 'none',
              border: 'none',
              color: analysisType === 'pill' ? 'var(--primary-purple)' : 'var(--text-muted)',
              fontSize: '1.2rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'inherit',
              borderBottom: analysisType === 'pill' ? '2px solid var(--primary-purple)' : '2px solid transparent',
              paddingBottom: '8px'
            }}
          >
            <Pill size={20} />
            AI Tablet & Pill Identification
          </button>
        </div>
        
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
          {analysisType === 'dermal' 
            ? "Capture or upload high-quality medical photos of skin rashes, cuts, wounds, or discoloration. Our Gemini vision model will assess visual margins and yield diagnosis findings."
            : "Snap or upload a photo of a pharmaceutical pill, tablet, capsule, or drug packaging. Our clinical pharmacy intelligence will identify ingredients, dosage, and side-effects."
          }
        </p>

        {/* Mode Selector Toggle */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
          <button 
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: activeMode === 'upload' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeMode === 'upload' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
            onClick={() => { setActiveMode('upload'); clearImage(); }}
          >
            <Upload size={16} />
            File Upload
          </button>
          
          <button 
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: activeMode === 'camera' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeMode === 'camera' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'inherit',
              transition: 'all 0.2s ease'
            }}
            onClick={() => { setActiveMode('camera'); clearImage(); }}
          >
            <Camera size={16} />
            Webcam Capture
          </button>
        </div>

        {/* Upload Mode Frame */}
        {activeMode === 'upload' && !previewUrl && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              width: '100%',
              aspectRatio: '4/3',
              border: dragOver ? '2px dashed var(--primary-cyan)' : '2px dashed var(--border-muted)',
              background: dragOver ? 'rgba(0, 242, 254, 0.03)' : 'rgba(0,0,0,0.15)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '15px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => document.getElementById('file-upload-input').click()}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              <Upload size={24} />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>Drag and drop photo here</span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '4px' }}>Supports JPG, JPEG, PNG up to 5MB</p>
            </div>
            
            <input 
              id="file-upload-input"
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Camera Mode Frame */}
        {activeMode === 'camera' && !previewUrl && (
          <div style={{
            width: '100%',
            aspectRatio: '4/3',
            background: '#04060d',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {!cameraActive ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)'
                }}>
                  <Camera size={24} />
                </div>
                <button className="neon-btn" onClick={startCamera} style={{ background: analysisType === 'pill' ? 'var(--gradient-aurora)' : 'var(--gradient-neon)', color: analysisType === 'pill' ? '#fff' : '#060813' }}>
                  Activate Webcam Lens
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
                <div style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: '10px'
                }}>
                  <button className="neon-btn" onClick={captureSnapshot} style={{ background: '#ef4444', color: '#fff', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}>
                    Freeze & Capture Frame
                  </button>
                  <button className="outline-btn" onClick={stopCamera} style={{ background: 'rgba(0,0,0,0.6)' }}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Selected / Captured Preview Frame */}
        {previewUrl && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{
              width: '100%',
              aspectRatio: '4/3',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border-muted)',
              background: '#04060d',
              position: 'relative'
            }}>
              <img 
                src={previewUrl} 
                alt="Medical Diagnostic Specimen" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              
              <button 
                onClick={clearImage}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '15px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.9)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <button 
              className="neon-btn glow-active"
              onClick={analyzeMedicalImage}
              disabled={analyzing}
              style={{ padding: '14px', width: '100%', justifyContent: 'center', background: analysisType === 'pill' ? 'var(--gradient-aurora)' : 'var(--gradient-neon)', color: analysisType === 'pill' ? '#fff' : '#060813' }}
            >
              {analyzing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Running Gemini Computer Vision Diagnostics...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Initiate AI Clinical Diagnostics
                </>
              )}
            </button>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: AI CLINICAL REPORT */}
      <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color={analysisType === 'pill' ? "var(--primary-purple)" : "var(--primary-cyan)"} />
          Diagnostic Assessment Report
        </h3>

        {/* Loading overlay spinner */}
        {analyzing && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '350px', gap: '20px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(255,255,255,0.05)',
              borderTop: '4px solid ' + (analysisType === 'pill' ? 'var(--primary-purple)' : 'var(--primary-cyan)'),
              borderRadius: '50%',
              animation: 'spin 1s infinite linear'
            }} className="animate-spin" />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '250px' }}>
              Gemini Vision Models are examining specimen contours, coloration parameters, and labels.
            </span>
          </div>
        )}

        {/* Standard Greeting state */}
        {!result && !analyzing && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-dark)', textAlign: 'center', gap: '15px' }}>
            <FileImage size={40} />
            <span>
              {analysisType === 'dermal' 
                ? "Upload or snap a photo of the wound or rash. The AI report will generate here in seconds."
                : "Upload or snap a photo of the tablet/medicine packaging. The AI report will generate here in seconds."
              }
            </span>
          </div>
        )}

        {/* Error Frame */}
        {error && !analyzing && (
          <div className="badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', borderRadius: '8px', lineHeight: 1.4, textTransform: 'none', whiteSpace: 'normal' }}>
            <ShieldAlert size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* DERMAL DIAGNOSTIC RESULT REPORT PANEL */}
        {/* ---------------------------------------------------- */}
        {result && !analyzing && analysisType === 'dermal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Specimen Info Header */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--primary-cyan)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visual Diagnosis Findings</span>
              <span className="glow-text" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-cyan)' }}>
                {result.findings}
              </span>
            </div>

            {/* Confidence Dial */}
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="24" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
                  <circle cx="30" cy="30" r="24" stroke="url(#cyanPurpleGradient)" strokeWidth="4" fill="none" strokeDasharray="151" strokeDashoffset={151 - (151 * result.confidence) / 100} strokeLinecap="round" transform="rotate(-90 30 30)" />
                </svg>
                <span style={{ position: 'absolute', fontSize: '0.95rem', fontWeight: 800 }}>{result.confidence}%</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={16} color="var(--primary-purple)" />
                  Clinical Certainty Rating
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '200px' }}>
                  Probability calculated by visual landmark classification parameters.
                </span>
              </div>
            </div>

            {/* Report Content Panel */}
            <div className="glass-card" style={{ background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border-muted)', paddingBottom: '6px' }}>
                CLINICAL CASE SUMMARY
              </span>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-main)', textAlign: 'justify', whiteSpace: 'pre-line' }}>
                {result.report}
              </p>
            </div>

            {/* Disclaimer */}
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dark)', lineHeight: 1.4, textAlign: 'center', marginTop: '10px' }}>
              ⚠️ NOTICE: AI vision health diagnostics represent an observational tool. Always seek direct consultation with a qualified medical specialist before enacting primary therapies.
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* PILL/TABLET IDENTIFICATION RESULT REPORT PANEL */}
        {/* ---------------------------------------------------- */}
        {result && !analyzing && analysisType === 'pill' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '550px', overflowY: 'auto', paddingRight: '5px' }}>
            
            {/* Pill Header */}
            <div className="glass-card" style={{ borderLeft: '4px solid var(--primary-purple)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>IDENTIFIED PHARMACEUTICAL DRUG</span>
              <span className="glow-text" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-purple)' }}>
                {result.pillName}
              </span>
            </div>

            {/* Description & Class */}
            <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pharmacological Class</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{result.medicalClass || 'Analgesic'}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Ingredients</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{result.activeIngredients || 'N/A'}</span>
              </div>
            </div>

            {/* Visual Description */}
            <div className="glass-card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Info size={18} color="var(--primary-purple)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visual Characteristics</span>
                <span style={{ fontSize: '0.85rem' }}>{result.description}</span>
              </div>
            </div>

            {/* Common Uses */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRIMARY INDICATIONS & USES</span>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{result.commonUses}</p>
            </div>

            {/* Dosage & Side Effects */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STANDARD DOSAGE DIRECTIONS</span>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{result.dosage}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-muted)', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMMON SIDE EFFECTS</span>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.85)' }}>{result.sideEffects}</p>
              </div>
            </div>

            {/* Safety Warnings & Precautions */}
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} />
                CRITICAL WARNINGS & CONTRAINDICATIONS
              </span>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5, color: 'rgba(255, 255, 255, 0.8)' }}>
                {result.warnings}
              </p>
            </div>

            {/* Disclaimer */}
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dark)', lineHeight: 1.4, textAlign: 'center', marginTop: '10px' }}>
              ⚠️ NOTICE: Pill identification is visual. Never consume unverified medications. Always cross-reference with your primary prescribing physician or retail pharmacist.
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
