# Authorizations › Queue and case page

The queue ranked by money and time, and the case page with its five tabs.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/03-authorizations/`.

## Authorizations › Queue › Open the queue and read the top

How a person reaches the queue, what the header line says, and what the five summary tiles show and do. Bands, request tiles, filters and the payer signal each have their own diagram.

Route: `/authorizations`

Demo only: the numbers (56 open, 19 due today, 79%) are seed data. They move when actions are applied on a case page, and a request leaves the queue once it is signed and sent, decided by the payer, or settled in Denial Intelligence.

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
  s1@{ shape: stadium, label: "Click 'Authorizations' in the sidebar" }
  s2@{ shape: stadium, label: "Demo menu › 'Authorizations: the queue'" }
  s3@{ shape: stadium, label: "On a case page: click 'Back to queue' or the 'Authorizations' crumb" }
  q1@{ shape: curv-trap, label: "<b>Authorizations queue</b><br/>Header, payer signal, five tiles, filters, priority bands" }
  sb@{ shape: rect, label: "<b>Sidebar badge on 'Authorizations'</b><br/>Open requests in Act now plus Due within 24 hours (19)" }
  p1@{ shape: rect, label: "<b>The page counts the open requests</b><br/>A request that was sent, decided by the payer or settled no longer counts" }
  p2@{ shape: rect, label: "<b>The average and the next due time use each request's current chance and due time</b><br/>Including actions applied on its case page" }
  d1@{ shape: diam, label: "Is any filter on?" }
  h1@{ shape: curv-trap, label: "<b>Header: '19 of 56 open requests need action today.'</b><br/>The 19 are Act now plus Due within 24 hours<br/>With none left: 'Nothing needs action today.'" }
  h2@{ shape: curv-trap, label: "<b>Sub line: 'Five are urgent, and the average approval chance is 79%.'</b><br/>With none in Act now: 'Nothing is urgent, and ...'" }
  h3@{ shape: curv-trap, label: "<b>Header: 'X of 56 open requests match these filters.'</b><br/>No sub line" }
  nb@{ shape: trap-t, label: "Click 'New case' (top right button)" }
  g1@{ shape: subproc, label: "Continues in: New case › Referral step" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Queue › Cardinal payer signal" }
  tl@{ shape: curv-trap, label: "<b>Five summary tiles under the header</b><br/>Always count the whole queue, not the filtered list" }
  t1@{ shape: curv-trap, label: "<b>'Approval chance' 79%</b><br/>'average · likely 74–84%'<br/>Not clickable" }
  t2@{ shape: trap-t, label: "<b>Click the 'Urgent' tile</b><br/>5 · 'the Act now band'<br/>(0 once all five are sent or handled)" }
  t3@{ shape: trap-t, label: "<b>Click the 'In flight' tile</b><br/>56 · 'next due in 3 h'<br/>(or 'next one is due now', or 'nothing open')" }
  t4@{ shape: curv-trap, label: "<b>'Approved' 112</b><br/>'last 30 days'<br/>Not clickable" }
  t5@{ shape: curv-trap, label: "<b>'Denied' 46</b><br/>'last 30 days'<br/>Not clickable" }
  u1@{ shape: rect, label: "All filters are cleared, then Urgency is set to 'Act now'" }
  u2@{ shape: curv-trap, label: "<b>Only the Act now band is listed</b><br/>Header uses the 'match these filters' wording<br/>With none left, the band says 'Nothing needs you today'" }
  a1@{ shape: rect, label: "All filters are cleared" }
  a2@{ shape: curv-trap, label: "<b>Every band is listed again</b><br/>Header returns to 'need action today'" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Queue › Search and filter" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Queue › Bands and ranking" }
  s1 --> q1
  s2 --> q1
  s3 --> q1
  q1 --> sb
  q1 --> nb --> g1
  q1 --> p1 --> p2 --> d1
  d1 -->|"No"| h1 --> h2
  d1 -->|"Yes"| h3
  h2 --> tl
  h3 --> tl
  tl --> t1 & t2 & t3 & t4 & t5
  t2 --> u1 --> u2
  t3 --> a1 --> a2
  q1 --> g2
  tl --> g3
  tl --> g4
  class s1,s2,s3 k_start
  class q1,h1,h2,h3,tl,t1,t4,t5,u2,a2 k_screen
  class sb,p1,p2,u1,a1 k_process
  class d1 k_decision
  class nb,t2,t3 k_click
  class g1,g2,g3,g4 k_goto
```

## Authorizations › Queue › Bands and ranking

How open requests are split into three bands, when a request leaves its band, how they are ranked inside a band by how soon each is due, and how a band opens, closes and shows more.

Route: `/authorizations`

