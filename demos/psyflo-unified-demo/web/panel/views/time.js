// Track Time (E7): the panel view of the ONE time model (web/js/shared/time.js, actions time.*), the same entries the phone shows.
// Shows the student the open Lauris page is for (matched by Harvest # and initials, never initials alone), the timer, the stopped intervals to describe,
// today's entries (confirm, correct with a reason, discard, link to the daily note) and FOUR SEPARATE FIGURES: recorded, direct service, in the note,
// potentially billable units. A running timer is none of them. Units come only from the rules table (source chip beside the number).
// The timer reads the demo clock (store.clock), not the machine's. Nothing here presses Process Form; the only thing typed into Lauris is a Time Tracker
// entry the person asked for, in yellow, on the open Time Tracker page.
import { today as clockToday, nowFull } from '../../js/shared/clock.js';
import { clock12 } from '../../js/shared/dates.js';
import { timeSummary, timerOf, entriesOf, identityCard, fmtMin, fmtElapsed, range12, FIGURES, kindOptions, kindLabel, needsCheck, unitRuleOf, stalenessLabel, isHHMM, checkTimes, unitBands, maxUnitsPerDay } from '../../js/shared/time.js';

const STYLE = `<style>
.t7-figs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.t7-fig{border:1px solid var(--line-200);border-radius:var(--r-3);padding:8px 10px;background:var(--surface-0);display:flex;flex-direction:column;gap:2px;min-width:0}
.t7-fig span.l{font-size:var(--fs-12);font-weight:600;color:var(--muted-700)}
.t7-fig b{font-size:var(--fs-18);line-height:1.2;font-variant-numeric:tabular-nums}
.t7-time{font-size:30px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}
.t7-ent{border-top:1px solid var(--line-200);padding:8px 0;display:flex;flex-direction:column;gap:4px;font-size:var(--fs-13)}
.t7-ent:first-child{border-top:0}
.t7-ent .tt{display:flex;gap:8px;align-items:baseline}.t7-ent .tt b{flex:1;min-width:0}
.t7-f label{display:block;font-size:var(--fs-12);font-weight:600;color:var(--muted-700);margin:6px 0 2px}
.t7-f select,.t7-f input,.t7-f textarea{width:100%;min-height:40px;border:1px solid var(--control-500);border-radius:var(--r-2);padding:0 10px;font:inherit;font-size:var(--fs-13);background:#fff}
.t7-f textarea{padding:8px 10px;min-height:64px}
.t7-g{display:grid;grid-template-columns:1fr 1fr;gap:8px}
</style>`;

const stateOf = ctx => ctx.st;
const me = ctx => ctx.me();
const draftOf = (ctx, id, e) => { const st = stateOf(ctx); st.desc = st.desc || {}; return st.desc[id] || (st.desc[id] = { what: e.what || '', kind: e.kind || 'direct', goal: e.goal || '' }); };
const pageNo = ctx => (ctx.page && ctx.page.consumer && ctx.page.consumer.no) ? Number(ctx.page.consumer.no) : null;
const chipRow = (ctx, e) => [
  !e.confirmed ? ctx.ui.chip('To confirm', { tone: 'warning', size: 'sm', title: 'Not counted as direct time until a person confirms it.' }) : '',
  needsCheck(e) ? ctx.ui.chip('Check', { tone: 'neutral', size: 'sm', title: 'Idle or waiting time, transport, documentation and classroom monitoring without treatment are not reimbursable (Officially verified). If this was one of those, correct it.' }) : '',
  e.kind && e.kind !== 'direct' ? ctx.ui.chip(kindLabel(null, e.kind), { tone: 'neutral', size: 'sm' }) : '',
  e.dpn && e.dpn.note ? ctx.ui.chip('In the note', { tone: 'success', size: 'sm', title: 'A processed daily note lists this time. It is final.' }) : e.dpn ? ctx.ui.chip('Linked to the note', { tone: 'info', size: 'sm', title: 'Counts as documented only after the note is processed in Lauris.' }) : '',
  e.source === 'manual' ? ctx.ui.chip('Added by hand', { tone: 'neutral', size: 'sm', title: e.reason || '' }) : '',
  e.corrected_from ? ctx.ui.chip('Corrected', { tone: 'neutral', size: 'sm', title: `Replaces ${e.corrected_from}. ${e.reason || ''}` }) : '',
  ''
].filter(Boolean).join(' ');

