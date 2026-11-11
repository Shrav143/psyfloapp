// Documents (E5): the other Lauris pages the panel works with.
//   Quarterly report   goal progress COUNTED from stored notes (never a constant); the guardian's family version goes to the parent portal;
//                      the internal quarterly stays in Psyflo, staff only, and never goes into Lauris, the parent portal or a request
//   Discharge summary  built from the early-discharge plan and stored notes; the guardian-notified box is left for the person
//   Assessments        answers the phone collected, typed into the open Surveys page
//   Saved / rejected lists and the payer portal pages
import { esc } from '../../js/runtime.js';
import { fmtDate, fmtTime } from '../../js/shared/dates.js';
import { draftSeeded } from '../../js/shared/draft.js';
import { recFor, reviewBlock } from '../lib/review.js';
import { itemsFromDraft, staffInputs } from '../lib/items.js';

const FORMS = { quarterly: 'Quarterly report', discharge: 'Discharge summary' };
function draftFor(ctx, c, form) {
  const s = ctx.S();
  return draftSeeded(form, { client: c, notes: s.notes.filter(n => n.client === c.id), samples: [], today: ctx.M.today(s), range: 'whole', plan: s.plans.find(p => p.client === c.id) });
}
const refsOf = (ctx, c) => { const n = ctx.S().notes.filter(x => x.client === c.id); const by = t => n.filter(x => x.type === t).map(x => x.id); return { notes: by('daily'), weekly: by('weekly_guardian'), monthly: by('monthly_collateral') }; };

// ---- internal quarterly (staff only)
const IQ = [['concerns', 'Concerns not yet evidenced', 'Something you have noticed but cannot document yet'], ['home', 'Family / home context', 'What is going on at home that affects the work'], ['plan', 'Plan for next quarter', 'What the team will do differently'], ['supervisor', 'Anything the supervisor should know', '']];
const iqPeriod = (ctx, c) => { const a = c.authorization; return a && a.start && a.end ? `${fmtDate(a.start)} – ${fmtDate(a.end)}` : `Quarter to ${fmtDate(ctx.M.today(ctx.S()))}`; };
const iqSaved = (ctx, c) => (ctx.S().internal_quarterlies || []).filter(x => x.client === c.id && x.period === iqPeriod(ctx, c)).at(-1);
function iqHTML(ctx, c) {
  const st = ctx.st; const saved = iqSaved(ctx, c);
  if (!st.iq || st.iqFor !== c.id) { st.iq = { ...(saved ? saved.fields : { concerns: '', home: '', plan: '', supervisor: '' }) }; st.iqFor = c.id; st.iqDirty = false; }
  return `<div class="tile" style="border:2px dashed var(--danger-fg);background:#FBF7F5"><div class="row"><span class="ic" style="background:var(--danger-bg)">${ctx.I.no}</span><div style="flex:1"><h2>Internal quarterly · staff only</h2><div class="small" style="color:var(--danger-fg)"><b>Never sent to the guardian, the school or the insurer.</b> Not typed into any Lauris box.</div></div></div>
    <div class="small muted" style="margin-top:6px">${esc(c.initials)} · ${esc(iqPeriod(ctx, c))}</div>
    ${IQ.map(([k, l, ph]) => `<label class="lab" style="display:block;margin-top:8px" for="iq-${k}">${esc(l)}</label><textarea id="iq-${k}" class="ed" style="min-height:58px" data-in="iqEdit" data-k="${k}" placeholder="${esc(ph)}">${esc(st.iq[k] || '')}</textarea>`).join('')}
    <div class="row w" style="margin-top:10px">${saved && !st.iqDirty ? `<span class="chip g">Saved · staff only · ${fmtDate(saved.at)} ${esc(fmtTime(saved.at))}</span><span style="flex:1"></span>` : '<span style="flex:1"></span>'}<button class="btn ${saved && !st.iqDirty ? 'o' : 'p'}" data-act="iqSave">${saved ? (st.iqDirty ? 'Save changes · staff only' : 'Save again') : 'Save · staff only'}</button></div></div>`;
}
function familySignHTML(ctx, c) {
  const t = (ctx.S().portal_tasks || []).filter(x => x.client === c.id && x.form === 'Quarterly report').at(-1); const g = c.guardian?.name || 'the guardian';
  const head = `<div class="lab">Family version · guardian signs on the parent portal</div>`;
  if (t && t.status === 'signed') return head + ctx.parts.banner('', `<b>Signed by ${esc(g)}</b> on the parent portal.`);
  if (t) return head + ctx.parts.banner('y', `<b>Sent to the parent portal</b> · ${fmtDate(t.at)} · waiting for ${esc(g)} to sign.`);
  return head + `<button class="btn o blk" data-act="qsig">Send the family version for the guardian's signature</button>`;
}

