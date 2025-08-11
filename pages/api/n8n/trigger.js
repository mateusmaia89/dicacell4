export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).end();
  try{
    const url = process.env.N8N_WEBHOOK_URL;
    if(!url) return res.status(500).json({ error:'N8N_WEBHOOK_URL ausente' });
    const r = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const text = await r.text();
    if(!r.ok) return res.status(r.status).send(text);
    res.status(200).send(text);
  }catch(e){
    res.status(500).json({ error: e.message || 'erro ao acionar n8n' });
  }
}
