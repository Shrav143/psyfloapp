# Case Manager

Active cases (being prepared, and the tracker) and Reviews this week.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/07-case-manager/`.

## Case Manager › Page › Arrive and read the header

Case Manager has two tabs, 'Active cases' and 'Reviews this week'. The address decides which one opens. Each tab has its own header with live counts, and both share one filter bar.

Route: `/manager (Active cases) and /manager?tab=reviews`

The tab is the only thing kept in the address. Search text and filters are not, so a reload or leaving the page clears them.

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
  s1@{ shape: stadium, label: "Click 'Case Manager' in the sidebar" }
  s2@{ shape: stadium, label: "Demo menu › '7 Case Manager: reviews this week'" }
  s3@{ shape: stadium, label: "Old link /active" }
  s4@{ shape: stadium, label: "<b>A link from another page</b><br/>(see 'Links in and the tab address')" }
  p0@{ shape: rect, label: "/active is replaced by /manager" }
  p1@{ shape: rect, label: "<b>Page opens at the top</b><br/>Sidebar 'Case Manager' turns green; its bubble reads 11" }
  d1@{ shape: diam, label: "Is the address ?tab=reviews?" }
  sA@{ shape: curv-trap, label: "<b>Active cases tab</b><br/>Header '56 active cases.'<br/>'5 are still being prepared. Units, clocks and status for every case, across every level of care.'<br/>Button 'New case'" }
  cA@{ shape: rect, label: "<b>56 is the number of rows in the tracker and never changes in the demo</b><br/>5 is the drafts saved and not yet sent: it falls when a case is signed and sent ('1 is still being prepared' when one is left)" }
  sR@{ shape: curv-trap, label: "<b>Reviews this week tab</b><br/>Header '47 clinical reviews due this week.'<br/>'Agents draft each review ahead of time. You update only what they ask about.'<br/>Buttons 'Draft all due reviews' and 'Sign all clean drafts'" }
  cR@{ shape: rect, label: "47 is one review for each approved case (9 cases are not yet approved and have none)" }
  sF@{ shape: curv-trap, label: "<b>Filter bar under the header (both tabs)</b><br/>Search box, 'All levels of care', 'All payers', then 'Any status' (Active cases) or 'Any review status' (Reviews)<br/>On the right the switch 'Active cases' | 'Reviews this week'" }
  c1@{ shape: trap-t, label: "Click 'Reviews this week'" }
  c2@{ shape: trap-t, label: "Click 'Active cases'" }
  p2@{ shape: rect, label: "<b>Address becomes ?tab=reviews or ?tab=cases</b><br/>No new history entry, so Back does not walk through tab clicks<br/>Header and body swap; search, level of care and payer filters stay" }
  c3@{ shape: trap-t, label: "Click 'New case'" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Filters › Search and filter both tabs" }
  g2@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Being prepared card" }
  g3@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Tracker of every active case" }
  g4@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › The list" }
  g5@{ shape: subproc, label: "Continues in: New case › Referral step" }
  s1 --> p1
  s2 --> p1
  s3 --> p0 --> p1
  s4 --> p1
  p1 --> d1
  d1 -->|"Yes"| sR --> cR
  d1 -->|"No: no tab, ?tab=cases, or anything else"| sA --> cA
  sA --> sF
  sR --> sF
  sF --> g1
  sA --> c3 --> g5
  sA --> c1 --> p2
  sR --> c2 --> p2
  p2 -.-> sA
  p2 -.-> sR
  cA --> g2
  cA --> g3
  cR --> g4
  class s1,s2,s3,s4 k_start
  class p0,p1,cA,cR,p2 k_process
  class d1 k_decision
  class sA,sR,sF k_screen
  class c1,c2,c3 k_click
  class g1,g2,g3,g4,g5 k_goto
```

## Case Manager › Filters › Search and filter both tabs

One filter bar serves both tabs. Search, level of care and payer apply to the 'Being prepared' list, the tracker and the review list. The last dropdown changes with the tab. Every filter narrows the list at once and all of them combine.

Route: `/manager and /manager?tab=reviews`

