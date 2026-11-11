// 50 · Book a time (phone). Live: the family books the screening call, and later the in-person intake, from the
// clinicians' open times (openSlots: a stand-in for their Google Calendars, each time going to the first free
// clinician). Opened when a clinician marks the referral "Qualifies · family books the call" (screening.offer) or
// the child "Qualifies for TDT · family books the intake" (intake.offer) on the referral review (7).
// Booking → screening.bookByFamily / intake.book (with "I need a ride", which lands on the clinician's Do next).
// The day before the intake the family confirms or asks to change (intake.confirm). ?kind=screening|intake.
import { register, Screen, M, toast } from '../app.js';
import { famCtx, getLang, setLang, fdate, pgo, callSheet, childName, guardianLabel, openSlots, bookingState, INTAKE_WHERE, LANG_ON, LANG_OFF } from './ParentPortal.js';

const DOW = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] };
const dayLabel = (d, lang) => `${DOW[lang][M.parse(d).getUTCDay()]} ${fdate(d, lang)}`;
const time = iso => M.fmtTime(iso);

const T = {
  en: {
    title: { screening: 'Book your first call', intake: 'Book the intake visit' },
    sub: { screening: c => `${c} · a 30–45 minute phone call with a Harvest clinician`, intake: c => `${c} · in person, about 2 hours` },
    notYet: 'Nothing to book yet', waiting: { screening: 'Harvest will text you when it is time to book the first call.', intake: 'After the first call, Harvest texts you when it is time to book the intake visit.' },
    booked: 'Booked', upcoming: 'coming up', confirmed: 'confirmed', changeAsked: 'change asked',
    bookedSub: { screening: (who) => `${who} will call you. Keep your phone close. You can step away any time.`, intake: (who, where) => `With ${who} at ${where}. Bring your Medicaid card. ${''}` },
    rideReq: 'Ride requested · Harvest will call you to set it up.', rideNone: 'No ride needed.',
    rideOn: 'I need a ride after all', rideOff: "I don't need a ride anymore",
    tomorrow: 'Still good for tomorrow?', confirmAsk: (w) => `Your intake visit is tomorrow, ${w}.`, yes: 'Yes, see you then', change: 'I need to change it',
    pickAnother: 'Pick a different time', pickHint: 'Open times from Harvest’s clinicians. Tap one.',
    chosenSub: { screening: who => `Phone call with ${who}`, intake: (who, where) => `In person with ${who} · ${where}` },
    needRide: 'I need a ride to the intake', bookIt: 'Book this time',
    how: 'You get a text to confirm and a reminder the day before.',
    thanks: { screening: 'Booked · you will get a text to confirm', intake: 'Intake booked · you will get a reminder the day before' },
    thanksConfirm: 'Thank you · see you tomorrow', thanksChange: 'Harvest will call you to find a new time',
    back: 'Back to the family page', call: 'Call us instead'
  },
  es: {
    title: { screening: 'Reserve su primera llamada', intake: 'Reserve la cita de admisión' },
    sub: { screening: c => `${c} · una llamada de 30 a 45 minutos con un clínico de Harvest`, intake: c => `${c} · en persona, unas 2 horas` },
    notYet: 'Todavía no hay nada que reservar', waiting: { screening: 'Harvest le enviará un mensaje cuando sea hora de reservar la primera llamada.', intake: 'Después de la primera llamada, Harvest le avisa cuando sea hora de reservar la cita de admisión.' },
    booked: 'Reservado', upcoming: 'próximamente', confirmed: 'confirmado', changeAsked: 'pidió cambio',
    bookedSub: { screening: (who) => `${who} le llamará. Tenga su teléfono cerca. Puede pausar cuando quiera.`, intake: (who, where) => `Con ${who} en ${where}. Traiga su tarjeta de Medicaid.` },
    rideReq: 'Transporte pedido · Harvest le llamará para organizarlo.', rideNone: 'No necesita transporte.',
    rideOn: 'Sí necesito transporte', rideOff: 'Ya no necesito transporte',
    tomorrow: '¿Sigue bien para mañana?', confirmAsk: (w) => `Su cita de admisión es mañana, ${w}.`, yes: 'Sí, nos vemos', change: 'Necesito cambiarla',
    pickAnother: 'Elegir otra hora', pickHint: 'Horas libres de los clínicos de Harvest. Toque una.',
    chosenSub: { screening: who => `Llamada con ${who}`, intake: (who, where) => `En persona con ${who} · ${where}` },
    needRide: 'Necesito transporte para la cita', bookIt: 'Reservar esta hora',
    how: 'Recibe un mensaje para confirmar y un recordatorio el día antes.',
    thanks: { screening: 'Reservado · recibirá un mensaje para confirmar', intake: 'Cita reservada · recibirá un recordatorio el día antes' },
    thanksConfirm: 'Gracias · nos vemos mañana', thanksChange: 'Harvest le llamará para buscar otra hora',
    back: 'Volver a la página de la familia', call: 'Prefiero llamar'
  }
};

