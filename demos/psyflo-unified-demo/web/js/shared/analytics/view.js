// Analytics: the one model the screen, the question box and the exports all read (pure ESM). A "view" is one dataset and one section; it holds
// the panels (plain JSON, see panels.js), the filters that were applied and where the numbers come from. Because the screen prints a panel
// with panelMatrix() and the CSV and the PDF print the same matrix, an export always matches the screen.
import { PROV, PROV_LABEL, SECTIONS, SECTION_IDS, PERIODS, cellText, isSup } from './common.js';
import * as CB from './casebacked.js';
import * as CO from './cohort.js';
import { payerShort } from '../model.js';
import { fmtDate } from '../dates.js';

export const DATASET_IDS = ['case', 'illustrative'];
export const datasetOf = x => (x === 'illustrative' ? PROV.COHORT : PROV.CASE);
export const datasetParam = prov => (prov === PROV.COHORT ? 'illustrative' : 'case');
export const normSection = x => (SECTION_IDS.includes(x) ? x : 'outcomes');
export { SECTIONS, PROV, PROV_LABEL };

// ---------- filters ----------
export const normalizeFilters = (prov, raw, s) => (prov === PROV.COHORT ? CO.cohortFilters(raw) : CB.normalizeFilters(raw, s));
const ALL = label => ['', label];
// the selects the filter bar shows for this dataset and section ([key, label, options])
export function filterSpec(s, actor, prov, section) {
  const sel = [{ key: 'period', label: 'Period', options: PERIODS.map(p => [p[0], p[1]]) }];
  if (prov === PROV.COHORT) {
    sel.push({ key: 'site', label: 'Site', options: [ALL('All sites'), ...CO.cohortSiteOptions()] });
    sel.push({ key: 'program', label: 'Program', options: [ALL('All programs'), ...CO.cohortProgramOptions()] });
    sel.push({ key: 'payer', label: 'Payer', options: [ALL('All payers'), ...CO.cohortPayerOptions()] });
    return sel;
  }
  const sites = CB.siteOptions(s, actor); if (sites.length > 1) sel.push({ key: 'site', label: 'Site', options: [ALL(actor && actor.role === 'supervisor' ? 'Your sites' : 'All sites'), ...sites.map(([id, n]) => [id, n])] });
  if (section === 'payer') { const ctx = CB.makeCtx(s, actor, {}); sel.push({ key: 'payer', label: 'Payer', options: [ALL('All payers'), ...CB.payerOptions(s, ctx)] }); }
  return sel;
}
export function filterLines(s, actor, prov, rawF, section) {
  const F = normalizeFilters(prov, rawF, s); const P = prov === PROV.COHORT ? CO.cohortPeriod(F) : CB.periodFor(s, F);
  const lines = [['Period', `${P.label}${P.days ? ` (${fmtDate(P.from, { year: true })} to ${fmtDate(P.to, { year: true })})` : ''}`]];
  const site = F.site ? (prov === PROV.COHORT ? F.site : ((s.schools || []).find(x => x.id === F.site) || {}).name || F.site) : (actor && actor.role === 'supervisor' && prov === PROV.CASE ? 'Your sites' : 'All sites');
  lines.push(['Site', site]);
  if (prov === PROV.COHORT) { lines.push(['Program', F.program ? (CO.PROGRAMS.find(p => p[0] === F.program) || [0, F.program])[1] : 'All programs']); lines.push(['Payer', F.payer ? CO.cohortPayerOptions().find(p => p[0] === F.payer)[1] : 'All payers']); }
  else if (section === 'payer' || section === 'all') lines.push(['Payer', F.payer ? payerShort(s, F.payer) : 'All payers']);
  return { F, P, lines };
}

// ---------- panels as text ----------
// head: the column labels; body: one array of strings per row. The screen, the CSV and the PDF all print this.
export function panelMatrix(p) {
  const cols = p.columns || [];
  return { head: cols.map(c => c.label), align: cols.map(c => c.align || 'left'), body: (p.rows || []).map(r => cols.map(c => cellText(r[c.key]))) };
}
export const stripMatrix = strip => ({ head: strip.map(x => x.label), body: [strip.map(x => cellText(x.value))] });

// ---------- a view ----------
// -> { dataset, section, panels, strip?, notes, unavailable, period, filters, asOf, source, scopeLabel }
export function sectionView(s, actor, prov, section, rawF) {
  const v = prov === PROV.COHORT ? CO.cohortSection(s, section, rawF) : CB.caseSection(s, section, rawF, actor);
  const ctx = CB.makeCtx(s, actor, {});
  return { ...v, section, scopeLabel: prov === PROV.COHORT ? 'Generated cohort' : ctx.sites === 'all' ? 'All sites' : `Your sites: ${ctx.sites.map(id => ((s.schools || []).find(x => x.id === id) || {}).name || id).join(', ')}` };
}
export const scorecardView = (s, actor, rawF) => CB.scorecard(s, rawF, actor);
export const baselineView = s => CB.baselinePanels(s);
export { CB, CO };

// every figure that is a number in a panel (used by the question box and the tests)
export const allPanels = v => v.panels || [];
export const findRow = (panel, label) => (panel.rows || []).find(r => String(r.label) === label);
export const anySuppressed = panel => (panel.rows || []).some(r => Object.values(r).some(isSup));
