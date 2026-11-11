// Sign in (route Login). Four role cards (the person for a role comes from the public roster), plus the family portal and the school
// counselor entries. Sessions are server-side (api.signIn); this is demo-grade identity: no password and no identity provider.
// Nothing here pre-fills a person: the card for the signed-in role is marked, every other card starts on its first person.
import { register, Screen, session, go, raw, ui, esc } from '../app.js';
import { homeTarget } from '../registry.js';

const ROLES = [
  ['direct_support', 'Direct support', 'My day, notes and time. The extension and the phone.'],
  ['supervisor', 'Supervisor', 'Notes to review, the team, units.'],
  ['clinician', 'Clinician', 'Requests, payer replies, referrals.'],
  ['admin', 'Admin', 'Operations and settings. No clinical text.']
];

register('Login', class extends Screen {
  init() { this.state = { err: '', busy: false, pick: {} }; }
  roster() { return ((this.s && this.s.staff) || []).filter(x => x && x.id && x.role); }
  renderVals() {
    const staff = this.roster(); const cur = session.user;
    const cards = ROLES.map(([role, label, line]) => {
      const people = staff.filter(x => x.role === role);
      if (!people.length) return '';
      const chosen = this.state.pick[role] || (cur && cur.role === role ? cur.id : people[0].id);
      const sel = people.length > 1 ? `<div class="lg-sel"><label for="lg-${role}">Person</label><select class="ui-select" id="lg-${role}" data-role="${role}">${people.map(p => `<option value="${esc(p.id)}"${p.id === chosen ? ' selected' : ''}>${esc(p.name)}${p.credential ? ' · ' + esc(p.credential) : ''}</option>`).join('')}</select></div>` : `<p>${esc(people[0].name)}${people[0].credential ? ' · ' + esc(people[0].credential) : ''}</p>`;
      return `<li class="lg-role"${cur && cur.role === role ? ' aria-current="true"' : ''}><h2>${esc(label)}</h2><p>${esc(line)}</p>${sel}<button type="button" class="ui-btn ui-btn--primary" data-signin="${role}"${this.state.busy ? ' disabled' : ''}>Sign in</button></li>`;
    }).join('');
    return { cards: raw(cards || `<li>${ui.emptyState({ tone: 'error', title: 'No staff to sign in', body: 'The roster did not load. Reload the page.' })}</li>`), err: this.state.err };
  }
  after(root) {
    root.querySelectorAll('select[data-role]').forEach(el => { el.onchange = () => { this.state.pick[el.dataset.role] = el.value; }; });
    root.querySelectorAll('[data-signin]').forEach(b => { b.onclick = () => { const role = b.dataset.signin; const sel = root.querySelector(`select[data-role="${role}"]`); const id = sel ? sel.value : (this.roster().find(x => x.role === role) || {}).id; this.signIn(id); }; });
  }
  async signIn(id) {
    const u = this.roster().find(x => x.id === id);
    if (!u) { this.setState({ err: 'Choose a person.' }); return; }
    this.state.busy = true; this.state.err = '';
    try { await session.signIn(id); }
    catch (e) { this.setState({ busy: false, err: e.message || 'Sign-in failed. Try again.' }); return; }
    const next = this.params.next && this.params.next !== 'Login' ? this.params.next : null;
    const h = homeTarget(u.role, innerWidth < 600);
    if (next) go(next); else go(h.id, h.params);
  }
  // portals have no staff login: families arrive by a texted link, schools by their own school login
  get anchors() {
    return {
      family: () => go('ParentPortal'),
      counselor: () => { session.setSchoolUser('rbell'); go('SchoolPortal'); }
    };
  }
  set anchors(v) { }
});
