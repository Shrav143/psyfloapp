// One way to open the Lauris EHR from Psyflo (R4). Every note, form, CNA, plan, guardian call and rejected form is worked in Lauris, so the
// Dashboard (both views), the review drawer and the patient chart all open it through this helper, at the page where that work is done
// (roster.js laurisPath). The mock Lauris shows the Psyflo panel beside every /consumers/<no>/session/<form> and /sessions/<id> page, so the
// person lands on the form with the panel already open.
//
//   mayOpenLauris(actor)                         true for the roles that hold ext.use (direct support, supervisor, clinician); never the administrator
//   laurisHref(base, actor, path)                `${base}/login?as=<actor id>&next=<path>` or '' (no path, no permission, no actor: fail closed)
//   laurisLink(base, actor, path, { who, title, variant, cls })
//        variant 'icon' (default)  an external-link icon with its definition on hover (ui.hint): "Open in Lauris: Daily note"
//        variant 'button'          the text button "Open in Lauris" with the icon (a drawer or a detail panel, where there is room)
//        both are real links with target=_blank; the accessible name names the patient and the document. In the hosted single-file build the
//        click is turned into an overlay with a Close button (scripts/hosted/prelude.js), so the link needs nothing special.
// `base` is api.config.laurisURL. Nothing here reads a default person: with no signed-in actor the link is empty.
import { can } from './permissions.js';
import { esc } from '../runtime.js';
import { hint } from '../ui/hint.js';
import { icon } from '../ui/util.js';

export const mayOpenLauris = actor => !!actor && !!actor.role && can(actor, 'ext.use');

export function laurisHref(base, actor, path) {
  if (!base || !path || !actor || !actor.id || !mayOpenLauris(actor)) return '';
  return `${String(base).replace(/\/$/, '')}/login?as=${encodeURIComponent(actor.id)}&next=${encodeURIComponent(path)}`;
}

export function laurisLink(base, actor, path, o = {}) {
  const href = laurisHref(base, actor, path); if (!href) return '';
  const what = [o.who, o.title].filter(Boolean).join(', ');
  const name = `Open in Lauris${what ? ': ' + what : ''} (opens Lauris in a new tab)`;
  if (o.variant === 'button') return `<a class="ui-btn ui-btn--secondary ui-btn--sm${o.cls ? ' ' + esc(o.cls) : ''}" href="${esc(href)}" target="_blank" rel="noopener" data-lauris>Open in Lauris${icon('external', 14)}<span class="ui-sr"> ${esc(what)} (opens Lauris in a new tab)</span></a>`;
  return hint('external', `Open in Lauris${o.title ? ': ' + o.title : ''}`, { tone: 'b', href, label: name, cls: `ui-hint--act${o.cls ? ' ' + o.cls : ''}`, extra: 'target="_blank" rel="noopener" data-lauris' });
}
