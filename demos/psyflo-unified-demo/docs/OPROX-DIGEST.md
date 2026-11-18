# Oprox screenshot digest

Source: Google Drive folder "Oprox Screenshot" (id 1VIJKtasmOVp5P4wGFEW-gp6O7okUzTC2). 43 PNGs, all dated 2026-10-19, 2:47 PM to 2:53 PM. They look like frames from one screen recording of a single demo session (a mouse cursor is visible and one frame has a dark border on the right edge).

How it was read: each image was read through the Drive text description (OCR plus image labels). Two images (2.48.31 PM and 2.50.48 PM) had empty or scrambled text, so those two were downloaded and viewed as images. Layout and colour statements in this file are firm only for those two images. For the rest they are inferred from the words, and I mark them (?).

Conventions:
- Quotes are as shown. The OCR renders most em dashes as plain hyphens, so some "-" below are probably "—".
- Patient names are written as initials. The app itself is mixed: the Case Tracker rows and the M.T. queue card show first name plus last initial, while the S.M. queue card and the S.M. detail header show a full name. Both patterns appear in the UI.
- "Jane Doe / UR Coordinator" is the logged-in staff user, not a patient. It is a placeholder name.
- OCR artifacts you will see in the raw text: "88 Authorizations" is the grid icon plus the word. "Ll/Lli Insights" is the bar-chart icon plus the word. "o Oprox" is the logo tile plus the wordmark. "Δ", "⚫" and "x" before KPI numbers and bullets are icons.

---

## 1. Navigation

### 1.1 Global left sidebar (identical on all 43 screens)

Top of sidebar: orange rounded-square logo tile with a lowercase "o", wordmark "Oprox", and a small gray subtitle "Authorization Support".

| Group label (small gray uppercase) | Items, in order (icon, label) |
|---|---|
| MAIN | Authorizations (grid icon); Denial Analysis (document icon); Live Cases (sparkle icon); Case Tracker (folder icon); Insights (bar-chart icon) |
| CUSTOMER DEMO | EHR Sync (circular sync arrows); Status Tracking (clipboard) |
| (bottom, pinned) | Settings (gear); Help (question-mark circle); Sign Out (arrow-out icon) |
| (very bottom) | User block: round avatar with initials "JD", name "Jane Doe", second line "UR Coordinator" |

- Active item: light peach/orange pill with orange icon and text. Confirmed on Case Tracker (2.50.48 image). Active state on other screens is not visible in the text.
- The sidebar is about 15% of the screen width, with a white or off-white background. A soft fade sits behind the bottom block (Settings, Help, Sign Out, user).
- "CUSTOMER DEMO" is a literal group label. EHR Sync and Status Tracking sit under it, so they read as demo-only items.
- There is no top nav bar and no breadcrumb trail in any frame. All navigation is the left sidebar plus in-page tabs.

### 1.2 In-page navigation per screen

| Screen | Page title | In-page nav, in order shown |
|---|---|---|
| Authorizations (dashboard) | "Prior Authorization Dashboard" with subtitle "Real-time monitoring and intelligent workflow automation" (seen at top in 2.47.20; later scroll positions show the queue) | Filter controls: "All Payers", "All Statuses", "All Urgency"; search box "Search patients..." |
| Authorization detail | Patient initials (S.M.) as title | Back link "← Authorizations". Tabs: "System-Identified Actions", "Clinical Trajectory", "Payer Criteria", "Risk Analysis". The last two may render as one tab "Payer Criteria / Risk Analysis" in OCR (?). Each tab has a small icon before it. |
| Live Cases (intake form) | "Live Cases" | No tabs on the form. After "Run Oprox" the results area is headed "OPROX ANALYSIS RESULTS" with tabs "Clinical Trajectory", "Payer Criteria", "Denial Prevention Actions". |
| Denial Analysis | "Denial Analysis" with subtitle "Analyze all authorization denials in one place, with clear denial insights and recommended next steps." | Numbered step "1 Upload denial letter and/or clinical documentation", then "Continue →". A step 2 block "Add any additional context (optional)" appears, then processing, then results ("Generating appeal analysis"). |
| Case Tracker | "Case Tracker" with subtitle "Review saved cases and track authorizations submitted to payers." | None. A single table card. |
| Insights | "Facility Insights" with subtitle "Learning loop analytics and performance metrics across all authorization requests" | None. Stacked cards. |

The sidebar label is "Insights" but the page title is "Facility Insights".

---

## 2. Screens

### 2.1 Authorizations / "Prior Authorization Dashboard" (2.47.13, 2.47.20, 2.50.56)

- **Top panel (2.47.20):** a two-part explainer.
  - Left, "YOUR CURRENT WORKFLOW (6 manual steps, error-prone)": 1 Log into EHR; 2 Manually copy patient data; 3 Look up payer rules; 4 Write narrative; 5 Package docs; 6 Call payer/track status.
  - Right, "WITH OPROX": "Oprox handles steps 1-5 automatically. You review and approve in minutes." / "10 enrollments. 10 IOP auths. Done before lunch." / three check-style lines: "No copy-paste errors." "No missed recertification deadlines." "No hold music."
- **Banner:** "PAYER INTELLIGENCE UPDATE" with a "+ NEW" tag. Text: "Healthfirst concurrent review denials for IOP increased 31% this week - 4 cases flagged at unit 48 with incomplete recertification documentation. Models recalibrated. Recommendation lift: 67% → 83% (≈ $28K in near-term revenue exposure mitigated)".
- **KPI strip, five counters, number plus label:** 32 CRITICAL; 128 PENDING; 245 SUBMITTED; 720 APPROVED; 61 DENIED.
- **Toolbar:** search box "Search patients..." (magnifier icon) and three plain dropdown-style filters: "All Payers", "All Statuses", "All Urgency". They are not chips (?).
- **Case Queue, heading "Case Queue" with a count "25 Cases".** Grouped sections, each with a heading and a patient count:
  - "Highest Financial Risk-Immediate Action Required" (1 patient)
  - "Due Within 24 Hours" (8 patients)
- **Case cards** (one per patient, with an "Analyze" button on the right):
  - Card 1: S.M., "Healthfirst", "NY OP" (probably "NY IOP" with a dropped letter (?)). Diagnosis line "Opioid Use Disorder, Moderate + Major Depressive Disorder (dual diagnosis)". Inline scores "DAST-10: 12", "PHQ-9: 15". Chips or text "Due in 2h", "$14,800 at risk", and a "Needs Input" badge. Narrative line: "Narrative built-IOP recertification medical necessity needs 1 clinical input to complete". Payer note: "Healthfirst requires: independent IOP medical necessity-cannot assume from PHP step-down". Lift line: "Historically improves approval by +16%".
  - Card 2: M.T., "Fidelis Care", "NY IOP". Diagnosis line "Alcohol Use Disorder, Severe + PTSD". Score "AUDIT-C: 11". "Due in 4h". Narrative line: "Narrative complete-relapse risk and trauma co-occurrence framed for Fidelis IOP continued-stay criteria". Lift line: "Historically improves approval by +12%".
- **What a user can do:** scan the urgency-ordered queue, filter, search, and click "Analyze" on a case to open the detail view (2.2).

### 2.2 Authorization detail: S.M., Healthfirst IOP (2.47.48, 2.47.56, 2.48.47, 2.48.57)

- **Header:** back link "← Authorizations". Title S.M. Subtitle "Healthfirst Intensive Outpatient Opioid Use Disorder, Moderate + Major Depressive Disorder (dual diagnosis)".
- **Header metric cards (position on the page not captured (?)):**
  - "EXPECTED APPROVAL W/ OPROX NARRATIVE" with a before-and-after value "66% → 95%" (arrow lost in OCR (?)).
  - "MODEL CONFIDENCE" with "0.91" and "Validated on similar cases".
  - Caption: "Oprox auto-prioritized this case based on revenue risk and expiration timing."
