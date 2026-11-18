// Denial Intelligence selectors for the Oprox parity round (R7, D-04 to D-07). PURE: no DOM, no screen imports. The server tests, the platform screens
// (DenialIntelligence.js, DenialCase.js, DenialIntel*.js) and the extension panel's Denial packet view read the same functions.
//
// Nothing here writes clinical text. Every sentence is built from stored records through the existing sentence builders (sentenceRatings, sentenceLevel,
// sentenceDim, sentencePrior, sentenceCurrent, sentenceRisk in sel/disputes.js, asam.changeText) or is a plain statement of what is missing ("No dated
// record on file for D4. Add one before replying."). Numbers from state.intel_sample (payer pattern: analogous cases, reversal %, strategy success) are an
// ILLUSTRATIVE SAMPLE: `pattern.sample` is true and `pattern.basis` is the sentence a screen prints beside the Simulated chip. Everything else is computed.
//
//   serviceOf(r)                              { text:'IOP · H0015', level:'2.1', code:'H0015'|null, name }       the service, read from the request's ASAM level
//   scrubIdentifiers(text, s?, clientId?)     { text, removed }          member and group numbers, phone numbers, e-mail, birth dates and the client's own names removed
//   evidenceItems(idx, ids)                   [{ id, n, label, date, quote, source, state, reason, dim, usable }]   evidence rows ready for an evidence chip
//   denialFields(s, d, r, {clinical=true})    D-06 the parsed decision fields (the Oprox FROM / RE / SERVICE / REQUESTED / APPROVED / REVENUE AT RISK / DECISION / RATIONALE)
//     { payer:{id,name,first}, consumer:'D.W.', request, case,                               who and which
//       service:{text,level,code,name}, requested:{units,text}, approved:{units|null,kind:'offered'|'approved'|'none',text},
//       risk: atRisk(s,r)|null, due: urgency(s,r),
//       decision:{ kind:'partial'|'info'|'denial', label, text, stage, date, via, detail },
//       rationale: null (clinical:false) | { recorded:boolean, text, items:[{text,source,date}] },
//       rows:[{ key, label, value, clinical? }] }                                              the strip, in the Oprox order, ready to print
//   appealAnalysis(s, d, r, {idx, recs})      D-05 the appeal analysis document
//     { fields, header:{consumer,payer,request,due},
//       rationale:{ recorded, text, quotes:[{text,source,date}] },                            "Denial rationale": the payer's own words, quoted from the stored notice
//       synthesis:{ text, sentences:[{ key, text, ids, evidence, missing:boolean }] },        "Core clinical synthesis": ratings, level, change, prior services, current services, risk
//       findings:[{ key, sev:'critical'|'strong', kind:'strong'|'gap'|'clarify'|'risk', title, text, ids, evidence, fix, dims:[n], lauris }],   "Why this denial is contestable"
//       caveats:[{ key, title, text, ids, evidence, fix }],                                    what to know before relying on it (held back, illustrative, unverified rule)
//       dimensions:{ heading, assessed, rows:[{ n, short, label, name, rating, ratingLabel, date, text, ids, evidence, driver, needsRecord, need }] },   "All six ASAM dimensions"
//       actions:[{ n, key, title, why, impact, dim, evidence, state, needsInput, text, outcome, rec }],   "What Psyflo would do": the numbered denial suggestions
//       pattern: patternView(s, r.payer, reasonText) }
//   patternView(s, payerId, reason?)          D-07 the payer pattern
//     { payer, name, first, tends, works, partialRate, approvalPct,                           stored (payers) plus the sample approval rate
//       sample:true, basis, analogous, reversedPct, p2pOverturnPct, note,                      sample (intel_sample.appeals)
//       strategies:[{key,label,success}] sorted by success, leverage:{label,success}|null,
//       lines:[string] }                                                                       the analogue lines the intake stream prints
//   intakeOptions(s, d, r)                    { letters:[{ref,name,via:'stored'}], clinical:[{ref,name,via:'stored'}] }   stored documents the wizard offers for this case
//   intakeModel(s, d, r, inputs)              D-04 what the wizard shows after step 2.  inputs = { letter, clinical, context }, each of letter/clinical = null | { via:'stored'|'file', name }
//     { ready, reason, sources:[{slot,label,via,name}], case, record:{ title, note, sources, fields:rows, removed:[…], context, contextRemoved },
//       read:{ title, steps:[string] }, appeals:{ title, sample:true, steps:[string] }, pattern, basis }
//   Only a file's NAME is ever passed in: the file itself never leaves the browser and is not read.
import { fmtDate } from '../dates.js';
import * as asam from '../asam.js';
import { client as clientOf, STAGE_LABEL } from '../model.js';
import * as D from './disputes.js';
import { docLabel } from './roster.js';
import { denialRecsFor, textOf } from '../recs.js';
import { atRisk, urgency, payerPattern, INTEL_BASIS } from '../intel.js';

