// Chips: chip, statusChip (the unified status vocabulary), maturity, sourceChip / verification, datasetChip,
// evidenceChip and progress. All return HTML strings; wrap with raw().
import { esc, H, cls, attrs, icon, autoId, setHandlers, hasHandlers, jsonAttr } from './util.js';
import { MATURITY, LEVELS } from '../shared/maturity.js';

// ---------- chip ----------
// chip('Overdue', { tone:'danger', icon:'alert', title:'3 days', size:'sm' })
// tones: neutral · info · success · warning · danger · outline · navy. Meaning is never colour alone: pass an icon or text.
export function chip(text, o = {}) {
  const { tone = 'neutral', icon: ic, title, detail, className, attrs: a, html } = o;
  return `<span${attrs({ class: cls('ui-chip', 'ui-chip--' + tone, o.size === 'sm' && 'ui-chip--sm', className), title, ...a })}>${ic ? icon(ic, 14) : ''}<span class="ui-chip__t">${html != null ? H(html) : esc(text)}</span>${detail ? `<span class="ui-chip__d">${esc(detail)}</span>` : ''}</span>`;
}

// ---------- statusChip: one vocabulary ----------
// Every request.stage value and every dispute status the demo knows, with text, tone, icon and (for stages) the filter group of
// review/04-architecture.md C2. Unknown values fall back to a neutral humanised chip so nothing ever renders blank.
// groups: draft · awaiting · submitted · needs (Needs action) · denial (lives in Denial Intelligence) · active · closed
const S = (text, tone, icon, group) => ({ text, tone, icon, ...(group ? { group } : {}) });
export const STATUS = {
  stage: {
    draft_ready: S('Draft ready', 'neutral', 'pencil', 'draft'),
    ready_for_review: S('Ready for review', 'neutral', 'eye', 'draft'),
    pending_approval: S('Pending clinical approval', 'info', 'user', 'awaiting'),
    pending_clinical_approval: S('Pending clinical approval', 'info', 'user', 'awaiting'),
    awaiting_signature: S('Awaiting signature', 'info', 'pencil', 'awaiting'),
    signed: S('Signed · ready to send', 'info', 'check', 'awaiting'),
    sending: S('Sending', 'info', 'send', 'submitted'),
    portal_open: S('Portal open', 'info', 'external', 'submitted'),
    submitted: S('Submitted', 'info', 'send', 'submitted'),
    overdue: S('Overdue', 'danger', 'alert', 'needs'),
    info_requested: S('Info requested', 'warning', 'clock', 'needs'),
    partial_decide: S('Partial: decide', 'warning', 'split', 'needs'),
    peer_to_peer_requested: S('Peer-to-peer requested', 'warning', 'phone', 'denial'),
    peer_to_peer_booked: S('Peer-to-peer booked', 'info', 'calendar', 'denial'),
    p2p_awaiting: S('Awaiting decision', 'info', 'hourglass', 'denial'),
    denied: S('Denied', 'danger', 'x', 'denial'),
    appeal_sent: S('Appeal sent', 'info', 'send', 'denial'),
    active: S('Active', 'success', 'check', 'active'),
    early_discharge: S('Early discharge planned', 'neutral', 'door', 'active'),
    closed: S('Closed', 'neutral', 'lock', 'closed')
  },
  dispute: {
    new: S('New', 'info', 'dot'), open: S('Open', 'info', 'dot'), decide: S('Decision needed', 'warning', 'split'), drafted: S('Draft ready', 'neutral', 'pencil'),
    'p2p-prep': S('Peer-to-peer prep', 'warning', 'phone'), p2p: S('Peer-to-peer', 'info', 'calendar'), 'recon-prep': S('Reconsideration prep', 'warning', 'file'),
    recon: S('Reconsideration', 'info', 'refresh'), 'evidence-prep': S('Evidence prep', 'warning', 'file'), 'info-req': S('Info requested', 'warning', 'clock'),
    'appeal-prep': S('Appeal prep', 'warning', 'pencil'), appeal: S('Appeal', 'info', 'send'), alt: S('Alternative plan', 'neutral', 'door'),
    upheld: S('Upheld', 'danger', 'x'), sent: S('Sent', 'info', 'send'), accepted: S('Accepted', 'success', 'check'), overturned: S('Overturned', 'success', 'check'),
    partover: S('Partly overturned', 'success', 'check'), resolved: S('Resolved', 'success', 'check'), closed: S('Closed', 'neutral', 'lock')
  },
  review: {
    pending: S('Pending review', 'warning', 'eye'), approved: S('Approved', 'success', 'check'), returned: S('Returned', 'warning', 'undo'), flagged: S('Flagged', 'danger', 'flag')
  },
  clock: {
    ok: S('On track', 'success', 'check'), soon: S('Due soon', 'warning', 'clock'), overdue: S('Overdue', 'danger', 'alert')
  },
  actor: {
    staff: S('Staff', 'neutral', 'user'), psyflo: S('PsyFlo draft', 'info', 'sparkle'), lauris: S('From Lauris', 'neutral', 'file'), payer: S('Payer', 'neutral', 'inbox'),
    family: S('Family', 'neutral', 'users'), system: S('System', 'neutral', 'gear')
  },
  signature: {
    remote: S('Remote allowed', 'info', 'link'), in_person: S('In person required', 'warning', 'user'), pending: S('Pending', 'warning', 'clock'),
    completed: S('Completed', 'success', 'check'), ready: S('Ready to review', 'info', 'eye')
  }
};
const ORDER = ['stage', 'dispute', 'review', 'clock', 'actor', 'signature'];
const human = v => String(v ?? '').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
// resolveStatus('draft_ready') -> { kind:'stage', key:'draft_ready', text, tone, icon, group }
export function resolveStatus(value, kind) {
  const v = String(value ?? '');
  const tries = [v, v.replace(/_/g, '-'), v.replace(/-/g, '_'), v.toLowerCase()];
  for (const k of kind ? [kind] : ORDER) {
    const map = STATUS[k] || {};
    for (const t of tries) if (map[t]) return { kind: k, key: t, ...map[t] };
  }
  return { kind: kind || 'stage', key: v, text: human(v) || 'Unknown', tone: 'neutral', icon: 'dot', unknown: true };
}
// statusChip('info_requested', { detail:'9 h left' }) · statusChip('upheld', { kind:'dispute' })
export function statusChip(value, o = {}) {
  const r = resolveStatus(value, o.kind);
  return chip(o.text || r.text, { tone: r.tone, icon: r.icon, detail: o.detail, title: o.title, className: o.className, attrs: { 'data-status': r.key, 'data-status-kind': r.kind, ...o.attrs } });
}

