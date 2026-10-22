# Dashboard

The cockpit: lifecycle chips, what to do next, one table of authorizations with days in state, units, window and owner, and the request drawer.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/02-dashboard/`.

## Dashboard › Arrive › What the page shows

Four ways to land on the Dashboard, how the address and the viewer's sites are read, and the page from the top down: a small title, the Lifecycle, Do next and one table of authorizations. Each part continues in its own diagram.

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
  s1@{ shape: stadium, label: "<b>Click 'Dashboard' in the sidebar</b><br/>The badge counts Info requested at the sites in view" }
  s2@{ shape: stadium, label: "<b>Open the app at /</b><br/>The address / goes to /dashboard" }
  s3@{ shape: stadium, label: "<b>Follow a link with a request or a filter</b><br/>A notification, Ask FLO, a Do next button, or a button on another page" }
  s4@{ shape: stadium, label: "Demo menu › Click 'Reset demo data'" }
  t1@{ shape: odd, label: "<b>'Demo data reset'</b><br/>'Everything is back to the starting point.'" }
  p1@{ shape: rect, label: "<b>Page opens and reads the address, the viewer and the sites in view</b><br/>Every count, row and button below follows those sites" }
  d0@{ shape: diam, label: "Does the address hold ?request=ID for a case at a site the viewer cannot see?" }
  oos@{ shape: curv-trap, label: "<b>Out-of-site card</b><br/>'This case is not available at Site A'<br/>It names no patient; link 'Back to the Dashboard'" }
  x1@{ shape: stadium, label: "<b>The Dashboard is not drawn behind the card</b><br/>The link drops ?request and the page opens" }
  d1@{ shape: diam, label: "Does the address hold payer, program, type or stage?" }
  p2@{ shape: rect, label: "<b>The address wins</b><br/>The four menus go back to All, then the address values apply<br/>Unknown values are ignored" }
  p3@{ shape: rect, label: "<b>The remembered filters are written back to the address</b><br/>First visit: no filters" }
  w1@{ shape: cyl, label: "<b>Filters</b><br/>Payer, Program, Request type, Status (the stage)" }
  sc@{ shape: curv-trap, label: "<b>Dashboard</b><br/>One cockpit: what to do now, and where every authorization stands" }
  d2@{ shape: diam, label: "Does the address hold ?request=ID?" }
  d3@{ shape: diam, label: "Is there a request with that ID?" }
  o1@{ shape: win-pane, label: "Request drawer opens over the page" }
  p4@{ shape: rect, label: "<b>Nothing opens</b><br/>The ?request part is removed after 0.2 seconds" }
  e1@{ shape: stadium, label: "Page shown with no drawer" }
  subgraph gPage ["On the page, from the top down"]
  h1@{ shape: curv-trap, label: "<b>Small title and one quiet line</b><br/>'18 requests are waiting on payers. 3 are waiting on you.'<br/>'What to do now, and where every authorization stands.'" }
  ca@{ shape: trap-t, label: "<b>Click 'Check all now'</b><br/>Top right; disabled while Navigator is paused in Settings" }
  lc@{ shape: curv-trap, label: "<b>Lifecycle card</b><br/>Five state chips with counts: Awaiting sign-off, Submitted, Decision pending, Info requested, Denied / appeal<br/>Two links with an arrow: Active, Renewal due" }
  dn@{ shape: curv-trap, label: "<b>Do next card</b><br/>'Suggested by FLO from today's demo data'<br/>Up to five plain sentences, each with one button" }
  tb@{ shape: curv-trap, label: "<b>Table card</b><br/>'40 authorizations' and one quiet sentence<br/>'Needs me today', Payer, Program, Status and Request type<br/>Nine columns, 'Show 8 more'" }
  end
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Open and read a request" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Title › What the title and quiet line say" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Header › Check all now and the demo clock" }
  g4@{ shape: subproc, label: "Continues in: Dashboard › Lifecycle › Click a state to filter the table" }
  g5@{ shape: subproc, label: "Continues in: Dashboard › Do next › What to do now and where each button leads" }
  g6@{ shape: subproc, label: "Continues in: Dashboard › Table controls › Needs me today, Payer, Program, Status and Request type" }
  g7@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Order, rows and paging" }
  g8@{ shape: subproc, label: "Continues in: Dashboard › Sites › What each site sees and out-of-site links" }
  g9@{ shape: subproc, label: "Continues in: Dashboard › Table controls › Clear filters and empty states" }
  s1 --> p1
  s2 --> p1
  s3 --> p1
  s4 --> t1 --> p1
  p1 --> d0
  d0 -->|"Yes"| oos --> x1
  d0 -->|"No"| d1
  d1 -->|"Yes"| p2 --> w1
  d1 -->|"No"| p3 --> w1
  w1 --> sc
  sc --> d2
  d2 -->|"No"| e1
  d2 -->|"Yes"| d3
  d3 -->|"Yes"| o1 --> g1
  d3 -->|"No"| p4 --> e1
  sc --> h1 --> lc --> dn --> tb
  h1 --> g2
  h1 --> ca --> g3
  lc --> g4
  dn --> g5
  tb --> g6
  tb --> g7
  tb --> g9
  p1 -.-> g8
  class s1,s2,s3,s4 k_start
  class t1 k_toast
  class p1,p2,p3,p4 k_process
  class d0,d1,d2,d3 k_decision
  class oos,sc,h1,lc,dn,tb k_screen
  class x1 k_endx
  class w1 k_store
  class o1 k_overlay
  class e1 k_end
  class ca k_click
  class g1,g2,g3,g4,g5,g6,g7,g8,g9 k_goto
  style gPage fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Title › What the title and quiet line say

The small title counts what waits on payers and what waits on you, over every authorization the viewer can see. The table's menus and the Lifecycle chips do not change it, and neither does the demo clock. The quiet line under it never changes.

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
  s1@{ shape: stadium, label: "Dashboard is open" }
  p1@{ shape: rect, label: "<b>Take the requests at the sites in view</b><br/>Both sites, Site A or Site B, from the top bar and the viewer<br/>Payer, Program, Request type and Status menus are ignored here" }
  p2@{ shape: rect, label: "<b>Waiting on payers = Submitted + Decision pending</b><br/>Waiting on you = requests with a question for a person (a payer's question, an agent's question)<br/>plus cases saved in New case that wait for a person" }
  d1@{ shape: diam, label: "How many wait on payers?" }
  a0@{ shape: curv-trap, label: "'Nothing is waiting on a payer.'" }
  a1@{ shape: curv-trap, label: "'1 request is waiting on a payer.'" }
  a2@{ shape: curv-trap, label: "'18 requests are waiting on payers.'" }
  d2@{ shape: diam, label: "How many wait on you?" }
  b0@{ shape: curv-trap, label: "'Nothing is waiting on you.'" }
  b1@{ shape: curv-trap, label: "'1 is waiting on you.'" }
  b2@{ shape: curv-trap, label: "'3 are waiting on you.'" }
  h@{ shape: curv-trap, label: "<b>Title</b><br/>The two sentences together, e.g. '18 requests are waiting on payers. 3 are waiting on you.'<br/>Small serif type, no card around it" }
  q@{ shape: curv-trap, label: "<b>One quiet line under it</b><br/>'What to do now, and where every authorization stands.'" }
  p3@{ shape: rect, label: "<b>Recomputed after a payer reply, an answer sent, a case signed and sent, a case saved in New case, or a change of site or viewer</b><br/>Site A and Site B add up to Both sites" }
  d3@{ shape: diam, label: "Does the number match the table?" }
  n1@{ shape: curv-trap, label: "<b>Not the same count as 'Needs me today'</b><br/>The title counts questions waiting on a person; 'Needs me today' also counts a request ready to sign, a write-back to approve, a late payer to chase and a denial deadline inside 2 days" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Table controls › Needs me today, Payer, Program, Status and Request type" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Sites › What each site sees and out-of-site links" }
  s1 --> p1 --> p2 --> d1
  d1 -->|"None"| a0 --> d2
  d1 -->|"One"| a1 --> d2
  d1 -->|"Many"| a2 --> d2
  d2 -->|"None"| b0 --> h
  d2 -->|"One"| b1 --> h
  d2 -->|"Many"| b2 --> h
  h --> q --> p3 --> d3
  d3 -->|"No, by design"| n1 --> g1
  p1 -.-> g2
  class s1 k_start
  class p1,p2,p3 k_process
  class d1,d2,d3 k_decision
  class a0,a1,a2,b0,b1,b2,h,q,n1 k_screen
  class g1,g2 k_goto
```

