// Prepare authorization (E5): Plan -> Request -> Sign-off in one path, and the continued-stay request (the evidence-first variant).
//   Plan      the treatment plan (ISP) in Lauris; goals typed from the record; the guardian signs on the parent portal
//   Request   every statement carries evidence chips that open the stored record; the clinician edits; Approve and fill types the boxes (yellow)
//   Sign-off  names who must approve and who may sign; shows Pending clinical approval; the approver presses Approve in Psyflo;
//             the LICENSED person presses Get Signature in Lauris (Psyflo never signs, never presses Process Form, Get Signature or Send)
// Household context is "Not included" until a person opts in. Counts come from stored notes (evidenceIndex); a missing fact prints "Evidence missing".
import { esc } from '../../js/runtime.js';
import { fmtDate, daysBetween, addBusinessDays } from '../../js/shared/dates.js';
import { draftSeeded, draftInitialSRA, screeningFacts } from '../../js/shared/draft.js';
import { buildContinuedStay, evidenceIndex, periodPresets, isMissingText } from '../../js/shared/enhance.js';
import { rule } from '../../js/shared/rules.js';
import { recFor, reviewBlock } from '../lib/review.js';
import { itemsFromDraft, staffInputs, formValue } from '../lib/items.js';

const STEPS = ['Plan', 'Request', 'Sign-off'];
// a stored draft is stale when the record it was built from changed (the boxes Psyflo would draft now differ from the original draft)
const isStale = (rec, boxes) => boxes.length !== rec.items.length || rec.items.some(i => { const b = boxes.find(x => x.label === i.label); return !b || b.value !== (i.history[0] && i.history[0].text); });
const stepFor = (p) => (p.kind === 'approvals' || p.kind === 'approval') ? 2 : p.form && p.form.type === 'isp' ? 0 : 1;
const stepper = (ctx, p) => ctx.ui.stepper(STEPS.map(label => ({ label })), { current: stepFor(p), label: 'Authorization steps' });

// ------------------------------------------------------------------ Plan (ISP)
function planHTML(ctx, c) {
  const { banner, boxRow, accordion, checksBlock, SAMPLE_CHIP } = ctx.parts; const s = ctx.S();
  if (c.id !== 'TW') return banner('n', `<b>No plan draft for ${esc(c.initials)} in this demo.</b> Psyflo drafts the plan from the intake and the plan meeting; the worked example is T.W.`);
  const screening = s.screenings.find(x => x.client === c.id && (x.facts || x.transcript));
  const d = draftSeeded('isp', { client: c, screening, today: ctx.M.today(s) });
  const filled = new Set(ctx.pg.filled || []);
  return `<div class="tile t"><div class="row w"><h2 style="flex:1">Treatment plan · ${esc(c.initials)}</h2>${SAMPLE_CHIP()}</div>
      <div class="small" style="margin:4px 0 8px">Goals and interventions from Harvest's list. Check every box in Lauris before Process Form.</div>
      <div class="row"><button class="btn p" style="flex:1" data-act="ispFill" ${ctx.pg.filling ? 'disabled' : ''}>${filled.size ? 'Type the 3 goals again' : 'Fill the 3 goals'}</button><button class="btn o" data-act="ispOne">One at a time</button></div></div>`
    + (ctx.st.one != null ? oneAtATime(ctx, d.boxes) : '')
    + accordion(`Boxes · ${d.boxes.length}`, d.boxes.map(b => boxRow(b, d.sources, { state: filled.has(b.label) ? '<span class="chip y">typed · check it</span>' : '' })).join(''), { id: 'isp-boxes' })
    + checksBlock(d.checks) + guardianPlanHTML(ctx, c)
    + `<div class="hint">Then press <b>Process Form</b> in Lauris. It goes to Forms to Approve; Psyflo never signs.</div>`;
}
function oneAtATime(ctx, boxes) { const st = ctx.st; const b = boxes[st.one]; if (!b) return ctx.parts.banner('', 'That was the last box.'); return `<div class="tile"><div class="lab">Box ${st.one + 1} of ${boxes.length}</div><div style="font-weight:600;margin-top:2px">${esc(b.label)}</div><div class="small" style="margin:4px 0 8px;white-space:pre-wrap">${esc(b.value)}</div><div class="row w"><button class="btn p" data-act="ispOneType">Type this one</button><button class="btn o" data-act="ispOneSkip">Skip</button><button class="btn o" data-act="ispOneClose">Close</button></div></div>`; }
function guardianPlanHTML(ctx, c) {
  const s = ctx.S(); const t = (s.portal_tasks || []).filter(x => x.client === c.id && x.form === 'Treatment plan').at(-1); const g = c.guardian?.name || 'the guardian';
  if (t && t.status === 'signed') return ctx.parts.banner('', `<b>Treatment plan signed by ${esc(g)}</b> on the parent portal${t.signed_at ? ' · ' + fmtDate(t.signed_at) : ''}.`);
  if (t) return ctx.parts.banner('y', `<b>Sent to the parent portal for signature</b> · ${fmtDate(t.at)} · waiting for ${esc(g)} to sign.`);
  return `<button class="btn o" data-act="ispSign">Send to parent for signature</button>`;
}

