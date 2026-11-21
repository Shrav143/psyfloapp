// 39 · Appeal letter (guardian phone). Live: ?id (default R-0384, E.C.). The guardian reads the letter Psyflo drafted from
// the denial and the record, can change the wording, signs with a finger → request.appealSign → appeal_sent, with the
// signed PDF linked. English / Spanish. The appeal is the guardian's: Psyflo never signs.
import { register, Screen, M, toast } from '../app.js';
import { getLang, setLang, SigPad, callSheet } from './ParentPortal.js';

const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const longDate = (iso, lang) => { if (!iso) return ''; const d = M.parse(iso); return lang === 'es' ? `${d.getUTCDate()} de ${MONTH_ES[d.getUTCMonth()]}` : `${MONTH_EN[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const shortDate = (iso, lang) => { if (!iso) return ''; if (lang !== 'es') return M.fmtDate(iso); const d = M.parse(iso); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}`; };

// chrome only: the letter itself is the document
const T = {
  en: { sub: c => `${c}'s insurance decision`, said: (p, d) => `${p} said no · ${d}`, left: n => `${n} days left`, letter: 'Your appeal letter', change: 'Change wording', done: 'Done',
    attachedBy: 'Attached', sign: 'Sign and send', call: who => `Questions? Call ${who}`,
    yourName: 'Your name', signHere: 'Sign with your finger', clear: 'Clear', sentTitle: 'Sent', pdf: 'Signed letter (PDF)',
    empty: 'Sign in the box first', noName: 'Type your name first', thanks: 'Signed and sent', none: 'No denied request to appeal.',
    gen: (c, p, d, r, u) => `I am ${c}'s guardian. I am appealing ${p}'s decision of ${d}. ${p} said ${c} is "${r}". Harvest's program is the daily support ${c} needs at school. Please review the attached records and approve the ${u} units requested.`,
    attachedGen: 'Denial letter · the request · daily notes' },
  es: { sub: c => `La decisión del seguro de ${c}`, said: (p, d) => `${p} dijo que no · ${d}`, left: n => `quedan ${n} días`, letter: 'Su carta de apelación', change: 'Cambiar el texto', done: 'Listo',
    attachedBy: 'Adjunto', sign: 'Firmar y enviar', call: who => `¿Preguntas? Llame a ${who}`,
    yourName: 'Su nombre', signHere: 'Firme con el dedo', clear: 'Borrar', sentTitle: 'Enviada', pdf: 'Carta firmada (PDF)',
    empty: 'Firme primero en el recuadro', noName: 'Escriba primero su nombre', thanks: 'Firmada y enviada', none: 'No hay ninguna negación para apelar.',
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
    const lang = getLang() === 'es' ? 'es' : 'en'; const t = T[lang];
    const common = { en: lang === 'en', es: lang === 'es', enCls: lang === 'en' ? 'on' : '', esCls: lang === 'es' ? 'on' : '', setEn: () => { setLang('en'); this.setState({}); }, setEs: () => { setLang('es'); this.setState({}); } };
    if (!r) return { ...common, t: { ...t, sub: t.sub('—'), call: t.call('Harvest') }, r: null };
    const c = M.client(s, r.client); const child = c.first_name || c.initials; const p = M.payerShort(s, r.payer).split(' ')[0];
    const who = (M.staff(s, c.clinician || 'jperez').name || 'Jordan').split(' ')[0];
    const left = (M.requestClock(s, r).text.match(/(-?\d+) days left/) || [, 60])[1];
    const sent = r.stage === 'appeal_sent' || r.appeal?.signed_at;
    const text = sent && r.appeal?.text && (r.appeal.lang || 'en') === lang ? r.appeal.text : (this.state.text[lang] ?? this.draft(r, lang));
    const d = s.appeal_drafts?.[r.id];
    if (this.state.signer == null) this.state.signer = c.guardian?.name && c.guardian.name !== 'guardian' && c.guardian.name !== 'grandmother' ? c.guardian.name : '';
    return {
      ...common, r: true,
      t: { sub: t.sub(child), said: t.said(p, shortDate(r.denied_on, lang)), left: t.left(left), letter: t.letter, change: this.state.editing ? t.done : t.change,
        attachedBy: t.attachedBy, call: t.call(who), yourName: t.yourName, signHere: t.signHere, clear: t.clear, sentTitle: t.sentTitle, pdf: t.pdf },
      sentOne: !!sent,
      text, editing: this.state.editing && !sent, edit: e => { this.state.text[lang] = e.target.value; },
      attached: (lang === 'es' ? d?.attached_es : d?.attached) || t.attachedGen,
      sent: sent ? { sub: M.fmtDateTime(r.appeal?.signed_at || s.today), file: r.appeal?.file || '' } : null,
      signing: this.state.signing && !sent, signer: this.state.signer, setSigner: e => { this.state.signer = e.target.value; const ph = document.getElementById('sigph'); if (ph) ph.textContent = e.target.value; },
      signBtn: t.sign,
      toggleEdit: () => { this.setState({ editing: !this.state.editing }); if (this.state.editing) setTimeout(() => document.getElementById('letter')?.focus(), 30); },
      clear: () => { this.pad.clear(); this.setState({}); },
      call: () => { const c2 = r ? M.client(this.s, r.client) : { clinician: 'jperez' }; callSheet(this.s, { client: c2 }, getLang()); },
      sign: () => this.sign(r)
    };
  }
  after(root) {
    const ph = root.querySelector('#sigph');
    this.pad.attach(root.querySelector('#sig'), () => { if (ph) ph.style.display = this.pad.empty ? '' : 'none'; });
    if (ph) ph.style.display = this.pad.empty ? '' : 'none';
  }
  async sign(r) {
    const lang = getLang() === 'es' ? 'es' : 'en'; const t = T[lang];
    if (!this.state.signing) { this.setState({ signing: true, editing: false }); setTimeout(() => document.getElementById('sig')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); return; }
    const signer = (this.state.signer || '').trim();
    if (!signer) { toast(t.noName, 'err'); return document.getElementById('signer')?.focus(); }
    if (this.pad.empty) return toast(t.empty, 'err');
    const text = this.state.text[lang] ?? this.draft(r, lang);
    await this.do('request.appealSign', { id: r.id, text, signer, signature: this.pad.jpeg(), lang });
    this.pad.clear(); this.setState({ signing: false });
    toast(t.thanks);
  }
});
