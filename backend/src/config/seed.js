import Doctor from '../models/Doctor.js';
import Patient from '../models/Patient.js';
import Appointment from '../models/Appointment.js';
import { mockDoctors, mockPatients, mockAppointments } from './dbMock.js';

export const seedDemoData = async () => {
  try {
    // Seed demo doctors if they don't already exist in MongoDB
    for (const doctorData of mockDoctors) {
      const existingDoctor = await Doctor.findOne({ email: doctorData.email });
      if (!existingDoctor) {
        await Doctor.create({
          name: doctorData.name,
          specialty: doctorData.specialty,
          email: doctorData.email,
          password: doctorData.password
        });
      }
    }

    // Seed demo patient if needed
    if (mockPatients.length > 0) {
      const patientData = mockPatients[0];
      const existingPatient = await Patient.findOne({ email: patientData.email });
      if (!existingPatient) {
        await Patient.create({
          name: patientData.name,
          role: 'patient',
          email: patientData.email,
          password: patientData.password,
          age: patientData.age,
          gender: patientData.gender,
          medicalHistory: patientData.medicalHistory,
          symptoms: patientData.symptoms,
          baselineFaceDescriptor: patientData.baselineFaceDescriptor || []
        });
      }
    }

    // Seed demo appointments if needed
    for (const appointmentData of mockAppointments) {
      const existingAppointment = await Appointment.findOne({
        doctorId: appointmentData.doctorId,
        patientId: appointmentData.patientId,
        date: appointmentData.date,
        time: appointmentData.time
      });
      if (!existingAppointment) {
        await Appointment.create({
          patientId: appointmentData.patientId,
          doctorId: appointmentData.doctorId,
          doctorName: appointmentData.doctorName,
          date: appointmentData.date,
          time: appointmentData.time,
          patientName: appointmentData.patientName,
          room: appointmentData.room
        });
      }
    }

    console.log('🌱 Demo data seeding completed successfully.');
  } catch (error) {
    console.error('❌ Seeding demo data failed:', error);
  }
};
