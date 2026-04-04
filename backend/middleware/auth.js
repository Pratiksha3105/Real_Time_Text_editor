/**
 * Auth Middleware
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models/index');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// HTTP route protection
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).lean();
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = { id: user._id.toString(), username: user.username, email: user.email };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Socket.IO auth middleware
const verifySocketToken = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).lean();

    if (!user) return next(new Error('User not found'));

    socket.user = {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`,
      email: user.email,
    };

    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
};

module.exports = { protect, verifySocketToken };
