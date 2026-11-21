// Internal 30-day review notes (screen 32, hidden in the Nevada build): staff-only. Concerns not yet evidenced,
// recovery-environment context, the plan, notes for the supervisor. Kept in Psyflo only: never typed into a Client Record box,
// never in a request packet, never written to client.quarter.
// s.internal_quarterlies = [{ id, client, period, fields: {concerns, home, plan, supervisor}, by, at, versions }]
const KEYS = ['concerns', 'home', 'plan', 'supervisor'];

export default {
  'quarterly.internalSave'(s, { client, period, fields, by }) {
    if (!client) throw new Error('Pick a client');
    if (!(s.clients || []).some(c => c.id === client)) throw new Error('Client not found');
    const clean = {};
    for (const k of KEYS) clean[k] = String((fields || {})[k] ?? '').trim();
    if (!KEYS.some(k => clean[k])) throw new Error('Nothing to save yet');
    s.internal_quarterlies = s.internal_quarterlies || [];
    let q = s.internal_quarterlies.find(x => x.client === client && x.period === period);
    if (!q) { q = { id: 'iq-' + Date.now().toString(36), client, period: period || '', versions: 0 }; s.internal_quarterlies.push(q); }
    Object.assign(q, { fields: clean, by: by || null, at: this.now(), versions: (q.versions || 0) + 1, staff_only: true });
    // the event says that it was saved, never what it says
    this.event('Internal 30-day review notes saved · staff only (not sent to the client, a referral partner or the plan)', by || 'Psyflo', client);
    return { id: q.id, at: q.at };
  }
};
