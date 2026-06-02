// voiceCommands.js - Client-side speech recognition router & synthesis vocalizer

// Standard Text-To-Speech Speaker
export const speakText = (text, onEndCallback) => {
  if (!('speechSynthesis' in window)) {
    console.warn('⚠️ Web Speech Synthesis is not supported in this browser.');
    if (onEndCallback) onEndCallback();
    return;
  }

  // Cancel any active speaking
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Find a nice natural English voice if available
  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || 
                        voices.find(v => v.lang.startsWith('en') && v.name.includes('Natural')) ||
                        voices.find(v => v.lang.startsWith('en'));
  
  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }
  
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  utterance.onend = () => {
    if (onEndCallback) onEndCallback();
  };

  utterance.onerror = (err) => {
    console.error('Speech synthesis error:', err);
    if (onEndCallback) onEndCallback();
  };

  window.speechSynthesis.speak(utterance);
};

// Main Speech Command Router
export const parseVoiceCommand = (transcript, actions) => {
  const text = transcript.toLowerCase().trim();
  console.log(`🎙️ Parsing Voice Command: "${text}"`);

  // 1. READ PRESCRIPTION
  if (text.includes('read') && (text.includes('prescription') || text.includes('medicine') || text.includes('rx'))) {
    if (actions.readPrescription) {
      actions.readPrescription();
      return { matched: true, action: 'read-prescription', feedback: 'Reading your active prescription aloud.' };
    }
  }

  // 2. NAVIGATE WEBSITE
  if (text.includes('go to') || text.includes('navigate') || text.includes('show') || text.includes('open')) {
    if (text.includes('vision') || text.includes('telemetry') || text.includes('camera') || text.includes('webcam')) {
      actions.navigate('/vision');
      return { matched: true, action: 'navigate', feedback: 'Navigating to Webcam Vision Health Telemetry.' };
    }
    if (text.includes('consultation') || text.includes('call') || text.includes('doctor') || text.includes('video')) {
      actions.navigate('/consultation');
      return { matched: true, action: 'navigate', feedback: 'Navigating to Video Consultation Clinic.' };
    }
    if (text.includes('image') || text.includes('rash') || text.includes('skin') || text.includes('upload')) {
      actions.navigate('/image-analysis');
      return { matched: true, action: 'navigate', feedback: 'Navigating to AI Medical Image Analysis.' };
    }
    if (text.includes('insight') || text.includes('wellness') || text.includes('score') || text.includes('history')) {
      actions.navigate('/insights');
      return { matched: true, action: 'navigate', feedback: 'Navigating to Diagnostic Health Insights.' };
    }
    if (text.includes('dashboard') || text.includes('home')) {
      actions.navigate('/');
      return { matched: true, action: 'navigate', feedback: 'Returning to Home Dashboard.' };
    }
  }

  // 3. SEARCH DOCTOR BY SPECIALTY OR NAME
  if (text.includes('search') || text.includes('find') || text.includes('filter')) {
    let specialty = '';
    if (text.includes('optometrist') || text.includes('eye')) specialty = 'Optometrist';
    else if (text.includes('dermatologist') || text.includes('skin') || text.includes('rash')) specialty = 'Dermatologist';
    else if (text.includes('neurologist') || text.includes('brain') || text.includes('nerve')) specialty = 'Neurologist';
    else if (text.includes('practitioner') || text.includes('doctor') || text.includes('general')) specialty = 'General Practitioner';

    if (specialty && actions.searchDoctor) {
      actions.searchDoctor(specialty);
      return { 
        matched: true, 
        action: 'search-doctor', 
        feedback: `Filtering directories for our resident ${specialty}.` 
      };
    }
  }

  // 4. BOOK APPOINTMENT
  if (text.includes('book') || text.includes('appointment') || text.includes('schedule')) {
    // Attempt to extract doctor
    let doctorSearchName = '';
    if (text.includes('vance')) doctorSearchName = 'Dr. Elizabeth Vance';
    else if (text.includes('chen')) doctorSearchName = 'Dr. Sarah Chen';
    else if (text.includes('brody')) doctorSearchName = 'Dr. Marcus Brody';
    else if (text.includes('rostova')) doctorSearchName = 'Dr. Elena Rostova';

    if (actions.bookAppointment) {
      actions.bookAppointment(doctorSearchName);
      return { 
        matched: true, 
        action: 'book-appointment', 
        feedback: doctorSearchName 
          ? `Booking an appointment with ${doctorSearchName}.` 
          : 'Opening the appointment booking portal. Which specialist would you like to schedule?'
      };
    }
  }

  // 5. ASK HEALTH QUESTIONS (Forward to Gemini)
  const Q_TRIGGERS = ['ask', 'question', 'why', 'what', 'how', 'tell me', 'can you', 'is it', 'should i'];
  const isQuestion = Q_TRIGGERS.some(trigger => text.startsWith(trigger)) || text.endsWith('?');

  if (isQuestion && actions.askAI) {
    actions.askAI(transcript); // Send full original text
    return { matched: true, action: 'ask-ai', feedback: 'Consulting Aura AI Clinical Expert...' };
  }

  return { matched: false, feedback: "Command not recognized. Try speaking: 'go to consultation', 'read prescription', or 'ask: why do dry eyes happen?'" };
};
