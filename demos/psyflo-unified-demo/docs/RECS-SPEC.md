# Recommendations (R6) · spec for the three owners

Request (Shravan, Nov 18): "Make sure that the documentation enhancement, the denial intelligence and some of the prior authorization features include a
recommendation feature, and the user should be able to add. The recommendations are suggested by Psyflo … like the Oprox demo … don't copy the UI as it
is; add your own twist … the UI is a lot simpler than what Psyflo has … don't add any new tabs … add pop-ups wherever you can and side navigations wherever
you can, not opening a completely new page … add those recommendations in the browser extension as well … most clinics use the EHR to draft their prior
authorizations, so the same functionality must be in the browser extension … make sure the browser extension connects to Lauris Online."

Scope: **Authorizations** and **Denial Intelligence** in the platform, and the **extension panel** (Scan & Enhance and the authorization path) beside the mock
Lauris. Nothing else: no new tabs, no change to Dashboard, Analytics, Referrals or Settings.

## What "recommendation" means here (the Oprox pattern, our own take)

Oprox (the reference product) shows each authorization with a short list of system-identified actions. Each is a card you tick: a title, a "+n%" lift, a
"Why this matters" disclosure, sometimes a "Needs input" box where the clinician adds context; a counter ("2 of 3 included in the narrative"); **Apply
selected**; a payer-criteria checklist ("Documented" / "Needs strengthening"); and on denials a numbered "what the system would do" list with "Applied 198 times
· 83% success". Our version keeps those mechanics and changes the substance:

| Oprox | Psyflo |
|---|---|
| Writes the narrative sentence itself | **Never writes a clinical claim.** The text on a card is built only from stored records (the same sentence builders the drafts use, each traced to evidence ids) or is the clinician's own words typed in the card. A card with no record behind it says what is needed (`needsInput`) and cannot be included without the clinician's text. |
| "+16%" lift and "66% → 95%" as fact | Same numbers, from `seed/extra/recs.json` (`rec_outcomes`, `rec_baseline`), **always labelled "Illustrative sample" and marked Simulated**. Never a prediction. |
| One list | Three scopes on one engine: `auth` (a request and its Lauris form), `denial` (a payer reply case), `note` (Scan & Enhance on a note or form open in Lauris). |
| (n/a) | The clinician can **add their own** recommendation (`recs.add`) and it goes into the request or reply like the others. |
| "All decisions are logged" | Every include, dismiss, reopen, apply, add and remove is an audit event with who and when (`recs.*` actions). The clinician's text stays in the decision row, never in the audit text. |

Psyflo never signs, never presses Process Form / Get Signature / Send, and never types into Lauris without a person pressing the button.

## The engine (already built · do not rewrite)

`web/js/shared/recs.js` (pure; server, browser and panel import it), `server/psyflo/actions/x-recs.js`, `seed/extra/recs.json`,
`web/js/ui/recs.js` (platform cards) and `test/recs.mjs` (10 tests, all pass). Read them first.

```
Rec = { id:'<scope>:<ref>:<key>', key, family, scope, ref, kind, title, why, impact:'high'|'medium'|'low', dim:0..6, evidence:[ids],
        insert:{ box|doc, text }|null,           // text from stored records ('' when the clinician must supply it)
        needsInput:{ prompt, placeholder }|null, // no record answers it: the clinician's own words are the text
        act:{ kind:'lauris'|'chart'|'denial', label, path? }|null,
        outcome:{ applied, success, lift }|null, // illustrative sample
        state:'open'|'included'|'dismissed', context, custom?, by, at }

authRecsFor(s, request)          -> Rec[] (≤ 6)    denialRecsFor(s, dispute, request) -> Rec[] (≤ 10)    noteRecsFor(s, clientId, form, fields) -> Rec[]
summary(s, recs)                 -> { total, included, dismissed, open, needInput, base, expected, lift, basis }
insertsFor(recs, doc?)           -> [{ id, key, box, doc, text, evidence, title }]   // what goes in (included, with text)
applyToBoxes(boxes, recs)        -> { boxes, applied }  // appends included text to its Lauris box; a placeholder is replaced; never twice
docSection(recs, kind)           -> the "Added from recommendations" section of a denial draft (server keeps it in step: x-disputes.js syncRecsSection)
findRec / listFor(s, scope, ref, extra) -> the recomputed list (the server validates decisions against it)

Actions (clinician only; `drafts.clinical`; the other roles get an empty `rec_decisions` and a 403):
  recs.decide {scope, ref, key, state:'included'|'dismissed'|'open', context}      recs.decideMany {scope, ref, items:[{key,state,context}]}
  recs.add {scope, ref, title, text, box?, dim?}                                    recs.remove {scope, ref, key}      (scope 'note': ref = '<client>:<form>', pass `fields`)
```

