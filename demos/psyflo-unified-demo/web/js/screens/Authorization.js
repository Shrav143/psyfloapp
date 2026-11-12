// 52 · Authorization case page (E2, laid out like the artifact's authorization page in R3): replaces Submission and EarlyDischarge as sections
// (?id=R-0416&section=documents|evidence|submission|units|payer|tasks|transition|history; section=timeline lands on history).
// Top: the header, a flag banner when someone flagged it, the one primary panel. Then two columns of cards (requested vs approved, clinical documentation,
// evidence, tasks | deadlines, renewal status, submission, payer decision) and the History block with an actor tag per row, a filter by who, a pop-up per row.
// One primary panel says what must happen next (Review packet -> Approve -> Sign in Lauris -> Send), each step done by a person who holds the
// capability; then expandable sections. Psyflo drafts and records. It never signs, never stores credentials and never sends unattended:
// "processed" and "signed" are set only by the page bridge, "Sent" only after the send stub returned a reference. Selectors: shared/sel/auth.js.
import { register, Screen, M, raw, esc, ui, toast, session, api, canOpen } from '../app.js';
import { authCase, HIST_ACTORS, HIST_ORDER, HIST_ENTRY_KINDS } from '../shared/sel/auth.js';
import { fmtDate, fmtDateTime, daysBetween } from '../shared/dates.js';
import { decisionDay, rule } from '../shared/rules.js';
import { openPortal, diHref } from './Authorizations.js';
import { A_CSS } from './a-css.js';
import { openFlagDialog, flagButton } from './a-flag.js';

const TITLES = { documents: 'Clinical documentation', evidence: 'Evidence', submission: 'Submission', units: 'Requested vs approved', payer: 'Payer decision', tasks: 'Related tasks', transition: 'Transition' };
const LEFT = ['units', 'documents', 'evidence', 'tasks', 'transition'];
const SEC_IDS = [...Object.keys(TITLES), 'history', 'deadlines', 'renewal'];
const SEC_ALIAS = { timeline: 'history' };
const STEPS = ['Drafted', 'Submitted', 'Payer decision', 'In force', 'Renewal'];
const STEP_AT = { draft_ready: 0, needs_approval: 0, awaiting_signature: 0, signed: 0, sending: 1, portal_open: 1, submitted: 1, overdue: 1, info_requested: 2, partial_decide: 2, peer_to_peer_requested: 2, peer_to_peer_booked: 2, p2p_awaiting: 2, denied: 2, appeal_sent: 2, active: 3, early_discharge: 3, closed: 5 };
const KIND_L = { initial: 'Initial SRA', early_discharge_new_initial: 'Initial SRA', continued_stay: 'Concurrent SRA', concurrent: 'Concurrent SRA' };
const CALL_OPTIONS = [['receipt_confirmed', 'Receipt confirmed'], ['in_review', 'In clinical review'], ['decision_given', 'Decision given by phone'], ['no_answer', 'No answer · call again'], ['not_found', 'Payer cannot find it']];
const OUTCOMES = [['approved', 'Approved'], ['partial', 'Partial'], ['denied', 'Denied']];

const dt = x => (x ? fmtDateTime(x) : '');
const icon = n => ui.icon(n, 14);
const staffOptions = (s, sel, none) => (none ? `<option value="">${esc(none)}</option>` : '') + (s.staff || []).filter(x => ['clinician', 'supervisor'].includes(x.role)).map(x => `<option value="${esc(x.id)}"${x.id === sel ? ' selected' : ''}>${esc(x.name)}${x.credential ? ', ' + esc(x.credential) : ''}</option>`).join('');

