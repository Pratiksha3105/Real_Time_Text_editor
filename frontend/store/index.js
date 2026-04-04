/**
 * Global State Management - Zustand Stores
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

// ─── AUTH STORE ──────────────────────────────────────────────────────────────

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.error || 'Login failed' };
        }
      },

      register: async (username, email, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { username, email, password });
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          return { success: true };
        } catch (err) {
          set({ isLoading: false });
          return { success: false, error: err.response?.data?.error || 'Registration failed' };
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      updateUser: (userData) => set((state) => ({ user: { ...state.user, ...userData } })),

      initAuth: () => {
        const { token } = get();
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
      },
    }),
    {
      name: 'collabflow-auth',
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// ─── DOCUMENT STORE ──────────────────────────────────────────────────────────

export const useDocumentStore = create((set, get) => ({
  documents: [],
  currentDocument: null,
  isLoading: false,
  isSaving: false,
  lastSaved: null,

  fetchDocuments: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/documents');
      set({ documents: data.documents, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createDocument: async (title) => {
    try {
      const { data } = await api.post('/documents', { title });
      set((state) => ({ documents: [data.document, ...state.documents] }));
      return data.document;
    } catch (err) {
      console.error('createDocument error:', err.response?.data || err.message);
      return null;
    }
  },

  fetchDocument: async (id) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/documents/${id}`);
      set({ currentDocument: data.document, isLoading: false });
      return data.document;
    } catch (err) {
      set({ isLoading: false });
      return null;
    }
  },

  updateDocument: async (id, updates) => {
    set({ isSaving: true });
    try {
      const { data } = await api.patch(`/documents/${id}`, updates);
      set((state) => ({
        currentDocument: data.document,
        documents: state.documents.map((d) => (d._id === id ? data.document : d)),
        isSaving: false,
        lastSaved: new Date(),
      }));
    } catch (err) {
      set({ isSaving: false });
    }
  },

  deleteDocument: async (id) => {
    try {
      await api.delete(`/documents/${id}`);
      set((state) => ({
        documents: state.documents.filter((d) => d._id !== id),
        currentDocument: state.currentDocument?._id === id ? null : state.currentDocument,
      }));
      return true;
    } catch (err) {
      return false;
    }
  },

  setCurrentDocument: (doc) => set({ currentDocument: doc }),
  setSaving: (isSaving) => set({ isSaving }),
  setLastSaved: () => set({ lastSaved: new Date() }),
}));

// ─── COLLABORATION STORE ─────────────────────────────────────────────────────

export const useCollabStore = create((set, get) => ({
  activeUsers: [], // [{ socketId, userId, username, avatar, color, cursor, isTyping }]
  typingUsers: [],
  activityFeed: [],
  comments: [],
  showComments: false,
  showVersions: false,
  showActivityFeed: false,

  addUser: (user) => {
    set((state) => {
      const exists = state.activeUsers.find((u) => u.socketId === user.socketId);
      if (exists) return state;
      return { activeUsers: [...state.activeUsers, user] };
    });
  },

  removeUser: (socketId) => {
    set((state) => ({
      activeUsers: state.activeUsers.filter((u) => u.socketId !== socketId),
      typingUsers: state.typingUsers.filter((id) => id !== socketId),
    }));
  },

  updateUserCursor: (socketId, cursor, selection) => {
    set((state) => ({
      activeUsers: state.activeUsers.map((u) =>
        u.socketId === socketId ? { ...u, cursor, selection } : u
      ),
    }));
  },

  setTyping: (socketId, isTyping) => {
    set((state) => ({
      activeUsers: state.activeUsers.map((u) =>
        u.socketId === socketId ? { ...u, isTyping } : u
      ),
      typingUsers: isTyping
        ? [...new Set([...state.typingUsers, socketId])]
        : state.typingUsers.filter((id) => id !== socketId),
    }));
  },

  setUsers: (users) => set({ activeUsers: users }),

  addActivity: (activity) => {
    set((state) => ({
      activityFeed: [{ ...activity, id: Date.now() }, ...state.activityFeed].slice(0, 50),
    }));
  },

  setComments: (comments) => set({ comments }),

  addComment: (comment) => {
    set((state) => ({ comments: [comment, ...state.comments] }));
  },

  resolveComment: (commentId) => {
    set((state) => ({
      comments: state.comments.map((c) =>
        c._id === commentId ? { ...c, resolved: true } : c
      ),
    }));
  },

  toggleComments: () => set((state) => ({ showComments: !state.showComments })),
  toggleVersions: () => set((state) => ({ showVersions: !state.showVersions })),
  toggleActivityFeed: () => set((state) => ({ showActivityFeed: !state.showActivityFeed })),
  reset: () => set({ activeUsers: [], typingUsers: [], activityFeed: [], comments: [] }),
}));

// ─── EDITOR STORE ────────────────────────────────────────────────────────────

export const useEditorStore = create((set) => ({
  wordCount: 0,
  charCount: 0,
  typingSpeed: 0,
  lastTypingTime: null,
  keystrokes: [],

  updateStats: (text) => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const now = Date.now();

    set((state) => {
      const keystrokes = [...state.keystrokes, now].filter((t) => now - t < 60000);
      const typingSpeed = keystrokes.length; // words per minute approx

      return {
        wordCount: words,
        charCount: text.length,
        typingSpeed,
        lastTypingTime: now,
        keystrokes,
      };
    });
  },
}));