Roles: recommendations are clinical (they read ratings and dated records). Show them to the clinician only. For the supervisor and the administrator the
projected state has no clinical text, so a computed list would mislead: show nothing, or one quiet line ("Suggestions are for the treating clinician").

The platform card component is `ui.recPanel / ui.recDrawer / ui.recMini / ui.bindRecPanel` (web/js/ui/recs.js; CSS `.rc*` in components.css; see its header).
Use it; do not build a second card look in the platform. The panel draws its own cards in the panel's style from the same engine.

## Design rules for all three owners

1. **Simpler, with pop-ups and side drawers.** Oprox's screens are plain: a short list, one primary action. Remove, merge or move into a drawer anything that is
   not needed on first sight of the page. Use `ui.drawer` (side) and `ui.modal`; do not add routes or tabs. Nothing opens a "completely new page" for a
   recommendation, a checklist, history, evidence or a document preview.
2. **Counts and honesty.** Every number from the outcome table is an "Illustrative sample" (the card component already says so). A computed fact (days left, a rating,
   a count of records) is computed. No invented clinical text, no likelihood claims.
3. **Final wording.** New text must not contain: school, student, TDT, therapeutic day treatment, H2016, guardian, behaviour, classroom, teacher. Use client,
   IOP (H0015), ASAM, substance use, family member, treatment program. (Older screens still hold legacy words; a wording pass rewrites them after the build. Do
   not rely on it for anything you write.) Sentence case, no em dashes in new copy, plain words, short.
4. **Accessible and responsive.** Labels on every control, focus returns to the opener when a drawer closes, no horizontal scroll at 390 px, touch targets ≥ 44 px on
   the phone widths, no colour-only meaning.
5. **Hosted build.** Everything runs in the browser through the virtual network: no Node-only APIs in shared code, no new network calls, no `eval`. The hosted build is
   `node scripts/build-hosted.mjs` (needs HOSTED_TOOLS, already installed in the scratchpad default path); you do not need to run it unless you touch build inputs.
6. **Tests.** Own a Playwright suite file under `test/` (named below) and fix the pins in existing suites that your changes break (`test/authorizations.mjs`,
   `denials-ui.mjs`, `panels.mjs`, `lauris.mjs`, `enhance.mjs`, `a11y.mjs` and the others; run `node test/run-all.mjs --list`). Run with your own ports:
   `node test/run-all.mjs --only <names> --ports <base> --out <a scratch dir>` (base+0 app, +1 Lauris, +2 portals; `--workers 1`). Do not leave other suites red.
7. **Files.** Edit only the files you own. For a shared file (`web/js/shared/recs.js`, `x-recs.js`, `web/js/ui/recs.js`, `components.css`, `permissions.js`) make small,
   surgical, additive edits with `Edit` (re-read first) and list each in your report; never rewrite them. Put screen CSS in the controller's `get css()` or panel.css.
8. **Commit** on your worktree branch with `tag: Short summary` (e.g. `feat: ...`) and the co-author trailer you are given. Do not push; the lead merges.

