# The user's Round-9 prompt (verbatim, from the user, Nov 1 2026)

User's own words first: "make sure the denial intelligence tab is there because that's important. I don't think your changes reflect the granular transcript. So I ran the prompt through ChatGPT, and then I'm giving you a detailed prompt. So use that prompt to make those changes."

---

PsyFlo Demo Redesign — Updated Implementation Prompt

Your role
Act as a senior healthcare product designer, UX architect, and frontend engineer specializing in behavioral health EHR workflows, clinical documentation, prior authorization, denial management, and AI-powered browser extensions.
Your assignment is to update the existing PsyFlo interactive HTML demo, not create a new or unrelated product.
I am attaching the current PsyFlo HTML demo. Inspect the existing implementation, preserve useful functionality, and make the changes outlined below.
These requirements incorporate product feedback discussed on November 1, 2026, following our work with Harvest Outreach Center, a school-based behavioral health provider using Lauris Online EHR.

Critical requirement
The PsyFlo platform must retain three top-level tabs:
1. Authorizations
2. Denial Intelligence
3. Analytics
Do not remove, rename, hide, or merge the Denial Intelligence tab into Authorizations.
The browser extension remains the primary daily interface for clinic staff. The standalone platform is used for authorization oversight, denial management, and organizational analytics.

## 1. Overall product architecture
The redesigned demo should consist of two connected experiences.
Experience A: PsyFlo browser extension — operates as a sidebar inside Lauris Online EHR. Its three core functions are: Scribe, Track Time, Scan & Enhance. Access depends on the user's role and permissions. The extension should be compact, intuitive, and suitable for frequent daily use.
Experience B: PsyFlo platform — must contain exactly three primary navigation tabs:
- Authorizations: Track initial authorizations, concurrent reviews, approvals, partial approvals, upcoming renewals, and authorization status.
- Denial Intelligence: Manage denied and partially approved requests, analyze denial reasons, prepare appeals, generate peer-to-peer scripts, and identify patterns that can improve future submissions.
- Analytics: Provide operational reporting, authorization performance metrics, patient population analysis, and customizable reports.
Remove the following standalone tabs: Overview, New Cases, EMR Connect, Payer Logic / Workflow. Preserve any useful functionality from those tabs by incorporating it into the appropriate existing workflow. Do not create redundant navigation or duplicate the EHR's patient-management functions.

## 2. Role-based permissions
Implement an interactive role selector with three roles.
Direct Support Staff — Show only: Scribe, Track Time. These users should be able to document interventions, track service time, and work with assigned patients. Do not expose restricted admission screening data, comprehensive assessments, payer policies, denial workflows, or organization-wide analytics.
Licensed Clinical Staff — Show: Scribe, Track Time, Scan & Enhance. Allow appropriately authorized clinicians to: Review and enhance clinical notes; Review prior authorization documentation; Prepare concurrent reviews; Identify missing medical-necessity evidence; Edit generated documentation; Approve documentation before EHR synchronization; View assigned authorization records; Access relevant Denial Intelligence workflows when permitted.
Administrator — Provide appropriate access to: Authorizations; Denial Intelligence; Analytics; Organization-wide operational reporting; Staff workflow oversight. Do not assume administrative privileges automatically authorize access to all sensitive clinical records.
The role selector must actually change available functionality, not simply change a role label. Implement patient-level and workflow-level access distinctions where practical.

## 3. Browser extension home screen
Redesign the extension to be as simple as possible. At the top, show: PsyFlo logo; Current patient; Patient identifier; Current user role; EHR connection status; Current document context.
Below that, show the primary actions. For direct support staff: Scribe | Track Time. For licensed clinical staff: Scribe | Track Time | Scan & Enhance.
Do not reproduce the full PsyFlo dashboard inside the extension. Avoid excessive cards, nested navigation, and unnecessary clinical information.

