import { ncFetch } from '../../../lib/nocodb';

export default async function handler(req,res){
  try {
    const { from = '', to = '' } = req.query;
    const where = [];
    if (from && to) where.push(`CreatedAt,between,${encodeURIComponent(from)},${encodeURIComponent(to + ' 23:59:59')}`);
    const qs = where.length ? `?where=${where.join('~and~')}&limit=999` : '?limit=999';
    const data = await ncFetch(`/records${qs}`);
    const list = data.list || [];
    const total = list.length;
    const enviados = list.filter(r => (r.status || '').toLowerCase() === 'enviado').length;
    const pendentes = total - enviados;
    const custo = enviados * 0.06;
    res.json({ total, enviados, pendentes, custo });
  } catch(e){
    res.status(500).json({ error: e.message });
  }
}
