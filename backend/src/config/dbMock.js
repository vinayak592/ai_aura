export const mockPatients = [];
export const mockConsultations = [];
export const mockHealthAnalyses = [];
export const mockAppointments = [];

// Seed patient for instant testing
const hashedSeedPassword = "$2a$10$7R40c6/zWqG3n2rE5L/jzeo4XwP61G2p/MvUuQYw5h34J31i66iGu"; // hash of 'password123'
mockPatients.push({
  _id: "mock_patient_123",
  name: "Jane Doe",
  email: "jane@example.com",
  password: hashedSeedPassword,
  age: 28,
  gender: "Female",
  medicalHistory: ["Seasonal Allergies", "Asthma"],
  symptoms: ["Dry Eyes", "Headache", "Blurred Vision"],
  baselineFaceDescriptor: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

// Seed consultation
mockConsultations.push({
  _id: "mock_consult_1",
  patientId: "mock_patient_123",
  date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2), // 2 days ago
  doctorName: "Dr. Elizabeth Vance",
  transcript: "Patient complained of constant headache after working in front of a computer for 8 hours. Suggested taking breaks every 20 minutes (20-20-20 rule).",
  soapSummary: {
    subjective: "Patient reports constant headaches and eye strain towards the end of working hours. Denies fever, nausea, or vision loss.",
    objective: "Webcam visual attention shows patient turns head frequently. Blink rate is normal at 14 bpm but drops when focused.",
    assessment: "Digital Eye Strain (Computer Vision Syndrome).",
    plan: "Implement the 20-20-20 rule. Eye drops as needed for dry eyes. Limit non-work screen time.",
    clinicalSummary: "Digital Eye Strain related to work screen time. Plan includes behavioral modifications."
  },
  chatMessages: [
    { sender: "Doctor", message: "Hello Jane, how have your eyes been feeling?", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { sender: "Patient", message: "A bit dry and tired after long working hours.", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
  ]
});

// Seed health analysis logs
mockHealthAnalyses.push({
  _id: "mock_analysis_1",
  patientId: "mock_patient_123",
  timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 * 3),
  emotionData: { happy: 20, sad: 10, neutral: 60, angry: 0, stressed: 10 },
  fatigueScore: 42,
  blinkRate: 11,
  attentionScore: 88,
  presenceDuration: 300
});

mockHealthAnalyses.push({
  _id: "mock_analysis_2",
  patientId: "mock_patient_123",
  timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 * 1),
  emotionData: { happy: 10, sad: 15, neutral: 50, angry: 5, stressed: 20 },
  fatigueScore: 65,
  blinkRate: 8,
  attentionScore: 78,
  presenceDuration: 450
});

// Seed mock appointment
mockAppointments.push({
  _id: "mock_appointment_seed_1",
  patientId: "mock_patient_123",
  doctorName: "Dr. Elizabeth Vance",
  date: new Date().toISOString().slice(0, 10), // today
  time: "14:30",
  patientName: "Jane Doe",
  room: "Clinic Room A"
});
export const mockDoctors = [];