function formHTML(ctx, c, form) {
  const { banner, accordion, checksBlock } = ctx.parts; const st = ctx.st;
  const d = draftFor(ctx, c, form); const rec = recFor(ctx, c, form); ctx.pg.lastChecks = d.checks;
  let h = `<div class="row w"><h2 class="st" style="flex:1">${esc(FORMS[form])} · ${esc(c.initials)}</h2>${d.computed ? ctx.ui.chip('Counted from stored notes', { tone: 'success', size: 'sm', icon: 'check' }) : ''}</div>`;
  if (!rec) h += `<button class="btn p blk" data-act="docDraft" data-form="${form}">Review ${d.boxes.length} statements</button>`;
  else h += reviewBlock(ctx, rec, { title: FORMS[form] + ' · ' + c.initials, st, client: c, sources: d.sources });
  h += accordion(`Left for you · ${d.blank.length}`, d.blank.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v muted">${esc(b.why)}</div></div>`).join(''), { id: form + '-blank' });
  h += checksBlock(d.checks);
  if (form === 'quarterly') h += familySignHTML(ctx, c) + accordion('Internal quarterly · staff only', iqHTML(ctx, c), { id: 'iq', count: iqSaved(ctx, c) ? 'saved' : '' });
  if (form === 'discharge') { const eq = ctx.S().requests.find(r => r.client === c.id && r.early_discharge) || ctx.S().requests.find(r => r.client === c.id && ['active', 'early_discharge', 'partial_decide'].includes(r.stage)); if (eq) h += `<button class="btn o blk" data-act="openApp" data-href="#/Authorization?id=${esc(eq.id)}&section=transition">Open the early-discharge plan in Psyflo ↗</button>`; }
  return h;
}

// ---- assessments typed into the open Surveys page
function surveysHTML(ctx, c) {
  const { banner } = ctx.parts; if (!c) return banner('n', 'Open a student in Lauris.');
  const a = ctx.M.waitingAssessments(ctx.S(), c.id); const p = ctx.page;
  if (!a.length) return banner('n', 'No assessment answers are waiting in Psyflo for this student.');
  return banner('y', `<b>${a.length} assessment${a.length === 1 ? '' : 's'} waiting</b> (${a.map(x => esc(x.instrument)).join(', ')}). Open Surveys and Psyflo types the answers in.`)
    + (p.form && p.form.instrument === a[0].instrument ? `<button class="btn p blk" data-act="dropSurvey">Type the ${esc(a[0].instrument)} answers</button>` : `<button class="btn o blk" data-act="nav" data-href="/consumers/${esc(p.consumer.no)}/surveys?instrument=${encodeURIComponent(a[0].instrument)}">Open Surveys</button>`);
}
function portalHTML(ctx) {
  const { banner } = ctx.parts; const p = ctx.page;
  if (p.kind === 'portal-confirmation') { const r = ctx.event?.result?.request; return banner('', `<b>Confirmation ${esc(p.portal.ref)} read from this page.</b> ${r ? 'Logged on ' + esc(r) + ' · decision clock started.' : 'No open send was waiting for it.'}`) + (r ? `<button class="btn o blk" data-act="openApp" data-href="#/Authorization?id=${esc(r)}&section=submission">See it in Psyflo ↗</button>` : ''); }
  return banner('n', 'You are in your own portal session. Attach the packet Psyflo prepared and press Submit; Psyflo reads the confirmation number from the next page.');
}

function html(ctx) {
  const { banner } = ctx.parts; const p = ctx.page; const c = ctx.client();
  if (p.kind === 'portal-form' || p.kind === 'portal-confirmation') return portalHTML(ctx);
  if (p.kind === 'saved') return banner('n', 'Forms you saved but did not process. Open one and Psyflo picks up where the draft left off.');
  if (p.kind === 'rejected') return banner('n', 'Reviewer notes are in the table. Open the form, fix it, and process it again; Psyflo re-runs its checks when you open it.');
  if (p.kind === 'surveys') return surveysHTML(ctx, c);
  const f = p.form && p.form.type;
  if (!c) return banner('n', 'Open a student in Lauris.');
  if (!ctx.can('drafts.clinical')) return banner('n', `${esc(FORMS[f] || 'This document')} drafts are for clinicians.`, { icon: ctx.I.lock });
  if (FORMS[f]) return formHTML(ctx, c, f);
  return banner('n', 'Psyflo has no draft for this page.');
}

const acts = {
  docDraft: async (el, ctx) => {
    const c = ctx.client(); const form = el.dataset.form; const d = draftFor(ctx, c, form);
    const items = itemsFromDraft(ctx, d, c, { staff: staffInputs(ctx, d), refs: refsOf(ctx, c) });
    await ctx.do('scribe.draft', { client: c.id, form, input: { kind: 'form', text: '' }, items, session: ctx.page.form.session || null });
  },
  qsig: async (el, ctx) => { el.disabled = true; await ctx.do('portalTask.create', { client: ctx.client().id, form: 'Quarterly report', why: 'Guardian signature' }); ctx.flash("Family version sent to the parent portal for the guardian's signature · pending until the guardian signs."); },
  iqSave: async (el, ctx) => { const c = ctx.client(); const st = ctx.st; await ctx.do('quarterly.internalSave', { client: c.id, period: iqPeriod(ctx, c), fields: st.iq || {} }); st.iqDirty = false; ctx.flash('Internal quarterly saved in Psyflo · staff only · not sent anywhere.'); },
  dropSurvey: async (el, ctx) => {
    const c = ctx.client(); const a = ctx.M.waitingAssessments(ctx.S(), c.id)[0]; const inst = ctx.page.form && ctx.page.form.instrument;
    if (a.instrument !== inst) { ctx.nav(`/consumers/${ctx.page.consumer.no}/surveys?instrument=${encodeURIComponent(a.instrument)}`); return; }
    const vals = Object.values(a.answers || {});
    await ctx.fill(vals.map((v, i) => ({ label: `${a.instrument} item ${i + 1}`, value: String(v) })), { form: 'survey', client: c, sources: [{ n: 1, label: 'Asked on the phone' }] });
    await ctx.do('assessment.used', { id: a.id });
    ctx.flash('Answers typed. Press Save Survey: Lauris scores it.');
  }
};
const ins = { iqEdit(el, ctx) { const st = ctx.st; st.iq = st.iq || {}; st.iq[el.dataset.k] = el.value; if (!st.iqDirty) { st.iqDirty = true; ctx.draw(); } } };

export default {
  id: 'docs', label: 'Documents', cap: 'ext.use',
  title: ctx => { const p = ctx.page; const f = p.form && p.form.type; const c = ctx.client(); return (FORMS[f] || (p.kind === 'surveys' ? 'Assessments' : p.kind === 'saved' ? 'Saved Session' : p.kind === 'rejected' ? 'Rejected Forms' : p.kind && p.kind.startsWith('portal') ? 'Portal upload' : 'Documents')) + (c && FORMS[f] ? ' · ' + c.initials : ''); },
  html, acts, ins
};
