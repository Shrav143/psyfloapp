/* Family link settings (route 'family-settings', opened from Settings and from a new case): the short questions a guardian is asked.
   Harvest decides the list; clinical questions are not allowed. Switches are real and saved in PSY.state.prefs.fam = { key: { ask, req } };
   Save records the list in the audit trail (prefs.famSaved).
   Acts: p1-fs-ask, p1-fs-req, p1-fs-save. */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const P = () => PSY.p1;
  /* key, question, (unused note), ask (default), required (default), where the answer goes.
     The question wording is what the guardian reads on the family link, so it keeps the guardian's words ("child"). */
  const Q = [
    ['name', 'Guardian name and relationship', '', true, true, 'Screening · CNA header'],
    ['phone', 'Best phone number', '', true, true, 'Screening · CNA header'],
    ['medicaid', 'Child’s Medicaid card number', '', true, false, 'Eligibility check · screening'],
    ['dob', 'Child’s date of birth', '', true, false, 'Eligibility check'],
    ['consent', 'Consent to be called about the child', '', true, true, 'Psyflo only'],
    ['time', 'Best time to call', '', true, false, 'Psyflo only'],
    ['transport', 'Can you get to an in-person intake?', '', true, false, 'Psyflo only · screening note'],
    ['lang', 'Preferred language', '', true, false, 'Screening · CNA header'],
    ['addr', 'Home address', '', false, false, 'Screening (if on)'],
    ['home', 'Who else lives in the home', '', false, false, 'CNA (if on)'],
  ];
  const fam = () => { const p = (PSY.state.prefs = PSY.state.prefs || {}); p.fam = p.fam || {}; return p.fam; };
  const get = (q) => { const f = fam()[q[0]] || {}; return { ask: f.ask == null ? q[3] : f.ask, req: f.req == null ? q[4] : f.req }; };
  const CSS = `
  .p1-fs .card-h{padding:18px 22px 12px;border-bottom:0}
  .p1-fs .p1-sm2{font-size:13px;color:#6B665E;margin-top:3px}
  .p1-fs table.p1-t td{padding-top:13px;padding-bottom:13px;vertical-align:middle}
  .p1-fs .sbt{color:#6B665E;font-size:12.5px;margin-top:2px}
  .p1-fs .two{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:20px;align-items:start}
  .p1-fs .msg{margin:0 22px 18px;background:#FCF9F5;border:1px solid #EFE8DE;border-radius:12px;padding:14px 16px;font-size:13.5px;line-height:1.6}
  .p1-fs .tx{padding:0 22px 20px;font-size:13.5px;line-height:1.6;color:#4A453D}
  .p1-fs .tx p{margin:0 0 10px}
  @media (max-width:1100px){.p1-fs .two{grid-template-columns:1fr}}
  `;
  const sw = (kind, k, on, label, dis) => '<button type="button" class="p1-sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(label) + '"' + (dis ? ' disabled style="opacity:.4;cursor:default"' : '') + ' data-act="p1-fs-' + kind + '" data-k="' + k + '"></button>';
  PSY.register({
    id: 'family-settings', app: 'psyflo', label: 'Family link', url: 'settings/family-link',
    get css() { return P().css + CSS; },
    render() {
      const rows = Q.map((q) => { const s = get(q); return '<tr data-k="' + q[0] + '"><td><b>' + esc(q[1]) + '</b>' + (q[2] ? '<div class="sbt">' + esc(q[2]) + '</div>' : '') + '</td><td>' + sw('ask', q[0], s.ask, 'Ask: ' + q[1]) + '</td><td>' + sw('req', q[0], s.ask && s.req, 'Required: ' + q[1], !s.ask) + '</td><td class="p1-mut" style="font-size:13px">' + esc(q[5]) + '</td></tr>'; }).join('');
      const table = '<section class="card p1-tw"><div class="card-h"><h2>What it asks</h2></div>' +
        '<table class="p1-t"><colgroup><col style="width:42%"><col style="width:12%"><col style="width:14%"><col style="width:32%"></colgroup><thead><tr><th>Question</th><th>Ask it</th><th>Required</th><th>Goes to</th></tr></thead><tbody>' + rows +
        '<tr><td><b>Any question about behaviour, diagnosis or history</b></td><td colspan="2">' + P().chip('n', 'not allowed') + '</td><td></td></tr></tbody></table></section>';
      const side = '<div style="display:flex;flex-direction:column;gap:20px"><section class="card"><div class="card-h"><h2>Message text</h2></div><div class="msg">Hi, this is Harvest Outreach Center. [School] asked us to reach out about support for your child. Could you answer a few quick questions so we can call you? [link] · Reply STOP to opt out.</div><div class="tx" style="padding-top:0">Link expires in 7 days. Reminder after 2 days if not opened.</div></section>' +
      '</div>';
      return PSY.platform.page({ active: 'settings', crumbs: [{ label: 'Settings', go: 'settings' }, { label: 'Family link' }], title: 'Family link', sub: ((PSY.state.prefs || {}).famSaved ? 'Last saved ' + esc(PSY.state.prefs.famSaved) + '.' : ''),
        actions: '<button type="button" class="btn o" data-go="family-phone">Preview on a phone</button><button type="button" class="btn p" data-act="p1-fs-save">Save</button>', body: '<div class="p1-fs"><div class="two">' + table + side + '</div></div>' });
    },
  });
  const flip = (kind) => (el, ctx) => {
    const k = el.getAttribute('data-k'), q = Q.find((x) => x[0] === k), s = get(q), f = (fam()[k] = Object.assign({}, fam()[k]));
    if (kind === 'ask') { f.ask = !s.ask; } else if (s.ask) { f.req = !s.req; } else return;
    PSY.save(); PSY.refresh();
  };
  PSY.acts['p1-fs-ask'] = flip('ask');
  PSY.acts['p1-fs-req'] = flip('req');
  PSY.acts['p1-fs-save'] = () => {
    const asked = Q.filter((q) => get(q).ask).length;
    const p = (PSY.state.prefs = PSY.state.prefs || {}); p.famSaved = PSY.now();
    if (PSY.audit) PSY.audit.add({ case: '', action: 'Family link questions saved: ' + asked + ' of ' + Q.length + ' asked', by: (PSY.r5 && PSY.r5.ME) || 'J. Perez, LPC', doc: 'Settings · Family link', status: '' }); else PSY.save();
    PSY.refresh(); PSY.ui.toast('Saved.');
  };
})();
