// Analytics exports (pure ESM). buildReport() reads the same views the screen shows and prints each panel through panelMatrix(), so a CSV or
// a PDF always matches what is on screen: same period, same filters, same dataset, same suppressed cells ("Fewer than 5"), plus the
// definitions and the provenance. The browser turns the CSV text and the PDF string into a file; nothing is sent anywhere.
import { PROV, PROV_LABEL, SECTIONS, SECTION_IDS, todayOf, minN } from './common.js';
import { MEASURES, definitionText } from './metrics.js';
import { sectionView, scorecardView, baselineView, filterLines, panelMatrix, stripMatrix, datasetParam, CO } from './view.js';
import { pdfReport } from './pdf-report.js';

const TITLE = { outcomes: 'Patient Outcomes', payer: 'Payer Performance', population: 'Patient Population' };

// sections: 'all' or a list of section ids
export function buildReport(s, actor, { dataset = PROV.CASE, sections = 'all', rawF = {} } = {}) {
  const secs = sections === 'all' ? SECTION_IDS.slice() : [].concat(sections).filter(x => SECTION_IDS.includes(x));
  const single = secs.length === 1 ? secs[0] : null;
  const { F, P, lines } = filterLines(s, actor, dataset, rawF, single || 'all');
  const blocks = []; const defs = [];
  const sections_ = [];
  if (dataset === PROV.CASE) {
    const sc = scorecardView(s, actor, rawF);
    const rows = sc.rows.map(r => [`${r.no}. ${r.label}`, r.headline, r.note]);
    sections_.push({ id: 'scorecard', title: 'Pilot scorecard', notes: [], blocks: [{ id: 'scorecard', title: 'Pilot scorecard', provenance: PROV.CASE, head: ['Measure', 'Result', 'Basis'], align: ['left', 'right', 'left'], body: rows, definition: '', note: 'Counts of work items are shown in full; statistics over fewer than the minimum group size are not shown.' }] });
    for (const m of MEASURES) defs.push([`${m.no}. ${m.label}`, definitionText(m.id)]);
  }
  for (const sec of secs) {
    const v = sectionView(s, actor, dataset, sec, rawF); const bl = [];
    if (v.strip) { const m = stripMatrix(v.strip); bl.push({ id: sec + '.summary', title: 'Summary', provenance: dataset, head: m.head, align: m.head.map(() => 'right'), body: m.body, definition: '', note: '' }); }
    for (const p of v.panels || []) { const m = panelMatrix(p); bl.push({ id: p.id, title: p.title, provenance: p.provenance || dataset, head: m.head, align: m.align, body: m.body, definition: p.definition || '', note: [p.note, m.body.length ? '' : p.empty || 'Nothing to show'].filter(Boolean).join(' '), maturity: p.maturity }); if (p.definition) defs.push([`${TITLE[sec]} · ${p.title}`, p.definition]); }
    if (sec === 'payer' && dataset === PROV.CASE) for (const p of baselineView(s)) { const m = panelMatrix(p); bl.push({ id: p.id, title: p.title, provenance: PROV.EXPORT, head: m.head, align: m.align, body: m.body, definition: p.definition || '', note: PROV_LABEL.harvest_export }); }
    sections_.push({ id: sec, title: TITLE[sec], notes: v.notes || [], blocks: bl, unavailable: !!v.unavailable });
  }
  const min = minN(s);
  const generated = todayOf(s);
  return {
    title: 'Psyflo analytics report', dataset, datasetLabel: PROV_LABEL[dataset], datasetParam: datasetParam(dataset), asOf: dataset === PROV.CASE ? todayOf(s) : CO.COHORT_AS_OF,
    period: P, filters: lines, scope: sections_.length ? sectionScope(s, actor, dataset) : '', generated, sectionsIncluded: secs, singleSection: single,
    source: dataset === PROV.CASE ? 'Stored requests, notes, events and client records in Psyflo (case-backed).' : 'Generated demonstration cohort of 120 patients with a fixed seed (illustrative). It is not reconciled with the cases in Authorizations or Denial Intelligence.',
    rules: [`Groups of fewer than ${min} patients are not shown; their cells print "Fewer than ${min}". The minimum group size is a setting and is never lower than 5.`, 'One dataset per report: figures from different datasets are never added together.', ...(dataset === PROV.CASE ? ['Counts of work items (the pilot scorecard, the All payers row) are tracker counts and are shown in full.'] : ['Illustrative figures describe generated data, not Harvest\'s patients.']), 'Counts describe what was documented. They do not show that one thing caused another.', 'Demo data. Nothing is real.'],
    sections: sections_, definitions: defs
  };
}
function sectionScope(s, actor, dataset) { return dataset === PROV.COHORT ? 'Generated cohort' : actor && actor.role === 'supervisor' ? 'Your sites' : 'All sites'; }

