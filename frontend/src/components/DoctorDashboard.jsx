import React, { useEffect, useState } from 'react';
import { Calendar, Clock, LogOut, Shield, User, Video, RefreshCw, Activity } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || window.location.origin;

function PatientModal({ patient, loading, error, onClose }) {
  if (!patient && !loading) return null;
  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div style={{ textAlign: 'center' }}>Loading patient...</div>
        ) : error ? (
          <div style={{ color: '#ff6b6b' }}>{error}</div>
        ) : (
          <div>
            <h2 style={{ marginTop: 0 }}>{patient.name}</h2>
            <div style={{ color: '#9fbfdc', marginBottom: '8px' }}>{patient.email}</div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div><strong>Age:</strong> {patient.age || '—'}</div>
              <div><strong>Gender:</strong> {patient.gender || '—'}</div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Medical History</strong>
              <ul>
                {(patient.medicalHistory || []).map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
            <div>
              <strong>Recent Symptoms</strong>
              <ul>
                {(patient.symptoms || []).map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
            <div style={{ textAlign: 'right', marginTop: '12px' }}>
              <button onClick={onClose} style={styles.closeBtn}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DoctorDashboard({ doctor }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState(null);

  const fetchAppointments = async () => {
    const doctorId = doctor?.id || doctor?._id;
    if (!doctorId) {
      setFetchError('Doctor ID missing. Please log in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE}/api/voice/appointments/doctor/${doctorId}`);
      const data = await res.json();
      if (res.ok) {
        setAppointments(data);
      } else {
        console.error('Failed to load appointments', data);
        setFetchError(data.error || 'Failed to load appointments.');
      }
    } catch (e) {
      console.error('Error fetching appointments', e);
      setFetchError('Unable to fetch appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAppointments(); }, [doctor]);

  const viewPatient = async (patientId) => {
    setPatientLoading(true);
    setPatientError(null);
    setSelectedPatient(null);
    try {
      const res = await fetch(`${API_BASE}/api/patients/${patientId}`);
      if (!res.ok) throw new Error('Failed to fetch patient');
      const data = await res.json();
      setSelectedPatient(data);
    } catch (e) {
      setPatientError(e.message || 'Error fetching patient');
    } finally {
      setPatientLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  };

  return (
    <div style={styles.container}>
      <div style={styles.glowCyan} />
      <div style={styles.glowPurple} />

      <div style={styles.content}>
        <header style={styles.header}>
          <div style={styles.headerTitleContainer}>
            <div style={styles.logoBadge}><Shield size={24} color="#060813" /></div>
            <div>
              <h1 style={styles.doctorName}>Welcome back, <span style={styles.gradientText}>{doctor?.name || 'Doctor'}</span></h1>
              <p style={styles.specialtyText}>{doctor?.specialty || 'Medical Specialist'} • Clinical Dashboard</p>
            </div>
          </div>
          <div style={styles.actionButtons}>
            <button onClick={fetchAppointments} style={styles.refreshBtn} title="Refresh Appointments"><RefreshCw /></button>
            <button onClick={handleLogout} style={styles.logoutBtn}><LogOut /> Sign Out</button>
          </div>
        </header>

        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIconContainer, background: 'rgba(0, 242, 254, 0.1)', color: 'var(--primary-cyan)'}}><Calendar /></div>
            <div>
              <span style={styles.statLabel}>Total Bookings</span>
              <span style={styles.statValue}>{appointments.length}</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIconContainer, background: 'rgba(16,185,129,0.1)', color: 'var(--success)'}}><Activity /></div>
            <div>
              <span style={styles.statLabel}>Clinic Room</span>
              <span style={styles.statValue}>{doctor?.room || 'Telehealth A'}</span>
            </div>
          </div>
        </section>

        <section style={styles.appointmentsSection}>
          <h2 style={styles.sectionTitle}>Upcoming Patient Consultations</h2>
          {loading ? (
            <div style={styles.loaderContainer}><RefreshCw className="animate-spin" /> <div style={{marginTop:8}}>Synchronizing clinical queue...</div></div>
          ) : fetchError ? (
            <div style={styles.errorState}><Calendar size={48} /><h3>{fetchError}</h3><p>Please refresh the page or log out and back in.</p></div>
          ) : appointments.length === 0 ? (
            <div style={styles.emptyState}><Calendar size={48} /><h3>No Patient Bookings Scheduled</h3></div>
          ) : (
            <div style={styles.queueGrid}>
              {appointments.map(appt => (
                <div key={appt._id || appt.id} style={styles.appointmentCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.patientInfo}>
                      <div style={styles.avatar}><User /></div>
                      <div>
                        <h3 style={styles.patientNameText}>{appt.patientName}</h3>
                        <span style={styles.patientIdBadge}>ID: {appt.patientId}</span>
                      </div>
                    </div>
                    <span style={styles.roomBadge}>{appt.room || 'Telehealth Cabin'}</span>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={{ display:'flex', gap:8 }}>
                      <button style={styles.joinBtn} onClick={() => alert(`Launching consultation with ${appt.patientName}`)}><Video /> Launch Consultation</button>
                      <button style={styles.viewPatientBtn} onClick={() => viewPatient(appt.patientId)}>View Patient</button>
                    </div>
                    <div style={{ marginTop:12 }}>
                      <div style={styles.detailRow}><Calendar size={14} /> <span>Date: <strong>{appt.date}</strong></span></div>
                      <div style={styles.detailRow}><Clock size={14} /> <span>Time: <strong>{appt.time}</strong></span></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      <PatientModal patient={selectedPatient} loading={patientLoading} error={patientError} onClose={() => setSelectedPatient(null)} />
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', background: 'radial-gradient(circle at 10% 20%, #060813 0%, #0d1127 100%)', color:'#fff', position:'relative', padding:'40px 20px' },
  glowCyan: { position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(0,242,254,0.08) 0%, transparent 70%)', filter:'blur(50px)', top:'-10%', left:'10%', zIndex:0 },
  glowPurple: { position:'absolute', width:450, height:450, borderRadius:'50%', background:'radial-gradient(circle, rgba(127,0,255,0.06) 0%, transparent 70%)', filter:'blur(60px)', bottom:'10%', right:'5%', zIndex:0 },
  content: { maxWidth: '1100px', margin:'0 auto', position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap:30 },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, padding:'24px 32px' },
  headerTitleContainer: { display:'flex', alignItems:'center', gap:16 },
  logoBadge: { width:48, height:48, borderRadius:12, background:'var(--gradient-neon)', display:'flex', alignItems:'center', justifyContent:'center' },
  doctorName: { fontSize:'1.6rem', margin:0 },
  gradientText: { background:'var(--gradient-neon)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' },
  specialtyText: { color:'#9fbfdc', marginTop:4 },
  actionButtons: { display:'flex', gap:12, alignItems:'center' },
  refreshBtn: { background:'rgba(255,255,255,0.03)', border:'none', padding:10, borderRadius:10, cursor:'pointer' },
  logoutBtn: { padding:'10px 14px', borderRadius:10, background:'var(--gradient-aurora)', border:'none', color:'#fff', cursor:'pointer' },
  statsGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:20, marginTop:20 },
  statCard: { background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:20, display:'flex', gap:16, alignItems:'center' },
  statIconContainer: { width:42, height:42, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' },
  statLabel: { fontSize:12, color:'#9fbfdc' },
  statValue: { fontSize:18, fontWeight:800 },
  appointmentsSection: { marginTop:24, background:'rgba(255,255,255,0.01)', border:'1px solid rgba(255,255,255,0.04)', borderRadius:12, padding:20 },
  sectionTitle: { fontSize:18, fontWeight:800 },
  loaderContainer: { display:'flex', alignItems:'center', gap:12 },
  emptyState: { padding:40, textAlign:'center' },
  errorState: { padding:40, textAlign:'center', color:'#ffb3b3' },
  queueGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 },
  appointmentCard: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:12 },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center' },
  patientInfo: { display:'flex', gap:12, alignItems:'center' },
  avatar: { width:38, height:38, borderRadius:'50%', background:'rgba(0,242,254,0.08)', display:'flex', alignItems:'center', justifyContent:'center' },
  patientNameText: { margin:0, fontWeight:700 },
  patientIdBadge: { fontSize:12, color:'#9fbfdc' },
  roomBadge: { background:'rgba(0,242,254,0.08)', color:'#8fefff', padding:'4px 8px', borderRadius:6 },
  cardBody: { marginTop:8 },
  detailRow: { display:'flex', gap:8, alignItems:'center', marginTop:6 },
  joinBtn: { background:'var(--gradient-neon)', color:'#060813', border:'none', padding:'10px 12px', borderRadius:8, cursor:'pointer', display:'inline-flex', gap:8, alignItems:'center' },
  viewPatientBtn: { padding:'10px 12px', borderRadius:8, background:'rgba(255,255,255,0.03)', color:'#dff6ff', border:'1px solid rgba(255,255,255,0.04)', cursor:'pointer' },
  // modal styles
  modalBackdrop: { position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000 },
  modal: { width:420, background:'#071027', borderRadius:12, padding:20, color:'#fff', boxShadow:'0 12px 40px rgba(0,0,0,0.6)' },
  closeBtn: { padding:'8px 12px', borderRadius:8, cursor:'pointer' }
};
