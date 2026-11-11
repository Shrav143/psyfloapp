// The Psyflo server, minus HTTP: the same wiring server/index.js does at start-up, run in the page. The request handling that index.js
// does per URL lives in vnet.js. Nothing here changes server behaviour; the modules are the ones `node server/index.js` loads.
import MODS from 'hosted:actions';
import { store } from '../../server/psyflo/store.js';
import { lauris } from '../../server/lauris/store.js';
import { attest } from '../../server/attest.js';
import { registerAuthz } from '../../server/psyflo/authz.js';
import { registerProjection } from '../../server/psyflo/project.js';

// every action module (filename order, like index.js): default = actions; optional named exports authz, projection, hooks
for (const mod of MODS) {
  store.register(mod.default);
  if (mod.authz) registerAuthz(mod.authz);
  if (mod.projection) registerProjection(mod.projection);
  if (mod.hooks) for (const [name, fn] of Object.entries(mod.hooks)) store.hooks.on(name, fn);
}

// ONE clock: Lauris reads Psyflo's store.clock; a reset or a day advance moves both
lauris.setClock(() => store.now());
store.hooks.on('reset', ({ preset }) => { lauris.reset(preset); attest.reset(); });
store.hooks.on('advance', () => lauris.syncToday());
store.hooks.on('scenario', ({ id }) => lauris.scenario(id));
attest.lauris = ev => lauris.verify(ev);
store.laurisFixture = lauris;
lauris.syncToday();

export { store, lauris };
