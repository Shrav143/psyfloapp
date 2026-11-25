// 46 · Enrollment packet (phone). Live: the seven papers in seed enrollment_packet, signed before the intake visit
// so the visit is the conversation (product direction #97: "eliminate no-shows for intakes").
// Read-and-acknowledge items and short forms → enroll.save; the two signed forms open Parent signs (11) → consent.sign.
// Answers the guardian already gave in the family link (8) are filled in for them to check, not typed again.
import { register, Screen, M, toast } from '../app.js';
import { famCtx, getLang, setLang, fdate, FORMS, formName, pgo, callSheet, childName, packetStatus, guardianLabel, guardHeader, guardFooter } from './ParentPortal.js';
import { C_CSS } from './MobileApp.js';

const ITEM = {
  'Intake information': { kind: 'form', es: 'Información para la admisión', min: 2 },
  'Rights and responsibilities': { kind: 'ack', es: 'Derechos y responsabilidades', min: 2 },
  'Privacy notice': { kind: 'ack', es: 'Aviso de privacidad', min: 2 },
  'Insurance and fees': { kind: 'ack', es: 'Seguro y costos', min: 1 },
  'Emergency contacts': { kind: 'contacts', es: 'Contactos de emergencia', min: 2 },
  'Consent for services': { kind: 'sign', min: 2 },
  'Release of information · school': { kind: 'sign', min: 2 }
};

const POINTS = {
  'Rights and responsibilities': {
    en: c => [
      `You can ask questions about ${c}'s care at any time and get answers in words that make sense.`,
      'You can say no to any part of the plan, or stop services, without losing other help your family gets.',
      `You help write ${c}'s goals, and you look at progress with Harvest every three months.`,
      'We ask you to take a short weekly call from Harvest and to tell us about big changes at home.',
      'If something goes wrong you can make a complaint to Harvest or to the state human rights advocate. Nothing bad happens to your child if you do.'
    ],
    es: c => [
      `Puede hacer preguntas sobre la atención de ${c} en cualquier momento y recibir respuestas claras.`,
      'Puede decir que no a cualquier parte del plan, o parar los servicios, sin perder otra ayuda que reciba su familia.',
      `Usted ayuda a escribir las metas de ${c} y revisa el progreso con Harvest cada tres meses.`,
      'Le pedimos que tome una llamada corta cada semana con Harvest y que nos cuente cambios grandes en casa.',
      'Si algo sale mal puede presentar una queja ante Harvest o el defensor estatal de derechos humanos. A su hijo no le pasa nada malo si lo hace.'
    ]
  },
  'Privacy notice': {
    en: c => [
      'What you tell Harvest is private. Harvest shares it only to give care, to get paid by insurance, or when the law requires it, for example if a child is not safe.',
      `${c}'s school sees only what you allow in the school release: attendance, behaviour and goals. Never clinical notes.`,
      `You can ask for a copy of ${c}'s records at any time.`,
      'Harvest staff may use software to help write paperwork. A person at Harvest reads and signs every note; nothing is sent on its own.'
    ],
    es: c => [
      'Lo que le cuenta a Harvest es privado. Harvest lo comparte solo para dar atención, para que el seguro pague, o cuando la ley lo exige, por ejemplo si un niño no está seguro.',
      `La escuela de ${c} ve solo lo que usted permite en el permiso para la escuela: asistencia, conducta y metas. Nunca notas clínicas.`,
      `Puede pedir una copia de los registros de ${c} en cualquier momento.`,
      'El personal de Harvest puede usar programas para ayudar a escribir los papeles. Una persona de Harvest lee y firma cada nota; nada se envía solo.'
    ]
  },
  'Insurance and fees': {
    en: (c, plan) => [
      plan ? `${c}'s help at school is paid by ${plan} (Medicaid). There is no cost to you.` : 'Medicaid pays for this service. There is no cost to families with Medicaid.',
      'Harvest asks your insurance company to approve the service before it starts, and again every few months.',
      'If the insurance company says no, Harvest explains why and you can appeal. Only a parent or guardian can appeal; Harvest writes the letter for you.',
      'Letters from the insurance company are explained in plain words on your family page.'
    ],
    es: (c, plan) => [
      plan ? `La ayuda de ${c} en la escuela la paga ${plan} (Medicaid). No le cuesta nada.` : 'Medicaid paga este servicio. No cuesta nada para las familias con Medicaid.',
      'Harvest le pide a su seguro que apruebe el servicio antes de empezar, y otra vez cada pocos meses.',
      'Si el seguro dice que no, Harvest le explica por qué y usted puede apelar. Solo un padre, madre o tutor puede apelar; Harvest le escribe la carta.',
      'Las cartas del seguro se explican en palabras sencillas en su página de familia.'
    ]
  }
};

