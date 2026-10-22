# EMR Connect: coverage

Source: `src/pages/emr/*`, `src/store/emr.ts`, `src/data/emr.ts`. File numbers are in this folder.

## Page

| Control | Diagram |
|---|---|
| Sidebar 'EMR Connect' (Connections) | 10 |
| Line under the description: 'Simulated connection: this demo does not contact a real record system.' (said once on the page) | 10 |
| Header 'Connect a system' (a paused Reader shows a toast instead) | 10, 40, 52 |
| Banner 'Action required' (one line, only when something needs a person; its one button is 'Fix', 'Reconnect', 'Map field' or the link 'Open Settings') | 10, 22 |
| Four figures: Last sync, Charts matched today, Files pulled this week, Sync failures (not clickable) | 10, 15 |

## Connection health card

| Control | Diagram |
|---|---|
| Header 'Sync now' (dimmed while any sync runs; 'Nothing to sync' when no system is Connected) | 50 |
| Row 'Sync now' (Connected rows only, dimmed while any sync runs) | 50 |
| Row 'Fix' (Needs attention only) | 70 |
| Row 'Reconnect' (Disconnected only) | 85, 87 |
| Row 'Manage' | 80 |
| Row text: name, status pill, 'Reads ...', 'Last sync N min ago', 'Syncing', 'Not syncing', 'N sync failures' or 'Sync paused'; issue line and 'New case cannot pull a chart from it until it is connected.' | 20, 15 |
| Row write-back line: 'Read only.' or 'Read and write back.' with its one sentence | 25 |
| Row 'Write back' switch (named 'Write back for {system}'; toasts 'Write-back is on' and 'Write-back is off') | 25 |
| Empty list text | 10 (dotted, not reachable) |
| A paused agent, or 'Ask before acting', on Sync now, Connect, Fix and Reconnect: toast, or the 'Not now' pop-up with its link to Settings | 52 |

## Advanced (folded)

| Control | Diagram |
|---|---|
| 'Advanced' button (click, Enter or Space; one summary line; pill '2 to map') | 90 |
| 'Field mappings': waiting rows first with 'Map', then every mapping with its system and who mapped it | 60, 65, 90 |
| 'Recent activity': newest six lines, 'See all N' | 30, 90 |
| Activity log drawer: X, Escape, click outside | 30 |
| What adds a log line (every level of freedom logs; only 'Act on its own' skips the toast) | 30 |

## Connect a system pop-up

| Control | Diagram |
|---|---|
| Four System type cards, 'Name in Psyflo' ('Shown in Connection health.'), 'Next' | 40 |
| 'Contact at the practice' (required) and its error | 40 |
| 'Back' (step 2 only), 'Cancel', X, Escape, click outside | 40, 45 |
| 'Run the connection test' | 40 |
| Three checks, passed message, dimmed 'Connect {name}', 'Connect {name}' (Reconnect runs the same checks) | 45, 87 |
| What is saved: row (Read only), Files pulled +5, log line, toast | 45 |

## Sync

| Control | Diagram |
|---|---|
| Two-second wait, guard while a sync runs, leaving the page mid-sync, no Connected system | 50 |
| Four rotating results, counters, toast 'Sync finished' | 50 |
| What a sync pulls and when it runs (schedule is PRD only) | 55 |
| 'Pull a chart from EMR Connect' in New case (Connected systems only, blank fields while a mapping waits) and the write-back box on the Dashboard (needs a Connected system with its switch on) | 58 |

## Field mappings

| Control | Diagram |
|---|---|
| Map pop-up: dropdown (click, arrows, Enter, Escape), 'Save the mapping', 'Cancel', X, Escape, click outside | 60 |
| 'Map' on a waiting row in Advanced, or 'Map field' in the Action required line | 60, 22, 90 |
| Every seeded mapping, who mapped it, the two waiting fields and their choices | 65 |

## Problems

| Control | Diagram |
|---|---|
| Fix pop-up: 'Next', approver field, read-only checkbox, 'Renew and test', three checks, 'Finish and reconnect', 'Cancel', X, Escape, click outside | 70 |
| Reconnect pop-ups: Fix first when it had a problem ('Next: test the connection'), then 'Reconnect {name}', 'Cancel', X, Escape | 87 |
| Every error state and what it needs | 75, 22 |

## Manage drawer

| Control | Diagram |
|---|---|
| Drawer X, Escape, click outside | 80 |
| Connection details, Permissions (read chips; 'Read only' or 'Read and write back' in words) | 80 |
| Read chips by kind of system | 80 |
| 'Disconnect' | 80, 85 |
| Confirmation: 'Keep it connected', 'Disconnect', X, click outside, Escape (closes only the confirmation) | 85 |
| 'Reconnect' (row, banner or drawer) | 85, 87 |

## Not drawn

- Pause, edit, rename, delete and rotate-sign-in on a connection: the demo has none of them. The PRD lists pause and rotate credential on the integrations screen; a system can only be disconnected, never removed.
- A stand-alone 'Test' button: the demo has none. The connection test runs inside Connect, Fix and Reconnect (45, 70, 87) and always passes.
- The 'N synced. M needs attention first.' variant of the Sync finished toast: no button can start a sync on a system that needs attention, so it cannot appear.
- Browser tooltips on the round agent icons (agent name and role).
- Dark, loading and narrow-screen states.

## Changed in round 2 (UX refinement)

- The four big tiles became four small figures inside the 'Connection health' card. 'Need a mapping' left the figures (it is in the Action required line and the Advanced pill); 'Sync failures' is new (15).
- One 'Action required' line (22) replaces the side card 'Needs a mapping' as the place that asks for a person.
- Each system row says 'Read only' or 'Read and write back' in one sentence and holds the 'Write back' switch (25). The side card 'What the agents can do here' is gone (its two sentences are in each row and in the drawer's Permissions). The Manage drawer lost its switch and its mappings (80).
- 'Advanced' (90) holds the field mappings (now one list for all systems, 65) and the activity log (30).
- The header button 'Manage mapping' is gone: the mappings are in 'Advanced'.
- Status 'Needs a quick look' is now 'Needs attention' (20, 70, 75).
- 'Simulated connection' is said once, under the description (10).

## Looks broken or dead in the demo

- A mapping's chosen value (IOP or PHP, Payer name ...) is not applied anywhere. A mapped field only stops being left blank in New case's pull, and a mapped field cannot be unmapped or edited.
- The four charts New case can pull are fixed. Sync now adds none, and a new system offers none.
- 'Sync failures' counts one missed sync per hour since the last good sync of a system that needs attention (demo values). No sync actually runs on a schedule.
- Reader's default level is 'Act on its own', so a plain Sync now ends with no toast. The figures and the new log line show it. Set Reader to 'Act, then report' to see 'Sync finished'.
- Reader (Sync now, Connect a system) and Navigator (Fix, Reconnect) read the pause. Their freedom applies to Sync now, Fix and Reconnect only: Connect asks nothing beyond its own pop-up. Disconnect, Map and the Write back switch are a person's own choices and are never held back.
- If the Reconnect test pop-up is cancelled after its Fix steps, the sign-in stays renewed and the next Reconnect goes straight to the test.
