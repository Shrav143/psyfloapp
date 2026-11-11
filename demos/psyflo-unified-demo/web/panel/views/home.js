// Extension home (E5), 400 px: three equal buttons (Scribe, Track Time, Scan & Enhance where permitted), one next task, the current document,
// and collapsed accordions (Checks, Sources, Recent activity). No demo role toggles: the presenter dock replaces them.
// Everything here is read from the page the person has open and from Psyflo's own records; it types nothing.
import { esc } from '../../js/runtime.js';
import { fmtDate, fmtTime } from '../../js/shared/dates.js';
import { now as clockNow } from '../../js/shared/clock.js';
import { newReferrals, refInfo, refKnown, referralForConsumer } from '../lib/boxes.js';
import { FORM_NAME } from '../parts.js';

const NEXT_FORM = { screening: ['cna', 'Open the intake (CNA)'], cna: ['isp', 'Open the treatment plan (ISP)'], isp: ['sra-initial', 'Open the initial request (SRA)'], 'sra-initial': ['/approvals', 'Open Forms to Approve'], 'sra-continued': ['/approvals', 'Open Forms to Approve'] };

const hello = ctx => { const s = ctx.S(); const h = +clockNow(s).slice(11, 13); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };
function incidentClock(ctx) {
  const s = ctx.S(); const role = ctx.role(); if (!['clinician', 'supervisor'].includes(role)) return null;
  const inc = (s.incidents || []).find(i => i.state_portal_due && !i.state_portal_filed && i.status !== 'complete');
  if (!inc) return null;
  const c = s.clients.find(x => x.id === inc.client);
  return { inc, c, left: Math.round((Date.parse(inc.state_portal_due) - Date.parse(clockNow(s))) / 60000) };
}

// the one thing to do next, by role (a state, never a paragraph)
function nextTask(ctx) {
  const s = ctx.S(); const me = ctx.me(); const role = ctx.role(); const c = ctx.client(); const M = ctx.M;
  const noOf = x => x.lauris_no || x.harvest_no;
  if (c) {
    const d = M.waitingDictations(s, c.id);
    if (d.length && ctx.can('notes.own', { clientId: c.id })) return { title: `${d.length} dictation${d.length === 1 ? '' : 's'} waiting for ${c.initials}`, why: `From the phone · ${fmtTime(d[0].at)}`, label: "Open today's daily note", nav: `/consumers/${noOf(c)}/session/dpn`, chip: ['y', 'waiting'] };
  }
  if (role === 'direct_support') {
    const nt = M.notesToday(s, me.id); const todo = nt.students.filter(x => !nt.doneSet.has(x.id) && noOf(x));
    const waiting = todo.find(x => M.waitingDictations(s, x.id).length);
    const pick = waiting || (c && todo.find(x => x.id === c.id)) || todo[0];
    if (pick) return { title: `Daily note · ${pick.initials}`, why: `${nt.done} of ${nt.total} done today`, label: 'Start the note', nav: `/consumers/${noOf(pick)}/session/dpn`, chip: ['n', `${nt.total - nt.done} left`] };
    return { title: 'Daily notes are done', why: `${nt.done} of ${nt.total} today`, chip: ['g', 'done'] };
  }
  if (role === 'clinician') {
    const nr = newReferrals(ctx);
    if (nr.length) { const r = nr[0]; return { title: `New consumer · ${refInfo(ctx, r).label}`, why: `${r.id} · from the school portal · not in Lauris yet`, label: 'Create it from the referral', nav: `/consumers/new?referral=${r.id}`, chip: ['y', nr.length > 1 ? `${nr.length} new` : 'new'] }; }
    const sc = s.screenings.filter(x => x.status === 'booked');
    const rq = s.requests.filter(r => ['needs_approval', 'draft_ready', 'awaiting_signature', 'signed'].includes(r.stage));
    const pend = rq.find(r => r.stage === 'needs_approval' && ctx.can('approve.sra')) || rq[0];
    if (pend) { const cl = s.clients.find(x => x.id === pend.client); const form = pend.type === 'initial' ? 'sra-initial' : 'sra-continued'; const clk = M.requestClock(s, pend);
      return { title: `${M.TYPE_LABEL[pend.type]} · ${cl ? cl.initials : pend.client}`, why: `${pend.id} · ${M.STAGE_LABEL[pend.stage]} · ${clk.text}`, label: pend.stage === 'needs_approval' ? 'Review and approve' : pend.stage === 'awaiting_signature' || pend.stage === 'signed' ? 'Open Forms to Approve' : 'Review the draft', nav: pend.stage === 'awaiting_signature' || pend.stage === 'signed' ? '/approvals' : cl && noOf(cl) ? `/consumers/${noOf(cl)}/session/${form}` : '/consumers/new', chip: [clk.sev === 'r' ? 'r' : 'y', pend.id] }; }
    if (sc.length) return { title: `Screening call · ${sc.length}`, why: 'Booked in Psyflo', chip: ['n', 'booked'] };
    return { title: 'Nothing waiting', why: 'No referral, request or screening needs you', chip: ['g', 'clear'] };
  }
  if (role === 'supervisor') {
    const n = s.notes.filter(x => x.review === 'pending').length;
    return n ? { title: `${n} note${n === 1 ? '' : 's'} to review`, why: 'Trainee notes wait for you', label: 'Open My Work', app: '#/MyWork?section=review', chip: ['y', String(n)] } : { title: 'No notes to review', why: '', chip: ['g', 'clear'] };
  }
  return null;
}

