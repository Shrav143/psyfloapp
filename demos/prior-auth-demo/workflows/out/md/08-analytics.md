# Analytics

Owner view: approval and denial trends, the payer scorecard, payer by case-mix, denial reasons, case-level drill-down and the monthly report.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/08-analytics/`.

## Analytics › Arrive and read the page

One page for the clinic owner. It opens on 'This quarter', 'All payers', 'All programs', 'All diagnosis groups' and the site view chosen in the top bar. From the top it shows six headline figures, the trend by month, the payer scorecard, the payer by case mix grid, the denial reasons and, for someone who sees both sites, the Site A and Site B comparison. Detail is folded under 'Detailed breakdowns'. Every number opens the cases behind it in a right-hand panel.

Route: `/analytics`

Demo only: this is sample data. The records are generated, the same every time. This quarter, Both sites, all payers is the fixed starting set (1,070 decisions, 71% approved as requested, 311 denials, 207 preventable, 2.4 days, 56% of 96 appeals overturned). No figure is a dollar amount.

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
  sc@{ shape: curv-trap, label: "<b>Analytics</b><br/>'Where approvals are won and lost, by payer and by kind of case.'<br/>One quiet note: 'Demo values: this is sample data. ...'" }
  subgraph gTop ["Header and filters"]
  m3@{ shape: curv-trap, label: "Button 'Monthly report'" }
  m1@{ shape: curv-trap, label: "<b>Four menus: 'This quarter', 'All payers', 'All programs', 'All diagnosis groups'</b><br/>'Clear filters' once one is picked<br/>'Site view: Both sites' follows the top bar switch" }
  end
  subgraph gFig ["Six headline figures, each with 12 months beside it"]
  t1@{ shape: curv-trap, label: "<b>'Approval rate' 71% · 'First-pass approval'</b><br/>'Denial rate' 29% · 'Preventable denials' 207" }
  t2@{ shape: curv-trap, label: "<b>'Average decision time' 2.4 days, with the share past the CMS time</b><br/>'Appeals overturned' 56%" }
  end
  subgraph gCards ["Cards, top to bottom"]
  c1@{ shape: curv-trap, label: "<b>'Approvals and denials by month'</b><br/>Rate or Count" }
  c2@{ shape: curv-trap, label: "<b>'Payer scorecard'</b><br/>One row per payer and an 'All payers' row" }
  c3@{ shape: curv-trap, label: "<b>'Payer by case mix'</b><br/>A grid of approval rates, with four tabs" }
  c4@{ shape: curv-trap, label: "<b>'Denial reasons'</b><br/>Pareto, preventable donut, reasons by diagnosis group" }
  c5@{ shape: curv-trap, label: "<b>'Site A and Site B'</b><br/>Only for someone who sees both sites" }
  end
  subgraph gDetail ["'Detailed breakdowns' (all folded, one summary line each)"]
  d1@{ shape: curv-trap, label: "<b>'Length of stay and units'</b><br/>'Process health'" }
  d2@{ shape: curv-trap, label: "<b>'Common denial reasons by payer'</b><br/>'How FLO's advice and drafts perform'<br/>'What helps most'" }
  end
  p1@{ shape: rect, label: "<b>Every figure, chart, table and list is worked out from one set of case records</b><br/>So a number and the cases behind it always agree<br/>A figure behind fewer than 20 decisions shows a dash" }
  p2@{ shape: rect, label: "<b>Every number follows the site view</b><br/>A one-site viewer such as Dr. Rivera sees only that site, and no comparison card<br/>Site A plus Site B always equals Both sites" }
  p3@{ shape: rect, label: "<b>Other screens feed this page</b><br/>Appeal rulings and accepted denials from Denial Intelligence<br/>Dismissed recommendations from Authorizations<br/>Open requests on the Dashboard (the live workload)" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Filters and the site view" }
  g2@{ shape: subproc, label: "Continues in: Analytics › Headline figures" }
  g3@{ shape: subproc, label: "Continues in: Analytics › Trend by month" }
  g4@{ shape: subproc, label: "Continues in: Analytics › Payer scorecard" }
  g5@{ shape: subproc, label: "Continues in: Analytics › Payer by case mix" }
  g6@{ shape: subproc, label: "Continues in: Analytics › Denial reasons" }
  g7@{ shape: subproc, label: "Continues in: Analytics › Site comparison" }
  g8@{ shape: subproc, label: "Continues in: Analytics › Detailed breakdowns" }
  g9@{ shape: subproc, label: "Continues in: Analytics › Monthly report › Open and build" }
  s1 --> sc
  sc --> m3 & m1
  m1 --> t1 & t2
  t1 & t2 --> c1 --> c2 --> c3 --> c4 --> c5 --> d1 & d2
  sc -.-> p1
  sc -.-> p2
  sc -.-> p3
  m1 --> g1
  t1 & t2 --> g2
  c1 --> g3
  c2 --> g4
  c3 --> g5
  c4 --> g6
  c5 --> g7
  d1 & d2 --> g8
  m3 --> g9
  class s1 k_start
  class sc,m3,m1,t1,t2,c1,c2,c3,c4,c5,d1,d2 k_screen
  class p1,p2,p3 k_process
  class g1,g2,g3,g4,g5,g6,g7,g8,g9 k_goto
  style gTop fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gFig fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCards fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gDetail fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Filters and the site view

Four menus (Period, Payer, Program, Diagnosis group) and the site view narrow every figure, chart, table and panel at once. The site view is not a menu here: it is the Both sites, Site A, Site B switch in the top bar, shown on the page as a label.

Route: `/analytics`

The choices are not kept in the address, so a refresh or Back resets them. The menus and the site switch never change the starting numbers: with the defaults, the page is the fixed set of 1,070 decisions.

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
  s1@{ shape: stadium, label: "Click a menu: 'This quarter' (Period), 'All payers', 'All programs' or 'All diagnosis groups'" }
  o1@{ shape: win-pane, label: "<b>Menu opens</b><br/>Period: This quarter, Last quarter, Last 12 months<br/>Payer: all payers and the six payers<br/>Program: Residential 3.5, IOP, PHP, Detox<br/>Diagnosis group: the six groups" }
  k1@{ shape: lean-r, label: "<b>Arrow keys move, Enter picks, Escape closes</b><br/>Click outside also closes" }
  c1@{ shape: trap-t, label: "Pick an option" }
  p1@{ shape: rect, label: "<b>The page recomputes from the case records</b><br/>Headline figures, month trend, scorecard, grid, reasons, length of stay, process health, site comparison and the detailed sections all follow<br/>A panel that is open uses the same choices" }
  sc@{ shape: curv-trap, label: "<b>The menu pill turns green and bold when a payer, program or diagnosis group is picked</b><br/>'Clear filters' appears" }
  c2@{ shape: trap-t, label: "Click 'Clear filters'" }
  p2@{ shape: rect, label: "<b>Payer, program and diagnosis group return to 'All'</b><br/>The period stays" }
  subgraph gSite ["Site view"]
  c3@{ shape: trap-t, label: "Top bar: 'Both sites', 'Site A' or 'Site B'" }
  p3@{ shape: rect, label: "<b>The label 'Site view: Both sites' changes</b><br/>Every number counts only the sites in view<br/>'Site A and Site B' card shows only for Both sites" }
  r1@{ shape: curv-trap, label: "<b>A one-site viewer (Dr. Rivera: Site A only)</b><br/>The top bar shows a lock instead of a switch<br/>The label says 'Site view: Site A'" }
  end
  q1@{ shape: diam, label: "Any decisions in view?" }
  e1@{ shape: curv-trap, label: "'No decisions match these filters in Site A. Clear filters or pick another period.'" }
  q2@{ shape: diam, label: "20 or more decisions behind a figure?" }
  h1@{ shape: curv-trap, label: "<b>The figure shows a dash</b><br/>Its line says how many decisions or rulings it rests on" }
  e2@{ shape: stadium, label: "Page shows the narrowed view" }
  s1 --> o1
  o1 --> k1
  o1 --> c1 --> p1 --> sc --> q1
  sc --> c2 --> p2 --> p1
  c3 --> p3 --> p1
  p3 -.-> r1
  q1 -->|"No"| e1
  q1 -->|"Yes"| q2
  q2 -->|"No"| h1 --> e2
  q2 -->|"Yes"| e2
  class s1 k_start
  class o1 k_overlay
  class k1 k_input
  class c1,c2,c3 k_click
  class p1,p2,p3 k_process
  class sc,r1,e1,h1 k_screen
  class q1,q2 k_decision
  class e2 k_end
  style gSite fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Headline figures

Six figures sit under the filters. Each one has a label, the number, the change against the earlier period in words and an arrow, a line that says what it counts, twelve months of sparkline, and an info button. The figure is a button: it opens the cases it counts.

Route: `/analytics`

Demo only: average decision time is sample data. The change for 'Last 12 months' compares the last 6 months with the 6 before, and the figure says so.

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
  s1@{ shape: stadium, label: "Read the row of six figures under the filters" }
  a1@{ shape: curv-trap, label: "<b>'Approval rate' 71%</b><br/>'+5 pts vs last quarter'<br/>'759 of 1,070 approved as requested'" }
  a2@{ shape: curv-trap, label: "<b>'Denial rate' 29%</b><br/>'311 denials · 17 accepted'" }
  a3@{ shape: curv-trap, label: "<b>'First-pass approval'</b><br/>Approved as requested with no information request" }
  a4@{ shape: curv-trap, label: "<b>'Average decision time' 2.4 days</b><br/>'8% past the CMS time at Medicaid plans (67 of 802)'" }
  a5@{ shape: curv-trap, label: "<b>'Preventable denials' 207</b><br/>'67% of 311 denials'" }
  a6@{ shape: curv-trap, label: "<b>'Appeals overturned' 56%</b><br/>'54 of 96 rulings · 17 denials accepted'" }
  p1@{ shape: rect, label: "<b>Each change compares this quarter with last quarter, last quarter with the one before, or the last 6 months with the 6 before for 'Last 12 months'</b><br/>Green words mean better, red worse, grey neither" }
  p2@{ shape: rect, label: "<b>Sparkline: one value for each of the last 12 months</b><br/>Appeals use the 3 months up to each month, because one month holds too few rulings" }
  subgraph gInfo ["Info button on each figure"]
  i1@{ shape: trap-t, label: "Hover or Tab to the info icon" }
  i2@{ shape: win-pane, label: "<b>A short definition</b><br/>CMS decision time: 72 hours expedited, 7 calendar days standard, from 2026, Medicaid managed care plans, 'Check your state.'" }
  i3@{ shape: lean-r, label: "Escape or moving away closes it" }
  end
  c1@{ shape: trap-t, label: "Click a figure" }
  p3@{ shape: rect, label: "<b>Opens the case list panel for the cases that figure counts</b><br/>Approval rate: approved as requested<br/>Denial rate: denied or approved in part<br/>First-pass: approved with no information request<br/>Decision time: all decisions, slowest first<br/>Preventable: preventable denials<br/>Appeals: appeals the payer ruled on" }
  q1@{ shape: diam, label: "Fewer than 20 decisions behind it?" }
  h1@{ shape: curv-trap, label: "<b>The figure shows a dash</b><br/>The line below says what it rests on" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Case list panel" }
  e1@{ shape: stadium, label: "Figure read" }
  s1 --> a1 & a2 & a3 & a4 & a5 & a6
  a1 & a2 & a3 & a4 & a5 & a6 --> p1
  a1 --> p2
  a4 --> i1 --> i2 --> i3
  a1 & a2 & a3 & a4 & a5 & a6 --> q1
  q1 -->|"Yes"| h1 --> e1
  q1 -->|"No"| c1
  c1 --> p3 --> g1
  class s1 k_start
  class a1,a2,a3,a4,a5,a6,h1 k_screen
  class p1,p2,p3 k_process
  class i1,c1 k_click
  class i2 k_overlay
  class i3 k_input
  class q1 k_decision
  class g1 k_goto
  class e1 k_end
  style gInfo fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Trend by month

'Approvals and denials by month' draws the last twelve months. A month runs from the 21st to the 20th, so the last one ends on 20 Oct 2026. Hover for exact values, Tab into the chart and use the arrow keys, click a month to list its cases.

Route: `/analytics`

The chart has a fixed height, so the tooltip never moves the page. The months of the chosen period are shaded.

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
  s1@{ shape: stadium, label: "Scroll to 'Approvals and denials by month'" }
  sc@{ shape: curv-trap, label: "<b>Card with 'Rate' and 'Count' tabs</b><br/>Legend: 'Approved as requested', 'Denied or cut back'<br/>Gridlines and a percent axis<br/>The months of the period are shaded" }
  subgraph gMode ["Rate or Count"]
  m1@{ shape: trap-t, label: "Click 'Rate'" }
  r1@{ shape: curv-trap, label: "<b>Two lines: approval rate with a soft area, denial rate</b><br/>With a payer picked, a dashed line adds 'Clinic approval rate, all payers'" }
  m2@{ shape: trap-t, label: "Click 'Count'" }
  r2@{ shape: curv-trap, label: "<b>Stacked areas of decisions by month</b><br/>'Approved as requested', 'Approved in part', 'Denied'" }
  end
  subgraph gHover ["Hover and keyboard"]
  h1@{ shape: lean-r, label: "Move the pointer over the chart" }
  h2@{ shape: win-pane, label: "<b>Tooltip: '21 Sep to 20 Oct 2026'</b><br/>Each series and its exact value<br/>How many decisions in the month" }
  k1@{ shape: lean-r, label: "Tab to the chart, then Left, Right, Home or End" }
  k2@{ shape: rect, label: "<b>The point moves, the tooltip follows</b><br/>A screen reader hears the month and its values" }
  end
  c1@{ shape: trap-t, label: "Click a month (or press Enter on the focused chart)" }
  p1@{ shape: rect, label: "<b>Opens the case list panel for that month</b><br/>The payer, program and diagnosis filters apply, the period does not" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Case list panel" }
  d1@{ shape: trap-t, label: "Click 'View data table' (a button, so Tab and Enter work)" }
  d2@{ shape: curv-trap, label: "<b>A table of the twelve months: decisions, approved as requested, approved in part, denied, rates</b><br/>The button now reads 'Hide data table'" }
  s1 --> sc --> m1 & m2
  m1 --> r1
  m2 --> r2
  sc --> h1 --> h2
  sc --> k1 --> k2
  h2 & k2 --> c1 --> p1 --> g1
  sc --> d1 --> d2
  class s1 k_start
  class sc,r1,r2,d2 k_screen
  class m1,m2,c1,d1 k_click
  class h1,k1 k_input
  class h2 k_overlay
  class k2,p1 k_process
  class g1 k_goto
  style gMode fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gHover fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Payer scorecard

One row per payer for the chosen period, and an 'All payers' row at the bottom to compare with. A payer row opens the Payer analysis panel; a count inside a row opens its cases.

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
  s1@{ shape: stadium, label: "Scroll to 'Payer scorecard'" }
  sc@{ shape: curv-trap, label: "<b>Columns: 'Payer' (plan type), 'Decisions', 'Approval rate' with a small 12-month line, 'Denial rate', 'Approved in part', 'Average days', 'Past CMS time', 'Info requests', 'Appeals overturned', 'Trend'</b><br/>Lakeshore 86%, Beacon 81%, Harborview 77%, Summit 74%, Evergreen 69%, Cardinal 63%, All payers 71%" }
  p1@{ shape: rect, label: "<b>'Trend' is the change in approval rate against the earlier period, an arrow and 'pts'</b><br/>'Past CMS time' is 'n/a' for payers the CMS time does not apply to<br/>A figure under 20 decisions shows a dash<br/>With a payer picked, only that payer and 'All payers' show" }
  c1@{ shape: trap-t, label: "Click a payer row, or Tab to the payer name and press Enter" }
  p2@{ shape: rect, label: "<b>Opens the Payer analysis panel for that payer</b><br/>Focus returns to the row when it closes" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Payer analysis panel" }
  subgraph gCount ["Counts inside a row"]
  c2@{ shape: trap-t, label: "Click 'Approved in part', 'Past CMS time', 'Info requests' or 'Appeals overturned'" }
  p3@{ shape: rect, label: "<b>Opens the case list panel for that payer and figure</b><br/>The row does not open as well" }
  end
  g2@{ shape: subproc, label: "Continues in: Analytics › Case list panel" }
  p4@{ shape: rect, label: "<b>The 'All payers' row is the clinic's own average</b><br/>It is not clickable<br/>The footnote says payers are compared with the clinic, not with an outside benchmark" }
  e1@{ shape: stadium, label: "Scorecard read" }
  s1 --> sc --> p1
  sc --> c1 --> p2 --> g1
  sc --> c2 --> p3 --> g2
  sc -.-> p4 --> e1
  class s1 k_start
  class sc k_screen
  class p1,p2,p3,p4 k_process
  class c1,c2 k_click
  class g1,g2 k_goto
  class e1 k_end
  style gCount fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Payer analysis panel

A right-hand panel for one payer. It follows the period, program, diagnosis group and site view on the page, and every number in it is counted from that payer's own decisions. Top to bottom: six figures against the clinic, what the payer tends to do, its twelve months, where it approves and where it does not, why it denies, and the cases behind the numbers.

Route: `/analytics`

The panel stacks. A case list opens on top of it, and a case summary on top of that. Escape closes the top layer only.

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
  s1@{ shape: stadium, label: "A payer row on the scorecard, or a payer name in the grid, was opened" }
  o1@{ shape: win-pane, label: "<b>Panel: payer name, plan type, period, site view, number of decisions</b><br/>Button 'Copy summary'<br/>Close (X)" }
  a1@{ shape: curv-trap, label: "<b>Six figures: approval, denial, first-pass, average decision time, preventable, appeals</b><br/>Each with 'Clinic 71%' beside it and the change" }
  a2@{ shape: curv-trap, label: "<b>'What this payer tends to do'</b><br/>Three plain bullets worked out from the decisions, for example 'Cuts continued-stay days for opioid use disorder: approved 4.8 of 12.2 requested on average'" }
  a3@{ shape: curv-trap, label: "<b>'Approvals and denials by month'</b><br/>The payer's approval and denial lines and a dashed clinic line" }
  a4@{ shape: curv-trap, label: "<b>'Approval by diagnosis group'</b><br/>Bars with a tick for the clinic's rate, red under 55%<br/>'By program' and 'By request type'" }
  a5@{ shape: curv-trap, label: "<b>'Top denial reasons'</b><br/>Bars with a 'Preventable' tag and counts" }
  a6@{ shape: curv-trap, label: "<b>'The cases behind these numbers'</b><br/>Outcome tabs: All, Approved as requested, Approved in part, Denied<br/>Columns: Case, Patient, Diagnosis group, Program, Request, Site, Outcome, Reason, Days, Decided" }
  c1@{ shape: trap-t, label: "Click a figure, a bar or a reason" }
  p1@{ shape: rect, label: "Opens the case list panel for that payer and number" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Case list panel" }
  c2@{ shape: trap-t, label: "Click a month on the trend" }
  p2@{ shape: rect, label: "Opens the case list panel for that month at this payer" }
  subgraph gTable ["The cases table"]
  t1@{ shape: trap-t, label: "Click a column heading" }
  t2@{ shape: rect, label: "<b>Sorts by it, again reverses</b><br/>The heading says its sort order to a screen reader" }
  t3@{ shape: trap-t, label: "Pick an outcome tab" }
  t4@{ shape: rect, label: "<b>Filters the table, the count line updates</b><br/>'No cases match. Pick another outcome.' when none" }
  t5@{ shape: trap-t, label: "Next or previous page" }
  t6@{ shape: rect, label: "15 cases a page, 'Page 2 of 6'" }
  end
  c3@{ shape: trap-t, label: "Click a case row or its id" }
  g2@{ shape: subproc, label: "Continues in: Analytics › Case summary panel" }
  b1@{ shape: trap-t, label: "Click 'Copy summary'" }
  b2@{ shape: rect, label: "<b>Copies the payer, period, figures, the three bullets and the top reasons</b><br/>Toast 'Payer summary copied'<br/>Marked as demo data" }
  k1@{ shape: lean-r, label: "Press Escape" }
  k2@{ shape: rect, label: "<b>Closes the top layer</b><br/>Focus returns to the control that opened the panel" }
  e1@{ shape: stadium, label: "Back on the page" }
  s1 --> o1 --> a1 --> a2 --> a3 --> a4 --> a5 --> a6
  a1 & a4 & a5 --> c1 --> p1 --> g1
  a3 --> c2 --> p2 --> g1
  a6 --> t1 --> t2
  a6 --> t3 --> t4
  a6 --> t5 --> t6
  a6 --> c3 --> g2
  o1 --> b1 --> b2
  o1 --> k1 --> k2 --> e1
  class s1 k_start
  class o1 k_overlay
  class a1,a2,a3,a4,a5,a6 k_screen
  class c1,c2,t1,t3,t5,c3,b1 k_click
  class p1,p2,t2,t4,t6,b2,k2 k_process
  class g1,g2 k_goto
  class k1 k_input
  class e1 k_end
  style gTable fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Payer by case mix

A grid with payers down and a kind of case across. Each cell is how often that payer approves that kind of case as requested, with how many decisions stand behind it. Four tabs change the columns. A cell opens its cases; a payer name opens the payer analysis.

Route: `/analytics`

A cell with fewer than 10 decisions is drawn grey with a dashed edge and the word 'few', so a small number is not read as a pattern. Color is never the only signal: a cell under 55% is striped with a down mark, a cell from 80% has an up mark, and every rate is printed.

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
  s1@{ shape: stadium, label: "Scroll to 'Payer by case mix'" }
  sc@{ shape: curv-trap, label: "<b>Tabs: 'Diagnosis group', 'Program', 'Request type', 'Population'</b><br/>Columns for diagnosis group: Alcohol use disorder, Opioid use disorder, Stimulant or other substance use, Depression or anxiety, Trauma-related, Co-occurring, 'All cases'<br/>A row for each payer and 'All payers'<br/>Legend: the color scale, 'Below 55%, striped', '80% and above', 'Fewer than 10 decisions'" }
  t1@{ shape: trap-t, label: "Click a tab" }
  t2@{ shape: rect, label: "The columns change: program (Residential 3.5, IOP, PHP, Detox), request type (Initial, Concurrent review, Reauthorization, Modification, Retrospective) or population (Adolescent, Adult, Dual-eligible, Pregnant or postpartum, First-time treatment, Prior admissions)" }
  subgraph gHover ["Hover or Tab to a cell"]
  h1@{ shape: lean-r, label: "Move over a cell or Tab to it" }
  h2@{ shape: win-pane, label: "Tooltip: payer and column, '53% approved as requested', '131 decisions', approved and not approved counts" }
  end
  c1@{ shape: trap-t, label: "<b>Click a cell (or press Enter on it)</b><br/>For example Cardinal and Opioid use disorder, 53% of 131" }
  p1@{ shape: rect, label: "<b>Opens the case list panel with exactly those 131 cases</b><br/>And their reasons" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Case list panel" }
  c2@{ shape: trap-t, label: "Click a payer name" }
  p2@{ shape: rect, label: "Opens the payer analysis panel" }
  g2@{ shape: subproc, label: "Continues in: Analytics › Payer analysis panel" }
  c3@{ shape: trap-t, label: "Click a column heading" }
  p3@{ shape: rect, label: "Opens the case list for that column across all payers" }
  d1@{ shape: trap-t, label: "Click 'View data table'" }
  d2@{ shape: curv-trap, label: "A table of rate and decisions for every cell" }
  p4@{ shape: rect, label: "In the default view Cardinal's weakest cells are opioid use disorder and co-occurring, concurrent reviews and, in the case list, thin continued-stay evidence" }
  s1 --> sc --> t1 --> t2
  sc --> h1 --> h2
  sc --> c1 --> p1 --> g1
  sc --> c2 --> p2 --> g2
  sc --> c3 --> p3 --> g1
  sc --> d1 --> d2
  p1 -.-> p4
  class s1 k_start
  class sc,d2 k_screen
  class t1,c1,c2,c3,d1 k_click
  class t2,p1,p2,p3,p4 k_process
  class h1 k_input
  class h2 k_overlay
  class g1,g2 k_goto
  style gHover fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Denial reasons

Why decisions were not approved as requested. A Pareto of the most common reasons with the preventable ones marked, a donut of preventable against not, the preventable denials by payer, and the reasons behind each diagnosis group. Every row, slice and bar opens its cases.

Route: `/analytics`

A denial is anything not approved as requested, so a cut in days or units counts. Preventable means the team could have fixed the documentation or the timing before sending: thin or missing documentation, late notice, an incomplete certification, a duplicate request.

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
  s1@{ shape: stadium, label: "Scroll to 'Denial reasons'" }
  sc@{ shape: curv-trap, label: "<b>'311 denials, 207 of them preventable (67%).'</b><br/>'Most common reasons': Continued-stay evidence incomplete 73 (23%), Partial approval without a stated reason 34, Units requested above criteria 34 ...<br/>A 'Preventable' tag and a striped bar on the preventable ones, a running share on the right, and a dashed line where 80% is reached<br/>'N other reasons' rolls up the rest" }
  d1@{ shape: curv-trap, label: "<b>Donut 'Preventable or not': 207 (67%) and 104 (33%), with a legend</b><br/>'Preventable denials by payer' bars" }
  d2@{ shape: curv-trap, label: "<b>'Reasons by diagnosis group'</b><br/>One bar for each group, split into four kinds: Documentation or evidence, Timing or notice, Level of care or days, Administrative<br/>The number is the group's denials" }
  c1@{ shape: trap-t, label: "Click a reason row, for example 'Continued-stay evidence incomplete'" }
  p1@{ shape: rect, label: "Opens the case list panel for those 73 cases" }
  q1@{ shape: diam, label: "Does the reason belong to one payer?" }
  l1@{ shape: curv-trap, label: "<b>The panel offers 'Open in Denial Intelligence'</b><br/>It carries the payer and the reason" }
  g1@{ shape: subproc, label: "Continues in: Denial Intelligence › Open denials list" }
  l2@{ shape: curv-trap, label: "<b>A reason two payers give, such as 'Recertification filed too late', lists both payers' cases</b><br/>No Denial Intelligence link" }
  c2@{ shape: trap-t, label: "Click a donut slice or its legend row" }
  p2@{ shape: rect, label: "Opens the preventable or not-preventable denials" }
  c3@{ shape: trap-t, label: "Click a payer bar" }
  p3@{ shape: rect, label: "Opens that payer's preventable denials" }
  c4@{ shape: trap-t, label: "Click a diagnosis group bar" }
  p4@{ shape: rect, label: "Opens that group's denials; hover a segment for its kind and count" }
  g2@{ shape: subproc, label: "Continues in: Analytics › Case list panel" }
  d3@{ shape: trap-t, label: "Click 'View data table' under a chart" }
  d4@{ shape: rect, label: "A table of the same numbers" }
  s1 --> sc --> d1 --> d2
  sc --> c1 --> p1 --> q1
  q1 -->|"Yes"| l1 --> g1
  q1 -->|"No"| l2
  l1 & l2 --> g2
  d1 --> c2 --> p2 --> g2
  d1 --> c3 --> p3 --> g2
  d2 --> c4 --> p4 --> g2
  sc --> d3 --> d4
  class s1 k_start
  class sc,d1,d2,l1,l2 k_screen
  class c1,c2,c3,c4,d3 k_click
  class p1,p2,p3,p4,d4 k_process
  class q1 k_decision
  class g1,g2 k_goto
```

