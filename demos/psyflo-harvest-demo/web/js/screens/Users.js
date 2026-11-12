// Users & roles (screen 43). A compact table from state.staff; Add user (user.add); change role (user.update).
// The shell reads the signed-in user's role from the store, so a role change here changes that person's sidebar and which
// screens open for them. "What each role sees" is read from the screen register (registry levels), so it cannot drift.
import { register, Screen, M, raw, esc, modal, toast, session, canSee } from '../app.js';
import { homeFor } from '../registry.js';
import { NAV, VIEWS, METRIC, PAGE_TITLE } from '../shared/labels.js';

const ROLES = [['direct_support', 'Direct support'], ['supervisor', 'Supervisor'], ['clinician', 'Clinician'], ['admin', 'Admin']];
const LV = { direct_support: 1, supervisor: 2, clinician: 3, admin: 4 };
const ROLE_TITLES = ['Direct support', 'Site supervisor', 'Clinician', 'Admin', 'Supervisor'];
// what a role can open: label, screen id (null = the phone app and the Lauris panel, open to every role)
const SEES = [[NAV.Worklist, 'DoNext'], [NAV.Authorizations, 'Authorizations'], [NAV.Documentation, 'StaffDashboard'], [VIEWS.documentation.review, 'ReviewQueue'], [NAV.Analytics, 'Analytics'],
  [PAGE_TITLE.PayerPlaybook, 'PayerPlaybook'], [PAGE_TITLE.Users, 'Users'], ['Phone and panel', 'MobileApp']];
const CHECK = raw('<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>');

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
      const ds = u.role === 'direct_support'; const last = lastBy[u.id];
      return {
        id: u.id, name: u.name, sub: u.credential || '', roleId: 'role-' + u.id,
        roles: ROLES.map(([v, l]) => ({ v, l, sel: v === u.role ? 'selected' : '' })), setRole: e => this.setRole(u.id, e.target.value),
        sites: this.sites(s, u),
        review: ds ? (u.review_mode === 'every_note' ? METRIC.everyNote : METRIC.sampled) : '', reviewChip: ds && u.review_mode === 'every_note' ? 'watch' : 'info', hasReview: ds,
        last: !last ? '—' : last.slice(0, 10) === s.today ? 'Today' : M.fmtDate(last)
      };
    });
    const sees = SEES.map(([label, id]) => ({
      label, cells: ROLES.map(([r]) => {
        const lvl = LV[r]; const yes = canSee(id, lvl);
        return { yes: yes && !(id === 'StaffDashboard' && r === 'direct_support'), own: yes && id === 'StaffDashboard' && r === 'direct_support', no: !yes };
      })
    }));
    return { today: M.fmtDate(s.today, { dow: true }).replace(/^(\w+) /, '$1, '), title: PAGE_TITLE.Users, users, sees, check: CHECK, roleHeads: ROLES.map(r => r[1]), add: () => this.addUser() };
  }
  async setRole(id, role) {
    const u = M.byId(this.s.staff, id); if (!u || u.role === role) return;
    const patch = { role };
    if (ROLE_TITLES.includes(u.title)) patch.title = ROLES.find(r => r[0] === role)[1].replace('Supervisor', 'Site supervisor');
    if (role === 'direct_support' && !u.review_mode) Object.assign(patch, { review_mode: 'every_note', reviewer: 'cdiaz' });
    await this.do('user.update', { id, patch });
    toast(`${u.name} is now ${M.ROLE_LABEL[role]}`);
    if (id === session.user?.id && LV[role] < 4) { toast('Your role changed · opening your first screen'); this.go(homeFor(role)); }
  }
  addUser() {
    const s = this.s;
    const lab = (f, t) => `<label for="${f}" style="display:block;font-size:13px;font-weight:600;margin:10px 0 5px">${t}</label>`;
    const sups = s.staff.filter(x => LV[x.role] >= 2 && x.role !== 'admin');
    modal(`<h2>Add user</h2>
      ${lab('nu-name', 'Name')}<input id="nu-name" class="u-in" style="width:100%" placeholder="e.g. Morgan Ellis" autocomplete="off">
      ${lab('nu-cred', 'Credential')}<input id="nu-cred" class="u-in" style="width:100%" placeholder="QMHP-C, QMHP-T, LPC…" autocomplete="off">
      ${lab('nu-role', 'Role')}<select id="nu-role" class="u-sel" style="width:100%">${ROLES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <fieldset style="border:0;padding:0;margin:10px 0 0"><legend style="font-size:13px;font-weight:600;margin-bottom:5px">Sites</legend>${s.schools.map(x => `<label style="display:flex;gap:8px;align-items:center;font-size:13px;min-height:28px"><input type="checkbox" value="${x.id}"${x.id === 'CC-ES1' ? ' checked' : ''}> ${esc(x.name)}</label>`).join('')}</fieldset>
      <div id="nu-ds">${lab('nu-mode', 'Review')}<select id="nu-mode" class="u-sel" style="width:100%"><option value="every_note">${esc(METRIC.everyNote)}</option><option value="spot_check">${esc(METRIC.sampled)}</option></select>
      ${lab('nu-rev', 'Reviewer')}<select id="nu-rev" class="u-sel" style="width:100%">${sups.map(x => `<option value="${x.id}"${x.id === 'cdiaz' ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div id="nu-err" role="alert" style="color:var(--late-fg);font-size:13px;margin-top:8px"></div>
      <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-ok>Add user</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => {
        const q = x => box.querySelector(x);
        q('#nu-name').focus();
        q('#nu-role').onchange = () => { q('#nu-ds').style.display = q('#nu-role').value === 'direct_support' ? '' : 'none'; };
        q('[data-ok]').onclick = async () => {
          const name = q('#nu-name').value.trim();
          if (!name) { q('#nu-err').textContent = 'Type a name'; return; }
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
});
