import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/db.js';
import Doctor from '../src/models/Doctor.js';

dotenv.config();

const doctors = [
  {
    name: 'Dr. Elizabeth Vance',
    specialty: 'Optometrist',
    email: 'elizabeth.vance@aura.ai',
    password: 'Doctor123!'
  },
  {
    name: 'Dr. Sarah Chen',
    specialty: 'Dermatologist',
    email: 'sarah.chen@aura.ai',
    password: 'Doctor123!'
  },
  {
    name: 'Dr. Marcus Brody',
    specialty: 'General Practitioner',
    email: 'marcus.brody@aura.ai',
    password: 'Doctor123!'
  },
  {
    name: 'Dr. Elena Rostova',
    specialty: 'Neurologist',
    email: 'elena.rostova@aura.ai',
    password: 'Doctor123!'
  }
];

const seedDoctors = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error('MongoDB connection failed. Please set MONGODB_URI in .env and try again.');
    process.exit(1);
  }

  for (const doctorData of doctors) {
    const existingDoctor = await Doctor.findOne({ email: doctorData.email });
    if (existingDoctor) {
      console.log(`Skipping existing doctor: ${doctorData.email}`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(doctorData.password, 10);
    const doctor = new Doctor({
      name: doctorData.name,
      specialty: doctorData.specialty,
      email: doctorData.email,
      password: hashedPassword
    });

    await doctor.save();
    console.log(`Created doctor account: ${doctorData.email}`);
  }

  console.log('Doctor seeding complete. Use the seeded email/password credentials to log in.');
  process.exit(0);
};

seedDoctors().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
