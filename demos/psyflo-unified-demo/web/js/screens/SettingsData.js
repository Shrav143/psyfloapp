// Settings: static reference content and small pure helpers (labels, groups, the presenter's decision list).
// Sources: review/00-unified-recommendations.md section 3 (resolutions marked Validate) and 6 (open questions), review/01 section 8 (who answers).
import { CAP_LIST, CAP_NOTE, MATRIX, STAFF_ROLES } from '../shared/permissions.js';

export const TABS = [
  ['people', 'People'], ['roles', 'Roles'], ['units', 'Units'], ['rules', 'Rules'], ['audit', 'Audit'], ['family', 'Family link'], ['presenter', 'Presenter']
];

// ---- permission matrix ------------------------------------------------------------------------------------------------------
export const CAP_GROUPS = [
  ['Notes and review', ['notes.own', 'notes.review', 'notes.view', 'scanEnhance', 'trackTime', 'ext.use']],
  ['Authorizations and payers', ['auth.status', 'authorizations', 'drafts.clinical', 'approve.sra', 'sign.lauris', 'send.packet', 'payer.reply', 'payer.decision', 'denials', 'eligibility.run', 'referrals', 'appeal.prepare']],
  ['Analytics and units', ['analytics.aggregate', 'analytics.drilldown', 'notes.billing']],
  ['Administration', ['myWork', 'admin.settings', 'admin.users', 'demo.controls']],
  ['Portals', ['portal.guardian', 'guardian.progress', 'guardian.sign', 'appeal.sign', 'portal.school', 'school.referral']]
];
export const CELL = {
  Y: { text: 'Yes', tone: 'success', tip: 'Always allowed' },
  A: { text: 'Own', tone: 'info', tip: 'Own caseload, site or records only' },
  D: { text: 'Designated', tone: 'warning', tip: 'Only when an administrator designates the person and a second person confirms' },
  N: { text: 'No', tone: 'neutral', tip: 'Never' }
};
export const capLabel = c => (CAP_NOTE[c] || c).replace(/ \((?:admin: [^)]*|own caseload|designation = [^)]*|presenter mode only|LMHP roster|credential check, LMHP roster)\)/i, '');
export const capRow = cap => Object.fromEntries(Object.keys(MATRIX).map(r => [r, MATRIX[r][cap]]));
// permissions an administrator may designate (a D for a staff role), with the roles they apply to; demo controls are presenter mode, not a designation
export function designatable() {
  return CAP_LIST.filter(c => c !== 'demo.controls' && STAFF_ROLES.some(r => MATRIX[r][c] === 'D')).map(c => ({ cap: c, label: capLabel(c), roles: STAFF_ROLES.filter(r => MATRIX[r][c] === 'D') }));
}

// ---- rules table ------------------------------------------------------------------------------------------------------------
export const AREA = {
  decision: 'Payer decisions', submission: 'Sending', info_request: 'Information requests', info_reply: 'Information requests', initial_sra: 'Initial SRA', form: 'Initial SRA',
  isp: 'Plan (ISP)', notes: 'Notes', review: 'Notes', incident: 'Incidents', tdt: 'Service', units: 'Units', claims: 'Units', continued_stay: 'Continued stay', discharge: 'Discharge',
  early_discharge: 'Discharge', cna: 'Intake', criteria: 'Drafting', drafting: 'Drafting', evidence: 'Drafting', style: 'Drafting', signature: 'Signatures', eligibility: 'Eligibility',
  appeal: 'Appeals', p2p: 'Peer-to-peer', recording: 'Recording', payers: 'Payers', packet: 'Payers', analytics: 'Analytics', family_link: 'Family link', redesign: 'Information only'
};
export const areaOf = key => AREA[String(key).split('.')[0]] || 'Other';
export const CATEGORY_CHIPS = [['OFFICIAL-VERIFIED', 'Officially verified'], ['PAYER-SPECIFIC', 'Payer-specific'], ['HARVEST-REPORTED', 'Harvest-reported'], ['UNVERIFIED-DEMO-ASSUMPTION', 'Unverified']];
// keys shown on the Units tab as "deadlines and clocks"
export const CLOCK_KEYS = ['decision.followup_day', 'decision.overdue_after_days', 'info_request.hours', 'initial_sra.send_within_days', 'isp.due_hours_harvest', 'isp.due_days_official', 'notes.daily_due_hours', 'continued_stay.lead_business_days', 'early_discharge.min_gap_days', 'appeal.window_days', 'eligibility.recheck_days', 'incident.state_portal_hours'];
export const UNIT_KEYS = ['units.tdt.max_per_day', 'units.rate_per_school_day'];

