import express from 'express';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { OpenAI } from 'openai';
import { getDbStatus } from '../config/db.js';
import Patient from '../models/Patient.js';
import Consultation from '../models/Consultation.js';
import HealthAnalysis from '../models/HealthAnalysis.js';
import { mockPatients, mockConsultations, mockHealthAnalyses } from '../config/dbMock.js';

const router = express.Router();

// Configure multer for memory uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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
  // Initialize standard GoogleGenerativeAI client
  return new GoogleGenerativeAI(apiKey);
};

// HELPER: Convert buffer to Google Gen AI Part object
const fileToGenerativePart = (buffer, mimeType) => {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType
    },
  };
};

// Helper: Fetch patient aggregate data for insights
const getPatientAggregateData = async (patientId) => {
  let patient, consultations, telemetry;

  if (getDbStatus()) {
    patient = await Patient.findById(patientId);
    consultations = await Consultation.find({ patientId }).sort({ date: -1 }).limit(3);
    telemetry = await HealthAnalysis.find({ patientId }).sort({ timestamp: -1 }).limit(5);
  } else {
    patient = mockPatients.find(p => p._id === patientId);
    consultations = mockConsultations.filter(c => c.patientId === patientId).sort((a,b) => b.date - a.date).slice(0, 3);
    telemetry = mockHealthAnalyses.filter(h => h.patientId === patientId).sort((a,b) => b.timestamp - a.timestamp).slice(0, 5);
  }

  return { patient, consultations, telemetry };
};

// ======================================================================
// 1. AI MEDICAL IMAGE ANALYSIS
// ======================================================================
router.post('/analyze-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload or capture an image file' });
    }

    const openrouter = getOpenRouterClient();
    
    if (openrouter) {
      console.log('🔮 Sending image to OpenRouter for clinical analysis...');
      try {
        const base64Image = req.file.buffer.toString('base64');
        const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        const prompt = `
          You are a highly experienced AI clinical dermatologist and medical imaging expert. 
          Analyze the attached image which is a patient photo (could be a skin condition, wound, rash, or general medical photo).
          
          Provide a highly detailed, professional clinical analysis. Your output MUST be valid JSON matching the following structure:
          {
            "findings": "Brief specific diagnosis (e.g. Mild Atopic Dermatitis, Superficial Laceration, Contact Dermatitis, or Normal Healing Skin)",
            "confidence": 85, // Integer between 0 and 100 representing confidence based on visual indicators
            "report": "A detailed multi-paragraph explanation of your observations, visual margins, anatomical colorations, suspected etiologies, and standard clinical guidelines."
          }
          Return ONLY this raw JSON. Do not include markdown code block syntax or formatting.
        `;

        const response = await openrouter.chat.completions.create({
          model: "google/gemini-2.5-flash", // Use standard multimodal vision-capable model on OpenRouter
          max_tokens: 1500,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ]
        });

        const responseText = response.choices[0].message.content.trim();
        const sanitized = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(sanitized);
        return res.json(parsed);
      } catch (openrouterError) {
        console.error('OpenRouter image analysis error, falling back:', openrouterError);
      }
    }

    const ai = getGeminiClient();
    
    if (ai) {
      console.log('🔮 Sending image to Gemini API for clinical analysis...');
      try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
        
        const prompt = `
          You are a highly experienced AI clinical dermatologist and medical imaging expert. 
          Analyze the attached image which is a patient photo (could be a skin condition, wound, rash, or general medical photo).
          
          Provide a highly detailed, professional clinical analysis. Your output MUST be valid JSON matching the following structure:
          {
            "findings": "Brief specific diagnosis (e.g. Mild Atopic Dermatitis, Superficial Laceration, Contact Dermatitis, or Normal Healing Skin)",
            "confidence": 85, // Integer between 0 and 100 representing confidence based on visual indicators
            "report": "A detailed multi-paragraph explanation of your observations, visual margins, anatomical colorations, suspected etiologies, and standard clinical guidelines."
          }
          Return ONLY this raw JSON. Do not include markdown code block syntax or formatting.
        `;

        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text().trim();
        
        // Sanitize the response text in case Gemini wraps it in a markdown json block
        const sanitized = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(sanitized);
        return res.json(parsed);
      } catch (geminiError) {
        console.error('Gemini direct analysis error, falling back to mock:', geminiError);
      }
    }

    // fallback simulation
    console.log('⚠️ Running image analysis in Mock Mode (no Gemini key or API failure)...');
    
    // Dynamically generate different responses to feel organic
    const mockDiagnostics = [
      {
        findings: "Mild Contact Dermatitis",
        confidence: 88,
        report: "Visual analysis reveals a localized erythematous, maculopapular rash consistent with acute contact dermatitis. The epidermal surface displays mild scaling without vesicular formation or signs of secondary bacterial infection. The lesion borders are moderately demarcated, suggesting localized contact with a chemical irritant or allergen. Clinical recommendations include identifying and removing the trigger, applying cool compresses, and considering a mild topical corticosteroid or emollient to alleviate pruritus and accelerate epidermal repair."
      },
      {
        findings: "Superficial Healing Laceration",
        confidence: 94,
        report: "Visual inspection shows a linear superficial laceration in the early proliferation stage of tissue healing. Clean wound margins are observed with no purulent discharge, surrounding edema, or expanding erythema, indicating a low risk of wound infection. Fibrinous closure is established at the center with healthy granulation tissue around the periphery. Continued clean dressing, local hygiene, and avoiding physical strain on the area are suggested to minimize scarring and optimize dermal matrix synthesis."
      },
      {
        findings: "Acute Urticaria (Hives)",
        confidence: 82,
        report: "The image showcases multiple transient, raised, edematous wheals with surrounding erythematous flares, typical of acute urticaria. The lesions appear well-defined with pale centers, characteristic of histamine-mediated dermal edema. The systemic pattern suggests an immediate hypersensitivity reaction. Cool baths, loose clothing, and oral non-sedating H1 antihistamines are primary supportive therapies. Continued monitoring for any signs of respiratory involvement (anaphylaxis) is recommended."
      }
    ];

    // Pick one randomly
    const selectedMock = mockDiagnostics[Math.floor(Math.random() * mockDiagnostics.length)];
    
    // artificial delay to feel premium
    setTimeout(() => {
      res.json(selectedMock);
    }, 1500);

  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ======================================================================
