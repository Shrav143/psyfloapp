// 48 · Quarterly report · guardian signs (phone). Live: the quarterly report (32) asks for the guardian's signature
// through the parent portal (portalTask.create 'Quarterly report'); this is what the guardian sees: the quarter in
// plain words from client.quarter, the full report on request, a finger signature → consent.sign (form
// 'Quarterly report', with the plain summary in the PDF) → the portal task closes and the portal shows it signed.
// ?c picks the child; default is the child with a waiting quarterly task, else M.R. (the canvas quarterly).
import { register, Screen, M, toast } from '../app.js';
import { famCtx, getLang, setLang, fdate, pgo, callSheet, childName, guardianLabel, SigPad, guardHeader, guardFooter } from './ParentPortal.js';
import { C_CSS } from './MobileApp.js';

const T = {
  en: { title: c => `Quarterly report · ${c}`, subNone: 'Nothing to sign',
    goals: 'Goals',
    summary: (c, days, goal, o1, o2, r1, r2, calls) => `${c} came to the program on ${days} school days this quarter. The most progress was on "${goal}". Trips to the office went from ${o1} to ${o2} a month, and ${c}'s daily rating went from ${r1} to ${r2} out of 4.${calls ? ` You joined ${calls} weekly calls. Thank you.` : ''}`,
    fDays: 'School days', fRating: 'Daily rating', fOffice: 'Office trips a month', fCalls: 'Weekly calls',
    readFull: 'Read the full report', less: 'Show less', signHere: 'Sign with your finger', clear: 'Clear', sign: 'Sign',
    copy: 'Your copy (PDF)', doneTitle: 'Report signed', doneSub: (d, who) => `Signed ${d} by ${who}`, none: c => `No report to sign for ${c}`,
    empty: 'Sign in the box first', thanks: 'Quarterly report signed · a copy is saved' },
  es: { title: c => `Informe trimestral · ${c}`, subNone: 'Nada para firmar',
    goals: 'Metas',
    summary: (c, days, goal, o1, o2, r1, r2, calls) => `${c} vino al programa ${days} días escolares este trimestre. El mayor progreso fue en "${goal}". Las visitas a la oficina bajaron de ${o1} a ${o2} al mes, y la calificación diaria de ${c} pasó de ${r1} a ${r2} de 4.${calls ? ` Usted participó en ${calls} llamadas semanales. Gracias.` : ''}`,
    fDays: 'Días escolares', fRating: 'Calificación diaria', fOffice: 'Visitas a la oficina al mes', fCalls: 'Llamadas semanales',
    readFull: 'Leer el informe completo', less: 'Mostrar menos', signHere: 'Firme con el dedo', clear: 'Borrar', sign: 'Firmar',
    copy: 'Su copia (PDF)', doneTitle: 'Informe firmado', doneSub: (d, who) => `Firmado el ${d} por ${who}`, none: c => `No hay informe para firmar de ${c}`,
    empty: 'Firme primero en el recuadro', thanks: 'Informe trimestral firmado · se guardó una copia' }
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
    const base = { t: { goals: t.goals, readFull: t.readFull, less: t.less, signHere: t.signHere, clear: t.clear, sign: t.sign, copy: t.copy },
      hd: guardHeader(t.title(child), lang), ft: guardFooter(lang), signer, full: this.state.full };
    if (!q) return { ...base, summary: t.none(child), facts: [], goals: [], fullText: '', done: { title: t.subNone, sub: '', file: '' } };

    const gi = (q.goal_progress_days || []).reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);
    const of = q.office_referrals_per_month || []; const dr = q.daily_rating || [];
    const goals = (c.goals || []).map((g, i) => ({ name: cap(g.name), pct: q.days ? Math.round(100 * (q.goal_progress_days?.[i] || 0) / q.days) : 0 }));
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
      summary: t.summary(child, q.days, (c.goals?.[gi]?.name) || '', of[0] ?? '–', of.at(-1) ?? '–', dr[0]?.toFixed(1) ?? '–', dr.at(-1)?.toFixed(1) ?? '–', q.guardian_calls),
      facts, goals, fullText,
      done: signedRec ? { title: t.doneTitle, sub: t.doneSub(fdate(signedRec.signed_at, lang), signedRec.signer), file: signedRec.file || '' } : null
    };
  }
  get css() { return C_CSS; }
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
      full: () => this.setState({ full: !this.state.full }),
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
