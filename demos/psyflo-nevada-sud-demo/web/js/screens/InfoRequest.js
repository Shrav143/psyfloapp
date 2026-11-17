// 34 · Information request — the plan's questions, a reply drafted from the chart that answers them and stops, the 24-hour clock.
import { register, Screen, M, raw, esc, modal, toast, api, app } from '../app.js';
import { pickReq, details, clientOf, schoolName, timeline, openPortal, levelOf, channelLabel, typeLabel, stageLabel, payerFirst, LEVEL_LABEL } from './Authorizations.js';
import { fmtDate, fmtTime, daysBetween, addDays } from '../shared/dates.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso, year = true) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${MONTHS[m - 1]} ${d}${year ? ', ' + y : ''}`; };
const strip = h => String(h).replace(/<sup>\d+<\/sup>/g, '').replace(/<[^>]+>/g, '');
const ASK = '[Clinician: answer from the chart. Psyflo found no dated source for this item, so it wrote nothing.]';

// Seeded for the demo's own request (R-0408, K.T., Anthem, Level 1): what Anthem asked and the reply Psyflo drafted
// from the chart. Synthetic. Superscripts point at the sources listed under the letter.
const NV_INFO = {
  'R-0408': {
    asked: 'Please provide (1) the ASAM dimension ratings from the assessment and (2) clinical justification for Level 1 services beyond 24 sessions.',
    items: ['ASAM dimension ratings from the assessment', 'Clinical justification for Level 1 services beyond 24 sessions'],
    answers: [
      'ASAM assessment completed October 14 by Jordan Perez, LCADC<sup>1</sup>. D1 Acute intoxication / withdrawal potential: 0. D2 Biomedical conditions: 0. D3 Emotional, behavioral or cognitive conditions: 2, generalized anxiety (GAD-7 15) that he manages with cannabis<sup>1,2</sup>. D4 Readiness to change: 1, self-referred, wants to cut down for work. D5 Relapse, continued use or continued problem potential: 2, daily use and two failed attempts to stop on his own. D6 Recovery / living environment: 1, lives with a supportive partner who does not use<sup>1</sup>. Recommended level: 1, outpatient<sup>1</sup>.',
      'K.T. used cannabis on 28 of the last 30 days<sup>2</sup>; UDS at assessment was positive for THC only<sup>3</sup>. Both earlier attempts to stop lasted under two weeks<sup>1</sup>, so D5 stays at 2 well past the first months, and the anxiety driving use (D3) needs mental-health therapy alongside relapse-prevention work. 24 sessions covers about the first 12 weeks at two sessions a week; the request covers 24 weeks, with the dimensions rated again at session 24 and the request shortened if D3 and D5 have dropped<sup>1</sup>.'
    ],
    sources: ['ASAM assessment Oct 14', 'BAM and GAD-7 Oct 14', 'UDS result Oct 14'],
    dates: 'Nov 2 – Apr 16'
  }
};
// the seeded tracker details win when present; the constant above is the fallback for the demo's own request
const infoFor = (s, r) => details(s, r.id).info || NV_INFO[r.id];

// answer each asked item from what the record already holds; never invent (drafting rules 1, 2, 7, 12)
function draftAnswer(s, r, q) {
  const c = clientOf(s, r); const name = c?.initials || r.client;
  if (/asam|dimension/i.test(q)) {
    const a = c?.asam || c?.asam_ratings;
    if (a && typeof a === 'object') return `${name}'s ASAM ratings from the most recent assessment: ` + Object.entries(a).map(([k, v]) => `${k.toUpperCase()}: ${typeof v === 'object' ? (v.rating ?? '') + (v.note ? ', ' + v.note : '') : v}`).join('; ') + '.';
    return ASK;
  }
  if (/goal|treatment plan|baseline/i.test(q)) {
    if (c?.goals?.length) return c.goals.map(g => `Goal ${g.n} (${g.name}): ${g.objective}`).join(' ') + ' Baselines are as recorded in the treatment plan.';
    return ASK;
  }
  if (/uds|drug screen|toxicology/i.test(q) && c?.uds?.length) return `Urine drug screens on record: ${c.uds.map(u => fmtDate(u.date) + ' ' + u.result).join(', ')}.`;
  return ASK;
}

