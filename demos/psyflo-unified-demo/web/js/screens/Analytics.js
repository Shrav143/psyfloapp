// Analytics (E4): Patient Outcomes | Payer Performance | Patient Population, one dataset per view, behind a pilot scorecard.
//   #/Analytics?section=outcomes|payer|population&dataset=case|illustrative&period=30d|90d|ytd|all&site=…&payer=…&program=…
// Every figure comes from web/js/shared/analytics/* (pure selectors shared with the server): case-backed counts from the stored records, the
// seeded baseline labelled "Sample data, illustrative", or the generated cohort. A group of fewer than 5 prints "Fewer than 5". The screen, the
// CSV and the PDF all print the same panels, so an export matches what is on screen.
import { register, Screen, raw, esc, ui, toast, session, hrefFor, api, canOpen } from '../app.js';
import { legacyFor } from '../registry.js';
import * as V from '../shared/analytics/view.js';
import * as C from '../shared/analytics/common.js';
import * as X from '../shared/analytics/export.js';
import * as Ask from '../shared/analytics/ask.js';
import { pdfReport } from '../shared/analytics/pdf-report.js';
import { renderPanel, renderScorecard, renderList, renderBreakdown, measureDefinitions } from './AnalyticsParts.js';
import { rule } from '../shared/rules.js';
import { fmtDate } from '../shared/dates.js';
import { MATURITY } from '../shared/maturity.js';