- **Disclaimer strip (warning icon):** "Decision support for authorization documentation and workflow only. Not clinical guidance."
- **Tabs:** see 1.2. The first tab, "System-Identified Actions", is active here. Intro line: "These cards describe what Oprox will build into the narrative and why each element increases approval probability."
- **Three selectable recommendation cards**, each with a checkbox, a title, bullets, a collapsible "Why this matters", and a lift badge on the right:
  1. "Document medical necessity for continued IOP level of care" (badge +16%). Bullets: "Oprox will draft continuation rationale from treatment notes and progress data" / "DAST-10: 12 PHQ-9: 15 will be incorporated-framed for Healthfirst IOP criteria" / "1 clinical input needed: confirm treatment response for Healthfirst IOP criteria". Why: "Healthfirst requires continued IOP justification with progress and remaining treatment goals."
  2. "Strengthen depressive disorder severity documentation" (badge +12%). Bullets: "Symptom severity trajectory will be documented from serial assessments" / "DAST-10: 12 PHQ-9: 15 trend will be framed for Healthfirst severity criteria" / "Functional impairment across multiple domains will be explicitly documented".
  3. "Document treatment engagement and relapse prevention planning" (badge +3%). Bullets: "Treatment attendance and participation metrics will be compiled from session records" / "Therapeutic engagement quality will be documented from clinician observations" / "Relapse prevention plan progress will be documented".
- **A small "COMPARABLE CASES" tile with "720"** sits beside the cards. Meaning is unclear (?).
- **Footer action bar:** counter text "0 of 3 recommendations included in narrative." with "Apply Selected (0)" and primary "Submit to Payer". Secondary buttons: "Refine Recommendations", "Add Clinical Context", "Dismiss Recommendations". Helper text: "Uncheck a card to exclude it from the authorization narrative. All decisions are logged."
- **State after selecting card 1 (2.48.57):** card 1 shows a "Needs Input" badge. The counter becomes "1 of 3 recommendations included in narrative." and "Apply Selected (1)". Free-text boxes appear with placeholder "Add clinical context or modification notes..." and a "Submit Modification" button.
- **What a user can do:** tick or untick narrative components, add clinician context, refine, dismiss, or submit the narrative to the payer. Every decision is logged.

### 2.3 Authorization detail, tab "Clinical Trajectory" (2.48.03)

- **"Clinical Trajectory Summary" block, key-value lines:**
  - Diagnosis line: "Opioid Use Disorder, Moderate Major Depressive Disorder (dual diagnosis)"
  - "Payer: Healthfirst"
  - "Level of Care: Intensive Outpatient"
  - "Status: Continued treatment engagement-monitoring response"
  - "Trajectory: Positive response to treatment-DAST-10 trajectory documented"
  - "Auth Readiness: Continued Intensive Outpatient medically necessary-1 input needed"
- **"Symptom & Functional Trend":** a line chart. X axis "Week 1", "Week 2", "Week 3", "Current". Legend "DAST-10", "PHQ-9". Y axis starts at 0 and reaches 12 or more. Two stat callouts: "Current DAST-10 8/12" and "Current PHQ-9 10/15".
- **"Key Drivers Identified" (bullets):** Active participation in treatment programming; MAT compliance documented; Symptom severity requiring continued structured care; Therapeutic engagement documented across modalities.
- **"Engagement & Behavioral Signals":** "Engagement Score: 79% ↑"; Attends scheduled treatment sessions consistently; Maintains IOP attendance and engagement; check-marked "Treatment compliance maintained".
- **"Risk Signals Remaining" (warning-triangle bullets):** Documentation gap identified-clinical input needed; Relapse risk remains elevated; Symptom severity not yet in sustained remission.

### 2.4 Authorization detail, tab "Payer Criteria" (2.48.13, 2.48.24)

- **Heading:** "Healthfirst. Intensive Outpatient Opioid Use Disorder, Moderate + Major Depressive Disorder (dual diagnosis)" and "What this payer requires-surfaced automatically from the Oprox intelligence database".
- **Source chips (four):** "Published medical policies", "Adjudication history", "Denial signal patterns", "FL-specific rules". "FL" is inconsistent with the NY payer, so it looks like a copy leftover.
- **Status line:** "1 item needs strengthening before submission".
- **Two comparison panels:**
  - "WITHOUT OPROX": "Manually reviewing Healthfirst policy to determine submission requirements takes hours and still leaves uncertainty about what reviewers prioritize."
  - "WITH OPROX": "Oprox surfaces exactly what Healthfirst looks for in this authorization-specific to this diagnosis, this level of care, and this state-so you submit right the first time."
- **Three metric tiles:**
  - "CHART-TO-CRITERIA MATCH" 3/4, with "75% aligned before any action taken".
  - "HISTORICAL APPROVAL RATE" 66%, with "Healthfirst intensive outpatient, this diagnosis cohort".
  - "TIME TO FULL CRITERIA VIEW" "< 10s", with "vs. hours manually".
- **"What Healthfirst Requires for Approval", "3 of 4 requirements documented".** Four rows, each with a requirement title, a status pill, and a one-line evidence note:
  1. "Healthfirst requires symptom documentation" — "Documented-Ready to Submit" — "DAST-10: 12-PHQ-9: 15 documented"
  2. "Healthfirst requires treatment goals" — "Documented-Ready to Submit" — "IOP-specific treatment objectives documented"
  3. "Healthfirst requires progress documentation" — "Documented-Ready to Submit" — "Treatment response and progress notes current"
  4. "Healthfirst requires continued care justification" — "Needs Strengthening" — "Additional clinical input needed"
- **"To Maximize Approval Probability":**
  - "WHY THIS MATTERS FOR HEALTHFIRST": "Healthfirst applies review pressure when continued care justification is not explicitly documented. Based on historical patterns, denial likelihood increases without this documentation."
  - "WHAT TO INCLUDE IN YOUR SUBMISSION": "Document continued care justification with clinical justification" (sub-line "Addresses Healthfirst's primary documentation requirement for IOP authorization"); "Reference active treatment and clinical trajectory".

### 2.5 Authorization detail, "Historical Outcomes" (probably the "Risk Analysis" tab) (2.48.31, viewed as image)

- **Header card:** "Historical Outcomes". Line "Payer: Healthfirst · Intensive Outpatient Continuation Review". Row "Comparable Case Matching:" followed by five gray chips: "Diagnosis", "Symptom Trajectory", "LOC Level", "Co-occurring Dx", "Documentation Signals".
- **Two side-by-side cards:**
  - Left, red-outlined: "Primary Historical Decision Driver". Body "continued care justification: Healthfirst applies review pressure when continued care justification is not explicitly documented. Based on historical patterns, denial likelihood increases without this documentation." Inside it a pink box "OBSERVED PATTERN IN HEALTHFIRST DECISIONS" with bullets "Cases with incomplete documentation for this criteria show elevated denial frequency" and "Pattern observed in historical Healthfirst intensive outpatient reviews".
  - Right, green-outlined: "Supporting Clinical Signals in Approved Cases", four green check rows: "Active co-occurring treatment documented", "MAT initiated with treatment response documented", "Treatment engagement and compliance documented", "Clinical metrics (DAST-10) trajectory documented".
- **"Comparable Historical Outcomes (Healthfirst Cohort)": three cards in a row.**
  - Green "Approved" pill, "Approved Case — High Similarity", bullets "Opioid Use Disorder, IOP, comparable trajectory" and "Full documentation with active treatment engagement", "Modeled Approval Likelihood: 72%".
  - Green "Approved" pill, "Approved Case — Similar Clinical Trajectory", bullets "Similar diagnosis cohort, Intensive Outpatient, criteria documented" and "Treatment response and engagement documented", "Modeled Approval Likelihood: 67%".
  - Red "Denied" pill, "Denied Case — Documentation Gap", bullets "Similar diagnosis, IOP, incomplete documentation" and "Key criteria not independently substantiated · Gap in continuation justification", "Modeled Approval Likelihood: 36%".
- **"Historical Outcome Interpretation":** "Patient trajectory aligns with approval-favorable Healthfirst intensive outpatient continuation patterns, with documentation gaps that need to be addressed. Oprox has incorporated the key signals into the narrative." Below it an amber/yellow box: "Current Historical Alignment: Approval-favorable with documentation completion" (yellow dot).

### 2.6 Live Cases: intake form (2.47.29, 2.49.06, 2.49.12, 2.49.30, 2.49.39)

