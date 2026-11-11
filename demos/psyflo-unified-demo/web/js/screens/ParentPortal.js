// 12 · Parent portal (phone, 390 px). Checklist home: "N of M done", one task per screen, English / Español, targets of 44 px or more,
// semantic h1/h2 and landmarks. This file is also the shared kit of the family portal (E6): the tokenised-link context, the language
// switch, the page frame with its header and footer, the signature box (draw or type), the plain-language letters, the "call us" sheet
// and the CSS every family screen uses. It reads ONLY what the guardian's role projection gives (one child, plain fields, own letters).
import { register, Screen, M, raw, esc, ui, toast, go, api } from '../app.js';
import * as P from '../shared/sel/portal.js';
import { today as clockToday } from '../shared/clock.js';

// ---------- family context from the tokenised link (or the presenter's view of one child) ----------
export function famCtx(s, params = {}) {
  const a = api.session && api.session();
  const mine = a && a.kind === 'guardian' ? a : null;
  const t = params.t || (mine && mine.linkToken) || null;
  let fl = t ? (s.family_links || []).find(f => f.token === t) : null;
  let c = mine && M.byId(s.clients, mine.client);
  if (!c && fl) c = M.byId(s.clients, fl.client);
  if (!c && params.c) c = M.byId(s.clients, params.c);
  if (!c) c = (mine && (s.clients || [])[0]) || M.byId(s.clients, 'TW') || (s.clients || [])[0] || { id: params.c || 'TW', initials: params.c || 'T.W.', guardian: {} };
  if (!fl) fl = (s.family_links || []).find(f => f.client === c.id) || (s.family_links || []).find(f => f.referral === c.referral);
  const ref = (s.referrals || []).find(r => r.id === ((fl && fl.referral) || c.referral)) || (s.referrals || []).find(r => r.client === c.id);
  const guardian = (fl && fl.answers && fl.answers.guardian_name) || (mine && mine.name && mine.name !== 'Guardian' ? mine.name : '') || (c.guardian && c.guardian.name) || '';
  const g = /^(guardian|grandmother|mother|father|grandfather)$/i.test(guardian) ? '' : guardian;
  return { token: t, fl, client: c, ref, guardian: g, child: c.first_name || c.initials, guardianFirst: g.split(' ')[0] || '' };
}
// links between family screens keep the token (texted link) or the ?c= child (presenter view), plus any extra query
export function phref(params, id, extra = {}) {
  const q = new URLSearchParams();
  if (params && params.c && !params.t) q.set('c', params.c);
  for (const [k, v] of Object.entries(extra)) if (v != null) q.set(k, v);
  const qs = q.toString() ? '?' + q : '';
  return params && params.t ? `/parent/${params.t}/${id}${qs}` : `${id}.dc.html${qs}`;
}
export function pgo(params, id, extra) { const h = phref(params, id, extra); if (params && params.t) location.href = h; else go(h); }
export const childName = c => c.first_name || c.initials;

// ---------- language ----------
export function getLang(c) {
  try { const l = localStorage.getItem('psyflo_parent_lang'); if (l === 'en' || l === 'es') return l; } catch { }
  return c && c.guardian && c.guardian.language === 'es' ? 'es' : 'en';
}
export function setLang(l) { try { localStorage.setItem('psyflo_parent_lang', l); } catch { } }
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DOW = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] };
export function fdate(iso, lang) { if (!iso) return ''; if (lang !== 'es') return M.fmtDate(iso); const d = M.parse(iso); return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}`; }
export const dayLabel = (d, lang) => `${DOW[lang][M.parse(d).getUTCDay()]} ${fdate(d, lang)}`;
export const SIGN_WORD = { en: 'Signing', es: 'Firma' };

// ---------- the forms the guardian reads and signs (demo wording; Harvest's real forms replace it) ----------
export const DEMO_WORDING = { en: 'Demo wording · Harvest\'s own form replaces it', es: 'Texto de demostración · el formulario real de Harvest lo reemplaza' };
export const FORMS = {
  'Consent for services': {
    es: 'Consentimiento de servicios',
    sum: { en: c => `You agree that Harvest can work with ${c} at school during the day. You can stop at any time. Harvest may ask to record the first call; they ask you first and you can say no.`, es: c => `Usted acepta que Harvest trabaje con ${c} en la escuela durante el día. Puede parar en cualquier momento. Harvest puede pedir grabar la primera llamada; le preguntan primero y usted puede decir que no.` },
    full: {
      en: c => `Harvest Outreach Center · Consent to Treatment · Therapeutic Day Treatment. I, the parent or legal guardian of the child named above, consent to the provision of therapeutic day treatment services as described in the individual service plan. Services happen at ${c}'s school during the school day and may include one-to-one support, skill practice and work with teachers.\n\nI understand that I may stop services at any time by telling Harvest, and that stopping will not affect any other help my family receives. I understand Harvest will ask my insurance to approve these services and will tell me what the insurance decides.\n\nHarvest may ask to record the first screening call so the clinician can fill in paperwork accurately. Harvest asks me first, on the call. I can say no to recording and still receive services.`,
      es: c => `Harvest Outreach Center · Consentimiento para tratamiento · Tratamiento Diurno Terapéutico. Yo, padre, madre o tutor legal del niño nombrado arriba, doy mi consentimiento para que reciba servicios de tratamiento diurno terapéutico como se describe en el plan de servicio individual. Los servicios se dan en la escuela de ${c} durante el día escolar y pueden incluir apoyo uno a uno, práctica de habilidades y trabajo con los maestros.\n\nEntiendo que puedo parar los servicios en cualquier momento avisándole a Harvest, y que esto no afectará otra ayuda que reciba mi familia. Entiendo que Harvest pedirá a mi seguro que apruebe estos servicios y me dirá lo que decida el seguro.\n\nHarvest puede pedir grabar la primera llamada de evaluación para que el clínico llene los papeles correctamente. Harvest me pregunta primero, durante la llamada. Puedo decir que no a la grabación y aun así recibir los servicios.`
    }
  },
  'Release of information · school': {
    es: 'Permiso para compartir información · escuela',
    sum: { en: c => `You agree that Harvest and ${c}'s school can talk about how ${c} is doing at school: attendance, behaviour and goals. Not clinical notes. You can stop this at any time.`, es: c => `Usted acepta que Harvest y la escuela de ${c} hablen sobre cómo le va a ${c} en la escuela: asistencia, conducta y metas. No las notas clínicas. Puede parar esto en cualquier momento.` },
    full: {
      en: c => `Harvest Outreach Center · Authorization to Release Information · School. I allow Harvest Outreach Center and ${c}'s school (counselor, teachers and administrators) to share with each other: attendance, office referrals, teacher check-ins, and progress on ${c}'s school goals.\n\nHarvest will not share clinical notes, diagnoses or anything about our home with the school.\n\nI can stop this permission by telling Harvest.`,
      es: c => `Harvest Outreach Center · Autorización para compartir información · Escuela. Permito que Harvest Outreach Center y la escuela de ${c} (consejero, maestros y administradores) compartan entre sí: asistencia, reportes a la oficina, chequeos de los maestros y el progreso en las metas escolares de ${c}.\n\nHarvest no compartirá con la escuela notas clínicas, diagnósticos ni nada sobre nuestro hogar.\n\nPuedo parar este permiso avisándole a Harvest.`
    }
  }
};
const goalList = cl => (cl && cl.goals || []).map((g, i) => `${i + 1}. ${g.name.charAt(0).toUpperCase() + g.name.slice(1)}`).join('; ');
FORMS['Treatment plan'] = {
  es: 'Plan de tratamiento',
  sum: {
    en: (c, cl) => `The plan for ${c}'s help at school. Goals: ${goalList(cl) || 'set at the intake visit'}. Harvest staff work on these with ${c} during the school day and look at progress with you.`,
    es: (c, cl) => `El plan para la ayuda de ${c} en la escuela. Metas: ${goalList(cl) || 'se fijan en la cita de admisión'}. El personal de Harvest trabaja en esto con ${c} durante el día escolar y revisa el progreso con usted.`
  },
  full: {
    en: (c, cl) => ['Harvest Outreach Center · Individual Service Plan · Therapeutic Day Treatment', ...(cl && cl.goals || []).map((g, i) => `Goal ${i + 1}: ${g.name}. ${g.objective || ''}`), 'Services: therapeutic day treatment at school during the school day.', 'Guardian signature: I took part in writing this plan and agree to it. I can ask for changes at any time.'].join('\n\n'),
    es: (c, cl) => ['Harvest Outreach Center · Plan de servicio individual · Tratamiento Diurno Terapéutico', ...(cl && cl.goals || []).map((g, i) => `Meta ${i + 1}: ${g.name}. ${g.objective || ''}`), 'Servicios: tratamiento diurno terapéutico en la escuela durante el día escolar.', 'Firma del tutor: Participé en escribir este plan y estoy de acuerdo. Puedo pedir cambios en cualquier momento.'].join('\n\n')
  }
};
export const formName = (f, lang) => lang === 'es' ? ((FORMS[f] && FORMS[f].es) || (/^Quarterly report/.test(f) ? 'Informe trimestral' : f)) : f;
export const pendingForms = (s, c) => P.signForms(s, c.id).filter(f => f.state !== 'completed' && f.state !== 'ready').map(f => f.form);
export const packetStatus = (s, c) => P.packet(s, c.id);
export const bookingState = (s, ctx) => P.bookingState(s, ctx.client, ctx.ref);

