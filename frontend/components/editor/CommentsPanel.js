// components/editor/CommentsPanel.js
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useCollabStore } from '../../store';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function CommentsPanel({ documentId, socket, currentUser, onClose }) {
  const { comments, addComment, resolveComment } = useCollabStore();
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'open' | 'resolved'

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/documents/${documentId}/comments`, { text: newComment });
      addComment(data.comment);
      socket?.emit('comment:add', { documentId, comment: data.comment });
      setNewComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
    setSubmitting(false);
  };

  const handleResolve = async (commentId) => {
    try {
      await api.patch(`/documents/${documentId}/comments/${commentId}/resolve`);
      resolveComment(commentId);
      socket?.emit('comment:resolve', { documentId, commentId });
    } catch {
      toast.error('Failed to resolve');
    }
  };

  const filtered = comments.filter((c) => {
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-80 flex flex-col z-40 border-l shadow-2xl"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>

      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Comments
          </h3>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Filter tabs */}
        <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: 'var(--bg-tertiary)' }}>
          {['all', 'open', 'resolved'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${filter === f ? 'text-white' : ''}`}
              style={filter === f ? { background: 'var(--accent)' } : { color: 'var(--text-muted)' }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No {filter !== 'all' ? filter : ''} comments yet</p>
            </div>
          ) : (
            filtered.map((comment) => (
              <motion.div key={comment._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-xl border transition-all ${comment.resolved ? 'opacity-60' : ''}`}
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>

                {/* Author */}
                <div className="flex items-center gap-2 mb-3">
                  <img
                    src={comment.author?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.author?.username}`}
                    className="w-7 h-7 rounded-full" alt="" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {comment.author?.username}
                      </span>
                      {comment.resolved && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">Resolved</span>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                {/* Highlighted text */}
                {comment.highlightedText && (
                  <div className="mb-2 px-2 py-1.5 rounded-lg border-l-2 text-xs italic"
                    style={{ borderColor: 'var(--accent)', background: 'var(--accent-light)', color: 'var(--text-secondary)' }}>
                    "{comment.highlightedText}"
                  </div>
                )}

                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{comment.text}</p>

                {/* Actions */}
                {!comment.resolved && (
                  <button onClick={() => handleResolve(comment._id)}
                    className="mt-3 text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}>
                    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" />
                    </svg>
                    Resolve
                  </button>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* New comment input */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-start gap-2">
          <img src={currentUser?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser?.username}`}
            className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" alt="" />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl text-sm resize-none outline-none border transition-all"
              style={{
                background: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
            />
            <button onClick={handleSubmit} disabled={submitting || !newComment.trim()}
              className="mt-2 w-full py-2 rounded-xl text-xs font-medium text-white disabled:opacity-40 transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>
              {submitting ? 'Posting...' : 'Post Comment (⌘↵)'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
