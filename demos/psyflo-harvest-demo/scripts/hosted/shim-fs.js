// An in-memory `node:fs` for the browser build (hosted preview). The build embeds seed/ (seed.json, extra/*.json, scripts/*, notes.md,
// notes/*.md) under /app/seed; everything the server writes (psyflo.json, lauris.json, generated PDFs under /app/data/files) stays in memory.
import { Buffer } from './shim-buffer.js';
import { resolve } from './shim-path.js';
import VFS from 'hosted:vfs';

const files = new Map(Object.entries(VFS));        // abs path -> string | Uint8Array
const dirs = new Set(['/', '/app']);
const p = x => resolve(String(x));
const addDirs = f => { let d = f; while (d.length > 1) { d = d.slice(0, d.lastIndexOf('/')) || '/'; dirs.add(d); } };
for (const f of files.keys()) addDirs(f);
const enoent = (op, f) => Object.assign(new Error(`ENOENT: no such file or directory, ${op} '${f}'`), { code: 'ENOENT', errno: -2, syscall: op, path: f });
const enc = o => typeof o === 'string' ? o : o && o.encoding;

export const existsSync = f => { f = p(f); if (files.has(f) || dirs.has(f)) return true; return false; };
export const readFileSync = (f, o) => {
  f = p(f); if (!files.has(f)) throw enoent('open', f);
  const v = files.get(f); const e = enc(o);
  if (e) return typeof v === 'string' ? v : Buffer.from(v).toString(e);
  return typeof v === 'string' ? Buffer.from(v) : Buffer.from(v);
};
export const writeFileSync = (f, data) => { f = p(f); files.set(f, typeof data === 'string' ? data : Uint8Array.from(data)); addDirs(f); };
export const mkdirSync = (d) => { d = p(d); dirs.add(d); addDirs(d); };
export const readdirSync = d => {
  d = p(d); if (!dirs.has(d)) throw enoent('scandir', d);
  const pre = d === '/' ? '/' : d + '/'; const out = new Set();
  for (const k of [...files.keys(), ...dirs]) if (k.startsWith(pre) && k.length > pre.length) out.add(k.slice(pre.length).split('/')[0]);
  return [...out].sort();
};
export const unlinkSync = f => { f = p(f); if (!files.delete(f)) throw enoent('unlink', f); };
export const statSync = f => { f = p(f); if (!existsSync(f)) throw enoent('stat', f); return { isFile: () => files.has(f), isDirectory: () => dirs.has(f), size: files.has(f) ? files.get(f).length : 0 }; };
export const stat = (f, cb) => { try { cb(null, statSync(f)); } catch (e) { cb(e); } };
export const copyFileSync = (a, b) => writeFileSync(b, files.get(p(a)));
export const createReadStream = () => { throw new Error('createReadStream is not available in the hosted preview'); };
export const __bytes = f => { f = p(f); const v = files.get(f); return v == null ? null : typeof v === 'string' ? new TextEncoder().encode(v) : v; };
export default { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync, stat, copyFileSync, createReadStream };
