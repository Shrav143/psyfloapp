// Documents and Staff: the second and third views of the Dashboard (R4: the Documentation tab became part of the Dashboard, one nav item).
// The site supervisor's job, across patients, whether or not there is an authorization: daily progress notes, weekly and monthly notes, intake
// forms, CNAs, plans. Who is behind, what waits for a review, what was filed late, and the review itself (approve, return with a note, "that
// didn't happen") in a drawer. The Dashboard (Dashboard.js) owns the page, the switch and the Patients view; this file is the other two views
// and the review drawer, which the Patients view opens too (the Review icon on a note waiting for a reviewer).
// Data: web/js/shared/sel/roster.js (documentRows) and sel/mywork.js (teamView, pendingFor). Nothing here is computed from a default user:
// with nobody signed in the Dashboard shows a sign-in notice. Administrator: statuses and dates only, no note text, no review buttons.
// Direct support has no Documents view (the documentation capability); the Dashboard falls back to Patients for them.
// The route id Documentation remains as a redirect to Dashboard?view=documents (registry.js REDIRECTS), carrying its filters; the old My Work review
// and team sections and ReviewQueue land there too. This file also registers a small Documentation controller: it only runs for ?legacy=1 (which
// bypasses every redirect) and sends the person to the same place.
import { register, Screen, M, raw, esc, ui, api, hrefFor } from '../app.js';
import { can } from '../shared/permissions.js';
import { documentRows, normalizeDocs, laurisNotePath, laurisKey, docLabel } from '../shared/sel/roster.js';
import { teamView, pendingFor } from '../shared/sel/mywork.js';
import { laurisLink } from '../shared/lauris-link.js';
import { reviewModel } from './MyWorkViews.js';

const TONE = { r: 'danger', y: 'warning', g: 'success', n: 'neutral' };
const ICON = { r: 'alert', y: 'clock', g: 'check', n: 'dot' };
const STATUS_CHIPS = [['open', 'Open'], ['behind', 'Behind'], ['pending_review', 'Needs review'], ['returned', 'Sent back'], ['late', 'Filed late'], ['done', 'Done'], ['all', 'All']];
const plural = (n, w) => `${n} ${n === 1 ? w : w + 's'}`;
export const DOC_FILTER_KEYS = ['status', 'type', 'group', 'staff', 'q', 'site', 'due', 'from', 'to', 'sort', 'dir', 'id', 'page', 'size'];

export class DocumentsView {
  constructor(host) {
    this.h = host;
    const p = host.params || {};
    const f = normalizeDocs(p);
    // '' (a cleared chip) and a missing status both mean Open; 'all' is its own value so it survives a reload
    const status = p.status === 'all' ? 'all' : f.status || 'open';
    this.st = { f: { q: f.q, status, type: f.type, group: f.group, staff: f.staff, site: f.site }, range: { from: f.from, to: f.to }, sort: { key: f.sort || '', dir: f.dir } };
    this.deepId = f.id || '';
  }
  get s() { return this.h.s; }
  get actor() { return this.h.actor; }
  filters() {
    const st = this.st; const f = st.f;
    return normalizeDocs({ ...f, status: f.status === 'all' ? '' : f.status, from: st.range.from, to: st.range.to, sort: st.sort.key, dir: st.sort.dir });
  }
  setF(next) { ui.query.writeQuery({ page: '' }); this.st.f = { ...this.st.f, ...next, status: next.status || 'open' }; this.h.setState({ page: 1 }); }

