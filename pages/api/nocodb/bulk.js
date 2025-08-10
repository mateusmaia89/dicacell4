import { ncFetch } from '../../../lib/nocodb';
export default async function handler(req,res){
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { rows = [] } = req.body || {};
    if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows[] required' });
    const chunks = [];
    for (let i=0;i<rows.length;i+=50) chunks.push(rows.slice(i,i+50));
    const results = [];
    for (const c of chunks){
      const payload = c.map(r=>({ nome:r.nome, whatsapp:r.whatsapp, nome2:r.nome2||'', template:r.template||'', status:'' }));
      const out = await ncFetch('/records/bulk', { method: 'POST', body: JSON.stringify(payload) });
      results.push(out);
    }
    res.json({ ok: true, results });
  } catch(e){ res.status(500).json({ error: e.message }); }
}