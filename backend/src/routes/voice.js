import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';

const router = express.Router();

const getAllDoctors = async () => {
  try {
    const registeredDoctors = await Doctor.find({});
    return registeredDoctors.map(doc => ({
      id: doc._id.toString(),
      name: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
      specialty: doc.specialty || 'General Practitioner',
      room: doc.room || 'Telehealth Cabin',
      availability: doc.availability || 'By Appointment'
    }));
  } catch (err) {
    console.error('Error fetching registered doctors:', err);
    return [];
  }
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
    const { doctorId, doctorName, date, time, patientName, patientId } = req.body;
    if (!doctorId && !doctorName) {
      return res.status(400).json({ error: 'doctorId or doctorName is required' });
    }

    const allDoctors = await getAllDoctors();
    const doc = doctorId
      ? allDoctors.find(d => d.id === doctorId || String(d._id) === doctorId)
      : allDoctors.find(d => d.name.toLowerCase().includes(doctorName.toLowerCase()) || doctorName.toLowerCase().includes(d.name.toLowerCase()));
    const finalDocName = doc ? doc.name : doctorName;
    const finalSpecialty = doc ? `our resident ${doc.specialty}` : 'a medical specialist';

    const confirmationText = `Success! I have booked an appointment for you, ${patientName || 'Jane'}, with ${finalDocName}, ${finalSpecialty}, on ${date || 'tomorrow'} at ${time || 'ten A M'}. Please make sure you are online five minutes before the scheduled time.`;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const appointmentData = {
      patientId,
      doctorId: doc.id,
      doctorName: finalDocName,
      date: date || new Date().toISOString().slice(0, 10),
      time: time || '10:00',
      patientName: patientName || 'Patient',
      room: doc.room || 'Telehealth Cabin'
    };

    const appt = new Appointment(appointmentData);
    const savedAppointment = await appt.save();

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
    const list = await Appointment.find({ patientId }).sort({ date: 1, time: 1 });
    res.json(list);
  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET all appointments for a doctor
router.get('/appointments/doctor/:doctorId', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const list = await Appointment.find({ doctorId }).sort({ date: 1, time: 1 });
    res.json(list);
  } catch (error) {
    console.error('Fetch doctor appointments error:', error);
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
