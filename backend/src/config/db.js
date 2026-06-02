import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ MONGODB_URI is not defined. Aura AI will run using a local in-memory storage fallback.');
    return false;
  }

  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas successfully.');
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB Atlas:', err.message);
    console.warn('⚠️ Falling back to local in-memory storage.');
    return false;
  }
};

export const getDbStatus = () => isConnected;
