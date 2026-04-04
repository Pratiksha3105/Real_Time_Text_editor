// components/editor/VersionHistory.js
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function VersionHistory({ documentId, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    api.get(`/documents/${documentId}/versions`).then(({ data }) => {
      setVersions(data.versions);
      setLoading(false);
    });
  }, [documentId]);

  const handleRestore = async (version) => {
    if (!confirm(`Restore to "${version.label}"? Current content will be preserved as a new version.`)) return;
    setRestoring(true);
    try {
      const { data } = await api.post(`/documents/${documentId}/versions/${version._id}/restore`);
      toast.success(`Restored to "${version.label}"`);
      onRestore(data.document.content);
      onClose();
    } catch {
      toast.error('Failed to restore version');
    }
    setRestoring(false);
  };

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-80 flex flex-col z-40 border-l shadow-2xl"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>

      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Version History
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {versions.length} snapshot{versions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
            ))}
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🕰️</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No versions saved yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Versions are saved automatically or when you click "Save Version"
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-6 bottom-6 w-px" style={{ background: 'var(--border-color)' }} />

            <div className="space-y-3">
              <AnimatePresence>
                {versions.map((v, i) => (
                  <motion.div
                    key={v._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`relative pl-10 cursor-pointer group`}
                    onClick={() => setSelected(selected?._id === v._id ? null : v)}>

                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 transition-all group-hover:scale-125"
                      style={{
                        background: selected?._id === v._id ? 'var(--accent)' : 'var(--bg-secondary)',
                        borderColor: selected?._id === v._id ? 'var(--accent)' : 'var(--border-color)',
                      }} />

                    <div className={`p-3.5 rounded-xl border transition-all ${selected?._id === v._id ? 'border-indigo-500/40' : 'hover:border-white/20'}`}
                      style={{
                        background: selected?._id === v._id ? 'var(--accent-light)' : 'var(--bg-primary)',
                        borderColor: selected?._id === v._id ? undefined : 'var(--border-color)',
                      }}>

                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{v.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                          </p>
                          {v.createdBy && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <img src={v.createdBy.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${v.createdBy.username}`}
                                className="w-4 h-4 rounded-full" alt="" />
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.createdBy.username}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                          v{v.version}
                        </div>
                      </div>

                      <AnimatePresence>
                        {selected?._id === v._id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} className="mt-3">
                            <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                              {format(new Date(v.createdAt), 'MMM d, yyyy · h:mm a')}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestore(v); }}
                              disabled={restoring}
                              className="w-full py-2 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>
                              {restoring ? 'Restoring...' : '↩ Restore this version'}
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
