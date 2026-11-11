// Settings (route Settings, ?tab=people|roles|units|rules|audit|family|presenter). Admin only (admin.settings); everything here is
// audited and takes effect on the next server call. Rules are edited through settings.rule (a reason is required, changes apply forward only);
// people, roles and designations through the settings.* actions (a raise or a designation needs a second person).
import { register, Screen, M, raw, esc, ui, session, hrefFor, canOpen } from '../app.js';
import { BY_ID, resolveRoute } from '../registry.js';
import { MATRIX, CAP_LIST, STAFF_ROLES, ROLE_LABEL, PORTAL_ACTORS, can } from '../shared/permissions.js';
import { rule, unitsFor, unitBands, unitThresholds, ruleValue } from '../shared/rules.js';
import { today as clockToday } from '../shared/clock.js';
import { MATURITY, LEVELS, LEVEL_ORDER } from '../shared/maturity.js';
import { confirmAccess, withDate } from './MyWorkViews.js';
import { TABS, CAP_GROUPS, CELL, capLabel, designatable, areaOf, CATEGORY_CHIPS, CLOCK_KEYS, UNIT_KEYS, showValue, editorKind, choicesOf, parseValue, editorText, DOC_MODES, MODE_LABEL, SURFACES, ARCH, DECISIONS } from './SettingsData.js';

const RANKED = ['direct_support', 'supervisor', 'clinician', 'admin'];
const ROLE_SHORT = { direct_support: 'Direct support', supervisor: 'Supervisor', clinician: 'Clinician', admin: 'Administrator', guardian: 'Guardian', school: 'School user' };
const sitesText = (s, u) => {
  if (u.sites === 'all' || !u.sites) return 'All sites';
  return [].concat(u.sites).map(id => M.school(s, id).name.replace(' County · ', ' ').replace(' City · ', ' ')).join(', ');
};
const KIND_OF = { person: 'staff', portal: 'family', system: 'psyflo', bridge: 'lauris', integration: 'lauris', demo: 'system' };
const KIND_LABEL = { person: 'Person', portal: 'Portal', system: 'System', bridge: 'Bridge', integration: 'Integration', demo: 'Demo' };

