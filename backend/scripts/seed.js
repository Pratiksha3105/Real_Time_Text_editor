/**
 * Seed Script — Creates demo users and a sample document
 * Run: node scripts/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { User, Version } = require('../models/index');
const Document = require('../models/Document');
const crypto = require('crypto');

const DEMO_USERS = [
  { username: 'demo', email: 'demo@collabflow.app', password: 'demo123' },
  { username: 'alice', email: 'alice@collabflow.app', password: 'alice123' },
  { username: 'bob', email: 'bob@collabflow.app', password: 'bob123' },
  { username: 'carol', email: 'carol@collabflow.app', password: 'carol123' },
];

const SAMPLE_CONTENT = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Welcome to CollabFlow 🚀' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'This is a real-time collaborative document. Try opening it in multiple tabs or devices to experience the magic!' }] },
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Features' }] },
    { type: 'bulletList', content: [
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'CRDT-based sync' }, { type: 'text', text: ' — conflict-free real-time editing' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Live cursors' }, { type: 'text', text: ' — see where teammates are typing' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'AI assistant' }, { type: 'text', text: ' — powered by Claude for writing help' }] }] },
      { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Version history' }, { type: 'text', text: ' — restore any previous state' }] }] },
    ]},
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Getting Started' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Click the ' }, { type: 'text', marks: [{ type: 'bold' }], text: 'Share' }, { type: 'text', text: ' button above to get a shareable link. Open that link in another browser window and start editing — you\'ll see real-time collaboration in action!' }] },
    { type: 'codeBlock', content: [{ type: 'text', text: '// CRDT ensures no edit is ever lost\n// even when two users type at the same time\nconst doc = new CRDTDocument(siteId);\ndoc.localInsert("H", 0, "Alice"); // Alice types\ndoc.localInsert("i", 0, "Bob");   // Bob types simultaneously\n// Both edits preserved, no conflict!' }] },
  ],
};

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/collabflow');
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Document.deleteMany({});
  await Version.deleteMany({});
  console.log('Cleared existing data');

  // Create users
  const users = await Promise.all(
    DEMO_USERS.map((u) => User.create(u))
  );
  console.log(`Created ${users.length} demo users`);

  // Create sample document
  const doc = await Document.create({
    title: 'Welcome to CollabFlow 🚀',
    content: SAMPLE_CONTENT,
    owner: users[0]._id,
    collaborators: users.slice(1).map((u) => u._id),
    isPublic: true,
    shareToken: crypto.randomBytes(16).toString('hex'),
    wordCount: 120,
  });

  // Create a few versions
  await Version.create([
    { documentId: doc._id, content: { type: 'doc', content: [] }, label: 'Initial draft', createdBy: users[0]._id, version: 1 },
    { documentId: doc._id, content: SAMPLE_CONTENT, label: 'Added features section', createdBy: users[1]._id, version: 2 },
  ]);

  console.log(`Created demo document: ${doc._id}`);
  console.log('\n✅ Seed complete!\n');
  console.log('Demo accounts:');
  DEMO_USERS.forEach((u) => console.log(`  ${u.email} / ${u.password}`));
  console.log(`\nSample document ID: ${doc._id}`);

  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });
