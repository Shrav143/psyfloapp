// Saved state in the URL query. The router keeps the query inside the hash (#/Route?status=needs), so a filter that lives in
// the URL survives a reload, a back/forward step and a copied link. Writing uses history.replaceState: no hashchange, so
// the screen controller is NOT re-created and local state survives.
export function hashParts() {
  const h = location.hash.replace(/^#\/?/, ''); const [id, qs = ''] = h.split('?');
  return { id, params: new URLSearchParams(qs) };
}
// readQuery(['status','q']) -> { status:'needs', q:'' }   (all keys when none are named)
export function readQuery(keys) {
  const { params } = hashParts(); const out = {};
  if (keys) keys.forEach(k => { out[k] = params.get(k) ?? ''; }); else params.forEach((v, k) => { out[k] = v; });
  return out;
}
// writeQuery({ status:'needs', q:'' }) merges into the current query; empty values remove the key
export function writeQuery(patch, { replace = true } = {}) {
  const { id, params } = hashParts(); if (!id) return;
  for (const [k, v] of Object.entries(patch || {})) { if (v == null || v === '' || v === false) params.delete(k); else params.set(k, String(v)); }
  const qs = params.toString(); const url = location.pathname + location.search + '#/' + id + (qs ? '?' + qs : '');
  if (replace) history.replaceState(history.state, '', url); else history.pushState(history.state, '', url);
}
