// 49 · Insurance letters, explained (phone). Live: one card per thing the insurer did with the child's request
// (lettersFor in ParentPortal.js, from s.requests), each with what it means and what the guardian has to do,
// usually nothing. A denial links to the appeal letter (39); only a guardian can appeal. Product direction #68:
// guardians "don't really" understand the payer's letters. A glossary of the words those letters use closes the page.
import { register, Screen } from '../app.js';
import { famCtx, getLang, setLang, fdate, pgo, callSheet, childName, lettersFor, guardHeader, guardFooter } from './ParentPortal.js';
import { C_CSS } from './MobileApp.js';

const GLOSSARY = {
  en: [
    ['Prior authorization', 'Asking the insurance company to approve a service before it is paid for. Harvest does this for you.'],
    ['Units', 'How the insurance company counts the time Harvest spends with your child.'],
    ['Medical necessity', 'Whether the insurance company agrees your child needs this help. Harvest sends notes and school information to show it.'],
    ['Continued stay', 'Asking to keep services going when an approval is about to run out.'],
    ['Appeal', 'Asking the insurance company to look again after it says no. Only a parent or guardian can appeal.'],
    ['Peer-to-peer', "A phone call between Harvest's clinician and the insurance company's doctor about your child's case."]
  ],
  es: [
    ['Autorización previa', 'Pedirle al seguro que apruebe un servicio antes de pagarlo. Harvest lo hace por usted.'],
    ['Unidades', 'Cómo el seguro cuenta el tiempo que Harvest pasa con su hijo.'],
    ['Necesidad médica', 'Si el seguro está de acuerdo en que su hijo necesita esta ayuda. Harvest envía notas e información de la escuela para mostrarlo.'],
    ['Continuación de servicios', 'Pedir que los servicios sigan cuando una aprobación está por acabarse.'],
    ['Apelación', 'Pedirle al seguro que lo revise otra vez después de decir que no. Solo un padre, madre o tutor puede apelar.'],
    ['Llamada entre médicos', 'Una llamada entre el clínico de Harvest y el médico del seguro sobre el caso de su hijo.']
  ]
};
const T = {
  en: { title: () => 'Insurance updates', emptyTitle: 'Nothing from the insurance company yet', example: 'See an example',
    appeal: 'Sign the appeal', see: 'See the appeal', words: 'Word list', more: n => `Earlier updates · ${n}`, fewer: 'Fewer' },
  es: { title: () => 'Noticias del seguro', emptyTitle: 'Todavía no hay nada del seguro', example: 'Ver un ejemplo',
    appeal: 'Firmar la apelación', see: 'Ver la apelación', words: 'Lista de palabras', more: n => `Noticias anteriores · ${n}`, fewer: 'Menos' }
};

register('ParentLetters', class extends Screen {
  init() { this.state = { all: false, words: false }; }
  ctx() { return famCtx(this.s, this.params); }
  all() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang];
    return lettersFor(s, c, lang).map((l, i) => ({
      ...l, i, chip: l.chip.charAt(0).toUpperCase() + l.chip.slice(1), when: l.at ? fdate(l.at, lang) : '',
      style: l.urgent ? 'border-color:var(--late-fg)' : '',
      btn: l.action ? (l.action.kind === 'appeal' ? t.appeal : t.see) : '', btnCls: l.action?.kind === 'appeal' ? 'pri' : ''
    }));
  }
  renderVals() {
    const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const all = this.all(); const letters = this.state.all ? all : all.slice(0, 2);
    return {
      hd: guardHeader(t.title(child), lang), ft: guardFooter(lang),
      t: { emptyTitle: t.emptyTitle, example: t.example, words: t.words },
      letters, example: !all.length && !this.params.t ? () => pgo({ c: 'EC' }, 'ParentLetters') : null,
      moreN: all.length > 2, moreLabel: this.state.all ? t.fewer : t.more(all.length - 2), toggleAll: () => this.setState({ all: !this.state.all }),
      showWords: this.state.words, wordsOpen: this.state.words ? 'true' : 'false', toggleWords: () => this.setState({ words: !this.state.words }),
      glossary: GLOSSARY[lang].map(([term, def]) => ({ term, def }))
    };
  }
  get css() { return C_CSS; }
  get anchors() {
    const ctx = () => this.ctx();
    return {
      en: () => { setLang('en'); this.setState({}); },
      es: () => { setLang('es'); this.setState({}); },
      act: (e, el) => { const l = this.all()[+el?.dataset?.i]; if (l?.action) pgo(this.params, l.action.screen, { id: l.action.id }); },
      back: () => pgo(this.params, 'ParentPortal'),
      call: () => callSheet(this.s, ctx(), getLang(ctx().client))
    };
  }
  set anchors(v) { }
});
