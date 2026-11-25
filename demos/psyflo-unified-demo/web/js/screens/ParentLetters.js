// 49 · Insurance letters, explained (phone). One card per thing the insurer did with the child's request (lettersFor in ParentPortal.js, from the
// guardian's own requests), each in three parts: What this says · What you can do · By when (the date carries where it came from).
// A denial links to the appeal letter; a parent or guardian can appeal, Harvest prepares the letter, the guardian reviews and signs.
import { register, ui, esc } from '../app.js';
import { PortalScreen, getLang, phref, btn, chip, presChip, childName, lettersFor, LETTER_TEXT } from './ParentPortal.js';

const GLOSSARY = {
  en: [
    ['Prior authorization', 'Asking the insurance company to approve a service before it is paid for. Harvest does this for you.'],
    ['Units', 'How the insurance company counts the time Harvest spends with your child.'],
    ['Medical necessity', 'Whether the insurance company agrees your child needs this help. Harvest sends information from the record to show it.'],
    ['Continued stay', 'Asking to keep services going when an approval is about to run out.'],
    ['Appeal', 'Asking the insurance company to look again after it says no. A parent or guardian can appeal.'],
    ['Peer-to-peer', "A phone call between Harvest's clinician and the insurance company's doctor about your child's case."]
  ],
  es: [
    ['Autorización previa', 'Pedirle al seguro que apruebe un servicio antes de pagarlo. Harvest lo hace por usted.'],
    ['Unidades', 'Cómo el seguro cuenta el tiempo que Harvest pasa con su hijo.'],
    ['Necesidad médica', 'Si el seguro está de acuerdo en que su hijo necesita esta ayuda. Harvest envía información del registro para mostrarlo.'],
    ['Continuación de servicios', 'Pedir que los servicios sigan cuando una aprobación está por acabarse.'],
    ['Apelación', 'Pedirle al seguro que lo revise otra vez después de decir que no. Un padre, madre o tutor puede apelar.'],
    ['Llamada entre médicos', 'Una llamada entre el clínico de Harvest y el médico del seguro sobre el caso de su hijo.']
  ]
};
const T = {
  en: { title: 'Insurance updates', sub: 'Letters from the insurance company, in plain words', says: 'What this says', can: 'What you can do', by: 'By when',
    emptyTitle: 'Nothing from the insurance company yet', emptyText: c => `When Harvest asks the insurance company to approve ${c}'s help at school, every step shows here, explained.`,
    words: 'Words in insurance letters', call: 'Questions? Call us' },
  es: { title: 'Noticias del seguro', sub: 'Cartas del seguro, en palabras sencillas', says: 'Lo que dice esto', can: 'Lo que puede hacer', by: 'Para cuándo',
    emptyTitle: 'Todavía no hay nada del seguro', emptyText: c => `Cuando Harvest le pida al seguro que apruebe la ayuda de ${c} en la escuela, cada paso aparece aquí, explicado.`,
    words: 'Palabras en las cartas del seguro', call: '¿Preguntas? Llámenos' }
};

register('ParentLetters', class extends PortalScreen {
  page() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const lt = LETTER_TEXT[lang]; const child = childName(c);
    const letters = lettersFor(s, c, lang);
    const card = (l, i) => `<article class="fp-card${l.urgent ? ' fp-card--danger' : ''}" aria-labelledby="fp-l${i}" data-letter="${esc(l.id)}"${l.appeal ? ` data-appeal-status="${esc(l.appeal)}"` : ''}>
      <div>${chip(l.cls, l.chip)}</div><h2 class="fp-h2" id="fp-l${i}">${esc(l.title)}</h2>
      <dl class="fp-kv"><dt>${t.says}</dt><dd>${esc(l.says)}</dd><dt>${t.can}</dt><dd>${esc(l.can)}</dd>
      <dt>${t.by}</dt><dd>${esc(l.by.text)}${l.by.how ? `<br><span class="fp-muted">${esc(l.by.how)}</span>` : ''}${l.by.rule ? ` <span style="display:inline-block;margin-top:4px">${ui.sourceChip(l.by.rule)}</span>` : ''}</dd></dl>
      ${l.action ? btn(l.action.kind === 'appeal' ? 'p' : 'o', phref(this.params, l.action.screen, { id: l.action.id }), esc(l.action.kind === 'appeal' ? lt.openAppeal : lt.seeAppeal)) : ''}</article>`;
    const body = (letters.length ? letters.map(card).join('') : `<section class="fp-card"><h2 class="fp-h2">${t.emptyTitle}</h2><p class="fp-p fp-muted">${esc(t.emptyText(child))}</p></section>`)
      + `<section class="fp-card" aria-labelledby="fp-words"><h2 class="fp-h2" id="fp-words">${t.words}</h2>${GLOSSARY[lang].map(([term, def]) => `<details class="fp-det"><summary>${esc(term)}</summary><p class="fp-p fp-muted">${esc(def)}</p></details>`).join('')}</section>`;
    return { title: esc(t.title), sub: esc(t.sub), body, pres: presChip('route.ParentLetters'), lang };
  }
});
