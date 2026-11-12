# 06 · Demo walkthrough guide

Deliverable 6 (prompt Part 21, item 6) · Nov 11, 2026 · Psyflo × Harvest unified demo

A 14-minute route through the product, six optional deeper scenarios, a pre-flight checklist, a recovery ladder, and a glossary that says what each simulated step really is. Every button name below was checked on a running build on Nov 11, 2026, by clicking it or reading it on the open screen. A few were taken from the QA scenario suites (`test/s1.mjs` to `test/s6.mjs`) and not clicked again; they are marked "not re-run".

The rule for the room: **a person reviews, a person presses Process Form, Get Signature and Send; Lauris stays the record; every sentence in a draft has a source or says "Evidence missing".** Say it once at the start and let the screens show it.

All data is synthetic. Students appear as initials. The mock Lauris, Sfax, SMS, DMAS and the payer portals are simulated. The 14-minute length is a presentation target, not a measurement of how long the work takes in a clinic.

> **Changed on Nov 11 after the direct support and site supervisor walkthrough.** Track Time is gone (no timer, no time entries; the person types Direct time and Units in Lauris). My Work became the **Dashboard**, a patient roster with the outstanding items under each patient, alert icons and filters; notes and forms moved to a **Documentation** tab; **Authorizations** is one filtered table with a unit bar ("110 left of 150", yellow from 75% used) and dates with warning icons; a patient opens to a **chart** (Documentation first, the Authorization as one section). Two-minute add-on after beat 1, as `cdiaz`: Dashboard, chip **Needs attention**, expand M.R.; rail **Documentation**, chip **Needs review**, **Review**, **Approve**; rail **Authorizations**, filter **Units remaining: Flagged**. Details: `docs/FEEDBACK-ROUND-2026-11-11.md`.

## 1. Pre-flight checklist

Do this the evening before, and again 20 minutes before the meeting.

| Item | How | Good looks like |
|---|---|---|
| Start the app | Double-click `Start demo (Mac).command` or `Start demo (Windows).bat`, or run `node server/index.js` (Node 20 or later). Keep the window open | Three lines: app on 4000, mock Lauris on 4001, mock portals on 4002 |
| Reset both stores | In the browser, `?present=1`, then dock **Reset**, **Live flows** | Reset clears Psyflo and the mock Lauris together. Date reads Thu Oct 29, time 3:30 pm |
| Preset | **Live flows** for this route. **Canvas snapshot** shows Oct 29 as designed, with T.W.'s request already sent | The route below runs on Live from start to finish |
| Ports | 4000, 4001, 4002 free. Another copy: `APP_PORT`, `LAURIS_PORT`, `EXT_PORT`, `DATA_DIR` | `http://localhost:4000` shows Sign in |
| Browser | Current Chrome, 100 percent zoom, a 1440×900 window for the platform. Safari and Firefox are untested | No extensions that inject into pages |
| Windows | Window A: platform at `http://localhost:4000/?present=1`. Window B, Chrome device mode at 390×844 (a Chrome window does not go that narrow): `http://localhost:4000/?present=1#/Login`, then **Direct support**, **Sign in**. Tab C: `http://localhost:4001/login?as=khale&next=/consumers/3310/session/dpn` | Each loads; the panel shows beside the mock Lauris in tab C |
| Extension or in-page panel | Use the **in-page panel** (the mock Lauris shows it at 400 px; the "psyflo · on" chip toggles it). The Chrome MV3 side panel exists in `extension/` and was **not run in real Chrome**. Do not load it for the meeting unless you rehearsed it | Panel header reads "Psyflo · Jordan Perez, LPC" and "Lauris connected" |
| Microphone | Not required. The phone has **Type instead**, and with the dock open **Use the example**. The panel has **Play the scripted call** (about 48 seconds; no microphone). A live microphone in Chrome was not tested | You can finish every beat without speaking |
| Fonts | DM Sans loads from Google Fonts. With no network the pages fall back to the system sans; layout holds, looks slightly different | Headings render in DM Sans |
| Dock | `Ctrl+Shift+P` shows or hides it; the label PRESENTER and a dashed marigold edge mark it as not product. Hide it when presenting the product | Closed in Presentation mode |
| Rehearse | `node test/run-all.mjs --only s1,s2,s3,s4,s5,s6` replays the six scenarios with assertions and writes `review/test-results/`. Each suite runs three start modes, so allow time | `summary.md` shows PASS for each |
| Backup | `hosted/index.html` opens by double-click with no server; data is in memory and resets on reload (`hosted/README.md`) | Opens from `file://` |

