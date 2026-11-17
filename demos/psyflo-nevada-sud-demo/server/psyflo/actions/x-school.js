// Referral-partner updates (drug court case manager, P&P officer). A partner shares a short update about a client; it never
// goes to Client Record on its own. In the extension a staffer can (a) add it to that day's group note, credited to the partner
// ("Per the drug court case manager, …"), or (b) fill it into a collateral contact in Client Record. Each use is logged on the update.
// s.shares = [{ id, client, by, text, where, at, used: { daily: {at, by, note}, collateral: {at, by} } }]
const byId = (arr, id) => (arr || []).find(x => x.id === id);

export default {
  'school.share'(s, { client, by, text, where = '' }) {
    if (!client) throw new Error('Pick a client');
    if (!String(text || '').trim()) throw new Error('Write what happened first');
    s.shares = s.shares || [];
    const id = 'sh-' + Date.now();
    s.shares.push({ id, client, by, text: String(text).trim(), where: String(where).trim(), at: this.now(), used: {} });
    const who = byId(s.school_users, by)?.name || by;
    this.event(`Update from ${who} (referral partner): "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`, by, client);
    return { id };
  },
  // how: 'daily' (added to that day's daily note, credited) or 'collateral' (filled into a collateral contact)
  'school.shareUsed'(s, { id, how, by = 'khale' }) {
    const sh = byId(s.shares, id); if (!sh) throw new Error('Update not found');
    if (!['daily', 'collateral'].includes(how)) throw new Error('Unknown use');
    sh.used = sh.used || {};
    sh.used[how] = { at: this.now(), by };
    this.event(how === 'daily' ? 'Referral-partner update added to the group note, credited to the partner' : 'Referral-partner update filled into a collateral contact in Client Record', by, sh.client);
  }
};