- **Header:** "Live Cases". Subtitle "Submit clinical data and payer information to generate an automated authorization & denial-handling plan." Banner "HIPAA-safe mode: Common identifiers are automatically de-identified before analysis".
- **Left column:**
  - "CASE REFERENCE (INTERNAL USE ONLY-DO NOT ENTER PATIENT NAME)". Placeholder "e.g. Intake-04-06, Cottage-3-A". Demo value "IOP-UNIT-HRC-005".
  - "CLINICAL DATA". An "Upload PDF/DOCX" control and a large textarea with placeholder "Paste clinical notes including: primary diagnosis, symptoms, current functioning level, safety risk assessment, previous treatment history, and why lower levels of care have failed or are not appropriate".
- **Right column, "PAYER INFORMATION (all fields optional)":**
  - "Insurance Carrier": dropdown, placeholder "Select payer", demo value "Healthfirst (NY Medicaid)".
  - "Plan Type": placeholder "HMO, PPO, EPO...", demo value "HMO".
  - "Member ID": placeholder "ABC123456789".
  - "Group Number": placeholder "GRP-00000".
  - Small note under Member ID and Group Number: "automatically stripped before analysis".
  - "State": dropdown, demo value "New York".
  - "LEVEL OF CARE": dropdown, placeholder "Select level of care", demo value "IOP (Intensive Outpatient Program)".
  - "Payer Context (optional free-text-use this instead of, or in addition to, the dropdowns)". Placeholder "Type any payer details here: carrier name, plan, state, portal, submission requirements, criteria notes-anything you'd like considered."
  - Demo text: "Healthfirst NY Medicaid HMO. URGENT-unit expiration alert. Current authorization: 48 units approved (H0015). Units used to date: 38. Units remaining: 10. Authorization expires in 3 days. Recertification must be submitted immediately to avoid gap in authorization and loss of reimbursement for units already delivered. Patient is clinically active and ..." (text is cut off).
- **Primary button:** "Run Oprox", later "Run Oprox Analysis".
- **After the case reference is filled (2.49.39), two panels appear:**
  - "AUTHORIZATION STATUS" (red "URGENT:" lead-in): "Current auth: 48 units approved (H0015)", "Units used: 38 of 48", "Units remaining: 10", "Authorization expiration: 3 days from today", "Action required: Recertification submission due NOW - failure to submit before unit expiration results in loss of reimbursement for all sessions delivered after unit 48. Payer will not backdate authorization."
  - "ADMISSION SUMMARY:" with a "DE-IDENTIFIED PREVIEW" label.

### 2.7 Live Cases: analysis running (2.49.43)

Panel "OPROX ANALYSIS RESULTS" with a streaming checklist. Completed items have a check mark, in-progress items have a dot:
- "Identifying payer and plan type..."
- "Searching live payer criteria for Healthfirst (NY Medicaid)..."
- "Analyzing clinical documentation against medical necessity criteria... Identifying documentation gaps..."
- "Drafting authorization request language..."
- "Building denial prevention strategy..."
- Footer "Analyzing..."

### 2.8 Live Cases: results, tab "Clinical Trajectory" (2.49.50)

- **Left summary rows, label in small caps plus value:**
  - "DIAGNOSIS": "IOP (Intensive Outpatient Program)" (as read; the label and value look mismatched in OCR (?))
  - "PAYER": "Healthfirst (NY Medicaid)"
  - "STATE": "New York"
  - "STATUS": "Stable with Active Treatment Response"
  - "TRAJECTORY": "Improving Medications Not Yet Therapeutic"
  - "AUTH READINESS": "URGENT-Unit Expiration in 3 Days"
  - "LEVEL OF CARE": "IOP (Intensive Outpatient Program)"
  - "CASE REFERENCE": "IOP-UNIT-HRC-005"
- **Narrative:** "44-year-old female with Alcohol Use Disorder, Severe and Major Depressive Disorder, Recurrent. Relapsed after 8 months sobriety following job loss and housing stress. Single mother of two with no adult support evenings/weekends. Currently Week 5 of IOP with 97% attendance and complete sobriety maintained (EtG negative x10 sessions)."
- **"Key Drivers Identified":**
  - "Sertraline Week 5 of 6-8 week therapeutic window-primary antidepressant not yet at full effect"
  - "Naltrexone Week 4 of 4-6 week window- anti-craving protection not fully established"
  - "GAD-7 score 11 remains above clinical threshold of 10-anxiety documented as primary alcohol trigger"
- **"Engagement & Behavioral Signals":**
  - "97% group attendance (29 of 30 sessions) and 100% individual session attendance"
  - "Complete sobriety maintained throughout IOP -EtG negative x10 sessions"
  - "Self-referred and has not missed a single session since admission"
- **"Symptom & Functional Trend":** line chart with Y axis ticks 20, 15, 10 and so on.
- **"Risk Signals Remaining":**
  - "4-point discrepancy between self-reported cravings (2/10) and clinician-assessed relapse risk (6/10) indicates impaired insight"
  - "Lives alone with children evenings/weekends with no adult support during highest-risk..." (cut off)

### 2.9 Live Cases: results, tab "Payer Criteria" (2.50.05, 2.50.31)

- **Heading:** "Healthfirst (NY Medicaid) IOP (Intensive Outpatient Program) - Alcohol Use Disorder, Severe; Major Depressive Disorder, Recurrent". Subline "What this payer requires-surfaced from current published policy and Oprox payer intelligence".
- **Source chips (three):** "Published medical policies", "Denial signal patterns", "State-specific rules".
- **Status:** "All criteria documented-ready to submit". Same WITHOUT OPROX / WITH OPROX panels as 2.4, with "Healthfirst (NY Medicaid)" substituted.
- **Tiles:**
  - "CHART-TO-CRITERIA MATCH" 3/3, "criteria currently met"
  - "TIME TO FULL CRITERIA VIEW" "<30s", "vs hours manually"
  - "SUBMISSION METHOD": "LOCADTR 3.0 (NY Medicaid behavioral health LOC tool)" and "for this payer"
- **"What Healthfirst (NY Medicaid) Requires for Approval", three requirements, each "Documented-Ready to Submit" with an evidence sentence:**
  1. "LOCADTR 3.0 requires documented clinical instability or active symptomatology justifying continued IOP intensity" — "GAD-7 score 11 (above clinical threshold of 10), PHQ-9 score 12 (moderate depression), anxiety documented as primary alcohol trigger in 7 of 10 session notes, clinician-assessed relapse risk 6/10 despite patient self-report of 2/10 indicating impaired insight"
  2. "Healthfirst requires evidence that treatment is effective and patient is responding to current level of care" — "Complete sobriety maintained throughout IOP (EtG negative x10 sessions), 97% group attendance, PHQ-9 decreased from 18 to 12, GAD-7 decreased from 15 to 11, patient engaged and motivated"
  3. "NY Medicaid requires justification for why step-down is not yet clinically appropriate" — "Sertraline Week 5 of 6-8 week therapeutic window (not yet at full effect), Naltrexone Week 4 of 4-6 week window (anti-craving protection not fully established), no step-down placement secured, lives alone with children and no adult support during evening/weekend high-risk periods"

### 2.10 Live Cases: results, tab "Denial Prevention Actions" (2.50.09, 2.50.23, 2.50.40)

- **Intro:** "These cards describe what Oprox will build into the narrative and why each element increases approval probability."
- **Card 1, red "Urgent" badge, title "URGENT-UNIT EXPIRATION IN 3 DAYS":**
  - "Authorization expires in 3 days with 10 units remaining and patient actively attending sessions"
  - "Healthfirst will not backdate authorization-any sessions delivered after unit 48 without approved recertification will result in permanent loss of reimbursement"
  - "Recertification must be submitted immediately using LOCADTR 3.0 tool for NY Medicaid behavioral health"
  - "This is an administrative deadline, not a clinical discharge-patient is engaged, improving, and clinically appropriate for continued IOP"
  - Expanded "Why this matters": "Failure to submit recertification before unit expiration creates immediate financial exposure for all sessions already scheduled and delivered after unit 48. This change ensures the recertification accurately and completely reflects the clinical picture in language that meets Healthfirst NY Medicaid's published medical necessity criteria for IOP continuation using LOCADTR 3.0. The goal is accurate representation of clinical facts, not optimization beyond what the clinical record supports."