## Owner A · Authorizations (platform)

Files: `web/js/screens/Authorizations.js`, `Authorization.js` (+ new `AuthRecs.js` if useful), their tests. Suite to add: `test/recs-auth-ui.mjs`.

- **Case page** (`#/Authorization?id=…`): put a **"Suggested by Psyflo"** card near the top (clinician only): `ui.recMini` (top three) and one button that opens
  `ui.recDrawer` (scope `auth`). Include in the drawer a footer link "Open in Lauris with the Psyflo panel" (`laurisLink` from shared/lauris-link.js; the panel in
  Lauris shows the same cards and types the included text into the form, so this is how a clinician continues in the EHR).
- **Payer criteria** modal ("Check against payer criteria"): the six ASAM dimensions, the level of care and the reassessment clock as a checklist with
  **Documented** / **Needs strengthening** pills (computed: `evidenceIndex(...).needs`, `asam.levelCheck`, `asam.dueState`), each row with the sentence or the gap and
  a "See suggestion" link that opens the drawer at that card. Mirrors Oprox's "Payer criteria" list without copying it.
- **Simplify**: the case page today is many accordion sections. Keep: header, next step, "Suggested by Psyflo", units and deadlines. Move the rest (documents, evidence,
  history, submission detail, tasks) behind one "More" row of buttons that open **side drawers** (the existing section content in a drawer body). Keep deep links
  (`?section=…`) working: they open the drawer.
- **List** (`#/Authorizations`): simpler table. Add a **Suggestions** column (clinician only): a small chip "3 · 2 high" that opens the drawer for that row without leaving the
  list (the request id is the ref). Fewer filters on first sight if that helps; keep every existing capability reachable.
- Included auth recommendations are what the extension types into the Lauris form (`applyToBoxes`); the platform shows "N included · typed in Lauris: yes/no" when it can
  tell (the panel records `panel.filled`; look at what it logs) or just "N included".

## Owner B · Denial Intelligence (platform)

Files: `web/js/screens/DenialIntelligence.js`, `DenialCase.js`, `DenialCaseViews.js`, tests. Suite to add: `test/recs-denial-ui.mjs`.

- **Case overview**: lead with **"What Psyflo would do"**: the numbered recommendation list (Oprox's "What Oprox would do": ranked, each with impact, the sample
  "applied N times · N% success", "Why this matters", and Include / Dismiss / Add context). Use `ui.recMini` on the page and `ui.recDrawer` (scope `denial`) for the full list.
  Today's overview stacks level, steps, said, weak points and paths cards: collapse them into this one list plus a short "Where the case stands" strip (deadline, level
  reading, units); the old cards' content moves into drawers (the existing `panelBody` drawers for Analyze / Missing evidence / Clinical review stay).
- **Packet**: a "Packet" card: "N recommendations included" and buttons to draft the reply (existing `dispute.genDoc` for info, peer-to-peer, appeal, reconsideration). Included
  recommendations arrive in each unsent draft as the section "Added from recommendations" (server does it). Add a **Preview packet** drawer showing the draft with that section
  highlighted and its evidence chips (`ui.evidenceChip`), so a clinician sees what changed. Dismissing or reopening a recommendation updates the draft (server does it).
- **Add your own** is in the drawer; show it also as a visible button on the card.
- **Queue** (`#/DenialIntelligence`): simpler: the case rows keep what decides the order (deadline, payer, units, status); add a "Suggestions" chip like the Authorizations list; remove
  decoration that does not help someone pick the next case. Keep every existing capability reachable (filters may collapse behind one "Filters" button).
- Oprox's denial flow also has "Analyze Denial": keep ours (`dispute.analyze`) and show the analysis in a drawer.

## Owner C · Extension panel, Scan & Enhance and the Lauris connection

