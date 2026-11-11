// 48 · Quarterly report · guardian signs (phone). Live: the quarterly report (32) asks for the guardian's signature
// through the parent portal (portalTask.create 'Quarterly report'); this is what the guardian sees: the quarter in
// plain words from client.quarter, the full report on request, a finger signature → consent.sign (form
// 'Quarterly report', with the plain summary in the PDF) → the portal task closes and the portal shows it signed.
// ?c picks the child; default is the child with a waiting quarterly task, else M.R. (the canvas quarterly).
import { register, Screen, M, toast } from '../app.js';
import { famCtx, getLang, setLang, fdate, pgo, callSheet, childName, guardianLabel, SigPad, LANG_ON, LANG_OFF } from './ParentPortal.js';

const T = {
  en: { title: c => `Quarterly report · ${c}`, sub: (a, b, who) => `${a} – ${b} · from ${who}`, subNone: 'Nothing to sign right now',
    what: 'What this says', numbers: 'The quarter in numbers', goals: 'Goals', next: "What's next",
    summary: (c, days, goal, o1, o2, r1, r2, calls) => `${c} came to the program on ${days} school days this quarter. The most progress was on "${goal}". Trips to the office went from ${o1} to ${o2} a month, and ${c}'s daily rating went from ${r1} to ${r2} out of 4.${calls ? ` You joined ${calls} weekly calls. Thank you.` : ''}`,
    fDays: 'School days in the program', fRating: 'Daily rating (out of 4)', fOffice: 'Trips to the office a month', fCalls: 'Your weekly calls',
    goalDays: (a, b) => `Met on ${a} of ${b} school days`,
    nextCont: (p, end) => `Harvest is asking ${p} to keep services going after ${end}. Your signature goes with that request. It shows you have read this report, not that you agree with every word; call us if something is wrong.`,
    nextPlain: 'Harvest keeps working on the same goals and checks in with you every week. Your signature shows you have read this report; call us if something is wrong.',
    readFull: 'Read the full report', less: 'Show less', signHere: 'Sign with your finger', signerIs: 'Signing as', clear: 'Clear', sign: 'Sign the report',
    meaning: 'Signing means you have read it. A copy is saved for you.', copy: 'your copy (PDF)',
    doneTitle: 'Report signed', doneSub: (d, who) => `Signed ${d} by ${who}`, none: c => `No quarterly report is waiting for you. Harvest will send ${c}'s next one here.`,
    empty: 'Sign in the box first', thanks: 'Quarterly report signed · a copy is saved', back: 'Back to the family page', call: 'Call us' },
  es: { title: c => `Informe trimestral · ${c}`, sub: (a, b, who) => `${a} – ${b} · de ${who}`, subNone: 'Nada para firmar ahora',
    what: 'Lo que dice esto', numbers: 'El trimestre en números', goals: 'Metas', next: 'Lo que sigue',
    summary: (c, days, goal, o1, o2, r1, r2, calls) => `${c} vino al programa ${days} días escolares este trimestre. El mayor progreso fue en "${goal}". Las visitas a la oficina bajaron de ${o1} a ${o2} al mes, y la calificación diaria de ${c} pasó de ${r1} a ${r2} de 4.${calls ? ` Usted participó en ${calls} llamadas semanales. Gracias.` : ''}`,
    fDays: 'Días escolares en el programa', fRating: 'Calificación diaria (de 4)', fOffice: 'Visitas a la oficina al mes', fCalls: 'Sus llamadas semanales',
    goalDays: (a, b) => `Lo logró ${a} de ${b} días escolares`,
    nextCont: (p, end) => `Harvest le pide a ${p} que continúen los servicios después del ${end}. Su firma va con esa solicitud. Muestra que leyó este informe, no que está de acuerdo con cada palabra; llámenos si algo está mal.`,
    nextPlain: 'Harvest sigue trabajando en las mismas metas y habla con usted cada semana. Su firma muestra que leyó este informe; llámenos si algo está mal.',
    readFull: 'Leer el informe completo', less: 'Mostrar menos', signHere: 'Firme con el dedo', signerIs: 'Firma', clear: 'Borrar', sign: 'Firmar el informe',
    meaning: 'Firmar significa que lo leyó. Se guarda una copia para usted.', copy: 'su copia (PDF)',
    doneTitle: 'Informe firmado', doneSub: (d, who) => `Firmado el ${d} por ${who}`, none: c => `No hay ningún informe trimestral esperándole. Harvest le enviará el próximo de ${c} aquí.`,
    empty: 'Firme primero en el recuadro', thanks: 'Informe trimestral firmado · se guardó una copia', back: 'Volver a la página de la familia', call: 'Llámenos' }
};
const cap = x => x ? x.charAt(0).toUpperCase() + x.slice(1) : x;
const FORM = 'Quarterly report';

