# Analytics

Performance, and the monthly report.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/08-analytics/`.

## Analytics › Arrive and read the page

One page. A header with the report button and one quiet note, a row of three filters, four key figures, four cards (three charts and the workload), then a heading 'Detailed breakdowns' over three folded sections. It opens on 'This quarter', 'All payers' and 'All programs'. Everything is read-only except the filters, the 'Monthly report' button and the rows of the denial table.

Route: `/analytics`

Demo only: the figures are modeled from invented tables. 'This quarter, all payers, all programs' is the fixed starting set (71% approval rate, 29% denial rate, 2.4 days turnaround, 207 preventable denials, 1,070 decisions). No figure on the page is a dollar amount.

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
  s1@{ shape: stadium, label: "Click 'Analytics' in the sidebar" }
  sc@{ shape: curv-trap, label: "<b>Analytics</b><br/>'Where approvals are won and lost, and whether FLO's advice is working.'<br/>One quiet note: 'Modeled: ... Demo values: ... Workload and accepted denials are live.'" }
  subgraph gTop ["Header and filters"]
  m3@{ shape: curv-trap, label: "<b>Button 'Monthly report' with a document icon</b><br/>It opens a window, where the files and Print are" }
  m1@{ shape: curv-trap, label: "<b>Menu 'This quarter'</b><br/>(period)" }
  m2@{ shape: curv-trap, label: "<b>Menu 'All payers'</b><br/>(payer)" }
  m4@{ shape: curv-trap, label: "<b>Menu 'All programs'</b><br/>(program)<br/>'Clear filters' appears once a payer or program is picked" }
  end
  subgraph gTiles ["Four key figures"]
  t1@{ shape: curv-trap, label: "<b>'Approval rate'</b><br/>71% · '▲ 6 pts vs last quarter'<br/>'1,070 decisions · this quarter'" }
  t2@{ shape: curv-trap, label: "<b>'Denial rate'</b><br/>29% · '311 denials · 17 accepted'<br/>'▼ 6 pts vs last quarter'" }
  t3@{ shape: curv-trap, label: "<b>'Turnaround'</b><br/>2.4 days · 'Sent to decision · typical 1.9 days'<br/>'▼ 0.1 days vs last quarter'" }
  t4@{ shape: curv-trap, label: "<b>'Preventable denials'</b><br/>207 · '67% of 311 denials'<br/>'Fixable before sending'" }
  end
  subgraph gCards ["Cards below the figures"]
  c1@{ shape: curv-trap, label: "<b>Chart 'Approval rate by payer'</b><br/>Six bars, best first" }
  c2@{ shape: curv-trap, label: "<b>Chart 'Preventable denials by reason'</b><br/>Five reasons and one 'other' row, adding up to the figure" }
  c3@{ shape: curv-trap, label: "<b>Chart 'How people edit agent drafts'</b><br/>Donut and three-line legend" }
  c4@{ shape: curv-trap, label: "<b>Card 'Workload'</b><br/>'8 handled', '32 still open', live from the Dashboard" }
  end
  subgraph gDetail ["Heading 'Detailed breakdowns' (all folded)"]
  d1@{ shape: curv-trap, label: "<b>'Common denial reasons by payer'</b><br/>One summary line<br/>Opens to the table, 'Appeals overturned' and 'Denials accepted'" }
  d2@{ shape: curv-trap, label: "<b>'How FLO's advice and drafts perform'</b><br/>One summary line<br/>Opens to four facts, and why recommendations were dismissed" }
  d3@{ shape: curv-trap, label: "<b>'What helps most'</b><br/>One summary line<br/>Opens to four ranked steps" }
  end
  p1@{ shape: rect, label: "<b>All figures come from the chosen period, payer and program</b><br/>A figure behind fewer than 20 decisions (or denials) is hidden" }
  p2@{ shape: rect, label: "<b>Nothing is stored: the address stays /analytics</b><br/>Leaving the page resets the filters" }
  p3@{ shape: rect, label: "<b>Other screens feed this page</b><br/>Appeal rulings and accepted denials from Denial Intelligence<br/>Dismissed recommendations from Authorizations<br/>Open requests from the Dashboard (Workload)" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Period, payer and program menus" }
  g2@{ shape: subproc, label: "Continues in: Analytics › The four tiles" }
  g3@{ shape: subproc, label: "Continues in: Analytics › Charts: payers, draft edits and workload" }
  g4@{ shape: subproc, label: "Continues in: Analytics › Common denial reasons: open Denial Intelligence" }
  g5@{ shape: subproc, label: "Continues in: Analytics › Monthly report › Open and build" }
  g6@{ shape: subproc, label: "Continues in: Analytics › Denial outcomes and dismissed recommendations" }
  g7@{ shape: subproc, label: "Continues in: Analytics › Preventable denials chart" }
  g8@{ shape: subproc, label: "Continues in: Analytics › Detailed breakdowns" }
  g9@{ shape: subproc, label: "Continues in: Analytics › Program filter" }
  s1 --> sc
  sc --> m3 & m1 & m2 & m4
  m1 & m2 & m4 --> t1 & t2 & t3 & t4
  t1 & t2 & t3 & t4 --> c1 & c2 & c3 & c4
  c1 & c2 & c3 & c4 --> d1 & d2 & d3
  sc -.-> p1
  sc -.-> p2
  sc -.-> p3
  p3 --> g6
  m1 & m2 --> g1
  m4 --> g9
  t1 & t2 & t3 & t4 --> g2
  c1 & c3 & c4 --> g3
  c2 --> g7
  d1 --> g4
  d1 & d2 & d3 --> g8
  m3 --> g5
  class s1 k_start
  class sc,m3,m1,m2,m4,t1,t2,t3,t4,c1,c2,c3,c4,d1,d2,d3 k_screen
  class p1,p2,p3 k_process
  class g1,g2,g3,g4,g5,g6,g7,g8,g9 k_goto
  style gTop fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gTiles fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCards fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gDetail fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Period, payer and program menus

Three menus under the header change every figure, chart and breakdown on the page, and the monthly report. They are the only filters. There is no date picker and no search. 'Clear filters' puts payer and program back.

Route: `/analytics`

Demo only: other periods, payers and programs are worked out from the same invented tables, so they drift a little from this quarter. The period never counts as a filter in 'Clear filters', as on the Dashboard.

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
  s1@{ shape: stadium, label: "On Analytics, look at the three menus" }
  sc@{ shape: curv-trap, label: "<b>Menus 'This quarter', 'All payers' and 'All programs'</b><br/>All read as plain pills until you change payer or program" }
  subgraph gPeriod ["Period menu"]
  c1@{ shape: trap-t, label: "Click 'This quarter'" }
  o1@{ shape: win-pane, label: "'This quarter', 'Last quarter', 'Last 12 months'" }
  i1@{ shape: lean-r, label: "Pick one" }
  end
  subgraph gPayer ["Payer menu"]
  c2@{ shape: trap-t, label: "Click 'All payers'" }
  o2@{ shape: win-pane, label: "'All payers', 'Cardinal Health Plan', 'Summit Medicaid HMO', 'Beacon PPO', 'Harborview MA', 'Lakeshore Behavioral', 'Evergreen'" }
  i2@{ shape: lean-r, label: "Pick one" }
  p2@{ shape: rect, label: "<b>The payer pill turns green-edged and bold while it is not 'All payers'</b><br/>The period pill never does" }
  end
  subgraph gProgram ["Program menu"]
  c4@{ shape: trap-t, label: "Click 'All programs'" }
  o4@{ shape: win-pane, label: "'All programs', 'Residential', 'IOP', 'PHP', 'Withdrawal management'" }
  i4@{ shape: lean-r, label: "Pick one" }
  p4@{ shape: rect, label: "The program pill turns green-edged and bold while it is not 'All programs'" }
  end
  gp@{ shape: subproc, label: "Continues in: Analytics › Program filter" }
  cl@{ shape: trap-t, label: "<b>Click 'Clear filters'</b><br/>Only shown while a payer or a program is picked" }
  pcl@{ shape: rect, label: "<b>Payer and program return to 'All payers' and 'All programs'</b><br/>The period stays" }
  k1@{ shape: lean-r, label: "<b>Keyboard in any menu</b><br/>Arrow keys move, Enter picks, Esc closes" }
  k2@{ shape: trap-t, label: "Click anywhere outside an open menu" }
  p1@{ shape: rect, label: "Menu closes, value unchanged" }
  r1@{ shape: rect, label: "Page recomputes at once from the period, the payer and the program" }
  r2@{ shape: rect, label: "<b>Subtitles use the period: 'this quarter', 'last quarter' or 'the last 12 months'</b><br/>A picked program is added after a dot, for example 'this quarter · IOP'<br/>Counts scale: last quarter about 0.96, last 12 months about 3.9 times" }
  r4@{ shape: rect, label: "<b>The denial outcomes follow the menus too</b><br/>Rulings, accepted denials and dismissals recorded in this demo count in 'This quarter' and 'Last 12 months', not in 'Last quarter'<br/>One payer or one program: only theirs" }
  r3@{ shape: rect, label: "<b>One payer: the approval bars show that payer against 'All payers'</b><br/>The denial table lists all of that payer's reasons<br/>The preventable chart shows that payer's fixable reasons<br/>'What helps most' is re-weighted for that payer" }
  r5@{ shape: rect, label: "<b>Workload follows the payer and the program but not the period</b><br/>It is the Dashboard's requests right now" }
  q1@{ shape: diam, label: "Is a figure built on 20 or more decisions (or denials)?" }
  ok@{ shape: curv-trap, label: "The number shows, for example 86%" }
  hid@{ shape: curv-trap, label: "<b>Figure shows '-' with 'Not enough decisions yet'</b><br/>A card shows 'Not enough decisions yet. Figures based on fewer than 20 decisions stay hidden.'" }
  ex@{ shape: odd, label: "<b>Example: 'Lakeshore Behavioral' and 'This quarter'</b><br/>'Top denial cause' and 'Advice taken works' are hidden, as are the table and the list" }
  p3@{ shape: rect, label: "<b>Nothing goes into the address</b><br/>Leaving and returning resets to 'This quarter', 'All payers' and 'All programs'" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Monthly report › Open and build" }
  e1@{ shape: stadium, label: "Page matches the three menus" }
  s1 --> sc
  sc --> c1 --> o1 --> i1 --> r1
  sc --> c2 --> o2 --> i2 --> r1
  sc --> c4 --> o4 --> i4 --> r1
  i2 --> p2
  i4 --> p4
  i4 -.-> gp
  o1 & o2 & o4 --> k1
  o1 & o2 & o4 --> k2 --> p1
  k1 --> r1
  i2 & i4 --> cl --> pcl --> r1
  r1 --> r2 --> q1
  r1 --> r4 --> q1
  r1 --> r3
  r3 --> q1
  r1 -.-> r5
  q1 -->|"Yes"| ok --> e1
  q1 -->|"No"| hid --> ex --> e1
  r1 -.-> p3
  r1 -.-> g1
  class s1 k_start
  class sc,ok,hid k_screen
  class c1,c2,c4,cl,k2 k_click
  class o1,o2,o4 k_overlay
  class i1,i2,i4,k1 k_input
  class p2,p4,pcl,p1,r1,r2,r4,r3,r5,p3 k_process
  class gp,g1 k_goto
  class q1 k_decision
  class ex k_toast
  class e1 k_end
  style gPeriod fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gPayer fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gProgram fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › The four tiles

Four tinted tiles, each with a big number, a label and two small lines, and a small info button in the corner. They are the key figures: approval rate, denial rate, turnaround and preventable denials. All four are added up from the same table as the charts, so they always agree with them. The tiles are not buttons.

Route: `/analytics`

Demo only: turnaround is demo values (each payer's average from the sample data, drifted for other periods and programs). The other three are modeled from the quarter's decisions. No figure is a dollar amount.

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
  s1@{ shape: stadium, label: "Read the row of four tiles" }
  sc@{ shape: curv-trap, label: "<b>Each tile</b><br/>Big number, label in capitals, a meaning line, a count or trend line, and an info button at the top right" }
  subgraph gA ["'Approval rate' (green)"]
  a1@{ shape: curv-trap, label: "<b>71%</b><br/>'▲ 6 pts vs last quarter'<br/>'1,070 decisions · this quarter'" }
  a2@{ shape: rect, label: "<b>Share of decisions approved as asked in the period</b><br/>All payers: added up from each payer's decisions and denials<br/>One payer: that payer's own rate, the same number as its bar" }
  a3@{ shape: diam, label: "Change against the period before?" }
  a4@{ shape: odd, label: "'▲ 6 pts vs last quarter' (up, 'pt' for one point)" }
  a5@{ shape: odd, label: "'▼ 2 pts vs last quarter' (down)" }
  a6@{ shape: odd, label: "'No change vs last quarter'" }
  end
  subgraph gB ["'Denial rate' (red)"]
  b1@{ shape: curv-trap, label: "<b>29%</b><br/>'311 denials · 17 accepted'<br/>'▼ 6 pts vs last quarter'" }
  b2@{ shape: rect, label: "<b>100 minus the approval rate, so the two always add up to 100</b><br/>The count is the denials behind it<br/>'accepted' is the denials accepted, including the ones accepted in Denial Intelligence" }
  end
  subgraph gC ["'Turnaround' (grey)"]
  c1@{ shape: curv-trap, label: "<b>2.4 days</b><br/>'Sent to decision · typical 1.9 days'<br/>'▼ 0.1 days vs last quarter'" }
  c2@{ shape: rect, label: "<b>Average days from sent to decision</b><br/>Each payer's average from the sample data, weighted by its decisions<br/>Other periods and programs drift from it (demo values)<br/>Lower is faster: down is good news" }
  c3@{ shape: rect, label: "Info button 'About turnaround' says 'Demo values'" }
  end
  subgraph gD ["'Preventable denials' (amber)"]
  d1@{ shape: curv-trap, label: "<b>207</b><br/>'67% of 311 denials'<br/>'Fixable before sending'" }
  d2@{ shape: rect, label: "<b>Denials whose reason the team can fix before sending</b><br/>Thin or missing documentation, late notice, incomplete certification, duplicate request<br/>The count is the sum of the rows of the preventable chart" }
  end
  subgraph gI ["Info buttons"]
  i1@{ shape: trap-t, label: "Hover or Tab to the small 'i' on a tile" }
  i2@{ shape: win-pane, label: "<b>A short text: what the figure means</b><br/>Turnaround says 'Demo values'" }
  i3@{ shape: lean-r, label: "Move away, Tab on, or press Escape" }
  i4@{ shape: rect, label: "<b>Text goes away</b><br/>Escape closes only the text" }
  end
  q1@{ shape: diam, label: "Fewer than 20 behind the figure?" }
  h1@{ shape: curv-trap, label: "<b>Number becomes '-'</b><br/>Meaning line reads 'Not enough decisions yet'" }
  ok@{ shape: curv-trap, label: "The number and its lines show as usual" }
  p1@{ shape: rect, label: "<b>Tiles do nothing when clicked</b><br/>Unlike the Eligibility tiles, they are not filters" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Preventable denials chart" }
  g2@{ shape: subproc, label: "Continues in: Analytics › Detailed breakdowns" }
  e1@{ shape: stadium, label: "To change a tile, change the period, payer or program menu" }
  e2@{ shape: stadium, label: "Figures read" }
  s1 --> sc
  sc --> a1 & b1 & c1 & d1
  a1 --> a2 --> a3
  a3 -->|"Up"| a4
  a3 -->|"Down"| a5
  a3 -->|"Same"| a6
  b1 --> b2
  c1 --> c2 --> c3
  d1 --> d2
  sc --> i1 --> i2 --> i3 --> i4
  a4 & a5 & a6 & b2 & c2 & d2 --> q1
  q1 -->|"Yes"| h1 --> e2
  q1 -->|"No"| ok --> e2
  d2 --> g1
  b2 -.-> g2
  sc -.-> p1 --> e1
  class s1 k_start
  class sc,a1,b1,c1,d1,h1,ok k_screen
  class a2,b2,c2,c3,d2,i4,p1 k_process
  class a3,q1 k_decision
  class a4,a5,a6 k_toast
  class i1 k_click
  class i2 k_overlay
  class i3 k_input
  class g1,g2 k_goto
  class e1 k_endx
  class e2 k_end
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gC fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gD fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gI fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Program filter

The 'All programs' menu narrows every figure, chart and breakdown to one level of care: Residential, IOP, PHP or Withdrawal management. The demo has no per-program split of its decisions, so a small weighting table does it, the same way every time.

Route: `/analytics`

Demo values. The weights are invented: shares of decisions 40 / 30 / 20 / 10, and a shift in approval, turnaround, advice and edits for each program. They are balanced so 'All programs' stays the starting set (71%, 29%, 2.4 days, 207). The labels follow the sidebar's words 'Residential' and 'Withdrawal management'; the Dashboard's Program filter says 'Residential 3.5' and 'Detox'.

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
  s1@{ shape: stadium, label: "Click the 'All programs' menu" }
  o1@{ shape: win-pane, label: "'All programs', 'Residential', 'IOP', 'PHP', 'Withdrawal management'" }
  i1@{ shape: lean-r, label: "<b>Pick a program</b><br/>Or press Arrow keys, Enter; Esc closes" }
  p1@{ shape: rect, label: "<b>The pill turns green-edged and bold</b><br/>'Clear filters' appears beside the menus" }
  subgraph gScale ["What the weights do"]
  w1@{ shape: rect, label: "<b>Volume: the program's share of decisions</b><br/>Residential 40%, IOP 30%, PHP 20%, Withdrawal management 10%<br/>Applies to decisions, drafts, requests helped, rulings and accepted denials" }
  w2@{ shape: rect, label: "<b>Approval: every payer's rate moves by a few points</b><br/>Residential -3, IOP +4, PHP +2, Withdrawal management -4<br/>The denials follow: decisions times the rest" }
  w3@{ shape: rect, label: "<b>Turnaround: payer averages times a multiplier</b><br/>Residential 1.10, IOP 0.95, PHP 0.95, Withdrawal management 0.85" }
  w4@{ shape: rect, label: "<b>Reasons: each payer's denials are spread over its reasons</b><br/>Fixable reasons weigh more in IOP and PHP, less in Residential and Withdrawal management<br/>So the preventable share moves: about 62% in Residential, 71% in IOP" }
  w5@{ shape: rect, label: "Advice taken works and the draft edits shift a few points the same way" }
  end
  r1@{ shape: rect, label: "<b>Every number on the page is added up again from the same table</b><br/>Tiles, bars, preventable rows, denial table, 'What helps most', report and files" }
  r2@{ shape: rect, label: "<b>Recorded events join only if their request is in that program</b><br/>Appeal rulings, accepted denials, dismissed recommendations<br/>The request is looked up on the Dashboard or in Authorizations" }
  r3@{ shape: rect, label: "<b>Workload counts the Dashboard's requests in that program</b><br/>It does not follow the period" }
  q1@{ shape: diam, label: "20 or more decisions (or denials) left?" }
  ok@{ shape: curv-trap, label: "Numbers show" }
  hid@{ shape: curv-trap, label: "<b>'-' and 'Not enough decisions yet'</b><br/>More likely with one payer and a small program, for example Lakeshore and Withdrawal management" }
  cl@{ shape: trap-t, label: "Click 'Clear filters' or pick 'All programs'" }
  p2@{ shape: rect, label: "<b>Program and payer back to all</b><br/>The starting figures return exactly" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Monthly report › What the files contain" }
  e1@{ shape: stadium, label: "Page matches the program" }
  s1 --> o1 --> i1 --> p1
  i1 --> w1 & w2 & w3 & w4 & w5
  w1 & w2 & w3 & w4 & w5 --> r1
  r1 --> q1
  q1 -->|"Yes"| ok --> e1
  q1 -->|"No"| hid --> e1
  r1 -.-> r2
  r1 -.-> r3
  p1 --> cl --> p2
  r1 -.-> g1
  class s1 k_start
  class o1 k_overlay
  class i1 k_input
  class p1,w1,w2,w3,w4,w5,r1,r2,r3,p2 k_process
  class q1 k_decision
  class ok,hid k_screen
  class cl k_click
  class g1 k_goto
  class e1 k_end
  style gScale fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Charts: payers, draft edits and workload

Three cards you read but cannot click: the payer bars, the draft-edit donut and the workload card. The fourth chart, preventable denials, has its own diagram. There are no tooltips on hover and nothing opens on a click, except the link in the workload card. They change with the period, payer and program menus (workload: payer and program only).

Route: `/analytics`

Demo only: 'not enough decisions' on the bars and the donut cannot happen with the demo's numbers for all programs; with one small program and one payer it can. Workload is live: it counts the Dashboard's requests now.

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
  s1@{ shape: stadium, label: "Scroll to the cards" }
  subgraph gBars ["Payer bars"]
  b1@{ shape: curv-trap, label: "<b>'Approved as asked, this quarter'</b><br/>Bars, best first: Lakeshore 86%, Beacon PPO 81%, Harborview MA 77%, Summit Medicaid 74%, Evergreen 69%, Cardinal 63%<br/>A picked program is added to the subtitle" }
  b2@{ shape: diam, label: "Rate band?" }
  b3@{ shape: rect, label: "80 and above: green bar" }
  b4@{ shape: rect, label: "55 to 79: ochre bar" }
  b5@{ shape: rect, label: "Below 55: terracotta bar" }
  b6@{ shape: curv-trap, label: "Footnote '1,070 decisions this quarter. Green is 80 and above, ochre 55 to 79, terracotta below 55.'" }
  b7@{ shape: diam, label: "A payer is chosen in the menu?" }
  b8@{ shape: rect, label: "<b>Two bars: that payer, then 'All payers' for comparison</b><br/>The payer's bar is the same number as the 'Approval rate' tile" }
  end
  subgraph gEdit ["Draft edits"]
  d1@{ shape: curv-trap, label: "<b>'Share of drafts, this quarter'</b><br/>Donut with '68%' and 'as written' in the middle" }
  d2@{ shape: curv-trap, label: "<b>Legend</b><br/>'Sent as written' 68% · approved 89% of the time<br/>'Light edits' 27% · approved 76%<br/>'Rewritten' 5% · approved 45%" }
  d3@{ shape: curv-trap, label: "'966 drafts this quarter.'" }
  d4@{ shape: diam, label: "<b>Fewer than 20 drafts?</b><br/>(no demo view gets here)" }
  d5@{ shape: curv-trap, label: "'Not enough decisions yet. Figures based on fewer than 20 decisions stay hidden.'" }
  end
  subgraph gWork ["Workload"]
  h1@{ shape: curv-trap, label: "<b>'Workload'</b><br/>'Requests on the Dashboard right now'<br/>Link 'Open the Dashboard'" }
  h2@{ shape: rect, label: "<b>Two big numbers and a meter</b><br/>'8 handled' and '32 still open' at the start<br/>Handled means the payer has decided, the same as 'Decided today' on the Dashboard" }
  h3@{ shape: rect, label: "<b>Follows the payer and program menus, not the period</b><br/>A line names the scope, then says how many open requests wait on you" }
  h4@{ shape: cyl, label: "Live: answer a payer in the Dashboard, or accept a denial in Denial Intelligence, and the numbers move by one" }
  h5@{ shape: trap-t, label: "Click 'Open the Dashboard'" }
  h6@{ shape: subproc, label: "Continues in: Dashboard › Arrive › What the page shows" }
  end
  p1@{ shape: rect, label: "Hover and click do nothing on bars, donut slices, legend and meter" }
  e1@{ shape: stadium, label: "Cards read" }
  e2@{ shape: stadium, label: "No drill-down: rows are not links" }
  s1 --> b1 & d1 & h1
  b1 --> b2
  b2 -->|"80 and above"| b3 --> b6
  b2 -->|"55 to 79"| b4 --> b6
  b2 -->|"Below 55"| b5 --> b6
  b6 --> b7
  b7 -->|"Yes"| b8 --> e1
  b7 -->|"No"| e1
  d1 --> d2 --> d3 --> d4
  d4 -->|"No"| e1
  d4 -->|"Yes"| d5 --> e1
  h1 --> h2 --> h3 --> h4 --> e1
  h1 --> h5 --> h6
  s1 -.-> p1 --> e2
  class s1 k_start
  class b1,b6,d1,d2,d3,d5,h1 k_screen
  class b2,b7,d4 k_decision
  class b3,b4,b5,b8,h2,h3,p1 k_process
  class h4 k_store
  class h5 k_click
  class h6 k_goto
  class e1 k_end
  class e2 k_endx
  style gBars fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gEdit fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gWork fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Common denial reasons: open Denial Intelligence

The table of common denial reasons sits in a folded section under 'Detailed breakdowns'. Every row is a link to Denial Intelligence, by the row or by the reason text. The link carries the row's payer and its reason, so the denial list opens already narrowed to those denials.

Route: `/analytics`

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
  s1@{ shape: stadium, label: "<b>Under 'Detailed breakdowns', click 'Common denial reasons by payer'</b><br/>Or Tab to it and press Enter or Space" }
  sc@{ shape: curv-trap, label: "<b>Section opens</b><br/>Summary stays: '311 denials this quarter. Most common: ...'<br/>'This quarter. Each payer's most common reason. Select a row to open those denials in Denial Intelligence.'<br/>With a program picked: 'This quarter · IOP.'" }
  th@{ shape: curv-trap, label: "<b>Columns</b><br/>'Reason', 'Payer', 'Count', 'Share of denials' (a red bar and the percent)" }
  q1@{ shape: diam, label: "Which payer is chosen in the menu?" }
  p1@{ shape: rect, label: "<b>'All payers': one row per payer, its most common reason</b><br/>Biggest first<br/>Share is of all the denials in view, so the rows add up to less than 100%" }
  r1@{ shape: curv-trap, label: "<b>Cardinal 73 · 23%</b><br/>'Continued-stay evidence incomplete'" }
  r2@{ shape: curv-trap, label: "<b>Evergreen 34 · 11%</b><br/>'Partial approval without a stated reason'" }
  r3@{ shape: curv-trap, label: "<b>Summit Medicaid 28 · 9%</b><br/>'Level of care does not match mood severity'" }
  r4@{ shape: curv-trap, label: "<b>Harborview MA 15 · 5%</b><br/>Beacon PPO 13 · 4%" }
  p2@{ shape: rect, label: "<b>A payer with fewer than 20 denials is left out</b><br/>Lakeshore this quarter and last quarter" }
  p3@{ shape: rect, label: "<b>One payer: all of that payer's reasons, three or four rows</b><br/>Shares add up to 100% of that payer's denials<br/>Every count is part of the denials behind the 'Denial rate' tile" }
  q2@{ shape: diam, label: "Fewer than 20 denials in view?" }
  nd@{ shape: curv-trap, label: "<b>'Not enough decisions yet. Figures based on fewer than 20 decisions stay hidden.'</b><br/>No table, no link" }
  subgraph gClick ["Open a row"]
  c1@{ shape: trap-t, label: "Click anywhere on a row" }
  c2@{ shape: trap-t, label: "Click the reason text, for example 'Recertification filed too late'" }
  p4@{ shape: rect, label: "<b>Opens /denials?payer=harborview&reason=Recertification filed too late</b><br/>The row's own payer and reason go along (spaces become plus signs)<br/>Row hover tint shows it is a link" }
  end
  g1@{ shape: subproc, label: "Continues in: Denial Intelligence › Open denials list" }
  p5@{ shape: rect, label: "Browser Back returns to Analytics with the menus reset" }
  s1 --> sc --> th --> q1
  q1 -->|"All payers"| p1
  p1 --> r1 & r2 & r3 & r4
  p1 -.-> p2
  q1 -->|"One payer"| p3
  p3 --> q2
  p2 --> q2
  q2 -->|"Yes"| nd
  q2 -->|"No"| c1 & c2
  r1 & r2 & r3 & r4 --> c1 & c2
  c1 --> p4
  c2 --> p4
  p4 --> g1
  g1 -.-> p5
  class s1 k_start
  class sc,th,r1,r2,r3,r4,nd k_screen
  class q1,q2 k_decision
  class p1,p2,p3,p4,p5 k_process
  class c1,c2 k_click
  class g1 k_goto
  style gClick fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Denial outcomes and dismissed recommendations

What other screens write back to Analytics. Two figures sit under the denial table (in its folded section) and move when a denial is accepted or an appeal is ruled on. The 'Denial rate' tile shows the accepted count too. A list of dismissal reasons appears once a recommendation has been dismissed, inside the folded section 'How FLO's advice and drafts perform'. Each event moves the numbers only a little.

Route: `/analytics`

Demo only: the starting figures (96 rulings, 56% overturned, 17 accepted denials) are invented. Everything recorded in the demo counts in 'This quarter' and 'Last 12 months', never in 'Last quarter', and follows the payer and program menus. Accepting a denial also moves Workload (one more handled, one fewer open).

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
  s1@{ shape: stadium, label: "Look at the 'Denial rate' tile, then open 'Common denial reasons by payer' and scroll to its foot" }
  sc@{ shape: curv-trap, label: "<b>Tile 'Denial rate': '311 denials · 17 accepted'</b><br/>Two figures under the table<br/>'Appeals overturned'  56%, '54 of 96 rulings this quarter'<br/>'Denials accepted'  17, 'denials this quarter'" }
  subgraph gApp ["Appeals overturned"]
  x1@{ shape: st-rect, label: "<b>The payer rules on an appeal</b><br/>(demo: the person logs the ruling)" }
  st1@{ shape: cyl, label: "<b>Denial Intelligence records the ruling</b><br/>Overturned, partly restored or upheld" }
  p1@{ shape: rect, label: "<b>Rulings go up by one</b><br/>Overturned and partly restored also add to 'overturned'<br/>Upheld only adds to the rulings" }
  q1@{ shape: diam, label: "Fewer than 20 rulings in this view?" }
  o1@{ shape: curv-trap, label: "For example 57%, '55 of 97 rulings this quarter'" }
  o2@{ shape: curv-trap, label: "<b>'-' and 'Not enough decisions yet'</b><br/>A single payer with few rulings, for example Lakeshore" }
  end
  subgraph gOff ["Denials accepted"]
  k1@{ shape: trap-t, label: "In Denial Intelligence the person accepts a denial" }
  st2@{ shape: cyl, label: "<b>Denial Intelligence records the accepted denial</b><br/>With its payer" }
  p2@{ shape: rect, label: "<b>The count goes up by one</b><br/>For example 17 becomes 18, and the payer and program menus count it for that payer and program" }
  o3@{ shape: curv-trap, label: "<b>'18', 'denials this quarter' under the table</b><br/>The tile reads '311 denials · 18 accepted'<br/>Workload: '9 handled', '31 still open'" }
  end
  subgraph gDis ["Why recommendations were dismissed"]
  k2@{ shape: trap-t, label: "On a case, the person dismisses a recommendation and gives a reason" }
  st3@{ shape: cyl, label: "<b>Authorizations records the reason</b><br/>With the request, so Analytics can find its payer" }
  q2@{ shape: diam, label: "Any dismissal in this view?" }
  d1@{ shape: curv-trap, label: "<b>In the folded section 'How FLO's advice and drafts perform'</b><br/>'Why recommendations were dismissed'<br/>'The reason given each time someone dismissed a recommendation, this quarter.'<br/>One row per reason, biggest first, '2 times' or '1 time'<br/>The section's summary adds '2 recommendations dismissed.'" }
  d2@{ shape: curv-trap, label: "<b>No list at all</b><br/>Nothing was dismissed, or the period is 'Last quarter', or the payer or program has none" }
  end
  m1@{ shape: rect, label: "<b>The monthly report and its printout carry the same figures</b><br/>'Denial outcomes' always, 'Why recommendations were dismissed' when the list shows" }
  m2@{ shape: rect, label: "<b>Pick another period, payer or program</b><br/>The figures are worked out again from the recorded events" }
  g1@{ shape: subproc, label: "Continues in: Denial Intelligence › Written appeal › Record the payer's decision" }
  g2@{ shape: subproc, label: "Continues in: Denial Intelligence › Accept the denial" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › Dismiss and bring back" }
  g4@{ shape: subproc, label: "Continues in: Analytics › Monthly report › What the files contain" }
  e1@{ shape: stadium, label: "Page matches what was recorded" }
  s1 --> sc
  sc -.-> g1 & g2 & g3
  x1 --> st1 --> p1 --> q1
  q1 -->|"No"| o1 --> e1
  q1 -->|"Yes"| o2 --> e1
  k1 --> st2 --> p2 --> o3 --> e1
  k2 --> st3 --> q2
  q2 -->|"Yes"| d1 --> e1
  q2 -->|"No"| d2 --> e1
  sc --> x1 & k1 & k2
  e1 -.-> m1 --> g4
  e1 -.-> m2
  class s1 k_start
  class sc,o1,o2,o3,d1,d2 k_screen
  class x1 k_ext
  class st1,st2,st3 k_store
  class p1,p2,m1,m2 k_process
  class q1,q2 k_decision
  class k1,k2 k_click
  class g1,g2,g3,g4 k_goto
  class e1 k_end
  style gApp fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gOff fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gDis fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Preventable denials chart

A horizontal bar chart of the denials the team could have fixed before sending, one bar for each reason. Its rows add up to the 'Preventable denials' tile. It is read-only. The reasons come from the same table as the denial reasons list, each tagged as fixable or not.

Route: `/analytics`

Demo only. A reason is fixable when it is thin or missing documentation, late notice, an incomplete certification or a duplicate request. Not fixable: units above criteria, a clinical disagreement on level of care, a partial approval without a reason, a payer's network error. Each payer's denials are spread over its reasons in fixed proportions, so every denial is counted once.

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
  s1@{ shape: stadium, label: "Scroll to 'Preventable denials by reason'" }
  sc@{ shape: curv-trap, label: "<b>Card 'Preventable denials by reason'</b><br/>'207 of 311 denials (67%) could be fixed before sending, this quarter'" }
  subgraph gRows ["Rows"]
  r1@{ shape: curv-trap, label: "<b>Up to five bars, biggest first</b><br/>'Continued-stay evidence incomplete' 73<br/>'Missing recent therapy notes' 22<br/>'Recertification filed too late' 21<br/>'Retro-authorization window missed' 17<br/>'Step-down plan not named' 13" }
  r2@{ shape: curv-trap, label: "<b>One lighter bar: '9 other fixable reasons' 61</b><br/>So the bars add up to 207" }
  r3@{ shape: curv-trap, label: "Footnote: thin or missing documentation, late notice, an incomplete certification and a duplicate request count as fixable" }
  end
  subgraph gScope ["What changes it"]
  s2@{ shape: rect, label: "<b>One payer: only that payer's fixable reasons</b><br/>Cardinal shows three rows, no 'other' row" }
  s3@{ shape: rect, label: "<b>One program: the fixable share moves</b><br/>Residential about 62%, IOP about 71%" }
  s4@{ shape: rect, label: "Another period: counts scale with decisions, the share stays about the same" }
  end
  q1@{ shape: diam, label: "Fewer than 20 denials in this view?" }
  h1@{ shape: curv-trap, label: "<b>'Not enough decisions yet. Figures based on fewer than 20 decisions stay hidden.'</b><br/>The tile shows '-'" }
  p1@{ shape: rect, label: "<b>Hover and click do nothing on the bars</b><br/>To open the denials behind a reason, use 'Common denial reasons by payer'" }
  p2@{ shape: rect, label: "The tile, the bars, the Markdown file, the CSV and the printed page all use these rows" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Common denial reasons: open Denial Intelligence" }
  g2@{ shape: subproc, label: "Continues in: Analytics › Monthly report › What the files contain" }
  e1@{ shape: stadium, label: "Chart read" }
  s1 --> sc --> r1 --> r2 --> r3 --> q1
  sc --> s2 & s3 & s4
  q1 -->|"No"| p2 --> e1
  q1 -->|"Yes"| h1 --> e1
  r3 -.-> p1
  p1 --> g1
  p2 -.-> g2
  class s1 k_start
  class sc,r1,r2,r3,h1 k_screen
  class s2,s3,s4,p1,p2 k_process
  class q1 k_decision
  class g1,g2 k_goto
  class e1 k_end
  style gRows fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gScope fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Detailed breakdowns

Under the heading 'Detailed breakdowns' three sections are folded. Each is a real button that shows its title and one summary line, and opens in place. Open by click, Enter or Space. Nothing else on the page moves except the content below it.

Route: `/analytics`

The summary lines are worked out from the page's figures, so they change with the menus. A section starts closed every time the page opens.

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
  s1@{ shape: stadium, label: "Scroll below the charts to 'Detailed breakdowns'" }
  sc@{ shape: curv-trap, label: "<b>Heading 'Detailed breakdowns'</b><br/>'The tables and rankings behind the figures above. Each one opens in place.'<br/>Three closed sections with a chevron on the right" }
  subgraph gA ["'Common denial reasons by payer'"]
  a1@{ shape: curv-trap, label: "Summary: '311 denials this quarter. Most common: Continued-stay evidence incomplete at Cardinal, 23%.'" }
  a2@{ shape: curv-trap, label: "Opens to: the table (Reason, Payer, Count, Share of denials), then 'Appeals overturned' and 'Denials accepted'" }
  end
  subgraph gB ["'How FLO's advice and drafts perform'"]
  b1@{ shape: curv-trap, label: "<b>Summary: 'Advice taken works 84% of the time. 75% of drafts were sent without edits.'</b><br/>Adds '2 recommendations dismissed.' once any were dismissed" }
  b2@{ shape: curv-trap, label: "<b>Opens to: four facts, 'Approved as asked' 71%, 'Top denial cause' 23%, 'Advice taken works' 84%, 'Sent without edits' 75%</b><br/>Then 'Why recommendations were dismissed' when someone dismissed one" }
  end
  subgraph gC ["'What helps most'"]
  c1@{ shape: curv-trap, label: "Summary: 'Most applied: Document depression severity with dated scores, 91% approved.'" }
  c2@{ shape: curv-trap, label: "Opens to: up to four ranked steps, 'Applied 389 times', '91% approved'" }
  end
  k1@{ shape: trap-t, label: "<b>Click the section's title row</b><br/>Or Tab to it and press Enter or Space" }
  p1@{ shape: rect, label: "<b>The button says whether it is open (aria-expanded)</b><br/>The chevron turns<br/>A hairline separates the summary from the content" }
  k2@{ shape: trap-t, label: "Click it again, or press Enter or Space again" }
  p2@{ shape: rect, label: "It closes. The summary stays" }
  q1@{ shape: diam, label: "20 or more decisions behind the content?" }
  h1@{ shape: curv-trap, label: "<b>Content reads 'Not enough decisions yet'</b><br/>The summary says the same" }
  p3@{ shape: rect, label: "<b>Menus change the figures while a section is open</b><br/>The open section updates in place" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Common denial reasons: open Denial Intelligence" }
  g2@{ shape: subproc, label: "Continues in: Analytics › Denial outcomes and dismissed recommendations" }
  e1@{ shape: stadium, label: "Section read" }
  s1 --> sc
  sc --> a1 & b1 & c1
  a1 & b1 & c1 --> k1
  k1 --> p1
  k1 --> a2 & b2 & c2
  a2 & b2 & c2 --> q1
  q1 -->|"No"| h1 --> e1
  q1 -->|"Yes"| e1
  p1 --> k2 --> p2
  a2 -.-> g1
  b2 -.-> g2
  sc -.-> p3
  class s1 k_start
  class sc,a1,a2,b1,b2,c1,c2,h1 k_screen
  class k1,k2 k_click
  class p1,p2,p3 k_process
  class q1 k_decision
  class g1,g2 k_goto
  class e1 k_end
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gC fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Monthly report › Open and build

'Monthly report' opens a small window where the Analyst agent builds the report in four short steps, about 3 seconds. Cancel, Close, Escape and a click outside all stop it. Closing throws the build away.

Route: `/analytics`

Demo only: the steps are a timer, 0.75 seconds each. The report is built from the period, payer and program chosen when the window opened. Escape closes the window, and a menu opened beforehand closes first, one press each.

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
  s1@{ shape: stadium, label: "Click 'Monthly report' (top right)" }
  o1@{ shape: win-pane, label: "<b>Window 'Monthly report'</b><br/>Subtitle 'This quarter · All payers · All programs'<br/>'Built by' Analyst<br/>Button 'Cancel' in the footer" }
  p0@{ shape: rect, label: "<b>Page behind is dimmed</b><br/>The menus cannot be used until the window closes" }
  subgraph gSteps ["Four steps"]
  a1@{ shape: hex, label: "<b>Analyst</b><br/>'Collecting the decisions for this quarter'" }
  w1@{ shape: delay, label: "0.75 seconds" }
  a2@{ shape: hex, label: "<b>Analyst</b><br/>'Dropping any figure with fewer than 20 decisions'" }
  w2@{ shape: delay, label: "0.75 seconds" }
  a3@{ shape: hex, label: "<b>Analyst</b><br/>'Writing the summary'" }
  w3@{ shape: delay, label: "0.75 seconds" }
  a4@{ shape: hex, label: "<b>Analyst</b><br/>'Laying out the report'" }
  w4@{ shape: delay, label: "0.75 seconds" }
  end
  p1@{ shape: rect, label: "<b>Each step shows a spinner while it runs, then a green tick</b><br/>Steps still to come have a grey dot and grey text" }
  r1@{ shape: curv-trap, label: "<b>Panel 'Your report is ready'</b><br/>'Same figures as this page. Save a file or print it.'<br/>Buttons 'Download report', 'Download data (CSV)' and 'Print'<br/>Footer button now reads 'Done'" }
  subgraph gClose ["Close it at any moment"]
  c1@{ shape: trap-t, label: "Click 'Cancel' (while building) or 'Done' (when ready)" }
  c2@{ shape: trap-t, label: "Click the X ('Close')" }
  k1@{ shape: lean-r, label: "Press Escape" }
  c3@{ shape: trap-t, label: "Click the dimmed area outside the window" }
  end
  p2@{ shape: rect, label: "<b>Window closes at once</b><br/>Nothing is downloaded and the page is unchanged" }
  p3@{ shape: rect, label: "Opening it again starts again from step 1" }
  q1@{ shape: diam, label: "Was the build still running?" }
  e1@{ shape: stadium, label: "Build abandoned if it was still running" }
  e2@{ shape: stadium, label: "Back on Analytics" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Monthly report › Download the files" }
  s1 --> o1 --> p0
  o1 --> a1 --> w1 --> a2 --> w2 --> a3 --> w3 --> a4 --> w4 --> r1
  a1 -.-> p1
  r1 --> g1
  o1 --> c1 & c2 & k1 & c3
  r1 --> c1
  c1 & c2 & k1 & c3 --> p2 --> q1
  p2 -.-> p3
  q1 -->|"Yes"| e1
  q1 -->|"No"| e2
  class s1 k_start
  class o1 k_overlay
  class p0,p1,p2,p3 k_process
  class a1,a2,a3,a4 k_agent
  class w1,w2,w3,w4 k_wait
  class r1 k_screen
  class c1,c2,c3 k_click
  class k1 k_input
  class q1 k_decision
  class e1 k_endx
  class e2 k_end
  class g1 k_goto
  style gSteps fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gClose fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Monthly report › Download the files

When the report is ready the window offers two real files, a written report and the figures as a table, and a Print button. In the hosted preview, where the host page blocks downloads and printing, the buttons only explain why nothing happens. There is no PDF file: Print hands the page to the browser's own print window.

Route: `/analytics`

Demo only: the files hold exactly the figures on the page, and are named from the period, payer and program, for example psyflo-monthly-report-quarter-all-all.md.

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
  s1@{ shape: stadium, label: "Window shows 'Your report is ready'" }
  sc@{ shape: curv-trap, label: "<b>Three buttons</b><br/>'Download report' (dark)<br/>'Download data (CSV)'<br/>'Print'<br/>Footer button 'Done'" }
  c1@{ shape: trap-t, label: "Click 'Download report'" }
  c2@{ shape: trap-t, label: "Click 'Download data (CSV)'" }
  c3@{ shape: trap-t, label: "Click 'Print'" }
  q2@{ shape: diam, label: "Is this the hosted preview?" }
  t3@{ shape: odd, label: "<b>'Print is off in this preview'</b><br/>'Open the single-file version of the demo to use it.'" }
  pp@{ shape: rect, label: "<b>The browser's print window opens</b><br/>It prints a plain page of the report: title, period, scope, program and every section<br/>Not the sidebar, the menus or the window" }
  pq@{ shape: rect, label: "<b>Cancel or Print in the browser window</b><br/>The report window stays open" }
  q1@{ shape: diam, label: "<b>Is this the hosted preview?</b><br/>(the host page blocks downloads and printing)" }
  t1@{ shape: odd, label: "<b>'Download is off in this preview'</b><br/>'Open the single-file version of the demo to use it.'" }
  p0@{ shape: rect, label: "<b>No file is made and no second toast</b><br/>The window stays open" }
  subgraph gFile ["In the single-file demo"]
  f1@{ shape: doc, label: "<b>Markdown file</b><br/>psyflo-monthly-report-quarter-all-all.md" }
  f2@{ shape: doc, label: "<b>CSV file</b><br/>psyflo-monthly-report-quarter-all-all.csv" }
  p1@{ shape: rect, label: "Browser saves the file to the person's computer" }
  t2@{ shape: odd, label: "<b>'Report downloaded'</b><br/>'psyflo-monthly-report-quarter-all-all.md has the figures you see on this page.'" }
  p2@{ shape: rect, label: "Window stays open, so the other file can be saved too" }
  end
  n1@{ shape: rect, label: "Name pattern: psyflo-monthly-report, then the period (quarter, last_quarter, year), then the payer (all or cardinal, summit ...), then the program (all, res, iop, php or wm)" }
  d1@{ shape: doc, label: "<b>Production, not in the demo</b><br/>One PDF monthly pack, aggregate only, drafted on the first business day<br/>The operator approves it before it is sent<br/>The demo prints through the browser instead" }
  k1@{ shape: trap-t, label: "Click 'Done', press Escape, click the X or click outside" }
  e1@{ shape: stadium, label: "Window closes, back on Analytics" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Monthly report › What the files contain" }
  s1 --> sc
  sc --> c1 & c2 & c3
  c3 --> q2
  q2 -->|"Yes"| t3 --> k1
  q2 -->|"No"| pp --> pq --> k1
  c1 & c2 --> q1
  q1 -->|"Yes"| t1 --> p0 --> k1
  q1 -->|"No"| p1 --> t2 --> p2 --> k1
  p1 --> f1 & f2
  p1 -.-> n1
  f1 & f2 --> g1
  sc --> k1
  k1 --> e1
  sc -.-> d1
  class s1 k_start
  class sc k_screen
  class c1,c2,c3,k1 k_click
  class q2,q1 k_decision
  class t3,t1,t2 k_toast
  class pp,pq,p0,p1,p2,n1 k_process
  class f1,f2,d1 k_doc
  class e1 k_end
  class g1 k_goto
  style gFile fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Monthly report › What the files contain

The two downloaded files and the printed page are built from the same numbers as the page, for the period, payer and program chosen when the window opened. A figure behind fewer than 20 decisions is written as 'Not enough decisions yet', never as a number.

Route: `/analytics`

Demo only: the real monthly pack in the product requirements is one PDF, aggregate only, approved by the operator before it is sent. The demo has no PDF file. The printed page holds the same sections as the written report.

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
  s1@{ shape: stadium, label: "A download button is clicked in the report window" }
  subgraph gMd ["Written report (.md)"]
  m1@{ shape: doc, label: "<b>'# Psyflo monthly report'</b><br/>'Period: This quarter', 'Scope: All payers' and 'Program: All programs'<br/>'Built by Analyst from demo data. Figures are modeled from the quarter's decisions; turnaround is demo values. A figure based on fewer than 20 decisions is left out.'" }
  m2@{ shape: doc, label: "<b>'## Headline figures'</b><br/>Seven bullets: approval rate with the trend line, denial rate, turnaround (days, demo values), preventable denials with its share, top denial cause, advice taken works, sent without edits" }
  m3@{ shape: doc, label: "<b>'## Approval rate by payer'</b><br/>One bullet per bar with its decisions" }
  m9@{ shape: doc, label: "<b>'## Preventable denials by reason'</b><br/>One bullet per row of the chart, so the bullets add up to the headline count" }
  m4@{ shape: doc, label: "<b>'## How people edit agent drafts'</b><br/>Three bullets, then 'Drafts counted'" }
  m5@{ shape: doc, label: "<b>'## Common denial reasons'</b><br/>Table: Reason, Payer, Count, Share of denials" }
  m7@{ shape: doc, label: "<b>'## Denial outcomes'</b><br/>'Appeals overturned: 56% (54 of 96 rulings, partly restored counts as overturned)'<br/>'Denials accepted: 17'" }
  m6@{ shape: doc, label: "<b>'## What helps most'</b><br/>Numbered list: step, times applied, percent approved" }
  m8@{ shape: doc, label: "<b>'## Why recommendations were dismissed'</b><br/>One bullet per reason with its count<br/>Left out when nobody dismissed one" }
  end
  subgraph gCsv ["Figures as a table (.csv)"]
  v1@{ shape: doc, label: "<b>One header row</b><br/>period, scope, section, label, value, count, program, unit<br/>Unit says percent, days, count or percent of denials" }
  v2@{ shape: doc, label: "<b>Rows by section</b><br/>headline, approval by payer, preventable denials, draft edits, denial reasons, denial outcomes, what helps most<br/>and 'dismissed recommendations' when there are any" }
  v3@{ shape: doc, label: "<b>Commas and quotes inside a value are wrapped in quotes</b><br/>Opens in a spreadsheet" }
  end
  q1@{ shape: diam, label: "Is the figure behind 20 or more decisions?" }
  p1@{ shape: rect, label: "The number is written" }
  p2@{ shape: rect, label: "<b>'Not enough decisions yet' is written in its place</b><br/>The count is kept" }
  p3@{ shape: rect, label: "Same view as the page: the same period, payer and program, the same hidden figures" }
  e1@{ shape: stadium, label: "File matches the screen" }
  s1 --> m1 & v1
  m1 --> m2 --> m3 --> m9 --> m4 --> m5 --> m7 --> m6 --> m8
  v1 --> v2 --> v3
  m8 --> q1
  v3 --> q1
  q1 -->|"Yes"| p1 --> e1
  q1 -->|"No"| p2 --> e1
  s1 -.-> p3
  p3 -.-> e1
  class s1 k_start
  class m1,m2,m3,m9,m4,m5,m7,m6,m8,v1,v2,v3 k_doc
  class q1 k_decision
  class p1,p2,p3 k_process
  class e1 k_end
  style gMd fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCsv fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```
