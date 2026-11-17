// 43 · Users & Permissions (Live). Table from state.staff; Add a user (user.add); change role (user.update).
// The shell reads the signed-in user's role from the store, so a role change here changes that person's
// sidebar and which screens open for them (registry levels).
import { register, Screen, M, esc, modal, toast, session, canSee } from '../app.js';
import { homeFor } from '../registry.js';

const ROLES = [['direct_support', 'Direct support staff'], ['clinician', 'Clinician'], ['admin', 'Administrator']];
const CHIP = { clinician: 'chip g', admin: 'chip n', supervisor: 'chip n', direct_support: 'chip y' };
const LV = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };
const ROLE_TITLES = ['Direct support staff', 'Clinician', 'Administrator', 'Counselor', 'Clinical supervisor', 'Billing & admin'];
const SHORT = { direct_support: 'Direct support', clinician: 'Clinician', admin: 'Administrator' };
const NAV = [['StaffDashboard', 'Dashboard'], ['DoNext', 'Dashboard'], ['ExtHome', 'Clients'], ['Referrals', 'Referrals'], ['Eligibility', 'Eligibility'], ['Authorizations', 'Authorizations'], ['Claims', 'Denial Intelligence'], ['PayerPlaybook', 'Payer Rules'], ['Analytics', 'Reports'], ['Users', 'Users & Permissions']];

