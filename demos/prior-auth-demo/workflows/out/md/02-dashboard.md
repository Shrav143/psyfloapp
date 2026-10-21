# Dashboard

One page with filters and a calendar: the six-stage strip, requests, payers, the request drawer and the payer's answers.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/02-dashboard/`.

## Dashboard › Arrive › What the page shows

Five ways to land on the Dashboard, how filters in the address are read, and the parts of the page from the top down. Each part continues in its own diagram.

Route: `/dashboard`

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
  s1@{ shape: stadium, label: "<b>Click 'Dashboard' in the sidebar</b><br/>The badge counts Info requested" }
  s2@{ shape: stadium, label: "<b>Open the app at /</b><br/>The address / goes to /dashboard" }
  s3@{ shape: stadium, label: "<b>Follow a link with a request or a filter</b><br/>A notification, or a button on another page" }
  s4@{ shape: stadium, label: "Demo menu › Click 'Reset demo data'" }
  s5@{ shape: stadium, label: "<b>Follow 'Open Dashboard, By payer' in Ask FLO</b><br/>The address is /dashboard?focus=payers" }
  d4@{ shape: diam, label: "Does the address hold ?focus=payers?" }
  pf@{ shape: rect, label: "<b>Payers at a glance scrolls into view and is outlined for about 2 seconds</b><br/>The ?focus part is then removed from the address" }
  t1@{ shape: odd, label: "<b>'Demo data reset'</b><br/>'Everything is back to the starting point.'" }
  p1@{ shape: rect, label: "Page opens and reads the address" }
  d1@{ shape: diam, label: "Does the address hold payer, program, type, stage, from or to?" }
  p2@{ shape: rect, label: "<b>The address wins</b><br/>Four menus go back to All, then the address values apply<br/>Unknown values are ignored" }
  p3@{ shape: rect, label: "<b>The remembered filters are written back to the address</b><br/>First visit: no filters, last 30 days" }
  w1@{ shape: cyl, label: "<b>Filters</b><br/>Payer, Program, Request type, Stage, date range" }
  sc@{ shape: curv-trap, label: "<b>Dashboard</b><br/>One page; the filters decide what it shows" }
  d2@{ shape: diam, label: "Does the address hold ?request=ID?" }
  d3@{ shape: diam, label: "Is there a request with that ID?" }
  o1@{ shape: win-pane, label: "Request drawer opens over the page" }
  p4@{ shape: rect, label: "<b>Nothing opens</b><br/>The ?request part is removed after 0.2 seconds" }
  e1@{ shape: stadium, label: "Page shown with no drawer" }
  subgraph gPage ["On the page, from the top down"]
  h1@{ shape: curv-trap, label: "<b>Headline and sub line</b><br/>'18 requests are waiting on payers. 3 are waiting on you.'" }
  ca@{ shape: trap-t, label: "<b>Click 'Check all now'</b><br/>Disabled while Navigator is paused in Settings" }
  f1@{ shape: curv-trap, label: "<b>Filter bar</b><br/>'All payers', 'All programs', 'All request types', 'All stages'<br/>'Outcomes for' and the date range 'Sep 21 – Oct 20, 2026'" }
  st@{ shape: curv-trap, label: "<b>Stage strip, six tiles</b><br/>Preparing 5 (plus cases saved in New case), Received 4, Under review 14, Info requested 3, Decided today 8, Appeal or call 8" }
  rq@{ shape: curv-trap, label: "<b>Requests</b><br/>'Showing 8 of 40', seven columns, five sortable headings, 'Show 8 more'" }
  py@{ shape: curv-trap, label: "<b>Payers at a glance</b><br/>Six payers and an 'All payers' total row<br/>'Open Payers' link; each payer name opens that payer" }
  end
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Open and read a request" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Headline › What the headline and sub line say" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Header › Check all now and the demo clock" }
  g4@{ shape: subproc, label: "Continues in: Dashboard › Filters › Payer, Program, Request type and Stage" }
  g5@{ shape: subproc, label: "Continues in: Dashboard › Stage strip › Click a stage tile" }
  g6@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Order, rows and paging" }
  g7@{ shape: subproc, label: "Continues in: Dashboard › Payers at a glance › Read the table and pick a payer" }
  g8@{ shape: subproc, label: "Continues in: Dashboard › Filters › Pick a date range" }
  g9@{ shape: subproc, label: "Continues in: Dashboard › Filters › Clear filters and empty states" }
  s1 --> p1
  s2 --> p1
  s3 --> p1
  s5 --> p1
  s4 --> t1 --> p1
  p1 --> d1
  d1 -->|"Yes"| p2 --> w1
  d1 -->|"No"| p3 --> w1
  w1 --> sc
  sc --> d4
  d4 -->|"Yes"| pf --> py
  sc --> d2
  d2 -->|"No"| e1
  d2 -->|"Yes"| d3
  d3 -->|"Yes"| o1 --> g1
  d3 -->|"No"| p4 --> e1
  sc --> h1 --> f1 --> st --> rq --> py
  h1 --> g2
  h1 --> ca --> g3
  f1 --> g4
  f1 --> g8
  f1 --> g9
  st --> g5
  rq --> g6
  py --> g7
  class s1,s2,s3,s4,s5 k_start
  class d4,d1,d2,d3 k_decision
  class pf,p1,p2,p3,p4 k_process
  class t1 k_toast
  class w1 k_store
  class sc,h1,f1,st,rq,py k_screen
  class o1 k_overlay
  class e1 k_end
  class ca k_click
  class g1,g2,g3,g4,g5,g6,g7,g8,g9 k_goto
  style gPage fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Headline › What the headline and sub line say

The big sentence at the top and the muted line under it are rebuilt whenever a filter, a tile or a payer reply changes the list. Stage wins over Payer, and Payer wins over the plain count. The numbers below are the demo's opening data.

