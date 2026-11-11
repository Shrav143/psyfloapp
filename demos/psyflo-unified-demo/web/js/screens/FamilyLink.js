// 8 · Family link (phone, Flow D). Live: five steps (guardian · insurance · consent · best time · transport).
// On load familyLink.open; each Next → familyLink.step with the answers; Submit → familyLink.submit (the
// Eligibility screen then has the lookup details ready). Questions turned off in Settings · family link are skipped.
// Reached at /f/<token>; with no token it uses T.W.'s link (REF-118), created on the first Next if none was sent yet.
import { register, Screen, M, toast, api } from '../app.js';
import { bindForm } from './SchoolPortal.js';
import { famCtx, getLang, setLang, callSheet } from './ParentPortal.js';

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
  en: { head: 'A few details before we call you', step: (i, n, name, m) => `Step ${i} of ${n} · ${name} · about ${m} minute${m === 1 ? '' : 's'} left`, names: { guardian: 'about you', insurance: 'insurance details', consent: 'permission to call', best_time: 'best time to call', transport: 'getting to the intake' },
    intro: { guardian: c => `Who we should talk to about ${c}.`, insurance: () => 'Your child\'s insurance, so we can check it before we call.', consent: () => 'So we can call you.', best_time: () => 'The call takes about 20 minutes.', transport: () => 'The first visit (intake) is in person, at the school or our office.' },
    gname: 'Your name', rel: (c) => `You are ${c}'s…`, phone: 'Best phone number', lang: 'Language for calls', addr: 'Home address',
    plan: 'Your child\'s insurance', mid: 'Medicaid ID (on the card)', photo: 'Or take a photo of the card.', camera: 'Use the camera', dob: 'Child\'s date of birth',
    consentQ: c => `Can Harvest call you about ${c}?`, consentNote: 'You can say stop at any time.', household: 'Who else lives in the home? (optional)',
    bestQ: 'When is it easiest to talk?', transQ: 'Can you get to an in-person intake?',
    next: 'Next', submit: 'Send to Harvest', back: 'Back', secure: 'Secure · only Harvest Outreach Center sees this', call: 'Call us instead', other: 'Español',
    thanks: g => `Thank you${g ? ', ' + g : ''}.`, done: (c, when) => `Harvest will check ${c}'s insurance and call you${when ? ' ' + when.toLowerCase() : ''}. You do not need to do anything else now.`,
    doneNote: 'If something changes, call us or open this link again.', portal: 'Open your family page', doneLine: 'Done · thank you',
    need: { guardian_name: 'Type your name', phone: 'Add a phone number', medicaid_id: 'Type the Medicaid ID from the card, or take a photo of it', consent_record: 'Choose yes or no', plan_kind: 'Choose your child\'s insurance' },
    sentToast: 'Sent to Harvest · thank you', photoToast: n => `Card photo added (${n}) · Harvest checks it against the number` },
  es: { head: 'Unos datos antes de llamarle', step: (i, n, name, m) => `Paso ${i} de ${n} · ${name} · faltan unos ${m} minuto${m === 1 ? '' : 's'}`, names: { guardian: 'sobre usted', insurance: 'datos del seguro', consent: 'permiso para llamar', best_time: 'mejor hora para llamar', transport: 'cómo llegar a la admisión' },
    intro: { guardian: c => `Con quién debemos hablar sobre ${c}.`, insurance: () => 'El seguro de su hijo, para revisarlo antes de llamar.', consent: () => 'Para poder llamarle.', best_time: () => 'La llamada dura unos 20 minutos.', transport: () => 'La primera visita (admisión) es en persona, en la escuela o en nuestra oficina.' },
    gname: 'Su nombre', rel: (c) => `Usted es … de ${c}`, phone: 'Mejor número de teléfono', lang: 'Idioma para las llamadas', addr: 'Dirección de la casa',
    plan: 'El seguro de su hijo', mid: 'Número de Medicaid (en la tarjeta)', photo: 'O tome una foto de la tarjeta.', camera: 'Usar la cámara', dob: 'Fecha de nacimiento del niño',
    consentQ: c => `¿Puede Harvest llamarle sobre ${c}?`, consentNote: 'Puede decir que paremos en cualquier momento.', household: '¿Quién más vive en la casa? (opcional)',
    bestQ: '¿Cuándo es más fácil hablar?', transQ: '¿Puede ir a una cita de admisión en persona?',
    next: 'Siguiente', submit: 'Enviar a Harvest', back: 'Atrás', secure: 'Seguro · solo Harvest Outreach Center lo ve', call: 'Prefiero llamar', other: 'English',
    thanks: g => `Gracias${g ? ', ' + g : ''}.`, done: (c, when) => `Harvest revisará el seguro de ${c} y le llamará${when ? ' (' + when + ')' : ''}. No necesita hacer nada más por ahora.`,
    doneNote: 'Si algo cambia, llámenos o abra este enlace otra vez.', portal: 'Abrir la página de su familia', doneLine: 'Listo · gracias',
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

register('FamilyLink', class extends Screen {
  async init() {
    const ctx = famCtx(this.s, this.params);
    this.token = ctx.fl?.token || null;
    const a = { ...(ctx.fl?.answers || {}) };
    if (!a.guardian_name && ctx.client.guardian?.name && !/^(guardian|grandmother)$/.test(ctx.client.guardian.name)) a.guardian_name = ctx.client.guardian.name;
    if (!a.relationship && ctx.client.guardian?.relationship) a.relationship = ctx.client.guardian.relationship;
    if (!a.phone && ctx.client.guardian?.phone) a.phone = ctx.client.guardian.phone;
    if (!a.language) a.language = ctx.client.guardian?.language === 'es' ? 'Spanish' : 'English';
    a.dob_text = textFromIso(a.dob);
    this.ans = a;
    const steps = this.steps();
    let step = steps[0];
    if (ctx.fl?.submitted_at && this.s.preset !== 'canvas') step = 'done';
    else if (this.s.preset === 'canvas' && steps.includes('insurance')) step = 'insurance';
    else if (ctx.fl) step = steps.find(k => !ctx.fl.steps?.[k]) || steps.at(-1);
    this.state = { step, err: '' };
    if (this.token && ctx.fl && !ctx.fl.opened_at) { try { await api.do('familyLink.open', { token: this.token }); } catch { } }
  }
  ctx() { return famCtx(this.s, this.token ? { t: this.token } : this.params); }
  cfg(key) { return (this.s.settings?.family_link?.questions || []).find(q => q.key === key); }
  asked(key) { const q = this.cfg(key); if (key === 'insurance') return true; return q ? q.ask !== false : !DEFAULT_OFF.includes(key); }
  required(key) { const q = this.cfg(key); return q ? !!q.required : ['guardian', 'phone', 'insurance', 'consent'].includes(key); }
  steps() { return STEPS.filter(st => st.q.some(k => this.asked(k))).map(st => st.key); }
  renderVals() {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const t = T[lang]; const L = lang === 'es' ? 2 : 1;
    const steps = this.steps(); const step = this.state.step; const i = steps.indexOf(step);
    const n = steps.length; const a = this.ans;
    const opts = (list, key) => list.map(o => ({ v: o[0], label: o[L], cls: a[key] === o[0] ? 'on' : '', chk: a[key] === o[0] ? 'checked' : '' }));
    const child = ctx.child; const done = step === 'done';
    const st = Object.fromEntries(STEPS.map(x => [x.key, x.key === step])); st.done = done;
    const timeLabel = (TIMES.find(x => x[0] === a.best_time) || [])[L];
    return {
      t: { ...t, rel: t.rel(child), consentQ: t.consentQ(child), thanks: t.thanks((a.guardian_name || '').split(' ')[0]) },
      segs: (done ? steps : steps).map((k, j) => done || j <= i ? '#5FC0BE' : '#3C4756'),
      stepLine: done ? t.doneLine : t.step(i + 1, n, t.names[step], Math.max(1, Math.ceil((n - i) / 2))),
      intro: done ? '' : t.intro[step](child), st,
      ask: Object.fromEntries(['guardian', 'phone', 'language', 'address', 'dob', 'consent', 'household'].map(k => [k, this.asked(k)])),
      rels: RELS.map(o => ({ v: o[0], label: o[L] })), plans: PLANS.map(o => ({ v: o[0], label: o[L] })),
      langOpts: opts(LANGS, 'language'), consentOpts: opts(CONSENT, 'consent_record'), timeOpts: opts(TIMES, 'best_time'), transOpts: opts(TRANS, 'transport'),
      photoName: a.card_photo || '',
      nextLabel: i === n - 1 ? t.submit : t.next, canBack: !done && i > 0,
      doneText: t.done(child, timeLabel), portalHref: this.token ? `/parent/${this.token}/ParentPortal` : 'ParentPortal.dc.html',
      err: this.state.err
    };
  }
  after(root) {
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
  async ensureToken() {
    if (this.token) return this.token;
    const ctx = famCtx(this.s, {});
    const ref = ctx.ref?.id || 'REF-118';
    const r = await this.do('familyLink.send', { referral: ref, by: 'jperez' });
    this.token = r.token;
    await this.do('familyLink.open', { token: this.token });
    return this.token;
  }
  async next() {
    const lang = getLang(this.ctx().client); const t = T[lang];
    const steps = this.steps(); const step = this.state.step; const i = steps.indexOf(step);
    const need = this.check(step);
    if (need.length) return this.setState({ err: t.need[need[0]] });
    if (step === 'insurance') this.ans.dob = isoFromText(this.ans.dob_text) || this.ans.dob || '';
    const answers = {}; for (const k of FIELDS[step]) if (this.ans[k] !== undefined && this.ans[k] !== '') answers[k] = this.ans[k];
    if (step === 'insurance' && answers.medicaid_id) answers.medicaid_id = answers.medicaid_id.trim();
    const token = await this.ensureToken();
    await this.do('familyLink.step', { token, step, answers });
    if (i < steps.length - 1) { this.setState({ step: steps[i + 1], err: '' }); scrollTo(0, 0); return; }
    await this.do('familyLink.submit', { token });
    toast(t.sentToast);
    this.setState({ step: 'done', err: '' }); scrollTo(0, 0);
  }
  get anchors() {
    return {
      next: () => this.next(),
      back: () => { const steps = this.steps(); const i = steps.indexOf(this.state.step); if (i > 0) { this.setState({ step: steps[i - 1], err: '' }); scrollTo(0, 0); } },
      photo: () => document.getElementById('cardphoto')?.click(),
      help: () => { const ctx = this.ctx(); const l = getLang(ctx.client); callSheet(this.s, ctx, l, l === 'es' ? 'el equipo de admisiones' : 'the intake team'); },
      es: () => { const c = this.ctx().client; setLang(getLang(c) === 'es' ? 'en' : 'es'); this.setState({}); }
    };
  }
  set anchors(v) { }
});
