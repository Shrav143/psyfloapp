// Scribe (E5): choose a note type, record or type, review, edit, fill the open Lauris form; a person presses Process Form.
//   Admission screening · Intake / CNA · Daily progress note · Weekly guardian contact · Monthly collateral · Other supported documentation
//   (incident reports live under More, with a banner on home while a state-portal clock runs).
// Guidance while you record shows only what is still unanswered, each as a QUESTION; Psyflo never answers for the person. Drafts come from
// the person's own words and stored records. A recording starts only after a recorded consent; refusing means typing.
import { esc } from '../../js/runtime.js';
import { fmtDate, fmtTime } from '../../js/shared/dates.js';
import { draftScreening, screeningFacts, screeningPrompts, enhanceDictation, draftSeeded } from '../../js/shared/draft.js';
import { dailyGuidance, weeklyGuidance, collateralGuidance, tidySentence, MISSING } from '../../js/shared/enhance.js';
import * as R from '../lib/recorder.js';
import { consentFor, consentCard } from '../lib/consent.js';
import { recFor, reviewBlock } from '../lib/review.js';
import * as B from '../lib/boxes.js';
import { formValue } from '../lib/items.js';

const TYPES = [
  { id: 'screening', label: 'Admission screening', cap: 'drafts.clinical', form: 'screening' },
  { id: 'cna', label: 'Intake / CNA', cap: 'drafts.clinical', form: 'cna' },
  { id: 'dpn', label: 'Daily progress note', cap: 'notes.own', form: 'dpn' },
  { id: 'weekly', label: 'Weekly guardian contact', cap: 'notes.own', form: 'weekly' },
  { id: 'collateral', label: 'Monthly collateral', cap: 'notes.own', form: 'collateral' },
  { id: 'other', label: 'Other supported documentation', cap: 'ext.use', form: null }
];
const OTHER = [['isp', 'Treatment plan (ISP)', 'drafts.clinical'], ['sra-initial', 'Initial request (SRA)', 'drafts.clinical'], ['sra-continued', 'Continued stay', 'drafts.clinical'], ['quarterly', 'Quarterly report', 'drafts.clinical'], ['discharge', 'Discharge summary', 'drafts.clinical'], ['incident', 'Incident report', 'notes.own']];
const types = ctx => TYPES.filter(t => ctx.can(t.cap));
const typeOf = id => TYPES.find(t => t.id === id);
const DPN_EXAMPLE = 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class';

function currentType(ctx) {
  const st = ctx.st; const p = ctx.page; const ok = types(ctx).map(t => t.id);
  const fromForm = p && p.form && TYPES.find(t => t.form === p.form.type);
  if (fromForm && ok.includes(fromForm.id) && st.autoType !== (p.url + fromForm.id)) { st.type = fromForm.id; st.autoType = p.url + fromForm.id; }
  if (st.type && ok.includes(st.type)) return st.type;
  const c = ctx.client();
  const screened = c && (ctx.S().screenings || []).some(x => x.client === c.id && (x.status === 'done' || x.processed_at));
  const d = ctx.role() === 'clinician' ? (c && !screened ? 'screening' : 'dpn') : 'dpn';
  return ok.includes(d) ? d : ok[0];
}
const SAID_KEY = (c, form) => `scribe:said:${c.id}:${form}`;
const said = (ctx, c, form) => ctx.ui.draft.get(SAID_KEY(c, form), '');

// ------------------------------------------------------------------ the guidance list: unanswered questions first, answered ones folded away
function guidanceHTML(g, { title = 'Still to answer' } = {}) {
  const open = g.items.filter(i => !i.done); const done = g.items.filter(i => i.done);
  let grp = ''; const row = i => `<div class="cr${i.done ? ' done' : ''}">${i.done ? '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#217A78" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M9 12l2 2 4-4"></path></svg>' : '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6F4A05" stroke-width="2.2"><circle cx="12" cy="12" r="9"></circle><path d="M12 8v4M12 16h.01"></path></svg>'}<div>${i.done ? `<b>${esc(i.title)}</b>` : `<b class="ask">${esc(i.ask)}</b>`}${!i.done && i.options && i.options.length ? `<div class="hint">${i.options.map(esc).join(' · ')}</div>` : ''}</div></div>`;
  void grp;
  return `<div class="lab">${esc(title)}${open.length ? ` · ${open.length}` : ''}</div>${open.map(row).join('') || '<div class="hint">Everything asked so far has an answer.</div>'}${done.length ? `<details class="acc" style="margin-top:6px"><summary>${done.length} answered</summary><div>${done.map(row).join('')}</div></details>` : ''}`;
}

