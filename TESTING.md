# CollabFlow — Testing Guide

## Quick Local Test (5 Minutes)

```bash
# 1. Start backend
cd backend && npm install && npm run seed && npm run dev

# 2. Start frontend (new terminal)  
cd frontend && npm install && npm run dev

# 3. Open http://localhost:3000
# 4. Login: demo@collabflow.app / demo123
```

## Multi-User Collaboration Test

1. Login as `demo@collabflow.app` in **Chrome**
2. Open any document → click **Share** → copy link
3. Open the link in **Firefox** (or incognito tab)
4. Login as `alice@collabflow.app / alice123`

**Expected behavior:**
- Both users see each other's avatars in the top-right presence panel
- Typing in Chrome → appears in Firefox with <200ms latency
- Typing indicator (pulsing dots) shows when remote user is typing
- Emoji reactions (❤️ 🔥 👏 😄) float up when clicked

## CRDT Conflict Test

1. **Disconnect** Firefox from the internet (DevTools → Network tab → "Offline")
2. **Both users** type at the same cursor position simultaneously
3. **Reconnect** Firefox
4. **Expected:** Both edits preserved — no characters lost

## Feature Checklist

| Feature | How to Test | Expected |
|---|---|---|
| Bold / Italic / Underline | Select text, click toolbar | Formatting applies, syncs to other users |
| Headings | Toolbar H1/H2/H3 buttons | Heading renders, syncs |
| Code block | `</>` button | Monospace block, syntax highlight |
| Save version | Ctrl+S or "Save v" button | Toast confirmation, appears in Version History |
| Restore version | Open history panel → Restore | Document content reverts |
| AI assistant | Click 🤖 → select text → "Improve writing" | AI result shown, can insert |
| Comments | Click 💬 → type comment → Submit | Comment persists, others see it |
| Share link | Click Share → Copy | Opening link in another tab opens same doc |
| Dark/Light mode | Implemented via next-themes | Toggle in settings (CSS vars change) |
| Auto-save | Type for 3+ seconds | "Saved X seconds ago" status updates |

## Edge Cases

| Scenario | How to Trigger | Expected Behavior |
|---|---|---|
| User disconnects mid-edit | Close browser tab during edit | Other users continue normally |
| Reconnect | Reopen closed tab | Document state synced from server |
| 5+ simultaneous users | Open 5 browser windows | All cursors visible, all edits sync |
| Large document | Paste 10,000 words | Editor responsive, sync continues |
| Invalid JWT | Modify localStorage token | Auto-redirect to /auth |
| Empty document | Delete all content | Placeholder shows, no crash |

## Demo Accounts

| Email | Password | Description |
|---|---|---|
| demo@collabflow.app | demo123 | Primary demo account |
| alice@collabflow.app | alice123 | Collaborator 1 |
| bob@collabflow.app | bob123 | Collaborator 2 |
| carol@collabflow.app | carol123 | Collaborator 3 |