Filters are not kept in the address. They survive switching tabs, and are cleared by leaving the page or reloading.

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
  s1@{ shape: stadium, label: "Case Manager is open" }
  sb@{ shape: curv-trap, label: "<b>Filter bar</b><br/>Search box 'Search by case ID or initials'<br/>'All levels of care'   'All payers'   'Any status' or 'Any review status'" }
  subgraph gSearch ["Search"]
  i1@{ shape: lean-r, label: "Type in 'Search by case ID or initials'" }
  p1@{ shape: rect, label: "<b>Text is lowercased; dots, spaces and dashes are ignored</b><br/>'r1042', 'R-1042', 'jm' and 'J.M.' all match" }
  end
  subgraph gLevel ["Level of care"]
  c2@{ shape: trap-t, label: "Click 'All levels of care'" }
  o2@{ shape: win-pane, label: "Menu: 'All levels of care', 'Residential 3.5', 'IOP', 'PHP', 'Detox'" }
  i2@{ shape: lean-r, label: "Pick one" }
  end
  subgraph gPayer ["Payer"]
  c3@{ shape: trap-t, label: "Click 'All payers'" }
  o3@{ shape: win-pane, label: "Menu: 'All payers', 'Cardinal Health Plan', 'Summit Medicaid HMO', 'Beacon PPO', 'Harborview MA', 'Lakeshore Behavioral', 'Evergreen'" }
  i3@{ shape: lean-r, label: "Pick one" }
  end
  subgraph gStatus ["Last dropdown (depends on the tab)"]
  c4@{ shape: trap-t, label: "Active cases: click 'Any status'" }
  o4@{ shape: win-pane, label: "<b>Menu: 'Any status', 'Needs action', 'Review due', 'Awaiting payer', 'On track'</b><br/>Tracker only: 'Being prepared' is not filtered by it" }
  c5@{ shape: trap-t, label: "Reviews this week: click 'Any review status'" }
  o5@{ shape: win-pane, label: "Menu: 'Any review status', 'Needs your update', 'Drafted', 'Signed'" }
  i4@{ shape: lean-r, label: "Pick one" }
  end
  p2@{ shape: rect, label: "<b>Lists narrow at once. All filters must match (search and level and payer and status)</b><br/>The tracker goes back to page 1" }
  p3@{ shape: rect, label: "A dropdown that is not on its first option turns green-bordered and bold" }
  d1@{ shape: diam, label: "Is any filter on for this tab?" }
  c6@{ shape: trap-t, label: "Click 'Clear filters' (plain button after the dropdowns)" }
  p4@{ shape: rect, label: "Search emptied, all dropdowns back to their first option, lists full again" }
  p5@{ shape: rect, label: "<b>The button is not shown</b><br/>(a status filter set on the other tab does not count)" }
  c7@{ shape: trap-t, label: "Press Escape, click outside, or pick again" }
  p6@{ shape: rect, label: "Menu closes. Arrow keys move in a menu and Enter picks" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Empty states › Nothing to show" }
  e1@{ shape: stadium, label: "List shows only the matching rows" }
  s1 --> sb
  sb --> i1 --> p1 --> p2
  sb --> c2 --> o2 --> i2 --> p2
  sb --> c3 --> o3 --> i3 --> p2
  sb --> c4 --> o4 --> i4
  sb --> c5 --> o5 --> i4
  i4 --> p2
  o2 & o3 & o4 & o5 --> c7 --> p6
  p2 --> p3 --> d1
  d1 -->|"Yes"| c6 --> p4 --> e1
  d1 -->|"No"| p5 --> e1
  p2 -.->|"Nothing left"| g1
  class s1 k_start
  class sb k_screen
  class i1,i2,i3,i4 k_input
  class p1,p2,p3,p4,p5,p6 k_process
  class c2,c3,c4,c5,c6,c7 k_click
  class o2,o3,o4,o5 k_overlay
  class d1 k_decision
  class g1 k_goto
  class e1 k_end
  style gSearch fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gLevel fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gPayer fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gStatus fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Case Manager › Active cases › Being prepared card

The card at the top of Active cases lists the cases the agents are still preparing, most urgent first. Four chips narrow it by who has the next move, and 'sent today' jumps to the Dashboard. Each row is explained in the next diagram.

Route: `/manager`

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
  s1@{ shape: stadium, label: "Open Case Manager (Active cases tab)" }
  sc@{ shape: curv-trap, label: "<b>Card 'Being prepared'</b><br/>'Most urgent first. Each case moves through eight steps; the agents do all but Ask and Sign.'" }
  p1@{ shape: rect, label: "<b>Rows are the drafts that were saved and not yet sent</b><br/>5 at the start: R-1042, R-0988, I-2207, R-1101, I-2262" }
  p2@{ shape: rect, label: "<b>Search, level of care and payer from the filter bar narrow the rows</b><br/>The tracker's status filter does not apply here" }
  sh@{ shape: curv-trap, label: "<b>Top right of the card</b><br/>Ghost button '4 sent today', then the chips 'All', 'Agents working', 'Needs your input', 'Ready to sign'" }
  c1@{ shape: trap-t, label: "Click '4 sent today'" }
  p3@{ shape: rect, label: "Go to /dashboard?stage=received" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Stage strip › Click a stage tile" }
  c2@{ shape: trap-t, label: "Click a chip" }
  d1@{ shape: diam, label: "Which chip?" }
  k1@{ shape: rect, label: "'All': every row" }
  k2@{ shape: rect, label: "'Agents working': rows where agents are still running" }
  k3@{ shape: rect, label: "<b>'Needs your input': rows with an open question, or intake not finished</b><br/>Badge shows how many (2 at the start)" }
  k4@{ shape: rect, label: "<b>'Ready to sign': rows where every check passed</b><br/>Badge shows how many (1 at the start)" }
  p4@{ shape: rect, label: "<b>Rows narrow to that chip</b><br/>The badge counts follow the page filters but not the chip itself" }
  o1@{ shape: rect, label: "<b>Order: rows that need a person come first (questions, signatures, unfinished intake)</b><br/>Then the earliest due date" }
  o2@{ shape: rect, label: "At the start: R-1042, R-0988, I-2207, then R-1101, I-2262" }
  d2@{ shape: diam, label: "Are there rows to show?" }
  r1@{ shape: curv-trap, label: "A column of case rows" }
  g2@{ shape: subproc, label: "Continues in: Case Manager › Active cases › One row and its button" }
  g3@{ shape: subproc, label: "Continues in: Case Manager › Empty states › Nothing to show" }
  e1@{ shape: stadium, label: "Rows are on screen" }
  p5@{ shape: rect, label: "After a case is signed and sent in New case it leaves this list and 'sent today' counts one more" }
  s2@{ shape: stadium, label: "Later: a case is signed and sent in New case › Review and sign" }
  s1 --> sc --> p1 --> p2 --> sh
  sh --> c1 --> p3 --> g1
  sh --> c2 --> d1
  d1 -->|"All"| k1 --> p4
  d1 -->|"Working"| k2 --> p4
  d1 -->|"Needs input"| k3 --> p4
  d1 -->|"Ready"| k4 --> p4
  p4 --> o1
  p2 --> o1
  o1 --> o2 --> d2
  d2 -->|"Yes"| r1 --> g2
  d2 -->|"No"| g3
  r1 --> e1
  s2 --> p5 --> p1
  class s1,s2 k_start
  class sc,sh,r1 k_screen
  class p1,p2,p3,k1,k2,k3,k4,p4,o1,o2,p5 k_process
  class c1,c2 k_click
  class g1,g2,g3 k_goto
  class d1,d2 k_decision
  class e1 k_end
```

## Case Manager › Active cases › One row and its button

One row of 'Being prepared' shows a case, where it is on the eight steps, who has it and the one thing to do next. Only the case ID and the button on the right are clickable, and both lead to the same place in New case. The button's wording depends on the row's state.

Route: `/manager`

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
  s1@{ shape: stadium, label: "Look at one row in 'Being prepared'" }
  r1@{ shape: curv-trap, label: "<b>Row, left to right</b><br/>Level chip (for example 'Residential 3.5', 'Detox → Residential', or 'Level not set')<br/>Case ID (or 'New case'), patient initials and age, payer<br/>What is asked ('Admission request')" }
  r2@{ shape: curv-trap, label: "<b>Eight-step bar</b><br/>Read, Rules, Match, Ask, Draft, Check, Sign, Send<br/>Done steps green, current step sage and bold, the rest grey" }
  r3@{ shape: curv-trap, label: "<b>Agent line</b><br/>A badge for the agent who has the case, then one sentence, for example 'Scribe is waiting on one answer: the sertraline start date'" }
  r4@{ shape: curv-trap, label: "<b>Right side</b><br/>Due pill (for example 'Notice due in 5 h'), status pill, approval chance with a bar (or 'Not started'), then the button" }
  p0@{ shape: rect, label: "A due pill in red tone tints the whole row red-cream" }
  d1@{ shape: diam, label: "What state is the case in?" }
  t1@{ shape: rect, label: "<b>'Intake not finished'</b><br/>Button 'Continue' (green)" }
  t2@{ shape: rect, label: "<b>'Needs your input'</b><br/>Button 'Answer' (green)" }
  t3@{ shape: rect, label: "<b>'Agents working'</b><br/>Button 'Watch' (outlined)" }
  t4@{ shape: rect, label: "<b>'Ready to sign'</b><br/>Button 'Review and sign' (green)" }
  c1@{ shape: trap-t, label: "Click the case ID or the button" }
  p1@{ shape: rect, label: "Go to /authorizations/new/ followed by the draft's code" }
  d2@{ shape: diam, label: "Which step does New case open on?" }
  g1@{ shape: subproc, label: "Continues in: New case › Medical records (intake)" }
  g2@{ shape: subproc, label: "Continues in: New case › Agents work › Answer an agent's question" }
  g3@{ shape: subproc, label: "Continues in: New case › Agents work › Watch the agents" }
  g4@{ shape: subproc, label: "Continues in: New case › Review and sign › Sign and send" }
  c2@{ shape: trap-t, label: "Click anywhere else on the row" }
  p2@{ shape: rect, label: "Nothing happens: the row itself is not a link" }
  e1@{ shape: stadium, label: "Stays on Case Manager" }
  p3@{ shape: rect, label: "Once signed and sent, the case disappears from this list, the header count drops by one and the sidebar bubble drops if it needed a person" }
  e2@{ shape: stadium, label: "The request now shows as 'Received' on the Dashboard" }
  g5@{ shape: subproc, label: "Continues in: Dashboard › Open a request" }
  s1 --> r1 --> r2 --> r3 --> r4 --> p0 --> d1
  d1 -->|"Unfinished intake"| t1
  d1 -->|"An agent asked"| t2
  d1 -->|"Running"| t3
  d1 -->|"All checks passed"| t4
  t1 & t2 & t3 & t4 --> c1 --> p1 --> d2
  d2 -->|"Intake not finished"| g1
  d2 -->|"Question open"| g2
  d2 -->|"Agents working"| g3
  d2 -->|"Ready to sign"| g4
  g4 -.-> p3
  r4 --> c2 --> p2 --> e1
  p3 --> e2 --> g5
  class s1 k_start
  class r1,r2,r3,r4 k_screen
  class p0,t1,t2,t3,t4,p1,p2,p3 k_process
  class d1,d2 k_decision
  class c1,c2 k_click
  class g1,g2,g3,g4,g5 k_goto
  class e1 k_endx
  class e2 k_end
```

## Case Manager › Active cases › How a row's status and due pill are decided

Each row's status, step bar, agent line and button come from how far the agents have got. The due pill comes from the kind of request. Both follow the demo clock, so Fast-forward turns 'Notice due in 5 h' into 'Overdue'.

Route: `/manager`

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
  s1@{ shape: stadium, label: "A draft in 'Being prepared' is drawn" }
  d1@{ shape: diam, label: "Is an agent waiting for an answer?" }
  a1@{ shape: rect, label: "<b>'Needs your input'</b><br/>Bar stops at 'Ask'<br/>Badge: the agent who asked (Scribe, or Packet for a recertification)<br/>Line says what is needed" }
  d2@{ shape: diam, label: "Have all ten agents finished?" }
  a2@{ shape: rect, label: "<b>'Ready to sign'</b><br/>Bar stops at 'Sign'<br/>Badge: Integrity<br/>'Integrity and Scrubber passed. Waiting for a clinician to sign'" }
  d3@{ shape: diam, label: "Has the run started?" }
  a3@{ shape: rect, label: "<b>'Agents working'</b><br/>Bar follows the next agent: Reader, Verify and Criteria, Historian, Placement and Forecaster, Scribe, Integrity, Packet and Scrubber<br/>Line, for example: 'Packet is assembling the forms and attachments'" }
  a4@{ shape: rect, label: "<b>'Intake not finished'</b><br/>No bar step lit<br/>Badge: Reader<br/>'Intake is not finished. Add the chart and the payer to start the agents'" }
  c1@{ shape: rect, label: "<b>Approval chance</b><br/>Starts low and climbs while the first six agents finish, then holds<br/>'Not started' while intake is unfinished" }
  subgraph gDue ["Due pill: which clock the request type starts"]
  d4@{ shape: diam, label: "What type of request?" }
  u1@{ shape: rect, label: "<b>Admission: 'Notice due in 5 h'</b><br/>Red under 24 h, amber after" }
  u2@{ shape: rect, label: "<b>Retro-authorization: 'Window closes in 18 h'</b><br/>Red under 24 h, amber after" }
  u3@{ shape: rect, label: "<b>Recertification: 'Expires in 3 days'</b><br/>Amber under 4 days, grey after" }
  u4@{ shape: rect, label: "<b>Continued stay: 'Review due 4:00 pm'</b><br/>A time when under a day, a weekday after. Amber" }
  u5@{ shape: rect, label: "<b>Initial request: 'Packet due Thu'</b><br/>Grey" }
  u6@{ shape: rect, label: "Any clock that has passed: 'Overdue' in red" }
  end
  s2@{ shape: rect, label: "<b>The five rows at the start</b><br/>R-1042 and I-2207 need input (Scribe, Packet)<br/>R-0988 is ready to sign<br/>R-1101 is working (Packet), I-2262 is working (Reader)" }
  e1@{ shape: stadium, label: "Row is drawn with its pills and button" }
  s1 --> d1
  d1 -->|"Yes"| a1
  d1 -->|"No"| d2
  d2 -->|"Yes"| a2
  d2 -->|"No"| d3
  d3 -->|"Yes"| a3
  d3 -->|"No"| a4
  a1 & a2 & a3 --> c1
  a4 --> e1
  c1 --> d4
  d4 -->|"Admission"| u1
  d4 -->|"Retro-authorization"| u2
  d4 -->|"Recertification"| u3
  d4 -->|"Continued stay"| u4
  d4 -->|"Initial request"| u5
  u1 & u2 & u3 & u4 & u5 -.-> u6
  u1 & u2 & u3 & u4 & u5 --> s2
  u6 --> s2
  s2 --> e1
  class s1 k_start
  class d1,d2,d3,d4 k_decision
  class a1,a2,a3,a4,c1,u1,u2,u3,u4,u5,u6,s2 k_process
  class e1 k_end
  style gDue fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Case Manager › Active cases › Tracker of every active case

Under 'Being prepared', the tracker lists all 56 active cases across every level of care. Four tiles count them by status and filter the table when clicked. The table is sorted soonest-first, ten rows a page.

Route: `/manager`

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
  s1@{ shape: stadium, label: "Scroll below 'Being prepared' on Active cases" }
  t0@{ shape: curv-trap, label: "<b>Four status tiles in a row</b><br/>11 'Needs action' (act today)<br/>14 'Review due' (review or recertify soon)<br/>15 'Awaiting payer' (the payer has it)<br/>16 'On track' (nothing needed)" }
  p0@{ shape: rect, label: "<b>Tile numbers follow search, level of care and payer</b><br/>They do not follow the status filter, so they always add up to the cases in view" }
  t1@{ shape: curv-trap, label: "<b>Table card</b><br/>Columns: Case, Level of care, Payer, Units used, Clock, Approval chance, Status, Open" }
  p1@{ shape: rect, label: "<b>Rows are sorted by Clock, soonest first (overdue rows lead)</b><br/>Ten rows a page, 'Showing 1 to 10 of 56'" }
  t2@{ shape: curv-trap, label: "<b>Note under the table</b><br/>'Approval chance estimates how well the paperwork fits the payer's past decisions ... Strong is 80 and above, Moderate 55 to 79, At risk below 55. It never blocks a request.'" }
  c1@{ shape: trap-t, label: "Click a tile, for example 'Needs action'" }
  d1@{ shape: diam, label: "Was that tile already selected?" }
  p2@{ shape: rect, label: "<b>Tile gets a green outline</b><br/>The 'Any status' dropdown shows the same status<br/>Table keeps only that status, and goes back to page 1" }
  p3@{ shape: rect, label: "<b>Outline goes</b><br/>Status filter is cleared: all cases again" }
  c2@{ shape: trap-t, label: "Pick a status in the 'Any status' dropdown" }
  p4@{ shape: rect, label: "Same effect as clicking that tile" }
  c3@{ shape: trap-t, label: "Click a sortable header or 'Previous' / 'Next'" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Sort and page the tracker" }
  c4@{ shape: rect, label: "Look at a row's Units used, Clock and Status cells" }
  g2@{ shape: subproc, label: "Continues in: Case Manager › Active cases › What each tracker cell means" }
  c5@{ shape: trap-t, label: "Click a row, its case ID or 'Open'" }
  g3@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Open a case from the tracker" }
  d2@{ shape: diam, label: "Does any row match?" }
  g4@{ shape: subproc, label: "Continues in: Case Manager › Empty states › Nothing to show" }
  e1@{ shape: stadium, label: "Table shows the matching cases" }
  s1 --> t0 --> p0 --> t1 --> p1 --> t2
  t0 --> c1 --> d1
  d1 -->|"No"| p2
  d1 -->|"Yes, clicking again"| p3
  t0 --> c2 --> p4
  p2 --> d2
  p3 --> d2
  p4 --> d2
  d2 -->|"Yes"| e1
  d2 -->|"No"| g4
  t1 --> c3 --> g1
  t1 --> c4 --> g2
  t1 --> c5 --> g3
  class s1 k_start
  class t0,t1,t2 k_screen
  class p0,p1,p2,p3,p4,c4 k_process
  class c1,c2,c3,c5 k_click
  class d1,d2 k_decision
  class g1,g2,g3,g4 k_goto
  class e1 k_end
```

## Case Manager › Active cases › Sort and page the tracker

Six of the eight table headers sort. A second click on the same header flips the order. The table shows ten rows at a time with 'Previous' and 'Next'. Changing a sort or any filter always returns to page 1.

Route: `/manager`

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
  s1@{ shape: stadium, label: "<b>Tracker table is on screen</b><br/>(sorted by Clock, soonest first)" }
  h1@{ shape: curv-trap, label: "<b>Headers</b><br/>Case, Level of care, Payer, Units used, Clock, Approval chance, Status, and a hidden 'Open' column<br/>Sortable ones show an up-and-down arrow button 'Sort by ...'" }
  c0@{ shape: trap-t, label: "Click 'Level of care' or the empty 'Open' header" }
  p0@{ shape: rect, label: "Nothing happens: those two do not sort" }
  c1@{ shape: trap-t, label: "<b>Click a sortable header</b><br/>('Case', 'Payer', 'Units used', 'Clock', 'Approval chance', 'Status')" }
  d1@{ shape: diam, label: "Is it the header already used for sorting?" }
  p1@{ shape: rect, label: "<b>Order flips: ascending becomes descending and back</b><br/>The arrow points up or down" }
  d2@{ shape: diam, label: "Which header is it?" }
  s1a@{ shape: rect, label: "'Case': case ID, A to Z" }
  s2a@{ shape: rect, label: "'Payer': payer key A to Z (Beacon, Cardinal, Evergreen, Harborview, Lakeshore, Summit)" }
  s3a@{ shape: rect, label: "<b>'Units used': share of the approval used, lowest first</b><br/>'not yet approved' rows count as lowest" }
  s4a@{ shape: rect, label: "'Clock': soonest binding event first; overdue first of all" }
  s5a@{ shape: rect, label: "'Approval chance': highest first on the first click" }
  s6a@{ shape: rect, label: "'Status': Needs action, Review due, Awaiting payer, On track" }
  p2@{ shape: rect, label: "<b>Ties are broken by the soonest due time</b><br/>The table goes back to page 1" }
  subgraph gPage ["Pager under the table"]
  pg@{ shape: curv-trap, label: "'Showing 1 to 10 of 56'    'Previous'   'Page 1 of 6'   'Next'" }
  n1@{ shape: trap-t, label: "Click 'Next'" }
  n2@{ shape: trap-t, label: "Click 'Previous'" }
  d3@{ shape: diam, label: "Is there another page that way?" }
  g1@{ shape: rect, label: "Next ten rows, text updates ('Showing 11 to 20 of 56', 'Page 2 of 6')" }
  g2@{ shape: rect, label: "Button is greyed out: 'Previous' on page 1, 'Next' on the last page" }
  end
  p3@{ shape: rect, label: "The page count follows the filters: with fewer than eleven matches there is one page" }
  e1@{ shape: stadium, label: "Rows are in the new order" }
  s1 --> h1
  h1 --> c0 --> p0
  h1 --> c1 --> d1
  d1 -->|"Yes"| p1 --> p2
  d1 -->|"No: a new column"| d2
  d2 -->|"Case"| s1a --> p2
  d2 -->|"Payer"| s2a --> p2
  d2 -->|"Units used"| s3a --> p2
  d2 -->|"Clock"| s4a --> p2
  d2 -->|"Approval chance"| s5a --> p2
  d2 -->|"Status"| s6a --> p2
  p2 --> e1
  h1 --> pg
  pg --> n1 --> d3
  pg --> n2 --> d3
  d3 -->|"Yes"| g1 --> e1
  d3 -->|"No"| g2
  g2 -.-> p3
  class s1 k_start
  class h1,pg k_screen
  class c0,c1,n1,n2 k_click
  class p0,p1,s1a,s2a,s3a,s4a,s5a,s6a,p2,g1,g2,p3 k_process
  class d1,d2,d3 k_decision
  class e1 k_end
  style gPage fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Case Manager › Active cases › What each tracker cell means

Every tracker row answers two questions: how much of the approval is left (Units used) and how long until the next thing that binds (Clock). The Clock wording depends on what kind of event is next, and it turns red when time is short. All of it moves with the demo clock.

Route: `/manager`

The dates and hours are measured from the demo clock, so Fast-forward changes them. Status and Approval chance are stored on the row and do not move.

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
  s1@{ shape: stadium, label: "Read one tracker row" }
  r1@{ shape: curv-trap, label: "<b>Case: ID, then initials and age</b><br/>Level of care: chip, then a short note ('Continued stay 3', 'Recertification')<br/>Payer: short name ('Summit Medicaid', 'Cardinal')" }
  u0@{ shape: diam, label: "Units used: is the case approved yet?" }
  u1@{ shape: rect, label: "<b>'not yet approved' in grey</b><br/>(admissions, retro-authorizations and first requests: 9 cases)" }
  u2@{ shape: rect, label: "<b>A bar and '10 of 21 days' (or 'units' for IOP)</b><br/>Bar turns terracotta at 75 percent used or more" }
  k0@{ shape: diam, label: "Clock: what is the next event that binds?" }
  k1@{ shape: rect, label: "<b>Notice</b><br/>'Notice due in 5 h' or 'Notice overdue'<br/>Red under 2 days" }
  k2@{ shape: rect, label: "<b>Retro window</b><br/>'Window closes 18 h' or 'Window closed'<br/>Red under 2 days" }
  k3@{ shape: rect, label: "<b>Peer-to-peer</b><br/>'P2P in 36 h' or 'P2P window closed'<br/>Red under 2 days" }
  k4@{ shape: rect, label: "<b>Payer question</b><br/>'Answer due in 20 h' or 'Answer overdue'<br/>Red under 1 day" }
  k5@{ shape: rect, label: "<b>Approval ends</b><br/>'3 days left', '14 h left' or 'Approval ended'<br/>Red under 1 day" }
  k6@{ shape: rect, label: "<b>Clinical review</b><br/>'Review in 2 days', 'Review tomorrow', 'Review today', 'Review due'<br/>Red only when overdue" }
  k7@{ shape: rect, label: "<b>Decision from the payer</b><br/>'Decision Thu', 'Decision in 5 h' or 'Decision overdue'<br/>Red only when overdue" }
  k8@{ shape: rect, label: "<b>Units only</b><br/>'32 units left'<br/>Never red" }
  k9@{ shape: rect, label: "Times under two days show hours ('5 h'). Longer ones show days ('3 days')" }
  s1p@{ shape: rect, label: "<b>Approval chance: percent with a bar, coloured by band</b><br/>Strong 80 and above, Moderate 55 to 79, At risk below 55" }
  s2p@{ shape: rect, label: "<b>Status pill: 'Needs action' (red), 'Review due' (amber), 'Awaiting payer' (grey), 'On track' (green)</b><br/>The four tiles count these" }
  s3p@{ shape: rect, label: "'Open' button at the end of the row" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Open a case from the tracker" }
  e1@{ shape: stadium, label: "Row is read" }
  s1 --> r1 --> u0
  u0 -->|"No"| u1
  u0 -->|"Yes"| u2
  u1 --> k0
  u2 --> k0
  k0 -->|"Notice"| k1
  k0 -->|"Retro window"| k2
  k0 -->|"P2P call"| k3
  k0 -->|"Payer question"| k4
  k0 -->|"Approval end"| k5
  k0 -->|"Review"| k6
  k0 -->|"Decision"| k7
  k0 -->|"Units"| k8
  k1 & k2 & k3 & k4 & k5 & k6 & k7 & k8 --> k9
  k9 --> s1p --> s2p --> s3p --> g1
  s3p -.-> e1
  class s1 k_start
  class r1 k_screen
  class u0,k0 k_decision
  class u1,u2,k1,k2,k3,k4,k5,k6,k7,k8,k9,s1p,s2p,s3p k_process
  class g1 k_goto
  class e1 k_end
```

## Case Manager › Active cases › Open a case from the tracker

A tracker row opens the case page in Authorizations. Three clicks do the same thing: the row, the case ID and the 'Open' button. Not every tracker case has a case page in the demo: some rows land on 'Request not found'.

Route: `/manager → /authorizations/case/ID`

Reviews have the same issue: 'Open case' in the review drawer uses the same case pages.

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
  s1@{ shape: stadium, label: "Tracker row is on screen" }
  c1@{ shape: trap-t, label: "Click anywhere on the row" }
  c2@{ shape: trap-t, label: "Click the case ID (underlined)" }
  c3@{ shape: trap-t, label: "Click 'Open' at the end of the row" }
  p0@{ shape: rect, label: "The 'Open' button stops the click from reaching the row, so the case opens once" }
  p1@{ shape: rect, label: "<b>Case Manager works out the address</b><br/>/authorizations/case/ followed by the case code" }
  d1@{ shape: diam, label: "Is the row a denial?" }
  p2@{ shape: rect, label: "<b>Uses the case the denial came from</b><br/>D-3318 opens R-0997, the original case" }
  p3@{ shape: rect, label: "<b>Uses the row's own ID</b><br/>for example R-1042 or I-2207" }
  d2@{ shape: diam, label: "Does the case page know this case?" }
  s2@{ shape: curv-trap, label: "<b>Case page</b><br/>Header with the case ID, level of care and the request clock<br/>Tabs for the case" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case" }
  s3@{ shape: curv-trap, label: "<b>'Request not found'</b><br/>'There is no request with the ID R-0856.'<br/>'Nothing to show here'" }
  p4@{ shape: rect, label: "<b>The demo has case pages for about half the tracker (30 of 56)</b><br/>The other 26 rows (cases that exist only in the tracker) land here" }
  c4@{ shape: trap-t, label: "Click 'Back to the queue'" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Queue" }
  c5@{ shape: trap-t, label: "Click the browser Back button" }
  s4@{ shape: curv-trap, label: "<b>Case Manager again</b><br/>Same tab, but search, filters, sort and page are back to their defaults" }
  p5@{ shape: rect, label: "These live in the page, not in the address, so they are not remembered" }
  e1@{ shape: stadium, label: "Back at the top of the tracker" }
  s1 --> c1 & c2 & c3
  c3 --> p0 --> p1
  c1 --> p1
  c2 --> p1
  p1 --> d1
  d1 -->|"Yes"| p2 --> d2
  d1 -->|"No"| p3 --> d2
  d2 -->|"Yes"| s2 --> g1
  d2 -->|"No"| s3 --> p4
  s3 --> c4 --> g2
  s2 --> c5
  s3 --> c5
  c5 --> s4 --> p5 --> e1
  class s1 k_start
  class c1,c2,c3,c4,c5 k_click
  class p0,p1,p2,p3,p4,p5 k_process
  class d1,d2 k_decision
  class s2,s3,s4 k_screen
  class g1,g2 k_goto
  class e1 k_end
```

## Case Manager › Reviews this week › The list

The second tab lists every clinical review due this week, one card per day, with three tiles on top. Agents have already drafted most of them. A row opens the review drawer. A side card nudges the team to look at cases that may be ready for a lower level of care.

Route: `/manager?tab=reviews`

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
  s1@{ shape: stadium, label: "Click 'Reviews this week'" }
  t0@{ shape: curv-trap, label: "<b>Three tiles (not clickable)</b><br/>47 'Reviews due this week', '0 signed so far'<br/>39 'Drafted by agents', '33 clean, ready to sign'<br/>8 'Need a clinician update', 'what is missing is listed'" }
  p0@{ shape: rect, label: "<b>Tiles count all reviews and ignore the filters</b><br/>When filters hide some: 'Showing 8 of 47 reviews. The tiles count all 47.'<br/>With no updates left the third tile says 'nothing waiting on you'" }
  p1@{ shape: rect, label: "<b>One review exists for each approved case (47 of 56)</b><br/>Times run from today to Sunday" }
  subgraph gDays ["Day cards, in date order"]
  d1@{ shape: curv-trap, label: "<b>Card for one day</b><br/>Title 'Today' (the demo day) or the weekday, date 'Tue 10/20', and '13 reviews'" }
  d2@{ shape: curv-trap, label: "<b>Row: time ('8:30 am'), level chip, case ID, payer and 'C.D., 44'</b><br/>For a review that needs an update: the missing item in amber under the ID<br/>Pills: 'Check to look at' (amber), then 'Drafted', 'Needs your update' or 'Signed'<br/>Button 'Open'" }
  d3@{ shape: diam, label: "More than five reviews that day?" }
  c3@{ shape: trap-t, label: "Click 'Show 8 more'" }
  c4@{ shape: trap-t, label: "Click 'Show fewer'" }
  p3@{ shape: rect, label: "<b>First five rows show, then the button</b><br/>The rest open under it, and the button changes to 'Show fewer'" }
  end
  c1@{ shape: trap-t, label: "Click the case ID or 'Open' on a row" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › The review drawer" }
  subgraph gSide ["Right side card 'Ready to step down?'"]
  s2@{ shape: curv-trap, label: "<b>'A prompt for your team. It is never a decision.'</b><br/>R-0903: 'Day 14 of 21', 'Aftercare visit not booked yet'<br/>P-1522: 'Day 11', 'IOP starts Monday'" }
  c2@{ shape: trap-t, label: "Click R-0903 or P-1522" }
  p4@{ shape: rect, label: "Go to /authorizations/case/ and the ID" }
  d4@{ shape: diam, label: "Does that case page exist?" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case" }
  s3@{ shape: curv-trap, label: "<b>R-0903 shows 'Request not found'</b><br/>(P-1522 opens its case page)" }
  end
  p5@{ shape: rect, label: "<b>After Fast-forward 1 day the card for the new day is called 'Today'</b><br/>The old day keeps its reviews and statuses and is named by its weekday" }
  g3@{ shape: subproc, label: "Continues in: Case Manager › Empty states › Nothing to show" }
  e1@{ shape: stadium, label: "List is on screen" }
  s1 --> t0 --> p0 --> p1 --> d1 --> d2
  d2 --> d3
  d3 -->|"Yes"| c3 --> p3
  d3 -->|"No"| e1
  p3 --> c4 --> e1
  d2 --> c1 --> g1
  p1 --> s2 --> c2 --> p4 --> d4
  d4 -->|"Yes"| g2
  d4 -->|"No"| s3
  p1 -.-> p5
  p0 -.->|"No review matches"| g3
  class s1 k_start
  class t0,d1,d2,s2,s3 k_screen
  class p0,p1,p3,p4,p5 k_process
  class d3,d4 k_decision
  class c3,c4,c1,c2 k_click
  class g1,g2,g3 k_goto
  class e1 k_end
  style gDays fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSide fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Case Manager › Reviews this week › The review drawer

Opening a review shows the draft an agent wrote, the four Integrity checks and the buttons to sign or open the case. What the clinician can do depends on the review's status: a clean draft, a draft with one check to look at, a review that needs an update, or one already signed.

Route: `/manager?tab=reviews (drawer over the list)`

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
  s1@{ shape: stadium, label: "Click the case ID or 'Open' on a review row" }
  o1@{ shape: win-pane, label: "<b>Drawer slides in from the right (640 px)</b><br/>Title 'R-0856 · Summit'<br/>Subtitle 'Continued-stay review 2 · Residential 3.5 · due Tue 9:00 am'<br/>Status pill at the top right" }
  b1@{ shape: curv-trap, label: "<b>Top of the body</b><br/>'J.S., 51 · privacy mode'   'Drafted by' Scribe (Residential, Detox) or Cadence (PHP, IOP)" }
  b2@{ shape: curv-trap, label: "<b>'The draft'</b><br/>Large text box with seven parts: title and payer lines, Clinical status, Treatment progress, Risk and safety, Why this level of care still fits, Request" }
  b3@{ shape: curv-trap, label: "<b>'Integrity checks'</b><br/>'Every sentence traced to the chart'<br/>'Review has no errors'<br/>'All payer requirements covered'<br/>'Level of care matches the request'" }
  b4@{ shape: curv-trap, label: "<b>Footer</b><br/>'Sign review' (green), 'Open case', 'Close'" }
  d1@{ shape: diam, label: "What is the review's status?" }
  t1@{ shape: rect, label: "<b>'Drafted', all four checks green ticks</b><br/>Draft can be edited<br/>Banner: 'Signing is one review at a time. Your edits to the draft are saved with the signature.'" }
  t2@{ shape: rect, label: "<b>'Drafted' with 'Check to look at'</b><br/>One check is amber with Integrity's note, for example 'The draft asks for 7 days. Beacon's usual limit at this level of care is 5.'<br/>Draft can be edited" }
  t3@{ shape: rect, label: "<b>'Needs your update'</b><br/>Amber panel names what is missing; 'All payer requirements covered' is red<br/>Draft is locked: 'The draft is locked until your update is added.'<br/>'Sign review' is greyed, hover text 'Add your update first'" }
  t4@{ shape: rect, label: "<b>'Signed'</b><br/>Draft is read-only<br/>Footer shows 'Signed by Heather K., LISW-S' in place of the button" }
  i1@{ shape: lean-r, label: "Edit the draft text" }
  c1@{ shape: trap-t, label: "Click 'Sign review'" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › Sign a review" }
  g2@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › Add your update to a review" }
  c2@{ shape: trap-t, label: "Click 'Open case'" }
  p1@{ shape: rect, label: "<b>Go to /authorizations/case/ and the case ID, with ?tab=draft</b><br/>The drawer is gone with the page" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Case › Draft tab" }
  n1@{ shape: curv-trap, label: "Some cases show 'Request not found' (see 'Open a case from the tracker')" }
  c3@{ shape: trap-t, label: "Click 'Close', the X, the dimmed area, or press Escape" }
  d2@{ shape: diam, label: "Was the review a draft?" }
  st1@{ shape: cyl, label: "<b>Edits to the draft are saved on the review</b><br/>Open it again and the edited text is there" }
  p2@{ shape: rect, label: "Nothing to save" }
  e1@{ shape: stadium, label: "Back on the list, same place" }
  s1 --> o1 --> b1 --> b2 --> b3 --> b4 --> d1
  d1 -->|"Clean draft"| t1
  d1 -->|"One check to look at"| t2
  d1 -->|"Missing item"| t3
  d1 -->|"Already signed"| t4
  t1 --> i1
  t2 --> i1
  t1 --> c1 --> g1
  t2 --> c1
  t3 --> g2
  t4 --> c2
  t1 --> c2
  c2 --> p1 --> g3
  p1 -.-> n1
  b4 --> c3 --> d2
  d2 -->|"Yes: Drafted"| st1 --> e1
  d2 -->|"No"| p2 --> e1
  class s1 k_start
  class o1 k_overlay
  class b1,b2,b3,b4,n1 k_screen
  class d1,d2 k_decision
  class t1,t2,t3,t4,p1,p2 k_process
  class i1 k_input
  class c1,c2,c3 k_click
  class g1,g2,g3 k_goto
  class st1 k_store
  class e1 k_end
```

## Case Manager › Reviews this week › Add your update to a review

Eight reviews could not be finished by the agents because the chart lacks one item. The clinician says what applies, in their own words, and Integrity checks the draft again. The review then becomes an ordinary draft that can be signed. This is the 'answer' gate: agents stop and ask a person.

Route: `/manager?tab=reviews (review drawer)`

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
  s1@{ shape: stadium, label: "<b>Open a review marked 'Needs your update'</b><br/>(for example R-0912)" }
  o1@{ shape: win-pane, label: "<b>Review drawer</b><br/>Status pill 'Needs your update'" }
  b1@{ shape: curv-trap, label: "<b>Amber panel 'Needs your update'</b><br/>What is missing, for example 'Evergreen has not answered in 4 days. Confirm the current risk assessment before Caller resends the review.'" }
  b2@{ shape: curv-trap, label: "<b>Box 'Your update' (required)</b><br/>Hint: 'This goes into the draft under Clinician update. Integrity checks the draft again.'<br/>Button 'Add to the draft' (greyed while the box is empty)" }
  b3@{ shape: curv-trap, label: "<b>The draft is read-only: 'The draft is locked until your update is added.'</b><br/>Integrity checks: 'All payer requirements covered' is red with 'A required item is missing. See what the review needs from you.'<br/>'Sign review' is greyed: 'Add your update first'" }
  i1@{ shape: lean-r, label: "Type the update in 'Your update'" }
  d1@{ shape: diam, label: "Is there text (not just spaces)?" }
  p0@{ shape: rect, label: "'Add to the draft' stays greyed. Nothing can be sent" }
  c1@{ shape: trap-t, label: "Click 'Add to the draft'" }
  p1@{ shape: rect, label: "Button shows a spinner for about 1.3 seconds" }
  a1@{ shape: hex, label: "Integrity checks the draft again with the update" }
  st1@{ shape: cyl, label: "<b>Review is saved as 'Drafted'</b><br/>The missing item is cleared<br/>Your text is saved as the note and added to the draft under 'Clinician update'<br/>All four checks turn green" }
  t1@{ shape: odd, label: "<b>'Review updated'</b><br/>'Integrity checked R-0912 again. It is a draft now and ready to sign.'" }
  p2@{ shape: rect, label: "<b>Drawer redraws in place:</b><br/>Amber panel gone, draft unlocked and longer, checks green, 'Sign review' ready" }
  p3@{ shape: rect, label: "<b>Sidebar 'Case Manager' bubble drops by one (11 becomes 10)</b><br/>Tile 'Need a clinician update' drops, 'Drafted by agents' rises, and the review counts as 'clean' for 'Sign all clean drafts'" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › Sign a review" }
  c2@{ shape: trap-t, label: "Close the drawer without adding anything" }
  p4@{ shape: rect, label: "Nothing is saved: the review stays 'Needs your update'" }
  c3@{ shape: trap-t, label: "Click 'Open case'" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case › Draft tab" }
  e1@{ shape: stadium, label: "Review is ready to sign" }
  e2@{ shape: stadium, label: "Still waiting on the clinician" }
  s1 --> o1 --> b1 --> b2 --> b3 --> i1 --> d1
  d1 -->|"No"| p0 --> e2
  d1 -->|"Yes"| c1 --> p1 --> a1 --> st1
  st1 --> t1 --> p2 --> p3 --> g1
  p3 --> e1
  b3 --> c2 --> p4 --> e2
  b3 --> c3 --> g2
  p0 -.-> i1
  class s1 k_start
  class o1 k_overlay
  class b1,b2,b3 k_screen
  class i1 k_input
  class d1 k_decision
  class p0,p1,p2,p3,p4 k_process
  class c1,c2,c3 k_click
  class a1 k_agent
  class st1 k_store
  class t1 k_toast
  class g1,g2 k_goto
  class e1 k_end
  class e2 k_endx
```

## Case Manager › Reviews this week › Sign a review

Signing is the gate where agents stop. Only a licensed clinician signs, so the coordinator picks who is signing and ticks an attestation. When Integrity left one amber check, the signer must also read and accept it. Signing is one review at a time.

Route: `/manager?tab=reviews (review drawer › sign dialog)`

PRD 03 (sign-off gate) says nothing goes out without a clinician signature carrying signer identity and a timestamp. The demo records the signer and the demo-clock time.

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
  s1@{ shape: stadium, label: "Open a drafted review, then click 'Sign review'" }
  o1@{ shape: win-pane, label: "<b>Dialog 'Sign this review'</b><br/>Subtitle 'R-0856 · Summit Medicaid HMO · Residential 3.5'" }
  b1@{ shape: curv-trap, label: "<b>Banner 'Only a licensed clinician signs'</b><br/>'You are signed in as Jordan Perez, a UR coordinator. Choose the clinician who is signing. Agents never sign for a person.'" }
  i1@{ shape: lean-r, label: "<b>'Signing clinician' dropdown</b><br/>'Heather K., LISW-S' (Clinical director)<br/>'Dr. R. Lindqvist, MD' (Medical director)" }
  d1@{ shape: diam, label: "Did Integrity leave one amber check?" }
  w1@{ shape: curv-trap, label: "<b>Amber box 'One check needs a look'</b><br/>Integrity's note, for example 'The draft asks for 7 days. Beacon's usual limit at this level of care is 5.'<br/>Tick box 'I read this and I accept it'" }
  i2@{ shape: lean-r, label: "Tick 'I read this and I accept it'" }
  i3@{ shape: lean-r, label: "<b>Tick the attestation</b><br/>'I reviewed this continued-stay review and it reflects the record. The level of care is my clinical judgment.'" }
  d2@{ shape: diam, label: "Are the attestation (and the acceptance, if shown) ticked?" }
  x1@{ shape: rect, label: "Button 'Sign review' stays greyed" }
  c1@{ shape: trap-t, label: "Click 'Sign review' in the dialog" }
  st1@{ shape: cyl, label: "<b>Review is saved as 'Signed'</b><br/>Signed by the chosen clinician, stamped with the demo clock<br/>The draft text, with any edits made in the drawer, is kept" }
  t1@{ shape: odd, label: "<b>'Review signed'</b><br/>'R-0856 was signed by Heather K., LISW-S. Cadence books the next review.'" }
  p1@{ shape: rect, label: "Dialog closes. The drawer stays open and now shows 'Signed by Heather K., LISW-S' with a read-only draft" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › After a review is signed" }
  c2@{ shape: trap-t, label: "Click 'Cancel', the X, the dimmed area, or press Escape" }
  p2@{ shape: rect, label: "<b>Only the dialog closes. The drawer and the draft stay as they were</b><br/>Nothing is signed" }
  e1@{ shape: stadium, label: "Not signed" }
  e2@{ shape: stadium, label: "Review signed" }
  s1 --> o1 --> b1 --> i1 --> d1
  d1 -->|"Yes"| w1 --> i2 --> i3
  d1 -->|"No"| i3
  i3 --> d2
  d2 -->|"No"| x1 -.-> i3
  d2 -->|"Yes"| c1 --> st1 --> t1 --> p1 --> e2
  p1 --> g1
  o1 --> c2 --> p2 --> e1
  class s1 k_start
  class o1 k_overlay
  class b1,w1 k_screen
  class i1,i2,i3 k_input
  class d1,d2 k_decision
  class x1,p1,p2 k_process
  class c1,c2 k_click
  class st1 k_store
  class t1 k_toast
  class g1 k_goto
  class e1 k_endx
  class e2 k_end
```

## Case Manager › Reviews this week › Draft all due reviews and sign all clean drafts

Two buttons in the header work on the whole week. 'Draft all due reviews' asks Cadence to check for missing drafts. 'Sign all clean drafts' signs every draft whose four Integrity checks passed, in one step, and leaves out anything that needs a closer look.

Route: `/manager?tab=reviews (the two header buttons)`

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
  s1@{ shape: stadium, label: "Reviews this week tab is open" }
  subgraph gDraft ["Draft all due reviews"]
  c1@{ shape: trap-t, label: "Click 'Draft all due reviews'" }
  p1@{ shape: rect, label: "Button shows a spinner and is disabled for about 1.3 seconds" }
  a1@{ shape: hex, label: "Cadence checks the next 3 days for reviews with no draft" }
  t1@{ shape: odd, label: "<b>'Cadence checked the next 3 days'</b><br/>'All 47 reviews due this week already have a draft or a question for you. Nothing is left to draft.'" }
  p2@{ shape: rect, label: "Nothing changes in the list: every review already has a draft or is waiting on a clinician" }
  end
  subgraph gSign ["Sign all clean drafts"]
  d1@{ shape: diam, label: "<b>Is any draft clean?</b><br/>(drafted, and all four checks passed)" }
  x1@{ shape: rect, label: "<b>Button 'Sign all clean drafts' is greyed out</b><br/>(33 are clean at the start)" }
  c2@{ shape: trap-t, label: "Click 'Sign all clean drafts'" }
  o1@{ shape: win-pane, label: "<b>Dialog 'Sign all clean drafts'</b><br/>Subtitle '33 reviews with all four checks passed'" }
  b1@{ shape: curv-trap, label: "Text: 'Only drafts whose four Integrity checks all passed are signed. 6 drafts with a check to look at are left out. 8 reviews that need your update are left out too.'" }
  b2@{ shape: curv-trap, label: "<b>Banner 'Only a licensed clinician signs'</b><br/>Dropdown 'Signing clinician' (Heather K., LISW-S or Dr. R. Lindqvist, MD)" }
  i1@{ shape: lean-r, label: "Tick 'I reviewed these 33 drafts and they reflect the record. The level of care in each is my clinical judgment.'" }
  d2@{ shape: diam, label: "Is the box ticked?" }
  x2@{ shape: rect, label: "Button 'Sign 33 reviews' stays greyed" }
  c3@{ shape: trap-t, label: "Click 'Sign 33 reviews'" }
  st1@{ shape: cyl, label: "<b>Every clean draft is saved as 'Signed' by the chosen clinician, stamped with the demo clock</b><br/>Drafts with an amber check and reviews needing an update stay as they were" }
  t2@{ shape: odd, label: "<b>'33 reviews signed'</b><br/>'Heather K., LISW-S signed every draft whose four checks passed. The others wait for a closer look.'" }
  p3@{ shape: rect, label: "<b>Dialog closes</b><br/>Tile 'Reviews due this week' reads '33 signed so far'; 'Drafted by agents' reads '0 clean, ready to sign'<br/>The header button is greyed out<br/>Sidebar bubble is unchanged (still 11)" }
  c4@{ shape: trap-t, label: "Click 'Cancel', the X, the dimmed area, or press Escape" }
  p4@{ shape: rect, label: "Dialog closes, nothing is signed" }
  t3@{ shape: odd, label: "<b>'No clean drafts to sign'</b><br/>'Every draft left has a check that needs a look. Open each one to sign it.'<br/>(never seen on screen today: the button is greyed out first)" }
  end
  g1@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › After a review is signed" }
  g2@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › Sign a review" }
  e1@{ shape: stadium, label: "Week's clean reviews are signed" }
  e2@{ shape: stadium, label: "Nothing signed" }
  e3@{ shape: stadium, label: "Nothing was missing, so nothing was drafted" }
  s1 --> c1 --> p1 --> a1 --> t1 --> p2 --> e3
  s1 --> d1
  d1 -->|"No"| x1 --> e2
  d1 -->|"Yes"| c2 --> o1 --> b1 --> b2 --> i1 --> d2
  d2 -->|"No"| x2 -.-> i1
  d2 -->|"Yes"| c3 --> st1 --> t2 --> p3 --> g1
  p3 --> e1
  p3 --> g2
  o1 --> c4 --> p4 --> e2
  d1 -.-> t3
  class s1 k_start
  class c1,c2,c3,c4 k_click
  class p1,p2,x1,x2,p3,p4 k_process
  class a1 k_agent
  class t1,t2,t3 k_toast
  class d1,d2 k_decision
  class o1 k_overlay
  class b1,b2 k_screen
  class i1 k_input
  class st1 k_store
  class g1,g2 k_goto
  class e1,e3 k_end
  class e2 k_endx
  style gDraft fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSign fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Case Manager › Reviews this week › After a review is signed

What the demo does once a clinician signs, and what the real product would do next. In the demo a signature changes the review's status and a few counts. The next review is only announced in the toast: no new row is added.

Route: `/manager?tab=reviews`

The PRD (03, Prior Authorization Lifecycle) treats each signed request as a version that is kept, and times renewals from the binding date and the payer's lead time. The demo shows only the signature and the counts.

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
  s1@{ shape: stadium, label: "<b>A clinician signature is saved</b><br/>(one review, or 'Sign all clean drafts')" }
  st1@{ shape: cyl, label: "The review keeps: status 'Signed', who signed, the demo-clock time, and the draft text as signed" }
  subgraph gScreen ["What changes on screen"]
  a1@{ shape: rect, label: "<b>Row pill changes from 'Drafted' to 'Signed'</b><br/>'Check to look at' goes away on a signed row" }
  a2@{ shape: rect, label: "Drawer, if open: footer reads 'Signed by Heather K., LISW-S', draft is read-only, the banner is gone" }
  a3@{ shape: rect, label: "Tile 'Reviews due this week' sub line counts up: '1 signed so far'" }
  a4@{ shape: rect, label: "<b>Tile 'Drafted by agents' sub line counts down: '32 clean, ready to sign'</b><br/>The tile number itself still counts signed ones" }
  a5@{ shape: rect, label: "'Sign all clean drafts' is greyed out once none are left" }
  a6@{ shape: rect, label: "Filter 'Signed' in 'Any review status' now lists it" }
  a7@{ shape: rect, label: "Sidebar 'Case Manager' bubble does not change: it counts reviews that need an update, not drafts waiting to be signed" }
  end
  subgraph gNext ["The next review"]
  t1@{ shape: odd, label: "Toast says 'Cadence books the next review.'" }
  g1@{ shape: hex, label: "Cadence books the next continued-stay review from the payer's lead time (real product)" }
  n1@{ shape: rect, label: "<b>Demo: no new row, no new date and no new notification appears</b><br/>The week's list keeps its 47 reviews" }
  x1@{ shape: st-rect, label: "Payer receives the signed review through its portal or by fax (real product, not drawn in the demo)" }
  end
  subgraph gCase ["Case record"]
  c1@{ shape: trap-t, label: "Click 'Open case' in the drawer" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case › Draft tab" }
  end
  st2@{ shape: cyl, label: "'Reset demo data' puts every review back to its starting state and clears signatures" }
  e1@{ shape: stadium, label: "Review is signed and counted" }
  s1 --> st1
  st1 --> a1 & a2 & a3 & a4 & a5 & a6 & a7
  st1 --> t1 --> n1
  t1 -.-> g1 -.-> x1
  a2 --> c1 --> g2
  a1 & a3 & a4 & a5 & a6 & a7 --> e1
  n1 --> e1
  e1 -.-> st2
  class s1 k_start
  class st1,st2 k_store
  class a1,a2,a3,a4,a5,a6,a7,n1 k_process
  class t1 k_toast
  class g1 k_agent
  class x1 k_ext
  class c1 k_click
  class g2 k_goto
  class e1 k_end
  style gScreen fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gNext fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCase fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Case Manager › Empty states › Nothing to show

Four places can run out of rows: the 'Being prepared' card, the tracker, the review list and the review-update tile. Each says why and offers one way out. Filters cause three of them. The fourth happens when every draft has been signed and sent.

Route: `/manager and /manager?tab=reviews`

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
  s1@{ shape: stadium, label: "Case Manager is open" }
  i1@{ shape: lean-r, label: "Type a search that matches nothing (for example 'zzz'), or pick a level of care and payer that no case has" }
  p1@{ shape: rect, label: "Every list is re-filtered at once" }
  subgraph gPrep ["Being prepared card"]
  d1@{ shape: diam, label: "Are there any drafts waiting at all?" }
  e1s@{ shape: curv-trap, label: "<b>Icon of a folder</b><br/>'Nothing is being prepared'<br/>'Start a case and the agents take it from there.'<br/>Button 'Start a new case'" }
  c1@{ shape: trap-t, label: "Click 'Start a new case'" }
  d2@{ shape: diam, label: "Do the page filters and the chip hide all of them?" }
  e2s@{ shape: curv-trap, label: "<b>Icon of a magnifier</b><br/>'No cases match these filters'<br/>'The filters hide every case being prepared. Clear them to see all 5.'<br/>Button 'Clear filters'" }
  c2@{ shape: trap-t, label: "Click 'Clear filters' on the card" }
  p2@{ shape: rect, label: "Chip goes back to 'All' and the page filters are cleared" }
  end
  subgraph gTrack ["Tracker"]
  d3@{ shape: diam, label: "Does any tracker row match?" }
  e3s@{ shape: curv-trap, label: "<b>Four tiles show 0</b><br/>'No cases match'<br/>'The filters hide every case. Clear them to see all 56.'<br/>Button 'Clear filters'<br/>The pager is hidden" }
  c3@{ shape: trap-t, label: "Click 'Clear filters'" }
  end
  subgraph gRev ["Reviews this week"]
  d4@{ shape: diam, label: "Does any review match?" }
  e4s@{ shape: curv-trap, label: "<b>'Showing 0 of 47 reviews. The tiles count all 47.'</b><br/>'No reviews match'<br/>'The filters hide every review this week.'<br/>Button 'Clear filters'<br/>The 'Ready to step down?' card is still there" }
  c4@{ shape: trap-t, label: "Click 'Clear filters'" }
  e5s@{ shape: curv-trap, label: "<b>Third tile reads 'nothing waiting on you'</b><br/>when no review needs an update" }
  end
  p3@{ shape: rect, label: "<b>Filters go back to their first options</b><br/>Search box is emptied, lists are full again" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Filters › Search and filter both tabs" }
  g2@{ shape: subproc, label: "Continues in: New case › Referral step" }
  p4@{ shape: rect, label: "<b>How drafts run out: sign and send every case in 'Being prepared' (5 at the start)</b><br/>The header then reads '0 are still being prepared'" }
  e1@{ shape: stadium, label: "Lists show rows again" }
  s1 --> i1 --> p1
  p1 --> d1
  d1 -->|"No"| e1s --> c1 --> g2
  d1 -->|"Yes"| d2
  d2 -->|"Yes"| e2s --> c2 --> p2 --> e1
  d2 -->|"No"| e1
  p1 --> d3
  d3 -->|"No"| e3s --> c3 --> p3
  d3 -->|"Yes"| e1
  p1 --> d4
  d4 -->|"No"| e4s --> c4 --> p3
  d4 -->|"Yes"| e1
  p3 --> e1
  p3 -.-> g1
  s1 -.-> p4
  p4 -.-> d1
  s1 -.-> e5s
  class s1 k_start
  class i1 k_input
  class p1,p2,p3,p4 k_process
  class d1,d2,d3,d4 k_decision
  class e1s,e2s,e3s,e4s,e5s k_screen
  class c1,c2,c3,c4 k_click
  class g1,g2 k_goto
  class e1 k_end
  style gPrep fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gTrack fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gRev fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Case Manager › Page › Links in and the tab address

Nine routes lead to Case Manager. Four of them name a tab in the address. Anything that is not '?tab=reviews' opens Active cases. This diagram lists each source, the address it uses and which tab opens.

Route: `/manager, /manager?tab=cases, /manager?tab=reviews, /active`

Links never carry a case, a filter or a page number. Case Manager always opens at the top with filters cleared.

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
  s1@{ shape: stadium, label: "A person is somewhere else in the demo" }
  subgraph gOther ["Links from other pages"]
  c1@{ shape: trap-t, label: "<b>Eligibility & Benefits › a result › 'Open in Case Manager'</b><br/>(shown when the result has no request of its own)" }
  r1@{ shape: rect, label: "Go to /manager?tab=cases" }
  c2@{ shape: trap-t, label: "Denial Intelligence › a closed denial › 'Plan the step-down'" }
  r2@{ shape: rect, label: "Go to /manager?tab=reviews" }
  c3@{ shape: trap-t, label: "Notifications › 'Denial closed'" }
  r3@{ shape: rect, label: "Go to /manager?tab=reviews" }
  c4@{ shape: trap-t, label: "Notifications › 'Drafts updated' (after a payer change)" }
  r4@{ shape: rect, label: "Go to /manager (no tab)" }
  c5@{ shape: trap-t, label: "<b>Authorizations queue empty › 'Open Case Manager'</b><br/>('Nothing needs you today')" }
  r5@{ shape: rect, label: "Go to /manager (no tab)" }
  c6@{ shape: trap-t, label: "<b>New case › 'Case Manager' link above the title,</b><br/>or 'Back to Case Manager' on a sent case" }
  r6@{ shape: rect, label: "Go to /manager (no tab)" }
  end
  subgraph gShell ["Links from the shell"]
  c7@{ shape: trap-t, label: "Sidebar › 'Case Manager'" }
  r7@{ shape: rect, label: "Go to /manager (no tab)" }
  c8@{ shape: trap-t, label: "Demo menu › '7 Case Manager: reviews this week'" }
  r8@{ shape: rect, label: "Go to /manager?tab=reviews" }
  c9@{ shape: trap-t, label: "A saved or typed old address /active" }
  r9@{ shape: rect, label: "Replaced by /manager (any ?tab= on it is lost)" }
  end
  d1@{ shape: diam, label: "Does the address say ?tab=reviews?" }
  sR@{ shape: curv-trap, label: "<b>Reviews this week tab opens</b><br/>Switch shows 'Reviews this week' selected" }
  sA@{ shape: curv-trap, label: "<b>Active cases tab opens</b><br/>The values '?tab=cases', no tab, or anything else all land here" }
  p1@{ shape: rect, label: "<b>Page starts at the top</b><br/>Sidebar 'Case Manager' is green<br/>Search box empty, all dropdowns on their first option" }
  c10@{ shape: trap-t, label: "Click the other tab" }
  p2@{ shape: rect, label: "Address is rewritten to ?tab=reviews or ?tab=cases in place (no extra Back step)" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › The list" }
  g2@{ shape: subproc, label: "Continues in: Case Manager › Active cases › Being prepared card" }
  e1@{ shape: stadium, label: "Case Manager is open on the right tab" }
  s1 --> c1 & c2 & c3 & c4 & c5 & c6 & c7 & c8 & c9
  c1 --> r1
  c2 --> r2
  c3 --> r3
  c4 --> r4
  c5 --> r5
  c6 --> r6
  c7 --> r7
  c8 --> r8
  c9 --> r9
  r1 & r2 & r3 & r4 & r5 & r6 & r7 & r8 & r9 --> d1
  d1 -->|"Yes"| sR --> p1
  d1 -->|"No"| sA --> p1
  p1 --> e1
  sR --> g1
  sA --> g2
  sR --> c10 --> p2
  sA --> c10
  class s1 k_start
  class c1,c2,c3,c4,c5,c6,c7,c8,c9,c10 k_click
  class r1,r2,r3,r4,r5,r6,r7,r8,r9,p1,p2 k_process
  class d1 k_decision
  class sR,sA k_screen
  class g1,g2 k_goto
  class e1 k_end
  style gOther fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gShell fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```
