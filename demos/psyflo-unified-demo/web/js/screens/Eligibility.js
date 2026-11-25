// 9 · Eligibility check (Live). ?referral=REF-118 (default).
// waiting for the family link → details received, run the check (lookup details prepared from the link;
// a person runs the DMAS lookup in their own login) → a person records the result → dated proof + weekly re-check.
// Rule 5: never checked from the school's referral alone.
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
    const el = M.eligibilityFor(s, id); const fl = M.familyLinkFor(s, id);
    const c = M.byId(s.clients, r.client || el?.client);
    const student = refStudent(s, r);
    const status = el?.status === 'recorded' ? 'recorded' : el?.status === 'details_received' ? 'details' : 'waiting';
    const lookup = el?.lookup || (fl?.submitted_at ? { medicaid_id: fl.answers?.medicaid_id, dob: fl.answers?.dob, plan_kind: fl.answers?.plan_kind } : null);
    const payer = M.byId(s.payers, el?.plan);
    const active = el?.result === 'active';
    const screened = s.screenings.find(x => x.referral === id);
    const form = this.state.form || (this.state.form = { result: 'active', plan: (M.byId(s.payers, fl?.answers?.plan) ? fl.answers.plan : el?.plan) || '', effective: el?.effective || '' });

    // header chip
    let hdrChip, hdrCls;
    if (status === 'recorded') { hdrChip = `Family link submitted ${M.fmtDateTime(fl?.submitted_at || el.details_at)} · checked ${M.fmtDate(el.checked_at)}`.replace('submitted  ·', 'submitted ·'); hdrCls = active ? 'g' : 'r'; }
    else if (status === 'details') { hdrChip = `Family link submitted ${M.fmtDateTime(fl?.submitted_at || el.details_at)} · check not run yet`; hdrCls = 'y'; }
    else if (fl?.sent_at) { hdrChip = `Family link sent ${M.fmtDateTime(fl.sent_at)} · ${fl.opened_at ? 'opened · ' : ''}not submitted yet`; hdrCls = 'n'; }
    else { hdrChip = 'Family link not sent yet'; hdrCls = 'n'; }

    const title = status === 'recorded' ? `${student} · Medicaid ${el.result}` : status === 'details' ? `${student} · details received — run the check` : `${student} · waiting for the family link`;

    // KPIs
    let k1 = '—', k1s = 'asked on the family link (step 2)', k2 = 'not yet', k2s = 'never from the school\'s referral alone', k3 = 'after the check', k3s = 'then every week while in service';
    if (status === 'details') { k1s = 'per the guardian: ' + (lookup?.plan_kind || 'insurance step done'); k2s = 'a person runs the DMAS lookup'; }
    if (status === 'recorded') {
      k1 = active ? PLAN_NAME(payer) || 'Active' : 'Not active';
      k1s = active ? `Cardinal Care · effective ${M.fmtDate(el.effective, { year: true })}` : 'route to the grant program or hold the referral';
      k2 = M.fmtDateTime(el.checked_at);
      const nextMorning = fl?.submitted_at && M.daysBetween(fl.submitted_at, el.checked_at) === 1;
      k2s = `DMAS portal · checked by ${M.staffShort(s, el.checked_by)}${nextMorning ? ' the next morning' : ''}`;
      k3 = M.fmtDate(el.next_check, { dow: true }); k3s = 'reminder every week: run the check';
    }

    // family link steps while waiting
    const done = k => !!fl?.submitted_at || !!fl?.steps?.[k];
    const step = (text, k) => ({ text, ...(done(k) ? { chip: 'done', cls: 'g' } : { chip: 'not yet', cls: fl?.sent_at ? 'y' : 'n' }) });
    const flSteps = [step('Guardian name, relationship, phone', 'guardian'), step('Insurance: plan, Medicaid ID, date of birth (step 2)', 'insurance'), step('Consent to be contacted · best time', 'consent')];
    const flChip = fl?.submitted_at ? 'submitted' : fl?.opened_at ? 'opened · not submitted' : fl?.sent_at ? 'sent · not opened yet' : 'not sent yet';

    // lookup details
    const dobText = lookup?.dob ? (/^\d{4}-\d{2}-\d{2}$/.test(lookup.dob) ? M.fmtDate(lookup.dob, { year: true }) : lookup.dob) : '—';
    const lk = { member: c ? `${c.initials}${c.age ? ', ' + c.age : ''} · ${M.school(s, c.school).name}` : student, id: lookup?.medicaid_id || '— not given on the link —', dob: dobText, kind: lookup?.plan_kind || '—' };
    const dmasHref = `${api.config.extURL}/dmas/lookup?id=${encodeURIComponent(lookup?.medicaid_id || '')}&dob=${encodeURIComponent(lookup?.dob || '')}`;

    // history: earlier checks, the current one, the next scheduled one
    const rows = [];
    if (status === 'recorded') {
      [...(el.history || []), el].forEach((h, i) => rows.push({ i, date: M.fmtDate(h.checked_at), result: h.result, cls: h.result === 'active' ? 'g' : 'r', plan: PLAN_NAME(M.byId(s.payers, h.plan)) || '—', proof: `screenshot · ${M.fmtTime(h.checked_at) || M.fmtDate(h.checked_at)}` }));
      rows.push({ date: M.fmtDate(el.next_check), result: 'scheduled', cls: 'n', plan: '—', proof: '' });
    } else rows.push({ date: status === 'details' ? M.fmtDate(s.today) : '—', result: status === 'details' ? 'ready to run' : 'waiting for the family link', cls: status === 'details' ? 'y' : 'n', plan: '—', proof: '' });
    const due = status === 'recorded' && el.next_check <= s.today;
    const showForm = status === 'details' || (status === 'recorded' && (this.state.recheck || due));

    return {
      refId: id, refHref: 'Referral.dc.html?id=' + id, hdrChip, hdrCls, title,
      isRecorded: status === 'recorded', isDetails: status === 'details', isWaiting: status === 'waiting', isActive: active,
      screenHref: 'ExtScreening.dc.html?referral=' + id, screenLabel: screened ? 'Open the screening in Lauris' : 'Schedule the screening call',
      grantHref: `Referral.dc.html?id=${id}&grant=1`,
      canSend: !fl?.submitted_at && !r.history && !['grant_program', 'declined', 'in_service'].includes(r.stage), sendLabel: fl?.sent_at ? 'Send the link again' : 'Send the family link',
      k1, k1s, k2, k2s, k3, k3s, flSteps, flChip, flCls: fl?.submitted_at ? 'g' : fl?.sent_at ? 'y' : 'n',
      showForm, formTitle: status === 'recorded' ? 'Weekly re-check · run the lookup again' : 'Details received — run the check',
      detailsAt: M.fmtDateTime(el?.details_at || fl?.submitted_at), lk, dmasHref, form,
      resultOpts: [['active', 'Active'], ['inactive', 'Not active']].map(([v, t]) => ({ v, t, sel: form.result === v ? 'selected' : '' })),
      planOpts: [{ v: '', t: form.result === 'active' ? '— pick the plan DMAS shows —' : '— none —', sel: !form.plan ? 'selected' : '' }].concat(s.payers.map(p => ({ v: p.id, t: p.name, sel: form.plan === p.id ? 'selected' : '' }))),
      hist: rows,
      canRecheck: status === 'recorded' && !due, recheckLabel: this.state.recheck ? 'Cancel the re-check' : 'Record a re-check',
      recheckNote: `Re-check due ${M.fmtDate(el?.next_check, { dow: true })} · Do next reminds ${M.staffShort(s, el?.checked_by || 'jperez')}`,
      holdLabel: r.hold ? 'Lift the hold' : 'Hold the referral and tell the family',
      setResult: e => this.setState({ form: { ...form, result: e.target.value } }),
      setPlan: e => { form.plan = e.target.value; }, setEff: e => { form.effective = e.target.value; },
      toggleRecheck: () => this.setState({ recheck: !this.state.recheck }),
      record: async () => {
        if (form.result === 'active' && !form.plan) return this.toast('Pick the plan DMAS shows', 'err');
        if (form.result === 'active' && !form.effective) return this.toast('Add the effective date DMAS shows', 'err');
        const res = await this.do('eligibility.recordProof', { referral: id, result: form.result, plan: form.plan || null, effective: form.effective || null, by: this.me?.id || 'jperez' });
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
    modal(`<h2>${esc(h.screenshot || 'DMAS screenshot')}</h2><p style="color:#525B66;font-size:13px">Proof kept in Psyflo, not in Lauris · seeded record (the demo has no image for checks made before it started)</p>
      <div style="border:1px solid #E6E1D9;border-radius:10px;padding:14px;margin:12px 0;font-size:13px;background:#F8F6F2"><b>Virginia Medicaid (DMAS) · eligibility lookup</b><br>Result: <b>${esc(h.result)}</b>${payer ? ' · ' + esc(payer.name) : ''}${h.effective ? ' · effective ' + esc(M.fmtDate(h.effective, { year: true })) : ''}<br>Looked up ${esc(M.fmtDateTime(h.checked_at, { year: true }))} by ${esc(M.staff(s, h.checked_by).name)} in their own DMAS login</div>
      <button class="mbtn p" data-close>Close</button>`);
  }
  get anchors() {
    return {
      proof: () => { const el = M.eligibilityFor(this.s, this.refId); if (el?.status === 'recorded') this.proof(el); else this.toast('No check recorded yet'); },
      p1: (e, a) => { const el = M.eligibilityFor(this.s, this.refId); if (!el) return; const list = [...(el.history || []), el]; this.proof(list[+a.dataset.i] || el); },
      sendlink: async () => { await this.do('familyLink.send', { referral: this.refId, by: this.me?.id || 'jperez' }); this.toast('Family link sent by text (SMS stub) · see it on the referral'); },
      hold: () => {
        const id = this.refId; const r = M.byId(this.s.referrals, id);
        if (r?.hold) { this.do('referral.unhold', { id, by: this.me?.id || 'jperez' }).then(() => this.toast('Hold lifted')); return; }
        modal(`<h2>Hold ${esc(id)} and tell the family</h2><p>The referral stays in Referrals with a hold. Psyflo texts the guardian that Harvest will call about coverage (SMS stub · logged on the referral).</p>
          <label style="display:block;font-size:13px;margin:10px 0 4px">Why</label><select id="holdwhy" class="mbtn" style="width:100%"><option>Medicaid not active</option><option>Medicaid ID did not match · ask the guardian</option><option>Waiting for the guardian to renew coverage</option></select>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" id="holdgo">Hold and text the guardian</button><button class="mbtn" data-close>Cancel</button></div>`,
          (box, close) => box.querySelector('#holdgo').onclick = async () => { const why = box.querySelector('#holdwhy').value; close(); await this.do('referral.hold', { id, why, by: this.me?.id || 'jperez' }); this.toast('Referral held · guardian texted (SMS stub)'); });
      }
    };
  }
  set anchors(v) { }
});
