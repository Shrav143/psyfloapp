// 35 · Partial approval (and denial) — three choices for a partial award, logged on the request; a denial is one line
// with the guardian letter. This file also holds what the five decision pages share (34 Additional info, 35 Partial
// approval, 36 Early discharge, 38 P2P call notes, 39 Appeal letter): request lookup, portal and file helpers, the
// unit arithmetic every date on these pages comes from, and the layout CSS.
import { register, Screen, M, raw, esc, toast, api, helpIcon } from '../app.js';
import { REQ_TYPE, STATUS } from '../shared/labels.js';
import { isSchoolDay, addBusinessDays, addDays, daysBetween, businessDaysBetween, fmtDate } from '../shared/dates.js';

// ---------- request lookup (self-contained: the decision pages do not depend on the Authorizations controller) ----------
export const details = (s, id) => (s.request_details && s.request_details[id]) || {};
// the live row wins; seeded tracker fields fill what the seed row lacks
export const view = (s, r) => r ? { ...(details(s, r.id).fill || {}), ...r } : null;
export const findReq = (s, id) => view(s, M.byId(s.requests, id));
// ?id if it exists; else the first request that is open for this page; else the first fallback id that exists
export function pickReq(s, id, fallbacks = [], pred = () => false) {
  if (id) { const r = findReq(s, id); if (r) return r; }
  const open = s.requests.find(pred); if (open) return view(s, open);
  for (const f of fallbacks) { const r = findReq(s, f); if (r) return r; }
  return null;
}
export const clientOf = (s, r) => M.byId(s.clients, r.client);
export const payerFirst = (s, id) => id === 'ffs' ? 'Medicaid FFS' : M.payerShort(s, id).split(' ')[0];
export const rateFor = r => /after-school/i.test(r.service || '') ? 1 : /outpatient/i.test(r.service || '') ? 0 : 3;
export const todayLine = s => fmtDate(s.today, { dow: true }).replace(' ', ', ');
export const cap = t => { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); };
// severity from the model → UI-kit chip class
export const chipCls = sev => 'u-chip ' + ({ r: 'late', y: 'watch', ok: 'ok', g: 'ok', n: 'info' }[sev] || 'info');
export const stamp = (s, at) => { if (!at) return ''; const d = at.slice(0, 10) === s.today ? 'Today' : fmtDate(at); const t = M.fmtTime(at); return t ? `${d}, ${t}` : d; };
export const clip = (t, n = 20) => { const w = String(t || '').trim().split(/\s+/); return w.length <= n ? w.join(' ') : w.slice(0, n).join(' ').replace(/[,;:]$/, '') + '…'; };

// open a page on the mock portals (Availity / UHC) in a new tab; the tab is opened inside the click so the browser does
// not block it, then pointed at the URL the action returns
export async function openPortal(screen, action, args) {
  let w = null; try { w = window.open('', '_blank'); } catch { }
  let res;
  try { res = await screen.do(action, args); } catch (e) { if (w) w.close(); return null; }
  if (res && res.open) {
    const url = `${api.config.extURL}${res.open}`;
    if (w) w.location.href = url; else window.open(url, '_blank');
  } else if (w) w.close();
  return res;
}
export async function openFile(screen, action, args, pick = r => r?.file?.url || r?.url) {
  let w = null; try { w = window.open('', '_blank'); } catch { }
  try { const res = await screen.do(action, args); const url = pick(res); if (url) { if (w) w.location.href = url; else window.open(url, '_blank'); } else if (w) w.close(); return res; }
  catch { if (w) w.close(); return null; }
}

// ---------- unit arithmetic (one place, so every date on every decision page agrees) ----------
export const schoolDayFrom = d => { let x = d.slice(0, 10); while (!isSchoolDay(x)) x = addDays(x, 1); return x; };
// last school day the units cover, at `rate` units per school day from `start` (the start day counts)
export const runOut = (start, units, rate = 3) => addBusinessDays(schoolDayFrom(start), Math.max(0, Math.ceil(units / (rate || 3)) - 1));