// ------------------------------------------------------------------ html
function html(ctx) {
  const p = ctx.page; const st = ctx.st;
  if (p.kind === 'new-consumer') return newConsumerHTML(ctx);
  const onForm = p.kind === 'session' && p.form && TYPES.find(t => t.form === p.form.type);
  if (onForm && !ctx.can(onForm.cap)) return ctx.parts.banner('n', `<b>${esc(onForm.label)} drafts are for clinicians.</b> Direct support sees daily notes, contacts and their own students' units.`, { icon: ctx.I.lock });
  const tp = currentType(ctx); const t = typeOf(tp); const c = ctx.client();
  const sel = `<div class="row"><label class="lab" for="sc-type">Note</label><select id="sc-type" class="tog" style="flex:1" data-ch="pickType">${types(ctx).map(x => `<option value="${x.id}"${x.id === tp ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>`;
  if (tp === 'other') return sel + otherHTML(ctx, c);
  if (!c && tp === 'screening' && p.kind === 'session' && p.form && p.form.type === 'screening' && ctx.can('drafts.clinical')) {
    const r = B.referralForConsumer(ctx, p.consumer && p.consumer.no, p.consumer && p.consumer.initials); if (r && r.lauris_no) return sel + refScreeningHTML(ctx, r);
  }
  if (!c) return sel + studentPicker(ctx, t);
  if (!ctx.can(t.cap, { clientId: c.id })) return sel + ctx.parts.banner('n', `${esc(t.label)} is for clinicians${ctx.role() === 'direct_support' ? '; ' + esc(c.initials) + ' is not on your caseload' : ''}.`, { icon: ctx.I.warn });
  const ocaseload = ctx.role() === 'direct_support' && c.staff && c.staff !== ctx.me().id;
  if (ocaseload) return sel + ctx.parts.banner('n', `${esc(c.initials)} is not on your caseload. Psyflo shows direct support their own students only.`);
  if (p.kind !== 'session' || !p.form || p.form.type !== t.form) return sel + openForm(ctx, c, t);
  const body = { screening: screeningHTML, cna: cnaHTML, dpn: dpnHTML, weekly: textFlowHTML, collateral: textFlowHTML }[tp](ctx, c, tp);
  const no = c.lauris_no || c.harvest_no;
  const more = ctx.can('notes.own', { clientId: c.id }) ? ctx.parts.accordion('More', `<button class="btn o blk" data-act="openForm" data-form="incident" data-no="${no}"><span>Incident report</span><span class="chip n">open</span></button>`, { id: 'sc-more' }) : '';
  return sel + steps(ctx, c, t) + body + more;
}
function steps(ctx, c, t) {
  const st = ctx.st; const rec = recFor(ctx, c, t.form); let cur = 1;
  if (t.id === 'screening') cur = st.sc === 'drafted' ? (st.scFilled ? 4 : 2) : 1;
  else if (t.id === 'cna') cur = (ctx.pg.filled || []).length ? 4 : 1;
  else cur = rec && !st.again ? (rec.stages.some(x => x.stage === 'filled') ? 4 : 2) : 1;
  return ctx.ui.stepper(['Choose', 'Record or type', 'Review', 'Edit', 'Fill'].map(label => ({ label })), { current: cur, label: 'Note steps' });
}
function openForm(ctx, c, t) {
  const no = c.lauris_no || c.harvest_no;
  return `<div class="tile t"><h2>${esc(t.label)} · ${esc(c.initials)}</h2><div class="small muted" style="margin:2px 0 8px">The form must be open in Lauris so the boxes can be typed.</div><button class="btn p blk" data-act="openForm" data-form="${t.form}" data-no="${no}">Open the ${esc(t.label.toLowerCase())}</button></div>`;
}
function studentPicker(ctx, t) {
  const list = (ctx.page.consumers || []).filter(x => x.program === 'TDT'); const st = ctx.st;
  if (!list.length) return ctx.parts.banner('n', 'Open a student in Lauris to start.');
  const sel = st.student || list[0].no;
  return `<div class="tile"><div class="row"><label class="lab" for="sc-stu">Student</label><select id="sc-stu" class="tog" style="flex:1" data-ch="pickStudent">${list.map(x => `<option value="${x.no}"${String(sel) === String(x.no) ? ' selected' : ''}>${esc(x.initials)}</option>`).join('')}</select></div>
    <button class="btn p blk" style="margin-top:8px" data-act="openStudentForm" data-form="${t.form}">Open ${esc(t.label.toLowerCase())}</button></div>`;
}
function otherHTML(ctx, c) {
  const no = c && (c.lauris_no || c.harvest_no);
  const rows = OTHER.filter(([, , cap]) => ctx.can(cap));
  return `<div class="list">${rows.map(([f, l]) => `<button class="btn o" data-act="openForm" data-form="${f}" data-no="${no || ''}" ${no ? '' : 'disabled'}><span>${esc(l)}</span><span class="chip g">open</span></button>`).join('')}</div>${no ? '' : '<div class="hint">Open a student in Lauris first.</div>'}`;
}

// ------------------------------------------------------------------ new consumer (Flow A starts here)
function newConsumerHTML(ctx) {
  const { banner, boxRow } = ctx.parts; const st = ctx.st; const s = ctx.S();
  const cands = B.candidateReferrals(ctx); const qref = new URL(ctx.page.url).searchParams.get('referral');
  const refId = st.ref || (cands.find(r => r.id === qref) || cands[0] || {}).id; const r = s.referrals.find(x => x.id === refId);
  if (!r) return banner('n', 'No referral is waiting to be added to Lauris.');
  const i = B.refInfo(ctx, r); const fl = ctx.M.familyLinkFor(s, r.id); const el = ctx.M.eligibilityFor(s, r.id);
  const boxes = B.newConsumerBoxes(ctx, r); const filled = new Set(ctx.pg.filled || []);
  return `<div class="row"><label class="lab" for="nc-ref">Referral</label><select id="nc-ref" class="tog" style="flex:1" data-ch="pickRef">${cands.map(x => `<option value="${x.id}"${x.id === refId ? ' selected' : ''}>${x.id} · ${esc(B.refInfo(ctx, x).label)}${x.stage === 'needs_screening' ? ' · new' : ''}</option>`).join('')}</select></div>
    <div class="tile t"><h2>Create ${esc(i.initials)} in Lauris</h2><div class="small" style="margin-top:4px">From the school's referral (${fmtDate(r.received)})${fl?.submitted_at ? ' and the family link (' + fmtDate(fl.submitted_at) + ')' : ''}. Psyflo types the boxes; you check them and press <b>Save Consumer</b>.</div>
      ${!el || el.status !== 'recorded' ? `<div style="margin-top:8px">${banner('y', 'Eligibility is not recorded yet. It is checked only after the guardian submits the family link.')}</div>` : ''}
      <div class="row" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="fillNew" ${ctx.pg.filling ? 'disabled' : ''}>${filled.size ? 'Type them again' : `Fill ${boxes.length} boxes from the referral`}</button></div></div>
    ${ctx.parts.accordion(`Boxes · ${boxes.length}`, boxes.map(b => boxRow(b, B.NEW_SOURCES, { state: filled.has(b.label) ? '<span class="chip y">typed · check it</span>' : '' })).join('') + `<div class="box"><div class="l">Assigned staff</div><div class="v muted">Left for you. The referral does not name the staff member.</div></div>`, { id: 'nc-boxes', open: true })}
    <div class="hint">After Save Consumer, open Admission screening: the guardian, phone, language and IEP boxes come from the referral and the family link.</div>`;
}

// a consumer created from a referral that has no Psyflo student record yet (A.R., B.K.): the pre-call boxes only
function refScreeningHTML(ctx, r) {
  const { banner, boxRow } = ctx.parts; const pre = B.preCallBoxes(ctx, null, r); const i = B.refInfo(ctx, r);
  return banner('', `<b>From ${esc(r.id)}:</b> ${pre.length ? `${pre.length} box${pre.length === 1 ? ' comes' : 'es come'} from the referral and the family link.` : 'the referral and the family link have nothing for these boxes yet.'}${ctx.M.familyLinkFor(ctx.S(), r.id)?.submitted_at ? '' : ' The family link is not submitted, so phone, language and insurance stay empty until the guardian finishes it.'}`)
    + (pre.length ? `<button class="btn p blk" data-act="refPreFill" ${ctx.pg.filling ? 'disabled' : ''}>${ctx.st.preFilled ? 'Type them again' : `Fill ${pre.length} box${pre.length === 1 ? '' : 'es'} from the referral`}</button>` : '')
    + pre.map(b => boxRow(b, B.PRE_SOURCES)).join('')
    + `<div class="hint">Scribe drafts the rest of the screening from the recorded call once ${esc(i.initials)} has a Psyflo record (T.W. is the worked example).</div>`;
}

// ------------------------------------------------------------------ admission screening (Flow A)
function screeningHTML(ctx, c) {
  const { banner, boxRow, accordion, checksBlock } = ctx.parts; const s = ctx.S(); const st = ctx.st; const pg = ctx.pg;
  const r = s.referrals.find(x => x.id === c.referral); const el = r && ctx.M.eligibilityFor(s, r.id); const fl = r && ctx.M.familyLinkFor(s, r.id);
  const sc = st.sc || 'pre'; const text = st.rec ? R.text(st) : (st.transcript || '');
  const facts = screeningFacts(text); const prompts = screeningPrompts(facts);
  const met = prompts.filter(p => ['c1', 'c2', 'c3'].includes(p.key) && p.done).length;
  const pre = B.preCallBoxes(ctx, c); let h = '';
  if (!fl?.submitted_at || el?.status !== 'recorded') h += banner('y', `${!fl?.submitted_at ? 'The family link is not submitted yet.' : 'Eligibility is not recorded yet.'} Psyflo fills the guardian and insurance boxes only from the family link and a recorded eligibility check.`);
  if (sc === 'pre' && !st.ask) {
    h += `<div class="tile t"><div class="row"><span class="ic" style="background:var(--teal-600);color:#fff">${ctx.I.mic}</span><div style="flex:1"><h2>Record the screening call</h2><div class="small muted">Speaker or phone on speaker. You confirm consent first.</div></div></div>
      <div class="row w" style="margin-top:10px"><button class="btn p" data-act="recMic" style="flex:1">${ctx.I.mic} Record (microphone)</button><button class="btn o" data-act="recScript" title="Plays seed/scripts/screening_TW.txt as the call">Play the scripted call</button></div>
      <div class="hint" style="margin-top:6px">${R.hasSpeech() ? 'The microphone uses the browser\'s speech recognition.' : 'Speech recognition is not available in this browser: use the scripted call, or type notes in Lauris.'}</div></div>`
      + banner('', `<b>Filled before you picked up:</b> ${pre.length} boxes from the referral and the family link: ${pre.map(b => esc(b.label.toLowerCase())).join(', ')}. ${st.preFilled ? 'Check them.' : ''}`)
      + `<button class="btn o" data-act="preFill">${st.preFilled ? `Type the ${pre.length} boxes again` : `Type the ${pre.length} boxes`}</button>`
      + accordion(`Where each box came from · ${pre.length}`, pre.map(b => boxRow(b, B.PRE_SOURCES)).join(''), { id: 'sc-pre' });
  }
  if (sc === 'pre' && st.ask) h += consentCard(ctx, 'screening', { label: 'Admission screening' });
  if (sc === 'rec') {
    h += `<div class="banner n"><span class="rec on"></span><div style="flex:1"><b>Recording the call · ${R.elapsed(st)}</b> · consent recorded · ${st.rec && st.rec.mode === 'script' ? 'scripted call playing' : 'microphone'} · boxes drafted when you hang up</div></div>
      <div class="row w" style="gap:6px 8px"><h2 class="st">Before you hang up</h2><span class="chip ${met >= 2 ? 'g' : 'y'}">insurance needs 2 of 3 · we can show ${met}</span></div>
      <div id="sg">${promptsHTML(ctx, prompts)}</div>
      <div class="tx" id="tx">${esc(text.split('\n').slice(-6).join('\n'))}</div>
      <div class="row"><button class="btn p" style="flex:1" data-act="recStop">Stop and draft the boxes</button><button class="btn o" data-act="copyAsks">Copy asks</button></div>`;
  }
  if (sc === 'drafted') {
    const d = st.draft; const rows = new Set(d.boxes.map(b => b.row || b.label)).size;
    h += banner('', `<b>${rows} boxes drafted from the call</b> · ${pre.length} filled before it · ${d.blank.length} left for you. Nothing in them that was not said or on the referral.`)
      + `<div class="row"><button class="btn p" style="flex:1" data-act="scFill" ${pg.filling ? 'disabled' : ''}>${st.scFilled ? 'Type them again' : `Fill the ${rows} boxes`}</button><button class="btn o" data-act="scOne">One at a time</button></div>`
      + (st.one != null ? oneAtATime(ctx, d.boxes, 'scOneType', 'scOneSkip') : '')
      + `<div class="row w" style="gap:6px"><span class="chip g">Summary · drafted last</span><span class="chip n">Decision and diagnosis · yours</span><span class="chip y">Then · Process Form</span></div>`
      + (pg.lastChecks = d.checks, checksBlock(d.checks))
      + accordion('Still to ask after the call', promptsHTML(ctx, prompts, true), { id: 'sc-after' })
      + accordion(`Drafted boxes · with sources · ${rows}`, groupRows(d.boxes).map(g => boxRow(g, d.sources)).join('') + d.blank.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v muted">Left blank: ${esc(b.why)}</div></div>`).join(''), { id: 'sc-boxes' })
      + `<details class="acc"><summary>Transcript · ${(st.transcript || '').split('\n').filter(Boolean).length} lines</summary><div><div class="tx" style="max-height:220px">${esc(st.transcript || '')}</div></div></details>`
      + `<button class="btn o" data-act="recAgain">Record again</button>`;
  }
  return h;
}
function groupRows(boxes) { const out = []; const seen = {}; for (const b of boxes) { const k = b.row || b.label; if (seen[k]) { seen[k].value += ' · ' + b.value; continue; } seen[k] = { label: k, value: b.value, src: b.src }; out.push(seen[k]); } return out; }
function promptsHTML(ctx, prompts, after) {
  const open = prompts.filter(p => !p.done); const done = prompts.filter(p => p.done);
  const row = p => `<div class="cr${p.done ? ' done' : ''}">${p.done ? ctx.I.ok : p.partial ? ctx.I.warn : after ? ctx.I.no : ctx.I.open}<div><b>${esc(p.title)}</b>${esc(p.text)}${!p.done && p.ask ? `<div class="ask">Ask now: ${esc(p.ask)}</div>` : ''}</div></div>`;
  if (after) return prompts.map(row).join('');
  return `${open.map(row).join('') || '<div class="hint">Everything the insurer needs has been heard.</div>'}${done.length ? `<details class="acc" style="margin-top:6px"><summary>${done.length} answered</summary><div>${done.map(row).join('')}</div></details>` : ''}`;
}
function oneAtATime(ctx, boxes, typeAct, skipAct) {
  const st = ctx.st; const b = boxes[st.one]; if (!b) return ctx.parts.banner('', 'That was the last box.');
  return `<div class="tile"><div class="lab">Box ${st.one + 1} of ${boxes.length}</div><div style="font-weight:600;margin-top:2px">${esc(b.label)}</div><div class="small" style="margin:4px 0 8px;white-space:pre-wrap">${esc(b.value)}</div><div class="row w"><button class="btn p" data-act="${typeAct}">Type this one</button><button class="btn o" data-act="${skipAct}">Skip</button><button class="btn o" data-act="oneClose">Close</button></div></div>`;
}

