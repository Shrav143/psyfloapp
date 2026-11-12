// My Work: the HTML for each section. Pure functions of (view model, options) that return strings for raw(); no state of their own.
// Classes carry the owner prefix mw-; the shared kit (ui/*) supplies chips, buttons, tables, progress and empty states.
import { ui } from '../ui/index.js';
import { esc } from '../runtime.js';
import { CHECKS } from '../shared/draft.js';
import { textOf, plainText, plural, sectionLabel, approvalLabel, repeatedParagraphs } from '../shared/sel/mywork.js';
import * as M from '../shared/model.js';

const tone = t => t || 'neutral';
// every source chip carries its date: the day it was verified, or "Not verified" (ui.sourceChip itself only puts the date in its tooltip)
export const asOf = r => r && r.verified_on ? 'Checked ' + M.fmtDate(r.verified_on, { year: true }) : 'Not verified';
export const withDate = r => r ? `${ui.sourceChip(r)}<span class="mw-asof se-asof">${esc(asOf(r))}</span>` : '';
const chips = it => [it.chip ? ui.chip(it.chip.text, { tone: tone(it.chip.tone), size: 'sm' }) : '', it.rule ? withDate(it.rule) : ''].join('');

// One line of work. o.resolve(it) -> { href } | { disabled: 'why' } ; the first row of a list may carry the primary button.
export function rowHtml(it, o = {}) {
  const r = it.doneOnly || it.action || !it.verb ? {} : o.resolve ? o.resolve(it) : { href: it.to };
  const cls = ['ui-btn', it.primary ? 'ui-btn--primary' : 'ui-btn--secondary', 'ui-btn--sm'].join(' ');
  const act = !it.verb ? '' : it.action ? `<button type="button" class="${cls}" data-x="confirm" data-kind="${esc(it.action.kind)}" data-id="${esc(it.action.id)}">${esc(it.verb)}</button>` : it.doneOnly ? `<button type="button" class="${cls}" data-x="done" data-id="${esc(it.reminder)}">${esc(it.verb)}</button>` : r.disabled ? `<button type="button" class="${cls}" disabled aria-disabled="true" title="${esc(r.disabled)}">${esc(it.verb)}</button><span class="mw-row__why">${esc(r.disabled)}</span>`
    : `<a class="${cls}" href="${esc(r.href)}">${esc(it.verb)}</a>`;
  const done = it.reminder && !it.doneOnly ? `<button type="button" class="ui-linkbtn mw-row__done" data-x="done" data-id="${esc(it.reminder)}">Mark done</button>` : '';
  const lead = it.when || it.who || '';
  return `<li class="mw-row${it.urgent ? ' is-urgent' : ''}${it.tone === 'danger' ? ' is-late' : ''}${lead ? '' : ' mw-row--nolead'}">${lead ? `<div class="mw-row__lead">${esc(lead)}</div>` : ''}
    <div class="mw-row__main"><div class="mw-row__t">${esc(it.title)}</div>${it.sub ? `<div class="mw-row__s">${esc(it.sub)}</div>` : ''}</div>
    <div class="mw-row__chips">${chips(it)}</div><div class="mw-row__act">${act}${done}</div></li>`;
}
const list = (items, o) => `<ul class="mw-list" role="list">${items.map((it, i) => rowHtml(i === 0 && o.primaryFirst ? { ...it, primary: true } : it, o)).join('')}</ul>`;
const countChip = (n, t = 'neutral') => ui.chip(String(n), { tone: t, size: 'sm' });
const disclosure = (key, label, n, open, bodyHtml) => `<section class="mw-group"><h2 class="mw-h2"><button type="button" class="mw-disc" data-x="toggle" data-key="${key}" aria-expanded="${open}">${ui.icon(open ? 'chevD' : 'chevR', 16)}<span>${esc(label)}</span>${countChip(n)}</button></h2>${open ? bodyHtml : ''}</section>`;

