import { ncFetch } from '../../../lib/nocodb';

export default async function handler(req, res) {
  try {
    const { q = '', status = '', from = '', to = '' } = req.query;
    const where = [];
    if (status) where.push(`status,eq,${encodeURIComponent(status)}`);
    if (from && to) where.push(`CreatedAt,between,${encodeURIComponent(from)},${encodeURIComponent(to + ' 23:59:59')}`);
    if (q) where.push(
      `or((nome,like,${encodeURIComponent('%' + q + '%')}),` +
      `(whatsapp,like,${encodeURIComponent('%' + q + '%')}),` +
      `(nome2,like,${encodeURIComponent('%' + q + '%')}),` +
      `(template,like,${encodeURIComponent('%' + q + '%')}))`
    );
    const qs = where.length ? `?where=${where.join('~and~')}&limit=999` : '?limit=999';
    const data = await ncFetch(`/records${qs}`);
    res.json({ list: data.list || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
