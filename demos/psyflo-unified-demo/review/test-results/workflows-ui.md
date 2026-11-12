# workflows-ui · FAIL

Run 2026-11-12T17-18-53Z · 57746 ms · instance 0 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | Settings opens on the workflow map: one h1 and the Pilot chip, no seven-tab bar, the toolbar, the locked guardrail drawn, the seeded workflows listed |  |
| PASS | More settings: People, Roles, Units, Family link, Audit and Presenter open their own page with a way back; ?tab=rules opens the map with the rule library |  |
| PASS | palette: When, If, Then, Always groups with a hover definition, the rule library with a verification icon, and the locked steps with the reason |  |
| PASS | drag: a block moves with the pointer and snaps to the 20 px grid, its lines follow, Save lights up, Undo puts it back; nothing is stored until Save |  |
| PASS | keyboard: Tab to a block, arrows move it by one grid step (Shift by five), Enter opens the editor, Delete removes it (Undo returns it); no drag needed |  |
| PASS | the locked guardrail cannot be selected, moved or removed; the palette lists it as always on |  |
| PASS | palette: a block is dragged onto the canvas and lands on the grid; Enter or a click adds one too (after the selected block, linked to its free exit) |  |
| PASS | link: drag from an exit dot to a block; a loop, a self link and a link into a When block are refused with a reason; click a line and Delete removes it; the inspector pickers do the same without dragging |  |
| PASS | rules: drop a rule from the library onto a block (or Add a rule in the inspector); the card shows a rules badge; detach removes it |  |
| PASS | inspector: typed settings from the catalog (number, select, roles, text); the card summary follows; a rule-bound number shows the live rule and its Edit asks why and changes the rule everywhere |  |
| PASS | Save calls workflow.save: version and history move on, Save goes quiet (Saved · v2); a workflow with a problem is refused and the problems are listed; Reload keeps the draft saved |  |
| PASS | the On / Off switch calls workflow.enable on the saved workflow; unsaved changes ask for a Save first; a workflow with errors cannot be turned on |  |
| PASS | Test run: runs the current (unsaved) workflow on the live demo data, says test only, shows counts and a table; a match lights its path; nothing is written |  |
| PASS | Outline: the same workflow as an indented list with kind, summary, edit and remove, and Add a block here; everything the map does works without dragging |  |
| PASS | 390 px: the Outline is the default, the palette is an Add block picker, editing opens a drawer, no sideways scroll, targets 24 px or more, every control labelled |  |
| PASS | 1024 px: the map, toolbar and editor fit without sideways scroll; the palette opens over the layout on request |  |
| FAIL | the "second person" guardrail: a saved change waits (the live version does not change), Settings says so, a different person (the clinician, from the Dashboard) confirms, the proposer cannot | "Confirm a workflow change\nWorkflow\nLate notes, two people\nChange\n1 block added, 1 link added, renamed\nProposed by\nD. Owens · Oct 29, 3:30 pm\n\nA workflow only de" does not match /Dana Owens/ |
| PASS | New workflow (blank or from a template), Duplicate and Delete (a reason of four letters or more); the new workflow is off |  |
| PASS | roles: only the administrator opens Settings; the other roles never see a definition in the UI and read enabled workflows only (they see the bell items); the portals read none |  |

## Output (tail)

```
PASS Settings opens on the workflow map: one h1 and the Pilot chip, no seven-tab bar, the toolbar, the locked guardrail drawn, the seeded workflows listed
PASS More settings: People, Roles, Units, Family link, Audit and Presenter open their own page with a way back; ?tab=rules opens the map with the rule library
PASS palette: When, If, Then, Always groups with a hover definition, the rule library with a verification icon, and the locked steps with the reason
PASS drag: a block moves with the pointer and snaps to the 20 px grid, its lines follow, Save lights up, Undo puts it back; nothing is stored until Save
PASS keyboard: Tab to a block, arrows move it by one grid step (Shift by five), Enter opens the editor, Delete removes it (Undo returns it); no drag needed
PASS the locked guardrail cannot be selected, moved or removed; the palette lists it as always on
PASS palette: a block is dragged onto the canvas and lands on the grid; Enter or a click adds one too (after the selected block, linked to its free exit)
PASS link: drag from an exit dot to a block; a loop, a self link and a link into a When block are refused with a reason; click a line and Delete removes it; the inspector pickers do the same without dragging
PASS rules: drop a rule from the library onto a block (or Add a rule in the inspector); the card shows a rules badge; detach removes it
PASS inspector: typed settings from the catalog (number, select, roles, text); the card summary follows; a rule-bound number shows the live rule and its Edit asks why and changes the rule everywhere
PASS Save calls workflow.save: version and history move on, Save goes quiet (Saved · v2); a workflow with a problem is refused and the problems are listed; Reload keeps the draft saved
PASS the On / Off switch calls workflow.enable on the saved workflow; unsaved changes ask for a Save first; a workflow with errors cannot be turned on
PASS Test run: runs the current (unsaved) workflow on the live demo data, says test only, shows counts and a table; a match lights its path; nothing is written
PASS Outline: the same workflow as an indented list with kind, summary, edit and remove, and Add a block here; everything the map does works without dragging
PASS 390 px: the Outline is the default, the palette is an Add block picker, editing opens a drawer, no sideways scroll, targets 24 px or more, every control labelled
PASS 1024 px: the map, toolbar and editor fit without sideways scroll; the palette opens over the layout on request
FAIL the "second person" guardrail: a saved change waits (the live version does not change), Settings says so, a different person (the clinician, from the Dashboard) confirms, the proposer cannot — "Confirm a workflow change\nWorkflow\nLate notes, two people\nChange\n1 block added, 1 link added, renamed\nProposed by\nD. Owens · Oct 29, 3:30 pm\n\nA workflow only de" does not match /Dana Owens/
PASS New workflow (blank or from a template), Duplicate and Delete (a reason of four letters or more); the new workflow is off
PASS roles: only the administrator opens Settings; the other roles never see a definition in the UI and read enabled workflows only (they see the bell items); the portals read none
RESULT workflows-ui pass=18 fail=1 skip=0
```
