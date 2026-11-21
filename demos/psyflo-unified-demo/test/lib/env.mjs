// Ports, paths and run options for test/run-all.mjs (review/06b-qa-harness-spec.md section 4.1).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ports = (base, i = 0) => ({ app: base + 10 * i, lauris: base + 10 * i + 1, ext: base + 10 * i + 2 });
export const urls = (base, i = 0) => { const p = ports(base, i); return { APP: `http://localhost:${p.app}`, LAURIS: `http://localhost:${p.lauris}`, EXT: `http://localhost:${p.ext}` }; };
export function findPlaywright() {
  for (const c of [process.env.PW, '/opt/node22/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) if (c && fs.existsSync(c)) return c;
  return process.env.PW || 'playwright';
}
export function parseArgs(argv) {
  const o = { basePort: 4900, workers: 1, only: [], skip: [], tag: null, time: '15:30', preset: 'live', repeat: 1, shuffle: null, out: path.join(ROOT, 'review', 'test-results'),
    dataRoot: path.join(os.tmpdir(), 'psyflo-test-data'), keep: false, attach: null, release: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]; const v = () => argv[++i];
    if (a === '--ports' || a === '--base-port') o.basePort = +v();
    else if (a === '--workers') o.workers = +v();
    else if (a === '--only') o.only = v().split(',').map(x => x.trim()).filter(Boolean);
    else if (a === '--skip') o.skip = v().split(',').map(x => x.trim()).filter(Boolean);
    else if (a === '--tag') o.tag = v();
    else if (a === '--time') o.time = v();
    else if (a === '--preset') o.preset = v();
    else if (a === '--repeat') o.repeat = +v();
    else if (a === '--shuffle') o.shuffle = v();
    else if (a === '--out') o.out = path.resolve(v());
    else if (a === '--data-root') o.dataRoot = path.resolve(v());
    else if (a === '--keep-servers') o.keep = true;
    else if (a === '--attach') o.attach = v();
    else if (a === '--release') o.release = true;
    else if (a === '--list') o.list = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error('Unknown option ' + a);
  }
  return o;
}
