// Per-action authority table (review/05 section 5 and 12). EVERY action has an entry; an action with no entry is refused
// (fail closed). The actor comes from the session (session.js), never from args.by / staff / signer / who.
//
// Entry shapes
//   { any: ['cap', ...], scope?: (s, args, actor) => ctx }   staff (or portal) actor must hold at least one cap (can() with ctx)
//   { portalToken: true }                                    callable with a valid family-link token in args.token (no session needed)
//   { bridge: true }                                         the page bridge (extension / in-page) reports it; validated by attestation
//   { internal: true }                                       never callable through /api/do (only by another action)
//   { check: (s, args, actor, store) => void }               extra invariant, runs after the cap check
// Other engineers: add entries from your action file with `export const authz = { 'your.action': { any: ['cap'] } }`
// (server/index.js merges it) or call registerAuthz(). A new action without an entry is refused with 403.
import { can } from '../../web/js/shared/permissions.js';
import { Refusal, linkExpired } from './gates.js';

export const AUTHZ = {};
export function registerAuthz(table) { Object.assign(AUTHZ, table); }

const byId = (arr, id) => (arr || []).find(x => x.id === id);
const client = args => ({ clientId: args.client });
const own = (what = 'client') => (s, a) => ({ clientId: a[what] });

// guardian actors may touch only their own child; school actors only their own school's students/referrals
function guardianOwns(actor, clientId) { return actor && actor.kind === 'guardian' && actor.client === clientId; }

