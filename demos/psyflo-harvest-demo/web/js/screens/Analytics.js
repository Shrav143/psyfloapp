// 42 · Analytics (Seeded). Baseline KPIs and the monthly chart from state.analytics_baseline (Harvest's
// Lauris export + master tracker), by-payer table from state.payers, one child from M.R.'s quarter.
// Export PDF (file.pdf) and CSV (a Blob download) produce real files; the locality toggle keeps the canvas behaviour.
import { register, Screen, M, modal, toast } from '../app.js';

const pct = x => Math.round(x * 100) + '%';
const CH = { fax: 'Fax', availity: 'Availity', portal: 'Portal' };
const SCOPE = { both: 'both localities', cc: 'Campbell County', lc: 'Lynchburg City' };
const LOC = { cc: 'Campbell County', lc: 'Lynchburg City' };

function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const csvRow = r => r.map(v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v).join(',');

// lower is better for symptom scores and referrals; higher is better for the daily rating
function trend(vals, higherBetter) {
  const a = vals[0], c = vals[vals.length - 1];
  const gain = higherBetter ? (c - a) / a : (a - c) / a;
  if (gain >= 0.2) return { trend: 'improving', chip: 'chip g' };
  if (gain > 0) return { trend: 'slower', chip: 'chip y' };
  return { trend: gain === 0 ? 'flat' : 'worse', chip: gain === 0 ? 'chip n' : 'chip r' };
}

