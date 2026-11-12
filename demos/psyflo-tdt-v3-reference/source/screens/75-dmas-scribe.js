/* The plain text of every box of the DMAS authorization form (route lauris-dmas, both forms: the TDT H2016 initial SRA and the
   CMHRS continued stay request), section by section: PSY.l2.form.copyAllText(root, case). Used by "Save & copy" / "Copy everything".
   Round 8: the DMAS form is no longer a Scribe type (SRA work is Scan & Enhance), so the scripted DMAS conversations
   and the Scribe registration for lauris-dmas / lauris-case were removed from this file. */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY) return;
  const L2 = (PSY.l2 = PSY.l2 || {});
  const F = (L2.form = L2.form || {});

  /* ------------------------------------------------------------------ copy everything: the plain text of every box, section by section */
  const SEC_TITLE = {
    init: { head: 'Member and provider', req: 'Request for approval of services', s1: 'Section I: Therapeutic day treatment eligibility criteria', s2: 'Section II: Care coordination', s3: 'Section III: Trauma-informed care', s4: 'Section IV: Individual treatment goals', s5: 'Section V: Discharge planning', att: 'Attestation', notes: 'Notes section' },
    cont: { head: 'Member and provider', req: 'Request for approval of services', s1: 'Section I: Care coordination', s2: 'Section II: Treatment progress', s3: 'Section III: Discharge planning', att: 'Attestation', notes: 'Notes section' },
  };
  const LABELS = [
    [/^req\.from$/, 'Request from (date)'], [/^req\.to$/, 'Request to (date)'], [/^req\.units$/, 'Total units of service'], [/^req\.hours$/, 'Hours of service per week'],
    [/^crit1\.yn$/, 'Criterion 1 · relationships'], [/^crit1\.risk$/, 'Criterion 1 · risk of hospitalization or out-of-home placement'], [/^crit1\.sub$/, 'Criterion 1 · symptoms and behaviors'],
    [/^sch\.iep$/, 'Individual has an IEP'], [/^crit2\.yn$/, 'Criterion 2 · repeated interventions'],
    [/^crit2\.r(\d)\.(prov|cur|dates|out)$/, (m) => 'Criterion 2 · row ' + m[1] + ' · ' + { prov: 'Provider', cur: 'Currently in service', dates: 'Dates of services', out: 'Outcomes/current progress' }[m[2]]],
    [/^crit3\.yn$/, 'Criterion 3 · recognizing danger'], [/^crit3\.sub$/, 'Criterion 3 · symptoms and behaviors'],
    [/^loc\.(\w)\.yn$/, (m) => 'Level of care ' + m[1] + ')'], [/^loc\.(\w)\.sub$/, (m) => 'Level of care ' + m[1] + ') · substantiation'],
    [/^pcp$/, 'Primary care physician'], [/^other\.yn$/, 'Other medical or behavioral health concerns'], [/^other\.sub$/, 'Other concerns · explanation'],
    [/^svc\.r(\d)\.(name|who|freq)$/, (m) => 'Current services · row ' + m[1] + ' · ' + { name: 'Service', who: 'Provider/contact', freq: 'Frequency' }[m[2]]],
    [/^coordplan$/, 'Plan to coordinate care'], [/^coordsince$/, 'Care coordination since the last authorization'],
    [/^trauma\.yn$/, 'Evidence of trauma'], [/^sec3$/, 'Plan to assess, refer and address trauma'],
    [/^strengths$/, 'Resources and strengths'], [/^barriers$/, 'Barriers to treatment'], [/^schoolfam$/, 'Coordination with school and family'], [/^family$/, 'Family involvement'],
    [/^g(\d)\.(obj|days|int|lmhp|noc|measure|progress|lack)$/, (m) => 'Goal ' + m[1] + ' · ' + { obj: 'objective', days: 'days per week', int: 'interventions', lmhp: 'LMHP hours per week', noc: 'if no in-school counseling', measure: 'how progress is measured', progress: 'progress', lack: 'lack of progress and changes to the ISP' }[m[2]]],
    [/^dsch\.r(\d)\.(step|who|plan)$/, (m) => 'Discharge plan · row ' + m[1] + ' · ' + { step: 'Step-down service', who: 'Identified provider', plan: 'Plan to assist in transition' }[m[2]]],
    [/^dloc$/, 'Recommended level of care at discharge'], [/^ddate$/, 'Estimated date of discharge'], [/^notes$/, 'Notes section'], [/^admit$/, 'Initial admission date to services'], [/^avg$/, 'Average units per week'],
    [/^med\.r(\d)\.(name|dose|freq)$/, (m) => 'Medication ' + m[1] + ' · ' + { name: 'name', dose: 'dosage', freq: 'frequency' }[m[2]]],
  ];
  function labelOf(R, key) {
    for (const [re, to] of LABELS) { const m = re.exec(key); if (m) return typeof to === 'function' ? to(m) : to; }
    const el = R && R.querySelector ? R.querySelector('[data-fk="' + key + '"]') : null;
    const s1 = el && el.closest('.dm-s1'); if (s1 && s1.querySelector('label')) return s1.querySelector('label').textContent.replace(/\s+/g, ' ').trim();
    const q = el && el.closest('.dm-f') && el.closest('.dm-f').querySelector('.dm-q span'); if (q) return q.textContent.replace(/\s+/g, ' ').trim().split(/[:(]/)[0].slice(0, 90);
    return key;
  }
  function copyAllText(root, cid) {
    const kind = L2.kind(cid); if (!kind) return '';
    const live = !!(root && root.querySelector && root.querySelector('[data-fk]'));
    const NOT = /^(proc|svc|svc\.tdt|m\.gender|req\.retro|req\.new)$/;
    let keys = live ? Array.from(root.querySelectorAll('[data-fk],[data-yn]')).map((e) => e.getAttribute('data-fk') || e.getAttribute('data-yn')) : F.keys(cid);
    keys = keys.filter((k, i) => !NOT.test(k) && keys.indexOf(k) === i);
    const bySec = {};
    keys.forEach((k) => {
      const yn = /\.(yn|cur)$/.test(k); let v;
      if (yn) { v = F.ynValue(cid, k); v = v === 'y' ? 'Yes' : v === 'n' ? 'No' : ''; }
      else { const m = F.boxModel(cid, k); v = [m.base].concat(m.segs.map((s) => s.text)).filter(Boolean).join(' ').trim(); }
      if (!v) return;
      const sec = F.secOf(kind, k); (bySec[sec] = bySec[sec] || []).push(labelOf(root, k) + ': ' + v);
    });
    const c = PSY.caseView(cid);
    const parts = (F.SECS[kind] || []).map((s) => s[0]).filter((s) => bySec[s]).map((s) => SEC_TITLE[kind][s].toUpperCase() + '\n' + bySec[s].join('\n'));
    return parts.length ? L2.TITLE[kind] + ' · ' + c.who + '\n\n' + parts.join('\n\n') : '';
  }
  F.copyAllText = copyAllText;

})();
