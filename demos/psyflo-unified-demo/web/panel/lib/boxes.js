// Box builders shared by the views (E5): the boxes a referral and the family link already answer, the new-consumer boxes, the school
// updates (the counselor's words, credited, never staff observation) and the contact-time rows from the timer.
// Every function takes ctx (views/index.js) and builds from stored records only.
import { fmtDate, fmtTime, clock12 } from '../../js/shared/dates.js';
import { contactTime } from '../../js/shared/draft.js';
import { today as clockToday } from '../../js/shared/clock.js';
import { blocksFor, entriesOf, timeSummary, unionMinutes, unitsFor, fmtMin } from '../../js/shared/time.js';

export const usDate = iso => { const [y, m, d] = String(iso).slice(0, 10).split('-'); return `${m}/${d}/${y}`; };

// ---------- referrals and the family link (Flow A starts here)
// A referral from the school portal is "new" until a person creates the consumer in Lauris. It may point at a Psyflo client (T.W.) or carry only a label ("A.R., 9").
export function refInfo(ctx, r) {
  const s = ctx.S(); const c = s.clients.find(x => x.id === r.client) || null;
  const m = String(r.client || '').match(/^([A-Z]\.[A-Z]\.)(?:,\s*(\d+))?/);
  return { c, initials: c ? c.initials : (m ? m[1] : String(r.client || '')), age: c ? c.age : (m && m[2] ? +m[2] : null), label: ctx.M.clientLabel(s, r.client), inLauris: !!(r.lauris_no || (c && c.lauris_no)) };
}
export const candidateReferrals = ctx => ctx.S().referrals.filter(r => ['needs_screening', 'screening_booked', 'in_intake'].includes(r.stage) && !refInfo(ctx, r).inLauris);
export const newReferrals = ctx => ctx.S().referrals.filter(r => r.stage === 'needs_screening' && !refInfo(ctx, r).inLauris);
export function refKnown(ctx, r) {
  const s = ctx.S(); const M = ctx.M; const fl = M.familyLinkFor(s, r.id); const el = M.eligibilityFor(s, r.id); const a = fl?.answers || {}; const f = r.form || {};
  const k = [`${M.school(s, r.school).name} · received ${fmtDate(r.received)}`];
  if (f.concerns?.length) k.push('Concerns: ' + f.concerns.slice(0, 3).join(', ').toLowerCase() + (f.concerns.length > 3 ? '…' : ''));
  if (f.iep) k.push('IEP on file');
  k.push(fl?.submitted_at ? `Family link submitted ${fmtDate(fl.submitted_at)}${a.guardian_name ? ' · ' + a.guardian_name + (a.relationship ? ' (' + a.relationship + ')' : '') : ''}` : fl?.opened_at ? 'Family link opened · not submitted' : fl?.sent_at ? 'Family link sent · not opened' : 'Family link not sent yet');
  k.push(el?.status === 'recorded' ? `Eligibility: ${M.payerShort(s, el.plan)} · checked ${fmtDate(el.checked_at)}` : 'Eligibility not checked yet');
  return k;
}
export const NEW_SOURCES = [{ n: 1, label: 'Referral form', source: 'Referral form (school portal)' }, { n: 2, label: 'Family link', source: 'Family link answers (guardian)' }, { n: 3, label: 'Psyflo record', source: 'Psyflo student record' }, { n: 4, label: 'You (signed in)', source: 'The signed-in clinician' }];
export function newConsumerBoxes(ctx, r) {
  const s = ctx.S(); const M = ctx.M; const i = refInfo(ctx, r); const sch = M.school(s, r.school || i.c?.school); const a = M.familyLinkFor(s, r.id)?.answers || {};
  const b = [{ label: 'Name', value: i.initials, src: [1] }];
  if (a.dob) b.push({ label: 'Date of birth', value: usDate(a.dob), src: [2] });
  if (sch.locality) b.push({ label: 'Locality', value: sch.locality, src: [1] });
  if (sch.name) b.push({ label: 'School', value: sch.name, src: [1] });
  b.push({ label: 'Program', value: 'TDT', src: [1] });
  const me = ctx.me();
  const cl = i.c?.clinician ? M.staff(s, i.c.clinician) : (me.role === 'clinician' ? me : null);
  if (cl) b.push({ label: 'Clinician', value: `${M.staffShort(s, cl.id)}${cl.credential ? ', ' + cl.credential : ''}`, src: [i.c?.clinician ? 3 : 4] });
  return b;
}
// after Save Consumer: link a label-only referral (no Psyflo client yet) to the new Harvest #
export function referralForConsumer(ctx, no, initials) {
  const s = ctx.S();
  const byNo = s.referrals.find(r => r.lauris_no && r.lauris_no === Number(no)); if (byNo) return byNo;
  let hint = null; try { hint = JSON.parse(localStorage.getItem('psyflo_newref') || 'null'); } catch (e) { }
  if (hint && hint.initials === initials) { const r = s.referrals.find(x => x.id === hint.ref); if (r) return r; }
  return candidateReferrals(ctx).find(r => refInfo(ctx, r).initials === initials) || null;
}

