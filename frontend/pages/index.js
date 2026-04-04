// pages/index.js — CollabFlow Landing Page
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store';

const FEATURES = [
  { icon: '⚡', title: 'Real-time CRDT Sync', desc: 'Conflict-free editing — every keystroke syncs instantly across all collaborators with zero data loss.' },
  { icon: '🎯', title: 'Live Cursors', desc: 'See exactly where each collaborator is typing with animated colored cursors and name labels.' },
  { icon: '🤖', title: 'AI Writing Assistant', desc: 'Built-in Claude AI to suggest, improve, and expand your writing — right inside the editor.' },
  { icon: '💬', title: 'Inline Comments', desc: 'Highlight any text and leave threaded comments. Resolve, reply, and stay in sync like Google Docs.' },
  { icon: '🕰️', title: 'Version History', desc: 'Every edit is tracked. Restore any previous version with a single click on the visual timeline.' },
  { icon: '🌐', title: 'Instant Sharing', desc: 'Share a single link — collaborators join with no signup required. Public or private, your choice.' },
];

const DEMO_USERS = [
  { name: 'Alex Chen', color: '#FF6B6B', action: 'editing introduction...' },
  { name: 'Priya Sharma', color: '#4ECDC4', action: 'commenting on section 2...' },
  { name: 'Marcus Johnson', color: '#96CEB4', action: 'adding bullet points...' },
  { name: 'Sofia Liu', color: '#DDA0DD', action: 'reviewing changes...' },
];

