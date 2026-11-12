// UiKit: the presenter-only gallery of every component in every state. It is also the worked example of how a controller wires the kit:
//   · fragment helpers return strings: wrap them with raw() in renderVals
//   · helpers that take callbacks (filterBar, queueTable, draftReview, timeline, emptyState) look them up by their stable `id`
//   · plain buttons inside raw HTML are wired in after(root) by a data attribute
//   · state lives on the controller (this.state) so a repaint never loses it; typed text lives in ui.draft
import { register, Screen, M, raw, esc, ui, toast, api } from '../app.js';
import { MATURITY, LEVELS, LEVEL_ORDER } from '../shared/maturity.js';
import { checkPairs } from '../ui/contrast.js';
import { presenterDock } from '../ui/dock.js';
import { sortRows } from '../ui/queue-table.js';

const SECTIONS = [['tokens', 'Tokens'], ['chips', 'Chips'], ['status', 'Status vocabulary'], ['maturity', 'Maturity'], ['controls', 'Buttons and fields'], ['filter', 'Filter bar'], ['table', 'Queue table'], ['overlays', 'Overlays'], ['timeline', 'Timeline and history'], ['draft', 'Draft review'], ['empty', 'Empty states'], ['dock', 'Presenter dock'], ['registry', 'Maturity registry']];
const sec = (id, title, html, note) => `<section class="uk-sec" aria-labelledby="uk-${id}"><h2 id="uk-${id}">${esc(title)}</h2>${note ? `<p class="ui-muted uk-note">${esc(note)}</p>` : ''}${html}</section>`;
const row = (label, html) => `<div class="uk-row"><div class="uk-row__l">${esc(label)}</div><div class="uk-row__c">${html}</div></div>`;

const DEMO_ITEMS = [
  { id: 'narrative', label: 'Narrative', staffInput: 'Worked with M.R. on taking turns in basketball. He asked for a break twice.', psyfloText: 'Staff worked with M.R. on taking turns during basketball, prompting him to ask for a break when frustrated; he asked for a break twice.', changed: ['prompting him to ask for a break when frustrated'], sources: [{ n: 1, label: 'Dictation', date: 'Oct 29', quote: 'Worked with M.R. on taking turns in basketball. He asked for a break twice.', source: 'Dictation saved from the phone, Oct 29' }], canAccept: true },
  { id: 'goal', label: 'ISP objective', staffInput: '', psyfloText: 'Objective 2: uses a break card in 2 of 3 frustrating moments.', sources: [{ n: 2, label: 'ISP goal 2', date: 'Aug 18', quote: 'Uses a break card in 2 of 3 frustrating moments.', source: 'Treatment plan, Aug 18' }], canAccept: true },
  { id: 'progress', label: 'Progress', staffInput: '', psyfloText: '', sources: [], missing: true, canAccept: false, acceptReason: 'Add a progress count first' }
];