  // -------------------------------------------------------------------------------------------------------------- Documents view
  // returns the holes the Dashboard template fills: bar, table, sample, ontime, range
  documentsVals(a) {
    const s = this.s, st = this.st, f = st.f, size = this.h.state.size, page = this.h.state.page;
    const dr = documentRows(s, a, this.filters());
    const opt = (head, list) => [['', head], ...list];
    const chips = STATUS_CHIPS.map(([value, label]) => ({ key: 'status', value, label, count: dr.counts[value === 'all' ? 'all' : value] }));
    const bar = ui.filterBar({
      id: 'doc-f', label: 'Document filters', chipsLabel: 'Status', state: f, defaults: { status: 'open' },
      search: { key: 'q', placeholder: 'Search patient or Lauris #', label: 'Search patient or Lauris number' }, chips,
      selects: [
        { key: 'type', label: 'Document', options: opt('All documents', dr.options.types) },
        { key: 'group', label: 'Group', options: [['', 'Notes and forms'], ['note', 'Notes'], ['form', 'Forms']] },
        { key: 'staff', label: 'Staff', options: opt('All staff', dr.options.staff) },
        { key: 'site', label: 'Site', options: opt('All sites', dr.options.sites) }
      ],
      onChange: next => this.setF(next), onClear: () => { this.st.range = { from: '', to: '' }; ui.query.writeQuery({ from: '', to: '' }); this.setF({ q: '', status: 'open', type: '', group: '', staff: '', site: '' }); }
    });
    const reviewable = new Set(can(a, 'notes.review') ? pendingFor(s, a).map(n => n.id) : []);
    const lauris = r => (r.laurisNo ? `Lauris #${r.laurisNo}` : '');
    const dueSev = r => (r.status === 'behind' ? 'overdue' : (r.status === 'due' || r.status === 'in_progress') && r.sev === 'y' ? 'soon' : 'ok');
    const cols = [
      { key: 'patient', label: 'Patient', sort: true, primary: true, width: '16%', render: r => `<b class="doc-nw">${esc(r.label)}</b><span class="doc-sub">${esc(lauris(r))}</span>` },
      { key: 'type', label: 'Document', sort: true, width: '21%', render: r => `<span class="doc-nw">${esc(r.typeLabel)}</span><span class="doc-sub">${esc(r.dateText || '')}</span>` },
      { key: 'staff', label: 'Staff', sort: true, hideBelow: 1024, width: '11%', render: r => `<span class="doc-nw">${esc(r.staffShort || r.ownerShort || '—')}</span>` },
      { key: 'due', label: 'Due', sort: true, width: '12%', render: r => ui.dateFlag({ date: r.due, sev: dueSev(r), why: `${r.typeLabel} due ${M.fmtDate(r.due)}${dueSev(r) === 'overdue' ? ' · past due' : ''}` }) },
      { key: 'status', label: 'Status', sort: true, width: '15%', render: r => ui.chip(r.statusLabel, { tone: TONE[r.sev] || 'neutral', icon: ICON[r.sev] || 'dot', size: 'sm' }) },
      { key: 'reviewer', label: 'Reviewed by', hideBelow: 1280, width: '11%', render: r => `<span class="doc-nw">${esc(r.reviewer || '—')}</span>` },
      { key: 'act', label: 'Open', render: r => {
        const who = r.label, title = r.typeLabel + (r.dateText ? ' ' + r.dateText : '');
        const lau = this.laurisIcon(r.lauris, who, title);
        const review = r.noteId && r.status === 'pending_review' && reviewable.has(r.noteId) ? this.reviewIcon(r.noteId, who, title) : '';
        const chart = ui.hint('user', `Open chart: ${r.label}`, { href: r.to, label: `Open chart for ${r.label}`, cls: 'ui-hint--act' });
        return `<div class="doc-acts">${lau}${review}${chart}</div>`;
      } }
    ];
    const table = ui.queueTable({
      id: 'doc', caption: 'Documents', columns: cols, rows: ui.pager.slice(dr.rows, { size, page }), rowId: r => r.id, href: r => r.to,
      sort: st.sort.key ? st.sort : {}, onSort: sort => { this.st.sort = sort; ui.query.writeQuery({ sort: sort.key, dir: sort.dir }); this.h.repaint(); },
      total: dr.shown, maxHeight: dr.rows.length > 12 ? undefined : 'none',
      empty: { title: dr.total ? 'No documents match' : 'No documents yet', body: dr.total ? 'Clear a filter to see more.' : '' }
    });
    const showsForms = f.group !== 'note' && dr.rows.some(r => r.group === 'form');
    const sample = showsForms ? `<span class="doc-sample">${ui.datasetChip('illustrative', { text: 'Forms: sample data', title: 'Intake, CNA, plan, quarterly and discharge status is sample data until that tracker is wired to Lauris' })}</span>` : '';
    const ontime = dr.timely ? ui.hint('clock', 'Filed notes that were processed on time', { tone: dr.timely.pct >= 75 ? 'g' : 'y', text: `${dr.timely.onTime} of ${dr.timely.of}`, label: `On time: ${dr.timely.onTime} of ${dr.timely.of} filed notes were processed on time`, cls: 'doc-ontime' }) : '';
    const range = `<fieldset class="doc-range"><legend class="doc-range__l">Due between</legend><label class="doc-range__f"><span class="ui-sr">From</span><input class="ui-input" type="date" id="doc-from" aria-label="Due from" value="${esc(st.range.from)}"></label><span aria-hidden="true">to</span><label class="doc-range__f"><span class="ui-sr">To</span><input class="ui-input" type="date" id="doc-to" aria-label="Due to" value="${esc(st.range.to)}"></label>${st.range.from || st.range.to ? '<button type="button" class="ui-linkbtn" data-x="range-clear">Clear dates</button>' : ''}</fieldset>`;
    const pg = ui.pager({ id: 'doc-pg', total: dr.rows.length, size, page, noun: 'documents', onChange: ({ size: z, page: p }) => this.h.setState({ size: z, page: p }) });
    return { sample: raw(sample), ontime: raw(ontime), range: raw(range), bar: raw(bar), table: raw(table + pg) };
  }