// Units left, the day they run out, the discharge day and the earliest day a new request can go.
// New request earliest = the later of (acceptance + clocks.restart_days) and the first school day after the discharge.
export function unitPlan(s, r) {
  const c = clientOf(s, r); const a = c?.authorization; const rate = rateFor(r) || 3;
  const units = r.units_awarded || r.units_offered || 0;
  const same = !!(a && a.payer === r.payer && a.units === units);
  const saved = (s.plans || []).find(p => p.request === r.id);
  const accepted = (r.decision?.at || saved?.at || s.today).slice(0, 10);
  const left = Math.max(0, units - (same ? (a.used || 0) : 0));
  const from = schoolDayFrom(same && a.start ? a.start : accepted);
  const days = Math.ceil(left / rate);
  const runout = same && a.exhausted ? a.exhausted : addBusinessDays(from, Math.max(0, days - 1));
  const restartOn = addDays(accepted, M.clocksOf(s).restart_days);
  const discharge = saved?.discharge || runout;
  const after = schoolDayFrom(addDays(discharge, 1));
  const newReq = saved?.new_initial || schoolDayFrom(restartOn > after ? restartOn : after);
  return { units, left, rate, from, days, runout, discharge, accepted, restartOn, newReq, bound: restartOn > after ? 'restart' : 'discharge', saved };
}
// option 1: spread the awarded units so they last until the current end date
export function stretchPlan(s, r, up) {
  const c = clientOf(s, r);
  const until = (r.dates || '').split(' to ')[1] || c?.authorization?.end || addDays(up.from, 91);
  const days = Math.max(1, businessDaysBetween(up.from, until) + 1);
  return { until, days, perDay: Math.round(up.units / days * 10) / 10, perWeek: Math.round(up.units / days * 50) / 10 };
}
const perWeekText = x => { const n = x >= 3 ? Math.round(x) : x; return `${n} unit${n === 1 ? '' : 's'} a week`; };

// ---------- layout CSS shared by the five decision pages (UI-kit tokens only) ----------
export const CSS = `
.b2-grid{display:grid;grid-template-columns:minmax(240px,1fr) minmax(0,2fr);gap:24px;align-items:start}
.b2-col{display:flex;flex-direction:column;gap:8px;min-width:0}
.b2-lbl{font-size:12px;line-height:16px;font-weight:600;color:var(--ink-3);margin-top:8px;display:flex;align-items:center;gap:8px}
.b2-col>.b2-lbl:first-child{margin-top:0}
.b2-big{font-size:16px;line-height:24px}
.b2-kv{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.b2-foot{display:flex;align-items:center;justify-content:flex-end;gap:12px;margin-top:24px;flex-wrap:wrap}
.b2-l{margin-right:auto}
.b2-one{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.b2-line{flex:1;min-width:0}
.b2-doc{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:16px 20px;line-height:22px}
.b2-doc.draft{background:var(--lauris-yellow-bg);border-color:var(--lauris-yellow-bd)}
.b2-doc h3{font-size:12px;line-height:16px;font-weight:600;color:var(--ink-3);margin:16px 0 4px}
.b2-doc h3:first-child{margin-top:0}
.b2-doc p,.b2-doc ul,.b2-doc ol{margin:0 0 8px}
.b2-doc ul,.b2-doc ol{padding-left:20px}
.b2-doc li{margin-bottom:4px}
.b2-ans{margin:0 0 12px}
.b2-ans:last-child{margin-bottom:0}
.b2-qa dt{font-weight:600;margin-top:8px}.b2-qa dd{margin:0}
.b2-q{margin:0;padding-left:20px;line-height:22px}.b2-q li{margin-bottom:8px}
.b2-ta{width:100%;min-height:400px;border:1px solid var(--lauris-yellow-bd);background:var(--lauris-yellow-bg);border-radius:12px;padding:16px 20px;font:inherit;line-height:22px;color:var(--navy);resize:vertical}
.b2-ta.sm{min-height:96px;background:var(--white);border-color:var(--line-strong);border-radius:8px;padding:8px 10px}
.b2-src{display:inline-flex;align-items:center;justify-content:center;min-width:16px;height:16px;padding:0 4px;margin:0 0 0 3px;border-radius:8px;background:var(--teal-tint);color:var(--teal-dark);font-size:11px;line-height:16px;font-weight:600;vertical-align:text-top;cursor:help}
.b2-srcs{margin:0;padding:0;list-style:none}.b2-srcs li{display:flex;gap:8px;align-items:baseline;margin-bottom:4px}
.b2-det summary{cursor:pointer;font-weight:600;color:var(--teal-dark);min-height:28px;display:flex;align-items:center;gap:6px}
.b2-opts{display:flex;flex-direction:column;gap:8px}
.b2-opt{display:grid;grid-template-columns:20px minmax(0,1fr) auto;align-items:center;gap:12px;width:100%;min-height:56px;padding:8px 16px;background:var(--white);border:1px solid var(--line);border-radius:12px;font:inherit;text-align:left;color:var(--navy);cursor:pointer}
.b2-opt:hover{background:var(--paper)}
.b2-opt.on{border-color:var(--teal);background:var(--teal-tint)}
.b2-opt b{font-weight:600}
.b2-os{color:var(--ink-3);font-size:13px}
.b2-dot{width:18px;height:18px;border-radius:50%;border:1.5px solid var(--ink-3);position:relative;display:inline-block}
.b2-opt.on .b2-dot{border-color:var(--teal)}
.b2-opt.on .b2-dot::after{content:'';position:absolute;inset:3px;border-radius:50%;background:var(--teal)}
.u-bar.b2-bar{display:block;width:100%;height:10px;border-radius:5px}
.b2-last{border-top:1px solid var(--line);padding-top:8px;margin-top:8px}
.b2-last summary{cursor:pointer;min-height:28px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;color:var(--ink-2)}
.b2-last summary b{color:var(--navy);font-weight:600}
.b2-last div{color:var(--ink-3);margin-top:4px}
.b2-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.b2-tile{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:16px 20px;display:flex;flex-direction:column;gap:4px;min-width:0}
.b2-tile .b2-lbl{margin-top:0}
.b2-date{font-size:24px;line-height:32px;font-weight:600}
@media (max-width:900px){.b2-grid{grid-template-columns:1fr}.b2-tiles{grid-template-columns:1fr}}
`;