function figures(ctx, sum, running) {
  const s = ctx.S(); const unitR = unitRuleOf(s);
  const doc = sum.documented.source === 'note' ? (sum.documented.minutes != null ? fmtMin(sum.documented.minutes) : 'In the note') : sum.linkedCount ? `${fmtMin(sum.linkedMinutes)} linked` : 'Not yet';
  const docSub = sum.documented.source === 'note' ? ctx.ui.chip('Processed in Lauris', { tone: 'success', size: 'sm' }) : sum.linkedCount ? ctx.ui.chip('Note not processed yet', { tone: 'info', size: 'sm' }) : '';
  const bands = unitBands(s, 'tdt').map(([m, u]) => `${m >= 60 ? (m / 60) + ' h' : m + ' min'} = ${u} unit${u === 1 ? '' : 's'}`).join(' · ');
  return `<div class="t7-figs" role="group" aria-label="Four separate figures for today">
    <div class="t7-fig" title="${ctx.esc(FIGURES[0].hint)}"><span class="l">${FIGURES[0].label}</span><b>${ctx.esc(fmtMin(sum.recorded))}${running ? ' + running' : ''}</b><span class="hint">Everything timed, not a unit count</span></div>
    <div class="t7-fig" title="${ctx.esc(FIGURES[1].hint)}"><span class="l">${FIGURES[1].label}</span><b>${ctx.esc(fmtMin(sum.direct))}</b><span class="hint">Confirmed time with the student</span></div>
    <div class="t7-fig" title="${ctx.esc(FIGURES[2].hint)}"><span class="l">${FIGURES[2].label}</span><b>${ctx.esc(doc)}</b>${docSub}</div>
    <div class="t7-fig" title="${ctx.esc(FIGURES[3].hint)}"><span class="l">${FIGURES[3].label}</span><b>${sum.units} ${sum.units === 1 ? 'unit' : 'units'}</b>${ctx.ui.sourceChip(unitR)}</div></div>
    <div class="hint">Rounded down: ${ctx.esc(bands)} (most ${maxUnitsPerDay(s)} a day). Billable only after the note is processed and an authorization covers it.</div>`;
}

function timerCard(ctx, t, c, me) {
  const s = ctx.S();
  if (!t) {
    const no = pageNo(ctx);
    return `<div class="tile"><div style="font-weight:600;font-size:15px">No timer running</div>
      <div class="small muted">${c ? `Start when you are with ${ctx.esc(c.initials)}. The time is recorded; it is not billable until you describe, confirm and document it.` : 'Open a student in Lauris to start.'}</div>
      <div class="t7-f"><label for="t7-act">What are you doing? (optional)</label><input id="t7-act" data-in="act" value="${ctx.esc(stateOf(ctx).act || '')}" placeholder="In your own words"></div>
      <div class="row" style="margin-top:10px"><button class="btn p" data-act="start" ${c && no ? '' : 'disabled'}>${c ? 'Start with ' + ctx.esc(c.initials) : 'Start'}</button></div></div>`;
  }
  const tc = (s.clients || []).find(x => x.id === t.client) || { initials: t.client };
  const card = identityCard(s, t.client);
  if (t.stale) {
    return `<div class="tile" style="border-color:var(--warning-fg)"><div style="font-weight:600">${ctx.esc(stalenessLabel(s, t))}</div>
      <div class="small muted">${ctx.esc(tc.initials)} · Harvest # ${ctx.esc(card && card.harvest_no || '')}. Say when it really ended. Nothing is guessed.</div>
      <div class="t7-f"><label for="t7-end">End time (24 h, like 14:30)</label><input id="t7-end" data-in="endStale" inputmode="numeric" placeholder="14:30" value="${ctx.esc(stateOf(ctx).end || '')}"></div>
      <div class="row" style="margin-top:8px"><button class="btn p" data-act="stopStale">Stop and record</button></div></div>`;
  }
  const other = c && c.id !== t.client;
  return `<div class="tile t"><div class="row w"><span class="rec ${t.paused ? '' : 'on'}" aria-hidden="true"></span><b>${t.paused ? 'Paused' : 'Timing'} ${ctx.esc(tc.initials)}</b><span class="small muted">Harvest # ${ctx.esc(card && card.harvest_no || '')} · since ${ctx.esc(clock12(t.start))}</span></div>
    <div class="t7-time" style="margin-top:6px"><span id="t7-elapsed">${fmtElapsed(t.elapsedSec)}</span></div>
    <div class="t7-f"><label for="t7-act2">Activity</label><input id="t7-act2" data-ch="actSet" value="${ctx.esc(t.what || '')}" placeholder="What are you doing? (optional)"></div>
    <div class="small muted" style="margin-top:6px">Recorded time only. A running timer is not billable.</div>
    <div class="row w" style="margin-top:10px">${t.paused ? '<button class="btn p" data-act="resume">Resume</button>' : '<button class="btn o" data-act="pause">Pause</button>'}<button class="btn r" data-act="stop">Stop</button>${other ? `<button class="btn o" data-act="switchTo">Switch to ${ctx.esc(c.initials)}</button>` : ''}</div>
    ${other ? `<div class="small muted" style="margin-top:6px">The open Lauris page is ${ctx.esc(c.initials)}; the timer is with ${ctx.esc(tc.initials)}.</div>` : ''}</div>`;
}

