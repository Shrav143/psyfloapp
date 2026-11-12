// The flag dialogs (R3): mark an authorization for attention, or look at and clear the flag. Used by the Authorizations list and the case page.
// A flag is workflow, not clinical: a reason from a short list (FLAG_REASONS) and an optional short note. Only clinicians and the person who
// wrote it see the note (server projection). Raising and clearing are audit events with who and when. Nothing is sent to anyone: the other
// people see the flag in the list and in the bell (shared/sel/notify.js).
import { esc, ui, toast } from '../app.js';
import { FLAG_REASONS } from '../shared/sel/auth.js';
import { fmtDateTime } from '../shared/dates.js';

async function run(screen, args, ok) {
  try { await screen.do('request.flag', args); if (ok) toast(ok); return true; } catch { return false; }   // the server's reason was toasted
}
// c: { id, label, flag }  (flag = the open flag or null). opener: the button to return focus to.
export function openFlagDialog(screen, c, opener) {
  const f = c.flag;
  if (!f) {
    return ui.modal({
      title: `Flag ${c.label} · ${c.id}`, size: 'sm', returnFocus: opener, initialFocus: '#a-fl-r',
      body: `<p class="ui-muted">A flag marks this authorization for attention. The people who work authorizations see it in the list and in their notifications. It sends nothing to anyone.</p>
        <label class="ui-field"><span class="ui-field__l">Reason</span><select class="ui-select" id="a-fl-r">${FLAG_REASONS.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select></label>
        <label class="ui-field"><span class="ui-field__l">Note (optional)</span><input class="ui-input" id="a-fl-n" type="text" maxlength="140" autocomplete="off" placeholder="One line, no clinical details"><span class="ui-field__h">Clinicians and you see the note. Other roles see the reason.</span></label>`,
      actions: [{ label: 'Cancel', tone: 'secondary' }, { label: 'Flag it', tone: 'primary', onClick: async h => {
        const reason = h.dialog.querySelector('#a-fl-r').value; const note = h.dialog.querySelector('#a-fl-n').value.trim();
        if (reason === 'other' && note.length < 3) { toast('Say what the flag is about in the note.', 'err'); h.dialog.querySelector('#a-fl-n').focus(); return false; }
        return (await run(screen, { id: c.id, flag: true, reason, note }, `${c.id} flagged`)) ? undefined : false;
      } }]
    });
  }
  const note = f.note ? `<div class="ui-dl__r"><dt>Note</dt><dd>${esc(f.note)}</dd></div>` : f.note_hidden ? `<div class="ui-dl__r"><dt>Note</dt><dd class="ui-muted">Visible to clinicians and its author</dd></div>` : '';
  return ui.modal({
    title: `Flagged · ${c.label} · ${c.id}`, size: 'sm', returnFocus: opener,
    body: `<dl class="ui-dl"><div class="ui-dl__r"><dt>Reason</dt><dd>${esc(f.reasonLabel || '')}</dd></div><div class="ui-dl__r"><dt>Flagged by</dt><dd>${esc(f.byName || f.byShort || f.by)}</dd></div><div class="ui-dl__r"><dt>When</dt><dd>${esc(fmtDateTime(f.at))}</dd></div>${note}</dl>
      <p class="ui-muted">Clearing the flag is recorded with your name and the time. Anyone who works authorizations can clear it.</p>`,
    actions: [{ label: 'Keep the flag', tone: 'secondary' }, { label: 'Clear flag', tone: 'primary', onClick: async () => ((await run(screen, { id: c.id, flag: false }, `${c.id} flag cleared`)) ? undefined : false) }]
  });
}
// the small flag button in a row or a header: pressed means flagged
export function flagButton(c, { label = true, sm = true } = {}) {
  const on = !!c.flag;
  const tip = on ? `Flagged by ${c.flag.byShort || c.flag.by} · ${c.flag.reasonLabel || ''}. Click to open.` : 'Flag for attention';
  const sr = on ? `Flagged: ${c.flag.reasonLabel || 'marked for attention'}, by ${c.flag.byShort || c.flag.by}. Open the flag for ${c.id}` : `Flag ${c.id} for attention`;
  return `<button type="button" class="a-flagbtn${on ? ' is-on' : ''}${label ? ' a-flagbtn--t' : ''}" data-flag="${esc(c.id)}" aria-pressed="${on}" title="${esc(tip)}"><span class="a-flagbtn__i" aria-hidden="true">${ui.icon('flag', 14)}</span>${label ? `<span aria-hidden="true">${on ? 'Flagged' : 'Flag'}</span>` : ''}<span class="ui-sr">${esc(sr)}</span></button>`;
}
