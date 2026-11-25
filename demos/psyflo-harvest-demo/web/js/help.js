// The ? help tip: a 16 px circle that explains one rule on hover, keyboard focus or tap (20 words or fewer).
// Markup anywhere (templates, panel, phone):  <button type="button" class="hlp" data-help="…" aria-label="About …">?</button>
// Or from code:  helpIcon('…', 'units')
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export const helpIcon = (text, about = 'this') => `<button type="button" class="hlp" data-help="${esc(text)}" aria-label="About ${esc(about)}">?</button>`;

let tip = null, owner = null, timer = null;
function hide() { clearTimeout(timer); if (tip) { tip.remove(); tip = null; } if (owner) { owner.removeAttribute('aria-describedby'); owner.setAttribute('aria-expanded', 'false'); owner = null; } }
function show(el) {
  hide(); owner = el;
  tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); tip.id = 'tip-' + Math.random().toString(36).slice(2, 7);
  tip.textContent = el.getAttribute('data-help'); document.body.appendChild(tip);
  el.setAttribute('aria-describedby', tip.id); el.setAttribute('aria-expanded', 'true');
  const r = el.getBoundingClientRect(); const tr = tip.getBoundingClientRect();
  let x = Math.min(Math.max(8, r.left + r.width / 2 - tr.width / 2), innerWidth - tr.width - 8);
  let y = r.bottom + 8; if (y + tr.height > innerHeight - 8) y = r.top - tr.height - 8;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
export function initHelp(root = document) {
  if (root.__helpInit) return; root.__helpInit = true;
  const target = e => e.target.closest && e.target.closest('.hlp[data-help]');
  root.addEventListener('mouseover', e => { const el = target(e); if (el && el !== owner) { clearTimeout(timer); timer = setTimeout(() => show(el), 150); } });
  root.addEventListener('mouseout', e => { const el = target(e); if (el) hide(); });
  root.addEventListener('focusin', e => { const el = target(e); if (el) show(el); });
  root.addEventListener('focusout', e => { if (target(e)) hide(); });
  root.addEventListener('click', e => { const el = target(e); if (el) { e.preventDefault(); e.stopPropagation(); owner === el ? hide() : show(el); } else if (owner) hide(); });
  root.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  addEventListener('scroll', hide, true);
}
initHelp();
