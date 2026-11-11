// The recording-consent step (E5, review/05 section 11, rule recording.require_consent_record). A recording never starts before this card
// is answered, the answer is recorded with who agreed and when (scribe.consent), and refusing means the person types.
import { esc } from '../../js/runtime.js';

const WHO = { dpn: [['Only me: I am dictating my own note', 'Staff member (own dictation)']], default: [['Guardian agreed to be recorded', 'Guardian'], ['Student agreed to be recorded', 'Student'], ['Other participant agreed', 'Other participant']] };
export const needsConsent = form => true;
export function consentFor(ctx, client, form) {
  const s = ctx.S(); const me = ctx.me();
  return (s.recording_consents || []).filter(x => x.client === client.id && x.form === form && x.date === (s.clock && s.clock.date || s.today) && x.by === me.id).at(-1) || null;
}
// the card: checkboxes for who agreed, then Record or Type instead
export function consentCard(ctx, form, { label }) {
  const opts = WHO[form] || WHO.default;
  return `<div class="tile t" role="group" aria-labelledby="cn-h"><div class="row w"><h2 id="cn-h" style="flex:1">Before you record</h2>${ctx.ui.maturity('scribe.screening')}</div>
    <div class="small" style="margin-top:4px">Who agreed to be recorded? Audio goes to this browser's speech recognition; Psyflo keeps the text.</div>
    <div class="list" style="margin-top:8px">${opts.map(([t, v], i) => `<label class="row" style="min-height:40px"><input type="checkbox" data-in="consentWho" data-v="${esc(v)}" ${opts.length === 1 ? 'checked' : ''} style="width:20px;height:20px"><span class="small">${esc(t)}</span></label>`).join('')}</div>
    <div class="row w" style="margin-top:10px"><button class="btn p" data-act="consentGive" style="flex:1">Agreed · start recording</button><button class="btn o" data-act="consentDecline" style="flex:1">Type instead</button></div></div>`;
}
