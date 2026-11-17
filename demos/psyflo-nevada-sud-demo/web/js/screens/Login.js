// Sign in (route Login). A normal sign-in page: work email, password, Sign in. The three demo accounts (direct support staff,
// clinician, administrator) are listed under the form so anyone can click straight into one; typing a demo email with any
// password works too. No roles are explained here: what each person sees follows from their role after sign-in.
import { register, Screen, session, go, modal, toast, raw } from '../app.js';
import { homeFor } from '../registry.js';

const LOGO = `<svg role="img" aria-label="psyflo" viewBox="0 0 3191 1060" width="110" height="37"><g transform="translate(-6.0,780.0) scale(1,-1)"><path d="M66 -220V504H186L201 434Q217 456 239.0 474.5Q261 493 291.5 504.5Q322 516 363 516Q434 516 488.0 481.0Q542 446 573.5 386.5Q605 327 605 251Q605 175 573.0 115.5Q541 56 487.0 22.0Q433 -12 364 -12Q308 -12 267.5 8.5Q227 29 201 65V-220ZM332 106Q372 106 402.5 124.0Q433 142 450.0 175.0Q467 208 467 251Q467 294 450.0 327.5Q433 361 402.5 379.5Q372 398 332 398Q293 398 262.5 379.5Q232 361 214.5 328.0Q197 295 197 252Q197 209 214.5 175.5Q232 142 262.5 124.0Q293 106 332 106Z" fill="#151B24"></path></g><g transform="translate(624.0,780.0) scale(1,-1)"><path d="M272 -12Q203 -12 152.0 10.0Q101 32 72.0 71.0Q43 110 39 159H173Q178 140 190.0 124.5Q202 109 222.0 100.0Q242 91 270 91Q297 91 314.0 98.5Q331 106 339.5 119.0Q348 132 348 146Q348 167 336.0 178.5Q324 190 301.0 197.0Q278 204 245 211Q209 218 174.5 228.5Q140 239 113.0 255.0Q86 271 70.0 296.0Q54 321 54 358Q54 403 78.0 438.5Q102 474 148.0 495.0Q194 516 259 516Q350 516 403.0 475.0Q456 434 466 362H339Q333 385 312.5 398.5Q292 412 258 412Q222 412 203.0 399.0Q184 386 184 365Q184 351 196.5 340.0Q209 329 232.0 321.5Q255 314 288 307Q346 295 390.0 279.5Q434 264 459.0 235.5Q484 207 484 153Q484 105 458.0 67.5Q432 30 384.5 9.0Q337 -12 272 -12Z" fill="#151B24"></path></g><g transform="translate(1105.0,780.0) scale(1,-1)"><path d="M130 -220 252 56H222L20 504H167L311 179L441 504H584L273 -220Z" fill="#151B24"></path></g><g transform="translate(1734.0,780.0) scale(1,-1)"><path d="M89 0V549Q89 612 110.0 649.0Q131 686 170.5 703.0Q210 720 263 720H325V605H283Q251 605 237.5 592.5Q224 580 224 549V0ZM20 391V504H333V391Z" fill="#5FC0BE"></path></g><g transform="translate(2080.0,780.0) scale(1,-1)"><path d="M66 0V720H201V0Z" fill="#5FC0BE"></path></g><g transform="translate(2322.0,780.0) scale(1,-1)"><path d="M304 -12Q232 -12 174.5 21.5Q117 55 83.5 114.5Q50 174 50 251Q50 330 83.5 389.5Q117 449 175.0 482.5Q233 516 305 516Q378 516 435.5 482.5Q493 449 526.5 389.5Q560 330 560 252Q560 174 526.5 114.5Q493 55 435.0 21.5Q377 -12 304 -12ZM304 105Q338 105 364.5 121.0Q391 137 406.5 170.0Q422 203 422 252Q422 301 406.5 333.5Q391 366 364.5 382.5Q338 399 305 399Q273 399 246.0 382.5Q219 366 203.5 333.5Q188 301 188 252Q188 203 203.5 170.0Q219 137 245.5 121.0Q272 105 304 105Z" fill="#5FC0BE"></path></g><g transform="translate(2922.0,780.0) scale(1,-1)"><path d="M127 -5Q89 -5 66.0 17.5Q43 40 43 73Q43 106 66.0 128.5Q89 151 127 151Q163 151 186.0 128.5Q209 106 209 73Q209 40 186.0 17.5Q163 -5 127 -5Z" fill="#F0B44C"></path></g></svg>`;
const ACCOUNTS = [
  { id: 'khale', role: 'Direct support staff', blurb: 'Behavioral health tech · IOP groups and daily notes' },
  { id: 'jperez', role: 'Clinician', blurb: 'LCADC · assessments, treatment plans, authorizations' },
  { id: 'dowens', role: 'Administrator', blurb: 'Billing, claims, payer rules and users' }
];

