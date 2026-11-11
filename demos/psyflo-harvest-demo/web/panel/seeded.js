// The seeded forms in the same frame: treatment plan (16), weekly call (24), monthly collateral (25), incident (26),
// quarterly (32), discharge summary (37). Each has one worked example in the seed; other students get "No draft".
import { P, S, M, ACT, api, esc, meFromPage, clientForPage, flash, draw, fillBoxes, asItem, withEdits, renderBoxes, setCur, oneStep, shortLabel, startRecording, stopRecording, usDate, appURL, laurisNo } from './core.js';
import { frame, chip, I, btn, card, flashLine, help, checksLine, mmss } from './ui.js';
import { sayCard, sayDraft, shareWho } from './notes.js';
import { ispSignLine, savedLine } from './home.js';
import { draftSeeded } from '../js/shared/draft.js';
import { fmtDate, fmtTime, hoursBetween, addHours } from '../js/shared/dates.js';

const wrap = (o, body, extra = {}) => frame({ logo: P.logo, body: flashLine(P.ui.flash) + body, ...o, ...extra });
export const SEEDED = { isp: 'TW', weekly: 'MR', collateral: 'MR', incident: 'DW', quarterly: 'MR', discharge: 'DW' };
const NAME = { isp: 'Treatment plan', weekly: 'Weekly call', collateral: 'Monthly collateral', incident: 'Incident report', quarterly: 'Quarterly report', discharge: 'Discharge summary' };
const BOXES_FOR = { weekly: 'Fill 4 boxes', collateral: 'Fill 3 boxes' };
const ivName = v => String(v || '').replace(/^(Clinical|QMHP)\s[\d.]+[a-z]?\s*/, '');

function seededDraft(type, c) {
  const s = S();
  return draftSeeded(type, { client: c, notes: s.notes_sample.filter(n => n.client === c.id), today: s.today });
}
// 24-hour plan clock (Harvest's practice): from the intake to the processed plan
function planChip(c) {
  const s = S(); const k = M.clocksOf(s); const tl = c.timeline || {};
  if (tl.isp) return ['Plan done', 'g'];
  if (!tl.intake) return [`Plan ${k.isp_due_hours} h`, 'n'];
  const left = hoursBetween(M.now(s), addHours(tl.intake, k.isp_due_hours));
  return left < 0 ? ['Plan overdue', 'r'] : [`Plan ${Math.round(left)} h`, left <= 6 ? 'y' : 'n'];
}
// a recorder row for the calls drafted from a recorded call (weekly, monthly). The boxes are drafted from the recorded call already.
const recRow = () => P.ui.recKind === 'seeded' && P.rec
  ? `<div class="t"><span class="dot on"></span>Recording <span data-timer>${mmss(Math.floor((Date.now() - P.ui.recStart) / 1000))}</span><span class="sp"></span>${btn('Stop', 'seededStop', { k: 'o', s: true })}</div>`
  : `<div class="row">${btn('Record', 'seededRec', { k: 'o', f: true, icon: I.mic })}${help('mic', 'recording')}</div>`;
ACT.seededRec = () => startRecording('sim', 'seeded');
ACT.seededStop = () => { stopRecording(true); P.ui.recKind = null; flash('Call recorded'); };

function noDraftView(type, c, who) {
  const sample = M.client(S(), who); const n = laurisNo(sample);
  const extra = type === 'collateral' ? collateralRows(c) : '';
  return wrap({ form: NAME[type], student: c.initials }, `${extra}${card(`<div class="t">No draft for ${esc(c.initials)}</div>${n ? btn(`Open ${sample.initials}`, 'nav', { k: 'p', f: true, attrs: `data-href="/consumers/${n}/session/${type}"` }) : ''}`)}${type === 'quarterly' ? internalQuarterly(c) : ''}`);
}

