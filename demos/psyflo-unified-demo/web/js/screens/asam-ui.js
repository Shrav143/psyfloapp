// ASAM pieces for the platform screens (A3): the level cell, the ratings strip, the match-state chip, the reassessment flag, and the data-driven
// "Level of care" section that the Authorization case page and the Patient chart print. Every figure comes from web/js/shared/sel/asam-view.js
// (which derives it from the stored assessments with web/js/shared/asam.js); nothing here is static explainer text. Shared CSS: ASAM_CSS (a screen adds
// it to its `css` getter). Icons carry their definition on hover (ui.hint); the reassessment date carries the rule's source chip like every other date.
import { esc, ui } from '../app.js';
import { fmtDate } from '../shared/dates.js';
import { DIMS, CHECK_LABEL, CHECK_TONE, ratingLabel, kindLabel, levelName, dimOf } from '../shared/sel/asam-view.js';
import { srcHint, lockHint } from './a-fmt.js';

export const ASAM_CSS = `
.a-c-level{min-width:150px}
.d-rs{display:flex;flex-wrap:wrap;gap:3px 4px;margin-top:3px}
.d-dim{display:inline-flex;align-items:center;height:20px;padding:0 6px;border-radius:var(--r-pill);background:var(--teal-tint);color:var(--teal-700);font-size:var(--fs-12);font-weight:600;white-space:nowrap}
.d-dim--lv{background:var(--info-bg);color:var(--info-fg)}
.pt-lv{display:flex;flex-direction:column;gap:5px;align-items:flex-start}
.pt-lv__r{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center}
.pt-auth--solo{margin-top:var(--sp-3)}
.asam-n{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:22px;padding:0 6px;border-radius:var(--r-2);font-size:var(--fs-12);line-height:20px;font-weight:600;font-variant-numeric:tabular-nums;border:1px solid transparent}
.asam-n--na{background:transparent;color:var(--muted-700);border:1px dashed var(--control-500);font-weight:500}
.asam-r0{background:var(--neutral-bg);color:var(--neutral-fg)}
.asam-r1{background:var(--success-bg);color:var(--success-fg)}
.asam-r2{background:var(--warning-bg);color:var(--warning-fg)}
.asam-r3{background:var(--danger-bg);color:var(--danger-fg)}
.asam-r4{background:var(--danger-fg);color:#fff}
.asam-strip{display:inline-flex;align-items:center;gap:3px;flex-wrap:nowrap;white-space:nowrap}
.asam-strip .asam-n+.asam-n:nth-child(4){margin-left:5px}
.asam-lc{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0}
.asam-lc__svc{white-space:nowrap}
.asam-lc__lv{font-size:var(--fs-13);white-space:nowrap}
.asam-lc__c{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.asam-lc__d{display:inline-flex;align-items:center;gap:2px;font-size:var(--fs-12)}
.asam-rc{display:flex;flex-direction:column;align-items:flex-start;gap:5px;min-width:0}
.asam-rc__top{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.asam-sec{display:flex;flex-direction:column;gap:var(--sp-3)}
.asam-sec__h{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.asam-sec__h b{font-size:var(--fs-14)}
.asam-sec p{margin:0}
.asam-tw{overflow-x:auto;max-width:100%}
.asam-tbl{width:100%;border-collapse:collapse;font-size:var(--fs-13)}
.asam-tbl th,.asam-tbl td{padding:8px 10px 8px 0;text-align:left;vertical-align:top;border-top:1px solid var(--line-200)}
.asam-tbl thead th{border-top:0;font-size:var(--fs-12);font-weight:600;color:var(--muted-700);white-space:nowrap}
.asam-tbl tbody th{font-weight:600;min-width:150px}
.asam-tbl tbody th span{display:block;font-weight:400;color:var(--muted-700);font-size:var(--fs-12);line-height:var(--lh-12)}
.asam-tbl .asam-rt{display:flex;flex-direction:column;gap:3px;align-items:flex-start;white-space:nowrap}
.asam-tbl .asam-rt small{color:var(--muted-700);font-size:var(--fs-12)}
.asam-tbl .asam-nt{min-width:200px;max-width:520px;overflow-wrap:anywhere}
.asam-tbl td.asam-dt{white-space:nowrap;color:var(--muted-700)}
.asam-clock{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.asam-plan{border-left:3px solid var(--teal-600);padding:6px 12px;background:var(--paper-50);border-radius:0 var(--r-2) var(--r-2) 0}
.asam-plan b{display:block;font-size:var(--fs-12);color:var(--muted-700);font-weight:600;margin-bottom:2px}
.asam-none{display:flex;flex-direction:column;gap:var(--sp-2);align-items:flex-start}
.asam-hist{display:flex;flex-direction:column;gap:var(--sp-4)}
.asam-hist__i{background:var(--surface-0);border:1px solid var(--line-200);border-radius:var(--r-3);padding:var(--sp-3) var(--sp-4);display:flex;flex-direction:column;gap:var(--sp-2)}
.asam-hist__h{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px}
.asam-hist__h h3{margin:0;font-size:var(--fs-16);line-height:var(--lh-16);font-weight:600}
.asam-hist__m{color:var(--muted-700);font-size:var(--fs-13)}
.asam-sum{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;background:var(--surface-0);border:1px solid var(--line-200);border-radius:var(--r-3);padding:16px 20px}
.asam-sum__c{display:flex;flex-direction:column;gap:6px;min-width:0}
.asam-sum__l{font-size:var(--fs-12);font-weight:600;color:var(--muted-700)}
`;

