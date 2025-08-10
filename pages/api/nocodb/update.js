import { ncFetch } from '../../../lib/nocodb';
export default async function handler(req,res){
  if (req.method !== 'PATCH') return res.status(405).end();
  try {
    const { id, status } = req.body || {};
    const out = await ncFetch(`/records`, { method: 'PATCH', body: JSON.stringify({ Id: id, status })});
    res.json(out);
  } catch(e){ res.status(500).json({ error: e.message }); }
}