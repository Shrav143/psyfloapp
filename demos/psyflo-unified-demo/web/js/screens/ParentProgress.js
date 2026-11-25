// 47 · Progress · family view (phone). The guardian's view of how the child is doing, in plain words: no scores, no diagnoses, no clinical narrative.
// Built from goals and daily ratings (client.quarter, parent_progress, this week's daily-note ratings), office referrals (the quarter) and the
// guardian's own check-ins. Each block says where it comes from. The maturity chip shows only in the presenter's overlay.
import { register, M, ui, esc } from '../app.js';
import { PortalScreen, getLang, fdate, phref, chip, btn, presChip, childName, progressFor } from './ParentPortal.js';

const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] };
// the months a quarter's numbers cover, from the authorization start (else the months to today)
function months(s, c, n, lang) {
  const start = (c.authorization && c.authorization.start) || M.addDays(s.today, -30 * (n - 1));
  const d = M.parse(start); return Array.from({ length: n }, (_, i) => MON[lang][(d.getUTCMonth() + i) % 12]);
}
// what staff practise with the child, in a parent's words (keyed by the approach code; the clinical names never reach the guardian)
const SKILL = {
  'Clinical 2.1': { en: 'Movement breaks to calm down', es: 'Pausas de movimiento para calmarse' },
  'QMHP 1.4': { en: 'Movement breaks to calm down', es: 'Pausas de movimiento para calmarse' },
  'QMHP 1.9': { en: 'Working out problems with classmates', es: 'Resolver problemas con compañeros' },
  'QMHP 1.4b': { en: 'Step-by-step problem solving', es: 'Resolver problemas paso a paso' },
  'QMHP 1.6': { en: 'Staying safe and setting limits', es: 'Mantenerse seguro y poner límites' },
  'QMHP 1.3': { en: 'Naming feelings', es: 'Ponerle nombre a los sentimientos' },
  'QMHP 1.5': { en: 'Making and keeping friends', es: 'Hacer y mantener amigos' }
};
const ANS_ES = { Always: 'Siempre', Often: 'A menudo', Sometimes: 'A veces', Rarely: 'Casi nunca', Never: 'Nunca', 'Not at all': 'Nada', 'Some days': 'Algunos días', 'Most days': 'Casi todos' };
const MINE_Q = { sad: { en: 'Sad', es: 'Triste' }, angry: { en: 'Angry', es: 'Enojado' }, sleep: { en: 'Sleep', es: 'Sueño' } };
const T = {
  en: { title: c => `How ${c} is doing`, sub: (d, c) => d ? `With Harvest since ${d} · plain words, no scores` : `${c}'s progress · plain words, no scores`,
    emptyTitle: c => `${c} has not started yet`, emptyText: c => `Once ${c} starts with Harvest at school, you will see here how each goal is going and what ${c} practises.`,
    goodDays: 'Good days at school', up: 'Going up', steady: 'Steady', down: 'Harder lately',
    trendText: (c, a, b) => `${c}'s daily rating went from ${a} to ${b} out of 4. Staff rate every school day.`, from: x => `From ${x}`, fromQ: 'From the quarterly report',
    goals: 'Goals', onTrack: 'On track', getting: 'Getting there', started: 'Just started', goalDays: (a, b) => `Met on ${a} of ${b} school days this quarter`, justStarted: 'Just started · progress shows after the first weeks',
    office: 'Trips to the office', officeSub: 'Times sent to the office in a month (from the school counselor)', fewer: 'Fewer', more: 'More', same: 'About the same',
    practice: 'What we practise at school', yours: 'Your check-ins', noMine: 'No check-ins yet.', start: 'Start a check-in', how: 'Harvest staff can see these. If something looks wrong, call us.' },
  es: { title: c => `Cómo le va a ${c}`, sub: (d, c) => d ? `Con Harvest desde el ${d} · palabras sencillas, sin puntajes` : `Progreso de ${c} · palabras sencillas, sin puntajes`,
    emptyTitle: c => `${c} todavía no ha empezado`, emptyText: c => `Cuando ${c} empiece con Harvest en la escuela, aquí verá cómo va cada meta y qué practica ${c}.`,
    goodDays: 'Días buenos en la escuela', up: 'Mejorando', steady: 'Estable', down: 'Más difícil',
    trendText: (c, a, b) => `La calificación diaria de ${c} pasó de ${a} a ${b} de 4. El personal califica cada día escolar.`, from: x => `De ${x}`, fromQ: 'Del informe trimestral',
    goals: 'Metas', onTrack: 'Va bien', getting: 'Avanzando', started: 'Recién empieza', goalDays: (a, b) => `Lo logró ${a} de ${b} días escolares este trimestre`, justStarted: 'Recién empieza · el progreso aparece después de las primeras semanas',
    office: 'Visitas a la oficina', officeSub: 'Veces que lo mandaron a la oficina en un mes (de la consejera escolar)', fewer: 'Menos', more: 'Más', same: 'Igual',
    practice: 'Lo que practicamos en la escuela', yours: 'Sus chequeos', noMine: 'Todavía no hay chequeos.', start: 'Empezar un chequeo', how: 'El personal de Harvest puede verlos. Si algo parece mal, llámenos.' }
};
const cap = x => x ? x.charAt(0).toUpperCase() + x.slice(1) : x;

