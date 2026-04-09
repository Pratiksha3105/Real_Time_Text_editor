/**
 * CollabFlow - Real-time Collaborative Text Editor
 * Backend Server - Production Ready
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
const compression = require('compression');

// Route imports
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const commentRoutes = require('./routes/comments');
const aiRoutes = require('./routes/ai');

// Socket handlers
const { handleDocumentSocket } = require('./sockets/documentSocket');

// Utils
const { verifySocketToken } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// ─── CORS CONFIG (FIXED) ─────────────────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:3000',
  'https://real-time-text-editor-jet.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow Postman / server calls

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── SOCKET.IO SETUP ─────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://real-time-text-editor-jet.vercel.app'
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis adapter (optional)
async function setupRedisAdapter() {
  try {
    if (process.env.REDIS_URL) {
      const pubClient = new Redis(process.env.REDIS_URL);
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Redis adapter connected');
    }
  } catch (err) {
    logger.warn('Redis not available:', err.message);
  }
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ai', aiRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── SOCKET AUTH ─────────────────────────────────────────────────────────────

io.use(verifySocketToken);

// ─── SOCKET HANDLERS ─────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.user?.username} (${socket.id})`);
  handleDocumentSocket(io, socket);
});

// ─── DATABASE ────────────────────────────────────────────────────────────────

async function connectDB() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/collabflow',
      { serverSelectionTimeoutMS: 5000 }
    );
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB error:', err.message);
    process.exit(1);
  }
}

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

// ─── START SERVER ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  await setupRedisAdapter();
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

start();

module.exports = { app, io };