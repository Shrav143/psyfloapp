// 31 · Parent survey (phone): "Complete the check-in". Three questions and an optional note; Send saves a guardian check-in (checkin.save, role guardian).
// The author is the guardian behind the session. The check-in is for Harvest staff; it is not a clinical screen and nothing here scores it.
import { register, toast, esc } from '../app.js';
import { PortalScreen, getLang, pgo, phref, presChip, childName } from './ParentPortal.js';

const Q = [
  { key: 'sad', en: 'Seemed sad or down', es: 'Se veía triste o decaído' },
  { key: 'angry', en: 'Got very angry quickly', es: 'Se enojaba mucho muy rápido' },
  { key: 'sleep', en: 'Trouble sleeping', es: 'Problemas para dormir' }
];
const OPTS = [{ v: 'Not at all', es: 'Nada' }, { v: 'Some days', es: 'Algunos días' }, { v: 'Most days', es: 'Casi todos' }];
const T = {
  en: { title: 'Check-in', sub: c => `${c} · in the last two weeks`, note: 'Anything you want Harvest to know?', optional: 'Optional', send: 'Send', foot: 'Harvest staff can see your answers.', missing: 'Answer the three questions first', thanks: 'Thank you · your check-in was sent', progress: (a, b) => `${a} of ${b} answered` },
  es: { title: 'Chequeo', sub: c => `${c} · en las últimas dos semanas`, note: '¿Algo que quiera que Harvest sepa?', optional: 'Opcional', send: 'Enviar', foot: 'El personal de Harvest puede ver sus respuestas.', missing: 'Conteste primero las tres preguntas', thanks: 'Gracias · su chequeo fue enviado', progress: (a, b) => `${a} de ${b} contestadas` }
};

register('ParentSurvey', class extends PortalScreen {
  async setup() { this.state = { a: {}, note: '', err: '' }; }
  page() {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const t = T[lang]; const a = this.state.a; const n = Object.keys(a).length;
    const qs = Q.map(q => `<fieldset class="fp-opts"><legend>${esc(q[lang])}</legend>${OPTS.map(o => `<label class="fp-opt${a[q.key] === o.v ? ' on' : ''}"><input type="radio" name="q-${q.key}" value="${esc(o.v)}" data-q="${q.key}" data-nobind${a[q.key] === o.v ? ' checked' : ''}>${esc(lang === 'es' ? o.es : o.v)}</label>`).join('')}</fieldset>`).join('');
    const body = `<div class="fp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${n}" aria-label="${esc(t.progress(n, 3))}"><i style="width:${Math.round(100 * n / 3)}%"></i></div>
      <form class="fp-card" novalidate>${qs}<div class="fp-field"><label class="fp-lab" for="fp-note">${t.note} <span class="fp-muted" style="font-weight:400">(${t.optional})</span></label><textarea class="fp-in" id="fp-note" rows="3" data-nobind>${esc(this.state.note)}</textarea></div>
      ${this.state.err ? `<div class="fp-err" role="alert">${esc(this.state.err)}</div>` : ''}<a class="fp-btn fp-btn--p" role="button" href="#next">${t.send}</a><p class="fp-hint" style="margin:0">${t.foot}</p></form>`;
    return { title: t.title, sub: esc(t.sub(ctx.child)), body, pres: presChip('route.ParentSurvey'), lang };
  }
  afterPaint(root) {
    root.querySelectorAll('[data-q]').forEach(r => { r.onchange = () => this.setState({ a: { ...this.state.a, [r.dataset.q]: r.value }, err: '' }); });
    const note = root.querySelector('#fp-note'); if (note) note.oninput = () => { this.state.note = note.value; };
  }
  act() {
    return {
      next: async () => {
        const ctx = this.ctx(); const lang = getLang(ctx.client); const a = this.state.a;
        if (Q.some(q => !a[q.key])) return this.setState({ err: T[lang].missing });
        try { await this.do('checkin.save', { client: ctx.client.id, role: 'guardian', week_of: this.s.today, answers: { ...a, note: this.state.note.trim(), lang } }); } catch { return; }
        toast(T[lang].thanks); pgo(this.params, 'ParentPortal');
      }
    };
  }
});