  // the two actions a document row offers: open it in Lauris (EHR work) and, for a note waiting on this reviewer, the review drawer (Psyflo work)
  laurisIcon(path, who, title) { return laurisLink(api.config.laurisURL, this.actor, path, { who, title }); }
  reviewIcon(noteId, who, title) { return ui.hint('eye', `Review: ${title}`, { tone: 'n', label: `Review ${who}, ${title}`, cls: 'ui-hint--act', extra: `data-x="review" data-id="${esc(noteId)}"` }); }

  // -------------------------------------------------------------------------------------------------------------- Staff view
  staffVals(a) {
    const s = this.s;
    const t = teamView(s, a);
    if (!t) return { table: raw(ui.emptyState({ tone: 'denied', title: 'Not available for this role' })) };
    const n = x => (x ? String(x) : '<span class="doc-muted">0</span>');
    const cols = [
      { key: 'name', label: 'Staff', primary: true, render: r => `<b class="doc-nw">${esc(r.name)}</b><span class="doc-sub">${esc(r.credential || '')}</span>` },
      { key: 'students', label: 'Patients', render: r => `<span class="ui-num">${r.students}</span>` },
      { key: 'daily', label: 'Today', render: r => `<span class="ui-num doc-nw">${esc(r.daily)}</span>` },
      { key: 'onTime', label: 'On time', hideBelow: 1024, render: r => `<span class="ui-num">${esc(r.onTime)}</span>${r.onTimeBad ? `<span class="ui-sr"> below 75%</span>` : ''}` },
      { key: 'behind', label: 'Behind', render: r => r.behind ? ui.chip(String(r.behind), { tone: 'danger', icon: 'alert', size: 'sm' }) : n(0) },
      { key: 'pending', label: 'Needs review', render: r => r.pending ? ui.chip(String(r.pending), { tone: 'warning', icon: 'clock', size: 'sm' }) : n(0) },
      { key: 'mode', label: 'Approval', hideBelow: 1280, render: r => `${ui.chip(r.onApproval ? 'Every note' : 'Spot check', { tone: r.onApproval ? 'warning' : 'neutral', size: 'sm', title: r.mode })}${r.onApproval && r.reviewer ? `<span class="doc-sub">${esc(r.reviewer)}</span>` : ''}` },
      ...(can(a, 'notes.review') ? [{ key: 'act', label: 'Change', render: r => `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="${r.onApproval ? 'apprOff' : 'apprOn'}" data-id="${esc(r.id)}">${r.onApproval ? 'Turn off' : 'Require approval'}<span class="ui-sr"> for ${esc(r.name)}</span></button>` }] : [])
    ];
    const table = ui.queueTable({ id: 'doc-staff', caption: 'Staff in your scope', columns: cols, rows: t.rows, rowId: r => r.id, href: r => hrefFor('Dashboard', { view: 'documents', staff: r.id }), maxHeight: 'none', empty: { title: 'No staff in your scope' } });
    let h = table;
    if (t.canText && t.patterns.length) h += `<details class="doc-acc"><summary>Patterns ${ui.chip(String(t.patterns.length), { tone: 'neutral', size: 'sm' })}</summary><ul>${t.patterns.map(p => `<li><b>${esc(p.who)}</b> ${esc(p.text)}${p.sample ? ' ' + ui.datasetChip('harvest_export') : ''}</li>`).join('')}</ul></details>`;
    else if (!t.canText) h += `<div class="doc-hidden">${ui.hint('lock', 'Counts and dates only: note text is hidden for your role', { tone: 'n', label: 'Counts and dates only' })}</div>`;
    return { table: raw(h) };
  }

