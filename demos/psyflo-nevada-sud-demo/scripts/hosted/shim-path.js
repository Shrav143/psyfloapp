// Minimal posix `node:path` for the browser build (hosted preview). Paths are virtual: the root is "/app".
const norm = p => {
  const abs = p.startsWith('/'); const out = [];
  for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') { if (out.length && out[out.length - 1] !== '..') out.pop(); else if (!abs) out.push('..'); } else out.push(s); }
  const r = (abs ? '/' : '') + out.join('/'); return r || (abs ? '/' : '.');
};
export const sep = '/';
export const normalize = p => { const r = norm(String(p)); return String(p).endsWith('/') && r !== '/' ? r + '/' : r; };
export const join = (...a) => normalize(a.filter(x => x !== '' && x != null).join('/') || '.');
export const resolve = (...a) => {
  let r = '';
  for (let i = a.length - 1; i >= 0 && !r.startsWith('/'); i--) { const s = String(a[i] || ''); if (s) r = s + (r ? '/' + r : ''); }
  if (!r.startsWith('/')) r = '/' + r;
  return norm(r);
};
export const dirname = p => { p = String(p); const i = p.replace(/\/+$/, '').lastIndexOf('/'); return i < 0 ? '.' : i === 0 ? '/' : p.slice(0, i); };
export const basename = (p, ext) => { let b = String(p).replace(/\/+$/, '').split('/').pop(); if (ext && b.endsWith(ext)) b = b.slice(0, -ext.length); return b; };
export const extname = p => { const b = basename(p); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; };
export const isAbsolute = p => String(p).startsWith('/');
export const relative = (from, to) => {
  const f = resolve(from).split('/').filter(Boolean), t = resolve(to).split('/').filter(Boolean); let i = 0;
  while (i < f.length && i < t.length && f[i] === t[i]) i++;
  return [...f.slice(i).map(() => '..'), ...t.slice(i)].join('/');
};
const path = { sep, normalize, join, resolve, dirname, basename, extname, isAbsolute, relative, posix: null };
path.posix = path;
export default path;
