# Round 8 spec: three-button extension, two-tab platform, role views

Source: the Granola transcript "demo feedback" (Nov 1, 2026, about 18 minutes). Shravan and a teammate review the current demo after the Harvest visit. Harvest's lead reacted most strongly to the extension ("she stood up… this is genius") and much less to the platform. The teammate's point: the extension is the product; the platform is only for licensed staff, mostly for tracking authorizations, handling denials and analytics.

Work dir `$T=/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/tdt-v2`. Read `PLAN5.md` for the architecture and `BRIEF6.md` for the copy rules (still in force).

## 1. The transcript, broken into parts

| # | What was said (paraphrased) | What it means for the demo |
|---|---|---|
| P1 | Frontline staff (direct support staff, DSS) only need to record notes and track time/units. The extension shows them too much. Their EHR may stop them from even seeing admission screenings, so Psyflo must not show them that data either. | Role-based views. DSS see only Scribe and Track time. No authorization, payer or admission data for DSS. |
| P2 | Three buttons: **Scribe**, **Track time**, **Scan & Enhance**. DSS see the first two; licensed clinical staff (LCS) also see Scan & Enhance. Permission levels like the RPM product: direct support staff, licensed clinical staff, admin. "You add more tabs as more permissions." A switcher like RPM's ("click down here, click patient, click provider"). | `PSY.role` with three roles + a "View as" switcher (platform user card, extension header, presenter menu). Admin can turn features on/off per role in Settings. |
| P3 | Scribe opens a dropdown: is this an **Admission Screening**, an **Intake**, a **DPN**, a **Collateral** contact or a **Monthly**? The type tells Psyflo which fields to capture and what to put in the EHR. For an admission interview they keep Scribe on the whole time and Psyflo fills the EHR. For a DPN, Psyflo scribes, enhances the note and puts it in that consumer's chart. | Scribe = type dropdown + consumer, then record. Output depends on type. |
| P4 | The enhanced note must be **editable in the extension**, then **saved**. No copy-paste: if they copy and edit in Lauris, Lauris and Psyflo hold two different versions. "How do we make sure the final note is always the last thing entered into the EHR?" Click a button and it populates Lauris. They will be trained to edit in the extension. | Editor inside the extension + "Save to Lauris" (push). No Copy button on notes. Show that the Lauris copy matches the last saved version. |
| P5 | "These two tabs [Notes, Time] should be a dropdown. We don't need two tabs." The Review tab (recommendations on the PA form) goes away: "I would not even have any of this. I would just have scribe, track, and scan and enhance." | No tabs in the extension. One dropdown switches the list below the buttons. Review tab removed; its job moves to Scan & Enhance. |
| P6 | Scan & Enhance works on **any document**: a DPN, a prior authorization, a concurrent review. Open a DPN written six months ago, click the button, get an enhanced version. For a PA it reuses the admission and intake data Psyflo already has. It runs in the **sidebar** while they keep working in Lauris. Edit in the extension, then **save and push** into the form, or **save and copy**. Lauris forms auto-populate between fields, so keep their own form process. | `PSY.enhance`: on DPN (today's and past), DMAS initial (PA), DMAS continued stay (concurrent review), and the clinical forms. Editable result; "Save & push to form" (primary) and "Save & copy" (PA only). |
| P7 | For a PA there is one more button, **Submit**: Psyflo saves the PDF that is on screen and agents log in and submit the form with the medical information, then track it. | "Submit" after the clinician signs in Lauris. Simulated submission (Simulated chip). Status then shows in the extension and in Authorizations. |
| P8 | Platform: EMR Connect and the payer logic workflow are gone (Rohit handles them in the back end; the extension scans Lauris). **New Cases** goes too: referral, admission and intake live in Lauris and the extension. Keeping it duplicates the EHR ("do I look in our EHR or in Psyflo for a new patient?"). Show a **mini version of case status in the extension**. **Overview** is just a summary of authorizations and denials: "just call it Authorizations" and filter by denials, partial denials, active. The denial workflow stays: generate a peer-to-peer script or the additional documentation the payer asked for. | Platform nav = **Authorizations** + **Analytics** (Settings and Help stay as small links). Overview's attention list and Denial Intelligence fold into Authorizations (filters + the case pages). New Cases page removed; its pipeline becomes the extension's Cases view. |
| P9 | Analytics: the CEO wants more data, e.g. "search for substance use" across consumers, for grants. An agent signs in to Lauris with Psyflo credentials, pulls the matching records, saves them to Psyflo, and in about 3–4 minutes produces a report they can download as a PDF. A chat would be ideal but is hard to build now. | Analytics keeps its charts and filters and gains "Request a report" (a chat-like ask box with an agent run, progress steps, a report and a simulated PDF). |
| P10 | Two tabs + three buttons is easy to explain. Licensed staff may open the platform only weekly; Psyflo sends renewal reminders and analytics by email. In bigger organizations LCS see only their own consumers, may not see analytics or denials. | Weekly email setting. Role scoping (own caseload vs all). |

## 2. Decisions and assumptions (state them in the final summary)
- Default role: **Licensed clinical staff** (Jordan Perez, LPC). DSS persona: **Devon Hale, Direct Support Staff** (fictional). Admin: **Maria Wood, Program Director** (already in the data).
- DSS: extension only. Scribe types **DPN, Collateral, Monthly** (no Admission Screening or Intake: P1). Track time. No Cases view, no alerts, no payer or authorization data, no "Open Psyflo platform". If a DSS opens the platform tab it shows a one-line "No access" page.
- LCS: extension with all three buttons, all five Scribe types, Cases view; platform **Authorizations + Analytics** (Harvest is small; admin can turn Analytics or denials off for LCS in Settings).
- Admin: everything, plus Settings (rates, family link, **Roles** matrix, weekly email).
- Psyflo never signs. Submit is enabled only after the clinician signs the form in Lauris (Forms to Approve). Submission and the agent steps are simulated (Simulated chip). No invented payer rules, deadlines, rates, probabilities or clinical findings; enhanced text uses only what is in the record or what was said, with citations.
- Old note enhancement saves as an **addendum** (a six-month-old note is not overwritten).
- Focus mode (the wide review workspace) is retired. The 9-step initial/continued review lives on as Scan & Enhance in the sidebar; payer decisions (partial, denied, info request) are handled in the platform's Authorizations case pages.
- Copy rules from Round 7 still hold: Lauris wording (consumer, session), no explanatory sentences, toasts ≤ 6 words.

## 3. Roles API (foundation, in `src/shell.js`)
```
PSY.ROLES = { dss:{label,short,name,cred,ini}, lcs:{…}, admin:{…} }
PSY.role()            → 'dss' | 'lcs' | 'admin'   (PSY.state.role, default 'lcs')
PSY.setRole(r)        → saves, re-renders the active tab, toast "Viewing as …"
PSY.can(feature)      → boolean. features: platform, auth, denials, analytics, settings, enhance, cases, allConsumers,
                        'scribe:admission', 'scribe:intake', 'scribe:dpn', 'scribe:collateral', 'scribe:monthly', time
                        defaults in PSY.PERMS[role]; admin overrides in PSY.state.perms[role][feature] (Settings → Roles)
PSY.user()            → the current role's person (name, short, cred, ini); PSY.lauris.user follows it
act 'role-menu'       → modal "View as" with the three roles; act 'role-set' data-role=…
```

## 4. Extension (foundation skeleton in `src/shell.js`; agents fill it)
```
┌ header: logo · "Reading this Lauris page" + context · [role chip ▾] · [–] ┐
│ [Scribe] [Track time] [Scan & Enhance]       (3 buttons, icon over label; DSS: 2)   │
│ WORK area  (data-psy="work")  — shown instead of the list while a Scribe or         │
│            Scan & Enhance session is open on this page; has its own Close            │
│ LIST area  (data-psy="xp-list"): <select data-psy="xp-view"> Cases | Notes | Time    │
│            panes: data-pane="cases" | "notes" | "time"   (DSS: Notes | Time only)    │
└ footer: Ready/Listening · Open Psyflo platform ↗ (not for DSS) ┘
```
- `PSY.ext.view()` / `PSY.ext.setView(k)`; `PSY.ext.tab(k)` stays as an alias (status→cases, review→opens Scan & Enhance if available).
- Work providers: `PSY.ext.work.register(key, { html(o) → '' | html })`; first non-empty wins; `PSY.ext.work.paint()` repaints the work area in place (no full re-render, so Lauris form inputs keep their values). Scribe registers `scribe`, Scan & Enhance registers `enhance`.
- Pill (collapsed): "psyflo ✓ | N actions" for LCS/admin; DSS: "psyflo ✓" (+ running timer).

## 5. Areas and acceptance criteria

### A · Scribe (owner A)
1. Scribe button → a small chooser **inside the panel's work area** (not a modal): Note type (radio list or select: Admission Screening, Intake, DPN, Collateral, Monthly — filtered by `PSY.can('scribe:<type>')`) and Consumer (preselected from the page). On a page whose form matches a type, that type is preselected and Start is one tap. Start → the page for that type (`lauris-screening`, `lauris-cna` intake, `lauris-dpn`, Add Session with session type Collateral / Monthly) with recording on.
2. Recording: live transcript in the work area (existing behaviour), Stop.
3. Output, in the work area:
   - DPN / Collateral / Monthly: **Enhanced note** in an editable textarea (labelled AI Draft until saved; Clinician Reviewed after the user edits/saves), with "Save to Lauris" (primary). Save writes the text into the Lauris note on screen (and the Saved Session list), records an audit entry, and shows "Saved to Lauris · 10:42" and a "Matches Lauris" check. Editing after a save shows "Not saved" until saved again. **No Copy button.** "Show transcript" toggle stays.
   - Admission Screening / Intake: **Captured fields** grouped by section, each editable (input/textarea), required-but-empty items listed as "Left for you"; "Save to Lauris" fills the Lauris form boxes (amber "typed by Psyflo"), then the clinician processes the form in Lauris as today.
4. Collateral and Monthly: Lauris Add Session supports session types "Collateral Contact" and "Monthly Summary" (fictional scripted conversations: a call with the guardian or a teacher; the clinician's monthly summary). Initials only, generic family details.
5. Past notes: Saved Session (or the consumer file) lists a few older DPNs, one from about six months ago (e.g. 05/12/2026). Route `lauris-dpn?c=<id>&past=<yyyy-mm-dd>` shows that saved note read-only. Expose `PSY.dpn.text(root)` and `PSY.dpn.push(root, text, {addendum})` so Scan & Enhance can read and write the note on screen.
6. Retire the DMAS-form Scribe from the chooser (PA work is Scan & Enhance). ISP is not a Scribe type.
Owns: `src/scribe.js`, `src/lf-kit.js`, `src/screens/65-forms-util.js`, `66-screening.js`, `67-cna-isp.js`, `68-dpn.js`, `69-intake-data.js`, `69-intake-form.js`, `62-lauris-admin-pages.js`, `75-dmas-scribe.js`. Tests: `story2`, `story3`, `l1b-click`, new `r8-scribe`.

### B · Scan & Enhance (owner B)
1. Button visible when `PSY.can('enhance')`. On a page with no document: the work area says "Open a note or form" (≤ 5 words) with links to the consumer's notes/forms.
2. On a document page it scans (short "Scanning…" state listing what it reads, e.g. "DPN 10/29 · ISP · Intake", 1–2 s) and shows an editable result in the work area:
   - **DPN (today's or past)**: enhanced note (editable), "What changed" chips (e.g. "Linked to ISP goal 2", "Response to intervention"), citations to the record. "Save to Lauris" (today's) / "Save as addendum" (past). Uses `PSY.dpn.text/push` from A.
   - **DMAS initial (PA)** and **DMAS continued stay (concurrent review)**: "Requirements addressed X of Y" + one card per section to improve: editable draft text, provenance label (Verified EHR Data / AI Draft / Clinician Input Required), citations. Per section "Push to form"; overall "Save & push all" (primary) and "Save & copy" (secondary). Clinician Input Required items get a textarea and are never drafted by Psyflo. After everything is pushed: "Process Form in Lauris", then the clinician signs in Forms to Approve; then **Submit** appears (Simulated chip): "Saved the form PDF · Submitted via <channel> · Tracking" → the case status becomes Submitted/Pending payer (use `PSY.submit5` / `PSY.auth.set`). Why-disabled: "Sign in Lauris first".
   - **Admission Screening / Intake / CNA / ISP**: the recommendations that used to be in the Review tab, as editable items with "Push to form".
3. Remove the Review tab content paths and the focus-mode entry points (`r5-focus` initial/continued) — route them to the Lauris form with Scan & Enhance open (`PSY.enhance.open(route)`).
Owns: new `src/screens/76-enhance.js`, `src/reco.js`, `30-reco-data.js`, `70-l2-util.js`, `70-l2-content.js`, `71-dmas-form.js`, `72-dmas-reco-panel.js`, `73-lauris-auths.js`, `74-lauris-forms.js`, `77-flow-initial.js`, `78-flow-continued.js`. Tests: `l2-click`, `f1-click`, `f2-click`, `story`, `r5-initial`, `r5-continued` (convert or retire), new `r8-enhance`.

### C · Extension list views, alerts, Lauris roles, presenter (owner C)
1. **Cases** view (LCS/admin): the mini case status that replaces New Cases + the old Status tab. On a page without a consumer: "N need a person" cards (alerts) then the caseload, each consumer one row: initials, school, a 5-dot stage track (Referral · Screening · Intake · ISP · Authorization) and the authorization state (e.g. "Partial · 65 of 150", "Info requested · due Oct 29", "Approved · 27 units"). Tap a row → expands: mini timeline (dates), next step, buttons ("Open in Lauris", "Open in Psyflo" for payer decisions → the platform case page). On a consumer page: that consumer's card expanded first. Use `PSY.newCases` (pipeline) and `PSY.auth` / `PSY.alerts`.
2. **Notes** and **Time** views: today's panes, behind the dropdown. DSS see only these.
3. Alerts: actions go to the platform case pages (decisions) or to Lauris + Scan & Enhance (drafts to finish), not to focus mode. DSS see no alerts.
4. Pill and footer per role. Presenter menu: role switch, Reset Demo, and the four scenarios: (1) DSS writes today's DPN for M.R. with Scribe; (2) LCS scans & enhances T.W.'s initial authorization and submits after signing; (3) T.N. partial approval → peer-to-peer script in Authorizations; (4) Admin requests a substance-use report in Analytics.
5. Lauris header shows the current role's user. DSS cannot open Admission Screening / Intake / authorization pages in Lauris (Lauris's own guardrail): those links show "No access".
Owns: `src/screens/01-core.js`, `03-ext-status.js`, `60-l1a-util.js`, `60-lauris-consumers.js`, `61-lauris-consumer.js`, `63-ext-time.js`, `64-ext-notes-util.js`, `02-core-data.js` (only if needed). Tests: `l1a-click`, `r7-terms`, new `r8-ext`.

### D · Platform: Authorizations (owner D)
1. Nav is Authorizations + Analytics (foundation). Authorizations = the one list for everything with a prior authorization: merge the Overview attention rows (needs a person, deadlines) and Denial Intelligence's decisions into it. Filters (Round-6 filter bar): Show (Needs a person · Active · Pending payer · Partially approved · Denied · Info requested · Expiring · Drafts · All), Payer, Service, School, Assigned to, Units left, Ends, Deadline, Search. Deep links: `auth-list?show=denied` etc.
2. Case pages keep the denial workflow: partial approval decision, peer-to-peer script (`p2p-notes`), additional documentation / info request (`info-request`), reconsideration/appeal drafts. All these pages show Authorizations as the active nav item and breadcrumbs "Authorizations / <initials>".
3. Remove New Cases (`referrals`, `ref-review`) and Overview (`home`) and Denial Intelligence (`denials`) from the platform UI; the foundation redirects their routes to `auth-list` (keep `PSY.dash`, `PSY.newCases`, `PSY.di` APIs working for C and for counts). Retire `79-flow-decision.js` focus flow: its actions go to the platform pages.
4. Role scope: LCS see "My consumers" (assigned to them), admin all. Denied/partial rows hidden for LCS when `PSY.can('denials')` is off.
Owns: `10-referrals.js`, `20-case.js`, `20-case-data.js`, `40-home.js`, `40-dash-util.js`, `50-denials.js`, `50-denials-util.js`, `51-denial-detail.js`, `79-flow-decision.js`, `80-auth-list.js`, `80-p1-util.js`, `81-connect-lauris.js`, `82-payers.js`, `84-family-settings.js`, `86-partials.js`, `87-p2p.js`, `88-requests.js`, `89-drafts.js`. Tests: `p1-click`, `p2-click`, `r5-platform`, `r5-denials`, `r5-newcases` (retire), new `r8-auth`. Drop the Analytics assertions from `p1-click`/`p2-click` (E covers Analytics).

### E · Analytics + Settings (owner E)
1. Analytics keeps its filters and cards (Round 6). Fold in what Denial Intelligence showed about patterns (denial reasons by payer) as one card if not already there.
2. **Request a report**: an ask box ("Ask for a report…") with 3 example chips (e.g. "Consumers with substance use concerns at Lynchburg MS-2", "Consumers with an IEP and an active TDT authorization", "Units used by school this quarter"). Run → a progress card with agent steps (Signing in to Lauris with Psyflo credentials · Finding matching consumers · Reading notes and forms · Saving to Psyflo · Building the report), "Usually 3–4 min" as data, fast-forwarded in the demo (~6 s). Then a report: title, criteria, date, sources (Lauris EHR, Psyflo), counts, a table by initials with the matched evidence and its citation, "Illustrative demo data". "Download PDF" (simulated: toast "PDF ready" + Simulated chip; no real download) and "Email report". Recent reports list. Only facts present in the demo records; no diagnoses or findings invented.
3. **Weekly email**: a toggle in Analytics ("Weekly email · Mondays") and in Settings.
4. **Settings → Roles** (admin only): a matrix of the three roles × features (Platform, Authorizations, Denials, Analytics, Scan & Enhance, Cases view, Scribe types, all consumers) with toggles writing `PSY.state.perms`; changes apply immediately.
Owns: `41-analytics.js`, `85-analytics-data.js`, `83-settings.js`, `04-filterbar.js`. Tests: new `r8-analytics` (+ Settings roles).

## 6. Rules for every agent
- Edit only the files you own; build to your own `out/<you>.html` (`OUT_NAME=<you>.html python3 build.py`); never `rm` others' files; do not touch git.
- Keep the artifact contract: no alert/confirm/prompt/print/downloads; no doctype/html/head/body wrapper; initials only; Simulated chips on simulated steps.
- Copy: Lauris words (consumer, session); no explanatory sentences; button labels say what happens; toasts ≤ 6 words.
- Tests: update or retire the suites you own (list retired assertions and why), add your new `r8-*` suite, run `tests/sweep.mjs` on your build. A failure in another owner's suite caused by your change: report it with the file and line.
- Report back: files changed, pass counts, assertions removed/changed and why, cross-owner items, real bugs.

## 7. Shared hooks (foundation, already in `src/shell.js` / `src/scribe.js`)
- `PSY.role()`, `PSY.can(f)`, `PSY.setRole(r)`, `PSY.user()`, `PSY.ROLES`, `PSY.PERMS`, `PSY.FEATURES`, `PSY.setPerm(role, f, on)`; `PSY.onRole` optional callback.
- `PSY.ext.view()`, `PSY.ext.setView(k)`, `PSY.ext.tab(k)` (alias), `PSY.ext.work.register(key, {html})`, `PSY.ext.work.paint()`, `PSY.ext.lastPanel` (the panel options of the page on screen), `PSY.ext.casesPane` (owner C; falls back to `statusPane`). Panes: `[data-psy="xp-list"] > [data-pane="cases|notes|time"]`; the hidden `data-pane="review"` is temporary (owner B removes the Review content and then the pane; tell me when no caller needs it).
- Scribe button act `xq-scribe`, Track time `xq-time`, Scan & Enhance `xq-enhance` → `PSY.enhance.begin()` (owner B defines `PSY.enhance = { begin(), isOpen(), openFor(caseId) }`).
- `PSY.platform.caseRoute(caseId)` (owner D may override) and `PSY.openCase(caseId)`.
- `PSY.REDIRECT[routeId](params) → {id, params}` for removed platform pages (owner D may refine).
- `PSY.dpn.text(root)`, `PSY.dpn.push(root, text, {addendum})` and route `lauris-dpn?c=<id>&past=<yyyy-mm-dd>` (owner A provides; owner B consumes).
- CSS: put new styles in your own JS file (`PSY.css.lauris = (PSY.css.lauris || '') + CSS` for the extension and Lauris pages, a screen's `css` for platform pages). Do not edit `lauris.css`, `shell.css`, `platform.css` (foundation).
- Test helpers: `tests/r8-foundation.mjs` (11 checks, keep it green), `tests/r8-shot.mjs` (screenshots: `PROTO=out/x.html OUT=name STEPS='js;;js' node tests/r8-shot.mjs` → `shots/r8/name.png`).
