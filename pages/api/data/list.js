import { ncFetch } from '../../../lib/nocodb';
export default async function handler(req, res){
  try {
    const { q = '', status = '' } = req.query;
    const where = [];
    if (status === 'enviado') where.push(`status,eq,enviado`);
    if (status === 'pendente') where.push(`or((status,eq,), (status,is,null))`);
    if (q) where.push(`or((nome,like,${encodeURIComponent('%'+q+'%')}),(whatsapp,like,${encodeURIComponent('%'+q+'%')}),(nome2,like,${encodeURIComponent('%'+q+'%')}),(template,like,${encodeURIComponent('%'+q+'%')}))`);
    const qs = where.length ? `?where=${where.join('~and~')}&limit=999` : '?limit=999';
    const data = await ncFetch(`/records${qs}`);
    res.json({ list: data.list || [] });
  } catch(e){ res.status(500).json({ error: e.message }); }
}
