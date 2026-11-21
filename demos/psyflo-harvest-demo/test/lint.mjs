// Palette and wording lint (design prompt §4.1, §3.2, §5.5). Static: scans the screens, shell, panel and screen controllers.
//   node test/lint.mjs            exit 1 when anything is off palette or uses a retired name
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
// §4.1 tokens, status chips, Lauris boxes, plus the navy tints the sidebar and panel header already use
const ALLOWED = new Set(['151B24', '217A78', '15605E', '5FC0BE', 'DDF1EF', 'F0B44C', 'E0A030', 'F8F6F2', 'FFFFFF', 'FFF', 'E6E1D9', 'D9D4CC', '3E4652', '525B66', '8E99A6', '2F3A4A',
  'FCEFD0', '6F4A05', 'FBE9E4', '8A2E1C', 'EEEBE5', 'E6F4EA', 'BFE3CB', 'FFF8E6', 'E8C56A', '222A35', '2A3340', 'C9D1D6', '000', '000000',
  // neutrals the canvas already used for hover and page chrome
  'F3F0EA', 'FBFAF7', 'DEDAD3', 'E9E6E0', 'EFEBE4', 'C9CDD3']);
const RETIRED = [/\bDo next\b/, /\bNew students\b/, /\bNeeds me\b/, /\bPast due\b/, /\bThe four doors\b/i, /\bPayer playbook\b/, /\bStaff dashboard\b/i, /\bReview queue\b/];
const targets = [];
const walk = (d, test) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, test); else if (test(p)) targets.push(p); } };
// Ext*.dc.html are the canvas reference for the Lauris pages; the app never renders them (the mock Lauris and the panel do), so they are not linted.
walk(path.join(ROOT, 'web/screens'), p => p.endsWith('.dc.html') && !/\/Ext[A-Za-z]+\.dc\.html$/.test(p));
walk(path.join(ROOT, 'web/css'), p => p.endsWith('.css'));
walk(path.join(ROOT, 'web/panel'), p => /\.(css|js|html)$/.test(p) && !p.endsWith('bridge.js'));
walk(path.join(ROOT, 'web/js/screens'), p => p.endsWith('.js'));
targets.push(path.join(ROOT, 'web/index.html'), path.join(ROOT, 'web/js/app.js'));
let bad = 0; const rep = {};
for (const f of targets) {
  const src = fs.readFileSync(f, 'utf8'); const rel = path.relative(ROOT, f);
  for (const m of src.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const h = m[1].toUpperCase(); const before = src.slice(Math.max(0, m.index - 1), m.index);
    if (/[&\w]/.test(before)) continue; // html entities, ids like abc#123
    if (!ALLOWED.has(h)) { (rep[rel] ||= {})['#' + h] = (rep[rel]['#' + h] || 0) + 1; bad++; }
  }
  if (!/web\/(screens\/(WhereThingsLive|PayerPlaybook)|panel\/panel\.js)/.test(rel)) for (const re of RETIRED) { const mm = src.match(re); if (mm && !/^\s*\/\//.test(mm[0])) { (rep[rel] ||= {})['name:' + mm[0]] = 1; bad++; } }
}
for (const [f, o] of Object.entries(rep)) console.log(f.padEnd(44), Object.entries(o).map(([k, v]) => `${k}×${v}`).join(' '));
console.log(`\n${targets.length} files scanned · ${bad} findings`);
process.exit(bad ? 1 : 0);
