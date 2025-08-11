import { ncFetch } from '../../../lib/nocodb';
export default async function handler(req,res){
  if (req.method !== 'PATCH') return res.status(405).end();
  try {
    const { id, status } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id required' });
    const out = await ncFetch(`/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    res.json(out);
  } catch(e){ res.status(500).json({ error: e.message }); }
}