// Daily note (screen 23, Flow B): say what happened or type it, drafted from the dictation, the plan and the timer.
// Also the "say it" card shared with the incident report, and the counselor's updates from the school portal.
import { P, S, M, ACT, PRESENT, api, esc, meFromPage, clientForPage, flash, draw, fillBoxes, asItem, withEdits, renderBoxes, setCur, startRecording, stopRecording, micStart, recSeconds, hasSpeech } from './core.js';
import { frame, chip, I, btn, card, flashLine, help, checksLine, mmss, menu } from './ui.js';
import { enhanceDictation, contactTime } from '../js/shared/draft.js';
import { fmtTime, fmtDate } from '../js/shared/dates.js';

const wrap = (o, body, extra = {}) => frame({ logo: P.logo, body: flashLine(P.ui.flash) + body, ...o, ...extra });
const fmtT = hhmm => { let [h, m] = hhmm.split(':').map(Number); h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')}`; };

// ---------------------------------------------------------------- state: the dictation (phone or panel), the timer blocks, the drafted note
export function dpnState(c) {
  const s = S(); const u = P.ui;
  const dict = M.waitingDictations(s, c.id)[0] || (u.usedDict && s.dictations.find(d => d.id === u.usedDict));
  const t = Object.values(s.timers).find(x => x.client === c.id) || s.timers[c.staff] || {};
  const blocks = (c.staff === 'khale' && t.blocks) || (s.notes_sample.find(n => n.client === c.id)?.contact_time) || [];
  // an unconfirmed block is proposed until the staffer confirms it; "Didn't happen" removes it for good
  const used = u.blockDropped ? blocks.filter(b => !b[3]) : blocks;
  const ct = contactTime(used, { confirmed: u.unitsConfirmed !== false });  // what gets typed into the form
  const prop = contactTime(used, { confirmed: true });                       // what Confirm will type
  const rows = contactTime(blocks, { confirmed: true }).rows;               // every block, for the list
  const input = dict ? dict.spoken : '';
  const e = input ? enhanceFor(c, input, used) : null;
  return { dict, ct, prop, rows, e, input, blocks: used };
}
const enhanceFor = (c, text, blocks) => { const s = S(); return enhanceDictation({ text, client: c, goals: c.goals || [], interventions: s.interventions, blocks, recent: s.notes.filter(n => n.client === c.id).map(n => n.enhanced) }); };
export const DPN_SOURCES = [{ n: 1, label: 'What you said' }, { n: 2, label: 'Your timer' }, { n: 3, label: 'The plan (ISP 2.0)' }, { n: 4, label: 'School counselor · school portal' }];
export function dpnBoxes(c, st) {
  const e = st.e; const g = (c.goals || [])[(e?.objective || 1) - 1];
  const b = st.blocks.length ? [{ label: 'Contact time', value: st.ct.lines, src: [2] }, { label: 'Direct time', value: st.ct.text, src: [2] }, { label: 'Units', value: String(st.ct.units), src: [2] }] : [];
  if (e) {
    if (g) b.push({ label: 'Objective addressed', value: `Obj. ${g.n} – ${g.objective}`, src: [3] });
    if (e.mood) b.push({ label: 'Mood check-in', value: e.mood, src: [1] });
    if (e.progress) b.push({ label: 'Progress today', value: e.progress, src: [1] });
    const sc = schoolSentences(c);
    b.push({ label: 'Narrative', value: [e.narrative, ...sc].join(' '), src: sc.length ? [1, 2, 3, 4] : [1, 2, 3] });
  } else if (schoolSentences(c).length) b.push({ label: 'Narrative', value: schoolSentences(c).join(' '), src: [4] });
  return b;
}

// ---------------------------------------------------------------- updates from school (school portal → s.shares): the counselor's report, never staff observation
const shareKey = (sh, i) => sh.id || `idx-${i}`;
function schoolUpdates(c, { today = true } = {}) {
  const s = S();
  return (s.shares || []).map((sh, i) => ({ ...sh, key: shareKey(sh, i), used: sh.used || {} }))
    .filter(sh => sh.client === c.id && (!today || String(sh.at || '').slice(0, 10) === s.today))
    .sort((a, b) => String(a.at) < String(b.at) ? -1 : 1);
}
export const shareWho = sh => { const u = (S().school_users || []).find(x => x.id === sh.by); return { name: u ? u.name : (sh.by || 'School'), role: u ? u.role : 'school staff' }; };
const shareSentence = sh => { const w = shareWho(sh); const t = String(sh.text || '').trim().replace(/\s+/g, ' '); return `Per the ${w.role} (${w.name}), reported through the school portal at ${fmtTime(sh.at)}: "${t}"`; };
const schoolIncluded = c => schoolUpdates(c).filter(sh => !(P.ui.schoolOut || []).includes(sh.key) && ((P.ui.schoolIn || []).includes(sh.key) || sh.used.daily));
export const schoolSentences = c => schoolIncluded(c).map(shareSentence);
function schoolRows(c) {
  const list = schoolUpdates(c); if (!list.length) return '';
  const inc = new Set(schoolIncluded(c).map(x => x.key));
  return `<div><div class="lab" style="margin-bottom:4px">From school</div><div class="bl">${list.map(sh => {
    const w = shareWho(sh); const on = inc.has(sh.key); const out = (P.ui.schoolOut || []).includes(sh.key);
    return `<div class="bx${on ? ' y' : ''}"><div class="bx-h st"><span class="bx-l">${esc(w.name)} <span class="muted">${esc(fmtTime(sh.at))}</span></span><span class="bx-r">${on ? chip('In note', 'g') : out ? chip('Left out', 'n') : ''}</span><span class="bx-v" data-doc><span class="tx">“${esc(sh.text)}”</span></span></div>
      <div class="go">${on ? btn('Leave out', 'schoolOut', { k: 'o', s: true, attrs: `data-k="${esc(sh.key)}"` }) : btn(out ? 'Add back' : 'Add to note', 'schoolIn', { k: 'o', s: true, attrs: `data-k="${esc(sh.key)}"` })}</div></div>`;
  }).join('')}</div></div>`;
}
const narrativeNow = () => (P.page.form?.fields || []).find(f => f.label === 'Narrative')?.value || '';
ACT.schoolIn = async el => {
  const c = clientForPage(); const sh = schoolUpdates(c).find(x => x.key === el.dataset.k); if (!sh) return;
  P.ui.schoolIn = (P.ui.schoolIn || []).filter(k => k !== sh.key).concat([sh.key]); P.ui.schoolOut = (P.ui.schoolOut || []).filter(k => k !== sh.key);
  const sent = shareSentence(sh); const cur = narrativeNow();
  if (cur && !cur.includes(sent)) await fillBoxes([{ label: 'Narrative', value: cur.trim() + ' ' + sent, src: [4] }], { form: 'dpn', client: c, sources: DPN_SOURCES, animate: false });
  if (sh.id && !sh.used.daily) await api.do('school.shareUsed', { id: sh.id, how: 'daily', by: meFromPage().id }).catch(err => flash(err.message, 'r'));
  draw();
};
ACT.schoolOut = async el => {
  const c = clientForPage(); const sh = schoolUpdates(c).find(x => x.key === el.dataset.k); if (!sh) return;
  P.ui.schoolOut = (P.ui.schoolOut || []).filter(k => k !== sh.key).concat([sh.key]); P.ui.schoolIn = (P.ui.schoolIn || []).filter(k => k !== sh.key);
  const sent = shareSentence(sh); const cur = narrativeNow();
  if (cur.includes(sent)) await fillBoxes([{ label: 'Narrative', value: cur.replace(sent, '').replace(/\s{2,}/g, ' ').trim() }], { form: 'dpn', client: c, sources: DPN_SOURCES, animate: false });
  draw();
};

// ---------------------------------------------------------------- "say what happened": Record or Type (daily note and incident)
export const DPN_EXAMPLE = 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class';
export function sayCard(kind) {
  const u = P.ui;
  if (u.recKind === kind && P.rec)
    return card(`<div class="t"><span class="dot on"></span>Listening <span data-timer>${mmss(recSeconds())}</span></div><div class="tx" data-doc>${esc(u.transcript || '')}${u.interim ? (u.transcript ? '\n' : '') + esc(u.interim) : ''}</div>
      <div class="row">${btn('Stop', 'sayStop', { k: 'p', f: true, attrs: `data-k="${kind}"` })}${btn('Cancel', 'sayCancel', { k: 't' })}</div>`);
  if (u.typing === kind)
    return card(`<div class="t">Say what happened</div><textarea class="ed" data-doc aria-label="What happened" data-in="sayText" placeholder="What happened?">${esc(u.said || '')}</textarea>
      <div class="row">${btn('Draft', 'sayDraft', { k: 'p', f: true, attrs: `data-k="${kind}"` })}${btn('Record', 'sayMic', { k: 'o', icon: I.mic, attrs: `data-k="${kind}"` })}${help('mic', 'recording')}</div>`);
  return card(`<div class="t">Say what happened</div><div class="row">${btn('Record', 'sayMic', { k: 'p', f: true, icon: I.mic, attrs: `data-k="${kind}"` })}${help('mic', 'recording')}${btn('Type', 'sayType', { k: 'o', f: true, attrs: `data-k="${kind}"` })}</div>`);
}
ACT.sayText = el => { P.ui.said = el.value; };
ACT.sayType = el => { P.ui.typing = el.dataset.k; draw(); P.after = r => r.querySelector('[data-in=sayText]')?.focus(); };
ACT.sayMic = el => { P.ui.typing = null; micStart(el.dataset.k); };
ACT.sayCancel = () => { stopRecording(true); P.ui.recKind = null; P.ui.transcript = ''; P.ui.interim = ''; draw(); };
ACT.sayStop = el => { const t = [(P.ui.transcript || '').trim(), (P.ui.interim || '').trim()].filter(Boolean).join(' '); stopRecording(true); P.ui.recKind = null; P.ui.interim = ''; if (!t) { flash('Nothing heard · try again or type it', 'y'); return; } P.ui.said = t; return sayDraft(el.dataset.k); };
ACT.sayDraft = el => sayDraft(el.dataset.k);
export async function sayDraft(kind) {
  const text = (P.ui.said || '').trim(); if (!text) { flash('Say or type what happened first', 'y'); return; }
  const c = clientForPage(); const me = meFromPage();
  if (kind === 'incident') { P.ui.incSaid = text; P.ui.typing = null; draw(); return; }
  const st = dpnState(c); const e = enhanceFor(c, text, st.blocks);
  const r = await api.do('panel.dictation', { client: c.id, staff: me.id, spoken: text, rewritten: e.narrative, chips: e.chips, checks: e.checks });
  P.ui.usedDict = r.id; P.ui.dropped = false; P.ui.fbDone = null; P.ui.fbOpen = false; P.ui.unitsConfirmed = false; P.ui.typing = null;
  draw();
}
// presenter command: run the example dictation on the open daily note
PRESENT.example = () => {
  const p = P.page; const c = clientForPage();
  if (!p || p.kind !== 'session' || p.form?.type !== 'dpn' || !c) return flash('Open a daily note first', 'y');
  P.ui.said = DPN_EXAMPLE.replace(/M\.R\./g, c.initials); return sayDraft('dpn');
};

// ---------------------------------------------------------------- feedback on the recommendation, kept with the dictation and the note
function feedbackRow(dict) {
  const u = P.ui; const prev = (dict?.feedback || []).at(-1);
  if (u.fbDone || (prev && !u.fbOpen)) { const good = u.fbDone ? u.fbDone === 'good' : prev.kind === 'good'; return `<div class="row small muted">${I.ok}<span>${good ? 'Marked good' : 'Needs improvement saved'}</span><span class="sp"></span>${good ? '' : btn('Add more', 'needsImp', { k: 't', s: true })}</div>`; }
  return `<div class="row">${btn('Good recommendation', 'goodRec', { k: 'o', s: true, f: true })}${btn('Needs improvement', 'needsImp', { k: 'o', s: true, f: true })}</div>
    ${u.fbOpen ? `<div><textarea class="ed" data-doc aria-label="How to improve" data-in="fbText" placeholder="How should Psyflo improve it?">${esc(u.fbText || '')}</textarea><div class="row" style="margin-top:6px">${btn('Save feedback', 'fbSend', { k: 'o', f: true })}${btn('Cancel', 'fbCancel', { k: 't' })}</div></div>` : ''}`;
}
ACT.goodRec = async () => { const c = clientForPage(); const st = dpnState(c); await api.do('panel.feedback', { client: c.id, form: 'dpn', kind: 'good', dictation: st.dict?.id, narrative: st.e?.narrative, by: meFromPage().id }); P.ui.fbDone = 'good'; P.ui.fbOpen = false; draw(); };
ACT.needsImp = () => { P.ui.fbOpen = !P.ui.fbOpen; P.ui.fbDone = null; draw(); P.after = r => r.querySelector('[data-in=fbText]')?.focus(); };
ACT.fbText = el => { P.ui.fbText = el.value; };
ACT.fbCancel = () => { P.ui.fbOpen = false; draw(); };
ACT.fbSend = async () => {
  const text = (P.ui.fbText || '').trim(); if (!text) { flash('Say briefly how to improve it', 'y'); return; }
  const c = clientForPage(); const st = dpnState(c);
  await api.do('panel.feedback', { client: c.id, form: 'dpn', kind: 'needs_improvement', text, dictation: st.dict?.id, narrative: st.e?.narrative, by: meFromPage().id });
  P.ui.fbDone = 'needs_improvement'; P.ui.fbSent = text; P.ui.fbOpen = false; P.ui.fbText = ''; draw();
};

// ---------------------------------------------------------------- the view
export function dpnView(c) {
  const s = S(); const u = P.ui; const st = dpnState(c); const e = st.e;
  const nt = M.notesToday(s, c.staff || 'khale');
  const fromPhone = st.dict && st.dict.source !== 'panel';
  const sc = schoolSentences(c);
  const boxes = dpnBoxes(c, st); const send = withEdits('dpn', boxes);
  setCur('dpn', c, DPN_SOURCES, send, () => { u.dropped = true; });
  let top;
  if (!st.dict) top = sayCard('dpn');
  else top = card(`<div class="t">${I.mic}${fromPhone ? 'Said into the phone' : 'Said here'} ${esc(fmtTime(st.dict.at))}<span class="sp"></span>${!fromPhone && st.dict.status === 'waiting' ? btn('Say again', 'sayAgain', { k: 't', s: true }) : ''}</div>
      <div class="qt" data-doc>“${esc(st.input)}”</div>
      ${u.dropped ? `<div class="stat ok">${I.ok}${fromPhone ? 'Dictation dropped in' : 'Boxes typed'}</div>` : `<div class="row">${btn('Fill the boxes', 'fillAll', { k: 'p', f: true, disabled: u.filling })}</div>`}`);
  const rows = st.rows.map((r, i) => {
    const left = u.blockDropped && r.unconfirmed;
    const right = r.unconfirmed ? `${chip(left ? 'Left out' : u.unitsConfirmed ? 'Confirmed' : 'Unconfirmed', left ? 'r' : u.unitsConfirmed ? 'g' : 'y')}${!u.unitsConfirmed && !left ? menu('blk' + i, P.ui.menu === 'blk' + i, [["Didn't happen", 'dropBlock']]) : ''}` : '';
    return `<div class="tm${left ? ' dim' : ''}"><span>${fmtT(r.from)}–${fmtT(r.to)}</span><span class="tt" data-doc>${esc(r.what)}</span><span class="row">${right}</span></div>`;
  }).join('');
  const time = st.rows.length ? `<div><div class="lab" style="margin-bottom:4px">Contact time</div><div class="bl">${rows}</div></div>` : '';
  const items = boxes.filter(b => !['Contact time', 'Direct time', 'Units'].includes(b.label)).map(b => asItem('dpn', b, b.label === 'Narrative' ? { why: (e?.chips || []).map(ch => `${ch.text} · ${ch.from}`).concat(sc.length ? ['the counselor’s report, quoted and credited'] : []).join('\n') } : {}));
  const list = items.length ? renderBoxes('dpn', items, DPN_SOURCES) : '';
    const footer = st.rows.length ? `<div class="tt">Direct time ${esc(st.prop.text)} → ${st.prop.units} units ${help('units', 'units')}</div>${u.unitsConfirmed ? chip('Confirmed', 'g') : btn(`Confirm ${st.prop.units} units`, 'confirmUnits', { k: st.dict && u.dropped ? 'p' : 'o' })}` : '';
  const checks = e ? checksLine(e.checks, { open: u.checksOpen, tip: !!st.dict }) : '';
  const body = top + schoolRows(c) + time + list + (e ? feedbackRow(st.dict) : '') + checks;
  return wrap({ form: 'Daily note', student: c.initials, chip: [`${nt.done} of ${nt.total}`, 'n'] }, body, { footer });
}
ACT.confirmUnits = async () => { P.ui.unitsConfirmed = true; const c = clientForPage(); const st = dpnState(c); await fillBoxes([{ label: 'Direct time', value: st.prop.text }, { label: 'Units', value: String(st.prop.units) }], { form: 'dpn', client: c, sources: DPN_SOURCES, animate: false }); flash(`${st.prop.units} units confirmed`); };
ACT.dropBlock = async () => { P.ui.menu = null; P.ui.unitsConfirmed = false; P.ui.blockDropped = true; const c = clientForPage(); const st = dpnState(c); await fillBoxes([{ label: 'Contact time', value: st.ct.lines }, { label: 'Direct time', value: st.ct.text }, { label: 'Units', value: String(st.ct.units) }], { form: 'dpn', client: c, sources: DPN_SOURCES, animate: false }); };
ACT.sayAgain = async () => { const c = clientForPage(); const d = M.waitingDictations(S(), c.id).find(x => x.source === 'panel'); if (d) await api.do('dictation.discard', { id: d.id }); P.ui.usedDict = null; P.ui.said = ''; P.ui.dropped = false; P.ui.fbDone = null; draw(); };