register('UiKit', class extends Screen {
  init() {
    const q = this.params || {};
    this.state = { f: { status: q.status || '', q: q.q || '', payer: q.payer || '' }, sort: { key: 'id', dir: 'asc' }, limit: 4, items: DEMO_ITEMS.map(i => ({ ...i, state: 'pending' })), err: false };
  }
  get css() {
    return `.uk,.uk *{box-sizing:border-box}.uk a{color:var(--teal-700)}.uk-static{border:1px solid var(--line-200);border-radius:var(--r-4);max-width:420px}.uk-row__c .ui-empty{flex:1 1 100%}.uk{max-width:1100px;margin:0 auto;padding:28px var(--gutter) 64px}.uk h1{margin:0 0 4px;font-size:var(--fs-28);line-height:var(--lh-28)}.uk-lead{margin:0 0 16px}
.uk-toc{display:flex;flex-wrap:wrap;gap:6px 14px;margin:0 0 8px}.uk-toc a{font-size:var(--fs-13);font-weight:600}
.uk-sec{margin:36px 0;scroll-margin-top:calc(var(--dock-h) + 12px)}.uk-sec h2{margin:0 0 6px;font-size:var(--fs-22);line-height:var(--lh-22);border-bottom:1px solid var(--line-200);padding-bottom:8px}
.uk-note{margin:0 0 12px;font-size:var(--fs-13)}
.uk-row{display:grid;grid-template-columns:160px minmax(0,1fr);gap:12px;padding:10px 0;border-bottom:1px solid var(--line-200);align-items:start}.uk-row__l{font-size:var(--fs-12);font-weight:600;color:var(--muted-700);padding-top:4px}.uk-row__c{display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-width:0}
@media (max-width:700px){.uk-row{grid-template-columns:1fr}}
.uk-sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;width:100%}.uk-sw div{border:1px solid var(--line-200);border-radius:var(--r-2);overflow:hidden;font-size:var(--fs-12)}.uk-sw i{display:block;height:36px}.uk-sw span{display:block;padding:6px 8px;background:var(--surface-0)}
.uk-pair{width:100%;border-collapse:collapse;font-size:var(--fs-13)}.uk-pair th,.uk-pair td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line-200)}.uk-pair .pass{color:var(--success-fg);font-weight:600}.uk-pair .fail{color:var(--danger-fg);font-weight:700}
.uk-type div{margin:4px 0}.uk-dock{background:var(--navy-900);border-bottom:2px dashed var(--marigold-400);border-radius:var(--r-2) var(--r-2) 0 0;width:100%}
.uk-wide{width:100%}.uk-stage{width:100%;border:1px dashed var(--control-500);border-radius:var(--r-3);padding:14px;background:var(--surface-0)}`;
  }
  renderVals() {
    const toc = SECTIONS.map(([id, t]) => `<a href="#uk-${id}">${esc(t)}</a>`).join('');
    return { toc: raw(toc), gallery: raw(this.gallery()) };
  }
  after(root) {
    const on = (k, fn) => root.querySelectorAll(`[data-uk="${k}"]`).forEach(b => { b.onclick = fn; });
    on('modal', () => ui.modal({ title: 'Send the reply', body: '<p>Focus is trapped here. Tab, Shift+Tab, Escape and the scrim all work, and focus returns to the button.</p>', actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'Send', tone: 'primary', onClick: () => { toast('Sent (demo)'); } }] }));
    on('drawer', () => ui.drawer({ title: 'Payer details', body: ui.eventDetailHtml({ what: 'Packet sent by Sfax', at: '2026-10-22T11:05', who: 'J. Perez', actor: 'staff', document: { name: 'Signed SRA.pdf', href: '/files/none' }, source: 'Sfax confirmation F-2291', next: { label: 'Open the case', href: '#/Authorizations' } }) }));
    on('popover', (e) => ui.popover({ anchor: e.currentTarget, title: 'Why this date', body: '<p>Decision due = sent + the payer window. The window is configurable and carries a source chip.</p>', focus: true }));
    on('confirm', async () => { const ok = await ui.confirm({ title: 'Mark as sent?', body: '<p>A person presses Send; this only records it.</p>', confirmLabel: 'Record' }); toast(ok ? 'Recorded (demo)' : 'Cancelled'); });
    on('toast', () => toast('Saved'));
    on('toast-err', () => toast('Could not send: the fax number is missing', 'err'));
    on('more', () => this.setState({ limit: this.state.limit + 4 }));
    on('toggle-err', () => this.setState({ err: !this.state.err }));
  }
  gallery() {
    const s = this.s; const st = this.state;
    const out = [];

    // ----- tokens
    const tok = ['--ink-900', '--muted-700', '--paper-50', '--surface-0', '--sand-100', '--line-200', '--control-500', '--teal-600', '--teal-700', '--teal-300', '--teal-tint', '--forest-800', '--marigold-400', '--navy-900', '--danger-fg', '--danger-bg', '--warning-fg', '--warning-bg', '--success-bg', '--info-fg', '--info-bg'];
    const pairs = checkPairs();
    out.push(sec('tokens', 'Tokens',
      `<div class="uk-sw">${tok.map(t => `<div><i style="background:var(${t})"></i><span><b>${t}</b><br>${esc(getComputedStyle(document.documentElement).getPropertyValue(t).trim())}</span></div>`).join('')}</div>
      <div class="uk-type" style="margin-top:16px"><div style="font:400 var(--fs-34)/var(--lh-34) var(--font)">34/38 stat <span class="ui-num">1,284</span></div><div style="font:600 var(--fs-28)/var(--lh-28) var(--font)">28/34 h1</div><div style="font:600 var(--fs-22)/var(--lh-22) var(--font)">22/28 h2</div><div style="font:600 var(--fs-18)/var(--lh-18) var(--font)">18/26 card title</div><div style="font:400 var(--fs-16)/var(--lh-16) var(--font)">16/24 body-lg (phone, portals, inputs)</div><div style="font:400 var(--fs-14)/var(--lh-14) var(--font)">14/20 body</div><div style="font:400 var(--fs-13)/var(--lh-13) var(--font)">13/18 small (tables, panel)</div><div style="font:500 var(--fs-12)/var(--lh-12) var(--font)">12/16 caption (chips and meta only; the floor)</div></div>
      <h3>Contrast of the token pairs (${pairs.filter(p => p.pass).length} of ${pairs.length} pass)</h3>
      <table class="uk-pair"><caption class="ui-sr">Contrast of token pairs</caption><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th></tr></thead><tbody>${pairs.map(p => `<tr><td>${esc(p.label)} <span class="ui-muted">(${esc(p.fg)} on ${esc(p.bg)})</span></td><td class="${p.pass ? 'pass' : 'fail'}">${p.ratio.toFixed(2)}:1 ${p.pass ? 'pass' : 'FAIL'}</td><td>${p.min}:1</td></tr>`).join('')}</tbody></table>`));

    // ----- chips
    out.push(sec('chips', 'Chips',
      row('chip tones', ['neutral', 'info', 'success', 'warning', 'danger', 'outline', 'navy'].map(t => ui.chip(t, { tone: t })).join('')) +
      row('with icon, detail', ui.chip('Overdue', { tone: 'danger', icon: 'alert', detail: '3 days' }) + ui.chip('Due soon', { tone: 'warning', icon: 'clock', detail: '9 h left' }) + ui.chip('Small', { size: 'sm' })) +
      row('sourceChip (rule provenance)', ['official', 'payer', 'harvest', 'unverified'].map(k => ui.sourceChip(k, { source: 'Example source', verified_on: '2026-11-08' })).join('')) +
      row('datasetChip (analytics)', ['case_backed', 'harvest_export', 'illustrative'].map(k => ui.datasetChip(k)).join('')) +
      row('evidenceChip', ui.evidenceChip({ n: 2, label: 'Screening call', date: 'Oct 16', quote: 'Grandmother reports three outbursts a week at school.', source: 'Screening call, Oct 16', href: 'https://example.invalid/lauris', hrefLabel: 'Open in Lauris' }) + ui.evidenceChip({ state: 'missing', label: 'prior services outcome' }) + ui.evidenceChip({ n: 5, label: 'Weekly call', date: 'Oct 9', state: 'excluded', reason: 'Marked exclude by the clinician' }) + ui.evidenceChip({ n: 7, label: 'Incident note', date: 'Oct 20', state: 'sensitive', reason: 'Household disclosure' })) +
      row('progress', ui.progress({ value: 3, max: 14, label: 'Reviewed' }) + ui.progress({ value: 83, max: 110, label: 'Units used', tone: 'warning' })) +
      row('stepper', ui.stepper([{ label: 'Draft' }, { label: 'Review' }, { label: 'Sign' }, { label: 'Send' }], { current: 2 })) +
      row('statStrip', ui.statStrip([{ label: 'Needs action', value: 5 }, { label: 'Awaiting signature', value: 2, href: '#/Authorizations' }, { label: 'Renewal due', value: 1, sub: 'in 14 days' }]))));

    // ----- status vocabulary (exported map)
    const V = ui.STATUS;
    out.push(sec('status', 'Status vocabulary', Object.entries(V).map(([kind, map]) => row(kind, Object.keys(map).map(k => ui.statusChip(k, { kind })).join(''))).join(''), 'ui.STATUS maps every request.stage value and dispute status to text, tone and icon; test/ui-kit.mjs checks that every stage the server can produce resolves.'));

    // ----- maturity
    out.push(sec('maturity', 'Maturity',
      row('levels', LEVEL_ORDER.map(l => ui.maturity({ level: l, note: LEVELS[l].tip }, {})).join('')) +
      row('always visible', ui.maturity('route.Analytics') + ui.maturity('route.ExtScreening') + ui.maturity('route.Submission')) +
      row('Working (hidden unless the overlay is on)', ui.maturity('route.Authorizations') + ' <span class="ui-muted">Toggle Maturity in the presenter dock to show it.</span>'),
      'Client-facing screens show chips only for Simulated, Pilot (preview) and Future. Working appears when the presenter overlay is on.'));

    // ----- controls
    out.push(sec('controls', 'Buttons and fields',
      row('buttons', ['primary', 'secondary', 'ghost', 'danger'].map(t => `<button type="button" class="ui-btn ui-btn--${t}">${t}</button>`).join('') + `<button type="button" class="ui-btn ui-btn--primary" disabled>disabled</button><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm">small</button>`) +
      row('fields', `<label class="ui-field" style="margin:0"><span class="ui-field__l">Reply by</span><input class="ui-input" value="Oct 30"></label><label class="ui-field" style="margin:0"><span class="ui-field__l">Payer</span><select class="ui-select"><option>Anthem</option><option>Sentara</option></select></label>`) +
      row('draftField (typing survives a repaint)', `<div class="uk-wide">${ui.draftField({ key: 'uk:reply', label: 'Reply draft', value: 'Type here, then wait for a repaint.', hint: 'Held in ui.draft, not in the DOM' })}</div>`) +
      row('tooltip, info popover, keys', ui.tooltip('Short help text read by screen readers') + ui.infoPopover({ label: 'How the rule works', title: 'Unit rule', html: '<p>Units come from the configured bands (120/180/300 minutes). Source and verification are shown next to the number.</p>', visibleLabel: true }) + ui.kbd('Ctrl', 'Shift', 'P'))));

    // ----- filter bar
    const payers = [['', 'All payers'], ...[...new Set(s.requests.map(r => r.payer))].map(p => [p, M.payerShort(s, p)])];
    const rows = this.rows();
    const filtered = this.filtered(rows);
    const counts = k => rows.filter(r => this.group(r) === k).length;
    out.push(sec('filter', 'Filter bar',
      `<div class="uk-stage">${ui.filterBar({ id: 'uk-fb', state: st.f, search: { key: 'q', placeholder: 'Search cases' }, chips: [{ key: 'status', value: 'needs', label: 'Needs action', count: counts('needs') }, { key: 'status', value: 'awaiting', label: 'Awaiting signature', count: counts('awaiting') }, { key: 'status', value: 'submitted', label: 'Submitted', count: counts('submitted') }, { key: 'status', value: 'active', label: 'Active', count: counts('active') }], selects: [{ key: 'payer', label: 'Payer', options: payers }], shown: filtered.length, total: rows.length, noun: 'cases', onChange: f => this.setState({ f, limit: 4 }) })}</div>`,
      'Chips use aria-pressed; the state is written into the URL query (reload keeps it).'));

    // ----- queue table
    const cols = [
      { key: 'id', label: 'Case', sort: true, primary: true, render: r => `<b>${esc(r.label)}</b><div class="ui-muted" style="font-size:12px">${esc(r.id)}</div>` },
      { key: 'payer', label: 'Payer', sort: true, hideBelow: 1024, render: r => esc(r.payerLabel) },
      { key: 'stage', label: 'Status', sort: true, render: r => ui.statusChip(r.stage) },
      { key: 'clock', label: 'Deadline', hideBelow: 1280, render: r => esc(r.clock) },
      { key: 'units', label: 'Units', sort: true, align: 'right', render: r => r.units ? `<span class="ui-num">${esc(r.units)}</span>` : '<span class="ui-muted">—</span>' }
    ];
    const sorted = sortRows(filtered, st.sort, { units: r => r.unitsN, payer: r => r.payerLabel });
    const tbl = (extra) => ui.queueTable({ id: 'uk-qt', caption: 'Requests', columns: cols, rows: sorted, rowId: r => r.id, href: r => '#/' + (r.href || 'Authorizations'), sort: st.sort, onSort: sort => this.setState({ sort }), limit: st.limit, limitStep: 4, onMore: () => this.setState({ limit: st.limit + 4 }), maxHeight: '420px', ...extra });
    out.push(sec('table', 'Queue table',
      `<div class="uk-stage" style="padding:0">${tbl()}</div>
      <h3>Empty, loading and error</h3>
      ${row('empty', `<div class="uk-wide">${ui.queueTable({ id: 'uk-qt-empty', caption: 'Empty example', columns: cols, rows: [], empty: { title: 'No cases match', body: 'Clear a filter to see more.' } })}</div>`)}
      ${row('loading', `<div class="uk-wide">${ui.queueTable({ id: 'uk-qt-load', caption: 'Loading example', columns: cols, rows: [], loading: true })}</div>`)}
      ${row('error', `<div class="uk-wide">${ui.queueTable({ id: 'uk-qt-err', caption: 'Error example', columns: cols, rows: [], error: { title: 'Could not load cases', body: 'The server did not answer.', onRetry: () => { toast('Retrying (demo)'); } } })}</div>`)}`,
      'Sortable headers (aria-sort), sticky header, Enter or click opens a row (a real link in the first cell), ArrowUp/ArrowDown move between rows, "Show more" pager.'));

    // ----- overlays
    out.push(sec('overlays', 'Overlays',
      row('imperative', ['modal', 'drawer', 'popover', 'confirm'].map(k => `<button type="button" class="ui-btn ui-btn--secondary" data-uk="${k}">Open ${k}</button>`).join('') + `<button type="button" class="ui-btn ui-btn--secondary" data-uk="toast">Toast</button><button type="button" class="ui-btn ui-btn--secondary" data-uk="toast-err">Error toast</button>`) +
      row('static markup', `<div class="uk-wide" style="position:relative">${ui.dialogHtml({ title: 'Dialog markup', body: '<p>role="dialog", aria-modal, aria-labelledby on the title.</p>', actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'OK', tone: 'primary' }], id: 'uk-static-dlg', className: 'uk-static' })}</div>${ui.toastHtml('Saved')}${ui.toastHtml('Could not send', 'err')}`) +
      row('skip link', `<div class="ui-muted">${ui.skipLink().replace('class="ui-skip"', 'class="ui-skip" style="position:static"')}</div>`),
      'Focus moves in, Tab is trapped, Escape closes the top layer, scrim click closes, focus returns to the opener.'));

    // ----- timeline and history
    const evs = this.events();
    out.push(sec('timeline', 'Timeline and history',
      `<div class="uk-stage">${ui.timeline(evs, { id: 'uk-tl' })}</div><h3>History</h3>${ui.history(evs, { id: 'uk-hs', limit: 3, open: true })}`,
      'Events open a detail: What · When · Who · Document · Source · Next action. Missing fields read "Not recorded".'));

    // ----- draft review
    const dr = ui.draftReview({
      id: 'uk-dr', title: 'Daily note · M.R.', items: st.items, versions: ['Original', 'PsyFlo draft', 'Clinician edited', 'Approved', 'Synchronized'], current: 1, bulk: { count: st.items.filter(i => i.state === 'pending' && i.sources.length && !i.missing).length },
      onAccept: id => this.mark(id, 'accepted'), onReject: id => this.mark(id, 'rejected'), onEdit: id => this.patch(id, { editing: true }), onCancel: id => this.patch(id, { editing: false }),
      onSave: (id, text) => this.patch(id, { editing: false, state: 'edited', prev: this.item(id).psyfloText, psyfloText: text, hasPrevious: true, changed: [] }),
      onRestore: id => { const i = this.item(id); this.patch(id, { psyfloText: i.prev, hasPrevious: false, state: 'pending' }); ui.draft.clearPrefix('uk-dr:'); },
      onAcceptSourced: () => this.setState({ items: st.items.map(i => i.state === 'pending' && i.sources.length && !i.missing ? { ...i, state: 'accepted' } : i) }),
      onApprove: () => toast('Approved. A person still presses Process Form in Lauris (demo).') });
    out.push(sec('draft', 'Draft review', `<div class="uk-wide">${dr}</div>`, 'Three-way: staff input, PsyFlo wording, source. Narrow containers switch to tabs. No bulk accept: the button only counts items that have sources.'));

    // ----- empty
    out.push(sec('empty', 'Empty states',
      row('empty', ui.emptyState({ title: 'Nothing needs action', body: 'New items appear here.' })) + row('with action', ui.emptyState({ title: 'No referrals yet', action: { label: 'Open Referrals', href: '#/Referrals' } })) +
      row('denied', ui.emptyState({ tone: 'denied', title: 'Not available for Direct support', body: 'Ask an administrator.', action: { label: 'Go to My Work', href: '#/' } })) + row('error', ui.emptyState({ tone: 'error', title: 'Could not load', onAction: () => toast('Retrying (demo)'), action: { label: 'Try again' }, id: 'uk-es-err' }))));

    // ----- dock (static preview; the live dock is the ribbon above the page)
    out.push(sec('dock', 'Presenter dock', `<div class="uk-dock sh-dock" style="position:static" data-state="open" data-mode="presentation">${presenterDock({ state: 'open', mode: 'presentation', preset: s.preset, today: M.fmtDate(s.today, { dow: true }), idPrefix: 'uk-' })}</div>
      <p class="ui-muted">Static preview. The live dock is the ribbon above the product: <kbd class="ui-kbd">Ctrl</kbd>+<kbd class="ui-kbd">Shift</kbd>+<kbd class="ui-kbd">P</kbd> or <code>?present=1</code>; always open in Explore mode (<code>?mode=explore</code>).</p>`));

    // ----- registry
    const groups = LEVEL_ORDER.map(l => [l, Object.entries(MATURITY).filter(([, v]) => v.level === l)]);
    out.push(sec('registry', 'Maturity registry', groups.map(([l, list]) => `<h3>${esc(LEVELS[l].label)} (${list.length})</h3><ul class="uk-list" style="list-style:none;padding:0;margin:0">${list.map(([id, v]) => `<li style="padding:4px 0">${ui.maturity(v, { className: 'is-forced' })} <b>${esc(v.title || id)}</b> <code>${esc(id)}</code> <span class="ui-muted">${esc(v.note || '')}</span></li>`).join('')}</ul>`).join('')));
    out.push(sec('hint', 'Hint and date card',
      row('hint: an icon whose definition shows on hover and on focus (tones r y g b n; a link with href; a short number beside the icon)', ui.hint('clock', 'Due soon: the date is within 7 days', { tone: 'y' }) + ui.hint('alert', 'Past due', { tone: 'r' }) + ui.hint('check', 'Done', { tone: 'g' }) + ui.hint('info', 'Quiet definition') + ui.hint('inbox', 'Open the inbox', { tone: 'b', href: '#/UiKit', text: '3' })) +
      row('dateCard: the one date-range card of Authorizations and Denial Intelligence', ui.dateCard({ id: 'uk-dc', title: 'Decision date', hint: 'Which dates the list matches', from: '', to: '', chips: [{ key: 'today', label: 'Today', from: '', to: '' }, { key: 'week', label: 'This week', from: '', to: '' }, { key: 'before', label: 'Before this week', from: '', to: '' }], onChange: () => { } }))));

    return out.join('');
  }
  // ----- gallery data
  group(r) { return (ui.STATUS.stage[r.stage] || {}).group || ''; }
  rows() {
    const s = this.s;
    return s.requests.map(r => ({ id: r.id, stage: r.stage, label: M.clientLabel(s, r.client), payer: r.payer, payerLabel: M.payerShort(s, r.payer), clock: M.requestClock(s, r).text, units: r.units_awarded ? `${r.units_awarded} / ${r.units_requested}` : String(r.units_requested || ''), unitsN: r.units_awarded || r.units_requested || 0, href: M.requestHref(r).replace('.dc.html?', '?') }));
  }
  filtered(rows) {
    const f = this.state.f;
    return rows.filter(r => (!f.status || this.group(r) === f.status) && (!f.payer || r.payer === f.payer) && (!f.q || (r.label + ' ' + r.id + ' ' + r.payerLabel).toLowerCase().includes(f.q.toLowerCase())));
  }
  events() {
    const s = this.s; const real = M.eventsFor(s, 'R-0402');
    const sample = [
      { id: 'e1', at: '2026-10-13T09:20', what: 'Send pressed · faxed through Sfax', who: 'J. Perez', actor: 'staff', document: { name: 'Signed SRA.pdf' }, source: 'Sfax reference F-2291', next: { label: 'Open the case', href: '#/Authorizations' } },
      { id: 'e2', at: '2026-10-22T11:05', what: 'Receipt confirmed by phone (day 9)', who: 'C. Diaz', actor: 'staff', source: 'Phone call logged by staff' },
      { id: 'e3', at: '2026-10-27T15:30', what: 'Payer offered 110 units', who: 'Sentara', actor: 'payer', sim: true, source: 'Call logged by staff; no document yet' },
      { id: 'e4', at: '2026-10-28T08:10', what: 'Reply drafted from the request already sent', who: 'PsyFlo', actor: 'psyflo', tone: 'success' }
    ];
    return real.length ? real.map((e, i) => ({ id: 'r' + i, at: e.at, what: e.what, who: e.who, actor: e.who === 'psyflo' ? 'psyflo' : 'staff', sim: !!e.demo })) : sample;
  }
  item(id) { return this.state.items.find(i => i.id === id); }
  patch(id, p) { this.setState({ items: this.state.items.map(i => (i.id === id ? { ...i, ...p } : i)) }); }
  mark(id, state) { this.patch(id, { state, editing: false }); }
});
