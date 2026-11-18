// Mock Lauris session forms. Field labels are our best reading of Lauris from Harvest's descriptions;
// the extension finds every box by its label text, never by position, so correcting a label here is cheap.
// prefill(consumer, db) returns what Lauris already has (rendered green).
//
// Substance use treatment (IOP, ASAM Criteria). The ASAM Multidimensional Assessment holds the clinician's six dimension ratings; the
// authorization requests (SRA) ask for a justification per dimension and a level of care. Labels other code looks up are kept
// ('Objective addressed', 'Interventions', 'Narrative', 'Mood check-in', 'Progress today', 'Direct time', 'Units', 'Contact time', 'Diagnosis 1',
// 'Preliminary diagnosis', 'Contact with', 'Request', 'Progress toward goals', 'Care coordination', 'Family involvement', 'Barriers').
import { DIMS, LEVELS, RATING_LABEL } from '../../web/js/shared/asam.js';

const goalLine = (c, n) => { const g = (c.goals || [])[n - 1]; return g ? `Obj. ${n} – ${g.objective}` : ''; };
const goalOpts = c => (c.goals || []).map(g => `Obj. ${g.n} – ${g.objective}`);
const authLine = c => c.auth && c.auth.units ? `${c.auth.payer_name || ''} · ${c.auth.units} units · ${c.auth.start_us || ''} – ${c.auth.end_us || ''}` : '';
const siteOf = c => String(c.school || '').split('·').pop().trim();
// outpatient and SEBS records are not IOP; every other program is billed as an IOP day
const isIop = c => !!c.program && !/^(Outpatient|SEBS)$/i.test(c.program);

// The substances table of the Admission Screening (it replaced the behaviours table): one row per substance, one column per fact the call should answer.
// The names BEHAVIOURS / BEHAVIOUR_COLS stay because other modules import them; the content is substance use.
export const BEHAVIOURS = ['Cannabis', 'Alcohol', 'Nicotine (vape or cigarettes)', 'Other substances (pills, opioids, stimulants)'];
export const BEHAVIOUR_COLS = ['Frequency', 'Amount', 'Route', 'Last use'];
export const SUBSTANCES = BEHAVIOURS;

// the seven substance use interventions (same list as seed.json interventions: code + name)
export const INTERVENTIONS = ['SUD 1.1 Motivational interviewing', 'SUD 1.2 Relapse prevention skills', 'SUD 1.3 Cognitive behavioral skills for substance use', 'SUD 1.4 Drug and alcohol refusal skills', 'SUD 1.5 Contingency management', 'SUD 2.1 Family session', 'SUD 2.2 Recovery support planning'];

// the six ASAM dimensions as Lauris labels them (draft.js writes boxes with exactly these labels; test/draft.test.mjs checks they agree)
export const DIM_LABELS = [
  'Dimension 1 — acute intoxication and/or withdrawal potential',
  'Dimension 2 — biomedical conditions and complications',
  'Dimension 3 — emotional, behavioral, or cognitive conditions',
  'Dimension 4 — readiness to change',
  'Dimension 5 — relapse, continued use, or continued problem potential',
  'Dimension 6 — recovery/living environment'
];
export const RATING_OPTIONS = RATING_LABEL.map((l, i) => `${i} · ${l}`);
// the "Reply type" box of the Payer Reply form (the panel's Denial packet view types one of these; keyed by the dispute document kind)
export const REPLY_TYPES = ['Information request reply', 'Peer-to-peer call', 'Appeal', 'Reconsideration request'];
export const LEVEL_OPTIONS = LEVELS.map(l => `Level ${l.id} · ${l.name}`);
const dimAreas = rows => DIMS.map(d => ({ label: DIM_LABELS[d.n - 1], type: 'area', rows, w: 4 }));

