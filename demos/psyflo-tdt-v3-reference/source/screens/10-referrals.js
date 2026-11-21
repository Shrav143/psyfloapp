/* New-case pipeline (round 8: data only). The New Cases pages are gone from the platform: referral, admission screening and intake
   live in Lauris and the extension. The routes 'referrals' and 'ref-review' redirect to Authorizations (PSY.REDIRECT).
   Pipeline: 1 Referral received → 2 Admission screening → 3 Intake scheduled → 4 Intake (CNA) → 5 Treatment plan (ISP)
     → 6 Ready for initial SRA (the case then shows in Authorizations).
   T.W. (REF-118, Lauris 4492) is driven by Lauris: PSY.flowRank() (screened → cna → isp). From isp on, T.W. is R-0416 in Authorizations.
   State read: PSY.state.referral[id] · boxes['p1.slot.<id>'] · PSY.state.newcase5[id] = { decision, elig, intake }.
   API (the extension's Cases view uses it for the mini case status):
     PSY.newCases = { STAGES, stageOf(ref), list(), active(), handedOff(), fundingOf(ref) } */
(function () {
  const PSY = window.PSY;
  const SLOT = 'Fri Oct 30, 2:00 pm'; // R.M.'s seeded screening call
  const slotOf = (r) => { const b = (PSY.state.boxes || {})['p1.slot.' + r.id]; return b ? String(b).replace(' · ', ', ') : SLOT; };
  const ncGet = (id) => (PSY.state.newcase5 || {})[id] || {};
  const refById = (id) => PSY.data.referrals.find((x) => x.id === id);

  const STAGES = [
    ['referral', 'Referral received'],
    ['screening', 'Admission screening'],
    ['intake-sched', 'Intake scheduled'],
    ['intake', 'Intake (CNA)'],
    ['isp', 'Treatment plan (ISP)'],
    ['ready', 'Ready for initial SRA'],
  ];
  const SIM = {
    'REF-121': { status: 'active', short: 'Medicaid active (simulated) · MCO to verify' },
    'REF-123': { status: 'none', short: 'Not confirmed · ask the guardian' },
  };
  /* what the school wrote about Medicaid on the referral */
  const MEDICAID = { 'REF-118': '“Yes” per the school', 'REF-121': '“Yes” per the school', 'REF-123': '“Not sure” per the school' };
  const lfOf = (form) => (PSY.state.lf || {})[form + '|4492'] || null;
  const lfStarted = (form) => { const s = lfOf(form); return !!(s && Object.keys(s.v || {}).length && !s.processed); };

  /* where a referral is in the pipeline */
  function stageOf(r) {
    const S = PSY.state, base = (S.referral || {})[r.id] || r.status, d = ncGet(r.id).decision, tw = r.id === 'REF-118', rank = tw ? PSY.flowRank() : 0;
    if (base === 'grant') return { key: 'grant', group: 'closed', label: 'Routed to the DOE grant program', short: 'DOE grant program', tone: 'gray', i: '■' };
    if (d && d.choice === 'notfit') return { key: 'closed', group: 'closed', label: 'Not appropriate for TDT · referred elsewhere', short: 'Referred elsewhere', tone: 'gray', i: '■' };
    if (tw && rank >= 3) return { key: 'ready', group: 'handoff', label: 'In Authorizations · R-0416', short: 'Authorization · R-0416', tone: 'green', i: '✓' };
    if (tw && rank === 2) return { key: 'isp', group: 'active', label: 'Treatment plan (ISP) next', tone: 'amber', i: '◔' };
    if (tw && rank === 1) return { key: 'intake-sched', group: 'active', label: 'Intake next · in person', tone: 'blue', i: '→' };
    if (d && d.choice === 'accept') { const it = ncGet(r.id).intake; return it ? { key: 'intake-sched', group: 'active', label: 'Intake scheduled · ' + it.at, short: 'Intake · ' + it.at.replace(/^\w+ /, ''), tone: 'blue', i: '→' } : { key: 'intake-sched', group: 'active', label: 'Accepted · schedule the intake', short: 'Accepted · book intake', tone: 'amber', i: '◔' }; }
    if (d && d.choice === 'info') return { key: 'screening', group: 'active', label: 'Screening · more information needed', short: 'More information needed', tone: 'amber', i: '?' };
    if (tw && lfStarted('adm')) return { key: 'screening', group: 'active', label: 'Screening in progress in Lauris', short: 'Screening in progress', tone: 'amber', i: '◔' };
    if (base === 'booked' || base === 'call-booked') return { key: 'screening', group: 'active', label: 'Call booked · ' + slotOf(r), short: 'Call booked · ' + slotOf(r).replace(/^\w+ /, '').replace(/,.*$/, ''), tone: 'blue', i: '…' };
    if (base === 'new') return { key: 'referral', group: 'active', label: 'New referral', tone: 'gray', i: '○' };
    return { key: 'referral', group: 'active', label: 'Needs screening call', tone: 'amber', i: '◔' };
  }

  /* funding path: Medicaid → TDT track · no Medicaid → DOE grant program · unsure → eligibility check */
  function fundingOf(r) {
    const base = (PSY.state.referral || {})[r.id] || r.status, ch = ncGet(r.id).elig;
    if (base === 'grant' || (ncGet(r.id).decision || {}).path === 'grant') return { key: 'grant', short: 'DOE grant program', tone: 'gray' };
    if (r.id === 'REF-118' && PSY.elig) {
      const e = PSY.elig.of('4492'); const pend = PSY.elig.pending('4492');
      return { key: 'tdt', short: 'TDT track · Medicaid active (' + (e ? e.plan.split(' ')[0] : 'checked') + ')' + (pend ? ' · payer change to confirm' : ''), tone: pend ? 'amber' : 'green', elig: e };
    }
    if (ch && SIM[r.id]) return ch.status === 'active' ? { key: 'tdt', short: 'TDT track · ' + SIM[r.id].short, tone: 'blue' } : { key: 'unsure', short: SIM[r.id].short, tone: 'amber' };
    if (/not sure/i.test(MEDICAID[r.id] || '')) return { key: 'unsure', short: 'Medicaid unsure · eligibility check needed', tone: 'amber' };
    return { key: 'tdt?', short: 'TDT track · eligibility not checked yet', tone: 'gray' };
  }

  /* the next step, in a few words */
  function nextOf(r, s) {
    const d = ncGet(r.id).decision, rank = r.id === 'REF-118' ? PSY.flowRank() : 0;
    switch (s.key) {
      case 'grant': return 'Send the grant enrollment pack';
      case 'closed': return 'Referred elsewhere: ' + (d ? d.reason : '');
      case 'ready': return 'Initial SRA ' + (PSY.auth ? PSY.auth.label(PSY.auth.status('R-0416')).toLowerCase() : 'in Authorizations');
      case 'isp': return 'Treatment plan (ISP) in Lauris';
      case 'intake-sched': return rank === 1 ? 'Intake and CNA in Lauris' : ncGet(r.id).intake ? 'Intake ' + ncGet(r.id).intake.at : 'Schedule the intake';
      case 'screening': return d && d.choice === 'info' ? 'More information needed: ' + d.reason : r.id === 'REF-118' && lfStarted('adm') ? 'Finish the Admission Screening in Lauris' : 'Screening call ' + slotOf(r);
      default: return r.id === 'REF-123' ? 'Check eligibility, then book the screening call' : 'Book the screening call';
    }
  }

  const NCAPI = (PSY.newCases = {});
  NCAPI.STAGES = STAGES;
  NCAPI.stageOf = (id) => { const r = refById(id); return r ? stageOf(r) : null; };
  NCAPI.fundingOf = (id) => { const r = refById(id); return r ? fundingOf(r) : null; };
  NCAPI.list = () => PSY.data.referrals.filter((r) => PSY.locOk(r)).map((r) => ({ id: r.id, who: r.who, stage: stageOf(r), funding: fundingOf(r), next: nextOf(r, stageOf(r)) }));
  NCAPI.active = () => NCAPI.list().filter((x) => x.stage.group === 'active');
  NCAPI.handedOff = () => NCAPI.list().filter((x) => x.stage.group === 'handoff');
  /* PSY.counts().ref follows the active pipeline (no platform tab shows it any more; kept for callers) */
  if (PSY.counts && !PSY.counts.__nc) {
    const baseCounts = PSY.counts;
    PSY.counts = () => { const c = baseCounts(); try { c.ref = NCAPI.active().length; } catch (e) {} return c; };
    PSY.counts.__nc = true;
  }
})();