- **Card 2, "Frame Medication Titration Windows as Primary Medical Necessity Anchor":**
  - "Sertraline requires 6-8 weeks to reach therapeutic effect-patient is currently Week 5, meaning the primary antidepressant treating MDD (documented relapse driver) has not yet taken full effect"
  - "Naltrexone requires 4-6 weeks for full anti-craving protection-patient is currently Week 4, meaning pharmacological relapse prevention is not yet fully established"
  - "Discharging before either medication reaches therapeutic effect removes both psychiatric stabilization and relapse prevention before clinical benefit is confirmed"
  - "Recertification through Week 8 minimum is medically necessary to monitor medication response and ensure therapeutic effect before transitioning to lower level of care"
- **Card 3, "Surface Impaired Insight as Safety Risk Using Documented Craving Discrepancy":**
  - "Patient self-reports cravings at 2/10 while clinical assessment places relapse risk at 6/10 - a 4-point discrepancy indicating impaired insight and unreliable self-assessment"
  - "This gap demonstrates the patient cannot accurately evaluate their own vulnerability, making step-down to unsupported outpatient care clinically unsafe at this time"
  - "Anxiety-driven alcohol urge pattern documented in 7 of 10 session notes with evening/weekend..." (cut off)
- **Footer buttons:** "Refine Recommendations", "Add Clinical Context", "Dismiss Recommendations", and primary "Submit to Payer". Same set as 2.2.

### 2.11 Case Tracker (2.50.48, viewed as image)

- **Title:** "Case Tracker", gray subtitle "Review saved cases and track authorizations submitted to payers."
- **Single white card.** Header row: "ACTIVE AUTHORIZATIONS" in bold uppercase plus a gray "(8 tracked)". Right-aligned in red: "2 recertifications due".
- **Table columns, in order:** "#" | "PATIENT" | "PAYER" | "DIAGNOSIS" | "UNITS APPROVED" | "UNITS USED" | "UNITS REMAINING" | "AUTH EXPIRES" | "STATUS". Headers are small gray uppercase, and the three unit columns are right-aligned.
- **Rows, all synthetic:**

| # | Patient | Payer | Diagnosis | Units approved | Units used | Units remaining | Auth expires | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | M.R. | Healthfirst | AUD + MDD | 48 | 38 | 10 | Oct 1 · 3 days | Recertification Due |
| 2 | S.P. | Fidelis Care | AUD + PTSD | 72 | 60 | 12 | Oct 2 · 4 days | Recertification Due |
| 3 | J.T. | MetroPlus | OUD + PTSD | 72 | 48 | 24 | Oct 6 · 8 days | Recertification Soon |
| 4 | D.M. | EmblemHealth | PTSD + Cannabis UD | 48 | 30 | 18 | Oct 4 · 6 days | Recertification Soon |
| 5 | A.V. | Molina Medicaid | MDD + AUD | 96 | 12 | 84 | Oct 30 · 32 days | Current |
| 6 | L.G. | Fidelis Care | AUD + GAD | 96 | 44 | 52 | Oct 16 · 18 days | Current |
| 7 | K.W. | Healthfirst | OUD + MDD | 48 | – | – | – | Awaiting Approval |
| 8 | R.N. | WellCare NY | Cannabis UD + GAD | – | – | – | – | Appeal In Progress |

- **Cell patterns:** the Auth Expires cell is "date · N days" (for example "Oct 1 · 3 days", relative part in lighter gray). Missing values are an en dash. Long names and diagnoses wrap to two lines. Status is a colour-dot pill (see section 4).
- **What a user can do:** read at a glance which authorizations need recertification; row click behaviour is not shown (?).

### 2.12 Denial Analysis: upload and processing flow (2.51.01, 2.51.08, 2.51.13, 2.51.18, 2.51.22, 2.51.27, 2.51.31)

- **Step 1, "Upload denial letter and/or clinical documentation":** "Either file is enough to start. Missing pieces can be filled in by hand on the next step." Two upload tiles, "Denial letter" and "Clinical documentation", each with placeholder "Click to choose a PDF, DOCX, or TXT file". Button "Continue →" with helper "Upload at least one document to continue." Demo files: "Denial 2 - Denial Letter.docx" and "Denial 2 - Clinical Info.docx".
- **Step 2, "Add any additional context (optional)":** "Anything not in the denial letter-payer call notes, internal commentary, etc." Textarea shows "(no additional context provided)".
- **"Combining inputs into a sanitized clinical record"** panel, "Sanitized clinical record", with a note "All patient identifiers automatically removed before analysis". Contents:
  - "DENIAL LETTER - Denial 2 PATIENT.docx"
  - "FROM: EmblemHealth GHI - PATIENT"
  - "RE: PATIENT Intensive Outpatient Program (IOP)"
  - "SERVICE: H0015 Intensive Outpatient Program"
  - "REQUESTED: 96 units"
  - "APPROVED: 48 units"
  - "REVENUE AT RISK: approximately $10,000"
  - "DECISION: PARTIAL APPROVAL" / "48 units (H0015) are approved for the current authorization period." / "RATIONALE: Clinical documentation reviewed indicates that the member has demonstrated initial engagement and stability in treatment. Continued Intensive Outpatient services beyond 48 units are not supported at this time."
- **"Reading and digesting the record"** streaming log, one line per step:
  - "Parsing clinical record structure..."
  - "Reading denial rationale & treatment timeline..."
  - "Scanning therapist DAP note (03/17)..."
  - "Flagging craving vs. clinical impression discrepancy..."
  - "Reviewing psychiatrist's clinical judgment (03/18)..."
  - "Cross-referencing nursing note & ASAM dimensions..."
  - "Scanning medication timeline (atomoxetine titration)...."
  - "Validating diagnoses against ICD-10..."
  - "Mapping against Cigna ASAM Level 3.5 criteria..."
- **"Cross-referencing historical appeals data"** log (first run, see the inconsistency note in section 6.3):
  - "Querying 1,247 prior Cigna ASAM 3.5 residential appeals..."
  - "Filtering by denial rationale: 'medical necessity / step-down'..."
  - "Found 312 analogous cases-78% reversed on first-level appeal"
  - "Strongest leverage: PAWS framing + D6 environment + medication titration"
  - "Loading appeal strategy template tuned for Cigna medical directors..."
- **Later log lines (EmblemHealth case):**
  - "Assessing step-down readiness-Clinical record explicitly states 'no established outpatient providers to step down to' and 'no step-down infrastructure exists.' First-time engager, no family contact, no support network."
  - "Analyzing clinical scores-PCL-5 of 51 is 55% above threshold (33), GAD-7 of 12 exceeds threshold (10), PHQ-9 of 14 in moderate range. All three disorders remain clinically significant."
  - "Identifying payer error-EmblemHealth conflates early engagement (92% group attendance, 4 of 8 sessions) with clinical stability. Objective scores contradict 'stability' assertion."
  - "Calculating revenue at risk-Approximately $10,000 for remaining 48 units (units 49-96), representing Weeks 3-4 of planned treatment course."
  - "Cross-referencing EmblemHealth GHI IOP appeals -Historical data suggests this payer frequently applies arbitrary unit caps (commonly 48-60 units) for IOP authorizations regardless of clinical complexity."
  - "Reviewing NY Medicaid HMO IOP denials-Benchmark data indicates approximately 60-65% overturn rate on peer-to-peer review when trauma-focused treatment interruption is primary argument."
  - "Analyzing PTSD + SUD co-occurring appeals - Historical cases show strong success rate (70-75%) when emphasizing that substance use is secondary to untreated psychiatric disorder and evidence-based trauma therapy not yet initiated."
  - "Examining medication stabilization arguments-Appeals citing incomplete medication titration during SSRI response window (Weeks 2-8) show approximately 55-60% success rate when combined with other clinical factors."
  - "Reviewing first-time treatment engager cases-Historical data suggests payers are more likely to approve continued care (65-70% success rate) when lack of step-down infrastructure is explicitly documented and patient has no prior treatment history."

