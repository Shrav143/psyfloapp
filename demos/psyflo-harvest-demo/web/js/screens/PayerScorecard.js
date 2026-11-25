// Payer scorecard (Later, reached from the Roadmap). The by-payer table and the monthly units chart that used to sit on Analytics.
// Every number is seeded (state.payers, state.analytics_baseline, state.payer_full_denials): Harvest has not calculated these rates yet,
// so the page says `Sample data` and nothing else about where they come from.
import { register, Screen, M, raw, esc, helpIcon } from '../app.js';

const pct = x => Math.round(x * 100) + '%';
const tone = r => r >= 0.7 ? 'late' : r >= 0.45 ? 'watch' : 'ok';

// units requested (hollow bar) and awarded (filled bar) by month
function chart(monthly) {
  const W = 1100, H = 250, L = 38, B = 28, T = 10, R = 8, top = 800;
  const bw = 44, step = (W - L - R) / monthly.length;
  const y = v => T + (H - T - B) * (1 - v / top);
  const grid = [0, 200, 400, 600, 800].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"></line><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--ink-3)">${v}</text>`).join('');
  const bars = monthly.map(([m, req, aw], i) => {
    const x = L + i * step + (step - bw) / 2;
    return `<g tabindex="0" role="img" aria-label="${esc(m)}: ${req} requested, ${aw} awarded"><title>${esc(m)}: ${req} requested · ${aw} awarded</title>
      <rect x="${x}" y="${y(req)}" width="${bw}" height="${y(0) - y(req)}" rx="4" fill="var(--white)" stroke="var(--ink-3)" stroke-width="1.5"></rect>
      <rect x="${x}" y="${y(aw)}" width="${bw}" height="${y(0) - y(aw)}" rx="4" fill="var(--teal)"></rect>
      <text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" font-size="12" fill="var(--ink-3)">${esc(m)}</text></g>`;
  }).join('');
  return raw(`<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;height:auto" role="group" aria-label="Units requested and awarded by month">${grid}${bars}</svg>`);
}

register('PayerScorecard', class extends Screen {
  renderVals() {
    const s = this.s, b = s.analytics_baseline || {}; const monthly = b.monthly || [];
    const req = monthly.reduce((a, m) => a + m[1], 0), aw = monthly.reduce((a, m) => a + m[2], 0);
    const pa = b.payer_awarded || {}, fd = s.payer_full_denials || {};
    const payers = (s.payers || []).slice().sort((x, y) => (y.partial_rate || 0) - (x.partial_rate || 0)).map(p => ({
      name: M.payerShort(s, p.id), partial: pct(p.partial_rate || 0), chip: tone(p.partial_rate || 0),
      awarded: pa[p.id] != null ? pct(pa[p.id]) : '—', awardedW: pa[p.id] != null ? Math.round(pa[p.id] * 100) + '%' : '0%',
      denials: fd[p.id] ?? 0, days: p.decides_in_days != null ? p.decides_in_days : '—', channel: M.CHANNEL_LABEL[p.channel] || p.channel
    }));
    return {
      today: M.fmtDate(s.today, { dow: true }).replace(/^(\w+) /, '$1, '),
      stats: [['Partial rate', pct(b.partial || 0)], ['Awarded vs requested', req ? pct(aw / req) : '—'], ['Full denials', `${b.full_denials ?? 0} of ${b.decided ?? 0}`], ['Decision days', String(b.median_decision_days ?? '—')], ['Unpaid clinical hours', '≈' + (b.unpaid_hours ?? 0)]].map(([l, v]) => ({ l, v })),
      payers, chart: chart(monthly)
    };
  }
});
