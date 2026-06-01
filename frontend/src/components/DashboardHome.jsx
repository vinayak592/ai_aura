// DashboardHome.jsx - Main Dashboard Hub with patient stats, symptom logs, and bookings
import React, { useState, useEffect } from 'react';
import { Heart, Activity, Calendar, ShieldAlert, Plus, X, Search, Clock, Award } from 'lucide-react';

export default function DashboardHome({ patient, setPatient, apiBase }) {
  const [symptomInput, setSymptomInput] = useState('');
  const [historyInput, setHistoryInput] = useState('');
  
  // Appointment and doctor states
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch doctors and appointments on mount
  useEffect(() => {
    // Doctors
    fetch(`${apiBase}/api/voice/doctors`)
      .then(res => res.json())
      .then(data => setDoctors(data))
      .catch(err => console.error('Error fetching doctors:', err));
    // Appointments for patient
    if (patient?.id) {
      fetch(`${apiBase}/api/voice/appointments/patient/${patient.id}`)
        .then(res => res.json())
        .then(data => setAppointments(data))
        .catch(err => console.error('Error fetching appointments:', err));
    }
  }, [apiBase, patient?.id]);

  // Symptom Add/Remove
  const addSymptom = async () => {
    if (!symptomInput.trim()) return;
    const newSymptoms = [...(patient.symptoms || []), symptomInput.trim()];
    try {
      const res = await fetch(`${apiBase}/api/patients/${patient.id}/symptoms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: newSymptoms })
      });
      const data = await res.json();
      if (data.success) {
        setPatient({ ...patient, symptoms: newSymptoms });
        setSymptomInput('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeSymptom = async (index) => {
    const newSymptoms = (patient.symptoms || []).filter((_, i) => i !== index);
    try {
      const res = await fetch(`${apiBase}/api/patients/${patient.id}/symptoms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms: newSymptoms })
      });
      const data = await res.json();
      if (data.success) {
        setPatient({ ...patient, symptoms: newSymptoms });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Medical History Add/Remove
  const addHistory = async () => {
    if (!historyInput.trim()) return;
    const newHistory = [...(patient.medicalHistory || []), historyInput.trim()];
    try {
      const res = await fetch(`${apiBase}/api/patients/${patient.id}/medical`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalHistory: newHistory })
      });
      const data = await res.json();
      if (data.success) {
        setPatient({ ...patient, medicalHistory: newHistory });
        setHistoryInput('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeHistory = async (index) => {
    const newHistory = (patient.medicalHistory || []).filter((_, i) => i !== index);
    try {
      const res = await fetch(`${apiBase}/api/patients/${patient.id}/medical`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicalHistory: newHistory })
      });
      const data = await res.json();
      if (data.success) {
        setPatient({ ...patient, medicalHistory: newHistory });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Appointment Booking
  const handleBooking = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDoctor) return;

    try {
      const currentPatientId = patient.id || patient._id || 'mock_patient_123';
      const res = await fetch(`${apiBase}/api/voice/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorName: selectedDoctor,
          date: bookingDate,
          time: bookingTime,
          patientName: patient.name,
          patientId: currentPatientId
        })
      });
      const data = await res.json();
      if (data.success) {
        setBookingSuccess(data.confirmationText);
        // Reset form
        setBookingDate('');
        setBookingTime('');
        // Add new appointment to list dynamically
        if (data.appointment) {
          setAppointments(prev => {
            const updated = [...prev, data.appointment];
            return updated.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
          });
        }
        // Alert voice response (Web Speech)
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(data.confirmationText);
          window.speechSynthesis.speak(u);
        }
      }
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const filteredDoctors = doctors.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', padding: '0 20px 40px 20px' }}>
      
      {/* 1. WELCOME BANNER & STATS */}
      <div className="glass-panel" style={{
        padding: '35px',
        background: 'linear-gradient(135deg, rgba(13, 17, 39, 0.8) 0%, rgba(22, 28, 62, 0.4) 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'Outfit' }}>
            Hello, <span style={{ background: 'var(--gradient-neon)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{patient.name}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '600px' }}>
            Welcome to your Aura AI workspace. You are verified and set to initiate real-time optical tracking, capture medical imagery, or conduct standard consults.
          </p>
        </div>
        
        {/* Quick Stats Grid */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div className="glass-card" style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '15px', minWidth: '160px' }}>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', borderRadius: '8px' }}>
              <Heart size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Status</span>
              <span style={{ fontSize: '1rem', fontWeight: 700 }}>Stable</span>
            </div>
          </div>
          <div className="glass-card animate-pulse" style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '15px', minWidth: '160px' }}>
            <div style={{ padding: '8px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--primary-cyan)', borderRadius: '8px' }}>
              <Activity size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Symptoms Logged</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{patient.symptoms?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SYMPTOMS & HISTORY EDITORS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Active Symptoms Card */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} color="var(--primary-cyan)" />
            Active Clinical Symptoms
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Log active symptoms to inform AI insights and direct specialist matching.
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Add symptom (e.g. Dry Eyes, Headache)..."
              value={symptomInput}
              onChange={(e) => setSymptomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSymptom()}
              className="form-input"
            />
            <button className="neon-btn" onClick={addSymptom} style={{ padding: '12px' }}>
              <Plus size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '80px', alignContent: 'flex-start', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
            {patient.symptoms?.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>No active symptoms declared.</span>
            ) : (
              patient.symptoms?.map((symptom, idx) => (
                <span 
                  key={idx} 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(0, 242, 254, 0.08)',
                    color: 'var(--primary-cyan)',
                    border: '1px solid rgba(0, 242, 254, 0.2)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                >
                  {symptom}
                  <X 
                    size={14} 
                    onClick={() => removeSymptom(idx)} 
                    style={{ cursor: 'pointer', opacity: 0.7 }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                  />
                </span>
              ))
            )}
          </div>
        </div>

        {/* Chronic History Card */}
        <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={20} color="var(--primary-purple)" />
            Chronic Medical History
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Chronic ailments, allergies, or past procedures helping construct risk profiles.
          </p>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              placeholder="Add history (e.g. Asthma, Allergies)..."
              value={historyInput}
              onChange={(e) => setHistoryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addHistory()}
              className="form-input"
            />
            <button className="neon-btn" onClick={addHistory} style={{ padding: '12px', background: 'var(--primary-purple)', boxShadow: '0 0 15px rgba(155, 81, 224, 0.4)' }}>
              <Plus size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '80px', alignContent: 'flex-start', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-muted)' }}>
            {patient.medicalHistory?.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)' }}>No background medical history declared.</span>
            ) : (
              patient.medicalHistory?.map((history, idx) => (
                <span 
                  key={idx} 
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'rgba(155, 81, 224, 0.08)',
                    color: 'var(--primary-purple)',
                    border: '1px solid rgba(155, 81, 224, 0.2)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 500
                  }}
                >
                  {history}
                  <X 
                    size={14} 
                    onClick={() => removeHistory(idx)} 
                    style={{ cursor: 'pointer', opacity: 0.7 }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                  />
                </span>
              ))
            )}
          </div>
        </div>

      </div>

      {/* 3. DOCTOR DIRECTORY & BOOKING SPLIT */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
          
          {/* Upcoming Appointments Card */}
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '15px', background: 'rgba(0, 242, 254, 0.05)', borderLeft: '4px solid var(--primary-cyan)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-cyan)' }}>Upcoming Appointments</h3>
            {appointments.length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No upcoming appointments.</span>
            ) : (
              appointments.map((appt, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: idx < appointments.length -1 ? '1px solid var(--border-muted)' : 'none' }}>
                  <span>{appt.doctorName} ({appt.date} {appt.time})</span>
                </div>
              ))
            )}
          </div>
          
          {/* Doctors Directory */}
          <div className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Search size={20} color="var(--primary-cyan)" />
              Clinical Specialists Directory
            </h2>
            
            <div style={{ position: 'relative', width: '220px' }}>
              <input
                type="text"
                placeholder="Search specialty/name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ padding: '8px 12px 8px 32px', fontSize: '0.85rem' }}
              />
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            {filteredDoctors.map((doc) => (
              <div 
                key={doc.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  borderLeft: '4px solid var(--primary-cyan)',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setSelectedDoctor(doc.name);
                  // Soft scroll or auto-focus booking form
                  const bookingEl = document.getElementById('booking-portal-title');
                  if (bookingEl) bookingEl.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{doc.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary-cyan)', fontWeight: 500 }}>{doc.specialty}</span>
                  </div>
                  <span className="badge-info" style={{ fontSize: '0.65rem' }}>{doc.room}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <Clock size={12} />
                  <span>Availability: {doc.availability}</span>
                </div>
              </div>
            ))}
            {filteredDoctors.length === 0 && (
              <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '20px', color: 'var(--text-dark)' }}>No matching specialists found.</div>
            )}
          </div>
        </div>

        {/* Quick Booking Portal */}
        <div id="booking-portal" className="glass-panel" style={{ padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 id="booking-portal-title" style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={20} color="var(--primary-cyan)" />
            Schedule Consultation
          </h2>
          
          {bookingSuccess && (
            <div className="badge-success" style={{ padding: '12px', borderRadius: '8px', lineHeight: 1.4, fontSize: '0.8rem', whiteSpace: 'normal', textTransform: 'none' }}>
              {bookingSuccess}
              <button 
                onClick={() => setBookingSuccess(null)}
                style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 'bold', marginLeft: '8px', float: 'right', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select Specialist</label>
              <select 
                className="form-input"
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                required
              >
                <option value="">-- Choose Specialist --</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.name}>{d.name} ({d.specialty})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select Date</label>
              <input 
                type="date" 
                className="form-input"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Select Time</label>
              <input 
                type="time" 
                className="form-input"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                required 
              />
            </div>

            <button type="submit" className="neon-btn" style={{ justifyContent: 'center', marginTop: '10px' }}>
              <Calendar size={18} />
              Book Appointment
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
