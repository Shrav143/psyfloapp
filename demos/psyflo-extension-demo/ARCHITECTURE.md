# Psyflo extension demo: architecture and contracts

A standalone demo of the **Psyflo browser extension** inside a mock **Lauris Online** EHR. One extension design, driven by a `ClinicConfig`: the look never changes between clinics, only the content does (Harvest Outreach first; CCCSN swappable from the "Demo clinic" switch in the browser bar).
The Psyflo platform (dashboard, appeal letters) is out of scope. The extension does two jobs on EHR documents: **Scribe** (listen, draft, type into the EHR fields) and **Scan & Enhance** (read a document that is already written, audit it, propose fixes and type them in).

Design reference: Clinically AI's side-panel extension (structure only, not their look). What each of their buttons means, and how Psyflo uses it, is in `docs/CLINICALLY-AI-LEARNINGS.md`.

## The rules (every file obeys these)

1. **Psyflo never writes clinical judgement.** Text typed into the EHR is (a) a quotation of a stored chart record, (b) the clinic's own wording, or (c) a fixed sentence frame around words the clinician typed (`Fix.kind === "ask"`) or an option the clinician picked (`"choose"`). Scribe restates only what was said in the recording; a field nothing was said about stays empty ("Not stated").
2. **Psyflo types, a person saves.** The extension never presses Save in Lauris. Typed text is yellow until the person saves in Lauris, then green. Green = already in Lauris, yellow = Psyflo typed it, check it.
3. **Sample data is labelled Simulated.** Initials only, no real IDs, no real payers' real criteria quoted (the clinic's own wording only, labelled sample). No invented citations: a `reference` source is a widely-known title with no section numbers and no quoted words.
4. **Clinic-agnostic UI.** No panel or Lauris component may contain a clinic name, a program name, a form name or a clinical term. They read `ClinicConfig` through `useCurrent()` / `useStore`.
5. Honest states: if a check cannot be fixed from the chart or by asking, its finding has `fix: null` and the card says the clinician decides.

## Folders and owners

| Path | What | Owner |
|---|---|---|
| `src/types.ts` | all contracts | foundation (do not edit; ask) |
| `src/engine.ts`, `src/store.ts`, `src/hooks.ts` | pure helpers, all behaviour, current-page hook | foundation (do not edit; ask) |
| `src/clinics/harvest/*` + `src/clinics/harvest.ts` (re-export) | Harvest Outreach content | content-harvest |
| `src/clinics/cccsn/*` + `src/clinics/cccsn.ts` (re-export) | CCCSN content | content-cccsn |
| `src/lauris/*` | the mock EHR pages (no browser frame, no panel) | lauris |
| `src/panel/Panel.tsx`, `src/panel/base.css`, `src/BrowserFrame.tsx`, `src/App.tsx`, `src/app.css`, `src/tokens.css` | shell, shared parts | foundation |
| `src/panel/views/ScanView.tsx`, `HelpView.tsx`, `SettingsView.tsx`, `PatientsView.tsx` (+ `panel-scan.css`, `panel-nav.css`) | Scan & Enhance with Check before save; Help (three links); Settings (Recording, Check before save); Patients | panel |
| `src/panel/views/ScribeView.tsx`, `scribe/*`, `HistoryView.tsx` (+ `panel-scribe.css`, `panel-more.css`) | Scribe, History | panel |

Each view's own css file is imported by that view (`import "../panel-scan.css"`) and every selector starts with `.psy`. Shared parts live in `src/panel/base.css` (`.p-card .p-btn .p-chip .p-input .p-seg .p-switch .p-orb .p-bubble ...`): use them first.

## How the pieces talk (all through `useStore`, see `src/store.ts`)

