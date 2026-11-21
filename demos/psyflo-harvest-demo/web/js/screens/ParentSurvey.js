// 31 · Parent survey (phone). Live: three questions + free text; Next saves a guardian check-in (checkin.save,
// role guardian) and the parent portal shows it.
import { register, Screen, M, toast } from '../app.js';
import { famCtx, getLang, setLang, pgo, guardHeader, guardFooter, callSheet } from './ParentPortal.js';
import { C_CSS } from './MobileApp.js';

const Q = [
  { key: 'sad', en: 'Seemed sad or down', es: 'Se veía triste o decaído' },
  { key: 'angry', en: 'Got very angry quickly', es: 'Se enojaba mucho muy rápido' },
  { key: 'sleep', en: 'Trouble sleeping', es: 'Problemas para dormir' }
];
const OPTS = [{ v: 'Not at all', es: 'Nada' }, { v: 'Some days', es: 'Algunos días' }, { v: 'Most days', es: 'Casi todos' }];
const T = {
  en: { title: '2-minute check-in', sub: 'In the last two weeks', note: 'Anything to add?', optional: 'Optional', next: 'Send', missing: 'Answer the three questions first', thanks: who => `Thank you · ${who} sees this before the next call` },
  es: { title: 'Chequeo de 2 minutos', sub: 'En las últimas dos semanas', note: '¿Algo que agregar?', optional: 'Opcional', next: 'Enviar', missing: 'Conteste primero las tres preguntas', thanks: who => `Gracias · ${who} lo verá antes de la próxima llamada` }
};

register('ParentSurvey', class extends Screen {
  init() { this.state = { a: {}, note: '' }; }
  ctx() { return famCtx(this.s, this.params); }
  who(ctx) { return (M.staff(this.s, ctx.client.clinician || 'jperez').name || 'Jordan').split(' ')[0]; }
  renderVals() {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const t = T[lang]; const a = this.state.a;
    return {
      hd: guardHeader(t.title, lang), ft: guardFooter(lang),
      t: { sub: t.sub, note: t.note, optional: t.optional, next: t.next },
      qs: Q.map(q => ({ key: q.key, label: q[lang], opts: OPTS.map(o => ({ v: o.v, label: lang === 'es' ? o.es : o.v, cls: a[q.key] === o.v ? 'on' : '', chk: a[q.key] === o.v ? 'checked' : '', pick: () => this.setState({ a: { ...this.state.a, [q.key]: o.v } }) })) })),
      note: this.state.note, setNote: e => { this.state.note = e.target.value; }
    };
  }
  get css() { return C_CSS; }
  get anchors() {
    return {
      en: () => { setLang('en'); this.setState({}); },
      es: () => { setLang('es'); this.setState({}); },
      back: () => pgo(this.params, 'ParentPortal'),
      call: () => callSheet(this.s, this.ctx(), getLang(this.ctx().client)),
      next: async () => {
        const ctx = this.ctx(); const lang = getLang(ctx.client); const a = this.state.a;
        if (Q.some(q => !a[q.key])) return toast(T[lang].missing, 'err');
        await this.do('checkin.save', { client: ctx.client.id, by: ctx.guardian || 'guardian', role: 'guardian', week_of: this.s.today, answers: { ...a, note: this.state.note.trim(), lang } });
        toast(T[lang].thanks(this.who(ctx)));
        pgo(this.params, 'ParentPortal');
      }
    };
  }
  set anchors(v) { }
});
