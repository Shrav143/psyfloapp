# Round 8: common brief for every engineer

You are one of five engineers working in parallel on Round 8 of a single-file HTML demo: Psyflo × Harvest Outreach Center (school-based Therapeutic Day Treatment, TDT, H2016, Virginia Medicaid). The demo is a browser window with tabs: Lauris Online (a look-alike of Harvest's EHR) with the Psyflo browser extension beside it, and the Psyflo web platform in its own tab.

Work dir: `T=/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/tdt-v2`.

Read first, in this order:
1. `$T/SPEC8.md`: the whole round. It has the transcript broken into parts (P1–P10), the decisions, every area's acceptance criteria (§5), the rules (§6) and the shared hooks (§7). Your area is named in your prompt.
2. `$T/BRIEF6.md`: copy rules that still apply. Use Lauris words ("consumer", "session"). No explanatory sentences under buttons or headings. Toasts are 6 words or fewer.
3. `$T/PLAN5.md`: the architecture. Screens register with `PSY.register`, render in Shadow DOM, and are wired with `data-go` / `data-act` / `data-change` / `data-input`. State lives in `PSY.state`.

The foundation is already in `src/` (version 4 state): roles and "View as", the extension panel without tabs (a view dropdown plus a work area), three buttons, the two-tab platform nav, and route redirects. `tests/r8-foundation.mjs` (11 checks) must stay green.

Build: `cd $T && OUT_NAME=<you>.html python3 build.py`. This writes `out/<you>.html`.

Test: `PROTO=out/<you>.html node tests/<suite>.mjs`. The suites are Playwright scripts; copy the launch lines from an existing suite. Five engineers share this machine, so run no more than 3–4 browser processes at once.

Screenshots: `PROTO=out/<you>.html OUT=<you>-name STEPS='js;;js' node tests/r8-shot.mjs` writes `shots/r8/<you>-name.png`. Open them with the Read tool and judge the result: layout, overflow, clutter, whether it reads simply.

## Hard rules
- Edit ONLY the files you own. If you need a change in someone else's file, put it in your report with the file and line. Never `rm` other people's files. Do not touch git.
- Shared state: another engineer may be mid-edit in a file you only read. If the build or syntax breaks in a file you do not own, wait a minute and rebuild before reporting it.
- Demo data stays fictional. Use initials only and no Medicaid ID values ("on file"). Keep family details generic.
- Psyflo never signs and never fakes a signature. It never invents diagnoses, symptoms, clinical findings, payer rules, deadlines, rates or approval probabilities. Enhanced or drafted text uses only what is in the demo record or what was said in the scripted conversation, and cites its sources. Clinician Input Required items are never filled by Psyflo.
- Every simulated step (submission, an agent signing in to a portal or to Lauris, a PDF) gets a **Simulated** chip. Use `PSY.ev.label('illustrative','Simulated')` or the style already in use.
- Artifact contract: no `alert`, `confirm`, `prompt`, `print`, real downloads or `window.open`. No doctype/html/head/body. Do not change `location.hash` except via the existing router.
- Keep it simple. The whole point of this round (SPEC8 P10) is that the product is easy to explain: two platform tabs and three extension buttons. Prefer removing to adding. One line of secondary text at most, and only if it is data.

## Done means
1. Your area works by click as SPEC8 §5 describes, for each role it applies to: `PSY.setRole('dss'|'lcs'|'admin')`.
2. Your old suites are updated or retired, and your new `tests/r8-<area>.mjs` suite is green on your build. Do not weaken behavioural checks. Delete assertions that only protected removed features, and list them.
3. These are green on your build: `tests/sweep.mjs` (all routes × panel open/closed, no errors or overflow), `tests/r8-foundation.mjs`, `tests/r7-scan.mjs` (no patient/student/child wording).
4. You have screenshots of your key states and you have looked at them.
5. A report of 400 words or fewer: files changed, new or retired suites with pass counts, assertions removed or changed and why, cross-owner items (file:line), real bugs found, and any decision you made that the user should know about.
