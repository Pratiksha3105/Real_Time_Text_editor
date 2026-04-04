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

// Routes
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const commentRoutes = require('./routes/comments');
const aiRoutes = require('./routes/ai');

// Socket
const { handleDocumentSocket } = require('./sockets/documentSocket');

// Utils
const { verifySocketToken } = require('./middleware/auth');
const logger = require('./utils/logger');

const app = express();
const server = http.createServer(app);

// ─── ✅ FIXED CORS (IMPORTANT) ────────────────────────────────────────────────

const allowedOrigins = [
  'http://localhost:3000',
];

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

// ─── SOCKET.IO SETUP ───────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Redis (optional)
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

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─── SOCKET AUTH ──────────────────────────────────────────────────────────────

io.use(verifySocketToken);

// ─── SOCKET HANDLER ───────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.user?.username}`);
  handleDocumentSocket(io, socket);
});

// ─── DATABASE ─────────────────────────────────────────────────────────────────

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB error:', err.message);
    process.exit(1);
  }
}

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: err.message });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

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