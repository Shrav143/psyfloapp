# Psyflo × Community Counseling Center of Southern Nevada · Nevada SUD / ASAM demo

A working demo of Psyflo for **Community Counseling Center of Southern Nevada** (placeholder name), a nonprofit adult behavioral health agency in Las Vegas doing substance use treatment under **ASAM criteria** (Level 1 outpatient and Level 2.1 IOP). It bills **Nevada Medicaid FFS (DHCFP) and the five southern-Nevada Medicaid MCOs** only (SilverSummit, Anthem, Molina, CareSource, Health Plan of Nevada); grant clients (Ryan White, SAPTA, HOPWA) need no prior authorization.

The story: their EHR stays the system of record. A Psyflo extension inside it drafts the ASAM assessment summary, the treatment plan and the prior authorization (PA) request from the chart; Psyflo formats it the way each plan wants it (the plan's own form, text to paste in a portal, or the EHR printout); a person signs and a person sends; Psyflo then tracks decisions, 5-session renewals, denials, timely filing and credentialing, and learns plan policy changes from the denials. **Synthetic data only — nothing is real.** The content spec is `docs/NEVADA-BRIEF.md`.

## Run it

Needs Node 20+ and nothing else (no npm install). Double-click `Start demo (Mac).command` (or `Start demo (Windows).bat`), or:

```bash
npm start
```

| Origin | What |
| --- | --- |
| http://localhost:4000 | Psyflo app, extension panel, API |
| http://localhost:4001 | Mock EHR ("Client Record"); sign in as `khale`, `jperez` or `dowens` |
| http://localhost:4002 | Mock Availity (Anthem), HPN provider portal, Nevada Medicaid EVS eligibility lookup |

Ports: `APP_PORT`, `LAURIS_PORT` (the mock EHR), `EXT_PORT`; data lives in `data/` (or `DATA_DIR`). If the app is reached through another host name, set `PSYFLO_APP_URL`, `LAURIS_URL` and `EXT_URL`.

**Reset** from the hidden presenter panel (press **Ctrl+Shift+P**, then "Reset") or `npm run reset`:
- **Live flows** (default): T.W. is rewound to his drug-court referral (Oct 13), so Flows A → C build his story in front of the audience.
- **Canvas snapshot**: the seeded "today" with T.W.'s PA already sent.

## Sign in

Open http://localhost:4000. It is a normal sign-in page (work email and password); under the form are the **three demo accounts**, one click each. Typing `khale`, `jperez` or `dowens` `@cccsn.demo` with any password works too.

| Role | Demo account | Lands on | Sidebar |
| --- | --- | --- | --- |
| Direct support staff | Kayla Hale, CADC (`khale`) | Dashboard (notes behind, due next, goals) | Dashboard · Clients · Documentation (Group Notes, Weekly Sessions, Collateral Contacts, Incident Reports) |
| Clinician | Jordan Perez, LCADC (`jperez`) · signs requests | Dashboard (today's worklist) | Dashboard, Documentation Status · Clients, Referrals, Eligibility · Assessments & Plans · Utilization Review (Authorizations, Continued Stay, Discharge Summaries) |
| Administrator | Dana Owens (`dowens`) | Authorizations | Utilization Review · Billing (Claims & Denials, Payer Rules) · Reports · Client Record · Administration (Users & Permissions) |

There are three roles, no supervisor or credentialing role. The sidebar uses the words the EHR uses (Clients, Group Notes, Forms to Approve, Authorizations, Reports); items that live in the EHR open the mock Client Record with the Psyflo panel beside it. Press **/** anywhere to search clients, referrals and authorizations. The product view has no demo bar: **Ctrl+Shift+P** opens the presenter panel (reset, jump to any screen, "How it fits", "How the data gets in", the demo-only "receive a plan reply" / "payer pays" / "advance the clock" actions on the screens that have them).

There are no dropdown menus in the Psyflo screens: filters, roles and pickers are segmented controls and chips. (The mock Client Record keeps ordinary form fields, as an EHR would.)

## The screens

| Area | Screens |
| --- | --- |
| Front door | Referrals (drug court, Nevada P&P, self, hospital ED, HIV clinic; by program) · Referral review (the ASAM dimensions the referral already shows) · Nevada Medicaid eligibility (a person reads EVS and records the MCO or FFS; no Medicaid → Ryan White / SAPTA grant, no PA) |
| In the EHR (extension) | Intake screening · ASAM assessment (six dimensions) · Treatment plan · PA request · Continued stay · Sign-off |
| Authorizations | Authorizations · Sent · Information request · Partial approvals & denials · Step-down 2.1 → 1 · Peer-to-peer notes · Reconsideration / appeal letter |
| New for Nevada | **Claims & Denials** (denial worklist, timely-filing countdowns, plain-English denial codes, "paid last week, denied this week", AR aging, write-off trend, reconsideration packets with proof of timely filing) · **Case Tracker** (inside Authorizations: every authorization with units approved, used and remaining, when it expires and a status such as Recertification due, Current, Awaiting approval or Appeal in progress) |
| Learning | **Payer playbook · what changed** (plan rules Psyflo noticed in denials and replies, and what it now does differently) · Analytics (approval / partial / denial per plan, decision days, auth workload, denials by reason, timely-filing write-offs, step-downs; demo numbers) |
| Admin | Users & Permissions |

School, family, phone-app and daily-note screens from the earlier build are hidden in this build (`hidden: true` in `web/js/registry.js`) and nothing links to them.

## The live flows (demo script)

Reset to **Live flows** first. The mock EHR and the app can sit side by side; every app tab updates live.

**Front door.** Sign in as Jordan → Referrals → REF-118 (T.W., Clark County drug court, case manager R. Bell). The ASAM panel shows what the referral already says per dimension and what the assessment must still ask (including the urine drug screen SilverSummit now requires). *Record the EVS check* → open the EVS lookup (mock) → record *active · SilverSummit*. REF-116 shows the grant route: no Medicaid → Ryan White / SAPTA, no PA.

**Flow A · intake screening and ASAM fill the EHR form.** From Referral review → *Intake screening in Client Record* (`ExtScreening.dc.html?client=TW`), or in the mock EHR. The panel fills the boxes it can from the referral, records (or plays the scripted call), drafts the rest with numbered sources, and the person presses *Process Form*. The ASAM assessment opens with the screening's answers labelled "copied from screening", organised by the six dimensions.

**Flow C · draft → sign → send → track a PA.** After Flow A: treatment plan → Psyflo drafts R-0416, the Level 2.1 initial PA for **72 units of H0015 (9 a week × 8 weeks)** in SilverSummit's format, with the UDS result attached (the packet is blocked without it). *Process Form* → *Forms to Approve* → the clinician signs → *Send* (fax stub: reference + delivery receipt in ~3 s, kept as proof of timely submission). Authorizations shows it submitted with its decision clock; as an admin use *Demo: receive a reply* to show an approval, a 5-session partial (Molina), an information request or a denial.

**Then show** Do next (Jordan's day: sign T.W.'s PA, M.R.'s continued-stay draft arguing D5, K.T.'s information request due today, D.W.'s next Molina 5-session request after session 3, T.N.'s peer-to-peer, E.C.'s reconsideration), Claims & denials, Payer Rules "What changed" feeds.

## Real vs stubbed

| Capability | In this build |
| --- | --- |
| Speech to text | Real in Chrome via the Web Speech API; the scripted transcript is the fallback |
| Drafting | `draft(formType, sources)` in `web/js/shared/draft.js`: deterministic extractors over the transcript and record, every box with numbered sources and the drafting checks shown in the panel. No LLM is called; a hosted model can sit behind the same function and the checks still gate it |
| Per-plan formatting | Mocked: the plan's form, portal text or EHR printout is generated from the same facts |
| Fax | Stub: reference + delivery receipt after 3 s; receipt stored as a PDF |
| SMS, email | Stubs: shown on screen and logged |
| Availity / HPN portal | One-page mocks; Send opens them in the user's own session; the extension reads the confirmation number |
| Nevada Medicaid EVS | Not automated: a mock lookup a person reads, and the Eligibility screen where the person records the result |
| Claims, denials, AR, credentialing status | Seeded demo numbers (labelled); no clearinghouse or remittance connection |
| Payer playbook "what changed" | Seeded feed (`seed/extra/playbook.json` → `policy_changes`) showing what detection from denials would produce |
| Signed PDFs | Real PDFs (`server/pdf.js`, no dependencies) |
| Payer replies, clock | Demo-only controls on Authorizations, admin only, labelled "Demo" |

## Tests

```bash
npm test                      # drafting acceptance tests from seed/scripts
node test/smoke.mjs           # renders every registered screen headless; reports console errors and unwired links (AS=jperez|cdiaz|dowens|lortiz)
node test/flowA.mjs && node test/flowC.mjs   # Flow A then Flow C through the mock EHR and the in-page panel
```
(The browser tests need Playwright; set `PW=/path/to/playwright`.)

## Layout

```
server/        index.js (3 ports) · pdf.js · psyflo/ (store + actions) · lauris/ (the mock EHR, "Client Record") · external/ (portal + EVS mocks)
web/           index.html + js/app.js (shell) · js/runtime.js (renders the .dc.html screens) · js/screens/* (one controller per screen)
web/screens/   the screens, used as live templates
web/panel/     the extension panel + page bridge
extension/     MV3 side-panel extension
seed/          seed.json (the dataset), extra/*.json (additions, incl. playbook.json), scripts/ (worked examples)
docs/          NEVADA-BRIEF.md (content spec), CONTRACT.md (how screens are wired)
```

## Open questions to confirm with CCC of SN

- **Provider type:** is it Provider Type 17, Specialty 215 (Substance Use Agency Model)? Which mental-health codes does the enrollment cover?
- **Timely filing per plan:** the demo uses 180 days from the date of service for FFS and every MCO.
- **Which plan authorizes 5 sessions at a time** (Molina in the demo) and **which plan started requiring the UDS at assessment** (SilverSummit in the demo)?
- **Which MCOs no longer follow the 24-session no-PA rule** for Level 1 (HPN in the demo)?
- **Their EHR:** its name, and what it can export or print (assessment, treatment plan, entitlements and units used).
- **IOP unit definition:** H0015 as 1 unit = 1 hour (9 a week), or per diem / per 15 min with some plans?
- Plan decision timeframes per contract, and who signs PAs (clinical director only, or any LCADC).