register('InfoRequest', class extends Screen {
  req() { return pickReq(this.s, this.params.id, ['R-0408'], r => r.stage === 'info_requested'); }
  // the reply: seeded answers for the tracker's own request, drafted answers otherwise; an edit replaces both
  reply(r) {
    const s = this.s; const info = infoFor(s, r);
    const items = info?.items || r.info_items || [];
    if (r.info_reply?.text) return { items, edited: true, answers: r.info_reply.text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => { const m = p.match(/^(\d+\.\s[^.]*\.)\s*([\s\S]*)$/); return m ? { head: m[1], a: m[2] } : { head: '', a: p }; }) };
    const answers = items.map((q, i) => ({ head: `${i + 1}. ${q}.`, a: info?.answers?.[i] ? raw(info.answers[i]) : draftAnswer(s, r, q) }));
    return { items, edited: false, answers };
  }
  plain(r) { return this.reply(r).answers.map(x => (x.head ? x.head + ' ' : '') + strip(x.a)).join('\n\n'); }
  renderVals() {
    const s = this.s; const r = this.req();
    if (!r) return { none: true, has: false, crumb: 'Information request', stageText: 'nothing open', stageCls: 'chip n', clock: 'no clock running', clockCls: 'chip n', payerChip: 'Availity · fax' };
    const c = clientOf(s, r); const p = M.payer(s, r.payer); const pf = payerFirst(s, r.payer);
    const info = infoFor(s, r); const rep = this.reply(r); const lvl = levelOf(s, r);
    const open = r.stage === 'info_requested';
    const clk = M.requestClock(s, r);
    const due = r.reply_due;
    const dueTxt = due ? `due ${due.slice(0, 10) === s.today ? 'today' : fmtDate(due)} ${fmtTime(due)}` : 'reply due in 24 h';
    const n = rep.items.length;
    const steps = timeline(s, r.id);
    if (open && due) steps.push({ dt: (due.slice(0, 10) === s.today ? 'Today' : fmtDate(due)) + ' · ' + fmtTime(due), html: raw('<b>Deadline.</b> Missed = the request is decided on what they have.') });
    const sent = r.info_reply?.sent_at;
    const asked = info?.asked || (n ? 'Please provide: ' + rep.items.map((q, i) => `(${i + 1}) ${q}`).join('; ') + '.' : 'The payer\'s questions are read from the letter when it is opened.');
    const stageText = open ? 'Plan asked for more information' : r.stage === 'portal_open' ? `Reply ready in ${channelLabel(s, r)} · upload in your session` : stageLabel(r.stage);
    return {
      has: true, none: false, crumb: `${r.id} · ${M.clientLabel(s, r.client)}`,
      stageText, stageCls: open ? 'chip y' : r.stage === 'portal_open' ? 'chip y' : 'chip n',
      clock: open ? clk.text : clk.text, clockCls: 'chip ' + (open ? 'r' : clk.sev || 'n'),
      payerChip: `${p.name} · ${channelLabel(s, r)}`, pf,
      title: open ? `${pf} wants more information · ${M.clientLabel(s, r.client)} · ${dueTxt}` : `${pf}'s information request · ${M.clientLabel(s, r.client)} · ${sent ? 'reply sent ' + fmtDate(sent) : String(stageLabel(r.stage)).toLowerCase()}`,
      asked, steps,
      draftNote: rep.edited ? `edited by a clinician ${r.info_reply.edited_at ? fmtDate(r.info_reply.edited_at) + ', ' + fmtTime(r.info_reply.edited_at) : ''} · you check it, then send` : 'drafted by Psyflo · you check it, then send',
      draftChip: sent ? 'sent' : rep.edited ? 'edited' : 'draft', draftCls: sent ? 'chip g' : 'chip y',
      locality: (c && M.school(s, c.school).locality) || 'Las Vegas', clinician: M.staff(s, c?.clinician || 'jperez').name + ', ' + (M.staff(s, c?.clinician || 'jperez').credential || 'LCADC'),
      clinTitle: M.staff(s, c?.clinician || 'jperez').title || 'Clinician',
      letterDate: longDate(s.today), payerName: p.name, via: r.channel === 'fax' ? "Via fax · CCC of SN's e-fax account" : `Via ${channelLabel(s, r)} · case reference on file`,
      askedOn: r.info_requested_at ? longDate(r.info_requested_at) : 'on file', member: c?.initials || r.client,
      serviceText: lvl === '2.1' ? 'ASAM Level 2.1 intensive outpatient, H0015' : 'ASAM Level 1 outpatient, H0004 / H0005',
      serviceLine: `${typeLabel(r.type).toLowerCase()} request submitted ${r.sent ? longDate(r.sent) : 'on file'} (${r.units_requested} ${lvl === '2.1' ? 'units' : 'sessions'}${info?.dates ? ', ' + info.dates : r.dates ? ', ' + r.dates.split(' to ').map(d => fmtDate(d)).join(' – ') : ''})`,
      askedDay: r.info_requested_at ? longDate(r.info_requested_at, false) : 'this week',
      nWord: `${WORDS[n] || n} item${n === 1 ? '' : 's'}`, areIs: n === 1 ? 'is' : 'are', nWordShort: `${WORDS[n] || n} question${n === 1 ? '' : 's'}`,
      answers: rep.answers,
      sources: (info?.sources || []).map((t2, i) => ({ n: i + 1, t: t2 })), hasSources: !rep.edited && !!info?.sources?.length,
      sendHead: r.stage === 'portal_open' ? `Sent by a clinician, on ${channelLabel(s, r)}, in their own login.` : "Sent by a clinician, by fax through CCC of SN's e-fax account, so this request's whole history stays in one place.",
      sendSub: sent ? ` Pressed ${fmtDate(sent)}, ${fmtTime(sent)}${r.stage === 'portal_open' ? ' · waiting for the upload confirmation' : r.stage === 'submitted' ? ' · decision clock restarted' : ''}.` : '',
      canSend: open, sendBtn: 'Send by fax',
      portalAlt: open && r.channel !== 'fax', portalAltLabel: `Upload in ${channelLabel(s, r)} instead`,
      portalOpen: r.stage === 'portal_open'
    };
  }
  after() {
    // keep the 24-hour clock moving while the page is open
    clearInterval(this._tick);
    this._tick = setInterval(() => { if (app.current?.inst !== this) { clearInterval(this._tick); return; } if (!document.querySelector('#modal:not([hidden])') && !document.activeElement?.closest?.('#root input,#root textarea')) this.repaint(); }, 60000);
  }
  get anchors() {
    return {
      edit: () => this.edit(),
      infoSend: async () => {
        const r = this.req(); if (!r || r.stage !== 'info_requested') return;
        const text = this.plain(r);
        await this.do('request.infoSend', { id: r.id, text, via: 'fax' }); toast('Reply faxed · decision clock restarts');
      },
      infoPortal: async () => {
        const r = this.req(); if (!r || r.stage !== 'info_requested') return;
        const text = this.plain(r);
        const res = await openPortal(this, 'request.infoSend', { id: r.id, text });
        if (res) toast(`${channelLabel(this.s, r)} opened in a new tab · paste the reply and upload there`);
      },
      portal: () => { const r = this.req(); if (r) window.open(`${api.config.extURL}/${r.channel}/upload?request=${encodeURIComponent(r.id)}&kind=reply`, '_blank'); }
    };
  }
  edit() {
    const r = this.req(); if (!r) return;
    modal(`<h2>Edit the reply · ${esc(r.id)}</h2>
      <p style="margin:0 0 8px;color:#525B66">Answer the question and stop: one paragraph per item asked, nothing added. Source numbers are dropped from an edited reply.</p>
      <textarea id="irText" rows="16" style="width:100%;border:1px solid #D9D4CC;border-radius:8px;padding:10px 12px;font:inherit;font-size:13px;line-height:1.5">${esc(this.plain(r))}</textarea>
      <div style="display:flex;gap:8px;margin-top:12px"><button class="mbtn p" data-go>Save the reply</button><button class="mbtn" data-close>Cancel</button></div>`,
      (box, close) => box.querySelector('[data-go]').onclick = async () => {
        const text = box.querySelector('#irText').value.trim(); close();
        await this.do('request.infoReply', { id: r.id, text }); toast('Reply saved · logged on ' + r.id);
      });
  }
});
