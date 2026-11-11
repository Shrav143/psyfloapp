// Scan & Enhance (E5). Two modes, decided in review/00-unified-recommendations.md section 3.1:
//   Mode A  "Review draft"     the CURRENT open draft: findings (questions, evidence, missing information), approve, reject or edit each, compare,
//                              final review, then fill the open Lauris form with the bridge `fill` command. A person presses Process Form.
//   Mode B  "Evidence review"  PROCESSED history, READ-ONLY. Reads Psyflo's own captured copies (stored notes, saved versions, the seeded corpus):
//                              never Lauris. It builds the evidence index for continued stay (period, counts that open their rows, evidence marks),
//                              finds missing evidence and repeated wording, and flags gaps for FUTURE notes. There is no fill button in this mode,
//                              no addendum and no late entry: the server refuses any write to a processed record.
import { esc } from '../../js/runtime.js';
import { fmtDate } from '../../js/shared/dates.js';
import { evidenceIndex, periodPresets, applyFindings, KIND_LABEL, KIND_ONE, interventionLabel } from '../../js/shared/enhance.js';
import { ladderIndex } from '../lib/review.js';

const LADDER = ['Original', 'PsyFlo draft', 'Clinician edited', 'Approved', 'Synchronized'];
const CAT = { wording: ['Wording', 'warning'], evidence: ['Evidence', 'danger'], missing: ['Missing', 'warning'], units: ['Units', 'info'], boilerplate: ['Repeated', 'neutral'] };

function mode(ctx) {
  const st = ctx.st; const p = ctx.page; const hasForm = p.kind === 'session' && p.form;
  if (st.mode) return st.mode;
  return hasForm && !ctx.S().notes.some(n => n.session && String(n.session) === String(p.form.session)) ? 'A' : 'B';
}
function modeSwitch(ctx, m) {
  return `<div class="trio" style="grid-template-columns:1fr 1fr" role="group" aria-label="Mode"><button class="btn o${m === 'A' ? ' on' : ''}" data-act="setMode" data-m="A" aria-pressed="${m === 'A'}" style="min-height:44px">Review draft</button><button class="btn o${m === 'B' ? ' on' : ''}" data-act="setMode" data-m="B" aria-pressed="${m === 'B'}" style="min-height:44px">Evidence review</button></div>`;
}

