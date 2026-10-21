# EMR Connect: coverage

Source: `src/pages/emr/*`, `src/store/emr.ts`, `src/data/emr.ts`. File numbers are in this folder.

## Page

| Control | Diagram |
|---|---|
| Sidebar 'EMR Connect' (Connections) | 10 |
| Header 'Manage mapping' (opens the outpatient site, or the first system; dimmed with no systems) | 10, 80 |
| Header 'Connect a system' | 10, 40 |
| Four tiles: Last sync, Charts matched today, Files pulled, Need a mapping (not clickable) | 10, 15 |

## Connected systems card

| Control | Diagram |
|---|---|
| Header 'Sync now' | 50 |
| Row 'Sync now' (Connected rows only) | 50 |
| Row 'Fix' (Needs a quick look only) | 70 |
| Row 'Reconnect' (Disconnected only) | 85 |
| Row 'Manage' | 80 |
| Row text: 'N min ago', 'Syncing', 'Not syncing'; status pills; issue line | 20 |
| Empty list text | 10 (dotted, not reachable) |

## Recent activity and side panels

| Control | Diagram |
|---|---|
| 'See all N' | 30 |
| Activity log drawer: X, Escape, click outside | 30 |
| What adds a log line | 30 |
| 'What the agents can do here' (static Read / Write back) | 10 |
| 'Needs a mapping' card: count pill, 'Map' per field, empty text | 60 |

## Connect a system pop-up

| Control | Diagram |
|---|---|
| Four System type cards, 'Name in Psyflo', 'Next' | 40 |
| 'Contact at the practice' (required) and its error | 40 |
| 'Back' (step 2 only), 'Cancel', X, Escape, click outside | 40, 45 |
| 'Run the connection test' | 40 |
| Three checks, passed message, dimmed 'Connect {name}', 'Connect {name}' | 45 |
| What is saved: row, Files pulled +5, log line, toast | 45 |

## Sync

| Control | Diagram |
|---|---|
| Two-second wait, guard while a sync runs, leaving the page mid-sync, no Connected system | 50 |
| Four rotating results, counters, toast 'Sync finished' | 50 |
| What a sync pulls and when it runs (schedule is PRD only) | 55 |
| 'Pull a chart from EMR Connect' in New case and the write-back on the Dashboard | 58 |

## Field mappings

| Control | Diagram |
|---|---|
| Map pop-up: dropdown (click, arrows, Enter, Escape), 'Save the mapping', 'Cancel', X, Escape, click outside | 60 |
| Escape when the pop-up sits on the Manage drawer | 60 |
| Manage drawer 'Field mappings' table, 'Map' on a 'Not mapped' row | 60, 65, 80 |
| Every seeded mapping, who mapped it, the two waiting fields and their choices | 65 |

## Problems

| Control | Diagram |
|---|---|
| Fix pop-up: 'Next', approver field, read-only checkbox, 'Renew and test', three checks, 'Finish and reconnect', 'Cancel', X, Escape, click outside | 70 |
| Every error state and what it needs | 75 |

## Manage drawer

| Control | Diagram |
|---|---|
| Drawer X, Escape, click outside | 80 |
| Connection details, Permissions read chips | 80 |
| Write-back switch | 80 |
| 'Disconnect' | 80, 85 |
| Confirmation: 'Keep it connected', 'Disconnect', X, click outside, Escape | 85 |
| 'Reconnect' (row or drawer) | 85 |

## Not drawn

- Pause, edit, rename, delete and rotate-sign-in on a connection: the demo has none of them. The PRD lists pause and rotate credential on the integrations screen; a system can only be disconnected, never removed.
- The 'N synced. M needs a quick look first.' variant of the Sync finished toast: no button can start a sync on a system that needs a look, so it cannot appear.
- Browser tooltips on the round agent icons (agent name and role).
- Dark, loading and narrow-screen states.

## Looks broken or dead in the demo

- The per-system write-back switch is stored and logged but nothing reads it. The Dashboard 'Approve write-back' works with it on or off.
- A saved field mapping is not used anywhere else, and a mapped field cannot be unmapped or edited.
- 'Pull a chart from EMR Connect' in New case uses a fixed list of four charts. It works with every system disconnected, and Sync now adds nothing to it.
- 'Reconnect' skips Fix and any test, so a system that needed a quick look can be cleared by Disconnect then Reconnect.
- Escape on the Manage drawer with a Map pop-up open closes the drawer first and leaves the pop-up. Escape with the Disconnect confirmation open closes both and does not disconnect.
- Header 'Sync now' is not dimmed while a row sync runs. The click is ignored with no message.
- The Fix log line says it pulled 12 remittances but the Files pulled tile does not change.
- Manage lists the clinical read chips (Assessments, Progress notes ...) for Lab results and Practice management systems too.
- The activity drawer says 'Admins can see who and what'. There is no such view.
