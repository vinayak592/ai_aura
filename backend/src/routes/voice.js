import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { getDbStatus } from '../config/db.js';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import { mockAppointments, mockDoctors } from '../config/dbMock.js';

const router = express.Router();

// Mock Doctors List
const DOCTORS = [
  { id: 'doc_1', name: 'Dr. Elizabeth Vance', specialty: 'Optometrist', room: 'Clinic Room A', availability: 'Mon, Wed, Fri 9AM-5PM' },
  { id: 'doc_2', name: 'Dr. Sarah Chen', specialty: 'Dermatologist', room: 'Clinic Room B', availability: 'Tue, Thu 10AM-6PM' },
  { id: 'doc_3', name: 'Dr. Marcus Brody', specialty: 'General Practitioner', room: 'Clinic Room C', availability: 'Mon-Thu 8AM-4PM' },
  { id: 'doc_4', name: 'Dr. Elena Rostova', specialty: 'Neurologist', room: 'Clinic Suite D', availability: 'Friday 10AM-3PM' }
];

const getAllDoctors = async () => {
  let registeredDoctors = [];
  try {
    if (getDbStatus()) {
      registeredDoctors = await Doctor.find({});
    } else {
      registeredDoctors = mockDoctors || [];
    }
  } catch (err) {
    console.error('Error fetching registered doctors:', err);
  }

  const formattedRegistered = registeredDoctors.map(doc => ({
    id: doc._id || doc.id,
    name: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
    specialty: doc.specialty || 'General Practitioner',
    room: doc.room || 'Telehealth Cabin',
    availability: doc.availability || 'By Appointment'
  }));

  const allDoctors = [...DOCTORS];
  for (const rDoc of formattedRegistered) {
    if (!allDoctors.some(d => d.name.toLowerCase() === rDoc.name.toLowerCase())) {
      allDoctors.push(rDoc);
    }
  }
  return allDoctors;
};

const getOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey
  });
};

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};

// GET Doctors List
router.get('/doctors', async (req, res) => {
  const allDoctors = await getAllDoctors();
  res.json(allDoctors);
});