// ------------------------------------------------------------------ the daily note: phone dictation, or say it / type it here
function dpnState(ctx, c) {
  const s = ctx.S(); const st = ctx.st;
  const dict = ctx.M.waitingDictations(s, c.id)[0] || (st.usedDict && (s.dictations || []).find(d => d.id === st.usedDict));
  const t = B.timerBoxes(ctx, c, st);
  const input = dict ? dict.spoken : '';
  const e = input ? enhanceDictation({ text: input, client: c, goals: c.goals || [], interventions: s.interventions, blocks: t.blocks, recent: s.notes.filter(n => n.client === c.id).map(n => n.enhanced) }) : null;
  return { dict, t, e, input };
}
function dpnBoxes(ctx, c, ds) {
  const st = ctx.st; const e = ds.e; const g = e?.objective ? (c.goals || [])[e.objective - 1] : null;   // an objective is used only if the staffer named one
  const b = ds.t.boxes.slice();
  const sc = B.schoolSentences(ctx, c, st);
  if (e) {
    if (g) b.push({ label: 'Objective addressed', value: `Obj. ${g.n} – ${g.objective}`, src: [3] });
    if (e.interventions && e.interventions.length) b.push({ label: 'Interventions', value: e.interventions.map(code => { const i = ctx.S().interventions.find(x => x.code === code || x.name === code); return i ? `${i.code} ${i.name}` : code; }).join(' · '), src: [1, 3] });
    b.push({ label: 'Narrative', value: [e.narrative, ...sc].join(' '), src: sc.length ? [1, 3, 4] : [1] });
  } else if (sc.length) b.push({ label: 'Narrative', value: sc.join(' '), src: [4] });
  return b;
}
function schoolCardsHTML(ctx, c) {
  const st = ctx.st; const list = B.schoolUpdates(ctx, c); if (!list.length) return '';
  const inc = new Set(B.schoolIncluded(ctx, c, st).map(x => x.key));
  return `<div class="tile"><div class="row"><span class="ic" style="background:var(--marigold-400);color:var(--navy-900)">${ctx.I.doc}</span><div><h2>From school today</h2><div class="small muted">The counselor's report, not your observation. You decide whether it stays.</div></div></div>
    ${list.map(sh => { const w = B.shareWho(ctx, sh); const on = inc.has(sh.key); const out = (st.schoolOut || []).includes(sh.key);
      return `<div class="box" style="margin-top:8px"><div class="row"><b style="flex:1">${esc(w.name)} · ${esc(w.role)}</b><span class="small muted">${fmtTime(sh.at)}</span></div>
      <div class="v" style="margin-top:2px">“${esc(sh.text)}”</div>${sh.where ? `<div class="small muted">${esc(sh.where)}</div>` : ''}<span class="src">School counselor · school portal</span>
      <div class="row w" style="margin-top:6px">${on ? `<span class="chip g">Added to today's note</span><span style="flex:1"></span><button class="btn o sm" data-act="schoolOut" data-k="${esc(sh.key)}">Leave it out</button>`
        : `${out ? '<span class="chip n">Left out of the note</span>' : ''}<span style="flex:1"></span><button class="btn p sm" data-act="schoolIn" data-k="${esc(sh.key)}">${out ? 'Add it back' : 'Add to the narrative'}</button>`}</div></div>`; }).join('')}</div>`;
}
const narrativeNow = ctx => (ctx.page.form?.fields || []).find(f => f.label === 'Narrative')?.value || '';
function timerCard(ctx, c, ds) {
  const t = ds.t; const drafts = B.draftEntries(ctx, c);
  const draftHint = drafts.length ? `<div class="hint">${drafts.length} stopped timer${drafts.length === 1 ? '' : 's'} not described yet · open Track Time to say what you did. Not counted until then.</div>` : '';
  if (!t.ct) return `<div class="hint">No saved timer blocks today · type the contact time in Lauris.</div>${draftHint}`;
  const open = B.unconfirmedEntries(ctx, c); const unconf = open.length > 0; const canAct = ctx.can('trackTime');
  return `<div class="tile"><div class="row w"><h2 style="flex:1">Contact time · your timer</h2><span class="chip ${unconf ? 'y' : 'g'}">${t.ct.units} unit${t.ct.units === 1 ? '' : 's'}${unconf ? ' · to confirm' : ''}</span></div>
    <div class="small" style="margin:2px 0 6px">Direct time ${esc(t.ct.text)}${unconf ? ` · ${open.length === 1 ? 'one block is' : open.length + ' blocks are'} not counted until you confirm` : ''}</div>
    ${unconf && canAct ? `<div class="row w"><button class="btn p sm" data-act="confirmUnits">Confirm ${B.unitsIfConfirmed(ctx, c).units} units</button><button class="btn o sm" data-act="dropBlock">The afternoon block didn't happen</button></div>` : ''}
    ${unconf && !canAct ? '<div class="hint">Only the person who recorded the time confirms it.</div>' : ''}${draftHint}
    ${ctx.parts.accordion(`Blocks · ${t.ct.rows.length}`, t.ct.rows.map(r => `<div class="stamp"><div>${B.fmtT(r.from)}–${B.fmtT(r.to)}</div><div>${esc(r.what)}${r.unconfirmed ? ' <span class="chip y">unconfirmed</span>' : ''}</div></div>`).join(''), { id: 'dpn-blocks' })}</div>`;
}
function feedbackHTML(ctx, dict) {
  const st = ctx.st; const prev = (dict?.feedback || []).at(-1); const { I } = ctx;
  if (!st.fbDone && prev && !st.fbOpen) return ctx.parts.banner('n', `${prev.kind === 'good' ? 'Marked <b>Good recommendation</b>.' : `<b>Needs improvement</b> saved with this note: “${esc(prev.text)}”.`} Your supervisor sees it with the note. <a href="#" data-act="needsImp">Add more</a>`);
  if (st.fbDone) return ctx.parts.banner('n', `${st.fbDone === 'good' ? 'Marked <b>Good recommendation</b>.' : `<b>Needs improvement</b> saved with this note: “${esc(st.fbSent || '')}”.`} Your supervisor sees it with the note.`);
  return `<div class="row"><button class="btn o" style="flex:1" data-act="goodRec">Good recommendation</button><button class="btn o${st.fbOpen ? ' on' : ''}" style="flex:1" data-act="needsImp">Needs improvement</button></div>
    ${st.fbOpen ? `<div class="tile"><div class="lab">How should Psyflo improve it?</div><textarea class="ed" aria-label="How to improve" data-in="fbText" placeholder="e.g. wrong objective · too long · he did not walk off the court">${esc(st.fbText || '')}</textarea><div class="row" style="margin-top:8px"><button class="btn p" style="flex:1" data-act="fbSend">Save feedback</button><button class="btn o" data-act="fbCancel">Cancel</button></div></div>` : ''}`;
}
function dpnHTML(ctx, c) {
  const { banner, checksBlock } = ctx.parts; const s = ctx.S(); const st = ctx.st; const pg = ctx.pg; const ds = dpnState(ctx, c); const e = ds.e;
  const nt = ctx.M.notesToday(s, c.staff || ctx.me().id);
  const fromPhone = ds.dict && ds.dict.source !== 'panel';
  let h = '';
  if (fromPhone && !st.dropped && ds.dict.status === 'waiting') h += banner('y', `<b>1 dictation waiting</b> from the phone · ${fmtTime(ds.dict.at)}. Dropping it into the open form…`, { icon: ctx.I.mic });
  if (st.dropped) h += banner('', `<b>${fromPhone ? 'Dictation dropped in' : 'Boxes typed'}</b> · narrative and contact-time rows typed into the open form, yellow. Confirm the units, then press Save Form Data or Process Form: Psyflo keeps what you save.`);
  if (fromPhone) {
    h += `<div class="tile"><div class="lab row" style="gap:6px">${ctx.I.mic}Said into the phone, ${fmtTime(ds.dict.at)}</div><div style="font-size:13px;margin-top:4px;font-style:italic">“${esc(ds.input)}”</div></div>`;
    h += schoolCardsHTML(ctx, c);
    if (e) h += `<div><div class="lab" style="margin-bottom:4px">Drafted for the narrative</div><div class="par">${esc([e.narrative, ...B.schoolSentences(ctx, c, st)].filter(Boolean).join(' '))}</div></div>
      <div class="hint">Your own words, tidied. Nothing was added.</div>`;
    h += timerCard(ctx, c, ds);
    if (e) { pg.lastChecks = e.checks; h += `<div class="row"><button class="btn p" style="flex:1" data-act="dpnFill" ${pg.filling ? 'disabled' : ''}>${st.dropped ? 'Type it again' : 'Fill the boxes'}</button></div>${feedbackHTML(ctx, ds.dict)}${guidanceQuestions(ctx, e)}${checksBlock(e.checks)}`; }
    h += `<div class="hint">Daily notes today (${esc(ctx.M.staffShort(s, c.staff || ctx.me().id))}): ${nt.done} of ${nt.total}.</div>`;
    return h;
  }
  // say it here, or type it: the guidance, the draft, the review
  const rec = recFor(ctx, c, 'dpn');
  const key = SAID_KEY(c, 'dpn'); const txt = ctx.ui.draft.get(key, '');
  h += schoolCardsHTML(ctx, c);
  if (rec && !st.again) {
    h += `<div class="tile"><div class="lab row" style="gap:6px">${ctx.I.mic}${rec.input.kind === 'dictation' ? 'Said here' : 'Typed here'}${st.sample === 'dpn' ? ctx.parts.SAMPLE_CHIP() : ''}<button class="btn o sm" style="margin-left:auto" data-act="sayAgain">Say it again</button></div><div style="font-size:13px;margin-top:4px;font-style:italic">“${esc(rec.input.text)}”</div></div>`;
    h += timerCard(ctx, c, ds);
    h += reviewBlock(ctx, rec, { title: 'Daily note · ' + c.initials, st, client: c, sources: B.DPN_SOURCES, extra: () => ds.t.boxes });
    h += guidanceBlock(ctx, c, rec.input.text);
    h += `<div class="hint">Daily notes today (${esc(ctx.M.staffShort(s, c.staff || ctx.me().id))}): ${nt.done} of ${nt.total}.</div>`;
    return h;
  }
  h += sayItHTML(ctx, c, 'dpn', `One or two sentences about what you did with ${c.initials} today, in your words. What you do not say becomes a question.`);
  h += `<div id="sg">${guidanceHTML(dailyGuidance(txt, { client: c, interventions: s.interventions, hasTimer: ds.t.blocks.length > 0 }))}</div>`;
  h += timerCard(ctx, c, ds);
  h += `<div class="hint">Daily notes today (${esc(ctx.M.staffShort(s, c.staff || ctx.me().id))}): ${nt.done} of ${nt.total}.</div>`;
  return h;
}
const guidanceQuestions = (ctx, e) => (e.questions || []).length ? ctx.parts.accordion(`Questions for you · ${e.questions.length}`, e.questions.map(q => `<div class="cr">${ctx.I.warn}<div><b>${esc(q.q)}</b>${q.options && q.options.length ? `<div class="hint">${q.options.map(esc).join(' · ')}</div>` : ''}</div></div>`).join(''), { id: 'dpn-q', open: true }) : '';
function guidanceBlock(ctx, c, text) {
  const s = ctx.S(); const g = dailyGuidance(text, { client: c, interventions: s.interventions, hasTimer: B.timerBlocks(ctx, c).length > 0 });
  return g.items.some(i => !i.done) ? ctx.parts.accordion(`Missing · ${g.items.filter(i => !i.done).length}`, guidanceHTML(g, { title: 'Questions for you' }), { id: 'dpn-miss' }) : '';
}

// the "Say what happened" tile: recording (after the consent card) or typing
function sayItHTML(ctx, c, form, prompt) {
  const st = ctx.st; const key = SAID_KEY(c, form);
  if (st.rec && st.rec.live && st.rec.kind === form) {
    return `<div class="banner n"><span class="rec on"></span><div style="flex:1"><b>Listening · ${R.elapsed(st)}</b> · microphone · say what happened, then Stop</div></div>
      <div class="tx" id="tx">${esc(R.text(st)) || '<span class="muted">…</span>'}</div>
      <div class="row"><button class="btn p" style="flex:1" data-act="sayStop" data-k="${form}">Stop and draft</button><button class="btn o" data-act="sayCancel">Cancel</button></div>`;
  }
  if (st.ask === form) return consentCard(ctx, form, { label: 'your dictation' });
  const hasCons = consentFor(ctx, c, form);
  return `<div class="tile t"><div class="row"><span class="ic" style="background:var(--teal-600);color:#fff">${ctx.I.mic}</span><div style="flex:1"><h2>Say what happened</h2><div class="small muted">${esc(prompt)}</div></div></div>
    <div class="row w" style="margin-top:10px"><button class="btn p" style="flex:1" data-act="sayMic" data-k="${form}">${ctx.I.mic} Record (microphone)</button></div>
    <label class="lab" style="display:block;margin-top:10px" for="say-ta-${form}">Or type it</label>
    <textarea class="ed" id="say-ta-${form}" data-in="sayText" data-ui-draft="${esc(key)}" data-k="${form}" placeholder="${form === 'dpn' ? 'e.g. worked on taking a break before leaving the room; he used it twice' : 'What was said and agreed'}">${esc(ctx.ui.draft.get(key, ''))}</textarea>
    <div class="row" style="margin-top:8px"><button class="btn p" style="flex:1" data-act="sayDraft" data-k="${form}">Draft it</button></div>
    <div class="hint" style="margin-top:4px">${R.hasSpeech() ? 'Nothing is recorded until you press Record and confirm consent.' : 'Speech recognition is not available in this browser: type it instead.'}${hasCons ? ' · consent recorded today' : ''}</div></div>`;
}

// ------------------------------------------------------------------ weekly guardian contact and monthly collateral
const SPEC = {
  weekly: { label: 'Weekly guardian contact', prompt: ini => `What you and the guardian covered about ${ini}, in your words. What you do not say becomes a question.`, guidance: (ctx, c, t) => weeklyGuidance(t, { client: c }) },
  collateral: { label: 'Monthly collateral', prompt: ini => `Who you spoke with about ${ini}, how, what was shared and what was agreed.`, guidance: (ctx, c, t) => collateralGuidance(t, { client: c }) }
};
function textFlowHTML(ctx, c, tp) {
  const spec = SPEC[tp]; const st = ctx.st; const rec = recFor(ctx, c, tp); const key = SAID_KEY(c, tp); const txt = ctx.ui.draft.get(key, '');
  let h = '';
  if (tp === 'collateral') h += schoolCollateralHTML(ctx, c);
  if (rec && !st.again) {
    h += `<div class="tile"><div class="lab row" style="gap:6px">${ctx.I.mic}${rec.input.kind === 'transcript' ? 'Recorded here' : 'Typed here'}${st.sample === tp ? ctx.parts.SAMPLE_CHIP() : ''}<button class="btn o sm" style="margin-left:auto" data-act="sayAgain">Say it again</button></div><div style="font-size:13px;margin-top:4px;font-style:italic">“${esc(rec.input.text.slice(0, 320))}${rec.input.text.length > 320 ? '…' : ''}”</div></div>`;
    h += reviewBlock(ctx, rec, { title: spec.label + ' · ' + c.initials, st, client: c, sources: [] });
    const g = spec.guidance(ctx, c, rec.input.text); const open = g.items.filter(i => !i.done);
    if (open.length) h += ctx.parts.accordion(`Missing · ${open.length}`, guidanceHTML(g, { title: 'Questions for you' }), { id: tp + '-miss' });
    return h;
  }
  h += sayItHTML(ctx, c, tp, spec.prompt(c.initials));
  h += `<div id="sg">${guidanceHTML(spec.guidance(ctx, c, txt))}</div>`;
  return h;
}
function schoolCollateralHTML(ctx, c) {
  const st = ctx.st; const all = B.schoolUpdates(ctx, c, { today: false }); const list = all.filter(sh => !sh.used.collateral || (st.collDone || []).includes(sh.key));
  if (!list.length) return '';
  const rel = B.schoolRelease(ctx, c); const onPage = B.pageRelease(ctx);
  return `<div class="tile"><h2>From school · not yet a collateral contact</h2>
    ${rel || onPage ? `<div class="small" style="margin-top:6px">${ctx.I.ok} Release on file${onPage ? ' in Lauris: ' + esc(onPage) : ' · signed ' + esc(fmtDate(rel.signed_at)) + ' on the parent portal'}.</div>` : `<div style="margin-top:8px">${ctx.parts.banner('y', `<b>No signed school release for ${esc(c.initials.replace(/\.$/, ''))}.</b> A release is needed before this counts as a collateral contact; Psyflo leaves "Release on file" blank.`)}</div>`}
    ${list.map(sh => { const w = B.shareWho(ctx, sh); const done = sh.used.collateral;
      return `<div class="box" style="margin-top:8px"><div class="row"><b style="flex:1">${esc(w.name)} · ${esc(w.role)}</b><span class="small muted">${fmtDate(sh.at)} ${fmtTime(sh.at)}</span></div>
      <div class="v" style="margin-top:2px">“${esc(sh.text)}”</div>
      <div class="row w" style="margin-top:6px">${done ? '<span class="chip g">Filled as a collateral contact</span><span style="flex:1"></span>' : '<span style="flex:1"></span>'}<button class="btn ${done ? 'o' : 'p'} sm" data-act="collFill" data-k="${esc(sh.key)}" ${ctx.pg.filling ? 'disabled' : ''}>${done ? 'Type it again' : 'Fill as collateral contact'}</button></div></div>`; }).join('')}
    <div class="hint" style="margin-top:6px">Coordination is left for you.</div></div>`;
}

// ------------------------------------------------------------------ intake / CNA (live after Flow A)
const PHQ = ['1', '1', '0', '1', '0', '0', '1', '0', '0'];
function cnaHTML(ctx, c) {
  const { banner, boxRow, checksBlock, SAMPLE_CHIP } = ctx.parts; const s = ctx.S(); const st = ctx.st;
  const sc = s.screenings.find(x => x.client === c.id && (x.boxes || x.facts));
  const facts = sc?.facts || (sc?.transcript ? screeningFacts(sc.transcript) : null);
  const screening = sc ? { facts, boxes: sc.boxes || (sc.transcript ? draftScreening({ transcript: sc.transcript, today: ctx.M.today(s) }).boxes : []), when: sc.when } : null;
  const d = draftSeeded('cna', { client: c, screening, today: ctx.M.today(s) });
  const phq = PHQ.map((v, i) => ({ label: `PHQ item ${i + 1}`, value: v, src: [3] }));
  const boxes = d.boxes.concat(phq);
  const cons = consentFor(ctx, c, 'cna'); let h = '';
  if (st.ask === 'cna') h += consentCard(ctx, 'cna', { label: 'Intake' });
  else if (!cons) h += `<div class="tile"><div class="row"><span class="rec"></span><div style="flex:1"><b>Not recording</b> · intake conversation</div><button class="btn p sm" data-act="cnaAsk">Record</button></div><div class="hint" style="margin-top:4px">Recording needs a recorded consent. You can also type in Lauris.</div></div>`;
  else h += `<div class="banner n"><span class="rec ${st.cnaRec !== false ? 'on' : ''}"></span><div style="flex:1"><b>${st.cnaRec !== false ? 'Recording' : 'Paused'} · intake conversation</b> · consent recorded ${fmtDate(cons.at)}</div><button class="tog" data-act="cnaPause">${st.cnaRec !== false ? 'Pause' : 'Resume'}</button></div>`;
  if (!screening) h += banner('y', 'No screening on record: presenting issue and prior services cannot be copied. Run the screening first.');
  h += `<div class="row w"><h2 class="st" style="flex:1">CNA fields · ${boxes.length}</h2>${SAMPLE_CHIP()}</div>
    <div class="hint">Boxes marked "copied from screening" come from the call. The rest is a seeded sample, not built from this intake.</div>`;
  h += ctx.parts.accordion(`Boxes · ${d.boxes.length}`, d.boxes.map(b => `<div class="box"><div class="l">${esc(b.label)} ${b.copied ? '<span class="chip g">copied from screening</span>' : ''}</div><div class="v">${esc(b.value || '—')}</div>${b.note ? `<div class="small" style="color:var(--warning-fg)">← ${esc(b.note)}</div>` : ''}</div>`).join('') + `<div class="box"><div class="l">PHQ-9 · answers from the interview</div><div class="v">${PHQ.join(' · ')}. Item 9 asked directly. Lauris scores on Process Form.</div></div>` + d.blank.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v muted">${esc(b.why)}</div></div>`).join(''), { id: 'cna-boxes' });
  h += `<div class="lab">Still to ask</div>${cnaAsk(facts)}${checksBlock(d.checks)}
    <div class="row"><button class="btn p" style="flex:1" data-act="cnaFill" ${ctx.pg.filling ? 'disabled' : ''}>Fill ${boxes.length} boxes</button><button class="btn o" data-act="cnaOne">Review one by one</button></div>`;
  if (st.one != null) h += oneAtATime(ctx, boxes, 'cnaOneType', 'cnaOneSkip');
  st.cnaBoxes = { boxes, sources: d.sources };
  return h;
}
function cnaAsk(f) {
  const rows = [];
  if (f && f.prior_provider) rows.push(['Dates', `${f.prior_provider}: confirm start and end month, and whether it was through secondary insurance`]);
  rows.push(['Danger', 'Does the student understand the risk when they leave the building? (criterion 3)'], ['Collateral', 'Releases: school counselor, pediatrician, previous outpatient provider']);
  return rows.map(([a, b]) => `<div class="stamp"><div><b>${a}</b></div><div>${esc(b)}</div></div>`).join('');
}

