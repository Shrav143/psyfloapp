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
