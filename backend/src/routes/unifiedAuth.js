// backend/src/routes/unifiedAuth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Patient from '../models/Patient.js';
import Doctor from '../models/Doctor.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'aura_ai_secret_key_development_only';

// Helper functions
const findUserByEmail = async (email, role) => {
  if (role === 'doctor') {
    return await Doctor.findOne({ email });
  }
  return await Patient.findOne({ email });
};

const createUser = async (data, role) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(data.password, salt);
  const payload = { ...data, password: hashedPassword };
  if (role === 'doctor') {
    const newDoc = new Doctor(payload);
    return await newDoc.save();
  }
  const newPat = new Patient(payload);
  return await newPat.save();
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, gender, role, specialty, phone } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password and role are required' });
    }
    const existing = await findUserByEmail(email, role);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const user = await createUser({ name, email, password, age, gender, specialty, phone }, role);
    const token = jwt.sign({ id: user._id, role }, JWT_SECRET, { expiresIn: '7d' });
    // Return appropriate payload
    if (role === 'doctor') {
      const { _id, name, email, specialty, phone } = user;
      return res.status(201).json({ token, doctor: { id: _id, name, email, specialty, phone } });
    }
    // patient response (same as original)
    const { _id, name: pName, email: pEmail, age: pAge, gender: pGender, baselineFaceDescriptor } = user;
    res.status(201).json({
      token,
      patient: {
        id: _id,
        name: pName,
        email: pEmail,
        age: pAge,
        gender: pGender,
        hasFaceBaseline: !!(baselineFaceDescriptor && baselineFaceDescriptor.length > 0)
      }
    });
  } catch (error) {
    console.error('Unified registration error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password and role are required' });
    }
    const user = await findUserByEmail(email, role);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id, role }, JWT_SECRET, { expiresIn: '7d' });
    if (role === 'doctor') {
      const { _id, name, email, specialty, phone } = user;
      return res.json({ token, doctor: { id: _id, name, email, specialty, phone } });
    }
    const { _id, name, email: pEmail, age, gender, baselineFaceDescriptor } = user;
    res.json({
      token,
      patient: {
        id: _id,
        name,
        email: pEmail,
        age,
        gender,
        hasFaceBaseline: !!(baselineFaceDescriptor && baselineFaceDescriptor.length > 0)
      }
    });
  } catch (error) {
    console.error('Unified login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
