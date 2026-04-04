// pages/api/health.js — Frontend health check
export default function handler(req, res) {
  res.status(200).json({ status: 'ok', service: 'collabflow-frontend', timestamp: new Date().toISOString() });
}