register('Settings', class extends Screen {
  init() {
    const t = this.params.tab;
    this.tab = TABS.some(x => x[0] === t) ? t : 'people';
    // the filter bar writes its state into the address (q, cat, area on Rules; q, kind, who, sim on Audit), so a copied link restores it
    this.state = { f: { q: this.tab === 'rules' ? this.params.q || '' : '', cat: this.params.cat || '', area: this.params.area || '' }, a: { q: this.tab === 'audit' ? this.params.q || '' : '', kind: this.params.kind || '', who: this.params.who || '', sim: this.params.sim || '' }, auditLimit: 25, sort: null, portal: false, minutes: '180' };
  }
  get actor() { return session.actor; }

  // ---- small helpers
  staffName(id) {
    const u = M.byId(this.s.staff, id) || M.byId(this.s.school_users, String(id || '').replace(/^school:/, ''));
    if (u) return u.name;
    const g = /^guardian:(\w+)$/.exec(id || ''); if (g) return 'Guardian · ' + M.clientLabel(this.s, g[1], false);
    return id || 'Not recorded';
  }
  // a reason is always asked: it goes into the audit log (settings.rule needs four or more characters)
  askReason({ title, lead, confirmLabel = 'Save', opener, extra = '', onOpen, run }) {
    ui.modal({
      title, size: 'sm', returnFocus: opener, initialFocus: '#se-why',
      body: `${lead ? `<p>${lead}</p>` : ''}${extra}<div class="ui-field"><label class="ui-field__l" for="se-why">Why</label><textarea class="ui-input ui-textarea" id="se-why" rows="3" autocomplete="off"></textarea><div class="se-err" id="se-why-err" role="alert"></div></div>`,
      onMount: d => onOpen && onOpen(d),
      actions: [{ label: 'Cancel', tone: 'secondary' }, { label: confirmLabel, tone: 'primary', onClick: async h => {
        const why = h.dialog.querySelector('#se-why').value.trim();
        const err = h.dialog.querySelector('#se-why-err');
        if (why.length < 4) { err.textContent = 'Say why. It is kept in the audit log.'; h.dialog.querySelector('#se-why').focus(); return false; }
        try { await run(why, h.dialog); } catch (e) { err.textContent = e.message || 'That did not work.'; return false; }
      } }]
    });
  }
  async rule(key, patch, reason) { return this.do('settings.rule', { key, reason, ...patch }); }

  // ================================================================================================ render
  renderVals() {
    const a = this.actor; const s = this.s;
    if (!a || !can(a, 'admin.settings')) {
      return { tabs: raw(''), body: raw(ui.emptyState({ tone: 'denied', title: 'Needs an administrator', body: 'Settings change who can see and do what, and the rules behind every date. Ask an administrator.', action: { label: 'Go to My Work', href: '#/MyWork' } })), pending: raw('') };
    }
    const tabs = `<nav class="se-tabs" aria-label="Settings sections">${TABS.map(([id, label]) => `<a class="se-tab" href="#/Settings?tab=${id}"${id === this.tab ? ' aria-current="page"' : ''}>${esc(label)}${this.badge(id)}</a>`).join('')}</nav>`;
    const body = { people: () => this.people(), roles: () => this.roles(), units: () => this.units(), rules: () => this.rules(), audit: () => this.audit(), family: () => this.family(), presenter: () => this.presenter() }[this.tab]();
    return { tabs: raw(tabs), body: raw(body) };
  }
  badge(id) {
    const s = this.s;
    const n = id === 'people' ? (s.role_changes || []).filter(x => x.status === 'pending').length : id === 'roles' ? (s.designations || []).filter(x => x.status === 'pending').length : 0;
    return n ? `<b>${n}<span class="ui-sr"> waiting for a second person</span></b>` : '';
  }
  after(root) {
    root.querySelectorAll('[data-x]').forEach(el => { el.onclick = e => { e.preventDefault(); this.act(el.dataset.x, el.dataset, el); }; });
    const m = root.querySelector('#se-min'); if (m) m.oninput = () => { this.state.minutes = m.value; const o = root.querySelector('#se-min-out'); if (o) o.textContent = this.calc(m.value); };
  }
  async act(name, d, el) {
    try {
      if (name === 'addUser') this.addUser(el);
      else if (name === 'role') this.changeRole(d.id, el);
      else if (name === 'confirm') confirmAccess({ s: this.s, kind: d.kind, id: d.id, me: this.actor.id, opener: el, run: async (a, args) => { const r = await this.do(a, args); this.toast(args.decision === 'approve' ? 'Confirmed · written to the audit log' : 'Declined · written to the audit log'); return r; } });
      else if (name === 'designate') this.designate(d.cap, el);
      else if (name === 'undesignate') this.undesignate(d.cap, d.id, el);
      else if (name === 'portal') this.setState({ portal: !this.state.portal });
      else if (name === 'rule') this.editRule(d.key, el);
      else if (name === 'bands') this.setBands(d.mode, el);
      else if (name === 'mode') this.setMode(d.key, d.value, el);
      else if (name === 'rulebool') this.toggleRule(d.key, el);
      else if (name === 'fq') this.familyQ(d.key, d.what);
      else if (name === 'csv') this.csv();
      else if (name === 'moreAudit') this.setState({ auditLimit: this.state.auditLimit + 50 });
      else if (name === 'maturity') { window.psyflo.setMaturity(!(window.psyflo.dock && window.psyflo.dock.maturityOn)); this.repaint(); }
      else if (name === 'notes') window.psyflo.openNotes('Settings');
    } catch (e) { /* this.do already toasted */ }
  }

  // ================================================================================================ People
  people() {
    const s = this.s; const me = this.actor;
    const last = {}; for (const e of s.events || []) if (e.who && (!last[e.who] || e.at > last[e.who])) last[e.who] = e.at;
    const rows = (s.staff || []).map(u => ({ ...u, last: last[u.id] || '' }));
    const pending = (s.role_changes || []).filter(x => x.status === 'pending');
    const cols = [
      { key: 'name', label: 'Name', primary: true, sort: true, render: r => `<b>${esc(r.name)}</b><small class="se-sub">${esc([r.credential, r.title].filter(Boolean).join(' · '))}</small>` },
      { key: 'role', label: 'Role', sort: true, render: r => ui.chip(ROLE_SHORT[r.role] || r.role, { tone: r.role === 'admin' ? 'navy' : r.role === 'clinician' ? 'success' : 'neutral', size: 'sm' }) },
      { key: 'sites', label: 'Sites', hideBelow: 1024, render: r => esc(sitesText(s, r)) },
      { key: 'review', label: 'Notes review', hideBelow: 1280, render: r => r.role === 'direct_support' ? (r.review_mode === 'every_note' ? `Every note${r.reviewer ? ' · ' + esc(M.staffShort(s, r.reviewer)) : ' · no reviewer yet'}` : 'Spot check') : '<span class="se-muted">Not applicable</span>' },
      { key: 'access', label: 'Designated access', hideBelow: 1280, render: r => (r.designations || []).length ? (r.designations || []).map(c => ui.chip(capLabel(c), { tone: 'warning', size: 'sm' })).join(' ') : '<span class="se-muted">None</span>' },
      { key: 'last', label: 'Last activity', sort: true, hideBelow: 1024, render: r => r.last ? esc(r.last.slice(0, 10) === clockToday(s) ? 'Today' : M.fmtDate(r.last)) : '<span class="se-muted">None yet</span>' },
      { key: 'act', label: 'Change', render: r => r.id === me.id ? `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" disabled title="You cannot change your own role">Change role</button>` : `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="role" data-id="${esc(r.id)}">Change role</button>` }
    ];
    const sorted = this.state.sort && this.state.sort.key !== 'act' ? ui.sortRows(rows, this.state.sort, { last: r => r.last, role: r => RANKED.indexOf(r.role) }) : rows;
    let h = '';
    if (pending.length) h += `<section class="se-card" aria-label="Waiting for a second person"><h2 class="se-h2">Waiting for a second person ${ui.chip(String(pending.length), { tone: 'info', size: 'sm' })}</h2><ul class="se-list">${pending.map(rc => {
      const u = M.byId(s.staff, rc.user); const mine = rc.by === me.id; const canConfirm = !mine && ['admin', 'clinician'].includes(me.role);
      return `<li><div><b>${esc(u ? u.name : rc.user)}</b> · ${esc(ROLE_SHORT[rc.from])} to ${esc(ROLE_SHORT[rc.to])}<small class="se-sub">Proposed by ${esc(this.staffName(rc.by))} · ${esc(rc.reason)}</small></div>${canConfirm ? `<button type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-x="confirm" data-kind="role" data-id="${esc(rc.id)}">Review</button>` : `<span class="se-muted">${mine ? 'Waiting for another person' : 'Needs an administrator or clinician'}</span>`}</li>`;
    }).join('')}</ul></section>`;
    h += `<section class="se-card"><div class="se-bar"><h2 class="se-h2">People ${ui.chip(String(rows.length), { tone: 'neutral', size: 'sm' })}</h2><button type="button" class="ui-btn ui-btn--primary" data-x="addUser">Add user</button></div>${ui.queueTable({ id: 'se-people', caption: 'People and roles', columns: cols, rows: sorted, rowId: r => r.id, sort: this.state.sort, onSort: sort => this.setState({ sort }), maxHeight: 'none' })}<p class="se-foot">Lowering a role applies at once. Raising a role needs a second person. Every change is in the audit log with its reason.</p></section>`;
    return h;
  }
  addUser(opener) {
    const s = this.s;
    const sites = (s.schools || []).map(x => `<label class="se-check"><input type="checkbox" name="site" value="${esc(x.id)}"${x.id === 'CC-ES1' ? ' checked' : ''}> ${esc(x.name)}</label>`).join('');
    const revs = (s.staff || []).filter(x => ['supervisor', 'clinician'].includes(x.role));
    ui.modal({
      title: 'Add a user', size: 'sm', returnFocus: opener, initialFocus: '#se-nu-name',
      body: `<div class="ui-field"><label class="ui-field__l" for="se-nu-name">Name</label><input class="ui-input" id="se-nu-name" autocomplete="off"></div>
        <div class="ui-field"><label class="ui-field__l" for="se-nu-cred">Credential</label><input class="ui-input" id="se-nu-cred" placeholder="QMHP-C, QMHP-T" autocomplete="off"></div>
        <div class="ui-field"><label class="ui-field__l" for="se-nu-role">Role</label><select class="ui-select" id="se-nu-role"><option value="direct_support">Direct support</option><option value="supervisor">Site supervisor</option></select><div class="ui-field__h">Clinician and administrator access is a role change confirmed by a second person.</div></div>
        <fieldset class="se-fs"><legend>Sites</legend>${sites}</fieldset>
        <div id="se-nu-ds"><div class="ui-field"><label class="ui-field__l" for="se-nu-rev">Reviewer for their notes</label><select class="ui-select" id="se-nu-rev">${revs.map(x => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></div></div>
        <div class="se-err" id="se-nu-err" role="alert"></div>`,
      onMount: d => { const r = d.querySelector('#se-nu-role'); r.onchange = () => { d.querySelector('#se-nu-ds').hidden = r.value !== 'direct_support'; }; },
      actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'Add user', tone: 'primary', onClick: async h => {
        const q = x => h.dialog.querySelector(x); const name = q('#se-nu-name').value.trim();
        if (name.length < 2) { q('#se-nu-err').textContent = 'Type a name.'; return false; }
        const role = q('#se-nu-role').value; const picked = [...h.dialog.querySelectorAll('input[name=site]:checked')].map(i => i.value);
        try {
          const r = await this.do('settings.userAdd', { name, credential: q('#se-nu-cred').value.trim(), role, sites: picked.length ? picked : ['CC-ES1'], review_mode: role === 'direct_support' ? 'every_note' : null, reviewer: role === 'direct_support' ? q('#se-nu-rev').value : null });
          this.toast(`${name} added · signs in as ${r.id}`);
        } catch (e) { q('#se-nu-err').textContent = e.message; return false; }
      } }]
    });
  }
  changeRole(id, opener) {
    const u = M.byId(this.s.staff, id); if (!u) return;
    this.askReason({
      title: `Change role · ${u.name}`, opener, confirmLabel: 'Change role',
      lead: `Now ${esc(ROLE_SHORT[u.role])}. Raising a role waits for a second person; lowering applies at once.`,
      extra: `<div class="ui-field"><label class="ui-field__l" for="se-role">New role</label><select class="ui-select" id="se-role">${RANKED.filter(r => r !== u.role).map(r => `<option value="${r}">${esc(ROLE_SHORT[r])}</option>`).join('')}</select></div>`,
      run: async (why, d) => {
        const role = d.querySelector('#se-role').value;
        const r = await this.do('settings.role', { id, role, reason: why });
        this.toast(r.status === 'pending' ? `${u.name} · ${ROLE_SHORT[role]} proposed · waiting for a second person` : `${u.name} is now ${ROLE_SHORT[role]}`);
      }
    });
  }

  // ================================================================================================ Roles
  roles() {
    const s = this.s; const me = this.actor; const cols = this.state.portal ? [...RANKED, ...PORTAL_ACTORS] : RANKED;
    const cell = (cap, r) => { const v = MATRIX[r][cap]; const c = cap === 'demo.controls' && v === 'D' ? { text: 'Presenter mode', tone: 'info', tip: 'Only in a presenter session, never a designation' } : CELL[v]; return `<td>${ui.chip(c.text, { tone: c.tone, size: 'sm', title: c.tip })}</td>`; };
    const group = ([name, caps]) => `<tbody><tr class="se-grp"><th scope="colgroup" colspan="${cols.length + 1}">${esc(name)}</th></tr>${caps.filter(c => CAP_LIST.includes(c)).map(c => `<tr><th scope="row"><span>${esc(capLabel(c))}</span><code>${esc(c)}</code></th>${cols.map(r => cell(c, r)).join('')}</tr>`).join('')}</tbody>`;
    let h = `<section class="se-card"><div class="se-bar"><h2 class="se-h2">Who can do what</h2><div class="se-legend" aria-label="Legend">${['Y', 'A', 'D', 'N'].map(v => ui.chip(CELL[v].text, { tone: CELL[v].tone, size: 'sm', title: CELL[v].tip })).join(' ')}<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="portal" aria-pressed="${this.state.portal}">${this.state.portal ? 'Hide portal roles' : 'Show portal roles'}</button></div></div>
      <div class="se-scroll" role="region" aria-label="Permission matrix" tabindex="0"><table class="se-matrix"><caption class="ui-sr">Permissions by role. Yes, own caseload, designated, or no.</caption><thead><tr><th scope="col">Permission</th>${cols.map(r => `<th scope="col">${esc(ROLE_SHORT[r])}</th>`).join('')}</tr></thead>${CAP_GROUPS.map(group).join('')}</table></div>
      <p class="se-hidden">${ui.icon('lock', 14)}<span>Administrators have no clinical-record access: note text is No for the Administrator role, and a designation cannot grant it.</span></p></section>`;
    // designated access (the D cells): proposed by an administrator, confirmed by a second person, written to the audit log
    const pend = (s.designations || []).filter(d => d.status === 'pending');
    const rows = designatable().map(d => {
      const holders = (s.staff || []).filter(u => (u.designations || []).includes(d.cap));
      const eligible = (s.staff || []).filter(u => d.roles.includes(u.role) && !(u.designations || []).includes(d.cap) && u.id !== me.id);
      return `<tr><th scope="row"><span>${esc(d.label)}</span><code>${esc(d.cap)}</code><small class="se-sub">${esc(d.roles.map(r => ROLE_SHORT[r]).join(', '))}</small></th><td>${holders.length ? holders.map(u => `<span class="se-holder">${esc(u.name)}${u.id === me.id ? '' : `<button type="button" class="ui-linkbtn" data-x="undesignate" data-cap="${esc(d.cap)}" data-id="${esc(u.id)}" aria-label="Remove ${esc(d.label)} from ${esc(u.name)}">Remove</button>`}</span>`).join('') : '<span class="se-muted">Nobody</span>'}</td><td><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="designate" data-cap="${esc(d.cap)}"${eligible.length ? '' : ' disabled title="Nobody else in a matching role"'}>Designate</button></td></tr>`;
    }).join('');
    h += `<section class="se-card"><h2 class="se-h2">Designated access ${pend.length ? ui.chip(pend.length + ' waiting', { tone: 'info', size: 'sm' }) : ''}</h2>
      ${pend.length ? `<ul class="se-list">${pend.map(d => { const u = M.byId(s.staff, d.user); const mine = d.by === me.id; return `<li><div><b>${esc(d.grant ? 'Grant' : 'Remove')} · ${esc(capLabel(d.cap))}</b> · ${esc(u ? u.name : d.user)}<small class="se-sub">Proposed by ${esc(this.staffName(d.by))} · ${esc(d.reason)}</small></div>${mine ? '<span class="se-muted">Waiting for another person</span>' : `<button type="button" class="ui-btn ui-btn--primary ui-btn--sm" data-x="confirm" data-kind="designation" data-id="${esc(d.id)}">Review</button>`}</li>`; }).join('')}</ul>` : ''}
      <div class="se-scroll"><table class="se-matrix se-matrix--plain"><caption class="ui-sr">Designated permissions and who holds them</caption><thead><tr><th scope="col">Permission</th><th scope="col">Held by</th><th scope="col">Add</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="se-foot">An administrator proposes; an administrator or a clinician who did not propose it confirms. Nobody designates themselves.</p></section>`;
    // history of designation decisions
    const done = (s.designations || []).filter(d => d.status !== 'pending').slice(-5).reverse();
    if (done.length) h += `<details class="se-acc"><summary>Recent decisions ${ui.chip(String(done.length), { tone: 'neutral', size: 'sm' })}</summary><ul class="se-list">${done.map(d => `<li><div><b>${esc(d.grant ? 'Grant' : 'Remove')} · ${esc(capLabel(d.cap))}</b> · ${esc(this.staffName(d.user))}<small class="se-sub">${esc(d.status)} by ${esc(this.staffName(d.decided_by))} · proposed by ${esc(this.staffName(d.by))}</small></div></li>`).join('')}</ul></details>`;
    return h;
  }
  designate(cap, opener) {
    const s = this.s; const d = designatable().find(x => x.cap === cap); if (!d) return;
    const eligible = (s.staff || []).filter(u => d.roles.includes(u.role) && !(u.designations || []).includes(cap) && u.id !== this.actor.id);
    this.askReason({
      title: `Designate · ${d.label}`, opener, confirmLabel: 'Propose', lead: 'A second person confirms before it takes effect.',
      extra: `<div class="ui-field"><label class="ui-field__l" for="se-who">Person</label><select class="ui-select" id="se-who">${eligible.map(u => `<option value="${esc(u.id)}">${esc(u.name)} · ${esc(ROLE_SHORT[u.role])}</option>`).join('')}</select></div>`,
      run: async (why, dlg) => { const id = dlg.querySelector('#se-who').value; await this.do('settings.designate', { id, cap, grant: true, reason: why }); this.toast('Proposed · waiting for a second person to confirm'); }
    });
  }
  undesignate(cap, id, opener) {
    const u = M.byId(this.s.staff, id); if (!u) return;
    this.askReason({
      title: `Remove · ${capLabel(cap)}`, opener, confirmLabel: 'Propose removal', lead: `${esc(u.name)} keeps it until a second person confirms.`,
      run: async why => { await this.do('settings.designate', { id, cap, grant: false, reason: why }); this.toast('Removal proposed · waiting for a second person'); }
    });
  }

  // ================================================================================================ Units
  calc(min) { const n = Math.floor(Number(min)); if (!Number.isFinite(n) || n < 0) return '—'; const u = unitsFor(this.s, 'tdt', n); return `${u} unit${u === 1 ? '' : 's'}`; }
  units() {
    const s = this.s; const bands = unitThresholds(s, 'tdt'); const official = rule(s, 'units.tdt.day_tiers'); const alt = rule(s, 'units.tdt.alt_tiers');
    const same = JSON.stringify(official.value) === JSON.stringify(official.default);
    const using = same ? 'Official bands' : JSON.stringify(official.value) === JSON.stringify(alt.value) ? 'Alternate bands (60-minute rule)' : 'Custom bands';
    const bandRows = bands.map(b => `<tr><th scope="row">${esc(b.minutes)} minutes or more</th><td>${b.units} unit${b.units === 1 ? '' : 's'}</td></tr>`).join('');
    let h = `<section class="se-card"><div class="se-bar"><h2 class="se-h2">Daily unit rule</h2><div>${ui.chip(using, { tone: same ? 'success' : 'warning', size: 'sm' })} ${withDate(official)}</div></div>
      <div class="se-two"><div><table class="se-matrix se-matrix--plain"><caption class="ui-sr">Daily direct minutes and units</caption><thead><tr><th scope="col">Direct time in a day</th><th scope="col">Units</th></tr></thead><tbody>${bandRows}</tbody></table>
      <p class="se-foot">Rounded down, at most ${ruleValue(s, 'units.tdt.max_per_day', 3)} a day. ${esc(official.source || '')}</p></div>
      <div class="se-try"><label class="ui-field__l" for="se-min">Try it: direct minutes</label><div class="se-try__row"><input class="ui-input" id="se-min" type="number" min="0" step="5" inputmode="numeric" value="${esc(this.state.minutes)}"><output id="se-min-out" class="se-try__out" aria-live="polite">${esc(this.calc(this.state.minutes))}</output></div>
      <div class="se-try__btns">${same ? `<button type="button" class="ui-btn ui-btn--secondary" data-x="bands" data-mode="alt">Use the alternate bands</button>` : `<button type="button" class="ui-btn ui-btn--secondary" data-x="bands" data-mode="official">Restore the official bands</button>`}<button type="button" class="ui-btn ui-btn--ghost" data-x="rule" data-key="units.tdt.day_tiers">Edit bands</button></div>
      <p class="se-foot">Alternate: ${esc(showValue(alt))} ${withDate(alt)}</p></div></div></section>`;
    h += this.ruleTable('Units', UNIT_KEYS) + this.ruleTable('Deadlines and clocks', CLOCK_KEYS);
    return h;
  }
  ruleTable(title, keys) {
    const rows = keys.map(k => rule(this.s, k)).filter(r => !r.missing);
    return `<section class="se-card"><h2 class="se-h2">${esc(title)}</h2><div class="se-scroll"><table class="se-matrix se-matrix--plain"><caption class="ui-sr">${esc(title)}</caption><thead><tr><th scope="col">Rule</th><th scope="col">Value</th><th scope="col">Source</th><th scope="col">Change</th></tr></thead><tbody>${rows.map(r => `<tr><th scope="row"><span>${esc(r.label)}</span><code>${esc(r.key)}</code></th><td>${esc(showValue(r))}${r.enabled === false ? ' ' + ui.chip('Off', { tone: 'neutral', size: 'sm' }) : ''}</td><td>${withDate(r)}</td><td><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="rule" data-key="${esc(r.key)}">Edit</button></td></tr>`).join('')}</tbody></table></div></section>`;
  }
  setBands(mode, opener) {
    const s = this.s; const alt = rule(s, 'units.tdt.alt_tiers');
    this.askReason({
      title: mode === 'alt' ? 'Use the alternate bands' : 'Restore the official bands', opener, confirmLabel: mode === 'alt' ? 'Use alternate' : 'Restore',
      lead: mode === 'alt' ? `Units are counted from the alternate bands (${esc(showValue(alt))}) from now on. Notes already processed are not recounted.` : 'Units are counted from the official bands from now on. Notes already processed are not recounted.',
      run: async why => { if (mode === 'alt') await this.rule('units.tdt.day_tiers', { value: alt.value }, why); else await this.rule('units.tdt.day_tiers', { reset: true }, why); this.toast(mode === 'alt' ? 'Alternate bands in use' : 'Official bands restored'); }
    });
  }

  // ================================================================================================ Rules
  rulesRows() { return (this.s.rules || []).map(r => ({ ...r, area: areaOf(r.key), id: r.key + '|' + (r.scope || '') })); }
  rules() {
    const all = this.rulesRows(); const f = this.state.f;
    const match = r => (!f.cat || r.category === f.cat) && (!f.area || r.area === f.area) && (!f.q || (r.label + ' ' + r.key + ' ' + r.source + ' ' + showValue(r) + ' ' + (r.register || '')).toLowerCase().includes(f.q.toLowerCase()));
    const rows = all.filter(match);
    const areas = [...new Set(all.map(r => r.area))].sort();
    const bar = ui.filterBar({ id: 'se-rules-f', search: { key: 'q', placeholder: 'Search rules' }, chips: CATEGORY_CHIPS.map(([v, l]) => ({ key: 'cat', value: v, label: l, count: all.filter(r => r.category === v).length })), selects: [{ key: 'area', label: 'Area', options: [['', 'All areas'], ...areas.map(a => [a, a])] }], state: f, shown: rows.length, total: all.length, noun: 'rules', onChange: nf => this.setState({ f: nf }) });
    const cols = [
      { key: 'label', label: 'Rule', primary: true, sort: true, render: r => `<b>${esc(r.label)}</b><small class="se-sub">${esc(r.area)} · ${esc(r.key)}${r.register ? ' · ' + esc(r.register) : ''}</small>` },
      { key: 'value', label: 'Value', render: r => `<span>${esc(showValue(r))}</span>${r.enabled === false ? ' ' + ui.chip('Off', { tone: 'neutral', size: 'sm' }) : ''}${(r.history || []).length ? ' ' + ui.chip('Changed', { tone: 'info', size: 'sm' }) : ''}` },
      { key: 'category', label: 'Source', sort: true, render: r => ui.sourceChip(r) },
      { key: 'verified', label: 'Verified', hideBelow: 1024, render: r => r.verified_on ? esc(M.fmtDate(r.verified_on, { year: true })) : '<span class="se-muted">Not verified</span>' },
      { key: 'act', label: 'Change', render: r => `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="rule" data-key="${esc(r.key)}">Edit</button>` }
    ];
    const sorted = this.state.sort ? ui.sortRows(rows, this.state.sort, { label: r => r.label, category: r => r.category }) : rows;
    return `<section class="se-card">${bar}${ui.queueTable({ id: 'se-rules', caption: 'Rules table', columns: cols, rows: sorted, rowId: r => r.id, sort: this.state.sort, onSort: sort => this.setState({ sort }), maxHeight: 'none', empty: { title: 'No rule matches', body: 'Clear a filter to see more.' } })}<p class="se-foot">A change is kept with its reason and applies from now on. Stored dates and counts are not recomputed.</p></section>`;
  }
  editRule(key, opener) {
    const r = rule(this.s, key); if (r.missing) return;
    const k = editorKind(r);
    const ctl = k === 'boolean' ? `<select class="ui-select" id="se-rv"><option value="true"${r.value ? ' selected' : ''}>On</option><option value="false"${!r.value ? ' selected' : ''}>Off</option></select>`
      : k === 'choice' && choicesOf(r).length ? `<select class="ui-select" id="se-rv">${choicesOf(r).map(c => `<option value="${esc(c)}"${c === r.value ? ' selected' : ''}>${esc(MODE_LABEL[c] || c.replace(/_/g, ' '))}</option>`).join('')}</select>`
      : k === 'number' ? `<input class="ui-input" id="se-rv" type="number" min="0" step="1" inputmode="decimal" value="${esc(editorText(r))}">`
      : k === 'list' || k === 'json' || k === 'long' ? `<textarea class="ui-input ui-textarea" id="se-rv" rows="${k === 'long' ? 3 : 5}">${esc(editorText(r))}</textarea>`
      : `<input class="ui-input" id="se-rv" value="${esc(editorText(r))}">`;
    const hint = k === 'list' ? 'One item per line.' : k === 'json' ? 'JSON. Unit bands are [[minutes, units], ...], both increasing.' : '';
    const hist = (r.history || []).slice().reverse();
    const body = `<div class="se-rulehead">${ui.sourceChip(r)} ${r.register ? `<span class="se-muted">Register ${esc(r.register)}</span>` : ''} <span class="se-muted">${esc(r.verified_on ? 'Checked ' + M.fmtDate(r.verified_on, { year: true }) : 'Not verified')}</span></div>
      <dl class="ui-dl"><div class="ui-dl__r"><dt>Source</dt><dd>${esc(r.source || 'Not recorded')}</dd></div>${r.note ? `<div class="ui-dl__r"><dt>Note</dt><dd>${esc(r.note)}</dd></div>` : ''}<div class="ui-dl__r"><dt>Unit</dt><dd>${esc(r.unit || '—')}</dd></div><div class="ui-dl__r"><dt>Default</dt><dd>${esc(showValue({ ...r, value: r.default }))}</dd></div></dl>
      <div class="ui-field"><label class="ui-field__l" for="se-rv">Value</label>${ctl}${hint ? `<div class="ui-field__h">${hint}</div>` : ''}</div>
      <div class="ui-field"><label class="se-check"><input type="checkbox" id="se-en"${r.enabled !== false ? ' checked' : ''}> In use</label></div>
      <div class="ui-field"><label class="ui-field__l" for="se-why">Why are you changing it?</label><textarea class="ui-input ui-textarea" id="se-why" rows="2"></textarea></div><div class="se-err" id="se-rerr" role="alert"></div>
      ${hist.length ? `<details class="se-acc"><summary>History ${ui.chip(String(hist.length), { tone: 'neutral', size: 'sm' })}</summary><ul class="se-list">${hist.map(x => `<li><div><b>${esc(M.fmtDateTime(x.at))}</b> ${esc(this.staffName(x.by))}<small class="se-sub">${esc(JSON.stringify(x.from))} to ${esc(JSON.stringify(x.to))} · ${esc(x.reason)}</small></div></li>`).join('')}</ul></details>` : ''}`;
    const save = async (h, reset) => {
      const q = x => h.dialog.querySelector(x); const err = q('#se-rerr'); err.textContent = '';
      const why = q('#se-why').value.trim(); if (why.length < 4) { err.textContent = 'Say why. It is kept in the audit log.'; q('#se-why').focus(); return false; }
      try {
        const patch = reset ? { reset: true } : { value: parseValue(r, k === 'boolean' ? q('#se-rv').value === 'true' : q('#se-rv').value), enabled: q('#se-en').checked };
        await this.rule(key, patch, why); this.toast(reset ? `${r.label} · back to the default` : `${r.label} saved · applies from now on`);
      } catch (e) { err.textContent = e.message; return false; }
    };
    ui.drawer({ title: r.label, returnFocus: opener, body, initialFocus: '#se-rv', actions: [{ label: 'Reset to default', tone: 'secondary', onClick: h => save(h, true) }, { label: 'Save', tone: 'primary', onClick: h => save(h, false) }] });
  }
  toggleRule(key, opener) {
    const r = rule(this.s, key);
    this.askReason({ title: r.label, opener, confirmLabel: r.value ? 'Turn off' : 'Turn on', lead: `Now ${r.value ? 'on' : 'off'}. ${esc(r.note || '')}`, run: async why => { await this.rule(key, { value: !r.value }, why); this.toast(`${r.label} · ${r.value ? 'off' : 'on'}`); } });
  }

  // ================================================================================================ Audit
  auditRows() {
    const s = this.s; const a = this.state.a;
    // the server masks quoted text in events for roles without note access; a rule change keeps its values in the rule's own history, so rebuild its line from there
    const hist = new Map(); for (const r of s.rules || []) for (const h of r.history || []) hist.set(h.at + '|' + h.by, { r, h });
    const val = (r, v) => showValue({ ...r, value: v });
    const rows = (s.events || []).map((e, i) => {
      const x = e.record === 'rules' ? hist.get(e.at + '|' + e.who) : null;
      const what = x ? `Rule changed: ${x.r.label} · ${val(x.r, x.h.from)} → ${val(x.r, x.h.to)}${x.h.enabled === false ? ' · off' : ''} (${x.h.reason}) · applies from now on` : e.what;
      return { ...e, what, i, kind: e.refused ? 'refused' : e.actor_kind || 'system' };
    });
    rows.sort((x, y) => String(y.at).localeCompare(String(x.at)) || y.i - x.i);
    const kindOk = r => !a.kind || (a.kind === 'bridge' ? ['bridge', 'integration'].includes(r.kind) : r.kind === a.kind);
    const q = a.q.toLowerCase();
    return rows.filter(r => kindOk(r) && (!a.sim || r.sim) && (!a.who || r.who === a.who) && (!q || (String(r.what) + ' ' + r.record + ' ' + this.staffName(r.who)).toLowerCase().includes(q)));
  }
  // a record id is a link only when this role may open the screen it leads to (after the redirect table); otherwise it is plain text
  recordLink(rec) {
    const to = /^R-\d+$/.test(rec) ? 'Authorizations.dc.html?id=' + rec : /^REF-\d+$/.test(rec) ? 'Referral.dc.html?id=' + rec : M.byId(this.s.staff, rec) ? 'Settings.dc.html?tab=people' : rec === 'rules' ? 'Settings.dc.html?tab=rules' : '';
    if (!to) return '';
    const [id0, qs] = to.split('?'); const id = id0.replace(/\.dc\.html$/, '');
    const r = resolveRoute({ id, params: Object.fromEntries(new URLSearchParams(qs || '')) }, { role: this.actor && this.actor.role });
    const target = r.presenter ? id : r.id;
    return BY_ID[target] && canOpen(target) ? hrefFor(to) : '';
  }
  audit() {
    const s = this.s; const a = this.state.a; const all = (s.events || []);
    const rows = this.auditRows();
    const whos = [...new Set(all.map(e => e.who).filter(Boolean))].sort((x, y) => this.staffName(x).localeCompare(this.staffName(y)));
    const kinds = [['person', 'Person'], ['portal', 'Portal'], ['system', 'System'], ['bridge', 'Bridge'], ['demo', 'Demo'], ['refused', 'Refused']];
    const kindCount = k => all.filter(e => (e.refused ? 'refused' : e.actor_kind || 'system') === k || (k === 'bridge' && e.actor_kind === 'integration' && !e.refused)).length;
    const bar = ui.filterBar({ id: 'se-audit-f', search: { key: 'q', placeholder: 'Search the log' }, chips: [...kinds.map(([v, l]) => ({ key: 'kind', value: v, label: l, count: kindCount(v) })), { key: 'sim', value: '1', label: 'Simulated', count: all.filter(e => e.sim).length }], selects: [{ key: 'who', label: 'Who', options: [['', 'Everyone'], ...whos.map(w => [w, this.staffName(w)])] }], state: a, shown: rows.length, total: all.length, noun: 'events', onChange: nf => this.setState({ a: nf, auditLimit: 25 }) });
    const cols = [
      { key: 'at', label: 'When', primary: true, render: r => `<span class="ui-num">${esc(M.fmtDate(r.at))}${String(r.at).includes('T') ? `<small class="se-sub">${esc(M.fmtTime(r.at))}</small>` : ''}</span>` },
      { key: 'who', label: 'Who', render: r => `<span class="se-who"><b>${esc(this.staffName(r.who))}</b>${ui.chip(KIND_LABEL[r.kind] || (r.kind === 'refused' ? 'Refused' : r.kind), { tone: r.kind === 'refused' ? 'danger' : 'neutral', size: 'sm' })}${r.sim ? ui.chip('Simulated', { tone: 'info', size: 'sm' }) : ''}</span>` },
      { key: 'what', label: 'What', render: r => esc(r.what) },
      { key: 'record', label: 'Record', hideBelow: 1024, render: r => { const h = this.recordLink(r.record); return r.record ? (h ? `<a class="ui-linkbtn" href="${esc(h)}">${esc(r.record)}</a>` : esc(r.record)) : ''; } }
    ];
    return `<section class="se-card"><div class="se-bar"><h2 class="se-h2">Audit log ${ui.chip('Append only', { tone: 'neutral', size: 'sm', icon: 'lock' })}</h2><button type="button" class="ui-btn ui-btn--secondary" data-x="csv">Download CSV</button></div>${bar}${ui.queueTable({ id: 'se-audit', caption: 'Audit log, newest first', columns: cols, rows: rows.slice(0, this.state.auditLimit), rowId: r => r.i, maxHeight: 'none', empty: { title: 'No events match', body: 'Clear a filter to see more.' } })}${rows.length > this.state.auditLimit ? `<div class="se-more"><span class="ui-num">Showing ${this.state.auditLimit} of ${rows.length}</span> <button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="moreAudit">Show 50 more</button></div>` : ''}</section>`;
  }
  csv() {
    const rows = this.auditRows(); const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [['when', 'who', 'actor_kind', 'simulated', 'record', 'what'].join(','), ...rows.map(r => [r.at, this.staffName(r.who), r.kind, r.sim ? 'yes' : 'no', r.record, r.what].map(q).join(','))];
    const blob = new Blob([lines.join('\n') + '\n'], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `audit-log-${clockToday(this.s)}.csv`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    this.toast(`${rows.length} events downloaded`);
  }

  // ================================================================================================ Family link
  setMode(key, value, opener) {
    const r = rule(this.s, key); if (r.value === value) return;
    const doc = (DOC_MODES.find(x => x[0] === key) || [, r.label])[1];
    this.askReason({ title: `${doc} · ${MODE_LABEL[value]}`, opener, confirmLabel: 'Save', lead: value === 'in_person_required' ? 'The family screens will ask for an in-person signature. A remote signature is never shown as meeting it.' : 'Guardians can sign on their phone. This policy is not validated with Harvest.', run: async why => { await this.rule(key, { value }, why); this.toast(`${doc} · ${MODE_LABEL[value]}`); } });
  }
  async familyQ(key, what) {
    const q = (((this.s.settings || {}).family_link || {}).questions || []).find(x => x.key === key); if (!q) return;
    if (what === 'ask') await this.do('settings.familyQuestion', { key, ask: q.ask === false });
    else await this.do('settings.familyQuestion', { key, required: !q.required });
  }
  family() {
    const s = this.s;
    const modes = DOC_MODES.map(([key, label]) => { const r = rule(s, key); const v = r.value; return `<tr><th scope="row"><span>${esc(label)}</span><small class="se-sub">${esc(r.source || '')}</small></th><td><div class="se-seg" role="group" aria-label="${esc(label)} signature mode">${['remote_allowed', 'in_person_required'].map(m => `<button type="button" class="se-seg__b" data-x="mode" data-key="${esc(key)}" data-value="${m}" aria-pressed="${v === m}">${esc(MODE_LABEL[m])}</button>`).join('')}</div>${v === 'pending_validation' ? ui.chip('Pending validation', { tone: 'warning', size: 'sm' }) : ''}</td><td>${ui.chip('Policy not validated', { tone: 'warning', size: 'sm', icon: 'alert' })} ${withDate(r)}</td></tr>`; }).join('');
    const qs = ((s.settings || {}).family_link || {}).questions || [];
    const exp = rule(s, 'family_link.expires_days'); const rec = rule(s, 'recording.require_consent_record'); const p2p = rule(s, 'p2p.recording_enabled');
    const sw = (on, key, what, label, disabled, why) => { const id = 'se-why-' + key + '-' + what; return `<button type="button" class="se-sw" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-x="fq" data-key="${esc(key)}" data-what="${what}"${disabled ? ` disabled title="${esc(why || 'Not available')}" aria-describedby="${id}"` : ''}><i aria-hidden="true"></i></button>${disabled ? `<span class="se-asof" id="${id}">${esc(why || 'Not available')}</span>` : ''}`; };
    let h = `<section class="se-card"><h2 class="se-h2">Guardian signatures</h2><div class="se-scroll"><table class="se-matrix se-matrix--plain"><caption class="ui-sr">Signature mode per document type</caption><thead><tr><th scope="col">Document</th><th scope="col">Mode</th><th scope="col">Status</th></tr></thead><tbody>${modes}</tbody></table></div><p class="se-foot">Switching a document to In person changes the family screens for it. Every change asks why and is audited.</p></section>`;
    h += `<section class="se-card"><h2 class="se-h2">What the family link asks</h2><div class="se-scroll"><table class="se-matrix se-matrix--plain"><caption class="ui-sr">Questions on the family link</caption><thead><tr><th scope="col">Question</th><th scope="col">Ask</th><th scope="col">Required</th><th scope="col">Goes to</th></tr></thead><tbody>${qs.map(q => `<tr><th scope="row"><span>${esc(q.label)}</span>${q.sub ? `<small class="se-sub">${esc(q.sub)}</small>` : ''}</th><td>${sw(q.ask !== false, q.key, 'ask', 'Ask: ' + q.label, q.locked, 'Always on: it runs the eligibility check')}</td><td>${sw(q.ask !== false && !!q.required, q.key, 'req', 'Required: ' + q.label, q.locked || q.ask === false, q.locked ? 'Always on: it runs the eligibility check' : 'Turn on Ask first')}</td><td class="se-muted">${esc(q.goes || '')}</td></tr>`).join('')}<tr><th scope="row"><span>Any question about behavior, diagnosis or history</span></th><td colspan="3">${ui.chip('Not allowed', { tone: 'neutral', size: 'sm', icon: 'lock' })}</td></tr></tbody></table></div></section>`;
    h += `<section class="se-card"><h2 class="se-h2">Link and recording</h2><div class="se-scroll"><table class="se-matrix se-matrix--plain"><caption class="ui-sr">Link expiry and recording consent</caption><thead><tr><th scope="col">Setting</th><th scope="col">Now</th><th scope="col">Source</th><th scope="col">Change</th></tr></thead><tbody>
      <tr><th scope="row"><span>${esc(exp.label)}</span></th><td>${esc(showValue(exp))}</td><td>${withDate(exp)}</td><td><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="rule" data-key="family_link.expires_days">Edit</button></td></tr>
      <tr><th scope="row"><span>Recording needs a recorded consent</span><small class="se-sub">Off by default until the consent policy and the BAA are settled</small></th><td>${esc(showValue(rec))}</td><td>${withDate(rec)}</td><td><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="rulebool" data-key="recording.require_consent_record">${rec.value ? 'Turn off' : 'Turn on'}</button></td></tr>
      <tr><th scope="row"><span>${esc(p2p.label)}</span></th><td>${esc(showValue(p2p))}</td><td>${withDate(p2p)}</td><td><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="rulebool" data-key="p2p.recording_enabled">${p2p.value ? 'Turn off' : 'Turn on'}</button></td></tr></tbody></table></div></section>`;
    return h;
  }

  // ================================================================================================ Presenter
  presenter() {
    const lv = LEVEL_ORDER.map(l => { const n = Object.values(MATURITY).filter(m => m.level === l).length; return `<li>${ui.maturity({ level: l, note: '' }, { className: 'is-forced' })}<span class="se-sub">${esc(LEVELS[l].tip)} · ${n} features</span></li>`; }).join('');
    const on = !!(window.psyflo && window.psyflo.dock && window.psyflo.dock.maturityOn);
    const link = d => { if (!d) return '<span class="se-muted">Not configurable</span>'; const [tab, q] = d; return `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="#/Settings?tab=${tab}${q ? '&q=' + q : ''}">Open the setting</a>`; };
    let h = `<section class="se-card"><h2 class="se-h2">How it fits</h2><p class="se-lead">If it is a Lauris form, the extension writes it. If it is not, it lives in the Psyflo app. Portals are for people without a Lauris login.</p><div class="se-cards">${SURFACES.map(([t, b]) => `<article class="se-mini"><h3>${esc(t)}</h3><p>${esc(b)}</p></article>`).join('')}</div><p class="se-foot"><a class="ui-linkbtn" href="#/WhereThingsLive?full=1">Open the full page</a> · <button type="button" class="ui-linkbtn" data-x="notes">How the data gets in</button></p></section>`;
    h += `<section class="se-card"><h2 class="se-h2">Architecture</h2><dl class="se-arch">${ARCH.map(([t, b]) => `<div><dt>${esc(t)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></section>`;
    h += `<section class="se-card"><div class="se-bar"><h2 class="se-h2">Maturity</h2><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="maturity" aria-pressed="${on}">${on ? 'Hide chips on every screen' : 'Show chips on every screen'}</button></div><ul class="se-levels">${lv}</ul></section>`;
    h += `<section class="se-card"><h2 class="se-h2">Unresolved decisions ${ui.chip(String(DECISIONS.filter(d => d[3] === 'Validate').length) + ' to validate', { tone: 'warning', size: 'sm' })}</h2><div class="se-decs">${DECISIONS.map(([q, ships, who, status, to]) => `<article class="se-dec"><div class="se-dec__h"><h3>${esc(q)}</h3>${ui.chip(status, { tone: status === 'Decided' ? 'success' : 'warning', size: 'sm' })}</div><dl><div><dt>The demo ships</dt><dd>${esc(ships)}</dd></div><div><dt>Who answers</dt><dd>${esc(who)}</dd></div></dl>${link(to)}</article>`).join('')}</div></section>`;
    return h;
  }
});