export function seededView(type, c) {
  const s = S(); const u = P.ui; const who = SEEDED[type];
  if (type === 'incident' && c.id !== who) return incidentSayView(c);
  if (c.id !== who) return noDraftView(type, c, who);
  const d = seededDraft(type, c); const send = withEdits(type, d.boxes);
  setCur(type, c, d.sources, send);
  const cur = u.one != null ? send[u.one]?.label : null;
  const fill = u.one != null ? oneStep(send) : `<div class="row">${btn(type === 'isp' ? 'Fill the 3 goals' : `Fill ${d.boxes.length} boxes`, 'fillAll', { k: 'p', f: true, disabled: u.filling })}${btn('One at a time', 'oneStart', { k: 't' })}</div>`;
  let head = { form: NAME[type], student: c.initials, chip: [u.filled?.length ? 'Typed' : 'Drafted', u.filled?.length ? 'y' : 'g'] };
  let top = '', list = '', after = '';
  if (type === 'isp') {
    head.chip = planChip(c);
    const byL = l => d.boxes.find(b => b.label === l);
    const items = ['Start / end', 'Prescribed frequency', 'Presenting issue', 'Strengths'].map(l => byL(l) && asItem('isp', byL(l))).filter(Boolean);
    for (const n of [1, 2, 3]) {
      const o = byL(`Goal ${n} · Objective`); if (!o) continue;
      const parts = [o.label, `Goal ${n} · Intervention 1`, `Goal ${n} · Intervention 2`, `Goal ${n} · Est. completion`];
      items.push(asItem('isp', o, { short: `Goal ${n}`, tags: [byL(parts[1]), byL(parts[2])].filter(Boolean).map(b => ivName(b.value)), why: byL(parts[3]) ? `Est. completion ${byL(parts[3]).value}` : '', state: parts.every(l => (u.filled || []).includes(l)) ? 'y' : '' }));
    }
    list = renderBoxes('isp', items, d.sources, { cur });
    after = `<div class="li" style="border:1px solid var(--line);border-radius:12px"><span class="tt"><b>Guardian signature</b></span>${ispSignLine(c)}</div>`;
  } else if (type === 'weekly' || type === 'collateral') {
    top = card(`${recRow()}${fill}`);
    list = renderBoxes(type, d.boxes.map(b => asItem(type, b)), d.sources, { cur });
    if (d.alsoNoted) after = `<div><div class="lab" style="margin-bottom:4px">For continued stay</div><div class="bl">${d.alsoNoted.map(t => `<div class="li"><span class="tt" data-doc>${esc(t)}</span></div>`).join('')}</div></div>`;
  } else if (type === 'incident') {
    const inc = s.incidents.find(i => i.client === c.id && i.level === 2);
    head.chip = inc?.state_portal_due ? [`Portal due ${fmtTime(inc.state_portal_due)}`, 'r'] : ['Level 2', 'r'];
    top = card(`${fill}${btn('State portal ↗', 'statePortal', { k: 'o', f: true })}`);
    list = renderBoxes('incident', d.boxes.map(b => asItem('incident', b)), d.sources, { cur });
  } else if (type === 'quarterly') {
    const q = c.quarter || { days: 61, goal_progress_days: [41, 38, 9] };
    top = card(fill);
    const bars = `<div class="bars">${q.goal_progress_days.map((n, i) => `<div class="br"><span>Goal ${i + 1}</span><span class="u-bar${n / q.days < .25 ? ' y' : ''}"><i style="width:${Math.round(n / q.days * 100)}%"></i></span><span>${n} of ${q.days}</span></div>`).join('')}</div>`;
    list = bars + renderBoxes('quarterly', d.boxes.map(b => asItem('quarterly', b)), d.sources, { cur });
    after = familySign(c) + internalQuarterly(c);
  } else if (type === 'discharge') {
    top = card(fill);
    list = renderBoxes('discharge', d.boxes.map(b => asItem('discharge', b)), d.sources, { cur });
    after = `<div class="bl"><div class="li"><span class="tt"><b>Dec 8</b> <span data-doc>New intake · CNA · ISP · initial request</span></span>${btn('Open plan ↗', 'openApp', { k: 'o', s: true, attrs: 'data-href="#/EarlyDischarge?id=R-0402"' })}</div></div>`;
  }
  const collateral = type === 'collateral' ? collateralRows(c) : '';
  return wrap(head, `${top}${collateral}${list}${checksLine(d.checks, { open: u.checksOpen })}${after}${savedLine()}`);
}
ACT.statePortal = async () => {
  const c = clientForPage(); const s = S(); const d = seededDraft('incident', c);
  const idx = s.incidents.findIndex(i => i.client === c.id && i.level === 2);
  window.open(`${api.config.extURL}/state-portal/incident?client=${encodeURIComponent(c.initials)}&level=Level%202&what=${encodeURIComponent(d.boxes.find(x => x.label === 'What happened')?.value || '')}`, '_blank', 'noopener');
  if (idx >= 0) await api.do('incident.filePortal', { index: idx });
  flash('State portal opened · time logged');
};

