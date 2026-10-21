# Settings: coverage

Source: `src/pages/settings/SettingsPage.tsx`, `src/pages/settings/pauseEffects.ts`, `src/store/agentSettings.ts`, `src/data/agents.ts`. PRD: `07-ai-agents-and-automation.md` sections 7 and FR-25. File numbers are in this folder.

## Page

| Control | Diagram |
|---|---|
| Sidebar 'Settings' (above 'Help') | 10, 70 |
| Header 'Pause all agents' | 10, 40 |
| Header 'Resume all agents' (only when all sixteen are paused) | 40, 50 |
| Banner 'All agents are paused' or '{Agent} is paused' / 'N agents are paused', with what each pause holds back | 40, 50, 60, 70 |
| Banner button 'Resume all agents' (when some, not all, are paused) | 50 |
| Banner 'Privacy mode is always on' (no control) | 10, 70 |
| Four crew cards: Coverage, Documentation, Intelligence, Case work | 10 |
| Sixteen rows: icon, name, 'Paused' tag, one-line role | 10, 50, 85 |
| Round agent icon tooltip, role cut short with an ellipsis | 70 |
| Freedom dropdown on each row: open, three levels, arrow keys, Enter, Escape, click outside | 20 |
| What each level changes: the 'What each level changes' card | 10, 30, 70 |
| Which actions need a person or a clinician signature (PRD matrix) | 35 |
| On/off switch on each row (its name is the agent and whether it is paused) | 50 |
| Gates card: Sign-off, Confirm, Answer, Acknowledge, Pause | 10, 30, 70 |

## Pause

| Control | Diagram |
|---|---|
| 'Pause all agents?' pop-up: 'Pause all', 'Cancel', X, Escape, click outside | 40 |
| 'Resume all agents' and the 'Agents resumed' toast | 40, 50 |
| One switch off, one switch back on, the mixed states and their toasts | 50 |
| What each screen does with a pause: New case, Dashboard, Case Manager, Eligibility & Benefits, EMR Connect | 60 |
| Production kill switch (PRD FR-25) | 40, 60 |

## Toasts and other

| Item | Diagram |
|---|---|
| Toast '{Agent}: {level}' (only when the level changes) | 20 |
| Toast '{Agent} paused' / '{Agent} resumed' | 50, 70 |
| Toast 'All agents paused' | 40 |
| Toast 'Agents resumed' | 40, 50 |
| Toast time out and click to dismiss | 70 |
| No Save, Apply or Reset: every change is kept at once, lost on a reload | 20, 70 |
| Demo, Reset demo data (every agent back to its starting level, switches on) | 70 |

## Agent map

| Item | Diagram |
|---|---|
| Agents by screen, in the order of a case | 80 |
| Agents by crew, with every screen each one appears on | 85 |

## Not drawn

- Keyboard Tab order.
- Narrow-screen layout of the two-column card grid.
- The 'Demo data' tag in the sidebar.

## Looks broken or dead in the demo

- Only Reader and Navigator read their freedom, and only in EMR Connect (Sync now, Fix, Reconnect). The levels of the other fourteen agents are saved and shown but no screen acts on them. The levels card says 'Applied in EMR Connect'.
- Every agent can be paused. Screens that read the pause: New case (Agents work), Dashboard (Check all now, Navigator), Case Manager (Draft all due reviews, Cadence), Eligibility & Benefits (automatic re-checks, Verify) and EMR Connect (Reader, Navigator). Pausing any other agent only shows the tag and the banner.
- Settings keeps nothing after a reload.
- Forecaster is listed as 'Estimates the approval chance', while PRD 07 lists predicting approval probability as 'Never until calibrated'.
- Sentinel appears on Settings but no screen runs it. Only one seeded notification, 'Payer rule changed', is attributed to it.
