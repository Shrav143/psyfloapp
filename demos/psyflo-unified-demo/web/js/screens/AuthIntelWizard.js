// Analyze a case (R7, Oprox parity A-06; clinician only): a side drawer that takes a case in, reads the authorization status, shows a de-identified preview, runs a streaming
// analysis and opens the results in three tabs (Clinical trajectory, Payer criteria, Denial-prevention actions). Never a page of its own.
//
//   openAnalyze(screen, opener)   the drawer. Source: a stored consumer (default) or pasted notes (+ a file name; nothing leaves the browser).
//   AW_CSS                        the Authorizations list joins it
//
// What it does and does not do:
//   · A stored consumer: the status panel is computed from the stored authorization and the clock; the three tabs are the same views as the case page (trajectoryOf, criteriaView,
//     the suggestions with an Urgent card computed from the units). Every sentence comes from stored records (shared/sel/auth-intel.js).
//   · Pasted notes: the text is only scanned for unit counts and days ("Psyflo read: 48 units approved · 38 used ..." for the person to confirm); no clinical claim is drawn from
//     it, there is no trajectory and no suggestion list without a stored record, and the preview shows the text with identifiers removed (names cannot be found, so it says so).
//   · The member ID and group number are used only to remove them from the notes. They are not stored, not logged and not shown again.
//   · The streaming steps are a simulated progress display (marked Simulated); the findings are computed. The run is logged (intel.event analyze) with no text in the log.
import { esc, ui } from '../app.js';
import { byId, payer as payerOf, payerShort } from '../shared/model.js';
import * as asam from '../shared/asam.js';
import { fmtDate } from '../shared/dates.js';
import { ANALYSIS_STEPS, authStatusOf, urgentOf, readStatusText, scrubText, previewOf, trajectoryOf, criteriaView, submitOf } from '../shared/sel/auth-intel.js';
import { payerPattern } from '../shared/intel.js';
import { trajectoryHtml, chipper } from './AuthIntel.js';
import { criteriaHtml, recsFor, openRecs, mayRecs } from './AuthRecs.js';

const PLANS = ['Medicaid managed care', 'HMO', 'PPO', 'EPO', 'Fee for service', 'Other'];
const TABS = [['traj', 'Clinical trajectory'], ['crit', 'Payer criteria'], ['acts', 'Denial-prevention actions']];

const field = (id, label, control, hint = '', only = '') => `<label class="ui-field" for="${id}"><span class="ui-field__l">${esc(label)}</span>${control}${hint ? `<span class="ui-field__h"${only ? ' data-stored-only' : ''}>${esc(hint)}</span>` : ''}</label>`;
const options = (list, cur, head) => (head != null ? `<option value="">${esc(head)}</option>` : '') + list.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(l)}</option>`).join('');
const dl = rows => `<dl class="ui-sdl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

