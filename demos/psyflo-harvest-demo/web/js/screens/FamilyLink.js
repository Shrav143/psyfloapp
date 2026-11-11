// 8 · Family link (phone, Flow D). Live: one question per screen with progress dots and an EN/ES toggle. The questions group
// into the five steps the store tracks (guardian · insurance · consent · best time · transport): each time a group's last
// question is answered, familyLink.step saves that group; the last Send → familyLink.submit (the Eligibility screen then has the
// lookup details ready). On load familyLink.open. Questions turned off in Settings · family link are skipped.
// Reached at /f/<token>; with no token it uses T.W.'s link (REF-118), created on the first Next if none was sent yet.
import { register, Screen, M, toast, api } from '../app.js';
import { bindForm } from './SchoolPortal.js';
import { parentHref } from '../shared/links.js';
import { famCtx, getLang, setLang, callSheet, guardHeader } from './ParentPortal.js';
import { C_CSS } from './MobileApp.js';

const FIELDS = { guardian: ['guardian_name', 'relationship', 'phone', 'language', 'address'], insurance: ['plan_kind', 'medicaid_id', 'dob', 'card_photo'], consent: ['consent_record', 'household'], best_time: ['best_time'], transport: ['transport'] };
const DEFAULT_OFF = ['address', 'household'];
// one entry per question: id (the input), k (the answer key), step (the store step it belongs to), ask (the settings key)
const PAGES = [
  { id: 'gname', k: 'guardian_name', step: 'guardian', ask: 'guardian', kind: 'text', itype: 'text', auto: 'name', q: 'gname' },
  { id: 'rel', k: 'relationship', step: 'guardian', ask: 'guardian', kind: 'select', q: 'rel' },
  { id: 'phone', k: 'phone', step: 'guardian', ask: 'phone', kind: 'text', itype: 'tel', auto: 'tel', ph: '(434) 555-0100', q: 'phone' },
  { id: 'lang', k: 'language', step: 'guardian', ask: 'language', kind: 'radio', q: 'lang' },
  { id: 'addr', k: 'address', step: 'guardian', ask: 'address', kind: 'text', itype: 'text', auto: 'street-address', q: 'addr' },
  { id: 'plan', k: 'plan_kind', step: 'insurance', ask: 'insurance', kind: 'select', q: 'plan' },
  { id: 'mid', k: 'medicaid_id', step: 'insurance', ask: 'insurance', kind: 'card', q: 'mid' },
  { id: 'dob', k: 'dob_text', step: 'insurance', ask: 'dob', kind: 'text', itype: 'text', mode: 'numeric', ph: 'MM / DD / YYYY', q: 'dob' },
  { id: 'consent', k: 'consent_record', step: 'consent', ask: 'consent', kind: 'radio', q: 'consent' },
  { id: 'hh', k: 'household', step: 'consent', ask: 'household', kind: 'text', itype: 'text', q: 'hh' },
  { id: 'time', k: 'best_time', step: 'best_time', ask: 'best_time', kind: 'radio', col: true, q: 'time' },
  { id: 'trans', k: 'transport', step: 'transport', ask: 'transport', kind: 'radio', col: true, q: 'trans' }
];

