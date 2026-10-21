# EMR Connect

Connected systems, sync, field mappings and fixes.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/09-emr-connect/`.

## EMR Connect › Page › Arrive and read the page

What a person sees on arrival: two header buttons, four tiles, the Connected systems list, Recent activity and two side panels. Each region hands off to its own diagram.

Route: `/emr`

Demo data. Three systems start on the list: two clinical record sites (Connected) and a Billing system (Needs a quick look).

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "<b>Click 'EMR Connect' in the sidebar</b><br/>Under Connections" }
  p1@{ shape: curv-trap, label: "<b>EMR Connect</b><br/>Charts arrive on their own. Nothing is written back until a person approves it." }
  subgraph gHead ["Header buttons"]
  hb1@{ shape: trap-t, label: "Click 'Manage mapping'" }
  hq@{ shape: diam, label: "Any system on the list?" }
  ho@{ shape: win-pane, label: "<b>Manage drawer opens</b><br/>for the outpatient site, or the first system" }
  hx@{ shape: stadium, label: "<b>Button is dimmed</b><br/>Nothing to open" }
  hb2@{ shape: trap-t, label: "<b>Click 'Connect a system'</b><br/>A paused Reader shows a toast instead" }
  end
  hg1@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Open the Manage drawer" }
  hg2@{ shape: subproc, label: "Continues in: EMR Connect › Connect a system › Choose the system and contact" }
  subgraph gTiles ["Four tiles (they are not buttons)"]
  t1@{ shape: rect, label: "<b>Last sync</b><br/>Time since the newest sync. Green, amber or red" }
  t2@{ shape: rect, label: "<b>Charts matched today</b><br/>23 'to open cases'" }
  t3@{ shape: rect, label: "<b>Files pulled</b><br/>142 'this week'" }
  t4@{ shape: rect, label: "<b>Need a mapping</b><br/>2 'fields the agents could not place'" }
  end
  tg@{ shape: subproc, label: "Continues in: EMR Connect › Page › What each tile shows" }
  subgraph gSys ["Connected systems"]
  c1@{ shape: curv-trap, label: "<b>Connected systems</b><br/>Read access for charts, insurance details and medications" }
  c2@{ shape: rect, label: "One row per system: name, what it holds, last sync, status pill, buttons" }
  c3@{ shape: trap-t, label: "Click 'Sync now' in the card header" }
  c4@{ shape: trap-t, label: "<b>Click 'Sync now', 'Fix', 'Reconnect' or 'Manage' on a row</b><br/>A row that is not Connected also says that New case cannot pull a chart from it" }
  c5@{ shape: odd, label: "<b>'Connect your record system to let charts arrive on their own.'</b><br/>Empty list. Not reachable in the demo: a system can be disconnected, never removed" }
  end
  cg0@{ shape: subproc, label: "Continues in: EMR Connect › Sync › When an agent is paused or asks first" }
  cg1@{ shape: subproc, label: "Continues in: EMR Connect › Sync › Sync now" }
  cg2@{ shape: subproc, label: "Continues in: EMR Connect › Connected systems › What each status means" }
  cg3@{ shape: subproc, label: "Continues in: EMR Connect › Problems › Every error state and what it needs" }
  subgraph gAct ["Recent activity"]
  a1@{ shape: curv-trap, label: "<b>Recent activity</b><br/>Every read and write is logged. Newest six lines" }
  a2@{ shape: trap-t, label: "<b>Click 'See all 8'</b><br/>Only shown when there are more than six lines" }
  end
  ag@{ shape: subproc, label: "Continues in: EMR Connect › Recent activity › Read the activity log" }
  subgraph gSide ["Right-hand panels"]
  r1@{ shape: curv-trap, label: "<b>What the agents can do here</b><br/>Read: assessments, notes, labs, medications, insurance card" }
  r2@{ shape: rect, label: "<b>Write back: only the approval number and dates, and only after a person approves</b><br/>A system's write-back switch in Manage decides whether the Dashboard offers it" }
  r3@{ shape: curv-trap, label: "<b>Needs a mapping</b><br/>'A chart pulled in New case leaves these fields blank until you map them.'<br/>Pill with the count, then one row per field with a 'Map' button" }
  r4@{ shape: trap-t, label: "Click 'Map' on a row" }
  end
  rg@{ shape: subproc, label: "Continues in: EMR Connect › Needs a mapping › Map a field" }
  s1 --> p1
  p1 --> hb1 & hb2
  hb1 --> hq
  hq -->|"Yes"| ho
  hq -->|"No"| hx
  ho --> hg1
  hb2 --> hg2
  p1 --> t1 & t2 & t3 & t4
  t1 --> tg
  t2 --> tg
  t3 --> tg
  t4 --> tg
  p1 --> c1
  c1 --> c2
  c2 --> c3 & c4
  c1 -.-> c5
  c3 --> cg1
  c3 -.-> cg0
  c4 -.-> cg0
  c4 --> cg2
  c4 -.-> cg3
  p1 --> a1
  a1 --> a2 --> ag
  p1 --> r1
  r1 --> r2
  p1 --> r3
  r3 --> r4 --> rg
  class s1 k_start
  class p1,c1,a1,r1,r3 k_screen
  class hb1,hb2,c3,c4,a2,r4 k_click
  class hq k_decision
  class ho k_overlay
  class hx k_endx
  class hg1,hg2,tg,cg0,cg1,cg2,cg3,ag,rg k_goto
  class t1,t2,t3,t4,c2,r2 k_process
  class c5 k_toast
  style gHead fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gTiles fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSys fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gAct fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSide fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Page › What each tile shows

The four tiles at the top follow the state below them. They are not buttons. This diagram shows what each one says and what moves it.

Route: `/emr`

Times follow the Demo clock. Demo, Fast-forward ages the 'ago' labels but never runs a sync.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  p1@{ shape: curv-trap, label: "<b>EMR Connect</b><br/>Four tinted tiles above Connected systems" }
  subgraph gSync ["Tile 1: Last sync"]
  q1@{ shape: diam, label: "Is any system not disconnected?" }
  a1@{ shape: rect, label: "<b>'None' in red</b><br/>Small line: 'no system connected' (empty list) or 'N systems are disconnected'" }
  a2@{ shape: rect, label: "<b>Value is the time since the newest sync</b><br/>'Just now', '6 min', '1 h 6 min'" }
  q2@{ shape: diam, label: "Is any system disconnected?" }
  a3@{ shape: rect, label: "<b>Green tile</b><br/>'all systems answering'" }
  a4@{ shape: rect, label: "<b>Amber tile</b><br/>'1 system is disconnected' or 'N systems are disconnected'" }
  end
  subgraph gCharts ["Tile 2: Charts matched today"]
  b1@{ shape: rect, label: "<b>23 'to open cases'</b><br/>Starts at 23 on reset" }
  b2@{ shape: cyl, label: "<b>Each finished sync adds its charts</b><br/>1 to 3, at least 1 per system" }
  end
  subgraph gFiles ["Tile 3: Files pulled"]
  c1@{ shape: rect, label: "<b>142 'this week'</b><br/>Starts at 142 on reset" }
  c2@{ shape: cyl, label: "<b>Each finished sync adds its files</b><br/>A new system adds 5, and a finished Fix adds 12 remittances" }
  end
  subgraph gMap ["Tile 4: Need a mapping"]
  d1@{ shape: diam, label: "Any field waiting for a mapping?" }
  d2@{ shape: rect, label: "<b>Number in amber</b><br/>'fields the agents could not place'" }
  d3@{ shape: rect, label: "<b>0 in green</b><br/>'every field is mapped'" }
  end
  n1@{ shape: rect, label: "<b>A system that Needs a quick look still counts as answering</b><br/>Only Disconnected systems change this tile" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Sync › Sync now" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Connect a system › Run the connection test and save" }
  g3@{ shape: subproc, label: "Continues in: EMR Connect › Needs a mapping › Map a field" }
  g4@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Disconnect and reconnect" }
  g5@{ shape: subproc, label: "Continues in: EMR Connect › Problems › Fix a system that needs a quick look" }
  p1 --> q1 & b1 & c1 & d1
  q1 -->|"No"| a1
  q1 -->|"Yes"| a2 --> q2
  q2 -->|"No"| a3
  q2 -->|"Yes"| a4
  a2 -.-> n1
  a1 --> g4
  a4 --> g4
  b1 --> b2 --> g1
  c1 --> c2
  c2 --> g1
  c2 --> g2
  c2 --> g5
  d1 -->|"Yes"| d2 --> g3
  d1 -->|"No"| d3
  class p1 k_screen
  class q1,q2,d1 k_decision
  class a1,a2,a3,a4,b1,c1,d2,d3,n1 k_process
  class b2,c2 k_store
  class g1,g2,g3,g4,g5 k_goto
  style gSync fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCharts fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gFiles fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gMap fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Connected systems › What each status means

Every system on the list is in one of three states. Each state shows different buttons and text, and a system moves between them by the clicks on the arrows.

Route: `/emr`

In the demo only the seeded Billing system starts in 'Needs a quick look'. Nothing in the demo moves a Connected system into it. A system that is not Connected also says that New case cannot pull a chart from it.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s0@{ shape: stadium, label: "<b>Open EMR Connect</b><br/>The two clinical record sites start Connected, the Billing system starts amber" }
  n1@{ shape: trap-t, label: "Click 'Connect a system', pass the test, click 'Connect {name}'" }
  n2@{ shape: st-rect, label: "<b>Production: the read-only sign-in expires or the EMR changes its screens</b><br/>Demo: only the seeded Billing system starts here" }
  subgraph gC ["Connected"]
  sc@{ shape: cyl, label: "<b>Connected</b><br/>Green pill" }
  c1@{ shape: rect, label: "<b>Row: '6 min ago' or 'Syncing'</b><br/>Buttons: Sync now (dimmed while any sync runs), Manage<br/>New case can pull a chart from it" }
  c2@{ shape: rect, label: "<b>Synced by 'Sync now' in the card header</b><br/>Counts in the Last sync tile" }
  end
  subgraph gA ["Needs a quick look"]
  sa@{ shape: cyl, label: "<b>Needs a quick look</b><br/>Amber pill" }
  a1@{ shape: rect, label: "<b>Row: the issue, 'First step: renew the sign-in with Fix.' and 'New case cannot pull a chart from it until it is connected.'</b><br/>Buttons: Fix, Manage" }
  a2@{ shape: rect, label: "<b>Skipped by 'Sync now'</b><br/>Still counts in the Last sync tile" }
  end
  subgraph gD ["Disconnected"]
  sd@{ shape: cyl, label: "<b>Disconnected</b><br/>Red pill" }
  d1@{ shape: rect, label: "<b>Row: 'Not syncing', 'Charts from this system are not arriving.' and 'New case cannot pull a chart from it until it is connected.'</b><br/>Buttons: Reconnect, Manage" }
  d2@{ shape: rect, label: "<b>Skipped by 'Sync now'</b><br/>Ignored by the Last sync tile<br/>The Manage drawer ends with 'Reconnect'<br/>If it was disconnected while it needed a look, the row adds 'Reconnect starts with a fix.'" }
  end
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Connect a system › Choose the system and contact" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Problems › Fix a system that needs a quick look" }
  g3@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Disconnect and reconnect" }
  s0 --> sc & sa
  n1 --> sc
  n1 -.-> g1
  n2 -.-> sa
  sc --> c1 --> c2
  sa --> a1 --> a2
  sd --> d1 --> d2
  sa -->|"Click 'Fix', then 'Finish and reconnect'"| sc
  sa -.-> g2
  sc -->|"Manage, then 'Disconnect', then 'Disconnect'"| sd
  sa -->|"Manage, then 'Disconnect', then 'Disconnect'"| sd
  sd -->|"Click 'Reconnect', fix first if it needed one, then the connection test passes"| sc
  sd -.-> g3
  class s0 k_start
  class n1 k_click
  class n2 k_ext
  class sc,sa,sd k_store
  class c1,c2,a1,a2,d1,d2 k_process
  class g1,g2,g3 k_goto
  style gC fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gD fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Recent activity › Read the activity log

Every read and write the agents make here is logged. The card shows the newest six lines; a drawer shows all of them. Most actions on this page add a line.

Route: `/emr`

Times follow the Demo clock. Demo, Reset demo data puts back the eight starting lines.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  p1@{ shape: curv-trap, label: "<b>Recent activity</b><br/>Every read and write is logged" }
  r1@{ shape: rect, label: "<b>Each line: the agent's round icon, the text, and how long ago</b><br/>Newest first. Six lines on the card" }
  q1@{ shape: diam, label: "More than six lines?" }
  b1@{ shape: trap-t, label: "Click 'See all 8'" }
  nb@{ shape: rect, label: "No button. The card shows every line" }
  o1@{ shape: win-pane, label: "<b>Activity log drawer</b><br/>Every read and write, newest first." }
  o2@{ shape: rect, label: "<b>All lines in one list</b><br/>Same icon, text and time as the card" }
  x1@{ shape: trap-t, label: "Click the X, press Escape, or click the dimmed area" }
  e1@{ shape: stadium, label: "<b>Drawer closes</b><br/>Back on the page" }
  subgraph gAdds ["What adds a line (newest goes on top)"]
  l1@{ shape: hex, label: "<b>Reader or Verify</b><br/>Sync now: one of four results in turn, for example 'Pulled 6 new files for 3 open cases and matched the insurance cards'" }
  l2@{ shape: hex, label: "<b>Reader</b><br/>Connect: 'Tested the read-only connection to {name} and found 5 files to pull'" }
  l3@{ shape: hex, label: "<b>Reader</b><br/>Map: 'Mapped 'Level of care' to IOP. It applies to every future pull'" }
  l4@{ shape: hex, label: "<b>Navigator</b><br/>Fix: 'Renewed the read-only sign-in for billing system and pulled 12 remittances'<br/>Reconnect: 'Renewed the read-only sign-in for {name}' (only when it needed a fix first), then 'Reconnected {name} and read-only access passed its test'<br/>Disconnect and write-back switch lines" }
  end
  st@{ shape: cyl, label: "<b>Activity log</b><br/>Seed: eight lines from Reader, Verify and Navigator" }
  nt@{ shape: odd, label: "<b>Dashboard 'Write to the EMR' adds no line here</b><br/>It adds an event to that request instead" }
  fz@{ shape: rect, label: "<b>Every line is written at every freedom level</b><br/>The agent's Freedom in Settings only decides whether a toast follows" }
  p1 --> r1 --> q1
  q1 -->|"Yes"| b1 --> o1 --> o2 --> x1 --> e1
  q1 -->|"No"| nb
  l1 & l2 & l3 & l4 --> st
  st --> r1
  p1 -.-> nt
  st -.-> fz
  class p1 k_screen
  class r1,nb,o2,fz k_process
  class q1 k_decision
  class b1,x1 k_click
  class o1 k_overlay
  class e1 k_end
  class l1,l2,l3,l4 k_agent
  class st k_store
  class nt k_toast
  style gAdds fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Connect a system › Choose the system and contact

The first two steps of the three-step 'Connect a system' pop-up: pick the kind of system and name it, then name the person at the practice who can approve read-only access.

Route: `/emr`

The demo asks for no password, key or scope. Access is always read-only. In production the clinic provides a service account that lives in a credential vault and is never typed into the screen.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: trap-t, label: "<b>Click 'Connect a system'</b><br/>Primary button, top right of the page" }
  qp@{ shape: diam, label: "Is Reader paused in Settings?" }
  tp@{ shape: odd, label: "<b>'Reader is paused'</b><br/>'Resume it in Settings to connect a system.'" }
  xp@{ shape: stadium, label: "Nothing opens" }
  o1@{ shape: win-pane, label: "<b>Connect a system</b><br/>Read-only. Nothing is written back until a person approves it.<br/>Steps: System, Contact, Test" }
  subgraph gS1 ["Step 1 of 3: System"]
  i1@{ shape: lean-r, label: "<b>Pick one System type</b><br/>Clinical record (default), Billing system, Practice management or Lab results" }
  p1@{ shape: rect, label: "<b>Each choice shows what it holds</b><br/>'Charts, notes and medications', 'Claims and remittances', 'Schedules and admissions', 'Lab orders and results'" }
  i2@{ shape: lean-r, label: "<b>Type a 'Name in Psyflo' (optional)</b><br/>'Shown on the Connected systems list.'" }
  p2@{ shape: rect, label: "Blank name becomes '{kind} · new site'" }
  c1@{ shape: trap-t, label: "Click 'Next'" }
  end
  subgraph gS2 ["Step 2 of 3: Contact"]
  i3@{ shape: lean-r, label: "<b>Type 'Contact at the practice' (required)</b><br/>Name and role, for example Dana Ruiz, practice manager" }
  p3@{ shape: rect, label: "'We email them a read-only access request. Until they approve it, the test below uses a demo record.'" }
  x1@{ shape: st-rect, label: "<b>Contact at the practice approves read-only access</b><br/>Demo: simulated, the test uses a demo record" }
  c2@{ shape: trap-t, label: "Click 'Run the connection test'" }
  q1@{ shape: diam, label: "Is the contact filled in?" }
  t1@{ shape: odd, label: "<b>'Add the person at the practice who can approve read-only access.'</b><br/>Clears when the person types" }
  c3@{ shape: trap-t, label: "Click 'Back'" }
  end
  cx@{ shape: trap-t, label: "<b>Click 'Cancel' or the X, press Escape, or click the dimmed area</b><br/>On any step" }
  e1@{ shape: stadium, label: "<b>Pop-up closes</b><br/>Nothing is saved. Typed answers are lost" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Connect a system › Run the connection test and save" }
  s1 --> qp
  qp -->|"Yes"| tp --> xp
  qp -->|"No"| o1 --> i1
  i1 --> p1 --> i2 --> p2 --> c1
  c1 --> i3
  i3 --> p3
  p3 -.-> x1
  i3 --> c2 --> q1
  q1 -->|"No"| t1 --> i3
  q1 -->|"Yes"| g1
  i3 -.-> c3
  c3 -->|"Choices are kept"| i1
  o1 -.-> cx
  cx --> e1
  class s1,c1,c2,c3,cx k_click
  class qp,q1 k_decision
  class tp,t1 k_toast
  class xp,e1 k_endx
  class o1 k_overlay
  class i1,i2,i3 k_input
  class p1,p2,p3 k_process
  class x1 k_ext
  class g1 k_goto
  style gS1 fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gS2 fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Connect a system › Run the connection test and save

Step 3 of 'Connect a system': three read-only checks run one after the other, then 'Connect {name}' saves the system. In the demo the test always passes. Reconnect runs the very same three checks.

Route: `/emr`

Production failures below come from the PRD (09 integrations) and are not simulated by the demo.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  o1@{ shape: win-pane, label: "<b>Connect a system, step 3 of 3: Test</b><br/>Read-only. Nothing is written back until a person approves it." }
  subgraph gTest ["Connection test"]
  k1@{ shape: rect, label: "<b>Reaching the system</b><br/>About 0.8 seconds a check: spinner, then a green tick" }
  k2@{ shape: rect, label: "Signing in with read-only access" }
  k3@{ shape: rect, label: "Reading one test record" }
  t1@{ shape: odd, label: "'The test passed. Access is read-only, and nothing is written back.'" }
  end
  x1@{ shape: st-rect, label: "<b>The system answers</b><br/>Demo: simulated with a demo record" }
  q1@{ shape: diam, label: "Can the test fail?" }
  f1@{ shape: stadium, label: "<b>Production only: sign-in rejected, a sign-in challenge, or the system unreachable</b><br/>The feed pauses and a person is asked to fix it" }
  b0@{ shape: trap-t, label: "'Connect {name}' is dimmed until the last check passes" }
  b1@{ shape: trap-t, label: "<b>Click 'Connect {name}'</b><br/>For example 'Connect Lab results · new site'" }
  subgraph gSave ["What is saved"]
  s1@{ shape: cyl, label: "<b>New system on the list</b><br/>Status Connected, last sync now, connected since today, the contact, write-back off" }
  s2@{ shape: cyl, label: "Files pulled tile goes up by 5" }
  a1@{ shape: hex, label: "Reader logs 'Tested the read-only connection to {name} and found 5 files to pull'" }
  t2@{ shape: odd, label: "<b>'{name} is connected'</b><br/>'Read-only. Nothing is written back.'" }
  end
  e1@{ shape: stadium, label: "<b>Pop-up closes</b><br/>The new row sits at the end of Connected systems" }
  cx@{ shape: trap-t, label: "Click 'Cancel', click the X, press Escape, or click the dimmed area" }
  e2@{ shape: stadium, label: "<b>Test stops, nothing is saved</b><br/>There is no 'Back' on this step" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Sync › Sync now" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Open the Manage drawer" }
  g3@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Reconnect a system" }
  o1 --> k1 --> k2 --> k3 --> t1
  k1 -.-> x1
  k3 -.-> g3
  t1 --> q1
  q1 -->|"Demo: never"| b0 --> b1
  q1 -->|"Production"| f1
  b1 --> s1 & s2 & a1 & t2
  s1 --> e1
  t2 --> e1
  e1 --> g1 & g2
  o1 -.-> cx --> e2
  class o1 k_overlay
  class k1,k2,k3 k_process
  class t1,t2 k_toast
  class x1 k_ext
  class q1 k_decision
  class f1,e2 k_endx
  class b0,b1,cx k_click
  class s1,s2 k_store
  class a1 k_agent
  class e1 k_end
  class g1,g2,g3 k_goto
  style gTest fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSave fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Sync › Sync now

A person starts a sync from the card header or from one row. The demo waits two seconds, then adds a result, updates the counters and the activity log, and says so in a toast unless Reader is set to 'Act on its own'.

Route: `/emr`

Demo: simulated. There is no EMR behind the button. Each sync takes the next of four fixed results. While a sync runs, every Sync now button is dimmed, so a second click cannot start.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "<b>Click 'Sync now'</b><br/>In the Connected systems header, or on a Connected row" }
  q0@{ shape: diam, label: "<b>Is any system Connected?</b><br/>(header button only)" }
  x0@{ shape: odd, label: "<b>'Nothing to sync'</b><br/>'No system is connected. Fix or reconnect one first.'<br/>Amber. No spinner" }
  gg@{ shape: subproc, label: "Continues in: EMR Connect › Sync › When an agent is paused or asks first" }
  q2@{ shape: diam, label: "Which button?" }
  p1@{ shape: rect, label: "<b>Header button spins</b><br/>Every Connected row shows 'Syncing'<br/>All Sync now buttons are dimmed" }
  p2@{ shape: rect, label: "<b>That row's button spins</b><br/>Its row shows 'Syncing'<br/>All Sync now buttons are dimmed" }
  e1@{ shape: st-rect, label: "<b>The EMR answers</b><br/>Demo: simulated, two seconds" }
  q4@{ shape: diam, label: "Did the person leave EMR Connect meanwhile?" }
  x3@{ shape: stadium, label: "<b>Sync is dropped</b><br/>Nothing is recorded" }
  q3@{ shape: diam, label: "<b>Is the system still Connected?</b><br/>(it could have been disconnected in Manage meanwhile)" }
  x2@{ shape: stadium, label: "<b>Spinner stops</b><br/>No toast, no log line, tiles unchanged" }
  n1@{ shape: rect, label: "<b>Take the next result from a list of four</b><br/>The next sync takes the one after, then round again" }
  subgraph gRes ["The four results, in order"]
  r1@{ shape: hex, label: "<b>Reader</b><br/>'Pulled 6 new files for 3 open cases and matched the insurance cards'" }
  r2@{ shape: hex, label: "<b>Reader</b><br/>'Read 2 new admissions and proposed cases in Case Manager'" }
  r3@{ shape: hex, label: "<b>Verify</b><br/>'Re-checked coverage for 4 members after the sync'" }
  r4@{ shape: hex, label: "<b>Reader</b><br/>'Pulled the latest progress notes for 9 active stays'" }
  end
  ap@{ shape: rect, label: "Apply the result" }
  subgraph gSaved ["What changes"]
  d1@{ shape: cyl, label: "<b>Each synced system: last sync is now</b><br/>Rows read 'just now'" }
  d2@{ shape: cyl, label: "<b>Charts matched today and Files pulled go up</b><br/>About half when only some of the Connected systems are synced" }
  d3@{ shape: cyl, label: "<b>Recent activity gets the result as its newest line</b><br/>For one system: '... from {system name}'" }
  end
  q5@{ shape: diam, label: "Is Reader set to 'Act on its own'?" }
  t1@{ shape: odd, label: "<b>'Sync finished'</b><br/>The result text. Green" }
  n2@{ shape: rect, label: "<b>No toast</b><br/>The tiles and the new log line show it" }
  z1@{ shape: stadium, label: "Last sync tile reads 'Just now'" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Sync › What a sync pulls and when it runs" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Recent activity › Read the activity log" }
  s1 --> q0
  q0 -->|"No"| x0
  q0 -->|"Yes, or a row button"| gg
  gg --> q2
  q2 -->|"Header"| p1
  q2 -->|"A row"| p2
  p1 --> e1
  p2 --> e1
  e1 --> q4
  q4 -->|"Yes"| x3
  q4 -->|"No"| q3
  q3 -->|"No"| x2
  q3 -->|"Yes"| n1
  n1 --> r1 & r2 & r3 & r4
  r1 & r2 & r3 & r4 --> ap
  ap --> d1 & d2 & d3
  d1 & d2 & d3 --> q5
  q5 -->|"No"| t1
  q5 -->|"Yes"| n2
  t1 --> z1
  n2 --> z1
  z1 --> g1
  d3 -.-> g2
  class s1 k_start
  class q0,q2,q4,q3,q5 k_decision
  class x0,t1 k_toast
  class gg,g1,g2 k_goto
  class p1,p2,n1,ap,n2 k_process
  class e1 k_ext
  class x3,x2 k_endx
  class r1,r2,r3,r4 k_agent
  class d1,d2,d3 k_store
  class z1 k_end
  style gRes fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSaved fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Sync › When an agent is paused or asks first

Four buttons on this page start work that an agent does: Sync now and Connect a system (Reader), Fix and Reconnect (Navigator). Settings decides how each one starts. A paused agent waits, 'Ask before acting' asks first, any other level goes ahead.

Route: `/emr`

The choice is read at the moment of the click. Disconnect, the write-back switch and Map are a person's own decisions and are never held back. After the step, 'Act on its own' only logs it in Recent activity.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "<b>Click 'Sync now', 'Connect a system', 'Fix' or 'Reconnect'</b><br/>Header, a row, or the Manage drawer" }
  q1@{ shape: diam, label: "Which agent does the step?" }
  a1@{ shape: rect, label: "<b>Reader</b><br/>Sync now (header or a row) and Connect a system" }
  a2@{ shape: rect, label: "<b>Navigator</b><br/>Fix, and Reconnect on a row or in the Manage drawer" }
  q2@{ shape: diam, label: "Is that agent paused in Settings?" }
  t1@{ shape: odd, label: "<b>'{Agent} is paused'</b><br/>'Resume it in Settings to sync.'<br/>Or: to connect a system, fix it, reconnect it<br/>Amber" }
  x1@{ shape: stadium, label: "<b>Nothing starts</b><br/>The page stays as it was" }
  q3@{ shape: diam, label: "What is the agent's Freedom level?" }
  o1@{ shape: win-pane, label: "<b>Asks first</b><br/>'Sync every connected system?', 'Sync {system}?', 'Fix {system}?' or 'Reconnect {system}?'<br/>'{Agent} is set to Ask before acting'" }
  o2@{ shape: rect, label: "<b>The pop-up links to Settings</b><br/>'Change this for {Agent} in Settings'" }
  c1@{ shape: trap-t, label: "Click 'Not now', the X, or press Escape" }
  x2@{ shape: stadium, label: "<b>Pop-up closes</b><br/>Nothing starts" }
  c2@{ shape: trap-t, label: "<b>Click the step's button</b><br/>'Sync now', 'Start the fix' or 'Start'" }
  p1@{ shape: rect, label: "<b>The step goes ahead at once</b><br/>Connect never asks: its own three-step pop-up is the confirmation" }
  subgraph gAfter ["After the step finishes"]
  r1@{ shape: hex, label: "<b>The agent logs one line in Recent activity</b><br/>Every level does this" }
  q4@{ shape: diam, label: "Is the agent set to 'Act on its own'?" }
  n1@{ shape: rect, label: "<b>No toast</b><br/>The tiles and the log show what happened" }
  t2@{ shape: odd, label: "<b>A toast says what happened</b><br/>'Sync finished', '{name} is connected' or 'Sign-in renewed'" }
  end
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Sync › Sync now" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Problems › Fix a system that needs a quick look" }
  g3@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Reconnect a system" }
  g4@{ shape: subproc, label: "Continues in: EMR Connect › Connect a system › Choose the system and contact" }
  g5@{ shape: subproc, label: "Continues in: Settings › Agents › Change an agent's freedom" }
  g6@{ shape: subproc, label: "Continues in: Settings › Pause › Pause one agent, resume all" }
  s1 --> q1
  q1 -->|"Reader"| a1
  q1 -->|"Navigator"| a2
  a1 --> q2
  a2 --> q2
  q2 -->|"Yes"| t1 --> x1
  q2 -->|"No"| q3
  q3 -->|"Ask before acting"| o1 --> o2
  o2 --> c1 --> x2
  o2 --> c2 --> p1
  q3 -->|"Act, then report"| p1
  q3 -->|"Act on its own"| p1
  p1 --> r1 --> q4
  q4 -->|"Yes"| n1
  q4 -->|"No"| t2
  p1 -.-> g1 & g2 & g3 & g4
  t1 -.-> g6
  o2 -.-> g5
  class s1 k_start
  class q1,q2,q3,q4 k_decision
  class a1,a2,o2,p1,n1 k_process
  class t1,t2 k_toast
  class x1,x2 k_endx
  class o1 k_overlay
  class c1,c2 k_click
  class r1 k_agent
  class g1,g2,g3,g4,g5,g6 k_goto
  style gAfter fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Sync › What a sync pulls and when it runs

What the agents bring in from a connected system, and when. The demo shows this with counters and one log line per sync. The schedule and the real pull come from the PRD.

Route: `/emr`

In the demo only 'Sync now' runs a sync. Demo, Fast-forward changes the 'ago' times and never starts one. No new chart, case or file appears anywhere else in the app. A sync waits while Reader is paused, and asks first when Reader is set to 'Ask before acting'.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "A sync runs" }
  subgraph gWhen ["When it runs"]
  w1@{ shape: trap-t, label: "<b>Person clicks 'Sync now'</b><br/>The only trigger in the demo" }
  w2@{ shape: delay, label: "<b>Production: on a schedule, nobody clicks</b><br/>Attendance twice a day, roster nightly, payments weekly, eligibility on a rolling 7 days, portal status daily" }
  w3@{ shape: odd, label: "<b>Production: a missed run raises a stale banner</b><br/>Attendance after 36 hours, roster after 48 hours" }
  end
  x1@{ shape: st-rect, label: "<b>The record system</b><br/>Residential site, outpatient site, Billing system or a newly connected one" }
  subgraph gPull ["What the agents read"]
  d1@{ shape: doc, label: "<b>Clinical record systems</b><br/>Assessments, progress notes, labs, medications, insurance card" }
  d2@{ shape: doc, label: "<b>Billing system</b><br/>Claims, remittances, payment dates" }
  d3@{ shape: rect, label: "<b>New admissions</b><br/>A patient who has just arrived at a site" }
  end
  a1@{ shape: hex, label: "<b>Reader</b><br/>Reads each file, swaps names, dates and IDs for codes, matches the chart to an open case" }
  a2@{ shape: hex, label: "<b>Verify</b><br/>Re-checks coverage for members whose plans changed" }
  p1@{ shape: rect, label: "Fields it cannot place go to 'Needs a mapping'" }
  s2@{ shape: cyl, label: "<b>Charts matched today</b><br/>Goes up by the number of charts matched to open cases" }
  s3@{ shape: cyl, label: "<b>Files pulled this week</b><br/>Goes up by the number of files saved to those cases" }
  s4@{ shape: cyl, label: "<b>Recent activity</b><br/>One line per sync" }
  p2@{ shape: rect, label: "<b>Demo: nothing else changes</b><br/>No new case in Case Manager. New case offers the same four charts, from Connected systems only" }
  e1@{ shape: rect, label: "Last sync tile reads 'Just now'" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Sync › Sync now" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Needs a mapping › Map a field" }
  g3@{ shape: subproc, label: "Continues in: EMR Connect › Sync › What other screens use from EMR Connect" }
  s1 --> w1 & w2
  w2 -.-> w3
  w1 --> g1
  w1 --> x1
  w2 --> x1
  x1 --> d1 & d2 & d3
  d1 & d2 & d3 --> a1
  a1 --> a2
  a1 --> p1
  p1 --> g2
  a1 --> s2 & s3
  a2 --> s4
  s2 & s3 & s4 --> e1
  e1 --> p2
  p2 --> g3
  class s1 k_start
  class w1 k_click
  class w2 k_wait
  class w3 k_toast
  class x1 k_ext
  class d1,d2 k_doc
  class d3,p1,p2,e1 k_process
  class a1,a2 k_agent
  class s2,s3,s4 k_store
  class g1,g2,g3 k_goto
  style gWhen fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gPull fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Sync › What other screens use from EMR Connect

Two other screens lean on EMR Connect. New case can pull a chart only from a Connected system, and leaves a field blank while its mapping waits. The Dashboard offers the approval write-back box only while a Connected system has its write-back switch on.

Route: `/emr`

Found by reading the code and testing the built demo. Disconnect every system and the pull in New case says no records system is connected. Switch write-back off everywhere and the Dashboard shows 'Write-back is off for your records system.'

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  p1@{ shape: curv-trap, label: "<b>EMR Connect</b><br/>Systems, sync, mappings and the write-back switch" }
  subgraph gPull ["New case: pull a chart"]
  a1@{ shape: trap-t, label: "<b>Click 'Pull a chart from EMR Connect'</b><br/>Medical records step" }
  a0@{ shape: diam, label: "Is any system Connected?" }
  a8@{ shape: odd, label: "<b>'No records system is connected. Connect one in EMR Connect to pull a chart, or drop the files above.'</b><br/>With a link to EMR Connect" }
  a2@{ shape: win-pane, label: "<b>Chart from EMR Connect</b><br/>Dropdown with the charts that live in a Connected system<br/>A hint under each names the system" }
  a2b@{ shape: rect, label: "<b>Residential site: J.M., 34 · Summit · Residential 3.5 and L.G., 29 · Cardinal · Residential 3.5</b><br/>Outpatient site: A.R., 45 · Beacon · IOP and S.T., 38 · Harborview · PHP<br/>A system that is Disconnected or Needs a quick look offers none" }
  a3@{ shape: lean-r, label: "Pick a chart" }
  a9@{ shape: diam, label: "<b>Does that system still have a field waiting for a mapping?</b><br/>'Level of care' or 'Referral source'" }
  a10@{ shape: rect, label: "<b>Line under the picker</b><br/>'Level of care still needs a mapping there, so that field is left blank.' with 'Open EMR Connect'" }
  a4@{ shape: trap-t, label: "<b>Click 'Pull'</b><br/>Or 'Cancel'" }
  a5@{ shape: rect, label: "Button reads 'Pulling' for one second" }
  a6@{ shape: cyl, label: "<b>Case draft is filled in</b><br/>Patient, payer, member ID, level of care, request type, diagnoses, reason<br/>A field that waits for a mapping stays blank" }
  a7@{ shape: odd, label: "<b>'Pulled J.M., 34 from EMR Connect'</b><br/>'Everything below was filled in from the chart. You can still change it.'<br/>Or, amber: 'Level of care needs a mapping, so that field was left blank. You can still fill it in.'" }
  end
  n1@{ shape: rect, label: "<b>Sync now does not add charts to the picker</b><br/>The four charts are fixed. Connect, Disconnect, Fix and Reconnect decide which systems offer them, and Map decides which fields a pull leaves blank" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › New case › Medical records › Patient and insurance rows" }
  subgraph gWrite ["Dashboard: write back"]
  b1@{ shape: curv-trap, label: "Dashboard request: 'Approved. Write-back waits for you'" }
  b0@{ shape: diam, label: "Does at least one Connected system have its write-back switch on?" }
  b8@{ shape: odd, label: "<b>'Write-back is off for your records system.' with 'Turn it on in EMR Connect.'</b><br/>Instead of the box. The link opens this page" }
  b2@{ shape: trap-t, label: "Click 'Approve write-back'" }
  b3@{ shape: win-pane, label: "<b>Approve the write-back</b><br/>'EMR Connect will write only these three things to the chart. No notes, diagnoses or identifiers are written.'" }
  b4@{ shape: rect, label: "Approval number, approved amount and dates are listed" }
  b5@{ shape: trap-t, label: "<b>Click 'Write to the EMR'</b><br/>Or 'Cancel'" }
  b6@{ shape: st-rect, label: "<b>The record system receives the three values</b><br/>Demo: simulated, about one second" }
  b7@{ shape: cyl, label: "<b>Request gets 'You confirmed the write-back' and a Cadence event</b><br/>Toast: 'Written to the EMR'" }
  end
  n2@{ shape: rect, label: "<b>The switch on a Disconnected or Needs a quick look system does not count</b><br/>Reconnect it, and the box comes back if its switch is on" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Approve the write-back" }
  p1 -.-> a1
  a1 --> a0
  a0 -->|"No"| a8
  a0 -->|"Yes"| a2 --> a2b --> a3 --> a9
  a9 -->|"Yes"| a10 --> a4
  a9 -->|"No"| a4
  a4 --> a5 --> a6 --> a7 --> g1
  a2 -.-> n1
  p1 -.-> b1
  b1 --> b0
  b0 -->|"No"| b8
  b0 -->|"Yes"| b2 --> b3 --> b4 --> b5 --> b6 --> b7 --> g2
  b8 -.-> n2
  class p1,b1 k_screen
  class a1,a4,b2,b5 k_click
  class a0,a9,b0 k_decision
  class a8,a7,b8 k_toast
  class a2,b3 k_overlay
  class a2b,a10,a5,n1,b4,n2 k_process
  class a3 k_input
  class a6,b7 k_store
  class g1,g2 k_goto
  class b6 k_ext
  style gPull fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gWrite fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Needs a mapping › Map a field

When the agents meet a field they cannot place, it waits in 'Needs a mapping'. A person picks which Psyflo value it fills. The picker always has a value, so saving cannot fail.

Route: `/emr`

Starting fields: 'Level of care' (outpatient record) and 'Referral source' (intake). Until one is mapped, a chart pulled in New case from that system leaves the matching field blank. Mapping is a person's own choice, so a paused Reader does not stop it.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "<b>Open EMR Connect</b><br/>The 'Need a mapping' tile shows 2" }
  c1@{ shape: curv-trap, label: "<b>Needs a mapping</b><br/>A pill with the count, then a row per field" }
  r1@{ shape: rect, label: "<b>Row 1: 'Level of care' in the outpatient record</b><br/>'Match to IOP or PHP'" }
  r2@{ shape: rect, label: "<b>Row 2: 'Referral source' in intake</b><br/>'Match to a payer field'" }
  em@{ shape: odd, label: "<b>'Every field is mapped. New ones appear here when the agents meet a field they cannot place.'</b><br/>Shown at 0 fields. Pill and tile turn green" }
  b1@{ shape: trap-t, label: "Click 'Map' on a row" }
  b2@{ shape: trap-t, label: "Click 'Map' on a 'Not mapped' row in the Manage drawer" }
  g0@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Open the Manage drawer" }
  o1@{ shape: win-pane, label: "<b>Map 'Level of care'</b><br/>In the outpatient record" }
  q1@{ shape: rect, label: "<b>Question from the agents</b><br/>'The outpatient record writes Level of care as free text, such as Day program. Which level should the agents read it as?'" }
  i1@{ shape: lean-r, label: "<b>Pick a value in the dropdown (click, or arrow keys and Enter)</b><br/>Level of care: IOP (first) or PHP<br/>Referral source: Payer name (first), Plan type or Referring provider" }
  n1@{ shape: rect, label: "'Until it is mapped, New case leaves the matching field blank when it pulls a chart from this system. Once it is mapped, every future pull fills it. Files already pulled are not rewritten.'" }
  d1@{ shape: diam, label: "Which button?" }
  k1@{ shape: trap-t, label: "Click 'Save the mapping'" }
  k2@{ shape: trap-t, label: "Click 'Cancel' or the X, press Escape, or click the dimmed area" }
  x1@{ shape: stadium, label: "<b>Pop-up closes</b><br/>The field stays in 'Needs a mapping'" }
  q9@{ shape: rect, label: "<b>Opened from the Manage drawer: the first Escape closes only this pop-up</b><br/>The drawer stays open. A second Escape closes it" }
  subgraph gSave ["What saving does"]
  s2@{ shape: cyl, label: "The field leaves 'Needs a mapping'" }
  s3@{ shape: cyl, label: "<b>A mapping row is added to the system</b><br/>'Level of care' fills 'IOP', mapped by 'You, 10/20'" }
  a1@{ shape: hex, label: "Reader logs 'Mapped 'Level of care' to IOP. It applies to every future pull'" }
  t1@{ shape: odd, label: "<b>'Field mapped'</b><br/>'Level of care' now fills IOP." }
  p1@{ shape: rect, label: "<b>Tile and pill count down: 2, 1, then 0</b><br/>At 0 they turn green: 'every field is mapped'" }
  p2@{ shape: rect, label: "<b>New case now fills that field when it pulls a chart from this system</b><br/>Before, it left it blank" }
  end
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Sync › What other screens use from EMR Connect" }
  e1@{ shape: stadium, label: "<b>Pop-up closes</b><br/>A mapped field cannot be unmapped or edited in the demo" }
  x2@{ shape: st-rect, label: "<b>Production: an unknown column holds a file back and shows what differs</b><br/>A confirmed mapping is remembered" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Field mappings › Every mapping by system" }
  s1 --> c1
  c1 --> r1 & r2
  c1 -.-> em
  r1 --> b1
  r2 --> b1
  b1 --> o1
  b2 --> o1
  b2 -.-> g0
  o1 --> q1 --> i1 --> n1 --> d1
  d1 -->|"Save"| k1
  d1 -->|"Leave"| k2
  k2 --> x1
  k2 -.-> q9
  k1 --> s2 & s3 & a1 & t1
  s2 --> p1
  s2 --> p2
  s3 --> p1
  p1 --> e1
  p2 -.-> g2
  e1 --> g1
  c1 -.-> x2
  class s1 k_start
  class c1 k_screen
  class r1,r2,q1,n1,q9,p1,p2 k_process
  class em,t1 k_toast
  class b1,b2,k1,k2 k_click
  class g0,g2,g1 k_goto
  class o1 k_overlay
  class i1 k_input
  class d1 k_decision
  class x1 k_endx
  class s2,s3 k_store
  class a1 k_agent
  class e1 k_end
  class x2 k_ext
  style gSave fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Field mappings › Every mapping by system

The Field mappings table in the Manage drawer, system by system: what each of their fields fills in Psyflo, who mapped it, and which fields still wait. A newly connected system starts with none.

Route: `/emr`

Seed data. 'Mapped by' reads 'Reader, 03/14' for the agents and 'You, {date}' for a person. Dates come from the Demo clock. A chart pulled in New case leaves a waiting field blank (Level of care, Referral source) and fills a mapped one.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "<b>Click 'Manage' on a system</b><br/>Then read the Field mappings card" }
  t0@{ shape: curv-trap, label: "<b>Field mappings</b><br/>'{n} mapped, {m} waiting. A chart pulled in New case leaves the waiting fields blank.'<br/>With none waiting: '{n} mapped'<br/>Columns: Their field, Fills, Mapped by" }
  subgraph gRes ["Residential site: 5 mapped"]
  r1@{ shape: cyl, label: "<b>Admit date fills 'Admission date'</b><br/>Reader, 03/14" }
  r2@{ shape: cyl, label: "<b>Primary payer fills 'Payer'</b><br/>Reader, 03/14" }
  r3@{ shape: cyl, label: "<b>Member ID fills 'Member ID (masked)'</b><br/>Reader, 03/14" }
  r4@{ shape: cyl, label: "<b>Progress note fills 'Chart documents'</b><br/>Reader, 03/15" }
  r5@{ shape: cyl, label: "<b>MAR fills 'Medication record'</b><br/>Reader, 03/15" }
  end
  subgraph gOut ["Outpatient site: 3 mapped, 2 waiting"]
  o1@{ shape: cyl, label: "<b>Admit date fills 'Admission date'</b><br/>Reader, 03/14" }
  o2@{ shape: cyl, label: "<b>Primary payer fills 'Payer'</b><br/>Reader, 03/14" }
  o3@{ shape: cyl, label: "<b>Group note fills 'Chart documents'</b><br/>Reader, 03/16" }
  w1@{ shape: lean-r, label: "<b>'Level of care': Not mapped, button 'Map'</b><br/>Choices: IOP or PHP" }
  w2@{ shape: lean-r, label: "<b>'Referral source': Not mapped, button 'Map'</b><br/>Choices: Payer name, Plan type or Referring provider" }
  end
  subgraph gBill ["Billing system: 2 mapped"]
  b1@{ shape: cyl, label: "<b>Claim number fills 'Claim reference'</b><br/>Reader, 04/02" }
  b2@{ shape: cyl, label: "<b>Remittance date fills 'Payment date'</b><br/>Reader, 04/02" }
  end
  subgraph gNew ["A system just connected"]
  n1@{ shape: cyl, label: "<b>0 mapped, none waiting</b><br/>The table has a header and no rows" }
  end
  c1@{ shape: rect, label: "<b>A row mapped by a person goes at the end of that system's list</b><br/>'Mapped by' reads 'You, 10/20'" }
  d1@{ shape: doc, label: "<b>Production: a versioned field map per record system, stored as data</b><br/>Every canonical field shows its source. Changes carry a date and an author" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Needs a mapping › Map a field" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Sync › What other screens use from EMR Connect" }
  s1 --> t0
  t0 --> r1 & o1 & b1 & n1
  r1 --> r2 --> r3 --> r4 --> r5
  o1 --> o2 --> o3 --> w1 --> w2
  b1 --> b2
  w1 --> c1
  w2 --> c1
  c1 --> g1
  w1 -.-> g2
  t0 -.-> d1
  class s1 k_start
  class t0 k_screen
  class r1,r2,r3,r4,r5,o1,o2,o3,b1,b2,n1 k_store
  class w1,w2 k_input
  class c1 k_process
  class d1 k_doc
  class g1,g2 k_goto
  style gRes fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gOut fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gBill fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gNew fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Problems › Fix a system that needs a quick look

The three-step 'Fix' pop-up for a system whose read-only sign-in has expired: say what happened, renew the sign-in, test it. Nothing is written to the system.

Route: `/emr`

In the demo the Billing system is the only system that Needs a quick look. The test always passes. Navigator does the fix, so a paused Navigator waits and 'Ask before acting' asks first.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: curv-trap, label: "<b>Connected systems</b><br/>Billing system · 'Needs a quick look' (amber)<br/>'The read-only sign-in expired 2 hours ago, so remittances are not arriving. First step: renew the sign-in with Fix.'" }
  c1@{ shape: trap-t, label: "Click 'Fix'" }
  gg@{ shape: subproc, label: "Continues in: EMR Connect › Sync › When an agent is paused or asks first" }
  o1@{ shape: win-pane, label: "<b>Fix billing system</b><br/>Three short steps. Nothing is written to the system.<br/>Steps: What happened, Renew access, Test" }
  subgraph gS1 ["Step 1 of 3: What happened"]
  a1@{ shape: rect, label: "The issue text in an amber box" }
  a2@{ shape: rect, label: "'This is usually an expired sign-in. The first step is to renew the read-only access. The agents then pull the missed remittances.'" }
  a3@{ shape: trap-t, label: "Click 'Next'" }
  end
  subgraph gS2 ["Step 2 of 3: Renew access"]
  b1@{ shape: lean-r, label: "<b>'Who approves the new sign-in' (required)</b><br/>Filled in with the system's contact, for example 'Billing lead'" }
  b2@{ shape: lean-r, label: "Tick 'I confirm the agents may read claims and remittances. They cannot change them.'" }
  b3@{ shape: trap-t, label: "Click 'Renew and test'" }
  q1@{ shape: diam, label: "Name filled in and box ticked?" }
  t1@{ shape: odd, label: "<b>'Name the person who approves and confirm read-only access.'</b><br/>Clears when either is changed" }
  x1@{ shape: st-rect, label: "<b>The approver renews the read-only sign-in</b><br/>Demo: simulated" }
  end
  subgraph gS3 ["Step 3 of 3: Test"]
  k1@{ shape: rect, label: "Signing in with the new read-only access" }
  k2@{ shape: rect, label: "Reading the latest remittance" }
  k3@{ shape: rect, label: "Matching it to a claim" }
  t2@{ shape: odd, label: "'The test passed. Access is read-only, and nothing is written back.'" }
  f1@{ shape: trap-t, label: "<b>Click 'Finish and reconnect'</b><br/>Dimmed until the last check passes" }
  end
  subgraph gSave ["What finishing does"]
  v1@{ shape: cyl, label: "<b>Billing system becomes Connected</b><br/>Last sync now, the issue text is cleared" }
  v4@{ shape: cyl, label: "Files pulled goes up by 12, the remittances the log line names" }
  v2@{ shape: hex, label: "Navigator logs 'Renewed the read-only sign-in for billing system and pulled 12 remittances'" }
  v3@{ shape: odd, label: "<b>'Billing system is connected'</b><br/>'Remittances are arriving again.'<br/>No toast when Navigator is set to 'Act on its own'" }
  end
  cx@{ shape: trap-t, label: "<b>Click 'Cancel' or the X, press Escape, or click the dimmed area</b><br/>There is no 'Back' in this pop-up" }
  e2@{ shape: stadium, label: "<b>Pop-up closes</b><br/>The system still Needs a quick look" }
  e1@{ shape: stadium, label: "Row shows 'just now', 'Connected' and a 'Sync now' button" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Disconnect and reconnect" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Reconnect a system" }
  s1 --> c1 --> gg --> o1 --> a1 --> a2 --> a3
  a3 --> b1 --> b2 --> b3 --> q1
  q1 -->|"No"| t1
  t1 --> b1
  q1 -->|"Yes"| k1
  b3 -.-> x1
  k1 --> k2 --> k3 --> t2 --> f1
  f1 --> v1 & v2 & v3 & v4
  v1 --> e1
  v3 --> e1
  o1 -.-> cx
  cx --> e2
  s1 -.->|"Another way out"| g1
  s1 -.->|"If it is disconnected later"| g2
  class s1 k_screen
  class c1,a3,b3,f1,cx k_click
  class gg,g1,g2 k_goto
  class o1 k_overlay
  class a1,a2,k1,k2,k3 k_process
  class b1,b2 k_input
  class q1 k_decision
  class t1,t2,v3 k_toast
  class x1 k_ext
  class v1,v4 k_store
  class v2 k_agent
  class e2 k_endx
  class e1 k_end
  style gS1 fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gS2 fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gS3 fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSave fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Problems › Every error state and what it needs

A way to read the page when something looks wrong. Start from what the page shows, find what the person has to do, and see how the page recovers. The demo has two real problem states, and every click that cannot go ahead says why.

Route: `/emr`

Production-only problems (from the PRD) are shown in orange. The demo cannot reach them.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "Something on EMR Connect looks wrong" }
  q1@{ shape: diam, label: "What does the page show?" }
  subgraph gA ["Amber pill: 'Needs a quick look'"]
  a1@{ shape: rect, label: "<b>The read-only sign-in expired</b><br/>The row names the problem and says renew it with Fix" }
  a2@{ shape: trap-t, label: "<b>Click 'Fix'</b><br/>Needs: a person who approves, and a tick for read-only access" }
  a3@{ shape: subproc, label: "Continues in: EMR Connect › Problems › Fix a system that needs a quick look" }
  a4@{ shape: stadium, label: "Re-test: three checks. Row turns Connected" }
  end
  subgraph gR ["Red pill: 'Disconnected'"]
  r1@{ shape: rect, label: "<b>Someone disconnected it</b><br/>Row: 'Not syncing'. Charts from this system are not arriving. New case cannot pull a chart from it until it is connected." }
  r2@{ shape: trap-t, label: "<b>Click 'Reconnect' on the row or in the Manage drawer</b><br/>Needs: a passed connection test, and the Fix steps first if it was on 'Needs a quick look'" }
  r4@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Reconnect a system" }
  r3@{ shape: stadium, label: "<b>Re-test: the same three checks as Connect</b><br/>Row turns Connected only after they pass. Any earlier issue text is cleared" }
  end
  subgraph gT ["Last sync tile"]
  t1@{ shape: rect, label: "<b>Red 'None': every system is Disconnected</b><br/>Amber: 'N systems are disconnected'" }
  t2@{ shape: rect, label: "Needs: every Disconnected row reconnected" }
  end
  subgraph gM ["Amber tile: 'Need a mapping'"]
  m1@{ shape: rect, label: "'fields the agents could not place'" }
  m2@{ shape: trap-t, label: "<b>Click 'Map'</b><br/>Needs: a value picked for each field" }
  end
  subgraph gQ ["Clicks that stop with a message"]
  d1@{ shape: odd, label: "<b>'Sync now' with no Connected system</b><br/>'Nothing to sync'<br/>'No system is connected. Fix or reconnect one first.'" }
  d5@{ shape: odd, label: "<b>An agent is paused in Settings</b><br/>'Reader is paused' or 'Navigator is paused'<br/>'Resume it in Settings to sync.' (or to connect a system, fix it, reconnect it)" }
  d3@{ shape: stadium, label: "<b>Contact left blank while connecting</b><br/>'Add the person at the practice who can approve read-only access.'" }
  d4@{ shape: stadium, label: "<b>Fix form incomplete</b><br/>'Name the person who approves and confirm read-only access.'" }
  end
  subgraph gP ["Production only, from the PRD"]
  p1@{ shape: st-rect, label: "<b>The record system changes its screens</b><br/>The feed pauses and falls back to file upload" }
  p2@{ shape: st-rect, label: "<b>A sign-in challenge or lockout</b><br/>The run pauses and a task goes to the credential owner" }
  p3@{ shape: odd, label: "<b>A feed goes stale</b><br/>A banner and a task after the stale limit, 36 hours for attendance" }
  end
  s1 --> q1
  q1 -->|"Amber pill on a row"| a1 --> a2 --> a3
  a3 --> a4
  q1 -->|"Red pill on a row"| r1 --> r2 --> r4 --> r3
  q1 -->|"Last sync tile is red or amber"| t1 --> t2
  t2 --> r2
  q1 -->|"Need a mapping tile is amber"| m1 --> m2
  q1 -->|"A toast after a click"| d1
  q1 -->|"A toast after a click"| d5
  q1 -.->|"A message under a field"| d3
  q1 -.->|"A message under a field"| d4
  q1 -.->|"Not in the demo"| p1
  p1 --> p2 --> p3
  class s1 k_start
  class q1 k_decision
  class a1,r1,t1,t2,m1 k_process
  class a2,r2,m2 k_click
  class a3,r4 k_goto
  class a4,r3 k_end
  class d1,d5,p3 k_toast
  class d3,d4 k_endx
  class p1,p2 k_ext
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gR fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gT fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gM fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gQ fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gP fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Manage › Open the Manage drawer

One system's details in a right-hand drawer: connection facts, what the agents may read, the write-back switch, the field mappings and a Disconnect or Reconnect button. A system that is not Connected says here that New case cannot pull a chart from it.

Route: `/emr`

Drawer buttons that the demo does not have: pause, edit, rename, delete, rotate sign-in. The only way to stop a system is Disconnect, and a system is never removed. Escape closes one layer at a time, so a pop-up on top of the drawer closes first.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "<b>Click 'Manage' on a row</b><br/>Or click 'Manage mapping' in the page header" }
  p0@{ shape: rect, label: "<b>Header button opens the outpatient site</b><br/>Or the first system if there is no outpatient site" }
  o1@{ shape: win-pane, label: "<b>Drawer: {system name}</b><br/>'{kind} · {what it holds}'<br/>Status pill on the right, X at the top" }
  subgraph gDet ["Card: Connection details"]
  d1@{ shape: rect, label: "<b>Type, Connected since, Contact at the practice</b><br/>Last sync: 'N min ago' or 'Not syncing'<br/>Access: 'Secure, read-only connection'" }
  d2@{ shape: odd, label: "<b>Only when it is not Connected</b><br/>The issue text, for example the expired sign-in, then 'New case cannot pull a chart from it until it is connected.'" }
  end
  subgraph gPerm ["Card: Permissions"]
  r1@{ shape: rect, label: "<b>Read chips depend on the kind</b><br/>Clinical record: Assessments, Progress notes, Labs, Medications, Insurance card<br/>Billing system: Claims, Remittances, Payment dates<br/>Practice management: Schedules, Admissions, Insurance card<br/>Lab results: Lab orders, Lab results" }
  w1@{ shape: trap-t, label: "<b>Click the switch</b><br/>'The Dashboard offers the approval write-back box for this system'<br/>Under it: only the approval number and dates, only after a person approves, and it shows while at least one connected system has this on" }
  wq@{ shape: diam, label: "Switch is now?" }
  w2@{ shape: cyl, label: "Write-back on for this system" }
  w3@{ shape: cyl, label: "Write-back off for this system" }
  w4@{ shape: hex, label: "<b>Navigator logs 'Write-back is on for {name}, approval number and dates only, after a person approves'</b><br/>Or 'Write-back is off for {name}'" }
  w5@{ shape: odd, label: "<b>On: 'Write-back is on'</b><br/>'The Dashboard offers the approval write-back box. Only the approval number and dates, and only after a person approves.'<br/>On but not Connected: 'The Dashboard offers the box once this system is connected.'" }
  w6@{ shape: odd, label: "<b>Off: 'Write-back is off'</b><br/>'The Dashboard still offers the box, because another connected system has write-back on.'<br/>Or 'The Dashboard no longer offers the approval write-back box.'" }
  end
  n1@{ shape: rect, label: "<b>The Dashboard reads the switches</b><br/>It offers the approval write-back box only while at least one Connected system has the switch on<br/>A switch on a Disconnected or Needs a quick look system does not count" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Approve the write-back" }
  subgraph gMap ["Card: Field mappings"]
  m1@{ shape: rect, label: "<b>'{n} mapped, {m} waiting. New case reads them when it pulls a chart.'</b><br/>Table: Their field, Fills, Mapped by" }
  m2@{ shape: trap-t, label: "Click 'Map' on a 'Not mapped' row" }
  end
  bq@{ shape: diam, label: "Is the system Disconnected?" }
  b1@{ shape: trap-t, label: "<b>Click 'Disconnect'</b><br/>Red outline button" }
  b2@{ shape: trap-t, label: "<b>Click 'Reconnect'</b><br/>Green button" }
  cx@{ shape: trap-t, label: "<b>Click the X, press Escape, or click the dimmed area</b><br/>A pop-up on top closes first" }
  e1@{ shape: stadium, label: "<b>Drawer closes</b><br/>Back on the page" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Needs a mapping › Map a field" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Disconnect and reconnect" }
  g4@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Reconnect a system" }
  s1 --> o1
  s1 -.-> p0
  p0 --> o1
  o1 --> d1 & r1 & m1
  d1 -.-> d2
  r1 --> w1 --> wq
  wq -->|"On"| w2
  wq -->|"Off"| w3
  w2 --> w4
  w3 --> w4
  w4 --> w5 & w6
  w5 -.-> n1
  w6 -.-> n1
  n1 --> g3
  m1 --> m2 --> g1
  m1 --> bq
  bq -->|"No"| b1 --> g2
  bq -->|"Yes"| b2 --> g4
  o1 -.-> cx --> e1
  class s1 k_start
  class p0,d1,r1,n1,m1 k_process
  class o1 k_overlay
  class d2,w5,w6 k_toast
  class w1,m2,b1,b2,cx k_click
  class wq,bq k_decision
  class w2,w3 k_store
  class w4 k_agent
  class g3,g1,g2,g4 k_goto
  class e1 k_end
  style gDet fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gPerm fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gMap fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Manage › Disconnect and reconnect

Stop a system, or bring a stopped one back. Disconnect asks first. Reconnect runs the connection test, and Fix first if the system had a problem. Nothing is deleted, and the Dashboard is not touched.

Route: `/emr`

Escape closes one layer at a time: the confirmation first, then the drawer. Disconnect is a person's own decision, so it is never held back by an agent's pause or freedom.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "<b>Manage drawer is open</b><br/>The system is Connected or Needs a quick look" }
  c1@{ shape: trap-t, label: "Click 'Disconnect'" }
  o1@{ shape: win-pane, label: "<b>Disconnect {name}?</b><br/>'Charts from it stop arriving. Nothing is deleted.'" }
  p1@{ shape: rect, label: "'Requests already on the Dashboard stay where they are. You can reconnect this system at any time.'" }
  q1@{ shape: diam, label: "Which action?" }
  k1@{ shape: trap-t, label: "Click 'Keep it connected', the X, the dimmed area, or press Escape" }
  k3@{ shape: trap-t, label: "Click 'Disconnect' in the confirmation" }
  e1@{ shape: stadium, label: "<b>Confirmation closes</b><br/>The drawer stays open and nothing changes<br/>A second Escape closes the drawer" }
  subgraph gOff ["What disconnecting does"]
  a1@{ shape: cyl, label: "<b>Status becomes Disconnected</b><br/>Issue text: 'Charts from this system are not arriving.'" }
  a6@{ shape: cyl, label: "<b>If it was on 'Needs a quick look', the problem is remembered</b><br/>Reconnect will start with Fix" }
  a2@{ shape: hex, label: "Navigator logs 'Disconnected {name}. Charts from it stop arriving'" }
  a3@{ shape: odd, label: "<b>'{name} is disconnected'</b><br/>'Reconnect it any time from this page.' Amber" }
  a4@{ shape: rect, label: "<b>Row: 'Not syncing', red pill, 'Reconnect' and 'Manage'</b><br/>'New case cannot pull a chart from it until it is connected.'<br/>Drawer pill turns red, the bottom button reads 'Reconnect'" }
  a5@{ shape: rect, label: "<b>Skipped by 'Sync now'</b><br/>Last sync tile ignores it, or reads 'None' if every system is off<br/>Its write-back switch no longer counts on the Dashboard" }
  end
  r1@{ shape: trap-t, label: "<b>Click 'Reconnect'</b><br/>On the row or at the end of the drawer" }
  r2@{ shape: rect, label: "<b>Nothing is connected yet</b><br/>The system stays Disconnected until a test passes" }
  g2@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Reconnect a system" }
  n1@{ shape: rect, label: "<b>No pause, edit or delete</b><br/>There is nothing to confirm when removing a system, because a system cannot be removed" }
  s1 --> c1 --> o1 --> p1 --> q1
  q1 -->|"Keep it"| k1 --> e1
  q1 -->|"Disconnect"| k3
  k3 --> a1 & a2 & a3
  a1 --> a6
  a1 --> a4 --> a5
  a5 --> r1
  a4 --> r1
  r1 --> r2 --> g2
  a1 -.-> n1
  class s1 k_start
  class c1,k1,k3,r1 k_click
  class o1 k_overlay
  class p1,a4,a5,r2,n1 k_process
  class q1 k_decision
  class e1 k_end
  class a1,a6 k_store
  class a2 k_agent
  class a3 k_toast
  class g2 k_goto
  style gOff fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## EMR Connect › Manage › Reconnect a system

A Disconnected system comes back only after a passed test. If it was on 'Needs a quick look' when it was disconnected, the Fix steps come first. The test is the same three checks as Connect.

Route: `/emr`

Demo: the test always passes. The system stays Disconnected, and New case cannot pull from it, until the last check passes and the person clicks the final button.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart TD
  classDef k_start fill:#1F5C4B,stroke:#174638,color:#FFFFFF,stroke-width:1.5px,font-weight:600
  classDef k_end fill:#DDEFE3,stroke:#2E7D4F,color:#14502F,stroke-width:1.5px,font-weight:600
  classDef k_endx fill:#FBE3E0,stroke:#C0392B,color:#7A1F16,stroke-width:1.5px,font-weight:600
  classDef k_screen fill:#FFFDF8,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px
  classDef k_overlay fill:#F1F7F3,stroke:#1F5C4B,color:#1C2B25,stroke-width:2px,stroke-dasharray:5 3
  classDef k_click fill:#DCEBFA,stroke:#2F6DB5,color:#12365F,stroke-width:1.5px
  classDef k_input fill:#E4E7FF,stroke:#4C5FD5,color:#1D2670,stroke-width:1.5px
  classDef k_process fill:#EEF0EE,stroke:#7A857F,color:#26302B,stroke-width:1.5px
  classDef k_agent fill:#EEE5FA,stroke:#7A4FC2,color:#341A63,stroke-width:1.5px
  classDef k_decision fill:#FFF0CC,stroke:#D9962B,color:#5C3B00,stroke-width:1.5px
  classDef k_store fill:#D5F0EA,stroke:#1C8E7B,color:#0B4A3F,stroke-width:1.5px
  classDef k_doc fill:#F6E9DC,stroke:#B07A4C,color:#4A2E14,stroke-width:1.5px
  classDef k_ext fill:#FFE6D2,stroke:#E07B39,color:#6B2F06,stroke-width:1.5px
  classDef k_wait fill:#E4E8EE,stroke:#6B7C93,color:#26303D,stroke-width:1.5px
  classDef k_toast fill:#FFF9DB,stroke:#C9A400,color:#5A4A00,stroke-width:1.5px
  classDef k_goto fill:#FFFFFF,stroke:#1F5C4B,color:#1F5C4B,stroke-width:1.5px,stroke-dasharray:5 3
  s1@{ shape: stadium, label: "<b>Click 'Reconnect'</b><br/>On a Disconnected row, or at the end of the Manage drawer" }
  g0@{ shape: subproc, label: "Continues in: EMR Connect › Sync › When an agent is paused or asks first" }
  q1@{ shape: diam, label: "Did it need a quick look when it was disconnected?" }
  subgraph gFix ["Fix first, if needed"]
  f1@{ shape: win-pane, label: "<b>Fix {name}</b><br/>Steps: What happened, Renew access, Test<br/>The original problem is shown in an amber box" }
  f2@{ shape: lean-r, label: "<b>Name who approves, tick the read-only box, click 'Renew and test'</b><br/>Three checks run" }
  f3@{ shape: trap-t, label: "<b>Click 'Next: test the connection'</b><br/>On the last step, after the checks pass" }
  f4@{ shape: cyl, label: "<b>The sign-in is renewed, the problem is cleared</b><br/>Still Disconnected" }
  f5@{ shape: hex, label: "Navigator logs 'Renewed the read-only sign-in for {name}'" }
  f6@{ shape: odd, label: "<b>'Sign-in renewed'</b><br/>'One more test, then {name} is connected.'<br/>No toast when Navigator is set to 'Act on its own'" }
  end
  subgraph gTest ["The connection test"]
  t1@{ shape: win-pane, label: "<b>Reconnect {name}</b><br/>'Read-only. Nothing is written back until a person approves it.'<br/>'It is connected again only when the test passes. Until then New case cannot pull a chart from it.'" }
  t2@{ shape: rect, label: "<b>Reaching the system</b><br/>Signing in with read-only access<br/>Reading one test record<br/>About 0.8 seconds a check" }
  t3@{ shape: odd, label: "'The test passed. Access is read-only, and nothing is written back.'" }
  t4@{ shape: trap-t, label: "<b>'Reconnect {name}' is dimmed until the last check passes</b><br/>Then click it" }
  end
  subgraph gSave ["What reconnecting does"]
  v1@{ shape: cyl, label: "<b>Status becomes Connected</b><br/>Last sync now, issue text cleared" }
  v2@{ shape: hex, label: "Navigator logs 'Reconnected {name} and read-only access passed its test'" }
  v3@{ shape: odd, label: "<b>'{name} is connected'</b><br/>No toast when Navigator is set to 'Act on its own'" }
  end
  cx@{ shape: trap-t, label: "<b>Click 'Cancel', the X, press Escape, or click the dimmed area</b><br/>On either pop-up" }
  x1@{ shape: stadium, label: "<b>Pop-up closes</b><br/>The system stays Disconnected<br/>A renewed sign-in stays renewed, so the next Reconnect goes straight to the test" }
  e1@{ shape: stadium, label: "<b>Row shows 'just now', a green pill and 'Sync now'</b><br/>New case can pull a chart from it again" }
  g1@{ shape: subproc, label: "Continues in: EMR Connect › Sync › What other screens use from EMR Connect" }
  s1 --> g0 --> q1
  q1 -->|"Yes"| f1 --> f2 --> f3 --> f4
  f4 --> f5 & f6
  f4 --> t1
  q1 -->|"No"| t1
  t1 --> t2 --> t3 --> t4
  t4 --> v1 & v2 & v3
  v1 --> e1
  v3 --> e1
  f1 -.-> cx
  t1 -.-> cx
  cx --> x1
  e1 -.-> g1
  class s1 k_start
  class g0,g1 k_goto
  class q1 k_decision
  class f1,t1 k_overlay
  class f2 k_input
  class f3,t4,cx k_click
  class f4,v1 k_store
  class f5,v2 k_agent
  class f6,t3,v3 k_toast
  class t2 k_process
  class x1 k_endx
  class e1 k_end
  style gFix fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gTest fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSave fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```
