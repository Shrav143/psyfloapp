// 48 · Quarterly report · guardian signs (phone). The quarterly report (extension) asks for the guardian's signature through the parent portal
// (portalTask.create 'Quarterly report'); this is what the guardian sees: the quarter in plain words from client.quarter, the full report on request,
// and the signature in the mode the Settings rule signature.mode.quarterly gives (remote · in person · pending · completed · ready to review).
// Signing means the guardian has read it. The staff-only internal quarterly never reaches this screen (it is not in the guardian's projection).
import { register, M, ui, toast, esc } from '../app.js';
import * as P from '../shared/sel/portal.js';
import { PortalScreen, getLang, fdate, phref, chip, btn, presChip, childName, SignBox, DEMO_WORDING, dayLabel } from './ParentPortal.js';

const T = {
  en: { title: 'Quarterly report', sub: (a, b, who) => `${a} – ${b}${who ? ' · from ' + who : ''}`, subNone: 'Nothing to sign right now',
    what: 'What this says', numbers: 'The quarter in numbers', goals: 'Goals', next: "What's next", full: 'Read the full report',
    summary: (c, days, goal, o1, o2, r1, r2, calls) => `${c} came to the program on ${days} school days this quarter. The most progress was on "${goal}". Trips to the office went from ${o1} to ${o2} a month, and ${c}'s daily rating went from ${r1} to ${r2} out of 4.${calls ? ` You joined ${calls} weekly calls. Thank you.` : ''}`,
    fDays: 'School days in the program', fRating: 'Daily rating (out of 4)', fOffice: 'Trips to the office a month', fCalls: 'Your weekly calls', goalDays: (a, b) => `Met on ${a} of ${b} school days`,
    nextCont: p => `Harvest is asking ${p} to keep services going. Your signature goes with that request. It shows you have read this report, not that you agree with every word; call us if something is wrong.`,
    nextPlain: 'Harvest keeps working on the same goals and checks in with you. Your signature shows you have read this report; call us if something is wrong.',
    chips: { remote: 'You can sign here', in_person: 'Sign in person', pending: 'Waiting for Harvest', completed: 'Signed', ready: 'Ready to read' },
    sign: 'Sign the report', meaning: 'Signing means you have read it.', remoteHint: 'If Harvest also needs your signature in person, they will tell you.',
    inPersonTitle: 'Sign in person', inPersonText: 'Harvest needs this report signed in person. You cannot sign it on your phone.', when: 'When', whenNone: 'Harvest will tell you when and where.', whenBooked: (d, t) => `At your visit: ${d} · ${t}`, bring: 'What to bring', bringNone: 'Harvest will tell you what to bring.',
    pendingTitle: 'Harvest is confirming how you sign', pendingText: 'You can read the report now. Harvest will tell you here when it is ready to sign.',
    readyTitle: 'Ready to read', readyText: 'Harvest has not asked you to sign this yet. You can read it now.',
    doneTitle: 'Report signed', doneSub: (d, who) => `Signed ${d}${who ? ' by ' + who : ''}`, copy: 'Your copy (PDF)',
    none: c => `No quarterly report is waiting for you. Harvest will send ${c}'s next one here.`, thanks: 'Quarterly report signed · a copy is saved' },
  es: { title: 'Informe trimestral', sub: (a, b, who) => `${a} – ${b}${who ? ' · de ' + who : ''}`, subNone: 'Nada para firmar ahora',
    what: 'Lo que dice esto', numbers: 'El trimestre en números', goals: 'Metas', next: 'Lo que sigue', full: 'Leer el informe completo',
    summary: (c, days, goal, o1, o2, r1, r2, calls) => `${c} vino al programa ${days} días escolares este trimestre. El mayor progreso fue en "${goal}". Las visitas a la oficina bajaron de ${o1} a ${o2} al mes, y la calificación diaria de ${c} pasó de ${r1} a ${r2} de 4.${calls ? ` Usted participó en ${calls} llamadas semanales. Gracias.` : ''}`,
    fDays: 'Días escolares en el programa', fRating: 'Calificación diaria (de 4)', fOffice: 'Visitas a la oficina al mes', fCalls: 'Sus llamadas semanales', goalDays: (a, b) => `Lo logró ${a} de ${b} días escolares`,
    nextCont: p => `Harvest le pide a ${p} que continúen los servicios. Su firma va con esa solicitud. Muestra que leyó este informe, no que está de acuerdo con cada palabra; llámenos si algo está mal.`,
    nextPlain: 'Harvest sigue trabajando en las mismas metas y habla con usted. Su firma muestra que leyó este informe; llámenos si algo está mal.',
    chips: { remote: 'Puede firmar aquí', in_person: 'Firma en persona', pending: 'Esperando a Harvest', completed: 'Firmado', ready: 'Listo para leer' },
    sign: 'Firmar el informe', meaning: 'Firmar significa que lo leyó.', remoteHint: 'Si Harvest también necesita su firma en persona, se lo dirá.',
    inPersonTitle: 'Firme en persona', inPersonText: 'Harvest necesita este informe firmado en persona. No se puede firmar en el teléfono.', when: 'Cuándo', whenNone: 'Harvest le dirá cuándo y dónde.', whenBooked: (d, t) => `En su visita: ${d} · ${t}`, bring: 'Qué traer', bringNone: 'Harvest le dirá qué traer.',
    pendingTitle: 'Harvest está confirmando cómo se firma', pendingText: 'Puede leer el informe ahora. Harvest le avisará aquí cuando esté listo para firmar.',
    readyTitle: 'Listo para leer', readyText: 'Harvest todavía no le ha pedido que firme esto. Puede leerlo ahora.',
    doneTitle: 'Informe firmado', doneSub: (d, who) => `Firmado el ${d}${who ? ' por ' + who : ''}`, copy: 'Su copia (PDF)',
    none: c => `No hay ningún informe trimestral esperándole. Harvest le enviará el próximo de ${c} aquí.`, thanks: 'Informe trimestral firmado · se guardó una copia' }
};
const cap = x => x ? x.charAt(0).toUpperCase() + x.slice(1) : x;

