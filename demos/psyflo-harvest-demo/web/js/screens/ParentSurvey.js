// 31 · Parent survey (phone). Live: three questions + free text; Next saves a guardian check-in (checkin.save,
// role guardian) and the parent portal shows it.
import { register, Screen, M, toast } from '../app.js';
import { famCtx, getLang, setLang, pgo } from './ParentPortal.js';

const Q = [
  { key: 'sad', en: 'Seemed sad or down', es: 'Se veía triste o decaído' },
  { key: 'angry', en: 'Got very angry quickly', es: 'Se enojaba mucho muy rápido' },
  { key: 'sleep', en: 'Trouble sleeping', es: 'Problemas para dormir' }
];
const OPTS = [{ v: 'Not at all', es: 'Nada' }, { v: 'Some days', es: 'Algunos días' }, { v: 'Most days', es: 'Casi todos' }];
const T = {
  en: { title: c => `2-minute check-in · ${c}`, sub: 'In the last two weeks', note: who => `Anything you want ${who} to know?`, optional: 'Optional', next: 'Next', foot: c => `Only Harvest sees this · ${c} answers his own version at school`, other: 'Leer en español', missing: 'Answer the three questions first', thanks: who => `Thank you · ${who} sees this before the next call` },
  es: { title: c => `Chequeo de 2 minutos · ${c}`, sub: 'En las últimas dos semanas', note: who => `¿Algo que quiera que ${who} sepa?`, optional: 'Opcional', next: 'Siguiente', foot: c => `Solo Harvest lo ve · ${c} contesta su propia versión en la escuela`, other: 'Read in English', missing: 'Conteste primero las tres preguntas', thanks: who => `Gracias · ${who} lo verá antes de la próxima llamada` }
};

register('ParentSurvey', class extends Screen {
  init() { this.state = { a: {}, note: '' }; }
  ctx() { return famCtx(this.s, this.params); }
  who(ctx) { return (M.staff(this.s, ctx.client.clinician || 'jperez').name || 'Jordan').split(' ')[0]; }
  renderVals() {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const t = T[lang]; const a = this.state.a;
    const n = Object.keys(a).length;
    const foot = t.foot(ctx.child);
    return {
      t: { title: t.title(ctx.child), sub: t.sub, note: t.note(this.who(ctx)), optional: t.optional, next: t.next, foot: ctx.client.sex === 'F' ? foot.replace(' his ', ' her ') : foot, other: t.other },
      segs: [0, 1, 2, 3, 4, 5].map(i => i < 3 + n ? '#5FC0BE' : '#3C4756'),
      qs: Q.map(q => ({ key: q.key, label: q[lang], opts: OPTS.map(o => ({ v: o.v, label: lang === 'es' ? o.es : o.v, cls: a[q.key] === o.v ? 'on' : '', chk: a[q.key] === o.v ? 'checked' : '', pick: () => this.setState({ a: { ...this.state.a, [q.key]: o.v } }) })) })),
      note: this.state.note, setNote: e => { this.state.note = e.target.value; }
    };
  }
  get anchors() {
    return {
      es: () => { const c = this.ctx().client; setLang(getLang(c) === 'es' ? 'en' : 'es'); this.setState({}); },
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
