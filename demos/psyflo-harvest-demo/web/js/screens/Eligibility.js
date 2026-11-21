// 9 · Eligibility (route Eligibility).
//  · no parameter: the weekly "Eligibility re-verification" list (rows of s.eligibility with kind 'reverify'), due today first.
//    Verify opens a small modal: a link to the mock DMAS lookup, Active/Inactive, plan and a required dated screenshot, then
//    eligibility.verify. A person runs the DMAS lookup in their own login; Psyflo only stores the proof and reminds.
//  · ?referral=REF-118: the first verification for a referral, only after the family link is submitted (brief rule 5).
import { register, Screen, M, api, modal, esc, raw, toast } from '../app.js';
import { PART, HELP } from '../shared/labels.js';
import { refStudent, dateHead, showProof, B1_CSS, noop } from './Referrals.js';

const SHOT_ICON = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="9" cy="10" r="1.6"></circle><path d="M4 18l5-5 4 4 3-3 4 4"></path></svg>';

// the picked image as a JPEG data URL (the proof PDF embeds JPEG), at most 1000 px wide
const toJpeg = file => new Promise((res, rej) => {
  const img = new Image(); const url = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, 1000 / img.width); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.8));
  };
  img.onerror = () => rej(new Error('Could not read that image')); img.src = url;
});

