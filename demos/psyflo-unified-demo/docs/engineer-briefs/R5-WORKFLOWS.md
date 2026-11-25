# Round 5 (Nov 12, third walkthrough) · Settings becomes a workflow map · brief for the two builders

Read `docs/engineer-briefs/R3-COMMON.md` first (rules for the shared working tree, safety rules, tokens only, tests, report format) and `docs/engineer-briefs/R4-COMMON.md` (the `ui.hint` icon-with-hover-definition component, which this round uses everywhere). Everything there still applies.

## What the product owner asked (verbatim intent)

"Change the settings tab to be something like a **workflow map**, where the user can pick the rules, like how Apollo or Attio let you create **custom workflows**. Rather than a million different buttons, a custom workflow the user can create: **add rules and add guardrails**, almost like an **if statement** where they can **click and drag and drop** stuff: if this happens, do this; if I pass that, then each box has its **own rules, requirements, logic**."

## What we build

**Settings opens on a workflow canvas** (administrator only, capability `admin.settings`, unchanged). A workflow is a map of **blocks** joined by lines:

- **When** (triggers): units used reach N%, a deadline is near, a payer reply is recorded, the follow-up day, a note is past due, eligibility recheck due.
- **If** (conditions, two exits Yes / No): payer is, service is, units left, evidence has gaps, partial award, owner is.
- **Then** (actions): Notify (bell), Suggest a flag (a person decides), Add a task (a reminder for a person).
- **Always** (guardrails): *Nothing is sent, called or filed on its own* (locked, in every workflow, cannot be removed), a person confirms first, only these roles, a second person must agree, stop when a rule has no verified source, stop when evidence is missing, at most N alerts a day.
- **Rules**: every block can carry rows of the rules table (73 rules, each with a source and a verification label). A rule-bound number in a block **is** the rule: editing it asks for a reason and goes through the existing `settings.rule` action, so it changes the rest of the demo (the Dashboard unit warning, deadlines, …). The old **Rules** tab becomes a **rule library** in the palette (search, drag a rule onto a block, or "Add a rule" in the block's inspector).

The catalog of blocks, with definitions, parameters and rule bindings, is already written: **`web/js/shared/workflows/catalog.js`** (read it; extend it only through the owner named below).

**Honesty and safety (non-negotiable, from the unified demo).** Workflows only configure what Psyflo shows people. Their actions are **bell items, suggestions and reminders**; none sends, calls, files, signs, texts or changes a record. The palette shows the steps that stay with a person (send by fax, call the payer, file an appeal, sign in Lauris, text the family) **locked**, with `LOCKED_WHY`. Workflows are labelled **Pilot (preview)** in the maturity registry. The administrator sees status only: a workflow never reads note text and its messages use only {patient} (initials), {payer}, {date}.

**What happens to the old tabs.** The Settings page gets: the workflow canvas (default), and one small **More settings** menu (People, Roles, Units, Family link, Audit, Presenter). Those six existing tab bodies stay as they are (their code, actions and tests stay) and open from the menu with `?tab=people|roles|units|family|audit|presenter`. `?tab=rules` (and `?tab=rules&q=…&cat=…&area=…`) now opens the Workflows view with the rule library open and filtered the same way. Remove the seven-tab bar from the default view: the page should look like a canvas, not a settings form.

## Data contract (both builders code against this)

```js
workflow = { id, name, description, enabled, version, nodes:[node], edges:[edge], updated_at, updated_by, history:[{version, at, by, note}], pending? }
node     = { id, block, x, y, params:{}, rules:[ruleKey] }     // x,y multiples of GRID (20)
edge     = { id, from, to, port }                               // port 'out' | 'yes' | 'no' (portsOf(block))
state.workflows = [workflow]       // administrator: all; other staff roles: enabled workflows only, without history/pending; portal actors: none
```

`web/js/shared/workflows/engine.js` (pure ESM, **fork ENG owns**, write the signatures first, then refine):

```js
validate(wf, s)  -> { ok, problems:[{ level:'error'|'warn', node?, edge?, text }] }
   // errors: no trigger · unknown block · edge to or from a missing node or a port the block lacks · a cycle · a block not reachable from a trigger ·
   // a param out of range or of the wrong type · a rule key that is not in the rules table. warns: no action after a trigger, a Yes or No exit with no link.
run(s, wf, { today, actor? }) -> { matches:[{ record:{type,id}, client, label, path:[nodeId], effects:[{ node, action, roles, text }], stopped:null|{ node, why } }], counts:{ candidates, matched, stopped, effects } }
   // pure and deterministic; reads the state only; never writes. `label` is initials only.
workflowItems(s, actor) -> [notification-shaped items { id:'wf:<workflowId>:<recordId>:<nodeId>', at, kind:'workflow', sev, title, sub, record, to, group:'Workflows', source:{ workflow, node }, needsConfirm }]
   // enabled workflows only, effects for the actor's role after guardrails (roles_only, person_confirms, source_required, evidence_required, max_per_day)
tidy(wf) -> wf with x,y laid out left to right (triggers at the left, then conditions, actions, guardrails; Yes above No), multiples of GRID
newId(prefix) -> unique id helper (n-xxxx)
```

Store actions (`server/psyflo/actions/x-workflows.js`, autoloaded; own `authz` and `projection` exports like the R3 actions; **fork ENG owns**), all `{ any:['admin.settings'] }`, all audited with `this.event(...)`:

```
workflow.create   { name, description?, from? }      -> { id }          from = a workflow id to copy (duplicate) or a template key
workflow.save     { id, workflow, note? }             -> { id, version, problems }   validates (refuses 422 with the problems on an error), keeps the locked never_auto guardrail, version+1, history entry
workflow.enable   { id, enabled }                     -> { id, enabled }  refuses to enable a workflow with validation errors
workflow.delete   { id, reason }                      -> { id }           reason 4+ characters
workflow.confirm  { id, decision:'approve'|'decline' } -> two-person: a workflow that contains the `two_person` guardrail keeps a saved change in `pending` until a DIFFERENT person with `admin.settings` or `drafts.clinical` confirms; the proposer cannot confirm their own
```

Seed: `seed/extra/workflows.json` (ENG; loaded by `loadSeed` like `payer-hours.json`): five workflows, two enabled and three templates (off), all valid and drawn with sensible x,y:
1. *Partial offer needs a decision* (**on**): When payer reply = partial → Add a task (clinician) · Notify (supervisor) · guardrail A person confirms (clinician).
2. *Follow-up call day* (**on**): When follow-up day (rule `decision.followup_day`) → Add a task (clinician, "Call {payer} about {patient}") · guardrail Roles only (clinician) · Alert limit 5.
3. *Units running low* (off): When units used reach 75% (rule `units.warn_used_pct`) → If units left ≤ 25%: Yes → Suggest a flag (units low) / No → Notify (supervisor).
4. *Late notes* (off): When a note is past due → Notify (supervisor) · Alert limit.
5. *Evidence gaps before a renewal* (off): When a deadline is near (renewal, 7 days) → If evidence has gaps: Yes → Notify (clinician) · Stop when evidence is missing / No → Notify (supervisor).

The bell: `sel/notify.js notificationsFor` appends `workflowItems(s, actor)`; the bell groups them under **Workflows** with a "From workflow: <name>" line. Existing tests that count bell items or badges must keep their meaning (adjust a test only with a stated reason; do not make the seeded enabled workflows change today's counts for roles those tests use, or update the counts and say why).

## Fork ENG (engine, data, actions, bell) · ports 7400+

Own: `web/js/shared/workflows/engine.js`, `catalog.js` (extend it if the engine needs a field; keep every id and shape the UI already reads), `server/psyflo/actions/x-workflows.js`, `seed/extra/workflows.json`, hunks in `server/psyflo/project.js`, `authz.js` (if the action file's own export is not enough), `web/js/shared/sel/notify.js`, `web/js/ui/bell.js` (group label only), `web/js/shared/maturity.js` (`settings.workflows`, `route.Settings` text; Pilot), `docs` for the data model. Tests: new `test/workflows-engine.mjs` (pure engine on a fixture state: every block, branching, guardrails, validate problems, tidy, determinism, no writes) and `test/workflows-actions.mjs` (authz: only the administrator; validation refusals; the never_auto guardrail is kept; version and history; enable refuses an invalid workflow; delete needs a reason; two-person confirm: proposer cannot confirm, a clinician can; projection per role: administrator all, others enabled only, portal none; every action writes an audit event; the bell shows a workflow item for the right role after enabling and not after disabling). Deliver `engine.js` with **final signatures within your first 30 tool calls** (the map builder is coding against them in parallel), then refine.

## Fork MAP (the Settings screen) · ports 7500+

Own: `web/js/screens/Settings.js`, `web/screens/Settings.dc.html`, `web/js/screens/SettingsData.js`, new `web/js/screens/WorkflowMap.js` (+ helpers `WorkflowCanvas.js`, `WorkflowInspector.js`, `WorkflowOutline.js` as you see fit; they are modules, not new routes), `web/css/components.css` (append under `/* ---- R5 MAP ---- */`), new icon paths in `web/js/ui/util.js` if you need them (`bolt`, `branch`, `shield`, `flag`, `bell`, `users`, `gear` may exist already; add the missing ones, one hunk), `test/settings.mjs`, new `test/workflows-ui.mjs`, and the Settings lines in `a11y`, `visual`, `audit`, `hosted`, `smoke`, `routes`, `roles`, `ui-kit`, `presenter`, `parity` tests where they name tabs or text that moved.

The screen (use `ui.hint` icons with hover definitions instead of paragraphs; keep the page quiet):

- **Header**: h1 *Settings* + Pilot maturity chip; **More settings** menu button (People, Roles, Units, Family link, Audit, Presenter). When one of those is open, a *← Workflows* link returns.
- **Toolbar**: workflow selector, **New workflow** (blank, or from a template), name (inline), **On/Off** switch, **Map | Outline** switch, **Tidy up**, **Test run**, **Save** (disabled when nothing changed; shows *Saved · v3*). Duplicate and Delete in a ⋯ menu (delete asks for a reason).
- **Palette** (left, collapsible): groups **When / If / Then / Always**, a **Rules** library (search the 73 rules by label, key or source; each shows its verification as an icon with hover), and **Not available here** (the locked steps, with `LOCKED_WHY` on hover). Every block can be **dragged onto the canvas** and also **added with Enter or a click** (so a keyboard user can). Definitions show on hover and focus.
- **Canvas** (centre): dotted grid, SVG lines with arrowheads; node cards with a kind colour band, the block's icon and label, a one-line summary of its settings ("Units used reach 75%"), a rules badge (count, worst verification), a warning badge. **Drag** a node (snap to GRID); **connect** by dragging from a node's output dot (Yes and No dots on a condition) to another node, or with the inspector's Next pickers; click a line to select it, Delete removes it; **drop a rule** from the library onto a node to attach it. The locked guardrail (*Nothing is sent, called or filed on its own*) is always drawn, bottom right, with a padlock, and cannot be selected for deletion. Keyboard: Tab to a node; Enter edits; arrows move by GRID (Shift ×5); Delete removes; the inspector's pickers replace dragging for links. Targets 24 px minimum.
- **Inspector** (right): the selected block's definition, **Settings** (typed inputs from the catalog; a rule-bound param shows the live rule value with its source chip and an **Edit** that asks for a reason and calls `settings.rule`, saying "changes the rule everywhere"), **Rules and requirements** (attached rules with value, unit, source, verification, history count; Add a rule), **Logic** (Next / Yes / No pickers), Remove. With nothing selected: the workflow's summary, its validation problems (icon + one line each, click selects the block), version history.
- **Test run** (drawer): runs `engine.run` on the current, possibly unsaved, workflow against the live demo data: "Test only: nothing is sent or changed", counts, and a table of matches (patient initials, what it would do, the path, and where it stopped and why). Clicking a match lights its path on the canvas.
- **Outline** view: the same workflow as an indented list (also the layout at 390 px and the screen-reader view): each row a block with kind, summary, edit and remove icons, and an **Add a block here** picker. Editing opens the same inspector (a drawer at narrow widths). Everything the map can do is possible here without dragging.
- **Save** calls `workflow.save`; a refusal shows the problems. A workflow with the `two_person` guardrail shows *Waiting for a second person* after a save, with Approve / Decline for an eligible different person (the clinician can confirm from the Dashboard confirmations list the same way designations work; reuse `confirmAccess` if it fits, otherwise a confirm button in Settings for administrators and a line in the Dashboard's confirmations for a clinician).
- Roles: only the administrator opens Settings (unchanged); direct support, supervisor and clinician never see definitions in the UI (they only see the bell items). No permission cell changes.

Responsive and accessible: works at 1440, 1024 and 390 px (at 390 the Outline view is the default and the palette becomes an **Add block** picker); one h1; 24 px minimum targets; 12 px minimum text; every control labelled; drag has a keyboard alternative; colours from tokens only; no `title`-only meaning. The hosted single-file build must still work (`node scripts/build-hosted.mjs`; no eval, no downloads, no network).

## Shared rules for both

Other builders and the lead edit the same tree: Edit hunks on files you do not own, never rewrite a whole file you do not own, **never** run git add/commit/push/stash/checkout/reset, never kill processes by name (`fuser -k <port>/tcp` on your own ports only). The lead owns `app.js`, `registry.js`, `nav.js`, `permissions.js`, `tokens.css`, `ui/index.js`, `ui/hint.js`. Tests: update, never weaken; add the new suites above; report the counts. Screenshots at 1440, 1024 and 390 px in `docs/deliverables/img/r5-*.png` (look at them with Read and fix what is wrong).

## Report

Concise: what you built, files, shared-file hunks, tests and counts, screenshots, what you dropped on purpose, decisions for the lead.