const nth = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const unq = t => String(t || '').replace(/^["“]|["”]$/g, '').trim();
const MISSING_ONE = /\[Evidence missing — verify ([^\]]*)\]/g;
const HAS_MISSING = /\[Evidence missing — verify/;
const dimNum = id => { const m = /-D([1-6])$/.exec(String(id)); return m ? +m[1] : 0; };

// ------------------------------------------------------------------------------------------------ the service, read from the level the request asks for
// The request's own service text still carries the earlier day-treatment wording in older data; the program is the intensive outpatient program, ASAM Level 2.1, H0015.
export function serviceOf(r) {
  const level = asam.requestLevel(r); const lv = asam.levelById(level);
  if (level === '2.1') return { text: 'IOP · H0015', level, code: 'H0015', name: lv.name };
  if (lv) return { text: `${lv.short} · ASAM ${lv.id}`, level, code: null, name: lv.name };
  return { text: 'Service not recorded', level: null, code: null, name: '' };
}

// ------------------------------------------------------------------------------------------------ removing identifiers (the "sanitized record")
const ID_PATTERNS = [
  [/\b(?:member|subscriber|group|policy|medicaid|mrn|id)\s*(?:id|number|no\.?|#)?\s*[:#]?\s*(?=[A-Z0-9-]*\d)[A-Z0-9][A-Z0-9-]{4,}\b/gi, '[removed]'],
  [/\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, '[removed]'],
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[removed]'],
  [/\b\d{3}-\d{2}-\d{4}\b/g, '[removed]'],
  [/\b(dob|date of birth|born)\s*[:]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi, '[removed]'],
  [/\b\d{6,}\b/g, '[removed]']
];
// scrubIdentifiers(text, s, clientId) -> { text, removed }  The names of the client and of the family member on file are removed as well.
export function scrubIdentifiers(text, s = null, clientId = '') {
  let out = String(text == null ? '' : text); let removed = 0;
  for (const [rx, to] of ID_PATTERNS) out = out.replace(rx, () => { removed++; return to; });
  const c = s && clientId ? clientOf(s, clientId) : null;
  if (c) {
    const names = [c.first_name, c.last_name, ...String((c.guardian && c.guardian.name) || '').split(/\s+/)].map(x => String(x || '').trim()).filter(x => x.length >= 3);
    for (const n of new Set(names)) out = out.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), () => { removed++; return '[client]'; });
  }
  return { text: out.replace(/\s{2,}/g, ' ').trim(), removed };
}

// ------------------------------------------------------------------------------------------------ evidence rows ready for a chip
export function evidenceItems(idx, ids) {
  return [...new Set(ids || [])].map(id => D.evidenceById(idx, id)).filter(Boolean).map(it => ({ id: it.id, ...D.chipOpts(it), dim: it.dim, usable: it.usable }));
}

// ------------------------------------------------------------------------------------------------ D-06 the decision details
function unitsLine(u, d) {
  if (d.issue === 'info') return null;
  if (d.issue === 'denial') return `0 of ${u.requested} units approved`;
  return u.current != null ? `${u.current} of ${u.requested} units ${u.offered != null ? 'offered' : 'approved'}` : `${u.requested} units requested`;
}
// the payer's stated words, each with its stored source; a call remark that records no reason ("The payer's reason was not recorded") is not a reason
const statedReasons = d => (d.concerns || []).filter(x => x && x.text && !/not recorded/i.test(x.text)).map(x => ({ text: unq(x.text), source: x.source || '', date: x.date || '' }));
const NO_REASON = "No reason on file. Read the payer's notice and add it before replying.";

export function denialFields(s, d, r, { clinical = true } = {}) {
  const pf = D.payerFirst(s, r.payer); const u = D.unitsView(s, d, r); const c = clientOf(s, r.client); const svc = serviceOf(r); const risk = atRisk(s, r);
  const dn = D.decisionView(s, d, r); const items = statedReasons(d);
  const approved = d.issue === 'info' ? { units: null, kind: 'none', text: 'Not decided yet' }
    : d.issue === 'denial' ? { units: 0, kind: 'approved', text: '0 units approved' }
      : { units: u.current, kind: u.offered != null ? 'offered' : 'approved', text: u.current != null ? `${u.current} units ${u.offered != null ? 'offered' : 'approved'}` : 'Not recorded' };
  const label = d.issue === 'info' ? 'Information requested' : d.issue === 'denial' ? 'Denied' : 'Partial approval';
  const asked = (d.concerns || []).length;
  const text = d.issue === 'info' ? `Information requested · ${nth(asked, 'item', 'items')} asked` : `${label} · ${unitsLine(u, d)}`;
  const detail = [dn.date ? `Decided ${fmtDate(dn.date)}` : '', dn.via || ''].filter(Boolean).join(' · ');
  const decision = { kind: d.issue, label, text, stage: STAGE_LABEL[r.stage] || r.stage, date: dn.date, via: dn.via, detail };
  const rationale = !clinical ? null : d.issue === 'info'
    ? { recorded: asked > 0, text: asked ? `${pf} asked for ${nth(asked, 'item', 'items')}.` : NO_REASON, items: (d.concerns || []).map(x => ({ text: unq(x.text), source: x.source || '', date: x.date || '' })) }
    : { recorded: items.length > 0, text: items.length ? items.map(x => x.text).join(' ') : NO_REASON, items };
  const rows = [
    { key: 'from', label: 'From', value: D.payerName(s, r.payer) },
    { key: 're', label: 'Re', value: `${c.initials} · ${svc.name || svc.text} · request ${r.id}` },
    { key: 'service', label: 'Service', value: svc.text },
    { key: 'requested', label: 'Requested', value: `${u.requested} units` },
    { key: 'approved', label: approved.kind === 'offered' ? 'Offered' : 'Approved', value: approved.units != null ? `${approved.units} units` : approved.text },
    { key: 'risk', label: 'Revenue at risk', value: risk ? risk.label.replace(/ at risk$/, '') : 'None' },
    { key: 'decision', label: 'Decision', value: text },
    ...(clinical ? [{ key: 'rationale', label: 'Rationale', value: rationale.text, clinical: true }] : [])
  ];
  return { payer: { id: r.payer, name: D.payerName(s, r.payer), first: pf }, consumer: c.initials, request: r.id, case: d.id, service: svc, requested: { units: u.requested, text: `${u.requested} units` }, approved, risk, due: urgency(s, r), decision, rationale, rows };
}

// ------------------------------------------------------------------------------------------------ D-07 the payer pattern
export function patternView(s, payerId, reason = '') {
  const p = payerPattern(s, payerId); const pf = D.payerFirst(s, payerId);
  const strategies = (p.strategies || []).slice().sort((a, b) => b.success - a.success);
  const leverage = strategies[0] ? { label: strategies[0].label, success: strategies[0].success } : null;
  const lines = [
    `Looking up ${pf} appeals for the same level of care`,
    reason ? `Filtering by the stated reason: “${reason.length > 90 ? reason.slice(0, 89).trimEnd() + '…' : reason}”` : 'No stated reason on file, so every reason is included',
    `Found ${p.analogous} analogous cases · ${p.reversedPct}% reversed on first-level appeal (sample)`,
    `Peer-to-peer: about ${p.p2pOverturnPct}% overturned (sample)`,
    ...(leverage ? [`Strongest leverage: ${leverage.label} · ${leverage.success}% (sample)`] : []),
    ...(p.tends ? [`What ${pf} tends to ask: ${p.tends}`] : []),
    ...(p.works ? [`What has worked with ${pf}: ${p.works}`] : [])
  ];
  return { payer: payerId, name: p.name, first: pf, tends: p.tends, works: p.works, partialRate: p.partialRate, approvalPct: p.approvalPct, sample: true, basis: INTEL_BASIS, analogous: p.analogous, reversedPct: p.reversedPct, p2pOverturnPct: p.p2pOverturnPct, note: p.note, strategies, leverage, lines };
}

// ------------------------------------------------------------------------------------------------ D-05 the appeal analysis
const missingLine = label => `Nothing on file for ${String(label || '').replace(/^D\d:\s*/, '')}. Add it before replying.`;
const plainMissing = t => String(t || '').replace(MISSING_ONE, (m, what) => missingLine(what)).replace(/\s+/g, ' ').trim();

// critical = the stored record answers the payer on two or more dimensions, or a reassessment or incident gap; strong = one dimension or one missing record
const META_KEYS = k => k === 'x-held' || k === 'x-seed' || k === 'x-rule' || /-w$/.test(k);
const timeGap = k => k === 'a-due' || /^a-evt-/.test(k);

export function appealAnalysis(s, d, r, { idx = null, recs = null } = {}) {
  const X = idx || D.evidenceIndex(s, d, r, { read: true }); const pf = D.payerFirst(s, r.payer); const c = clientOf(s, r.client);
  const fields = denialFields(s, d, r); const a = X.assessment; const lvl = asam.requestLevel(r); const ck = asam.levelCheck(a, lvl);
  const items = statedReasons(d);
  // 1. the payer's reason, in the payer's own stored words
  const verb = d.issue === 'denial' ? `${pf} denied the request` : d.issue === 'info' ? `${pf} asked for more information` : `${pf} offered ${fields.approved.units} of the ${fields.requested.units} units requested`;
  const rationale = { recorded: items.length > 0, quotes: items,
    text: d.issue === 'info' ? (fields.rationale.recorded ? `${verb}. ${nth(fields.rationale.items.length, 'item is', 'items are')} listed below.` : NO_REASON)
      : items.length ? `${verb}, stating: ${items.map(x => `“${x.text}”`).join(' ')}` : NO_REASON };
  if (d.issue === 'info') rationale.quotes = fields.rationale.items;
  // 2. the core clinical synthesis: ratings, level, change, services tried, risk (each sentence from stored records)
  const sentences = []; const add = (key, o) => { const missing = HAS_MISSING.test(o.text) || (o.miss || []).length > 0; sentences.push({ key, text: plainMissing(o.text), ids: [...new Set(o.ids || [])], evidence: evidenceItems(X, o.ids), missing: !!missing }); };
  add('ratings', D.sentenceRatings(X)); add('level', D.sentenceLevel(X, r));
  const prev = asam.priorAssessment(s, r.client);
  if (prev && a) add('change', { text: `Change since ${fmtDate(prev.date, { year: true })}. ${asam.changeText(asam.change(prev, a))}.`, ids: [`EV-ASM-${prev.id}`, `EV-ASM-${a.id}`] });
  add('prior', D.sentencePrior(X)); const cur = D.sentenceCurrent(X); if (cur) add('current', cur);
  const risk = D.sentenceRisk(X); if (risk.ids.length) add('risk', risk);
  if (a) { const du = asam.dueState(s, a, lvl); add('clock', { text: `The latest ratings are ${du.days} day${du.days === 1 ? '' : 's'} old; the reassessment rule is ${du.limit} days at this level.`, ids: [`EV-ASM-${a.id}`] }); }
  const synthesis = { text: sentences.map(x => x.text).join(' '), sentences };
  // 3. why the denial is contestable: one finding per weak point (the meta notes go to caveats)
  const wps = D.weakPoints(s, d, r, X); const miss = new Map(D.missingItems(s, d, r, X).map(n => ['g-' + n.key, n]));
  const findings = []; const caveats = [];
  for (const w of wps) {
    if (META_KEYS(w.k)) { caveats.push({ key: w.k, title: w.title, text: w.text || '', ids: w.ids || [], evidence: evidenceItems(X, w.ids), fix: w.fix }); continue; }
    const dims = [...new Set((w.ids || []).map(dimNum).filter(Boolean))];
    const sev = timeGap(w.k) || (w.kind === 'strong' && dims.length >= 2) ? 'critical' : 'strong';
    const m = miss.get(w.k);
    const text = w.kind === 'gap' ? (m && /^d[1-6]$/.test(m.key) ? `No dated record on file for D${m.dim}. Add one before replying.` : missingLine(m ? m.label : w.title.replace(/^Not documented:\s*/, '')))
      : w.kind === 'clarify' ? (w.k === 'c-none' ? NO_REASON : 'The stored records do not answer this yet. Ask the payer which criterion applied, or add the record before replying.')
        : plainMissing(w.text || '');
    findings.push({ key: w.k, sev, kind: w.kind, title: w.title.replace(/^Not documented:\s*/, 'Not documented · '), text, ids: w.ids || [], evidence: evidenceItems(X, w.ids), fix: w.fix, dims: m && /^d[1-6]$/.test(m.key) ? [m.dim] : dims, lauris: !!w.lauris });
  }
  findings.sort((x, y) => (x.sev === y.sev ? 0 : x.sev === 'critical' ? -1 : 1));
  // 4. all six dimensions, each from its stored rating and the dated records filed under it
  const drivers = new Set((ck.drivers || []).map(x => x.n));
  const rows = asam.DIMS.map(dm => {
    const sd = D.sentenceDim(X, dm.n); const rt = a ? asam.ratingOf(a, dm.n) : null;
    const needsRecord = sd.miss.length > 0;
    const text = sd.text.replace(MISSING_ONE, '').replace(/\s+/g, ' ').trim() + (needsRecord ? ` No dated record on file for ${dm.short}. Add one before replying.` : '');
    return { n: dm.n, short: dm.short, label: dm.label, name: dm.name, rating: rt, ratingLabel: asam.ratingLabel(rt), date: a ? a.date : null, text, ids: sd.ids, evidence: evidenceItems(X, sd.ids), driver: drivers.has(dm.n), needsRecord, need: sd.miss.map(x => x.replace(/^D\d:\s*/, '')) };
  });
  const rated = rows.filter(x => x.rating != null).length; const mod = rows.filter(x => x.rating != null && x.rating >= 2).length; const gaps = rows.filter(x => x.needsRecord).length;
  const dimensions = { assessed: a ? a.date : null, heading: a ? `Six ASAM dimensions, rated ${fmtDate(a.date, { year: true })}` : 'Six ASAM dimensions: no assessment on file', rated, moderateOrHigher: mod, withoutRecord: gaps,
    summary: a ? `${rated} of 6 rated · ${mod} rated Moderate or higher · ${gaps === 0 ? 'every dimension that needs a dated record has one' : nth(gaps, 'dimension needs', 'dimensions need') + ' a dated record'}` : 'Complete the ASAM assessment before replying', rows };
  // 5. what Psyflo would do: the numbered denial suggestions
  const list = recs || denialRecsFor(s, d, r, X);
  const actions = list.map((rec, i) => ({ n: i + 1, key: rec.key, title: rec.title, why: rec.why, impact: rec.impact, dim: rec.dim, evidence: evidenceItems(X, rec.evidence), state: rec.state, needsInput: rec.needsInput, text: textOf(rec), outcome: rec.outcome, rec }));
  return { fields, header: { consumer: c.initials, payer: fields.payer, request: r.id, due: fields.due }, rationale, synthesis, findings, caveats, dimensions, actions, pattern: patternView(s, r.payer, items[0] ? items[0].text : '') };
}

// ------------------------------------------------------------------------------------------------ D-04 the intake wizard
const STAMP = { letter: 'Denial letter', clinical: 'Clinical documentation' };
// the stored documents the wizard can offer for the chosen case (a stored reference, never a file's text)
export function intakeOptions(s, d, r) {
  if (!d || !r) return { letters: [], clinical: [] };
  const n = d.notice || {}; const letters = n.doc_ref ? [{ ref: 'notice', name: n.doc_ref, via: 'stored' }] : [];
  const docs = (s.documents || []).filter(x => x.client === r.client && ['done', 'needs_review'].includes(x.status)).map(x => ({ ref: 'doc:' + x.id, name: `${docLabel(x.kind)}${x.done_on ? ' · done ' + fmtDate(x.done_on) : ''}`, via: 'stored' }));
  const asm = asam.assessmentsOf(s, r.client).map(x => ({ ref: 'asm:' + x.id, name: `ASAM ${x.kind === 'initial' ? 'initial assessment' : 'reassessment'} · ${fmtDate(x.date)}`, via: 'stored' }));
  return { letters, clinical: [...asm, ...docs] };
}
const ICD = /^[A-Z]\d{2}(\.\d{1,4})?$/;
export function intakeModel(s, d, r, inputs = {}) {
  const sources = ['letter', 'clinical'].filter(k => inputs && inputs[k] && String(inputs[k].name || '').trim()).map(k => ({ slot: k, label: STAMP[k], via: inputs[k].via === 'file' ? 'file' : 'stored', name: scrubIdentifiers(String(inputs[k].name).slice(0, 120), s, r && r.client).text }));
  const base = { ready: false, reason: '', sources, basis: INTEL_BASIS };
  if (!d || !r) return { ...base, reason: 'Choose which consumer this is for.' };
  if (!sources.length) return { ...base, reason: 'Add a denial letter or clinical documentation to continue.' };
  const X = D.evidenceIndex(s, d, r, { read: true }); const fields = denialFields(s, d, r); const a = X.assessment; const lvl = asam.requestLevel(r); const ck = asam.levelCheck(a, lvl);
  const c = clientOf(s, r.client); const pf = fields.payer.first; const items = statedReasons(d);
  const ctx = scrubIdentifiers(inputs.context || '', s, r.client);
  // the record: initials only, the member number never present
  const record = { title: 'Sanitized clinical record', note: 'Initials only. Member number, names, phone numbers and birth dates removed. The file itself stays in your browser and is not read; the stored record of this consumer is used.',
    sources: sources.map(x => `${x.label.toUpperCase()} · ${x.name}${x.via === 'file' ? ' (file name only)' : ''}`), fields: fields.rows, removed: ['Member number', 'Group number', 'Full name', 'Birth date', 'Phone number', 'Address'],
    context: ctx.text, contextRemoved: ctx.removed };
  // stream 1: reading and digesting the record. Each line says what was read and what it held (counts from stored records only)
  const dated = X.items.filter(e => e.date && !e.fromAssessment && e.kind !== 'assessment').map(e => e.date).sort();
  const groupNotes = (s.notes || []).filter(n => n.client === r.client && n.type === 'daily').length; const otherNotes = (s.notes || []).filter(n => n.client === r.client && n.type !== 'daily').length;
  const useRecs = X.usable.filter(e => e.kind === 'use_episode' && e.current).length; const d5 = a ? asam.ratingOf(a, 5) : null;
  const useLine = !a ? 'Comparing reported use with the clinician\'s rating · no ASAM assessment on file'
    : useRecs > 0 && d5 != null && d5 <= 1 ? `Comparing reported use with the clinician's rating · use is recorded on ${nth(useRecs, 'date', 'dates')} while D5 is rated ${d5}`
      : useRecs === 0 && d5 != null && d5 >= 2 ? `Comparing reported use with the clinician's rating · no dated use record sits behind the D5 rating of ${d5}`
        : `Comparing reported use with the clinician's rating · ${nth(useRecs, 'dated use record', 'dated use records')} and D5 rated ${d5 == null ? 'not at all' : d5}, no difference found`;
  const byDim = asam.DIMS.filter(dm => X.usable.some(e => e.kind === D.DIM_KIND[dm.n] && !e.fromAssessment)).length;
  const meds = X.usable.filter(e => e.kind === 'medical' && /medic/i.test(`${e.label} ${e.quote}`)).length;
  const codes = String(c.diagnosis || '').split(/[,;]/).map(x => x.trim()).filter(Boolean); const okCodes = codes.filter(x => ICD.test(x)); const sud = okCodes.filter(x => /^F1\d/.test(x));
  const read = { title: 'Reading and digesting the record', steps: [
    `Parsing the record structure · ${nth(X.items.length, 'dated record', 'dated records')} on file, ${nth(X.counts.held, 'held back', 'held back')} from drafts`,
    `Reading the denial reason and the treatment timeline · ${items.length ? nth(items.length, 'stated reason', 'stated reasons') : 'no stated reason on file'}${dated.length ? `, records from ${fmtDate(dated[0])} to ${fmtDate(dated[dated.length - 1])}` : ''}`,
    `Scanning group and individual notes · ${nth(groupNotes, 'group note', 'group notes')} and ${nth(otherNotes, 'other note', 'other notes')} on file`,
    useLine,
    `Cross-referencing the six ASAM dimensions · ${a ? `${asam.DIMS.filter(dm => asam.ratingOf(a, dm.n) != null).length} of 6 rated ${fmtDate(a.date)}` : 'no assessment on file'}, ${byDim} with dated records`,
    meds ? `Scanning the medication record · ${nth(meds, 'dated medical record mentions', 'dated medical records mention')} medication` : 'Scanning the medication record · none stored for this client, skipped',
    codes.length ? `Validating diagnoses against ICD-10 · ${nth(codes.length, 'code', 'codes')} on file, ${okCodes.length === codes.length ? 'all in ICD-10 format' : `${codes.length - okCodes.length} not in ICD-10 format`}, ${nth(sud.length, 'code', 'codes')} in the F10 to F19 substance use range (format check only)` : 'Validating diagnoses against ICD-10 · no diagnosis codes on file',
    `Mapping the ratings against the ASAM ${lvl ? 'Level ' + lvl : 'level'} limits used in this demo · ${ck.headline}`
  ] };
  // stream 2: what appeals like this one have looked like (illustrative sample), with the payer's stored behaviour
  const pattern = patternView(s, r.payer, items[0] ? items[0].text : '');
  const appeals = { title: 'Cross-referencing historical appeals', sample: true, steps: pattern.lines };
  return { ...base, ready: true, reason: '', case: { id: d.id, request: r.id, consumer: c.initials, payer: pf }, record, read, appeals, pattern, fields };
}