register('Users', class extends Screen {
  sites(s, u) {
    if (u.sites === 'all' || !u.sites) return 'All';
    const names = [].concat(u.sites).map(id => M.school(s, id).name.replace(' County · ', ' ').replace(' City · ', ' '));
    if (names.length > 1 && names.every(n => n.split(' ')[0] === names[0].split(' ')[0])) return names[0] + ', ' + names.slice(1).map(n => n.split(' ').pop()).join(', ');
    return names.join(', ');
  }
  renderVals() {
    const s = this.s;
    const lastBy = {};
    for (const e of s.events) if (e.who && (!lastBy[e.who] || e.at > lastBy[e.who])) lastBy[e.who] = e.at;
    const users = s.staff.map(u => {
      const titleBit = String(u.title || '');
      const ds = u.role === 'direct_support';
      const last = lastBy[u.id];
      return {
        id: u.id, name: u.name, sub: [u.credential, titleBit].filter(Boolean).join(' · '),
        roleId: 'role-' + u.id, chip: CHIP[u.role] || 'chip n',
        roles: ROLES.map(([v, l]) => ({ v, l: SHORT[v], cls: 'rbtn' + (v === u.role ? ' on' : ''), label: `${u.name}: ${l}`, pick: () => this.setRole(u.id, v) })),
        sites: this.sites(s, u),
        review: ds ? (u.review_mode === 'every_note' ? `co-signs every note · ${M.staffShort(s, u.reviewer || 'cdiaz')}` : 'spot check') : '—', reviewChip: ds && u.review_mode === 'every_note',
        last: !last ? '—' : last.slice(0, 10) === s.today ? 'today' : M.fmtDate(last)
      };
    });
    const nav = {};
    for (const [r] of ROLES) { const seen = new Set(); nav[r] = NAV.filter(([id, l]) => canSee(id, LV[r]) && !seen.has(l) && seen.add(l)).filter(([id]) => !(id === 'StaffDashboard' && r === 'clinician') && !(id === 'DoNext' && r !== 'clinician')).map(x => x[1]).join(' · '); }
    return { h1: `Users & Permissions`, count: `${users.length} users · 3 roles`, users, nav,
      more: `Changing a role changes that person's sidebar and the pages they can open, the next time the page paints.` };
  }
  async setRole(id, role) {
    const u = M.byId(this.s.staff, id); if (!u || u.role === role) return;
    const patch = { role };
    if (ROLE_TITLES.includes(u.title)) patch.title = ROLES.find(r => r[0] === role)[1];
    if (role === 'direct_support' && !u.review_mode) Object.assign(patch, { review_mode: 'every_note', reviewer: 'cdiaz' });
    await this.do('user.update', { id, patch });
    toast(`${u.name} is now ${M.ROLE_LABEL[role]}`);
    if (id === session.user?.id && LV[role] < 4) { toast('Your own role changed · taking you to your first screen'); this.go(homeFor(role)); }
  }
  get anchors() {
    return {
      add: () => {
        const s = this.s;
        const lab = (f, t) => `<label for="${f}" style="display:block;font-size:13px;font-weight:600;margin:10px 0 5px">${t}</label>`;
        const inp = 'width:100%;border:1px solid #C9CDD3;border-radius:8px;padding:9px 12px;font:inherit;font-size:14px;min-height:40px;background:#fff';
        const sups = s.staff.filter(x => x.role === 'clinician');
        modal(`<h2>Add a user</h2><p style="margin:0;font-size:13px;color:#525B66">They sign in with their CCC of SN email; the role decides what the app and the Client Record panel show.</p>
          ${lab('nu-name', 'Name')}<input id="nu-name" style="${inp}" placeholder="e.g. Morgan Ellis" autocomplete="off">
          ${lab('nu-cred', 'Credential')}<input id="nu-cred" style="${inp}" placeholder="LCADC, CADC, CADC-I, LCSW, LCPC, PRSS…" autocomplete="off">
          <div style="font-size:13px;font-weight:600;margin:10px 0 5px">Role</div><div class="segm" id="nu-role" role="radiogroup" aria-label="Role">${ROLES.map(([v, l], i) => `<button type="button" role="radio" aria-checked="${i === 0}" class="${i === 0 ? 'on' : ''}" data-v="${v}">${l}</button>`).join('')}</div>
          <fieldset style="border:0;padding:0;margin:10px 0 0"><legend style="font-size:13px;font-weight:600;margin-bottom:5px">Programs</legend>${s.schools.map(x => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;min-height:28px"><input type="checkbox" value="${x.id}"${x.id === 'CC-ES1' ? ' checked' : ''}> ${esc(x.name)}</label>`).join('')}</fieldset>
          <div id="nu-ds"><div style="font-size:13px;font-weight:600;margin:10px 0 5px">Notes reviewed</div><div class="segm" id="nu-mode" role="radiogroup" aria-label="Notes reviewed"><button type="button" role="radio" aria-checked="true" class="on" data-v="every_note">Clinician co-signs every note</button><button type="button" role="radio" aria-checked="false" data-v="spot_check">Spot check</button></div>
          <div style="font-size:13px;font-weight:600;margin:10px 0 5px">Reviewer</div><div class="segm" id="nu-rev" role="radiogroup" aria-label="Reviewer">${sups.map((x, i) => `<button type="button" role="radio" aria-checked="${x.id === 'cdiaz'}" class="${x.id === 'cdiaz' ? 'on' : ''}" data-v="${x.id}">${esc(x.name)}</button>`).join('')}</div></div>
          <div id="nu-err" role="alert" style="color:#8A2E1C;font-size:13px;margin-top:8px"></div>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-ok>Add user</button><button class="mbtn" data-close>Cancel</button></div>`,
          (box, close) => {
            const q = x => box.querySelector(x);
            q('#nu-name').focus();
            const val = id => (box.querySelector('#' + id + ' .on') || {}).dataset?.v;
            for (const id of ['nu-role', 'nu-mode', 'nu-rev']) box.querySelectorAll('#' + id + ' button').forEach(b => b.onclick = () => { box.querySelectorAll('#' + id + ' button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); if (id === 'nu-role') q('#nu-ds').style.display = val('nu-role') === 'direct_support' ? '' : 'none'; });
            q('[data-ok]').onclick = async () => {
              const name = q('#nu-name').value.trim();
              if (!name) { q('#nu-err').textContent = 'Type a name.'; return; }
              const role = val('nu-role');
              const sites = [...box.querySelectorAll('fieldset input:checked')].map(i => i.value);
              const args = { name, credential: q('#nu-cred').value.trim(), role, sites: role === 'admin' ? 'all' : (sites.length ? sites : ['CC-ES1']) };
              if (role === 'direct_support') Object.assign(args, { review_mode: val('nu-mode'), reviewer: val('nu-rev') });
              else Object.assign(args, { review_mode: null, reviewer: null });
              const r = await this.do('user.add', args);
              close();
              toast(`${name} added · signs in as ${r.id}@cccsn.demo`);
            };
          });
      }
    };
  }
  set anchors(v) { }
  get css() { return '.rbtn{border:1px solid #D9D4CC;background:#fff;color:#151B24;font:inherit;font-size:12px;font-weight:600;padding:0 10px;min-height:32px;cursor:pointer}.rbtn:first-child{border-radius:8px 0 0 8px}.rbtn:last-child{border-radius:0 8px 8px 0}.rbtn+.rbtn{margin-left:-1px}.rbtn.on{background:#151B24;color:#fff;border-color:#151B24}.rbtn:hover:not(.on){background:#F3F0EA}.rseg{display:flex}'; }
});
