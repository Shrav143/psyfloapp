// 11 · Parent signs (phone). One form per screen. The screen follows the signature-mode setting of that document type
// (Settings · family and signatures, rule signature.mode.<doc>): Remote allowed (draw or type your name) · In person required (what to
// bring and when) · Pending (Harvest is still confirming how it is signed) · Completed (signed record) · Ready to review (to read, not asked yet).
// Signing calls consent.sign; the signer is the guardian behind the session, never a typed name the server trusts. A digital signature is
// never presented as a replacement for a signature that Harvest requires in person.
import { register, M, ui, toast, raw, esc } from '../app.js';
import * as P from '../shared/sel/portal.js';
import { rule } from '../shared/rules.js';
import { PortalScreen, famCtx, getLang, fdate, dayLabel, FORMS, DEMO_WORDING, formName, phref, pgo, chip, btn, presChip, INTAKE_WHERE, SignBox, packetStatus } from './ParentPortal.js';

const T = {
  en: {
    what: 'What this says', full: 'Read the full form', sign: 'Sign', next: 'Next form', done: 'Back to the checklist', copy: 'Your copy (PDF)', formOf: (i, n) => `Form ${i} of ${n}`,
    before: 'before the intake visit', beforeDay: d => `before ${d}`,
    chips: { remote: 'You can sign here', in_person: 'Sign in person', pending: 'Waiting for Harvest', completed: 'Signed', ready: 'Ready to read' },
    remoteHint: 'Signing here is Harvest\'s current option. If Harvest also needs your signature in person, they will tell you.',
    inPersonTitle: 'Sign in person', inPersonText: 'Harvest needs this form signed in person. You cannot sign it on your phone.', bring: 'What to bring', when: 'When', whenBooked: (d, t, who) => `At your intake visit: ${d} · ${t}${who ? ' · with ' + who : ''}`,
    whenOffer: 'Book the intake visit, then sign it there.', whenNone: 'Harvest will tell you when and where.', book: 'Book the visit', bringNone: 'Harvest will tell you what to bring.',
    pendingTitle: 'Harvest is still deciding how you sign', pendingText: 'Nothing is needed from you yet. You can read the form now. Harvest will tell you here when it is ready to sign.',
    readyTitle: 'Ready to read', readyText: 'Harvest has not asked you to sign this yet. You can read it now.',
    doneTitle: 'Signed', doneBy: (d, who) => `Signed ${d}${who ? ' by ' + who : ''}`, doneRemote: 'Signed on your phone.', doneInPerson: 'Signed in person.', doneNote: 'The first signature is kept. Signing again adds a new version.',
    recording: 'About recording', recAsk: 'Harvest may ask to record the first call. They ask you first, on the call, and write down your answer. You can say no and still get services.',
    sorry: 'This form is not available.', demoSign: 'Signed here', signed: f => `${f} signed · a copy is saved`
  },
  es: {
    what: 'Lo que dice esto', full: 'Leer el formulario completo', sign: 'Firmar', next: 'Siguiente formulario', done: 'Volver a la lista', copy: 'Su copia (PDF)', formOf: (i, n) => `Formulario ${i} de ${n}`,
    before: 'antes de la cita de admisión', beforeDay: d => `antes del ${d}`,
    chips: { remote: 'Puede firmar aquí', in_person: 'Firma en persona', pending: 'Esperando a Harvest', completed: 'Firmado', ready: 'Listo para leer' },
    remoteHint: 'Firmar aquí es la opción actual de Harvest. Si Harvest también necesita su firma en persona, se lo dirá.',
    inPersonTitle: 'Firme en persona', inPersonText: 'Harvest necesita este formulario firmado en persona. No se puede firmar en el teléfono.', bring: 'Qué traer', when: 'Cuándo', whenBooked: (d, t, who) => `En su cita de admisión: ${d} · ${t}${who ? ' · con ' + who : ''}`,
    whenOffer: 'Reserve la cita de admisión y firme allí.', whenNone: 'Harvest le dirá cuándo y dónde.', book: 'Reservar la cita', bringNone: 'Harvest le dirá qué traer.',
    pendingTitle: 'Harvest todavía decide cómo se firma', pendingText: 'No se necesita nada de usted por ahora. Puede leer el formulario. Harvest le avisará aquí cuando esté listo para firmar.',
    readyTitle: 'Listo para leer', readyText: 'Harvest todavía no le ha pedido que firme esto. Puede leerlo ahora.',
    doneTitle: 'Firmado', doneBy: (d, who) => `Firmado el ${d}${who ? ' por ' + who : ''}`, doneRemote: 'Firmado en su teléfono.', doneInPerson: 'Firmado en persona.', doneNote: 'Se conserva la primera firma. Firmar otra vez agrega una versión nueva.',
    recording: 'Sobre la grabación', recAsk: 'Harvest puede pedir grabar la primera llamada. Le preguntan primero, durante la llamada, y anotan su respuesta. Puede decir que no y aun así recibir los servicios.',
    sorry: 'Este formulario no está disponible.', demoSign: 'Firmado aquí', signed: f => `${f} firmado · se guardó una copia`
  }
};