const human = v => String(v).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const listText = v => v.map(x => Array.isArray(x) ? x.join(' → ') : typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' · ');
// "10 days after sending", "On", "Remote allowed", "120 min → 1 unit · 180 → 2 · 300 → 3"
export function showValue(row) {
  const v = row.value;
  if (typeof v === 'boolean') return v ? 'On' : 'Off';
  if (typeof v === 'number') return `${v}${row.unit && !/^(boolean|text|choice)/.test(row.unit) ? ' ' + String(row.unit).replace(/^(\[minutes, units\] bands.*)$/, '').trim() : ''}`.trim();
  if (Array.isArray(v)) { if (v.length && Array.isArray(v[0])) return v.map(([m, u]) => `${m} min → ${u}`).join(' · '); return v.length ? listText(v) : 'None'; }
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${x === '' ? 'none' : x}`).join(' · ');
  if (/^choice/.test(row.unit || '') || /^signature\.mode\./.test(row.key) || row.key === 'initial_sra.start_event') return human(v);
  return v == null ? '—' : String(v);
}
// how a row is edited: number | boolean | choice | text | long | list | json
export function editorKind(row) {
  const d = row.default;
  if (typeof d === 'boolean') return 'boolean';
  if (typeof d === 'number') return 'number';
  if (Array.isArray(d)) return d.length && typeof d[0] !== 'string' ? 'json' : 'list';
  if (d && typeof d === 'object') return 'json';
  if (/^choice:/.test(row.unit || '')) return 'choice';
  return typeof d === 'string' && d.length > 70 ? 'long' : 'text';
}
export const choicesOf = row => String(row.unit || '').replace(/^choice:\s*/, '').split('|').map(x => x.trim()).filter(Boolean);
// parse a form value back to the type of the default; throws a plain message
export function parseValue(row, raw) {
  const k = editorKind(row);
  if (k === 'boolean') return raw === true || raw === 'true';
  if (k === 'number') { const n = Number(raw); if (raw === '' || !Number.isFinite(n) || n < 0) throw new Error('Type a number, zero or more.'); return n; }
  if (k === 'list') return String(raw).split('\n').map(x => x.trim()).filter(Boolean);
  if (k === 'json') { try { return JSON.parse(raw); } catch { throw new Error('That is not valid JSON. For unit bands use [[120, 1], [180, 2], [300, 3]].'); } }
  return String(raw).trim();
}
export const editorText = row => { const k = editorKind(row); return k === 'list' ? (row.value || []).join('\n') : k === 'json' ? JSON.stringify(row.value) : String(row.value ?? ''); };

// ---- family link ------------------------------------------------------------------------------------------------------------
export const DOC_MODES = [
  ['signature.mode.consent', 'Consent for services'], ['signature.mode.release', 'Release of information'], ['signature.mode.enrollment', 'Enrollment packet'],
  ['signature.mode.quarterly', 'Quarterly report'], ['signature.mode.appeal', 'Appeal letter']
];
export const MODE_LABEL = { remote_allowed: 'Remote allowed', in_person_required: 'In person required', pending_validation: 'Pending validation' };

// ---- presenter --------------------------------------------------------------------------------------------------------------
export const SURFACES = [
  ['Lauris and the extension', 'Every Lauris form is written by the extension on the page a person has open: screening, intake, plan, notes, both SRAs. A person presses Process Form and Get Signature.', 'lauris'],
  ['Phone', 'Pick a student, track time, say what happened, assessments. Answers wait in Psyflo until the student is open in Lauris.', 'phone'],
  ['Platform', 'What Lauris has no place for: My Work, referrals, send and track, payer replies, partial decisions, peer-to-peer, analytics, settings.', 'platform'],
  ['Portals', 'Guardians and schools without a Lauris login: family link, signing, referral, status. Never clinical content.', 'family']
];
export const ARCH = [
  ['Page bridge to the open Lauris page', 'Psyflo reads and types only on a Lauris page a person has open. There is no Lauris API, no database access and no scraping.'],
  ['A person presses the key buttons', 'Process Form, Get Signature and Send are pressed by a person. Processed, Signed and Synced are set only from an observed page event or a recorded action.'],
  ['Permissions are enforced on the server', 'Sessions and the permission table run on the server; the screen only hides and explains. Demo-grade: there is no identity provider and no password.'],
  ['One clock', 'Psyflo and the mock Lauris move together; a day advance starts the next school day. No screen reads the machine clock.'],
  ['One rules table', 'Deadlines, units and signature modes come from a table with a source label. Nothing is stated as law unless it is officially verified.'],
  ['Processed records are write-once', 'No addendum and no late entry. A correction needs a reason and is kept as history.'],
  ['What the demo plays', 'The mock Lauris, text messages, Sfax, payer portals, the DMAS lookup, speech and drafting rules are simulated and wear a Simulated chip where they appear.']
];
// [question, what the demo ships, who answers, status, settings link or null]
export const DECISIONS = [
  ['Guardian signatures: in person or remote, per document', 'Remote allowed, with the chip Policy not validated. Switching to In person changes the family screens.', 'Director of Programs', 'Validate', ['family', '']],
  ['Daily minimum: one hour or two', 'Official unit bands (120, 180, 300 minutes). The minimum is not shown as a rule.', 'Director of Programs', 'Validate', ['units', '']],
  ['Plan deadline: 24 hours or 30 days', 'Both shown, each with its source: Harvest practice 24 hours, DMAS 30 days.', 'Senior clinical advisor', 'Validate', ['rules', 'isp']],
  ['Payer decision clock', 'A neutral Day N, a follow-up call on day 10 and Overdue only after the configured limit. 7 and 14 days are never stated as a Harvest rule.', 'Payer provider relations or DMAS', 'Validate', ['rules', 'decision']],
  ['Who verifies eligibility, and how often', 'A person records the DMAS check after the family link. The weekly re-check is a configurable assumption.', 'Director of operations', 'Validate', ['rules', 'eligibility']],
  ['Who approves outgoing SRAs and who may attest', 'A Pending clinical approval stage sits before signing. Approvers are designated by an administrator and confirmed by a second person.', 'SRA-writing LPC, clinical director', 'Decided', ['roles', '']],
  ['Fill Lauris without a press each time', 'A person presses Fill every time. Nothing is typed in the background.', 'Lauris contact', 'Validate', null],
  ['Screening and peer-to-peer recording', 'Recording needs a recorded consent. Peer-to-peer recording is off. Consent and the BAA are open.', 'PsyFlo counsel', 'Validate', ['family', '']],
  ['Early discharge: DMAS rule or practice', 'Shown as Harvest practice with its gap and the chip Unverified. The words "DMAS rule" are not used.', 'Clinical director', 'Validate', ['rules', 'early_discharge']],
  ['Who may appeal', 'Guardian-led by default. The provider path shows Not verified.', 'Director of Programs', 'Validate', ['rules', 'appeal']],
  ['Correcting a processed note', 'No addendum and no late entry. Processed records are write-once.', 'Clinical director', 'Validate', null]
];
