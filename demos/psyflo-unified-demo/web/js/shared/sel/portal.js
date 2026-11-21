// Pure selectors for the family and school portals (E6). Imported by the browser screens, by the server actions and by the tests.
// Everything here reads ONLY what the role projection gives a portal actor (server/psyflo/project.js): one child, plain fields,
// signature-mode and family-link rule rows. Nothing is invented: a missing record is returned as null / 'later', never as a story.
import { signatureMode, rule } from '../rules.js';
import { daysBetween, addDays, fmtDate } from '../dates.js';
import { today as clockToday } from '../clock.js';

// ---------- signatures (rule signature.mode.<doc>, edited in Settings) ----------
// The document type a form belongs to: the same mapping the server uses in consent.sign.
export const docTypeOf = form => /consent/i.test(form) ? 'consent' : /release/i.test(form) ? 'release' : /quarterly/i.test(form) ? 'quarterly' : /appeal/i.test(form) ? 'appeal' : 'enrollment';
// the two signed forms of the enrollment packet; the treatment plan and the quarterly report arrive as portal tasks
export const PACKET_SIGN = ['Consent for services', 'Release of information · school'];
export const isSignForm = name => PACKET_SIGN.includes(name) || /^(Treatment plan|Quarterly report)/.test(name);

export const signedRecord = (s, clientId, form) => (s.consents || []).filter(x => x.client === clientId && x.form === form && x.status === 'signed').at(-1) || null;
// is the guardian being asked to sign this form? (the consent is always part of the packet; an appeal letter is asked once it is ready; the rest need a portal task from staff)
export const signRequested = (s, clientId, form) => form === 'Consent for services' || /^Appeal/i.test(form) || (s.portal_tasks || []).some(t => t.client === clientId && t.form === form && t.status !== 'signed');

// sigState(s, clientId, form) -> { form, doc, mode, rule, signed, requested, state, canSign }
//   state: 'completed' (a signed record exists) · 'remote' (Remote allowed) · 'in_person' (In person required) · 'pending' (policy not yet decided)
//          · 'ready' (Ready to review: the document is there to read, signing is not requested yet)
export function sigState(s, clientId, form) {
  const doc = docTypeOf(form); const mode = signatureMode(s, doc); const signed = signedRecord(s, clientId, form); const requested = signRequested(s, clientId, form);
  const state = signed ? 'completed' : !requested ? 'ready' : mode === 'remote_allowed' ? 'remote' : mode === 'in_person_required' ? 'in_person' : 'pending';
  return { form, doc, mode, rule: rule(s, 'signature.mode.' + doc), signed, requested, state, canSign: state === 'remote' };
}
// the forms the guardian has been asked to sign, signed or not, in packet order
export function signForms(s, clientId) {
  const out = [];
  for (const f of PACKET_SIGN) if (f === 'Consent for services' || signRequested(s, clientId, f) || signedRecord(s, clientId, f)) out.push(f);
  for (const t of (s.portal_tasks || []).filter(t => t.client === clientId)) if (!out.includes(t.form)) out.push(t.form);
  for (const c of (s.consents || []).filter(x => x.client === clientId && x.status === 'signed')) if (!out.includes(c.form)) out.push(c.form);
  return out.map(f => sigState(s, clientId, f));
}

// ---------- the enrollment packet ----------
export function packet(s, clientId) {
  const rec = (s.enrollment || {})[clientId] || {};
  const items = (s.enrollment_packet || []).map(name => {
    const sg = signedRecord(s, clientId, name); const r = rec[name];
    return { name, sign: PACKET_SIGN.includes(name), done: !!(sg || r), at: (sg && sg.signed_at) || (r && r.at) || null, file: (sg && sg.file) || null, data: (r && r.data) || null };
  });
  return { items, done: items.filter(i => i.done).length, total: items.length };
}

