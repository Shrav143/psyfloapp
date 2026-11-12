// Shared parts of the two request-work screens (Authorizations, Denial Intelligence) and their case pages (R4 FMT): the cells and small pieces
// that both screens must show the same way, and the icon-with-definition forms of the quiet labels (ui.hint). Nothing here owns data.
//   srcHint(ruleOrKind)      the source chip (Officially verified · Payer-specific · Harvest-reported · Unverified) as its icon; the definition
//                            (kind, source, checked on, note) shows on hover and focus; the control carries data-verification="<kind>"
//   lockHint(text)           the "Needs clinician" / "Clinical text hidden for your role" line as a lock icon with the sentence on hover
//   lockLine(text)           the same for a whole section that is withheld: the lock icon and two words, the sentence on hover
//   missHint(labels)         evidence-missing pills as one warning icon with a count; the hover names what to verify
//   ownerCell(name, backup)  the owner column: the short name, a quiet "backup" icon when one is set (the same cell on both lists)
//   deadlineCell(...)        the deadline cell: the dated flag (warning icon from "soon", red when overdue) and the source icon
import { esc, ui } from '../app.js';
import { verificationKind, VERIFICATION } from '../ui/chip.js';

const TONE = { success: 'g', info: 'b', warning: 'y' };
const ICON = { unverified: 'help' };   // the warning triangle is the date flag's; an unverified source is a question mark

export function srcHint(kindOrRule, o = {}) {
  const k = verificationKind(kindOrRule); const V = VERIFICATION[k];
  const r = typeof kindOrRule === 'object' && kindOrRule ? kindOrRule : {};
  const src = o.source || r.source; const on = o.verified_on || r.verified_on; const note = o.note || r.note;
  const tip = [V.full, src, on && 'checked ' + on, note].filter(Boolean).join(' · ');
  return ui.hint(ICON[k] || V.icon, tip, { tone: TONE[V.tone] || 'n', cls: `ui-verify ui-verify--${k}`, extra: `data-verification="${esc(k)}"`, label: o.label ? `${o.label}: ${tip}` : tip });
}

export const lockHint = (text, o = {}) => ui.hint('lock', text, { tone: o.tone || 'n', label: o.label, cls: 'ui-lockhint' });
export const lockLine = (text, short = 'Clinicians only') => `<p class="ui-lockline">${ui.hint('lock', text, { tone: 'n', cls: 'ui-lockhint' })}<span class="ui-muted">${esc(short)}</span></p>`;

// labels: the things to verify, e.g. ['previous treatment outcome']
export function missHint(labels, o = {}) {
  const l = (labels || []).filter(Boolean); if (!l.length) return '';
  const tip = `Evidence missing: no stored record supports ${l.length === 1 ? 'this' : 'these'}. Verify ${l.join('; ')} before ${l.length === 1 ? 'it is' : 'they are'} used.`;
  return ui.hint('alert', tip, { tone: 'y', text: String(l.length), label: o.label || `${l.length} evidence missing: ${l.join('; ')}`, cls: 'ui-misshint' });
}

export function ownerCell(name, backup) {
  return `<span class="ui-owner">${esc(name || '—')}${backup ? ui.hint('user', `Backup: ${backup}`, { tone: 'n', label: `Backup: ${backup}` }) : ''}</span>`;
}

// d: { date, sev ('overdue' | 'soon' | 'ok'), text (what shows), why (the hover sentence) }; rule: the source of the number; extra: trailing HTML (the flag button)
export function deadlineCell(d, rule, extra = '') {
  if (!d || (!d.date && !d.text)) return `<div class="ui-dlcell"><span class="ui-muted" aria-label="No date">—</span>${extra}</div>`;
  const flag = d.date ? ui.dateFlag({ date: String(d.date).slice(0, 10), sev: d.sev, why: d.why, text: d.text }) : `<span class="ui-muted">${esc(d.text)}</span>`;
  return `<div class="ui-dlcell">${flag}${rule ? srcHint(rule) : ''}${extra}</div>`;
}

// the service as the lists show it (the same short form on both)
export const svcShort = x => String(x || '').replace(/^TDT school day$/, 'TDT');

// the owner line of a case header: who, the backup on hover, and the way to change it (the same line on both case pages)
export function ownerControl(name, backup) {
  return `<span class="ui-owner"><span class="ui-owner__l">Owner</span> <b>${esc(name || '—')}</b>${backup ? ui.hint('user', `Backup: ${backup}`, { tone: 'n', label: `Backup: ${backup}` }) : ''}<button type="button" class="ui-linkbtn" data-x="assign" data-ui-return="assign">Change<span class="ui-sr"> owner</span></button></span>`;
}