// ---------------------------------------------------------------------------------------------------------------- small pieces
const RTONE = n => (n == null ? 'na' : Math.max(0, Math.min(4, +n)));
export const ratingPill = (n, d) => {
  const t = d ? `${d.short} ${d.label}: ${n == null ? 'not rated' : `${n} ${ratingLabel(n)}`}` : (n == null ? 'Not rated' : `${n} ${ratingLabel(n)}`);
  return `<span class="asam-n ${n == null ? 'asam-n--na' : 'asam-r' + RTONE(n)}" title="${esc(t)}">${n == null ? '–' : esc(String(n))}</span>`;
};
// the compact D1 to D6 strip: six numbers coloured by rating, each with its dimension on hover; the group has one accessible name
export function strip(ratings) {
  if (!ratings) return '';
  const name = `ASAM ratings: ${DIMS.map((d, i) => `${d.short} ${ratings[i] == null ? 'not rated' : ratings[i] + ' ' + ratingLabel(ratings[i])}`).join(', ')}`;
  return `<span class="asam-strip" role="img" aria-label="${esc(name)}" data-asam-strip>${DIMS.map((d, i) => ratingPill(ratings[i], d)).join('')}</span>`;
}
export function levelChip(rd, o = {}) {
  if (!rd.level) return `<span class="ui-muted">Level not recorded</span>`;
  const src = rd.levelSource === 'assessment' ? 'Level recommended in the assessment (no request on file)' : `Level of care on the request: ${rd.levelName}`;
  return ui.chip(rd.levelTag, { tone: 'outline', size: o.size || 'sm', title: src, className: 'asam-level', attrs: { 'data-asam-level': rd.level } });
}
// the match-state chip: what the ratings say about the level asked for. A role with no ratings sees no state; a missing assessment says so.
export function checkChip(rd, o = {}) {
  if (!rd.has) return ui.chip('Not assessed', { tone: 'neutral', size: 'sm', icon: 'dot', title: rd.dueWhy, attrs: { 'data-asam-state': 'none' } });
  if (!rd.access.ratings || !rd.level || !rd.check) return '';
  const st = rd.check.state;
  if (st === 'none') return ui.chip('Not fully rated', { tone: 'neutral', size: 'sm', icon: 'dot', title: rd.check.headline, attrs: { 'data-asam-state': 'none' } });
  return ui.chip(CHECK_LABEL[st], { tone: CHECK_TONE[st], size: o.size || 'sm', icon: st === 'match' ? 'check' : st === 'over' ? 'alert' : 'info', title: rd.check.headline, attrs: { 'data-asam-state': st } });
}
// the reassessment date as the other lists show a deadline: the flag when due soon or overdue, and the rule's source chip
export function dueFlag(rd, o = {}) {
  const d = rd.due; if (!rd.has || !d.dueDate) return '';
  const flagged = d.state === 'overdue' || d.state === 'soon';
  if (!flagged && !o.always) return '';
  return `<span class="asam-lc__d" data-asam-due="${esc(d.state)}">${ui.dateFlag({ date: d.dueDate, sev: flagged ? d.state : 'ok', why: rd.dueWhy, text: (d.state === 'overdue' ? 'Overdue · ' : 'Reassess ') + fmtDate(d.dueDate) })}${d.rule ? srcHint(d.rule) : ''}</span>`;
}
// icon flags: an incident after the last assessment, a level above or below what the ratings fit (each with its sentence on hover)
export function flagIcons(rd) {
  return rd.flags.filter(f => ['incident', 'over', 'under'].includes(f.key)).map(f => ui.hint(f.icon, f.why, { tone: f.tone === 'danger' ? 'r' : f.tone === 'warning' ? 'y' : 'b', label: `${f.text}. ${f.why}`, cls: `asam-flag asam-flag--${f.key}`, extra: `data-asam-flag="${esc(f.key)}"` })).join('');
}

