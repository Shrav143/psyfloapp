# Payers: coverage

Source: `src/pages/payers/*` (without `studio/`, which `12-payer-studio` covers), `src/store/payerConfig.ts`, `src/store/workflows.ts` (rules and versions), `src/data/payerConfig*.ts`, `src/data/workflow/rules.ts` and `impact.ts`, `src/lib/scope.ts`, `src/data/viewers.ts`. PRD: `06-payer-intelligence-and-rules-engine.md` (policy watch, rule versions). File names below are in this folder. The Workflow Builder and Test Workflow views are drawn in `12-payer-studio`.

## Arriving on Payers

| Control | Diagram |
|---|---|
| Sidebar 'Payers' (Connections), its badge (payers with a change waiting: 3 at the start, the same for every viewer and site view) | 10 |
| Links in: bell notification 'Payer rule changed', FLO answer 'Open Payers, Cardinal, Changes', Demo menu 'Payers: Cardinal, Changes', Eligibility's 'Rules' link, bell notifications for saved edits and rule changes, the builder's rule links (`?rule=`) | 10, 62, 40 |
| /payers (landing), /payers/:id (workspace), an unknown id ('That payer is not in the demo', 'Back to all payers') | 10 |
| ?tab=builder, rules, test, history, and the older process (builder), documents (Rules & Instructions with Clinical documentation open and in view), changes (History & Changes), a missing or unknown tab (builder) | 10, 50 |

## Landing page

| Control | Diagram |
|---|---|
| Page title 'N payers. The agents know how each one works.', the line under it, 'Add a payer' | 10, 12, 16 |
| 'Search payers', 'State', 'Insurance type', 'Workflow status' (Has a published workflow, Only drafts, No workflow), 'Clear filters', the count line ('3 of 6 payers · 3 with a change waiting'), filters kept in the address (?q, state, type, wf), empty text with 'Clear filters' | 12 |
| One row per payer: name (link) and organization, product and state, '2 published · 1 draft' or 'None yet', last update, status pill (Published, Drafts only, No workflow), change mark ('Change waiting' or none), the narrow two-line layout | 12 |
| Row or name opens the workspace, Back keeps the list as it was | 12 |
| Foot line: where changes are saved and what Reset demo data does | 12 |
| Add a payer: name, Organization, Product, State, Insurance type, Plan type, 'How it is reached', 'Programs it covers', four validation messages, Cancel, 'Add payer', toast, redirect | 16 |

## Workspace (one payer)

| Control | Diagram |
|---|---|
| Breadcrumb 'Payers › name', header (name, organization · product · state, the demo-rules label and its info icon, plan line, Policy status), 'Plan details' (plan type, programs, needs, notice and reach) | 14, 15 |
| Four tabs (Workflow Builder, Rules & Instructions, Test Workflow, History & Changes), Left and Right arrows, the History & Changes badge, address follows the tab | 14 |
| 'Edit payer' modal: Plan line, Reached by (seven listed values), Notice due, Backup route, three reach lines, reason, 'Nothing changed' | 18 |
| 'Edit log (N)' drawer: entries, area buttons, empty state, close | 36, 74 |

## Rules & Instructions

| Control | Diagram |
|---|---|
| Intro card with its info icon, the rule and unverified counts, eight closed groups with a summary and a count, a group opens and closes, the address can open a group or a rule | 40 |
| Rule row: title, verification pill (Verified, Needs review, Unverified, Superseded), first values, 'Used by N workflows'; open: what it says, structured values, instructions, provenance chips (source and link, who and what it applies to, effective dates, last verified, owner, version), the Unverified note | 40 |
| 'Edit' (right-hand panel with structured values, instructions, 'Applies to and dates'), the footer count, 'Save rule', 'Save the rule?' with the version it becomes and a reason, 'Nothing changed', Escape one layer at a time, the verified-rule warning | 42 |
| 'Mark as verified' / 'Verify again': Source, address, published on, checked on, the four validation messages | 44 |
| 'Add a rule' per group (starts Unverified), 'Archive' (Superseded, struck through, stays listed) | 46 |
| Clinical documentation: 'Level of care', the closed document list, 'Edit list' and its modal, clinical-criteria rules | 50, 52 |
| 'Try it on a case' (chart checker): Case menu, 'Paste chart text', 'Check this chart', result, 'Open the request' | 54 |
| Agent instructions: 'Instructions for Caller', payer-wide instructions, 'How a node prompt combines with these', 'About the combined prompt' | 56 |
| Submission methods: the reach rule (portal, phone, fax, preferred and fallback channel, escalation path) | 40, 56 |
| Edits-waiting banner ('N edit(s) apply to new drafts only'), 'Update N drafts', the pop-up | 34 |

## History & Changes

