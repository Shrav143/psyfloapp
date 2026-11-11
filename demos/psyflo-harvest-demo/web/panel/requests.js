// The request panel (screens 17, 18, 33): draft the SRA, then one status line that walks
// Processed · pending clinical approval → Pending signature → Signed · ready to submit → Open Send.
// Sign-off is a state of this view. A person still presses Process Form and Get Signature in Lauris, and Send in Psyflo.
import { P, S, M, ACT, api, esc, meFromPage, myLevel, clientForPage, flash, draw, fillBoxes, asItem, withEdits, renderBoxes, setCur, oneStep, shortLabel, laurisNo } from './core.js';
import { frame, chip, sevKind, I, btn, card, flashLine, help, checksLine, PART, srcNums } from './ui.js';
import { draftInitialSRA, draftSeeded, screeningFacts } from '../js/shared/draft.js';
import { fmtDate, daysBetween } from '../js/shared/dates.js';

const wrap = (o, body, extra = {}) => frame({ logo: P.logo, body: flashLine(P.ui.flash) + body, ...o, ...extra });
const FORM_OF = { initial: 'sra-initial', continued_stay: 'sra-continued' };
const NAME_OF = { initial: 'Initial request', continued_stay: 'Continued stay' };
export const findRequest = (c, type) => S().requests.find(r => r.client === c.id && (type === 'initial' ? r.type === 'initial' : r.type === 'continued_stay') && r.stage !== 'closed') || null;

// ---------------------------------------------------------------- the draft of the initial request, written from the screening, the intake, the plan and the referral
export function sraData(c) {
  const s = S(); const sc = s.screenings.find(x => x.client === c.id && (x.facts || x.transcript));
  const facts = sc?.facts || (sc?.transcript ? screeningFacts(sc.transcript) : null);
  if (!facts) return null;
  const r = s.referrals.find(x => x.id === c.referral);
  return draftInitialSRA({ client: c, screening: { facts, when: sc.when }, referral: r, school: (s.school_numbers || {})[c.id], today: s.today, isp: { date: c.timeline?.isp }, cna: { date: c.timeline?.intake } });
}

// ---------------------------------------------------------------- the status line
// header chip: the request status; the card says where it stands and offers the one next step
// the header chip is short so the student's initials stay visible next to it
const headChip = r => { const l = M.STAGE_LABEL[r.stage] || r.stage; return l.replace('Pending clinical approval', 'Pending approval'); };
const statusKind = r => ({ needs_approval: 'y', awaiting_signature: 'y', signed: 'g' }[r.stage] || sevKind(M.statusChip(S(), r).sev));
function statusCard(c, req, { onApprovals }) {
  const s = S(); const lvl = myLevel(); const st = M.statusChip(s, req);
  let line, act = '', ico = I.open, cls = 'watch', tip = '';
  switch (req.stage) {
    case 'needs_approval':
      line = 'Processed <span class="sep"></span> pending clinical approval'; tip = help('approval', 'the approval');
      act = lvl >= 3 ? btn('Approve', 'approve', { k: 'p', f: true, attrs: `data-id="${esc(req.id)}"` }) : '';
      break;
    case 'awaiting_signature':
      line = 'Pending signature';
      act = onApprovals ? '' : btn('Open Forms to Approve', 'nav', { k: 'p', f: true, attrs: 'data-href="/approvals"' });
      break;
    case 'signed':
      line = 'Signed <span class="sep"></span> ready to submit'; ico = I.ok; cls = 'ok';
      act = btn('Open Send', 'openApp', { k: 'p', f: true, attrs: `data-href="#/Authorizations?open=${esc(req.id)}"` }) + (req.signed_pdf ? `<a class="btn t s" href="${esc(req.signed_pdf)}" target="_blank" rel="noopener">Signed PDF</a>` : '');
      break;
    default:
      line = esc(st.text); cls = st.sev === 'r' ? 'watch' : 'ok'; ico = st.sev === 'r' ? I.warn : I.ok;
      tip = ['submitted', 'overdue'].includes(req.stage) ? help('clock', 'the clock') : '';
      act = btn('Open activity', 'openApp', { k: 'p', f: true, attrs: `data-href="#/Authorizations?open=${esc(req.id)}"` });
  }
  return card(`<div class="t"><b>${esc(req.id)}</b><span class="sp"></span>${tip}</div><div class="stat ${cls}">${ico}<span>${line}</span></div><div class="row w">${act}</div>`);
}
ACT.approve = async el => { await api.do('request.approve', { id: el.dataset.id, by: meFromPage().id }); flash('Approved'); };

