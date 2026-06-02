import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Patient from '../models/Patient.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'aura_ai_secret_key_development_only';

const findPatientByEmail = async (email) => {
  return await Patient.findOne({ email });
};

const findPatientById = async (id) => {
  return await Patient.findById(id);
};

const createPatient = async (patientData) => {
  const newPatient = new Patient(patientData);
  return await newPatient.save();
};

// Register Route
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, age, gender } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = await findPatientByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const patient = await createPatient({
      name,
      email,
      password: hashedPassword,
      age: age ? Number(age) : undefined,
      gender: gender || '',
      medicalHistory: [],
      symptoms: [],
      baselineFaceDescriptor: []
    });

    const token = jwt.sign({ id: patient._id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        age: patient.age,
        gender: patient.gender,
        hasFaceBaseline: false
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const patient = await findPatientByEmail(email);
    if (!patient) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, patient.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: patient._id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        age: patient.age,
        gender: patient.gender,
        hasFaceBaseline: patient.baselineFaceDescriptor && patient.baselineFaceDescriptor.length > 0
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Register Facial Baseline Descriptor
router.post('/register-face', async (req, res) => {
  try {
    const { patientId, descriptor } = req.body;
    if (!patientId || !descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ error: 'patientId and numeric descriptor array are required' });
    }

    const patient = await findPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    patient.baselineFaceDescriptor = descriptor;
    await patient.save();

    res.json({ success: true, message: 'Facial signature baseline registered successfully' });
  } catch (error) {
    console.error('Face register error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Verify Face Scan against baseline
router.post('/verify-face', async (req, res) => {
  try {
    const { patientId, descriptor } = req.body;
    if (!patientId || !descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ error: 'patientId and numeric descriptor array are required' });
    }

    const patient = await findPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const baseline = patient.baselineFaceDescriptor;
    if (!baseline || baseline.length === 0) {
      return res.status(400).json({
        verified: false,
        error: 'No facial baseline registered. Please record a biometric baseline profile first.'
      });
    }

    if (baseline.length !== descriptor.length) {
      return res.status(400).json({
        verified: false,
        error: `Descriptor size mismatch. Expected ${baseline.length}, got ${descriptor.length}`
      });
    }

    // Mathematical Euclidean Distance: sqrt( sum((x_i - y_i)^2) )
    let sumSquaredDiff = 0;
    for (let i = 0; i < baseline.length; i++) {
      sumSquaredDiff += Math.pow(baseline[i] - descriptor[i], 2);
    }
    const distance = Math.sqrt(sumSquaredDiff);

    // Standard face-api.js threshold for matching same person is ~0.55
    const VERIFICATION_THRESHOLD = 0.55;
    const verified = distance < VERIFICATION_THRESHOLD;

    res.json({
      verified,
      distance,
      threshold: VERIFICATION_THRESHOLD,
      message: verified ? 'Identity verified successfully' : 'Biometric verification failed. Face does not match.'
    });
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