// ---------- maturity ----------
// maturity('route.Authorizations') -> chip. Working renders too but CSS hides it unless the presenter overlay is on
// (html[data-maturity="all"]); Simulated, Pilot (preview) and Future always show. Unknown ids render nothing.
export function maturity(featureId, o = {}) {
  const m = typeof featureId === 'object' && featureId ? featureId : MATURITY[featureId];
  if (!m) return '';
  const L = LEVELS[m.level]; if (!L) return '';
  const tone = { working: 'success', simulated: 'info', pilot: 'warning', future: 'neutral' }[m.level];
  const tip = `${L.label}: ${m.note || L.tip}`;
  return `<span${attrs({ class: cls('ui-chip', 'ui-chip--outline', 'ui-maturity', 'ui-maturity--' + m.level, 'ui-chip--' + tone + '-line', o.className), title: tip, 'data-maturity-level': m.level, 'data-feature': typeof featureId === 'string' ? featureId : null })}><span class="ui-chip__t">${esc(L.label)}</span></span>`;
}

// ---------- provenance / verification (rule source) ----------
export const VERIFICATION = {
  official: { text: 'Officially verified', full: 'Officially verified', tone: 'success', icon: 'shield' },
  payer: { text: 'Payer-specific', full: 'Payer-specific', tone: 'info', icon: 'file' },
  harvest: { text: 'Harvest-reported', full: 'Harvest-reported', tone: 'warning', icon: 'users' },
  unverified: { text: 'Unverified', full: 'Unverified demo assumption', tone: 'warning', icon: 'alert' }
};
export const verificationKind = v => {
  const k = String((v && typeof v === 'object' ? v.category || v.verification || v.kind : v) || '').toLowerCase();
  if (VERIFICATION[k]) return k;
  if (/official|verified|policy|regulation|dmas/.test(k) && !/un/.test(k)) return 'official';
  if (/payer|documented/.test(k)) return 'payer';
  if (/harvest|observed|reported/.test(k)) return 'harvest';
  return 'unverified';
};
// sourceChip('official', { source:'12VAC30-80-30', verified_on:'2026-11-08' }) or sourceChip(rule(s,'unit_bands'))
export function sourceChip(kindOrRule, o = {}) {
  const k = verificationKind(kindOrRule); const V = VERIFICATION[k];
  const r = typeof kindOrRule === 'object' && kindOrRule ? kindOrRule : {};
  const src = o.source || r.source; const on = o.verified_on || r.verified_on; const note = o.note || r.note;
  const tip = [V.full, src, on && 'checked ' + on, note].filter(Boolean).join(' · ');
  return chip(V.text, { tone: V.tone, icon: V.icon, title: tip, className: 'ui-verify ui-verify--' + k, attrs: { 'aria-label': tip, 'data-verification': k } });
}
export const verification = sourceChip;

