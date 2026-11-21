# Workflow diagrams: how to write them

These diagrams map every screen, click and decision in the Psyflo prior-auth demo, one menu tab and sub tab at a time. They are written as small `.flow` files, compiled to Mermaid, drawn as SVG and collected in one HTML viewer.

```bash
cd demos/prior-auth-demo/workflows
node tools/check.mjs src/03-authorizations            # compile + draw a folder, write PNGs to /tmp/wf-check
node tools/check.mjs src/03-authorizations/10-x.flow --out /tmp/mine
node tools/build.mjs                                  # everything + the HTML viewer in out/
```

`check` prints node counts or the first error with its line number. For a big diagram it also writes tiles (`name.t1.png`, `name.t2.png`, ...). Open the tiles to read the labels.

## The file

```
title: Dashboard › Filter the requests
route: /dashboard
intro: One or two plain sentences on what this diagram covers.
dir: TD
also: optional note, e.g. "Demo only: ..."
---
start  s1  "Click 'Dashboard' in the sidebar"
screen d1  "Dashboard\nFour filters, calendar, stage strip, requests"
click  c1  "Click the 'Payer' filter"
overlay o1 "Payer menu opens\nAll payers, then each payer"
click  c2  "Pick 'Cardinal'"
process p1 "Strip, table and payers recompute for Cardinal"
store  w1  "Filter saved in the address\n?payer=cardinal"
decision q1 "Any rows left?"
toast  t1  "'Nothing matches these filters'\nwith 'Clear filters'"
end    e1  "Table shows only Cardinal rows"

group gF "Filters"
  c1 --> o1 --> c2
endgroup

s1 --> d1 --> c1
c2 --> p1 --> w1 --> q1
q1 -->|Yes| e1
q1 -->|No| t1 --> e1
```

- Front matter first (`title`, `route`, `intro`, `dir`), then a line with `---`.
- A node is `kind id "label"`. The id is letters, digits and `_`, starting with a letter, and is unique in the file.
- Edges are Mermaid: `a --> b`, `a -->|Yes| b`, `a -.-> b` (optional or rare path), `a ==> b` (the main path, use sparingly). Chain them: `a --> b --> c`. Fan out: `a --> b & c`.
- `group id "Title"` ... `endgroup` draws a labelled box around the nodes declared between them. Declare nodes anywhere; groups only wrap the nodes declared inside them. Nodes declared outside a group cannot be pulled in.
- `\n` is a line break. `**bold**` is bold. Never use double quotes inside a label (use single quotes) and avoid `<`, `>`, `|` and backticks.
- Comments start with `#` or `%%`.
- A node with no edge is an error (it is almost always a typo).

## The sixteen kinds (shape and colour are set for you)

| Kind | Shape | Colour | Use it for |
|---|---|---|---|
| `start` | pill | forest, white text | Where the flow begins: a sidebar click, a link, an event |
| `end` | pill | green | The flow finishes normally |
| `endx` | pill | red | The flow stops: blocked, declined, cancelled, nothing to do |
| `screen` | display (one rounded end) | cream, forest border | A page the person sees: the exact page title and its key regions |
| `overlay` | double-border box, dashed | pale green | Drawer, modal, dropdown, menu, panel |
| `click` | inverted trapezoid | blue | A click, tap, key press, signature. Quote the exact label: `Click 'Check'` |
| `input` | parallelogram | indigo | The person types, picks a value, drops or uploads a file |
| `process` | rectangle | grey | What the app does: validate, calculate, recompute, navigate |
| `agent` | hexagon | purple | Work done by FLO or an agent (Reader, Scribe, Verifier ...). Name the agent |
| `decision` | diamond | amber | A branch. Label every exit |
| `store` | cylinder | teal | A record is created or changed: case, request, referral, draft, mapping, rule |
| `doc` | wavy-bottom page | tan | A letter, brief, report, appeal, form or file produced or read |
| `ext` | divided box | orange | Payer, referrer, EMR, portal: someone outside Psyflo acts |
| `wait` | D shape | slate | Time passes, or the flow waits for someone |
| `toast` | flag | yellow | A toast, banner, inline message: write the exact text |
| `goto` | double-sided box, dashed | white | Jump to another diagram. Label: `Continues in: Denial Intelligence › Open the brief` |