### 2.13 Denial Analysis: appeal analysis result (2.51.31 to 2.52.12)

Long single-column document, in this order:
1. **"Generating appeal analysis" / "DENIAL RATIONALE":** "EmblemHealth GHI partially approved 48 of 96 requested IOP units, stating that 'clinical documentation reviewed indicates that the member has demonstrated initial engagement and stability in treatment' and that 'continued Intensive Outpatient services beyond 48 units are not supported at this time,' recommending step-down to standard outpatient services. The payer's rationale conflates early engagement with clinical stability and readiness for discharge, despite ongoing symptom severity and incomplete treatment of the primary diagnosis."
2. **"Core Clinical Synthesis":** "This 27-year-old female with PTSD (PCL-5: 58-51, threshold 33), moderate cannabis use disorder, and major depression is in her first-ever behavioral health treatment episode. After two weeks (48 units), she shows initial engagement but remains clinically unstable: PCL-5 score of 51 is 55% above clinical threshold, GAD-7 of 12 exceeds threshold of 10, PHQ-9 of 14 indicates moderate depression, and cannabis abstinence is not established (UDS positive in 2 of 4 tests, use 3-4x/week). Critically, trauma-focused CPT therapy-the evidence-based intervention for her primary PTSD diagnosis-is scheduled to begin Week 3 (unit 49), exactly when the payer proposes discharge. Neither medication has reached therapeutic effect (sertraline at Week 2 of 6-8 week window; prazosin requires Week 3 titration for nightmares). No outpatient step-down infrastructure exists for this first-time treatment engager with no family contact or support network."
3. **"Why This Denial Is Contestable"**, with a progress line "Drafting finding 3 of 6..." while streaming. Findings, each with a severity tag, a bold title and a paragraph:
   - "CRITICAL Trauma-Focused Treatment Not Yet Initiated-Discharge at Point of Clinical Necessity". Paragraph cites "PCL-5: 51, 55% above clinical threshold of 33", "Cognitive Processing Therapy (CPT)", "scheduled to begin Week 3 (unit 49)", "Cannabis use (3-4x/week, UDS positive in 50% of tests)", "clinician-observed craving 7/10 vs. self-report 3/10".
   - "CRITICAL Medications Not at Therapeutic Effect-Premature Discharge During Titration Phase". Paragraph cites "Sertraline 50mg is at Week 2 of the standard 6-8 week response assessment period", "Prazosin 1mg QHS for PTSD nightmares is documented as 'not yet effective,' with dose increase to 2mg planned for Week 3", "'Sertraline response assessment Week 4'-which falls within the denied units 49-96".
   - "CRITICAL No Step-Down Infrastructure for First-Time Treatment Engager". Paragraph cites "'no established outpatient providers to step down to'", "'no step-down infrastructure exists'", "no family contact and no support network, living with a roommate", and "EmblemHealth's recommendation to 'step down to standard outpatient services upon completion of the approved units'".
   - "STRONG Persistent Symptom Severity Across All Diagnostic Domains at Week 2". Paragraph cites "PCL-5 decreased from 58 to 51", "PHQ-9 of 14 (down from 16) remains in the moderate depression range (10-14)", "GAD-7 of 12 (down from 14)".
   - "STRONG Cannabis Abstinence Not Established - Active Substance Use Disorder Untreated". Paragraph cites "reduced cannabis use from daily to 3-4 times per week", "UDS results show 2 positive and 2 negative tests in Week 2 (50% positive rate)", and "'will not resolve without concurrent PTSD treatment'" (text cut off).
   - A sixth finding is announced ("finding 3 of 6") but only the five above are captured.
4. **"All six ASAM dimensions support continued stay"**, six paragraphs, each led by a dot and a dimension label:
   - "D1 Acute Intoxication and/or Withdrawal Potential" — "Cannabis use reduced from daily to 3-4x/week; UDS positive in 2 of 4 tests (Week 2). No withdrawal symptoms documented. Cannabis craving clinician-observed at 7/10, though patient self-reports 3/10 due to not recognizing PTSD-driven urges as craving. Active use continues without established abstinence."
   - "D2 - Biomedical Conditions and Complications" — "Two psychotropic medications prescribed but neither at therapeutic effect. Sertraline 50mg at Week 2 of 6-8 week response window. Prazosin 1mg QHS documented as 'not yet effective' for PTSD nightmares, with dose increase to 2mg planned Week 3. Medication stabilization incomplete."
   - "D3 Emotional, Behavioral, or Cognitive Conditions and Complications" — "PTSD (PCL-5: 51, 55% above threshold of 33), Major Depressive Disorder (PHQ-9: 14, moderate range), and Generalized Anxiety (GAD-7: 12, above threshold of 10). Trauma-focused CPT therapy not yet initiated, scheduled Week 3. Patient is survivor of sexual assault (2022) and childhood trauma. All three psychiatric conditions remain clinically significant at Week 2."
   - "D4 Readiness to Change" — "High engagement in first-ever treatment episode: 92% group attendance (11 of 12 sessions), 4 of 8 individual sessions completed in two weeks. Patient has reduced cannabis use from daily to 3-4x/week. However, patient does not yet recognize PTSD-driven cannabis use as craving (self-report 3/10 vs. clinician-observed 7/10), indicating incomplete insight into substance use disorder."
   - "D5 Relapse, Continued Use, or Continued Problem Potential" — "Very high relapse risk. Cannabis use continues 3-4x/week as primary coping mechanism for untreated PTSD symptoms. ... Trauma-focused therapy not yet initiated. No established outpatient providers for step-down. No family contact or support network. First-time treatment engager with no external infrastructure."
   - "D6 Recovery/Living Environment" — "Lives with roommate; support capacity of roommate not documented. No family contact. No support network documented. Part-time employment. First-ever behavioral health treatment engagement with no established outpatient providers or step-down infrastructure. Recovery environment lacks external supports to sustain gains or prevent relapse upon discharge."
5. **"What Oprox Would Do"**, a numbered list of six appeal actions:
   1. "Request Immediate Peer-to-Peer Review-Challenge 'Stability' Mischaracterization": "Initiate peer-to-peer review within 60 days per EmblemHealth's appeal rights notice. The reviewing physician should directly challenge the payer's assertion that the patient has achieved 'stability.' Present objective clinical scores..."
   2. "Emphasize Trauma-Focused Treatment Not Yet Initiated-Evidence-Based Care Interrupted"
   3. "Document Medication Stabilization Incomplete-Premature Discharge During Titration" ("Request approval through Week 4 at minimum to complete the medication stabilization protocol and assess therapeutic response.")
   4. "Challenge Step-Down Recommendation-No Infrastructure for First-Time Engager" ("Request that EmblemHealth either approve continued IOP or provide specific, contracted step-down resources before discharge.")
   5. "Cite ASAM Criteria and NY Medicaid IOP Standards-Level of Care Medically Necessary": "Reference ASAM Criteria Dimension 3 (severe PTSD, PCL-5: 51), Dimension 2 (medication stabilization incomplete), and Dimension 5 (high relapse risk with no step-down infrastructure)... Request that the payer apply its own published criteria consistently rather than imposing arbitrary unit caps that interrupt medically necessary care."
   6. "Submit Detailed Treatment Plan for Units 49-96-Demonstrate Medical Necessity": "Provide a granular treatment plan for Weeks 3-4 (units 49-96) showing specific clinical interventions: CPT trauma-focused therapy initiation Week 3, prazosin titration to 2mg Week 3, sertraline response assessment Week 4, continued UDS monitoring to establish abstinence, and development of step-down plan with identified outpatient providers."

### 2.14 Insights: "Facility Insights" (2.52.22, 2.52.29, 2.52.48, 2.53.10)

- **KPI row, four tiles, small uppercase label, big number, caption:**
  - "AVG APPROVAL RATE" 50%, "+35% this month"
  - "TOP DENIAL CAUSE" "Incomplete recertification", "142 cases"
  - "RECOMMENDATION IMPACT" 84%, "Success when applied"
  - "AUTONOMY RATE" 75%, "No human override"
