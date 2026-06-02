import express from 'express';
import { getDbStatus } from '../config/db.js';
import Patient from '../models/Patient.js';
import HealthAnalysis from '../models/HealthAnalysis.js';
import { mockPatients, mockHealthAnalyses } from '../config/dbMock.js';

const router = express.Router();

// Helper to find patient
const findPatientById = async (id) => {
  if (getDbStatus()) {
    return await Patient.findById(id);
  } else {
    return mockPatients.find(p => p._id === id);
  }
};

// GET Profile
router.get('/:id', async (req, res) => {
  try {
    const patient = await findPatientById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    res.json({
      id: patient._id,
      name: patient.name,
      email: patient.email,
      age: patient.age,
      gender: patient.gender,
      medicalHistory: patient.medicalHistory,
      symptoms: patient.symptoms,
      hasFaceBaseline: patient.baselineFaceDescriptor && patient.baselineFaceDescriptor.length > 0
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// UPDATE Medical History
router.put('/:id/medical', async (req, res) => {
  try {
    const { medicalHistory } = req.body;
    if (!Array.isArray(medicalHistory)) {
      return res.status(400).json({ error: 'medicalHistory must be an array' });
    }

    const patient = await findPatientById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    if (getDbStatus()) {
      patient.medicalHistory = medicalHistory;
      await patient.save();
    } else {
      patient.medicalHistory = medicalHistory;
      patient.updatedAt = new Date();
    }

    res.json({ success: true, medicalHistory: patient.medicalHistory });
  } catch (error) {
    console.error('Update medical history error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// UPDATE Symptoms
router.put('/:id/symptoms', async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!Array.isArray(symptoms)) {
      return res.status(400).json({ error: 'symptoms must be an array' });
    }

    const patient = await findPatientById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    if (getDbStatus()) {
      patient.symptoms = symptoms;
      await patient.save();
    } else {
      patient.symptoms = symptoms;
      patient.updatedAt = new Date();
    }

    res.json({ success: true, symptoms: patient.symptoms });
  } catch (error) {
    console.error('Update symptoms error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// FETCH Telemetry History
router.get('/:id/telemetry', async (req, res) => {
  try {
    const patientId = req.params.id;
    let logs = [];

    if (getDbStatus()) {
      logs = await HealthAnalysis.find({ patientId }).sort({ timestamp: -1 });
    } else {
      logs = mockHealthAnalyses
        .filter(l => l.patientId === patientId)
        .sort((a, b) => b.timestamp - a.timestamp);
    }

    res.json(logs);
  } catch (error) {
    console.error('Fetch telemetry error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// LOG New Telemetry Session
router.post('/:id/telemetry', async (req, res) => {
  try {
    const patientId = req.params.id;
    const { emotionData, fatigueScore, blinkRate, attentionScore, presenceDuration } = req.body;

    const patient = await findPatientById(patientId);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const newLogData = {
      patientId,
      timestamp: new Date(),
      emotionData: {
        happy: Number(emotionData?.happy || 0),
        sad: Number(emotionData?.sad || 0),
        neutral: Number(emotionData?.neutral || 0),
        angry: Number(emotionData?.angry || 0),
        stressed: Number(emotionData?.stressed || 0)
      },
      fatigueScore: Number(fatigueScore || 0),
      blinkRate: Number(blinkRate || 0),
      attentionScore: Number(attentionScore || 0),
      presenceDuration: Number(presenceDuration || 0)
    };

    let savedLog;
    if (getDbStatus()) {
      const log = new HealthAnalysis(newLogData);
      savedLog = await log.save();
    } else {
      savedLog = {
        _id: 'mock_telemetry_' + Math.random().toString(36).substr(2, 9),
        ...newLogData
      };
      mockHealthAnalyses.push(savedLog);
    }

    res.status(201).json(savedLog);
  } catch (error) {
    console.error('Log telemetry error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
