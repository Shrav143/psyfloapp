// ExtDischarge: an extension screen. It opens as the mock Lauris with the Psyflo panel beside it (web/js/ext-composite.js); the panel itself is
// web/panel/ (core.js and views/*.js). This controller exists so the router finds a module (no 404) and changes nothing else.
import { register } from '../app.js';
import { ExtComposite } from '../ext-composite.js';
register('ExtDischarge', class extends ExtComposite { });
