# Feedback rounds 4 and 5, Nov 12 (second and third walkthrough): login, Dashboard, formatting, Settings as a workflow map

Source: the product owner's dictated notes after the Nov 12 round 3 delivery. Synthetic data only.

## Round 4 · what was asked and what the demo does now

| # | Ask | What the demo does now |
|---|---|---|
| 1 | Login: more minimalist, a dropdown, not four big boxes, not a whole page | One small card (about 380 px) near the top: one dropdown of people grouped by role, a Sign in button, quiet links to the family portal and the school counselor. |
| 2 | Dashboard: each item's action should take me to the Lauris EHR note where the work is written (notes, CNAs, weekly guardian calls, intake forms, "Rejected in Lauris") | Every EHR item has one icon that opens Lauris at the right form (a new tab; an overlay in the hosted file). The Psyflo extension panel is already beside every Lauris form page. Review items get two icons: Lauris and the review drawer. Authorization and referral items keep their Psyflo action. The administrator has no Lauris link (status only). |
| 3 | Is the Documentation tab duplicating the Dashboard? If so, combine them and call it Dashboard | Mostly yes. One rail item, **Dashboard**, with a Patients \| Documents \| Staff switch. Old Documentation, ReviewQueue and My Work links redirect there with their filters. Roles and capabilities are unchanged; direct support has Patients only. |
| 4 | Authorizations and Denial Intelligence are fine, but should share formatting ("Authorization period" and "Decision date") | One shared date-range card (`ui.dateCard`), same size and position on both pages; both lists share the header, filter grid, table, deadline cell, owner cell and pager; both case pages share the header and section cards. |
| 5 | Simplify: icons instead of text, definition on hover | `ui.hint` icons across the Dashboard, Authorizations and Denial Intelligence (source and verification chips, secondary lines, counts, lock lines). The definition shows on hover and on keyboard focus and is the accessible name. Dates, status chips, maturity chips and refusal reasons stay visible text (UD-053). |

## Round 5 · Settings becomes a workflow map

The ask: make Settings like the Apollo or Attio workflow builders: pick rules, add guardrails, drag and drop "if this happens, do this", each box with its own rules, requirements and logic, instead of a million buttons.

- **Opens on a canvas.** A palette of **When** (triggers), **If** (Yes or No), **Then** (actions) and **Always** (guardrails) blocks; drag a block onto the grid, move it, and drag from an exit dot to another block to link them. Blocks can also be added with Enter, and linked and moved from the keyboard; the **Outline** view (also the phone layout) does everything without dragging.
- **Rules inside blocks.** The 73 rules (each with a source and a verification label) are a library in the palette. A rule-bound number in a block is the rule: editing it asks for a reason and goes through the existing rule action, so it changes the rest of the demo.
- **Guardrails.** "Nothing is sent, called or filed on its own" is locked into every workflow. Others: a person confirms first, only these roles, a second person must agree, stop when a rule has no verified source, stop when evidence is missing, an alert limit.
- **Test run.** Runs the workflow on the live demo data and shows what it would do and where it stops, without changing anything.
- **What it can do.** Only Notify, Suggest a flag and Add a task: bell items for people. Sending, calling, filing, signing and texting a family stay with a person and are shown locked (UD-049, UD-050).
- **Two starter workflows are on, three are templates (off).** Enabled workflows add items to the bell under **Workflows**.
- **The old tabs.** People, Roles, Units, Family link, Audit and Presenter stay as they were, behind one small **More settings** menu. `?tab=rules` opens the map with the rule library.

## Leftovers fixed from the previous run

- Full regression reruns after each change; two test races fixed (a stale-session test that raced the first page boot, a hosted check that read a box before it was typed), a hosted suite time limit raised (the suite now runs every flow twice and takes about 5 minutes), and the accessibility audit now skips plain hover icons so it finishes in minutes instead of over an hour.
- `ui.hint` and `ui.dateCard` added to the UI kit gallery.
- The hint bubble now survives the scroll that keyboard focus causes.

## Honest limits

- Hover definitions are not shown on touch; the accessible name carries them.
- Workflow effects are computed, not stored; an alert limit is "per role, at once".
- "Rejected in Lauris" links to the right form, not the exact rejected session (UD-048).
- The workflow builder is labelled Pilot (preview). It has not been shown to the staff who asked for it.

## Tests

See `docs/deliverables/07-test-results.md` for the run at the end of this round.
