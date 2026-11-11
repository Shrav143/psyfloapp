// 12 · Parent portal (phone). Seeded + Live: consent state (consents / portal_tasks), this week's progress in
// plain words (from notes, else the seeded week), check-in due; English / Spanish.
// Also exports the parent-side helpers (token → family, language, links that keep the token, signature pad,
// the "call us" sheet) used by FamilyLink, ParentSign, ParentSurvey and AppealLetter.
import { register, Screen, M, modal, toast, go, api } from '../app.js';

// ---------- family context from the tokenised link ----------
export function famCtx(s, params = {}) {
  const t = params.t || null;
  let fl = t ? s.family_links.find(f => f.token === t) : null;
  let c = fl && M.byId(s.clients, fl.client);
  if (!c && params.c) c = M.byId(s.clients, params.c);
  if (!c) c = M.byId(s.clients, 'TW');
  // T.W.'s link is the default only for T.W. (other children have no family link, so no borrowed guardian)
  if (!fl) fl = s.family_links.find(f => f.client === c.id) || s.family_links.find(f => f.referral === (c.referral || (c.id === 'TW' ? 'REF-118' : null)));
  if (t && fl && fl.token === t && !M.byId(s.clients, fl.client)) c = { id: fl.client, initials: String(fl.client).split(',')[0], first_name: '', guardian: {} };
  const ref = s.referrals.find(r => r.id === (fl?.referral || c.referral));
  const guardian = (fl?.answers?.guardian_name) || c.guardian?.name || '';
  return { token: t, fl, client: c, ref, guardian, child: c.first_name || c.initials, guardianFirst: guardian.split(' ')[0] || '' };
}
// links between family screens keep the token (texted link) or the ?c= child (demo), plus any extra query
export function phref(params, id, extra = {}) {
  const q = new URLSearchParams();
  if (params?.c && !params.t) q.set('c', params.c);
  for (const [k, v] of Object.entries(extra)) if (v != null) q.set(k, v);
  const qs = q.toString() ? '?' + q : '';
  return params?.t ? `/parent/${params.t}/${id}${qs}` : `${id}.dc.html${qs}`;
}
export function pgo(params, id, extra) { const h = phref(params, id, extra); if (params?.t) location.href = h; else go(h); }
// first name (or initials) of the child, and "his / her / their"
export const childName = c => c.first_name || c.initials;

