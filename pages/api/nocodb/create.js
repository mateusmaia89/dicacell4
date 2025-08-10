import { ncFetch } from '../../../lib/nocodb';
export default async function handler(req,res){
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { nome, whatsapp, nome2, template } = req.body || {};
    const payload = { nome, whatsapp, nome2, template, status: '' };
    const out = await ncFetch('/records', { method: 'POST', body: JSON.stringify(payload) });
    res.json(out);
  } catch(e){ res.status(500).json({ error: e.message }); }
}