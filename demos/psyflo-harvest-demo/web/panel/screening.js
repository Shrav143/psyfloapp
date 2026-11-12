// Screening call (screen 14, Flow A) and intake / CNA (screen 15).
import { P, S, M, ACT, PRESENT, api, esc, meFromPage, clientForPage, flash, draw, fillBoxes, asItem, withEdits, renderBoxes, setCur, oneStep, shortLabel, startRecording, stopRecording, micStart, recSeconds, hasSpeech, call } from './core.js';
import { frame, chip, I, btn, card, stepper, flashLine, help, checksLine, mmss, boxRow, boxList } from './ui.js';
import { refInfo, savedLine } from './home.js';
import { draftScreening, screeningFacts, screeningPrompts, draftSeeded } from '../js/shared/draft.js';
import { fmtDate } from '../js/shared/dates.js';

const wrap = (o, body, extra = {}) => frame({ logo: P.logo, body: flashLine(P.ui.flash) + body, ...o, ...extra });

// ---------------------------------------------------------------- the boxes that come from the referral and the family link, typed before the call
export function preCallBoxes(c, ref) {
  const s = S(); c = c || {}; const r = ref || s.referrals.find(x => x.id === c.referral); const fl = r && M.familyLinkFor(s, r.id); const el = r && M.eligibilityFor(s, r.id); const a = fl?.answers || {};
  const b = [];
  if (a.guardian_name || c.guardian?.name) b.push({ label: 'Guardian on the call', value: `${a.guardian_name || c.guardian.name} (${a.relationship || c.guardian?.relationship || 'guardian'})`, src: [a.guardian_name ? 2 : 1] });
  if (a.phone || c.guardian?.phone) b.push({ label: 'Phone', value: a.phone || c.guardian.phone, src: [a.phone ? 2 : 1] });
  if (a.language) b.push({ label: 'Preferred language', value: a.language, src: [2] });
  if (el?.status === 'recorded') b.push({ label: 'Medicaid', value: `${M.payer(s, el.plan).name} · checked ${fmtDate(el.checked_at)}`, src: [3] });
  if (a.medicaid_id) b.push({ label: 'Medicaid ID', value: 'on file (family link)', src: [2] });
  if (r?.form?.iep) b.push({ label: 'IEP', value: 'Yes — copy attached to referral', src: [1] });
  return b;
}
const PRE_SOURCES = [{ n: 1, label: 'Referral form' }, { n: 2, label: 'Family link' }, { n: 3, label: 'Eligibility (DMAS screenshot)' }];
const PROMPT_SHORT = { c1: 'Peer relationships', c2: 'Prior interventions', c3: 'Danger awareness', loc: 'Placement risk', int: 'Internalizing', sh: 'Self-harm' };
const askList = (prompts, after) => `<div class="bl">${prompts.map(p => `<div class="li ak${p.done ? ' done' : ''}">${p.done ? I.ok : p.partial ? I.warn : after ? I.no : I.open}<span class="tt"><b>${esc(PROMPT_SHORT[p.key] || p.title)}</b></span>${!p.done && p.ask ? `<span class="qs" data-doc>${esc(p.ask)}</span>` : ''}</div>`).join('')}</div>`;
function groupRows(boxes) {
  const out = []; const seen = {};
  for (const b of boxes) { const k = b.row || b.label; if (seen[k]) { seen[k].value += ' · ' + b.value; seen[k].cells.push(b); continue; } seen[k] = { label: k, value: b.value, src: b.src, cells: [b] }; out.push(seen[k]); }
  return out;
}