export function openAnalyze(screen, opener) {
  if (!mayRecs(screen.me)) return null;
  const s0 = screen.s; const reqs = (s0.requests || []).filter(r => byId(s0.clients || [], r.client));
  const pick = reqs.find(r => authStatusOf(s0, r).urgent) || reqs[0] || null;
  const st = { ref: '', source: 'stored', reqId: pick ? pick.id : '', text: '', file: '', payer: pick ? pick.payer : '', plan: '', member: '', group: '', level: pick ? asam.requestLevel(pick) || '' : '', ctx: '', tab: 'traj', phase: 'form' };
  let h = null; let run = null; let actionsPanel = null;
  const S = () => screen.s;
  const reqOf = () => (st.source === 'stored' ? byId(S().requests || [], st.reqId) : null);
  const btn = () => h && h.dialog.querySelector('[data-ui-action="0"]');
  const setBtn = (label, disabled, tone) => { const b = btn(); if (!b) return; b.textContent = label; b.disabled = !!disabled; if (tone) b.className = `ui-btn ui-btn--${tone}`; };

  // ---- the form
  const formHtml = () => {
    const stored = st.source === 'stored'; const clients = S().clients || [];
    const reqOpts = reqs.map(r => { const c = byId(clients, r.client); return [r.id, `${c ? c.initials : r.client}${c && (c.harvest_no || c.lauris_no) ? ` · Lauris #${c.harvest_no || c.lauris_no}` : ''} · ${payerShort(S(), r.payer)}`]; });
    return `<form class="aw" id="aw-form" novalidate>
      <p class="in-ds aw-safe" role="note">${ui.icon('lock', 16)}<span>HIPAA-safe mode: common identifiers are removed before analysis. Do not enter a client name.</span></p>
      ${field('aw-ref', 'Case reference', `<input class="ui-input" id="aw-ref" maxlength="60" autocomplete="off" placeholder="For example: IOP-UNIT-001" value="${esc(st.ref)}">`, 'Internal use only. Do not enter a client name.')}
      <fieldset class="aw-src"><legend class="ui-field__l">Where does the case come from?</legend>
        <label><input type="radio" name="aw-src" value="stored"${stored ? ' checked' : ''}> A stored consumer</label>
        <label><input type="radio" name="aw-src" value="notes"${stored ? '' : ' checked'}> Pasted notes</label></fieldset>
      <div id="aw-stored"${stored ? '' : ' hidden'}>${field('aw-req', 'Consumer', `<select class="ui-select" id="aw-req">${options(reqOpts, st.reqId)}</select>`, 'Initials only. The analysis reads the stored authorization, assessments and records.')}</div>
      <div id="aw-notes"${stored ? ' hidden' : ''}>${field('aw-text', 'Pasted notes', `<textarea class="ui-textarea" id="aw-text" rows="6" maxlength="6000" placeholder="Paste the payer notice or authorization notes. Psyflo only scans them for unit counts and days.">${esc(st.text)}</textarea>`, 'Nothing here is stored. No clinical claim is drawn from pasted text.')}
        ${field('aw-file', 'Or choose a file', `<input class="ui-input" id="aw-file" type="file" accept=".pdf,.docx,.txt">`, `Only the file name is kept; nothing leaves your browser.${st.file ? ` Chosen: ${st.file}.` : ''}`)}</div>
      <div class="aw-grid">
        ${field('aw-payer', 'Payer', `<select class="ui-select" id="aw-payer"${stored ? ' disabled' : ''}>${options((S().payers || []).map(p => [p.id, p.name]), st.payer, 'Select payer')}</select>`, 'From the stored request.', 'stored')}
        ${field('aw-plan', 'Plan type', `<select class="ui-select" id="aw-plan">${options(PLANS.map(x => [x, x]), st.plan, 'Select plan type')}</select>`)}
        ${field('aw-member', 'Member ID', `<input class="ui-input" id="aw-member" maxlength="40" autocomplete="off" placeholder="ABC123456789" value="${esc(st.member)}">`, 'Removed before analysis. Never stored.')}
        ${field('aw-group', 'Group number', `<input class="ui-input" id="aw-group" maxlength="40" autocomplete="off" placeholder="GRP-00000" value="${esc(st.group)}">`, 'Removed before analysis. Never stored.')}
        ${field('aw-level', 'Level of care', `<select class="ui-select" id="aw-level"${stored ? ' disabled' : ''}>${options(asam.LEVELS.map(l => [l.id, asam.levelName(l.id)]), st.level, 'Select level of care')}</select>`, 'From the stored request.', 'stored')}
      </div>
      ${field('aw-ctx', 'Payer context (optional)', `<textarea class="ui-textarea" id="aw-ctx" rows="3" maxlength="1500" placeholder="Anything about the payer you want considered: portal, submission requirements, criteria notes.">${esc(st.ctx)}</textarea>`, 'Your own words. Use this instead of, or with, the fields above.')}
      <section class="aw-panel" id="aw-status" aria-live="polite"></section>
      <section class="aw-panel" id="aw-prev"></section>
      <p class="aw-msg" id="aw-msg" role="alert"></p></form>`;
  };
  const statusHtml = () => {
    const head = `<h3>Authorization status</h3>`;
    if (st.source === 'stored') {
      const r = reqOf(); if (!r) return '';
      const a = authStatusOf(S(), r);
      if (a.approved == null) return `${head}<p class="ai-empty">${esc(a.action)}</p>`;
      const exp = a.expires ? `${esc(fmtDate(a.expires))} · ${a.daysToExpiry < 0 ? `ended ${-a.daysToExpiry} ${-a.daysToExpiry === 1 ? 'day' : 'days'} ago` : `${a.daysToExpiry} ${a.daysToExpiry === 1 ? 'day' : 'days'} from today`}` : 'No end date is recorded';
      return `${head}${a.urgent ? ui.chip('Urgent', { tone: 'danger', icon: 'alert', size: 'sm' }) : ''}${dl([['Current authorization', `${a.approved} units approved`], ['Units used', `${a.used} of ${a.approved}`], ['Units remaining', String(a.remaining)], ['Authorization expires', exp], ['Action required', esc(a.action)]])}<p class="ai-sub">Computed from the stored authorization and the demo clock.</p>`;
    }
    const rd = readStatusText(`${st.text}\n${st.ctx}`);
    if (!st.text.trim() && !st.ctx.trim()) return `${head}<p class="ai-empty">Paste the notice or notes, or write the unit counts in the payer context, to see the authorization status.</p>`;
    return `${head}${rd.found ? dl([['Units approved', rd.approved != null ? String(rd.approved) : 'Not found'], ['Units used', rd.used != null ? String(rd.used) : 'Not found'], ['Units remaining', rd.remaining != null ? String(rd.remaining) : 'Not found'], ['Expires', rd.days != null ? `in ${rd.days} ${rd.days === 1 ? 'day' : 'days'}` : 'Not found']]) : ''}<p class="aw-read" data-read>${esc(rd.text)}</p>`;
  };
  const previewHtml = () => {
    const head = `<h3>Admission summary ${ui.chip('De-identified preview', { tone: 'outline', size: 'sm' })}</h3>`;
    if (st.source === 'stored') { const r = reqOf(); if (!r) return ''; return `${head}<ul class="aw-pv">${previewOf(S(), r).lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`; }
    if (!st.text.trim()) return `${head}<p class="ai-empty">The preview appears once you paste notes.</p>`;
    return `${head}<pre class="aw-pre" data-preview>${esc(scrubText(st.text, [st.member, st.group]).slice(0, 700))}</pre><p class="ai-sub">Email addresses, phone numbers, long numbers and the member ID and group number you typed are removed. Names cannot be found automatically: check this preview and take any name out of the notes.</p>`;
  };
  const paintPanels = () => { const d = h && h.dialog; if (!d) return; const a = d.querySelector('#aw-status'); const b = d.querySelector('#aw-prev'); if (a) a.innerHTML = statusHtml(); if (b) b.innerHTML = previewHtml(); d.querySelectorAll('[data-stored-only]').forEach(x => { x.hidden = st.source !== 'stored'; }); };
  const read = () => {
    const d = h.dialog; const v = id => { const e = d.querySelector('#' + id); return e ? e.value : ''; };
    st.ref = v('aw-ref'); st.reqId = v('aw-req') || st.reqId; st.text = v('aw-text'); st.plan = v('aw-plan'); st.member = v('aw-member'); st.group = v('aw-group'); st.ctx = v('aw-ctx');
    if (st.source === 'notes') { st.payer = v('aw-payer'); st.level = v('aw-level'); }
  };

  // ---- the results
  const urgentHtml = () => {
    const r = reqOf(); let u = null;
    if (r) u = urgentOf(S(), r);
    else { const rd = readStatusText(`${st.text}\n${st.ctx}`); if (rd.days != null && rd.days <= 14) u = { title: `Urgent: the authorization expires in ${rd.days} ${rd.days === 1 ? 'day' : 'days'}`, lines: [rd.remaining != null ? `${rd.remaining} units remain, as written in your text.` : 'The unit counts were not found in your text.', 'Check the date against the payer\'s own notice.'] }; }
    return u ? `<section class="aw-urgent" data-urgent><h3>${ui.icon('alert', 16)} ${esc(u.title)}</h3><ul>${u.lines.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '';
  };
  const noRecord = what => `<p class="ai-empty">Pasted notes have no stored record behind them, so Psyflo draws no clinical claim from them and has no ${what}. Choose a stored consumer to see it.</p>`;
  const tabBody = key => {
    const r = reqOf(); const s = S();
    if (key === 'traj') return r ? trajectoryHtml(s, r, trajectoryOf(s, r)) : `${ui.decisionSupport()}${noRecord('trajectory to show')}`;
    if (key === 'crit') {
      if (r) return criteriaHtml(criteriaView(s, r));
      const pat = st.payer ? payerPattern(s, st.payer) : null;
      return `<div class="ai-pp">${ui.decisionSupport()}${pat ? dl([['Payer', esc(pat.name)], ['What it tends to ask, payer notes on file', esc(pat.tends || 'Nothing is recorded yet.')], ['What has worked', esc(pat.works || 'Nothing is recorded yet.')], ['Approval rate in the sample', pat.approvalPct != null ? `${pat.approvalPct}% ${ui.sampleChip()}` : 'Not in the sample']]) : '<p class="ai-empty">Choose a payer to see what is on file for it.</p>'}${noRecord('rows to compare with the criteria')}</div>`;
    }
    return `<div class="aw-acts">${urgentHtml()}<div id="aw-recs">${r ? '' : noRecord('suggestions to build')}</div></div>`;
  };
  const paintRecs = () => {
    const r = reqOf(); const host = h.dialog.querySelector('#aw-recs'); if (!r || !host) return;
    const s = S(); const ch = chipper(s, r);
    host.innerHTML = ui.recPanel(recsFor(s, r.id), { s, scope: 'auth', ref: r.id, chips: x => ch(x.evidence), canAct: true, heading: 'Denial-prevention actions',
      footer: (() => { const x = submitOf(s, r, recsFor(s, r.id)); return { submit: { label: x.label, disabled: !x.ok, reason: x.reason }, refine: true, context: true, dismissAll: true }; })() });
    ui.bindRecPanel(host, { scope: 'auth', ref: r.id, call: (a, x) => screen.do(a, x), onChange: async () => { paintRecs(); if (screen.afterRecs) screen.afterRecs(); },
      onSubmit: () => { h.close('submit'); if (screen.onSubmit) screen.onSubmit(r.id); else screen.go('Authorization', { id: r.id, section: 'submission' }); } });
    actionsPanel = host;
  };
  const showTab = key => {
    st.tab = key; const d = h.dialog;
    d.querySelectorAll('[role="tab"]').forEach(t => { const on = t.dataset.tab === key; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    const p = d.querySelector('#aw-panel'); if (!p) return; p.setAttribute('aria-labelledby', `aw-tab-${key}`); p.innerHTML = tabBody(key);
    if (key === 'acts') paintRecs();
  };
  const resultsHtml = () => {
    const r = reqOf(); const pn = st.payer ? payerOf(S(), st.payer).name : 'No payer chosen';
    const lvl = st.level ? asam.levelName(st.level) : 'No level of care chosen';
    return `<div class="aw-res"><div class="aw-res__h"><div><h3 id="aw-res-h" tabindex="-1">Analysis results</h3><p class="ai-sub"><b>${esc(st.ref.trim() || 'No reference')}</b> · ${esc(pn)}${st.plan ? ` · ${esc(st.plan)}` : ''} · ${esc(lvl)}${r ? '' : ' · pasted notes'}</p></div>${ui.maturity('intel.analysis')}</div>
      <div class="aw-tabs" role="tablist" aria-label="Analysis results">${TABS.map(([k, l]) => `<button type="button" role="tab" class="aw-tab" id="aw-tab-${k}" data-tab="${k}" aria-selected="${k === st.tab}" aria-controls="aw-panel" tabindex="${k === st.tab ? 0 : -1}">${esc(l)}</button>`).join('')}</div>
      <div class="aw-tabpanel" id="aw-panel" role="tabpanel" aria-labelledby="aw-tab-${st.tab}" tabindex="0"></div></div>`;
  };

  // ---- phases
  const toForm = () => { if (run) run.cancel(); run = null; st.phase = 'form'; h.update({ body: formHtml() }); paintPanels(); setBtn('Run analysis', false, 'primary'); const f = h.dialog.querySelector('#aw-ref'); if (f) f.focus(); };
  const toResults = () => { st.phase = 'results'; h.update({ body: resultsHtml() }); showTab(st.tab); setBtn('Edit inputs', false, 'secondary'); const t = h.dialog.querySelector('#aw-res-h'); if (t) t.focus(); };
  const start = () => {
    read(); const msg = h.dialog.querySelector('#aw-msg');
    if (st.source === 'stored' && !reqOf()) { msg.textContent = 'Choose a consumer first.'; return; }
    if (st.source === 'notes' && !st.text.trim() && !st.file) { msg.textContent = 'Paste the notes or choose a file first, or switch to a stored consumer.'; h.dialog.querySelector('#aw-text').focus(); return; }
    screen.do('intel.event', { kind: 'analyze', scope: 'auth', ref: reqOf() ? reqOf().id : undefined }).catch(() => null);   // logged with no text
    st.phase = 'run'; st.member = ''; st.group = '';   // the member ID and group number have done their job: they are not kept
    h.update({ body: `<div class="aw-run"><h3>Analyzing</h3><p class="ai-sub">${ui.maturity('intel.analysis')} The steps are a progress display; the findings are computed from the stored record.</p><div id="aw-steps"></div></div>` });
    setBtn('Analyzing...', true);
    run = ui.runSteps(h.dialog.querySelector('#aw-steps'), ANALYSIS_STEPS, { interval: 520, label: 'Analysis steps' });
    run.done.then(ok => { if (ok && h && h.dialog.isConnected && st.phase === 'run') toResults(); });
  };

  h = ui.drawer({ title: 'Analyze a case', body: formHtml(), className: 'ai-dw aw-dw', returnFocus: opener || null,
    actions: [{ label: 'Run analysis', tone: 'primary', keepOpen: true, onClick: () => { if (st.phase === 'form') start(); else if (st.phase === 'results') toForm(); return false; } }],
    onClose: () => { if (run) run.cancel(); },
    onMount: (dlg, hh) => {
      h = hh; paintPanels();
      dlg.addEventListener('input', e => { if (st.phase !== 'form') return; read(); if (e.target.matches('#aw-text,#aw-ctx,#aw-member,#aw-group')) paintPanels(); });
      dlg.addEventListener('change', e => {
        const t = e.target;
        if (t.name === 'aw-src') { st.source = t.value; read(); dlg.querySelector('#aw-stored').hidden = st.source !== 'stored'; dlg.querySelector('#aw-notes').hidden = st.source === 'stored'; dlg.querySelector('#aw-payer').disabled = dlg.querySelector('#aw-level').disabled = st.source === 'stored'; dlg.querySelectorAll('[data-stored-only]').forEach(x => { x.hidden = st.source !== 'stored'; }); if (st.source === 'stored') syncFromRequest(); paintPanels(); }
        else if (t.id === 'aw-req') { read(); syncFromRequest(); paintPanels(); }
        else if (t.id === 'aw-file') { st.file = t.files && t.files[0] ? t.files[0].name : ''; const hint = t.closest('label').querySelector('.ui-field__h'); if (hint) hint.textContent = `Only the file name is kept; nothing leaves your browser.${st.file ? ` Chosen: ${st.file}.` : ''}`; }
        else if (t.id === 'aw-payer' || t.id === 'aw-level') read();
      });
      dlg.addEventListener('click', e => {
        const tab = e.target.closest('[role="tab"]'); if (tab) { showTab(tab.dataset.tab); return; }
        const b = e.target.closest('[data-see]'); if (b) { const r = reqOf(); if (r) openRecs(screen, r.id, { opener: b, focusKey: b.dataset.see }); }
      });
      dlg.addEventListener('keydown', e => {
        const tab = e.target.closest && e.target.closest('[role="tab"]'); if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        const ks = TABS.map(x => x[0]); let i = ks.indexOf(tab.dataset.tab); i = e.key === 'Home' ? 0 : e.key === 'End' ? ks.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ks.length) % ks.length;
        e.preventDefault(); showTab(ks[i]); dlg.querySelector(`#aw-tab-${ks[i]}`).focus();
      });
    } });
  // choosing another stored consumer: the payer and the level follow the stored request
  function syncFromRequest() { const r = reqOf(); if (!r || !h) return; st.payer = r.payer; st.level = asam.requestLevel(r) || ''; const d = h.dialog; const p = d.querySelector('#aw-payer'); const l = d.querySelector('#aw-level'); if (p) p.value = st.payer; if (l) l.value = st.level; }
  return h;
}