// ---------- the boxes that come from the referral and the family link, typed before the screening call
export const PRE_SOURCES = [{ n: 1, label: 'Referral form', source: 'Referral form (school portal)' }, { n: 2, label: 'Family link', source: 'Family link answers (guardian)' }, { n: 3, label: 'Eligibility (DMAS screenshot)', source: 'Eligibility check, dated screenshot' }];
export function preCallBoxes(ctx, c, ref) {
  const s = ctx.S(); const M = ctx.M; c = c || {}; const r = ref || s.referrals.find(x => x.id === c.referral);
  const fl = r && M.familyLinkFor(s, r.id); const el = r && M.eligibilityFor(s, r.id); const a = fl?.answers || {};
  const b = [];
  if (a.guardian_name || c.guardian?.name) b.push({ label: 'Guardian on the call', value: `${a.guardian_name || c.guardian.name} (${a.relationship || c.guardian?.relationship || 'guardian'})`, src: [a.guardian_name ? 2 : 1] });
  if (a.phone || c.guardian?.phone) b.push({ label: 'Phone', value: a.phone || c.guardian.phone, src: [a.phone ? 2 : 1] });
  if (a.language) b.push({ label: 'Preferred language', value: a.language, src: [2] });
  if (el?.status === 'recorded') b.push({ label: 'Medicaid', value: `${M.payer(s, el.plan).name} · checked ${fmtDate(el.checked_at)}`, src: [3] });
  if (a.medicaid_id) b.push({ label: 'Medicaid ID', value: 'on file (family link)', src: [2] });
  if (r?.form?.iep) b.push({ label: 'IEP', value: 'Yes — copy attached to referral', src: [1] });
  return b;
}

// ---------- updates from school (school portal -> state.shares): the counselor's report, credited; the staffer decides whether it stays
const shareKey = (sh, i) => sh.id || `idx-${i}`;
export function schoolUpdates(ctx, c, { today = true } = {}) {
  const s = ctx.S();
  return (s.shares || []).map((sh, i) => ({ ...sh, key: shareKey(sh, i), used: sh.used || {} }))
    .filter(sh => sh.client === c.id && (!today || String(sh.at || '').slice(0, 10) === ctx.M.today(s)))
    .sort((a, b) => String(a.at) < String(b.at) ? -1 : 1);
}
export function shareWho(ctx, sh) { const u = (ctx.S().school_users || []).find(x => x.id === sh.by); return { name: u ? u.name : (sh.by || 'School'), role: u ? u.role : 'school staff' }; }
export function shareSentence(ctx, sh) { const w = shareWho(ctx, sh); const t = String(sh.text || '').trim().replace(/\s+/g, ' '); return `Per the ${w.role} (${w.name}), reported through the school portal at ${fmtTime(sh.at)}: "${t}"`; }
export const schoolIncluded = (ctx, c, st) => schoolUpdates(ctx, c).filter(sh => !(st.schoolOut || []).includes(sh.key) && ((st.schoolIn || []).includes(sh.key) || sh.used.daily));
export const schoolSentences = (ctx, c, st) => schoolIncluded(ctx, c, st).map(sh => shareSentence(ctx, sh));
const SCHOOL_RELEASE = 'Release of information · school';
export const schoolRelease = (ctx, c) => (ctx.S().consents || []).find(x => x.client === c.id && x.form === SCHOOL_RELEASE && (x.status === 'signed' || x.signed_at));
export const pageRelease = ctx => ((ctx.page?.form?.fields || []).find(f => /^release/i.test(f.label)) || {}).value || '';
export const COLL_SOURCES = [{ n: 1, label: 'School portal', source: 'School portal message' }, { n: 2, label: 'Signed release (parent portal)', source: 'Release of information, parent portal' }];
export function collateralBoxes(ctx, c, sh) {
  const w = shareWho(ctx, sh); const rel = schoolRelease(ctx, c);
  const b = [{ label: 'Date', value: usDate(sh.at), src: [1] }, { label: 'Collateral', value: `${w.name}, ${w.role}`, src: [1] }, { label: 'Method', value: 'School portal message', src: [1] }];
  if (rel && !pageRelease(ctx)) b.push({ label: 'Release on file', value: `School release on file · signed ${fmtDate(rel.signed_at)}`, src: [2] });
  b.push({ label: 'Information shared / received', value: `Received from ${w.name} (${w.role}): ${String(sh.text).trim()}`, src: [1] });
  return b;
}

