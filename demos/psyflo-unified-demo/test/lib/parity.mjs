// Helpers for test/parity.mjs (review/06-demo-and-qa.md section c): parse review/06c-parity-map.csv (one row per feature id of the master and the v3 demo),
// read the suite results of a run, classify the destination, look up the documented reason for anything dropped, write review/qa/parity-results.csv.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

export function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) { const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch; }
  if (cur || row.length) { row.push(cur); rows.push(row); } return rows.filter(r => r.length > 1);
}
export function mapRows() { const [h, ...rest] = parseCsv(read('review/06c-parity-map.csv')); return rest.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] || '']))); }
export const csvCell = v => { const t = String(v == null ? '' : v); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
export function writeCsv(file, rows) { const cols = ['id', 'feature', 'destination', 'status', 'evidence', 'notes']; fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, [cols.join(','), ...rows.map(r => cols.map(c => csvCell(r[c])).join(','))].join('\n') + '\n'); }

// suite results of a run (the run-all writes <out>/<suite>.md starting "# name · STATUS"); RESULTS_DIR overrides the default folder
export function suiteResults() {
  const dirs = [process.env.RESULTS_DIR, path.join(ROOT, 'review/test-results')].filter(Boolean); const out = {};
  for (const d of dirs) { if (!fs.existsSync(d)) continue; for (const f of fs.readdirSync(d).filter(f => f.endsWith('.md') && f !== 'summary.md')) { const m = fs.readFileSync(path.join(d, f), 'utf8').match(/^# (\S+) · (\S+)/); if (m && !(m[1] in out)) out[m[1]] = { status: m[2], dir: d }; } }
  return out;
}
// the names in the "suite" column of 06c are plans; these are the suites that exist now
export const SUITE_ALIAS = { 'portal-school': ['school'], 'portal-family': ['family'], auth: ['authorizations'], submission: ['authorizations'], denials: ['denials', 'denials-ui'], 'ext-composite': ['panels', 'smoke'], 'notes-types': ['scribe'], 'scribe-time-enhance': ['scribe', 'time', 'enhance'], 'continued-stay': ['enhance', 's4'], 'evidence-chips': ['ui-kit'], 'lauris-mock': ['lauris', 'bridge-contract'], 'portals-mock': ['bridge-contract', 'lauris'], presenter: ['ui-kit', 'fixtures'], 'server-core': [], orphans: [], donotport: [], 'dropped-parity': [], crosswalk: [], 'seed-integrity': [], analytics: ['analytics'] };
export function resolveSuites(col) { const out = []; for (const raw of String(col || '').split(/[, ]+/).filter(Boolean)) for (const s of (SUITE_ALIAS[raw] || [raw])) if (!out.includes(s)) out.push(s); return out; }

export const classify = dest => { const d = String(dest || '');
  if (/^\*{0,2}(Drop|Do not port)|\bDo not port\b|^Remove|^Roadmap|^Defer|^Drop or|Roadmap only|^Drop;/.test(d)) return 'DROP';
  if (/^Keep|Keep \(|Keep unchanged|^Keep;/.test(d)) return 'KEEP'; if (/^REPLACE|^Replace|REPLACE with/.test(d)) return 'REPLACE'; return 'MOVE'; };

// the documented reason for an id that is dropped, with where it is recorded
export function reasonFor(id, dest) {
  const rec = read('review/00-unified-recommendations.md'); const f04b = read('review/04b-feature-inventory.md');
  const R = (why, where, key) => ({ why, where, inDecisions: key ? new RegExp(key, 'i').test(rec) : false });
  if (/^V-0(37|38|93|94)$/.test(id)) return R('voice and FLO data agents are roadmap labels only (no agents, no unattended calls)', '00 decision #15 and §7 Tier 3', 'FLO and voice agents');
  if (id === 'V-054') return R('addendum on processed notes is refused: processed records are write-once; Mode B is read-only', '00 decision #1', 'No addendum');
  if (id === 'V-017' || id === 'V-031') return R('claims disputes and money exposure are Tier 3 roadmap labels', '00 §7 Tier 3', 'claims disputes');
  if (id === 'V-004') return R('v3 referral review would remove Referrals; Referrals is never redirected', '00 decision #3 and §4.1', 'Referrals');
  if (/^V-0(01|02|44|47|50|51|66|67|68|71|72|73|74)$/.test(id)) return R('duplicate of the master screen it names; the simulated v3 pages are not ported (master mock Lauris is the one simulated Lauris)', '06c destination column; 00 decision #19 (mock Lauris declared simulated once)', 'mock Lauris');
  if (/^V-0(39|83|98|99|100)$/.test(id)) return R('v3 build or in-browser backend artefact; the master architecture replaces it', '06c destination column; 04 section C (crosswalk and rules.json only)', 'master ids');
  if (id === 'V-028') return R('Help is a rail foot link in the unified shell', 'docs/UI-KIT.md §4', null);
  if (/^M-/.test(id)) return R('orphan action with no caller; removed or kept internal, listed in the inventory', '04b feature inventory (orphans) and 04 section A', null);
  return R('see the 06c destination column', '06c', null);
}