## 4. Scribe workflow
When a user selects Scribe, show a document-type dropdown. Include: Admission Screening; Comprehensive Intake / Needs Assessment; Daily Progress Note (DPN); Collateral Contact; Monthly Note / Review. Only display document types that the current user is permitted to create. The selected document type determines the structure of the generated note.
Recording interaction — Provide: 1. Start Recording 2. Pause 3. Resume 4. Stop 5. Review Transcript 6. Generate Draft 7. Edit Draft 8. Save & Push to EHR. Use realistic simulated transcription for the demo if live recording is unavailable.
Clinical documentation fields — For DPNs, capture: Service date; Treatment goal; Intervention performed; Duration, where applicable; Patient response; Progress or barriers; Continuing clinical needs. For admission screening and intake, use the appropriate clinical fields from the existing demo. Do not invent patient information or automatically create unsupported clinical conclusions.

## 5. Editing and EHR synchronization
This is a critical product requirement. Every AI-generated or enhanced note must be editable inside the extension. Users must be able to: Review the original documentation; Review AI recommendations; Accept or reject changes; Edit the generated text; Save the approved draft; Push the final version into Lauris Online.
Use the following version flow: Original Note → AI Draft → Clinician Edited → Approved → Synchronized.
Show meaningful synchronization states: Unsaved Changes; Draft Saved; Ready to Sync; Syncing; Synced; Sync Failed.
The approved version should be the version written to the EHR. Do not silently overwrite signed or finalized notes. Use an amendment or addendum workflow where appropriate.
Provide a Save & Copy fallback only when direct field population is unavailable, clearly indicating that copying does not automatically update the EHR.

## 6. Track Time
Build a simplified time-tracking workflow. Include: Patient; Date; Start Timer; Pause Timer; Stop Timer; Recorded Duration; Intervention Description; Associated Treatment Goal; Save Entry.
Support multiple intervention intervals for the same patient on the same day. Allow time entries to be associated with DPN documentation. Distinguish actual recorded time from billable units. Do not assume that every minute recorded is reimbursable. Use configurable service-unit rules rather than hardcoded assumptions. Remove redundant separate notes and time-tracking navigation where the workflows can be combined.

## 7. Scan & Enhance
This is the primary clinical intelligence feature of the extension. It should work on documents already open in Lauris Online.
Supported examples: Daily Progress Notes; Admission Screenings; Comprehensive Intakes; Initial Prior Authorizations; Concurrent Reviews; Continued-Stay Requests.
Workflow: 1. Clinician opens an existing document in Lauris. 2. PsyFlo detects the document context. 3. Clinician selects Scan & Enhance. 4. PsyFlo reviews authorized clinical information. 5. PsyFlo identifies documentation gaps. 6. PsyFlo presents recommendations. 7. Clinician accepts, rejects, or edits suggestions. 8. Clinician approves the final version. 9. PsyFlo pushes approved changes into the appropriate EHR fields.
Recommendation examples: Missing functional impairment information; Incomplete intervention description; Missing patient response; Weak connection to treatment goals; Insufficient continued-stay evidence; Contradictory clinical information; Unsupported medical-necessity statement; Missing payer-required documentation.
For each recommendation, show: Identified issue; Why it matters; Supporting evidence; Suggested improvement; Policy reference, when applicable; Accept / Reject / Edit.
Do not fabricate clinical evidence. If evidence is absent, recommend collecting it. Support reviewing historical notes, but distinguish review from retroactively changing a finalized record.

## 8. Prior authorization enhancement inside Lauris
Clinicians should continue using Lauris's existing authorization forms. PsyFlo should assist through the sidebar rather than requiring users to open a separate authorization editor.
Workflow: 1. Open the prior authorization form in Lauris. 2. Activate Scan & Enhance. 3. Review available clinical information. 4. Identify missing or weak medical-necessity evidence. 5. Generate recommendations. 6. Review and edit the recommendations. 7. Select Save & Push to Form. 8. Populate the appropriate Lauris fields. 9. Review the completed form. 10. Prepare it for submission.
Preserve Lauris's existing form-population behavior where represented in the demo. Do not replace the EHR's existing form structure. Show Lauris on the left and PsyFlo's extension on the right.
Submission simulation — After clinician approval, demonstrate: Required-field validation; Final document review; PDF capture; Submission package preparation; Simulated payer submission; Confirmation number; Status tracking. Clearly distinguish simulated submission from a real payer integration.

