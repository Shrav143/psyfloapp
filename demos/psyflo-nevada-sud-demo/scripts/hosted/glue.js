// Hosted-only behaviour that needs no source patch: the app's own classes are adjusted at run time, before web/js/app.js boots.
// (Source rewrites that cannot be done this way live in scripts/build-hosted.mjs.)
import { ExtComposite } from '../../web/js/ext-composite.js';

// The extension screens are the mock Client Record in a frame. A page cannot load a frame from a URL here, so the frame carries the address in
// data-src and the virtual network fills it (mountFrame) once the screen is painted; no microphone attribute (the virtual network sets it where allowed).
if (typeof ExtComposite === 'function') {
  const prepare = ExtComposite.prototype.prepare;
  ExtComposite.prototype.prepare = function (...a) {
    const t = prepare ? prepare.apply(this, a) : '';
    return String(t).replace(/(<iframe\b[^>]*?)\ssrc="/g, '$1 data-src="').replace(/(<iframe\b[^>]*?)\sallow="microphone"/g, '$1');
  };
  ExtComposite.prototype.after = function (root) {
    const f = window.__vnet && root.querySelector('iframe.xframe');
    if (f && !f.dataset.mounted) { f.dataset.mounted = '1'; window.__vnet.mountFrame(f, f.dataset.src); }
  };
}
