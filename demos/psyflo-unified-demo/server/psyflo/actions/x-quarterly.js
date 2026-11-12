// Internal quarterly (screen 32): the staff-only companion to the Lauris quarterly. Concerns not yet evidenced,
// home context, the plan, notes for the supervisor. Kept in Psyflo only: never typed into a Lauris box, never on the
// parent portal, never in a request packet, never written to client.quarter (the family version reads that).
// s.internal_quarterlies = [{ id, client, period, fields: {concerns, home, plan, supervisor}, by, at, versions }]
const KEYS = ['concerns', 'home', 'plan', 'supervisor'];

export default {
  'quarterly.internalSave'(s, { client, period, fields }) {
    const by = this.who();
    if (!client) throw new Error('Pick a student');
    if (!(s.clients || []).some(c => c.id === client)) throw new Error('Student not found');
    const clean = {};
    for (const k of KEYS) clean[k] = String((fields || {})[k] ?? '').trim();
    if (!KEYS.some(k => clean[k])) throw new Error('Nothing to save yet');
    s.internal_quarterlies = s.internal_quarterlies || [];
    let q = s.internal_quarterlies.find(x => x.client === client && x.period === period);
    if (!q) { q = { id: 'iq-' + Date.now().toString(36), client, period: period || '', versions: 0 }; s.internal_quarterlies.push(q); }
    Object.assign(q, { fields: clean, by: by || null, at: this.now(), versions: (q.versions || 0) + 1, staff_only: true });
    // the event says that it was saved, never what it says
    this.event('Internal quarterly saved · staff only (not sent to the guardian, the school or the insurer)', by || 'Psyflo', client);
    return { id: q.id, at: q.at };
  }
};
