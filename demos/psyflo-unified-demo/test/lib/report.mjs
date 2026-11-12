// results.json / results.md / <suite>.md writers (review/06b section 6).
import fs from 'node:fs';
import path from 'node:path';

const icon = s => ({ PASS: 'PASS', FAIL: 'FAIL', SKIP: 'SKIP', 'KNOWN-FAIL': 'KNOWN-FAIL', 'NOT-RUNNABLE': 'NOT-RUNNABLE', FLAKY: 'FLAKY' }[s] || s);
export function parseOutput(text) {
  const tests = []; let result = null;
  for (const line of text.split('\n')) {
    let m;
    if ((m = line.match(/^(PASS|FAIL|SKIP) (.*?)(?: — (.*))?$/))) tests.push({ status: m[1], title: m[2], note: m[3] || '' });
    else if ((m = line.match(/^RESULT (\S+) pass=(\d+) fail=(\d+) skip=(\d+)/))) result = { name: m[1], pass: +m[2], fail: +m[3], skip: +m[4] };
  }
  return { tests, result };
}
export function suiteMarkdown(r) {
  const L = [`# ${r.name} · ${icon(r.status)}`, '', `Run ${r.runId} · ${r.durationMs} ms · instance ${r.instance} · exit ${r.exit}${r.attempt > 1 ? ' · repeat ' + r.attempt : ''}`, ''];
  if (r.tests.length) { L.push('| Result | Test | Note |', '|---|---|---|'); for (const t of r.tests) L.push(`| ${icon(t.status)} | ${t.title.replace(/\|/g, '/')} | ${(t.note || '').replace(/\|/g, '/')} |`); L.push(''); }
  if (r.status !== 'PASS') { L.push('## Output (tail)', '', '```', r.tail.trim(), '```', ''); }
  return L.join('\n');
}
export function summaryMarkdown(run) {
  const c = run.summary;
  const L = [`# Test results · ${run.runId}`, '', `${c.pass} suites pass · ${c.fail} fail · ${c.knownFail} known-fail · ${c.skip} skipped · ${c.notRunnable} not runnable · tests: ${c.tests.pass} pass, ${c.tests.fail} fail, ${c.tests.skip} skip · ${Math.round(c.durationMs / 1000)} s`, '',
    `Commit ${run.commit || '?'} · node ${run.env.node} · demo time ${run.env.time} · workers ${run.env.workers} · base port ${run.env.basePort}`, '', '| Suite | Status | Pass | Fail | Skip | Seconds |', '|---|---|---|---|---|---|'];
  for (const s of run.suites) L.push(`| [${s.name}](${s.name}.md) | ${icon(s.status)} | ${s.counts.pass} | ${s.counts.fail} | ${s.counts.skip} | ${(s.durationMs / 1000).toFixed(1)} |`);
  const fails = run.suites.flatMap(s => s.tests.filter(t => t.status === 'FAIL').map(t => ({ s: s.name, t })));
  if (fails.length) { L.push('', '## Failures', ''); for (const f of fails) L.push(`- **${f.s}** · ${f.t.title}${f.t.note ? ' — ' + f.t.note : ''}`); }
  const skips = run.suites.flatMap(s => s.tests.filter(t => t.status === 'SKIP').map(t => ({ s: s.name, t })));
  if (skips.length) { L.push('', '## Skipped (reason required)', ''); for (const f of skips) L.push(`- ${f.s} · ${f.t.title} — ${f.t.note || 'no reason given'}`); }
  L.push('', '## Manual checklist (not automatable)', '', '| Item | Owner | State |', '|---|---|---|');
  for (const m of run.manual) L.push(`| ${m.id} | ${m.owner} | ${m.status} |`);
  L.push('', run.release ? (run.releaseReady ? 'RELEASE READY' : 'NOT RELEASE READY') : '');
  return L.join('\n');
}
export function writeAll(out, run) {
  fs.mkdirSync(out, { recursive: true });
  for (const s of run.suites) fs.writeFileSync(path.join(out, s.name + '.md'), suiteMarkdown(s));
  fs.writeFileSync(path.join(out, 'summary.md'), summaryMarkdown(run));
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ ...run, suites: run.suites.map(({ tail, ...x }) => x) }, null, 1));
}
