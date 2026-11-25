// Mock Lauris session forms. Field labels are our best reading of Lauris from Harvest's descriptions;
// the extension finds every box by its label text, never by position, so correcting a label here is cheap.
// prefill(consumer, db) returns what Lauris already has (rendered green).

const goalLine = (c, n) => { const g = (c.goals || [])[n - 1]; return g ? `Obj. ${n} – ${g.objective}` : ''; };
const goalOpts = c => (c.goals || []).map(g => `Obj. ${g.n} – ${g.objective}`);
const authLine = c => c.auth && c.auth.units ? `${c.auth.payer_name || ''} · ${c.auth.units} units · ${c.auth.start_us || ''} – ${c.auth.end_us || ''}` : '';
const yn = ['', 'Y', 'N', '?'];

export const BEHAVIOURS = ['Physical aggression toward peers', 'Leaving the classroom / building', 'Verbal aggression / threats', 'Self-harm statements', 'Withdrawal / internalizing'];
export const BEHAVIOUR_COLS = ['Y/N', 'Frequency', 'Duration', 'Intensity', 'Example given'];

export const INTERVENTIONS = ['Clinical 2.1 Movement', 'QMHP 1.3 Psychoeducation', 'QMHP 1.4 Movement intervention', 'QMHP 1.5 Make or maintain friendships', 'QMHP 1.6 Recognize danger / healthy boundaries', 'QMHP 1.9 Solving peer conflict', 'QMHP 1.4b Structured problem solving'];

