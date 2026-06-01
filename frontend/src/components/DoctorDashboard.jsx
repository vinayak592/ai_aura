import React, { useEffect, useState } from 'react';

export default function DoctorDashboard({ doctor }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_BASE = import.meta.env.VITE_API_BASE || '';

  useEffect(() => {
    if (!doctor?.id) return;
    const fetchAppointments = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/doctors/${doctor.id}/appointments`);
        const data = await res.json();
        if (res.ok) setAppointments(data);
        else console.error('Failed to load appointments', data);
      } catch (e) {
        console.error('Error fetching appointments', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, [doctor]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 10% 20%, #060813 0%, #0d1127 100%)',
      color: '#fff',
      padding: '20px'
    }}>
      <h2 style={{ fontSize: '2rem', fontFamily: 'Outfit', fontWeight: 800 }}>
        Doctor Dashboard
      </h2>
      {loading ? (
        <p>Loading appointments...</p>
      ) : (
        <div style={{ width: '100%', maxWidth: '600px', marginTop: '20px' }}>
          {appointments.length === 0 ? (
            <p>No appointments scheduled.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {appointments.map((a) => (
                <li key={a.id} style={{ padding: '12px', borderBottom: '1px solid var(--border-muted)' }}>
                  <strong>{a.patientName}</strong> – {a.date} at {a.time}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
