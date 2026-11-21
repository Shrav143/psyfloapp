// Analytics (E4). Two things live here:
//  1. `projection`: state.analytics_agg is a DERIVED key. When /api/state is read, the server computes the case-backed aggregates that need data a
//     role may not receive (diagnoses, goals, note text, drafts and timestamps) from the FULL state and returns only panels whose small groups
//     are already suppressed (web/js/shared/analytics/casebacked.js digest). Nothing is stored; the stored value is {}. Direct support, guardians
//     and school users get {}.
//  2. `analytics.exported`: an audit row when a person exports a report (the file itself is built in the browser from what is on screen).
import { can } from '../../../web/js/shared/permissions.js';
import { digest } from '../../../web/js/shared/analytics/casebacked.js';
import { SECTION_IDS, PROV, PERIOD_IDS } from '../../../web/js/shared/analytics/common.js';
import { refuse } from '../gates.js';
import { store } from '../store.js';

// an older data folder has no analytics_agg key yet: the projection only visits keys the state holds
if (store.state && !('analytics_agg' in store.state)) store.state.analytics_agg = {};

// the digest depends only on the state (its revision) and who asks; cache it per revision so a burst of reads costs one computation
const memo = new WeakMap();
function cached(s, actor) {
  let m = memo.get(s); if (!m || m.rev !== s.rev || m.date !== (s.clock && s.clock.date)) { m = { rev: s.rev, date: s.clock && s.clock.date, v: new Map() }; memo.set(s, m); }
  const key = [actor.id, actor.role, JSON.stringify(actor.sites || null), (actor.designations || []).join(',')].join('|');
  if (!m.v.has(key)) m.v.set(key, digest(s, actor));
  return m.v.get(key);
}

export const projection = {
  analytics_agg: { direct_support: false, guardian: false, school: false, default: (s, actor) => (actor && actor.kind === 'staff' && can(actor, 'analytics.aggregate') ? cached(s, actor) : {}) }
};

export const authz = {
  'analytics.exported': { any: ['analytics.aggregate'] }
};

export default {
  'analytics.exported'(s, { section, dataset, format, period }) {
    if (!['csv', 'pdf'].includes(format)) refuse('An export is a CSV or a PDF.', { status: 422, audit: false });
    if (![PROV.CASE, PROV.COHORT, 'all'].includes(dataset)) refuse('Unknown dataset.', { status: 422, audit: false });
    if (section !== 'all' && !SECTION_IDS.includes(section)) refuse('Unknown section.', { status: 422, audit: false });
    const who = this.who();
    this.event(`Analytics report exported · ${section === 'all' ? 'all sections' : section} · ${dataset === PROV.CASE ? 'case-backed' : 'illustrative cohort'} · ${PERIOD_IDS.includes(period) ? period : 'period'} · ${format.toUpperCase()}`, who, 'analytics', { actor_kind: 'person' });
    return { ok: true };
  }
};