// the guardian's name, or "M.R.'s grandmother" when the record only has the relationship
export function guardianLabel(ctx, lang = 'en') {
  const g = ctx.guardian; const rel = ctx.client.guardian && ctx.client.guardian.relationship;
  if (g && g !== rel && !/^guardian$/i.test(g)) return g;
  const relEs = { grandmother: 'abuela', grandfather: 'abuelo', mother: 'madre', father: 'padre', aunt: 'tía', uncle: 'tío' }[rel] || 'tutor';
  return lang === 'es' ? `${relEs} de ${childName(ctx.client)}` : `${childName(ctx.client)}'s ${rel || 'guardian'}`;
}

// ---------- booking the screening call and the intake ----------
// Open times across the clinicians who do screenings and intakes: a stand-in for their calendars, each time going to the first clinician free then.
const TIMES = { screening: ['09:30', '11:00', '14:00', '15:30'], intake: ['09:00', '11:00', '13:30'] };
export function openSlots(s, kind) {
  const clin = (s.staff || []).filter(x => x.role === 'clinician');
  const busy = new Set([
    ...(s.screenings || []).filter(x => x.status === 'booked' && x.when).map(x => x.who + '|' + x.when.slice(0, 16)),
    ...(s.clients || []).filter(c => c.intake && c.intake.when).map(c => c.intake.who + '|' + c.intake.when.slice(0, 16))
  ]);
  const days = []; let d = clockToday(s);
  while (days.length < 4) { d = M.addDays(d, 1); const w = M.parse(d).getUTCDay(); if (w > 0 && w < 6) days.push(d); }
  return days.map((day, di) => ({
    day,
    slots: TIMES[kind].filter((t, ti) => (di * 7 + ti * 3) % 5 !== 1) // a few times already taken, so the calendar looks real
      .map(t => { const when = `${day}T${t}`; const who = clin.find(c => !busy.has(c.id + '|' + when)); return who ? { when, who: who.id } : null; })
      .filter(Boolean)
  })).filter(x => x.slots.length);
}
export const INTAKE_WHERE = 'Harvest Outreach Center office';