// ---------------------------------------------------------------- incident for a student other than the worked example: say what happened
const INC_SOURCES = [{ n: 1, label: 'What you said' }, { n: 2, label: 'Psyflo record' }, { n: 3, label: 'Signed in as' }];
function incidentBoxes(c, said) {
  const s = S(); const me = meFromPage();
  const txt = said.charAt(0).toUpperCase() + said.slice(1).replace(/\s+$/, '');
  return [{ label: 'Location', value: M.school(s, c.school).name || '', src: [2] }, { label: 'Staff present', value: M.staffShort(s, me.id), src: [3] }, { label: 'What happened', value: /[.!?]$/.test(txt) ? txt : txt + '.', src: [1] }].filter(b => b.value);
}
function incidentSayView(c) {
  const u = P.ui; const said = u.incSaid; const head = { form: 'Incident report', student: c.initials, chip: ['Level 2–3 · 24 h', 'y'] };
  if (!said) return wrap(head, sayCard('incident'));
  const boxes = incidentBoxes(c, said); const send = withEdits('incident-say', boxes);
  setCur('incident', c, INC_SOURCES, send);
  const cur = u.one != null ? send[u.one]?.label : null;
  const items = boxes.map(b => asItem('incident-say', b)).concat(['Date/time', 'Level', 'Actions taken', 'CPS report', 'Injury'].map(l => ({ k: l, label: l, value: '', empty: 'Yours', ro: true })));
  return wrap(head, `${card(`<div class="t">${I.mic}Said here<span class="sp"></span>${btn('Say again', 'incAgain', { k: 't', s: true })}</div><div class="qt" data-doc>“${esc(said)}”</div>${u.one != null ? oneStep(send) : `<div class="row">${btn(`Fill ${boxes.length} boxes`, 'fillAll', { k: 'p', f: true, disabled: u.filling })}${btn('One at a time', 'oneStart', { k: 't' })}</div>`}`)}${renderBoxes('incident-say', items, INC_SOURCES, { cur })}`);
}
ACT.incAgain = () => { P.ui.incSaid = null; P.ui.said = ''; P.ui.typing = null; draw(); };

// ---------------------------------------------------------------- monthly collateral: a school update filed as the month's collateral contact
const SCHOOL_RELEASE = 'Release of information · school';
const schoolRelease = c => (S().consents || []).find(x => x.client === c.id && x.form === SCHOOL_RELEASE && (x.status === 'signed' || x.signed_at));
const pageRelease = () => ((P.page?.form?.fields || []).find(f => /^release/i.test(f.label)) || {}).value || '';
const COLL_SOURCES = [{ n: 1, label: 'School portal' }, { n: 2, label: 'Signed release (parent portal)' }];
function allUpdates(c) { return (S().shares || []).map((sh, i) => ({ ...sh, key: sh.id || `idx-${i}`, used: sh.used || {} })).filter(sh => sh.client === c.id).sort((a, b) => String(a.at) < String(b.at) ? -1 : 1); }
function collateralBoxes(c, sh) {
  const w = shareWho(sh); const rel = schoolRelease(c);
  const b = [{ label: 'Date', value: usDate(sh.at), src: [1] }, { label: 'Collateral', value: `${w.name}, ${w.role}`, src: [1] }, { label: 'Method', value: 'School portal message', src: [1] }];
  if (rel && !pageRelease()) b.push({ label: 'Release on file', value: `School release on file · signed ${fmtDate(rel.signed_at)}`, src: [2] });
  b.push({ label: 'Information shared / received', value: `Received from ${w.name} (${w.role}): ${String(sh.text).trim()}`, src: [1] });
  return b;
}
function collateralRows(c) {
  const list = allUpdates(c).filter(sh => !sh.used.collateral || (P.ui.collDone || []).includes(sh.key));
  if (!list.length) return '';
  const rel = schoolRelease(c); const onPage = pageRelease();
  return `<div><div class="row" style="margin-bottom:4px"><span class="lab">From school</span><span class="sp"></span>${rel || onPage ? chip('Release on file', 'g') : chip('No signed release', 'y')}</div><div class="bl">${list.map(sh => {
    const w = shareWho(sh); const done = sh.used.collateral;
    return `<div class="bx${done ? ' y' : ''}"><div class="bx-h st"><span class="bx-l">${esc(w.name)} <span class="muted">${esc(fmtDate(sh.at))} ${esc(fmtTime(sh.at))}</span></span><span class="bx-r">${done ? chip('Filled', 'g') : ''}</span><span class="bx-v" data-doc><span class="tx">“${esc(sh.text)}”</span></span></div><div class="go">${btn(done ? 'Fill again' : 'Fill as contact', 'collFill', { k: 'o', s: true, attrs: `data-k="${esc(sh.key)}"`, disabled: P.ui.filling })}</div></div>`;
  }).join('')}</div></div>`;
}
ACT.collFill = async el => {
  const c = clientForPage(); const sh = allUpdates(c).find(x => x.key === el.dataset.k); if (!sh) return;
  const r = await fillBoxes(collateralBoxes(c, sh), { form: 'collateral', client: c, sources: COLL_SOURCES });
  if (r.error) return;
  P.ui.collDone = (P.ui.collDone || []).concat([sh.key]);
  if (sh.id && !sh.used.collateral) await api.do('school.shareUsed', { id: sh.id, how: 'collateral', by: meFromPage().id }).catch(err => flash(err.message, 'r'));
  draw();
};

