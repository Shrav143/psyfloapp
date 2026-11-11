import { register, Screen, session, go, modal, toast } from '../app.js';
import { homeFor } from '../registry.js';

const ROLE_USER = { direct_support: 'khale', clinician: 'jperez', supervisor: 'cdiaz', admin: 'dowens' };

register('Login', class extends Screen {
  init() { this.state = { email: (session.user?.id || 'jperez') + '@harvestoutreach.org', err: '' }; }
  user() { const id = this.state.email.split('@')[0].trim().toLowerCase(); return this.s.staff.find(s => s.id === id); }
  renderVals() {
    const u = this.user(); const role = u?.role;
    const pick = r => () => this.setState({ email: ROLE_USER[r] + '@harvestoutreach.org', err: '' });
    const on = r => role === r ? ' on' : '';
    return {
      email: this.state.email, err: this.state.err,
      setEmail: e => { this.state.email = e.target.value; },
      on_direct_support: on('direct_support'), on_clinician: on('clinician'), on_supervisor: on('supervisor'), on_admin: on('admin'),
      pickDS: pick('direct_support'), pickCL: pick('clinician'), pickSV: pick('supervisor'), pickAD: pick('admin')
    };
  }
  signIn(u) {
    if (!u) { this.setState({ err: 'No user with that email' }); return; }
    session.signIn(u.id);
    toast(`Signed in as ${u.name}`);
    go(this.params.next && this.params.next !== 'Login' ? this.params.next : homeFor(u.role, innerWidth < 600));
  }
  get anchors() {
    return {
      signin: () => this.signIn(this.user()),
      // portals have no staff login: families arrive by a texted link, schools by their own school login
      family: () => { const fl = this.s.family_links.find(f => f.referral === 'REF-118'); if (fl) location.href = '/parent/' + fl.token + '/ParentPortal'; else go('ParentPortal'); },
      counselor: () => { session.setSchoolUser('rbell'); go('SchoolPortal'); },
      sso: () => modal(`<h2>Sign in with Google Workspace</h2><p>Stub of Harvest's Google sign-in. Choose an account:</p><div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">${this.s.staff.map(s => `<button class="mbtn" data-u="${s.id}">${s.name} · ${s.id}@harvestoutreach.org</button>`).join('')}</div><button class="mbtn" data-close>Cancel</button>`,
        (box, close) => box.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { close(); this.signIn(this.s.staff.find(s => s.id === b.dataset.u)); })),
      forgot: () => modal(`<h2>Forgot password</h2><p>A reset link would go to <b>${this.state.email}</b>. In the demo, email is a stub: nothing is sent.</p><button class="mbtn p" data-close>OK</button>`)
    };
  }
  set anchors(v) { }
});
