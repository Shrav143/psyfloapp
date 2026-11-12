// 50 · Book a time (phone): "Schedule or confirm an appointment". The family books the screening call, and later the in-person intake, from the
// clinicians' open times (openSlots: a stand-in for their calendars, each time going to the first clinician free). Opened when a clinician marks the
// referral "Qualifies · family books the call" (screening.offer) or the child "Qualifies for TDT · family books the intake" (intake.offer).
// Booking calls screening.bookByFamily / intake.book (with "I need a ride", which lands on the clinician's task list). The day before the intake the
// family confirms or asks to change (intake.confirm). ?kind=screening|intake. Nothing here sends a text; the family sees only what is stored.
import { register, M, toast, esc } from '../app.js';
import * as P from '../shared/sel/portal.js';
import { PortalScreen, getLang, fdate, dayLabel, phref, chip, btn, presChip, childName, openSlots, INTAKE_WHERE } from './ParentPortal.js';

const time = iso => M.fmtTime(iso);
const T = {
  en: {
    title: { screening: 'Book your first call', intake: 'Book the intake visit' }, sub: { screening: c => `${c} · a phone call with a Harvest clinician`, intake: c => `${c} · in person` },
    notYet: 'Nothing to book yet', waiting: { screening: 'Harvest will let you know when it is time to book the first call.', intake: 'After the first call, Harvest will let you know when it is time to book the intake visit.' },
    booked: 'Booked', confirmed: 'Confirmed', changeAsked: 'Change asked', upcoming: 'Booked',
    bookedSub: { screening: who => `${who} will call you. Keep your phone close.`, intake: (who, where) => `With ${who} at ${where}. Bring your Medicaid card.` },
    rideReq: 'Ride requested. Harvest will call you to set it up.', rideNone: 'No ride needed.', rideOn: 'I need a ride after all', rideOff: "I don't need a ride anymore",
    tomorrow: 'Still good for tomorrow?', confirmAsk: w => `Your intake visit is tomorrow, ${w}.`, yes: 'Yes, see you then', change: 'I need to change it',
    pick: 'Pick a time', pickHint: 'Open times from Harvest\'s clinicians.', chosen: 'You picked', chosenSub: { screening: who => `Phone call with ${who}`, intake: (who, where) => `In person with ${who} · ${where}` },
    needRide: 'I need a ride to the intake', bookIt: 'Book this time', rebook: 'Pick a different time',
    thanks: { screening: 'Booked · Harvest has your time', intake: 'Intake booked · Harvest has your time' }, thanksConfirm: 'Thank you · see you tomorrow', thanksChange: 'Harvest will call you to find a new time'
  },
  es: {
    title: { screening: 'Reserve su primera llamada', intake: 'Reserve la cita de admisión' }, sub: { screening: c => `${c} · una llamada con un clínico de Harvest`, intake: c => `${c} · en persona` },
    notYet: 'Todavía no hay nada que reservar', waiting: { screening: 'Harvest le avisará cuando sea hora de reservar la primera llamada.', intake: 'Después de la primera llamada, Harvest le avisará cuando sea hora de reservar la cita de admisión.' },
    booked: 'Reservado', confirmed: 'Confirmado', changeAsked: 'Pidió cambio', upcoming: 'Reservado',
    bookedSub: { screening: who => `${who} le llamará. Tenga su teléfono cerca.`, intake: (who, where) => `Con ${who} en ${where}. Traiga su tarjeta de Medicaid.` },
    rideReq: 'Transporte pedido. Harvest le llamará para organizarlo.', rideNone: 'No necesita transporte.', rideOn: 'Sí necesito transporte', rideOff: 'Ya no necesito transporte',
    tomorrow: '¿Sigue bien para mañana?', confirmAsk: w => `Su cita de admisión es mañana, ${w}.`, yes: 'Sí, nos vemos', change: 'Necesito cambiarla',
    pick: 'Elija una hora', pickHint: 'Horas libres de los clínicos de Harvest.', chosen: 'Usted eligió', chosenSub: { screening: who => `Llamada con ${who}`, intake: (who, where) => `En persona con ${who} · ${where}` },
    needRide: 'Necesito transporte para la cita', bookIt: 'Reservar esta hora', rebook: 'Elegir otra hora',
    thanks: { screening: 'Reservado · Harvest tiene su hora', intake: 'Cita reservada · Harvest tiene su hora' }, thanksConfirm: 'Gracias · nos vemos mañana', thanksChange: 'Harvest le llamará para buscar otra hora'
  }
};

