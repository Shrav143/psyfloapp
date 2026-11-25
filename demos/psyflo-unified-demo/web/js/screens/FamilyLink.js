// 8 · Family link (phone, Flow D). Five steps, one task per screen (guardian · insurance · permission to call · best time · transport).
// On load familyLink.open; each Next calls familyLink.step with the answers; the last step calls familyLink.submit (the Eligibility check then has the
// lookup details ready; nothing is checked before). Questions turned off in Settings · family link are skipped. Reached at /f/<token>. The link is the
// guardian's identity: without one this screen says so instead of making one (only staff send a link). What the guardian types is kept in this screen
// until Next, and filled in from the school's referral when the record has it (nothing is typed twice).
import { register, toast, esc, api } from '../app.js';
import { bindForm } from './SchoolPortal.js';
import { PortalScreen, famCtx, getLang, phref, btn, chip, presChip } from './ParentPortal.js';

const STEPS = [
  { key: 'guardian', q: ['guardian', 'phone', 'language', 'address'] },
  { key: 'insurance', q: ['insurance', 'dob'] },
  { key: 'consent', q: ['consent', 'household'] },
  { key: 'best_time', q: ['best_time'] },
  { key: 'transport', q: ['transport'] }
];
const DEFAULT_OFF = ['address', 'household'];
const FIELDS = { guardian: ['guardian_name', 'relationship', 'phone', 'language', 'address'], insurance: ['plan_kind', 'medicaid_id', 'dob', 'card_photo'], consent: ['consent_record', 'household'], best_time: ['best_time'], transport: ['transport'] };