## 2. Roles and sign-in

Pick a role card on **Sign in**, or use the dock **Role** menu (no page reload). Family and school have their own buttons under "Not Harvest staff?".

| Role | Person (synthetic) | Id | Lands on | Sees |
|---|---|---|---|---|
| Direct support | Kayla Hale, QMHP-C | `khale` | Extension home on a laptop, the phone app on a narrow window | Dashboard (own patients), phone, panel with Scribe (no Scan & Enhance) |
| Direct support, new hire | R. Owens | `rowens` | same | every note goes to review |
| Supervisor | Carla Diaz, QMHP-C, site supervisor | `cdiaz` | Dashboard (patient roster) | Documentation (review, approve, return), Authorizations, Analytics; send when designated |
| Clinician | Jordan Perez, LPC | `jperez` | Dashboard (patient roster) | Documentation, Authorizations, Denial Intelligence, Analytics, Referrals; Scribe and Scan & Enhance in the panel |
| Admin | Dana Owens | `dowens` | Dashboard (statuses and dates) | Documentation (status only), Authorizations, Denial Intelligence, Analytics, Settings; status, units and aggregates only; no clinical text |
| Guardian | T.W.'s guardian | link token `tw-demo` | Family checklist | one child's plain-language material |
| School counselor | R. Bell | `rbell` | School portal | status text for the school's own referrals |

Any seed staff id signs in to the mock Lauris: `http://localhost:4001/login?as=<id>`.

**Dock menus.** **Scenario** (six; signs in as the scenario's role, **resets both stores to the scenario's preset**, then opens its first screen), **Role**, **Reset** (Live flows or Canvas snapshot), **Simulate** (Receive a reply; Advance a day, which moves Psyflo and the mock Lauris together), **Notes** ("How the data gets in" for the open screen), **Maturity** (shows the Working chips too), **Surfaces** (Platform, Lauris + panel in a new tab, Phone, Family, School). **Explore mode** (`?mode=explore`) opens the dock permanently and adds **All screens**.

## 3. The 14-minute route

Run it in order, on the Live preset, **without choosing a Scenario from the dock between beats 1 and 2**: the Scenario menu resets the data. Beats 1 and 2 are one story. After beat 2, you may use the menu.

