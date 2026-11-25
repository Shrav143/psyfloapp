// Denial packet (R6): clinics draft payer replies in the EHR, so the same suggestions and the same packet as Denial Intelligence sit beside the
// Lauris "Payer Reply · appeal or information request" form (a mock form: Process Form files it in the Active File; there is no signature path).
//   Suggested by Psyflo   the denial recommendations (scope 'denial', shared/recs.js denialRecs): Include, Dismiss, add your words, add your own.
//                         They are recorded on the server at once, so the platform shows the same state; Apply selected puts them in the packet.
//   Packet                the reply draft (dispute.genDoc, built only from stored records). The section "Added from recommendations" is highlighted.
//   Type into Lauris      types the packet into the open Payer Reply form (yellow; panel.filled records it). A box whose text still holds an
//                         "Evidence missing" placeholder is left for the clinician. Psyflo never presses Process Form and never sends the reply.
// Clinician only (payer.reply). Opened from home, or by landing on the Payer Reply form (core.js autoView); `?request=R-0402` on the Lauris page names the case.
// R7 (Oprox parity, X-02): the case tile carries the parsed decision fields; Why this denial is contestable (CRITICAL / STRONG findings), the six ASAM dimensions and the
// payer pattern are collapsed accordions between the tile and the suggestions; the suggestions are numbered and carry the platform's footer. See lib/intel.js.
import { esc } from '../../js/runtime.js';
import { fmtDate } from '../../js/shared/dates.js';
import * as asam from '../../js/shared/asam.js';
import { DIM_BOX } from '../../js/shared/enhance.js';
import { denialRecs, withDecisions, docSection, RECS_SECTION } from '../../js/shared/recs.js';
import { evidenceIndex as caseIndex, evidenceById, chipOpts, byRequest, isOpen, ISSUE_LABEL, VIA_LABEL, P2P_STAGES, payerName, unitsView, deadlinesOf, primaryDeadline, sentenceLevel, sentenceDim } from '../../js/shared/sel/disputes.js';
import { recBlock, recActs, recIns, recChs } from '../lib/recs.js';
import { denialParts } from '../lib/intel.js';

