// Dashboard (route Dashboard): the patient roster every staff role starts from, and (R4) the one place for documentation too. A switch at the top
// of the table area: Patients (the roster, default), Documents (every note and form across patients, with the review) and Staff (workload and
// approval mode). The view is in the address (?view=documents | staff), so a link, a reload and Back keep it. The old Documentation tab, the
// review queue and My Work's review and team sections all land here (registry.js REDIRECTS).
//   Patients   one table, one row per patient the signed-in person is responsible for; under each patient the outstanding items; alerts as icons
//   Documents  the Documentation table of feedback round Nov 11 (Documentation.js: DocumentsView): filters, on-time figure, review drawer, pager
//   Staff      one row per staffer in scope, approval mode
// Role scope is unchanged: Documents and Staff need the documentation capability (supervisor, clinician; administrator: status only), direct support
// has the Patients view only (no switch; ?view=documents falls back to Patients). The review drawer keeps its notes.review gate.
//   direct support   own caseload        supervisor  the caseloads they manage + unassigned clients at their sites
//   clinician        every patient       admin       every patient, statuses and dates only (no note text exists in the roster)
// Everything comes from web/js/shared/sel/roster.js over the role-projected state; nothing is invented here, and with nobody signed in the screen
// says so (it never falls back to a default person).
// Every action on an expanded item is an icon with its definition on hover (ui.hint). Notes, forms, CNAs, plans, guardian calls, rejected forms and
// assessments are worked in the Lauris EHR, so their action opens Lauris at that note or form (shared/lauris-link.js), where the Psyflo panel is
// already beside it; a review item adds the Review icon (the drawer: approve or return stays in Psyflo); an authorization or referral step stays
// in Psyflo (Authorizations, Referrals); the administrator, who holds no ext.use, keeps status only and is sent to the chart.
import { register, Screen, raw, ui, esc, session, hrefFor, canOpen, api } from '../app.js';
import { BY_ID, resolveRoute } from '../registry.js';
import { ROLE_LABEL, can } from '../shared/permissions.js';
import { today as clockToday } from '../shared/clock.js';
import { rosterRows, normalizeRoster, chartHref, viewFor } from '../shared/sel/roster.js';
import { worklist } from '../shared/sel/mywork.js';
import { laurisLink } from '../shared/lauris-link.js';
import { confirmAccess } from './MyWorkViews.js';
import { DocumentsView } from './Documentation.js';