const FIELDS = {
  'Intake information': [
    { k: 'child', en: "Child's name", es: 'Nombre del niño' },
    { k: 'dob', en: 'Birth date', es: 'Fecha de nacimiento', ph: 'MM/DD/YYYY' },
    { k: 'school', en: 'School and grade', es: 'Escuela y grado' },
    { k: 'guardian', en: 'Your name', es: 'Su nombre', req: true },
    { k: 'phone', en: 'Phone', es: 'Teléfono', req: true },
    { k: 'best_time', en: 'Best time to call', es: 'Mejor hora para llamar' }
  ],
  'Emergency contacts': [
    { k: 'c1_name', en: 'Contact 1 name', es: 'Contacto 1 nombre', req: true },
    { k: 'c1_rel', en: 'Contact 1 relation', es: 'Contacto 1 relación', ph: 'Aunt, neighbour…' },
    { k: 'c1_phone', en: 'Contact 1 phone', es: 'Contacto 1 teléfono', req: true },
    { k: 'c2_name', en: 'Contact 2 name', es: 'Contacto 2 nombre' },
    { k: 'c2_phone', en: 'Contact 2 phone', es: 'Contacto 2 teléfono' }
  ]
};

const T = {
  en: { title: 'Enrollment packet', count: (a, b) => `${a} of ${b}`, allDone: 'All done', sign: 'To sign',
    savedOn: d => `Saved ${d}`, signedOn: (d, who) => `Signed ${d} by ${who}`, read: "I've read this", save: 'Save', saveAgain: 'Save changes', signIt: 'Read and sign', copy: 'Your copy (PDF)',
    need: 'Add a contact name and phone', needForm: 'Add your name and phone', thanks: f => `${f} · saved` },
  es: { title: 'Papeles de inscripción', count: (a, b) => `${a} de ${b}`, allDone: 'Todo listo', sign: 'Para firmar',
    savedOn: d => `Guardado ${d}`, signedOn: (d, who) => `Firmado el ${d} por ${who}`, read: 'Lo leí', save: 'Guardar', saveAgain: 'Guardar cambios', signIt: 'Leer y firmar', copy: 'Su copia (PDF)',
    need: 'Agregue un nombre y teléfono', needForm: 'Agregue su nombre y teléfono', thanks: f => `${f} · guardado` }
};

const itemName = (n, lang) => lang === 'es' ? (ITEM[n]?.es || formName(n, 'es')) : n;

