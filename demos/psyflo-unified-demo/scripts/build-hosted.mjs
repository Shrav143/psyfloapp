// Builds hosted/index.html: the whole unified Psyflo × Harvest demo in ONE self-contained HTML file that runs with no server.
//   node scripts/build-hosted.mjs            (add --min to minify)
// The server code (store, actions, authz, sessions, role projection, gates, rules, pdf, mock Lauris, mock portals) is bundled unchanged and runs
// in the page behind a virtual network (scripts/hosted/vnet.js). esbuild is not a dependency of this repo: install it anywhere and point
// HOSTED_TOOLS at that folder   (npm i esbuild --prefix "$HOSTED_TOOLS").  The output is deterministic: same sources, same bytes.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'scripts', 'hosted');
const TOOLS = process.env.HOSTED_TOOLS || '/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/hosted-tools';
const MIN = process.argv.includes('--min');
let esbuild;
try { esbuild = createRequire(path.join(TOOLS, 'package.json'))('esbuild'); }
catch { console.error(`esbuild not found. Run: npm i esbuild --prefix ${TOOLS}   (or set HOSTED_TOOLS to a folder that has it)`); process.exit(1); }

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const ls = (d, test = () => true) => fs.readdirSync(path.join(ROOT, d)).filter(test).sort();
const must = (s, from, to, what = from) => { if (!s.includes(from)) throw new Error('build: expected to find ' + String(what).slice(0, 120)); return s.replace(from, () => to); };

// ---------- what the virtual file system and the virtual network hold ----------
const vfs = { '/app/seed/seed.json': read('seed/seed.json') };
for (const f of ls('seed/extra', f => f.endsWith('.json'))) vfs['/app/seed/extra/' + f] = read('seed/extra', f);
for (const f of ls('seed/scripts')) vfs['/app/seed/scripts/' + f] = read('seed/scripts', f);
let notes = read('seed/notes.md');
for (const f of ls('seed/notes', f => f.endsWith('.md'))) notes += '\n' + read('seed/notes', f);   // same rule as server/index.js: a later section for the same screen wins
notes = notes.split('\n\n').map(p => p.replace(/\s+$/, '')).join('\n\n') + '\n';
// no screen uses the canvas's own demo Component (a <script type="text/x-dc"> run through new Function): every route has a controller. Leaving the scripts
// out keeps the page working under a CSP that forbids eval.
const screens = Object.fromEntries(ls('web/screens', f => f.endsWith('.dc.html')).map(f => [f, read('web/screens', f).replace(/<script type="text\/x-dc"[^>]*>[\s\S]*?<\/script>/g, '')]));
const actionFiles = ls('server/psyflo/actions', f => f.endsWith('.js'));                                // loaded in filename order, like server/index.js

const prelude = fs.readFileSync(path.join(SRC, 'prelude.js'), 'utf8');
const tokensCss = read('web/css/tokens.css'), componentsCss = read('web/css/components.css'), panelCss = read('web/panel/panel.css'), hostedCss = fs.readFileSync(path.join(SRC, 'hosted.css'), 'utf8');

