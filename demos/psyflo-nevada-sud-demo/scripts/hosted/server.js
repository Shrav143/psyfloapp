// The Psyflo server, minus HTTP: the same wiring server/index.js does at start-up, run in the page. The request handling that index.js does
// per URL lives in vnet.js. Nothing here changes server behaviour; the modules are the ones `node server/index.js` loads.
import MODS from 'hosted:actions';
import { store } from '../../server/psyflo/store.js';
import { lauris } from '../../server/lauris/store.js';

// every action module (filename order, like index.js): the default export is a map of actions
for (const mod of MODS) store.register(mod.default);

export { store, lauris };