// ---------------------------------------------------------------------------------------------------------------- To do / Operations / Referrals
export function todoHtml(w, st, o = {}) {
  const role = o.role, all = st.all; const onlyRef = o.only === 'referrals';
  const pick = a => onlyRef ? a.filter(i => i.section === 'referrals') : a;
  const today = pick(w.today), week = pick(w.week), waiting = pick(w.waiting);
  let html = '';
  const cap = 3;
  const shown = all ? today : today.slice(0, cap);
  html += `<section class="mw-group"><h2 class="mw-h2">${esc(onlyRef ? 'Referrals to act on' : role === 'admin' ? 'Needs attention' : 'Today')} ${countChip(today.length, today.some(i => i.urgent) ? 'danger' : 'neutral')}</h2>`;
  html += today.length ? list(shown, { ...o, primaryFirst: true }) + (today.length > cap ? `<div class="mw-more"><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="all" aria-expanded="${all}">${all ? 'Show top 3' : 'Show all ' + today.length}</button></div>` : '')
    : ui.emptyState({ title: onlyRef ? 'No referrals need you' : 'Nothing needs you right now', body: onlyRef ? 'New referrals, family links and eligibility checks appear here.' : 'New replies, drafts and approvals appear here as they arrive.' });
  html += '</section>';
  if (week.length) html += disclosure('week', 'This week', week.length, st.week, list(week, o));
  if (waiting.length) html += disclosure('waiting', 'Waiting on others', waiting.length, st.waiting, list(waiting, o));
  return html;
}

