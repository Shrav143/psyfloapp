# Payers › Workflow Studio: coverage

Source: `src/pages/payers/studio/*` (the builder, the canvas, the settings panel, Test Workflow, the view panel), `src/data/workflow/*` (catalog, templates, seeds, engine, validate, match, layout), `src/store/workflows.ts`. The tabs, the payers landing page, Rules & Instructions and History & Changes are drawn in `10-payers`. File names below are in this folder.

## Workflow Builder: the bar and the workflow

| Control | Diagram |
|---|---|
| Workflow Builder tab, which workflow opens (address, last open, first published), the list of workflows with name, request type, version and status pill | 10 |
| One-line facts under the bar, 'Saved in this browser' (or 'Memory only'), 'Details' button and the Details card (Name, Payer, Plan or product, State, Request type, Provider type, Services, Effective from and to, Owner, Version, Status, Started from) | 10 |
| The notice in the bar: published in force, draft over a published one, archived, two equally specific | 10, 40, 50 |
| Empty state with three cards: Start with a template, Build from scratch, Generate with FLO | 12 |
| 'New' menu: From a template, Blank, Generate with FLO | 12, 14, 16, 18 |
| Template panel: five templates, name, service, request type, 'Create the draft', Cancel, Escape | 14 |
| Build from scratch panel | 16 |
| Generate with FLO: description, three examples, 'Generate a demo draft', What FLO proposed, Rules it needs that are not on file, Things to set up, unverified notes, 'Put the draft on the canvas', Cancel | 18 |
| 'Save draft' (button and Ctrl+S), 'Unsaved changes', the toasts 'Draft saved' and 'Nothing to save' | 40 |
| Leaving with unsaved changes: sidebar links, other tabs, another workflow, New, Duplicate, 'Open in Rules & Instructions'; Stay, Leave without saving, Save draft and leave; the browser's own warning on reload | 40 |
| 'Test' in the bar | 52 |
| 'Publish', the checks, 'Cannot publish yet', 'Go to node', the Publish pop-up, the reason, 'Publish version N', Cancel | 42, 44 |
| 'More': Duplicate, Version history, Archive | 48, 46 |
| Version history panel: rows, Preview, Hide preview, Restore as a draft, Restore as a new draft | 46 |
| Archive pop-up and the read-only archived state | 48 |
| Two equally specific published workflows, 'Any request type' as the payer default | 50 |

## Workflow Builder: the canvas

| Control | Diagram |
|---|---|
| 'Steps' list: search, nine groups, support chips, drag, click, Enter; Start offered once | 20, 26 |
| Move a step, drag from an exit to a step, one line per exit, no line into a trigger or Start, no loop on itself, empty-canvas drop does nothing, delete a line | 20 |
| Undo, Redo, Delete the selected steps, Duplicate the selected steps, Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y, Delete | 22 |
| Tidy up, Fit the workflow to the screen, flow direction, Snap to grid, overview map, zoom buttons, pan and zoom | 24 |
| Panels: hide the list of steps, hide the settings panel, the 'Steps' tab on narrow windows, 'Add a step' below 900 px, 'Open its settings' below 900 px | 10 |
| Keyboard use and what is announced to screen readers | 26 |
| Step marks: icon, title, one-line purpose, how it runs, approval mark, support dot, validation mark | 10, 20, 30 |

## Workflow Builder: the settings panel

| Control | Diagram |
|---|---|
| Header, support word and note, problems at the top, Title, How it runs, Description and instructions, Next steps, Completion and safeguards, A person approves first, If the step fails, Retries, Advanced, Duplicate, Delete, close | 30 |
| Condition builder: All or Any, fact, operator, value (list, number, yes or no, date, none), Add condition, Add group, bins | 31 |
| Decision: branches, rename, up and down, bin, Otherwise, Add a branch, branches with no line | 32 |
| Documents: Required documents, Choose all, Clear, Edit the list in Rules & Instructions | 33 |
| Payer rules: rule cards with chips, source, dates, version, Open in Rules & Instructions, If the rule is unverified | 34 |
| Agents: Agent, Prompt, Insert a variable, Reads, What it hands back, Preview what the agent receives, A person reviews the result, If the agent fails | 35 |
| Actions: task, notification, document, approval, status, follow-up, escalate, case manager, phone script, portal, fax, appeal | 36 |
| Integrations: connection status, credentials note, Action, If it is not connected, What to send | 37 |

## Test Workflow

| Control | Diagram |
|---|---|
| Workflow to test, Run the test, Reset the case, the animated path, Skip the animation, Run again, the results, rules it read, Fix in builder | 60, 64 |
| Eight made-up cases and the form folds | 62, 60 |
| Test from the builder | 52 |

## The view panel (New case, History & Changes)

| Control | Diagram |
|---|---|
| Side panel: facts, run summary, read-only canvas, a step's detail, The path so far, rules it points at, Open in Workflow Builder, Escape | 70 |

## Not drawn

- The tab bar and the header above the builder (Payers module, `10-payers`).
- The 'Details' field-by-field editing: each field is a plain text, list, date or tick box and is listed once in diagram 10.
- The browser's own reload warning is mentioned in 40 but its wording is the browser's.
- The overview map's drag to pan, and the zoom buttons' exact steps: shown in 24 only as controls.
- Draft saves while the workflow is archived: the controls are dimmed, so there is no path (48).
