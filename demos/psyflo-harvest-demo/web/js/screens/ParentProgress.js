// 47 · Progress · family view (phone). Seeded + Live: the guardian's full view of how the child is doing, in plain
// words. Built from goals and daily ratings (client.quarter, parent_progress, daily notes), office referrals
// (quarter / counselor_counts), the skills practised (goal interventions) and the guardian's own check-ins. No scores and no diagnoses, per the portal note (12).
import { register, Screen, M } from '../app.js';
import { famCtx, getLang, setLang, fdate, pgo, callSheet, childName, progressFor, LANG_ON, LANG_OFF } from './ParentPortal.js';

const MON = { en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] };
// the three months a quarter's numbers cover, from the authorization start (else the three months to today)
function months(s, c, n, lang) {
  const start = c.authorization?.start || M.addDays(s.today, -30 * (n - 1));
  const d = M.parse(start); return Array.from({ length: n }, (_, i) => MON[lang][(d.getUTCMonth() + i) % 12]);
}

// what staff practise with the child, in a parent's words (keyed by the intervention's name)
const SKILL = {
  'Movement': { en: 'Movement breaks to calm down', es: 'Pausas de movimiento para calmarse' },
  'Movement intervention': { en: 'Movement breaks to calm down', es: 'Pausas de movimiento para calmarse' },
  'Solving peer conflict': { en: 'Working out problems with classmates', es: 'Resolver problemas con compañeros' },
  'Structured problem solving': { en: 'Step-by-step problem solving', es: 'Resolver problemas paso a paso' },
  'Recognize danger / healthy boundaries': { en: 'Staying safe and setting limits', es: 'Mantenerse seguro y poner límites' },
  'Psychoeducation': { en: 'Naming feelings', es: 'Ponerle nombre a los sentimientos' },
  'Make or maintain friendships': { en: 'Making and keeping friends', es: 'Hacer y mantener amigos' }
};
const ANS_ES = { Always: 'Siempre', Often: 'A menudo', Sometimes: 'A veces', Rarely: 'Casi nunca', Never: 'Nunca', 'Not at all': 'Nada', 'Some days': 'Algunos días', 'Most days': 'Casi todos' };
const MINE_Q = { sad: { en: 'Sad', es: 'Triste' }, angry: { en: 'Angry', es: 'Enojado' }, sleep: { en: 'Sleep', es: 'Sueño' } };

const T = {
  en: { title: c => `How ${c} is doing`, sub: (d, c) => d ? `With Harvest since ${d} · plain words, no scores` : `${c}'s progress · plain words, no scores`,
    emptyTitle: c => `${c} hasn't started yet`, emptyText: c => `Once ${c} starts with Harvest at school, you'll see here how each goal is going, and what ${c} practises. Updated every school day.`,
    example: 'See an example: a child in services', goodDays: 'Good days at school', up: 'going up', steady: 'steady', down: 'harder lately',
    trendText: (c, a, b) => `${c}'s daily rating went from ${a} to ${b} out of 4. Staff rate every school day.`, weekText: t => t,
    goals: 'Goals', onTrack: 'on track', getting: 'getting there', started: 'just started', goalDays: (a, b) => `Met on ${a} of ${b} school days this quarter`, justStarted: 'Just started · progress shows after the first weeks',
    office: 'Trips to the office', officeSub: 'Times sent to the office in a month (from the school counselor)', fewer: 'fewer', more: 'more', same: 'about the same',
    practice: 'What we practise at school', practiceSub: 'Skills Harvest staff work on with your child, linked to the goals',
    yours: 'Your check-ins', every2: 'every 2 weeks', noMine: 'No check-ins yet.', start: 'Start a check-in', how: 'Harvest staff enter these. If something looks wrong, call us.',
    back: 'Back to the family page', call: 'Call us' },
  es: { title: c => `Cómo le va a ${c}`, sub: (d, c) => d ? `Con Harvest desde el ${d} · palabras sencillas, sin puntajes` : `Progreso de ${c} · palabras sencillas, sin puntajes`,
    emptyTitle: c => `${c} todavía no ha empezado`, emptyText: c => `Cuando ${c} empiece con Harvest en la escuela, aquí verá cómo va cada meta y qué practica ${c}. Se actualiza cada día escolar.`,
    example: 'Ver un ejemplo: un niño en servicios', goodDays: 'Días buenos en la escuela', up: 'mejorando', steady: 'estable', down: 'más difícil',
    trendText: (c, a, b) => `La calificación diaria de ${c} pasó de ${a} a ${b} de 4. El personal califica cada día escolar.`, weekText: t => t,
    goals: 'Metas', onTrack: 'va bien', getting: 'avanzando', started: 'recién empieza', goalDays: (a, b) => `Lo logró ${a} de ${b} días escolares este trimestre`, justStarted: 'Recién empieza · el progreso aparece después de las primeras semanas',
    office: 'Visitas a la oficina', officeSub: 'Veces que lo mandaron a la oficina en un mes (de la consejera escolar)', fewer: 'menos', more: 'más', same: 'igual',
    practice: 'Lo que practicamos en la escuela', practiceSub: 'Habilidades que el personal de Harvest trabaja con su hijo, ligadas a las metas',
    yours: 'Sus chequeos', every2: 'cada 2 semanas', noMine: 'Todavía no hay chequeos.', start: 'Empezar un chequeo', how: 'El personal de Harvest ingresa esto. Si algo parece mal, llámenos.',
    back: 'Volver a la página de la familia', call: 'Llámenos' }
};
const cap = x => x ? x.charAt(0).toUpperCase() + x.slice(1) : x;

