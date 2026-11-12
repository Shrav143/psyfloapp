// Simulation controls: what used to sit in the Authorizations header ("Demo: receive a reply", "Demo: advance the clock a day").
// They live in the presenter dock now, and any screen may call them too:
//   import { sim } from '../app.js';   sim.receiveReply();   sim.advanceDay();
// Both are labelled demo actions and the server decides who may use them (capability demo.controls).
import { esc } from './util.js';
import { modal } from './overlay.js';
import { toast } from './toast.js';
import { fmtDate } from '../shared/dates.js';

const KINDS = [['approved', 'Approved'], ['partial', 'Partial'], ['info', 'Information request'], ['denied', 'Denied']];
export function makeSim(api, M) {
  return {
    // Opens the picker: which request, how many units, which kind of reply. Calls the existing action request.demoReply.
    receiveReply() {
      const s = api.state;
      const waiting = s.requests.filter(r => ['submitted', 'overdue', 'portal_open', 'appeal_sent'].includes(r.stage));
      if (!waiting.length) { modal({ title: 'Receive a reply', size: 'sm', body: `<p>No request is waiting for a payer's reply. Send one first, then come back.</p>`, actions: [{ label: 'OK', tone: 'primary' }] }); return; }
      const def = waiting.find(r => r.id === 'R-0416') || waiting[0];
      const opts = waiting.map(r => `<option value="${esc(r.id)}"${r.id === def.id ? ' selected' : ''}>${esc(r.id)} · ${esc(M.clientLabel(s, r.client))} · ${esc(M.payerShort(s, r.payer))} · ${esc(M.STAGE_LABEL[r.stage])}</option>`).join('');
      modal({
        title: 'Receive a reply', body: `<p class="ui-muted">Payer replies cannot arrive during a demo, so this stands in for the fax or portal letter. Logged as a demo event on the request.</p>
        <div class="ui-field"><label class="ui-field__l" for="sim-rq">Request</label><select class="ui-select" id="sim-rq">${opts}</select></div>
        <div class="ui-field"><label class="ui-field__l" for="sim-un">Units (approved or offered; blank for the default)</label><input class="ui-input" id="sim-un" type="number" min="1" max="300" style="width:140px"></div>
        <div class="ui-btnrow" role="group" aria-label="Kind of reply">${KINDS.map(([k, l]) => `<button type="button" class="ui-btn ${k === 'partial' ? 'ui-btn--primary' : 'ui-btn--secondary'}" data-sim-kind="${k}">${l}</button>`).join('')}</div>`,
        actions: [{ label: 'Cancel', tone: 'secondary' }],
        onMount: (box, h) => box.querySelectorAll('[data-sim-kind]').forEach(b => b.addEventListener('click', async () => {
          const id = box.querySelector('#sim-rq').value; const units = +box.querySelector('#sim-un').value || undefined; h.close();
          try { await api.do('request.demoReply', { id, kind: b.dataset.simKind, units }); const r = M.byId(api.state.requests, id); toast(`Demo: ${b.textContent.toLowerCase()} received for ${id} · now ${M.STAGE_LABEL[r?.stage] || ''}`); }
          catch (e) { toast(e.message, 'err'); }
        }))
      });
    },
    async advanceDay() {
      try { await api.do('demo.advanceDay'); toast('Demo: clock advanced to ' + fmtDate(api.state.today, { dow: true })); } catch (e) { toast(e.message, 'err'); }
    }
  };
}
