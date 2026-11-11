#!/usr/bin/env node
// One command: start the three servers on given ports with a fresh DATA_DIR per suite, run every suite in isolation, write
// review/test-results/<suite>.md and summary.md, stop the servers by PID.   (review/06b-qa-harness-spec.md)
//
//   node test/run-all.mjs                          every suite, one worker, ports 4900-4902
//   node test/run-all.mjs --ports 4800             app 4800, Lauris 4801, portals 4802
//   node test/run-all.mjs --only roles,gates       a subset (names = file names without .mjs; "unit" = npm test)
//   node test/run-all.mjs --workers 3 --repeat 2   parallel instances at base, base+10, base+20; repeat to expose flakiness
//   --skip a,b  --shuffle <seed>  --time 15:30  --preset live|canvas  --out <dir>  --data-root <dir>  --release  --list
// Every suite gets env BASE, LAURIS, EXT, PW, SHOTS, DATA_DIR, DEMO_TIME (fixed story time), DEMO_TEST=1 and starts from a fresh server.
// Suites are standalone (`node test/<name>.mjs` with BASE=...): they never depend on another suite's state (flowC builds T.W. itself).
// Exit code: 0 all pass, 1 any FAIL (or, with --release, a skipped/known-fail test), 2 harness error.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { parseArgs, ROOT, findPlaywright } from './lib/env.mjs';
import { startInstance, stopInstance, stopAll } from './lib/server.mjs';
import { parseOutput, writeAll } from './lib/report.mjs';

const opt = parseArgs(process.argv.slice(2));
if (opt.help) { console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').slice(1, 14).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }

// ---- discover suites: test/*.mjs (not the runner, preflight or lib) plus npm test ----
const TEST = path.join(ROOT, 'test');
const META = {
  unit: { cmd: ['--test', 'test/draft.test.mjs'], tags: ['unit'], timeout: 120 },
  smoke: { tags: ['screens'], timeout: 900 }, panels: { tags: ['panel'], timeout: 300 }, 'ui-kit': { tags: ['ui'], timeout: 600 }, routes: { tags: ['ui'], timeout: 600 },
  flowA: { tags: ['flow', 'realtime'], timeout: 300 }, flowB: { tags: ['flow'], timeout: 300 }, flowC: { tags: ['flow', 'realtime'], timeout: 300 }, flowD: { tags: ['flow'], timeout: 300 },
  roles: { tags: ['safety'] }, gates: { tags: ['safety', 'realtime'] }, clock: { tags: ['safety'] }, rules: { tags: ['safety'] }, decisions: { tags: ['safety'] }, 'bridge-contract': { tags: ['contract'] }, fixtures: { tags: ['fixtures', 'realtime'], timeout: 400 }
};
const files = fs.readdirSync(TEST).filter(f => f.endsWith('.mjs') && !['run-all.mjs', 'preflight.mjs'].includes(f) && f !== 'draft.test.mjs');
let suites = [{ name: 'unit', ...META.unit }, ...files.map(f => ({ name: f.replace(/\.mjs$/, ''), file: 'test/' + f, ...(META[f.replace(/\.mjs$/, '')] || {}) }))];
if (opt.only.length) suites = suites.filter(s => opt.only.includes(s.name));
if (opt.skip.length) suites = suites.filter(s => !opt.skip.includes(s.name));
if (opt.tag) suites = suites.filter(s => (s.tags || []).includes(opt.tag));
if (opt.shuffle) { let h = 0; for (const c of opt.shuffle) h = (h * 31 + c.charCodeAt(0)) >>> 0; const r = () => (h = (h * 1664525 + 1013904223) >>> 0) / 4294967296; for (let i = suites.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [suites[i], suites[j]] = [suites[j], suites[i]]; } }
if (opt.list) { for (const s of suites) console.log(s.name + (s.tags ? '  [' + s.tags.join(',') + ']' : '')); process.exit(0); }
if (!suites.length) { console.error('No suite matches.'); process.exit(2); }

const known = (() => { try { return JSON.parse(fs.readFileSync(path.join(TEST, 'known-fails.json'), 'utf8')); } catch { return []; } })();
const PW = findPlaywright();
const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + 'Z';
let commit = ''; try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { }
const shots = path.join(opt.out, 'shots'); fs.mkdirSync(shots, { recursive: true });
const results = [];
let aborted = false;
process.on('SIGINT', async () => { aborted = true; console.log('\nstopping servers…'); await stopAll(); process.exit(130); });

function runChild(args, env, timeoutS) {
  return new Promise(resolve => {
    const t0 = Date.now(); let out = '';
    const child = spawn(process.execPath, args, { cwd: ROOT, env: { ...process.env, ...env } });
    const timer = setTimeout(() => { out += `\nTIMEOUT after ${timeoutS} s\n`; try { child.kill('SIGKILL'); } catch { } }, timeoutS * 1000);
    child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { out += d; });
    child.on('close', code => { clearTimeout(timer); resolve({ code, out, ms: Date.now() - t0 }); });
  });
}

