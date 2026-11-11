// The Psyflo extension panel. Same code in the MV3 side panel and in the mock Lauris in-page fallback:
// it talks to the page bridge with postMessage (the side panel relays to the content script).
// It reads the page the user has open, drafts from Psyflo's own records, and types into the open form
// only when the user presses a button. It never presses Process Form, Get Signature or Send.
//
// One 400 px frame for every view (ui.js): navy header with logo, "<Form> · <Student>" and one status chip; the green/yellow legend;
// one state card with the single filled button; the boxes list; one collapsed checks line; a sticky footer where a view needs one.
//   core.js      page state, transport, drawing, typing into the form, recording, presenter commands
//   home.js      home, new consumer, the consumer record, plain states
//   screening.js screening call and intake (CNA)
//   notes.js     daily note
//   seeded.js    treatment plan, weekly, monthly, incident, quarterly, discharge
//   requests.js  initial request, continued stay, forms to approve
import { api, P, S, M, ACT, hooks, framed, LEVEL, FORM_NAME, meFromPage, clientForPage, draw, fillBoxes, stopRecording, send, call, myLevel, root } from './core.js';
import { frame, flashLine } from './ui.js';
import * as home from './home.js';
import { screeningView, refScreeningView, cnaView, preCallBoxes } from './screening.js';
import { dpnView } from './notes.js';
import { seededView } from './seeded.js';
import { requestView, approvalsView } from './requests.js';

// ---------------------------------------------------------------- which view for which page
function viewHTML() {
  if (!api.state) return home.loadingView();
  if (!framed) return home.unframedView();
  const p = P.page;
  if (!p) return home.waitingView();
  if (p.kind === 'portal-form' || p.kind === 'portal-confirmation') return home.portalView();
  if (p.kind === 'login') return home.loginView();
  const c = clientForPage();
  if (p.consumer && p.consumer.program && p.consumer.program !== 'TDT') return home.offView(p.consumer);
  switch (p.kind) {
    case 'consumers': return home.homeView();
    case 'new-consumer': return home.newConsumerView();
    case 'session': return formView(p.form?.type, c);
    case 'approvals': case 'approval': return approvalsView(c);
    case 'record': case 'pick-form': case 'surveys': return home.recordView(c, { requestView });
    case 'saved': case 'rejected': return home.listView();
    default: return home.homeView();
  }
}
const note = (form, text, student) => frame({ logo: P.logo, form, student, body: `<div class="fl n"><div>${text}</div></div>` });
function formView(type, c) {
  const me = meFromPage(); const lvl = LEVEL[me.role];
  if (!c && type === 'screening' && lvl >= 3) { const r = home.referralForConsumer(P.page.consumer?.no, P.page.consumer?.initials); if (r && r.lauris_no) return refScreeningView(r); }
  if (!c) return note(FORM_NAME[type] || 'Form', 'Not a Psyflo student', P.page.consumer?.initials);
  if (['screening', 'cna', 'isp', 'sra-initial', 'sra-continued', 'quarterly', 'discharge'].includes(type) && lvl < 3) return note(FORM_NAME[type], 'Drafts for clinicians', c.initials);
  if (lvl === 1 && c.staff && c.staff !== me.id) return note(FORM_NAME[type] || 'Form', 'Not on your caseload', c.initials);
  switch (type) {
    case 'screening': return screeningView(c);
    case 'cna': return cnaView(c);
    case 'dpn': return dpnView(c);
    case 'sra-initial': return requestView(c, 'initial');
    case 'sra-continued': return requestView(c, 'continued_stay');
    default: return seededView(type, c);
  }
}
hooks.view = viewHTML;

// ---------------------------------------------------------------- page changes
function onPage(page, event) {
  const changedPage = !P.page || P.page.url !== page.url;
  P.page = page;
  if (event) P.event = event; else if (changedPage) P.event = null;
  if (changedPage) { P.ui = {}; stopRecording(true); }
  draw();
  autoActions();
}
hooks.onPage = onPage;

// Typing happens only into the form the user has open, and only where the brief says it drops in: a waiting phone dictation.
async function autoActions() {
  const p = P.page; if (!p || p.kind !== 'session') return;
  const c = clientForPage(); if (!c) return;
  const key = p.url + '|' + (p.form?.session || 'new');
  if (P.autoDone === key) return; P.autoDone = key;
  const lvl = LEVEL[meFromPage().role];
  if (p.form.type === 'sra-initial' && lvl >= 3 && !S().requests.some(r => r.client === c.id && r.type === 'initial' && r.stage !== 'closed')) {
    await api.do('request.ensure', { id: c.id === 'TW' ? 'R-0416' : undefined, client: c.id, type: 'initial' }).catch(() => { });
  }
  if (p.form.type === 'dpn') {
    const { dpnState, dpnBoxes, DPN_SOURCES } = await import('./notes.js');
    const d = M.waitingDictations(S(), c.id)[0];
    const narrative = p.form.fields.find(f => f.label === 'Narrative')?.value;
    if (d && !narrative) {
      P.ui.usedDict = d.id; P.ui.unitsConfirmed = false;
      const st = dpnState(c);
      await fillBoxes(dpnBoxes(c, st), { form: 'dpn', client: c, sources: DPN_SOURCES });
      P.ui.dropped = true; draw();
    }
  }
}

// ---------------------------------------------------------------- boot
window.__psyfloPanel = P;
(async function boot() {
  await api.init('');
  P.logo = (await fetch('/js/logo.svg').then(r => r.text())).replace(/width="\d+" height="\d+"/, 'width="72" height="24"');
  api.onChange(() => draw());
  if (framed) {
    send({ cmd: 'hello' });
    const r = await call('hello');
    if (r && r.page) onPage(r.page, r.event);
  }
  draw();
})();
