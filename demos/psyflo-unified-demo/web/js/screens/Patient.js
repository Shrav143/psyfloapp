// Patient chart (route Patient?id=<clientId>&section=documentation|authorization). Documentation first: notes, intake forms, CNAs and plans are owed
// whether or not a payer authorization exists. The authorization is one section of the chart, a compact summary with a link to the case.
// Data: web/js/shared/sel/roster.js patientChart(s, actor, id), which returns null for a patient outside the signed-in person's scope
// (direct support: own caseload; supervisor: managed staff and their sites), so another patient's data never reaches this screen.
import { register, Screen, M, raw, ui, esc, session, hrefFor, canOpen, api } from '../app.js';
import { ROLE_LABEL, can } from '../shared/permissions.js';
import { fmtDate } from '../shared/dates.js';
import { patientChart, chartHref } from '../shared/sel/roster.js';

const TONE = { r: 'danger', y: 'warning', n: 'neutral', g: 'success' };
const ICON = { behind: 'alert', due: 'clock', in_progress: 'pencil', pending_review: 'eye', returned: 'undo', late: 'clock', done: 'check' };
const DATE_SEV = { r: 'overdue', y: 'soon', n: 'ok', g: 'ok' };
const WRITE = { daily: 'ExtDPN', weekly_guardian: 'ExtWeekly', monthly_collateral: 'ExtMonthly' };
const FORM = { intake: 'ExtCNA', cna: 'ExtCNA', isp: 'ExtISP', quarterly: 'ExtQuarterly', discharge: 'ExtDischarge' };
const OPEN = ['behind', 'due', 'in_progress', 'pending_review', 'returned'];
const plural = (n, w) => `${n} ${n === 1 ? w : w + 's'}`;