register('ParentEnroll', class extends Screen {
  init() { this.state = { open: undefined, f: {} }; }
  ctx() { return famCtx(this.s, this.params); }
  defaults(ctx, item) {
    const s = this.s; const c = ctx.client; const a = ctx.fl?.answers || {};
    const saved = s.enrollment?.[c.id]?.[item]?.data || {};
    if (item === 'Intake information') {
      const sch = c.school ? M.school(s, c.school).name : '';
      return { child: [c.first_name, c.initials].filter(Boolean).join(' · '), dob: a.dob ? M.fmtDate(a.dob, { year: true }) : '', school: [sch, c.grade ? 'grade ' + c.grade : ''].filter(Boolean).join(' · '),
        guardian: a.guardian_name || (c.guardian?.name && c.guardian.name !== c.guardian.relationship ? c.guardian.name : ''), phone: a.phone || c.guardian?.phone || '', best_time: a.best_time || '', ...saved };
    }
    return { ...saved };
  }
  val(ctx, item, k) { const key = item + '|' + k; return key in this.state.f ? this.state.f[key] : (this.defaults(ctx, item)[k] || ''); }
  renderVals() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const pk = packetStatus(s, c);
    const firstOpen = pk.items.find(i => !i.done)?.name || null;
    const open = this.state.open === undefined ? firstOpen : this.state.open;
    const elig = (s.eligibility || []).find(e => e.client === c.id && e.result === 'active');
    const planId = c.medicaid?.plan || elig?.plan;
    const plan = planId ? M.payerShort(s, planId) : '';
    const items = pk.items.map((it, i) => {
      const meta = ITEM[it.name] || { kind: it.sign ? 'sign' : 'ack', min: 1 };
      const isOpen = open === it.name;
      const signedRec = it.sign && s.consents.find(x => x.client === c.id && x.form === it.name && x.status === 'signed');
      const v = {
        title: itemName(it.name, lang),
        mark: it.done ? '✓' : String(i + 1), numCls: it.done ? 'g' : isOpen ? 'y' : '',
        chip: !it.done && meta.kind === 'sign' ? t.sign : '', chipCls: 'y',
        open: isOpen, expanded: isOpen ? 'true' : 'false', style: isOpen ? 'border-color:var(--teal)' : '',
        toggle: () => this.setState({ open: isOpen ? null : it.name }),
        points: [], fields: [], err: '', doneText: '', file: '', btn: '', btnCls: 'pri', act: null
      };
      if (!isOpen) return v;
      if (meta.kind === 'ack') {
        v.points = POINTS[it.name]?.[lang](child, plan) || [];
        if (it.done) v.doneText = t.savedOn(fdate(it.at, lang));
        else { v.btn = t.read; v.act = () => this.save(it.name, 'ack', { ack: true }); }
      } else if (meta.kind === 'form' || meta.kind === 'contacts') {
        const missing = this.state.err?.item === it.name ? this.state.err.keys : [];
        v.fields = FIELDS[it.name].map(f => ({ id: 'f-' + f.k, k: it.name + '|' + f.k, label: f[lang], ph: f.ph || '', v: this.val(ctx, it.name, f.k), bad: missing.includes(f.k) ? 'border-color:var(--late-fg);background:var(--late-bg)' : '' }));
        if (this.state.err?.item === it.name) v.err = this.state.err.msg;
        if (it.done) v.doneText = t.savedOn(fdate(it.at, lang));
        v.btn = it.done ? t.saveAgain : t.save; v.btnCls = it.done ? '' : 'pri';
        v.act = () => this.saveFields(it.name, meta.kind);
      } else {
        v.points = [FORMS[it.name]?.sum[lang](child)].filter(Boolean);
        if (signedRec) { v.doneText = t.signedOn(fdate(signedRec.signed_at, lang), signedRec.signer); v.file = signedRec.file || ''; }
        else { v.btn = t.signIt; v.act = () => pgo(this.params, 'ParentSign', { form: it.name }); }
      }
      return v;
    });
    return {
      hd: guardHeader(t.title, lang), ft: guardFooter(lang),
      t: { count: t.count(pk.done, pk.total), allDone: t.allDone, copy: t.copy },
      pct: pk.total ? Math.round(100 * pk.done / pk.total) : 0, allDone: pk.total > 0 && pk.done === pk.total, items,
      setField: (e, el) => { this.state.f[el.dataset.k] = el.value; }
    };
  }
  get css() { return C_CSS; }
  async save(item, kind, data) {
    const ctx = this.ctx(); const lang = getLang(ctx.client);
    await this.do('enroll.save', { client: ctx.client.id, item, kind, data, by: guardianLabel(ctx) });
    toast(T[lang].thanks(itemName(item, lang)));
    this.setState({ open: undefined });
  }
  async saveFields(item, kind) {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const t = T[lang];
    const data = Object.fromEntries(FIELDS[item].map(f => [f.k, this.val(ctx, item, f.k).trim()]));
    const req = FIELDS[item].filter(f => f.req && !data[f.k]).map(f => f.k);
    if (req.length) { this.setState({ err: { item, keys: req, msg: kind === 'contacts' ? t.need : t.needForm } }); return; }
    this.state.err = null;
    await this.save(item, kind, data);
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