// ---------- language ----------
export function getLang(c) {
  try { const l = localStorage.getItem('psyflo_parent_lang'); if (l) return l; } catch { }
  return c?.guardian?.language === 'es' ? 'es' : 'en';
}
export function setLang(l) { try { localStorage.setItem('psyflo_parent_lang', l); } catch { } }
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function fdate(iso, lang) { if (!iso) return ''; if (lang !== 'es') return M.fmtDate(iso); const d = M.parse(iso); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}`; }
export const LANG_ON = 'background:#217A78;border-radius:999px;padding:3px 10px;font-weight:600;color:#fff;text-decoration:none';
export const LANG_OFF = 'border:1px solid #46525F;border-radius:999px;padding:3px 10px;color:#fff;text-decoration:none';

// form names and summaries the guardian sees
export const FORMS = {
  'Consent for services': {
    es: 'Consentimiento de servicios',
    sum: { en: c => `You agree that Harvest can work with ${c} at school during the day. You can stop at any time. Harvest may record the first conversation to fill in paperwork, with your OK.`, es: c => `Usted acepta que Harvest trabaje con ${c} en la escuela durante el día. Puede parar en cualquier momento. Harvest puede grabar la primera conversación para llenar los papeles, con su permiso.` },
    full: {
      en: c => `Harvest Outreach Center · Consent to Treatment · Therapeutic Day Treatment. I, the parent or legal guardian of the child named above, consent to the provision of therapeutic day treatment services as described in the individual service plan. Services happen at ${c}'s school during the school day and may include one-to-one support, skill practice and work with teachers.\n\nI understand that I may stop services at any time by telling Harvest, and that stopping will not affect any other help my family receives. I understand Harvest will ask my insurance to approve these services and will tell me what the insurance decides.\n\nWith my OK, Harvest may record the first screening conversation so the clinician can fill in paperwork accurately. The recording is deleted once the paperwork is done. I can say no to recording and still receive services.\n\nThis consent lasts one year from the date I sign, unless I stop it sooner.`,
      es: c => `Harvest Outreach Center · Consentimiento para tratamiento · Tratamiento Diurno Terapéutico. Yo, padre, madre o tutor legal del niño nombrado arriba, doy mi consentimiento para que reciba servicios de tratamiento diurno terapéutico como se describe en el plan de servicio individual. Los servicios se dan en la escuela de ${c} durante el día escolar y pueden incluir apoyo uno a uno, práctica de habilidades y trabajo con los maestros.\n\nEntiendo que puedo parar los servicios en cualquier momento avisándole a Harvest, y que esto no afectará otra ayuda que reciba mi familia. Entiendo que Harvest pedirá a mi seguro que apruebe estos servicios y me dirá lo que decida el seguro.\n\nCon mi permiso, Harvest puede grabar la primera conversación para que el clínico llene los papeles correctamente. La grabación se borra cuando los papeles están listos. Puedo decir que no a la grabación y aun así recibir los servicios.\n\nEste consentimiento dura un año desde la fecha en que firmo, a menos que lo pare antes.`
    }
  },
  'Release of information · school': {
    es: 'Permiso para compartir información · escuela',
    sum: { en: c => `You agree that Harvest and ${c}'s school can talk about how ${c} is doing at school: attendance, behaviour and goals. Not clinical notes. You can stop this at any time.`, es: c => `Usted acepta que Harvest y la escuela de ${c} hablen sobre cómo le va a ${c} en la escuela: asistencia, conducta y metas. No las notas clínicas. Puede parar esto en cualquier momento.` },
    full: {
      en: c => `Harvest Outreach Center · Authorization to Release Information · School. I allow Harvest Outreach Center and ${c}'s school (counselor, teachers and administrators) to share with each other: attendance, office referrals, teacher check-ins, and progress on ${c}'s school goals.\n\nHarvest will not share clinical notes, diagnoses or anything about our home with the school.\n\nThis permission lasts for the school year or until I stop it in writing or on this portal.`,
      es: c => `Harvest Outreach Center · Autorización para compartir información · Escuela. Permito que Harvest Outreach Center y la escuela de ${c} (consejero, maestros y administradores) compartan entre sí: asistencia, reportes a la oficina, chequeos de los maestros y el progreso en las metas escolares de ${c}.\n\nHarvest no compartirá con la escuela notas clínicas, diagnósticos ni nada sobre nuestro hogar.\n\nEste permiso dura el año escolar o hasta que yo lo pare por escrito o en este portal.`
    }
  }
};
// the treatment plan (ISP), sent from the extension's plan screen (16) for the guardian to sign on the phone
const goalList = (cl, lang) => (cl?.goals || []).map((g, i) => `${i + 1}. ${g.name.charAt(0).toUpperCase() + g.name.slice(1)}`).join(lang === 'es' ? '; ' : '; ');
FORMS['Treatment plan'] = {
  es: 'Plan de tratamiento',
  sum: {
    en: (c, cl) => `The plan for ${c}'s help at school. Goals: ${goalList(cl, 'en') || 'set at the intake visit'}. Harvest staff work on these with ${c} during the school day and look at progress with you every three months.`,
    es: (c, cl) => `El plan para la ayuda de ${c} en la escuela. Metas: ${goalList(cl, 'es') || 'se fijan en la cita de admisión'}. El personal de Harvest trabaja en esto con ${c} durante el día escolar y revisa el progreso con usted cada tres meses.`
  },
  full: {
    en: (c, cl) => ['Harvest Outreach Center · Individual Service Plan · Therapeutic Day Treatment', ...(cl?.goals || []).map((g, i) => `Goal ${i + 1}: ${g.name}. ${g.objective || ''}`), 'Services: therapeutic day treatment at school during the school day. Progress is reviewed with the guardian every three months.', 'Guardian signature: I took part in writing this plan and agree to it. I can ask for changes at any time.'].join('\n\n'),
    es: (c, cl) => ['Harvest Outreach Center · Plan de servicio individual · Tratamiento Diurno Terapéutico', ...(cl?.goals || []).map((g, i) => `Meta ${i + 1}: ${g.name}. ${g.objective || ''}`), 'Servicios: tratamiento diurno terapéutico en la escuela durante el día escolar. El progreso se revisa con el tutor cada tres meses.', 'Firma del tutor: Participé en escribir este plan y estoy de acuerdo. Puedo pedir cambios en cualquier momento.'].join('\n\n')
  }
};
export const formName = (f, lang) => lang === 'es' ? (FORMS[f]?.es || f) : f;

// what the guardian still has to sign, in packet order
export function pendingForms(s, c) {
  const signed = new Set(s.consents.filter(x => x.client === c.id && x.status === 'signed').map(x => x.form));
  const out = [];
  if (!signed.has('Consent for services')) out.push('Consent for services');
  for (const t of s.portal_tasks.filter(t => t.client === c.id && t.status !== 'signed')) if (!signed.has(t.form) && !out.includes(t.form)) out.push(t.form);
  return out;
}

