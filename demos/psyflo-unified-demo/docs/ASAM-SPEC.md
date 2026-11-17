# ASAM-driven demo: spec for every owner

Goal: the unified demo's **content, recommendation layer and intelligence layer run on the ASAM Criteria for substance use treatment**.
This is not a wording pass and not an explainer. A reader opens a client, an authorization or a denial and sees decisions that
come from stored ASAM dimension ratings, level of care and reassessment dates. Do **not** add static "what is ASAM" panels or
paragraphs. Everything ASAM-shaped on screen is computed from the stored assessments (`seed/extra/asam.json`) by
`web/js/shared/asam.js`, or is stored clinical data that cites an assessment.

## What the ASAM model is here

* Six dimensions (3rd edition, 2013): D1 Acute intoxication and/or withdrawal potential · D2 Biomedical conditions and complications ·
  D3 Emotional, behavioral, or cognitive conditions and complications · D4 Readiness to change · D5 Relapse, continued use, or
  continued problem potential · D6 Recovery/living environment. Each is rated 0 to 4 (None, Mild, Moderate, Significant, Severe) by the clinician.
* Levels of care: 1 Outpatient · 2.1 Intensive outpatient (IOP) · 2.5 Partial hospitalization · 3.1 / 3.5 Residential · 3.7 Medically monitored
  intensive inpatient · 4 Medically managed intensive inpatient. This demo's clients are in Level 2.1 IOP (billed H0015; evening group H0005)
  or Level 1 outpatient.
* `asam.js` derives, never stores: the lowest level whose limits contain every rating (`lowestLevel`), whether a request's level matches
  (`levelCheck` → state `match` | `over` | `under` | `none`, with the `drivers` = dimensions that keep the person above the level below),
  the reassessment clock (`dueState`, rule `asam.reassess_days`), the change since the previous assessment (`change`), and which dimensions a
  payer's stated reason turns on (`reasonDims`). One call gives all of it: `profile(s, clientId, requestedLevel)`.
* The per-level limits are a simplified **demo decision rule**, not the ASAM text. Wherever a screen states a derived level, say "suggested",
  never "determined"; the ratings and the level recommendation are the clinician's. Where a screen states a reassessment date, show the
  rule's source chip (`ui.sourceChip(rule(s, 'asam.reassess_days', level))`) like every other rule-driven date.
* Nothing is invented: no assessment → "Not assessed", never a guess. Counts, not percentages ("3 of 5 screens negative").

## Vocabulary (important)

A build step rewrites the old school/day-treatment words across the whole bundle after your source is built
(`school→partner`, `student→participant`, `guardian→family member`, `teacher→facilitator`, `classroom→group`, `IEP→treatment plan`,
`grade→band`, `TDT→IOP/DT`, `office referral→incident report`, `after-school→evening`, `H2016→H0015`). So:

* In **new** user-visible text write final substance-use wording directly: client, family member, program, group, IOP, H0015, H0005,
  use episode, urine drug screen (UDS), withdrawal screen (CIWA, COWS), craving rating, PHQ-9, GAD-7, relapse prevention, refusal skills,
  recovery support, referral partner. Never write the old words (school, student, teacher, classroom, guardian, parent, IEP, TDT, grade,
  after-school, "office referral", H2016) in new strings.
