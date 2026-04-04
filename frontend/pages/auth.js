// pages/auth.js
import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const { login, register, isLoading } = useAuthStore();

  const validate = () => {
    const e = {};
    if (mode === 'register' && !form.username.trim()) e.username = 'Username required';
    if (!form.email.includes('@')) e.email = 'Valid email required';
    if (form.password.length < 6) e.password = 'Min 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const result = mode === 'login'
      ? await login(form.email, form.password)
      : await register(form.username, form.email, form.password);

    if (result.success) {
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created!');
      const redirect = router.query.redirect;
      router.push(redirect || '/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-xl text-sm outline-none transition-all bg-white/5 border ${
      errors[field] ? 'border-red-500/60' : 'border-white/10 focus:border-indigo-500/60'
    } text-white placeholder-white/30`;

  return (
    <>
      <Head><title>CollabFlow — Sign In</title></Head>
      <div className="min-h-screen flex relative" style={{ background: '#080812' }}>
        {/* Animated left panel */}
        <div className="hidden lg:flex flex-col justify-center flex-1 p-16 relative overflow-hidden">
          {/* Orbs */}
          {[
            { x: 20, y: 20, s: 400, c: '#6771f1', d: 0 },
            { x: 60, y: 50, s: 300, c: '#a855f7', d: 2 },
            { x: 10, y: 70, s: 250, c: '#3b82f6', d: 4 },
          ].map((orb, i) => (
            <motion.div key={i} className="absolute rounded-full blur-3xl opacity-20 pointer-events-none"
              style={{ left: `${orb.x}%`, top: `${orb.y}%`, width: orb.s, height: orb.s, background: orb.c }}
              animate={{ x: [0, 20, -15, 0], y: [0, -30, 15, 0] }}
              transition={{ duration: 10 + orb.d, repeat: Infinity, delay: orb.d }} />
          ))}

          <div className="relative z-10 max-w-lg">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl font-bold"
                style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>C</div>
              <span className="text-white font-bold text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>CollabFlow</span>
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              Where ideas become documents, together.
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-10">
              Real-time collaboration with CRDT sync, AI writing assistant, and beautiful version history.
            </p>

            {/* Feature bullets */}
            {[
              'Live multi-user editing with zero conflicts',
              'AI-powered writing suggestions',
              'Version history & instant restore',
              'Share via link — no signup needed',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3 mb-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(103,113,241,0.3)', color: '#a5bbfc' }}>
                  <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-white/60 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <div className="p-8 rounded-3xl border border-white/10"
              style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(40px)' }}>
              {/* Logo mobile */}
              <div className="flex items-center gap-2 mb-8 lg:hidden">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>C</div>
                <span className="text-white font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>CollabFlow</span>
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-xl p-1 mb-8 gap-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {['login', 'register'].map((m) => (
                  <button key={m} onClick={() => { setMode(m); setErrors({}); }}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      mode === m ? 'text-white shadow-lg' : 'text-white/40 hover:text-white/70'
                    }`}
                    style={mode === m ? { background: 'linear-gradient(135deg, #6771f1, #a855f7)' } : {}}>
                    {m === 'login' ? 'Sign In' : 'Create Account'}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.form key={mode} onSubmit={handleSubmit}
                  initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }} className="space-y-4">

                  {mode === 'register' && (
                    <div>
                      <input
                        className={inputClass('username')}
                        placeholder="Username"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                      />
                      {errors.username && <p className="text-red-400 text-xs mt-1">{errors.username}</p>}
                    </div>
                  )}

                  <div>
                    <input
                      type="email"
                      className={inputClass('email')}
                      placeholder="Email address"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <input
                      type="password"
                      className={inputClass('password')}
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                  </div>

                  <button type="submit" disabled={isLoading}
                    className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)', boxShadow: '0 0 30px rgba(103,113,241,0.3)' }}>
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="30" strokeDashoffset="10" />
                        </svg>
                        {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                      </span>
                    ) : mode === 'login' ? 'Sign In →' : 'Create Account →'}
                  </button>

                  {/* Demo credentials */}
                  {mode === 'login' && (
                    <div className="p-3 rounded-xl border border-indigo-500/20 text-center"
                      style={{ background: 'rgba(103,113,241,0.08)' }}>
                      <p className="text-xs text-white/40 mb-1">Demo credentials</p>
                      <button type="button"
                        onClick={() => setForm({ ...form, email: 'demo@collabflow.app', password: 'demo123' })}
                        className="text-xs text-indigo-400 hover:text-indigo-300 underline">
                        demo@collabflow.app / demo123
                      </button>
                    </div>
                  )}
                </motion.form>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
