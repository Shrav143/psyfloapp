// 34 · Additional info request — the payer's questions on the left, the reply that answers them and stops on the right,
// with numbered source chips. Open Availity and send keeps the mock portal flow (request.infoSend); Edit as text saves
// the reply (request.infoReply).
import { register, Screen, M, raw, esc, toast, app, api } from '../app.js';
import { REQ_TYPE, STATUS } from '../shared/labels.js';
import { pickReq, details, clientOf, openPortal, chipCls, todayLine, cap, stamp, CSS } from './Partials.js';
import { fmtDate, fmtTime, addDays } from '../shared/dates.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (iso, year = true) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); return `${MONTHS[m - 1]} ${d}${year ? ', ' + y : ''}`; };
const strip = h => String(h).replace(/<sup>\d+<\/sup>/g, '').replace(/<[^>]+>/g, '');
const ASK = '[Clinician: answer from the chart. Psyflo found no dated source for this item, so it wrote nothing.]';
const when = iso => iso ? `${fmtDate(iso)}, ${fmtTime(iso)}` : '';

// the payer's questions as the payer wrote them: "(1) …; (2) …; (3) …"
export function parseAsked(asked) {
  return String(asked || '').split(/\(\d+\)\s*/).slice(1).map(t => cap(t.replace(/[;.\s]+$/, '').replace(/;?\s*and$/i, '').trim())).filter(Boolean);
}
// a numbered source chip; the title says what the source is
const chip = (n, label) => `<span class="b2-src" tabindex="0" title="${esc(label || 'Source ' + n)}" aria-label="Source ${n}${label ? ': ' + esc(label) : ''}">${n}</span>`;

