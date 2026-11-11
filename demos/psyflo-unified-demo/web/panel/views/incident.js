// Incident report (E5). Under "More" in Scribe, with a banner on home while a state-portal clock runs. Psyflo fills only what the person said and
// what it knows (location, who is signed in); the time, level, actions, CPS and injury are left for the person. Level 2 and 3 incidents go to the
// state portal within the configured hours (a Harvest-reported rule); the person opens the portal and files it.
import { esc } from '../../js/runtime.js';
import { fmtDate, fmtTime } from '../../js/shared/dates.js';
import { draftSeeded } from '../../js/shared/draft.js';
import { rule } from '../../js/shared/rules.js';
import { tidySentence } from '../../js/shared/enhance.js';
import { recFor, reviewBlock } from '../lib/review.js';

const KEY = c => `incident:said:${c.id}`;
const guide = text => ({ items: [
  { key: 'what', title: 'What happened', done: text.trim().length > 25, ask: 'What happened, in order?' },
  { key: 'where', title: 'Where', done: /\b(recess|lunch|hallway|classroom|gym|cafeteria|bus|playground|home|library|bathroom|office|outside|field)\b/i.test(text), ask: 'Where did it happen?' },
  { key: 'who', title: 'Who was involved or present', done: /\b(peer|student|teacher|staff|counselor|aide|principal|nurse|classmate|grandmother|parent|guardian|boy|girl|kid)\b/i.test(text), ask: 'Who was involved or present?' },
  { key: 'did', title: 'What you did', done: /\b(separated|walked|called|notified|moved|stayed|spoke|talked|escorted|redirected|calmed|reported|informed|removed|held|blocked)\b/i.test(text), ask: 'What did you do?' }
] });
function guideHTML(ctx, g) {
  const open = g.items.filter(i => !i.done); const done = g.items.filter(i => i.done);
  const row = i => `<div class="cr${i.done ? ' done' : ''}">${i.done ? ctx.I.ok : ctx.I.warn}<div>${i.done ? `<b>${esc(i.title)}</b>` : `<b class="ask">${esc(i.ask)}</b>`}</div></div>`;
  return `<div class="lab">Still to answer · ${open.length}</div>${open.map(row).join('') || '<div class="hint">Everything asked has an answer.</div>'}${done.length ? `<details class="acc"><summary>${done.length} answered</summary><div>${done.map(row).join('')}</div></details>` : ''}`;
}
function clockHTML(ctx, c) {
  const s = ctx.S(); const inc = (s.incidents || []).find(i => i.client === c.id && i.state_portal_due && !i.state_portal_filed && i.status !== 'complete');
  if (!inc) return '';
  const left = Math.round((Date.parse(inc.state_portal_due) - Date.parse(ctx.M.now(s))) / 60000);
  const r = rule(s, 'incident.state_portal_hours');
  return ctx.parts.banner('r', `<b>State portal clock · Level ${inc.level}</b> · due ${esc(fmtDate(inc.state_portal_due))} ${esc(fmtTime(inc.state_portal_due))} ${left > 0 ? `(${Math.floor(left / 60)} h ${left % 60} min left)` : '(past due)'} ${ctx.ui.sourceChip(r)}`)
    + (ctx.can('notes.review') || ctx.can('drafts.clinical') ? `<button class="btn p blk" data-act="portal">Open the state portal</button>` : '');
}
function html(ctx) {
  const { banner, SAMPLE_CHIP } = ctx.parts; const c = ctx.client(); const s = ctx.S(); const st = ctx.st;
  if (!c) return banner('n', 'Open a student in Lauris to write an incident report.');
  if (ctx.role() === 'direct_support' && c.staff && c.staff !== ctx.me().id) return banner('n', `${esc(c.initials)} is not on your caseload. Psyflo shows direct support their own students only.`);
  const rec = recFor(ctx, c, 'incident'); const txt = ctx.ui.draft.get(KEY(c), '');
  let h = banner('y', `Your supervisor reviews every incident. Level 2 and 3 go to the state portal within ${rule(s, 'incident.state_portal_hours').value} hours. The time, level, actions, CPS and injury are yours.`) + clockHTML(ctx, c);
  if (rec && !st.again) {
    h += `<div class="tile"><div class="lab row" style="gap:6px">${ctx.I.mic}Said here<button class="btn o sm" style="margin-left:auto" data-act="again">Say it again</button></div><div style="font-size:13px;margin-top:4px;font-style:italic">“${esc(rec.input.text)}”</div></div>`;
    h += reviewBlock(ctx, rec, { title: 'Incident · ' + c.initials, st, client: c, sources: [] });
    h += ctx.parts.accordion('Left for you · 5', ['Date/time', 'Level', 'Actions taken', 'CPS report', 'Injury'].map(l => `<div class="box"><div class="l">${l}</div><div class="v muted">Left for you</div></div>`).join(''), { id: 'inc-left' });
    return h;
  }
  h += `<div class="tile t"><h2>What happened with ${esc(c.initials)}</h2><div class="small muted" style="margin:2px 0 8px">Where it happened and what you did. Psyflo puts your words in the report.</div>
    <label class="ui-sr" for="inc-ta">What happened</label><textarea class="ed" id="inc-ta" data-in="said" data-ui-draft="${esc(KEY(c))}" placeholder="e.g. at recess he pushed a peer; no one was hurt; I separated them and walked him inside">${esc(txt)}</textarea>
    <div class="row w" style="margin-top:8px"><button class="btn p" style="flex:1" data-act="draft">Draft it</button>${c.id === 'DW' ? '<button class="btn o" data-act="sample">Use the sample</button>' : ''}</div></div>`;
  h += `<div id="sg">${guideHTML(ctx, guide(txt))}</div>`;
  if (c.id === 'DW') h += `<div class="row w">${SAMPLE_CHIP()}<span class="hint">The sample is seeded text for the worked example.</span></div>`;
  return h;
}
const acts = {
  again(el, ctx, e) { if (e) e.preventDefault(); ctx.st.again = true; ctx.draw(); },
  draft: async (el, ctx) => {
    const c = ctx.client(); const s = ctx.S(); const text = ctx.ui.draft.get(KEY(c), '').trim(); if (!text) return ctx.flash('Say or type what happened first.', 'y');
    const me = ctx.me(); const sch = ctx.M.school(s, c.school); const items = [];
    if (sch.name) items.push({ id: 'location', label: 'Location', staff: '', psyflo: sch.name, sources: [{ n: 1, kind: 'client', label: 'Student record' }] });
    items.push({ id: 'staff', label: 'Staff present', staff: '', psyflo: ctx.M.staffShort(s, me.id), sources: [{ n: 2, kind: 'self', label: 'Signed in as' }] });
    items.push({ id: 'what', label: 'What happened', staff: text, psyflo: tidySentence(text), sources: [{ n: 3, kind: 'input', label: 'What you said', quote: text }] });
    ctx.st.again = false;
    await ctx.do('scribe.draft', { client: c.id, form: 'incident', input: { kind: 'typed', text }, items, session: ctx.page.form && ctx.page.form.session || null });
  },
  sample: async (el, ctx) => {
    const c = ctx.client(); const s = ctx.S(); const d = draftSeeded('incident', { client: c, notes: [], today: ctx.M.today(s) });
    await ctx.fill(d.boxes, { form: 'incident', client: c, sources: d.sources });
  },
  portal: async (el, ctx) => {
    const c = ctx.client(); const s = ctx.S(); const idx = s.incidents.findIndex(i => i.client === c.id && i.state_portal_due && !i.state_portal_filed);
    const what = (ctx.page.form && ctx.page.form.fields.find(f => f.label === 'What happened') || {}).value || '';
    window.open(`${ctx.api.config.extURL}/state-portal/incident?client=${encodeURIComponent(c.initials)}&level=${encodeURIComponent('Level ' + (s.incidents[idx] ? s.incidents[idx].level : 2))}&what=${encodeURIComponent(what)}`, '_blank', 'noopener');
    if (idx >= 0) await ctx.do('incident.filePortal', { index: idx });
    ctx.flash('State portal opened in a new tab · the time you pressed it is logged on Compliance.');
  }
};
const ins = {
  said(el, ctx) { const c = ctx.client(); ctx.ui.draft.set(KEY(c), el.value); clearTimeout(ctx.st.gt); ctx.st.gt = setTimeout(() => { const b = document.getElementById('sg'); if (b) b.innerHTML = guideHTML(ctx, guide(el.value)); }, 150); }
};
export default { id: 'incident', label: 'Incident report', cap: 'notes.own', title: ctx => 'Incident report' + (ctx.client() ? ' · ' + ctx.client().initials : ''), html, acts, ins };