Files: `web/panel/**` (views, core.js, parts.js, panel.css, bridge.js), `extension/*` (the generated bridge copy is rebuilt from `web/panel/bridge.js` at server start), `server/lauris/*`
(forms.js, site.js, store.js), `server/psyflo/actions/x-enhance.js` / `x-panel.js` if needed, tests. Suite to add: `test/recs-panel.mjs`.

- **Connection.** The user reports the Unified demo "doesn't really have a browser extension that connects to Lauris Online". It does (the panel is the in-page fallback beside the
  mock Lauris; the MV3 side panel in `extension/` is the same code), but nothing makes that visible. Make the connection plain and real:
  1. In the Lauris top bar the chip reads **"Psyflo extension · connected"** (green dot) when the bridge has answered a read, "not connected" otherwise (today it says `psyflo · on/off`).
  2. The panel header shows **Lauris connected · <page name>** (it has a line today; keep it truthful: it must flip to "not connected" if the bridge stops answering).
  3. Opening Lauris from the platform ("Open in Lauris", Dashboard icons, the new drawer links) lands on the right page with the panel already on the matching view (authorization form →
     recommendations; payer reply form → denial packet).
  4. Prove the round trip in `test/recs-panel.mjs`: a recommendation included in the platform appears included in the panel and vice versa (same server state); "Type into Lauris" puts the
     text into the Lauris form boxes (yellow, "Psyflo typed, check it") and records `panel.filled`; Psyflo presses no Lauris button.
- **Authorization path** (`web/panel/views/authorize.js`): above the request draft, a **Suggested by Psyflo** block in the panel's style: the same cards (title, impact, "+n pts · sample", why, needs-input
  box, Include / Dismiss, counter, **Apply selected**, **Add your own**). Included recs are merged into the draft with `applyToBoxes` before the boxes are typed (the draft's `isStale` check and the
  review block must keep working). The level, D1 to D6, "Reason for the requested level", "Continued need / risk", "Progress toward goals" boxes are the targets.
- **Scan & Enhance** (`views/enhance.js`): the findings become recommendation cards (`noteRecsFor`): the finding's question is the card's input; "Apply selected" types the clinician's answers
  (`applyFindings` / `ctx.fill`); **Add your own** adds a custom recommendation that types into a chosen box. Keep the existing scan, the forms it covers (daily note, weekly, monthly, CNA/ASAM
  assessment, authorization requests) and the `x-enhance` records working; if both stores would disagree, make `recs.*` (scope `note`) the one that decides what is typed and keep `x-enhance` as the scan record.
- **Denial packet in the EHR**: clinics draft payer replies in the EHR, so add a view `views/denial.js` ("Denial packet"; offered on home when the open consumer has an open payer reply case; clinician
  only) with the same cards (scope `denial`, from `denialRecsFor`) and the packet sections (`dispute.genDoc` output, "Added from recommendations" highlighted), and a **Type into Lauris** action. Lauris
  needs somewhere to type: add a mock form **"Payer Reply · appeal or information request"** to `server/lauris/forms.js` (slug `payer-reply`; boxes: Member, Current authorization, Payer decision,
  Reply type (select), Reason the payer gave, Level of care, Dimension 1 to 6 (reuse `DIM_LABELS`), Added from recommendations, What we ask), listed in Add Session, with `FORM_TITLES` in the bridge,
  `FORM_ORDER`, and the pins in `test/lauris.mjs`, `bridge-contract.mjs`, `panels.mjs`, `fixtures.mjs` updated. It is a note-type form (no signature path); Psyflo never sends it.
- **Simpler panel**: the same rule as the platform: fewer blocks on first sight, details in the panel's accordions. Do not remove Scribe or Scan & Enhance.
- The panel is 400 px wide: cards stack, buttons wrap, nothing scrolls sideways.

## Integration (lead)

Merge the three branches, run the whole suite, rebuild the hosted file, run the wording passes, walk all roles, republish the artifact, push.