register('ParentSchedule', class extends PortalScreen {
  async setup() { this.state = { pick: null, ride: false, change: false }; }
  kind(bs) { return this.params.kind || (bs && bs.kind) || 'screening'; }
  page() {
    const s = this.s; const ctx = this.ctx(); const c = ctx.client; const lang = getLang(c); const t = T[lang]; const child = childName(c);
    const bs = P.bookingState(s, c, ctx.ref); const kind = this.kind(bs);
    const staffName = id => M.staff(s, id).name;
    const head = { title: t.title[kind], sub: esc(t.sub[kind](child)), pres: presChip('route.ParentSchedule'), lang };
    const mine = bs && bs.kind === kind ? bs : null;
    if (!mine) return { ...head, body: `<section class="fp-card"><h2 class="fp-h2">${t.notYet}</h2><p class="fp-p fp-muted">${t.waiting[kind]}</p></section>` };
    const tomorrow = M.addDays(s.today, 1);
    let body = '';
    if (mine.booked && !this.state.change) {
      const i = mine.booked; const conf = kind === 'intake' && i.confirmed === true; const chg = kind === 'intake' && i.confirmed === false;
      const need = kind === 'intake' && mine.when.slice(0, 10) === tomorrow && i.confirmed == null;
      body = `<section class="fp-card fp-card--ok" aria-labelledby="fp-bk" data-booked="${kind}"><div>${chip(conf ? 'ok' : chg ? 'warn' : 'info', conf ? t.confirmed : chg ? t.changeAsked : t.booked, conf ? 'check' : 'calendar')}</div>
        <h2 class="fp-h2" id="fp-bk">${esc(dayLabel(mine.when.slice(0, 10), lang))} · ${esc(time(mine.when))}</h2>
        <p class="fp-p">${esc(kind === 'intake' ? t.bookedSub.intake(staffName(i.who), i.where || INTAKE_WHERE) : t.bookedSub.screening(staffName(i.who)))}</p>
        ${kind === 'intake' ? `<p class="fp-p fp-muted">${i.ride ? t.rideReq : t.rideNone}</p><button type="button" class="fp-btn fp-btn--o" data-ride-toggle="${i.ride ? 'off' : 'on'}">${i.ride ? t.rideOff : t.rideOn}</button>` : ''}
        <button type="button" class="fp-btn fp-btn--o" data-rebook>${t.rebook}</button></section>`;
      if (need) body = `<section class="fp-card fp-card--next" aria-labelledby="fp-cf" data-confirm-card><h2 class="fp-h2" id="fp-cf">${t.tomorrow}</h2><p class="fp-p">${esc(t.confirmAsk(time(mine.when)))}</p>
        <button type="button" class="fp-btn fp-btn--p" data-confirm="yes">${t.yes}</button><button type="button" class="fp-btn fp-btn--o" data-confirm="change">${t.change}</button></section>` + body;
    } else {
      const pick = this.state.pick;
      const days = openSlots(s, kind);
      body = `<p class="fp-p fp-muted">${t.pickHint}</p>` + days.map(d => `<section class="fp-card" aria-label="${esc(dayLabel(d.day, lang))}"><h2 class="fp-h2">${esc(dayLabel(d.day, lang))}</h2><div class="fp-slots">${d.slots.map(x => `<button type="button" class="fp-slot" data-pick="${esc(x.when + '|' + x.who)}" aria-pressed="${!!(pick && pick.when === x.when)}">${esc(time(x.when))}</button>`).join('')}</div></section>`).join('');
      if (pick) body += `<section class="fp-card fp-card--next" aria-labelledby="fp-ch" role="group"><h2 class="fp-h2" id="fp-ch">${t.chosen}</h2><p class="fp-p"><b>${esc(dayLabel(pick.when.slice(0, 10), lang))} · ${esc(time(pick.when))}</b><br>${esc(kind === 'intake' ? t.chosenSub.intake(staffName(pick.who), INTAKE_WHERE) : t.chosenSub.screening(staffName(pick.who)))}</p>
        ${kind === 'intake' ? `<label class="fp-opt${this.state.ride ? ' on' : ''}"><input type="checkbox" id="fp-ride" data-nobind ${this.state.ride ? 'checked' : ''}> ${t.needRide}</label>` : ''}<button type="button" class="fp-btn fp-btn--p" data-book>${t.bookIt}</button></section>`;
    }
    return { ...head, body };
  }
  afterPaint(root) {
    root.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => { const [when, who] = b.dataset.pick.split('|'); this.setState({ pick: { when, who } }); }; });
    const ride = root.querySelector('#fp-ride'); if (ride) ride.onchange = () => { this.state.ride = ride.checked; };
    root.querySelectorAll('[data-book]').forEach(b => { b.onclick = () => this.book(); });
    root.querySelectorAll('[data-rebook]').forEach(b => { b.onclick = () => { const bs = P.bookingState(this.s, this.ctx().client, this.ctx().ref); this.setState({ change: true, pick: null, ride: !!(bs && bs.booked && bs.booked.ride) }); }; });
    root.querySelectorAll('[data-ride-toggle]').forEach(b => { b.onclick = () => this.rideSet(b.dataset.rideToggle === 'on'); });
    root.querySelectorAll('[data-confirm]').forEach(b => { b.onclick = () => this.confirm(b.dataset.confirm); });
  }
  async book() {
    const ctx = this.ctx(); const lang = getLang(ctx.client); const p = this.state.pick; if (!p) return;
    const bs = P.bookingState(this.s, ctx.client, ctx.ref); const kind = this.kind(bs);
    try {
      if (kind === 'intake') await this.do('intake.book', { client: ctx.client.id, when: p.when, who: p.who, where: INTAKE_WHERE, ride: this.state.ride });
      else await this.do('screening.bookByFamily', { referral: ctx.ref.id, when: p.when, who: p.who });
    } catch { return; }
    toast(T[lang].thanks[kind]); this.setState({ pick: null, change: false });
  }
  async rideSet(on) { const ctx = this.ctx(); try { await this.do('intake.ride', { client: ctx.client.id, ride: on }); } catch { return; } this.repaint(); }
  async confirm(answer) {
    const ctx = this.ctx(); const lang = getLang(ctx.client);
    try { await this.do('intake.confirm', { client: ctx.client.id, answer }); } catch { return; }
    toast(answer === 'yes' ? T[lang].thanksConfirm : T[lang].thanksChange); this.repaint();
  }
});