## What a good diagram does

1. **One screen or one task per diagram.** Start at the entry (a sidebar click, a link, a button on another screen) and follow the person until the flow ends or hands off with a `goto`. Aim for 15 to 40 nodes. `check` warns above 45: split it and link the parts with `goto`.
2. **Every click is a node.** Each button, link, tab, row, filter, menu item, checkbox, key press (Escape, Enter) a person can use gets a `click` or `input` node that quotes the on-screen label. Follow it with what the system does (`process`), what is saved (`store`), what is shown (`screen`, `overlay`, `toast`).
3. **Every branch is shown.** Empty states, errors, validation stops, disabled buttons ("why is it disabled"), Cancel and Escape on every modal, the "no" path of every decision. Mark stops with `endx`.
4. **Say who acts.** Person (`click`, `input`), the app (`process`), FLO or an agent (`agent`), an outside party (`ext`), time (`wait`). When the demo simulates something real (a payer replying, a fax going out, the EMR syncing) show the real step as `ext` and add "(demo: simulated)" to its label, or name the demo control that triggers it.
5. **Use the real words.** Page titles, button labels, filter names, toast text, status names and agent names come from the code, exactly. Psyflo's assistant is **FLO**; never write "AI" or "bot" in a label. Sentence case, at most about 14 words a node.
6. **Hand off, don't repeat.** When a flow leaves your module, end the path with a `goto` named after the other diagram's title (`Continues in: New case › Referral step`). Do not redraw other modules.
7. **Keep it readable.** Prefer `dir: TD`. Use `LR` only for a short linear chain. Wrap related steps in a `group`. Fewer crossing edges beats more detail in one diagram: split instead.
8. **Do not invent.** A box must correspond to something in the code (`src/pages/...`, `src/store/...`) or the PRDs. If the PRDs describe a production step the demo only stands in for, that is allowed as above. If neither shows it, leave it out.

## Where to look

- The demo is the source of truth for what screens, buttons and states exist: `src/pages/<module>/`, `src/components/`, the store slices in `src/store/`, seed data in `src/data/`. Links go through `src/routes.ts`. Agent names and roles: `src/data/agents.ts`.
- The PRDs in `docs/prior-auth/prd/` (and `docs/prior-auth/research/`) explain the business rules and real-world steps behind the screens: deadlines, who signs, what a payer does. Read the PRD that matches your module; use `grep` for terms rather than reading all of it. Where a PRD names a Today / Leakage / Ask page or old routes that do not exist in the demo, follow the demo.
- You can also run the built app and click through it: `dist/index.html` is a static build (open with `file://.../dist/index.html#/dashboard` in Playwright). The Demo menu (top right) moves the clock and resets data.

## Coverage file

For your module, also write `src/<module>/COVERAGE.md`: a table of every control on every screen (button, link, tab, filter, row, menu item, modal action, keyboard shortcut) with the diagram file that shows it. Anything you could not place in a diagram goes at the bottom under "Not drawn" with the reason. Keep it terse.

## Naming

- Folder = module, `NN-name` (already created for you). File = `NN-short-task.flow` inside it. Use the number range you were given so two people never write the same file.
- `title:` is `Module › Sub tab or screen › Task` using the real sidebar names, for example `Authorizations › Queue › Act on a request`, `Authorizations › New case › Referral › Check an arrived referral`.
- `route:` is the real path with the query that matters, for example `/authorizations/case/R-1042?tab=risk`. For a flow that spans several routes list the first one and say the rest in `intro`.