// BOOK Appointment (Verbal confirmation & persistence)
router.post('/book', async (req, res) => {
  try {
    const { doctorName, date, time, patientName, patientId } = req.body;
    if (!doctorName) {
      return res.status(400).json({ error: 'doctorName is required' });
    }

    const allDoctors = await getAllDoctors();
    const doc = allDoctors.find(d => d.name.toLowerCase().includes(doctorName.toLowerCase()) || doctorName.toLowerCase().includes(d.name.toLowerCase()));
    const finalDocName = doc ? doc.name : doctorName;
    const finalSpecialty = doc ? `our resident ${doc.specialty}` : 'a medical specialist';

    const confirmationText = `Success! I have booked an appointment for you, ${patientName || 'Jane'}, with ${finalDocName}, ${finalSpecialty}, on ${date || 'tomorrow'} at ${time || 'ten A M'}. Please make sure you are online five minutes before the scheduled time.`;

    const appointmentData = {
      patientId: patientId || 'mock_patient_123',
      doctorName: finalDocName,
      date: date || new Date().toISOString().slice(0, 10),
      time: time || '10:00',
      patientName: patientName || 'Jane Doe',
      room: doc ? doc.room : 'Clinic Room A'
    };

    let savedAppointment;
    if (getDbStatus()) {
      const appt = new Appointment(appointmentData);
      savedAppointment = await appt.save();
    } else {
      savedAppointment = {
        _id: 'mock_appointment_' + Math.random().toString(36).substr(2, 9),
        ...appointmentData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockAppointments.push(savedAppointment);
    }

    res.json({
      success: true,
      confirmationText,
      appointment: savedAppointment
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET all appointments for a patient
router.get('/appointments/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    let list = [];

    if (getDbStatus()) {
      list = await Appointment.find({ patientId }).sort({ date: 1, time: 1 });
    } else {
      list = mockAppointments
        .filter(a => a.patientId === patientId)
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    }

    res.json(list);
  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ASK HEALTH QUESTIONS (concise synthesizable answers)
router.post('/ask-health', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const openrouter = getOpenRouterClient();

    if (openrouter) {
      try {
        console.log(`🔮 Sending spoken health question to OpenRouter: "${question}"`);
        
        const prompt = `
          You are a concise, patient-friendly AI medical voice assistant. 
          A user is asking you a health-related question vocally.
          
          QUESTION: "${question}"
          
          Write a concise, reassuring verbal response (exactly 2 to 3 sentences maximum, and no more than 60 words). 
          Keep it easy to understand and avoid complex medical jargon or bullet points because this will be spoken out loud via text-to-speech. 
          Always remind them that you are an AI assistant and they should verify details with a doctor if they feel severe discomfort.
        `;

        const response = await openrouter.chat.completions.create({
          model: "google/gemma-4-31b-it:free",
          max_tokens: 1500,
          messages: [
            { role: "user", content: prompt }
          ],
          extra_body: {
            reasoning: { enabled: true }
          }
        });

        const responseText = response.choices[0].message.content.trim();
        return res.json({ answer: responseText });
      } catch (openrouterError) {
        console.error('OpenRouter voice QA error, falling back:', openrouterError);
      }
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        console.log(`🔮 Sending spoken health question to Gemini: "${question}"`);
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `
          You are a concise, patient-friendly AI medical voice assistant. 
          A user is asking you a health-related question vocally.
          
          QUESTION: "${question}"
          
          Write a concise, reassuring verbal response (exactly 2 to 3 sentences maximum, and no more than 60 words). 
          Keep it easy to understand and avoid complex medical jargon or bullet points because this will be spoken out loud via text-to-speech. 
          Always remind them that you are an AI assistant and they should verify details with a doctor if they feel severe discomfort.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        return res.json({ answer: responseText });
      } catch (geminiError) {
        console.error('Gemini voice QA error, falling back to mock:', geminiError);
      }
    }

    // fallback simulation
    console.log('⚠️ Answering health question in Mock Mode (no Gemini key or API failure)...');
    
    const questionLower = question.toLowerCase();
    let answer = "I'm sorry, I didn't quite catch that. As your AI voice assistant, I can answer common health questions. For severe discomfort, please schedule a direct consult with one of our specialists.";

    if (questionLower.includes('headache')) {
      answer = "Headaches can often be caused by dehydration, digital eye strain, or neck muscle fatigue from posture. I recommend drinking a large glass of water, taking a 20-minute break from all screens, and resting in a quiet room. If it persists, please speak with one of our doctors.";
    } else if (questionLower.includes('eye') || questionLower.includes('dry') || questionLower.includes('screen')) {
      answer = "Dry eyes are very common when looking at computers because we blink less frequently. Please try the 20-20-20 rule: every 20 minutes look at something 20 feet away for 20 seconds. Over-the-counter lubricating eye drops can also provide quick relief.";
    } else if (questionLower.includes('rash') || questionLower.includes('skin') || questionLower.includes('itch')) {
      answer = "Itchy skin or rashes are frequently triggered by allergic contacts, dry weather, or mild eczema. Try washing the area with mild soap and water, avoiding scratching, and applying a cool compress. You can upload a photo of the area in our medical image analysis tab for an instant visual review.";
    } else if (questionLower.includes('fatigue') || questionLower.includes('tired')) {
      answer = "Feeling constantly tired can stem from disrupted sleep cycles, stress, poor hydration, or prolonged screen work. Try to take active breaks, maintain a consistent bedtime routine, and keep hydrated. You can also monitor your live webcam fatigue readings on our telemetry dashboard.";
    }

    res.json({ answer });

  } catch (error) {
    console.error('Voice QA error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