const T = {
  en: { head: 'Harvest Outreach Center', names: { guardian: 'About you', insurance: 'Insurance details', consent: 'Permission to call', best_time: 'Best time to call', transport: 'Getting to the intake' },
    stepOf: (i, n) => `Step ${i} of ${n}`, intro: { guardian: c => `Who we should talk to about ${c}.`, insurance: () => 'Your child\'s insurance, so Harvest can check it before calling.', consent: () => 'So we can call you.', best_time: () => 'The first call is a conversation with a Harvest clinician.', transport: () => 'The first visit (intake) is in person, at the school or our office.' },
    gname: 'Your name', rel: c => `You are ${c}'s…`, phone: 'Best phone number', lang: 'Language for calls', addr: 'Home address',
    plan: 'Your child\'s insurance', mid: 'Medicaid ID (on the card)', photo: 'Or take a photo of the card.', camera: 'Use the camera', dob: 'Child\'s date of birth',
    consentQ: c => `Can Harvest call you about ${c}?`, consentNote: 'You can say stop at any time.', household: 'Who else lives in the home? (optional)',
    bestQ: 'When is it easiest to talk?', transQ: 'Can you get to an in-person intake?',
    next: 'Next', submit: 'Send to Harvest', back: 'Back',
    thanks: g => `Thank you${g ? ', ' + g : ''}`, done: (c, when) => `Harvest will check ${c}'s insurance and call you${when ? ' (' + when.toLowerCase() + ')' : ''}. You do not need to do anything else now.`,
    doneNote: 'If something changes, call us or open this link again.', portal: 'Open your family page', doneLine: 'All five steps done',
    prefilled: 'Filled in from what Harvest already has. Check it and fix anything wrong.',
    noLinkTitle: 'Your link is not ready', noLink: 'Harvest has not sent you a link yet, or it is not the right one. Call Harvest and they will send it.',
    need: { guardian_name: 'Type your name', phone: 'Add a phone number', medicaid_id: 'Type the Medicaid ID from the card, or take a photo of it', consent_record: 'Choose yes or no', plan_kind: 'Choose your child\'s insurance' },
    sentToast: 'Sent to Harvest · thank you', photoToast: n => `Card photo added (${n}) · Harvest checks it against the number` },
  es: { head: 'Harvest Outreach Center', names: { guardian: 'Sobre usted', insurance: 'Datos del seguro', consent: 'Permiso para llamar', best_time: 'Mejor hora para llamar', transport: 'Cómo llegar a la admisión' },
    stepOf: (i, n) => `Paso ${i} de ${n}`, intro: { guardian: c => `Con quién debemos hablar sobre ${c}.`, insurance: () => 'El seguro de su hijo, para que Harvest lo revise antes de llamar.', consent: () => 'Para poder llamarle.', best_time: () => 'La primera llamada es una conversación con un clínico de Harvest.', transport: () => 'La primera visita (admisión) es en persona, en la escuela o en nuestra oficina.' },
    gname: 'Su nombre', rel: c => `Usted es … de ${c}`, phone: 'Mejor número de teléfono', lang: 'Idioma para las llamadas', addr: 'Dirección de la casa',
    plan: 'El seguro de su hijo', mid: 'Número de Medicaid (en la tarjeta)', photo: 'O tome una foto de la tarjeta.', camera: 'Usar la cámara', dob: 'Fecha de nacimiento del niño',
    consentQ: c => `¿Puede Harvest llamarle sobre ${c}?`, consentNote: 'Puede decir que paremos en cualquier momento.', household: '¿Quién más vive en la casa? (opcional)',
    bestQ: '¿Cuándo es más fácil hablar?', transQ: '¿Puede ir a una cita de admisión en persona?',
    next: 'Siguiente', submit: 'Enviar a Harvest', back: 'Atrás',
    thanks: g => `Gracias${g ? ', ' + g : ''}`, done: (c, when) => `Harvest revisará el seguro de ${c} y le llamará${when ? ' (' + when + ')' : ''}. No necesita hacer nada más por ahora.`,
    doneNote: 'Si algo cambia, llámenos o abra este enlace otra vez.', portal: 'Abrir la página de su familia', doneLine: 'Los cinco pasos listos',
    prefilled: 'Lo llenamos con lo que Harvest ya tiene. Revíselo y corrija lo que esté mal.',
    noLinkTitle: 'Su enlace no está listo', noLink: 'Harvest todavía no le ha enviado un enlace, o no es el correcto. Llame a Harvest y se lo enviarán.',
    need: { guardian_name: 'Escriba su nombre', phone: 'Agregue un número de teléfono', medicaid_id: 'Escriba el número de Medicaid de la tarjeta, o tome una foto', consent_record: 'Elija sí o no', plan_kind: 'Elija el seguro de su hijo' },
    sentToast: 'Enviado a Harvest · gracias', photoToast: n => `Foto de la tarjeta agregada (${n}) · Harvest la compara con el número` }
};
const RELS = [['grandmother', 'grandmother', 'abuela'], ['grandfather', 'grandfather', 'abuelo'], ['mother', 'mother', 'madre'], ['father', 'father', 'padre'], ['aunt or uncle', 'aunt or uncle', 'tía o tío'], ['foster parent', 'foster parent', 'padre/madre de crianza'], ['legal guardian', 'other legal guardian', 'otro tutor legal']];
const PLANS = [['Medicaid (Cardinal Care)', 'Medicaid (Cardinal Care)', 'Medicaid (Cardinal Care)'], ['Medicaid through a health plan', 'Medicaid through a health plan (Anthem, Aetna, Humana, Sentara, UnitedHealthcare)', 'Medicaid por un plan de salud (Anthem, Aetna, Humana, Sentara, UnitedHealthcare)'], ['Other insurance', 'Other insurance', 'Otro seguro'], ['No insurance', 'No insurance', 'Sin seguro'], ['Not sure', 'Not sure', 'No estoy seguro']];
const LANGS = [['English', 'English', 'Inglés'], ['Spanish', 'Español', 'Español'], ['Other', 'Other', 'Otro']];
const CONSENT = [['yes', 'Yes', 'Sí'], ['no', 'No', 'No']];
const TIMES = [['Mornings before 11 am', 'Mornings before 11 am', 'En la mañana, antes de las 11'], ['Afternoons after 2 pm', 'Afternoons after 2 pm', 'En la tarde, después de las 2'], ['Evenings after 5 pm', 'Evenings after 5 pm', 'En la noche, después de las 5'], ['Any time', 'Any time', 'A cualquier hora']];
const TRANS = [['Can get to the school', 'Yes, I can get to the school or office', 'Sí, puedo llegar a la escuela u oficina'], ['Needs a ride', 'I need a ride', 'Necesito transporte'], ['Phone or video, please', 'Could we do it by phone or video?', '¿Podemos hacerlo por teléfono o video?']];