| Control | Diagram |
|---|---|
| The quiet line when nothing waits, the change card (rule that changed, source and date, before and after, Impact: workflows, open cases, owner notice), 'What changed', the four closed sections | 60 |
| A change arriving (Sentinel, bell, badge, dot, header line) | 62 |
| 'Acknowledge change', the locked 'Review & apply changes' (tooltip 'Acknowledge the change first'), 'Acknowledge this change?', the green 'Acknowledged by' pill | 64 |
| 'Review & apply changes': 'Update N drafts?' pop-up, redraft, documents added, history row, Case Manager tag, bell, toast, the promise that nothing sent is rewritten and no case changes version | 66 |
| The no-draft variant (Harborview, Evergreen): 'Apply to new drafts?', 'No open drafts to update' | 70 |
| 'Workflow versions': rows, 'Workflow' menu, 'View' (version panel), 'Restore as draft' | 72 |
| 'Edit audit': area buttons with counts, cards, empty states | 74 |
| 'Suggestions from Historian': 'Re-learn from decisions', 'Accept proposal', 'Dismiss' | 76 |
| 'Earlier process view (migrated)': read only steps and conditions, the info icon | 78 |

## Across the app

| Topic | Diagram |
|---|---|
| Sites: payers, workflows and rules are clinic-wide; the drafts and cases an update reaches follow the site in view; edits are logged under the person viewing | 84 |
| What payer configuration and published workflows reach elsewhere (New Case documents, rules, workflow match and pin, Case Manager review interval and tag, Dashboard rows, bell, Open the request) | 80 |
| Cancel, X, Escape (one layer at a time), dimmed area, save buttons, no undo, every pop-up and panel | 82 |

## Not drawn

- Dropdown keyboard use (ArrowUp, ArrowDown, Enter) inside every menu: one shared component, not specific to Payers.
- Toast timing and dismissal: shared component.
- Browser Back after a tab or payer change (each pick writes a new address; nothing special happens beyond 12).
- PRD features with no demo screen: rejecting or deferring a change, as-of lookups of an older rule version, field provenance and confidence, observed-versus-published scorecard, strategy rules, degradation alerts. Only mentioned in 62 and 80.
- Where goto targets point (Dashboard, Case Manager, Authorizations, New Case) are named by module and screen.

## Demo behaviours to know

- Every seeded rule is a demo sample: Unverified, source 'Demo sample rules, version 2026.3', never a made-up date or address. Nothing on Payers says a payer confirmed a rule. Only 'Mark as verified' (a source and a date a person types) makes a rule Verified. Editing a verified rule sends it to Needs review. Verifying does not change the version number; any edit does (40, 42, 44).
- Rules the payer's saved configuration already holds (submission windows, backdating, no authorization needed, peer-to-peer and appeals, the document lists, the Caller script, the reach lines) are read through to the rules page, not copied. Saving one writes back to the saved lines, documents, script or reach lines, so New Case and Eligibility read the change at once; the rule's version, verification and extra values are kept beside them. The title and description of such a rule stay as they are (42).
- A rule the library owns (review cadence, units and duration, clinical criteria, the payer-wide agent instructions, any rule added on this page) is saved in the library with its own history (42, 46).
- A draft is a request in 'Preparing' or a New Case draft that is saved and not sent, for that payer only. It is read live from the store each time the change card or the 'Update drafts' step draws (34, 66, 70). A request the payer already has (Received and later) is never listed or rewritten, and neither is the answer to a payer's question on an 'Info requested' request (P-1499, I-2218, R-0975). So Cardinal's change lists I-2207 only; Harborview's and Evergreen's list none.
- The impact lists the payer's published and draft workflows that use the changed rule (a step names it, or a rule or document step reads the rule of its kind) and the open cases that follow one of them, each with the version it keeps. Cases at a site the viewer cannot see are not listed (60, 84).
- Every update records itself for Case Manager and New Case: the change id (the change's own id, or `edits-<payerId>` for edits), the payer and the IDs of the drafts that were redrafted. Nothing is recorded when no draft was redrafted (34, 66, 70).
- Every saved edit (rule, document list, caller script, payer details, workflow save, publish, archive or restore, accepted suggestion) writes the edit audit and most send one bell notification that opens the tab it was made on (18, 42, 46, 72, 76).
- Workflows, the rules library, the payers added, each payer's saved configuration and the edit audit are written to the browser's storage (guarded). A reload shows what was saved; if storage is blocked the foot line says changes last until the tab closes. Reset demo data restores every seed (10, 12).
- 'Reached by' is always one of seven values (Portal, Phone, Fax and their mixes, written in that order). A name that another payer already has (a full name or a short name, any capitals) is refused when adding a payer (16, 18).
- The pasted-text check in 'Try it on a case' is keyword level: it looks for each document's name or a usual word for it (CIWA for the withdrawal scale, UDS for the urine screen). A document named in some other way can be missed (54).
- 'Accept proposal' still adds its branch to the earlier process view (the migrated record), not to the builder's graph, and the card says so. The builder's graph changes only when a person edits and publishes it (76, 78).
- Sidebar badge starts at 3: Cardinal, Evergreen and Harborview each have a change waiting. The bell notification 'Payer rule changed' and the FLO answer about Cardinal come from fixed text elsewhere in the app and still say 4 drafts; the History & Changes card counts live and says 1 (62).
