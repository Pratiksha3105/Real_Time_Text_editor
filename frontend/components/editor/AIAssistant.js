// components/editor/AIAssistant.js
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  { label: '✨ Improve writing', prompt: 'Improve the writing quality and clarity of this text:' },
  { label: '📝 Summarize', prompt: 'Write a concise summary of this text:' },
  { label: '🔄 Rephrase', prompt: 'Rephrase this text in a different way while preserving meaning:' },
  { label: '💡 Expand', prompt: 'Expand on this text with more details and examples:' },
  { label: '🎯 Make concise', prompt: 'Make this text more concise without losing key information:' },
  { label: '🌐 Formal tone', prompt: 'Rewrite this text in a more formal, professional tone:' },
  { label: '😊 Friendly tone', prompt: 'Rewrite this in a warm, friendly, conversational tone:' },
  { label: '🐛 Fix grammar', prompt: 'Fix all grammar and spelling errors in this text:' },
];

export default function AIAssistant({ editor, onClose }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const getSelectedOrAll = () => {
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      return editor.state.doc.textBetween(from, to, '\n');
    }
    return editor.getText();
  };

  const runAI = async (promptPrefix) => {
    const text = getSelectedOrAll();
    if (!text.trim()) {
      toast.error('No text to work with. Write something first!');
      return;
    }
    setSelectedText(text.slice(0, 100) + (text.length > 100 ? '...' : ''));
    setIsLoading(true);
    setResult('');

    try {
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${promptPrefix}\n\n"${text}"\n\nRespond with only the improved text, no explanations.`,
        }),
      });

      if (!response.ok) throw new Error('AI request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResult = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullResult += chunk;
        setResult(fullResult);
      }
    } catch (err) {
      // Fallback: use the Anthropic API directly from frontend
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.NEXT_PUBLIC_ANTHROPIC_KEY || '',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: `${promptPrefix}\n\n"${text}"\n\nRespond with only the improved text, no explanations or preamble.`,
            }],
          }),
        });
        const data = await response.json();
        setResult(data.content?.[0]?.text || 'No result');
      } catch (e) {
        toast.error('AI assistant unavailable. Check API key configuration.');
        setResult('');
      }
    }
    setIsLoading(false);
  };

  const handleCustom = () => {
    if (!input.trim()) return;
    runAI(input);
  };

  const applyResult = () => {
    if (!result) return;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      editor.chain().focus().deleteRange({ from, to }).insertContent(result).run();
    } else {
      editor.chain().focus().clearContent().insertContent(result).run();
    }
    setResult('');
    toast.success('Applied to document!');
  };

  return (
    <motion.div
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-96 flex flex-col z-40 border-l shadow-2xl"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>

      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div>
          <h3 className="font-semibold text-base" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
            AI Writing Assistant
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Powered by Claude</p>
        </div>
        <button onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          ✕
        </button>
      </div>

      {/* Quick actions */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>QUICK ACTIONS</p>
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s.label} onClick={() => runAI(s.prompt)} disabled={isLoading}
              className="px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all hover:border-indigo-500/40 disabled:opacity-50"
              style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
              whilehover={{ scale: 1.02 }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom prompt */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>CUSTOM PROMPT</p>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="E.g. 'Add more examples', 'Use simpler language'..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-sm resize-none outline-none border transition-all"
          style={{
            background: 'var(--bg-primary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-primary)',
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCustom();
          }}
        />
        <button onClick={handleCustom} disabled={isLoading || !input.trim()}
          className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>
          {isLoading ? '✨ Thinking...' : '✨ Ask Claude (⌘Enter)'}
        </button>
      </div>

      {/* Result */}
      <div className="flex-1 overflow-auto p-4">
        <AnimatePresence>
          {isLoading && !result && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: 'var(--accent-light)' }}>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--accent)', animation: `bounce 0.8s ${i * 0.15}s infinite` }} />
                ))}
              </div>
              <span className="text-sm" style={{ color: 'var(--accent)' }}>Claude is thinking...</span>
            </motion.div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>SUGGESTION</p>
              <div className="p-4 rounded-xl text-sm leading-relaxed border mb-3"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                {result}
              </div>
              <div className="flex gap-2">
                <button onClick={applyResult}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #6771f1, #a855f7)' }}>
                  Apply
                </button>
                <button onClick={() => setResult('')}
                  className="px-4 py-2.5 rounded-xl text-sm border transition-all hover:border-indigo-500/40"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
                  Discard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
