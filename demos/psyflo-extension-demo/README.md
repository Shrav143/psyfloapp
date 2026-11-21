# Psyflo extension demo

A standalone demo of the **Psyflo browser extension** docked in a mock **Lauris Online** EHR. It was designed after studying the Clinically AI demo (Nov 20): see `docs/CLINICALLY-AI-LEARNINGS.md` for what each of their buttons means and how Psyflo uses the idea. The Psyflo platform is out of scope.

The extension does two jobs on EHR documents:

| Job | What happens |
|---|---|
| **Scribe** | Start a live session or dictation, consent, record (simulated), Psyflo drafts each field from what was said and from the chart, the clinician reviews every card, Psyflo **types** into the EHR fields (yellow). The clinician saves in the EHR. |
| **Scan & Enhance** | Reads a document that is already written, runs the clinic's checks, shows findings by severity as chips beside the fields and as cards in the panel. A fix is a chart quotation, the clinician's own words in a fixed sentence, or a choice the clinician makes. Ratings and diagnoses are never typed. |
| Check before save | Save in Lauris pauses when findings at or above the clinic's level are open; Save again saves anyway and History records the open alerts. |
| Ask | Evidence chat: answers come from the chart and the clinic's own documents, with sources. Pre-written for the demo (Simulated). |
| Clinic | Read-only clinic profile: programs, payers, wording rules, document standards, the checks Psyflo runs, retention, and the Check-before-save settings. |
| History | Sessions and documents, searchable by consumer. |

**Same design at every clinic.** The panel and the mock EHR read a `ClinicConfig` and never name a clinic. Switch the clinic with the "Demo clinic" control in the browser bar. **Harvest Outreach** is the default (original TDT / school-based content: DPN, admission screening, intake/CNA, shortened CANS, continued-stay SRA). **CCCSN** is the substance use clinic (progress note, admission, ASAM assessment, continued-stay request).

Published (private) as https://claude.ai/artifact/G6AdUeEf9jsodBYNiuXHFC; the button-by-button guide is https://claude.ai/artifact/EcLxKwpHJ9gBzurrV74BP2.

## Run

```bash
bun install
npx vite build            # dist/index.html, one self-contained file
node scripts/e2e.mjs dist/index.html          # 62 checks through the UI
bun src/clinics/harvest/selftest.ts           # content checks: fixes clear, quotes are verbatim, no invented text
bun src/clinics/cccsn/selftest.ts
npm run dev               # http://localhost:5174
```

`ARCHITECTURE.md` has the contracts, owners and the test hooks. `scripts/pack-hosted.mjs` turns the build into the page the Artifact tool publishes.

## The rules

1. Psyflo never writes clinical judgement. Typed text is a quotation of a stored record, the clinic's own wording, the clinician's own words in a fixed frame, or a choice the clinician made. If nothing was said about a field it stays empty ("Not stated").
2. Psyflo types, a person saves. Yellow = Psyflo typed it, check it. Green = already in Lauris.
3. Everything is sample data, initials only, labelled Simulated where a reader could mistake it for fact.

## Assumptions to confirm

- Harvest's accreditations are listed "(to confirm with Harvest)"; CCCSN's "(to confirm with the clinic)". The CCCSN full name is the placeholder used in the Nevada demo.
- The CANS item list is shortened and simulated; its ratings are the clinician's and are locked.
- T.W.'s admission, intake and CANS are dated 10/29 (today in the demo) so the Scribe sessions run "live".
- Payer criteria text is the clinic's own sample wording, not a payer's real policy.
- Lauris support in Clinically AI is **unconfirmed** (see the learnings doc).

## Known gaps

- Capture is simulated (a scripted conversation); there is no microphone.
- No star rating, no "clinical observations" box before generating, no field search, no AI rewrite box in review. Each is noted in the learnings doc.
- Ask answers are pre-written; a typed question that matches no topic is declined, not guessed.
- Below about 760px the panel stacks under the EHR; the demo is designed for a desktop window.
