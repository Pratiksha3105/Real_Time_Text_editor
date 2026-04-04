# CollabFlow — Deployment Guide

## Stack
- **Frontend** → Vercel (free)
- **Backend** → Render or Railway
- **Database** → MongoDB Atlas (free M0 tier)
- **Redis** → Upstash (optional, for multi-instance scaling)

---

## Step 1: MongoDB Atlas

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Create free account
2. Create cluster → choose **M0 Free Tier** → any region
3. **Database Access** → Add User → username + password
4. **Network Access** → Add IP → `0.0.0.0/0` (allow all — required for Render's dynamic IPs)
5. **Connect** → Drivers → Copy the URI:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/collabflow
   ```

---

## Step 2: Deploy Backend to Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo → select the `backend/` root directory
4. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node version:** 18
5. **Environment Variables** (in Render dashboard):
   ```
   PORT=10000
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://...   ← from Atlas
   JWT_SECRET=<run: openssl rand -hex 32>
   JWT_EXPIRES_IN=30d
   FRONTEND_URL=https://your-app.vercel.app   ← fill after Vercel deploy
   ANTHROPIC_API_KEY=sk-ant-...   ← optional, for AI features
   ```
6. Deploy → note the URL: `https://collabflow-backend.onrender.com`

> ⚠️ **Render free tier sleeps after 15 min idle.** First request after sleep takes ~30s.
> Upgrade to Starter ($7/mo) or use Railway for always-on.

---

## Step 3: Deploy Frontend to Vercel

```bash
cd frontend

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Framework: Next.js (auto-detected)
# - Root directory: . (already in frontend/)
```

**Set Environment Variables in Vercel Dashboard** (Project → Settings → Environment Variables):
```
NEXT_PUBLIC_API_URL=https://collabflow-backend.onrender.com
NEXT_PUBLIC_WS_URL=https://collabflow-backend.onrender.com
ANTHROPIC_API_KEY=sk-ant-...   ← same key as backend (for Next.js API route)
```

**Redeploy** after setting env vars.

---

## Step 4: Update Backend CORS

Go back to Render → Environment Variables → update:
```
FRONTEND_URL=https://your-actual-app.vercel.app
```
Render auto-redeploys.

---

## Step 5: Seed Demo Data (one-time)

SSH into Render shell or run locally pointing at Atlas:
```bash
cd backend
MONGODB_URI="mongodb+srv://..." node scripts/seed.js
```

---

## Optional: Redis (Upstash) for Scaling

If you deploy multiple backend instances, WebSocket events need to be shared via Redis.

1. Go to [upstash.com](https://upstash.com) → Create Redis database
2. Copy **Redis URL** (format: `rediss://:password@endpoint:6380`)
3. Add to Render env vars:
   ```
   REDIS_URL=rediss://:password@your-endpoint.upstash.io:6380
   ```
The server auto-connects on startup if `REDIS_URL` is set.

---

## Verifying the Deploy

1. Open `https://your-app.vercel.app` → landing page loads
2. Click "Get Started" → sign in with demo credentials
3. Create a document → open share link in another browser
4. Both users should see each other's cursors

---

## Custom Domain (optional)

- **Vercel:** Project Settings → Domains → Add your domain → update DNS
- **Render:** Settings → Custom Domains → follow DNS instructions