// ---------------------------------------------------------------------------------------------------------------- My day
function dayRows(items, o, extra = {}) {
  // another person's day is read-only: the person writes their own notes, so there is no button to press (rule chips sit on the group heading, once)
  return `<ul class="mw-list" role="list">${items.map(it => rowHtml({ when: '', ...it, rule: undefined, sub: it.text, chip: it.chip ? { text: it.chip, tone: 'info' } : null, ...(o.readonly ? { verb: '' } : {}), ...extra }, o)).join('')}</ul>`;
}
export function dayHtml(v, st, o = {}) {
  if (!v) return ui.emptyState({ tone: 'denied', title: 'No one to show', body: 'There is no staff member in your scope.' });
  const p = v.progress;
  let h = `<div class="mw-prog">${ui.progress({ label: v.self ? 'Daily notes today' : `${v.short}: daily notes today`, value: p.done, max: Math.max(p.total, 1), text: p.text, tone: p.total && p.done === p.total ? 'success' : 'action' })}${p.open.length ? `<div class="mw-prog__s">${esc(p.open.join(', '))} still open</div>` : ''}</div>`;
  const next = v.next; o = { ...o, readonly: !v.self };
  if (next) h += `<section class="mw-next" aria-label="${v.self ? 'Next up' : 'Oldest open'}"><div><span class="mw-next__k">${v.self ? 'Next up' : 'Oldest open'}</span><b>${esc(next.title)}</b><span>${esc(next.text)}</span></div>${v.self ? nextButton(next, o) : ''}</section>`;
  else h += `<p class="mw-none">Nothing is waiting for ${v.self ? 'you' : esc(v.short)}.</p>`;
  if (v.behind.length) h += `<section class="mw-group"><h2 class="mw-h2">Behind ${countChip(v.behind.length, 'danger')}<span class="mw-h2__s">${esc(v.behindHead)}</span></h2>${dayRows(v.behind, o, { tone: 'danger' })}${v.late.length ? `<p class="mw-none">Came in late this month: ${esc(v.late.join(', '))}.</p>` : ''}</section>`;
  const dueShown = st.dueAll ? v.due : v.due.slice(0, 4);
  h += `<section class="mw-group"><h2 class="mw-h2">Due next ${countChip(v.due.length)} ${o.rule24 ? withDate(o.rule24) : ''}</h2>${v.due.length ? dayRows(dueShown, o) + (v.due.length > 4 ? `<div class="mw-more"><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="dueAll">${st.dueAll ? 'Show 4' : 'Show all ' + v.due.length}</button></div>` : '') : '<p class="mw-none">Nothing else is due.</p>'}</section>`;
  if (v.fixes.length) h += `<section class="mw-group"><h2 class="mw-h2">To fix ${countChip(v.fixes.length, 'warning')}</h2>${dayRows(v.fixes, o, { tone: 'danger' })}<p class="mw-none">${ui.datasetChip('harvest_export')} Rejected-form lines come from sample data, not from Lauris.</p></section>`;
  h += `<details class="mw-acc"><summary>This month</summary><dl class="ui-dl">${v.quality.map(([l, x]) => `<div class="ui-dl__r"><dt>${esc(l)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl>${v.hours ? `<p class="mw-none">Daily notes count as on time within ${v.hours} h of the session ${withDate(o.rule24)}</p>` : ''}</details>`;
  if (v.goals.length) h += `<details class="mw-acc"><summary>Goals ${countChip(v.goals.length)}</summary><ul class="mw-goals">${v.goals.map(g => `<li>${ui.progress({ label: g.t, value: g.pct, max: 100, text: g.d })}</li>`).join('')}</ul><p class="mw-none">${ui.datasetChip('harvest_export')}</p></details>`;
  return h;
}
function nextButton(it, o) {
  const r = o.resolve(it);
  return r.disabled ? `<button type="button" class="ui-btn ui-btn--primary" disabled title="${esc(r.disabled)}">${esc(it.verb)}</button>` : `<a class="ui-btn ui-btn--primary" href="${esc(r.href)}">${esc(it.verb)}</a>`;
}

// ---------------------------------------------------------------------------------------------------------------- Team
export function teamHtml(t, o = {}) {
  if (!t) return ui.emptyState({ tone: 'denied', title: 'Needs supervisor, clinician or administrator', body: 'The team view is not part of the direct-support role.' });
  const strip = ui.statStrip([
    { label: 'Notes behind', value: t.behind, tone: t.behind ? 'danger' : undefined },
    { label: 'Waiting for approval', value: t.waiting },
    { label: 'On approval', value: `${t.onApproval} of ${t.rows.length}` },
    { label: 'Students', value: t.students }
  ], { label: 'Team summary' });
  const cols = [
    { key: 'name', label: 'Staff', primary: true, sort: true, render: r => `<b>${esc(r.name)}</b><small class="mw-sub">${esc([r.credential, plural(r.students, 'student')].filter(Boolean).join(' · '))}</small>` },
    { key: 'daily', label: 'Today', render: r => `<span class="ui-num">${esc(r.daily)}</span>` },
    { key: 'onTime', label: 'On time', hideBelow: 1024, render: r => `<span class="ui-num${r.onTimeBad ? ' mw-bad' : ''}">${esc(r.onTime)}</span>` },
    { key: 'behind', label: 'Behind', sort: true, render: r => r.behind ? `${ui.chip(String(r.behind), { tone: 'danger', size: 'sm' })}<small class="mw-sub">${esc(r.behindText)}</small>` : '<span class="mw-muted">None</span>' },
    { key: 'mode', label: 'Notes review', hideBelow: 1280, render: r => `${ui.chip(r.mode, { tone: r.onApproval ? 'warning' : 'neutral', size: 'sm' })}${r.onApproval && r.reviewer ? `<small class="mw-sub">Reviewer ${esc(r.reviewer)}</small>` : ''}` },
    { key: 'pending', label: 'Waiting', hideBelow: 1024, render: r => r.pending ? esc(String(r.pending)) : '<span class="mw-muted">0</span>' },
    ...(o.canApprove ? [{ key: 'act', label: 'Change', render: r => `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="${r.onApproval ? 'apprOff' : 'apprOn'}" data-id="${esc(r.id)}">${r.onApproval ? 'Turn off' : 'Require approval'}</button>` }] : [])
  ];
  const rows = (o.sort && o.sort.key ? ui.sortRows(t.rows, o.sort, { behind: r => r.behind, name: r => r.name }) : t.rows);
  const table = ui.queueTable({ id: 'mw-team', caption: 'Staff in your scope', columns: cols, rows, rowId: r => r.id, href: r => '#/MyWork?section=team&staff=' + r.id, sort: o.sort, onSort: o.onSort, maxHeight: 'none', rowClass: r => r.id === o.selected ? 'is-selected' : '', empty: { title: 'No staff in your scope', body: 'Staff appear here when they are routed to you or work at your sites.' } });
  let h = `<div class="mw-teamhead"><span class="mw-scope">${esc(t.scope.long)} · ${plural(t.rows.length, 'staff member', 'staff')}</span>${strip}</div>${table}`;
  if (!t.canText) h += `<p class="mw-hidden">${ui.icon('lock', 14)}<span>Clinical text hidden for your role. Counts and dates only.</span></p>`;
  else if (t.patterns.length) h += `<details class="mw-acc"><summary>Patterns this month ${countChip(t.patterns.length)}</summary><ul class="mw-patterns">${t.patterns.map(p => `<li><b>${esc(p.who)}</b> ${esc(p.text)}${p.sample ? ' ' + ui.datasetChip('harvest_export') : ''}</li>`).join('')}</ul></details>`;
  h += `<p class="mw-foot">Behind and on-time counts come from notes the extension reported at Process Form, due ${t.hours} h after the session ${o.ruleChip || ''} ${t.source ? ui.datasetChip('harvest_export') + ' Rejected forms and the figures marked (sample).' : ''}</p>`;
  return h;
}

// ---------------------------------------------------------------------------------------------------------------- Review
const STOP = new Set('a an the and or of to in on at for with by he she they his her him was is it that this when after before then as from into'.split(' '));
const stem = w => w.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(ing|ed|es|s)$/, '');
// mark what the enhancer added: seeded notes carry [[...]] marks; live ones are diffed word by word
export function markAdded(enh, wrote) {
  const t = textOf(enh);
  if (/\[\[/.test(t)) return esc(t).replace(/\[\[([\s\S]*?)\]\]/g, '<mark class="mw-add">$1</mark>');
  const have = new Set(textOf(wrote).split(/\s+/).map(stem).filter(Boolean));
  const toks = t.split(/(\s+)/);
  const isNew = w => { const k = stem(w); return k && !have.has(k) && !STOP.has(k); };
  let out = '', run = [];
  const flush = () => { if (!run.length) return; let tail = ''; while (run.length && /^\s+$/.test(run[run.length - 1])) tail = run.pop() + tail; out += `<mark class="mw-add">${esc(run.join(''))}</mark>` + tail; run = []; };
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i];
    if (/^\s+$/.test(w)) { if (run.length) run.push(w); else out += w; continue; }
    if (isNew(w)) run.push(w);
    else if (run.length && STOP.has(stem(w)) && toks[i + 2] && isNew(toks[i + 2])) run.push(w);
    else { flush(); out += esc(w); }
  }
  flush();
  return out;
}
function noteChecks(s, n, repeat) {
  const text = plainText(n.enhanced) || textOf(n.dictation);
  const ivs = (n.interventions || (n.fields && n.fields.interventions) || []).map(c => ((s.interventions || []).find(i => i.code === c) || { name: c }).name).join(' ');
  const goal = CHECKS.objective(text).pass || !!(n.objective || (n.fields && n.fields.objective));
  const iv = CHECKS.interventionsFromList(text + ' ' + ivs, s.interventions || []).pass;
  const time = !!(n.units || n.direct_time_min || (n.contact_time && n.contact_time.length) || (n.fields && n.fields.units)) || /\d+\s?(min|minutes|h)\b/.test(text);
  const obs = CHECKS.noObserved(text).pass;
  const varied = !(repeat && repeat.ids.includes(n.id) && !plainText(n.enhanced));
  const item = (ok, l) => ui.chip(l, { tone: ok ? 'success' : 'danger', icon: ok ? 'check' : 'x', size: 'sm' });
  return [item(goal, 'Goal named'), item(iv, 'Intervention on the ISP list'), item(time, 'Time present'), item(obs, 'No "observed"'), item(varied, 'Differs from the last 30 notes')].join('');
}
// the detail model for one pending note (pure; the caller supplies the state and the actor)
export function reviewModel(s, n, can) {
  if (!n) return null;
  const st = M.staff(s, n.staff);
  const repeat = can.text ? repeatedParagraphs(s, n.staff) : null;
  const obj = n.objective || (n.fields && n.fields.objective) || (plainText(n.enhanced).match(/\b(?:Objective|Goal)\s*(\d)/i) || [])[1];
  const ivNames = (n.interventions || (n.fields && n.fields.interventions) || []).map(code => { const iv = (s.interventions || []).find(i => i.code === code); const nm = iv ? iv.name : code; return /^Movement intervention$/.test(nm) ? 'Movement' : nm; });
  const mins = n.direct_time_min || (n.fields && n.fields.direct_time_min);
  const evs = (s.events || []).filter(e => e.record === n.client && e.who === n.staff && (e.at || '').slice(0, 10) === n.date).map(e => `${M.fmtTime(e.at)} ${e.what}`);
  const enh = !!plainText(n.enhanced);
  return {
    id: n.id, staffLine: [M.staffShort(s, n.staff), st.credential].filter(Boolean).join(' · '),
    heading: `${M.clientLabel(s, n.client, false)} · ${(n.type || 'daily').replace(/_/g, ' ').replace('daily', 'daily note')} · ${M.fmtDate(n.date)}`,
    goal: obj || ivNames.length ? [obj ? 'Goal ' + obj : 'No goal named', [...new Set(ivNames)].join(', ')].filter(Boolean).join(' · ') : 'No goal named',
    time: `${n.units || (n.fields && n.fields.units) || '?'} units` + (mins ? ` · ${Math.floor(mins / 60)} h ${mins % 60} m tracked` : n.processed_at ? ' · processed ' + M.fmtDateTime(n.processed_at) : ''),
    wroteLabel: `${M.staffShort(s, n.staff)} ${/^dict/.test(n.source || '') ? 'said' : 'wrote'}`,
    wrote: textOf(n.dictation), enhanced: enh ? markAdded(n.enhanced, n.dictation) : '', hasEnhanced: enh,
    checks: noteChecks(s, n, repeat), repeat: repeat && repeat.count >= 2 ? repeat : null,
    trail: [`Processed in Lauris ${n.processed_at ? M.fmtDateTime(n.processed_at) : M.fmtDate(n.date)}`, st.review_mode === 'every_note' ? `${approvalLabel(st).toLowerCase()}${st.reviewer ? ' · routed to ' + M.staffShort(s, st.reviewer) : ''}` : 'captured while on approval; now spot check', ...evs].join(' · ')
  };
}
export function reviewHtml(q, cur, st, o = {}) {
  if (!q.allowed) return ui.emptyState({ tone: 'denied', title: 'Needs supervisor or clinician', body: o.role === 'admin' ? 'Clinical text hidden for your role. Administrators see counts and dates, not note text.' : 'Notes are reviewed by a supervisor or a clinician.' });
  const shown = st.allNotes ? q.pending : q.pending.slice(0, 4);
  if (cur && !shown.some(n => n.id === cur.id)) shown.push(q.pending.find(n => n.id === cur.id));
  const item = n => { const e = !!plainText(n.enhanced); const on = cur && n.id === cur.id; return `<li><button type="button" class="mw-nitem${on ? ' is-on' : ''}" data-x="pick" data-id="${esc(n.id)}"${on ? ' aria-current="true"' : ''}><b>${esc(M.clientLabel(o.s, n.client, false))} · ${esc(M.fmtDate(n.date))}</b><span>${esc(M.staffShort(o.s, n.staff))} · ${esc(String(n.units || '?'))} unit${n.units === 1 ? '' : 's'}${n.type && n.type !== 'daily' ? ' · ' + esc(n.type.replace(/_/g, ' ')) : ''}</span>${e ? '' : ui.chip('Not enhanced', { tone: 'neutral', size: 'sm' })}</button></li>`; };
  let h = '';
  if (!q.pending.length) {
    h += ui.emptyState({ title: 'No notes waiting', body: 'Notes from staff who need approval appear here when they press Process Form in Lauris.' });
  } else {
    h += `<div class="mw-split"><nav class="mw-pane mw-pane--list" aria-label="Notes waiting for review"><h2 class="mw-h2">Waiting ${countChip(q.pending.length, 'warning')}</h2><ul class="mw-nlist" role="list">${shown.map(item).join('')}</ul>${!st.allNotes && q.pending.length > shown.length ? `<div class="mw-more"><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="allNotes">Show all ${q.pending.length}</button></div>` : ''}</nav>`;
    if (cur) {
      const c = o.detail;
      h += `<article class="mw-pane mw-detail" aria-label="Note to review"><header><div class="mw-detail__who">${esc(c.staffLine)}</div><h2 class="mw-detail__h">${esc(c.heading)}</h2><div class="mw-detail__chips">${ui.chip(c.goal, { tone: /^No goal/.test(c.goal) ? 'danger' : 'info', size: 'sm' })}${ui.chip(c.time, { tone: 'neutral', size: 'sm' })}</div></header>`;
      if (!o.canText) h += `<p class="mw-hidden">${ui.icon('lock', 14)}<span>Clinical text hidden for your role.</span></p>`;
      else h += `<div class="mw-cmp"><section><h3>${esc(c.wroteLabel)}</h3><p>${c.wrote ? esc(c.wrote) : '<span class="mw-muted">Nothing typed or dictated: the note was written in Lauris directly.</span>'}</p></section><section><h3>Psyflo added ${ui.chip('Marked', { tone: 'success', size: 'sm' })}</h3><p>${c.hasEnhanced ? c.enhanced : '<span class="mw-muted">Not enhanced. Nothing was added; the checks below run on what the staffer wrote.</span>'}</p></section></div><div class="mw-checks" aria-label="Checks">${c.checks}</div>`;
      if (c.repeat) h += `<p class="mw-pattern">${ui.icon('flag', 14)} Same words in ${c.repeat.count} of ${c.repeat.name}'s last ${c.repeat.of} notes (${esc(c.repeat.dates)}).</p>`;
      h += `<p class="mw-trail">${esc(c.trail)}</p><div class="mw-acts"><button type="button" class="ui-btn ui-btn--primary" data-x="approve" id="mw-approve">Approve</button><button type="button" class="ui-btn ui-btn--secondary" data-x="return">Return with a note</button><button type="button" class="ui-btn ui-btn--ghost" data-x="flag">That didn't happen</button>${ui.infoPopover({ label: 'About review', title: 'Who approves', html: '<p>Only staff flagged to need approval (new hires, anyone on review) have their notes held here. A reviewer cannot approve their own note. Nothing is written to Lauris until the staffer presses save.</p>' })}</div></article>`;
    }
    h += '</div>';
  }
  if (q.done.length) h += `<details class="mw-acc"><summary>Decided today ${countChip(q.done.length)}</summary><ul class="mw-done">${q.done.map(n => `<li><b>${esc(M.clientLabel(o.s, n.client, false))} · ${esc(M.fmtDate(n.date))}</b> ${esc(M.staffShort(o.s, n.staff))} ${ui.statusChip(n.review, { kind: 'review' })}${n.review_comment ? ` <span class="mw-muted">"${esc(n.review_comment)}"</span>` : ''}</li>`).join('')}</ul></details>`;
  return h;
}

