/* Lauris Online roster: the consumers (children) and their authorizations as Lauris shows them.
   Shared by every Lauris screen. Fictional: initials only, no Medicaid IDs. Units are demo values.
   Each consumer's `case` is the Psyflo case id (PSY.data.cases) when the child has one. */
(function () {
  const PSY = window.PSY;
  const L = (PSY.data.lauris = PSY.data.lauris || {});
  L.staff = { jp: { name: 'Jordan Perez, LPC', short: 'J. Perez' }, so: { name: 'Sam Ortiz, LCSW', short: 'S. Ortiz' }, kh: { name: 'Kayla Hale', short: 'K. Hale', dss: true } };
  /* round 9 caseloads: staff = the licensed clinician on the consumer's Case Load; dsp = the direct support staff assigned (PSY.caseload) */
  L.groups = { 'campbell-es1': 'TDT – Campbell ES-1', 'campbell-hs1': 'TDT – Campbell HS-1', 'campbell-ms1': 'TDT – Campbell MS-1', 'lynch-ms2': 'TDT – Lynchburg MS-2', 'lynch-es3': 'TDT – Lynchburg ES-3' };

  /* units: the units available on the current authorization (null = no authorization on file). ends: authorization end date. */
  L.consumers = [
    { id: '4492', ini: 'T.W.', age: 12, case: 'R-0416', group: 'TDT – Lynchburg MS-2', staff: 'J. Perez', updated: '10/29/2026', units: null, school: 'Lynchburg City · MS-2', note: 'New. Intake 10/20, plan 10/21. Initial SRA not yet signed.' },
    { id: '4471', ini: 'M.R.', age: 7, case: 'R-0411', group: 'TDT – Campbell ES-1', staff: 'J. Perez', dsp: ['K. Hale'], updated: '10/29/2026', units: 27, ends: '11/13/2026', payer: 'anthem', auth: 'AUTH-4471-B', school: 'Campbell County · ES-1' },
    { id: '4466', ini: 'K.T.', age: 9, case: 'R-0408', group: 'TDT – Lynchburg MS-2', staff: 'J. Perez', updated: '10/28/2026', units: null, school: 'Lynchburg City · MS-2', note: 'Initial SRA sent; the payer asked for more information.' },
    { id: '4458', ini: 'D.W.', age: 14, case: 'R-0402', group: 'TDT – Campbell HS-1', staff: 'J. Perez', updated: '10/29/2026', units: 18, ends: '11/06/2026', payer: 'sentara', auth: 'AUTH-4458-C', school: 'Campbell County · HS-1' },
    { id: '4455', ini: 'A.L.', age: 6, case: 'R-0399', group: 'TDT – Lynchburg ES-3', staff: 'J. Perez', updated: '10/27/2026', units: null, school: 'Lynchburg City · ES-3', note: 'Initial SRA faxed 10/19; decision overdue.' },
    { id: '4449', ini: 'J.O.', age: 14, case: 'R-0391', group: 'TDT – Lynchburg MS-2', staff: 'J. Perez', updated: '10/29/2026', units: null, school: 'Lynchburg City · MS-2', note: 'SRA used up in 7 weeks; new initial under review.' },
    { id: '4441', ini: 'T.N.', age: 8, case: 'R-0388', group: 'TDT – Campbell ES-1', staff: 'J. Perez', dsp: ['K. Hale'], updated: '10/29/2026', units: 9, ends: '11/20/2026', payer: 'sentara', auth: 'AUTH-4441-A', school: 'Campbell County · ES-1' },
    { id: '4437', ini: 'E.C.', age: 5, case: 'R-0384', group: 'TDT – Lynchburg ES-3', staff: 'J. Perez', updated: '10/22/2026', units: null, school: 'Lynchburg City · ES-3', note: 'Initial SRA denied 10/22.' },
    { id: '4430', ini: 'S.B.', age: 11, case: 'R-0395', group: 'TDT – Campbell MS-1', staff: 'J. Perez', updated: '10/29/2026', units: 14, ends: '11/05/2026', payer: 'uhc', auth: 'AUTH-4430-D', school: 'Campbell County · MS-1' },
    { id: '4426', ini: 'L.V.', age: 16, case: 'R-0380', group: 'TDT – Campbell HS-1', staff: 'S. Ortiz', updated: '10/28/2026', units: 38, ends: '12/08/2026', payer: 'humana', auth: 'AUTH-4426-A', school: 'Campbell County · HS-1' },
    { id: '4419', ini: 'P.G.', age: 10, case: 'R-0377', group: 'TDT – Lynchburg MS-2', staff: 'S. Ortiz', updated: '10/27/2026', units: 19, ends: '12/15/2026', payer: 'aetna', auth: 'AUTH-4419-A', school: 'Lynchburg City · MS-2' },
  ];
  L.byId = (id) => L.consumers.find((c) => c.id === id) || null;
  L.byCase = (cid) => L.consumers.find((c) => c.case === cid) || null;
  L.byIni = (ini) => L.consumers.find((c) => c.ini === ini) || null;
  /* units available for a consumer, after any "units used today" the extension confirmed */
  /* round 9 (§15): an authorization approved later in the demo (e.g. an appeal overturned in Denial Intelligence) shows in Lauris too */
  L.newAuthUnits = (c) => {
    if (!c.case || !PSY.auth || !PSY.auth.status || PSY.auth.status(c.case) !== 'approved') return null;
    const st = (PSY.state.cases || {})[c.case] || {}; const m = PSY.auth.meta ? PSY.auth.meta(c.case) : {};
    const n = st.approved5 != null ? st.approved5 : (m.request || {}).units; return n != null ? n : null;
  };
  L.units = (c) => (c.units == null ? L.newAuthUnits(c) : Math.max(0, c.units + (PSY.auth && PSY.auth.bonus && c.case ? PSY.auth.bonus(c.case) : 0) - (((PSY.state.boxes || {})['units-used.' + c.id]) || 0)));
  L.unitsLabel = (c) => { const u = L.units(c); return u == null ? 'No authorizations available' : u + ' units available'; };
})();
