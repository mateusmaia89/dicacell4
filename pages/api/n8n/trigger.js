export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).end();
  try{
    const url = process.env.N8N_WEBHOOK_URL;
    if(!url) return res.status(500).json({ ok:false, error:'N8N_WEBHOOK_URL ausente' });

    const payload = req.body || {};
    const r = await fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    console.log('[n8n trigger]', { status:r.status, ok:r.ok, len:text.length });

    return res.status(200).json({ ok:r.ok, status:r.status, body:text.slice(0,500) });
  }catch(e){
    console.error('[n8n trigger error]', e?.message||e);
    return res.status(500).json({ ok:false, error: e?.message || 'erro ao acionar n8n' });
  }
}
