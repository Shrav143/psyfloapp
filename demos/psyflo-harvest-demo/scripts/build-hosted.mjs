// Builds hosted/index.html: the whole Psyflo × Harvest demo in ONE self-contained HTML file that runs with no server.
//   node scripts/build-hosted.mjs            (add --min to minify)
// The server code (store, actions, mock Lauris, mock portals) is bundled unchanged and runs in the page behind a virtual network
// (scripts/hosted/vnet.js). esbuild is not a dependency of this repo: install it anywhere and point HOSTED_TOOLS at that folder
//   npm i esbuild --prefix "$HOSTED_TOOLS"
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

// ---------- what the virtual file system and the virtual network hold ----------
const vfs = { '/app/seed/seed.json': read('seed/seed.json') };
for (const f of ls('seed/extra', f => f.endsWith('.json'))) vfs['/app/seed/extra/' + f] = read('seed/extra', f);
for (const f of ls('seed/scripts')) vfs['/app/seed/scripts/' + f] = read('seed/scripts', f);
let notes = read('seed/notes.md');
for (const f of ls('seed/notes', f => f.endsWith('.md'))) notes += '\n' + read('seed/notes', f);   // same rule as server/index.js: a later section for the same screen wins
// every screen has a controller, so the canvas's own demo Component (a <script type="text/x-dc"> run through new Function) is never used; leaving it out
// keeps the page working under a CSP that forbids eval
const screens = Object.fromEntries(ls('web/screens', f => f.endsWith('.dc.html')).map(f => [f, read('web/screens', f).replace(/<script type="text\/x-dc"[^>]*>[\s\S]*?<\/script>/g, '')]));
const actionFiles = ls('server/psyflo/actions', f => f.endsWith('.js'));                                // loaded in filename order, like server/index.js

const prelude = fs.readFileSync(path.join(SRC, 'prelude.js'), 'utf8');
const uiCss = read('web/css/ui.css'), panelCss = read('web/panel/panel.css');
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap">';

// ---------- esbuild plugin: node:* shims, virtual modules, import.meta.url ----------
const plugin = assets => ({
  name: 'hosted',
  setup(b) {
    b.onResolve({ filter: /^node:(fs|path|url)$/ }, a => ({ path: path.join(SRC, 'shim-' + a.path.slice(5) + '.js') }));
    b.onResolve({ filter: /^node:/ }, a => ({ errors: [{ text: `${a.path} has no browser shim (imported from ${a.importer})` }] }));
    b.onResolve({ filter: /^hosted:(vfs|assets|actions)$/ }, a => ({ path: a.path, namespace: 'hosted' }));
    b.onLoad({ filter: /.*/, namespace: 'hosted' }, a => {
      if (a.path === 'hosted:vfs') return { contents: 'export default ' + JSON.stringify(vfs), loader: 'js', resolveDir: ROOT };
      if (a.path === 'hosted:assets') return { contents: 'export default ' + JSON.stringify(assets()), loader: 'js', resolveDir: ROOT };
      const imps = actionFiles.map((f, i) => `import m${i} from ${JSON.stringify(path.join(ROOT, 'server/psyflo/actions', f))};`).join('\n');
      return { contents: `import { store } from ${JSON.stringify(path.join(ROOT, 'server/psyflo/store.js'))};\n${imps}\n[${actionFiles.map((f, i) => 'm' + i).join(',')}].forEach(m => store.register(m));`, loader: 'js', resolveDir: ROOT };
    });
    // server modules ask for their own file location; give each one a stable virtual path under /app
    b.onLoad({ filter: /[\\/]server[\\/].*\.js$/ }, a => {
      const rel = path.relative(ROOT, a.path).split(path.sep).join('/');
      return { contents: fs.readFileSync(a.path, 'utf8').replaceAll('import.meta.url', JSON.stringify('file:///app/' + rel)), loader: 'js', resolveDir: path.dirname(a.path) };
    });
  }
});
const common = assets => ({
  bundle: true, write: false, platform: 'browser', format: 'iife', target: 'es2022', logLevel: 'warning', legalComments: 'none', minify: MIN,
  inject: [path.join(SRC, 'inject-buffer.js')],
  define: { 'process.env.DATA_DIR': 'undefined', 'process.env.PSYFLO_APP_URL': '"https://psyflo.invalid"', 'process.env.APP_PORT': '"4000"' },
  plugins: [plugin(assets)], absWorkingDir: ROOT
});
// text that goes inside an inline <script>: no "</script", no "<!--"
const safe = js => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const must = (s, from, to) => { if (!s.includes(from)) throw new Error('build: expected to find ' + from); return s.replace(from, () => to); };

// ---------- 1. the panel (one srcdoc page inside the mock Lauris) ----------
const panelJs = (await esbuild.build({ ...common(() => ({})), stdin: { contents: `import './web/js/help.js'; import './web/panel/panel.js';`, resolveDir: ROOT, sourcefile: 'panel-entry.js' } })).outputFiles[0].text;
let panelDoc = read('web/panel/index.html');
panelDoc = must(panelDoc, '<link rel="stylesheet" href="/css/ui.css">', `<style>${uiCss}</style>`);
panelDoc = must(panelDoc, '<link rel="stylesheet" href="panel.css">', `<style>${panelCss}</style>`);
panelDoc = panelDoc.replace(/<script type="module"[^>]*><\/script>\s*/g, '');
panelDoc = must(panelDoc, '</body>', `<script>/*__VCFG__*/</script><script>${safe(prelude)}</script><script>${safe(panelJs)}</script></body>`);

// ---------- 2. the app: shell + virtual network + server code ----------
const assets = () => ({ screens, notes, logo: read('web/js/logo.svg'), bridge: read('web/panel/bridge.js'), panelDoc, prelude });
const appJs = (await esbuild.build({ ...common(assets), stdin: { contents: `import './scripts/hosted/vnet.js'; import './web/js/help.js'; import './web/js/app.js';`, resolveDir: ROOT, sourcefile: 'hosted-entry.js' } })).outputFiles[0].text;
let html = read('web/index.html');
html = must(html, '<title>Psyflo × Harvest</title>', '<title>Psyflo Harvest Demo</title>');
html = must(html, '<link rel="manifest" href="/manifest.webmanifest">\n', '<meta name="color-scheme" content="light">\n');
html = must(html, '<link rel="stylesheet" href="/css/ui.css">', `<style>:root{color-scheme:light}</style>\n<style>${uiCss}</style>`);
html = html.replace(/<script type="module"[^>]*><\/script>\s*/g, '');
html = must(html, '</body>', `<script>window.__VROOT=true;${safe(prelude)}</script>\n<script>${safe(appJs)}</script>\n</body>`);
if (!html.includes('fonts.googleapis.com')) html = html.replace('</head>', FONTS + '</head>');
for (const m of html.replace(/<script>[\s\S]*?<\/script>/g, '').matchAll(/<script[^>]*src=/g)) throw new Error('build: external script left in the page: ' + m[0]);

fs.mkdirSync(path.join(ROOT, 'hosted'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'hosted', 'index.html'), html);
console.log(`hosted/index.html  ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB  (${Buffer.byteLength(html).toLocaleString()} bytes; app ${(appJs.length / 1024).toFixed(0)} KB, panel ${(panelJs.length / 1024).toFixed(0)} KB, ${Object.keys(screens).length} screens)`);