// ---------- insurance letters in plain words: What this says · What you can do · By when ----------
const payerWord = (s, id) => { const p = M.payerShort(s, id); return /^Medicaid/.test(p) ? 'Medicaid' : p.split(' ')[0]; };
const REASON_ES = { 'already connected to other services': 'ya conectado con otros servicios', 'does not meet medical necessity criteria': 'no cumple los criterios de necesidad médica' };
const LT = {
  en: {
    preparing: 'Being prepared', waiting: p => `Waiting for ${p}`, late: 'Taking longer', more: 'More information', partly: 'Partly approved', talk: 'Harvest is asking again', no: 'Said no', appealed: 'Appeal sent', yes: 'Approved',
    prepTitle: p => `Harvest is preparing a request to ${p}`,
    prepInitial: (p, c) => `Before ${p} pays for ${c}'s help at school, Harvest has to ask for approval. Harvest is writing that request now.`,
    prepCont: (p, c) => `${c}'s current approval is ending. Harvest is asking ${p} to keep services going.`,
    subTitle: p => `${p} has Harvest's request`,
    sub: p => `Harvest sent the request. ${p} will answer by letter. Harvest will tell you here when it does.`,
    lateTitle: p => `${p} has not answered yet`,
    lateText: p => `It is taking longer than Harvest expected. Harvest is still waiting for ${p} and will tell you here when it answers.`,
    infoTitle: p => `${p} asked Harvest for more information`,
    infoText: (p, c) => `This is normal. ${p} wants more detail from ${c}'s records before deciding.`,
    partTitle: p => `${p} approved part of the request`,
    partText: (p, c, req, off) => `Harvest asked for ${req} units of help for ${c}. ${p} offered ${off}. Harvest is choosing the best next step and will explain it to you.`,
    p2pTitle: p => `Harvest will talk with ${p}'s doctor`,
    p2pText: (p, c, aw, req) => `${p} approved fewer units than Harvest asked for${aw != null && req != null ? ` (${aw} of ${req})` : ''}. A Harvest clinician will talk with ${p}'s doctor to explain why ${c} needs more.`,
    denTitle: p => `${p} said no`,
    denText: (p, c, r) => `${p} said ${c} is "${r}". Harvest disagrees. You can appeal, which means asking ${p} to look again. A parent or guardian can appeal. Harvest prepares the letter and you read it and sign it.`,
    apTitle: 'Your appeal was sent',
    apText: p => `You signed the appeal and Harvest staff sent it to ${p}. Harvest will tell you here when ${p} answers.`,
    actTitle: (p, c) => `${p} approved ${c}'s services`,
    actText: (p, aw) => `${p} approved ${aw ? aw + ' units' : 'the request'}. Services keep going. Harvest asks again before the approval runs out.`,
    nothing: 'Nothing. Harvest takes care of it.', nothingCall: 'Nothing right now. If Harvest needs something from you, they will call.',
    byNone: 'Nothing is due from you.', byTell: 'Harvest will tell you here.',
    appealDraft: 'Nothing yet. Harvest is preparing your appeal letter. You will see it here when it is ready to read.',
    appealReady: 'Read the appeal letter, change the words if you want, then sign.', appealSigned: 'You signed. Harvest staff will review the signed letter and send it.', appealSent: 'Done. Harvest staff sent it.',
    byAppeal: (d, n) => `By ${d}${n != null ? (n >= 0 ? ` · ${n} day${n === 1 ? '' : 's'} left` : ' · the date has passed') : ''}`,
    byAppealNone: 'Check the date on the insurance letter. Harvest cannot confirm it from here.',
    byAppealHow: 'Counted from the date on the insurance letter. Check your letter to be sure.',
    open: 'Open', openAppeal: 'Read the appeal letter', seeAppeal: 'See your appeal letter'
  },
  es: {
    preparing: 'En preparación', waiting: p => `Esperando a ${p}`, late: 'Está tardando', more: 'Más información', partly: 'Aprobado en parte', talk: 'Harvest pide otra vez', no: 'Dijo que no', appealed: 'Apelación enviada', yes: 'Aprobado',
    prepTitle: p => `Harvest está preparando una solicitud a ${p}`,
    prepInitial: (p, c) => `Antes de que ${p} pague la ayuda de ${c} en la escuela, Harvest tiene que pedir aprobación. Harvest está escribiendo esa solicitud ahora.`,
    prepCont: (p, c) => `La aprobación actual de ${c} se está acabando. Harvest le pide a ${p} que continúen los servicios.`,
    subTitle: p => `${p} tiene la solicitud de Harvest`,
    sub: p => `Harvest envió la solicitud. ${p} contestará por carta. Harvest le avisará aquí cuando conteste.`,
    lateTitle: p => `${p} todavía no ha contestado`,
    lateText: p => `Está tardando más de lo que Harvest esperaba. Harvest sigue esperando a ${p} y le avisará aquí cuando conteste.`,
    infoTitle: p => `${p} pidió más información a Harvest`,
    infoText: (p, c) => `Esto es normal. ${p} quiere más detalles de los datos de ${c} antes de decidir.`,
    partTitle: p => `${p} aprobó una parte de la solicitud`,
    partText: (p, c, req, off) => `Harvest pidió ${req} unidades de ayuda para ${c}. ${p} ofreció ${off}. Harvest está decidiendo el mejor paso y se lo explicará.`,
    p2pTitle: p => `Harvest hablará con el médico de ${p}`,
    p2pText: (p, c, aw, req) => `${p} aprobó menos unidades de las que pidió Harvest${aw != null && req != null ? ` (${aw} de ${req})` : ''}. Un clínico de Harvest hablará con el médico de ${p} para explicar por qué ${c} necesita más.`,
    denTitle: p => `${p} dijo que no`,
    denText: (p, c, r) => `${p} dijo que ${c} está "${r}". Harvest no está de acuerdo. Usted puede apelar, es decir, pedirle a ${p} que lo revise otra vez. Un padre, madre o tutor puede apelar. Harvest prepara la carta y usted la lee y la firma.`,
    apTitle: 'Su apelación fue enviada',
    apText: p => `Usted firmó la apelación y el personal de Harvest se la envió a ${p}. Harvest le avisará aquí cuando ${p} conteste.`,
    actTitle: (p, c) => `${p} aprobó los servicios de ${c}`,
    actText: (p, aw) => `${p} aprobó ${aw ? aw + ' unidades' : 'la solicitud'}. Los servicios continúan. Harvest vuelve a pedir antes de que se acabe.`,
    nothing: 'Nada. Harvest se encarga.', nothingCall: 'Nada por ahora. Si Harvest necesita algo de usted, le llamará.',
    byNone: 'No se le pide nada con fecha.', byTell: 'Harvest le avisará aquí.',
    appealDraft: 'Todavía nada. Harvest está preparando su carta de apelación. La verá aquí cuando esté lista para leer.',
    appealReady: 'Lea la carta de apelación, cambie las palabras si quiere, y firme.', appealSigned: 'Usted firmó. El personal de Harvest revisará la carta firmada y la enviará.', appealSent: 'Listo. El personal de Harvest la envió.',
    byAppeal: (d, n) => `Antes del ${d}${n != null ? (n >= 0 ? ` · quedan ${n} día${n === 1 ? '' : 's'}` : ' · la fecha ya pasó') : ''}`,
    byAppealNone: 'Revise la fecha en la carta del seguro. Harvest no puede confirmarla desde aquí.',
    byAppealHow: 'Se cuenta desde la fecha de la carta del seguro. Revise su carta para estar seguro.',
    open: 'Abrir', openAppeal: 'Leer la carta de apelación', seeAppeal: 'Ver su carta de apelación'
  }
};
// One card per thing an insurer did (or Harvest did with an insurer), newest first. `by` carries the date and where it came from.
export function lettersFor(s, c, lang) {
  const t = LT[lang]; const child = childName(c); const out = [];
  for (const r of (s.requests || []).filter(r => r.client === c.id)) {
    const p = payerWord(s, r.payer);
    const L = o => out.push({ id: r.id, by: { text: t.byNone }, ...o, says: o.says.replace(/\.\.(\s|$)/g, '.$1') });
    switch (r.stage) {
      case 'draft_ready': case 'needs_approval': case 'awaiting_signature': case 'signed': case 'sending': case 'portal_open':
        L({ at: '1', cls: 'neutral', chip: t.preparing, title: t.prepTitle(p), says: r.type === 'continued_stay' ? t.prepCont(p, child) : t.prepInitial(p, child), can: t.nothing }); break;
      case 'submitted':
        L({ at: '2', cls: 'warn', chip: t.waiting(p), title: t.subTitle(p), says: t.sub(p), can: t.nothing, by: { text: t.byTell } }); break;
      case 'overdue':
        L({ at: '2', cls: 'warn', chip: t.late, title: t.lateTitle(p), says: t.lateText(p), can: t.nothing, by: { text: t.byTell } }); break;
      case 'info_requested':
        L({ at: '3', cls: 'warn', chip: t.more, title: t.infoTitle(p), says: t.infoText(p, child), can: t.nothingCall }); break;
      case 'partial_decide':
        L({ at: '3', cls: 'warn', chip: t.partly, title: t.partTitle(p), says: t.partText(p, child, r.units_requested, r.units_offered), can: t.nothingCall, by: { text: t.byTell } }); break;
      case 'peer_to_peer_requested': case 'peer_to_peer_booked': case 'p2p_awaiting':
        L({ at: '3', cls: 'warn', chip: t.talk, title: t.p2pTitle(p), says: t.p2pText(p, child, r.units_awarded, r.units_requested), can: t.nothing, by: { text: t.byTell } }); break;
      case 'denied': case 'appeal_sent': {
        const reason = r.denial_reason || 'not medically necessary';
        const a = P.appealView(s, r); const d = a.deadline;
        if (r.stage === 'appeal_sent' || a.status === 'submitted') L({ at: (a.sentAt || a.signedAt || '4'), cls: 'warn', chip: t.appealed, title: t.apTitle, says: t.apText(p), can: t.nothing, action: { screen: 'AppealLetter', id: r.id, kind: 'see' } });
        const can = a.status === 'draft' ? t.appealDraft : a.status === 'ready' ? t.appealReady : a.status === 'signed' ? t.appealSigned : t.appealSent;
        const by = d.date ? { text: t.byAppeal(fdate(d.date, lang), d.daysLeft), how: t.byAppealHow, rule: d.rule, basis: d.basis } : { text: t.byAppealNone, rule: d.rule };
        L({ at: r.denied_on || '4', cls: 'danger', chip: t.no, title: t.denTitle(p), says: t.denText(p, child, lang === 'es' ? (REASON_ES[reason] || reason) : reason), can, by, urgent: a.status === 'ready',
          appeal: a.status, action: a.status === 'ready' ? { screen: 'AppealLetter', id: r.id, kind: 'appeal' } : a.status !== 'draft' ? { screen: 'AppealLetter', id: r.id, kind: 'see' } : null });
        break;
      }
      case 'active':
        L({ at: '5', cls: 'ok', chip: t.yes, title: t.actTitle(p, child), says: t.actText(p, r.units_awarded || (c.authorization && c.authorization.units)), can: t.nothing }); break;
      default: break;
    }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}
export const LETTER_TEXT = LT;

// ---------- what the child has been working on this week, in words (from this week's daily-note ratings, else the seeded week) ----------
const GOOD = { en: (a, b, l) => `${a} good days out of ${b} ${l}`, es: (a, b, l) => `${a} días buenos de ${b} ${l}` };
export function progressFor(s, c, lang) {
  const recent = (s.notes || []).filter(n => n.client === c.id && n.type === 'daily' && n.progress && M.daysBetween(n.date, clockToday(s)) < 7);
  const goalName = c.goals && c.goals[0] && c.goals[0].name;
  if (recent.length) {
    const good = recent.filter(n => !/no progress|regress|not met|did not/i.test(n.progress)).length;
    return { goal: goalName ? goalName.charAt(0).toUpperCase() + goalName.slice(1) : (lang === 'es' ? 'Su meta principal' : 'Main goal'), pct: Math.round(100 * good / recent.length), text: GOOD[lang](good, recent.length, lang === 'es' ? 'esta semana' : 'this week') };
  }
  const p = (s.parent_progress || {})[c.id];
  if (p && !['referral', 'intake'].includes(c.stage) && c.service_start) return { goal: lang === 'es' ? p.goal_es : p.goal, pct: Math.round(100 * p.good / p.of), text: GOOD[lang](p.good, p.of, lang === 'es' ? p.label_es : p.label) };
  return null;
}

// ---------- "call us instead" ----------
export function callSheet(s, ctx, lang, who) {
  const org = s.org || {}; const cl = M.staff(s, (ctx.client && ctx.client.clinician) || 'jperez');
  const first = (cl.name || 'Jordan').split(' ')[0]; const es = lang === 'es';
  ui.modal({
    title: es ? 'Llámenos' : 'Call us', size: 'sm',
    body: `<p style="font-size:16px">${es ? `Llame a Harvest Outreach Center al <b>${esc(org.phone || '(434) 555-0120')}</b> (número de demostración). Pregunte por ${esc(who || first)}.` : `Call Harvest Outreach Center at <b>${esc(org.phone || '(434) 555-0120')}</b> (demo number). Ask for ${esc(who || first)}.`}</p>
      <p style="color:var(--muted-700);font-size:16px">${es ? 'Lunes a viernes, 8 am – 5 pm. Podemos hacer las mismas preguntas por teléfono.' : esc(org.phone_hours || 'Mon–Fri, 8 am – 5 pm') + '. We can ask the same questions on the phone.'}</p>`,
    actions: [{ label: es ? 'Listo' : 'OK', tone: 'primary' }]
  });
}

// ---------- finger / mouse signature on a <canvas>, or the guardian's typed name ----------
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
    canvas.onpointerdown = e => { e.preventDefault(); canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); this.cur = [pos(e)]; this.strokes.push(this.cur); this.redraw(); };
    canvas.onpointermove = e => { if (!this.cur) return; e.preventDefault(); this.cur.push(pos(e)); this.redraw(); };
    canvas.onpointerup = canvas.onpointercancel = () => { if (!this.cur) return; this.cur = null; this.onChange && this.onChange(); };
  }
  redraw() {
    const c = this.canvas; if (!c) return; const g = c.getContext('2d'); const k = this.scale || 1;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.setTransform(k, 0, 0, k, 0, 0); g.strokeStyle = '#1B1B19'; g.lineWidth = 2.4; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const s of this.strokes) { if (!s.length) continue; g.beginPath(); g.moveTo(s[0][0], s[0][1]); if (s.length === 1) g.lineTo(s[0][0] + .1, s[0][1]); for (const p of s.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); }
  }
  jpeg() { this.redraw(); return this.canvas.toDataURL('image/jpeg', 0.8); }
}
// the typed name drawn as an image, so it goes through the same signed-PDF path as a drawn signature
export function typedSignature(name) {
  const c = document.createElement('canvas'); c.width = 640; c.height = 200; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#1B1B19';
  let size = 64; g.textBaseline = 'middle';
  do { g.font = `italic 500 ${size}px "Segoe Script","Snell Roundhand","Brush Script MT","Apple Chancery",cursive,serif`; size -= 4; } while (g.measureText(name).width > c.width - 40 && size > 20);
  g.fillText(name, 20, 100);
  return c.toDataURL('image/jpeg', 0.8);
}
const SB = {
  en: { how: 'How do you want to sign?', draw: 'Draw', type: 'Type your name', signHere: 'Sign with your finger', typeLabel: 'Type your full name', clear: 'Clear', signingAs: 'Signing as', sign: 'Sign', empty: 'Sign in the box first', noName: 'Type your name first' },
  es: { how: '¿Cómo quiere firmar?', draw: 'Dibujar', type: 'Escribir su nombre', signHere: 'Firme con el dedo', typeLabel: 'Escriba su nombre completo', clear: 'Borrar', signingAs: 'Firma', sign: 'Firmar', empty: 'Firme primero en el recuadro', noName: 'Escriba primero su nombre' }
};
export class SignBox {
  constructor(id = 'sig') { this.id = id; this.pad = new SigPad(); this.method = 'draw'; this.typed = ''; }
  html(lang, { name = '', label } = {}) {
    const t = SB[lang]; const draw = this.method === 'draw';
    return `<div class="fp-sig" role="group" aria-label="${esc(label || t.how)}">
      <div class="fp-seg" role="group" aria-label="${esc(t.how)}"><button type="button" data-sig-method="draw" aria-pressed="${draw}">${t.draw}</button><button type="button" data-sig-method="type" aria-pressed="${!draw}">${t.type}</button></div>
      ${draw
        ? `<div class="fp-pad"><canvas id="${this.id}" aria-label="${esc(t.signHere)}"></canvas><span class="fp-pad__ph" id="${this.id}-ph">${esc(t.signHere)}</span></div>
           <div class="fp-sig__row"><span>${name ? t.signingAs + ' ' + esc(name) : ''}</span><button type="button" class="fp-link" data-sig-clear>${t.clear}</button></div>`
        : `<label class="fp-lab" for="${this.id}-name">${t.typeLabel}</label><input class="fp-in" id="${this.id}-name" data-nobind type="text" autocomplete="name" value="${esc(this.typed)}">
           ${name ? `<div class="fp-sig__row"><span>${t.signingAs} ${esc(name)}</span></div>` : ''}`}
    </div>`;
  }
  attach(root, rerender) {
    const ph = root.querySelector(`#${this.id}-ph`);
    this.pad.attach(root.querySelector(`#${this.id}`), () => { if (ph) ph.style.display = this.pad.empty ? '' : 'none'; });
    if (ph) ph.style.display = this.pad.empty ? '' : 'none';
    root.querySelectorAll('[data-sig-method]').forEach(b => { b.onclick = () => { this.method = b.dataset.sigMethod; rerender(); }; });
    root.querySelectorAll('[data-sig-clear]').forEach(b => { b.onclick = () => { this.pad.clear(); if (ph) ph.style.display = ''; }; });
    const inp = root.querySelector(`#${this.id}-name`); if (inp) inp.oninput = () => { this.typed = inp.value; };
  }
  // null when there is nothing to sign with; otherwise the JPEG data URL. `error` says what is missing, in the guardian's language
  value(lang) {
    const t = SB[lang];
    if (this.method === 'type') { const n = this.typed.trim(); return n.length < 2 ? { error: t.noName } : { signature: typedSignature(n), method: 'typed' }; }
    return this.pad.empty ? { error: t.empty } : { signature: this.pad.jpeg(), method: 'drawn' };
  }
  reset() { this.pad.clear(); this.typed = ''; }
}