register('InfoRequest', class extends Screen {
  init() { this.state = { editing: false, text: null }; }
  req() { return pickReq(this.s, this.params.id, ['R-0408'], r => r.stage === 'info_requested'); }

  // Answer each asked item from what the record already holds; never invent (drafting rules 1, 2, 7, 12).
  draftAnswer(s, r, q, src) {
    const c = clientOf(s, r); const name = c?.initials || r.client;
    const out = (text, n, label) => ({ text, html: esc(text) + (n ? chip(n, label) : '') });
    if (/incident|aggress|behavio/i.test(q)) {
      const n = s.school_numbers?.[r.client]; const from = addDays(s.today, -30);
      const dates = (n?.incident_dates || []).filter(d => d >= from && d <= s.today);
      if (dates.length) { const k = src(`School incident log · reported ${fmtDate(n.reported)}`); return out(`Between ${longDate(from, false)} and ${longDate(s.today, false)}, the school reported ${WORDS[dates.length] || dates.length} dated incidents for ${name} (${dates.map(d => fmtDate(d)).join(', ')}), reported by the school counselor on ${longDate(n.reported, false)}.`, k, `School incident log · reported ${fmtDate(n.reported)}`); }
      return out(ASK);
    }
    if (/goal|isp|baseline/i.test(q)) {
      if (c?.goals?.length) { const k = src('ISP goals'); return out(c.goals.map(g => `Goal ${g.n} (${g.name}): ${g.objective}`).join(' ') + ' Baselines are as recorded in the ISP.', k, 'ISP goals'); }
      return out(ASK);
    }
    if (/iep/i.test(q) && c?.iep === false) { const k = src('Client record · IEP'); return out(`${name} does not have an IEP.`, k, 'Client record · IEP'); }
    return out(ASK);
  }

  // the reply: seeded answers for the tracker's own request, drafted answers otherwise; an edit replaces both
  reply(r) {
    const s = this.s; const info = details(s, r.id).info;
    const items = info?.items?.length ? info.items : r.info_items?.length ? r.info_items : parseAsked(info?.asked);
    if (r.info_reply?.text) {
      const answers = r.info_reply.text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => { const m = p.match(/^(\d+\.\s[^.]*\.)\s*([\s\S]*)$/); const head = m ? m[1] : '', a = m ? m[2] : p; return { head, html: esc(a), text: a }; });
      return { items, edited: true, answers, sources: [] };
    }
    const sources = (info?.sources || []).slice();
    const src = label => { let i = sources.indexOf(label); if (i < 0) { sources.push(label); i = sources.length - 1; } return i + 1; };
    const answers = items.map((q, i) => {
      const head = `${i + 1}. ${q}.`;
      const seeded = info?.answers?.[i];
      if (seeded) return { head, text: strip(seeded), html: String(seeded).replace(/<sup>(\d+)<\/sup>/g, (m, n) => chip(n, sources[n - 1])) };
      return { head, ...this.draftAnswer(s, r, q, src) };
    });
    return { items, edited: false, answers, sources };
  }
  plain(r) { return this.reply(r).answers.map(x => (x.head ? x.head + ' ' : '') + x.text).join('\n\n'); }

  renderVals() {
    const s = this.s; const r = this.req();
    const today = todayLine(s);
    if (!r) return { today, none: true, has: false, title: REQ_TYPE.additional_info, chip: 'None open', chipCls: 'u-chip info' };
    const info = details(s, r.id).info; const rep = this.reply(r);
    const open = r.stage === 'info_requested'; const sent = r.info_reply?.sent_at; const clk = M.requestClock(s, r);
    const pf = M.payerTag(s, r.payer); const CH = M.CHANNEL_LABEL[r.channel] || 'portal'; const fax = r.channel === 'fax';
    const questions = (info?.asked ? parseAsked(info.asked) : []).length ? parseAsked(info.asked) : rep.items.map(cap);
    const editing = this.state.editing && open;
    const chipText = open ? clk.text : r.stage === 'portal_open' ? STATUS.portal_open : sent ? 'Reply sent' : STATUS[r.stage] || r.stage;
    return {
      today, has: true, none: false,
      title: `${REQ_TYPE.additional_info} · ${M.clientLabel(s, r.client)} · ${pf}`,
      chip: chipText, chipCls: open ? chipCls(clk.sev) : r.stage === 'portal_open' ? 'u-chip watch' : 'u-chip ok',
      pf, replyLabel: open ? 'Draft reply' : 'Reply', asked: when(r.info_requested_at), due: when(r.reply_due), sentAt: sent ? stamp(s, sent) : '', hasSent: !!sent, hasDue: !!r.reply_due && open,
      questions: questions.map(text => ({ text })), hasQuestions: questions.length > 0,
      answers: rep.answers.map(a => ({ head: a.head, html: raw(this.state.editing ? esc(a.text) : a.html) })),
      edited: rep.edited, sources: rep.sources.map((label, i) => ({ n: i + 1, label })), hasSources: rep.sources.length > 0, nSources: rep.sources.length,
      editing, text: this.state.text ?? '', setText: e => { this.state.text = e.target.value; },
      canEdit: open && !editing, canSend: open && !editing && rep.answers.length > 0,
      sendAttrs: raw(rep.answers.some(a => a.text.startsWith('[Clinician:')) ? 'disabled title="Answer every question first"' : ''), portalAgain: r.stage === 'portal_open',
      alt: open && !editing && !fax, primary: fax ? 'Send by fax' : `Open ${CH} and send`, sendPrimary: () => fax ? this.fax(r) : this.portal(r),
      edit: () => this.setState({ editing: true, text: this.plain(r) }),
      cancel: () => this.setState({ editing: false, text: null }),
      save: async () => { const text = (this.state.text || '').trim(); if (!text) return toast('Write the reply first', 'err'); await this.do('request.infoReply', { id: r.id, text, by: this.me?.id }); this.setState({ editing: false, text: null }); toast('Saved'); },
      fax: () => this.fax(r), again: () => this.again(r)
    };
  }
  // the reply as it will be sent: the saved edit, else the drafted answers
  async fax(r) {
    if (r.stage !== 'info_requested') return;
    await this.do('request.infoSend', { id: r.id, text: this.plain(r), via: 'fax' });
    this.setState({ text: null }); toast('Sent by fax · decision clock restarts');
  }
  async portal(r) {
    if (r.stage !== 'info_requested') return;
    const text = this.plain(r);
    try { navigator.clipboard?.writeText(text)?.catch(() => { }); } catch { }   // no await: window.open must stay inside the click
    const res = await openPortal(this, 'request.infoSend', { id: r.id, text });
    if (res) { this.setState({ text: null }); toast(`${M.CHANNEL_LABEL[r.channel]} opened · reply copied`); }
  }
  again(r) { window.open(`${api.config.extURL}/${r.channel}/upload?request=${encodeURIComponent(r.id)}&kind=reply`, '_blank'); }
  after() {
    // keep the 24-hour clock moving while the page is open
    clearInterval(this._tick);
    this._tick = setInterval(() => { if (app.current?.inst !== this) { clearInterval(this._tick); return; } if (!this.state.editing && !document.querySelector('#modal:not([hidden])') && !document.activeElement?.closest?.('#root input,#root textarea')) this.repaint(); }, 60000);
  }
  get css() { return CSS; }
});
