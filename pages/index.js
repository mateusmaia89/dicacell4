import { useEffect, useMemo, useState } from 'react';
import { Field } from '../components/Field';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';

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
  const [theme, setTheme] = useState('dark');
  const [authed, setAuthed] = useState(null);
  const [loading, setLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const [stats, setStats] = useState({ total: 0, pendentes: 0, enviados: 0, custo: 0 });
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('__all__');

  const [f, setF] = useState({ nome: '', whatsapp: '', nome2: '', template: '' });

  const [tplTick, setTplTick] = useState(0);
  const [newTpl, setNewTpl] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState('');

  const hidden = useMemo(() => new Set(readLocal('templatesHidden', [])), [tplTick]);
  const templates = useMemo(() => {
    const uniq = new Set(list.map(r => r.template).filter(Boolean));
    const local = readLocal('templates', []);
    local.forEach(t => uniq.add(t));
    return Array.from(uniq).filter(t => !hidden.has(t));
  }, [list, tplTick, hidden]);

  const filteredList = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    const digits = term.replace(/\D+/g, '');
    return list.filter(r => (
      (r.nome || '').toLowerCase().includes(term) ||
      (r.nome2 || '').toLowerCase().includes(term) ||
      (r.template || '').toLowerCase().includes(term) ||
      (digits && (r.whatsapp || '').replace(/\D+/g, '').includes(digits))
    ));
  }, [list, q]);

  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'dark') : 'dark';
      document.documentElement.setAttribute('data-theme', saved);
      setTheme(saved);
    } catch {}
  }, []);

  useEffect(() => { (async () => {
    try { const r = await fetch('/api/login'); setAuthed(r.ok); } catch { setAuthed(false); }
  })(); }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== '__all__') params.append('status', statusFilter);
      const qs = params.toString();
      const l = await fetchJSON(`/api/data/list${qs ? `?${qs}` : ''}`);
      setList(l.list || []);
      try { const m = await fetchJSON(`/api/data/metrics?from=${from}&to=${to}`); setStats(m); } catch {}
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (authed) load(); }, [authed, statusFilter, from, to]);

  useEffect(() => {
    const cards = document.querySelectorAll('.card');
    function handleMove(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`);
    }
    cards.forEach(c => c.addEventListener('mousemove', handleMove));
    return () => cards.forEach(c => c.removeEventListener('mousemove', handleMove));
  }, [list, stats, importOpen]);

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

  async function createOne() {
    const name = (f.nome || '').trim();
    const tpl = (f.template || '').trim();
    const w = (f.whatsapp || '').replace(/\D+/g, '');
    if (!name || !w || !tpl) { setSubmitError('Preencha: Cliente, WhatsApp e Template'); return; }
    if (!/^5541\d{9}$/.test(w)) { setSubmitError('WhatsApp inválido. Use 5541 + 9 dígitos (ex: 55419XXXXXXXX)'); return; }
    setSubmitError(''); setSubmitLoading(true);
    try {
      const created = await fetchJSON('/api/data/create', { method: 'POST', body: JSON.stringify({ ...f, nome: name, whatsapp: w, template: tpl }) });
      const rec = created?.record?.list?.[0] || created?.record || null;
      const id = rec?.Id || Math.random();
      const optimistic = { Id: id, nome: name, whatsapp: w, nome2: f.nome2, template: tpl, status: '', CreatedAt: new Date().toISOString() };
      setList(prev => [optimistic, ...prev]);
      setF({ nome: '', whatsapp: '', nome2: '', template: '' });
      await load();
    } catch (err) {
      setSubmitError(err?.message || 'Falha ao cadastrar');
    } finally {
      setSubmitLoading(false);
    }
  }

  async function doImport() {
    const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return;
    const header = lines[0].toLowerCase();
    const hasHeader = /cliente|whatsapp|indica|template/.test(header);
    const rows = (hasHeader ? lines.slice(1) : lines).map(l => {
      const parts = l.split(/,|;|\t/).map(s => s.trim());
      return { nome: parts[0] || '', whatsapp: (parts[1] || '').replace(/\D+/g, ''), nome2: parts[2] || '', template: parts[3] || '' };
    }).filter(r => r.nome && /^5541\d{9}$/.test(r.whatsapp));
    if (!rows.length) return;
    await fetchJSON('/api/data/bulk', { method: 'POST', body: JSON.stringify({ rows }) });
    rows.forEach(r => r.template && addLocalTemplate(r.template));
    setImportOpen(false); setImportText(''); load();
  }

  const [cred, setCred] = useState({ user: 'dicacell', pass: '@Dica007' });
  async function login() {
    try {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cred) });
      if (r.ok) setAuthed(true); else setAuthed(false);
    } catch { setAuthed(false); }
  }
  async function logout() { await fetch('/api/logout'); setAuthed(false); }

  async function triggerDisparos() {
    setTriggering(true);
    setTriggerError('');
    try {
      await fetchJSON('/api/n8n/trigger', { method: 'POST', body: JSON.stringify({}) });
      await load();
    } catch (err) {
      console.error(err);
      setTriggerError(err?.message || 'Falha ao disparar');
    } finally {
      setTriggering(false);
    }
  }

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    try { document.documentElement.setAttribute('data-theme', next); localStorage.setItem('theme', next); } catch {}
    setTheme(next);
  }

  if (authed !== true) {
    return (
      <div className="min-h-full bg-orb flex items-center justify-center px-6">
        <div className="card max-w-md w-full p-8">
          <h1 className="text-2xl font-semibold">Portal de Envios</h1>
          <p className="text-sm text-n8n-soft mt-2">Faça login para acessar.</p>
          <div className="mt-6 grid gap-4">
            <Field label="Usuário"><input className="input" value={cred.user} onChange={e => setCred(v => ({ ...v, user: e.target.value }))} placeholder="Usuário" /></Field>
            <Field label="Senha"><input className="input" type="password" value={cred.pass} onChange={e => setCred(v => ({ ...v, pass: e.target.value }))} placeholder="Senha" /></Field>
            <button className="btn-primary" onClick={login}>Entrar</button>
          </div>
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
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-white/5 transition" onClick={toggleTheme} aria-label="Alternar tema">
            {theme === 'light' ? <MoonIcon className="h-5 w-5 text-n8n-soft" /> : <SunIcon className="h-5 w-5 text-n8n-soft" />}
          </button>
          <button className="btn-soft" onClick={logout}>Sair</button>
        </div>
      </header>

      <main className="px-6 lg:px-10 pb-16 max-w-6xl mx-auto">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5"><div className="text-sm text-n8n-soft">Pendentes</div><div className="text-4xl font-semibold mt-1">{stats.pendentes}</div></div>
          <div className="card p-5"><div className="text-sm text-n8n-soft">Enviados</div><div className="text-4xl font-semibold mt-1">{stats.enviados}</div></div>
          <div className="card p-5"><div className="text-sm text-n8n-soft">Total gasto (USD)</div><div className="text-4xl font-semibold mt-1">$ {stats.custo?.toFixed ? stats.custo.toFixed(2) : '0.00'}</div></div>
        </section>

        <section className="card p-5 mt-4 flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm text-n8n-soft">De</label>
            <input type="date" className="input h-[46px]" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-n8n-soft">Até</label>
            <input type="date" className="input h-[46px]" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <div className="flex items-end gap-2">
            <button className="btn-soft h-[46px]" onClick={() => { const n = new Date(); const d = n.toISOString().slice(0, 10); setFrom(d); setTo(d); }}>Hoje</button>
            <button className="btn-soft h-[46px]" onClick={() => { const n = new Date(); const toD = n.toISOString().slice(0, 10); const a = new Date(n); a.setDate(n.getDate() - 6); const fromD = a.toISOString().slice(0, 10); setFrom(fromD); setTo(toD); }}>7 dias</button>
            <button className="btn-soft h-[46px]" onClick={() => { const n = new Date(); const toD = n.toISOString().slice(0, 10); const a = new Date(n); a.setDate(n.getDate() - 29); const fromD = a.toISOString().slice(0, 10); setFrom(fromD); setTo(toD); }}>30 dias</button>
          </div>
        </section>

        <section className="card p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Novo envio</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Cliente"><input className="input" value={f.nome} onChange={e => setF(v => ({ ...v, nome: e.target.value }))} placeholder="Nome" /></Field>
            <Field label="WhatsApp"><input className="input" value={f.whatsapp} onChange={e => setF(v => ({ ...v, whatsapp: e.target.value }))} placeholder="55419XXXXXXXX" /></Field>
            <Field label="Indicação (opcional)"><input className="input" value={f.nome2} onChange={e => setF(v => ({ ...v, nome2: e.target.value }))} placeholder="Quem indicou" /></Field>
            <Field label="Template">
              <div className="flex gap-2 items-center">
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
                <button
                  className="px-3 py-2 rounded-xl border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                  disabled={!f.template}
                  title="Remover este template da lista"
                  onClick={() => { if (f.template) { removeTemplate(f.template); setF(v => ({ ...v, template: '' })); } }}
                >🗑</button>
              </div>
            </Field>
          </div>
          <div className="mt-3">{submitError && (<div className="tag !text-red-300 !border-red-500/40 mb-3">{submitError}</div>)}</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="btn-primary" disabled={submitLoading} onClick={createOne}>{submitLoading ? 'Enviando…' : 'Cadastrar'}</button>
            <button className="btn-soft" onClick={() => setImportOpen(true)}>Importar em massa</button>
          </div>
        </section>

        <section className="card p-6 mt-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-xl font-semibold">Envios</h2>
            <div className="flex items-center gap-3 w-full">
              <input className="input w-full md:w-96" placeholder="Buscar por nome, telefone ou template" value={q} onChange={e => setQ(e.target.value)} />
              <select className="input w-48" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="__all__">Todos</option>
                <option value="pendente">Pendentes</option>
                <option value="enviado">Enviados</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mb-4">
            <button className="btn-danger flex-shrink-0" onClick={triggerDisparos} disabled={triggering}>{triggering ? 'Disparando…' : 'DISPARAR'}</button>
          </div>
          {triggerError && (<div className="tag !text-red-300 !border-red-500/40 mb-4">{triggerError}</div>)}

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
                {filteredList.map(r => {
                  const sent = (r.status || '').toLowerCase() === 'enviado';
                  const created = r.CreatedAt ? new Date(r.CreatedAt).toLocaleString('pt-BR') : '-';
                  return (
                    <tr key={r.Id} className="hover:bg-white/2">
                      <td className={td}>{r.nome}</td>
                      <td className={td}>{r.whatsapp}</td>
                      <td className={td}><span className="mr-3">{r.template || '-'}</span></td>
                      <td className={td}>{r.nome2 || '-'}</td>
                      <td className={td}><span className={`tag ${sent ? 'tag-sent' : ''}`}>{r.status || 'pendente'}</span></td>
                      <td className={td}>{created}</td>
                      <td className={td}><button className="btn-soft" onClick={() => delRecord(r.Id)}>excluir</button></td>
                    </tr>
                  );
                })}
                {!filteredList.length && (<tr><td className="px-4 py-8 text-n8n-soft" colSpan={7}>Sem registros.</td></tr>)}
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