// the to-review row: referrals not in Lauris and school updates not yet used (a clinician's "5 to review")
function reviewRows(ctx) {
  const s = ctx.S(); const rows = [];
  if (ctx.role() === 'clinician') for (const r of newReferrals(ctx)) rows.push({ k: 'ref', r, text: `${refInfo(ctx, r).label} · ${r.id}`, sub: refKnown(ctx, r).slice(0, 2).join(' · ') });
  const today = ctx.M.today(s); const me = ctx.me();
  for (const sh of s.shares || []) { if (String(sh.at || '').slice(0, 10) !== today || (sh.used && sh.used.daily)) continue; const c = s.clients.find(x => x.id === sh.client); if (!c || (ctx.role() === 'direct_support' && c.staff !== me.id)) continue; rows.push({ k: 'share', c, sh, text: `School update · ${c.initials}`, sub: String(sh.text || '').slice(0, 80) }); }
  return rows;
}

function consumerList(ctx) {
  const s = ctx.S(); const list = ctx.page.consumers || []; if (!list.length) return '';
  return ctx.parts.accordion(`On this page · ${list.length}`, list.map(x => { const c = s.clients.find(y => y.harvest_no === Number(x.no) || y.lauris_no === Number(x.no)); const w = c ? ctx.M.waitingDictations(s, c.id).length + ctx.M.waitingAssessments(s, c.id).length : 0;
    return `<div class="sec"><b><a href="#" data-act="nav" data-href="/consumers/${esc(x.no)}">${esc(x.initials)}</a> <span class="muted" style="font-weight:400">· ${esc(x.units)}</span></b>${x.program !== 'TDT' ? `<span class="chip n">${esc(x.program)} · Psyflo off</span>` : w ? `<span class="chip y">${w} waiting</span>` : '<span class="chip g">TDT</span>'}</div>`; }).join(''), { id: 'home-list' });
}

function recentActivity(ctx, c) {
  const s = ctx.S(); const evs = (s.events || []).filter(e => c ? e.record === c.id || (c.referral && e.record === c.referral) : false).slice(-5).reverse();
  if (!evs.length) return '<div class="hint">Nothing recorded yet.</div>';
  return evs.map(e => `<div class="stamp"><div>${fmtDate(e.at)} ${esc(fmtTime(e.at))}</div><div>${esc(e.what)}${e.sim ? ' ' + ctx.ui.chip('Simulated', { tone: 'info', size: 'sm' }) : ''}</div></div>`).join('');
}
function sourcesBlock(ctx, c) {
  const s = ctx.S(); const n = s.notes.filter(x => x.client === c.id); const by = t => n.filter(x => x.type === t).length;
  const rows = [['Stored daily notes', by('daily')], ['Weekly guardian calls', by('weekly_guardian')], ['Monthly collateral', by('monthly_collateral')]];
  const r = s.referrals.find(x => x.id === c.referral);
  return rows.map(([a, b]) => `<div class="stamp"><div><b>${b}</b></div><div>${esc(a)}</div></div>`).join('') + (r ? `<div class="stamp"><div>${esc(r.id)}</div><div>Referral · ${fmtDate(r.received)}</div></div>` : '') + (c.goals && c.goals.length ? `<div class="stamp"><div>${c.goals.length}</div><div>ISP goals on the record</div></div>` : '');
}

