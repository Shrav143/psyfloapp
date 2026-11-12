// 46 · Enrollment packet (phone): "Complete required paperwork". The papers in seed enrollment_packet, done on the phone before the intake visit so
// the visit is the conversation. Read-and-acknowledge items and short forms call enroll.save; the two signed forms open Parent signs and follow the
// signature-mode setting. What the family gave in the family link is filled in for them to check, not typed again. One paper open at a time.
// The paper wording is demo wording (Harvest's own forms replace it) and says so.
import { register, M, ui, toast, esc } from '../app.js';
import * as P from '../shared/sel/portal.js';
import { PortalScreen, getLang, fdate, FORMS, formName, phref, chip, btn, DEMO_WORDING, childName, packetStatus } from './ParentPortal.js';

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
      `You help write ${c}'s goals, and you look at progress with Harvest.`,
      'We ask you to take a short weekly call from Harvest and to tell us about big changes at home.',
      'If something goes wrong you can make a complaint to Harvest. Nothing bad happens to your child if you do.'
    ],
    es: c => [
      `Puede hacer preguntas sobre la atención de ${c} en cualquier momento y recibir respuestas claras.`,
      'Puede decir que no a cualquier parte del plan, o parar los servicios, sin perder otra ayuda que reciba su familia.',
      `Usted ayuda a escribir las metas de ${c} y revisa el progreso con Harvest.`,
      'Le pedimos que tome una llamada corta cada semana con Harvest y que nos cuente cambios grandes en casa.',
      'Si algo sale mal puede presentar una queja ante Harvest. A su hijo no le pasa nada malo si lo hace.'
    ]
  },
  'Privacy notice': {
    en: c => [
      'What you tell Harvest is private. Harvest shares it only to give care, to get paid by insurance, or when the law requires it, for example if a child is not safe.',
      `${c}'s school sees only what you allow in the school release: attendance, behaviour and goals. Never clinical notes.`,
      `You can ask for a copy of ${c}'s records.`,
      'Harvest staff may use software to help write paperwork. A person at Harvest reads and signs every note; nothing is sent on its own.'
    ],
    es: c => [
      'Lo que le cuenta a Harvest es privado. Harvest lo comparte solo para dar atención, para que el seguro pague, o cuando la ley lo exige, por ejemplo si un niño no está seguro.',
      `La escuela de ${c} ve solo lo que usted permite en el permiso para la escuela: asistencia, conducta y metas. Nunca notas clínicas.`,
      `Puede pedir una copia de los registros de ${c}.`,
      'El personal de Harvest puede usar programas para ayudar a escribir los papeles. Una persona de Harvest lee y firma cada nota; nada se envía solo.'
    ]
  },
  'Insurance and fees': {
    en: (c, plan) => [
      plan ? `${c}'s help at school is billed to ${plan} (Medicaid).` : 'Harvest bills Medicaid for this service.',
      'Harvest asks your insurance company to approve the service before it starts, and again when an approval is ending.',
      'If the insurance company says no, Harvest explains why. A parent or guardian can appeal; Harvest prepares the letter and you read it and sign it.',
      'Letters from the insurance company are explained in plain words on your family page.'
    ],
    es: (c, plan) => [
      plan ? `La ayuda de ${c} en la escuela se factura a ${plan} (Medicaid).` : 'Harvest factura a Medicaid por este servicio.',
      'Harvest le pide a su seguro que apruebe el servicio antes de empezar, y otra vez cuando una aprobación se acaba.',
      'Si el seguro dice que no, Harvest le explica por qué. Un padre, madre o tutor puede apelar; Harvest prepara la carta y usted la lee y la firma.',
      'Las cartas del seguro se explican en palabras sencillas en su página de familia.'
    ]
  }
};
const FIELDS = {
  'Intake information': [
    { k: 'child', en: "Child's name", es: 'Nombre del niño' },
    { k: 'dob', en: 'Date of birth', es: 'Fecha de nacimiento', ph: 'MM/DD/YYYY' },
    { k: 'school', en: 'School and grade', es: 'Escuela y grado' },
    { k: 'guardian', en: 'Your name', es: 'Su nombre', req: true },
    { k: 'phone', en: 'Best phone', es: 'Mejor teléfono', req: true },
    { k: 'best_time', en: 'Best time to call', es: 'Mejor hora para llamar' }
  ],
  'Emergency contacts': [
    { k: 'c1_name', en: 'Contact 1 · name', es: 'Contacto 1 · nombre', req: true },
    { k: 'c1_rel', en: 'Contact 1 · how they know your child', es: 'Contacto 1 · relación con el niño', ph: 'Aunt, neighbour…' },
    { k: 'c1_phone', en: 'Contact 1 · phone', es: 'Contacto 1 · teléfono', req: true },
    { k: 'c2_name', en: 'Contact 2 · name (optional)', es: 'Contacto 2 · nombre (opcional)' },
    { k: 'c2_phone', en: 'Contact 2 · phone (optional)', es: 'Contacto 2 · teléfono (opcional)' }
  ]
};
const T = {
  en: { title: 'Required paperwork', sub: (a, b, when) => `${a} of ${b} done · ${when}`, beforeIntake: 'before the intake visit', before: d => 'before ' + d,
    why: 'Do these at home, on your phone. Your answers save as you go.', allDone: 'All papers done · thank you', allDoneSub: 'You can open any paper again to read it.',
    min: n => `about ${n} min`, done: d => 'Done ' + d, savedOn: d => `Saved ${d}. You can change it and save again.`,
    read: "I've read this", save: 'Save', saveAgain: 'Save changes',
    readSub: 'Read, then tap the button', formSub: 'Check what we have', contactsSub: 'Someone we can call if we cannot reach you', signSub: 'Needs your signature',
    fromLink: 'Filled in from what you sent us. Check it and fix anything wrong.', onFile: (p, id) => `On file: ${p}${id ? ' · Medicaid ID ending ' + id : ''}.`,
    need: 'Add at least one person: their name and phone number. The second contact is optional.', needForm: 'Add your name and a phone number we can reach you on.', thanks: f => `${f} · saved`,
    sign: { remote: 'Read and sign', in_person: 'See how to sign', pending: 'See the form', ready: 'Read the form', completed: 'See your copy' },
    chip: { remote: 'To sign', in_person: 'In person', pending: 'Waiting', ready: 'To read', completed: 'Signed' }, signedOn: (d, who) => `Signed ${d}${who ? ' by ' + who : ''}`, copy: 'Your copy (PDF)' },
  es: { title: 'Papeles necesarios', sub: (a, b, when) => `${a} de ${b} listos · ${when}`, beforeIntake: 'antes de la cita de admisión', before: d => 'antes del ' + d,
    why: 'Hágalos en casa, en su teléfono. Sus respuestas se guardan.', allDone: 'Todos los papeles listos · gracias', allDoneSub: 'Puede abrir cualquier papel otra vez para leerlo.',
    min: n => `unos ${n} min`, done: d => 'Listo ' + d, savedOn: d => `Guardado el ${d}. Puede cambiarlo y guardar otra vez.`,
    read: 'Lo leí', save: 'Guardar', saveAgain: 'Guardar cambios',
    readSub: 'Lea, luego toque el botón', formSub: 'Revise lo que tenemos', contactsSub: 'Alguien a quien llamar si no le encontramos', signSub: 'Necesita su firma',
    fromLink: 'Lo llenamos con lo que nos envió. Revíselo y corrija lo que esté mal.', onFile: (p, id) => `Registrado: ${p}${id ? ' · Medicaid termina en ' + id : ''}.`,
    need: 'Agregue al menos una persona: su nombre y teléfono. El segundo contacto es opcional.', needForm: 'Agregue su nombre y un teléfono donde le encontremos.', thanks: f => `${f} · guardado`,
    sign: { remote: 'Leer y firmar', in_person: 'Ver cómo firmar', pending: 'Ver el formulario', ready: 'Leer el formulario', completed: 'Ver su copia' },
    chip: { remote: 'Por firmar', in_person: 'En persona', pending: 'En espera', ready: 'Por leer', completed: 'Firmado' }, signedOn: (d, who) => `Firmado el ${d}${who ? ' por ' + who : ''}`, copy: 'Su copia (PDF)' }
};
const itemName = (n, lang) => lang === 'es' ? (ITEM[n] && ITEM[n].es || formName(n, 'es')) : n;