export const AW_CSS = `
.aw{display:flex;flex-direction:column;gap:var(--sp-3)}
.aw-safe{margin:0}
.aw-src{border:0;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 18px}.aw-src legend{width:100%;padding:0;margin-bottom:4px}
.aw-src label{display:inline-flex;align-items:center;gap:8px;min-height:32px;font-size:var(--fs-14)}
.aw-src input{width:18px;height:18px;accent-color:var(--teal-600)}
.aw-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.aw .ui-select,.aw .ui-input,.aw .ui-textarea{width:100%;max-width:none}
.aw-panel{padding:12px 14px;border:1px solid var(--line-200);border-radius:var(--r-2);background:var(--paper-50)}
.aw-panel:empty{display:none}
.aw-panel h3{margin:0 0 8px;font:600 var(--fs-14)/1.3 var(--font);display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px}
.aw-panel .ui-sdl{margin:8px 0 6px}
.aw-pv{margin:0;padding-left:18px;font-size:var(--fs-13);display:flex;flex-direction:column;gap:4px}
.aw-pre{margin:0;padding:10px;border:1px solid var(--line-200);border-radius:var(--r-2);background:var(--surface-0);white-space:pre-wrap;overflow-wrap:anywhere;font:var(--fs-13)/1.45 var(--font)}
.aw-read{margin:6px 0 0;font-size:var(--fs-13);font-weight:600}
.aw-msg{margin:0;min-height:1em;color:var(--danger-fg);font-size:var(--fs-13)}
.aw-run{display:flex;flex-direction:column;gap:var(--sp-3)}.aw-run h3,.aw-res h3{margin:0;font:600 var(--fs-18)/1.3 var(--font)}
.aw-res{display:flex;flex-direction:column;gap:var(--sp-3)}.aw-res__h{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:8px}.aw-res__h p{margin:4px 0 0}
.aw-tabs{display:flex;flex-wrap:wrap;gap:6px;border-bottom:1px solid var(--line-200)}
.aw-tab{min-height:44px;padding:8px 12px;border:0;border-bottom:3px solid transparent;background:none;font:600 var(--fs-14) var(--font);color:var(--muted-700);cursor:pointer}
.aw-tab[aria-selected=true]{color:var(--teal-700);border-bottom-color:var(--teal-600)}
.aw-tabpanel{min-width:0}
.aw-acts{display:flex;flex-direction:column;gap:var(--sp-3)}
.aw-urgent{padding:12px 14px;border:1px solid #E8B7AB;border-left-width:4px;border-radius:var(--r-2);background:var(--danger-bg);color:var(--danger-fg)}
.aw-urgent h3{display:flex;gap:8px;align-items:center;margin:0 0 6px;font:600 var(--fs-16)/1.3 var(--font)}.aw-urgent ul{margin:0;padding-left:18px;font-size:var(--fs-13);display:flex;flex-direction:column;gap:3px}
@media (max-width:767px){.aw-dw .ui-dialog__f .ui-btn,.aw .ui-select,.aw .ui-input{min-height:44px}}
@media (max-width:560px){.aw-grid{grid-template-columns:1fr}.aw-src label{min-height:44px}.aw .ui-btn,.aw-acts .ui-btn{min-height:44px}}
`;
