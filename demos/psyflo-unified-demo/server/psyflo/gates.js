// Server-side invariants shared by the action files (review/05 section 12): refusals, the signer roster, write-once helpers.
// A Refusal is an expected "no": the store rolls the action back, writes an audit event ("Refused · ...") and returns 409
// (or the status given). Nothing here trusts a caller-supplied name.

export class Refusal extends Error {
  constructor(message, { status = 409, record = null, audit = true, code = 'refused' } = {}) {
    super(message); this.name = 'Refusal'; this.status = status; this.record = record; this.audit = audit; this.code = code;
  }
}
export const refuse = (message, opts) => { throw new Refusal(message, opts); };

// Credentials that may attest (sign) an SRA in Lauris: LMHP-type (rule signature.sra.roster, OFFICIAL-VERIFIED).
// LPC, LCSW, LMFT, LCP and the LMHP titles are LMHP-types; QMHP-C/E/T and blanks are not.
const LMHP_RE = /^(LMHP|LMHP-R|LMHP-S|LMHP-RP|LPC|LCSW|LMFT|LCP|LSATP|LPC-R|LCSW-R)\b/i;
export const isLmhpCredential = cred => LMHP_RE.test(String(cred || '').trim());

const norm = x => String(x || '').trim().toLowerCase();
// Lauris user label ("J. Perez, LPC", "C. Diaz", "K. Hale") -> a Psyflo staff record, or null. NEVER a default.
export function staffFromLauris(s, label) {
  const l = norm(String(label || '').split(',')[0]);
  if (!l) return null;
  return (s.staff || []).find(x => {
    const parts = x.name.split(/\s+/); const short = norm(parts[0][0] + '. ' + parts.slice(-1)[0]);
    return norm(x.name) === l || short === l;
  }) || null;
}

export const byId = (arr, id) => (arr || []).find(x => x.id === id);

// Is the person a member of the caseload? (direct support: clients whose c.staff is them; supervisor: their reviewees' clients)
export function caseloadOf(s, user) {
  if (!user) return [];
  if (user.role === 'direct_support') return (s.clients || []).filter(c => c.staff === user.id).map(c => c.id);
  if (user.role === 'supervisor') {
    const reviewees = (s.staff || []).filter(x => x.reviewer === user.id).map(x => x.id);
    return (s.clients || []).filter(c => reviewees.includes(c.staff) || c.staff === user.id).map(c => c.id);
  }
  if (user.role === 'clinician') return (s.clients || []).map(c => c.id); // clinicians carry the whole TDT caseload in this demo
  return [];
}

// Document reference required to record a payer decision (letter, fax, portal reference): at least 3 characters, not "demo".
export function needDocRef(ref, what = 'the payer decision') {
  const r = String(ref || '').trim();
  if (r.length < 3) refuse(`Enter the document reference for ${what} (the letter, fax or portal reference). A decision is recorded only with its document.`, { code: 'doc_ref_required', status: 422 });
  return r;
}

export const isInt = (n, min = 0, max = 100000) => Number.isInteger(n) && n >= min && n <= max;
export function needUnits(n, { min = 0, max = 100000, what = 'Units' } = {}) {
  const v = typeof n === 'string' && /^-?\d+$/.test(n.trim()) ? parseInt(n, 10) : n;
  if (!isInt(v, min, max)) refuse(`${what} must be a whole number from ${min} to ${max}.`, { code: 'bad_units', status: 422, audit: false });
  return v;
}

// ---- family-link expiry (rule family_link.expires_days, enforced on links the guardian has not submitted) ----
import { ruleValue } from '../../web/js/shared/rules.js';
import { today as clockToday } from '../../web/js/shared/clock.js';
import { addDays } from '../../web/js/shared/dates.js';
export function linkExpired(s, fl) {
  if (!fl || fl.submitted_at || !fl.sent_at) return false;
  const days = ruleValue(s, 'family_link.expires_days', null);
  if (days == null) return false;
  return clockToday(s) > addDays(fl.sent_at.slice(0, 10), days);
}

// ---- seeded randomness for tests (DEMO_TEST=1): fax references and link tokens repeat from a fixture or preset id ----
let seedState = 1;
export function seedRng(key) { let h = 2166136261; for (const c of String(key)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } seedState = (h >>> 0) || 1; }
export function rand() {
  if (process.env.DEMO_TEST !== '1') return Math.random();
  seedState ^= seedState << 13; seedState >>>= 0; seedState ^= seedState >>> 17; seedState ^= seedState << 5; seedState >>>= 0;
  return seedState / 4294967296;
}
