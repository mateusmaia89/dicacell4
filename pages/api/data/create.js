import { ncFetch } from '../../../lib/nocodb';

function onlyDigits(s=''){ return (s||'').toString().replace(/\D+/g,''); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    let { nome, whatsapp, nome2, template } = req.body || {};
    if (!nome || !whatsapp || !template) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, whatsapp, template' });
    }
    const w = onlyDigits(whatsapp);
    if (w.length < 10) return res.status(400).json({ error: 'WhatsApp inválido (use DDI+DDD+número)' });

    const payload = { nome, whatsapp: w, nome2: nome2 || '', template, status: '' };
    const out = await ncFetch('/records', { method: 'POST', body: JSON.stringify(payload) });
    return res.status(201).json({ ok: true, record: out });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'erro ao criar' });
  }
}