register('ParentEnroll', class extends PortalScreen {
  async setup() { this.state = { open: undefined, f: {}, err: null }; }
  defaults(ctx, item) {
    const s = this.s; const c = ctx.client; const a = (ctx.fl && ctx.fl.answers) || {};
    const saved = ((s.enrollment || {})[c.id] || {})[item];
    const sv = saved && saved.data || {};
    const rc = (ctx.ref && ctx.ref.contact) || {};
    if (item === 'Intake information') {
      const sch = c.school ? M.school(s, c.school).name : '';
      return { child: [c.first_name, c.initials].filter(Boolean).join(' · '), dob: a.dob ? M.fmtDate(a.dob, { year: true }) : '', school: [sch, c.grade ? 'grade ' + c.grade : ''].filter(Boolean).join(' · '),
        guardian: a.guardian_name || rc.name || ctx.guardian || '', phone: a.phone || rc.phone || (c.guardian && c.guardian.phone) || '', best_time: a.best_time || '', ...sv };
    }
    return { ...sv };
  }
  val(ctx, item, k) { const key = item + '|' + k; return key in this.state.f ? this.state.f[key] : (this.defaults(ctx, item)[k] || ''); }
  page() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const pk = P.packet(s, c.id);
    const firstOpen = (pk.items.find(i => !i.done) || {}).name || null;
    const open = this.state.open === undefined ? firstOpen : this.state.open;
    const intake = c.intake && c.intake.when && c.intake.when.slice(0, 10) >= s.today ? c.intake.when : null;
    const elig = (s.eligibility || []).find(e => e.client === c.id);
    const planId = c.medicaid && c.medicaid.plan; const plan = planId ? M.payerShort(s, planId) : '';
    const mid = ((ctx.fl && ctx.fl.answers && ctx.fl.answers.medicaid_id) || '').replace(/\s/g, '').slice(-4);
    const items = pk.items.map((it, i) => {
      const meta = ITEM[it.name] || { kind: it.sign ? 'sign' : 'ack', min: 1 };
      const isOpen = open === it.name; const id = 'fp-item-' + i;
      const sg = meta.kind === 'sign' ? P.sigState(s, c.id, it.name) : null;
      const chipHtml = it.done ? chip('ok', t.done(fdate(it.at, lang)), 'check') : sg ? chip(sg.state === 'in_person' ? 'warn' : sg.state === 'pending' ? 'wait' : 'todo', t.chip[sg.state]) : chip('later', t.min(meta.min));
      let inner = '';
      if (isOpen) {
        if (meta.kind === 'ack') {
          inner = `<p class="fp-note">${esc(DEMO_WORDING[lang])}</p><ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:8px">${((POINTS[it.name] || {})[lang] || (() => []))(child, plan).map(p => `<li>${esc(p)}</li>`).join('')}</ul>`;
          if (it.name === 'Insurance and fees' && (plan || mid)) inner += `<p class="fp-hint">${esc(t.onFile(plan || 'Medicaid', mid))}</p>`;
          inner += it.done ? `<p class="fp-hint"><b>${esc(t.done(fdate(it.at, lang)))}</b></p>` : `<button type="button" class="fp-btn fp-btn--p" data-ack="${esc(it.name)}">${t.read}</button>`;
        } else if (meta.kind === 'form' || meta.kind === 'contacts') {
          const missing = this.state.err && this.state.err.item === it.name ? this.state.err.keys : [];
          inner = (meta.kind === 'form' && !it.done && ((ctx.fl && ctx.fl.answers) || (ctx.ref && ctx.ref.contact)) ? `<p class="fp-note">${t.fromLink}</p>` : '')
            + FIELDS[it.name].map(f => `<div class="fp-field"><label class="fp-lab" for="f-${f.k}">${esc(f[lang])}</label><input class="fp-in" id="f-${f.k}" data-fk="${esc(it.name + '|' + f.k)}" data-nobind value="${esc(this.val(ctx, it.name, f.k))}" placeholder="${esc(f.ph || '')}" autocomplete="off"${missing.includes(f.k) ? ' aria-invalid="true"' : ''}></div>`).join('')
            + (this.state.err && this.state.err.item === it.name ? `<div class="fp-err" role="alert">${esc(this.state.err.msg)}</div>` : '')
            + (it.done ? `<p class="fp-hint">${esc(t.savedOn(fdate(it.at, lang)))}</p>` : '')
            + `<button type="button" class="fp-btn fp-btn--p" data-saveform="${esc(it.name)}" data-kind="${meta.kind}">${it.done ? t.saveAgain : t.save}</button>`;
        } else {
          const F = FORMS[it.name];
          inner = `<p class="fp-p">${esc(F ? (F.sum[lang] || F.sum.en)(child) : '')}</p>`;
          if (sg.signed) inner += `<p class="fp-hint"><b>${esc(t.signedOn(fdate(sg.signed.signed_at, lang), sg.signed.signer))}</b></p>` + (sg.signed.file ? `<a class="fp-btn fp-btn--o" role="button" href="${esc(sg.signed.file)}" target="_blank" rel="noopener">${t.copy}</a>` : '');
          else inner += btn('p', phref(this.params, 'ParentSign', { form: it.name }), esc(t.sign[sg.state]));
        }
      }
      const sub = { ack: t.readSub, form: t.formSub, contacts: t.contactsSub, sign: t.signSub }[meta.kind];
      return `<li class="fp-acc${isOpen ? ' open' : ''}${it.done ? ' done' : ''}"><h2 class="fp-acc__h"><button type="button" class="fp-acc__b" data-acc="${esc(it.name)}" aria-expanded="${isOpen}" aria-controls="${id}"><span class="fp-task__mark" aria-hidden="true">${it.done ? ui.icon('check', 18) : i + 1}</span><span class="fp-task__t"><b>${esc(itemName(it.name, lang))}</b><span>${esc(sub)}</span></span>${chipHtml}</button></h2>${isOpen ? `<div class="fp-acc__p" id="${id}" role="region" aria-label="${esc(itemName(it.name, lang))}">${inner}</div>` : ''}</li>`;
    });
    const all = pk.total > 0 && pk.done === pk.total;
    const body = `<div class="fp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${pk.total}" aria-valuenow="${pk.done}" aria-label="${esc(t.sub(pk.done, pk.total, ''))}"><i style="width:${pk.total ? Math.round(100 * pk.done / pk.total) : 0}%"></i></div>
      ${all ? `<section class="fp-card fp-card--ok"><h2 class="fp-h2">${t.allDone}</h2><p class="fp-p fp-muted">${t.allDoneSub}</p></section>` : `<p class="fp-p fp-muted">${t.why}</p>`}
      <ol class="fp-list">${items.join('')}</ol>`;
    return { title: esc(t.title), sub: esc(t.sub(pk.done, pk.total, intake ? t.before(fdate(intake, lang)) : t.beforeIntake)), body, lang };
  }
  get css() { return super.css + `.fp-acc{background:var(--surface-0);border:1px solid var(--line-200);border-radius:var(--r-3);overflow:hidden}.fp-acc.open{border-color:var(--teal-600)}.fp-acc.done .fp-task__mark{background:var(--teal-600);color:#fff}.fp-acc__h{margin:0;font-size:16px;line-height:24px;font-weight:400}.fp-acc__b{display:flex;align-items:center;gap:12px;width:100%;min-height:64px;padding:10px 14px;background:none;border:0;font:inherit;color:inherit;text-align:left;cursor:pointer}.fp-acc__p{border-top:1px solid var(--line-200);padding:14px;display:flex;flex-direction:column;gap:12px}`; }
  afterPaint(root) {
    root.querySelectorAll('[data-acc]').forEach(b => { b.onclick = () => { const n = b.dataset.acc; const cur = this.state.open === undefined ? this.firstOpen() : this.state.open; this.setState({ open: cur === n ? null : n, err: null }); }; });
    root.querySelectorAll('[data-fk]').forEach(inp => { inp.oninput = () => { this.state.f[inp.dataset.fk] = inp.value; }; });
    root.querySelectorAll('[data-ack]').forEach(b => { b.onclick = () => this.save(b.dataset.ack, 'ack', { ack: true }); });
    root.querySelectorAll('[data-saveform]').forEach(b => { b.onclick = () => this.saveFields(b.dataset.saveform, b.dataset.kind); });
  }
  firstOpen() { return (P.packet(this.s, this.ctx().client.id).items.find(i => !i.done) || {}).name || null; }
  async save(item, kind, data) {
    const ctx = this.ctx(); const lang = getLang(ctx.client);
    try { await this.do('enroll.save', { client: ctx.client.id, item, kind, data }); } catch { return; }
    toast(T[lang].thanks(itemName(item, lang)));
    this.setState({ open: undefined, err: null });
  }
  async saveFields(item, kind) {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const t = T[lang];
    const data = Object.fromEntries(FIELDS[item].map(f => [f.k, String(this.val(ctx, item, f.k)).trim()]));
    const req = FIELDS[item].filter(f => f.req && !data[f.k]).map(f => f.k);
    if (req.length) { this.setState({ err: { item, keys: req, msg: kind === 'contacts' ? t.need : t.needForm } }); return; }
    await this.save(item, kind, data);
  }
});
