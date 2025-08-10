import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { user, pass } = req.body || {};
  const ok = user === process.env.AUTH_USER && pass === process.env.AUTH_PASS;
  if (!ok) return res.status(401).json({ ok: false });
  const token = jwt.sign({ u: user }, process.env.AUTH_SECRET || 'demo-secret', { expiresIn: '7d' });
  res.setHeader('Set-Cookie', serialize('sid', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60*60*24*7 }));
  res.json({ ok: true });
}