export const FORMS = {
  screening: {
    title: 'Admission Screening (phone)', short: 'Admission Screening',
    fields: [
      { label: 'Guardian on the call', w: 1, prefill: c => c.guardian ? `${c.guardian}` : '' },
      { label: 'Phone', w: 1, prefill: c => c.guardian_phone || '' },
      { label: 'Preferred language', w: 1, prefill: c => c.language || '' },
      { label: 'Medicaid', w: 1, prefill: c => c.medicaid_plan || '' },
      { label: 'Medicaid ID', w: 1, prefill: c => c.medicaid_id ? 'on file' : '' },
      { label: 'IEP', w: 1, prefill: c => c.iep || '' },
      { label: 'Behaviours reported (frequency · duration · intensity)', type: 'table', rows: BEHAVIOURS, cols: BEHAVIOUR_COLS },
      { label: 'Prior / current services (provider · dates · outcome)', type: 'area', w: 2 },
      { label: 'School coordination to date', type: 'area', w: 2 },
      { label: 'Medical · medications', w: 2 },
      { label: 'Strengths', w: 2 },
      { label: 'Narrative summary', type: 'area', rows: 5, w: 4 },
      { label: 'Meets admission criteria?', type: 'select', options: ['', 'Yes', 'No'], w: 2 },
      { label: 'Preliminary diagnosis', w: 2, prefill: c => c.diagnosis || '' }
    ]
  },
  cna: {
    title: 'Comprehensive Needs Assessment', short: 'CNA',
    fields: [
      { label: 'Presenting issue / reason for referral', type: 'area', w: 4 },
      { label: 'Prior services (provider · dates · outcome)', type: 'area', w: 4 },
      { label: 'Developmental history', type: 'area', w: 2 },
      { label: 'Medical · medications · prescriber', type: 'area', w: 2 },
      { label: 'Family mental-health history', type: 'area', w: 2 },
      { label: 'Trauma history', type: 'area', w: 2 },
      { label: 'PHQ-9 (modified for adolescents) · items 1–9', type: 'phq', w: 4 },
      { label: 'Strengths and resources', type: 'area', w: 4 }
    ]
  },
  isp: {
    title: 'Individual Service Plan 2.0', short: 'ISP 2.0', approve: true,
    fields: [
      { label: 'Diagnosis 1', w: 1, prefill: c => c.diagnosis || '' },
      { label: 'Start / end', w: 1 },
      { label: 'Prescribed frequency', w: 1, type: 'select', options: ['', 'Daily', '3× / week', 'Weekly'] },
      { label: 'Setting', w: 1, prefill: c => c.school ? 'School · ' + c.school.split('·').pop().trim() : '' },
      { label: 'Presenting issue', type: 'area', w: 2 },
      { label: 'Strengths', type: 'area', w: 2 },
      ...[1, 2, 3].flatMap(n => [
        { label: `Goal ${n} · Objective`, w: 4, group: `Goal ${n}` },
        { label: `Goal ${n} · Intervention 1`, type: 'select', options: ['', ...INTERVENTIONS], w: 1.5, group: `Goal ${n}` },
        { label: `Goal ${n} · Intervention 2`, type: 'select', options: ['', ...INTERVENTIONS], w: 1.5, group: `Goal ${n}` },
        { label: `Goal ${n} · Est. completion`, type: 'select', options: ['', '3 months', '6 months', '12 months'], w: 1, group: `Goal ${n}` }
      ]),
      { label: 'Discharge criteria', type: 'area', w: 4, prefill: () => "Once the individual no longer demonstrates meeting the eligibility criteria… (Harvest's standard text)" },
      { label: 'Signatures', type: 'static', w: 4, prefill: () => 'Harvest staff · Client · Parent/Guardian · Approver — signed in Forms to Approve' }
    ]
  },
  dpn: {
    title: 'Daily Progress Note – TDT', short: 'Daily Progress Note',
    fields: [
      { label: 'Service', w: 1, prefill: c => c.program === 'TDT' ? 'H2016 (school day)' : '' },
      { label: 'Setting', w: 1, prefill: c => c.school ? 'School · ' + c.school.split('·').pop().trim() : '' },
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
    title: 'Weekly Guardian Contact', short: 'Weekly guardian call',
    fields: [
      { label: 'Date', w: 1, prefill: (c, db) => db.todayUS },
      { label: 'Contact with', w: 1, prefill: c => c.guardian ? c.guardian + ' (guardian) · phone' : '' },
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
    title: 'Quarterly Report – TDT', short: 'Quarterly report', approve: true,
    fields: [
      { label: 'Goal 1 progress', type: 'area', w: 4 },
      { label: 'Goal 2 progress', type: 'area', w: 4 },
      { label: 'Goal 3 progress', type: 'area', w: 4 },
      { label: 'Assessments', w: 4 },
      { label: 'Recommendations', type: 'area', w: 4 },
      { label: 'Attendance / school functioning', type: 'area', w: 4 },
      { label: 'Guardian signature', w: 4 }
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
      { label: 'CPS report', type: 'select', options: ['', 'No', 'Yes'], w: 1 },
      { label: 'Injury', type: 'select', options: ['', 'No', 'Yes'], w: 1 },
      { label: 'Supervisor review', w: 2, prefill: () => 'Pending' }
    ]
  },
  'sra-initial': {
    title: 'TDT (H2016) Initial Service Authorization Request', short: 'TDT Initial SRA', approve: true, request: 'initial',
    fields: [
      { label: 'Member', w: 1, prefill: c => c.initials + ' · Medicaid # on file' },
      { label: 'Group NPI / tax ID', w: 1, prefill: c => 'on file · ' + (c.locality || '') },
      { label: 'Procedure', w: 1, prefill: c => '☑ H2016 (school day) · ' + (c.school || '').split('·').pop().trim() },
      { label: 'Request dates / units / hours', w: 1 },
      { label: 'Section I · criterion 1 — interpersonal relationships', type: 'area', rows: 4, w: 4 },
      { label: 'Section I · criterion 2 — interventions that have not worked', type: 'area', rows: 3, w: 4 },
      { label: 'Section I · criterion 3 — recognise danger to self or others', type: 'area', rows: 2, w: 4 },
      { label: 'Level of care', type: 'area', rows: 3, w: 2 },
      { label: 'Section III · trauma-informed care', type: 'area', rows: 3, w: 2 },
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
    title: 'CMHRS Continued Stay Request · TDT (H2016)', short: 'CMHRS Continued Stay', approve: true, request: 'continued_stay',
    fields: [
      { label: 'Member', w: 1, prefill: c => c.initials + ' · Medicaid # on file' },
      { label: 'Current authorization', w: 1, prefill: c => authLine(c) },
      { label: 'Units used', w: 1, prefill: c => c.auth?.units ? `${c.auth.used} of ${c.auth.units} · 3 per school day` : '' },
      { label: 'Request', w: 1 },
      { label: 'Progress toward goals', type: 'area', rows: 4, w: 4 },
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
    title: 'Discharge Summary · TDT', short: 'Discharge summary', approve: true,
    fields: [
      { label: 'Discharge date', w: 1 },
      { label: 'Reason', w: 1 },
      { label: 'Dates of service', w: 2, prefill: c => c.service_start_us ? c.service_start_us + ' – ' : '' },
      { label: 'Progress', type: 'area', rows: 3, w: 4 },
      { label: 'Condition at discharge', type: 'area', rows: 3, w: 4 },
      { label: 'Services recommended', type: 'area', rows: 2, w: 2 },
      { label: 'Guardian notified', type: 'area', rows: 2, w: 2 }
    ]
  }
};

export const FORM_ORDER = ['screening', 'cna', 'isp', 'dpn', 'weekly', 'collateral', 'quarterly', 'incident', 'sra-initial', 'sra-continued', 'discharge'];