register('Eligibility', class extends Screen {
  init() { this.state = { form: null, recheck: false }; }
  get refId() { const id = this.params.referral || this.params.id; return id && M.byId(this.s.referrals, id) ? id : null; }
  renderVals() { return { isRef: !!this.refId, isList: !this.refId, dateText: dateHead(this.s), ...(this.refId ? this.referralVals() : this.listVals()) }; }

  // ---------- weekly re-verification list ----------
  listVals() {
    const s = this.s; const t = s.today;
    const rows = s.eligibility.filter(e => e.kind === 'reverify').slice()
      .sort((a, b) => String(a.next_check).localeCompare(String(b.next_check)) || String(a.checked_at).localeCompare(String(b.checked_at)))
      .map(e => {
        const label = M.clientLabel(s, e.client); const active = e.result === 'active'; const late = e.next_check < t; const due = e.next_check <= t;
        return {
          student: label, last: M.fmtDate(e.checked_at), result: active ? 'Active' : 'Inactive', resultCls: 'u-chip ' + (active ? 'ok' : 'r'),
          next: M.fmtDate(e.next_check), nextCls: due ? 'u-chip ' + (late ? 'r' : 'y') : '', shot: e.screenshot || '',
          proof: () => showProof(s, e, label), verify: () => this.verify(e)
        };
      });
    return { rows, empty: !rows.length, helpProof: HELP.proof, verifyLabel: PART.verify };
  }
  verify(e) {
    const s = this.s; const label = M.clientLabel(s, e.client);
    const plans = s.payers.map(p => `<option value="${esc(p.id)}"${p.id === e.plan ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
    // the Medicaid ID comes from the family link when there is one; the demo's lookup page takes any ID (synthetic placeholder otherwise)
    const mid = (s.family_links.find(f => f.client === e.client)?.answers?.medicaid_id) || '0912 000 000 00';
    const dmas = `${api.config.extURL}/dmas/lookup?id=${encodeURIComponent(mid)}`;
    modal(`<h2>${PART.verify} · ${esc(label)}</h2>
      <a class="u-link" href="${esc(dmas)}" target="_blank" rel="noopener">Open DMAS ↗</a>
      <label class="b1-lbl" for="b1-res">Result</label><select id="b1-res" class="u-sel" style="width:100%"><option value="active" selected>Active</option><option value="inactive">Inactive</option></select>
      <label class="b1-lbl" for="b1-plan">Plan</label><select id="b1-plan" class="u-sel" style="width:100%">${plans}</select>
      <label class="b1-lbl" for="b1-file">Screenshot</label>
      <div style="display:flex;gap:8px;align-items:center"><input id="b1-file" type="file" accept="image/*" class="u-in" style="flex:1;min-width:0;padding:6px"><button type="button" class="u-btn" id="b1-demo">Use the DMAS screenshot</button></div>
      <div id="b1-shot" class="u-mut" style="min-height:20px;margin-top:6px"></div>
      <div class="b1-mact"><button type="button" class="mbtn p" data-go aria-disabled="true" title="Add the screenshot">Save</button><button type="button" class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => {
        let shot = null; const go = box.querySelector('[data-go]');
        const set = (x, text) => { shot = x; box.querySelector('#b1-shot').textContent = '✓ ' + text; go.removeAttribute('aria-disabled'); go.removeAttribute('title'); };
        box.querySelector('#b1-demo').onclick = () => set({ demo: true }, 'DMAS screenshot');
        box.querySelector('#b1-file').onchange = async ev => {
          const f = ev.target.files[0]; if (!f) return;
          try { set({ image: await toJpeg(f) }, f.name); } catch (err) { toast(err.message, 'err'); }
        };
        go.onclick = () => {
          if (!shot) return toast('Add the screenshot', 'err');
          const result = box.querySelector('#b1-res').value; const plan = box.querySelector('#b1-plan').value; close();
          this.saveVerify(e, { result, plan, image: shot.image });
        };
      });
  }
  async saveVerify(e, { result, plan, image }) {
    const by = this.me?.id || 'jperez';
    try {
      const proof = await this.do('b1.eligibilityProof', { client: e.client, result, plan, image, by });
      const res = await this.do('eligibility.verify', { client: e.client, result, plan, by, screenshot: proof.name });
      toast(`Verified · next due ${M.fmtDate(res.next_check)}`);
    } catch { }
  }

  // ---------- first verification for a referral ----------
  referralVals() {
    const s = this.s; const id = this.refId; const r = M.byId(s.referrals, id); const by = this.me?.id || 'jperez';
    const el = M.eligibilityFor(s, id); const fl = M.familyLinkFor(s, id); const student = refStudent(s, r);
    const status = el?.status === 'recorded' ? 'recorded' : el?.status === 'details_received' ? 'details' : 'waiting';
    const lookup = el?.lookup || (fl?.submitted_at ? { medicaid_id: fl.answers?.medicaid_id, dob: fl.answers?.dob, plan_kind: fl.answers?.plan_kind } : null);
    const payer = M.byId(s.payers, el?.plan); const active = el?.result === 'active';
    const form = this.state.form || (this.state.form = { result: 'active', plan: (M.byId(s.payers, fl?.answers?.plan) ? fl.answers.plan : el?.plan) || '', effective: el?.effective || '' });
    const due = status === 'recorded' && el.next_check <= s.today;
    const showForm = status === 'details' || (status === 'recorded' && (this.state.recheck || due));
    const sent = !!fl?.sent_at;
    const dobText = lookup?.dob ? (/^\d{4}-\d{2}-\d{2}$/.test(lookup.dob) ? M.fmtDate(lookup.dob, { year: true }) : lookup.dob) : '—';
    const facts = lookup ? [{ k: 'Medicaid ID', v: lookup.medicaid_id || '—' }, { k: 'Date of birth', v: dobText }, { k: 'Plan', v: lookup.plan_kind || '—' }] : [];
    const dmas = `${api.config.extURL}/dmas/lookup?id=${encodeURIComponent(lookup?.medicaid_id || '')}&dob=${encodeURIComponent(lookup?.dob || '')}`;
    const hist = (status === 'recorded' ? [...(el.history || []), el] : []).map(h => ({
      date: M.fmtDate(h.checked_at), result: h.result === 'active' ? 'Active' : 'Inactive', resultCls: 'u-chip ' + (h.result === 'active' ? 'ok' : 'r'), plan: M.byId(s.payers, h.plan)?.name || '—',
      proof: () => showProof(s, h, student)
    }));
    const chip = status === 'recorded' ? `${active ? 'Active' : 'Not active'}${payer ? ' · ' + payer.name.split(' ')[0] : ''}` : status === 'details' ? 'Details received' : 'Waiting for family link';
    const steps = fl?.submitted_at ? 5 : ['guardian', 'insurance', 'consent', 'best_time', 'transport'].filter(k => fl?.steps?.[k]).length;
    return {
      refHref: 'Referral.dc.html?id=' + id, title: `Eligibility · ${student}`, chip, chipCls: 'u-chip ' + (status === 'recorded' ? (active ? 'ok' : 'r') : status === 'details' ? 'y' : 'n'),
      isWaiting: status === 'waiting', isRecorded: status === 'recorded', showForm, facts, hasFacts: facts.length > 0, dmas,
      famLine: `Family link · ${steps} of 5 done`, sendLabel: sent ? 'Resend link' : 'Send family link', sendCls: 'u-btn' + (sent ? '' : ' pri'),
      canSend: status === 'waiting' && !r.history && !['grant_program', 'declined', 'in_service'].includes(r.stage),
      sendLink: async () => { try { await this.do('familyLink.send', { referral: id, by }); toast('Family link sent by text'); } catch { } },
      form, resultOpts: [['active', 'Active'], ['inactive', 'Inactive']].map(([v, t]) => ({ v, t, sel: form.result === v ? 'selected' : '' })),
      planOpts: [{ v: '', t: '—', sel: !form.plan ? 'selected' : '' }].concat(s.payers.map(p => ({ v: p.id, t: p.name, sel: form.plan === p.id ? 'selected' : '' }))),
      setResult: e => this.setState({ form: { ...form, result: e.target.value } }), setPlan: e => { form.plan = e.target.value; }, setEff: e => { form.effective = e.target.value; },
      record: async () => {
        if (form.result === 'active' && !form.plan) return toast('Pick the plan DMAS shows', 'err');
        if (form.result === 'active' && !form.effective) return toast('Add the effective date DMAS shows', 'err');
        try {
          const res = await this.do('eligibility.recordProof', { referral: id, result: form.result, plan: form.plan || null, effective: form.effective || null, by });
          this.state.recheck = false; this.state.form = null; toast(`Recorded · ${res.screenshot} stored in Psyflo`); this.setState({});
        } catch { }
      },
      hist, hasHist: hist.length > 0, nextText: status === 'recorded' ? 'Next check ' + M.fmtDate(el.next_check) : '',
      canRecheck: status === 'recorded' && !due, recheckLabel: this.state.recheck ? 'Cancel' : 'Re-check', toggleRecheck: () => this.setState({ recheck: !this.state.recheck }),
      inactive: status === 'recorded' && !active, held: !!r.hold,
      sebs: async () => { try { await this.do('referral.routeAndNotify', { id, why: 'No Medicaid', by }); toast('Routed to SEBS'); } catch { } },
      holdLabel: r.hold ? 'Lift hold' : 'Hold referral', hold: () => this.hold(r, by),
      helpProof: HELP.proof, proofLast: () => showProof(s, el, student), shotIcon: raw(SHOT_ICON)
    };
  }
  hold(r, by) {
    if (r.hold) { this.do('referral.unhold', { id: r.id, by }).then(() => toast('Hold lifted')).catch(noop); return; }
    modal(`<h2>Hold referral</h2>
      <label class="b1-lbl" for="b1-why">Why</label><select id="b1-why" class="u-sel" style="width:100%"><option>Medicaid not active</option><option>Medicaid ID did not match</option><option>Waiting for the guardian to renew coverage</option></select>
      <div class="b1-mact"><button type="button" class="mbtn p" data-go>Hold</button><button type="button" class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => { box.querySelector('[data-go]').onclick = async () => { const why = box.querySelector('#b1-why').value; close(); try { await this.do('referral.hold', { id: r.id, why, by }); toast('Referral held · guardian texted'); } catch { } }; });
  }
  get css() { return B1_CSS + '.b1-facts{display:grid;grid-template-columns:140px minmax(0,1fr);gap:4px 12px;margin:8px 0 12px}.b1-facts dt{color:var(--ink-3)}.b1-facts dd{margin:0;font-weight:500}.b1-form{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:12px 0}.b1-form label{display:block}.b1-form .u-sel,.b1-form .u-in{min-width:160px}'; }
});