// ---------- 35 · the screen ----------
const NEXT = { info_requested: ['InfoRequest.dc.html', 'Open reply'], peer_to_peer_requested: ['PeerBrief.dc.html', 'Enter date'], peer_to_peer_booked: ['PeerBrief.dc.html', 'Call notes'], p2p_awaiting: ['PeerBrief.dc.html', 'Call notes'], early_discharge: ['EarlyDischarge.dc.html', 'Plan discharge'] };
const CHOICE_TITLE = (c, up, st, ep) => ({ stretch: `Accept ${up.units}, spread to ${fmtDate(st.until)}`, use_up: `Accept, use them, discharge ${fmtDate(ep.discharge)}`, p2p: `Request ${REQ_TYPE.peer_to_peer}` }[c]);
const ORDER = ['stretch', 'use_up', 'p2p'];

// "Last time with <payer>": requested → offered → counter → awarded, from the payer history
function lastTime(s, r) {
  const c = clientOf(s, r);
  const hs = (s.payer_history || []).filter(h => h.payer === r.payer);
  const h = hs.find(x => x.school === c?.school) || hs[0];
  if (!h) return null;
  const counter = (String(h.sent || '').match(/counter at (\d+)/i) || [])[1];
  const seq = [h.requested, h.offer, counter ? +counter : null, h.award].filter(x => x != null && x !== '');
  return { seq: seq.join(' → '), note: `${h.when}: ${cap(h.lesson)}`, hist: h };
}

