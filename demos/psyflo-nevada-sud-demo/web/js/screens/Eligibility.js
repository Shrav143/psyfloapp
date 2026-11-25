// 9 · Nevada Medicaid eligibility (Live). ?referral=REF-118 (default).
// A person runs the Nevada Medicaid EVS lookup in their own login and records what it shows (an MCO or FFS);
// Psyflo keeps the dated proof and sets a monthly re-check. No Medicaid → Ryan White / SAPTA grant, no PA.
import { register, Screen, M, api, modal, esc } from '../app.js';
import { refStudent } from './Referrals.js';

const PLAN_NAME = p => p ? (p.name || p.id) : '';

register('Eligibility', class extends Screen {
  init() { this.state = { form: null, recheck: false }; }
  get refId() { const s = this.s; const id = this.params.referral || this.params.id || 'REF-118'; return M.byId(s.referrals, id) ? id : 'REF-118'; }
  get css() { return '.f{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#525B66;font-weight:600;margin-bottom:4px}.fld{border:1px solid #E6E1D9;border-radius:8px;padding:0 12px;background:#fff;font:inherit;font-size:13px;width:100%;min-height:40px;color:#151B24}'; }
  renderVals() {
    const s = this.s; const id = this.refId;
    const r = M.byId(s.referrals, id) || { id, client: '' };
    const el = M.eligibilityFor(s, id);
    const c = M.byId(s.clients, r.client || el?.client);
    const client = refStudent(s, r);
    const status = el?.status === 'recorded' ? 'recorded' : 'details';
    const payer = M.byId(s.payers, el?.plan);
    const active = el?.result === 'active';
    const screened = s.screenings.find(x => x.referral === id);
    const form = this.state.form || (this.state.form = { result: 'active', plan: el?.plan || c?.medicaid?.plan || '', effective: el?.effective || '', mid: [el?.lookup?.medicaid_id, c?.medicaid?.id, r.form?.medicaid_id].find(v => /\d{4}/.test(String(v || ''))) || '' });

    let hdrChip, hdrCls;
    if (status === 'recorded') { hdrChip = `EVS checked ${M.fmtDateTime(el.checked_at)} · ${active ? 'active' : 'not active'}`; hdrCls = active ? 'g' : 'r'; }
    else if (r.stage === 'grant_program') { hdrChip = 'Routed to the grant · no PA'; hdrCls = 'n'; }
    else { hdrChip = 'EVS check not recorded yet'; hdrCls = 'y'; }

    const title = status === 'recorded' ? `${client} · Nevada Medicaid ${el.result}` : `${client} · check Nevada Medicaid in EVS`;

    let k1 = '—', k1s = 'an MCO or Nevada Medicaid FFS', k2 = 'not yet', k2s = 'a person runs the EVS lookup', k3 = 'after the check', k3s = 'then every month while in treatment';
    if (status === 'recorded') {
      k1 = active ? (payer?.short || PLAN_NAME(payer) || 'Active') : 'Not active';
      k1s = active ? `${payer?.id === 'ffs' ? 'Fee-for-service' : 'Medicaid MCO'}${el.effective ? ' · effective ' + M.fmtDate(el.effective, { year: true }) : ''}` : 'Ryan White / SAPTA grant, or hold the referral';
      k2 = M.fmtDateTime(el.checked_at);
      k2s = `EVS · checked by ${M.staffShort(s, el.checked_by)}`;
      k3 = M.fmtDate(el.next_check, { dow: true }); k3s = 'reminder: run the check again';
    }

    const lk = { member: c ? `${c.initials}${c.age ? ', ' + c.age : ''} · ${M.school(s, c.school).name}` : client, id: form.mid, dob: (c?.dob || r.form?.dob) ? M.fmtDate(c?.dob || r.form.dob, { year: true }) : 'from the ID card at intake', kind: r.form?.insurance || (r.form?.medicaid === 'no' ? 'No Medicaid per the referral' : 'Nevada Medicaid, plan not known') };
    const dmasHref = `${api.config.extURL}/dmas/lookup?id=${encodeURIComponent(form.mid || '')}`;

    const rows = [];
    if (status === 'recorded') {
      [...(el.history || []), el].forEach((h, i) => rows.push({ i, date: M.fmtDate(h.checked_at), result: h.result, cls: h.result === 'active' ? 'g' : 'r', plan: PLAN_NAME(M.byId(s.payers, h.plan)) || '—', proof: `EVS screenshot · ${M.fmtTime(h.checked_at) || M.fmtDate(h.checked_at)}` }));
      rows.push({ date: M.fmtDate(el.next_check), result: 'scheduled', cls: 'n', plan: '—', proof: '' });
    } else rows.push({ date: M.fmtDate(s.today), result: 'ready to run', cls: 'y', plan: '—', proof: '' });
    const due = status === 'recorded' && el.next_check <= s.today;
    const showForm = status === 'details' || (status === 'recorded' && (this.state.recheck || due));

    return {
      refId: id, refHref: 'Referral.dc.html?id=' + id, hdrChip, hdrCls, title,
      isRecorded: status === 'recorded', isDetails: status === 'details', isWaiting: false, isActive: active,
      screenHref: c ? 'ExtScreening.dc.html?client=' + c.id : 'ExtScreening.dc.html?referral=' + id, screenLabel: screened ? 'Open the screening in Client Record' : 'Intake screening in Client Record',
      grantHref: `Referral.dc.html?id=${id}&grant=1`,
      k1, k1s, k2, k2s, k3, k3s,
      showForm, formTitle: status === 'recorded' ? 'Re-check · run the EVS lookup again' : 'Run the EVS lookup and record the result',
      detailsAt: 'from the referral and the Medicaid card', lk, dmasHref, form,
      resultChips: [['active', 'Active'], ['inactive', 'Not active']].map(([v, l]) => ({ l, on: form.result === v, cls: 'chp' + (form.result === v ? ' on' : ''), pick: () => this.setState({ form: { ...form, result: v } }) })),
      planChips: [{ id: '', l: form.result === 'active' ? 'Pick the plan EVS shows' : 'None' }].concat(s.payers.map(p => ({ id: p.id, l: p.short || p.name }))).map(o => ({ l: o.l, on: (form.plan || '') === o.id, cls: 'chp' + ((form.plan || '') === o.id ? ' on' : ''), pick: () => this.setState({ form: { ...form, plan: o.id } }) })),
      hist: rows,
      canRecheck: status === 'recorded' && !due, recheckLabel: this.state.recheck ? 'Cancel the re-check' : 'Record a re-check',
      recheckNote: `Re-check due ${M.fmtDate(el?.next_check, { dow: true })} · Do next reminds ${M.staffShort(s, el?.checked_by || 'dowens')}`,
      holdLabel: r.hold ? 'Lift the hold' : 'Hold the referral (Medicaid pending)',
      setResult: e => this.setState({ form: { ...form, result: e.target.value } }),
      setPlan: e => { form.plan = e.target.value; }, setEff: e => { form.effective = e.target.value; }, setMid: e => { form.mid = e.target.value; },
      toggleRecheck: () => this.setState({ recheck: !this.state.recheck }),
      record: async () => {
        if (form.result === 'active' && !form.plan) return this.toast('Pick the plan EVS shows', 'err');
        if (form.result === 'active' && !form.effective) return this.toast('Add the effective date EVS shows', 'err');
        const res = await this.do('eligibility.recordEVS', { referral: id, result: form.result, plan: form.plan || null, effective: form.effective || null, medicaid_id: form.mid || null, by: this.me?.id || 'dowens' });
        if (!res) return;
        this.state.recheck = false; this.state.form = null;
        this.toast(`Recorded · ${res.screenshot} stored in Psyflo · re-check reminder set`);
        this.setState({});
      }
    };
  }
  proof(h) {
    const s = this.s; const el = M.eligibilityFor(s, this.refId);
    if (!h) return;
    if (h.file) { window.open(h.file, '_blank', 'noopener'); return; }
    const payer = M.byId(s.payers, h.plan);
    modal(`<h2>${esc(h.screenshot || 'EVS screenshot')}</h2><p style="color:#525B66;font-size:13px">Proof kept in Psyflo · seeded record (the demo has no image for checks made before it started)</p>
      <div style="border:1px solid #E6E1D9;border-radius:10px;padding:14px;margin:12px 0;font-size:13px;background:#F8F6F2"><b>Nevada Medicaid · EVS eligibility lookup</b><br>Result: <b>${esc(h.result)}</b>${payer ? ' · ' + esc(payer.name) : ''}${h.effective ? ' · effective ' + esc(M.fmtDate(h.effective, { year: true })) : ''}<br>Looked up ${esc(M.fmtDateTime(h.checked_at, { year: true }))} by ${esc(M.staff(s, h.checked_by).name)} in their own EVS login</div>
      <button class="mbtn p" data-close>Close</button>`);
  }
  get anchors() {
    return {
      proof: () => { const el = M.eligibilityFor(this.s, this.refId); if (el?.status === 'recorded') this.proof(el); else this.toast('No check recorded yet'); },
      p1: (e, a) => { const el = M.eligibilityFor(this.s, this.refId); if (!el) return; const list = [...(el.history || []), el]; this.proof(list[+a.dataset.i] || el); },
      hold: () => {
        const id = this.refId; const r = M.byId(this.s.referrals, id);
        if (r?.hold) { this.do('referral.unholdNV', { id, by: this.me?.id || 'jperez' }).then(() => this.toast('Hold lifted')); return; }
        modal(`<h2>Hold ${esc(id)}</h2><p>The referral stays in Referrals with a hold and a reminder to re-check EVS. Call the client about coverage; nothing is sent from Psyflo.</p>
          <div style="font-size:13px;margin:10px 0 6px">Why</div><div class="segm" id="holdwhy" role="radiogroup" aria-label="Why" style="flex-direction:column;align-items:stretch"><button type="button" role="radio" aria-checked="true" class="on" data-v="Medicaid application pending">Medicaid application pending</button><button type="button" role="radio" aria-checked="false" data-v="Medicaid not active">Medicaid not active</button><button type="button" role="radio" aria-checked="false" data-v="Medicaid ID did not match · ask the client">Medicaid ID did not match · ask the client</button></div>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" id="holdgo">Hold the referral</button><button class="mbtn" data-close>Cancel</button></div>`,
          (box, close) => { box.querySelectorAll('#holdwhy button').forEach(b => b.onclick = () => box.querySelectorAll('#holdwhy button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); })); box.querySelector('#holdgo').onclick = async () => { const why = box.querySelector('#holdwhy .on').dataset.v; close(); await this.do('referral.holdNV', { id, why, by: this.me?.id || 'jperez' }); this.toast('Referral held'); }; });
      }
    };
  }
  set anchors(v) { }
});
