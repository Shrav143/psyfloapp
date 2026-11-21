// Builds hosted/index.html: the whole Psyflo × CCC of SN (Nevada · SUD) demo in ONE self-contained HTML file that runs with no server.
//   node scripts/build-hosted.mjs            (add --min to minify)        also:  npm run build:hosted
// The server code (store, every action module, pdf, the mock Client Record, the mock portals) is bundled unchanged and runs in the page behind a
// virtual network (scripts/hosted/vnet.js). esbuild is not a dependency of this repo: install it anywhere and point HOSTED_TOOLS at that folder
//   (npm i esbuild --prefix "$HOSTED_TOOLS").  The output is deterministic: same sources, same bytes.
//
// The page's HTML (web/index.html, web/panel/index.html) is NOT matched against exact strings: local stylesheets are inlined whatever the markup
// around them, the manifest and module script are dropped by pattern, the title is set by pattern. The few places in the app's own scripts that a
// published page cannot run (new Function, saving a file, navigating to a server path) are rewritten in the BUNDLE only, by the rules below:
// generic rules (any number of matches) and file rules (each must match exactly once, or the build stops and names the rule).
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'scripts', 'hosted');
const TOOLS = process.env.HOSTED_TOOLS || '/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/hosted-tools';
const MIN = process.argv.includes('--min');
const TITLE = 'Psyflo Nevada SUD Demo';
let esbuild;
try { esbuild = createRequire(path.join(TOOLS, 'package.json'))('esbuild'); }
catch { console.error(`esbuild not found. Run: npm i esbuild --prefix ${TOOLS}   (or set HOSTED_TOOLS to a folder that has it)`); process.exit(1); }

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const ls = (d, test = () => true) => fs.readdirSync(path.join(ROOT, d)).filter(test).sort();
const fail = msg => { throw new Error('build: ' + msg); };
const warnings = new Set();