// what happened on the page just now (observed by the bridge): the "processed in Lauris" banner and the next step
function observedHTML(ctx, c) {
  const p = ctx.page; const ev = ctx.event; if (!ev) return '';
  const { banner } = ctx.parts; const s = ctx.S(); const no = p.consumer && p.consumer.no;
  if (ev.event === 'created') {
    const r = c ? null : referralForConsumer(ctx, no, p.consumer.initials);
    if (c || r) return banner('', `<b>${esc(p.consumer.initials)} is in Lauris · Harvest # ${esc(no)}.</b> Psyflo linked it to ${esc(c ? (c.referral || c.id) : r.id)}.`) + (ctx.can('drafts.clinical') ? `<button class="btn p blk" data-act="nav" data-href="/consumers/${esc(no)}/session/screening">Open Admission Screening</button><div class="hint">The guardian, phone, language and IEP boxes come from the referral and the family link.</div>` : '');
  }
  if (ev.event === 'processed') {
    const f = ev.form; const next = NEXT_FORM[f];
    const extra = f === 'screening' ? ' The 30-day send limit started.' : f === 'isp' ? ' Psyflo drafted the initial request from the record.' : f === 'dpn' ? ` Daily notes today: ${ctx.M.notesToday(s, c ? c.staff : ctx.me().id).done} of ${ctx.M.notesToday(s, c ? c.staff : ctx.me().id).total}.` : (f || '').startsWith('sra') ? ' It is now Pending clinical approval, then a licensed person presses Get Signature.' : '';
    return banner('', `<b>${esc(FORM_NAME[f] || f)} processed in Lauris.</b> Psyflo's tracker updated.${esc(extra)}`) + (next && c && ctx.can('drafts.clinical') ? `<button class="btn p blk" data-act="nav" data-href="${next[0].startsWith('/') ? next[0] : `/consumers/${esc(no)}/session/${next[0]}`}">${esc(next[1])}</button>` : '');
  }
  if (ev.event === 'saved') return banner('', `<b>${esc(FORM_NAME[ev.form] || ev.form || 'Form')} saved in Lauris</b> (not processed). Psyflo kept the saved version.`);
  return '';
}

