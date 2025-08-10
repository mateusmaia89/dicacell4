import { useEffect, useMemo, useState } from 'react';
import { Field } from '../components/Field';

const fetchJSON = async (url, init) => {
  const res = await fetch(url, { headers: { 'Content-Type':'application/json' }, ...init });
  if (!res.ok) throw new Error('request failed');
  return res.json();
};

export default function Home(){
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total:0, pendentes:0, enviados:0, custo:0 });
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const today = new Date().toISOString().slice(0,10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [f, setF] = useState({ nome:'', whatsapp:'', nome2:'', template:'' });

  // força re-render quando templates locais mudarem
  const [tplTick, setTplTick] = useState(0);

  const templates = useMemo(()=>{
    const uniq = new Set(list.map(r=>r.template).filter(Boolean));
    const local = (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('templates')||'[]')) || [];
    local.forEach(t=>uniq.add(t));
    return Array.from(uniq);
  }, [list, tplTick]);

  async function load(){
    setLoading(true);
    try {
      const [m, l] = await Promise.all([
        fetchJSON(`/api/nocodb/metrics?from=${from}&to=${to}`),
        fetchJSON(`/api/nocodb/list?from=${from}&to=${to}&q=${encodeURIComponent(q)}&status=${statusFilter}`)
      ]);
      setStats(m); setList(l.list||[]);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ if(authed) load(); }, [authed, q, statusFilter, from, to]);

  function addLocalTemplate(t){
    const cur = JSON.parse(localStorage.getItem('templates')||'[]');
    if (!cur.includes(t)) {
      localStorage.setItem('templates', JSON.stringify([...cur, t]));
      setTplTick(x=>x+1);
    } else {
      setTplTick(x=>x+1);
    }
  }

  async function createOne(){
    if (!f.nome || !f.whatsapp || !f.template) return alert('Preencha: Cliente, WhatsApp, Template');
    await fetchJSON('/api/nocodb/create', { method: 'POST', body: JSON.stringify(f) });
    addLocalTemplate(f.template);
    setF({ nome:'', whatsapp:'', nome2:'', template:'' });
    load();
  }

  async function marcarEnviado(id){
    await fetchJSON('/api/nocodb/update', { method:'PATCH', body: JSON.stringify({ id, status: 'enviado' }) });
    load();
  }

  const [cred, setCred] = useState({ user:'', pass:'' });
  async function login(){
    const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(cred) });
    if (r.ok) setAuthed(true); else alert('Login inválido');
  }
  async function logout(){ await fetch('/api/logout'); setAuthed(false); }

  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  function parseRows(){
    const lines = importText.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].toLowerCase();
    const hasHeader = /cliente|whatsapp|indica|template/.test(header);
    const rows = (hasHeader ? lines.slice(1) : lines).map(l=>{
      const parts = l.split(/,|;|\t/).map(s=>s.trim());
      return { nome: parts[0]||'', whatsapp: parts[1]||'', nome2: parts[2]||'', template: parts[3]||'' };
    }).filter(r=>r.nome && r.whatsapp);
    return rows;
  }
  async function doImport(){
    const rows = parseRows();
    if (!rows.length) return alert('Nada para importar');
    await fetchJSON('/api/nocodb/bulk', { method:'POST', body: JSON.stringify({ rows }) });
    rows.forEach(r=>r.template && addLocalTemplate(r.template));
    setImportOpen(false); setImportText(''); load();
  }

  if (!authed) return (
    <div className="min-h-full bg-orb flex items-center justify-center px-6">
      <div className="card max-w-md w-full p-8 hover-raise">
        <h1 className="text-2xl font-semibold">Portal de Envios</h1>
        <p className="text-sm text-n8n-soft mt-2">Faça login para acessar.</p>
        <div className="mt-6 grid gap-4">
          <Field label="Usuário"><input className="input" value={cred.user} onChange={e=>setCred(v=>({...v, user:e.target.value}))} placeholder="admin"/></Field>
          <Field label="Senha"><input className="input" type="password" value={cred.pass} onChange={e=>setCred(v=>({...v, pass:e.target.value}))} placeholder="••••••"/></Field>
          <button className="btn-primary hover-raise" onClick={login}>Entrar</button>
          <p className="text-xs text-n8n-soft">Dica: admin / admin123 (forçado).</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-orb">
      <header className="px-6 lg:px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-n8n-accent to-n8n-accent2 shadow-neon" />
          <div>
            <div className="font-semibold">Portal de Envios</div>
            <div className="text-xs text-n8n-soft">NocoDB • Vercel</div>
          </div>
        </div>
        <button className="btn-soft hover-raise" onClick={logout}>Sair</button>
      </header>

      <main className="px-6 lg:px-10 pb-16 max-w-6xl mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="text-sm text-n8n-soft">Total</div>
            <div className="text-4xl font-semibold mt-1">{stats.total}</div>
          </div>
          <div className="card p-5">
            <div className="text-sm text-n8n-soft">Pendentes</div>
            <div className="text-4xl font-semibold mt-1">{stats.pendentes}</div>
          </div>
          <div className="card p-5">
            <div className="text-sm text-n8n-soft">Enviados</div>
            <div className="text-4xl font-semibold mt-1">{stats.enviados}</div>
          </div>
        </section>

        <section className="card p-5 mt-4 flex flex-wrap items-center gap-4">
          <Field label="De"><input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)} /></Field>
          <Field label="Até"><input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)} /></Field>
          <div className="ml-auto text-sm text-n8n-soft">
            {stats.enviados} enviados × $ 0.06 = <span className="text-white font-medium">${stats.custo?.toFixed ? stats.custo.toFixed(2) : '0.00'}</span>
          </div>
        </section>

        <section className="card p-5 mt-6">
          <h2 className="font-semibold mb-4">Novo envio</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Cliente"><input className="input" value={f.nome} onChange={e=>setF(v=>({...v, nome:e.target.value}))} placeholder="Nome"/></Field>
            <Field label="WhatsApp"><input className="input" value={f.whatsapp} onChange={e=>setF(v=>({...v, whatsapp:e.target.value}))} placeholder="55DDD9XXXXXXXX"/></Field>
            <Field label="Indicação (opcional)"><input className="input" value={f.nome2} onChange={e=>setF(v=>({...v, nome2:e.target.value}))} placeholder="Quem indicou"/></Field>
            <Field label="Template">
              <select
                className="input"
                value={f.template}
                onChange={(e)=>{
                  const val = e.target.value;
                  if (val === '__add__') {
                    const t = window.prompt('Nome do novo template');
                    if (t && t.trim()) {
                      addLocalTemplate(t.trim());
                      setF(v=>({...v, template: t.trim()}));
                    } else {
                      setF(v=>({...v, template: ''}));
                    }
                  } else {
                    setF(v=>({...v, template: val}));
                  }
                }}
              >
                <option value="">Selecione…</option>
                {templates.map(t=> <option key={t} value={t}>{t}</option>)}
                <option value="__add__">+ Adicionar novo template…</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="btn-primary hover-raise" onClick={createOne}>Cadastrar</button>
            <button className="btn-soft hover-raise" onClick={()=>setImportOpen(true)}>Importar em massa</button>
          </div>
        </section>

        <section className="card p-5 mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <input className="input flex-1" placeholder="Buscar por Cliente, WhatsApp, Template…" value={q} onChange={e=>setQ(e.target.value)} />
            <select className="input w-48" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="">Somente vazios</option>
              <option value="enviado">Enviado</option>
            </select>
          </div>

          <ul className="mt-5 divide-y divide-n8n-stroke/50">
            {list.map((r)=> (
              <li key={r.Id} className="py-4 flex items-center justify-between hover:bg-white/2 rounded-lg px-2">
                <div>
                  <div className="font-medium">{r.nome} <span className="tag ml-2">{r.whatsapp}</span></div>
                  <div className="text-sm text-n8n-soft">Template: {r.template||'-'} {r.nome2? <span className="ml-2">• Indicação: {r.nome2}</span>: null}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`tag ${((r.status||'').toLowerCase()==='enviado')?'!border-green-500/40 !text-green-300':''}`}>{r.status||'pendente'}</span>
                  {((r.status||'').toLowerCase()!=='enviado') && (
                    <button className="btn-soft hover-raise" onClick={()=>marcarEnviado(r.Id)}>marcar enviado</button>
                  )}
                </div>
              </li>
            ))}
            {!list.length && <div className="text-sm text-n8n-soft">Sem registros.</div>}
          </ul>
        </section>
      </main>

      {importOpen && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-6">
          <div className="card max-w-3xl w-full p-6">
            <h3 className="text-xl font-semibold">Importar em massa</h3>
            <p className="text-sm text-n8n-soft mt-1">Cole CSV (ou planilha) no formato: <span className="tag">Cliente</span>, <span className="tag">WhatsApp</span>, <span className="tag">Indicação</span>, <span className="tag">Template</span>. A primeira linha com cabeçalho é opcional.</p>
            <textarea className="input mt-4 h-56" value={importText} onChange={e=>setImportText(e.target.value)} placeholder={`Cliente,WhatsApp,Indicação,Template\nMaria,55999999999,João,boas vindas`} />
            <div className="mt-4 flex gap-3 justify-end">
              <button className="btn-soft" onClick={()=>setImportOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={doImport}>Importar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