const KIND_LABEL = { info: 'Information request reply', p2p: 'Peer-to-peer call', appeal: 'Appeal', recon: 'Reconsideration request' };   // the Reply type box of the Lauris form
const PLACEHOLDER = /\[Evidence missing/;
const noteOf = t => String(t || '').replace(/^["“]|["”]$/g, '').trim();

// ---------------------------------------------------------------- which case, which reply
const casesOf = (ctx, c) => { const s = ctx.S(); return (s.requests || []).filter(r => r.client === c.id).map(r => ({ r, d: byRequest(s, r.id) })).filter(x => x.d && isOpen(x.d)); };
const hintOf = ctx => { try { return new URL(ctx.page.url).searchParams.get('request') || ''; } catch (e) { return ''; } };
function currentCase(ctx, cases) { const want = ctx.st.req || hintOf(ctx); return cases.find(x => x.r.id === want) || cases[0]; }
// the replies this case may have now (the same stages as dispute.genDoc on the server)
export function kindsFor(r, d) {
  const k = [];
  if (r.stage === 'info_requested') k.push('info');
  if (r.stage === 'partial_decide' || P2P_STAGES.includes(r.stage)) k.push('p2p');
  if (r.stage === 'denied' && d.path === 'appeal') k.push('appeal');
  if (['partial_decide', 'denied'].includes(r.stage) && d.path === 'recon') k.push('recon');
  return k;
}
const kindOf = (ctx, r, d) => { const ks = kindsFor(r, d); const made = ks.filter(k => d.docs && d.docs[k] && d.docs[k].sections); return ks.includes(ctx.st.kind) ? ctx.st.kind : made[0] || ks[0] || null; };

// ---------------------------------------------------------------- the boxes of the Payer Reply form, from stored records and the packet
// -> { boxes:[{label,value}], left:[{label,why}], recIds }. A box whose text holds an "Evidence missing" placeholder is not typed: it is left for the clinician.
export function replyBoxes(ctx, c, r, d, kind, recs) {
  const s = ctx.S(); const X = caseIndex(s, d, r); const doc = d.docs && d.docs[kind]; const sec = k => doc && (doc.sections || []).find(x => x.key === k);
  const u = unitsView(s, d, r); const a = X.assessment; const boxes = []; const left = [];
  const add = (label, value, why) => { const v = String(value || '').trim(); if (!v) return; if (PLACEHOLDER.test(v)) { left.push({ label, why: why || 'Evidence missing in the stored record' }); return; } boxes.push({ label, value: v }); };
  const n = d.notice || {}; const dl = primaryDeadline(deadlinesOf(s, d, r));
  const decision = d.issue === 'partial' ? `${payerName(s, r.payer)}: ${u.offered != null ? u.offered : u.current} of ${u.requested} units offered`
    : d.issue === 'denial' ? `${payerName(s, r.payer)}: request denied`
      : `${payerName(s, r.payer)}: request for information${dl && dl.date ? ' · reply due ' + fmtDate(dl.date) : ''}`;
  add('Payer decision', decision + (n.date ? ` · notice ${fmtDate(n.date)}${n.via && VIA_LABEL[n.via] ? ' by ' + VIA_LABEL[n.via].toLowerCase() : ''}` : '') + (n.doc_ref ? ` · ${n.doc_ref}` : ''));
  add('Reply type', KIND_LABEL[kind]);
  const said = (d.concerns || []).filter(x => x && x.text && !/not recorded/i.test(x.text)).map(x => noteOf(x.text)).join(' ');
  add('Reason the payer gave', (sec('reason') || {}).text || said, "the payer's stated reason");
  add('Level of care', (sec('level') || {}).text || sentenceLevel(X, r).text, 'the level of care and the assessment behind it');
  for (const dm of asam.DIMS) { const rt = a ? asam.ratingOf(a, dm.n) : null; if (rt == null || rt < 2) continue; const sd = sentenceDim(X, dm.n); add(DIM_BOX[dm.n - 1], sd.text, `a dated record for ${dm.short}`); }
  const rs = sec(RECS_SECTION) || docSection(recs, kind);
  add('Added from recommendations', rs && rs.text, '');
  add('What we ask', (sec('ask') || {}).text, '');
  return { boxes, left, recIds: recs.filter(x => x.state === 'included').map(x => x.id) };
}

// ---------------------------------------------------------------- html
const sevTone = sev => ({ overdue: 'r', soon: 'y', ok: 'g' }[sev] || 'n');
// `strip` (R7, X-02) is the parsed decision fields (payer, service, requested, offered, revenue at risk, decision, rationale): it says the units, so the line above it does not
function caseTile(ctx, s, r, d, strip = '') {
  const u = unitsView(s, d, r); const n = d.notice || {}; const dl = primaryDeadline(deadlinesOf(s, d, r));
  const units = d.issue === 'partial' ? `${u.offered != null ? u.offered : u.current} of ${u.requested} units offered` : d.issue === 'denial' ? `${u.requested} units requested` : '';
  return `<div class="tile t"><div class="row w"><h2 style="flex:1">${esc(payerName(s, r.payer))} · ${esc(ISSUE_LABEL[d.issue] || 'Payer reply')}</h2>${dl ? `<span class="chip ${sevTone(dl.sev)}">${esc(dl.label)}${dl.date ? ': ' + esc(fmtDate(dl.date)) : ''}</span>` : ''}</div>
    <div class="small muted" style="margin-top:4px">${esc(r.id)} · ${esc(ctx.M.TYPE_LABEL[r.type] || r.type)}${n.date ? ` · notice ${esc(fmtDate(n.date))}${n.via && VIA_LABEL[n.via] ? ' by ' + esc(VIA_LABEL[n.via].toLowerCase()) : ''}` : ''}${units && !strip ? ' · ' + esc(units) : ''}</div>${strip}</div>`;
}
function sectionHTML(ctx, X, sec) {
  const hl = sec.key === RECS_SECTION; const ev = (sec.evidence || []).map(id => evidenceById(X, id)).filter(Boolean);
  return `<div class="box${hl ? ' prp-hl' : ''}"><div class="row w"><span class="l" style="flex:1">${esc(sec.title)}</span>${hl ? '<span class="chip y">From your suggestions</span>' : ''}${(sec.missing || []).length ? '<span class="chip r">Evidence missing</span>' : ''}</div>
    <div class="v" style="white-space:pre-wrap">${esc(sec.text)}</div>${ev.length ? `<div class="prc-ev">${ev.slice(0, 4).map(e => ctx.ui.evidenceChip(chipOpts(e))).join('')}${ev.length > 4 ? `<span class="hint">+${ev.length - 4} more</span>` : ''}</div>` : ''}</div>`;
}
function packetHTML(ctx, s, c, r, d, kind, X, recs) {
  const { banner, accordion } = ctx.parts; const ks = kindsFor(r, d); const n = recs.filter(x => x.state === 'included').length;
  let h = `<div class="tile"><div class="row w"><h2 class="st" style="flex:1">Packet</h2><span class="chip ${n ? 'g' : 'n'}">${n} suggestion${n === 1 ? '' : 's'} included</span></div>`;
  if (!ks.length) return h + `<div class="small" style="margin-top:6px">${r.stage === 'denied' ? 'Choose appeal or reconsideration in Psyflo first. The reply is drafted for the path you choose.' : 'No reply is drafted for this stage.'}</div><div class="row w" style="margin-top:8px"><button class="btn o" data-act="recApp" data-href="${esc('#/DenialCase?id=' + r.id)}">Open the case in Psyflo ↗</button></div></div>`;
  if (ks.length > 1) h += `<div class="row w" role="group" aria-label="Reply type" style="margin-top:8px">${ks.map(k => `<button type="button" class="tog${k === kind ? ' on' : ''}" data-act="denKind" data-k="${k}" aria-pressed="${k === kind}">${esc(KIND_LABEL[k])}</button>`).join('')}</div>`;
  const doc = d.docs && d.docs[kind];
  if (!doc || !doc.sections) return h + `<div class="small" style="margin-top:6px">${esc(KIND_LABEL[kind])}: nothing drafted yet. The draft is built from stored records; a line with no record prints Evidence missing.</div><div class="row w" style="margin-top:8px"><button class="btn p" data-act="denDraft" data-k="${kind}" style="flex:1">Draft the ${esc(KIND_LABEL[kind].toLowerCase())}</button></div></div>`;
  const miss = doc.sections.filter(x => (x.missing || []).length).length;
  h += `<div class="row w" style="margin:8px 0 4px">${doc.sent ? '<span class="chip g">Sent in Psyflo · final</span>' : doc.reviewed ? '<span class="chip g">Reviewed in Psyflo</span>' : '<span class="chip n">Not reviewed yet</span>'}${miss ? `<span class="chip y">${miss} with Evidence missing</span>` : ''}</div>`;
  h += accordion(`Sections · ${doc.sections.length}`, doc.sections.map(x => sectionHTML(ctx, X, x)).join(''), { id: 'den-secs-' + kind, open: false });
  return h + '</div>';
}
function typeHTML(ctx, c, r, d, kind, recs) {
  const { banner } = ctx.parts; const p = ctx.page; const here = p.kind === 'session' && p.form && p.form.type === 'payer-reply'; const doc = kind && d.docs && d.docs[kind] && d.docs[kind].sections;
  const no = c.lauris_no || c.harvest_no;
  if (!here) return `<div class="tile"><h2 class="st">Type into Lauris</h2><div class="small" style="margin:4px 0 8px">The Payer Reply form is not open. Open it, then Psyflo types the packet into its boxes when you press the button.</div><button class="btn p blk" data-act="goNav" data-href="/consumers/${esc(no)}/session/payer-reply?request=${esc(r.id)}">Open the Payer Reply form</button></div>`;
  const pre = kind && doc ? replyBoxes(ctx, c, r, d, kind, recs) : null; const x = ctx.st;
  let h = `<div class="tile t"><h2 class="st">Type into Lauris</h2><div class="small" style="margin:4px 0 8px">${doc ? `${pre.boxes.length} box${pre.boxes.length === 1 ? '' : 'es'} from the packet go into the open form, in yellow.${pre.left.length ? ` ${pre.left.length} stay${pre.left.length === 1 ? 's' : ''} for you.` : ''} Member and Current authorization are already in Lauris.` : 'Draft the packet first. Psyflo types from the packet, not from a guess.'}</div>
    <button class="btn p blk" data-act="denType" ${doc && !ctx.pg.filling ? '' : 'disabled'}>${x.typed ? 'Type into Lauris again' : 'Type into Lauris'}</button>
    <div class="hint" style="margin-top:6px">You check the boxes and press Process Form. Psyflo never presses it and never sends the reply.</div></div>`;
  if (pre && pre.left.length) h += ctx.parts.accordion(`Left for you · ${pre.left.length}`, pre.left.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v muted">${esc(b.why)}</div></div>`).join(''), { id: 'den-left' });
  return h;
}

function html(ctx) {
  const { banner } = ctx.parts; const c = ctx.client(); const s = ctx.S();
  if (!c) return banner('n', 'Open a client in Lauris to see their payer reply.');
  const cases = casesOf(ctx, c);
  if (!cases.length) return banner('n', `<b>No open payer reply for ${esc(c.initials)}.</b> A case opens in Denial Intelligence when a payer decision, a partial approval or a request for information arrives.`) + `<button class="btn o blk" data-act="recApp" data-href="#/DenialIntelligence">Open Denial Intelligence in Psyflo ↗</button>`;
  const { r, d } = currentCase(ctx, cases); const kind = kindOf(ctx, r, d);
  const X = caseIndex(s, d, r); const recs = withDecisions(s, 'denial', r.id, denialRecs(s, d, r, X));
  const chips = rec => { const ev = (rec.evidence || []).map(id => evidenceById(X, id)).filter(Boolean); return ev.slice(0, 3).map(e => ctx.ui.evidenceChip(chipOpts(e))).join('') + (ev.length > 3 ? `<span class="hint">+${ev.length - 3} more</span>` : ''); };
  let h = '';
  if (cases.length > 1) h += `<div class="row"><label class="lab" for="den-c">Case</label><select id="den-c" class="tog" style="flex:1" data-ch="denCase">${cases.map(x => `<option value="${esc(x.r.id)}"${x.r.id === r.id ? ' selected' : ''}>${esc(x.r.id)} · ${esc(ISSUE_LABEL[x.d.issue] || '')}</option>`).join('')}</select></div>`;
  // R7 (Oprox parity, X-02): the parsed fields in the tile; then why the denial is contestable (CRITICAL / STRONG findings), the six ASAM dimensions and the payer pattern
  // (collapsed); then the numbered suggestions with the same footer as the platform (Refine, Add clinical context, Dismiss suggestions; the panel never sends)
  const an = denialParts(ctx, s, d, r, X, recs);
  h += caseTile(ctx, s, r, d, an ? an.strip : '');
  if (an) h += an.body;
  h += recBlock(ctx, { scope: 'denial', ref: r.id, recs, boxes: null, chips, limit: 3, heading: 'Suggested by Psyflo', applyLabel: 'Apply selected', numbered: true,
    footer: { refine: true, context: true, dismissAll: true },
    applyHint: 'Adds the included suggestions to the packet. Typing it into Lauris is the next step.',
    apply: (ctx2, inc) => applyToPacket(ctx2, r, d, kind, inc) });
  h += packetHTML(ctx, s, c, r, d, kind, X, recs);
  h += typeHTML(ctx, c, r, d, kind, recs);
  return h;
}

// ---------------------------------------------------------------- acts
// Apply selected: the included suggestions are already in every unsent draft (the server keeps "Added from recommendations" in step with each decision).
// With no draft yet, applying drafts the reply so they have somewhere to go.
async function applyToPacket(ctx, r, d, kind, inc) {
  if (!kind) { ctx.flash('Choose the path in Psyflo first (appeal or reconsideration). The included suggestions wait for the draft.', 'y'); return; }
  const has = d.docs && d.docs[kind] && d.docs[kind].sections;
  if (!has) await ctx.do('dispute.genDoc', { id: d.id, doc: kind });
  ctx.flash(`${inc.length} included suggestion${inc.length === 1 ? ' is' : 's are'} in the packet, under Added from recommendations.`);
}
const acts = {
  ...recActs,
  goNav(el, ctx) { return ctx.nav(el.dataset.href); },
  denKind(el, ctx) { ctx.st.kind = el.dataset.k; ctx.draw(); },
  async denDraft(el, ctx) {
    const c = ctx.client(); const cur = currentCase(ctx, casesOf(ctx, c)); if (!cur) return;
    await ctx.do('dispute.genDoc', { id: cur.d.id, doc: el.dataset.k }); ctx.flash(`${KIND_LABEL[el.dataset.k]} drafted from stored records. Read it, then type it into Lauris.`);
  },
  async denType(el, ctx) {
    const c = ctx.client(); const s = ctx.S(); const cur = currentCase(ctx, casesOf(ctx, c)); if (!cur) return; const { r, d } = cur; const kind = kindOf(ctx, r, d);
    const recs = withDecisions(s, 'denial', r.id, denialRecs(s, d, r));
    const pre = replyBoxes(ctx, c, r, d, kind, recs); if (!pre.boxes.length) { ctx.flash('Nothing to type yet: every box still has Evidence missing.', 'y'); return; }
    const res = await ctx.fill(pre.boxes, { form: 'payer-reply', client: c, sources: [{ n: 1, kind: 'dispute', label: `Payer reply packet · ${KIND_LABEL[kind]}`, source: d.id, recs: pre.recIds }] });
    if (res && !res.error) { ctx.st.typed = true; if (pre.left.length) ctx.flash(`${pre.boxes.length} box${pre.boxes.length === 1 ? '' : 'es'} typed · yellow · check them. Left for you: ${pre.left.map(b => b.label.replace(/^(Dimension \d).*/, '$1')).join(', ')}.`, 'y'); ctx.draw(); }
  }
};
const chs = { ...recChs, denCase(el, ctx) { ctx.st.req = el.value; ctx.st.kind = null; ctx.st.typed = false; ctx.draw(); } };

export default {
  id: 'denial', label: 'Denial packet', cap: 'payer.reply',
  title: ctx => { const c = ctx.client(); return 'Denial packet' + (c ? ' · ' + c.initials : ''); },
  html, acts, ins: recIns, chs
};