// ---------- hosted-only source patches ----------
// The screens and the UI kit belong to other owners and stay untouched. These few places do something a hosted page cannot (save a file, open a
// path of the server, run eval); the build rewrites them in the BUNDLE only. Each patch must match exactly once, or the build stops.
const PATCHES = {
  'web/js/runtime.js': [
    ["try { Component = new Function('DCLogic', script + '\\n;return Component;')(DCLogic); } catch (e) { console.warn('Component failed for', file, e); }", '/* hosted: the canvas demo components (x-dc scripts) are not run */']
  ],
  'web/js/screens/Analytics.js': [
    [`function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}`, 'function download(name, content, type) { window.__vsave(name, content, type); }'],
    ["{ label: 'Download', tone: 'primary'", "{ label: 'Open file', tone: 'primary'"],
    ['toast(`${fmt.toUpperCase()} saved: ${name}`);', 'toast(`${fmt.toUpperCase()} ready: ${name}`);'],
    ['data-s="pdf">Save PDF</button>', 'data-s="pdf">Open PDF</button>'],
    ['data-s="csv">Save CSV</button>', 'data-s="csv">Open CSV</button>'],
    ["toast('PDF saved');", "toast('PDF ready');"],
    ["toast('CSV saved');", "toast('CSV ready');"]
  ],
  'web/js/screens/Settings.js': [
    ['data-x="csv">Download CSV</button>', 'data-x="csv">Open CSV</button>'],
    [`    const blob = new Blob([lines.join('\\n') + '\\n'], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = \`audit-log-\${clockToday(this.s)}.csv\`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    this.toast(\`\${rows.length} events downloaded\`);`, "    window.__vsave(`audit-log-${clockToday(this.s)}.csv`, lines.join('\\n') + '\\n', 'text/csv');\n    this.toast(`${rows.length} events shown`);"]
  ],
  // links the family and the clinician follow: the page has no server paths (/f/<token>, /parent/<token>/<Screen>), so they are the hash routes of the app
  'web/js/screens/Referral.js': [
    ['link: `${location.origin}/f/${', 'link: `${window.__vapp}/f/${']
  ],
  'web/js/screens/ParentPortal.js': [
    ["return params && params.t ? `/parent/${params.t}/${id}${qs}` : `${id}.dc.html${qs}`;", "return params && params.t ? '#/' + id + '?' + new URLSearchParams([...q, ['t', params.t]]) : `${id}.dc.html${qs}`;"],
    ['if (params && params.t) location.href = h; else go(h); }', 'go(h); }']
  ]
};
const patched = new Set();

// ---------- esbuild plugin: node:* shims, virtual modules, import.meta.url, the patches above ----------
const plugin = assets => ({
  name: 'hosted',
  setup(b) {
    b.onResolve({ filter: /^node:(fs|path|url|crypto|buffer)$/ }, a => ({ path: path.join(SRC, 'shim-' + a.path.slice(5) + '.js') }));
    b.onResolve({ filter: /^node:/ }, a => ({ errors: [{ text: `${a.path} has no browser shim (imported from ${a.importer})` }] }));
    b.onResolve({ filter: /^hosted:(vfs|assets|actions)$/ }, a => ({ path: a.path, namespace: 'hosted' }));
    b.onLoad({ filter: /.*/, namespace: 'hosted' }, a => {
      if (a.path === 'hosted:vfs') return { contents: 'export default ' + JSON.stringify(vfs), loader: 'js', resolveDir: ROOT };
      if (a.path === 'hosted:assets') return { contents: 'export default ' + JSON.stringify(assets()), loader: 'js', resolveDir: ROOT };
      const imps = actionFiles.map((f, i) => `import * as m${i} from ${JSON.stringify(path.join(ROOT, 'server/psyflo/actions', f))};`).join('\n');
      return { contents: `${imps}\nexport default [${actionFiles.map((f, i) => 'm' + i).join(',')}];`, loader: 'js', resolveDir: ROOT };
    });
    b.onLoad({ filter: /[\\/](server|web)[\\/].*\.js$/ }, a => {
      const rel = path.relative(ROOT, a.path).split(path.sep).join('/');
      let src = fs.readFileSync(a.path, 'utf8');
      // server modules ask for their own file location; give each one a stable virtual path under /app
      if (rel.startsWith('server/')) src = src.replaceAll('import.meta.url', JSON.stringify('file:///app/' + rel));
      for (const [from, to] of PATCHES[rel] || []) { src = must(src, from, to, `${rel}: ${from}`); patched.add(rel); }
      return { contents: src, loader: 'js', resolveDir: path.dirname(a.path) };
    });
  }
});
const common = assets => ({
  bundle: true, write: false, platform: 'browser', format: 'iife', target: 'es2022', logLevel: 'warning', logOverride: { 'duplicate-object-key': 'silent' }, legalComments: 'none', charset: 'utf8', minify: MIN,
  inject: [path.join(SRC, 'inject.js')],
  plugins: [plugin(assets)], absWorkingDir: ROOT
});
// text that goes inside an inline <script>: no "</script", no "<!--"
const safe = js => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// ---------- 1. the panel (one srcdoc page inside the mock Lauris) ----------
const panelJs = (await esbuild.build({ ...common(() => ({})), stdin: { contents: `import './web/panel/panel.js';`, resolveDir: ROOT, sourcefile: 'panel-entry.js' } })).outputFiles[0].text;
let panelDoc = read('web/panel/index.html');
panelDoc = must(panelDoc, '<link rel="stylesheet" href="../css/tokens.css">', `<style>${tokensCss}</style>`);
panelDoc = must(panelDoc, '<link rel="stylesheet" href="../css/components.css">', `<style>${componentsCss}</style>`);
panelDoc = must(panelDoc, '<link rel="stylesheet" href="panel.css">', `<style>${panelCss}</style>`);
panelDoc = panelDoc.replace(/<script type="module"[^>]*><\/script>\s*/g, '');
panelDoc = must(panelDoc, '</body>', `<script>/*__VCFG__*/</script><script>${safe(prelude)}</script><script>${safe(panelJs)}</script></body>`);