| Min | Screen and role | Click path | Say (one line) | The audience should conclude | If it fails |
|---|---|---|---|---|---|
| 0:00 | One slide, no app | none | "A person reviews, signs and sends; Lauris stays the record; every sentence has a source." | We answer accuracy first | Slide only |
| 0:45 | **Beat 1 · S1 daily note.** Phone, then Lauris, as `khale` | Dock **Scenario**, **1 Direct staff daily documentation**. Phone: **M.R.** chip, **Say what happened**. Card "Use the microphone?": **Type instead**. Dock open: **Use the example**. **Looks right**, then **Save to M.R.** (chip reads Waiting for Lauris). Tab C (Lauris, daily note). Panel banner "Dictation dropped in". Read "Questions for you · 2". In Lauris type Direct time **3 h 40 min** and Units **2** (a person enters them; Psyflo does not), then press **Process Form**. Dashboard (as Kayla): M.R. no longer owes today's note | "She said what happened; Psyflo tidied her words and asked what she did not say; she processed it." | Staff judgment stays; nothing is invented | Mic: use the example. Panel blank: reload tab C. Reset: fixture `mr-daily` |
| 3:15 | **Beat 2 · S4 continued stay.** Platform and panel, as `jperez` | Dock **Role**, **Clinician (LMHP-type)**. Rail **Authorizations**. Row M.R. R-0411, **Review packet**. In Next step press **Open in Lauris**. Panel "Continued stay · M.R.": Daily notes now 16 (it was 15 before beat 1). **Open the evidence** (chips "Pilot (preview)" and "Read-only"). **Show all 20 rows**. Open a row, **Exclude**, type a reason, **Exclude**. Read "Gaps · 8". **Use it in the continued-stay request**. Leave household context "Not included". **Review 4 statements**, **Accept the 3 with sources**, **Reject** the one marked "Evidence missing", **Approve and fill**. Do not press Process Form | "The note she just wrote is now evidence. Gaps are named, not filled." | The system reduces chart review without inventing evidence | Fixture `mr-corpus` (canvas, 10 s) |
| 5:45 | **Beat 3 · S2 referral to intake.** School, platform, phone, Lauris | Dock **Scenario**, **2 School referral through intake**: card "Harvest needs", **Refer a student**. Dock **Role**, **Clinician**. Rail **Referrals**, row REF-118, **Send the family link** (Simulated). Phone window: five steps, **Next** ×4, **Send to Harvest**. Platform: **Run the check**, **Open the DMAS lookup** (Simulated), pick the plan, **Record result**. To save time, load the checkpoint `tw-screened` (one terminal command, section 5), then open the intake in Lauris: the boxes read "copied from screening" and the panel offers **Fill 15 boxes** and **Review one by one** | "Captured once, reused: the family's answers fill the intake." | Information moves forward without retyping | SMS: the link text is on screen. Call stalls: fixture `tw-referral` or `tw-screened` |
| 7:45 | **Beat 4 · S3 initial authorization.** Panel, platform, Lauris, as `jperez` | Dock **Scenario**, **3 Initial authorization** (or fixture `tw-isp-ready`). Lauris SRA tab (case page **Open in Lauris**). Panel **Review 7 statements**; click a source chip; **Edit** criterion 1, **Save wording** (not re-run); **Accept the 7 with sources**, **Approve and fill**. Lauris **Process Form**. Platform case: **Approve**, dialog **Approve**. Panel **Open Forms to Approve**, **Preview**, Lauris **Get Signature**. Platform **Send by fax**, dialog **Send by fax**. Status Submitted, "Day 0 · call on day 10" | "A person approved, a licensed person signed in Lauris, a person pressed Send; the Sfax receipt is simulated." | Documentation, signature, submission and tracking are one thread | Fixture `tw-isp-ready`, `tw-signed` or `tw-sent` |
| 10:00 | **Beat 5 · S5 payer decision.** Platform, as `jperez` | Rail **Authorizations**, row D.W. R-0402, **Decide**. Denial case: chips "Decision needed", "Reply by · Oct 30". Tab **Evidence 4**, tab **Options 4** (four options, each with a deadline and a chip). **Sentara guidance** drawer. **Choose**, **Accept decision** **Open**, **Accept as offered**, **Log the decision**, **Log it**. Bar "Accepted 110 of 150 units", **Open authorization**: Active, with the task "Enter 110 units" | "Logged on the request only; nothing goes to the payer; a person types the units into Lauris." | Nothing is lost when a payer pushes back | Fixture `payer-decision` |
| 12:15 | **Beat 6 · S6 leadership.** Platform, as `dowens` | Dock **Role**, **Administrator**. Rail **Analytics**: Pilot scorecard (note "Sends with receipts" moved after beat 4). Tab **Payer Performance**. Tab **Patient Population**, header **Illustrative cohort** (banner). **Export**, Format **CSV** or **PDF**, **Download** | "Counted from stored records; the cohort is generated and labelled; groups under five are hidden." | Operational data without another spreadsheet | Fixture `analytics-case`; on export failure, read the table on screen |
| 13:30 | One slide | none | "A small, measurable start: one site, a baseline week." | A defined pilot | Slide only |