function draftsCards(ctx, mine) {
  const s = ctx.S();
  return mine.map(e => {
    const c = (s.clients || []).find(x => x.id === e.client) || { initials: e.client, goals: [] }; const d = draftOf(ctx, e.id, e);
    const goals = c.goals || [];
    return `<div class="tile" style="border-color:var(--warning-fg)"><div class="row w"><b style="flex:1">Stopped · ${ctx.esc(c.initials)} ${ctx.esc(range12(e.start, e.end))}</b><span class="small muted">${ctx.esc(fmtMin(e.minutes))} recorded</span></div>
      <div class="small muted">Recorded, not counted yet. Say what you did in your own words to save it.</div>
      <div class="t7-f"><label for="t7-w-${e.id}">What did you do?</label><input id="t7-w-${e.id}" data-in="descWhat" data-id="${e.id}" value="${ctx.esc(d.what)}" placeholder="In your own words">
      <div class="t7-g"><div><label for="t7-k-${e.id}">Counts as</label><select id="t7-k-${e.id}" data-ch="descKind" data-id="${e.id}">${kindOptions(s).map(k => `<option value="${ctx.esc(k.key)}"${k.key === d.kind ? ' selected' : ''}>${ctx.esc(k.label)}</option>`).join('')}</select></div>
      <div><label for="t7-o-${e.id}">ISP objective</label><select id="t7-o-${e.id}" data-ch="descGoal" data-id="${e.id}"><option value="">Not stated</option>${goals.map(g => `<option value="${g.n}"${String(d.goal) === String(g.n) ? ' selected' : ''}>Objective ${g.n}</option>`).join('')}</select></div></div></div>
      <div class="row w" style="margin-top:8px"><button class="btn p" data-act="saveDraft" data-id="${e.id}">Save time</button><button class="btn o" data-act="discardDraft" data-id="${e.id}">Discard</button></div></div>`;
  }).join('');
}

