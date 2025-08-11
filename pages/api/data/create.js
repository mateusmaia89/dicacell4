import { ncFetch } from '../../../lib/nocodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  try {
    const { nome, whatsapp, nome2, template } = req.body || {};
    if (!nome || !whatsapp || !template) {
      return res.status(400).json({ error: 'Campos obrigatórios: nome, whatsapp, template' });
    }
    const payload = { nome, whatsapp, nome2: nome2 || '', template, status: '' };
    const out = await ncFetch('/records', { method: 'POST', body: JSON.stringify(payload) });
    return res.status(201).json({ ok: true, record: out });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'erro ao criar' });
  }
}
