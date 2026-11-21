/* Settings (route 'settings?tab=general|roles|rates|audit|privacy') and Help (route 'help'). Admin only: other roles get "No access"
   unless the admin turns Settings on for them (PSY.can('settings')); the Roles tab is for the admin role only.
   General   profile (the current role's person), notification switches (PSY.state.prefs.notify) with the weekly email (PSY.anr.weekly,
             shared with Analytics), the low-units warning (prefs.lowDays), localities and the family link.
   Roles     round 9: PSY.ROLE_ORDER × PSY.FEATURES switches in three groups (Platform · Consumers and records · Extension), incl.
             clinicalRecords and denials (Denial Intelligence) → PSY.setPerm(role, feature, on); defaults PSY.PERMS, read through PSY.can.
             The admin keeps Psyflo platform and Settings. Changes apply at once (nav tabs, extension buttons, clinical content).
             "What each role can do": a readable summary per role, derived from PSY.can, with View as.
   Units and rates   unit rules per service (PSY.time.rulesHtml from src/time.js / 63-ext-time.js: T9's editor writes PSY.state.timeRules),
             reimbursement rate per payer × service, PSY.state.rates['<payer>|<service>'] (and '*|<service>' as a default). Empty by default;
             PSY.money.exposure stays unavailable until a rate is entered. Every change is audited. Clear empties them.
   Audit     PSY.audit.all(): action, timestamp, user or system, document, resulting status, case. Filters (case, user vs system), Copy as CSV.
   Privacy   three facts: consumers shown as initials only, submissions and eligibility checks simulated, FLO's agent simulated on the demo record.
   Round 11: FLO (the data agent, an add-on) sits in the Platform group; Help and Privacy no longer mention Analytics reports (the report builder is gone).
   Round 8 removed: the "Units by service and payer" tab (payer logic is set up by Psyflo in the back end; PSY.state.unitOverrides still read by PSY.auth.service).
   Acts: p1-toggle, p1-lowdays, p1-faq, st-perm, st-perm-reset, st-rate, st-rates-clear, st-au-case, st-au-who, st-au-csv (an-weekly lives in 85-analytics-data.js). */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const P = () => PSY.p1;
  const ME = () => (PSY.r5 && PSY.r5.ME) || 'J. Perez, LPC';
  const SYS = () => (PSY.r5 && PSY.r5.SYS) || 'Psyflo (system)';
  const R5 = () => PSY.data.r5 || {};

  const NOTIFY = [
    ['sign', 'A request is waiting for my signature', true],
    ['info', 'A payer asks for more information', true],
    ['decision', 'A decision arrives, or no decision has arrived', true],
    ['low', 'A consumer is running low on units', true],
    ['reco', 'Missing clinical information is found', false],
  ];
  const LOCS = [['Campbell County', 'Tax ID 00-1234567', 'Campbell ES-1, MS-1 and HS-1'], ['Lynchburg City', 'Tax ID 00-7654321', 'Lynchburg ES-3 and MS-2']];
  const notify = () => { const p = (PSY.state.prefs = PSY.state.prefs || {}); p.notify = p.notify || {}; return p.notify; };
  const isOn = (k, d) => { const n = notify(); return n[k] == null ? d : !!n[k]; };
  const ALL_TABS = [['general', 'General'], ['roles', 'Roles'], ['payers', 'Payers'], ['rates', 'Units and rates'], ['audit', 'Audit trail'], ['privacy', 'Data and privacy']];
  const isAdmin = () => PSY.role() === 'admin';
  /* every role has General (their own account); the other sections are for users with the settings permission (the admin) */
  const tabs = () => ALL_TABS.filter((t) => t[0] === 'general' || (PSY.can('settings') && (t[0] !== 'roles' || isAdmin())));
  const SVCS = () => ['tdt', 'tdt-ug', 'op'].map((k) => R5().services[k]).filter(Boolean);
  const PAYERS = () => Object.keys(PSY.data.payers).filter((k) => PSY.data.payers[k].mco); // round 13: the five Virginia Medicaid MCOs only
  const payerName = (id) => (id === '*' ? 'Any payer (default)' : (PSY.data.payers[id] || {}).name || id);
  const svcName = (k) => ((R5().services || {})[k] || {}).short || k;
  const AU = { c: 'all', who: 'all' };

  const CSS = `
  .p1-st .card-h{padding:18px 22px 12px;border-bottom:0;flex-wrap:wrap;row-gap:6px}
  .p1-st .p1-sm2{font-size:13px;color:#6B665E;margin-top:3px}
  .p1-st .sr{display:flex;gap:16px;align-items:center;padding:14px 22px;border-top:1px solid #EFE8DE}
  .p1-st .sr>div:first-child{flex:1;min-width:0}
  .p1-st .sr b{display:block;font-weight:600;font-size:14.5px}
  .p1-st .sr span.d{display:block;font-size:13px;color:#6B665E;margin-top:2px}
  .p1-st .prof{display:flex;gap:18px;align-items:center;padding:6px 22px 22px;flex-wrap:wrap}
  .p1-st .av{width:56px;height:56px;border-radius:50%;background:#1D4F43;color:#fff;font-weight:600;font-size:18px;display:flex;align-items:center;justify-content:center;flex:0 0 56px}
  .p1-st .kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 24px;flex:1 1 420px}
  .p1-st .kv .l{font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:#8A857B;margin-bottom:3px}
  .p1-st .kv .v{font-size:14px}
  .p1-st .two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px;align-items:start}
  .p1-st select.fld{min-width:150px}
  .st-tb{width:100%;border-collapse:collapse;font-size:13.5px;table-layout:fixed}
  .st-tb th{text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6B665E;font-weight:600;padding:10px 12px;border-bottom:1px solid #EFE8DE;background:#FCFAF6}
  .st-tb td{padding:10px 12px;border-top:1px solid #EFE8DE;vertical-align:top;line-height:1.4;overflow-wrap:anywhere}
  .st-tb tbody tr:first-child td{border-top:0}
  .st-tb th:first-child,.st-tb td:first-child{padding-left:22px}.st-tb th:last-child,.st-tb td:last-child{padding-right:22px}
  .st-tb .sub{display:block;color:#6B665E;font-size:12px}
  .st-rate{display:flex;align-items:center;gap:6px}
  .st-rate span{color:#6B665E}
  .st-rate input{width:100%;max-width:120px;font:inherit;font-size:13.5px;border:1px solid #E0D6C9;border-radius:8px;padding:7px 9px;background:#fff;color:#1B1B19;font-variant-numeric:tabular-nums}
  .st-rate input:focus{outline:2px solid #1D4F43;outline-offset:1px}
  .st-rate input.set{border-color:#1D4F43;background:#F4F9F6}
  .st-rate input[aria-invalid=true]{border-color:#B23A22;background:#FBE7E2}
  .st-note{margin:0 22px 14px;padding:10px 12px;border-radius:10px;background:#FBF3DF;border:1px solid #F0DFB4;font-size:13.5px;line-height:1.45}
  .st-note.g{background:#F4F9F6;border-color:#D5E5DC}
  .st-foot{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:14px 22px 18px;border-top:1px solid #EFE8DE}
  .st-foot .sp{flex:1}
  .st-prev{padding:4px 22px 18px;font-size:13.5px;line-height:1.5}
  .st-prev b.big{display:block;font-family:'Newsreader',Georgia,serif;font-size:28px;font-weight:600;margin:2px 0}
  .st-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px;padding:4px 22px 18px}
  .st-form label{display:flex;flex-direction:column;gap:5px;font-size:12.5px;font-weight:700;color:#4A453D}
  .st-form label.w{grid-column:1/-1}
  .st-form input,.st-form select{font:inherit;font-size:13.5px;font-weight:400;border:1px solid #E0D6C9;border-radius:8px;padding:8px 10px;background:#fff;color:#1B1B19;min-width:0}
  .st-err{grid-column:1/-1;color:#8A2E1C;font-size:12.5px;font-weight:600}
  .st-err:empty{display:none}
  .st-filt{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:0 22px 14px}
  .st-filt label{font-size:12.5px;font-weight:700;color:#4A453D;display:flex;gap:8px;align-items:center}
  .st-filt .sp{flex:1}
  .st-au{max-height:560px;overflow:auto;border-top:1px solid #EFE8DE}
  .st-au .st-tb th{position:sticky;top:0;z-index:1}
  .st-sys{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;border-radius:999px;padding:1px 8px;background:#E6EEF8;color:#24476E}
  .st-usr{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;border-radius:999px;padding:1px 8px;background:#E3EFEA;color:#1D4F43}
  .st-pv{padding:4px 22px 18px;margin:0;display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.55}
  .st-pv li{list-style:none;display:flex;gap:10px}.st-pv li svg{flex:0 0 18px;margin-top:3px;color:#1D4F43}
  .st-pm th.c,.st-pm td.c{text-align:center}
  .st-pm td{padding-top:7px;padding-bottom:7px;vertical-align:middle}
  .st-pm tr.st-grp td{background:#FCFAF6;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#6B665E;font-weight:600;padding-top:9px;padding-bottom:9px}
  .st-pm b{font-weight:500}
  .st-pc{position:relative;display:inline-flex;align-items:center}
  .st-pc .p1-sw[disabled]{opacity:.45;cursor:default}
  .st-chg{position:absolute;right:-12px;top:-2px;width:7px;height:7px;border-radius:50%;background:#C98A12}
  .p1-st .st-av{width:34px;height:34px;flex:0 0 34px;border-radius:50%;background:#E3EFEA;color:#1D4F43;font-weight:600;font-size:12.5px;display:inline-flex;align-items:center;justify-content:center}
  .st-rs{padding:14px 22px;border-top:1px solid #EFE8DE;display:flex;flex-direction:column;gap:6px}
  .st-rs-h{display:flex;gap:12px;align-items:center;margin-bottom:2px}
  .st-rs-h>div{flex:1;min-width:0}.st-rs-h b{display:block;font-weight:600;font-size:14.5px}.st-rs-h .d{display:block;font-size:13px;color:#6B665E}
  .st-rs-r{display:grid;grid-template-columns:88px minmax(0,1fr);gap:10px;font-size:13px;line-height:1.45;padding-left:46px}
  .st-rs-r span{color:#6B665E}.st-rs-r b{font-weight:500;color:#1B1B19}
  .st-ur{padding:4px 22px 18px}
  @media (max-width:1100px){.p1-st .two{grid-template-columns:1fr}}
  `;
  const sw = (k, on, label) => '<button type="button" class="p1-sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(label) + '" data-act="p1-toggle" data-k="' + k + '"></button>';
  const tabOf = (params) => (tabs().some((t) => t[0] === (params && params.tab)) ? params.tab : 'general');
  const tabsHtml = (cur) => '<div class="p1-tabs" role="tablist" aria-label="Settings sections">' + tabs().map(([k, l]) => '<button type="button" role="tab" class="p1-tab' + (k === cur ? ' on' : '') + '" aria-selected="' + (k === cur) + '" data-go="settings' + (k === 'general' ? '' : '?tab=' + k) + '">' + esc(l) + (k === 'audit' && PSY.audit ? ' <span class="n">' + PSY.audit.all().length + '</span>' : '') + '</button>').join('') + '</div>';
  const emailOf = (u) => (PSY.anr && PSY.anr.emailOf ? PSY.anr.emailOf(u) : '');
  const weeklySw = () => { const on = !PSY.anr || PSY.anr.weekly(); return '<button type="button" class="p1-sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="Weekly email · Mondays" data-act="an-weekly"></button>'; };

  /* ---------------- General: each user's own account (profile, sign-in and security, notifications); the admin also gets localities and the family link ---------------- */
  const signOutMin = () => (PSY.state.prefs && PSY.state.prefs.signOutMinutes) || 30;
  function generalTab() {
    const low = P().lowDays(); const u = PSY.user(); const full = PSY.can('settings');
    const kv = (l, v) => '<div><div class="l">' + esc(l) + '</div><div class="v">' + esc(v) + '</div></div>';
    const prof = '<section class="card" data-st="profile"><div class="card-h"><h2>Profile</h2></div><div class="prof"><div class="av">' + esc(u.ini) + '</div><div class="kv">' +
      kv('Name', u.name) + kv('Title', u.cred) + kv('Organization', 'Harvest Outreach Center') + kv('Email', emailOf(u)) + kv('Role', u.label) + kv('Lauris user', u.lauris) + '</div></div></section>';
    const sec = '<section class="card" data-st="security"><div class="card-h"><h2>Sign-in and security</h2></div>' +
      '<div class="sr" data-st="password"><div><b>Password</b><span class="d">Change the password you use to sign in</span></div><button type="button" class="btn o s" data-act="st-pw">Change password</button></div>' +
      '<div class="sr" data-st="2fa"><div><b>Two-factor authentication</b><span class="d">Not set up</span></div><button type="button" class="btn o s" data-act="st-2fa">Set up</button></div>' +
      '<div class="sr" data-st="timeout"><div><b>Sign out after inactivity</b><span class="d">Your session ends after this much time away</span></div>' +
      '<select class="fld" id="p1-signout" aria-label="Sign out after inactivity">' + [15, 30, 60].map((n) => '<option value="' + n + '"' + (n === signOutMin() ? ' selected' : '') + '>' + n + ' minutes</option>').join('') + '</select></div>' +
      '<div class="sr"><div><b>Sign out</b><span class="d">End this session on this device</span></div><button type="button" class="btn o s" data-act="st-signout">Sign out</button></div>' +
      '<p class="p1-mut" style="margin:0;padding:12px 22px 16px;font-size:12.5px">Simulated: no password is changed, two-factor is not connected and the inactivity timer does not run in this demo.</p></section>';
    const notes = '<section class="card"><div class="card-h"><h2>Notifications</h2></div>' +
      (PSY.can('analytics') ? '<div class="sr" data-st="weekly"><div><b>Weekly email · Mondays</b><span class="d">Renewals and analytics</span></div>' + weeklySw() + '</div>' : '') +
      NOTIFY.map((n) => '<div class="sr"><div><b>' + esc(n[1]) + '</b></div>' + sw(n[0], isOn(n[0], n[2]), n[1]) + '</div>').join('') +
      '<div class="sr"><div><b>Warn me about units at</b></div>' +
      '<select class="fld" id="p1-lowdays" aria-label="Units warning in school days">' + [5, 7, 10, 14].map((n) => '<option value="' + n + '"' + (n === low ? ' selected' : '') + '>' + n + ' school days</option>').join('') + '</select></div></section>';
    if (!full) return prof + '<div style="display:flex;flex-direction:column;gap:20px">' + sec + notes + '</div>';
    const locs = '<section class="card"><div class="card-h"><h2>Localities</h2></div>' +
      LOCS.map((l) => '<div class="sr"><div><b>' + esc(l[0]) + '</b><span class="d">' + esc(l[2]) + '</span></div><span class="p1-mut" style="font-size:13.5px">' + esc(l[1]) + '</span></div>').join('') + '</section>';
    const conn = '<section class="card" data-st="family"><div class="card-h"><div><h2>Family link</h2></div></div>' +
      '<div class="sr"><div><b>Family link</b></div><button type="button" class="btn o s" data-go="family-settings">Open</button></div></section>';
    return prof + '<div class="two">' + notes + '<div style="display:flex;flex-direction:column;gap:20px">' + sec + locs + conn + '</div></div>';
  }

  /* ---------------- Roles (admin only): roles × features, and what each role can do ---------------- */
  const GROUPS = [['Platform', /^(platform|auth|denials|analytics|flow|settings)$/], ['Consumers and records', /^(allConsumers|clinicalRecords)$/], ['Extension', /^(enhance|cases|time|scribe:.*)$/]];
  const SHORT = { platform: 'Platform', allConsumers: 'All consumers', clinicalRecords: 'Clinical records', time: 'Track Time', enhance: 'Scan & Enhance', cases: 'SRA stages in Overview' };
  const fLabel = (f) => ((PSY.FEATURES || []).find((x) => x[0] === f) || [f, f])[1];
  const fShort = (f) => SHORT[f] || fLabel(f).replace(/^Scribe · /, '');
  const locked = (r, f) => r === 'admin' && (f === 'settings' || f === 'platform');
  const permChanges = () => { const o = PSY.state.perms || {}; let n = 0; Object.keys(o).forEach((r) => Object.keys(o[r] || {}).forEach((f) => { if (!locked(r, f) && !!o[r][f] !== !!((PSY.PERMS[r] || {})[f])) n++; })); return n; };
  const SCRIBE = [['admission', 'Admission Screening'], ['intake', 'Intake'], ['dpn', 'DPN'], ['collateral', 'Collateral'], ['monthly', 'Monthly']];
  /* a readable summary of one role, from PSY.can (so it follows every switch) */
  PSY.settings5 = PSY.settings5 || {};
  PSY.settings5.roleSummary = (r) => {
    const can = (f) => PSY.can(f, r);
    const sc = SCRIBE.filter((x) => can('scribe:' + x[0])).map((x) => x[1]);
    const ext = [sc.length ? 'Scribe (' + sc.join(', ') + ')' : '', can('time') ? 'Track Time' : '', can('enhance') ? 'Scan & Enhance' : '', can('cases') ? 'SRA stages in Overview' : ''].filter(Boolean);
    const plat = can('platform') ? ['auth', 'denials', 'analytics', 'flow', 'settings'].filter(can).map((f) => (f === 'flow' ? 'FLO' : fLabel(f))) : [];
    const n = PSY.caseload ? PSY.caseload(r).length : 0;
    return { extension: ext.length ? ext.join(' · ') : 'None', platform: plat.length ? plat.join(' · ') : 'None',
      consumers: (can('allConsumers') ? 'All consumers (' + n + ')' : 'Assigned consumers (' + n + ')') + ' · ' + (can('clinicalRecords') ? 'Clinical record content' : 'No clinical record content') };
  };
  function rolesTab() {
    const RO = PSY.ROLE_ORDER, RL = PSY.ROLES;
    const cell = (r, f) => {
      const on = PSY.can(f, r), lk = locked(r, f), chg = !lk && on !== !!((PSY.PERMS[r] || {})[f]);
      return '<td class="c"><span class="st-pc"><button type="button" class="p1-sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + esc(RL[r].label + ' · ' + fLabel(f)) + '" data-act="st-perm" data-r="' + r + '" data-f="' + esc(f) + '"' + (lk ? ' disabled title="Always on for Admin"' : '') + '></button>' + (chg ? '<i class="st-chg" title="Changed from the default" aria-label="Changed from the default"></i>' : '') + '</span></td>';
    };
    const row = (f) => '<tr data-f="' + esc(f) + '"><td><b>' + esc(fLabel(f)) + '</b></td>' + RO.map((r) => cell(r, f)).join('') + '</tr>';
    const fs = (PSY.FEATURES || []).map((x) => x[0]);
    const grp = (label, list) => (list.length ? '<tr class="st-grp"><td colspan="' + (RO.length + 1) + '">' + esc(label) + '</td></tr>' + list.map(row).join('') : '');
    const rest = fs.filter((f) => !GROUPS.some((g) => g[1].test(f)));
    const n = permChanges();
    const matrix = '<section class="card" data-st="roles" style="overflow:hidden"><div class="card-h"><h2>Roles</h2></div>' +
      '<table class="st-tb st-pm"><colgroup><col style="width:34%">' + RO.map(() => '<col>').join('') + '</colgroup><thead><tr><th>Feature</th>' + RO.map((r) => '<th class="c">' + esc(RL[r].label) + '</th>').join('') + '</tr></thead><tbody>' +
      GROUPS.map((g) => grp(g[0], fs.filter((f) => g[1].test(f)))).join('') + grp('Other', rest) + '</tbody></table>' +
      '<div class="st-foot"><span class="p1-sm2" data-st="perm-count">' + (n ? n + (n === 1 ? ' change' : ' changes') + ' from the defaults' : 'Defaults') + '</span><span class="sp"></span><button type="button" class="btn o s" data-act="st-perm-reset"' + (n ? '' : ' disabled') + '>Restore defaults</button></div></section>';
    const kv = (k, v) => '<div class="st-rs-r"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>';
    const users = '<section class="card" data-st="users"><div class="card-h"><h2>What each role can do</h2></div>' +
      RO.map((r) => { const u = RL[r]; const S = PSY.settings5.roleSummary(r); return '<div class="st-rs" data-role="' + r + '" data-role-sum="' + r + '"><div class="st-rs-h"><span class="st-av">' + esc(u.ini) + '</span><div><b>' + esc(u.label) + '</b><span class="d">' + esc(u.name) + '</span></div>' + (PSY.role() === r ? P().chip('g', 'You') : '<button type="button" class="btn o s" data-act="role-set" data-role="' + r + '">View as</button>') + '</div>' +
        kv('Extension', S.extension) + kv('Platform', S.platform) + kv('Consumers', S.consumers) + '</div>'; }).join('') + '</section>';
    return '<div class="two" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr)">' + matrix + users + '</div>';
  }

  /* ---------------- Unit rules (owner T9's panel and editor: PSY.time.rulesHtml / tt-rule-edit, stored in PSY.state.timeRules) ---------------- */
  const unitRulesCard = () => (PSY.time && PSY.time.rulesHtml ? '<section class="card" data-st="unit-rules"><div class="card-h"><h2>Unit rules</h2></div><div class="st-ur">' + PSY.time.rulesHtml({ edit: true, title: false }) + '</div></section>' : '');

  /* ---------------- Reimbursement rates ---------------- */
  const rates = () => (PSY.state.rates = PSY.state.rates || {});
  function previewHtml() {
    const N = PSY.an5; if (!N) return '';
    const X = N.exposure('both');
    return '<b class="big" data-st="exp">' + (X.priced ? esc(PSY.money.fmt(X.amount)) : '—') + '</b><div data-st="exp-text">' + (X.priced ? esc(X.priced + ' of ' + X.auth.length + ' open authorization disputes have a configured rate (' + X.units + ' disputed units in all).') : esc(PSY.money.UNAVAILABLE) + '.') + '</div>';
  }
  function ratesTab() {
    const R = rates(), svcs = SVCS();
    const cell = (payer, s) => { const k = payer + '|' + s.key, v = R[k]; return '<td><div class="st-rate"><span aria-hidden="true">$</span><input type="number" min="0" step="0.01" inputmode="decimal" placeholder="Not set" aria-label="' + esc(payerName(payer) + ' · ' + s.short + ' · dollars per ' + s.unit) + '" data-k="' + esc(k) + '" data-change="st-rate"' + (v != null && v !== '' ? ' class="set" value="' + esc(v) + '"' : '') + '></div></td>'; };
    const rows = ['*'].concat(PAYERS()).map((p) => '<tr data-payer="' + p + '"><td><b>' + esc(payerName(p)) + '</b>' + '' + '</td>' + svcs.map((s) => cell(p, s)).join('') + '</tr>').join('');
    const n = Object.keys(R).filter((k) => R[k] != null && R[k] !== '').length;
    return '<div class="two" style="grid-template-columns:minmax(0,1.9fr) minmax(0,1fr)"><section class="card" data-st="rates" style="overflow:hidden"><div class="card-h"><h2>Reimbursement rates</h2></div>' +
      '<table class="st-tb"><colgroup><col style="width:31%">' + svcs.map(() => '<col>').join('') + '</colgroup><thead><tr><th>Payer</th>' + svcs.map((s) => '<th>' + esc(s.short) + '<span class="sub" style="text-transform:none;letter-spacing:0;font-weight:500">per ' + esc(s.unit) + (s.code ? ' · ' + esc(s.code) : '') + '</span></th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="st-foot"><span class="p1-sm2" data-st="count">' + n + (n === 1 ? ' rate' : ' rates') + ' configured</span><span class="sp"></span><button type="button" class="btn o s" data-act="st-rates-clear"' + (n ? '' : ' disabled') + '>Clear all rates</button></div></section>' +
      '<div style="display:flex;flex-direction:column;gap:20px">' + unitRulesCard() + '<section class="card"><div class="card-h"><h2>Estimated exposure in open disputes</h2></div><div class="st-prev" data-st="preview">' + previewHtml() + '</div>' + (PSY.can('denials') ? '<div class="st-foot"><button type="button" class="btn o s" data-go="denials">Open Denial Intelligence</button></div>' : '') + '</section>' +
      '</div></div>';
  }

  /* ---------------- Audit trail ---------------- */
  const isSys = (e) => e.by === SYS() || /psyflo|system|extension/i.test(e.by || '');
  const statusText = (k) => (!k ? '' : PSY.auth && PSY.auth.STATUS[k] ? PSY.auth.label(k) : String(k));
  const statusHtml = (k) => (!k ? '<span class="p1-mut">—</span>' : PSY.auth && PSY.auth.STATUS[k] ? PSY.auth.badge(k) : esc(k));
  function auditRows() { return (PSY.audit ? PSY.audit.all() : []).filter((e) => (AU.c === 'all' || e.case === AU.c) && (AU.who === 'all' || (AU.who === 'system' ? isSys(e) : !isSys(e)))); }
  function auditTab() {
    const all = PSY.audit ? PSY.audit.all() : []; const cases = Array.from(new Set(all.map((e) => e.case).filter(Boolean))).sort();
    if (AU.c !== 'all' && cases.indexOf(AU.c) < 0) AU.c = 'all';
    const ini = (id) => { const c = PSY.caseView(id); if (c) return c.ini; const r = PSY.data.referrals.find((x) => x.id === id); return r ? r.who.split(',')[0] : ''; };
    const rows = auditRows();
    const tr = (e) => '<tr data-au="1"><td>' + esc(e.action) + '</td><td>' + esc(e.t) + '</td><td>' + (isSys(e) ? '<span class="st-sys">◇ ' + esc(e.by) + '</span>' : '<span class="st-usr">✍ ' + esc(e.by) + '</span>') + '</td><td>' + (e.doc ? esc(e.doc) : '<span class="p1-mut">—</span>') + '</td><td>' + statusHtml(e.status) + '</td><td>' + (e.case ? '<b>' + esc(e.case) + '</b><span class="sub">' + esc(ini(e.case)) + '</span>' : '<span class="p1-mut">—</span>') + '</td></tr>';
    return '<section class="card" data-st="audit" style="overflow:hidden"><div class="card-h"><h2>Audit trail</h2></div>' +
      '<div class="st-filt"><label>Case <select class="fld" id="st-au-case" data-change="st-au-case"><option value="all">All cases</option>' + cases.map((c) => '<option value="' + esc(c) + '"' + (AU.c === c ? ' selected' : '') + '>' + esc(c + (ini(c) ? ' · ' + ini(c) : '')) + '</option>').join('') + '</select></label>' +
      '<label>Done by <select class="fld" id="st-au-who" data-change="st-au-who">' + [['all', 'Anyone'], ['user', 'Staff (a person)'], ['system', 'Psyflo (system)']].map((o) => '<option value="' + o[0] + '"' + (AU.who === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>' +
      '<span class="sp"></span><span class="p1-sm2" data-st="au-count">' + rows.length + (rows.length === 1 ? ' event' : ' events') + '</span><button type="button" class="btn o s" data-act="st-au-csv">Copy as CSV</button></div>' +
      '<div class="st-au" data-scroll="st-au"><table class="st-tb"><colgroup><col style="width:34%"><col style="width:13%"><col style="width:15%"><col style="width:14%"><col style="width:14%"><col style="width:10%"></colgroup><thead><tr><th>Action</th><th>Timestamp</th><th>User or system</th><th>Document</th><th>Resulting status</th><th>Case</th></tr></thead><tbody>' +
      (rows.length ? rows.map(tr).join('') : '<tr><td colspan="6" class="p1-mut">No event matches these filters.</td></tr>') + '</tbody></table></div></section>';
  }
  const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  PSY.settings5.auditCsv = () => [['Action', 'Timestamp', 'User or system', 'Document', 'Resulting status', 'Case']].concat(auditRows().map((e) => [e.action, e.t, e.by, e.doc, statusText(e.status), e.case])).map((r) => r.map(csvCell).join(',')).join('\n');

  /* ---------------- Payers (round 13): the five Virginia Medicaid managed care organizations, as the user listed them ---------------- */
  const MCO_SITE = { aetna: 'Aetna Medicaid', anthem: 'Anthem', humana: 'Humana', sentara: 'Sentara', uhc: '' };
  const MCO_ORDER = ['aetna', 'anthem', 'humana', 'sentara', 'uhc'];
  function payersTab() {
    const PY = PSY.data.payers || {}; const cons = (PSY.data.lauris && PSY.data.lauris.consumers) || [];
    const rows = MCO_ORDER.filter((k) => PY[k]).map((k, i) => { const p = PY[k]; const n = cons.filter((c) => !c.discharged && ((c.case && PSY.caseView && (PSY.caseView(c.case) || {}).payer) || c.payer) === k).length;
      return '<tr data-payer="' + esc(k) + '"><td class="n">' + (i + 1) + '</td><td><b>' + esc(p.mco || p.short) + '</b></td><td>' + esc(p.name) + '</td><td>' + (MCO_SITE[k] ? esc(MCO_SITE[k]) : '<span style="color:#8A8378">—</span>') + '</td><td>' + esc(p.channel || '—') + '</td><td class="n">' + n + '</td></tr>'; }).join('');
    return '<section class="card" data-st="payers" style="overflow:hidden"><div class="card-h"><div><h2>Virginia Medicaid managed care payers</h2><p style="margin:4px 0 0;font-size:13px;color:#6B665E">The five MCOs Harvest bills. Every payer in this demo is one of them.</p></div></div>' +
      '<table class="st-tb" data-st="mco"><colgroup><col style="width:5%"><col style="width:20%"><col style="width:33%"><col style="width:16%"><col style="width:14%"><col style="width:12%"></colgroup>' +
      '<thead><tr><th class="n">#</th><th>Managed care organization</th><th>Medicaid plan name</th><th>Website</th><th>SRA channel</th><th class="n">Consumers</th></tr></thead><tbody>' + rows + '</tbody></table></section>';
  }

  /* ---------------- Data and privacy ---------------- */
  function privacyTab() {
    const ic = P().icons.lock;
    const li = (t) => '<li>' + ic + '<div>' + esc(t) + '</div></li>';
    return '<section class="card" data-st="privacy"><div class="card-h"><h2>Data and privacy</h2></div><ul class="st-pv">' +
      li('Consumers are shown as initials only.') + li('Submissions and eligibility checks are simulated.') + li('FLO’s agent steps and reports are simulated on the demo record.') + '</ul></section>';
  }

  PSY.register({
    id: 'settings', app: 'psyflo', label: 'Settings', url: (p) => 'settings' + (p && p.tab && p.tab !== 'general' ? '/' + p.tab : ''),
    get css() { return P().css + CSS; },
    render(params) {
      const tab = tabOf(params);
      const body = tab === 'roles' ? rolesTab() : tab === 'payers' ? payersTab() : tab === 'rates' ? ratesTab() : tab === 'audit' ? auditTab() : tab === 'privacy' ? privacyTab() : generalTab();
      return PSY.platform.page({ active: 'settings', title: 'Settings', body: '<div class="p1-st" style="display:flex;flex-direction:column;gap:20px" data-tab="' + tab + '">' + (tabs().length > 1 ? tabsHtml(tab) : '') + body + '</div>' });
    },
    mount(root) {
      const s = root.querySelector('#p1-lowdays');
      if (s) s.addEventListener('change', () => { const p = (PSY.state.prefs = PSY.state.prefs || {}); p.lowDays = +s.value; PSY.save(); PSY.ui.toast('Saved.'); });
      const so = root.querySelector('#p1-signout');
      if (so) so.addEventListener('change', () => { const p = (PSY.state.prefs = PSY.state.prefs || {}); p.signOutMinutes = +so.value; PSY.save(); PSY.ui.toast('Saved. The timer is simulated in this demo.'); });
    },
  });
  PSY.acts['p1-toggle'] = (el) => {
    const k = el.getAttribute('data-k'), def = (NOTIFY.find((n) => n[0] === k) || [])[2], on = !isOn(k, def);
    notify()[k] = on; PSY.save();
    el.classList.toggle('on', on); el.setAttribute('aria-checked', String(on));
    PSY.ui.toast(on ? 'On.' : 'Off.');
  };

  /* rates: saved on change; the preview updates in place so Tab moves on to the next box */
  PSY.acts['st-rate'] = (el, ctx) => {
    const k = el.getAttribute('data-k'), raw = String(el.value || '').trim(), R = rates(), [p, s] = k.split('|'), was = R[k];
    if (raw !== '' && !(+raw > 0)) { el.setAttribute('aria-invalid', 'true'); PSY.ui.toast('Enter a rate above $0.'); return; }
    el.removeAttribute('aria-invalid');
    if (raw === '') { if (was == null) return; delete R[k]; } else { const v = Math.round(+raw * 100) / 100; if (+was === v) return; R[k] = v; el.value = v.toFixed(2); }
    el.classList.toggle('set', raw !== '');
    PSY.audit.add({ case: '', action: raw === '' ? 'Reimbursement rate cleared: ' + payerName(p) + ' · ' + svcName(s) : 'Reimbursement rate set: ' + payerName(p) + ' · ' + svcName(s) + ' = $' + R[k].toFixed(2) + ' per ' + (((R5().services || {})[s] || {}).unit || 'unit'), by: ME(), doc: 'Settings · Reimbursement rates', status: '' });
    PSY.save();
    const pv = ctx.root.querySelector('[data-st="preview"]'); if (pv) pv.innerHTML = previewHtml();
    const n = Object.keys(R).length, c = ctx.root.querySelector('[data-st="count"]'); if (c) c.textContent = n + (n === 1 ? ' rate' : ' rates') + ' configured';
    const b = ctx.root.querySelector('[data-act="st-rates-clear"]'); if (b) b.disabled = !n;
  };
  PSY.acts['st-rates-clear'] = () => {
    const n = Object.keys(rates()).length; if (!n) return;
    PSY.ui.modal({ title: 'Clear all reimbursement rates?', sub: n + (n === 1 ? ' rate' : ' rates') + ' configured',
      actions: [{ label: 'Cancel' }, { label: 'Clear all rates', primary: true, onClick: () => { PSY.state.rates = {}; PSY.audit.add({ case: '', action: 'All reimbursement rates cleared (' + n + ')', by: ME(), doc: 'Settings · Reimbursement rates', status: '' }); PSY.save(); PSY.refresh(); PSY.ui.toast('Rates cleared.'); } }] });
  };
  /* account: the password dialog is simulated (nothing is checked, stored or sent; the values are not kept) */
  PSY.acts['st-pw'] = () => {
    PSY.ui.modal({ title: 'Change password', sub: 'Simulated: no password is changed in this demo',
      body: '<div style="display:grid;gap:12px"><label style="display:grid;gap:6px;font-size:13px">Current password<input class="fld" type="password" id="st-pw-cur" autocomplete="current-password"></label>' +
        '<label style="display:grid;gap:6px;font-size:13px">New password<input class="fld" type="password" id="st-pw-new" autocomplete="new-password"></label>' +
        '<label style="display:grid;gap:6px;font-size:13px">Confirm new password<input class="fld" type="password" id="st-pw-2" autocomplete="new-password"></label></div>',
      actions: [{ label: 'Cancel' }, { label: 'Change password', primary: true, onClick: (m) => {
        const cur = m.querySelector('#st-pw-cur').value, nw = m.querySelector('#st-pw-new').value, c2 = m.querySelector('#st-pw-2').value;
        if (!cur || !nw) { PSY.ui.toast('Enter your current and new password.'); return false; }
        if (nw !== c2) { PSY.ui.toast('The new passwords do not match.'); return false; }
        PSY.ui.toast('Simulated: your password is not changed in this demo.');
      } }] });
  };
  PSY.acts['st-2fa'] = () => PSY.ui.toast('Simulated: two-factor set-up is not connected in this demo.');
  PSY.acts['st-signout'] = () => PSY.ui.toast('Signed out (simulated). This demo has no sign-in, so the screen stays open.');
  /* roles: one switch = one role × feature; applies at once (the sidebar, the extension buttons and views read PSY.can) */
  PSY.acts['st-perm'] = (el) => {
    const r = el.getAttribute('data-r'), f = el.getAttribute('data-f'); if (!PSY.ROLES[r] || locked(r, f) || PSY.role() !== 'admin') return;
    const on = !PSY.can(f, r); PSY.setPerm(r, f, on);
    PSY.audit.add({ case: '', action: 'Role permission: ' + PSY.ROLES[r].label + ' · ' + fLabel(f) + ' ' + (on ? 'on' : 'off'), by: PSY.user().name, doc: 'Settings · Roles', status: '' });
    PSY.refresh(); if (PSY.ext && PSY.ext.apply) PSY.ext.apply();
    PSY.ui.toast(fShort(f) + ' ' + (on ? 'on' : 'off') + ' for ' + PSY.ROLES[r].short + '.');
  };
  PSY.acts['st-perm-reset'] = () => {
    const n = permChanges(); PSY.state.perms = {};
    PSY.audit.add({ case: '', action: 'Role permissions restored to the defaults (' + n + (n === 1 ? ' change' : ' changes') + ' undone)', by: PSY.user().name, doc: 'Settings · Roles', status: '' });
    PSY.save(); PSY.refresh(); PSY.ui.toast('Defaults restored.');
  };
  PSY.acts['st-au-case'] = (el) => { AU.c = el.value; PSY.refresh(); };
  PSY.acts['st-au-who'] = (el) => { AU.who = el.value; PSY.refresh(); };
  PSY.acts['st-au-csv'] = () => {
    const csv = PSY.settings5.auditCsv(), n = auditRows().length;
    const fallback = () => PSY.ui.modal({ wide: true, title: 'Audit trail as CSV', body: '<textarea readonly style="width:100%;min-height:260px;font:12px/1.4 monospace">' + esc(csv) + '</textarea>', onOpen: (m) => { const t = m.querySelector('textarea'); t.focus(); t.select(); } });
    try { Promise.resolve(navigator.clipboard.writeText(csv)).then(() => PSY.ui.toast('Copied ' + n + (n === 1 ? ' row' : ' rows') + ' as CSV.'), fallback); } catch (e) { fallback(); }
  };

  /* ---------------- Help ---------------- */
  const FAQ = [
    ['What does the Psyflo extension do in Lauris?', 'Beside the Lauris page: a roster of your consumers with what needs action today, Scribe and Scan & Enhance, plus a small Track time control. What you see depends on your role.'],
    ['Does Psyflo ever sign or process a form?', 'No. A licensed clinician processes, approves and signs in Lauris. Submissions to a payer are simulated in this demo.'],
    ['How does the time I track become units?', 'Recorded time is not billable time. Units follow the service’s unit rule: for TDT, 1 unit for 2 to 2.99 hours a day, 2 units for 3 to 4.99 hours, 3 units for 5 hours or more (DMAS Chapter IV, p. 39).'],
    ['What does Scan & Enhance do?', 'It reads the note or form on screen and suggests improvements from the record, with their sources. You accept, edit and approve them, then push them to Lauris.'],
    ['Who sees what?', 'Direct support staff: Scribe and Track Time. Licensed clinical staff: also Scan & Enhance, the platform tabs and FLO for their consumers. Administrators: the platform tabs and FLO for all. Change it in Settings, Roles.'],
    ['What are the three platform tabs?', 'All Authorizations tracks requests and renewals. Denial Intelligence handles denials and appeals. Analytics shows outcomes, payer performance and population, on a simulated cohort. FLO pulls custom data.'],
    ['When do I start a concurrent SRA?', 'When units run out within the warning set in Settings (10 school days unless you change it).'],
    ['What happens when a payer denies or cuts units?', 'The decision shows in All Authorizations and opens in Denial Intelligence, where a clinician reviews the reason, drafts an appeal or a peer-to-peer guide and tracks the outcome.'],
  ];
  const HELP_CSS = `
  .p1-hp{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:20px;align-items:start}
  .p1-hp .card-h{padding:18px 22px 12px;border-bottom:0}
  .p1-hp .q{border-top:1px solid #EFE8DE}
  .p1-hp .q button{display:flex;width:100%;align-items:center;gap:14px;background:none;border:0;padding:16px 22px;font:inherit;font-size:15px;font-weight:600;text-align:left;cursor:pointer;color:#1B1B19}
  .p1-hp .q button:hover{background:#FCF9F5}
  .p1-hp .q button svg{margin-left:auto;flex:0 0 auto;color:#6B665E;transition:transform .15s}
  .p1-hp .q.open button svg{transform:rotate(180deg)}
  .p1-hp .q .a{padding:0 22px 18px;font-size:14px;line-height:1.6;color:#4A453D;max-width:680px}
  .p1-hp .kb{display:flex;gap:12px;align-items:center;padding:11px 22px;border-top:1px solid #EFE8DE;font-size:13.5px}
  .p1-hp kbd{font:inherit;font-size:12px;font-weight:600;border:1px solid #D9D2C6;border-bottom-width:2px;border-radius:6px;padding:1px 8px;background:#fff;min-width:26px;text-align:center}
  .p1-hp .ct{padding:0 22px 20px;font-size:14px;line-height:1.6}
  @media (max-width:1100px){.p1-hp{grid-template-columns:1fr}}
  `;
  PSY.register({
    id: 'help', app: 'psyflo', label: 'Help', url: 'help',
    get css() { return P().css + HELP_CSS; },
    render() {
      const faq = FAQ.map((f, i) => '<div class="q' + (i === 0 ? ' open' : '') + '"><button type="button" data-act="p1-faq" aria-expanded="' + (i === 0) + '">' + esc(f[0]) + P().icons.chev + '</button><div class="a"' + (i === 0 ? '' : ' hidden') + '>' + esc(f[1]) + '</div></div>').join('');
      const side = '<div style="display:flex;flex-direction:column;gap:20px"><section class="card"><div class="card-h"><h2>Contact</h2></div><div class="ct"><b>support@psyflo.com</b></div></section></div>';
      return PSY.platform.page({ active: 'help', title: 'Help', body: '<div class="p1-hp"><section class="card" style="overflow:hidden"><div class="card-h"><h2>Common questions</h2></div>' + faq + '</section>' + side + '</div>' });
    },
  });
  PSY.acts['p1-faq'] = (el, ctx) => {
    const q = el.closest('.q'), open = !q.classList.contains('open');
    ctx.qa('.p1-hp .q').forEach((x) => { x.classList.remove('open'); x.querySelector('.a').hidden = true; x.querySelector('button').setAttribute('aria-expanded', 'false'); });
    if (open) { q.classList.add('open'); q.querySelector('.a').hidden = false; el.setAttribute('aria-expanded', 'true'); }
  };
})();
