import express from 'express';
import Consultation from '../models/Consultation.js';

const router = express.Router();

// GET all consultations for a specific patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const list = await Consultation.find({ patientId }).sort({ date: -1 });
    res.json(list);
  } catch (error) {
    console.error('Fetch consultations error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// CREATE a new consultation record
router.post('/', async (req, res) => {
  try {
    const { patientId, doctorName } = req.body;
    if (!patientId || !doctorName) {
      return res.status(400).json({ error: 'patientId and doctorName are required' });
    }

    const newConsultData = {
      patientId,
      date: new Date(),
      doctorName,
      transcript: '',
      soapSummary: {
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
        clinicalSummary: ''
      },
      recordingUrl: '',
      chatMessages: []
    };

    const consult = new Consultation(newConsultData);
    const savedConsult = await consult.save();

    res.status(201).json(savedConsult);
  } catch (error) {
    console.error('Create consultation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// UPDATE consultation transcript & recording
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { transcript, soapSummary, recordingUrl } = req.body;

    const consult = await Consultation.findById(id);
    if (!consult) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    if (transcript !== undefined) consult.transcript = transcript;
    if (recordingUrl !== undefined) consult.recordingUrl = recordingUrl;
    if (soapSummary !== undefined) {
      consult.soapSummary = {
        subjective: soapSummary.subjective || consult.soapSummary.subjective || '',
        objective: soapSummary.objective || consult.soapSummary.objective || '',
        assessment: soapSummary.assessment || consult.soapSummary.assessment || '',
        plan: soapSummary.plan || consult.soapSummary.plan || '',
        clinicalSummary: soapSummary.clinicalSummary || consult.soapSummary.clinicalSummary || ''
      };
    }

    await consult.save();
    res.json(consult);
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ADD chat message to consultation
router.post('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;
    const { sender, message } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: 'sender and message are required' });
    }

    const consult = await Consultation.findById(id);
    if (!consult) {
      return res.status(404).json({ error: 'Consultation not found' });
    }

    const newMessage = {
      sender,
      message,
      timestamp: new Date()
    };

    consult.chatMessages.push(newMessage);
    await consult.save();

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Add chat message error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