Notes on the table:

- **Beat 1.** Time is no longer tracked in Psyflo (feedback Nov 11): the person types Direct time and Units in Lauris, so the note carries the 2 units typed there. Say that the units are the staffer's own entry. The panel's checks read 2 of 5 because nothing in Psyflo answers "how long".
- **Beat 2.** After beat 1 the evidence count reads 16 daily notes and "25 units left"; without beat 1 it reads 15 and 27. The **Exclude** step needs a reason and keeps who and when. The note text is never changed.
- **Beat 3.** Beat 3 compresses a longer flow (section 4, S2). The scripted call takes about 48 seconds on its own, so run it only if you can talk over it.
- **Beat 4.** `tw-isp-ready` is a Live-preset checkpoint. **Scenario 3** loads the Canvas preset with R-0416 as a draft.
- **Beat 5.** In the case-backed data the payer table in Analytics shows "Fewer than 5" per payer. Do not promise payer-level figures.
- **Beat 6.** Admin sees "Aggregates only" with a "Why aggregates only" link. To show a drill-down, sign in as Clinician: Analytics, Patient Population, **Show the patients: In service** (own caseload only).

## 4. The six scenarios, deeper routes

Each runs alone from **Scenario n** in the dock (which resets to its preset) or from its checkpoint fixture. Fixtures run the same internal actions as the screens and are checked by `test/fixtures.mjs`.

### S1 · Direct staff daily documentation (M.R.)

Fixture `mr-daily` · preset Live · role Direct support (`khale`) · records: M.R., Harvest # 3310, request R-0411.
1. Phone: **M.R.**, **Say what happened**, **Type instead** (or **Allow today** with a microphone), **Looks right**, **Save to M.R.**
2. Lauris daily note: read "SAID INTO THE PHONE" beside "DRAFTED FOR THE NARRATIVE"; "Checks 3 of 5 pass"; the yellow boxes are typed, not saved.
3. In Lauris type Direct time (3 h 40 min) and Units (2), then **Process Form**.
4. Dashboard, as Kayla: M.R. no longer owes today's daily note; E.S. still does (the row expands to show it).

**Message:** Psyflo reduces documentation friction without removing staff judgment. **Unverified:** a live microphone; Safari and Firefox.

### S2 · School referral through intake (T.W., REF-118)

Fixtures `tw-referral`, `tw-link-submitted`, `tw-eligible`, `tw-screened` · Live · school, then clinician. From `tw-screened` the referral reads "in intake", eligibility "active · Humana", and T.W. exists in the mock Lauris as #4492.
1. School: "Harvest needs" card; **Refer a student**; the form has four sections, three required fields first; **Submit referral**.
2. Clinician: **Referrals**, REF-118, "Insurance criteria · 4 missing"; **Send the family link** (Simulated SMS).
3. Phone: About you, Insurance details, Permission to call, Best time to call, Getting to the intake; **Send to Harvest**. Eligibility reads "Check required".
4. **Run the check**, **Open the DMAS lookup** (Simulated), **Active**, plan, **Record result**: result, plan, date, source and a dated proof are stored.
5. Lauris, new consumer from REF-118: panel **Fill 6 boxes from the referral**; a person presses **Save Consumer**; panel **Open Admission Screening**.
6. **Play the scripted call**. Card "Before you record" (Pilot (preview)): tick **Guardian agreed to be recorded** (not re-run), **Agreed · start recording**. The panel lists only what is still to ask. **Stop and draft the boxes**, **Fill the N boxes** (both not re-run), edit one, **Process Form**.
7. Referral now reads "Processed in Lauris" and "Send by Nov 28". Open the intake (Add Session, Comprehensive Needs Assessment): boxes read "copied from screening".

**Message:** captured once, reused. **Not re-run end to end in this pass:** step 7's last click; `test/s2.mjs` covers it.

### S3 · Initial authorization (R-0416)