// ---------------------------------------------------------------------------------------------------------------- list cells
// Authorizations: "IOP day · H0015" with the level beneath, then the state chip and the flags
export function levelCell(rd, o = {}) {
  const lines = [];
  if (o.svc) lines.push(`<span class="asam-lc__svc">${o.svc}</span>`);
  lines.push(`<span class="asam-lc__lv">${rd.level ? `<b>${esc(rd.levelTag)}</b>` : '<span class="ui-muted">Level not recorded</span>'}</span>`);
  const chips = [checkChip(rd), flagIcons(rd), dueFlag(rd)].filter(Boolean).join('');
  if (chips) lines.push(`<span class="asam-lc__c">${chips}</span>`);
  return `<span class="asam-lc" data-asam-cell>${lines.join('')}</span>`;
}
// Dashboard: the level chip and the flags, the D1 to D6 strip (roles that hold the ratings), and the reassessment state
export function rosterCell(rd) {
  const top = [levelChip(rd), checkChip(rd), flagIcons(rd)].filter(Boolean).join('');
  const st = rd.access.ratings && rd.ratings ? strip(rd.ratings) : '';
  const due = dueFlag(rd);
  return `<span class="asam-rc" data-asam-cell><span class="asam-rc__top">${top || '<span class="ui-muted">—</span>'}</span>${st}${due}</span>`;
}

// ---------------------------------------------------------------------------------------------------------------- the data-driven section
const provChip = a => (a && a.provenance === 'seed' ? ui.chip('Illustrative sample', { tone: 'warning', size: 'sm', icon: 'info', title: 'Seeded demo data: not built from this client\'s stored records.' }) : '');
const dl = rows => `<dl class="ui-sdl">${rows.filter(Boolean).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

// the six dimensions of one assessment as a table; `prev` (optional) puts the earlier rating under each one
export function dimsTable(hist, o = {}) {
  const showNote = !!o.text; const prev = o.prevRatings;
  const head = `<tr><th scope="col">Dimension</th><th scope="col">Rating</th>${o.notes === false ? '' : `<th scope="col">${showNote ? 'Clinician\'s note' : 'Note'}</th>`}<th scope="col">Assessed</th></tr>`;
  const rows = hist.dims.map((d, i) => {
    const r = d.rating; const p = prev ? prev[i] : null;
    const was = prev && p != null && r != null ? (p === r ? `<small>no change since ${esc(fmtDate(o.prevDate))}</small>` : `<small>${r < p ? 'Lower risk' : 'Higher risk'} · was ${esc(String(p))} on ${esc(fmtDate(o.prevDate))}</small>`) : '';
    const note = o.notes === false ? '' : `<td class="asam-nt">${showNote ? (d.note ? esc(d.note) : '<span class="ui-muted">No note</span>') : lockHint('The clinician\'s note is clinical text and is hidden for your role.', { label: 'Clinician\'s note hidden for your role' })}</td>`;
    return `<tr data-dim="${d.n}"><th scope="row">${esc(d.short)} <span>${esc(d.label)}</span></th><td><span class="asam-rt">${ratingPill(r, d)}<span>${r == null ? 'Not rated' : esc(ratingLabel(r))}</span>${was}</span></td>${note}<td class="asam-dt">${esc(fmtDate(hist.date))}</td></tr>`;
  }).join('');
  return `<div class="asam-tw"><table class="asam-tbl" data-asam-dims><caption class="ui-sr">ASAM dimension ratings, assessment of ${esc(fmtDate(hist.date, { year: true }))}</caption><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
}