// ---------------------------------------------------------------- quarterly: the family version (guardian signs on the parent portal) and the internal quarterly (staff only)
function familySign(c) {
  const t = (S().portal_tasks || []).filter(x => x.client === c.id && x.form === 'Quarterly report').at(-1);
  const body = t && t.status === 'signed' ? `<div class="stat ok">${I.ok}Guardian signed</div>` : t ? `<div class="stat watch">${I.open}Sent to guardian</div>` : btn('Send to guardian', 'qsig', { k: 'o', s: true });
  return `<div class="li" style="border:1px solid var(--line);border-radius:12px"><span class="tt"><b>Family version</b></span>${body}</div>`;
}
ACT.qsig = async el => { el.disabled = true; await api.do('portalTask.create', { client: clientForPage().id, form: 'Quarterly report', why: 'Guardian signature' }); flash('Sent to the parent portal'); };
const IQ = [['concerns', 'Concerns not yet evidenced'], ['home', 'Home context'], ['plan', 'Next quarter plan'], ['supervisor', 'For the supervisor']];
const iqPeriod = c => { const a = c.authorization; return a && a.start && a.end ? `${fmtDate(a.start)} – ${fmtDate(a.end)}` : `Quarter to ${fmtDate(S().today)}`; };
const iqSaved = c => (S().internal_quarterlies || []).filter(x => x.client === c.id && x.period === iqPeriod(c)).at(-1);
// suggestions from Psyflo's own notes (weekly calls, collateral, incidents); the staffer edits or clears them
function iqSuggest(c) {
  const s = S(); const notes = (s.notes_sample || []).filter(n => n.client === c.id);
  const wk = notes.filter(n => n.type === 'weekly_guardian').at(-1); const col = notes.filter(n => n.type === 'monthly_collateral').at(-1);
  const inc = (s.incidents || []).filter(i => i.client === c.id && /cps|disclos/i.test(i.what || '')).at(-1);
  const home = [], plan = [];
  if (c.id === 'MR') home.push('Guardian reported a change in the household on Oct 16; it coincided with the Oct 21 lunch incident.');
  if (inc) home.push(`${fmtDate(inc.date)}: ${inc.what}.`);
  if (wk && /bedtime/i.test(wk.discussed || '')) home.push('Bedtime still inconsistent (weekly guardian call).');
  if (col && /IEP review/i.test(col.shared || '')) plan.push('Harvest attends the IEP review (collateral contact with the school counselor).');
  if (c.id === 'MR') plan.push('Goal 3 has not been worked on in 6 weeks: add a structured peer game twice a week.');
  return { concerns: '', home: home.join(' '), plan: plan.join(' '), supervisor: '' };
}
function internalQuarterly(c) {
  const saved = iqSaved(c); const base = saved ? saved.fields : iqSuggest(c); const ed = P.ui.edits?.iq || {}; const dirty = Object.keys(ed).length > 0;
  const items = IQ.map(([k, l]) => ({ k, label: l, value: ed[k] != null ? ed[k] : (base[k] || ''), edited: ed[k] != null, empty: 'Nothing yet' }));
  return `<div class="dash" title="Never sent to the guardian, the school or the insurer. Not typed into any Lauris box."><div class="row"><h2 class="h">Internal quarterly</h2>${chip('Staff only', 'r')}${I.lock}</div>${renderBoxes('iq', items, [])}
    <div class="row">${saved && !dirty ? `<span class="small muted">Saved ${esc(fmtTime(saved.at))}</span><span class="sp"></span>` : '<span class="sp"></span>'}${btn(saved && !dirty ? 'Save again' : 'Save', 'iqSave', { k: 'o', s: true })}</div></div>`;
}
ACT.iqSave = async () => {
  const c = clientForPage(); if (!c) return;
  const saved = iqSaved(c); const base = saved ? saved.fields : iqSuggest(c); const ed = P.ui.edits?.iq || {};
  const fields = Object.fromEntries(IQ.map(([k]) => [k, ed[k] != null ? ed[k] : (base[k] || '')]));
  await api.do('quarterly.internalSave', { client: c.id, period: iqPeriod(c), fields, by: meFromPage().id });
  P.ui.edits.iq = {}; flash('Saved · staff only');
};
