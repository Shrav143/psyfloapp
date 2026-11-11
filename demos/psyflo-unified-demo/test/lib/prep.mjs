// Preconditions for suites that need a case in a given state, set through actions and the mock Lauris (never through another suite).
import fs from 'node:fs';
import { api, state, reset, lpost, lget, bridge } from './index.mjs';

// T.W. is in Lauris (Harvest # 4492), family link submitted, eligibility recorded, consent signed: the state Flow C starts from.
export async function prepTW() {
  await reset('live');
  const { token } = await api('familyLink.send', { referral: 'REF-118' }, 'jperez');
  await api('familyLink.open', { token });
  await api('familyLink.step', { token, step: 'guardian', answers: { guardian_name: 'Denise Rivers', relationship: 'grandmother', phone: '(434) 555-0147', language: 'English' } });
  await api('familyLink.step', { token, step: 'insurance', answers: { plan_kind: 'Medicaid through a health plan', medicaid_id: '0912 456 789 01', dob: '2014-03-14' } });
  await api('familyLink.submit', { token });
  await api('eligibility.record', { referral: 'REF-118', result: 'active', plan: 'humana', effective: '2026-07-01' }, 'jperez');
  const r = await lpost('/consumers/new', 'jperez', { initials: 'T.W.', program: 'TDT', locality: 'Lynchburg City', school: 'Lynchburg City · MS-2', staff: 'J. Perez, LPC', guardian: 'Denise Rivers', guardian_phone: '(434) 555-0147' });
  const no = Number((r.loc || '').match(/consumers\/(\d+)/)?.[1]);
  if (!no) throw new Error('could not create T.W. in the mock Lauris: ' + r.status);
  await api('referral.inLauris', { id: 'REF-118', no }, 'jperez');
  // the screening call: drafted from the scripted transcript, then a person processes it in Lauris (the page bridge reports it)
  const transcript = fs.readFileSync(new URL('../../seed/scripts/screening_TW.txt', import.meta.url), 'utf8');
  await api('screening.drafted', { client: 'TW', referral: 'REF-118', transcript }, 'jperez');
  const sp = await lpost(`/consumers/${no}/session/screening`, 'jperez', { action: 'process' });
  const sid = (sp.loc || '').match(/processed=(\d+)/)?.[1];
  const j = await bridge('lauris.observed', { event: 'processed', session: sid, form: 'screening', consumer: { no: String(no), initials: 'T.W.' }, values: {}, typed: [], user: 'J. Perez, LPC' });
  if (!j.ok) throw new Error('screening processed event: ' + j.error);
  return { no, token };
}

// ---- the UI/HTTP path to later T.W. checkpoints (a person's clicks in Lauris, reported by the page bridge), used to prove the fixtures ----
import { draftSeeded, draftInitialSRA } from '../../web/js/shared/draft.js';
import { sleep } from './index.mjs';
const bridgeEv = (no, form, sid, event = 'processed', values = {}, extra = {}) => bridge('lauris.observed', { event, session: String(sid), form, consumer: { no: String(no), initials: 'T.W.' }, values, typed: [], user: 'J. Perez, LPC', ...extra });
const sidOf = r => (r.loc || '').match(/processed=(\d+)/)?.[1];
const fields = async (form, values) => {   // map label -> f<i> for the mock Lauris form post
  const { FORMS } = await import('../../server/lauris/forms.js');
  const out = { action: 'process' }; FORMS[form].fields.forEach((f, i) => { if (values[f.label] != null && !['table', 'phq', 'static'].includes(f.type)) out['f' + i] = values[f.label]; });
  return out;
};
export async function prepTWTo(stage) {
  const { no } = await prepTW();
  if (stage === 'screened') return { no };
  const st = await state('jperez'); const tw = st.clients.find(c => c.id === 'TW');
  const cna = await lpost(`/consumers/${no}/session/cna`, 'jperez', { action: 'process' }); await bridgeEv(no, 'cna', sidOf(cna));
  const d = draftSeeded('isp', { client: tw, screening: st.screenings.find(x => x.client === 'TW'), today: st.today });
  const vals = Object.fromEntries(d.boxes.map(b => [b.label, b.value]));
  const isp = await lpost(`/consumers/${no}/session/isp`, 'jperez', await fields('isp', vals)); const j = await bridgeEv(no, 'isp', sidOf(isp), 'processed', vals);
  if (!j.ok) throw new Error('isp: ' + j.error);
  if (stage === 'isp-ready') return { no };
  const s2 = await state('jperez'); const sc = s2.screenings.find(x => x.client === 'TW');
  const sra = draftInitialSRA({ client: tw, screening: { facts: sc.facts, when: sc.when }, referral: s2.referrals.find(r => r.id === 'REF-118'), today: s2.today, request: s2.requests.find(r => r.id === 'R-0416') });
  const sv = Object.fromEntries(sra.boxes.map(b => [b.label, b.value]));
  const p = await lpost(`/consumers/${no}/session/sra-initial`, 'jperez', await fields('sra-initial', sv)); const sid = sidOf(p);
  await bridgeEv(no, 'sra-initial', sid, 'processed', sv);
  await api('request.approve', { id: 'R-0416', comment: 'fixture' }, 'jperez');
  await lpost(`/approvals/${sid}/sign`, 'jperez', {});
  await bridgeEv(no, 'sra-initial', sid, 'signed', {}, { preview: { title: 'TDT Initial SRA', rows: sra.boxes.map(b => ({ label: b.label, value: b.value })) } });
  if (stage === 'signed') return { no };
  await api('request.send', { id: 'R-0416' }, 'jperez'); await sleep(3600);
  return { no };
}