register('ParentProgress', class extends PortalScreen {
  page() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const q = c.quarter; const prog = progressFor(s, c, lang);
    const started = !!(c.service_start && !['referral', 'intake'].includes(c.stage) && ((c.goals || []).length || prog));
    const meter = (rows) => rows.map(r => `<div class="fp-mini"><span>${esc(r.label)}</span><div class="fp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${r.pct}" aria-label="${esc(r.label + ' ' + r.v)}"><i style="width:${r.pct}%"></i></div><b>${esc(String(r.v))}</b></div>`).join('');
    let body = '';
    if (!started) {
      body = `<section class="fp-card"><h2 class="fp-h2">${esc(t.emptyTitle(child))}</h2><p class="fp-p fp-muted">${esc(t.emptyText(child))}</p></section>`;
    } else {
      // good days: the quarter's monthly daily rating, else this week's good days
      let trend = null;
      if (q && q.daily_rating && q.daily_rating.length) { const r = q.daily_rating; const lab = months(s, c, r.length, lang); const a = r[0], b = r.at(-1); trend = { chip: b > a + 0.2 ? t.up : b < a - 0.2 ? t.down : t.steady, kind: b < a - 0.2 ? 'warn' : 'ok', text: t.trendText(child, a.toFixed(1), b.toFixed(1)), src: t.fromQ, rows: r.map((v, i) => ({ label: lab[i], pct: Math.round(100 * v / 4), v: v.toFixed(1) })) }; }
      else if (prog) { const pp = (s.parent_progress || {})[c.id]; trend = { chip: prog.pct >= 60 ? t.up : t.steady, kind: 'ok', text: prog.text, src: pp && pp.source ? t.from(pp.source) : '', rows: [{ label: lang === 'es' ? 'sem.' : 'week', pct: prog.pct, v: prog.pct + '%' }] }; }
      const goals = (c.goals || []).map((g, i) => {
        const days = q && q.goal_progress_days && q.goal_progress_days[i]; let pct = 0, text = t.justStarted;
        if (days != null && q && q.days) { pct = Math.round(100 * days / q.days); text = t.goalDays(days, q.days); } else if (i === 0 && prog) { pct = prog.pct; text = prog.text; }
        return { name: cap(g.name), pct, text, ...(pct >= 60 ? { kind: 'ok', chip: t.onTrack } : pct >= 30 ? { kind: 'todo', chip: t.getting } : { kind: 'later', chip: t.started }) };
      });
      const of = q && q.office_referrals_per_month;
      const office = of && of.length ? (() => { const lab = months(s, c, of.length, lang); const max = Math.max(...of, 1); const a = of[0], b = of.at(-1); return { chip: b < a ? t.fewer : b > a ? t.more : t.same, kind: b < a ? 'ok' : b > a ? 'warn' : 'later', rows: of.map((v, i) => ({ label: lab[i], pct: Math.round(100 * v / max), v })) }; })() : null;
      const practice = [...new Set((c.goals || []).flatMap(g => g.interventions || []).map(code => SKILL[code] && SKILL[code][lang]).filter(Boolean))];
      body = (trend ? `<section class="fp-card" aria-labelledby="fp-gd"><h2 class="fp-h2" id="fp-gd">${t.goodDays}</h2><div>${chip(trend.kind, trend.chip)}</div><p class="fp-p">${esc(trend.text)}</p>${meter(trend.rows)}${trend.src ? `<p class="fp-hint">${esc(trend.src)}</p>` : ''}</section>` : '')
        + (goals.length ? `<section class="fp-card" aria-labelledby="fp-gl"><h2 class="fp-h2" id="fp-gl">${t.goals}</h2>${goals.map(g => `<div><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${esc(g.name)}</b>${chip(g.kind, g.chip)}</div><div class="fp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${g.pct}" aria-label="${esc(g.name)}" style="margin-top:6px"><i style="width:${g.pct}%"></i></div><span class="fp-hint">${esc(g.text)}</span></div>`).join('')}</section>` : '')
        + (office ? `<section class="fp-card" aria-labelledby="fp-of"><h2 class="fp-h2" id="fp-of">${t.office}</h2><div>${chip(office.kind, office.chip)}</div><p class="fp-hint" style="margin:0">${t.officeSub}</p>${meter(office.rows)}</section>` : '')
        + (practice.length ? `<section class="fp-card" aria-labelledby="fp-pr"><h2 class="fp-h2" id="fp-pr">${t.practice}</h2><ul style="margin:0;padding-left:20px">${practice.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : '');
    }
    const mine = (s.checkins || []).filter(x => x.client === c.id && x.role === 'guardian').sort((a, b) => ((a.at || a.week_of) < (b.at || b.week_of) ? 1 : -1)).slice(0, 3)
      .map(x => ({ when: fdate(x.at || x.week_of, lang), text: Object.entries(MINE_Q).filter(([k]) => x.answers && x.answers[k]).map(([k, l]) => `${l[lang]}: ${(lang === 'es' ? (ANS_ES[x.answers[k]] || x.answers[k]) : x.answers[k]).toLowerCase()}`).join(' · ') }));
    body += `<section class="fp-card" aria-labelledby="fp-ck"><h2 class="fp-h2" id="fp-ck">${t.yours}</h2>${mine.length ? `<ul class="fp-list">${mine.map(m => `<li><b>${esc(m.when)}</b> · ${esc(m.text)}</li>`).join('')}</ul>` : `<p class="fp-p fp-muted">${t.noMine}</p>`}<p class="fp-hint" style="margin:0">${t.how}</p>${btn('o', phref(this.params, 'ParentSurvey'), esc(t.start))}</section>`;
    return { title: esc(t.title(child)), sub: esc(t.sub(started ? fdate(c.service_start, lang) : '', child)), body, pres: presChip('route.ParentProgress'), lang };
  }
});