// the reassessment clock: the date, how it is counted, the rule's source chip
export function clockHtml(rd) {
  if (!rd.has) return '<span class="ui-muted">Not assessed: no clock is running</span>';
  const d = rd.due; const flagged = d.state === 'overdue' || d.state === 'soon';
  return `<span class="asam-clock" data-asam-clock="${esc(d.state)}">${ui.dateFlag({ date: d.dueDate, sev: flagged ? d.state : 'ok', why: rd.dueWhy, text: rd.dueText })}<span class="a-sub">last assessed ${esc(fmtDate(rd.date))} · reassess within ${esc(String(d.limit))} days</span>${d.rule ? srcHint(d.rule) : ''}</span>`;
}

// o: { hist (assessmentHistory(...)[0] or null), name (client label), assess: html of the "Open the ASAM assessment in Lauris" control }
export function levelSection(rd, o = {}) {
  const who = o.name || 'this client';
  if (!rd.has) {
    return { sum: 'Not assessed', chip: ui.chip('Not assessed', { tone: 'neutral', size: 'sm', icon: 'dot' }),
      body: `<div class="asam-sec" data-asam-sec="none"><div class="asam-none"><p><b>Not assessed</b></p><p class="a-sub">No ASAM assessment is on file for ${esc(who)}.${rd.level ? ` The request is at ${esc(levelName(rd.level))}; Psyflo cannot compare it with ratings that do not exist.` : ''}</p>${o.assess || ''}</div></div>` };
  }
  const hist = o.hist; const a = rd.a;
  const head = `<div class="asam-sec__h">${checkChip(rd)}${provChip(a)}${flagIcons(rd)}</div>`;
  const meta = dl([
    ['Level on the request', rd.level ? `<b>${esc(rd.levelTag)}</b> <span class="a-sub">${esc(rd.levelName)}</span>` : '<span class="ui-muted">Not recorded on the request</span>'],
    ['Latest assessment', `${esc(kindLabel(rd.kind))} · ${esc(fmtDate(rd.date, { year: true }))}${hist && hist.assessorName ? ' · ' + esc(hist.assessorName) : ''}`],
    rd.recommended ? ['Clinician\'s recommendation', `${esc(levelName(rd.recommended))} <span class="a-sub">stated in the assessment</span>`] : null,
    rd.access.ratings && rd.lowest ? ['Lowest level the ratings fit (suggested)', `${esc(levelName(rd.lowest))} <span class="a-sub">a demo decision rule over D1 to D6; the ratings and the recommendation are the clinician's</span>`] : null,
    ['Reassessment', clockHtml(rd)]
  ]);
  if (!rd.access.ratings) {
    return { sum: `${rd.levelTag || 'Level not recorded'} · ${rd.dueText}`, chip: rd.flagged ? ui.chip(rd.overdue ? 'Reassessment overdue' : rd.soon ? 'Reassessment due' : 'Level of care', { tone: rd.overdue ? 'danger' : 'warning', size: 'sm', icon: rd.overdue ? 'alert' : 'clock' }) : '',
      body: `<div class="asam-sec" data-asam-sec="status">${meta}<p class="ui-lockline">${lockHint('The ratings and the clinician\'s notes are hidden for your role. Your role sees the level and the reassessment date.', { label: 'Ratings hidden for your role' })}<span class="ui-muted">Ratings and notes hidden for your role</span></p></div>` };
  }
  const inc = rd.incident ? `<div class="a-flag" role="status" data-asam-incident>${ui.icon('alert', 14)}<span>${esc(`Incident ${fmtDate(rd.incident.date)}, after the last assessment on ${fmtDate(rd.date)}: a reassessment is indicated.`)}${o.text && rd.incident.what ? ' ' + esc(rd.incident.what) : ''}</span></div>` : '';
  const check = rd.check && rd.check.state !== 'none' ? `<p><b data-asam-headline>${esc(rd.check.headline)}</b></p><p class="a-sub" data-asam-detail>${esc(rd.check.detail)}</p>` : rd.check ? `<p><b data-asam-headline>${esc(rd.check.headline)}</b></p>` : '';
  const table = hist ? dimsTable(hist, { text: !!o.text, prevRatings: rd.prev && rd.prev.dims ? DIMS.map(d => (rd.prev.dims[d.n] || {}).rating).map(x => (x == null ? null : +x)) : null, prevDate: rd.prev ? rd.prev.date : null }) : '';
  const chg = rd.change ? `<p data-asam-change><b>Since ${esc(fmtDate(rd.prev.date))}:</b> ${esc(rd.changeText)}.</p>` : rd.prev ? '' : '<p class="a-sub">This is the first assessment on file: nothing to compare with yet.</p>';
  const plan = o.text && a.plan ? `<div class="asam-plan" data-asam-plan><b>Clinician's plan · ${esc(fmtDate(rd.date))}</b>${esc(a.plan)}</div>` : !o.text && a.plan ? `<p class="ui-lockline">${lockHint('The clinician\'s plan is clinical text and is hidden for your role.', { label: 'Plan hidden for your role' })}<span class="ui-muted">Plan hidden for your role</span></p>` : '';
  return { sum: `${rd.levelTag || 'Level not recorded'} · ${rd.dueText}`, chip: '',
    body: `<div class="asam-sec" data-asam-sec="ratings">${head}${check}${inc}${meta}${table}${chg}${plan}${a.source ? `<p class="a-sub">Source: ${esc(a.source)}</p>` : ''}</div>` };
}

