/* Denial Intelligence · one denial (round 11, owner DI11-CASE; round 9 DI-2). Route di-case?case=<caseId> (di-case?id=DI-388 and the older
   step routes denial-detail, partials, p2p-notes, info-request still open it). Active nav: Denial Intelligence; crumbs "Denial Intelligence / <initials>".
   Built like the reference denial page, simpler, with a menu inside the page so one section shows at a time:
     Header card  who · decision · status chip · deadline chip · Open in All Authorizations · Open in Lauris · Update status (PSY.diStatus)
                  the process stepper Decision Received → Clinical Review → Appeal Prepared → Submitted → Payer Response → Resolved
     Menu         Overview · What <payer> said · Clinical evidence · Where the denial is weak · [Reply] · Appeal draft · Peer-to-peer script ·
                  Reconsideration · Documentation request
                  Overview = the seven recommended steps (each with its one-line result), what the payer said vs what the chart shows, the
                  top weak points (strength chip, finding, citation, fix, Add to the evidence)
     History      collapsed at the bottom (the authorization timeline holds every event)
   Round 13 (DI13): "Open" on a recommended step opens a side panel (a right-side slide-over over the page: header with the step, its status
   and ✕; Esc, ✕ or the scrim closes it and focus returns to the step). The panel holds that step's full, working content: the analysis,
   the missing evidence, the documentation request (inline form), the appeal draft (Save · Approve · Prepare Submission · Simulate
   Submission), the peer-to-peer script, the reconsideration and the clinical review (reviewer + note). The page under it does not move.
   A step not run yet starts when its panel opens (analysis, missing evidence, drafts); the documentation request and the clinical review
   wait for the form. While a step is in the panel, its section in the page holds a placeholder (one copy of each editor).
   History = PSY.hist.html(case, { scope: 'denial' }) (owner HIST13) when present; the header has the voice agent's "Call payer" button
   (PSY.voice.button, purpose 'denial-followup'). Both fall back to what was here when the contracts are missing.
   Drafts use PSY.sync (keys appeal|, recon|, info|<caseId>; the peer-to-peer script p2p|<caseId> lives in 87-p2p.js).
   The decision record comes from PSY.di.byCase (owner DI11-LIST, read only); status changes go through PSY.diStatus.set, which updates the authorization.
   Admins without clinical record access (PSY.can('clinicalRecords')) see document names and dates, marked Restricted; drafting needs that access.
   Every factual statement in a draft carries its source in [brackets]; Clinician Input Required items are never filled by Psyflo. No likelihoods. */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const D = () => PSY.di;
  const A = PSY.auth;
  const EV = PSY.ev;
  const DS = () => PSY.diStatus;
  const SY = () => PSY.sync;
  const hub = (cid) => (PSY.data.hub || {})[cid] || {};
  const GEN = {}; // documents being generated right now
  const BUSY = {}; // actions running right now (case|action)
  const SHUT = {}; // claim documents the user collapsed
  const DIC = (PSY.dicase = PSY.dicase || {});
  const ME = () => (PSY.user ? PSY.user().name : 'J. Perez, LPC');

  /* ---------------- correspondence and record excerpts shown in the source viewer ---------------- */
  const CORR = { 'R-0388': 'Call log Oct 27', 'R-0402': 'Call log Oct 27', 'R-0391': 'Call log Oct 29', 'R-0408': 'Availity message Oct 28, 5:40 pm', 'R-0384': 'Anthem denial letter Oct 22' };
  const corrOf = (r) => CORR[r.case] || ((r.decision && r.decision.via) || 'Payer correspondence');
  EV.excerpt('R-0388', 'Call log Oct 27', 'Oct 27 · Sentara Community Plan. Authorization decision: 65 of the 150 units requested approved (AUTH-4441-A). Reasons given on the call: “Can be addressed through the IEP.” and “No way you’re spending 5+ hours with these kids.” Peer-to-peer requested by phone (48 minutes on hold). Sentara offered Dec 9, 2:00 pm, the first available slot.');
  EV.excerpt('R-0402', 'Call log Oct 27', 'Oct 27 · Sentara Community Plan called (logged by the site supervisor): “We’d really like to give you 120.” Reason given: “No way you’re spending 5+ hours with these kids.” Reply by Oct 30. No reply sent yet.');
  EV.excerpt('R-0391', 'Call log Oct 29', 'Oct 29 · Aetna Better Health of Virginia called and offered 110 of the 150 units requested on the new initial SRA (Sfax F-2287). Reason given: “Can be addressed in outpatient.” Reply by Nov 2.');
  EV.excerpt('R-0408', 'Availity message Oct 28, 5:40 pm', 'Oct 28, 5:40 pm · Anthem HealthKeepers Plus on Availity: “Please provide additional clinical information to support medical necessity: (1) frequency and duration of physical aggression within the last 30 days; (2) documentation of prior outpatient treatment and outcome; (3) current IEP supports and why they are insufficient.” Reply within 24 hours.');
  EV.excerpt('R-0384', 'Anthem denial letter Oct 22', 'Oct 22 · Anthem HealthKeepers Plus, read from Availity: none of the 90 units requested approved. Reason: “Already connected to other services.” The letter does not say which services, how often they happen or why they would be enough.');
  EV.excerpt('R-0388', 'Time log October', 'Staff log start and stop times on the Time tab. October average for T.N.: 5 h 12 min a day, including lunch and transitions.');
  EV.excerpt('R-0388', 'IEP meeting Oct 14', 'IEP meeting, Oct 14: the IEP gives a behaviour plan and seating. The school raised an alternative placement.');
  EV.excerpt('R-0388', 'Daily notes Oct 1 – 28', 'Hitting or pushing peers on Oct 1, 3, 8, 10, 15, 17, 22, 24 and 28, 5 to 10 minutes each, needing staff to separate her. 6 of the 9 incidents were at lunch or in transitions.');
  EV.excerpt('R-0388', 'CNA · prior services', 'School counseling weekly since Sep 2025, ongoing, no change. Outpatient therapy at Piedmont Counseling, Jan – May 2026, 11 sessions, closed by the provider as “not making progress”. End date not in the CNA.');
  EV.excerpt('R-0384', 'CNA Oct 8', 'Current services: school counseling once a week in a small group (20 min), a behaviour interventionist twice a week in the classroom (30 min), an IEP check-in/check-out every day (5 min). Prior: play therapy at Valley Child Services, Feb – Jun 2026, 8 sessions; outcome blank. Diagnosis on file: F43.10.');
  EV.excerpt('R-0384', 'School behaviour report', 'Sep 14 – Oct 19: 6 incidents; 4 of the 6 at lunch or in transitions. 3 office referrals and 4 early pickups this term.');

  /* the payer's stated reason → what the record shows (only facts already in the case record) */
  const REASON_MAP = {
    'R-0388': [
      { said: 'Can be addressed through the IEP', shows: 'The IEP gives T.N. a behaviour plan and seating. It gives no clinical staff at lunch and transitions, where 6 of the 9 incidents in the last 30 days happened. The school raised an alternative placement at the Oct 14 IEP meeting.', src: ['IEP meeting Oct 14', 'Daily notes Oct 1 – 28', 'School behaviour report'], rules: ['tdt-loc1'] },
      { said: 'No way you’re spending 5+ hours with these kids', shows: 'Staff log start and stop times on the Time tab. The October average is 5 h 12 min a day, including lunch and transitions. Under the DMAS unit definition, 3 units a day means 5 or more hours.', src: ['Time log October'], rules: ['tdt-units'] },
    ],
    'R-0402': [
      { said: 'No way you’re spending 5+ hours with these kids', shows: 'The request cites the direct-hours log; a typical day is 3 units. Under the DMAS unit definition, 3 units a day means 5 or more hours of service. Three escalations since the Oct 27 call are in the daily notes only.', src: ['Direct-hours log', 'Daily notes since Oct 27'], rules: ['tdt-units'] },
    ],
    'R-0391': [
      { said: 'Can be addressed in outpatient', shows: 'The earlier TDT authorization (80 units) was used in 7 weeks, at 3 units a day on 27 of 35 school days. A step-down to 2 units a day was tried the week of Sep 22 and incidents returned within 3 days. Prior outpatient treatment is not in the record.', src: ['SRA', 'Daily notes'], need: 'Prior outpatient treatment, if any, is not in the Lauris record.', rules: ['tdt-failed'] },
    ],
    'R-0384': [
      { said: 'Already connected to other services', shows: 'School counseling once a week in a small group (20 min), a behaviour interventionist twice a week in the classroom (30 min) and a daily IEP check-in (5 min). None gives clinical help at lunch and transitions, where 4 of 6 incidents happened.', src: ['CNA Oct 8', 'School behaviour report'], need: 'Why each current service is not enough alone is not yet written in the Lauris record.', rules: ['coord'] },
    ],
    'R-0408': [
      { said: '(1) Frequency and duration of physical aggression within the last 30 days', shows: 'Seven dated occasions between Sep 29 and Oct 28, 5 to 15 minutes each, two with office referrals.', src: ['Daily notes Sep 29 – Oct 28', 'School behaviour report'] },
      { said: '(2) Documentation of prior outpatient treatment and outcome', shows: 'Weekly outpatient counseling at Piedmont Counseling, Jan – Apr 2026, nine sessions; ended when the family lost transportation. Incidents did not decrease.', src: ['CNA', 'School behaviour report'], need: 'The Piedmont discharge summary is not attached; the family has been asked.' },
      { said: '(3) Current IEP supports and why they are insufficient', shows: 'Behaviour plan, preferential seating and check-in/check-out, all classroom-based. Five of the seven incidents were in unstructured periods.', src: ['IEP, attached to the referral', 'Daily notes Sep 29 – Oct 28'] },
    ],
  };

  /* ================================================================ the decision record ================================================================ */
  const SHORT = { sentara: 'Sentara', anthem: 'Anthem', aetna: 'Aetna', humana: 'Humana', uhc: 'UHC', ffs: 'FFS' };
  /* PSY.di.byCase (owner DI-1), with anything missing filled from the authorization record */
  function rec(cid) {
    let r = null; try { r = D() && D().byCase ? D().byCase(cid) : null; } catch (e) { console.error('di.byCase', e); }
    if (!r) return null;
    const x = Object.assign({}, r); const m = A.meta(cid) || {}; const u = A.units(cid) || {}; const c = PSY.caseView(cid) || {};
    const pay = (PSY.data.payers || {})[c.payer] || {};
    x.case = x.case || cid; x.m = x.m || m; x.u = x.u || u; x.decision = x.decision || m.decision || {};
    x.who = x.who || c.who || cid; x.ini = x.ini || c.ini || cid; x.school = x.school || c.school || ''; x.laurisId = x.laurisId || m.laurisId || '';
    x.payer = x.payer || c.payer; x.payerName = x.payerName || pay.name || x.payer; x.payerShort = x.payerShort || SHORT[x.payer] || pay.short || x.payer;
    x.serviceLabel = x.serviceLabel || (u.service ? u.service.label : 'TDT'); x.code = x.code || (u.service && u.service.code) || '';
    x.issue = x.issue || x.decision.type || 'denial';
    if (x.requested == null) x.requested = u.requested; if (x.approved == null) x.approved = u.approved != null ? u.approved : x.decision.approved;
    x.reasons = x.reasons || String(x.decision.said || '').split(' · ').map((s) => s.trim().replace(/^[“"]|[”"]$/g, '')).filter(Boolean);
    x.channel = x.channel || (PSY.rules && PSY.rules.channel ? PSY.rules.channel(x.payer) : { method: '' });
    x.issueLabel = x.issueLabel || ({ partial: 'Partial approval', reduction: 'Reduction in requested units', denial: 'Authorization denial', 'cs-denial': 'Concurrent SRA denial', info: 'Additional information request' })[x.issue] || 'Payer decision';
    const lc = PSY.data.lauris && PSY.data.lauris.byCase(cid); const staff = lc && lc.staff ? ((Object.values(PSY.data.lauris.staff || {}).find((s) => s.short === lc.staff) || {}).name || lc.staff) : 'Jordan Perez, LPC';
    x.clinician = staff; x.assigned = x.assigned || staff; x.s = x.s || {};
    return x;
  }
  DIC.rec = rec;
  /* params → case id: ?case=R-0384, ?id=DI-384 / CL-217, or the first open decision */
  function caseOf(params) {
    params = params || {};
    if (params.case && PSY.caseById(params.case)) return params.case;
    const id = params.id;
    if (id) {
      try { const r = D() && D().get ? D().get(id) : null; if (r && r.case) return r.case; } catch (e) {}
      const d = ((PSY.data.r5 || {}).disputes || []).find((x) => x.id === id); if (d) return d.case;
      const m = /^DI-(\d+)$/.exec(id); if (m && PSY.caseById('R-0' + m[1])) return 'R-0' + m[1];
    }
    return 'R-0388';
  }
  DIC.caseOf = caseOf;
  const clinical = () => PSY.can('clinicalRecords');
  DIC.clinical = clinical;
  const st = (cid) => { PSY.state.dicase = PSY.state.dicase || {}; return (PSY.state.dicase[cid] = PSY.state.dicase[cid] || {}); };
  DIC.st = st;
  const dsGet = (cid) => (DS() ? DS().get(cid) : 'new');
  const dsLabel = (s) => (DS() ? DS().label(s) : s);
  const audit = (cid, action) => { if (PSY.audit) PSY.audit.add({ case: cid, action: 'Denial Intelligence: ' + action, by: ME(), status: A.status(cid) }); };
  /* status change through the shared model (it writes the audit and updates the authorization) */
  const setStatus = (cid, s, o) => { if (DS()) DS().set(cid, s, Object.assign({ by: ME() }, o || {})); };
  const pick = (r, key) => { try { if (D() && D().choose && r.id && r.option !== key) D().choose(r.id, key); } catch (e) { console.error('di.choose', e); } };

  /* ================================================================ evidence (section 2) ================================================================ */
  const md = (s) => { const m = /^(\d\d)\/(\d\d)\/\d{4}$/.exec(String(s || '')); return m ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[1] - 1] + ' ' + (+m[2]) : (s || ''); };
  const CATS = [['assess', 'Assessments'], ['plan', 'Treatment plan'], ['notes', 'Progress notes'], ['impair', 'Functional impairment'], ['prior', 'Prior treatment'], ['cs', 'Concurrent SRA documentation']];
  /* each item: cat, doc, date, go (Lauris page), text (what it shows), src (citation label), gap (missing evidence) */
  const EVID = {
    'R-0384': (lid) => [
      { cat: 'assess', doc: 'Admission Screening', date: 'Oct 8', go: 'lauris-screening?c=' + lid, text: 'Processed · signed by J. Perez, LPC.' },
      { cat: 'assess', doc: 'Intake (CNA)', date: 'Oct 8', go: 'lauris-cna?c=' + lid, src: 'CNA Oct 8', text: 'Diagnosis on file: F43.10. Current services: school counseling once a week (small group, 20 min), behaviour interventionist twice a week (classroom, 30 min), IEP check-in/check-out daily (5 min).' },
      { cat: 'plan', doc: 'Individual Service Plan', date: 'Oct 9', go: 'lauris-isp?c=' + lid, src: 'Treatment plan', text: 'Daily help from a trained adult at arrival, transitions and lunch.' },
      { cat: 'notes', doc: 'Daily Progress Notes', date: 'latest Oct 22', go: 'lauris-dpn?c=' + lid, text: 'On file since services started.' },
      { cat: 'impair', doc: 'Intake (CNA)', date: 'Oct 8', go: 'lauris-cna?c=' + lid, src: 'CNA Oct 8', text: 'Hits or kicks peers and staff 1–2 a week (6 in 30 days), 10–25 min, high intensity. Runs from the classroom about weekly, 5–15 min.' },
      { cat: 'impair', doc: 'School behaviour report', date: 'Sep 14 – Oct 19', go: 'lauris-consumer?c=' + lid + '&tab=docs', src: 'School behaviour report', text: '4 of 6 incidents at lunch or in transitions. 3 office referrals, 4 early pickups this term.' },
      { cat: 'prior', doc: 'Intake (CNA)', date: 'Oct 8', go: 'lauris-cna?c=' + lid, src: 'CNA Oct 8', text: 'Play therapy, Valley Child Services, Feb – Jun 2026, 8 sessions.' },
      { cat: 'prior', doc: 'Intake (CNA)', date: 'Oct 8', go: 'lauris-cna?c=' + lid, gap: 'Outcome of the play therapy (Feb – Jun 2026)', rule: 'tdt-failed', k: 'g-prior' },
      { cat: 'impair', doc: 'Intake (CNA)', date: 'Oct 8', go: 'lauris-cna?c=' + lid, gap: 'Why each current service is not enough alone', rule: 'coord', k: 'g-coord' },
      { cat: 'cs', doc: 'Initial SRA REQ-0384', date: 'Oct 12', go: 'lauris-auths?c=' + lid, src: 'Initial SRA Oct 12', text: '90 units, Oct 12 – Jan 9, sent through Availity. Initial SRA: no concurrent SRA yet.' },
      { cat: 'cs', doc: 'Consumer documents', date: '', go: 'lauris-consumer?c=' + lid + '&tab=docs', gap: 'Guardian’s agreement to receive and sign the appeal', rule: 'guardian-appeal', k: 'g-guardian' },
    ],
    'R-0388': (lid) => [
      { cat: 'assess', doc: 'Admission Screening', date: 'Sep 1', go: 'lauris-screening?c=' + lid, text: 'Processed · signed by J. Perez, LPC.' },
      { cat: 'assess', doc: 'Intake (CNA)', date: 'Sep 1', go: 'lauris-cna?c=' + lid, src: 'CNA · prior services', text: 'Diagnosis on file: F91.3. Prior services listed (see Prior treatment).' },
      { cat: 'plan', doc: 'Individual Service Plan', date: 'Sep 2', go: 'lauris-isp?c=' + lid, text: 'Goals and interventions on file.' },
      { cat: 'notes', doc: 'Daily Progress Notes', date: 'Oct 1 – 28', go: 'lauris-dpn?c=' + lid, src: 'Daily notes Oct 1 – 28', text: 'Hitting or pushing peers on 9 dated days, 5–10 min each, staff separated her. 6 of 9 at lunch or in transitions.' },
      { cat: 'notes', doc: 'Daily Progress Note', date: 'Sep 22', go: 'lauris-dpn?c=' + lid + '&past=2026-09-22', text: 'Lunch group: took turns with 1 prompt.' },
      { cat: 'impair', doc: 'School behaviour report', date: 'this term', go: 'lauris-consumer?c=' + lid + '&tab=docs', src: 'School behaviour report', text: 'Classes passing 3 of 6. 3 office referrals.' },
      { cat: 'impair', doc: 'IEP meeting', date: 'Oct 14', go: 'lauris-consumer?c=' + lid + '&tab=docs', src: 'IEP meeting Oct 14', text: 'Behaviour plan and seating. The school raised an alternative placement.' },
      { cat: 'prior', doc: 'Intake (CNA)', date: 'Sep 1', go: 'lauris-cna?c=' + lid, src: 'CNA · prior services', text: 'School counseling weekly since Sep 2025, no change. Outpatient therapy Jan – May 2026, 11 sessions, closed as “not making progress”.' },
      { cat: 'prior', doc: 'Intake (CNA)', date: 'Sep 1', go: 'lauris-cna?c=' + lid, gap: 'End date and reason of the outpatient episode', rule: 'tdt-failed', k: 'g-outpt' },
      { cat: 'cs', doc: 'Concurrent SRA', date: 'Sep 29', go: 'lauris-auths?c=' + lid, src: 'SRA', text: '150 units, Oct 5 – Jan 1, sent by Sfax (F-2240).' },
      { cat: 'cs', doc: 'Time log', date: 'October', go: 'lauris-time', src: 'Time log October', text: 'Average 5 h 12 min a day, including lunch and transitions.' },
    ],
  };
  /* any other case: the Lauris documents with their dates, the record facts the hub holds, and its open criteria as gaps */
  function genericEvidence(r) {
    const cid = r.case; const lid = r.laurisId; const h = hub(cid); const p = h.picture || {}; const U = PSY.l1a; const lc = PSY.data.lauris.byCase(cid);
    const intake = U && lc ? md(U.intake(lc)) : ''; const plan = U && lc ? md(U.planDate(lc)) : '';
    const out = [
      { cat: 'assess', doc: 'Admission Screening', date: intake, go: 'lauris-screening?c=' + lid, text: 'Processed · signed by J. Perez, LPC.' },
      { cat: 'assess', doc: 'Intake (CNA)', date: intake, go: 'lauris-cna?c=' + lid, text: p.diagnosis ? 'Diagnosis on file: ' + p.diagnosis.code + '.' : 'On file.' },
      { cat: 'plan', doc: 'Individual Service Plan', date: plan, go: 'lauris-isp?c=' + lid, text: 'Goals and interventions on file.' },
    ];
    (REASON_MAP[cid] || []).forEach((x) => { const dn = x.src.find((s) => /Daily notes|Daily note/.test(s)); if (dn) out.push({ cat: 'notes', doc: 'Daily Progress Notes', date: dn.replace(/^Daily notes ?/, '') || 'on file', go: 'lauris-dpn?c=' + lid, src: dn, text: x.shows }); });
    if (!out.some((x) => x.cat === 'notes')) out.push({ cat: 'notes', doc: 'Daily Progress Notes', date: lc ? 'latest ' + md(lc.updated) : '', go: 'lauris-dpn?c=' + lid, text: 'On file.' });
    (p.behaviours || []).forEach((b) => out.push({ cat: 'impair', doc: 'Intake (CNA)', date: intake, go: 'lauris-cna?c=' + lid, text: b.name + ': ' + b.freq + ', ' + b.dur + '.' }));
    (p.priorServices || []).forEach((s) => out.push({ cat: 'prior', doc: 'Intake (CNA)', date: intake, go: 'lauris-cna?c=' + lid, text: s.who + ', ' + s.when + '. ' + s.out + '.' }));
    (REASON_MAP[cid] || []).forEach((x, i) => { if (x.need) out.push({ cat: 'prior', doc: 'Lauris record', date: '', go: 'lauris-consumer?c=' + lid, gap: x.need.replace(/\.$/, ''), k: 'g-need' + i }); });
    (h.criteria || []).filter((x) => x.status === 'open' && x.key !== 'units' && x.key !== 'send').forEach((x) => out.push({ cat: 'cs', doc: 'Lauris record', date: '', go: 'lauris-consumer?c=' + lid, gap: x.label || x.short, k: 'g-' + x.key }));
    const cur = r.u && r.u.current;
    out.push(r.m.kind === 'continued'
      ? { cat: 'cs', doc: 'Authorization ' + (r.m.ref || ''), date: cur ? cur.start + ' – ' + cur.end : '', go: 'lauris-auths?c=' + lid, src: 'SRA', text: cur ? cur.remaining + ' of ' + cur.authorized + ' units left.' : 'On file.' }
      : { cat: 'cs', doc: 'Initial SRA ' + (r.m.ref || ''), date: '', go: 'lauris-auths?c=' + lid, text: (r.requested || '') + ' units' + (r.u.period ? ', ' + r.u.period : '') + '. Initial SRA: no concurrent SRA yet.' });
    return out;
  }
  const evidence = (r) => (EVID[r.case] ? EVID[r.case](r.laurisId) : genericEvidence(r));
  const gapsOf = (r) => evidence(r).filter((x) => x.gap).map((x, i) => Object.assign({ k: x.k || 'g' + i }, x));
  DIC.evidence = evidence; DIC.gaps = gapsOf;

  /* ================================================================ AI denial analysis (section 3) ================================================================ */
  const ANALYSIS = {
    'R-0384': {
      documented: [
        { t: 'Current services: school counseling once a week (small group, 20 min), a behaviour interventionist twice a week (classroom, 30 min), an IEP check-in/check-out daily (5 min).', src: ['CNA Oct 8'] },
        { t: '6 incidents in 30 days; 4 of the 6 at lunch or in transitions.', src: ['School behaviour report'] },
        { t: 'Play therapy at Valley Child Services, Feb – Jun 2026, 8 sessions.', src: ['CNA Oct 8'] },
      ],
      weak: [
        { t: 'The record lists the current services but not why each is not enough alone.', src: ['CNA Oct 8'], gap: 'g-coord', fix: 'Write in the CNA why each service is not enough alone' },
        { t: 'The play-therapy outcome is blank, so the record does not show a service that did not work.', src: ['CNA Oct 8'], rule: 'tdt-failed', gap: 'g-prior', fix: 'Add the play-therapy outcome to the CNA' },
      ],
      policy: [
        { t: 'The letter does not name the services it means, how often they happen or why they would be enough. Clarify with Anthem.', src: ['Anthem denial letter Oct 22'], fix: 'Ask Anthem which services it means' },
        { t: 'The letter cites no criterion. Which DMAS TDT criterion the decision applied is not stated.', rule: 'tdt-all3' },
        { t: 'Care coordination is a documentation requirement of every request.', rule: 'coord', fix: 'Show in the appeal how the current services are coordinated' },
      ],
      next: ['Mark for clinical review', 'Collect the 3 missing items in Lauris', 'Prepare the appeal for the guardian to file by Dec 21', 'Ask Anthem whether a peer-to-peer review is available'],
    },
    'R-0388': {
      documented: [
        { t: '9 incidents Oct 1 – 28, 5 to 10 minutes each, staff separated her; 6 of 9 at lunch or in transitions.', src: ['Daily notes Oct 1 – 28'] },
        { t: 'The IEP gives a behaviour plan and seating. The school raised an alternative placement on Oct 14.', src: ['IEP meeting Oct 14'] },
        { t: 'October average 5 h 12 min of service a day, including lunch and transitions.', src: ['Time log October'] },
        { t: 'School counseling weekly since Sep 2025; outpatient Jan – May 2026, 11 sessions, closed as “not making progress”.', src: ['CNA · prior services'] },
        { t: 'Incidents a week: Feb 7, Jun 5, Sep 4, Oct 3.', src: ['Daily notes'] },
      ],
      weak: [
        { t: 'The CNA has no end date or reason for the outpatient episode.', src: ['CNA · prior services'], rule: 'tdt-failed', gap: 'g-outpt', fix: 'Add the end date and reason to the CNA before the call' },
        { t: 'Progress from daily to 3 a week may be raised as a reason to step down.', src: ['Daily notes'], fix: 'Answer with the trend and the goal of once a week before step-down' },
      ],
      policy: [
        { t: '“No way you’re spending 5+ hours”: DMAS defines 3 units a day as 5 or more hours; the time log is the record of hours.', rule: 'tdt-units', src: ['Time log October'], fix: 'Send the October time log' },
        { t: '“Can be addressed through the IEP”: level of care needs one of five listed criteria. Which criterion Sentara applied to the 85 units is not stated.', rule: 'tdt-loc1', fix: 'Ask Sentara which criterion it applied to the 85 units' },
      ],
      next: ['Generate and approve the peer-to-peer script', 'Collect the outpatient end date before the call', 'Hold the peer-to-peer on Dec 9, 2:00 pm', 'The 65 units end Nov 20: ask Sentara about an earlier slot'],
    },
  };
  function analysis(r) {
    const cid = r.case; const map = REASON_MAP[cid] || []; const h = hub(cid); const over = ANALYSIS[cid] || {};
    const reasons = r.issue === 'info' && map.length ? map.map((x) => x.said.replace(/^\(\d\)\s*/, '')) : r.reasons;
    const documented = over.documented || map.map((x) => ({ t: x.shows, src: x.src }));
    const missing = gapsOf(r);
    const weak = over.weak || (h.criteria || []).filter((x) => x.status === 'partial').map((x) => ({ t: (x.label || x.short) + ': ' + x.note }));
    const policy = over.policy || [].concat(...map.map((x) => (x.rules || []).map((k) => ({ t: '“' + x.said.replace(/^\(\d\)\s*/, '') + '”: the correspondence does not say which criterion it applied.', rule: k }))));
    const next = over.next || (r.issue === 'info' ? ['Review the drafted reply', 'Send it before the deadline'] : ['Mark for clinical review', missing.length ? 'Collect the missing items in Lauris' : 'Confirm the evidence with the clinician', 'Choose a response: peer-to-peer, reconsideration or appeal']);
    return { reasons, documented, missing, weak, policy, next };
  }
  DIC.analysis = analysis;

  /* ================================================================ drafts (appeal, reconsideration, reply) ================================================================ */
  const RULE = (k) => (PSY.rules && PSY.rules.byId ? PSY.rules.byId(k) : null);
  const ruleSrc = (x) => (x ? x.source.split(/\.\s+(?=[A-Z])/)[0].replace(/\.$/, '') : '');
  /* the short form for chips: 'DMAS Manual Ch. IV, p. 35', 'Harvest-reported' */
  const ruleShort = (x) => ruleSrc(x).replace('DMAS Mental Health Services Manual, Chapter IV', 'DMAS Manual Ch. IV').replace(/\s\([^()]*(\([^()]*\))?[^()]*\)/g, '');
  const caseRules = (r) => { const keys = []; (REASON_MAP[r.case] || []).forEach((x) => (x.rules || []).forEach((k) => keys.indexOf(k) < 0 && keys.push(k))); ['tdt-clin2', 'tdt-loc1'].forEach((k) => keys.indexOf(k) < 0 && keys.push(k)); return keys.map(RULE).filter((x) => x && x.kind === 'policy'); };
  const q = (s) => String(s || '').replace(/[“”]/g, '"').replace(/[‘’]/g, '\'');
  const sq = (labels) => (labels || []).map((l) => '[' + l + ']').join(' ');
  const KINDS = {
    appeal: { title: 'Appeal draft', doc: (r) => 'Appeal · ' + r.ini, file: 'Appeal' },
    recon: { title: 'Reconsideration request', doc: (r) => 'Reconsideration · ' + r.ini, file: 'Reconsideration' },
    info: { title: 'Additional information', doc: (r) => (r.issue === 'info' ? 'Reply · ' : 'Additional information · ') + r.ini, file: 'Reply' },
    p2p: { title: 'Peer-to-peer script', doc: (r) => 'Peer-to-peer script · ' + r.ini, file: 'Peer-to-peer' },
  };
  const traced = (kind) => kind === 'appeal' || kind === 'recon';
  DIC.traced = traced;
  DIC.KINDS = KINDS;
  /* the structured letter: six sections; factual lines end with their [source]; gaps stay as Clinician Input Required */
  function letterText(r, kind) {
    const an = analysis(r); const dec = r.decision || {}; const corr = corrOf(r); const ap = D() && D().appealBy ? D().appealBy(r) : null;
    const dl = kind === 'appeal' ? (ap || r.deadline) : null;
    const notApproved = (r.requested || 0) - (r.approved || 0);
    const L = [];
    L.push(kind === 'appeal' ? 'APPEAL OF ADVERSE BENEFIT DETERMINATION' : 'REQUEST FOR RECONSIDERATION');
    L.push('To: ' + r.payerName + (kind === 'appeal' ? ', Appeals' : ', Utilization Management'));
    L.push('From: Harvest Outreach Center · ' + r.clinician + ' · license and NPI on file');
    L.push('Re: Member ' + r.ini + ' · Medicaid ID on file · ' + (r.m.ref || '') + ' · ' + r.serviceLabel + (r.code ? ' (' + r.code + ')' : ''));
    L.push('Date: [date of filing]');
    L.push('');
    L.push('1. DENIAL SUMMARY');
    L.push('- ' + r.payerShort + ' decided on ' + (dec.date || '[date]') + ': ' + (r.approved || 0) + ' of ' + r.requested + ' units approved' + (r.u.period ? ' for ' + r.u.period : '') + '. ' + sq([corr]));
    an.reasons.forEach((x) => L.push('- Stated reason: "' + q(x) + '" ' + sq([corr])));
    if (dl && dl.label) L.push('- Response deadline: ' + dl.label + '. [' + (/CFR/.test(dl.src || '') ? '42 CFR 438.402(c)(2)(ii)' : (dl.src || corr)) + ']');
    L.push('');
    L.push('2. RELEVANT MEDICAL-NECESSITY CRITERIA');
    caseRules(r).forEach((x) => L.push('- ' + x.text + ' [' + ruleSrc(x) + ']'));
    L.push('');
    L.push('3. SUPPORTING CLINICAL EVIDENCE');
    an.documented.forEach((x) => L.push('- ' + q(x.t) + ' ' + sq(x.src)));
    L.push('');
    L.push('4. RESPONSE TO THE STATED REASON');
    (REASON_MAP[r.case] || []).forEach((x) => L.push('- On "' + q(x.said.replace(/^\(\d\)\s*/, '')) + '": ' + q(x.shows) + ' ' + sq(x.src)));
    an.missing.forEach((g) => L.push('- [Clinician Input Required: ' + g.gap + ']'));
    L.push('');
    L.push('5. REQUESTED RECONSIDERATION');
    L.push('- Please reconsider the decision and approve the ' + notApproved + ' units not approved' + (r.u.period ? ' for ' + r.u.period : '') + '.');
    L.push('- Harvest Outreach Center can send any record listed below and is available for a peer-to-peer discussion.');
    L.push('');
    L.push('6. SUPPORTING-DOCUMENT CHECKLIST');
    checklist(r).forEach((x) => L.push((x.on ? '[x] ' : '[ ] ') + x.label + (x.on ? '' : ' (not on file)')));
    L.push('');
    if (kind === 'appeal') { L.push('Filed by: the member or guardian (a provider appeal needs the member’s written consent).'); L.push('Guardian signature: ____________________   Date: ____________'); }
    else L.push('Clinician signature: ____________________   Date: ____________');
    return L.join('\n');
  }
  /* documents that go with the letter: the payer's decision + every record the evidence cites */
  function checklist(r) {
    const out = []; const seen = {};
    const add = (label, on, go) => { if (!label || seen[label]) return; seen[label] = 1; out.push({ k: 'd' + out.length, label, on, go }); };
    add(corrOf(r), true, 'lauris-consumer?c=' + r.laurisId + '&tab=docs');
    evidence(r).forEach((x) => { if (x.gap) add(x.gap, false, x.go); else if (x.src || x.cat !== 'notes' || x.date) add(x.doc + (x.date ? ' · ' + x.date : ''), true, x.go); });
    return out;
  }
  DIC.checklist = checklist; DIC.letterText = letterText;
  /* additional information for the payer (an info request's reply, or more information on a reduction offer) */
  function infoText(r) {
    if (r.issue === 'info' && PSY.req && PSY.req.IR) return PSY.req.IR.letterText();
    const b = ((PSY.p2p && PSY.p2p.BRIEFS) || {})[r.case] || {}; const dec = r.decision || {};
    return [
      'Harvest Outreach Center · Group NPI and Tax ID on file', 'Clinical contact: ' + r.clinician + ' · phone on file', '', 'October 29, 2026', 'To: ' + r.payerName + ' · Utilization Management', '',
      'Re: Additional clinical information · Member ' + r.ini + ' · Medicaid ID on file · ' + (r.m.ref || ''), 'Service: ' + r.serviceLabel + (r.code ? ', ' + r.code : ''),
      r.requested + ' units requested' + (r.u.period ? ' for ' + r.u.period : '') + '. ' + (dec.date ? r.payerShort + ' decided on ' + dec.date + ': ' : '') + (r.approved != null ? r.approved + ' ' + (r.issue === 'reduction' ? 'offered' : 'approved') + '.' : 'no decision yet.') + ' [' + corrOf(r) + ']', '',
      'The reasons given were:', r.reasons.map((x) => '"' + q(x) + '" [' + corrOf(r) + ']').join('\n') || 'No reason is stated in the correspondence on file.', '',
      'The member’s record shows:', (b.points || []).map((p, i) => (i + 1) + '. ' + p.t + '. ' + p.x + ' ' + sq(p.ev)).join('\n') || (REASON_MAP[r.case] || []).map((x, i) => (i + 1) + '. ' + x.shows + ' ' + sq(x.src)).join('\n') || '[Clinician Input Required: the records that answer the stated reasons]', '',
      'Sincerely,', r.clinician + ' · license and NPI on file · signed by the clinician on send',
    ].join('\n');
  }
  function draftText(r, kind) { return kind === 'info' ? infoText(r) : letterText(r, kind); }
  /* the decision model's documents follow the same text (its queue reads whether they exist and were reviewed) */
  if (D() && D().builders) {
    D().builders.appeal = (r) => letterText(rec(r.case) || r, 'appeal');
    D().builders.recon = (r) => letterText(rec(r.case) || r, 'recon');
    D().builders.info = (r) => infoText(rec(r.case) || r);
    D().builders.packet = (r) => ['SUPPORTING EVIDENCE PACKET · ' + r.who + ' · ' + r.payerName].concat(checklist(rec(r.case) || r).map((x, i) => (i + 1) + '. ' + x.label + (x.on ? '' : ' (not on file)'))).join('\n');
  }
  /* mirror an action into the decision model (DI-1), ignoring a model that lacks the function */
  const model = (fn, ...a) => { try { if (D() && typeof D()[fn] === 'function') return D()[fn](...a); } catch (e) { console.error('di.' + fn, e); } return null; };
  DIC.model = model;
  const dkey = (kind, cid) => kind + '|' + cid;
  DIC.key = dkey;
  const doc = (kind, cid) => (SY() ? SY().get(dkey(kind, cid)) : null);
  function ensureDraft(kind, r, at) {
    const k = dkey(kind, r.case); if (doc(kind, r.case)) return doc(kind, r.case);
    const d = SY().init(k, { original: '', ai: draftText(r, kind), label: KINDS[kind].doc(r) });
    if (at) { d.at = at; (d.history || []).forEach((h) => { h.at = at; }); PSY.save(); } // a draft that already existed in the scenario (E.C. Oct 26, K.T. Oct 28)
    return d;
  }
  DIC.ensureDraft = ensureDraft;
  /* traceability: every evidence/response line cites a [document]; Clinician Input Required items are completed by the clinician */
  function trace(text) {
    const lines = String(text || '').split('\n'); let sec = 0; const uncited = []; const input = [];
    lines.forEach((l) => {
      const h = /^(\d)\.\s+[A-Z]/.exec(l); if (h) { sec = +h[1]; return; }
      if (/Clinician Input Required/.test(l)) { input.push(l.replace(/^-\s*/, '')); return; }
      if ((sec === 3 || sec === 4) && /^\s*[-•]\s*\S/.test(l) && !/\[[^\]]{2,}\]/.test(l)) uncited.push(l.replace(/^\s*[-•]\s*/, ''));
    });
    return { uncited, input, ok: !uncited.length && !input.length };
  }
  DIC.trace = trace;
  const subOf = (cid, kind) => ((st(cid).sub || {})[kind]) || {};
  const confOf = (r) => { const n = (+String(r.case).replace(/\D/g, '')) % 1000; const m = (r.channel && r.channel.method) || ''; return m === 'Availity' ? 'AV-' + (77000 + n) : m === 'Sfax' ? 'F-' + (2000 + n) : 'SUB-' + (5000 + n); };

  /* ================================================================ page pieces ================================================================ */
  const simChip = () => EV.label('illustrative', 'Simulated');
  const RESTRICTED = () => '<span class="dc-rs" data-psy="restricted"><i aria-hidden="true">🔒</i>Restricted · clinical access</span>';
  const secHead = (title, extra) => '<div class="dw-h"><h2>' + esc(title) + '</h2>' + (extra ? '<span class="dw-hs">' + extra + '</span>' : '') + '</div>';
  const cites = (labels, cid) => (labels || []).map((l) => EV.cite(l, cid)).join(' ');
  const ruleChip = (k) => { const x = RULE(k); return x ? '<span class="dc-rule" title="' + esc(x.text + ' — ' + x.source) + '">' + PSY.rules.chip(x) + '<span>' + esc(ruleShort(x)) + '</span></span>' : ''; };
  const docLink = (x) => '<button class="dc-doc" data-go="' + esc(x.go) + '" title="Open in Lauris"><b>' + esc(x.doc) + '</b>' + (x.date ? '<span>' + esc(x.date) + '</span>' : '') + '<i aria-hidden="true">↗</i></button>';
  const enhanceBtn = (x, r) => '<button class="pi-link dc-enh" data-act="dic-enhance" data-go-to="' + esc(x.go) + '" data-case="' + esc(r.case) + '">' + (PSY.can('enhance') ? 'Open in Lauris · Scan & Enhance' : 'Open in Lauris') + '</button>';
  /* the page's view key: the case for an authorization decision, the record id for a claim */
  const vOf = (r) => (r.isClaim ? r.id : r.case);
  const secBtn = (r, sec, label, cls) => '<button type="button" class="' + (cls || 'pi-link') + '" data-act="dic-sec" data-sec="' + sec + '" data-v="' + esc(vOf(r)) + '">' + esc(label) + '</button>';
  const FINAL = ['overturned', 'partover', 'upheld', 'closed'];
  const andList = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);

  /* ---------------- the header card: who, decision, status, deadline, the process stepper, links, Update status ---------------- */
  const ISSUE_TONE = { partial: 'amber', reduction: 'amber', denial: 'red', 'cs-denial': 'red', info: 'blue', 'claim-denial': 'red', 'claim-rejection': 'amber' };
  const issueChip = (r) => '<span class="st5 t-' + (ISSUE_TONE[r.issue] || 'gray') + '" data-psy="di-issue">' + esc(r.issueLabel) + '</span>';
  const statusChip = (cid) => { const s = dsGet(cid); return '<span class="dc-stc" data-psy="di-status-label">' + (D() && D().statusBadge ? D().statusBadge(s) : '<span class="st5 t-gray">' + esc(dsLabel(s)) + '</span>') + '</span>'; };
  function deadlineChip(r) {
    const unv = '<span data-psy="di-deadline">' + EV.label('unverified', 'Deadline not verified') + '</span>';
    if (r.isClaim) return r.closed ? '' : unv;
    const dl = r.deadline; if (!dl || r.closed || FINAL.indexOf(dsGet(r.case)) >= 0) return '';
    if (dl.verify) return unv;
    const sub = String(dl.sub || 'deadline'); let n = null; try { n = dl.ms != null && D() && D().dayDiff ? D().dayDiff(dl.ms) : null; } catch (e) { n = null; }
    return '<span class="dc-dl' + (n != null && n <= 7 ? ' soon' : '') + '" data-psy="di-deadline"' + (dl.src ? ' title="' + esc('Source: ' + dl.src) + '"' : '') + '><i aria-hidden="true">●</i>' + esc(sub.charAt(0).toUpperCase() + sub.slice(1)) + ' · <b>' + esc(dl.label) + '</b></span>';
  }
  const STEPMAP = { new: 0, review: 1, docs: 1, drafted: 2, submitted: 3, awaiting: 3, overturned: 5, partover: 5, upheld: 5, closed: 5 };
  function stepper(r) {
    const cid = r.case; const step = DS() ? DS().step(cid) : 0; const recd = DS() && DS().rec ? DS().rec(cid) : null; const hist = (recd && recd.history) || [];
    const whenOf = (i) => { if (i === 0) return (r.decision && r.decision.date) || r.opened || ''; const h = hist.find((x) => STEPMAP[x.status] >= i); return h ? String(h.at || '').replace(/^Oct 29 · /, '') : ''; };
    return '<ol class="dc-tl" data-psy="di-timeline" data-step="' + step + '" aria-label="Where this decision is">' + (DS() ? DS().TIMELINE : []).map((s, i) =>
      '<li class="' + (i < step ? 'done' : i === step ? 'now' : '') + '" data-k="' + s[0] + '"' + (i === step ? ' aria-current="step"' : '') + '><i aria-hidden="true">' + (i < step ? '✓' : i + 1) + '</i><b>' + esc(s[1]) + '</b><span>' + esc(i <= step ? whenOf(i) : '') + '</span></li>').join('') + '</ol>';
  }
  /* Update status: a small menu in the header (the status list of PSY.diStatus; final outcomes take the approved units) */
  function updateMenu(r) {
    const cid = r.case; const cur = dsGet(cid);
    const opts = (DS() ? DS().LIST : []).map((s) => '<option value="' + s[0] + '"' + (s[0] === cur ? ' selected' : '') + '>' + esc(s[1]) + '</option>').join('');
    return '<details class="dc-upd" data-psy="di-update"><summary class="btn o s">Update status<i aria-hidden="true">▾</i></summary><div class="dc-upd-p">' +
      '<label>Status<select class="fld" id="dc-status" data-change="dic-status-pick" data-case="' + esc(cid) + '">' + opts + '</select></label>' +
      '<label class="dc-u" id="dc-units-l" hidden>Approved units<input class="fld" id="dc-units" type="number" min="0" max="' + (r.requested || 0) + '"></label>' +
      '<label>Note<input class="fld" id="dc-note" placeholder="Optional"></label><div class="dw-err" id="dc-st-err" role="alert"></div>' +
      '<button class="btn p s" data-act="dic-status-save" data-case="' + esc(cid) + '">Save status</button></div></details>';
  }
  function header(r, o) {
    o = o || {}; const cid = r.case; const c = r.claim || {};
    const units = r.isClaim ? '' : r.issue === 'info' && r.approved == null ? (r.requested ? r.requested + ' units requested' : '') : r.requested != null ? (r.approved || 0) + ' of ' + r.requested + ' units ' + (r.issue === 'reduction' ? 'offered' : 'approved') : '';
    const req = r.isClaim ? [c.no ? 'Claim ' + c.no : '', c.billed, c.dos ? 'dates of service ' + c.dos : ''] : [(r.m.kind === 'continued' ? 'Concurrent SRA' : 'Initial SRA') + (r.m.ref ? ' ' + r.m.ref : '')];
    const line = [r.payerName, r.serviceLabel + (r.code ? ' (' + r.code + ')' : '')].concat(req, [units]).filter(Boolean).map(esc).join(' · ') + (r.id ? ' · <span class="dc-nw">' + esc(r.id) + '</span>' : '');
    const links = '<button class="btn o s" data-go="auth-detail?case=' + esc(cid) + '" data-psy="open-auth">Open in All Authorizations</button>' +
      '<button class="btn o s" data-act="dic-enhance" data-go-to="lauris-consumer?c=' + esc(r.laurisId) + '" data-case="' + esc(cid) + '" data-psy="open-lauris"' + (PSY.can('enhance') ? ' title="Opens Scan &amp; Enhance"' : '') + '>Open in Lauris</button>';
    const chips = o.chips != null ? o.chips : statusChip(cid) + deadlineChip(r) + '<span class="dc-auth" data-psy="di-auth"><span class="dc-mut">Authorization</span>' + A.badge(A.status(cid)) + '</span>';
    /* round 13: the voice agent calls the payer about this decision (owner HIST13: PSY.voice) */
    let voice = ''; if (!r.isClaim && PSY.voice && typeof PSY.voice.button === 'function') { try { voice = PSY.voice.button(cid, { purpose: 'denial-followup', scope: 'denial', small: true }) || ''; } catch (e) { console.error('voice.button', e); } }
    if (voice) voice = '<span class="dc-voice" data-psy="di-voice">' + voice + '</span>';
    return '<section class="card dc-hd" id="sec-status" data-psy="di-head">' +
      '<div class="dc-hd-t"><div class="dc-hd-l"><h1>' + esc(r.who) + '</h1>' + issueChip(r) + '</div><div class="dc-hd-a">' + (o.menu || '') + voice + links + '</div></div>' +
      '<div class="dc-hd-c">' + chips + '</div><p class="dc-hd-s">' + line + '</p>' + (o.stepper === false ? '' : stepper(r)) + '</section>';
  }

  /* units at risk and their value: only with a rate configured in Settings (PSY.money), otherwise a dash with the reason as its tooltip */
  function exposure(r) {
    const n = r.atRisk != null ? r.atRisk : Math.max(0, (r.requested || 0) - (r.approved || 0)); if (!n) return '';
    const ex = r.exposure || (PSY.money ? PSY.money.exposure(n, r.payer, r.serviceKey || 'tdt') : { ok: false });
    return '<small data-psy="exposure">' + n + ' units at risk · ' + (ex.ok ? '<span class="mx5">' + esc(ex.text) + '</span>' : '<span class="mx5 na" title="' + esc(PSY.money ? PSY.money.UNAVAILABLE : '') + '">—</span>') + '</small>';
  }
  const saidTitle = (r) => (r.issue === 'info' ? 'What ' + r.payerShort + ' asked' : 'What ' + r.payerShort + ' said');

  /* ---------------- Overview: recommended next steps (7), what the payer said vs what the chart shows, the top weak points ---------------- */
  const ACTIONS = [
    ['analyze', 'Analyze Denial'], ['gaps', 'Identify Missing Evidence'], ['docreq', 'Request Additional Documentation'], ['appeal', 'Generate Appeal Draft'],
    ['p2p', 'Generate Peer-to-Peer Script'], ['recon', 'Prepare Reconsideration'], ['review', 'Mark for Clinical Review'],
  ];
  const NEEDS_CLIN = { appeal: 1, p2p: 1, recon: 1 };
  DIC.ACTIONS = ACTIONS;
  function actionResult(r, k) {
    const s = st(r.case); const cid = r.case;
    if (k === 'analyze') return s.analyzed ? 'Analyzed ' + s.analyzed.at : '';
    if (k === 'gaps') return s.gaps ? (gapsOf(r).length ? gapsOf(r).length + ' missing' : 'None missing') : '';
    if (k === 'docreq') { const q2 = s.docreq; if (!q2) return ''; const n = q2.items.filter((x) => !x.got).length; return n ? n + ' requested · ' + q2.to : 'All received'; }
    if (k === 'appeal' || k === 'recon') { const d = doc(k, cid); const sb = subOf(cid, k); if (!d) return ''; return sb.submitted ? 'Submitted · ' + sb.submitted.conf : sb.prepared ? 'Package prepared' : d.stage === 'approved' ? 'Approved' : d.stage === 'edited' ? 'Edited' : 'AI Draft'; }
    if (k === 'p2p') { const d = doc('p2p', cid); if (!d) return ''; const v = (d.history || []).filter((h) => h.stage === 'approved').length; return d.stage === 'approved' ? 'Approved version ' + v : d.stage === 'edited' ? 'Edited' : 'AI Draft'; }
    if (k === 'review') return s.review ? 'Clinical review · ' + s.review.to : '';
    return '';
  }
  function actionDeadline(r, k) {
    let o = null; try { o = D() && D().optDefs ? D().optDefs(r)[k] : null; } catch (e) { o = null; }
    return o && o.deadline ? (D().deadlineHtml ? D().deadlineHtml(o.deadline, (o.rules || []).map(RULE).filter(Boolean)) : esc(o.deadline.label)) : '';
  }
  function secActions(r) {
    const cid = r.case; const can = clinical();
    const nx = r.next && r.next.label && !r.next.none ? '<div class="dc-next" data-psy="di-next"><span class="cap5">Next</span><b>' + esc(r.next.label) + '</b><span class="dc-mut">' + esc(r.assigned) + '</span></div>' : '';
    const done = ACTIONS.filter((a) => actionResult(r, a[0])).length;
    const rows = ACTIONS.map((a, i) => {
      const k = a[0]; const busy = BUSY[cid + '|' + k] || GEN[cid + '|' + k]; const res = actionResult(r, k); const locked = NEEDS_CLIN[k] && !can;
      const dl = (k === 'appeal' || k === 'p2p' || k === 'recon') && r.issue !== 'info' ? actionDeadline(r, k) : '';
      const cur = r.option === k || (k === 'docreq' && r.option === 'evidence');
      const bits = [];
      if (locked) bits.push('<span class="dc-mut"><i aria-hidden="true">🔒</i> Clinical record access required</span>');
      else if (busy) bits.push('<span class="dc-mut">Working…</span>');
      else if (res) bits.push('<span class="dc-ok"' + (k === 'review' ? ' data-psy="out-review"' : '') + '>' + esc(res) + '</span>');
      if (dl) bits.push('<span class="dc-act-dl">Deadline ' + dl + '</span>');
      if (cur) bits.push('<span class="st5 t-blue"><i aria-hidden="true">●</i>Current pathway</span>');
      return '<li class="dc-act' + (res ? ' done' : '') + (cur ? ' cur' : '') + '" data-psy="action" data-k="' + k + '">' +
        '<button class="dc-act-b" data-act="dic-act" data-k="' + k + '" data-case="' + esc(cid) + '" aria-haspopup="dialog"' + (SPN && SPN.v === cid && SPN.k === k ? ' aria-expanded="true"' : '') + (busy || locked ? ' disabled' : '') + (locked ? ' title="Clinical record access required"' : '') + '>' +
        '<span class="dc-act-n" aria-hidden="true">' + (busy ? '<span class="dw-spin"></span>' : res ? '✓' : i + 1) + '</span>' +
        '<span class="dc-act-t"><b>' + esc(a[1]) + '</b>' + (bits.length ? '<span class="dc-act-r" data-psy="action-result">' + bits.join('') + '</span>' : '') + '</span>' +
        '<span class="dc-act-go" aria-hidden="true">' + (busy || locked ? '' : 'Open<i>›</i>') + '</span></button></li>';
    }).join('');
    return '<section class="card dw-sec" id="sec-actions" data-psy="di-actions">' + secHead('Recommended next steps', '<span class="dc-mut" data-psy="actions-done">' + done + ' of ' + ACTIONS.length + ' done</span>') + nx + '<ol class="dc-acts">' + rows + '</ol></section>';
  }
  /* what the payer said (its words) next to what the chart shows (record facts with their sources) */
  function saidCard(r) {
    const can = clinical(); const map = REASON_MAP[r.case] || [];
    const pairs = map.length ? map : r.reasons.map((x) => ({ said: x }));
    const rows = pairs.map((x) => '<div class="dc-vs" data-psy="said-shows"><blockquote class="dc-said">“' + esc(String(x.said).replace(/^\(\d\)\s*/, '').replace(/^[“"]|[”"]$/g, '')) + '”</blockquote>' +
      '<div class="dc-shows"><span class="cap5">What the chart shows</span>' + (x.shows ? (can ? '<p>' + esc(x.shows) + ' ' + cites(x.src, r.case) + '</p>' : '<p>' + RESTRICTED() + ' <span class="dc-mut">' + esc((x.src || []).join(' · ')) + '</span></p>') : '<p class="dc-mut">Not compared yet</p>') +
      (x.need && can ? '<p class="dc-need">' + EV.label('need', 'Not documented') + ' ' + esc(x.need) + '</p>' : '') + '</div></div>').join('');
    return '<section class="card dw-sec" data-psy="di-said">' + secHead(saidTitle(r), secBtn(r, 'decision', 'Decision details')) + '<div class="dw-b">' + (rows || '<p class="dw-p dw-mut">No reason stated</p>') +
      '<div class="dw-src">' + EV.label('corr') + EV.cite(corrOf(r), r.case) + '</div></div></section>';
  }
  /* where the denial is weak: each point with a strength chip, the finding, its citation, the fix and an action.
     Strong = the record answers a stated reason · Gap = not documented yet · Clarify = the payer did not state its criterion · Risk = a documentation weakness */
  const WK = { strong: ['green', 'Strong'], gap: ['red', 'Gap'], clarify: ['blue', 'Clarify'], risk: ['amber', 'Risk'] };
  function weakPoints(r) {
    const an = analysis(r); const out = [];
    (REASON_MAP[r.case] || []).forEach((x, i) => out.push({ k: 'r' + i, kind: 'strong', title: 'The record answers “' + x.said.replace(/^\(\d\)\s*/, '') + '”', text: x.shows, src: x.src, clin: true, fix: 'Attach ' + andList(x.src) + ' to the response', add: true }));
    const same = (g) => an.weak.find((x) => x.gap && x.gap === g.k);
    an.missing.forEach((g) => { const w = same(g); out.push({ k: 'g-' + g.k, kind: 'gap', title: g.gap, doc: g, rule: g.rule, fix: w && w.fix ? w.fix : 'Collect it in ' + g.doc + '; drafts keep it as Clinician Input Required', collect: g }); });
    an.policy.forEach((x, i) => out.push({ k: 'p' + i, kind: 'clarify', title: x.t, src: x.src, rule: x.rule, fix: x.fix || 'Ask ' + r.payerShort + ' which criterion it applied' }));
    an.weak.forEach((x, i) => (x.gap && an.missing.some((g) => g.k === x.gap)) || out.push({ k: 'w' + i, kind: 'risk', title: x.t, src: x.src, rule: x.rule, clin: true, fix: x.fix || 'Strengthen it in Lauris before the response', enhance: !x.fix }));
    return out;
  }
  DIC.weakPoints = weakPoints;
  function weakRow(r, w, compact) {
    const can = clinical(); const t = WK[w.kind]; const cid = r.case; const added = (st(cid).added || {})[w.k]; const hide = w.clin && !can;
    const title = w.kind === 'risk' && hide ? 'Documentation weakness' : w.title;
    const body = w.text && !compact ? (hide ? '<p>' + RESTRICTED() + '</p>' : '<p>' + esc(w.text) + '</p>') : w.kind === 'risk' && hide ? '<p>' + RESTRICTED() + '</p>' : '';
    const refs = (w.doc ? docLink(w.doc) : '') + (w.src ? (hide ? '<span class="dc-mut">' + esc(w.src.join(' · ')) + '</span>' : cites(w.src, cid)) : '') + (w.rule ? ruleChip(w.rule) : '');
    let btn = '';
    if (w.add) btn = added ? '<span class="st5 t-green" data-psy="added"><i aria-hidden="true">✓</i>In the evidence</span>' : '<button class="btn o s" data-act="dic-add-ev" data-case="' + esc(cid) + '" data-k="' + esc(w.k) + '"' + (can ? '' : ' disabled title="Clinical record access required"') + '>Add to the evidence</button>';
    else if (w.collect) btn = '<button class="btn o s" data-act="dic-enhance" data-go-to="' + esc(w.collect.go) + '" data-case="' + esc(cid) + '" title="' + (PSY.can('enhance') ? 'Open in Lauris · Scan &amp; Enhance' : 'Open in Lauris') + '">Collect in Lauris</button>';
    else if (w.enhance && !hide) btn = '<button class="btn o s" data-act="dic-enhance" data-go-to="lauris-consumer?c=' + esc(r.laurisId) + '" data-case="' + esc(cid) + '">' + (PSY.can('enhance') ? 'Scan &amp; Enhance' : 'Open in Lauris') + '</button>';
    return '<div class="dc-wp" data-psy="weak-point" data-kind="' + w.kind + '" data-k="' + esc(w.k) + '"><span class="st5 t-' + t[0] + ' dc-wp-c">' + t[1] + '</span><div class="dc-wp-b"><b>' + esc(title) + '</b>' + body +
      '<div class="dc-wp-f">' + refs + '<span class="dc-wp-fix">Fix: ' + esc(w.fix) + '</span>' + btn + '</div></div></div>';
  }
  /* the weak points: the top few on the Overview (limit), all of them in their section */
  function weakCard(r, limit) {
    const s = st(r.case); const cid = r.case; const psy = limit ? 'di-weak-top' : 'di-weak'; const id = limit ? '' : ' id="sec-weak"';
    if (BUSY[cid + '|analyze']) return '<section class="card dw-sec" data-psy="' + psy + '"' + id + '>' + secHead('Where the denial is weak') + '<div class="dw-load" role="status"><span class="dw-spin" aria-hidden="true"></span>Reading the decision and the record…</div></section>';
    if (!s.analyzed) return '<section class="card dw-sec" data-psy="' + psy + '"' + id + '>' + secHead('Where the denial is weak') + '<div class="dc-empty"><span class="dw-mut">Not analyzed yet</span><button class="btn p s" data-act="dic-act" data-k="analyze" data-case="' + esc(cid) + '">Analyze Denial</button></div></section>';
    const all = weakPoints(r); const list = limit ? all.slice(0, limit) : all;
    const extra = limit ? (all.length > limit ? secBtn(r, 'weak', 'See all ' + all.length, 'btn o s') : '') : EV.label('ai', 'AI analysis') + '<span class="dw-mut">' + esc(s.analyzed.at || '') + '</span>';
    return '<section class="card dw-sec" data-psy="' + psy + '"' + id + '>' + secHead('Where the denial is weak', extra) + '<div class="dc-wk">' + (list.map((w) => weakRow(r, w, !!limit)).join('') || '<p class="dw-mut dc-none">None found</p>') + '</div></section>';
  }
  /* the full analysis: every weak point, what the record supports, the suggested order */
  function secWeak(r) {
    const s = st(r.case); if (!s.analyzed || BUSY[r.case + '|analyze']) return weakCard(r, 0);
    const an = analysis(r); const can = clinical();
    const li = (x) => '<li>' + esc(x.t) + (x.src ? ' ' + cites(x.src, r.case) : '') + (x.rule ? ' ' + ruleChip(x.rule) : '') + '</li>';
    const docd = an.documented.length ? (can ? '<ul>' + an.documented.map(li).join('') + '</ul>' : '<ul>' + an.documented.map((x) => '<li>' + (x.src ? esc(x.src.join(' · ')) + ' ' : '') + RESTRICTED() + '</li>').join('') + '</ul>') : '<p class="dw-mut dc-none">None found</p>';
    return weakCard(r, 0) + '<section class="card dw-sec" data-psy="di-analysis"><div class="dc-ans">' +
      '<div class="dc-an" data-an="documented"><h3>What the record supports</h3>' + docd + '</div>' +
      '<div class="dc-an" data-an="next"><h3>Suggested order</h3><ol>' + an.next.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ol></div></div></section>';
  }

  /* ---------------- What the payer said: its words, the decision facts, the options for this decision ---------------- */
  function secDecision(r) {
    const dec = r.decision || {}; const corr = corrOf(r); const m = r.m || {}; const u = r.u || {};
    const reasonsQ = r.issue === 'info' && PSY.req && PSY.req.IR ? '<blockquote class="dc-said">' + esc(PSY.req.IR.quote) + '</blockquote>' : r.reasons.map((x) => '<blockquote class="dc-said">“' + esc(x) + '”</blockquote>').join('');
    const dl = r.deadline || null;
    const rules = [].concat(...(REASON_MAP[r.case] || []).map((x) => x.rules || [])).filter((k, i, a) => a.indexOf(k) === i);
    const sentLine = (hub(r.case).history || []).find((h) => /sent|Sent/.test(h.text)) || ((PSY.data.r5.timelinePrefix || {})[r.case] || []).find((h) => /Sent/.test(h.text));
    const facts = [
      ['Payer', esc(r.payerName)],
      ['Decision date', esc(dec.date || r.opened || '—') + (dec.via ? '<small>' + esc(dec.via) + '</small>' : '')],
      ['Original request', (r.requested != null ? r.requested + ' units' : '—') + '<small>' + esc([u.period, m.kind === 'continued' ? 'concurrent SRA' : 'initial', m.ref].filter(Boolean).join(' · ')) + (sentLine ? ' · sent ' + esc(sentLine.t) : '') + '</small>'],
      ['Approved / not approved', (r.issue === 'info' && r.approved == null ? '<span class="dc-mut">Not decided yet</span>' : '<span class="dc-ok">' + (r.approved || 0) + '</span> / <span class="dc-no">' + ((r.requested || 0) - (r.approved || 0)) + '</span> units') + exposure(r)],
      ['Response deadline', dl ? (dl.verify ? EV.label('unverified', 'Deadline not verified') : '<b>' + esc(dl.label) + '</b>' + (dl.sub ? ' · ' + esc(dl.sub) : '')) + (dl.src ? '<small data-psy="deadline-src">' + esc(dl.src) + '</small>' : '') : '—'],
      ['Policy reference', (rules.length ? rules.map(ruleChip).join('') : '') + '<small>' + esc(r.payerShort) + '’s correspondence cites no policy · ' + esc(PSY.rules.VERIFY) + '</small>'],
    ];
    const rva = D() && D().rvaHtml ? D().rvaHtml(r, { big: false }) : '';
    return '<section class="card dw-sec" id="sec-decision" data-psy="di-sec-1">' + secHead(saidTitle(r), A.badge(A.status(r.case))) +
      '<div class="dw-b">' + (reasonsQ || '<p class="dw-p dw-mut">No reason stated</p>') +
      '<div class="dw-src">' + EV.label('corr') + EV.cite(corr, r.case) + '</div>' +
      '<dl class="dc-facts">' + facts.map((f) => '<div><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>').join('') + '</dl>' + (rva ? '<div class="dc-rva">' + rva + '</div>' : '') + '</div></section>' + secOptions(r);
  }
  /* the decision's other options (accept, alternative, more information, reply) that the seven steps do not cover */
  function secOptions(r) {
    if (!D() || !D().options) return '';
    let opts = []; try { opts = D().options(r).filter((o) => ['accept', 'alt', 'evidence', 'reply'].indexOf(o.key) >= 0); } catch (e) { opts = []; }
    if (!opts.length) return '';
    const done = r.closed || FINAL.indexOf(dsGet(r.case)) >= 0;
    const row = (o) => {
      const cur = r.option === o.key; let btn = '';
      if (cur) btn = '<span class="st5 t-blue"><i aria-hidden="true">●</i>' + (o.key === 'accept' ? 'Chosen' : 'Current') + '</span>';
      else if (o.key === 'reply') btn = secBtn(r, 'info', 'Open the reply', 'btn o s');
      else if (!done) btn = '<button class="btn o s" data-act="dic-opt" data-k="' + o.key + '" data-case="' + esc(r.case) + '"' + (o.key === 'evidence' && !clinical() ? ' disabled title="Clinical record access required"' : '') + '>' + esc(o.key === 'accept' ? o.label : 'Select') + '</button>';
      return '<div class="dw-opt' + (cur ? ' cur' : '') + '" data-opt="' + o.key + '"><div class="dw-opt-b"><h3>' + esc(o.label) + '</h3>' +
        (o.obs ? '<div class="dw-obs">' + EV.label('observed') + ' ' + esc(o.obs.text) + ' <span class="dw-mut">(' + esc(o.obs.source) + ')</span></div>' : '') +
        '<div class="dw-opt-m"><span class="cap5">Deadline</span><div class="dw-opt-v">' + D().deadlineHtml(o.deadline, o.rules) + '</div></div>' +
        (o.lauris && !done ? '<div style="margin-top:8px"><button class="btn o s" data-go="' + esc(o.lauris) + '">Prepare it in Lauris</button></div>' : '') + '</div><div class="dw-opt-a">' + btn + '</div></div>';
    };
    return '<section class="card dw-sec" id="sec-options" data-psy="di-options">' + secHead('Options for this decision') + '<div class="dw-opts">' + opts.map(row).join('') + '</div></section>';
  }

  /* ---------------- Clinical evidence: by category, each document with its date and a link to Lauris; gaps → Scan & Enhance ---------------- */
  function secEvidence(r) {
    const items = evidence(r); const can = clinical(); const gapsShown = !!st(r.case).gaps;
    const rows = CATS.map((c) => {
      const its = items.filter((x) => x.cat === c[0]); if (!its.length) return '';
      return '<div class="dc-cat" data-cat="' + c[0] + '"><div class="dc-cat-h">' + esc(c[1]) + '</div>' + its.map((x) => {
        if (x.gap) return '<div class="dc-ev gap' + (gapsShown ? ' hl' : '') + '" data-psy="ev-gap" data-k="' + esc(x.k || '') + '"><div class="dc-ev-d">' + docLink(x) + '</div><div class="dc-ev-t">' + EV.label('need', 'Not documented') + ' <b>' + esc(x.gap) + '</b>' + (x.rule ? ruleChip(x.rule) : '') + '<div>' + enhanceBtn(x, r) + '</div></div></div>';
        return '<div class="dc-ev" data-psy="ev-item"><div class="dc-ev-d">' + docLink(x) + '</div><div class="dc-ev-t">' + (can ? esc(x.text || '') + (x.src ? ' ' + EV.cite(x.src, r.case, 'Source') : '') : RESTRICTED()) + '</div></div>';
      }).join('') + '</div>';
    }).join('');
    return '<section class="card dw-sec" id="sec-evidence" data-psy="di-sec-2">' + secHead('Clinical evidence', can ? EV.label('ehr', 'Read from Lauris · 10:36 am') : RESTRICTED()) + '<div class="dw-c">' + rows + '</div></section>';
  }

  /* ---------------- drafting: appeal / reconsideration / reply (PSY.sync) ---------------- */
  const DRAFT_TITLE = (r, kind) => (kind === 'info' ? (r.issue === 'info' ? 'Reply to ' + r.payerShort + '’s request' : 'Additional information for ' + r.payerShort) : KINDS[kind].title);
  function secDraft(r, kind) {
    const cid = r.case; const d = doc(kind, cid); const gk = cid + '|' + kind;
    const id = 'sec-' + kind; const title = DRAFT_TITLE(r, kind);
    if (GEN[gk]) return '<section class="card dw-sec" id="' + id + '" data-psy="draft-' + kind + '">' + secHead(title) + '<div class="dw-load" role="status"><span class="dw-spin" aria-hidden="true"></span>Assembling clinical evidence…</div></section>';
    if (!d) return '';
    if (!clinical()) return '<section class="card dw-sec" id="' + id + '" data-psy="draft-' + kind + '">' + secHead(title, flowChip(d, subOf(cid, kind))) + '<div class="dw-c">' + RESTRICTED() + '</div></section>';
    const sb = subOf(cid, kind); const submitted = !!sb.submitted; const appr = d.stage === 'approved';
    const tr = traced(kind) ? trace(d.text) : { ok: true, uncited: [], input: [] };
    const flow = '<ol class="sy-flow dc-flow" data-psy="draft-flow" data-stage="' + (submitted ? 'submitted' : sb.prepared && appr ? 'prepared' : d.stage) + '">' + [['ai', 'AI Draft'], ['edited', 'Clinician Edited'], ['approved', 'Approved'], ['prepared', 'Package prepared'], ['submitted', 'Submitted']].map((s, i) => {
      const at = submitted ? 4 : sb.prepared && appr ? 3 : appr ? 2 : d.stage === 'edited' ? 1 : 0;
      return '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '">' + s[1] + '</li>'; }).join('') + '</ol>';
    const stateChip = '<span class="sy-st t-' + (submitted ? 'green' : appr ? 'blue' : d.state === 'unsaved' ? 'amber' : 'gray') + '" data-psy="draft-state" data-k="' + kind + '">' + (submitted ? 'Submitted' : appr ? 'Approved' : d.state === 'unsaved' ? 'Unsaved changes' : 'Draft saved') + '</span>';
    const traceHtml = !traced(kind) ? '' : '<div class="dc-trace" data-psy="trace" data-k="' + kind + '">' + traceBody(tr) + '</div>';
    const srcs = []; String(d.text).replace(/\[([^\]]{2,})\]/g, (m0, l) => { if (!/Clinician Input Required|date of filing|^x$|^ $/.test(l) && srcs.indexOf(l) < 0 && !/^\d$/.test(l)) srcs.push(l); return m0; });
    const list = checklist(r); const chk = (st(cid).check || {})[kind] || {};
    const checks = !traced(kind) ? '' : '<div class="dc-chk" data-psy="checklist"><div class="cap5">Supporting-document checklist</div>' + list.map((x) => { const on = chk[x.k] != null ? chk[x.k] : x.on; return '<label class="dc-ck' + (x.on ? '' : ' miss') + '"><input type="checkbox" data-change="dic-check" data-case="' + esc(cid) + '" data-kind="' + kind + '" data-k="' + x.k + '"' + (on ? ' checked' : '') + (submitted ? ' disabled' : '') + '><span>' + esc(x.label) + '</span>' + (x.on ? '' : '<em>Not on file</em>') + '</label>'; }).join('') + '</div>';
    const ta = '<textarea class="fld dw-ta" rows="' + Math.min(26, Math.max(10, String(d.text).split('\n').length + 1)) + '" aria-label="' + esc(title) + ', editable" data-input="dic-edit" data-case="' + esc(cid) + '" data-kind="' + kind + '"' + (submitted ? ' readonly' : '') + '>' + esc(d.text) + '</textarea>';
    const whyNot = !tr.ok ? (tr.input.length ? 'Complete the Clinician Input Required items' : 'Cite a source for every statement') : '';
    const btn = (act, label, cls, dis, title2) => '<button class="btn ' + cls + ' s" data-act="' + act + '" data-case="' + esc(cid) + '" data-kind="' + kind + '"' + (dis ? ' disabled' : '') + (title2 ? ' title="' + esc(title2) + '"' : '') + '>' + label + '</button>';
    const acts = submitted ? '' : '<div class="dc-dacts" data-psy="draft-acts">' +
      btn('dic-save', 'Save Draft', 'o', d.state === 'saved' || appr) +
      btn('dic-approve', appr ? 'Approved' : 'Approve', 'o', appr || !tr.ok, whyNot) +
      btn('dic-prepare', 'Prepare Submission', sb.prepared && appr ? 'o' : 'p', !appr) +
      btn('dic-submit', 'Simulate Submission', 'p', !(appr && sb.prepared)) + simChip() + '</div>' + (whyNot && !appr ? '<div class="dc-why" data-psy="draft-why">' + esc(whyNot) + '</div>' : '');
    const pack = sb.prepared && appr ? '<div class="dc-pack" data-psy="package"><div class="cap5">Submission package · ' + esc((r.channel && r.channel.label) || 'payer channel') + '</div><ol>' + sb.prepared.files.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ol>' +
      '<button class="btn o s" data-act="dic-pdf" data-case="' + esc(cid) + '" data-kind="' + kind + '">Download PDF</button></div>' : '';
    const done = submitted ? '<div class="dc-sent" data-psy="submitted">' + EV.label('sent', 'Submission Confirmed') + simChip() + '<b>' + esc(sb.submitted.conf) + '</b><span>' + esc(sb.submitted.via) + ' · ' + esc(sb.submitted.at) + ' · ' + esc(sb.submitted.by) + '</span></div>' : '';
    return '<section class="card dw-sec" id="' + id + '" data-psy="draft-' + kind + '">' + secHead(title, (d.stage === 'ai' ? EV.label('ai') : appr ? EV.label('reviewed') : EV.label('clin', 'Clinician Edited')) + stateChip) +
      '<div class="dc-draft">' + flow + done + traceHtml + ta + (srcs.length ? '<div class="dc-srcs"><span class="cap5">Sources</span>' + srcList(srcs, cid) + '</div>' : '') + checks + pack + acts + '</div></section>';
  }
  /* a drafting section before its draft exists: one button, the same as the recommended step */
  function draftPane(r, kind) {
    const html = secDraft(r, kind); if (html) return html;
    const lab = { appeal: 'Generate Appeal Draft', recon: 'Prepare Reconsideration', info: 'Draft the reply' }[kind];
    const act = kind === 'info' ? 'data-act="dic-opt" data-k="evidence"' : 'data-act="dic-act" data-k="' + kind + '"';
    return '<section class="card dw-sec" id="sec-' + kind + '" data-psy="draft-' + kind + '">' + secHead(DRAFT_TITLE(r, kind)) + '<div class="dc-empty"><span class="dw-mut">Not generated yet</span><button class="btn p s" ' + act + ' data-case="' + esc(r.case) + '"' + (clinical() ? '' : ' disabled title="Clinical record access required"') + '>' + lab + '</button></div></section>';
  }
  /* record citations open their excerpt and Lauris document; regulation and policy citations are labelled, not linked */
  const isPolicy = (l) => /DMAS|CFR|12VAC|Manual/.test(l);
  function srcList(srcs, cid) { return srcs.filter((l) => !isPolicy(l)).map((l) => EV.cite(l, cid)).join(' ') + srcs.filter(isPolicy).map((l) => ' <span class="dc-pol">' + EV.label('policy', l) + '</span>').join(''); }
  DIC.srcList = srcList;
  function flowChip(d, sb) { return '<span class="sy-st t-' + (sb.submitted ? 'green' : d.stage === 'approved' ? 'blue' : 'gray') + '">' + (sb.submitted ? 'Submitted' : d.stage === 'approved' ? 'Approved' : 'Draft') + '</span>'; }
  function traceBody(tr) {
    if (tr.ok) return '<span class="st5 t-green"><i aria-hidden="true">✓</i>Every statement cites a document</span>';
    return (tr.uncited.length ? '<span class="st5 t-amber"><i aria-hidden="true">!</i>' + tr.uncited.length + ' without a source</span>' : '') + (tr.input.length ? '<span class="st5 t-amber"><i aria-hidden="true">!</i>' + tr.input.length + ' Clinician Input Required</span>' : '') +
      (tr.uncited.length ? '<ul>' + tr.uncited.slice(0, 4).map((l) => '<li>' + esc(l.slice(0, 120)) + '</li>').join('') + '</ul>' : '');
  }
  DIC.secDraft = secDraft;

  /* ---------------- Documentation request: the missing evidence and the request for it (clinician, guardian, school) ---------------- */
  /* the request: what to ask for (the missing items, all ticked) and from whom (the clinician, the guardian, the school counselor) */
  const REQ_FROM = (r) => [r.clinician, 'Guardian', 'School counselor'];
  function reqForm(r, again) {
    const cid = r.case; const gaps = gapsOf(r); const items = gaps.length ? gaps : [{ gap: 'Records that answer the stated reason', k: 'g0' }];
    return '<div class="dc-req" data-psy="docreq-form"><div class="dc-req-l">' + items.map((g) => '<label class="dc-ck"><input type="checkbox" data-gap="' + esc(g.gap) + '" checked><span>' + esc(g.gap) + '</span></label>').join('') + '</div>' +
      '<div class="dc-req-r"><label class="dc-req-f"><span>From</span><select class="fld" data-psy="docreq-to" aria-label="Request from">' + REQ_FROM(r).map((w) => '<option>' + esc(w) + '</option>').join('') + '</select></label>' +
      '<button class="btn p s" data-act="dic-docreq-send" data-case="' + esc(cid) + '">Send request</button>' + (again ? '<button class="btn o s" data-act="dic-docreq-cancel" data-case="' + esc(cid) + '">Cancel</button>' : '') + '</div>' +
      '<div class="dw-err" data-psy="docreq-err" role="alert"></div></div>';
  }
  function secDocreq(r) {
    const s = st(r.case); const cid = r.case; const gaps = gapsOf(r);
    const btn = (act, k, label, cls) => '<button class="btn ' + cls + ' s" data-act="' + act + '"' + (k ? ' data-k="' + k + '"' : '') + ' data-case="' + esc(cid) + '">' + label + '</button>';
    const miss = s.gaps ? (gaps.length ? '<ul class="dc-out" data-psy="out-gaps">' + gaps.map((g) => '<li><b>' + esc(g.gap) + '</b><span>' + esc(g.doc) + (g.date ? ' · ' + esc(g.date) : '') + '</span>' + enhanceBtn(g, r) + '</li>').join('') + '</ul>' : '<p class="dw-mut dc-none">None missing</p>')
      : '<div class="dc-empty in"><span class="dw-mut">Not checked yet</span>' + btn('dic-act', 'gaps', 'Identify Missing Evidence', 'o') + '</div>';
    const q2 = s.docreq; const again = !!(q2 && s.docreqForm);
    const list = q2 ? '<ul class="dc-out" data-psy="out-docreq"><li class="dc-mut">' + esc(q2.at) + ' · from ' + esc(q2.to) + '</li>' + q2.items.map((x, i) => '<li><b>' + esc(x.label) + '</b>' + (x.got ? '<span class="st5 t-green"><i aria-hidden="true">✓</i>Received</span>' : '<button class="btn o s" data-act="dic-doc-got" data-case="' + esc(cid) + '" data-i="' + i + '">Mark received</button>') + '</li>').join('') + '</ul>' : '';
    const req = q2 && !again ? list + '<div class="dc-more">' + btn('dic-docreq-new', '', 'New request', 'o') + '</div>' : reqForm(r, again);
    return '<section class="card dw-sec" id="sec-docreq" data-psy="di-docreq">' + secHead('Documentation request', q2 ? '<span class="dc-mut">' + esc(actionResult(r, 'docreq')) + '</span>' : '') + '<div class="dw-b"><h3 class="dc-h3">Missing evidence</h3>' + miss + '<h3 class="dc-h3">' + (q2 && !again ? 'Requested' : 'Request') + '</h3>' + req + '</div></section>';
  }
  /* Identify Missing Evidence (side panel): each item not documented, its Lauris document, the requirement it answers, a way to collect it */
  function secGaps(r) {
    const s = st(r.case); const cid = r.case; const gaps = gapsOf(r);
    if (!s.gaps) return '<section class="card dw-sec" id="sec-gaps" data-psy="di-gaps">' + secHead('Missing evidence') + '<div class="dc-empty"><span class="dw-mut">Not checked yet</span><button class="btn p s" data-act="dic-act" data-k="gaps" data-case="' + esc(cid) + '">Identify Missing Evidence</button></div></section>';
    const rows = gaps.map((g) => '<div class="dc-gp" data-psy="gap" data-k="' + esc(g.k) + '"><div class="dc-gp-t">' + EV.label('need', 'Not documented') + '<b>' + esc(g.gap) + '</b></div><div class="dc-gp-f">' + docLink(g) + (g.rule ? ruleChip(g.rule) : '') + enhanceBtn(g, r) + '</div></div>').join('');
    const q2 = s.docreq;
    const next = gaps.length ? '<div class="dc-gp-n">' + (q2 ? '<span class="dc-mut">' + esc(actionResult(r, 'docreq')) + '</span>' : '') + '<button class="btn ' + (q2 ? 'o' : 'p') + ' s" data-act="dic-sp" data-k="docreq" data-case="' + esc(cid) + '">' + (q2 ? 'Open the documentation request' : 'Request Additional Documentation') + '</button></div>' : '';
    return '<section class="card dw-sec" id="sec-gaps" data-psy="di-gaps">' + secHead('Missing evidence', '<span class="dc-mut">' + (gaps.length ? gaps.length + ' not documented' : 'None missing') + ' · checked ' + esc(s.gaps.at || '') + '</span>') +
      '<div class="dw-b">' + (rows ? '<div class="dc-gps">' + rows + '</div>' : '<p class="dw-mut" style="margin:0">None missing</p>') + next + '</div></section>';
  }
  /* Mark for Clinical Review (side panel): the reviewer, a note, and what the reviewer will find on this case */
  const reviewers = (r) => { const L = PSY.data.lauris; const lic = Object.values((L && L.staff) || {}).filter((x) => !x.dss).map((x) => x.name); return [r.clinician].concat(lic, [r.assigned]).filter((x, i, a) => x && a.indexOf(x) === i); };
  function secReview(r) {
    const s = st(r.case); const cid = r.case; const cur = s.review;
    const forRev = [['analyze', 'Denial analysis'], ['gaps', 'Missing evidence'], ['docreq', 'Documentation request'], ['appeal', 'Appeal draft'], ['p2p', 'Peer-to-peer script'], ['recon', 'Reconsideration']]
      .map((x) => { const res = actionResult(r, x[0]); return '<li><span>' + esc(x[1]) + '</span>' + (res ? '<span class="dc-ok">' + esc(res) + '</span>' : '<span class="dc-mut">Not started</span>') + '</li>'; }).join('');
    const done = cur ? '<div class="dc-rev" data-psy="review-done"><span class="st5 t-green"><i aria-hidden="true">✓</i>Marked</span><b>Clinical review · ' + esc(cur.to) + '</b><span class="dc-mut">' + esc([cur.by, cur.at].filter(Boolean).join(' · ')) + (cur.note ? ' · ' + esc(cur.note) : '') + '</span></div>' : '';
    const opts = reviewers(r).map((n) => '<option' + ((cur ? cur.to : r.clinician) === n ? ' selected' : '') + '>' + esc(n) + '</option>').join('');
    const form = '<div class="dc-req" data-psy="review-form"><div class="dc-req-r"><label class="dc-req-f"><span>Reviewer</span><select class="fld" data-psy="review-to" aria-label="Reviewer">' + opts + '</select></label>' +
      '<label class="dc-req-f w"><span>Note</span><input class="fld" data-psy="review-note" placeholder="Optional" aria-label="Note for the reviewer"></label>' +
      '<button class="btn p s" data-act="dic-review-send" data-case="' + esc(cid) + '">' + (cur ? 'Update review' : 'Mark for Clinical Review') + '</button></div></div>';
    const stx = D() && D().statusBadge ? D().statusBadge(dsGet(cid)) : '<span class="st5 t-gray">' + esc(dsLabel(dsGet(cid))) + '</span>';
    return '<section class="card dw-sec" id="sec-review" data-psy="di-review">' + secHead('Clinical review', stx) + '<div class="dw-b">' + done + form + '<h3 class="dc-h3">For the reviewer</h3><ul class="dc-rv" data-psy="review-items">' + forRev + '</ul></div></section>';
  }

  /* ---------------- History: everything that happened on this case, collapsed at the bottom ---------------- */
  const HIST = {}; // open or closed, per page
  function history(r) {
    const v = vOf(r);
    /* round 13: the shared History (owner HIST13): a dropdown with who did each step (Voice agent · Psyflo agent · Psyflo AI · Staff · From Lauris · Payer) */
    if (PSY.hist && typeof PSY.hist.html === 'function' && (!r.isClaim || PSY.hist.list(r.case, { scope: 'denial' }).length)) { // round 13: claims too
      let h = ''; try { h = PSY.hist.html(r.case, { scope: 'denial', title: 'History', open: !!HIST[v] }); } catch (e) { console.error('hist.html', e); h = ''; }
      if (h) return '<section class="dc-hist2" id="sec-history" data-psy="di-history" data-v="' + esc(v) + '">' + h + '</section>';
    }
    const n = (A.timeline ? A.timeline(r.case) : []).length;
    return '<details class="card dc-hist" id="sec-history" data-psy="di-history" data-v="' + esc(v) + '"' + (HIST[v] ? ' open' : '') + '><summary><h2>History</h2><span class="dc-mut">' + n + (n === 1 ? ' event' : ' events') + '</span><i class="dc-chev" aria-hidden="true"></i></summary>' +
      '<div class="dc-hist-b">' + A.timelineHtml(r.case) + '</div></details>';
  }

  /* ================================================================ round 13: the side panel (a recommended step opened over the page) ================================================================ */
  /* the open panel: { v: case, k: step, anim: slide in on this render }; spReturn = the step whose row gets the focus back; spFocus = the
     control that had the focus inside the panel (restored after a re-draw) */
  let SPN = null; let spReturn = null; let spFocus = null;
  /* each step: its content, the page section it stands for (that section shows a placeholder while the panel is open), and whether
     opening it starts the step (AI work the clinician then reviews); the documentation request and the clinical review wait for their form */
  const STEP = {
    analyze: { pane: 'weak', body: (r) => secWeak(r), auto: (r) => !st(r.case).analyzed },
    gaps: { body: (r) => secGaps(r), auto: (r) => !st(r.case).gaps },
    docreq: { pane: 'docreq', body: (r) => secDocreq(r) },
    appeal: { pane: 'appeal', body: (r) => draftPane(r, 'appeal'), auto: (r) => !doc('appeal', r.case) },
    p2p: { pane: 'p2p', body: (r) => (DIC.p2pSection ? DIC.p2pSection(r) : ''), auto: (r) => !doc('p2p', r.case) },
    recon: { pane: 'recon', body: (r) => draftPane(r, 'recon'), auto: (r) => !doc('recon', r.case) },
    review: { body: (r) => secReview(r) },
  };
  DIC.STEP = STEP;
  const inPanel = (cid, pane) => !!(SPN && SPN.v === cid && STEP[SPN.k] && STEP[SPN.k].pane === pane);
  const PLACEHOLDER = '<section class="card dw-sec dc-ph" data-psy="in-panel"><div class="dc-empty"><span class="dw-mut">Open in the side panel</span></div></section>';
  const X_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  function spHtml(r) {
    if (!SPN || SPN.v !== r.case || !STEP[SPN.k]) return '';
    const k = SPN.k; const cid = r.case; const i = ACTIONS.findIndex((a) => a[0] === k); const busy = BUSY[cid + '|' + k] || GEN[cid + '|' + k]; const res = actionResult(r, k);
    const chip = busy ? '<span class="st5 t-gray" data-psy="sp-result"><span class="dw-spin" aria-hidden="true"></span>Working…</span>' : res ? '<span class="st5 t-green" data-psy="sp-result"><i aria-hidden="true">✓</i>' + esc(res) + '</span>' : '<span class="st5 t-gray" data-psy="sp-result">Not started</span>';
    const dl = (k === 'appeal' || k === 'p2p' || k === 'recon') && r.issue !== 'info' ? actionDeadline(r, k) : '';
    let body = ''; try { body = STEP[k].body(r); } catch (e) { console.error('panel ' + k, e); body = ''; }
    const a = SPN.anim ? ' in' : '';
    return '<div class="dc-sp-dock" data-psy="di-panel-dock"><div class="dc-sp-scrim' + a + '" data-act="dic-sp-close" data-psy="di-panel-scrim"></div>' +
      '<aside class="dc-sp' + a + '" role="dialog" aria-modal="true" aria-labelledby="dc-sp-t" tabindex="-1" data-psy="di-panel" data-k="' + k + '" data-case="' + esc(cid) + '">' +
      '<header class="dc-sp-h"><span class="dc-sp-n' + (res ? ' done' : '') + '" aria-hidden="true">' + (res ? '✓' : i + 1) + '</span><div class="dc-sp-ht">' +
      '<div class="dc-sp-cap">Step ' + (i + 1) + ' of ' + ACTIONS.length + ' · ' + esc(r.ini) + ' · ' + esc(r.payerName) + '</div><h2 id="dc-sp-t">' + esc(ACTIONS[i][1]) + '</h2>' +
      '<div class="dc-sp-st">' + chip + (dl ? '<span class="dc-act-dl">Deadline ' + dl + '</span>' : '') + '</div></div>' +
      '<button type="button" class="dc-sp-x" data-act="dic-sp-close" data-psy="di-panel-close" aria-label="Close" title="Close (Esc)">' + X_ICON + '</button></header>' +
      '<div class="dc-sp-b" data-scroll="dc-sp-' + k + '">' + body + '</div></aside></div>';
  }
  /* open a step in the panel; a step that has not run yet starts (its result fills the panel as it arrives) */
  function openPanel(r, k) {
    if (!r || !STEP[k]) return;
    SPN = { v: r.case, k, anim: !SPN }; spFocus = null; spReturn = null;
    const auto = STEP[k].auto && STEP[k].auto(r) && !(NEEDS_CLIN[k] && !clinical()) && !DIC.busy(r.case + '|' + k);
    if (auto) RUN[k](r); else PSY.refresh();
  }
  function closePanel() { if (!SPN) return; spReturn = SPN.k; SPN = null; spFocus = null; PSY.refresh(); }
  DIC.openPanel = (cid, k) => openPanel(rec(cid), k); DIC.closePanel = closePanel; DIC.panel = () => (SPN ? { case: SPN.v, step: SPN.k } : null);
  /* a control's selector, to give it the focus back after a re-draw */
  const sigOf = (el) => {
    if (!el || !el.getAttribute) return null; const at = (n) => el.getAttribute(n);
    if (at('data-act')) return '[data-act="' + at('data-act') + '"]' + (at('data-kind') ? '[data-kind="' + at('data-kind') + '"]' : '') + (at('data-k') ? '[data-k="' + at('data-k') + '"]' : '') + (at('data-i') ? '[data-i="' + at('data-i') + '"]' : '');
    if (at('data-psy')) return '[data-psy="' + at('data-psy') + '"]';
    if (el.tagName === 'TEXTAREA' && at('data-kind')) return 'textarea[data-kind="' + at('data-kind') + '"]';
    if (el.tagName === 'INPUT' && at('data-k')) return 'input[data-k="' + at('data-k') + '"]';
    if (el.id) return '#' + el.id;
    return null;
  };
  /* Esc closes the panel (a modal over it closes first); Tab stays inside the panel */
  if (!PSY.__dcSpKeys) {
    PSY.__dcSpKeys = true;
    document.addEventListener('keydown', (e) => {
      if (!SPN || (e.key !== 'Escape' && e.key !== 'Tab')) return;
      const r0 = PSY.activeRoot && PSY.activeRoot(); const panel = r0 && r0.querySelector('[data-psy="di-panel"]'); if (!panel) return;
      const ov = document.getElementById('overlay'); if (ov && ov.classList.contains('open')) return;
      if (e.key === 'Escape') { e.preventDefault(); closePanel(); return; }
      const f = Array.from(panel.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [href], [tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null || x.tagName === 'SUMMARY');
      if (!f.length) return; const ae = r0.activeElement; const first = f[0], last = f[f.length - 1];
      if (!ae || !panel.contains(ae)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); return; }
      if (e.shiftKey && (ae === first || ae === panel)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && ae === last) { e.preventDefault(); first.focus(); }
    }, true);
  }

  /* ================================================================ claims (illustrative): the round-7 workspace pieces ================================================================ */
  function claimDocText(r, k) {
    const c = r.claim || {};
    if (k === 'claimrecon') return ['CLAIM RECONSIDERATION REQUEST (illustrative demo data)', 'To: ' + r.payerName + ' · Claims', 'Claim: ' + c.no + ' · dates of service ' + c.dos + ' · ' + c.billed + ' · ' + r.serviceLabel,
      'Denial: ' + c.code + ' · ' + c.reason, '', 'What the record shows:', '- ' + (c.note || ''), '- Authorization in force: ' + (r.m.ref || '') + (r.u.current ? ', ' + r.u.current.start + ' – ' + r.u.current.end : '') + '.',
      '- [Billing to confirm whether an authorization covered the dates of service before this is sent.]', '', 'Request: reprocess the claim with the authorization history attached.'].join('\n');
    if (k === 'corrected') { const e = PSY.elig.of(r.laurisId); return ['CORRECTED CLAIM CHECKLIST (illustrative demo data)', 'Claim: ' + c.no + ' · date of service ' + c.dos + ' · ' + c.billed + ' · ' + r.payerName, 'Rejection: ' + c.code + ' · ' + c.reason, '',
      '1. Compare the subscriber ID on the claim with the eligibility record' + (e ? ' (' + e.status + ' · ' + e.plan + ' since ' + e.since + ', checked ' + e.checked + ', simulated)' : '') + '.', '2. Correct the subscriber ID on the claim. The member ID stays on file; it is not shown here.', '3. Resubmit. ' + (c.note || ''), '4. Record the result below.'].join('\n'); }
    return '';
  }
  if (D() && D().builders) { D().builders.claimrecon = (r) => claimDocText(r, 'claimrecon'); D().builders.corrected = (r) => claimDocText(r, 'corrected'); }
  function claimWorkspace(r, params, pkey) {
    const c = r.claim || {}; const cur = r.u.current; const e = PSY.elig.of(r.laurisId); const v = vOf(r);
    const PANES = {
      overview: () => {
        let opts = []; try { opts = D().options(r); } catch (x) { opts = []; }
        return '<section class="card dw-sec" id="sec-options" data-psy="di-options">' + secHead('Options') + '<div class="dw-opts">' + opts.map((o) => '<div class="dw-opt' + (r.option === o.key ? ' cur' : '') + '" data-opt="' + o.key + '"><div class="dw-opt-b"><h3>' + esc(o.label) + '</h3><div class="dw-opt-m"><span class="cap5">Deadline</span><div class="dw-opt-v">' + D().deadlineHtml(o.deadline, o.rules) + '</div></div></div><div class="dw-opt-a">' +
          (r.option === o.key ? '<span class="st5 t-blue"><i aria-hidden="true">●</i>Current</span>' : r.closed ? '' : '<button class="btn o s" data-act="dic-claim-opt" data-id="' + esc(r.id) + '" data-k="' + o.key + '">' + (o.simple ? esc(o.label) : 'Select') + '</button>') + '</div></div>').join('') + '</div></section>';
      },
      decision: () => '<section class="card dw-sec" id="sec-decision" data-psy="di-sec-1">' + secHead(saidTitle(r), EV.label('illustrative', 'Illustrative')) + '<div class="dw-b"><div class="dw-dec"><b>' + esc(r.issueLabel) + '</b> · claim ' + esc(c.no) + ' · ' + esc(c.billed) + ' · dates of service ' + esc(c.dos) + '</div>' +
        '<blockquote class="dc-said">' + esc(c.code + ': ' + c.reason) + '</blockquote><div class="dw-src">' + EV.label('corr', 'Remittance advice (illustrative)') + '</div><p class="dw-p">' + esc(c.note || '') + '</p></div></section>',
      evidence: () => '<section class="card dw-sec" id="sec-evidence" data-psy="di-sec-2">' + secHead('Billing evidence') + '<div class="dw-c">' +
        '<div class="dw-ev"><div class="dw-ev-h">' + EV.label('ehr') + '<b>Authorization in force</b></div><div class="dw-p">' + esc((r.m.ref || '') + (cur ? ': ' + cur.authorized + ' units, ' + cur.start + ' – ' + cur.end : '')) + '. Claim dates of service: ' + esc(c.dos) + '.</div></div>' +
        (e ? '<div class="dw-ev" style="margin-top:10px"><div class="dw-ev-h">' + EV.label('ehr', 'Eligibility check (simulated)') + '<b>Coverage</b></div><div class="dw-p">' + esc(e.status + ' · ' + e.plan + ' since ' + e.since + ' · checked ' + e.checked) + '</div></div>' : '') + '</div></section>',
      docs: () => {
        const keys = r.issue === 'claim-rejection' ? ['corrected'] : ['claimrecon'];
        return '<section class="card dw-sec" id="sec-docs">' + secHead('Documents') + '<div class="dw-docs">' + keys.map((k) => {
          const x = D().docState(r.id, k); const name = D().DOC_NAME(r, k);
          if (!x.gen) return '<div class="dw-doc"><div class="dw-doc-s"><b>' + esc(name) + '</b><span class="sp"></span>' + (r.closed ? '' : '<button class="btn o s" data-act="dic-claim-gen" data-id="' + esc(r.id) + '" data-k="' + k + '">Generate draft</button>') + '</div></div>';
          return '<div class="dw-doc"><div class="dw-doc-s"><b>' + esc(name) + '</b>' + (x.reviewed ? EV.label('reviewed') : EV.label('ai')) + '</div><div class="dw-doc-b"><textarea class="fld dw-ta" rows="10" data-input="dic-claim-input" data-id="' + esc(r.id) + '" data-k="' + k + '">' + esc(D().docText(r, k)) + '</textarea>' +
            '<div class="dw-doc-a">' + (x.reviewed ? '' : '<button class="btn p s" data-act="dic-claim-review" data-id="' + esc(r.id) + '" data-k="' + k + '">Mark reviewed</button>') + '</div></div></div>';
        }).join('') + '</div></section>';
      },
    };
    const docSt = (() => { try { const k = r.issue === 'claim-rejection' ? 'corrected' : 'claimrecon'; const x = D().docState(r.id, k); return x.gen ? (x.reviewed ? ['green', 'Reviewed'] : ['blue', 'AI Draft']) : null; } catch (x) { return null; } })();
    const items = [['overview', 'Overview', null, 'review'], ['decision', saidTitle(r), null, 'review'], ['evidence', 'Billing evidence', null, 'review'], ['docs', 'Documents', docSt, 'respond']];
    const sel = selOf(v, params, pkey, items.map((x) => x[0]));
    /* the outcome is recorded from the header (the claim's resolution) */
    const o = r.s.outcome; const outs = (D().OUTCOMES || {}).claim || [];
    const menu = '<details class="dc-upd" data-psy="di-update"><summary class="btn o s">Record outcome<i aria-hidden="true">▾</i></summary><div class="dc-upd-p">' +
      '<label>Outcome<select class="fld" id="g-out"><option value="">Choose an outcome…</option>' + outs.map((x) => '<option value="' + x[0] + '">' + esc(x[1]) + '</option>').join('') + '</select></label>' +
      '<label>Units paid<input class="fld" id="g-units" type="number" min="0" max="' + (r.requested || 0) + '"></label><label>Decision date<input class="fld" id="g-date" value="Oct 29"></label>' +
      '<div class="dw-err" id="g-err" role="alert"></div><button class="btn p s" data-act="dic-claim-resolve" data-id="' + esc(r.id) + '">Save outcome</button></div></details>';
    const chips = (D().stBadge ? D().stBadge('claim', r.status) : '') + deadlineChip(r) + '<span class="dc-mut" data-psy="claim-outcome">Recorded: ' + (o ? esc(o.label) + (o.units != null ? ' · ' + o.units + ' of ' + r.requested + ' units' : '') : 'not yet') + '</span>';
    return pageOf(r, header(r, { menu, chips, stepper: false }), items, sel, PANES);
  }

  /* ================================================================ the page ================================================================ */
  const crumbs = (r) => [{ label: 'Denial Intelligence', go: 'denials' }, { label: esc(r ? r.ini : '') }];
  function noAccess(r, what) {
    return PSY.platform.page({ active: 'di', crumbs: crumbs(r), title: 'No access', body: '<div class="pf-noacc" data-psy="noaccess"><b>No access</b><span>' + esc(what) + '</span><button type="button" class="btn o" data-go="denials">Back to Denial Intelligence</button></div>' });
  }
  /* which drafting sections exist */
  function draftsShown(r) {
    const out = [];
    /* drafts the scenarios already hold (K.T.'s reply Oct 28, E.C.'s appeal letter Oct 26) open as AI Drafts dated then */
    if (SY() && !st(r.case).noSeed) ['info', 'appeal', 'recon'].forEach((k) => {
      if (doc(k, r.case)) return; const x = model('docState', r.id, k);
      if (x && x.gen && (k !== 'info' || r.issue === 'info' || r.option === 'evidence')) ensureDraft(k, r, x.at || '');
    });
    ['appeal', 'recon', 'info'].forEach((k) => { if (doc(k, r.case) || GEN[r.case + '|' + k]) out.push(k); });
    return out;
  }
  /* the section menu: [key, label, [tone, status] | null, group] */
  function menuItems(r) {
    const cid = r.case; const s = st(cid); const drafts = draftsShown(r);
    const stg = (kind) => { if (GEN[cid + '|' + kind]) return ['gray', 'Drafting…']; const d = doc(kind, cid); if (!d) return null; const sb = subOf(cid, kind); return sb.submitted ? ['green', 'Submitted'] : sb.prepared && d.stage === 'approved' ? ['green', 'Package prepared'] : d.stage === 'approved' ? ['green', 'Approved'] : d.stage === 'edited' ? ['amber', 'Edited'] : ['blue', 'AI Draft']; };
    const gaps = gapsOf(r).length;
    const p2p = doc('p2p', cid); const pv = (s.p2pVersions || []).length; let call = null; try { call = D() && D().p2pOf ? D().p2pOf(r) : null; } catch (e) { call = null; }
    const p2pSt = GEN[cid + '|p2p'] ? ['gray', 'Drafting…'] : p2p ? (p2p.stage === 'approved' ? ['green', 'Approved version ' + (pv || 1)] : p2p.stage === 'edited' ? ['amber', 'Edited'] : ['blue', 'AI Draft']) : call && call.date && !call.outcome ? ['gray', 'Call ' + call.date] : null;
    const q2 = s.docreq; const dq = q2 ? (q2.items.every((x) => x.got) ? ['green', 'All received'] : ['amber', q2.items.filter((x) => !x.got).length + ' requested']) : null;
    const items = [
      ['overview', 'Overview', ['gray', ACTIONS.filter((a) => actionResult(r, a[0])).length + ' of ' + ACTIONS.length + ' steps done'], 'review'],
      ['decision', saidTitle(r), null, 'review'],
      ['evidence', 'Clinical evidence', gaps ? ['amber', gaps + ' not documented'] : null, 'review'],
      ['weak', 'Where the denial is weak', BUSY[cid + '|analyze'] ? ['gray', 'Analyzing…'] : s.analyzed ? ['gray', weakPoints(r).length + ' points'] : ['gray', 'Not analyzed'], 'review'],
    ];
    if (drafts.indexOf('info') >= 0) items.push(['info', r.issue === 'info' ? 'Reply to ' + r.payerShort : 'Additional information', stg('info'), 'respond']);
    items.push(['appeal', 'Appeal draft', stg('appeal'), 'respond'], ['p2p', 'Peer-to-peer script', p2pSt, 'respond'], ['recon', 'Reconsideration', stg('recon'), 'respond'], ['docreq', 'Documentation request', dq, 'respond']);
    return items;
  }
  function menuHtml(r, items, sel) {
    const v = vOf(r);
    const grp = (g, cap) => { const its = items.filter((x) => x[3] === g); if (!its.length) return ''; return '<div class="dc-mg"><div class="dc-mc">' + cap + '</div>' + its.map((x) => { const on = x[0] === sel; return '<button type="button" class="dc-mi' + (on ? ' on' : '') + '" data-act="dic-sec" data-sec="' + x[0] + '" data-v="' + esc(v) + '"' + (on ? ' aria-current="true"' : '') + '><span>' + esc(x[1]) + '</span>' + (x[2] ? '<small class="t-' + x[2][0] + '">' + esc(x[2][1]) + '</small>' : '') + '</button>'; }).join('') + '</div>'; };
    return '<nav class="dc-menu" aria-label="Sections" data-psy="di-menu">' + grp('review', 'Review') + grp('respond', 'Respond') + '</nav>';
  }
  /* the selected section: an action's result (pending) › the reader's last choice on this page (re-render) › the route's section › Overview */
  const VIEW = {}; const SHOWN = {}; const SEEN = typeof WeakSet === 'function' ? new WeakSet() : null; let pendingSel = null; let histNext = false;
  const SEC_ALIAS = { options: 'decision', actions: 'overview', analysis: 'weak', reply: 'info', status: '', activity: 'history', history: 'history' };
  function selOf(v, params, pkey, keys) {
    const al = (x) => (x && SEC_ALIAS[x] !== undefined ? SEC_ALIAS[x] : x);
    let s = null;
    if (pendingSel) { s = al(pendingSel) || VIEW[v]; pendingSel = null; }
    else if (SEEN && pkey && typeof pkey === 'object' && SEEN.has(pkey)) s = VIEW[v];
    else s = al(params.sec || (params.doc === 'info' ? 'info' : params.doc === 'p2p' ? 'p2p' : ''));
    if (SEEN && pkey && typeof pkey === 'object') SEEN.add(pkey);
    if (s === 'history') { histNext = true; s = VIEW[v]; }
    if (keys.indexOf(s) < 0) s = 'overview';
    VIEW[v] = s; return s;
  }
  function pageOf(r, head, items, sel, PANES, extra) {
    const v = vOf(r);
    const body = '<div class="dc"><div class="crumb dc-crumb"><a data-go="denials">Denial Intelligence</a><span>/</span><span>' + esc(r.ini) + '</span></div>' + head +
      '<div class="dc-body" data-v="' + esc(v) + '">' + menuHtml(r, items, sel) + '<div class="dc-panel">' +
      items.map((x) => '<div class="dc-pane" id="pane-' + x[0] + '" data-pane="' + x[0] + '"' + (x[0] === sel ? '' : ' hidden') + '>' + PANES[x[0]]() + '</div>').join('') + '</div></div>' + history(r) + (extra || '') + '</div>';
    return PSY.platform.page({ active: 'di', body });
  }
  function workspace(params) {
    params = params || {}; const pkey = params.__p || params;
    const cid = caseOf(params);
    const r = rec(cid);
    if (!r) return PSY.platform.page({ active: 'di', title: 'Nothing to show', crumbs: [{ label: 'Denial Intelligence', go: 'denials' }], body: '<section class="card pi-bd"><button class="pi-link" data-go="denials">Back to Denial Intelligence</button></section>' });
    if (!PSY.can('denials')) return PSY.platform.page({ active: 'di', title: 'Denial Intelligence', body: '' }); // the shared gate shows No access
    if (!r.isClaim && PSY.caseInCaseload && !PSY.caseInCaseload(cid)) return noAccess(r, 'Not on your caseload');
    if (r.isClaim) return claimWorkspace(r, params, pkey);
    /* the side panel stays open across re-draws of this page; opening the page again (a new visit) starts without it */
    const revisit = !!(SEEN && pkey && typeof pkey === 'object' && SEEN.has(pkey));
    if (SPN && (!revisit || SPN.v !== cid)) { SPN = null; spFocus = null; }
    const items = menuItems(r);
    const sel = selOf(cid, params, pkey, items.map((x) => x[0]));
    const ph = (pane, fn) => () => (inPanel(cid, pane) ? PLACEHOLDER : fn());
    const PANES = {
      overview: () => secActions(r) + saidCard(r) + weakCard(r, 3),
      decision: () => secDecision(r), evidence: () => secEvidence(r), weak: ph('weak', () => secWeak(r)),
      info: () => draftPane(r, 'info'), appeal: ph('appeal', () => draftPane(r, 'appeal')), recon: ph('recon', () => draftPane(r, 'recon')),
      p2p: ph('p2p', () => (DIC.p2pSection ? DIC.p2pSection(r) : '')), docreq: ph('docreq', () => secDocreq(r)),
    };
    return pageOf(r, header(r, { menu: updateMenu(r) }), items, sel, PANES, spHtml(r));
  }
  DIC.workspace = workspace;
  /* show a section in place (menu, "See all", "Open the reply"); the page is not re-drawn, so edits in other sections stay */
  const k = () => PSY.k || 1;
  function intoView(host, el) { if (!host || !el) return; const top = (el.getBoundingClientRect().top - host.getBoundingClientRect().top) / k(); if (top < 0) host.scrollTop = Math.max(0, host.scrollTop + top - 12); }
  function showSec(ctx, v, sec) {
    const root = ctx && ctx.root; if (!root) return false;
    const panes = Array.from(root.querySelectorAll('.dc-pane[data-pane]')); if (!panes.some((p) => p.getAttribute('data-pane') === sec)) return false;
    VIEW[v] = sec; SHOWN[v] = sec;
    panes.forEach((p) => { p.hidden = p.getAttribute('data-pane') !== sec; });
    root.querySelectorAll('.dc-mi[data-sec]').forEach((b) => { const on = b.getAttribute('data-sec') === sec; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    intoView(ctx.host, root.querySelector('.dc-body'));
    return true;
  }
  DIC.showSec = showSec;
  function mountWs(root, ctx) {
    const body = root.querySelector('.dc-body'); const pane = root.querySelector('.dc-pane:not([hidden])'); const h = root.getElementById('sec-history');
    /* History open or closed (our <details>, or the shared History's own toggle) */
    if (h) h.addEventListener('toggle', (e) => { const d = e.target && e.target.tagName === 'DETAILS' ? e.target : h; HIST[h.getAttribute('data-v')] = !!d.open; }, true);
    mountPanel(root, ctx);
    const v = body ? body.getAttribute('data-v') : null; const sel = pane ? pane.getAttribute('data-pane') : null;
    const changed = !!(v && SHOWN[v] !== undefined && SHOWN[v] !== sel); if (v) SHOWN[v] = sel;
    const openHist = histNext; histNext = false;
    const host = ctx && ctx.host; if (!host || !(changed || openHist)) return;
    /* after the shell restores the scroll position */
    setTimeout(() => {
      if (openHist && h) { const det = h.tagName === 'DETAILS' ? h : h.querySelector('details'); if (det) det.open = true; HIST[h.getAttribute('data-v')] = true; const top = (h.getBoundingClientRect().top - host.getBoundingClientRect().top) / k(); host.scrollTop = Math.max(0, host.scrollTop + top - 80); }
      else if (changed) intoView(host, body);
    }, 0);
  }
  DIC.scrollTo = (sec) => { if (!SPN) pendingSel = sec; }; // a step in the side panel keeps the page where it is
  /* the side panel: dock it at the right edge of the platform view (sticky, full height), lock the page's scroll under it (one scroll bar),
     keep the focus inside it; after it closes, give the focus back to the step's row */
  function mountPanel(root, ctx) {
    const dock = root.querySelector('[data-psy="di-panel-dock"]'); const host = ctx && ctx.host;
    if (!dock) {
      if (spReturn) { const k2 = spReturn; spReturn = null; setTimeout(() => { const b2 = root.querySelector('.dc-acts .dc-act-b[data-k="' + k2 + '"]'); if (b2) { try { b2.focus({ preventScroll: true }); } catch (e) { b2.focus(); } } }, 0); }
      return;
    }
    const pf = root.querySelector('.pf'); if (pf && dock.parentNode !== pf) pf.appendChild(dock);
    if (host) host.style.overflow = 'hidden';
    if (SPN) SPN.anim = false;
    const panel = dock.querySelector('[data-psy="di-panel"]'); if (!panel) return;
    panel.addEventListener('focusin', (e) => { const sg = sigOf(e.target); if (sg) spFocus = sg; });
    setTimeout(() => {
      if (!panel.isConnected) return; const ae = root.activeElement; if (ae && panel.contains(ae)) return;
      let t = null; try { t = spFocus ? panel.querySelector(spFocus) : null; } catch (e) { t = null; }
      const to = t && !t.disabled && t.offsetParent !== null ? t : panel; try { to.focus({ preventScroll: true }); } catch (e) { to.focus(); }
    }, 0);
  }
  /* a demo reset starts every page on its Overview with History closed */
  if (typeof PSY.reset === 'function' && !PSY.reset.dc11) { const base = PSY.reset; const rs = function () { [VIEW, SHOWN, HIST].forEach((o) => Object.keys(o).forEach((x) => delete o[x])); pendingSel = null; histNext = false; SPN = null; spReturn = null; spFocus = null; return base.apply(this, arguments); }; rs.dc11 = true; PSY.reset = rs; }
  DIC.busy = (key) => !!(GEN[key] || BUSY[key]);
  const wsCss = () => (D() ? D().css : '') + WS_CSS + (PSY.dicase.p2pCss || '');
  /* the older step routes render this workspace (owner files 86/87/88 register them with these) */
  if (D()) { D().workspace = (r, o) => workspace(Object.assign({}, o || {}, { case: r ? r.case : (o || {}).case })); D().mountWs = mountWs; D().wsCss = wsCss; D().corrOf = corrOf; D().REASON_MAP = REASON_MAP; }
  DIC.mountWs = mountWs; DIC.css = wsCss;

  PSY.register({
    id: 'di-case', kind: 'web', nav: 'di', label: 'Denial Intelligence case', url: (p) => 'denial-intelligence/' + caseOf(p),
    tabTitle: (p) => 'Psyflo — ' + ((PSY.caseView(caseOf(p)) || {}).ini || 'Denial Intelligence'),
    get css() { return wsCss(); },
    render(params) { return workspace(params); },
    mount: mountWs,
  });
  PSY.register({
    id: 'denial-detail', kind: 'web', nav: 'di', label: 'Denial', url: (p) => 'denial-intelligence/' + ((p && p.case) || 'R-0384'),
    tabTitle: (p) => 'Psyflo — ' + ((PSY.caseView((p && p.case) || 'R-0384') || {}).ini || 'Denial'),
    get css() { return wsCss(); },
    render(params) { return workspace({ case: (params && params.case) || 'R-0384', __p: params }); },
    mount: mountWs,
  });

  /* ================================================================ round 13: the denial page's backend routes (PSY.api, owner DI13) ================================================================
     Every change this page makes goes through a route of the in-browser demo backend (simulated; no external systems), so the presenter's
     API log shows it: the handler validates, writes PSY.state through the shared models (PSY.diStatus, PSY.sync, PSY.di) and answers,
     or fails with 400 / 403 / 404 / 409. Calls are synchronous (PSY.api.call). Without PSY.api the same handlers run locally.
       GET    /cases/:case/denial                                  the decision, its status, the seven steps with their results
       POST   /cases/:case/denial/steps/:step                      analyze · gaps (Identify Missing Evidence)
       POST   /cases/:case/denial/documentation-requests           { items: [..], from }
       PATCH  /cases/:case/denial/documentation-requests/items/:i  { received: true }
       POST   /cases/:case/denial/clinical-review                  { reviewer, note }
       POST   /cases/:case/denial/drafts/:kind                     generate the AI Draft (appeal · recon · info · p2p)
       PATCH  /cases/:case/denial/drafts/:kind                     { text } save the clinician's edits
       POST   /cases/:case/denial/drafts/:kind/approve             approve (every statement cites a document; no Clinician Input Required left)
       POST   /cases/:case/denial/drafts/:kind/prepare             the submission package
       POST   /cases/:case/denial/submissions                      { kind } simulated submission through the payer's channel
       PATCH  /cases/:case/denial/status                           { status, approved?, note? } */
  const R13 = [];
  const apiErr = (status, message) => (PSY.api && PSY.api.error ? PSY.api.error(status, message) : Object.assign(new Error(message), { status, apiError: true }));
  function route13(method, pattern, fn, o) {
    const keys = []; const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (m0, k2) => { keys.push(k2); return '([^/]+)'; }) + '$');
    R13.push({ method, re, keys, fn });
    if (PSY.api && typeof PSY.api.route === 'function') PSY.api.route(method, pattern, fn, Object.assign({ owner: 'DI13' }, o || {}));
  }
  function apiDo(method, path, body) {
    if (PSY.api && typeof PSY.api.call === 'function') return PSY.api.call(method, path, body);
    for (const x of R13) {
      const m = x.method === method ? x.re.exec(String(path).split('?')[0]) : null; if (!m) continue;
      const params = {}; x.keys.forEach((k2, i) => { params[k2] = decodeURIComponent(m[i + 1]); });
      try { return x.fn({ params, query: {}, body: body || {}, note() {} }); } catch (e) { throw { status: e.status || 500, message: e.message }; }
    }
    throw { status: 404, message: 'No route for ' + method + ' ' + path };
  }
  DIC.api = apiDo;
  const base = (cid) => '/cases/' + encodeURIComponent(cid) + '/denial';
  const recOf404 = (cid) => { const r = PSY.caseById(cid) ? rec(cid) : null; if (!r || r.isClaim) throw apiErr(404, 'No denial record for ' + cid); return r; };
  const KIND_KEYS = ['appeal', 'recon', 'info', 'p2p'];
  const kindOf400 = (k2, list) => { list = list || KIND_KEYS; if (list.indexOf(k2) < 0) throw apiErr(400, 'kind must be one of ' + list.join(', ')); return k2; };
  const needClin = () => { if (!clinical()) throw apiErr(403, 'Clinical record access required'); };
  const docOf404 = (r, kind) => { const d = doc(kind, r.case); if (!d) throw apiErr(404, 'No ' + KINDS[kind].title.toLowerCase() + ' yet'); return d; };
  route13('GET', '/cases/:case/denial', (q) => {
    const r = recOf404(q.params.case); const s = dsGet(r.case);
    return { case: r.case, id: r.id, ini: r.ini, payer: r.payerName, decision: r.issueLabel, status: s, statusLabel: dsLabel(s), steps: ACTIONS.map((a) => ({ step: a[0], label: a[1], result: actionResult(r, a[0]) || null })) };
  }, { desc: 'One denial: its status and the seven recommended steps with their results', summary: (d) => d.ini + ' · ' + d.statusLabel + ' · ' + d.steps.filter((x) => x.result).length + ' of 7 steps done' });
  route13('POST', '/cases/:case/denial/steps/:step', (q) => {
    const r = recOf404(q.params.case); const k2 = q.params.step; const s = st(r.case);
    if (k2 === 'analyze') {
      s.analyzed = { at: PSY.now(), by: ME() }; if (dsGet(r.case) === 'new') setStatus(r.case, 'review', { note: 'Denial analyzed' }); else audit(r.case, 'Denial analyzed'); PSY.save();
      const n = weakPoints(r).length; q.note(r.ini + ' · ' + n + ' points'); return { step: k2, at: s.analyzed.at, points: n };
    }
    if (k2 === 'gaps') {
      s.gaps = { at: PSY.now() }; const g = gapsOf(r); audit(r.case, 'Missing evidence identified (' + g.length + ')'); PSY.save();
      q.note(r.ini + ' · ' + g.length + ' not documented'); return { step: k2, at: s.gaps.at, missing: g.map((x) => ({ item: x.gap, document: x.doc })) };
    }
    throw apiErr(400, 'step must be analyze or gaps (the other steps have their own routes)');
  }, { desc: 'Run a recommended step: analyze the denial, identify missing evidence' });
  route13('POST', '/cases/:case/denial/documentation-requests', (q) => {
    const r = recOf404(q.params.case); const b = q.body || {};
    const items = (Array.isArray(b.items) ? b.items : []).map((x) => String(x || '').trim()).filter(Boolean);
    if (!items.length) throw apiErr(400, 'Choose at least one item.');
    const from = b.from || r.clinician; if (REQ_FROM(r).indexOf(from) < 0) throw apiErr(400, 'from must be one of: ' + REQ_FROM(r).join(', '));
    const s = st(r.case); s.docreq = { at: PSY.now(), by: ME(), to: from, items: items.map((label) => ({ label, got: false })) }; s.docreqForm = false;
    setStatus(r.case, 'docs', { note: items.length + ' item' + (items.length === 1 ? '' : 's') + ' requested from ' + from }); PSY.save();
    q.note(r.ini + ' · ' + items.length + ' requested from ' + from); return s.docreq;
  }, { desc: 'Request additional documentation from the clinician, the guardian or the school counselor' });
  route13('PATCH', '/cases/:case/denial/documentation-requests/items/:i', (q) => {
    const r = recOf404(q.params.case); const q2 = st(r.case).docreq; const i = +q.params.i;
    if (!q2 || !q2.items[i]) throw apiErr(404, 'No requested item ' + q.params.i);
    if (!(q.body || {}).received) throw apiErr(400, 'received: true is required');
    const it = q2.items[i]; if (it.got) throw apiErr(409, 'Already received');
    it.got = true; it.at = PSY.now(); audit(r.case, 'Documentation received: ' + it.label);
    if (q2.items.every((x) => x.got) && dsGet(r.case) === 'docs') setStatus(r.case, 'review', { note: 'All requested documentation received' });
    PSY.save(); q.note(r.ini + ' · ' + q2.items.filter((x) => x.got).length + ' of ' + q2.items.length + ' received'); return it;
  }, { desc: 'Mark a requested document received (all received → Under Review)' });
  route13('POST', '/cases/:case/denial/clinical-review', (q) => {
    const r = recOf404(q.params.case); const b = q.body || {}; const to = b.reviewer || r.clinician; const note = String(b.note || '').trim();
    if (reviewers(r).indexOf(to) < 0) throw apiErr(400, 'reviewer must be one of: ' + reviewers(r).join(', '));
    const s = st(r.case); if (s.review && s.review.to === to && !note && dsGet(r.case) === 'review') throw apiErr(409, 'Already marked for review.');
    s.review = { to, by: ME(), at: PSY.now(), note };
    setStatus(r.case, 'review', { note: 'Clinical review: ' + to + (note ? ' · ' + note : '') }); PSY.save();
    q.note(r.ini + ' · ' + to); return s.review;
  }, { desc: 'Mark the decision for clinical review (reviewer, note)' });
  route13('POST', '/cases/:case/denial/drafts/:kind', (q) => {
    const r = recOf404(q.params.case); const kind = kindOf400(q.params.kind); needClin();
    if (doc(kind, r.case)) throw apiErr(409, 'The ' + KINDS[kind].title.toLowerCase() + ' already exists');
    if (kind === 'p2p') {
      if (!PSY.dicase.p2pGenerate) throw apiErr(500, 'The peer-to-peer guide is not loaded');
      pick(r, 'p2p'); PSY.dicase.p2pGenerate(r); model('genDoc', r.id, 'p2p'); if (dsGet(r.case) === 'new') setStatus(r.case, 'review', { note: 'Peer-to-peer script generated' });
    } else if (kind === 'info') { ensureDraft('info', r); model('genDoc', r.id, 'info'); }
    else {
      st(r.case).noSeed = false; pick(r, kind); ensureDraft(kind, rec(r.case) || r);
      model('genDoc', r.id, kind); // the model records the AI Draft and moves the status to Appeal Drafted
      if (['new', 'review', 'docs'].indexOf(dsGet(r.case)) >= 0) setStatus(r.case, 'drafted', { note: (kind === 'appeal' ? 'Appeal' : 'Reconsideration request') + ' drafted (AI Draft)' });
    }
    PSY.save(); q.note(KINDS[kind].doc(r) + ' · AI Draft'); return { kind, stage: (doc(kind, r.case) || {}).stage || 'ai' };
  }, { desc: 'Generate the AI Draft (appeal, reconsideration, reply, peer-to-peer script) from the record; the clinician reviews it' });
  route13('PATCH', '/cases/:case/denial/drafts/:kind', (q) => {
    const r = recOf404(q.params.case); const kind = kindOf400(q.params.kind); needClin(); const d = docOf404(r, kind);
    if (subOf(r.case, kind).submitted) throw apiErr(409, 'Submitted: the letter is read-only');
    const b = q.body || {}; if (b.text != null && String(b.text) !== d.text) SY().edit(dkey(kind, r.case), String(b.text));
    SY().saveDraft(dkey(kind, r.case)); audit(r.case, 'Draft saved: ' + KINDS[kind].doc(r)); PSY.save();
    const d2 = doc(kind, r.case); q.note(KINDS[kind].doc(r) + ' · saved'); return { kind, stage: d2.stage, state: d2.state };
  }, { desc: 'Save a draft (the clinician’s edits)' });
  route13('POST', '/cases/:case/denial/drafts/:kind/approve', (q) => {
    const r = recOf404(q.params.case); const kind = kindOf400(q.params.kind); needClin(); const d = docOf404(r, kind); const text = d.text;
    if (traced(kind)) { const tr = trace(text); if (!tr.ok) throw apiErr(400, tr.input.length ? 'Complete Clinician Input Required.' : 'Cite a source first.'); }
    SY().approve(dkey(kind, r.case));
    if (kind === 'p2p') { const s2 = st(r.case); s2.p2pVersions = s2.p2pVersions || []; s2.p2pVersions.push({ v: s2.p2pVersions.length + 1, at: PSY.now(), by: ME(), text }); }
    model('editDoc', r.id, kind, text); model('reviewDoc', r.id, kind); // the model's copy is the approved text, reviewed
    PSY.save(); q.note(KINDS[kind].doc(r) + ' · approved'); return { kind, stage: 'approved' };
  }, { desc: 'Approve a draft: every statement cites a document and no Clinician Input Required item is open' });
  route13('POST', '/cases/:case/denial/drafts/:kind/prepare', (q) => {
    const r = recOf404(q.params.case); const kind = kindOf400(q.params.kind, ['appeal', 'recon', 'info']); needClin(); const d = docOf404(r, kind);
    if (d.stage !== 'approved') throw apiErr(409, 'Approve first.');
    const s = st(r.case); s.sub = s.sub || {}; s.sub[kind] = Object.assign({}, s.sub[kind] || {}, { prepared: { at: PSY.now(), files: packageFiles(r, kind) } });
    if (D() && D().prepDoc) model('prepDoc', r.id, kind); else audit(r.case, 'Submission package prepared: ' + KINDS[kind].doc(r));
    PSY.save(); q.note(KINDS[kind].doc(r) + ' · ' + s.sub[kind].prepared.files.length + ' files'); return s.sub[kind].prepared;
  }, { desc: 'Prepare the submission package (the letter PDF and the checked documents)' });
  route13('POST', '/cases/:case/denial/submissions', (q) => {
    const r = recOf404(q.params.case); const kind = kindOf400((q.body || {}).kind, ['appeal', 'recon', 'info']); needClin();
    const d = docOf404(r, kind); const sb = subOf(r.case, kind);
    if (sb.submitted) throw apiErr(409, 'Already submitted · ' + sb.submitted.conf);
    if (d.stage !== 'approved' || !sb.prepared) throw apiErr(409, 'Prepare the package first.');
    const via = (r.channel && (r.channel.method || r.channel.label)) || 'payer channel'; const conf = confOf(r);
    const s = st(r.case); s.sub[kind] = Object.assign({}, s.sub[kind], { submitted: { at: PSY.now(), conf, via: via + ' (simulated)', by: ME() } });
    if (kind === 'info') {
      /* the model sends the reviewed reply: Pending payer review, status Awaiting Payer */
      const x = model('docState', r.id, 'info') || {}; model('editDoc', r.id, 'info', d.approved || d.text); if (!x.reviewed) model('reviewDoc', r.id, 'info');
      const res = model('sendReply', r.id); if (!res || res.err) setStatus(r.case, 'awaiting', { path: 'info', note: 'Reply sent via ' + via + ' (simulated) · ' + conf });
    } else setStatus(r.case, 'submitted', { path: kind === 'recon' ? 'recon' : 'appeal', note: KINDS[kind].doc(r) + ' submitted via ' + via + ' (simulated) · ' + conf });
    PSY.save(); q.note(KINDS[kind].doc(r) + ' · ' + conf + ' (simulated)'); return { kind, confirmation: conf, via: via + ' (simulated)', simulated: true };
  }, { desc: 'Submit through the payer’s channel (simulated: nothing leaves the demo)' });
  route13('PATCH', '/cases/:case/denial/status', (q) => {
    const r = recOf404(q.params.case); const b = q.body || {}; const s = String(b.status || ''); const note = String(b.note || '').trim();
    if (!DS() || !(DS().LIST || []).some((x) => x[0] === s)) throw apiErr(400, 'Choose a status.');
    if (s === dsGet(r.case) && !note) throw apiErr(409, 'Choose a different status.');
    const o = { note };
    if (['overturned', 'partover', 'upheld'].indexOf(s) >= 0) {
      const raw = b.approved; const n = Math.round(+raw); const b0 = (r.decision && r.decision.approved) || 0;
      if (raw == null || raw === '' || !isFinite(n) || n < 0 || n > r.requested) throw apiErr(400, 'Enter the approved units (0 to ' + r.requested + ').');
      if (s === 'partover' && (n <= b0 || n >= r.requested)) throw apiErr(400, 'Partially overturned: more than ' + b0 + ' and fewer than ' + r.requested + ' units.');
      o.approved = n; o.units = n;
    }
    setStatus(r.case, s, o); PSY.save();
    q.note(r.ini + ' → ' + dsLabel(s) + (o.approved != null ? ' · ' + o.approved + ' units' : '')); return { status: s, label: dsLabel(s), approved: o.approved != null ? o.approved : null };
  }, { desc: 'Update the decision’s status (final outcomes take the approved units; the authorization follows)' });
  /* an error from a route: on the form's error line when there is one, otherwise a toast */
  const apiFail = (e, errEl) => { const m = (e && e.message) || 'Something went wrong.'; if (errEl) errEl.textContent = m; else PSY.ui.toast(m, { err: true }); };

  /* ================================================================ acts ================================================================ */
  const after = (msg, sec) => { if (sec && !SPN) pendingSel = sec; PSY.refresh(); if (msg) PSY.ui.toast(msg); };
  const cOf = (el) => el.getAttribute('data-case');
  const wait = (ms, fn) => setTimeout(fn, ms);
  PSY.acts['dic-sec'] = (el, ctx) => { showSec(ctx, el.getAttribute('data-v'), el.getAttribute('data-sec')); };
  /* open a Lauris page with Scan & Enhance (the evidence gap's document) */
  PSY.acts['dic-enhance'] = (el) => {
    const to = el.getAttribute('data-go-to'); const cid = cOf(el);
    if (PSY.can('enhance') && PSY.enhance) {
      if (typeof PSY.enhance.open === 'function' && to) { PSY.enhance.open(to); return; }
      if (typeof PSY.enhance.openFor === 'function') { PSY.enhance.openFor(cid); return; }
    }
    PSY.go(to || 'lauris-consumers');
  };
  /* a weak point's cited records go into the appeal and reconsideration packages (their supporting-document checklists) */
  PSY.acts['dic-add-ev'] = (el) => {
    const r = rec(cOf(el)); if (!r || !clinical()) return; const w = weakPoints(r).find((x) => x.k === el.getAttribute('data-k')); if (!w) return;
    const s = st(r.case); s.added = s.added || {}; s.added[w.k] = PSY.now();
    const labels = evidence(r).filter((x) => x.src && (w.src || []).indexOf(x.src) >= 0).map((x) => x.doc + (x.date ? ' · ' + x.date : ''));
    const list = checklist(r); s.check = s.check || {};
    ['appeal', 'recon'].forEach((kind) => { s.check[kind] = s.check[kind] || {}; list.forEach((x) => { if (labels.indexOf(x.label) >= 0) s.check[kind][x.k] = true; }); });
    audit(r.case, 'Added to the evidence: ' + (w.src || []).join(', '));
    PSY.save(); after('Added to the evidence.');
  };
  const RUN = {
    analyze(r) {
      const key = r.case + '|analyze'; if (BUSY[key]) return; BUSY[key] = true; PSY.refresh();
      wait(800, () => { delete BUSY[key]; try { apiDo('POST', base(r.case) + '/steps/analyze'); } catch (e) { apiFail(e); PSY.refresh(); return; } after('Analysis ready.'); });
    },
    gaps(r) { let res = null; try { res = apiDo('POST', base(r.case) + '/steps/gaps'); } catch (e) { apiFail(e); PSY.refresh(); return; } after(res.missing.length + ' items missing.'); },
    /* round 13: the request is an inline form (its side panel or the Documentation request section), see dic-docreq-send */
    docreq(r) { openPanel(r, 'docreq'); },
    appeal(r) { draftAction(r, 'appeal'); },
    recon(r) { draftAction(r, 'recon'); },
    p2p(r) {
      const gk = r.case + '|p2p'; if (GEN[gk] || !PSY.dicase.p2pGenerate) return;
      if (doc('p2p', r.case)) { after('', 'p2p'); return; }
      const inP = !!SPN; GEN[gk] = true; if (!inP) pendingSel = 'p2p'; PSY.refresh();
      wait(900, () => { delete GEN[gk]; try { apiDo('POST', base(r.case) + '/drafts/p2p'); } catch (e) { apiFail(e); PSY.refresh(); return; } after('Script ready.', inP ? '' : 'p2p'); });
    },
    /* round 13: the clinical review is chosen in its side panel (reviewer + note), see dic-review-send */
    review(r) { openPanel(r, 'review'); },
  };
  function draftAction(r, kind) {
    const gk = r.case + '|' + kind; if (GEN[gk]) return;
    if (doc(kind, r.case)) { after('', kind); return; }
    const inP = !!SPN; GEN[gk] = true; if (!inP) pendingSel = kind; PSY.refresh();
    wait(900, () => {
      delete GEN[gk]; try { apiDo('POST', base(r.case) + '/drafts/' + kind); } catch (e) { apiFail(e); PSY.refresh(); return; }
      after('Draft ready.', inP ? '' : kind);
    });
  }
  /* the seven steps: "Open" on a step opens its side panel (a step not run yet starts there); the same buttons inside a section run the step */
  PSY.acts['dic-act'] = (el) => {
    const r = rec(cOf(el)); const key = el.getAttribute('data-k'); if (!r || !RUN[key]) return;
    if (NEEDS_CLIN[key] && !clinical()) { PSY.ui.toast('Clinical record access required.'); return; }
    if (el.closest('.dc-acts')) { openPanel(r, key); return; }
    RUN[key](r);
  };
  /* the panel: open another step (Missing evidence → Documentation request), close it */
  PSY.acts['dic-sp'] = (el) => { const r = rec(cOf(el)); const k = el.getAttribute('data-k'); if (!r || !STEP[k]) return; if (NEEDS_CLIN[k] && !clinical()) { PSY.ui.toast('Clinical record access required.'); return; } openPanel(r, k); };
  PSY.acts['dic-sp-close'] = () => closePanel();
  /* the documentation request (inline form): the ticked items, from whom */
  PSY.acts['dic-docreq-send'] = (el) => {
    const r = rec(cOf(el)); const box = el.closest('[data-psy="docreq-form"]'); if (!r || !box) return;
    const items = Array.from(box.querySelectorAll('input[data-gap]')).filter((x) => x.checked).map((x) => x.getAttribute('data-gap'));
    const from = (box.querySelector('[data-psy="docreq-to"]') || {}).value || r.clinician;
    try { apiDo('POST', base(r.case) + '/documentation-requests', { items, from }); } catch (e) { apiFail(e, box.querySelector('[data-psy="docreq-err"]')); return; }
    after('Request sent.');
  };
  PSY.acts['dic-docreq-new'] = (el) => { st(cOf(el)).docreqForm = true; PSY.save(); PSY.refresh(); };
  PSY.acts['dic-docreq-cancel'] = (el) => { st(cOf(el)).docreqForm = false; PSY.save(); PSY.refresh(); };
  /* Mark for Clinical Review: the reviewer and an optional note */
  PSY.acts['dic-review-send'] = (el) => {
    const r = rec(cOf(el)); if (!r) return; const box = el.closest('[data-psy="review-form"]');
    const to = ((box && box.querySelector('[data-psy="review-to"]')) || {}).value || r.clinician;
    const note = (((box && box.querySelector('[data-psy="review-note"]')) || {}).value || '').trim();
    try { apiDo('POST', base(r.case) + '/clinical-review', { reviewer: to, note }); } catch (e) { if (e && e.status === 409) PSY.ui.toast(e.message); else apiFail(e); return; }
    after('Marked for clinical review.');
  };
  PSY.acts['dic-doc-got'] = (el) => {
    const cid = cOf(el); const i = +el.getAttribute('data-i');
    try { apiDo('PATCH', base(cid) + '/documentation-requests/items/' + i, { received: true }); } catch (e) { apiFail(e); return; }
    after('Received.');
  };
  /* other options: accept, alternative, more information */
  PSY.acts['dic-opt'] = (el) => {
    const r = rec(cOf(el)); const key = el.getAttribute('data-k'); if (!r) return;
    let o = null; try { o = D().optDefs(r)[key]; } catch (e) { o = null; } if (!o) return;
    if (key === 'accept') {
      /* the model closes the case with the payer's units (Closed) */
      PSY.ui.modal({ title: o.label + '?', sub: r.who + ' · ' + r.payerName, body: '', actions: [{ label: 'Cancel' }, { label: 'Confirm: ' + o.label, primary: true, onClick: () => { D().choose(r.id, 'accept'); after('Recorded.'); } }] });
      return;
    }
    if (key === 'evidence') { if (!clinical()) return; pick(r, 'evidence'); draftActionInfo(r); return; }
    pick(r, key);
    after('Pathway recorded.');
  };
  function draftActionInfo(r) {
    const gk = r.case + '|info'; if (doc('info', r.case)) { after('', 'info'); return; }
    GEN[gk] = true; if (!SPN) pendingSel = 'info'; PSY.refresh();
    wait(900, () => { delete GEN[gk]; try { apiDo('POST', base(r.case) + '/drafts/info'); } catch (e) { apiFail(e); PSY.refresh(); return; } after('Draft ready.', 'info'); });
  }
  /* Update status (header menu) */
  const UNITS_FOR = (r, s) => ({ overturned: r.requested, upheld: (r.decision && r.decision.approved) || 0, partover: '' })[s];
  PSY.acts['dic-status-pick'] = (el, ctx) => {
    const r = rec(cOf(el)); const s = el.value; const lab = ctx.root.querySelector('#dc-units-l'); const u = ctx.root.querySelector('#dc-units'); if (!r || !lab || !u) return;
    const show = ['overturned', 'partover', 'upheld'].indexOf(s) >= 0; lab.hidden = !show; if (show) u.value = UNITS_FOR(r, s);
    const e = ctx.root.querySelector('#dc-st-err'); if (e) e.textContent = '';
  };
  PSY.acts['dic-status-save'] = (el, ctx) => {
    const r = rec(cOf(el)); if (!r) return; const v = (s) => ((ctx.root.querySelector(s) || {}).value || '').trim();
    const s = v('#dc-status'); const err = (m) => { const e = ctx.root.querySelector('#dc-st-err'); if (e) e.textContent = m; };
    if (!s) return;
    const final = ['overturned', 'partover', 'upheld'].indexOf(s) >= 0;
    try { apiDo('PATCH', base(r.case) + '/status', { status: s, note: v('#dc-note'), approved: final ? v('#dc-units') : undefined }); } catch (e) { err(e.message); return; }
    after('Status updated.');
  };
  /* drafting acts */
  const kOf = (el) => el.getAttribute('data-kind');
  const taOf = (ctx, cid, kind) => ctx && ctx.root && ctx.root.querySelector('textarea[data-case="' + cid + '"][data-kind="' + kind + '"]');
  const syncTa = (el, ctx) => { const cid = cOf(el); const kind = kOf(el); const ta = taOf(ctx, cid, kind); const d = doc(kind, cid); if (ta && d && ta.value !== d.text) SY().edit(dkey(kind, cid), ta.value); };
  PSY.acts['dic-edit'] = (el, ctx) => {
    const cid = cOf(el); const kind = kOf(el); SY().edit(dkey(kind, cid), el.value);
    /* repaint the chips in place (the textarea keeps its focus) */
    const root = ctx.root; const d = doc(kind, cid); const tr = traced(kind) ? trace(d.text) : { ok: true };
    const chip = root.querySelector('[data-psy="draft-state"][data-k="' + kind + '"]'); if (chip) { chip.className = 'sy-st t-amber'; chip.textContent = 'Unsaved changes'; }
    const t = root.querySelector('[data-psy="trace"][data-k="' + kind + '"]'); if (t && traced(kind)) t.innerHTML = traceBody(tr);
    const sec = root.getElementById('sec-' + kind);
    if (sec) {
      const ap = sec.querySelector('[data-act="dic-approve"]'); if (ap) { ap.disabled = !tr.ok; ap.textContent = kind === 'p2p' ? 'Approve version' : 'Approve'; }
      const lab = sec.querySelector('.dw-hs .ev5, .pp-sh .ev5'); if (lab) lab.outerHTML = EV.label('clin', 'Clinician Edited');
      const why = sec.querySelector('[data-psy="draft-why"]'); const whyNot = tr.ok ? '' : (tr.input.length ? 'Complete the Clinician Input Required items' : 'Cite a source for every statement');
      if (why) why.textContent = whyNot; else if (whyNot) { const da = sec.querySelector('[data-psy="draft-acts"]'); if (da) da.insertAdjacentHTML('afterend', '<div class="dc-why" data-psy="draft-why">' + esc(whyNot) + '</div>'); }
      const sv = sec.querySelector('[data-act="dic-save"]'); if (sv) sv.disabled = false;
      ['dic-prepare', 'dic-submit'].forEach((a) => { const b = sec.querySelector('[data-act="' + a + '"]'); if (b) b.disabled = true; });
      const fl = sec.querySelector('[data-psy="draft-flow"]'); if (fl) { fl.setAttribute('data-stage', 'edited'); Array.from(fl.children).forEach((li, i) => { li.className = i < 1 ? 'done' : i === 1 ? 'now' : ''; }); }
    }
  };
  PSY.acts['dic-save'] = (el, ctx) => {
    const cid = cOf(el); const kind = kOf(el); const ta = taOf(ctx, cid, kind);
    try { apiDo('PATCH', base(cid) + '/drafts/' + kind, { text: ta ? ta.value : undefined }); } catch (e) { apiFail(e); return; }
    after('Draft saved.');
  };
  PSY.acts['dic-approve'] = (el, ctx) => {
    syncTa(el, ctx); const cid = cOf(el); const kind = kOf(el); if (!doc(kind, cid)) return;
    try { apiDo('POST', base(cid) + '/drafts/' + kind + '/approve'); } catch (e) { PSY.ui.toast(e.message); PSY.refresh(); return; }
    after('Approved.');
  };
  PSY.acts['dic-check'] = (el) => { const cid = cOf(el); const s = st(cid); s.check = s.check || {}; const k = kOf(el); s.check[k] = s.check[k] || {}; s.check[k][el.getAttribute('data-k')] = el.checked; PSY.save(); };
  function packageFiles(r, kind) {
    const list = checklist(r); const chk = (st(r.case).check || {})[kind] || {};
    return [KINDS[kind].file + '_' + r.ini.replace(/\./g, '') + '_' + (r.m.ref || r.case) + '.pdf'].concat(list.filter((x) => (chk[x.k] != null ? chk[x.k] : x.on)).map((x) => x.label));
  }
  PSY.acts['dic-prepare'] = (el, ctx) => {
    syncTa(el, ctx); const r = rec(cOf(el)); const kind = kOf(el); if (!r || !doc(kind, r.case)) return;
    try { apiDo('POST', base(r.case) + '/drafts/' + kind + '/prepare'); } catch (e) { PSY.ui.toast(e.message); return; }
    after('Package prepared.', kind);
  };
  const pdfOf = (r, kind) => { const d = doc(kind, r.case); return PSY.pdf((kind === 'appeal' ? 'Appeal' : kind === 'recon' ? 'Reconsideration request' : 'Additional information') + ' - ' + r.ini + ' - ' + r.payerName, String((d && (d.approved || d.text)) || '').split('\n')); };
  PSY.acts['dic-pdf'] = (el) => { const r = rec(cOf(el)); const kind = kOf(el); if (!r) return; PSY.download(packageFiles(r, kind)[0], pdfOf(r, kind)); };
  PSY.acts['dic-submit'] = (el) => {
    const r = rec(cOf(el)); const kind = kOf(el); if (!r) return; const sb = subOf(r.case, kind); const d = doc(kind, r.case);
    if (!d || d.stage !== 'approved' || !sb.prepared) { PSY.ui.toast('Prepare the package first.'); return; }
    const via = (r.channel && (r.channel.method || r.channel.label)) || 'payer channel'; const conf = confOf(r);
    PSY.ui.modal({
      title: 'Simulate submission to ' + r.payerShort + '?', sub: r.who + ' · ' + KINDS[kind].doc(r) + ' · ' + via,
      body: '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">' + simChip() + '</div><ol style="margin:0;padding-left:18px;font-size:14px">' + sb.prepared.files.map((f) => '<li>' + esc(f) + '</li>').join('') + '</ol>',
      actions: [{ label: 'Cancel' }, { label: 'Simulate Submission', primary: true, onClick: () => {
        let res = null; try { res = apiDo('POST', base(r.case) + '/submissions', { kind }); } catch (e) { apiFail(e); return; }
        after('Submitted (simulated) · ' + ((res && res.confirmation) || conf));
      } }],
    });
  };
  /* claims (illustrative) */
  PSY.acts['dic-claim-opt'] = (el) => { D().choose(el.getAttribute('data-id'), el.getAttribute('data-k')); after('Recorded.'); };
  PSY.acts['dic-claim-gen'] = (el) => { D().genDoc(el.getAttribute('data-id'), el.getAttribute('data-k')); after('Draft ready.'); };
  PSY.acts['dic-claim-input'] = (el) => { D().editDoc(el.getAttribute('data-id'), el.getAttribute('data-k'), el.value); };
  PSY.acts['dic-claim-review'] = (el) => { D().reviewDoc(el.getAttribute('data-id'), el.getAttribute('data-k')); after('Marked reviewed.'); };
  PSY.acts['dic-claim-resolve'] = (el, ctx) => {
    const v = (s) => ((ctx.root.querySelector(s) || {}).value || '').trim(); const e = ctx.root.querySelector('#g-err');
    if (!v('#g-out')) { if (e) e.textContent = 'Choose the outcome to record.'; return; }
    const res = D().resolve(el.getAttribute('data-id'), v('#g-out'), v('#g-units'), v('#g-date'), ''); if (res.err) { if (e) e.textContent = res.err; return; }
    after('Resolution saved.');
  };
  /* older acts kept for screens that still call them */
  PSY.acts['dw-send-reply'] = (el) => { const r = D() && D().get(el.getAttribute('data-id')); PSY.go('di-case?case=' + (r ? r.case : 'R-0408') + '&sec=info'); };
  PSY.acts['ir-send'] = () => PSY.go('di-case?case=R-0408&sec=info');
  PSY.acts['dw-choose'] = (el) => { const r = D() && D().get(el.getAttribute('data-id')); PSY.go('di-case?case=' + (r ? r.case : 'R-0388')); };

  /* ================================================================ presenter: scenarios 6 and 7 start state ================================================================ */
  const PR = (PSY.presenter = PSY.presenter || {}); PR.prep = PR.prep || {};
  /* 6 · LCS on E.C. (R-0384, denied): starts at Clinical Review with no appeal in the workspace (the clinician generates it), so the
     scenario does not open on the Oct 26 letter the model seeds as Appeal Drafted */
  PR.prep.s6 = () => {
    ['appeal', 'recon', 'p2p'].forEach((k) => SY() && SY().reset(dkey(k, 'R-0384')));
    PSY.state.dicase = PSY.state.dicase || {}; PSY.state.dicase['R-0384'] = { noSeed: true };
    PSY.state.diStatus = PSY.state.diStatus || {};
    PSY.state.diStatus['R-0384'] = { status: 'review', at: 'Oct 22', by: 'Maria Wood', note: 'Clinical review', issue: 'denial', history: [{ status: 'review', at: 'Oct 22', by: 'Maria Wood', note: 'Clinical review' }] };
    PSY.save();
  };
  PR.prep.s6.go = 'denials'; PR.prep.s6.open = 'di-case?case=R-0384';
  /* 7 · LCS on T.N. (R-0388, 150 requested, 65 approved): the Dec 9, 2:00 pm call is booked, no script yet */
  PR.prep.s7 = () => { SY() && SY().reset(dkey('p2p', 'R-0388')); if (PSY.state.dicase) delete PSY.state.dicase['R-0388']; PSY.save(); };
  PR.prep.s7.go = 'di-case?case=R-0388';


  const WS_CSS = `
  .dc{display:flex;flex-direction:column;gap:16px}
  .dc-crumb{margin:0 0 -6px}
  .dw-sec{padding:0 0 4px;min-width:0}
  .dw-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:16px 20px 10px}
  .dw-h h2{margin:0;font-size:19px}
  .dw-hs{margin-left:auto;display:inline-flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:12.5px}
  .dw-mut,.dc-mut{color:#6B665E}
  .dw-p{margin:0;font-size:13.5px;line-height:1.5}
  .dw-b,.dw-c{padding:2px 20px 16px}
  .dw-src{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px}
  .dw-ev-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px}.dw-ev-h b{font-size:13.5px}
  .pi-link{background:none;border:0;padding:0;font:inherit;font-weight:600;color:#1D4F43;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
  .dc-ok{color:#1E5C3C;font-weight:600}.dc-no{color:#8A2E1C}
  /* header card */
  .dc-hd{padding:18px 22px 16px}
  .dc-hd-t{display:flex;gap:10px 16px;align-items:flex-start;flex-wrap:wrap}
  .dc-hd-l{display:flex;gap:10px;align-items:center;flex-wrap:wrap;flex:1 1 300px;min-width:0}
  .dc-hd-l h1{font-size:28px;line-height:1.15;margin:0 4px 0 0}
  .dc-hd-a{display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end}
  .dc-hd-c{display:flex;gap:8px 10px;align-items:center;flex-wrap:wrap;margin-top:10px}
  .dc-hd-s{margin:8px 0 0;font-size:13.5px;color:#6B665E;line-height:1.45}
  .dc-stc{display:inline-flex}
  .dc-dl{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:2px 10px 2px 8px;font-size:12px;font-weight:600;line-height:1.35;background:#FCF0D6;color:#6F4A05;border:1px solid #EFD49A}
  .dc-dl[title]{cursor:help}.dc-dl b{font-weight:700}.dc-dl i{font-style:normal;font-size:8px}
  .dc-dl.soon{background:#FBE7E2;color:#8A2E1C;border-color:#F0C3B8}
  .dc-auth{display:inline-flex;gap:6px;align-items:center;font-size:12.5px}
  /* Update status: a small menu under its button */
  .dc-upd{position:relative}
  .dc-upd>summary{list-style:none;user-select:none}.dc-upd>summary::-webkit-details-marker{display:none}
  .dc-upd>summary i{font-style:normal;font-size:10px;color:#6B665E}
  .dc-upd[open]>summary{background:#F6F0E8}
  .dc-upd-p{position:absolute;right:0;top:calc(100% + 6px);z-index:30;width:300px;background:#fff;border:1px solid #E0D6C9;border-radius:12px;box-shadow:0 12px 32px rgba(40,30,10,.14);padding:14px;display:flex;flex-direction:column;gap:10px}
  .dc-upd-p label{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#4A453D}
  .dc-upd-p .fld{height:36px;font-size:13.5px;width:100%}
  .dc-upd-p label[hidden]{display:none}.dc-upd-p .btn{align-self:flex-start}.dc-upd-p .dw-err:empty{display:none}
  .dw-err{color:#8A2E1C;font-size:12.5px;font-weight:600;margin-top:4px}
  /* the process stepper */
  .dc-tl{list-style:none;margin:16px 0 0;padding:14px 0 0;border-top:1px solid #EFE8DE;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:0}
  .dc-tl li{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;padding:0 4px;font-size:12.5px;color:#8E99A6;min-width:0}
  .dc-tl li:before{content:"";position:absolute;top:12px;left:-50%;right:50%;height:2px;background:#E5DCD0;z-index:0}.dc-tl li:first-child:before{display:none}
  .dc-tl li.done:before,.dc-tl li.now:before{background:#2F8F5B}
  .dc-tl i{position:relative;z-index:1;width:26px;height:26px;border-radius:50%;background:#EFE8DE;color:#6B665E;font-style:normal;font-weight:700;font-size:12px;display:inline-flex;align-items:center;justify-content:center}
  .dc-tl li.done i{background:#2F8F5B;color:#fff}.dc-tl li.now i{background:#1D4F43;color:#fff;box-shadow:0 0 0 4px #E3EFEA}
  .dc-tl b{font-weight:600;color:#4A453D;line-height:1.25}.dc-tl li.now b{color:#1B1B19}.dc-tl span{font-size:11.5px;color:#6B665E;min-height:14px}
  /* body: the section menu and one section at a time */
  .dc-body{display:grid;grid-template-columns:216px minmax(0,1fr);gap:20px;align-items:start}
  .dc-menu{position:sticky;top:14px;display:flex;flex-direction:column;gap:10px;background:#fff;border:1px solid #E5DCD0;border-radius:14px;padding:10px 8px}
  .dc-mg{display:flex;flex-direction:column;gap:2px}
  .dc-mc{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#8E8A82;font-weight:700;padding:4px 10px 2px}
  .dc-mi{display:flex;flex-direction:column;align-items:flex-start;gap:1px;width:100%;text-align:left;border:0;background:none;border-radius:9px;padding:7px 10px;font:inherit;font-size:13.5px;font-weight:600;line-height:1.3;color:#3A362F;cursor:pointer}
  .dc-mi:hover{background:#F6F0E8}
  .dc-mi.on{background:#E3EFEA;color:#1D4F43;box-shadow:inset 3px 0 0 #1D4F43}
  .dc-mi small{font-size:11.5px;font-weight:500;color:#6B665E}
  .dc-mi small.t-amber{color:#7A5200}.dc-mi small.t-green{color:#1E5C3C}.dc-mi small.t-blue{color:#24476E}.dc-mi small.t-red{color:#8A2E1C}
  .dc-panel{min-width:0}
  .dc-pane{display:flex;flex-direction:column;gap:16px;min-width:0}.dc-pane[hidden]{display:none}
  /* overview: the seven steps */
  .dc-next{display:flex;gap:6px 10px;align-items:baseline;flex-wrap:wrap;font-size:13.5px;margin:0 20px 6px;padding:8px 12px;background:#F6FAF8;border:1px solid #DCEAE3;border-radius:10px}
  .dc-acts{list-style:none;margin:0;padding:0 12px 8px;display:flex;flex-direction:column}
  .dc-act{border-top:1px solid #EFE8DE}.dc-act:first-child{border-top:0}
  .dc-act-b{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:12px;align-items:center;width:100%;padding:9px 8px;border:0;background:none;border-radius:10px;font:inherit;text-align:left;cursor:pointer;color:#1B1B19}
  .dc-act-b:hover{background:#F6F0E8}.dc-act-b[disabled]{cursor:default;color:#8E8A82}.dc-act-b[disabled]:hover{background:none}
  .dc-act-n{width:26px;height:26px;border-radius:50%;background:#EFE8DE;color:#4A453D;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
  .dc-act.done .dc-act-n{background:#2F8F5B;color:#fff}.dc-act.cur .dc-act-n{box-shadow:0 0 0 3px #CFE3DA}
  .dc-act-t{display:flex;flex-direction:column;gap:2px;min-width:0}.dc-act-t>b{font-weight:600;font-size:14px}
  .dc-act-r{display:flex;flex-wrap:wrap;gap:3px 12px;align-items:center;font-size:12.5px;color:#6B665E}
  .dc-act-dl{display:inline-flex;gap:6px;align-items:center}.dc-act-dl .dl5{font-size:12.5px}
  .dc-act-go{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:#1D4F43;white-space:nowrap;border:1px solid #CFE0D6;background:#fff;border-radius:999px;padding:3px 10px 3px 12px}
  .dc-act-go:empty{display:none}.dc-act-go i{font-style:normal;font-size:15px;line-height:1}
  .dc-act-b:hover .dc-act-go{border-color:#1D4F43;background:#F4F9F6}
  .dc-act-b[aria-expanded="true"]{background:#E3EFEA}
  /* what the payer said vs what the chart shows */
  .dc-vs{display:flex;flex-direction:column;gap:10px;padding:12px 0;border-top:1px solid #EFE8DE}.dc-vs:first-child{border-top:0;padding-top:0}
  .dc-said{margin:0 0 8px;padding:11px 16px;border-left:3px solid #C0553A;background:#FBF1EC;color:#7A2E1C;border-radius:0 8px 8px 0;font-size:14.5px;line-height:1.5}
  .dc-vs .dc-said{margin:0}
  .dc-shows p{margin:4px 0 0;font-size:14px;line-height:1.55}.dc-need{font-size:13px!important}
  /* where the denial is weak */
  .dc-wk{display:flex;flex-direction:column;padding-bottom:4px}
  .dc-wp{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;padding:12px 20px;border-top:1px solid #EFE8DE}
  .dc-wk .dc-wp:first-child{border-top:0;padding-top:2px}
  .dc-wp-c{justify-self:start;align-self:start;margin-top:1px}
  .dc-wp-b{min-width:0}.dc-wp-b>b{font-weight:600;font-size:14px;line-height:1.4}
  .dc-wp-b>p{margin:3px 0 0;font-size:13.5px;color:#4A453D;line-height:1.5}
  .dc-wp-f{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin-top:8px;font-size:12.5px}
  .dc-wp-fix{color:#4A453D;min-width:0}
  .dc-ans{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px;padding:14px 20px 14px}
  .dc-an{min-width:0}
  .dc-an h3{margin:0 0 8px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700}
  .dc-an ul,.dc-an ol{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:1.45}
  .dc-none{font-size:13px;margin:0;padding:0 20px 12px}
  .dc-empty{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:4px 20px 16px;font-size:13.5px}
  .dc-empty.in{padding:2px 0 6px}
  .dw-load{display:flex;gap:10px;align-items:center;padding:0 20px 16px;font-size:13px;color:#4A453D}
  .dw-spin{display:inline-block;width:14px;height:14px;border-radius:50%;border:2px solid #CFE3DA;border-top-color:#1D4F43;animation:dwspin .8s linear infinite;flex:0 0 14px}
  @keyframes dwspin{to{transform:rotate(360deg)}}
  /* the payer's decision */
  .dc-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 18px;margin:16px 0 0}
  .dc-facts dt{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B665E;font-weight:700}
  .dc-facts dd{margin:3px 0 0;font-size:14px;font-weight:600;overflow-wrap:anywhere}.dc-facts dd small{display:block;font-weight:400;color:#6B665E;font-size:12px;margin-top:2px;line-height:1.4}
  .dc-rule{display:inline-flex;align-items:center;gap:6px;margin:0 8px 4px 0;font-size:12px;font-weight:500;color:#4A453D;cursor:help}
  .dc-wp-f .dc-rule{margin:0}
  .dc-rva{margin-top:14px;border-top:1px solid #EFE8DE;padding-top:12px}
  .dw-opts{display:flex;flex-direction:column}
  .dw-opt{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:12px 20px;border-top:1px solid #EFE8DE;align-items:start}
  .dw-opt.cur{background:#F6FAF8;box-shadow:inset 3px 0 0 #1D4F43}
  .dw-opt h3{margin:0;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600}
  .dw-opt-m{display:grid;grid-template-columns:68px minmax(0,1fr);gap:8px;margin-top:6px;align-items:center}.dw-opt-v{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center}
  .dw-obs{margin-top:6px;font-size:12.5px;color:#4A453D;line-height:1.45}
  /* clinical evidence */
  .dc-cat{border-top:1px solid #EFE8DE;padding:8px 0}.dc-cat:first-child{border-top:0;padding-top:0}
  .dc-cat-h{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B665E;font-weight:700;margin:4px 0 4px}
  .dc-ev{display:grid;grid-template-columns:minmax(150px,.75fr) minmax(0,1.6fr);gap:12px;padding:6px 0;font-size:13.5px;line-height:1.45;align-items:start}
  .dc-ev.gap .dc-ev-t b{font-weight:600}.dc-ev.gap.hl{background:#FFF8E8;border-radius:8px;padding:6px 8px;margin:0 -8px}
  .dc-ev-t .dc-enh{margin-top:4px}
  .dc-doc{display:inline-flex;flex-wrap:wrap;gap:2px 6px;align-items:baseline;text-align:left;background:none;border:0;padding:0;font:inherit;cursor:pointer;color:#1D4F43}
  .dc-doc b{font-weight:600;text-decoration:underline;text-underline-offset:2px}.dc-doc span{font-size:12px;color:#6B665E}.dc-doc i{font-style:normal;font-size:11px}
  .dc-rs{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#6B665E;background:#F3F0EA;border-radius:999px;padding:2px 9px}.dc-rs i{font-style:normal;font-size:10px}
  .dc-enh{font-size:12.5px}
  /* documentation request */
  .dc-h3{margin:4px 0 8px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700}.dc-h3+*{margin-bottom:12px}
  .dc-out{margin:0;padding:8px 10px;list-style:none;background:#FCFAF6;border:1px solid #EFE8DE;border-radius:8px;font-size:12.5px;display:flex;flex-direction:column;gap:6px}
  .dc-out li{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:center}.dc-out li b{font-weight:600;flex:1 1 160px}.dc-out li span{color:#6B665E}
  .dc-more{margin:10px 0 4px}
  /* drafts */
  .dc-draft{padding:0 20px 16px;display:flex;flex-direction:column;gap:10px}
  .dc-flow li.now{background:#1D4F43;color:#fff}
  .dc-trace{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px}.dc-trace ul{flex-basis:100%;margin:2px 0 0;padding-left:18px;color:#6F4A05}
  .dw-ta{width:100%;height:auto!important;padding:10px 12px!important;font-size:13px!important;line-height:1.55;font-family:'DM Sans',system-ui,sans-serif;resize:vertical}
  .dc-srcs{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.dc-pol .ev5{white-space:normal}
  .dc-chk{border:1px solid #EFE8DE;border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:4px}
  .dc-ck{display:flex;gap:8px;align-items:center;font-size:13px}.dc-ck em{font-style:normal;font-size:11.5px;font-weight:600;color:#6F4A05;background:#FBF1DA;border-radius:999px;padding:1px 8px}
  .dc-dacts{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  .dc-why{font-size:12.5px;color:#6F4A05;font-weight:600}
  .dc-pack{border:1px solid #CFE3DA;background:#F6FAF8;border-radius:10px;padding:10px 12px;font-size:13px}.dc-pack ol{margin:6px 0 8px;padding-left:18px}
  .dc-sent{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;background:#E3EFEA;border-radius:10px;padding:10px 12px}.dc-sent b{font-size:15px}.dc-sent span{color:#4A453D}
  /* history (collapsed at the bottom) */
  .dc-hist{padding:0}
  .dc-hist>summary{display:flex;align-items:center;gap:12px;padding:16px 22px;cursor:pointer;list-style:none;user-select:none}
  .dc-hist>summary::-webkit-details-marker{display:none}
  .dc-hist>summary h2{font-size:19px}
  .dc-chev{margin-left:auto;width:9px;height:9px;border-right:2px solid #6B665E;border-bottom:2px solid #6B665E;transform:rotate(45deg);transition:transform .15s;margin-top:-4px}
  .dc-hist[open] .dc-chev{transform:rotate(-135deg);margin-top:4px}
  .dc-hist-b{padding:12px 22px 16px;border-top:1px solid #EFE8DE}
  /* round 13: the shared History block at the bottom */
  .dc-hist2{min-width:0}
  /* round 13: the request and review forms, missing evidence, the clinical review */
  .dc-req{display:flex;flex-direction:column;gap:10px;border:1px solid #EFE8DE;border-radius:10px;padding:10px 12px;background:#FCFAF6}
  .dc-req-l{display:flex;flex-direction:column;gap:4px}
  .dc-req-r{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:flex-end}
  .dc-req-f{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#4A453D;min-width:0}
  .dc-req-f .fld{height:36px;font-size:13.5px;width:220px;max-width:100%}.dc-req-f.w{flex:1 1 200px}.dc-req-f.w .fld{width:100%}
  .dc-req .dw-err:empty{display:none}
  .dc-req+.dc-h3{margin-top:16px}
  .dc-gps{display:flex;flex-direction:column}
  .dc-gp{display:flex;flex-direction:column;gap:6px;padding:10px 0;border-top:1px solid #EFE8DE}.dc-gp:first-child{border-top:0;padding-top:2px}
  .dc-gp-t{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center;font-size:14px}.dc-gp-t b{font-weight:600}
  .dc-gp-f{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:12.5px}
  .dc-gp-n{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;justify-content:flex-end;margin-top:10px;padding-top:12px;border-top:1px solid #EFE8DE;font-size:12.5px}
  .dc-rev{display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;font-size:13.5px;background:#F6FAF8;border:1px solid #DCEAE3;border-radius:10px;padding:10px 12px;margin-bottom:10px}.dc-rev b{font-weight:600}
  .dc-rv{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;font-size:13px}
  .dc-rv li{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid #EFE8DE}.dc-rv li:first-child{border-top:0}
  .dc-ph .dc-empty{padding:16px 20px}
  .dc-voice{display:inline-flex}
  /* round 13: the side panel: a right-side slide-over over the page (docked at the right edge of the view, full height) */
  .dc-sp-dock{order:20;position:sticky;top:0;align-self:flex-start;flex:0 0 0px;width:0;height:var(--vh,100vh);z-index:60}
  .dc-sp-scrim{position:absolute;top:0;bottom:0;right:0;width:300vw;background:rgba(27,27,25,.30);cursor:pointer}
  .dc-sp-scrim.in{animation:dcsp-f .18s ease-out}
  .dc-sp{position:absolute;top:0;right:0;bottom:0;width:600px;max-width:calc(100vw - 96px);display:flex;flex-direction:column;background:#fff;border-left:1px solid #E5DCD0;box-shadow:-18px 0 44px rgba(27,27,25,.18);outline:none}
  .dc-sp.in{animation:dcsp-in .22s cubic-bezier(.2,.8,.2,1)}
  @keyframes dcsp-in{from{transform:translateX(28px);opacity:0}to{transform:none;opacity:1}}
  @keyframes dcsp-f{from{opacity:0}to{opacity:1}}
  .dc-sp-h{flex:0 0 auto;display:flex;align-items:flex-start;gap:12px;padding:16px 14px 14px 20px;border-bottom:1px solid #E5DCD0;background:#FAF6F1}
  .dc-sp-n{flex:0 0 30px;width:30px;height:30px;border-radius:50%;background:#1D4F43;color:#fff;font-size:13px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-top:2px}
  .dc-sp-n.done{background:#2F8F5B}
  .dc-sp-ht{flex:1;min-width:0}
  .dc-sp-cap{font-size:12px;color:#6B665E;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dc-sp-h h2{margin:2px 0 7px;font-size:20px;line-height:1.2}
  .dc-sp-st{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;font-size:12.5px}
  .dc-sp-st .st5 .dw-spin{width:10px;height:10px;flex-basis:10px;border-width:2px}
  .dc-sp-x{flex:0 0 auto;border:0;background:none;width:34px;height:34px;border-radius:9px;color:#4A453D;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
  .dc-sp-x:hover{background:#EFE8DE}.dc-sp-x:focus-visible{outline:2px solid #1D4F43;outline-offset:1px}
  .dc-sp-b{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:2px 0 8px}
  .dc-sp .card{border:0;border-radius:0;box-shadow:none;background:transparent}
  .dc-sp .dw-sec+.dw-sec{border-top:1px solid #EFE8DE}
  .dc-sp .dw-h{padding:14px 20px 8px}.dc-sp .dw-h h2{font-size:16px}
  .dc-sp .dc-ans{grid-template-columns:minmax(0,1fr);gap:14px}
  .dc-sp .dc-wp{grid-template-columns:56px minmax(0,1fr)}
  .dc-sp .pp-guide{grid-template-columns:minmax(0,1fr)}
  .dc-sp .dc-dacts{position:sticky;bottom:-8px;z-index:2;background:#fff;margin:0 -20px;padding:10px 20px 12px;border-top:1px solid #EFE8DE;box-shadow:0 -6px 12px -10px rgba(27,27,25,.25)}
  .dc-sp .dc-why{margin-top:-4px}
  .dc-sp .dc-dacts>.ev5{margin-left:auto}
  .dc-nw{white-space:nowrap}
  /* claims */
  .dw-dec{font-size:14.5px;margin-bottom:10px}
  .dw-docs{display:flex;flex-direction:column;gap:10px;padding:0 20px 16px}
  .dw-doc{border:1px solid #E5DCD0;border-radius:10px;background:#fff}
  .dw-doc-s{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:11px 14px}.dw-doc-s .sp{flex:1}
  .dw-doc-b{padding:0 14px 14px}.dw-doc-a{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  @media (max-width:1100px){.dc-body{grid-template-columns:minmax(0,1fr)}.dc-menu{position:static;flex-direction:row;flex-wrap:wrap}.dc-mg{flex-direction:row;flex-wrap:wrap}.dc-mc{display:none}.dc-mi{width:auto}.dc-ans{grid-template-columns:minmax(0,1fr)}}
  `;
})();