register('ParentQuarterly', class extends Screen {
  init() { this.pad = new SigPad(); this.state = { full: false }; }
  params2() {
    if (this.params.t || this.params.c) return this.params;
    const task = (this.s.portal_tasks || []).find(x => x.status !== 'signed' && /^Quarterly report/.test(x.form) && M.byId(this.s.clients, x.client)?.quarter);
    return { ...this.params, c: task ? task.client : 'MR' };
  }
  ctx() { return famCtx(this.s, this.params2()); }
  renderVals() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const q = c.quarter; const a = c.authorization || {};
    const who = M.staff(s, c.clinician || 'jperez').name || 'Harvest';
    const signedRec = s.consents.find(x => x.client === c.id && x.form === FORM && x.status === 'signed');
    const signer = guardianLabel(ctx, lang);
    const base = { t: { ...Object.fromEntries(Object.entries(t).filter(([, v]) => typeof v === 'string')), title: t.title(child) },
      enStyle: lang === 'en' ? LANG_ON : LANG_OFF, esStyle: lang === 'es' ? LANG_ON : LANG_OFF, signer, full: this.state.full, toggleFull: () => this.setState({ full: !this.state.full }) };
    if (!q) return { ...base, t: { ...base.t, sub: t.subNone }, summary: t.none(child), facts: [], goals: [], nextText: t.nextPlain, fullText: '', done: { title: t.subNone, sub: '', file: '' } };

    const gi = (q.goal_progress_days || []).reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);
    const of = q.office_referrals_per_month || []; const dr = q.daily_rating || [];
    const goals = (c.goals || []).map((g, i) => ({ name: cap(g.name), pct: q.days ? Math.round(100 * (q.goal_progress_days?.[i] || 0) / q.days) : 0, text: t.goalDays(q.goal_progress_days?.[i] ?? 0, q.days) }));
    const cont = s.requests.find(r => r.client === c.id && r.type === 'continued_stay' && !['active', 'closed'].includes(r.stage));
    const p = cont ? M.payerShort(s, cont.payer).split(' ')[0] : '';
    const facts = [
      { k: t.fDays, v: q.days },
      dr.length ? { k: t.fRating, v: `${dr[0].toFixed(1)} → ${dr.at(-1).toFixed(1)}` } : null,
      of.length ? { k: t.fOffice, v: `${of[0]} → ${of.at(-1)}` } : null,
      q.guardian_calls ? { k: t.fCalls, v: q.guardian_calls } : null
    ].filter(Boolean);
    const fullText = [
      `Harvest Outreach Center · Quarterly Progress Report · Therapeutic Day Treatment`,
      `Child: ${c.initials}${c.age ? ', age ' + c.age : ''} · Period: ${M.fmtDate(a.start, { year: true })} – ${M.fmtDate(a.end, { year: true })} · Clinician: ${who}`,
      ...(c.goals || []).map((g, i) => `Goal ${i + 1}: ${g.objective || cap(g.name)} Met on ${q.goal_progress_days?.[i] ?? 0} of ${q.days} school days.`),
      dr.length ? `Daily rating (staff, 1–4, monthly average): ${dr.map(x => x.toFixed(1)).join(' → ')}.` : '',
      of.length ? `Office referrals per month (school counselor): ${of.join(' → ')}.` : '',
      q.guardian_calls ? `Guardian participation: ${q.guardian_calls} weekly calls.` : '',
      `Recommendation: continue therapeutic day treatment at the current frequency; review goals with the guardian at the next quarterly.`,
      `Guardian signature: I have read this report with Harvest staff.`
    ].filter(Boolean).join('\n\n');
    return {
      ...base,
      t: { ...base.t, sub: t.sub(fdate(a.start, lang), fdate(a.end, lang), who) },
      summary: t.summary(child, q.days, (c.goals?.[gi]?.name) || '', of[0] ?? '–', of.at(-1) ?? '–', dr[0]?.toFixed(1) ?? '–', dr.at(-1)?.toFixed(1) ?? '–', q.guardian_calls),
      facts, goals, nextText: cont ? t.nextCont(p, fdate(a.end || cont.renew_by, lang)) : t.nextPlain, fullText,
      done: signedRec ? { title: t.doneTitle, sub: t.doneSub(fdate(signedRec.signed_at, lang), signedRec.signer), file: signedRec.file || '' } : null
    };
  }
  after(root) {
    const ph = root.querySelector('#sigph');
    this.pad.attach(root.querySelector('#sig'), () => { if (ph) ph.style.display = this.pad.empty ? '' : 'none'; });
    if (ph) ph.style.display = this.pad.empty ? '' : 'none';
  }
  get anchors() {
    const ctx = () => this.ctx();
    return {
      en: () => { setLang('en'); this.setState({}); },
      es: () => { setLang('es'); this.setState({}); },
      clear: () => { this.pad.clear(); this.setState({}); },
      back: () => pgo(this.params, 'ParentPortal'),
      call: () => callSheet(this.s, ctx(), getLang(ctx().client)),
      sign: async () => {
        const x = ctx(); const lang = getLang(x.client);
        if (this.pad.empty) return toast(T[lang].empty, 'err');
        const q = x.client.quarter; const of = q.office_referrals_per_month || []; const dr = q.daily_rating || [];
        const gi = (q.goal_progress_days || []).reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);
        const summary = 'Quarterly progress report, read and signed by the guardian on the parent portal. ' + T.en.summary(childName(x.client), q.days, x.client.goals?.[gi]?.name || '', of[0] ?? '–', of.at(-1) ?? '–', dr[0]?.toFixed(1) ?? '–', dr.at(-1)?.toFixed(1) ?? '–', null) + (q.guardian_calls ? ` Guardian joined ${q.guardian_calls} weekly calls.` : '');
        await this.do('consent.sign', { client: x.client.id, form: FORM, signer: guardianLabel(x), signature: this.pad.jpeg(), lang, summary });
        this.pad.clear();
        toast(T[lang].thanks);
        this.setState({});
      }
    };
  }
  set anchors(v) { }
});
