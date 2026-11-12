/* Recommended actions ("recommendations"): the contract between the case page (web) and the extension (Lauris).
   The web page SHOWS the actions and the values read back. The INPUT happens only in the extension (Scan & Enhance), on the Lauris form.
   No approval probabilities, no points: an action names the payer requirement it addresses and that requirement's source.

   PSY.data.reco[caseId] = {
     actions: [ {
       id: 'a1',                        // unique inside the case
       crit: 'trauma',                  // criterion key (see CRITERIA below) so the criteria tab can link to the fix
       title: 'Write Section III · trauma-informed care',
       bullets: ['What the extension will do…', 'Why the form asks for it…'],   // 2–3 short lines
       open: true,                      // optional: addresses a requirement still open on the form (listed before Process Form)
       req: 'form-init',                // optional: rule id in PSY.data.r5.rules; otherwise derived from crit (PSY.reco.requirement)
       agent: 'Extension',              // who helps (always the extension in this prototype)
       needs: 'your words',             // short label of the input needed
       lauris: { form: 'sra'|'cna'|'isp'|'screening'|'dpn', formTitle: 'TDT Initial Service Authorization Request',
                 section: 'Section III · Trauma-informed care', field: 'Evidence of trauma · plan', before: 'Left blank for the clinician' },
       input:  { type: 'text'|'choice'|'date'|'chips', label: 'What happened, in your words', placeholder: '…',
                 suggestion: 'text the extension offers to type (you can edit it)', options: ['…'] },
       result: 'Section III written in the SRA form',   // shown after it is done
     } ]
   }
   State: PSY.state.actions['R-0416.a1'] = { done:true, value:'…', at:'10:42 am', dismissed?:true }

   API
     PSY.reco.list / pending / total / next / complete / dismiss / undo   (unchanged)
     PSY.reco.coverage(caseId) → { met, total, items:[{ key, label, full, status:'met'|'partial'|'open', was, addressedBy, optional }] }
                                  the case's criteria (case hub) with the ones a done action now addresses counted as met
     PSY.reco.requirement(caseId, action) → { id, name, source, kind }   the requirement an action addresses, with its source
     PSY.reco.chance() → null       (kept so older callers do not break; there is no approval probability)
*/
(function () {
  const PSY = window.PSY;
  PSY.data.CRITERIA = {
    crit1: 'Difficulty establishing or maintaining interpersonal relationships',
    crit2: 'Documented repeated interventions that have not worked',
    crit3: 'Cognitive ability to recognise danger to self or others',
    loc: 'Level of care: risk of a more restrictive setting (1 of 5)',
    trauma: 'Section III · trauma-informed care',
    coord: 'Section II · care coordination',
    goals: 'Section IV · treatment goals are measurable',
    docs: 'Documents attached',
    wording: 'Billable wording in the notes',
    progress: 'Progress toward each goal (concurrent SRA)',
    family: 'Family involvement and barriers (concurrent SRA)',
  };
  PSY.data.reco = PSY.data.reco || {};

  /* the requirement each criterion key stands for (rule ids are in PSY.data.r5.rules, 02-core-data.js) */
  const REQ = {
    crit1: (k) => ({ rule: 'tdt-clin2', name: 'Clinical necessity · criterion 1' }),
    crit2: (k) => ({ rule: 'tdt-clin2', name: 'Clinical necessity · criterion 2' }),
    crit3: (k) => ({ rule: 'tdt-clin2', name: 'Clinical necessity · criterion 3' }),
    loc: (k) => ({ rule: 'tdt-loc1', name: 'Level of care (1 of 5)' }),
    coord: (k) => ({ rule: 'coord', name: 'Care coordination' }),
    trauma: (k) => ({ rule: 'form-init', name: 'Section III · trauma-informed care' }),
    goals: (k) => (k === 'cont' ? { rule: 'form-cs', name: 'Treatment progress toward measurable goals' } : { rule: 'form-init', name: 'Measurable treatment goals (Section IV)' }),
    docs: (k) => ({ rule: k === 'cont' ? 'form-cs' : 'form-init', name: 'Complete request documentation' }),
    wording: (k) => ({ rule: null, name: 'Billable wording in the daily notes' }),
    progress: (k) => ({ rule: 'form-cs', name: 'Progress toward each goal (Section II)' }),
    family: (k) => ({ rule: k === 'cont' ? 'form-cs' : 'form-init', name: 'Family involvement' }),
  };
  const ruleById = (id) => { const rs = (PSY.data.r5 && PSY.data.r5.rules) || []; return rs.find((r) => r.id === id) || null; };
  const VERIFY = 'Payer requirement verification needed';

  const R = (PSY.reco = {
    key: (cid, aid) => cid + '.' + aid,
    raw(cid) { return PSY.data.reco[cid] || { actions: [] }; },
    list(cid) { return R.raw(cid).actions.map((a) => Object.assign({}, a, { st: PSY.action(R.key(cid, a.id)) || null, done: !!(PSY.action(R.key(cid, a.id)) || {}).done, dismissed: !!(PSY.action(R.key(cid, a.id)) || {}).dismissed, value: (PSY.action(R.key(cid, a.id)) || {}).value, at: (PSY.action(R.key(cid, a.id)) || {}).at })); },
    pending(cid) { return R.list(cid).filter((a) => !a.done && !a.dismissed).length; },
    total() { return PSY.data.cases.reduce((n, c) => n + R.pending(c.id), 0); },
    next(cid) { return R.list(cid).find((a) => !a.done && !a.dismissed) || null; },
    /* there is no approval probability (Part 7.4): requirement coverage replaces it */
    chance() { return null; },
    /* the requirement an action addresses, with its source */
    requirement(cid, a) {
      const kind = PSY.l2 && PSY.l2.kind ? PSY.l2.kind(cid) : 'init';
      const base = (REQ[a && a.crit] || ((k) => ({ rule: null, name: (PSY.data.CRITERIA[a && a.crit] || 'Payer documentation') })))(kind);
      const rid = (a && a.req) || base.rule; const r = rid ? ruleById(rid) : null;
      if (!r) return { id: null, name: base.name, source: VERIFY, kind: 'unverified' };
      return { id: r.id, name: a && a.req ? r.text.replace(/\.$/, '') : base.name, source: r.source, kind: r.kind, text: r.text };
    },
    /* requirements addressed: the case's criteria, counting the ones a done action now addresses */
    coverage(cid) {
      const h = (PSY.data.hub || {})[cid]; const crit = (h && h.criteria) || [];
      const list = R.list(cid);
      const items = crit.map((x) => {
        const by = list.find((a) => a.crit === x.key && a.done);
        const status = x.status === 'met' ? 'met' : by ? 'met' : (x.status || 'open');
        return { key: x.key, label: x.short || PSY.data.CRITERIA[x.key] || x.key, full: PSY.data.CRITERIA[x.key] || x.label || x.short || x.key, status, was: x.status, addressedBy: by ? by.id : null, optional: /optional/i.test(x.note || '') };
      });
      return { met: items.filter((i) => i.status === 'met').length, total: items.length, items };
    },
    /* called by the extension screen when the clinician presses "Write into Lauris" and then Done */
    complete(cid, aid, value) {
      PSY.setAction(R.key(cid, aid), { done: true, value: value || '', at: PSY.now() });
      const a = R.list(cid).find((x) => x.id === aid);
      PSY.log(cid, 'Recommended action done: ' + (a ? a.title : aid) + '.');
    },
    dismiss(cid, aid) { PSY.setAction(R.key(cid, aid), { done: false, dismissed: true }); PSY.log(cid, 'Recommendation dismissed: ' + aid); },
    undo(cid, aid) { delete PSY.state.actions[R.key(cid, aid)]; PSY.save(); },
  });
})();