// ---------- the page frame: header with the language switch, main landmark with the one h1, footer ----------
export const FP_CSS = `
.fp{background:var(--paper-50);color:var(--ink-900);font:400 16px/24px var(--font);min-height:100%;display:flex;flex-direction:column}
.fp *,.fp *::before,.fp *::after{box-sizing:border-box}
:where(.fp a){color:var(--teal-700)}
a.fp-link{display:inline-flex;align-items:center;align-self:flex-start}
.fp-hd{display:flex;align-items:center;gap:12px;padding:8px 16px;background:var(--surface-0);border-bottom:1px solid var(--line-200);min-height:60px}
.fp-brand{flex:1;min-width:0;font-weight:700;font-size:16px;line-height:20px}
.fp-lang{display:inline-flex;border:1px solid var(--control-500);border-radius:var(--r-pill);overflow:hidden;background:#fff;flex:none}
.fp-lang button{min-width:68px;min-height:44px;padding:0 14px;border:0;background:#fff;font:600 16px var(--font);color:var(--ink-900);cursor:pointer}
.fp-lang button[aria-pressed=true]{background:var(--teal-600);color:#fff}
.fp-main{flex:1;padding:4px 16px 24px;display:flex;flex-direction:column;gap:12px}
.fp-back{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-weight:600;color:var(--teal-700);text-decoration:none;align-self:flex-start}
.fp-back:hover{text-decoration:underline}
.fp-h1{font-size:26px;line-height:32px;font-weight:700;margin:0;letter-spacing:-.01em}
.fp-sub{margin:6px 0 0;color:var(--muted-700);font-size:16px}
.fp-h2{font-size:18px;line-height:26px;font-weight:600;margin:0}
.fp-card{background:var(--surface-0);border:1px solid var(--line-200);border-radius:var(--r-3);padding:16px;display:flex;flex-direction:column;gap:10px}
.fp-card--next{border:2px solid var(--teal-600);background:var(--teal-tint)}
.fp-card--danger{border-color:var(--danger-fg);background:var(--danger-bg)}
.fp-card--ok{border-color:var(--teal-600)}
.fp-muted{color:var(--muted-700)}
.fp-p{margin:0}
.fp-btn{display:flex;align-items:center;justify-content:center;gap:8px;min-height:52px;width:100%;padding:0 20px;border-radius:var(--r-3);border:1.5px solid transparent;font:600 17px var(--font);text-decoration:none;cursor:pointer;text-align:center}
.fp-btn--p{background:var(--teal-600);color:#fff}.fp-btn--p:hover{background:var(--teal-700);color:#fff}
.fp-btn--o{background:#fff;color:var(--ink-900);border-color:var(--control-500)}.fp-btn--o:hover{background:var(--sand-50)}
.fp-btn[aria-disabled=true]{opacity:.55;cursor:not-allowed}
.fp-link{background:none;border:0;padding:0;min-height:44px;font:600 16px var(--font);color:var(--teal-700);text-decoration:underline;cursor:pointer}
.fp-chip{display:inline-flex;align-items:center;gap:6px;border-radius:var(--r-pill);padding:4px 12px;font-size:14px;line-height:20px;font-weight:600;white-space:nowrap;flex:none}
.fp-chip svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.fp-chip--ok{background:var(--success-bg);color:var(--success-fg)}.fp-chip--todo,.fp-chip--warn{background:var(--warning-bg);color:var(--warning-fg)}
.fp-chip--wait,.fp-chip--info{background:var(--info-bg);color:var(--info-fg)}.fp-chip--neutral,.fp-chip--later{background:var(--neutral-bg);color:var(--neutral-fg)}
.fp-chip--danger{background:var(--danger-bg);color:var(--danger-fg)}
.fp-card--danger .fp-chip{background:#fff;border:1px solid currentColor}
.fp-bar{height:10px;border-radius:5px;background:var(--sand-100);overflow:hidden}.fp-bar i{display:block;height:100%;background:var(--teal-600)}
.fp-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.fp-task{display:flex;align-items:center;gap:12px;min-height:64px;padding:10px 14px;background:var(--surface-0);border:1px solid var(--line-200);border-radius:var(--r-3);text-decoration:none;color:var(--ink-900)}
.fp-task:hover{border-color:var(--teal-600)}
.fp-task--later{background:var(--sand-50)}
.fp-task__mark{flex:none;width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;background:var(--neutral-bg);color:var(--neutral-fg)}
.fp-task__mark svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.fp-task--done .fp-task__mark{background:var(--teal-600);color:#fff}
.fp-task--todo .fp-task__mark{background:var(--warning-bg);color:var(--warning-fg)}
.fp-task__t{flex:1;min-width:0;display:flex;flex-direction:column}.fp-task__t b{font-weight:600}.fp-task__t span{font-size:15px;line-height:21px;color:var(--muted-700)}
.fp-lab{display:block;font-size:16px;font-weight:600;margin:0 0 6px}
.fp-in{width:100%;min-height:48px;border:1px solid var(--control-500);border-radius:var(--r-2);padding:10px 12px;font:inherit;font-size:16px;background:#fff;color:var(--ink-900)}
.fp-in[aria-invalid=true]{border-color:var(--danger-fg);background:var(--danger-bg)}
.fp-field{display:flex;flex-direction:column}
.fp-hint{font-size:15px;line-height:21px;color:var(--muted-700);margin:6px 0 0}
.fp-opts{display:flex;flex-direction:column;gap:8px;border:0;margin:0;padding:0}.fp-opts legend{font-size:16px;font-weight:600;padding:0;margin-bottom:6px}
.fp-opt{display:flex;align-items:center;gap:12px;min-height:52px;padding:8px 14px;border:1.5px solid var(--control-500);border-radius:var(--r-2);background:#fff;font-size:16px;cursor:pointer}
.fp-opt input{width:22px;height:22px;margin:0;accent-color:var(--teal-600);flex:none}
.fp-opt.on{border-color:var(--teal-600);background:var(--teal-tint);font-weight:600}
.fp-opts--row{flex-direction:row}.fp-opts--row .fp-opt{flex:1;justify-content:center}
.fp-err{color:var(--danger-fg);background:var(--danger-bg);border-radius:var(--r-2);padding:10px 12px;font-weight:600;font-size:16px}
.fp-note{background:var(--sand-100);border-radius:var(--r-2);padding:10px 12px;font-size:15px;line-height:21px;color:var(--neutral-fg)}
.fp-seg{display:flex;border:1px solid var(--control-500);border-radius:var(--r-2);overflow:hidden;background:#fff}
.fp-seg button{flex:1;min-height:44px;border:0;background:#fff;font:600 16px var(--font);color:var(--ink-900);cursor:pointer}
.fp-seg button[aria-pressed=true]{background:var(--teal-tint);color:var(--teal-700);box-shadow:inset 0 -3px 0 var(--teal-600)}
.fp-sig{display:flex;flex-direction:column;gap:10px}
.fp-pad{position:relative;height:150px;border:1.5px dashed var(--control-500);border-radius:var(--r-3);background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center}
.fp-pad canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair}
.fp-pad__ph{position:relative;pointer-events:none;color:var(--muted-700);font-size:16px}
.fp-sig__row{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:15px;color:var(--muted-700)}
.fp-text{white-space:pre-line;font-size:16px;line-height:24px}
.fp-det summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-weight:600;color:var(--teal-700)}
.fp-kv{display:flex;flex-direction:column;gap:2px}.fp-kv dt{font-size:15px;font-weight:600;color:var(--muted-700);margin:0}.fp-kv dd{margin:0 0 8px}
.fp-steps{list-style:none;display:flex;gap:6px;padding:0;margin:0}.fp-steps li{flex:1;display:flex;flex-direction:column;gap:6px;font-size:14px;line-height:18px;color:var(--muted-700)}
.fp-steps li i{display:block;height:8px;border-radius:4px;background:var(--sand-100)}.fp-steps li.on i,.fp-steps li.cur i{background:var(--teal-600)}.fp-steps li.cur{color:var(--ink-900);font-weight:700}
.fp-ft{padding:16px;border-top:1px solid var(--line-200);background:var(--paper-50);font-size:14px;line-height:20px;color:var(--muted-700);display:flex;flex-direction:column;gap:2px;align-items:flex-start}
.fp-ft .fp-link{font-size:15px}
.fp-pres{display:inline-flex;margin-top:8px}
html:not([data-maturity="all"]) .fp-pres{display:none}
.fp .ui-chip{font-size:14px;line-height:20px;padding:3px 10px}
.fp-mini{display:grid;grid-template-columns:56px 1fr 44px;align-items:center;gap:10px;font-size:15px}
.fp-mini .fp-bar{height:8px}
.fp-slot{min-height:48px;padding:0 16px;border-radius:var(--r-2);border:1.5px solid var(--control-500);background:#fff;font:600 16px var(--font);color:var(--ink-900);cursor:pointer}
.fp-slot[aria-pressed=true]{background:var(--teal-600);border-color:var(--teal-600);color:#fff}
.fp-slots{display:flex;flex-wrap:wrap;gap:8px}
@media (min-width:700px){#stage.phone #root .fp{min-height:640px}}
`;

