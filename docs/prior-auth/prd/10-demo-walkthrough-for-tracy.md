# PRD 10 — Monday Demo Walkthrough (Harbor / Tracy)

**Purpose:** the six-minute script for the clickable demo in `apps/frontend` (`/demo`), what to listen for, and the two asks. Run it from `/demo/today` on a laptop over screen share.

## Ground rules

1. Say "this is demo data, not Harbor's records" in the first sentence (the amber pill in the top bar says it too). Then never mention it again.
2. Never say "submission". If she raises it, agree it is solved and move on.
3. Do not defend a number. If she says a figure is wrong, ask what the right one is and write it down.
4. Show the sign-off gate without narrating it. Let her notice nothing sends itself.
5. Do not promise prediction. The honest answer is "not yet, and here is how we would find out."

## The script

| Beat | Route | Do | Say | Listen for |
| --- | --- | --- | --- | --- |
| 0:00 | `/demo/today` | Land on the hero | "You told us 45 of 60. Here's that number, and here's the 15 broken down by cause — each cause has a different owner." Click "Units exhausted". | Does she correct the breakdown? Any correction is gold |
| 0:45 | `/demo/today` | Point at "Needs me today" | "And this is your day: what needs a signature, what's past the 7-day rule, which appeal deadline is inside 14 days." | Does she staff by a daily list today? |
| 1:15 | `/demo/authorizations/auth-HBH-1042` | Open the hero patient | "Two clocks. 34 of 45 units, 61 of 90 days. At four visits a week units run out first; file by the date it says. Lead time is per payer." | Is her lead-time rule different? |
| 2:15 | `/demo/authorizations/auth-HBH-1077` | Open the four-renewals patient; scroll the history | "Four renewals. 60, 45, 30, denied, won on appeal. Sunwave shows only the last box. This payer has cut you every time." | This is the beat that should land hardest |
| 3:00 | `/demo/payers` | Scorecard | "Your aggregate is about 70%. WellCare is 62% and falling; partials 31%. The average hides it. And that column is what they publish versus what you see." | Does she name a plan before we do? |
| 3:45 | `/demo/renewals` | Radar | "Nine renewals bind this week. About 30 clinician hours. Overdue ones show gap days, each unbilled visit at $244." Toggle the buffer. | Does she staff by week? Are renewals backdated? |
| 4:30 | `/demo/appeals/[first]` | Appeal workspace | "Denial received, validity check, letters drafted, packet split in three, then it waits for Heather. After sending, the agent calls on day three and writes the reference and due date here." | "Where is my appeal" — does this close it? |
| 5:15 | `/demo/leakage` | Waterfall | "Your waterfall, continuously. Preventable subtotal is the honest sizing. The clinician-hours field is blank — that number is yours." | The ask |
| 5:45 | `/demo/eligibility`, `/demo/agents` | 20 seconds each | "Verification runs on a rolling week with an action per exception. And this is every agent and the one thing each will never do." | Anything she wants first |

## The two asks

1. A 90-day export of authorizations, decisions and attendance — even the five-tab spreadsheet — so the next version runs on Harbor's real numbers.
2. Her engine's approval grades against actual outcomes, so we can answer the calibration question.

## Numbers in the demo and where they come from

All figures are computed at load from `apps/frontend/src/lib/demo/*` (seeded, deterministic): 60 patients, 2 sites, 5 MCOs + Medicare, about 210 authorization versions over six quarters, ~4,800 visits, coverage classified per visit, $244.29 per visit day, clinician $90/hour, 3.5 hours per packet. Planted stories: the hero patient (HBH-1042), four renewals (HBH-1077), stranded units (HBH-1112), dual-eligible (HBH-1049), the fast approval (HBH-1233), MRN typo corrected (HBH-1360), overdue renewal 11 days (HBH-1401), missing document (HBH-1408), the degrading payer (WellCare), the lapsed member on the eligibility screen.

## What we will not show

An approval probability. Auto-submission. Names. Anything that looks like "we file your paperwork".
