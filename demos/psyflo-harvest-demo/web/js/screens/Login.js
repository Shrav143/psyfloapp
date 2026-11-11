import { register, Screen, session, go, modal, toast } from '../app.js';
import { homeFor } from '../registry.js';

const ROLE_USER = { direct_support: 'khale', clinician: 'jperez', supervisor: 'cdiaz', admin: 'dowens' };

register('Login', class extends Screen {
  init() { this.state = { email: (session.user?.id || 'jperez') + '@harvestoutreach.org', err: '' }; }
  prepare(t) {
    return t
      .replace('min-height:760px;width:100%', 'min-height:calc(100vh - 48px);width:100%')
      .replace(/<input class="in" style="([^"]*)" value="jperez@harvestoutreach.org">/, '<input class="in" id="email" autocomplete="username" style="$1" value="{{email}}" onInput="{{setEmail}}">')
      .replace(/<input class="in" type="password" style="([^"]*)" value="[^"]*">/, '<input class="in" id="pw" type="password" autocomplete="current-password" style="$1" value="demo-password">')
      .replace('<a class="btn p" href="DoNext.dc.html" style="min-height:48px">Sign in</a>', '<a class="btn p" href="#signin" style="min-height:48px">Sign in</a><sc-if value="{{err}}"><div role="alert" style="color:#8A2E1C;font-size:13px">{{err}}</div></sc-if>')
      .replace('<div style="border:1px solid #E6E1D9;border-radius:8px;padding:8px 10px"><b>Direct support</b>', '<div role="button" tabindex="0" style="cursor:pointer;{{c_direct_support}}" onClick="{{pickDS}}"><b>Direct support</b>')
      .replace('<div style="border:1.5px solid #217A78;border-radius:8px;padding:8px 10px;background:#F2F9F8"><b>Clinician</b>', '<div role="button" tabindex="0" style="cursor:pointer;{{c_clinician}}" onClick="{{pickCL}}"><b>Clinician</b>')
      .replace('<div style="border:1px solid #E6E1D9;border-radius:8px;padding:8px 10px"><b>Supervisor</b>', '<div role="button" tabindex="0" style="cursor:pointer;{{c_supervisor}}" onClick="{{pickSV}}"><b>Supervisor</b>')
      .replace('<div style="border:1px solid #E6E1D9;border-radius:8px;padding:8px 10px"><b>Admin</b>', '<div role="button" tabindex="0" style="cursor:pointer;{{c_admin}}" onClick="{{pickAD}}"><b>Admin</b>')
      .replace('<div style="font-size:12px;color:#525B66;text-align:center">', '<div style="font-size:12px;color:#525B66">Demo: pick a role card to fill its seed user, or type any seed staff email ({{allIds}}).</div>'
        + '<div style="border-top:1px solid #EFEBE4;padding-top:12px;font-size:13px;color:#525B66">Not Harvest staff? Open a portal:</div>'
        + '<div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:8px;font-size:12px">'
        + '<a href="#family" style="border:1px solid #E6E1D9;border-radius:8px;padding:8px 10px;color:#151B24;text-decoration:none"><b>Family portal</b><div style="color:#525B66">{{familyWho}}</div></a>'
        + '<a href="#counselor" style="border:1px solid #E6E1D9;border-radius:8px;padding:8px 10px;color:#151B24;text-decoration:none"><b>School counselor</b><div style="color:#525B66">R. Bell</div></a>'
        + '</div><div style="font-size:12px;color:#525B66;text-align:center">');
  }
  user() { const id = this.state.email.split('@')[0].trim().toLowerCase(); return this.s.staff.find(s => s.id === id); }
  renderVals() {
    const u = this.user(); const role = u?.role;
    const on = 'border:1.5px solid #217A78;border-radius:8px;padding:8px 10px;background:#F2F9F8', off = 'border:1px solid #E6E1D9;border-radius:8px;padding:8px 10px';
    const pick = r => () => this.setState({ email: ROLE_USER[r] + '@harvestoutreach.org', err: '' });
    return {
      email: this.state.email, err: this.state.err, familyWho: 'Denise Rivers', allIds: this.s.staff.map(s => s.id).join(', '),
      setEmail: e => { this.state.email = e.target.value; },
      c_direct_support: role === 'direct_support' ? on : off, c_clinician: role === 'clinician' ? on : off, c_supervisor: role === 'supervisor' ? on : off, c_admin: role === 'admin' ? on : off,
      pickDS: pick('direct_support'), pickCL: pick('clinician'), pickSV: pick('supervisor'), pickAD: pick('admin')
    };
  }
  signIn(u) {
    if (!u) { this.setState({ err: 'No seed user with that email. Try jperez, khale, cdiaz or dowens @harvestoutreach.org.' }); return; }
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