// the Fill step: one button, tooltip says what is missing
function fillStep(c, pre, fl, el) {
  const missing = !fl?.submitted_at ? 'Guardian and insurance boxes wait for the family link' : el?.status !== 'recorded' ? 'Insurance boxes wait for eligibility' : '';
  return `<div class="row">${btn(`Fill ${pre.length} boxes`, 'preFill', { k: 'p', f: true, disabled: !pre.length || P.ui.filling, title: pre.length ? missing : missing || 'Nothing to fill yet' })}${btn('Skip', 'scSkip', { k: 't' })}</div>`;
}
const stepOf = u => u.sc === 'drafted' ? 3 : (u.sc === 'rec' || u.sc === 'ready') ? 2 : 1;
const scChip = u => u.sc === 'drafted' ? (u.scFilled ? ['Typed', 'y'] : ['Drafted', 'g']) : u.sc === 'rec' ? ['Recording', 'r'] : u.sc === 'ready' ? ['Ready', 'n'] : ['To fill', 'n'];
const preRows = (pre, filled) => renderBoxes('pre', pre.map(b => asItem('pre', b)), PRE_SOURCES);

export function screeningView(c) {
  const s = S(); const u = P.ui; u.sc = u.sc || 'fill'; const r = s.referrals.find(x => x.id === c.referral);
  const el = r && M.eligibilityFor(s, r.id); const fl = r && M.familyLinkFor(s, r.id);
  const facts = screeningFacts(u.transcript || ''); const prompts = screeningPrompts(facts);
  const met = prompts.filter(p => ['c1', 'c2', 'c3'].includes(p.key) && p.done).length;
  const pre = preCallBoxes(c); const head = { form: 'Admission screening', student: c.initials, chip: scChip(u) };
  let body = '';
  if (u.sc === 'fill') body = card(`${stepper(['Fill', 'Record', 'Review'], 1)}${fillStep(c, pre, fl, el)}`) + preRows(pre);
  if (u.sc === 'ready') body = card(`${stepper(['Fill', 'Record', 'Review'], 2)}
      <label class="ck1"><input type="checkbox" data-ch="consent" ${u.consent ? 'checked' : ''}> Consent read</label>
      <div class="row">${btn('Record', 'recMic', { k: 'p', f: true, icon: I.mic, disabled: !u.consent, title: u.consent ? '' : 'Tick Consent read first' })}${help('mic', 'recording')}</div>`) + preRows(pre);
  if (u.sc === 'rec') body = card(`${stepper(['Fill', 'Record', 'Review'], 2)}
      <div class="t"><span class="dot on"></span>Recording <span data-timer>${mmss(recSeconds())}</span></div>
      <div class="row">${btn('Stop', 'recStop', { k: 'p', f: true })}</div>`)
    + `<div class="row"><h2 class="h">Still to ask</h2><span class="sp"></span>${chip(`${met} of 3`, met >= 2 ? 'g' : 'y')}</div>${askList(prompts)}`;
  if (u.sc === 'drafted') {
    const d = u.draft; const rows = groupRows(d.boxes); const n = rows.length;
    const send = withEdits('sc', d.boxes);
    setCur('screening', c, d.sources, send, () => { u.scFilled = true; });
    const items = rows.map(g => asItem('sc', { label: g.label, value: g.value, src: g.src }, { ro: g.cells.length > 1, k: g.label })).map((it, i) => ({ ...it, state: rows[i].cells.every(x => (u.filled || []).includes(x.label)) ? 'y' : '' }))
      .concat(d.blank.map(b => ({ k: b.label, label: b.label, short: shortLabel(b.label), value: '', empty: 'Yours', why: b.why, ro: true })));
    const cur = u.one != null ? (d.boxes[u.one]?.row || d.boxes[u.one]?.label) : null;
    body = card(`${stepper(['Fill', 'Record', 'Review'], 3)}${u.one != null ? oneStep(send) : `<div class="row">${btn(`Fill ${n} boxes`, 'fillAll', { k: u.scFilled ? 'o' : 'p', f: true, disabled: u.filling })}${btn('One at a time', 'oneStart', { k: 't' })}</div>`}`)
      + renderBoxes('sc', items, d.sources, { cur })
      + `<div class="row"><h2 class="h">Still to ask</h2></div>${askList(prompts, true)}`
      + checksLine(d.checks, { open: u.checksOpen })
      + `<div class="bx-s"><button type="button" class="btn t s" data-act="txToggle" aria-expanded="${u.txOpen ? 'true' : 'false'}">Transcript ${u.txOpen ? I.up : I.chev}</button>${u.txOpen ? `<div class="tscr" data-doc>${esc(u.transcript || '')}</div>` : ''}</div>
         <div>${btn('Record again', 'recAgain', { k: 't', s: true })}</div>`;
  }
  return wrap(head, body);
}
ACT.preFill = async () => { const c = clientForPage(); const r = await fillBoxes(preCallBoxes(c), { form: 'screening', client: c, sources: PRE_SOURCES }); if (!r.error) P.ui.sc = 'ready'; draw(); };
ACT.scSkip = () => { P.ui.sc = 'ready'; draw(); };
ACT.consent = el => { P.ui.consent = el.checked; draw(); };
ACT.txToggle = () => { P.ui.txOpen = !P.ui.txOpen; draw(); };
ACT.recMic = () => { if (!P.ui.consent) return; micStart('sc'); };
ACT.recScript = async () => {
  const txt = await fetch('/seed/scripts/screening_TW.txt').then(r => r.text());
  const lines = txt.split('\n').filter(Boolean);
  startRecording('script');
  let i = 0;
  P.rec.timer = setInterval(() => {
    if (!P.rec || i >= lines.length) { if (P.rec) { clearInterval(P.rec.timer); P.ui.interim = ''; draw(); } return; }
    P.ui.transcript = (P.ui.transcript ? P.ui.transcript + '\n' : '') + lines[i++]; draw();
  }, P.ui.fast ? 250 : 1300);
};
ACT.recStop = async () => {
  stopRecording(true);
  const c = clientForPage(); const s = S(); const r = s.referrals.find(x => x.id === c.referral); const fl = r && M.familyLinkFor(s, r.id);
  P.ui.draft = draftScreening({ transcript: P.ui.transcript || '', today: s.today, guardianPhone: fl?.answers?.phone || c.guardian?.phone || '', referral: r });
  P.ui.sc = 'drafted'; P.ui.edits = P.ui.edits || {}; draw();
  api.do('screening.drafted', { client: c.id, referral: c.referral, transcript: P.ui.transcript || '' }).catch(() => { });
};
ACT.recAgain = () => { P.ui.sc = 'ready'; P.ui.draft = null; P.ui.scFilled = false; P.ui.one = null; draw(); };
// presenter command: play the scripted call (consent is part of the script, so the checkbox is ticked for the presenter)
PRESENT.script = async () => {
  const p = P.page; if (!p || p.kind !== 'session' || p.form?.type !== 'screening' || !clientForPage()) return flash('Open the Admission Screening first', 'y');
  P.ui.sc = P.ui.sc === 'drafted' ? 'ready' : (P.ui.sc || 'ready'); P.ui.consent = true; return ACT.recScript();
};

