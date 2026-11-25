# Psyflo combined demo: the platform, Lauris and the Psyflo extension in one page

One page, two tabs, as in a real browser:

| Tab | What it is |
|---|---|
| **Lauris Online** (the demo opens here) | The clinic's EHR (a mock) with the **Psyflo extension** docked on its right. The extension is the six-icon design of the extension demo (`demos/psyflo-extension-demo`): Scribe, History, Patients, Scan & Enhance, Help, Settings. |
| **Psyflo platform** (first tab, `↗`; and the **Lauris + extension** button in the platform's top bar goes back) | The Psyflo web app of the Prior Auth demo: Dashboard, Authorizations, Denial Intelligence, Payers, and the rest. |

Everything is demo data. Nothing is sent anywhere. Published (private) as https://claude.ai/artifact/SDenJ5iEfakqVzNsoX6c5z.

## What the extension does here

- **Scribe**, **History**, **Patients**, **Help**, **Settings**: exactly the extension demo (see `src/ext/`). Any patient can be given any document; Scribe drafts only what was said, Psyflo types, a person saves.
- **Scan & Enhance** has two faces. On a document (daily note, admission, intake, assessment) it audits the document and offers fixes. On an **authorization form** it is the **recommendation section**:
  *Suggested by Psyflo* cards (include, where it goes, points, the person's own words where a suggestion needs them, Why, Dismiss), **Add N to the Lauris form**, Refine, Add clinical context,
  and, on a denied authorization, **Denial corrections** (the chart excerpt each finding rests on). The appeal letter stays in Psyflo.
- **Check before save** works on documents (alerts at or above the pause level) and on an authorization form (it pauses while a suggestion the request needs is still open). Save again saves anyway.

Rules that did not change: Psyflo never writes clinical judgement; text typed into Lauris is a stored record's words, the clinic's wording, or a fixed frame around words the person typed;
**green = already in Lauris, yellow = Psyflo typed it, check it**; the extension never presses Save.

## One roster

The Lauris roster is the platform's own queue: a consumer for every request, with the same Lauris number (`4000 + n`) as in the platform. A request opened in Psyflo is the same person in Lauris.
Each consumer has the authorization form; three consumers (J.M., T.R., D.L.) also have documents; any consumer can be given any document from the panel.
The **Demo data** switch in the browser bar swaps Lauris to the **Harvest** or **CCCSN** content of the extension demo (the original TDT/school-based content), for showing the extension on a different clinic.
Opening an authorization from the platform brings the platform's own consumers back.

## How it is built

| Path | What |
|---|---|
| `src/` (all but `ext/`, `ehr/`) | The Psyflo platform (unchanged: Tailwind, zustand store `@/store`, react-router). |
| `src/ext/` | The extension demo: its own zustand store (`@/ext/store`), clinic configs, mock Lauris, panel. Its CSS is scoped (`.psy`, `.lauris`, `.shell`) and its design tokens use names the platform theme does not (`--paper`, `--navy`, …). |
| `src/ext/clinics/platform/` | The sample treatment center behind the platform: profile, forms (daily note, admission, intake, ASAM-style summary), roster from the queue, documents, Scribe sessions, audit checks, history. |
| `src/ext/LaurisShell.tsx`, `src/ext/BrowserFrame.tsx` | The browser window (two tabs, Demo data switch, extension button) around Lauris and the panel. Route `/lauris`; the demo opens on it. |
| `src/ext/lauris/AuthPage.tsx`, `AuthFieldBox.tsx` | The authorization form in Lauris. Reads the platform's case (`useEhrCase`); the extension's typing goes through the platform's `ehrAddRecs` / `ehrAddFixes`, so Lauris, the case page and the approval chance agree. |
| `src/ext/panel/views/RecView.tsx` | The recommendation section. |
| `src/ehr/model.ts`, `src/ehr/useOpenLauris.ts`, `src/store/ehr.ts` | The bridge: the case-to-form model, the "open in Lauris" hook used by the platform's buttons, the form state. |

Which Lauris page is open is kept by the extension's store, not by the address. A button in Psyflo that says *Add in Lauris* / *Edit authorization in Lauris* / *Fix in Lauris* calls `useOpenLauris`, which opens that authorization in Lauris and the platform tab keeps its place (the Psyflo tab returns to it).

## Build and check

```bash
npx tsc --noEmit
npx vite build                                   # dist/index.html, one self-contained file
node scripts/e2e.mjs dist/index.html             # the combined flows (platform <-> Lauris, recommendations, denial corrections, Check before save, Scribe, Scan)
node scripts/ext-e2e.mjs dist/index.html         # the extension demo's own checks, on the Harvest content (and CCCSN)
VITE_HOSTED=1 npx vite build --outDir dist-hosted && node scripts/e2e.mjs dist-hosted/index.html hosted
node scripts/pack-hosted.mjs dist-hosted/index.html fragment.html wrapper.html   # the page body for the Artifact tool
```
The tests set `window.__PSYFLO_SPEED__ = 40` to run the simulated timing fast.

## Known gaps

- Help has no links yet: Chat with Psyflo (Help Scout), FAQs and Training videos each say where they will open. Put the real URLs in `src/ext/helpLinks.ts`.
- The extension is a simulation. It does not read a real EHR page; the mock Lauris and the extension share one in-page store.
- Sample documents exist for three consumers; for everyone else a document is a blank one that retells the clinic's sample session with initials swapped.
- The Harvest and CCCSN content is not connected to the platform: their patients are not platform cases.
