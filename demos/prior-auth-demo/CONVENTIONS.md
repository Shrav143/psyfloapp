# Psyflo prior-auth demo: conventions for everyone building a module

A clickable, interactive front-end demo of Psyflo (AI-native prior authorization, utilization review, documentation and denials for behavioral-health and SUD programs). All data is invented. No clinic is ever named. The footer of the sidebar says "Demo data".

Stack: Vite 8, React 19, TypeScript (strict), Tailwind CSS v4, react-router-dom 7 (HashRouter), zustand 5, lucide-react. One `dist/index.html` is produced with everything inlined.

## Commands (run from this folder)

```bash
./node_modules/.bin/tsc --noEmit                       # typecheck the whole project
./node_modules/.bin/vite build --outDir dist-<you>    # build to YOUR OWN folder (several people build at once)
node scripts/shot.mjs dist-<you> /dashboard out.png   # screenshot a route of your build (prints console errors)
./node_modules/.bin/vite                               # dev server on :5173, if you prefer
```

Do not run `bun install` or add dependencies. Everything you need is installed (see package.json). If you truly need a package, say so in your final report.
Other people's files are changing while you work. `tsc` will show errors in files that are not yours: ignore them, fix only your own. If a build fails on someone else's half-written file, wait ten seconds and retry.
For your own Playwright click-through scripts: `import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs"`, launch with `executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"`, open `file://<abs path>/dist-<you>/index.html#/route`. Put scratch scripts in `/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/e2e/<you>/`, not in the repo.

## What you own, and what you must not touch

You own only the files your brief lists: your page folder(s) under `src/pages/`, your store slice file(s) under `src/store/`, and any data files you create under `src/data/<your-module>.ts` or `src/pages/<your-module>/`.
Read-only for you (the foundation): `src/components/ui/*`, `src/components/layout/*`, `src/data/types.ts`, `src/data/seed.ts`, `src/data/agents.ts`, `src/lib/*`, `src/routes.ts`, `src/App.tsx`, `src/store/index.ts`, `src/store/core.ts`, `src/store/selectors.ts`, `src/index.css`, config files. If one of them needs a change, make the smallest workaround inside your own folder and describe the wanted change in your final report.
Never edit another module's slice or pages. Route components are default exports of the placeholder files that already exist (`src/pages/<module>/<Name>Page.tsx`). Replace the placeholder content, keep the file name and the default export. You may add more files beside it.

## The store

One zustand store (`useStore` from `@/store`), built from slices. Read with selectors: `const requests = useStore((s) => s.requests)`. Call actions with `useStore.getState().x()` in handlers or via a selector.

Core (read-only): `clock` (demo minutes since Tue 20 Oct 2026, 10:42 am), `requests: PsyRequest[]` (the 39 Dashboard requests and denials), `filters`, `notifications`, `toast({title, body?, tone})`, `notify(...)`, `updateRequest(id, patch)`, `addEvent(id, {actor, text})`, `submitCase(payload)` (Sign and send: puts the request on the Dashboard as Received, returns its id), `simulateReply(id, reply)` (demo control: make the payer answer), `answerInfoRequest(id)`, `advanceClock(min)`. Selectors in `@/store/selectors`: `stageCounts`, `applyFilters`, `applyBaseFilters`, `inStage`, `lateness`, `sortForDashboard`, `minutesInStage`, `minutesLeft`.