function entryRow(ctx, e, onTimeTracker) {
  const st = stateOf(ctx); const final = !!(e.dpn && e.dpn.note);
  let h = `<div class="t7-ent"><div class="tt"><b>${ctx.esc(range12(e.start, e.end))}</b><span class="small muted">${ctx.esc(fmtMin(e.minutes))}</span></div><div>${ctx.esc(e.what || 'Not described')}</div><div class="row w" style="gap:4px">${chipRow(ctx, e)}</div>`;
  if (st.editing === e.id) {
    const f = st.edit || {};
    h += `<div class="t7-f" role="group" aria-label="Correct this time"><div class="t7-g"><div><label for="t7-es">Start (24 h)</label><input id="t7-es" data-in="editStart" value="${ctx.esc(f.start ?? e.start)}"></div><div><label for="t7-ee">End (24 h)</label><input id="t7-ee" data-in="editEnd" value="${ctx.esc(f.end ?? e.end)}"></div></div>
      <label for="t7-ew">What you did</label><input id="t7-ew" data-in="editWhat" value="${ctx.esc(f.what ?? e.what)}">
      <label for="t7-er">Why is it being corrected? (kept in the record)</label><input id="t7-er" data-in="editWhy" value="${ctx.esc(f.reason || '')}"></div>
      <div class="row w"><button class="btn p sm" data-act="saveEdit" data-id="${e.id}">Save correction</button><button class="btn o sm" data-act="cancelEdit">Cancel</button></div><div class="hint">The earlier version stays in the record.</div>`;
  } else if (st.discarding === e.id) {
    h += `<div class="t7-f"><label for="t7-dw">Why is this being discarded? (kept in the record)</label><input id="t7-dw" data-in="discardWhy" value="${ctx.esc(st.why || '')}"></div><div class="row w"><button class="btn r sm" data-act="doDiscard" data-id="${e.id}">Discard</button><button class="btn o sm" data-act="cancelDiscard">Cancel</button></div>`;
  } else if (!final) {
    h += `<div class="row w">${!e.confirmed ? `<button class="btn p sm" data-act="confirm" data-id="${e.id}">Confirm</button>` : ''}<button class="btn o sm" data-act="edit" data-id="${e.id}">Correct</button>${e.confirmed && !e.dpn ? `<button class="btn o sm" data-act="link" data-id="${e.id}">Link to note</button>` : ''}${e.dpn ? `<button class="btn o sm" data-act="unlink" data-id="${e.id}">Unlink</button>` : ''}<button class="btn o sm" data-act="askDiscard" data-id="${e.id}">Discard</button>${onTimeTracker ? `<button class="btn o sm" data-act="typeTime" data-id="${e.id}">Type into Time Tracker</button>` : ''}</div>`;
  }
  return h + '</div>';
}