function html(ctx) {
  const { banner, accordion } = ctx.parts; const s = ctx.S(); const p = ctx.page; const me = ctx.me(); const role = ctx.role(); const c = ctx.client();
  const first = me.name.split(' ')[0];
  let h = `<div><h2 class="vt">Good ${hello(ctx)}, ${esc(first)}.</h2><div class="hint">${fmtDate(ctx.M.today(s), { dow: true })}</div></div>`;
  const ic = incidentClock(ctx);
  if (ic) h += banner('r', `<b>State portal clock · ${esc(ic.c ? ic.c.initials : '')} Level ${ic.inc.level}</b> · due ${esc(fmtDate(ic.inc.state_portal_due))} ${esc(fmtTime(ic.inc.state_portal_due))} ${ic.left > 0 ? `(${Math.floor(ic.left / 60)} h ${ic.left % 60} min left)` : '(past due)'}.${ic.c && (ic.c.lauris_no || ic.c.harvest_no) ? ` <a href="#" data-act="nav" data-href="/consumers/${ic.c.lauris_no || ic.c.harvest_no}/session/incident">Open the incident report</a>` : ''}`);
  h += observedHTML(ctx, c);
  // the three equal buttons
  const scanOk = ctx.can('scanEnhance', c ? { clientId: c.id } : undefined); const timeOk = ctx.can('trackTime', c ? { clientId: c.id } : undefined); const scribeOk = ctx.can('notes.own') || ctx.can('drafts.clinical');
  const btns = [scribeOk && ['scribe', ctx.I.mic, 'Scribe'], timeOk && ['time', ctx.I.clock, 'Track Time'], scanOk && ['enhance', ctx.I.scan, 'Scan &amp; Enhance']].filter(Boolean);
  if (btns.length) h += `<div class="trio" role="group" aria-label="Actions" style="grid-template-columns:repeat(${btns.length},minmax(0,1fr))">${btns.map(([v, ic, l]) => `<button class="btn o" data-act="goView" data-view="${v}">${ic}<span>${l}</span></button>`).join('')}</div>`;
  if (!scanOk) h += `<div class="hint">${ctx.I.lock} Scan &amp; Enhance is for licensed clinical staff${role === 'direct_support' && c ? ' on their own caseload' : ''}.</div>`;
  if (role === 'clinician' && ctx.can('drafts.clinical') && c && (p.kind === 'record' || p.kind === 'session')) h += `<button class="btn o blk" data-act="goView" data-view="authorize"><span>Prepare authorization</span></button>`;
  // the next task
  const nt = nextTask(ctx);
  if (nt) h += `<section class="next" aria-label="Next task"><div class="row w"><h2 style="flex:1">${esc(nt.title)}</h2>${nt.chip ? `<span class="chip ${nt.chip[0]}">${esc(nt.chip[1])}</span>` : ''}</div>${nt.why ? `<div class="small muted">${esc(nt.why)}</div>` : ''}${nt.nav ? `<button class="btn p blk" data-act="nav" data-href="${esc(nt.nav)}">${esc(nt.label)}</button>` : nt.app ? `<button class="btn p blk" data-act="openApp" data-href="${esc(nt.app)}">${esc(nt.label)}</button>` : ''}</section>`;
  // a draft the person already started for this student: back to its review
  if (c) {
    const today = ctx.M.today(s);
    const mine = (s.doc_versions || []).filter(d => d.mode === 'current' && d.client === c.id && d.by === me.id && d.date === today && (d.items || []).length && d.lauris_status !== 'processed');
    if (mine.length) { const d = mine.at(-1); const done = d.items.filter(i => i.state !== 'pending').length; h += `<button class="btn o blk" data-act="goView" data-view="review"><span>Review draft · ${esc(FORM_NAME[d.form] || d.form)}</span><span class="chip ${done === d.items.length ? 'g' : 'y'}">${done} of ${d.items.length}</span></button>`; }
  }
  // the to-review row
  const rr = reviewRows(ctx);
  if (rr.length) h += accordion(`To review`, rr.map(x => x.k === 'ref'
    ? `<div class="box"><div class="row w"><b style="flex:1">${esc(x.text)}</b><span class="chip y">new</span></div><div class="small muted">${esc(x.sub)}</div><div class="row w" style="margin-top:6px"><button class="btn p sm" data-act="nav" data-href="/consumers/new?referral=${esc(x.r.id)}">New consumer</button><button class="btn o sm" data-act="openApp" data-href="#/Referral?id=${esc(x.r.id)}">Referral ↗</button></div></div>`
    : `<div class="box"><div class="row w"><b style="flex:1">${esc(x.text)}</b><span class="chip y">unused</span></div><div class="small muted">${esc(x.sub)}</div>${x.c.lauris_no || x.c.harvest_no ? `<button class="btn o sm" style="margin-top:6px" data-act="nav" data-href="/consumers/${x.c.lauris_no || x.c.harvest_no}/session/dpn">Open the daily note</button>` : ''}</div>`).join(''), { id: 'home-review', count: String(rr.length), open: rr.length <= 2 });
  // current document
  if (p.kind === 'session' && p.form) h += `<div class="row w small"><b>Open:</b><span>${esc(FORM_NAME[p.form.type] || p.form.title)}</span></div>`;
  // collapsed accordions
  if (c) {
    const checks = ctx.pg.lastChecks;
    h += accordion('Checks', checks && checks.length ? checks.map(ctx.parts.chk).join('') : '<div class="hint">Checks appear when a draft is ready.</div>', { id: 'home-checks', count: checks && checks.length ? `${checks.filter(x => x.pass || x.applicable === false).length} of ${checks.length}` : '' });
    h += accordion('Sources', sourcesBlock(ctx, c), { id: 'home-src' });
    h += accordion('Recent activity', recentActivity(ctx, c), { id: 'home-act' });
  }
  h += consumerList(ctx);
  if (!c && (p.kind === 'record' || p.kind === 'pick-form') && p.consumer) {
    const r = referralForConsumer(ctx, p.consumer.no, p.consumer.initials);
    h += banner('n', `${esc(p.consumer.initials)} is not a Psyflo student yet. Nothing to draft.${r ? '' : ''}`);
  }
  return h;
}

const acts = {
  goView(el, ctx) { return ctx.go(el.dataset.view); },
  // record page of a student the referral created: link it to the new Harvest # (the page bridge saw it created)
  async link(el, ctx) { }
};

export default {
  id: 'home', label: 'Home', cap: null, legend: true, openAlways: true,
  title: ctx => { const c = ctx.client(); const me = ctx.me(); return c ? `Psyflo · ${c.initials}` : `Psyflo · ${me.name}${me.credential ? ', ' + me.credential : ''}`; },
  html, acts,
  async onOpen(ctx) {
    // a consumer created in Lauris from a referral with no Psyflo student yet: link the referral to the new Harvest # (Flow A)
    const p = ctx.page; const ev = ctx.event; if (!p.consumer || !ev || ev.event !== 'created') return;
    const r = referralForConsumer(ctx, p.consumer.no, p.consumer.initials);
    if (r && !r.lauris_no) await ctx.do('referral.inLauris', { id: r.id, no: p.consumer.no }).catch(() => { });
  }
};