// ---------------------------------------------------------------------------------------------------------------- shell pieces
export function tabsHtml(role, current, counts, hrefs) {
  return hrefs.map(({ id, href }) => {
    const n = counts[id];
    return `<a class="mw-tab" href="${esc(href)}"${id === current ? ' aria-current="page"' : ''}>${esc(sectionLabel(role, id))}${n ? `<b>${n}<span class="ui-sr"> to look at</span></b>` : ''}</a>`;
  }).join('');
}

// ---------------------------------------------------------------------------------------------------------------- second-person confirmation
// Shared by My Work (the confirmer's list) and Settings (People, Roles). kind: 'designation' | 'role'.
// run(action, args) performs the action and returns a promise; the modal closes when it resolves.
export function confirmAccess({ s, kind, id, me, run, opener }) {
  if (kind === 'workflow') return confirmWorkflow({ s, id, me, run, opener });
  const item = kind === 'role' ? M.byId(s.role_changes, id) : M.byId(s.designations, id);
  if (!item) return null;
  const u = M.byId(s.staff, item.user); const by = M.staffShort(s, item.by);
  const mine = item.by === me;
  const what = kind === 'role' ? `Change ${u ? u.name : item.user} from ${item.from.replace('_', ' ')} to ${item.to.replace('_', ' ')}` : `${item.grant ? 'Grant' : 'Remove'} "${item.cap}" ${item.grant ? 'to' : 'from'} ${u ? u.name : item.user}`;
  const body = `<dl class="ui-dl"><div class="ui-dl__r"><dt>Request</dt><dd>${esc(what)}</dd></div><div class="ui-dl__r"><dt>Proposed by</dt><dd>${esc(by)} · ${esc(M.fmtDateTime(item.at))}</dd></div><div class="ui-dl__r"><dt>Reason</dt><dd>${esc(item.reason)}</dd></div></dl>${mine ? '<p class="mw-err" role="status">A different person must confirm. You proposed this.</p>' : '<p>Confirming writes a row to the audit log with both names.</p>'}`;
  const act = kind === 'role' ? 'settings.roleDecide' : 'settings.designateDecide';
  return ui.modal({
    title: kind === 'role' ? 'Confirm a role change' : 'Confirm access', size: 'sm', returnFocus: opener, body,
    actions: [
      { label: 'Decline', tone: 'secondary', disabled: mine, onClick: async () => { try { await run(act, { id, decision: 'decline' }); } catch { return false; } }, result: 'declined' },
      { label: 'Confirm', tone: 'primary', disabled: mine, onClick: async () => { try { await run(act, { id, decision: 'approve' }); } catch { return false; } }, result: 'approved' }
    ]
  });
}