register('Patient', class extends Screen {
  init() {
    const p = this.params;
    this.state = { scope: p.scope === 'all' ? 'all' : p.scope === 'open' ? 'open' : '', group: ['note', 'form'].includes(p.group) ? p.group : '', ...ui.pager.fromQuery(p) };
  }
  get actor() { return session.actor; }
  get section() { return this.params.section === 'authorization' ? 'authorization' : 'documentation'; }

  chart() { const a = this.actor; return a && a.role ? patientChart(this.s, a, this.params.id) : null; }

  statusChip(d) { return ui.chip(d.statusLabel, { tone: TONE[d.sev] || 'neutral', icon: ICON[d.status] || 'dot', size: 'sm' }); }
  // Lauris is where every note and form is edited and saved: one button on every row opens it on the right page
  laurisLink(d) {
    const a = this.actor; if (!d.lauris || !a || !can(a, 'ext.use')) return '';
    const url = `${api.config.laurisURL}/login?as=${encodeURIComponent(a.id || 'jperez')}&next=${encodeURIComponent(d.lauris)}`;
    return `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(url)}" target="_blank" rel="noopener">Open in Lauris${ui.icon('external', 14)}<span class="ui-sr"> ${esc(d.typeLabel)} ${esc(d.dateText || '')} (opens Lauris in a new tab)</span></a>`;
  }
  action(d, c) {
    const lau = this.laurisLink(d); const act = this.action2(d, c);
    return lau || act ? `<div class="pt-acts">${act}${lau}</div>` : '';
  }
  action2(d, c) {
    const a = this.actor, go = (label, route, qs) => canOpen(route) ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(hrefFor(route + '.dc.html?' + qs))}">${esc(label)}<span class="ui-sr"> ${esc(d.typeLabel)} ${esc(d.dateText || '')}</span></a>` : '';
    if (d.status === 'done' || d.status === 'late') return '';
    if (d.status === 'pending_review' && d.noteId && c.can.reviewNotes && canOpen('Documentation')) return `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(hrefFor('Documentation', { id: d.noteId, status: 'pending_review' }))}">Review<span class="ui-sr"> ${esc(d.typeLabel)} ${esc(d.dateText || '')}</span></a>`;
    if (d.group === 'note' && c.can.writeNotes && d.staff === a.id && WRITE[d.type] && ['behind', 'due', 'returned'].includes(d.status)) return go(d.status === 'returned' ? 'Fix note' : 'Write note', WRITE[d.type], 'client=' + encodeURIComponent(d.client));
    if (d.group === 'form' && FORM[d.type] && c.can.openForms) return go('Open', FORM[d.type], 'client=' + encodeURIComponent(d.client));
    return '';
  }

  docsHtml(c) {
    const st = this.state; const all = c.docs;
    const openN = all.filter(d => OPEN.includes(d.status)).length;
    const scope = st.scope || (openN ? 'open' : 'all');
    let rows = all.filter(d => (scope === 'open' ? OPEN.includes(d.status) : true) && (!st.group || d.group === st.group));
    const forms = rows.some(d => d.group === 'form');
    const seg = (label, key, val, count) => `<button type="button" class="pt-seg__b" data-x="seg" data-key="${key}" data-val="${val}" aria-pressed="${(key === 'scope' ? scope : st.group) === val}">${esc(label)}${count != null ? ` <b>${count}</b>` : ''}</button>`;
    const tools = `<div class="pt-tools"><div class="pt-seg" role="group" aria-label="Show">${seg('Open', 'scope', 'open', openN)}${seg('All', 'scope', 'all', all.length)}</div><div class="pt-seg" role="group" aria-label="Type">${seg('All', 'group', '', null)}${seg('Notes', 'group', 'note', null)}${seg('Forms', 'group', 'form', null)}</div>${forms ? ui.datasetChip('illustrative', { text: 'Forms: sample data, illustrative', title: 'Intake, CNA, plan, quarterly and discharge rows are sample data until the tracker is wired to Lauris. Notes come from what the extension reported.' }) : ''}</div>`;
    const cols = [
      { key: 'doc', label: 'Document', primary: true, render: d => `<b>${esc(d.typeLabel)}</b>${d.dateText ? `<span class="pt-sub">${esc(d.dateText)}</span>` : ''}` },
      { key: 'due', label: 'Due', render: d => ui.dateFlag({ date: d.due, sev: OPEN.includes(d.status) ? (d.status === 'behind' ? 'overdue' : DATE_SEV[d.sev] || 'ok') : 'ok', why: OPEN.includes(d.status) ? `${d.typeLabel}${d.dateText ? ' · ' + d.dateText : ''}` : '' }) },
      { key: 'status', label: 'Status', render: d => this.statusChip(d) },
      { key: 'staff', label: 'Staff', hideBelow: 1024, render: d => esc(d.staffShort || d.ownerShort || '—') },
      { key: 'reviewer', label: 'Reviewer', hideBelow: 1024, render: d => esc(d.reviewer || '—') },
      { key: 'act', label: 'Action', render: d => this.action(d, c) }
    ];
    const table = ui.queueTable({
      id: 'pt-docs', caption: 'Documentation', columns: cols, rows: ui.pager.slice(rows, { size: st.size, page: st.page }), rowId: d => d.id, total: rows.length, maxHeight: 'none',
      empty: { title: all.length ? 'Nothing outstanding' : 'No documentation yet', body: all.length ? 'Choose All to see what was filed.' : '' }
    });
    return tools + table + ui.pager({ id: 'pt-pg', total: rows.length, size: st.size, page: st.page, noun: 'documents', onChange: ({ size, page }) => this.setState({ size, page }) });
  }

  authHtml(c) {
    const au = c.auth;
    if (!au) return `<div class="pt-none">${ui.chip('No authorization', { tone: 'neutral', icon: 'dot' })}</div>`;
    const cell = (label, html) => `<div class="pt-cell"><span class="pt-cell__l">${esc(label)}</span><div class="pt-cell__v">${html}</div></div>`;
    const period = au.start || au.end ? `<span class="pt-period">${esc(au.start ? fmtDate(au.start) : '—')} to ${esc(au.end ? fmtDate(au.end) : '—')}</span>` : '<span class="pt-none-t">—</span>';
    const src = au.dateRule ? ui.infoPopover({ label: 'Where this date comes from', title: 'Deadline source', html: `<p>${esc(au.dateWhy || '')}</p><p>${ui.sourceChip(au.dateRule)}</p>` }) : '';
    const deadline = au.date ? `<span class="pt-dl">${ui.dateFlag({ date: au.date, sev: au.dateSev === 'none' ? 'ok' : au.dateSev, why: au.dateWhy })}${src}</span>` : '<span class="pt-none-t">—</span>';
    const next = au.next ? `<span class="pt-next"><b>${esc(au.next.label)}</b>${au.next.allowed ? '' : ui.chip(au.next.why || 'Needs another role', { tone: 'neutral', size: 'sm', icon: 'lock' })}</span>` : '<span class="pt-none-t">—</span>';
    const openCase = au.requestId && c.can.openCase ? `<a class="ui-btn ui-btn--primary" href="${esc(hrefFor('Authorization', { id: au.requestId }))}">Open case<span class="ui-sr"> ${esc(au.requestId)}</span></a>` : '';
    const di = au.row && au.row.inDI && (canOpen('DenialCase') || canOpen('Partials')) ? `<a class="ui-btn ui-btn--secondary" href="${esc(hrefFor('DenialCase', { id: au.requestId }))}">In Denial Intelligence</a>` : '';
    return `<div class="pt-auth">
      ${cell('Status', au.requestId ? ui.statusChip(au.stage, { title: au.typeLabel || '' }) : ui.chip('Active', { tone: 'success', icon: 'check' }))}
      ${cell('Payer', esc(au.payer || '—'))}${cell('Service', esc(au.service || '—'))}
      ${cell('Units', au.units ? ui.unitsBar(au.units) : '<span class="pt-none-t">—</span>')}
      ${cell('Period', period)}${cell('Deadline', deadline)}${cell('Next action', next)}
      ${openCase || di ? `<div class="pt-auth__a">${openCase}${di}</div>` : ''}
    </div>`;
  }

  renderVals() {
    const s = this.s, a = this.actor;
    const blank = body => ({ head: raw(''), tabs: raw(''), body: raw(body), maturity: raw('') });
    if (!a || !a.role) return blank(ui.emptyState({ tone: 'denied', title: 'Sign in to see this chart', action: { label: 'Sign in', href: '#/Login' } }));
    const c = this.chart();
    if (!c) return blank(ui.emptyState({ tone: 'denied', title: 'Patient not found', body: a.role === 'direct_support' ? 'This patient is not on your caseload.' : 'This patient is not on your list.', action: { label: 'Back to Dashboard', href: '#/Dashboard' } }));
    c.can.openForms = canOpen('ExtCNA') && a.role === 'clinician';
    const h = c.header; const sec = this.section;
    const openN = c.docs.filter(d => OPEN.includes(d.status)).length;
    const fact = (l, v) => v ? `<span class="pt-fact"><i>${esc(l)}</i> ${esc(v)}</span>` : '';
    const head = `<header class="pt-head"><a class="pt-back" href="${esc(hrefFor('Dashboard'))}">${ui.icon('chevR', 14)}<span>Dashboard</span></a><div class="pt-title"><h1>${esc(h.label)}</h1>${h.age ? `<span class="pt-age">${esc(h.age)}</span>` : ''}${h.stageLabel ? ui.chip(h.stageLabel, { tone: 'neutral', size: 'sm' }) : ''}${ui.chip(ROLE_LABEL[a.role] || a.role, { tone: 'outline', size: 'sm' })}</div><div class="pt-facts">${fact('Lauris #', h.lauris)}${fact('School', h.school)}${fact('Staff', h.staffShort)}${fact('Clinician', h.clinicianShort)}${fact('Payer', h.payer)}</div></header>`;
    const tab = (id, label, n) => `<a class="pt-tab" href="${esc(hrefFor(chartHref(h.id, id)))}"${sec === id ? ' aria-current="page"' : ''}>${esc(label)}${n ? `<b>${n}<span class="ui-sr"> open</span></b>` : ''}</a>`;
    const tabs = `<nav class="pt-tabs" aria-label="Chart sections">${tab('documentation', 'Documentation', openN)}${tab('authorization', 'Authorization', 0)}</nav>`;
    return { head: raw(head), tabs: raw(tabs), body: raw(sec === 'authorization' ? this.authHtml(c) : this.docsHtml(c)), maturity: raw(ui.maturity('route.Patient')) };
  }

  after(root) {
    root.querySelectorAll('[data-x="seg"]').forEach(el => {
      el.onclick = e => {
        e.preventDefault(); const key = el.dataset.key, val = el.dataset.val;
        ui.query.writeQuery({ [key]: key === 'group' ? val : val }); this.setState({ [key]: val, page: 1 });
      };
    });
  }
});
