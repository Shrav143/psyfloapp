// Sign in (route Login). One small card with one dropdown of the people on the public roster, grouped by role, and a Sign in button; the family
// portal and the school counselor entries are two quiet links underneath (round 4, Nov 12: "just a dropdown, not four big boxes").
// Sessions are server-side (api.signIn); this is demo-grade identity: no password and no identity provider. The person who is signed in is
// selected; otherwise the list starts on its first person (direct support), and nothing is signed in until the button is pressed.
import { register, Screen, session, go, raw, ui, esc } from '../app.js';
import { homeTarget } from '../registry.js';

const ROLES = [['direct_support', 'Direct support'], ['supervisor', 'Supervisor'], ['clinician', 'Clinician'], ['admin', 'Admin']];

register('Login', class extends Screen {
  init() { this.state = { err: '', busy: false, pick: '' }; }
  roster() { return ((this.s && this.s.staff) || []).filter(x => x && x.id && x.role); }
  renderVals() {
    const staff = this.roster(); const cur = session.user;
    const groups = ROLES.map(([role, label]) => ({ label, people: staff.filter(x => x.role === role) })).filter(g => g.people.length);
    const first = groups.length ? groups[0].people[0].id : '';
    const chosen = this.state.pick || (cur && staff.some(x => x.id === cur.id) ? cur.id : first);
    const opts = groups.map(g => `<optgroup label="${esc(g.label)}">${g.people.map(p => `<option value="${esc(p.id)}"${p.id === chosen ? ' selected' : ''}>${esc(p.name)}${p.credential ? ' · ' + esc(p.credential) : ''}</option>`).join('')}</optgroup>`).join('');
    const form = groups.length
      ? `<div class="lg-sel"><label for="lg-person">Who are you?</label><select class="ui-select" id="lg-person">${opts}</select></div><button type="button" class="ui-btn ui-btn--primary" data-signin="go"${this.state.busy ? ' disabled' : ''}>Sign in</button>`
      : ui.emptyState({ tone: 'error', title: 'No staff to sign in', body: 'The roster did not load. Reload the page.' });
    return { form: raw(form), err: this.state.err };
  }
  after(root) {
    const sel = root.querySelector('#lg-person');
    if (sel) { sel.onchange = () => { this.state.pick = sel.value; }; sel.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); this.signIn(sel.value); } }; }
    const b = root.querySelector('[data-signin]'); if (b) b.onclick = () => this.signIn(sel ? sel.value : '');
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