export default {
  id: 'time',
  label: 'Track Time',
  cap: 'trackTime',
  title: ctx => 'Track Time' + (ctx.client() ? ' · ' + ctx.client().initials : ''),
  html(ctx) {
    const s = ctx.S(); const m = me(ctx); const c = ctx.client(); const today = clockToday(s);
    const t = m && m.id ? timerOf(s, m.id, nowFull(s)) : null;
    const mineDrafts = (s.time_entries || []).filter(e => e.staff === m.id && e.status === 'draft');
    let body = STYLE + timerCard(ctx, t, c, m) + draftsCards(ctx, mineDrafts);
    if (!c) {
      body += `<div class="banner n">${ctx.I.open}<div>Open a student in Lauris to see today's time for them. Matched by Harvest #, never by initials alone.</div></div>`;
      return body;
    }
    const sum = timeSummary(s, c.id, today, m.role === 'direct_support' ? { staff: m.id } : {});
    const running = !!(t && !t.stale && t.client === c.id);
    body += `<div><div class="lab" style="margin-bottom:6px">Today with ${ctx.esc(c.initials)}</div>${figures(ctx, sum, running)}</div>`;
    for (const f of sum.flags) body += `<div class="banner ${f.tone === 'danger' ? 'r' : f.tone === 'warning' ? 'y' : 'n'}">${f.tone === 'danger' ? ctx.I.no : f.tone === 'warning' ? ctx.I.warn : ctx.I.open}<div>${ctx.esc(f.text)}</div></div>`;
    const saved = sum.entries.filter(e => e.status === 'saved');
    const onTT = !!(ctx.page && ctx.page.path === '/time');
    const st = stateOf(ctx);
    const sample = saved.some(e => e.illustrative) ? ' ' + ctx.ui.chip('Illustrative sample', { tone: 'warning', size: 'sm', title: 'Seeded demo time, not recorded by a person in this session.' }) : '';
    body += ctx.parts.accordion("Today's entries", (sample ? `<div style="padding:2px 0 6px">${sample}</div>` : '') + (saved.length ? saved.map(e => entryRow(ctx, e, onTT)).join('') : '<div class="small muted">Nothing saved yet today.</div>'), { id: 'time-entries', count: String(saved.length), open: !!(st.editing || st.discarding) });
    // documentation: link the confirmed direct entries to today's daily note; "In the note" turns on only when the note is seen processed
    const linkable = saved.filter(e => e.confirmed && (e.kind || 'direct') === 'direct' && !e.dpn);
    const no = pageNo(ctx);
    body += `<div class="tile"><div style="font-weight:600">Connection to the daily note</div>
      <div class="small muted">${sum.documented.source === 'note' ? `The note for today is processed in Lauris${sum.documented.minutes != null ? ' and states ' + ctx.esc(fmtMin(sum.documented.minutes)) : ''}. Its time is final.` : sum.linkedCount ? `${sum.linkedCount} entr${sum.linkedCount === 1 ? 'y is' : 'ies are'} linked. They count as documented only after you press Process Form on the note in Lauris.` : 'Link the confirmed entries, then open the daily note. The note shows the contact time; you check it and press Process Form.'}</div>
      <div class="row w" style="margin-top:8px">${linkable.length && sum.documented.source !== 'note' ? `<button class="btn o" data-act="linkAll">Link ${linkable.length} confirmed</button>` : ''}<button class="btn o" data-act="openNote" ${no ? '' : 'disabled'}>Open today's Daily Progress Note</button></div></div>`;
    // added by hand
    const f = stateOf(ctx).add || {};
    body += ctx.parts.accordion('Add time you did not time', `<div class="t7-f"><div class="t7-g"><div><label for="t7-as">Start (24 h)</label><input id="t7-as" data-in="addStart" value="${ctx.esc(f.start || '')}" placeholder="13:10"></div><div><label for="t7-ae">End (24 h)</label><input id="t7-ae" data-in="addEnd" value="${ctx.esc(f.end || '')}" placeholder="13:40"></div></div>
      <label for="t7-aw">What you did</label><input id="t7-aw" data-in="addWhat" value="${ctx.esc(f.what || '')}">
      <label for="t7-ar">Why was it not timed? (shown as added by hand)</label><input id="t7-ar" data-in="addWhy" value="${ctx.esc(f.reason || '')}"></div>
      <div class="row" style="margin-top:8px"><button class="btn o" data-act="addTime">Add time</button></div><div class="hint">Times are on the demo clock, today. No future times.</div>`, { id: 'time-add' });
    return body;
  },
  // one line above the footer in every other view: the running timer
  mini(ctx) {
    const s = ctx.S(); const m = me(ctx); if (!m || !m.id) return '';
    const t = timerOf(s, m.id, nowFull(s)); if (!t) return '';
    const tc = (s.clients || []).find(x => x.id === t.client) || { initials: t.client };
    const txt = t.stale ? stalenessLabel(s, t) : `${t.paused ? 'Paused' : 'Timing'} ${tc.initials} · ${fmtMin(Math.floor((t.elapsedSec || 0) / 60))}`;
    return `<div class="row w"><span class="rec ${t.paused || t.stale ? '' : 'on'}" aria-hidden="true"></span><span style="flex:1;min-width:0">${ctx.esc(txt)}</span><button class="btn o sm" data-act="goView" data-view="time">Track Time</button></div>`;
  },
  after(root, ctx) {
    clearInterval(this._tick);
    const m = me(ctx); const s = ctx.S();
    const t = m && m.id && s ? timerOf(s, m.id, nowFull(s)) : null;
    if (t && !t.stale && !t.paused) this._tick = setInterval(() => {
      const el = document.getElementById('t7-elapsed'); const x = timerOf(ctx.S(), me(ctx).id, nowFull(ctx.S()));
      if (!el || !x || x.stale) return clearInterval(this._tick);
      el.textContent = fmtElapsed(x.elapsedSec);
    }, 1000);
  },
  leave() { clearInterval(this._tick); },
  acts: {
    async start(el, ctx) {
      const c = ctx.client(); const no = pageNo(ctx); if (!c || !no) return ctx.flash('Open a student in Lauris first', 'y');
      await ctx.do('time.start', { client: c.id, harvest_no: no, what: stateOf(ctx).act }); stateOf(ctx).act = ''; ctx.flash(`Timer started with ${c.initials} · recorded time, not billable`);
    },
    async switchTo(el, ctx) { const c = ctx.client(); const no = pageNo(ctx); if (!c || !no) return; await ctx.do('time.start', { client: c.id, harvest_no: no, switch: true }); ctx.flash(`Switched to ${c.initials}. The earlier timer is a stopped interval to describe.`, 'y'); },
    async pause(el, ctx) { await ctx.do('time.pause', {}); ctx.flash('Paused'); },
    async resume(el, ctx) { await ctx.do('time.resume', {}); ctx.flash('Resumed'); },
    async stop(el, ctx) { const r = await ctx.do('time.stop', {}); ctx.flash(`Stopped · ${fmtMin(r.minutes)} recorded. Say what you did to save it.`, 'y'); },
    async stopStale(el, ctx) {
      const end = (stateOf(ctx).end || '').trim(); if (!isHHMM(end)) return ctx.flash('Enter the time it really ended, like 14:30', 'y');
      const r = await ctx.do('time.stop', { end }); stateOf(ctx).end = ''; ctx.flash(`Recorded ${fmtMin(r.minutes)}. Say what you did to save it.`, 'y');
    },
    async saveDraft(el, ctx) {
      const id = el.dataset.id; const e = (ctx.S().time_entries || []).find(x => x.id === id); const d = draftOf(ctx, id, e || {});
      if (String(d.what || '').trim().length < 3) return ctx.flash('Say what you did (a few words)', 'y');
      await ctx.do('time.save', { id, what: d.what, kind: d.kind, goal: d.goal === '' ? undefined : d.goal }); delete stateOf(ctx).desc[id]; ctx.flash('Saved · confirmed as time with the student');
    },
    async discardDraft(el, ctx) { await ctx.do('time.discard', { id: el.dataset.id }); delete (stateOf(ctx).desc || {})[el.dataset.id]; ctx.flash('Discarded · it was not saved'); },
    async confirm(el, ctx) { await ctx.do('time.save', { id: el.dataset.id, confirm: true }); ctx.flash('Confirmed as direct service'); },
    askDiscard(el, ctx) { const st = stateOf(ctx); st.discarding = el.dataset.id; st.why = ''; st.editing = null; ctx.draw(); },
    cancelDiscard(el, ctx) { stateOf(ctx).discarding = null; ctx.draw(); },
    async doDiscard(el, ctx) { const st = stateOf(ctx); if (String(st.why || '').trim().length < 4) return ctx.flash('Say why (a few words)', 'y'); await ctx.do('time.discard', { id: el.dataset.id, reason: st.why }); st.discarding = null; ctx.flash('Discarded · kept in the record'); },
    edit(el, ctx) { const st = stateOf(ctx); st.editing = el.dataset.id; st.edit = {}; st.discarding = null; ctx.draw(); },
    cancelEdit(el, ctx) { stateOf(ctx).editing = null; ctx.draw(); },
    async saveEdit(el, ctx) {
      const st = stateOf(ctx); const f = st.edit || {}; const e = (ctx.S().time_entries || []).find(x => x.id === el.dataset.id); if (!e) return;
      const start = f.start ?? e.start, end = f.end ?? e.end; const bad = checkTimes(ctx.S(), { date: e.date, start, end }, nowFull(ctx.S()));
      if (bad) return ctx.flash(bad, 'y');
      if (String(f.reason || '').trim().length < 4) return ctx.flash('Say why it is being corrected (a few words)', 'y');
      await ctx.do('time.correct', { id: e.id, start, end, what: f.what ?? e.what, reason: f.reason }); st.editing = null; ctx.flash('Corrected · the earlier version stays in the record');
    },
    async link(el, ctx) { await ctx.do('time.link', { ids: [el.dataset.id] }); ctx.flash('Linked to the daily note · counts as documented once the note is processed'); },
    async unlink(el, ctx) { await ctx.do('time.link', { ids: [el.dataset.id], unlink: true }); ctx.flash('Unlinked'); },
    async linkAll(el, ctx) {
      const c = ctx.client(); const s = ctx.S(); const m = me(ctx);
      const ids = entriesOf(s, { client: c.id, date: clockToday(s), staff: m.role === 'direct_support' ? m.id : undefined }).filter(e => e.status === 'saved' && e.confirmed && (e.kind || 'direct') === 'direct' && !e.dpn).map(e => e.id);
      if (!ids.length) return; const r = await ctx.do('time.link', { ids }); ctx.flash(`${r.n} linked to the daily note · you press Process Form in Lauris`);
    },
    openNote(el, ctx) { const no = pageNo(ctx); if (no) ctx.nav(`/consumers/${no}/session/dpn`); },
    async addTime(el, ctx) {
      const c = ctx.client(); const no = pageNo(ctx); const f = stateOf(ctx).add || {}; if (!c || !no) return;
      const bad = checkTimes(ctx.S(), { date: clockToday(ctx.S()), start: f.start, end: f.end }, nowFull(ctx.S())); if (bad) return ctx.flash(bad, 'y');
      if (String(f.what || '').trim().length < 3) return ctx.flash('Say what you did (a few words)', 'y');
      if (String(f.reason || '').trim().length < 4) return ctx.flash('Say why it was not timed (a few words)', 'y');
      await ctx.do('time.add', { client: c.id, harvest_no: no, start: f.start, end: f.end, what: f.what, reason: f.reason }); stateOf(ctx).add = {}; ctx.flash('Added by hand · shown as added by hand');
    },
    // type one saved entry into the Lauris Time Tracker form that is open (yellow); the person presses Save Time Entry
    async typeTime(el, ctx) {
      const e = (ctx.S().time_entries || []).find(x => x.id === el.dataset.id); const c = ctx.client(); if (!e || !c) return;
      await ctx.fill([{ label: 'Start', value: e.start }, { label: 'End', value: e.end }, { label: 'Minutes', value: String(e.minutes) }, { label: 'Activity', value: e.what }], { form: 'time', client: c, sources: [{ n: 1, label: 'Track Time entry ' + e.id }] });
    }
  },
  ins: {
    endStale(el, ctx) { stateOf(ctx).end = el.value; },
    act(el, ctx) { stateOf(ctx).act = el.value; },
    descWhat(el, ctx) { const e = (ctx.S().time_entries || []).find(x => x.id === el.dataset.id) || {}; draftOf(ctx, el.dataset.id, e).what = el.value; },
    editStart(el, ctx) { (stateOf(ctx).edit = stateOf(ctx).edit || {}).start = el.value; }, editEnd(el, ctx) { (stateOf(ctx).edit = stateOf(ctx).edit || {}).end = el.value; },
    editWhat(el, ctx) { (stateOf(ctx).edit = stateOf(ctx).edit || {}).what = el.value; }, editWhy(el, ctx) { (stateOf(ctx).edit = stateOf(ctx).edit || {}).reason = el.value; },
    discardWhy(el, ctx) { stateOf(ctx).why = el.value; },
    addStart(el, ctx) { (stateOf(ctx).add = stateOf(ctx).add || {}).start = el.value; }, addEnd(el, ctx) { (stateOf(ctx).add = stateOf(ctx).add || {}).end = el.value; },
    addWhat(el, ctx) { (stateOf(ctx).add = stateOf(ctx).add || {}).what = el.value; }, addWhy(el, ctx) { (stateOf(ctx).add = stateOf(ctx).add || {}).reason = el.value; }
  },
  chs: {
    async actSet(el, ctx) { await ctx.do('time.activity', { what: el.value }); ctx.flash('Activity noted'); },
    descKind(el, ctx) { const e = (ctx.S().time_entries || []).find(x => x.id === el.dataset.id) || {}; draftOf(ctx, el.dataset.id, e).kind = el.value; },
    descGoal(el, ctx) { const e = (ctx.S().time_entries || []).find(x => x.id === el.dataset.id) || {}; draftOf(ctx, el.dataset.id, e).goal = el.value; }
  }
};
