// scripts/migrate_role.js
// Run with: node scripts/migrate_role.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Patient from '../src/models/Patient.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aura_ai';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    const result = await Patient.updateMany({ role: { $exists: false } }, { $set: { role: 'patient' } });
    console.log(`Modified ${result.modifiedCount} patient documents`);
    process.exit(0);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