register('Authorization', class extends Screen {
  init() {
    const want = SEC_ALIAS[this.params.section] || this.params.section; const sec = SEC_IDS.includes(want) ? want : null;
    this.state = { hist: { open: true, filter: '' }, plan: null };
    this.scrollTo = sec;
  }
  get css() { return A_CSS; }
  get me() { return session.actor; }
  laurisHref(path) { return `${api.config.laurisURL}/login?as=${encodeURIComponent((this.me && this.me.id) || 'jperez')}&next=${encodeURIComponent(path)}`; }
  authPath(c) { return c.laurisNo ? `/consumers/${c.laurisNo}?tab=auth` : '/authorizations'; }
  formPath(c) { const form = c.type === 'initial' || c.type === 'early_discharge_new_initial' ? 'sra-initial' : 'sra-continued'; return c.laurisNo ? `/consumers/${c.laurisNo}/session/${form}` : '/consumers'; }

  // ---------------------------------------------------------------------------------------------------------- render
  renderVals() {
    const s = this.s; const id = this.params.id;
    if (!id) {
      const list = (s.requests || []).slice(0, 12).map(r => `<li><a href="#/Authorization?id=${esc(r.id)}">${esc(M.clientLabel(s, r.client))} · ${esc(r.id)}</a> ${ui.statusChip(r.stage)}</li>`).join('');
      return { body: raw(`<div class="a-case"><h1 class="a-h1">Authorization case</h1>${ui.emptyState({ title: 'Pick a case', body: 'Open one from the queue.', action: { label: 'Open Authorizations', href: '#/Authorizations' } })}<ul class="a-pick">${list}</ul></div>`) };
    }
    const c = authCase(s, id, this.me);
    if (!c) return { body: raw(`<div class="a-case"><h1 class="a-h1">Case not found</h1>${ui.emptyState({ tone: 'error', title: `${id} is not in the tracker`, body: 'It may belong to a service line this role does not see.', action: { label: 'Back to Authorizations', href: '#/Authorizations' } })}</div>`) };
    this.c = c;
    const left = LEFT.map(k => this.card(c, k)).join(''); const right = [this.deadlinesCard(c), this.renewalCard(c), this.card(c, 'submission'), this.card(c, 'payer')].join('');
    return { body: raw(`<div class="a-case">${this.crumb(c)}${this.header(c)}${this.flagBanner(c)}${this.nextPanel(c)}<div class="a-grid2"><div class="a-col">${left}</div><div class="a-col">${right}</div></div>${this.historyBlock(c)}</div>`) };
  }
  crumb(c) { return `<nav class="a-crumb" aria-label="Breadcrumb"><a href="#/Authorizations">Authorizations</a><span aria-hidden="true">/</span><span aria-current="page">${esc(c.id)}</span></nav>`; }
  header(c) {
    const meta = `<span>${esc([c.typeLabel, c.service + (c.serviceCode ? ' ' + c.serviceCode : ''), c.payer, c.school, c.laurisNo ? `Lauris # ${c.laurisNo}` : c.harvestNo ? `Harvest # ${c.harvestNo}` : ''].filter(Boolean).join(' · '))}</span>`;
    const own = c.owner;
    return `<header class="a-chead"><div class="a-chead__main"><h1 class="a-h1">${esc(c.label)} <span class="a-id">${esc(c.id)}</span></h1><div class="a-chead__meta">${meta}</div></div>
      <div class="a-chead__r">${ui.statusChip(c.stage)}${ui.maturity('route.Authorization')}${c.inDI ? (canOpen('DenialCase') || canOpen('Partials') ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(diHref(c.req))}">In Denial Intelligence</a>` : ui.chip('In Denial Intelligence · clinician only', { tone: 'outline' })) : ''}
      ${c.caps.flag ? flagButton({ id: c.id, label: c.label, flag: c.flag }) : ''}
      <span class="a-owner"><span class="a-owner__l">Owner</span> <b>${esc(own.short)}</b>${own.backup ? ` <span class="a-sub">backup ${esc(own.backup.short)}</span>` : ''}<button type="button" class="ui-linkbtn" data-x="assign" data-ui-return="assign">Change</button></span></div></header>`;
  }

  // ---- the one primary panel
  flow(c) {
    return `<ol class="a-flow" aria-label="Steps to send">${c.flow.steps.map((st, i) => `<li class="a-flow__i${st.done ? ' is-done' : ''}${st.current ? ' is-current' : ''}"${st.current ? ' aria-current="step"' : ''}><span class="a-flow__dot" aria-hidden="true">${st.done ? ui.icon('check', 14) : i + 1}</span><div class="a-flow__c"><div class="a-flow__l">${esc(st.label)}${st.done ? '<span class="ui-sr"> (done)</span>' : ''}</div><div class="a-flow__w">${esc(st.who)}</div><div class="a-flow__d">${esc(st.detail)}</div></div></li>`).join('')}</ol>`;
  }
  btn(x, label, o = {}) { return `<button type="button" class="ui-btn ui-btn--${o.tone || 'primary'}${o.sm ? ' ui-btn--sm' : ''}" data-x="${x}" data-ui-return="${x}"${o.data ? ' ' + o.data : ''}${o.disabled ? ' disabled' : ''}>${esc(label)}</button>`; }
  link(href, label, o = {}) { return `<a class="ui-btn ui-btn--${o.tone || 'secondary'}" href="${esc(href)}"${o.ext ? ' target="_blank" rel="noopener"' : ''}>${esc(label)}${o.ext ? icon('external') : ''}</a>`; }
  why(t) { return `<span class="a-why">${esc(t)}</span>`; }
  primary(c) {
    const r = c.req; const k = c.caps; const st = c.stage; const out = { title: '', chips: '', buttons: [], note: '' };
    const dd = decisionDay(this.s, r.sent, this.s.today, r.payer);
    if (st === 'draft_ready') {
      out.title = 'Review packet';
      out.buttons = [k.clinical ? this.link(this.laurisHref(this.formPath(c)), 'Open in Lauris', { tone: 'primary', ext: true }) : this.btn('x', 'Open in Lauris', { disabled: true }) + this.why('Needs clinician')];
      out.info = 'A person reviews each box in the open Lauris form and presses Process Form. Psyflo records it when the open page shows it.';
    } else if (st === 'needs_approval') {
      out.title = 'Approve for signature';
      out.buttons = [k.approve ? this.btn('approve', 'Approve') : this.btn('x', 'Approve', { disabled: true }) + this.why('Needs designated approver'), k.clinical ? this.link(this.laurisHref(this.formPath(c)), 'Open in Lauris', { ext: true }) : ''];
      out.info = 'One approver checks the packet before anyone signs. The approver and the sender can be different people. The approval is recorded with name and time.';
    } else if (st === 'awaiting_signature') {
      out.title = 'Sign in Lauris';
      out.buttons = [k.clinical ? this.link(this.laurisHref('/approvals'), 'Open Forms to Approve', { tone: 'primary', ext: true }) : this.btn('x', 'Open Forms to Approve', { disabled: true }) + this.why('Needs clinician')];
      out.info = 'An LMHP-type clinician presses Get Signature in Lauris. Psyflo never signs; it records the signer it reads from the open page.';
      if (c.signatureFlag) out.note = `<div class="a-flag" role="alert">${icon('alert')} Signed by ${esc(c.signatureFlag.signer)}${c.signatureFlag.credential ? ', ' + esc(c.signatureFlag.credential) : ''}, who is not on the LMHP-type roster. On hold; Send stays blocked.</div>`;
    } else if (st === 'signed') {
      out.title = 'Send';
      out.buttons = [k.send ? this.btn('send', r.channel === 'fax' ? 'Send by fax' : `Open ${c.channelLabel}`) : this.btn('x', 'Send', { disabled: true }) + this.why('Needs sender')];
      out.info = r.channel === 'fax' ? 'A person presses Send. Psyflo runs the Sfax stub (simulated) and records the reference it returns.' : `A person presses Send. Psyflo opens ${c.channelLabel} in your own login with the packet ready; the open portal page shows the confirmation.`;
    } else if (st === 'sending') {
      out.title = 'Sending'; out.chips = `<span role="status">${icon('hourglass')} Simulated Sfax · reference in a few seconds</span>`;
    } else if (st === 'portal_open') {
      out.title = 'Finish upload';
      out.buttons = [k.send ? this.btn('portal', `Open ${c.channelLabel} again`) : this.why('Needs sender')];
      out.info = 'Upload in your own portal session. The decision clock starts when the open portal page shows the confirmation.';
    } else if (st === 'submitted' || st === 'overdue') {
      out.title = st === 'overdue' ? 'Overdue' : dd ? `Day ${dd.day}` : 'Submitted';
      const call = k.send ? this.btn('log-call', 'Log call', { tone: 'secondary' }) : this.why('Needs sender');
      const dec = k.decide ? this.btn('record-decision', 'Record decision', { tone: st === 'overdue' && !r.overdue_notice_sent ? 'secondary' : 'primary' }) : this.why('Needs clinician');
      const nt = st === 'overdue' && !r.overdue_notice_sent ? (k.send ? this.btn('notice', 'Send notice') : this.why('Needs sender')) : '';
      out.buttons = [nt, dec, call];
      out.info = 'Record the payer decision with its document reference. Day counts run from the day it was sent; each number shows its source.';
    } else if (c.inDI) {
      out.title = { info_requested: 'Information requested', partial_decide: 'Partial award', peer_to_peer_requested: 'Peer-to-peer', peer_to_peer_booked: 'Peer-to-peer', p2p_awaiting: 'Awaiting decision', denied: 'Denied', appeal_sent: 'Appeal sent' }[st] || 'Denial Intelligence';
      out.buttons = [canOpen('DenialCase') || canOpen('Partials') ? this.link(diHref(r), 'Open in Denial Intelligence', { tone: 'primary' }) : this.why('Needs clinician')];
    } else if (st === 'active') {
      if (c.unitTask) {
        out.title = 'Enter units in Lauris';
        out.chips = '<span class="a-sub">A person enters them. Psyflo does not write units.</span>';
        out.buttons = [k.clinical || k.send || k.assign ? this.link(this.laurisHref(this.authPath(c)), 'Open Lauris', { tone: 'primary', ext: true }) : ''];
        out.info = 'A person enters the units on the Lauris Authorizations page. Psyflo does not write units. The task closes when the open Lauris page shows them.';
      } else if (c.renewal && c.renewal.due) {
        out.title = 'Renewal due';
        out.buttons = [k.clinical ? this.link(this.laurisHref(c.laurisNo ? `/consumers/${c.laurisNo}/session/sra-continued` : '/consumers'), 'Start renewal', { tone: 'primary', ext: true }) : this.btn('x', 'Start renewal', { disabled: true }) + this.why('Needs clinician')];
      } else out.title = 'Active';
    } else if (st === 'early_discharge') {
      out.title = 'Transition plan'; out.buttons = [this.btn('open-sec', 'Open plan', { tone: 'primary', data: 'data-sec="transition"' })];
    } else out.title = M.STAGE_LABEL[st] || st;
    return out;
  }
  nextPanel(c) {
    const p = this.primary(c); const d = c.deadline;
    const dl = d.kind !== 'none' ? `<div class="a-next__dl"><span class="a-dl__t a-dl--${d.sev}">${esc(d.text)}</span>${d.sub ? `<span class="a-sub">${esc(d.sub)}</span>` : ''}${d.sev === 'overdue' || d.sev === 'soon' ? ui.statusChip(d.sev, { kind: 'clock' }) : ''}${d.rule ? ui.sourceChip(d.rule) : ''}</div>` : '';
    return `<section class="a-card a-next" aria-labelledby="a-next-h"><div class="a-next__h"><h2 id="a-next-h">Next step</h2>${p.info ? ui.infoPopover({ label: 'How this step works', title: p.title, html: `<p>${esc(p.info)}</p>` }) : ''}</div>${this.flow(c)}
      <div class="a-next__b"><div class="a-next__t">${esc(p.title)}</div>${p.chips}${dl}${p.note}<div class="a-btnrow">${p.buttons.filter(Boolean).join('')}</div></div></section>`;
  }

  // ---- sections (accordions; the open state survives a repaint)
  card(c, key) {
    const { sum, body, chip } = this['sec_' + key](c);
    return `<section class="a-pcard" data-sec="${key}" id="sec-${key}"><div class="a-pcard__h"><h2>${esc(TITLES[key])}</h2>${chip || ''}<span class="a-sec__s">${esc(sum)}</span></div>${body}</section>`;
  }
  flagBanner(c) {
    const f = c.flag; if (!f) return '';
    const note = f.note ? ` · “${esc(f.note)}”` : '';
    return `<div class="a-fban" role="status" id="a-fban"><span class="a-fban__t"><b>Flagged for attention</b> · ${esc(f.reasonLabel || '')} · by ${esc(f.byName || f.byShort || f.by)}, ${esc(fmtDateTime(f.at))}${note}</span><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-flag="${esc(c.id)}">Review flag</button></div>`;
  }
  dl(rows) { return `<dl class="a-dl2">${rows.filter(Boolean).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`; }
  sec_documents(c) {
    const items = c.docs.map(d => {
      const open = d.href ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(d.href)}" target="_blank" rel="noopener">Open${icon('external')}</a>` : d.lauris && this.c.caps.clinical ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(this.laurisHref(`/consumers/${d.lauris.no}/session/${d.lauris.form}`))}" target="_blank" rel="noopener">Open in Lauris${icon('external')}</a>` : '';
      return `<li class="a-doc"><div><b>${esc(d.name)}</b> ${ui.chip(d.kind, { tone: 'neutral', size: 'sm' })}${d.sim ? ui.chip('Simulated', { tone: 'outline', className: 'ui-chip--sim', size: 'sm' }) : ''}<div class="a-sub">${esc(d.status)}${d.when ? ' · ' + esc(dt(d.when)) : ''}${d.note ? ' · ' + esc(d.note) : ''}</div></div><div>${open}</div></li>`;
    }).join('');
    return { sum: `${c.docs.length} item${c.docs.length === 1 ? '' : 's'}`, body: c.docs.length ? `<ul class="a-docs">${items}</ul>` : ui.emptyState({ title: 'No documents yet' }) };
  }
  sec_evidence(c) {
    const e = c.evidence;
    const chips = e.sources.map((x, i) => ui.evidenceChip({ n: i + 1, label: x.label, date: x.date, source: x.source, state: e.clinical ? 'sourced' : 'sensitive', reason: e.clinical ? '' : 'Text needs the clinical-records permission' })).join('');
    const list = (arr, state) => `<ul class="a-ass">${arr.map(m => `<li>${ui.evidenceChip({ state, label: m.label })}</li>`).join('')}</ul>`;
    const counts = e.counts && c.type !== 'initial' && c.type !== 'early_discharge_new_initial' ? this.dl([['Daily notes', `${e.counts.daily} stored · ${e.counts.dailyWindow} in the last ${e.window} days ${ui.sourceChip(e.windowRule)}`], ['Weekly calls', String(e.counts.weekly)], ['Monthly collateral', String(e.counts.monthly)]]) : '';
    const period = e.period ? `<p class="a-sub">The same list the Scan &amp; Enhance panel prints for ${esc(fmtDate(e.period.from))} to ${esc(fmtDate(e.period.to))}.</p>` : '';
    const missing = e.missing.length ? `<h3 class="a-h3">Missing evidence (${e.missing.length})</h3>${list(e.missing, 'missing')}` : '<h3 class="a-h3">Missing evidence</h3><span class="ui-muted">None found in the stored record for this period</span>';
    const future = e.future && e.future.length ? `<h3 class="a-h3">To fix in future notes (${e.future.length})</h3><ul class="a-ass">${e.future.map(m => `<li>${esc(m.label)}</li>`).join('')}</ul>` : '';
    const body = `${e.clinical ? '' : `<div class="a-chips">${ui.chip('Clinical text hidden for your role', { tone: 'outline', icon: 'lock' })}</div>`}${counts}<h3 class="a-h3">Sources</h3><div class="a-chips a-chips--wrap">${chips || '<span class="ui-muted">None stored</span>'}</div>${period}${missing}${future}`;
    const total = e.missing.length + (e.future ? e.future.length : 0);
    return { sum: `${e.sources.length} source${e.sources.length === 1 ? '' : 's'} · ${total} gap${total === 1 ? '' : 's'}${e.missing.length ? ` (${e.missing.length} missing)` : ''}`, body, chip: e.missing.length ? ui.chip(`${e.missing.length} missing`, { tone: 'warning', size: 'sm', icon: 'alert' }) : '' };
  }
  sec_submission(c) {
    const sub = c.submission; const k = c.caps;
    const rows = sub.rows.map(x => [x.k, `${x.href ? `<a href="${esc(x.href)}" target="_blank" rel="noopener">${esc(x.v)}</a>` : esc(x.v)}`]);
    const acts = [sub.canResend ? (k.send ? this.btn('resend', 'Send again', { tone: 'secondary', sm: true }) : this.why('Needs sender')) : '', sub.canNotice ? (k.send ? this.btn('notice', 'Overdue notice', { tone: 'secondary', sm: true }) : '') : ''].filter(Boolean).join('');
    const r = c.req;
    return { sum: r.fax_ref || r.portal_ref ? `${c.channelLabel} · ${r.fax_ref || r.portal_ref}` : r.sent ? `Sent ${fmtDate(String(r.sent).slice(0, 10))} · ${c.channelLabel}` : ['sending', 'portal_open'].includes(c.stage) ? 'Sending' : 'Not sent', chip: ui.maturity('send.packet'), body: `${this.dl(rows)}${acts ? `<div class="a-btnrow">${acts}</div>` : ''}` };
  }
  steps(c) {
    let at = STEP_AT[c.stage] != null ? STEP_AT[c.stage] : 0; if (c.stage === 'active' && c.renewal && c.renewal.due) at = 4;
    return `<ol class="a-steps" aria-label="Where the authorization is">${STEPS.map((x, i) => `<li class="${i < at ? 'done' : i === at ? 'now' : ''}"${i === at ? ' aria-current="step"' : ''}>${esc(x)}</li>`).join('')}</ol>`;
  }
  sec_units(c) {
    const u = c.units; const ur = c.unitRule; const task = c.unitTask; const doneTask = c.tasks.find(t => t.bridge && t.state === 'done');
    const appr = u.awarded != null ? u.awarded : u.offered != null ? u.offered : null; const word = u.awarded != null ? 'approved' : u.offered != null ? 'offered' : 'approved';
    const not = u.requested != null && appr != null && u.requested > appr ? u.requested - appr : null;
    const stat = (v, l, cls = '') => `<div class="a-stat${cls ? ' ' + cls : ''}"><b class="ui-num">${v == null ? '—' : esc(String(v))}</b><span>${esc(l)}</span></div>`;
    const stats = `<div class="a-stats" data-psy="units">${stat(u.requested, 'requested')}${stat(appr, word)}${not ? stat(not, 'not approved', 'is-r') : ''}${stat(u.left, 'remaining')}</div>`;
    const bal = u.total ? ui.unitsBar({ total: u.total, used: u.used, left: u.left, warn: u.warn, warnPct: u.warnPct }) : '<p class="ui-muted">No authorization is recorded in the tracker yet.</p>';
    const rate = u.rate ? `${u.left != null ? `about ${u.daysLeft} school days at ${u.rate.value} a day` : `${u.rate.value} a day`} ${ui.sourceChip(u.rate.rule)}` : 'Not computed for this service';
    const per = c.period && c.period.start && c.period.end ? `${fmtDate(c.period.start)} – ${fmtDate(c.period.end)}` : c.period && c.period.end ? `ends ${fmtDate(c.period.end)}` : '—';
    const ref = c.req.fax_ref || c.req.portal_ref || '';
    const rows = [['Authorization period', `<b>${esc(per)}</b>`], u.total ? ['Units used', `${esc(String(u.used))} of ${esc(String(u.total))} · ${esc(String(u.left))} left`] : null, ['Request', esc(`${KIND_L[c.type] || c.typeLabel}${ref ? ' · ' + ref : ''}`)], ['Service', esc(c.serviceFull || c.service)],
      ['How units count', `${esc(ur.text)} ${ui.sourceChip(ur.rules.bands)}`], ['Payer', esc(c.payerFull)], ['Assigned clinician', esc(c.owner.name)],
      u.total ? ['Pace', rate] : null,
      u.total ? ['In Lauris', esc(u.inLauris === false ? 'Not yet · a person enters them' : u.inLauris ? 'Yes · seen on the open page' : 'Recorded before this tracker')] : null];
    const tk = task ? `<div class="a-task a-task--open">${this.taskBody(task, c)}</div>` : doneTask ? `<div class="a-task a-task--done">${this.taskBody(doneTask.task, c)}</div>` : '';
    return { sum: u.total ? `${u.left} of ${u.total} left` : u.text, chip: task ? ui.chip('Enter in Lauris', { tone: 'warning', size: 'sm', icon: 'clock' }) : '', body: `${this.steps(c)}<div class="a-chips">${ui.statusChip(c.stage)}</div>${stats}${bal}${this.dl(rows.filter(Boolean))}${tk}` };
  }
  taskBody(t, c) {
    const open = t.status === 'open';
    const link = open ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(this.laurisHref(this.authPath(c)))}" target="_blank" rel="noopener">Open Lauris${icon('external')}</a>` : '';
    return `<div class="a-task__h"><b>${open ? 'Enter units in Lauris' : 'Units entered in Lauris'}</b>${ui.chip(open ? 'Open' : 'Closed', { tone: open ? 'warning' : 'success', size: 'sm' })}</div>
      <div>${esc(open ? `Enter ${t.units} units (${fmtDate(t.start)} to ${fmtDate(t.end)}) on the Lauris Authorizations page.` : `${t.observed_available ?? t.units} units seen on the open Lauris page${t.closed_at ? ' · ' + fmtDateTime(t.closed_at) : ''}.`)}</div>
      <div class="a-sub">${open ? 'A person enters them; Psyflo does not write units. The task closes when the open Lauris page shows them.' : 'Closed by an observation of the open Lauris page, not by Psyflo.'}</div>${link}`;
  }
  dli(what, sub, date, sev, chips) {
    const flag = date ? ui.dateFlag({ date: String(date).slice(0, 10), sev, why: [what, sub].filter(Boolean).join(' · ') }) : '';
    return `<div class="a-dli"><div class="a-dli__b"><div class="a-dli__w">${esc(what)}</div>${sub ? `<div class="a-dli__s">${esc(sub)}</div>` : ''}</div>${flag}${chips || ''}</div>`;
  }
  deadlinesCard(c) {
    const items = []; const d = c.deadline; const u = c.units; const rn = c.renewal; const today = this.s.today;
    if (d.kind !== 'none') items.push(this.dli(d.text, d.sub, d.date, d.sev, d.rule ? ui.sourceChip(d.rule) : ''));
    if (u.end && ['active', 'early_discharge'].includes(c.stage) && d.kind !== 'auth_end' && d.kind !== 'renewal') {
      const n = daysBetween(today, u.end); items.push(this.dli('Authorization ends', n < 0 ? `ended ${fmtDate(u.end)}` : `${n} days left · ends ${fmtDate(u.end)}`, u.end, n < 0 ? 'overdue' : n <= 7 ? 'soon' : 'ok', ui.chip('Payer-specific', { tone: 'outline', size: 'sm' })));
    }
    if (rn && rn.dueBy && d.kind !== 'renewal') items.push(this.dli(`Reauth due ${fmtDate(rn.dueBy)}`, `${rn.lead} business days before the current one ends ${fmtDate(rn.end)}`, rn.dueBy, rn.due ? 'soon' : 'ok', rn.rule ? ui.sourceChip(rn.rule) : ''));
    if (!items.length) items.push('<p class="ui-muted">No deadline on this authorization right now.</p>');
    const flagged = c.flag ? ui.chip('Flagged', { tone: 'warning', size: 'sm', icon: 'flag' }) : '';
    return `<section class="a-pcard" data-sec="deadlines" id="sec-deadlines"><div class="a-pcard__h"><h2>Deadlines</h2>${flagged}</div><div class="a-dlr">${items.join('')}</div></section>`;
  }
  renewalCard(c) {
    const rn = c.renewal; const st = c.stage; let chip, lines = [];
    if (!rn) chip = ui.chip(['initial', 'early_discharge_new_initial'].includes(c.type) && !['active', 'closed'].includes(st) ? 'Initial request · not a renewal' : st === 'closed' ? 'Closed' : 'No renewal tracked at this stage', { tone: 'neutral', icon: 'dot' });
    else if (rn.due) chip = ui.chip(rn.byUnits && !rn.byDate ? 'Due · units are low' : 'Due now', { tone: 'warning', icon: 'alert' });
    else chip = ui.chip('Not due yet', { tone: 'success', icon: 'check' });
    if (rn) {
      lines = [['Current ends', rn.end ? esc(fmtDate(rn.end)) : '—'], ['Reauth due by', rn.dueBy ? esc(fmtDate(rn.dueBy)) : '—'], ['Lead time', `${esc(String(rn.lead))} business days ${rn.rule ? ui.sourceChip(rn.rule) : ''}`]];
      if (rn.byUnits && rn.daysLeft != null) lines.splice(2, 0, ['Units last', `about ${esc(String(rn.daysLeft))} school days`]);
    }
    return `<section class="a-pcard" data-sec="renewal" id="sec-renewal"><div class="a-pcard__h"><h2>Renewal status</h2></div><div class="a-chips">${chip}</div>${lines.length ? this.dl(lines) : ''}</section>`;
  }

  // ---- History: every step with who did it, filterable by who, each row opening its facts (the artifact's History block)
  tagHtml(e) {
    const a = HIST_ACTORS[e.kind] || HIST_ACTORS.agent; const text = e.kind === 'staff' && e.name ? `Staff · ${e.name}` : a.label;
    return `<span class="hx__g k-${esc(e.kind)}" data-actor="${esc(e.kind)}" title="${esc(a.legend)}"><span aria-hidden="true">${ui.icon(a.icon, 12)}</span>${esc(text)}</span>`;
  }
  histWhen(at) {
    const d = String(at || '').slice(0, 10); if (!d) return '<span class="hx__w"><b>Earlier</b><span>Before pilot</span></span>';
    const tm = String(at).length > 10 ? M.fmtTime(at) : ''; return `<span class="hx__w"><b>${esc(fmtDate(d))}</b>${tm ? `<span>${esc(tm)}</span>` : ''}</span>`;
  }
  historyBlock(c) {
    const h = c.history; const st = this.state.hist; const cur = st.filter && h.counts[st.filter] ? st.filter : '';
    const list = cur ? h.events.filter(e => e.kind === cur) : h.events;
    const chips = h.total ? `<div class="hx__f" role="group" aria-label="Filter by who did it"><button type="button" class="hx__c" data-hf="" aria-pressed="${!cur}">All <b>${h.total}</b></button>${HIST_ORDER.filter(k => h.counts[k]).map(k => `<button type="button" class="hx__c" data-hf="${k}" aria-pressed="${cur === k}" title="${esc(HIST_ACTORS[k].legend)}"><span aria-hidden="true">${ui.icon(HIST_ACTORS[k].icon, 12)}</span>${esc(HIST_ACTORS[k].label)} <b>${h.counts[k]}</b></button>`).join('')}</div>` : '';
    const rows = list.map(e => `<li class="hx__r" role="button" tabindex="0" data-hist="${esc(e.id)}" aria-label="${esc(e.action)}. Open the details">${this.histWhen(e.at)}<span class="hx__m"><span class="hx__a">${esc(e.action)}${e.sim ? ui.chip('Simulated', { tone: 'outline', className: 'ui-chip--sim', size: 'sm' }) : ''}</span>${e.detail ? `<span class="hx__d">${esc(e.detail)}</span>` : ''}</span><span class="hx__v">View</span>${this.tagHtml(e)}</li>`).join('');
    const add = c.caps.history ? `<div class="hx__add"><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-x="hist-add">${ui.icon('plus', 14)} Add to history</button></div>` : '';
    return `<details class="hx" data-sec="history" id="sec-history"${st.open ? ' open' : ''}><summary><h2 class="hx__t">History</h2><span class="hx__n">${h.total} event${h.total === 1 ? '' : 's'}</span><span class="hx__sp"></span>${ui.icon('chevD', 16)}</summary><div class="hx__b">${add}${chips}${rows ? `<ol class="hx__l" aria-label="History, latest first">${rows}</ol>` : '<div class="hx__e">No events yet.</div>'}</div></details>`;
  }
  openHist(id, opener) {
    const e = this.c.history.events.find(x => x.id === id); if (!e) return;
    const lauris = e.kind === 'lauris' && this.c.caps.clinical ? `<p><a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(this.laurisHref(this.authPath(this.c)))}" target="_blank" rel="noopener">Open in Lauris${icon('external')}</a></p>` : '';
    ui.modal({ title: e.action, size: 'md', returnFocus: opener, body: `<div class="hp"><div class="hp__h">${this.tagHtml(e)}${e.sim ? ui.chip('Simulated', { tone: 'outline', className: 'ui-chip--sim' }) : ''}${ui.chip(e.popKind, { tone: 'neutral' })}</div>${ui.eventDetailHtml(e.raw)}${lauris}</div>`, actions: [{ label: 'Close', tone: 'secondary' }] });
  }
  histAdd(opener) {
    const c = this.c;
    this.form({ title: `Add to history · ${c.id}`, label: 'Add', focus: '#a-h-t',
      body: `<label class="ui-field"><span class="ui-field__l">What happened</span><select class="ui-select" id="a-h-k">${HIST_ENTRY_KINDS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label><label class="ui-field"><span class="ui-field__l">Details</span><textarea class="ui-input" id="a-h-t" rows="3" maxlength="400" placeholder="For example: called the payer, spoke to intake, they will reply by Friday"></textarea><span class="ui-field__h">Recorded with your name and the time. It sends nothing to anyone. No clinical details.</span></label>`,
      run: async d => { const text = d.querySelector('#a-h-t').value.trim(); if (text.length < 3) { toast('Write what happened.', 'err'); d.querySelector('#a-h-t').focus(); return false; } const r = await this.run('history.add', { id: c.id, kind: d.querySelector('#a-h-k').value, text }, 'Added to the history'); return r ? undefined : false; } });
  }
  sec_payer(c) {
    const r = c.req; const k = c.caps; const s = this.s;
    const log = c.payerLog.map(x => `<li><time datetime="${esc(x.at)}">${esc(dt(x.at))}</time><span>${esc(x.what)}${x.doc ? ' · document ' + esc(x.doc) : ''}</span><span class="a-sub">${esc(x.who || '')}${x.sim ? ' · simulated' : ''}</span></li>`).join('');
    const win = [['Channel', `${esc(c.channelLabel)}${r.channel === 'fax' ? ' · Sfax (simulated)' : ' · your own login'}`],
      ['Follow-up call', `Day ${rule(s, 'decision.followup_day', r.payer).value} ${ui.sourceChip(rule(s, 'decision.followup_day', r.payer))}`],
      ['Overdue after', `Day ${rule(s, 'decision.overdue_after_days', r.payer).value} ${ui.sourceChip(rule(s, 'decision.overdue_after_days', r.payer))}`],
      ['Public standard', `${rule(s, 'decision.public_standard_days').value} days, reference only ${ui.sourceChip(rule(s, 'decision.public_standard_days'))}`]];
    const sub = c.submission;
    const acts = [sub.canCall ? (k.send ? this.btn('log-call', 'Log call', { tone: 'secondary', sm: true }) : '') : '', sub.canDecide ? (k.decide ? this.btn('record-decision', 'Record decision', { tone: 'secondary', sm: true }) : this.why('Needs clinician')) : ''].filter(Boolean).join('');
    return { sum: c.payerLog.length ? `${c.payerLog.length} entr${c.payerLog.length === 1 ? 'y' : 'ies'}` : 'No entries', body: `${this.dl(win.map(([a, b]) => [a, b]))}<h3 class="a-h3">Calls and decisions</h3>${log ? `<ul class="a-plog">${log}</ul>` : '<p class="ui-muted">Nothing recorded yet.</p>'}${acts ? `<div class="a-btnrow">${acts}</div>` : ''}` };
  }
  sec_tasks(c) {
    const open = c.tasks.filter(t => t.state === 'open').length;
    const items = c.tasks.map(t => {
      const st = t.state === 'open' ? ui.chip('Open', { tone: 'warning', size: 'sm' }) : t.state === 'done' ? ui.chip('Done', { tone: 'success', size: 'sm' }) : ui.chip(t.state, { tone: 'neutral', size: 'sm' });
      return `<li class="a-trow"><div><b>${esc(t.text)}</b> ${st}${t.bridge ? ui.chip('Closed only by the open Lauris page', { tone: 'outline', size: 'sm' }) : ''}<div class="a-sub">${esc([t.who, t.owner ? 'owner ' + t.owner : '', t.due ? 'due ' + fmtDate(String(t.due).slice(0, 10)) : '', t.detail].filter(Boolean).join(' · '))}</div></div>${t.rule ? ui.sourceChip(t.rule) : ''}</li>`;
    }).join('');
    return { sum: c.tasks.length ? `${open} open of ${c.tasks.length}` : 'None', chip: open ? ui.chip(`${open} open`, { tone: 'info', size: 'sm' }) : '', body: items ? `<ul class="a-tasks">${items}</ul>` : ui.emptyState({ title: 'No open tasks' }) };
  }
  sec_transition(c) {
    const t = c.transition; const k = c.caps; const s = this.s;
    if (!t.relevant) return { sum: 'Not applicable', body: ui.emptyState({ title: 'No transition planned', body: 'Applies after an accepted partial award or when units run out.' }) };
    const p = t.plan; const pl = this.state.plan || (this.state.plan = { discharge: p.discharge, intake: p.intake, new_initial: p.earliest });
    const rows = [['Units run out', fmtDate(p.runout), p.exhausted ? 'from the units log' : `${p.units} at ${p.perDay} a school day from ${fmtDate(p.start)}`], ['Earliest new initial', fmtDate(p.earliest), `30 days after ${fmtDate(p.accepted)}`], ['Discharge', fmtDate(p.discharge), p.discharge === p.runout ? 'the day units end' : 'the Friday before units end'], ['New intake', fmtDate(p.intake), 'next school day'], ['Send new initial', fmtDate(p.send), `decision window ends ${fmtDate(p.decision)}`], ['Gap in service', `${p.gapDays} day${p.gapDays === 1 ? '' : 's'}`, 'school days between discharge and intake']];
    const grid = `<div class="a-kd">${rows.map(([l, v, b]) => `<div class="a-kd__c"><div class="a-kd__l">${esc(l)}</div><div class="a-kd__v">${esc(v)}</div><div class="a-sub">${esc(b)}</div></div>`).join('')}</div>`;
    const ass = `<h3 class="a-h3">Assumptions</h3><ul class="a-ass">${t.assumptions.map(a => `<li>${esc(a.text)} ${ui.sourceChip(a.rule)}</li>`).join('')}</ul>`;
    const edit = k.reply ? `<div class="a-plan"><label class="ui-field"><span class="ui-field__l">Discharge</span><input class="ui-input" type="date" id="a-pl-d" value="${esc(pl.discharge)}"></label><label class="ui-field"><span class="ui-field__l">New intake</span><input class="ui-input" type="date" id="a-pl-i" value="${esc(pl.intake)}"></label><label class="ui-field"><span class="ui-field__l">New initial from</span><input class="ui-input" type="date" id="a-pl-n" value="${esc(pl.new_initial)}"></label>${this.btn('plan', p.saved ? 'Update plan' : 'Set plan', { sm: false })}</div>` : this.why('Needs clinician');
    const di = c.inDI ? `<a class="ui-btn ui-btn--secondary ui-btn--sm" href="${esc(diHref(c.req))}">In Denial Intelligence</a>` : '';
    return { sum: p.saved ? `Plan set · discharge ${fmtDate(p.saved.discharge)}` : 'Proposed', chip: ui.maturity('route.EarlyDischarge'), body: `${grid}${ass}${edit}${di ? `<div class="a-btnrow">${di}</div>` : ''}${p.saved ? `<div class="a-sub">Plan set ${esc(dt(p.saved.at))}. Human-reviewed: Psyflo proposes the dates; a clinician sets them.</div>` : ''}` };
  }

  // ---------------------------------------------------------------------------------------------------------- wiring
  after(root) {
    const H = {
      assign: () => this.assign(), approve: () => this.approve(), send: () => this.send(), portal: () => this.portalAgain(), 'log-call': () => this.logCall(), 'record-decision': () => this.decide(),
      notice: () => this.notice(), resend: () => this.resend(), plan: () => this.setPlan(), 'hist-add': b => this.histAdd(b),
      'open-sec': b => { const k = b.dataset.sec; setTimeout(() => { const d = document.getElementById('sec-' + k); if (d) d.scrollIntoView({ block: 'start' }); }, 30); }
    };
    root.querySelectorAll('[data-x]').forEach(b => { b.onclick = () => { const fn = H[b.dataset.x]; if (fn) fn(b); }; });
    root.querySelectorAll('[data-flag]').forEach(b => { b.onclick = () => this.c && openFlagDialog(this, { id: this.c.id, label: this.c.label, flag: this.c.flag }, b); });
    root.querySelectorAll('[data-hf]').forEach(b => { b.onclick = () => this.setState({ hist: { ...this.state.hist, filter: b.dataset.hf } }); });
    root.querySelectorAll('[data-hist]').forEach(r => { const go = () => this.openHist(r.dataset.hist, r); r.onclick = go; r.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
    const hd = root.querySelector('details[data-sec="history"]'); if (hd) hd.addEventListener('toggle', () => { this.state.hist.open = hd.open; });
    const pl = k => root.querySelector('#a-pl-' + k);
    for (const [k, f] of [['d', 'discharge'], ['i', 'intake'], ['n', 'new_initial']]) { const el = pl(k); if (el) el.onchange = () => { this.state.plan = { ...(this.state.plan || {}), [f]: el.value }; }; }
    if (this.scrollTo) { const k = this.scrollTo; this.scrollTo = null; setTimeout(() => { const d = document.getElementById('sec-' + k); if (d) d.scrollIntoView({ block: 'start' }); }, 60); }
  }
  async run(action, args, ok) { try { const res = await this.do(action, args); if (ok) toast(ok); return res === undefined ? true : res; } catch { return null; } }   // null = refused (the server's reason was toasted)
  form(o) {
    return ui.modal({ title: o.title, size: o.size || 'md', body: o.body, initialFocus: o.focus, onMount: o.onMount,
      actions: [{ label: o.cancel || 'Cancel', tone: 'secondary' }, { label: o.label, tone: o.tone || 'primary', onClick: async h => { try { return await o.run(h.dialog, h); } catch { return false; } } }] });
  }
  facts(c) { return `<dl class="ui-dl"><div class="ui-dl__r"><dt>Student</dt><dd>${esc(c.label)} · ${esc(c.id)}</dd></div><div class="ui-dl__r"><dt>Request</dt><dd>${esc(c.typeLabel)} · ${esc(c.service)} · ${esc(c.units.requested)} units</dd></div><div class="ui-dl__r"><dt>Payer</dt><dd>${esc(c.payer)} · ${esc(c.channelLabel)}</dd></div></dl>`; }

  assign() {
    const c = this.c; const s = this.s;
    this.form({ title: 'Owner', label: 'Save', focus: '#a-as-o',
      body: `<label class="ui-field"><span class="ui-field__l">Owner</span><select class="ui-select" id="a-as-o">${staffOptions(s, c.owner.id)}</select></label><label class="ui-field"><span class="ui-field__l">Backup</span><select class="ui-select" id="a-as-b">${staffOptions(s, c.owner.backup && c.owner.backup.id, 'None')}</select></label>`,
      run: async d => { const owner = d.querySelector('#a-as-o').value; const backup = d.querySelector('#a-as-b').value || null; if (backup && backup === owner) { toast('The backup must be a different person.', 'err'); return false; } const r = await this.run('auth.assign', { id: c.id, owner, backup }, 'Owner saved'); return r ? undefined : false; } });
  }
  approve() {
    const c = this.c; const key = `approve:${c.id}`;
    this.form({ title: `Approve ${c.id}?`, label: 'Approve', focus: '#df-approve-' + c.id,
      body: `${this.facts(c)}<p class="ui-muted">Recorded with your name and the time. Approving is not signing: an LMHP-type clinician still presses Get Signature in Lauris.</p>${ui.draftField({ key, id: 'df-approve-' + c.id, label: 'Comment (optional)', rows: 3 })}`,
      run: async () => { const r = await this.run('request.approve', { id: c.id, comment: ui.draft.get(key, '') }, `${c.id} approved · ready for Get Signature in Lauris`); if (r) { ui.draft.clear(key); return undefined; } return false; } });
  }
  async send() {
    const c = this.c; const r = c.req;
    if (r.channel !== 'fax') { const res = await openPortal(this, 'request.send', { id: c.id }); if (res) toast(`${c.channelLabel} opened in a new tab · upload there`); return; }
    this.form({ title: `Send ${c.id}?`, label: 'Send by fax',
      body: `${this.facts(c)}<dl class="ui-dl"><div class="ui-dl__r"><dt>Packet</dt><dd>Signed SRA${r.pages ? ` · ${esc(r.pages)} pages` : ''}${c.payerId === 'uhc' ? ', CNA, ISP' : ''}</dd></div><div class="ui-dl__r"><dt>Approved</dt><dd>${esc(c.flow.steps[1].detail)}</dd></div><div class="ui-dl__r"><dt>Signed</dt><dd>${esc(c.flow.steps[2].detail)}</dd></div></dl><p class="ui-muted">Faxes through Harvest's Sfax account. The demo runs a stub (Simulated); the reference comes only from it.</p>`,
      run: async () => { const x = await this.run('request.send', { id: c.id }, 'Send pressed · simulated Sfax is faxing'); return x ? undefined : false; } });
  }
  async portalAgain() { const c = this.c; window.open(`${api.config.extURL}/${c.channel}/upload?request=${encodeURIComponent(c.id)}${c.req.info_reply_pending ? '&kind=reply' : ''}`, '_blank', 'noopener'); }
  notice() {
    const c = this.c; const r = c.req; const s = this.s; const me = this.me; const dd = decisionDay(s, r.sent, s.today, r.payer);
    const sent = r.overdue_notice_sent;
    const text = `To: ${c.payerFull} · Utilization Management\nRe: ${c.typeLabel} for member ${c.label} · Medicaid ID on file · ${c.serviceFull}\n\nOur records show this request was submitted on ${r.sent ? fmtDate(r.sent, { year: true }) : 'the date on file'}${r.fax_ref ? ` by fax (Sfax reference ${r.fax_ref})` : r.portal_ref ? ` through the portal (confirmation ${r.portal_ref})` : ''}${r.receipt_confirmed ? `, and receipt was confirmed by phone on ${fmtDate(r.receipt_confirmed, { year: true })}` : ''}. We have not received a decision. Please issue a decision or tell us what is missing.\n\n${me ? me.name + (me.credential ? ', ' + me.credential : '') : 'Harvest staff'} · Harvest Outreach Center`;
    this.form({ title: sent ? `Overdue notice · sent ${fmtDateTime(sent)}` : 'Overdue notice', label: 'Send notice', cancel: sent ? 'Close' : 'Not now', size: 'lg',
      body: `<div class="a-letter">${esc(text)}</div><p class="a-sub">${dd ? `Day ${dd.day}. Harvest tracks day ${dd.overdue_after} for this payer ${ui.sourceChip(rule(s, 'decision.overdue_after_days', r.payer))}. The notice does not cite a legal standard.` : ''}</p><p class="ui-muted">A person reads it and presses Send. The demo runs the send stub (Simulated).</p>`,
      run: async () => { if (sent) return undefined; const x = await this.run('request.overdueNotice', { id: c.id }, 'Overdue notice sent through the simulated Sfax · logged'); return x ? undefined : false; } });
  }
  logCall() {
    const c = this.c; const r = c.req; const s = this.s; const dd = decisionDay(s, r.sent, s.today, r.payer); const key = `call:${c.id}`;
    const script = `"I'm calling to confirm you received a ${c.typeLabel} for member ${c.label}, ${r.fax_ref ? `faxed ${dt(r.sent)}, Sfax reference ${r.fax_ref}${r.pages ? ', ' + r.pages + ' pages' : ''}` : `uploaded ${dt(r.sent)}${r.portal_ref ? ', confirmation ' + r.portal_ref : ''}`}. Can you confirm it is in clinical review?"`;
    this.form({ title: `Follow-up call${dd ? ` · day ${dd.day}` : ''}`, label: 'Log call', focus: '#a-call-o',
      body: `<details class="a-script"><summary>Call script</summary><p>${esc(script)}</p></details><label class="ui-field"><span class="ui-field__l">What the payer said</span><select class="ui-select" id="a-call-o">${CALL_OPTIONS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>${ui.draftField({ key, id: 'df-call-' + c.id, label: 'Note (optional)', rows: 3 })}<p class="a-sub">A person calls and types the outcome. Psyflo does not dial.</p>`,
      run: async d => { const r2 = await this.run('auth.logCall', { id: c.id, outcome: d.querySelector('#a-call-o').value, note: ui.draft.get(key, '') }, 'Call logged'); if (r2) { ui.draft.clear(key); return undefined; } return false; } });
  }
  decide() {
    const c = this.c; const s = this.s; const key = `dec:${c.id}`;
    this.form({ title: 'Record decision', label: 'Record', focus: '#a-d-o', size: 'md',
      body: `<label class="ui-field"><span class="ui-field__l">Outcome</span><select class="ui-select" id="a-d-o">${OUTCOMES.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>
        <label class="ui-field" id="a-d-uw"><span class="ui-field__l">Units</span><input class="ui-input" id="a-d-u" type="number" min="1" max="${esc(c.units.requested)}" value="${esc(c.units.requested)}" style="width:140px"><span class="ui-field__h">${esc(c.units.requested)} requested</span></label>
        <label class="ui-field"><span class="ui-field__l">Document reference</span><input class="ui-input" id="a-d-r" type="text" autocomplete="off" placeholder="Letter, fax or portal reference"><span class="ui-field__h">Required. A decision is recorded only with its document.</span></label>
        <label class="ui-field"><span class="ui-field__l">Date on the document</span><input class="ui-input" id="a-d-t" type="date" max="${esc(s.today)}" value="${esc(s.today)}" style="width:180px"></label>
        <label class="ui-field" id="a-d-xw" hidden><span class="ui-field__l">Reason given</span><input class="ui-input" id="a-d-x" type="text" autocomplete="off"></label>
        <p class="a-sub">Write-once. A correction needs a reason and keeps the earlier record.</p>`,
      onMount: d => { const o = d.querySelector('#a-d-o'); const sync = () => { d.querySelector('#a-d-uw').hidden = o.value === 'denied'; d.querySelector('#a-d-xw').hidden = o.value !== 'denied'; const u = d.querySelector('#a-d-u'); if (o.value === 'partial' && +u.value >= c.units.requested) u.value = Math.max(1, Math.round(c.units.requested * 0.6)); if (o.value === 'approved') u.value = c.units.requested; }; o.onchange = sync; sync(); },
      run: async d => {
        const outcome = d.querySelector('#a-d-o').value; const ref = d.querySelector('#a-d-r').value.trim();
        if (ref.length < 3) { toast('Enter the document reference first.', 'err'); d.querySelector('#a-d-r').focus(); return false; }
        const r2 = await this.run('auth.recordDecision', { id: c.id, outcome, units: outcome === 'denied' ? undefined : +d.querySelector('#a-d-u').value, doc_ref: ref, received: d.querySelector('#a-d-t').value, reason_text: d.querySelector('#a-d-x').value }, outcome === 'approved' ? 'Decision recorded · units are in the tracker; a person enters them in Lauris' : outcome === 'partial' ? 'Decision recorded · decide in Denial Intelligence' : 'Decision recorded · guardian-led appeal window opened');
        return r2 ? undefined : false;
      } });
  }
  resend() {
    const c = this.c; const key = `resend:${c.id}`;
    this.form({ title: `Send ${c.id} again?`, label: 'Send again', focus: '#df-resend-' + c.id,
      body: `${this.facts(c)}${ui.draftField({ key, id: 'df-resend-' + c.id, label: 'Why', rows: 2, placeholder: 'For example: the payer says the fax did not arrive' })}<p class="a-sub">The decision clock keeps its first send date. A person presses Send; the stub returns a reference.</p>`,
      run: async () => { const reason = ui.draft.get(key, '').trim(); if (reason.length < 4) { toast('Say why the packet is being sent again.', 'err'); return false; } const x = await this.run('request.resend', { id: c.id, reason }, 'Sent again · logged'); if (!x) return false; ui.draft.clear(key); if (x.open) window.open(`${api.config.extURL}${x.open}`, '_blank', 'noopener'); return undefined; } });
  }
  async setPlan() {
    const c = this.c; const s = this.s; const p = this.state.plan || {}; const t = c.transition.plan; const who = c.owner.id || 'jperez'; const cl = c.label.split(',')[0]; const pf = c.payer;
    const d = p.discharge || t.discharge, i = p.intake || t.intake, n = p.new_initial || t.earliest;
    const rem = (due, text) => ({ for: who, kind: 'early_discharge', due, text });
    const r = await this.run('plan.set', { request: c.id, client: c.clientId, discharge: d, intake: i, new_initial: n, reminders: [rem(t.reminder, `Discharge summary and new CNA · ${cl}`), rem(d, `Discharge ${cl} in Lauris · summary pre-filled from notes`), rem(i, `New intake · ${cl} · CNA, ISP, initial SRA`), rem(i, `Send the new initial to ${pf} · ${cl}`)] }, `Plan set · discharge ${fmtDate(d)} · new intake ${fmtDate(i)} · 4 reminders`);
    if (r !== null) this.state.plan = null;
  }
});
