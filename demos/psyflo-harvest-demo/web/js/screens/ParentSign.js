// 11 · Parent signs (phone). Live: plain-language summary, "Read the full form", a real finger/mouse signature;
// Sign → consent.sign (signature JPEG + guardian name) → signed PDF stored → Parent portal shows it done.
import { register, Screen, M, toast } from '../app.js';
import { famCtx, getLang, setLang, fdate, FORMS, formName, pendingForms, pgo, SigPad, guardHeader, guardFooter, callSheet } from './ParentPortal.js';
import { C_CSS } from './MobileApp.js';

const T = {
  en: { what: 'What this says', readFull: 'Read the full form', less: 'Show less', signHere: 'Sign with your finger', clear: 'Clear', sign: 'Sign', copy: 'Your copy (PDF)', finish: 'Done',
    form: (i, n) => `Form ${i} of ${n}`, allDone: 'All forms signed',
    signedBy: (d, who) => `Signed ${d} by ${who}`, empty: 'Sign in the box first', thanks: f => `${f} signed · a copy is saved` },
  es: { what: 'Lo que dice esto', readFull: 'Leer el formulario completo', less: 'Mostrar menos', signHere: 'Firme con el dedo', clear: 'Borrar', sign: 'Firmar', copy: 'Su copia (PDF)', finish: 'Listo',
    form: (i, n) => `Formulario ${i} de ${n}`, allDone: 'Todos los formularios firmados',
    signedBy: (d, who) => `Firmado el ${d} por ${who}`, empty: 'Firme primero en el recuadro', thanks: f => `${f} firmado · se guardó una copia` }
};

register('ParentSign', class extends Screen {
  init() { this.pad = new SigPad(); this.state = { full: false }; }
  ctx() { return famCtx(this.s, this.params); }
  form() { const c = this.ctx().client; return this.params.form || pendingForms(this.s, c)[0] || null; }
  renderVals() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang];
    let form = this.form(); let done = null;
    if (!form || s.consents.some(x => x.client === c.id && x.form === form && x.status === 'signed')) {
      const last = s.consents.filter(x => x.client === c.id && x.status === 'signed').at(-1);
      form = form || last?.form || 'Consent for services';
      const rec = s.consents.find(x => x.client === c.id && x.form === form && x.status === 'signed') || last;
      done = { title: rec ? formName(rec.form, lang) : t.allDone, sub: rec ? t.signedBy(fdate(rec.signed_at, lang), rec.signer) : '', file: rec?.file || '' };
    }
    const F = FORMS[form] || FORMS['Consent for services'];
    const full = F.full[lang](ctx.child, c);
    return {
      t, hd: guardHeader(formName(form, lang), lang), ft: guardFooter(lang),
      summary: F.sum[lang](ctx.child, c), full: this.state.full, fullText: full,
      signer: ctx.guardian || (lang === 'es' ? 'Su nombre' : 'Your name'), done
    };
  }
  get css() { return C_CSS; }
  after(root) {
    const ph = root.querySelector('#sigph');
    this.pad.attach(root.querySelector('#sig'), () => { if (ph) ph.style.display = this.pad.empty ? '' : 'none'; });
    if (ph) ph.style.display = this.pad.empty ? '' : 'none';
  }
  get anchors() {
    return {
      full: () => this.setState({ full: !this.state.full }),
      clear: () => { this.pad.clear(); this.setState({}); },
      en: () => { setLang('en'); this.setState({}); },
      es: () => { setLang('es'); this.setState({}); },
      call: () => callSheet(this.s, this.ctx(), getLang(this.ctx().client)),
      back: () => pgo(this.params, 'ParentPortal'),
      sign: async () => {
        const ctx = this.ctx(); const lang = getLang(ctx.client); const form = this.form();
        if (this.pad.empty) return toast(T[lang].empty, 'err');
        const signer = ctx.guardian || 'Guardian';
        const F = FORMS[form]; const summary = form === 'Treatment plan' && F ? F.sum.en(ctx.child, ctx.client) : undefined;
        await this.do('consent.sign', { client: ctx.client.id, form, signer, signature: this.pad.jpeg(), lang, summary });
        this.pad.clear();
        toast(T[lang].thanks(formName(form, lang)));
        pgo(this.params, 'ParentPortal');
      }
    };
  }
  set anchors(v) { }
});
