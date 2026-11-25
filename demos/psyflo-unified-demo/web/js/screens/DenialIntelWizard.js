// Analyze a denial (R7, D-04): a three-step wizard in one side drawer, opened from the queue's header.
//   1  Add the denial letter and/or clinical documentation. Either one is enough. Each tile takes a stored document of that kind (the case's decision notice, the ASAM
//      assessments and finished documents on file) or a local file. A file is NEVER read or sent: only its name is kept (the input is cleared the moment the name is taken).
//   2  Add any additional context (optional). The clinician's own words; member numbers, names, phone numbers and birth dates are removed before analysis.
//   3  The sanitized clinical record (initials only, the parsed fields of D-06), then two streaming lists (ui.runSteps): "Reading and digesting the record" and
//      "Cross-referencing historical appeals" (a labelled sample). When both finish the analysis is recorded (dispute.analyze, intel.event intake) and the appeal analysis opens.
// Everything shown comes from sel/denial-intel.js intakeModel: counts from stored records, never a clinical claim. Clinicians only (the button is not drawn for any other role).
import { ui, api, M } from '../app.js';
import * as D from '../shared/sel/disputes.js';
import * as I from '../shared/sel/denial-intel.js';
import { openAnalysis } from './DenialIntelDoc.js';

const e = t => ui.esc(t);
const SLOTS = [['letter', 'Denial letter', 'a decision notice on file'], ['clinical', 'Clinical documentation', 'an assessment or document on file']];

