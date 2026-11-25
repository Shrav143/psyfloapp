// Mock Client Record session forms for Community Counseling Center of Southern Nevada (adult SUD agency, ASAM criteria).
// The extension finds every box by its label text, never by position, so a label changed here must be changed
// in web/js/shared/draft.js and web/panel/panel.js too (and the form titles in web/panel/bridge.js).
// prefill(client, db) returns what Client Record already has (rendered green).

const goalLine = (c, n) => { const g = (c.goals || [])[n - 1]; return g ? `Goal ${n} – ${g.objective}` : ''; };
const goalOpts = c => (c.goals || []).map(g => `Goal ${g.n} – ${g.objective}`);
const authLine = c => c.auth && c.auth.units ? `${c.auth.payer_name || ''} · ${c.auth.units} units H0015 · ${c.auth.start_us || ''} – ${c.auth.end_us || ''}` : '';
const levelName = c => c.level === '1' ? 'ASAM Level 1 · Outpatient' : 'ASAM Level 2.1 · Intensive outpatient (IOP)';

export const SUBSTANCES = ['Opioids (fentanyl / heroin / pills)', 'Alcohol', 'Stimulants (methamphetamine / cocaine)', 'Cannabis', 'Benzodiazepines / sedatives'];
export const SUBSTANCE_COLS = ['Y/N', 'Last use', 'Route', 'Frequency', 'Amount / notes'];

// The six ASAM dimensions (names exactly as the brief has them)
export const DIMENSIONS = [
  ['D1', 'Acute intoxication / withdrawal potential'],
  ['D2', 'Biomedical conditions'],
  ['D3', 'Emotional, behavioral or cognitive conditions'],
  ['D4', 'Readiness to change'],
  ['D5', 'Relapse, continued use or continued problem potential'],
  ['D6', 'Recovery / living environment']
];
export const dimLabel = (d, part) => { const [k, n] = DIMENSIONS.find(x => x[0] === d); return `${k} ${n} — ${part}`; };

// CCC of SN's intervention list (seed interventions, by code); the picklist shows "CODE Name" (same as draft.js)
export const INTERVENTIONS = ['MI Motivational interviewing', 'CBT-RP Relapse prevention (CBT)', 'MAT-C MAT coordination', 'SS Seeking Safety (trauma-informed)', 'PS Peer recovery support', 'RP-G Relapse prevention group', 'FAM Family / support-person session'];
export const LEVELS = ['', 'Level 1 · Outpatient', 'Level 2.1 · Intensive outpatient (IOP)', 'Level 2.5 · Partial hospitalization', 'Level 3.1 · Clinically managed low-intensity residential', 'Level 3.5 · Clinically managed high-intensity residential', 'Withdrawal management first (refer out)'];
const RISK = ['', '0', '1', '2', '3', '4'];
const DIM_OPTS = ['', ...DIMENSIONS.map(([k, n]) => `${k} ${n}`)];

