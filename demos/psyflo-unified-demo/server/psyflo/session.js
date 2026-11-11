// DEMO-GRADE sessions and actors (no identity provider, no passwords; labelled as such in the UI and the notes).
//
// POST /api/session {staffId, presenter?, pin?}            -> staff session
//                   {portalToken}                          -> guardian (family link token) or school user (school token)
//                   {portalClient, presenter:true}         -> presenter views the guardian portal of a child
//                   {schoolUser, presenter:true}           -> presenter views the school portal as a school user
//                   {signOut:true} + token                 -> ends the session
// The token travels in the X-Psyflo-Session header (or Authorization: Bearer, or the psyflo_session cookie for file links).
// Every /api/do and /api/state call resolves the ACTOR from the token against the CURRENT state, so a role change or a removed
// user takes effect on the next call. An unknown or missing token has no actor: deny (401), except the explicit allow-lists
// in authz.js (portal-token actions, bridge-side calls).
// Presenter mode (demo.controls) needs presenter:true on sign-in AND DEMO_PRESENTER not set to 0; PRESENTER_PIN, if set, must match.
import crypto from 'node:crypto';
import { caseloadOf } from './gates.js';

const sessions = new Map(); // token -> { kind, staffId?, client?, linkToken?, schoolUserId?, presenter, at }

export const presenterEnabled = () => process.env.DEMO_PRESENTER !== '0';

export function tokenFrom(req) {
  const h = req.headers || {};
  if (h['x-psyflo-session']) return String(h['x-psyflo-session']);
  const a = h.authorization || ''; if (/^bearer /i.test(a)) return a.slice(7).trim();
  const m = (h.cookie || '').match(/(?:^|;\s*)psyflo_session=([^;]+)/); if (m) return decodeURIComponent(m[1]);
  try { const q = new URL(req.url, 'http://x').searchParams.get('t'); if (q) return q; } catch { }
  return null;
}

export function signOut(token) { return sessions.delete(token); }
export function clearSessions() { sessions.clear(); }

// create a session; returns { token, actor } or throws { status, message }
export function createSession(s, body = {}, { env = process.env } = {}) {
  const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
  let wantPresenter = body.presenter === true;
  if (wantPresenter) {
    if (!presenterEnabled()) wantPresenter = false;
    else if (env.PRESENTER_PIN && String(body.pin || '') !== env.PRESENTER_PIN) fail(403, 'Presenter PIN required');
  }
  const mint = rec => { const token = crypto.randomBytes(18).toString('base64url'); sessions.set(token, { ...rec, presenter: !!rec.presenter, at: Date.now() }); return token; };
  if (body.staffId) {
    const st = (s.staff || []).find(x => x.id === body.staffId);
    if (!st) fail(401, 'Unknown user');
    const token = mint({ kind: 'staff', staffId: st.id, presenter: wantPresenter });
    return { token, actor: actorFor(s, sessions.get(token)) };
  }
  if (body.portalToken) {
    const t = String(body.portalToken);
    const fl = (s.family_links || []).find(f => f.token === t);
    if (fl) { const token = mint({ kind: 'guardian', client: fl.client, linkToken: t }); return { token, actor: actorFor(s, sessions.get(token)) }; }
    const su = (s.school_users || []).find(u => u.token === t);
    if (su) { const token = mint({ kind: 'school', schoolUserId: su.id }); return { token, actor: actorFor(s, sessions.get(token)) }; }
    fail(401, 'This link is not valid any more');
  }
  if (body.portalClient) {
    if (!wantPresenter) fail(403, 'Open the family link from the text message');
    const c = (s.clients || []).find(x => x.id === body.portalClient); if (!c) fail(404, 'Unknown child');
    const fl = (s.family_links || []).find(f => f.client === c.id);
    const token = mint({ kind: 'guardian', client: c.id, linkToken: fl && fl.token, presenter: true });
    return { token, actor: actorFor(s, sessions.get(token)) };
  }
  if (body.schoolUser) {
    if (!wantPresenter) fail(403, 'Open the school portal from the school link');
    const su = (s.school_users || []).find(u => u.id === body.schoolUser); if (!su) fail(404, 'Unknown school user');
    const token = mint({ kind: 'school', schoolUserId: su.id, presenter: true });
    return { token, actor: actorFor(s, sessions.get(token)) };
  }
  fail(400, 'Say who is signing in');
}

// the actor for a token, built from the CURRENT state; null when there is none
export function actorFromToken(s, token) {
  if (!token) return null;
  const rec = sessions.get(token);
  if (!rec) return null;
  return actorFor(s, rec);
}
export function actorFor(s, rec) {
  if (rec.kind === 'staff') {
    const st = (s.staff || []).find(x => x.id === rec.staffId);
    if (!st) return null;
    const a = { kind: 'staff', id: st.id, role: st.role, name: st.name, credential: st.credential || '', designations: st.designations || [], sites: st.sites, presenter: !!rec.presenter && presenterEnabled(), staff: st };
    a.caseload = caseloadOf(s, a);
    return a;
  }
  if (rec.kind === 'guardian') {
    const c = (s.clients || []).find(x => x.id === rec.client);
    const fl = (s.family_links || []).find(f => f.token === rec.linkToken) || (s.family_links || []).find(f => f.client === rec.client);
    return { kind: 'guardian', id: 'guardian:' + rec.client, role: 'guardian', client: rec.client, linkToken: rec.linkToken, name: (fl && fl.answers && fl.answers.guardian_name) || (c && c.guardian && c.guardian.name) || 'Guardian', presenter: !!rec.presenter && presenterEnabled(), designations: [] };
  }
  if (rec.kind === 'school') {
    const u = (s.school_users || []).find(x => x.id === rec.schoolUserId);
    if (!u) return null;
    return { kind: 'school', id: 'school:' + u.id, role: 'school', userId: u.id, school: u.school, name: u.name, presenter: !!rec.presenter && presenterEnabled(), designations: [] };
  }
  return null;
}

// what the client is told about the actor (never the staff record's private fields)
export function publicActor(a) {
  if (!a) return null;
  return { kind: a.kind, id: a.id, role: a.role, name: a.name, credential: a.credential || '', presenter: !!a.presenter, designations: a.designations || [],
    client: a.client || null, school: a.school || null, userId: a.userId || null, sites: a.sites || null };
}
