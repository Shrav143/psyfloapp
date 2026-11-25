/* Round 11 (owner FLOW11): FLO, the data agent (an add-on). The user asks for a data point; a Psyflo agent signs in to Lauris Online,
   finds the matching charts, downloads their data, sends it to the Psyflo backend, scans the Psyflo database and builds the answer:
   a short summary, a table, charts drawn in the chat, a PDF report with the same charts (PSY.pdfReport, 06-pdf-report.js) and a CSV.
   API: PSY.flow = { barHtml(), html(o), open(prompt?), close(), ask(text), parse(text), compute(spec), plan(spec), files(msgId), speed }
     barHtml()  the "FLO" button in the platform top bar (shell.js, left of the bell; the only way in since round 12) · html(o)  the
     right-side drawer, rendered on every platform page (shell.js, inside .pf). Both only when PSY.can('flow'). The drawer content is rendered only
     while the drawer is open.
   State: PSY.state.fl11 = { open, chats: { <role>: { msgs, draft } }, seq }. One conversation per role ("View as" never shows another
     role's answers). Answers are recomputed from the stored request (spec) at render, so the role's caseload and clinical access always
     apply. Messages: user {text} · flow kinds: help (unrecognised), blocked (clinical filter without clinical access), run (the agent
     card; time-based, so a re-render or reload resumes it) and answer.
   Agent run: six steps with simulated durations (the ETA) and demo durations (≈ 11–12 s in all; PSY.flow.speed > 1 runs faster, for
     tests). One Simulated chip on the card.
   Data: one fictional dataset, read from what the demo already shows: age, school and clinician from PSY.data.lauris.consumers;
     diagnosis from the case record (PSY.data.hub … picture.diagnosis; T.W.'s only once his intake is processed); medications from the
     Lauris Medications tab (PSY.l1a.MEDS); payer, authorization status and units from PSY.auth; payer decisions from PSY.di; substance use
     mentions and interventions as in the round-9 Analytics demo record, plus ONE mention added here (D.W., marked fictional).
   Roles: LCS = their caseload; admin = all consumers; DSS has no platform and no FLO. Clinical fields (diagnosis, medications, substance
     use mentions, interventions) need PSY.can('clinicalRecords'): otherwise they are withheld and the answer names them; a request that
     filters on a clinical field is not run. Wording: FLO is a clinic-facing assistant and says "patients" (the rest of the platform says
     "consumer"). Presenter: PSY.presenter.prep.s10. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc;
  const FL = (PSY.flow = PSY.flow || {});
  FL.EXAMPLE = 'Pull the diagnosis, medications and age range of all my substance use patients currently at Harvest';
  FL.speed = 1;
  const PAL = () => (PSY.pdfReport && PSY.pdfReport.PALETTE) || ['#008F7A', '#D9692B', '#2A78D6', '#B88A0A', '#8B5FBF', '#D0506E'];
  const NONE_C = '#A8A196';
  const DATE = 'Oct 29, 2026'; const ISO = '2026-10-29';

  /* ================= data ================= */
  /* substance use mentions. All fictional (as in the round-9 Analytics record); D.W.'s is the one added for FLO. src: where the agent finds it */
  const SUBST = [
    { c: '4449', text: 'Vaping at school, reported by the school counselor.', doc: 'Admission Screening', date: '08/10/2026', src: 'lauris', fictional: true },
    { c: '4449', text: 'Vaping discussed in session.', doc: 'Daily progress note', date: '10/14/2026', src: 'psyflo', fictional: true },
    { c: '4426', text: 'Tried alcohol once, self-reported. No treatment.', doc: 'Intake (CNA)', date: '09/08/2026', src: 'lauris', fictional: true },
    { c: '4458', text: 'Nicotine vaping at school, reported by the school counselor.', doc: 'Intake (CNA)', date: '08/18/2026', src: 'lauris', fictional: true, flow11: true }, // round 12: cited from a document Lauris shows (U.SUBST_LINES)
  ];
  /* interventions in daily progress notes (Lauris ISP picklist names); the first three quote processed notes in the demo record */
  const IVS = [
    { c: '4471', iv: 'Clinical 2.1 Movement', date: '10/27/2026', src: 'psyflo' },
    { c: '4471', iv: 'QMHP 1.2 Coping skills practice', date: '09/15/2026', src: 'lauris' },
    { c: '4441', iv: 'QMHP 1.7 Social skills coaching', date: '09/22/2026', src: 'lauris' },
    { c: '4458', iv: 'Clinical 2.1 Movement', date: '10/20/2026', src: 'lauris', fictional: true },
    { c: '4430', iv: 'QMHP 1.2 Coping skills practice', date: '10/06/2026', src: 'lauris', fictional: true },
    { c: '4449', iv: 'QMHP 1.7 Social skills coaching', date: '10/08/2026', src: 'lauris', fictional: true },
    { c: '4426', iv: 'QMHP 1.4 Structured problem solving', date: '10/13/2026', src: 'psyflo', fictional: true },
  ];
  /* daily progress notes on file per consumer (M.R. 61 and S.B. 34 as the concurrent SRA drafts say; services not started = 0) */
  const NOTES = { '4492': 0, '4471': 61, '4466': 0, '4458': 48, '4455': 0, '4449': 35, '4441': 26, '4437': 0, '4430': 34, '4426': 22, '4419': 5 };
  const MEDS0 = { '4492': [['Albuterol inhaler', '2 puffs as needed']], '4449': [['Guanfacine ER', 'Once daily, morning']] };
  const BANDS = [['5–7', 5, 7], ['8–10', 8, 10], ['11–13', 11, 13], ['14–17', 14, 17]];
  const SRC = { lauris: 'Lauris chart', psyflo: 'Psyflo database' };
  const PAYER = (id) => ((PSY.data.payers || {})[id] || {}).short || id || '';

  const safe = (f, d) => { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } };
  FL.people = () => PSY.data.lauris.consumers.filter((c) => !c.discharged).map((c) => {
    const cid = c.case && PSY.caseById(c.case) ? c.case : null; const cv = cid ? PSY.caseView(cid) : null;
    const hub = cid ? (PSY.data.hub || {})[cid] : null; let dx = hub && hub.picture && hub.picture.diagnosis;
    if (c.id === '4492' && PSY.flowRank() < 2) dx = null; // T.W.'s diagnosis is in Lauris once his intake (CNA) is processed
    const meds = (((PSY.l1a && PSY.l1a.MEDS) || MEDS0)[c.id] || []).map((m) => ({ name: m[0], dose: m[1] }));
    const payer = cv ? cv.payer : c.payer || '';
    const vis = cid ? safe(() => PSY.auth.visible(cid), true) : false;
    const status = cid && vis ? safe(() => PSY.auth.status(cid), '') : '';
    const u = cid ? safe(() => PSY.auth.units(cid), null) : null;
    const di = cid ? safe(() => (PSY.di.records ? PSY.di.records().concat(PSY.di.claims ? PSY.di.claims() : []) : []).filter((r) => r.case === cid && r.kind !== 'info'), []) : []; // denials and partial approvals (claims included); an information request is not a denial
    const school = String(c.school || ''); const site = (school.split('·')[1] || '').trim();
    const docs = safe(() => PSY.l1a.DOCS(c), []);
    return {
      id: c.id, ini: c.ini, age: c.age, school, site, county: /^Campbell/.test(school) ? 'campbell' : 'lynchburg', staff: c.staff, case: cid,
      dx: dx ? { code: dx.code, text: dx.text } : null, meds, payer, payerShort: PAYER(payer),
      status, statusLabel: status ? PSY.auth.label(status) : cid ? 'New case · not requested yet' : 'No case',
      cur: u && u.current ? u.current : null, unitWord: u && u.service ? u.service.units : 'units',
      di: di.map((r) => ({ kind: r.kindLabel || r.issueLabel || 'Decision', requested: r.requested, approved: r.approved, offered: !!(r.issue === 'reduction' && r.open), status: r.diLabel || (r.statusDef || {}).label || '', claim: !!r.isClaim, ref: r.ref || r.id })),
      subst: SUBST.filter((m) => m.c === c.id), ivs: IVS.filter((m) => m.c === c.id),
      docs: docs.length || 6, forms: docs.filter((d) => d.type === 'Signed form').length, notes: NOTES[c.id] || 0,
    };
  });

  /* ================= understanding the request ================= */
  const RX = {
    dx: /diagnos|\bdx\b|\bicd/, meds: /medicat|\bmeds?\b|prescri|\brx\b/, age: /\bages?\b|age range|age group|how old/,
    school: /school|location|\bsites?\b|campus|county|\bcity\b/, payer: /payer|insur|health plan|\bmco\b|medicaid plan/,
    status: /authori[sz]ation|\bauths?\b|\bstatus\b|approved|pending|expir/, units: /\bunits?\b/,
    denials: /denial|denied|partial|appeal|peer.to.peer|\bp2p\b|reconsider/, iv: /intervention|coping skill|social skill|movement|problem.solving/,
    subst: /substance|\bvap(e|es|ing)\b|alcohol|\bdrugs?\b|nicotine|cannabis|marijuana|smok|tobacco|\bthc\b/,
  };
  /* round 12: filters FLO used to drop silently. Diagnosis: a word or an ICD-10 code, matched against the diagnosis on file (text or code).
     Intervention: one of the ISP picklist names. Units left and age: thresholds. A diagnosis word FLO does not know is named, not ignored. */
  const DXT = [
    ['adhd', /\badhd\b|\badd\b|attention.deficit|hyperactiv/, /attention-deficit|^F90/i, 'ADHD'],
    ['separation', /separation anxiety/, /separation anxiety/i, 'separation anxiety'],
    ['anxiety', /anxi/, /anxi/i, 'anxiety'],
    ['depression', /depress/, /depress/i, 'depression'],
    ['odd', /oppositional|\bodd\b/, /oppositional/i, 'oppositional defiant disorder'],
    ['conduct', /conduct disorder|\bconduct\b/, /conduct disorder/i, 'conduct disorder'],
    ['ptsd', /\bptsd\b|post.?traumatic|\btrauma/, /traumatic/i, 'PTSD'],
    ['adjustment', /adjustment/, /adjustment/i, 'adjustment disorder'],
    ['mood', /\bdmdd\b|mood dysregulation|\bmood disorder/, /mood/i, 'a mood disorder'],
    ['autism', /autis|\basd\b/, /autis/i, 'autism'],
  ];
  const IVN = [['coping', /coping/, /coping skills/i, 'Coping skills practice'], ['social', /social skill/, /social skills/i, 'Social skills coaching'], ['movement', /movement/, /movement/i, 'Movement'], ['problem', /problem.solving/, /problem solving/i, 'Structured problem solving']];
  const DX_STOP = ['the', 'their', 'a', 'an', 'any', 'primary', 'current', 'each', 'my', 'all', 'and', 'or', 'of', 'with', 'what', 'which', 'same', 'no', 'his', 'her', 'its', 'main', 'working', 'clinical',
    'diagnosis', 'diagnoses', 'disorder', 'whose', 'list', 'show', 'pull', 'get', 'give', 'find', 'include', 'including', 'by', 'per', 'latest', 'recorded', 'documented', 'on', 'for', 'have', 'has', 'about',
    'patients', 'patient', 'consumers', 'consumer', 'kids', 'children', 'students', 'everyone', 'these', 'those', 'them', 'in', 'to', 'at', 'from', 'only', 'also', 'plus', 'icd', 'icd-10', 'code', 'codes'];
  const dxOf = (k) => DXT.find((x) => x[0] === k);
  const dxMatch = (F, p) => { if (!F.dx) return true; if (!p.dx) return false; if (/^code:/.test(F.dx)) return p.dx.code.toUpperCase().indexOf(F.dx.slice(5)) === 0; const d = dxOf(F.dx); return !!d && (d[2].test(p.dx.text) || d[2].test(p.dx.code)); };
  const dxName = (F) => (/^code:/.test(F.dx) ? 'diagnosis code ' + F.dx.slice(5) : (dxOf(F.dx) || [])[3] || F.dx);
  const ivOf = (k) => IVN.find((x) => x[0] === k);
  const MED_NAMES = () => { const o = {}; Object.values((PSY.l1a && PSY.l1a.MEDS) || MEDS0).forEach((l) => l.forEach((m) => { o[String(m[0]).toLowerCase().split(' ')[0]] = 1; })); return Object.keys(o); };
  const md = (s) => { const x = /^(\d{2})\/(\d{2})/.exec(s || ''); return x ? +x[1] * 100 + +x[2] : null; };
  const dateOk = (F, s) => { const v = md(s); if (v == null) return true; if (F.month && Math.floor(v / 100) !== F.month) return false; if (F.dateAfter && v < F.dateAfter) return false; if (F.dateBefore && v >= F.dateBefore) return false; return true; };
  const PAYERS = [['anthem', /anthem/], ['sentara', /sentara/], ['aetna', /aetna/], ['humana', /humana/], ['uhc', /united|\buhc\b/]];
  const FIELD_ORDER = ['dx', 'meds', 'age', 'school', 'payer', 'status', 'units', 'denials', 'iv'];
  const FIELD_NAME = { age: 'age', school: 'school', dx: 'diagnosis', meds: 'medications', payer: 'payer', status: 'authorization status', units: 'units', denials: 'payer decisions', iv: 'interventions' };
  const CLIN_FIELDS = ['dx', 'meds', 'iv'];
  FL.parse = (text, prev) => {
    const t = ' ' + String(text || '').toLowerCase().replace(/[’']/g, '') + ' ';
    const f = []; const add = (k) => { if (f.indexOf(k) < 0) f.push(k); };
    ['dx', 'meds', 'age', 'school', 'payer', 'status', 'units'].forEach((k) => { if (RX[k].test(t)) add(k); });
    const flt = {};
    if (RX.subst.test(t)) flt.subst = true;
    const noAdv = /\b(?:without|no|not had|never had|never got) (?:any |an? )?(?:denials?|partial approvals?|appeals?|payer decisions?)\b/.exec(t);
    if (noAdv) { flt.noAdverse = true; add('payer'); add('status'); } else if (RX.denials.test(t)) { flt.adverse = true; add('denials'); add('payer'); }
    if (RX.iv.test(t)) { flt.iv = true; add('iv'); const n = IVN.find((x) => x[1].test(t)); if (n) flt.ivName = n[0]; }
    /* diagnosis filter: an ICD-10 code, or a known diagnosis word; "with X diagnosis" / "diagnosed with X" with an unknown X is reported */
    const code = /\b(f\d{2}(?:\.\d{1,3})?)\b/.exec(t);
    const dk = DXT.find((x) => x[1].test(t));
    if (code) flt.dx = 'code:' + code[1].toUpperCase(); else if (dk) flt.dx = dk[0];
    else { const u = /\bdiagnosed with ([a-z][a-z-]+(?: [a-z][a-z-]+)?)/.exec(t) || /\bdiagnosis of ([a-z][a-z-]+(?: [a-z][a-z-]+)?)/.exec(t) || /\b([a-z][a-z-]+) (?:diagnosis|disorder)\b/.exec(t);
      const w = u && u[1].split(' ').filter((x) => DX_STOP.indexOf(x) < 0).join(' ');
      if (w && /diagnos|disorder/.test(t) && !RX.subst.test(w) && !/^(age|ages|medication|medications|meds|payer|school|status|units?|denials?|interventions?)$/.test(w)) flt.dxUnknown = w; }
    if (flt.dx || flt.dxUnknown) add('dx');
    /* thresholds: units left, then age (so "under 20 units" is not an age) */
    let tt = t;
    const uLt = /\b(?:fewer than|less than|under|below) (\d+) (units?|sessions?)\b/.exec(tt), uGt = /\b(?:more than|over|above|at least) (\d+) (units?|sessions?)\b/.exec(tt);
    if (uLt) { flt.unitsLt = +uLt[1]; flt.unitsWord = uLt[2].slice(0, 4); tt = tt.replace(uLt[0], ' '); } if (uGt) { flt.unitsGt = +uGt[1]; flt.unitsWord = uGt[2].slice(0, 4); tt = tt.replace(uGt[0], ' '); }
    if (uLt || uGt) add('units');
    const aRange = /\b(?:ages?|aged|between) (\d{1,2}) ?(?:-|–|to|and) ?(\d{1,2})\b/.exec(tt);
    const aLt = /\b(?:under|younger than|below|less than) (?:age )?(\d{1,2})\b(?! ?(?:units?|sessions?|days?|percent|%))/.exec(tt);
    const aGt = /\b(?:over|older than|above) (?:age )?(\d{1,2})\b(?! ?(?:units?|sessions?|days?|percent|%))|\b(\d{1,2}) (?:and|or) (?:older|over|up)\b/.exec(tt);
    if (aRange) { flt.ageMin = Math.min(+aRange[1], +aRange[2]); flt.ageMax = Math.max(+aRange[1], +aRange[2]); }
    else { if (aLt) flt.ageMax = +aLt[1] - 1; if (aGt) flt.ageMin = aGt[1] ? +aGt[1] + 1 : +aGt[2]; }
    if (flt.ageMin != null || flt.ageMax != null) add('age');
    const avg = /\baverage|\bmean\b/.test(t);
    /* medications: a name on file, "without any medication", "on a medication" (clinical) */
    const medN = MED_NAMES().find((x) => t.indexOf(x) >= 0);
    const noMed = /\b(?:without|no|not on|off) (?:any |an? )?(?:active )?(?:medications?|meds)\b/.exec(t);
    if (medN) flt.med = medN; else if (noMed) flt.noMeds = true; else if (/\b(?:on|taking|with) (?:any |an? )?(?:active )?(?:medications?|meds)\b/.test(t)) flt.hasMeds = true;
    if (flt.med || flt.noMeds || flt.hasMeds) add('meds');
    /* dates: a month ("in October") or a day ("after October 1", "since 10/01") apply to dated items (interventions, substance use
       evidence); any other date ("last week") or a date on a request without dated items is named as not applied */
    const MON = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monRe = '(' + MON.join('|') + '|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec)';
    const monN = (w) => MON.findIndex((m) => m.indexOf(w) === 0) + 1;
    const dRel = new RegExp('\\b(after|since|from|before|until) ' + monRe + '(?: (\\d{1,2}))?\\b').exec(t) || /\b(after|since|from|before|until) (\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\b/.exec(t);
    const dIn = new RegExp('\\b(?:in|during) ' + monRe + '\\b').exec(t);
    if (dRel) { const m = /\d/.test(dRel[2]) ? +dRel[2] : monN(dRel[2]); const d = dRel[3] ? +dRel[3] : /^(before|until)$/.test(dRel[1]) ? 1 : 1; const v = m * 100 + d; if (/^(before|until)$/.test(dRel[1])) flt.dateBefore = v; else flt.dateAfter = v; flt.dateText = dRel[0].trim(); }
    else if (dIn) { flt.month = monN(dIn[1]); flt.dateText = dIn[0].trim(); }
    const dNA = /\b(?:last|this|past|previous|next) (?:\d+ )?(?:week|month|year|quarter|days?)s?\b|\byesterday\b|\bin 20\d\d\b|\bq[1-4]\b/.exec(t);
    if (dNA && !flt.dateText) flt.dateNA = dNA[0];
    /* negation FLO does not handle ("without a denial", "not at …"): named, not ignored */
    /* patients named by initials: "for K.T. and J.O." keeps them, "except K.T." leaves them out */
    const exM = /\b(?:except|excluding|but not|without|not|other than) ((?:[a-z]\.[a-z]\.?(?:,? (?:and |or )?)?)+)/.exec(t);
    const iniOf = (str) => (str.match(/[a-z]\.[a-z]\.?/g) || []).map((x) => x.replace(/\.?$/, '.').toUpperCase());
    if (exM) flt.exclude = iniOf(exM[1]);
    const incl = iniOf(exM ? t.replace(exM[0], ' ') : t); if (incl.length) flt.only = incl;
    if (!exM && !noMed && !noAdv && !/\b(?:not|outside|except)(?: at| in)? (campbell|lynchburg)/.test(t)) { const neg = /\b(?:without|except|excluding|not)\b [a-z][a-z ]{0,28}/.exec(t); if (neg && !/\bnot (yet|sure)\b/.test(neg[0])) flt.negNA = neg[0].replace(/\s+\S*$/, (x) => (neg[0].length >= 30 ? '' : x)).trim(); }
    if (flt.dateText) flt.dateText = flt.dateText.replace(new RegExp('\\b' + monRe + '\\b'), (m) => MON[monN(m) - 1].charAt(0).toUpperCase() + MON[monN(m) - 1].slice(1));
    const camp = /campbell/.test(t), lyn = /lynchburg/.test(t); if (camp !== lyn) flt.county = camp ? 'campbell' : 'lynchburg';
    const notC = /\b(?:not|outside|except)(?: at| in)? (campbell|lynchburg)/.exec(t); if (notC) flt.county = notC[1] === 'campbell' ? 'lynchburg' : 'campbell';
    const site = /\b(es|ms|hs)\s?-?\s?(\d)\b/.exec(t); if (site) flt.site = site[1].toUpperCase() + '-' + site[2];
    PAYERS.forEach(([k, re]) => { if (re.test(t)) flt.payer = k; });
    if (flt.county || flt.site) add('school');
    if (flt.payer) add('payer');
    let recognized = f.length > 0 || Object.keys(flt).length > 0;
    /* a follow-up ("these patients", "which of them …") keeps the previous filters; "add …" keeps the previous fields too */
    if (prev && recognized && /\b(these|them|those|same|they)\b/.test(t)) {
      Object.keys(prev.filters || {}).forEach((k) => { if (!(k in flt)) flt[k] = prev.filters[k]; });
      if (/\b(add|also)\b/.test(t)) (prev.fields || []).forEach(add);
    }
    if (recognized && !f.filter((k) => k !== 'school').length) ['age', 'payer', 'status'].forEach(add);
    return { text: String(text || ''), fields: FIELD_ORDER.filter((k) => f.indexOf(k) >= 0), filters: flt, recognized, avg };
  };

  /* ================= the answer, computed from the record as it is now ================= */
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  const tally = (list) => { const o = new Map(); list.forEach((k) => o.set(k, (o.get(k) || 0) + 1)); return Array.from(o.entries()).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))); };
  const listAnd = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const dxLabel = (p) => (p.dx ? p.dx.code + ' ' + p.dx.text : 'Not on file yet');
  const medsLabel = (p) => (p.meds.length ? p.meds.map((m) => m.name + ' · ' + m.dose).join('; ') : 'None reported');
  const unitsLabel = (p) => (p.cur ? p.cur.remaining + ' of ' + p.cur.authorized + ' ' + p.unitWord + ' left · ends ' + p.cur.end : 'No authorization in force');
  const diLabel = (p) => (p.di.length ? p.di.map((d) => d.kind + ' · ' + (d.claim ? plural(d.requested, 'unit') + ' billed' : d.requested + ' requested, ' + (d.approved == null ? '-' : d.approved) + (d.offered ? ' offered' : ' approved')) + (d.status ? ' · ' + d.status : '')).join('; ') : 'None');
  const ivLabel = (p) => p.ivs.map((m) => m.iv + ' (' + m.date + ')').join('; ');
  const evLabel = (p) => p.subst.map((m) => m.text + ' (' + m.doc + ', ' + m.date + ', ' + SRC[m.src] + ')').join(' | ');
  const COLS = {
    age: ['Age', (p) => String(p.age)], school: ['School', (p) => p.school], dx: ['Diagnosis', dxLabel], meds: ['Medications', medsLabel], payer: ['Payer', (p) => p.payerShort || '-'],
    status: ['Authorization status', (p) => p.statusLabel], units: ['Units left', unitsLabel], denials: ['Payer decision', diLabel], iv: ['Interventions', ivLabel], ev: ['Evidence', evLabel],
  };
  FL.compute = (spec) => {
    const clin = PSY.can('clinicalRecords'); const allC = PSY.can('allConsumers');
    const all = FL.people(); const scope = all.filter((p) => PSY.inCaseload(p.id));
    const F = spec.filters || {};
    const scopeLabel = allC ? 'All Harvest patients' : 'Your caseload';
    const clinF = (F.subst ? ['substance use'] : []).concat(F.iv ? ['interventions'] : []).concat(F.dx || F.dxUnknown ? ['diagnosis'] : []).concat(F.med || F.noMeds || F.hasMeds ? ['medications'] : []);
    if (!clin && clinF.length) return { blocked: true, clinF, scope: { label: scopeLabel, n: scope.length }, withheld: clinF.concat(spec.fields.filter((k) => CLIN_FIELDS.indexOf(k) >= 0 && k !== 'iv' && !(k === 'dx' && clinF.indexOf('diagnosis') >= 0) && !(k === 'meds' && clinF.indexOf('medications') >= 0)).map((k) => FIELD_NAME[k])) };
    const ivN = F.ivName ? ivOf(F.ivName) : null;
    const dated = !!(F.month || F.dateAfter || F.dateBefore) && !!(F.iv || F.subst || spec.fields.indexOf('iv') >= 0);
    const rows = F.dxUnknown ? [] : scope.map((p) => (ivN || dated ? Object.assign({}, p, { ivs: p.ivs.filter((m) => (!ivN || ivN[2].test(m.iv)) && (!dated || dateOk(F, m.date))), subst: dated ? p.subst.filter((m) => dateOk(F, m.date)) : p.subst }) : p)).filter((p) =>
      (!F.med || p.meds.some((m) => m.name.toLowerCase().indexOf(F.med) === 0)) && (!F.noMeds || !p.meds.length) && (!F.hasMeds || p.meds.length) && (!dated || F.iv || F.subst || p.ivs.length) && (!F.subst || p.subst.length) && (!F.iv || p.ivs.length) && (!F.adverse || p.di.length) && (!F.noAdverse || !p.di.length) && (!F.exclude || F.exclude.indexOf(p.ini) < 0) && (!F.only || F.only.indexOf(p.ini) >= 0) && (!F.county || p.county === F.county) && (!F.site || p.site === F.site) && (!F.payer || p.payer === F.payer) &&
      dxMatch(F, p) && (F.unitsLt == null || (p.cur && String(p.unitWord).indexOf(F.unitsWord || 'unit') === 0 && p.cur.remaining < F.unitsLt)) && (F.unitsGt == null || (p.cur && String(p.unitWord).indexOf(F.unitsWord || 'unit') === 0 && p.cur.remaining > F.unitsGt)) && (F.ageMin == null || p.age >= F.ageMin) && (F.ageMax == null || p.age <= F.ageMax));
    const fields = spec.fields.filter((k) => clin || CLIN_FIELDS.indexOf(k) < 0);
    const withheld = clin ? [] : spec.fields.filter((k) => CLIN_FIELDS.indexOf(k) >= 0).map((k) => FIELD_NAME[k]);
    const has = (k) => fields.indexOf(k) >= 0;
    /* columns: patient, age and school always; then what was asked; the matched evidence for a substance use request */
    const cols = [['Patient', (p) => p.ini], COLS.age, COLS.school].concat(fields.filter((k) => k !== 'age' && k !== 'school').map((k) => COLS[k])).concat(F.subst ? [COLS.ev] : []);
    /* subject and title */
    const where = (F.site ? ' at ' + F.site : F.county ? ' in ' + (F.county === 'campbell' ? 'Campbell County' : 'Lynchburg City') : '') + (F.payer ? ' · ' + PAYER(F.payer) : '');
    const ageW = F.ageMin != null && F.ageMax != null ? (F.ageMin === F.ageMax ? ' aged ' + F.ageMin : ' aged ' + F.ageMin + '–' + F.ageMax) : F.ageMax != null ? ' under ' + (F.ageMax + 1) : F.ageMin != null ? ' aged ' + F.ageMin + ' or older' : '';
    const uw = F.unitsWord === 'sess' ? 'sessions' : 'units';
    const unitW = F.unitsLt != null ? ' with fewer than ' + F.unitsLt + ' ' + uw + ' left' : F.unitsGt != null ? ' with more than ' + F.unitsGt + ' ' + uw + ' left' : '';
    const medW = F.med ? ' on ' + F.med.charAt(0).toUpperCase() + F.med.slice(1) : F.noMeds ? ' with no medication on file' : F.hasMeds ? ' with an active medication' : '';
    const dateW = dated ? ' · ' + F.dateText : '';
    const dxW = F.dx ? ' with ' + dxName(F) : F.dxUnknown ? ' with “' + F.dxUnknown + '”' : '';
    const subject = F.subst ? 'Substance use patients' : F.adverse ? 'Patients with a denial or partial approval' : F.noAdverse ? 'Patients with no denial or partial approval' : F.iv ? (ivN ? ivN[3] + ' documented' : 'Interventions documented') : dxW ? 'Patients' + dxW : 'Patients';
    const asked = fields.filter((k) => (k !== 'school' || !(F.county || F.site)) && !(F.adverse && (k === 'denials' || k === 'payer'))).map((k) => FIELD_NAME[k]);
    const title = subject + (F.dx && subject.indexOf(dxW) < 0 ? dxW : '') + medW + ageW + unitW + where + dateW + (asked.length && !(F.iv && asked.length === 1) ? ': ' + listAnd(asked) : '');
    /* charts (first three in the chat; all in the PDF) */
    const charts = [];
    const pal = PAL();
    if (has('age')) charts.push({ key: 'age', type: 'bar', title: 'Age range', sub: 'Patients by age band', data: BANDS.map((b) => [b[0], rows.filter((p) => p.age >= b[1] && p.age <= b[2]).length]) });
    if (has('dx')) { const d = tally(rows.map((p) => (p.dx ? p.dx.code + ' ' + p.dx.text : 'Not on file yet'))); charts.push({ key: 'dx', type: d.length <= 6 ? 'donut' : 'hbar', title: 'Diagnosis', center: 'patients', data: d.map((x) => [x[0], x[1], x[0] === 'Not on file yet' ? NONE_C : undefined]) }); }
    if (has('meds')) { const d = tally(rows.reduce((a, p) => a.concat(p.meds.length ? p.meds.map((m) => m.name) : ['None reported']), [])); charts.push({ key: 'meds', type: 'hbar', title: 'Medications', sub: 'Patients per medication', data: d.map((x) => [x[0], x[1], x[0] === 'None reported' ? NONE_C : undefined]) }); }
    if (has('payer')) { const d = tally(rows.map((p) => p.payerShort || 'No payer on file')); charts.push({ key: 'payer', type: d.length <= 6 && d.length > 2 && !has('dx') ? 'donut' : 'hbar', title: 'Payer', center: 'patients', data: d }); }
    if (has('status')) charts.push({ key: 'status', type: 'hbar', title: 'Authorization status', data: tally(rows.map((p) => p.statusLabel)) });
    if (has('units')) charts.push({ key: 'units', type: 'hbar', title: 'Units left on the current authorization', data: rows.filter((p) => p.cur).map((p) => [p.ini + ' · ' + p.payerShort, p.cur.remaining]) });
    if (has('denials')) {
      const ds = rows.reduce((a, p) => a.concat(p.di.map((d) => Object.assign({ ini: p.ini }, d))), []);
      charts.push({ key: 'dtype', type: 'hbar', title: 'Payer decisions by type', data: tally(ds.map((d) => d.kind)) });
      const auth = ds.filter((d) => !d.claim);
      if (auth.length) charts.push({ key: 'dunits', type: 'hbar', title: auth.some((d) => d.offered) ? 'Requested vs approved or offered units' : 'Requested vs approved units', series: ['Requested', auth.some((d) => d.offered) ? 'Approved or offered' : 'Approved'], data: auth.map((d) => [d.ini, [d.requested || 0, d.approved || 0]]) });
    }
    if (has('iv')) charts.push({ key: 'iv', type: 'hbar', title: 'Interventions documented', sub: 'Daily progress notes', data: tally(rows.reduce((a, p) => a.concat(p.ivs.map((m) => m.iv)), [])) });
    if (F.subst) charts.push({ key: 'src', type: 'hbar', title: 'Where the evidence was found', data: tally(rows.reduce((a, p) => a.concat(p.subst.map((m) => SRC[m.src])), [])) });
    if (has('school') && !(F.county || F.site)) charts.push({ key: 'school', type: 'hbar', title: 'By school', data: tally(rows.map((p) => p.school)) });
    charts.forEach((c) => { if (c.type === 'donut') c.data.forEach((d, i) => { if (!d[2]) d[2] = pal[i % pal.length]; }); });
    /* summary */
    const ages = rows.map((p) => p.age).sort((a, b) => a - b);
    const median = ages.length ? (ages.length % 2 ? ages[(ages.length - 1) / 2] : (ages[ages.length / 2 - 1] + ages[ages.length / 2]) / 2) : null;
    const what = (F.subst ? ' with substance use documented' : F.iv ? (ivN ? ' with ' + ivN[3].toLowerCase() + ' documented' : ' with interventions documented') : F.adverse ? ' with a denial or partial approval' : F.noAdverse ? ' with no denial or partial approval' : '') + (F.dx && !F.subst && !F.iv && !F.adverse ? '' : dxW) + medW + ageW + unitW;
    const sum = [];
    const lc = scopeLabel.charAt(0).toLowerCase() + scopeLabel.slice(1);
    sum.push((plural(rows.length, 'patient') + (F.dx && !F.subst && !F.iv && !F.adverse ? dxW : '') + what + where + (dated ? ' (' + F.dateText + ')' : '') + (F.only ? ' · named: ' + listAnd(F.only) : '') + (F.exclude ? ' · leaving out ' + listAnd(F.exclude) : '') + '.').replace(/\.\.$/, '.'));
    /* filters FLO could not apply are named, never silently dropped */
    const na = [];
    if (F.dateNA || (F.dateText && !dated)) na.push('“' + (F.dateNA || F.dateText) + '” (dates apply to interventions and substance use evidence only)');
    if (F.negNA) na.push('“' + F.negNA + '”');
    if (F.dxUnknown) { const known = tally(scope.filter((p) => p.dx).map((p) => p.dx.text)).map((x) => x[0]); sum[0] = 'No diagnosis on file matches “' + F.dxUnknown + '”.'; sum.push('Diagnoses on file: ' + listAnd(known.map((x) => x.toLowerCase())) + '.'); }
    sum.push('Scope: ' + lc + ' (' + scope.length + ').');
    const mean = ages.length ? Math.round((10 * ages.reduce((a, b) => a + b, 0)) / ages.length) / 10 : null;
    if (rows.length && has('age')) sum.push('Ages ' + ages[0] + (ages[ages.length - 1] !== ages[0] ? '–' + ages[ages.length - 1] : '') + (spec.avg ? ' · average ' + mean : ' · median ' + median) + '.');
    if (rows.length && has('meds')) sum.push(rows.filter((p) => p.meds.length).length + ' of ' + rows.length + ' with an active medication.');
    if (rows.length && has('dx')) { const d = tally(rows.filter((p) => p.dx).map((p) => p.dx.code)); const top = d.filter((x) => x[1] === (d[0] || [0, 0])[1]); if (d.length) sum.push(d[0][1] === 1 ? (d.length === 1 ? '1 diagnosis.' : plural(d.length, 'diagnosis', 'diagnoses') + ', none shared.') : 'Most common diagnosis: ' + listAnd(top.map((x) => x[0])) + ' (' + d[0][1] + (top.length > 1 ? ' each' : '') + ').'); }
    if (rows.length && has('units')) sum.push(rows.filter((p) => p.cur).length + ' with an authorization in force.');
    if (na.length) sum.push('Not applied: ' + listAnd(na) + '.');
    return { scope: { label: scopeLabel, n: scope.length }, rows, fields, filters: F, withheld, cols, charts, title, summary: sum, clin };
  };

  /* ================= the agent run: six steps, simulated time (the ETA) and demo time ================= */
  const fmtS = (s) => { s = Math.round(s); if (s < 60) return s + ' s'; const m = Math.floor(s / 60), r = s % 60; return m + ' min' + (r ? ' ' + r + ' s' : ''); };
  const about = (s) => (s < 60 ? 'under a minute' : 'about ' + Math.round(s / 60) + ' min');
  const fieldsOf = (p, spec) => { const f = spec.fields; return 8 + (f.indexOf('dx') >= 0 ? 2 : 0) + (f.indexOf('meds') >= 0 ? 3 * Math.max(1, p.meds.length) : 0) + (spec.filters.subst ? 3 * p.subst.length : 0) + (f.indexOf('units') >= 0 ? 5 : 0) + (f.indexOf('status') >= 0 ? 2 : 0) + (f.indexOf('denials') >= 0 ? 4 * p.di.length : 0) + (f.indexOf('iv') >= 0 ? 3 * p.ivs.length : 0); };
  FL.plan = (spec, res) => {
    res = res || FL.compute(spec); const rows = res.rows || []; const m = rows.length; const N = res.scope.n;
    const per = rows.map((p) => ({ ini: p.ini, docs: p.docs + p.subst.filter((x) => x.src === 'lauris').length, fields: fieldsOf(p, spec) }));
    const D = per.reduce((a, x) => a + x.docs, 0), Fd = per.reduce((a, x) => a + x.fields, 0);
    const auths = rows.reduce((a, p) => a + (p.case ? 1 : 0) + (p.cur ? 1 : 0) + p.di.length, 0), notes = rows.reduce((a, p) => a + p.notes, 0), forms = rows.reduce((a, p) => a + p.forms, 0);
    const filt = spec.filters.subst ? 'substance use' : spec.filters.iv ? 'interventions' : spec.filters.adverse ? 'a payer decision' : spec.filters.dx ? 'a matching diagnosis' : '';
    const nCharts = Math.min(3, (res.charts || []).length);
    const steps = [
      { k: 'signin', t: 'Sign in to Lauris Online', sim: 18, ms: 1100, run: 'Signing in with the Psyflo agent account', done: 'Psyflo agent account · read-only session' },
      { k: 'find', t: 'Find matching charts', sim: 12 + N * 1.5, ms: 1500, run: 'Searching ' + plural(N, 'chart') + ' in scope', done: plural(N, 'chart') + ' in scope' + (filt ? ' · ' + m + ' with ' + filt : m < N ? ' · ' + m + ' match' : '') },
      { k: 'download', t: 'Download chart data', sim: Math.max(10, m * 35), ms: Math.min(5000, 900 + m * 1100), run: 'Downloading', done: plural(m, 'chart') + ' · ' + plural(D, 'document') + ' · ' + plural(Fd, 'field'), per },
      { k: 'send', t: 'Send to the Psyflo backend', sim: 8 + m * 4, ms: 1300, run: 'Saving to the Psyflo backend', done: plural(D, 'document') + ' · ' + plural(Fd, 'record') + ' saved' },
      { k: 'scan', t: 'Scan the Psyflo database', sim: 20 + m * 6, ms: 1800, run: 'Scanning authorizations, notes and forms', done: plural(auths, 'authorization') + ' · ' + plural(notes, 'note') + ' · ' + plural(forms, 'form') + ' scanned' },
      { k: 'build', t: 'Build the answer', sim: 15, ms: 1100, run: 'Building the table and charts', done: 'Table · ' + plural(nCharts, 'chart') + ' · PDF and CSV' },
    ];
    const totalSim = steps.reduce((a, s) => a + s.sim, 0), totalMs = steps.reduce((a, s) => a + s.ms, 0);
    return { steps, totalSim, totalMs, m, N };
  };
  /* where a run is now: step index, fraction of that step, simulated seconds elapsed */
  const progressOf = (msg, pl) => {
    const el = msg.done ? Infinity : Math.max(0, (Date.now() - msg.started) * (msg.speed || FL.speed));
    let acc = 0, sim = 0;
    for (let i = 0; i < pl.steps.length; i++) {
      const s = pl.steps[i]; if (el < acc + s.ms) { const f = (el - acc) / s.ms; return { i, f, sim: sim + f * s.sim, done: false }; }
      acc += s.ms; sim += s.sim;
    }
    return { i: pl.steps.length, f: 1, sim: pl.totalSim, done: true };
  };

  /* ================= state ================= */
  const S = () => { const s = (PSY.state.fl11 = PSY.state.fl11 || { open: false, chats: {}, seq: 0 }); s.chats = s.chats || {}; return s; };
  const chat = (r) => { const s = S(); r = r || PSY.role(); return (s.chats[r] = s.chats[r] || { msgs: [], draft: '' }); };
  const nid = () => { const s = S(); s.seq = (s.seq || 0) + 1; return 'f' + s.seq; };
  const lastSpec = (c) => { for (let i = c.msgs.length - 1; i >= 0; i--) { const m = c.msgs[i]; if (m.spec && m.kind !== 'blocked') return m.spec; } return null; };
  const findMsg = (id) => chat().msgs.find((m) => m.id === id) || null;

  /* finish runs whose time is up (works after a re-render, a reload or a role switch) */
  function settle() {
    const c = chat(); let any = false;
    c.msgs.slice().forEach((m) => {
      if (m.kind !== 'run' || m.done) return;
      const pl = FL.plan(m.spec);
      if (progressOf(m, pl).done) {
        m.done = true; m.took = pl.totalSim; m.at = PSY.now(); any = true;
        const i = c.msgs.indexOf(m); c.msgs.splice(i + 1, 0, { id: nid(), who: 'flow', kind: 'answer', spec: m.spec, run: m.id, q: m.q });
        if (PSY.audit) PSY.audit.add({ action: 'FLO: ' + (FL.compute(m.spec).title || m.q), by: PSY.user().name, doc: 'FLO report', silent: true });
      }
    });
    if (any) PSY.save();
    return any;
  }
  let timer = null;
  const running = () => chat().msgs.some((m) => m.kind === 'run' && !m.done);
  function tick() {
    const fin = settle();
    if (fin) { paintBody(true); } else chat().msgs.forEach((m) => { if (m.kind === 'run' && !m.done) paintRun(m); });
    if (!running()) { clearInterval(timer); timer = null; }
  }
  const ensureTimer = () => { if (!timer && running()) timer = setInterval(tick, 200); };

  /* ================= charts in the chat (inline SVG; a <title> on every mark is its hover tooltip) ================= */
  const INK = '#1B1B19', MUTED = '#6B665E', GRID = '#EFE8DE', AXIS = '#9A9388';
  const trunc = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };
  const svg = (w, h, body, label) => '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" role="img" aria-label="' + esc(label) + '" style="display:block;overflow:visible">' + body + '</svg>';
  const T = (x, y, s, o) => { o = o || {}; return '<text x="' + x + '" y="' + y + '" font-size="' + (o.size || 11) + '"' + (o.bold ? ' font-weight="700"' : '') + ' fill="' + (o.color || INK) + '"' + (o.anchor ? ' text-anchor="' + o.anchor + '"' : '') + '>' + esc(s) + '</text>'; };
  function chartSvg(C) {
    const pal = PAL(); const data = C.data || [];
    if (!data.length) return '<p class="fl-mut">No data</p>';
    if (C.type === 'bar') {
      const W = 336, H = 150, L = 26, R = 6, B = 124, TOP = 16; const max = Math.max(1, ...data.map((d) => d[1])); const step = max <= 5 ? 1 : max <= 10 ? 2 : 5; const vmax = Math.ceil(max / step) * step;
      let s = ''; for (let v = 0; v <= vmax; v += step) { const y = B - (v / vmax) * (B - TOP); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="' + (v ? GRID : AXIS) + '" stroke-width="1"/>' + T(L - 6, y + 4, String(v), { size: 10, color: MUTED, anchor: 'end' }); }
      const slot = (W - L - R) / data.length; const bw = Math.min(40, slot * 0.56);
      data.forEach((d, i) => {
        const x = L + i * slot + (slot - bw) / 2; const h = (d[1] / vmax) * (B - TOP);
        if (h > 0) s += '<path d="M' + x + ' ' + B + 'V' + (B - h + 4) + 'q0 -4 4 -4h' + (bw - 8) + 'q4 0 4 4V' + B + 'z" fill="' + (d[2] || pal[0]) + '"><title>' + esc(d[0] + ': ' + d[1]) + '</title></path>' + T(x + bw / 2, B - h - 5, String(d[1]), { size: 11, bold: true, anchor: 'middle' });
        s += T(L + i * slot + slot / 2, B + 16, d[0], { size: 10.5, color: MUTED, anchor: 'middle' });
      });
      return svg(W, H, s, C.title);
    }
    if (C.type === 'hbar') {
      const W = 336, LW = 128, rowH = C.series ? 30 : 24, top = C.series ? 22 : 4; const H = top + data.length * rowH + 4; const bx = LW + 8, bmax = W - bx - 34;
      const vals = data.reduce((a, d) => a.concat(C.series ? d[1] : [d[1]]), []); const max = Math.max(1, ...vals);
      let s = '';
      if (C.series) { let lx = 0; C.series.forEach((n, k) => { s += '<rect x="' + lx + '" y="4" width="10" height="10" rx="2" fill="' + (k ? pal[0] : NONE_C) + '"/>' + T(lx + 14, 13, n, { size: 10.5, color: MUTED }); lx += 26 + n.length * 6; }); }
      data.forEach((d, i) => {
        const cy = top + i * rowH + rowH / 2; s += T(0, cy + 4, trunc(d[0], 22), { size: 11 }) ;
        const vs = C.series ? d[1] : [d[1]];
        vs.forEach((v, k) => {
          const bh = C.series ? 9 : 12; const y = C.series ? cy - 10 + k * 11 : cy - bh / 2; const w = Math.max(v ? 3 : 0, (v / max) * bmax);
          const col = C.series ? (k ? pal[0] : NONE_C) : (d[2] || pal[0]);
          if (w) s += '<path d="M' + bx + ' ' + y + 'h' + Math.max(0, w - 3) + 'q3 0 3 3v' + (bh - 6) + 'q0 3 -3 3h-' + Math.max(0, w - 3) + 'z" fill="' + col + '"><title>' + esc(d[0] + (C.series ? ' · ' + C.series[k] : '') + ': ' + v) + '</title></path>';
          s += T(bx + w + 5, y + bh / 2 + 4, String(v), { size: 10.5, bold: !C.series || k === 1 });
        });
      });
      s += '<line x1="' + bx + '" x2="' + bx + '" y1="' + (top - 2) + '" y2="' + (H - 2) + '" stroke="' + AXIS + '"/>';
      return svg(W, H, s, C.title);
    }
    /* donut / pie: from 12 o'clock clockwise; legend on the right (label + count + share) */
    const tot = data.reduce((a, d) => a + d[1], 0); const r = 48, ri = C.type === 'donut' ? 28 : 0, cx = 52, cy = 54;
    const H = Math.max(112, data.length * 22 + 10); let s = ''; let a = -Math.PI / 2;
    const pt = (rad, ang) => (cx + rad * Math.cos(ang)).toFixed(2) + ' ' + (cy + rad * Math.sin(ang)).toFixed(2);
    data.forEach((d, i) => {
      const da = (d[1] / tot) * Math.PI * 2; const col = d[2] || pal[i % pal.length]; const big = da > Math.PI ? 1 : 0; const e = a + Math.min(da, Math.PI * 2 - 0.0001);
      const path = 'M' + pt(r, a) + 'A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + pt(r, e) + (ri ? 'L' + pt(ri, e) + 'A' + ri + ' ' + ri + ' 0 ' + big + ' 0 ' + pt(ri, a) : 'L' + cx + ' ' + cy) + 'Z';
      s += '<path d="' + path + '" fill="' + col + '" stroke="#fff" stroke-width="1.5"><title>' + esc(d[0] + ': ' + d[1]) + '</title></path>'; a += da;
    });
    if (ri) s += T(cx, cy + 4, String(tot), { size: 17, bold: true, anchor: 'middle' }) + (C.center ? T(cx, cy + 17, C.center, { size: 9, color: MUTED, anchor: 'middle' }) : '');
    data.forEach((d, i) => { const y = 14 + i * 22; s += '<rect x="122" y="' + (y - 9) + '" width="10" height="10" rx="2" fill="' + (d[2] || pal[i % pal.length]) + '"/>' + T(138, y, trunc(d[0], 27), { size: 11 }) + T(336, y, d[1] + ' · ' + Math.round((d[1] / tot) * 100) + '%', { size: 11, bold: true, anchor: 'end' }); });
    return svg(336, H, s, C.title);
  }
  const chartCard = (C) => '<figure class="fl-ch" data-psy="flow-chart" data-chart="' + esc(C.key) + '"><figcaption><b>' + esc(C.title) + '</b>' + (C.sub ? '<span>' + esc(C.sub) + '</span>' : '') + '</figcaption>' + chartSvg(C) + '</figure>';

  /* ================= files: PDF report and CSV ================= */
  const slug = (s) => String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
  FL.files = (msgId) => {
    const m = findMsg(msgId); if (!m || m.kind !== 'answer') return null;
    const res = FL.compute(m.spec); if (res.blocked) return null; const run = findMsg(m.run); const pl = FL.plan(m.spec, res); const u = PSY.user();
    const head = res.cols.map((c) => c[0]); const rows = res.rows.map((p) => res.cols.map((c) => c[1](p)));
    const csv = PSY.csv([head].concat(rows));
    const blocks = [];
    blocks.push({ kv: [['Requested by', u.name + ' · ' + u.label], ['Request', '“' + (m.q || m.spec.text) + '”'], ['Scope', res.scope.label + ' · ' + plural(res.scope.n, 'chart')], ['Matched', plural(res.rows.length, 'patient')],
      ['Sources', 'Lauris Online (FLO agent, simulated) · Psyflo database'], ['Clinical fields', res.withheld.length ? 'Withheld (no clinical record access): ' + listAnd(res.withheld) : res.clin ? 'Included (clinical record access)' : 'None requested']] });
    blocks.push({ h: 'Summary' }, { p: res.summary.join(' ') });
    /* charts two per row; a donut gets a row of its own so its legend has room */
    let pair = [];
    res.charts.forEach((C) => { if (C.type === 'donut') blocks.push({ chart: C }); else { pair.push(C); if (pair.length === 2) { blocks.push({ charts: pair }); pair = []; } } });
    if (pair.length) blocks.push({ charts: pair });
    blocks.push({ pagebreak: true }, { h: 'Patients' });
    const main = res.cols.filter((c) => c[0] !== 'Evidence' && c[0] !== 'Interventions');
    blocks.push({ table: { head: main.map((c) => c[0]), widths: main.map((c) => ({ Patient: 0.75, Age: 0.5, School: 1.5, Diagnosis: 2.2, Medications: 1.9, Payer: 1.4, 'Authorization status': 1.5, 'Units left': 1.8, 'Payer decision': 2.4 })[c[0]] || 1), rows: res.rows.map((p) => main.map((c) => c[1](p))) } });
    if (m.spec.filters.subst && res.rows.length) { blocks.push({ h: 'Matched evidence' }, { table: { head: ['Patient', 'What the record says', 'Document', 'Date', 'Found in'], widths: [0.7, 3, 1.4, 0.9, 1.2], rows: res.rows.reduce((a, p) => a.concat(p.subst.map((x) => [p.ini, x.text, x.doc, x.date, SRC[x.src]])), []) } }); }
    if (res.fields.indexOf('iv') >= 0 && res.rows.length) { blocks.push({ h: 'Interventions' }, { table: { head: ['Patient', 'Intervention', 'Document', 'Date', 'Found in'], widths: [0.7, 2.6, 1.6, 0.9, 1.2], rows: res.rows.reduce((a, p) => a.concat(p.ivs.map((x) => [p.ini, x.iv, 'Daily progress note', x.date, SRC[x.src]])), []) } }); }
    blocks.push({ h: 'How FLO pulled this' }, { table: { head: ['Step', 'What the agent did', 'Time'], widths: [1.6, 3.2, 0.7], rows: pl.steps.map((s, i) => [(i + 1) + ' · ' + s.t, s.done, fmtS(s.sim)]) } });
    blocks.push({ p: 'Total ' + fmtS(pl.totalSim) + (run && run.at ? ' · finished ' + run.at : '') + '.' });
    blocks.push({ note: 'Fictional demo data, initials only. The agent run is simulated. FLO reports what the record says, with its document and date; it adds no clinical findings.' });
    const pdf = PSY.pdfReport({ title: res.title, subtitle: 'Harvest Outreach Center · FLO report · ' + DATE + ' · ' + PSY.now(), brand: 'Psyflo · FLO report', stamp: DATE, footer: 'Fictional demo data · initials only · simulated agent run', blocks });
    const base = 'FLO_' + slug(res.title) + '_' + ISO;
    return { pdfName: base + '.pdf', pdf, csvName: base + '.csv', csv, res };
  };
  const preview = (f) => '<div style="font:13px/1.45 \'DM Sans\',system-ui,sans-serif;color:#1B1B19"><b style="font-size:14px">' + esc(f.res.title) + '</b><div style="color:#6B665E;margin:2px 0 10px">PDF · ' + (f.pdf.match(/\/Type \/Page /g) || []).length + ' pages · ' + plural(f.res.charts.length, 'chart') + ' · ' + plural(f.res.rows.length, 'patient') + '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + f.res.charts.slice(0, 4).map((c) => '<div style="border:1px solid #E5DCD0;border-radius:10px;padding:10px"><b style="font-size:12.5px">' + esc(c.title) + '</b>' + chartSvg(c) + '</div>').join('') + '</div></div>';

  /* ================= rendering ================= */
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l1.9 4.6 4.6 1.9-4.6 1.9L12 16.5l-1.9-4.6L5.5 10l4.6-1.9z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/></svg>';
  const X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const STARTERS = () => [FL.EXAMPLE, 'Authorization status and units left by payer', 'Which patients have a denial or partial approval?', 'Interventions documented in daily notes', 'Age range of patients at Campbell County schools'];
  const chips = (qs) => '<div class="fl-sg" data-psy="flow-suggest">' + qs.map((q) => '<button type="button" data-act="flow-q" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('') + '</div>';
  const scopeLine = () => { const n = PSY.caseload().length; return (PSY.can('allConsumers') ? 'All Harvest patients · ' + n : 'Your caseload · ' + plural(n, 'patient')) + ' · clinical fields ' + (PSY.can('clinicalRecords') ? 'included' : 'withheld'); };

  function runHtml(m) {
    const pl = FL.plan(m.spec); const pr = progressOf(m, pl); const pct = Math.round((pr.sim / pl.totalSim) * 100); const left = pl.totalSim - pr.sim;
    const steps = pl.steps.map((s, i) => {
      const st = i < pr.i ? 'done' : i === pr.i ? 'now' : 'todo';
      let detail = st === 'done' ? s.done : st === 'now' ? s.run + '…' : '';
      let sub = '';
      if (s.k === 'download' && st !== 'todo' && s.per.length) {
        const k = st === 'done' ? s.per.length : Math.min(s.per.length - 1, Math.floor(pr.f * s.per.length)); const f = st === 'done' ? 1 : pr.f * s.per.length - k;
        sub = '<ul class="fl-pp" data-psy="flow-per">' + s.per.map((x, j) => { const fj = j < k ? 1 : j === k ? f : 0; return '<li class="' + (fj >= 1 ? 'ok' : fj > 0 ? 'now' : '') + '"><b>' + esc(x.ini) + '</b><span>' + Math.round(x.docs * fj) + ' of ' + x.docs + ' documents · ' + Math.round(x.fields * fj) + ' fields</span><i><em style="width:' + Math.round(fj * 100) + '%"></em></i></li>'; }).join('') + '</ul>';
        if (st === 'now') detail = 'Downloading ' + s.per[k].ini + ' · chart ' + (k + 1) + ' of ' + s.per.length;
      } else if (s.k === 'download' && st !== 'todo') detail = st === 'done' ? 'No charts to download' : detail;
      const eta = st === 'done' ? fmtS(s.sim) : st === 'now' ? 'about ' + fmtS(Math.max(1, s.sim * (1 - pr.f))) + ' left' : '≈ ' + fmtS(s.sim);
      return '<li class="fl-st ' + st + '" data-step="' + (i + 1) + '" data-state="' + st + '"><span class="n" aria-hidden="true">' + (st === 'done' ? '✓' : i + 1) + '</span><div><b>' + esc(s.t) + '</b>' + (detail ? '<span>' + esc(detail) + '</span>' : '') + sub + '</div><em data-psy="flow-step-eta">' + esc(eta) + '</em></li>';
    }).join('');
    const sim = PSY.ev && PSY.ev.label ? PSY.ev.label('illustrative', 'Simulated') : '<span class="ev5">Simulated</span>';
    if (m.done) {
      return '<details class="fl-run done" data-run="' + m.id + '" data-psy="flow-run" data-state="done"><summary><span class="fl-ok" aria-hidden="true">✓</span><b>Agent run finished</b><span class="fl-mut">6 steps · ' + fmtS(m.took || pl.totalSim) + '</span>' + sim + '<span class="fl-more">Steps</span></summary><ol class="fl-steps">' + steps + '</ol></details>';
    }
    return '<div class="fl-run" data-run="' + m.id + '" data-psy="flow-run" data-state="running"><div class="fl-rh"><b>FLO agent</b>' + sim + '<span class="fl-eta" data-psy="flow-eta">Estimated time: ' + about(pl.totalSim) + '<small style="display:block;font-weight:400;color:#6B655B">Sped up for the demo</small></span></div>' +
      '<div class="fl-pg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div><div class="fl-left" data-psy="flow-left" aria-live="polite">' + (left < 60 ? 'Less than a minute left' : 'About ' + Math.ceil(left / 60) + ' min left') + ' · ' + pct + '%</div>' +
      '<ol class="fl-steps">' + steps + '</ol></div>';
  }
  function answerHtml(m) {
    const res = FL.compute(m.spec);
    if (res.blocked) return '<div class="fl-ans" data-psy="flow-answer" data-msg="' + m.id + '"><p class="fl-wh" data-psy="flow-withheld"><b>Withheld</b> · needs clinical record access: ' + esc(listAnd(res.withheld)) + '</p></div>'; // access changed since this answer
    const wh = res.withheld.length ? '<p class="fl-wh" data-psy="flow-withheld"><b>Withheld</b> · needs clinical record access: ' + esc(listAnd(res.withheld)) + '</p>' : '';
    if (!res.rows.length) return '<div class="fl-ans" data-psy="flow-answer" data-msg="' + m.id + '"><p class="fl-sum" data-psy="flow-summary"><b>' + esc(res.summary[0]) + '</b> ' + esc(res.summary[1] || '') + '</p>' + wh + chips(followUps(m.spec)) + '</div>';
    const cols = res.cols.filter((c) => ['Patient', 'Age', 'School', 'Evidence', 'Interventions'].indexOf(c[0]) < 0);
    const subs = res.cols.filter((c) => c[0] === 'Evidence' || c[0] === 'Interventions');
    const cell = (c, p) => {
      if (c[0] === 'Diagnosis' && p.dx) return '<b>' + esc(p.dx.code) + '</b> ' + esc(p.dx.text);
      if (c[0] === 'Medications') return p.meds.length ? p.meds.map((x) => '<div>' + esc(x.name) + '<small>' + esc(x.dose) + '</small></div>').join('') : '<span class="fl-mut">None reported</span>';
      return esc(c[1](p));
    };
    const sub = (c, p) => {
      const items = c[0] === 'Evidence' ? p.subst.map((x) => [x.text, x.doc, x.date, x.src]) : p.ivs.map((x) => [x.iv, 'Daily progress note', x.date, x.src]);
      return '<tr class="fl-subr"><td colspan="' + (cols.length + 1) + '"><span class="fl-k">' + esc(c[0]) + '</span>' + items.map((x) => '<div class="fl-evi">' + esc(x[0]) + '<small>' + esc(x[1] + ' · ' + x[2]) + ' · <i class="fl-src ' + x[3] + '">' + esc(SRC[x[3]]) + '</i></small></div>').join('') + '</td></tr>';
    };
    const table = '<div class="fl-tw" data-scroll="fl-tw-' + m.id + '"><table class="fl-tbl" data-psy="flow-table"><thead><tr><th>Patient</th>' + cols.map((c) => '<th>' + esc(c[0]) + '</th>').join('') + '</tr></thead><tbody>' +
      res.rows.map((p) => '<tr data-c="' + p.id + '"' + (subs.length ? ' class="fl-has"' : '') + '><td><b>' + esc(p.ini) + '</b><small>' + esc(p.age + ' · ' + p.school) + '</small></td>' + cols.map((c) => '<td>' + cell(c, p) + '</td>').join('') + '</tr>' + subs.map((c) => sub(c, p)).join('')).join('') + '</tbody></table></div>';
    return '<div class="fl-ans" data-psy="flow-answer" data-msg="' + m.id + '"><p class="fl-sum" data-psy="flow-summary">' + res.summary.map((x, i) => (i ? esc(x) : '<b>' + esc(x) + '</b>')).join(' ') + '</p>' + wh + table +
      res.charts.slice(0, 3).map(chartCard).join('') +
      '<div class="fl-dl"><button type="button" class="btn p s" data-act="flow-pdf" data-msg="' + m.id + '">Download PDF report</button><button type="button" class="btn o s" data-act="flow-csv" data-msg="' + m.id + '">Download CSV</button></div>' +
      '<p class="fl-foot">' + esc(res.scope.label + ' · ' + plural(res.scope.n, 'chart') + ' · Lauris Online and the Psyflo database') + '</p>' + chips(followUps(m.spec)) + '</div>';
  }
  function followUps(spec) {
    const F = spec.filters || {};
    if (F.subst) return ['Add payer and units left for these patients', 'Which of them have a denial or partial approval?', 'Age range of all patients'];
    if (F.adverse) return ['Add diagnosis for these patients', 'Authorization status and units left by payer', FL.EXAMPLE];
    return [FL.EXAMPLE, 'Which patients have a denial or partial approval?', 'Interventions documented in daily notes'].filter((q) => q !== spec.text);
  }
  const helpHtml = () => '<div class="fl-t" data-psy="flow-help"><p>I can pull diagnosis, medications, age range, substance use, school or location, payer, authorization status, units, denials and interventions, from the Lauris charts and the Psyflo database.</p></div>' + chips([FL.EXAMPLE, 'Authorization status and units left by payer', 'Which patients have a denial or partial approval?', 'Interventions documented in daily notes']);
  const blockedHtml = (m) => {
    const res = FL.compute(m.spec);
    return '<div class="fl-t" data-psy="flow-blocked"><p>' + esc(res.clinF ? listAnd(res.clinF).replace(/^./, (x) => x.toUpperCase()) : 'This') + ' is recorded in clinical documents, and your role does not include clinical record content. I did not run this request.</p>' +
      '<p class="fl-wh" data-psy="flow-withheld"><b>Withheld</b> · ' + esc(listAnd(res.withheld || [])) + '</p><p>I can pull age range, school, payer, authorization status, units and denials.</p>' +
      (PSY.can('settings') ? '<p><a data-go="settings">Clinical record access · Settings</a></p>' : '') + '</div>' + chips(['Age range and school of all patients', 'Authorization status and units left by payer', 'Which patients have a denial or partial approval?']);
  };
  function msgHtml(m) {
    if (m.who === 'user') return '<div class="fl-m fl-u" data-psy="flow-user"><p>' + esc(m.text) + '</p></div>';
    const body = m.kind === 'run' ? runHtml(m) : m.kind === 'answer' ? answerHtml(m) : m.kind === 'blocked' ? blockedHtml(m) : helpHtml(m);
    return '<div class="fl-m fl-f" data-kind="' + m.kind + '" data-id="' + m.id + '">' + body + '</div>';
  }
  function bodyHtml() {
    const c = chat();
    if (!c.msgs.length) return '<div class="fl-empty" data-psy="flow-empty"><p class="fl-hi">Ask for any data point in Lauris or Psyflo.</p><p class="fl-mut" data-psy="flow-scope">' + esc(scopeLine()) + '</p>' + chips(STARTERS()) + '</div>';
    return c.msgs.map(msgHtml).join('');
  }
  function drawerHtml() {
    const c = chat();
    return '<section class="fl-dr" data-psy="flow-drawer" role="dialog" aria-label="FLO">' +
      '<header class="fl-h"><span class="fl-logo">' + ICON + '</span><b class="fl-title">FLO</b><span class="fl-tag" data-psy="flow-addon">Add-on</span><span class="fl-sp"></span>' +
      (c.msgs.length ? '<button type="button" class="fl-hb" data-act="flow-new" title="New chat">New chat</button>' : '') + '<button type="button" class="fl-x" data-act="flow-close" title="Close FLO" aria-label="Close FLO">' + X + '</button></header>' +
      '<div class="fl-b" data-psy="flow-body" data-scroll="fl-body">' + bodyHtml() + '</div>' +
      '<div class="fl-c"><textarea rows="2" data-psy="flow-input" data-input="flow-draft" placeholder="Ask FLO for any data point…" aria-label="Ask FLO">' + esc(c.draft || '') + '</textarea><button type="button" class="btn p s" data-act="flow-send" data-psy="flow-send">Ask</button></div></section>';
  }
  function dockHtml() {
    if (!PSY.can('flow')) return '';
    settle(); ensureTimer();
    const open = !!S().open;
    return '<div class="fl-dock" data-psy="flow" data-open="' + open + '">' + (open ? drawerHtml() : '') + '</div>';
  }
  FL.html = () => dockHtml();
  FL.barHtml = () => (PSY.can('flow') ? '<button type="button" class="pf-flow' + (S().open ? ' on' : '') + '" data-act="flow-toggle" data-psy="flow-bar" title="FLO · data agent (add-on)" aria-expanded="' + !!S().open + '">' + ICON + '<span>FLO</span></button>' : '');

  /* ================= painting in place (the page and its scroll position stay as they are) ================= */
  const remap = (h) => (PSY.theme && PSY.theme.remap ? PSY.theme.remap(h) : h);
  const root = () => (PSY.current().app === 'psyflo' ? PSY.activeRoot() : null);
  const dockEl = () => { const r = root(); return r ? r.querySelector('[data-psy="flow"]') : null; };
  function paint() {
    const d = dockEl(); if (!d) return false;
    d.outerHTML = remap(dockHtml());
    const r = root(); const b = r && r.querySelector('[data-psy="flow-bar"]'); if (b) { b.classList.toggle('on', !!S().open); b.setAttribute('aria-expanded', String(!!S().open)); }
    const body = r && r.querySelector('[data-psy="flow-body"]'); if (body) body.scrollTop = body.scrollHeight;
    return true;
  }
  function paintBody(toAnswer) {
    const r = root(); const body = r && r.querySelector('[data-psy="flow-body"]'); if (!body) return;
    body.innerHTML = remap(bodyHtml());
    const hb = r.querySelector('.fl-hb'); if (!hb && chat().msgs.length) { const h = r.querySelector('.fl-h .fl-sp'); if (h) h.insertAdjacentHTML('afterend', '<button type="button" class="fl-hb" data-act="flow-new" title="New chat">New chat</button>'); }
    const ans = toAnswer ? Array.from(body.querySelectorAll('[data-psy="flow-answer"]')).pop() : null;
    if (ans) body.scrollTop = Math.max(0, ans.parentNode.offsetTop - body.offsetTop - 8); else body.scrollTop = body.scrollHeight;
  }
  function paintRun(m) { const r = root(); const el = r && r.querySelector('[data-run="' + m.id + '"]'); if (el) el.outerHTML = remap(runHtml(m)); }
  const focusInput = () => setTimeout(() => { const r = root(); const t = r && r.querySelector('[data-psy="flow-input"]'); if (t) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 30);

  /* ================= API ================= */
  FL.open = (prompt) => {
    if (!PSY.can('flow')) return false;
    S().open = true; if (prompt != null) chat().draft = String(prompt); PSY.save();
    if (!dockEl()) PSY.go(PSY.can('analytics') ? 'analytics' : 'auth-list'); else paint();
    focusInput(); return true;
  };
  FL.close = () => { S().open = false; PSY.save(); paint(); return true; };
  FL.isOpen = () => !!S().open;
  FL.ask = (text) => {
    text = String(text == null ? chat().draft : text).trim(); if (!text || !PSY.can('flow')) return null;
    const c = chat(); const prev = lastSpec(c); const spec = FL.parse(text, prev);
    c.msgs.push({ id: nid(), who: 'user', text }); c.draft = '';
    let m;
    if (!spec.recognized) m = { id: nid(), who: 'flow', kind: 'help', spec: null, q: text };
    else if (FL.compute(spec).blocked) m = { id: nid(), who: 'flow', kind: 'blocked', spec, q: text };
    else m = { id: nid(), who: 'flow', kind: 'run', spec, q: text, started: Date.now(), speed: FL.speed, done: false };
    c.msgs.push(m); S().open = true; PSY.save();
    if (!dockEl()) FL.open(); else { const r = root(); const t = r.querySelector('[data-psy="flow-input"]'); if (t) t.value = ''; paintBody(false); }
    ensureTimer(); return m;
  };
  FL.reset = () => { chat().msgs = []; PSY.save(); paint(); };
  FL.messages = () => chat().msgs.slice();

  /* ================= acts ================= */
  PSY.acts['flow-open'] = () => FL.open();
  PSY.acts['flow-toggle'] = () => (S().open ? FL.close() : FL.open());
  PSY.acts['flow-close'] = () => FL.close();
  PSY.acts['flow-new'] = () => FL.reset();
  PSY.acts['flow-draft'] = (el) => { chat().draft = el.value; PSY.save(); };
  PSY.acts['flow-send'] = (el, ctx) => { const t = ctx && ctx.root ? ctx.root.querySelector('[data-psy="flow-input"]') : null; FL.ask(t ? t.value : chat().draft); };
  PSY.acts['flow-q'] = (el) => FL.ask(el.getAttribute('data-q'));
  const dl = (el, kind) => {
    const f = FL.files(el.getAttribute('data-msg')); if (!f) return;
    FL.last = f;
    if (PSY.audit) PSY.audit.add({ action: 'FLO ' + kind.toUpperCase() + ': ' + f.res.title, by: PSY.user().name, doc: kind === 'pdf' ? f.pdfName : f.csvName, silent: true });
    return kind === 'pdf' ? PSY.download(f.pdfName, f.pdf, { preview: preview(f) }) : PSY.download(f.csvName, f.csv);
  };
  PSY.acts['flow-pdf'] = (el) => dl(el, 'pdf');
  PSY.acts['flow-csv'] = (el) => dl(el, 'csv');
  /* Enter sends, Shift+Enter is a new line (the textarea sits in a shadow root: read the real target from the composed path) */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const t = e.composedPath ? e.composedPath()[0] : e.target;
    if (!t || !t.getAttribute || t.getAttribute('data-psy') !== 'flow-input') return;
    e.preventDefault(); FL.ask(t.value);
  }, true);

  /* ================= presenter: scenario 10 ================= */
  PSY.presenter = PSY.presenter || {}; PSY.presenter.prep = PSY.presenter.prep || {};
  PSY.presenter.prep.s10 = () => {
    PSY.setPerm('admin', 'clinicalRecords', true); // clinical access granted for this demo (Settings → Roles)
    const s = S(); s.open = true; s.chats = {}; chat('admin').draft = FL.EXAMPLE; PSY.save();
  };

  /* ================= CSS (platform style sheet) ================= */
  PSY.css.platform = (PSY.css.platform || '') + `
.pf-flow{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 13px 0 11px;border-radius:12px;border:1px solid #E5DCD0;background:#fff;color:#1D4F43;font:inherit;font-weight:600;font-size:13.5px;cursor:pointer;white-space:nowrap}
.pf-flow:hover{background:#F6F0E8}.pf-flow.on{background:#1D4F43;border-color:#1D4F43;color:#fff}
.pf-flow svg{width:17px;height:17px}
.fl-dock{order:9;position:sticky;top:0;align-self:flex-start;flex:0 0 0px;width:0;height:var(--vh,100vh);z-index:40}
.fl-dr{position:absolute;top:0;right:0;bottom:0;width:420px;display:flex;flex-direction:column;background:#fff;border-left:1px solid #E5DCD0;box-shadow:-14px 0 34px rgba(27,27,25,.13)}
.fl-h{flex:0 0 60px;display:flex;align-items:center;gap:9px;padding:0 12px 0 18px;border-bottom:1px solid #E5DCD0;background:#FAF6F1}
.fl-logo{display:inline-flex;width:30px;height:30px;border-radius:9px;background:#1D4F43;color:#fff;align-items:center;justify-content:center}.fl-logo svg{width:18px;height:18px}
.fl-title{font-family:'Newsreader',Georgia,serif;font-size:21px;font-weight:600}
.fl-tag{font-size:11px;font-weight:600;letter-spacing:.04em;color:#1D4F43;background:#E3EFEA;border:1px solid #BFDCCB;border-radius:999px;padding:2px 8px}
.fl-sp{flex:1}
.fl-hb{border:1px solid #E0D6C9;background:#fff;border-radius:9px;height:30px;padding:0 10px;font:inherit;font-size:12.5px;font-weight:600;color:#1B1B19;cursor:pointer}.fl-hb:hover{background:#F6F0E8}
.fl-x{border:0;background:none;width:32px;height:32px;border-radius:9px;color:#4A453D;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}.fl-x:hover{background:#EFE8DE}.fl-x svg{width:17px;height:17px}
.fl-b{flex:1;min-height:0;overflow:auto;padding:16px 16px 6px;font-size:13.5px}
.fl-c{flex:0 0 auto;display:flex;gap:8px;align-items:flex-end;padding:10px 12px 12px;border-top:1px solid #E5DCD0;background:#FAF6F1}
.fl-c textarea{flex:1;min-width:0;resize:none;border:1px solid #E0D6C9;border-radius:12px;padding:9px 11px;font:inherit;font-size:13.5px;line-height:1.4;background:#fff;color:#1B1B19;min-height:44px;max-height:120px}
.fl-c textarea:focus{outline:none;border-color:#1D4F43;box-shadow:0 0 0 3px rgba(29,79,67,.12)}
.fl-c .btn{min-height:44px}
.fl-hi{margin:0 0 4px;font-size:14.5px;font-weight:600}
.fl-mut{color:#6B665E;font-size:12.5px;margin:0}
.fl-empty .fl-mut{margin-bottom:14px}
.fl-sg{display:flex;flex-direction:column;gap:7px;margin:10px 0 2px}
.fl-sg button{display:block;width:100%;text-align:left;border:1px solid #E5DCD0;background:#fff;border-radius:10px;padding:8px 11px;font:inherit;font-size:12.8px;line-height:1.35;color:#1B1B19;cursor:pointer}
.fl-sg button:hover{border-color:#1D4F43;background:#F6F0E8}
.fl-m{margin:0 0 12px}
.fl-u{display:flex;justify-content:flex-end}
.fl-u p{margin:0;max-width:86%;background:#1D4F43;color:#fff;border-radius:14px 14px 4px 14px;padding:9px 12px;line-height:1.4}
.fl-t{background:#F6F0E8;border-radius:14px 14px 14px 4px;padding:10px 12px;line-height:1.45}
.fl-t p{margin:0 0 6px}.fl-t p:last-child{margin:0}
.fl-wh{margin:6px 0;font-size:12.5px;color:#7A4A00;background:#F6E7C8;border-radius:8px;padding:6px 9px}
.fl-run{border:1px solid #E5DCD0;border-radius:12px;padding:11px 12px;background:#fff}
.fl-rh{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.fl-rh b{font-size:13.5px}
.fl-eta{margin-left:auto;font-size:12px;color:#4A453D;font-weight:600}
.fl-pg{height:6px;border-radius:999px;background:#EFE8DE;overflow:hidden;margin:10px 0 4px}.fl-pg i{display:block;height:100%;background:#1D4F43;border-radius:999px;transition:width .2s linear}
.fl-left{font-size:12px;color:#6B665E}
.fl-steps{list-style:none;margin:10px 0 0;padding:0}
.fl-st{display:flex;gap:9px;align-items:flex-start;padding:6px 0;border-top:1px solid #F2EAE1}
.fl-st .n{flex:0 0 22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:700;background:#EFE8DE;color:#6B665E}
.fl-st.now .n{background:#1D4F43;color:#fff}.fl-st.done .n{background:#E3EFEA;color:#1E5C3C}
.fl-st>div{flex:1;min-width:0}.fl-st b{display:block;font-size:13px;font-weight:600}.fl-st.todo b{color:#8A857B;font-weight:500}
.fl-st>div>span{display:block;font-size:12px;color:#6B665E;line-height:1.35}
.fl-st em{flex:0 0 auto;font-style:normal;font-size:11.5px;color:#6B665E;white-space:nowrap;padding-top:2px}.fl-st.now em{color:#1D4F43;font-weight:600}
.fl-pp{list-style:none;margin:6px 0 2px;padding:0;display:flex;flex-direction:column;gap:5px}
.fl-pp li{display:grid;grid-template-columns:34px 1fr;gap:1px 8px;font-size:11.5px;color:#6B665E}
.fl-pp li b{font-size:11.5px;color:#1B1B19;grid-row:span 2}
.fl-pp li i{display:block;height:4px;border-radius:999px;background:#EFE8DE;overflow:hidden}.fl-pp li i em{display:block;height:100%;background:#7FB5A5}
.fl-pp li.ok i em{background:#1D4F43}
.fl-run.done{padding:9px 12px}
.fl-run.done summary{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;flex-wrap:wrap}
.fl-run.done summary::-webkit-details-marker{display:none}
.fl-run.done summary b{font-size:13px}
.fl-more{margin-left:auto;font-size:12px;font-weight:600;color:#1D4F43}.fl-more:after{content:"";display:inline-block;width:6px;height:6px;border-right:1.6px solid currentColor;border-bottom:1.6px solid currentColor;transform:rotate(45deg);margin:0 2px 3px 7px}
.fl-run.done[open] .fl-more:after{transform:rotate(-135deg);margin-bottom:-1px}
.fl-ok{width:20px;height:20px;border-radius:50%;background:#E3EFEA;color:#1E5C3C;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700}
.fl-ans{border:1px solid #E5DCD0;border-radius:12px;padding:12px;background:#fff}
.fl-sum{margin:0 0 8px;line-height:1.45}
.fl-tw{overflow-x:auto;margin:8px -2px 4px;border:1px solid #EFE8DE;border-radius:10px}
.fl-tbl{border-collapse:collapse;width:100%;font-size:12px;line-height:1.35}
.fl-tbl th{text-align:left;font-size:11px;font-weight:600;color:#4A453D;background:#F6F0E8;padding:7px 8px;white-space:nowrap}
.fl-tbl td{padding:7px 8px;border-top:1px solid #EFE8DE;vertical-align:top;min-width:84px}
.fl-tbl td:first-child{min-width:92px}
.fl-tbl small{display:block;color:#6B665E;font-size:11px;margin-top:1px}
.fl-evi{margin:0 0 5px}.fl-evi:last-child{margin:0}
.fl-tbl tr.fl-has td{border-bottom:0}
.fl-tbl tr.fl-subr td{border-top:0;padding-top:0;background:#fff}
.fl-k{display:block;font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8A857B;margin:0 0 3px}
.fl-subr .fl-evi{background:#FAF6F1;border-radius:7px;padding:6px 8px}
.fl-src{font-style:normal;font-weight:600;color:#1D4F43}.fl-src.psyflo{color:#8B5FBF}
.fl-ch{margin:10px 0 0;border:1px solid #EFE8DE;border-radius:10px;padding:10px 12px 8px}
.fl-ch figcaption{margin:0 0 8px}.fl-ch figcaption b{font-size:12.8px}.fl-ch figcaption span{display:block;font-size:11.5px;color:#6B665E}
.fl-dl{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 6px}
.fl-foot{margin:4px 0 0;font-size:11.5px;color:#6B665E}
.fl-ans .fl-sg{margin-top:10px}
`;
})();
