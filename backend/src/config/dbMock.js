// dbMock.js - seed mock data for development
export const mockPatients = [];
export const mockConsultations = [];
export const mockHealthAnalyses = [];
export const mockAppointments = [];

// Seed doctors with static credentials for demo doctor login
export const mockDoctors = [
  {
    _id: "doc_1",
    name: "Dr. Elizabeth Vance",
    specialty: "Optometrist",
    email: "doctor@aura.ai",
    password: "$2a$10$mm660HydujhVWvL9UD68HuS8J/AlDX79sQh2SJWRECP.DlVyf08XW", // hash of 'doctor123'
    room: "Clinic Room A",
    availability: "Mon, Wed, Fri 9AM-5PM"
  },
  {
    _id: "doc_2",
    name: "Dr. Sarah Chen",
    specialty: "Dermatologist",
    email: "sarah.chen@example.com",
    password: "$2a$10$.Is4FCnJpvmx4QzVGFVKG.GXrwX1.bKXOiw8lMusUHS2NtKiE6xpe", // hash of 'doc2'
    room: "Clinic Room B",
    availability: "Tue, Thu 10AM-6PM"
  },
  {
    _id: "doc_3",
    name: "Dr. Marcus Brody",
    specialty: "General Practitioner",
    email: "marcus.brody@example.com",
    password: "$2a$10$OPIIT.3V3J8hfWduuYymIeT9AV4v5Ejpp9a.dXed/ZN96ylVB2.cO", // hash of 'doc3'
    room: "Clinic Room C",
    availability: "Mon-Thu 8AM-4PM"
  },
  {
    _id: "doc_4",
    name: "Dr. Elena Rostova",
    specialty: "Neurologist",
    email: "elena.rostova@example.com",
    password: "$2a$10$2/ILc4KeeR1VjG.CCttxzu83KLCjyDGoIN4R.mfd4ECEW.7RunVQm", // hash of 'doc4'
    room: "Clinic Suite D",
    availability: "Friday 10AM-3PM"
  }
];

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

// Seed appointments for the static doctor account
mockAppointments.push(
  {
    _id: "appt_001",
    doctorId: "doc_1",
    doctorName: "Dr. Elizabeth Vance",
    patientId: "mock_patient_123",
    patientName: "Jane Doe",
    date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().slice(0, 10),
    time: "10:30",
    room: "Clinic Room A",
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: "appt_002",
    doctorId: "doc_1",
    doctorName: "Dr. Elizabeth Vance",
    patientId: "mock_patient_123",
    patientName: "Jane Doe",
    date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().slice(0, 10),
    time: "14:00",
    room: "Clinic Room A",
    createdAt: new Date(),
    updatedAt: new Date()
  }
);
