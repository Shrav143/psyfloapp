// 39 · Appeal letter (guardian phone). Live: ?id (default R-0384, E.C.). The guardian reads the letter Psyflo drafted
// from the denial and the record, can change the wording, signs with a finger → request.appealSign → appeal_sent,
// with the signed PDF linked. English / Spanish. The appeal is the guardian's: Psyflo never signs.
import { register, Screen, M, toast } from '../app.js';
import { getLang, setLang, SigPad, callSheet } from './ParentPortal.js';

const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const longDate = (iso, lang) => { if (!iso) return ''; const d = M.parse(iso); return lang === 'es' ? `${d.getUTCDate()} de ${MONTH_ES[d.getUTCMonth()]}` : `${MONTH_EN[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const shortDate = (iso, lang) => lang === 'es' ? longDate(iso, 'es') : M.fmtDate(iso);

const T = {
  en: { sub: c => `${c}'s insurance decision`, said: (p, d) => `${p} said no on ${d}`, reason: (r) => `Their reason: "${r}." Harvest disagrees.`, letter: 'Your appeal letter', change: 'Change the wording', done: 'Done changing',
    other: 'Leer en español', attachedBy: 'Attached by Harvest', sign: 'Sign and send', faxes: (p, n) => `Harvest faxes it to ${p} for you · ${n} days left to appeal`, call: who => `Questions? Call ${who}`,
    yourName: 'Your name', signHere: 'Sign with your finger', clear: 'Clear', sentTitle: 'Sent', sentSub: (d, who) => `Signed by ${who} and sent ${d}. Harvest will tell you when ${''}the insurer answers.`, pdf: 'signed letter (PDF)',
    empty: 'Sign in the box first', noName: 'Type your name first', thanks: 'Appeal signed and sent · a copy is saved', none: 'No denied request to appeal right now.',
    gen: (c, p, d, r, u) => `I am ${c}'s guardian. I am appealing ${p}'s decision of ${d}. ${p} said ${c} is "${r}". Harvest's program is the daily support ${c} needs at school. Please review the attached records and approve the ${u} units requested.`,
    attachedGen: 'Denial letter · the request · daily notes' },
  es: { sub: c => `La decisión del seguro de ${c}`, said: (p, d) => `${p} dijo que no el ${d}`, reason: (r) => `Su razón: "${r}". Harvest no está de acuerdo.`, letter: 'Su carta de apelación', change: 'Cambiar el texto', done: 'Listo',
    other: 'Read in English', attachedBy: 'Adjuntado por Harvest', sign: 'Firmar y enviar', faxes: (p, n) => `Harvest se la envía por fax a ${p} · quedan ${n} días para apelar`, call: who => `¿Preguntas? Llame a ${who}`,
    yourName: 'Su nombre', signHere: 'Firme con el dedo', clear: 'Borrar', sentTitle: 'Enviada', sentSub: (d, who) => `Firmada por ${who} y enviada el ${d}. Harvest le avisará cuando el seguro conteste.`, pdf: 'carta firmada (PDF)',
    empty: 'Firme primero en el recuadro', noName: 'Escriba primero su nombre', thanks: 'Apelación firmada y enviada · se guardó una copia', none: 'No hay ninguna negación para apelar ahora.',
    gen: (c, p, d, r, u) => `Soy el tutor de ${c}. Apelo la decisión de ${p} del ${d}. ${p} dijo que ${c} está "${r}". El programa de Harvest es el apoyo diario que ${c} necesita en la escuela. Por favor revisen los documentos adjuntos y aprueben las ${u} unidades solicitadas.`,
    attachedGen: 'Carta de negación · la solicitud · notas diarias' }
};
const REASON_ES = { 'already connected to other services': 'ya conectado con otros servicios', 'does not meet medical necessity criteria': 'no cumple los criterios de necesidad médica' };

