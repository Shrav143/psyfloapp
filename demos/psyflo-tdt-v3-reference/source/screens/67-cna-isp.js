/* L1b: Lauris Individual Service Plan 2.0 (ISP). Route: lauris-isp?c=4492 (T.W., 12). Other consumer ids get the same form with their own header.
   Round 8: the ISP is not a Scribe type (the Intake is 69-intake-form.js). The three goals can still be typed into the plan from the extension
   with PSY.l1b.isp.type(root, params) (Scan & Enhance "Push to form"); PSY.l1b.isp.goals(params) returns them. */
(function () {
  const PSY = window.PSY; const U = PSY && PSY.l1b;
  if (!U) return;
  const TW = '4492';
  const esc = (s) => PSY.esc(s);
  const G = (id, label, html, x) => Object.assign({ id, label, html, src: 'g' }, x || {});
  const C = (id, label, ph, x) => Object.assign({ id, label, html: '', src: 'c', ph }, x || {});

  /* =====================================================================================================
     ISP 2.0: three goals (typed by Psyflo through PSY.l1b.isp.type, or by the clinician), interventions only from the approved picklist
     ===================================================================================================== */
  const GOALS = [
    { n: 1, name: 'emotional regulation', obj: 'T.W. will use a taught coping strategy before leaving the room in 4 of 5 escalations.', days: '5', ints: ['Clinical 2.1 Movement', 'QMHP 1.3 Psychoeducation'], est: '3 months', from: 'CNA: 6 aggression incidents, leaves when frustrated' },
    { n: 2, name: 'peer conflict', obj: 'T.W. will respond to peer conflict without physical contact in 4 of 5 incidents.', days: '5', ints: ['QMHP 1.9 Solving peer conflict', 'QMHP 1.5 Make or maintain friendships'], est: '3 months', from: 'CNA and referral: shoving, 2 office referrals' },
    { n: 3, name: 'staying in class', obj: 'T.W. will stay in class for the full period on 4 of 5 school days.', days: '5', ints: ['QMHP 1.6 Recognize danger / healthy boundaries', 'QMHP 1.4 Structured problem solving'], est: '3 months', from: 'Attendance log: weekly elopement' },
  ];
  U.data = U.data || {}; U.data.ispGoals = GOALS;
  const DAYS = ['1', '2', '3', '4', '5'];
  const EST = ['1 month', '2 months', '3 months', '6 months', '12 months'];
  const opt = (arr, sel) => '<option value=""></option>' + arr.map((x) => '<option' + (x === sel ? ' selected' : '') + '>' + esc(x) + '</option>').join('');

  function ispSetup(params) {
    const c = U.consumer(params.c, TW); const tw = c.id === TW;
    const K = (n) => U.k('isp', c.id, n);
    const goals = GOALS.map((g) => Object.assign({}, g, { obj: g.obj.replace(/^T\.W\./, c.ini), from: tw ? g.from : 'The intake and the referral' }));
    return { c, tw, K, goals };
  }
  const goalTyped = (root, i) => { const e = root.querySelector('[data-goal="' + (i + 1) + '"]'); return !!(e && e.classList.contains('typed')); };
  async function typeGoal(root, S, i) {
    const g = S.goals[i]; const card = root.querySelector('[data-goal="' + (i + 1) + '"]'); if (!card || card.classList.contains('typed')) return;
    root.__l1bBusy = true;
    try {
      U.reveal(card);
      await U.type(root, root.querySelector('[data-f="g' + g.n + '.obj"]'), esc(g.obj), { frames: 24 });
      await U.type(root, root.querySelector('[data-f="g' + g.n + '.days"]'), g.days);
      await U.type(root, root.querySelector('[data-f="g' + g.n + '.i1"]'), g.ints[0]);
      await U.type(root, root.querySelector('[data-f="g' + g.n + '.i2"]'), g.ints[1]);
      await U.type(root, root.querySelector('[data-f="g' + g.n + '.est"]'), g.est);
      card.classList.add('typed');
      const ch = card.querySelector('.chip'); if (ch) { ch.textContent = 'typed by Psyflo, check it'; ch.className = 'chip y'; }
      U.set(S.K('n'), root.querySelectorAll('.l1b-goal.typed').length);
    } finally { root.__l1bBusy = false; }
    ispPaint(root);
  }
  function ispPaint(root) {
    const val = (id) => { const e = root.querySelector('[data-f="' + id + '"]'); return e ? String(e.tagName === 'DIV' ? e.textContent : e.value).trim() : ''; };
    const ints = (n) => [val('g' + n + '.i1'), val('g' + n + '.i2')].filter((x) => x);
    const set = (id, state, txt) => { const e = root.querySelector('[data-ck="' + id + '"]'); if (!e) return; e.querySelector('.ic').innerHTML = U.ic[state]; e.querySelector('span.s').textContent = txt || ''; };
    const any = [1, 2, 3].some((n) => val('g' + n + '.obj'));
    const allObj = [1, 2, 3].every((n) => /\b\d+ of \d+\b/.test(val('g' + n + '.obj')));
    set('meas', !any ? 'wait' : allObj ? 'ok' : 'warn', !any || allObj ? '' : 'An objective needs a count like 4 of 5.');
    const okInts = [1, 2, 3].every((n) => ints(n).length && ints(n).every((x) => U.APPROVED.indexOf(x) >= 0));
    set('ints', !any ? 'wait' : okInts ? 'ok' : 'warn', !any || okInts ? '' : 'A goal needs an intervention from the approved list.');
    const left = [1, 2, 3].filter((n) => !goalTyped(root, n - 1)).length;
    const st = root.querySelector('[data-l1b="typed"]'); if (st) { st.textContent = (3 - left) + ' of 3 goals'; st.className = 'chip ' + (left ? ((3 - left) ? 'y' : 'n') : 'g'); }
  }
  const ispDone = (r, S) => { if ([0, 1, 2].every((i) => goalTyped(r, i))) { U.set(S.K('filled'), true); U.markDone(r.querySelector('[data-act="l1b-isp-fill"]'), 'Goals filled'); } ispPaint(r); };
  /* ---------- for Scan & Enhance: the 3 goals typed into the plan on screen (amber, "typed by Psyflo, check it") ---------- */
  U.isp = {
    goals: (params) => ispSetup(params || {}).goals,
    type: async (root, params) => {
      const S = ispSetup(params || {}); root = root || PSY.activeRoot();
      if (!root || !root.querySelector('[data-goal="1"]')) return 0;
      try { for (let i = 0; i < 3; i++) { await typeGoal(root, S, i); await U.sleep(120); } } catch (e) { if (e !== U.GONE) throw e; }
      if (root.isConnected) ispDone(root, S);
      return [0, 1, 2].filter((i) => goalTyped(root, i)).length;
    },
  };

  function ispProcessOpts(S) {
    const { c, tw, K } = S;
    return {
      key: K('processed'), required: [1, 2, 3].map((n) => ({ id: 'g' + n + '.obj', label: 'Goal ' + n + ' objective' })),
      after: () => { if (tw) { if (PSY.flowRank() < 3) { PSY.state.flow.tw = 'isp'; PSY.save(); } PSY.log('R-0416', 'Treatment plan (ISP 2.0) processed in Lauris: 3 goals.'); } },
      toast: 'Processed.',
      seeIt: c.case && PSY.can('platform') ? { to: tw ? 'draft-initial' : PSY.platform.caseRoute(c.case), label: 'See it in Psyflo', text: '' } : null,
    };
  }

  PSY.register({
    id: 'lauris-isp', app: 'lauris', label: 'Individual Service Plan 2.0',
    url: (p) => 'consumers/' + ((p && p.c) || TW) + '/session/isp',
    css: U.css + `
.l1b-goal{padding:10px 12px;margin-bottom:10px}
.l1b-gh{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:13px;color:#1F3B6B}
.l1b-gh .chip{margin-left:auto;display:inline-block;border-radius:999px;padding:1px 9px;font-size:11.5px;font-weight:600;background:#EEEBE5;color:#3E4652}
.l1b-gh .chip.y{background:#FCEFD0;color:#6F4A05}
.l1b-gg{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:10px}
.l1b-gg .in{min-height:92px}
.l1b-gs{display:grid;gap:8px}
.l1b-gs select.lsel{font-size:12px;padding:5px 6px}
.l1b-gs .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.l1b-goal.l1b-hl{outline-offset:2px}
.lz-main a.l1b-sig{color:#1F64BE;font-weight:700;cursor:pointer}
.xp .l1b-ckrow{display:flex;gap:9px;align-items:flex-start;padding:6px 0;border-top:1px solid #EFEBE4;font-size:12.5px}
.xp .l1b-ckrow .ic{flex:0 0 16px;margin-top:1px}
.xp .l1b-ckrow b{display:block;font-weight:600}
.xp .l1b-ckrow span.s{display:block;color:#525B66;font-size:12px;margin-top:1px;line-height:1.4}`,
    render(params) {
      const S = ispSetup(params); const { c, tw, K } = S;
      const nT = U.get(K('n')) || 0; const filled = !!U.get(K('filled')); const proc = U.get(K('processed'));
      const goalCard = (g, i) => {
        const on = i < nT;
        const sel = (id, arr, v, label) => '<div class="l1b-f"><label>' + label + '</label><select class="lsel' + (on ? ' a' : '') + '" data-f="g' + g.n + '.' + id + '">' + opt(arr, on ? v : '') + '</select></div>';
        return '<div class="lcard l1b-goal' + (on ? ' typed' : '') + '" data-goal="' + g.n + '" data-f="goal' + g.n + '"><div class="l1b-gh"><b>Goal ' + g.n + ' · ' + g.name + '</b><span class="chip' + (on ? ' y' : '') + '">' + (on ? 'typed by Psyflo, check it' : 'not written yet') + '</span></div>' +
          '<div class="l1b-gg"><div class="l1b-f"><label>Measurable objective</label><div class="in' + (on ? ' a' : '') + '" contenteditable="true" spellcheck="false" data-f="g' + g.n + '.obj" data-ph="">' + (on ? esc(g.obj) : '') + '</div></div>' +
          '<div class="l1b-gs"><div class="two">' + sel('days', DAYS, g.days, 'Days per week') + sel('est', EST, g.est, 'Est. completion') + '</div>' + sel('i1', U.APPROVED, g.ints[0], 'Intervention 1 · approved list') + sel('i2', U.APPROVED, g.ints[1], 'Intervention 2 · approved list') + '</div></div></div>';
      };
      const pre = tw ? [G('dx', 'Diagnosis 1', 'F91.3 Oppositional defiant disorder · from the CNA'), G('plan', 'Start · end of plan', '10/21/2026 – 10/20/2027'), G('freq', 'Prescribed frequency', 'Daily'), G('setting', 'Setting', 'School · MS-2')]
        : [C('dx', 'Diagnosis 1', ''), C('plan', 'Start · end of plan', ''), C('freq', 'Prescribed frequency', ''), G('setting', 'Setting', 'School · ' + esc(c.school))];
      const main = '<div class="l1b-form">' +
        U.head(c, { meta: 'Harvest # ' + c.id + ' · ' + esc(c.school) + (tw ? ' · intake 10/20 · plan due by 10/21, 11:52 am' : '') }) +
        U.tabs(c, 'file') + U.entry('Individual Service Plan 2.0', 'Add Session · ' + (tw ? '10/21/2026' : '10/29/2026') + ' · J. Perez, LPC · guardian and client present', proc) +
        '<div class="l1b-g c4">' + pre.map((f) => U.field(f)).join('') + '</div>' +
        '<div class="l1b-g c2">' + (tw ? U.field(G('issue', 'Presenting issue / reason for referral', 'Physical and verbal aggression toward peers, leaving the building, daily off-task behaviour. Copied from the CNA.', { mh: 48 })) + U.field(G('strengths', 'Strengths', 'Engaged grandmother; enjoys basketball and drawing; responds well to one-to-one adult attention. Copied from the CNA.', { mh: 48 }))
          : U.field(C('issue', 'Presenting issue / reason for referral', '', { mh: 48 })) + U.field(C('strengths', 'Strengths', '', { mh: 48 }))) + '</div>' +
        '<div class="l1b-sub">Goals</div>' +
        S.goals.map(goalCard).join('') +
        '<div class="l1b-g c2">' + U.field(G('disch', 'Treatment goals and discharge criteria', 'Step-down to outpatient counseling plus school supports when the objectives are met 4 of 5 times for 8 consecutive weeks, or when the individual no longer meets the eligibility criteria. Harvest standard text.', { mh: 56 })) +
        '<div class="l1b-f"><label>Signatures</label><div class="in" style="min-height:56px;line-height:1.7">Harvest staff: J. Perez, LPC · Client: not required (under 14) · Parent/Guardian: <a class="l1b-sig" data-act="l1b-sign" data-who="Parent/Guardian">Get Signature</a> · Approver: J. Perez</div></div></div>' +
        U.btns(proc, U.legend) + '</div>';
      const ck = (id, state, title, sub) => '<div class="l1b-ckrow" data-ck="' + id + '"><span class="ic">' + U.ic[state] + '</span><div><b>' + title + '</b><span class="s">' + sub + '</span></div></div>';
      const st = filled ? 'ok' : 'wait';
      const notes = '<div class="l1b-n"><div class="xcard a"><div style="display:flex;gap:9px;align-items:flex-start;font-size:12.5px">' + U.ic.warn + '<div><b>Plan due 24 hours from the intake</b> (' + (tw ? '10/20, 11:52 am' : 'intake day') + ').</div></div></div>' +
        '<div>' + U.cap('Checks', '<span class="chip n" data-l1b="typed">' + nT + ' of 3 goals</span>') +
        ck('meas', st, 'Measurable', '') + ck('ints', st, 'Interventions', '') + '</div>' +
        '<div>' + U.cap('Where each goal came from') + S.goals.map((g) => '<div class="sec"><b>Goal ' + g.n + ' · ' + g.name + '</b><span class="chip n">' + g.from + '</span></div>').join('') + '</div></div>';
      return PSY.lauris.page({ active: 'Add Session', main, panel: { context: 'Individual Service Plan · ' + esc(c.ini), notes, student: c.ini, case: c.case } });
    },
    mount(root, ctx) {
      const S = ispSetup(ctx.params); const { c, K } = S;
      U.guardScribe(ctx);
      U.openPanel(K('panel'));
      ispPaint(root);
      root.__l1bForm = { process: (r) => U.process(r, ispProcessOpts(S)) };
      if (U.get(K('processed')) && ispProcessOpts(S).seeIt) PSY.ext.seeIt(root, ispProcessOpts(S).seeIt);
    },
  });
})();
