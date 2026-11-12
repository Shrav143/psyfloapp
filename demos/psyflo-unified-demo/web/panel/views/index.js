// The panel view registry (E5). One module per view; web/panel/core.js reads the page, picks a view and paints it.
// Registered views: home · scribe · review · enhance · authorize · incident · docs. (Track Time was removed on Nov 11.)
//
// A view module default-exports a plain object:
//
//   {
//     id: 'scribe',                  // the registry key (same as below)
//     label: 'Scribe',               // the label of the home button and of the Back row
//     cap: 'notes.own',              // capability checked with can(actor, cap); null = any panel user. A view the person may not open
//                                    //   is never offered and core shows a one-line reason instead of the body
//     title(ctx)  -> string          // optional: the header line ("Scribe · M.R.")
//     legend: true,                  // optional: show the green / yellow legend under the header (default true)
//     html(ctx)   -> string          // the body, an HTML string (escape with ctx.esc). NO header, NO footer: core draws them
//     after(root, ctx)               // optional: runs after every paint (wire what the template cannot, start a ticker)
//     acts: { name(el, ctx, ev) }    // <button data-act="name">: click handlers, may return a promise (a throw becomes a red flash)
//     ins:  { name(el, ctx, ev) }    // <input|textarea data-in="name">: input handlers; do NOT repaint inside them
//     chs:  { name(el, ctx, ev) }    // <select|input data-ch="name">: change handlers
//     leave(ctx)                     // optional: the person left the view or the Lauris page changed (stop recorders here)
//   }
//
// ctx (built once in core.js, same object every call; see makeCtx there):
//   ctx.S()                 the role-projected Psyflo state (api.state). Never mutate it: change it with ctx.do(action, args)
//   ctx.do(action, args)    POST an action as the signed-in person (the server derives the actor; never pass `by`, `staff` or `who`)
//   ctx.me()                the staff record of the Lauris user on the open page ({ id:null, unknown:true } when nobody Psyflo knows)
//   ctx.role()              me().role
//   ctx.can(cap)            can(actor, cap) from web/js/shared/permissions.js
//   ctx.page                what the page bridge last read: { kind, url, user, consumer:{no,initials,program,units}, form:{type,fields[],session}, ... }
//   ctx.client()            the Psyflo student for the open page, matched by Harvest # AND initials; null when unknown or a wrong-patient
//                           mismatch (core already shows the hard stop; a view never falls back to initials or to "the first student")
//   ctx.st                  this view's scratch object; it is reset when the Lauris page (URL) changes, never between repaints
//   ctx.view                the id of the view being drawn
//   ctx.call(cmd, args)     a bridge command on the open page: 'read' | 'fill' | 'focus' | 'mark' | 'navigate' (never Process Form, Get Signature or Send)
//   ctx.fill(boxes, { form, client, sources, animate })   type boxes ({label, value, src}) into the open form (yellow) and record them (panel.filled)
//   ctx.flash(msg, kind)    a status line at the top of the view; kind 'g' (default) | 'y' | 'r'
//   ctx.draw()              repaint (debounced to one animation frame)
//   ctx.go(viewId)          switch view without leaving the Lauris page; ctx.go('home') returns
//   ctx.nav(path)           navigate the open Lauris page ('/consumers/3310/session/dpn')
//   ctx.openApp(hash)       open a Psyflo platform route in a new tab ('#/Authorization?id=R-0411')
//   ctx.esc(text)           HTML escape         ctx.fmtDate / ctx.fmtTime   date helpers (web/js/shared/dates.js)
//   ctx.I                   small icon set (ok, warn, no, open, mic, clock, spark, doc) as SVG strings
//   ctx.ui                  the UI kit (web/js/ui/index.js): chip, statusChip, evidenceChip, draftReview, progress ...
//   ctx.parts               panel fragments (web/panel/parts.js): banner, tile, box, srcChips, checks, accordion, sourceChips ...
//
// Add a new view: write views/<id>.js, import it below, add it to VIEWS. A view is never imported by another view.
import home from './home.js';
import scribe from './scribe.js';
import review from './review.js';
import enhance from './enhance.js';
import authorize from './authorize.js';
import incident from './incident.js';
import docs from './docs.js';

export const VIEWS = { home, scribe, review, enhance, authorize, incident, docs };
export const VIEW_IDS = Object.keys(VIEWS);
export const viewOf = id => VIEWS[id] || null;
export default VIEWS;