export const chip = (kind, text, icon) => `<span class="fp-chip fp-chip--${kind}">${icon ? ui.icon(icon, 14) : ''}${esc(text)}</span>`;
const UI = {
  en: { brand: 'Harvest Outreach Center', checklist: 'Checklist', secure: 'Secure · only Harvest Outreach Center sees this', call: 'Call us instead', demo: 'Demo data · nothing is real', lang: 'Language' },
  es: { brand: 'Harvest Outreach Center', checklist: 'Lista de pendientes', secure: 'Seguro · solo Harvest Outreach Center lo ve', call: 'Prefiero llamar', demo: 'Datos de demostración · nada es real', lang: 'Idioma' }
};
export const portalText = lang => UI[lang];
export const langToggle = lang => `<div class="fp-lang" role="group" aria-label="${UI[lang].lang}"><button type="button" lang="en" data-lang="en" aria-pressed="${lang === 'en'}">English</button><button type="button" lang="es" data-lang="es" aria-pressed="${lang === 'es'}">Español</button></div>`;
// A presenter-only maturity chip (shown only when the presenter's Maturity overlay is on; guardians never see "Future")
export const presChip = id => `<span class="fp-pres">${ui.maturity(id)}</span>`;

// Base class of every family screen. A screen supplies `page()` (returns { title, sub, body, back?, pres?, foot? }) and `act()` (its anchors).
// Who may see a family page: a guardian session made from the family-link token (the link is the identity), or the presenter's deliberate view of
// a child (the presenter dock is open, or a staff member is signed in in this browser). A bare #/ParentX?c=<child> with neither is NOT a page:
// it gets the neutral "link not valid" screen and never renders a child's data from a client id. A token in the address must match the session.
export function portalAccess(params) {
  const a = api.session && api.session();
  if (!a || a.kind !== 'guardian') return { ok: false, why: 'no guardian session' };
  // the token in the address must be one of THIS guardian's links (the projected state holds only their own)
  if (params && params.t && !((api.state && api.state.family_links) || []).some(f => f.token === params.t)) return { ok: false, why: 'link belongs to another family or is not valid' };
  if (!a.presenter) return { ok: true, why: 'link session' };   // a session made from a family-link token
  let staff = false; try { staff = !!localStorage.getItem('psyflo_user'); } catch { }
  const dock = (window.psyflo && window.psyflo.dock) || {};
  const deliberate = !!(params && params.t) || staff || (dock.state && dock.state !== 'hidden') || dock.mode === 'explore';
  return { ok: deliberate, why: deliberate ? 'presenter view' : 'presenter session without the presenter dock' };
}
const NOLINK = {
  en: { title: 'This link is not valid', body: 'Open the link Harvest texted you. If you cannot find it, call Harvest and they will send it again.', call: 'Call Harvest' },
  es: { title: 'Este enlace no es válido', body: 'Abra el enlace que Harvest le envió por mensaje. Si no lo encuentra, llame a Harvest y se lo enviarán otra vez.', call: 'Llame a Harvest' }
};

