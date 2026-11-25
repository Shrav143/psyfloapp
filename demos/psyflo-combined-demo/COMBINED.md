# Psyflo combined demo: the Psyflo extension and the Psyflo platform in one page

One page with a **toggle at the top**: **Extension** | **Psyflo platform**. It is on both sides, so one click goes either way and each side keeps its place.

| Side | What it is |
|---|---|
| **Extension** (the demo opens here) | The clinic's EHR, a mock called Lauris Online, with the **Psyflo extension** docked on its right: the six-icon design (Scribe, History, Patients, Scan & Enhance, Help, Settings). |
| **Psyflo platform** | The Psyflo web app: Dashboard, Authorizations (with Eligibility & Benefits), Denial Intelligence, Analytics, Payers, Settings. |

Everything is demo data. Nothing is sent anywhere. Published (private) as https://claude.ai/artifact/SDenJ5iEfakqVzNsoX6c5z.

## The platform, simplified

- **No New Case** (intake and clinical documentation happen in the EHR) and **no EMR Connect** (Psyflo is not integrated with anything). Their screens, routes and links are gone.
- **Eligibility & Benefits** stays, under Authorizations.
- **Dashboard** is a summary read at a glance. Menus on top (two for dates: *Updated* and *Due*; then payer, program, request type; the site switch is in the top bar), six icon tiles with a number each
  (red = needs a person now, yellow = coming up, grey = with the payer, red scale = denied, green = active, hourglass = expiring), and one table grouped by colour.
  The old "Do next" list is the first group of the table (*Needs attention*). Rows are icons: status, program, request type, time left, units left (with an hourglass when they end within 7 days) and one round button for the next step. Every icon has a tooltip. The tiles filter the table.
- **Payers** is a plain list and one page per payer. Above: **Tell the agents about this payer**, a box where the clinic writes what Psyflo does not know (a process, a habit), picks which agents read it, and sees what the agents will read. Below: the rules Psyflo already follows for that payer. No workflow builder, no test workflow, no history tab.

## What the extension does here

- **Scribe**, **History**, **Patients**, **Help**, **Settings**: the extension demo (see `src/ext/`). Any client can be given any document; Scribe drafts only what was said, Psyflo types, a person saves.
- **Scan & Enhance** has two faces. On a document (progress note, admission screening, ASAM assessment, continued stay request) it audits the document and offers fixes. On an **authorization form** it is the **recommendation section**:
  *Suggested by Psyflo* cards (include, where it goes, points, the person's own words where a suggestion needs them, Why, Dismiss), **Add N to the Lauris form**, Refine, Add clinical context, and, on a denied authorization, **Denial corrections**. The appeal letter stays in Psyflo.
- **Check before save** works on documents and on an authorization form (it pauses while a suggestion the request needs is still open). Save again saves anyway.

Rules that did not change: Psyflo never writes clinical judgement; text typed into Lauris is a stored record's words, the clinic's wording, or a fixed frame around words the person typed;
**green = already in Lauris, yellow = Psyflo typed it, check it**; the extension never presses Save.

## One clinic

The clinic is Community Counseling Center of Southern Nevada (a placeholder name): adult substance use treatment, ASAM Levels 1 and 2.1, so the language is substance use and ASAM, not day treatment or child mental health.
Lauris lists the clinic's own clients first (M.R., T.W., L.B., D.W., S.B., P.G.; they have documents), then a consumer for every request of the platform's queue with the same Lauris number as in the platform (each has an authorization form).
The platform's payers are Ohio-style (Summit, Cardinal, …) because the platform was not re-based; the clinic's own clients use Nevada payers.

## How it is built

| Path | What |
|---|---|
| `src/` (all but `ext/`, `ehr/`) | The Psyflo platform (Tailwind, zustand store `@/store`, react-router). |
| `src/ext/` | The extension: its own zustand store (`@/ext/store`), the clinic (`clinics/cccsn`, `clinics/queue.ts`, `clinics/index.ts`), the mock Lauris, the panel. Its CSS is scoped (`.psy`, `.lauris`, `.shell`) and its tokens use names the platform theme does not (`--paper`, `--navy`, …). |
| `src/components/ViewToggle.tsx` | The Extension / Psyflo platform toggle, used by the browser frame and the platform's top bar. |
| `src/ext/LaurisShell.tsx`, `BrowserFrame.tsx` | The browser window around Lauris and the panel. Route `/lauris`; the demo opens on it. |
| `src/ext/lauris/AuthPage.tsx`, `AuthFieldBox.tsx` | The authorization form in Lauris. Reads the platform's case (`useEhrCase`); the extension types through the platform's `ehrAddRecs` / `ehrAddFixes`, so Lauris, the case page and the approval chance agree. |
| `src/ext/panel/views/RecView.tsx` | The recommendation section. |
| `src/pages/dashboard/` | `DashboardPage`, `Tiles`, `DashTable`, `model.ts` (how a request gets its colour and the date menus). |
| `src/pages/payers/` | `PayersLandingPage`, `PayerWorkspace`, `PayerContext` (the box for the agents); store slice `src/store/payerNotes.ts`. |
| `src/ehr/model.ts`, `src/ehr/useOpenLauris.ts`, `src/store/ehr.ts` | The bridge between the platform's cases and Lauris's authorization form. |

Which Lauris page is open is kept by the extension's store, not by the address. A button in Psyflo that says *Add in Lauris* / *Edit authorization in Lauris* / *Fix in Lauris* calls `useOpenLauris`, which opens that authorization in Lauris.

## Build and check

```bash
npx tsc --noEmit
npx vite build                                   # dist/index.html, one self-contained file
node scripts/e2e.mjs dist/index.html             # platform <-> Lauris, recommendations, denial corrections, Check before save, Scribe, Scan, the simplified platform
VITE_HOSTED=1 npx vite build --outDir dist-hosted && node scripts/e2e.mjs dist-hosted/index.html hosted
node scripts/pack-hosted.mjs dist-hosted/index.html fragment.html wrapper.html   # the page body for the Artifact tool
```
The tests set `window.__PSYFLO_SPEED__ = 40` to run the simulated timing fast.

## Known gaps

- Help has no links yet: Chat with Psyflo (Help Scout), FAQs and Training videos each say where they will open. Put the real URLs in `src/ext/helpLinks.ts`.
- The extension is a simulation. It does not read a real EHR page; the mock Lauris and the extension share one in-page store.
- The clinic's own documents exist for M.R., T.W. and L.B. For everyone else a document is a blank one that retells the clinic's sample session with initials swapped.
- The platform's consumers and the clinic's own clients are two sets of people with different payers; the platform has not been re-based on Nevada payers.
- Some logic behind New Case and EMR Connect (stores, drafts, referrals) is still in the code but nothing in the app reaches it.