const isoFromText = v => { const m = String(v || '').match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''; };
const textFromIso = v => { const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[2]} / ${m[3]} / ${m[1]}` : ''; };

register('FamilyLink', class extends PortalScreen {
  async setup() {
    const ctx = famCtx(this.s, this.params);
    this.token = (ctx.fl && ctx.fl.token) || null;
    const a = { ...((ctx.fl && ctx.fl.answers) || {}) };
    // what the school (referral) or the record already has, so nothing is typed twice
    const rc = (ctx.ref && ctx.ref.contact) || {}; this.prefilled = false;
    const g = ctx.client.guardian || {};
    if (!a.guardian_name) { const n = rc.name || (g.name && !/^(guardian|grandmother)$/.test(g.name) ? g.name : ''); if (n) { a.guardian_name = n; this.prefilled = true; } }
    if (!a.relationship && g.relationship) a.relationship = g.relationship;
    if (!a.phone) { const p = rc.phone || g.phone; if (p) { a.phone = p; this.prefilled = true; } }
    if (!a.language) a.language = g.language === 'es' ? 'Spanish' : 'English';
    a.dob_text = textFromIso(a.dob);
    this.ans = a;
    const steps = this.steps(); let step = steps[0];
    if (ctx.fl && ctx.fl.submitted_at) step = 'done';
    else if (ctx.fl) step = steps.find(k => !(ctx.fl.steps && ctx.fl.steps[k])) || steps.at(-1);
    this.state = { step, err: '' };
    if (this.token && ctx.fl && !ctx.fl.opened_at) { try { await api.do('familyLink.open', { token: this.token }); } catch { } }
  }
  ctx() { return famCtx(this.s, this.token ? { t: this.token } : this.params); }
  cfg(key) { return ((this.s.settings && this.s.settings.family_link && this.s.settings.family_link.questions) || []).find(q => q.key === key); }
  asked(key) { const q = this.cfg(key); if (key === 'insurance') return true; return q ? q.ask !== false : !DEFAULT_OFF.includes(key); }
  required(key) { const q = this.cfg(key); return q ? !!q.required : ['guardian', 'phone', 'insurance', 'consent'].includes(key); }
  steps() { return STEPS.filter(st => st.q.some(k => this.asked(k))).map(st => st.key); }
  page() {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const t = T[lang]; const L = lang === 'es' ? 2 : 1;
    if (!ctx.fl) return { title: t.noLinkTitle, body: `<section class="fp-card"><p class="fp-p">${t.noLink}</p></section>`, back: false, lang };
    const steps = this.steps(); const step = this.state.step; const i = steps.indexOf(step); const n = steps.length; const a = this.ans; const child = ctx.child; const done = step === 'done';
    const opts = (list, key) => list.map(o => `<label class="fp-opt${a[key] === o[0] ? ' on' : ''}"><input type="radio" name="${key}" value="${esc(o[0])}"${a[key] === o[0] ? ' checked' : ''}>${esc(o[L])}</label>`).join('');
    const sel = (id, k, list) => `<select class="fp-in" id="${id}" data-k="${k}">${list.map(o => `<option value="${esc(o[0])}">${esc(o[L])}</option>`).join('')}</select>`;
    const stepper = done ? '' : `<ol class="fp-steps" aria-label="${esc(t.stepOf(i + 1, n))}">${steps.map((k, j) => `<li class="${j < i ? 'on' : j === i ? 'cur' : ''}"${j === i ? ' aria-current="step"' : ''}><i></i><span class="ui-sr">${esc(t.names[k])}</span></li>`).join('')}</ol><p class="fp-hint" style="margin:0">${esc(t.stepOf(i + 1, n))}</p>`;
    let form = '';
    if (step === 'guardian') {
      form = (this.prefilled ? `<p class="fp-note">${t.prefilled}</p>` : '')
        + (this.asked('guardian') ? `<div class="fp-field"><label class="fp-lab" for="gname">${t.gname}</label><input class="fp-in" id="gname" data-k="guardian_name" type="text" autocomplete="name"></div>
          <div class="fp-field"><label class="fp-lab" for="rel">${esc(t.rel(child))}</label>${sel('rel', 'relationship', RELS)}</div>` : '')
        + (this.asked('phone') ? `<div class="fp-field"><label class="fp-lab" for="phone">${t.phone}</label><input class="fp-in" id="phone" data-k="phone" type="tel" autocomplete="tel" placeholder="(434) 555-0100"></div>` : '')
        + (this.asked('language') ? `<fieldset class="fp-opts"><legend>${t.lang}</legend>${opts(LANGS, 'language')}</fieldset>` : '')
        + (this.asked('address') ? `<div class="fp-field"><label class="fp-lab" for="addr">${t.addr}</label><input class="fp-in" id="addr" data-k="address" type="text" autocomplete="street-address"></div>` : '');
    } else if (step === 'insurance') {
      form = `<div class="fp-field"><label class="fp-lab" for="plan">${t.plan}</label>${sel('plan', 'plan_kind', PLANS)}</div>
        <div class="fp-field"><label class="fp-lab" for="mid">${t.mid}</label><input class="fp-in" id="mid" data-k="medicaid_id" type="text" inputmode="numeric" placeholder="0000 000 000 00">
          <p class="fp-hint">${t.photo}${a.card_photo ? ' · ' + esc(a.card_photo) : ''}</p><a class="fp-link" role="button" href="#photo">${t.camera}</a><input type="file" id="cardphoto" accept="image/*" capture="environment" data-nobind style="display:none" aria-label="${esc(t.camera)}"></div>`
        + (this.asked('dob') ? `<div class="fp-field"><label class="fp-lab" for="dob">${t.dob}</label><input class="fp-in" id="dob" data-k="dob_text" type="text" inputmode="numeric" placeholder="MM / DD / YYYY"></div>` : '');
    } else if (step === 'consent') {
      form = (this.asked('consent') ? `<fieldset class="fp-opts fp-opts--row"><legend>${esc(t.consentQ(child))}</legend>${opts(CONSENT, 'consent_record')}</fieldset><p class="fp-hint" style="margin:0">${t.consentNote}</p>` : '')
        + (this.asked('household') ? `<div class="fp-field"><label class="fp-lab" for="hh">${t.household}</label><input class="fp-in" id="hh" data-k="household" type="text"></div>` : '');
    } else if (step === 'best_time') form = `<fieldset class="fp-opts"><legend>${t.bestQ}</legend>${opts(TIMES, 'best_time')}</fieldset>`;
    else if (step === 'transport') form = `<fieldset class="fp-opts"><legend>${t.transQ}</legend>${opts(TRANS, 'transport')}</fieldset>`;
    const timeLabel = (TIMES.find(x => x[0] === a.best_time) || [])[L];
    const err = this.state.err ? `<div class="fp-err" role="alert">${esc(this.state.err)}</div>` : '';
    const body = done
      ? `<section class="fp-card fp-card--ok" aria-labelledby="fp-th" role="status"><h2 class="fp-h2" id="fp-th">${esc(t.thanks((a.guardian_name || '').split(' ')[0]))}</h2><p class="fp-p">${esc(t.done(child, timeLabel))}</p><p class="fp-p fp-muted">${t.doneNote}</p>${btn('p', phref(this.params.t ? this.params : { t: this.token }, 'ParentPortal'), esc(t.portal))}</section>`
      : `${stepper}<form class="fp-card" novalidate>${form}${err}</form>
         <div style="display:flex;flex-direction:column;gap:10px"><a class="fp-btn fp-btn--p" role="button" href="#${i === n - 1 ? 'submit' : 'next'}">${i === n - 1 ? t.submit : t.next}</a>${i > 0 ? `<a class="fp-btn fp-btn--o" role="button" href="#back-step">${t.back}</a>` : ''}</div>`;
    return { title: esc(done ? t.doneLine : t.names[step]), sub: done ? '' : esc(t.intro[step](child)), body, back: false, pres: presChip('route.FamilyLink'), lang };
  }
  afterPaint(root) {
    bindForm(root, this.ans, (k, el) => { if (el.type === 'radio') this.setState({ err: '' }); });
    const inp = root.querySelector('#cardphoto');
    if (inp) inp.onchange = () => { const f = inp.files[0]; if (!f) return; this.ans.card_photo = f.name; toast(T[getLang(this.ctx().client)].photoToast(f.name)); this.setState({}); };
  }
  check(step) {
    const a = this.ans; const need = [];
    if (step === 'guardian') { if (this.asked('guardian') && this.required('guardian') && !(a.guardian_name || '').trim()) need.push('guardian_name'); if (this.asked('phone') && this.required('phone') && !(a.phone || '').trim()) need.push('phone'); }
    if (step === 'insurance') { if (!a.plan_kind) need.push('plan_kind'); if (/^Medicaid/.test(a.plan_kind || '') && !(a.medicaid_id || '').trim() && !a.card_photo) need.push('medicaid_id'); }
    if (step === 'consent' && this.asked('consent') && this.required('consent') && !a.consent_record) need.push('consent_record');
    return need;
  }
  async next() {
    const lang = getLang(this.ctx().client); const t = T[lang];
    const steps = this.steps(); const step = this.state.step; const i = steps.indexOf(step);
    const need = this.check(step);
    if (need.length) return this.setState({ err: t.need[need[0]] });
    if (step === 'insurance') this.ans.dob = isoFromText(this.ans.dob_text) || this.ans.dob || '';
    const answers = {}; for (const k of FIELDS[step]) if (this.ans[k] !== undefined && this.ans[k] !== '') answers[k] = this.ans[k];
    if (step === 'insurance' && answers.medicaid_id) answers.medicaid_id = answers.medicaid_id.trim();
    try {
      await this.do('familyLink.step', { token: this.token, step, answers });
      if (i < steps.length - 1) { this.setState({ step: steps[i + 1], err: '' }); scrollTo(0, 0); return; }
      await this.do('familyLink.submit', { token: this.token });
    } catch { return; }
    toast(t.sentToast); this.setState({ step: 'done', err: '' }); scrollTo(0, 0);
  }
  act() {
    return {
      next: () => this.next(), submit: () => this.next(),
      'back-step': () => { const steps = this.steps(); const i = steps.indexOf(this.state.step); if (i > 0) { this.setState({ step: steps[i - 1], err: '' }); scrollTo(0, 0); } },
      photo: () => document.getElementById('cardphoto') && document.getElementById('cardphoto').click()
    };
  }
});
