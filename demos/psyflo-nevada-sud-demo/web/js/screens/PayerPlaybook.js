// 40 · Payer playbook · what changed (Seeded + live feed). Per-plan rows from state.payers + state.plan_notes;
// the "What changed" feed from state.policy_changes (seed/extra/playbook.json): plan rule changes Psyflo
// noticed in denials and replies, and what it now does differently. Drafting rules are the Nevada ASAM set.
import { register, Screen, M } from '../app.js';

const CHANNEL = { fax: 'Fax', availity: 'Availity', portal: 'Portal' };
const SHORT = { humana: 'SilverSummit', anthem: 'Anthem', sentara: 'Molina', aetna: 'CareSource', uhc: 'HPN', ffs: 'NV Medicaid FFS' };

export const DRAFTING_RULES = [
  ['Organised by the six ASAM dimensions', 'D1 withdrawal · D2 biomedical · D3 emotional/behavioral · D4 readiness · D5 relapse potential · D6 recovery environment; every claim sits under the dimension it supports'],
  ['Dates and counts, never adjectives', '"attended 24 of 24 IOP days since Sep 29", "UDS negative Oct 6, 13, 20" — not "doing well"'],
  ['Abstinence in treatment is not readiness to step down', 'continued-stay drafts argue D5 relapse risk without the Level 2.1 structure and say which step-down criteria are not met yet'],
  ['Units match the level', 'Level 2.1 IOP: H0015, 1 unit = 1 hour, 3 hours a day, at least 3 days a week (9 units a week); Level 1: H0004 / H0005 per 15 min'],
  ['UDS from the assessment goes in every Level 2.1 initial', 'even where the plan form does not ask; SilverSummit denies without it'],
  ['The plan\'s own format', 'its form, its portal box or the EHR printout, as the plan wants it; the facts are the same in each'],
  ['Request dates never start before the assessment', 'no backdating: a Level 2.1 day before the auth is not billable'],
  ['5-session plans get the next request at session 3', 'so it is decided before session 5'],
  ['Provider type stated up front on mental-health codes', 'the agency is enrolled for SUD and mental health; the line goes on Anthem MH requests before a reviewer asks'],
  ['Answer the question and stop', 'on information requests: three items asked, three answered, nothing added'],
  ['Nothing the clinician marked exclude', 'and nothing from 42 CFR Part 2 records the client did not consent to share'],
  ['A person signs and a person sends', 'Psyflo drafts; the clinician signs; billing presses Send']
];

const statusCls = st => /watch/i.test(st) ? 'y' : /confirm/i.test(st) ? 'y' : /retired|resolved/i.test(st) ? 'n' : 'g';

register('PayerPlaybook', class extends Screen {
  renderVals() {
    const s = this.s;
    const notes = s.plan_notes || {};
    const stats = s.analytics_nv?.payers || {};
    const feed = (s.policy_changes || []).slice().sort((a, b) => String(b.detected).localeCompare(String(a.detected)));
    const changes = feed.map(c => {
      const q = c.record && M.byId(s.requests, c.record);
      return {
        detected: M.fmtDate(c.detected), plan: SHORT[c.payer] || M.payerShort(s, c.payer), from: c.from, change: c.change, effect: c.effect, action: c.action,
        status: c.status, cls: statusCls(c.status),
        href: q ? M.requestHref(q) : 'Claims.dc.html', link: q ? 'Open ' + q.id + ' →' : 'Denial Intelligence →'
      };
    });
    const oldest = feed.length ? feed[feed.length - 1].detected : s.today;
    return {
      trackerChip: `${feed.length} plan change${feed.length === 1 ? '' : 's'} detected · demo data`,
      nChanges: String(feed.length), nActive: String(feed.filter(c => /active/i.test(c.status)).length), nPlans: String(s.payers.length), since: M.fmtDate(oldest),
      changes, noChanges: feed.length ? '' : 'No plan changes detected yet. They appear here as denials and replies come in.',
      payers: s.payers.map(p => {
        const n = notes[p.id] || {}; const st = stats[p.id];
        const nReq = p.requests_this_year || 0;
        const partial = nReq ? `${nReq} decided · partial ${Math.round((p.partial_rate || 0) * nReq)}${st?.denied != null ? ' · denied ' + Math.round(st.denied * nReq) : ''} (demo)` : '';
        return {
          name: p.name, partial, form: n.form || '—', channel: n.submit || CHANNEL[p.channel] || p.channel,
          days: p.decides_in_days != null ? p.decides_in_days + ' d' : '—',
          level1: n.level1 || '—', level21: n.level21 || '', works: [n.watch, p.what_works].filter(Boolean).join(' · ') || p.tends_to_ask || '—'
        };
      }),
      rules: DRAFTING_RULES.map(([title, text], i) => ({ n: i + 1, title, text, style: i === 0 ? 'border-top:0;padding-top:0' : '' }))
    };
  }
});