// a consumer created from a referral that has no Psyflo student record yet (A.R., B.K.): pre-call boxes only
export function refScreeningView(r) {
  const pre = preCallBoxes(null, r); const i = refInfo(r); const fl = M.familyLinkFor(S(), r.id);
  setCur('screening', refInfo(r).c || { id: r.id }, PRE_SOURCES, pre, () => { P.ui.sc = 'ready'; });
  return wrap({ form: 'Admission screening', student: i.label, chip: [r.id, 'n'] }, card(`${stepper(['Fill', 'Record', 'Review'], 1)}<div class="row">${btn(`Fill ${pre.length} boxes`, 'fillAll', { k: 'p', f: true, disabled: !pre.length || P.ui.filling, title: fl?.submitted_at ? '' : 'Guardian and insurance boxes wait for the family link' })}${btn('Record', 'noop', { k: 'o', disabled: true, title: `After ${i.initials} has a Psyflo record` })}</div>`) + preRows(pre));
}

// ---------------------------------------------------------------- intake / CNA (screen 15), live after Flow A
const PHQ = ['1', '1', '0', '1', '0', '0', '1', '0', '0'];
function cnaData(c) {
  const s = S(); const sc = s.screenings.find(x => x.client === c.id && (x.boxes || x.facts));
  const facts = sc?.facts || (sc?.transcript ? screeningFacts(sc.transcript) : null);
  const screening = sc ? { facts, boxes: sc.boxes || (sc.transcript ? draftScreening({ transcript: sc.transcript, today: s.today }).boxes : []), when: sc.when } : null;
  const d = draftSeeded('cna', { client: c, screening, today: s.today });
  const boxes = d.boxes.concat(PHQ.map((v, i) => ({ label: `PHQ item ${i + 1}`, value: v, src: [3] })));
  return { d, boxes: boxes.filter(b => b.value), screening };
}
const ASK = [['dev', 'Developmental history', 'Milestones, speech and school history, before trauma'], ['trauma', 'Trauma history', 'Yours · after developmental history'], ['dates', 'Dates', 'Outpatient at Piedmont: start and end month, and whether secondary insurance paid'], ['danger', 'Danger', 'Does he understand the risk when he leaves the building? (criterion 3)'], ['coll', 'Collateral', 'Releases: school counselor, pediatrician, previous outpatient provider']];
export function cnaView(c) {
  const s = S(); const u = P.ui; const { d, boxes, screening } = cnaData(c);
  const rec = u.cnaRec !== false; const send = withEdits('cna', boxes);
  setCur('cna', c, d.sources, send);
  const items = d.boxes.map(b => asItem('cna', b, { tag: b.copied ? 'Copied from screening' : '', tagKind: 'y', why: b.note || '', src: b.src }))
    .concat([{ k: 'PHQ-9', label: 'PHQ-9', value: PHQ.join(' '), src: [3], ro: true, state: PHQ.every((v, i) => (u.filled || []).includes(`PHQ item ${i + 1}`)) ? 'y' : '' }])
    .concat(d.blank.map(b => ({ k: b.label, label: b.label, short: shortLabel(b.label), value: '', empty: 'Yours', why: b.why, ro: true })));
  const asked = u.asked || {};
  const ask = `<div class="bl">${ASK.map(([k, t, q]) => `<div class="li ak${asked[k] ? ' done' : ''}"><button type="button" class="btn t s ic" style="padding:0;min-height:20px" data-act="askTick" data-k="${k}" aria-label="${esc(t)} asked" aria-pressed="${asked[k] ? 'true' : 'false'}">${asked[k] ? I.ok : I.open}</button><span class="tt"><b>${esc(t)}</b></span><span class="qs" data-doc>${esc(q)}</span></div>`).join('')}</div>`;
  const cur = u.one != null ? send[u.one]?.label : null;
  const body = card(`${u.one != null ? oneStep(send) : `<div class="row">${btn(`Fill ${boxes.length} boxes`, 'fillAll', { k: 'p', f: true, disabled: u.filling })}${btn('One at a time', 'oneStart', { k: 't' })}</div>`}
      <div class="row small"><span class="dot${rec ? ' on' : ''}" style="width:10px;height:10px;border-radius:50%;background:var(--late-fg);opacity:${rec ? 1 : .35}"></span><span>${rec ? 'Recording' : 'Paused'}</span><span class="sp"></span>${btn(rec ? 'Pause' : 'Resume', 'cnaPause', { k: 't', s: true })}</div>`)
    + (screening ? '' : `<div class="fl y">${I.warn}<div>Run the screening first</div></div>`)
    + renderBoxes('cna', items, d.sources, { cur })
    + `<div class="row"><h2 class="h">Still to ask</h2></div>${ask}`
    + checksLine(d.checks, { open: u.checksOpen });
  return wrap({ form: 'Intake (CNA)', student: c.initials, chip: rec ? ['Recording', 'r'] : ['Paused', 'n'] }, body + savedLineIf());
}
const savedLineIf = () => savedLine();
ACT.cnaPause = () => { P.ui.cnaRec = P.ui.cnaRec === false; draw(); };
ACT.askTick = el => { P.ui.asked = P.ui.asked || {}; P.ui.asked[el.dataset.k] = !P.ui.asked[el.dataset.k]; draw(); };
