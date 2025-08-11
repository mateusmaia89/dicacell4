import { useEffect, useMemo, useState } from 'react';
import { Field } from '../components/Field';

const fetchJSON = async (url, init) => {
  const res = await fetch(url, { headers: { 'Content-Type':'application/json' }, ...init });
  if (!res.ok) throw new Error('request failed');
  return res.json();
};

export default function Home(){
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState({ total:0, pendentes:0, enviados:0, custo:0 });
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const today = new Date().toISOString().slice(0,10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [f, setF] = useState({ nome:'', whatsapp:'', nome2:'', template:'' });

  const [tplTick, setTplTick] = useState(0);

  const hidden = useMemo(()=>{
    if (typeof window==='undefined') return new Set();
    return new Set(JSON.parse(localStorage.getItem('templatesHidden') || '[]'));
  }, [tplTick]);

  const templates = useMemo(()=>{
    const uniq = new Set(list.map(r=>r.template).filter(Boolean));
    const local = (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('templates')||'[]')) || [];
    local.forEach(t=>uniq.add(t));
    return Array.from(uniq).filter(t=>!hidden.has(t));
  }, [list, tplTick, hidden]);

  async function load(){
    const [m, l] = await Promise.all([
      fetchJSON(`/api/data/metrics?from=${from}&to=${to}`),
      fetchJSON(`/api/data/list?from=${from}&to=${to}&q=${encodeURIComponent(q)}&status=${statusFilter}`)
    ]);
    setStats(m); setList(l.list||[]);
  }
  useEffect(()=>{ if(authed) load(); }, [authed, q, statusFilter, from, to]);

  function addLocalTemplate(t){
    const cur = JSON.parse(localStorage.getItem('templates')||'[]');
    if (!cur.includes(t)) localStorage.setItem('templates', JSON.stringify([...cur, t]));
    setTplTick(x=>x+1);
  }
  function hideTemplate(t){
    const cur = JSON.parse(localStorage.getItem('templatesHidden')||'[]');
    if (!cur.includes(t)) localStorage.setItem('templatesHidden', JSON.stringify([...cur, t]));
    setTplTick(x=>x+1);
  }

  async function createOne(){
    if (!f.nome || !f.whatsapp || !f.template) { alert('Preencha: Cliente, WhatsApp, Template'); return; }
    try{
      const created = await fetchJSON('/api/data/create', { method: 'POST', body: JSON.stringify(f) });
addLocalTemplate(f.template);
setList(prev => [{
  Id: created?.record?.Id || Math.random(),
  nome: f.nome,
  whatsapp: f.whatsapp,
  nome2: f.nome2,
  template: f.template,
  status: '',
  CreatedAt: new Date().toISOString()
}, ...prev]);
setF({ nome:'', whatsapp:'', nome2:'', template:'' });
await load();
      alert('Cadastrado com sucesso');
    }catch(err){
      alert('Erro ao cadastrar: ' + (err?.message || err));
      console.error('createOne error:', err);
    }
  }

  async function delRecord(id){
    if (!confirm('Excluir este registro?')) return;
    await fetchJSON(`/api/data/delete?id=${id}`, { method:'DELETE' });
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
    await fetchJSON('/api/data/bulk', { method:'POST', body: JSON.stringify({ rows }) });
    rows.forEach(r=>r.template && addLocalTemplate(r.template));
    setImportOpen(false); setImportText(''); load();
  }

  if (!authed) return (
    <div className="min-h-full bg-orb flex items-center justify-center px-6">
      <div className="card max-w-md w-full p-8">
        <h1 className="text-2xl font-semibold">Portal de Envios</h1>
        <p className="text-sm text-n8n-soft mt-2">Faça login para acessar.</p>
        <div className="mt-6 grid gap-4">
          <Field label="Usuário"><input className="input" value={cred.user} onChange={e=>setCred(v=>({...v, user:e.target.value}))} placeholder="admin"/></Field>
          <Field label="Senha"><input className="input" type="password" value={cred.pass} onChange={e=>setCred(v=>({...v, pass:e.target.value}))} placeholder="admin123"/></Field>
          <button className="btn-primary" onClick={login}>Entrar</button>
          <p className="text-xs text-n8n-soft">Dica: admin / admin123</p>
        </div>
      </div>
    </div>
  );

  const th = "px-4 py-3 text-left text-xs font-semibold tracking-wider text-n8n-soft uppercase";
  const td = "px-4 py-4 border-t border-n8n-stroke/40";

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
        <button className="btn-soft" onClick={logout}>Sair</button>
      </header>

      <main className="px-6 lg:px-10 pb-16 max-w-6xl mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5"><div className="text-sm text-n8n-soft">Total</div><div className="text-4xl font-semibold mt-1">{stats.total}</div></div>
          <div className="card p-5"><div className="text-sm text-n8n-soft">Pendentes</div><div className="text-4xl font-semibold mt-1">{stats.pendentes}</div></div>
          <div className="card p-5"><div className="text-sm text-n8n-soft">Enviados</div><div className="text-4xl font-semibold mt-1">{stats.enviados}</div></div>
        </section>

        <section className="card p-5 mt-6">
          <h2 className="text-xl font-semibold mb-3">Gerenciar templates</h2>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Novo template" value={newTpl} onChange={e=>setNewTpl(e.target.value)} />
            <button className="btn-primary" onClick={handleAddTemplate}>Adicionar</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {templates.length ? templates.map(t => (
              <span key={t} className="tag flex items-center gap-2">
                {t}
                <button className="hover:!text-red-300" title="Remover este template da lista" onClick={()=>removeTemplate(t)}>🗑</button>
              </span>
            )) : <span className="text-sm text-n8n-soft">Sem templates.</span>}
          </div>
        </section>

        <section className="card p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Novo envio</h2>
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
                    if (t && t.trim()) { addLocalTemplate(t.trim()); setF(v=>({...v, template: t.trim()})); }
                    else { setF(v=>({...v, template: ''})); }
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
            <button className="btn-primary" onClick={createOne}>Cadastrar</button>
            <button className="btn-soft" onClick={()=>setImportOpen(true)}>Importar em massa</button>
          </div>
        </section>

        <section className="card p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Envios</h2>
            <input className="input w-96" placeholder="Buscar por nome, telefone ou template" value={q} onChange={e=>setQ(e.target.value)} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>Nome</th>
                  <th className={th}>Telefone</th>
                  <th className={th}>Template</th>
                  <th className={th}>Indicado por</th>
                  <th className={th}>Status</th>
                  <th className={th}>Criado em</th>
                  <th className={th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r=>{
                  const sent = (r.status||'').toLowerCase()==='enviado';
                  const created = r.CreatedAt ? new Date(r.CreatedAt).toLocaleString('pt-BR') : '-';
                  return (
                    <tr key={r.Id} className="hover:bg-white/2">
                      <td className={td}>{r.nome}</td>
                      <td className={td}>{r.whatsapp}</td>
                      <td className={td}>
                        <span className="mr-3">{r.template||'-'}</span>
                        {r.template && (
                          <button
                            title="Remover este template do seletor"
                            className="tag hover:!text-red-300"
                            onClick={()=>{ if(confirm(`Ocultar o template "${r.template}" do seletor?`)) hideTemplate(r.template); }}
                          >🗑</button>
                        )}
                      </td>
                      <td className={td}>{r.nome2 || '-'}</td>
                      <td className={td}>
                        <span className={`tag ${sent?'!border-green-500/40 !text-green-300':''}`}>{r.status||'pendente'}</span>
                      </td>
                      <td className={td}>{created}</td>
                      <td className={td}>
                        <button className="btn-soft" onClick={()=>delRecord(r.Id)}>excluir</button>
                      </td>
                    </tr>
                  );
                })}
                {!list.length && (
                  <tr><td className="px-4 py-8 text-n8n-soft" colSpan={7}>Sem registros.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {importOpen && (
        <div className="fixed inset-0 bg-black/60 grid place-items-center p-6">
          <div className="card max-w-3xl w-full p-6">
            <h3 className="text-xl font-semibold">Importar em massa</h3>
            <p className="text-sm text-n8n-soft mt-1">CSV: Cliente, WhatsApp, Indicação, Template</p>
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
