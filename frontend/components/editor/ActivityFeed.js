// components/editor/ActivityFeed.js
import { motion, AnimatePresence } from 'framer-motion';
import { useCollabStore } from '../../store';
import { formatDistanceToNow } from 'date-fns';

const ACTION_ICONS = {
  joined: '👋',
  left: '🚶',
  edited: '✏️',
  commented: '💬',
  saved: '💾',
  restored: '↩️',
  shared: '🔗',
};

export default function ActivityFeed({ onClose }) {
  const { activityFeed } = useCollabStore();

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-16 bottom-0 w-72 flex flex-col z-40 border-r shadow-2xl"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>

      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            Live Activity
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{activityFeed.length} events</p>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-xs"
          style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        <AnimatePresence>
          {activityFeed.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📡</div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Activity will appear here</p>
            </div>
          ) : (
            activityFeed.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'var(--bg-primary)' }}>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: activity.color + '22', color: activity.color }}>
                  {ACTION_ICONS[activity.action] || '•'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: activity.color }}>{activity.username}</span>
                    {' '}{activity.action}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Live indicator */}
      <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-color)' }}>
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Live — updates in real time</span>
      </div>
    </motion.div>
  );
}