// the enrollment packet (seed enrollment_packet): signed forms come from consents, the rest from s.enrollment
export function packetStatus(s, c) {
  const pack = s.enrollment_packet || [];
  const rec = s.enrollment?.[c.id] || {};
  const signed = new Map(s.consents.filter(x => x.client === c.id && x.status === 'signed').map(x => [x.form, x]));
  const items = pack.map(name => {
    const sg = signed.get(name); const r = rec[name];
    return { name, sign: !!FORMS[name], done: !!(sg || r), at: sg?.signed_at || r?.at || null, file: sg?.file || null, data: r?.data || null };
  });
  return { items, done: items.filter(i => i.done).length, total: items.length };
}

// the guardian's name, or "M.R.'s grandmother" when the record only has the relationship
export function guardianLabel(ctx, lang = 'en') {
  const g = ctx.guardian; const rel = ctx.client.guardian?.relationship;
  if (g && g !== rel && !/^guardian$/i.test(g)) return g;
  const relEs = { grandmother: 'abuela', grandfather: 'abuelo', mother: 'madre', father: 'padre', aunt: 'tía', uncle: 'tío' }[rel] || 'tutor';
  return lang === 'es' ? `${relEs} de ${childName(ctx.client)}` : `${childName(ctx.client)}'s ${rel || 'guardian'}`;
}

// ---------- booking the screening call and the intake (screen 50) ----------
// Open times across the clinicians who do screenings and intakes: a stand-in for their Google Calendars. Each
// time goes to the first clinician free then ("the closest available one"). Next four school days.
const TIMES = { screening: ['09:30', '11:00', '14:00', '15:30'], intake: ['09:00', '11:00', '13:30'] };
export function openSlots(s, kind) {
  const clin = s.staff.filter(x => x.role === 'clinician');
  const busy = new Set([
    ...s.screenings.filter(x => x.status === 'booked' && x.when).map(x => x.who + '|' + x.when.slice(0, 16)),
    ...s.clients.filter(c => c.intake?.when).map(c => c.intake.who + '|' + c.intake.when.slice(0, 16))
  ]);
  const days = []; let d = s.today;
  while (days.length < 4) { d = M.addDays(d, 1); const w = M.parse(d).getUTCDay(); if (w > 0 && w < 6) days.push(d); }
  return days.map((day, di) => ({
    day,
    slots: TIMES[kind].filter((t, ti) => (di * 7 + ti * 3) % 5 !== 1) // a few times already taken, so the calendar looks real
      .map(t => { const when = `${day}T${t}`; const who = clin.find(c => !busy.has(c.id + '|' + when)); return who ? { when, who: who.id } : null; })
      .filter(Boolean)
  })).filter(x => x.slots.length);
}
// what the family has to do next about calls and visits, or null
export function bookingState(s, ctx) {
  const { client: c, ref } = ctx;
  const sc = ref && s.screenings.find(x => x.referral === ref.id && x.status === 'booked');
  const done = ref && s.screenings.find(x => x.referral === ref.id && x.status === 'done');
  if (c?.intake?.when) return { kind: 'intake', booked: c.intake, when: c.intake.when, who: c.intake.who };
  if (c?.intake_offer) return { kind: 'intake', offered: c.intake_offer };
  if (sc && !done) return { kind: 'screening', booked: sc, when: sc.when, who: sc.who };
  if (ref?.screening_offer && !done) return { kind: 'screening', offered: ref.screening_offer };
  return null;
}
export const INTAKE_WHERE = 'Harvest Outreach Center office';