## 9. Platform Tab 1 — Authorizations
Merge the old Overview functionality into Authorizations. This tab should provide operational visibility into authorization status.
Summary metrics — Show: Active Authorizations; Pending Reviews; Expiring Soon; Partially Approved; Denied; Renewals Due.
Authorization table — Include: Patient; Service; Payer; Assigned Clinician; Authorization Period; Requested Units; Approved Units; Remaining Units; Status; Next Action.
Filters — Include: All; Active; Pending; Expiring Soon; Partially Approved; Denied; Renewals Due. Additional filters: Payer; Service Type; Assigned Clinician; Location; Date Range.
Authorization details — Show: Authorization timeline; Clinical documentation; Submission history; Payer correspondence; Requested versus approved units; Relevant deadlines; Renewal status.
Connection to Denial Intelligence — If an authorization is denied or partially approved, provide a visible action: Open in Denial Intelligence. This should open the corresponding denial record in the dedicated Denial Intelligence tab. Do not duplicate the entire denial workflow inside Authorizations. Authorizations should focus on tracking and oversight. Denial Intelligence should focus on analysis and resolution.

## 10. Platform Tab 2 — Denial Intelligence
This is a mandatory, dedicated top-level tab. Do not remove it or merge it into Authorizations. Preserve and enhance the existing Denial Intelligence functionality from the current demo. Its purpose is to help clinicians and administrators understand why authorizations were denied or partially approved, identify relevant clinical and policy issues, prepare responses, and track outcomes.
A. Denial Intelligence dashboard — Show summary metrics: Total Denials; Partial Approvals; Appeals in Progress; Appeals Overturned; Appeal Deadlines Approaching; Units at Risk; Denial Trends by Payer. Use illustrative data, clearly identified as demo data.
B. Denial work queue — Include a table with: Patient; Payer; Service; Authorization Reference; Requested Units; Approved Units; Denial or Reduction Reason; Decision Date; Appeal Deadline; Assigned Owner; Current Status; Next Action.
Filters — Include: All Denials; Partial Approvals; Full Denials; Needs Clinical Review; Additional Information Requested; Appeal in Progress; Peer-to-Peer Requested; Resolved; Deadline Approaching. Allow filtering by payer, service, assigned clinician, and date.
C. Denial detail workspace — When a denial is selected, open a detailed workspace. Show:
1. Payer Decision: Payer name; Decision date; Original request; Approved or denied units; Stated denial reason; Applicable policy reference; Response deadline.
2. Clinical Evidence Review: Available assessments; Treatment plans; Relevant progress notes; Functional impairment evidence; Prior treatment history; Continued-stay documentation.
3. AI Denial Analysis: Provide a structured analysis separating: Payer's stated reason; Relevant documented evidence; Missing evidence; Potential documentation weaknesses; Potential policy interpretation issues; Recommended next steps. Do not assume the payer's decision is incorrect. Do not claim that a denial can be overturned solely through improved wording.
D. Recommended actions — Provide interactive actions: Analyze Denial; Identify Missing Evidence; Request Additional Documentation; Generate Appeal Draft; Generate Peer-to-Peer Script; Prepare Reconsideration; Mark for Clinical Review. Each action should produce meaningful demo output.
E. Appeal drafting — Create an editable appeal workspace. Include: Denial summary; Relevant medical-necessity criteria; Supporting clinical evidence; Response to the stated denial reason; Requested reconsideration; Supporting-document checklist. Every factual clinical statement should be traceable to available documentation. Allow the clinician to edit the appeal before approval. Provide: Save Draft; Approve; Prepare Submission; Simulate Submission.
F. Peer-to-peer preparation — Generate a structured discussion guide containing: Patient presentation; Functional impairment; Requested level of care; Clinical rationale; Prior interventions; Treatment response; Continued medical necessity; Questions to clarify with the payer. Include an editable script and supporting evidence references.
G. Denial patterns and intelligence — Add a section showing recurring denial patterns. Examples: Most common denial reasons; Denials by payer; Denials by service type; Partial approval frequency; Average units reduced; Missing-documentation patterns; Appeal outcomes. Where possible, connect these patterns to actionable recommendations for improving future submissions. Example: "Several recent partial approvals cited insufficient documentation of intervention frequency. Review whether future requests include documented frequency, duration, and clinical rationale." Avoid implying causation when the available evidence only shows a correlation.
H. Resolution tracking — Provide a clear case timeline: Decision Received → Clinical Review → Appeal Prepared → Submitted → Payer Response → Resolved. Support statuses such as: New; Under Review; Awaiting Documentation; Appeal Drafted; Submitted; Awaiting Payer; Overturned; Partially Overturned; Upheld; Closed. Ensure changes in Denial Intelligence are reflected in the corresponding authorization record.
I. Relationship with the extension — The extension should remain the main tool for documentation enhancement. The Denial Intelligence tab is where users handle complex denial and appeal workflows. For example: 1. Clinician receives a denial. 2. PsyFlo records the denial in Authorizations. 3. The record appears in Denial Intelligence. 4. The clinician reviews the payer's stated reason. 5. PsyFlo identifies potentially relevant evidence gaps. 6. The clinician may return to Lauris and use Scan & Enhance on supporting documentation. 7. The clinician reviews an appeal draft in Denial Intelligence. 8. The appeal is approved and prepared for submission. 9. The outcome updates both tabs. This creates a connected experience without duplicating the EHR.