async function runSuite(s, instIndex, attempt) {
  const dataDir = path.join(opt.dataRoot, `w${instIndex}-${s.name}`);
  let inst; const t0 = Date.now();
  try {
    if (opt.attach) inst = { urls: { APP: opt.attach, LAURIS: opt.attach.replace(/:(\d+)$/, (m, p) => ':' + (+p + 1)), EXT: opt.attach.replace(/:(\d+)$/, (m, p) => ':' + (+p + 2)) } };
    else inst = await startInstance({ index: instIndex, base: opt.basePort, dataDir, time: opt.time });
    if (opt.preset !== 'live' && !opt.attach) {
      const j = await (await fetch(inst.urls.APP + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId: 'dowens', presenter: true }) })).json();
      await fetch(inst.urls.APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Psyflo-Session': j.token }, body: JSON.stringify({ action: 'demo.reset', args: { preset: opt.preset } }) });
    }
    const env = { BASE: inst.urls.APP, LAURIS: inst.urls.LAURIS, EXT: inst.urls.EXT, PW, SHOTS: shots, DEMO_TEST: '1', DEMO_TIME: opt.time, DATA_DIR: dataDir, SUITE: s.name };
    const args = s.cmd || [s.file];
    const r = await runChild(args, env, s.timeout || 300);
    const { tests, result } = parseOutput(r.out);
    let counts = result ? { pass: result.pass, fail: result.fail, skip: result.skip } : { pass: tests.filter(t => t.status === 'PASS').length, fail: tests.filter(t => t.status === 'FAIL').length, skip: tests.filter(t => t.status === 'SKIP').length };
    if (s.name === 'unit') { const m = r.out.match(/# pass (\d+)[\s\S]*?# fail (\d+)/); if (m) counts = { pass: +m[1], fail: +m[2], skip: 0 }; for (const mm of r.out.matchAll(/^(ok|not ok) \d+ - (.*)$/gm)) tests.push({ status: mm[1] === 'ok' ? 'PASS' : 'FAIL', title: mm[2], note: '' }); }
    // known failures: listed with an owner and an expiry; never allowed in a release run
    for (const t of tests.filter(t => t.status === 'FAIL')) { const k = known.find(k => k.suite === s.name && new RegExp(k.match || '^$').test(t.title) && (!k.expires || k.expires >= new Date().toISOString().slice(0, 10))); if (k) { t.status = 'KNOWN-FAIL'; t.note = (t.note ? t.note + ' · ' : '') + `${k.owner}: ${k.reason}`; counts.fail--; } }
    const noErr = !/PAGEERROR|\bTIMEOUT\b/.test(r.out) || result;
    let status = r.code === 0 && counts.fail === 0 && noErr ? 'PASS' : 'FAIL';
    if (status === 'PASS' && counts.pass === 0 && counts.skip > 0) status = 'SKIP';
    if (status === 'FAIL' && r.code === 0 && !result && s.name !== 'unit') status = /ERR\b|FAIL/.test(r.out) ? 'FAIL' : 'PASS';   // legacy scripts print instead of asserting
    fs.writeFileSync(path.join(opt.out, s.name + '.log'), r.out);
    return { name: s.name, tags: s.tags || [], instance: instIndex, attempt, status, exit: r.code, durationMs: Date.now() - t0, counts, tests, runId, tail: r.out.split('\n').slice(-40).join('\n') };
  } catch (e) {
    return { name: s.name, tags: s.tags || [], instance: instIndex, attempt, status: 'FAIL', exit: 2, durationMs: Date.now() - t0, counts: { pass: 0, fail: 1, skip: 0 }, tests: [{ status: 'FAIL', title: 'harness', note: String(e.message) }], runId, tail: String(e.stack || e) };
  } finally { if (inst && inst.pid && !opt.keep) await stopInstance(inst); }
}

