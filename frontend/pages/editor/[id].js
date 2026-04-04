// pages/editor/[id].js — Main Collaborative Editor
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { useAuthStore, useDocumentStore, useCollabStore, useEditorStore } from '../../store';
import { getSocket } from '../../lib/socket';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

// Components
import EditorToolbar from '../../components/editor/EditorToolbar';
import PresencePanel from '../../components/editor/PresencePanel';
import AIAssistant from '../../components/editor/AIAssistant';
import VersionHistory from '../../components/editor/VersionHistory';
import CommentsPanel from '../../components/editor/CommentsPanel';
import ActivityFeed from '../../components/editor/ActivityFeed';

// Debounce helper
function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

export default function EditorPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, token, isAuthenticated } = useAuthStore();
  const { currentDocument, fetchDocument, updateDocument, isSaving, lastSaved } = useDocumentStore();
  const { addUser, removeUser, setUsers, setTyping, addActivity, setComments, reset } = useCollabStore();
  const { updateStats } = useEditorStore();
  const { wordCount, charCount, typingSpeed } = useEditorStore();
  const { showComments, showVersions, showActivityFeed, toggleComments, toggleVersions, toggleActivityFeed } = useCollabStore();

  const socketRef = useRef(null);
  const isRemoteUpdate = useRef(false);
  const typingTimerRef = useRef(null);

  const [title, setTitle] = useState('Untitled Document');
  const [showAI, setShowAI] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [emojiReactions, setEmojiReactions] = useState([]);
  const [theme, setTheme] = useState('dark');

  // ─── TIPTAP EDITOR SETUP ──────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: { depth: 100 },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your masterpiece… or let AI help you begin 🚀' }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
    ],
    editorProps: {
      attributes: {
        class: 'prose-editor focus:outline-none',
        spellCheck: 'true',
      },
    },
    onUpdate: ({ editor }) => {
      if (isRemoteUpdate.current) return;

      const content = editor.getJSON();
      const text = editor.getText();
      updateStats(text);

      // Emit update via socket
      socketRef.current?.emit('document:update', {
        documentId: id,
        content,
        title,
      });

      // Typing indicator
      socketRef.current?.emit('typing:start', { documentId: id });
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        socketRef.current?.emit('typing:stop', { documentId: id });
      }, 1500);

      // Activity log (debounced)
      debouncedActivity('edited');

      // Auto-save triggered server-side via socket
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      socketRef.current?.emit('cursor:update', {
        documentId: id,
        cursor: { from, to },
        selection: { from, to, empty: editor.state.selection.empty },
      });
    },
  });

  const debouncedActivity = useCallback(
    debounce((action) => {
      socketRef.current?.emit('activity:log', { documentId: id, action });
    }, 3000),
    [id]
  );

  // ─── FETCH DOCUMENT ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth'); return; }
    if (!id) return;

    fetchDocument(id).then((doc) => {
      if (!doc) { toast.error('Document not found'); router.push('/dashboard'); return; }
      setTitle(doc.title || 'Untitled Document');
      if (editor && doc.content) {
        isRemoteUpdate.current = true;
        editor.commands.setContent(doc.content);
        isRemoteUpdate.current = false;
      }
      // Load comments
      api.get(`/documents/${id}/comments`).then(({ data }) => setComments(data.comments));
    });

    return () => reset();
  }, [id, editor]);

  // ─── SOCKET SETUP ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id || !token || !editor) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('document:join', { documentId: id });
      addActivity({ action: 'joined', username: user?.username, color: '#6771f1', timestamp: Date.now() });
    });

    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => toast.error('Connection lost. Retrying...'));

    // Receive full document state when joining
    socket.on('document:state', ({ document, users }) => {
      if (document.content && editor) {
        isRemoteUpdate.current = true;
        editor.commands.setContent(document.content);
        isRemoteUpdate.current = false;
      }
      setUsers(users || []);
    });

    // Remote document update (another user edited)
    socket.on('document:update', ({ content, title: remoteTitle, senderId }) => {
      if (senderId === socket.id) return;
      if (content && editor) {
        const { from, to } = editor.state.selection;
        isRemoteUpdate.current = true;
        editor.commands.setContent(content, false);
        // Restore cursor position
        editor.commands.setTextSelection({ from: Math.min(from, editor.state.doc.content.size), to: Math.min(to, editor.state.doc.content.size) });
        isRemoteUpdate.current = false;
      }
      if (remoteTitle) setTitle(remoteTitle);
    });

    // User events
    socket.on('user:joined', (userData) => {
      addUser(userData);
      addActivity({ action: 'joined', username: userData.username, color: userData.color, timestamp: Date.now() });
    });

    socket.on('user:left', ({ socketId, userId }) => {
      removeUser(socketId);
      addActivity({ action: 'left', username: '—', color: '#999', timestamp: Date.now() });
    });

    // Typing indicators
    socket.on('typing:start', ({ socketId }) => setTyping(socketId, true));
    socket.on('typing:stop', ({ socketId }) => setTyping(socketId, false));

    // Cursor updates (tracked via collaboration-cursor in full Yjs integration)
    socket.on('cursor:update', () => {});

    // Comments
    socket.on('comment:add', ({ comment }) => setComments((prev) => [comment, ...prev]));
    socket.on('comment:resolve', ({ commentId }) => {});

    // Activity feed
    socket.on('activity:log', (activity) => addActivity(activity));

    // Version saved notification
    socket.on('version:saved', ({ version, username }) => {
      toast.success(`${username} saved a version: "${version.label}"`);
    });

    // Emoji reactions
    socket.on('reaction:add', (reaction) => {
      setEmojiReactions((prev) => [...prev, { ...reaction, id: Date.now() }]);
      setTimeout(() => setEmojiReactions((prev) => prev.filter((r) => r.id !== reaction.id)), 3000);
    });

    return () => {
      socket.emit('document:leave', { documentId: id });
      socket.off('connect');
      socket.off('disconnect');
      socket.off('document:state');
      socket.off('document:update');
      socket.off('user:joined');
      socket.off('user:left');
      socket.off('typing:start');
      socket.off('typing:stop');
      socket.off('cursor:update');
      socket.off('activity:log');
      socket.off('version:saved');
      socket.off('reaction:add');
    };
  }, [id, token, editor]);

  // ─── TITLE SAVE ───────────────────────────────────────────────────────────

  const handleTitleChange = useCallback(
    debounce(async (newTitle) => {
      await updateDocument(id, { title: newTitle });
      socketRef.current?.emit('document:update', { documentId: id, title: newTitle });
    }, 1000),
    [id]
  );

  // ─── SHARE DOCUMENT ───────────────────────────────────────────────────────

  const handleShare = async () => {
    try {
      const { data } = await api.post(`/documents/${id}/share`, { isPublic: true });
      const link = `${window.location.origin}/share/${data.shareToken}`;
      setShareLink(link);
      setShareModal(true);
    } catch {
      toast.error('Failed to generate share link');
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success('Link copied to clipboard!');
  };

  // ─── SAVE VERSION ─────────────────────────────────────────────────────────

  const saveVersion = async () => {
    const label = prompt('Version label (optional):', `Snapshot by ${user?.username}`);
    if (label === null) return;
    socketRef.current?.emit('version:save', {
      documentId: id,
      content: editor?.getJSON(),
      label: label || `Snapshot by ${user?.username}`,
    });
    toast.success('Version saved!');
  };

  // ─── EMOJI REACTION ───────────────────────────────────────────────────────

  const sendReaction = (emoji) => {
    socketRef.current?.emit('reaction:add', { documentId: id, emoji });
    setEmojiReactions((prev) => [...prev, { emoji, username: user?.username, color: '#6771f1', id: Date.now() }]);
    setTimeout(() => setEmojiReactions((prev) => prev.filter((_, i) => i !== 0)), 3000);
  };

  // ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveVersion();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [editor]);

  if (!id) return null;

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>{title} — CollabFlow</title>
      </Head>

      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>

        {/* ── HEADER ── */}
        <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b z-30 relative"
          style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>

          {/* Logo + back */}
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}>
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M10 3L5 8l5 5" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>CF</span>
          </button>

          <div className="w-px h-5 flex-shrink-0" style={{ background: 'var(--border-color)' }} />

          {/* Editable title */}
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              handleTitleChange(e.target.value);
            }}
            className="flex-1 min-w-0 text-base font-semibold bg-transparent outline-none border-none px-2 py-1 rounded-lg hover:bg-white/5 focus:bg-white/5 transition-colors"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', maxWidth: 400 }}
            placeholder="Untitled Document"
          />

          {/* Save status */}
          <div className="flex items-center gap-1.5 text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {isSaving ? (
              <>
                <div className="w-3 h-3 rounded-full border border-current border-t-transparent animate-spin" />
                Saving...
              </>
            ) : lastSaved ? (
              <>
                <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 6l3 3 5-5" strokeLinecap="round" />
                </svg>
                {formatDistanceToNow(lastSaved, { addSuffix: true })}
              </>
            ) : null}
          </div>

          <div className="flex-1" />

          {/* Stats */}
          <div className="hidden md:flex items-center gap-3 text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            <span>{wordCount} words</span>
            <span>{typingSpeed} wpm</span>
          </div>

          {/* Presence */}
          <PresencePanel currentUser={user} />

          {/* Connection indicator */}
          <div className="flex items-center gap-1.5 text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} ${isConnected ? 'animate-pulse' : ''}`} />
            {isConnected ? 'Live' : 'Offline'}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Emoji reactions */}
            {['❤️', '🔥', '👏', '😄'].map((e) => (
              <button key={e} onClick={() => sendReaction(e)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-white/10 transition-all hover:scale-110 active:scale-95">
                {e}
              </button>
            ))}

            <div className="w-px h-5" style={{ background: 'var(--border-color)' }} />

            {/* Panel toggles */}
            {[
              { icon: '📡', label: 'Activity', action: toggleActivityFeed, active: showActivityFeed },
              { icon: '💬', label: 'Comments', action: toggleComments, active: showComments },
              { icon: '🕰️', label: 'History', action: toggleVersions, active: showVersions },
              { icon: '🤖', label: 'AI', action: () => setShowAI(!showAI), active: showAI },
            ].map((btn) => (
              <button key={btn.label} onClick={btn.action} title={btn.label}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-105 ${btn.active ? 'ring-1' : 'hover:bg-white/10'}`}
                style={btn.active ? { background: 'var(--accent-light)', ringColor: 'var(--accent)' } : {}}>
                {btn.icon}
              </button>
            ))}

            <button onClick={saveVersion}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:border-indigo-500/40"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
              Save v
            </button>

            <button onClick={handleShare}
              className="px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>
              Share
            </button>
          </div>
        </header>

        {/* ── TOOLBAR ── */}
        <div className="flex-shrink-0" style={{ background: 'var(--bg-secondary)' }}>
          <EditorToolbar editor={editor} />
        </div>

        {/* ── MAIN EDITOR AREA ── */}
        <div className="flex-1 overflow-auto relative">
          {/* Floating emoji reactions */}
          <AnimatePresence>
            {emojiReactions.map((r) => (
              <motion.div key={r.id}
                className="fixed z-50 text-3xl pointer-events-none select-none"
                style={{ left: `${20 + Math.random() * 60}%`, bottom: '20%' }}
                initial={{ opacity: 1, y: 0, scale: 1 }}
                animate={{ opacity: 0, y: -120, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2.5 }}>
                {r.emoji}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Editor content */}
          <div className="max-w-4xl mx-auto px-8 py-12 pb-32">
            <EditorContent editor={editor} className="min-h-96" />
          </div>
        </div>

        {/* ── SIDEPANELS ── */}
        <AnimatePresence>
          {showAI && <AIAssistant editor={editor} onClose={() => setShowAI(false)} />}
          {showVersions && (
            <VersionHistory
              documentId={id}
              onRestore={(content) => {
                isRemoteUpdate.current = true;
                editor?.commands.setContent(content);
                isRemoteUpdate.current = false;
              }}
              onClose={toggleVersions}
            />
          )}
          {showComments && (
            <CommentsPanel
              documentId={id}
              socket={socketRef.current}
              currentUser={user}
              onClose={toggleComments}
            />
          )}
          {showActivityFeed && <ActivityFeed onClose={toggleActivityFeed} />}
        </AnimatePresence>

        {/* ── SHARE MODAL ── */}
        <AnimatePresence>
          {shareModal && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShareModal(false)} />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                className="relative z-10 p-6 rounded-2xl border w-full max-w-md mx-4"
                style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Share Document
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  Anyone with this link can view and edit this document.
                </p>
                <div className="flex gap-2">
                  <input readOnly value={shareLink}
                    className="flex-1 px-3 py-2.5 rounded-xl text-xs border outline-none"
                    style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }} />
                  <button onClick={copyShareLink}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>
                    Copy
                  </button>
                </div>
                <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                  💡 Open in another browser tab/window to test multi-user collaboration
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