## 11. Platform Tab 3 — Analytics
Keep Analytics as the third top-level tab. Include: Authorization approval rates; Partial approval rates; Denial rates; Appeal outcomes; Authorization turnaround times; Requested versus approved units; Trends by payer; Trends by service; Renewals and expiration patterns.
Custom reporting — Create a guided reporting interface. Example questions: How many patients have a documented substance use concern? How many patients received a particular intervention? How many authorizations were denied this quarter? Which payers have the highest partial approval rates? How many patients received services at a particular location?
Allow users to select: Report type; Population; Location; Date range; Clinical or operational filters. Demonstrate report generation using simulated data. Show processing states and allow downloading a sample PDF or CSV. Do not imply actual EHR data was retrieved unless a real integration exists. A conversational analytics assistant may be shown as a future capability, but it should not be required for the current demo.

## 12. Remove redundant workflows
Remove the standalone New Cases tab. Referral, screening, admission, and intake should remain within Lauris, supported by the extension. PsyFlo may capture relevant data in the background to support later authorization workflows. Add a compact case-status component to the extension where useful. Example: Referral → Screening → Intake → Authorization → Active Services. Do not build a second patient-management system. Also remove the standalone EMR Connect and Payer Logic navigation. Those are implementation or configuration functions, not primary clinic-facing workflows.

## 13. Visual design
Preserve the existing PsyFlo branding and design language. Improve the simulated Lauris Online interface using available references. Prioritize: Clean navigation; Minimal clutter; Consistent typography; Compact extension layouts; Clear status indicators; Editable clinical text; Useful loading and error states; Realistic payer and clinical workflows; Consistent patient information. The three platform tabs should be immediately visible. Denial Intelligence must receive the same visual prominence as Authorizations and Analytics. Do not bury it inside a dropdown or secondary navigation menu.

