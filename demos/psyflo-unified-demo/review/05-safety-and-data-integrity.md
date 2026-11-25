# 05 · Clinical safety, compliance and data integrity review (Agent E)

Reviewer role: healthcare technology safety and compliance. Date: 2026-11-11. Scope: the master (`demos/psyflo-unified-demo`, Nov 8) and the v3 reference (`demos/psyflo-tdt-v3-reference`). No code was edited.

## 0. Method, and how to read this

- **Master:** run on private ports 4750-4752 with a private data directory (stopped afterwards). Every finding marked *run* was reproduced through `POST /api/do`, the mock Lauris over HTTP, or Playwright (19 scripts, `e1`-`e19`, kept in my scratchpad, not in the repo). Findings marked *code* come from reading the file and line cited.
- **v3:** opened with Playwright and probed in the page (permissions, unit tiers, submit gate); everything else by reading `source/`.
- **Evidence:** Granola (`G-nnn`), Plaud (`P-nnn`, secondary only: the connector returned no recordings), team workspace (`T-nnn`, `U-1`..`U-17`). The Granola digest was present, so I did not re-read the meetings. Official regulatory text was **not** re-opened by me; "official" below means "per the Drive copies the evidence agent read (T-068 to T-075)".
- **Severity:** CRITICAL = a record or signature can be false or a disclosure can happen with no human involved. HIGH = a gate or claim a reviewer would rely on can be bypassed or is unsupported. MEDIUM = integrity or clarity risk. LOW = polish.
- **Tally (all sections, claims included): 83 findings: 7 CRITICAL, 27 HIGH, 41 MEDIUM, 8 LOW.**

### Top findings (details in the sections)

| # | Sev | Finding | Where |
|---|---|---|---|
| 1 | CRITICAL | The whole chain draft → processed → signed → sent → receipt runs from API calls alone. No login, no Lauris, no human. | GT-1 |
| 2 | CRITICAL | Psyflo's signed PDF and timeline say "signed by Jordan Perez, LPC" even when Lauris shows a direct-support user signed (or nobody did). | GT-2 |
| 3 | CRITICAL | Any dictation with words like basketball/walk/ran plus upset/mad receives a canned narrative with invented times, events and outcomes. Every check passes. | DI-1 |
| 4 | CRITICAL | Continued-stay, discharge and quarterly drafts are canned text with hard-coded evidence counts ("61 notes") that the store does not hold (M.R. has 1 note). | DI-4 |
| 5 | CRITICAL | M.R.'s waiting dictation was typed automatically into a different child's daily note because the panel falls back to matching initials. | WP-1 |
| 6 | CRITICAL | `GET /api/state` returns everything (Medicaid IDs, phones, tokens, the "staff-only" internal quarterly) to anyone, with reflected CORS; a cross-origin simple POST executes actions. | DS-1 |
| 7 | CRITICAL | Roles exist only in the browser (`localStorage`). The server enforces nothing; `by`/`staff`/`signer` are caller-supplied. | RB-1 |
| 8 | HIGH | Household context is pre-selected "Include" in the payer-facing continued-stay draft, against the product's own rule and Harvest's request. | DS-3 |

---

## 1. Documentation-integrity risks (a)