register('Login', class extends Screen {
  init() { this.state = { email: '', err: '' }; }
  prepare() {
    return `<div style="min-height:100vh;display:flex;background:#151B24">
      <div style="flex:1 1 0;min-width:0;display:flex;align-items:center;justify-content:center;padding:32px 16px">
        <div style="width:min(440px,100%);background:#fff;border-radius:16px;padding:32px 36px;display:flex;flex-direction:column;gap:14px;box-shadow:0 20px 60px rgba(0,0,0,.35)">
          <div>{{logo}}</div>
          <div><h1 style="margin:0;font-size:22px;font-weight:600;letter-spacing:-.01em">Sign in</h1><div style="font-size:13px;color:#525B66;margin-top:2px">Community Counseling Center of Southern Nevada</div></div>
          <form id="lgForm" style="display:flex;flex-direction:column;gap:12px" autocomplete="on">
            <div><label for="email" style="font-size:13px;font-weight:600;display:block;margin-bottom:5px">Work email</label><input id="email" name="email" type="email" autocomplete="username" placeholder="name@cccsn.demo" value="{{email}}" onInput="{{setEmail}}" style="width:100%;border:1px solid #C9CDD3;border-radius:8px;padding:10px 12px;font:inherit;min-height:44px;box-sizing:border-box"></div>
            <div><label for="pw" style="font-size:13px;font-weight:600;display:block;margin-bottom:5px">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" style="width:100%;border:1px solid #C9CDD3;border-radius:8px;padding:10px 12px;font:inherit;min-height:44px;box-sizing:border-box"></div>
            <sc-if value="{{err}}"><div role="alert" style="color:#8A2E1C;font-size:13px">{{err}}</div></sc-if>
            <a class="btn p" href="#signin" style="min-height:46px">Sign in</a>
          </form>
          <div style="font-size:12px;color:#525B66;display:flex;justify-content:space-between"><a href="#sso">Sign in with Microsoft 365</a><a href="#forgot">Forgot password</a></div>
          <div style="border-top:1px solid #EFEBE4;padding-top:14px">
            <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#525B66;font-weight:600;margin-bottom:8px">Demo accounts · click to sign in</div>
            <div style="display:flex;flex-direction:column;gap:8px">
              <sc-for list="{{accounts}}" as="a"><button type="button" class="acct" onClick="{{a.pick}}" aria-label="Sign in as {{a.name}}, {{a.role}}"><span class="av">{{a.initials}}</span><span style="min-width:0;flex:1;text-align:left"><b style="display:block;font-size:14px">{{a.name}} <span style="font-weight:500;color:#525B66">· {{a.role}}</span></b><span style="font-size:12px;color:#525B66">{{a.blurb}}</span></span><span style="color:#217A78;font-weight:600;font-size:13px">Sign in →</span></button></sc-for>
            </div>
            <div style="font-size:12px;color:#525B66;margin-top:10px">Demo environment · every name, date and number is synthetic.</div>
          </div>
        </div>
      </div>
    </div>`;
  }
  get css() { return `.acct{display:flex;align-items:center;gap:12px;border:1px solid #E6E1D9;background:#fff;border-radius:10px;padding:10px 12px;font:inherit;cursor:pointer;min-height:56px;color:#151B24}.acct:hover{border-color:#217A78;background:#F2F9F8}.acct:focus-visible{outline:2px solid #217A78;outline-offset:2px}.acct .av{width:36px;height:36px;border-radius:50%;background:#217A78;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex:0 0 auto}`; }
  user() { const id = this.state.email.split('@')[0].trim().toLowerCase(); return ACCOUNTS.some(a => a.id === id) ? this.s.staff.find(s => s.id === id) : null; }
  renderVals() {
    return {
      logo: raw(LOGO), email: this.state.email, err: this.state.err,
      setEmail: e => { this.state.email = e.target.value; },
      accounts: ACCOUNTS.map(a => { const u = this.s.staff.find(s => s.id === a.id) || {}; return { name: u.name || a.id, initials: u.initials || '', role: a.role, blurb: a.blurb, pick: () => this.signIn(u) }; })
    };
  }
  signIn(u) {
    if (!u) { this.setState({ err: 'We could not find that account. Use one of the demo accounts below.' }); return; }
    session.signIn(u.id);
    toast(`Signed in as ${u.name}`);
    go(this.params.next && this.params.next !== 'Login' ? this.params.next : homeFor(u.role, innerWidth < 600));
  }
  get anchors() {
    return {
      signin: () => this.signIn(this.user()),
      sso: () => modal(`<h2>Sign in with Microsoft 365</h2><p>Choose an account:</p><div style="display:flex;flex-direction:column;gap:8px;margin:12px 0">${ACCOUNTS.map(a => { const u = this.s.staff.find(s => s.id === a.id) || {}; return `<button class="mbtn" data-u="${a.id}" style="justify-content:flex-start">${u.name} · ${a.role}</button>`; }).join('')}</div><button class="mbtn" data-close>Cancel</button>`,
        (box, close) => box.querySelectorAll('[data-u]').forEach(b => b.onclick = () => { close(); this.signIn(this.s.staff.find(s => s.id === b.dataset.u)); })),
      forgot: () => modal(`<h2>Forgot password</h2><p>Enter your work email and an administrator is notified to reset it. In this demo nothing is sent.</p><button class="mbtn p" data-close>OK</button>`)
    };
  }
  set anchors(v) { }
});
