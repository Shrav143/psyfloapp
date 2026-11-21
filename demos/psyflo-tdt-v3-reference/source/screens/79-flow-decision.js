/* Round 9: the extension's payer-decision focus flow stays retired. A payer decision (partial, denied, info requested, reconsideration,
   appeal) is worked in Denial Intelligence: the case workspace di-case?case=<caseId> (51-denial-detail.js). This file keeps the old entry
   points pointing there: PSY.flows.decision (read by older extension code), a decision opened through PSY.ext.focus, and the act dx-open.
   A role without Denial Intelligence lands on the case in All Authorizations (PSY.openCase). */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const open = (cid) => (PSY.can('denials') ? PSY.go('di-case?case=' + cid) : PSY.openCase(cid));
  const attrs = (cid) => 'data-act="d9-open-di" data-case="' + esc(cid) + '"';
  PSY.flows = PSY.flows || {};
  PSY.flows.decision = {
    title: 'Payer decision',
    render: (cid) => '<div class="xf-empty"><button class="btn p s" ' + attrs(cid) + '>Open in Denial Intelligence ↗</button></div>',
    requirements: () => null,
    primary: (cid) => ({ label: 'Open in Denial Intelligence', attrs: attrs(cid) }),
    evidence: () => undefined,
    missing: () => undefined,
  };
  PSY.acts['d9-open-di'] = (el) => open(el.getAttribute('data-case'));
  /* a payer decision opened through the old focus entry point goes to its Denial Intelligence case */
  if (PSY.ext && typeof PSY.ext.focus === 'function' && !PSY.ext.focus.__d9) {
    const base = PSY.ext.focus;
    PSY.ext.focus = function (flow, cid) { if (flow === 'decision' && cid) return open(cid); return base.apply(this, arguments); };
    PSY.ext.focus.__d9 = true;
  }
  PSY.acts['dx-open'] = (el) => { const r = PSY.di && PSY.di.get(el.getAttribute('data-id')); if (r) open(r.case); };
})();