// ---------- CSV ----------
const q = v => { const t = String(v == null ? '' : v); return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
const row = a => a.map(q).join(',');
export function reportCsv(r) {
  const L = [];
  L.push(row(['Report', r.title])); L.push(row(['Dataset', r.datasetLabel])); L.push(row(['Source', r.source]));
  L.push(row(['As of', r.asOf])); L.push(row(['Generated on the demo clock', r.generated]));
  for (const [k, v] of r.filters) L.push(row([k, v]));
  L.push(row(['Scope', r.scope])); L.push(row(['Sections', r.sectionsIncluded.map(x => TITLE[x]).join('; ')]));
  for (const t of r.rules) L.push(row(['Rule', t]));
  for (const sec of r.sections) {
    L.push(''); L.push(row(['Section', sec.title]));
    for (const n of sec.notes) L.push(row(['Note', n]));
    if (sec.unavailable) L.push(row(['Note', 'Aggregates are not available for this view.']));
    for (const b of sec.blocks) {
      L.push(''); L.push(row(['Panel', b.title, 'Dataset', PROV_LABEL[b.provenance] || b.provenance]));
      L.push(row(b.head)); for (const rw of b.body) L.push(row(rw));
      if (b.note) L.push(row(['Note', b.note]));
    }
  }
  L.push(''); L.push(row(['Definitions']));
  for (const [k, v] of r.definitions) L.push(row([k, v]));
  return L.join('\n') + '\n';
}

// ---------- PDF ----------
export function reportPdfSpec(r) {
  const B = [];
  B.push({ kv: [['Dataset', r.datasetLabel], ...r.filters, ['Scope', r.scope], ['As of', r.asOf], ['Source', r.source]] });
  for (const t of r.rules) B.push({ note: t });
  for (const sec of r.sections) {
    B.push({ h: sec.title }); for (const n of sec.notes) B.push({ note: n });
    for (const b of sec.blocks) {
      B.push({ p: `${b.title}  ·  ${PROV_LABEL[b.provenance] || b.provenance}` });
      const w = b.head.map((_, i) => (i === 0 ? 2.2 : 1));
      B.push({ table: { head: b.head, rows: b.body, widths: w, align: b.align } });
      if (b.note) B.push({ note: b.note });
    }
  }
  B.push({ h: 'Definitions' });
  for (const [k, v] of r.definitions) { B.push({ p: k }); B.push({ note: v }); }
  return { title: r.title, subtitle: `${r.datasetLabel} · ${r.filters.map(f => f.join(': ')).join(' · ')}`, brand: 'Psyflo × Harvest · Analytics', stamp: r.generated, footer: `${r.datasetLabel}. Demo data, nothing is real. Groups under the minimum size are not shown.`, blocks: B };
}
export const reportPdf = r => pdfReport(reportPdfSpec(r));
export function reportFileName(r, ext) {
  const slug = x => String(x).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `Psyflo_analytics_${r.datasetParam}_${r.singleSection || 'all'}_${slug(r.period.label)}_${r.generated}.${ext}`;
}
export { SECTIONS };
