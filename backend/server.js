/**
 * CollabFlow - Backend Server (FINAL WORKING)
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
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

// ─── ✅ FINAL CORS FIX (IMPORTANT) ────────────────────────────────────

// Allow all origins + handle preflight
app.use(cors());
app.options('*', cors());

// ─── MIDDLEWARE ───────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
}));

// ─── SOCKET.IO SETUP ──────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ─── ROUTES ───────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/ai', aiRoutes);

// Test routes
app.get('/', (req, res) => {
  res.send('Backend running 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ─── SOCKET AUTH ──────────────────────────────────────────────────────

io.use(verifySocketToken);

// ─── SOCKET HANDLER ───────────────────────────────────────────────────

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.user?.username}`);
  handleDocumentSocket(io, socket);
});

// ─── DATABASE ─────────────────────────────────────────────────────────

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB error:', err.message);
    process.exit(1);
  }
}

// ─── ERROR HANDLER ────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ error: err.message });
});

// ─── START SERVER ─────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

start();

module.exports = { app, io };