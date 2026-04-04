/**
 * Document Routes - /api/documents
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Document = require('../models/Document');
const { Version, Comment } = require('../models/index');
const { protect } = require('../middleware/auth');

// GET /api/documents - List user's documents
router.get('/', protect, async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [{ owner: req.user.id }, { collaborators: req.user.id }],
    })
      .populate('owner', 'username avatar')
      .populate('lastEditedBy', 'username')
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json({ documents: docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents - Create document
router.post('/', protect, async (req, res) => {
  try {
    const { title } = req.body;
    const doc = await Document.create({
      title: title || 'Untitled Document',
      owner: req.user.id,
      shareToken: crypto.randomBytes(16).toString('hex'),
    });

    res.status(201).json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/share/:token - Access via share link (no auth required)
// ⚠️ MUST be before /:id or Express will match "share" as an id param
router.get('/share/:token', async (req, res) => {
  try {
    const doc = await Document.findOne({ shareToken: req.params.token })
      .populate('owner', 'username avatar')
      .lean();

    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id - Get single document
router.get('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.user.id },
        { collaborators: req.user.id },
        { isPublic: true },
      ],
    })
      .populate('owner', 'username avatar email')
      .populate('collaborators', 'username avatar')
      .lean();

    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/documents/:id - Update document
router.patch('/:id', protect, async (req, res) => {
  try {
    const { title, content, isPublic, wordCount } = req.body;

    const doc = await Document.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ owner: req.user.id }, { collaborators: req.user.id }],
      },
      { title, content, isPublic, wordCount, lastEditedBy: req.user.id },
      { new: true }
    );

    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json({ document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    await Version.deleteMany({ documentId: req.params.id });
    await Comment.deleteMany({ documentId: req.params.id });
    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/share - Toggle share link
router.post('/:id/share', protect, async (req, res) => {
  try {
    const { isPublic } = req.body;
    const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    doc.isPublic = isPublic;
    if (isPublic && !doc.shareToken) {
      doc.shareToken = crypto.randomBytes(16).toString('hex');
    }
    await doc.save();

    res.json({ shareToken: doc.shareToken, isPublic: doc.isPublic });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/versions
router.get('/:id/versions', protect, async (req, res) => {
  try {
    const versions = await Version.find({ documentId: req.params.id })
      .populate('createdBy', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ versions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/versions
router.post('/:id/versions', protect, async (req, res) => {
  try {
    const { content, label } = req.body;
    const versionCount = await Version.countDocuments({ documentId: req.params.id });

    const version = await Version.create({
      documentId: req.params.id,
      content,
      label: label || `Snapshot ${versionCount + 1}`,
      createdBy: req.user.id,
      version: versionCount + 1,
    });

    res.status(201).json({ version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/versions/:versionId/restore
router.post('/:id/versions/:versionId/restore', protect, async (req, res) => {
  try {
    const version = await Version.findById(req.params.versionId);
    if (!version) return res.status(404).json({ error: 'Version not found' });

    const doc = await Document.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { content: version.content, lastEditedBy: req.user.id },
      { new: true }
    );

    res.json({ document: doc, restoredFrom: version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents/:id/comments
router.get('/:id/comments', protect, async (req, res) => {
  try {
    const comments = await Comment.find({ documentId: req.params.id })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ comments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/documents/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text, position, highlightedText } = req.body;
    const comment = await Comment.create({
      documentId: req.params.id,
      text,
      author: req.user.id,
      position,
      highlightedText,
    });

    const populated = await comment.populate('author', 'username avatar');
    res.status(201).json({ comment: populated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/documents/:id/comments/:commentId/resolve
router.patch('/:id/comments/:commentId/resolve', protect, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.commentId,
      { resolved: true },
      { new: true }
    );
    res.json({ comment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