// ---------- insurance letters in plain words (screen 49; the portal shows the newest) ----------
const payerWord = (s, id) => { const p = M.payerShort(s, id); return /^Medicaid/.test(p) ? 'Medicaid' : p.split(' ')[0]; };
const LT = {
  en: {
    preparing: 'being prepared', waiting: p => `waiting for ${p}`, late: 'late answer', more: 'more information', partly: 'partly approved', talk: 'call booked', no: 'said no', appealed: 'appeal sent', yes: 'approved',
    prepTitle: p => `Harvest is preparing a request to ${p}`,
    prepInitial: (p, c) => `Before ${p} pays for ${c}'s help at school, Harvest has to ask for approval. Harvest is writing that request now from ${c}'s records.`,
    prepCont: (p, c, d) => `${c}'s current approval runs out${d ? ' ' + d : ' soon'}. Harvest is asking ${p} to keep services going.`,
    subTitle: p => `${p} has Harvest's request`,
    sub: (p, sent, due) => `Harvest sent the request${sent ? ' on ' + sent : ''}.${due ? ` ${p} has to answer by ${due}.` : ` ${p} will answer by letter.`} Harvest will tell you here when it does.`,
    lateTitle: p => `${p} is late answering`,
    lateText: (p, due) => `${p} was supposed to answer${due ? ' by ' + due : ''} and has not. Harvest is following up with ${p} for you.`,
    infoTitle: p => `${p} asked Harvest for more information`,
    infoText: (p, c) => `This is normal. ${p} wants more detail from ${c}'s records before deciding. Harvest answers within 24 hours.`,
    partTitle: p => `${p} approved part of the request`,
    partText: (p, c, req, off, by) => `Harvest asked for ${req} units of help for ${c}. ${p} offered ${off}. Harvest is choosing the best next step${by ? ' by ' + by : ''} and will explain it to you.`,
    p2pTitle: p => `Harvest will talk with ${p}'s doctor`,
    p2pText: (p, c, aw, req, d, who) => `${p} approved fewer units than Harvest asked for (${aw} of ${req}). On ${d}, ${who} will call ${p}'s doctor to explain why ${c} needs more.`,
    denTitle: p => `${p} said no`,
    denText: (p, c, r) => `${p} said ${c} is "${r}". Harvest disagrees. You can appeal, which means asking ${p} to look again. Only a parent or guardian can appeal, and Harvest writes the letter for you.`,
    denDo: n => `Read and sign the appeal letter.${n != null ? ` ${n} days left.` : ''}`, denDone: 'Done. You appealed.',
    apTitle: 'Your appeal was sent',
    apText: (p, d) => `You signed the appeal${d ? ' on ' + d : ''} and Harvest faxed it to ${p}. Harvest will tell you here when ${p} answers.`,
    actTitle: (p, c) => `${p} approved ${c}'s services`,
    actText: (p, aw, end) => `${p} approved ${aw ? aw + ' units' : 'the request'}${end ? ' through ' + end : ''}. Services keep going. Harvest asks again before the approval runs out.`,
    nothing: 'Nothing. Harvest takes care of it.', nothingCall: 'Nothing. If Harvest needs something from you, they will call.'
  },
  es: {
    preparing: 'en preparación', waiting: p => `esperando a ${p}`, late: 'respuesta tarde', more: 'más información', partly: 'aprobado en parte', talk: 'llamada fijada', no: 'dijo que no', appealed: 'apelación enviada', yes: 'aprobado',
    prepTitle: p => `Harvest está preparando una solicitud a ${p}`,
    prepInitial: (p, c) => `Antes de que ${p} pague la ayuda de ${c} en la escuela, Harvest tiene que pedir aprobación. Harvest está escribiendo esa solicitud con los datos de ${c}.`,
    prepCont: (p, c, d) => `La aprobación actual de ${c} se acaba${d ? ' el ' + d : ' pronto'}. Harvest le pide a ${p} que continúen los servicios.`,
    subTitle: p => `${p} tiene la solicitud de Harvest`,
    sub: (p, sent, due) => `Harvest envió la solicitud${sent ? ' el ' + sent : ''}.${due ? ` ${p} tiene que contestar antes del ${due}.` : ` ${p} contestará por carta.`} Harvest le avisará aquí.`,
    lateTitle: p => `${p} no ha contestado a tiempo`,
    lateText: (p, due) => `${p} tenía que contestar${due ? ' antes del ' + due : ''} y no lo ha hecho. Harvest está llamando a ${p} por usted.`,
    infoTitle: p => `${p} pidió más información a Harvest`,
    infoText: (p, c) => `Esto es normal. ${p} quiere más detalles de los datos de ${c} antes de decidir. Harvest contesta en 24 horas.`,
    partTitle: p => `${p} aprobó una parte de la solicitud`,
    partText: (p, c, req, off, by) => `Harvest pidió ${req} unidades de ayuda para ${c}. ${p} ofreció ${off}. Harvest está decidiendo el mejor paso${by ? ' antes del ' + by : ''} y se lo explicará.`,
    p2pTitle: p => `Harvest hablará con el médico de ${p}`,
    p2pText: (p, c, aw, req, d, who) => `${p} aprobó menos unidades de las que pidió Harvest (${aw} de ${req}). El ${d}, ${who} llamará al médico de ${p} para explicar por qué ${c} necesita más.`,
    denTitle: p => `${p} dijo que no`,
    denText: (p, c, r) => `${p} dijo que ${c} está "${r}". Harvest no está de acuerdo. Usted puede apelar, es decir, pedirle a ${p} que lo revise otra vez. Solo un padre, madre o tutor puede apelar, y Harvest le escribe la carta.`,
    denDo: n => `Lea y firme la carta de apelación.${n != null ? ` Quedan ${n} días.` : ''}`, denDone: 'Listo. Usted apeló.',
    apTitle: 'Su apelación fue enviada',
    apText: (p, d) => `Usted firmó la apelación${d ? ' el ' + d : ''} y Harvest se la envió por fax a ${p}. Harvest le avisará aquí cuando ${p} conteste.`,
    actTitle: (p, c) => `${p} aprobó los servicios de ${c}`,
    actText: (p, aw, end) => `${p} aprobó ${aw ? aw + ' unidades' : 'la solicitud'}${end ? ' hasta el ' + end : ''}. Los servicios continúan. Harvest vuelve a pedir antes de que se acabe.`,
    nothing: 'Nada. Harvest se encarga.', nothingCall: 'Nada. Si Harvest necesita algo de usted, le llamará.'
  }
};
const REASON_ES = { 'already connected to other services': 'ya conectado con otros servicios', 'does not meet medical necessity criteria': 'no cumple los criterios de necesidad médica' };

