// Normalise volatile values so two states can be compared (review/06b section 4.7): timestamps, generated ids and tokens, fax references,
// Lauris session ids and file names are replaced by placeholders; arrays keep their order (events are an ordered trail).
const vol = s => String(s)
  .replace(/\b(F|AV|UHC)-\d{3,6}\b/g, '$1-#').replace(/\b(tw|fl)-[a-z0-9]{4,8}\b/g, '$1-#').replace(/session \d+/g, 'session #').replace(/\b[a-z0-9]{8,14}__/g, '#__')
  .replace(/\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d)?/g, 'T#').replace(/\b(9|1\d)\d{3}\b/g, m => m);
export function normState(s, { client = 'TW', request = 'R-0416', referral = 'REF-118' } = {}) {
  const c = s.clients.find(x => x.id === client) || {};
  const r = s.requests.find(x => x.id === request) || null;
  const ref = s.referrals.find(x => x.id === referral) || {};
  const sc = (s.screenings || []).find(x => x.client === client) || null;
  const el = (s.eligibility || []).find(x => x.referral === referral) || null;
  return {
    client: { stage: c.stage, lauris_no: c.lauris_no, goals: (c.goals || []).length, diagnosis: !!c.diagnosis, timeline: Object.keys(c.timeline || {}).sort() },
    referral: { stage: ref.stage, next: ref.next, eligibility: ref.eligibility },
    eligibility: el && { status: el.status, result: el.result, plan: el.plan },
    screening: sc && { status: sc.status, boxes: (sc.boxes || []).length, facts: Object.keys(sc.facts || {}).length },
    request: r && { stage: r.stage, type: r.type, payer: r.payer, approved_by: r.approved_by || null, signed_by: r.signed_by || null, sent_by: r.sent_by || null, has_pdf: !!r.signed_pdf, fax: r.fax_ref ? 'F-#' : null, decision_basis: r.decision_basis && r.decision_basis.rule, limit_30_basis: r.limit_30_basis && { event: r.limit_30_basis.start_event, fallback: r.limit_30_basis.fallback } },
    events: (s.events || []).filter(e => [referral, client, request].includes(e.record)).map(e => `${e.actor_kind}${e.sim ? '*' : ''}:${vol(e.what)}`)
  };
}