export function openIntake({ me, el, ref = '' }) {
  if (!D.canReadClinical(me)) return null;
  const cases = () => ui.sortRows(D.queueRows(api.state, {}), { key: 'deadline', dir: 'asc' }, D.queueGetters);
  const first = cases()[0];
  const st = { step: 1, ref: ref || (first ? first.request : ''), letter: null, clinical: null, context: '', runs: [], done: false };
  const dp = () => { const s = api.state; const r = M.byId(s.requests, st.ref); return { s, r, d: r ? D.byRequest(s, st.ref) : null }; };
  let h;

  const steps = n => `<ol class="d-wz__steps" aria-label="Steps">${['Add the record', 'Add context', 'Analysis'].map((t, i) => `<li${i + 1 === n ? ' aria-current="step"' : ''} class="${i + 1 < n ? 'is-done' : i + 1 === n ? 'is-now' : ''}"><span aria-hidden="true">${i + 1}</span> ${e(t)}</li>`).join('')}</ol>`;
  const tile = (slot, label, hint) => {
    const { s, r, d } = dp(); const opts = I.intakeOptions(s, d, r)[slot === 'letter' ? 'letters' : 'clinical']; const got = st[slot];
    const sel = opts.length ? `<label for="d-wz-${slot}-s">Stored document</label><select class="ui-select" id="d-wz-${slot}-s" data-wz-stored="${slot}"><option value="">Choose ${e(hint)}</option>${opts.map(o => `<option value="${e(o.ref)}"${got && got.via === 'stored' && got.ref === o.ref ? ' selected' : ''}>${e(o.name)}</option>`).join('')}</select>`
      : `<p class="d-an__sub">No stored ${slot === 'letter' ? 'decision letter' : 'document'} is on file for this case.</p>`;
    return `<fieldset class="d-wz__tile" data-slot="${slot}"><legend>${e(label)}</legend>
      ${got ? `<p class="d-wz__got" data-got="${slot}">${ui.icon('check', 16)}<span><b>${e(got.name)}</b>${got.via === 'file' ? ' <span class="d-an__sub">(file name only)</span>' : ''}</span><button type="button" class="ui-btn ui-btn--ghost ui-btn--sm" id="d-wz-${slot}-x" data-wz-clear="${slot}" aria-label="Remove the ${e(label.toLowerCase())}">Remove</button></p>` : ''}
      ${sel}
      <label for="d-wz-${slot}-f">Or choose a file (PDF, DOCX or TXT)</label><input class="ui-input d-wz__file" type="file" id="d-wz-${slot}-f" data-wz-file="${slot}" accept=".pdf,.docx,.txt">
    </fieldset>`;
  };
  const step1 = () => {
    const rows = cases();
    const ok = !!(st.letter || st.clinical) && !!st.ref;
    return `<div class="d-wz" data-step="1">${steps(1)}<h3 id="d-wz-h" tabindex="-1">Add the denial letter and clinical documentation</h3>
      <p class="d-an__sub">Either one is enough to start. Missing pieces can be filled in by hand on the next step. A file stays in your browser: only its name is kept, and the stored record of the consumer is what the analysis reads.</p>
      <div class="d-f"><label for="d-wz-case">Which consumer is this for?</label>${rows.length ? `<select class="ui-select" id="d-wz-case">${rows.map(r => `<option value="${e(r.request)}"${r.request === st.ref ? ' selected' : ''}>${e(`${r.consumer} · ${r.request} · ${r.payerName} · ${r.decision.main}`)}</option>`).join('')}</select>` : '<p class="ui-muted">There is no open denial case.</p>'}</div>
      <div class="d-wz__tiles">${SLOTS.map(([k, l, hint]) => tile(k, l, hint)).join('')}</div>
      <p class="d-an__sub" id="d-wz-help">${ok ? 'Ready to continue.' : 'Add at least one document to continue.'}</p>
      <div class="ui-btnrow"><button type="button" class="ui-btn ui-btn--primary" id="d-wz-next" data-wz-next${ok ? '' : ' disabled'} aria-describedby="d-wz-help">Continue</button></div></div>`;
  };
  const step2 = () => `<div class="d-wz" data-step="2">${steps(2)}<h3 id="d-wz-h" tabindex="-1">Add any additional context (optional)</h3>
    <p class="d-an__sub">Anything not in the letter or the record: payer call notes, your own comments. Member numbers, names, phone numbers and birth dates are removed before analysis.</p>
    <p class="d-an__sub">${['letter', 'clinical'].filter(k => st[k]).map(k => `${e(SLOTS.find(x => x[0] === k)[1])}: <b>${e(st[k].name)}</b>`).join(' · ')}</p>
    <div class="d-f"><label for="d-wz-ctx">Additional context</label><textarea class="ui-textarea" id="d-wz-ctx" rows="6" maxlength="1200" placeholder="(no additional context provided)">${e(st.context)}</textarea></div>
    <div class="ui-btnrow"><button type="button" class="ui-btn ui-btn--secondary" id="d-wz-back" data-wz-back>Back</button><button type="button" class="ui-btn ui-btn--primary" id="d-wz-run" data-wz-run>Run the analysis</button></div></div>`;
  const step3 = m => {
    const rec = m.record;
    return `<div class="d-wz" data-step="3">${steps(3)}<h3 id="d-wz-h" tabindex="-1">Analysis</h3>
      <section aria-labelledby="d-wz-rec"><h4 id="d-wz-rec">${e(rec.title)}</h4><p class="d-an__sub">${e(rec.note)}</p>
        <div class="d-wz__rec" data-record>${rec.sources.map(x => `<p class="d-wz__src">${e(x)}</p>`).join('')}<dl class="ui-sdl">${rec.fields.map(f => `<div><dt>${e(f.label)}</dt><dd>${e(f.value)}</dd></div>`).join('')}<div><dt>Additional context</dt><dd>${rec.context ? e(rec.context) : '(no additional context provided)'}</dd></div></dl>
        <p class="d-an__sub">Removed before analysis: ${rec.removed.map(e).join(', ')}.${rec.contextRemoved ? ` ${rec.contextRemoved} identifier${rec.contextRemoved === 1 ? '' : 's'} removed from your context.` : ''}</p></div></section>
      <section aria-labelledby="d-wz-r1"><h4 id="d-wz-r1">${e(m.read.title)}</h4><div id="d-wz-s1" data-list="read"></div></section>
      <section aria-labelledby="d-wz-r2"><h4 id="d-wz-r2">${e(m.appeals.title)} ${ui.sampleChip()}</h4><div id="d-wz-s2" data-list="appeals"></div><p class="in-basis"><span>${e(m.basis)}</span></p></section>
      <p class="d-wz__st" id="d-wz-st" role="status">Reading the record</p>
      <div class="ui-btnrow"><button type="button" class="ui-btn ui-btn--secondary" id="d-wz-cancel" data-wz-cancel>Cancel</button></div></div>`;
  };

  const paint = (focus = '#d-wz-h') => { h.update({ body: st.step === 1 ? step1() : st.step === 2 ? step2() : step3(st.model) }); const t = h.dialog.querySelector(focus); if (t) t.focus({ preventScroll: true }); };
  const refocus = id => { const t = id && h.dialog.querySelector('#' + CSS.escape(id)); if (t) t.focus({ preventScroll: true }); };
  const stop = () => { st.runs.forEach(r => r.cancel()); st.runs = []; };

  async function run() {
    const { s, r, d } = dp(); if (!r || !d) return;
    st.context = (h.dialog.querySelector('#d-wz-ctx') || {}).value || st.context;
    st.model = I.intakeModel(s, d, r, { letter: st.letter, clinical: st.clinical, context: st.context });
    if (!st.model.ready) { ui.toast(st.model.reason, 'err'); return; }
    st.step = 3; paint();
    const say = t => { const p = h.dialog.querySelector('#d-wz-st'); if (p) p.textContent = t; };
    const a = ui.runSteps(h.dialog.querySelector('#d-wz-s1'), st.model.read.steps, { interval: 380, label: st.model.read.title }); st.runs.push(a);
    if (!(await a.done)) return;
    say('Cross-referencing appeals');
    const b = ui.runSteps(h.dialog.querySelector('#d-wz-s2'), st.model.appeals.steps, { interval: 380, label: st.model.appeals.title }); st.runs.push(b);
    if (!(await b.done)) return;
    try { await api.do('dispute.analyze', { id: d.id, step: 'analyze' }); await api.do('intel.event', { kind: 'intake', scope: 'denial', ref: r.id }); }
    catch (err) { ui.toast(err.message, 'err'); say('The analysis could not be recorded.'); return; }
    st.done = true; say('Analysis ready. Opening it now.');
    h.close('done'); openAnalysis({ ref: r.id, me, el });
  }

  h = ui.drawer({ title: 'Analyze a denial', body: step1(), className: 'd-wide', returnFocus: el, onClose: () => { stop(); },
    onMount: (dlg, handle) => {
      h = handle;
      dlg.addEventListener('change', ev => {
        const t = ev.target;
        if (t.id === 'd-wz-case') { st.ref = t.value; if (st.letter && st.letter.via === 'stored') st.letter = null; if (st.clinical && st.clinical.via === 'stored') st.clinical = null; paint('#d-wz-case'); return; }
        const slot = t.dataset.wzStored; if (slot) {
          const { s, r, d } = dp(); const opts = I.intakeOptions(s, d, r)[slot === 'letter' ? 'letters' : 'clinical']; const o = opts.find(x => x.ref === t.value);
          st[slot] = o ? { via: 'stored', name: o.name, ref: o.ref } : (st[slot] && st[slot].via === 'file' ? st[slot] : null); paint(`#d-wz-${slot}-s`); return;
        }
        const f = t.dataset.wzFile; if (f && t.files && t.files[0]) { st[f] = { via: 'file', name: String(t.files[0].name).slice(0, 120) }; t.value = ''; paint(`#d-wz-${f}-x`); }
      });
      dlg.addEventListener('input', ev => { if (ev.target.id === 'd-wz-ctx') st.context = ev.target.value; });
      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('button'); if (!b) return;
        const clr = b.dataset.wzClear; if (clr) { st[clr] = null; paint(`#d-wz-${clr}-s`); if (!h.dialog.querySelector(`#d-wz-${clr}-s`)) refocus(`d-wz-${clr}-f`); return; }
        if (b.hasAttribute('data-wz-next')) { if (b.disabled) return; st.step = 2; paint(); return; }
        if (b.hasAttribute('data-wz-back')) { st.context = (dlg.querySelector('#d-wz-ctx') || {}).value || st.context; st.step = 1; paint(); return; }
        if (b.hasAttribute('data-wz-run')) { run(); return; }
        if (b.hasAttribute('data-wz-cancel')) { stop(); h.close('cancel'); }
      });
    } });
  return h;
}