register('ParentProgress', class extends Screen {
  ctx() { return famCtx(this.s, this.params); }
  renderVals() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const q = c.quarter; const prog = progressFor(s, c, lang);
    const started = !!(c.service_start && !['referral', 'intake'].includes(c.stage) && (c.goals?.length || prog));

    // good days: the quarter's monthly daily rating, else this week's good days
    let trend = null;
    if (started && q?.daily_rating?.length) {
      const r = q.daily_rating; const lab = months(s, c, r.length, lang); const a = r[0], b = r.at(-1);
      trend = { chip: b > a + 0.2 ? t.up : b < a - 0.2 ? t.down : t.steady, text: t.trendText(child, a.toFixed(1), b.toFixed(1)), rows: r.map((v, i) => ({ label: lab[i], pct: Math.round(100 * v / 4), v: v.toFixed(1) })) };
    } else if (started && prog) {
      trend = { chip: prog.pct >= 60 ? t.up : t.steady, text: prog.text, rows: [{ label: lang === 'es' ? 'sem.' : 'week', pct: prog.pct, v: prog.pct + '%' }] };
    }

    const goals = !started ? [] : (c.goals || []).map((g, i) => {
      const days = q?.goal_progress_days?.[i];
      let pct = 0, text = t.justStarted;
      if (days != null && q.days) { pct = Math.round(100 * days / q.days); text = t.goalDays(days, q.days); }
      else if (i === 0 && prog) { pct = prog.pct; text = prog.text; }
      return { name: cap(lang === 'es' && i === 0 && s.parent_progress?.[c.id]?.goal_es && !q ? s.parent_progress[c.id].goal_es : g.name), pct, text, ...(pct >= 60 ? { cls: 'g', chip: t.onTrack } : pct >= 30 ? { cls: 'y', chip: t.getting } : { cls: 'n', chip: t.started }) };
    });

    // office referrals: quarter months, else the counselor's monthly counts
    let office = null;
    const of = q?.office_referrals_per_month || s.counselor_counts.filter(x => x.client === c.id).sort((a, b) => a.month < b.month ? -1 : 1).map(x => x.office_referrals);
    if (started && of?.length) {
      const lab = q?.office_referrals_per_month ? months(s, c, of.length, lang) : s.counselor_counts.filter(x => x.client === c.id).sort((a, b) => a.month < b.month ? -1 : 1).map(x => MON[lang][+x.month.slice(5, 7) - 1]);
      const max = Math.max(...of, 1); const a = of[0], b = of.at(-1);
      office = { chip: b < a ? t.fewer : b > a ? t.more : t.same, cls: b < a ? 'g' : b > a ? 'r' : 'n', rows: of.map((v, i) => ({ label: lab[i], pct: Math.round(100 * v / max), v })) };
    }

    const practice = !started ? [] : [...new Set((c.goals || []).flatMap(g => g.interventions || []).map(code => M.byId(s.interventions.map(x => ({ ...x, id: x.code })), code)?.name).filter(Boolean))]
      .map(n => SKILL[n]?.[lang]).filter((x, i, a) => x && a.indexOf(x) === i);

    const mine = s.checkins.filter(x => x.client === c.id && x.role === 'guardian').sort((a, b) => ((a.at || a.week_of) < (b.at || b.week_of) ? 1 : -1)).slice(0, 3)
      .map(x => ({ when: fdate(x.at || x.week_of, lang), text: Object.entries(MINE_Q).filter(([k]) => x.answers?.[k]).map(([k, l]) => `${l[lang]}: ${(lang === 'es' ? (ANS_ES[x.answers[k]] || x.answers[k]) : x.answers[k]).toLowerCase()}`).join(' · ') }));

    return {
      t: { ...Object.fromEntries(Object.entries(t).filter(([, v]) => typeof v === 'string')), title: t.title(child), sub: t.sub(started ? fdate(c.service_start, lang) : '', child), emptyTitle: t.emptyTitle(child), emptyText: t.emptyText(child) },
      enStyle: lang === 'en' ? LANG_ON : LANG_OFF, esStyle: lang === 'es' ? LANG_ON : LANG_OFF,
      empty: !started, example: !started && !this.params.t ? () => pgo({ c: 'MR' }, 'ParentProgress') : null,
      trend, goals, office, practice, mine,
    };
  }
  get anchors() {
    const ctx = () => this.ctx();
    return {
      en: () => { setLang('en'); this.setState({}); },
      es: () => { setLang('es'); this.setState({}); },
      survey: () => pgo(this.params, 'ParentSurvey'),
      back: () => pgo(this.params, 'ParentPortal'),
      call: () => callSheet(this.s, ctx(), getLang(ctx().client))
    };
  }
  set anchors(v) { }
});