## 14. Interactive demo scenarios
All of the following scenarios must work.
1: Direct support staff creates a progress note — Select DPN in Scribe, simulate recording, generate a draft, edit it, and push the approved note into Lauris.
2: Direct support staff tracks interventions — Start and stop the timer, record multiple intervention intervals, and associate them with a progress note.
3: Clinician enhances a progress note — Open an existing note, run Scan & Enhance, review recommendations, edit the text, and synchronize the approved version.
4: Clinician enhances a prior authorization — Open a Lauris authorization form, review missing medical-necessity evidence, edit recommendations, push approved content into the form, and simulate submission.
5: Administrator tracks authorizations — Open Authorizations, filter by status, review requested and approved units, and inspect an authorization timeline.
6: Clinician manages a denial — Open Denial Intelligence, select a denied authorization, review the payer's stated reason, inspect supporting clinical evidence, generate an editable appeal draft, and update the case status.
7: Clinician prepares for peer-to-peer review — Open a denial, select Generate Peer-to-Peer Script, review the generated discussion guide, edit it, and save the approved version.
8: Administrator reviews denial trends — Open Denial Intelligence, filter by payer, review denial patterns, and inspect a recommended documentation improvement.
9: Administrator generates an analytics report — Open Analytics, apply population and date filters, generate a simulated report, and download the results.
All controls should perform meaningful actions. Avoid decorative buttons that do nothing.

## 15. Data consistency
Use one consistent simulated dataset across: Lauris EHR; PsyFlo browser extension; Authorizations; Denial Intelligence; Analytics. For example: If an authorization is denied, it should appear as denied in Authorizations and as an actionable record in Denial Intelligence. If an appeal is overturned, update the corresponding authorization status and relevant analytics. If a clinician edits and approves a note, the approved version should appear in the simulated EHR. Do not show contradictory statuses or patient information across screens.

## 16. Technical requirements
Inspect the existing HTML, CSS, and JavaScript before making changes. Preserve useful working functionality. Implement: Working role selector; Permission-dependent views; Interactive Scribe; Interactive Track Time; Editable Scan & Enhance; Simulated EHR synchronization; Authorization filtering and tracking; Dedicated Denial Intelligence workspace; Interactive appeal generation; Interactive peer-to-peer script generation; Denial trend analysis; Analytics report generation; Consistent shared demo state. Use simulated data where real integrations are unavailable. Do not claim to have implemented live payer submissions, real EHR integrations, or autonomous clinical review unless those capabilities actually exist. Do not use real patient information.

## 17. Implementation priorities
P0 — 1. Three platform tabs: Authorizations, Denial Intelligence, Analytics. 2. Preserve existing Denial Intelligence functionality. 3. Remove redundant platform navigation. 4. Implement role-based permissions. 5. Simplify extension to Scribe, Track Time, and Scan & Enhance. 6. Make generated documentation editable. 7. Demonstrate EHR synchronization. 8. Support prior authorization enhancement within Lauris. 9. Ensure denial records link correctly to authorization records.
P1 — 10. Improve denial analysis and appeal workflows. 11. Add peer-to-peer script generation. 12. Add denial pattern analysis. 13. Connect time tracking to DPNs. 14. Add the mini case-status component. 15. Improve Lauris visual fidelity. 16. Add guided analytics reporting.
P2 — 17. Conversational analytics. 18. Autonomous EHR data retrieval. 19. Automated payer portal submissions. 20. Advanced cross-payer clinical policy intelligence. Show future-facing features only as clearly labeled simulations or prototypes.

## 18. Final deliverables
1. Updated interactive HTML demo. 2. Changelog of all modifications. 3. Role-permission matrix. 4. Description of all three platform tabs. 5. Confirmation that Denial Intelligence was preserved and enhanced. 6. Summary of the nine working demo scenarios. 7. Explanation of simulated versus implemented functionality. 8. Remaining technical limitations.

Final product experience — Direct Support Staff: Use the browser extension to document care and track time. Licensed Clinical Staff: Use the extension to enhance clinical documentation and prepare stronger authorization requests. Use Denial Intelligence when complex denials or appeals require additional review. Administrators: Use Authorizations to monitor operational status, Denial Intelligence to manage denied revenue and appeals, and Analytics to understand organizational performance. The browser extension remains the daily product experience. The platform remains the oversight, exception-management, and analytics experience. The Denial Intelligence tab is mandatory and must remain a distinct, fully functional part of the PsyFlo platform.
