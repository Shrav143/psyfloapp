// The Lauris page bridge contract (review/04-architecture.md section F): element ids, message shapes and redirects that must not change.
// Asserted against the mock Lauris pages, the mock portals and the bridge source.
import fs from 'node:fs';
import { suite, assert, reset, lget, lpost, EXT, BASE, LAURIS } from './lib/index.mjs';

const T = suite('bridge-contract');
const has = (html, re, msg) => assert.match(html, re, msg);
await reset('canvas');
const SRC = fs.readFileSync(new URL('../web/panel/bridge.js', import.meta.url), 'utf8');

await T.test('consumer list: #consumer-list rows carry data-consumer and data-program; .top .r and .side .lnav .b exist', async () => {
  const h = (await lget('/consumers', 'jperez')).text;
  has(h, /id="consumer-list"/); has(h, /<tr data-consumer="\d+" data-program="(TDT|SEBS|Outpatient)"/);
  has(h, /<span class="r">/); has(h, /class="lnav[^"]*"[^>]*>[^<]*<span class="b">\d+<\/span>/);
});
await T.test('consumer header: .hdr .nm, #consumer-name, "Harvest #", Program:, .units', async () => {
  const h = (await lget('/consumers/3310', 'jperez')).text;
  has(h, /<div class="hdr" data-consumer="3310">/); has(h, /class="nm" id="consumer-name">M\.R\./); has(h, /Harvest # <span id="harvest-no">3310<\/span>/); has(h, /Program: <span id="consumer-program">TDT<\/span>/); has(h, /class="units[^"]*" id="consumer-units"/);
});
await T.test('session form: #lauris-form data-form|session|consumer, #session-form-title, label[for] boxes, Save/Process buttons', async () => {
  const h = (await lget('/consumers/3310/session/dpn', 'jperez')).text;
  has(h, /<form method="post" id="lauris-form" data-form="dpn" data-consumer="3310" data-session="">/); has(h, /id="session-form-title">Daily Progress Note/);
  has(h, /<label for="f9">Narrative<\/label><textarea class="in" id="f9"/); has(h, /name="action" value="save"/); has(h, /id="process-form"/);
  assert.ok((h.match(/<label for="f\d+"/g) || []).length >= 8, 'boxes are found by label[for]');
  const t = (await lget('/consumers/3310/session/screening', 'jperez')).text; has(t, /aria-label="Physical aggression toward peers — Frequency"/, 'table cells are found by aria-label');
});
await T.test('PRG redirects and the flash: ?processed= ?saved= ?signed= ?rejected= ?created= with #lauris-flash[data-event|session|form|consumer]', async () => {
  const sv = await lpost('/consumers/3315/session/dpn', 'jperez', { action: 'save', f9: 'x' }); assert.match(sv.loc, /\/consumers\/3315\/session\/dpn\?id=\d+&saved=\d+/);
  has((await lget(sv.loc, 'jperez')).text, /id="lauris-flash" data-event="saved" data-session="\d+" data-form="dpn" data-consumer="3315"/);
  const pr = await lpost('/consumers/3320/session/quarterly', 'jperez', { action: 'process' }); assert.match(pr.loc, /\/consumers\/3320\?tab=active&processed=\d+/);
  const id = pr.loc.match(/processed=(\d+)/)[1];
  has((await lget(pr.loc, 'jperez')).text, new RegExp(`id="lauris-flash" data-event="processed" data-session="${id}" data-form="quarterly" data-consumer="3320"`));
  const ap = (await lget('/approvals', 'jperez')).text; has(ap, /id="approval-list"/); has(ap, new RegExp(`<tr data-session="${id}" data-form="quarterly" data-consumer="3320">`));
  const pv = (await lget('/approvals/' + id, 'jperez')).text;
  has(pv, /id="lauris-preview" data-session="\d+" data-form="quarterly"/); has(pv, /<div class="wm">PREVIEW ONLY<\/div>/); has(pv, /<div class="row"><b>[^<]+<\/b><div class="pv" data-label=/); has(pv, /id="get-signature"/); has(pv, /id="approval-status">Awaiting electronic signature/);
  const sg = await lpost(`/approvals/${id}/sign`, 'jperez', {}); assert.match(sg.loc, new RegExp(`/approvals/${id}\\?signed=${id}`));
  const sgp = (await lget(sg.loc, 'jperez')).text; has(sgp, new RegExp(`id="lauris-flash" data-event="signed" data-session="${id}"`)); has(sgp, /id="lauris-signature"/); has(sgp, /id="approval-status">Signed/);
  const p2 = await lpost('/consumers/3322/session/isp', 'jperez', { action: 'process' }); const id2 = p2.loc.match(/processed=(\d+)/)[1];
  const rj = await lpost(`/approvals/${id2}/reject`, 'cdiaz', { note: 'Name the objective' }); assert.match(rj.loc, new RegExp(`/rejected\\?rejected=${id2}`));
  has((await lget(rj.loc, 'cdiaz')).text, /id="lauris-flash" data-event="rejected"/);
  const cr = await lpost('/consumers/new', 'jperez', { initials: 'Z.Z.', program: 'TDT', locality: 'Lynchburg City', school: 'Lynchburg City · MS-2' }); assert.match(cr.loc, /\/consumers\/\d+\?created=\d+/);
  has((await lget(cr.loc, 'jperez')).text, /id="lauris-flash" data-event="created" data-consumer="\d+"/);
  has((await lget('/consumers/new', 'jperez')).text, /id="lauris-form" data-form="new-consumer"/);
});
await T.test('portal pages: #portal-form and #portal-confirmation[data-ref|request|kind]', async () => {
  const f = await fetch(EXT + '/availity/upload?request=R-0408&kind=reply').then(r => r.text()); has(f, /<form method="post" id="portal-form">/);
  const c = await fetch(EXT + '/availity/upload', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ request: 'R-0408', kind: 'reply', member: 'm', files: 'f' }) }).then(r => r.text());
  has(c, /id="portal-confirmation" data-ref="AV-\d{6}" data-request="R-0408" data-kind="reply"/); has(c, /id="confirmation-number"/);
});
await T.test('the bridge source: message shapes, origin checks, no clicks, no background fetch to Lauris, same copy in extension/', () => {
  has(SRC, /psyflo\s*[!=]==\s*'panel'/); has(SRC, /psyflo:\s*'bridge'/); has(SRC, /type:\s*'page'/);
  for (const cmd of ['read', 'hello', 'fill', 'focus', 'mark', 'navigate']) has(SRC, new RegExp(`case '${cmd}'`), 'cmd ' + cmd);
  has(SRC, /e\.origin !== appOrigin/, 'origin check'); has(SRC, /data-psyflo/); has(SRC, /#lauris-flash|lauris-flash/); has(SRC, /\.top \.r/);
  assert.noMatch(SRC, /\.click\(\)/, 'the bridge never clicks Process Form, Get Signature or Send');
  assert.noMatch(SRC, /fetch\(\s*location|fetch\(\s*['"`]\//, 'no background fetch to Lauris');
  assert.eq(fs.readFileSync(new URL('../extension/bridge.js', import.meta.url), 'utf8'), SRC, 'extension/bridge.js is the server-start copy of web/panel/bridge.js');
  const man = JSON.parse(fs.readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  assert.ok(man.host_permissions.includes('http://localhost:4001/*') && man.host_permissions.includes('http://localhost:4002/*')); assert.deepEq(man.content_scripts[0].js, ['bridge.js']);
});
await T.test('what the bridge reports is accepted from the Lauris origin only with a JSON body (the bridge posts exactly this)', async () => {
  const r = await fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: LAURIS }, body: JSON.stringify({ action: 'lauris.observed', args: { event: 'saved', form: 'dpn', session: '1', consumer: { no: '3315', initials: 'J.T.' }, user: 'K. Hale' } }) });
  assert.ok([200, 409].includes(r.status), 'status ' + r.status); assert.eq(r.headers.get('access-control-allow-origin'), LAURIS);
});

await T.done();