// Base class of every family screen. A screen supplies `page()` (returns { title, sub, body, back?, pres?, foot? }) and `act()` (its anchors).
export class PortalScreen extends Screen {
  get css() { return FP_CSS; }
  async init() {
    // the presenter's ?c=<child> view: switch the demo guardian session to that child (the server allows it only for a presenter session)
    const a = api.session && api.session(); const want = this.params && this.params.c;
    if (want && !this.params.t && a && a.kind === 'guardian' && a.client !== want && a.presenter && portalAccess(this.params).ok) { try { await api.signInAs({ portalClient: want }, { presenter: true, quiet: true }); } catch { } }
    if (portalAccess(this.params).ok && this.setup) await this.setup();
  }
  invalid() {
    const lang = getLang(null); const t = NOLINK[lang]; const u = UI[lang]; const org = (this.s && this.s.org) || {};
    return raw(`<div class="fp" lang="${lang}"><header class="fp-hd"><div class="fp-brand">${u.brand}</div>${langToggle(lang)}</header>
      <main class="fp-main" data-link-invalid><div><h1 class="fp-h1">${t.title}</h1><p class="fp-sub">${t.body}</p></div>
      ${org.phone ? `<section class="fp-card"><h2 class="fp-h2">${t.call}</h2><p class="fp-p"><b>${esc(org.phone)}</b> (${lang === 'es' ? 'número de demostración' : 'demo number'})</p></section>` : ''}</main>
      <footer class="fp-ft"><span>${u.demo}</span></footer></div>`);
  }
  ctx() { return famCtx(this.s, this.params); }
  lang() { return getLang(this.ctx().client); }
  frame({ title, sub = '', body = '', back = true, pres = '', lang, foot = '' }) {
    const ctx = this.ctx(); lang = lang || getLang(ctx.client); const u = UI[lang];
    return raw(`<div class="fp" lang="${lang}">
      <header class="fp-hd"><div class="fp-brand">${u.brand}</div>${langToggle(lang)}</header>
      <main class="fp-main">
        ${back ? `<a class="fp-back" href="${esc(phref(this.params, 'ParentPortal'))}">${ui.icon('chevR', 16, ' style="transform:rotate(180deg)"')}${u.checklist}</a>` : ''}
        <div><h1 class="fp-h1">${title}</h1>${sub ? `<p class="fp-sub">${sub}</p>` : ''}${pres}</div>
        ${body}
      </main>
      <footer class="fp-ft"><span>${u.secure}</span>${foot}<button type="button" class="fp-link" data-call>${u.call}</button><span>${u.demo}</span></footer>
    </div>`);
  }
  renderVals() { if (!portalAccess(this.params).ok) return { page: this.invalid() }; return { page: this.frame(this.page()) }; }
  after(root) {
    root.querySelectorAll('[data-lang]').forEach(b => { b.onclick = () => { setLang(b.dataset.lang); this.repaint(); }; });
    if (!portalAccess(this.params).ok) return;
    root.querySelectorAll('[data-call]').forEach(b => { b.onclick = () => { const c = this.ctx(); callSheet(this.s, c, getLang(c.client)); }; });
    if (!root._fpKey) { root._fpKey = true; root.addEventListener('keydown', e => { if (e.key === ' ' && e.target.matches && e.target.matches('a[role=button]')) { e.preventDefault(); e.target.click(); } }); }
    if (this.afterPaint) this.afterPaint(root);
  }
  get anchors() { return { en: () => { setLang('en'); this.repaint(); }, es: () => { setLang('es'); this.repaint(); }, back: () => pgo(this.params, 'ParentPortal'), call: () => { const c = this.ctx(); callSheet(this.s, c, getLang(c.client)); }, ...(this.act ? this.act() : {}) }; }
}
export const btn = (kind, href, label, extra = '') => `<a class="fp-btn fp-btn--${kind}" role="button" href="${esc(href)}"${extra}>${label}</a>`;

