# Analytics

Performance, and the monthly report.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/08-analytics/`.

## Analytics › Arrive and read the page

One page with two menus and a report button on top, four tiles, then four cards, and a fifth when recommendations were dismissed. It opens on 'This quarter' and 'All payers'. Everything is read-only except the menus, the 'Monthly report' button and the rows of the denial table.

Route: `/analytics`

Demo only: the figures are invented tables. 'This quarter, all payers' is the fixed starting set (71% approved as asked, 1,070 decisions).

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
  sc@{ shape: curv-trap, label: "<b>Analytics</b><br/>'Where approvals are won and lost, and whether the advice is working.'" }
  subgraph gTop ["Top right of the header"]
  m1@{ shape: curv-trap, label: "<b>Menu 'This quarter'</b><br/>(period)" }
  m2@{ shape: curv-trap, label: "<b>Menu 'All payers'</b><br/>(payer)" }
  m3@{ shape: curv-trap, label: "<b>Button 'Monthly report' with a document icon</b><br/>It opens a window, where the files and Print are" }
  end
  subgraph gTiles ["Row of four tiles"]
  t1@{ shape: curv-trap, label: "<b>'Approved as asked'</b><br/>71% · '▲ 6 pts vs last quarter'<br/>'1,070 decisions · this quarter'" }
  t2@{ shape: curv-trap, label: "<b>'Top denial cause'</b><br/>29% · 'Thin continued-stay evidence'<br/>'311 denials · this quarter'" }
  t3@{ shape: curv-trap, label: "<b>'Advice taken works'</b><br/>84% · 'Approved when applied'<br/>'828 requests · this quarter'" }
  t4@{ shape: curv-trap, label: "<b>'Sent without edits'</b><br/>75% · 'As written, or a typo fixed'<br/>'966 drafts · this quarter'" }
  end
  subgraph gCards ["Cards below"]
  c1@{ shape: curv-trap, label: "<b>Card 'Approval rate by payer'</b><br/>Six bars, best first" }
  c2@{ shape: curv-trap, label: "<b>Card 'How people edit agent drafts'</b><br/>Donut and three-line legend" }
  c3@{ shape: curv-trap, label: "<b>Card 'Common denial reasons by payer'</b><br/>Table, one row per payer<br/>Under it 'Appeals overturned' and 'Written off after accepted denials'" }
  c4@{ shape: curv-trap, label: "<b>Card 'What helps most'</b><br/>Four ranked steps" }
  c5@{ shape: curv-trap, label: "<b>Card 'Why recommendations were dismissed'</b><br/>Shown only when someone dismissed a recommendation" }
  end
  hub2@{ shape: curv-trap, label: "Under the header, a row of four tiles" }
  hub@{ shape: curv-trap, label: "Below the tiles, four cards and sometimes a fifth" }
  p1@{ shape: rect, label: "<b>All figures come from the chosen period and payer</b><br/>A figure behind fewer than 20 decisions is hidden" }
  p2@{ shape: rect, label: "<b>Nothing is stored: the address stays /analytics</b><br/>Leaving the page resets the menus" }
  p3@{ shape: rect, label: "<b>Other screens feed this page</b><br/>Appeal rulings and accepted denials from Denial Intelligence<br/>Dismissed recommendations from Authorizations" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Period and payer menus" }
  g2@{ shape: subproc, label: "Continues in: Analytics › The four tiles" }
  g3@{ shape: subproc, label: "Continues in: Analytics › Read-only cards: payers, draft edits, what helps most" }
  g4@{ shape: subproc, label: "Continues in: Analytics › Common denial reasons: open Denial Intelligence" }
  g5@{ shape: subproc, label: "Continues in: Analytics › Monthly report › Open and build" }
  g6@{ shape: subproc, label: "Continues in: Analytics › Denial outcomes and dismissed recommendations" }
  s1 --> sc
  sc --> m1 & m2 & m3
  m1 & m2 & m3 --> hub2
  hub2 --> t1 & t2 & t3 & t4
  t1 & t2 & t3 & t4 --> hub
  hub --> c1 & c2 & c3 & c4 & c5
  sc -.-> p1
  sc -.-> p2
  sc -.-> p3
  p3 --> g6
  m1 & m2 --> g1
  t1 & t2 & t3 & t4 --> g2
  c1 & c2 & c4 --> g3
  c3 --> g4
  m3 --> g5
  class s1 k_start
  class sc,m1,m2,m3,t1,t2,t3,t4,c1,c2,c3,c4,c5,hub2,hub k_screen
  class p1,p2,p3 k_process
  class g1,g2,g3,g4,g5,g6 k_goto
  style gTop fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gTiles fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCards fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Period and payer menus

The two menus at the top right change every figure on the page and in the monthly report. They are the only filters. There is no date picker and no search.

Route: `/analytics`

Demo only: other periods and payers are worked out from the same invented tables, so they drift a little from this quarter.

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
  s1@{ shape: stadium, label: "On Analytics, look at the two menus" }
  sc@{ shape: curv-trap, label: "<b>Menus 'This quarter' and 'All payers'</b><br/>Both read as plain pills until you change them" }
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
  k1@{ shape: lean-r, label: "<b>Keyboard in either menu</b><br/>Arrow keys move, Enter picks, Esc closes" }
  k2@{ shape: trap-t, label: "Click anywhere outside an open menu" }
  p1@{ shape: rect, label: "Menu closes, value unchanged" }
  r1@{ shape: rect, label: "Page recomputes at once from the period and the payer" }
  r2@{ shape: rect, label: "<b>Subtitles use the period: 'this quarter', 'last quarter' or 'the last 12 months'</b><br/>Counts scale: last quarter about 0.96, last 12 months about 3.9 times" }
  r4@{ shape: rect, label: "<b>The denial outcomes follow the menus too</b><br/>Rulings, accepted denials and dismissals recorded in this demo count in 'This quarter' and 'Last 12 months', not in 'Last quarter'<br/>One payer: only that payer's" }
  r3@{ shape: rect, label: "<b>One payer: the bars show that payer against 'All payers'</b><br/>The denial table lists all of that payer's reasons<br/>'What helps most' is re-weighted for that payer" }
  q1@{ shape: diam, label: "Is a figure built on 20 or more decisions?" }
  ok@{ shape: curv-trap, label: "The number shows, for example 86%" }
  hid@{ shape: curv-trap, label: "<b>Tile shows '-' with 'Not enough decisions yet'</b><br/>A card shows 'Not enough decisions yet. Figures based on fewer than 20 decisions stay hidden.'" }
  ex@{ shape: odd, label: "<b>Example: 'Lakeshore Behavioral' and 'This quarter'</b><br/>'Top denial cause' and 'Advice taken works' are hidden, as are the table and the list" }
  p3@{ shape: rect, label: "<b>Nothing goes into the address</b><br/>Leaving and returning resets to 'This quarter' and 'All payers'" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Monthly report › Open and build" }
  e1@{ shape: stadium, label: "Page matches the two menus" }
  s1 --> sc
  sc --> c1 --> o1 --> i1 --> r1
  sc --> c2 --> o2 --> i2 --> r1
  i2 --> p2
  o1 & o2 --> k1
  o1 & o2 --> k2 --> p1
  k1 --> r1
  r1 --> r2 --> q1
  r1 --> r4 --> q1
  r1 --> r3
  r3 --> q1
  q1 -->|"Yes"| ok --> e1
  q1 -->|"No"| hid --> ex --> e1
  r1 -.-> p3
  r1 -.-> g1
  class s1 k_start
  class sc,ok,hid k_screen
  class c1,c2,k2 k_click
  class o1,o2 k_overlay
  class i1,i2,k1 k_input
  class p2,p1,r1,r2,r4,r3,p3 k_process
  class q1 k_decision
  class ex k_toast
  class g1 k_goto
  class e1 k_end
  style gPeriod fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gPayer fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › The four tiles

Four tinted tiles, each with a big number, a label and two small lines: what the number means, and how many decisions, denials, requests or drafts are behind it. The tiles are not buttons.

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
  s1@{ shape: stadium, label: "Read the row of four tiles" }
  sc@{ shape: curv-trap, label: "<b>Each tile</b><br/>Big number, label in capitals, a meaning line, then 'N decisions · this quarter'" }
  subgraph gA ["'Approved as asked' (green)"]
  a1@{ shape: curv-trap, label: "<b>71%</b><br/>'▲ 6 pts vs last quarter'<br/>'1,070 decisions · this quarter'" }
  a2@{ shape: rect, label: "<b>Share of decisions approved as asked in the period</b><br/>One payer: that payer's own rate" }
  a3@{ shape: diam, label: "Change against the period before?" }
  a4@{ shape: odd, label: "'▲ 6 pts vs last quarter' (up, 'pt' for one point)" }
  a5@{ shape: odd, label: "'▼ 2 pts vs last quarter' (down)" }
  a6@{ shape: odd, label: "'No change vs last quarter'" }
  end
  subgraph gB ["'Top denial cause' (red)"]
  b1@{ shape: curv-trap, label: "<b>29%</b><br/>'Thin continued-stay evidence'<br/>'311 denials · this quarter'" }
  b2@{ shape: rect, label: "<b>Share of denials held by the biggest reason listed in the denial table</b><br/>The line is a short name of that reason" }
  end
  subgraph gC ["'Advice taken works' (amber)"]
  c1@{ shape: curv-trap, label: "<b>84%</b><br/>'Approved when applied'<br/>'828 requests · this quarter'" }
  c2@{ shape: rect, label: "Share approved among requests where the agents' advice was applied" }
  end
  subgraph gD ["'Sent without edits' (grey)"]
  d1@{ shape: curv-trap, label: "<b>75%</b><br/>'As written, or a typo fixed'<br/>'966 drafts · this quarter'" }
  d2@{ shape: rect, label: "Share of agent drafts sent as written, or with a typo fixed" }
  end
  q1@{ shape: diam, label: "Fewer than 20 behind the figure?" }
  h1@{ shape: curv-trap, label: "<b>Number becomes '-'</b><br/>Meaning line reads 'Not enough decisions yet'<br/>The count line stays, for example '17 requests · this quarter'" }
  ok@{ shape: curv-trap, label: "The number and its lines show as usual" }
  p1@{ shape: rect, label: "<b>Tiles do nothing when clicked or hovered</b><br/>Unlike the Eligibility tiles, they are not filters" }
  e1@{ shape: stadium, label: "To change a tile, change the period or payer menu" }
  e2@{ shape: stadium, label: "Figures read" }
  s1 --> sc
  sc --> a1 & b1 & c1 & d1
  a1 --> a2 --> a3
  a3 -->|"Up"| a4
  a3 -->|"Down"| a5
  a3 -->|"Same"| a6
  b1 --> b2
  c1 --> c2
  d1 --> d2
  a4 & a5 & a6 & b2 & c2 & d2 --> q1
  q1 -->|"Yes"| h1 --> e2
  q1 -->|"No"| ok --> e2
  sc -.-> p1 --> e1
  class s1 k_start
  class sc,a1,b1,c1,d1,h1,ok k_screen
  class a2,b2,c2,d2,p1 k_process
  class a3,q1 k_decision
  class a4,a5,a6 k_toast
  class e1 k_endx
  class e2 k_end
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gC fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gD fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Read-only cards: payers, draft edits, what helps most

Three cards you read but cannot click: the payer bars, the draft-edit donut and the ranked list of what helps most. There are no tooltips on hover and nothing opens on a click. They change only with the period and payer menus.

Route: `/analytics`

Demo only: 'not enough decisions' on the bars and the donut cannot happen with the demo's numbers. On 'What helps most' it can, for one payer.

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
  b1@{ shape: curv-trap, label: "<b>'Approved as asked, this quarter'</b><br/>Bars, best first: Lakeshore 86%, Beacon PPO 81%, Harborview MA 77%, Summit Medicaid 74%, Evergreen 69%, Cardinal 63%" }
  b2@{ shape: diam, label: "Rate band?" }
  b3@{ shape: rect, label: "80 and above: green bar" }
  b4@{ shape: rect, label: "55 to 79: ochre bar" }
  b5@{ shape: rect, label: "Below 55: terracotta bar" }
  b6@{ shape: curv-trap, label: "Footnote '1,070 decisions this quarter. Green is 80 and above, ochre 55 to 79, terracotta below 55.'" }
  b7@{ shape: diam, label: "A payer is chosen in the menu?" }
  b8@{ shape: rect, label: "Two bars: that payer, then 'All payers' for comparison" }
  end
  subgraph gEdit ["Draft edits"]
  d1@{ shape: curv-trap, label: "<b>'Share of drafts, this quarter'</b><br/>Donut with '68%' and 'as written' in the middle" }
  d2@{ shape: curv-trap, label: "<b>Legend</b><br/>'Sent as written' 68% · approved 89% of the time<br/>'Light edits' 27% · approved 76%<br/>'Rewritten' 5% · approved 45%" }
  d3@{ shape: curv-trap, label: "'966 drafts this quarter.'" }
  d4@{ shape: diam, label: "<b>Fewer than 20 drafts?</b><br/>(no demo view gets here)" }
  d5@{ shape: curv-trap, label: "'Not enough decisions yet. Figures based on fewer than 20 decisions stay hidden.'" }
  end
  subgraph gHelp ["What helps most"]
  h1@{ shape: curv-trap, label: "'Steps taken most often, and how often those requests were approved'" }
  h2@{ shape: curv-trap, label: "<b>Up to four rows, ranked 1 to 4</b><br/>Step name, 'Applied 389 times', '91% approved' in green" }
  h3@{ shape: rect, label: "Top four this quarter: dated depression scores 91%, appeal partial unit approvals 88%, name the step-down provider 85%, file recertification 72 hours early 83%" }
  h4@{ shape: diam, label: "Any step applied 20 or more times for this payer?" }
  h5@{ shape: curv-trap, label: "'Not enough decisions yet. Figures based on fewer than 20 decisions stay hidden.'" }
  end
  p1@{ shape: rect, label: "Hover and click do nothing on bars, donut slices, legend and list rows" }
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
  h1 --> h2 --> h3 --> h4
  h4 -->|"Yes"| e1
  h4 -->|"No"| h5 --> e1
  s1 -.-> p1 --> e2
  class s1 k_start
  class b1,b6,d1,d2,d3,d5,h1,h2,h5 k_screen
  class b2,b7,d4,h4 k_decision
  class b3,b4,b5,b8,h3,p1 k_process
  class e1 k_end
  class e2 k_endx
  style gBars fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gEdit fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gHelp fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Common denial reasons: open Denial Intelligence

The table of common denial reasons. Every row is a link to Denial Intelligence, by the row or by the reason text. The link carries the row's payer and its reason, so the denial list opens already narrowed to those denials.

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
  s1@{ shape: stadium, label: "Scroll to 'Common denial reasons by payer'" }
  sc@{ shape: curv-trap, label: "<b>Card 'Common denial reasons by payer'</b><br/>'This quarter · 311 denials in the reasons listed. Select a row to open those denials in Denial Intelligence.'" }
  th@{ shape: curv-trap, label: "<b>Columns</b><br/>'Reason', 'Payer', 'Count', 'Share of denials' (a red bar and the percent)" }
  q1@{ shape: diam, label: "Which payer is chosen in the menu?" }
  p1@{ shape: rect, label: "<b>'All payers': one row per payer, its most common reason</b><br/>Biggest first" }
  r1@{ shape: curv-trap, label: "<b>Cardinal 89 · 29%</b><br/>'Continued-stay evidence incomplete'" }
  r2@{ shape: curv-trap, label: "<b>Harborview MA 74 · 24%</b><br/>'Recertification filed too late'" }
  r3@{ shape: curv-trap, label: "<b>Evergreen 61 · 20%</b><br/>'Partial approval without a stated reason'" }
  r4@{ shape: curv-trap, label: "<b>Summit Medicaid 48 · 15%</b><br/>Beacon PPO 39 · 13%" }
  p2@{ shape: rect, label: "<b>A payer with fewer than 20 listed denials is left out</b><br/>Lakeshore this quarter and last quarter" }
  p3@{ shape: rect, label: "<b>One payer: all of that payer's reasons, three or four rows</b><br/>Shares add up to 100% of the listed denials" }
  q2@{ shape: diam, label: "Fewer than 20 denials listed?" }
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

What other screens write back to Analytics. Two figures sit under the denial table and move when a denial is accepted or an appeal is ruled on. A card of dismissal reasons appears once a recommendation has been dismissed. Each event moves the numbers only a little.

Route: `/analytics`

Demo only: the starting figures (96 rulings, 56% overturned, 17 accepted denials, $88.7K) are invented. Everything recorded in the demo counts in 'This quarter' and 'Last 12 months', never in 'Last quarter', and follows the payer menu.

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
  s1@{ shape: stadium, label: "Scroll to the foot of 'Common denial reasons by payer'" }
  sc@{ shape: curv-trap, label: "<b>Two figures under the table</b><br/>'Appeals overturned'  56%, '54 of 96 rulings this quarter'<br/>'Written off after accepted denials'  $88.7K, '17 denials this quarter'" }
  subgraph gApp ["Appeals overturned"]
  x1@{ shape: st-rect, label: "<b>The payer rules on an appeal</b><br/>(demo: the person logs the ruling)" }
  st1@{ shape: cyl, label: "<b>Denial Intelligence records the ruling</b><br/>Overturned, partly restored or upheld" }
  p1@{ shape: rect, label: "<b>Rulings go up by one</b><br/>Overturned and partly restored also add to 'overturned'<br/>Upheld only adds to the rulings" }
  q1@{ shape: diam, label: "Fewer than 20 rulings in this view?" }
  o1@{ shape: curv-trap, label: "For example 57%, '55 of 97 rulings this quarter'" }
  o2@{ shape: curv-trap, label: "<b>'-' and 'Not enough decisions yet'</b><br/>A single payer with few rulings, for example Lakeshore" }
  end
  subgraph gOff ["Written off"]
  k1@{ shape: trap-t, label: "In Denial Intelligence the person accepts a denial" }
  st2@{ shape: cyl, label: "<b>Denial Intelligence records the write-off</b><br/>With the payer and the dollars at stake" }
  p2@{ shape: rect, label: "<b>Denials go up by one</b><br/>The amount is added, for example $22.4K makes $88.7K into $111.1K" }
  o3@{ shape: curv-trap, label: "'$111.1K', '18 denials this quarter'" }
  end
  subgraph gDis ["Why recommendations were dismissed"]
  k2@{ shape: trap-t, label: "On a case, the person dismisses a recommendation and gives a reason" }
  st3@{ shape: cyl, label: "<b>Authorizations records the reason</b><br/>With the request, so Analytics can find its payer" }
  q2@{ shape: diam, label: "Any dismissal in this view?" }
  d1@{ shape: curv-trap, label: "<b>Card 'Why recommendations were dismissed'</b><br/>'The reason given each time someone dismissed a recommendation, this quarter'<br/>One row per reason, biggest first, '2 times' or '1 time'" }
  d2@{ shape: curv-trap, label: "<b>No card at all</b><br/>Nothing was dismissed, or the period is 'Last quarter', or the payer has none" }
  end
  m1@{ shape: rect, label: "<b>The monthly report and its printout carry the same figures</b><br/>'Denial outcomes' always, 'Why recommendations were dismissed' when the card shows" }
  m2@{ shape: rect, label: "<b>Pick another period or payer</b><br/>The figures are worked out again from the recorded events" }
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

## Analytics › Monthly report › Open and build

'Monthly report' opens a small window where the Analyst agent builds the report in four short steps, about 3 seconds. Cancel, Close, Escape and a click outside all stop it. Closing throws the build away.

Route: `/analytics`

Demo only: the steps are a timer, 0.75 seconds each. The report is built from the period and payer chosen when the window opened. Escape closes the window, and a menu opened beforehand closes first, one press each.

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
  o1@{ shape: win-pane, label: "<b>Window 'Monthly report'</b><br/>Subtitle 'This quarter · All payers'<br/>'Built by' Analyst<br/>Button 'Cancel' in the footer" }
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

Demo only: the files hold exactly the figures on the page, and are named from the period and payer, for example psyflo-monthly-report-quarter-all.md.

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
  pp@{ shape: rect, label: "<b>The browser's print window opens</b><br/>It prints a plain page of the report: title, period, scope and every section<br/>Not the sidebar, the menus or the window" }
  pq@{ shape: rect, label: "<b>Cancel or Print in the browser window</b><br/>The report window stays open" }
  q1@{ shape: diam, label: "<b>Is this the hosted preview?</b><br/>(the host page blocks downloads and printing)" }
  t1@{ shape: odd, label: "<b>'Download is off in this preview'</b><br/>'Open the single-file version of the demo to use it.'" }
  p0@{ shape: rect, label: "<b>No file is made and no second toast</b><br/>The window stays open" }
  subgraph gFile ["In the single-file demo"]
  f1@{ shape: doc, label: "<b>Markdown file</b><br/>psyflo-monthly-report-quarter-all.md" }
  f2@{ shape: doc, label: "<b>CSV file</b><br/>psyflo-monthly-report-quarter-all.csv" }
  p1@{ shape: rect, label: "Browser saves the file to the person's computer" }
  t2@{ shape: odd, label: "<b>'Report downloaded'</b><br/>'psyflo-monthly-report-quarter-all.md has the figures you see on this page.'" }
  p2@{ shape: rect, label: "Window stays open, so the other file can be saved too" }
  end
  n1@{ shape: rect, label: "Name pattern: psyflo-monthly-report, then the period (quarter, last_quarter, year), then the payer (all or cardinal, summit ...)" }
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

The two downloaded files and the printed page are built from the same numbers as the page, for the period and payer chosen when the window opened. A figure behind fewer than 20 decisions is written as 'Not enough decisions yet', never as a number.

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
  m1@{ shape: doc, label: "<b>'# Psyflo monthly report'</b><br/>'Period: This quarter' and 'Scope: All payers'<br/>'Built by Analyst from demo data. A figure based on fewer than 20 decisions is left out.'" }
  m2@{ shape: doc, label: "<b>'## Headline figures'</b><br/>Four bullets: approved as asked with the trend line, top denial cause, advice taken works, sent without edits" }
  m3@{ shape: doc, label: "<b>'## Approval rate by payer'</b><br/>One bullet per bar with its decisions" }
  m4@{ shape: doc, label: "<b>'## How people edit agent drafts'</b><br/>Three bullets, then 'Drafts counted'" }
  m5@{ shape: doc, label: "<b>'## Common denial reasons'</b><br/>Table: Reason, Payer, Count, Share of denials" }
  m7@{ shape: doc, label: "<b>'## Denial outcomes'</b><br/>'Appeals overturned: 56% (54 of 96 rulings, partly restored counts as overturned)'<br/>'Written off after accepted denials: $88.7K (17 denials)'" }
  m6@{ shape: doc, label: "<b>'## What helps most'</b><br/>Numbered list: step, times applied, percent approved" }
  m8@{ shape: doc, label: "<b>'## Why recommendations were dismissed'</b><br/>One bullet per reason with its count<br/>Left out when nobody dismissed one" }
  end
  subgraph gCsv ["Figures as a table (.csv)"]
  v1@{ shape: doc, label: "<b>One header row</b><br/>period, scope, section, label, value_percent, count" }
  v2@{ shape: doc, label: "<b>Rows by section</b><br/>headline, approval by payer, draft edits, denial reasons, denial outcomes, what helps most<br/>and 'dismissed recommendations' when there are any" }
  v3@{ shape: doc, label: "<b>Commas and quotes inside a value are wrapped in quotes</b><br/>Opens in a spreadsheet" }
  end
  q1@{ shape: diam, label: "Is the figure behind 20 or more decisions?" }
  p1@{ shape: rect, label: "The number is written" }
  p2@{ shape: rect, label: "<b>'Not enough decisions yet' is written in its place</b><br/>The count is kept" }
  p3@{ shape: rect, label: "Same view as the page: the same period and payer, the same hidden figures" }
  e1@{ shape: stadium, label: "File matches the screen" }
  s1 --> m1 & v1
  m1 --> m2 --> m3 --> m4 --> m5 --> m7 --> m6 --> m8
  v1 --> v2 --> v3
  m8 --> q1
  v3 --> q1
  q1 -->|"Yes"| p1 --> e1
  q1 -->|"No"| p2 --> e1
  s1 -.-> p3
  p3 -.-> e1
  class s1 k_start
  class m1,m2,m3,m4,m5,m7,m6,m8,v1,v2,v3 k_doc
  class q1 k_decision
  class p1,p2,p3 k_process
  class e1 k_end
  style gMd fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCsv fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```