// ------------------------------------------------------------------ Request (initial SRA)
function sraData(ctx, c) {
  const s = ctx.S(); const sc = s.screenings.find(x => x.client === c.id && (x.facts || x.transcript));
  const facts = sc?.facts || (sc?.transcript ? screeningFacts(sc.transcript) : null); if (!facts) return null;
  const r = s.referrals.find(x => x.id === c.referral);
  return draftInitialSRA({ client: c, screening: { facts, when: sc.when }, referral: r, school: (s.school_numbers || {})[c.id], today: ctx.M.today(s), isp: { date: c.timeline?.isp }, cna: { date: c.timeline?.intake }, request: s.requests.find(q => q.client === c.id && q.type === 'initial' && q.stage !== 'closed') });
}
function requestHTML(ctx, c) {
  const { banner, accordion, checksBlock } = ctx.parts; const s = ctx.S(); const st = ctx.st;
  const req = s.requests.find(r => r.client === c.id && r.type === 'initial' && !['closed'].includes(r.stage));
  const d = sraData(ctx, c);
  if (!d) return banner('y', `No screening call on record for ${esc(c.initials)}. Psyflo drafts the initial request only from the screening, the intake, the plan and the referral: run the screening first.`) + `<button class="btn o" data-act="goNav" data-href="/consumers/${ctx.page.consumer.no}/session/screening">Open Admission screening</button>`;
  let h = '';
  if (req && !['draft_ready', 'needs_approval', 'awaiting_signature'].includes(req.stage)) h += banner('n', `${esc(req.id)} is ${esc(ctx.M.STAGE_LABEL[req.stage].toLowerCase())}. This form was already processed.`);
  const rec = recFor(ctx, c, 'sra-initial');
  const sc = s.screenings.find(x => x.client === c.id);
  h += `<div class="tile t"><h2>Draft ready · ${esc(c.initials)}</h2><div class="small" style="margin-top:4px">From the screening (${fmtDate(sc?.when)}), the intake${c.timeline?.intake ? ' (' + fmtDate(c.timeline.intake) + ')' : ''}, the plan${c.timeline?.isp ? ' (' + fmtDate(c.timeline.isp) + ')' : ''} and the referral.${req ? ' Tracked as ' + esc(req.id) + '.' : ''}</div></div>`;
  if (!rec) {
    h += `<button class="btn p blk" data-act="sraDraft">Review ${d.boxes.length} statements</button>`;
  } else {
    if (isStale(rec, d.boxes) && rec.lauris_status !== 'processed') h += banner('y', 'The record changed since this draft.') + `<button class="btn o" data-act="sraDraft">Redraft</button>`;
    h += reviewBlock(ctx, rec, { title: 'Initial request · ' + c.initials, st, client: c, sources: d.sources });
  }
  h += accordion(`Left for you · ${d.blank.length}`, d.blank.map(b => `<div class="box"><div class="l">${esc(b.short || b.label)}</div><div class="v muted">${esc(b.why)}</div></div>`).join(''), { id: 'sra-blank' });
  ctx.pg.lastChecks = d.checks; h += checksBlock(d.checks);
  h += `<div class="hint">Then press <b>Process Form</b> in Lauris. It goes to Pending clinical approval, then Forms to Approve for a signature; Psyflo never signs.</div>`;
  return h;
}

