import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

function getCookie(req, name){
  const h = req.headers.cookie || '';
  const m = h.match(new RegExp('(?:^|; )'+name+'=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function handler(req, res) {
  const secret = process.env.AUTH_SECRET || 'demo-secret';
  if (req.method === 'GET') {
    try{
      const tok = getCookie(req, 'sid');
      if (!tok) return res.status(401).json({ ok:false });
      jwt.verify(tok, secret);
      return res.json({ ok:true });
    }catch{
      return res.status(401).json({ ok:false });
    }
  }
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { user, pass } = req.body || {};
    const ok = (user === 'dicacell' && pass === '@Dica007');
    if (!ok) return res.status(401).json({ ok: false });
    const token = jwt.sign({ u: user }, secret, { expiresIn: '7d' });
    res.setHeader('Set-Cookie', serialize('sid', token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60*60*24*7 }));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
}