Fixtures `tw-isp-ready`, `tw-signed`, `tw-sent` · Canvas via Scenario 3, or Live via the fixture · clinician.
Steps as in beat 4. Facts to point at: criterion 3 and trauma-informed care are left for the clinician ("Left for you · 2"); a statement with no source prints "Evidence missing"; Approve is recorded with a name and time and the dialog says approving is not signing; the signer printed on the PDF is read from the Lauris event ("J. Perez, LPC"); the fax reference F-nnnn appears only after the stub returns it.

**Message:** one connected workflow. **Simulated:** Sfax, the Lauris signature page.

### S4 · Continued-stay evidence (M.R., R-0411)

Fixture `mr-corpus` · Canvas via Scenario 4 · clinician. Steps as in beat 2. Also: the **Period** select (Last 30 days, Last 60 days, Whole authorization Aug 18 – Nov 13); counts open their rows; **Mark sensitive** beside **Exclude**; "Repeated wording · 1"; the banner "27 units left · out about Nov 11, before Nov 13".

**Message:** less chart review, no invented evidence. **Unverified:** whether Harvest wants the Evidence review in the pilot (it carries a Pilot (preview) chip).

### S5 · Payer decision (D.W.; K.T., T.N., E.C.)

Fixture `payer-decision` · Canvas via Scenario 5 · clinician. Steps as in beat 5, plus these cases from the Denial Intelligence queue (rail):
- **K.T. R-0408, information request** (24 hours, payer-stated): **Draft from records**, one answer per item asked with source chips, **Edit** the item marked to fill, **Mark reviewed** (disabled while a placeholder remains), **Open Availity and send** (not re-run; a person sends it in their own Availity login and the mock page returns the confirmation).
- **T.N. R-0388, peer-to-peer**: call "Wed Dec 9, 2:00 pm", reviewer "Not recorded"; **Draft from records**, edit points, **Save notes**, **Log the outcome**, **Change the call**. Recording is off unless a rule turns it on.
- **E.C. R-0384, denial**: **Appeal prep**; the staff side prepares the letter; the guardian reads and signs on the family portal; "Not verified" marks the provider path.
- **Return path:** **Open authorization** or the **Authorization** button in the header.

**Message:** continuity. **Unverified:** payer timings and who may appeal (chips say so). Not re-run: the E.C. guardian signing.

### S6 · Leadership view

Fixture `analytics-case` · Canvas via Scenario 6 · admin, then clinician. Steps as in beat 6. Add the **Ask** box (rule-based; Simulated; unsupported questions return a limitation) and **Earlier views** (the earlier baseline, labelled "Sample data, illustrative").

**Message:** operational data without another spreadsheet.

### Optional modules (15 to 25 minutes)

Documentation for a supervisor (`cdiaz`: filter Needs review, **Review**, **Approve**, **Return with a note**, **That didn't happen**; the By staff tab); the Dashboard roster with its filters and the patient chart (Documentation first, Authorization as one section); Settings as admin (Rules with source chips, Units, Roles, Audit, Family link with signature modes); the family portal (checklist, English and Español, signature mode switched in Settings); Scan & Enhance **Review draft** on a daily note (accept applies only the person's own words).

## 5. Recovery ladder

Rule: no recovery over 20 seconds. If a step takes longer, drop a level.

1. **Reload the tab.** State is server-side; the session is kept in the browser. If the role is lost, dock **Role**. If the panel is blank, reload the Lauris tab.
2. **Reload the beat's checkpoint.** The dock **Scenario** menu reloads scenarios 1 to 6 (resets both stores). Checkpoint fixtures are API-only; run once in a terminal:

   ```
   T=$(curl -s -XPOST localhost:4000/api/session -H 'content-type: application/json' -d '{"staffId":"dowens","presenter":true}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
   curl -s -XPOST localhost:4000/api/do -H 'content-type: application/json' -H "X-Psyflo-Session: $T" -d '{"action":"demo.scenario","args":{"id":"tw-isp-ready"}}'
   ```
   Ids: `base-live`, `base-canvas`, `tw-referral`, `tw-link-submitted`, `tw-eligible`, `tw-screened`, `tw-isp-ready`, `tw-signed`, `tw-sent`, `mr-daily`, `mr-corpus`, `payer-decision`, `analytics-case`. Reload the browser tabs afterwards.
