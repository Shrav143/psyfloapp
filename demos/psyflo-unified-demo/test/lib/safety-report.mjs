// Writes review/qa/safety-results.md: each 05b case id -> PASS / FAIL / NOT-RUNNABLE with the test that proves it, read from the run logs
// (RESULTS_DIR/<suite>.log written by test/run-all.mjs, default review/test-results). Usage: RESULTS_DIR=<out> node test/lib/safety-report.mjs
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './parity.mjs';

const dir = process.env.RESULTS_DIR || path.join(ROOT, 'review/test-results');
const log = s => { try { return fs.readFileSync(path.join(dir, s + '.log'), 'utf8').split('\n'); } catch { return []; } };
const line = (suite, key) => log(suite).find(l => /^(PASS|FAIL|SKIP) /.test(l) && l.includes(key));
const st = l => (!l ? 'NOT-RUN' : l.startsWith('PASS') ? 'PASS' : l.startsWith('FAIL') ? 'FAIL' : 'NOT-RUNNABLE');

// id -> [[suite, key in the test title], ...]; "u" = npm test (unit) draft.test.mjs
const OWN = id => ['safety', id];
const M = {
  'WPS-01': [['gates', 'WPS-01']], 'WPS-02': [['gates', 'WPS-02']], 'WPS-03': [OWN('WPS-03')], 'WPS-04': [OWN('WPS-04')], 'WPS-05': [['gates', 'WPS-05']], 'WPS-06': [OWN('WPS-06')], 'WPS-07': [OWN('WPS-07')], 'WPS-08': [['gates', 'WPS-08']], 'WPS-09': [OWN('WPS-09')],
  'ICE-01': [OWN('ICE-01')], 'ICE-02': [['unit', 'case 3|prior provider']], 'ICE-03': [OWN('ICE-03'), ['enhance', 'counts are computed from rows']], 'ICE-04': [OWN('ICE-04')], 'ICE-05': [OWN('ICE-05')], 'ICE-06': [OWN('ICE-06')], 'ICE-07': [['unit', 'criterion 3|Initial SRA']], 'ICE-08': [OWN('ICE-08')],
  'UAR-01': [OWN('UAR-01')], 'UAR-02': [OWN('UAR-02')], 'UAR-03': [OWN('UAR-03')], 'UAR-04': [OWN('UAR-04')], 'UAR-05': [OWN('UAR-05')], 'UAR-06': [['unit', 'criterion 3|Initial SRA']], 'UAR-07': [OWN('UAR-07')],
  'EFN-01': [['gates', 'EFN-01..03']], 'EFN-02': [['gates', 'EFN-01..03']], 'EFN-03': [['gates', 'EFN-01..03']], 'EFN-04': [['gates', 'EFN-04']], 'EFN-05': [['gates', 'EFN-05']], 'EFN-06': [['gates', 'EFN-06/07']], 'EFN-07': [['gates', 'EFN-06/07']], 'EFN-08': [['enhance', 'Mode B (historical)'], ['s4', 'S4[scenario] · 2 Scan']], 'EFN-09': [OWN('EFN-09')], 'EFN-10': [['gates', 'SIGNED is final']],
  'MCS-01': [['gates', 'MCS-01']], 'MCS-02': [['gates', 'MCS-02']], 'MCS-03': [['gates', 'MCS-03']], 'MCS-04': [['gates', 'MCS-08']], 'MCS-05': [['gates', 'MCS-01']], 'MCS-06': [['gates', 'MCS-01']], 'MCS-07': [['gates', 'MCS-07']], 'MCS-08': [OWN('MCS-08')], 'MCS-09': [['gates', 'MCS-09']], 'MCS-10': [OWN('MCS-10')],
  'URA-01': [OWN('URA-01')], 'URA-02': [['roles', 'anonymous']], 'URA-03': [OWN('URA-03')], 'URA-04': [OWN('URA-04')], 'URA-05': [OWN('URA-05')], 'URA-06': [OWN('URA-06'), ['roles', 'user.update']], 'URA-07': [['roles', 'cross-origin']], 'URA-08': [['roles', 'anonymous']], 'URA-09': [['gates', 'URA note review']], 'URA-10': [OWN('URA-10'), ['gates', 'presenter actions']], 'URA-11': [OWN('URA-11')], 'URA-12': [['gates', 'WPS-05']], 'URA-13': [['roles', 'routes:']],
  'PDU-01': [['gates', 'PDU-01'], ['clock', 'PDU-01/06']], 'PDU-02': [['clock', 'PDU-02']], 'PDU-03': [OWN('PDU-03')], 'PDU-04': [OWN('PDU-04')], 'PDU-05': [OWN('PDU-05')], 'PDU-06': [['clock', 'PDU-01/06']], 'PDU-07': [OWN('PDU-07')],
  'IIU-01': [OWN('IIU-01')], 'IIU-02': [OWN('IIU-01')], 'IIU-03': [['gates', 'IIU-03/04/05/06']], 'IIU-04': [['gates', 'IIU-03/04/05/06']], 'IIU-05': [['gates', 'IIU-03/04/05/06']], 'IIU-06': [['gates', 'IIU-03/04/05/06']], 'IIU-07': [OWN('IIU-07')], 'IIU-08': [OWN('IIU-08')], 'IIU-09': [['gates', 'IIU-09']], 'IIU-10': [OWN('IIU-10')], 'IIU-11': [OWN('IIU-11')],
  'EXA-01': [['s4', 'S4[scenario] · 5 missing evidence']], 'EXA-02': [OWN('EXA-02')], 'EXA-03': [OWN('EXA-03')], 'EXA-04': [['clock', 'EXA-04']], 'EXA-05': [OWN('EXA-05')], 'EXA-06': [OWN('EXA-06')],
  'DSL-01': [OWN('WPS-09 / DSL-01')], 'DSL-02': [['roles', 'service line']], 'DSL-03': [['s4', 'S4[scenario] · 6 household'], ['enhance', 'counts are computed']], 'DSL-04': [['gates', 'DSL-04']], 'DSL-05': [OWN('DSL-05')], 'DSL-06': [OWN('DSL-06')], 'DSL-07': [OWN('DSL-07')], 'DSL-08': [['analytics', 'administrator and supervisor get aggregates only']], 'DSL-09': [['roles', 'anonymous: /api/state']],
  'SVR-01': [['gates', 'SVR-01']], 'SVR-02': [OWN('SVR-02')], 'SVR-03': [OWN('SVR-03')], 'SVR-04': [OWN('SVR-04')], 'SVR-05': [OWN('SVR-05')], 'SVR-06': [['analytics', 'baseline is labelled'], ['s6', '4b earlier views']], 'SVR-07': [OWN('SVR-07')], 'SVR-08': [['bridge-contract', 'the bridge source']], 'SVR-09': [OWN('SVR-09'), ['roles', 'presenter controls']], 'SVR-10': [],
};
const KEYS = Object.keys(M);
const rows = []; let n = { PASS: 0, FAIL: 0, 'NOT-RUNNABLE': 0, 'NOT-RUN': 0 };
for (const id of KEYS) {
  const proofs = M[id].map(([suite, key]) => { const l = key.includes('|') ? key.split('|').map(k => line(suite, k)).find(Boolean) : line(suite, key); return { suite, key, l, s: st(l) }; });
  let status, evidence;
  if (!proofs.length) { status = 'NOT-RUNNABLE'; evidence = id === 'SVR-10' ? 'v3 only (PSY.submit5): the unified build has no such entry point; the equivalent MCS-05 (Send refused while unsigned) is proved by gates' : 'absent'; }
  else { const sts = proofs.map(p => p.s); status = sts.includes('FAIL') ? 'FAIL' : sts.every(x => x === 'PASS') ? 'PASS' : sts.includes('NOT-RUNNABLE') ? 'NOT-RUNNABLE' : 'NOT-RUN'; evidence = proofs.map(p => `${p.suite} › ${p.l ? p.l.replace(/^(PASS|FAIL|SKIP) /, '').slice(0, 110) : p.key + ' (not found in the run)'} [${p.s}]`).join('; '); }
  n[status]++; rows.push({ id, status, evidence, detail: proofs.filter(p => p.s === 'FAIL').map(p => (p.l || '').split(' — ').slice(1).join(' — ').slice(0, 260)).join(' | ') });
}
const RB = ['WPS-01', 'WPS-02', 'WPS-08', 'ICE-03', 'ICE-08', 'UAR-01', 'UAR-02', 'UAR-03', 'UAR-05', 'EFN-01', 'EFN-02', 'EFN-09', 'MCS-01', 'MCS-02', 'MCS-03', 'MCS-04', 'MCS-09', 'URA-02', 'URA-05', 'URA-06', 'URA-07', 'URA-08', 'URA-10', 'DSL-03', 'DSL-04', 'DSL-09', 'SVR-01', 'SVR-02', 'SVR-06'];
const out = ['# Safety results · review/05b-safety-test-plan.md', '', `Generated from the run logs in \`${path.relative(ROOT, dir) || dir}\` by \`test/lib/safety-report.mjs\`. ${KEYS.length} case ids. PASS ${n.PASS} · FAIL ${n.FAIL} · NOT-RUNNABLE ${n['NOT-RUNNABLE']}${n['NOT-RUN'] ? ' · NOT-RUN ' + n['NOT-RUN'] : ''}.`, '',
  'The "proof" column names the suite and the test title that proves the id; `safety` is test/safety.mjs (QA2), `gates` and `roles` are the existing suites. A FAIL is a product defect against the 05b "Expected" column (see qa2-findings.md for owner and reproduction). The release-blocking set of review/06 §d3 is marked **RB**.', '',
  '| Id | RB | Result | Proof (suite › test) | Why it fails |', '|---|---|---|---|---|', ...rows.map(r => `| ${r.id} | ${RB.includes(r.id) ? '**RB**' : ''} | ${r.status} | ${r.evidence.replace(/\|/g, '/')} | ${(r.detail || '').replace(/\|/g, '/')} |`), '',
  `Release-blocking failures: ${rows.filter(r => RB.includes(r.id) && r.status === 'FAIL').map(r => r.id).join(', ') || 'none'}.`, ''];
fs.mkdirSync(path.join(ROOT, 'review/qa'), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'review/qa/safety-results.md'), out.join('\n'));
console.log(`safety-results.md: ${KEYS.length} ids, PASS ${n.PASS}, FAIL ${n.FAIL}, NOT-RUNNABLE ${n['NOT-RUNNABLE']}, NOT-RUN ${n['NOT-RUN']}`);
