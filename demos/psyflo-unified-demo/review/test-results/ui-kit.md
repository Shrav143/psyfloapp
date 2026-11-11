# ui-kit · PASS

Run 2026-11-11T18-35-31Z · 55825 ms · instance 0 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | token pairs: every text pair 4.5:1, every UI pair 3:1 (computed in the page from tokens.css) |  |
| PASS | type floor and brand: DM Sans, paper background, 12 px smallest kit size, teal primary |  |
| PASS | status vocabulary: every stage and dispute status resolves; chips carry text and an icon (never colour alone) |  |
| PASS | maturity chips: Working is hidden until the presenter overlay is on; Simulated, Pilot and Future always show |  |
| PASS | modal: role=dialog, aria-labelledby, focus trap both ways, Escape, scrim click, focus return |  |
| PASS | drawer: same contract as the modal |  |
| PASS | popover: Escape closes it and focus returns to the control |  |
| PASS | confirm resolves true on Confirm and false on Cancel; the toast has role=status (alert for errors) |  |
| PASS | the old modal(html, onMount) helper is now an accessible dialog (screens keep working) |  |
| PASS | filter chips: aria-pressed, state in the URL query, survives a reload, Clear |  |
| PASS | search keeps focus while typing and filters rows |  |
| PASS | queue table: aria-sort, sort toggles, real links, ArrowDown moves between rows, Enter opens |  |
| PASS | queue table: sticky header, empty, loading and error states |  |
| PASS | evidence chip opens a popover with the quote and closes on Escape |  |
| PASS | timeline: an event opens a drawer with What, When, Who, Document, Source, Next action |  |
| PASS | draft review: edit text survives repaints; no bulk accept; Restore previous appears after a save |  |
| PASS | a store change (SSE) while someone is typing does not wipe the field; the repaint waits for blur |  |
| PASS | skip link is the first tab stop and moves focus to the main landmark |  |
| PASS | landmarks: <html lang>, a labelled nav, exactly one main, real links in the rail |  |
| PASS | focus moves to main on a route change and the route is announced |  |
| PASS | the old demo bar is gone from the product viewport |  |
| PASS | rail: light sand, 232 px wide, collapses to icons at 1024; counts only where meaningful |  |
| PASS | rail by role follows the permission table (supervisor, clinician, admin, direct support) |  |
| PASS | dock: hidden by default in Presentation, Ctrl+Shift+P toggles, label PRESENTER, mode always visible, above the viewport |  |
| PASS | dock: ?present=1 opens it; ?mode=explore docks it open (no hide control) and is stored in psyflo_mode |  |
| PASS | dock: role switcher changes the signed-in role without a page reload |  |
| PASS | dock: scenario selector calls demo.scenario, signs in as the scenario role and opens its route |  |
| PASS | dock: simulation controls (receive a reply, advance a day) live in the dock |  |
| PASS | dock: notes drawer "How the data gets in" with maturity chips, focus returns to Notes |  |
| PASS | dock: All screens picker is role-aware and searchable |  |
| PASS | UiKit is presenter-only: without the dock it says so; with ?present=1 it shows the gallery |  |
| PASS | prefers-reduced-motion: overlay animation is switched off |  |
| PASS | no console errors on the gallery, the stubs and the shell routes |  |
