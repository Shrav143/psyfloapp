// 39 · Appeal letter (guardian phone). The letter is prepared by staff in Denial Intelligence; the guardian reviews it, can change the wording, and signs
// or calls. Psyflo never exercises an appeal right and never sends: signing is not sending. Four states, read from the stored records:
//   Draft (Harvest is still preparing it) · Ready to review (the guardian reads, edits, signs) · Signed (staff will send) · Submitted by staff.
// The signature follows the signature-mode setting for appeals (rule signature.mode.appeal): remote (draw or type), in person (what to bring and when), pending.
// A parent or guardian can appeal; whether anyone else may is not verified here (rule appeal.initiators).
import { register, M, ui, toast, esc } from '../app.js';
import * as P from '../shared/sel/portal.js';
import { PortalScreen, getLang, fdate, phref, chip, btn, presChip, SignBox, INTAKE_WHERE, LETTER_TEXT, dayLabel } from './ParentPortal.js';

const MONTH = { en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], es: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'] };
const longDate = (iso, lang) => { if (!iso) return ''; const d = M.parse(iso); return lang === 'es' ? `${d.getUTCDate()} de ${MONTH.es[d.getUTCMonth()]}` : `${MONTH.en[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const REASON_ES = { 'already connected to other services': 'ya conectado con otros servicios', 'does not meet medical necessity criteria': 'no cumple los criterios de necesidad médica' };

const T = {
  en: {
    title: 'Appeal letter', sub: c => `${c}'s insurance decision`, steps: ['Draft', 'Ready to review', 'Signed', 'Submitted by staff'], stepsLabel: 'Where your appeal is', stepOf: (i, n) => `Step ${i} of ${n}`,
    said: (p, d) => `${p} said no on ${d}`, reason: r => `Their reason: "${r}". Harvest disagrees.`, by: 'By when',
    draftTitle: 'Harvest is preparing your letter', draftText: 'You will see it here when it is ready to read. Nothing to do yet.',
    letter: 'Your appeal letter', letterLabel: 'Your letter (you can change the words)', change: 'Change the wording', done: 'Done changing', attached: 'Attached by Harvest', sample: 'Illustrative sample', sampleNote: 'Sample wording. Staff replace it with text drawn from the record before you sign.',
    signTitle: 'Sign the letter', signHint: 'Signing is not sending. Harvest staff review your signed letter and send it. A parent or guardian can appeal.', sign: 'Sign the letter',
    inPersonTitle: 'Sign in person', inPersonText: 'Harvest needs this letter signed in person. You cannot sign it on your phone.', when: 'When', whenNone: 'Harvest will tell you when and where.', whenBooked: (d, t) => `At your visit: ${d} · ${t}`, bring: 'What to bring', bringNone: 'Harvest will tell you what to bring.', callUs: 'Call us to set a time',
    pendingTitle: 'Harvest is confirming how you sign', pendingText: 'You can read the letter now. Harvest will tell you here when it is ready to sign.',
    signedTitle: 'Signed · staff will send', signedText: (d) => `You signed ${d}. Harvest staff review the signed letter and send it. You will see it here when it is sent.`,
    sentTitle: 'Submitted by staff', sentText: (d, p) => `Harvest staff sent your signed letter to ${p}${d ? ' on ' + d : ''}. Harvest will tell you here when ${p} answers.`, pdf: 'Signed letter (PDF)',
    none: 'There is no denied request to appeal right now.', thanks: 'Appeal signed · Harvest staff will send it',
    gen: (c, p, d, r, u) => `I am ${c}'s guardian. I am appealing ${p}'s decision of ${d}. ${p} said ${c} is "${r}". Please review the attached records and reconsider the ${u} units requested.`
  },
  es: {
    title: 'Carta de apelación', sub: c => `La decisión del seguro de ${c}`, steps: ['Borrador', 'Lista para leer', 'Firmada', 'Enviada por el personal'], stepsLabel: 'Dónde está su apelación', stepOf: (i, n) => `Paso ${i} de ${n}`,
    said: (p, d) => `${p} dijo que no el ${d}`, reason: r => `Su razón: "${r}". Harvest no está de acuerdo.`, by: 'Para cuándo',
    draftTitle: 'Harvest está preparando su carta', draftText: 'La verá aquí cuando esté lista para leer. Todavía no tiene que hacer nada.',
    letter: 'Su carta de apelación', letterLabel: 'Su carta (puede cambiar las palabras)', change: 'Cambiar el texto', done: 'Listo', attached: 'Adjuntado por Harvest', sample: 'Ejemplo ilustrativo', sampleNote: 'Texto de ejemplo. El personal lo reemplaza con texto tomado del registro antes de que usted firme.',
    signTitle: 'Firmar la carta', signHint: 'Firmar no es enviar. El personal de Harvest revisa su carta firmada y la envía. Un padre, madre o tutor puede apelar.', sign: 'Firmar la carta',
    inPersonTitle: 'Firme en persona', inPersonText: 'Harvest necesita esta carta firmada en persona. No se puede firmar en el teléfono.', when: 'Cuándo', whenNone: 'Harvest le dirá cuándo y dónde.', whenBooked: (d, t) => `En su visita: ${d} · ${t}`, bring: 'Qué traer', bringNone: 'Harvest le dirá qué traer.', callUs: 'Llámenos para fijar una hora',
    pendingTitle: 'Harvest está confirmando cómo se firma', pendingText: 'Puede leer la carta ahora. Harvest le avisará aquí cuando esté lista para firmar.',
    signedTitle: 'Firmada · el personal la enviará', signedText: d => `Usted firmó el ${d}. El personal de Harvest revisa la carta firmada y la envía. La verá aquí cuando se envíe.`,
    sentTitle: 'Enviada por el personal', sentText: (d, p) => `El personal de Harvest envió su carta firmada a ${p}${d ? ' el ' + d : ''}. Harvest le avisará aquí cuando ${p} conteste.`, pdf: 'Carta firmada (PDF)',
    none: 'No hay ninguna solicitud negada para apelar ahora.', thanks: 'Apelación firmada · el personal de Harvest la enviará',
    gen: (c, p, d, r, u) => `Soy el tutor de ${c}. Apelo la decisión de ${p} del ${d}. ${p} dijo que ${c} está "${r}". Por favor revisen los documentos adjuntos y reconsideren las ${u} unidades solicitadas.`
  }
};

