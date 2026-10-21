# Payers: coverage

Source: `src/pages/payers/*`, `src/store/payerConfig.ts`, `src/data/payerConfig*.ts`. PRD: `06-payer-intelligence-and-rules-engine.md` (policy watch, rule versions). File names below are in this folder.

## Arriving on Payers

| Control | Diagram |
|---|---|
| Sidebar 'Payers' (Connections), its badge (payers with a change waiting: 3 at the start) | 10 |
| Links in: bell notification 'Payer rule changed', FLO answer 'Open Payers, Cardinal, Changes', Demo menu 'Payers: Cardinal, Changes', bell notifications for saved edits ('Summit rule edited' and so on) | 10, 62, 28, 42, 52 |
| /payers with no id (first payer), unknown id, bad or missing ?tab | 10 |
| Page title 'N payers...', the line under it, 'Add a payer' button | 10, 16 |
| 'Search payers', 'Clear search', empty text 'No payer matches', group headings, payer rows, green/ochre dot, legend | 12 |
| Header: name, plan line (rules version, 'change waiting' or 'checked date'), four facts, 'Not enough' states | 14 |
| Header 'Edit log (N)' button | 14, 36 |
| Header 'Edit' button | 14, 18 |
| Tab bar Process, Rules, Documents, Changes, tab badge | 10, 60 |

## Modals opened from the header

| Control | Diagram |
|---|---|
| Add a payer: name, Plan type, Group, 'How it is reached' (Portal, Phone, Fax), 'Programs it covers', four validation messages (empty name, a name another payer has, no route, no program), Cancel, 'Add payer', toast, redirect | 16 |
| Edit payer details: Plan line, Reached by (seven listed values, inline error for an old value), Notice due, Backup route, three 'How to reach' lines, reason, 'Save and log the edit', 'Nothing changed' | 18 |
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
| 'Save workflow' with no changes ('Nothing to save'), 'Save the workflow?' modal, reason, 'Save and log the edit', Cancel, Escape (closes only the modal) | 28 |
| 'How to reach X' card (read only) | 22 |
| 'Instructions for Caller' card, its 'Edit', script modal, reason, save, 'Nothing changed' | 22 |
| Edits-waiting banner ('N edit(s) apply to new drafts only'), 'Update N drafts' / 'Update drafts', 'Update drafts?' / 'Apply to new drafts?' modal, 3 second redraft, toasts | 34 |
| Info note 'Admins can edit; every edit is logged. New drafts use a saved edit at once...' | 20 |

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
| 'Try it on a case': 'Case' menu, 'Paste chart text', 'Check this chart', 'Reader is reading the chart', result banner, 'Open the request', info note | 54 |

## Changes tab

| Control | Diagram |
|---|---|
| Waiting-change banner, 'This payer's rules are up to date' banner, proposals, 'What changed' history, tab badge | 60 |
| A change arriving (Sentinel, bell notification, badge, dot, plan line) | 62 |
| 'Acknowledge change', locked 'Update N drafts' (tooltip 'Acknowledge the change first'), 'Acknowledge this change?' modal, green 'Acknowledged by' pill | 64 |
| 'Update N drafts' modal after a change, rows (only this payer's unsent drafts), redraft, documents added, history row, update recorded for Case Manager, notification, toast | 66 |
| The no-draft variant (Harborview, Evergreen): 'Apply to new drafts', 'No open drafts to update', 'Apply to new drafts?' modal | 70 |
| 'Accept proposal', 'Dismiss' | 30 |

## Across the app

| Topic | Diagram |
|---|---|
| What payer configuration reaches elsewhere (New case documents, rules and approval chance, Case Manager review interval and tag, Dashboard rows, bell, Open the request) and what it does not | 80 |
| Cancel, X, Escape (one layer at a time), dimmed area, save buttons, no undo, nothing half saved, every pop-up | 82 |

## Not drawn

- Dropdown keyboard use (ArrowUp, ArrowDown, Enter) inside every menu: one shared component, not specific to Payers.
- Toast timing and dismissal: shared component.
- Browser Back after a tab or payer change (each pick writes a new address; nothing special happens).
- PRD features with no demo screen: rejecting or deferring a change, rule versions and as-of lookups, field provenance and confidence, observed-versus-published scorecard, strategy rules, degradation alerts. Only mentioned in 62 and 80.
- Where goto targets point (Dashboard, Case Manager, Authorizations, New case) are named by module and screen.

## Demo behaviours to know

- A draft is a request in 'Preparing' or a New case draft that is saved and not sent, for that payer only. It is read live from the store each time a banner or the 'Update drafts' step draws (34, 66, 70). A request the payer already has (Received and later) is never listed or rewritten, and neither is the answer to a payer's question on an 'Info requested' request (P-1499, I-2218, R-0975). So Cardinal's change lists I-2207 only; Harborview's and Evergreen's changes list none.
- Every update records itself for Case Manager and New case: the change id (the change's own id, or `edits-<payerId>` for edits), the payer and the IDs of the drafts that were redrafted. Nothing is recorded when no draft was redrafted (34, 66, 70).
- Every saved edit (workflow, accepted proposal, rule, document list, caller script, payer details) writes the edit log and sends one bell notification that opens the tab it was made on (18, 22, 28, 30, 42, 52).
- 'Reached by' is always one of seven values (Portal, Phone, Fax and their mixes, written in that order). A payer added with 'Add a payer' gets one of them, and 'Edit' shows it as it is (16, 18). An old value that is not listed shows an inline error and blocks Save until one is picked.
- A name that another payer already has (a full name or a short name, any capitals) is refused when adding a payer (16). 'Edit' has no name field, so only 'Add a payer' needs the check.
- The pasted-text check in 'Try it on a case' is keyword level: it looks for each document's name or a usual word for it (CIWA for the withdrawal scale, UDS for the urine screen). A document named in some other way can be missed (54).
- Blank Caller script and blank condition text are accepted (22, 26). A rule edit moves its 'confirmed' date to today (42).
- Sidebar badge starts at 3: Cardinal, Evergreen and Harborview each have a change waiting. The bell notification 'Payer rule changed' and the FLO answer about Cardinal come from fixed text elsewhere in the app and still say 4 drafts; the Changes tab counts live and says 1 (62).