register('Partials', class extends Screen {
  init() { this.state = { choice: 'use_up' }; }
  focus() { return pickReq(this.s, this.params.id, ['R-0402'], r => ['partial_decide', 'denied'].includes(r.stage)); }
  renderVals() {
    const s = this.s; const r = this.focus();
    const base = { today: todayLine(s), none: false, isDenial: false, showFacts: false, isOffer: false, isDone: false, title: STATUS.partial_decide, chip: '', chipCls: 'u-chip' };
    if (!r) return { ...base, none: true, title: STATUS.partial_decide, chip: 'None open', chipCls: 'u-chip info' };
    const c = clientOf(s, r); const pf = payerFirst(s, r.payer); const who = M.clientLabel(s, r.client);
    // denial: one line and the guardian letter
    if (['denied', 'appeal_sent'].includes(r.stage)) {
      const left = +((M.requestClock(s, r).text.match(/(-?\d+) days? left/) || [])[1] ?? NaN);
      const sent = r.stage === 'appeal_sent';
      return { ...base, isDenial: true, title: `${pf} denial · ${r.units_requested} units · ${who}`,
        den: { chip: sent ? STATUS.appeal_sent : STATUS.denied, cls: sent ? 'u-chip ok' : 'u-chip late', text: sent ? (r.appeal?.signed_at ? fmtDate(r.appeal.signed_at) : '') : isNaN(left) ? '' : left > 0 ? `appeal window ${left} days` : 'appeal window closed', href: 'AppealLetter.dc.html?id=' + r.id } };
    }
    const up = unitPlan(s, r); const st = stretchPlan(s, r, up);
    const [d0, d1] = (r.dates || '').split(' to ');
    const reqWeeks = d0 && d1 ? Math.round(daysBetween(d0, d1) / 7) : 13;
    const weeks = Math.round(up.units / up.rate / 5);
    const pct = Math.min(100, Math.round(up.units / Math.max(1, r.units_requested) * 100));
    const reasonSeed = (s.partial_reasons || {})[r.id];
    const hist = lastTime(s, r); const p = M.payer(s, r.payer);
    const worked = reasonSeed?.worked || clip([hist ? hist.note : '', p.what_works || ''].filter(Boolean).join('. '));
    const out = { ...base, showFacts: true,
      title: `${pf} ${STATUS.partial_decide.toLowerCase()} · ${r.units_offered || up.units} of ${r.units_requested} · ${who}`,
      units: up.units, weeks, reqWeeks, pct, barCls: pct < 60 ? 'y' : '',
      reason: reasonSeed?.chip || (r.stage === 'partial_decide' ? 'Reason not given' : ''), reasonHelp: raw(helpIcon(worked, 'what worked last time')),
      last: hist ? { pf, seq: hist.seq, note: hist.note } : null };
    if (r.stage === 'partial_decide') {
      const cur = ORDER.includes(this.state.choice) ? this.state.choice : 'use_up';
      const sub = { stretch: perWeekText(st.perWeek), use_up: 'then new initial', p2p: 'call date needed' };
      const pick = k => () => { this.setState({ choice: k }); };
      return { ...out, isOffer: true, chip: r.reply_by ? `Reply by ${fmtDate(r.reply_by)}` : 'Reply due', chipCls: 'u-chip watch',
        opts: ORDER.map(k => ({ id: 'opt-' + k, title: CHOICE_TITLE(k, up, st, up), sub: sub[k], on: cur === k, cls: cur === k ? 'on' : '', tab: cur === k ? 0 : -1, pick: pick(k) })),
        key: e => { const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!d) return; e.preventDefault(); const k = ORDER[(ORDER.indexOf(cur) + d + ORDER.length) % ORDER.length]; this.setState({ choice: k }); setTimeout(() => document.getElementById('opt-' + k)?.focus(), 0); },
        log: () => this.log(r, cur, up, st) };
    }
    // already decided: what was logged, and where it goes next
    const door = r.decision?.door; const nx = NEXT[r.stage];
    return { ...out, isDone: true, chip: STATUS[r.stage] || r.stage, chipCls: 'u-chip ok',
      done: { title: door && CHOICE_TITLE(door, up, st, up) ? CHOICE_TITLE(door, up, st, up) : (STATUS[r.stage] || r.stage), when: r.decision?.at ? 'Logged ' + stamp(s, r.decision.at) : '', href: nx ? nx[0] + '?id=' + r.id : 'Authorizations.dc.html', btn: nx ? nx[1] : 'Authorizations' } };
  }
  async log(r, choice, up, st) {
    if (this._busy || r.stage !== 'partial_decide') return;
    this._busy = true;
    try {
      const plan = choice === 'stretch' ? { until: st.until, per_week: st.perWeek, per_day: st.perDay } : choice === 'use_up' ? { runout: up.runout } : {};
      await this.do('request.partialChoice', { id: r.id, choice, plan, by: this.me?.id });
      toast(choice === 'p2p' ? `Logged · ${REQ_TYPE.peer_to_peer} requested` : `Logged · ${up.units} units`);
      if (choice === 'use_up') this.go('EarlyDischarge.dc.html', { id: r.id });
      if (choice === 'p2p') this.go('PeerBrief.dc.html', { id: r.id });
    } catch { } finally { this._busy = false; }
  }
  get css() { return CSS; }
});
