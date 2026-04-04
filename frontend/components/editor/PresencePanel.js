// components/editor/PresencePanel.js
import { motion, AnimatePresence } from 'framer-motion';
import { useCollabStore } from '../../store';

export default function PresencePanel({ currentUser }) {
  const { activeUsers, typingUsers } = useCollabStore();

  // Combine current user + others
  const allUsers = [
    { socketId: 'me', userId: currentUser?.id, username: currentUser?.username, avatar: currentUser?.avatar, color: '#6771f1', isTyping: false, isMe: true },
    ...activeUsers,
  ];

  return (
    <div className="flex items-center gap-1">
      <AnimatePresence>
        {allUsers.slice(0, 6).map((user) => (
          <motion.div
            key={user.socketId}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="relative group">
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 cursor-default transition-transform hover:scale-110 hover:z-10 relative"
              style={{ borderColor: user.color, background: user.color + '33' }}>
              {user.avatar ? (
                <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="" />
              ) : (
                <span style={{ color: user.color }}>{user.username?.[0]?.toUpperCase()}</span>
              )}

              {/* Typing indicator */}
              {user.isTyping && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: user.color }}>
                  <div className="flex gap-0.5 items-center">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="w-0.5 h-0.5 rounded-full bg-white"
                        style={{ animation: `bounce 0.8s ${i * 0.15}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Online indicator */}
              {!user.isTyping && (
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 bg-green-400"
                  style={{ borderColor: 'var(--bg-primary)' }} />
              )}
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              <div className="px-2 py-1 rounded-lg text-xs text-white whitespace-nowrap"
                style={{ background: user.color }}>
                {user.username}{user.isMe ? ' (you)' : ''}
                {user.isTyping && ' · typing...'}
              </div>
              <div className="w-1.5 h-1.5 rotate-45 mx-auto -mt-0.5" style={{ background: user.color }} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {allUsers.length > 6 && (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2"
          style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
          +{allUsers.length - 6}
        </div>
      )}

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
      `}</style>
    </div>
  );
}