Demo only: which band a request sits in is fixed in the seed data. Moving the demo clock changes the due text on each tile ('in 5 h', 'now') but never moves a request to another band.

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
  q@{ shape: curv-trap, label: "<b>Queue</b><br/>Priority bands, most urgent first" }
  b1@{ shape: rect, label: "Each open request sits in exactly one band" }
  lv@{ shape: rect, label: "<b>A request leaves its band once nothing is left for a person</b><br/>Preparing or ready: it was signed and sent in New case<br/>With the payer: the payer approved or denied it<br/>Denial route: accepted, settled on the call, or the appeal is filed" }
  subgraph gB ["Three bands"]
  bn@{ shape: rect, label: "<b>Act now</b><br/>Red dot, tiles tinted red" }
  bd@{ shape: rect, label: "<b>Due within 24 hours</b><br/>Amber dot" }
  bw@{ shape: rect, label: "<b>Due this week</b><br/>Sage dot" }
  end
  dE@{ shape: diam, label: "Does the band have any request after filters?" }
  dZ@{ shape: diam, label: "Is it Act now, with no request open at all, and no search, payer or status filter on?" }
  em@{ shape: curv-trap, label: "<b>Band card stays</b><br/>'Act now (0 requests)'<br/>'Nothing needs you today'<br/>'Everything in Act now has been sent or handled.'" }
  hide@{ shape: rect, label: "The band card is left out" }
  bc@{ shape: curv-trap, label: "<b>Band card</b><br/>'Act now (5 requests)'<br/>Name, count, chevron" }
  r1@{ shape: rect, label: "<b>Inside a band, requests waiting on a person come first</b><br/>Preparing, Ready to sign, Denial route, or Needs your input" }
  r2@{ shape: rect, label: "<b>Then the soonest due first</b><br/>The due time on the tile, earliest at the top" }
  wt@{ shape: rect, label: "<b>Two due at the same time</b><br/>The lower approval chance goes first" }
  ex@{ shape: doc, label: "<b>Example in Act now</b><br/>R-1117 (due in 30 h, needs you) ranks above R-0912 (due in 22 h, payer already reviewing)" }
  hd@{ shape: trap-t, label: "Click the band header" }
  dC@{ shape: diam, label: "Is the band open now?" }
  col@{ shape: rect, label: "<b>Tiles are hidden</b><br/>Chevron turns sideways" }
  exp@{ shape: rect, label: "<b>Tiles are shown</b><br/>Chevron points down" }
  keep@{ shape: cyl, label: "<b>Open or closed is remembered for each band</b><br/>until the demo data is reset" }
  dM@{ shape: diam, label: "More than five requests in the band?" }
  all5@{ shape: rect, label: "All requests are shown" }
  top5@{ shape: rect, label: "<b>Top five are shown</b><br/>Button under them: 'Show 9 more'" }
  sm@{ shape: trap-t, label: "Click 'Show 9 more'" }
  allm@{ shape: rect, label: "<b>Every request is shown</b><br/>Button now reads 'Show fewer'" }
  sf@{ shape: trap-t, label: "Click 'Show fewer'" }
  back@{ shape: rect, label: "Back to the top five" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Queue › Read and open a request tile" }
  q --> b1
  b1 --> lv
  b1 --> bn & bd & bw
  bn --> dE
  bd --> dE
  bw --> dE
  dE -->|"No"| dZ
  dZ -->|"Yes"| em
  dZ -->|"No"| hide
  dE -->|"Yes"| bc
  bc --> r1 --> r2 --> wt
  r2 -.-> ex
  bc --> hd --> dC
  dC -->|"Yes"| col --> keep
  dC -->|"No"| exp --> keep
  bc --> dM
  dM -->|"No"| all5
  dM -->|"Yes"| top5 --> sm --> allm --> sf --> back
  top5 --> g1
  class q,em,bc k_screen
  class b1,lv,bn,bd,bw,hide,r1,r2,wt,col,exp,all5,top5,allm,back k_process
  class dE,dZ,dC,dM k_decision
  class ex k_doc
  class hd,sm,sf k_click
  class keep k_store
  class g1 k_goto
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Queue › Read and open a request tile

What each part of a request tile says, which parts are links, and where the chance, status and due text come from.

Route: `/authorizations`

Only the request ID, the 'Open' button and the 'Coverage needs a fix' pill are clickable. The rest of the tile does nothing.

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
  t@{ shape: curv-trap, label: "<b>Request tile</b><br/>One open request inside a band" }
  subgraph gL ["Left side"]
  lv@{ shape: rect, label: "<b>Level chip</b><br/>Residential 3.5, PHP, IOP, or 'Detox → Residential'" }
  id@{ shape: rect, label: "'R-1042 · J.M., 34 · Summit Medicaid HMO'" }
  dx@{ shape: rect, label: "<b>Diagnosis and review type</b><br/>'Alcohol use disorder, severe ... · admission'" }
  sc@{ shape: rect, label: "<b>Scores with a trend arrow</b><br/>'AUDIT-C 11 · PHQ-9 17 ↑'<br/>Rising, falling or unchanged" }
  end
  dR@{ shape: diam, label: "Has every check passed after actions applied on the case page?" }
  ag1@{ shape: hex, label: "<b>Integrity badge</b><br/>'Ready to sign. Integrity passed all four checks'" }
  ag2@{ shape: hex, label: "<b>The agent on the request, e.g. Scribe</b><br/>'Scribe is drafting the case'" }
  dN@{ shape: diam, label: "Needs your input, and not ready?" }
  pn@{ shape: odd, label: "Pill 'Needs your input'" }
  dC@{ shape: diam, label: "Does coverage need a fix?" }
  cl@{ shape: trap-t, label: "Click the 'Coverage needs a fix' pill" }
  gE@{ shape: subproc, label: "Continues in: Eligibility & Benefits › Verify a patient" }
  dRule@{ shape: diam, label: "Rule note on the request, and not ready?" }
  rule@{ shape: rect, label: "<b>Green note under the status</b><br/>e.g. 'Summit expects a named step-down provider with the first request.'" }
  subgraph gR ["Right side"]
  due@{ shape: rect, label: "<b>Due pill, e.g. 'Notice due in 5 h'</b><br/>Under 48 h: 'in 40 min' or 'in 5 h'. Later: 'Decision Thu'. Past: '... now'" }
  ch@{ shape: rect, label: "<b>Approval chance bar and number</b><br/>Strong 80+, Moderate 55–79, At risk below 55" }
  lift@{ shape: rect, label: "<b>Line under the word</b><br/>'+26 pts once drafted', 'waiting on the payer', 'chance to overturn', 'on track'" }
  end
  dA@{ shape: diam, label: "Were actions applied on the case page?" }
  ch2@{ shape: rect, label: "<b>Bar shows the new chance</b><br/>Line reads '+N pts possible' or 'on track'" }
  ch3@{ shape: rect, label: "Bar shows the request's own chance and line" }
  nr@{ shape: rect, label: "No note line" }
  tint@{ shape: rect, label: "<b>Tiles in Act now have a red tint</b><br/>Other bands are neutral" }
  idl@{ shape: trap-t, label: "Click the request ID (underlined)" }
  ob@{ shape: trap-t, label: "Click 'Open'" }
  gC@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  t --> lv --> id --> dx --> sc
  t --> dR
  dR -->|"Yes"| ag1
  dR -->|"No"| ag2 --> dN
  dN -->|"Yes"| pn
  dN -->|"No"| dC
  pn --> dC
  dC -->|"Yes"| cl --> gE
  dC -->|"No"| dRule
  dRule -->|"Yes"| rule
  dRule -->|"No"| nr
  t --> due --> ch --> lift --> dA
  dA -->|"Yes"| ch2
  dA -->|"No"| ch3
  t --> tint
  t --> idl --> gC
  t --> ob --> gC
  class t k_screen
  class lv,id,dx,sc,rule,due,ch,lift,ch2,ch3,nr,tint k_process
  class dR,dN,dC,dRule,dA k_decision
  class ag1,ag2 k_agent
  class pn k_toast
  class cl,idl,ob k_click
  class gE,gC k_goto
  style gL fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gR fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Queue › Search and filter

The search box and the three menus (Payer, Status, Urgency), how they combine, what the page says when nothing matches, and the 'Nothing needs you today' messages that appear once requests have been sent or handled.

Route: `/authorizations`

Demo only: filters are kept while you move around the app (not in the web address) and are cleared by Reset demo data. 'Nothing needs you today' shows in the Act now band once all five of its requests are sent or handled, and for the whole queue only when no request is left open at all.

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
  fb@{ shape: curv-trap, label: "<b>Filter bar under the tiles</b><br/>Search box, Payer, Status, Urgency" }
  subgraph gS ["Search"]
  sk@{ shape: trap-t, label: "<b>Press '/' anywhere</b><br/>(not while typing in a field)" }
  sf@{ shape: rect, label: "Cursor jumps to the search box" }
  s1@{ shape: lean-r, label: "Type in 'Search by case ID or initials'" }
  sm@{ shape: rect, label: "<b>Matches the ID or the initials</b><br/>Ignores case, dots, dashes and spaces<br/>'r1042' and 'jm' both find R-1042 (J.M.)" }
  end
  subgraph gP ["Payer"]
  p1@{ shape: trap-t, label: "Click 'Payer'" }
  p2@{ shape: win-pane, label: "Menu: All payers, Summit Medicaid HMO, Cardinal Health Plan, Evergreen, Beacon PPO, Harborview MA, Lakeshore Behavioral" }
  p3@{ shape: lean-r, label: "Pick a payer" }
  end
  subgraph gT ["Status"]
  st1@{ shape: trap-t, label: "Click 'Status'" }
  st2@{ shape: win-pane, label: "Menu: All statuses, Needs your input, Preparing, Ready to sign, With the payer, Denial route" }
  st3@{ shape: lean-r, label: "Pick a status" }
  st4@{ shape: rect, label: "<b>'Needs your input' = requests flagged as needing you</b><br/>The others = the request's phase" }
  end
  subgraph gU ["Urgency"]
  u1@{ shape: trap-t, label: "Click 'Urgency'" }
  u2@{ shape: win-pane, label: "Menu: All urgency, Act now, Due within 24 hours, Due this week" }
  u3@{ shape: lean-r, label: "Pick an urgency" }
  end
  kb@{ shape: rect, label: "In any menu: Up and Down move, Enter picks, Esc or a click outside closes it" }
  ap@{ shape: rect, label: "<b>Filters stack: a request must pass every one</b><br/>A menu that is not on its default turns green" }
  keep@{ shape: cyl, label: "Filters are kept in the app for this session" }
  hd@{ shape: curv-trap, label: "Header: 'X of 56 open requests match these filters.'" }
  clr@{ shape: trap-t, label: "<b>Click 'Clear filters'</b><br/>(appears once any filter is on)" }
  dAny@{ shape: diam, label: "Any request left?" }
  res@{ shape: curv-trap, label: "<b>Bands show only the matching requests</b><br/>Band counts follow" }
  emp@{ shape: curv-trap, label: "<b>'No requests match these filters'</b><br/>'The filters hide all 56 open requests.'" }
  ce@{ shape: trap-t, label: "Click 'Clear filters' in the message" }
  rs@{ shape: rect, label: "Search empty, All payers, All statuses, All urgency, payer-signal filter off" }
  dOpen@{ shape: diam, label: "Are there any open requests at all?" }
  e1@{ shape: stadium, label: "Every band is listed again" }
  none@{ shape: curv-trap, label: "<b>'Nothing needs you today'</b><br/>'Every open request has been sent or handled. Case Manager shows what is scheduled next.'" }
  dNow@{ shape: diam, label: "Is Act now empty, with no search, payer or status filter on?" }
  nowE@{ shape: curv-trap, label: "<b>Act now band stays, '(0 requests)'</b><br/>'Nothing needs you today'<br/>'Everything in Act now has been sent or handled.'<br/>Header sub line: 'Nothing is urgent. ...'" }
  ocm@{ shape: trap-t, label: "Click 'Open Case Manager'" }
  gCM@{ shape: subproc, label: "Continues in: Case Manager › Active cases" }
  gSig@{ shape: subproc, label: "Continues in: Authorizations › Queue › Cardinal payer signal" }
  fb --> sk --> sf --> s1
  s1 --> sm
  fb --> p1 --> p2 --> p3
  fb --> st1 --> st2 --> st3 --> st4
  fb --> u1 --> u2 --> u3
  p2 -.-> kb
  sm --> ap
  p3 --> ap
  st4 --> ap
  u3 --> ap
  ap --> keep
  ap --> hd --> dOpen
  ap --> clr --> rs
  dOpen -->|"Yes"| dAny
  dOpen -->|"No"| none --> ocm --> gCM
  dAny -->|"Yes"| res
  res -.-> dNow
  dNow -->|"Yes"| nowE
  dAny -->|"No"| emp --> ce --> rs
  rs --> e1
  fb --> gSig
  class fb,hd,res,emp,none,nowE k_screen
  class sk,p1,st1,u1,clr,ce,ocm k_click
  class sf,sm,st4,kb,ap,rs k_process
  class s1,p3,st3,u3 k_input
  class p2,st2,u2 k_overlay
  class keep k_store
  class dAny,dOpen,dNow k_decision
  class e1 k_end
  class gCM,gSig k_goto
  style gS fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gP fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gT fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gU fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Queue › Cardinal payer signal

The banner that warns about a payer trend, the filter it switches on, and the three ways to turn the filter off or hide the banner.

Route: `/authorizations`

Demo only: the banner text and which four requests it affects (I-2207, I-2218, I-2236, I-2271) are seed data. Nothing re-scores the requests live.

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
  q@{ shape: curv-trap, label: "Authorizations queue" }
  d0@{ shape: diam, label: "Are any open requests affected, and is the banner still shown?" }
  e0@{ shape: stadium, label: "<b>No banner</b><br/>None affected, or you dismissed it" }
  bn@{ shape: curv-trap, label: "<b>Banner: 'Payer signal. Cardinal Health Plan has denied 31% more IOP continued-stay requests this week ...'</b><br/>'Four of your open requests are affected, and the agents have re-scored them.'" }
  wd@{ shape: rect, label: "<b>Wording follows the count</b><br/>'Review the three' for three; one is 'One of your open requests is affected ... re-scored it'" }
  r@{ shape: trap-t, label: "Click 'Review the four'" }
  sf@{ shape: cyl, label: "Payer-signal filter turns on" }
  ls@{ shape: curv-trap, label: "<b>Queue lists only the four affected requests</b><br/>Header: '4 of 56 open requests match these filters.'" }
  chip@{ shape: curv-trap, label: "<b>Chip under the filters</b><br/>'Showing the 4 affected by the Cardinal signal'" }
  bb@{ shape: curv-trap, label: "Banner button now reads 'Show all requests'" }
  sa@{ shape: trap-t, label: "Click 'Show all requests'" }
  cx@{ shape: trap-t, label: "<b>Click the X on the chip</b><br/>'Remove the Cardinal signal filter'" }
  cf@{ shape: trap-t, label: "Click 'Clear filters'" }
  tl@{ shape: trap-t, label: "Click the 'Urgent' or 'In flight' tile" }
  off@{ shape: rect, label: "<b>Payer-signal filter turns off</b><br/>All bands return, chip goes, button reads 'Review the four' again" }
  dis@{ shape: trap-t, label: "<b>Click the X on the banner</b><br/>'Dismiss signal'" }
  hid@{ shape: cyl, label: "<b>Banner stays hidden for the session</b><br/>until the demo data is reset" }
  stay@{ shape: rect, label: "<b>If the filter was on, it stays on</b><br/>The chip and 'Clear filters' still turn it off" }
  op@{ shape: trap-t, label: "Click 'Open' on an affected request" }
  gC@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  sh@{ shape: rect, label: "<b>When an affected request is signed and sent, it leaves the queue</b><br/>The number in the banner drops" }
  q --> d0
  d0 -->|"No"| e0
  d0 -->|"Yes"| bn --> wd
  bn --> r --> sf --> ls
  sf --> chip
  sf --> bb
  bb --> sa --> off
  chip --> cx --> off
  ls --> cf --> off
  ls --> tl --> off
  bn --> dis --> hid --> stay
  ls --> op --> gC
  ls -.-> sh
  class q,bn,ls,chip,bb k_screen
  class d0 k_decision
  class e0 k_endx
  class wd,off,stay,sh k_process
  class r,sa,cx,cf,tl,dis,op k_click
  class sf,hid k_store
  class gC k_goto
```

## Authorizations › Case page › Ways in

Every link that opens a case page, and what the page does with the ID it is given: find the request, load your earlier work, pick the tab.

Route: `/authorizations/case/R-1042`

Demo only: R-1042 is the one hand-written case. Every other case page is generated from its queue row or Dashboard request, so the numbers are consistent but the wording is a template. An ID that is in the Case Manager ledger but not in the queue opens the Ledger case page. An ID in neither ends at 'Request not found'.

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
  subgraph gIn ["Links that open a case page"]
  a1@{ shape: stadium, label: "Queue: click the request ID" }
  a2@{ shape: stadium, label: "Queue: click 'Open'" }
  a3@{ shape: stadium, label: "Dashboard: click 'Open case' in a request drawer" }
  a4@{ shape: stadium, label: "Case Manager › Active cases: click a row or its ID" }
  a5@{ shape: stadium, label: "Case Manager › Reviews this week: click an ID under 'Ready to step down?'" }
  a6@{ shape: stadium, label: "Case Manager › Reviews this week: click 'Open case' in a review drawer" }
  a7@{ shape: stadium, label: "Eligibility & Benefits result: click 'Open case'" }
  a8@{ shape: stadium, label: "Notification 'Approval chance updated'" }
  a9@{ shape: stadium, label: "Type the address /authorizations/case/ID" }
  end
  r0@{ shape: rect, label: "Case page reads the ID from the address" }
  d1@{ shape: diam, label: "Is the ID R-1042?" }
  hand@{ shape: rect, label: "<b>Hand-written case</b><br/>9 requirements, 6 actions, chance 62% rising to 88%" }
  d2@{ shape: diam, label: "Is there a queue row for this ID, or for the Dashboard request it belongs to?" }
  fq@{ shape: rect, label: "<b>Page is built from the queue row</b><br/>and from its Dashboard request when there is one" }
  d3@{ shape: diam, label: "Is there a Dashboard request with this ID or this case ID?" }
  fr@{ shape: rect, label: "<b>Page is built from the Dashboard request</b><br/>Decided ones show their result and have nothing left to send" }
  gen@{ shape: rect, label: "<b>Chance, actions, criteria, draft and checks are generated</b><br/>from the payer, level of care and chance" }
  d5@{ shape: diam, label: "Is the ID in the Case Manager ledger?" }
  gL@{ shape: subproc, label: "Continues in: Case Manager › Ledger case › Open and read" }
  nf@{ shape: curv-trap, label: "<b>'Request not found'</b><br/>'There is no request with the ID X.'<br/>'Nothing to show here' · 'Check the ID, or open a request from the queue.'" }
  bq@{ shape: trap-t, label: "Click 'Back to queue' or the 'Authorizations' crumb" }
  gQ@{ shape: subproc, label: "Continues in: Authorizations › Queue › Open the queue and read the top" }
  ld@{ shape: cyl, label: "<b>Your earlier work on this case is loaded</b><br/>Answers, applied and dismissed actions, focus, clinical context, draft edits, log" }
  d4@{ shape: diam, label: "Does ?tab= name one of the five tabs?" }
  tab1@{ shape: curv-trap, label: "<b>That tab opens</b><br/>e.g. a review drawer opens '?tab=draft'" }
  tab0@{ shape: curv-trap, label: "'Recommended actions' opens" }
  gH@{ shape: subproc, label: "Continues in: Authorizations › Case page › Header and numbers" }
  a1 --> r0
  a2 --> r0
  a3 --> r0
  a4 --> r0
  a5 --> r0
  a6 --> r0
  a7 --> r0
  a8 --> r0
  a9 --> r0
  r0 --> d1
  d1 -->|"Yes"| hand --> ld
  d1 -->|"No"| d2
  d2 -->|"Yes"| fq --> gen
  d2 -->|"No"| d3
  d3 -->|"Yes"| fr --> gen
  d3 -->|"No"| d5
  d5 -->|"Yes"| gL
  d5 -->|"No"| nf
  nf --> bq --> gQ
  gen --> ld
  ld --> d4
  d4 -->|"Yes"| tab1 --> gH
  d4 -->|"No or missing"| tab0 --> gH
  class a1,a2,a3,a4,a5,a6,a7,a8,a9 k_start
  class r0,hand,fq,fr,gen k_process
  class d1,d2,d3,d5,d4 k_decision
  class gL,gQ,gH k_goto
  class nf,tab1,tab0 k_screen
  class bq k_click
  class ld k_store
  style gIn fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Header and buttons

The title block above the tabs and its three buttons. It stays the same on all five tabs, and it follows the request: once the request is sent or decided the header shows its new status. The three number tiles and the notes under it are in the next diagram.

Route: `/authorizations/case/R-1042`

Demo only: the header reads the request's current stage from the Dashboard, so signing and sending in New case, or a payer reply made with the Dashboard demo controls, shows here at once.

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
  pg@{ shape: curv-trap, label: "<b>Case page</b><br/>Crumbs, header, three tiles, notes, five tabs" }
  cr@{ shape: trap-t, label: "Click the 'Authorizations' crumb" }
  gQ@{ shape: subproc, label: "Continues in: Authorizations › Queue › Open the queue and read the top" }
  hd@{ shape: curv-trap, label: "<b>Header title</b><br/>Level chip, ID, request type chip, then one pill" }
  dCh@{ shape: diam, label: "Has the request been sent, decided or settled since this page was written, or does it already have a result?" }
  pc@{ shape: odd, label: "Pill shows the request's current status, e.g. 'Received', 'Approved'" }
  pd@{ shape: rect, label: "<b>Pill shows the due text, e.g. 'Notice due in 5 h'</b><br/>Red under 6 h, amber under 24 h, grey later" }
  sub@{ shape: rect, label: "<b>Sub line: 'J.M., 34 · Summit Medicaid HMO · Residential 3.5 · 14 days requested'</b><br/>Then the diagnosis and the scores" }
  dRd@{ shape: diam, label: "Ready: all four checks pass and still preparing?" }
  ag1@{ shape: hex, label: "<b>Integrity badge</b><br/>'Ready to sign. Integrity passed all four checks'" }
  ag3@{ shape: hex, label: "<b>The request's own agent and line</b><br/>e.g. Navigator: 'Navigator checks again in 30 minutes'" }
  ag2@{ shape: hex, label: "<b>Agent badge and status line</b><br/>e.g. Scribe: 'Scribe is drafting the case'" }
  dDb@{ shape: diam, label: "Is the request on the Dashboard past Preparing?" }
  od@{ shape: trap-t, label: "Click 'Open on the Dashboard' (next to the status line)" }
  gDb@{ shape: subproc, label: "Continues in: Dashboard › Request drawer" }
  subgraph gBt ["Header buttons"]
  b1@{ shape: trap-t, label: "Click 'Open in review and sign'" }
  b2@{ shape: trap-t, label: "Click 'Send to payer'" }
  b3@{ shape: trap-t, label: "Click 'Back to queue'" }
  end
  dSn@{ shape: diam, label: "Is it already with the payer or decided?" }
  sn@{ shape: rect, label: "<b>'Send to payer' is replaced by a greyed-out 'Sent to payer'</b><br/>The note gives the reason, e.g. 'Already with the payer. Navigator is tracking it.'" }
  dEn@{ shape: diam, label: "Can it be sent?" }
  on@{ shape: rect, label: "<b>'Send to payer' is on</b><br/>Note: 'Sending opens review and sign. Nothing goes to the payer until a clinician signs.'" }
  off@{ shape: rect, label: "<b>'Send to payer' is greyed out, a click does nothing</b><br/>The note and a hover hint give the reason" }
  gS@{ shape: subproc, label: "Continues in: Authorizations › Case page › Send to payer and review and sign" }
  gN@{ shape: subproc, label: "Continues in: Authorizations › Case page › Numbers and notes" }
  pg --> cr --> gQ
  pg --> hd --> dCh
  dCh -->|"Yes"| pc
  dCh -->|"No"| pd
  pc --> sub
  pd --> sub
  sub --> dRd
  dRd -->|"Yes"| ag1
  dRd -->|"No"| ag2
  dCh -.->|"Yes"| ag3
  ag1 --> dDb
  ag2 --> dDb
  ag3 --> dDb
  dDb -->|"Yes"| od --> gDb
  pg --> b1 --> gS
  pg --> b2 --> dSn
  dSn -->|"Yes"| sn
  dSn -->|"No"| dEn
  dEn -->|"Yes"| on --> gS
  dEn -->|"No"| off
  pg --> b3 --> gQ
  pg --> gN
  class pg,hd k_screen
  class cr,od,b1,b2,b3 k_click
  class gQ,gDb,gS,gN k_goto
  class dCh,dRd,dDb,dSn,dEn k_decision
  class pc k_toast
  class pd,sub,sn,on,off k_process
  class ag1,ag3,ag2 k_agent
  style gBt fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Numbers and notes

The three tiles, the denial banner and the two standing notes under the header. They stay on screen on all five tabs and change as actions are applied.

Route: `/authorizations/case/R-1042`

Demo only: the numbers are seed data plus simple arithmetic.

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
  pg@{ shape: curv-trap, label: "<b>Under the header buttons</b><br/>Three tiles, banners" }
  subgraph gT1 ["Tile 1"]
  t1@{ shape: curv-trap, label: "<b>'Approval chance' (or 'Chance to overturn' on a denial)</b><br/>Ring counts up over about a second<br/>'62% → 88%'" }
  t1a@{ shape: rect, label: "<b>Line under it</b><br/>'if every action is applied'<br/>After applying: 'up to 88% with the rest' or 'after the agents' checks'" }
  t1b@{ shape: rect, label: "<b>Pill 'Moderate · likely range 57–66%'</b><br/>Strong 80+, Moderate 55–79, At risk below 55" }
  end
  subgraph gT2 ["Tile 2"]
  t2@{ shape: curv-trap, label: "<b>'How sure are we'</b><br/>High, Medium or Benchmark estimate" }
  dBm@{ shape: diam, label: "Fewer than 100 similar cases from you and the network?" }
  t2a@{ shape: rect, label: "'Based on 1,248 similar cases: 212 yours, 806 from the network, 230 benchmark'" }
  t2b@{ shape: rect, label: "<b>'Little history for this payer ... benchmark estimate'</b><br/>'Only N are yours or the network's.'" }
  end
  subgraph gT3 ["Tile 3"]
  t3@{ shape: curv-trap, label: "<b>'Days likely granted'</b><br/>'11 of 14 days likely'" }
  t3a@{ shape: rect, label: "'62% chance of all 14, otherwise most likely 7'" }
  t3b@{ shape: rect, label: "<b>On a denial: 'Days in question'</b><br/>'The payer approved part of the stay. The other days are what the call is about.'" }
  end
  dDn@{ shape: diam, label: "Is it a denial?" }
  bd@{ shape: odd, label: "<b>Banner 'This request was denied'</b><br/>'Advocate owns the next step. The peer-to-peer brief and the appeal live in Denial Intelligence.'" }
  bdo@{ shape: trap-t, label: "Click 'Open in Denial Intelligence'" }
  gD@{ shape: subproc, label: "Continues in: Denial Intelligence › Open a denial" }
  n1@{ shape: odd, label: "Note: 'The approval chance estimates how well the paperwork fits this payer's past decisions. It never blocks a request and is never shown to payers or patients.'" }
  n2@{ shape: odd, label: "Note: 'Decision support for documentation and workflow only. It does not recommend or decide care.'" }
  gT@{ shape: subproc, label: "Continues in: Authorizations › Case page › Tabs and deep links" }
  ap@{ shape: cyl, label: "<b>Applying actions on the first tab moves tile 1 and tile 3 and the range</b><br/>See Recommended actions › Apply selected<br/>Adding clinical context moves them by a point each (up to three)<br/>Refining the recommendations moves the number after the arrow" }
  pg --> t1 --> t1a --> t1b
  pg --> t2 --> dBm
  dBm -->|"No"| t2a
  dBm -->|"Yes"| t2b
  pg --> t3 --> t3a
  t3 -.-> t3b
  pg --> dDn
  dDn -->|"Yes"| bd --> bdo --> gD
  dDn -->|"No"| n1
  bd --> n1
  n1 --> n2 --> gT
  t1b -.-> ap
  class pg,t1,t2,t3 k_screen
  class t1a,t1b,t2a,t2b,t3a,t3b k_process
  class dBm,dDn k_decision
  class bd,n1,n2 k_toast
  class bdo k_click
  class gD,gT k_goto
  class ap k_store
  style gT1 fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gT2 fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gT3 fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Tabs and deep links

The five tabs under the header, how the address follows them, what the two badges count, and the buttons on other tabs that jump to one recommendation card.

Route: `/authorizations/case/R-1042?tab=actions`

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
  s1@{ shape: stadium, label: "A case page opens" }
  d1@{ shape: diam, label: "Does the address name a valid tab (tab=...)?" }
  ts@{ shape: rect, label: "That tab is selected" }
  ta@{ shape: rect, label: "Recommended actions is selected" }
  tabs@{ shape: curv-trap, label: "<b>Tab strip</b><br/>Recommended actions · Clinical picture · Payer criteria · Risk analysis · Draft" }
  subgraph gC ["Click a tab"]
  c1@{ shape: trap-t, label: "Click 'Recommended actions'" }
  c2@{ shape: trap-t, label: "Click 'Clinical picture'" }
  c3@{ shape: trap-t, label: "Click 'Payer criteria'" }
  c4@{ shape: trap-t, label: "Click 'Risk analysis'" }
  c5@{ shape: trap-t, label: "Click 'Draft'" }
  end
  url@{ shape: rect, label: "<b>The address changes to tab=actions, picture, criteria, risk or draft</b><br/>Browser Back returns to the previous tab" }
  fd@{ shape: rect, label: "<b>The tab's panel fades in</b><br/>Header and tiles stay as they were" }
  rec@{ shape: rect, label: "Any tab click drops rec= from the address" }
  b1@{ shape: rect, label: "<b>Badge on 'Recommended actions'</b><br/>Number of open recommendations (6)<br/>Gone when none are left" }
  b2@{ shape: rect, label: "<b>Badge on 'Draft'</b><br/>Number of checks that need attention (2)<br/>Gone when all four pass" }
  subgraph gD ["Buttons that jump to one card"]
  l1@{ shape: trap-t, label: "Clinical picture › 'Settle it' on a 'Still open' line" }
  l2@{ shape: trap-t, label: "Payer criteria › 'Go to the action' under 'Could be stronger'" }
  l3@{ shape: trap-t, label: "Payer criteria › 'Open the action' in 'To keep the approval chance high'" }
  end
  dl@{ shape: rect, label: "Recommended actions opens with rec= set to that card's ID" }
  fc@{ shape: rect, label: "<b>The card scrolls to the middle of the screen</b><br/>and gets a green outline" }
  dEx@{ shape: diam, label: "Is that card still open?" }
  nofc@{ shape: rect, label: "<b>Nothing to scroll to</b><br/>Applied cards are one-line rows; dismissed ones are in 'Dismissed'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › The tab" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › Clinical picture" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Case page › Payer criteria" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Case page › Risk analysis" }
  g5@{ shape: subproc, label: "Continues in: Authorizations › Case page › Draft › Read and edit" }
  s1 --> d1
  d1 -->|"Yes"| ts --> tabs
  d1 -->|"No or missing"| ta --> tabs
  tabs --> b1 & b2
  tabs --> url --> rec --> fd
  tabs --> c1 & c2 & c3 & c4 & c5
  c1 --> g1
  c2 --> g2
  c3 --> g3
  c4 --> g4
  c5 --> g5
  l1 --> dl
  l2 --> dl
  l3 --> dl
  dl --> dEx
  dEx -->|"Yes"| fc
  dEx -->|"No"| nofc
  class s1 k_start
  class d1,dEx k_decision
  class ts,ta,url,fd,rec,b1,b2,dl,fc,nofc k_process
  class tabs k_screen
  class c1,c2,c3,c4,c5,l1,l2,l3 k_click
  class g1,g2,g3,g4,g5 k_goto
  style gC fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gD fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Send to payer and review and sign

When the 'Send to payer' button is on or greyed out, what both header buttons do when clicked, and which New case draft they open. Nothing is sent from the case page: a clinician signs in New case.

Route: `/authorizations/case/R-1042`

Every request gets a draft in New case, made from its own data when it has none (five requests have one already: R-1042, I-2207, R-0988, R-1101, I-2262). It never opens blank at the Referral step. 'Open in review and sign' is always on, even for a request already with the payer.

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
  cp@{ shape: curv-trap, label: "<b>Case page</b><br/>'Send to payer' appears in the header, the Recommended actions side panel and the Draft tab" }
  d1@{ shape: diam, label: "Does the request already have a result (decided)?" }
  r1@{ shape: rect, label: "<b>The button becomes a disabled 'Sent to payer'</b><br/>Tooltip: 'Approved. Nothing is left to send.'<br/>(the result word comes from the request)" }
  d2@{ shape: diam, label: "Is it already with the payer?" }
  r2@{ shape: rect, label: "<b>The button becomes a disabled 'Sent to payer'</b><br/>Tooltip: 'Already with the payer. Navigator is tracking it.'" }
  d3@{ shape: diam, label: "Is it a denial?" }
  r3@{ shape: rect, label: "Greyed out. Reason: 'This request was denied. Advocate owns the next step.'" }
  d4@{ shape: diam, label: "Do all four Integrity checks pass?" }
  r4@{ shape: rect, label: "Greyed out. Reason: 'Integrity has 2 open checks. Apply the matching actions first.'" }
  on@{ shape: rect, label: "<b>'Send to payer' is on</b><br/>'Sending opens review and sign. Nothing goes to the payer until a clinician signs.'" }
  subgraph gChk ["What keeps a check open"]
  k1@{ shape: rect, label: "<b>'Every sentence matches the chart'</b><br/>open after you edit the draft, until 'Re-check'" }
  k2@{ shape: rect, label: "<b>'Payer criteria are covered'</b><br/>open until its action is applied (e.g. 'Name the step-down provider')" }
  k3@{ shape: rect, label: "<b>'Dates are consistent'</b><br/>open until its action is applied (e.g. 'Settle the sertraline start date')" }
  k4@{ shape: rect, label: "<b>'Identifiers are protected'</b><br/>always passes in the demo" }
  end
  dm@{ shape: rect, label: "<b>Dismissing the action does not clear its check</b><br/>The dismiss dialog warns about this" }
  b1@{ shape: trap-t, label: "<b>Click 'Open in review and sign'</b><br/>(always on)" }
  b2@{ shape: trap-t, label: "<b>Click 'Send to payer'</b><br/>(only when on)" }
  rp@{ shape: rect, label: "<b>Find this request's draft in New case</b><br/>The draft named like 'draft-r1042', or any draft with this case ID<br/>Or make one: draftFromRequest" }
  d5@{ shape: diam, label: "Does the request already have a draft?" }
  mk@{ shape: rect, label: "<b>A draft is created from the request</b><br/>Patient, payer, level of care, request type, a reason and diagnoses from the case page<br/>The documents the payer's saved list asks for, as sample files<br/>Not saved, so Case Manager does not list it" }
  up@{ shape: rect, label: "<b>A draft that exists is brought up to date</b><br/>Answers from applied actions (sertraline date, step-down provider) are added<br/>The therapy note is added when that action was applied<br/>When every check passes the run is marked finished" }
  d6@{ shape: diam, label: "Where does the request stand?" }
  g1@{ shape: subproc, label: "Continues in: New case › Agents work" }
  g2@{ shape: subproc, label: "Continues in: New case › Review and sign" }
  g3@{ shape: subproc, label: "Continues in: Review and sign › After sending" }
  sent@{ shape: stadium, label: "<b>New case shows 'R-0912 was sent'</b><br/>'Open it on the Dashboard' and 'Back to Case Manager'<br/>The draft is marked sent, so it cannot be signed again" }
  ns@{ shape: rect, label: "<b>Nothing has been sent</b><br/>A licensed clinician signs in New case" }
  cp --> d1
  d1 -->|"Yes"| r1
  d1 -->|"No"| d2
  d2 -->|"Yes"| r2
  d2 -->|"No"| d3
  d3 -->|"Yes"| r3
  d3 -->|"No"| d4
  d4 -->|"No"| r4
  d4 -->|"Yes"| on
  r4 -.-> k1
  r4 -.-> k2
  r4 -.-> k3
  r4 -.-> k4
  k2 --> dm
  k3 --> dm
  cp --> b1
  on --> b2
  b1 --> rp
  b2 --> rp
  rp --> d5
  d5 -->|"No"| mk --> d6
  d5 -->|"Yes"| up --> d6
  d6 -->|"Agents still have work, e.g. R-1042 before its actions are applied"| g1
  d6 -->|"Ready or all four checks passed, e.g. R-0988, R-1142, R-1042 after its actions"| g2
  d6 -->|"Already with the payer or decided"| sent
  rp -.-> ns
  sent --> g3
  class cp k_screen
  class d1,d2,d3,d4,d5,d6 k_decision
  class r1,r2,r3,r4,on,k1,k2,k3,k4,dm,rp,mk,up,ns k_process
  class b1,b2 k_click
  class g1,g2,g3 k_goto
  class sent k_endx
  style gChk fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Recommended actions › The tab

The layout of the first tab: the cards on the left, the five buttons, the context you added and the decision log on the right, and when each button is on or off. Each card and each button has its own diagram.

Route: `/authorizations/case/R-1042?tab=actions`

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
  s1@{ shape: stadium, label: "Click 'Recommended actions'" }
  at@{ shape: curv-trap, label: "<b>Recommended actions</b><br/>Cards on the left, side panel on the right" }
  in@{ shape: rect, label: "<b>Intro line</b><br/>'Each card shows what the agents will add to the draft and how much it tends to help. Applied together, they take the chance from 62% to 88%.'" }
  subgraph gL ["Left: the cards"]
  fb@{ shape: curv-trap, label: "<b>Banner 'Focus: ...' with 'Clear focus'</b><br/>Only after 'Refine recommendations'" }
  oc@{ shape: curv-trap, label: "<b>Open cards</b><br/>One card per recommendation that is not yet applied or dismissed<br/>After a refinement: in the new order, plus one card marked 'Added for your focus'" }
  ap@{ shape: curv-trap, label: "<b>'Applied (6)' (only when something is applied)</b><br/>One line each with a green tick and '+11 pts · applied'<br/>Click a line to open its bullets" }
  dm@{ shape: curv-trap, label: "<b>'Dismissed (1)' (only when something is dismissed)</b><br/>Title struck through, 'Reason logged: ...', 'Bring back'" }
  ban@{ shape: odd, label: "<b>Banner 'Every recommendation is applied'</b><br/>'The draft is up to date. Open the Draft tab to read it, or send it to the payer.'" }
  end
  subgraph gR ["Right: the side panel"]
  cnt@{ shape: rect, label: "<b>Count line</b><br/>'6 of 6 recommendations will be included in the draft.'<br/>When none are open: 'No open recommendations. Applied ones are listed on the left.'" }
  b1@{ shape: trap-t, label: "Click 'Apply selected (6)'" }
  b2@{ shape: trap-t, label: "<b>Click 'Send to payer'</b><br/>(a greyed-out 'Sent to payer' once the request is with the payer)" }
  b3@{ shape: trap-t, label: "Click 'Refine recommendations'" }
  b4@{ shape: trap-t, label: "Click 'Add clinical context'" }
  b5@{ shape: trap-t, label: "Click 'Dismiss recommendations'" }
  cx@{ shape: curv-trap, label: "<b>'Context you added'</b><br/>Each note with '+1 pt'<br/>Only once a note is added" }
  lg@{ shape: curv-trap, label: "<b>'Logged decisions'</b><br/>Newest six entries, each with the time" }
  end
  off@{ shape: rect, label: "<b>Why a button is off</b><br/>Apply and Dismiss: no card is included<br/>Send to payer: checks open, or the request is not sendable, or it was already sent<br/>All five: while the agents are updating the draft" }
  tk@{ shape: trap-t, label: "Click a card's checkbox or title to leave it out or put it back" }
  up@{ shape: rect, label: "<b>Count line and 'Apply selected (N)' follow</b><br/>Nothing is logged" }
  dAll@{ shape: diam, label: "Is anything open?" }
  dApp@{ shape: diam, label: "Is anything applied?" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › One card" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › Apply selected" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Case page › Send to payer and review and sign" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › Refine and add clinical context" }
  g6@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › Add clinical context" }
  g5@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › Dismiss and bring back" }
  s1 --> at --> in
  at --> dAll
  at --> fb
  dAll -->|"Yes"| oc --> g1
  dAll -->|"No"| dApp
  dApp -->|"Yes"| ban
  dApp -->|"No"| cnt
  at --> ap
  at --> dm
  at --> cnt
  oc --> tk --> up --> cnt
  cnt --> b1 --> g2
  cnt --> b2 --> g3
  cnt --> b3 --> g4
  cnt --> b4 --> g6
  cnt --> b5 --> g5
  cnt --> off
  at --> cx
  at --> lg
  class s1 k_start
  class at,fb,oc,ap,dm,cx,lg k_screen
  class in,cnt,off,up k_process
  class ban k_toast
  class b1,b2,b3,b4,b5,tk k_click
  class dAll,dApp k_decision
  class g1,g2,g3,g4,g6,g5 k_goto
  style gL fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gR fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Recommended actions › One card

Everything on one recommendation card: leaving it out, the question some cards ask, notes to the agent that does the work, the 'Why this matters' note and the links.

Route: `/authorizations/case/R-1042?tab=actions`

Demo only: the note box saves your words on the case and logs them. The agent does not read them again until the next Apply.

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
  cd@{ shape: curv-trap, label: "<b>Recommendation card</b><br/>Checkbox, title, pills, bullets, 'Why this matters', agent line, buttons" }
  pl@{ shape: rect, label: "<b>Pills</b><br/>'+11 pts' on every card ('+1 pt' for one point)<br/>'Needs your input' or 'Answer added' on cards that ask a question<br/>'Added for your focus' on the card that Refine recommendations added" }
  bl@{ shape: rect, label: "Up to three bullets say what the agent will add" }
  tk@{ shape: trap-t, label: "Click the checkbox or the title" }
  tg@{ shape: rect, label: "<b>Card is included in, or left out of, the draft</b><br/>Side-panel count follows<br/>Nothing is logged" }
  wy@{ shape: trap-t, label: "Click 'Why this matters'" }
  wo@{ shape: rect, label: "<b>A short reason opens under the bullets</b><br/>Click again to close" }
  dQ@{ shape: diam, label: "Does the card ask a question?" }
  subgraph gQ ["Cards with a question"]
  an@{ shape: lean-r, label: "<b>Type the answer in the box</b><br/>e.g. 'Step-down program and first appointment'" }
  dA@{ shape: diam, label: "Is there an answer?" }
  er@{ shape: rect, label: "<b>After a failed Apply, red text under the box</b><br/>'Type your answer before Scribe can apply this.'" }
  sn@{ shape: trap-t, label: "<b>Click 'Send note'</b><br/>(off until there is an answer)" }
  cp@{ shape: rect, label: "<b>Caption: 'Scribe uses your answer in the draft.'</b><br/>After a note: 'Note sent to Scribe.'" }
  end
  subgraph gN ["Cards without a question"]
  an2@{ shape: trap-t, label: "Click 'Add a note'" }
  ni@{ shape: lean-r, label: "Type in 'Add context or a note for the agent…'" }
  sn2@{ shape: trap-t, label: "<b>Click 'Send note'</b><br/>(off until something is typed)" }
  cn@{ shape: trap-t, label: "Click 'Cancel'" }
  cx@{ shape: rect, label: "<b>The note box closes</b><br/>What you typed is kept if you open it again" }
  sh@{ shape: rect, label: "Under the card: 'Note sent to Packet: “...”'" }
  end
  nt@{ shape: cyl, label: "<b>Note saved on the case</b><br/>Log: 'You sent Scribe a note: ...'" }
  tn@{ shape: odd, label: "<b>'Note sent to Scribe'</b><br/>'It will be used the next time the draft is updated.'" }
  ag@{ shape: hex, label: "<b>Agent line: badge and 'Scribe does this'</b><br/>Scribe writes the plan, Packet attaches documents, Integrity settles dates, Reader finds chart notes, Verify fixes coverage" }
  dL@{ shape: diam, label: "Is it the coverage card?" }
  lk@{ shape: trap-t, label: "Click 'Open Eligibility & Benefits'" }
  gE@{ shape: subproc, label: "Continues in: Eligibility & Benefits › Verify a patient" }
  ds@{ shape: trap-t, label: "Click 'Dismiss'" }
  gD@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › Dismiss and bring back" }
  lk2@{ shape: rect, label: "<b>While the agents are updating the draft</b><br/>the checkbox, answer box, 'Send note' and 'Dismiss' are locked" }
  cd --> pl --> bl
  cd --> tk --> tg
  cd --> wy --> wo
  cd --> dQ
  dQ -->|"Yes"| an --> dA
  dA -->|"No"| er
  dA -->|"Yes"| sn
  sn --> nt
  sn --> cp
  dQ -->|"No"| an2 --> ni
  ni --> sn2 --> nt
  an2 --> cn --> cx
  sn2 --> sh
  nt --> tn
  cd --> ag --> dL
  dL -->|"Yes"| lk --> gE
  dL -->|"No"| ds
  lk --> ds
  ds --> gD
  cd -.-> lk2
  class cd k_screen
  class pl,bl,tg,wo,er,cp,cx,sh,lk2 k_process
  class tk,wy,sn,an2,sn2,cn,lk,ds k_click
  class dQ,dA,dL k_decision
  class an,ni k_input
  class nt k_store
  class tn k_toast
  class ag k_agent
  class gE,gD k_goto
  style gQ fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gN fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Recommended actions › Apply selected

What 'Apply selected' does: the check for missing answers, the eight-second work strip, and everything that changes when the agents finish (chance, draft version, log, Dashboard, queue, notification).

Route: `/authorizations/case/R-1042?tab=actions`

Demo only: the eight seconds are a simulated wait. The new chance is the old chance plus the points on the cards you included (and any clinical context), worked out on the page. The run belongs to the app, so it still finishes if you leave the page.

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
  ap@{ shape: trap-t, label: "Click 'Apply selected (6)'" }
  d0@{ shape: diam, label: "Is at least one card included?" }
  e0@{ shape: stadium, label: "<b>Button is off</b><br/>Nothing to apply" }
  d1@{ shape: diam, label: "Does an included card ask a question that has no answer?" }
  t1@{ shape: odd, label: "<b>'Add your answer first'</b><br/>'2 selected actions need your input before it can be applied.'" }
  sc@{ shape: rect, label: "<b>Red text on those cards</b><br/>Page scrolls to the first one" }
  e1@{ shape: stadium, label: "<b>Nothing is applied</b><br/>Answer, or uncheck the card, then try again" }
  st@{ shape: rect, label: "<b>New chance worked out</b><br/>Current chance plus the points on the included cards" }
  run@{ shape: cyl, label: "<b>A run starts on this case</b><br/>All five side buttons and every card control lock" }
  top@{ shape: rect, label: "Page scrolls to the top so the strip and the ring are in view" }
  strip@{ shape: curv-trap, label: "<b>Work strip</b><br/>'The agents are updating the draft · about 8 seconds'" }
  subgraph gA ["Agents in turn"]
  a1@{ shape: hex, label: "<b>Scribe</b><br/>'Reading your answers' › 'Writing the new sentences into the draft' › 'Rewriting 2 sections' › 'Draft updated'" }
  a2@{ shape: hex, label: "<b>Integrity</b><br/>'Reading every sentence against the chart' › 'Checking dates and identifiers' › 'Every sentence matches the chart'" }
  a3@{ shape: hex, label: "<b>Forecaster</b><br/>'Matching 1,248 similar decisions' › 'Re-scoring the approval chance' › 'New chance ready'" }
  end
  w@{ shape: delay, label: "<b>About 8 seconds in all</b><br/>(demo: simulated)<br/>Each agent: Waiting, spinner, green tick" }
  dn@{ shape: cyl, label: "<b>Run ends</b><br/>Cards move to 'Applied'<br/>Chance and 'points left' saved on the case<br/>New draft version: 'Scribe', 'Added 6 recommendations'<br/>Log: Scribe applied '...' for each card" }
  rg@{ shape: rect, label: "<b>Header ring counts up to the new chance</b><br/>Pill, likely range and 'Days likely granted' follow" }
  dQ@{ shape: diam, label: "Is this a queue request with a Dashboard entry?" }
  db@{ shape: cyl, label: "<b>Dashboard request gets the new chance</b><br/>Timeline: 'Scribe added 6 items to the draft. Approval chance is now 88%'" }
  qu@{ shape: rect, label: "<b>Queue tile shows the new chance</b><br/>Line reads '+N pts possible' or 'on track'<br/>Queue average moves too" }
  nf@{ shape: odd, label: "<b>Notification from Forecaster: 'Approval chance updated'</b><br/>'R-1042 is now 88% after 6 actions.'<br/>Click it to return to this case" }
  ts@{ shape: odd, label: "<b>Toast: 'Draft updated'</b><br/>'6 actions applied. Approval chance is now 88%.'" }
  dR@{ shape: diam, label: "Do all four checks pass now?" }
  ok@{ shape: rect, label: "<b>'Send to payer' turns on</b><br/>Badge on the Draft tab clears<br/>Banner 'Every recommendation is applied' if none are left" }
  no@{ shape: rect, label: "<b>'Send to payer' stays off</b><br/>Its reason names the checks still open" }
  pt@{ shape: rect, label: "<b>Cards you left out stay open</b><br/>Header line then reads 'up to N% with the rest'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Draft › Read and edit" }
  ap --> d0
  d0 -->|"No"| e0
  d0 -->|"Yes"| d1
  d1 -->|"Yes"| t1 --> sc --> e1
  d1 -->|"No"| st --> run --> top --> strip
  strip --> a1 --> a2 --> a3
  a3 --> w --> dn
  dn --> rg --> dQ
  dQ -->|"Yes"| db --> qu
  dQ -->|"No"| qu
  dn --> nf
  dn --> ts
  dn --> dR
  dR -->|"Yes"| ok
  dR -->|"No"| no
  dn -.-> pt
  ok --> g1
  class ap k_click
  class d0,d1,dQ,dR k_decision
  class e0,e1 k_endx
  class t1,nf,ts k_toast
  class sc,st,top,rg,qu,ok,no,pt k_process
  class run,dn,db k_store
  class strip k_screen
  class a1,a2,a3 k_agent
  class w k_wait
  class g1 k_goto
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Recommended actions › Dismiss and bring back

Dismissing one card or every included card, why the dialog asks for a reason, what it warns about when a card gates 'Send to payer', and how to bring a card back.

Route: `/authorizations/case/R-1042?tab=actions`

The reason is written to the shared list of dismissals that Analytics reads, one line for each time 'Dismiss and log' is confirmed (not one per card). It also shows in 'Logged decisions', on the dismissed card and in the Dashboard request's history.

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
  d1@{ shape: trap-t, label: "Click 'Dismiss' on one card" }
  d2@{ shape: trap-t, label: "<b>Click 'Dismiss recommendations' in the side panel</b><br/>(all included cards at once)" }
  m@{ shape: win-pane, label: "<b>Dialog 'Dismiss this recommendation?' or 'Dismiss 3 recommendations?'</b><br/>'Say why. The reason is logged and helps the agents learn what is useful.'" }
  li@{ shape: rect, label: "Bullet list of the card titles" }
  dg@{ shape: diam, label: "Does a title clear a check that gates 'Send to payer'?" }
  wb@{ shape: odd, label: "Warning: '... clears a check that gates Send to payer. Dismissing it leaves that check open. You can bring it back later.'" }
  subgraph gR ["Reason (pick one)"]
  r1@{ shape: trap-t, label: "Pick 'Already handled outside Psyflo'" }
  r2@{ shape: trap-t, label: "Pick 'Not relevant to this request'" }
  r3@{ shape: trap-t, label: "Pick 'The chart does not support it'" }
  r4@{ shape: trap-t, label: "Pick 'Other'" }
  end
  ot@{ shape: lean-r, label: "Type in 'Tell us in a few words'" }
  dok@{ shape: diam, label: "Is a reason picked, and text typed if it is 'Other'?" }
  dis@{ shape: rect, label: "'Dismiss and log' stays off" }
  cf@{ shape: trap-t, label: "Click 'Dismiss and log'" }
  cx@{ shape: trap-t, label: "Click 'Cancel', the X or the dimmed area, or press Esc" }
  ce@{ shape: stadium, label: "<b>Dialog closes</b><br/>Nothing changes" }
  st@{ shape: cyl, label: "<b>Each card saved as dismissed with the reason and the time</b><br/>Log: You dismissed '(title)'. Reason: ..." }
  dsh@{ shape: cyl, label: "<b>If the request is on the Dashboard: an event on its history</b><br/>'You dismissed ... Reason: ...'" }
  an@{ shape: cyl, label: "<b>Dismissal recorded for Analytics</b><br/>The request and the reason" }
  gA@{ shape: subproc, label: "Continues in: Analytics › Arrive and read the page" }
  tt@{ shape: odd, label: "<b>'Recommendation dismissed' or '3 recommendations dismissed'</b><br/>'The reason is logged and feeds Analytics.'" }
  mv@{ shape: rect, label: "<b>Cards leave the open list</b><br/>Header line 'up to N%' drops their points<br/>'Dismissed (1)' appears: struck-through title, 'Reason logged: ...'" }
  gt@{ shape: rect, label: "<b>If the card gated a check, that check stays open</b><br/>'Send to payer' stays off" }
  bb@{ shape: trap-t, label: "Click 'Bring back' on a dismissed card" }
  rs@{ shape: cyl, label: "<b>Card returns to the open list</b><br/>Log: 'You brought back a dismissed recommendation'" }
  nt@{ shape: rect, label: "No toast; the points count again" }
  d1 --> m
  d2 --> m
  m --> li --> dg
  dg -->|"Yes"| wb
  dg -->|"No"| r1
  wb --> r1
  m --> r1 & r2 & r3 & r4
  r4 --> ot
  r1 --> dok
  r2 --> dok
  r3 --> dok
  ot --> dok
  dok -->|"No"| dis
  dok -->|"Yes"| cf
  m --> cx --> ce
  cf --> st --> dsh
  st --> an --> gA
  st --> tt
  st --> mv --> gt
  mv --> bb --> rs --> nt
  class d1,d2,r1,r2,r3,r4,cf,cx,bb k_click
  class m k_overlay
  class li,dis,mv,gt,nt k_process
  class dg,dok k_decision
  class wb,tt k_toast
  class ot k_input
  class ce k_endx
  class st,dsh,an,rs k_store
  class gA k_goto
  style gR fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Recommended actions › Refine and add clinical context

'Refine recommendations' re-orders the cards and may add one that fits, so the approval chance preview moves. 'Add clinical context' has its own diagram; the 'Logged decisions' list shows the trace of both.

Route: `/authorizations/case/R-1042?tab=actions`

Demo only: the refinement is a short simulated wait with a fixed result. The same focus on the same request always gives the same order and the same added card.

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
  rf@{ shape: trap-t, label: "Click 'Refine recommendations'" }
  rm@{ shape: win-pane, label: "<b>Panel 'Refine recommendations'</b><br/>'Pick what matters most for this request. Historian and Scribe put the matching cards first and may add one.'" }
  rp@{ shape: lean-r, label: "<b>Pick one focus</b><br/>'Strengthen medical necessity' · 'Meet payer criteria' · 'Reduce denial risk'" }
  rd@{ shape: rect, label: "<b>'Apply focus' stays off until a focus is picked</b><br/>and while that focus is the one already set" }
  ra@{ shape: trap-t, label: "Click 'Apply focus'" }
  rx@{ shape: trap-t, label: "<b>Click 'Cancel', the X or the dimmed area, or press Esc</b><br/>(Esc closes only the panel)" }
  re@{ shape: stadium, label: "<b>Panel closes</b><br/>Nothing changes" }
  sp@{ shape: rect, label: "Button shows a spinner for about 1.2 seconds" }
  hs@{ shape: hex, label: "<b>Historian and Scribe re-rank the cards</b><br/>(demo: simulated)" }
  fs@{ shape: cyl, label: "<b>Focus saved on the case</b><br/>Log: 'You refined the recommendations: ...'" }
  ro@{ shape: rect, label: "<b>Cards that move that part of the number come first</b><br/>One more card that fits the focus is added at the top, worth up to 2 points<br/>(no card when the request is already too strong to add one)" }
  fb@{ shape: curv-trap, label: "<b>Banner 'Focus: Meet payer criteria. The cards are in that order, and one card was added.'</b><br/>The added card has the pill 'Added for your focus'" }
  pv@{ shape: rect, label: "<b>Approval chance preview moves</b><br/>Header '62% → 90%', the intro line and 'Apply selected (7)' follow" }
  tr@{ shape: odd, label: "<b>'Recommendations refined'</b><br/>'Cards are in the order for ... and one was added. With every action applied the chance is 90%.'" }
  cf@{ shape: trap-t, label: "Click 'Clear focus' in the banner" }
  cr@{ shape: rect, label: "<b>Original order is back and the added card goes</b><br/>Unless it was already applied or dismissed: then it stays, with its points" }
  lk@{ shape: rect, label: "<b>While the agents are updating the draft</b><br/>both buttons are off" }
  cc@{ shape: trap-t, label: "Click 'Add clinical context'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › Add clinical context" }
  lg@{ shape: curv-trap, label: "<b>Card 'Logged decisions'</b><br/>Newest six entries, each with the time<br/>Shown once there is at least one entry" }
  en@{ shape: rect, label: "<b>Entries come from</b><br/>applied actions, dismissals, bring back, notes sent, focus, clinical context, draft edits, re-check, send back to Scribe" }
  rf --> rm --> rp --> rd --> ra
  rm --> rx --> re
  ra --> sp --> hs --> fs --> ro --> fb --> pv
  fs --> tr
  fs --> lg
  fb --> cf --> cr
  lg --> en
  rf -.-> lk
  cc -.-> lk
  cc --> g1
  class rf,ra,rx,cf,cc k_click
  class rm k_overlay
  class rp k_input
  class rd,sp,ro,pv,cr,lk,en k_process
  class re k_endx
  class hs k_agent
  class fs k_store
  class fb,lg k_screen
  class tr k_toast
  class g1 k_goto
```

## Authorizations › Case page › Recommended actions › Add clinical context

Adding a note the chart does not show. It is kept in the list the Draft tab and New case read, shown on the case page, and it nudges the approval chance by a point.

Route: `/authorizations/case/R-1042?tab=actions`

Demo only: each of the first three notes adds one point to the approval chance, whatever it says. The draft text on this page is not rewritten here; the Draft tab and New case read the list themselves.

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
  cc@{ shape: trap-t, label: "Click 'Add clinical context'" }
  m@{ shape: win-pane, label: "<b>Dialog 'Add clinical context'</b><br/>'Something the chart does not show. Scribe folds it into the draft. Nothing goes to the payer.'" }
  ta@{ shape: lean-r, label: "<b>Type in the box</b><br/>e.g. 'He called the program himself on 10/19 and asked for a bed.'<br/>Hint: 'Each note adds a point to the approval chance, up to 3.'" }
  d@{ shape: diam, label: "Is anything typed?" }
  dis@{ shape: rect, label: "'Add context' stays off" }
  ad@{ shape: trap-t, label: "Click 'Add context'" }
  cn@{ shape: trap-t, label: "Click 'Cancel', the X or the dimmed area, or press Esc" }
  cl@{ shape: stadium, label: "<b>Dialog closes</b><br/>Nothing is added<br/>What you typed stays in the box for next time" }
  lk@{ shape: rect, label: "<b>While the agents are updating the draft</b><br/>the button is off" }
  sv@{ shape: cyl, label: "<b>Note added to the shared list for this request</b><br/>Log: 'You added clinical context: ...'" }
  nu@{ shape: rect, label: "<b>Approval chance goes up by 1 point for each of the first three notes</b><br/>The fourth and later notes are kept and listed, with no points" }
  ls@{ shape: curv-trap, label: "<b>Card 'Context you added' in the side panel</b><br/>Each note with '+1 pt' (no pill after the third)" }
  rk@{ shape: curv-trap, label: "<b>Risk analysis › Why this number gets a row</b><br/>'Clinical context you added'<br/>The rows still add up to the chance" }
  dQ@{ shape: diam, label: "Is it a queue request that also has a Dashboard entry?" }
  db@{ shape: cyl, label: "<b>Dashboard request gets the new chance</b><br/>Timeline: 'You added clinical context. Approval chance is now 63%'" }
  qu@{ shape: rect, label: "Queue tile shows the new chance" }
  tc@{ shape: odd, label: "<b>'Clinical context added'</b><br/>'Scribe will fold it into the draft. Nothing goes to the payer.'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Draft › Read and edit" }
  cc --> m --> ta --> d
  d -->|"No"| dis
  d -->|"Yes"| ad --> sv --> nu --> ls
  nu --> rk
  sv --> dQ
  dQ -->|"Yes"| db --> qu
  dQ -->|"No"| qu
  sv --> tc --> g1
  m --> cn --> cl
  cc -.-> lk
  class cc,ad,cn k_click
  class m k_overlay
  class ta k_input
  class d,dQ k_decision
  class dis,lk,nu,qu k_process
  class cl k_endx
  class sv,db k_store
  class ls,rk k_screen
  class tc k_toast
  class g1 k_goto
```

## Authorizations › Case page › Clinical picture

The second tab: what Reader and Placement built from the chart, the six ASAM dimensions, the trend chart, and the 'Still open' list whose 'Settle it' buttons jump back to a recommendation.

Route: `/authorizations/case/R-1042?tab=picture`

Demo only: the chart content is generated text for every request except R-1042, which is hand-written.

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
  s1@{ shape: stadium, label: "Click 'Clinical picture'" }
  pt@{ shape: curv-trap, label: "<b>Clinical picture</b><br/>Left: summary, ASAM dimensions, trend. Right: what stands out, engagement, still open" }
  subgraph gL ["Left column"]
  sm@{ shape: curv-trap, label: "<b>Card 'Clinical picture'</b><br/>'Built by Reader and Placement from the chart. Every line links back to a file.'<br/>Rows: Diagnosis, Status, Trajectory, Readiness" }
  ch@{ shape: trap-t, label: "Click the source chip beside a row" }
  dRd@{ shape: diam, label: "Is anything still open?" }
  r1@{ shape: rect, label: "Readiness reads 'The draft is ready for signature.'" }
  r2@{ shape: rect, label: "Readiness reads 'The request is ready for signature once the open items below are settled.'" }
  as@{ shape: curv-trap, label: "<b>Card 'ASAM dimensions'</b><br/>Six cards: number, name, one sentence and a word<br/>None, Low, Moderate, High or Severe" }
  tr@{ shape: curv-trap, label: "<b>Card 'Symptom and function trend'</b><br/>Line chart by date with a legend<br/>A missing score is left as a gap" }
  ks@{ shape: rect, label: "<b>Two tiles under the chart</b><br/>e.g. 'Withdrawal now 4 / 67, peak 14' and 'Depression now 17 / 27'" }
  end
  subgraph gR ["Right column"]
  so@{ shape: curv-trap, label: "<b>Card 'What stands out'</b><br/>Four short lines" }
  en@{ shape: curv-trap, label: "<b>Card 'Engagement and behavior'</b><br/>Percent and bar, with a word<br/>Strong 85+, Moderate 70–84, Low below 70<br/>Then three ticked checks" }
  op@{ shape: curv-trap, label: "<b>Card 'Still open'</b><br/>Count pill and one line per open item<br/>Conflict, Missing or Risk" }
  dOp@{ shape: diam, label: "Any open items?" }
  no@{ shape: rect, label: "'Nothing is open. Every conflict, document and risk is settled.'" }
  se@{ shape: trap-t, label: "Click 'Settle it' on a line" }
  end
  dl@{ shape: rect, label: "Recommended actions opens with that card outlined" }
  ap@{ shape: rect, label: "<b>An item leaves 'Still open' when its action is applied</b><br/>Dismissing the action does not clear it" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Source chip" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › The tab" }
  s1 --> pt
  pt --> sm --> dRd
  dRd -->|"Yes"| r2
  dRd -->|"No"| r1
  sm --> ch --> g1
  pt --> as
  pt --> tr --> ks
  pt --> so
  pt --> en
  pt --> op --> dOp
  dOp -->|"Yes"| se --> dl --> g2
  dOp -->|"No"| no
  se -.-> ap
  class s1 k_start
  class pt,sm,as,tr,so,en,op k_screen
  class ch,se k_click
  class dRd,dOp k_decision
  class r1,r2,ks,no,dl,ap k_process
  class g1,g2 k_goto
  style gL fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gR fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Source chip

The small source chips that appear on three tabs. Clicking one opens the page of the chart it points to, with the sentence the agents used boxed.

Route: `/authorizations/case/R-1042?tab=picture`

Demo only: the 'page' is a short generated sheet with the quoted sentence. The full document stays in the chart system.

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
  subgraph gW ["Where chips appear"]
  w1@{ shape: curv-trap, label: "<b>Clinical picture</b><br/>One chip beside each of Diagnosis, Status, Trajectory, Readiness" }
  w2@{ shape: curv-trap, label: "<b>Payer criteria</b><br/>One chip in the 'Evidence' column of each requirement" }
  w3@{ shape: curv-trap, label: "<b>Draft</b><br/>Chips after each section<br/>Each sentence from an applied action adds its own" }
  end
  c@{ shape: trap-t, label: "<b>Click a source chip</b><br/>e.g. 'Psychiatric eval p.1'" }
  m@{ shape: win-pane, label: "<b>Dialog titled with the source name</b><br/>'Source for J.M., 34. Privacy mode is on.'" }
  d1@{ shape: doc, label: "<b>Sheet 'Source document'</b><br/>'Names, dates of birth and member IDs are masked'" }
  d2@{ shape: doc, label: "<b>Facts on the sheet</b><br/>Patient, Payer, Level of care, Request" }
  d3@{ shape: doc, label: "<b>'What the agents used'</b><br/>The quoted sentence, boxed and highlighted" }
  ft@{ shape: rect, label: "'The full document stays in the chart system. Reader read it and Integrity checked every sentence against it.'" }
  rd@{ shape: hex, label: "<b>Reader read the chart</b><br/>Integrity checked each sentence against it<br/>(demo: the quote is stored text)" }
  dY@{ shape: diam, label: "Is it a chip for an answer you typed?" }
  yo@{ shape: rect, label: "<b>Chip reads 'Your answer'</b><br/>Quote: 'Typed by you for Scribe on this request.'" }
  cl@{ shape: trap-t, label: "Click 'Close'" }
  x@{ shape: trap-t, label: "Click the X" }
  dim@{ shape: trap-t, label: "Click the dimmed area" }
  esc@{ shape: trap-t, label: "Press Esc" }
  e@{ shape: stadium, label: "<b>Dialog closes</b><br/>You are back on the same tab, nothing changed" }
  w1 --> c
  w2 --> c
  w3 --> c
  c --> m --> d1 --> d2 --> d3 --> ft
  d3 -.-> rd
  c --> dY
  dY -->|"Yes"| yo --> d3
  dY -->|"No"| d3
  m --> cl & x & dim & esc
  cl --> e
  x --> e
  dim --> e
  esc --> e
  class w1,w2,w3 k_screen
  class c,cl,x,dim,esc k_click
  class m k_overlay
  class d1,d2,d3 k_doc
  class ft,yo k_process
  class rd k_agent
  class dY k_decision
  class e k_end
  style gW fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Payer criteria

The third tab: what this payer asks for, read by Criteria from the policy, which requirements the chart backs, which could be stronger, and the buttons that jump to the matching action or re-check.

Route: `/authorizations/case/R-1042?tab=criteria`

Demo only: 'Re-check criteria' is a simulated wait. The 'less than 10 s' and 'usually over an hour' figures are fixed text.

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
  s1@{ shape: stadium, label: "Click 'Payer criteria'" }
  pc@{ shape: curv-trap, label: "Payer criteria" }
  hd@{ shape: curv-trap, label: "<b>Header card: 'Summit Medicaid HMO · Residential 3.5 · Alcohol use disorder, severe ...'</b><br/>'What this payer asks for, read by the Criteria agent from the current policy and past decisions'" }
  ch@{ shape: rect, label: "<b>Four source chips</b><br/>'Published payer policy v2026.3', 'Past decisions', 'Denial patterns', 'Ohio rules'" }
  dO@{ shape: diam, label: "Could any requirement be stronger?" }
  p1@{ shape: odd, label: "Pill: '1 item could be stronger before sending'" }
  p2@{ shape: odd, label: "Pill: 'Everything Summit asks for is covered'" }
  fc@{ shape: rect, label: "<b>Four facts</b><br/>'Approved as asked 74%' (Summit, Residential 3.5, last 90 days)<br/>'Chart-to-criteria match 9 / 9'<br/>'Time to read the policy < 10 s'<br/>'Required tool'" }
  tb@{ shape: curv-trap, label: "<b>Table 'What Summit requires for approval'</b><br/>'8 of 9 are backed directly by the chart, 1 could be stronger'<br/>Columns: Criterion, Status, Evidence, 'Criteria says'" }
  dR@{ shape: diam, label: "For each row: backed directly by the chart?" }
  met@{ shape: rect, label: "Status 'Met' with a green tick" }
  weak@{ shape: rect, label: "Status 'Could be stronger' with an amber icon" }
  ga@{ shape: trap-t, label: "Click 'Go to the action'" }
  dl@{ shape: rect, label: "Recommended actions opens with that card outlined" }
  ev@{ shape: trap-t, label: "Click the source chip in the 'Evidence' column" }
  rc@{ shape: trap-t, label: "Click 'Re-check criteria'" }
  bz@{ shape: rect, label: "Button shows a spinner for about 1.6 seconds" }
  cr@{ shape: hex, label: "<b>Criteria reads the payer's policy again</b><br/>(demo: simulated, nothing changes)" }
  tr@{ shape: odd, label: "<b>'Criteria re-checked'</b><br/>'Criteria read Summit's policy v2026.3 again. 9 of 9 are covered in the draft, 1 could be stronger.'" }
  kh@{ shape: curv-trap, label: "<b>Card 'To keep the approval chance high'</b><br/>Banner 'Why it matters for Summit. ...'<br/>Label 'Include in the request'" }
  dN@{ shape: diam, label: "Any row 'Could be stronger'?" }
  li@{ shape: rect, label: "<b>Numbered list: the action's title</b><br/>'Meets the requirement that is thin today: ...'" }
  oa@{ shape: trap-t, label: "Click 'Open the action'" }
  no@{ shape: rect, label: "'Nothing to add. The draft already covers every requirement.'" }
  ap@{ shape: cyl, label: "<b>When an action that fixes a row is applied</b><br/>Row turns 'Met': 'Closed by the action you applied. Criteria checked the draft again.'<br/>If you typed an answer: 'Added by Scribe from your answer: ...'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Source chip" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › The tab" }
  s1 --> pc --> hd --> ch
  pc --> dO
  dO -->|"Yes"| p1
  dO -->|"No"| p2
  pc --> fc
  pc --> tb --> dR
  dR -->|"Yes"| met
  dR -->|"No"| weak --> ga --> dl --> g2
  tb --> ev --> g1
  pc --> rc --> bz --> cr --> tr
  pc --> kh --> dN
  dN -->|"Yes"| li --> oa --> dl
  dN -->|"No"| no
  dl -.-> ap
  class s1 k_start
  class pc,hd,tb,kh k_screen
  class ch,fc,met,weak,dl,bz,li,no k_process
  class dO,dR,dN k_decision
  class p1,p2,tr k_toast
  class ga,ev,rc,oa k_click
  class cr k_agent
  class ap k_store
  class g1,g2 k_goto
```

## Authorizations › Case page › Risk analysis

The fourth tab: how often similar requests were approved, why the chance is what it is, the likely outcomes, how sure Forecaster is, and the two pop-ups behind 'See all' and 'How it is calculated'.

Route: `/authorizations/case/R-1042?tab=risk`

Demo only: the history behind the numbers is generated, and the 'Calibrated' line is fixed text. The sums on the page are real: the rows always add up to the chance now.

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
  s1@{ shape: stadium, label: "Click 'Risk analysis'" }
  rk@{ shape: curv-trap, label: "<b>Risk analysis</b><br/>Historical outcomes of similar requests" }
  h@{ shape: curv-trap, label: "<b>Card 'Historical outcomes'</b><br/>'Summit Medicaid HMO · Residential 3.5 admission'<br/>'Matched on' chips: Payer and plan, Level of care, Diagnosis cluster, Review type, Documentation signals" }
  dB@{ shape: diam, label: "Fewer than 100 similar cases from you and the network?" }
  nb@{ shape: rect, label: "No pill on the card" }
  bp@{ shape: odd, label: "Pill 'Benchmark estimate' on the card" }
  bg@{ shape: curv-trap, label: "<b>Red card 'Biggest driver of a short approval'</b><br/>'No named step-down provider' and how often it was seen" }
  cm@{ shape: curv-trap, label: "<b>Green card 'What the approved cases had in common'</b><br/>Four ticked lines" }
  wn@{ shape: curv-trap, label: "<b>Card 'Why this number'</b><br/>Formula such as '58 + 4 + 6 + 2 + 0 + 0 − 8 = 62'<br/>Pill 'Moderate · 62%'" }
  bars@{ shape: rect, label: "<b>Bars: the starting point, six rows, then 'Approval chance now'</b><br/>Green to the right adds points, terracotta to the left takes them away<br/>Dashed outline: what is still to come<br/>A seventh row 'Clinical context you added' appears once a note is added" }
  lo@{ shape: curv-trap, label: "<b>Card 'Likely outcomes'</b><br/>Donut and list: 'Approved as asked' 62%, 'Partly approved' 25%, 'Denied' 13%" }
  hs@{ shape: curv-trap, label: "<b>Card 'How sure are we'</b><br/>Likely range '57–66%' and a bar of yours, network and benchmark cases" }
  cd@{ shape: curv-trap, label: "<b>Card 'Comparable decisions'</b><br/>Three rows: 'Yours' or 'Network', match, outcome pill" }
  sa@{ shape: trap-t, label: "Click 'See all'" }
  ct@{ shape: curv-trap, label: "<b>Card 'Can you trust it?' with pill 'Calibrated'</b><br/>'Forecaster said 80 to 90% for similar Summit requests. 86% were approved in full, across 214 decisions.'<br/>'Checked every night against what payers actually decided.'" }
  hc@{ shape: trap-t, label: "Click 'How it is calculated'" }
  dOp@{ shape: diam, label: "Are any actions still open?" }
  b1@{ shape: odd, label: "Banner 'Where this stands: moderate, with 6 steps left. The biggest single step is to name the step-down provider (+11 pts).' ('+1 pt' for a one-point step)" }
  b2@{ shape: odd, label: "Banner 'Where this stands: every recommended action is applied. The draft is as strong as the chart allows.'" }
  cl@{ shape: rect, label: "Banner is green at 80+ and amber below" }
  fc@{ shape: hex, label: "<b>Forecaster re-scores whenever an action is applied</b><br/>(demo: the sums are done on the page)" }
  ap@{ shape: cyl, label: "<b>Applying an action grows its rows</b><br/>Total, donut, range and banner all move" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Risk analysis › Pop-ups" }
  s1 --> rk --> h --> dB
  dB -->|"Yes"| bp
  dB -->|"No"| nb
  h --> bg --> cm
  cm --> wn --> bars --> lo --> dOp
  cm --> hs --> cd --> ct
  cd --> sa --> g1
  ct --> hc --> g1
  dOp -->|"Yes"| b1 --> cl
  dOp -->|"No"| b2 --> cl
  fc -.-> ap
  ap -.-> wn
  class s1 k_start
  class rk,h,bg,cm,wn,lo,hs,cd,ct k_screen
  class dB,dOp k_decision
  class nb,bars,cl k_process
  class bp,b1,b2 k_toast
  class sa,hc k_click
  class fc k_agent
  class ap k_store
  class g1 k_goto
```

## Authorizations › Case page › Risk analysis › Pop-ups

The two dialogs on the Risk analysis tab: the full list of comparable decisions, and the plain-words explanation of how the approval chance is calculated.

Route: `/authorizations/case/R-1042?tab=risk`

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
  subgraph gA ["See all"]
  sa@{ shape: trap-t, label: "Click 'See all' on 'Comparable decisions'" }
  m1@{ shape: win-pane, label: "<b>Dialog 'Comparable decisions'</b><br/>'6 of the closest matches from your own and the network's history'" }
  rw@{ shape: rect, label: "<b>Six rows, each with who, match and an outcome pill</b><br/>The three from the card, then three more" }
  mr@{ shape: rect, label: "<b>The extra rows</b><br/>'Same payer, plan named, scores falling' (Network, close match)<br/>'Earlier attempt not documented' (Yours, close match)<br/>'Recent relapse, no step-down named' (Network, partial match)" }
  dy@{ shape: rect, label: "<b>Outcomes use the request's own days</b><br/>e.g. 'Approved 14/14' or 'Approved 7/14' for a 14-day request" }
  c1@{ shape: trap-t, label: "Click 'Close'" }
  end
  subgraph gB ["How it is calculated"]
  hc@{ shape: trap-t, label: "Click 'How it is calculated'" }
  m2@{ shape: win-pane, label: "<b>Dialog 'How the approval chance is calculated'</b><br/>'In plain words. Updated nightly.'" }
  s1@{ shape: hex, label: "<b>1 Historian finds similar decisions</b><br/>Same payer and plan, level of care, diagnosis cluster, review type and documentation signals" }
  s2@{ shape: hex, label: "<b>2 Forecaster starts from the base rate</b><br/>How often the payer approved those requests as asked" }
  s3@{ shape: rect, label: "<b>3 It adds and takes away points</b><br/>Each row is something the draft shows, or does not show yet" }
  s4@{ shape: rect, label: "<b>4 The range says how sure it is</b><br/>With little history it says 'Benchmark estimate'" }
  s5@{ shape: hex, label: "<b>5 It is checked every night</b><br/>Forecaster compares what it said with what payers decided" }
  nt@{ shape: rect, label: "Footer: 'It estimates how well the paperwork fits the payer's past decisions. It does not decide care, never blocks a request, and is never shown to payers or patients.'" }
  c2@{ shape: trap-t, label: "Click 'Got it'" }
  end
  cx@{ shape: trap-t, label: "Click the X, click the dimmed area, or press Esc" }
  e@{ shape: stadium, label: "<b>Dialog closes</b><br/>You are back on Risk analysis, nothing changed" }
  sa --> m1 --> rw --> mr --> dy --> c1 --> e
  m1 --> cx
  hc --> m2 --> s1 --> s2 --> s3 --> s4 --> s5 --> nt --> c2 --> e
  m2 --> cx
  cx --> e
  class sa,c1,hc,c2,cx k_click
  class m1,m2 k_overlay
  class rw,mr,dy,s3,s4,nt k_process
  class s1,s2,s5 k_agent
  class e k_end
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Draft › Read and edit

The fifth tab, left side: the medical-necessity summary Scribe wrote, how sentences from applied actions and added clinical context appear, and how a person edits and saves it. It is the same summary Review and sign shows in New case: one text for each request, so an edit made in either place is read in the other.

Route: `/authorizations/case/R-1042?tab=draft`

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
  s1@{ shape: stadium, label: "Click 'Draft'" }
  dr@{ shape: curv-trap, label: "<b>Draft</b><br/>Left: 'Medical-necessity summary'. Right: 'Checks', 'Versions', send buttons" }
  hd@{ shape: rect, label: "<b>Card subtitle</b><br/>'Version 3 · written by Scribe, checked by Integrity · every statement links to the chart'" }
  sec@{ shape: rect, label: "<b>Four sections in a row, each with its source chips</b><br/>'Clinical picture.', 'Why a lower level of care is not safe.', 'Current severity.', 'Plan.'<br/>The text is the request's draft in New case (before it has one, the text that draft would have)" }
  cx@{ shape: rect, label: "<b>A fifth paragraph 'Context added.' when notes were added with 'Add clinical context'</b><br/>The notes in the person's own words, no chips<br/>Shown but not edited here: Edit has no box for it" }
  nw@{ shape: rect, label: "<b>Sentences from applied actions follow in a green mark with a 'New' tag</b><br/>Each adds its own chip, e.g. 'Your answer'" }
  ch@{ shape: trap-t, label: "Click a source chip" }
  gC@{ shape: subproc, label: "Continues in: Authorizations › Case page › Source chip" }
  ed@{ shape: trap-t, label: "Click 'Edit'" }
  em@{ shape: curv-trap, label: "<b>Edit mode</b><br/>One text box per section, e.g. 'Edit Plan'<br/>Header buttons 'Cancel' and 'Save changes'" }
  ty@{ shape: lean-r, label: "Change the text in one or more boxes" }
  cn@{ shape: trap-t, label: "Click 'Cancel'" }
  cd@{ shape: rect, label: "<b>Edit mode closes</b><br/>Nothing is saved" }
  sv@{ shape: trap-t, label: "Click 'Save changes'" }
  dCh@{ shape: diam, label: "Did any box change?" }
  tn@{ shape: odd, label: "'No changes to save'" }
  sd@{ shape: cyl, label: "<b>Edited sections saved</b><br/>The edit keeps the sentences already added by applied actions<br/>New version: 'Version 4', 'You', 'Edited by you'<br/>Log: 'You edited the draft. Integrity will read it again before it can be signed'<br/>The same text is saved on the request's draft in New case, so Review and sign reads it" }
  ts@{ shape: odd, label: "<b>'Draft saved'</b><br/>'Integrity needs to read it again before it can be signed. Use Re-check.'" }
  dy@{ shape: rect, label: "<b>'Every sentence matches the chart' now warns</b><br/>'You edited the draft. Integrity has not read it again yet.'<br/>'Send to payer' goes off" }
  bd@{ shape: rect, label: "Badge on the Draft tab goes up by one" }
  lt@{ shape: rect, label: "Actions applied later add their sentences after the edited text" }
  gK@{ shape: subproc, label: "Continues in: Authorizations › Case page › Draft › Checks, versions and send back" }
  gR@{ shape: subproc, label: "Continues in: Review and sign › The draft and the summary" }
  s1 --> dr --> hd --> sec --> nw
  sec --> ch --> gC
  sec --> cx
  dr --> ed --> em --> ty
  em --> cn --> cd
  em --> sv --> dCh
  dCh -->|"No"| tn
  dCh -->|"Yes"| sd --> ts
  sd --> dy --> bd
  dy --> gK
  sd -.-> lt
  sd --> gR
  class s1 k_start
  class dr,em k_screen
  class hd,sec,cx,nw,cd,dy,bd,lt k_process
  class ch,ed,cn,sv k_click
  class gC,gK,gR k_goto
  class ty k_input
  class dCh k_decision
  class tn,ts k_toast
  class sd k_store
```

## Authorizations › Case page › Draft › Checks, versions and send back

The right column of the Draft tab: Integrity's four checks and 'Re-check', the version list and its read-only viewer, and 'Send back to Scribe'.

Route: `/authorizations/case/R-1042?tab=draft`

Demo only: 'Re-check' and 'Send back to Scribe' are simulated waits. Sending back logs the request and shows a toast but does not redraft the text.

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
  s1@{ shape: stadium, label: "On the Draft tab, look at the right column" }
  ck@{ shape: curv-trap, label: "<b>Card 'Checks'</b><br/>'Integrity's four checks'<br/>Pill 'All clear' or '2 open'" }
  c1@{ shape: rect, label: "'Every sentence matches the chart'" }
  c2@{ shape: rect, label: "'Payer criteria are covered'" }
  c3@{ shape: rect, label: "'Dates are consistent'" }
  c4@{ shape: rect, label: "'Identifiers are protected'" }
  dok@{ shape: diam, label: "Does each check pass?" }
  pass@{ shape: rect, label: "Green tick and 'Pass'" }
  warn@{ shape: rect, label: "<b>Amber triangle, 'Warn' and a note</b><br/>e.g. 'Sertraline start is 9/14 in the medication list and 9/21 in the psychiatric evaluation.'" }
  why@{ shape: rect, label: "<b>A warning clears when the matching action is applied</b><br/>(criteria and dates), or on 'Re-check' after an edit (chart)" }
  rc@{ shape: trap-t, label: "Click 'Re-check'" }
  ig@{ shape: hex, label: "<b>Integrity reads the draft again</b><br/>Spinner on the button for about 1.6 seconds<br/>(demo: simulated)" }
  mr@{ shape: cyl, label: "<b>Edit flag cleared</b><br/>Log: 'Integrity read the draft again'" }
  dst@{ shape: diam, label: "Do other checks still warn?" }
  t1@{ shape: odd, label: "<b>'All four checks passed'</b><br/>'Integrity read every sentence against the chart again.'" }
  t2@{ shape: odd, label: "<b>'1 check needs an action'</b><br/>'Apply the matching recommendation, then check again.'" }
  vs@{ shape: curv-trap, label: "<b>Card 'Versions'</b><br/>Newest first: 'Version 3', time, author, note" }
  cu@{ shape: rect, label: "<b>Newest row carries a 'Current' pill</b><br/>Older rows have 'View'" }
  vw@{ shape: trap-t, label: "Click 'View' on an older version" }
  vm@{ shape: win-pane, label: "<b>Dialog 'Version 2'</b><br/>Time and author. 'Read only.' Then the text" }
  vc@{ shape: trap-t, label: "Click 'Close', the X, the dimmed area, or press Esc" }
  vn@{ shape: rect, label: "<b>A new version appears after every Apply</b><br/>('Scribe', 'Added 6 recommendations')<br/>and every saved edit ('You', 'Edited by you')" }
  sb@{ shape: curv-trap, label: "<b>Bottom card</b><br/>'Send to payer' (a disabled 'Sent to payer' once the payer has it), 'Send back to Scribe', and a note" }
  sk@{ shape: trap-t, label: "Click 'Send back to Scribe'" }
  bz@{ shape: rect, label: "Spinner for about 1.4 seconds" }
  lg@{ shape: cyl, label: "Log: 'You sent the draft back to Scribe'" }
  tb@{ shape: odd, label: "<b>'Sent back to Scribe'</b><br/>'Scribe will redraft the summary and Integrity will check it again.'" }
  gS@{ shape: subproc, label: "Continues in: Authorizations › Case page › Draft › Review, sign and what happens next" }
  s1 --> ck --> c1 & c2 & c3 & c4
  c1 --> dok
  c2 --> dok
  c3 --> dok
  c4 --> dok
  dok -->|"Yes"| pass
  dok -->|"No"| warn --> why
  ck --> rc --> ig --> mr --> dst
  dst -->|"No"| t1
  dst -->|"Yes"| t2
  s1 --> vs --> cu
  cu --> vw --> vm --> vc
  vs --> vn
  s1 --> sb --> sk --> bz --> lg --> tb
  sb --> gS
  class s1 k_start
  class ck,vs,sb k_screen
  class c1,c2,c3,c4,pass,warn,why,cu,vn,bz k_process
  class dok,dst k_decision
  class rc,vw,vc,sk k_click
  class ig k_agent
  class mr,lg k_store
  class t1,t2,tb k_toast
  class vm k_overlay
  class gS k_goto
```

## Authorizations › Case page › Draft › Review, sign and what happens next

What happens when a person leaves the Draft tab to send the request: the gate, the hand-off to New case where a clinician signs, and where the request appears once it is sent.

Route: `/authorizations/case/R-1042?tab=draft`

Demo only: the payer receiving the request is simulated. The summary signed in New case is the one on this tab: edits, applied actions and added clinical context are all in it.

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
  s1@{ shape: stadium, label: "On the Draft tab: read the summary and the four checks" }
  dc@{ shape: diam, label: "Do all four checks pass, and is the request still preparing?" }
  off@{ shape: rect, label: "<b>'Send to payer' is off</b><br/>The reason sits under the button, e.g. 'Integrity has 2 open checks. Apply the matching actions first.'" }
  sp@{ shape: trap-t, label: "Click 'Send to payer' (large button)" }
  os@{ shape: trap-t, label: "Click 'Open in review and sign' (header button)" }
  rp@{ shape: rect, label: "<b>The case page finds this request's draft in New case, or makes one from the request</b><br/>The draft opens at Review and sign when the request is ready, at Agents work when agents still have work" }
  ns@{ shape: rect, label: "<b>Nothing is sent yet</b><br/>'Nothing goes to the payer until a clinician signs.'" }
  gR@{ shape: subproc, label: "Continues in: New case › Review and sign" }
  subgraph gSign ["In New case (summary only, drawn in its own diagram)"]
  sg@{ shape: rect, label: "<b>A licensed clinician signs with 'Sign and send'</b><br/>The UR coordinator cannot sign; Dr. Rivera can" }
  py@{ shape: st-rect, label: "<b>Navigator sends the request through the payer's portal</b><br/>(demo: simulated)" }
  pk@{ shape: doc, label: "<b>What goes out</b><br/>The signed summary and the packet's documents" }
  end
  rq@{ shape: cyl, label: "<b>Dashboard: the request is created, or moves to 'Received'</b><br/>History: 'You signed and sent the request', 'Navigator sent the request through the payer's portal', 'Navigator saved the receipt to the case'" }
  tt@{ shape: odd, label: "<b>Toast 'Sent to the payer'</b><br/>'R-0988 is on the Dashboard as Received.'" }
  nt@{ shape: odd, label: "<b>Notification from Navigator: 'Sent to the payer'</b><br/>'R-0988 was sent. It now shows as Received on the Dashboard.'" }
  db@{ shape: curv-trap, label: "<b>Dashboard opens on that request</b><br/>Stage 'Received'" }
  qg@{ shape: rect, label: "<b>Back in the queue the request is gone</b><br/>The open count drops by one<br/>The sidebar badge too, if it was in Act now or Due within 24 hours" }
  cp@{ shape: rect, label: "<b>The case page of a sent request shows the request's own status</b><br/>and a disabled 'Sent to payer' in place of 'Send to payer'" }
  gD@{ shape: subproc, label: "Continues in: Dashboard › Request drawer" }
  gQ@{ shape: subproc, label: "Continues in: Authorizations › Queue › Open the queue and read the top" }
  s1 --> dc
  dc -->|"No"| off
  dc -->|"Yes"| sp --> rp
  s1 --> os --> rp
  rp --> ns --> gR
  gR --> sg --> py --> pk
  sg --> rq
  rq --> tt
  rq --> nt
  rq --> db --> gD
  rq --> qg --> gQ
  qg -.-> cp
  class s1 k_start
  class dc k_decision
  class off,rp,ns,sg,qg,cp k_process
  class sp,os k_click
  class gR,gD,gQ k_goto
  class py k_ext
  class pk k_doc
  class rq k_store
  class tt,nt k_toast
  class db k_screen
  style gSign fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Case page › Where the queue and the case page lead

Every click that takes a person from the queue or a case page into another part of the product. What the case page writes to other screens is in the next diagram.

Route: `/authorizations`

Case Manager has links into the case page, but the case page has no link back to Case Manager. The only link from this module to Case Manager is the queue's empty message, which shows once every open request has been sent or handled.

```mermaid
%%{init: {"theme":"base","themeVariables":{"fontFamily":"'DM Sans', 'Segoe UI', system-ui, sans-serif","fontSize":"15px","lineColor":"#5B6B63","primaryTextColor":"#1C2B25","clusterBkg":"#FBF8F3","clusterBorder":"#D9CDBB","edgeLabelBackground":"#FFFFFF"},"flowchart":{"curve":"basis","nodeSpacing":36,"rankSpacing":48,"padding":12,"htmlLabels":true,"useMaxWidth":false,"wrappingWidth":230}} }%%
flowchart LR
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
  q@{ shape: curv-trap, label: "Authorizations queue" }
  cp@{ shape: curv-trap, label: "A case page (any tab)" }
  l1@{ shape: trap-t, label: "Click 'New case'" }
  l2@{ shape: trap-t, label: "Click the 'Coverage needs a fix' pill on a tile" }
  l6@{ shape: trap-t, label: "Click 'Open Case Manager' in the empty message" }
  l3@{ shape: trap-t, label: "On the coverage card: click 'Open Eligibility & Benefits'" }
  l4@{ shape: trap-t, label: "On a denied request: click 'Open in Denial Intelligence'" }
  l5@{ shape: trap-t, label: "Click 'Open in review and sign' or 'Send to payer'" }
  l7@{ shape: trap-t, label: "Click 'Back to queue' or the 'Authorizations' crumb" }
  l8@{ shape: trap-t, label: "<b>Click 'Open on the Dashboard'</b><br/>(once the request is past Preparing)" }
  g1@{ shape: subproc, label: "Continues in: New case › Referral step" }
  g2@{ shape: subproc, label: "Continues in: Eligibility & Benefits › Verify a patient" }
  g5@{ shape: subproc, label: "Continues in: Case Manager › Active cases" }
  g3@{ shape: subproc, label: "Continues in: Denial Intelligence › Open a denial" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Case page › Send to payer and review and sign" }
  g6@{ shape: subproc, label: "Continues in: Authorizations › Queue › Open the queue and read the top" }
  g7@{ shape: subproc, label: "Continues in: Dashboard › Request drawer" }
  q --> l1 --> g1
  q --> l2 --> g2
  q --> l6 --> g5
  cp --> l3 --> g2
  cp --> l4 --> g3
  cp --> l5 --> g4
  cp --> l7 --> g6
  cp --> l8 --> g7
  class q,cp k_screen
  class l1,l2,l6,l3,l4,l5,l7,l8 k_click
  class g1,g2,g5,g3,g4,g6,g7 k_goto
```

## Authorizations › Case page › What it writes to other screens

What a case page changes outside itself: the Dashboard request's chance and history, the notification, the shared lists that Analytics and the Draft tab read, and the queue. Nothing here is a link; each happens as a side effect of a click.

Route: `/authorizations/case/R-1042`

Demo only: a case page only writes to the Dashboard for requests that are on both the queue and the Dashboard. Other requests keep their work on the case page alone.

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
  s1@{ shape: stadium, label: "Apply selected finishes on a case page" }
  d1@{ shape: diam, label: "Is it a queue request that also has a Dashboard entry?" }
  w1@{ shape: cyl, label: "Dashboard request gets the new chance" }
  w2@{ shape: cyl, label: "<b>Dashboard request history</b><br/>'Scribe added 6 items to the draft. Approval chance is now 88%'" }
  w0@{ shape: rect, label: "Only this case page and the queue change" }
  q1@{ shape: rect, label: "<b>Queue tile shows the new chance</b><br/>Line reads '+N pts possible' or 'on track'<br/>Queue average moves too" }
  n1@{ shape: odd, label: "<b>Notification from Forecaster: 'Approval chance updated'</b><br/>'R-1042 is now 88% after 6 actions.'" }
  n2@{ shape: trap-t, label: "Open Notifications and click 'Approval chance updated'" }
  n3@{ shape: rect, label: "The case page of that request opens" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  s2@{ shape: stadium, label: "Click 'Dismiss and log' on a case page" }
  d2@{ shape: diam, label: "Is the request on the Dashboard?" }
  w3@{ shape: cyl, label: "<b>Dashboard request history</b><br/>'You dismissed ... Reason: ...'" }
  w4@{ shape: rect, label: "<b>Only the case page log changes</b><br/>'Logged decisions'" }
  w7@{ shape: cyl, label: "<b>Dismissal recorded: the request and the reason</b><br/>Analytics reads it" }
  s4@{ shape: stadium, label: "Click 'Add context' on a case page" }
  w8@{ shape: cyl, label: "<b>Clinical context added to the shared list for the request</b><br/>The Draft tab and New case read it" }
  d4@{ shape: diam, label: "Is it a queue request that also has a Dashboard entry?" }
  w9@{ shape: cyl, label: "<b>Dashboard request gets the new chance</b><br/>Timeline: 'You added clinical context. ...'" }
  w10@{ shape: rect, label: "<b>Queue tile shows the new chance</b><br/>The approval chance is one point higher for each of the first three notes" }
  s3@{ shape: stadium, label: "A request is signed and sent in New case" }
  w5@{ shape: cyl, label: "Dashboard stage 'Received'" }
  w6@{ shape: rect, label: "<b>Queue drops the request</b><br/>The open count drops by one<br/>The sidebar badge too, if it was in Act now or Due within 24 hours" }
  w11@{ shape: rect, label: "<b>Its case page reads the new stage</b><br/>Chip 'Received', the request's own status line, a greyed-out 'Sent to payer' and 'Open on the Dashboard'" }
  s5@{ shape: stadium, label: "The payer decides, or a denial is settled or its appeal is filed" }
  w12@{ shape: rect, label: "<b>Queue drops the request from its band</b><br/>When Act now is empty the band says 'Nothing needs you today'" }
  g2@{ shape: subproc, label: "Continues in: Dashboard › Request drawer" }
  s1 --> d1
  d1 -->|"Yes"| w1 --> w2
  d1 -->|"No"| w0
  s1 --> q1
  s1 --> n1 --> n2 --> n3 --> g1
  w2 --> g2
  s2 --> d2
  d2 -->|"Yes"| w3 --> g2
  d2 -->|"No"| w4
  s2 --> w7
  s4 --> w8 --> d4
  d4 -->|"Yes"| w9 --> w10
  d4 -->|"No"| w10
  s3 --> w5 --> w6
  w5 --> w11
  w5 --> g2
  s5 --> w12
  class s1,s2,s4,s3,s5 k_start
  class d1,d2,d4 k_decision
  class w1,w2,w3,w7,w8,w9,w5 k_store
  class w0,q1,n3,w4,w10,w6,w11,w12 k_process
  class n1 k_toast
  class n2 k_click
  class g1,g2 k_goto
```