// One card per thing an insurer did (or Harvest did with an insurer), newest first. No action functions:
// `action` says what the button does ({ screen, id }) and the screen wires it.
export function lettersFor(s, c, lang) {
  const t = LT[lang]; const child = childName(c); const out = [];
  const who = (M.staff(s, c.clinician || 'jperez').name || 'Jordan Perez').split(' ')[0];
  for (const r of s.requests.filter(r => r.client === c.id)) {
    const p = payerWord(s, r.payer); const d = iso => iso ? fdate(iso, lang) : '';
    // initials end in "." (D.W.), so a sentence ending on the child's name would get two
    const L = (o) => out.push({ id: r.id, ...o, means: o.means.replace(/\.\.(\s|$)/g, '.$1') });
    switch (r.stage) {
      case 'draft_ready': case 'awaiting_signature': case 'signed': case 'sending': case 'portal_open':
        L({ at: r.renew_by || s.today, cls: 'n', chip: t.preparing, title: t.prepTitle(p), means: r.type === 'continued_stay' ? t.prepCont(p, child, d(r.renew_by)) : t.prepInitial(p, child), todo: t.nothing }); break;
      case 'submitted':
        L({ at: r.sent || s.today, cls: 'y', chip: t.waiting(p), title: t.subTitle(p), means: t.sub(p, d(r.sent), d(r.decision_due)), todo: t.nothing }); break;
      case 'overdue':
        L({ at: r.decision_due || r.sent || s.today, cls: 'r', chip: t.late, title: t.lateTitle(p), means: t.lateText(p, d(r.decision_due)), todo: t.nothing }); break;
      case 'info_requested':
        L({ at: r.info_requested_at || s.today, cls: 'y', chip: t.more, title: t.infoTitle(p), means: t.infoText(p, child), todo: t.nothingCall }); break;
      case 'partial_decide':
        L({ at: r.offer_call || r.sent || s.today, cls: 'y', chip: t.partly, title: t.partTitle(p), means: t.partText(p, child, r.units_requested, r.units_offered, d(r.reply_by)), todo: t.nothingCall }); break;
      case 'peer_to_peer_booked':
        L({ at: s.today, cls: 'y', chip: t.talk, title: t.p2pTitle(p), means: t.p2pText(p, child, r.units_awarded, r.units_requested, d(r.p2p_at), who), todo: t.nothing }); break;
      case 'denied': case 'appeal_sent': {
        const reason = r.denial_reason || 'not medically necessary';
        const dl = M.appealDeadline(s, r); const left = dl ? Math.max(0, M.daysBetween(s.today, dl)) : null;   // from the notice date by the rules table, not a constant anchored to a story date
        if (r.stage === 'appeal_sent') L({ at: r.appeal?.signed_at || s.today, cls: 'y', chip: t.appealed, title: t.apTitle, means: t.apText(p, d(r.appeal?.signed_at)), todo: t.nothing, action: { screen: 'AppealLetter', id: r.id, kind: 'see' } });
        L({ at: r.denied_on || s.today, cls: 'r', chip: t.no, title: t.denTitle(p), means: t.denText(p, child, lang === 'es' ? (REASON_ES[reason] || reason) : reason), todo: r.stage === 'denied' ? t.denDo(left) : t.denDone, urgent: r.stage === 'denied', action: r.stage === 'denied' ? { screen: 'AppealLetter', id: r.id, kind: 'appeal' } : null });
        break;
      }
      case 'active':
        L({ at: r.decided_at || c.authorization?.start || s.today, cls: 'g', chip: t.yes, title: t.actTitle(p, child), means: t.actText(p, r.units_awarded || c.authorization?.units, d(c.authorization?.end)), todo: t.nothing }); break;
      default: break;
    }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

// "where things stand" milestones
export function milestones(s, ctx) {
  const { client: c, ref, fl } = ctx; const out = [];
  if (ref?.received) out.push({ at: ref.received, en: 'referred by the school', es: 'la escuela lo refirió' });
  if (fl?.submitted_at) out.push({ at: fl.submitted_at, en: 'your details received', es: 'recibimos sus datos' });
  const sc = s.screenings.find(x => (x.client === c.id || x.referral === ref?.id) && x.status === 'done');
  if (sc?.when) out.push({ at: sc.when, en: 'first call done', es: 'primera llamada hecha' });
  const cs = s.consents.find(x => x.client === c.id && x.form === 'Consent for services' && x.status === 'signed');
  if (cs) out.push({ at: cs.signed_at, en: 'consent signed', es: 'consentimiento firmado' });
  if (c.timeline?.intake && c.stage !== 'referral' && c.timeline.intake.slice(0, 10) <= s.today) out.push({ at: c.timeline.intake, en: 'intake done', es: 'admisión hecha' });
  const rq = s.requests.find(r => r.client === c.id && r.type === 'initial' && r.sent);
  if (rq) out.push({ at: rq.sent, en: `request sent to ${M.payerShort(s, rq.payer).split(' ')[0]}`, es: `solicitud enviada a ${M.payerShort(s, rq.payer).split(' ')[0]}` });
  out.sort((a, b) => a.at < b.at ? -1 : 1);
  let tail = null;
  if (rq && ['submitted', 'overdue'].includes(rq.stage) && rq.decision_due) tail = rq.decision_due <= s.today ? { en: 'decision due today', es: 'decisión para hoy' } : { en: 'decision due ' + M.fmtDate(rq.decision_due), es: 'decisión para el ' + fdate(rq.decision_due, 'es') };
  else if (rq && rq.stage === 'active') tail = { en: 'approved', es: 'aprobado' };
  const done = out.length + (rq?.stage === 'active' ? 1 : 0);
  return { list: out, tail, pct: Math.round(100 * Math.min(done, 7) / 7) };
}
export function standText(m, lang) {
  const items = m.list.map(x => `${x[lang]} ${fdate(x.at, lang)}`);
  if (m.tail) items.push(m.tail[lang]);
  const last = items.slice(-3).join(' · ');
  return last ? last.charAt(0).toUpperCase() + last.slice(1) : (lang === 'es' ? 'Harvest se pondrá en contacto pronto' : 'Harvest will be in touch soon');
}

// ---------- "call us instead" ----------
export function callSheet(s, ctx, lang, who) {
  const org = s.org || {}; const cl = M.staff(s, ctx.client.clinician || 'jperez');
  const first = (cl.name || 'Jordan').split(' ')[0];
  const es = lang === 'es';
  modal(`<h2>${es ? 'Llámenos' : 'Call us'}</h2>
    <p>${es ? `Llame a Harvest Outreach Center al <b>${org.phone || '(434) 555-0120'}</b> (número de demostración). Pregunte por ${who || first}.` : `Call Harvest Outreach Center at <b>${org.phone || '(434) 555-0120'}</b> (demo number). Ask for ${who || first}.`}</p>
    <p style="color:#525B66">${es ? 'Lunes a viernes, 8 am – 5 pm. Podemos hacer las mismas preguntas por teléfono.' : (org.phone_hours || 'Mon–Fri, 8 am – 5 pm') + '. We can ask the same questions on the phone.'}</p>
    <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-close>${es ? 'Listo' : 'OK'}</button></div>`);
}

// ---------- finger / mouse signature on a <canvas> ----------
export class SigPad {
  constructor() { this.strokes = []; this.cur = null; }
  get empty() { return !this.strokes.some(s => s.length > 1); }
  clear() { this.strokes = []; this.redraw(); }
  attach(canvas, onChange) {
    this.canvas = canvas; this.onChange = onChange; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1; const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr)); canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.scale = dpr; this.redraw();
    const pos = e => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    canvas.onpointerdown = e => { e.preventDefault(); canvas.setPointerCapture?.(e.pointerId); this.cur = [pos(e)]; this.strokes.push(this.cur); this.redraw(); };
    canvas.onpointermove = e => { if (!this.cur) return; e.preventDefault(); this.cur.push(pos(e)); this.redraw(); };
    canvas.onpointerup = canvas.onpointercancel = () => { if (!this.cur) return; this.cur = null; this.onChange && this.onChange(); };
  }
  redraw() {
    const c = this.canvas; if (!c) return; const g = c.getContext('2d'); const k = this.scale || 1;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(k, 0, 0, k, 0, 0); g.strokeStyle = '#151B24'; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of this.strokes) { if (!s.length) continue; g.beginPath(); g.moveTo(s[0][0], s[0][1]); if (s.length === 1) g.lineTo(s[0][0] + .1, s[0][1]); for (const p of s.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); }
  }
  jpeg() { this.redraw(); return this.canvas.toDataURL('image/jpeg', 0.8); }
}