// ------------------------------------------------------------------ Continued stay (evidence first)
function periodFor(ctx, c) {
  const s = ctx.S(); const me = ctx.me(); const today = ctx.M.today(s); const st = ctx.st;
  if (st.period) return st.period;
  const saved = (s.evidence_periods || []).find(x => x.client === c.id && x.by === me.id);
  if (saved) return { from: saved.from, to: saved.to, preset: saved.preset };
  const p = periodPresets(s, c, today)[0]; return { from: p.from, to: p.to, preset: p.id };
}
function continuedHTML(ctx, c) {
  const { banner, accordion, checksBlock, boxRow } = ctx.parts; const s = ctx.S(); const st = ctx.st; const today = ctx.M.today(s);
  const req = s.requests.find(r => r.client === c.id && r.type === 'continued_stay' && r.stage !== 'closed');
  const per = periodFor(ctx, c); const presets = periodPresets(s, c, today);
  const cs = buildContinuedStay(s, c.id, per, { household: !!st.household, request: req });
  const idx = cs.index; const rec = recFor(ctx, c, 'sra-continued');
  let h = `<div class="row"><label class="lab" for="cs-per">Period</label><select id="cs-per" class="tog" style="flex:1" data-ch="period">${presets.map(p => `<option value="${p.id}"${p.id === per.preset ? ' selected' : ''}>${esc(p.label)}</option>`).join('')}</select></div>
    <div class="hint">${fmtDate(per.from)} – ${fmtDate(per.to)} · ${idx.period.days} days${req ? ' · ' + esc(req.id) : ''}</div>`;
  h += `<div class="cnts">${['daily:Daily notes', 'weekly:Weekly calls', 'monthly:Monthly collateral'].map(x => { const [k, l] = x.split(':'); return `<button class="cnt" data-act="openRows" data-k="${k}"><span class="small muted">${l}</span><b>${cs.counts[k]}</b></button>`; }).join('')}</div>
    <div class="hint">${cs.counts.excluded} excluded · ${cs.counts.sensitive} sensitive (counted, never quoted). <a href="#" data-act="openEvidence">Open the evidence</a></div>`;
  h += unitsBanner(ctx, c);
  // household context: Not included until a person opts in
  const hh = idx.rows.filter(r => r.household && !r.excluded);
  h += `<div class="tile"><div class="row w"><h2 style="flex:1">Household context</h2><span class="chip ${st.household ? 'y' : 'n'}">${st.household ? 'Included by you' : 'Not included'}</span><button class="btn ${st.household ? 'o' : 'p'} sm" data-act="household" ${hh.length || st.household ? '' : 'disabled'}>${st.household ? 'Take it out' : 'Include it'}</button></div>
    <div class="hint" style="margin-top:4px">${hh.length ? `${hh.length} stored note${hh.length === 1 ? '' : 's'} mention${hh.length === 1 ? 's' : ''} it. You decide.` : 'No stored note mentions it.'}</div></div>`;
  const stale = !!rec && isStale(rec, cs.boxes);
  if (!rec) h += `<button class="btn p blk" data-act="csDraft">Review ${cs.boxes.length} statements</button>`;
  else {
    if (stale && rec.lauris_status !== 'processed') h += banner('y', 'The evidence changed since this draft.') + `<button class="btn o" data-act="csDraft">Redraft from the evidence</button>`;
    h += reviewBlock(ctx, rec, { title: 'Continued stay · ' + c.initials, st, client: c, sources: cs.sources });
  }
  if (idx.gaps.length) h += accordion(`Evidence gaps · ${idx.gaps.length}`, idx.gaps.map(g => `<div class="cr">${g.kind === 'missing' ? ctx.I.warn : ctx.I.open}<div>${esc(g.text)}</div></div>`).join(''), { id: 'cs-gaps' });
  ctx.pg.lastChecks = cs.checks; h += checksBlock(cs.checks);
  h += accordion(`Left for you · ${cs.blank.length}`, cs.blank.map(b => `<div class="box"><div class="l">${esc(b.label)}</div><div class="v muted">${esc(b.why)}</div></div>`).join(''), { id: 'cs-blank' });
  h += `<div class="hint">Then press <b>Process Form</b> in Lauris. The internal quarterly never goes into this request.</div>`;
  return h;
}
function unitsBanner(ctx, c) {
  const a = c.authorization; if (!a || !a.units) return '';
  const s = ctx.S(); const left = a.units - (a.used || 0); const r = rule(s, 'units.rate_per_school_day'); const rate = r.value || 3; const days = Math.floor(left / rate);
  const run = addBusinessDays(ctx.M.today(s), days);
  if (!a.end || run >= a.end) return '';
  return ctx.parts.banner('y', `<b>${left} units left.</b> At ${rate} a day units run out about ${fmtDate(run)}, before the ${fmtDate(a.end)} end. ${ctx.ui.sourceChip(r)}`);
}