// ================================================================== Mode A
const recA = (ctx, c) => { const s = ctx.S(); const me = ctx.me(); const f = ctx.page.form && ctx.page.form.type; return (s.doc_versions || []).filter(d => d.mode === 'current' && d.client === c.id && d.form === f && d.by === me.id && d.date === ctx.M.today(s) && d.input && d.input.kind === 'form').at(-1) || null; };
function htmlA(ctx, c) {
  const { banner } = ctx.parts; const p = ctx.page; const st = ctx.st;
  if (!(p.kind === 'session' && p.form)) return banner('n', 'Open a draft form in Lauris to review it. Mode A reads the form you have open.');
  const processed = ctx.S().notes.some(n => n.session && String(n.session) === String(p.form.session));
  if (processed) return banner('n', `<b>This was processed in Lauris.</b> A processed record is not changed from Psyflo: there is no addendum or late entry. Use Evidence review to read it.`) + `<button class="btn o" data-act="setMode" data-m="B">Open Evidence review</button>`;
  const rec = recA(ctx, c);
  if (!rec) return `<div class="tile t"><h2>Scan the open ${esc(p.form.title || 'form')}</h2><div class="small muted" style="margin:4px 0 8px">Psyflo reads the boxes on this form and lists what to check. It asks; you answer in your own words.</div><button class="btn p blk" data-act="scan">Scan the draft</button></div>`;
  const fs = rec.findings || []; const decided = fs.filter(f => f.state !== 'open').length;
  const cur = st.cur != null && fs[st.cur] ? st.cur : Math.max(0, fs.findIndex(f => f.state === 'open'));
  const filled = rec.stages.some(x => x.stage === 'filled'); const processedRec = rec.lauris_status === 'processed';
  let h = ctx.ui.stepper(LADDER.map(label => ({ label })), { current: ladderIndex(rec), label: 'Version' });
  if (!fs.length) return h + banner('', '<b>No findings.</b> Nothing on this draft needs a question.') + `<button class="btn o" data-act="scan">Scan again</button>`;
  h += ctx.ui.progress({ value: decided, max: fs.length, label: 'Reviewed' });
  const f = fs[cur];
  h += card(ctx, rec, f, cur, fs.length);
  h += ctx.parts.accordion(`All findings · ${fs.length}`, fs.map((x, i) => `<button class="btn o sm blk" style="justify-content:space-between;margin-bottom:6px" data-act="openCard" data-i="${i}"><span>${esc(x.issue)}</span>${ctx.ui.chip(x.state === 'open' ? 'Open' : x.state === 'rejected' ? 'Rejected' : 'Accepted', { tone: x.state === 'open' ? 'warning' : x.state === 'rejected' ? 'danger' : 'success', size: 'sm' })}</button>`).join(''), { id: 'enh-all' });
  const changes = applyFindings(rec.input.fields || [], fs);
  h += `<div class="row w"><button class="btn o" data-act="compare">${st.compare ? 'Hide the comparison' : `Compare · ${changes.length} box${changes.length === 1 ? '' : 'es'} change`}</button></div>`;
  if (st.compare) h += `<div class="sheet"><h2 class="st">Before · After</h2>${changes.length ? changes.map(x => `<div class="box"><div class="l">${esc(x.label)}</div><div class="small muted">Before</div><div class="v">${esc(x.before) || '<span class="muted">empty</span>'}</div><div class="small muted" style="margin-top:4px">After · your words</div><div class="v">${esc(x.after)}</div></div>`).join('') : '<div class="hint">Nothing changes in the form: no finding has an answer yet.</div>'}</div>`;
  if (processedRec) h += banner('', '<b>Processed in Lauris.</b> This record is final.');
  else {
    h += `<button class="btn p blk" data-act="approve" ${decided < fs.length ? 'disabled' : ''}>${filled ? 'Approve and fill again' : 'Approve and fill'}</button>`;
    h += decided < fs.length ? `<div class="hint">${fs.length - decided} still need a decision. There is no accept-all.</div>` : `<div class="hint">${changes.length} box${changes.length === 1 ? '' : 'es'} will be typed (yellow). You press Process Form.</div>`;
  }
  if (filled && !processedRec) h += banner('y', '<b>Typed into the open form · yellow.</b> Check them, then press Process Form in Lauris.');
  return h;
}
function card(ctx, rec, f, i, n) {
  const st = ctx.st; const cat = CAT[f.category] || ['Check', 'neutral']; const ans = st.ans && st.ans[f.id] != null ? st.ans[f.id] : (f.answer || '');
  const rule = f.rule ? ctx.ui.sourceChip({ category: f.rule.verification, source: f.rule.source }, {}) : '';
  const ev = (f.evidence || []).map(e => ctx.ui.evidenceChip({ label: e.label || 'Form', date: e.date ? fmtDate(e.date) : '', quote: e.quote, source: e.ref })).join('');
  return `<div class="fcard open"><div class="row w" style="justify-content:space-between"><span class="lab">Finding ${i + 1} of ${n}</span>${ctx.ui.chip(cat[0], { tone: cat[1], size: 'sm' })}</div>
    <h3 style="margin:6px 0 2px">${esc(f.issue)}</h3>${f.why ? `<div class="hint">${esc(f.why)}</div>` : ''}
    <div class="row w" style="margin:6px 0 2px">${rule}${f.rule ? `<span class="hint">${esc(f.rule.label)}</span>` : ''}</div>
    <div class="row w">${ev || ctx.ui.evidenceChip({ state: 'missing', label: f.box })}</div>
    <div class="lab" style="margin-top:10px">${esc(f.question)}</div>
    ${(f.options || []).length ? `<div class="row w" style="margin:6px 0">${f.options.map((o, k) => `<button class="btn o sm" data-act="pickOpt" data-f="${esc(f.id)}" data-o="${k}">${esc(o.length > 46 ? o.slice(0, 44) + '…' : o)}</button>`).join('')}</div>` : ''}
    <label class="ui-sr" for="ans-${esc(f.id)}">Your answer</label><textarea id="ans-${esc(f.id)}" class="ed" style="min-height:64px" data-in="ans" data-f="${esc(f.id)}" placeholder="Your own words${f.replaces ? ' (replaces the flagged sentence)' : ''}">${esc(ans)}</textarea>
    <div class="row w" style="margin-top:8px"><button class="btn p" data-act="decide" data-f="${esc(f.id)}" data-s="${f.state === 'edited' ? 'edited' : 'accepted'}" style="flex:1">${ans.trim() ? 'Accept my wording' : 'Keep as written'}</button><button class="btn o" data-act="decide" data-f="${esc(f.id)}" data-s="rejected">Reject</button></div>
    <div class="row w" style="margin-top:6px;justify-content:space-between"><button class="btn o sm" data-act="openCard" data-i="${Math.max(0, i - 1)}" ${i === 0 ? 'disabled' : ''}>Previous</button><span class="hint">${f.state === 'open' ? 'Needs a decision' : 'Decided: ' + esc(f.state)}</span><button class="btn o sm" data-act="openCard" data-i="${Math.min(n - 1, i + 1)}" ${i === n - 1 ? 'disabled' : ''}>Next</button></div></div>`;
}