| ID | Sev | Finding and evidence | Recommended fix |
|---|---|---|---|
| DI-1 | CRITICAL | **Invented clinical detail.** `enhanceDictation` (`web/js/shared/draft.js:180-191`) fires on `/basketball\|walk\|movement\|shoot hoops\|ran/` plus `/upset\|frustrat\|mad\|angry\|melt/`. *Run:* "We played basketball at recess and he got upset and mad" and even "He ran laps and was frustrated with me" return a narrative with a 1:10-1:40 pm window (a hard-coded fallback when no timer block exists), "lost the game", "walked off the court", "co-regulation walk", "re-engaged after 6 minutes", "Solving peer conflict", mood "Frustrated → calm", progress "Partial – strategy used after prompt", and Objective 2. Chips claim "from your timer and what you said". All five checks PASS. | Remove keyword templates. Every sentence must come from a staff utterance, a timer block, or the ISP, with a resolvable source id. Anything else becomes a question ("How long? What did you do?") and a blank box labelled "Not stated" (v3's Scribe already does this). |
| DI-2 | HIGH | **Unsupported linking.** Generic path (`draft.js:200-207`) assigns "Objective 1" and the first goal's ISP interventions to any text. The `on task N of M` path adds "visual timer" and "prompted re-entry twice" that staff never said (*run*: "on task 12 of 30 in math" for a student with no goals). | Objective and intervention are chosen by the staffer from the ISP list; Psyflo may suggest, never insert. |
| DI-3 | HIGH | **"Observed" silently becomes "worked with"** (`draft.js:202`, test `test/draft.test.mjs:65` codifies it). *Run:* "I observed her at lunch and she sat alone" becomes "I worked with her at lunch…". That converts an observation into an intervention claim, the exact audit pattern Harvest fears (T-024). | Flag the word and ask what staff did. Never substitute verbs. Change the test to assert a question is raised. |
| DI-4 | CRITICAL | **Canned seeded drafts presented as sourced.** `draftSeeded` (`draft.js:276-366`) returns fixed text for `sra-continued`, `quarterly`, `discharge`, `isp`, `cna`, with only initials swapped (*run*: the D.W. and T.N. drafts contain M.R.'s story). Source lines say "Daily notes (21)", "Weekly calls (4)"; R-0411 says 61/12/3; the store holds **1** note for M.R. (`ExtCase.dc.html:153` hard-codes the counts). The discharge draft states "Guardian notified … by phone Nov 24 and in person Dec 5. Agrees with the plan" on Oct 29: future events written as completed facts. | Counts must be computed from stored notes with ids. Where evidence is missing, print "Evidence missing" (Part 17). Label every seeded sample "Illustrative sample" in the UI and keep it out of the live path. |
| DI-5 | HIGH | **Hard-coded SRA text.** `draftInitialSRA` (`draft.js:237-246`) fixes dates "10/27/2026 – 01/23/2027" (before the submission date), "2 office referrals and 1 day of ISS" regardless of facts, "no reduction in incidents", "Harvest will coordinate with the school counselor monthly" (a promise), and barriers text. `draftScreening` injects "School counseling weekly since Sep 2025 — ongoing" (`draft.js:135`) although the transcript never says it. The live preset's `request.dates` (Oct 30 start) disagrees with the drafted box. | Build each box from the record. Promises and plans are clinician-only boxes. Dates from the request object, one source. |
| DI-6 | HIGH | **Vacuous or decorative checks.** A non-scripted screening transcript yields 0 boxes yet "Nothing invented" and "Frequency, duration, intensity" show PASS (*run*). The sign-off panel always prints "2 of 3 criteria · level of care shown · dates within 30 days" (`panel.js:946`) and "Every box matches the draft you approved" though no approval event exists. | A check with no input is "Not applicable" or FAIL. Static ticks are removed; each check reads the form. |
| DI-7 | HIGH | **Drafting is regex over one scripted call** (`draft.js:55-87` match "grandmother", "Piedmont", "shoved a boy at lunch"). `seed/notes.md:77,261` still say "AI model" and "AI rewrite". | Label RULE-BASED / CANNED in the UI and notes (section 8). Do not demo it on an unscripted call. |
| DI-8 | MEDIUM | **Copy-forward and boilerplate.** Screening values are copied into the CNA ("copied from screening"), fine, but the "vary language" check compares only the first 60 characters of recent notes (`draft.js:214`); no cross-note boilerplate detection although Harvest asked for it (T-039). | Detect repeated sentences across the last 30 notes; show them to the author, never auto-rewrite. |
| DI-9 | MEDIUM | **Draft versus processed boundary is inferred, not recorded.** Psyflo learns "processed" from a flash banner on the page; `note.processed` can be created by API with arbitrary units (*run*: units 99 accepted). `lauris.observed` reports "saved (not processed)" even for an already processed session. | Processed state only from a bridge event bound to consumer #, session id and signer; one record per session; show "Draft / Saved / Processed in Lauris" on every note. |
| DI-10 | HIGH | **Units from time.** `unitsForDirectMinutes` (`dates.js:118`) gives 1 unit at 60 minutes; the official band starts at 120 (T-068). All timer blocks count as direct time, including lunch and transitions, which Chapter IV lists as non-reimbursable (T-070). v3 got the tiers right (`time.js:146`; *run*: 119 min = 0, 120 = 1). | Adopt v3's configurable tier rule; separate recorded, direct, documented and potentially billable time; require a staffer to mark each block as direct service. |
| DI-11 | MEDIUM | **Time corrections.** v3 `time.js:110` edits minutes with no audit row (only unit-rule changes are audited). Master has no correction path. | Keep original, corrected value, reason, actor, time. |

---

## 2. Retrospective editing (b)

Part 4.1 resolution: Mode A (current draft review) may edit, enhance and compare with version history; Mode B (historical evidence review) is read-only. The master has no Scan & Enhance (removed 7 Nov, G-093), so Mode B is partly absent and Mode A is not enforced anywhere.

| ID | Sev | Place where a processed or finalized record can change | Required resolution | Server-side enforcement |
|---|---|---|---|---|
| RE-1 | HIGH | **Mock Lauris:** `POST /consumers/:no/session/:form` with a processed `session_id` overwrites its values; `GET …?id=<processed>` renders the edit form (`server/lauris/store.js:102-125`, `site.js:264`). *Run:* narrative rewritten, status still "processed". Re-processing twice cut units 41 → 35 (double deduction). | Mode B: read-only. | The mock must return 409 for any write to a processed session, and process once. Psyflo records any saved/processed event against an already processed session as an **anomaly** and alerts. |
| RE-2 | HIGH | **Mock Lauris signing:** `sign` and `reject` have no status check (`store.js:126-127`). *Run:* a signed form was re-signed by another user (signer replaced) and rejected after signing. | Signed is final. | Status machine: processed → approved or rejected; nothing after. |
| RE-3 | HIGH | **v3 Scan & Enhance on processed notes:** "Save as addendum" for past DPNs, processed screening/intake/CNA, collateral and monthly notes (`76-enhance.js:754-777, 1374-1410`; Scribe push "becomes a dated addendum", `scribe.js:12`). It writes AI-enhanced text into Lauris with an audit row, but no policy validation. | Part 4.1: only an explicitly separate, policy-validated, attributable, dated, auditable workflow. Until Harvest or counsel validates addenda (G-093 unresolved), remove the button; show "Addendum workflow not enabled". | Feature flag `addendum.enabled=false`; server refuses writes to processed ids; if enabled, an addendum is a new linked record with reason, author, credential and timestamp. |
| RE-4 | HIGH | **Psyflo records altered silently:** `request.set` (`core.js:278`) patches any field with no event unless `what` is passed (*run*: stage and units changed, event count unchanged); `client.update` (`core.js:341`) rewrites diagnosis and Medicaid status; `request.infoReply` after sending replaces the object and **drops `sent_at`** (`core.js:253`, *run*); `consent.sign` re-sign overwrites the earlier signature record and file (`core.js:133`, *run*); `request.appealSign` can be repeated; `note.review` overwrites a prior decision. | Records of what was sent, signed or decided are immutable. | Remove generic patch actions. Each change is a typed action that appends a version; send/sign/decision records are write-once. |
| RE-5 | MEDIUM | **No version history** for Mode A drafts: `draft.save` replaces by key; `quarterly.internalSave` increments a counter but keeps only the latest text (`x-quarterly.js:17`); `screening.drafted` replaces the transcript and boxes of a processed screening. v3 has Original → AI Draft → Clinician Edited → Approved → Synchronized (`05-sync.js`) and a "changed by hand since sync" check (`scribe.js:20`). | Mode A: versions kept, compare, restore. | Append-only `draft_versions` table. |
| RE-6 | MEDIUM | **Fabricated "signed" artifacts:** `request.pdfCopy` (`x-requests.js:8-28`) creates a PDF reading "Signed in Lauris by Jordan Perez, LPC" for seeded requests that never had one. It carries a "Demo copy" line. | Never generate a signed artifact after the fact. | Open only stored proofs; otherwise show "Signed copy is in Lauris". |
| RE-7 | MEDIUM | **v3 admin can alter permissions and unit rules** that change units on already linked notes (`time.js:162` audits rules only; permission changes audit nothing, *run*). | Changes apply forward only. | Rules table with effective dates. |
| RE-8 | LOW | `demo.reset` is open to any caller and wipes the audit trail. | Presenter-only. | Disabled outside demo mode. |

Mode B read-only features the build must provide: historical notes shown unaltered with processed timestamps; boilerplate and missing-evidence flags stored **beside** the note, not in it; evidence index with dated quotes; "flag a gap for future notes" as a task, never as an edit. The master's "That didn't happen" flag (`note.review`) marks a processed note in Psyflo only; there is no correction path, which is acceptable until a policy exists.

---

## 3. Human review and signature gates (c)

Intended chain (BRIEF rules 3-4, Part 4.2): PsyFlo drafts → author reviews → **clinician approval (internal)** → Process Form in Lauris → **LMHP-type signs in Forms to Approve** → **a person presses Send** → receipt recorded.

| Gate | Master as built | Enforced where | v3 |
|---|---|---|---|
| Draft → review | Yellow boxes, source chips; typed only into the open form. DPN drop-in is **automatic** on page open (`panel.js:959`), while the README says it "types only when you press a button". | UI | Scribe review, "Approve" |
| Clinician approval (internal) | **Absent.** Harvest's lead approves every SRA by email (P-046, T-065). | none | Not modelled |
| Process Form | A person clicks in Lauris; Psyflo infers it from a banner (`lead-extension.js:49-50,80-86`; `bridge.js:159`). | page banner only | Simulated |
| Sign | Lauris mock lets **any** user sign (*run*, direct support). Psyflo then records the signature under a default name (GT-2). | none | Simulated, signer hard-coded in the Forms-to-Approve list |
| Send | `request.send` requires stage `signed` (*run*, PASS) but any caller and any `by`; also allowed from `submitted` (resend, *run*). | state check only | `S5.ready` blocks in the UI; `PSY.submit5.submit()` called directly submitted an unsigned request (*run*) and logged it as "J. Perez, LPC" |
| Receipt | Stub after 3 s; event actor "Sfax" (PS-3). | none | Deterministic fake reference `SFX-20261029-0416`, labelled Simulated |

| ID | Sev | Bypass or implied action | Evidence | Fix |
|---|---|---|---|---|
| GT-1 | CRITICAL | Full chain by API only: `request.ensure` → `lauris.observed{processed}` → `lauris.observed{signed}` → `request.send` → fax stub receipt. Timeline reads "Get Signature pressed in Lauris" by `jperez`. | *run* e2 | Server-side actor and capability checks; `processed/signed` accepted only from an authenticated bridge session bound to the Lauris user and consumer. |
| GT-2 | CRITICAL | **Signature attribution is a default.** `request.signed(…, signer = 'Jordan Perez, LPC')` (`core.js:170`) and the observed branch never passes the signer (`lead-extension.js:43`); unmatched users become `jperez` (`lead-extension.js:26`). *Run via the browser:* Lauris showed "signed by K. Hale" (direct support); Psyflo's PDF said "Electronically signed in Lauris by Jordan Perez, LPC", event actor `jperez`. | *run* e5 | Signer = the name and credential read from Lauris. If the user is not on the LMHP-type roster, mark "signature by non-licensed user: hold" and block Send. Never default. |
| GT-3 | HIGH | `request.signed` accepts any stage, including `draft_ready` (skips Process Form), and any signer string. | *run* e3 | Allowed transitions only. |
| GT-4 | HIGH | Stage forced with `request.set`; `request.demoReply` approves any request; `request.p2pLog` flips denied → active. | *run* e3 | Remove or admin-and-demo-flag; outcomes require a payer document reference. |
| GT-5 | HIGH | No internal approval gate; sign-off panel text "the draft you approved" implies one. | code | Add "Needs approval" stage and a recorded approver (T-065). |
| GT-6 | MEDIUM | Resend from `submitted` re-faxes and resets the clock. | *run* e18 | Resend is a distinct, reasoned action. |
| GT-7 | MEDIUM | Guardian appeal e-signature on a fax payer logs "faxed through Sfax" automatically (PS-1): the signature implies a send nobody pressed. | *run* e10 | Staff reviews the signed letter and presses Send. |
| GT-8 | MEDIUM | v3 gates are client-side; programmatic `submit5.submit` attributes the act to the signed-in clinician. | *run* v3a | Same server-side rule. |

---

## 4. Inappropriate disclosures (d)

What each surface can see today:

| Surface | Intended | Actual (run unless noted) |
|---|---|---|
| Guardian portal | One child, plain words, own letters | `#/ParentProgress?c=DW` opens any child with **no token**; `famCtx` defaults to T.W. (`ParentPortal.js:10-24`). Tokens (`ar-demo`, `tw-demo`, random) sit in the open state. Link "expires" (shown, `Referral.js:167`) is never enforced. |
| School portal | Own school's referrals, short updates | Filtered in the browser by `localStorage` user (`SchoolPortal.js:17,85`); `school.share` accepts any client id; the free text flows into daily notes (Harvest's open question on billing, NEXT-STEPS). |
| Payer-facing packet | Minimum necessary | See DS-3. |
| Extension | TDT only | PASS (*run*): "off" for an outpatient and a SEBS record. |

| ID | Sev | Finding | Fix |
|---|---|---|---|
| DS-1 | CRITICAL | `GET /api/state` (`server/index.js:38`) returns all 52 keys unauthenticated: Medicaid ID and DOB answers, guardian phones, diagnoses, incidents (a hospitalization), the staff-only internal quarterly (*run*: text retrieved), family-link tokens, file URLs. CORS reflects any origin (`util.js:290-300`); a `text/plain` cross-origin POST to `/api/do` executed (*run*). | Per-role, per-portal projections from the server; portals call token-scoped endpoints that return minimal DTOs; JSON-only content type, origin allow-list, CSRF token. |
| DS-2 | HIGH | Portal identity rests on `?c=` or a guessable URL; guardian screens fall back to another child's record. | Token required; no fallback child; expiry and revocation enforced; log every portal read. |
| DS-3 | HIGH | **Household disclosure defaults to Include.** `ExtCase.dc.html:150` (`conf: 'include'`) and `panel.js:843` (`: true`) put "The guardian reported a change in the household on Oct 16…" into the payer draft; BRIEF rule 10 and Playbook rule 10 say it stays out unless the clinician presses Include; Harvest's LPC called this her central worry (P-052). v3 holds it back and blocks sign-off until decided (`78-flow-continued.js:187-193`). | Default undecided; block "ready to sign" until a clinician chooses; generic wording only; log who decided. |
| DS-4 | MEDIUM | **Cross-service line.** The TDT Authorizations screen shows P.G.'s outpatient request R-0377 to clinician and admin (*run*); outpatient is also in the same state object. Harvest asked that outpatient and SEBS never enter a TDT request (T-040). | Service-line field on every record; TDT views and drafts filter by it on the server. |
| DS-5 | MEDIUM | Analytics shows a named child's PHQ-A/DSM series to any level ≥ 3, including admin (*run*), and by-locality bars are the totals multiplied by a fixed share (`Analytics.js:46-50`). No minimum group size. | Aggregate only unless a clinical role drills down; suppress cells below n=10 (configurable); label illustrative data. |
| DS-6 | MEDIUM | Signed consent PDFs, eligibility proofs and fax receipts are served from `/files/…` to anyone who knows the URL (listed in state). | Authenticated, role-checked download. |
| DS-7 | LOW | SMS stub text and full phone numbers are written to the shared audit list. | Mask in the audit view. |

---

## 5. Role permissions (e)

**Master (four staff personas, guardian, school).** Levels are cumulative (`registry.js:3`: direct 1 < supervisor 2 < clinician 3 < admin 4). *Run*, role by screen as the UI enforces it: direct support sees phone, Staff, ExtHome; supervisor adds Review queue; clinician adds Do next, Referrals, Eligibility, Authorizations, Submission, Partials, Info request, Early discharge, Peer brief, Playbook, Analytics; **admin sees all of these plus Users**, and in the Lauris panel admin gets the clinician's SRA drafts (*run*), against Part 16.

| ID | Sev | Finding | Fix |
|---|---|---|---|
| RB-1 | CRITICAL | No server enforcement. `session.user` is `localStorage.psyflo_user` (`app.js:13-17`); sign-in takes any seed id (Lauris login likewise). `user.update {role:'admin'}` on K. Hale succeeded (*run*). | Server sessions; actor taken from the session, never from `args.by`. |
| RB-2 | HIGH | Admin inherits clinical content (above). | Capability model (matrix below); `clinical_records` is its own grant, off for admin. |
| RB-3 | HIGH | **Fail-open defaults:** panel treats an unrecognised Lauris user as `jperez` (`panel.js:60-63`); the phone app turns any non-direct-support user into K. Hale (`MobileApp.js:9`, *run*); `request.send` uses `by: this.me?.id \|\| 'jperez'` (`Submission.js:78`). | Fail closed: unknown user = no access. |
| RB-4 | MEDIUM | Model too coarse for the evidence: site supervisors (QMHP) send packets, monitor the fax inbox and track units 2-3 h a week (P-039, P-059, T-044) but cannot open Authorizations. | Supervisor gets a unit-and-status tracker without clinical evidence. |
| RB-5 | MEDIUM | v3: admin can switch on `clinicalRecords` for itself with no audit row (*run*), and always keeps Settings. | Permission changes need a second person and an audit entry. |
| RB-6 | MEDIUM | Direct-support caseload is enforced by the panel message only; Lauris opens any student, `timer.start` and `dictation.save` accept any client (*run*). | Server-side caseload check. |
| RB-7 | MEDIUM | `note.review` lets the author review their own note (*run*); the assigned reviewer is not enforced. | Reviewer ≠ author, reviewer must be assigned or a supervisor. |

**Least-privilege matrix the build must enforce (server-side).** Y = allowed, A = own caseload, D = designated by admin and logged, N = never.

| Capability | Direct support | Site supervisor | Clinician (LMHP-type) | Administrator | Guardian | School user |
|---|---|---|---|---|---|---|
| Daily, weekly, monthly notes and timer (own caseload) | A | N | Y | N | N | N |
| Review trainee notes (not own) | N | Y | Y | N | N | N |
| View clinical note text | A | A (reviewees) | Y | **N** (own grant) | N | N |
| Unit balance and authorization status (no evidence text) | A | Y | Y | Y | N | N |
| Screening, CNA, ISP, SRA drafts | N | N | Y | N | N | N |
| Internal approval of SRA | N | D | D | N | N | N |
| Sign in Lauris (credential check) | N | N | Y (LMHP roster) | N | N | N |
| Press Send, log receipt call | N | D | Y | D | N | N |
| Info reply, peer-to-peer, accept or decline a partial | N | N | Y | N | N | N |
| Record payer decision (with document reference) | N | D | Y | D | N | N |
| Eligibility lookup and record | N | D | Y | D | N | N |
| Analytics, aggregate | N | A (site) | Y | Y | N | N |
| Analytics drill-down to a child | N | N | Y (own caseload) | N | N | N |
| Users, roles, rules, settings | N | N | N | Y (two-person for clinical grants) | N | N |
| Own child's plain-language progress and letters | N | N | N | N | Y (token) | N |
| Sign consent (mode per document) | N | N | N | N | Y | N |
| Appeal letter review and signature | N | N | prepare | N | Y | N |
| Referral, status of own referrals, short update | N | N | N | N | N | Y (own school) |
| Demo controls (reply, advance day, reset) | N | N | N | Presenter mode only | N | N |

---

## 6. Payer submission controls (f)

Good: no credentials, passwords or stored sessions exist anywhere in the master (grep and code); portal mocks are labelled "signed in with the clinician's own login"; the bridge never clicks Process Form, Get Signature or Send (`bridge.js:2-4`); Send for fax payers needs stage `signed`. v3 stores no credentials either, and its settings page says two-factor and password change are simulated.

| ID | Sev | Finding | Evidence | Fix |
|---|---|---|---|---|
| PS-1 | HIGH | **Sends implied but not performed.** `request.overdueNotice` ("Send the notice", `Submission.js:96`) logs "Overdue notice sent" and the history says "through Sfax"; no fax, reference or receipt exists. `request.infoSend` by fax logs "Reply faxed through Sfax · decision clock restarts" instantly. `request.appealSign` logs "faxed through Sfax" the moment a guardian signs. | *run* e10 | An event says "sent" only after the Send action ran the stub and returned a reference; otherwise "Drafted" or "Ready to send". |
| PS-2 | HIGH | `portal.observed` with no request id attaches to **any** request in `portal_open` and accepts a made-up reference (`lead-extension.js:115-121`): "Upload confirmed … (read by the extension)" with no portal visit. | *run* e17 | Match on request id and member id on the page; reject unknown references; mark manual entry as "entered by <person>". |
| PS-3 | MEDIUM | Receipts and events carry actor "Sfax", indistinguishable from a real provider. v3 shows "Psyflo agent (simulated)" as actor for submissions (`01-core.js:98`, `08-history.js:437`), which reads as autonomous submission. | code | Actor is the person who pressed Send; add a visible "Simulated" chip on every integration event (v3's chip is the model). |
| PS-4 | MEDIUM | Autonomy language still circulates: G-069 and G-074 told Harvest PsyFlo "can submit automatically" and "auto-submits" appeals; `seed/notes.md:215` says replies are "read by OCR". Neither exists. | docs | Roadmap chip; do not present in the demo path. |
| PS-5 | LOW | The DMAS mock answers "Active" for any non-empty ID (`server/external/site.js`), banner says Demo. | code | Keep banner; return "Inactive" for a seed test ID so the inactive path can be demonstrated. |
| PS-6 | MEDIUM | `incident.filePortal` marks a Level 2 state filing complete with one call (`core.js:348`) and no confirmation reference. | *run* e18 | Record the portal's reference; show "Filed by <person>, ref …". |

---

## 7. Unsupported or uncertain regulatory claims (g)

"Status": OFFICIAL = in a DMAS or state text read by the evidence agent; HARVEST = reported by staff; SECONDARY = PsyFlo-written compilation; none = no source found. Proposed wording is neutral and sits behind a rule row with its source (see `05c-rules-register.md`). U-15 (grant-bought EHR, about 130 staff) and U-17 (statewide TDT decline) do not appear in either code base or the seed.

| U | Sev | Displayed wording and where | Status | Proposed neutral wording or treatment |
|---|---|---|---|---|
| U-1 | MEDIUM | "Plan due 24 hours from the intake" (v3 `67-cna-isp.js:127`); "within 24 h of the intake" (`seed/notes.md:175`) | HARVEST. Chapter IV: ISP within 30 calendar days of starting services. | "Harvest target: 24 hours (internal). DMAS: 30 days from start of services." Both shown. |
| U-2 | HIGH | "one hour" daily minimum (docs); code gives a unit from 60 minutes (`dates.js:118`) | HARVEST vs OFFICIAL 2 hours with 2 activities | Rule row `tdt_min_daily_minutes=120`, OFFICIAL. |
| U-3 | MEDIUM | "Daily notes due within 24 h" (`StaffDashboard.js:2,236,246`, `StaffDashboard.dc.html:104`) | none (T-072); Harvest asks for it as a KPI | "Harvest completion target: 24 h" with source tag. |
| U-4 | HIGH | "30 days after … · DMAS rule" (`EarlyDischarge.js:46`); v3 `20-case-data.js:395` | Lapse rule is 31 days (OFFICIAL). No source for a 30-day gap before a new initial. | "Earliest new initial: set by clinician; Harvest practice 30 days (unverified)". Remove "DMAS rule". |
| U-5 | MEDIUM | "30-day limit" on the initial SRA (`model.js:36`, `panel.js:947`) | HARVEST only; clock start inconsistent (CK-5) | Configurable start event; label "Harvest practice". |
| U-6 | MEDIUM | "7-day standard" / "7-calendar-day decision clock" (`Submission.js:30,38,90`, `core.js:195`) | SECONDARY (federal rule cited by v3); Harvest believes 14 days (P-058) | Chip "Day N"; "Payer due date: 7 days (unverified for this payer)"; red only after the configured date. |
| U-7 | MEDIUM | "24-hour clock" for information requests (`core.js:234`, `model.js:50`); shown to families as "Harvest answers within 24 hours" (`ParentPortal.js:152,176`) | HARVEST / payer-stated per request | Use the due time the payer's message states; drop the family promise. |
| U-8 | MEDIUM | "14 business days before the end date" (`Authorizations.js:99`, BRIEF) | SECONDARY, payer unnamed | Rule row, default off. Seed `renew_by` for R-0411 equals the end date, contradicting it. |
| U-9 | MEDIUM | "Weekly re-check" with screenshot (`core.js:108`, `Eligibility.js`) | HARVEST relay of one payer's auditor | "Re-check every N days (Harvest-chosen)"; N configurable, default none. |
| U-10 | HIGH | Remote finger signature on consent and release (`consent.sign`, `ParentEnroll.js`) while Harvest's practice is in person (P-016) | OPEN (T-007); the SRA forms accept electronic signature | Per-document signature mode; "not validated as sufficient" until answered. |
| U-11 | LOW | "credentials and NPI" on both forms (v3 `74-lauris-forms.js:113`) | Initial form only | Field list per form, taken from the form. |
| U-12 | HIGH | "Only a parent or guardian can appeal" (`ParentLetters.js:14,22` EN/ES; `seed/notes.md:515`; v3 risk "Only the guardian can file") | OPEN; v3's own rule row says federal rules also allow a provider with written consent | "A parent or guardian can appeal. Ask Harvest who else can." |
| U-13 | MEDIUM | Payer channels incl. FFS by fax (`seed.json` payers) | SECONDARY says FFS portal-only | Channel rows carry source and verified-on; v3's `observed/unverified` tags are the model. |
| U-14 | HIGH | Payer table, 146 decisions, 57 % partial, 312 unpaid hours, "Harvest's Lauris export · Oct 29 + master tracker" (`Analytics.js:42-44,65`; `PayerPlaybook.js:31`) | Harvest never computed these (T-045, T-067) | "Illustrative cohort" banner; separate from case-backed counts. |
| U-16 | LOW | "150 units ≈ 13 weeks" (BRIEF:107); v3 "8 of 13 weeks at 3 a day" | none; 150 / 3 per day = 10 weeks | Compute from a per-student rate and school calendar. |
| extra | MEDIUM | "60-day appeal window" counted from the denial date or today (`core.js:235`, `x-requests-history.js:72`) | Federal rule cited by v3 counts from the notice date | Store the notice date: "60 days from the notice (confirm on the letter)". |
| extra | MEDIUM | "nothing is sent on its own" shown to guardians (`ParentEnroll.js:40`) | Contradicted by PS-1 | Reword after PS-1 is fixed. |

---

## 8. Simulated versus real boundary (h)

| Capability | Master (true status) | v3 (true status) | How the UI should label it |
|---|---|---|---|
| Speech to text | REAL in Chrome via the Web Speech API, which on Chrome sends audio to the vendor's servers (documented browser behavior; not tested here); scripted transcript otherwise | SIMULATED transcript stream | "Browser speech recognition. Audio may leave this device. Synthetic data only." (HIGH if pilot data is real: no BAA, T-060, T-061) |
| AI drafting and enhancement | RULE-BASED regex plus CANNED templates; no model (`draft.js:7-8`); notes say "AI" | CANNED, "Reply drafted by Psyflo AI" in history is theatre | "Template draft (no AI)"; maturity chip |
| Sfax | STUB: reference and receipt after 3 s | SIMULATED, deterministic reference | "Simulated Sfax" chip on every event |
| SMS, email | STUB (events only) | not modelled | "Text not sent (demo)" |
| DMAS eligibility lookup | MOCK page always "Active"; a person records the result; PDF is a stand-in | SIMULATED background check | "Simulated lookup" |
| Payer portals (Availity, UHC) | MOCK pages, confirmation read by the bridge | SIMULATED, confirmation generated | "Mock portal" |
| Lauris | MOCK site; page bridge, no API; mock does not enforce credentials or immutability | SIMULATED Lauris in the page | "Mock Lauris", never "integration" (G-085) |
| PDF | REAL (`server/pdf.js`) but content is Psyflo's own render | simulated download | "Generated by Psyflo, not the Lauris form" |
| E-signature (guardian) | REAL finger capture into a PDF; no identity check | not modelled | per-document mode and "not validated as legally sufficient" |
| E-signature (clinician) | None in Psyflo; Lauris mock stamps a name | simulated | "Signed in Lauris by <name, credential>" only when observed |
| Calendar | STUB (clinician open times) | not modelled | "Stand-in for calendars" |
| Analytics numbers | SEEDED, illustrative; presented as Harvest data | ILLUSTRATIVE cohort, labelled | "Illustrative" until case-backed |
| Eligibility cadence, deadlines, unit bands | DEMO ASSUMPTIONS | mix, with `observed/unverified` tags | rule source chip |

---

## 9. Demo-clock and date hazards (i)

All reproduced (*run* e8, e9, e16). The master has one clock (`state.today`, `now()` uses wall-clock hours on the story date, `store.js:203`), which is the right idea; the arithmetic around it is not consistent.

| ID | Sev | Hazard | Result |
|---|---|---|---|
| CK-1 | MEDIUM | **Unit exhaustion versus early discharge.** D.W. (110 units, 3 a day from Oct 29): Early discharge screen says run-out Dec 18, discharge Dec 18, intake Dec 21, earliest new initial Nov 28 (a Saturday) and "Gap 0 days"; the Lauris discharge panel says "Then Dec 8"; the discharge draft hard-codes 12/05. No holiday calendar (Thanksgiving, winter break). T.N.: used 65 of 65 today but `exhausted` is Nov 24 (`seed`). M.R.: 27 units = 9 school days, so units end about Nov 10, three school days before the Nov 13 end date, and the draft request starts Nov 16. | Derive run-out from per-student daily rate and a school calendar; show the assumption; one date source. |
| CK-2 | MEDIUM | **Submission versus decision.** Decision due = send + 7 calendar days (`core.js:195`); the drafted R-0416 box reads "10/27/2026 – 01/23/2027", which is before the live-preset send date (Oct 29) and disagrees with `request.dates` (Oct 30 start, `core.js:157`); receipt check is day 5 for Humana (`core.js:196`, `Submission.js:52`) but Harvest calls on day 10 (P-057, v3 `day10`). Information-request due is "24 clock hours" so a Friday request is due Saturday. | Per-payer rules; business versus calendar stated; one receipt-check rule. |
| CK-3 | MEDIUM | **Silent clock fudge.** For a request made on an earlier day, the 24-hour clock is pinned to 08:40 of "today" (`model.js:50`): K.T. shows "9 h left of 24" at any wall-clock time. After three "advance a day" clicks it shows "0 h left of 24" and never becomes missed; D.W.'s "reply by Oct 30" stays yellow. Part 15.5 forbids silently manipulating dates. | Show elapsed versus due; add a "missed" state. |
| CK-4 | MEDIUM | **Appeal window.** E.C. denied Oct 22: 60 days is Dec 21; the seed's `appeal_days_left: 51` from Oct 29 is Dec 19 (`model.js:141` anchors `'2026-10-29'`). v3 says Dec 21. | Store notice date and compute. |
| CK-5 | MEDIUM | **30-day send clock starts in three places:** consent signed (`core.js:158`), screening processed (`lead-extension.js:58,75`, stamped with `state.today`, so in the live preset it starts Oct 29, not Oct 16), and Harvest's "intake" (P-053). | One configured start event. |
| CK-6 | LOW | **Weekday labels:** "Fri Oct 31" is a Saturday (`seed.json:92`, README, storyboard), "Mon Oct 20" is a Tuesday (storyboard:110), "Tue Dec 9" is a Wednesday (README, storyboard:322). 6 mismatches total (*run* scan). | Generate labels from dates. |
| CK-7 | MEDIUM | **Historical prior-service dates:** the call says "last spring" while the output says Mar-Jun 2025; "School counseling weekly since Sep 2025" is injected while the interventionist is "Sep 2026" (`draft.js:135,241`). The 30-day recency check cannot see year mix-ups. | Dates come from the transcript; flag year-ambiguous phrases. |
| CK-8 | LOW | `demo.advanceDay` lands on Saturday and Sunday and flips requests overdue over a weekend. | Skip non-school days unless chosen. |

---

## 10. Wrong-patient protection on mobile and extension (j)

**What exists:** Harvest-number match comes first (`panel.js:64-68`); header shows initials and school; extension is off for outpatient and SEBS (*run*); direct support sees a "not on your caseload" message; dictations and assessments are keyed to the chosen client and drop only when that client's form is open; the phone shows chips for the caseload and "ready when you open X in Lauris"; Process Form, Get Signature and Send are never clicked by the tool.

| ID | Sev | Missing or broken | Fix |
|---|---|---|---|
| WP-1 | CRITICAL | `clientForPage` falls back to **initials** when the Harvest number does not match (`panel.js:67`, `lead-extension.js:15`). *Run:* record #9001 "M.R." received M.R.'s waiting dictation, typed automatically ("Narrative … Addresses ISP Objective 1…"), with the panel header showing only "M.R.". | Match on Harvest # only; mismatch is a hard stop with an identity card (initials, Harvest #, school, birth year) the user must confirm before any fill. |
| WP-2 | HIGH | `phoneUser` silently turns a clinician, supervisor or admin into K. Hale (`MobileApp.js:9`, *run*): timer, dictations and notes attributed to K. Hale. | Sign in as the real user or block. |
| WP-3 | HIGH | `MobileDictate?client=DW` opens another caseload's student under K. Hale's name (*run*); `client()` falls back to the first student or M.R. (`MobileDictate.js:21`). | Server-side caseload check; no fallback client. |
| WP-4 | MEDIUM | Automatic fill on page open (`panel.js:959-980`) removes the human check at the moment it matters. | Fill only after the identity card is confirmed. |
| WP-5 | MEDIUM | Initials are not unique identifiers; no second identifier appears on the phone, in the dictation review, or in the timer. | Show initials plus Harvest # on every review screen. |
| WP-6 | MEDIUM | `portal.observed` can attach a confirmation to the wrong request (PS-2); `lauris.observed` attributes unknown users to `jperez`. | Reject, do not default. |

---

## 11. Recording consent (k)

| ID | Sev | Finding | Fix |
|---|---|---|---|
| RC-1 | MEDIUM | Screening banner prints "consent read" whenever recording runs (`panel.js:385`); nothing records that consent was given, by whom, or refused. The intake banner shows "consent signed" if the client has any consent record (`panel.js:766`). The consent-for-services text says Harvest "may record the first conversation" (`ParentPortal.js:48`), but the story's screening (Oct 16) precedes the consent signature (Oct 19). | Per-session consent record (who spoke, when, how). Recording start disabled until recorded; refusal path = typing. |
| RC-2 | HIGH | Speech vendor: see section 8. PsyFlo's own rule (T-060) bans recording clinic calls in tools without a BAA. | Pilot uses a BAA-covered engine or typed notes; show where audio goes. |
| RC-3 | MEDIUM | Peer-to-peer: consent is a checkbox; `typed: true` bypasses it and accepted a pasted transcript with `consent:false` (*run*). Harvest's own question (NEXT-STEPS: "is it allowed, and with whose consent?") is unanswered; I found it in no Granola item. | Record each participant's agreement; typed notes may not hold a transcript; legal review before enabling. |
| RC-4 | MEDIUM | v3 Scribe starts recording on page open (`scribe.js:390`, `?scribe=1`) with no consent step; consent exists only inside the scripted transcript text. | No auto-start. |
| RC-5 | LOW | Mobile promises ("runs with the screen locked", `MobileApp.js:59`) are untested (Part 10). | Remove claim until tested on the target device. |

---

## 12. Server-side invariants the build must hold

1. **Identity:** server sessions; the actor comes from the session. `args.by`, `staff`, `signer`, `who` are ignored.
2. **Capabilities** from the matrix in section 5; unknown user = deny.
3. **State machine** for requests, notes and consents; transitions listed once; `processed`, `signed`, `submitted` accept only a bridge event carrying consumer #, session id and the Lauris user, plus the signer's credential check.
4. **Write-once records:** processed notes, signatures, sends and decisions; changes append versions with reason.
5. **Evidence rule:** a draft box saves only if each source id resolves to a stored record; counts are computed; otherwise "Evidence missing".
6. **Rules table** with source, status, verified-on (see 05c); the UI shows the chip.
7. **Disclosure projections** per role and portal; service-line filter; household disclosure undecided by default.
8. **Audit:** server timestamps, actor, append-only; demo-simulated events carry `simulated:true` and a chip.
9. **Wrong-patient:** Harvest # match, identity card, hard stop.

## 13. What I could not verify

- Official texts, CMS-0057-F and 42 CFR 438.402: not re-opened; I relied on the evidence digest and v3's citations.
- Real Lauris behavior (editing, signing, permissions) and its AI feature: unknown; the mock is ours.
- Chrome's speech-recognition data path: from documented behavior, not tested.
- v3 beyond the probes: I did not click through its flows or confirm every addendum path on screen.
- Plaud originals and the Harvest answer on in-person signatures (P-017).

## 14. Decisions I want the lead to confirm

1. **Server-side authority, even in the demo:** accept section 12 (sessions, capability matrix, state machine, signer from Lauris) and the matrix in section 5, including that **admin has no clinical-record access by default** and that site supervisors can send and track units.
2. **No canned clinical content in the live path:** confirm that seeded drafts (continued stay, discharge, quarterly) are relabelled "Illustrative sample" or rebuilt from stored notes, and that missing evidence prints "Evidence missing" instead of a sentence.
3. **No addendum or late-entry feature until Harvest or counsel validates it:** confirm v3's "Save as addendum" is dropped, Mode B is read-only, and that guardian signature mode, recording consent and peer-to-peer recording stay off or configurable until answered.