Route: `/dashboard`

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
  s1@{ shape: stadium, label: "A filter, a tile click or a payer reply changes the list" }
  p1@{ shape: rect, label: "<b>Headline is rebuilt</b><br/>Counts use Payer, Program and Request type, but not Stage" }
  d1@{ shape: diam, label: "Does any request match the filters?" }
  n0@{ shape: curv-trap, label: "<b>'No requests match these filters.'</b><br/>'The filters hide everything. Clear them to see every request again.'" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Filters › Clear filters and empty states" }
  d2@{ shape: diam, label: "Which Stage is set?" }
  a1@{ shape: curv-trap, label: "<b>Appeal or call</b><br/>'8 denials are on their route. $67.8K is at stake.'<br/>'Each one is a call, an appeal, an external review or a resubmission.'" }
  a2@{ shape: curv-trap, label: "<b>Info requested</b><br/>'3 requests are waiting on you.'<br/>'The payer asked for more information. Packet drafts each answer for you to review.'" }
  a3@{ shape: curv-trap, label: "<b>Preparing</b><br/>'5 requests are being prepared.'<br/>The count is the same as the Preparing tile: the table rows plus cases saved in New case<br/>'They are in Case Manager. Nothing has been sent to a payer yet.'" }
  a4@{ shape: curv-trap, label: "<b>Received</b><br/>'4 requests have been received.'<br/>'The payer confirmed receipt. Navigator checks each one again every few minutes.'" }
  a5@{ shape: curv-trap, label: "<b>Under review</b><br/>'14 requests are under review.'<br/>'Payers usually take about 2.2 days to decide. Caller phones when one runs late.'" }
  a6@{ shape: curv-trap, label: "<b>Decided today</b><br/>'8 requests were decided today. 6 approved, 2 not as asked.'<br/>'Approvals update the ledger. Write-back to the EMR waits for you.'" }
  d3@{ shape: diam, label: "Is a Payer set?" }
  b1@{ shape: curv-trap, label: "<b>'Cardinal Health Plan: 5 waiting, taking 2.8 days.'</b><br/>'Decisions usually take 2 days at this payer. 3 denials are open.'<br/>With Program or Type set, they lead the sub line: 'IOP. Decisions usually...'" }
  d4@{ shape: diam, label: "Is Program or Request type set?" }
  c1@{ shape: curv-trap, label: "<b>'7 requests are waiting on payers. 1 is waiting on you.'</b><br/>'Showing Residential 3.5 only. Everything below follows that filter.'" }
  c2@{ shape: curv-trap, label: "<b>'18 requests are waiting on payers. 3 are waiting on you.'</b><br/>'Where every request stands, from preparing to decided, without a phone call.'" }
  p2@{ shape: rect, label: "<b>Payer, Program and Request type set are added in front of the sub line</b><br/>Example: 'Summit Medicaid HMO. Payers usually take about 1.4 days...'" }
  e1@{ shape: stadium, label: "Headline and sub line shown" }
  s1 --> p1 --> d1
  d1 -->|"No"| n0 --> g1
  d1 -->|"Yes"| d2
  d2 -->|"Appeal or call"| a1
  d2 -->|"Info requested"| a2
  d2 -->|"Preparing"| a3
  d2 -->|"Received"| a4
  d2 -->|"Under review"| a5
  d2 -->|"Decided today"| a6
  d2 -->|"All stages"| d3
  a1 & a2 & a3 & a4 & a5 & a6 --> p2 --> e1
  d3 -->|"Yes"| b1 --> e1
  d3 -->|"No"| d4
  d4 -->|"Yes"| c1 --> e1
  d4 -->|"No"| c2 --> e1
  class s1 k_start
  class p1,p2 k_process
  class d1,d2,d3,d4 k_decision
  class n0,a1,a2,a3,a4,a5,a6,b1,c1,c2 k_screen
  class g1 k_goto
  class e1 k_end
```

## Dashboard › Header › Check all now and the demo clock

The one button in the page header, which Settings can switch off by pausing Navigator, and what the Demo menu's clock does to the numbers on this page. Time in the demo only moves when someone moves it.

Route: `/dashboard`

Real world: Navigator checks every open request at least daily, and a request past the payer's time gets a call-the-payer task. Demo only: the button and the clock are simulated.

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
  s0@{ shape: stadium, label: "<b>Look at the header</b><br/>'Check all now' sits top right of the headline card" }
  dp@{ shape: diam, label: "Is Navigator paused in Settings?" }
  sp@{ shape: curv-trap, label: "<b>'Check all now' is disabled</b><br/>Under it a link: 'Navigator is paused in Settings'" }
  cs@{ shape: trap-t, label: "Click 'Navigator is paused in Settings'" }
  gs@{ shape: subproc, label: "Continues in: Settings › Pause › What the rest of the app shows" }
  xs@{ shape: stadium, label: "<b>Nothing runs</b><br/>Resume Navigator in Settings and the button works again" }
  s1@{ shape: trap-t, label: "Click 'Check all now'" }
  p1@{ shape: rect, label: "Button shows a spinner and is disabled for 1.2 seconds" }
  a1@{ shape: hex, label: "<b>Navigator looks at every open request</b><br/>Received and Under review, whatever the filters say" }
  w1@{ shape: cyl, label: "<b>Each open request gets a history line</b><br/>'Navigator checked: received' or 'Navigator checked: under review'" }
  t1@{ shape: odd, label: "<b>'Navigator checked 18 open requests'</b><br/>'No new answers yet. It checks again in 30 minutes.'" }
  e1@{ shape: stadium, label: "<b>Button is ready again</b><br/>No request changes stage" }
  s2@{ shape: stadium, label: "Demo menu › Click 'Fast-forward 1 hour' or 'Fast-forward 1 day'" }
  c1@{ shape: cyl, label: "<b>Demo clock moves forward</b><br/>Nothing else moves time" }
  t2@{ shape: odd, label: "<b>'Clock moved forward 1 hour' or '1 day'</b><br/>'Times in stage and deadlines updated.'" }
  p2@{ shape: rect, label: "Dashboard recomputes from the new time" }
  subgraph gClock ["What the clock changes on the Dashboard"]
  r1@{ shape: rect, label: "<b>Table: time in stage grows</b><br/>Over 1.5 × typical shows 'late'; over 2 × shows 'very late'" }
  r2@{ shape: rect, label: "<b>Table: open denials count down</b><br/>'36 h left', '3 days left', then 'window closed'" }
  r3@{ shape: rect, label: "Table order: very late and late rows move up" }
  r4@{ shape: rect, label: "Stage strip: 'Appeal or call' counts 'deadlines this week' from the new time" }
  r5@{ shape: rect, label: "Calendar: today moves, so the last pickable day and the shortcuts end on the new day" }
  end
  p3@{ shape: rect, label: "Not changed: the default range Sep 21 – Oct 20, 2026, the stage counts and the payers figures" }
  g1@{ shape: subproc, label: "Continues in: Global shell › Demo menu" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Read a row: bars, clock and what happens next" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Filters › Date range shortcuts, keys and the address" }
  s0 --> dp
  dp -->|"No"| s1 --> p1 --> a1 --> w1 --> t1 --> e1
  dp -->|"Yes"| sp --> cs --> gs
  sp -.-> xs
  s2 --> c1 --> t2 --> p2
  p2 --> r1 & r2 & r3 & r4 & r5
  r1 --> g2
  r2 --> g2
  r5 --> g3
  p2 -.-> p3
  s2 -.-> g1
  class s0,s2 k_start
  class dp k_decision
  class sp k_screen
  class cs,s1 k_click
  class gs,g1,g2,g3 k_goto
  class xs k_endx
  class p1,p2,r1,r2,r3,r4,r5,p3 k_process
  class a1 k_agent
  class w1,c1 k_store
  class t1,t2 k_toast
  class e1 k_end
  style gClock fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Filters › Payer, Program, Request type and Stage

Four menus on the filter bar. Each one applies as soon as an option is picked; there is no Apply button. The date range is a separate control (see Pick a date range).

Route: `/dashboard?payer=cardinal&program=iop&type=recertification&stage=appeal`

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>Filter bar: four menus, then 'Outcomes for' and the dates" }
  c1@{ shape: trap-t, label: "Click 'All payers'" }
  c2@{ shape: trap-t, label: "Click 'All programs'" }
  c3@{ shape: trap-t, label: "Click 'All request types'" }
  c4@{ shape: trap-t, label: "Click 'All stages'" }
  o1@{ shape: win-pane, label: "<b>Payer menu</b><br/>All payers, Cardinal Health Plan, Summit Medicaid HMO, Beacon PPO, Harborview MA, Lakeshore Behavioral, Evergreen" }
  o2@{ shape: win-pane, label: "<b>Program menu</b><br/>All programs, Residential 3.5, IOP, PHP, Detox" }
  o3@{ shape: win-pane, label: "<b>Request type menu</b><br/>All request types, Initial request, Admission, Continued stay, Recertification, Retro-authorization, Peer-to-peer call, Appeal, Resubmission" }
  o4@{ shape: win-pane, label: "<b>Stage menu</b><br/>All stages, Preparing, Received, Under review, Info requested, Decided today, Appeal or call" }
  m1@{ shape: rect, label: "<b>Menu is open: the options list, current pick ticked</b><br/>Same behaviour in all four menus" }
  i1@{ shape: lean-r, label: "<b>Pick an option</b><br/>Click it, or ArrowDown or ArrowUp then Enter" }
  k1@{ shape: trap-t, label: "Press Escape, click outside, or click the menu button again" }
  e0@{ shape: stadium, label: "Menu closes, nothing changes" }
  p1@{ shape: rect, label: "Menu closes and the pick is saved to Payer, Program, Request type or Stage" }
  w1@{ shape: cyl, label: "<b>Filters</b><br/>A menu that is not 'All' turns green and bold" }
  p2@{ shape: rect, label: "<b>Address updated in place, no new history entry</b><br/>Only non-default values appear" }
  p3@{ shape: rect, label: "Table goes back to its first 8 rows" }
  subgraph gFollow ["What follows each filter"]
  f1@{ shape: rect, label: "<b>Payer, Program, Request type</b><br/>Headline, all six tile counts and the table follow them" }
  f2@{ shape: rect, label: "<b>Stage</b><br/>Table and headline follow it; the tile counts still count every stage and the chosen tile is outlined" }
  f3@{ shape: rect, label: "<b>Payers at a glance</b><br/>Waiting follows Program and Request type; the Payer pick highlights its row" }
  end
  d1@{ shape: diam, label: "Is any request left?" }
  sc@{ shape: curv-trap, label: "Dashboard shows the matching rows" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Filters › Clear filters and empty states" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Headline › What the headline and sub line say" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Stage strip › Click a stage tile" }
  g4@{ shape: subproc, label: "Continues in: Dashboard › Payers at a glance › Read the table and pick a payer" }
  s1 --> c1 --> o1
  s1 --> c2 --> o2
  s1 --> c3 --> o3
  s1 --> c4 --> o4
  o1 & o2 & o3 & o4 --> m1
  m1 --> i1
  m1 -.-> k1 --> e0
  i1 --> p1 --> w1 --> p2 --> p3
  p3 --> f1 & f2 & f3
  f1 --> g2
  f2 --> g3
  f3 --> g4
  f1 & f2 --> d1
  d1 -->|"Yes"| sc
  d1 -->|"No"| g1
  class s1 k_start
  class c1,c2,c3,c4,k1 k_click
  class o1,o2,o3,o4 k_overlay
  class m1,p1,p2,p3,f1,f2,f3 k_process
  class i1 k_input
  class e0 k_end
  class w1 k_store
  class d1 k_decision
  class sc k_screen
  class g1,g2,g3,g4 k_goto
  style gFollow fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Filters › Pick a date range

The calendar at the right end of the filter bar, after 'Outcomes for'. Pick a first day, then a last day, then Apply. The range only changes the figures in Payers at a glance.

Route: `/dashboard?from=2026-10-05&to=2026-10-12`

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>'Outcomes for' and a date button, e.g. 'Sep 21 – Oct 20, 2026'" }
  c1@{ shape: trap-t, label: "Click the date button" }
  p1@{ shape: rect, label: "<b>Calendar starts from the range that is applied</b><br/>Two months show: Sep 2026 and Oct 2026" }
  o1@{ shape: win-pane, label: "<b>Calendar pop-up</b><br/>Shortcuts on the left, two months, 'Cancel' and 'Apply'" }
  t0@{ shape: odd, label: "<b>Footer shows 'Sep 21, 2026 to Oct 20, 2026'</b><br/>'Apply' is ready (it re-applies the same range)" }
  p2@{ shape: rect, label: "<b>Days after today are dimmed and cannot be clicked</b><br/>The right arrow stops when the next month starts after today" }
  c2@{ shape: trap-t, label: "Click a first day, e.g. Oct 5" }
  t1@{ shape: odd, label: "<b>Footer: 'Start Oct 5, 2026. Now pick an end day.'</b><br/>'Apply' is disabled" }
  p3@{ shape: rect, label: "Moving the mouse over days shades the range as a preview" }
  c3@{ shape: trap-t, label: "Click a second day" }
  d1@{ shape: diam, label: "Is the second day on or after the first?" }
  p4@{ shape: rect, label: "<b>That day becomes the new first day</b><br/>Still waiting for an end day" }
  p5@{ shape: rect, label: "That day becomes the last day" }
  t2@{ shape: odd, label: "<b>Footer: 'Oct 5, 2026 to Oct 12, 2026'</b><br/>'Apply' is ready" }
  c4@{ shape: trap-t, label: "Click a day when a first and last day are already set" }
  p6@{ shape: rect, label: "Starts again: the day becomes the first day and the last day is cleared" }
  c5@{ shape: trap-t, label: "Click 'Apply'" }
  w1@{ shape: cyl, label: "Filter 'range' saved: Oct 5 to Oct 12" }
  p7@{ shape: rect, label: "<b>Calendar closes</b><br/>The date button shows 'Oct 5 – Oct 12, 2026' and turns green and bold" }
  p8@{ shape: rect, label: "<b>Address gets ?from=2026-10-05&to=2026-10-12</b><br/>The default last 30 days leaves no from or to" }
  p9@{ shape: rect, label: "Table goes back to its first 8 rows" }
  sc@{ shape: curv-trap, label: "<b>Payers at a glance</b><br/>'Denied (8 d)' and 'Info asks (8 d)' rescale to 8 days<br/>'Approved as asked' shifts slightly" }
  p10@{ shape: rect, label: "Not changed: headline, stage tiles and requests table" }
  c6@{ shape: trap-t, label: "Click 'Cancel'" }
  c7@{ shape: trap-t, label: "Press Escape, click outside, or click the date button again" }
  e1@{ shape: stadium, label: "<b>Calendar closes</b><br/>The draft is thrown away and the applied range stays" }
  e2@{ shape: stadium, label: "Range applied" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Filters › Date range shortcuts, keys and the address" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Payers at a glance › Read the table and pick a payer" }
  s1 --> c1 --> p1 --> o1 --> t0
  o1 --> p2
  t0 --> c2 --> t1 --> p3 --> c3 --> d1
  d1 -->|"Yes"| p5 --> t2
  d1 -->|"No, an earlier day"| p4 --> c3
  t2 --> c4 --> p6 --> c2
  t2 --> c5
  c5 --> w1 --> p7 --> p8 --> p9 --> sc --> p10 --> e2
  sc --> g2
  o1 --> c6
  o1 --> c7
  c6 --> e1
  c7 --> e1
  o1 -.-> g1
  class s1 k_start
  class c1,c2,c3,c4,c5,c6,c7 k_click
  class p1,p2,p3,p4,p5,p6,p7,p8,p9,p10 k_process
  class o1 k_overlay
  class t0,t1,t2 k_toast
  class d1 k_decision
  class w1 k_store
  class sc k_screen
  class e1,e2 k_end
  class g1,g2 k_goto
```

## Dashboard › Filters › Date range shortcuts, keys and the address

The faster ways through the calendar: four shortcuts that apply at once, the month arrows, the keyboard, and how the range is written to and read from the address. Today in the demo is Tue 20 Oct 2026.

Route: `/dashboard?from=2026-10-14&to=2026-10-20`

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
  s1@{ shape: stadium, label: "<b>Calendar pop-up is open</b><br/>Shortcuts at the left" }
  subgraph gPre ["Shortcuts (each ends today and applies at once)"]
  c1@{ shape: trap-t, label: "<b>Click 'Last 7 days'</b><br/>Oct 14 – Oct 20, 2026" }
  c2@{ shape: trap-t, label: "<b>Click 'Last 30 days'</b><br/>Sep 21 – Oct 20, 2026 (the default)" }
  c3@{ shape: trap-t, label: "<b>Click 'Last 90 days'</b><br/>Jul 23 – Oct 20, 2026" }
  c4@{ shape: trap-t, label: "<b>Click 'This month'</b><br/>Oct 1 – Oct 20, 2026" }
  end
  p1@{ shape: rect, label: "<b>Range saved and the calendar closes</b><br/>No Apply needed" }
  subgraph gNav ["Moving around the calendar"]
  n1@{ shape: trap-t, label: "<b>Click the left arrow 'Earlier months'</b><br/>The two months move back one" }
  n2@{ shape: trap-t, label: "<b>Click the right arrow 'Later months'</b><br/>The two months move forward one" }
  nd@{ shape: diam, label: "Does the month after the right one start after today?" }
  n3@{ shape: rect, label: "Right arrow is dimmed and disabled" }
  n4@{ shape: rect, label: "Months move" }
  k1@{ shape: trap-t, label: "<b>Press ArrowLeft, ArrowRight, ArrowUp or ArrowDown on a day</b><br/>Moves the focus by 1 or 7 days" }
  k2@{ shape: rect, label: "Focus stops at today; the months scroll to keep the day in view" }
  k3@{ shape: trap-t, label: "<b>Press Enter or Space on the focused day</b><br/>Same as clicking it" }
  end
  subgraph gUrl ["The address"]
  u1@{ shape: diam, label: "Is the applied range the default Sep 21 – Oct 20?" }
  u2@{ shape: rect, label: "No from or to in the address" }
  u3@{ shape: rect, label: "?from=2026-10-14&to=2026-10-20 added" }
  u4@{ shape: stadium, label: "Open a link that has from and to" }
  u5@{ shape: diam, label: "Are from and to real dates, with from not after to?" }
  u6@{ shape: rect, label: "Range applied from the link" }
  u7@{ shape: rect, label: "Ignored: the remembered range stays" }
  u8@{ shape: stadium, label: "Open an old link with ?period=7d, 30d or quarter" }
  u9@{ shape: rect, label: "Mapped to the last 7, 30 or 90 days ending Oct 20" }
  end
  w1@{ shape: cyl, label: "Filter 'range'" }
  sc@{ shape: curv-trap, label: "<b>Date button shows the range</b><br/>Green and bold when it is not the default<br/>One day shows as 'Oct 10, 2026'" }
  p2@{ shape: rect, label: "Payers at a glance rescales: 'Denied (N d)' and 'Info asks (N d)' use N days, N = days in the range" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Filters › Pick a date range" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Filters › Clear filters and empty states" }
  s1 --> c4 & c3 & c2 & c1
  c4 & c3 & c2 & c1 --> p1 --> w1
  s1 --> n1 & n2 & k1
  n1 --> n4
  n2 --> nd
  nd -->|"Yes"| n3
  nd -->|"No"| n4
  k1 --> k2 --> k3
  k3 -.-> g1
  w1 --> u1
  u1 -->|"Yes"| u2 --> sc
  u1 -->|"No"| u3 --> sc
  u4 --> u5
  u5 -->|"Yes"| u6 --> w1
  u5 -->|"No"| u7 --> sc
  u8 --> u9 --> w1
  sc --> p2
  sc -.-> g2
  class s1,u4,u8 k_start
  class c1,c2,c3,c4,n1,n2,k1,k3 k_click
  class p1,n3,n4,k2,u2,u3,u6,u7,u9,p2 k_process
  class nd,u1,u5 k_decision
  class w1 k_store
  class sc k_screen
  class g1,g2 k_goto
  style gPre fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gNav fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gUrl fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Filters › Clear filters and empty states

When 'Clear filters' appears, what it resets, and what the page shows when the filters match nothing. The date range never empties the table and Clear filters never resets it.

Route: `/dashboard?payer=cardinal&program=iop&type=recertification&stage=appeal`

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
  s1@{ shape: stadium, label: "<b>Pick Payer, Program, Request type or Stage</b><br/>Any one that is not 'All'" }
  d1@{ shape: diam, label: "Is at least one of the four menus not 'All'?" }
  sc1@{ shape: curv-trap, label: "<b>Filter bar</b><br/>Ghost button 'Clear filters' appears after the four menus" }
  sc0@{ shape: curv-trap, label: "<b>Filter bar</b><br/>No 'Clear filters' button<br/>The date range alone does not count" }
  c1@{ shape: trap-t, label: "Click 'Clear filters' on the filter bar" }
  p1@{ shape: rect, label: "<b>Payer, Program, Request type and Stage go back to 'All'</b><br/>The date range is kept" }
  w1@{ shape: cyl, label: "Filters" }
  p2@{ shape: rect, label: "<b>Address loses payer, program, type and stage</b><br/>from and to stay if they are not the default" }
  p3@{ shape: rect, label: "Table goes back to its first 8 rows" }
  sc2@{ shape: curv-trap, label: "<b>Dashboard shows every request again</b><br/>'Showing 8 of 40'" }
  e1@{ shape: stadium, label: "Back to the full list" }
  d2@{ shape: diam, label: "Do any requests match the filters?" }
  p4@{ shape: rect, label: "Example: Cardinal, IOP, Recertification, Appeal or call" }
  em1@{ shape: curv-trap, label: "<b>Headline</b><br/>'No requests match these filters.'<br/>'The filters hide everything. Clear them to see every request again.'" }
  em2@{ shape: curv-trap, label: "<b>Stage strip</b><br/>Tiles still show their own counts: 'nothing waiting on receipt', 'nothing with the payer', 'nothing waiting on you', 'none yet today', 'no open denials'" }
  em3@{ shape: curv-trap, label: "<b>Requests card</b><br/>'Showing 0 of 0'<br/>With Appeal or call it adds ' · $0 at stake'" }
  em4@{ shape: win-pane, label: "<b>Empty state in the card</b><br/>'No requests match'<br/>'The filters hide everything. Clear them to see every request again.'" }
  d3@{ shape: diam, label: "Is a narrowing filter set?" }
  c2@{ shape: trap-t, label: "Click 'Clear filters' in the empty state" }
  em5@{ shape: curv-trap, label: "<b>Payers at a glance</b><br/>Still lists all six payers<br/>Waiting counts follow Program and Request type" }
  x1@{ shape: stadium, label: "<b>No 'Clear filters' button</b><br/>Only possible if there were no requests at all" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Filters › Payer, Program, Request type and Stage" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Filters › Pick a date range" }
  s1 --> d1
  d1 -->|"Yes"| sc1 --> c1 --> p1 --> w1 --> p2 --> p3 --> sc2 --> e1
  d1 -->|"No"| sc0 -.-> g2
  w1 --> d2
  d2 -->|"Yes"| sc2
  d2 -->|"No"| p4
  p4 --> em1 & em2 & em3 & em4 & em5
  em4 --> d3
  d3 -->|"Yes"| c2 --> p1
  d3 -->|"No"| x1
  sc1 -.-> g1
  class s1 k_start
  class d1,d2,d3 k_decision
  class sc1,sc0,sc2,em1,em2,em3,em5 k_screen
  class c1,c2 k_click
  class p1,p2,p3,p4 k_process
  class w1 k_store
  class e1 k_end
  class em4 k_overlay
  class x1 k_endx
  class g1,g2 k_goto
```

## Dashboard › Stage strip › Click a stage tile

Six tinted tiles, left to right, with chevrons between them. A tile is a filter button: one click sets Stage, a second click on the same tile clears it. The chevrons are decoration and do nothing. Tile counts follow Payer, Program and Request type but ignore Stage. Preparing also counts cases saved in New case.

Route: `/dashboard?stage=under_review`

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>Stage strip under the filter bar" }
  subgraph gTiles ["The six tiles, left to right"]
  t1@{ shape: curv-trap, label: "<b>Preparing 5</b><br/>'in Case Manager'<br/>'2 need you, 1 ready to sign'<br/>Counts the five rows plus every case saved in New case that has no row yet" }
  t2@{ shape: curv-trap, label: "<b>Received 4</b><br/>'payer has it'<br/>'about 25 min on average'" }
  t3@{ shape: curv-trap, label: "<b>Under review 14</b><br/>'with the payer'<br/>'about 2.2 days on average'" }
  t4@{ shape: curv-trap, label: "<b>Info requested 3 (amber)</b><br/>'the payer wants more'<br/>'1 draft ready, 2 in progress'" }
  t5@{ shape: curv-trap, label: "<b>Decided today 8 (green)</b><br/>'6 approved · 2 denied'<br/>'ledger updated'" }
  t6@{ shape: curv-trap, label: "<b>Appeal or call 8 (red)</b><br/>'open denials'<br/>'4 deadlines this week'" }
  end
  p0@{ shape: rect, label: "<b>Today's denials count twice</b><br/>A request denied today is in Decided today and in Appeal or call" }
  c1@{ shape: trap-t, label: "<b>Click a tile that is not outlined</b><br/>e.g. 'Under review'" }
  c2@{ shape: trap-t, label: "Click the outlined tile again" }
  p1@{ shape: rect, label: "Stage set to that tile" }
  p2@{ shape: rect, label: "Stage goes back to 'All stages'" }
  w1@{ shape: cyl, label: "Filter 'stage'" }
  p3@{ shape: rect, label: "<b>The Stage menu shows the choice, or 'All stages' when cleared</b><br/>Address gets ?stage=under_review, or loses it" }
  p4@{ shape: rect, label: "<b>A selected tile is outlined and marked pressed</b><br/>Table goes back to its first 8 rows" }
  p5@{ shape: rect, label: "<b>Tile counts stay the same</b><br/>Headline, sub line and table rows follow the stage" }
  sc@{ shape: curv-trap, label: "<b>Requests</b><br/>'Showing 8 of 14' under the headline '14 requests are under review.'" }
  d2@{ shape: diam, label: "Does the tile show 0?" }
  em@{ shape: curv-trap, label: "<b>Empty state: 'No requests match'</b><br/>With 'Clear filters'" }
  d3@{ shape: diam, label: "Is Stage 'Preparing', with cases in New case that have no row?" }
  ml@{ shape: curv-trap, label: "<b>One line under the table</b><br/>'2 more are being prepared in New case.'<br/>Headline counts them too: '7 requests are being prepared.'" }
  c3@{ shape: trap-t, label: "Click 'Open Active cases'" }
  g5@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Being prepared card" }
  m1@{ shape: trap-t, label: "Pick a stage in the 'All stages' menu instead" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Headline › What the headline and sub line say" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Filters › Clear filters and empty states" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Order, rows and paging" }
  g4@{ shape: subproc, label: "Continues in: Dashboard › Filters › Payer, Program, Request type and Stage" }
  s1 --> t6 & t5 & t4 & t3 & t2 & t1
  c1 -.-> p0
  t6 & t5 & t4 & t3 & t2 & t1 --> c1
  p4 -.-> c2
  c1 --> p1
  c2 --> p2
  m1 -.-> g4
  p1 --> w1
  p2 --> w1
  w1 --> p3 --> p4 --> p5
  p5 --> g1
  p5 --> d2
  d2 -->|"No"| sc --> g3
  d2 -->|"Yes"| em --> g2
  sc --> d3
  d3 -->|"Yes"| ml --> c3 --> g5
  class s1 k_start
  class t1,t2,t3,t4,t5,t6,sc,em,ml k_screen
  class p0,p1,p2,p3,p4,p5 k_process
  class c1,c2,c3,m1 k_click
  class w1 k_store
  class d2,d3 k_decision
  class g5,g1,g2,g3,g4 k_goto
  style gTiles fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Requests table › Order, rows and paging

The 'Requests' card. Rows come in the app's own order until a heading is clicked. A click on a row, a case ID or 'Open' opens the request drawer and adds one history entry. Eight rows show at a time.

Route: `/dashboard`

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>'Requests' card under the stage strip" }
  sc1@{ shape: curv-trap, label: "<b>Card header</b><br/>'Requests' and 'Bars show progress: Prepared, Received, In review, Decided...'<br/>Right side: 'Showing 8 of 40'" }
  sc2@{ shape: curv-trap, label: "<b>Seven columns</b><br/>Case, Payer, Where it is, Clock, At stake, What happens next, and an unnamed column with 'Open'" }
  p1@{ shape: rect, label: "<b>The headings Case, Payer, Where it is, Clock and At stake are buttons that sort the rows</b><br/>'What happens next' and the Open column do not sort" }
  p2@{ shape: rect, label: "<b>Rows start in the app's order</b><br/>1 needs you, 2 very late, 3 late, 4 denial with under 2 days left, 5 the rest<br/>Same group: longest time in stage first" }
  d0@{ shape: diam, label: "Do any rows match the filters?" }
  em@{ shape: curv-trap, label: "<b>'No requests match'</b><br/>with 'Clear filters'" }
  subgraph gRow ["One row (example: P-1499)"]
  r1@{ shape: curv-trap, label: "<b>Row</b><br/>Case ID and type, payer and program, chip and bars, clock, At stake, what happens next, 'Open'" }
  c1@{ shape: trap-t, label: "Click anywhere on the row" }
  c2@{ shape: trap-t, label: "Click the underlined case ID, e.g. 'P-1499'" }
  c3@{ shape: trap-t, label: "Click 'Open' on the row" }
  end
  p3@{ shape: rect, label: "<b>Address gets ?request=P-1499</b><br/>One new history entry, so one press of the browser Back button closes the drawer" }
  o1@{ shape: win-pane, label: "Request drawer opens on the right" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Open and read a request" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Read a row: bars, clock and what happens next" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Filters › Clear filters and empty states" }
  g4@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Sort the rows" }
  g5@{ shape: subproc, label: "Continues in: Dashboard › Stage strip › Click a stage tile" }
  d1@{ shape: diam, label: "Are there more rows than are shown?" }
  sc3@{ shape: curv-trap, label: "<b>Under the table</b><br/>'Show 8 more' and '32 not shown'" }
  c4@{ shape: trap-t, label: "Click 'Show 8 more'" }
  p5@{ shape: rect, label: "<b>Eight more rows are added</b><br/>With fewer than 8 left the button shows that number, e.g. 'Show 5 more'" }
  e1@{ shape: stadium, label: "<b>All rows shown</b><br/>'Showing 40 of 40'; no button" }
  p6@{ shape: rect, label: "Changing any filter, the date range or the sort goes back to the first 8 rows" }
  t1@{ shape: odd, label: "<b>Count text 'Showing 8 of 40'</b><br/>With Appeal or call: 'Showing 8 of 8 · $67.8K at stake'" }
  sc4@{ shape: curv-trap, label: "<b>With the Preparing tile chosen</b><br/>A line under the table: '2 more are being prepared in New case.' and 'Open Active cases'" }
  s1 --> sc1 --> sc2 --> p1 --> p2 --> d0
  d0 -->|"No"| em --> g3
  d0 -->|"Yes"| r1
  r1 --> c1 & c2 & c3
  c1 --> p3
  c3 --> p3
  c2 --> p3
  p3 --> o1 --> g1
  r1 -.-> g2
  p1 -.-> g4
  d0 -->|"Yes"| d1
  sc1 -.-> t1
  d1 -->|"Yes"| sc3 --> c4 --> p5 --> d1
  d1 -->|"No"| e1
  sc3 -.-> p6
  d1 -.-> sc4 -.-> g5
  class s1 k_start
  class sc1,sc2,em,r1,sc3,sc4 k_screen
  class p1,p2,p3,p5,p6 k_process
  class d0,d1 k_decision
  class c1,c2,c3,c4 k_click
  class o1 k_overlay
  class g1,g2,g3,g4,g5 k_goto
  class e1 k_end
  class t1 k_toast
  style gRow fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Requests table › Read a row: bars, clock and what happens next

What each cell of a row means. The bars and the clock follow different rules for a normal request and for a denial (an ID that starts with D-). Nothing in these cells is a button except the case ID and Open. Case, Payer, Where it is, Clock and At stake can be sorted from their headings.

Route: `/dashboard`

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
  s1@{ shape: stadium, label: "A row in the Requests table" }
  c1@{ shape: curv-trap, label: "<b>Case</b><br/>Underlined ID, e.g. 'R-1042', and the request type, e.g. 'Admission'" }
  c2@{ shape: curv-trap, label: "<b>Payer</b><br/>Short name: 'Summit Medicaid', 'Cardinal', 'Beacon PPO', 'Harborview MA', 'Lakeshore', 'Evergreen'<br/>Program under it: 'Residential 3.5', 'IOP', 'PHP', 'Detox'" }
  d1@{ shape: diam, label: "Is it a denial? (ID starts with D-)" }
  w1@{ shape: curv-trap, label: "<b>Where it is</b><br/>Chip such as 'Info requested' and four bars<br/>'Prepared, Received, In review, Decided'" }
  w2@{ shape: curv-trap, label: "<b>Where it is</b><br/>Chip such as 'Call booked' and four bars<br/>'Call, Appeal 1, Appeal 2, External'" }
  w3@{ shape: rect, label: "<b>Bars: done are green, the current one is dark green (ochre when the chip is amber), later ones are grey</b><br/>Hover shows 'Progress: Prepared, Received, In review, Decided. Now at In review.' or 'Route: Call, Appeal 1, Appeal 2, External. Now at Call.'" }
  subgraph gClock ["Clock column"]
  k1@{ shape: diam, label: "Does the row carry a fixed note?" }
  k2@{ shape: curv-trap, label: "<b>Note, e.g. 'decision 11/02'</b><br/>Under it 'filed 10/05'" }
  k3@{ shape: diam, label: "Is there a deadline (an open denial)?" }
  k4@{ shape: diam, label: "How much time is left?" }
  k5@{ shape: curv-trap, label: "'window closed'" }
  k6@{ shape: curv-trap, label: "<b>'36 h left' in red</b><br/>Under 2 days; under it e.g. 'peer-to-peer window'" }
  k7@{ shape: curv-trap, label: "<b>'3 days left' in ochre</b><br/>Under 7 days; under it 'to resubmit' or 'to file'" }
  k8@{ shape: curv-trap, label: "'12 days left' in plain text" }
  k9@{ shape: diam, label: "Is the stage Decided? (an approval)" }
  k10@{ shape: curv-trap, label: "<b>'today'</b><br/>Under it 'approved 1 h 30 m ago'" }
  k11@{ shape: diam, label: "How long in this stage compared with typical?" }
  k12@{ shape: curv-trap, label: "<b>'1 d 14 h' and 'typical 1 d'</b><br/>Over 1.5 × typical adds ochre 'late'" }
  k13@{ shape: curv-trap, label: "<b>'4 d 12 h' and 'typical 2 d'</b><br/>Over 2 × typical adds red 'very late'" }
  k14@{ shape: curv-trap, label: "<b>'1 h 12 m' and 'typical 2 h'</b><br/>Within typical, plain text" }
  end
  a1@{ shape: curv-trap, label: "<b>At stake</b><br/>Money asked for, e.g. '$22.4K'" }
  n1@{ shape: curv-trap, label: "<b>What happens next</b><br/>Agent badge and a line, e.g. 'Needs your input. Scribe has a question' or 'Navigator checks again in 5 minutes'<br/>An approval says 'Write-back is off in EMR Connect' instead of 'Write-back waits for you' while write-back is off" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Order, rows and paging" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Header › Check all now and the demo clock" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Sort the rows" }
  s1 --> c1 --> c2 --> d1
  d1 -->|"No"| w1 --> w3
  d1 -->|"Yes"| w2 --> w3
  w3 --> k1
  k1 -->|"Yes"| k2 --> a1
  k1 -->|"No"| k3
  k3 -->|"Yes"| k4
  k4 -->|"Zero or less"| k5 --> a1
  k4 -->|"Under 2 days"| k6 --> a1
  k4 -->|"2 to 7 days"| k7 --> a1
  k4 -->|"7 days or more"| k8 --> a1
  k3 -->|"No"| k9
  k9 -->|"Yes"| k10 --> a1
  k9 -->|"No"| k11
  k11 -->|"Over 1.5 times"| k12 --> a1
  k11 -->|"Over 2 times"| k13 --> a1
  k11 -->|"Within typical"| k14 --> a1
  a1 --> n1 --> g1
  k11 -.-> g2
  s1 -.-> g3
  class s1 k_start
  class c1,c2,w1,w2,k2,k5,k6,k7,k8,k10,k12,k13,k14,a1,n1 k_screen
  class d1,k1,k3,k4,k9,k11 k_decision
  class w3 k_process
  class g1,g2,g3 k_goto
  style gClock fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Requests table › Sort the rows

Five headings of the Requests table sort the rows. Each is a button, so the keyboard works too. A heading goes ascending, then descending, then back to the app's own order. The sort is not saved in the address.

Route: `/dashboard`

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>Headings of the 'Requests' table" }
  h1@{ shape: curv-trap, label: "<b>Five headings can sort</b><br/>Case, Payer, Where it is, Clock, At stake<br/>Each shows a small up and down arrow" }
  c1@{ shape: trap-t, label: "<b>Click a heading</b><br/>Or Tab to it and press Enter or Space" }
  d1@{ shape: diam, label: "Is this heading already the sorted one?" }
  p1@{ shape: rect, label: "<b>No: the sort starts on this heading, ascending</b><br/>The arrow points up; the heading is marked ascending for a screen reader" }
  d2@{ shape: diam, label: "Which way is it sorted now?" }
  p2@{ shape: rect, label: "<b>Ascending, so the next click sorts descending</b><br/>The arrow points down" }
  p3@{ shape: rect, label: "<b>Descending, so the next click clears the sort</b><br/>Back to the app's own order<br/>Needs you first, then very late, late, denials with under 2 days left, the rest" }
  p4@{ shape: rect, label: "Rows that tie keep the app's own order" }
  p5@{ shape: rect, label: "Table goes back to its first 8 rows" }
  sc@{ shape: curv-trap, label: "<b>Rows in the new order</b><br/>'Showing 8 of 40'" }
  subgraph gKeys ["What each heading sorts by"]
  k1@{ shape: curv-trap, label: "<b>Case</b><br/>The ID, A to Z with numbers in order: D-3272 before D-3279, R-0870 before R-1021" }
  k2@{ shape: curv-trap, label: "<b>Payer</b><br/>The short name shown in the row, A to Z: Beacon PPO, Cardinal, Evergreen, Harborview MA, Lakeshore, Summit Medicaid" }
  k3@{ shape: curv-trap, label: "<b>Where it is</b><br/>The stage: Preparing, Received, Under review, Info requested, Approved, then Appeal or call" }
  k4@{ shape: curv-trap, label: "<b>Clock</b><br/>The number in the cell: time left for a denial with a deadline, otherwise time in stage<br/>Rows with a fixed note such as 'decision 11/02' stay last either way" }
  k5@{ shape: curv-trap, label: "<b>At stake</b><br/>The money asked for, smallest first when ascending" }
  end
  p6@{ shape: rect, label: "<b>Filters, the stage tiles and 'Clear filters' keep the sort</b><br/>Leaving the page or reloading clears it" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Order, rows and paging" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Read a row: bars, clock and what happens next" }
  s1 --> h1 --> c1 --> d1
  d1 -->|"No"| p1 --> p4
  d1 -->|"Yes"| d2
  d2 -->|"Ascending"| p2 --> p4
  d2 -->|"Descending"| p3 --> p5
  p4 --> p5 --> sc
  sc --> p6 --> g1
  h1 --> k1 & k2 & k3 & k4 & k5
  k4 -.-> g2
  class s1 k_start
  class h1,sc,k1,k2,k3,k4,k5 k_screen
  class c1 k_click
  class d1,d2 k_decision
  class p1,p2,p3,p4,p5,p6 k_process
  class g1,g2 k_goto
  style gKeys fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Request drawer › Open and read a request

The drawer is one scroll, with no tabs. It opens from a row, a case ID, 'Open', or a link with ?request=ID, and shows who holds the request, its history and what is next. The sections change with the request's stage.

Route: `/dashboard?request=P-1499`

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
  s1@{ shape: stadium, label: "Click a row, a case ID or 'Open' in the Requests table" }
  s2@{ shape: stadium, label: "<b>Follow a link with ?request=ID</b><br/>A notification, 'See on the Dashboard', 'Open R-xxxx' on another page" }
  p1@{ shape: rect, label: "<b>Address gets ?request=ID</b><br/>The page is dimmed behind the drawer" }
  o1@{ shape: win-pane, label: "<b>Request drawer slides in from the right</b><br/>Header, body, footer" }
  subgraph gHead ["Header"]
  h1@{ shape: curv-trap, label: "<b>Title 'P-1499 · Harborview MA'</b><br/>Subtitle 'PHP continued stay · sent Sun 4:36 pm' or '... · not sent yet'" }
  h2@{ shape: curv-trap, label: "<b>Stage chip on the right</b><br/>e.g. 'Info requested'" }
  end
  subgraph gBody ["Body, from the top down"]
  b1@{ shape: curv-trap, label: "<b>Action box (only some requests)</b><br/>'Needs your input', 'Packet is drafting the answer' or 'Approved. Write-back waits for you'<br/>The last one shows only while write-back is on in EMR Connect; otherwise a calm line says it is off" }
  b2@{ shape: curv-trap, label: "<b>Facts</b><br/>Patient 'E.S., 42', At stake '$8.2K', Held by (agent and next step)" }
  d1@{ shape: diam, label: "Does the request have a chance figure?" }
  b3@{ shape: curv-trap, label: "<b>'Approval chance' or, for a denial, 'Chance of winning'</b><br/>'74% · Moderate · likely 66 to 82% · 219 similar cases'" }
  b4@{ shape: curv-trap, label: "<b>Sent</b><br/>'Not yet', 'through the payer's portal', 'by fax' or 'by phone'" }
  b5@{ shape: curv-trap, label: "<b>History</b><br/>Every event, oldest first, or 'No events yet.'<br/>Green dot with the time; dashed dot with 'Scheduled · time'" }
  b6@{ shape: curv-trap, label: "<b>Clock banner</b><br/>One line on when the next check happens" }
  b7@{ shape: win-pane, label: "<b>Demo controls</b><br/>Dashed box: pretend the payer answered<br/>Only the replies still ahead of the request show" }
  end
  d2@{ shape: diam, label: "Which message does the banner show?" }
  m1@{ shape: odd, label: "<b>Received or Under review</b><br/>'Next automatic check in 30 minutes.'" }
  m2@{ shape: odd, label: "<b>Preparing</b><br/>'Not sent yet. Automatic checks start once the request is signed and sent.'" }
  m3@{ shape: odd, label: "<b>Info requested</b><br/>'Waiting on you, not on the payer. Automatic checks resume once the answer is sent.'" }
  m4@{ shape: odd, label: "<b>Decided</b><br/>'Decided. Cadence booked the next review, so no more checks are needed.'" }
  m5@{ shape: odd, label: "<b>Appeal or call, next step starts with 'Waiting'</b><br/>'Navigator checks again every 2 hours until the decision date.'" }
  m6@{ shape: odd, label: "<b>Appeal or call, any other</b><br/>'Advocate has the next step. Open Denial Intelligence for the brief.'" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Needs you and write-back boxes" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Demo controls: the payer answers" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Check now, Open case and closing" }
  s1 --> p1
  s2 --> p1
  p1 --> o1 --> h1 --> h2
  h2 --> b1 --> b2 --> d1
  d1 -->|"Yes"| b3 --> b4
  d1 -->|"No"| b4
  b4 --> b5 --> b6 --> d2
  d2 -->|"Received, Under review"| m1
  d2 -->|"Preparing"| m2
  d2 -->|"Info requested"| m3
  d2 -->|"Decided"| m4
  d2 -->|"Appeal or call, next starts with Waiting"| m5
  d2 -->|"Appeal or call, anything else"| m6
  b6 --> b7
  b1 -.-> g1
  b7 --> g2
  h2 -.-> g3
  class s1,s2 k_start
  class p1 k_process
  class o1,b7 k_overlay
  class h1,h2,b1,b2,b3,b4,b5,b6 k_screen
  class d1,d2 k_decision
  class m1,m2,m3,m4,m5,m6 k_toast
  class g1,g2,g3 k_goto
  style gHead fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gBody fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Request drawer › Check now, Open case and closing

The footer of the drawer holds up to three buttons, and the drawer can be closed four ways. 'Check now' only fakes a payer check in the demo; it never moves a request to another stage.

Route: `/dashboard?request=R-1021`

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
  s1@{ shape: stadium, label: "Request drawer is open" }
  d1@{ shape: diam, label: "Is the stage Preparing? (not sent yet)" }
  f1@{ shape: curv-trap, label: "<b>Footer: 'Open case' only</b><br/>No 'Check now' because nothing has been sent" }
  f2@{ shape: curv-trap, label: "Footer: 'Check now' (green), 'Open case'" }
  d2@{ shape: diam, label: "Is it a denial? (ID starts with D-)" }
  f3@{ shape: curv-trap, label: "Footer also has 'Open in Denial Intelligence'" }
  c1@{ shape: trap-t, label: "Click 'Check now'" }
  p1@{ shape: rect, label: "Button shows a spinner for 1.2 seconds" }
  a1@{ shape: hex, label: "Navigator checks the payer (demo: simulated)" }
  w1@{ shape: cyl, label: "<b>History gets 'Navigator checked: under review'</b><br/>The chip text in lower case" }
  d3@{ shape: diam, label: "Is the stage Received or Under review?" }
  w2@{ shape: cyl, label: "What happens next becomes 'Navigator checks again in 30 minutes'" }
  t1@{ shape: odd, label: "<b>'Navigator checked'</b><br/>'R-1021 is still under review at Cardinal. It checks again in 30 minutes.'" }
  e1@{ shape: stadium, label: "<b>Drawer stays open</b><br/>No stage changes" }
  c2@{ shape: trap-t, label: "Click 'Open case'" }
  g1@{ shape: subproc, label: "<b>Continues in: Authorizations › Case page</b><br/>/authorizations/case/ followed by the case ID" }
  c3@{ shape: trap-t, label: "Click 'Open in Denial Intelligence'" }
  g2@{ shape: subproc, label: "<b>Continues in: Denial Intelligence › Open denials</b><br/>/denials?id=D-3318" }
  subgraph gClose ["Closing the drawer"]
  x1@{ shape: trap-t, label: "Click the X 'Close'" }
  x2@{ shape: trap-t, label: "Press Escape" }
  x3@{ shape: trap-t, label: "Click the dimmed page outside the drawer" }
  x4@{ shape: trap-t, label: "Browser Back (when a click opened it)" }
  end
  p2@{ shape: rect, label: "<b>?request is removed from the address</b><br/>Filters and paging stay as they were" }
  e2@{ shape: stadium, label: "Drawer closed, table as before" }
  p3@{ shape: rect, label: "<b>Escape closes one layer at a time</b><br/>A pop-up opened from the drawer closes first; the next Escape closes the drawer" }
  s1 --> d1
  d1 -->|"Yes"| f1
  d1 -->|"No"| f2
  f1 --> d2
  f2 --> d2
  d2 -->|"Yes"| f3
  d2 -->|"No"| c2
  f3 --> c3 --> g2
  f3 --> c2
  f2 --> c1 --> p1 --> a1 --> w1 --> d3
  d3 -->|"Yes"| w2 --> t1
  d3 -->|"No"| t1
  t1 --> e1
  c2 --> g1
  f1 --> c2
  s1 --> x1 & x2 & x3 & x4
  x1 & x2 & x3 & x4 --> p2 --> e2
  x2 -.-> p3
  class s1 k_start
  class d1,d2,d3 k_decision
  class f1,f2,f3 k_screen
  class c1,c2,c3,x1,x2,x3,x4 k_click
  class p1,p2,p3 k_process
  class a1 k_agent
  class w1,w2 k_store
  class t1 k_toast
  class e1,e2 k_end
  class g1,g2 k_goto
  style gClose fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Request drawer › Needs you and write-back boxes

The coloured box at the top of the drawer appears only when a person has something to do. There are three kinds: review a drafted answer, wait for the draft, and approve a write-back. The write-back box shows only while write-back is on in EMR Connect; when it is off, one calm line takes its place. Any other request shows no box.

Route: `/dashboard?request=I-2218`

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
  s1@{ shape: stadium, label: "Request drawer opens" }
  d1@{ shape: diam, label: "Is the stage Info requested?" }
  d2@{ shape: diam, label: "Has Packet finished the draft? (the request needs you)" }
  d3@{ shape: diam, label: "Is it an approval whose next step says 'Write-back'?" }
  x1@{ shape: stadium, label: "<b>No box</b><br/>The drawer starts with the facts" }
  b1@{ shape: win-pane, label: "<b>Amber box 'Needs your input'</b><br/>'The payer asked for more information. Packet drafted the answer from the chart and Integrity checked it.'" }
  c1@{ shape: trap-t, label: "Click 'Review the answer'" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Answer a payer information request" }
  b2@{ shape: win-pane, label: "<b>Grey box 'Packet is drafting the answer'</b><br/>'Nothing for you to review yet. You will get a notification as soon as the draft is ready.'" }
  c2@{ shape: trap-t, label: "Click 'Check on the draft'" }
  p1@{ shape: rect, label: "Button shows a spinner for 1.3 seconds" }
  a1@{ shape: hex, label: "Packet finishes the draft" }
  w1@{ shape: cyl, label: "<b>Request now needs you</b><br/>What happens next: 'Packet drafted the answer. Waiting for your review'" }
  w2@{ shape: cyl, label: "History gets 'Packet drafted the answer. Waiting for your review'" }
  t1@{ shape: odd, label: "<b>'The draft is ready'</b><br/>'Packet finished the answer for I-2218. Review it, then sign and send.'" }
  p2@{ shape: rect, label: "<b>Box switches to 'Needs your input'</b><br/>The table row shows the new next step" }
  d4@{ shape: diam, label: "Is write-back on for a connected system in EMR Connect?" }
  b3@{ shape: win-pane, label: "<b>Green box 'Approved. Write-back waits for you'</b><br/>'Cadence updated the ledger. The approval number and dates go to the EMR only after you confirm.'" }
  c3@{ shape: trap-t, label: "Click 'Approve write-back'" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Approve the write-back" }
  b4@{ shape: win-pane, label: "<b>Calm line, no button</b><br/>'Write-back is off for your records system. Turn it on in EMR Connect.'" }
  c4@{ shape: trap-t, label: "Click 'Turn it on in EMR Connect.'" }
  g3@{ shape: subproc, label: "Continues in: EMR Connect › Manage › Open the Manage drawer" }
  p3@{ shape: rect, label: "<b>The row's 'What happens next' and 'Held by' say 'Write-back is off in EMR Connect'</b><br/>Turning it on in EMR Connect brings the green box back" }
  subgraph gSeed ["Demo examples"]
  e1@{ shape: rect, label: "<b>P-1499: draft ready</b><br/>Needs your input" }
  e2@{ shape: rect, label: "<b>I-2218 and R-0975: still drafting</b><br/>Use 'Check on the draft'" }
  e3@{ shape: rect, label: "R-0951: approved, write-back waiting" }
  e4@{ shape: rect, label: "A Received or Under review request: 'Asks for information' in Demo controls gives 'Needs your input' at once" }
  end
  s1 --> d1
  d1 -->|"Yes"| d2
  d1 -->|"No"| d3
  d2 -->|"Yes"| b1 --> c1 --> g1
  d2 -->|"No"| b2 --> c2 --> p1 --> a1 --> w1 --> w2 --> t1 --> p2
  p2 --> b1
  d3 -->|"Yes"| d4
  d4 -->|"Yes"| b3 --> c3 --> g2
  d4 -->|"No"| b4 --> c4 --> g3
  b4 -.-> p3
  d3 -->|"No"| x1
  d2 -.-> e1
  b2 -.-> e2
  b3 -.-> e3
  b1 -.-> e4
  class s1 k_start
  class d1,d2,d3,d4 k_decision
  class x1 k_endx
  class b1,b2,b3,b4 k_overlay
  class c1,c2,c3,c4 k_click
  class g1,g2,g3 k_goto
  class p1,p2,p3,e1,e2,e3,e4 k_process
  class a1 k_agent
  class w1,w2 k_store
  class t1 k_toast
  style gSeed fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Request drawer › Approve the write-back

After a payer approves, the approval number and dates go to the EMR only when a person confirms, and only while write-back is on in EMR Connect. The pop-up shows exactly three things. In the demo the EMR write is simulated and changes only the request's history.

Route: `/dashboard?request=R-0951`

Real world: writing the reference number, units and dates back to the EMR is a confirmed step. Demo only: the EMR write is simulated.

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
  s1@{ shape: stadium, label: "<b>Click 'Approve write-back' in the green box</b><br/>The box shows only while write-back is on in EMR Connect" }
  o1@{ shape: win-pane, label: "<b>Pop-up 'Approve the write-back'</b><br/>'R-0951 · Evergreen'<br/>'EMR Connect will write only these three things to the chart. No notes, diagnoses or identifiers are written.'" }
  sc@{ shape: curv-trap, label: "<b>Three facts</b><br/>Approval number 'PA-26-102944'<br/>Approved '14 days'<br/>Dates '10/20 to 11/3'" }
  p0@{ shape: rect, label: "Amount by program: Residential 3.5 14 days, PHP 10 days, Detox 5 days, IOP 24 units over 14 days" }
  c1@{ shape: trap-t, label: "Click 'Write to the EMR'" }
  p1@{ shape: rect, label: "<b>Button shows a spinner for 1.1 seconds</b><br/>'Cancel' is disabled; the X, the dimmed area and Escape do nothing" }
  x1@{ shape: st-rect, label: "<b>EMR receives the approval number and dates</b><br/>(demo: simulated)" }
  w1@{ shape: cyl, label: "What happens next becomes 'Next review booked. Written to the EMR'" }
  w2@{ shape: cyl, label: "<b>History gets 'You confirmed the write-back'</b><br/>and 'Cadence wrote the approval number (PA-26-102944) and the dates to the EMR'" }
  t1@{ shape: odd, label: "<b>'Written to the EMR'</b><br/>'PA-26-102944 and the approved dates are in the chart. Nothing else was written.'" }
  p2@{ shape: rect, label: "<b>Pop-up closes</b><br/>The green box disappears because the next step no longer says Write-back" }
  e1@{ shape: stadium, label: "Request stays Approved, in Decided today" }
  c2@{ shape: trap-t, label: "Click 'Cancel'" }
  c3@{ shape: trap-t, label: "Click the X 'Close'" }
  c4@{ shape: trap-t, label: "Click the dimmed area" }
  e2@{ shape: stadium, label: "<b>Pop-up closes</b><br/>Nothing is written; the green box stays" }
  c5@{ shape: trap-t, label: "Press Escape" }
  p3@{ shape: rect, label: "<b>Escape closes only the pop-up</b><br/>The drawer stays open; a second Escape closes it" }
  e3@{ shape: stadium, label: "<b>Back in the drawer</b><br/>Nothing is written; the green box stays" }
  p4@{ shape: rect, label: "<b>A write that has started always finishes and its toast appears</b><br/>Even if the drawer is closed in the meantime (browser Back)" }
  s1 --> o1 --> sc --> p0
  sc --> c1 --> p1 --> x1 --> w1 --> w2 --> t1 --> p2 --> e1
  sc --> c2 & c3 & c4
  c2 & c3 & c4 --> e2
  sc --> c5 --> p3 --> e3
  p1 -.-> p4
  class s1 k_start
  class o1 k_overlay
  class sc k_screen
  class p0,p1,p2,p3,p4 k_process
  class c1,c2,c3,c4,c5 k_click
  class x1 k_ext
  class w1,w2 k_store
  class t1 k_toast
  class e1,e2,e3 k_end
```

## Dashboard › Request drawer › Answer a payer information request

When a payer asks for more information, Packet drafts the answer from the chart, Integrity checks it, and a person reads it and signs. Nothing leaves before the signature. In the demo the payer's ask is seeded or triggered by a Demo control, and the send is simulated.

Route: `/dashboard?request=P-1499`

Real world: an information request is tracked, and a clinical supplement passes the clinician sign-off gate before it goes out. Demo only: one click on 'Sign and send answer' stands in for that, and the send is simulated.

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
  s0@{ shape: stadium, label: "A payer wants more information on a request" }
  x1@{ shape: st-rect, label: "<b>Payer asks for more information</b><br/>through its portal, fax or phone (demo: seeded for P-1499, or the Demo control 'Asks for information')" }
  a1@{ shape: hex, label: "<b>Packet drafts the answer from the chart</b><br/>Integrity checks every sentence against it" }
  w1@{ shape: cyl, label: "<b>Request becomes Info requested (amber)</b><br/>Needs you; next step 'Packet drafted the answer. Waiting for your review'" }
  t1@{ shape: odd, label: "<b>Notification 'Payer asked for info'</b><br/>'Harborview MA wants more on P-1499. Packet drafted the answer.'" }
  sc@{ shape: curv-trap, label: "<b>Dashboard</b><br/>'Info requested' tile goes up and the sidebar Dashboard badge counts it<br/>The row floats to the top: it needs you" }
  s1@{ shape: stadium, label: "Click the row, or the notification, then the amber box 'Needs your input'" }
  c1@{ shape: trap-t, label: "Click 'Review the answer'" }
  o1@{ shape: win-pane, label: "<b>Pop-up 'Packet's answer for P-1499'</b><br/>'Harborview MA asked for more information · PHP'<br/>Drafted by Packet and checked by Integrity" }
  subgraph gModal ["Inside the pop-up, from the top down"]
  m1@{ shape: curv-trap, label: "<b>'What the payer asked for'</b><br/>Numbered list of the items asked" }
  d1@{ shape: diam, label: "Which program is the request for?" }
  r1@{ shape: doc, label: "<b>Residential 3.5</b><br/>Last 14 days of therapy notes, ASAM ratings, medication changes, step-down plan" }
  r2@{ shape: doc, label: "<b>PHP</b><br/>Daily attendance for 10 program days, latest psychiatric note, depression and anxiety scores, step-down plan to IOP" }
  r3@{ shape: doc, label: "<b>IOP</b><br/>Attendance for 4 weeks, urine screens, scale scores, work or school schedule" }
  r4@{ shape: doc, label: "<b>Detox</b><br/>Withdrawal scores for 72 hours, vital signs and medication, plan for the next level of care" }
  m2@{ shape: doc, label: "<b>'The drafted answer'</b><br/>One paragraph per item, each pointing to an entry in the chart, then a closing line" }
  m3@{ shape: doc, label: "<b>'Attached from the chart'</b><br/>File names with page counts" }
  m4@{ shape: odd, label: "<b>'Integrity checked every sentence against the chart'</b><br/>'4 of 4 checks passed. Navigator sends the answer through the payer's portal as soon as you sign. Nothing leaves before then.'" }
  end
  d2@{ shape: diam, label: "Does the person send it?" }
  c2@{ shape: trap-t, label: "Click 'Not yet'" }
  c3@{ shape: trap-t, label: "Click the X, click the dimmed area, or press Escape" }
  p0@{ shape: rect, label: "<b>Pop-up closes</b><br/>The request is unchanged and still needs you" }
  p1@{ shape: rect, label: "<b>Escape closes only the pop-up</b><br/>The drawer stays; a second Escape closes it" }
  e1@{ shape: stadium, label: "<b>Back to the drawer or the table</b><br/>Still 'Needs your input'" }
  c4@{ shape: trap-t, label: "Click 'Sign and send answer'" }
  p2@{ shape: rect, label: "Pop-up closes" }
  w2@{ shape: cyl, label: "<b>Request becomes Under review</b><br/>No longer needs you; Navigator holds it; next step 'Navigator checks again in 30 minutes'" }
  w3@{ shape: cyl, label: "<b>History gets 'You reviewed the answer and sent it' and 'Navigator sent the answer through the payer's portal'</b><br/>and a dashed 'Navigator checks again'" }
  t2@{ shape: odd, label: "<b>'Answer sent'</b><br/>'P-1499 is back under review.'" }
  x2@{ shape: st-rect, label: "Payer receives the answer (demo: simulated)" }
  wt@{ shape: delay, label: "Payer reviews again" }
  e2@{ shape: stadium, label: "<b>Drawer shows Under review</b><br/>Banner: 'Next automatic check in 30 minutes.'" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Demo controls: the payer answers" }
  s0 --> x1 --> a1 --> w1 --> t1 --> sc
  s1 --> c1 --> o1 --> m1 --> d1
  d1 -->|"Residential 3.5"| r1 --> m2
  d1 -->|"PHP"| r2 --> m2
  d1 -->|"IOP"| r3 --> m2
  d1 -->|"Detox"| r4 --> m2
  m2 --> m3 --> m4 --> d2
  d2 -->|"No, not yet"| c2 --> p0
  d2 -->|"No, close it"| c3 --> p0
  c3 -.-> p1
  p0 --> e1
  d2 -->|"Yes"| c4 --> p2 --> w2 --> w3 --> t2 --> x2 --> wt --> e2
  wt -.-> g1
  sc -.-> s1
  class s0,s1 k_start
  class x1,x2 k_ext
  class a1 k_agent
  class w1,w2,w3 k_store
  class t1,m4,t2 k_toast
  class sc,m1 k_screen
  class c1,c2,c3,c4 k_click
  class o1 k_overlay
  class d1,d2 k_decision
  class r1,r2,r3,r4,m2,m3 k_doc
  class p0,p1,p2 k_process
  class e1,e2 k_end
  class wt k_wait
  class g1 k_goto
  style gModal fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Request drawer › Demo controls: the payer answers

A dashed 'Demo controls' box at the end of every drawer lets the presenter pretend the payer replied. Nothing is sent anywhere. A request only moves forward, so the box offers only the replies still ahead of it. This diagram covers when buttons show and the replies that keep a request alive; approve, approve part and deny are in the next diagram.

Route: `/dashboard?request=R-1021`

Demo only: in real life the payer answers through its portal, fax or phone and Navigator finds out by checking. These buttons fake that answer; nothing is sent.

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
  s1@{ shape: stadium, label: "<b>Scroll to 'Demo controls' at the end of the drawer</b><br/>A dashed box" }
  d1@{ shape: diam, label: "Is the stage Preparing? (not sent yet)" }
  d2@{ shape: diam, label: "Is it a denial? (ID starts with D-)" }
  d3@{ shape: diam, label: "Which stage is the request in?" }
  m1@{ shape: odd, label: "'It has not been sent yet. Sign and send it from Case Manager first.'" }
  m2@{ shape: odd, label: "'A denial follows its own route in Denial Intelligence.'" }
  m3@{ shape: odd, label: "'The payer has already decided this request.'" }
  m4@{ shape: odd, label: "'Pretend the payer answered this request. Nothing is sent anywhere.'" }
  x1@{ shape: stadium, label: "All six buttons are shown but disabled" }
  x3@{ shape: stadium, label: "No buttons are shown" }
  p1@{ shape: rect, label: "<b>Received</b><br/>'Under review', 'Asks for information', 'Approves', 'Approves part', 'Denies'" }
  p2@{ shape: rect, label: "<b>Under review</b><br/>'Asks for information', 'Approves', 'Approves part', 'Denies'" }
  p3@{ shape: rect, label: "<b>Info requested</b><br/>'Approves', 'Approves part', 'Denies'" }
  p0@{ shape: rect, label: "<b>'Payer received it' is never shown</b><br/>Every sent request is already Received, and a reply never moves a request backward" }
  x2@{ shape: st-rect, label: "<b>Payer replies through its portal, fax or phone</b><br/>(demo: simulated by these buttons)" }
  c2@{ shape: trap-t, label: "Click 'Under review'" }
  w2@{ shape: cyl, label: "<b>Stage Under review, bars at In review</b><br/>Time in stage restarts<br/>History 'Navigator checked: under review' and a dashed 'Caller will phone the payer if it is still pending'" }
  t2@{ shape: odd, label: "<b>'Demo: Cardinal has it under review'</b><br/>'The stage counts and the table updated.'<br/>The payer's short name, here Cardinal" }
  c3@{ shape: trap-t, label: "Click 'Asks for information'" }
  w3@{ shape: cyl, label: "<b>Stage Info requested (amber), needs you</b><br/>Packet holds it; next step 'Packet drafted the answer. Waiting for your review'<br/>History 'The payer asked for more information'" }
  n1@{ shape: odd, label: "<b>Notification 'Payer asked for info'</b><br/>'The payer wants more on R-1021. Packet drafted the answer.'" }
  t3@{ shape: odd, label: "<b>'Demo: Cardinal asks for information'</b><br/>'The stage counts, the table and the notifications updated.'" }
  sc@{ shape: curv-trap, label: "<b>Dashboard behind the drawer</b><br/>The tile counts, the row and its chip, bars and clock update at once<br/>In a filtered list the row may drop out; the drawer stays open" }
  sd@{ shape: curv-trap, label: "<b>Drawer updates in place</b><br/>Chip, action box, history, banner and the offered buttons follow the new stage" }
  c4@{ shape: trap-t, label: "Click 'Approves', 'Approves part' or 'Denies'" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Demo controls: approve, approve part or deny" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Answer a payer information request" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Needs you and write-back boxes" }
  s1 --> d1
  d1 -->|"Yes"| m1 --> x1
  d1 -->|"No"| d2
  d2 -->|"Yes"| m2 --> x1
  d2 -->|"No"| d3
  d3 -->|"Decided"| m3 --> x3
  d3 -->|"Received"| m4
  d3 -->|"Under review"| m4
  d3 -->|"Info requested"| m4
  m4 --> x2
  x2 --> p1 & p2 & p3
  p1 -.-> p0
  p1 --> c2 --> w2 --> t2 --> sc
  p1 & p2 --> c3 --> w3 --> n1 --> t3 --> sc
  p1 & p2 & p3 --> c4 --> g1
  sc --> sd
  w3 -.-> g2
  sd -.-> g3
  class s1 k_start
  class d1,d2,d3 k_decision
  class m1,m2,m3,m4,t2,n1,t3 k_toast
  class x1,x3 k_endx
  class p1,p2,p3,p0 k_process
  class x2 k_ext
  class c2,c3,c4 k_click
  class w2,w3 k_store
  class sc,sd k_screen
  class g1,g2,g3 k_goto
```

## Dashboard › Request drawer › Demo controls: approve, approve part or deny

The three final payer answers and what the Dashboard shows afterwards. They are offered on a Received, Under review or Info requested request, and after one of them no more replies are offered. An approval stays on the Dashboard with a write-back waiting. A partial approval or a denial turns the request into a new D- number and hands it to Denial Intelligence.

Route: `/dashboard?request=R-1021`

Demo only: the payer's decision is simulated. Real rules: a decision is due in 7 days (72 hours when expedited), and a partial approval or denial goes to the denial route, starting with a peer-to-peer call.

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
  s1@{ shape: stadium, label: "Payer decides (demo: the presenter clicks a Demo control)" }
  x1@{ shape: st-rect, label: "<b>Payer decides through its portal, fax or phone</b><br/>(demo: simulated)" }
  c1@{ shape: trap-t, label: "Click 'Approves'" }
  c2@{ shape: trap-t, label: "Click 'Approves part'" }
  c3@{ shape: trap-t, label: "Click 'Denies'" }
  subgraph gA ["Approved"]
  a1@{ shape: cyl, label: "<b>Stage Decided today, chip 'Approved' (green), bars full</b><br/>Cadence holds it; next step 'Next review booked. Write-back waits for you'<br/>History 'The payer approved the request' and 'Cadence updated the ledger and booked the next review'" }
  an@{ shape: odd, label: "<b>Notification 'Approved': 'R-1021 was approved. Write-back waits for you.'</b><br/>Toast 'Demo: Cardinal approved it'<br/>'The stage counts, the table and the notifications updated.'" }
  as@{ shape: curv-trap, label: "<b>Dashboard after an approval</b><br/>'Decided today' goes up by one, 'Under review' goes down<br/>The Decided today headline counts it as approved" }
  ab@{ shape: win-pane, label: "<b>Drawer shows the green box 'Approved. Write-back waits for you'</b><br/>With write-back off in EMR Connect, a calm line instead" }
  qk@{ shape: rect, label: "<b>No reply is offered any more</b><br/>Demo controls say 'The payer has already decided this request.'<br/>So the request cannot be pushed back and stay counted in Decided today" }
  end
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Approve the write-back" }
  subgraph gD ["Denied or partly approved"]
  d1@{ shape: rect, label: "<b>Request gets a new number: D-3319, then D-3320 and so on</b><br/>The old number R-1021 is gone; the case stays the same" }
  d2@{ shape: cyl, label: "<b>Stage Appeal or call, type 'Peer-to-peer', chip 'Call booked'</b><br/>Advocate holds it; chance 61%; 3 days to the call window<br/>Next step 'Denied today. Advocate booked a peer-to-peer call'" }
  d3@{ shape: cyl, label: "<b>History 'The payer denied the request' or 'The payer approved only part of the request'</b><br/>then 'Advocate opened the denial and booked a peer-to-peer call'" }
  dn@{ shape: odd, label: "<b>Notification 'Denied' or 'Partly approved'</b><br/>'R-1021 became D-3319. Advocate booked a call.'" }
  dt@{ shape: odd, label: "<b>Toast 'The payer denied it' or 'The payer approved part of it'</b><br/>'It is now D-3319 in Denial Intelligence.'" }
  d4@{ shape: rect, label: "<b>Drawer switches to D-3319 in place (the address is replaced)</b><br/>Opening R-1021 again closes quietly: that number no longer exists" }
  ds@{ shape: curv-trap, label: "<b>Dashboard after a denial</b><br/>'Appeal or call' and 'Decided today' each go up by one; 'Under review' goes down<br/>Sidebar badge on Denial Intelligence goes up<br/>Its row shows 'Call booked' and '3 days left'<br/>A row hidden by the old stage filter leaves the table; the drawer stays open" }
  dd@{ shape: curv-trap, label: "<b>Drawer for D-3319</b><br/>Chip 'Call booked', 'Chance of winning 61%'<br/>Demo controls disabled: 'A denial follows its own route in Denial Intelligence.'<br/>Footer gains 'Open in Denial Intelligence'" }
  end
  g2@{ shape: subproc, label: "<b>Continues in: Denial Intelligence › Open denials</b><br/>/denials?id=D-3319" }
  g3@{ shape: subproc, label: "<b>Continues in: Authorizations › Case page</b><br/>The case number is unchanged" }
  s1 --> x1 --> c1 & c2 & c3
  c1 --> a1 --> an --> as --> ab --> g1
  ab --> qk
  c2 --> d1
  c3 --> d1
  d1 --> d2 --> d3 --> dn --> dt --> d4
  d4 --> ds
  d4 --> dd
  dd --> g2
  dd --> g3
  class s1 k_start
  class x1 k_ext
  class c1,c2,c3 k_click
  class a1,d2,d3 k_store
  class an,dn,dt k_toast
  class as,ds,dd k_screen
  class ab k_overlay
  class qk,d1,d4 k_process
  class g1,g2,g3 k_goto
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gD fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Payers at a glance › Read the table and pick a payer

The last card on the page. One row per payer, plus a totals row. A click on a payer row narrows the whole page to that payer; a second click clears it. The payer's name and 'Open Payers' lead to the Payers page. A link from Ask FLO scrolls the card into view.

Route: `/dashboard?payer=harborview`

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
  s1@{ shape: stadium, label: "Scroll to 'Payers at a glance'" }
  s2@{ shape: stadium, label: "<b>Follow 'Open Dashboard, By payer' in Ask FLO</b><br/>The address is /dashboard?focus=payers" }
  f1@{ shape: rect, label: "<b>Page scrolls to the card</b><br/>The card is outlined in green for about 2 seconds<br/>The ?focus part is then removed from the address" }
  sc1@{ shape: curv-trap, label: "<b>Card header</b><br/>'Payers at a glance'<br/>'Waiting now, how long decisions take, and how often they go your way. Click a row to narrow everything on this page.'<br/>On the right: 'Open Payers'" }
  d0@{ shape: diam, label: "Is Program or Request type set?" }
  t0@{ shape: odd, label: "<b>Sentence added to the header</b><br/>'Waiting counts follow your Program and Request type filters.'" }
  subgraph gCols ["Columns and rows"]
  r1@{ shape: curv-trap, label: "<b>Payer</b><br/>Name, e.g. 'Cardinal Health Plan', as a link, and its kind: 'Medicaid plan', 'Commercial', 'Medicare Advantage', 'Carve-out'" }
  r2@{ shape: curv-trap, label: "<b>Waiting</b><br/>Requests Received or Under review at that payer<br/>Follows Program and Request type, not Payer, Stage or dates" }
  r3@{ shape: curv-trap, label: "<b>Decision time</b><br/>'2.8 d' and 'typical 2 d'<br/>Ochre when the average is over 15 percent above typical" }
  r4@{ shape: curv-trap, label: "<b>Approved as asked</b><br/>'63%' with a small bar<br/>Green at 80 and above, ochre below" }
  r5@{ shape: curv-trap, label: "<b>Denied (30 d) and Info asks (30 d)</b><br/>Counts that rescale with the date range; the heading shows the number of days" }
  r6@{ shape: curv-trap, label: "<b>Reached by</b><br/>'Portal', 'Phone', 'Fax' or 'Portal and fax'" }
  r7@{ shape: curv-trap, label: "<b>Row order</b><br/>Cardinal Health Plan, Summit Medicaid HMO, Beacon PPO, Harborview MA, Lakeshore Behavioral, Evergreen" }
  r8@{ shape: curv-trap, label: "<b>Last row 'All payers'</b><br/>Sums of Waiting, Denied and Info asks; '-' elsewhere; not clickable" }
  end
  c1@{ shape: trap-t, label: "<b>Click a payer row (not its name)</b><br/>Or Tab to the row and press Enter or Space" }
  d1@{ shape: diam, label: "Is that payer already selected? (row tinted green)" }
  p1@{ shape: rect, label: "Payer filter set to that payer" }
  p2@{ shape: rect, label: "Payer filter goes back to 'All payers'" }
  w1@{ shape: cyl, label: "Filter 'payer'" }
  p3@{ shape: rect, label: "<b>Address gets ?payer=harborview, or loses it</b><br/>Table goes back to its first 8 rows" }
  sc2@{ shape: curv-trap, label: "<b>Page follows the payer</b><br/>Headline 'Harborview MA: 3 waiting, taking 3.1 days.'<br/>Tile counts and the requests table follow it; the Payer menu shows its name" }
  sc3@{ shape: curv-trap, label: "<b>Payers table keeps all six rows</b><br/>The chosen row is tinted green and marked selected<br/>Waiting counts do not change" }
  c2@{ shape: trap-t, label: "<b>Click the payer's name, e.g. 'Harborview MA'</b><br/>The filter does not change" }
  c3@{ shape: trap-t, label: "Click 'Open Payers'" }
  n2@{ shape: rect, label: "<b>Address becomes /payers/harborview</b><br/>A new history entry, so Back returns here" }
  n3@{ shape: rect, label: "Address becomes /payers" }
  g4@{ shape: subproc, label: "Continues in: Payers › Arrive on the page" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Headline › What the headline and sub line say" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Filters › Date range shortcuts, keys and the address" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Filters › Payer, Program, Request type and Stage" }
  g5@{ shape: subproc, label: "Continues in: Global shell › Top bar › Ask FLO › What FLO answers" }
  s1 --> sc1 --> d0
  s2 --> f1 --> sc1
  s2 -.-> g5
  d0 -->|"Yes"| t0 --> r1
  d0 -->|"No"| r1
  r1 --> r2 --> r3 --> r4 --> r5 --> r6 --> r7 --> r8
  r5 -.-> g2
  r8 --> c1
  c1 --> d1
  d1 -->|"No"| p1 --> w1
  d1 -->|"Yes"| p2 --> w1
  w1 --> p3
  p3 --> sc2 --> g1
  p3 --> sc3
  sc3 -.-> g3
  r1 --> c2 --> n2 --> g4
  sc1 --> c3 --> n3 --> g4
  class s1,s2 k_start
  class f1,p1,p2,p3,n2,n3 k_process
  class sc1,r1,r2,r3,r4,r5,r6,r7,r8,sc2,sc3 k_screen
  class d0,d1 k_decision
  class t0 k_toast
  class c1,c2,c3 k_click
  class w1 k_store
  class g4,g1,g2,g3,g5 k_goto
  style gCols fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```
