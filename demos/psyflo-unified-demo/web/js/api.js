// Client for the Psyflo store. One shared state, live across every open tab via server-sent events.
const listeners = new Set();
export const api = {
  state: null, config: null, base: '',
  async init(base = '') {
    this.base = base;
    const [s, c] = await Promise.all([fetch(base + '/api/state').then(r => r.json()), fetch(base + '/api/config').then(r => r.json())]);
    this.state = s; this.config = c;
    try {
      const es = new EventSource(base + '/api/stream');
      es.addEventListener('state', async e => { const { rev } = JSON.parse(e.data); if (!this.state || rev !== this.state.rev) await this.refresh(); });
    } catch { /* no SSE: polling below */ }
    setInterval(() => this.refresh(true), 15000);
    return this;
  },
  async refresh(quiet) {
    const s = await fetch(this.base + '/api/state').then(r => r.json()).catch(() => null);
    if (!s) return;
    const changed = !this.state || s.rev !== this.state.rev;
    this.state = s;
    if (changed || !quiet) for (const l of listeners) l(s);
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  async do(action, args = {}) {
    const r = await fetch(this.base + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.error || 'Action failed');
    await this.refresh();
    return j.result;
  }
};