register('AppealLetter', class extends PortalScreen {
  async setup() { this.box = new SignBox('sig'); this.state = { editing: false, err: '', busy: false }; }
  req() {
    const s = this.s; const c = this.ctx().client; const mine = (s.requests || []).filter(r => r.client === c.id);
    return mine.find(r => r.id === this.params.id) || mine.find(r => r.stage === 'denied') || mine.find(r => r.stage === 'appeal_sent') || null;
  }
  // the letter: staff's wording (appeal_drafts) in the guardian's language, else the plain generated text from the record
  letterText(r, lang) {
    const s = this.s; const c = this.ctx().client; const a = P.appealView(s, r); const d = a.draft; const t = T[lang];
    if (a.status === 'signed' || a.status === 'submitted') return (r.appeal && r.appeal.text) || '';
    const own = ui.draft.get(`appeal:${r.id}:${lang}`, null); if (own != null) return own;
    if (d && d[lang]) return d[lang];
    if (d && d.en) return d.en;
    const p = M.payerShort(s, r.payer).split(' ')[0]; const reason = r.denial_reason || 'not medically necessary';
    return t.gen(c.first_name || c.initials, p, longDate(r.denied_on, lang), lang === 'es' ? (REASON_ES[reason] || reason) : reason, r.units_requested || '');
  }
  page() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const lt = LETTER_TEXT[lang]; const child = ctx.child;
    const r = this.req();
    if (!r) return { title: t.title, sub: esc(t.sub(child)), body: `<section class="fp-card"><p class="fp-p">${t.none}</p></section>`, lang };
    const a = P.appealView(s, r); const p = M.payerShort(s, r.payer).split(' ')[0]; const reason = r.denial_reason || 'not medically necessary';
    const st = P.sigState(s, c.id, 'Appeal letter'); const idx = P.APPEAL_STEPS.indexOf(a.status);
    const steps = `<ol class="fp-steps" aria-label="${esc(t.stepsLabel)}" data-appeal-status="${a.status}">${t.steps.map((l, i) => `<li class="${i < idx ? 'on' : i === idx ? 'cur' : ''}"${i === idx ? ' aria-current="step"' : ''}><i></i><span>${esc(l)}${i < idx ? '<span class="ui-sr"> ✓</span>' : ''}</span></li>`).join('')}</ol><p class="fp-hint" style="margin:0">${esc(t.stepOf(idx + 1, 4))}</p>`;
    const d = a.deadline;
    const by = d.date ? `${esc(lt.byAppeal(fdate(d.date, lang), d.daysLeft))}<br><span class="fp-muted">${esc(lt.byAppealHow)}</span> <span style="display:inline-block;margin-top:4px">${ui.sourceChip(d.rule)}</span>` : `${esc(lt.byAppealNone)} <span style="display:inline-block;margin-top:4px">${ui.sourceChip(d.rule)}</span>`;
    const decision = `<section class="fp-card fp-card--danger" aria-labelledby="fp-dec"><h2 class="fp-h2" id="fp-dec">${esc(t.said(p, longDate(r.denied_on, lang)))}</h2><p class="fp-p">${esc(t.reason(lang === 'es' ? (REASON_ES[reason] || reason) : reason))}</p><dl class="fp-kv" style="margin:0"><dt>${t.by}</dt><dd>${by}</dd></dl></section>`;
    let main = '';
    const sample = a.draft && a.draft.sample ? `<div class="fp-note" data-sample>${chip('neutral', t.sample)}<br>${esc(t.sampleNote)}</div>` : '';
    const text = this.letterText(r, lang);
    const attached = a.draft && ((lang === 'es' && a.draft.attached_es) || a.draft.attached);
    if (a.status === 'draft') {
      main = `<section class="fp-card" aria-labelledby="fp-dr" data-appeal-draft><h2 class="fp-h2" id="fp-dr">${t.draftTitle}</h2><p class="fp-p">${t.draftText}</p></section>`;
    } else {
      const editable = a.status === 'ready';
      const letter = `<section class="fp-card" aria-labelledby="fp-lt"><h2 class="fp-h2" id="fp-lt">${t.letter}</h2>${sample}
        ${editable && this.state.editing ? `<div class="fp-field"><label class="fp-lab" for="fp-letter">${t.letterLabel}</label><textarea class="fp-in" id="fp-letter" rows="10" data-ui-draft="appeal:${esc(r.id)}:${lang}" style="min-height:220px;line-height:24px">${esc(text)}</textarea></div>` : `<p class="fp-text">${esc(text)}</p>`}
        ${editable ? `<button type="button" class="fp-link" data-edit aria-pressed="${this.state.editing}">${this.state.editing ? t.done : t.change}</button>` : ''}
        ${attached ? `<p class="fp-hint"><b>${t.attached}:</b> ${esc(attached)}</p>` : ''}</section>`;
      let sign = '';
      if (a.status === 'ready') {
        if (st.state === 'remote') {
          sign = `<section class="fp-card" aria-labelledby="fp-sg"><h2 class="fp-h2" id="fp-sg">${t.signTitle}</h2><p class="fp-note">${t.signHint}</p>${this.box.html(lang, { name: ctx.guardian })}${this.state.err ? `<div class="fp-err" role="alert">${esc(this.state.err)}</div>` : ''}<a class="fp-btn fp-btn--p" role="button" href="#sign">${t.sign}</a></section>`;
        } else if (st.state === 'in_person') {
          const bs = P.bookingState(s, c, ctx.ref); const bring = (s.portal_copy && s.portal_copy.bring && s.portal_copy.bring[lang]) || [];
          const when = bs && bs.booked && bs.when ? t.whenBooked(dayLabel(bs.when.slice(0, 10), lang), M.fmtTime(bs.when)) : t.whenNone;
          sign = `<section class="fp-card fp-card--next" aria-labelledby="fp-ip" data-sig-inperson><h2 class="fp-h2" id="fp-ip">${t.inPersonTitle}</h2><p class="fp-p">${t.inPersonText}</p><dl class="fp-kv"><dt>${t.when}</dt><dd>${esc(when)}</dd><dt>${t.bring}</dt><dd>${bring.length ? `<ul style="margin:0;padding-left:20px">${bring.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : t.bringNone}</dd></dl><button type="button" class="fp-btn fp-btn--o" data-call>${t.callUs}</button></section>`;
        } else {
          sign = `<section class="fp-card" aria-labelledby="fp-pd" data-sig-pending><h2 class="fp-h2" id="fp-pd">${t.pendingTitle}</h2><p class="fp-p">${t.pendingText}</p></section>`;
        }
      }
      const status = a.status === 'signed'
        ? `<section class="fp-card fp-card--ok" aria-labelledby="fp-so" data-appeal-signed><h2 class="fp-h2" id="fp-so">${t.signedTitle}</h2><p class="fp-p">${esc(t.signedText(fdate(a.signedAt, lang)))}</p>${a.file ? `<a class="fp-btn fp-btn--o" role="button" href="${esc(a.file)}" target="_blank" rel="noopener">${t.pdf}</a>` : ''}</section>`
        : a.status === 'submitted'
          ? `<section class="fp-card fp-card--ok" aria-labelledby="fp-sb" data-appeal-submitted><h2 class="fp-h2" id="fp-sb">${t.sentTitle}</h2><p class="fp-p">${esc(t.sentText(fdate(a.sentAt, lang), p))}</p>${a.file ? `<a class="fp-btn fp-btn--o" role="button" href="${esc(a.file)}" target="_blank" rel="noopener">${t.pdf}</a>` : ''}</section>` : '';
      main = status + letter + sign;
    }
    return { title: t.title, sub: esc(t.sub(child)), body: `<div style="display:flex;flex-direction:column;gap:8px">${steps}</div>${decision}${main}`, pres: presChip('route.AppealLetter'), lang };
  }
  afterPaint(root) {
    this.box.attach(root, () => this.repaint());
    root.querySelectorAll('[data-edit]').forEach(b => { b.onclick = () => { this.setState({ editing: !this.state.editing }); if (this.state.editing) setTimeout(() => document.getElementById('fp-letter') && document.getElementById('fp-letter').focus(), 30); }; });
  }
  act() {
    return {
      sign: async () => {
        const r = this.req(); if (!r || this.state.busy) return; const ctx = this.ctx(); const lang = getLang(ctx.client); const a = P.appealView(this.s, r);
        if (a.status !== 'ready') return;
        const v = this.box.value(lang); if (v.error) return this.setState({ err: v.error });
        const text = this.letterText(r, lang);
        this.state.busy = true;
        try { await this.do('request.appealSign', { id: r.id, text, signature: v.signature, lang }); } catch { this.state.busy = false; return; }
        this.state.busy = false; this.box.reset(); ui.draft.clearPrefix(`appeal:${r.id}:`); this.state.err = ''; this.state.editing = false;
        toast(T[lang].thanks); this.repaint();
      }
    };
  }
});