// ---------------------------------------------------------------------------------------------------------------- the Patient chart
export function chartSummary(rd, o = {}) {
  const cell = (l, h) => `<div class="asam-sum__c"><span class="asam-sum__l">${esc(l)}</span><div>${h}</div></div>`;
  return `<div class="asam-sum" data-asam-summary>${cell('Level of care', rd.level ? `<b>${esc(rd.levelTag)}</b>` : '<span class="ui-muted">Level not recorded</span>')}${rd.access.ratings || !rd.has ? cell('What the ratings say', checkChip(rd) || '<span class="ui-muted">—</span>') : ''}${rd.access.ratings && rd.ratings ? cell('Ratings D1 to D6', strip(rd.ratings)) : ''}${cell('Reassessment', rd.has ? clockHtml(rd) : '<span class="ui-muted">Not assessed</span>')}${rd.incident ? cell('Incident since the last assessment', ui.hint('alert', rd.flags.find(f => f.key === 'incident').why, { tone: 'r', text: fmtDate(rd.incident.date), label: rd.flags.find(f => f.key === 'incident').why })) : ''}${o.link ? `<div class="asam-sum__c">${o.link}</div>` : ''}</div>`;
}
export function historyList(history, rd, o = {}) {
  if (!history.length) return `<div class="asam-hist" data-asam-hist>${ui.emptyState({ title: 'Not assessed', body: 'No ASAM assessment is on file for this client.', action: o.action || null })}</div>`;
  return `<div class="asam-hist" data-asam-hist>${history.map((h, i) => {
    const prevH = history[i + 1] || null;
    const ratings = h.ratings ? strip(h.ratings) : '';
    const chg = h.change ? `<p data-asam-change><b>Change since ${esc(fmtDate(h.prevDate))}:</b> ${esc(h.changeText)}.</p>` : (prevH ? '' : '<p class="a-sub">First assessment on file.</p>');
    const table = h.rated && h.ratings ? dimsTable(h, { text: !!o.text, prevRatings: prevH && prevH.ratings ? prevH.ratings : null, prevDate: prevH ? prevH.date : null }) : '';
    const plan = h.plan ? `<div class="asam-plan"><b>Clinician's plan</b>${esc(h.plan)}</div>` : '';
    return `<article class="asam-hist__i" data-asam-assessment="${esc(h.id)}"><div class="asam-hist__h"><h3>${esc(fmtDate(h.date, { year: true }))} · ${esc(h.kindLabel)}</h3>${i === 0 ? ui.chip('Latest', { tone: 'info', size: 'sm' }) : ''}${provChip({ provenance: h.provenance })}${ratings}</div>
      <p class="asam-hist__m">${[h.assessorName ? 'Assessed by ' + esc(h.assessorName) : '', h.recommended ? 'Recommended ' + esc(levelName(h.recommended)) : ''].filter(Boolean).join(' · ')}</p>${table}${chg}${plan}</article>`;
  }).join('')}</div>`;
}
export { dimOf };