// ------------------------------------------------------------------ acts
const acts = {
  openForm(el, ctx) { const f = el.dataset.form; const no = el.dataset.no; if (!no) return ctx.flash('Open a student in Lauris first', 'y'); return ctx.nav(`/consumers/${no}/session/${f}`); },
  openStudentForm(el, ctx) { const list = (ctx.page.consumers || []).filter(x => x.program === 'TDT'); const no = ctx.st.student || (list[0] && list[0].no); if (!no) return; return ctx.nav(`/consumers/${no}/session/${el.dataset.form}`); },
  // new consumer
  fillNew: async (el, ctx) => {
    const st = ctx.st; const s = ctx.S(); const cands = B.candidateReferrals(ctx);
    const r = s.referrals.find(x => x.id === (st.ref || (cands.find(x => x.id === new URL(ctx.page.url).searchParams.get('referral')) || cands[0])?.id)); if (!r) return;
    const i = B.refInfo(ctx, r);
    try { localStorage.setItem('psyflo_newref', JSON.stringify({ ref: r.id, initials: i.initials, at: Date.now() })); } catch (e) { }
    const res = await ctx.fill(B.newConsumerBoxes(ctx, r), { form: 'new-consumer', client: i.c || { id: r.id }, sources: B.NEW_SOURCES });
    if (!res.error) ctx.flash(`Boxes typed. Check them and press Save Consumer in Lauris.${res.missing?.length ? ' Not found on this form: ' + res.missing.join(', ') : ''}`, res.missing?.length ? 'y' : 'g');
  },
  // consent
  consentGive: async (el, ctx) => {
    const st = ctx.st; const c = ctx.client(); const kind = st.ask; const form = kind === 'screening' ? 'screening' : kind; const present = [...(st.who || [])];
    const who = form === 'dpn' ? ['Staff member (own dictation)'] : present;
    if (!who.length) return ctx.flash('Tick who agreed to be recorded, or choose Type instead.', 'y');
    await ctx.do('scribe.consent', { client: c.id, form, kind: 'given', present: who });
    const mode = st.askMode; st.ask = null; st.who = [];
    if (form === 'screening') { st.transcript = ''; if (mode === 'script') { await R.startScript(ctx, st, 'sc'); st.sc = 'rec'; } else if (R.startMic(ctx, st, 'sc')) st.sc = 'rec'; }
    else if (form === 'cna') { st.cnaRec = true; ctx.flash('Consent recorded for the intake.'); }
    else R.startMic(ctx, st, form);
    ctx.draw();
  },
  consentDecline: async (el, ctx) => {
    const st = ctx.st; const c = ctx.client(); const form = st.ask;
    await ctx.do('scribe.consent', { client: c.id, form, kind: 'declined', present: [] });
    st.ask = null; st.who = []; ctx.flash('Not recording. Type it instead; nothing is recorded.', 'y');
  },
  recMic(el, ctx) { ctx.st.ask = 'screening'; ctx.st.askMode = 'mic'; ctx.draw(); },
  recScript(el, ctx) { ctx.st.ask = 'screening'; ctx.st.askMode = 'script'; ctx.draw(); },
  sayMic(el, ctx) { ctx.st.ask = el.dataset.k; ctx.st.askMode = 'mic'; ctx.draw(); },
  cnaAsk(el, ctx) { ctx.st.ask = 'cna'; ctx.draw(); },
  cnaPause(el, ctx) { ctx.st.cnaRec = ctx.st.cnaRec === false; ctx.draw(); },
  refPreFill: async (el, ctx) => { const p = ctx.page; const r = B.referralForConsumer(ctx, p.consumer?.no, p.consumer?.initials); if (!r) return; await ctx.fill(B.preCallBoxes(ctx, null, r), { form: 'screening', client: B.refInfo(ctx, r).c || { id: r.id }, sources: B.PRE_SOURCES }); ctx.st.preFilled = true; ctx.draw(); },
  preFill: async (el, ctx) => { const c = ctx.client(); await ctx.fill(B.preCallBoxes(ctx, c), { form: 'screening', client: c, sources: B.PRE_SOURCES }); ctx.st.preFilled = true; ctx.draw(); },
  recStop: async (el, ctx) => {
    const st = ctx.st; const c = ctx.client(); const s = ctx.S(); const txt = R.text(st); R.stop(st);
    const r = s.referrals.find(x => x.id === c.referral); const fl = r && ctx.M.familyLinkFor(s, r.id);
    st.transcript = txt;
    st.draft = draftScreening({ transcript: txt, today: ctx.M.today(s), guardianPhone: fl?.answers?.phone || c.guardian?.phone || '', referral: r });
    st.sc = 'drafted'; ctx.draw();
    ctx.do('screening.drafted', { client: c.id, referral: c.referral, transcript: txt }).catch(() => { });
  },
  recAgain(el, ctx) { const st = ctx.st; st.sc = 'pre'; st.draft = null; st.scFilled = false; st.transcript = ''; ctx.draw(); },
  copyAsks(el, ctx) { const asks = screeningPrompts(screeningFacts(R.text(ctx.st))).filter(p => !p.done && p.ask).map(p => '• ' + p.ask).join('\n'); navigator.clipboard?.writeText(asks).then(() => ctx.flash('Asks copied'), () => ctx.flash(asks)); },
  scFill: async (el, ctx) => { const st = ctx.st; const c = ctx.client(); const d = st.draft; await ctx.fill(d.boxes, { form: 'screening', client: c, sources: d.sources }); st.scFilled = true; ctx.draw(); },
  scOne(el, ctx) { ctx.st.one = 0; ctx.draw(); }, oneClose(el, ctx) { ctx.st.one = null; ctx.draw(); },
  scOneType: async (el, ctx) => { const st = ctx.st; const b = st.draft.boxes[st.one]; await ctx.fill([b], { form: 'screening', client: ctx.client(), sources: st.draft.sources }); st.one++; ctx.draw(); },
  scOneSkip(el, ctx) { ctx.st.one++; ctx.draw(); },
  // say it / type it, then draft
  sayCancel(el, ctx) { const st = ctx.st; R.stop(st); st.rec = null; ctx.draw(); },
  sayStop: (el, ctx) => {
    const st = ctx.st; const c = ctx.client(); const form = el.dataset.k; const t = R.text(st); st.lastMode = 'mic'; R.stop(st);
    if (!t) { ctx.flash('Nothing was heard. Try again, or type it.', 'y'); return; }
    ctx.ui.draft.set(SAID_KEY(c, form), t); st.rec = null; return sayDraft(ctx, form, 'dictation');
  },
  sayDraft: (el, ctx) => sayDraft(ctx, el.dataset.k, 'typed'),
  sayAgain(el, ctx) { ctx.st.again = true; ctx.st.sample = null; ctx.draw(); },
  // the phone path of the daily note
  // Confirm and "didn't happen" go through the time model (time.save {confirm:true} / time.discard): the entries change first, then the note's boxes are
  // rebuilt from the entries, so the note, Track Time and the phone always show the same minutes and units.
  confirmUnits: async (el, ctx) => {
    const c = ctx.client(); const ids = B.unconfirmedEntries(ctx, c).map(e => e.id); if (!ids.length) return;
    for (const id of ids) await ctx.do('time.save', { id, confirm: true });
    const ds = dpnState(ctx, c); await ctx.fill(ds.t.boxes, { form: 'dpn', client: c, sources: B.DPN_SOURCES, animate: false });
    ctx.flash(`${ds.t.ct.units} units confirmed (${ds.t.ct.text}, units from the direct minutes under the unit bands).`);
  },
  dropBlock: async (el, ctx) => {
    const c = ctx.client(); const ids = B.unconfirmedEntries(ctx, c).map(e => e.id); if (!ids.length) return;
    for (const id of ids) await ctx.do('time.discard', { id, reason: 'Did not happen (said in the daily note panel)' });   // kept in the record, voided, never counted
    const ds = dpnState(ctx, c); if (ds.t.boxes.length) await ctx.fill(ds.t.boxes, { form: 'dpn', client: c, sources: B.DPN_SOURCES, animate: false });
    ctx.flash(`Block discarded · kept in the record, not counted. ${ds.t.ct ? ds.t.ct.units + ' units (' + ds.t.ct.text + ').' : ''}`);
  },
  dpnFill: async (el, ctx) => { const st = ctx.st; const c = ctx.client(); const ds = dpnState(ctx, c); await ctx.fill(dpnBoxes(ctx, c, ds), { form: 'dpn', client: c, sources: B.DPN_SOURCES }); st.dropped = true; ctx.draw(); },
  goodRec: async (el, ctx) => { const st = ctx.st; const c = ctx.client(); const ds = dpnState(ctx, c); await ctx.do('panel.feedback', { client: c.id, form: 'dpn', kind: 'good', dictation: ds.dict?.id, narrative: ds.e?.narrative }); st.fbDone = 'good'; st.fbOpen = false; ctx.draw(); },
  needsImp(el, ctx) { const st = ctx.st; st.fbOpen = !st.fbOpen; st.fbDone = null; ctx.draw(); },
  fbCancel(el, ctx) { ctx.st.fbOpen = false; ctx.draw(); },
  fbSend: async (el, ctx) => {
    const st = ctx.st; const text = (st.fbText || '').trim(); if (!text) { ctx.flash('Say briefly how to improve it.', 'y'); return; }
    const c = ctx.client(); const ds = dpnState(ctx, c);
    await ctx.do('panel.feedback', { client: c.id, form: 'dpn', kind: 'needs_improvement', text, dictation: ds.dict?.id, narrative: ds.e?.narrative });
    st.fbDone = 'needs_improvement'; st.fbSent = text; st.fbOpen = false; st.fbText = ''; ctx.draw();
  },
  schoolIn: async (el, ctx) => {
    const st = ctx.st; const c = ctx.client(); const sh = B.schoolUpdates(ctx, c).find(x => x.key === el.dataset.k); if (!sh) return;
    st.schoolIn = (st.schoolIn || []).filter(k => k !== sh.key).concat([sh.key]); st.schoolOut = (st.schoolOut || []).filter(k => k !== sh.key);
    const sent = B.shareSentence(ctx, sh); const cur = narrativeNow(ctx);
    if (cur && !cur.includes(sent)) await ctx.fill([{ label: 'Narrative', value: cur.trim() + ' ' + sent, src: [4] }], { form: 'dpn', client: c, sources: B.DPN_SOURCES, animate: false });
    if (sh.id && !sh.used.daily) await ctx.do('school.shareUsed', { id: sh.id, how: 'daily' }).catch(err => ctx.flash(err.message, 'r'));
    if (!cur) ctx.flash('Added to the drafted narrative, credited to the counselor. It goes into Lauris when you press Fill.');
    ctx.draw();
  },
  schoolOut: async (el, ctx) => {
    const st = ctx.st; const c = ctx.client(); const sh = B.schoolUpdates(ctx, c).find(x => x.key === el.dataset.k); if (!sh) return;
    st.schoolOut = (st.schoolOut || []).filter(k => k !== sh.key).concat([sh.key]); st.schoolIn = (st.schoolIn || []).filter(k => k !== sh.key);
    const sent = B.shareSentence(ctx, sh); const cur = narrativeNow(ctx);
    if (cur.includes(sent)) await ctx.fill([{ label: 'Narrative', value: cur.replace(sent, '').replace(/\s{2,}/g, ' ').trim() }], { form: 'dpn', client: c, sources: B.DPN_SOURCES, animate: false });
    ctx.flash('Left out of the note. The update stays in Psyflo.', 'y'); ctx.draw();
  },
  collFill: async (el, ctx) => {
    const st = ctx.st; const c = ctx.client(); const sh = B.schoolUpdates(ctx, c, { today: false }).find(x => x.key === el.dataset.k); if (!sh) return;
    const r = await ctx.fill(B.collateralBoxes(ctx, c, sh), { form: 'collateral', client: c, sources: B.COLL_SOURCES }); if (r.error) return;
    st.collDone = (st.collDone || []).concat([sh.key]);
    if (sh.id && !sh.used.collateral) await ctx.do('school.shareUsed', { id: sh.id, how: 'collateral' }).catch(err => ctx.flash(err.message, 'r'));
    ctx.draw();
  },
  // CNA
  cnaFill: async (el, ctx) => { const st = ctx.st; await ctx.fill(st.cnaBoxes.boxes.filter(b => b.value), { form: 'cna', client: ctx.client(), sources: st.cnaBoxes.sources }); ctx.draw(); },
  cnaOne(el, ctx) { ctx.st.one = 0; ctx.draw(); },
  cnaOneType: async (el, ctx) => { const st = ctx.st; await ctx.fill([st.cnaBoxes.boxes[st.one]], { form: 'cna', client: ctx.client(), sources: st.cnaBoxes.sources }); st.one++; ctx.draw(); },
  cnaOneSkip(el, ctx) { ctx.st.one++; ctx.draw(); }
};
// draft from what the person said or typed: items come from their words and stored records only
async function sayDraft(ctx, form, kindHint) {
  const st = ctx.st; const c = ctx.client(); const text = ctx.ui.draft.get(SAID_KEY(c, form), '').trim();
  if (!text) { ctx.flash('Say or type what happened first.', 'y'); return; }
  const s = ctx.S(); const today = ctx.M.today(s); const items = [];
  const input = { kind: kindHint === 'dictation' ? (form === 'dpn' ? 'dictation' : 'transcript') : 'typed', text };
  const inputSrc = { n: 1, kind: 'input', label: 'What you said', date: today, quote: text };
  if (form === 'dpn') {
    items.push({ id: 'narrative', label: 'Narrative', staff: text, psyflo: tidySentence(text), sources: [inputSrc] });
    const om = text.match(/\b(?:objective|obj\.?|goal)\s*([1-3])\b/i); const g = om && (c.goals || []).find(x => x.n === +om[1]);
    if (g) items.push({ id: 'objective', label: 'Objective addressed', staff: om[0], psyflo: `Obj. ${g.n} – ${g.objective}`, sources: [{ ...inputSrc, quote: om[0] }, { n: 2, kind: 'plan', label: `ISP goal ${g.n}`, quote: g.objective }] });
    const ivs = s.interventions.filter(i => i.name && (text.toLowerCase().includes(i.name.toLowerCase()) || (i.code && text.toLowerCase().includes(i.code.toLowerCase()))));
    if (ivs.length) items.push({ id: 'interventions', label: 'Interventions', staff: ivs.map(i => i.name).join(', '), psyflo: ivs.map(i => `${i.code} ${i.name}`).join(' · '), sources: [inputSrc, { n: 2, kind: 'list', label: "Harvest's intervention list" }] });
  } else if (form === 'weekly') {
    const g = c.guardian || {};
    if (!formValue(ctx, 'Date')) items.push({ id: 'date', label: 'Date', staff: '', psyflo: B.usDate(today), sources: [{ n: 1, kind: 'client', label: 'Today (demo clock)', date: today }] });
    if (g.name && !formValue(ctx, 'Contact with')) items.push({ id: 'contact', label: 'Contact with', staff: '', psyflo: `${String(g.name).replace(/^./, x => x.toUpperCase())}${g.relationship && g.relationship !== g.name ? ' (' + g.relationship + ')' : ' (guardian)'} · phone`, sources: [{ n: 1, kind: 'client', label: 'Guardian on the student record' }] });
    const dm = text.match(/(\d+)\s*(?:min|minutes)\b/i); if (dm) items.push({ id: 'duration', label: 'Duration', staff: dm[0], psyflo: `${dm[1]} min`, sources: [{ ...inputSrc, quote: dm[0] }] });
    items.push({ id: 'discussed', label: 'What was discussed', staff: text, psyflo: tidySentence(text), sources: [inputSrc] });
  } else if (form === 'collateral') {
    if (!formValue(ctx, 'Date')) items.push({ id: 'date', label: 'Date', staff: '', psyflo: B.usDate(today), sources: [{ n: 1, kind: 'client', label: 'Today (demo clock)', date: today }] });
    items.push({ id: 'shared', label: 'Information shared / received', staff: text, psyflo: tidySentence(text), sources: [inputSrc] });
  }
  st.again = false;
  const sess = ctx.page.form && ctx.page.form.session;
  await ctx.do('scribe.draft', { client: c.id, form, input, items, session: sess || null });
  ctx.draw();
}

