// One-page mocks of the outside systems a person uses in their own login: Availity (Anthem), the Health Plan of
// Nevada provider portal, the incident portal and the Nevada Medicaid eligibility (EVS) lookup. Psyflo never logs in
// to any of them. (Paths /portal and /dmas/lookup are kept so existing links still work.)
import { html, readForm, esc, redirect, notFound } from '../util.js';

const page = (req, brand, color, body) => {
  const appURL = process.env.PSYFLO_APP_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${(req.headers.host || 'localhost').split(':')[0]}:${process.env.APP_PORT || 4000}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(brand)} (mock)</title>
<style>body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#F4F6F8;color:#222;font-size:14px}
.top{background:${color};color:#fff;padding:12px 20px;font-weight:700;display:flex;gap:12px;align-items:center}.top span{font-weight:400;font-size:12px;opacity:.85;margin-left:auto}
main{max-width:760px;margin:24px auto;background:#fff;border:1px solid #DDE1E6;border-radius:6px;padding:20px 24px}
label{display:block;font-size:12px;color:#555;margin:10px 0 4px}input,select,textarea{width:100%;padding:8px;border:1px solid #C9CDD3;border-radius:4px;font:inherit}
button{margin-top:14px;background:${color};color:#fff;border:0;border-radius:4px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer}
.ok{background:#E6F4EA;border:1px solid #9ED3AE;padding:12px;border-radius:4px;color:#1D5F33}.muted{color:#777;font-size:12px}
.demo{background:#FFF8E6;border:1px solid #E8C56A;padding:8px 12px;border-radius:4px;font-size:12px;margin-bottom:12px}</style></head>
<body><div class="top">${esc(brand)} <span>mock · signed in with the clinician's own login · synthetic data</span></div><main>${body}</main>
<script src="${appURL}/panel/bridge.js" data-mode="portal" data-app="${appURL}"></script></body></html>`;
};

export async function externalHandler(req, res) {
  const url = new URL(req.url, 'http://x'); const p = url.pathname; const q = url.searchParams;
  const portal = p.startsWith('/availity') ? 'availity' : p.startsWith('/portal') || p.startsWith('/uhc') ? 'portal' : null;
  if (portal && p.endsWith('/upload')) {
    const brand = portal === 'availity' ? 'Availity Essentials · Anthem (Nevada Medicaid)' : 'Health Plan of Nevada · provider portal';
    const color = portal === 'availity' ? '#0B5394' : '#00594F';
    if (req.method === 'POST') {
      const f = await readForm(req);
      const ref = (portal === 'availity' ? 'AV-' : 'HPN-') + Math.floor(100000 + Math.random() * 899999);
      return html(res, page(req, brand, color, `<div class="ok" id="portal-confirmation" data-ref="${ref}" data-request="${esc(f.request || '')}" data-kind="${esc(f.kind || '')}"><b>Submission received.</b> Confirmation number <b id="confirmation-number">${ref}</b>.</div>
<p>Member: ${esc(f.member || '')} · ${esc(f.kind === 'reply' ? 'Additional information reply' : 'Authorization request')} · ${esc(f.files || 'packet')} attached.</p>
<p class="muted">The Psyflo extension reads this confirmation and logs it on the request. You can close this tab.</p>`));
    }
    const kind = q.get('kind') || 'request';
    return html(res, page(req, brand, color, `<div class="demo">Demo: this page stands in for ${esc(brand)}. You are in your own session; Psyflo opened it with the packet ready to attach.</div>
<h2 style="margin-top:0">${kind === 'reply' ? 'Respond to a request for information' : 'Submit an authorization request'}</h2>
<form method="post" id="portal-form"><input type="hidden" name="request" value="${esc(q.get('request') || '')}"><input type="hidden" name="kind" value="${esc(kind)}">
<label for="member">Member ID</label><input id="member" name="member" placeholder="Medicaid ID" value="on file (demo)">
<label for="svc">Service</label><select id="svc" name="svc"><option>ASAM Level 2.1 · Intensive outpatient · H0015</option><option>ASAM Level 1 · Outpatient · H0004 / H0005</option><option>Mental health therapy · 90832 / 90834 / 90837</option></select>
${portal === 'portal' && kind !== 'reply' ? `<label for="mn">Medical necessity (paste the per-dimension text Psyflo formatted for HPN)</label><textarea id="mn" name="mn" rows="6" placeholder="D1 … D6"></textarea>` : ''}
<label for="files">Attachments</label><input id="files" name="files" value="${esc(q.get('request') || '')} packet (signed PDF${kind === 'reply' ? ', reply' : ', ASAM assessment, treatment plan, UDS result'})">
${kind === 'reply' ? '<label for="reply">Reply</label><textarea id="reply" name="reply" rows="6" placeholder="Paste the reply Psyflo drafted"></textarea>' : ''}
<button type="submit">Submit</button></form>`));
  }
  if (p === '/state-portal/incident') {
    if (req.method === 'POST') { const ref = 'NV-INC-' + Math.floor(10000 + Math.random() * 89999); return html(res, page(req, 'Nevada DPBH incident reporting (mock)', '#5B2C6F', `<div class="ok" id="portal-confirmation" data-ref="${ref}"><b>Report filed.</b> Reference ${ref}.</div><p class="muted">Psyflo logged the time you pressed File now. You can close this tab.</p>`)); }
    return html(res, page(req, 'Nevada DPBH incident reporting (mock)', '#5B2C6F', `<div class="demo">Demo: stands in for a state incident portal (hidden in this build). A person files the report in their own login.</div>
<form method="post"><label>Client</label><input value="${esc(q.get('client') || 'D.W.')}"><label>Level</label><input value="${esc(q.get('level') || 'Level 2')}"><label>Date / time</label><input value="${esc(q.get('when') || '10/28/2026 2:40 pm')}"><label>Summary</label><textarea rows="5">${esc(q.get('what') || '')}</textarea><button type="submit">File report</button></form>`));
  }
  if (p === '/dmas/lookup' || p === '/evs/lookup') {
    const id = q.get('id') || '';
    const PLANS = { humana: 'SilverSummit Healthplan', anthem: 'Anthem Blue Cross Blue Shield (Nevada Medicaid)', sentara: 'Molina Healthcare of Nevada', aetna: 'CareSource Nevada', uhc: 'Health Plan of Nevada (Medicaid)', ffs: 'Fee-for-service (no managed care plan)' };
    const plan = PLANS[q.get('plan')] || q.get('plan') || PLANS.humana;
    return html(res, page(req, 'Nevada Medicaid · eligibility verification (EVS)', '#1B5E20', `<div class="demo">Demo: a person runs this lookup from the details Psyflo prepared, then records the result in Psyflo. Psyflo does not automate it.</div>
<form method="get"><label for="id">Medicaid recipient ID</label><input id="id" name="id" value="${esc(id)}"><label for="dob">Date of birth</label><input id="dob" name="dob" value="${esc(q.get('dob') || '')}"><label for="dos">Date of service</label><input id="dos" name="dos" value="${esc(q.get('dos') || 'today')}"><button type="submit">Verify eligibility</button></form>
${id ? `<div class="ok" style="margin-top:14px"><b>Eligible</b> · Nevada Medicaid · managed care: ${esc(plan)} · effective 07/01/2026 · as of the date of service</div><p class="muted">Take a screenshot and attach it in Psyflo when you record the result.</p>` : ''}
<h3 style="margin-top:18px;font-size:14px">Who pays, by enrollment</h3>
<table style="width:100%;border-collapse:collapse;font-size:12px">${Object.values(PLANS).map(n => `<tr><td style="border-top:1px solid #DDE1E6;padding:5px 0">${esc(n)}</td></tr>`).join('')}</table>
<p class="muted">Not enrolled in Medicaid: check grant funding (Ryan White Part A/C, SAPTA block grant, HOPWA) — grant clients need no prior authorization.</p>`));
  }
  if (p === '/' ) return redirect(res, '/availity/upload');
  return notFound(res);
}