register('ParentSchedule', class extends Screen {
  init() { this.state = { pick: null, ride: false, change: false }; }
  ctx() { return famCtx(this.s, this.params); }
  renderVals() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const bs = bookingState(s, ctx);
    const kind = this.params.kind || bs?.kind || 'screening';
    const staffName = id => M.staff(s, id).name;
    const base = {
      t: { ...Object.fromEntries(Object.entries(t).filter(([, v]) => typeof v === 'string')), title: t.title[kind], sub: t.sub[kind](child) },
      enStyle: lang === 'en' ? LANG_ON : LANG_OFF, esStyle: lang === 'es' ? LANG_ON : LANG_OFF, isIntake: kind === 'intake'
    };
    const mine = bs && bs.kind === kind ? bs : null;
    // nothing offered and nothing booked for this kind
    if (!mine) return { ...base, waitingText: t.waiting[kind], booked: null, picking: false };

    const booked = mine.booked && !this.state.change ? (() => {
      const i = mine.booked;
      const chip = kind === 'intake' && i.confirmed === true ? t.confirmed : kind === 'intake' && i.confirmed === false ? t.changeAsked : t.upcoming;
      return {
        when: `${dayLabel(mine.when.slice(0, 10), lang)} · ${time(mine.when)}`, chip, cls: chip === t.confirmed ? 'g' : chip === t.changeAsked ? 'y' : 'n',
        sub: kind === 'intake' ? t.bookedSub.intake(staffName(i.who), i.where || INTAKE_WHERE) : t.bookedSub.screening(staffName(i.who)),
        ride: kind === 'intake' ? (i.ride ? t.rideReq : t.rideNone) : ''
      };
    })() : null;
    const tomorrow = M.addDays(s.today, 1);
    const confirmAsk = booked && kind === 'intake' && mine.when.slice(0, 10) === tomorrow && mine.booked.confirmed == null ? t.confirmAsk(time(mine.when)) : '';

    const pick = this.state.pick;
    const days = booked ? [] : openSlots(s, kind).map(d => ({
      label: dayLabel(d.day, lang),
      slots: d.slots.map(x => ({ time: time(x.when), cls: pick?.when === x.when ? 'on' : '', pressed: pick?.when === x.when ? 'true' : 'false', pick: () => this.setState({ pick: x }) }))
    }));
    const chosen = pick && !booked ? { when: `${dayLabel(pick.when.slice(0, 10), lang)} · ${time(pick.when)}`, sub: kind === 'intake' ? t.chosenSub.intake(staffName(pick.who), INTAKE_WHERE) : t.chosenSub.screening(staffName(pick.who)) } : null;

    return {
      ...base, waitingText: '', booked, picking: !booked, days, chosen, confirmAsk,
      rideChecked: this.state.ride ? 'checked' : '', setRide: e => { this.state.ride = e.target.checked; },
      rideToggle: booked && kind === 'intake' ? () => this.ride(!mine.booked.ride) : null, rideLabel: mine.booked?.ride ? t.rideOff : t.rideOn,
      rebook: () => this.setState({ change: true, pick: null, ride: !!mine.booked?.ride }),
      book: () => this.book(kind),
      confirmYes: () => this.confirm('yes'), confirmNo: () => this.confirm('change')
    };
  }
  async book(kind) {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const p = this.state.pick; if (!p) return;
    const by = guardianLabel(ctx);
    if (kind === 'intake') await this.do('intake.book', { client: ctx.client.id, when: p.when, who: p.who, where: INTAKE_WHERE, ride: this.state.ride, by });
    else await this.do('screening.bookByFamily', { referral: ctx.ref.id, when: p.when, who: p.who, by });
    toast(T[lang].thanks[kind]);
    this.setState({ pick: null, change: false });
  }
  async ride(on) { const ctx = this.ctx(); await this.do('intake.ride', { client: ctx.client.id, ride: on, by: guardianLabel(ctx) }); this.setState({}); }
  async confirm(answer) {
    const ctx = this.ctx(); const lang = getLang(ctx.client);
    await this.do('intake.confirm', { client: ctx.client.id, answer, by: guardianLabel(ctx) });
    toast(answer === 'yes' ? T[lang].thanksConfirm : T[lang].thanksChange);
    this.setState({});
  }
  get anchors() {
    const ctx = () => this.ctx();
    return {
      en: () => { setLang('en'); this.setState({}); },
      es: () => { setLang('es'); this.setState({}); },
      back: () => pgo(this.params, 'ParentPortal'),
      call: () => callSheet(this.s, ctx(), getLang(ctx().client))
    };
  }
  set anchors(v) { }
});