// ------------------------------------------------------------------ Sign-off (Forms to Approve)
function approverNames(ctx) { return (ctx.S().staff || []).filter(x => (x.designations || []).includes('approve.sra')).map(x => `${ctx.M.staffShort(ctx.S(), x.id)}${x.credential ? ', ' + x.credential : ''}`); }
function signerNames(ctx) { return (ctx.S().staff || []).filter(x => x.signs_requests).map(x => `${ctx.M.staffShort(ctx.S(), x.id)}${x.credential ? ', ' + x.credential : ''}`); }
function whoBlock(ctx, req) {
  const s = ctx.S(); const roster = rule(s, 'signature.sra.roster'); const ap = approverNames(ctx); const sg = signerNames(ctx);
  return `<div class="stamp"><div>Approves</div><div>${ap.length ? esc(ap.join(', ')) : 'Not designated yet. An administrator designates the approver.'}</div></div>
    <div class="stamp"><div>Signs</div><div>${esc(roster.value || 'LMHP-type users')}${sg.length ? ' · ' + esc(sg.join(', ')) : ''} ${ctx.ui.sourceChip(roster)}</div></div>
    <div class="stamp"><div>Sends</div><div>${req ? 'A person presses Send in Psyflo (' + esc(ctx.M.CHANNEL_LABEL[req.channel] || req.channel) + ')' : 'A person presses Send in Psyflo'}</div></div>`;
}
function approvalBlock(ctx, req) {
  if (!req) return '';
  const { banner } = ctx.parts; const st = req.stage;
  let h = `<div class="row w"><h2 class="st" style="flex:1">${esc(req.id)} · ${esc(ctx.M.TYPE_LABEL[req.type] || req.type)}</h2>${ctx.ui.statusChip(st)}</div>`;
  if (st === 'needs_approval') {
    h += ctx.can('approve.sra') ? `<div class="tile t"><div class="small"><b>Pending clinical approval.</b> You are designated to approve. Read it against the draft, then approve; the signature itself is pressed in Lauris.</div>
        <label class="lab" for="ap-c" style="display:block;margin-top:8px">Comment (optional)</label><input id="ap-c" class="ed" data-in="apComment" value="${esc(ctx.st.apComment || '')}" maxlength="300">
        <button class="btn p blk" style="margin-top:8px" data-act="approve" data-id="${esc(req.id)}">Approve ${esc(req.id)}</button></div>`
      : banner('y', `<b>Pending clinical approval.</b> ${approverNames(ctx).length ? 'Needs ' + esc(approverNames(ctx).join(' or ')) + '.' : 'No approver is designated yet.'} You do not have the approver designation.`);
  } else if (st === 'awaiting_signature') h += banner('', `Approved${req.approved_by ? ' by ' + esc(ctx.M.staffShort(ctx.S(), req.approved_by)) : ''}${req.approved_at ? ' · ' + fmtDate(req.approved_at) : ''}. Ready for Get Signature in Lauris.`);
  else if (st === 'draft_ready') h += banner('n', 'Not processed yet. Process Form in Lauris moves it to Pending clinical approval.');
  return h;
}
function signoffHTML(ctx, c) {
  const { banner } = ctx.parts; const s = ctx.S(); const p = ctx.page; const ev = ctx.event;
  if (p.kind === 'approvals') {
    return banner('n', `${(p.approvals || []).length} forms wait for a signature. Open one; Psyflo checks it against the draft before you press Get Signature.`)
      + `<div class="list">${(p.approvals || []).map(a => { const cl = s.clients.find(x => x.lauris_no === Number(a.consumer) || x.harvest_no === Number(a.consumer)); const r = cl && s.requests.find(q => q.client === cl.id && ['needs_approval', 'awaiting_signature'].includes(q.stage));
        return `<button class="btn o" data-act="goNav" data-href="/approvals/${esc(a.session)}"><span>${esc(a.initials)} · ${esc(a.title)}</span>${r ? ctx.ui.statusChip(r.stage) : '<span class="chip n">open</span>'}</button>`; }).join('')}</div>`;
  }
  const pv = p.preview || {}; const type = pv.form;
  const req = c && s.requests.find(r => r.client === c.id && ((type === 'sra-initial' && r.type === 'initial') || (type === 'sra-continued' && r.type !== 'initial')) && !['closed'].includes(r.stage));
  const signedNow = ev && ev.event === 'signed';
  let h = '';
  if (signedNow || pv.signed) {
    const file = ev?.result?.file || (req && req.signed_pdf ? { url: req.signed_pdf, name: req.signed_name } : null);
    h += banner('', `<b>Signed in Lauris.</b> ${file ? 'Psyflo saved the signed preview as PDF and assembled the packet.' : 'Psyflo logged the signature.'}${req && req.signed_by ? ' Signed by ' + esc(req.signed_by) + '.' : ''}`);
    if (file) h += `<a class="btn o" href="${esc(file.url)}" target="_blank" rel="noopener">${ctx.I.doc} ${esc(file.name || 'Signed PDF')}</a>`;
    if (req) h += `<div class="row"><a class="btn p" style="flex:1" href="${esc(ctx.appURL('#/Authorization?id=' + req.id + '&section=submission'))}" target="_blank" rel="noopener">After signing: open Send ↗</a></div><div class="hint">${esc(ctx.M.payerShort(s, req.payer))} · ${esc(ctx.M.CHANNEL_LABEL[req.channel])}. You press Send in Psyflo${req.channel === 'fax' ? '; it faxes through Harvest\'s Sfax account.' : '; it opens the portal in your own login with the packet ready.'}</div>`;
    return h;
  }
  h += approvalBlock(ctx, req);
  // before signing: what changed since Psyflo typed
  const fills = (s.fills || []).filter(f => c && f.client === c.id && f.form === type).flatMap(f => f.boxes.map(b => b.label));
  const typed = req?.typed_boxes || [];
  const d = c && type === 'sra-initial' ? sraData(ctx, c) : null;
  let edits = 0; if (d) for (const b of d.boxes) { const row = (pv.rows || []).find(r => r.label === b.label); if (row && row.value !== b.value) edits++; }
  const limit = req?.limit_30 ? daysBetween(ctx.M.today(s), req.limit_30) : null;
  const l30 = req && req.limit_30_basis ? req.limit_30_basis.days : null;
  h += `<div><div class="lab" style="margin-bottom:4px">Before you sign</div>
    <div class="ck">${edits ? ctx.I.warn : ctx.I.ok}<div>${d ? (edits ? `${edits} box${edits === 1 ? '' : 'es'} changed after Psyflo typed ${edits === 1 ? 'it' : 'them'} · that is fine, you are the author` : 'Every box matches the draft Psyflo typed') : `${new Set(fills.concat(typed)).size} boxes were typed by Psyflo`}</div></div>
    ${limit != null ? `<div class="ck">${limit > 7 ? ctx.I.ok : ctx.I.warn}<div>${limit} days left to the ${l30 || 30}-day send limit ${req.limit_30_basis ? ctx.ui.sourceChip(rule(s, 'initial_sra.send_within_days')) : ''}</div></div>` : ''}</div>`;
  h += `<div><div class="lab" style="margin-bottom:4px">Who does what</div>${whoBlock(ctx, req)}</div>
    <div><div class="lab" style="margin-bottom:4px">After you sign</div>
    <div class="stamp"><div>Psyflo</div><div>Saves the signed preview as PDF</div></div>
    <div class="stamp"><div>Packet</div><div>${req ? (req.channel === 'fax' ? `Form + cover sheet · ${esc(ctx.M.payerShort(s, req.payer))} fax` : `Form${req.payer === 'uhc' ? ' + CNA + ISP' : ''} · ready for ${esc(ctx.M.CHANNEL_LABEL[req.channel])}`) : 'Kept with the record in Psyflo'}</div></div></div>
    <div class="hint">Press <b>Get Signature</b> in Lauris. Psyflo never signs.</div>`;
  return h;
}

