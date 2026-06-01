// backend/src/middleware/auth.js
// JWT authentication middleware for Express
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'aura_ai_secret_key_development_only';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // { id, role }
    next();
  });
};

export const authorizeRole = (requiredRole) => (req, res, next) => {
  if (req.user.role !== requiredRole) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};