  // -------------------------------------------------------------------------------------------------------------- wiring
  after(root) {
    const upd = (k, v) => { this.st.range = { ...this.st.range, [k]: v }; ui.query.writeQuery({ [k]: v }); this.h.repaint(); };
    const from = root.querySelector('#doc-from'), to = root.querySelector('#doc-to');
    if (from) from.onchange = () => upd('from', from.value);
    if (to) to.onchange = () => upd('to', to.value);
    if (this.deepId) { const id = this.deepId; this.deepId = ''; this.openReview(id, null); }
  }
  act(name, d, el) {
    if (name === 'review') this.openReview(d.id, el);
    else if (name === 'range-clear') { this.st.range = { from: '', to: '' }; ui.query.writeQuery({ from: '', to: '' }); this.h.repaint(); }
    else if (name === 'apprOn') this.approvalOn(d.id, el);
    else if (name === 'apprOff') this.approvalOff(d.id, el);
  }

  // -------------------------------------------------------------------------------------------------------------- review drawer
  openReview(id, opener) {
    const s = this.s, a = this.actor;
    const n = M.byId(s.notes, id);
    if (!n || !a || !can(a, 'notes.review') || !pendingFor(s, a).some(x => x.id === id)) return null;
    const canText = can(a, 'notes.view'); const c = reviewModel(s, n, { text: canText });
    const who = M.staffShort(s, n.staff); const label = M.clientLabel(s, n.client, false);
    const chips = ui.chip(c.goal, { tone: /^No goal/.test(c.goal) ? 'danger' : 'info', size: 'sm' }) + ui.chip(c.time.replace(/ · \d+ h \d+ m tracked/, ''), { tone: 'neutral', size: 'sm' });   // units only: the demo has no time tracking
    let body = `<div class="doc-rv"><div class="doc-rv__who">${esc(c.staffLine)}</div><div class="doc-rv__chips">${chips}</div>`;
    if (!canText) body += `<div class="doc-hidden">${ui.hint('lock', 'Clinical text hidden for your role', { tone: 'n' })}</div>`;
    else body += `<div class="doc-rv__cmp"><section><h3>${esc(c.wroteLabel)}</h3><div class="doc-rv__txt">${c.wrote ? esc(c.wrote) : '<span class="doc-muted">Nothing typed or dictated: the note was written in Lauris directly.</span>'}</div></section><section><h3>Psyflo added ${ui.chip('Marked', { tone: 'success', size: 'sm' })}</h3><div class="doc-rv__txt">${c.hasEnhanced ? c.enhanced : '<span class="doc-muted">Not enhanced. Nothing was added; the checks run on what the staffer wrote.</span>'}</div></section></div><div class="doc-rv__checks" aria-label="Checks">${c.checks}</div>`;
    if (canText && c.repeat) body += `<div class="doc-rv__pat">${ui.icon('flag', 14)}<span>Same words in ${c.repeat.count} of ${esc(c.repeat.name)}'s last ${c.repeat.of} notes (${esc(c.repeat.dates)})</span></div>`;
    body += `<p class="doc-rv__lau">${laurisLink(api.config.laurisURL, a, laurisNotePath(laurisKey(M.client(s, n.client)), n), { who: label, title: `${docLabel(n.type)} ${M.fmtDate(n.date)}`, variant: 'button' })}</p>`;
    body += `<div class="doc-rv__trail">${esc(c.trail)}</div><div class="ui-field"><label class="ui-field__l" for="doc-rv-c">Note to ${esc(who)}</label><textarea class="ui-input ui-textarea" id="doc-rv-c" rows="3"></textarea><div class="doc-err" id="doc-rv-err" role="alert"></div></div></div>`;
    const decide = (decision, h) => this.decide(n, decision, h);
    return ui.drawer({
      title: c.heading, size: 'lg', returnFocus: opener, body, initialFocus: '#doc-rv-c',
      actions: [
        { label: "That didn't happen", tone: 'ghost', onClick: h => decide('flagged', h) },
        { label: 'Return with a note', tone: 'secondary', onClick: h => decide('returned', h) },
        { label: 'Approve', tone: 'primary', onClick: h => decide('approved', h) }
      ],
      onClose: () => { if (/^#\/Dashboard(\?|$)/.test(location.hash)) ui.query.writeQuery({ id: '' }); }   // a hashchange closes the drawer after the route changed: never touch another route's query
    });
  }
  async decide(n, decision, h) {
    const field = h.dialog.querySelector('#doc-rv-c'), err = h.dialog.querySelector('#doc-rv-err');
    const comment = (field.value || '').trim();
    if (decision !== 'approved' && !comment) { err.textContent = 'Say what to change.'; field.focus(); return false; }
    const label = M.clientLabel(this.s, n.client, false), who = M.staffShort(this.s, n.staff);
    try { await this.h.do('note.review', { id: n.id, decision, comment: comment || undefined }); } catch { return false; }
    this.h.toast(`${label} · ${M.fmtDate(n.date)}: ${decision === 'approved' ? 'approved' : decision === 'returned' ? 'returned to ' + who + ' with your note' : 'flagged · ' + who + ' is asked to fix it in Lauris'}`);
    this.h.repaint();
    return true;
  }

  // -------------------------------------------------------------------------------------------------------------- approval mode (Staff view)
  approvalOn(id, opener) {
    const st = M.byId(this.s.staff, id); if (!st) return; const name = M.staffShort(this.s, id);
    const reviewers = (this.s.staff || []).filter(x => ['supervisor', 'clinician'].includes(x.role));
    const dflt = this.actor.role === 'supervisor' ? this.actor.id : (st.reviewer || (reviewers[0] || {}).id);
    ui.modal({
      title: `Require approval · ${name}`, size: 'sm', returnFocus: opener,
      body: `<div class="ui-field"><label class="ui-field__l" for="doc-ap-r">Why</label><select class="ui-select" id="doc-ap-r"><option value="on review">On review (probation)</option><option value="new hire">New hire</option><option value="returning from leave">Returning from leave</option></select></div><div class="ui-field"><label class="ui-field__l" for="doc-ap-v">Reviewer</label><select class="ui-select" id="doc-ap-v">${reviewers.map(x => `<option value="${esc(x.id)}"${x.id === dflt ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>`,
      actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'Require approval', tone: 'primary', onClick: async h => {
        const reason = h.dialog.querySelector('#doc-ap-r').value, reviewer = h.dialog.querySelector('#doc-ap-v').value;
        try { await this.h.do('staff.reviewMode', { id, mode: 'every_note', reason, reviewer }); } catch { return false; }
        this.h.toast(`${name} · approval required (${reason}); new notes come to Review`); this.h.repaint();
      } }]
    });
  }
  approvalOff(id, opener) {
    const name = M.staffShort(this.s, id);
    const pend = (this.s.notes || []).filter(n => n.staff === id && n.review === 'pending').length;
    ui.modal({
      title: `Turn approval off · ${name}`, size: 'sm', returnFocus: opener,
      body: `<div>${esc(name)} goes back to spot check: new notes go to the EHR at Process Form without waiting.${pend ? ` The ${plural(pend, 'note')} already waiting stay${pend === 1 ? 's' : ''} until decided.` : ''}</div>`,
      actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'Turn approval off', tone: 'primary', onClick: async () => {
        try { await this.h.do('staff.reviewMode', { id, mode: 'spot_check' }); } catch { return false; }
        this.h.toast(`${name} · back to spot check`); this.h.repaint();
      } }]
    });
  }
}

// ?legacy=1 bypasses the redirect table, so the Documentation route can still be asked for by name: there is no old Documentation screen to show,
// so it goes where its content lives now, with the same filters.
register('Documentation', class extends Screen {
  init() {
    const p = { ...this.params }; delete p.legacy;
    const q = {}; for (const k of DOC_FILTER_KEYS) if (p[k] != null && p[k] !== '') q[k] = p[k];
    setTimeout(() => this.go('Dashboard', { ...q, view: p.view === 'staff' ? 'staff' : 'documents' }), 0);
  }
  renderVals() { return {}; }
});