// ---------- the daily note: timer rows and units (recorded time is not billable time; an unconfirmed block is never counted)
export const DPN_SOURCES = [{ n: 1, label: 'What you said', source: 'Your words' }, { n: 2, label: 'Your timer', source: 'Timer blocks' }, { n: 3, label: 'The plan (ISP 2.0)', source: 'ISP goals and interventions' }, { n: 4, label: 'School counselor · school portal', source: 'School portal' }];
// The ONE model of time (web/js/shared/time.js, actions time.*): the day's saved entries of THIS person with THIS student. A stopped timer nobody described
// yet (a draft) is not a block; a block that is not direct service (idle, transport, documentation ...) is not listed as direct time. Nothing falls back to
// another person, another student or a seeded sample: no signed-in person, no blocks.
const dayOf = ctx => clockToday(ctx.S());
const staffOf = ctx => { const m = ctx.me(); return m && m.id ? m.id : null; };
const dayEntries = (ctx, c) => { const who = staffOf(ctx); return who ? entriesOf(ctx.S(), { client: c.id, date: dayOf(ctx), staff: who }) : []; };
export function timerBlocks(ctx, c) {
  const who = staffOf(ctx); if (!who) return [];
  const notDirect = new Set(dayEntries(ctx, c).filter(e => e.status === 'saved' && (e.kind || 'direct') !== 'direct').map(e => `${e.start}|${e.end}`));
  return blocksFor(ctx.S(), c.id, dayOf(ctx), who).filter(b => !notDirect.has(`${b[0]}|${b[1]}`));
}
// the saved blocks a person has not confirmed yet (direct service by kind): they are listed, never counted, until time.save confirms them
export const unconfirmedEntries = (ctx, c) => dayEntries(ctx, c).filter(e => e.status === 'saved' && !e.confirmed && (e.kind || 'direct') === 'direct');
// stopped timers nobody has described yet (Track Time): recorded, not saved, not counted
export const draftEntries = (ctx, c) => dayEntries(ctx, c).filter(e => e.status === 'draft');
// units if the unconfirmed blocks were confirmed: the same union-of-minutes figure the server would show after time.save {confirm:true}
export function unitsIfConfirmed(ctx, c) {
  const list = dayEntries(ctx, c).filter(e => e.status === 'saved' && (e.kind || 'direct') === 'direct');   // confirmed or not: this is "if they were all confirmed"
  const min = unionMinutes(list); return { minutes: min, units: unitsFor(ctx.S(), 'tdt', min) };
}
export function timerBoxes(ctx, c) {
  const blocks = timerBlocks(ctx, c); if (!blocks.length) return { blocks, ct: null, boxes: [] };
  const s = ctx.S();
  const sum = timeSummary(s, c.id, dayOf(ctx), { staff: staffOf(ctx) });   // confirmed direct minutes (pauses taken out, overlaps counted once) and the rule's units
  const raw = contactTime(blocks, { confirmed: false, s });
  // The note's Contact time lists ONLY confirmed direct blocks (a processed note is write-once, so nothing unconfirmed may be typed into it). The unconfirmed
  // block stays in `ct.rows` (flagged) for the panel's own card; it reaches the form only after the person confirms it (time.save), never before.
  const lines = raw.rows.filter(r => !r.unconfirmed).map(r => `${clock12(r.from)}\u2013${clock12(r.to)} \u00b7 ${r.what}`).join('\n');
  const ct = { ...raw, lines, total: sum.direct, text: fmtMin(sum.direct), units: sum.units };
  return { blocks, ct, boxes: [{ label: 'Contact time', value: ct.lines, src: [2] }, { label: 'Direct time', value: ct.text, src: [2] }, { label: 'Units', value: String(ct.units), src: [2] }] };
}
export const fmtT = hhmm => { let [h, m] = hhmm.split(':').map(Number); h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')}`; };