registerAuthz({
  // ---------- demo controls (presenter mode only) ----------
  'demo.reset': { any: ['demo.controls'] },
  'demo.advanceDay': { any: ['demo.controls'] },
  'demo.scenario': { any: ['demo.controls'] },
  'request.demoReply': { any: ['demo.controls'] },

  // ---------- referrals (school portal -> Psyflo -> clinician) ----------
  'referral.create': { any: ['school.referral'], check: (s, args, actor) => { if (args.form && args.form.school && actor.school && args.form.school !== actor.school) throw new Refusal('A school user can refer only students from their own school.', { status: 403 }); } },
  'referral.update': { any: ['school.referral', 'referrals'], check: schoolOwnsReferral },
  'referral.attach': { any: ['school.referral', 'referrals'], check: schoolOwnsReferral },
  'referral.scheduleScreening': { any: ['referrals'] },
  'referral.routeGrant': { any: ['referrals'] },
  'referral.stage': { any: ['referrals'] },
  'referral.scheduleAndText': { any: ['referrals'] },
  'referral.routeAndNotify': { any: ['referrals'] },
  'referral.hold': { any: ['referrals'] },
  'referral.unhold': { any: ['referrals'] },
  'referral.inLauris': { any: ['referrals'] },
  'screening.offer': { any: ['referrals'] },
  'intake.offer': { any: ['referrals'] },

  // ---------- family link and the guardian portal ----------
  'familyLink.send': { any: ['referrals'] },
  'familyLink.open': { portalToken: true },
  'familyLink.step': { portalToken: true },
  'familyLink.submit': { portalToken: true },
  'eligibility.record': { any: ['eligibility.run'] },
  'eligibility.recordProof': { any: ['eligibility.run'] },
  'consent.sign': { any: ['guardian.sign'], scope: own(), check: guardianCheck },
  'enroll.save': { any: ['portal.guardian'], scope: own(), check: guardianCheck },
  'screening.bookByFamily': { any: ['portal.guardian'], check: (s, a, actor) => { const r = byId(s.referrals, a.referral); if (r && !guardianOwns(actor, r.client)) throw new Refusal('This booking is not for your child.', { status: 403 }); } },
  'intake.book': { any: ['portal.guardian'], scope: own(), check: guardianCheck },
  'intake.ride': { any: ['portal.guardian'], scope: own(), check: guardianCheck },
  'intake.confirm': { any: ['portal.guardian'], scope: own(), check: guardianCheck },
  'checkin.save': { any: ['guardian.progress', 'school.referral'], check: (s, a, actor) => { if (actor.kind === 'guardian' && !guardianOwns(actor, a.client)) throw new Refusal('That check-in is not for your child.', { status: 403 }); if (actor.kind === 'school' && !schoolOwnsClient(s, actor, a.client)) throw new Refusal('That student is not at your school.', { status: 403 }); } },
  'portalTask.create': { any: ['drafts.clinical'] },
  'request.appealSign': { any: ['appeal.sign'], check: (s, a, actor) => { const r = byId(s.requests, a.id); if (!r || !guardianOwns(actor, r.client)) throw new Refusal('This appeal letter is not for your child.', { status: 403 }); } },
  'school.share': { any: ['school.referral'], check: (s, a, actor) => { if (!schoolOwnsClient(s, actor, a.client)) throw new Refusal('That student is not at your school.', { status: 403 }); } },
  'school.shareUsed': { any: ['notes.own'] },

  // ---------- requests: drafting, approval, signature (observed), send ----------
  'request.ensure': { any: ['drafts.clinical'] },
  'request.approve': { any: ['approve.sra'] },
  'request.processed': { internal: true },
  'request.signed': { internal: true },
  'request.portalConfirmed': { internal: true },
  'request.send': { any: ['send.packet'] },
  'request.resend': { any: ['send.packet'] },
  'request.overdueNotice': { any: ['send.packet'] },
  'request.receiptCheck': { any: ['send.packet'] },
  'request.appealSend': { any: ['send.packet'] },
  'request.pdfCopy': { any: ['authorizations'] },
  'request.close': { any: ['payer.reply'] },
  'request.set': { internal: true },                    // generic patch removed (RE-4): typed actions only
  'plan.set': { any: ['payer.reply'] },

  // ---------- payer replies and decisions ----------
  'request.partialDecide': { any: ['payer.reply'] },
  'request.partialChoice': { any: ['payer.reply'] },
  'request.infoReply': { any: ['payer.reply'] },
  'request.infoSend': { any: ['payer.reply'] },
  'request.p2pSchedule': { any: ['payer.reply'] },
  'request.p2pRecording': { any: ['payer.reply'] },
  'request.p2pOutcome': { any: ['payer.decision'] },
  'request.p2pLog': { any: ['payer.reply'] },            // 'awaiting' is a call held; final outcomes also need payer.decision (checked in the action)

  // ---------- notes, time, dictation (own caseload) ----------
  'timer.start': { any: ['trackTime'], scope: own(), check: (s, a, actor) => { if (a.staff && a.staff !== actor.id) throw new Refusal('A timer belongs to the person who started it.', { status: 403 }); } },
  'timer.stop': { any: ['trackTime'] },
  'dictation.save': { any: ['notes.own'], scope: own() },
  'dictation.used': { any: ['notes.own'] },
  'dictation.discard': { any: ['notes.own'] },
  'dictation.annotate': { any: ['notes.own'] },
  'assessment.save': { any: ['notes.own'], scope: own() },
  'assessment.used': { any: ['notes.own'] },
  'panel.dictation': { any: ['notes.own'], scope: own() },
  'panel.feedback': { any: ['notes.own', 'drafts.clinical'] },
  'panel.filled': { any: ['notes.own', 'drafts.clinical'] },
  'note.processed': { internal: true },
  'note.review': { any: ['notes.review'] },
  'screening.done': { any: ['drafts.clinical'] },
  'screening.drafted': { any: ['drafts.clinical'] },
  'draft.save': { any: ['drafts.clinical'] },
  'quarterly.internalSave': { any: ['drafts.clinical'] },
  'client.update': { any: ['drafts.clinical'] },
  'lauris.event': { internal: true },
  'incident.filePortal': { any: ['notes.review', 'drafts.clinical'] },
  'incident.save': { any: ['notes.own'] },
  'staff.reviewMode': { any: ['notes.review'] },
  'compliance.qiCheck': { any: ['notes.review'] },
  'reminder.done': { any: ['myWork'] },
  'file.pdf': { any: ['myWork'] },

  // ---------- the page bridge (extension / in-page): no session, validated by attestation ----------
  'lauris.observed': { bridge: true },
  'lauris.savedVersion': { bridge: true },
  'portal.observed': { bridge: true },

  // ---------- administration ----------
  'user.add': { any: ['admin.users'] },
  'user.update': { any: ['admin.users', 'demo.controls'], check: (s, a, actor) => { if (a.patch && ('role' in a.patch || 'designations' in a.patch) && !can(actor, 'demo.controls')) throw new Refusal('Changing a role needs presenter mode; designations go through user.designate (two people).', { status: 403 }); } },
  'user.designate': { any: ['admin.users'] },
  'user.designateApprove': { any: ['admin.users', 'drafts.clinical'] },
  'settings.set': { any: ['admin.settings'] },
  'settings.rule': { any: ['admin.settings'] },
  'library.add': { any: ['admin.settings'] },
  'migration.rerun': { any: ['admin.settings'] }
});