* **Keep existing data keys and identifiers unchanged** (`client.school`, `client.guardian`, `client.iep`, `client.grade`, `r.school`, `d.guardian`,
  function names, form labels that code looks up). Change **values and content**, not shapes. Where a key now carries something else
  (for example `client.school` = the client's treatment site), leave the key and change the value.
* Adolescents only (the family-member signs the appeal flow stays valid). Ages 14 to 17.
* Counts, dates and sources: every clinical sentence has a date and a source; seeded sentences carry `provenance: 'seed'` (shown "Illustrative sample").

## Client bible (authoritative; every file must agree with it)

Today in the demo is **2026-10-29**. Ratings are in `seed/extra/asam.json` (do not edit it; read it). Request ids and payers are unchanged.

| id | age/sex | substances · diagnosis (ICD-10-CM) | co-occurring | home | request (payer) · story |
|---|---|---|---|---|---|
| TW (Tyler) | 16 M | cannabis daily, nicotine vape · F12.20, F17.290 | anxiety F41.1 | grandmother Denise Rivers | R-0416 (humana) initial, submitted Oct 22, 150 IOP units. ASAM initial Oct 16. |
| MR | 15 M | alcohol, some cannabis · F10.20, F12.10 | depression F32.1 | mother; stepfather moved out Sept | R-0411 (anthem) continued stay, draft ready. 51 group notes Aug 18 to Oct 29. Reassessed Oct 14: improved, one lapse Sept 27, D3 still 2; plan step-down to Level 1 when D3 ≤ 1 and 30 days no use. |
| DW | 15 M | cannabis, alcohol · F12.20, F10.10 | ADHD F90.2 | mother (works nights); older brother uses at home | R-0402 (sentara) continued stay, partial 110 of 150. Reassessed Oct 9. **Oct 28: emergency department visit after alcohol and cannabis use (level 2 incident), after the last assessment: a reassessment is indicated.** |
| KT | 16 F | alcohol, cannabis · F10.20, F12.10 | none | father and stepmother (alcohol unlocked at home) | R-0408 (anthem) initial, information requested Oct 28 (Availity). Court diversion referral. Prior weekly counseling Jan to Apr 2026 (Piedmont Counseling, 9 sessions) did not reduce use. |
| TN | 16 F | non-prescribed stimulants · F15.20 | major depression F32.1 | mother; cousin who sells pills shares the bedroom | R-0388 (sentara) partial 65 of 150, peer-to-peer booked. Ratings suggest Level 2.5; Level 2.1 requested because the family cannot provide transport for 20 hours a week. Units used up Oct 28, still in service unpaid. |
| EC (Ethan) | 15 M | cannabis, nicotine vape · F12.20, F17.290 | none | parents separated, two homes | R-0384 (anthem) denied Oct 22: "already connected to other services" (weekly school counseling, listed as care coordination). Four counselor referrals in 30 days. Appeal in preparation. |
| JO | 17 M | alcohol, cannabis · F10.10, F12.20 | none | aunt (new address) | R-0391 (aetna) new initial after early discharge Sept 18. Ratings fit Level 1: requested Level 2.1 needs a stated reason (`over`). |
| SB | 14 F | cannabis · F12.10 | anxiety F41.1 | both parents; a sibling vapes | R-0395 (uhc) continued stay, active, 66 of 80 units used. Last assessed Sept 24: reassessment overdue (30-day rule). |
| LV | 16 F | alcohol · F10.10 | social anxiety F40.10 | alternating homes | R-0380 (humana) evening IOP (H0005), active. Last assessed Sept 10: reassessment overdue. |
| PG | 17 M | cannabis, early remission · F12.21 | anxiety F41.1 | father | R-0377 (aetna) Level 1 outpatient, active. Stepped down from IOP Sept 8; assessed Oct 2. |
| A.L. | 15 F | alcohol, cannabis · F10.10 | depression F32.0 | mother; older sister uses at home | R-0399 (humana) initial, overdue with the payer. Client id is the string `"A.L., 15"` (was `"A.L., 6"`; rename every occurrence). |
| JT, DP, AG, CB | 14-17 | cannabis / alcohol / nicotine vape | see `asam.json` notes | invent consistently | in service, have assessments (JT PHQ-9 11 no use since Sept 14; DP two lapses in Sept, cousin uses in home; AG PHQ-9 10; CB asthma controlled, GAD-7 9). |
| LB, AM, ES | 14-17 | any | none | invent | LB, AM in service with no authorization row; ES has no authorization and no ASAM assessment ("Not assessed" must show). |

Treatment goals (3 per client, each stated as a count and tied to a dimension): G1 (D5) screens/use ("4 of 5 weekly urine screens negative"),
G2 (D4 or D3) engagement or coping ("attend 4 of 5 scheduled groups each week"; "use a taught coping skill before use in 4 of 5 high-risk situations"),
G3 (D6) environment or family ("one family session a week"; "identify and use two recovery supports"). Do not write percentages.

Interventions (replace the seven in `seed.json.interventions`, the ISP picker list and note intervention lists; same shape `{code, name}`):
`SUD 1.1 Motivational interviewing` · `SUD 1.2 Relapse prevention skills` · `SUD 1.3 Cognitive behavioral skills for substance use` ·
`SUD 1.4 Drug and alcohol refusal skills` · `SUD 1.5 Contingency management` · `SUD 2.1 Family session` · `SUD 2.2 Recovery support planning`.

Services and codes: IOP **H0015** ("IOP day": 3 units a day, the existing rate rule stays), evening group **H0005**, outpatient (Level 1) stays "Outpatient".

Evidence kinds in `disputes.json` (owned by the Denial Intelligence owner): `assessment`, `withdrawal` (D1), `medical` (D2), `mh_screen` (D3), `engagement` (D4),
`use_episode` (D5), `environment` (D6), `prior_service`, `current_service`, `placement_risk`, `screening`, `safety_plan`. Each carries `dim` (1 to 6, or 0).

## Ownership (do not edit files you do not own)

| Owner | Files |
|---|---|
| **Lead (Denial Intelligence)** | `web/js/shared/asam.js`, `seed/extra/asam.json`, `scripts/seed-gen/asam-seed.py`, `web/js/shared/sel/disputes.js`, `web/js/screens/DenialCase.js`, `DenialCaseViews.js`, `seed/extra/disputes.json`, `server/psyflo/actions/x-disputes.js`, `web/js/shared/payer-guidance.js`, `test/denials*.mjs` |
| **A1 Content core** | `seed/seed.json`, `seed/extra/{requests,referrals,scenarios,portals,staff,crosswalk,workflows,documents,history,flags,00-flows,provenance,phone,auth,settings,analytics,payer-hours}.json` (content only; skip `rules.json`, `asam.json`, `disputes.json`, `notes-corpus.json`), `web/screens/*.dc.html` text and `seed/notes.md`, `seed/notes/*.md` only where the text names the old behaviors |
| **A2a Drafting engine** | `web/js/shared/draft.js`, `server/lauris/forms.js`, `seed/scripts/*`, `test/draft.test.mjs`, `web/panel/**` (views, lib), `server/psyflo/actions/{lead-extension,x-foundation}.js` |
| **A2b Notes and Scan & Enhance** | `web/js/shared/enhance.js`, `seed/extra/notes-corpus.json`, `server/psyflo/actions/{x-enhance,x-scribe,x-panel}.js`, `server/lauris/store.js` (only the seeding of notes), `web/js/screens/Ext*.js`, `Documentation.js` |
| **A3 Platform screens** | `web/js/screens/{Authorizations,Authorization,Dashboard,MyWork*,Patient,DenialIntelligence,Analytics*,Referrals,Referral*,StaffDashboard,EarlyDischarge,Partials,PeerBrief,InfoRequest}.js`, `web/js/shared/flo-engine.js`, `web/js/shared/sel/*` (except `disputes.js`), `web/js/shared/analytics/*`, `web/js/shared/nav.js`, `web/js/shared/model.js` |

Shared helper additions: if you need a new pure helper that belongs in `asam.js`, add it at the end of that file as a new export (do not change existing exports) and
mention it in your report. The `DenialCase*` screens are the lead's: A3 renders the case **list** and the authorization pages; the case workspace is the lead's.

## What each owner delivers

* **A1**: convert every client/request/referral/staff/scenario/portal/crosswalk/workflow text to the bible (ages, diagnoses, substances, goals as above,
  interventions list, `incidents` become use-related incidents (ED visit, found with substance, positive screen, overdose scare) with the same fields,
  `notes_sample`, referral reasons and sources (court diversion, pediatric clinic, school counselor, emergency department, family self-referral),
  `schools` list = Harvest treatment sites (keep ids; names like "Lynchburg City · Main IOP", "Campbell County · IOP"; `level` values `iop`),
  add `asam_level` to every request in `seed.json.requests` (`"2.1"`, PG `"1"`), add `substance` (display string, e.g. "Cannabis · nicotine vape") to every client,
  `denial_reasons` rewritten as the payer reasons below with `dims` (array of ASAM dimension numbers) and `level` (true when the reason is about the level of care),
  `payer_history` and `payer` guidance (`what_works`, `tends_to_ask`) rewritten in ASAM terms.
  Payer denial reasons to seed (counts keep the existing order of magnitude): "Does not meet ASAM Level 2.1 criteria" (dims [4,5,6], level) ·
  "Can be managed at a lower level of care (outpatient)" ([5,6], level) · "Already connected to other services" ([5,6], level) ·
  "No withdrawal risk documented" ([1]) · "Co-occurring condition not documented" ([3]) · "Assessment is not current" ([], level) ·
  "No documented use in the last 30 days" ([5]) · "Recovery environment is supportive" ([6]) · "Not engaging in treatment" ([4]).
  Each has a `check` sentence that says what Psyflo pulls in (dimension, record kind, window).
* **A2a**: the extension's drafting engine speaks ASAM. `screeningFacts`/`screeningPrompts`/`draftScreening` extract and ask for substance use facts
  (substance, frequency, amount, route, last use, prior treatment, withdrawal history, family substance use, medications, safety); `draftInitialSRA`
  and `draftSeeded('sra-*')` write the request **dimension by dimension** from the assessment and the record (a box per dimension with its rating, date
  and cited evidence; a "level of care" box that states the ASAM level requested, the lowest level the ratings fit (`levelCheck`) and, when the request is above it,
  prompts the clinician for the reason), and a continued-stay draft that cites the reassessment, change since the last assessment and the step-down plan.
  `forms.js`: Admission Screening (substances table replaces the behaviors table), CNA becomes "ASAM Multidimensional Assessment" (a section and a 0 to 4 rating
  per dimension, level recommendation, reassessment date), the SRA initial/continued forms ask for ASAM dimension justifications instead of the three TDT criteria.
  Update `seed/scripts/*` worked examples and `test/draft.test.mjs` so the examples are substance-use screening and group dictations; the rule checks (counts not
  percentages, dates within 30 days, no "observed", interventions from the list, prior services with provider/dates/outcome) stay.
* **A2b**: Scan & Enhance and the notes. `documentationGaps` adds ASAM gaps from the assessment and notes: reassessment due or overdue, a dimension rated 2 or more
  with no note addressing it in the window, a lapse or positive screen with no response documented, a step-down plan with no criteria. Daily progress notes are
  group/IOP notes (what skill was taught, who attended, craving and screen results). Regenerate `seed/extra/notes-corpus.json` (the 51 M.R. daily notes Aug 18 to Oct 29
  **and** the mirrored `_lauris_sessions` rows, same fields) with a deterministic generator script in `scripts/seed-gen/`: IOP groups (3 days a week, 3 hours, H0015),
  narratives that mention use, screens (negative Oct 1 and Oct 13, lapse Sept 27 and its follow-up), cravings 0 to 10, PHQ-9 trend, family sessions, and the
  intervention codes above. Keep the note count, ids and field names; keep boilerplate-repetition detection working (a few notes share a sentence, as the checks expect).
* **A3**: the platform shows ASAM where a person works. **Authorizations list**: a "Level of care" cell (`levelTag`) with the match state chip (`CHECK_LABEL`/`CHECK_TONE`),
  and a flag when reassessment is due/overdue or the request level is `over`/`under`; a filter for level and for "reassessment due". **Authorization case page**: a
  "Level of care" section computed from `profile()` (six dimension ratings with the clinician's note and the date, the `levelCheck` headline and detail, change
  since the last assessment, reassessment clock with its rule chip, plan). **Dashboard/roster and Patient chart**: level chip, ratings strip (D1 to D6), reassessment state, an
  ASAM tab/section on the chart showing the assessment history. **Notifications (bell)**: "Reassessment overdue", "Request level not supported by ratings", "Assessment since an incident".
  **Denial Intelligence list**: reason column shows the ASAM dimension(s) the payer's reason turns on (`reasonDims`), a column or filter for dimension. **Analytics**:
  denial patterns by ASAM dimension and by level-of-care state (from `denial_reasons` `dims`/`level`, and from the stored cases), outcomes by level. **FLO**: answers
  about level of care, reassessment due lists, which clients' ratings do not support their requested level, which dimension drives a denial, using the same functions.
  Role rules stay (direct support staff never see clinical text; follow the existing `can(...)` checks).

## Rules for everyone

* Read code before changing it; follow its conventions (pure selectors, `ui` kit, `esc()` for text, `ui.hint` for definitions, existing chips). Reuse `asam.js`.
* Run the suites that exercise your files, on **your own ports**, and write results outside the repo:
  `node test/run-all.mjs --only <suite,suite> --ports <PORT> --out /tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/res-<owner>`
  (ports: A1 4800, A2a 4810, A2b 4820, A3 4830, lead 4840). `unit` = `node --test test/draft.test.mjs`. Update tests whose assertions pinned **content that is intentionally gone**
  (for example "Physical aggression" counts); do not weaken a test that checks behavior. A suite you could not run or fix: say so in your report.
* No `git commit`, no `git add`, no rebuild of `hosted/`. The lead integrates, rebuilds and republishes.
* Report at the end, concisely: files changed, what is real logic vs seeded data, tests run and results, anything left inconsistent with the bible.

## Status (delivered)

* **Computed from the stored ratings, never stored:** the level a set of ratings fits, the match state (`match`, `over`, `under`), the dimensions that drive it, the reassessment clock, the change since the last assessment, incidents after the last assessment, the dimensions a payer's reason turns on, every Analytics aggregate, evidence gaps, weak points, and every draft sentence about a dimension.
* **Seeded and stored (synthetic, "Illustrative sample"):** `seed/extra/asam.json` (20 assessments), the requests' `asam_level`, the denial evidence rows and payer reasons in `disputes.json`, the M.R. group notes (`scripts/seed-gen/notes-gen.py`), client diagnoses, goals and referral content.
* **Not the ASAM text:** the per-level limits (rule `asam.level_limits`) are a simplified demo decision rule. Dimension and level names follow the 3rd edition (2013); a 4th edition exists.
* **Day-treatment manual rules** carried over from the earlier build are marked "Unverified demo assumption" for IOP.
* Regenerate seeds: `python3 scripts/seed-gen/asam-seed.py`, `disputes-seed.py`, `notes-gen.py`.
