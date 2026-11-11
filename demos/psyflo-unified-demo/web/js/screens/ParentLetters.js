// 49 · Insurance letters, explained (phone). Live: one card per thing the insurer did with the child's request
// (lettersFor in ParentPortal.js, from s.requests), each with what it means and what the guardian has to do,
// usually nothing. A denial links to the appeal letter (39); only a guardian can appeal. Product direction #68:
// guardians "don't really" understand the payer's letters. A glossary of the words those letters use closes the page.
import { register, Screen } from '../app.js';
import { famCtx, getLang, setLang, fdate, pgo, callSheet, childName, lettersFor, LANG_ON, LANG_OFF } from './ParentPortal.js';

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
  en: { title: c => `Insurance updates · ${c}`, sub: 'Letters from the insurance company, in plain words', youDo: 'What you need to do:',
    emptyTitle: 'Nothing from the insurance company yet', emptyText: c => `When Harvest asks the insurance company to approve ${c}'s help at school, every step shows here, explained.`,
    example: 'See an example: a family with an appeal', appeal: 'Read and sign the appeal letter', see: 'See your appeal letter',
    words: 'Words in insurance letters', wordsSub: 'What they mean', back: 'Back to the family page', call: 'Questions? Call us' },
  es: { title: c => `Noticias del seguro · ${c}`, sub: 'Cartas del seguro, en palabras sencillas', youDo: 'Lo que tiene que hacer:',
    emptyTitle: 'Todavía no hay nada del seguro', emptyText: c => `Cuando Harvest le pida al seguro que apruebe la ayuda de ${c} en la escuela, cada paso aparece aquí, explicado.`,
    example: 'Ver un ejemplo: una familia con una apelación', appeal: 'Leer y firmar la carta de apelación', see: 'Ver su carta de apelación',
    words: 'Palabras en las cartas del seguro', wordsSub: 'Lo que significan', back: 'Volver a la página de la familia', call: '¿Preguntas? Llámenos' }
};

register('ParentLetters', class extends Screen {
  ctx() { return famCtx(this.s, this.params); }
  renderVals() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const letters = lettersFor(s, c, lang).map(l => ({
      ...l, when: l.at ? fdate(l.at, lang) : '',
      style: l.urgent ? 'border-color:#B9541F' : '', doBg: l.urgent ? '#FBE9E4' : '#F4F1EB',
      btn: l.action ? (l.action.kind === 'appeal' ? t.appeal : t.see) : '', btnCls: l.action?.kind === 'appeal' ? 'p' : 'o',
      act: l.action ? () => pgo(this.params, l.action.screen, { id: l.action.id }) : null
    }));
    return {
      t: { title: t.title(child), sub: t.sub, youDo: t.youDo, emptyTitle: t.emptyTitle, emptyText: t.emptyText(child), example: t.example, words: t.words, wordsSub: t.wordsSub, back: t.back, call: t.call },
      enStyle: lang === 'en' ? LANG_ON : LANG_OFF, esStyle: lang === 'es' ? LANG_ON : LANG_OFF,
      letters, example: !letters.length && !this.params.t ? () => pgo({ c: 'EC' }, 'ParentLetters') : null,
      glossary: GLOSSARY[lang].map(([term, def]) => ({ term, def }))
    };
  }
  get anchors() {
    const ctx = () => this.ctx();
    return {
      en: () => { setLang('en'); this.setState({}); },
      es: () => { setLang('es'); this.setState({}); },
      back: () => pgo(this.params, 'ParentPortal'),
      call: () => callSheet(this.s, ctx(), getLang(ctx().client))
    };
  }
  set anchors(v) { }
});
