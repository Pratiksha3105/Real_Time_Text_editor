// pages/dashboard.js
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, useDocumentStore } from '../store';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import Link from 'next/link';

function DocCard({ doc, onDelete }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const wordCount = doc.wordCount || 0;
  const updated = formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative p-5 rounded-2xl border cursor-pointer transition-all hover:border-indigo-500/40"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      onClick={() => router.push(`/editor/${doc._id}`)}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-hover)' }}>

      {/* Doc icon */}
      <div className="w-10 h-12 rounded-lg flex items-center justify-center mb-4 text-xl"
        style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
        📄
      </div>

      <h3 className="font-semibold text-sm mb-1 truncate pr-6" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        {doc.title || 'Untitled Document'}
      </h3>
      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
        {updated} · {wordCount} words
      </p>

      <div className="flex items-center gap-2">
        <img src={doc.owner?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${doc.owner?.username}`}
          className="w-5 h-5 rounded-full" alt="" />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{doc.owner?.username}</span>
        {doc.isPublic && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(103,113,241,0.15)', color: 'var(--accent)' }}>
            Shared
          </span>
        )}
      </div>

      {/* Actions menu */}
      <button
        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--bg-tertiary)' }}
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}>
        <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" style={{ color: 'var(--text-muted)' }}>
          <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-12 right-4 z-20 rounded-xl border py-1 min-w-36 shadow-xl"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}>
            <button onClick={() => router.push(`/editor/${doc._id}`)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors" style={{ color: 'var(--text-primary)' }}>
              Open
            </button>
            <button onClick={() => { onDelete(doc._id); setShowMenu(false); }}
              className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { documents, isLoading, fetchDocuments, createDocument, deleteDocument } = useDocumentStore();
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth'); return; }
    fetchDocuments();
  }, [isAuthenticated]);

  const handleCreate = async () => {
    setCreating(true);
    const doc = await createDocument('Untitled Document');
    setCreating(false);
    if (doc) router.push(`/editor/${doc._id}`);
    else toast.error('Failed to create document');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document permanently?')) return;
    const ok = await deleteDocument(id);
    if (ok) toast.success('Document deleted');
    else toast.error('Delete failed');
  };

  const filtered = documents.filter((d) =>
    d.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Head><title>CollabFlow — Dashboard</title></Head>
      <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

        {/* Sidebar */}
        <div className="flex h-screen">
          <aside className="w-64 flex-shrink-0 flex flex-col border-r py-6 px-4"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
            {/* Logo */}
            <div className="flex items-center gap-2 px-2 mb-8">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>C</div>
              <span className="font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                CollabFlow
              </span>
            </div>

            {/* New doc button */}
            <button onClick={handleCreate} disabled={creating}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium mb-6 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>
              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
              {creating ? 'Creating...' : 'New Document'}
            </button>

            {/* Nav items */}
            <nav className="space-y-1 flex-1">
              {[
                { label: 'All Documents', icon: '📂', active: true },
                { label: 'Recent', icon: '🕐' },
                { label: 'Shared with me', icon: '👥' },
                { label: 'Starred', icon: '⭐' },
              ].map((item) => (
                <div key={item.label}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm cursor-pointer transition-colors ${item.active ? 'font-medium' : ''}`}
                  style={{
                    background: item.active ? 'var(--accent-light)' : 'transparent',
                    color: item.active ? 'var(--accent)' : 'var(--text-muted)',
                  }}>
                  <span>{item.icon}</span>
                  {item.label}
                </div>
              ))}
            </nav>

            {/* User profile */}
            <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3 px-2">
                <img src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
                  className="w-9 h-9 rounded-full" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.username}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
                </div>
                <button onClick={logout} className="text-xs px-2 py-1 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors">
                  Out
                </button>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.username} 👋
                </h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  {documents.length} document{documents.length !== 1 ? 's' : ''} total
                </p>
              </div>

              {/* Search */}
              <div className="relative">
                <svg viewBox="0 0 16 16" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5"
                  style={{ color: 'var(--text-muted)' }}>
                  <circle cx="6.5" cy="6.5" r="4" /><path d="M10 10l3 3" strokeLinecap="round" />
                </svg>
                <input
                  placeholder="Search documents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none border w-64 transition-all"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Documents grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ background: 'var(--bg-secondary)' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-5xl mb-4">📄</div>
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  {search ? 'No results found' : 'No documents yet'}
                </h3>
                <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                  {search ? 'Try a different search term' : 'Create your first document to get started'}
                </p>
                {!search && (
                  <button onClick={handleCreate}
                    className="px-6 py-3 rounded-xl text-white text-sm font-medium transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>
                    Create Document
                  </button>
                )}
              </div>
            ) : (
              <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence>
                  {filtered.map((doc) => (
                    <DocCard key={doc._id} doc={doc} onDelete={handleDelete} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
