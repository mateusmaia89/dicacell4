import { useEffect, useMemo, useState } from 'react';
import { Field } from '../components/Field';

const fetchJSON = async (url, init) => {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j.error || JSON.stringify(j); } catch {}
    throw new Error(detail || `${res.status} ${res.statusText}`);
  }
  return res.json();
};

const readLocal = (k, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v ?? fallback; } catch { return fallback; }
};
const writeLocal = (k, v) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [stats, setStats] = useState({ total: 0, pendentes: 0, enviados: 0, custo: 0 });
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [f, setF] = useState({ nome: '', whatsapp: '', nome2: '', template: '' });

  const [tplTick, setTplTick] = useState(0);
  const [newTpl, setNewTpl] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const hidden = useMemo(() => new Set(readLocal('templatesHidden', [])), [tplTick]);
  const templates = useMemo(() => {
    const uniq = new Set(list.map(r => r.template).filter(Boolean));
    const local = readLocal('templates', []);
    local.forEach(t => uniq.add(t));
    return Array.from(uniq).filter(t => !hidden.has(t));
  }, [list, tplTick, hidden]);

  async function load() {
    setLoading(true);
    try {
      const [m, l] = await Promise.all([
        fetchJSON(`/api/data/metrics?from=${from}&to=${to}`),
        fetchJSON(`/api/data/list?q=${encodeURIComponent(q)}&status=${statusFilter}`)
      ]);
      setStats(m);
      setList(l.list || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (authed) load(); }, [authed, q, statusFilter, from, to]);

  function addLocalTemplate(t) {
    const name = (t || '').trim();
    if (!name) return;
    const cur = readLocal('templates', []);
    if (!cur.includes(name)) writeLocal('templates', [...cur, name]);
    const hid = readLocal('templatesHidden', []).filter(x => x !== name);
    writeLocal('templatesHidden', hid);
    setTplTick(x => x + 1);
  }
  function removeTemplate(t) {
    const name = (t || '').trim();
    if (!name) return;
    const cur = readLocal('templates', []).filter(x => x !== name);
    writeLocal('templates', cur);
    const hid = readLocal('templatesHidden', []);
    if (!hid.includes(name)) hid.push(name);
    writeLocal('templatesHidden', hid);
    setTplTick(x => x + 1);
  }
  function handleAddTemplate() {
    if (!newTpl.trim()) return;
    addLocalTemplate(newTpl.trim());
    setNewTpl('');
  }

  async function createOne(){
    if (!f.nome || !f.whatsapp || !f.template) return;
    const w = (f.whatsapp||'').replace(/\D+/g,'');
    if (!/^5541\d{9}$/.test(w)) return;
    setSubmitError(''); setSubmitLoading(true);
    try{
      const created = await fetchJSON('/api/data/create', { method:'POST', body: JSON.stringify({ ...f, whatsapp: w }) });
      const optimistic = { Id: created?.record?.Id || Math.random(), nome: f.nome, whatsapp: w, nome2: f.nome2, template: f.template, status: '', CreatedAt: new Date().toISOString() };
      setList(prev => [optimistic, ...prev]);
      setF({ nome:'', whatsapp:'', nome2:'', template:'' });
      await load();
    }catch(err){
    }finally{
      setSubmitLoading(false);
    }
  }

  async function delRecord(id){
    try{ await fetchJSON(`/api/data/delete?id=${id}`, { method:'DELETE' }); } finally { load(); }
  }

  function parseRows() {
    const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const header = lines[0].toLowerCase();
    const hasHeader = /cliente|whatsapp|indica|template/.test(header);
    const rows = (hasHeader ? lines.slice(1) : lines).map(l => {
      const parts = l.split(/,|;|\t/).map(s => s.trim());
      return { nome: parts[0] || '', whatsapp: parts[1] || '', nome2: parts[2] || '', template: parts[3] || '' };
    }).filter(r => r.nome && r.whatsapp);
    return rows;
  }
  async function doImport() {
    const rows = parseRows();
    if (!rows.length) return;
    await fetchJSON('/api/data/bulk', { method: 'POST', body: JSON.stringify({ rows }) });
    rows.forEach(r => r.template && addLocalTemplate(r.template));
    setImportOpen(false); setImportText(''); load();
  }

  const [cred, setCred] = useState({ user: 'dicacell', pass: '@Dica007' });
  async function login(){
    const r = await fetch('/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(cred) });
    if (r.ok) setAuthed(true);
  }
  async function logout() { await fetch('/api/logout'); setAuthed(false); }

  if (!authed) {
    return (
      <div className="min-h-full bg-orb flex items-center justify-center px-6">
        <div className="card max-w-md w-full p-8">
          <h1 className="text-2xl font-semibold">Portal de Envios</h1>
          <p className="text-sm text-n8n-soft mt-2">Faça login para acessar.</p>
          <div className="mt-6 grid gap-4">
            <Field label="Usuário"><input className="input" value={cred.user} onChange={e => setCred(v => ({ ...v, user: e.target.value }))} placeholder="Usuário" /></Field>
            <Field label="Senha"><input className="input" type="password" value={cred.pass} onChange={e => setCred(v => ({ ...v, pass: e.target.value }))} placeholder="Senha" /></Field>
            <button className="btn-primary" onClick={login}>Entrar</button></div>
        </div>
      </div>
    );
  }

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
          <div className="card p-5"><div className="text-sm text-n8n-soft">Pendentes</div><div className="text-4xl font-semibold mt-1">{stats.pendentes}</div></div>
          <div className="card p-5"><div className="text-sm text-n8n-soft">Enviados</div><div className="text-4xl font-semibold mt-1">{stats.enviados}</div></div>
          <div className="card p-5"><div className="text-sm text-n8n-soft">Total gasto (USD)</div><div className="text-4xl font-semibold mt-1">$ {stats.custo?.toFixed ? stats.custo.toFixed(2) : '0.00'}</div></div>
        </section>

        <section className="card p-5 mt-4 flex flex-wrap items-center gap-4">
          <Field label="De"><input type="date" className="input" value={from} onChange={e=>setFrom(e.target.value)} /></Field>
          <Field label="Até"><input type="date" className="input" value={to} onChange={e=>setTo(e.target.value)} /></Field>
          <div className="ml-auto">
            <button
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-neon hover:opacity-90 transition"
              onClick={()=>triggerN8n({ action:'run', from, to })}
            >
              Disparar n8n
            </button>
          </div>
        </section>

        <section className="card p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Novo envio</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Cliente"><input className="input" value={f.nome} onChange={e => setF(v => ({ ...v, nome: e.target.value }))} placeholder="Nome" /></Field>
            <Field label="WhatsApp"><input className="input" value={f.whatsapp} onChange={e => setF(v => ({ ...v, whatsapp: e.target.value }))} placeholder="55419XXXXXXXX" /></Field>
            <Field label="Indicação (opcional)"><input className="input" value={f.nome2} onChange={e => setF(v => ({ ...v, nome2: e.target.value }))} placeholder="Quem indicou" /></Field>
            <Field label="Template">
              <select
                className="input"
                value={f.template}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__add__') {
                    if (typeof window !== 'undefined') {
                      const t = window.prompt('Nome do novo template');
                      if (t && t.trim()) { addLocalTemplate(t.trim()); setF(v => ({ ...v, template: t.trim() })); }
                      else { setF(v => ({ ...v, template: '' })); }
                    }
                  } else {
                    setF(v => ({ ...v, template: val }));
                  }
                }}
              >
                <option value="">Selecione…</option>
                {templates.map(t => <option key={t} value={t}>{t}</option>)}
                <option value="__add__">+ Adicionar novo template…</option>
              </select>
            </Field>
          </div>
          <div className="mt-3">
                      </div>
          <div className="mt-4 flex gap-3">
            <button className="btn-primary" disabled={submitLoading} onClick={createOne}>{submitLoading ? 'Enviando…' : 'Cadastrar'}</button>
            <button className="btn-soft" onClick={() => setImportOpen(true)}>Importar em massa</button>
          
            <button className="btn-soft" onClick={()=>triggerN8n({ action:'run' })}>Disparar n8n</button>
          </div>
        </section>

        <section className="card p-5 mt-6">
          <h2 className="text-xl font-semibold mb-3">Gerenciar templates</h2>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Novo template" value={newTpl} onChange={e => setNewTpl(e.target.value)} />
            <button className="btn-primary" onClick={handleAddTemplate}>Adicionar</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {templates.length ? templates.map(t => (
              <span key={t} className="tag flex items-center gap-2">
                {t}
                <button className="hover:!text-red-300" title="Remover este template da lista" onClick={() => removeTemplate(t)}>🗑</button>
              </span>
            )) : <span className="text-sm text-n8n-soft">Sem templates.</span>}
          </div>
        </section>

        <section className="card p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Envios</h2>
            <div className="flex items-center gap-3">
              <input className="input w-96" placeholder="Buscar por nome, telefone ou template" value={q} onChange={e => setQ(e.target.value)} />
              <select className="input w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">Todos</option>
                <option value="">Somente vazios</option>
                <option value="enviado">Enviado</option>
              </select>
            </div>
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
                {list.map(r => {
                  const sent = (r.status || '').toLowerCase() === 'enviado';
                  const created = r.CreatedAt ? new Date(r.CreatedAt).toLocaleString('pt-BR') : '-';
                  return (
                    <tr key={r.Id} className="hover:bg-white/2">
                      <td className={td}>{r.nome}</td>
                      <td className={td}>{r.whatsapp}</td>
                      <td className={td}><span className="mr-3">{r.template || '-'}</span></td>
                      <td className={td}>{r.nome2 || '-'}</td>
                      <td className={td}><span className={`tag ${sent ? '!border-green-500/40 !text-green-300' : ''}`}>{r.status || 'pendente'}</span></td>
                      <td className={td}>{created}</td>
                      <td className={td}><button className="btn-soft" onClick={() => delRecord(r.Id)}>excluir</button></td>
                    </tr>
                  );
                })}
                {!list.length && (<tr><td className="px-4 py-8 text-n8n-soft" colSpan={7}>Sem registros.</td></tr>)}
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
            <textarea className="input mt-4 h-56" value={importText} onChange={e => setImportText(e.target.value)} placeholder={`Cliente,WhatsApp,Indicação,Template\nMaria,55999999999,João,boas vindas`} />
            <div className="mt-4 flex gap-3 justify-end">
              <button className="btn-soft" onClick={() => setImportOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={doImport}>Importar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