const T = {
  en: { q: { gname: 'Your name', rel: c => `You are ${c}'s…`, phone: 'Best phone number', lang: 'Language for calls', addr: 'Home address', plan: 'Your child\'s insurance', mid: 'Medicaid ID on the card', dob: 'Child\'s birth date', consent: c => `Can Harvest call you about ${c}?`, hh: 'Who else lives at home? (optional)', time: 'Best time to talk?', trans: 'Can you get to the intake visit?' },
    next: 'Next', submit: 'Send to Harvest', back: 'Back', call: 'Call us', camera: 'Take a photo of the card', choose: 'Choose…',
    thanks: g => `Thank you${g ? ', ' + g : ''}.`, done: when => `Harvest will call you${when ? ' ' + when.toLowerCase() : ' soon'}.`, portal: 'Open your page',
    need: { guardian_name: 'Type your name', phone: 'Add a phone number', medicaid_id: 'Type the ID or take a photo', consent_record: 'Choose yes or no', plan_kind: 'Choose one' },
    sentToast: 'Sent to Harvest · thank you', photoToast: n => `Card photo added (${n})` },
  es: { q: { gname: 'Su nombre', rel: c => `Usted es … de ${c}`, phone: 'Mejor número de teléfono', lang: 'Idioma para las llamadas', addr: 'Dirección de la casa', plan: 'El seguro de su hijo', mid: 'Número de Medicaid de la tarjeta', dob: 'Fecha de nacimiento del niño', consent: c => `¿Puede Harvest llamarle sobre ${c}?`, hh: '¿Quién más vive en casa? (opcional)', time: '¿Mejor hora para hablar?', trans: '¿Puede ir a la cita de admisión?' },
    next: 'Siguiente', submit: 'Enviar a Harvest', back: 'Atrás', call: 'Llámenos', camera: 'Tomar foto de la tarjeta', choose: 'Elija…',
    thanks: g => `Gracias${g ? ', ' + g : ''}.`, done: when => `Harvest le llamará${when ? ' (' + when + ')' : ' pronto'}.`, portal: 'Abrir su página',
    need: { guardian_name: 'Escriba su nombre', phone: 'Agregue un teléfono', medicaid_id: 'Escriba el número o tome una foto', consent_record: 'Elija sí o no', plan_kind: 'Elija una' },
    sentToast: 'Enviado a Harvest · gracias', photoToast: n => `Foto de la tarjeta agregada (${n})` }
};
const RELS = [['grandmother', 'grandmother', 'abuela'], ['grandfather', 'grandfather', 'abuelo'], ['mother', 'mother', 'madre'], ['father', 'father', 'padre'], ['aunt or uncle', 'aunt or uncle', 'tía o tío'], ['foster parent', 'foster parent', 'padre/madre de crianza'], ['legal guardian', 'other legal guardian', 'otro tutor legal']];
const PLANS = [['Medicaid (Cardinal Care)', 'Medicaid (Cardinal Care)', 'Medicaid (Cardinal Care)'], ['Medicaid through a health plan', 'Medicaid through a health plan (Anthem, Aetna, Humana, Sentara, UnitedHealthcare)', 'Medicaid por un plan de salud (Anthem, Aetna, Humana, Sentara, UnitedHealthcare)'], ['Other insurance', 'Other insurance', 'Otro seguro'], ['No insurance', 'No insurance', 'Sin seguro'], ['Not sure', 'Not sure', 'No estoy seguro']];
const LANGS = [['English', 'English', 'Inglés'], ['Spanish', 'Español', 'Español'], ['Other', 'Other', 'Otro']];
const CONSENT = [['yes', 'Yes', 'Sí'], ['no', 'No', 'No']];
const TIMES = [['Mornings before 11 am', 'Mornings before 11 am', 'En la mañana, antes de las 11'], ['Afternoons after 2 pm', 'Afternoons after 2 pm', 'En la tarde, después de las 2'], ['Evenings after 5 pm', 'Evenings after 5 pm', 'En la noche, después de las 5'], ['Any time', 'Any time', 'A cualquier hora']];
const TRANS = [['Can get to the school', 'Yes, I can come', 'Sí, puedo ir'], ['Needs a ride', 'I need a ride', 'Necesito transporte'], ['Phone or video, please', 'Phone or video, please', 'Por teléfono o video']];
const LISTS = { lang: LANGS, consent: CONSENT, time: TIMES, trans: TRANS };

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
    const pages = this.pages();
    let page = pages[0]?.id;
    if (ctx.fl?.submitted_at && this.s.preset !== 'canvas') page = 'done';
    else if (this.s.preset === 'canvas' && pages.some(p => p.step === 'insurance')) page = pages.find(p => p.step === 'insurance').id;
    else if (ctx.fl) { const open = pages.find(p => !ctx.fl.steps?.[p.step]); page = (open || pages.at(-1))?.id; }
    this.state = { page, err: '' };
    if (this.token && ctx.fl && !ctx.fl.opened_at) { try { await api.do('familyLink.open', { token: this.token }); } catch { } }
  }
  ctx() { return famCtx(this.s, this.token ? { t: this.token } : this.params); }
  cfg(key) { return (this.s.settings?.family_link?.questions || []).find(q => q.key === key); }
  asked(key) { const q = this.cfg(key); if (key === 'insurance') return true; return q ? q.ask !== false : !DEFAULT_OFF.includes(key); }
  required(key) { const q = this.cfg(key); return q ? !!q.required : ['guardian', 'phone', 'insurance', 'consent'].includes(key); }
  // the questions to ask now (the Medicaid ID question is skipped once the family says they have another kind of insurance)
  pages() { const plan = this.ans?.plan_kind; return PAGES.filter(p => this.asked(p.ask) && !(p.id === 'mid' && plan && !/^Medicaid/.test(plan))); }
  renderVals() {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const t = T[lang]; const L = lang === 'es' ? 2 : 1;
    const pages = this.pages(); const done = this.state.page === 'done';
    const i = done ? pages.length : Math.max(0, pages.findIndex(p => p.id === this.state.page)); const pg = pages[i] || pages[0] || {};
    const a = this.ans; const child = ctx.child;
    const radios = list => list.map(o => ({ v: o[0], label: o[L], cls: a[pg.k] === o[0] ? 'on' : '', chk: a[pg.k] === o[0] ? 'checked' : '' }));
    let opts = [];
    if (pg.kind === 'select') opts = pg.id === 'rel' ? RELS.map(o => ({ v: o[0], label: o[L] })) : [{ v: '', label: t.choose }].concat(PLANS.map(o => ({ v: o[0], label: o[L] })));
    if (pg.kind === 'radio') opts = radios(LISTS[pg.q]);
    const qv = typeof t.q[pg.q] === 'function' ? t.q[pg.q](child) : t.q[pg.q];
    const timeLabel = (TIMES.find(x => x[0] === a.best_time) || [])[L];
    return {
      hd: guardHeader('Harvest Outreach Center', lang),
      t: { ...t, thanks: t.thanks((a.guardian_name || '').split(' ')[0]) },
      dots: pages.map((p, j) => done || j < i ? 'done' : j === i ? 'cur' : ''), n: pages.length, at: i + 1,
      done, q: qv || '', opts,
      pg: { ...pg, text: pg.kind === 'text', select: pg.kind === 'select', card: pg.kind === 'card', radio: pg.kind === 'radio', col: pg.col ? ' col' : ' pill' },
      photoName: a.card_photo || '',
      nextLabel: i === pages.length - 1 ? t.submit : t.next, canBack: !done && i > 0,
      doneText: t.done(timeLabel), portalHref: this.token ? parentHref(this.token, 'ParentPortal') : 'ParentPortal.dc.html',
      err: this.state.err
    };
  }
  get css() { return C_CSS; }
  after(root) {
    bindForm(root, this.ans, (k, el) => { if (el.type === 'radio') this.setState({ err: '' }); else if (this.state.err) this.setState({ err: '' }); if (k === 'plan_kind') this.setState({}); });
    const inp = root.querySelector('#cardphoto');
    if (inp) inp.onchange = () => { const f = inp.files[0]; if (!f) return; this.ans.card_photo = f.name; toast(T[getLang(this.ctx().client)].photoToast(f.name)); this.setState({ err: '' }); };
  }
  check(pg) {
    const a = this.ans;
    if (pg.id === 'gname' && this.required('guardian') && !(a.guardian_name || '').trim()) return 'guardian_name';
    if (pg.id === 'phone' && this.required('phone') && !(a.phone || '').trim()) return 'phone';
    if (pg.id === 'plan' && !a.plan_kind) return 'plan_kind';
    if (pg.id === 'mid' && /^Medicaid/.test(a.plan_kind || '') && !(a.medicaid_id || '').trim() && !a.card_photo) return 'medicaid_id';
    if (pg.id === 'consent' && this.required('consent') && !a.consent_record) return 'consent_record';
    return null;
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
    const pages = this.pages(); const i = pages.findIndex(p => p.id === this.state.page); const pg = pages[i]; if (!pg) return;
    const need = this.check(pg);
    if (need) return this.setState({ err: t.need[need] });
    const nextPg = pages[i + 1];
    // the last question of a group saves the group (the store tracks five steps)
    if (!nextPg || nextPg.step !== pg.step) {
      if (pg.step === 'insurance') this.ans.dob = isoFromText(this.ans.dob_text) || this.ans.dob || '';
      const answers = {}; for (const k of FIELDS[pg.step]) if (this.ans[k] !== undefined && this.ans[k] !== '') answers[k] = this.ans[k];
      if (pg.step === 'insurance' && answers.medicaid_id) answers.medicaid_id = answers.medicaid_id.trim();
      const token = await this.ensureToken();
      await this.do('familyLink.step', { token, step: pg.step, answers });
    }
    if (nextPg) { this.setState({ page: nextPg.id, err: '' }); scrollTo(0, 0); return; }
    const token = await this.ensureToken();
    await this.do('familyLink.submit', { token });
    toast(t.sentToast);
    this.setState({ page: 'done', err: '' }); scrollTo(0, 0);
  }
  get anchors() {
    return {
      next: () => this.next(),
      back: () => { const pages = this.pages(); const i = pages.findIndex(p => p.id === this.state.page); if (i > 0) { this.setState({ page: pages[i - 1].id, err: '' }); scrollTo(0, 0); } },
      photo: () => document.getElementById('cardphoto')?.click(),
      help: () => { const ctx = this.ctx(); const l = getLang(ctx.client); callSheet(this.s, ctx, l, l === 'es' ? 'el equipo de admisiones' : 'the intake team'); },
      en: () => { setLang('en'); this.setState({}); },
      es: () => { setLang('es'); this.setState({}); }
    };
  }
  set anchors(v) { }
});