- **"Approval Rate by Payer":** one bar per payer, six payers listed top to bottom (horizontal bars (?)): Fidelis Care, Healthfirst, MetroPlus, EmblemHealth, Molina Medicaid, WellCare. Bar values are not captured.
- **"Common Denial Reasons by Payer"**, table columns "DENIAL REASON" | "PAYER" | "COUNT" | "% OF DENIALS". Whether the denial-reason rows are numbered is unclear (?). Denial reasons, in list order:
  1. "IOP medical necessity not established over standard outpatient"
  2. "Recertification submitted past filing window"
  3. "Partial approval - units reduced without clinical rationale"
  4. "Co-occurring disorder not documented as requiring IOP level"
  5. "LOCADTR 3.0 criteria not addressed in clinical documentation"
  Payer, count and % columns, in order: Fidelis Care 89 29%; Healthfirst 74 24%; MetroPlus 61 20%; EmblemHealth 48 15%; Molina Medicaid 39 13%. The row-by-row pairing of reason to payer is not certain (?).
- **"Most Impactful System Actions"**, numbered 1 to 4, each with "Applied N times" on the left and a green "% SUCCESS RATE" tag on the right:
  1. "Document LOCADTR 3.0 criteria explicitly across all dimensions" — "Applied 389 times" — "91% SUCCESS RATE"
  2. "Flag and appeal partial unit approvals before filing window closes" — "Applied 312 times" — "88% SUCCESS RATE"
  3. "Frame co-occurring disorder as independently requiring IOP level of care" — "Applied 276 times" — "85% SUCCESS RATE"
  4. "Include recertification documentation 72 hours before unit expiration" — "Applied 198 times" — "83% SUCCESS RATE"
- **"Override Patterns & Success Rates":** three rows. "No Override Needed 156 - 89% success", "Partial Override 46 - 76% success", "Full Override 6 - 45% success". The number before the dash is probably a case count (156/(156+46+6) = 75%, which matches the AUTONOMY RATE tile), but the exact separator is unclear (?).

---

## 3. Substance-use-specific content (as shown)

**Absent from all 43 screenshots:** any ICD-10 or DSM-5 code (no F10 to F19 codes), H0001, H2035, S9480, 90837, buprenorphine, methadone, CIWA, COWS, any named form or consent document, withdrawal management or detox level of care, and any Nevada reference. ICD-10 appears only as a process step: "Validating diagnoses against ICD-10...".

### 3.1 Levels of care (wording as shown)
- "IOP (Intensive Outpatient Program)", "Intensive Outpatient", "IOP". The Live Cases dropdown shows "Select level of care" and, once picked, "IOP (Intensive Outpatient Program)". The dropdown options themselves are not visible.
- "PHP" appears once: "independent IOP medical necessity-cannot assume from PHP step-down".
- "standard outpatient services", "standard outpatient", "unsupported outpatient care", "lower level of care".
- "Cigna ASAM Level 3.5 criteria", "Cigna ASAM 3.5 residential appeals", in the processing log only (see 6.3).
- "LOC Level" as a chip label; "LOC tool".

### 3.2 ASAM and criteria tools
- ASAM six dimensions, exact labels: "D1 Acute Intoxication and/or Withdrawal Potential"; "D2 - Biomedical Conditions and Complications"; "D3 Emotional, Behavioral, or Cognitive Conditions and Complications"; "D4 Readiness to Change"; "D5 Relapse, Continued Use, or Continued Problem Potential"; "D6 Recovery/Living Environment". Section heading: "All six ASAM dimensions support continued stay". Also "Cross-referencing nursing note & ASAM dimensions...", "ASAM Criteria Dimension 3 / 2 / 5", "Strongest leverage: PAWS framing + D6 environment + medication titration".
- "LOCADTR 3.0 (NY Medicaid behavioral health LOC tool)" is shown as the "SUBMISSION METHOD". Related phrases: "LOCADTR 3.0 criteria not addressed in clinical documentation", "Document LOCADTR 3.0 criteria explicitly across all dimensions", "Recertification must be submitted immediately using LOCADTR 3.0 tool for NY Medicaid behavioral health".

### 3.3 Diagnoses (wording as shown)
- Full names: "Opioid Use Disorder, Moderate"; "Alcohol Use Disorder, Severe"; "Major Depressive Disorder"; "Major Depressive Disorder, Recurrent"; "moderate cannabis use disorder"; "PTSD"; "Generalized Anxiety" (GAD).
- Label: "(dual diagnosis)", "co-occurring", "Active co-occurring treatment documented", "Co-occurring Dx", "Co-occurring disorder not documented as requiring IOP level", "PTSD + SUD co-occurring appeals".
- Tracker abbreviations: "AUD + MDD", "AUD + PTSD", "OUD + PTSD", "PTSD + Cannabis UD", "MDD + AUD", "AUD + GAD", "OUD + MDD", "Cannabis UD + GAD".

### 3.4 Procedure and service codes, units
- "H0015" is the only code: "Current authorization: 48 units approved (H0015)", "SERVICE: H0015 Intensive Outpatient Program", "48 units (H0015) are approved for the current authorization period."
- Units are the authorization currency: "48 units approved", "Units used: 38 of 48", "Units remaining: 10", "REQUESTED: 96 units", "APPROVED: 48 units", "units 49-96", "after unit 48". Unit counts are tied to weeks: "After two weeks (48 units)", "Weeks 3-4 (units 49-96)".

### 3.5 Screening instruments and testing
- "DAST-10: 12" (trend "8/12" in the chart callout), "PHQ-9: 15" (trend "10/15"), "AUDIT-C: 11", "GAD-7 score 11 (above clinical threshold of 10)", "PCL-5: 58-51, threshold 33".
- "EtG negative x10 sessions" (alcohol biomarker), "UDS positive in 2 of 4 tests", "UDS positive in 50% of tests", "continued UDS monitoring to establish abstinence".
- Clinician craving vs self-report: "self-reported cravings (2/10) and clinician-assessed relapse risk (6/10)"; "clinician-observed craving 7/10 vs. self-report 3/10". Process-log phrase: "Flagging craving vs. clinical impression discrepancy...".

### 3.6 Medications and treatment
- "Sertraline Week 5 of 6-8 week therapeutic window"; "Sertraline 50mg ... Week 2"; "Naltrexone Week 4 of 4-6 week window"; "Prazosin 1mg QHS ... dose increase to 2mg planned for Week 3"; "atomoxetine titration" (processing log only).
- "MAT compliance documented"; "MAT initiated with treatment response documented".
- Therapies: "Cognitive Processing Therapy (CPT)", "trauma-focused CPT therapy". Documentation types: "therapist DAP note (03/17)", "psychiatrist's clinical judgment (03/18)", "nursing note".
- Concepts: "medication titration windows", "relapse prevention plan", "treatment attendance and participation metrics", "Relapse prevention plan progress will be documented".

### 3.7 Discharge, step-down and continued-stay language
- "continued IOP", "continued stay", "continued-stay criteria", "continued care justification", "IOP continuation".
- "step-down", "no step-down placement secured", "'no established outpatient providers to step down to'", "'no step-down infrastructure exists'", "step down to standard outpatient services upon completion of the approved units", "transitioning to lower level of care".
- "This is an administrative deadline, not a clinical discharge".
- "Discharging before either medication reaches therapeutic effect..."; "Premature Discharge During Titration Phase"; "Discharge at Point of Clinical Necessity".
- "Recertification through Week 8 minimum".
- "PAWS framing" (post-acute withdrawal syndrome) appears only in the log line.

### 3.8 Authorization, recertification and appeal fields and wording
- "Recertification submission due NOW"; "Payer will not backdate authorization"; "loss of reimbursement for all sessions delivered after unit 48"; "permanent loss of reimbursement"; "Authorization expiration: 3 days from today"; "Include recertification documentation 72 hours before unit expiration".
- "REVENUE AT RISK: approximately $10,000"; "$14,800 at risk"; "$28K in near-term revenue exposure mitigated".
- "DECISION: PARTIAL APPROVAL"; "partial unit approvals"; "arbitrary unit caps (commonly 48-60 units)"; "peer-to-peer review"; "peer-to-peer review within 60 days per EmblemHealth's appeal rights notice"; "first-level appeal"; "filing window"; "Flag and appeal partial unit approvals before filing window closes".
- "concurrent review denials", "Healthfirst concurrent review denials for IOP".