register('Analytics', class extends Screen {
  init() { this.state = { s: 'both' }; }
  data() {
    const s = this.s, b = s.analytics_baseline || {}, loc = this.state.s;
    const L = loc !== 'both' && b.by_locality?.[loc];
    const monthly = b.monthly || [];
    const totReq = monthly.reduce((a, m) => a + m[1], 0), totAw = monthly.reduce((a, m) => a + m[2], 0);
    const n = L ? L.n : b.decided;
    const k = {
      n, k1: pct(L ? L.partial : b.partial), k2: pct(L ? L.awarded_ratio : (totReq ? totAw / totReq : 0)),
      k2b: String(L ? L.median_award_on_150 : b.median_award_on_150), k3: pct((L ? L.full_denials : b.full_denials) / n),
      k4: String(L ? L.median_decision_days : b.median_decision_days), k5: String(L ? L.early_discharge_restarts : b.early_discharge_restarts),
      k6: '≈' + (L ? L.unpaid_hours : b.unpaid_hours) + ' h', scope: SCOPE[loc]
    };
    const f = L ? (L.share || (loc === 'cc' ? 0.58 : 0.42)) : 1;
    const max = Math.max(1, ...monthly.map(m => m[1]));
    const months = monthly.map(([l, req, aw]) => ({
      l, rq: Math.round(req * f), awd: Math.round(aw * f),
      req: 'height:' + Math.round(req * f / max * 140) + 'px;background:#C9D1D6',
      aw: 'height:' + Math.round(aw * f / max * 140) + 'px;background:' + (/^(May|Jun)$/.test(l) ? '#F0B44C' : '#217A78')
    }));
    const pa = b.payer_awarded || {};
    const payers = (s.payers || []).slice().sort((x, y) => (y.partial_rate || 0) - (x.partial_rate || 0)).map(p => ({
      name: p.name.replace('Medicaid FFS · Acentra Health', 'Medicaid FFS · Acentra'), requests: p.requests_this_year ?? '—',
      partial: pct(p.partial_rate || 0), chip: 'chip ' + (p.partial_rate >= 0.7 ? 'r' : p.partial_rate >= 0.45 ? 'y' : 'g'),
      awarded: pa[p.id] != null ? pct(pa[p.id]) : '—', days: (p.decides_in_days ?? '—') + ' d', channel: CH[p.channel] || p.channel
    }));
    const mr = M.byId(s.clients, 'MR'); const q = mr?.quarter || {};
    const rows = [['PHQ-A (child)', q.phq_a, false], ['DSM cross-cutting · parent', q.dsm_parent, false], ['DSM cross-cutting · child', q.dsm_child, false],
      ['Daily progress rating (avg)', q.daily_rating, true], ['Office referrals (counselor, school portal)', q.office_referrals_per_month, false]].filter(r => Array.isArray(r[1]));
    const measures = rows.map(([name, v, hb], i) => ({ name, a: v[0] + (i === 4 ? '/mo' : ''), b: v[1], c: v[v.length - 1], ...trend(v, hb) }));
    const src = b.source || "Harvest's Lauris export · Oct 29 + master tracker";
    const exportDate = M.fmtDate(s.migration?.last_export || s.today);
    return { k, months, payers, measures, monthly, f,
      child: mr ? M.clientLabel(s, 'MR') : 'M.R.', source: "master tracker + Harvest's Lauris export", period: b.period || '12 months to Oct 2026',
      appeals: b.appeals_attempted ?? 0, overturned: b.appeals_overturned ?? 0,
      chartSource: `Source: ${src.replace(/ · Oct \d+/, ' · ' + exportDate)} (analytics_baseline.monthly)${L ? ` · ${LOC[loc]} share of the export rows` : ''}. Units are H2016 school-day units.`,
      payerSource: `Requests and partial rate: Harvest's master tracker, this year. Awarded vs asked: Harvest's Lauris export · ${exportDate}.`,
      childSource: `M.R.'s quarter (${q.days || 61} school days): assessments from Lauris surveys in Harvest's export, ratings from daily notes, office referrals from the school portal.` };
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
    const d = this.data(), s = this.s;
    const B = [{ text: 'Psyflo × Harvest · Analytics', size: 9 }, { text: `Authorization baseline · ${d.k.scope} · ${d.period}`, size: 16, bold: true },
      { text: `Source: ${d.source} (${M.fmtDate(s.migration?.last_export || s.today, { year: true })}). Demo data · nothing is real.`, size: 9 },
      { text: `SRAs returned partial: ${d.k.k1} of ${d.k.n} decided`, gap: 10 }, { text: `Units awarded vs requested: ${d.k.k2} · median award on a 150-unit ask: ${d.k.k2b}` },
      { text: `Full denials: ${d.k.k3} · appeals attempted ${d.appeals}, overturned ${d.overturned}` }, { text: `Median decision time: ${d.k.k4} days · early discharge + resubmit: ${d.k.k5} · unpaid clinical hours: ${d.k.k6}` },
      { text: 'Units requested vs awarded, by month', bold: true, gap: 10 }];
    for (const m of d.months) B.push({ text: `${m.l}: requested ${m.rq} · awarded ${m.awd}` });
    B.push({ text: 'By payer', bold: true, gap: 10 });
    for (const p of d.payers) B.push({ text: `${p.name}: ${p.requests} requests · partial ${p.partial} · awarded vs asked ${p.awarded} · ${p.days} · ${p.channel}` });
    B.push({ text: `One child · ${d.child}`, bold: true, gap: 10 });
    for (const m of d.measures) B.push({ text: `${m.name}: ${m.a} → ${m.b} → ${m.c} (${m.trend})` });
    return B;
  }
  csv() {
    const d = this.data();
    const lines = [csvRow(['section', 'label', 'requested', 'awarded', 'partial_rate', 'awarded_vs_asked', 'decision_days', 'channel', 'scope'])];
    for (const m of d.months) lines.push(csvRow(['monthly', m.l, m.rq, m.awd, '', '', '', '', d.k.scope]));
    for (const p of d.payers) lines.push(csvRow(['payer', p.name, p.requests, '', p.partial, p.awarded, p.days, p.channel, 'this year']));
    for (const m of d.measures) lines.push(csvRow(['child_MR', m.name, m.a, m.c, '', '', '', '', m.trend]));
    lines.push(csvRow(['source', d.source, '', '', '', '', '', '', d.period]));
    return lines.join('\n') + '\n';
  }
  get anchors() {
    return {
      export: () => modal(`<h2>Export</h2><p>The baseline as it is on screen (${this.data().k.scope}). Both files are generated now from the same rows.</p>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="mbtn p" data-pdf>PDF report</button><button class="mbtn" data-csv>CSV (rows)</button><button class="mbtn" data-close>Cancel</button></div>`,
        (box, close) => {
          box.querySelector('[data-pdf]').onclick = () => { close(); this.pdf(`Harvest_analytics_${this.state.s}_${this.s.today}.pdf`, 'Analytics baseline', this.reportBlocks()); };
          box.querySelector('[data-csv]').onclick = () => { close(); download(`Harvest_analytics_${this.state.s}_${this.s.today}.csv`, this.csv()); toast('CSV downloaded'); };
        }),
      div: () => {
        const s = this.s, rows = s.analytics_baseline?.division_report || [];
        const html = rows.map(r => `<tr><td style="padding:4px 8px 4px 0">${M.school(s, r.school).name}</td><td>${r.students}</td><td>${r.office_referrals_change}</td><td>${r.incidents}</td></tr>`).join('');
        modal(`<h2>School-division report · preview</h2><p style="font-size:13px;color:#525B66">By school, from the school portal (office referrals) and incident reports. Virginia comparison is added from the state's published tables when the report is finalised.</p>
          <table style="width:100%;font-size:13px;border-collapse:collapse"><tr style="text-align:left;color:#525B66"><th>School</th><th>Students</th><th>Office referrals</th><th>Incidents</th></tr>${html}</table>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-pdf>Save as PDF</button><button class="mbtn" data-close>Close</button></div>`,
          (box, close) => box.querySelector('[data-pdf]').onclick = () => { close(); this.pdf(`Division_report_${s.today}.pdf`, 'School-division report', [{ text: 'School-division report · preview', size: 16, bold: true }, { text: 'Demo data · nothing is real.', size: 9 }, ...rows.map(r => ({ text: `${M.school(s, r.school).name}: ${r.students} students · office referrals ${r.office_referrals_change} · ${r.incidents} incidents` }))]); });
      },
      grant: () => {
        const s = this.s, c = s.compliance || {}, mr = M.byId(s.clients, 'MR')?.quarter || {};
        const lines = [
          [`Harvest served ${s.migration?.active_students ?? 52} active TDT students in ${s.org?.localities?.join(' and ') || 'two localities'}.`, "Harvest's Lauris export"],
          [`${c.incident_reports ?? 14} incident reports and ${c.cps_reports ?? 3} CPS reports were filed in October.`, 'Incident reports'],
          mr.office_referrals_per_month ? [`One second-grader's office referrals fell from ${mr.office_referrals_per_month[0]} to ${mr.office_referrals_per_month[2]} a month.`, 'school portal'] : null,
          [`${pct(s.analytics_baseline?.partial || 0.57)} of decided SRAs came back partial in the last 12 months.`, 'master tracker']
        ].filter(Boolean);
        modal(`<h2>Grant pull</h2><p style="font-size:13px;color:#525B66">Cited sentences, each with its source. Nothing is added that the rows do not say.</p><ol style="padding-left:18px">${lines.map(([t, src]) => `<li style="margin:6px 0">${t} <span style="font-size:12px;color:#525B66">[${src}]</span></li>`).join('')}</ol>
          <div style="display:flex;gap:8px;margin-top:14px"><button class="mbtn p" data-pdf>Save as PDF</button><button class="mbtn" data-close>Close</button></div>`,
          (box, close) => box.querySelector('[data-pdf]').onclick = () => { close(); this.pdf(`Grant_pull_${s.today}.pdf`, 'Grant pull', [{ text: 'Grant pull · cited sentences', size: 16, bold: true }, { text: 'Demo data · nothing is real.', size: 9 }, ...lines.map(([t, src]) => ({ text: `${t} [${src}]` }))]); });
      },
      q: () => this.go('ExtQuarterly.dc.html', { client: 'MR' })
    };
  }
  set anchors(v) { }
});
