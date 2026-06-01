import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function AuthForm({ onAuthSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const mode = query.get('mode') === 'login' ? 'login' : 'register';

    const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [specialty, setSpecialty] = useState(''); // doctor only
  const [phone, setPhone] = useState(''); // doctor only
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      email,
      password,
      role,
      ...(role === 'doctor' ? { specialty, phone } : {}),
      ...(role === 'patient' ? { age: Number(age), gender } : {}),
    };
    try {
      const res = await fetch(`${API_BASE}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      const { token } = data;
      localStorage.setItem('token', token);
      // Call parent callback to update auth state
      if (typeof onAuthSuccess === 'function') {
        onAuthSuccess({ token, user: data[role], role });
      }
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-form" style={styles.container}>
      <h2>{mode === 'login' ? 'Login' : 'Register'} for {role}</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)} style={styles.input}>
          <option value="patient">Patient</option>
          <option value="doctor">Doctor</option>
        </select>
        {mode === 'register' && (
          <>
            <label style={styles.label}>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} />
          </>
        )}
        <label style={styles.label}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={styles.input} />
        <label style={styles.label}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={styles.input} />
        {role === 'patient' && mode === 'register' && (
          <>
            <label style={styles.label}>Age</label>
            <input type="number" value={age} onChange={(e) => setAge(e.target.value)} style={styles.input} />
            <label style={styles.label}>Gender</label>
            <input type="text" value={gender} onChange={(e) => setGender(e.target.value)} style={styles.input} />
          </>
        )}
        {role === 'doctor' && mode === 'register' && (
          <>
            <label style={styles.label}>Specialty</label>
            <input type="text" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required style={styles.input} />
            <label style={styles.label}>Phone</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} style={styles.input} />
          </>
        )}
        {error && <div style={styles.error}>{error}</div>}
        <button type="submit" style={styles.button}>Submit</button>
      </form>
      <div style={styles.toggle}>
        {mode === 'login' ? (
          <Link to="/auth?mode=register">Don’t have an account? Register</Link>
        ) : (
          <Link to="/auth?mode=login">Already have an account? Login</Link>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '420px',
    margin: '80px auto',
    padding: '40px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
    fontFamily: `'Inter', sans-serif`,
    color: '#fff',
  },
  form: { display: 'flex', flexDirection: 'column' },
  label: { marginTop: '14px', fontWeight: 600, color: '#e0e0e0' },
  input: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid var(--border-glow)',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
  },
  button: {
    marginTop: '24px',
    padding: '12px',
    borderRadius: '8px',
    background: 'var(--gradient-neon)',
    color: '#060813',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  error: { marginTop: '12px', color: '#ff6b6b' },
  toggle: { marginTop: '20px', textAlign: 'center', color: '#cfd8dc' },
};




