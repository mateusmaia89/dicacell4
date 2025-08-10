import { ncFetch } from '../../../lib/nocodb';
export default async function handler(req,res){
  if(req.method!=='DELETE') return res.status(405).end();
  try{
    const { id } = req.query;
    if(!id) return res.status(400).json({ error:'id required' });
    const out = await ncFetch(`/records/${id}`, { method:'DELETE' });
    res.json({ ok:true, out });
  }catch(e){ res.status(500).json({ error:e.message }); }
}