export const FORMS = {
  screening: {
    title: 'Admission Screening (phone)', short: 'Admission Screening',
    fields: [
      { label: 'Family member on the call', w: 1, prefill: c => c.guardian ? `${c.guardian}` : '' },
      { label: 'Phone', w: 1, prefill: c => c.guardian_phone || '' },
      { label: 'Preferred language', w: 1, prefill: c => c.language || '' },
      { label: 'Medicaid', w: 1, prefill: c => c.medicaid_plan || '' },
      { label: 'Medicaid ID', w: 1, prefill: c => c.medicaid_id ? 'on file' : '' },
      { label: 'Referral source', w: 1 },
      { label: 'Substances reported (frequency · amount · route · last use)', type: 'table', rowHead: 'Substance', rows: BEHAVIOURS, cols: BEHAVIOUR_COLS },
      { label: 'Prior treatment (provider · dates · outcome)', type: 'area', w: 2 },
      { label: 'Current services to date', type: 'area', w: 2 },
      { label: 'Quit attempts and readiness to change', type: 'area', w: 4 },
      { label: 'Withdrawal history', type: 'area', w: 2 },
      { label: 'Family substance use in the home', type: 'area', w: 2 },
      { label: 'Medical · medications', w: 2 },
      { label: 'Mood and anxiety symptoms', w: 2 },
      { label: 'Suicidal thoughts and safety', type: 'area', w: 2 },
      { label: 'Strengths', w: 2 },
      { label: 'Narrative summary', type: 'area', rows: 5, w: 4 },
      { label: 'Meets admission criteria?', type: 'select', options: ['', 'Yes', 'No'], w: 2 },
      { label: 'Preliminary diagnosis', w: 2, prefill: c => c.diagnosis || '' }
    ]
  },
  // the intake is the ASAM Multidimensional Assessment: the clinician writes each dimension and rates it 0 to 4; the level recommendation and the
  // reassessment date are the clinician's too. Psyflo drafts the text it can source from the call and never a rating.
  cna: {
    title: 'ASAM Multidimensional Assessment', short: 'ASAM',
    fields: [
      { label: 'Presenting issue / reason for referral', type: 'area', w: 4 },
      { label: 'Prior treatment (provider · dates · outcome)', type: 'area', w: 4 },
      ...DIMS.flatMap(d => [
        { label: DIM_LABELS[d.n - 1], type: 'area', rows: 3, w: 3 },
        { label: `Dimension ${d.n} · rating (0 to 4)`, type: 'select', options: ['', ...RATING_OPTIONS], w: 1 }
      ]),
      { label: 'Level of care recommendation', type: 'select', options: ['', ...LEVEL_OPTIONS], w: 2 },
      { label: 'Reassessment due date', w: 2 },
      { label: 'Plan', type: 'area', rows: 3, w: 4 }
    ]
  },
  isp: {
    title: 'Individual Treatment Plan 2.0', short: 'ISP 2.0', approve: true,
    fields: [
      { label: 'Diagnosis 1', w: 1, prefill: c => c.diagnosis || '' },
      { label: 'Start / end', w: 1 },
      { label: 'Prescribed frequency', w: 1, type: 'select', options: ['', 'Daily', '3× / week', 'Weekly'] },
      { label: 'Setting', w: 1, prefill: c => c.school ? 'Treatment site · ' + siteOf(c) : '' },
      { label: 'Presenting issue', type: 'area', w: 2 },
      { label: 'Strengths', type: 'area', w: 2 },
      ...[1, 2, 3].flatMap(n => [
        { label: `Goal ${n} · Objective`, w: 4, group: `Goal ${n}` },
        { label: `Goal ${n} · Intervention 1`, type: 'select', options: ['', ...INTERVENTIONS], w: 1.5, group: `Goal ${n}` },
        { label: `Goal ${n} · Intervention 2`, type: 'select', options: ['', ...INTERVENTIONS], w: 1.5, group: `Goal ${n}` },
        { label: `Goal ${n} · Est. completion`, type: 'select', options: ['', '3 months', '6 months', '12 months'], w: 1, group: `Goal ${n}` }
      ]),
      { label: 'Discharge criteria', type: 'area', w: 4, prefill: () => "Once the ASAM ratings fit a lower level of care and the goals above are met… (Harvest's standard text)" },
      { label: 'Signatures', type: 'static', w: 4, prefill: () => 'Harvest staff · Client · Family member · Approver — signed in Forms to Approve' }
    ]
  },
  dpn: {
    title: 'Daily Progress Note – IOP group', short: 'Daily Progress Note',
    fields: [
      { label: 'Service', w: 1, prefill: c => isIop(c) ? 'H0015 (IOP day)' : '' },
      { label: 'Setting', w: 1, prefill: c => c.school ? 'Treatment site · ' + siteOf(c) : '' },
      { label: 'Direct time', w: 1 },
      { label: 'Units', w: 1 },
      { label: 'Contact time', type: 'area', rows: 3, w: 4 },
      { label: 'Objective addressed', type: 'select', options: c => ['', ...goalOpts(c)], w: 2, prefill: c => goalLine(c, 1) },
      { label: 'Interventions', w: 2, prefill: c => (c.goals?.[0]?.interventions || []).join(' · ') },
      { label: 'Mood check-in', w: 2 },
      { label: 'Progress today', w: 2 },
      { label: 'Narrative', type: 'area', rows: 6, w: 4 }
    ]
  },
  weekly: {
    title: 'Weekly Family Contact', short: 'Weekly family call',
    fields: [
      { label: 'Date', w: 1, prefill: (c, db) => db.todayUS },
      { label: 'Contact with', w: 1, prefill: c => c.guardian ? c.guardian + ' (family member) · phone' : '' },
      { label: 'Duration', w: 1 },
      { label: 'Release on file', w: 1, prefill: c => c.release ? 'Yes · ' + c.release : '' },
      { label: 'What was discussed', type: 'area', rows: 4, w: 4 },
      { label: 'Follow-up', type: 'area', rows: 2, w: 4 }
    ]
  },
  collateral: {
    title: 'Monthly Collateral Contact', short: 'Monthly collateral',
    fields: [
      { label: 'Date', w: 1, prefill: (c, db) => db.todayUS },
      { label: 'Collateral', w: 1 },
      { label: 'Method', w: 1 },
      { label: 'Release on file', w: 1, prefill: c => c.release ? 'Yes · ' + c.release : '' },
      { label: 'Information shared / received', type: 'area', rows: 4, w: 4 },
      { label: 'Coordination', type: 'area', rows: 2, w: 4 }
    ]
  },
  quarterly: {
    title: 'Quarterly Report – IOP', short: 'Quarterly report', approve: true,
    fields: [
      { label: 'Goal 1 progress', type: 'area', w: 4 },
      { label: 'Goal 2 progress', type: 'area', w: 4 },
      { label: 'Goal 3 progress', type: 'area', w: 4 },
      { label: 'Assessments', w: 4 },
      { label: 'Recommendations', type: 'area', w: 4 },
      { label: 'Attendance and recovery environment', type: 'area', w: 4 },
      { label: 'Family member signature', w: 4 }
    ]
  },
  incident: {
    title: 'Incident Report', short: 'Incident report',
    fields: [
      { label: 'Date/time', w: 1 },
      { label: 'Location', w: 1 },
      { label: 'Level', type: 'select', options: ['', 'Level 1', 'Level 2 · emergency department visit', 'Level 2', 'Level 3'], w: 1 },
      { label: 'Staff present', w: 1 },
      { label: 'Substances involved', w: 4 },
      { label: 'What happened', type: 'area', rows: 4, w: 4 },
      { label: 'Actions taken', type: 'area', rows: 3, w: 4 },
      { label: 'CPS report', type: 'select', options: ['', 'No', 'Yes'], w: 1 },
      { label: 'Injury', type: 'select', options: ['', 'No', 'Yes'], w: 1 },
      { label: 'Supervisor review', w: 2, prefill: () => 'Pending' }
    ]
  },
  'sra-initial': {
    title: 'IOP (H0015) Initial Service Authorization Request', short: 'IOP Initial SRA', approve: true, request: 'initial',
    fields: [
      { label: 'Member', w: 1, prefill: c => c.initials + ' · Medicaid # on file' },
      { label: 'Group NPI / tax ID', w: 1, prefill: c => 'on file · ' + (c.locality || '') },
      { label: 'Procedure', w: 1, prefill: c => '☑ H0015 (IOP day) · ' + siteOf(c) },
      { label: 'Request dates / units / hours', w: 1 },
      ...dimAreas(4),
      { label: 'Level of care', type: 'area', rows: 3, w: 4 },
      { label: 'Reason for the requested level', type: 'area', rows: 2, w: 4 },
      { label: 'Care coordination', type: 'area', rows: 2, w: 2 },
      { label: 'Barriers', type: 'area', rows: 2, w: 2 },
      { label: 'Goal 1', w: 4, prefill: c => goalLine(c, 1) },
      { label: 'Goal 2', w: 4, prefill: c => goalLine(c, 2) },
      { label: 'Goal 3', w: 4, prefill: c => goalLine(c, 3) },
      { label: 'Strengths', w: 2, prefill: c => c.strengths || '' },
      { label: 'Discharge', w: 2 }
    ]
  },
  'sra-continued': {
    title: 'Continued Stay Request · IOP (H0015)', short: 'Continued Stay', approve: true, request: 'continued_stay',
    fields: [
      { label: 'Member', w: 1, prefill: c => c.initials + ' · Medicaid # on file' },
      { label: 'Current authorization', w: 1, prefill: c => authLine(c) },
      { label: 'Units used', w: 1, prefill: c => c.auth?.units ? `${c.auth.used} of ${c.auth.units} · 3 per IOP day` : '' },
      { label: 'Request', w: 1 },
      { label: 'Progress toward goals', type: 'area', rows: 4, w: 4 },
      ...dimAreas(3),
      { label: 'Level of care', type: 'area', rows: 3, w: 4 },
      { label: 'Reassessment and step-down plan', type: 'area', rows: 3, w: 4 },
      { label: 'Reason for the requested level', type: 'area', rows: 2, w: 4 },
      { label: 'Continued need / risk', type: 'area', rows: 4, w: 4 },
      { label: 'Care coordination', type: 'area', rows: 2, w: 2 },
      { label: 'Family involvement', type: 'area', rows: 2, w: 2 },
      { label: 'Barriers', type: 'area', rows: 2, w: 4 },
      { label: 'Goal 1', w: 4, prefill: c => goalLine(c, 1) },
      { label: 'Goal 2', w: 4, prefill: c => goalLine(c, 2) },
      { label: 'Goal 3', w: 4, prefill: c => goalLine(c, 3) }
    ]
  },
  discharge: {
    title: 'Discharge Summary · IOP', short: 'Discharge summary', approve: true,
    fields: [
      { label: 'Discharge date', w: 1 },
      { label: 'Reason', w: 1 },
      { label: 'Dates of service', w: 2, prefill: c => c.service_start_us ? c.service_start_us + ' – ' : '' },
      { label: 'Progress', type: 'area', rows: 3, w: 4 },
      { label: 'Condition at discharge', type: 'area', rows: 3, w: 4 },
      { label: 'Services recommended', type: 'area', rows: 2, w: 2 },
      { label: 'Family member notified', type: 'area', rows: 2, w: 2 }
    ]
  },
  // A payer reply (an appeal, a reply to a request for information, a peer-to-peer call note, a reconsideration request) is drafted in the EHR too.
  // It is a note-type form: Process Form files it in the Active File, there is no signature path, and Psyflo never sends it (the payer gets it
  // from the portal, the fax or the call, by a person). The extension types the packet into these boxes when a person presses the button.
  'payer-reply': {
    title: 'Payer Reply · appeal or information request', short: 'Payer Reply',
    fields: [
      { label: 'Member', w: 1, prefill: c => c.initials + ' · Medicaid # on file' },
      { label: 'Current authorization', w: 1, prefill: c => authLine(c) },
      { label: 'Payer decision', w: 2 },
      { label: 'Reply type', type: 'select', options: ['', ...REPLY_TYPES], w: 2 },
      { label: 'Reason the payer gave', type: 'area', rows: 3, w: 4 },
      { label: 'Level of care', type: 'area', rows: 3, w: 4 },
      ...dimAreas(3),
      { label: 'Added from recommendations', type: 'area', rows: 4, w: 4 },
      { label: 'What we ask', type: 'area', rows: 2, w: 4 }
    ]
  }
};

export const FORM_ORDER = ['screening', 'cna', 'isp', 'dpn', 'weekly', 'collateral', 'quarterly', 'incident', 'sra-initial', 'sra-continued', 'discharge', 'payer-reply'];