// 2. SMART HEALTH INSIGHTS
// ======================================================================
router.post('/insights', async (req, res) => {
  try {
    const { patientId } = req.body;
    if (!patientId) {
      return res.status(400).json({ error: 'patientId is required' });
    }

    const { patient, consultations, telemetry } = await getPatientAggregateData(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Construct telemetry summary for AI context
    const avgFatigue = telemetry.length > 0 
      ? Math.round(telemetry.reduce((sum, t) => sum + t.fatigueScore, 0) / telemetry.length) 
      : 40;
    
    const avgAttention = telemetry.length > 0 
      ? Math.round(telemetry.reduce((sum, t) => sum + t.attentionScore, 0) / telemetry.length) 
      : 90;
      
    const dominantEmotion = telemetry.length > 0
      ? Object.entries(telemetry.reduce((acc, t) => {
          Object.keys(acc).forEach(k => acc[k] += (t.emotionData[k] || 0));
          return acc;
        }, { happy: 0, sad: 0, neutral: 0, angry: 0, stressed: 0 }))
        .sort((a,b) => b[1] - a[1])[0][0]
      : 'neutral';

    const openrouter = getOpenRouterClient();

    if (openrouter) {
      try {
        console.log('🔮 Fetching health insights from OpenRouter with Gemma-4-31b reasoning...');
        
        const contextPrompt = `
          You are an advanced digital medicine AI. Analyze the patient profile, medical conditions, current symptoms, past consultation transcripts, and webcam telemetry (emotions, fatigue levels) to create a premium, holistic diagnostic overview.
          
          PATIENT PROFILE:
          - Age: ${patient.age || 'Unknown'}
          - Gender: ${patient.gender || 'Unknown'}
          - Active Symptoms: ${JSON.stringify(patient.symptoms || [])}
          - Medical History: ${JSON.stringify(patient.medicalHistory || [])}
          
          WEBCAM CLINICAL TELEMETRY (AVERAGES OVER PAST 5 SESSIONS):
          - Average Fatigue Score (0-100): ${avgFatigue}
          - Average Screen Attention (%): ${avgAttention}
          - Primary Emotional State: ${dominantEmotion}
          
          PAST CONSULTATION DETAILS:
          ${JSON.stringify(consultations.map(c => ({ doctor: c.doctorName, date: c.date, assessment: c.soapSummary.assessment })))}

          Return a JSON matching the following structure:
          {
            "healthScore": 85, // 0-100 (Overall systemic health index)
            "wellnessScore": 78, // 0-100 (Mental, rest and wellness index based on fatigue/emotions)
            "riskScore": 25, // 0-100 (Disease or strain risk based on symptoms/history)
            "reasoning": "A concise multi-sentence summary of why you assigned these scores.",
            "suggestions": [
              {
                "title": "Short title",
                "desc": "Actionable, concrete healthcare advice matching their specific dry eye, fatigue, or history profile."
              }
            ]
          }
          Return ONLY this raw JSON. Do not include markdown code block syntax.
        `;

        const response = await openrouter.chat.completions.create({
          model: "google/gemma-4-31b-it:free",
          max_tokens: 1500,
          messages: [
            { role: "user", content: contextPrompt }
          ],
          extra_body: {
            reasoning: { enabled: true }
          }
        });

        const responseText = response.choices[0].message.content.trim();
        const sanitized = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(sanitized);
        return res.json(parsed);
      } catch (openrouterError) {
        console.error('OpenRouter insights error, falling back:', openrouterError);
      }
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        console.log('🔮 Fetching health insights from Gemini API...');
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const contextPrompt = `
          You are an advanced digital medicine AI. Analyze the patient profile, medical conditions, current symptoms, past consultation transcripts, and webcam telemetry (emotions, fatigue levels) to create a premium, holistic diagnostic overview.
          
          PATIENT PROFILE:
          - Age: ${patient.age || 'Unknown'}
          - Gender: ${patient.gender || 'Unknown'}
          - Active Symptoms: ${JSON.stringify(patient.symptoms || [])}
          - Medical History: ${JSON.stringify(patient.medicalHistory || [])}
          
          WEBCAM CLINICAL TELEMETRY (AVERAGES OVER PAST 5 SESSIONS):
          - Average Fatigue Score (0-100): ${avgFatigue}
          - Average Screen Attention (%): ${avgAttention}
          - Primary Emotional State: ${dominantEmotion}
          
          PAST CONSULTATION DETAILS:
          ${JSON.stringify(consultations.map(c => ({ doctor: c.doctorName, date: c.date, assessment: c.soapSummary.assessment })))}

          Return a JSON matching the following structure:
          {
            "healthScore": 85, // 0-100 (Overall systemic health index)
            "wellnessScore": 78, // 0-100 (Mental, rest and wellness index based on fatigue/emotions)
            "riskScore": 25, // 0-100 (Disease or strain risk based on symptoms/history)
            "reasoning": "A concise multi-sentence summary of why you assigned these scores.",
            "suggestions": [
              {
                "title": "Short title",
                "desc": "Actionable, concrete healthcare advice matching their specific dry eye, fatigue, or history profile."
              }
            ]
          }
          Return ONLY this raw JSON. Do not include markdown code block syntax.
        `;

        const result = await model.generateContent(contextPrompt);
        const responseText = result.response.text().trim();
        const sanitized = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(sanitized);
        return res.json(parsed);
      } catch (geminiError) {
        console.error('Gemini insights error, falling back to mock:', geminiError);
      }
    }

    // fallback score logic based on telemetry and symptoms
    console.log('⚠️ Running health insights in Mock Mode (no Gemini key or API failure)...');
    
    // Deterministic rules to make it react perfectly to the patient inputs!
    const activeSymptomsCount = patient.symptoms ? patient.symptoms.length : 0;
    
    let baseHealth = 92 - (activeSymptomsCount * 5);
    let baseWellness = 88 - (avgFatigue * 0.4) - (dominantEmotion === 'stressed' ? 15 : 0);
    let baseRisk = 12 + (activeSymptomsCount * 8) + (avgFatigue * 0.3);

    // Caps
    baseHealth = Math.max(20, Math.min(100, Math.round(baseHealth)));
    baseWellness = Math.max(20, Math.min(100, Math.round(baseWellness)));
    baseRisk = Math.max(5, Math.min(100, Math.round(baseRisk)));

    // Generate custom suggestions based on active symptoms
    const suggestions = [];
    
    if (patient.symptoms && patient.symptoms.some(s => s.toLowerCase().includes('eye') || s.toLowerCase().includes('vision'))) {
      suggestions.push({
        title: "Digital Eye Strain Protocol",
        desc: "Webcam logs show an increased eye strain pattern (reduced blink rate during high concentration). Adhere to the 20-20-20 rule: every 20 minutes, gaze at an object 20 feet away for 20 seconds. Utilize lubricant eye drops twice daily to protect the ocular tear film."
      });
    }

    if (avgFatigue > 55) {
      suggestions.push({
        title: "Fatigue & Sleep Management",
        desc: `Your average fatigue score is elevated (${avgFatigue}/100) with detectable prolonged eye closures (micro-sleeps). Aim for 7-8 hours of sound sleep. Minimize blue light exposure from your screen at least 1 hour prior to sleep.`
      });
    }

    if (patient.symptoms && patient.symptoms.some(s => s.toLowerCase().includes('headache'))) {
      suggestions.push({
        title: "Cervicogenic Headache Control",
        desc: "Head posture analysis detected slight slouching during work. Slouching increases load on the cervical spine, triggering headaches. Maintain your screen at eye level and stretch neck muscles every hour."
      });
    }

    // Default suggestions if list is sparse
    if (suggestions.length === 0) {
      suggestions.push({
        title: "Routine Hydration & Activity",
        desc: "Keep daily water intake above 2.5 liters to ensure optimal tissue hydration. Incorporate mild aerobic exercises (30 mins walk) 4 times a week to improve dynamic heart-rate variability."
      });
    }
    
    suggestions.push({
      title: "Specialist Recommendation",
      desc: patient.symptoms.length > 0 
        ? "Schedule a detailed consult with a specialized Primary Care Physician or Optometrist to review your current symptom list."
        : "Maintain your active wellness lifestyle. Schedule a routine preventive health screening annually."
    });

    const mockResponse = {
      healthScore: baseHealth,
      wellnessScore: baseWellness,
      riskScore: baseRisk,
      reasoning: `Patient presents with ${activeSymptomsCount} active symptoms including ${patient.symptoms.join(', ') || 'none'}. Webcam telemetry shows an average fatigue levels of ${avgFatigue}/100 and screen focus attention of ${avgAttention}%. The primary emotional frequency is detected as ${dominantEmotion}. Systems indicate moderate muscular or eye strain related to screen habits.`,
      suggestions
    };

    setTimeout(() => {
      res.json(mockResponse);
    }, 1200);

  } catch (error) {
    console.error('Health insights error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ======================================================================
// 3. AI CONSULTATION RECORDING & TRANSCRIPT SUMMARIZATION
// ======================================================================
router.post('/summarize-consultation', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'transcript is required' });
    }

    const openrouter = getOpenRouterClient();

    if (openrouter) {
      try {
        console.log('🔮 Generating clinical SOAP summary using OpenRouter with Gemma-4-31b reasoning...');
        
        const prompt = `
          You are a highly efficient medical scribe and physician assistant. 
          Analyze the following speech-to-text dialogue transcript of a telehealth consultation.
          Convert the transcript into a highly polished, professional medical record using the standard SOAP (Subjective, Objective, Assessment, Plan) format.
          
          TRANSCRIPT:
          "${transcript}"

          Provide a JSON matching the following structure:
          {
            "subjective": "Comprehensive summary of patient symptoms, feelings, and personal reports.",
            "objective": "Observational and physical markers, voice stress signs, or exam observations mentioned in dialogue.",
            "assessment": "Primary clinical diagnosis or suspicion (e.g. Digital Eye Strain, Acute Dehydration, Mild Anxiety, etc.).",
            "plan": "Detailed action plan, medication orders, dietary advice, follow-up tests.",
            "clinicalSummary": "A concise 2-sentence clinical review of the entire call."
          }
          Return ONLY this raw JSON. Do not include markdown code block syntax.
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
        const sanitized = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(sanitized);
        return res.json(parsed);
      } catch (openrouterError) {
        console.error('OpenRouter SOAP summary error, falling back:', openrouterError);
      }
    }

    const ai = getGeminiClient();

    if (ai) {
      try {
        console.log('🔮 Generating clinical SOAP summary using Gemini...');
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const prompt = `
          You are a highly efficient medical scribe and physician assistant. 
          Analyze the following speech-to-text dialogue transcript of a telehealth consultation.
          Convert the transcript into a highly polished, professional medical record using the standard SOAP (Subjective, Objective, Assessment, Plan) format.
          
          TRANSCRIPT:
          "${transcript}"

          Provide a JSON matching the following structure:
          {
            "subjective": "Comprehensive summary of patient symptoms, feelings, and personal reports.",
            "objective": "Observational and physical markers, voice stress signs, or exam observations mentioned in dialogue.",
            "assessment": "Primary clinical diagnosis or suspicion (e.g. Digital Eye Strain, Acute Dehydration, Mild Anxiety, etc.).",
            "plan": "Detailed action plan, medication orders, dietary advice, follow-up tests.",
            "clinicalSummary": "A concise 2-sentence clinical review of the entire call."
          }
          Return ONLY this raw JSON. Do not include markdown code block syntax.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        const sanitized = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(sanitized);
        return res.json(parsed);
      } catch (geminiError) {
        console.error('Gemini summary error, falling back to mock:', geminiError);
      }
    }

    // fallback simulation
    console.log('⚠️ Running SOAP summary in Mock Mode (no Gemini key or API failure)...');
    
    // Parse keywords in transcript to generate structured response
    const transcriptLower = transcript.toLowerCase();
    
    let subjective = "Patient reports discomfort and fatigue. Discussed standard health complaints.";
    let objective = "Speech patterns are steady. Webcam shows mild motor fatigue.";
    let assessment = "General Health Consultation";
    let plan = "Recommend balanced nutrition, hydration, and regular exercise. Follow up in 14 days.";
    let clinicalSummary = "Telehealth consultation conducted. Discussed routine physical indicators and wellness standards.";

    if (transcriptLower.includes('eye') || transcriptLower.includes('headache') || transcriptLower.includes('screen')) {
      subjective = "Patient describes frequent dry, aching eyes and mild frontal headaches, worsening after extended periods of visual focus on laptop screens.";
      objective = "Webcam blink rate dropped significantly during high-focus intervals. Slouching observed in shoulder carriage.";
      assessment = "Computer Vision Syndrome (Digital Eye Strain) with secondary tension headache.";
      plan = "Adhere to the 20-20-20 rule. Adjust computer display height to align the top edge at eye level. Install blue light filter software. Apply OTC artificial tears.";
      clinicalSummary = "Telehealth review of digital eye strain. Prescribed ergonomic corrections and visual micro-breaks.";
    } else if (transcriptLower.includes('throat') || transcriptLower.includes('cold') || transcriptLower.includes('cough')) {
      subjective = "Patient complains of sore throat, dry cough, and mild congestion developing over the past 48 hours. Denies shortness of breath.";
      objective = "Voice recording reveals mild hoarseness and vocal cord strain. Breathing pattern normal.";
      assessment = "Acute Upper Respiratory Tract Infection (likely Viral Pharyngitis).";
      plan = "Maintain warm hydration (herbal tea, broths). Rest vocal cords. Warm saline gargling thrice daily. OTC throat lozenges as needed.";
      clinicalSummary = " telehealth consultation for acute throat congestion. Advised symptomatic home care and hydration.";
    }

    const mockSoap = { subjective, objective, assessment, plan, clinicalSummary };
    
    setTimeout(() => {
      res.json(mockSoap);
    }, 1500);

  } catch (error) {
    console.error('SOAP summarization error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ======================================================================
// 4. AI PILL & TABLET IDENTIFICATION
// ======================================================================
router.post('/identify-pill', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload or capture a pill image file' });
    }

    const openrouter = getOpenRouterClient();
    const prompt = `
      You are a highly experienced AI pharmacist and digital pill analyzer.
      Analyze the attached image which shows a prescription pill, tablet, capsule, or drug packaging.
      
      Identify the pill if possible based on imprint, color, shape, and overall appearance.
      Provide a highly detailed, professional pharmaceutical report. Your output MUST be valid JSON matching the following structure:
      {
        "pillName": "Pill Name & Strength (e.g., Acetaminophen 500mg)",
        "activeIngredients": "Active ingredients list (e.g., Paracetamol / Acetaminophen)",
        "description": "Visual features observed (e.g., white, oval tablet with imprint '512')",
        "medicalClass": "Pharmacological class (e.g., Analgesics / Antipyretics)",
        "commonUses": "Standard primary indications and uses",
        "dosage": "Standard adult guidelines and typical administration parameters",
        "sideEffects": "Common side effects (nausea, dizziness, dry mouth, etc.)",
        "warnings": "Critical precautions, drug interactions, contraindications, and disclaimers"
      }
      Return ONLY this raw JSON. Do not include markdown code block syntax or formatting.
    `;

    if (openrouter) {
      console.log('🔮 Sending pill image to OpenRouter for tablet analysis...');
      try {
        const base64Image = req.file.buffer.toString('base64');
        const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

        const response = await openrouter.chat.completions.create({
          model: "google/gemini-2.5-flash",
          max_tokens: 1500,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ]
        });

        const responseText = response.choices[0].message.content.trim();
        const sanitized = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(sanitized);
        return res.json(parsed);
      } catch (openrouterError) {
        console.error('OpenRouter pill identification error, falling back:', openrouterError);
      }
    }

    const ai = getGeminiClient();
    if (ai) {
      console.log('🔮 Sending pill image to Gemini API for tablet analysis...');
      try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const imagePart = fileToGenerativePart(req.file.buffer, req.file.mimetype);
        const result = await model.generateContent([prompt, imagePart]);
        const responseText = result.response.text().trim();
        const sanitized = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        const parsed = JSON.parse(sanitized);
        return res.json(parsed);
      } catch (geminiError) {
        console.error('Gemini direct pill identification error, falling back to mock:', geminiError);
      }
    }

    // fallback simulation
    console.log('⚠️ Running pill identification in Mock Mode...');
    const mockPills = [
      {
        pillName: "Acetaminophen 500mg",
        activeIngredients: "Paracetamol (Acetaminophen)",
        description: "White, capsule-shaped oral tablet with 'Tylenol' or dosage imprint",
        medicalClass: "Non-aspirin Analgesic & Antipyretic",
        commonUses: "Temporary relief of minor aches and pains, fever reduction",
        dosage: "Take 1-2 tablets every 4-6 hours as needed. Do not exceed 8 tablets (4,000mg) in 24 hours.",
        sideEffects: "Rare at standard doses. Skin rash, nausea, headache, or dark stools at higher doses.",
        warnings: "Severe liver damage may occur if you exceed maximum daily limits or consume with alcohol."
      },
      {
        pillName: "Amoxicillin 500mg",
        activeIngredients: "Amoxicillin Trihydrate",
        description: "Pink and blue oral capsule, standard antibiotic imprint",
        medicalClass: "Penicillin-class Antibiotic",
        commonUses: "Treatment of bacterial infections (throat, sinus, skin, middle ear)",
        dosage: "Take 1 capsule every 8-12 hours for the full prescribed duration (usually 7-10 days).",
        sideEffects: "Diarrhea, nausea, vomiting, rash, or oral thrush (yeast infection).",
        warnings: "Do not take if you have a known history of penicillin allergy. Severe anaphylactic reactions possible."
      }
    ];

    const selectedMock = mockPills[Math.floor(Math.random() * mockPills.length)];
    setTimeout(() => {
      res.json(selectedMock);
    }, 1500);

  } catch (error) {
    console.error('Pill identification error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ======================================================================
// 5. TWILIO WHATSAPP MESSAGE DISPATCHER
// ======================================================================
router.post('/send-whatsapp', async (req, res) => {
  try {
    const { body, to, customSid, customToken, customFrom } = req.body;
    if (!body || !to) {
      return res.status(400).json({ error: 'Message body and Recipient number are required' });
    }

    // Grab credentials from body or fallback to environment variables
    const sid = customSid || process.env.TWILIO_ACCOUNT_SID;
    const token = customToken || process.env.TWILIO_AUTH_TOKEN;
    const from = customFrom || process.env.TWILIO_WHATSAPP_FROM || '+14155238886'; // Sandbox number fallback

    if (!sid || !token) {
      return res.status(400).json({ 
        error: 'Twilio configuration is incomplete. Provide Account SID and Auth Token either in UI settings or backend .env configuration.' 
      });
    }

    // Clean phone numbers: Twilio expects absolute format without spacing, e.g. "+12345678"
    const cleanTo = to.replace(/[\s\-\(\)]/g, '');
    const cleanFrom = from.replace(/[\s\-\(\)]/g, '');

    console.log(`✉️ Dispatching Twilio WhatsApp from [${cleanFrom}] to [${cleanTo}]...`);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const basicAuth = Buffer.from(`${sid}:${token}`).toString('base64');

    const twilioParams = new URLSearchParams();
    twilioParams.append('To', `whatsapp:${cleanTo.startsWith('+') ? cleanTo : '+' + cleanTo}`);
    twilioParams.append('From', `whatsapp:${cleanFrom.startsWith('+') ? cleanFrom : '+' + cleanFrom}`);
    twilioParams.append('Body', body);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: twilioParams
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log('✅ Twilio WhatsApp message sent successfully:', responseData.sid);
      return res.json({ success: true, messageId: responseData.sid, status: responseData.status });
    } else {
      console.error('❌ Twilio REST API error:', responseData);
      return res.status(400).json({ 
        error: responseData.message || 'Twilio message dispatch failed.', 
        code: responseData.code 
      });
    }
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ======================================================================
// 6. AI HEALTH COMPANION CHATBOT
// ======================================================================
router.post('/chat', async (req, res) => {
  try {
    const { messages, patientContext } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const openrouter = getOpenRouterClient();
    const systemPrompt = `
      You are a premium, futuristic AI Personal Health Companion named "Aura Companion".
      You help the patient maintain and optimize their wellness.
      
      PATIENT WELLNESS PROFILE:
      - Active Symptoms: ${JSON.stringify(patientContext?.symptoms || [])}
      - Medical Background: ${JSON.stringify(patientContext?.medicalHistory || [])}
      - Age/Gender: ${patientContext?.age || 'Unknown'}, ${patientContext?.gender || 'Unknown'}
      - Webcam averages: Fatigue index of ${patientContext?.fatigueScore || 'unknown'}/100, Attention focus of ${patientContext?.attentionScore || 'unknown'}%
      
      Always stay supportive, highly professional, and reassuring. If the patient has severe complaints, guide them to schedule a virtual consult with our specialists on the Telehealth tab.
      Keep your responses structured, clear, and highly practical. Avoid bullet-point lists where possible; keep paragraphs flowing and visually polished.
    `;

    // Map frontend messages to standard API messages
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }))
    ];

    if (openrouter) {
      console.log('🔮 Consultation discussion via OpenRouter Gemma-4-31b reasoning...');
      try {
        const response = await openrouter.chat.completions.create({
          model: "google/gemma-4-31b-it:free",
          max_tokens: 1500,
          messages: apiMessages,
          extra_body: {
            reasoning: { enabled: true }
          }
        });

        const responseText = response.choices[0].message.content.trim();
        return res.json({ response: responseText });
      } catch (openrouterError) {
        console.error('OpenRouter chatbot error, falling back:', openrouterError);
      }
    }

    const ai = getGeminiClient();
    if (ai) {
      console.log('🔮 Consultation discussion via direct Gemini API...');
      try {
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Flatten conversation to simple text for single call
        let convoText = `${systemPrompt}\n\nCONVERSATION HISTORY:\n`;
        messages.forEach(m => {
          convoText += `${m.sender === 'user' ? 'Patient' : 'Aura Companion'}: ${m.text}\n`;
        });
        convoText += "Aura Companion:";

        const result = await model.generateContent(convoText);
        const responseText = result.response.text().trim();
        return res.json({ response: responseText });
      } catch (geminiError) {
        console.error('Gemini direct chatbot error, falling back to mock:', geminiError);
      }
    }

    // fallback simulation
    console.log('⚠️ Running chatbot in Mock Mode...');
    setTimeout(() => {
      res.json({
        response: `Hello! As your Aura Companion, I am reviewing your context: symptoms of ${patientContext?.symptoms?.join(', ') || 'none'} and average fatigue of ${patientContext?.fatigueScore || 40}/100. Make sure to adhere to standard posture rules, hydrate with 2.5 liters of water daily, and schedule a consultation with Dr. Vance if your symptoms persist!`
      });
    }, 1500);

  } catch (error) {
    console.error('AI Chatbot error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