const ins = {
  consentWho(el, ctx) { const st = ctx.st; const v = el.dataset.v; st.who = (st.who || []).filter(x => x !== v); if (el.checked) st.who.push(v); },
  sayText(el, ctx) {
    const st = ctx.st; const c = ctx.client(); const form = el.dataset.k; ctx.ui.draft.set(SAID_KEY(c, form), el.value);
    clearTimeout(st.gt); st.gt = setTimeout(() => { const box = document.getElementById('sg'); if (!box) return; const s = ctx.S();
      const g = form === 'dpn' ? dailyGuidance(el.value, { client: c, interventions: s.interventions, hasTimer: B.timerBlocks(ctx, c).length > 0 }) : SPEC[form].guidance(ctx, c, el.value);
      box.innerHTML = guidanceHTML(g); }, 150);
  },
  fbText(el, ctx) { ctx.st.fbText = el.value; }
};
const chs = {
  pickType(el, ctx) { ctx.st.type = el.value; ctx.st.autoType = ctx.page.url + el.value; ctx.st.again = false; ctx.draw(); },
  pickStudent(el, ctx) { ctx.st.student = el.value; ctx.draw(); },
  pickRef(el, ctx) { ctx.st.ref = el.value; ctx.pg.filled = []; ctx.draw(); }
};

