// The rail, as data. Change the nav by editing this file; app.js only renders it.
// Rail: patient-first (feedback round Nov 11, R4). Dashboard is the patient roster every role starts from and, as its Documents view, the notes,
// intake forms and CNAs queue (owed whether or not there is an authorization): one item, one name; Authorizations, Denial Intelligence and
// Analytics follow; below a divider two small links, Referrals and Settings. The logo opens the Dashboard.
// Role decides what shows: an item appears only when the user may open the route it actually points at.
//
// Item: { id, label, icon, route, params?, fallback?, fallbackParams?, activeFor?:[routeIds], count?:'authNeeds'|'denialsOpen'|'referralsNew' }
//   route     the canonical route
//   fallback  the OLD route to use while `route` is not live (ROUTES_LIVE in redirects-live.js). No fallback + not live = the item is hidden.
//   activeFor other route ids that light this item up (a case opened from the queue keeps its tab lit)
//   count     a key of COUNTS below; shown only when > 0 (counts only where meaningful), with a screen-reader sentence
import { isLive, resolveRoute } from '../registry.js';
import { STATUS } from '../ui/chip.js';

export const NAV = {
  logo: { id: 'dashboard-logo', label: 'Dashboard', route: 'Dashboard', fallback: 'MyWork', activeFor: [] },
  primary: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', route: 'Dashboard', fallback: 'MyWork', activeFor: ['Patient', 'MyWork', 'DoNext', 'StaffDashboard', 'Documentation', 'ReviewQueue'] },
    { id: 'authorizations', label: 'Authorizations', icon: 'list', route: 'Authorizations', activeFor: ['Authorization', 'Submission', 'EarlyDischarge'], count: 'authNeeds' },
    { id: 'denials', label: 'Denial Intelligence', icon: 'shield', route: 'DenialIntelligence', fallback: 'Partials', activeFor: ['DenialCase', 'InfoRequest', 'Partials', 'PeerBrief'], count: 'denialsOpen' },
    { id: 'analytics', label: 'Analytics', icon: 'bars', route: 'Analytics', activeFor: ['PayerPlaybook'] }
  ],
  secondary: [
    { id: 'referrals', label: 'Referrals', icon: 'inbox', route: 'Referrals', activeFor: ['Referral', 'Eligibility'], count: 'referralsNew' },
    { id: 'settings', label: 'Settings', icon: 'gear', route: 'Settings', fallback: 'Users', activeFor: ['Users'] }
  ]
};

const group = stage => (STATUS.stage[stage] || {}).group;
const DENIAL_STAGES = ['info_requested', 'partial_decide', 'peer_to_peer_requested', 'peer_to_peer_booked', 'p2p_awaiting', 'denied', 'appeal_sent'];
const OPEN_DISPUTE = d => !['closed', 'resolved', 'accepted', 'overturned', 'upheld', 'partover'].includes(d.status);
// counts: pure functions of the state (importable by tests)
export const COUNTS = {
  authNeeds: s => (s.requests || []).filter(r => group(r.stage) === 'needs').length,
  denialsOpen: s => Array.isArray(s.disputes) && s.disputes.length ? s.disputes.filter(OPEN_DISPUTE).length : (s.requests || []).filter(r => DENIAL_STAGES.includes(r.stage)).length,
  referralsNew: s => (s.referrals || []).filter(r => ['needs_screening', 'waiting_on_school'].includes(r.stage)).length
};
const COUNT_WORDS = { authNeeds: n => `${n} need action`, denialsOpen: n => `${n} open`, referralsNew: n => `${n} to review` };

// the route and params an item opens right now (live new route, else its fallback)
export function targetOf(item) {
  if (isLive(item.route)) return { id: item.route, params: item.params || {} };
  if (item.fallback) return { id: item.fallback, params: item.fallbackParams || {} };
  return null;
}
// which nav item is lit for a route id (follows activeFor and redirects' targets)
export function activeItem(routeId) {
  const all = [...NAV.primary, NAV.logo, ...NAV.secondary];   // the logo comes last so the Dashboard tab, not the logo, is the lit item
  return all.find(i => i.route === routeId || i.fallback === routeId || (i.activeFor || []).includes(routeId)) || null;
}

// visibleNav(user, { allowed(routeId) -> boolean, state, role }) -> { logo, primary:[…], secondary:[…] } with resolved targets and counts.
// `allowed` is routeAllowed(role, routeId, user) from shared/permissions.js (the same table the server uses; NAV_FOR is the
// equivalent list for the default candidates).
export function visibleNav(user, { allowed, state } = {}) {
  const ok = id => (allowed ? allowed(id) : true);
  const make = item => {
    const t = targetOf(item); if (!t || !ok(t.id)) return null;
    const n = item.count && state ? COUNTS[item.count](state) : 0;
    return { ...item, target: resolveRoute(t, { role: user && user.role }), count: n > 0 ? n : 0, countText: n > 0 ? COUNT_WORDS[item.count](n) : '' };
  };
  return { logo: make(NAV.logo) || { ...NAV.logo, target: { id: 'Login', params: {} } }, primary: NAV.primary.map(make).filter(Boolean), secondary: NAV.secondary.map(make).filter(Boolean) };
}
