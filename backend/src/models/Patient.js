import mongoose from 'mongoose';

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: { type: Number },
  gender: { type: String },
  medicalHistory: { type: [String], default: [] },
  symptoms: { type: [String], default: [] },
  baselineFaceDescriptor: { type: [Number], default: [] }
}, { timestamps: true });

export default mongoose.models.Patient || mongoose.model('Patient', PatientSchema);
