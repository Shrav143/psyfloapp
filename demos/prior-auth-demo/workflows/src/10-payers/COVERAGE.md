# Payers: coverage

Source: `src/pages/payers/*`, `src/store/payerConfig.ts`, `src/data/payerConfig*.ts`. PRD: `06-payer-intelligence-and-rules-engine.md` (policy watch, rule versions). File names below are in this folder.

## Arriving on Payers

| Control | Diagram |
|---|---|
| Sidebar 'Payers' (Connections), its badge (payers with a change waiting) | 10 |
| Links in: bell notification 'Payer rule changed', FLO answer 'Open Payers, Cardinal, Changes', Demo menu 'Payers: Cardinal, Changes' | 10, 62 |
| /payers with no id (first payer), unknown id, bad or missing ?tab | 10 |
| Page title 'N payers...', 'Add a payer' button | 10, 16 |
| 'Search payers', 'Clear search', empty text 'No payer matches', group headings, payer rows, green/ochre dot, legend | 12 |
| Header: name, plan line (rules version, 'change waiting' or 'checked date'), four facts, 'Not enough' states | 14 |
| Header 'Edit log (N)' button | 14, 36 |
| Header 'Edit' button | 14, 18 |
| Tab bar Process, Rules, Documents, Changes, tab badge | 10, 60 |

## Modals opened from the header

| Control | Diagram |
|---|---|
| Add a payer: name, Plan type, Group, 'How it is reached' (Portal, Phone, Fax), 'Programs it covers', three validation messages, Cancel, 'Add payer', toast, redirect | 16 |
| Edit payer details: Plan line, Reached by, Notice due, Backup route, three 'How to reach' lines, reason, 'Save and log the edit', 'Nothing changed' | 18 |
| Edit log drawer: entries (area chip, who, when, reason, Before and After), empty state, close | 36 |

## Process tab

| Control | Diagram |
|---|---|
| Workflow card: title, version, steps, step-type chips, agent chips, 'Typical', condition rows, 'Step types' legend | 20 |
| 'Edit workflow' | 24 |
| 'Re-learn from decisions', spinner row, 'Nothing new to propose', 'Historian has a proposal' | 30 |
| 'Historian proposed N change(s)' banner, 'Review in Changes' | 20, 30 |
| Edit-workflow drawer: step title, step type, 'What happens', 'Typical time', up arrow, down arrow, bin, 'Add a step', footer count, Cancel, Save workflow, X, Escape, dimmed area | 24 |
| 'Add a condition', 'Condition on', 'Condition value', 'Leads to', 'What happens on this path', 'Remove this condition' | 26 |
| 'Save workflow' with no changes ('Nothing to save'), 'Save the workflow?' modal, reason, 'Save and log the edit', Cancel, Escape | 28 |
| 'How to reach X' card (read only) | 22 |
| 'Instructions for Caller' card, its 'Edit', script modal, reason, save, 'Nothing changed' | 22 |
| Edits-waiting banner ('N edit(s) apply to new drafts only'), 'Update N drafts' / 'Update drafts', 'Update drafts?' / 'Apply to new drafts?' modal, 3 second redraft, toasts | 34 |
| Info note 'Change a step or a condition...' | 20 |

## Rules tab

| Control | Diagram |
|---|---|
| Four rule cards, 'Used by ... confirmed date', green ticks on 'No authorization needed', info note, edits-waiting banner | 40 |
| 'Edit' on each card, 'Edit <rule>' modal, 'Rules, one per line', reason, save, 'Nothing changed', Cancel, Escape | 42 |

## Documents tab

| Control | Diagram |
|---|---|
| Document card (title, count words, numbered list, empty state), 'Level of care' menu, payer differences | 50 |
| 'Edit list', 'Edit what X wants for Y' modal, name, 'What it must show', bin, 'Add a document', reason, save | 52 |
| 'Try it on a case': 'Case' menu, 'Check this chart', 'Reader is reading the chart', result banner, 'Open the request', info note | 54 |

## Changes tab

| Control | Diagram |
|---|---|
| Waiting-change banner, 'This payer's rules are up to date' banner, proposals, 'What changed' history, tab badge | 60 |
| A change arriving (Sentinel, bell notification, badge, dot, plan line) | 62 |
| 'Acknowledge change', locked 'Update N drafts' (tooltip 'Acknowledge the change first'), 'Acknowledge this change?' modal, green 'Acknowledged by' pill | 64 |
| 'Update N drafts' modal after a change, row statuses, redraft, documents added, history row, notification, toast | 66 |
| One-draft (Harborview) and no-draft variants, 'Apply to new drafts' | 70 |
| 'Accept proposal', 'Dismiss' | 30 |

## Across the app

| Topic | Diagram |
|---|---|
| What payer configuration reaches elsewhere (Dashboard rows, bell to Case Manager, Open the request) and what it does not | 80 |
| Cancel, X, Escape, dimmed area, save buttons, no undo, nothing half saved, every pop-up | 82 |

## Not drawn

- Dropdown keyboard use (ArrowUp, ArrowDown, Enter) inside every menu: one shared component, not specific to Payers.
- Toast timing and dismissal: shared component.
- Browser Back after a tab or payer change (each pick writes a new address; nothing special happens).
- PRD features with no demo screen: rejecting or deferring a change, rule versions and as-of lookups, field provenance and confidence, observed-versus-published scorecard, strategy rules, degradation alerts. Only mentioned in 62 and 80.
- Where goto targets point (Dashboard, Case Manager, Authorizations, New case) are named by module and screen. Rename them to the exact titles when those modules land.

## Demo behaviours to know (also reported to the lead)

- Escape on 'Save the workflow?' closes the reason modal and the editor drawer, losing every edit (diagrams 28, 82). Escape with a menu open closes the menu and the pop-up.
- 'Edit' on a payer whose 'Reached by' is not one of the five options (for example an added payer with Phone, Fax and Portal) shows 'Portal' and logs a change to it on save (18).
- 'Add a payer' accepts a duplicate name and shows a second row; an added payer exists only on Payers (16).
- Cardinal's waiting change lists R-1042 (Summit) and R-0988 (Beacon), and its text says 'not yet sent' for I-2231, which is sent (66).
- 'Reader uses this same list on the intake screen' and 'the warning there and the result here always match' are not true in the demo: New case has its own document table (54, 80). No rule or list edit changes an approval chance, the queue or the Case Manager list; redrafting changes only the Dashboard rows and sends a bell notification (80).
- The no-draft variant of a payer change ('Apply to new drafts') cannot be reached with the seed data (70).
- Blank Caller script and blank condition text are accepted (22, 26). A rule edit moves its 'confirmed' date to today (42).
- 'Edits waiting' drafts only count 'Preparing' requests, never 'Info requested' ones (34).
