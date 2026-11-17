# Nevada SUD / ASAM retarget · shared content brief

This copy of the demo (`psyflo-nevada-sud-demo`) is being retargeted from a school-based adolescent program (CARES NYC / Harvest TDT) to a **Nevada nonprofit adult behavioral health agency doing substance use treatment under ASAM criteria**. Every screen, seed row, label and help note must read as that clinic. **No schools, students, teachers, guardians, parents, IEPs, grades, recess, classrooms, adolescents, "Com Hab", NYC, Brooklyn, Rockland, eMedNY, OMH, DMAS, Virginia, TDT.** Synthetic data only; keep "Demo data · nothing is real".

## The clinic (from the discovery call; synthetic name)

- Display name everywhere: **Community Counseling Center of Southern Nevada** (short: **CCC of SN**). Sidebar subtitle: `CCC of SN · SUD / ASAM`. (Placeholder name; it may be swapped by one global replace later, so always write it exactly this way.)
- Nonprofit, Las Vegas (Clark County, southern Nevada). Founded 1990 serving people living with HIV; now substance use + mental health. Medicaid agency since 2010.
- **Bills only Nevada Medicaid FFS and the Medicaid MCOs. No private insurance, no Medicare.** Some clients are grant-funded (Ryan White Part A/C as payer of last resort, SAPTA block grant, HOPWA): **grant clients need no prior authorization**; a sliding fee scale for the rest. Referral sources: self-referral, **Clark County drug court**, **Nevada Parole & Probation (P&P)**, hospital ED / UMC, HIV clinic partners.
- **Provider-type change (~18 months ago):** Nevada Medicaid moved them to **Provider Type 17, Specialty 215 · Substance Use Agency Model (SUAM)** (demo assumption — confirm). Effect: they used to bill under the agency NPI; now **every clinician is credentialed individually and billed under their own NPI**. Because "substance use" is in the provider-type name, new MCO reviewers sometimes **deny mental-health codes** thinking the agency can only do SUD; staff re-argue it by email/phone over and over.
- Credentialing order: **Nevada Medicaid first** (2–3 weeks typical, one took 6 months), the Medicaid approval letter goes into each **MCO packet** (fastest MCO ~6 weeks, others months). **No billing for that clinician under that plan until done.**
- EHR: a full practice-management EHR they have used since 2009 (unnamed). In the demo it stays the mock **"Client Record"** with the Psyflo extension panel. The EHR tracks auths by "entitlement" (= payer) with expiry and units-used reminders. **The pain is not tracking — it is gathering the documentation, reformatting it per payer** (one plan wants its own form, one wants text pasted in its portal, one takes the EHR printout), submitting, and working denials.
- Staff doing auths + billing: was one person, now two. **Priorities they stated: 1) work the denials, 2) prior authorizations, 3) credentialing.**
- Money: they write off Medicaid claims as bad debt for **timely filing** (the plans are slow, then deny late claims); ~**$200K still owed** in accounting, more already written off. Use synthetic numbers that echo this, labelled as demo numbers.
- Auth volume: PA from day one for ~50–55% of clients (was ~20% before the provider-type change); almost every Medicaid client needs one at some point. ~150–200 auth actions a month.

## Levels of care and payer rules (demo assumptions — label "per the clinic" or "confirm" where shown)

| | ASAM Level 1 · Outpatient | ASAM Level 2.1 · Intensive Outpatient (IOP) |
|---|---|---|
| Schedule | ~1 day a week, individual or group | **3 hours a day, at least 3 days a week** (9+ hrs/wk) |
| Units | H0004 individual (per 15 min), H0005 group, 90832/90834/90837 (MH therapy) | **H0015, 1 unit = 1 hour** → 9 units a week |
| Nevada Medicaid FFS | **No PA for the first 24 sessions**, then PA | **PA required from the assessment**, no backdating — a missed day is unbillable |
| MCOs | Used to follow the 24-session rule; **some no longer do** | Same, but each plan has its own form/portal |

Assessment H0001. Urine drug screen H0048 / 80305 (**plans do not pay for it**).

ASAM six dimensions (use these names): **D1 Acute intoxication / withdrawal potential · D2 Biomedical conditions · D3 Emotional, behavioral or cognitive conditions · D4 Readiness to change · D5 Relapse, continued use or continued problem potential · D6 Recovery / living environment.** Medical-necessity arguments and continued-stay drafts are organised by dimension.

