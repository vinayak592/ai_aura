import mongoose from 'mongoose';

const HealthAnalysisSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  timestamp: { type: Date, default: Date.now },
  emotionData: {
    happy: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    angry: { type: Number, default: 0 },
    stressed: { type: Number, default: 0 }
  },
  fatigueScore: { type: Number, default: 0 },
  blinkRate: { type: Number, default: 0 },
  attentionScore: { type: Number, default: 0 },
  presenceDuration: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.models.HealthAnalysis || mongoose.model('HealthAnalysis', HealthAnalysisSchema);