// ================================================================== Mode B
function periodB(ctx, c) {
  const s = ctx.S(); const me = ctx.me(); const st = ctx.st;
  if (st.period) return st.period;
  const saved = (s.evidence_periods || []).find(x => x.client === c.id && x.by === me.id);
  if (saved) return { from: saved.from, to: saved.to, preset: saved.preset };
  const p = periodPresets(s, c, ctx.M.today(s))[0]; return { from: p.from, to: p.to, preset: p.id };
}
function htmlB(ctx, c) {
  const { banner, accordion } = ctx.parts; const s = ctx.S(); const st = ctx.st; const today = ctx.M.today(s);
  if (!ctx.can('notes.view', { clientId: c.id })) return banner('n', 'Evidence review shows clinical note text. Your role does not read it.', { icon: ctx.I.lock });
  const per = periodB(ctx, c); const presets = periodPresets(s, c, today); const idx = evidenceIndex(s, c.id, per);
  const kind = st.kind || ''; const rows = idx.rows.filter(r => !kind || r.kind === kind).slice().reverse();
  const shown = st.more || 8;
  let h = `<div class="row w">${ctx.ui.chip('Read-only', { tone: 'info', icon: 'lock', size: 'sm' })}<span class="hint">Psyflo's copies of processed notes. Never a Lauris scrape.</span></div>
    <div class="row"><label class="lab" for="ev-per">Period</label><select id="ev-per" class="tog" style="flex:1" data-ch="period">${presets.map(p => `<option value="${p.id}"${p.id === per.preset ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>
    <div class="hint">${fmtDate(per.from)} – ${fmtDate(per.to)} · ${idx.period.days} days</div>
    <div class="cnts" role="group" aria-label="Evidence counts">${['daily', 'weekly', 'monthly'].map(k => `<button class="cnt${kind === k ? ' on' : ''}" data-act="kind" data-k="${k}" aria-pressed="${kind === k}"><span class="small muted">${esc(KIND_LABEL[k])}</span><b>${idx.counts[k]}</b></button>`).join('')}</div>
    <div class="hint">${idx.counts.excluded} excluded · ${idx.counts.sensitive} sensitive (counted, never quoted)${kind ? ` · <a href="#" data-act="kind" data-k="">hide the rows</a>` : ''}</div>`;
  const rowHTML = r => {
    const iv = r.interventions.map(i => esc(interventionLabel(s, i))).join(', ');
    const m = r.mark; const tags = (r.excluded ? ctx.ui.chip('Excluded', { tone: 'danger', size: 'sm' }) : '') + (r.sensitive ? ctx.ui.chip('Sensitive', { tone: 'warning', size: 'sm' }) : '') + (!r.hasText ? ctx.ui.chip('No text stored', { tone: 'neutral', size: 'sm' }) : '');
    return `<details class="acc" data-acc="row-${esc(r.ref)}" style="margin-bottom:6px"><summary><span>${fmtDate(r.date)} · ${esc(KIND_ONE[r.kind])}${r.objective ? ' · Goal ' + r.objective : ''}</span><span class="row w" style="gap:4px;margin-left:auto">${tags}</span></summary><div>
      ${r.hasText ? `<div class="v small" style="white-space:pre-wrap">${esc(r.text)}</div>` : ctx.ui.evidenceChip({ state: 'missing', label: `the text of the ${fmtDate(r.date)} note in Lauris` })}
      ${iv ? `<div class="hint" style="margin-top:4px">Interventions: ${iv}</div>` : ''}${r.units != null ? `<div class="hint">${r.units} unit${r.units === 1 ? '' : 's'}${r.direct_min != null ? ' · ' + r.direct_min + ' direct minutes' : ''}</div>` : ''}
      ${r.household ? `<div class="hint">Mentions household context.</div>` : ''}
      ${m ? `<div class="hint" style="margin-top:4px">${m.excluded ? 'Excluded' : m.sensitive ? 'Marked sensitive' : 'Mark removed'} by ${esc(ctx.M.staffShort(s, m.by))}, ${fmtDate(m.at)} ${esc((m.at || '').slice(11, 16))}${m.reason ? ' · ' + esc(m.reason) : ''}</div>` : ''}
      <div class="row w" style="margin-top:6px">${r.excluded ? `<button class="btn o sm" data-act="mark" data-ref="${esc(r.ref)}" data-x="include">Put back</button>` : `<button class="btn o sm" data-act="mark" data-ref="${esc(r.ref)}" data-x="exclude">Exclude</button>`}${r.sensitive ? `<button class="btn o sm" data-act="mark" data-ref="${esc(r.ref)}" data-x="unsens">Not sensitive</button>` : `<button class="btn o sm" data-act="mark" data-ref="${esc(r.ref)}" data-x="sens">Mark sensitive</button>`}</div></div></details>`;
  };
  // the rows open from a count (or "Show all rows"); until then the page leads with what is missing
  if (kind || st.showAll) h += `<div class="lab">${kind ? esc(KIND_LABEL[kind]) : 'All rows'} · ${rows.length}</div>${rows.slice(0, shown).map(rowHTML).join('') || '<div class="hint">No rows in this period.</div>'}${rows.length > shown ? `<button class="btn o sm" data-act="more">Show ${Math.min(8, rows.length - shown)} more</button>` : ''}`;
  else h += `<button class="btn o sm" data-act="showAll">Show all ${idx.counts.total} rows</button>`;
  if (st.excluding) h += `<div class="sheet"><h2 class="st">Leave this row out of the request</h2><label class="lab" for="ex-r" style="display:block;margin-top:6px">Why (kept with your name and the time)</label><input id="ex-r" class="ed" data-in="exReason" value="${esc(st.exReason || '')}" maxlength="160"><div class="row w" style="margin-top:8px"><button class="btn p" data-act="excludeSave" style="flex:1">Exclude</button><button class="btn o" data-act="excludeCancel">Cancel</button></div></div>`;
  // documented interventions with dated observations
  h += accordion(`Interventions documented · ${idx.interventions.length}`, idx.interventions.map(i => `<div class="stamp"><div><b>${i.count}×</b></div><div>${esc(i.label)}<div class="hint">${i.dates.slice(-6).map(d => fmtDate(d)).join(', ')}${i.dates.length > 6 ? ', …' : ''}</div></div></div>`).join('') || '<div class="hint">No interventions named in this period.</div>', { id: 'ev-iv' });
  h += accordion('Goals · notes naming each', `<div class="bars">${idx.byGoal.map(g => `<div><div class="row w small"><b>Goal ${g.n}</b><span class="muted">${g.count} note${g.count === 1 ? '' : 's'}${g.last ? ' · last ' + fmtDate(g.last) : ' · none'}</span></div><div class="b" role="img" aria-label="Goal ${g.n}: ${g.count} notes"><i style="width:${Math.min(100, Math.round(100 * g.count / Math.max(1, idx.counts.daily)))}%"></i></div></div>`).join('')}</div>`, { id: 'ev-goals' });
  h += accordion(`Gaps · ${idx.gaps.length}`, idx.gaps.map(g => `<div class="cr">${g.kind === 'missing' ? ctx.I.warn : ctx.I.open}<div>${esc(g.text)}${g.dates && g.dates.length ? `<div class="hint">${g.dates.slice(0, 8).map(d => (d.length === 7 ? d : fmtDate(d))).join(', ')}${g.dates.length > 8 ? ', …' : ''}</div>` : ''}</div></div>`).join('') || '<div class="hint">No gaps found in this period.</div>', { id: 'ev-gaps', open: true });
  if (idx.boilerplate.length) h += accordion(`Repeated wording · ${idx.boilerplate.length}`, idx.boilerplate.map(b => `<div class="box"><div class="v">“${esc(b.sentence)}”</div><div class="hint">${b.count} notes · ${b.dates.slice(0, 6).map(d => fmtDate(d)).join(', ')}${b.dates.length > 6 ? ', …' : ''}</div></div>`).join('') + '<div class="hint">Shown to the author. Processed notes are not rewritten.</div>', { id: 'ev-boiler' });
  const marked = (s.evidence_marks || []).filter(m => m.client === c.id && (m.excluded || m.sensitive));
  if (marked.length) h += accordion(`Excluded or sensitive · ${marked.length}`, marked.map(m => { const n = s.notes.find(x => x.id === m.ref); return `<div class="stamp"><div>${n ? fmtDate(n.date) : esc(m.ref)}</div><div>${m.excluded ? 'Excluded' : 'Sensitive'} · ${esc(ctx.M.staffShort(s, m.by))}, ${fmtDate(m.at)} ${esc((m.at || '').slice(11, 16))}${m.reason ? '<div class="hint">' + esc(m.reason) + '</div>' : ''}</div></div>`; }).join(''), { id: 'ev-marks' });
  const onCont = ctx.page.kind === 'session' && ctx.page.form && ctx.page.form.type === 'sra-continued';
  h += onCont ? `<button class="btn p blk" data-act="useIt">Use it in the continued-stay request</button>` : (c.authorization ? `<button class="btn o blk" data-act="openCont">Open the continued-stay request</button>` : '');
  return h;
}

// ================================================================== acts
const logReview = async (ctx, c, per) => { try { await ctx.do('enhance.historical', { client: c.id, from: per.from, to: per.to }); } catch (e) { /* read-only review: a logging refusal never blocks reading */ } };
const acts = {
  setMode: async (el, ctx) => { const m = el.dataset.m; ctx.st.mode = m; if (m === 'B') { const c = ctx.client(); if (c && ctx.can('notes.view', { clientId: c.id })) await logReview(ctx, c, periodB(ctx, c)); } ctx.draw(); },
  scan: async (el, ctx) => {
    const c = ctx.client(); const p = ctx.page; const fields = (p.form.fields || []).filter(f => String(f.value || '').trim() !== '').map(f => ({ label: f.label, value: f.value }));
    const r = await ctx.do('enhance.scan', { client: c.id, form: p.form.type, session: p.form.session || null, fields });
    ctx.st.cur = 0; ctx.st.ans = {}; ctx.flash(r.findings ? `${r.findings} finding${r.findings === 1 ? '' : 's'} to review.` : 'No findings on this draft.', r.findings ? 'y' : 'g');
  },
  pickOpt(el, ctx) { const c = ctx.client(); const rec = recA(ctx, c); const f = rec.findings.find(x => x.id === el.dataset.f); const o = f.options[+el.dataset.o]; (ctx.st.ans = ctx.st.ans || {})[f.id] = o; ctx.draw(); },
  decide: async (el, ctx) => {
    const c = ctx.client(); const rec = recA(ctx, c); const id = el.dataset.f; const f = rec.findings.find(x => x.id === id);
    const ans = ctx.st.ans && ctx.st.ans[id] != null ? ctx.st.ans[id] : (f.answer || ''); const state = el.dataset.s;
    await ctx.do('enhance.decide', { key: rec.key, finding: id, state: state === 'accepted' && ans.trim() && ans !== f.answer && f.answer ? 'edited' : state, answer: ans });
    const next = rec.findings.findIndex((x, k) => k > (ctx.st.cur || 0) && x.state === 'open'); ctx.st.cur = next >= 0 ? next : ctx.st.cur;
    ctx.draw();
  },
  openCard(el, ctx) { ctx.st.cur = +el.dataset.i; ctx.draw(); },
  compare(el, ctx) { ctx.st.compare = !ctx.st.compare; ctx.draw(); },
  approve: async (el, ctx) => {
    const c = ctx.client(); const rec = recA(ctx, c); const p = ctx.page;
    await ctx.do('enhance.approve', { key: rec.key });
    const boxes = applyFindings(rec.input.fields || [], rec.findings).map(x => ({ label: x.label, value: x.after }));
    if (!boxes.length) { ctx.flash('Approved. No box changes in the form.', 'g'); return; }
    const r = await ctx.fill(boxes, { form: p.form.type, client: c, sources: [] });
    if (r && !r.error) await ctx.do('enhance.filled', { key: rec.key, labels: r.filled || [] });
  },
  // Mode B
  kind(el, ctx, e) { if (e) e.preventDefault(); ctx.st.kind = el.dataset.k || ''; ctx.st.showAll = false; ctx.st.more = 8; ctx.draw(); },
  more(el, ctx) { ctx.st.more = (ctx.st.more || 8) + 8; ctx.draw(); },
  showAll(el, ctx) { ctx.st.showAll = true; ctx.st.kind = ''; ctx.draw(); },
  mark: async (el, ctx) => {
    const c = ctx.client(); const ref = el.dataset.ref; const x = el.dataset.x;
    if (x === 'exclude') { ctx.st.excluding = ref; ctx.st.exReason = ''; ctx.draw(); return; }
    const args = { client: c.id, ref }; if (x === 'include') args.excluded = false; if (x === 'sens') args.sensitive = true; if (x === 'unsens') args.sensitive = false;
    await ctx.do('evidence.mark', args); ctx.flash(x === 'sens' ? 'Marked sensitive: counted, never quoted.' : x === 'include' ? 'Put back in the evidence.' : 'Mark removed.');
  },
  excludeSave: async (el, ctx) => { const c = ctx.client(); const st = ctx.st; await ctx.do('evidence.mark', { client: c.id, ref: st.excluding, excluded: true, reason: st.exReason || '' }); st.excluding = null; ctx.flash('Left out of the request. It stays in Psyflo with your name and the time.'); },
  excludeCancel(el, ctx) { ctx.st.excluding = null; ctx.draw(); },
  useIt(el, ctx) { ctx.go('authorize'); },
  openCont(el, ctx) { const c = ctx.client(); ctx.nav(`/consumers/${c.lauris_no || c.harvest_no}/session/sra-continued`); }
};
const ins = { ans(el, ctx) { (ctx.st.ans = ctx.st.ans || {})[el.dataset.f] = el.value; }, exReason(el, ctx) { ctx.st.exReason = el.value; } };
const chs = {
  period: async (el, ctx) => {
    const c = ctx.client(); const s = ctx.S(); const pr = periodPresets(s, c, ctx.M.today(s)).find(x => x.id === el.value); if (!pr) return;
    ctx.st.period = { from: pr.from, to: pr.to, preset: pr.id }; ctx.st.more = 8;
    await ctx.do('evidence.period', { client: c.id, from: pr.from, to: pr.to, preset: pr.id }).catch(e => ctx.flash(e.message, 'r'));
    await logReview(ctx, c, ctx.st.period); ctx.draw();
  }
};

function html(ctx) {
  const c = ctx.client(); const { banner } = ctx.parts;
  if (!c) return banner('n', 'Open a student in Lauris to scan a draft or review the evidence.');
  if (!ctx.can('scanEnhance', { clientId: c.id })) return banner('n', 'Scan & Enhance is for licensed clinical staff.', { icon: ctx.I.lock });
  const m = mode(ctx);
  return modeSwitch(ctx, m) + `<div class="row w">${ctx.ui.maturity(m === 'A' ? 'enhance.modeA' : 'enhance.modeB')}</div>` + (m === 'A' ? htmlA(ctx, c) : htmlB(ctx, c));
}

export default {
  id: 'enhance', label: 'Scan & Enhance', cap: 'scanEnhance',
  title: ctx => { const c = ctx.client(); const m = ctx.client() ? mode(ctx) : 'B'; return `${m === 'A' ? 'Review draft' : 'Evidence review'}${c ? ' · ' + c.initials : ''}`; },
  html, acts, ins, chs,
  async onOpen() { }
};
