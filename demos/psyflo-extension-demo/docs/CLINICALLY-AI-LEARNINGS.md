# What every button in the Clinically AI extension means

Source: the Nov 20 demo call (Granola transcript), the screenshots shared from the call, and the product notes. The visual version, with annotated screens and a flow diagram, is the published page "Clinically AI Extension Guide" (https://claude.ai/artifact/EcLxKwpHJ9gBzurrV74BP2). Every row below says how sure we are:

- **Said on the call**: Garrett said it out loud.
- **Seen on screen**: visible in a screenshot; the label tells you the meaning.
- **Best guess**: nobody explained it.

## Corrections and limits

- **Lauris is unconfirmed.** Garrett first said Clinically AI does not currently work with Lauris. When asked again he checked and said "it works, it's all good to go", but did not say whether that is a front-end integration (write-back into fields, and Comply) or the copy-paste / self-configuration route he described for EHRs outside their list of 30. The demo EHR on the call was Awards (Foothold), not Lauris.
- The 975 MB call video could not be read; this comes from the transcript and screenshots only.
- Anything configured per document type (an audit agent for a CANS or an admission form) is built by their implementation team; it is not automatic.

## One-minute version

1. A Chrome or Edge side panel beside the EHR reads the open page field by field (checkboxes, dropdowns, hidden fields).
2. Clinical Notes AI: live session or dictation, a draft written into the EHR's own template, forced review, **Save & Import** writes every ticked field.
3. It knows the template because admins mirror it (**Template Settings**), and the clinic's rules because of **Organizational AI** (mission, accreditations, locations, payers, wording, policy files).
4. Comply (separate product): on Save it audits, pauses the submit, shows alert chips (+ / ×), and rolls up to an admin dashboard. It needs the front-end integration.
5. Document Builder (templates outside the EHR, peer-to-peer and utilization review) and Signals (peer-reviewed-article decision support) are separate modules; Connect, Front Door, Supervision and Compose are beta; Margin is roadmap, probably 2027.

## Every component

### The header and the icon row

| # | Component | What it literally means | How sure | In the Psyflo extension |
|---|---|---|---|---|
| 1 | Clinical Notes AI (title, spark logo) | The product name. The panel is a Chrome or Edge side panel (the browser’s own side-panel feature) that docks beside the EHR. | Said on the call | A Psyflo header with the clinic connection shown (“Lauris connected”). Same docking. |
| 2 | Pin icon, top right | Keeps the panel open when you move around. It shows a pin with a slash, which looks like the Chrome side-panel pin. | Best guess | Same pin, top right. |
| 3 | Close ×, top right | Closes the panel. | Seen on screen | Close button; the Psyflo button in the browser bar reopens it. |
| 4 | Microphone icon, first in the row | The recording screen: Start New Session. It is highlighted whenever you are on Start Session or Session Capturing. | Seen on screen | First icon: Scribe, which opens Start a new session. |
| 5 | List icon, second | The history screen. It is highlighted on the screen with the Documents and Sessions tabs. | Seen on screen | Second icon: History, with Sessions and Documents lists, a clinician filter and search by patient. |
| 6 | Two-person icon, third | Not shown on any screen we have. Most likely a patient or team list. | Best guess | Third icon: Patients, the roster (your reading of it, which Psyflo follows). |
| 7 | Orange speech-bubble icon, fourth | Not shown on any screen we have. Either Signals, which Garrett said lives inside the extension, or Comply, which you read it as. Comply’s alert chips appear on the EHR page and its dashboard is a separate web app, so I cannot tell. | Best guess | Fourth icon: Scan & Enhance (your reading: their Comply). Ask Psyflo, our evidence chat, sits inside it. |
| 8 | Question-mark icon | Not shown. Probably help. | Best guess | Fifth icon: Help, options only: chat with Psyflo, FAQs and training videos. |
| 9 | Person icon, last | Not shown. Probably the account or settings. | Best guess | Sixth icon: Settings: you, recording, Check before save and the clinic profile (read-only). |
| 10 | Second × at the end of the icon row | Probably closes the current screen and returns to the idle state. | Best guess | Same: closes the screen and returns to Scribe. |

### Start New Session

| # | Component | What it literally means | How sure | In the Psyflo extension |
|---|---|---|---|---|
| 11 | ← back arrow | Returns to the previous screen. | Seen on screen | Back or Cancel on each Scribe screen. |
| 12 | Live Session | Dictation | Live: the clinician records a conversation with the person present. Dictation: the clinician speaks the note alone, used when the person has not agreed to be recorded. | Said on the call | Same two modes. We use Dictation for a prior-auth summary. |
| 13 | Waveform strip | A microphone level meter, so you can see it is hearing sound. | Seen on screen | The orb on the recording screen plays this role. |
| 14 | “Using Telehealth + Headphones?” checkbox | Tells the app that the other person’s voice arrives through headphones, so it must capture the computer’s audio as well as the microphone. The Recover screen says a session “was recorded with Telehealth + Headphones.” | Best guess | Same toggle, labelled “Telehealth / headphones”. |
| 15 | Audio Device dropdown | Choose the microphone. | Seen on screen | Shown as “Microphone: built-in (simulated)”. |
| 16 | Language dropdown | The language to transcribe. | Seen on screen | Not in the demo (one language). |
| 17 | Chart Summary button + tooltip “View the chart summary for this patient” | Shows a summary of the patient’s chart before or during the session. What it is built from is not explained. | Best guess | Removed. Psyflo reads the patient’s chart on its own, and listing the records gives a clinician nothing to act on. |
| 18 | Start Session | Starts the session. With a live session, the next step asks whether the patient consented. | Said on the call | “Continue”, then the consent step. |

### Consent and recording

| # | Component | What it literally means | How sure | In the Psyflo extension |
|---|---|---|---|---|
| 19 | Patient Consented / Declined | A consent gate before any recording, with an example script the clinician can read out. | Seen on screen | Same step, with the clinic’s consent script. Declined means nothing is recorded. |
| 20 | The orb and timer | A pulsing orb shows it is listening; the timer counts the recording. | Said on the call | Orb, timer, and the lines it has heard shown as a transcript. |
| 21 | Complete Session | Stops recording and moves to generating the document. | Seen on screen | “Complete session”. |
| 22 | (i) icon on each screen | An explanation of that screen. | Best guess | Not copied. |
| 23 | Recover Session | If a recording was interrupted, it offers to resume. It shows a snippet of the transcript so far and the buttons “Switch to Telehealth & resume” and “Discard.” | Seen on screen | Same. Leaving the document while recording triggers it. |

### Generate Note

| # | Component | What it literally means | How sure | In the Psyflo extension |
|---|---|---|---|---|
| 24 | Session row (“1h Live Session”) with a refresh icon | The recording this document will be written from. The refresh icon probably reloads or switches the session. | Best guess | Not needed: the open document decides. |
| 25 | Note title | Pre-filled with the name of the template it found on the EHR page. | Seen on screen | The document name comes from the document you pick. |
| 26 | Select a patient | Which chart the note belongs to. | Seen on screen | Pick a patient on the Start screen, then any kind of document. Choosing opens it in Lauris. |
| 27 | Location and program (optional) | Lets the organization’s rules for a location or program apply to this note. | Best guess | Comes from the consumer’s record. |
| 28 | Clinical observations and instructions + “Talk to AI” | A free-text box for anything the note should include or avoid. “Talk to AI” is a microphone for speaking that text. | Best guess | Not in this build. Worth adding: a one-line instruction box. |
| 29 | Add Chart Context | Pull in or upload past notes and documents so the draft can use them. | Said on the call | Not needed: Psyflo uses the patient’s chart in Lauris. |
| 30 | Template Settings | Mirrors the EHR’s template into their app so an admin can add instructions per field. Opens from here and from the review screen. | Said on the call | “What Psyflo sees on this page”: every field with its kind, and which are clinician-only. |
| 31 | Generate | Writes the document and then forces a review. | Said on the call | “Complete session” leads straight to generating. |
| 32 | Analyzing Patient Context… then Writing Document… | The two stages while it works, with a Cancel. | Seen on screen | Same two steps: reading the chart, then writing. |

### Review and import

| # | Component | What it literally means | How sure | In the Psyflo extension |
|---|---|---|---|---|
| 33 | Document title + Expand | Expand opens the draft in a larger pop-up so it is easy to read. | Said on the call | Cards are already full width. |
| 34 | Disclaimer: “AI-generated… clinician validation is necessary” | States that the draft must be checked, and that codes and diagnoses it suggests are not a diagnosis. | Seen on screen | Same idea in each card: Psyflo wrote only what was said or in the chart. |
| 35 | Five stars | Almost certainly a rating of the draft’s quality, for their team. It is empty in every screenshot. | Best guess | Not copied. Ask Garrett. |
| 36 | Search fields… | Filters a long form by field name, which matters when a form has hundreds of questions. | Seen on screen | Not in this build. |
| 37 | Per-field row: sparkle icon, field name, tick box, editor | One row per EHR field. The tick decides whether it is imported. The editor matches the field: a dropdown for a dropdown, a rich-text editor (H1, H2, H3, bold, italic, underline, list) for a text box. | Seen on screen | One card per field: include tick, kind badge, source chip, editor. |
| 38 | Purple outline on the EHR fields | Marks the fields in the EHR that will receive text. | Seen on screen | Not copied. |
| 39 | “Please review the entire document ⌄” | A nudge to scroll through everything. “Save & Import” stays faded until you have. Garrett: it “forces the clinician to actually review the note.” | Said on the call | A “I have read the whole draft” tick before the button works. |
| 40 | Edit with AI | Type what you want changed and it rewrites. | Said on the call | Edit in place, or Regenerate. Not an AI rewrite box yet. |
| 41 | Save & Import | Writes every ticked field into the EHR in one click, no copy and paste, however big the document. | Said on the call | “Type N fields into Lauris”. It types; the clinician saves in Lauris. |
| 42 | Importing overlay, then Document Complete | Progress while it writes. Then Regenerate, Template Settings, “Generate another document?”, “Start a new session” and “Back to sessions.” | Seen on screen | A done screen with “Scan this note”, another session, back home. |

### Sessions and Documents

| # | Component | What it literally means | How sure | In the Psyflo extension |
|---|---|---|---|---|
| 43 | Documents | Sessions tabs | Two lists: finished documents and recorded sessions. | Seen on screen | Same two tabs in History. |
| 44 | Clinician dropdown (My Sessions, All Clinicians, names) | Shows your own sessions, everyone’s, or one clinician’s. | Seen on screen | Not needed: one signed-in clinician. |
| 45 | Search by Patient | Finds a session by patient name. | Seen on screen | Search by consumer initials. |
| 46 | Session row: “1m Session”, “1m Dictation”, patient or “No Patient Assigned”, date, clinician | Length and type of each recording, who it was for, when, and who recorded it. A session can exist with no patient assigned yet. | Seen on screen | Document, consumer, what happened, who, with an Open in Lauris button. |

### Comply, in the EHR and on the web

| # | Component | What it literally means | How sure | In the Psyflo extension |
|---|---|---|---|---|
| 47 | “Submit paused for compliance alerts — click submit again to save anyway” | After the clinician presses Save, it checks the document. If alerts are open, it holds the submit, and a second press lets it through. | Seen on screen | “Check before save”. Same: Save again to override. |
| 48 | Count badges, top right of the form (i, orange 2, red 4, grey ×) | How many alerts at each severity are on this form. The grey × probably hides them all. | Seen on screen | The tally in the Scan tab and the number on the Psyflo button. |
| 49 | Red outline and dotted line from the text box to the chips | Shows which field the alerts are about. | Seen on screen | A small chip beside the field label. |
| 50 | Alert chips: Empty Notes, Missing Progress Mentions, Missing Action Plan, Medical Necessity Criteria, Joint Commission 2025, FCM Golden Thread | Each chip is one audit module that failed. Plus: apply the fix (my reading). ×: dismiss. | Seen on screen | A finding card with “Type into Lauris” and “Dismiss”. |
| 51 | Alerts Dashboard (web app) | Filters for date range, program, location, clinician, patient and measure; tiles for Low, Medium and Critical counts; alerts over time by week; recent documents. In their demo data: Low 2, Medium 174, Critical 312. | Seen on screen | Out of scope for the extension. It belongs to the platform. |
| 52 | Configure (audit agents) | Build an audit agent: choose the checks, the severity, and which note types it applies to. Their implementation team helps. | Said on the call | The Clinic tab lists the checks Psyflo runs, grouped by module. |

## Where Psyflo differs on purpose

- Same six icons, but each names itself on hover and each screen starts with a title.
- Scan & Enhance reads documents that are already written and proposes fixes a person can type into the field.
- Psyflo types, a person saves. Typed text is yellow until the person saves in the EHR.
- No invented clinical text: fixes quote the chart, wrap the clinician's own words in a fixed sentence, or apply a choice the clinician makes. Ratings and diagnoses are locked.
- "Not stated" instead of a guess; no star rating; no pre-generate form beyond choosing the patient and the document.

## Questions for Garrett, Monday Nov 23, 7 PM ET

1. Is Lauris a front-end integration or a self-configuration? Does write-back work, and does Comply? Ask for it in writing.
2. Does Comply write fixes, or only alert? What does the plus on an alert chip do?
3. Can it scan a document that is already written (hand-written notes, EHR pre-populated prior-auth packets)? Which product, and what does it cost to configure per form?
4. Who builds the audit agents for CANS and ASAM, how long does it take, and do payer rules update when a payer changes them?
5. What do the unlabeled header icons do (two-person, orange, question mark, person)?
6. What is the five-star rating for?
7. What is in the Chart Summary, and where does it come from?
8. Which file types does Add Chart Context accept?
9. How does it detect and map fields, and what happens when the EHR changes a form?
10. How do phone-app sessions sync to the panel's Sessions list?
11. Pricing: Comply starts at about 25 clinicians (we are 15); scribe price; is the sandbox free? (A BAA comes first.)
12. Signals: which sources, can it use our own 60-page evidence library, does it cite what it used?
13. Retention and review rules: delete a transcript when the note is saved? Forced review per document type?
14. Which products are beta and when do they ship?
