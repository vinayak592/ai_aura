// dbMock.js - seed mock data for development
export const mockPatients = [];
export const mockConsultations = [];
export const mockHealthAnalyses = [];
export const mockAppointments = [];

// Seed doctors (4) with IDs and passwords (hashed for "password123")
// Use bcrypt hash: $2a$10$7R40c6/zWqG3n2rE5L/jzeo4XwP61G2p/MvUuQYw5h34J31i66iGu
export const mockDoctors = [
  {
    _id: "doc_1",
    name: "Dr. Elizabeth Vance",
    specialty: "Optometrist",
    email: "elizabeth.vance@example.com",
    password: "doc1",
    room: "Clinic Room A",
    availability: "Mon, Wed, Fri 9AM-5PM"
  },
  {
    _id: "doc_2",
    name: "Dr. Sarah Chen",
    specialty: "Dermatologist",
    email: "sarah.chen@example.com",
    password: "doc2",
    room: "Clinic Room B",
    availability: "Tue, Thu 10AM-6PM"
  },
  {
    _id: "doc_3",
    name: "Dr. Marcus Brody",
    specialty: "General Practitioner",
    email: "marcus.brody@example.com",
    password: "doc3",
    room: "Clinic Room C",
    availability: "Mon-Thu 8AM-4PM"
  },
  {
    _id: "doc_4",
    name: "Dr. Elena Rostova",
    specialty: "Neurologist",
    email: "elena.rostova@example.com",
    password: "doc4",
    room: "Clinic Suite D",
    availability: "Friday 10AM-3PM"
  }
];

// Seed patient for instant testing (unchanged)
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

// Remaining mock data (consultations, health analyses, appointments) unchanged – omitted for brevity