// ---------- the screen: the checklist ----------
const T = {
  en: {
    hi: g => g ? `Hi ${g}` : 'Hi there', sub: c => `${c}'s checklist`, of: (a, b) => `${a} of ${b} done`, allDone: 'Everything is done for now', allDoneSub: 'Harvest will tell you here when something new needs you.',
    next: 'Next step', all: 'All steps', chips: { done: 'Done', todo: 'To do', waiting: 'Waiting', later: 'Not yet', view: 'Open' },
    items: {
      contact: 'Confirm contact details', insurance: 'Provide insurance information', paperwork: 'Complete required paperwork', sign: 'Review and sign', appointment: 'Schedule or confirm an appointment',
      progress: 'Review progress updates', checkin: 'Complete the check-in', letters: 'View insurance letters'
    },
    d: {
      contactTodo: 'Your name, phone and language', contactDone: d => `Sent ${d}`, insTodo: 'Your child\'s insurance and Medicaid ID', insDone: d => `Sent ${d}`, linkLater: 'Harvest will send you a link',
      paper: (a, b) => `${a} of ${b} papers done`, paperDone: 'All papers done',
      signTodo: n => `${n} to sign`, signInPerson: 'To be signed in person', signPending: 'Harvest is confirming how to sign', signDone: 'All signed', signNone: 'Nothing to sign yet',
      apptLater: 'Harvest will let you know when it is time', apptOffer: 'Pick a time', apptConfirm: 'Please confirm tomorrow\'s visit', apptWhen: (d, t) => `${d} · ${t}`,
      progLater: c => `Shows here once ${c} starts at school with Harvest`, progView: c => `See how ${c} is doing`,
      checkTodo: 'Three questions', checkDone: d => `Last sent ${d}`,
      letNone: 'Nothing from the insurance company yet', letView: 'Updates from the insurance company', letAppeal: 'Appeal letter ready to read and sign'
    },
    nextBtn: { contact: 'Confirm contact details', insurance: 'Add insurance information', paperwork: 'Open the papers', sign: 'Review and sign', appointment: 'See open times', checkin: 'Start the check-in', letters: 'Read the appeal letter' }
  },
  es: {
    hi: g => g ? `Hola ${g}` : 'Hola', sub: c => `Lista de ${c}`, of: (a, b) => `${a} de ${b} listos`, allDone: 'Todo está listo por ahora', allDoneSub: 'Harvest le avisará aquí cuando algo nuevo le necesite.',
    next: 'Siguiente paso', all: 'Todos los pasos', chips: { done: 'Listo', todo: 'Por hacer', waiting: 'En espera', later: 'Aún no', view: 'Abrir' },
    items: {
      contact: 'Confirme sus datos de contacto', insurance: 'Dé la información del seguro', paperwork: 'Complete los papeles necesarios', sign: 'Lea y firme', appointment: 'Reserve o confirme una cita',
      progress: 'Vea las noticias del progreso', checkin: 'Complete el chequeo', letters: 'Vea las cartas del seguro'
    },
    d: {
      contactTodo: 'Su nombre, teléfono e idioma', contactDone: d => `Enviado ${d}`, insTodo: 'El seguro de su hijo y el número de Medicaid', insDone: d => `Enviado ${d}`, linkLater: 'Harvest le enviará un enlace',
      paper: (a, b) => `${a} de ${b} papeles listos`, paperDone: 'Todos los papeles listos',
      signTodo: n => `${n} para firmar`, signInPerson: 'Se firma en persona', signPending: 'Harvest está confirmando cómo se firma', signDone: 'Todo firmado', signNone: 'Nada para firmar todavía',
      apptLater: 'Harvest le avisará cuando sea hora', apptOffer: 'Elija una hora', apptConfirm: 'Confirme la visita de mañana', apptWhen: (d, t) => `${d} · ${t}`,
      progLater: c => `Aparece aquí cuando ${c} empiece con Harvest en la escuela`, progView: c => `Vea cómo le va a ${c}`,
      checkTodo: 'Tres preguntas', checkDone: d => `Último enviado ${d}`,
      letNone: 'Todavía no hay nada del seguro', letView: 'Noticias del seguro', letAppeal: 'Carta de apelación lista para leer y firmar'
    },
    nextBtn: { contact: 'Confirmar mis datos', insurance: 'Agregar el seguro', paperwork: 'Abrir los papeles', sign: 'Leer y firmar', appointment: 'Ver horas libres', checkin: 'Empezar el chequeo', letters: 'Leer la carta de apelación' }
  }
};

