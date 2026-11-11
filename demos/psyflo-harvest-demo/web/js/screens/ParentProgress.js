// 47 · Progress · family view (phone). Seeded + Live: the guardian's full view of how the child is doing, in plain
// words. Built from goals and daily ratings (client.quarter, parent_progress, daily notes), office referrals
// (quarter / counselor_counts), the skills practised (goal interventions) and the guardian's own check-ins. No scores and no diagnoses, per the portal note (12).
import { register, Screen, M } from '../app.js';
import { famCtx, getLang, setLang, fdate, pgo, callSheet, childName, progressFor, guardHeader, guardFooter } from './ParentPortal.js';
import { C_CSS } from './MobileApp.js';

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
  en: { title: c => `How ${c} is doing`, emptyTitle: c => `${c} has not started`, example: 'See an example',
    goodDays: 'Good days', up: 'Going up', steady: 'Steady', down: 'Harder lately',
    trendText: t => t, goals: 'Goals', onTrack: 'On track', getting: 'Getting there', started: 'Just started',
    goalDays: (a, b) => `Met on ${a} of ${b} school days`,
    office: 'Trips to the office', fewer: 'Fewer', more: 'More', same: 'Same',
    practice: 'What we practise', yours: 'Your check-ins', last: d => `last ${d}`, start: 'Start' },
  es: { title: c => `Cómo le va a ${c}`, emptyTitle: c => `${c} no ha empezado`, example: 'Ver un ejemplo',
    goodDays: 'Días buenos', up: 'Mejorando', steady: 'Estable', down: 'Más difícil',
    trendText: t => t, goals: 'Metas', onTrack: 'Va bien', getting: 'Avanzando', started: 'Recién empieza',
    goalDays: (a, b) => `Lo logró ${a} de ${b} días escolares`,
    office: 'Visitas a la oficina', fewer: 'Menos', more: 'Más', same: 'Igual',
    practice: 'Lo que practicamos', yours: 'Sus chequeos', last: d => `último ${d}`, start: 'Empezar' }
};
const cap = x => x ? x.charAt(0).toUpperCase() + x.slice(1) : x;

register('ParentProgress', class extends Screen {
  init() { this.state = { practice: false }; }
  ctx() { return famCtx(this.s, this.params); }
  renderVals() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const q = c.quarter; const prog = progressFor(s, c, lang);
    const started = !!(c.service_start && !['referral', 'intake'].includes(c.stage) && (c.goals?.length || prog));

    // good days: the quarter's monthly daily rating, else this week's good days
    let trend = null;
    if (started && q?.daily_rating?.length) {
      const r = q.daily_rating; const lab = months(s, c, r.length, lang); const a = r[0], b = r.at(-1);
      trend = { chip: b > a + 0.2 ? t.up : b < a - 0.2 ? t.down : t.steady, rows: r.map((v, i) => ({ label: lab[i], pct: Math.round(100 * v / 4), v: v.toFixed(1) })) };
    } else if (started && prog) {
      trend = { chip: prog.pct >= 60 ? t.up : t.steady, rows: [{ label: lang === 'es' ? 'sem.' : 'week', pct: prog.pct, v: prog.pct + '%' }] };
    }

    const goals = !started ? [] : (c.goals || []).map((g, i) => {
      const days = q?.goal_progress_days?.[i];
      let pct = 0, text = '';
      if (days != null && q.days) { pct = Math.round(100 * days / q.days); text = t.goalDays(days, q.days); }
      else if (i === 0 && prog) { pct = prog.pct; text = prog.text; }
      return { name: cap(lang === 'es' && i === 0 && s.parent_progress?.[c.id]?.goal_es && !q ? s.parent_progress[c.id].goal_es : g.name), pct, ...(pct >= 60 ? { cls: 'g', chip: t.onTrack } : pct >= 30 ? { cls: 'y', chip: t.getting } : { cls: 'n', chip: t.started }) };
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

    const lastMine = mine[0] ? t.last(mine[0].when) : '';
    return {
      hd: guardHeader(t.title(child), lang), ft: guardFooter(lang),
      t: { emptyTitle: t.emptyTitle(child), example: t.example, goodDays: t.goodDays, goals: t.goals, office: t.office, practice: t.practice, yours: t.yours, start: t.start },
      empty: !started, example: !started && !this.params.t ? () => pgo({ c: 'MR' }, 'ParentProgress') : null,
      trend, goals, office, practice, lastMine,
      showPractice: !!this.state.practice, practiceOpen: this.state.practice ? 'true' : 'false', togglePractice: () => this.setState({ practice: !this.state.practice })
    };
  }
  get css() { return C_CSS; }
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
