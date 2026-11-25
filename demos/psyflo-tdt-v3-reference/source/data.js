/* Shared data + state for the prototype. Everything is fictional demo data (initials only). */
(function () {
  const PSY = (window.PSY = window.PSY || {});

  const payers = {
    sentara: { id: 'sentara', mco: 'Sentara Health Plans', name: 'Sentara Community Plan', short: 'Sentara', channel: 'Sfax' },
    anthem: { id: 'anthem', mco: 'Anthem', name: 'Anthem HealthKeepers Plus', short: 'Anthem', channel: 'Availity' },
    aetna: { id: 'aetna', mco: 'Aetna', name: 'Aetna Better Health of Virginia', short: 'Aetna', channel: 'Sfax' },
    humana: { id: 'humana', mco: 'Humana', name: 'Humana Healthy Horizons in Virginia', short: 'Humana', channel: 'Sfax' },
    uhc: { id: 'uhc', mco: 'UnitedHealthcare', name: 'UnitedHealthcare Community Plan', short: 'UnitedHealthcare', channel: 'UHC portal' },
    ffs: { id: 'ffs', name: 'Medicaid FFS · Acentra Health', short: 'FFS', channel: 'Sfax' },
  };

  /* Stage keys used everywhere:
     referral | sign | info | submitted | decision | partial | p2p | denied | appeal | active | sent  */
  const cases = [
    {
      id: 'R-0416', who: 'T.W., 12', ini: 'T.W.', age: 12, school: 'Lynchburg City · MS-2', loc: 'lynchburg',
      type: 'Initial SRA', service: 'TDT school day', code: 'H2016', payer: 'humana',
      units: { req: 150, line: '150 requested', sub: 'intake Oct 20' },
      stage: 'sign', stageLabel: 'Waiting for signature', clock: { text: '21 days to the 30-day limit', tone: 'y' },
      next: 'Draft written from the referral, screening, intake and treatment plan.',
      cta: { label: 'Review and sign', go: 'draft-initial', primary: true }, needsClinician: true,
    },
    {
      id: 'R-0411', today: true, who: 'M.R., 7', ini: 'M.R.', age: 7, school: 'Campbell County · ES-1', loc: 'campbell',
      type: 'Concurrent SRA', service: 'TDT school day', code: 'H2016', payer: 'anthem',
      units: { req: 150, line: '150 requested', sub: '27 of 110 left on current auth', bar: 75, barTone: '#B9541F' },
      stage: 'sign', stageLabel: 'Waiting for signature', clock: { text: '9 school days of units', tone: 'r' },
      next: 'Draft assembled from 61 notes. Review, sign, send.',
      cta: { label: 'Review and sign', go: 'draft-continued', primary: true }, needsClinician: true,
    },
    {
      id: 'R-0408', today: true, who: 'K.T., 9', ini: 'K.T.', age: 9, school: 'Lynchburg City · MS-2', loc: 'lynchburg',
      type: 'Initial SRA → Additional information', service: 'TDT school day', code: 'H2016', payer: 'anthem',
      units: { req: 150, line: '150 requested', sub: '' },
      stage: 'info', stageLabel: 'Info requested', stageTone: 'y', clock: { text: '7 h left of 24', tone: 'r' },
      next: 'Reply drafted from the request already sent; a clinician must send it.',
      cta: { label: 'Open reply', go: 'info-request', primary: false }, needsClinician: true,
    },
    {
      id: 'R-0402', today: true, who: 'D.W., 14', ini: 'D.W.', age: 14, school: 'Campbell County · HS-1', loc: 'campbell',
      type: 'Concurrent SRA', service: 'TDT school day', code: 'H2016', payer: 'sentara',
      units: { req: 150, line: '150 → 120 offered', sub: 'payer called Oct 27' },
      stage: 'partial', stageLabel: 'Partial — decide', stageTone: 'y', clock: { text: 'reply by Oct 30', tone: 'y' },
      next: 'Accept · add info · peer-to-peer · early discharge + new initial',
      cta: { label: 'Decide', go: 'partials', primary: false }, needsClinician: true,
    },
    {
      id: 'R-0399', who: 'A.L., 6', ini: 'A.L.', age: 6, school: 'Lynchburg City · ES-3', loc: 'lynchburg',
      type: 'Initial SRA', service: 'TDT school day', code: 'H2016', payer: 'humana',
      units: { req: 150, line: '150 requested', sub: '' },
      stage: 'submitted', stageLabel: 'Submitted', stageTone: 'n', clock: { text: 'day 10 · no receipt', tone: 'y' },
      next: 'Receipt confirmed 10:12 (Psyflo dialed, supervisor verified). Decision due Oct 26 — overdue; escalation drafted.',
      cta: { label: 'View', go: 'sent', params: { case: 'R-0399' }, primary: false }, sendNote: 'Sfax · ref F-2291',
    },
    {
      id: 'R-0391', who: 'J.O., 14', ini: 'J.O.', age: 14, school: 'Lynchburg City · MS-2', loc: 'lynchburg',
      type: 'Early discharge + new initial', service: 'TDT school day', code: 'H2016', payer: 'aetna',
      units: { req: 150, line: '150 → 110 offered', sub: 'SRA: 80 awarded, used in 7 wks' },
      stage: 'partial', stageLabel: 'Partial — decide', stageTone: 'y', clock: { text: 'reply by Nov 2', tone: 'y' },
      next: 'Aetna called Oct 29 with 110. Expect “why were units used early?” — justification attached.',
      cta: { label: 'Decide', go: 'partials', params: { case: 'R-0391' }, primary: false }, needsClinician: true, sendNote: 'Sfax · ref F-2287',
    },
    {
      id: 'R-0388', who: 'T.N., 8', ini: 'T.N.', age: 8, school: 'Campbell County · ES-1', loc: 'campbell',
      type: 'Peer-to-peer', service: 'TDT school day', code: 'H2016', payer: 'sentara',
      units: { req: 150, line: '150 → 65 awarded', sub: 'exhausted in ~18 school days', bar: 43, barTone: '#217A78' },
      stage: 'p2p', stageLabel: 'Peer-to-peer booked', stageTone: 'n', clock: { text: 'Dec 9 · 41 days out', tone: 'r' },
      next: 'Units run out before the call. Call notes are ready.',
      cta: { label: 'Call notes', go: 'p2p-notes', primary: false },
    },
    {
      id: 'R-0384', who: 'E.C., 5', ini: 'E.C.', age: 5, school: 'Lynchburg City · ES-3', loc: 'lynchburg',
      type: 'Initial SRA', service: 'TDT school day', code: 'H2016', payer: 'anthem',
      units: { req: 90, line: '90 requested', sub: 'denied Oct 22' },
      stage: 'denied', stageLabel: 'Denied', stageTone: 'r', clock: { text: 'appeal window 60 d', tone: 'n' },
      next: 'Reason: “already connected to other services.” Guardian-led appeal; letter drafted for the guardian.',
      cta: { label: 'View', go: 'denial-detail', primary: false },
    },
    {
      id: 'R-0395', who: 'S.B., 11', ini: 'S.B.', age: 11, school: 'Campbell County · MS-1', loc: 'campbell',
      type: 'Concurrent SRA', service: 'TDT school day', code: 'H2016', payer: 'uhc',
      units: { req: 150, line: '150 → 80 awarded', sub: '14 left · 3/day', bar: 82, barTone: '#B9541F' },
      stage: 'active', stageLabel: 'Active', stageTone: 'g', clock: { text: '5 school days', tone: 'r' },
      next: 'Start the next concurrent SRA now.',
      cta: { label: 'Start draft', go: 'draft-continued', params: { case: 'R-0395' }, primary: false },
    },
    {
      id: 'R-0380', who: 'L.V., 16', ini: 'L.V.', age: 16, school: 'Campbell County · HS-1', loc: 'campbell',
      type: 'Concurrent SRA', service: 'TDT after-school', code: 'H2016-UG', payer: 'humana',
      units: { req: 60, line: '60 → 60 awarded', sub: '38 left · 1/day', bar: 37, barTone: '#217A78' },
      stage: 'active', stageLabel: 'Active', stageTone: 'g', clock: { text: '38 school days', tone: 'n' },
      next: 'Renewal due Dec 8. Nothing to do yet.',
      cta: { label: 'View', go: 'case', params: { case: 'R-0380' }, primary: false },
    },
    {
      id: 'R-0377', who: 'P.G., 10', ini: 'P.G.', age: 10, school: 'Lynchburg City · MS-2', loc: 'lynchburg',
      type: 'Concurrent SRA', service: 'Outpatient', code: '', payer: 'aetna',
      units: { req: 24, line: '24 → 24 awarded', sub: '19 left', bar: 21, barTone: '#217A78' },
      stage: 'active', stageLabel: 'Active', stageTone: 'g', clock: { text: '—', tone: 'n' },
      next: '—',
      cta: { label: 'View', go: 'case', params: { case: 'R-0377' }, primary: false },
    },
  ];

  /* Referrals (Referrals list screen). REF-118 is the one with a full review screen. */
  const referrals = [
    { id: 'REF-118', who: 'T.W., 12', school: 'Lynchburg City · MS-2', loc: 'lynchburg', received: 'Oct 13', via: 'Psyflo link', by: 'school counselor',
      status: 'needs-call', note: 'Insurance needs 2 criteria, we can show 1 · 4 things missing before the screening call' },
    { id: 'REF-121', who: 'R.M., 8', school: 'Campbell County · ES-1', loc: 'campbell', received: 'Oct 28', via: 'Psyflo link', by: 'site supervisor',
      status: 'call-booked', note: 'Screening call Fri Oct 30, 2:00 pm · details ready' },
    { id: 'REF-123', who: 'G.H., 13', school: 'Lynchburg City · MS-2', loc: 'lynchburg', received: 'Oct 29', via: 'Psyflo link', by: 'school counselor',
      status: 'new', note: 'Medicaid “not sure” per the school · family link not yet sent' },
  ];

  function seedState() {
    return {
      version: 5,
      sync: {}, // round 9: document versions and EHR sync states (PSY.sync): key → { stage, state, original, text, approved, synced, history }
      diStatus: {}, // round 9: Denial Intelligence resolution status per case (PSY.diStatus): caseId → { status, at, by, note, history }
      role: 'lcs', // round 8: who is using Psyflo (dss | lcs | admin); switched with "View as"
      perms: {}, // round 8: admin overrides of PSY.PERMS: role → { feature: true|false } (Settings → Roles)
      ext: { open: false, mode: 'collapsed', seen: false, tab: null, view: null, paused: false, focus: null },
      fb: {}, // platform filter bars: page → {filter key → value} (cleared by Reset Demo)
      audit: [], // round 5 audit trail: {t, case, action, by, doc, status} newest first
      rates: {}, // reimbursement rates configured by the user in Settings: 'payer|service' → $ per unit (none by default)
      elig5: {}, // eligibility changes confirmed by staff: laurisId → {choice, at}
      disputes5: {}, // Denial Intelligence: dispute id → {status, option, outcome, approved, closed, notes…}
      unitOverrides: {}, // units configured per payer and service in Settings: 'payer|service' → {unit, units, rule, source}
      flows5: {}, // focused-review progress per case: caseId → {step, retrieved, accepted:{}, inputs:{}, …}
      referral: { 'REF-118': 'needs-call' },
      family: { step: 3 },
      flow: { tw: 'referral' }, // referral → screening → cna → isp → draft → filled → signed
      cases: {}, // overrides: id → partial case fields (stage, stageLabel, clock, next, cta, …)
      actions: {}, // "R-0416.a1" → { done:true, value:'…', at:'10:42 am' }
      boxes: {}, // free per-screen flags (e.g. extension filled states) keyed "screen.name"
      log: [], // {t:'10:42 am', case:'R-0416', text:'…'}
      prefs: { locality: 'both' },
    };
  }

  PSY.data = { payers, cases, referrals, seedState, today: 'Thu, Oct 29', todayLong: 'Thursday, October 29, 2026', persona: { name: 'Jordan Perez', role: 'LPC · Asst. Clinical Support Supervisor', ini: 'JP' } };
})();
