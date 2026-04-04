/**
 * Document Socket Handler
 * Manages all real-time collaboration events per document room.
 */

const Document = require('../models/Document');
const Version = require('../models/Version');
const logger = require('../utils/logger');

// In-memory store
const activeSessions = new Map();

// Colors
const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F0B27A', '#82E0AA', '#F1948A', '#85929E', '#73C6B6',
];

function getUserColor(userId) {
  let hash = 0;
  const str = userId?.toString() || "user";

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

function getOrCreateSession(documentId) {
  if (!activeSessions.has(documentId)) {
    activeSessions.set(documentId, {
      users: new Map(),
      operationBuffer: [],
      saveTimer: null,
      version: 0,
    });
  }
  return activeSessions.get(documentId);
}

function scheduleAutoSave(documentId, content, title) {
  const session = activeSessions.get(documentId);
  if (!session) return;

  if (session.saveTimer) clearTimeout(session.saveTimer);

  session.saveTimer = setTimeout(async () => {
    try {
      await Document.findByIdAndUpdate(documentId, {
        content,
        title,
        updatedAt: new Date(),
      });
      logger.info(`Auto-saved document: ${documentId}`);
    } catch (err) {
      logger.error('Auto-save failed:', err.message);
    }
  }, 3000);
}

function handleDocumentSocket(io, socket) {
  const user = socket.user || {}; // ✅ prevent crash

  // JOIN
  socket.on('document:join', async ({ documentId }) => {
    try {
      if (!documentId) return;

      const doc = await Document.findOne({
        _id: documentId,
        $or: [
          { owner: user.id },
          { collaborators: user.id },
          { isPublic: true },
        ],
      }).lean();

      if (!doc) {
        socket.emit('error', { message: 'Access denied' });
        return;
      }

      const room = `doc:${documentId}`;
      socket.join(room);
      socket.currentDocumentId = documentId;

      const session = getOrCreateSession(documentId);
      const userColor = getUserColor(user.id);

      session.users.set(socket.id, {
        socketId: socket.id,
        userId: user.id,
        username: user.username || "User",
        avatar: user.avatar || "",
        color: userColor,
        cursor: null,
        selection: null,
        joinedAt: Date.now(),
        isTyping: false,
      });

      socket.emit('document:state', {
        document: doc,
        users: Array.from(session.users.values()),
        version: session.version,
      });

      socket.to(room).emit('user:joined', {
        socketId: socket.id,
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        color: userColor,
      });

    } catch (err) {
      logger.error('join error:', err.message);
    }
  });

  // OPERATIONS
  socket.on('document:operation', async (data) => {
    try {
      const { documentId, operation, content, title } = data;
      const session = activeSessions.get(documentId);
      if (!session) return;

      const room = `doc:${documentId}`;
      session.version++;

      socket.to(room).emit('document:operation', {
        operation,
        senderId: socket.id,
        userId: user.id,
        version: session.version,
        timestamp: Date.now(),
      });

      if (content !== undefined) {
        scheduleAutoSave(documentId, content, title);
      }

    } catch (err) {
      logger.error('operation error:', err.message);
    }
  });

  // UPDATE
  socket.on('document:update', async (data) => {
    try {
      const { documentId, content, title } = data;
      const room = `doc:${documentId}`;

      socket.to(room).emit('document:update', {
        content,
        title,
        senderId: socket.id,
        userId: user.id,
        timestamp: Date.now(),
      });

      scheduleAutoSave(documentId, content, title);

    } catch (err) {
      logger.error('update error:', err.message);
    }
  });

  // CURSOR
  socket.on('cursor:update', ({ documentId, cursor, selection }) => {
    const session = activeSessions.get(documentId);
    if (!session) return;

    const userInfo = session.users.get(socket.id);
    if (userInfo) {
      userInfo.cursor = cursor;
      userInfo.selection = selection;
    }

    socket.to(`doc:${documentId}`).emit('cursor:update', {
      socketId: socket.id,
      userId: user.id,
      cursor,
      selection,
    });
  });

  // TYPING
  socket.on('typing:start', ({ documentId }) => {
    socket.to(`doc:${documentId}`).emit('typing:start', {
      socketId: socket.id,
      userId: user.id,
      username: user.username,
    });
  });

  socket.on('typing:stop', ({ documentId }) => {
    socket.to(`doc:${documentId}`).emit('typing:stop', {
      socketId: socket.id,
      userId: user.id,
    });
  });

  // VERSION SAVE
  socket.on('version:save', async ({ documentId, content, label }) => {
    try {
      const version = new Version({
        documentId,
        content,
        label: label || "Auto Save",
        createdBy: user.id,
        version: await Version.countDocuments({ documentId }) + 1,
      });

      await version.save();

      socket.to(`doc:${documentId}`).emit('version:saved', {
        version,
        username: user.username,
      });

    } catch (err) {
      logger.error('version save error:', err.message);
    }
  });

  // DISCONNECT
  socket.on('disconnect', () => {
    const docId = socket.currentDocumentId;
    if (!docId) return;

    const session = activeSessions.get(docId);
    if (!session) return;

    session.users.delete(socket.id);

    socket.to(`doc:${docId}`).emit('user:left', {
      socketId: socket.id,
      userId: user.id,
    });

    if (session.users.size === 0) {
      if (session.saveTimer) clearTimeout(session.saveTimer);
      activeSessions.delete(docId);
    }
  });
}

module.exports = { handleDocumentSocket };