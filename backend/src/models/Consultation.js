import mongoose from 'mongoose';

const ConsultationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  date: { type: Date, default: Date.now },
  doctorName: { type: String, required: true },
  transcript: { type: String, default: '' },
  soapSummary: {
    subjective: { type: String, default: '' },
    objective: { type: String, default: '' },
    assessment: { type: String, default: '' },
    plan: { type: String, default: '' },
    clinicalSummary: { type: String, default: '' }
  },
  recordingUrl: { type: String, default: '' },
  chatMessages: [{
    sender: { type: String },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export default mongoose.models.Consultation || mongoose.model('Consultation', ConsultationSchema);
