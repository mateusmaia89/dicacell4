import { serialize as s } from 'cookie';
export default function handler(req,res){
  res.setHeader('Set-Cookie', s('sid', '', { path: '/', maxAge: 0 }));
  res.json({ ok: true });
}