## Dashboard › Header › Check all now and the demo clock

The one button beside the title, which Settings can switch off by pausing Navigator, and what the Demo menu's clock does to the page. Time in the demo only moves when someone moves it.

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
  s0@{ shape: stadium, label: "<b>Look at the top of the page</b><br/>'Check all now' sits top right, beside the title" }
  dp@{ shape: diam, label: "Is Navigator paused in Settings?" }
  sp@{ shape: curv-trap, label: "<b>'Check all now' is disabled</b><br/>Under it a link: 'Navigator is paused in Settings'" }
  cs@{ shape: trap-t, label: "Click 'Navigator is paused in Settings'" }
  gs@{ shape: subproc, label: "Continues in: Settings › Pause › What the rest of the app shows" }
  xs@{ shape: stadium, label: "<b>Nothing runs</b><br/>Resume Navigator in Settings and the button works again" }
  s1@{ shape: trap-t, label: "Click 'Check all now'" }
  p1@{ shape: rect, label: "Button shows a spinner and is disabled for 1.2 seconds" }
  a1@{ shape: hex, label: "<b>Navigator looks at every open request in view</b><br/>Submitted and Decision pending at the sites the viewer can see, whatever the menus say" }
  w1@{ shape: cyl, label: "<b>Each open request gets a history line</b><br/>'Navigator checked: received' or 'Navigator checked: under review'" }
  t1@{ shape: odd, label: "<b>'Navigator checked 18 open requests'</b><br/>'No new answers yet. It checks again in 30 minutes.'<br/>The count is the open requests in view" }
  e1@{ shape: stadium, label: "<b>Button is ready again</b><br/>No request changes state" }
  s2@{ shape: stadium, label: "Demo menu › Click 'Fast-forward 1 hour' or 'Fast-forward 1 day'" }
  c1@{ shape: cyl, label: "<b>Demo clock moves forward</b><br/>Nothing else moves time" }
  t2@{ shape: odd, label: "<b>'Clock moved forward 1 hour' or '1 day'</b><br/>'Times in stage and deadlines updated.'" }
  p2@{ shape: rect, label: "Dashboard recomputes from the new time" }
  subgraph gClock ["What the clock changes on the Dashboard"]
  r1@{ shape: rect, label: "<b>Table: 'Days in state' grows</b><br/>Over 1.5 × the payer's median is ochre, over 2 × is terracotta" }
  r2@{ shape: rect, label: "<b>Table: the CMS clock on Medicaid managed care payers</b><br/>'Day 5 of 7' from day 5, then the ochre flag 'Past 7 days'" }
  r3@{ shape: rect, label: "<b>Do next: due times count down, overdue items move up</b><br/>A request past the CMS time comes first" }
  r4@{ shape: rect, label: "<b>Lifecycle: 'running late', 'past 7 days' and 'deadlines this week' lines, and the counts of Active and Renewal due, are worked out again</b><br/>An approval whose end date has passed leaves Active" }
  end
  p3@{ shape: rect, label: "Not changed: the counts of Awaiting sign-off, Submitted, Decision pending, Info requested, Denied / appeal, and the title" }
  g1@{ shape: subproc, label: "Continues in: Global shell › Demo menu" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Days in state and the CMS decision time" }
  s0 --> dp
  dp -->|"No"| s1 --> p1 --> a1 --> w1 --> t1 --> e1
  dp -->|"Yes"| sp --> cs --> gs
  sp -.-> xs
  s2 --> c1 --> t2 --> p2
  p2 --> r1 & r2 & r3 & r4
  r1 --> g2
  r2 --> g2
  p2 -.-> p3
  s2 -.-> g1
  class s0,s2 k_start
  class dp k_decision
  class sp k_screen
  class cs,s1 k_click
  class gs,g1,g2 k_goto
  class xs k_endx
  class p1,p2,r1,r2,r3,r4,p3 k_process
  class a1 k_agent
  class w1,c1 k_store
  class t1,t2 k_toast
  class e1 k_end
  style gClock fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Do next › What to do now and where each button leads

The Do next card lists the few things a person should do now, each as one plain sentence with one button. FLO works the list out from the live data each time the requests, the queue, the ledger or the clock change. Each button goes to a real place; nothing is sent from the card itself.

Route: `/dashboard`

A recommendation for a person to check, never a payer fact. Real world: the same list is what a coordinator would build by hand from the queue.

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
  s1@{ shape: stadium, label: "<b>Look at the Do next card</b><br/>'Suggested by FLO from today's demo data'" }
  a1@{ shape: hex, label: "<b>FLO reads the requests, the queue, the ledger and the clock at the sites in view</b><br/>One row per thing to do, at most five" }
  r0@{ shape: curv-trap, label: "<b>Row</b><br/>One sentence in 14 px type, e.g. 'Review and sign R-0988'<br/>Under it, quiet: 'D.L., 41 · Beacon · Residential 3.5 · Review due in 3 h'<br/>Terracotta only when the time is inside 6 hours or past" }
  d0@{ shape: diam, label: "Is there anything to do?" }
  em@{ shape: curv-trap, label: "'Nothing needs you right now.'" }
  subgraph gBtn ["The one button on a row, and where it goes"]
  b1@{ shape: trap-t, label: "<b>Click 'Review and sign'</b><br/>Sentence 'Review and sign R-0988'" }
  b2@{ shape: trap-t, label: "<b>Click 'Answer Scribe' or 'Answer Packet'</b><br/>Sentence 'Answer Scribe's question on R-1042'" }
  b3@{ shape: trap-t, label: "<b>Click 'Review answer'</b><br/>Sentence 'Review Packet's answer to Harborview on P-1499'" }
  b4@{ shape: trap-t, label: "<b>Click 'Open denial'</b><br/>Sentence 'Open denial D-3318, peer-to-peer in 36 h'" }
  b5@{ shape: trap-t, label: "<b>Click 'Open request'</b><br/>Sentence 'Chase Cardinal on R-1021'" }
  b6@{ shape: trap-t, label: "<b>Click 'Approve write-back'</b><br/>Sentence 'Approve the write-back for R-0951'" }
  b7@{ shape: trap-t, label: "<b>Click 'Start renewal'</b><br/>Sentence 'Start renewal for I-2193'" }
  b8@{ shape: trap-t, label: "<b>Click 'Open Active cases'</b><br/>Sentence 'Finish 1 case saved in New case'" }
  end
  p1@{ shape: rect, label: "<b>The request gets a draft in New case if it has none, then the draft opens at the step that fits</b><br/>Authorization preparation for a question, Review & submit when every check passed" }
  p2@{ shape: rect, label: "<b>Address gets ?request=ID</b><br/>The request drawer opens on the Dashboard" }
  p3@{ shape: rect, label: "Denial Intelligence opens on that denial" }
  p4@{ shape: rect, label: "New case opens as a Reauthorization for that patient" }
  p5@{ shape: rect, label: "Case Manager opens on Active cases" }
  d1@{ shape: diam, label: "Are more people-owned rows left than the five shown?" }
  more@{ shape: curv-trap, label: "<b>Under the list</b><br/>'2 more need you today.' and the button 'Show them in the table'" }
  b9@{ shape: trap-t, label: "Click 'Show them in the table'" }
  p6@{ shape: rect, label: "'Needs me today' turns on and the page scrolls to the table" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › New case › Authorization preparation › An agent asks a question" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › New case › Review & submit › Sign and send to payer" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Open and read a request" }
  g4@{ shape: subproc, label: "Continues in: Denial Intelligence › Open denials list" }
  g5@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Tracker of every active case" }
  g6@{ shape: subproc, label: "Continues in: Dashboard › Do next › How the list is chosen and ordered" }
  g7@{ shape: subproc, label: "Continues in: Dashboard › Table controls › Needs me today, Payer, Program, Status and Request type" }
  s1 --> a1 --> d0
  d0 -->|"No"| em
  d0 -->|"Yes"| r0
  r0 --> b1 & b2 & b3 & b4 & b5 & b6 & b7 & b8
  b1 --> p1 --> g2
  b2 --> p1 --> g1
  b3 --> p2 --> g3
  b5 --> p2
  b6 --> p2
  b4 --> p3 --> g4
  b7 --> p4
  b8 --> p5 --> g5
  r0 --> d1
  d1 -->|"Yes"| more --> b9 --> p6 --> g7
  a1 -.-> g6
  class s1 k_start
  class a1 k_agent
  class r0,em,more k_screen
  class d0,d1 k_decision
  class b1,b2,b3,b4,b5,b6,b7,b8,b9 k_click
  class p1,p2,p3,p4,p5,p6 k_process
  class g1,g2,g3,g4,g5,g6,g7 k_goto
  style gBtn fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Do next › How the list is chosen and ordered

What FLO puts on the Do next list, in what order, and what changes it. The rules are computed from the data in view, so a viewer limited to one site gets a list that names no case at the other site.

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
  s1@{ shape: stadium, label: "Any change to a request, the queue, the ledger, the clock, the EMR write-back switch or the site in view" }
  p1@{ shape: rect, label: "FLO takes only the requests, queue items and ledger cases at the sites in view" }
  subgraph gKinds ["What can be on the list"]
  k1@{ shape: rect, label: "<b>A request ready to sign (all four checks passed)</b><br/>One a person signs" }
  k2@{ shape: rect, label: "<b>A question from an agent on a request being prepared</b><br/>'Answer Scribe', 'Answer Packet'" }
  k3@{ shape: rect, label: "<b>A payer's question with the draft answer waiting for review</b><br/>Info requested, waiting on you" }
  k4@{ shape: rect, label: "A denial with a peer-to-peer deadline in the next 7 days" }
  k5@{ shape: rect, label: "<b>A payer to chase</b><br/>A request in Submitted or Decision pending at least 4 hours late, or on day 5 of the CMS clock or later, with no agent already phoning" }
  k6@{ shape: rect, label: "<b>An approval to write back</b><br/>Only while write-back is on in EMR Connect" }
  k7@{ shape: rect, label: "An authorization that ends within 7 days, or has ended, with no request in flight to replace it" }
  k8@{ shape: rect, label: "<b>Cases saved in New case that wait for a person and have no row yet</b><br/>One line for all of them" }
  end
  p2@{ shape: rect, label: "<b>Each row gets a time</b><br/>The due time the Authorizations queue ranks by, or the denial's deadline" }
  d1@{ shape: diam, label: "Is it past the CMS decision time?" }
  p3@{ shape: rect, label: "<b>It goes first</b><br/>Other rows are ordered by their due time, overdue first" }
  p4@{ shape: rect, label: "<b>Softer rows wait a little longer than a hard deadline</b><br/>A late payer by 2 days, a renewal by 1 day, a write-back by 3 days" }
  p5@{ shape: rect, label: "Rows with the same time: ready to sign, then a payer's question, then an agent's question, then a denial, then the rest" }
  p6@{ shape: rect, label: "<b>The first five are shown</b><br/>The rest stay in the table under 'Needs me today'" }
  sc@{ shape: curv-trap, label: "<b>Do next card</b><br/>Up to five rows, or 'Nothing needs you right now.'" }
  d2@{ shape: diam, label: "Is the viewer limited to one site?" }
  ss@{ shape: curv-trap, label: "<b>Only cases at that site</b><br/>A case at the other site is never named, counted or linked" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Do next › What to do now and where each button leads" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Days in state and the CMS decision time" }
  g3@{ shape: subproc, label: "Continues in: Global shell › Ask FLO › Answers" }
  s1 --> p1 --> d2
  d2 -->|"Yes"| ss --> p2
  d2 -->|"No"| p2
  p1 --> k1 & k2 & k3 & k4 & k5 & k6 & k7 & k8
  k1 --> p2
  k2 --> p2
  k3 --> p2
  k4 --> p2
  k5 --> p2
  k6 --> p2
  k7 --> p2
  k8 --> p2
  p2 --> d1
  d1 -->|"Yes"| p3
  d1 -->|"No"| p4
  p3 --> p5
  p4 --> p5
  p5 --> p6 --> sc
  sc --> g1
  k5 -.-> g2
  sc -.-> g3
  class s1 k_start
  class p1,k1,k2,k3,k4,k5,k6,k7,k8,p2,p3,p4,p5,p6 k_process
  class d1,d2 k_decision
  class sc,ss k_screen
  class g1,g2,g3 k_goto
  style gKinds fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Table controls › Needs me today, Payer, Program, Status and Request type

The controls on the right of the table card's header. 'Needs me today' is a toggle; Payer, Program, Status and Request type are menus. The four menus apply at once, write to the address and keep to the Dashboard's one set of filters. Payer, Program and Request type also narrow the Lifecycle counts; Status and the toggle only narrow the table.

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>Header of the table card" }
  sc@{ shape: curv-trap, label: "<b>Five controls</b><br/>'Needs me today', 'All payers', 'All programs', 'All statuses', 'All request types'<br/>A 'Clear filters' button joins them when any is set" }
  subgraph gToggle ["Needs me today"]
  t1@{ shape: trap-t, label: "<b>Click 'Needs me today'</b><br/>Keyboard: Tab, then Enter or Space" }
  t2@{ shape: rect, label: "<b>The table shows only rows owned by You today</b><br/>Waiting on a person now, ready to sign, a write-back to approve, a late payer to chase, or a denial deadline inside 2 days" }
  t3@{ shape: curv-trap, label: "<b>Button is outlined green and pressed</b><br/>The sentence under the title starts 'Needs you today.'" }
  t4@{ shape: trap-t, label: "Click it again" }
  t5@{ shape: rect, label: "The table shows every row again" }
  end
  subgraph gMenus ["The four menus"]
  m1@{ shape: trap-t, label: "<b>Click a menu</b><br/>Payer, Program, Status or Request type" }
  m2@{ shape: win-pane, label: "<b>Menu opens under the button, to the left for the right-hand ones</b><br/>Payer: every payer, including one added on Payers<br/>Status: Awaiting sign-off 5, Submitted 4, Decision pending 14, Info requested 3, Decided today 8, Denied / appeal 8" }
  m3@{ shape: trap-t, label: "Pick an option" }
  m4@{ shape: rect, label: "<b>Menu closes</b><br/>The table, its title and the sentence under it follow" }
  m5@{ shape: rect, label: "<b>Menu keys: ArrowDown, ArrowUp, Enter to pick, Escape to close</b><br/>A click outside or on the button again also closes it" }
  m6@{ shape: curv-trap, label: "A menu that is not 'All' turns green and bold" }
  end
  w1@{ shape: cyl, label: "<b>Filters saved</b><br/>Payer, Program, Request type, Status" }
  w2@{ shape: cyl, label: "<b>Address gets ?payer=, ?program=, ?type= or ?stage=</b><br/>Only values that are not 'All'" }
  p1@{ shape: rect, label: "<b>Lifecycle counts follow Payer, Program and Request type</b><br/>A Status pick shows as the pressed chip" }
  p2@{ shape: rect, label: "Table goes back to its first 8 rows" }
  d1@{ shape: diam, label: "Any rows left?" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Table controls › Clear filters and empty states" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Lifecycle › Click a state to filter the table" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Order, rows and paging" }
  s1 --> sc
  sc --> t1 --> t2 --> t3 --> t4 --> t5
  sc --> m1 --> m2 --> m3 --> m4 --> m6
  m2 -.-> m5
  m4 --> w1 --> w2 --> p1 --> p2 --> d1
  t2 --> p2
  d1 -->|"Yes"| g3
  d1 -->|"No"| g1
  p1 -.-> g2
  class s1 k_start
  class sc,t3,m6 k_screen
  class t1,t4,m1,m3 k_click
  class t2,t5,m4,m5,p1,p2 k_process
  class m2 k_overlay
  class w1,w2 k_store
  class d1 k_decision
  class g1,g2,g3 k_goto
  style gToggle fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gMenus fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Table controls › Clear filters and empty states

When 'Clear filters' appears, what it resets, and what the table shows when the controls match nothing.

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
  s1@{ shape: stadium, label: "Pick Payer, Program, Request type or Status, press a Lifecycle chip, or turn on 'Needs me today'" }
  d1@{ shape: diam, label: "Is a menu not 'All', a chip pressed, or 'Needs me today' on?" }
  sc1@{ shape: curv-trap, label: "<b>Table header</b><br/>Ghost button 'Clear filters' after the menus" }
  sc0@{ shape: curv-trap, label: "<b>No 'Clear filters' button</b><br/>All four menus show 'All' and the toggle is off" }
  c1@{ shape: trap-t, label: "Click 'Clear filters'" }
  p1@{ shape: rect, label: "<b>Payer, Program, Request type and Status go back to 'All'</b><br/>'Needs me today' turns off" }
  w1@{ shape: cyl, label: "Filters" }
  p2@{ shape: rect, label: "Address loses payer, program, type and stage" }
  p3@{ shape: rect, label: "Table goes back to its first 8 rows" }
  sc2@{ shape: curv-trap, label: "<b>Every authorization is shown again</b><br/>'40 authorizations', 'Showing 8 of 40'" }
  e1@{ shape: stadium, label: "Back to the full list" }
  e0@{ shape: stadium, label: "<b>Nothing to clear</b><br/>The button appears as soon as a control is set" }
  d2@{ shape: diam, label: "Do any authorizations match?" }
  p4@{ shape: rect, label: "Example: Cardinal, IOP, Recertification, Denied / appeal" }
  em1@{ shape: curv-trap, label: "<b>Table title '0 authorizations'</b><br/>The Lifecycle still counts every state that Payer, Program and Request type leave" }
  em4@{ shape: win-pane, label: "<b>Empty state in the card</b><br/>'No authorizations match'<br/>'The filters hide everything. Clear them to see every authorization again.'" }
  d3@{ shape: diam, label: "Is only 'Needs me today' on?" }
  em5@{ shape: curv-trap, label: "<b>Empty state 'Nothing needs you today'</b><br/>'Every authorization is with a payer or with the agents.'" }
  c2@{ shape: trap-t, label: "Click 'Clear filters' in the empty state" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Table controls › Needs me today, Payer, Program, Status and Request type" }
  s1 --> d1
  d1 -->|"Yes"| sc1 --> c1 --> p1 --> w1 --> p2 --> p3 --> sc2 --> e1
  d1 -->|"No"| sc0 --> e0
  w1 --> d2
  d2 -->|"Yes"| sc2
  d2 -->|"No"| p4
  p4 --> em1 --> d3
  d3 -->|"No"| em4 --> c2 --> p1
  d3 -->|"Yes"| em5 --> c2
  sc1 -.-> g1
  class s1 k_start
  class d1,d2,d3 k_decision
  class sc1,sc0,sc2,em1,em5 k_screen
  class c1,c2 k_click
  class p1,p2,p3,p4 k_process
  class w1 k_store
  class e1,e0 k_end
  class em4 k_overlay
  class g1 k_goto
```

## Dashboard › Lifecycle › Click a state to filter the table

The Lifecycle card holds five state chips. Each shows a count and one quiet line, and each is a button that filters the table below it. The counts follow the sites in view and the Payer, Program and Request type menus, never the Status menu. The two chips with an arrow open Case Manager and are in the next diagram.

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>The 'Lifecycle' card under the title" }
  sc@{ shape: curv-trap, label: "<b>Five chips in a row</b><br/>Awaiting sign-off 5, Submitted 4, Decision pending 14, Info requested 3, Denied / appeal 8<br/>White, thin border, no icon, no tinted fill" }
  ip@{ shape: curv-trap, label: "<b>Info icon beside 'Lifecycle'</b><br/>Hover, focus or click: what the states count" }
  subgraph gCount ["What each chip counts, and its quiet line"]
  c1@{ shape: rect, label: "<b>Awaiting sign-off = Preparing: requests not yet signed and sent, plus cases saved in New case</b><br/>Quiet line '1 ready to sign'" }
  c2@{ shape: rect, label: "<b>Submitted = Received: the payer has it</b><br/>Quiet line 'all on time' or '1 running late' (ochre)" }
  c3@{ shape: rect, label: "<b>Decision pending = Under review</b><br/>Quiet line 'none running late', '2 running late', or '1 past 7 days' (ochre)" }
  c4@{ shape: rect, label: "<b>Info requested</b><br/>Quiet line '1 waiting on you' or 'none waiting on you'" }
  c5@{ shape: rect, label: "<b>Denied / appeal = Appeal or call</b><br/>Quiet line '4 deadlines this week', terracotta when one is inside a day" }
  end
  n1@{ shape: rect, label: "<b>Decided today (6 approved, 2 denied) is not a chip</b><br/>It is in the Status menu and in ?stage=decided" }
  k1@{ shape: trap-t, label: "<b>Click a chip</b><br/>Keyboard: Tab, then Enter or Space" }
  d1@{ shape: diam, label: "Is it already the pressed chip?" }
  p1@{ shape: rect, label: "<b>The filter Status is set to that state</b><br/>The chip gets a green outline and is pressed" }
  p2@{ shape: rect, label: "<b>The filter Status goes back to 'All statuses'</b><br/>The chip is not pressed" }
  w1@{ shape: cyl, label: "<b>Filters</b><br/>Status (the stage)" }
  p3@{ shape: rect, label: "<b>Address gets ?stage=under_review (or preparing, received, info_requested, appeal)</b><br/>A link with ?stage= presses the same chip" }
  p4@{ shape: rect, label: "<b>Status menu shows the same state</b><br/>Table title and 'Showing 8 of 14' follow; first 8 rows" }
  sc2@{ shape: curv-trap, label: "<b>Table</b><br/>Only the authorizations in that state<br/>Title '14 authorizations'" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Lifecycle › Active and Renewal due open Case Manager" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Table controls › Needs me today, Payer, Program, Status and Request type" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Order, rows and paging" }
  s1 --> sc --> k1 --> d1
  sc --> ip
  sc --> c1 & c2 & c3 & c4 & c5
  c5 -.-> n1
  d1 -->|"No"| p1 --> w1
  d1 -->|"Yes"| p2 --> w1
  w1 --> p3 --> p4 --> sc2 --> g3
  sc -.-> g1
  p4 -.-> g2
  class s1 k_start
  class sc,ip,sc2 k_screen
  class c1,c2,c3,c4,c5,n1,p1,p2,p3,p4 k_process
  class k1 k_click
  class d1 k_decision
  class w1 k_store
  class g1,g2,g3 k_goto
  style gCount fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Lifecycle › Active and Renewal due open Case Manager

Active and Renewal due describe approved authorizations on the Case Manager ledger, not rows of the Dashboard table, so they are links with a small arrow and not filters. A click opens Case Manager on Active cases with the matching filter, and the number of rows there is the number on the chip.

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>Two chips with an arrow after the five state chips" }
  p1@{ shape: rect, label: "<b>Take the ledger cases at the sites in view</b><br/>Payer, Program and Request type menus do not change these two counts" }
  d1@{ shape: diam, label: "Which chip?" }
  a1@{ shape: rect, label: "<b>Active = approved with units or days left, and the approval has not ended</b><br/>(example: 40; 22 at Site A and 18 at Site B)<br/>Quiet line '6 approved today'" }
  a2@{ shape: rect, label: "<b>Renewal due = approved, and the clinical review is due, or the approval ends within 7 days, or already ended</b><br/>(example: 19)<br/>Quiet line 'next: R-0856, 2 h'" }
  c1@{ shape: trap-t, label: "<b>Click 'Active' (or 'Renewal due')</b><br/>It is a link, so Tab and Enter work and a right click can open it in a new tab" }
  p2@{ shape: rect, label: "<b>Case Manager opens on Active cases</b><br/>Address /manager?tab=cases&show=active or show=renewal" }
  sc@{ shape: curv-trap, label: "<b>Case Manager</b><br/>Tracker with the filter 'Showing Active (approved, units left)' or 'Showing Renewal due (review due or ending within 7 days)'<br/>'Clear filters' appears" }
  d2@{ shape: diam, label: "Is the viewer limited to one site?" }
  s1b@{ shape: curv-trap, label: "<b>Only that site's cases</b><br/>Site A: Active 22, Renewal due 10; Site B: 18 and 9" }
  c2@{ shape: trap-t, label: "Click 'Clear filters' in Case Manager" }
  p3@{ shape: rect, label: "The filter goes and the address loses ?show=" }
  e1@{ shape: stadium, label: "Every active case is listed again" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Tracker of every active case" }
  g2@{ shape: subproc, label: "Continues in: Case Manager › Filters › Search and filter both tabs" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Sites › What each site sees and out-of-site links" }
  s1 --> p1 --> d1
  d1 -->|"Active"| a1 --> c1
  d1 -->|"Renewal due"| a2 --> c1
  c1 --> p2 --> sc
  sc --> d2
  d2 -->|"Yes"| s1b
  sc --> c2 --> p3 --> e1
  sc --> g1
  sc -.-> g2
  s1b -.-> g3
  class s1 k_start
  class p1,a1,a2,p2,p3 k_process
  class d1,d2 k_decision
  class c1,c2 k_click
  class sc,s1b k_screen
  class e1 k_end
  class g1,g2,g3 k_goto
```

## Dashboard › Requests table › Order, rows and paging

The table card, the one list on the page. Rows come in the page's own order (the ones that need you today first, then the longest in their state) until a heading is clicked. A click on a row or its case ID opens the request drawer and adds one history entry. Eight rows show at a time.

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>The table card under Do next" }
  sc1@{ shape: curv-trap, label: "<b>Card header</b><br/>Title '40 authorizations' and one quiet sentence<br/>'Longest in their state first, with what needs you today on top.'<br/>Controls on the right" }
  sc2@{ shape: curv-trap, label: "<b>Nine columns</b><br/>Case, Payer, Service, Status, Days in state, Units, Window, Next action, Owner<br/>No Open button, no progress bars, no icons on the rows" }
  p1@{ shape: rect, label: "Every heading is a button that sorts the rows" }
  p2@{ shape: rect, label: "<b>Rows start in the page's own order</b><br/>1 the ones that need you today, 2 everyone else<br/>Inside each group the longest in its state first" }
  d0@{ shape: diam, label: "Do any rows match the controls?" }
  em@{ shape: curv-trap, label: "<b>'No authorizations match'</b><br/>with 'Clear filters'" }
  subgraph gRow ["One row (example: P-1499)"]
  r1@{ shape: curv-trap, label: "<b>Row</b><br/>Case ID with initials and age under it, payer, service, status, days in state with the median, units, window, next action, owner" }
  c1@{ shape: trap-t, label: "Click anywhere on the row" }
  c2@{ shape: trap-t, label: "Click the underlined case ID, e.g. 'P-1499'" }
  end
  p3@{ shape: rect, label: "<b>Address gets ?request=P-1499</b><br/>One new history entry, so one press of the browser Back button closes the drawer" }
  o1@{ shape: win-pane, label: "Request drawer opens on the right" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Open and read a request" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Read a row: units, window, next action and owner" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Table controls › Clear filters and empty states" }
  g4@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Sort the rows" }
  g5@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Days in state and the CMS decision time" }
  d1@{ shape: diam, label: "Are there more rows than are shown?" }
  sc3@{ shape: curv-trap, label: "<b>Under the table</b><br/>'Showing 8 of 40', '32 not shown' and 'Show 8 more'" }
  c4@{ shape: trap-t, label: "Click 'Show 8 more'" }
  p5@{ shape: rect, label: "<b>Eight more rows are added</b><br/>With fewer than 8 left the button shows that number, e.g. 'Show 5 more'" }
  e1@{ shape: stadium, label: "<b>All rows shown</b><br/>'Showing 40 of 40'; no button" }
  p6@{ shape: rect, label: "Changing any menu, chip, toggle or the sort goes back to the first 8 rows" }
  sc4@{ shape: curv-trap, label: "<b>With cases saved in New case that have no row yet</b><br/>A line under the table with all statuses or Awaiting sign-off: '2 more are being prepared in New case.' and 'Open Active cases'" }
  g6@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Being prepared card" }
  s1 --> sc1 --> sc2 --> p1 --> p2 --> d0
  d0 -->|"No"| em --> g3
  d0 -->|"Yes"| r1
  r1 --> c1 & c2
  c1 --> p3
  c2 --> p3
  p3 --> o1 --> g1
  r1 -.-> g2
  p1 -.-> g4
  d0 -->|"Yes"| d1
  d1 -->|"Yes"| sc3 --> c4 --> p5 --> d1
  d1 -->|"No"| e1
  sc3 -.-> p6
  d1 -.-> sc4 -.-> g6
  r1 -.-> g5
  class s1 k_start
  class sc1,sc2,em,r1,sc3,sc4 k_screen
  class p1,p2,p3,p5,p6 k_process
  class d0,d1 k_decision
  class c1,c2,c4 k_click
  class o1 k_overlay
  class g1,g2,g3,g4,g5,g6 k_goto
  class e1 k_end
  style gRow fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Requests table › Read a row: units, window, next action and owner

What each cell of a row means. Nothing in a row is a button except the case ID, and a click on the row itself opens the request drawer. Units and Window come from the Case Manager ledger and show a dash when the case has no approval. Next action and Owner come from where the request is. No dollar figures, no progress bars.

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
  s1@{ shape: stadium, label: "A row in the authorizations table" }
  c1@{ shape: curv-trap, label: "<b>Case</b><br/>Underlined ID, e.g. 'R-1042', and the patient under it: initials and age, 'J.M., 34'" }
  c2@{ shape: curv-trap, label: "<b>Payer, then Service</b><br/>Short payer name; level of care ('Residential 3.5', 'IOP', 'PHP', 'Detox') with the request type under it" }
  c3@{ shape: curv-trap, label: "<b>Status</b><br/>One plain word: Awaiting sign-off, Submitted, Decision pending, Info requested, or for a decided or denied request its own state ('Approved', 'Call booked', 'Appeal filed')" }
  c4@{ shape: curv-trap, label: "<b>Days in state</b><br/>A number such as '3.2 d', '14 h' or '35 m', with 'median 2 d' under it<br/>A flag when a Medicaid managed care payer is near or past the CMS time" }
  u1@{ shape: diam, label: "Does the Case Manager ledger hold an approval for this case?" }
  u2@{ shape: curv-trap, label: "<b>Units</b><br/>'48 → 10' (approved to left) with 'units' or 'days' under it" }
  u3@{ shape: curv-trap, label: "<b>Window</b><br/>'Sep 22 – Oct 20'<br/>The end is the ledger's expiry clock, or today plus what is left; the start is the end minus the approved length" }
  u4@{ shape: curv-trap, label: "Units and Window show a quiet dash" }
  n1@{ shape: diam, label: "Where is the request?" }
  n2@{ shape: curv-trap, label: "<b>Next action 'Review and sign'</b><br/>Owner You: Awaiting sign-off, every check passed" }
  n3@{ shape: curv-trap, label: "<b>'Answer Scribe' or 'Answer Packet'</b><br/>Owner You: an agent has a question" }
  n4@{ shape: curv-trap, label: "<b>'Wait for Reader', 'Wait for Packet'</b><br/>Owner that agent: agents are still working" }
  n5@{ shape: curv-trap, label: "<b>'Review and send'</b><br/>Owner You: Info requested, the draft answer is ready" }
  n6@{ shape: curv-trap, label: "<b>'Chase the payer'</b><br/>Owner You, or Caller when Caller is already phoning<br/>Submitted or Decision pending, 4 or more hours late, or on day 5 of the CMS clock or later" }
  n7@{ shape: curv-trap, label: "<b>'Wait for the decision'</b><br/>Owner the payer, e.g. 'Cardinal'" }
  n8@{ shape: curv-trap, label: "'Approve write-back' (Owner You, only while write-back is on) or 'Start renewal' (Owner You) or 'No action needed' (Owner Cadence)" }
  n9@{ shape: curv-trap, label: "<b>'Prepare the P2P call'</b><br/>Owner You, a denial with a peer-to-peer call; otherwise 'Wait for the decision' (the payer) or 'Wait for' an agent" }
  n10@{ shape: curv-trap, label: "<b>A quiet line under the verb</b><br/>The due time, e.g. 'Notice due in 5 h', when it is inside 2 days; terracotta inside 6 hours" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Order, rows and paging" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Days in state and the CMS decision time" }
  g3@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Sort the rows" }
  g4@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Units or days left and the run-out flag" }
  s1 --> c1 --> c2 --> c3 --> c4 --> u1
  u1 -->|"Yes"| u2 --> u3 --> n1
  u1 -->|"No"| u4 --> n1
  n1 -->|"Awaiting sign-off, ready"| n2 --> n10
  n1 -->|"Awaiting sign-off, a question"| n3 --> n10
  n1 -->|"Awaiting sign-off, agents working"| n4 --> n10
  n1 -->|"Info requested"| n5 --> n10
  n1 -->|"Submitted or Decision pending, late"| n6 --> n10
  n1 -->|"Submitted or Decision pending, on time"| n7 --> n10
  n1 -->|"Decided today, approved"| n8 --> n10
  n1 -->|"Denial route"| n9 --> n10
  n10 --> g1
  c4 -.-> g2
  c1 -.-> g3
  u2 -.-> g4
  class s1 k_start
  class c1,c2,c3,c4,u2,u3,u4,n2,n3,n4,n5,n6,n7,n8,n9,n10 k_screen
  class u1,n1 k_decision
  class g1,g2,g3,g4 k_goto
```

## Dashboard › Requests table › Sort the rows

Every heading of the table sorts the rows. Each is a button, so the keyboard works too. A heading goes ascending, then descending, then back to the page's own order (the ones that need you today first, then the longest in their state). The sort is not saved in the address.

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
  s1@{ shape: stadium, label: "<b>Dashboard is open</b><br/>Headings of the authorizations table" }
  h1@{ shape: curv-trap, label: "<b>Nine headings can sort</b><br/>Case, Payer, Service, Status, Days in state, Units, Window, Next action, Owner<br/>Each shows a small up and down arrow" }
  c1@{ shape: trap-t, label: "<b>Click a heading</b><br/>Or Tab to it and press Enter or Space" }
  d1@{ shape: diam, label: "Is this heading already the sorted one?" }
  p1@{ shape: rect, label: "<b>No: the sort starts on this heading, ascending</b><br/>The arrow points up; the heading is marked ascending for a screen reader" }
  d2@{ shape: diam, label: "Which way is it sorted now?" }
  p2@{ shape: rect, label: "<b>Ascending, so the next click sorts descending</b><br/>The arrow points down" }
  p3@{ shape: rect, label: "<b>Descending, so the next click clears the sort</b><br/>Back to the page's own order" }
  p4@{ shape: rect, label: "<b>Rows that tie keep the page's own order</b><br/>Rows with nothing to sort by stay last either way" }
  p5@{ shape: rect, label: "<b>Table goes back to its first 8 rows</b><br/>The sentence under the title says 'Sorted by days in state, lowest first.'" }
  sc@{ shape: curv-trap, label: "<b>Rows in the new order</b><br/>'Showing 8 of 40'" }
  subgraph gKeys ["What each heading sorts by"]
  k1@{ shape: curv-trap, label: "<b>Case</b><br/>The ID, A to Z with numbers in order: D-3272 before D-3279, R-0870 before R-1021" }
  k2@{ shape: curv-trap, label: "<b>Payer and Service</b><br/>The short payer name, or the level of care, A to Z" }
  k3@{ shape: curv-trap, label: "<b>Status</b><br/>The word shown, A to Z" }
  k4@{ shape: curv-trap, label: "<b>Days in state</b><br/>The time in the state, shortest to longest" }
  k5@{ shape: curv-trap, label: "<b>Units and Window</b><br/>Units left, and the end date; cases with no approval stay last" }
  k6@{ shape: curv-trap, label: "<b>Next action and Owner</b><br/>The words shown, A to Z" }
  end
  p6@{ shape: rect, label: "<b>Menus, chips and 'Needs me today' keep the sort</b><br/>Leaving the page or reloading clears it" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Order, rows and paging" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Requests table › Days in state and the CMS decision time" }
  s1 --> h1 --> c1 --> d1
  d1 -->|"No"| p1 --> p4
  d1 -->|"Yes"| d2
  d2 -->|"Ascending"| p2 --> p4
  d2 -->|"Descending"| p3 --> p5
  p4 --> p5 --> sc
  sc --> p6 --> g1
  h1 --> k1 & k2 & k3 & k4 & k5 & k6
  k4 -.-> g2
  class s1 k_start
  class h1,sc,k1,k2,k3,k4,k5,k6 k_screen
  class c1 k_click
  class d1,d2 k_decision
  class p1,p2,p3,p4,p5,p6 k_process
  class g1,g2 k_goto
  style gKeys fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Dashboard › Requests table › Days in state and the CMS decision time

The Days in state cell shows how long a request has been where it is, the payer's median under it, and, for Medicaid managed care payers (Summit, Cardinal, Evergreen), the CMS decision time. Under the CMS prior authorization rule from 2026 a standard decision is due in 7 calendar days. The demo shows it; it never blocks anything.

Route: `/dashboard`

Real world: CMS-0057-F, from 1 January 2026, asks impacted payers to decide standard requests within 7 calendar days and expedited requests within 72 hours. State rules differ, so the note says 'Check your state.' Demo only: the days are counted on the demo clock.

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
  s1@{ shape: stadium, label: "<b>A row in the table</b><br/>The Days in state cell" }
  a1@{ shape: curv-trap, label: "<b>The number</b><br/>'35 m', '14 h' or '3.2 d' since the request entered its state" }
  d1@{ shape: diam, label: "Is there a median for this state?" }
  a2@{ shape: curv-trap, label: "<b>'median 2 d' under the number</b><br/>The payer's usual time in this state, from the demo data" }
  d2@{ shape: diam, label: "How long compared with the median?" }
  a3@{ shape: curv-trap, label: "Plain number" }
  a4@{ shape: curv-trap, label: "<b>Ochre number</b><br/>Over 1.5 × the median" }
  a5@{ shape: curv-trap, label: "<b>Terracotta number</b><br/>Over 2 × the median; Caller phones the payer" }
  d3@{ shape: diam, label: "Is the request Submitted or Decision pending, at a Medicaid managed care payer?" }
  b0@{ shape: curv-trap, label: "<b>No CMS clock</b><br/>Commercial, Medicare Advantage and carve-out payers, and every other state" }
  b1@{ shape: rect, label: "Count the days since the request went to the payer" }
  d4@{ shape: diam, label: "How many days?" }
  b2@{ shape: curv-trap, label: "<b>Nothing extra</b><br/>Before day 5" }
  b3@{ shape: curv-trap, label: "Ochre hint 'Day 5 of 7' (or 'Day 6 of 7', 'Day 7 of 7') and an info icon" }
  b4@{ shape: curv-trap, label: "<b>Ochre flag 'Past 7 days' and an info icon</b><br/>On the 8th day" }
  b5@{ shape: win-pane, label: "<b>Info icon: hover, focus or click</b><br/>'CMS rule for Medicaid managed care: decide within 7 calendar days (72 hours if expedited). Check your state.'<br/>Escape closes it" }
  b6@{ shape: rect, label: "The Lifecycle chip 'Decision pending' says 'N past 7 days' in ochre" }
  b7@{ shape: rect, label: "<b>Next action becomes 'Chase the payer' from day 5</b><br/>A request past the CMS time goes first on Do next" }
  s2@{ shape: stadium, label: "<b>Demo menu › Fast-forward 1 day, several times</b><br/>For example 4 days for R-1021 (Cardinal, Decision pending)" }
  p1@{ shape: rect, label: "The clock moves; days in state and the CMS days grow together" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Do next › How the list is chosen and ordered" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Header › Check all now and the demo clock" }
  s1 --> a1 --> d1
  d1 -->|"Yes"| a2 --> d2
  d1 -->|"No"| d3
  d2 -->|"Within 1.5 ×"| a3 --> d3
  d2 -->|"Over 1.5 ×"| a4 --> d3
  d2 -->|"Over 2 ×"| a5 --> d3
  d3 -->|"No"| b0
  d3 -->|"Yes"| b1 --> d4
  d4 -->|"Under 4 days"| b2
  d4 -->|"4 to 7 days"| b3 --> b5
  d4 -->|"7 days or more"| b4 --> b5
  b4 --> b6
  b3 --> b7
  b4 --> b7
  b7 --> g1
  s2 --> p1 --> d4
  p1 -.-> g2
  class s1,s2 k_start
  class a1,a2,a3,a4,a5,b0,b2,b3,b4 k_screen
  class d1,d2,d3,d4 k_decision
  class b1,b6,b7,p1 k_process
  class b5 k_overlay
  class g1,g2 k_goto
```

## Dashboard › Sites › What each site sees and out-of-site links

Every request belongs to one site, the same site on every screen. The title, the Lifecycle counts, Do next, the table, Check all now, and the notifications and Ask FLO answers about these cases follow the site view. A viewer limited to one site never sees, counts, lists or is told about the other site's cases. A direct link to one shows an out-of-site card.

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
  s1@{ shape: stadium, label: "<b>Switch the site in the top bar: Both sites, Site A or Site B</b><br/>Or Demo menu, 'Viewing as': Jordan Perez or Alex Morgan (both sites), Dr. Rivera (Site A only), Sam Okafor (Site B only)" }
  p1@{ shape: rect, label: "<b>A request's site = the site of its case</b><br/>A denial follows its case" }
  sc1@{ shape: curv-trap, label: "<b>The Dashboard follows the view</b><br/>Title, five chips, Active and Renewal due, Do next, the table and its menus, 'Check all now', the sidebar badge" }
  p2@{ shape: rect, label: "<b>Both sites: 40 authorizations, 18 waiting on payers, 3 waiting on you</b><br/>Site A: 25, 12, 2<br/>Site B: 15, 6, 1<br/>A + B = Both, for the table, every chip and the title" }
  d1@{ shape: diam, label: "Is the viewer limited to one site?" }
  p3@{ shape: rect, label: "<b>Only that site's cases exist for the viewer</b><br/>Not listed, not counted, not on Do next, not named by FLO, not in the notifications" }
  p4@{ shape: rect, label: "<b>A viewer of both sites narrows to one site and widens again</b><br/>Everything changes at once" }
  s2@{ shape: curv-trap, label: "<b>Ask FLO and the bell</b><br/>FLO answers from the cases in view and says 'at Site A' in its counts<br/>The notifications about the other site's cases are not listed, counted or marked read<br/>An old conversation is cleared when the viewer or the site changes" }
  s3@{ shape: stadium, label: "<b>Open a link to a request</b><br/>/dashboard?request=ID (a notification, Ask FLO, a bookmark)" }
  d2@{ shape: diam, label: "Is the request at a site in view?" }
  ok@{ shape: curv-trap, label: "The request drawer opens over the Dashboard" }
  o1@{ shape: curv-trap, label: "<b>Out-of-site card instead of the page</b><br/>'This case is not available at Site A'<br/>No patient, payer or detail" }
  c1@{ shape: trap-t, label: "Click 'Back to the Dashboard'" }
  p5@{ shape: rect, label: "The Dashboard opens without ?request" }
  d3@{ shape: rect, label: "Do next is built only from cases in view" }
  ok2@{ shape: curv-trap, label: "<b>Each Do next button leads to a case, denial or draft that is in view</b><br/>The list is built only from cases in view" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Arrive › What the page shows" }
  g2@{ shape: subproc, label: "Continues in: Global shell › Top bar › Ask FLO › What FLO answers" }
  g3@{ shape: subproc, label: "Continues in: Global shell › Top bar › Notifications › Open, read, click through" }
  g4@{ shape: subproc, label: "Continues in: Dashboard › Do next › How the list is chosen and ordered" }
  s1 --> p1 --> sc1 --> p2
  sc1 --> d1
  d1 -->|"Yes"| p3
  d1 -->|"No"| p4
  sc1 -.-> s2
  s2 --> g2
  s2 --> g3
  s3 --> d2
  d2 -->|"Yes"| ok
  d2 -->|"No"| o1 --> c1 --> p5 --> g1
  sc1 --> d3
  d3 --> ok2 --> g4
  class s1,s3 k_start
  class p1,p2,p3,p4,p5,d3 k_process
  class sc1,s2,ok,o1,ok2 k_screen
  class d1,d2 k_decision
  class c1 k_click
  class g1,g2,g3,g4 k_goto
```

## Dashboard › Request drawer › Open and read a request

The drawer is one scroll, with no tabs. It opens from a row, a case ID, a Do next button, or a link with ?request=ID, and shows who holds the request, its history and what is next. The sections change with the request's stage. The long lines are folded under 'Details'.

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
  s1@{ shape: stadium, label: "Click a row or a case ID in the table, or a Do next button such as 'Review answer'" }
  s2@{ shape: stadium, label: "<b>Follow a link with ?request=ID</b><br/>A notification, 'See on the Dashboard', 'Open R-xxxx' on another page" }
  p1@{ shape: rect, label: "<b>Address gets ?request=ID</b><br/>The page is dimmed behind the drawer" }
  o1@{ shape: win-pane, label: "<b>Request drawer slides in from the right</b><br/>Header, body, footer" }
  subgraph gHead ["Header"]
  h1@{ shape: curv-trap, label: "<b>Title 'P-1499 · Harborview MA'</b><br/>Subtitle 'PHP continued stay · sent Sun 4:36 pm' or '... · not sent yet'" }
  h2@{ shape: curv-trap, label: "<b>Stage chip on the right</b><br/>e.g. 'Info requested'" }
  end
  subgraph gBody ["Body, from the top down"]
  b1@{ shape: curv-trap, label: "<b>Action box (only some requests)</b><br/>'Needs your input', 'Packet is drafting the answer' or 'Approved. Write-back waits for you'<br/>The last one shows only while write-back is on in EMR Connect; otherwise a calm line says it is off" }
  b2@{ shape: curv-trap, label: "<b>Facts</b><br/>Patient 'E.S., 42', Held by (agent and next step)<br/>For a Medicaid managed care request on day 5 of the CMS clock or later: 'Decision time: Day 5 of 7 under the CMS rule for Medicaid managed care' (or 'Past 7 days')" }
  d1@{ shape: diam, label: "Does the request have a chance figure?" }
  b3@{ shape: curv-trap, label: "<b>'Approval chance' or, for a denial, 'Chance of winning'</b><br/>'74% · Moderate · likely 66 to 82% · 219 similar cases'" }
  b5@{ shape: curv-trap, label: "<b>History</b><br/>Every event, oldest first, or 'No events yet.'<br/>Green dot with the time; dashed dot with 'Scheduled · time'" }
  b6@{ shape: curv-trap, label: "<b>Details, closed</b><br/>One line: 'Sent through the payer's portal · next check in 30 minutes'<br/>Open it for 'Sent' ('Not sent yet', 'Signed and sent through the payer's portal', 'by fax' or 'by phone') and 'Checks' (the message below)" }
  b7@{ shape: win-pane, label: "<b>Demo controls</b><br/>Dashed box: pretend the payer answered<br/>Only the replies still ahead of the request show" }
  end
  d2@{ shape: diam, label: "Which message does Checks show?" }
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
  d1 -->|"Yes"| b3 --> b5
  d1 -->|"No"| b5
  b5 --> b6 --> d2
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
  class h1,h2,b1,b2,b3,b5,b6 k_screen
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
  g3@{ shape: subproc, label: "Continues in: EMR Connect › Connected systems › Read only or read and write back" }
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
  sc@{ shape: curv-trap, label: "<b>Dashboard</b><br/>The title counts one more waiting on you, the 'Info requested' chip and the Status menu count one more, and the sidebar Dashboard badge counts it<br/>A Do next row 'Review Packet's answer to ...' appears; the table row is pinned to the top: it needs you today" }
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
  e2@{ shape: stadium, label: "<b>Drawer shows Under review</b><br/>Under 'Details': 'Next automatic check in 30 minutes.'" }
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
  w2@{ shape: cyl, label: "<b>Status Decision pending</b><br/>Days in state restart<br/>History 'Navigator checked: under review' and a dashed 'Caller will phone the payer if it is still pending'" }
  t2@{ shape: odd, label: "<b>'Demo: Cardinal has it under review'</b><br/>'The stage counts and the table updated.'<br/>The payer's short name, here Cardinal" }
  c3@{ shape: trap-t, label: "Click 'Asks for information'" }
  w3@{ shape: cyl, label: "<b>Stage Info requested (amber), needs you</b><br/>Packet holds it; next step 'Packet drafted the answer. Waiting for your review'<br/>History 'The payer asked for more information'" }
  n1@{ shape: odd, label: "<b>Notification 'Payer asked for info'</b><br/>'The payer wants more on R-1021. Packet drafted the answer.'" }
  t3@{ shape: odd, label: "<b>'Demo: Cardinal asks for information'</b><br/>'The stage counts, the table and the notifications updated.'" }
  sc@{ shape: curv-trap, label: "<b>Dashboard behind the drawer</b><br/>The title, the Lifecycle chips, Do next and the row (status, days in state, next action, owner) update at once<br/>In a filtered list the row may drop out; the drawer stays open" }
  sd@{ shape: curv-trap, label: "<b>Drawer updates in place</b><br/>Chip, action box, history, the 'Details' lines and the offered buttons follow the new stage" }
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
  a1@{ shape: cyl, label: "<b>Stage Decided today, status 'Approved'</b><br/>Cadence holds it; next step 'Next review booked. Write-back waits for you'<br/>History 'The payer approved the request' and 'Cadence updated the ledger and booked the next review'" }
  an@{ shape: odd, label: "<b>Notification 'Approved': 'R-1021 was approved. Write-back waits for you.'</b><br/>Toast 'Demo: Cardinal approved it'<br/>'The stage counts, the table and the notifications updated.'" }
  as@{ shape: curv-trap, label: "<b>Dashboard after an approval</b><br/>'Decided today' in the Status menu goes up by one, the 'Decision pending' chip goes down<br/>Its Window and Units read from the ledger once Cadence has booked it; Next action 'Approve write-back'" }
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
  ds@{ shape: curv-trap, label: "<b>Dashboard after a denial</b><br/>'Denied / appeal' chip and 'Decided today' each go up by one; 'Decision pending' goes down<br/>Sidebar badge on Denial Intelligence goes up<br/>Its row shows 'Call booked', next action 'Prepare the P2P call', owner You<br/>A row hidden by the old stage filter leaves the table; the drawer stays open" }
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