Recurring problems the demo must show Psyflo catching:
1. **"Abstinent in treatment" continued-stay denials.** Client has been abstinent *inside* the structure of Level 2.1, plan denies continued stay as "no longer meets medical necessity". Psyflo's draft argues **D5 relapse risk remains high without the Level 2.1 structure**, cites dates/UDS, D4/D6 status, and that step-down criteria are not yet met.
2. **5-sessions-at-a-time authorizations** (one plan, Molina in the demo). IOP clients come 3×/week, so the next request must be in **after day 3** to be approved before day 5. Psyflo auto-drafts the next request at session 3.
3. **Unannounced requirement: UDS at assessment.** One plan (SilverSummit in the demo) started denying Level 2.1 initial requests that lack urine drug screen results from the assessment. It is **not on their PA form** and they **do not pay for the test**. Psyflo detected it from 3 denials since Sep 22 and now blocks the packet until the UDS result is attached.
4. **24-session rule not followed** for Level 1 by one plan (Health Plan of Nevada in the demo).
5. **Provider-type misread:** a reviewer denies mental-health codes (e.g. 90837) for a SUAM agency (Anthem in the demo). Psyflo drafts the reconsideration citing the agency's enrollment for both SUD and mental health.
6. **Timely filing:** denials that are the plan's own delay. Psyflo tracks the filing clock per claim and keeps proof of timely submission (receipts) for reconsiderations.
7. **Inconsistent denials:** same code, same clinician, same client paid one week and denied the next.
8. Every plan has its own portal; reps change every couple of months; nobody tells the clinic when policy changes — **Psyflo's Payer playbook surfaces "what changed", learned from denials and replies.**

## Payers (keep the internal ids; change only the display data)

| id (do not change) | Display name | Short | Channel | Demo behaviour |
|---|---|---|---|---|
| `humana` | SilverSummit Healthplan | SilverSummit | fax | UDS-at-assessment rule (silent); receipts go missing |
| `anthem` | Anthem Blue Cross Blue Shield (Nevada Medicaid) | Anthem | availity | Info requests inside 24 h; new reviewer denied MH codes for SUAM |
| `sentara` | Molina Healthcare of Nevada | Molina | fax | **5 sessions at a time**; denies continued stay when abstinent |
| `aetna` | CareSource Nevada | CareSource | fax | Own PA form; wants ASAM dimension ratings on page 1 |
| `uhc` | Health Plan of Nevada (Medicaid) | HPN | portal | Not following the 24-session Level 1 rule; paste text in portal |
| `ffs` | Nevada Medicaid FFS · DHCFP | NV Medicaid FFS | portal | 24 sessions no PA at Level 1; PA from assessment at 2.1 |

Mock external sites: "Availity" stays (Anthem uses Availity); the UHC portal mock becomes the **HPN provider portal**; the DMAS lookup becomes **Nevada Medicaid eligibility (EVS) lookup**; the state incident portal can stay hidden.

## Sites / programs (the old `schools` list — keep ids)

| id | name | locality |
|---|---|---|
| LC-MS2 | Main clinic · Level 2.1 IOP | Las Vegas |
| LC-ES3 | Main clinic · Level 1 outpatient | Las Vegas |
| CC-ES1 | East Las Vegas · Level 2.1 IOP | Las Vegas |
| CC-ES2 | East Las Vegas · Level 1 outpatient | Las Vegas |
| CC-MS1 | Drug court track | Las Vegas |
| CC-HS1 | P&P / re-entry track | Henderson |

Org localities: `["Las Vegas", "Henderson"]`. The old `school_users` become **referral partners**: `rbell` = R. Bell, "Case manager · Clark County drug court"; `okafor` = Mr. Okafor, "P&P officer". The school/care-manager portal, family link, parent portal, phone app and note screens are **hidden** in this build (see registry). Do not link to hidden screens; remove or reroute such links.

## Staff (keep ids)

| id | name | credential | title | role |
|---|---|---|---|---|
| jperez | Jordan Perez | LCADC | Clinical director · signs requests | clinician |
| dowens | Dana Owens | | Billing & authorizations | admin |
| cdiaz | Carla Diaz | LCSW | Clinical supervisor | supervisor |
| khale | Kayla Hale | CADC | IOP counselor | direct_support |
| rowens | R. Owens | CADC-I | Counselor intern · new hire | direct_support |
| slane | S. Lane | LCPC | Mental health therapist | direct_support |
| jreyes | J. Reyes | PRSS | Peer recovery support specialist | direct_support |
| lortiz | Lena Ortiz | | Credentialing & billing | admin |

(Nevada credentials: LCADC, CADC, CADC-I intern, LCSW, LCPC, PRSS.)

## Clients (adults; keep ids and initials)

Every client: adult age (22–61), `school` = a site id above, no grade/IEP/guardian (use `emergency_contact` if needed), `level` "1" or "2.1", diagnosis with ICD-10 F1x.xx, referral source.