// "Before you sign" on the Forms to Approve preview, as checks: boxes match the draft, criteria shown, days left on the 30-day limit
function signChecks(c, req, type) {
  const pv = P.page.preview || {}; const d = type === 'initial' ? sraData(c) : null;
  const checks = [];
  let edits = 0; if (d) for (const b of d.boxes) { const row = (pv.rows || []).find(r => r.label === b.label); if (row && row.value !== b.value) edits++; }
  checks.push({ rule: 'Boxes match the draft', pass: true, detail: edits ? `${edits} changed after Psyflo typed ${edits === 1 ? 'it' : 'them'} · you are the author` : '0 edits since you approved it' });
  if (d) checks.push({ rule: 'Criteria and level of care', pass: true, detail: '2 of 3 criteria · level of care shown · dates within 30 days' });
  const limit = req?.limit_30 ? daysBetween(S().today, req.limit_30) : null;
  if (limit != null) checks.push({ rule: '30-day limit', pass: limit > 7, detail: `${limit} days left` });
  return checks;
}

export function requestView(c, type) {
  const s = S(); const u = P.ui; const p = P.page; const req = findRequest(c, type); const name = NAME_OF[type];
  const onApprovals = p.kind === 'approval' || p.kind === 'approvals';
  const drafting = !req || req.stage === 'draft_ready' || (type === 'continued_stay' && req.stage === 'active');
  if (!drafting) {
    const d = type === 'initial' ? sraData(c) : draftSeeded('sra-continued', { client: c, notes: s.notes_sample.filter(n => n.client === c.id), today: s.today });
    const checks = p.kind === 'approval' && req.stage === 'awaiting_signature' ? signChecks(c, req, type) : (d ? d.checks : []);
    const st = M.statusChip(s, req);
    return wrap({ form: name, student: c.initials, chip: [headChip(req), statusKind(req)] }, statusCard(c, req, { onApprovals }) + checksLine(checks, { name: PART.preChecks, open: u.checksOpen }));
  }
  return type === 'initial' ? initialDraft(c, req) : caseDraft(c, req);
}

// ---------------------------------------------------------------- draft state · initial request (screen 17)
function initialDraft(c, req) {
  const s = S(); const u = P.ui; const d = sraData(c);
  const head = { form: 'Initial request', student: c.initials, chip: [M.STAGE_LABEL.draft_ready, 'n'] };
  if (!d) return wrap(head, card(`<div class="t">Run the screening first</div>${btn('Open screening', 'nav', { k: 'p', f: true, attrs: `data-href="/consumers/${P.page.consumer.no}/session/screening"` })}`));
  const send = withEdits('sra-initial', d.boxes);
  setCur('sra-initial', c, d.sources, send);
  const lf = (P.page.form?.fields || []); const greenGoals = lf.filter(f => /^Goal \d/.test(f.label) && f.green && f.value).length;
  const st = req ? M.statusChip(s, req) : null; const clk = req ? M.requestClock(s, req).text.replace(' of the 30-day limit', '') : '';
  const items = d.boxes.map(b => asItem('sra-initial', b))
    .concat(d.blank.map(b => ({ k: b.label, label: b.label, short: shortLabel(b.label), value: '', empty: /criterion 3/.test(b.label) ? 'Left blank' : 'Yours', why: b.why, ro: true })))
    .concat([{ k: 'goals', label: 'Goals 1–3 · strengths', short: 'Goals 1–3', value: '', empty: greenGoals ? 'From the ISP' : 'Copied from the ISP when processed', ro: true, state: greenGoals ? 'g' : '' }]);
  const cur = u.one != null ? send[u.one]?.label : null;
  const body = card(`${req ? `<div class="t"><b>${esc(req.id)}</b><span class="sp"></span>${clk ? chip(clk, sevKind(st.sev)) : ''}</div>` : ''}${u.one != null ? oneStep(send) : `<div class="row">${btn(`Fill ${d.boxes.length} boxes`, 'fillAll', { k: 'p', f: true, disabled: u.filling })}${btn('One at a time', 'oneStart', { k: 't' })}</div>`}`)
    + renderBoxes('sra-initial', items, d.sources, { cur }) + checksLine(d.checks, { name: PART.preChecks, open: u.checksOpen });
  return wrap(head, body);
}