function schoolOwnsClient(s, actor, clientId) {
  if (!actor || actor.kind !== 'school') return false;
  const c = byId(s.clients, clientId);
  if (c) return c.school === actor.school;
  const r = (s.referrals || []).find(x => x.client === clientId); // free-text referral students
  return !!r && r.school === actor.school;
}
function schoolOwnsReferral(s, args, actor) {
  if (actor.kind !== 'school') return;
  const r = byId(s.referrals, args.id);
  if (!r || r.school !== actor.school) throw new Refusal('That referral is not from your school.', { status: 403 });
}
function guardianCheck(s, args, actor) {
  if (!actor || actor.kind !== 'guardian' || actor.client !== args.client) throw new Refusal('This page is for a different child. Open the link Harvest texted you.', { status: 403 });
  const fl = (s.family_links || []).find(f => f.token === actor.linkToken);
  if (fl && linkExpired(s, fl)) throw new Refusal('This link has expired. Ask Harvest for a new one.', { status: 401 });
}

export class Denied extends Error { constructor(status, message) { super(message); this.status = status; } }

// authorize(s, name, args, actor, store) -> ctx  (throws Denied for 401/403, Refusal for invariant breaks)
// `via`: 'http' for /api/do, 'internal' for a call from another action (always allowed).
export function authorize(s, name, args, actor, via = 'http') {
  const e = AUTHZ[name];
  if (via === 'internal') return { actor };
  if (!e) throw new Denied(403, `No capability is declared for ${name}; it is refused.`);
  if (e.internal) throw new Denied(403, `${name} cannot be called directly: it is set only by an observed page event or another action.`);
  if (e.bridge) return { actor: actor || { kind: 'bridge', id: 'bridge', role: null }, bridge: true };
  if (e.portalToken) {
    const t = args && args.token;
    const fl = t && (s.family_links || []).find(f => f.token === t);
    if (!fl) throw new Denied(401, 'This link is not valid any more.');
    if (actor && actor.kind === 'guardian' && actor.linkToken && actor.linkToken !== t) throw new Denied(403, 'This link belongs to another family.');
    if (linkExpired(s, fl)) throw new Denied(401, 'This link has expired. Ask Harvest for a new one.');
    return { actor: actor && actor.kind === 'guardian' ? actor : { kind: 'guardian', id: 'guardian:' + fl.client, role: 'guardian', client: fl.client, linkToken: t, name: (fl.answers && fl.answers.guardian_name) || 'Guardian' }, portalToken: true };
  }
  if (!actor) throw new Denied(401, 'Sign in first.');
  const ctx = e.scope ? e.scope(s, args || {}, actor) : undefined;
  const ok = (e.any || []).some(cap => can(actor, cap, ctx));
  if (!ok) throw new Denied(403, `Your role (${actor.role}) is not allowed to do this${e.any && e.any.length ? ' (needs ' + e.any.join(' or ') + ')' : ''}.`);
  if (e.check) e.check(s, args || {}, actor);
  return { actor, ctx };
}