### 3.9 Payers named (all synthetic or demo)
Healthfirst (also "Healthfirst (NY Medicaid)", "Healthfirst NY Medicaid HMO"); Fidelis Care; MetroPlus; EmblemHealth (also "EmblemHealth GHI"); Molina Medicaid; WellCare NY (also "WellCare"); Cigna (log lines only). Plan type shown: "HMO". The form hint lists "HMO, PPO, EPO...". State: "New York".

### 3.10 Denial reasons (Insights table, verbatim)
"IOP medical necessity not established over standard outpatient"; "Recertification submitted past filing window"; "Partial approval - units reduced without clinical rationale"; "Co-occurring disorder not documented as requiring IOP level"; "LOCADTR 3.0 criteria not addressed in clinical documentation". Top cause tile: "Incomplete recertification" (142 cases).

### 3.11 Synthetic example records
- Queue case: S.M., Healthfirst, OUD Moderate + MDD, DAST-10 12, PHQ-9 15, due in 2h, $14,800 at risk.
- Queue case: M.T., Fidelis Care, AUD Severe + PTSD, AUDIT-C 11, due in 4h.
- Live Cases demo case "IOP-UNIT-HRC-005": 44-year-old female, AUD Severe + MDD Recurrent, Healthfirst NY Medicaid HMO, 48 units H0015, 38 used, 10 remaining, expires in 3 days, sertraline Week 5, naltrexone Week 4, EtG negative x10, 97% group attendance (29 of 30), PHQ-9 18 to 12, GAD-7 15 to 11.
- Denial Analysis demo case ("Denial 2"): 27-year-old female, PTSD + moderate cannabis use disorder + major depression, EmblemHealth GHI, IOP H0015, requested 96, approved 48, PCL-5 58 to 51, PHQ-9 16 to 14, GAD-7 14 to 12, sertraline 50mg, prazosin 1mg QHS, CPT scheduled Week 3, first-ever treatment episode.
- Case Tracker: 8 rows (section 2.11).

---

## 4. Status vocabulary

Colours are firm only where marked "(image)", which means I viewed the screenshot. Everything else comes from the words in the OCR.

| Where | Label | Look and meaning |
|---|---|---|
| Case Tracker, status pill | "Recertification Due" | Red dot, red text, pale red pill (image). Overdue or imminent, 3 to 4 days. |
| Case Tracker | "Recertification Soon" | Yellow dot, amber text, pale yellow pill (image). 6 to 8 days out. |
| Case Tracker | "Current" | Green dot, dark text, no tinted pill (image). Auth healthy (18 to 32 days left). |
| Case Tracker | "Awaiting Approval" | Blue dot, blue text, pale blue pill (image). Submitted, no decision yet. |
| Case Tracker | "Appeal In Progress" | Orange dot, orange text, pale orange pill (image). Post-denial. |
| Case Tracker header | "2 recertifications due" | Red text, right-aligned in the table header (image). |
| Dashboard KPI strip | CRITICAL / PENDING / SUBMITTED / APPROVED / DENIED | Counts 32 / 128 / 245 / 720 / 61. Colours not captured (?). |
| Dashboard card | "Needs Input" | Badge. Colour not captured (?). Means a clinical input is still required. |
| Dashboard card | "Due in 2h", "Due in 4h", "$14,800 at risk" | Urgency and money chips. Colours not captured (?). |
| Dashboard group headings | "Highest Financial Risk-Immediate Action Required", "Due Within 24 Hours" | Priority groups with patient counts. |
| Payer criteria rows | "Documented-Ready to Submit" | Positive status pill (green (?)). |
| Payer criteria rows | "Needs Strengthening" | Warning status pill (amber or orange (?)). |
| Payer criteria header | "All criteria documented-ready to submit"; "1 item needs strengthening before submission" | Summary line. |
| Historical outcome cards | "Approved" | Green pill; the whole card has a green tint (image). |
| Historical outcome cards | "Denied" | Red pill; the whole card has a red tint (image). |
| Historical outcomes | "Primary Historical Decision Driver" card | Red outline, pink inner box (image). |
| Historical outcomes | "Supporting Clinical Signals in Approved Cases" card | Green outline, green check rows (image). |
| Historical outcomes | "Current Historical Alignment: Approval-favorable with documentation completion" | Amber/yellow box with a yellow dot (image). |
| Denial prevention card | "Urgent" | Red badge (?). |
| Appeal findings | "CRITICAL" and "STRONG" | Severity tags in front of finding titles. Colours not captured (?). |
| Clinical trajectory | "Stable with Active Treatment Response"; "Improving Medications Not Yet Therapeutic"; "URGENT-Unit Expiration in 3 Days" | Free-text status fields (STATUS / TRAJECTORY / AUTH READINESS). |
| Insights | "% SUCCESS RATE" tags (91%, 88%, 85%, 83%) | Green tags (?). |
| Insights | "No Override Needed", "Partial Override", "Full Override" | Three tiers of human-override level. |
| Live Cases | "DE-IDENTIFIED PREVIEW" | Label on the admission summary. |
| Streaming logs | check mark vs dot | Check = step done, dot = in progress. |
| Dashboard / detail | "+16%", "+12%", "+3%", "Historically improves approval by +12%" | Lift badges, shown as small trending-up arrow plus percent. |
| Detail header | "MODEL CONFIDENCE 0.91"; "66% → 95%" expected approval | Metric cards, no status colour captured (?). |

---

## 5. Data fields

### 5.1 Authorization request (Live Cases form)
| Field label | Control and sample |
|---|---|
| CASE REFERENCE (INTERNAL USE ONLY-DO NOT ENTER PATIENT NAME) | Text, e.g. "Intake-04-06, Cottage-3-A"; demo "IOP-UNIT-HRC-005" |
| CLINICAL DATA | "Upload PDF/DOCX" plus pasted notes textarea |
| Insurance Carrier | Dropdown, "Select payer"; "Healthfirst (NY Medicaid)" |
| Plan Type | Text or dropdown, "HMO, PPO, EPO..."; "HMO" |
| Member ID | Text, "ABC123456789" (sample); "automatically stripped before analysis" |
| Group Number | Text, "GRP-00000" (sample); "automatically stripped before analysis" |
| State | Dropdown, "New York" |
| LEVEL OF CARE | Dropdown, "Select level of care"; "IOP (Intensive Outpatient Program)" |
| Payer Context | Free text (optional): carrier name, plan, state, portal, submission requirements, criteria notes |
| Authorization status block | Current auth (units approved plus code, "48 units approved (H0015)"), Units used ("38 of 48"), Units remaining, Authorization expiration ("3 days from today"), Action required |
| Admission summary | Section labeled "ADMISSION SUMMARY:" with "DE-IDENTIFIED PREVIEW" |

### 5.2 Denial request (Denial Analysis)
Denial letter file; Clinical documentation file (PDF, DOCX or TXT); additional context free text. Parsed denial fields: FROM (payer), RE (service), SERVICE (code plus name), REQUESTED (units), APPROVED (units), REVENUE AT RISK (dollars), DECISION, RATIONALE.

### 5.3 Case Tracker row (per authorization)
#, Patient (first name plus last initial), Payer, Diagnosis (abbreviated pair), Units Approved, Units Used, Units Remaining, Auth Expires ("date · N days"), Status.

### 5.4 Dashboard case card
Patient (full name on one card, first name plus last initial on the other), payer, state plus setting ("NY OP" / "NY IOP"), diagnosis line, screening score(s) (DAST-10 plus PHQ-9, or AUDIT-C), due-in time, dollars at risk, status badge ("Needs Input"), narrative status sentence, payer-requirement sentence, historical approval lift, "Analyze" button.