// ---------------------------------------------------------------- draft state · continued stay (screen 33)
const CASE_K = { 30: { agg: '3', elope: '2', strat: '3 of 5', hold: '0', notes: 21, days: 30 }, all: { agg: '9', elope: '5', strat: '7 of 14', hold: '1', notes: 61, days: 61 } };
function caseDraft(c, req) {
  const s = S(); const u = P.ui; const cs = u.cs = u.cs || { range: '30', conf: 'include' };
  const d = draftSeeded('sra-continued', { client: c, notes: s.notes_sample.filter(n => n.client === c.id), today: s.today, includeHousehold: cs.conf === 'include', range: cs.range });
  const K = CASE_K[cs.range]; const send = withEdits('sra-continued', d.boxes);
  setCur('sra-continued', c, d.sources, send);
  const st = req ? M.statusChip(s, req) : null;
  const seg = `<div class="u-seg" role="group" aria-label="Date range"><button type="button" class="${cs.range === '30' ? 'on' : ''}" data-act="csRange" data-r="30">Last 30 days</button><button type="button" class="${cs.range === 'all' ? 'on' : ''}" data-act="csRange" data-r="all">Whole period</button><button type="button" data-act="csPick">Pick dates</button></div>`;
  const toggle = `<div class="go" style="align-items:center"><span class="small">Household detail</span>${help('household', 'household detail')}<span class="sp"></span><span class="u-seg"><button type="button" class="${cs.conf === 'include' ? 'on' : ''}" data-act="csConf" data-v="include">Include</button><button type="button" class="${cs.conf === 'exclude' ? 'on' : ''}" data-act="csConf" data-v="exclude">Exclude</button></span></div>`;
  const items = d.boxes.map(b => asItem('sra-continued', b, b.label === 'Continued need / risk' ? { extra: toggle } : {}));
  const cur = u.one != null ? send[u.one]?.label : null;
  const srcOpen = u.srcOpen;
  const sources = `<div><button type="button" class="btn t s" data-act="srcToggle" aria-expanded="${srcOpen ? 'true' : 'false'}">Sources · ${d.sources.length}</button>${srcOpen ? `<div class="bx-s">${d.sources.map(x => `<div><b>${x.n}</b><span data-doc>${esc(x.label)}${x.date ? ' · ' + esc(fmtDate(x.date)) : ''}</span></div>`).join('')}</div>` : ''}</div>`;
  const body = card(`${u.one != null ? oneStep(send) : ''}${seg}<div class="small muted">from ${K.notes} notes <span class="sep"></span> ${K.days} days</div>
      <div class="kt">${chip(`Aggression ${K.agg}`)}${chip(`Eloped ${K.elope}`)}${chip(`Taught strategy ${K.strat}`)}${chip(`Safety hold ${K.hold}`)}</div>`)
    + renderBoxes('sra-continued', items, d.sources, { cur }) + checksLine(d.checks, { name: PART.preChecks, open: u.checksOpen }) + sources;
  const footer = `${btn('One at a time', 'oneStart', { k: 't' })}<span class="sp"></span>${btn(`Fill ${d.boxes.length} boxes`, 'fillAll', { k: 'p', disabled: u.filling })}`;
  return wrap({ form: 'Continued stay', student: c.initials, chip: [M.STAGE_LABEL.draft_ready, 'n'] }, body, { footer });
}
ACT.csRange = el => { P.ui.cs.range = el.dataset.r; draw(); };
ACT.csPick = () => flash('Last 30 days or Whole period in this demo', 'y');
ACT.csConf = el => { P.ui.cs.conf = el.dataset.v; if (P.ui.edits?.['sra-continued']) delete P.ui.edits['sra-continued']['Continued need / risk']; draw(); };
ACT.srcToggle = () => { P.ui.srcOpen = !P.ui.srcOpen; draw(); };

// ---------------------------------------------------------------- Forms to Approve (list and preview)
export function approvalsView(c) {
  const s = S(); const p = P.page;
  if (p.kind === 'approvals') {
    const list = p.approvals || [];
    const rows = list.map(a => { const cl = s.clients.find(x => x.lauris_no === Number(a.consumer) || x.harvest_no === Number(a.consumer)); const r = cl && s.requests.find(q => q.client === cl.id && ['needs_approval', 'awaiting_signature'].includes(q.stage)); return `<div class="li"><span class="tt"><b>${esc(a.initials)}</b> <span data-doc>${esc(a.title)}</span></span>${r ? chip(r.id) : ''}${btn('Open', 'nav', { k: 'o', s: true, attrs: `data-href="/approvals/${esc(a.session)}"` })}</div>`; }).join('');
    return wrap({ form: 'Forms to Approve', chip: [`${list.length} waiting`, list.length ? 'y' : 'n'] }, `<div class="bl">${rows || '<div class="li muted">Nothing to sign</div>'}</div>`);
  }
  const pv = p.preview || {}; const type = pv.form;
  if (c && (type === 'sra-initial' || type === 'sra-continued')) return requestView(c, type === 'sra-initial' ? 'initial' : 'continued_stay');
  const signed = P.event?.event === 'signed' || pv.signed;
  return wrap({ form: pv.title || 'Form', student: c?.initials, chip: [signed ? 'Signed' : 'Pending signature', signed ? 'g' : 'y'] }, card(`<div class="stat ${signed ? 'ok' : 'watch'}">${signed ? I.ok : I.open}<span>${signed ? 'Signed in Lauris' : 'Pending signature'}</span></div>`));
}