// ---------- the screen ----------
const T = {
  en: { hi: (g, c) => `Hi ${g || 'there'} · ${c}'s page`, stand: 'Where things stand', toSign: n => `${n} to sign`, allSigned: 'all signed', copy: 'copy (PDF)', signed: d => 'signed ' + d,
    doing: c => `How ${c} is doing`, thisWeek: 'this week', noProgress: c => `Progress shows here once ${c} starts at school with Harvest.`, checkin: '2-minute check-in', every2: 'every 2 weeks', start: 'Start the check-in',
    last: d => `Last one sent ${d} · thank you`, first: 'First check-in', next: 'Next check-in', dueWeek: 'due this week', due: d => 'due ' + d, three: 'Three questions, two minutes.',
    secure: 'Secure · only Harvest sees this', call: 'Call us instead', signBtn: f => f === 'Consent for services' ? 'Sign the consent for services' : f === 'Release of information · school' ? 'Sign the release for the school' : f === 'Treatment plan' ? 'Read and sign the treatment plan' : 'Sign: ' + f,
    good: (a, b, l) => `${a} good days out of ${b} ${l}`,
    packet: 'Enrollment packet', packetOf: (a, b) => `${a} of ${b} done`, packetAll: 'all done', packetLeft: n => `${n} left · about ${n * 2} minutes on your phone`, packetDone: 'Everything is ready for the intake visit.', packetOpen: 'Open the packet', packetSee: 'See the packet',
    nsBook: { screening: 'Next step: book your first call', intake: 'Next step: book the intake visit' }, nsBookSub: { screening: 'A 30–45 minute phone call with a Harvest clinician. Pick a time that works.', intake: 'In person, about 2 hours. You can ask for a ride.' },
    nsBooked: { screening: 'First call', intake: 'Intake visit' }, nsBookBtn: 'See open times', nsSee: 'Details or change',
    nsTomorrow: 'Tomorrow · please confirm', nsWith: (w, who) => `${w} · with ${who}`, nsRide: ' · ride requested',
    seeAll: 'See all progress', ins: 'Insurance updates', insNone: 'Nothing from the insurance company yet. Letters show here in plain words.', insBtn: 'Read the updates' },
  es: { hi: (g, c) => `Hola ${g || ''} · la página de ${c}`, stand: 'Cómo van las cosas', toSign: n => `${n} para firmar`, allSigned: 'todo firmado', copy: 'copia (PDF)', signed: d => 'firmado ' + d,
    doing: c => `Cómo le va a ${c}`, thisWeek: 'esta semana', noProgress: c => `El progreso aparecerá aquí cuando ${c} empiece con Harvest en la escuela.`, checkin: 'Chequeo de 2 minutos', every2: 'cada 2 semanas', start: 'Empezar el chequeo',
    last: d => `Último enviado ${d} · gracias`, first: 'Primer chequeo', next: 'Próximo chequeo', dueWeek: 'toca esta semana', due: d => 'toca el ' + d, three: 'Tres preguntas, dos minutos.',
    secure: 'Seguro · solo Harvest lo ve', call: 'Prefiero llamar', signBtn: f => f === 'Consent for services' ? 'Firmar el consentimiento de servicios' : f === 'Release of information · school' ? 'Firmar el permiso para la escuela' : f === 'Treatment plan' ? 'Leer y firmar el plan de tratamiento' : 'Firmar: ' + formName(f, 'es'),
    good: (a, b, l) => `${a} días buenos de ${b} ${l}`,
    packet: 'Papeles de inscripción', packetOf: (a, b) => `${a} de ${b} listos`, packetAll: 'todo listo', packetLeft: n => `faltan ${n} · unos ${n * 2} minutos en su teléfono`, packetDone: 'Todo está listo para la cita de admisión.', packetOpen: 'Abrir los papeles', packetSee: 'Ver los papeles',
    nsBook: { screening: 'Siguiente paso: reserve su primera llamada', intake: 'Siguiente paso: reserve la cita de admisión' }, nsBookSub: { screening: 'Una llamada de 30 a 45 minutos con un clínico de Harvest. Elija una hora.', intake: 'En persona, unas 2 horas. Puede pedir transporte.' },
    nsBooked: { screening: 'Primera llamada', intake: 'Cita de admisión' }, nsBookBtn: 'Ver horas libres', nsSee: 'Detalles o cambiar',
    nsTomorrow: 'Mañana · confirme por favor', nsWith: (w, who) => `${w} · con ${who}`, nsRide: ' · transporte pedido',
    seeAll: 'Ver todo el progreso', ins: 'Noticias del seguro', insNone: 'Todavía no hay nada del seguro. Las cartas aparecen aquí en palabras sencillas.', insBtn: 'Leer las noticias' }
};