register('AppealLetter', class extends Screen {
  init() { this.pad = new SigPad(); this.state = { editing: false, signing: false, text: {}, signer: null }; }
  req() {
    const s = this.s;
    return s.requests.find(r => r.id === (this.params.id || 'R-0384')) || s.requests.find(r => ['denied', 'appeal_sent'].includes(r.stage));
  }
  draft(r, lang) {
    const s = this.s; const c = M.client(s, r.client); const child = c.first_name || c.initials; const p = M.payerShort(s, r.payer).split(' ')[0];
    const d = s.appeal_drafts?.[r.id];
    if (d?.[lang]) return d[lang];
    const reason = r.denial_reason || 'not medically necessary';
    return T[lang].gen(child, p, longDate(r.denied_on, lang), lang === 'es' ? (REASON_ES[reason] || reason) : reason, r.units_requested || 150);
  }
  renderVals() {
    const s = this.s; const r = this.req();
    const lang = getLang(); const t = T[lang];
    if (!r) return { t: { ...t, sub: t.sub('—'), call: t.call('Harvest') }, r: null };
    const c = M.client(s, r.client); const child = c.first_name || c.initials; const p = M.payerShort(s, r.payer).split(' ')[0];
    const who = (M.staff(s, c.clinician || 'jperez').name || 'Jordan').split(' ')[0];
    const reason = r.denial_reason || 'not medically necessary';
    const left = (M.requestClock(s, r).text.match(/(-?\d+) days left/) || [, 60])[1];
    const sent = r.stage === 'appeal_sent' || r.appeal?.signed_at;
    const text = sent && r.appeal?.text && (r.appeal.lang || 'en') === lang ? r.appeal.text : (this.state.text[lang] ?? this.draft(r, lang));
    const d = s.appeal_drafts?.[r.id];
    if (this.state.signer == null) this.state.signer = c.guardian?.name && c.guardian.name !== 'guardian' && c.guardian.name !== 'grandmother' ? c.guardian.name : '';
    return {
      r: true,
      t: { sub: t.sub(child), said: t.said(p, shortDate(r.denied_on, lang)), reason: t.reason(lang === 'es' ? (REASON_ES[reason] || reason) : reason), letter: t.letter, change: this.state.editing ? t.done : t.change, other: t.other,
        attachedBy: t.attachedBy, faxes: t.faxes(p, left), call: t.call(who), yourName: t.yourName, signHere: t.signHere, clear: t.clear, sentTitle: t.sentTitle, pdf: t.pdf },
      text, editing: this.state.editing && !sent, edit: e => { this.state.text[lang] = e.target.value; },
      attached: (lang === 'es' ? d?.attached_es : d?.attached) || t.attachedGen,
      sent: sent ? { sub: t.sentSub(M.fmtDateTime(r.appeal?.signed_at || s.today), r.appeal?.signer || ''), file: r.appeal?.file || '' } : null,
      signing: this.state.signing && !sent, signer: this.state.signer, setSigner: e => { this.state.signer = e.target.value; const ph = document.getElementById('sigph'); if (ph) ph.textContent = e.target.value; },
      signBtn: t.sign
    };
  }
  after(root) {
    const ph = root.querySelector('#sigph');
    this.pad.attach(root.querySelector('#sig'), () => { if (ph) ph.style.display = this.pad.empty ? '' : 'none'; });
    if (ph) ph.style.display = this.pad.empty ? '' : 'none';
  }
  get anchors() {
    return {
      edit: () => { this.setState({ editing: !this.state.editing }); if (this.state.editing) setTimeout(() => document.getElementById('letter')?.focus(), 30); },
      es: () => { setLang(getLang() === 'es' ? 'en' : 'es'); this.setState({}); },
      clear: () => { this.pad.clear(); this.setState({}); },
      call: () => { const r = this.req(); const c = r ? M.client(this.s, r.client) : { clinician: 'jperez' }; callSheet(this.s, { client: c }, getLang()); },
      sign: async () => {
        const r = this.req(); if (!r) return; const lang = getLang(); const t = T[lang];
        if (!this.state.signing) { this.setState({ signing: true, editing: false }); setTimeout(() => document.getElementById('sig')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); return; }
        const signer = (this.state.signer || '').trim();
        if (!signer) { toast(t.noName, 'err'); return document.getElementById('signer')?.focus(); }
        if (this.pad.empty) return toast(t.empty, 'err');
        const text = this.state.text[lang] ?? this.draft(r, lang);
        await this.do('request.appealSign', { id: r.id, text, signer, signature: this.pad.jpeg(), lang });
        this.pad.clear(); this.setState({ signing: false });
        toast(t.thanks);
      }
    };
  }
  set anchors(v) { }
});
