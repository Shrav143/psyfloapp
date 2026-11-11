// The Psyflo extension panel: entry point. The panel is split (E5): core.js (bridge messaging, state, router, shared chrome),
// views/*.js (one module per view) and views/index.js (the registry). web/panel/index.html loads this file.
import './core.js';
