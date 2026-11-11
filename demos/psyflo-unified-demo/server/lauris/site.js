// Mock Lauris Online: a plain server-rendered site. It exists so the extension has real DOM to read
// and real inputs to type into. It knows nothing about Psyflo except an optional in-page panel slot
// (the documented fallback when the browser extension is not installed).
import { lauris, US, LaurisError } from './store.js';
import { FORMS, FORM_ORDER } from './forms.js';
import { html, redirect, readForm, esc, cookies, notFound } from '../util.js';

const CSS = `
*{box-sizing:border-box}html,body{height:100%}
body{margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222;background:#F2F3F5}
a{color:#1F6FBF}
.top{background:#2F3A4A;color:#fff;padding:9px 16px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;height:38px}
.top .ar{color:#E0A030}.top .r{margin-left:auto;font-weight:400;font-size:11px;color:#C8CFD8;display:flex;gap:10px;align-items:center}
.top .r a{color:#C8CFD8;text-decoration:none}
.pchip{display:inline-flex;align-items:center;gap:6px;background:#151B24;color:#fff;border-radius:8px;padding:4px 10px;font:600 12px 'DM Sans',system-ui,sans-serif;border:0;cursor:pointer}
.pchip i{width:8px;height:8px;border-radius:50%;background:#F0B44C;display:inline-block}
.wrap{display:flex;height:calc(100% - 38px)}
.side{flex:0 0 190px;background:#2F3A4A;padding:6px 0;display:flex;flex-direction:column;overflow:auto}
.lnav{display:flex;align-items:center;gap:9px;padding:8px 14px;font-size:12px;color:#C8CFD8;text-decoration:none}
.lnav:hover{background:#3C4756;color:#fff}
.lnav.on{background:#3C4756;color:#fff;border-left:3px solid #E0A030;padding-left:11px}
.lnav .b{margin-left:auto;background:#C2410C;color:#fff;border-radius:999px;font-size:10px;padding:0 6px;font-weight:700}
.sep{border-top:1px solid #46525F;margin:8px 0}
main{flex:1;min-width:0;padding:12px 20px 40px;overflow:auto}
#psyflo-slot{flex:0 0 400px;border-left:1px solid #D9D4CC;background:#fff;display:none}
#psyflo-slot iframe{width:100%;height:100%;border:0;display:block}
body.psyflo-inpage #psyflo-slot{display:block}
.hdr{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #DDE1E6;border-radius:4px;padding:8px 14px}
.hdr .av{width:36px;height:36px;border-radius:50%;background:#DDE1E6;flex:0 0 36px}
.hdr .nm{font-weight:700;font-size:15px;color:#1F3B6B}.hdr .sub{font-size:11px;color:#666}
.hdr .units{margin-left:auto;font-size:12px;color:#1F6FBF;font-weight:700;text-align:right}
.hdr .units.none{color:#C2410C}
.tabs{display:flex;gap:18px;margin:6px 0 10px;border-bottom:1px solid #DDE1E6}
.tab{font-size:12px;color:#555;padding:8px 0;border-bottom:2px solid transparent;text-decoration:none}
.tab.on{color:#222;font-weight:700;border-bottom-color:#E0A030}
label,.lbl{display:block;font-size:11px;color:#666;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em}
.in{width:100%;border:1px solid #C9CDD3;background:#fff;padding:6px 8px;border-radius:3px;min-height:30px;font:13px Arial,Helvetica,sans-serif;color:#222}
textarea.in{resize:vertical;line-height:1.45}
.in.g{background:#E6F4EA}
.in.y,.in[data-psyflo=typed]{background:#FFF8E6;border-color:#E8C56A}
.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:10px}
.card{background:#fff;border:1px solid #DDE1E6;border-radius:4px;padding:12px 14px;margin-bottom:10px}
table.t{width:100%;border-collapse:collapse;background:#fff;font-size:12px}
table.t th{background:#E9ECF0;text-align:left;font-weight:700;padding:6px 8px;border:1px solid #DDE1E6;font-size:11px;color:#444}
table.t td{border:1px solid #DDE1E6;padding:4px 6px;vertical-align:top}
table.t td .in{min-height:26px;padding:4px 6px;font-size:12px}
.lb{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:0 14px;border:1px solid #9AA3AE;background:linear-gradient(#fff,#E9ECF0);border-radius:3px;font:12px Arial,sans-serif;color:#222;cursor:pointer;text-decoration:none}
.lb:hover{background:#E9ECF0}.lb.pri{background:#1F6FBF;color:#fff;border-color:#1A5EA3}
.flash{background:#E6F4EA;border:1px solid #9ED3AE;color:#1D5F33;padding:8px 12px;border-radius:3px;margin-bottom:10px;font-weight:700}
.flash.w{background:#FFF4E5;border-color:#F0C27A;color:#7A4B00}
.flash.r{background:#FBE9E4;border-color:#E9B4A6;color:#8A2E1C}
.list{width:100%;border-collapse:collapse;background:#fff}
.list th{background:#E9ECF0;text-align:left;font-size:11px;padding:7px 8px;border-bottom:1px solid #DDE1E6;color:#444}
.list td{padding:7px 8px;border-bottom:1px solid #EEF0F3;font-size:12px}
.list tr:hover td{background:#F7F9FB}
.filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) auto;gap:10px;align-items:end;background:#fff;border:1px solid #DDE1E6;border-radius:4px;padding:10px 12px;margin-bottom:10px}
.preview{background:#fff;border:1px dashed #9AA3AE;padding:18px 22px;position:relative}
.preview .wm{position:absolute;top:10px;right:14px;color:#C2410C;font-weight:700;font-size:11px;letter-spacing:.1em}
.preview h3{margin:0 0 8px;font-size:14px}
.preview .row{display:grid;grid-template-columns:220px minmax(0,1fr);gap:10px;padding:5px 0;border-top:1px solid #EEF0F3;font-size:12px}
.preview .row b{color:#444;font-weight:700}
.muted{color:#777}.small{font-size:11px}
h2{font-size:15px;margin:4px 0 10px;color:#1F3B6B}
.picker{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.picker a{display:block;background:#fff;border:1px solid #DDE1E6;border-radius:4px;padding:10px 12px;text-decoration:none;color:#1F3B6B;font-weight:700}
.picker a span{display:block;font-weight:400;color:#777;font-size:11px;margin-top:2px}
.phq{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));gap:6px}
`;

