// 22 · Assessments (phone). Seeded + Live: the due list (assessments_due) and this month's history are seeded;
// "Ask now" opens a two-question SUDS (#suds) or the DSM cross-cutting child version (#dsm) and stores the answers
// with assessment.save. They are held in Psyflo until the student is open in Lauris, where Lauris scores them.
import { register, Screen, M, toast } from '../app.js';
import { phoneUser, whoLine, dueAssessments } from './MobileApp.js';

const SUDS = [
  { key: 'now', label: 'Right now, how upset or stressed do you feel?', hint: '0 = totally calm · 10 = the most upset you have ever felt' },
  { key: 'worst', label: 'At the worst moment today, how upset were you?', hint: '0 = totally calm · 10 = the most upset you have ever felt' }
];
const DSM = ['Had stomach aches, headaches or other aches and pains', 'Worried about your health or about getting sick', 'Had trouble falling asleep or staying asleep', 'Had trouble paying attention in class or with homework',
  'Had less fun doing things you used to enjoy', 'Felt sad or down for several hours', 'Felt more irritated or easily annoyed than usual', 'Felt angry or lost your temper',
  'Started lots more projects or did riskier things than usual', 'Slept less than usual but still had lots of energy', 'Felt nervous, scared or worried', 'Not been able to stop worrying',
  'Not done things or gone places because you felt nervous', 'Heard voices when no one was there', 'Seen things when you were awake that other people could not see', 'Had thoughts that you might do something bad or that something bad might happen',
  'Felt you had to check on things over and over', 'Worried a lot about things you touched being dirty', 'Felt you had to do things a certain way to keep something bad from happening',
  'Had a drink with alcohol in it', 'Smoked a cigarette or vaped', 'Used drugs to feel high', 'Used medicine without a doctor\'s prescription', 'Thought about killing yourself or hurting yourself', 'Ever tried to kill yourself'];
const SCALE = ['0 Not at all', '1 Rarely', '2 Several days', '3 Most days', '4 Nearly every day'];
const YN = ['Yes', 'No', 'Don\'t know'];

register('MobileAssess', class extends Screen {
  init() { this.state = { form: null }; }
  user() { return phoneUser(this.s); }
  renderVals() {
    const s = this.s; const u = this.user(); const f = this.state.form;
    const due = dueAssessments(s, u.id).map((d, i) => {
      const c = M.client(s, d.client);
      return { title: `${d.instrument.replace(' (child)', '')} · ${c.initials}`, dueText: 'due ' + M.fmtDate(d.due, { dow: true }).split(' ')[0], about: d.about, kind: d.kind, client: d.client,
        btn: i === 0 ? `Ask ${c.initials} now` : `Start with ${c.initials}`, btnCls: i === 0 ? 'p' : 'o', btnColor: i === 0 ? '#fff' : '#151B24' };
    });
    const mine = new Set(s.clients.filter(c => c.staff === u.id).map(c => c.id));
    const held = s.assessments.filter(a => a.status === 'waiting' && (a.by === u.id || mine.has(a.client))).map(a => `${a.instrument} · ${M.client(s, a.client).initials} · saved ${M.fmtDate(a.date)} · waits until ${M.client(s, a.client).initials} is open in Lauris`);
    const month = s.today.slice(0, 7);
    const doneList = (s.assessment_history || []).filter(h => h.staff === u.id || !h.staff).map(h => `${h.instrument} · ${M.client(s, h.client).initials} · ${M.fmtDate(h.date)} · ${h.score}${h.prev != null ? ` (was ${h.prev})` : ''}`)
      .concat(s.assessments.filter(a => a.status === 'used' && mine.has(a.client) && (a.date || '').slice(0, 7) === month).map(a => `${a.instrument} · ${M.client(s, a.client).initials} · ${M.fmtDate(a.date)} · in Lauris`));
    let form = null;
    if (f) {
      const c = M.client(s, f.client);
      if (f.kind === 'suds') form = { title: `SUDS · ${c.initials}`, sub: 'Read each question to the student and tap their answer.', progress: '2 questions', canBack: false, next: 'Save answers',
        qs: SUDS.map(q => ({ label: q.label, hint: q.hint, opts: [...Array(11).keys()].map(n => ({ label: String(n), on: f.a[q.key] === n ? ' on' : '', pick: () => this.answer(q.key, n) })) })) };
      else {
        const i = f.i; const yn = i >= 19; const k = 'q' + (i + 1);
        form = { title: `DSM cross-cutting · ${c.initials}`, sub: 'Child version · In the past two weeks, how much (or how often) have you…', progress: `${i + 1} of ${DSM.length}`, canBack: i > 0, next: i === DSM.length - 1 ? 'Save answers' : 'Next',
          qs: [{ label: DSM[i], hint: i >= 23 ? 'If yes, tell the clinician today and follow Harvest\'s safety steps.' : '', opts: (yn ? YN : SCALE).map((o, n) => ({ label: o, on: f.a[k] === (yn ? o : n) ? ' on' : '', pick: () => this.answer(k, yn ? o : n) })) }] };
      }
    }
    return { who: whoLine(s, u).split(' · ').slice(0, 2).join(' · '), due, held, doneList, form, dueN: due.length };
  }
  answer(k, v) { const f = this.state.form; f.a[k] = v; this.setState({}); }
  open(kind, el) {
    const s = this.s; const u = this.user();
    const d = dueAssessments(s, u.id).find(x => x.kind === kind && (!el?.dataset?.c || x.client === el.dataset.c)) || (s.assessments_due || []).find(x => x.kind === kind);
    if (!d) return toast('Nothing due for that', 'err');
    this.setState({ form: { kind, client: d.client, instrument: d.instrument, i: 0, a: {} } }); scrollTo(0, 0);
  }
  async save() {
    const f = this.state.form; const u = this.user();
    if (f.kind === 'suds') {
      if (SUDS.some(q => f.a[q.key] == null)) return toast('Tap an answer for both questions', 'err');
    } else {
      if (f.a['q' + (f.i + 1)] == null) return toast('Tap an answer first', 'err');
      if (f.i < DSM.length - 1) { f.i++; return this.setState({}); }
    }
    const ini = M.client(this.s, f.client).initials;
    await this.do('assessment.save', { client: f.client, instrument: f.instrument, answers: f.a, score: f.kind === 'suds' ? f.a.now : null, by: u.id });
    this.setState({ form: null }); scrollTo(0, 0);
    toast(`Answers saved · they wait in Psyflo until ${ini} is open in Lauris`);
  }
  get anchors() {
    return {
      suds: (e, el) => this.open('suds', el),
      dsm: (e, el) => this.open('dsm', el),
      save: () => this.save(),
      prev: () => { const f = this.state.form; if (f && f.i > 0) { f.i--; this.setState({}); } },
      cancel: () => this.setState({ form: null })
    };
  }
  set anchors(v) { }
});
