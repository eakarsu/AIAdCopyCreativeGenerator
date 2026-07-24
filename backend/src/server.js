const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}
if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) {
  throw new Error('DATABASE_URL or DB_PASSWORD must be configured');
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

const pool = require('./db');

const authRoutes = require('./routes/auth');
const featuresRoutes = require('./routes/features');
const aiRoutes = require('./routes/ai');
const abTestRoutes = require('./routes/ab-tests');
const campaignRoutes = require('./routes/campaigns');
const brandProfileRoutes = require('./routes/brand-profiles');
const shareRoutes = require('./routes/share');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS: restrict to specific origins from env var or defaults
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000,http://localhost:5173';
const allowedOrigins = rawAllowedOrigins.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps) or matching origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// General rate limiter for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Limit is 100 per 15 minutes. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth-specific rate limiter (brute force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many auth attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI rate limiter: 20 requests per hour keyed by user ID from JWT
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => {
    return req.user ? String(req.user.id) : ipKeyGenerator(req.ip);
  },
  message: { error: 'Too many AI requests. Limit is 20 per hour per user. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general limiter globally
app.use(generalLimiter);
app.use('/api', require('../runtimeAcceptance'));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/features', featuresRoutes);

// AI routes: auth first, then rate limit
app.use('/api/ai', authMiddleware, aiRateLimiter, aiRoutes);

// A/B test routes
app.use('/api/ab-tests', abTestRoutes);

// Campaign routes
app.use('/api/campaigns', campaignRoutes);

// Brand profile routes
app.use('/api/brand-profiles', brandProfileRoutes);
app.use('/api/publishing-workflows', require('./routes/publishingWorkflow'));

// Public share route (no auth)
app.use('/api/share', shareRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});

module.exports = app;
