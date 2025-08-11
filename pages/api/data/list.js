import { ncFetch } from '../../../lib/nocodb';
export default async function handler(req, res){
  try {
    const { q = '', status = '' } = req.query;

    // fetch all records first; dataset is small (limit 999)
    const data = await ncFetch(`/records?limit=999`);
    let list = data.list || [];

    // filter by status
    if (status === 'enviado') {
      list = list.filter(r => (r.status || '').toLowerCase() === 'enviado');
    } else if (status === 'pendente') {
      list = list.filter(r => !(r.status || '').toLowerCase());
    }

    // search by name, phone or template
    if (q) {
      const qLower = q.toLowerCase();
      const digits = qLower.replace(/\D+/g, '');
      list = list.filter(r => (
        (r.nome || '').toLowerCase().includes(qLower) ||
        (r.nome2 || '').toLowerCase().includes(qLower) ||
        (r.template || '').toLowerCase().includes(qLower) ||
        (digits && (r.whatsapp || '').replace(/\D+/g, '').includes(digits))
      ));
    }

    res.json({ list });
  } catch(e){
    res.status(500).json({ error: e.message });
  }
}