register('ParentSign', class extends PortalScreen {
  async setup() { this.box = new SignBox('sig'); this.state = { err: '', busy: false, current: null }; }
  form() {
    const s = this.s; const c = this.ctx().client;
    if (this.params.form) return this.params.form;
    if (this.state.current) return this.state.current;
    const f = P.signForms(s, c.id);
    return (f.find(x => x.state !== 'completed' && x.state !== 'ready') || f.find(x => x.state === 'ready') || f.at(-1) || { form: 'Consent for services' }).form;
  }
  page() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const form = this.form();
    const st = P.sigState(s, c.id, form); const F = FORMS[form] || FORMS['Consent for services'];
    const all = P.signForms(s, c.id); const i = all.findIndex(x => x.form === form);
    const intake = c.intake && c.intake.when;
    const due = intake && intake.slice(0, 10) >= s.today ? t.beforeDay(dayLabel(intake.slice(0, 10), lang)) : t.before;
    const full = (F.full[lang] || F.full.en)(ctx.child, c);
    const summary0 = (F.sum[lang] || F.sum.en)(ctx.child, c);
    // the recording sentence follows the rule recording.require_consent_record (shown to the guardian when the rules table gives it; default: asked first)
    const rrule = rule(s, 'recording.require_consent_record'); const recAsk = rrule.missing ? true : !!rrule.value;
    const isConsent = form === 'Consent for services';
    const summary = isConsent && !recAsk ? summary0.replace(/\s*(Harvest may ask to record[^.]*\.|Harvest puede pedir grabar[^.]*\.)/, '') : summary0;
    const policy = presChip('family.signature') + `<span class="fp-pres" style="margin-left:6px">${ui.sourceChip(st.rule)}</span>`;
    const chipKind = { remote: 'info', in_person: 'warn', pending: 'wait', completed: 'ok', ready: 'info' }[st.state];
    const stateChip = chip(chipKind, t.chips[st.state], { remote: 'link', in_person: 'user', pending: 'clock', completed: 'check', ready: 'eye' }[st.state]);
    const err = this.state.err ? `<div class="fp-err" role="alert">${esc(this.state.err)}</div>` : '';

    const what = `<section class="fp-card" aria-labelledby="fp-what"><h2 class="fp-h2" id="fp-what">${t.what}</h2><p class="fp-p">${esc(summary)}</p>
      <details class="fp-det"><summary>${t.full}</summary><p class="fp-note">${esc(DEMO_WORDING[lang])}</p><p class="fp-text">${esc(full)}</p></details></section>`;
    let action = '';
    if (st.state === 'completed') {
      const rec = st.signed; const mode = rec.mode === 'in_person_required' ? t.doneInPerson : rec.mode === 'remote_allowed' ? t.doneRemote : '';
      const nextForm = all.find(x => x.state === 'remote' || x.state === 'in_person' || x.state === 'pending');
      action = `<section class="fp-card fp-card--ok" aria-labelledby="fp-done" data-sig-done><h2 class="fp-h2" id="fp-done">${t.doneTitle}</h2>
        <p class="fp-p">${esc(t.doneBy(fdate(rec.signed_at, lang), rec.signer))}</p>${mode ? `<p class="fp-p fp-muted">${mode}</p>` : ''}
        <p class="fp-p fp-muted">${t.doneNote}</p>${rec.file ? `<a class="fp-btn fp-btn--o" role="button" href="${esc(rec.file)}" target="_blank" rel="noopener">${t.copy}</a>` : ''}
        ${nextForm ? btn('p', phref(this.params, 'ParentSign', { form: nextForm.form }), esc(t.next)) : btn('p', phref(this.params, 'ParentPortal'), esc(t.done))}</section>`;
    } else if (st.state === 'remote') {
      action = `<section class="fp-card" aria-labelledby="fp-sign"><h2 class="fp-h2" id="fp-sign">${t.sign}</h2>${this.box.html(lang, { name: ctx.guardian })}${err}
        <a class="fp-btn fp-btn--p" role="button" href="#sign">${t.sign}</a><p class="fp-hint" style="margin:0">${t.remoteHint}</p></section>`;
    } else if (st.state === 'in_person') {
      const bs = P.bookingState(s, c, ctx.ref);
      const bring = (s.portal_copy && s.portal_copy.bring && s.portal_copy.bring[lang]) || [];
      let when = t.whenNone; let bookBtn = '';
      if (bs && bs.kind === 'intake' && bs.booked && bs.when) when = t.whenBooked(dayLabel(bs.when.slice(0, 10), lang), M.fmtTime(bs.when), M.staff(s, bs.who).name);
      else if (bs && bs.kind === 'intake' && bs.offered) { when = t.whenOffer; bookBtn = btn('o', phref(this.params, 'ParentSchedule', { kind: 'intake' }), esc(t.book)); }
      action = `<section class="fp-card fp-card--next" aria-labelledby="fp-inp" data-sig-inperson><h2 class="fp-h2" id="fp-inp">${t.inPersonTitle}</h2><p class="fp-p">${t.inPersonText}</p>
        <dl class="fp-kv"><dt>${t.when}</dt><dd>${esc(when)}</dd><dt>${t.bring}</dt><dd>${bring.length ? `<ul style="margin:0;padding-left:20px">${bring.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : t.bringNone}</dd></dl>${bookBtn}</section>`;
    } else if (st.state === 'pending') {
      action = `<section class="fp-card" aria-labelledby="fp-pend" data-sig-pending><h2 class="fp-h2" id="fp-pend">${t.pendingTitle}</h2><p class="fp-p">${t.pendingText}</p></section>`;
    } else {
      action = `<section class="fp-card" aria-labelledby="fp-rdy" data-sig-ready><h2 class="fp-h2" id="fp-rdy">${t.readyTitle}</h2><p class="fp-p">${t.readyText}</p>${btn('o', phref(this.params, 'ParentPortal'), esc(t.done))}</section>`;
    }
    const body = `<div data-sig-state="${st.state}" style="display:flex;flex-direction:column;gap:16px">${what}${action}</div>`;
    return { title: esc(formName(form, lang)), sub: `${esc(i >= 0 ? t.formOf(i + 1, all.length) + ' · ' : '')}${esc(due)}`, body: `<div>${stateChip}${policy}</div>` + body, lang };
  }
  afterPaint(root) { this.box.attach(root, () => this.repaint()); }
  act() {
    return {
      sign: async () => {
        const s = this.s; const ctx = this.ctx(); const lang = getLang(ctx.client); const form = this.form();
        const st = P.sigState(s, ctx.client.id, form); if (!st.canSign || this.state.busy) return;
        const v = this.box.value(lang); if (v.error) return this.setState({ err: v.error });
        const F = FORMS[form]; const summary = form === 'Treatment plan' && F ? F.sum.en(ctx.child, ctx.client) : undefined;
        this.state.busy = true;
        try { await this.do('consent.sign', { client: ctx.client.id, form, signature: v.signature, lang, summary }); }
        catch { this.state.busy = false; return; }
        this.state.busy = false; this.box.reset(); this.state.err = ''; this.state.current = form;
        toast(T[lang].signed(formName(form, lang)));
        this.repaint();
      }
    };
  }
});
