/* Lauris > Forms to Approve (route lauris-forms).
   Lists the forms staff processed and that wait for an approver's signature: the DMAS request of T.W. and of M.R. once they are processed in Lauris,
   plus four forms of other consumers. "Review and sign" opens the Lauris approval dialog: the form summary, a required attestation checkbox and a
   typed signature or PIN. Sign stays disabled until both are filled. Signing is the clinician's action; Psyflo never signs and only reads the result.
   After signing a DMAS request (any case: T.W. initial, M.R. concurrent SRA):
     PSY.auth.set(case, 'ready', { action: 'Signed by J. Perez, LPC in Lauris Forms to Approve', doc })   → "Ready for submission"
     T.W.: PSY.state.flow.tw = 'signed'. "Submit with Psyflo" then opens Scan & Enhance on the form, where Submit runs the simulated
     submission (PSY.submit5, 77-flow-initial.js).
   State: l2.signed.<case> = { date, at, by, how, ref, line }, l2.forms.signed.<id> = { at, date }, PSY.state.flows5[case].signed. */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY) return;
  const L2 = (PSY.l2 = PSY.l2 || {});
  const esc = PSY.esc;
  const ATTEST = 'I reviewed this request; the clinical content is accurate and supported by the record';
  const ATTEST_FORM = 'I reviewed this form; the clinical content is accurate and supported by the record';

  const CSS = `
  .fa-sub{margin:-4px 0 10px;font-size:12px;color:#6B7280}
  .fa-t td small{display:block;color:#6B7280;font-size:11.5px;margin-top:1px}
  .fa-none{padding:22px;text-align:center;color:#6B7280;background:#fff;border:1px solid #D5D9DF;border-radius:4px}
  .fa-h2{font-size:13px;font-weight:700;color:#1F3B6B;margin:18px 0 6px}
  .fa-ok{background:#E6F4EA;border:1px solid #BFE0CC;border-radius:3px;padding:8px 12px;font-size:12.5px;color:#1E5A3A;margin-bottom:10px;line-height:1.45;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .fa-ok span{flex:1;min-width:240px}
  .fa-st{display:inline-block;border-radius:3px;padding:2px 8px;font-size:11px;font-weight:700;background:#E1F2E7;color:#1E6B40;border:1px solid #B5D9C3}
  .fa-st.b{background:#E6EEF8;color:#24476E;border-color:#C7D7EC}
  .fa-ov{position:absolute;inset:0;z-index:60;background:rgba(31,42,58,.38);display:flex;align-items:flex-start;justify-content:center;padding:34px 16px;overflow:auto}
  .fa-dlg{width:min(640px,100%);background:#fff;border:1px solid #8E99A6;border-radius:3px;box-shadow:0 12px 40px rgba(0,0,0,.28);font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#222}
  .fa-dh{display:flex;align-items:center;gap:10px;background:#2F3A4A;color:#fff;padding:9px 12px}
  .fa-dh b{font-size:14px}.fa-dh span{font-size:11.5px;color:#C8CFD8}.fa-dh .fa-x{margin-left:auto;border:0;background:transparent;color:#C8CFD8;font-size:18px;line-height:1;cursor:pointer;padding:2px 4px}
  .fa-db{padding:12px 14px;display:flex;flex-direction:column;gap:10px;max-height:calc(var(--vh,700px) - 190px);overflow:auto}
  .fa-sum{width:100%;border-collapse:collapse;font-size:12.5px;border:1px solid #D5D9DF}
  .fa-sum th{width:150px;text-align:left;background:#E9ECF0;color:#333;font-weight:700;padding:6px 9px;border-bottom:1px solid #D5D9DF;vertical-align:top}
  .fa-sum td{padding:6px 9px;border-bottom:1px solid #E7E9ED;vertical-align:top}
  .fa-sum tr:last-child th,.fa-sum tr:last-child td{border-bottom:0}
  .fa-att{background:#F4F5F7;border:1px solid #D5D9DF;border-radius:3px;padding:8px 10px;font-size:12px;line-height:1.5;color:#333}
  .fa-ck{display:flex!important;gap:9px;align-items:flex-start;text-transform:none!important;letter-spacing:0!important;font-size:13px!important;color:#222!important;font-weight:700;background:#FFF8E6;border:1px solid #E8C56A;border-radius:3px;padding:9px 10px;cursor:pointer;margin:0!important}
  .fa-ck input{margin:2px 0 0;width:16px;height:16px;flex:none}
  .fa-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .fa-g label{display:block;font-size:11px;color:#555;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em}
  .fa-g input{width:100%;border:1px solid #C9CDD3;background:#fff;padding:6px 8px;border-radius:3px;font:inherit;font-size:13px;min-height:30px;color:#222}
  .fa-g input[readonly]{background:#E6F4EA}
  .fa-g input.sig{background:#FFFDF2;border-color:#B8BEC7;font-family:'Brush Script MT','Segoe Script',cursive;font-size:17px}
  .fa-g input.sig:focus{outline:2px solid #1F4E8C;outline-offset:0}
  .fa-n{margin:0;font-size:12px;color:#525B66}
  .fa-df{display:flex;gap:8px;justify-content:flex-end;align-items:center;background:#F4F5F7;border-top:1px solid #D5D9DF;padding:9px 12px}
  .fa-df .fa-why{margin-right:auto;font-size:11.5px;color:#6B7280}
  `;

  /* a DMAS request's status in this list, from the single status model */
  const sentText = (cid) => {
    const s = PSY.auth ? PSY.auth.status(cid) : ''; const rec = ((PSY.state.cases || {})[cid] || {}).submission5;
    if (rec) return rec.channel + ' · ' + rec.ref + ' (simulated)';
    if (s === 'ready') { const ch = PSY.rules ? PSY.rules.channel(PSY.caseView(cid).payer) : { label: '' }; return 'Ready for submission · ' + ch.label; }
    const si = L2.signedInfo(cid); return (si && si.ref) || '';
  };
  function pendingRows() {
    return L2.pendingForms().map((f) => '<tr class="hov" data-form="' + esc(f.id) + '"><td>' + esc(f.form) + (f.cid ? '<small>DMAS form · ' + esc(L2.payer(f.cid).short) + (f.unprocessed ? ' · saved, not processed yet' : '') + '</small>' : '') + '</td><td>' + esc(f.ini) + '</td><td>' + esc(f.by) + '</td><td>' + esc(f.date) + (f.time ? '<small>' + esc(f.time) + '</small>' : '') + '</td>'
      + '<td>' + (f.unprocessed ? '<button class="lb" data-go="lauris-dmas?case=' + esc(f.cid) + '" data-psy="open-' + esc(f.id) + '">Open the form</button>' : '<button class="lb" data-act="fa-sign" data-id="' + esc(f.id) + '" data-psy="sign-' + esc(f.id) + '">Review and sign</button>') + '</td></tr>').join('');
  }
  function signedRows() {
    const rows = [];
    ['R-0416', 'R-0411'].forEach((cid) => { const s = L2.signedInfo(cid); if (s) { const c = PSY.caseView(cid); const ready = PSY.auth && PSY.auth.status(cid) === 'ready'; rows.push([L2.TITLE[L2.kind(cid)], c.who, 'J. Perez', s.date + (s.at ? ' · ' + s.at : ''), sentText(cid), ready]); } });
    L2.STATIC_FORMS.forEach((f) => { const s = L2.get('l2.forms.signed.' + f.id, null); if (s) rows.push([f.form, f.ini, f.by, s.date || '10/29/2026', 'Filed in the record', false]); });
    return rows;
  }
  function bodyHtml() {
    const pend = L2.pendingForms(); const sg = signedRows();
    let h = pend.length ? '<table class="lt fa-t" data-psy="forms-table"><thead><tr><th>Form</th><th>Consumer</th><th>Requested by</th><th>Date</th><th></th></tr></thead><tbody>' + pendingRows() + '</tbody></table>'
      : '<div class="fa-none">No forms to approve</div>';
    if (sg.length) h += '<div class="fa-h2">Signed today</div><table class="lt fa-t" data-psy="signed-table"><thead><tr><th>Form</th><th>Consumer</th><th>Requested by</th><th>Signed</th><th>Next</th></tr></thead><tbody>' + sg.map((r) => '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td><span class="fa-st">Signed</span> ' + esc(r[3]) + '</td><td>' + (r[5] ? '<span class="fa-st b">' + esc(r[4]) + '</span>' : esc(r[4] || '')) + '</td></tr>').join('') + '</tbody></table>';
    return h;
  }
  /* a banner for every DMAS request that is signed and waits for submission: the extension offers Submit (nothing is sent before) */
  function bannerHtml() {
    return ['R-0416', 'R-0411'].filter((cid) => L2.signedInfo(cid) && PSY.auth && PSY.auth.status(cid) === 'ready').map((cid) => {
      const c = PSY.caseView(cid); const ch = PSY.rules ? PSY.rules.channel(c.payer) : { label: '' };
      return '<div class="fa-ok" data-psy="signed" data-case="' + cid + '"><span><b>Signed</b> · ' + esc(c.ini) + ' · ' + esc(L2.payer(cid).short) + ' (' + esc(ch.label) + ')</span>'
        + '<button class="lb pri" data-act="enh-open" data-case="' + cid + '" data-psy="submit-' + cid + '">Submit with Psyflo</button></div>';
    }).join('');
  }
  function render() {
    const main = '<h3 class="lh1">Forms to Approve</h3><div data-psy="signed-banner">' + bannerHtml() + '</div><div data-psy="forms-body">' + bodyHtml() + '</div><div data-psy="fa-dlg-host"></div>';
    return PSY.lauris.page({ active: 'Forms to Approve', main, panel: { context: 'Forms to Approve', notes: '<div class="xcard"><div class="cap">Forms to Approve</div></div>' } });
  }
  function redraw(root) { const b = root.querySelector('[data-psy="forms-body"]'); if (b) b.innerHTML = bodyHtml(); const bn = root.querySelector('[data-psy="signed-banner"]'); if (bn) bn.innerHTML = bannerHtml(); L2.updateBadge(root); }

  /* ------------------------------------------------------------------ the Lauris approval dialog */
  function summary(f) {
    const tr = (k, v) => '<tr><th>' + esc(k) + '</th><td>' + v + '</td></tr>';
    if (!f.cid) return '<table class="fa-sum">' + tr('Form', esc(f.form)) + tr('Consumer', esc(f.ini)) + tr('Requested by', esc(f.by)) + tr('Date', esc(f.date)) + '</table>';
    const cid = f.cid; const c = PSY.caseView(cid); const m = L2.meta(cid) || {}; const r = L2.roster(cid) || {}; const d = L2.dates(cid); const kind = L2.kind(cid);
    const u = PSY.auth ? PSY.auth.units(cid) : { requested: m.units, service: { label: c.service, code: c.code } };
    const p = L2.get(L2.k(cid, 'processed'), null);
    const sec3 = kind === 'init' && L2.form && L2.form.boxModel ? (() => { const b = L2.form.boxModel(cid, 'sec3'); const t = [b.base].concat(b.segs.map((s) => s.text)).filter(Boolean).join(' '); return t ? 'Written by the clinician' : '<b style="color:#B9541F">Blank</b>'; })() : '';
    return '<table class="fa-sum" data-psy="sign-summary">' + tr('Form', esc(L2.TITLE[kind]) + ' · DMAS, ' + esc(L2.EDITION[kind]) + ' · <a class="lk" data-go="lauris-dmas?case=' + cid + '">Open the form</a>')
      + tr('Consumer', esc(c.who) + ' · Harvest # ' + esc(r.id || ''))
      + tr('Payer', esc(L2.payer(cid).name))
      + tr('Service', esc(u.service.label) + ' · ' + esc(u.service.code || 'H2016'))
      + tr('Request', esc((u.requested || m.units || '') + ' units · ' + d[0] + ' – ' + d[1] + ' · ' + (m.hours || 15) + ' hours a week'))
      + tr('Diagnosis', esc(m.dx || ''))
      + (sec3 ? tr('Section III', sec3) : '')
      + tr('Processed', esc('10/29/2026' + (p && p.at ? ' ' + p.at : '') + ' by J. Perez'))
      + tr(kind === 'init' ? 'Assessment' : 'Last assessment', esc((m.assess || '') + (kind === 'init' ? ' (Comprehensive Needs Assessment)' : ''))) + '</table>';
  }
  function dialogHtml(f) {
    const isAuth = !!f.cid; const kind = isAuth ? L2.kind(f.cid) : null;
    return '<div class="fa-ov" data-psy="sign-dlg" role="dialog" aria-modal="true" aria-labelledby="fa-dt"><div class="fa-dlg">'
      + '<div class="fa-dh"><b id="fa-dt">Review and sign</b><span>Forms to Approve · ' + esc(f.ini) + '</span><button class="fa-x" data-act="fa-cancel" aria-label="Close">×</button></div>'
      + '<div class="fa-db">' + summary(f)
      + '<label class="fa-ck"><input type="checkbox" data-psy="attest-box" data-change="fa-check"> <span>' + esc(isAuth ? ATTEST : ATTEST_FORM) + '</span></label>'
      + '<div class="fa-g"><div><label>Printed name of LMHP</label><input type="text" value="Jordan Perez, LPC" readonly></div><div><label>Credentials and NPI</label><input type="text" value="LPC · NPI on file in your Lauris user record" readonly></div></div>'
      + '<div class="fa-g"><div><label for="fa-sig">Signature (type your name or PIN)</label><input id="fa-sig" class="sig" type="text" autocomplete="off" spellcheck="false" data-psy="sig-input" data-input="fa-check" data-enter="fa-do-sign" placeholder="Jordan Perez"></div><div><label>Date signed</label><input type="text" value="10/29/2026" readonly></div></div>'
      + '</div>'
      + '<div class="fa-df"><span class="fa-why" data-psy="sign-why">Tick the box and type your name.</span><button class="lb" data-act="fa-cancel">Cancel</button><button class="lb pri" data-act="fa-do-sign" data-id="' + esc(f.id) + '" data-psy="sign-btn" disabled>Sign</button></div>'
      + '</div></div>';
  }
  const valid = (root) => { const b = root.querySelector('[data-psy="attest-box"]'); const s = root.querySelector('[data-psy="sig-input"]'); return !!(b && b.checked && s && s.value.trim().length >= 2); };
  PSY.acts['fa-check'] = (el, ctx) => {
    const ok = valid(ctx.root); const b = ctx.root.querySelector('[data-psy="sign-btn"]'); if (b) b.disabled = !ok;
    const w = ctx.root.querySelector('[data-psy="sign-why"]'); if (w) w.textContent = ok ? 'Ready to sign.' : 'Tick the box and type your name.';
  };
  PSY.acts['fa-sign'] = (el, ctx) => {
    const id = el.getAttribute('data-id'); const f = L2.pendingForms().find((x) => x.id === id); if (!f || f.unprocessed) return;
    const host = ctx.root.querySelector('[data-psy="fa-dlg-host"]'); if (!host) return;
    host.innerHTML = dialogHtml(f);
    setTimeout(() => { const b = host.querySelector('[data-psy="attest-box"]'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) {} } }, 30);
  };
  PSY.acts['fa-cancel'] = (el, ctx) => { const host = ctx.root.querySelector('[data-psy="fa-dlg-host"]'); if (host) host.innerHTML = ''; };
  PSY.acts['fa-do-sign'] = (el, ctx) => {
    const root = ctx.root; const btn = root.querySelector('[data-psy="sign-btn"]'); const id = btn ? btn.getAttribute('data-id') : el.getAttribute('data-id');
    if (!valid(root)) { PSY.acts['fa-check'](el, ctx); return; }
    const f = L2.pendingForms().find((x) => x.id === id); if (!f) return;
    const sig = root.querySelector('[data-psy="sig-input"]').value.trim(); const how = /^\d{4,}$/.test(sig) ? 'Lauris PIN' : 'typed signature';
    root.querySelector('[data-psy="fa-dlg-host"]').innerHTML = '';
    sign(root, f, how);
  };

  /* ------------------------------------------------------------------ signing (the clinician's action; Psyflo reads the result) */
  function sign(root, f, how) {
    const cid = f.cid;
    if (!cid) {
      L2.set('l2.forms.signed.' + f.id, { at: PSY.now(), date: '10/29/2026', how });
      if (PSY.audit) PSY.audit.add({ case: '', action: 'Signed by J. Perez, LPC in Lauris Forms to Approve', doc: f.form + ' · ' + f.ini, status: '' });
      redraw(root); PSY.ui.toast('Signed.');
      return;
    }
    const kind = L2.kind(cid); const doc = L2.DOC[kind] || 'DMAS form'; const ch = PSY.rules ? PSY.rules.channel(PSY.caseView(cid).payer) : { label: '' };
    L2.set('l2.signed.' + cid, { date: '10/29/2026', at: PSY.now(), by: 'Jordan Perez, LPC', how, ref: '', line: 'Ready for submission (' + ch.label + ').' });
    if (cid === 'R-0416') PSY.state.flow.tw = 'signed';
    PSY.state.flows5 = PSY.state.flows5 || {}; const fs = (PSY.state.flows5[cid] = PSY.state.flows5[cid] || {});
    fs.signed = { at: PSY.now(), by: 'J. Perez, LPC', how }; fs.step = 'submit';
    PSY.auth.set(cid, 'ready', { action: 'Signed by J. Perez, LPC in Lauris Forms to Approve', doc });
    PSY.state.log.unshift({ t: PSY.now(), case: cid, text: 'Signed in Lauris Forms to Approve by J. Perez, LPC (' + how + '). Ready for submission.' });
    /* the extension offers Submit (Scan & Enhance on the form): the banner above the list opens it */
    PSY.save(); PSY.refresh();
    PSY.ui.toast('Signed.');
  }

  PSY.register({ id: 'lauris-forms', app: 'lauris', label: 'Forms to Approve', url: 'forms-to-approve', css: CSS, render, mount: (root) => { L2.updateBadge(root); } });
})();