// ------------------------------------------------------------------ html / acts
function html(ctx) {
  const p = ctx.page; const c = ctx.client(); const { banner } = ctx.parts;
  if (p.kind === 'approvals' || p.kind === 'approval') return stepper(ctx, p) + signoffHTML(ctx, c);
  if (!c) return banner('n', 'Open a student in Lauris to prepare an authorization.');
  const t = p.form && p.form.type;
  const body = t === 'isp' ? planHTML(ctx, c) : t === 'sra-initial' ? requestHTML(ctx, c) : t === 'sra-continued' ? continuedHTML(ctx, c) : banner('n', 'Open the treatment plan, the initial request or the continued-stay request.');
  return (t === 'sra-continued' ? '' : stepper(ctx, p)) + body;
}

const acts = {
  goNav(el, ctx) { return ctx.nav(el.dataset.href); },
  ispFill: async (el, ctx) => { const c = ctx.client(); const s = ctx.S(); const d = draftSeeded('isp', { client: c, screening: s.screenings.find(x => x.client === c.id), today: ctx.M.today(s) }); await ctx.fill(d.boxes, { form: 'isp', client: c, sources: d.sources }); ctx.draw(); },
  ispOne(el, ctx) { ctx.st.one = 0; ctx.draw(); }, ispOneClose(el, ctx) { ctx.st.one = null; ctx.draw(); },
  ispOneType: async (el, ctx) => { const c = ctx.client(); const s = ctx.S(); const d = draftSeeded('isp', { client: c, screening: s.screenings.find(x => x.client === c.id), today: ctx.M.today(s) }); await ctx.fill([d.boxes[ctx.st.one]], { form: 'isp', client: c, sources: d.sources }); ctx.st.one++; ctx.draw(); },
  ispOneSkip(el, ctx) { ctx.st.one++; ctx.draw(); },
  ispSign: async (el, ctx) => { const c = ctx.client(); el.disabled = true; await ctx.do('portalTask.create', { client: c.id, form: 'Treatment plan', why: 'Guardian signature on the treatment plan' }); ctx.flash('Treatment plan sent to the parent portal · pending until the guardian signs.'); },
  sraDraft: async (el, ctx) => {
    const c = ctx.client(); const d = sraData(ctx, c); if (!d) return;
    const items = itemsFromDraft(ctx, d, c, { staff: staffInputs(ctx, d) });
    await ctx.do('scribe.draft', { client: c.id, form: 'sra-initial', input: { kind: 'form', text: '' }, items, session: ctx.page.form.session || null });
  },
  csDraft: async (el, ctx) => {
    const c = ctx.client(); const s = ctx.S(); const st = ctx.st; const req = s.requests.find(r => r.client === c.id && r.type === 'continued_stay' && r.stage !== 'closed');
    const cs = buildContinuedStay(s, c.id, periodFor(ctx, c), { household: !!st.household, request: req });
    const inc = cs.index.rows.filter(r => !r.excluded);
    const refs = { notes: inc.filter(r => r.kind === 'daily').map(r => r.ref), weekly: inc.filter(r => r.kind === 'weekly').map(r => r.ref), monthly: inc.filter(r => r.kind === 'monthly').map(r => r.ref) };
    const items = itemsFromDraft(ctx, { boxes: cs.boxes, sources: cs.sources.map(x => ({ ...x, kind: x.kind === 'call' ? 'notes' : x.kind })) }, c, { staff: staffInputs(ctx, cs), refs, request: req });
    await ctx.do('scribe.draft', { client: c.id, form: 'sra-continued', input: { kind: 'form', text: '' }, items, session: ctx.page.form.session || null });
  },
  household(el, ctx) { ctx.st.household = !ctx.st.household; ctx.draw(); },
  openEvidence(el, ctx, e) { e.preventDefault(); const en = ctx.stOf('enhance'); en.mode = 'B'; ctx.go('enhance'); },
  openRows(el, ctx) { const en = ctx.stOf('enhance'); en.mode = 'B'; en.kind = el.dataset.k; ctx.go('enhance'); },
  approve: async (el, ctx) => { const id = el.dataset.id; await ctx.do('request.approve', { id, comment: ctx.st.apComment || '' }); ctx.st.apComment = ''; ctx.flash(`${id} approved. The licensed person presses Get Signature in Lauris.`); }
};
const chs = {
  period: async (el, ctx) => {
    const c = ctx.client(); const s = ctx.S(); const p = periodFor(ctx, c); void p;
    const pr = periodPresets(s, c, ctx.M.today(s)).find(x => x.id === el.value); if (!pr) return;
    ctx.st.period = { from: pr.from, to: pr.to, preset: pr.id };
    await ctx.do('evidence.period', { client: c.id, from: pr.from, to: pr.to, preset: pr.id }).catch(e => ctx.flash(e.message, 'r'));
    ctx.draw();
  }
};
const ins = { apComment(el, ctx) { ctx.st.apComment = el.value; } };

// the request record the draft needs exists as soon as the form opens
async function onOpen(ctx) {
  const p = ctx.page; if (p.kind !== 'session') return; const c = ctx.client(); if (!c) return;
  if (p.form.type === 'sra-initial' && ctx.can('drafts.clinical') && !ctx.S().requests.some(r => r.client === c.id && r.type === 'initial' && r.stage !== 'closed'))
    await ctx.do('request.ensure', { id: c.id === 'TW' ? 'R-0416' : undefined, client: c.id, type: 'initial' }).catch(() => { });
}

export default {
  id: 'authorize', label: 'Prepare authorization', cap: 'drafts.clinical',
  title: ctx => { const p = ctx.page; const c = ctx.client(); const t = p.form && p.form.type; const n = { isp: 'Plan', 'sra-initial': 'Request', 'sra-continued': 'Continued stay' }[t] || 'Sign-off'; return `${n}${c ? ' · ' + c.initials : ''}`; },
  html, acts, ins, chs, onOpen
};