## Analytics › Case summary panel

One payer decision in plain words, opened from a case table row. It shows who and what was asked, what the payer decided and why, what was done about it, and a short neutral timeline. Initials and age only.

Route: `/analytics`

Most cases are past cases with no page in the demo. The real ones link to their pages: the open denials (for example D-3318, D-3297, D-3306) and the approvals behind the Case Manager ledger. R-1042's earlier intensive outpatient authorization opens R-1042.

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
  s1@{ shape: stadium, label: "Click a row in a case table (payer panel or case list panel)" }
  o1@{ shape: win-pane, label: "<b>Panel on top of the others: case id, initials and age, payer</b><br/>Button 'Copy summary'" }
  a1@{ shape: curv-trap, label: "<b>Outcome: 'Approved as requested', 'Approved in part' or 'Denied'</b><br/>'7 of 14 days approved' with a bar<br/>The reason and a tag 'Preventable' or 'Not preventable', with one sentence on what that means" }
  a2@{ shape: curv-trap, label: "Facts: payer, program, request type, diagnosis group, population, site, decided date, time to decision, CMS decision time (within it, past it, or not applicable), more information asked or not" }
  a3@{ shape: curv-trap, label: "'What was done': peer-to-peer (no call, booked, changed the decision, stood), appeal (none, filed, overturned, partly restored, upheld), accepted or not" }
  a4@{ shape: curv-trap, label: "'Timeline': request sent, information requested, decision, peer-to-peer, appeal, accepted, each with a date" }
  q1@{ shape: diam, label: "Does the case exist in the demo?" }
  c1@{ shape: trap-t, label: "Click 'Open case'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  c2@{ shape: trap-t, label: "Click 'Open the denial' (a denial that is in Denial Intelligence)" }
  g2@{ shape: subproc, label: "Continues in: Denial Intelligence › Open denials list" }
  n1@{ shape: curv-trap, label: "'A past case: it has no page in this demo.' No link" }
  b1@{ shape: trap-t, label: "Click 'Copy summary'" }
  b2@{ shape: rect, label: "<b>Copies the case lines</b><br/>Toast 'Case summary copied'<br/>Marked as demo data" }
  k1@{ shape: lean-r, label: "Press Escape" }
  k2@{ shape: rect, label: "<b>Closes this layer only</b><br/>The panel below stays" }
  e1@{ shape: stadium, label: "Back on the list or the payer panel" }
  s1 --> o1 --> a1 --> a2 --> a3 --> a4 --> q1
  q1 -->|"Yes"| c1 --> g1
  q1 -->|"Yes"| c2 --> g2
  q1 -->|"No"| n1
  o1 --> b1 --> b2
  o1 --> k1 --> k2 --> e1
  class s1 k_start
  class o1 k_overlay
  class a1,a2,a3,a4,n1 k_screen
  class q1 k_decision
  class c1,c2,b1 k_click
  class g1,g2 k_goto
  class b2,k2 k_process
  class k1 k_input
  class e1 k_end
```

## Analytics › Case list panel

The cases behind one number. The same rows were counted to make the number, so the count in the panel always equals the number you clicked. Opened from a headline figure, a month on the trend, a grid cell, a reason, a scorecard count, a length of stay row, a process month or a site cell.

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
  s1@{ shape: stadium, label: "Click any number on the page" }
  o1@{ shape: win-pane, label: "<b>Panel: the title says what was clicked, for example 'Cardinal: Opioid use disorder'</b><br/>Subtitle: '131 cases · This quarter · Both sites', plus the filters in force<br/>Button 'Copy summary'" }
  a1@{ shape: curv-trap, label: "<b>Three counts: 'Approved as requested', 'Approved in part', 'Denied'</b><br/>'Most common reasons' when there are denials<br/>The cases table with outcome tabs, sorting and paging" }
  c1@{ shape: trap-t, label: "Click a case row" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Case summary panel" }
  q1@{ shape: diam, label: "Is it one payer's reason?" }
  c2@{ shape: trap-t, label: "Click 'Open in Denial Intelligence' (footer)" }
  g2@{ shape: subproc, label: "Continues in: Denial Intelligence › Open denials list" }
  b1@{ shape: trap-t, label: "Click 'Copy summary'" }
  b2@{ shape: rect, label: "<b>Copies the title, count, outcome counts and top reasons</b><br/>Toast 'List summary copied'" }
  k1@{ shape: lean-r, label: "Press Escape" }
  k2@{ shape: rect, label: "<b>Closes the top panel only</b><br/>Focus goes back to what was clicked" }
  q2@{ shape: diam, label: "Opened on top of a payer panel?" }
  e1@{ shape: curv-trap, label: "The payer panel shows again" }
  e2@{ shape: stadium, label: "Back on the page" }
  s1 --> o1 --> a1
  a1 --> c1 --> g1
  o1 --> q1
  q1 -->|"Yes"| c2 --> g2
  q1 -->|"No"| a1
  o1 --> b1 --> b2
  o1 --> k1 --> k2 --> q2
  q2 -->|"Yes"| e1
  q2 -->|"No"| e2
  class s1 k_start
  class o1 k_overlay
  class a1,e1 k_screen
  class c1,c2,b1 k_click
  class g1,g2 k_goto
  class q1,q2 k_decision
  class b2,k2 k_process
  class k1 k_input
  class e2 k_end
```

## Analytics › Length of stay and units

Days or units asked for against days or units approved, by payer and by level of care. It sits in a folded section under 'Detailed breakdowns'. A cut is an approval for less than was asked, so denied requests are not in the averages.

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
  s1@{ shape: stadium, label: "<b>Under 'Detailed breakdowns', click 'Length of stay and units'</b><br/>Or Tab to it and press Enter or Space" }
  sc@{ shape: curv-trap, label: "<b>Closed: one summary line, for example 'Cardinal approves 90% of the days or units it is asked for, the lowest of the payers in view. 58 of its approvals were cut.'</b><br/>Open: tabs 'All', 'Residential 3.5', 'IOP', 'PHP', 'Detox'" }
  t1@{ shape: trap-t, label: "Click 'All'" }
  a1@{ shape: curv-trap, label: "<b>One bar for each payer: the share of the requested days or units that were approved</b><br/>Red under 80%<br/>The line under the name: 'N approvals · N cut'" }
  t2@{ shape: trap-t, label: "Click a level of care, for example 'Residential 3.5'" }
  a2@{ shape: curv-trap, label: "<b>Two bars for each payer: average days requested (grey) and approved (green)</b><br/>IOP counts units, the others days" }
  c1@{ shape: trap-t, label: "Click a payer row" }
  p1@{ shape: rect, label: "<b>Opens the case list panel: 'Cardinal Health Plan: days and units requested and approved, Residential 3.5'</b><br/>Decisions that approved something, as requested or in part" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Case list panel" }
  d1@{ shape: trap-t, label: "Click 'View data table'" }
  d2@{ shape: curv-trap, label: "Payer, approvals, cut, requested and approved averages, share approved" }
  q1@{ shape: diam, label: "Any approvals in view?" }
  n1@{ shape: curv-trap, label: "'No approvals in this view.'" }
  e1@{ shape: stadium, label: "Section read" }
  s1 --> sc --> t1 --> a1
  sc --> t2 --> a2
  a1 & a2 --> q1
  q1 -->|"Yes"| c1 --> p1 --> g1
  q1 -->|"No"| n1 --> e1
  a1 --> d1 --> d2
  class s1 k_start
  class sc,a1,a2,d2,n1 k_screen
  class t1,t2,c1,d1 k_click
  class p1 k_process
  class g1 k_goto
  class q1 k_decision
  class e1 k_end
```

## Analytics › Process health

Four small charts and the live workload, in a folded section under 'Detailed breakdowns'. They show whether authorizations are being missed (retro-authorizations), how long a first request takes from referral to approval, how many decisions the payers make each month, and how peer-to-peer calls and appeals ended.

Route: `/analytics`

The charts follow the payer, program, diagnosis group, site view and period. The live workload card follows the site view, payer and program only, and changes when you answer a payer or accept a denial.

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
  s1@{ shape: stadium, label: "Under 'Detailed breakdowns', click 'Process health'" }
  sc@{ shape: curv-trap, label: "Closed: '8% of decisions were retro-authorizations (85). Referral to authorization takes 4.2 days lately.'" }
  a1@{ shape: curv-trap, label: "<b>'Retro-authorizations by month'</b><br/>Columns of requests made after care began, a sign that an authorization was missed" }
  a2@{ shape: curv-trap, label: "<b>'Referral to authorization'</b><br/>A line of average days from referral to the payer's decision on first requests" }
  a3@{ shape: curv-trap, label: "<b>'Workload: decisions by month'</b><br/>Stacked columns: approved as requested, approved in part, denied" }
  a4@{ shape: curv-trap, label: "<b>'Peer-to-peer calls and appeals'</b><br/>Bars: the reviewer changed the decision, the decision stood, booked; overturned, partly restored, upheld, no ruling yet" }
  a5@{ shape: curv-trap, label: "<b>'Requests on the Dashboard right now'</b><br/>'8 handled', '32 still open', a meter<br/>'Live: it changes when you answer a payer or accept a denial'" }
  c1@{ shape: trap-t, label: "Click a month column" }
  p1@{ shape: rect, label: "<b>Retro-authorizations: opens that month's retrospective requests</b><br/>Workload: opens that month's decisions" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Case list panel" }
  h1@{ shape: lean-r, label: "Hover or Tab to a chart and use the arrow keys" }
  h2@{ shape: rect, label: "A tooltip with the month's values; the month is read out" }
  d1@{ shape: trap-t, label: "Click 'View data table' under a chart" }
  d2@{ shape: rect, label: "A table of the same numbers" }
  p2@{ shape: rect, label: "<b>The workload card reads the Dashboard's requests and the site view</b><br/>It is the only part that moves while the demo runs" }
  s1 --> sc --> a1 & a2 & a3 & a4 & a5
  a1 & a3 --> c1 --> p1 --> g1
  a1 & a2 & a3 --> h1 --> h2
  a1 & a2 & a3 & a4 --> d1 --> d2
  a5 --> p2
  class s1 k_start
  class sc,a1,a2,a3,a4,a5 k_screen
  class c1,d1 k_click
  class p1,h2,d2,p2 k_process
  class g1 k_goto
  class h1 k_input
```

## Analytics › Site comparison

'Site A and Site B' puts the headline figures of the two sites side by side, for the same period and filters. It shows only when the viewer sees both sites and the site view is Both sites.

Route: `/analytics`

Counts add up: Site A plus Site B equals Both sites on every count. A one-site viewer (Dr. Rivera: Site A only, Sam Okafor: Site B only) never sees the card, and every number on the page counts that site only.

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
  s1@{ shape: stadium, label: "Scroll below the denial reasons" }
  q1@{ shape: diam, label: "Does the viewer see both sites, with 'Both sites' chosen?" }
  n1@{ shape: curv-trap, label: "<b>No card</b><br/>A click on 'Site A' or 'Site B' in the top bar hides it<br/>A one-site viewer never has it" }
  a1@{ shape: curv-trap, label: "<b>'Site A and Site B'</b><br/>'Counts add up: 598 + 472 = 1,070 decisions.'<br/>Bars: approval rate, first-pass approval, appeals overturned for each site<br/>One sentence: 'Site A approves 6 points more often as requested.'" }
  a2@{ shape: curv-trap, label: "<b>Table: Decisions, Approval rate, Denial rate, First-pass approval, Average decision time (and the share past CMS), Preventable denials, Appeals overturned</b><br/>Columns: Site A, Site B, Both sites" }
  c1@{ shape: trap-t, label: "Click a figure in the Site A or Site B column" }
  p1@{ shape: rect, label: "<b>Opens the case list panel for that site and figure</b><br/>The 'Both sites' column is not clickable" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Case list panel" }
  d1@{ shape: trap-t, label: "Click 'View data table'" }
  d2@{ shape: curv-trap, label: "The same table as plain data" }
  e1@{ shape: stadium, label: "Comparison read" }
  s1 --> q1
  q1 -->|"No"| n1
  q1 -->|"Yes"| a1 --> a2 --> c1 --> p1 --> g1
  a1 --> d1 --> d2
  a2 --> e1
  class s1 k_start
  class q1 k_decision
  class n1,a1,a2,d2 k_screen
  class c1,d1 k_click
  class p1 k_process
  class g1 k_goto
  class e1 k_end
```

## Analytics › Common denial reasons: open Denial Intelligence

The table of common denial reasons sits in a folded section under 'Detailed breakdowns'. Every row is a link to Denial Intelligence, by the row or by the reason text. The link carries the row's payer and its reason, so the denial list opens already narrowed to those denials. Under the table are how appeals ended and how many denials were accepted.

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
  sc@{ shape: curv-trap, label: "<b>Summary stays: '311 denials this quarter. Most common: Continued-stay evidence incomplete at Cardinal, 23%.'</b><br/>Text: 'This quarter. Each payer's most common reason. Select a row to open those denials in Denial Intelligence.'" }
  th@{ shape: curv-trap, label: "Columns: 'Reason', 'Payer', 'Count', 'Share of denials'" }
  q1@{ shape: diam, label: "Which payer is chosen in the menu?" }
  p1@{ shape: rect, label: "<b>'All payers': one row per payer, its most common reason</b><br/>Biggest first<br/>A payer with fewer than 20 denials is left out" }
  r1@{ shape: curv-trap, label: "<b>Cardinal 73 · 23% 'Continued-stay evidence incomplete'</b><br/>Evergreen 34 · 11%<br/>Summit Medicaid 28 · 9%<br/>Harborview MA 15 · 5%<br/>Beacon PPO 13 · 4%" }
  p3@{ shape: rect, label: "<b>One payer: all of that payer's reasons</b><br/>Shares add up to 100% of that payer's denials" }
  q2@{ shape: diam, label: "Fewer than 20 denials in view?" }
  nd@{ shape: curv-trap, label: "'Not enough decisions yet. Figures based on fewer than 20 decisions stay hidden.'" }
  o1@{ shape: curv-trap, label: "<b>Under the table</b><br/>'Appeals overturned' 56%, '54 of 96 rulings this quarter'<br/>'Denials accepted' 17" }
  o2@{ shape: rect, label: "<b>Both move when Denial Intelligence records a ruling or an accepted denial</b><br/>Appeals show a dash under 20 rulings" }
  subgraph gClick ["Open a row"]
  c1@{ shape: trap-t, label: "Click anywhere on a row" }
  c2@{ shape: trap-t, label: "Click the reason text, for example 'Recertification filed too late'" }
  p4@{ shape: rect, label: "<b>Opens /denials?payer=harborview&reason=Recertification filed too late</b><br/>The row's own payer and reason go along" }
  end
  g1@{ shape: subproc, label: "Continues in: Denial Intelligence › Open denials list › Filter by payer and reason" }
  s1 --> sc --> th --> q1
  q1 -->|"All payers"| p1 --> r1
  q1 -->|"One payer"| p3
  r1 & p3 --> q2
  q2 -->|"Yes"| nd
  q2 -->|"No"| c1 & c2
  c1 --> p4
  c2 --> p4
  p4 --> g1
  sc --> o1 --> o2
  class s1 k_start
  class sc,th,r1,nd,o1 k_screen
  class q1,q2 k_decision
  class p1,p3,o2,p4 k_process
  class c1,c2 k_click
  class g1 k_goto
  style gClick fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Detailed breakdowns

Under the heading 'Detailed breakdowns' five sections are folded. Each is a real button that shows its title and one summary line, and opens in place. Open by click, Enter or Space. Everything inside follows the period, payer, program, diagnosis group and site view.

Route: `/analytics`

The summary lines are worked out from the records, so they change with the menus. A section starts closed every time the page opens.

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
  s1@{ shape: stadium, label: "Scroll below the cards to 'Detailed breakdowns'" }
  sc@{ shape: curv-trap, label: "<b>Heading and 'The tables and rankings behind the figures above. Each one opens in place.'</b><br/>Five closed sections with a chevron" }
  subgraph gA ["'Length of stay and units' and 'Process health'"]
  a1@{ shape: subproc, label: "Continues in: Analytics › Length of stay and units" }
  a2@{ shape: subproc, label: "Continues in: Analytics › Process health" }
  end
  subgraph gB ["'Common denial reasons by payer'"]
  b1@{ shape: curv-trap, label: "Table of reasons, 'Appeals overturned', 'Denials accepted'" }
  b2@{ shape: subproc, label: "Continues in: Analytics › Common denial reasons: open Denial Intelligence" }
  end
  subgraph gC ["'How FLO's advice and drafts perform'"]
  c1@{ shape: curv-trap, label: "Summary: 'Advice taken works 84% of the time. 75% of drafts were sent without edits.'" }
  c2@{ shape: curv-trap, label: "<b>Four facts: 'Approved as asked' 71%, 'Top denial cause' 23%, 'Advice taken works' 84%, 'Sent without edits' 75%</b><br/>'How people edit agent drafts': donut, 68% as written (approved 89% of the time), 27% light edits, 5% rewritten<br/>'Why recommendations were dismissed' once someone dismissed one" }
  end
  subgraph gD ["'What helps most'"]
  d1@{ shape: curv-trap, label: "Summary: 'Most applied: Document depression severity with dated scores, 91% approved.'" }
  d2@{ shape: curv-trap, label: "Up to four ranked steps: 'Applied 389 times', '91% approved'" }
  end
  k1@{ shape: trap-t, label: "<b>Click a section's title row</b><br/>Or Tab to it and press Enter or Space" }
  p1@{ shape: rect, label: "<b>The button says whether it is open (aria-expanded)</b><br/>The chevron turns" }
  k2@{ shape: trap-t, label: "Click it again, or press Enter or Space again" }
  p2@{ shape: rect, label: "It closes. The summary stays" }
  q1@{ shape: diam, label: "20 or more decisions behind the content?" }
  h1@{ shape: curv-trap, label: "<b>Content reads 'Not enough decisions yet'</b><br/>The summary says the same" }
  e1@{ shape: stadium, label: "Section read" }
  s1 --> sc
  sc --> a1 & a2 & b1 & c1 & d1
  b1 --> b2
  c1 --> c2
  d1 --> d2
  a1 & a2 & b1 & c1 & d1 --> k1 --> p1 --> q1
  q1 -->|"No"| h1 --> e1
  q1 -->|"Yes"| e1
  p1 --> k2 --> p2
  class s1 k_start
  class sc,b1,c1,c2,d1,d2,h1 k_screen
  class a1,a2,b2 k_goto
  class k1,k2 k_click
  class p1,p2 k_process
  class q1 k_decision
  class e1 k_end
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gC fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gD fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Analytics › Monthly report › Open and build

'Monthly report' opens a small window where the Analyst agent builds the report in four short steps, about 3 seconds. Cancel, Close, Escape and a click outside all stop it. Closing throws the build away.

Route: `/analytics`

Demo only: the steps are a timer, 0.75 seconds each. The report is built from the period, payer, program, diagnosis group and site view chosen when the window opened. Escape closes the window, and a menu opened beforehand closes first, one press each.

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
  o1@{ shape: win-pane, label: "<b>Window 'Monthly report'</b><br/>Subtitle 'This quarter · Both sites · All payers · All programs · All diagnosis groups'<br/>'Built by' Analyst<br/>Button 'Cancel' in the footer" }
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
  r1@{ shape: curv-trap, label: "<b>Panel 'Your report is ready'</b><br/>'Same figures as this page, for the site view and filters you have set. Save a file or print it.'<br/>Buttons 'Download report', 'Download data (CSV)' and 'Print'<br/>Footer button now reads 'Done'" }
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

Demo only: the files hold exactly the figures on the page, and are named from the period, payer, program, diagnosis group and site view, for example psyflo-monthly-report-quarter-all-all-all-both.md.

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
  pp@{ shape: rect, label: "<b>The browser's print window opens</b><br/>It prints a plain page of the report: title, period, site view, payer, program, diagnosis group and every section<br/>Not the sidebar, the menus or the window" }
  pq@{ shape: rect, label: "<b>Cancel or Print in the browser window</b><br/>The report window stays open" }
  q1@{ shape: diam, label: "<b>Is this the hosted preview?</b><br/>(the host page blocks downloads and printing)" }
  t1@{ shape: odd, label: "<b>'Download is off in this preview'</b><br/>'Open the single-file version of the demo to use it.'" }
  p0@{ shape: rect, label: "<b>No file is made and no second toast</b><br/>The window stays open" }
  subgraph gFile ["In the single-file demo"]
  f1@{ shape: doc, label: "<b>Markdown file</b><br/>psyflo-monthly-report-quarter-all-all-all-both.md" }
  f2@{ shape: doc, label: "<b>CSV file</b><br/>psyflo-monthly-report-quarter-all-all-all-both.csv" }
  p1@{ shape: rect, label: "Browser saves the file to the person's computer" }
  t2@{ shape: odd, label: "<b>'Report downloaded'</b><br/>'psyflo-monthly-report-quarter-all-all-all-both.md has the figures you see on this page.'" }
  p2@{ shape: rect, label: "Window stays open, so the other file can be saved too" }
  end
  n1@{ shape: rect, label: "Name pattern: psyflo-monthly-report, then the period (quarter, last_quarter, year), then the payer (all or cardinal, summit ...), then the program (all, res, iop, php or wm), the diagnosis group (all, aud, oud, stim, mood, trauma or cooc) and the site view (both, a or b)" }
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

The two downloaded files and the printed page are built from the same numbers as the page, for the period, payer, program, diagnosis group and site view chosen when the window opened. A figure behind fewer than 20 decisions is written as 'Not enough decisions yet', never as a number.

Route: `/analytics`

Demo only: the real monthly pack in the product requirements is one PDF, aggregate only, approved by the operator before it is sent. The demo has no PDF file. The printed page holds the same sections as the written report. A one-site viewer's report names the site and has no Site A and Site B section.

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
  m1@{ shape: doc, label: "<b>'# Psyflo monthly report'</b><br/>'Period', 'Site view', 'Payer', 'Program' and 'Diagnosis group'<br/>'Built by Analyst from demo data. Demo values: this is sample data. A figure based on fewer than 20 decisions is left out.' and the CMS decision time note" }
  m2@{ shape: doc, label: "<b>'## Headline figures'</b><br/>Nine bullets: approval rate, denial rate, first-pass approval, average decision time (demo values, share past the CMS time), preventable denials, appeals overturned, top denial cause, advice taken works, sent without edits<br/>Each with its change against the earlier period" }
  m3@{ shape: doc, label: "<b>'## Approvals and denials by month'</b><br/>Table of the twelve months: decisions, approved as requested, approved in part, denied, approval rate, denial rate" }
  m4@{ shape: doc, label: "<b>'## Payer scorecard'</b><br/>Table: one row per payer and 'All payers', with the same columns as the page" }
  m5@{ shape: doc, label: "<b>'## Payer by diagnosis group (approved as requested)'</b><br/>Table of rate and decisions for each cell" }
  m6@{ shape: doc, label: "<b>'## Denial reasons'</b><br/>Table: Reason, Denials, Share of denials, Running share, Preventable" }
  m7@{ shape: doc, label: "<b>'## Length of stay and units'</b><br/>'## Process health'<br/>Bullets for retro-authorizations by month, referral to authorization, peer-to-peer calls, appeals and the live workload" }
  m8@{ shape: doc, label: "<b>'## Site A and Site B'</b><br/>Table with Site A, Site B and Both sites<br/>Left out for a one-site viewer or when one site is chosen" }
  m9@{ shape: doc, label: "<b>'## How people edit agent drafts', '## Denial outcomes', '## What helps most'</b><br/>And '## Why recommendations were dismissed' when someone dismissed one" }
  end
  subgraph gCsv ["Figures as a table (.csv)"]
  v1@{ shape: doc, label: "<b>One header row</b><br/>period, site_view, payer, program, diagnosis, section, label, value, count, unit<br/>Unit says percent, days or count" }
  v2@{ shape: doc, label: "<b>Rows by section</b><br/>headline, trend, payer scorecard, payer by diagnosis group, program, request type and population, denial reasons, length of stay, process health, sites, draft edits, what helps most<br/>and 'dismissed recommendations' when there are any" }
  v3@{ shape: doc, label: "<b>Commas and quotes inside a value are wrapped in quotes</b><br/>Opens in a spreadsheet" }
  end
  q1@{ shape: diam, label: "Is the figure behind 20 or more decisions?" }
  p1@{ shape: rect, label: "The number is written" }
  p2@{ shape: rect, label: "<b>'Not enough decisions yet' is written in its place</b><br/>The count is kept" }
  p3@{ shape: rect, label: "<b>Same view as the page: the same period, filters and site view, the same hidden figures</b><br/>No dollar figures anywhere" }
  e1@{ shape: stadium, label: "File matches the screen" }
  s1 --> m1 & v1
  m1 --> m2 --> m3 --> m4 --> m5 --> m6 --> m7 --> m8 --> m9
  v1 --> v2 --> v3
  m9 --> q1
  v3 --> q1
  q1 -->|"Yes"| p1 --> e1
  q1 -->|"No"| p2 --> e1
  s1 -.-> p3
  p3 -.-> e1
  class s1 k_start
  class m1,m2,m3,m4,m5,m6,m7,m8,m9,v1,v2,v3 k_doc
  class q1 k_decision
  class p1,p2,p3 k_process
  class e1 k_end
  style gMd fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCsv fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```
