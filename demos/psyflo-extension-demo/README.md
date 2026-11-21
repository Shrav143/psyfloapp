# Psyflo extension demo

A standalone demo of the **Psyflo browser extension** docked in a mock **Lauris Online** EHR. It was designed after studying the Clinically AI demo (Nov 20): see `docs/CLINICALLY-AI-LEARNINGS.md` for what each of their buttons means and how Psyflo uses the idea. The Psyflo platform is out of scope.

The panel has the same six-icon row as the tool it was studied from, in this order (each icon names itself on hover; each screen starts with a title):

| Icon | Screen | What it does |
|---|---|---|
| Microphone | **Scribe** (Start a new session) | Pick a patient and document, choose Live session or Dictation, consent, record (simulated), review every drafted field, then Psyflo **types** into the EHR fields (yellow). The clinician saves in the EHR. |
| List | **History** | Sessions and Documents lists, grouped Today / Earlier this week / Older, a clinician filter and search by patient. Open any document in Lauris. |
| People | **Patients** | The patient roster. Open a patient for their documents (with Scribe and Scan buttons), recent sessions and the chart records Psyflo reads. |
| Scan icon (gold) | **Scan & Enhance** (our version of Comply) | Reads a document that is already saved, runs the clinic's checks, shows findings by severity as chips beside the fields and cards in the panel. A fix is a chart quotation, the clinician's own words in a fixed sentence, or a choice the clinician makes. Ratings and diagnoses are never typed. **Check before save** pauses a Lauris save when serious findings are open. **Ask Psyflo** (evidence chat) sits inside this screen. |
| ? | **Help** | How to write a document, how to check one, how saving works, and a legend of the colors, chips and icons. |
| Person | **Settings** | You, recording defaults, Check before save, and the read-only clinic profile (programs, payers, wording rules, document standards, the checks Psyflo runs, retention). |
| Pin, ×, × | | Pin keeps the panel open, the top × closes the panel, the × beside the icons closes the screen and returns to Scribe. |

**Same design at every clinic.** The panel and the mock EHR read a `ClinicConfig` and never name a clinic. Switch the clinic with the "Demo clinic" control in the browser bar. **Harvest Outreach** is the default (original TDT / school-based content: DPN, admission screening, intake/CNA, shortened CANS, continued-stay SRA). **CCCSN** is the substance use clinic (progress note, admission, ASAM assessment, continued-stay request).

Published (private) as https://claude.ai/artifact/G6AdUeEf9jsodBYNiuXHFC; the button-by-button guide is https://claude.ai/artifact/EcLxKwpHJ9gBzurrV74BP2.

## Run

```bash
bun install
npx vite build            # dist/index.html, one self-contained file
node scripts/e2e.mjs dist/index.html          # 72 checks through the UI
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