const idOf = to => String(to || '').replace(/^\.?\//, '').replace(/^#\/?/, '').split('?')[0].replace(/\.dc\.html$/, '');
const SORTABLE = ['patient', 'staff', 'attention', 'units', 'due'];
const SEV_ICON = { r: 'alert', y: 'clock', n: 'dot', g: 'check' };
const SEV_WORD = { r: 'Past due', y: 'Due soon', n: 'On the way', g: 'Done' };
const SEV_DATE = { r: 'overdue', y: 'soon', n: 'ok', g: 'ok' };
const ALERT_ICON = { 'note-behind': 'pencil', 'note-fix': 'undo', 'form-late': 'file', review: 'eye', units: 'hourglass', deadline: 'calendar', 'auth-action': 'inbox' };
const PHASE_ICON = { in_progress: 'pencil', needs_review: 'eye', not_started: 'dot' };
const VIEWS = [['patients', 'Patients', 'users'], ['documents', 'Documents', 'file'], ['staff', 'Staff', 'bars']];
const plural = (n, w) => `${n} ${n === 1 ? w : w + 's'}`;

// the one date a row shows: the earliest of its outstanding items' due dates and the authorization's working date (full text only in the tooltip)
export function nextDate(row, today) {
  const c = [];
  for (const it of row.items) if (it.due) c.push({ date: it.due, sev: it.due < today ? 'overdue' : SEV_DATE[it.sev] || 'ok', why: [it.title, it.sub].filter(Boolean).join(' · ') });
  const a = row.auth; if (a && a.date) c.push({ date: a.date, sev: a.dateSev === 'none' ? 'ok' : a.dateSev, why: a.dateWhy || 'Authorization' });
  const rank = { overdue: 0, soon: 1, ok: 2 };
  c.sort((x, y) => x.date.localeCompare(y.date) || rank[x.sev] - rank[y.sev]);
  return c[0] || null;
}

register('Dashboard', class extends Screen {
  init() {
    const f = normalizeRoster(this.params);
    const a = this.actor;
    if (a && a.role === 'direct_support') { f.staff = ''; f.clinician = ''; }
    this.view = viewFor(a, this.params.view);   // direct support (no documentation capability) is always on Patients
    this.state = { f: { q: f.q, attention: f.attention, site: f.site, staff: f.staff, clinician: f.clinician, payer: f.payer, units: f.units, due: f.due }, sort: { key: SORTABLE.includes(f.sort) ? f.sort : '', dir: f.dir }, open: f.open === 'all' || f.open === 'none' ? f.open : '', toggled: {}, ...ui.pager.fromQuery(this.params) };
    this.docs = new DocumentsView(this);
  }
  get actor() { return session.actor; }
  setF(next) { ui.query.writeQuery({ page: '' }); this.setState({ f: { ...this.state.f, ...next }, page: 1 }); }

  // where an Psyflo-side item's icon goes: its own target when this role may open it, else the patient chart (the chart explains the rest)
  resolve(it, row) {
    const ok = to => {
      if (!to) return null;
      const [, qs] = String(to).split('?');
      const r = resolveRoute({ id: idOf(to), params: Object.fromEntries(new URLSearchParams(qs || '')) }, { role: this.actor && this.actor.role });
      const id = r.presenter ? idOf(to) : r.id;
      return BY_ID[id] && canOpen(id) ? hrefFor(to) : null;
    };
    const href = ok(it.to);
    return href ? { href, verb: it.verb, own: true } : { href: hrefFor(chartHref(row.id, it.kind === 'auth' ? 'authorization' : 'documentation')), verb: 'Open', own: false };
  }

  // a count with its icon, the definition on hover (feedback Nov 12, R4: icons instead of text)
  badge(tone, ic, n, text) {
    if (!n) return '';
    const t = `${plural(n, text.noun)} ${text.what}`;
    return ui.hint(ic, t, { tone, text: String(n), label: t, cls: `d-badge d-badge--${tone}` });
  }
  notesCell(r) {
    const c = r.counts;
    const html = [
      this.badge('r', 'alert', c.behind, { noun: 'note', what: 'behind' }), this.badge('r', 'undo', c.fix, { noun: 'note', what: 'sent back' }),
      this.badge('y', 'clock', c.due, { noun: 'note', what: 'due' }), this.badge('b', 'eye', c.review, { noun: 'note', what: 'in review' })
    ].join('');
    return html ? `<span class="d-badges">${html}</span>` : '<span class="d-none" aria-label="No notes outstanding">—</span>';
  }
  formsCell(r) {
    const c = r.counts; const other = Math.max(0, c.forms - c.formsLate);
    const html = this.badge('r', 'alert', c.formsLate, { noun: 'form', what: 'past due' }) + this.badge('y', 'clock', other, { noun: 'form', what: 'due' });
    return html ? `<span class="d-badges">${html}</span>` : '<span class="d-none" aria-label="No forms outstanding">—</span>';
  }
  authCell(r) {
    const au = r.auth; if (!au) return '<span class="d-none" aria-label="No authorization">—</span>';
    const chip = au.requestId ? ui.statusChip(au.stage, { title: au.typeLabel || '' }) : '';
    return `<span class="d-auth">${chip}${au.units ? ui.unitsBar(au.units, { compact: true }) : ''}</span>`;
  }
  alertsCell(r) {
    const list = r.alerts.slice(0, 3), more = r.alerts.slice(3);
    const one = a => ui.hint(ALERT_ICON[a.key] || a.icon, a.text, { tone: a.sev, href: hrefFor(a.to), label: `${r.label}: ${a.text}`, size: 16, cls: `d-alert d-alert--${a.sev}` });
    const m = more.length ? ui.hint('plus', more.map(a => a.text).join('; '), { text: String(more.length), label: `${more.length} more: ${more.map(a => a.text).join('; ')}`, cls: 'd-alert d-alert--more' }) : '';
    return `<span class="d-alerts">${list.map(one).join('')}${m}<a class="d-open" href="${esc(hrefFor(r.href))}" aria-label="Open ${esc(r.label)}">${ui.icon('chevR', 16)}</a></span>`;
  }

  // ---- the icons on one outstanding item ----
  itemSeverity(it) {
    if (it.kind === 'review') return { icon: 'eye', word: 'Waiting for a review', tone: 'y' };
    if (it.kind === 'fix') return { icon: 'undo', word: it.type === 'rejected' ? 'Rejected in Lauris: fix it there' : 'Sent back: fix it in Lauris', tone: 'r' };
    return { icon: SEV_ICON[it.sev] || 'dot', word: SEV_WORD[it.sev] || '', tone: it.sev === 'g' ? 'g' : it.sev };
  }
  // what a reader needs about the item in one icon: a form's state, an authorization step's detail (the long sentence is the hover)
  itemDetail(it) {
    if (!it.sub) return '';
    if (it.kind === 'form' && it.phase) return ui.hint(PHASE_ICON[it.phase] || 'info', it.sub, { tone: 'n' });
    if (it.kind === 'auth' || it.kind === 'referral') return ui.hint('info', it.sub, { tone: 'n' });
    return '';
  }
  itemActions(it, r) {
    const a = this.actor, ehr = it.kind !== 'auth' && it.kind !== 'referral';
    const who = r.label, title = it.title;
    if (ehr) {
      const lau = laurisLink(api.config.laurisURL, a, it.lauris, { who, title });
      const review = it.kind === 'review' && it.canReview && it.noteId ? this.docs.reviewIcon(it.noteId, who, title) : '';
      if (lau || review) return lau + review;
      // no Lauris link for this role (the administrator keeps status only) or this patient has no Lauris number: the chart explains the rest
      return ui.hint('user', `Open chart: ${who}`, { label: `Open chart for ${who}: ${title}`, href: hrefFor(chartHref(r.id, 'documentation')), cls: 'ui-hint--act' });
    }
    const go = this.resolve(it, r), what = it.kind === 'referral' ? 'referral' : 'authorization';
    return go.own ? ui.hint(it.kind === 'referral' ? 'inbox' : 'list', `Open ${what}: ${String(go.verb || 'open').toLowerCase()}`, { label: `${go.verb || 'Open'} for ${who}: ${title} (opens ${what === 'referral' ? 'the referral' : 'in Psyflo'})`, href: go.href, cls: 'ui-hint--act' })
      : ui.hint('user', `Open chart: ${who}`, { label: `Open chart for ${who}: ${title}`, href: go.href, cls: 'ui-hint--act' });
  }
  itemsHtml(r) {
    return `<ul class="d-items" aria-label="Outstanding for ${esc(r.label)}">${r.items.map(it => {
      const sv = this.itemSeverity(it);
      // a note's period (which day, which week) tells two notes apart, so it stays as short text; the rest of the sub line is the hover
      const per = ['note', 'review', 'fix'].includes(it.kind) && it.sub ? `<span class="d-item__p">${esc(it.sub)}</span>` : '';
      return `<li class="d-item d-item--${it.sev}"><span class="d-item__i">${ui.hint(sv.icon, sv.word, { tone: sv.tone })}</span><span class="d-item__t"><b>${esc(it.title)}</b>${per}${this.itemDetail(it)}</span><span class="d-item__d">${esc(it.dueText || '')}</span><span class="d-item__a">${this.itemActions(it, r)}</span></li>`;
    }).join('')}</ul>`;
  }
  // two-person confirmations (a designation or a role raise someone else proposed): a clinician has no Settings access, so they wait here
  confirmsHtml(a) {
    if (a.role !== 'clinician' && a.role !== 'admin') return '';
    const list = worklist(this.s, a).items.filter(i => (i.kind === 'confirm-designation' || i.kind === 'confirm-role') && i.action && i.action.type === 'confirm');
    if (!list.length) return '';
    return `<ul class="d-confirms" aria-label="Waiting for a second person">${list.map(i => `<li class="d-confirm"><span class="d-confirm__i">${ui.icon('users', 16)}</span><span class="d-confirm__t">${esc(i.title)}</span><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="confirm" data-kind="${esc(i.action.kind)}" data-id="${esc(i.action.id)}">Review<span class="ui-sr"> ${esc(i.title)}</span></button></li>`).join('')}</ul>`;
  }
  isOpen(r, total) {
    const st = this.state; if (!r.items.length) return false;
    if (r.id in st.toggled) return st.toggled[r.id];
    if (st.open === 'all') return true; if (st.open === 'none') return false;
    return total <= 8 && r.items.some(i => i.sev === 'r');
  }

  // ---- the switch: three real links (a view is an address), only for the roles that hold the documentation capability ----
  switchHtml(a) {
    if (!can(a, 'documentation')) return '';
    const cur = this.view === 'patients' ? this.state.f : this.docs.st.f;   // search, site and staff mean the same in every view and travel with the switch
    const carry = { q: cur.q, site: cur.site, staff: cur.staff };
    const links = VIEWS.map(([v, label, ic]) => `<a class="d-view__b" href="${esc(hrefFor('Dashboard', v === 'patients' ? carry : { ...carry, view: v }))}"${this.view === v ? ' aria-current="page"' : ''}>${ui.icon(ic, 16)}<span>${label}</span></a>`).join('');
    const info = ui.hint('info', 'Patients: what is outstanding per patient. Documents: every note and form, and the review. Staff: workload and approval.', { label: 'What the three views show' });
    return `<div class="d-view-wrap"><nav class="d-view" aria-label="Dashboard views">${links}</nav>${info}</div>`;
  }

  renderVals() {
    const s = this.s, a = this.actor;
    const none = { roleChip: raw(''), maturity: raw(''), confirms: raw(''), switcher: raw(''), sample: raw(''), ontime: raw(''), range: raw(''), bar: raw('') };
    if (!a || !a.role) return { ...none, table: raw(ui.emptyState({ tone: 'denied', title: 'Sign in to see your patients', body: 'The Dashboard is built for the signed-in role.', action: { label: 'Sign in', href: '#/Login' } })) };
    const base = { ...none, roleChip: raw(ui.chip(ROLE_LABEL[a.role] || a.role, { tone: 'neutral', size: 'sm' })), confirms: raw(this.confirmsHtml(a)), switcher: raw(this.switchHtml(a)) };
    if (this.view === 'documents') return { ...base, maturity: raw(ui.maturity('route.Documentation')), ...this.docs.documentsVals(a) };
    if (this.view === 'staff') return { ...base, maturity: raw(ui.maturity('route.Documentation')), ...this.docs.staffVals(a) };
    return { ...base, maturity: raw(ui.maturity('route.Dashboard')), ...this.patientsVals(s, a) };
  }

  // ------------------------------------------------------------------------------------------------ Patients view
  patientsVals(s, a) {
    const isDS = a.role === 'direct_support', st = this.state, today = clockToday(s);
    const res = rosterRows(s, a, { ...st.f, sort: st.sort.key, dir: st.sort.dir });
    let rows = res.rows;
    if (st.sort.key === 'due') {
      const d = st.sort.dir === 'desc' ? -1 : 1; const key = r => (nextDate(r, today) || {}).date || '9999';
      rows = rows.slice().sort((x, y) => (key(x).localeCompare(key(y)) || x.label.localeCompare(y.label)) * d);
    }
    const sortNow = st.sort.key ? st.sort : { key: 'attention', dir: 'asc' };
    const c = res.counts, o = res.options;
    const opt = (head, list) => [['', head], ...list];
    const chips = [{ key: 'attention', value: '', label: 'All', count: c.all }, { key: 'attention', value: 'attention', label: 'Needs attention', count: c.attention }, { key: 'attention', value: 'behind', label: 'Behind', count: c.behind }, { key: 'attention', value: 'review', label: 'In review', count: c.review }, { key: 'attention', value: 'auth', label: 'Authorization', count: c.auth }, { key: 'attention', value: 'clear', label: 'All clear', count: c.clear }];
    const selects = [];
    if (o.sites.length > 1) selects.push({ key: 'site', label: 'Site', options: opt('All sites', o.sites) });
    if (!isDS && o.staff.length > 1) selects.push({ key: 'staff', label: 'Staff', options: opt('Everyone', o.staff) });
    if (!isDS && o.clinicians.length > 1) selects.push({ key: 'clinician', label: 'Clinician', options: opt('Anyone', o.clinicians) });
    if (o.payers.length > 1) selects.push({ key: 'payer', label: 'Payer', options: opt('All payers', o.payers) });
    selects.push({ key: 'units', label: 'Units left', options: [['', 'Any'], ['25', '25% or less'], ['50', '50% or less'], ['warn', 'Flagged']] });
    selects.push({ key: 'due', label: 'Due', options: [['', 'Any time'], ['overdue', 'Overdue'], ['today', 'Today'], ['7', 'Next 7 days'], ['30', 'Next 30 days']] });
    const bar = ui.filterBar({
      id: 'd-f', label: 'Patient filters', chipsLabel: 'Show', state: st.f,
      search: { key: 'q', placeholder: 'Initials or Lauris #', label: 'Search patients' }, chips, selects,
      onChange: f => this.setF(f), onClear: f => this.setF(f)
    });

    const pageRows = ui.pager.slice(rows, { size: st.size, page: st.page });
    const withItems = pageRows.filter(r => r.items.length);
    const allOpen = withItems.length > 0 && withItems.every(r => this.isOpen(r, rows.length));
    const th = (key, label, o2 = {}) => {
      const on = sortNow.key === key; const asc = on && sortNow.dir === 'asc';
      const inner = o2.sort ? `<button type="button" class="ui-qt__sort${on ? ' is-on' : ''}" data-x="sort" data-key="${key}"><span>${esc(label)}</span>${ui.icon(on ? (asc ? 'asc' : 'desc') : 'sort', 14)}</button>` : esc(label);
      return `<th scope="col" class="${o2.cls || ''}"${o2.sort ? ` aria-sort="${on ? (asc ? 'ascending' : 'descending') : 'none'}"` : ''}>${inner}${o2.extra || ''}</th>`;
    };
    const cols = isDS ? 6 : 7;
    const allBtn = withItems.length ? ui.hint(allOpen ? 'chevU' : 'chevD', allOpen ? 'Collapse all' : 'Expand all', { cls: 'd-all', extra: `data-x="all" data-next="${allOpen ? 'none' : 'all'}"` }) : '';
    const head = `<tr>${th('patient', 'Patient', { sort: true, extra: allBtn })}${isDS ? '' : th('staff', 'Responsible', { sort: true, cls: 'd-hide-lt-1100' })}${th('', 'Notes')}${th('', 'Forms')}${th('units', 'Authorization', { sort: true })}${th('due', 'Next date', { sort: true })}${th('attention', 'Alerts', { sort: true })}</tr>`;
    const emp = v => (v ? '' : ' class="d-empty"');
    const body = pageRows.map(r => {
      const open = this.isOpen(r, rows.length), nd = nextDate(r, today);
      const tog = r.items.length ? `<button type="button" class="d-tog" data-x="tog" data-id="${esc(r.id)}" aria-expanded="${open}" aria-controls="d-it-${esc(r.id)}" aria-label="${open ? 'Hide' : 'Show'} ${plural(r.items.length, 'item')} for ${esc(r.label)}">${ui.icon('chevD', 16)}</button>` : '<span class="d-tog d-tog--none" aria-hidden="true"></span>';
      const site = r.school ? ui.hint('school', r.school, { label: `School: ${r.school}` }) : '';
      const clin = r.clinicianShort ? ui.hint('user', `Clinician: ${r.clinicianShort}`, { label: `Clinician: ${r.clinicianShort}` }) : '';
      const resp = isDS ? '' : `<td class="d-hide-lt-1100" data-label="Responsible"><span class="d-resp">${r.staffShort ? esc(r.staffShort) : '<span class="d-none">—</span>'}${clin}</span></td>`;
      return `<tr class="d-row${r.worst === 'r' ? ' is-urgent' : ''}${open ? ' is-open' : ''}" data-id="${esc(r.id)}"><td class="d-c-name"><div class="d-nm">${tog}<span class="d-name"><a class="d-link" href="${esc(hrefFor(r.href))}">${esc(r.label)}<span class="ui-sr"> chart</span></a><span class="d-sub">Lauris #${esc(r.lauris)}${site}</span></span></div></td>${resp}<td data-label="Notes"${emp(r.counts.behind + r.counts.fix + r.counts.due + r.counts.review)}>${this.notesCell(r)}</td><td data-label="Forms"${emp(r.counts.forms)}>${this.formsCell(r)}</td><td data-label="Authorization"${emp(r.auth)}>${this.authCell(r)}</td><td data-label="Next date">${nd ? ui.dateFlag({ date: nd.date, sev: nd.sev, why: nd.why }) : '<span class="d-none" aria-label="No date">—</span>'}</td><td class="d-c-alerts" data-label="Alerts">${this.alertsCell(r)}</td></tr>` +
        (r.items.length ? `<tr class="d-items-row" id="d-it-${esc(r.id)}"${open ? '' : ' hidden'}><td colspan="${cols}">${this.itemsHtml(r)}</td></tr>` : '');
    }).join('');
    const empty = res.total ? `<tr><td colspan="${cols}">${ui.emptyState({ title: 'No patients match', body: 'Clear a filter to see more.' })}</td></tr>` : `<tr><td colspan="${cols}">${ui.emptyState({ title: isDS ? 'No patients on your caseload yet' : 'No patients yet' })}</td></tr>`;
    const table = `<div class="ui-qt d-qt"><div class="ui-qt__scroll" role="region" aria-label="Patients" tabindex="0"><table class="ui-qt__table d-table"><caption class="ui-sr">Patients, sorted by ${esc({ patient: 'patient', staff: 'responsible', attention: 'alerts', units: 'units left', due: 'next date' }[sortNow.key])}</caption><thead>${head}</thead><tbody>${rows.length ? body : empty}</tbody></table></div></div>` + ui.pager({ id: 'd-pg', total: rows.length, size: st.size, page: st.page, noun: 'patients', onChange: ({ size, page }) => this.setState({ size, page }) });
    return { bar: raw(bar), table: raw(table) };
  }

  after(root) {
    root.querySelectorAll('[data-x]').forEach(el => {
      el.onclick = e => {
        e.preventDefault(); const x = el.dataset.x;
        if (x === 'sort') {
          const cur = this.state.sort; const key = el.dataset.key;
          const sort = cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };
          ui.query.writeQuery({ sort: sort.key, dir: sort.dir === 'desc' ? 'desc' : '' }); this.setState({ sort });
        } else if (x === 'tog') {
          const id = el.dataset.id; const now = el.getAttribute('aria-expanded') === 'true';
          this.state.toggled = { ...this.state.toggled, [id]: !now }; this.repaint();
          requestAnimationFrame(() => { const b = document.querySelector(`#root [data-x="tog"][data-id="${CSS.escape(id)}"]`); if (b) b.focus(); });
        } else if (x === 'confirm') {
          confirmAccess({ s: this.s, kind: el.dataset.kind, id: el.dataset.id, me: this.actor.id, opener: el, run: async (act, args) => { const r = await this.do(act, args); this.toast(args.decision === 'approve' ? 'Confirmed · written to the audit log' : 'Declined · written to the audit log'); return r; } });
        } else if (x === 'all') {
          const open = el.dataset.next === 'all' ? 'all' : 'none';
          ui.query.writeQuery({ open }); this.state.toggled = {}; this.setState({ open });
          requestAnimationFrame(() => { const b = document.querySelector('#root [data-x="all"]'); if (b) b.focus(); });
        } else this.docs.act(x, el.dataset, el);   // review, range-clear, apprOn, apprOff: Documentation.js
      };
    });
    this.docs.after(root);
  }
});