function FloatingOrb({ x, y, size, color, delay }) {
  return (
    <motion.div
      className="absolute rounded-full blur-3xl opacity-20 pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color }}
      animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.1, 0.95, 1] }}
      transition={{ duration: 12 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

function DemoEditor() {
  const [text, setText] = useState('');
  const [userIdx, setUserIdx] = useState(0);
  const fullText = 'The future of collaboration is here. Multiple minds, one canvas, zero conflict.';

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 45);
    const userCycle = setInterval(() => setUserIdx((p) => (p + 1) % DEMO_USERS.length), 2000);
    return () => { clearInterval(interval); clearInterval(userCycle); };
  }, []);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
      style={{ background: 'rgba(15,15,26,0.95)', backdropFilter: 'blur(40px)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <div className="flex-1 text-center text-xs text-white/40 font-mono">collabflow.app/doc/team-manifesto</div>
        <div className="flex -space-x-2">
          {DEMO_USERS.map((u, i) => (
            <div key={u.name} className="w-6 h-6 rounded-full border-2 border-surface-900 flex items-center justify-center text-xs font-bold"
              style={{ background: u.color, borderColor: '#0f0f1a' }}>
              {u.name[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Editor content */}
      <div className="p-8 min-h-64">
        <div className="text-white/30 text-sm mb-4 font-mono">Team Manifesto — v12 · Auto-saved</div>
        <h1 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Building the Future Together
        </h1>
        <p className="text-white/70 text-base leading-relaxed">
          {text}
          <motion.span className="inline-block w-0.5 h-4 bg-indigo-400 ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }} transition={{ duration: 0.8, repeat: Infinity }} />
        </p>

        {/* Active user indicator */}
        <AnimatePresence mode="wait">
          <motion.div key={userIdx} className="mt-6 flex items-center gap-2"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: DEMO_USERS[userIdx].color }} />
            <span className="text-xs" style={{ color: DEMO_USERS[userIdx].color }}>
              {DEMO_USERS[userIdx].name}
            </span>
            <span className="text-xs text-white/40">{DEMO_USERS[userIdx].action}</span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom status bar */}
      <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-white/30 font-mono">
        <span>4 collaborators · 0ms latency</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          CRDT Active
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);

  const handleCTA = () => router.push(isAuthenticated ? '/dashboard' : '/auth');

  return (
    <>
      <Head>
        <title>CollabFlow — Real-time Collaborative Editor</title>
        <meta name="description" content="Google Docs meets the future. Real-time collaboration with CRDT sync, AI writing assistant, and stunning UI." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen relative overflow-hidden" style={{ background: '#080812' }}>
        {/* Animated background orbs */}
        <FloatingOrb x={10} y={10} size={500} color="#6771f1" delay={0} />
        <FloatingOrb x={70} y={5} size={400} color="#a855f7" delay={3} />
        <FloatingOrb x={80} y={60} size={350} color="#3b82f6" delay={6} />
        <FloatingOrb x={5} y={70} size={300} color="#ec4899" delay={2} />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'linear-gradient(rgba(103,113,241,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(103,113,241,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>C</div>
            <span className="text-white font-bold text-xl tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              CollabFlow
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-white/60 hover:text-white text-sm transition-colors px-4 py-2">Sign in</Link>
            <button onClick={handleCTA}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>
              Get Started Free
            </button>
          </div>
        </nav>

        {/* Hero */}
        <motion.section style={{ y: heroY }} className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left copy */}
            <div>
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border border-indigo-500/30"
                  style={{ background: 'rgba(103,113,241,0.1)', color: '#a5bbfc' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Now with AI writing assistant
                </div>

                <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6"
                  style={{ fontFamily: 'Playfair Display, serif' }}>
                  Write together,{' '}
                  <span className="relative">
                    <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                      conflict-free
                    </span>
                  </span>
                </h1>

                <p className="text-lg text-white/60 leading-relaxed mb-10 max-w-xl">
                  A next-generation collaborative editor powered by CRDT — every keystroke syncs instantly,
                  every conflict resolves automatically. Built for teams that move fast.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={handleCTA}
                    className="px-8 py-4 rounded-2xl text-white font-semibold text-base transition-all hover:scale-105 active:scale-95 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)', boxShadow: '0 0 40px rgba(103,113,241,0.4)' }}>
                    Start collaborating →
                  </button>
                  <a href="#features"
                    className="px-8 py-4 rounded-2xl text-white/70 font-medium text-base border border-white/10 hover:border-white/30 transition-all hover:text-white">
                    See how it works
                  </a>
                </div>

                <div className="flex items-center gap-6 mt-10 text-sm text-white/40">
                  <span>✓ No credit card</span>
                  <span>✓ Free forever</span>
                  <span>✓ Instant sharing</span>
                </div>
              </motion.div>
            </div>

            {/* Right: demo editor */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
              <DemoEditor />
            </motion.div>
          </div>
        </motion.section>

        {/* Features */}
        <section id="features" className="relative z-10 max-w-7xl mx-auto px-8 py-24">
          <motion.div className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Everything you need to collaborate
            </h2>
            <p className="text-white/50 text-lg">Built for speed. Engineered for scale. Designed to delight.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="group p-6 rounded-2xl border border-white/10 hover:border-indigo-500/40 transition-all cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)' }}
                whileHover={{ y: -4, background: 'rgba(103,113,241,0.06)' }}>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-white font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA bottom */}
        <section className="relative z-10 max-w-4xl mx-auto px-8 py-24 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <div className="p-12 rounded-3xl border border-indigo-500/20 relative overflow-hidden"
              style={{ background: 'rgba(103,113,241,0.08)', backdropFilter: 'blur(40px)' }}>
              <div className="absolute inset-0 opacity-30"
                style={{ background: 'radial-gradient(circle at 50% 0%, rgba(103,113,241,0.4), transparent 70%)' }} />
              <div className="relative">
                <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Ready to collaborate at the speed of thought?
                </h2>
                <p className="text-white/50 mb-8">Join thousands of teams already using CollabFlow.</p>
                <button onClick={handleCTA}
                  className="px-10 py-4 rounded-2xl text-white font-semibold text-lg transition-all hover:scale-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)', boxShadow: '0 0 60px rgba(103,113,241,0.5)' }}>
                  Start for free →
                </button>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 text-center py-8 text-white/30 text-sm border-t border-white/5">
          <p>CollabFlow © 2025 · Built with ❤️ for collaboration</p>
        </footer>
      </div>
    </>
  );
}
