// 43 · Users & roles (Live). Table from state.staff; Add a user (user.add); change role (user.update).
// The shell reads the signed-in user's role from the store, so a role change here changes that person's
// sidebar and which screens open for them (registry levels).
import { register, Screen, M, esc, modal, toast, session, canSee } from '../app.js';
import { homeFor } from '../registry.js';

const ROLES = [['direct_support', 'Direct support'], ['supervisor', 'Supervisor'], ['clinician', 'Clinician'], ['admin', 'Admin']];
const CHIP = { clinician: 'chip g', admin: 'chip n', supervisor: 'chip n', direct_support: 'chip y' };
const LV = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };
const ROLE_TITLES = ['Direct support', 'Site supervisor', 'Clinician', 'Admin', 'Supervisor'];
const NAV = [['DoNext', 'Do next'], ['Referrals', 'Referrals'], ['Authorizations', 'Authorizations'], ['ReviewQueue', 'Review queue'], ['StaffDashboard', 'Staff'], ['Analytics', 'Analytics'], ['PayerPlaybook', 'Payer playbook'], ['ExtHome', 'Lauris extension'], ['MobileApp', 'Mobile app'], ['Users', 'Users']];

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
      const titleBit = u.signs_requests ? 'signs requests' : String(u.title || '').replace(/^Direct support( · )?/, '');
      const ds = u.role === 'direct_support';
      const last = lastBy[u.id];
      return {
        id: u.id, name: u.name, sub: [u.credential, titleBit].filter(Boolean).join(' · '),
        roleId: 'role-' + u.id, chip: CHIP[u.role] || 'chip n',
        roles: ROLES.map(([v, l]) => ({ v, l, sel: v === u.role ? 'selected' : '' })),
        setRole: (e) => this.setRole(u.id, e.target.value),
        sites: this.sites(s, u),
        review: ds ? (u.review_mode === 'every_note' ? `every note · ${M.staffShort(s, u.reviewer || 'cdiaz')}` : 'spot check') : '—', reviewChip: ds && u.review_mode === 'every_note',
        last: !last ? '—' : last.slice(0, 10) === s.today ? 'today' : M.fmtDate(last)
      };
    });
    const nav = {};
    for (const [r] of ROLES) nav[r] = NAV.filter(([id]) => canSee(id, LV[r])).map(x => x[1]).join(' · ');
    return { h1: `${users.length} users · 4 roles`, users, nav,
      more: `The demo seed holds ${users.length} of Harvest's staff; the rest would come from the staff list import. Changing a role here changes that person's sidebar the next time the page paints.` };
  }
  async setRole(id, role) {
    const u = M.byId(this.s.staff, id); if (!u || u.role === role) return;
    const patch = { role };
    if (ROLE_TITLES.includes(u.title)) patch.title = ROLES.find(r => r[0] === role)[1].replace('Supervisor', 'Site supervisor');
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
        const sups = s.staff.filter(x => LV[x.role] >= 2 && x.role !== 'admin');
        modal(`<h2>Add a user</h2><p style="margin:0;font-size:13px;color:#525B66">They sign in with their Harvest email; the role decides what the app and the extension show.</p>
          ${lab('nu-name', 'Name')}<input id="nu-name" style="${inp}" placeholder="e.g. Morgan Ellis" autocomplete="off">
          ${lab('nu-cred', 'Credential')}<input id="nu-cred" style="${inp}" placeholder="QMHP-C, QMHP-T, LPC…" autocomplete="off">
          ${lab('nu-role', 'Role')}<select id="nu-role" style="${inp}">${ROLES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <fieldset style="border:0;padding:0;margin:10px 0 0"><legend style="font-size:13px;font-weight:600;margin-bottom:5px">Sites</legend>${s.schools.map(x => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;min-height:28px"><input type="checkbox" value="${x.id}"${x.id === 'CC-ES1' ? ' checked' : ''}> ${esc(x.name)}</label>`).join('')}</fieldset>
          <div id="nu-ds">${lab('nu-mode', 'Notes reviewed')}<select id="nu-mode" style="${inp}"><option value="every_note">Every note to a supervisor (new hire, trainee)</option><option value="spot_check">Spot check</option></select>
          ${lab('nu-rev', 'Reviewer')}<select id="nu-rev" style="${inp}">${sups.map(x => `<option value="${x.id}"${x.id === 'cdiaz' ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
          <div id="nu-err" role="alert" style="color:#8A2E1C;font-size:13px;margin-top:8px"></div>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-ok>Add user</button><button class="mbtn" data-close>Cancel</button></div>`,
          (box, close) => {
            const q = x => box.querySelector(x);
            q('#nu-name').focus();
            q('#nu-role').onchange = () => { q('#nu-ds').style.display = q('#nu-role').value === 'direct_support' ? '' : 'none'; };
            q('[data-ok]').onclick = async () => {
              const name = q('#nu-name').value.trim();
              if (!name) { q('#nu-err').textContent = 'Type a name.'; return; }
              const role = q('#nu-role').value;
              const sites = [...box.querySelectorAll('fieldset input:checked')].map(i => i.value);
              const args = { name, credential: q('#nu-cred').value.trim(), role, sites: role === 'admin' ? 'all' : (sites.length ? sites : ['CC-ES1']) };
              if (role === 'direct_support') Object.assign(args, { review_mode: q('#nu-mode').value, reviewer: q('#nu-rev').value });
              else Object.assign(args, { review_mode: null, reviewer: null });
              const r = await this.do('user.add', args);
              close();
              toast(`${name} added · signs in as ${r.id}@harvestoutreach.org`);
            };
          });
      }
    };
  }
  set anchors(v) { }
  get css() { return '.rsel{border:0;font:inherit;font-size:12px;font-weight:600;cursor:pointer;-webkit-appearance:none;appearance:none;padding:2px 22px 2px 9px;background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);background-position:calc(100% - 12px) 55%,calc(100% - 8px) 55%;background-size:4px 4px;background-repeat:no-repeat}'; }
});
