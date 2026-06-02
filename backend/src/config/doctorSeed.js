import bcrypt from 'bcryptjs';
import Doctor from '../models/Doctor.js';

const seedDoctors = [
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

export const ensureSeedDoctors = async () => {
  try {
    const doctorCount = await Doctor.countDocuments();
    if (doctorCount > 0) {
      console.log('✅ Doctor collection already seeded. Skipping doctor seeding.');
      return;
    }

    console.log('🔧 No doctors found in MongoDB; seeding default doctor accounts...');
    for (const doctorData of seedDoctors) {
      const existing = await Doctor.findOne({ email: doctorData.email });
      if (existing) {
        continue;
      }
      const hashedPassword = await bcrypt.hash(doctorData.password, 10);
      await new Doctor({
        name: doctorData.name,
        specialty: doctorData.specialty,
        email: doctorData.email,
        password: hashedPassword
      }).save();
      console.log(`Created doctor account: ${doctorData.email}`);
    }
    console.log('✅ Default doctor seeding complete.');
  } catch (error) {
    console.error('Error while seeding doctors:', error);
  }
};