// ---------- calls and visits the family has to book or confirm ----------
export function bookingState(s, c, ref) {
  // the guardian's projection carries the referral (stage, screening {who, when}) but not the clinicians' screenings list: read the booking from the referral
  const listed = ref && (s.screenings || []).find(x => x.referral === ref.id && x.status === 'booked');
  const sc = listed || (ref && ref.stage === 'screening_booked' && ref.screening && ref.screening.when ? { who: ref.screening.who, when: ref.screening.when } : null);
  const done = (ref && (s.screenings || []).find(x => x.referral === ref.id && x.status === 'done')) || (ref && ['in_intake', 'in_service', 'grant_program', 'declined'].includes(ref.stage));
  if (c && c.intake && c.intake.when) return { kind: 'intake', booked: c.intake, when: c.intake.when, who: c.intake.who };
  if (c && c.intake_offer) return { kind: 'intake', offered: c.intake_offer };
  if (sc && !done) return { kind: 'screening', booked: sc, when: sc.when, who: sc.who };
  if (ref && ref.screening_offer && !done) return { kind: 'screening', offered: ref.screening_offer };
  return null;
}

// ---------- appeal letters (guardian side): Draft · Ready to review · Signed · Submitted by staff ----------
// The letter is prepared by staff in Denial Intelligence and mirrored to appeal_drafts[requestId] = { en, es, attached, attached_es,
// status: 'draft' | 'ready', prepared_by, prepared_at }. A row with text and no status (the old seed shape) counts as ready.
// Signed and submitted come from the request itself (request.appealSign sets request.appeal.signed_at, request.appealSend sets sent_at).
export function appealView(s, r) {
  if (!r) return null;
  const d = (s.appeal_drafts || {})[r.id] || null;
  const sent = !!(r.appeal && r.appeal.sent_at) || r.stage === 'appeal_sent';
  const signed = !!(r.appeal && r.appeal.signed_at);
  const hasText = !!(d && (d.en || d.es));
  const status = sent ? 'submitted' : signed ? 'signed' : (d && d.status === 'draft') || !hasText ? 'draft' : 'ready';
  return { id: r.id, status, draft: d, hasLetter: hasText, signedAt: r.appeal && r.appeal.signed_at || null, sentAt: r.appeal && r.appeal.sent_at || null, file: r.appeal && r.appeal.file || null, deadline: appealDate(s, r) };
}
export const APPEAL_STEPS = ['draft', 'ready', 'signed', 'submitted'];
// The date the appeal window closes, with where the date came from. A date on the record wins; otherwise it is the notice date plus the
// configured window, only when the rules table gives that row to this portal. No row: no number is invented (the screen says "check your letter").
export function appealDate(s, r) {
  const t = clockToday(s); const row = rule(s, 'appeal.window_days');
  let date = r.appeal_deadline || null; let basis = date ? 'record' : null;
  if (!date && !row.missing && row.value != null && (r.notice_date || r.denied_on)) { date = addDays(r.notice_date || r.denied_on, row.value); basis = 'rule'; }
  return { date, basis, daysLeft: date ? daysBetween(t, date) : null, rule: row, notice: r.notice_date || r.denied_on || null };
}