const maturity = id => (MATURITY[id] ? ui.maturity(id) : '');
const csvCell = v => { const t = String(v == null ? '' : v); return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

register('Analytics', class extends Screen {
  async init() {
    const q = this.params || {};
    this.state = { dataset: q.dataset === 'illustrative' ? 'illustrative' : 'case', section: V.normSection(q.section), open: {},
      f: { period: C.normPeriod(q.period), site: q.site || '', payer: q.payer || '', program: q.program || '' } };
    this.sampleOpen = false; this.guided = false;
    this.pg = null; try { this.pg = await import('../shared/payer-guidance.js'); } catch { this.pg = null; }   // E3's payer guidance, when it exists
  }
  get actor() { return session.actor; }
  get prov() { return V.datasetOf(this.state.dataset); }
  href(route) { const t = legacyFor({ id: route.id, params: route.params || {} }); return hrefFor(t.id, t.params); }
  hash(section, dataset) {
    const f = this.state.f; const q = new URLSearchParams({ section, dataset }); if (f.period) q.set('period', f.period);
    if (dataset === 'illustrative') { for (const k of ['site', 'payer', 'program']) if (f[k] && this.state.dataset === 'illustrative') q.set(k, f[k]); } else if (this.state.dataset === 'case') { if (f.site) q.set('site', f.site); if (f.payer && section === 'payer') q.set('payer', f.payer); }
    return '#/Analytics?' + q.toString();
  }

  renderVals() {
    const s = this.s, actor = this.actor, st = this.state, prov = this.prov;
    if (!actor) return { head: '', banner: '', filters: '', scorecard: '', tabs: '', body: '' };
    const ctx = V.CB.makeCtx(s, actor, {});
    const view = V.sectionView(s, actor, prov, st.section, st.f);
    const sc = prov === C.PROV.CASE ? V.scorecardView(s, actor, st.f) : null;
    this._sc = sc; this._view = view; this._ctx = ctx;
    return {
      head: raw(this.head()), banner: raw(this.banner(view, ctx)),
      filters: raw(ui.filterBar({ id: 'an-f', label: 'Filters', selects: V.filterSpec(s, actor, prov, st.section), state: st.f, defaults: { period: C.DEFAULT_PERIOD }, onChange: f => this.setState({ f }) })),
      scorecard: raw(sc ? renderScorecard(sc, { periodLabel: sc.period.label }) : ''), tabs: raw(this.tabs()), body: raw(this.body(view, ctx))
    };
  }
  head() {
    const seg = [['case', 'Case-backed'], ['illustrative', 'Illustrative cohort']].map(([id, l]) => `<a href="${esc(this.hash(this.state.section, id))}" aria-current="${this.state.dataset === id}">${l}</a>`).join('');
    return `<div class="a-head"><h1 id="a-h1">Analytics</h1><div class="a-acts"><nav class="a-seg" aria-label="Dataset">${seg}</nav>
      <button type="button" class="ui-btn ui-btn--secondary" data-x="ask">Ask</button><button type="button" class="ui-btn ui-btn--secondary" data-x="earlier">Earlier views</button><button type="button" class="ui-btn ui-btn--primary" data-x="export">Export</button></div></div>`;
  }
  banner(view, ctx) {
    const ill = this.prov === C.PROV.COHORT; const asOf = fmtDate(view.asOf, { year: true });
    const only = !ctx.drill ? `<span class="ui-sp"></span>${ui.chip('Aggregates only', { tone: 'neutral', icon: 'lock' })}${ui.infoPopover({ label: 'Why aggregates only', title: 'Aggregates only', html: '<p>Patient-level rows need clinical-records access: a clinician, own caseload. Your role sees groups of 5 or more.</p>' })}` : '';
    if (ill) return `<div class="a-banner a-banner--illustrative" role="status">${ui.datasetChip(C.PROV.COHORT)}<span>Generated cohort of 120 patients · data through ${esc(asOf)}</span><span class="a-muted">Not reconciled with Authorizations or Denial Intelligence.</span><a href="${esc(this.hash(this.state.section, 'case'))}">Back to case-backed</a>${only}</div>`;
    return `<div class="a-banner" role="status">${ui.datasetChip(C.PROV.CASE)}<span>Counted from stored records · as of ${esc(asOf)}</span><span class="a-muted">${esc(view.scopeLabel)}</span>${only}</div>`;
  }
  tabs() {
    return `<nav class="a-tabs" aria-label="Analytics sections">${V.SECTIONS.map(([id, l]) => `<a href="${esc(this.hash(id, this.state.dataset))}" ${this.state.section === id ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
  }
  body(view, ctx) {
    const st = this.state, s = this.s;
    const title = V.SECTIONS.find(x => x[0] === st.section)[1];
    const mat = maturity('analytics.' + st.section);
    const o = { drill: ctx.drill && this.prov === C.PROV.CASE, href: r => this.href(r), open: st.open, dataset: this.prov, rule: (key, payer) => ui.sourceChip(rule(s, key, payer)) };
    let head = `<div class="a-sec__h"><h2>${esc(title)}</h2>${mat}`;
    if (st.section === 'payer') head += `<span class="ui-sp"></span><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="guidance">Payer guidance</button>`;
    head += '</div>';
    if (view.unavailable) return head + ui.emptyState({ tone: 'empty', title: 'Aggregates not ready', body: 'Open the presenter dock and reset the demo data to rebuild them.' });
    const strip = view.strip ? `<div class="a-strip">${ui.statStrip(view.strip.map(x => ({ label: x.label, value: C.cellText(x.value) })), { label: title })}</div>` : '';
    const notes = (view.notes || []).map(n => `<p class="a-muted">${esc(n)}</p>`).join('');
    const grid = `<div class="a-grid">${(view.panels || []).map(p => renderPanel(p, o)).join('')}</div>`;
    let sample = '';
    if (st.section === 'payer' && this.prov === C.PROV.CASE) {
      const base = V.baselineView(s);
      if (base.length) sample = `<details class="a-sample"${this.sampleOpen ? ' open' : ''}><summary>${ui.datasetChip(C.PROV.EXPORT)}<span>Earlier baseline</span></summary><div><div class="a-grid">${base.map(p => renderPanel(p, { ...o, drill: false })).join('')}</div></div></details>`;
    }
    return head + strip + notes + grid + sample;
  }

  after(root) {
    root.querySelectorAll('[data-x]').forEach(el => { el.onclick = e => { e.preventDefault(); this.act(el.dataset.x, el); }; });
    const d = root.querySelector('details.a-sample'); if (d) d.ontoggle = () => { this.sampleOpen = d.open; };
    if (!this.guided && this.params && this.params.panel === 'guidance' && this.state.section === 'payer') { this.guided = true; setTimeout(() => this.guidance(this.params.payer), 0); }
  }
  act(x, el) {
    if (x === 'measure') return this.measure(el.dataset.id);
    if (x === 'defs') return ui.drawer({ title: 'Pilot measures', returnFocus: el, body: `<p class="a-muted">Each measure is defined once, here, before its figure is shown.</p>${measureDefinitions(this._sc)}` });
    if (x === 'drill') return this.drill(el.dataset.p, el.dataset.k, el);
    if (x === 'more') return this.setState({ open: { ...this.state.open, [el.dataset.p]: !this.state.open[el.dataset.p] } });
    if (x === 'ask') return this.ask(el);
    if (x === 'export') return this.exportDialog(el);
    if (x === 'earlier') return this.earlier(el);
    if (x === 'guidance') return this.guidance();
  }

  // ---------- a pilot measure ----------
  measure(id) {
    const r = (this._sc || { rows: [] }).rows.find(x => x.id === id); if (!r) return;
    const drillNote = (id === 'notes' || id === 'intake') && r.list === null && !r.unavailable ? `<p class="a-muted">Per-student and per-case rows need clinical-records access (a clinician, own caseload).</p>` : '';
    const rules = r.rules && r.rules.length ? `<dt>Rules used</dt><dd>${r.rules.map(x => `${esc(x.label)}: ${esc(x.value)} ${esc(x.unit || '')} ${ui.sourceChip({ category: x.category, source: x.source })}`).join('<br>')}</dd>` : '';
    ui.drawer({ title: `${r.no}. ${r.label}`, body: `<p class="a-muted">${esc(this._sc.period.label)} · ${esc(this._view.scopeLabel)}</p><p><b class="ui-num" style="font-size:var(--fs-22)">${esc(r.headline)}</b> <span class="a-muted">${esc(r.note)}</span></p>${renderBreakdown(r.breakdown)}${r.list ? '<h4 style="margin:16px 0 0">Cases</h4>' + renderList(r.list, route => this.href(route)) : ''}${drillNote}
      <dl class="a-def"><dt>Numerator</dt><dd>${esc(r.numerator || r.definition)}</dd><dt>Denominator</dt><dd>${esc(r.denominator || '')}</dd><dt>Source</dt><dd>${esc(r.source)}</dd><dt>Read by</dt><dd>${esc(r.reads)}</dd><dt>Limits</dt><dd>${esc(r.limits)}</dd>${rules}</dl>` });
  }

  // ---------- patient-level rows behind a group (clinician only) ----------
  drill(p, k, el) {
    const res = V.CB.membersOf(this.s, this.actor, this.state.f, { p, k });
    const panel = (this._view.panels || []).find(x => x.id === p); const row = panel && panel.rows.find(r => (r._drill && r._drill.k === k) || Object.values(r._drills || {}).some(d => d.k === k));
    const title = panel ? panel.title : 'Patients';
    if (res.denied) return ui.drawer({ title, body: ui.emptyState({ tone: 'denied', title: 'Needs clinician access', body: res.reason }), returnFocus: el });
    ui.drawer({ title, returnFocus: el, body: `<p class="a-muted">${ui.datasetChip(C.PROV.CASE)} ${esc(row ? row.label : '')} · ${res.rows.length} patient${res.rows.length === 1 ? '' : 's'} · clinical-records access</p>
      <ul class="a-list">${res.rows.map(r => `<li><span><a href="${esc(this.href(r.route))}">${esc(r.initials)}</a> <span class="a-muted">${esc(r.site)}</span></span><b>${esc(String(r.stage || '').replace(/_/g, ' '))}</b></li>`).join('')}</ul>` });
  }

  // ---------- the question box ----------
  ask(el) {
    const self = this;
    const body = `<div class="a-ask"><p>${ui.maturity(MATURITY['analytics.ask'] || { level: 'simulated', note: 'Rule-based answers from the figures on this screen. No language model.' })} <span class="a-muted">Answers only from the data on this screen.</span></p>
      <form data-ask><div class="ui-field"><label class="ui-field__l" for="a-q">Question</label><input class="ui-input" id="a-q" autocomplete="off" placeholder="Which notes were late?"></div><button type="submit" class="ui-btn ui-btn--primary">Ask</button></form>
      <div class="a-sug">${Ask.SUGGESTED.map(q => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div><div class="a-ans" data-ans role="status" aria-live="polite"></div></div>`;
    ui.drawer({ title: 'Ask', body, returnFocus: el, initialFocus: '#a-q', onMount(dlg) {
      const out = dlg.querySelector('[data-ans]'); const input = dlg.querySelector('#a-q');
      const run = q => { input.value = q; const a = Ask.answer(self.s, self.actor, q, { dataset: self.prov, rawF: self.state.f }); out.innerHTML = self.answerHtml(a); };
      dlg.querySelector('form[data-ask]').onsubmit = e => { e.preventDefault(); run(input.value); };
      dlg.querySelectorAll('[data-q]').forEach(b => { b.onclick = () => run(b.dataset.q); });
      dlg.addEventListener('click', e => { const m = e.target.closest('[data-more]'); if (m) { e.preventDefault(); } });
    } });
  }
  answerHtml(a) {
    if (!a.ok) return `<p>${esc(a.limitation)}</p><p class="a-muted">Nothing was calculated for this question.</p>`;
    const panel = a.panel ? renderPanel({ ...a.panel, provenance: a.panel.provenance || a.provenance }, { drill: false, dataset: this.prov, href: r => this.href(r), open: {}, rule: (key, payer) => ui.sourceChip(rule(this.s, key, payer)) }) : '';
    return `<p>${ui.datasetChip(a.provenance)} <b>${esc(a.text)}</b></p><p class="a-muted">${esc(a.filters)}</p>${panel}`;
  }

  // ---------- export ----------
  exportDialog(el) {
    const self = this; const { P, lines } = V.filterLines(this.s, this.actor, this.prov, this.state.f, this.state.section);
    const sectionName = V.SECTIONS.find(x => x[0] === this.state.section)[1];
    const body = `<p>${ui.datasetChip(this.prov)} <span class="a-muted">${esc(lines.map(l => l.join(': ')).join(' · '))}</span></p>
      <fieldset class="a-choice"><legend>Format</legend><label><input type="radio" name="a-fmt" value="csv" checked> CSV</label><label><input type="radio" name="a-fmt" value="pdf"> PDF</label></fieldset>
      <fieldset class="a-choice"><legend>Scope</legend><label><input type="radio" name="a-scope" value="one" checked> ${esc(sectionName)}</label><label><input type="radio" name="a-scope" value="all"> All three sections</label></fieldset>
      <p class="a-muted">The file carries the period, the filters, the definitions and the dataset, and prints the same figures as the screen. ${maturity('analytics.export')}</p>`;
    ui.modal({ title: 'Export', size: 'sm', body, returnFocus: el, actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'Download', tone: 'primary', onClick: h => { self.exportNow(h.dialog); } }] });
  }
  exportNow(dlg) {
    const fmt = (dlg.querySelector('input[name="a-fmt"]:checked') || {}).value || 'csv', scope = (dlg.querySelector('input[name="a-scope"]:checked') || {}).value || 'one';
    try {
      const r = X.buildReport(this.s, this.actor, { dataset: this.prov, sections: scope === 'all' ? 'all' : [this.state.section], rawF: this.state.f });
      const name = X.reportFileName(r, fmt);
      if (fmt === 'csv') download(name, X.reportCsv(r), 'text/csv;charset=utf-8'); else download(name, X.reportPdf(r), 'application/pdf');
      toast(`${fmt.toUpperCase()} saved: ${name}`);
      api.do('analytics.exported', { section: scope === 'all' ? 'all' : this.state.section, dataset: this.prov, format: fmt, period: this.state.f.period }).catch(() => { });
    } catch (e) { console.error(e); toast('The file could not be built. The figures stay on this screen.', 'err'); }
  }

  // ---------- earlier views: what the old Analytics page held, still reachable ----------
  earlier(el) {
    const ctx = this._ctx; const role = this.actor.role;
    const row = (title, sub, btn) => `<li><div><b>${esc(title)}</b><small>${esc(sub)}</small></div>${btn}</li>`;
    const mrAllowed = ctx.drill; const q = canOpen('ExtQuarterly');
    const d = ui.drawer({ title: 'Earlier views', returnFocus: el, body: `<ul class="a-earlier">
      ${row('School-division report', 'Sample data, illustrative. By school.', '<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-e="division">Preview</button>')}
      ${row('Grant pull', 'Cited sentences with their dataset.', '<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-e="grant">Run</button>')}
      ${row('One child over time', mrAllowed ? 'Case-backed. M.R. quarter.' : 'Needs clinician access.', mrAllowed ? '<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-e="child">Open</button>' : ui.chip('Clinician only', { tone: 'neutral', icon: 'lock' }))}
      ${row('Quarterly review · M.R.', q ? 'Opens the extension draft.' : 'Needs clinician access.', q ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(this.href({ id: 'ExtQuarterly', params: { client: 'MR' } }))}" data-ui-close>Draft</a>` : ui.chip('Clinician only', { tone: 'neutral', icon: 'lock' }))}
      ${row('Licensure binder', 'Compliance is outside the pilot.', ui.maturity({ level: 'future', note: 'Compliance and licensure views are not part of the pilot.' }))}
      ${row('Baseline figures', 'Under Payer Performance, Earlier baseline.', `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(this.hash('payer', 'case'))}" data-ui-close>Open</a>`)}</ul>`,
      onMount: dlg => { dlg.querySelectorAll('[data-e]').forEach(b => { b.onclick = () => { const k = b.dataset.e; d.close('open'); setTimeout(() => this[k === 'division' ? 'division' : k === 'grant' ? 'grant' : 'child'](), 0); }; }); } });
    return d;
  }
  saveButtons(prefix) { return `<div class="ui-btnrow"><button type="button" class="ui-btn ui-btn--primary" data-s="pdf">Save PDF</button><button type="button" class="ui-btn ui-btn--secondary" data-s="csv">Save CSV</button></div>`; }
  fileDialog(title, bodyHtml, name, head, rows, note) {
    const self = this; const min = C.minN(this.s);
    ui.modal({ title, size: 'md', body: bodyHtml + this.saveButtons(), actions: [{ label: 'Close', tone: 'secondary' }], onMount: dlg => {
      dlg.querySelector('[data-s="pdf"]').onclick = () => { download(`${name}.pdf`, pdfReport({ title, brand: 'Psyflo × Harvest · Analytics', stamp: C.todayOf(self.s), footer: `${note}. Demo data, nothing is real.`, blocks: [{ note }, { table: { head, rows } }] }), 'application/pdf'); toast('PDF saved'); };
      dlg.querySelector('[data-s="csv"]').onclick = () => { download(`${name}.csv`, [head, ...rows].map(r => r.map(csvCell).join(',')).join('\n') + '\n', 'text/csv;charset=utf-8'); toast('CSV saved'); };
    } });
  }
  division() {
    const s = this.s, min = C.minN(s); const rows = ((s.analytics_baseline || {}).division_report || []).map(r => [(s.schools || []).find(x => x.id === r.school)?.name || r.school, r.students < min ? C.fewer(min) : String(r.students), r.office_referrals_change, String(r.incidents)]);
    const head = ['School', 'Students', 'Office referrals', 'Incidents'];
    const table = `<div class="a-scroll"><table class="a-tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'is-r' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    this.fileDialog('School-division report', `<p>${ui.datasetChip(C.PROV.EXPORT)} <span class="a-muted">By school. Schools with fewer than ${min} students are not shown.</span></p>${table}`, `Psyflo_division_report_${C.todayOf(s)}`, head, rows, 'Sample data, illustrative');
  }
  grant() {
    const s = this.s, actor = this.actor; const F = this.state.f; const st = V.sectionView(s, actor, C.PROV.CASE, 'payer', { period: F.period, site: F.site }).strip || []; const g = id => C.cellText((st.find(x => x.id === id) || {}).value); const gn = id => { const v = (st.find(x => x.id === id) || {}).value; return typeof v === 'number' ? v : null; };
    const min = C.minN(s); const pop = V.sectionView(s, actor, C.PROV.CASE, 'population', { period: F.period, site: F.site });
    const enrol = ((pop.panels || []).find(p => p.id === 'pop.enrollment') || { rows: [] }).rows.find(r => r.label === 'In service');
    const b = s.analytics_baseline || {}; const m = s.migration || {}; const comp = s.compliance || {};
    const lines = [
      [enrol && typeof enrol.n === 'number' ? `${enrol.n} students are in service in the stored records.` : `Fewer than ${min} students are in service in a group this size, so no count is given.`, C.PROV.CASE, 'Stored client records'],
      [`${g('submitted')} requests were sent and ${g('decided')} decided in the period.`, C.PROV.CASE, 'Stored requests'],
      [gn('decided') != null && gn('decided') >= min && gn('partial') != null ? `${g('partial')} of ${g('decided')} decided requests were partial.` : `Fewer than ${min} decided requests: no partial share is given.`, C.PROV.CASE, 'Stored requests'],
      m.active_students != null ? [`${m.active_students} active TDT students in the seeded export.`, C.PROV.EXPORT, 'Sample data, illustrative'] : null,
      comp.incident_reports != null ? [`${comp.incident_reports} incident reports and ${comp.cps_reports ?? 0} CPS reports in the seeded month.`, C.PROV.EXPORT, 'Sample data, illustrative'] : null,
      b.partial != null ? [`${Math.round(b.partial * 100)}% of decided SRAs were partial in the seeded 12 months.`, C.PROV.EXPORT, 'Sample data, illustrative'] : null
    ].filter(Boolean);
    const head = ['Statement', 'Dataset', 'Source']; const rows = lines.map(l => [l[0], C.PROV_LABEL[l[1]], l[2]]);
    const list = `<ol class="a-list" style="list-style:decimal inside">${lines.map(l => `<li style="display:block">${esc(l[0])} ${ui.datasetChip(l[1])}</li>`).join('')}</ol>`;
    this.fileDialog('Grant pull', `<p class="a-muted">Computed sentences, each with its dataset. Nothing is added that the rows do not say.</p>${list}`, `Psyflo_grant_pull_${C.todayOf(s)}`, head, rows, 'Case-backed and sample figures are labelled and never summed');
  }
  child() {
    const s = this.s; const mr = (s.clients || []).find(c => c.id === 'MR'); const q = (mr && mr.quarter) || {};
    const defs = [['PHQ-A (child)', q.phq_a], ['DSM cross-cutting, parent', q.dsm_parent], ['DSM cross-cutting, child', q.dsm_child], ['Daily progress rating, average', q.daily_rating], ['Office referrals a month', q.office_referrals_per_month]].filter(d => Array.isArray(d[1]));
    const head = ['Measure', 'Intake', 'Q1', 'Now']; const rows = defs.map(([n, v]) => [n, v[0], v[1], v[v.length - 1]].map(String));
    const body = defs.length ? `<p>${ui.datasetChip(C.PROV.CASE)} <span class="a-muted">${esc(mr.initials)} · what is stored on the record. Scores are listed, not interpreted.</span></p><div class="a-scroll"><table class="a-tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i ? 'is-r' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ui.emptyState({ title: 'No scores stored', body: 'The record holds no quarter series for this child.' });
    ui.modal({ title: 'One child over time', size: 'md', body, actions: [{ label: 'Close', tone: 'secondary' }] });
  }

  // ---------- payer guidance (E3's helper when present; else the seeded payer notes, labelled) ----------
  guidance(payerId) {
    const s = this.s; const list = s.payers || []; const self = this;
    const pick = id => list.find(p => p.id === id) || list[0];
    const paint = (dlg, id) => {
      const p = pick(id); if (!p) return; let html = '';
      if (self.pg && typeof self.pg.payerGuidance === 'function') { try { const g = self.pg.payerGuidance(s, p.id); html = typeof self.pg.payerGuidanceBody === 'function' ? self.pg.payerGuidanceBody(g, ui) : typeof g === 'string' ? g : g && g.html ? g.html : ''; } catch { html = ''; } }
      if (!html) html = `<p>${ui.datasetChip(C.PROV.EXPORT)}</p><dl class="a-def"><dt>What it tends to ask</dt><dd>${esc(p.tends_to_ask || 'Not recorded')}</dd><dt>What has worked</dt><dd>${esc(p.what_works || 'Not recorded')}</dd><dt>How to send</dt><dd>${esc({ fax: 'Fax (Sfax)', availity: 'Availity', portal: 'UHC portal' }[p.channel] || p.channel)}</dd></dl><p class="a-muted">Seeded sample notes. <a href="#/PayerPlaybook?legacy=1" data-ui-close>Open the earlier payer playbook</a></p>`;
      dlg.querySelector('[data-g]').innerHTML = `<h4 style="margin:12px 0 0">${esc(p.name)}</h4>${html}`;
      dlg.querySelectorAll('[data-pay]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pay === p.id)));
    };
    ui.drawer({ title: 'Payer guidance', body: `<div class="a-sug">${list.map(p => `<button type="button" data-pay="${esc(p.id)}" aria-pressed="false">${esc(p.name.replace(/ · .*$/, ''))}</button>`).join('')}</div><div data-g></div>`, onMount: dlg => { dlg.querySelectorAll('[data-pay]').forEach(b => { b.onclick = () => paint(dlg, b.dataset.pay); }); paint(dlg, payerId); } });
  }
});