// what is typed on its own when the form opens: the boxes the record already holds, and a dictation the phone left waiting
async function onOpen(ctx) {
  const p = ctx.page; if (p.kind !== 'session') return; const c = ctx.client(); if (!c) return; const st = ctx.st; const s = ctx.S();
  if (p.form.type === 'screening' && ctx.can('drafts.clinical')) {
    const pre = B.preCallBoxes(ctx, c).filter(b => !(p.form.fields.find(f => f.label === b.label)?.value));
    if (pre.length) { await ctx.fill(pre, { form: 'screening', client: c, sources: B.PRE_SOURCES }); st.preFilled = true; ctx.draw(); } else st.preFilled = true;
  }
  if (p.form.type === 'dpn') {
    const d = ctx.M.waitingDictations(s, c.id)[0]; const narrative = p.form.fields.find(f => f.label === 'Narrative')?.value;
    if (d && d.source !== 'panel' && !narrative) {
      st.usedDict = d.id;
      const ds = dpnState(ctx, c);
      await ctx.fill(dpnBoxes(ctx, c, ds), { form: 'dpn', client: c, sources: B.DPN_SOURCES });
      st.dropped = true; ctx.draw();
    }
  }
}

export default {
  id: 'scribe', label: 'Scribe', cap: 'ext.use',
  title: ctx => { if (ctx.page.kind === 'new-consumer') return 'Scribe · New consumer'; const t = typeOf(currentType(ctx)); const c = ctx.client(); return `Scribe · ${t ? t.label : ''}${c ? ' · ' + c.initials : ''}`; },
  html, acts, ins, chs, onOpen,
  leave(ctx) { const st = ctx.stOf('scribe'); R.stop(st); },
  // presenter commands: { psyflo:'present', cmd:'example' } puts the worked example in the box; 'script' plays the scripted screening call
  present: {
    example: async (ctx) => {
      const c = ctx.client(); if (!c) return; const form = ctx.page.form && ctx.page.form.type; const st = ctx.st;
      if (form === 'dpn' && c.id === 'MR') { ctx.ui.draft.set(SAID_KEY(c, 'dpn'), DPN_EXAMPLE); st.type = 'dpn'; st.sample = 'dpn'; await sayDraft(ctx, 'dpn', 'typed'); return; }
      const smp = (ctx.S().notes_sample || []).find(n => n.client === c.id && n.type === (form === 'weekly' ? 'weekly_guardian' : form === 'collateral' ? 'monthly_collateral' : ''));
      if (smp) { ctx.ui.draft.set(SAID_KEY(c, form), [smp.discussed || smp.shared, smp.follow_up || smp.coordination].filter(Boolean).join(' ')); st.type = form; st.sample = form; await sayDraft(ctx, form, 'typed'); }
    },
    script: async ctx => { ctx.st.ask = 'screening'; ctx.st.askMode = 'script'; ctx.draw(); }
  }
};