export function homeModel(s, ctx, lang) {
  const t = T[lang]; const cl = P.checklist(s, ctx); const c = ctx.client; const child = ctx.child;
  const rows = cl.items.map(it => {
    let detail = '';
    switch (it.key) {
      case 'contact': detail = it.state === 'done' ? t.d.contactDone(fdate(it.at, lang)) : it.state === 'later' ? t.d.linkLater : t.d.contactTodo; break;
      case 'insurance': detail = it.state === 'done' ? t.d.insDone(fdate(it.at, lang)) : it.state === 'later' ? t.d.linkLater : t.d.insTodo; break;
      case 'paperwork': detail = it.state === 'done' ? t.d.paperDone : t.d.paper(it.done, it.total); break;
      case 'sign': detail = it.state === 'done' ? t.d.signDone : it.state === 'later' ? t.d.signNone : it.todo.length ? t.d.signTodo(it.todo.length) : it.waiting.some(f => f.state === 'in_person') ? t.d.signInPerson : t.d.signPending; break;
      case 'appointment': detail = it.state === 'later' ? t.d.apptLater : it.booking && it.booking.offered ? t.d.apptOffer : it.confirmNeeded ? t.d.apptConfirm : it.booking && it.booking.when ? t.d.apptWhen(dayLabel(it.booking.when.slice(0, 10), lang), M.fmtTime(it.booking.when)) : ''; break;
      case 'progress': detail = it.state === 'view' ? t.d.progView(child) : t.d.progLater(child); break;
      case 'checkin': detail = it.state === 'done' ? t.d.checkDone(fdate(it.last, lang)) : t.d.checkTodo; break;
      case 'letters': detail = it.state === 'todo' ? t.d.letAppeal : it.state === 'view' ? t.d.letView : t.d.letNone; break;
    }
    const extra = it.key === 'sign' && it.first ? { form: it.first } : it.key === 'letters' && it.appealId && it.state === 'todo' ? { id: it.appealId } : undefined;
    return { ...it, title: t.items[it.key], detail, extra };
  });
  return { t, cl, rows, child };
}

register('ParentPortal', class extends PortalScreen {
  page() {
    const s = this.s; const ctx = this.ctx(); const lang = getLang(ctx.client); const m = homeModel(s, ctx, lang); const t = m.t; const cl = m.cl;
    const link = r => phref(this.params, r.route, r.extra);
    const mark = (r, i) => r.state === 'done' ? ui.icon('check', 18) : String(i + 1);
    const row = (r, i) => `<li><a class="fp-task fp-task--${r.state}" href="${esc(link(r))}"><span class="fp-task__mark" aria-hidden="true">${mark(r, i)}</span><span class="fp-task__t"><b>${esc(r.title)}</b><span>${esc(r.detail)}</span></span>${chip(r.state === 'done' ? 'ok' : r.state === 'todo' ? 'todo' : r.state === 'waiting' ? 'wait' : r.state === 'view' ? 'info' : 'later', t.chips[r.state])}</a></li>`;
    const next = cl.next;
    const nextCard = next ? `<section class="fp-card fp-card--next" aria-labelledby="fp-next"><h2 class="fp-h2" id="fp-next">${t.next}</h2><p class="fp-p"><b>${esc(m.rows.find(r => r.key === next.key).title)}</b><br><span class="fp-muted">${esc(m.rows.find(r => r.key === next.key).detail)}</span></p>${btn('p', link(m.rows.find(r => r.key === next.key)), esc(t.nextBtn[next.key] || t.items[next.key]))}</section>`
      : `<section class="fp-card fp-card--ok" aria-labelledby="fp-next"><h2 class="fp-h2" id="fp-next">${t.allDone}</h2><p class="fp-p fp-muted">${t.allDoneSub}</p></section>`;
    const body = `<section class="fp-card" aria-labelledby="fp-prog"><h2 class="fp-h2" id="fp-prog">${t.of(cl.done, cl.total)}</h2>
        <div class="fp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${cl.total}" aria-valuenow="${cl.done}" aria-label="${esc(t.of(cl.done, cl.total))}"><i style="width:${cl.total ? Math.round(100 * cl.done / cl.total) : 0}%"></i></div></section>
      ${nextCard}
      <section aria-labelledby="fp-all"><h2 class="fp-h2" id="fp-all" style="margin-bottom:8px">${t.all}</h2><ol class="fp-list">${m.rows.map(row).join('')}</ol></section>`;
    return { title: esc(t.hi(ctx.guardianFirst)), sub: esc(t.sub(ctx.child)), body, back: false, lang };
  }
});
