/**
 * User Model
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },
  avatar: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    maxlength: 200,
    default: '',
  },
  preferences: {
    theme: { type: String, enum: ['light', 'dark'], default: 'dark' },
    fontSize: { type: Number, default: 16 },
  },
}, {
  timestamps: true,
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    avatar: this.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${this.username}`,
    bio: this.bio,
    preferences: this.preferences,
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

/**
 * Version Model (document snapshots)
 */
const versionSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  label: {
    type: String,
    default: 'Auto-save',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  version: {
    type: Number,
    required: true,
  },
  wordCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

const Version = mongoose.model('Version', versionSchema);

/**
 * Comment Model
 */
const commentSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
    index: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  position: {
    from: Number,
    to: Number,
  },
  highlightedText: String,
  resolved: {
    type: Boolean,
    default: false,
  },
  replies: [{
    text: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

const Comment = mongoose.model('Comment', commentSchema);

module.exports = { User, Version, Comment };
