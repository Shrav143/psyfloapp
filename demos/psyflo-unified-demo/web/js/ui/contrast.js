// WCAG contrast of the token pairs, computed from the LIVE custom properties (so the gallery and test/ui-kit.mjs can never drift
// from tokens.css). Text pairs need 4.5:1, UI pairs (borders, focus ring, icons) need 3:1.
export const TOKEN_PAIRS = [
  // [foreground token, background token, minimum ratio, what it is]
  ['--ink-900', '--paper-50', 4.5, 'Text on paper'], ['--ink-900', '--surface-0', 4.5, 'Text on cards'], ['--ink-900', '--sand-100', 4.5, 'Text on sand (rail, table head)'],
  ['--muted-700', '--paper-50', 4.5, 'Secondary text on paper'], ['--muted-700', '--sand-100', 4.5, 'Secondary text on sand'], ['--muted-700', '--surface-0', 4.5, 'Secondary text on cards'],
  ['--action-ink', '--action', 4.5, 'Primary button label'], ['--action-ink', '--action-hover', 4.5, 'Primary button hover'],
  ['--teal-700', '--paper-50', 4.5, 'Link on paper'], ['--teal-700', '--surface-0', 4.5, 'Link on cards'], ['--teal-700', '--teal-tint', 4.5, 'Selected row text'],
  ['--danger-fg', '--danger-bg', 4.5, 'Danger chip'], ['--warning-fg', '--warning-bg', 4.5, 'Warning chip'], ['--success-fg', '--success-bg', 4.5, 'Success chip'],
  ['--neutral-fg', '--neutral-bg', 4.5, 'Neutral chip'], ['--info-fg', '--info-bg', 4.5, 'Info chip'],
  ['--danger-fg', '--surface-0', 4.5, 'Danger text on cards'], ['--warning-fg', '--surface-0', 4.5, 'Warning outline chip'], ['--info-fg', '--surface-0', 4.5, 'Info outline chip'],
  ['--success-fg', '--surface-0', 4.5, 'Success outline chip'], ['--neutral-fg', '--surface-0', 4.5, 'Neutral outline chip'],
  ['--on-navy', '--navy-900', 4.5, 'Presenter ribbon text'], ['--on-navy-muted', '--navy-900', 4.5, 'Presenter ribbon secondary text'], ['--marigold-400', '--navy-900', 4.5, 'PRESENTER label (marigold on navy)'],
  ['--navy-900', '--marigold-400', 4.5, 'Pressed presenter button'],
  ['#FFFFFF', '--danger-fg', 4.5, 'Danger button label'],
  ['--control-500', '--surface-0', 3, 'Input border on white (WCAG 1.4.11)'], ['--control-500', '--paper-50', 3, 'Input border on paper'],
  ['--teal-600', '--paper-50', 3, 'Focus ring on paper'], ['--teal-600', '--sand-100', 3, 'Focus ring on sand'], ['--teal-300', '--navy-900', 3, 'Focus ring on navy']
];
const hex3 = h => (h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h);
export const rgbOf = c => { c = String(c).trim(); if (c[0] === '#') { c = hex3(c); return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); } const m = c.match(/rgba?\(([^)]+)\)/); return m ? m[1].split(',').slice(0, 3).map(x => +x) : null; };
export const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
export const ratio = (a, b) => { const x = lum(rgbOf(a)), y = lum(rgbOf(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
export const tokenValue = (t, el = document.documentElement) => (t[0] === '-' ? getComputedStyle(el).getPropertyValue(t).trim() : t);
// -> [{ fg, bg, min, label, fgValue, bgValue, ratio, pass }]
export function checkPairs(el) {
  return TOKEN_PAIRS.map(([fg, bg, min, label]) => { const f = tokenValue(fg, el), b = tokenValue(bg, el); const r = f && b && rgbOf(f) && rgbOf(b) ? ratio(f, b) : 0; return { fg, bg, min, label, fgValue: f, bgValue: b, ratio: r, pass: r >= min }; });
}