function shell(req, { title, nav, body, user }) {
  const c = cookies(req);
  const inpage = c.psyflo_inpage !== '0';
  const db = lauris.db;
  const saved = db.sessions.filter(s => s.status === 'saved' && (!user || s.staff === user.id || user.role !== 'direct_support')).length;
  const toApprove = db.sessions.filter(s => s.status === 'processed' && s.approve).length;
  const rejected = db.sessions.filter(s => s.status === 'rejected').length;
  const noAuth = db.consumers.filter(c => c.status === 'active' && !c.auth).length;
  const appURL = process.env.PSYFLO_APP_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${(req.headers.host || 'localhost').split(':')[0]}:${process.env.APP_PORT || 4000}`;
  const L = (href, label, key, badge) => `<a class="lnav${nav === key ? ' on' : ''}" href="${href}">${label}${badge ? `<span class="b">${badge}</span>` : ''}</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — Lauris Online (mock)</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,600&display=swap">
<style>${CSS}</style></head>
<body class="${inpage ? 'psyflo-inpage' : ''}" data-lauris-page="${esc(nav || '')}">
<div class="top"><span class="ar">»</span> Lauris Online <span class="small muted" style="font-weight:400;color:#8E99A6">mock for the Psyflo demo · synthetic data</span>
<span class="r">${user ? esc(user.name) + ' ·' : ''} <a href="#classic" onclick="return false" title="Not part of the mock">Switch to Classic</a> · <a href="/logout">Sign Out</a>
<button class="pchip" id="psyflo-toggle" type="button" title="Show or hide the Psyflo panel (in-page fallback when the extension is not installed)"><i></i>psyflo · ${inpage ? 'on' : 'off'}</button></span></div>
<div class="wrap">
<nav class="side" aria-label="Lauris menu">
${L('/consumers', 'Consumers', 'consumers')}${L('/authorizations', 'Authorizations', 'authorizations')}${L('/approvals', 'Approvals', 'approvals-h')}${L('/add-session', 'Add Session', 'add')}${L('/saved', 'Saved Session', 'saved', saved)}${L('/reports', 'Reports', 'reports')}${L('/user', 'User Information', 'user')}${L('/time', 'Time Tracker', 'time')}
<div class="sep"></div>
${L('/approvals', 'Forms to Approve', 'approvals', toApprove)}${L('/rejected', 'Rejected Forms', 'rejected', rejected)}${L('/authorizations', 'Consumers w/o Authorizations', 'noauth', noAuth)}
</nav>
<main id="lauris-main">${body}</main>
<div id="psyflo-slot" aria-label="Psyflo panel (in-page)"></div>
</div>
<script>
(function(){
  var APP=${JSON.stringify(appURL)};
  var t=document.getElementById('psyflo-toggle');
  t.addEventListener('click',function(){var on=!document.body.classList.contains('psyflo-inpage');document.cookie='psyflo_inpage='+(on?'1':'0')+';path=/';location.reload();});
  // The extension's content script marks the page; if it is present, the side panel is used instead.
  function boot(){
    if(document.documentElement.getAttribute('data-psyflo-extension')){document.body.classList.remove('psyflo-inpage');t.innerHTML='<i></i>psyflo · extension';return;}
    if(!document.body.classList.contains('psyflo-inpage'))return;
    var s=document.createElement('script');s.src=APP+'/panel/bridge.js';s.dataset.mode='inpage';s.dataset.app=APP;document.body.appendChild(s);
    var f=document.createElement('iframe');f.src=APP+'/panel/';f.title='Psyflo panel';f.id='psyflo-frame';f.allow='microphone';document.getElementById('psyflo-slot').appendChild(f);
  }
  setTimeout(boot,60);
})();
</script>
</body></html>`;
}

function currentUser(req) { const c = cookies(req); return lauris.user(c.lauris_user || ''); }

function consumerHeader(c, sub) {
  const units = c.auth && c.auth.available != null ? `${c.auth.available} units available${c.auth.end_us ? ` <span class="muted" style="font-weight:400">· ending ${c.auth.end_us}</span>` : ''}` : 'No authorizations available';
  return `<div class="hdr" data-consumer="${c.no}"><div class="av"></div><div><div class="nm" id="consumer-name">${esc(c.initials)}</div>
<div class="sub" id="consumer-sub">Harvest # <span id="harvest-no">${c.no}</span> · ${esc(c.locality)} · ${esc((c.school || '').split('·').pop().trim())} · Program: <span id="consumer-program">${esc(c.program)}</span> · Group: ${esc(c.group)} · Staff: ${esc(c.staff)}${sub ? ' · ' + sub : ''}</div></div>
<div class="units${c.auth ? '' : ' none'}" id="consumer-units">${units}</div></div>`;
}

const TABS = [['general', 'General Information'], ['auth', 'Authorization Information'], ['documents', 'Documents'], ['active', 'Active File'], ['medications', 'Medications'], ['allergies', 'Allergies']];
const tabs = (c, on) => `<div class="tabs">${TABS.map(([k, l]) => `<a class="tab${on === k ? ' on' : ''}" href="/consumers/${c.no}?tab=${k}">${l}</a>`).join('')}</div>`;

function fieldHTML(f, i, value, green, c) {
  const id = 'f' + i; const span = `grid-column:span ${Math.round((f.w || 1) * 1)}`;
  const cls = 'in' + (green ? ' g' : '');
  if (f.type === 'table') {
    return `<div style="grid-column:span 4"><span class="lbl">${esc(f.label)}</span><table class="t" data-label="${esc(f.label)}"><tr><th style="width:26%">Behaviour</th>${f.cols.map(h => `<th>${esc(h)}</th>`).join('')}</tr>
${f.rows.map((r, ri) => `<tr><td>${esc(r)}</td>${f.cols.map((h, ci) => { const key = `${r} — ${h}`; const v = (value || {})[key] || ''; return `<td><input class="in" name="t${i}_${ri}_${ci}" aria-label="${esc(key)}" value="${esc(v)}"${h === 'Y/N' ? ' style="width:44px"' : ''}></td>`; }).join('')}</tr>`).join('')}</table></div>`;
  }
  if (f.type === 'phq') {
    return `<div style="${span}"><label>${esc(f.label)}</label><div class="phq">${Array.from({ length: 9 }, (_, k) => { const key = `PHQ item ${k + 1}`; return `<input class="in" name="p${i}_${k}" aria-label="${key}" value="${esc((value || {})[key] || '')}">`; }).join('')}</div><div class="small muted" style="margin-top:3px">Lauris scores on Process Form.</div></div>`;
  }
  if (f.type === 'static') return `<div style="${span}"><label>${esc(f.label)}</label><div class="in g" style="min-height:30px">${esc(value)}</div></div>`;
  if (f.type === 'select') {
    const opts = typeof f.options === 'function' ? f.options(c) : f.options;
    const all = value && !opts.includes(value) ? opts.concat([value]) : opts;
    return `<div style="${span}"><label for="${id}">${esc(f.label)}</label><select class="${cls}" id="${id}" name="${id}">${all.map(o => `<option${o === value ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
  }
  if (f.type === 'area') return `<div style="${span}"><label for="${id}">${esc(f.label)}</label><textarea class="${cls}" id="${id}" name="${id}" rows="${f.rows || 3}">${esc(value)}</textarea></div>`;
  return `<div style="${span}"><label for="${id}">${esc(f.label)}</label><input class="${cls}" id="${id}" name="${id}" value="${esc(value)}"></div>`;
}

function collect(spec, body) {
  const values = {};
  spec.fields.forEach((f, i) => {
    if (f.type === 'table') { const t = {}; f.rows.forEach((r, ri) => f.cols.forEach((h, ci) => { const v = body[`t${i}_${ri}_${ci}`]; if (v) t[`${r} — ${h}`] = v; })); values[f.label] = t; }
    else if (f.type === 'phq') { const t = {}; for (let k = 0; k < 9; k++) { const v = body[`p${i}_${k}`]; if (v) t[`PHQ item ${k + 1}`] = v; } values[f.label] = t; }
    else if (f.type !== 'static') values[f.label] = body['f' + i] ?? '';
  });
  return values;
}

function previewHTML(s, c) {
  const spec = FORMS[s.form];
  const rows = spec.fields.filter(f => f.type !== 'static').map(f => {
    let v = s.values[f.label];
    if (v && typeof v === 'object') v = Object.entries(v).map(([k, x]) => `${k}: ${x}`).join('; ');
    return `<div class="row"><b>${esc(f.label)}</b><div class="pv" data-label="${esc(f.label)}">${esc(v || '—')}</div></div>`;
  }).join('');
  return `<div class="preview" id="lauris-preview" data-session="${s.id}" data-form="${s.form}"><div class="wm">${s.status === 'approved' ? 'SIGNED' : 'PREVIEW ONLY'}</div>
<h3>${esc(spec.title)}</h3><div class="small muted">${esc(c.initials)} · Harvest # ${c.no} · processed ${US(s.processed_at)} ${esc((s.processed_at || '').slice(11, 16))} by ${esc(s.processed_by || s.staff)}</div>
${rows}
${s.status === 'approved' ? `<div class="row"><b>Signature</b><div id="lauris-signature">Electronically signed by ${esc(s.signed_by)} · ${US(s.signed_at)} ${esc((s.signed_at || '').slice(11, 16))}</div></div>` : ''}</div>`;
}

const flash = (q) => {
  if (q.get('denied')) return `<div class="flash r" role="status" id="lauris-flash" data-event="denied" data-session="${esc(q.get('session') || '')}">${esc(q.get('denied'))}</div>`;
  if (q.get('blocked')) return `<div class="flash r" role="status" id="lauris-flash" data-event="blocked">${esc(q.get('blocked'))}</div>`;
  if (q.get('processed')) { const s = lauris.session(q.get('processed')); if (s) return `<div class="flash${s.warn ? ' w' : ''}" role="status" id="lauris-flash" data-event="processed" data-session="${s.id}" data-form="${s.form}" data-consumer="${s.no}">${esc(FORMS[s.form].title)} processed ${US(s.processed_at)} ${s.processed_at.slice(11, 16)}${s.approve ? ' · sent to Forms to Approve' : ' · copied to the Active File'}${s.warn ? ' · ' + esc(s.warn) : ''}</div>`; }
  if (q.get('saved')) { const s = lauris.session(q.get('saved')); if (s) return `<div class="flash w" role="status" id="lauris-flash" data-event="saved" data-session="${s.id}" data-form="${s.form}" data-consumer="${s.no}">Form data saved · not processed (in Saved Session)</div>`; }
  if (q.get('signed')) { const s = lauris.session(q.get('signed')); if (s) return `<div class="flash" role="status" id="lauris-flash" data-event="signed" data-session="${s.id}" data-form="${s.form}" data-consumer="${s.no}">Signed by ${esc(s.signed_by)} ${US(s.signed_at)} ${s.signed_at.slice(11, 16)}</div>`; }
  if (q.get('rejected')) { const s = lauris.session(q.get('rejected')); if (s) return `<div class="flash r" role="status" id="lauris-flash" data-event="rejected" data-session="${s.id}" data-form="${s.form}" data-consumer="${s.no}">Rejected · moved to Rejected Forms</div>`; }
  if (q.get('created')) return `<div class="flash" role="status" id="lauris-flash" data-event="created" data-consumer="${esc(q.get('created'))}">Consumer created</div>`;
  return '';
};

export async function laurisHandler(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname; const q = url.searchParams;
  lauris.syncToday();   // the one demo clock: Lauris prints the same date as Psyflo
  const user = currentUser(req);

  if (p === '/login') {
    if (req.method === 'POST') {
      const f = await readForm(req); const u = lauris.user((f.username || '').trim().toLowerCase());
      if (!u) return html(res, shell(req, { title: 'Sign in', body: loginBody('Unknown user. Use a seed staff id, e.g. jperez or khale.') }));
      res.setHeader('Set-Cookie', `lauris_user=${u.id}; Path=/`);
      return redirect(res, q.get('next') || '/consumers');
    }
    // mock-only convenience so the demo can open Lauris already signed in as the presenter's role
    if (q.get('as') && lauris.user(q.get('as'))) { res.setHeader('Set-Cookie', `lauris_user=${q.get('as')}; Path=/`); return redirect(res, q.get('next') || '/consumers'); }
    return html(res, shell(req, { title: 'Sign in', body: loginBody() }));
  }
  if (p === '/logout') { res.setHeader('Set-Cookie', 'lauris_user=; Path=/; Max-Age=0'); return redirect(res, '/login'); }
  if (p === '/__reset' && req.method === 'POST') { const f = await readForm(req); lauris.reset(f.preset || 'live'); res.writeHead(204); return res.end(); }
  if (!user) return redirect(res, '/login?next=' + encodeURIComponent(req.url));
  const page = (title, nav, body) => html(res, shell(req, { title, nav, body, user }));

  if (p === '/' || p === '/consumers') {
    const tab = q.get('tab') === 'discharged' ? 'discharged' : 'active';
    const staffF = q.get('staff') ?? (user.role === 'direct_support' ? user.name : '');
    const nameF = (q.get('consumer') || '').toLowerCase(); const recF = q.get('record') || ''; const grpF = q.get('group') || '';
    let list = lauris.db.consumers.filter(c => c.status === tab);
    if (staffF) list = list.filter(c => c.staff === staffF);
    if (nameF) list = list.filter(c => c.initials.toLowerCase().includes(nameF));
    if (recF) list = list.filter(c => String(c.no).includes(recF));
    if (grpF) list = list.filter(c => c.group.includes(grpF));
    const staffNames = [...new Set(lauris.db.consumers.map(c => c.staff).filter(Boolean))];
    return page('Consumers', 'consumers', `${flash(q)}
<div class="tabs"><a class="tab${tab === 'active' ? ' on' : ''}" href="/consumers?tab=active">Active Consumers</a><a class="tab${tab === 'discharged' ? ' on' : ''}" href="/consumers?tab=discharged">Discharged Consumers</a><a class="lb" style="margin-left:auto;align-self:center" href="/consumers/new">+ New Consumer</a></div>
<form class="filters" method="get" action="/consumers"><input type="hidden" name="tab" value="${tab}">
<div><label for="fc">Consumer</label><input class="in" id="fc" name="consumer" value="${esc(q.get('consumer') || '')}"></div>
<div><label for="fr">Record #</label><input class="in" id="fr" name="record" value="${esc(recF)}"></div>
<div><label for="fs">Assigned staff</label><select class="in" id="fs" name="staff"><option value="">All staff</option>${staffNames.map(n => `<option${n === staffF ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
<div><label for="fg">Caseload group</label><input class="in" id="fg" name="group" value="${esc(grpF)}" placeholder="e.g. TDT"></div>
<button class="lb pri" type="submit">Search Consumers</button></form>
<table class="list" id="consumer-list"><tr><th>Unique ID</th><th>Name</th><th>Staff</th><th>Group</th><th>Last updated</th><th>Units</th></tr>
${list.map(c => `<tr data-consumer="${c.no}" data-program="${esc(c.program)}"><td>${c.no}</td><td><a href="/consumers/${c.no}">${esc(c.initials)}</a></td><td>${esc(c.staff)}</td><td>${esc(c.group)}</td><td>${US(c.updated)}</td><td>${c.auth && c.auth.available != null ? c.auth.available + ' units available' : 'No authorizations available'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No consumers match.</td></tr>'}</table>`);
  }

  if (p === '/consumers/new') {
    if (req.method === 'POST') {
      const f = await readForm(req);
      if (!f.initials) return redirect(res, '/consumers/new');
      const c = lauris.addConsumer(f);
      return redirect(res, `/consumers/${c.no}?created=${c.no}`);
    }
    const sel = (id, label, opts) => `<div><label for="${id}">${label}</label><select class="in" id="${id}" name="${id}">${opts.map(o => `<option>${esc(o)}</option>`).join('')}</select></div>`;
    const inp = (id, label) => `<div><label for="${id}">${label}</label><input class="in" id="${id}" name="${id}"></div>`;
    return page('New Consumer', 'consumers', `<h2>New Consumer</h2><form method="post" class="card" id="lauris-form" data-form="new-consumer">
<div class="grid">${inp('initials', 'Name')}${inp('dob', 'Date of birth')}${sel('locality', 'Locality', ['', 'Lynchburg City', 'Campbell County'])}${sel('school', 'School', ['', 'Lynchburg City · MS-2', 'Lynchburg City · ES-3', 'Campbell County · ES-1', 'Campbell County · ES-2', 'Campbell County · MS-1', 'Campbell County · HS-1'])}
${sel('program', 'Program', ['TDT', 'Outpatient', 'SEBS'])}${inp('staff', 'Assigned staff')}${inp('clinician', 'Clinician')}</div>
<button class="lb pri" type="submit">Save Consumer</button> <a class="lb" href="/consumers">Cancel</a></form>`);
  }

  let m = p.match(/^\/consumers\/(\d+)$/);
  if (m) {
    const c = lauris.consumer(m[1]); if (!c) return notFound(res);
    const tab = q.get('tab') || 'general';
    let body = '';
    if (tab === 'general') body = `<div class="card"><div class="grid">${[['Locality', c.locality], ['School', c.school], ['Program', c.program], ['Group', c.group], ['Assigned staff', c.staff], ['Clinician', c.clinician], ['Guardian', c.guardian], ['Diagnosis', c.diagnosis || '—']].map(([l, v]) => `<div><span class="lbl">${l}</span><div class="in g">${esc(v || '—')}</div></div>`).join('')}</div>
${c.goals?.length ? `<span class="lbl">ISP goals</span>${c.goals.map(g => `<div class="in g" style="margin-bottom:4px">Obj. ${g.n} – ${esc(g.objective)}</div>`).join('')}` : ''}</div>
<a class="lb pri" href="/consumers/${c.no}/session">Add Session</a> <a class="lb" href="/consumers/${c.no}/surveys">Surveys</a>`;
    if (tab === 'auth') body = c.auth?.units ? `<table class="list"><tr><th>Payer</th><th>Procedure</th><th>Units</th><th>Used</th><th>Available</th><th>Start</th><th>End</th></tr><tr><td>${esc(c.auth.payer_name)}</td><td>H2016</td><td>${c.auth.units}</td><td>${c.auth.used}</td><td>${c.auth.available}</td><td>${c.auth.start_us}</td><td>${c.auth.end_us}</td></tr></table>` : `<div class="card muted">${c.auth ? c.auth.available + ' units available (details not in the mock)' : 'No authorizations available'}</div>`;
    if (tab === 'documents') body = `<div class="card">${(c.documents || []).length ? c.documents.map(d => `<div>${esc(d)}</div>`).join('') : '<span class="muted">No documents uploaded.</span>'}</div>`;
    if (tab === 'active') body = `<table class="list"><tr><th>Date</th><th>Form</th><th>Status</th><th></th></tr>${lauris.db.sessions.filter(s => s.no === c.no).sort((a, b) => b.id - a.id).map(s => `<tr><td>${US(s.date)}</td><td>${esc(FORMS[s.form].title)}</td><td>${s.status}</td><td>${s.status === 'saved' ? `<a href="/consumers/${c.no}/session/${s.form}?id=${s.id}">Open</a>` : s.status === 'processed' && s.approve ? `<a href="/approvals/${s.id}">Preview</a>` : `<a href="/sessions/${s.id}">View</a>`}</td></tr>`).join('')}</table>`;
    if (tab === 'medications' || tab === 'allergies') body = `<div class="card muted">Nothing recorded in the mock.</div>`;
    return page(c.initials, 'consumers', `${flash(q)}${consumerHeader(c)}${tabs(c, tab)}${body}`);
  }

  m = p.match(/^\/consumers\/(\d+)\/session$/);
  if (m || p === '/add-session') {
    const c = m ? lauris.consumer(m[1]) : null;
    if (!c) {
      return page('Add Session', 'add', `<h2>Add Session</h2><div class="card">Pick a consumer first.</div><table class="list"><tr><th>Name</th><th>Group</th></tr>${lauris.db.consumers.filter(x => x.status === 'active').map(x => `<tr><td><a href="/consumers/${x.no}/session">${esc(x.initials)}</a></td><td>${esc(x.group)}</td></tr>`).join('')}</table>`);
    }
    return page('Add Session', 'add', `${consumerHeader(c)}${tabs(c, 'active')}<h2>Add Session · pick a form</h2><div class="picker">${FORM_ORDER.map(k => `<a href="/consumers/${c.no}/session/${k}">${esc(FORMS[k].title)}<span>${k}</span></a>`).join('')}</div>`);
  }

  m = p.match(/^\/consumers\/(\d+)\/session\/([\w-]+)$/);
  if (m) {
    const c = lauris.consumer(m[1]); const spec = FORMS[m[2]]; if (!c || !spec) return notFound(res);
    if (req.method === 'POST') {
      const body = await readForm(req);
      let s;
      try { s = lauris.saveSession({ id: body.session_id, no: c.no, form: m[2], values: collect(spec, body), staff: user.id, process: body.action === 'process' }); }
      catch (e) { if (e instanceof LaurisError) return redirect(res, `/consumers/${c.no}?tab=active&blocked=${encodeURIComponent(e.message)}`); throw e; }
      if (body.action === 'process') return redirect(res, (spec.approve ? `/consumers/${c.no}?tab=active&processed=${s.id}` : `/consumers/${c.no}?tab=active&processed=${s.id}`));
      return redirect(res, `/consumers/${c.no}/session/${m[2]}?id=${s.id}&saved=${s.id}`);
    }
    const s = q.get('id') ? lauris.session(q.get('id')) : null;
    if (s && !['saved', 'rejected'].includes(s.status)) return redirect(res, s.status === 'processed' && s.approve ? `/approvals/${s.id}` : `/sessions/${s.id}`);   // processed and signed forms are read-only
    const vals = s ? s.values : {};
    const fieldsHTML = spec.fields.map((f, i) => {
      const pre = f.prefill ? f.prefill(c, lauris.db) : '';
      const v = s ? (vals[f.label] ?? (f.type === 'static' ? pre : '')) : pre;
      const green = !!pre && (typeof v !== 'string' || v === pre);
      return fieldHTML(f, i, v, green && f.type !== 'table', c);
    }).join('');
    return page(spec.short, 'add', `${flash(q)}${consumerHeader(c)}${tabs(c, 'active')}
<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><label style="margin:0">Session entry</label><div class="in" style="min-width:260px;width:auto" id="session-form-title">${esc(spec.title)}</div><span class="small muted">Add Session · ${lauris.db.todayUS} · ${esc(user.name)}${s ? ' · saved session #' + s.id : ''}</span></div>
<form method="post" id="lauris-form" data-form="${m[2]}" data-consumer="${c.no}" data-session="${s ? s.id : ''}">
<input type="hidden" name="session_id" value="${s ? s.id : ''}">
<div class="grid">${fieldsHTML}</div>
<div style="display:flex;gap:8px;margin-top:8px"><button class="lb" name="action" value="save" type="submit">Save Form Data</button><button class="lb" name="action" value="process" type="submit" id="process-form">Process Form</button></div>
</form>`);
  }

  m = p.match(/^\/consumers\/(\d+)\/surveys$/);
  if (m) {
    const c = lauris.consumer(m[1]); if (!c) return notFound(res);
    const INST = { 'PHQ-A': 9, 'GAD-7': 7, SUDS: 2, 'DSM cross-cutting (child)': 12, 'DSM cross-cutting (parent)': 12 };
    if (req.method === 'POST') {
      const f = await readForm(req); const n = INST[f.instrument] || 0; const answers = {};
      for (let k = 0; k < n; k++) if (f['q' + k] !== undefined && f['q' + k] !== '') answers['Item ' + (k + 1)] = f['q' + k];
      const score = lauris.saveSurvey(c.no, f.instrument, answers, user.id);
      return redirect(res, `/consumers/${c.no}/surveys?instrument=${encodeURIComponent(f.instrument)}&scored=${score}`);
    }
    const inst = q.get('instrument') || 'PHQ-A'; const n = INST[inst] || 9;
    return page('Surveys', 'consumers', `${q.get('scored') ? `<div class="flash" role="status" id="lauris-flash" data-event="survey" data-consumer="${c.no}">${esc(inst)} saved · Lauris score ${esc(q.get('scored'))}</div>` : ''}${consumerHeader(c)}${tabs(c, 'general')}
<div class="tabs">${Object.keys(INST).map(k => `<a class="tab${k === inst ? ' on' : ''}" href="?instrument=${encodeURIComponent(k)}">${k}</a>`).join('')}</div>
<form method="post" class="card" id="lauris-form" data-form="survey" data-instrument="${esc(inst)}" data-consumer="${c.no}"><input type="hidden" name="instrument" value="${esc(inst)}">
<div class="grid">${Array.from({ length: n }, (_, k) => `<div><label for="q${k}">${esc(inst)} · item ${k + 1}</label><input class="in" id="q${k}" name="q${k}" aria-label="${esc(inst)} item ${k + 1}"></div>`).join('')}</div>
<button class="lb pri" type="submit">Save Survey</button></form>
<table class="list"><tr><th>Date</th><th>Instrument</th><th>Score</th></tr>${(c.surveys || []).map(sv => `<tr><td>${US(sv.date)}</td><td>${esc(sv.instrument)}</td><td>${sv.score}</td></tr>`).join('') || '<tr><td colspan=3 class="muted">No surveys yet.</td></tr>'}</table>`);
  }

  if (p === '/saved') {
    const list = lauris.db.sessions.filter(s => s.status === 'saved' && (user.role !== 'direct_support' || s.staff === user.id));
    return page('Saved Session', 'saved', `<h2>Saved Session</h2><p class="muted small">Forms saved but not processed.</p><table class="list"><tr><th>Date</th><th>Consumer</th><th>Form</th><th>Staff</th><th></th></tr>${list.map(s => { const c = lauris.consumer(s.no); return `<tr><td>${US(s.date)}</td><td>${esc(c?.initials)}</td><td>${esc(FORMS[s.form].title)}</td><td>${esc(lauris.user(s.staff)?.name || s.staff)}</td><td><a href="/consumers/${s.no}/session/${s.form}?id=${s.id}">Open</a></td></tr>`; }).join('') || '<tr><td colspan=5 class="muted">Nothing saved.</td></tr>'}</table>`);
  }

  if (p === '/approvals') {
    const list = lauris.db.sessions.filter(s => s.status === 'processed' && s.approve);
    return page('Forms to Approve', 'approvals', `${flash(q)}<h2>Forms to Approve</h2><table class="list" id="approval-list"><tr><th>Processed</th><th>Consumer</th><th>Form</th><th>Processed by</th><th></th></tr>${list.map(s => { const c = lauris.consumer(s.no); return `<tr data-session="${s.id}" data-form="${s.form}" data-consumer="${s.no}"><td>${US(s.processed_at)}</td><td>${esc(c?.initials)}</td><td>${esc(FORMS[s.form].title)}</td><td>${esc(lauris.user(s.processed_by || s.staff)?.name || '')}</td><td><a href="/approvals/${s.id}">Preview</a></td></tr>`; }).join('') || '<tr><td colspan=5 class="muted">Nothing to approve.</td></tr>'}</table>`);
  }
  m = p.match(/^\/approvals\/(\d+)(\/sign|\/reject)?$/);
  if (m) {
    const s = lauris.session(m[1]); if (!s) return notFound(res); const c = lauris.consumer(s.no);
    if (req.method === 'POST' && m[2] === '/sign') {
      try { lauris.sign(s.id, user.id); } catch (e) { if (e instanceof LaurisError) return redirect(res, `/approvals/${s.id}?denied=${encodeURIComponent(e.message)}&session=${s.id}`); throw e; }
      return redirect(res, `/approvals/${s.id}?signed=${s.id}`);
    }
    if (req.method === 'POST' && m[2] === '/reject') {
      const f = await readForm(req);
      try { lauris.reject(s.id, user.name, f.note || 'Rejected'); } catch (e) { if (e instanceof LaurisError) return redirect(res, `/approvals/${s.id}?denied=${encodeURIComponent(e.message)}&session=${s.id}`); throw e; }
      return redirect(res, `/rejected?rejected=${s.id}`);
    }
    const actions = s.status === 'processed' ? `<div style="display:flex;gap:8px;margin-top:10px;align-items:flex-start"><form method="post" action="/approvals/${s.id}/sign"><button class="lb pri" id="get-signature" type="submit">Get Signature</button></form>
<form method="post" action="/approvals/${s.id}/reject" style="display:flex;gap:6px"><input class="in" name="note" aria-label="Reviewer note" placeholder="Reviewer note" style="width:280px"><button class="lb" type="submit">Reject</button></form></div>` : `<p class="small muted">Status: ${s.status}${s.signed_by ? ' · signed by ' + esc(s.signed_by) : ''}</p>`;
    return page('Forms to Approve', 'approvals', `${flash(q)}${consumerHeader(c, `${esc(FORMS[s.form].short)} · processed ${US(s.processed_at)}`)}${tabs(c, 'documents')}
<div class="card"><div class="grid"><div><span class="lbl">Form</span><div class="in">${esc(FORMS[s.form].title)}</div></div><div><span class="lbl">Reviewer</span><div class="in">${esc(user.name)}</div></div><div><span class="lbl">Status</span><div class="in" id="approval-status">${s.status === 'approved' ? 'Signed' : 'Awaiting electronic signature'}</div></div></div></div>
${previewHTML(s, c)}${actions}`);
  }
  m = p.match(/^\/sessions\/(\d+)$/);
  if (m) { const s = lauris.session(m[1]); if (!s) return notFound(res); const c = lauris.consumer(s.no); return page('Session', 'consumers', `${consumerHeader(c)}${tabs(c, 'active')}${previewHTML(s, c)}`); }

  if (p === '/rejected') {
    const list = lauris.db.sessions.filter(s => s.status === 'rejected');
    return page('Rejected Forms', 'rejected', `${flash(q)}<h2>Rejected Forms</h2><table class="list"><tr><th>Date</th><th>Consumer</th><th>Form</th><th>Reviewer note</th><th></th></tr>${list.map(s => { const c = lauris.consumer(s.no); return `<tr><td>${US(s.date)}</td><td>${esc(c?.initials)}</td><td>${esc(FORMS[s.form].title)}</td><td>${esc(s.reject_note)}</td><td><a href="/consumers/${s.no}/session/${s.form}?id=${s.id}">Open</a></td></tr>`; }).join('') || '<tr><td colspan=5 class="muted">None.</td></tr>'}</table>`);
  }
  if (p === '/authorizations') {
    const list = lauris.db.consumers.filter(c => c.status === 'active' && !c.auth);
    return page('Consumers w/o Authorizations', 'noauth', `<h2>Consumers w/o Authorizations</h2><table class="list"><tr><th>Unique ID</th><th>Name</th><th>Staff</th><th>Group</th></tr>${list.map(c => `<tr><td>${c.no}</td><td><a href="/consumers/${c.no}">${esc(c.initials)}</a></td><td>${esc(c.staff)}</td><td>${esc(c.group)}</td></tr>`).join('')}</table>`);
  }
  if (['/reports', '/user', '/time'].includes(p)) return page('Lauris', p.slice(1), `<h2>${p === '/user' ? 'User Information' : p === '/time' ? 'Time Tracker' : 'Reports'}</h2><div class="card muted">Not part of the mock. Psyflo does not use this page.${p === '/user' ? `<br>Signed in as ${esc(user.name)} (${esc(user.id)}).` : ''}</div><a class="lb" href="/consumers">Back to Consumers</a>`);
  return notFound(res);
}

function loginBody(err) {
  return `<div style="max-width:380px;margin:60px auto" class="card"><h2>Sign in to Lauris Online</h2>${err ? `<div class="flash r">${esc(err)}</div>` : ''}
<form method="post"><div style="margin-bottom:10px"><label for="u">Username</label><input class="in" id="u" name="username" value="jperez" autocomplete="username"></div>
<div style="margin-bottom:10px"><label for="pw">Password</label><input class="in" id="pw" name="password" type="password" value="demo"></div>
<button class="lb pri" type="submit">Sign in</button></form>
<p class="small muted">Mock site. Any seed staff id signs in: jperez, khale, cdiaz, slane, rowens, dowens.</p></div>`;
}