// ---------- source rewrites ----------
const countOf = (s, re) => [...s.matchAll(re.global ? re : new RegExp(re.source, re.flags + 'g'))].length;
// a rule that must match `times` times (default once; `atLeast` for a global rule); `optional` lets zero matches pass with a warning (cosmetic rules only)
function sub(s, re, to, what, { times = 1, atLeast = 0, optional = false } = {}) {
  const n = countOf(s, re);
  if (n === 0 && optional) { warnings.add('optional rewrite did not match: ' + what); return s; }
  if (atLeast ? n < atLeast : n !== times) fail(`${what}: expected ${atLeast ? 'at least ' + atLeast : times} match${times === 1 && !atLeast ? '' : 'es'} of ${re}, found ${n}. The source changed: update scripts/build-hosted.mjs`);
  return s.replace(re, to);
}
// The screens and the UI kit belong to other owners and stay untouched.
const GENERIC = [
  // a published page cannot build functions from strings (the canvas screens' x-dc scripts are dropped; nothing else may use it)
  { files: /^web\/(js|panel)\//, re: /\bnew Function\s*\(/g, to: '__hnf(', what: 'new Function' },
  // routes are hashes, moved by history.pushState (the prelude); a sandboxed or srcdoc page cannot assign location.hash or any path
  { files: /^web\/js\//, re: /(?<![\w.$])location\.hash\s*=(?!=)\s*([^;\n]+);/g, to: 'window.__vhash($1);', what: 'location.hash =' },
  { files: /^web\/js\//, re: /(?<![\w.$])location\.href\s*=(?!=)\s*([^;\n]+);/g, to: 'window.__vopen($1);', what: 'location.href =' },
  { files: /^web\/js\//, re: /(?<![\w.$])location\.pathname\b/g, to: "'/'", what: 'location.pathname' },
  // the Psyflo panel is a srcdoc frame: its app address is the virtual one
  { files: /^web\/panel\/panel\.js$/, re: /(?<![\w.$])location\.origin\b/g, to: '(window.__vapp || location.origin)', what: 'panel location.origin' }
];
const FILE_RULES = {
  // app.js loads a controller per screen with import(`./screens/${id}.js`) and ignores the ones that do not exist (the extension screens have none: they
  // use the composite). A bundle has no 404, so the same lookup is made explicit: the controllers that exist, and the "Failed to fetch" rejection app.js expects
  'web/js/app.js': [
    { re: /import\(\s*`\.\/screens\/\$\{([^}]+)\}\.js`\s*\)/, to: '__hscreen($1)', what: 'app.js: import(`./screens/${id}.js`)',
      prepend: () => { const ids = ls('web/js/screens', f => f.endsWith('.js')).map(f => f.slice(0, -3)); return `const __hscreens = {${ids.map(i => `${JSON.stringify(i)}: () => import(${JSON.stringify('./screens/' + i + '.js')})`).join(', ')}};\nconst __hscreen = id => __hscreens[id] ? __hscreens[id]() : Promise.reject(new TypeError('Failed to fetch dynamically imported module: ./screens/' + id + '.js'));\n`; } }
  ],
  // the canvas demo Components (<script type="text/x-dc"> blocks, dropped from the screens below) were run with new Function
  'web/js/runtime.js': [
    { re: /try\s*\{\s*Component\s*=\s*new Function\([^\n]*?\}\s*catch\s*\([^)]*\)\s*\{[^\n]*?\}/, to: '/* hosted: the canvas demo components (x-dc scripts) are not run */', what: 'runtime.js: new Function(x-dc script)', optional: true }   // __hnf catches it if this moves
  ],
  // a CSV or PDF "download": no downloads in a hosted page, so the file opens in the in-page viewer (vnet.js __vsave)
  'web/js/screens/Analytics.js': [
    { re: /function download\s*\(([^)]*)\)\s*\{[\s\S]*?\n\}/, to: (m, params) => `function download(${params}) { window.__vsave(${params.split(',').map(x => x.split('=')[0].trim()).slice(0, 3).join(', ')}); }`, what: 'Analytics.js: download()' },
    { re: /toast\('CSV downloaded'\)/, to: "toast('CSV opened in a viewer')", what: 'Analytics.js: CSV toast', optional: true },
    { re: / saved as a PDF'/, to: " opened as a PDF'", what: 'Analytics.js: PDF toast', optional: true }
  ],
  // the page bridge runs in the mock Client Record frame (a srcdoc page with an opaque origin): its address is window.__vloc, frames are matched by
  // window, and "navigate" is a virtual page load
  'web/panel/bridge.js': [
    { re: /window\.__psyfloBridge\s*=\s*true;/, to: m => m + ' const loc = window.__vloc || location; const HOSTED = !!window.__vloc;', what: 'bridge.js: start' },
    { re: /(?<![\w.$])location\.href\s*=(?!=)\s*msg\.url/, to: '(HOSTED && window.__vgo ? window.__vgo(msg.url) : (location.href = msg.url))', what: 'bridge.js: navigate' },
    { re: /(?<![\w.$])location\.(pathname|origin|href)\b(?!\s*=(?!=))/g, to: 'loc.$1', atLeast: 2, what: 'bridge.js: location reads' },
    { re: /const appOrigin = new URL\(APP\)\.origin;/, to: "const appOrigin = HOSTED ? '*' : new URL(APP).origin;", what: 'bridge.js: appOrigin' },
    { re: /e\.origin !== appOrigin/, to: "(HOSTED ? e.source !== (document.getElementById('psyflo-frame') || {}).contentWindow : e.origin !== appOrigin)", what: 'bridge.js: panel origin check' }
  ]
};
const patched = new Set();
function rewrite(rel, src) {
  for (const r of FILE_RULES[rel] || []) { const before = src; src = sub(src, r.re, r.to, r.what, r); if (r.prepend) src = r.prepend() + src; if (src !== before) patched.add(rel); }   // the exact rules first, then the safety nets
  for (const g of GENERIC) if (g.files.test(rel)) { const n = countOf(src, g.re); if (n) { src = src.replace(g.re, g.to); patched.add(rel); } }
  return src;
}

// ---------- HTML helpers (tolerant: patterns, not exact strings) ----------
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i')); return m ? (m[1] ?? m[2]) : null; };
const isRemote = u => /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(u) || /^(?:https?|data):/i.test(u);
const cssSafe = css => css.replace(/<\/style/gi, '<\\/style');
// Inline every local <link rel="stylesheet" href=...>, drop other local <link>s (manifest, icons, preloads), drop local <script src> (the bundle replaces them),
// keep remote stylesheets (Google Fonts). `dir` is the folder of the HTML file inside web/ that relative addresses resolve against.
function assemble(html, dir, what) {
  html = html.replace(/<link\b[^>]*>/gi, tag => {
    const rel = (attr(tag, 'rel') || '').toLowerCase(), href = attr(tag, 'href');
    if (href == null || isRemote(href)) return tag;
    if (rel.split(/\s+/).includes('stylesheet')) {
      const file = href.startsWith('/') ? path.join(ROOT, 'web', href) : path.resolve(ROOT, dir, href);
      const clean = file.split(/[?#]/)[0];
      if (!fs.existsSync(clean)) fail(`${what}: the stylesheet ${href} does not exist (looked for ${path.relative(ROOT, clean)})`);
      return `<style>${cssSafe(fs.readFileSync(clean, 'utf8'))}</style>`;
    }
    return '';   // rel=manifest, icon, apple-touch-icon, modulepreload, ...: a file the page cannot load
  });
  html = html.replace(/<script\b[^>]*\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')[^>]*>\s*<\/script>\s*/gi, (tag, a, b) => isRemote(a ?? b ?? '') ? tag : '');
  return html;
}
const setTitle = html => /<title\b[^>]*>[\s\S]*?<\/title>/i.test(html) ? html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, () => `<title>${TITLE}</title>`) : html.replace(/<\/head>/i, () => `<title>${TITLE}</title>\n</head>`);
const beforeEnd = (html, tag, add) => { const i = html.toLowerCase().lastIndexOf(tag); return i < 0 ? html + add : html.slice(0, i) + add + html.slice(i); };
// text that goes inside an inline <script>: no "</script", no "<!--"
const safe = js => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// ---------- what the virtual file system and the virtual network hold ----------
const vfs = {};
const walk = (rel) => { for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const r = rel + '/' + e.name; if (e.isDirectory()) walk(r); else if (/\.(json|md|txt|csv)$/i.test(e.name)) vfs['/app/' + r] = read(r); } };
walk('seed');                                                              // seed.json, extra/*.json, scripts/*, notes.md: what the server reads at /app/seed
const notes = read('seed/notes.md');                                       // what GET /seed/notes.md serves
// no screen needs the canvas's own demo Component (a <script type="text/x-dc"> run through new Function): every route has a controller or the
// extension composite. Leaving the scripts out keeps the page working where eval is forbidden. (<script src> tags of the canvas files never ran.)
const screens = Object.fromEntries(ls('web/screens', f => f.endsWith('.dc.html')).map(f => [f, read('web/screens', f).replace(/<script\b[^>]*\btype="text\/x-dc"[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>\s*/gi, '')]));
const actionFiles = ls('server/psyflo/actions', f => f.endsWith('.js'));   // loaded in filename order, like server/index.js
const prelude = fs.readFileSync(path.join(SRC, 'prelude.js'), 'utf8');
const bridge = rewrite('web/panel/bridge.js', read('web/panel/bridge.js'));

// ---------- esbuild plugin: node:* shims, virtual modules, import.meta.url, the rewrites above ----------
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
    b.onLoad({ filter: /\.js$/ }, a => {
      const rel = path.relative(ROOT, a.path).split(path.sep).join('/');
      if (!/^(server|web)\//.test(rel)) return undefined;
      let src = fs.readFileSync(a.path, 'utf8');
      // server modules ask for their own file location; give each one a stable virtual path under /app
      if (rel.startsWith('server/')) src = src.replaceAll('import.meta.url', JSON.stringify('file:///app/' + rel));
      src = rewrite(rel, src);
      return { contents: src, loader: 'js', resolveDir: path.dirname(a.path) };
    });
  }
});
const common = assets => ({
  bundle: true, write: false, platform: 'browser', format: 'iife', target: 'es2022', logLevel: 'warning', logOverride: { 'duplicate-object-key': 'silent' }, legalComments: 'none', charset: 'utf8', minify: MIN,
  inject: [path.join(SRC, 'inject.js')],
  plugins: [plugin(assets)], absWorkingDir: ROOT
});

// ---------- 1. the panel (one srcdoc page inside the mock Client Record) ----------
const panelJs = (await esbuild.build({ ...common(() => ({})), stdin: { contents: `import './web/panel/panel.js';`, resolveDir: ROOT, sourcefile: 'panel-entry.js' } })).outputFiles[0].text;
let panelDoc = assemble(read('web/panel/index.html'), 'web/panel', 'web/panel/index.html');
panelDoc = beforeEnd(panelDoc, '</body>', `<script>/*__VCFG__*/</script><script>${safe(prelude)}</script><script>${safe(panelJs)}</script>`);

// ---------- 2. the app: shell + virtual network + server code ----------
const assets = () => ({ screens, notes, logo: read('web/js/logo.svg'), bridge, panelDoc, prelude });
const appJs = (await esbuild.build({ ...common(assets), stdin: { contents: `import './scripts/hosted/vnet.js'; import './scripts/hosted/glue.js'; import './web/js/app.js';`, resolveDir: ROOT, sourcefile: 'hosted-entry.js' } })).outputFiles[0].text;
let html = assemble(read('web/index.html'), 'web', 'web/index.html');
html = setTitle(html);
html = beforeEnd(html, '</head>', `<meta name="color-scheme" content="light">\n<style>:root{color-scheme:light}</style>\n`);
html = beforeEnd(html, '</body>', `<script>window.__VROOT=true;${safe(prelude)}</script>\n<script>${safe(appJs)}</script>\n`);

// ---------- 3. contract checks: the published page ----------
// (the page's own tags are checked without the text of its inline scripts: the Client Record pages inside them are strings, not tags of this page)
const bad = []; const markup = html.replace(/<script>[\s\S]*?<\/script>/g, '');
if (/<script[^>]*\bsrc=/i.test(markup)) bad.push('an external script');
for (const m of markup.matchAll(/<link\b[^>]*>/gi)) { const h = attr(m[0], 'href') || ''; if (!/^https:\/\/fonts\.googleapis\.com\//.test(h)) bad.push('a linked resource other than Google Fonts: ' + h); }
if (/<link[^>]*rel=["']manifest/i.test(markup)) bad.push('a manifest link');
if (!new RegExp(`<title>${TITLE}</title>`).test(markup)) bad.push('the title');
if (/<a\b[^>]*\bdownload\b/i.test(html)) bad.push('an <a download> in the page');
if (/\.download\s*=[^=]|\.setAttribute\(\s*['"]download['"]/.test(html)) bad.push('a script-driven download (.download =)');
if (/\bnew Function\s*\(|[^.\w]eval\s*\(/.test(html)) bad.push('eval / new Function in the bundle');
if (Buffer.byteLength(html) > 8 * 1048576) bad.push('more than 8 MB');
if (bad.length) { console.error('build: the page breaks the artifact contract:\n  ' + [...new Set(bad)].join('\n  ')); process.exit(1); }

fs.mkdirSync(path.join(ROOT, 'hosted'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'hosted', 'index.html'), html);
for (const w of warnings) console.warn('warning: ' + w);
console.log(`hosted/index.html  ${(Buffer.byteLength(html) / 1048576).toFixed(2)} MB  (${Buffer.byteLength(html).toLocaleString()} bytes; app ${(appJs.length / 1024).toFixed(0)} KB, panel ${(panelJs.length / 1024).toFixed(0)} KB, ${Object.keys(screens).length} screens, ${actionFiles.length} action files, ${patched.size} rewritten files)`);
