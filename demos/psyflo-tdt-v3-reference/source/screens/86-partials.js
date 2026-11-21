/* Partial approvals and reductions offered by phone (D.W. · R-0402, Sentara 120 of 150; J.O. · R-0391, Aetna 110 of 150): the four doors
   (accept · add info · peer-to-peer · early discharge + new initial), named here (PSY.pt.CASES) for the decision options of the
   Denial Intelligence workspace (51-denial-detail.js: Options for this decision + Recommended next steps). Route `partials?case=` opens that
   workspace on its options (Denial Intelligence / <initials>). Historical notes are labelled as Harvest's observations (n = 1). */
(function () {
  const PSY = window.PSY;
  const D = () => PSY.di;
  const DEFAULT = 'R-0402';

  const CASES = {
    'R-0402': {
      who: 'D.W., 14', ini: 'D.W.', payerShort: 'Sentara', payerName: 'Sentara Community Plan', offered: 120, asked: 150,
      history: { text: 'Harvest’s September request for D.W. to Sentara: asked 150, offered 120. More evidence and a counter at 140 were sent; 110 were awarded.', source: 'D.W.’s request history (n = 1)' },
      doors: { 1: { name: 'Accept 120 units' }, 2: { name: 'Send more information' }, 3: { name: 'Ask for a peer-to-peer call' }, 4: { name: 'Use the units, discharge, start over' } },
      infoAction: 'a1',
    },
    'R-0391': {
      who: 'J.O., 14', ini: 'J.O.', payerShort: 'Aetna', payerName: 'Aetna Better Health of Virginia', offered: 110, asked: 150,
      history: { text: 'J.O.’s earlier authorization: 80 units used in 7 weeks, then discharged; this request is the new initial after the gap.', source: 'J.O.’s SRA (case record)' },
      doors: { 1: { name: 'Accept 110 units' }, 2: { name: 'Send more information' }, 3: { name: 'Ask for a peer-to-peer call' }, 4: { name: 'Use the units, discharge, start over' } },
      infoAction: null,
    },
  };
  PSY.pt = { CASES };

  const caseOf = (params) => { const id = params && params.case; return id && PSY.caseById(id) ? id : DEFAULT; };
  PSY.register({
    id: 'partials', kind: 'web', nav: 'di', label: 'Partial approval', url: (p) => 'denial-intelligence/' + caseOf(p) + '/options',
    tabTitle: (p) => 'Psyflo — ' + ((PSY.caseView(caseOf(p)) || {}).ini || 'Partial approval'),
    get css() { return PSY.dicase.css(); },
    render(params) { return PSY.dicase.workspace({ case: caseOf(params), sec: 'options', __p: params }); }, // its options: the What-the-payer-said section
    mount(root, ctx) { PSY.dicase.mountWs(root, ctx); },
  });

  /* older acts some captured screens still call: they open the case in Denial Intelligence */
  ['pt-accept', 'pt-info', 'pt-p2p', 'pt-discharge', 'pt-reopen'].forEach((k) => { PSY.acts[k] = (el) => PSY.go('di-case?case=' + (el.getAttribute('data-case') || DEFAULT)); });
})();