### 5.5 Patient or client header (authorization detail)
- Back link "← Authorizations", patient initials as title, one subtitle line combining payer, level of care and diagnoses.
- Metric cards in the header area: "EXPECTED APPROVAL W/ OPROX NARRATIVE" (before to after %), "MODEL CONFIDENCE" (0 to 1) with "Validated on similar cases".
- No DOB, MRN, age, sex, allergies, or insurance ID strip appears. Age and sex appear only inside narrative text ("44-year-old female", "27-year-old female"). The product intentionally avoids identifiers ("HIPAA-safe mode", "DO NOT ENTER PATIENT NAME").

### 5.6 Clinical-review summary
- Key-value block: DIAGNOSIS, PAYER, STATE, STATUS, TRAJECTORY, AUTH READINESS, LEVEL OF CARE, CASE REFERENCE (Live Cases results); or Payer, Level of Care, Status, Trajectory, Auth Readiness (detail tab).
- Narrative paragraph (age, sex, diagnoses, history, week of treatment, attendance, sobriety biomarker).
- "Key Drivers Identified", "Engagement & Behavioral Signals", "Risk Signals Remaining" bullet groups.
- "Symptom & Functional Trend" line chart (weeks on X axis, scale scores on Y, legend by scale, "Current" callouts like "8/12").
- Engagement score ("79% ↑").
- Payer criteria rows: requirement title, status pill, evidence sentence.
- Metric tiles: chart-to-criteria match (x/y), historical approval rate, time to criteria view, submission method.
- Appeal findings: severity tag, title, paragraph. ASAM D1 to D6 paragraphs. Numbered action list.

---

## 6. What makes it feel like a real product

### 6.1 Chrome and layout (confirmed where marked image)
- Persistent left sidebar with logo tile plus "Authorization Support" subtitle, grouped labelled sections, outline icons for every item, active item as a peach pill, and a pinned bottom block (Settings, Help, Sign Out, then the user). The user block is bottom-left, not top-right (image).
- No top bar, no global header, no bell or notification icon, no breadcrumbs. The only back navigation is the text link "← Authorizations" on the detail page.
- Search is not a global top-bar search. "Search patients..." sits in the dashboard toolbar next to the filter controls, with a magnifier icon.
- The only notification-like element is the banner "PAYER INTELLIGENCE UPDATE + NEW" on the dashboard. No close or dismiss control shows in the text.
- The page body is off-white. Content is white cards with thin borders, rounded corners and very light shadows. The sidebar is about 15% of the width and content areas are wide (image).
- Typography is a clean sans-serif (Inter-like (?)). Page titles are large and bold with a gray one-line subtitle. Section labels are small uppercase gray with letter spacing ("MAIN", "CUSTOMER DEMO", "ACTIVE AUTHORIZATIONS", "CHART-TO-CRITERIA MATCH").
- One accent colour: orange (logo, active nav, primary CTAs (?)). Semantic colours are red, amber, green, blue (image).

### 6.2 Data density and table style (from the Case Tracker image)
- Medium-high density: eight rows visible, each about 80 px tall at 2000 px wide, wrapping long names and diagnoses to two lines rather than truncating.
- Headers are small gray uppercase with a hairline under them. Rows have hairline dividers and no vertical gridlines. Row numbers are in light gray in the first column. Numeric columns are right-aligned.
- Patient name is the only bold text in a row. Payer and diagnosis are regular weight, gray-dark.
- Status is a rounded pill with a small coloured dot, light tinted background, and the same colour for the text.
- Relative time sits next to the absolute date in lighter gray ("Oct 1 · 3 days").
- Missing values are an en dash, not blank.
- Table card header combines a bold uppercase title, a gray count "(8 tracked)", and a right-aligned red summary "2 recertifications due".

### 6.3 Content and behaviour touches
- Streaming "analysis log" panels with check marks and dots, and specific numeric claims such as "Found 312 analogous cases-78% reversed on first-level appeal" (these read as live system activity).
- Persistent safety strips: "Decision support for authorization documentation and workflow only. Not clinical guidance." and "HIPAA-safe mode: Common identifiers are automatically de-identified before analysis."
- Audit language: "All decisions are logged."
- Step flow with explicit helper copy ("Either file is enough to start...", "Upload at least one document to continue.").
- File names that look real: "Denial 2 - Denial Letter.docx", "Denial 2 - Clinical Info.docx".
- Money is shown wherever urgency is shown ("$14,800 at risk", "approximately $10,000").
- Each recommendation shows evidence and a "Why this matters" disclosure.
- Realistic dated clinical references: "therapist DAP note (03/17)", "psychiatrist's clinical judgment (03/18)".
- Lift and probability numbers are everywhere (+16%, 66% to 95%, 0.91, 72% / 67% / 36%).
- Payer names are real NY Medicaid managed-care plans, which makes the data look credible.

### 6.4 Things in the source that look off (do not copy)
- The "Payer Criteria" source chip says "FL-specific rules" on a NY payer (2.48.24).
- The Denial Analysis log mentions "Cigna ASAM Level 3.5" and "atomoxetine titration" while the case is EmblemHealth IOP with sertraline and prazosin (2.51.22). It looks like leftover text from another demo case.
- The queue says "25 Cases" but only 9 are visible (1 plus 8 in the two groups), while the Case Tracker shows 8 tracked patients, and the names differ between the two screens (the dashboard cards and the tracker rows do not share patients except by diagnosis pattern).
- One queue card reads "NY OP" and the other "NY IOP" (likely the same field with a dropped letter (?)).
- The same demo patient is written as a full name on the dashboard and detail header but as first name plus last initial in the Case Tracker.

---

## Appendix: screenshot index (43 files, in capture order)

| Time | Screen |
|---|---|
| 2.47.13 | Dashboard, Case Queue (S.M., M.T.) |
| 2.47.20 | Dashboard, top with workflow comparison |
| 2.47.29 | Live Cases, empty form |
| 2.47.48 | Detail, System-Identified Actions (top) |
| 2.47.56 | Detail, Actions cards (scrolled) |
| 2.48.03 | Detail, Clinical Trajectory tab |
| 2.48.13 | Detail, Payer Criteria (lower) |
| 2.48.24 | Detail, Payer Criteria (top) |
| 2.48.31 | Detail, Historical Outcomes (image only) |
| 2.48.47 | Detail, Actions cards, none selected |
| 2.48.57 | Detail, Actions card selected, "Needs Input", modification boxes |
| 2.49.06 | Live Cases, empty, "Run Oprox" and level-of-care dropdown |
| 2.49.12 | Live Cases, empty |
| 2.49.30 | Live Cases, filled |
| 2.49.39 | Live Cases, Authorization Status and De-identified preview |
| 2.49.43 | Live Cases, analysis running |
| 2.49.50 | Live Cases results, Clinical Trajectory |
| 2.50.05 | Live Cases results, Payer Criteria |
| 2.50.09 | Live Cases results, Denial Prevention Actions |
| 2.50.23 | Denial Prevention Actions, "Why this matters" expanded |
| 2.50.31 | Payer Criteria (second scroll) |
| 2.50.40 | Denial Prevention Actions (scrolled) |
| 2.50.48 | Case Tracker (viewed as image) |
| 2.50.56 | Dashboard (second capture) |
| 2.51.01 | Denial Analysis, step 1 empty |
| 2.51.08 | Denial Analysis, denial letter chosen |
| 2.51.13 | Denial Analysis, step 2 and sanitized record, reading log |
| 2.51.18 | Denial Analysis, both files, decision text |
| 2.51.22 | Denial Analysis, ASAM / Cigna log |
| 2.51.27 | Denial Analysis, rationale text |
| 2.51.31 | Denial Analysis, log and "Generating appeal analysis" |
| 2.51.35 | Core Clinical Synthesis, findings starting |
| 2.51.39 | "What Oprox Would Do" list (lower) |
| 2.51.43 | Appeal analysis, rationale and synthesis |
| 2.51.48 | Appeal analysis, findings |
| 2.51.54 | Findings, scrolled |
| 2.52.00 | Findings, cannabis finding |
| 2.52.08 | ASAM six dimensions |
| 2.52.12 | "What Oprox Would Do" list |
| 2.52.22 | Facility Insights (top) |
| 2.52.29 | Facility Insights (denial table, actions) |
| 2.52.48 | Facility Insights (second capture) |
| 2.53.10 | Facility Insights (third capture) |
