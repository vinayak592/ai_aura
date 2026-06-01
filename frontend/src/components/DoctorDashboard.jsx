import React, { useEffect, useState } from 'react';
import { Calendar, Clock, LogOut, Shield, User, Video, RefreshCw, Activity } from 'lucide-react';

export default function DoctorDashboard({ doctor }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5003';

  const fetchAppointments = async () => {
    if (!doctor?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/voice/appointments/doctor/${doctor.id}`);
      const data = await res.json();
      if (res.ok) {
        setAppointments(data);
      } else {
        console.error('Failed to load appointments', data);
      }
    } catch (e) {
      console.error('Error fetching appointments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [doctor]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/auth';
  };

  return (
    <div style={styles.container}>
      {/* Background Glows */}
      <div style={styles.glowCyan} />
      <div style={styles.glowPurple} />

      <div style={styles.content}>
        {/* Header Header Banner */}
        <header style={styles.header}>
          <div style={styles.headerTitleContainer}>
            <div style={styles.logoBadge}>
              <Shield size={24} color="#060813" />
            </div>
            <div>
              <h1 style={styles.doctorName}>
                Welcome back, <span style={styles.gradientText}>{doctor?.name || 'Doctor'}</span>
              </h1>
              <p style={styles.specialtyText}>
                {doctor?.specialty || 'Medical Specialist'} • Clinical Dashboard
              </p>
            </div>
          </div>

          <div style={styles.actionButtons}>
            <button onClick={fetchAppointments} style={styles.refreshBtn} title="Refresh Appointments">
              <RefreshCw size={18} />
            </button>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        {/* Stats Panel */}
        <section style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIconContainer, background: 'rgba(0, 242, 254, 0.1)', color: 'var(--primary-cyan)' }}>
              <Calendar size={20} />
            </div>
            <div>
              <span style={styles.statLabel}>Total Bookings</span>
              <span style={styles.statValue}>{appointments.length}</span>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIconContainer, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
              <Activity size={20} />
            </div>
            <div>
              <span style={styles.statLabel}>Clinic Room</span>
              <span style={styles.statValue}>{doctor?.room || 'Telehealth A'}</span>
            </div>
          </div>
        </section>

        {/* Appointment Queue Section */}
        <section style={styles.appointmentsSection}>
          <h2 style={styles.sectionTitle}>Upcoming Patient Consultations</h2>
          
          {loading ? (
            <div style={styles.loaderContainer}>
              <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary-cyan)' }} />
              <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Synchronizing clinical queue...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div style={styles.emptyState}>
              <Calendar size={48} color="var(--text-dark)" />
              <h3 style={{ marginTop: '15px', color: '#fff', fontSize: '1.2rem' }}>No Patient Bookings Scheduled</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '360px', marginTop: '6px' }}>
                When patients reserve telehealth consultations with you, their detailed logs and schedules will appear in this workspace automatically.
              </p>
            </div>
          ) : (
            <div style={styles.queueGrid}>
              {appointments.map((appt) => (
                <div key={appt._id || appt.id} style={styles.appointmentCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.patientInfo}>
                      <div style={styles.avatar}>
                        <User size={18} color="var(--primary-cyan)" />
                      </div>
                      <div>
                        <h3 style={styles.patientNameText}>{appt.patientName}</h3>
                        <span style={styles.patientIdBadge}>ID: {appt.patientId}</span>
                      </div>
                    </div>
                    <span style={styles.roomBadge}>{appt.room || 'Telehealth Cabin'}</span>
                  </div>

                  <div style={styles.cardBody}>
                    <div style={styles.detailRow}>
                      <Calendar size={14} color="var(--text-muted)" />
                      <span>Date: <strong>{appt.date}</strong></span>
                    </div>
                    <div style={styles.detailRow}>
                      <Clock size={14} color="var(--text-muted)" />
                      <span>Scheduled Time: <strong>{appt.time}</strong></span>
                    </div>
                  </div>

                  <div style={styles.cardFooter}>
                    <a 
                      href={`/dashboard?tab=consultation&room=${appt.room || 'Room1'}`}
                      style={styles.joinBtn}
                      onClick={(e) => {
                        e.preventDefault();
                        alert(`Starting P2P Video Consultation with ${appt.patientName} in ${appt.room || 'Room A'}`);
                      }}
                    >
                      <Video size={16} />
                      Launch Consultation Room
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at 10% 20%, #060813 0%, #0d1127 100%)',
    color: '#fff',
    fontFamily: `'Outfit', 'Inter', sans-serif`,
    position: 'relative',
    overflow: 'hidden',
    padding: '40px 20px',
  },
  glowCyan: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0, 242, 254, 0.08) 0%, transparent 70%)',
    filter: 'blur(50px)',
    top: '-10%',
    left: '10%',
    zIndex: 0,
  },
  glowPurple: {
    position: 'absolute',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(127, 0, 255, 0.06) 0%, transparent 70%)',
    filter: 'blur(60px)',
    bottom: '10%',
    right: '5%',
    zIndex: 0,
  },
  content: {
    maxWidth: '1100px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '24px 32px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    flexWrap: 'wrap',
    gap: '20px',
  },
  headerTitleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logoBadge: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'var(--gradient-neon)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(0, 242, 254, 0.3)',
  },
  doctorName: {
    fontSize: '1.8rem',
    fontWeight: 800,
    margin: 0,
  },
  gradientText: {
    background: 'var(--gradient-neon)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  specialtyText: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    margin: '4px 0 0 0',
  },
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  refreshBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    borderRadius: '10px',
    width: '42px',
    height: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  logoutBtn: {
    background: 'var(--gradient-aurora)',
    border: 'none',
    color: '#fff',
    borderRadius: '10px',
    padding: '10px 20px',
    fontWeight: 600,
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 0 15px rgba(127, 0, 255, 0.3)',
    transition: 'all 0.2s ease',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    backdropFilter: 'blur(8px)',
  },
  statIconContainer: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    display: 'block',
  },
  statValue: {
    fontSize: '1.4rem',
    fontWeight: 800,
    marginTop: '2px',
    display: 'block',
  },
  appointmentsSection: {
    background: 'rgba(255, 255, 255, 0.01)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '20px',
    padding: '30px',
    backdropFilter: 'blur(10px)',
  },
  sectionTitle: {
    fontSize: '1.4rem',
    fontWeight: 800,
    marginBottom: '24px',
    fontFamily: 'Outfit',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 20px',
    background: 'rgba(0, 0, 0, 0.1)',
    borderRadius: '16px',
    border: '1px dashed rgba(255, 255, 255, 0.08)',
  },
  queueGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px',
  },
  appointmentCard: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'rgba(0, 242, 254, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  patientNameText: {
    fontSize: '1.1rem',
    fontWeight: 700,
    margin: 0,
  },
  patientIdBadge: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    display: 'block',
    marginTop: '2px',
  },
  roomBadge: {
    background: 'rgba(0, 242, 254, 0.08)',
    color: 'var(--primary-cyan)',
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(0, 242, 254, 0.15)',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'rgba(0, 0, 0, 0.15)',
    padding: '12px',
    borderRadius: '8px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.85rem',
  },
  cardFooter: {
    marginTop: '4px',
  },
  joinBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'var(--gradient-neon)',
    border: 'none',
    borderRadius: '8px',
    color: '#060813',
    padding: '10px 14px',
    fontWeight: 700,
    fontSize: '0.85rem',
    cursor: 'pointer',
    width: '100%',
    textDecoration: 'none',
    boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)',
    transition: 'all 0.2s ease',
  },
};