// datasets for analytics (docs/BUILD-BRIEF.md rule 7)
export const DATASETS = {
  case_backed: { text: 'Case-backed', tone: 'success', icon: 'check' },
  harvest_export: { text: 'Sample data, illustrative', tone: 'warning', icon: 'info' },
  illustrative: { text: 'Illustrative cohort', tone: 'neutral', icon: 'info' }
};
export const datasetChip = (kind, o = {}) => { const D = DATASETS[kind] || DATASETS.illustrative; return chip(o.text || D.text, { tone: D.tone, icon: D.icon, title: o.title }); };

// ---------- evidenceChip ----------
// evidenceChip({ n:2, label:'Screening call', date:'Oct 16', quote:'…', source:'Screening call, Oct 16', href:'…', state:'sourced' })
// states: sourced · missing ("Evidence missing — verify …") · excluded · sensitive. Click opens a popover (quote, source, Open in Lauris).
export function evidenceChip(o = {}) {
  const state = o.state || (o.missing ? 'missing' : 'sourced');
  const text = state === 'missing' ? `Evidence missing — verify ${o.label || 'this statement'}` : [o.n != null ? o.n : null, o.label, o.date].filter(x => x != null && x !== '').join(' · ');
  const ic = { sourced: 'quote', missing: 'alert', excluded: 'eye', sensitive: 'lock' }[state];
  const tag = { sourced: 'Source', missing: 'Missing', excluded: 'Excluded', sensitive: 'Sensitive' }[state];
  const data = { n: o.n, label: o.label, date: o.date, quote: o.quote, source: o.source, href: o.href, hrefLabel: o.hrefLabel, state, reason: o.reason };
  return `<button type="button" class="ui-evidence ui-evidence--${state}" data-ui-evidence="${jsonAttr(data)}" aria-haspopup="dialog"><span class="ui-sr">${tag}: </span>${icon(ic, 14)}<span class="ui-evidence__t">${esc(text)}</span></button>`;
}

// ---------- progress ----------
// progress({ value:3, max:14, label:'Reviewed', tone:'action' }) -> bar + "3 of 14"; role=progressbar with a name.
export function progress(o = {}) {
  const max = o.max ?? 100; const v = Math.max(0, Math.min(max, o.value ?? 0)); const pct = max ? Math.round((v / max) * 100) : 0;
  const text = o.text ?? (o.max != null ? `${v} of ${max}` : `${pct}%`);
  return `<div class="ui-progress ui-progress--${o.tone || 'action'}${o.size === 'lg' ? ' ui-progress--lg' : ''}"><div class="ui-progress__row">${o.label ? `<span class="ui-progress__l">${esc(o.label)}</span>` : ''}<span class="ui-progress__n ui-num">${esc(text)}</span></div><div class="ui-progress__track" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${v}" aria-valuetext="${esc(text)}" aria-label="${esc(o.label || 'Progress')}"><i style="width:${pct}%"></i></div></div>`;
}