Your slice: `src/store/<yours>.ts` already exists as a stub with a `...Slice` interface, a `create...Slice` creator and a sidebar badge selector. Fill in state, seed data (build it from your data files at creation time) and actions. Rules:
- All mutable demo state lives in the store, not in module-level variables, so "Reset demo data" (which restores every slice's initial state) works. Seed arrays must not be mutated: always create new objects.
- Keep the exported names of the badge selector (and `referralPrefill` in referrals.ts). The sidebar and the New case flow import them.
- You may read another slice only through a selector that its owner exports (none are promised beyond the badges and `referralPrefill`), so mostly use core state.

## Links

Never hard-code another module's URL. Use `paths` from `@/routes` (`paths.case(id)`, `paths.newCase({referral})`, `paths.denials(id)`, `paths.payers("cardinal", "changes")`, `paths.referral(id)`, `paths.dashboard({request})` …). Use `Link`, `useNavigate`, `useSearchParams`, `useParams`. Deep links must work on a fresh load (the Dashboard opens a request drawer from `?request=ID`).

## Design language (match the mockups)

Mockup PNGs of the target look are in `/tmp/claude-0/-home-user-psyfloapp/ddfab95c-9126-5a65-8f50-92eb52af205b/scratchpad/mock4/out5/` (one per screen). The PRD is `.../mock4/out4/Psyflo-PRD-v6.3-Flows-and-UI-UX.md`. Silna reference screenshots (for patterns only, never copy their wording) are in `.../scratchpad/silna-ref/` (referral and new-request screens), `.../scratchpad/silna/` and `.../silna2/`. Copy the structure, not the words.

- Cream canvas, white cards (20 px radius, hairline `border-edge`), forest green is the only brand color, serif (Newsreader) for headlines and card titles, DM Sans for everything else. No drop shadows except on overlays (menus, drawers, toasts).
- Use the kit: `import { Button, Card, CardHeader, CardBody, Pill, Chip, Dropdown, Segmented, UnderlineTabs, Stat, Banner, Table, Th, Td, Tr, Drawer, Modal, ProgressBars, Chance, Ring, Meter, Stepper, Timeline, AgentBadge, AgentChip, TextInput, TextArea, Field, Checkbox, Switch, ChoiceCard, FileDrop, FileRow, DocumentSheet, Donut, HBars, Funnel, Columns, Lines, Sparkline, Spinner, EmptyState, KeyValue, Fact, ListRow, IconBubble, Page, PageHeader, Crumbs, Label } from "@/components/ui"`. Read the component files for props. Tailwind tokens: `bg-canvas bg-card bg-tile border-edge border-line border-field text-ink text-ink2 text-muted bg-forest text-good bg-good-bg text-good-ink border-good-edge text-mid bg-mid-bg text-mid-ink text-risk bg-risk-bg text-risk-ink bg-neutral-bg text-neutral-ink font-serif`.
- Every page starts with `<Page><PageHeader title="a sentence" sub="one muted line" actions={…}/> …</Page>`. Headlines are sentences on the main pages, short nouns on detail pages.
- Meaning of color: good = approved, done, on track, strong chance. mid = caution, due soon, moderate. risk = denied, urgent, at risk. neutral = waiting, scheduled, informational. Color is never the only signal: every chip has a word, every number has a label.
- Approval chance is a percentage, shown with a range and the number of similar cases somewhere on the screen. Bands: Strong 80+, Moderate 55-79, At risk below 55 (`band()` from `@/lib/format`). It never blocks a request.
- Agents (sixteen, four crews) are always named where they act: `AgentBadge`/`AgentChip`, and text like "Navigator checks again in 22 minutes". Never say "AI" or "bot".
- Five gates where a person decides and agents stop: sign-off (a clinician signs), confirm (start agents, next step on a denial, write-back, update drafts), answer (an agent asks a question), acknowledge (a payer rule change), pause. Build real confirm/sign dialogs for these.
- Words: say "request" or "authorization" (not "case") for the ask to the payer; "clinical review"; "approval chance"; "payer signal"; "agents"; "the draft"; "sign and send"; "Needs your input"; "the chart supports". Do not say "discharge", "recommend admission" or "the patient needs". Say "payer" (not "payor").
- Privacy mode: patients appear as initials and age ("J.M., 34"). Member IDs are masked ("…4821"). Never invent a full patient name. Referral documents may show "J.M." in the name field with a "Privacy mode" note.
- No clinic names. Payers: Summit Medicaid HMO, Cardinal Health Plan, Beacon PPO, Harborview MA, Lakeshore Behavioral, Evergreen (see `PAYERS`). Level of care labels: Residential 3.5, IOP, PHP, Detox (`PROGRAM_LABEL`). Setting is Ohio.
- Designed at 1440 px wide, works from 1280. Tables scroll horizontally rather than wrap IDs and dates.

## Every control must do something

This is a demo someone will click through. There are no dead buttons. Each button, row, tab, tile, link and menu item must navigate, open a drawer or modal, change visible state, filter something, or at least raise a toast that says what would happen. Simulated agent work uses `setTimeout` with a spinner and short steps (0.5 to 1.5 seconds each) so it feels real but never drags. Prefer real state changes in the store over local fake ones, so other screens reflect them (for example, after Sign and send the request appears on the Dashboard).
Empty and "no results" states with a Clear filters action. Loading states for anything simulated. Keyboard reachable, labels on icon buttons, focus ring is global.

## Code quality

TypeScript strict, no `any`, no `console.log`, no unused code. Small components: split files over about 300 lines. Name files in PascalCase for components, camelCase for data. Comments say why, not what. Pure helpers (grouping, scoring, formatting) go in plain `.ts` files. Do not leave TODOs. Make the seed data internally consistent: the headline number on a page equals what the rows add up to. Canonical numbers that appear in several places:
- Dashboard: 39 distinct requests; stage tiles Preparing 5, Received 4, Under review 14, Info requested 3, Decided today 8 (6 approved, 2 denied), Appeal or call 7. Waiting on payers 18 (Received + Under review), waiting on you 3. 7 open denials, $62.4K at stake.
- Authorizations: 56 open requests, $538K at stake, 79% average approval chance (likely 74-84%), 19 need action today, 5 urgent. Bands: Act now 5 ($86K, 58%, 5 h), Due within 24 hours 14 ($142K, 76%, 3 h), This week 37 ($310K, 83%, 2 d). Last 30 days: 112 approved, 46 denied.
- R-1042 (J.M., 34, Summit Medicaid HMO, Residential 3.5, admission): chance 62% before actions, 88% after (likely 83-92%), 1,248 similar cases (212 your own, 806 network, 230 benchmark), drivers 58 + 11 + 9 + 6 + 5 + 3 - 4 = 88, 13 of 14 days likely.
- D-3318 (M.C., 38, Cardinal, Residential 3.5): 7 of 14 days approved, $22.4K at stake, peer-to-peer window closes in 36 h (call Wed 10/21, 9-11 am), chance 64% by call (55-72%), 58% by appeal (49-66%), 312 similar decisions.
- Eligibility & Benefits: 34 patients, 28 cleared to bill, 4 authorization first, 2 fix before billing, 5 re-checks due, sidebar badge 6.
- Case Manager: 56 active cases; 47 reviews due this week, 39 drafted, 8 need a clinician's update.
- Analytics (last quarter): 71% approved as asked, 29% top denial cause (continued-stay evidence), 84% advice taken works, 75% sent without edits; approval by payer Lakeshore 86, Beacon 81, Harborview 77, Summit 74, Evergreen 69, Cardinal 63; edits 68 / 27 / 5.
- Payers: 6 payers, 2 with a change waiting (Cardinal criteria v2026.3 affecting 4 drafts: R-1042, I-2207, R-0988, I-2231; Harborview). Summit documents for residential 3.5: 9 items; R-1042 has 8 of 9 (missing a therapy note from the last 14 days).
- EMR Connect: last sync 6 min, 23 charts matched today, 142 files this week, 2 fields need a mapping.

## Verification you must do before you report back

1. `tsc --noEmit` shows no errors in your files.
2. `vite build --outDir dist-<you>` succeeds.
3. Screenshot each of your routes at 1440 px and compare with the mockup PNGs: layout, copy tone, colors, density. Fix differences.
4. Write a Playwright script that clicks through every interaction on your screens (and the cross-module ones in your brief), asserts that the expected text appears afterwards, and that there are no page errors or console errors. Run it. Fix what fails.
5. Final report (short): files created, routes, store API you added, anything you could not finish, any change you need from the foundation, and the exact commands you ran to verify.
