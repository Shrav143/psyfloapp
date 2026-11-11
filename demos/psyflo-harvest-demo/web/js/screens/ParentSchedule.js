// 50 · Book a time (phone). Live: the family books the screening call, and later the in-person intake, from the
// clinicians' open times (openSlots: a stand-in for their Google Calendars, each time going to the first free
// clinician). Opened when a clinician marks the referral "Qualifies · family books the call" (screening.offer) or
// the child "Qualifies for TDT · family books the intake" (intake.offer) on the referral review (7).
// Booking → screening.bookByFamily / intake.book (with "I need a ride", which lands on the clinician's Worklist).
// The day before the intake the family confirms or asks to change (intake.confirm). ?kind=screening|intake.
import { register, Screen, M, toast } from '../app.js';
import { famCtx, getLang, setLang, fdate, pgo, callSheet, childName, guardianLabel, openSlots, bookingState, INTAKE_WHERE, guardHeader, guardFooter } from './ParentPortal.js';
import { C_CSS } from './MobileApp.js';

const DOW = { en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] };
const dayLabel = (d, lang) => `${DOW[lang][M.parse(d).getUTCDay()]} ${fdate(d, lang)}`;
const time = iso => M.fmtTime(iso);

const T = {
  en: {
    title: { screening: 'Book your first call', intake: 'Book the intake visit' },
    waiting: { screening: 'Nothing to book yet', intake: 'Nothing to book yet' },
    booked: 'Booked', upcoming: 'Coming up', confirmed: 'Confirmed', changeAsked: 'Change asked',
    bookedSub: { screening: who => `Call with ${who}`, intake: (who, where) => `${who} · ${where}` },
    rideReq: 'Ride requested', rideNone: 'No ride needed',
    rideOn: 'I need a ride', rideOff: 'No ride needed',
    tomorrow: 'Still good for tomorrow?', confirmAsk: w => `Tomorrow, ${w}`, yes: 'Yes', change: 'Change it',
    pickAnother: 'Pick another time', moreDays: 'More days',
    needRide: 'I need a ride', book: w => `Book ${w}`,
    thanks: { screening: 'Booked · you will get a text to confirm', intake: 'Booked · you will get a reminder the day before' },
    thanksConfirm: 'Thank you · see you tomorrow', thanksChange: 'Harvest will call you to find a new time'
  },
  es: {
    title: { screening: 'Reserve su primera llamada', intake: 'Reserve la cita de admisión' },
    waiting: { screening: 'Nada que reservar todavía', intake: 'Nada que reservar todavía' },
    booked: 'Reservado', upcoming: 'Próximamente', confirmed: 'Confirmado', changeAsked: 'Pidió cambio',
    bookedSub: { screening: who => `Llamada con ${who}`, intake: (who, where) => `${who} · ${where}` },
    rideReq: 'Transporte pedido', rideNone: 'Sin transporte',
    rideOn: 'Necesito transporte', rideOff: 'Sin transporte',
    tomorrow: '¿Sigue bien para mañana?', confirmAsk: w => `Mañana, ${w}`, yes: 'Sí', change: 'Cambiarla',
    pickAnother: 'Elegir otra hora', moreDays: 'Más días',
    needRide: 'Necesito transporte', book: w => `Reservar ${w}`,
    thanks: { screening: 'Reservado · recibirá un mensaje para confirmar', intake: 'Reservado · recibirá un recordatorio el día antes' },
    thanksConfirm: 'Gracias · nos vemos mañana', thanksChange: 'Harvest le llamará para buscar otra hora'
  }
};
const SHORT_DAY = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'] };
const shortDay = (d, lang) => `${SHORT_DAY[lang][M.parse(d).getUTCDay()]} ${fdate(d, lang)}`;

register('ParentSchedule', class extends Screen {
  init() { this.state = { pick: null, ride: false, change: false, more: false }; }
  ctx() { return famCtx(this.s, this.params); }
  renderVals() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang];
    const bs = bookingState(s, ctx);
    const kind = this.params.kind || bs?.kind || 'screening';
    const staffName = id => M.staff(s, id).name;
    const base = { hd: guardHeader(t.title[kind], lang), ft: guardFooter(lang),
      t: { booked: t.booked, tomorrow: t.tomorrow, yes: t.yes, change: t.change, pickAnother: t.pickAnother, moreDays: t.moreDays, needRide: t.needRide }, isIntake: kind === 'intake' };
    const mine = bs && bs.kind === kind ? bs : null;
    // nothing offered and nothing booked for this kind
    if (!mine) return { ...base, waitingText: t.waiting[kind], booked: null, picking: false };

    const booked = mine.booked && !this.state.change ? (() => {
      const i = mine.booked;
      const chip = kind === 'intake' && i.confirmed === true ? t.confirmed : kind === 'intake' && i.confirmed === false ? t.changeAsked : t.upcoming;
      return {
        when: `${shortDay(mine.when.slice(0, 10), lang)} · ${time(mine.when)}`, chip, cls: chip === t.confirmed ? 'ok' : chip === t.changeAsked ? 'y' : 'n',
        sub: kind === 'intake' ? t.bookedSub.intake(staffName(i.who), i.where || INTAKE_WHERE) : t.bookedSub.screening(staffName(i.who)),
        ride: kind === 'intake' ? (i.ride ? t.rideReq : t.rideNone) : ''
      };
    })() : null;
    const tomorrow = M.addDays(s.today, 1);
    const confirmAsk = booked && kind === 'intake' && mine.when.slice(0, 10) === tomorrow && mine.booked.confirmed == null ? t.confirmAsk(time(mine.when)) : '';

    const pick = this.state.pick;
    const all = booked ? [] : openSlots(s, kind);
    const days = (this.state.more ? all : all.slice(0, 2)).map(d => ({
      label: shortDay(d.day, lang),
      slots: d.slots.map(x => ({ time: time(x.when), cls: pick?.when === x.when ? 'on' : '', pressed: pick?.when === x.when ? 'true' : 'false', pick: () => this.setState({ pick: x }) }))
    }));
    const chosen = pick && !booked ? { label: t.book(`${shortDay(pick.when.slice(0, 10), lang)}, ${time(pick.when)}`) } : null;

    return {
      ...base, waitingText: '', booked, picking: !booked, days, chosen, confirmAsk,
      moreDays: !booked && !this.state.more && all.length > 2, showMore: () => this.setState({ more: true }),
      rideChecked: this.state.ride ? 'checked' : '', setRide: e => { this.state.ride = e.target.checked; },
      rideToggle: booked && kind === 'intake' ? () => this.ride(!mine.booked.ride) : null, rideLabel: mine.booked?.ride ? t.rideOff : t.rideOn,
      rebook: () => this.setState({ change: true, pick: null, ride: !!mine.booked?.ride }),
      book: () => this.book(kind),
      confirmYes: () => this.confirm('yes'), confirmNo: () => this.confirm('change')
    };
  }
  get css() { return C_CSS; }
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
