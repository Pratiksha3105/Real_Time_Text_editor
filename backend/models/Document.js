/**
 * Document Model
 */

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'Untitled Document',
    trim: true,
    maxlength: 255,
  },
  content: {
    type: mongoose.Schema.Types.Mixed, // TipTap JSON or plain text
    default: { type: 'doc', content: [{ type: 'paragraph' }] },
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isPublic: {
    type: Boolean,
    default: false,
  },
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  wordCount: {
    type: Number,
    default: 0,
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  tags: [String],
}, {
  timestamps: true,
});

// Text index for search
documentSchema.index({ title: 'text' });

documentSchema.methods.generateShareToken = function () {
  const crypto = require('crypto');
  this.shareToken = crypto.randomBytes(16).toString('hex');
  return this.shareToken;
};

module.exports = mongoose.model('Document', documentSchema);
