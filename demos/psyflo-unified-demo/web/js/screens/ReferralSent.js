// 5 · Referral sent (school, desktop). The confirmation for ?id: what Harvest received, where the referral stands (status text only) and what is still
// missing. "Add" records an attachment's file NAME on the referral (referral.attach); this demo does not upload the file, and says so.
import { register, M, toast, esc } from '../app.js';
import * as P from '../shared/sel/portal.js';
import { SchoolScreen, spFrame, schoolUser, referralWords, schoolChip } from './SchoolPortal.js';

const LABEL = P.ATTACHMENTS;

register('ReferralSent', class extends SchoolScreen {
  ref() {
    const s = this.s; const u = schoolUser(); const mine = (s.referrals || []).filter(r => r.school === u.school);
    return mine.find(r => r.id === this.params.id) || mine.find(r => r.referred_by === u.id && r.stage !== 'draft') || null;
  }
  renderVals() {
    const s = this.s; const u = schoolUser(); const r = this.ref();
    if (!r) return { page: spFrame({ user: u, s, body: `<h1 class="sp-h1">No referral here yet</h1><section class="sp-card"><p style="margin:0" class="sp-muted">Refer a student from the portal, or open one of your referrals from the list.</p><div class="sp-row"><a class="sp-btn sp-btn--p" href="#/ReferralForm">Refer a student</a><a class="sp-btn sp-btn--o" href="#/SchoolPortal">Back to referrals</a></div></section>` }) };
    const c = M.byId(s.clients, r.client); const ini = c ? c.initials : String(r.client).split(',')[0];
    const att = (r.form && r.form.attachments) || {};
    const missing = r.form && r.form.attachments ? Object.keys(LABEL).filter(k => !att[k]) : [];
    const have = Object.entries(att).filter(([, v]) => v).map(([k, v]) => `${LABEL[k] || k}${typeof v === 'string' ? ': ' + v : ''}`);
    const draft = r.stage === 'draft'; const status = referralWords(s, r);
    const next = draft ? 'Nothing has gone to Harvest yet. Open the form to finish and submit it.' : ['needs_screening', 'waiting_on_school'].includes(r.stage) ? 'Harvest contacts the guardian and keeps the status here up to date.' : '';
    const body = `<div><h1 class="sp-h1">${draft ? 'Draft saved' : 'Referral sent'} · ${esc(ini)}</h1><p class="sp-muted" style="margin:6px 0 0">${esc(r.id)} · ${esc(M.fmtDateTime(r.received || r.saved_at))}</p></div>
      <section class="sp-card" aria-labelledby="sp-st" data-status="${esc(r.stage)}"><h2 class="sp-h2" id="sp-st">Where it stands</h2><div class="sp-row">${schoolChip(draft ? 'neutral' : 'info', status)}</div>${next ? `<p style="margin:0" class="sp-muted">${esc(next)}</p>` : ''}
        ${draft ? `<div class="sp-row"><a class="sp-btn sp-btn--p" href="#/ReferralForm?id=${esc(r.id)}">Finish the referral</a></div>` : ''}</section>
      ${missing.length ? `<section class="sp-card sp-card--needs" aria-labelledby="sp-needs" data-harvest-needs="${missing.length}"><h2 class="sp-h2" id="sp-needs">Harvest needs</h2><ul class="sp-list">${missing.map(k => `<li><b style="flex:1">${esc(LABEL[k])}</b><button type="button" class="sp-btn sp-btn--o sp-btn--sm" data-att="${k}">Add file</button></li>`).join('')}</ul>
          <input type="file" id="attfile" data-nobind style="display:none" aria-label="Choose a file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.txt"><p class="sp-small" style="margin:0">Demo: the file name is recorded with the referral; the file itself is not uploaded.</p></section>` : ''}
      ${have.length ? `<section class="sp-card" aria-labelledby="sp-rc"><h2 class="sp-h2" id="sp-rc">Received</h2><ul class="sp-list">${have.map(h => `<li>${esc(h)}</li>`).join('')}</ul></section>` : ''}
      <div class="sp-row"><a class="sp-btn sp-btn--p" href="#/SchoolPortal">Back to referrals</a><a class="sp-btn sp-btn--o" href="#/ReferralForm">Refer another student</a></div>`;
    return { page: spFrame({ user: u, s, body }) };
  }
  afterPaint(root) {
    const inp = root.querySelector('#attfile');
    root.querySelectorAll('[data-att]').forEach(b => { b.onclick = () => { this.pendingKey = b.dataset.att; if (inp) inp.click(); }; });
    if (inp) inp.onchange = async () => {
      const f = inp.files[0]; const r = this.ref(); if (!f || !r) return;
      try { await this.do('referral.attach', { id: r.id, key: this.pendingKey, name: f.name }); } catch { return; }
      toast(`${LABEL[this.pendingKey] || 'Attachment'} recorded on ${r.id} · ${f.name}`);
    };
  }
});
