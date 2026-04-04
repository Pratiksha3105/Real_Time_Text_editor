// components/editor/EditorToolbar.js
import { motion } from 'framer-motion';

const DIVIDER = '|';

function ToolButton({ onClick, active, title, children, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-30 ${
        active
          ? 'text-white'
          : 'hover:bg-white/10'
      }`}
      style={active ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-secondary)' }}>
      {children}
    </button>
  );
}

export default function EditorToolbar({ editor }) {
  if (!editor) return null;

  const groups = [
    // Text formatting
    [
      {
        title: 'Bold (⌘B)',
        action: () => editor.chain().focus().toggleBold().run(),
        active: editor.isActive('bold'),
        icon: <strong className="text-xs">B</strong>,
      },
      {
        title: 'Italic (⌘I)',
        action: () => editor.chain().focus().toggleItalic().run(),
        active: editor.isActive('italic'),
        icon: <em className="text-xs">I</em>,
      },
      {
        title: 'Underline (⌘U)',
        action: () => editor.chain().focus().toggleUnderline().run(),
        active: editor.isActive('underline'),
        icon: <span className="text-xs underline">U</span>,
      },
      {
        title: 'Strikethrough',
        action: () => editor.chain().focus().toggleStrike().run(),
        active: editor.isActive('strike'),
        icon: <span className="text-xs line-through">S</span>,
      },
      {
        title: 'Highlight',
        action: () => editor.chain().focus().toggleHighlight().run(),
        active: editor.isActive('highlight'),
        icon: <span className="text-xs" style={{ background: 'yellow', borderRadius: 2, padding: '0 2px', color: '#000' }}>H</span>,
      },
    ],
    // Headings
    [
      {
        title: 'Heading 1',
        action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        active: editor.isActive('heading', { level: 1 }),
        icon: <span className="text-xs font-bold">H1</span>,
      },
      {
        title: 'Heading 2',
        action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        active: editor.isActive('heading', { level: 2 }),
        icon: <span className="text-xs font-bold">H2</span>,
      },
      {
        title: 'Heading 3',
        action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        active: editor.isActive('heading', { level: 3 }),
        icon: <span className="text-xs font-bold">H3</span>,
      },
    ],
    // Lists & structure
    [
      {
        title: 'Bullet List',
        action: () => editor.chain().focus().toggleBulletList().run(),
        active: editor.isActive('bulletList'),
        icon: (
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="3" cy="5" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="3" cy="9" r="1.2" fill="currentColor" stroke="none" />
            <circle cx="3" cy="13" r="1.2" fill="currentColor" stroke="none" />
            <line x1="6" y1="5" x2="14" y2="5" strokeLinecap="round" />
            <line x1="6" y1="9" x2="14" y2="9" strokeLinecap="round" />
            <line x1="6" y1="13" x2="14" y2="13" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Ordered List',
        action: () => editor.chain().focus().toggleOrderedList().run(),
        active: editor.isActive('orderedList'),
        icon: (
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
            <text x="1" y="6" fontSize="6" fontFamily="monospace">1.</text>
            <text x="1" y="10" fontSize="6" fontFamily="monospace">2.</text>
            <text x="1" y="14" fontSize="6" fontFamily="monospace">3.</text>
            <rect x="7" y="3.5" width="8" height="1.5" rx="0.75" />
            <rect x="7" y="7.5" width="8" height="1.5" rx="0.75" />
            <rect x="7" y="11.5" width="8" height="1.5" rx="0.75" />
          </svg>
        ),
      },
      {
        title: 'Task List',
        action: () => editor.chain().focus().toggleTaskList().run(),
        active: editor.isActive('taskList'),
        icon: (
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="2" y="3" width="4" height="4" rx="1" />
            <path d="M3 5l1 1 2-2" strokeLinecap="round" />
            <rect x="2" y="9" width="4" height="4" rx="1" />
            <line x1="8" y1="5" x2="14" y2="5" strokeLinecap="round" />
            <line x1="8" y1="11" x2="14" y2="11" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Block Quote',
        action: () => editor.chain().focus().toggleBlockquote().run(),
        active: editor.isActive('blockquote'),
        icon: (
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
            <path d="M3 4a1 1 0 011-1h1a1 1 0 011 1v2a3 3 0 01-3 3v-1a2 2 0 002-2H4a1 1 0 01-1-1V4zm6 0a1 1 0 011-1h1a1 1 0 011 1v2a3 3 0 01-3 3v-1a2 2 0 002-2h-1a1 1 0 01-1-1V4z" />
          </svg>
        ),
      },
      {
        title: 'Code Block',
        action: () => editor.chain().focus().toggleCodeBlock().run(),
        active: editor.isActive('codeBlock'),
        icon: (
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M5 4L2 8l3 4M11 4l3 4-3 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
    // Alignment
    [
      {
        title: 'Align Left',
        action: () => editor.chain().focus().setTextAlign('left').run(),
        active: editor.isActive({ textAlign: 'left' }),
        icon: (
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="2" y1="4" x2="14" y2="4" strokeLinecap="round" />
            <line x1="2" y1="8" x2="10" y2="8" strokeLinecap="round" />
            <line x1="2" y1="12" x2="12" y2="12" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        title: 'Align Center',
        action: () => editor.chain().focus().setTextAlign('center').run(),
        active: editor.isActive({ textAlign: 'center' }),
        icon: (
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="2" y1="4" x2="14" y2="4" strokeLinecap="round" />
            <line x1="4" y1="8" x2="12" y2="8" strokeLinecap="round" />
            <line x1="3" y1="12" x2="13" y2="12" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
    // History
    [
      {
        title: 'Undo (⌘Z)',
        action: () => editor.chain().focus().undo().run(),
        active: false,
        disabled: !editor.can().undo(),
        icon: (
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 8a5 5 0 105-5H5" strokeLinecap="round" />
            <path d="M2 5l3-3-3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
      {
        title: 'Redo (⌘⇧Z)',
        action: () => editor.chain().focus().redo().run(),
        active: false,
        disabled: !editor.can().redo(),
        icon: (
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13 8a5 5 0 10-5-5h3" strokeLinecap="round" />
            <path d="M14 5l-3-3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 px-3 py-2 flex-wrap"
      style={{ borderBottom: '1px solid var(--border-color)' }}>
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && (
            <div className="w-px h-5 mx-1.5 flex-shrink-0" style={{ background: 'var(--border-color)' }} />
          )}
          {group.map((btn, bi) => (
            <ToolButton
              key={bi}
              title={btn.title}
              onClick={btn.action}
              active={btn.active}
              disabled={btn.disabled}>
              {btn.icon}
            </ToolButton>
          ))}
        </div>
      ))}
    </motion.div>
  );
}