export const FORMS = {
  screening: {
    title: 'Intake Screening (phone)', short: 'Intake screening',
    fields: [
      { label: 'Referral source', w: 1, prefill: c => c.referral_source || '' },
      { label: 'Phone', w: 1, prefill: c => c.phone || '' },
      { label: 'Preferred language', w: 1, prefill: c => c.language || '' },
      { label: 'Medicaid', w: 1, prefill: c => c.medicaid_plan || '' },
      { label: 'Medicaid ID', w: 1, prefill: c => c.medicaid_id ? 'on file' : '' },
      { label: 'Referral partner', w: 3, prefill: c => c.referral_partner || '' },
      { label: 'Substance use (substance · last use · route · frequency · amount)', type: 'table', rows: SUBSTANCES, cols: SUBSTANCE_COLS, head: 'Substance' },
      { label: 'Withdrawal risk (D1)', type: 'area', w: 2 },
      { label: 'MAT / medications · prescriber', type: 'area', w: 2 },
      { label: 'Overdose history · naloxone', w: 2 },
      { label: 'Mental health · safety (D3)', w: 2 },
      { label: 'Prior treatment (provider · level · dates · outcome)', type: 'area', w: 4 },
      { label: 'Legal involvement / drug court', type: 'area', w: 2 },
      { label: 'Housing / living situation', type: 'area', w: 2 },
      { label: 'Reason for seeking treatment (own words)', w: 2 },
      { label: 'Strengths / recovery supports', w: 2 },
      { label: 'HIV / HCV status (optional)', type: 'select', options: ['', 'Not asked', 'Offered · client declined to share', 'Shared · see chart'], w: 2 },
      { label: 'Narrative summary', type: 'area', rows: 5, w: 4 },
      { label: 'Meets admission criteria?', type: 'select', options: ['', 'Yes', 'No'], w: 2 },
      { label: 'Preliminary diagnosis', w: 2, prefill: c => c.diagnosis || '' }
    ]
  },
  cna: {
    title: 'ASAM Assessment', short: 'ASAM assessment',
    fields: [
      { label: 'Presenting problem / reason for referral', type: 'area', w: 4 },
      { label: 'Substance use history', type: 'area', w: 2 },
      { label: 'Prior treatment (provider · level · dates · outcome)', type: 'area', w: 2 },
      ...DIMENSIONS.flatMap(([d]) => [
        { label: dimLabel(d, 'risk (0–4)'), type: 'select', options: RISK, w: 1, group: d },
        { label: dimLabel(d, 'narrative'), type: 'area', rows: 3, w: 3, group: d }
      ]),
      { label: 'UDS at assessment (date · result)', w: 2 },
      { label: 'Level-of-care recommendation', type: 'select', options: LEVELS, w: 2 },
      { label: 'PHQ-9 (D3 screen) · items 1–9', type: 'phq', w: 4 },
      { label: 'Trauma history', type: 'area', w: 2 },
      { label: 'Strengths and recovery resources', type: 'area', w: 2 }
    ]
  },
  isp: {
    title: 'Treatment Plan', short: 'Treatment plan', approve: true,
    fields: [
      { label: 'Diagnosis 1', w: 1, prefill: c => c.diagnosis || '' },
      { label: 'Start / end', w: 1 },
      { label: 'Level of care', w: 1, prefill: c => levelName(c) },
      { label: 'Frequency', w: 1, type: 'select', options: ['', 'IOP 3 h/day, 3 days/week', 'IOP 3 h/day, 4 days/week', 'Level 1 · 1 session/week', 'Level 1 · 2 sessions/week'] },
      { label: 'Presenting problem', type: 'area', w: 2 },
      { label: 'Strengths', type: 'area', w: 2 },
      ...[1, 2, 3].flatMap(n => [
        { label: `Goal ${n} · Problem (ASAM dimension)`, type: 'select', options: DIM_OPTS, w: 2, group: `Goal ${n}` },
        { label: `Goal ${n} · Target date`, w: 2, group: `Goal ${n}` },
        { label: `Goal ${n} · Objective`, w: 4, group: `Goal ${n}` },
        { label: `Goal ${n} · Intervention 1`, type: 'select', options: ['', ...INTERVENTIONS], w: 2, group: `Goal ${n}` },
        { label: `Goal ${n} · Intervention 2`, type: 'select', options: ['', ...INTERVENTIONS], w: 2, group: `Goal ${n}` }
      ]),
      { label: 'Discharge / transition criteria', type: 'area', w: 4, prefill: () => 'Step down when ASAM continued-service criteria for this level are no longer met and the criteria for a lower level are met; discharge when treatment goals are met or the client chooses to end services. (CCC of SN standard text)' },
      { label: 'Signatures', type: 'static', w: 4, prefill: () => 'CCC of SN clinician · Client · Approver — signed in Forms to Approve' }
    ]
  },
  dpn: {
    title: 'IOP Group Note', short: 'IOP group note',
    fields: [
      { label: 'Service', w: 1, prefill: c => c.level === '1' ? 'H0005 · group (Level 1)' : 'H0015 · IOP (1 unit = 1 hour)' },
      { label: 'Setting', w: 1, prefill: c => c.site ? c.site : '' },
      { label: 'Time in group', w: 1 },
      { label: 'Units', w: 1 },
      { label: 'Session times', type: 'area', rows: 3, w: 4 },
      { label: 'Plan objective addressed', type: 'select', options: c => ['', ...goalOpts(c)], w: 2, prefill: c => goalLine(c, 1) },
      { label: 'Interventions', w: 2, prefill: c => (c.goals?.[0]?.interventions || []).join(' · ') },
      { label: 'Check-in (mood · cravings)', w: 2 },
      { label: 'Progress', w: 2 },
      { label: 'Narrative', type: 'area', rows: 6, w: 4 }
    ]
  },
  weekly: {
    title: 'Weekly Collateral Update (court · P&P · sober living)', short: 'Weekly collateral update',
    fields: [
      { label: 'Date', w: 1, prefill: (c, db) => db.todayUS },
      { label: 'Contact with', w: 1, prefill: c => c.referral_partner || '' },
      { label: 'Duration', w: 1 },
      { label: 'Release on file (42 CFR Part 2)', w: 1, prefill: c => c.release ? 'Yes · ' + c.release : '' },
      { label: 'What was shared', type: 'area', rows: 4, w: 4 },
      { label: 'Follow-up', type: 'area', rows: 2, w: 4 }
    ]
  },
  collateral: {
    title: 'Collateral Contact (prescriber · primary care)', short: 'Collateral contact',
    fields: [
      { label: 'Date', w: 1, prefill: (c, db) => db.todayUS },
      { label: 'Collateral', w: 1 },
      { label: 'Method', w: 1 },
      { label: 'Release on file (42 CFR Part 2)', w: 1, prefill: c => c.release ? 'Yes · ' + c.release : '' },
      { label: 'Information shared / received', type: 'area', rows: 4, w: 4 },
      { label: 'Coordination', type: 'area', rows: 2, w: 4 }
    ]
  },
  quarterly: {
    title: 'Treatment Plan Review (90-day)', short: 'Plan review', approve: true,
    fields: [
      { label: 'Goal 1 progress', type: 'area', w: 4 },
      { label: 'Goal 2 progress', type: 'area', w: 4 },
      { label: 'Goal 3 progress', type: 'area', w: 4 },
      { label: 'Assessments (UDS · PHQ-9 · BAM)', w: 4 },
      { label: 'Recommendations', type: 'area', w: 4 },
      { label: 'Attendance', type: 'area', w: 4 },
      { label: 'Client signature', w: 4 }
    ]
  },
  incident: {
    title: 'Incident Report', short: 'Incident report',
    fields: [
      { label: 'Date/time', w: 1 },
      { label: 'Location', w: 1 },
      { label: 'Level', type: 'select', options: ['', 'Level 1', 'Level 2 · hospitalization', 'Level 2', 'Level 3'], w: 1 },
      { label: 'Staff present', w: 1 },
      { label: 'What happened', type: 'area', rows: 4, w: 4 },
      { label: 'Actions taken', type: 'area', rows: 3, w: 4 },
      { label: 'Naloxone given', type: 'select', options: ['', 'No', 'Yes'], w: 1 },
      { label: 'Injury', type: 'select', options: ['', 'No', 'Yes'], w: 1 },
      { label: 'Supervisor review', w: 2, prefill: () => 'Pending' }
    ]
  },
  'sra-initial': {
    title: 'Prior Authorization Request · Level 2.1 IOP (H0015)', short: 'Prior authorization request', approve: true, request: 'initial',
    fields: [
      { label: 'Member', w: 1, prefill: c => c.initials + ' · Medicaid # on file' },
      { label: 'Rendering clinician · NPI', w: 1, prefill: c => (c.clinician || '') + ' · individual NPI on file' },
      { label: 'Level of care · procedure', w: 1, prefill: c => '☑ ' + levelName(c) + (c.level === '1' ? ' · H0004 / H0005' : ' · H0015 (1 unit = 1 hour)') },
      { label: 'Diagnosis (ICD-10)', w: 1, prefill: c => c.diagnosis || '' },
      { label: 'Start date / units / schedule', w: 4 },
      ...DIMENSIONS.map(([d]) => ({ label: dimLabel(d, 'medical necessity'), type: 'area', rows: 3, w: 2, group: 'ASAM' })),
      { label: 'UDS at assessment', w: 4 },
      { label: 'Prior treatment', type: 'area', rows: 2, w: 2 },
      { label: 'Care coordination', type: 'area', rows: 2, w: 2 },
      { label: 'Goal 1', w: 4, prefill: c => goalLine(c, 1) },
      { label: 'Goal 2', w: 4, prefill: c => goalLine(c, 2) },
      { label: 'Goal 3', w: 4, prefill: c => goalLine(c, 3) },
      { label: 'Discharge / step-down plan', type: 'area', rows: 2, w: 2 },
      { label: 'Clinician attestation', type: 'area', rows: 2, w: 2 }
    ]
  },
  'sra-continued': {
    title: 'Continued Stay Request · Level 2.1 IOP (H0015)', short: 'Continued stay request', approve: true, request: 'continued_stay',
    fields: [
      { label: 'Member', w: 1, prefill: c => c.initials + ' · Medicaid # on file' },
      { label: 'Current authorization', w: 1, prefill: c => authLine(c) },
      { label: 'Units used', w: 1, prefill: c => c.auth?.units ? `${c.auth.used} of ${c.auth.units} · 3 per IOP day` : '' },
      { label: 'Request', w: 1 },
      { label: 'IOP attendance', type: 'area', rows: 2, w: 2 },
      { label: 'UDS results in treatment', type: 'area', rows: 2, w: 2 },
      { label: 'Dimension changes since admission (D1–D6)', type: 'area', rows: 3, w: 4 },
      { label: 'D5 · why Level 2.1 is still needed', type: 'area', rows: 4, w: 4 },
      { label: 'Step-down readiness (continued-service criteria)', type: 'area', rows: 3, w: 4 },
      { label: 'Care coordination', type: 'area', rows: 2, w: 2 },
      { label: 'Barriers', type: 'area', rows: 2, w: 2 },
      { label: 'Goal 1', w: 4, prefill: c => goalLine(c, 1) },
      { label: 'Goal 2', w: 4, prefill: c => goalLine(c, 2) },
      { label: 'Goal 3', w: 4, prefill: c => goalLine(c, 3) }
    ]
  },
  discharge: {
    title: 'Discharge / Transfer Summary', short: 'Discharge / transfer summary', approve: true,
    fields: [
      { label: 'Discharge / transfer date', w: 1 },
      { label: 'Reason', w: 1 },
      { label: 'Dates of service', w: 2, prefill: c => c.service_start_us ? c.service_start_us + ' – ' : '' },
      { label: 'Level of care · transfer to', w: 4 },
      { label: 'Progress by dimension', type: 'area', rows: 3, w: 4 },
      { label: 'Condition at discharge', type: 'area', rows: 3, w: 4 },
      { label: 'Services recommended', type: 'area', rows: 2, w: 2 },
      { label: 'Client informed', type: 'area', rows: 2, w: 2 }
    ]
  }
};

export const FORM_ORDER = ['screening', 'cna', 'isp', 'sra-initial', 'sra-continued', 'discharge', 'dpn', 'weekly', 'collateral', 'quarterly', 'incident'];