export function progressFor(s, c, lang) {
  const recent = s.notes.filter(n => n.client === c.id && n.type === 'daily' && n.progress && M.daysBetween(n.date, s.today) < 7);
  const goalName = c.goals?.[0]?.name;
  if (recent.length) {
    const good = recent.filter(n => !/no progress|regress|not met|did not/i.test(n.progress)).length;
    return { goal: goalName ? goalName.charAt(0).toUpperCase() + goalName.slice(1) : (lang === 'es' ? 'Su meta principal' : 'Main goal'), pct: Math.round(100 * good / recent.length), text: T[lang].good(good, recent.length, lang === 'es' ? 'esta semana' : 'this week') };
  }
  const p = s.parent_progress?.[c.id];
  if (p && !['referral', 'intake'].includes(c.stage) && c.service_start) return { goal: lang === 'es' ? p.goal_es : p.goal, pct: Math.round(100 * p.good / p.of), text: T[lang].good(p.good, p.of, lang === 'es' ? p.label_es : p.label) };
  return null;
}

register('ParentPortal', class extends Screen {
  ctx() { return famCtx(this.s, this.params); }
  renderVals() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang];
    const pend = pendingForms(s, c);
    const signed = s.consents.filter(x => x.client === c.id && x.status === 'signed').map(x => ({ label: formName(x.form, lang), when: t.signed(fdate(x.signed_at, lang)), file: x.file || '' }));
    const ms = milestones(s, ctx);
    const prog = progressFor(s, c, lang);
    const gc = s.checkins.filter(x => x.client === c.id && x.role === 'guardian').sort((a, b) => (a.at || a.week_of) < (b.at || b.week_of) ? -1 : 1).at(-1);
    const nextDue = gc ? M.addDays(gc.week_of, 14) : null;
    const pk = packetStatus(s, c); const letter = lettersFor(s, c, lang)[0];
    const bs = bookingState(s, ctx);
    const next = !bs ? null : bs.booked
      ? { title: t.nsBooked[bs.kind], text: t.nsWith(`${fdate(bs.when, lang)}, ${M.fmtTime(bs.when)}`, M.staff(s, bs.who).name) + (bs.kind === 'intake' && bs.booked.ride ? t.nsRide : ''), chip: bs.kind === 'intake' && bs.when.slice(0, 10) === M.addDays(s.today, 1) && bs.booked.confirmed == null ? t.nsTomorrow : '', btn: t.nsSee, cls: 'o' }
      : { title: t.nsBook[bs.kind], text: t.nsBookSub[bs.kind], chip: '', btn: t.nsBookBtn, cls: 'p' };
    return {
      t: { hi: t.hi(ctx.guardianFirst, ctx.child), stand: t.stand, copy: t.copy, doing: t.doing(ctx.child), thisWeek: t.thisWeek, noProgress: t.noProgress(ctx.child), checkin: t.checkin, every2: t.every2, start: t.start, three: t.three, secure: t.secure, call: t.call, packet: t.packet, seeAll: t.seeAll, ins: t.ins, insBtn: t.insBtn },
      next,
      packetChip: pk.done === pk.total ? t.packetAll : t.packetOf(pk.done, pk.total), packetCls: pk.done === pk.total ? 'g' : 'y', packetPct: pk.total ? Math.round(100 * pk.done / pk.total) : 0,
      packetText: pk.done === pk.total ? t.packetDone : t.packetLeft(pk.total - pk.done), packetBtn: pk.done === pk.total ? t.packetSee : t.packetOpen,
      insChip: letter ? letter.chip : '', insCls: letter ? letter.cls : 'n', insText: letter ? letter.title : t.insNone,
      enStyle: lang === 'en' ? LANG_ON : LANG_OFF, esStyle: lang === 'es' ? LANG_ON : LANG_OFF,
      signChip: pend.length ? t.toSign(pend.length) : t.allSigned, signChipCls: pend.length ? 'y' : 'g',
      standText: standText(ms, lang), standPct: ms.pct, signed,
      signLabel: pend.length ? t.signBtn(pend[0]) : '',
      prog,
      lastCheckin: gc ? t.last(fdate(gc.at || gc.week_of, lang)) : '',
      nextTitle: gc ? t.next : t.first, nextChip: gc && nextDue > s.today ? t.due(fdate(nextDue, lang)) : t.dueWeek, nextCls: gc && nextDue > s.today ? 'n' : 'y'
    };
  }
  get anchors() {
    const ctx = () => this.ctx();
    return {
      en: () => { setLang('en'); this.setState({}); },
      es: () => { setLang('es'); this.setState({}); },
      sign: () => { const f = pendingForms(this.s, ctx().client)[0] || ''; if (/^Quarterly report/.test(f)) pgo(this.params, 'ParentQuarterly'); else if (f && f !== 'Consent for services') pgo(this.params, 'ParentSign', { form: f }); else pgo(this.params, 'ParentSign'); },
      enroll: () => pgo(this.params, 'ParentEnroll'),
      progress: () => pgo(this.params, 'ParentProgress'),
      letters: () => pgo(this.params, 'ParentLetters'),
      book: () => pgo(this.params, 'ParentSchedule'),
      survey: () => pgo(this.params, 'ParentSurvey'),
      call: () => callSheet(this.s, ctx(), getLang(ctx().client))
    };
  }
  set anchors(v) { }
});