// a workflow change that holds the "second person" guardrail waits for a different administrator or clinician (R5). The list shows what changed, not a diff.
function confirmWorkflow({ s, id, me, run, opener }) {
  const item = M.byId(s.workflow_confirmations, id); if (!item) return null;
  const mine = item.by === me;
  const body = `<dl class="ui-dl"><div class="ui-dl__r"><dt>Workflow</dt><dd>${esc(item.name)}</dd></div><div class="ui-dl__r"><dt>Change</dt><dd>${esc(item.changes || 'A change')}</dd></div><div class="ui-dl__r"><dt>Proposed by</dt><dd>${esc(M.staffShort(s, item.by))} · ${esc(M.fmtDateTime(item.at))}</dd></div>${item.note ? `<div class="ui-dl__r"><dt>Note</dt><dd>${esc(item.note)}</dd></div>` : ''}</dl>${mine ? '<p class="mw-err" role="status">A different person must confirm. You proposed this.</p>' : '<p>A workflow only decides what the bell shows a person; nothing it does sends, calls or files. Confirming writes a row to the audit log with both names.</p>'}`;
  return ui.modal({
    title: 'Confirm a workflow change', size: 'sm', returnFocus: opener, body,
    actions: [
      { label: 'Decline', tone: 'secondary', disabled: mine, onClick: async () => { try { await run('workflow.confirm', { id, decision: 'decline' }); } catch { return false; } }, result: 'declined' },
      { label: 'Confirm', tone: 'primary', disabled: mine, onClick: async () => { try { await run('workflow.confirm', { id, decision: 'approve' }); } catch { return false; } }, result: 'approved' }
    ]
  });
}
