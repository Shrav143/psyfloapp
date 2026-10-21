# Settings: coverage

Source: `src/pages/settings/SettingsPage.tsx`, `src/data/agents.ts`. PRD: `07-ai-agents-and-automation.md` sections 7 and FR-25. File numbers are in this folder.

## Page

| Control | Diagram |
|---|---|
| Sidebar 'Settings' (above 'Help') | 10, 70 |
| Header 'Pause all agents' | 10, 40 |
| Header 'Resume all agents' (only when all sixteen are off) | 40, 50 |
| Banner 'All agents are paused' (only when all sixteen are off) | 40, 50, 70 |
| Banner 'Privacy mode is always on' (no control) | 10, 70 |
| Four crew cards: Coverage, Documentation, Intelligence, Case work | 10 |
| Sixteen rows: icon, name, one-line role | 10, 85 |
| Round agent icon tooltip, role cut short with an ellipsis | 70 |
| Freedom dropdown on each row: open, three levels, arrow keys, Enter, Escape, click outside | 20 |
| What each level allows, and the five gates | 30 |
| Which actions need a person or a clinician signature (PRD matrix) | 35 |
| On/off switch on each row | 50 |
| Gates card: Sign-off, Confirm, Answer, Acknowledge, Pause | 10, 30, 70 |

## Pause

| Control | Diagram |
|---|---|
| 'Pause all agents?' pop-up: 'Pause all', 'Cancel', X, Escape, click outside | 40 |
| 'Resume all agents' and the 'Agents resumed' toast | 40, 50 |
| One switch off, one switch back on, the mixed states | 50 |
| What the rest of the app shows; New case › Agents work has its own 'Pause all agents' and 'Resume agents' | 60 |
| Production kill switch (PRD FR-25) | 40, 60 |

## Toasts and other

| Item | Diagram |
|---|---|
| Toast '{Agent}: {level}' | 20 |
| Toast 'All agents paused' | 40 |
| Toast 'Agents resumed' | 40, 50 |
| Toast time out and click to dismiss | 70 |
| No Save, Apply or Reset; state lost on leaving | 20, 70 |
| Demo, Reset demo data | 70 |

## Agent map

| Item | Diagram |
|---|---|
| Agents by screen, in the order of a case | 80 |
| Agents by crew, with every screen each one appears on | 85 |

## Not drawn

- Keyboard Tab order and the switch's accessible name (it is 'Toggle').
- Narrow-screen layout of the two-column card grid.
- The 'Demo data' tag in the sidebar.

## Looks broken or dead in the demo

- The Freedom dropdown and the on/off switches live in the page only. Nothing else reads them, and they reset when the person leaves Settings or reloads.
- 'Pause all agents' stops nothing. The banner says so itself ('In this demo the pause does not change the other screens.').
- New case › Agents work has a separate pause button with its own state. The two are not linked.
- Picking the level an agent already has still shows a toast.
- Turning one switch back on after 'Pause all' removes the banner and returns the 'Pause all agents' button while fifteen agents stay off. There is no 'Resume' button for one to fifteen paused agents.
- A single paused agent shows no sign on its row except the switch.
- The demo gives no meaning for the three levels. The meanings in diagram 30 are read from the PRD matrix.
- Forecaster is listed as 'Estimates the approval chance', while PRD 07 lists predicting approval probability as 'Never until calibrated'.
- Sentinel appears on Settings but no screen runs it. Only one seeded notification, 'Payer rule changed', is attributed to it.
