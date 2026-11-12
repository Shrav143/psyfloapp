/* Round 14: Scan & Enhance on the Intake (CNA) form for every patient except T.W. (T.W.'s intake keeps the scripted Scribe flow).
   The scan reads the EHR (Lauris Medications and Allergies tabs, the signed documents on file, the case record) and answers, section by
   section, one of three ways:
     fill      the record has it: the box is drafted from the record, with its sources; the clinician accepts, edits or rejects it
     collect   the record does not have it: the card says so, tells the user what to ask, and has a box to type what was collected
     decide    the clinician's own call (diagnosis justification, mental status, summary, services): named, never drafted
   Nothing is invented: a box with no record behind it is never filled, "none reported" included. Wording is the record's.

   PSY.cnaScan = { applies(c), model(c), items(c, st, S), tasks(c), counts(c), describe(c) }
   Used by 76-enhance.js (lfDesc, lfItems, lfCards, lfDescribe). Pure reads: no state of its own. */
(function () {
  'use strict';
  const PSY = window.PSY; if (!PSY) return;
  const SC = (PSY.cnaScan = {});
  const TW = '4492';
  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const lc1 = (s) => { s = String(s || ''); return s.charAt(0).toLowerCase() + s.slice(1); };
  const K = () => PSY.lf;
  const hubOf = (c) => ((PSY.data && PSY.data.hub) || {})[c.case] || {};
  const mmdd = (s) => { const m = /^(\d{2})\/(\d{2})/.exec(String(s || '')); const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; return m ? M[+m[1] - 1] + ' ' + +m[2] : ''; };

  SC.applies = (c) => !!c && c.id !== TW && !!K() && !!K().forms && !!K().forms.cna;

  /* ---- what the record says (all reads; nothing assumed) ---- */
  function facts(c) {
    const hub = hubOf(c); const pic = hub.picture || {};
    const docs = (PSY.l1a && PSY.l1a.DOCS) ? safe(() => PSY.l1a.DOCS(c), []) : [];
    const doc = (re) => docs.find((d) => re.test(d.name)) || null;
    const meds = (((PSY.l1a && PSY.l1a.MEDS) || {})[c.id] || []).map((m) => ({ name: m[0], freq: m[1], who: m[3] }));
    const allergies = (((PSY.l1a && PSY.l1a.ALLG) || {})[c.id] || []).map((a) => ({ what: a[0], type: a[1], reaction: a[2], note: a[3] }));
    const subst = []; docs.forEach((d) => (d.body || []).forEach((l) => { const m = /^Substance use:\s*(.+)$/.exec(String(l)); if (m) subst.push({ text: m[1].replace(/\.$/, ''), doc: d.name, when: d.when }); }));
    const plan = (PSY.data.payers || {})[c.payer || (safe(() => PSY.caseView(c.case), {}) || {}).payer] || {};
    return { hub, pic, docs, doc, meds, allergies, subst, planName: plan.name || '', dx: pic.diagnosis || null, prior: pic.priorServices || [], behaviours: pic.behaviours || [], school: pic.school || null,
      iep: pic.iep || '', pmeds: pic.meds || '', engagement: pic.engagement || null, trend: pic.trend || null };
  }
  function safe(f, d) { try { const v = f(); return v == null ? d : v; } catch (e) { return d; } }

  /* the previous-interventions table rows of the form: 0 Psychiatric services · 1 Case Management · 2 Outpatient Counseling · 3 Intensive In-Home ·
     4 Therapeutic Day Treatment · 5 Therapeutic Mentoring · 6 Out of home placement · 7 DSS Involvement · 8 School Counseling · 9 Other */
  const PREV_NAMES = ['Psychiatric services', 'Case management', 'Outpatient counseling', 'Intensive in-home', 'Therapeutic day treatment', 'Therapeutic mentoring', 'Out-of-home placement', 'DSS involvement'];
  const rowOfService = (who) => { const w = String(who || '').toLowerCase();
    if (/school|counselor/.test(w)) return 8; if (/tdt|day treatment/.test(w)) return 4; if (/outpatient|therapy|counsel/.test(w)) return 2;
    if (/psychiatr|medication manage/.test(w)) return 0; if (/case manage/.test(w)) return 1; if (/in-home/.test(w)) return 3; if (/mentor/.test(w)) return 5; return 9; };

  /* ---- the sections ---- */
  /* done(sectionId) → true once the clinician pushed that section (it stays in the list as "In the form" though its boxes are no longer blank) */
  SC.model = (c, done) => {
    const f = facts(c); const k = K(); const out = [];
    const blank = (key) => !String(k.val('cna', c, key) || '').trim();
    const add = (s) => { const all = Object.keys(s.value || {}).concat(s.keys || []).filter((x, i, a) => a.indexOf(x) === i); const keys = s.force || (done && done(s.id)) ? all : all.filter(blank); if (!keys.length) return; s.keys = keys; const v = {}; keys.forEach((x) => { if (s.value && s.value[x] != null && s.value[x] !== '') v[x] = s.value[x]; }); s.value = v; out.push(s); };
    const dsDate = (re) => { const d = f.doc(re); return d ? mmdd(d.when) : ''; };

    /* 1 · the reason for the referral and the assessment type */
    const beh = f.behaviours.map((b) => b.name + ': ' + [b.freq, b.dur, b.int ? String(b.int).toLowerCase() + ' intensity' : ''].filter(Boolean).join(', '));
    add({ id: 'ref', kind: 'fill', title: 'Presenting issue and assessment type', keys: ['atype', 'setting', 'reason'],
      value: Object.assign({ atype: 'Initial', setting: 'HOC' }, beh.length ? { reason: c.ini + ', ' + c.age + ', ' + c.school + '. Behaviours in the record: ' + beh.join('; ') + '.' } : {}),
      why: beh.length ? 'Read from the record; the referral source and date are not in the chart, so add them from the referral.' : 'The record lists no behaviours.', cites: beh.length ? ['Daily notes'] : [] });
    if (!beh.length) add({ id: 'ref-c', kind: 'collect', title: 'Presenting issue', keys: ['reason'], why: 'Not in the record, so ask who referred ' + c.ini + ', when, and what the main concern is.' });

    /* 2 · mental health history */
    const dxNote = f.dx && /^From the CNA$/i.test(f.dx.note || '') ? ' (documented in the CNA)' : '';
    if (f.dx) add({ id: 'mhhx', kind: 'fill', title: 'Mental health history', keys: ['mhhx'], value: { mhhx: 'Diagnosis on file: ' + f.dx.code + ' ' + f.dx.text + dxNote + '. Prior treatment is under Previous Interventions.' },
      why: 'From the record; hospitalizations, ER visits and other diagnoses given are not in the record.', cites: ['CNA · diagnosis'] });
    else add({ id: 'mhhx-c', kind: 'collect', title: 'Mental health history', keys: ['mhhx'], why: 'Not in the record, so ask about hospitalizations, ER visits and diagnoses given and by whom.' });
    add({ id: 'mhfam', kind: 'collect', title: 'Mental health history of family members', keys: ['mhfam'], why: 'Not in the record, so ask the guardian about depression, anxiety, hospitalizations or other mental health care in the family.' });

    /* 3 · previous interventions: one row per service the record names; the rest are asked, never assumed */
    const prev = {}; const prevGaps = []; const prevCites = [];
    f.prior.forEach((p) => {
      const row = rowOfService(p.who); const parts = String(p.who).split(',').map((x) => x.trim());
      const provider = row === 8 ? 'School counselor' : row === 4 ? 'Harvest Outreach Center (this program)' : (parts.length > 1 ? parts.slice(1).join(', ') : parts[0]);
      let out2 = String(p.out || ''); const noEnd = /end date not in the CNA/i.test(out2); out2 = out2.replace(/;?\s*end date not in the CNA/i, '').replace(/\s+$/, '');
      prev['prev.' + row + '.1'] = provider; if (p.when) prev['prev.' + row + '.2'] = p.when; if (out2) prev['prev.' + row + '.3'] = out2;
      if (noEnd) prevGaps.push('the end date of ' + lc1(parts[0]));
      prevCites.push('CNA · prior services');
    });
    const named = Object.keys(prev).map((x) => +x.split('.')[1]);
    const unnamed = PREV_NAMES.filter((n, i) => named.indexOf(i) < 0);
    if (Object.keys(prev).length) add({ id: 'prev', kind: 'fill', title: 'Previous interventions', keys: Object.keys(prev), value: prev, cites: prevCites.filter((x, i, a) => a.indexOf(x) === i),
      why: 'Services the record names, with dates and outcome' + (prevGaps.length ? '; ' + prevGaps.join(' and ') + (prevGaps.length > 1 ? ' are' : ' is') + ' not in the record' : '') + '; not asked yet: ' + unnamed.map(lc1).join(', ') + '.' });
    else add({ id: 'prev-c', kind: 'collect', title: 'Previous interventions', keys: ['prev.2.1', 'prev.8.1'], why: 'Not in the record, so ask about each service tried before (provider, dates, response): ' + PREV_NAMES.map(lc1).join(', ') + ', school counseling.' });

    /* 4 · medical: medications from Lauris, allergies from Lauris, the rest asked */
    const medKeys = {}; f.meds.slice(0, 5).forEach((m, i) => { medKeys['meds.' + i + '.1'] = m.name; if (m.freq) medKeys['meds.' + i + '.3'] = m.freq; if (m.who) medKeys['meds.' + i + '.4'] = m.who; });
    const pm = norm(f.pmeds);
    const medSentence = f.meds.length ? 'Current medication: ' + f.meds.map((m) => m.name).join(', ') + ' (Lauris Medications tab).' : (pm ? (/^none/i.test(pm) ? 'No current medications. ' + pm.replace(/^none\.?\s*/i, '') : pm) : '');
    if (medSentence) add({ id: 'med', kind: 'fill', title: 'Medical history and medications', keys: ['medh'].concat(Object.keys(medKeys)), value: Object.assign({ medh: medSentence.replace(/\s+$/, '') }, medKeys),
      why: 'Medications are read from Lauris and the pediatrician review; past illnesses, injuries, hospital stays and current complaints are not in the record.', cites: ['Lauris Medications tab'] });
    else add({ id: 'med-c', kind: 'collect', title: 'Medical history and medications', keys: ['medh'], why: 'Not in the record, so ask about past and present medical problems, injuries, hospital stays, current medicines and who prescribes them.' });
    /* a box the form already has that the record contradicts (the one safety-relevant case: allergies) is raised, not silently kept */
    const al = String(k.val('cna', c, 'allergy') || '').trim(); const alText = f.allergies.map((a) => a.what + ' (' + String(a.type).toLowerCase() + '): ' + String(a.reaction).toLowerCase() + '.' + (a.note ? ' ' + a.note.replace(/\.?$/, '.') : '')).join(' ');
    if (f.allergies.length && al && !f.allergies.every((a) => new RegExp(String(a.what).split(' ')[0], 'i').test(al)))
      add({ id: 'allergy-x', kind: 'fill', force: true, cat: 'Contradictory information', title: 'Allergies: the form and Lauris disagree', keys: ['allergy'], value: { allergy: alText },
        why: 'The form’s entry does not match the Lauris Allergies tab (' + f.allergies.map((a) => a.what).join(', ') + '), so confirm with the guardian.', cites: ['Lauris Allergies tab'] });
    if (f.allergies.length) add({ id: 'allergy', kind: 'fill', title: 'Allergies', keys: ['allergy'], value: { allergy: f.allergies.map((a) => a.what + ' (' + String(a.type).toLowerCase() + '): ' + String(a.reaction).toLowerCase() + '.' + (a.note ? ' ' + a.note.replace(/\.?$/, '.') : '')).join(' ') },
      why: 'From the Lauris Allergies tab; confirm with the guardian that the list is complete.', cites: ['Lauris Allergies tab'] });
    else add({ id: 'allergy-c', kind: 'collect', title: 'Allergies', keys: ['allergy'], why: 'The Lauris Allergies tab has no entry, which is not the same as no allergy, so ask the guardian about food, drug and other allergies.' });
    add({ id: 'medfam', kind: 'collect', title: 'Family medical history, fall risk and communication needs', keys: ['medfam', 'fall'], why: 'Not in the record, so ask about serious or chronic illness in the family, fall risk, and language, communication, mobility or equipment needs.' });

    /* 5 · trauma: only what the record already notes; always in the family's words */
    if (f.dx && /trauma/i.test(f.dx.note || '')) add({ id: 'trauma', kind: 'fill', title: 'Trauma history', keys: ['trauma'], value: { trauma: 'A trauma history is noted by the clinical team. Details are not recorded in this form; the family tells the clinician more if and when they choose.' },
      why: 'The record notes it; the details are the family’s to share.', cites: ['CNA · diagnosis'] });
    else add({ id: 'trauma-c', kind: 'collect', title: 'Trauma history', keys: ['trauma'], why: 'Not in the record, so ask openly whether anything has happened that has been hard for ' + c.ini + ', and write only what the family chooses to share.' });

    /* 6 · early development */
    add({ id: 'dev', kind: 'collect', title: 'Early development', keys: ['devirr', 'devhold', 'devview', 'devdelay', 'devbirth'], why: 'Not in the record, so ask the guardian about ' + c.ini + '’s temperament as a baby, bonding, their own view of early childhood, any delays (walking, speech) and birth complications.' });

    /* 7 · school */
    const schoolBits = f.school ? Object.keys(f.school).map((x) => x + ': ' + f.school[x]).join('. ') + '.' : '';
    const sched = f.doc(/schedule and grades/i); const iepDoc = f.doc(/IEP|504/i);
    const schoolVal = {}; schoolVal.school = c.school; if (f.iep) schoolVal.iep = f.iep + (iepDoc ? ' Summary on file ' + mmdd(iepDoc.when) + '.' : ''); if (schoolBits) schoolVal.acad = schoolBits;
    add({ id: 'school', kind: 'fill', title: 'School, IEP and academic performance', keys: Object.keys(schoolVal), value: schoolVal,
      why: 'From the school record and the IEP summary; grade, tardiness and expulsions are not in the record.', cites: [].concat(sched ? ['School schedule and grades ' + mmdd(sched.when)] : [], iepDoc ? [(/504/.test(iepDoc.name) ? 'Section 504 plan ' : 'IEP summary ') + mmdd(iepDoc.when)] : []) });

    /* 8 · strengths and supports, money, substance use */
    const stren = [f.engagement && f.engagement.text, f.trend && f.trend.pts && f.trend.pts.length > 1 ? (f.trend.label || 'Escalations a week') + ' went from ' + f.trend.pts[0].v + ' (' + f.trend.pts[0].d + ') to ' + f.trend.pts[f.trend.pts.length - 1].v + ' (' + f.trend.pts[f.trend.pts.length - 1].d + ').' : ''].filter(Boolean);
    if (stren.length) add({ id: 'stren', kind: 'fill', title: 'Strengths and supports', keys: ['strengths'], value: { strengths: stren.join(' ') }, why: 'From the weekly calls and the daily notes; what ' + c.ini + ' likes to do and is good at is not in the record.', cites: ['Daily notes'] });
    else add({ id: 'stren-c', kind: 'collect', title: 'Strengths, needs and preferences', keys: ['strengths'], why: 'Not in the record, so ask what ' + c.ini + ' is good at and likes, and who ' + c.ini + ' listens to.' });
    if (f.planName) add({ id: 'fin', kind: 'fill', title: 'Financial resources and benefits', keys: ['finance'], value: { finance: 'Medicaid through ' + f.planName + '.' }, why: 'The plan is read from Lauris; other income or benefits are not in the record.', cites: ['Lauris Insurance'] });
    if (f.subst.length) add({ id: 'subs', kind: 'fill', title: 'Substance use history', keys: ['subs'], value: { subs: f.subst.map((s) => s.text.charAt(0).toUpperCase() + s.text.slice(1) + ' (' + s.doc.replace(/,? signed$/i, '') + ' ' + mmdd(s.when) + ').').join(' ') },
      why: 'Recorded in the signed document; frequency, duration and any treatment are not in the record.', cites: ['CNA · substance use'] });
    else add({ id: 'subs-c', kind: 'collect', title: 'Substance use history (client and family)', keys: ['subs', 'famsubs'], why: 'Not in the record, so ask about alcohol, drugs and vaping for ' + c.ini + ' and in the family: substance, how often, for how long, any treatment.' });

    /* 9 · home and family */
    add({ id: 'home', kind: 'collect', title: 'Home, family and legal', keys: ['housing', 'routine', 'famhx', 'legal'], why: 'Not in the record, so ask who lives at home and the housing, the daily routine and sleep, family relationships and conflict, and guardianship, court or legal involvement.' });
    add({ id: 'comm', kind: 'collect', title: 'Activities, supports and culture', keys: ['extra', 'extfam', 'culture', 'emp'], why: 'Not in the record, so ask about activities and community groups, extended family and other supports, cultural or spiritual views, and employment if any.' });

    /* 10 · the diagnosis on file (the clinician confirms) and the sources reviewed */
    if (f.dx) { const opt = (k.DX || []).find((o) => String(o).indexOf(f.dx.code) === 0);
      if (opt) add({ id: 'dx', kind: 'fill', cat: 'Clinician decision', title: 'Diagnosis on file: ' + f.dx.code + ' ' + f.dx.text, keys: ['dx.0'], value: { 'dx.0': opt }, why: 'Documented in the CNA at intake; Psyflo does not suggest or change a diagnosis, so you confirm it.', cites: ['CNA · diagnosis'] }); }
    if (sched || iepDoc) add({ id: 'src', kind: 'fill', title: 'Sources reviewed: school record', keys: ['src.3'], value: { 'src.3': '1' }, why: 'The school schedule and grades' + (iepDoc ? ' and the ' + (/504/.test(iepDoc.name) ? '504 plan' : 'IEP summary') : '') + ' are in the patient file.', cites: [].concat(sched ? ['School schedule and grades ' + mmdd(sched.when)] : []) });
    return out;
  };

  /* the clinician's own sections: named, never drafted (cards with no box to fill) */
  SC.decide = (c) => {
    const k = K(); const blank = (key) => !String(k.val('cna', c, key) || '').trim();
    const list = [];
    if (k.fields('cna').filter((f) => /^ms\./.test(f.key)).some((f) => blank(f.key))) list.push({ id: 'ms', title: 'Mental status exam (16 boxes)', why: 'Observed at the interview, so not in the record; Scribe can capture these from the conversation.', ask: 'Record at the interview: orientation, appearance, dress, motor activity, insight, judgment, memory, attention, thought process, interview behavior, speech, mood, affect, thought content, perception, functional status.' });
    if (['dx.0', 'dx.1', 'dx.2', 'dsmc', 'justif'].some(blank)) { const dx = facts(c).dx; const offered = dx && (k.DX || []).some((o) => String(o).indexOf(dx.code) === 0);
      list.push({ id: 'dxj', title: 'Diagnoses, justification and DSM comments', why: 'The diagnosis and its justification are the clinician’s judgment, so Psyflo does not suggest or draft them.', ask: (dx && !offered ? 'On file in the record: ' + dx.code + ' ' + dx.text + ' (not in the form’s list: choose it there if it is the diagnosis). ' : '') + 'Choose the diagnoses, then write the diagnostic justification and any assessment measures used.' }); }
    if (['summ', 'barr', 'disch'].some(blank) || k.fields('cna').filter((f) => /^(bar|svc)\./.test(f.key)).some((f) => blank(f.key))) list.push({ id: 'plan', title: 'Summary, barriers, service recommendation and goals', why: 'The formulation, the barriers and the service recommended are the clinician’s decisions.', ask: 'Write the overall summary, tick the barriers and the services you recommend, and enter the treatment goals and discharge criteria (the ISP signed with this intake has the goals).' });
    return list;
  };

  /* counts for the "This document" block */
  SC.counts = (c, done) => {
    const k = K(); const real = k.fields('cna').filter((f) => f.kind !== 'sig'); const blank = (key) => !String(k.val('cna', c, key) || '').trim();
    const total = real.length; const blanks = real.filter((f) => blank(f.key)).length;
    const m = SC.model(c, done); const sum = (kind) => m.filter((s) => s.kind === kind);
    return { total, filled: total - blanks, blank: blanks, fill: sum('fill').length, fillBoxes: sum('fill').reduce((a, s) => a + Object.keys(s.value).length, 0), collect: sum('collect').length, decide: SC.decide(c).length };
  };
})();