// ---------- 2. the app: shell + virtual network + server code ----------
const assets = () => ({ screens, notes, logo: read('web/js/logo.svg'), bridge: read('web/panel/bridge.js'), panelDoc, prelude });
const appJs = (await esbuild.build({ ...common(assets), stdin: { contents: `import './scripts/hosted/vnet.js'; import './web/js/app.js';`, resolveDir: ROOT, sourcefile: 'hosted-entry.js' } })).outputFiles[0].text;
for (const rel of Object.keys(PATCHES)) if (!patched.has(rel)) throw new Error('build: a hosted patch was never applied to ' + rel);
let html = read('web/index.html');
html = must(html, '<title>Psyflo × Harvest</title>', '<title>Psyflo Harvest Demo</title>');
html = must(html, '<link rel="manifest" href="/manifest.webmanifest">\n', '<meta name="color-scheme" content="light">\n');
html = must(html, '<link rel="stylesheet" href="/css/tokens.css">', `<style>:root{color-scheme:light}</style>\n<style>${tokensCss}</style>`);
html = must(html, '<link rel="stylesheet" href="/css/components.css">', `<style>${componentsCss}</style>\n<style>${hostedCss}</style>`);
html = html.replace(/<script type="module"[^>]*><\/script>\s*/g, '');
html = must(html, '</body>', `<script>window.__VROOT=true;${safe(prelude)}</script>\n<script>${safe(appJs)}</script>\n</body>`);

// ---------- 3. contract checks: the published page ----------
const bad = [];
for (const m of html.replace(/<script>[\s\S]*?<\/script>/g, '').matchAll(/<script[^>]*src=/g)) bad.push('external script: ' + m[0]);
for (const m of html.matchAll(/https?:\/\/[^\s"'`<>)\\]+/g)) if (!/^https:\/\/(fonts\.(googleapis|gstatic)\.com|(psyflo|lauris|ext)\.invalid|www\.w3\.org|schemas\.|json-schema\.org|example\.)/.test(m[0]) && /^https?:\/\/[^/]*\.(js|css)$/.test(m[0])) bad.push('external file: ' + m[0]);
if (/<a\b[^>]*\bdownload\b/i.test(html)) bad.push('an <a download> in the page');
if (/\.download\s*=[^=]|\.setAttribute\(\s*['"]download['"]/.test(html)) bad.push('a script-driven download (.download =)');
if (/\bnew Function\s*\(|[^.\w]eval\s*\(|\bFunction\s*\(\s*['"]/.test(html)) bad.push('eval / new Function in the bundle');
if (/<link[^>]*rel="manifest"/.test(html)) bad.push('manifest link');
if (bad.length) { console.error('build: the page breaks the artifact contract:\n  ' + [...new Set(bad)].join('\n  ')); process.exit(1); }

fs.mkdirSync(path.join(ROOT, 'hosted'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'hosted', 'index.html'), html);
console.log(`hosted/index.html  ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB  (${Buffer.byteLength(html).toLocaleString()} bytes; app ${(appJs.length / 1024).toFixed(0)} KB, panel ${(panelJs.length / 1024).toFixed(0)} KB, ${Object.keys(screens).length} screens, ${actionFiles.length} action files, ${patched.size} patched files)`);