| id | who | level / payer | story |
|---|---|---|---|
| TW | Travis W., 34 | 2.1 IOP · SilverSummit (`humana`) | **Main live flow.** Referred by drug court Oct 13 (REF-118). Opioid use disorder, severe (F11.20), on buprenorphine from an outside prescriber; alcohol use disorder, moderate (F10.20). Eligibility → intake screening → ASAM assessment (UDS done at assessment) → treatment plan → initial PA R-0416 for Level 2.1, **72 units (H0015, 9/week × 8 weeks)** → sign → send. |
| MR | Maria R., 41 | 2.1 IOP · Anthem | Continued stay R-0411 drafted from 24 attended IOP days; abstinent 5 weeks inside IOP → draft argues D5. Auth 36 units, 27 used, ends Nov 13. |
| KT | Kevin T., 29 | 1 · Anthem | Initial R-0408, info requested (wants the ASAM summary). |
| DW | Darnell W., 52 | 2.1 · Molina | R-0402: requested 72, Molina offered **5 sessions** — decide; next request due after session 3. |
| R-0399 "A.L., 38" | | 2.1 · SilverSummit | Overdue decision. |
| JO | Jasmine O., 26 | step-down 2.1 → 1 · CareSource | R-0391 new initial at Level 1 after step-down. |
| TN | Tanya N., 47 | 2.1 · Molina | R-0388 continued stay denied "abstinent, no longer meets criteria" → **peer-to-peer** booked with the plan medical director. |
| EC | Eric C., 33 | 1 + MH therapy · Anthem | R-0384 denied: "provider type not eligible for 90837" (SUAM misread) → reconsideration/appeal letter. |
| SB | Sam B., 45 | 1 · HPN | Active. |
| LV | Luis V., 38 | 1 · SilverSummit | Active, past 24 sessions. |
| PG | Paula G., 58 | 1 · CareSource | Active. |
| JT, DP, AG, CB, ES, LB, AM, NK, PS, RD | IOP group members (Kayla Hale / R. Owens) | 2.1 | Background clients. |

Referrals: REF-121 A.R., 31 (self-referral, insurance step not done) · REF-120 B.K., 44 (P&P, no Medicaid on file → check, likely grant) · REF-119 S.L., 27 (hospital ED, discharge summary missing) · REF-118 T.W. (drug court) · REF-117 N.P., 36 (assessment booked) · REF-116 R.F., 50 (routed to **Ryan White / SAPTA grant** — no Medicaid, no PA).

## Words

| Old | New |
|---|---|
| CARES NYC, Harvest | Community Counseling Center of Southern Nevada / CCC of SN |
| Com Hab, Community Habilitation · H2016, TDT | Level 2.1 IOP · H0015 (or Level 1 outpatient · H0004/H0005) |
| school / site | site or program |
| student / child / individual | client |
| guardian / parent / family | client (they are adults); "emergency contact" only if needed |
| school counselor / care manager / teacher | referral partner (drug court case manager, P&P officer) |
| daily progress note / DSP | IOP group note / session note |
| CNA (comprehensive needs assessment) | ASAM assessment (6 dimensions) |
| ISP | treatment plan |
| SRA / service request | prior authorization request (PA) |
| continued stay | continued stay / reauthorization (ASAM continued-service criteria) |
| early discharge | step-down (2.1 → 1) or discharge |
| units per school day | units per IOP day (3) |
| QMHP | CADC / LCADC |
| 7-day decision standard | plan decision timeframe (per contract — confirm) |
| family link | (hidden) |
| eMedNY / DMAS | Nevada Medicaid (DHCFP) · EVS eligibility |
| OMH / state regs | Nevada Medicaid Services Manual Ch. 400 · DPBH/SAPTA certification |
| intake screening | intake screening (same) |

Timely filing in the demo: **180 days from date of service** for Nevada Medicaid FFS and each MCO (demo assumption — label "confirm per contract").

## New screens (built separately)

- **Claims & denials** (`Claims`): denial worklist with timely-filing countdowns, payer-specific denial-code decoder in plain English, "paid last week, denied this week" flags, AR aging and the bad-debt write-off trend, one-click reconsideration packets with proof of timely filing.
- **Credentialing** (`Credentialing`): per clinician NPI × Nevada Medicaid → 5 MCOs grid, days waiting, what is blocking (Medicaid letter, info request), sessions seen that cannot be billed yet.

## Rules that stay

No dead ends; nothing claims what the product cannot do (a person presses Send, a person signs, Psyflo never signs or submits on its own); demo-only controls admin-only and labelled "Demo"; synthetic data only.
