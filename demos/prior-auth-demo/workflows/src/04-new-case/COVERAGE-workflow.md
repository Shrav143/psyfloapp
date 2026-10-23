# Coverage: New case › the payer workflow (Workflow line, View workflow, review panels, trace)

Source: `src/pages/newcase/workflow/*` (facts, model, diff, trace, items, fold, useCaseWorkflow, useWorkflowSync, WorkflowRow, ReviewWorkflowDrawer, WorkflowTraceDrawer), `src/pages/newcase/caseEnv.ts`, `StepHeader.tsx`, `reviewModel.ts`, `NewCasePage.tsx`, `ReviewStep.tsx`, `src/store/cases.ts` (`recordCaseWorkflow`, `signCaseDraft`), `src/data/cases.ts` (`appliedWorkflow`, `workflowPinned`, `workflowChoice`, `workflowLog`). The engine, matching and the saved workflows are the Payers module's (`src/data/workflow/*`, `src/store/workflows.ts`, `src/pages/payers/studio/*`); New case only reads them. Diagram numbers are the file prefixes in this folder.

| File | Title |
|---|---|
| 66 | Workflow › Match and pin the payer workflow |
| 67 | Workflow › Default process and equal matches |
| 68 | Workflow › A newer version exists |
| 69 | Workflow › The case changed after the workflow started |
| 70 | Workflow › Show the workflow and its path |
| 71 | Workflow › What the workflow says at each step |
| 72 | Workflow › What the workflow adds to the history |
| 73 | Workflow › No authorization required from the workflow |
| 74 | Workflow › Prepare versus send, and sites |

In Case Manager: `07-case-manager/61` (Ledger case › Workflow line and history).

| Control or element | Diagram |
|---|---|
| The Workflow line (name, version, payer, 'Illustrative default' pill, 'At <stage>') | 66, 67 |
| Info icon 'Why this workflow' (explanation, rules read, pinned or free) | 66, 67 |
| 'View workflow' | 70 |
| 'Trace' (only when the workflow has written lines) | 70, 72 |
| 'A newer version exists (vN).' and 'Review newer version' | 68 |
| 'Apply version N', 'Keep version N' | 68 |
| 'The case details changed since this workflow was applied.' and 'Review the match' | 69 |
| 'Apply <workflow>', 'Keep version N' in the match panel | 69 |
| 'Two workflows match equally. The default is used until you choose.' and 'Choose a workflow' | 67 |
| 'Use this workflow', 'Keep the default for now', the radio choices | 67 |
| 'Next in this workflow: ...' under the step header | 71 |
| 'Workflow: ...' folded into the footer line of steps 1 to 4 | 71 |
| The 'Workflow' note in 'What is missing' | 71 |
| 'No authorization is required' raised by the workflow | 73 |
| 'Sign and send to payer (demo)' keeps being the one simulated send | 74 |
| Workflow lines in the request's History, the case page 'Workflow' fact, Case Manager 'Workflow' row | 72, Case Manager 61 |
| Dr. Rivera and Sam Okafor see only their site's cases; workflows are the same for everyone | 74 |
| Escape on each side panel | 68, 69, 70, 67 |

## Not drawn

- What each workflow step does inside the engine: the Studio's Test Workflow diagrams (12) and the engine's own tests show it.
- Where a workflow is built, published or archived: Payers (10, 12).
- The Studio's read-only canvas internals (zoom, pan, node focus): the Studio's diagrams.

## Things in the demo that look odd (for the reviewer)

- The workflow's own warnings are folded into each step's existing line; a rule that is merely unverified (every seeded rule is a demo sample) is listed in the info icon and the history, not repeated as a warning on every step.
- Matching reads the published workflows. Until a newer version is reviewed, the case keeps the version it started with, even if the working copy in Payers has moved on.
- The default process is a stand-in per request type. It states no payer rule.
- A case that was opened from a request already on the case page is pinned on first view, because its workflow has already run past Intake.