async function main() {
  fs.mkdirSync(opt.out, { recursive: true });
  const t0 = Date.now();
  for (let attempt = 1; attempt <= opt.repeat; attempt++) {
    const queue = suites.slice(); const done = [];
    await Promise.all(Array.from({ length: Math.max(1, Math.min(opt.workers, queue.length)) }, async (_, w) => {
      while (queue.length && !aborted) {
        const s = queue.shift();
        const r = await runSuite(s, w, attempt); done.push(r);
        console.log(`[w${w}] ${s.name.padEnd(16)} ${r.status} (${r.counts.pass} pass, ${r.counts.fail} fail, ${r.counts.skip} skip, ${(r.durationMs / 1000).toFixed(1)} s)`);
      }
    }));
    results.push(...done);
  }
  // repeats: a test that differs across repeats is FLAKY
  const byName = new Map(); for (const r of results) { (byName.get(r.name) || byName.set(r.name, []).get(r.name)).push(r); }
  const merged = [...byName.values()].map(rs => { const last = rs.at(-1); if (rs.some(x => x.status !== rs[0].status)) last.status = 'FLAKY'; return last; });
  const sum = { pass: 0, fail: 0, skip: 0, notRunnable: 0, knownFail: 0, flaky: 0, durationMs: Date.now() - t0, tests: { pass: 0, fail: 0, skip: 0 } };
  for (const r of merged) { const k = { PASS: 'pass', FAIL: 'fail', SKIP: 'skip', 'NOT-RUNNABLE': 'notRunnable', FLAKY: 'flaky' }[r.status]; sum[k]++; sum.knownFail += r.tests.filter(t => t.status === 'KNOWN-FAIL').length ? 1 : 0; sum.tests.pass += r.counts.pass; sum.tests.fail += r.counts.fail; sum.tests.skip += r.counts.skip; }
  const manual = [{ id: 'MV3 side panel in real Chrome (load unpacked, run S1 and S3)', owner: 'QA', status: 'PENDING' }, { id: 'Live microphone and Web Speech on the demo laptop', owner: 'QA', status: 'PENDING' }, { id: 'Safari and Firefox behaviour', owner: 'QA', status: 'PENDING' }, { id: 'Venue network and fonts', owner: 'QA', status: 'PENDING' }, { id: 'Run-sheet comprehension check (three people)', owner: 'Lead', status: 'PENDING' }];
  const releaseReady = opt.release && sum.fail === 0 && sum.flaky === 0 && sum.skip === 0 && sum.knownFail === 0 && !manual.some(m => m.status === 'PENDING');
  const run = { runId, commit, release: opt.release, releaseReady, env: { node: process.version, time: opt.time, preset: opt.preset, workers: opt.workers, repeat: opt.repeat, basePort: opt.basePort }, summary: sum, suites: merged, manual };
  writeAll(opt.out, run);
  console.log(`\n${sum.pass} suites pass · ${sum.fail} fail · ${sum.flaky} flaky · ${sum.skip} skipped · tests ${sum.tests.pass} pass / ${sum.tests.fail} fail / ${sum.tests.skip} skip · results in ${path.relative(ROOT, opt.out)}/`);
  await stopAll();
  process.exit(sum.fail || sum.flaky || (opt.release && (sum.skip || sum.knownFail)) ? 1 : 0);
}
main().catch(async e => { console.error(e); await stopAll(); process.exit(2); });
