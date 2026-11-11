/* Platform pages of the authorization drafts: 'draft-initial' (T.W. · R-0416) and 'draft-continued' (M.R. · R-0411, S.B. · R-0395, any continued case).
   Read-only mirrors of the draft the clinician reviews in Lauris, in the Psyflo extension (sections, provenance labels, citations,
   status, missing information, timeline). Nothing is typed or approved here.
   The primary button "Review in Lauris" opens the consumer in Lauris with Scan & Enhance (PSY.p1.openInLauris → PSY.enhance.openFor).
   Round 8: crumbs "Authorizations / <initials>" (round 11: PSY.p1.crumbs reads "All Authorizations / <initials>").
   Concurrent SRA content comes from PSY.cs5 (78-flow-continued.js). The initial SRA uses PSY.flows.initial.mirror(caseId) when the
   initial flow provides it, otherwise the drafted sections of the case data (PSY.data.hub[caseId].draft). */
(function () {
  const PSY = window.PSY;
  if (!PSY) return;
  const esc = PSY.esc;
  const crumbsOf = (id) => PSY.p1.crumbs(id);
  const A = () => PSY.auth; const EV = () => PSY.ev;
  const hub = (id) => (PSY.data.hub || {})[id] || {};
  const LABEL_TEXT = { ehr: 'Retrieved from Lauris', ai: 'AI-generated draft', clin: 'Clinician-entered', reviewed: 'Clinician Reviewed', need: 'Clinician Input Required' };
  const lab = (k) => EV().label(k, LABEL_TEXT[k]);

  const css = `
  .dm5{display:flex;flex-direction:column;gap:16px}
  .dm5-note{align-self:flex-start;display:inline-flex;background:#F4F8FC;border:1px solid #C7D7EC;color:#1B3A5C;border-radius:999px;padding:3px 11px;font-size:12px;font-weight:600}
  .dm5-g{display:grid;grid-template-columns:minmax(0,1.85fr) minmax(0,1fr);gap:16px;align-items:start}
  .dm5-col{display:flex;flex-direction:column;gap:16px;min-width:0}
  .dm5 .card{padding:16px 20px}
  .dm5 .card>h2{font-size:17px;margin:0 0 10px}
  .dm5-st{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;font-size:13.5px}
  .dm5-st .sp{flex:1}
  .dm5-st span.k{color:#6B665E;font-size:12px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;margin-right:6px}
  .dm5-mi{border-top:1px solid #EFE8DE;padding:10px 0;font-size:13.5px;line-height:1.45}
  .dm5-mi:first-of-type{border-top:0;padding-top:2px}
  .dm5-mi .h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:4px}
  .dm5-mi .w{color:#4A453D;font-size:13px}
  .dm5-mi .t{white-space:pre-wrap;background:#F1F8F4;border:1px solid #BFDCCB;border-radius:8px;padding:7px 9px;margin-top:6px;font-size:13px}
  .dm5-empty{color:#6B665E;font-size:13.5px}
  .dm5-sec{border:1px solid #E5DCD0;border-left:4px solid #C7D7EC;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#fff}
  .dm5-sec.k-ehr{border-left-color:#8FC3A6}.dm5-sec.k-ai{border-left-color:#8EB0DA}.dm5-sec.k-need{border-left-color:#E0B860}.dm5-sec.k-reviewed{border-left-color:#2F8F5B}
  .dm5-sh{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.dm5-sh h4{margin:0;font-size:14.5px;flex:1;min-width:150px}
  .dm5-n{width:24px;height:24px;border-radius:50%;background:#EFEBE4;color:#4A453D;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex:0 0 24px}
  .dm5-tx{font-size:13.5px;line-height:1.6;margin-top:8px}.dm5-tx p{margin:0 0 6px}.dm5-tx ul{margin:4px 0;padding-left:18px}
  .dm5-tb{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.dm5-tb th{text-align:left;font-size:11px;color:#6B665E;text-transform:uppercase;letter-spacing:.05em;padding:4px 8px 4px 0}.dm5-tb td{border-top:1px solid #EFE8DE;padding:6px 8px 6px 0;vertical-align:top}
  .dm5-src{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-top:8px;font-size:11.5px;color:#6B665E}.dm5-src>span:first-child{font-weight:700;text-transform:uppercase;letter-spacing:.05em;font-size:10.5px}
  `;
  const cs5Css = () => (PSY.cs5 && PSY.cs5.css ? PSY.cs5.css('.dm5') : '');

  /* ---------------------------------------------------------------- shared bits */
  const reviewBtn = (flow, id, label, psy) => '<button class="btn p" data-act="d8-enhance" data-flow="' + flow + '" data-case="' + esc(id) + '" data-psy="' + (psy || 'review-in-lauris') + '">' + esc(label || 'Review in Lauris') + '</button>';
  const note = (flow) => '<div class="dm5-note"><b>Read-only</b></div>';
  const timelineCard = (id) => '<section class="card" data-psy="dm5-timeline"><h2>Timeline</h2>' + A().timelineHtml(id) + '</section>';
  function payerLine(id) { const c = PSY.caseView(id); const p = PSY.data.payers[c.payer] || {}; const u = A().units(id); return esc(p.name || '') + ' · ' + esc(u.service.label) + (u.requested ? ' · ' + u.requested + ' ' + esc(u.service.units) + (u.period ? ', ' + esc(u.period) : '') : ''); }

  /* ---------------------------------------------------------------- concurrent SRA */
  function continuedPage(id) {
    const c = PSY.caseView(id); const CS = PSY.cs5; const st = A().status(id);
    const title = 'Concurrent SRA · ' + c.ini + ', ' + c.age;
    const crumbs = crumbsOf(id);
    if (!CS) return PSY.platform.page({ active: 'auth', title: esc(title), crumbs, sub: payerLine(id), actions: reviewBtn('continued', id), body: note() });
    const has = CS.has(id); const drafted = has && CS.drafted(id);
    const units = '<section class="card" data-psy="dm5-units">' + CS.unitsHtml(id) + '</section>';
    if (!drafted) {
      const prep = has ? 'Not started' : 'Nothing to prepare';
      const body = '<div class="dm5">' + note() + '<div class="dm5-g"><div class="dm5-col"><section class="card"><div class="dm5-st"><span><span class="k">Status</span>' + A().badge(st) + '</span><span class="sp"></span>' + reviewBtn('continued', id, has ? 'Prepare in Lauris' : 'Review in Lauris', 'review-in-lauris-card') + '</div><p class="dm5-empty" style="margin:10px 0 0">' + esc(prep) + '</p></section>' + units + '</div><div class="dm5-col">' + timelineCard(id) + '</div></div></div>';
      return PSY.platform.page({ active: 'auth', title: esc(title), crumbs, sub: payerLine(id), actions: reviewBtn('continued', id, has ? 'Prepare in Lauris' : 'Review in Lauris'), body });
    }
    const M = CS.model(id); const P = CS.progress(id); const fs = M.fs;
    const stLabel = st === 'review' && fs.sent ? 'Waiting for signature in Forms to Approve' : st === 'review' ? 'Draft ready for review' : null;
    const status = '<section class="card" data-psy="dm5-status"><div class="dm5-st"><span><span class="k">Status</span>' + A().badge(st, stLabel) + '</span><span><span class="k">Review</span>' + P.nAcc + ' of ' + P.total + ' sections accepted</span><span><span class="k">Clinical input</span>' + P.nIn + ' of ' + P.nReq + ' added</span><span class="sp"></span></div></section>';
    const draft = '<section class="card" data-psy="dm5-draft"><h2>' + esc(M.form) + '</h2><div class="dm5-empty" style="margin:-4px 0 12px">DMAS form, Dec 2021 · ' + M.sections.length + ' sections</div>' + CS.sectionsHtml(id, { ro: true }) + '</section>';
    const miss = '<section class="card" data-psy="dm5-missing"><h2>Missing clinical information</h2>' + M.missing.map((m) => '<div class="dm5-mi"><div class="h">' + (m.added ? EV().label('clin', 'Added by clinician') : EV().label('need')) + '<b>' + esc(m.title) + '</b><span class="dm5-empty">' + (m.required ? 'required' : 'optional') + ' · section ' + m.secN + '</span></div>' + (m.added ? '<div class="t">' + esc(m.added.text) + '</div>' : '') + '</div>').join('') + '</section>';
    const body = '<div class="dm5">' + note() + '<div class="dm5-g"><div class="dm5-col">' + status + units + draft + '</div><div class="dm5-col">' + miss + timelineCard(id) + '</div></div></div>';
    return PSY.platform.page({ active: 'auth', title: esc(title), crumbs, sub: payerLine(id), actions: reviewBtn('continued', id), body });
  }

  /* ---------------------------------------------------------------- initial SRA */
  function initialModel(id) {
    const fl = PSY.flows && PSY.flows.initial;
    if (fl && typeof fl.mirror === 'function') { try { const m = fl.mirror(id); if (m && m.sections) return m; } catch (e) { console.error('initial mirror', e); } }
    const h = hub(id); const st = A().status(id); const signed = ['ready', 'submitted', 'pending', 'approved', 'partial', 'denied', 'info'].indexOf(st) >= 0;
    return {
      form: (h.draftMeta || {}).title || 'TDT (H2016) Initial Service Authorization Request', formSub: (h.draftMeta || {}).form || '',
      sections: (h.draft || []).map((d, i) => ({ n: i + 1, t: d.title, label: d.blank ? 'need' : signed ? 'reviewed' : i === 0 ? 'ehr' : 'ai', text: d.text || '', list: d.list || null, table: d.table || null, cites: d.src || [] })),
      missing: (h.draft || []).filter((d) => d.blank).map((d) => ({ title: d.title, why: d.text })),
    };
  }
  function secHtml(id, s) {
    let body = '';
    if (s.html) body += '<div class="dm5-tx">' + s.html + '</div>';
    else if (s.text) body += '<div class="dm5-tx">' + String(s.text).split('\n').map((p) => '<p>' + esc(p) + '</p>').join('') + '</div>';
    if (s.list) body += '<div class="dm5-tx"><ul>' + s.list.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    if (s.table) body += '<table class="dm5-tb"><thead><tr>' + s.table.head.map((x) => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' + s.table.rows.map((r) => '<tr>' + r.map((x) => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
    const src = (s.cites || []).length ? '<div class="dm5-src"><span>Sources</span>' + s.cites.map((l) => EV().cite(l, id)).join(' ') + '</div>' : '';
    return '<article class="dm5-sec k-' + esc(s.label || 'ai') + '"><div class="dm5-sh"><span class="dm5-n">' + s.n + '</span><h4>' + esc(s.t) + '</h4>' + lab(s.label || 'ai') + '</div>' + body + src + '</article>';
  }
  function initialPage(id) {
    const c = PSY.caseView(id); const st = A().status(id);
    const title = 'Initial SRA · ' + c.ini + ', ' + c.age; const crumbs = crumbsOf(id);
    if (!A().visible(id)) {
      const body = '<div class="dm5">' + note() + '<section class="card"><div class="dm5-st"><span><span class="k">Status</span><span class="st5 t-gray"><i aria-hidden="true">○</i>Not requested yet</span></span><span class="sp"></span><button class="btn o" data-go="lauris-consumer?c=' + esc(A().meta(id).laurisId || '') + '">Open in Lauris</button></div></section></div>';
      return PSY.platform.page({ active: 'auth', title: esc(title), crumbs, sub: payerLine(id), actions: reviewBtn('initial', id), body });
    }
    const M = initialModel(id);
    const status = '<section class="card" data-psy="dm5-status"><div class="dm5-st"><span><span class="k">Status</span>' + A().badge(st) + '</span>' + (M.progress ? '<span><span class="k">Review</span>' + esc(M.progress) + '</span>' : '') + '<span class="sp"></span></div></section>';
    const draft = '<section class="card" data-psy="dm5-draft"><h2>' + esc(M.form || 'Initial SRA') + '</h2>' + (M.formSub ? '<div class="dm5-empty" style="margin:-4px 0 12px">' + esc(M.formSub) + '</div>' : '') + M.sections.map((s) => secHtml(id, s)).join('') + '</section>';
    const units = PSY.cs5 ? '<section class="card" data-psy="dm5-units">' + PSY.cs5.unitsHtml(id) + '</section>' : '';
    const miss = '<section class="card" data-psy="dm5-missing"><h2>Clinical input</h2>' + ((M.missing || []).length ? M.missing.map((m) => '<div class="dm5-mi"><div class="h">' + (m.added ? EV().label('clin', 'Added by clinician') : EV().label('need')) + '<b>' + esc(m.title) + '</b></div>' + (m.added && m.added.text ? '<div class="t">' + esc(m.added.text) + '</div>' : '') + '</div>').join('') : '<div class="dm5-empty">Nothing waiting</div>') + '</section>';
    const body = '<div class="dm5">' + note() + '<div class="dm5-g"><div class="dm5-col">' + status + units + draft + '</div><div class="dm5-col">' + miss + timelineCard(id) + '</div></div></div>';
    return PSY.platform.page({ active: 'auth', title: esc(title), crumbs, sub: payerLine(id), actions: reviewBtn('initial', id), body });
  }


  const idOf = (params, dflt) => { const id = params && params.case; return id && PSY.caseById(id) ? id : dflt; };
  PSY.register({
    id: 'draft-initial', kind: 'web', nav: 'auth', label: 'Initial SRA', url: (p) => 'authorizations/' + idOf(p, 'R-0416') + '/draft',
    get css() { return css + cs5Css(); },
    render(params) { const id = idOf(params, 'R-0416'); const bl = PSY.p1.blocked(id); return bl ? PSY.p1.noAccess(id, bl) : initialPage(id); },
  });
  PSY.register({
    id: 'draft-continued', kind: 'web', nav: 'auth', label: 'Concurrent SRA', url: (p) => 'authorizations/' + idOf(p, 'R-0411') + '/draft',
    get css() { return css + cs5Css(); },
    render(params) { const id = idOf(params, 'R-0411'); const bl = PSY.p1.blocked(id); if (bl) return PSY.p1.noAccess(id, bl); return A().meta(id).kind === 'continued' ? continuedPage(id) : initialPage(id); },
  });
})();