// ---------- the family checklist ----------
// item states: 'done' · 'todo' · 'waiting' (nothing for the guardian to do right now: in person, or Harvest is deciding) · 'later' (not available yet) · 'view' (information)
// "N of M done" counts done, todo and waiting items only.
export function checklist(s, ctx) {
  const c = ctx.client; const fl = ctx.fl; const ref = ctx.ref; const id = c.id;
  const items = [];
  const submitted = !!(fl && fl.submitted_at);
  const step = k => submitted || !!(fl && fl.steps && fl.steps[k]);
  items.push({ key: 'contact', route: 'FamilyLink', state: fl ? (step('guardian') ? 'done' : 'todo') : 'later', at: fl && fl.submitted_at });
  items.push({ key: 'insurance', route: 'FamilyLink', state: fl ? (step('insurance') ? 'done' : 'todo') : 'later', at: fl && fl.submitted_at });
  const pk = packet(s, id); const paper = pk.items.filter(i => !i.sign);
  items.push({ key: 'paperwork', route: 'ParentEnroll', state: !paper.length || paper.every(i => i.done) ? 'done' : 'todo', done: paper.filter(i => i.done).length, total: paper.length });
  const forms = signForms(s, id);
  const open = forms.filter(f => f.state !== 'completed' && f.state !== 'ready');
  const todo = open.filter(f => f.state === 'remote'), waiting = open.filter(f => f.state !== 'remote');
  items.push({ key: 'sign', route: 'ParentSign', state: !open.length ? (forms.length ? 'done' : 'later') : todo.length ? 'todo' : 'waiting', forms, open, todo, waiting, first: (todo[0] || waiting[0] || {}).form || null });
  const bs = bookingState(s, c, ref);
  const tomorrow = addDays(clockToday(s), 1);
  const confirmNeeded = !!(bs && bs.kind === 'intake' && bs.booked && bs.when && bs.when.slice(0, 10) === tomorrow && bs.booked.confirmed == null);
  items.push({ key: 'appointment', route: 'ParentSchedule', state: !bs ? 'later' : bs.offered ? 'todo' : confirmNeeded ? 'todo' : 'done', booking: bs, confirmNeeded });
  const started = !!(c.service_start && !['referral', 'intake'].includes(c.stage) && ((c.goals || []).length || (s.parent_progress || {})[id]));
  items.push({ key: 'progress', route: 'ParentProgress', state: started ? 'view' : 'later' });
  const mine = (s.checkins || []).filter(x => x.client === id && x.role === 'guardian').sort((a, b) => ((a.at || a.week_of) < (b.at || b.week_of) ? -1 : 1));
  items.push({ key: 'checkin', route: 'ParentSurvey', state: mine.length ? 'done' : 'todo', last: mine.length ? (mine.at(-1).at || mine.at(-1).week_of) : null });
  const reqs = (s.requests || []).filter(r => r.client === id);
  const appeal = reqs.map(r => ({ r, a: appealView(s, r) })).find(x => x.r.stage === 'denied' && x.a);
  const lettersState = appeal && appeal.a.status === 'ready' ? 'todo' : reqs.some(r => ['draft_ready', 'needs_approval', 'awaiting_signature', 'signed', 'sending', 'portal_open', 'submitted', 'overdue', 'info_requested', 'partial_decide', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'denied', 'appeal_sent', 'active'].includes(r.stage)) ? 'view' : 'later';
  items.push({ key: 'letters', route: appeal && appeal.a.status === 'ready' ? 'AppealLetter' : 'ParentLetters', state: lettersState, appealId: appeal ? appeal.r.id : null, count: reqs.length });
  const counted = items.filter(i => ['done', 'todo', 'waiting'].includes(i.state));
  return { items, done: counted.filter(i => i.state === 'done').length, total: counted.length, next: items.find(i => i.state === 'todo') || null };
}

// ---------- school portal ----------
const ATT_LABEL = { behaviour_report: 'Behaviour report', attendance_log: 'Attendance log', schedule_and_grades: 'Schedule and grades' };
export const ATTACHMENTS = ATT_LABEL;
// Status in plain words for the school: where the referral stands, never why. No clinical content, no insurance, no service line.
export function referralStatus(s, r) {
  if (!r) return '';
  const fl = r.family_link || {};
  switch (r.stage) {
    case 'draft': return 'Draft · not sent yet';
    case 'needs_screening': return fl.submitted ? 'The family answered · screening call next' : fl.sent ? 'Harvest texted the family' : 'Harvest is contacting the family';
    case 'waiting_on_school': return 'Harvest needs an attachment from you';
    case 'screening_booked': return 'Screening call booked' + (r.screening && r.screening.when ? ' · ' + fmtDate(r.screening.when) : '');
    case 'in_intake': return 'Intake under way';
    case 'in_service': return 'Started TDT';
    case 'grant_program': return 'Routed to the grant program';
    case 'declined': return 'Family declined services';
    default: return String(r.stage || '').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  }
}
// What Harvest still needs from the school: attachments missing on a referral the school sent, a referral waiting on the school.
// Only the school's own students; a seeded referral without a form says only what the record says (its `next` text).
export function schoolNeeds(s, school) {
  const out = [];
  for (const r of (s.referrals || []).filter(x => x.school === school && x.stage !== 'draft')) {
    const att = r.form && r.form.attachments;
    const missing = att ? Object.keys(ATT_LABEL).filter(k => !att[k]) : [];
    if (missing.length) out.push({ id: r.id, client: r.client, kind: 'attachments', missing: missing.map(k => ({ key: k, label: ATT_LABEL[k] })), text: missing.map(k => ATT_LABEL[k]).join(', ') });
    else if (r.stage === 'waiting_on_school') out.push({ id: r.id, client: r.client, kind: 'waiting', missing: [], text: r.next || 'Harvest needs something from you' });
  }
  return out;
}
export const schoolDrafts = (s, school) => (s.referrals || []).filter(x => x.school === school && x.stage === 'draft');