3. **Stills.** Screenshots for each surface are in `docs/deliverables/img/` and `review/test-results/shots/`. No 60-second recordings exist in this build. The hosted file (`hosted/index.html`) is a second environment with its own reset.

## 6. What each simulated step is

Say these plainly if asked. The maturity chips on screen use the same words (`web/js/shared/maturity.js`).

| On screen | What it really is | Say |
|---|---|---|
| Mock Lauris (port 4001) | Our approximation of Lauris Online, with its own store | "This is a stand-in for Lauris; the real field labels still need confirming." |
| Page bridge | Code that reads and types on the Lauris page a person has open; it never presses Process Form, Get Signature or Send | "Psyflo reads and types on the open page. It is not a Lauris API." |
| Yellow boxes | Boxes the panel typed; unsaved until a person presses a Lauris button | "Typed, not saved." |
| Process Form, Get Signature | Lauris buttons a person presses; Psyflo records them only when the page bridge sees the result | "Psyflo records what it sees a person do." |
| Signer name on a document | Read from the mock Lauris signature event | "The signer is whoever signed in Lauris." |
| Approve | A designated person's internal approval in Psyflo | "Approving is not signing." |
| Send by fax, fax reference, receipt | A Sfax stub returns a reference and a delivery receipt about three seconds later | "The Sfax receipt is simulated." |
| Family link text | An SMS stub; the link text appears on screen | "Nothing is sent." |
| Eligibility lookup | A mock DMAS page; a person types the result; Psyflo stores who, when and a dated proof | "A person runs the check; the lookup page is a stand-in." |
| Availity, UHC portal, state portal | One-page mocks opened in the clinician's own login; the confirmation is read from the open page | "A person sends it in their own login." |
| Drafts | Rule-based extractors over stored records, with checks; no language model | "Every sentence traces to a record or says Evidence missing." |
| Speech | The browser's speech service, or the scripted example | "Speech is the browser's; the example is a fallback." |
| Receive a reply, Advance a day | Presenter simulations in the dock; not product features | "A presenter control." |
| Decision clocks (Day N, day 10, 14 days) | Rules from a table with a source chip; the 7-day public standard is shown as a reference only | "Harvest-reported; not yet verified by Harvest or the payer." |
| Unit bands (120, 180, 300 minutes) | The official default; configurable in Settings | "Officially verified default; an alternate is selectable." |
| Analytics, Case-backed | Counted from records created in this demo | "Counted from what people did here." |
| Analytics, Illustrative cohort | 120 generated patients, ids `COH-001` to `COH-120`, never summed with the other data | "Generated; not Harvest's data." |
| "Sample data, illustrative" | A seeded baseline Harvest did not compute | "Illustrative." |
| Enter units in Lauris | A task a person completes on the mock Lauris Authorizations page; it closes only when the page shows the units | "Psyflo never writes units into Lauris." |
| Scan & Enhance, Evidence review | Read-only; reads Psyflo's own copies of processed notes | "Never a Lauris scrape; no addendum feature." |
| Guardian signature | Mode per document (remote, in person, pending) with the chip "Policy not validated" | "Harvest has not decided the policy." |
| Maturity chips | Simulated, Pilot (preview), Future; Working is unmarked unless the Maturity overlay is on | "The chip says how real it is." |

**Do not say:** "integrated with Lauris", "Lauris API", "submitted to the payer", "approved by the payer" (decisions are recorded by a person with a document reference), "automatic eligibility", "AI wrote the note", "compliant", "Harvest's numbers" for any seeded figure, or any rule number as law.

**Not verified in this build:** the MV3 side panel in real Chrome, the live microphone, Safari and Firefox, a venue network, and a published host for the hosted file.