- The EHR page is `store.page`: `consumers`, `consumer`, or `form` (a document). `openConsumer`, `openDoc`, `goConsumers` navigate it. The panel reads it with `useCurrent()`.
- A document's values live in `store.docs[docId]` (`DocState`: `values`, `typed` (yellow keys), `appended` (the sentences Psyflo added, for marking), `green`). `editField(docId, key, value)` is a person typing in Lauris. `boxState(doc, key)` gives `"typed" | "lauris" | ""` for colouring.
- **Scribe** is a state machine in `store.scribe` (`stage`: start → consent → capturing → generating → review → typed; `recover` when the person leaves the document while recording). Actions: `scribeOpen(docId)`, `scribeMode`, `scribeTelehealth`, `scribeContinue`, `scribeConsent("yes"|"declined")`, `scribePause`, `scribeComplete`, `scribeCancel`, `scribeResume`, `scribeDiscard`, `scribeToggle(key)`, `scribeEdit(key, value)`, `scribeType()`, `scribeRegenerate()`. The scenario for the open document is `clinic.scribe.find(s => s.docId === scribe.docId)`; the transcript heard so far is `scenario.lines.slice(0, scribe.shown)`.
- **Scan & Enhance** is `store.scans[docId]` (`ScanState`: `findings`, `status` by finding id (`open | added | dismissed`), `answers`, `running`, `scannedAt`, `stale`). Actions: `scanRun(docId)`, `fixAnswer(id, text)`, `fixApply(id)`, `fixDismiss(id)`, `fixRestore(id)`, `fixAllReady(docId)`, `focusFinding(id)`. `store.focus` is the finding the person clicked in the EHR (the panel scrolls to it and highlights it).
- **Check before save**: Lauris's Save button calls `requestSave(docId)`. If `settings.onSave` and open findings at or above `settings.pauseAt` exist, the save is paused: `store.checking === docId` while it "checks" (about a second), then `store.pause = { docId, ids }` and the panel jumps to Scan. Pressing Save again (or the panel's "Save anyway") saves and records the open alerts in History. `store.flash` is the message Lauris shows after a save.
- **History**: `store.history` (seeded from the config, plus what happens in the session).
- **Settings**: `store.settings` (`pauseAt`, `onSave`), `setSettings`; `store.prefs` (microphone, language, telehealth default), `setPrefs`. Help links live in `src/helpLinks.ts`.

## Stable test hooks (the end-to-end check relies on these exact attributes)

Lauris: `[data-testid="consumers-table"]`, consumer link `a[data-consumer="<id>"]`; document link `[data-doc="<docId>"]` (on a consumer page); a form's field wrapper `[data-field="<key>"]` with `data-state="typed|lauris|"` (on the wrapper); Save `[data-testid="lauris-save"]`; `[data-testid="lauris-flash"]`; `[data-testid="lauris-checking"]`; `[data-testid="lauris-pause"]` (the paused-save banner); a Psyflo alert chip beside a field `[data-testid="chip"]` with `data-finding="<id>"` and `data-sev`.
Panel: tabs `[data-testid="tab-scribe|history|patients|scan|help|settings"]`; Scribe: `[data-testid="scribe-start"]` (Continue/Start), mode `[data-mode="live|dictation"]`, `[data-testid="consent-yes"]`, `[data-testid="consent-no"]`, `[data-testid="scribe-pause"]`, `[data-testid="scribe-complete"]`, review card `[data-draft="<key>"]` (checkbox inside), `[data-testid="scribe-type"]`, typed screen `[data-testid="scribe-typed"]`, `[data-testid="scribe-to-scan"]`, `[data-testid="scribe-resume"]`, `[data-testid="scribe-discard"]`; Scan: `[data-testid="scan-run"]`, `[data-testid="scan-tally"]`, finding card `[data-finding="<id>"]` with `data-sev` and `data-status`, `[data-testid="fix-add"]`, `[data-testid="fix-dismiss"]`, `[data-testid="fix-answer"]` (the input; for `choose` the option buttons carry `data-option`), `[data-testid="fix-all"]`, `[data-testid="checks-run"]`, `[data-testid="pause-card"]`, `[data-testid="save-anyway"]`; History: `[data-testid="hist-tab-documents|sessions"]`, `[data-testid="hist-who"]`, `[data-testid="hist-search"]`, `[data-testid="hist-item"]`; Patients: `[data-testid="pat-row"]`, `[data-testid="pat-search"]`; Help: `[data-testid="help-chat|help-faq|help-training"]`; Settings: `[data-testid="set-onsave"]`, `[data-testid="set-pauseat"]`, `[data-testid="set-mic|set-language|set-telehealth"]`.

## Build and check

```bash
bun install          # once
npx tsc --noEmit
npx vite build       # dist/index.html, one self-contained file
node scripts/e2e.mjs dist/index.html
```

Tests set `window.__PSYFLO_SPEED__ = 40` (via `addInitScript`) to run the simulated timing fast.
