# R3 · Denial Intelligence (fork DI) · what was built

Source of the layout: the product owner's artifact (the Nov 8 "Denial Intelligence" module and "Denial case" module). Everything is built on the unified `disputes` layer: `request.stage` stays the only lifecycle, every change is an audited `dispute.*` action, and the unified safety rules win where the artifact differs.

## Artifact module → file

| Artifact module | Unified file |
|---|---|
| `50-denials` queue (columns, filters, Decision date card) | `web/js/screens/DenialIntelligence.js`, `web/screens/DenialIntelligence.dc.html`, `queueRows` in `web/js/shared/sel/disputes.js` |
| `51-denial-detail` header card, process line, Update status, Open in … buttons | `header()` and `statusItems()` in `web/js/screens/DenialCaseViews.js` |
| left menu (Review, Respond) | `menu()` |
| Overview: Recommended next steps (7), What X said, Where the denial is weak (top 3) | `overviewSection()` (`stepsCard`, `saidCard`, `weakCard`), `STEP_LIST` / `stepResults` / `weakPoints` / `compareReasons` / `timelineOf` in `sel/disputes.js` |
| slide-over panels (Analyze, Missing evidence, Clinical review) | `panelBody()` in the views, `step()` / `panel()` in `DenialCase.js` |
| Documentation request | `docreqSection()`, actions `dispute.docRequest` / `dispute.docReceived` |
| `09-voice` (Call payer · voice agent) | `callFlow()` in `DenialCase.js`, `lineStatus` / `callScript` in `sel/disputes.js`, `dispute.logCall`, `seed/extra/payer-hours.json`, maturity `agents.voice` |
| `86-partials` (accept, stretch, use them up, peer-to-peer) | Decide reply (`optionsAction`), "All paths" card (`pathsCard`), unchanged actions |
| `87-p2p` (talking points, call notes) | Peer-to-peer reply (`p2pAction`), unchanged |
| info request, appeal, reconsideration | `infoAction`, `appealAction`, `reconAction`, unchanged (guardian signs on the family portal) |
| `08-history` | collapsed History card (`historyCard`) |

## Kept from the unified demo although the artifact differs

- **Update status is not a free status editor.** Status is derived from the request stage; the menu offers only the recorded steps that fit the stage (accept, peer-to-peer, reconsideration, appeal, record outcome, change owner, mark for review). Nobody can type a status.
- **No likelihoods.** "Where the denial is weak" lists Strong / Gap / Clarify / Risk points computed from stored records only (the same matching the drafts use). The artifact's hard-coded REASON_MAP and AI wording are not copied; the chip says Simulated and rule-based.
- **Voice agent is Simulated and person-initiated.** It never dials. Payer hours are demo data labelled UNVERIFIED-DEMO-ASSUMPTION. A closed line cannot be called (screen and server: `payer_closed`, 409). The payer's side of the script is a labelled placeholder; the outcome is what the clinician types; nothing is saved until Save; it is never a payer decision and never moves the request. Clinician only.
- **Documentation request records, it does not send.** Psyflo sends no message; a person asks and marks each item received.
- **Process line label.** The third step reads "Response prepared" (not "Appeal prepared") because the unified case also covers information replies, peer-to-peer and reconsideration.
- **Claims row (CL-217) is not ported.** The unified demo has no claims.
- **All paths** (the former Options page, with every rule and source chip, the unavailable paths with their reasons and the care-transition link) is kept as a collapsed card under the Overview, so nothing the earlier page proved is lost.
- Administrators keep status-only access: weak points, evidence, documentation request, drafts and the call are locked ("Needs clinician"); marking a case for clinical review is allowed and its note is withheld from them.
- Pager (10, 25, 50, 100) at the foot of the queue; no "N of M" at the top. The artifact's Decision date card is built (start, end, Today, This week, Before this week).

## Tests (ports 5300+)

`node test/run-all.mjs --ports 5300 --workers 1 --only denials,denials-ui,s5,voice`; new suite `test/voice.mjs`; DI hunks in `visual.mjs`, `a11y.mjs`, `hosted.mjs`.

## Shared-file hunks

- `web/js/shared/maturity.js`: `route.DenialCase` text; new `denial.analysis`, `denial.docreq`; `agents.voice` Future → Simulated (surface DenialCase).
- `seed/extra/payer-hours.json` (new), picked up by `loadSeed`.
- No hunk in `authz.js`, `project.js`, `registry.js`, `nav.js`, `permissions.js`: the new actions export their own `authz` and `projection` from `server/psyflo/actions/x-disputes.js`.