register('ParentQuarterly', class extends PortalScreen {
  async setup() { this.box = new SignBox('sig'); this.state = { err: '', busy: false }; }
  // the form name as the staff task carries it ("Quarterly report" or "Quarterly report · Q3")
  formName(s, c) { const t = (s.portal_tasks || []).find(x => x.client === c.id && /^Quarterly report/.test(x.form) && x.status !== 'signed'); const done = (s.consents || []).filter(x => x.client === c.id && /^Quarterly report/.test(x.form) && x.status === 'signed').at(-1); return (t && t.form) || (done && done.form) || 'Quarterly report'; }
  page() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const q = c.quarter; const a = c.authorization || {};
    const who = c.clinician ? (M.staff(s, c.clinician).name || '') : '';
    const form = this.formName(s, c); const st = P.sigState(s, c.id, form);
    if (!q) return { title: t.title, sub: esc(t.subNone), body: `<section class="fp-card"><p class="fp-p">${esc(t.none(child))}</p></section>`, pres: presChip('route.ParentQuarterly'), lang };
    const gi = (q.goal_progress_days || []).reduce((bi, v, i, arr) => v > arr[bi] ? i : bi, 0);
    const of = q.office_referrals_per_month || []; const dr = q.daily_rating || [];
    const goals = (c.goals || []).map((g, i) => ({ name: cap(g.name), pct: q.days ? Math.round(100 * (q.goal_progress_days && q.goal_progress_days[i] || 0) / q.days) : 0, text: t.goalDays(q.goal_progress_days && q.goal_progress_days[i] != null ? q.goal_progress_days[i] : 0, q.days) }));
    const cont = (s.requests || []).find(r => r.client === c.id && r.type === 'continued_stay' && !['active', 'closed'].includes(r.stage));
    const p = cont ? M.payerShort(s, cont.payer).split(' ')[0] : '';
    const facts = [{ k: t.fDays, v: q.days }, dr.length ? { k: t.fRating, v: `${dr[0].toFixed(1)} → ${dr.at(-1).toFixed(1)}` } : null, of.length ? { k: t.fOffice, v: `${of[0]} → ${of.at(-1)}` } : null, q.guardian_calls ? { k: t.fCalls, v: q.guardian_calls } : null].filter(Boolean);
    const summary = t.summary(child, q.days, (c.goals && c.goals[gi] && c.goals[gi].name) || '', of[0] != null ? of[0] : '–', of.length ? of.at(-1) : '–', dr.length ? dr[0].toFixed(1) : '–', dr.length ? dr.at(-1).toFixed(1) : '–', q.guardian_calls);
    const fullText = [
      `Harvest Outreach Center · Quarterly Progress Report · Therapeutic Day Treatment`,
      `Child: ${c.initials}${c.age ? ', age ' + c.age : ''}${a.start && a.end ? ' · Period: ' + M.fmtDate(a.start, { year: true }) + ' – ' + M.fmtDate(a.end, { year: true }) : ''}${who ? ' · Clinician: ' + who : ''}`,
      ...(c.goals || []).map((g, i) => `Goal ${i + 1}: ${g.objective || cap(g.name)} Met on ${q.goal_progress_days && q.goal_progress_days[i] != null ? q.goal_progress_days[i] : 0} of ${q.days} school days.`),
      dr.length ? `Daily rating (staff, 1–4, monthly average): ${dr.map(x => x.toFixed(1)).join(' → ')}.` : '',
      of.length ? `Office referrals per month (school counselor): ${of.join(' → ')}.` : '',
      q.guardian_calls ? `Guardian participation: ${q.guardian_calls} weekly calls.` : '',
      `Guardian signature: I have read this report with Harvest staff.`
    ].filter(Boolean).join('\n\n');
    const chipKind = { remote: 'info', in_person: 'warn', pending: 'wait', completed: 'ok', ready: 'info' }[st.state];
    const what = `<section class="fp-card" aria-labelledby="fp-wh"><h2 class="fp-h2" id="fp-wh">${t.what}</h2><p class="fp-p">${esc(summary)}</p>
      <details class="fp-det"><summary>${t.full}</summary><p class="fp-note">${esc(DEMO_WORDING[lang])}</p><p class="fp-text">${esc(fullText)}</p></details></section>
      <section class="fp-card" aria-labelledby="fp-nm"><h2 class="fp-h2" id="fp-nm">${t.numbers}</h2><dl class="fp-kv" style="margin:0">${facts.map(f => `<dt>${esc(f.k)}</dt><dd><b>${esc(String(f.v))}</b></dd>`).join('')}</dl></section>
      ${goals.length ? `<section class="fp-card" aria-labelledby="fp-go"><h2 class="fp-h2" id="fp-go">${t.goals}</h2>${goals.map(g => `<div><b>${esc(g.name)}</b><div class="fp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${g.pct}" aria-label="${esc(g.name)}"><i style="width:${g.pct}%"></i></div><span class="fp-hint">${esc(g.text)}</span></div>`).join('')}</section>` : ''}
      <section class="fp-card" aria-labelledby="fp-nx"><h2 class="fp-h2" id="fp-nx">${t.next}</h2><p class="fp-p">${esc(cont ? t.nextCont(p) : t.nextPlain)}</p></section>`;
    let action = '';
    if (st.state === 'completed') {
      const rec = st.signed;
      action = `<section class="fp-card fp-card--ok" aria-labelledby="fp-dn" data-sig-done><h2 class="fp-h2" id="fp-dn">${t.doneTitle}</h2><p class="fp-p">${esc(t.doneSub(fdate(rec.signed_at, lang), rec.signer))}</p>${rec.file ? `<a class="fp-btn fp-btn--o" role="button" href="${esc(rec.file)}" target="_blank" rel="noopener">${t.copy}</a>` : ''}</section>`;
    } else if (st.state === 'remote') {
      action = `<section class="fp-card" aria-labelledby="fp-sg"><h2 class="fp-h2" id="fp-sg">${t.sign}</h2><p class="fp-note">${t.meaning} ${t.remoteHint}</p>${this.box.html(lang, { name: ctx.guardian })}${this.state.err ? `<div class="fp-err" role="alert">${esc(this.state.err)}</div>` : ''}<a class="fp-btn fp-btn--p" role="button" href="#sign">${t.sign}</a></section>`;
    } else if (st.state === 'in_person') {
      const bs = P.bookingState(s, c, ctx.ref); const bring = (s.portal_copy && s.portal_copy.bring && s.portal_copy.bring[lang]) || [];
      const when = bs && bs.booked && bs.when ? t.whenBooked(dayLabel(bs.when.slice(0, 10), lang), M.fmtTime(bs.when)) : t.whenNone;
      action = `<section class="fp-card fp-card--next" aria-labelledby="fp-ip" data-sig-inperson><h2 class="fp-h2" id="fp-ip">${t.inPersonTitle}</h2><p class="fp-p">${t.inPersonText}</p><dl class="fp-kv"><dt>${t.when}</dt><dd>${esc(when)}</dd><dt>${t.bring}</dt><dd>${bring.length ? `<ul style="margin:0;padding-left:20px">${bring.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : t.bringNone}</dd></dl></section>`;
    } else if (st.state === 'pending') {
      action = `<section class="fp-card" aria-labelledby="fp-pd" data-sig-pending><h2 class="fp-h2" id="fp-pd">${t.pendingTitle}</h2><p class="fp-p">${t.pendingText}</p></section>`;
    } else {
      action = `<section class="fp-card" aria-labelledby="fp-rd" data-sig-ready><h2 class="fp-h2" id="fp-rd">${t.readyTitle}</h2><p class="fp-p">${t.readyText}</p></section>`;
    }
    return { title: t.title, sub: esc(t.sub(a.start ? fdate(a.start, lang) : '', a.end ? fdate(a.end, lang) : '', who)), body: `<div>${chip(chipKind, t.chips[st.state])}<span class="fp-pres" style="margin-left:6px">${ui.sourceChip(st.rule)}</span></div><div data-sig-state="${st.state}" style="display:flex;flex-direction:column;gap:16px">${what}${action}</div>`, pres: presChip('route.ParentQuarterly'), lang };
  }
  afterPaint(root) { this.box.attach(root, () => this.repaint()); }
  act() {
    return {
      sign: async () => {
        const s = this.s; const x = this.ctx(); const lang = getLang(x.client); const c = x.client; const form = this.formName(s, c);
        const st = P.sigState(s, c.id, form); if (!st.canSign || this.state.busy) return;
        const v = this.box.value(lang); if (v.error) return this.setState({ err: v.error });
        const q = c.quarter; const of = q.office_referrals_per_month || []; const dr = q.daily_rating || [];
        const gi = (q.goal_progress_days || []).reduce((bi, w, i, arr) => w > arr[bi] ? i : bi, 0);
        const summary = 'Quarterly progress report, read and signed by the guardian on the parent portal. ' + T.en.summary(childName(c), q.days, (c.goals && c.goals[gi] && c.goals[gi].name) || '', of[0] != null ? of[0] : '–', of.length ? of.at(-1) : '–', dr.length ? dr[0].toFixed(1) : '–', dr.length ? dr.at(-1).toFixed(1) : '–', null) + (q.guardian_calls ? ` Guardian joined ${q.guardian_calls} weekly calls.` : '');
        this.state.busy = true;
        try { await this.do('consent.sign', { client: c.id, form, signature: v.signature, lang, summary }); } catch { this.state.busy = false; return; }
        this.state.busy = false; this.box.reset(); this.state.err = '';
        toast(T[lang].thanks); this.repaint();
      }
    };
  }
});
