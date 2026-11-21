// 42 · Analytics (Seeded, demo numbers). Approval / partial / denial rates per plan, median decision days,
// auth workload hours, denials by reason, timely-filing write-offs and step-downs, all from
// state.analytics_nv (seed/extra/playbook.json) and labelled as demo numbers. Export PDF (file.pdf) and CSV
// (a Blob download) produce real files; the level toggle scales the same rows.
import { register, Screen, M, modal, toast } from '../app.js';

const pct = x => Math.round((x || 0) * 100) + '%';
const usd = n => '$' + Math.round(n || 0).toLocaleString('en-US');
const CH = { fax: 'Fax', availity: 'Availity', portal: 'Portal' };
const SCOPE = { both: 'all levels', cc: 'Level 2.1 IOP', lc: 'Level 1 outpatient' };
const KEY = { both: 'all', cc: 'l21', lc: 'l1' };

function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const csvRow = r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',');

register('Analytics', class extends Screen {
  init() { this.state = { s: 'both' }; }
  data() {
    const s = this.s, x = s.analytics_nv || {}, base = s.analytics_baseline || {}, loc = this.state.s;
    const L = loc !== 'both' ? base.by_locality?.[loc] : null;          // seed: Level 2.1 (cc) / Level 1 (lc)
    const X = (x.levels || {})[KEY[loc]] || (x.levels || {}).all || {}; // playbook.json: what the seed does not carry
    const f = L?.share ?? 1;
    const n = L ? L.n : base.decided ?? 0;
    const partial = L ? L.partial : base.partial ?? 0;
    const denied = L ? (L.full_denials / (L.n || 1)) : base.decided ? (base.full_denials || 0) / base.decided : (X.denied || 0);
    const sd = x.stepdowns || {};
    const k = {
      n, k1: pct(Math.max(0, 1 - partial - denied)), kPartial: pct(partial), k2: pct(denied),
      k3: ((L ? L.median_decision_days : base.median_decision_days) ?? '—') + ' d',
      k4: '≈' + (X.hours_month ?? '—') + ' h', k5: usd(X.writeoffs), arOwed: usd(x.ar_still_owed),
      k6: String(loc === 'lc' ? 0 : (base.step_downs ?? sd.total ?? '—')), k6s: loc === 'lc' ? 'Level 1 is the step-down level' : `${sd.planned ?? 0} planned · ${sd.forced ?? 0} forced by a denial · ${sd.readmitted ?? 0} back in 2.1 within 60 days`,
      scope: SCOPE[loc]
    };
    const monthly = base.monthly || [];
    const flag = new Set(x.flag_months || []);
    const max = Math.max(1, ...monthly.map(m => m[1]));
    const months = monthly.map(([l, req, aw]) => ({
      l, rq: Math.round(req * f), awd: Math.round(aw * f),
      req: 'height:' + Math.round(req * f / max * 140) + 'px;background:#C9D1D6',
      aw: 'height:' + Math.round(aw * f / max * 140) + 'px;background:' + (flag.has(l) ? '#F0B44C' : '#217A78')
    }));
    const dr = x.payers || {};
    const payers = (s.payers || []).slice().sort((p, q) => (dr[q.id]?.denied || 0) - (dr[p.id]?.denied || 0)).map(p => {
      const dn = dr[p.id]?.denied ?? 0, pr = p.partial_rate || 0;
      return { name: p.name, requests: Math.round((p.requests_this_year || 0) * f), partial: pct(dn), chip: 'chip ' + (dn >= 0.15 ? 'r' : dn >= 0.1 ? 'y' : 'g'),
        awarded: `${pct(Math.max(0, 1 - pr - dn))} · ${pct(pr)}`, days: (p.decides_in_days ?? '—') + ' d', channel: CH[p.channel] || p.channel };
    });
    const den = x.denials || [];
    const measures = den.map(d => ({ name: d.reason, a: String(Math.max(1, Math.round(d.n * f))), b: d.plans, c: usd(d.amount * f), trend: d.fix, chip: 'chip ' + (/timely/i.test(d.reason) ? 'r' : 'n') }));
    const totalDen = measures.reduce((a, m) => a + +m.a, 0);
    const label = x.label || 'Demo numbers · not real';
    const src = (base.source || "CCC of SN's EHR export + the auth tracker") + ' (demo data)';
    return { k, months, payers, measures, monthly, f, b: x,
      child: `${totalDen} claim and PA denials · ${SCOPE[loc]}`, source: src, period: base.period || x.period || '12 months to Oct 2026',
      appeals: String(Math.round((base.appeals_attempted ?? 0) * f)), overturned: String(Math.round((base.appeals_overturned ?? 0) * f)),
      chartSource: `Source: ${src}. Units requested vs authorized (H0015 hours at Level 2.1, H0004/H0005 at Level 1). Amber months: SilverSummit's UDS rule and Molina's 5-session auths were detected (see Payer playbook).${loc !== 'both' ? ` · ${SCOPE[loc]} share of the rows` : ''}`,
      payerSource: `Decided and partial per plan: the auth tracker, this year (demo data). Denial rates: ${label}. Partial at Molina is mostly 5-session authorizations.`,
      childSource: `Amounts at stake are billed charges on the denied claims. ${label}. Timely filing is 180 days from the date of service per plan (demo assumption · confirm per contract).` };
  }
  renderVals() {
    const d = this.data(), c = x => this.state.s === x ? 'on' : '';
    return Object.assign({}, d.k, d, { bBoth: c('both'), bCC: c('cc'), bLC: c('lc'),
      pBoth: () => this.setState({ s: 'both' }), pCC: () => this.setState({ s: 'cc' }), pLC: () => this.setState({ s: 'lc' }) });
  }
  async pdf(name, title, blocks) {
    const w = window.open('', '_blank');
    try { const r = await this.do('file.pdf', { name, title, blocks, kind: 'report', record: 'analytics' }); if (w) w.location = r.file.url; else location.href = r.file.url; toast(title + ' saved as a PDF'); }
    catch (e) { if (w) w.close(); }
  }
  reportBlocks() {
    const d = this.data();
    const B = [{ text: 'Psyflo × Community Counseling Center of Southern Nevada · Analytics', size: 9 }, { text: `Authorizations and denials · ${d.k.scope} · ${d.period}`, size: 16, bold: true },
      { text: `${d.source}. Demo data · nothing is real.`, size: 9 },
      { text: `Approved in full: ${d.k.k1} of ${d.k.n} PA decisions · partial ${d.k.kPartial} · denied ${d.k.k2}`, gap: 10 },
      { text: `Median decision time: ${d.k.k3} · auth workload ${d.k.k4} a month` },
      { text: `Timely-filing write-offs (12 months): ${d.k.k5} · still owed: ${d.k.arOwed}` },
      { text: `Step-downs 2.1 → 1: ${d.k.k6} (${d.k.k6s})` },
      { text: 'Units requested vs authorized, by month', bold: true, gap: 10 }];
    for (const m of d.months) B.push({ text: `${m.l}: requested ${m.rq} · authorized ${m.awd}` });
    B.push({ text: 'By plan', bold: true, gap: 10 });
    for (const p of d.payers) B.push({ text: `${p.name}: ${p.requests} decided · denied ${p.partial} · approved in full / partial ${p.awarded} · median ${p.days} · ${p.channel}` });
    B.push({ text: 'Denials by reason', bold: true, gap: 10 });
    for (const m of d.measures) B.push({ text: `${m.name}: ${m.a} · ${m.b} · ${m.c} at stake · ${m.trend}` });
    return B;
  }
  csv() {
    const d = this.data();
    const lines = [csvRow(['section', 'label', 'requested_or_decided', 'authorized', 'denied', 'approved_full_and_partial', 'median_days', 'channel', 'scope'])];
    for (const m of d.months) lines.push(csvRow(['monthly', m.l, m.rq, m.awd, '', '', '', '', d.k.scope]));
    for (const p of d.payers) lines.push(csvRow(['plan', p.name, p.requests, '', p.partial, p.awarded, p.days, p.channel, d.period]));
    for (const m of d.measures) lines.push(csvRow(['denial_reason', m.name, m.a, '', '', '', '', m.b, m.c]));
    lines.push(csvRow(['source', d.source, '', '', '', '', '', '', d.period]));
    return lines.join('\n') + '\n';
  }
  get anchors() {
    return {
      export: () => modal(`<h2>Export</h2><p>The numbers as they are on screen (${this.data().k.scope}). Both files are generated now from the same rows. Demo numbers.</p>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="mbtn p" data-pdf>PDF report</button><button class="mbtn" data-csv>CSV (rows)</button><button class="mbtn" data-close>Cancel</button></div>`,
        (box, close) => {
          box.querySelector('[data-pdf]').onclick = () => { close(); this.pdf(`CCC of SN_analytics_${this.state.s}_${this.s.today}.pdf`, 'Analytics', this.reportBlocks()); };
          box.querySelector('[data-csv]').onclick = () => { close(); download(`CCC of SN_analytics_${this.state.s}_${this.s.today}.csv`, this.csv()); toast('CSV downloaded'); };
        }),
      // timely-filing write-offs by quarter
      div: () => {
        const s = this.s, b = s.analytics_nv || {}, rows = b.writeoffs_by_quarter || [];
        const tf = (b.denials || []).find(d => /timely/i.test(d.reason));
        const html = rows.map(([q, v]) => `<tr><td style="padding:4px 8px 4px 0">${q}</td><td>${usd(v)}</td></tr>`).join('');
        modal(`<h2>Timely-filing write-offs · preview</h2><p style="font-size:13px;color:#525B66">Medicaid claims written off as bad debt because the plan's decision or payment came after the filing limit (180 days from the date of service per plan · demo assumption, confirm per contract). Demo numbers.</p>
          <table style="width:100%;font-size:13px;border-collapse:collapse"><tr style="text-align:left;color:#525B66"><th>Period</th><th>Written off</th></tr>${html}</table>
          <p style="font-size:13px;margin-top:10px">Open now: ${tf ? tf.n + ' timely-filing denials, ' + usd(tf.amount) : '—'} · ${usd(b.ar_still_owed)} still owed. Psyflo keeps the fax receipt or portal confirmation for every submission so a reconsideration can prove it was filed on time.</p>
          <div style="display:flex;gap:8px;margin-top:14px"><a class="mbtn" href="#/Claims">Denial Intelligence</a><button class="mbtn p" data-pdf>Save as PDF</button><button class="mbtn" data-close>Close</button></div>`,
          (box, close) => { box.querySelector('a').onclick = () => close(); box.querySelector('[data-pdf]').onclick = () => { close(); this.pdf(`Timely_filing_writeoffs_${s.today}.pdf`, 'Timely-filing write-offs', [{ text: 'Timely-filing write-offs · by quarter', size: 16, bold: true }, { text: 'Demo data · nothing is real.', size: 9 }, ...rows.map(([q, v]) => ({ text: `${q}: ${usd(v)}` })), { text: `Still owed: ${usd(b.ar_still_owed)}`, gap: 8 }]); }; });
      },
      // board summary with cited sentences
      grant: () => {
        const s = this.s, d = this.data(), b = s.analytics_nv || {};
        const tf = (b.denials || []).find(r => /timely/i.test(r.reason));
        const lines = [
          [`CCC of SN received ${d.k.n} prior-authorization decisions in the ${d.period.toLowerCase()}; ${d.k.k1} were approved in full and ${d.k.k2} denied.`, 'analytics · by plan'],
          [`The median plan decision took ${d.k.k3.replace(' d', ' days')}; authorization work took about ${(b.levels?.all?.hours_month) || '—'} staff hours a month.`, 'auth tracker · workload'],
          [`${d.k.k5} was written off for timely filing in 12 months, with ${d.k.arOwed} still owed.`, 'write-offs'],
          tf ? [`${tf.n} denials were for timely filing; each needs proof of when the claim was first submitted.`, 'denials by reason'] : null,
          [`${(s.policy_changes || []).length} plan rule changes were detected from denials since ${M.fmtDate((s.policy_changes || []).map(x => x.detected).sort()[0] || s.today)}.`, 'Payer playbook']
        ].filter(Boolean);
        modal(`<h2>Board summary</h2><p style="font-size:13px;color:#525B66">Cited sentences, each with its source. Nothing is added that the rows do not say. Demo numbers.</p><ol style="padding-left:18px">${lines.map(([t, src]) => `<li style="margin:6px 0">${t} <span style="font-size:12px;color:#525B66">[${src}]</span></li>`).join('')}</ol>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-pdf>Save as PDF</button><button class="mbtn" data-close>Close</button></div>`,
          (box, close) => box.querySelector('[data-pdf]').onclick = () => { close(); this.pdf(`Board_summary_${s.today}.pdf`, 'Board summary', [{ text: 'Board summary · cited sentences', size: 16, bold: true }, { text: 'Demo data · nothing is real.', size: 9 }, ...lines.map(([t, src]) => ({ text: `${t} [${src}]` }))]); });
      },
      // step-downs 2.1 → 1
      q: () => {
        const sd = this.s.analytics_nv?.stepdowns || {};
        modal(`<h2>Step-downs 2.1 → 1 · preview</h2><p style="font-size:13px;color:#525B66">Clients who moved from Level 2.1 IOP to Level 1 outpatient this year. Demo numbers.</p>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="padding:4px 8px 4px 0">All step-downs</td><td><b>${sd.total ?? '—'}</b></td></tr>
            <tr><td style="padding:4px 8px 4px 0">Planned · ASAM step-down criteria met</td><td>${sd.planned ?? '—'}</td></tr>
            <tr><td style="padding:4px 8px 4px 0">Forced · continued stay denied ("abstinent in treatment")</td><td>${sd.forced ?? '—'}</td></tr>
            <tr><td style="padding:4px 8px 4px 0">Of the forced, back in Level 2.1 within 60 days</td><td>${sd.readmitted ?? '—'}</td></tr>
          </table>
          <p style="font-size:13px;margin-top:10px">The readmissions are the D5 argument in numbers: Psyflo cites them in Molina and Anthem continued-stay drafts.</p>
          <div style="display:flex;gap:8px;margin-top:14px"><a class="mbtn" href="#/EarlyDischarge">Step-down screen</a><button class="mbtn" data-close>Close</button></div>`,
          (box, close) => { box.querySelector('a').onclick = () => close(); });
      }
    };
  }
  set anchors(v) { }
});
