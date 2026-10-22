# Authorizations › Eligibility & Benefits

List, verify a patient, the live check and the verdict.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/05-eligibility/`.

## Authorizations › Eligibility & Benefits › List › What the screen shows

The first page of Eligibility & Benefits. A headline count with an info icon, four figures, a filter bar and one patient per two lines: the chips that answer the question, then a quiet line with the rest. The sidebar badge counts the patients who are not cleared to bill.

Route: `/authorizations/eligibility`

Demo only: the 37 patients are invented and every check is simulated. Re-check dates run on the Demo clock.

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
  s1@{ shape: stadium, label: "Click 'Eligibility & Benefits' under 'Authorizations' in the sidebar" }
  sc@{ shape: curv-trap, label: "<b>Eligibility & Benefits</b><br/>Title '28 of 37 patients are cleared to bill.' with an info icon<br/>'Coverage and benefits are checked before the first day, so you know whether the clinic will be paid. Checks in this demo are simulated.'" }
  p1@{ shape: rect, label: "<b>Sidebar badge counts patients not 'Cleared to bill'</b><br/>Demo start: 9 = 4 'Authorization first' + 5 'Fix before billing'" }
  subgraph gTop ["Top of the page"]
  hd@{ shape: curv-trap, label: "<b>Header button</b><br/>'Verify a patient'" }
  tip@{ shape: curv-trap, label: "<b>Info icon beside the title</b><br/>(button 'Why we check twice')<br/>Hover, focus or click opens the text; Escape closes it<br/>No banner on the page any more" }
  tl@{ shape: curv-trap, label: "<b>Four figures, left to right</b><br/>'Cleared to bill' 28 · 'Authorization first' 4<br/>'Fix before billing' 5 · 'Re-check due' 5" }
  cnt@{ shape: rect, label: "<b>Counts follow each row's verdict</b><br/>'Re-check due' counts rows with a re-check still to come this week<br/>Verify runs each one on its own when the Demo clock passes its time" }
  end
  subgraph gBar ["Filter bar"]
  fl@{ shape: curv-trap, label: "<b>'Search by case ID or initials'</b><br/>Menus 'All payers', 'All programs', 'All verdicts'" }
  end
  subgraph gCard ["Card 'Patients'"]
  cd@{ shape: curv-trap, label: "<b>Card 'Patients'</b><br/>'Simulated checks against the state and the plan, re-checked on a schedule'<br/>'Showing 12 of 37'" }
  so@{ shape: rect, label: "<b>Fixed sort order</b><br/>'Fix before billing' first, then 'Authorization first', then oldest check" }
  sd@{ shape: rect, label: "<b>The five 'Fix before billing' rows show five reasons</b><br/>Coverage lapsed, coverage ended, service not covered, another plan pays first, every authorized day used" }
  pg@{ shape: rect, label: "<b>No filter: the first 12 rows</b><br/>A filter shows every match" }
  cols@{ shape: curv-trap, label: "<b>Columns</b><br/>Patient, Program, Eligibility, Benefits, Authorization, Verdict, Re-check<br/>Headers do not sort" }
  end
  subgraph gRow ["One patient, two lines"]
  r1@{ shape: curv-trap, label: "<b>Line 1: patient</b><br/>'R-1042 · J.M., 34'<br/>No initials: 'Member …4821'" }
  r2@{ shape: curv-trap, label: "<b>Line 1: Program chip</b><br/>'Residential 3.5', 'IOP', 'PHP', 'Detox'<br/>or a label such as 'Detox → Residential'" }
  r3@{ shape: curv-trap, label: "<b>Line 1: Eligibility and Benefits chips</b><br/>'Active', 'Lapsed 10/12', 'Ended 09/30', 'Not found'<br/>'Covered', 'Limited', 'Not covered'" }
  r4@{ shape: curv-trap, label: "<b>Line 1: Authorization chip, one word group only</b><br/>'On file', 'Not required', 'Required, not on file', 'In progress'" }
  r5@{ shape: curv-trap, label: "<b>Line 1: Verdict chip</b><br/>'Cleared to bill', 'Authorization first', 'Fix before billing'" }
  r6@{ shape: curv-trap, label: "Line 1: button 'Re-check'" }
  r7@{ shape: curv-trap, label: "<b>Line 2, small and quiet, across the row</b><br/>Payer name · day limit · when it was checked<br/>'Cardinal Health Plan · 14 of 14 days · Checked 5 h ago'<br/>'No day limit' when the program has none<br/>A row due for a re-check adds 'Re-check due Tue 11:32 am'<br/>After Verify's own re-check 'Re-checked automatically at 11:32 am'<br/>If Verify is paused 'Not re-checked: Verify is paused in Settings' (amber)" }
  end
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › List › Search, filter and page" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › List › Open a patient or start a check" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › What each chip means" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Re-check on its own" }
  g5@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › List › The info icon" }
  s1 --> sc
  sc --> hd --> tl --> fl --> cd
  sc -.-> p1
  sc --> tip --> g5
  tl --> cnt
  cd --> so --> sd
  so --> pg --> cols
  cols --> r1 & r2 & r3 & r4 & r5 & r6 & r7
  fl --> g1
  hd --> g2
  r6 --> g2
  r3 & r4 & r5 --> g3
  cnt -.-> g4
  r7 -.-> g4
  class s1 k_start
  class sc,hd,tip,tl,fl,cd,cols,r1,r2,r3,r4,r5,r6,r7 k_screen
  class p1,cnt,so,sd,pg k_process
  class g1,g2,g3,g4,g5 k_goto
  style gTop fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gBar fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCard fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gRow fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › List › Search, filter and page

Search, three menus and the four tiles all narrow the same table, and they work together. Nothing is kept in the address, so leaving the page clears them.

Route: `/authorizations/eligibility`

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
  s1@{ shape: stadium, label: "On the list, narrow the patients" }
  sc0@{ shape: curv-trap, label: "<b>Table shows every patient, first 12 rows</b><br/>'Showing 12 of 37'" }
  subgraph gSearch ["Search"]
  i1@{ shape: lean-r, label: "<b>Type in 'Search by case ID or initials'</b><br/>for example 'R-1042' or 'J.M.'" }
  p1@{ shape: rect, label: "<b>Matches the case ID or the patient label</b><br/>(initials and age, or 'Member …4821'). Capitals do not matter" }
  end
  subgraph gMenus ["Menus"]
  c1@{ shape: trap-t, label: "Click 'All payers'" }
  o1@{ shape: win-pane, label: "<b>'All payers', then each payer</b><br/>Summit Medicaid HMO, Cardinal Health Plan, Evergreen, Beacon PPO, Harborview MA, Lakeshore Behavioral" }
  c2@{ shape: trap-t, label: "Click 'All programs'" }
  o2@{ shape: win-pane, label: "'All programs', 'Residential 3.5', 'IOP', 'PHP', 'Detox'" }
  c3@{ shape: trap-t, label: "Click 'All verdicts'" }
  o3@{ shape: win-pane, label: "'All verdicts', 'Cleared to bill', 'Authorization first', 'Fix before billing', 'Re-check due'" }
  i2@{ shape: lean-r, label: "<b>Pick an option, or use the arrow keys and Enter</b><br/>Esc or a click outside closes the menu" }
  end
  subgraph gTiles ["Tiles"]
  c4@{ shape: trap-t, label: "<b>Click a tile</b><br/>'Cleared to bill', 'Authorization first', 'Fix before billing' or 'Re-check due'" }
  q1@{ shape: diam, label: "Was that tile already selected?" }
  p2@{ shape: rect, label: "<b>Verdict menu set to that tile</b><br/>The tile gets an outline" }
  p3@{ shape: rect, label: "Verdict menu back to 'All verdicts'" }
  end
  p4@{ shape: rect, label: "<b>Rows recompute: every active filter must match</b><br/>A menu that is not 'All ...' is highlighted" }
  q2@{ shape: diam, label: "Any filter active?" }
  p5@{ shape: rect, label: "<b>Every match is shown</b><br/>No 'Show more' button" }
  p6@{ shape: rect, label: "Only the first 12 rows" }
  c5@{ shape: trap-t, label: "Click 'Show 12 more'" }
  p7@{ shape: rect, label: "<b>Twelve more rows join the table</b><br/>The last click reads 'Show 10 more'" }
  sc1@{ shape: curv-trap, label: "<b>Table with the matches, two lines per patient</b><br/>'Showing 5 of 37'" }
  t0@{ shape: odd, label: "'Clear filters' button appears beside the menus" }
  q3@{ shape: diam, label: "Any rows left?" }
  em@{ shape: curv-trap, label: "<b>'No patients match these filters'</b><br/>'The filters hide every row. Clear them to see all 37 patients.'" }
  c6@{ shape: trap-t, label: "Click 'Clear filters' (bar or empty state)" }
  p8@{ shape: rect, label: "<b>Search emptied</b><br/>Payer, program and verdict back to 'All'" }
  e1@{ shape: stadium, label: "Full list again, button gone" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › List › Open a patient or start a check" }
  s1 --> sc0
  sc0 --> i1 --> p1 --> p4
  sc0 --> c1 --> o1 --> i2
  sc0 --> c2 --> o2 --> i2
  sc0 --> c3 --> o3 --> i2
  i2 --> p4
  sc0 --> c4 --> q1
  q1 -->|"No"| p2 --> p4
  q1 -->|"Yes"| p3 --> p4
  p4 --> q2
  q2 -->|"No"| p6 --> c5 --> p7 --> sc0
  q2 -->|"Yes"| p5 --> q3
  p4 -.-> t0
  q3 -->|"Yes"| sc1 --> g1
  q3 -->|"No"| em --> c6
  t0 --> c6
  c6 --> p8 --> e1
  class s1 k_start
  class sc0,sc1,em k_screen
  class i1,i2 k_input
  class p1,p2,p3,p4,p5,p6,p7,p8 k_process
  class c1,c2,c3,c4,c5,c6 k_click
  class o1,o2,o3 k_overlay
  class q1,q2,q3 k_decision
  class t0 k_toast
  class e1 k_end
  class g1 k_goto
  style gSearch fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gMenus fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gTiles fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › List › Open a patient or start a check

What a click on the list does. A row or its ID opens the result. 'Re-check' runs a check without leaving the list. 'Verify a patient' starts a new one.

Route: `/authorizations/eligibility`

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
  s1@{ shape: stadium, label: "On the list, look at the patient rows" }
  sc@{ shape: curv-trap, label: "<b>Patients table</b><br/>Each patient is two lines, both tint on hover, pointer cursor" }
  subgraph gOpen ["Open the result"]
  c1@{ shape: trap-t, label: "Click anywhere on a patient's two lines" }
  c2@{ shape: trap-t, label: "Click the patient ID, for example 'R-1042'" }
  p1@{ shape: rect, label: "<b>Opens /authorizations/eligibility/R-1042</b><br/>The browser Back button returns here with search and filters cleared" }
  end
  subgraph gRe ["Re-check in place"]
  c3@{ shape: trap-t, label: "Click 'Re-check' on a row" }
  p2@{ shape: rect, label: "<b>The click stays on the row and does not open the result</b><br/>Button turns to a spinner and 'Checking'; the quiet second line says 'Checking now'" }
  end
  subgraph gNew ["A new patient"]
  c4@{ shape: trap-t, label: "Click 'Verify a patient' (top right)" }
  p3@{ shape: rect, label: "<b>Opens /authorizations/eligibility/verify</b><br/>with an empty form" }
  end
  res@{ shape: curv-trap, label: "Result page for that patient" }
  ver@{ shape: curv-trap, label: "<b>Verify a patient</b><br/>Empty form" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › What the page shows" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Re-verify a patient" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › Fill in the form" }
  t1@{ shape: rect, label: "<b>About 1 second later the quiet line reads 'Checked just now'</b><br/>A toast reports the answer" }
  s1 --> sc
  sc --> c1 & c2 & c3 & c4
  c1 --> p1
  c2 --> p1
  p1 --> res --> g1
  c3 --> p2 --> t1 --> g2
  c4 --> p3 --> ver --> g3
  class s1 k_start
  class sc,res,ver k_screen
  class c1,c2,c3,c4 k_click
  class p1,p2,p3,t1 k_process
  class g1,g2,g3 k_goto
  style gOpen fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gRe fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gNew fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › List › The info icon

The text of the old 'Why we check twice' banner sits behind a small info icon beside the page title. It opens on hover, on keyboard focus and on a click, and closes on Escape, on a click elsewhere, or when the pointer and focus leave. The icon is a button with aria-expanded.

Route: `/authorizations/eligibility`

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
  s1@{ shape: stadium, label: "<b>On the list, look at the title</b><br/>'28 of 37 patients are cleared to bill.'" }
  ic@{ shape: curv-trap, label: "<b>Small info icon after the title</b><br/>Name for screen readers: 'Why we check twice'" }
  h1@{ shape: trap-t, label: "Move the pointer onto the icon" }
  f1@{ shape: trap-t, label: "Tab to the icon (keyboard focus)" }
  c1@{ shape: trap-t, label: "Click the icon" }
  tp@{ shape: win-pane, label: "<b>Info tip under the title</b><br/>'Why we check twice. Eligibility says the patient is covered.<br/>Benefits say the service is payable. For Medicaid programs the second one<br/>decides whether the clinic is reimbursed, even when the copay is $0.'" }
  ae@{ shape: rect, label: "<b>aria-expanded is true while the tip is open</b><br/>The text is the icon's description" }
  q1@{ shape: diam, label: "How was it opened?" }
  l1@{ shape: trap-t, label: "Move the pointer away" }
  b1@{ shape: trap-t, label: "Tab away from the icon" }
  k1@{ shape: trap-t, label: "Click the icon again, or press Escape" }
  o1@{ shape: trap-t, label: "Click anywhere else on the page" }
  cl@{ shape: rect, label: "<b>Tip closes</b><br/>A pop-up above it stays: Escape closes one layer at a time" }
  keep@{ shape: rect, label: "<b>A click opens it and keeps it open</b><br/>until Escape, a second click or a click elsewhere" }
  e1@{ shape: stadium, label: "Page as before, no banner" }
  s1 --> ic
  ic --> h1 --> tp
  ic --> f1 --> tp
  ic --> c1 --> tp
  tp --> ae --> q1
  q1 -->|"Pointer"| l1 --> cl
  q1 -->|"Focus"| b1 --> cl
  q1 -->|"Click"| keep
  keep --> k1 --> cl
  keep --> o1 --> cl
  cl --> e1
  class s1 k_start
  class ic k_screen
  class h1,f1,c1,l1,b1,k1,o1 k_click
  class tp k_overlay
  class ae,cl,keep k_process
  class q1 k_decision
  class e1 k_end
```

## Authorizations › Eligibility & Benefits › Verify › Ways in and pre-fill

Five places lead to 'Verify a patient'. Two open an empty form. Three carry a referral or a case in the address, and the form fills itself from it. A referral also gives a link back to where the person came from.

Route: `/authorizations/eligibility/verify?referral=RF-2040 or ?case=R-1101`

Date of birth is never stored. When only an age is known, the form makes up 01/15 of the matching year so it can be complete.

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
  subgraph gBlank ["Opens an empty form"]
  a1@{ shape: stadium, label: "Click 'Verify a patient' on the Eligibility & Benefits list" }
  a2@{ shape: stadium, label: "Open 'Demo' (top right), pick item 4 'Eligibility & Benefits: verify a patient'" }
  end
  subgraph gLinked ["Opens a pre-filled form"]
  a3@{ shape: stadium, label: "On a referral's 'Coverage' tab, click 'Open full Eligibility & Benefits check'" }
  a4@{ shape: stadium, label: "On the Authorizations queue, click the red pill 'Coverage needs a fix'" }
  a5@{ shape: stadium, label: "On a case's actions, click 'Open Eligibility & Benefits' in the coverage recommendation" }
  end
  p0@{ shape: rect, label: "<b>Address opens /authorizations/eligibility/verify</b><br/>with ?referral=ID (from a referral), ?case=ID (from a case) or nothing" }
  q1@{ shape: diam, label: "Address has ?referral= ?" }
  q2@{ shape: diam, label: "Referral found?" }
  p1@{ shape: rect, label: "<b>Fills payer, member ID (masked), program from the referral</b><br/>Initials and age remembered for the result" }
  t1@{ shape: odd, label: "<b>'Referral not found'</b><br/>'We could not find RF-9999. Type the details instead.'" }
  q3@{ shape: diam, label: "Address has ?case= ?" }
  q4@{ shape: diam, label: "Case is a row on the Eligibility list?" }
  p2@{ shape: rect, label: "<b>Fills payer, masked member ID, program and date of service from that row</b><br/>The case ID is remembered" }
  q5@{ shape: diam, label: "Case is a request in the queue?" }
  p3@{ shape: rect, label: "<b>Fills payer and program</b><br/>Member ID left empty: type it" }
  p4@{ shape: rect, label: "Nothing is filled and no message appears" }
  p5@{ shape: rect, label: "<b>Date of birth made up from the age, for example age 26 gives 01/15/2000</b><br/>Anything the source lacks stays empty" }
  sc@{ shape: curv-trap, label: "<b>Verify a patient</b><br/>Form on the left, 'Live check' on the right" }
  bk@{ shape: rect, label: "<b>Back links above the title</b><br/>'Eligibility & Benefits' always<br/>'Back to referral RF-2040' when ?referral= names a referral that exists<br/>With ?case= as well, 'Back to case R-1042' takes its place" }
  nb@{ shape: rect, label: "<b>A referral that does not exist gives no back link</b><br/>Only the toast" }
  cy@{ shape: rect, label: "<b>Both addresses are carried to the result page</b><br/>so the way back is still there after the check" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › Fill in the form" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › New case › Referral › The full referral page" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  a1 --> p0
  a2 --> p0
  a3 --> p0
  a4 --> p0
  a5 --> p0
  p0 --> q1
  q1 -->|"Yes"| q2
  q2 -->|"Yes"| p1 --> p5 --> sc
  q2 -->|"No"| t1 --> nb --> sc
  q1 -->|"No"| q3
  q3 -->|"No: empty form"| sc
  q3 -->|"Yes"| q4
  q4 -->|"Yes"| p2 --> p5
  q4 -->|"No"| q5
  q5 -->|"Yes"| p3 --> p5
  q5 -->|"No"| p4 --> sc
  sc --> g1
  sc --> bk
  bk --> g2 & g3
  bk -.-> cy
  class a1,a2,a3,a4,a5 k_start
  class p0,p1,p2,p3,p4,p5,bk,nb,cy k_process
  class q1,q2,q3,q4,q5 k_decision
  class t1 k_toast
  class sc k_screen
  class g1,g2,g3 k_goto
  style gBlank fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gLinked fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Verify › Fill in the form

The form on the left of 'Verify a patient'. Add an insurance card, pick a sample, or type the details. 'Check now' stays off until the four required answers look complete.

Route: `/authorizations/eligibility/verify`

Demo only: any file counts as a card. The payer comes from the file name, or Summit if none matches.

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
  s1@{ shape: stadium, label: "Open 'Verify a patient'" }
  sc@{ shape: curv-trap, label: "<b>Verify a patient</b><br/>'The agents check coverage and benefits live, so you know whether the clinic will be paid.'<br/>Card 'The patient and the service' with the pill 'Privacy mode on'" }
  b1@{ shape: trap-t, label: "Click '← Eligibility & Benefits' (back link)" }
  b2@{ shape: trap-t, label: "<b>Click '← Back to referral RF-2040' or '← Back to case R-1042'</b><br/>Shown only when the address names a referral (see 'Ways in and pre-fill')" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › New case › Referral › The full referral page" }
  g0@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › List › What the screen shows" }
  subgraph gSample ["Try a sample"]
  f5@{ shape: trap-t, label: "<b>Click a chip in the row 'Try a sample'</b><br/>'Cleared to bill', 'Coverage lapsed', 'Not found',<br/>'Not covered', 'Another plan pays first', 'Limit reached'" }
  p7@{ shape: rect, label: "<b>Fills the whole form with a made-up member who ends that way</b><br/>The chip turns green. Initials and age are remembered for the result" }
  end
  subgraph gCard ["Add the insurance card"]
  f1@{ shape: lean-r, label: "<b>Drop a file, or click the drop zone</b><br/>'Drag and drop the insurance card, or click to select a file'" }
  f2@{ shape: trap-t, label: "Click 'Use sample file'" }
  f3@{ shape: trap-t, label: "Click 'Use sample card' (top right)" }
  a1@{ shape: hex, label: "<b>Reader reads the card</b><br/>'Reader is reading the card' for about 1 second" }
  p1@{ shape: rect, label: "<b>Fills payer from the file name (else Summit) and a member ID</b><br/>Date of birth stays empty" }
  p2@{ shape: rect, label: "<b>Fills Summit, 'SM7403964821', 03/14/1992, Residential 3.5, 10/21/2026</b><br/>Remembers J.M., 34" }
  t1@{ shape: odd, label: "<b>'Sample card loaded'</b><br/>'Reader filled in the details for J.M., 34. The check can start when you are ready.'" }
  cs@{ shape: curv-trap, label: "<b>Card strip 'Card read just now'</b><br/>'Payer, member ID and plan type are filled in below'" }
  f4@{ shape: trap-t, label: "Click 'Replace'" }
  p3@{ shape: rect, label: "<b>Strip goes, drop zone returns</b><br/>The typed values stay" }
  end
  subgraph gFields ["Type the details"]
  i1@{ shape: lean-r, label: "<b>'Payer' menu: 'Choose a payer', six payers</b><br/>(label reads 'Payer (read from card)' after a card)" }
  i2@{ shape: lean-r, label: "'State': the only choice is 'Ohio'" }
  i3@{ shape: lean-r, label: "<b>'Member ID (removed before analysis)'</b><br/>Hint 'Agents see …4821 only'" }
  i4@{ shape: lean-r, label: "'Date of birth' as MM/DD/YYYY" }
  i5@{ shape: lean-r, label: "'Program': 'Residential 3.5', 'IOP', 'PHP', 'Detox'" }
  i6@{ shape: lean-r, label: "'Date of service' as MM/DD/YYYY, starts as 10/21/2026" }
  end
  q1@{ shape: diam, label: "Payer chosen, member ID has 4 or more letters or digits, both dates shaped MM/DD/YYYY?" }
  p4@{ shape: rect, label: "<b>'Check now' is off</b><br/>Hint 'Add the payer, member ID, date of birth and date of service to check.'" }
  p5@{ shape: rect, label: "Only the shape of a date is checked, not whether it is a real day" }
  p6@{ shape: rect, label: "<b>'Check now' is on</b><br/>Hint 'Takes about 10 seconds. Nothing is changed at the payer or in the record.'" }
  c1@{ shape: trap-t, label: "Click 'Check now'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › The live check" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › Try a sample" }
  s1 --> sc
  sc --> b1 --> g0
  sc --> b2 --> g3
  sc --> f5 --> p7 --> q1
  f5 -.-> g2
  sc --> f1 --> a1
  sc --> f2 --> a1
  a1 --> p1 --> cs
  sc --> f3 --> p2 --> t1 --> cs
  cs --> f4 --> p3
  sc --> i1 --> i2 --> i3 --> i4 --> i5 --> i6 --> q1
  cs --> q1
  p3 --> q1
  q1 -->|"No"| p4 -.-> p5
  p4 --> q1
  q1 -->|"Yes"| p6 --> c1 --> g1
  class s1 k_start
  class sc,cs k_screen
  class b1,b2,f5,f2,f3,f4,c1 k_click
  class g3,g0,g1,g2 k_goto
  class p7,p1,p2,p3,p4,p5,p6 k_process
  class f1,i1,i2,i3,i4,i5,i6 k_input
  class a1 k_agent
  class t1 k_toast
  class q1 k_decision
  style gSample fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCard fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gFields fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Verify › Try a sample

Six chips fill the form with a made-up member who ends in a different answer, so every verdict can be seen without a trick. The last four digits of the member ID script the answer. 'Use sample card' (top right) gives 'Authorization first'.

Route: `/authorizations/eligibility/verify`

Demo only: the endings are scripted. Typing the same ending by hand gives the same answer, on Verify and on the Coverage row in New case.

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
  s1@{ shape: stadium, label: "Open 'Verify a patient'" }
  sc@{ shape: curv-trap, label: "<b>Card 'The patient and the service'</b><br/>Row 'Try a sample' with six chips, then the card drop zone and the fields" }
  q1@{ shape: diam, label: "Click which chip?" }
  subgraph gPick ["What each chip fills in"]
  p1@{ shape: rect, label: "<b>'Cleared to bill'</b><br/>Beacon PPO, IOP, member ending 2468<br/>Beacon asks for no authorization for IOP" }
  p2@{ shape: rect, label: "<b>'Coverage lapsed'</b><br/>Summit Medicaid HMO, Residential 3.5, member ending 1012" }
  p3@{ shape: rect, label: "<b>'Not found'</b><br/>Lakeshore Behavioral, IOP, member ending 9999" }
  p4@{ shape: rect, label: "<b>'Not covered'</b><br/>Beacon PPO, Residential 3.5, member ending 3030" }
  p5@{ shape: rect, label: "<b>'Another plan pays first'</b><br/>Summit Medicaid HMO, IOP, member ending 6060" }
  p6@{ shape: rect, label: "<b>'Limit reached'</b><br/>Cardinal Health Plan, Residential 3.5, member ending 9090" }
  end
  pf@{ shape: rect, label: "<b>Payer, member ID, date of birth, program and date of service are all filled</b><br/>The chip turns green. 'Check now' is on" }
  c1@{ shape: trap-t, label: "Click 'Check now'" }
  ck@{ shape: rect, label: "<b>Live check runs about 10 seconds</b><br/>Chips and fields lock. 'Skip ahead' speeds it up<br/>The member ID ending decides the answer" }
  subgraph gRes ["Result"]
  r1@{ shape: curv-trap, label: "<b>'Cleared to bill: the clinic will be paid.'</b><br/>Green verdict, 'Eligible', benefits 'Covered'<br/>Cost share shown: 'Copay $40 per day, ...'" }
  r2@{ shape: curv-trap, label: "<b>'Fix before billing: coverage lapsed 10/12.'</b><br/>Eligibility 'Needs a fix', 'Effective 01/01/2026, lapsed 10/12/2026'<br/>Button 'Request retro-eligibility'" }
  r3@{ shape: curv-trap, label: "<b>'We could not find coverage.'</b><br/>Eligibility 'Needs a fix', benefits and 'What this service needs' say 'Not checked'<br/>No 'Patient pays' line, no dates" }
  r4@{ shape: curv-trap, label: "<b>'Fix before billing: the service is not covered.'</b><br/>Benefits 'Not covered'<br/>Row 'The service is not covered' in 'Payment checks'" }
  r5@{ shape: curv-trap, label: "<b>'Fix before billing: another plan pays first.'</b><br/>Row 'Another plan pays first', chip 'Other plan', in 'Payment checks'" }
  r6@{ shape: curv-trap, label: "<b>'Fix before billing: every authorized day is used.'</b><br/>Benefits line 'All 14 days used. Nothing left'<br/>Row 'Every authorized day is used', chip 'Limit reached'" }
  end
  sd@{ shape: rect, label: "<b>The list already holds a patient for each reason</b><br/>R-1101 lapsed, R-0975 ended, R-1118 not covered<br/>I-2275 another plan pays first, R-0921 limit reached" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Which verdict and why" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › List › What the screen shows" }
  s1 --> sc --> q1
  q1 -->|"Cleared to bill"| p1 --> pf
  q1 -->|"Coverage lapsed"| p2 --> pf
  q1 -->|"Not found"| p3 --> pf
  q1 -->|"Not covered"| p4 --> pf
  q1 -->|"Another plan pays first"| p5 --> pf
  q1 -->|"Limit reached"| p6 --> pf
  pf --> c1 --> ck
  ck -->|"Ends 2468"| r1
  ck -->|"Ends 1012"| r2
  ck -->|"Ends 9999"| r3
  ck -->|"Ends 3030"| r4
  ck -->|"Ends 6060"| r5
  ck -->|"Ends 9090"| r6
  r1 & r2 & r3 & r4 & r5 & r6 --> g1
  sc -.-> sd --> g2
  class s1 k_start
  class sc,r1,r2,r3,r4,r5,r6 k_screen
  class q1 k_decision
  class p1,p2,p3,p4,p5,p6,pf,ck,sd k_process
  class c1 k_click
  class g1,g2 k_goto
  style gPick fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gRes fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Verify › The live check

What the person sees after 'Check now'. The form locks and the 'Live check' card on the right ticks off one agent at a time, about 10 seconds in all. The questions themselves are in the next diagram.

Route: `/authorizations/eligibility/verify`

Demo only: the waiting is a timer. Nothing is sent to any payer.

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
  s1@{ shape: stadium, label: "Click 'Check now'" }
  p1@{ shape: rect, label: "<b>Form fields, 'Use sample card', the 'Try a sample' chips and the card drop lock</b><br/>The button reads 'Checking' with a spinner" }
  sc@{ shape: curv-trap, label: "<b>Card 'Live check'</b><br/>'Simulated in this demo: each agent asks the right source and reports back'" }
  subgraph gRows ["Agent rows"]
  r1@{ shape: curv-trap, label: "<b>Waiting</b><br/>Agent name, grey text 'Will ask Ohio Medicaid whether coverage is active', clock and 'Waiting', dimmed" }
  r2@{ shape: curv-trap, label: "<b>Checking</b><br/>Agent name, 'Asking Ohio Medicaid whether coverage is active on 10/21/2026', spinner and 'Checking'" }
  r3@{ shape: curv-trap, label: "<b>Done</b><br/>Agent name, the answer, green tick and a small time such as 0:02" }
  end
  tm@{ shape: curv-trap, label: "<b>Timer pill beside the title</b><br/>Shows 0:00 and counts up each second" }
  k1@{ shape: trap-t, label: "Click 'Skip ahead' (shown only while running)" }
  p2@{ shape: rect, label: "Every step still to run takes 0.15 seconds instead of 1.4 to 2.6" }
  q1@{ shape: diam, label: "Last step ticked?" }
  t1@{ shape: odd, label: "Banner 'All answers are in. Opening the result.'" }
  w1@{ shape: delay, label: "Half a second so the last tick is seen" }
  ft@{ shape: curv-trap, label: "<b>Footer line</b><br/>'If a system does not answer, Caller phones the payer and logs the call.'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › The live check: the agents' questions" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › The check finishes and is saved" }
  s1 --> p1 --> sc
  sc --> r1
  r1 --> r2 --> r3
  sc --> tm
  sc --> ft
  sc -.-> g1
  r3 --> q1
  q1 -->|"No"| r1
  q1 -->|"Yes"| t1 --> w1 --> g2
  r2 -.-> k1 --> p2 -.-> r3
  class s1 k_start
  class p1,p2 k_process
  class sc,r1,r2,r3,tm,ft k_screen
  class k1 k_click
  class q1 k_decision
  class t1 k_toast
  class w1 k_wait
  class g1,g2 k_goto
  style gRows fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Verify › The live check: the agents' questions

The five questions, in order, and who answers each. Reader, Verify, Verify, Criteria, Navigator. Caller joins only for Evergreen. The state and the plan are outside parties and are simulated in the demo.

Route: `/authorizations/eligibility/verify`

Demo only: the answers are scripted by the member ID ending (see 'Try a sample'). Before a payer is chosen the card says 'the state' and 'the payer' instead of names.

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
  s1@{ shape: stadium, label: "<b>Live check starts</b><br/>Rows read 'Will read the card and fill in the details' and so on" }
  a1@{ shape: hex, label: "<b>1 Reader</b><br/>'Reading the card and filling in the details'<br/>or 'Taking the member ID and date of birth as typed'" }
  w1@{ shape: delay, label: "About 1.4 seconds" }
  d1@{ shape: rect, label: "<b>Row ticks</b><br/>'Read the card and filled in the details' or 'Took the member ID and date of birth as typed'" }
  a2@{ shape: hex, label: "<b>2 Verify</b><br/>'Asking Ohio Medicaid whether coverage is active on 10/21/2026'" }
  x2@{ shape: st-rect, label: "<b>Ohio Medicaid, or the plan for Beacon, Harborview, Lakeshore</b><br/>Real step: eligibility inquiry (demo: simulated)" }
  w2@{ shape: delay, label: "About 2.4 seconds" }
  d2@{ shape: rect, label: "<b>Row ticks</b><br/>'Asked Ohio Medicaid: coverage is active on 10/21/2026'<br/>or 'coverage lapsed 10/12' or 'no coverage found for these details'<br/>Ending 6060 adds '. Another plan pays first'" }
  a3@{ shape: hex, label: "<b>3 Verify</b><br/>'Asking Summit what Residential 3.5 covers'" }
  x3@{ shape: st-rect, label: "<b>The plan answers for the service codes</b><br/>Real step: benefit detail (demo: simulated)" }
  w3@{ shape: delay, label: "About 2.6 seconds" }
  d3@{ shape: rect, label: "<b>Row ticks</b><br/>'Summit covers Residential 3.5 (H0018 and H0019)'<br/>Ending 3030 'Summit does not cover Residential 3.5'<br/>Ending 9090 adds '. All 14 days are used'<br/>No coverage found: 'Not asked: no coverage was found'" }
  q1@{ shape: diam, label: "Is the payer Evergreen?" }
  a4@{ shape: hex, label: "<b>Caller</b><br/>'Evergreen did not answer online. Caller is phoning'" }
  a5@{ shape: hex, label: "<b>4 Criteria</b><br/>'Checking whether an authorization is required'" }
  w5@{ shape: delay, label: "About 1.6 seconds" }
  d5@{ shape: rect, label: "<b>Row ticks</b><br/>'An authorization is required before the first day'<br/>or 'Beacon does not require an authorization'<br/>or 'An authorization is on file with Cardinal' (ending 9090)<br/>No coverage found: 'Not asked: no coverage was found'" }
  a6@{ shape: hex, label: "<b>5 Navigator</b><br/>'Checking that the clinic is enrolled to bill Summit'" }
  w6@{ shape: delay, label: "About 1.8 seconds" }
  d6@{ shape: rect, label: "<b>Row ticks</b><br/>'The clinic is enrolled and in network'<br/>or 'The clinic is not enrolled for this program'<br/>No coverage found: 'Not asked: no coverage was found'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › When a system does not answer" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › The check finishes and is saved" }
  s1 --> a1
  a1 --> w1 --> d1
  d1 --> a2
  a2 --> x2 --> d2
  a2 --> w2 --> d2
  d2 --> a3
  a3 --> x3 --> d3
  a3 --> w3 --> d3
  d3 --> q1
  q1 -->|"No"| a5
  q1 -->|"Yes"| a4 --> a5
  a4 -.-> g1
  a5 --> w5 --> d5 --> a6
  a6 --> w6 --> d6 --> g2
  class s1 k_start
  class a1,a2,a3,a4,a5,a6 k_agent
  class w1,w2,w3,w5,w6 k_wait
  class d1,d2,d3,d5,d6 k_process
  class x2,x3 k_ext
  class q1 k_decision
  class g1,g2 k_goto
```

## Authorizations › Eligibility & Benefits › Verify › When a system does not answer

In real life a payer's system can be down, slow or silent. The demo shows one fallback only: for Evergreen, Caller phones the payer. It has no error screen, no retry button and no failed check. Bad answers become a 'Fix before billing' result.

Route: `/authorizations/eligibility/verify`

Demo only: the retry ladder on the right is how production works (from the product requirements). None of it is drawn on screen.

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
  s1@{ shape: stadium, label: "Verify reaches the benefits question for the chosen payer" }
  subgraph gDemo ["In the demo"]
  d1@{ shape: diam, label: "Is the payer Evergreen?" }
  p1@{ shape: rect, label: "<b>Benefits row ticks</b><br/>'Evergreen's system did not answer'" }
  a1@{ shape: hex, label: "<b>Caller</b><br/>'Evergreen did not answer online. Caller is phoning'" }
  w1@{ shape: delay, label: "About 2.6 seconds" }
  p2@{ shape: rect, label: "Row ticks 'Caller phoned Evergreen, confirmed the answers and logged the call'" }
  p3@{ shape: rect, label: "<b>Result lists the call under 'What the agents checked'</b><br/>'Phone call to Evergreen' 1:34, reference C-4471" }
  p4@{ shape: rect, label: "<b>Every other payer</b><br/>The plan answers at once and the check goes on" }
  end
  subgraph gReal ["Production, simulated here"]
  r1@{ shape: st-rect, label: "Clearinghouse 270/271 inquiry for the plan and the service types" }
  r2@{ shape: diam, label: "Payer answers with the benefit detail?" }
  r3@{ shape: delay, label: "Payer unable to respond: retry after 30 minutes, then 2 hours" }
  r4@{ shape: st-rect, label: "Verify checks the payer portal with the clinic's saved sign-in" }
  r5@{ shape: diam, label: "Portal answers?" }
  r6@{ shape: hex, label: "<b>Caller phones provider services</b><br/>Call logged with a transcript and a result" }
  r7@{ shape: rect, label: "<b>Row marked as old, not as lapsed</b><br/>No alert until the third failure" }
  r8@{ shape: rect, label: "Answer read, the check goes on" }
  end
  subgraph gBad ["When the answer is bad, not missing"]
  b1@{ shape: diam, label: "What did the checks find?" }
  b2@{ shape: rect, label: "<b>Member ID ends 1012</b><br/>'coverage lapsed 10/12'" }
  b3@{ shape: rect, label: "<b>Member ID ends 9999</b><br/>'no coverage found for these details'" }
  b4@{ shape: rect, label: "<b>Evergreen with Detox</b><br/>'The clinic is not enrolled for this program'" }
  b6@{ shape: rect, label: "<b>Member ID ends 3030</b><br/>'does not cover Residential 3.5'" }
  b7@{ shape: rect, label: "<b>Member ID ends 6060</b><br/>'Another plan pays first'" }
  b8@{ shape: rect, label: "<b>Member ID ends 9090</b><br/>'All 14 days are used'" }
  b5@{ shape: rect, label: "<b>The check still runs to the end and opens a result</b><br/>Verdict 'Fix before billing'" }
  end
  s2@{ shape: stadium, label: "<b>While the check runs, leave the page</b><br/>(sidebar, back link or browser Back)" }
  e1@{ shape: stadium, label: "<b>The check is dropped</b><br/>Nothing is saved: no row, no badge change<br/>Open 'Verify a patient' and start again" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Next actions" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › The check finishes and is saved" }
  s1 --> d1
  d1 -->|"Yes"| p1 --> a1 --> w1 --> p2 --> p3 --> b1
  d1 -->|"No"| p4 --> b1
  b1 -->|"All clear"| g2
  b1 -->|"Lapsed"| b2 --> b5
  b1 -->|"Not found"| b3 --> b5
  b1 -->|"Not enrolled"| b4 --> b5
  b1 -->|"Not covered"| b6 --> b5
  b1 -->|"Other plan"| b7 --> b5
  b1 -->|"Limit reached"| b8 --> b5
  b5 --> g1
  s1 -.-> r1
  r1 --> r2
  r2 -->|"Yes"| r8
  r2 -->|"No"| r3 --> r4 --> r5
  r3 -.-> r7
  r5 -->|"Yes"| r8
  r5 -->|"No"| r6 --> r8
  s2 --> e1
  class s1,s2 k_start
  class d1,r2,r5,b1 k_decision
  class p1,p2,p3,p4,r7,r8,b2,b3,b4,b6,b7,b8,b5 k_process
  class a1,r6 k_agent
  class w1,r3 k_wait
  class r1,r4 k_ext
  class e1 k_endx
  class g1,g2 k_goto
  style gDemo fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gReal fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gBad fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Verify › The check finishes and is saved

When the last step ticks, the demo either refreshes a patient that is already on the list or adds a new row, then opens the result. New rows get scripted answers so the demo is predictable.

Route: `/authorizations/eligibility/verify`

Demo only: answers are scripted from the member ID and the plan. A known patient keeps the verdict it already had.

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
  s1@{ shape: stadium, label: "Last step ticks, banner 'All answers are in. Opening the result.'" }
  w1@{ shape: delay, label: "Half a second" }
  q1@{ shape: diam, label: "Opened from a case that is a row on the list?" }
  q2@{ shape: diam, label: "Sample card: Summit, Residential 3.5, member ID ending 4821?" }
  st1@{ shape: cyl, label: "<b>Existing row updated</b><br/>'Checked just now', its re-check time cleared, date of service as typed" }
  p1@{ shape: rect, label: "The sample card matches J.M., case R-1042" }
  p2@{ shape: rect, label: "<b>Answers are not asked again</b><br/>The row keeps its verdict" }
  subgraph gNew ["A new patient"]
  n1@{ shape: rect, label: "<b>Row gets the next ID: V-1001, V-1002 ...</b><br/>Initials and age only if known from a referral or a case" }
  n2@{ shape: rect, label: "<b>Member ID kept as '…1234' (last four)</b><br/>Scripted answers from the member ID and plan" }
  n3@{ shape: diam, label: "Which scripted answer?" }
  n4@{ shape: rect, label: "<b>ID ends 1012</b><br/>Eligibility 'Lapsed 10/12'" }
  n5@{ shape: rect, label: "<b>ID ends 9999</b><br/>Eligibility 'Not found'" }
  n6@{ shape: rect, label: "<b>Evergreen with Detox</b><br/>Clinic not enrolled" }
  n7@{ shape: rect, label: "<b>Beacon with IOP or PHP</b><br/>Authorization 'Not required'" }
  n8@{ shape: rect, label: "<b>Harborview with PHP</b><br/>Benefits 'Limited'" }
  n10@{ shape: rect, label: "<b>ID ends 3030</b><br/>Benefits 'Not covered', authorization 'Not required'" }
  n11@{ shape: rect, label: "<b>ID ends 6060</b><br/>Another plan found: it pays first" }
  n12@{ shape: rect, label: "<b>ID ends 9090</b><br/>Authorization 'On file' with every day or unit used<br/>for example '14 of 14 days'" }
  n9@{ shape: rect, label: "<b>Anything else</b><br/>Active, covered, authorization 'Required'" }
  st2@{ shape: cyl, label: "New row added at the top of the Eligibility list" }
  end
  p3@{ shape: rect, label: "List counts, tiles and sidebar badge recompute from the rows" }
  p7@{ shape: rect, label: "<b>Counts, tiles and badge stay as they were</b><br/>Only the check time and date of service changed" }
  q3@{ shape: diam, label: "Is the verdict 'Cleared to bill'?" }
  p4@{ shape: rect, label: "Badge unchanged" }
  p5@{ shape: rect, label: "Badge goes up by one" }
  p6@{ shape: rect, label: "<b>Opens /authorizations/eligibility/V-1001</b><br/>or the existing case ID<br/>If the check began from a referral, ?referral= (and ?case=) go along, so the result has its back link" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › What the page shows" }
  s1 --> w1 --> q1
  q1 -->|"Yes"| st1
  q1 -->|"No"| q2
  q2 -->|"Yes"| p1 --> st1
  q2 -->|"No"| n1 --> n2 --> n3
  st1 --> p2 --> p7 --> p6
  n3 -->|"Lapsed"| n4 --> st2
  n3 -->|"Not found"| n5 --> st2
  n3 -->|"Not enrolled"| n6 --> st2
  n3 -->|"No authorization"| n7 --> st2
  n3 -->|"Limited"| n8 --> st2
  n3 -->|"Not covered"| n10 --> st2
  n3 -->|"Other plan"| n11 --> st2
  n3 -->|"Limit reached"| n12 --> st2
  n3 -->|"Otherwise"| n9 --> st2
  st2 --> p3
  p3 --> q3
  q3 -->|"Yes"| p4 --> p6
  q3 -->|"No"| p5 --> p6
  p6 --> g1
  class s1 k_start
  class w1 k_wait
  class q1,q2,n3,q3 k_decision
  class st1,st2 k_store
  class p1,p2,n1,n2,n4,n5,n6,n7,n8,n10,n11,n12,n9,p3,p7,p4,p5,p6 k_process
  class g1 k_goto
  style gNew fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Result › What the page shows

One result, result first. A single summary card holds the verdict with its buttons, then Eligibility, Benefits and What this service needs, then one facts line and one plain note. The seven payment checks and the agents' answers are two closed sections below it. Reached by a row on the list, or when a live check finishes. When the check began from a referral, a link leads back to it.

Route: `/authorizations/eligibility/R-1042`

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
  s1@{ shape: stadium, label: "Click a row on the list, or a live check finishes" }
  sc@{ shape: curv-trap, label: "<b>Eligibility & Benefits</b><br/>Title is the headline, for example 'Covered, but you need an authorization first.'<br/>Sub 'R-1042 · J.M., 34 · Residential 3.5'" }
  b1@{ shape: trap-t, label: "Click '← Eligibility & Benefits' (back link, top left)" }
  g0@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › List › What the screen shows" }
  b2@{ shape: trap-t, label: "<b>Click '← Back to referral RF-2040' beside it</b><br/>With ?case= in the address it reads '← Back to case R-1042'<br/>Shown only when ?referral= names a referral that exists" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › New case › Referral › The full referral page" }
  subgraph gSum ["Summary card (one card, nothing else above the closed sections)"]
  vb@{ shape: curv-trap, label: "<b>Top band, green, amber or red</b><br/>Small caps 'Verdict'<br/>Big words: 'Cleared to bill', 'Authorization first' or 'Fix before billing'<br/>One sentence why" }
  bt@{ shape: curv-trap, label: "<b>Buttons on the band</b><br/>'Start authorization', 'Open case', 'Request retro-eligibility' ... 'Check again'<br/>They wrap under the words on a narrow screen" }
  three@{ shape: curv-trap, label: "<b>Three parts side by side (stacked on a narrow screen)</b><br/>'Eligibility', 'Benefits', 'What this service needs'" }
  facts@{ shape: curv-trap, label: "<b>One facts line</b><br/>Payer, plan type and routing, member (masked), date of service,<br/>time checked, source 'Simulated check against the payer portal'" }
  note@{ shape: curv-trap, label: "<b>One small plain note, not a banner</b><br/>'Active coverage does not mean this service is covered. Check the benefits and the authorization requirement.'" }
  end
  t1@{ shape: odd, label: "<b>Banner 'Not re-checked: Verify is paused in Settings'</b><br/>'The re-check was due Tue 11:32 am. It runs as soon as Verify is resumed.'<br/>The only banner on the page, and only when it applies" }
  subgraph gPay ["Closed section 'Payment checks'"]
  pc@{ shape: curv-trap, label: "<b>Button with aria-expanded</b><br/>'6 of 7 pass, 1 needs a look. Every line has to pass for the clinic to be reimbursed.'<br/>Opens to seven rows, one chip each<br/>Coverage not found: the first row and one grey row 'Nothing else could be checked'" }
  pk@{ shape: trap-t, label: "Click 'Payment checks'" }
  end
  subgraph gAg ["Closed section 'How this was checked'"]
  ag@{ shape: curv-trap, label: "<b>Button with aria-expanded</b><br/>'Verify, Criteria, Navigator, 0:12 in all. Next check: Coverage again on 11/01, then every month'" }
  ak@{ shape: trap-t, label: "Click 'How this was checked'" }
  ar@{ shape: curv-trap, label: "<b>One row per agent</b><br/>Verify 'Eligibility with Ohio Medicaid' 0:03, Verify 'Benefits with Summit' 0:05<br/>Criteria 'Authorization rule' 0:02, Navigator 'Provider enrollment' 0:02<br/>Then the list of next checks" }
  p3@{ shape: rect, label: "<b>Evergreen adds a row 'Phone call to Evergreen' 1:34</b><br/>Coverage not found: only the row 'Eligibility with ...' (the others were not asked)" }
  k1@{ shape: trap-t, label: "Click an agent row" }
  q2@{ shape: diam, label: "Was that row already open?" }
  p4@{ shape: rect, label: "Row closes" }
  p5@{ shape: rect, label: "<b>Its answer opens under it, for example 'Coverage active, effective 01/01/2026, no end date'</b><br/>Any other open row closes" }
  p6@{ shape: rect, label: "<b>Next checks</b><br/>'Coverage again on 11/01, then every month'<br/>'Before each recertification'<br/>'3 days before the first claim'<br/>A row with a re-check to come starts with 'Re-check due Tue 11:32 am, done by Verify on its own'<br/>Coverage not found: 'Check again once the member ID or date of birth is fixed'" }
  end
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Which verdict and why" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Payment checks: coverage, plan, service" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Next actions" }
  g5@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Result first: eligibility, benefits, what the service needs" }
  g6@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Plan type and routing" }
  s1 --> sc
  sc --> b1 --> g0
  sc --> b2 --> g4
  sc --> vb --> bt
  vb -.-> g1
  bt --> g3
  vb --> three --> facts --> note
  three -.-> g5
  facts -.-> g6
  sc -.-> t1
  sc --> pc --> pk --> g2
  sc --> ag --> ak --> ar --> p3
  ar --> k1 --> q2
  q2 -->|"Yes"| p4
  q2 -->|"No"| p5
  ar --> p6
  class s1 k_start
  class sc,vb,bt,three,facts,note,pc,ag,ar k_screen
  class b1,b2,pk,ak,k1 k_click
  class g0,g4,g1,g2,g3,g5,g6 k_goto
  class t1 k_toast
  class p3,p4,p5,p6 k_process
  class q2 k_decision
  style gSum fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gPay fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gAg fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Result › Which verdict and why

The verdict is worked out from the patient's row, top question first. Any failed question gives 'Fix before billing'. If all pass, a missing authorization gives 'Authorization first'. Otherwise 'Cleared to bill'. The verdict is the top band of the summary card; Eligibility, Benefits and What this service needs sit under it.

Route: `/authorizations/eligibility/R-1042`

Demo only: every failure has a seeded patient on the list (R-1101, R-0975, R-1118, I-2275, R-0921) and a chip under 'Try a sample' on Verify.

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
  s1@{ shape: stadium, label: "A result opens for a patient" }
  q1@{ shape: diam, label: "Coverage active on the service date?" }
  q2@{ shape: diam, label: "Service covered by the plan?" }
  q3@{ shape: diam, label: "Clinic enrolled and in network?" }
  q4@{ shape: diam, label: "Every day or unit limit still has room?" }
  q5@{ shape: diam, label: "Another plan pays first?" }
  q6@{ shape: diam, label: "<b>Authorization needed but not approved?</b><br/>(required, in progress, under review, retro request open)" }
  subgraph gFix ["Fix before billing (red)"]
  f0@{ shape: curv-trap, label: "Verdict 'Fix before billing'" }
  f1@{ shape: rect, label: "<b>Coverage lapsed or ended</b><br/>Headline 'Fix before billing: coverage lapsed 10/12.'" }
  f2@{ shape: rect, label: "<b>Coverage not found</b><br/>Headline 'We could not find coverage.'<br/>Nothing else is checked and no payment line is shown" }
  f3@{ shape: rect, label: "<b>Clinic not enrolled</b><br/>Headline 'Fix before billing: the clinic cannot bill yet.'" }
  f4@{ shape: rect, label: "<b>Service not covered</b><br/>Headline 'Fix before billing: the service is not covered.'" }
  f6@{ shape: rect, label: "<b>Another plan pays first</b><br/>Headline 'Fix before billing: another plan pays first.'" }
  f7@{ shape: rect, label: "<b>Limit reached</b><br/>Headline 'Fix before billing: every authorized day is used.'<br/>(or unit, for IOP)" }
  f5@{ shape: rect, label: "Reason sentence is the detail of the first failed check" }
  end
  subgraph gAuth ["Authorization first (amber)"]
  a0@{ shape: curv-trap, label: "Verdict 'Authorization first'" }
  a1@{ shape: odd, label: "<b>Headline 'Covered, but you need an authorization first.'</b><br/>'Everything checks out except the authorization. Billing is safe as soon as Summit approves.'" }
  end
  subgraph gOk ["Cleared to bill (green)"]
  o0@{ shape: curv-trap, label: "Verdict 'Cleared to bill'" }
  o1@{ shape: odd, label: "<b>Headline 'Cleared to bill: the clinic will be paid.'</b><br/>'Coverage, benefits, authorization and enrollment all check out. The clinic can bill Summit for Residential 3.5 on 10/21/2026.'" }
  end
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Next actions" }
  s1 --> q1
  q1 -->|"No: lapsed, ended"| f1 --> f0
  q1 -->|"No: not found"| f2 --> f0
  q1 -->|"Yes"| q2
  q2 -->|"No"| f4 --> f0
  q2 -->|"Yes"| q3
  q3 -->|"No"| f3 --> f0
  q3 -->|"Yes"| q4
  q4 -->|"No"| f7 --> f0
  q4 -->|"Yes"| q5
  q5 -->|"Yes"| f6 --> f0
  q5 -->|"No"| q6
  q6 -->|"Yes"| a0 --> a1 --> g1
  q6 -->|"No"| o0 --> o1 --> g1
  f0 --> f5 --> g1
  class s1 k_start
  class q1,q2,q3,q4,q5,q6 k_decision
  class f0,a0,o0 k_screen
  class f1,f2,f3,f4,f6,f7,f5 k_process
  class a1,o1 k_toast
  class g1 k_goto
  style gFix fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gAuth fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gOk fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Result › Payment checks: coverage, plan, service

The first three of the seven rows in the closed section 'Payment checks' (click it to open). Each row has a title, one line of detail and a coloured chip. If coverage is not found, the other six rows give way to one grey row, 'Nothing else could be checked'. The summary card above already says eligible, covered and what the service needs.

Route: `/authorizations/eligibility/R-1042`

Demo only: 'The service is not covered' has a seeded patient (R-1118, Beacon PPO) and a chip under 'Try a sample' on Verify.

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
  s1@{ shape: stadium, label: "Result page, section 'Payment checks' opened" }
  subgraph gA ["Row 1 · Coverage"]
  a0@{ shape: diam, label: "What did the state or plan say about the date of service?" }
  a1@{ shape: rect, label: "<b>Title 'Coverage is active on the service date'</b><br/>Chip 'Active' (green)<br/>'Ohio Medicaid, active since 01/01/2026 with no end date'" }
  a2@{ shape: rect, label: "<b>Title 'Coverage is not active on the service date'</b><br/>Chip 'Lapsed 10/12' (red)<br/>'Days after that are not payable until eligibility is restored. A retro-eligibility request can cover the gap.'" }
  a3@{ shape: rect, label: "<b>Title 'Coverage is not active on the service date'</b><br/>Chip 'Ended 09/30' (red)<br/>'The patient may have a new plan, so ask the payer.'" }
  a4@{ shape: rect, label: "<b>Title 'Coverage was not found'</b><br/>Chip 'Not found' (red)<br/>'Check the member ID and date of birth, or read the card again.'" }
  end
  g0@{ shape: rect, label: "<b>Rows 2 to 7 are replaced by one grey row</b><br/>'Nothing else could be checked', chip 'Not checked'<br/>'Fix the member ID or date of birth, then check again.'<br/>No cost line either" }
  subgraph gB ["Row 2 · The plan"]
  b0@{ shape: diam, label: "Which kind of plan?" }
  b1@{ shape: rect, label: "<b>Title 'It is the right plan', chip 'Summit' (green)</b><br/>'Managed by Summit Medicaid HMO. Claims go to Summit, not to the state'<br/>Same source as the facts line: Result › Plan type and routing" }
  b2@{ shape: rect, label: "<b>Chip 'Harborview' (green)</b><br/>'A Medicare Advantage plan. Claims go to Harborview MA, not to Medicare'" }
  b3@{ shape: rect, label: "<b>Chip 'Lakeshore' (green)</b><br/>'Behavioral health is carved out to Lakeshore Behavioral. Claims go to Lakeshore, not to the medical plan'" }
  b4@{ shape: rect, label: "<b>Chip 'Beacon' (green)</b><br/>'Claims go to Beacon PPO'" }
  end
  subgraph gC ["Row 3 · The service"]
  c0@{ shape: diam, label: "What do the benefits say for this level of care?" }
  c1@{ shape: rect, label: "<b>Title 'The service is covered'</b><br/>Chip 'Covered' (green)<br/>'Residential 3.5 is payable for substance use disorder (F10.20 on the chart). Codes H0018 and H0019'" }
  c2@{ shape: rect, label: "<b>Title 'The service is covered with conditions'</b><br/>Chip 'Limited' (amber)<br/>'The diagnosis must be on the plan's list and each day needs an authorization.'" }
  c3@{ shape: rect, label: "<b>Title 'The service is not covered'</b><br/>Chip 'Not covered' (red)<br/>'Ask Beacon which program it pays for.'<br/>The verdict is 'Fix before billing'" }
  c4@{ shape: rect, label: "<b>Codes by level of care</b><br/>Residential 3.5 H0018 and H0019 · IOP H0015 · PHP H0035 · Detox H0010 and H0011" }
  end
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Payment checks: authorization to other insurance" }
  s1 --> a0
  a0 -->|"Active"| a1 --> b0
  a0 -->|"Lapsed"| a2 --> b0
  a0 -->|"Ended"| a3 --> b0
  a0 -->|"Not found"| a4 --> g0
  b0 -->|"Ohio Medicaid plans"| b1 --> c0
  b0 -->|"Medicare Advantage"| b2 --> c0
  b0 -->|"Behavioral carve-out"| b3 --> c0
  b0 -->|"Commercial"| b4 --> c0
  c0 -->|"Covered"| c1 --> c4
  c0 -->|"Harborview PHP"| c2 --> c4
  c0 -->|"Not covered"| c3 --> c4
  c4 --> g1
  g0 -.-> g1
  class s1 k_start
  class a0,b0,c0 k_decision
  class a1,a2,a3,a4,g0,b1,b2,b3,b4,c1,c2,c3,c4 k_process
  class g1 k_goto
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gC fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Result › Payment checks: authorization to other insurance

Rows 4 to 7 of 'Payment checks' (the closed section on the result page), then, where this list is shown in the New case drawer, a last line about what the patient pays. On the result page the cost share is under Benefits in the summary instead. Authorization is the only row that can turn the verdict amber. The others turn it red.

Route: `/authorizations/eligibility/R-1042`

Demo only: 'Limit reached' has a seeded patient (R-0921) and 'Another plan pays first' has one (I-2275). Both have a chip under 'Try a sample' on Verify.

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
  s1@{ shape: stadium, label: "Result page, section 'Payment checks' opened, rows 4 to 7" }
  q9@{ shape: diam, label: "Was coverage found?" }
  x9@{ shape: stadium, label: "<b>Coverage not found</b><br/>Rows 2 to 7 and any cost line are not shown<br/>One grey row says nothing else could be checked" }
  subgraph gA ["Row 4 · Authorization"]
  a0@{ shape: diam, label: "What is the authorization state?" }
  a1@{ shape: rect, label: "<b>Chip 'Not required' (green)</b><br/>'Beacon does not require one for IOP.'" }
  a2@{ shape: rect, label: "<b>Chip 'On file' (green)</b><br/>'On file with Summit. 9 of 14 days used'" }
  a3@{ shape: rect, label: "<b>Chip 'Required' (amber)</b><br/>'Required before the first day. Not on file yet. A request is being drafted'" }
  a4@{ shape: rect, label: "<b>Chip 'Under review' (amber)</b><br/>'Required. A request is with Cardinal and under review'" }
  a5@{ shape: rect, label: "<b>Chip 'Retro request open' (amber)</b><br/>'A retro-authorization request is open. It covers days already delivered'" }
  a6@{ shape: rect, label: "<b>Chip 'Required' (amber)</b><br/>'Required before the first day. Not on file yet. Start an authorization'" }
  end
  subgraph gB ["Row 5 · Can the clinic bill?"]
  b0@{ shape: diam, label: "Is the clinic enrolled with this payer for this level of care?" }
  b1@{ shape: rect, label: "<b>Title 'The clinic can bill', chip 'In network' (green)</b><br/>'The clinic is enrolled and in network with Summit for residential 3.5'" }
  b2@{ shape: rect, label: "<b>Title 'The clinic cannot bill yet', chip 'Not enrolled' (red)</b><br/>'Claims would be rejected. Navigator can start the enrollment.'" }
  end
  subgraph gC ["Row 6 · Limits"]
  c0@{ shape: diam, label: "Is there a day or unit limit?" }
  c1@{ shape: rect, label: "<b>Chip '5 days left' (green), or amber at 3 or fewer</b><br/>'9 of 14 days used in this authorization period'" }
  c2@{ shape: rect, label: "<b>Title 'Every authorized day is used' (or unit)</b><br/>Chip 'Limit reached' (red)<br/>'14 of 14 days used in this authorization period. Nothing is left. Ask Cardinal for more days before the next day of service'" }
  c3@{ shape: rect, label: "<b>Chip 'No limit' (green)</b><br/>'No annual day limit for residential care. The authorization sets the days'<br/>or 'No visit or day limit applies to this program'" }
  end
  subgraph gD ["Row 7 · Other insurance"]
  d0@{ shape: diam, label: "Did the check find another plan?" }
  d1@{ shape: rect, label: "<b>Title 'No other insurance', chip 'None' (green)</b><br/>'None found. Medicaid pays last, so we checked for another payer'" }
  d2@{ shape: rect, label: "<b>Title 'Another plan pays first', chip 'Other plan' (red)</b><br/>'A second plan was found. It must be billed before this one.'" }
  end
  subgraph gP ["Last line (New case drawer only; the result page shows it under Benefits)"]
  p0@{ shape: diam, label: "Does the plan type have a cost share on file?" }
  p1@{ shape: rect, label: "<b>'What the patient pays:'</b><br/>Harborview 'Deductible $85 left, coinsurance 20%.'<br/>Beacon and Lakeshore 'Copay $40 per day, deductible $350 left, coinsurance 20% after the deductible.'" }
  p2@{ shape: odd, label: "'This does not change what the clinic is paid.'" }
  p3@{ shape: rect, label: "<b>Ohio Medicaid: no line at all</b><br/>No '$0 copay' text, because members usually pay none" }
  end
  g1@{ shape: subproc, label: "Continues in: Authorizations › New case › Medical records › Patient and insurance rows" }
  s1 --> q9
  q9 -->|"No"| x9
  q9 -->|"Yes"| a0
  a0 -->|"Not required"| a1 --> b0
  a0 -->|"On file"| a2 --> b0
  a0 -->|"Being drafted"| a3 --> b0
  a0 -->|"With the payer"| a4 --> b0
  a0 -->|"Retro request"| a5 --> b0
  a0 -->|"Required, not started"| a6 --> b0
  b0 -->|"Yes"| b1 --> c0
  b0 -->|"No"| b2 --> c0
  c0 -->|"Limit, room left"| c1 --> d0
  c0 -->|"Limit, none left"| c2 --> d0
  c0 -->|"No limit"| c3 --> d0
  d0 -->|"No"| d1 --> p0
  d0 -->|"Yes"| d2 --> p0
  p0 -->|"Yes"| p1 --> p2 --> g1
  p0 -->|"No"| p3 --> g1
  class s1 k_start
  class q9,a0,b0,c0,d0,p0 k_decision
  class x9 k_endx
  class a1,a2,a3,a4,a5,a6,b1,b2,c1,c2,c3,d1,d2,p1,p3 k_process
  class p2 k_toast
  class g1 k_goto
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gC fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gD fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gP fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Result › What each chip means

The coloured chips in the list columns and in the 'Payment checks' rows. Green is fine, amber needs a step, red blocks billing, grey is neutral. A chip always carries a word, never colour alone.

Route: `/authorizations/eligibility`

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
  s1@{ shape: stadium, label: "A coloured chip on the list or the result page" }
  subgraph gE ["Column 'Eligibility'"]
  e0@{ shape: curv-trap, label: "'Eligibility' chip" }
  e1@{ shape: rect, label: "<b>'Active' (green)</b><br/>The state or plan says coverage is on for the date of service" }
  e2@{ shape: rect, label: "<b>'Lapsed 10/12' (red)</b><br/>Coverage dropped on that date. Later days are not payable until it is restored" }
  e3@{ shape: rect, label: "<b>'Ended 09/30' (red)</b><br/>Coverage ended. The patient may have a new plan: ask the payer" }
  e4@{ shape: rect, label: "<b>'Not found' (red)</b><br/>No member matched the ID and date of birth" }
  end
  subgraph gB ["Column 'Benefits'"]
  b0@{ shape: curv-trap, label: "'Benefits' chip" }
  b1@{ shape: rect, label: "<b>'Covered' (green)</b><br/>The plan pays for this level of care" }
  b2@{ shape: rect, label: "<b>'Limited' (amber)</b><br/>Paid with conditions: diagnosis on the plan's list, each day authorized" }
  b3@{ shape: rect, label: "<b>'Not covered' (red)</b><br/>The plan does not pay for this level of care<br/>For example R-1118" }
  end
  subgraph gA ["Column 'Authorization'"]
  a0@{ shape: curv-trap, label: "'Authorization' chip (the day or unit usage is on the quiet second line of the row)" }
  a1@{ shape: rect, label: "<b>'Not required' (grey)</b><br/>The payer needs none for this level of care" }
  a2@{ shape: rect, label: "<b>'On file' (green)</b><br/>Approved. Days or units used so far, such as '9 of 14 days', are on the second line" }
  a3@{ shape: rect, label: "<b>'In progress' (grey)</b><br/>A request is being drafted" }
  a4@{ shape: rect, label: "<b>'Payer reviewing' (grey)</b><br/>A request is with the payer" }
  a5@{ shape: rect, label: "<b>'Retro request open' (amber)</b><br/>A request for days already delivered is open" }
  a6@{ shape: rect, label: "<b>'Required, not on file' (amber)</b><br/>Needed before the first day. Not started" }
  end
  subgraph gV ["Column 'Verdict'"]
  v0@{ shape: curv-trap, label: "'Verdict' chip, with 'Checked 3 h ago' on the quiet second line" }
  v1@{ shape: rect, label: "<b>'Cleared to bill' (green)</b><br/>Everything passes" }
  v2@{ shape: rect, label: "<b>'Authorization first' (amber)</b><br/>Only the authorization is missing" }
  v3@{ shape: rect, label: "<b>'Fix before billing' (red)</b><br/>Coverage, plan, network, another plan or a limit failed" }
  v4@{ shape: rect, label: "<b>Second line: 'Checked 3 h ago' or 'Checking now'</b><br/>Time since the last check, or a re-check running<br/>'Re-check due Tue 11:32 am': Verify will run it<br/>'Re-checked automatically at 11:32 am': it did<br/>'Not re-checked: Verify is paused in Settings'" }
  end
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Which verdict and why" }
  s1 --> e0 & b0 & a0 & v0
  e0 --> e1 & e2 & e3 & e4
  b0 --> b1 & b2 & b3
  a0 --> a1 & a2 & a3 & a4 & a5 & a6
  v0 --> v1 & v2 & v3 & v4
  v1 & v2 & v3 --> g1
  class s1 k_start
  class e0,b0,a0,v0 k_screen
  class e1,e2,e3,e4,b1,b2,b3,a1,a2,a3,a4,a5,a6,v1,v2,v3,v4 k_process
  class g1 k_goto
  style gE fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gA fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gV fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Result › Next actions

The buttons on the verdict band at the top of the summary card, and where each one leads. Which buttons show depends on the verdict, on whether the patient has a case, and on why coverage failed.

Route: `/authorizations/eligibility/R-1042`

Demo only: 'Request retro-eligibility' and 'Ask Caller to phone the payer' raise a message and change nothing. No call is made and no request is sent.

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
  s1@{ shape: stadium, label: "On a result page, read the buttons on the verdict band" }
  q1@{ shape: diam, label: "Verdict is 'Authorization first'?" }
  c1@{ shape: trap-t, label: "Click 'Start authorization'" }
  p1@{ shape: rect, label: "<b>Opens New case with payer, level of care, member ID, initials and age filled in</b><br/>Request type is 'Admission'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › New case › Medical records › The checklist and Continue" }
  q2@{ shape: diam, label: "Is there a request with this ID?" }
  c2@{ shape: trap-t, label: "<b>Click 'Open case'</b><br/>(dark button, or outlined beside 'Start authorization')" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  q3@{ shape: diam, label: "ID starts with 'V-' (a new check, no case yet)?" }
  c3@{ shape: trap-t, label: "Click 'Open in Case Manager'" }
  g3@{ shape: subproc, label: "Continues in: Case Manager" }
  n1@{ shape: rect, label: "No 'Start authorization' button" }
  p2@{ shape: rect, label: "<b>No case button is shown</b><br/>The check has no case yet" }
  q4@{ shape: diam, label: "What is the coverage state?" }
  c4@{ shape: trap-t, label: "Click 'Request retro-eligibility'" }
  t1@{ shape: odd, label: "<b>'Retro-eligibility requested'</b><br/>'Navigator will ask Ohio Medicaid to restore coverage from 10/12. You will be told when it answers.'" }
  x1@{ shape: st-rect, label: "<b>Ohio Medicaid restores the dates</b><br/>(demo: simulated, nothing is sent)" }
  c5@{ shape: trap-t, label: "Click 'Ask Caller to phone the payer'" }
  t2@{ shape: odd, label: "<b>'Caller will phone the payer'</b><br/>'Caller will ask Evergreen about this member and log the call to the case.'" }
  x2@{ shape: st-rect, label: "<b>The payer's provider line</b><br/>(demo: simulated, nothing is dialled)" }
  e1@{ shape: stadium, label: "<b>Coverage is active: no extra button</b><br/>Other failures are fixed in the case or by 'Check again'" }
  c6@{ shape: trap-t, label: "Click 'Check again'" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Re-verify a patient" }
  c7@{ shape: trap-t, label: "Click '← Eligibility & Benefits'" }
  g5@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › List › What the screen shows" }
  c8@{ shape: trap-t, label: "<b>Click '← Back to referral RF-2040'</b><br/>With ?case= in the address it reads '← Back to case R-1042'<br/>Shown only when the check began from a referral" }
  g6@{ shape: subproc, label: "Continues in: Authorizations › New case › Referral › The full referral page" }
  s1 --> q1 & q2 & q4 & c6 & c7 & c8
  c8 --> g6
  q1 -->|"Yes"| c1 --> p1 --> g1
  q1 -->|"No"| n1
  q2 -->|"Yes"| c2 --> g2
  q2 -->|"No"| q3
  q3 -->|"Yes"| p2
  q3 -->|"No"| c3 --> g3
  q4 -->|"Lapsed"| c4 --> t1 --> x1
  q4 -->|"Ended or not found"| c5 --> t2 --> x2
  q4 -->|"Active"| e1
  c6 --> g4
  c7 --> g5
  class s1 k_start
  class q1,q2,q3,q4 k_decision
  class c1,c2,c3,c4,c5,c6,c7,c8 k_click
  class p1,n1,p2 k_process
  class g1,g2,g3,g4,g5,g6 k_goto
  class t1,t2 k_toast
  class x1,x2 k_ext
  class e1 k_endx
```

## Authorizations › Eligibility & Benefits › Result › Plan type and routing

The facts line under the summary says which plan type the payer is and where claims go. It is derived from the payer record and the plan type New case would pre-fill, so a payer added on Payers gets it too. A payer with no plan type shows nothing in its place. The check row 'It is the right plan' in 'Payment checks' reads from the same place.

Route: `/authorizations/eligibility/R-1042`

Demo only: no built-in payer is fee for service. The branch exists for a payer added later.

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
  s1@{ shape: stadium, label: "<b>Result page, facts line</b><br/>'Payer', 'Plan type and routing', 'Member', 'Date of service', 'Time checked', 'Source'" }
  pl@{ shape: rect, label: "<b>Payer item</b><br/>'Summit Medicaid HMO (Ohio Medicaid)'<br/>Name, then its group in brackets" }
  d0@{ shape: diam, label: "<b>Does the payer have a plan type?</b><br/>(HMO, PPO, Medicare Advantage, behavioral carve-out, fee for service)" }
  none@{ shape: rect, label: "<b>'Plan type and routing' is left out of the line</b><br/>Nothing is guessed" }
  d1@{ shape: diam, label: "Which group is the payer in?" }
  m1@{ shape: rect, label: "<b>Ohio Medicaid, HMO or PPO</b><br/>'Medicaid managed care (HMO). Claims go to Summit, not to the state'" }
  m2@{ shape: rect, label: "<b>Ohio Medicaid, fee for service</b><br/>'Medicaid fee for service. Claims go to the state, not to a health plan'" }
  c1@{ shape: rect, label: "<b>Commercial</b><br/>'Commercial PPO. Claims go to Beacon PPO'" }
  a1@{ shape: rect, label: "<b>Medicare Advantage</b><br/>'Medicare Advantage. Claims go to Harborview MA, not to Medicare'" }
  b1@{ shape: rect, label: "<b>Behavioral carve-out</b><br/>'Behavioral health carve-out. Behavioral health is carved out to Lakeshore Behavioral.<br/>Claims go to Lakeshore, not to the medical plan'" }
  cost@{ shape: rect, label: "<b>The same plan decides whether a cost share is on file</b><br/>Commercial and carve-out: copay, deductible, coinsurance<br/>Medicare Advantage: deductible, coinsurance<br/>Ohio Medicaid: none, nothing is shown" }
  src@{ shape: rect, label: "<b>'Source' item</b><br/>'Simulated check against the payer portal'<br/>Evergreen, reached by phone: 'Simulated check, confirmed by phone'" }
  e1@{ shape: stadium, label: "Facts line ends with where the answer came from, and says it is simulated" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Result first: eligibility, benefits, what the service needs" }
  s1 --> pl --> d0
  d0 -->|"No"| none --> src
  d0 -->|"Yes"| d1
  d1 -->|"Ohio Medicaid HMO or PPO"| m1 --> cost
  d1 -->|"Ohio Medicaid fee for service"| m2 --> cost
  d1 -->|"Commercial"| c1 --> cost
  d1 -->|"Medicare Advantage"| a1 --> cost
  d1 -->|"Behavioral carve-out"| b1 --> cost
  cost --> src --> e1
  cost -.-> g1
  class s1 k_start
  class pl,none,m1,m2,c1,a1,b1,cost,src k_process
  class d0,d1 k_decision
  class e1 k_end
  class g1 k_goto
```

## Authorizations › Eligibility & Benefits › Result › Result first: eligibility, benefits, what the service needs

How the three parts of the summary are worked out from the patient's row and from the saved Payers configuration. Eligibility says eligible, not eligible or needs a fix, with the dates. Benefits says covered or not, with the service limit and, only when the plan has them, copay, deductible and coinsurance. What this service needs says whether an authorization is required, on file or not required, and shows the payer's saved rules, read only.

Route: `/authorizations/eligibility/R-1042`

Demo only: effective dates, limits and cost share are sample data, and the check is simulated.

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
  s1@{ shape: stadium, label: "Result page, summary card" }
  subgraph gE ["Eligibility"]
  e0@{ shape: diam, label: "What did the state or plan say?" }
  e1@{ shape: rect, label: "<b>Pill 'Eligible' (green)</b><br/>'Effective 01/01/2026, no end date'" }
  e2@{ shape: rect, label: "<b>Pill 'Not eligible' (red)</b><br/>'Effective 01/01/2026, ended 09/30/2026'" }
  e3@{ shape: rect, label: "<b>Pill 'Needs a fix' (red)</b><br/>'Effective 01/01/2026, lapsed 10/12/2026'<br/>Button 'Request retro-eligibility'" }
  e4@{ shape: rect, label: "<b>Pill 'Needs a fix' (red)</b><br/>'No coverage was found for these details. Check the member ID and date of birth, or read the card again.'<br/>No dates" }
  end
  nf@{ shape: rect, label: "<b>Benefits and What this service needs say 'Not checked' (grey)</b><br/>'Needs a plan that knows this member'<br/>No limit line, no cost share, no Payers rules" }
  subgraph gB ["Benefits"]
  b0@{ shape: diam, label: "What do the benefits say?" }
  b1@{ shape: rect, label: "<b>Pill 'Covered' (green)</b><br/>'Residential 3.5 is payable. Codes H0018 and H0019'" }
  b2@{ shape: rect, label: "<b>Pill 'Limited' (amber)</b><br/>'... is payable with conditions. Codes ...'" }
  b3@{ shape: rect, label: "<b>Pill 'Not covered' (red)</b><br/>'... is not a covered benefit. Codes ...'" }
  b4@{ shape: diam, label: "Is a service limit on file?" }
  b5@{ shape: rect, label: "<b>Quiet line '9 of 14 days used, 5 left'</b><br/>(or '38 of 48 units used, 10 left')<br/>'All 14 days used. Nothing left' when none is left" }
  b6@{ shape: rect, label: "<b>Quiet line 'No annual day limit for residential 3.5. The authorization sets the days'</b><br/>when the program has none (Summit residential)<br/>Otherwise no limit line" }
  b7@{ shape: diam, label: "Does this plan type have a cost share on file?" }
  b8@{ shape: rect, label: "<b>Quiet line 'Patient pays: Copay $40 per day, deductible $350 left, coinsurance 20% after the deductible'</b><br/>Commercial plans and carve-outs<br/>Medicare Advantage: 'Deductible $85 left, coinsurance 20%'" }
  b9@{ shape: rect, label: "<b>Nothing about cost</b><br/>Ohio Medicaid members usually pay none, so there is no '$0' line" }
  end
  subgraph gN ["What this service needs"]
  n0@{ shape: diam, label: "What is the authorization state?" }
  n1@{ shape: rect, label: "<b>Pill 'Not required' (grey)</b><br/>'Beacon does not require one for IOP.'" }
  n2@{ shape: rect, label: "<b>Pill 'On file' (green)</b><br/>'On file with Summit.'" }
  n3@{ shape: rect, label: "<b>Pill 'Required, not on file' (amber)</b><br/>'Required before the first day. Not on file yet.'" }
  n4@{ shape: rect, label: "<b>Pills 'In progress', 'Payer reviewing' or 'Retro request open' (amber or grey)</b><br/>with what is happening to the request" }
  n5@{ shape: rect, label: "<b>Quiet line from the Payers config, read live</b><br/>'Summit's saved rules (demo data): Notice within 24 hours of admission.<br/>9 documents on the Residential 3.5 list.'<br/>Edit the rule or the list on Payers and this line follows" }
  n6@{ shape: trap-t, label: "Click 'Open Summit's rules'" }
  end
  note@{ shape: rect, label: "<b>Under the summary: 'Active coverage does not mean this service is covered.</b><br/>Check the benefits and the authorization requirement.'" }
  g1@{ shape: subproc, label: "Continues in: Payers › Rules › Read the rules" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Next actions" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Which verdict and why" }
  s1 --> e0
  e0 -->|"Active"| e1 --> b0
  e0 -->|"Ended"| e2 --> b0
  e0 -->|"Lapsed"| e3 --> b0
  e0 -->|"Not found"| e4 --> nf --> note
  b0 -->|"Covered"| b1 --> b4
  b0 -->|"Limited"| b2 --> b4
  b0 -->|"Not covered"| b3 --> b4
  b4 -->|"Yes"| b5 --> b7
  b4 -->|"No"| b6 --> b7
  b7 -->|"Yes"| b8 --> n0
  b7 -->|"No"| b9 --> n0
  n0 -->|"Not required"| n1 --> n5
  n0 -->|"On file"| n2 --> n5
  n0 -->|"Required"| n3 --> n5
  n0 -->|"Drafted, reviewing, retro"| n4 --> n5
  n5 --> n6 --> g1
  n5 --> note --> g3
  e3 -.-> g2
  class s1 k_start
  class e0,b0,b4,b7,n0 k_decision
  class e1,e2,e3,e4,nf,b1,b2,b3,b5,b6,b8,b9,n1,n2,n3,n4,n5,note k_process
  class n6 k_click
  class g1,g2,g3 k_goto
  style gE fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gN fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Re-verify a patient

Three ways to check a patient again. A row's 'Re-check' and the result's 'Check again' run the same quick re-check. Opening 'Verify a patient' from a case runs the full live check again.

Route: `/authorizations/eligibility (and /authorizations/eligibility/R-1042)`

Demo only: a re-check never changes the answer. R-1101 stays lapsed. The re-checks Verify runs on its own, when the Demo clock passes a booked time, are in 'Re-check on its own'.

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
  a1@{ shape: stadium, label: "On the list, click 'Re-check' on a row" }
  a2@{ shape: stadium, label: "On a result, click 'Check again'" }
  a3@{ shape: stadium, label: "Open 'Verify a patient' from a case and click 'Check now'" }
  q1@{ shape: diam, label: "Is a re-check already running for this patient?" }
  p1@{ shape: rect, label: "<b>The click is ignored</b><br/>The button is off with a spinner" }
  p2@{ shape: rect, label: "<b>Patient marked as checking</b><br/>List: button reads 'Checking' with a spinner, the quiet second line says 'Checking now'<br/>Result: 'Check again' shows a spinner" }
  g0@{ shape: hex, label: "Verify and the other agents ask again" }
  x1@{ shape: st-rect, label: "<b>The state and the plan</b><br/>(demo: simulated, same answer as before)" }
  w1@{ shape: delay, label: "About 1.1 seconds" }
  st1@{ shape: cyl, label: "<b>Row updated</b><br/>Checked time is now, any booked re-check cleared, verdict unchanged" }
  q2@{ shape: diam, label: "Does the payer need a phone call? (Evergreen)" }
  t1@{ shape: odd, label: "<b>'R-1042 re-checked'</b><br/>'Still Authorization first.'" }
  t2@{ shape: odd, label: "<b>'R-0975 re-checked'</b><br/>'The plan's system did not answer, so Caller phoned. Still Fix before billing.'" }
  subgraph gAfter ["What changes on screen"]
  r1@{ shape: rect, label: "List: 'Checked 3 h ago' becomes 'Checked just now'" }
  r2@{ shape: rect, label: "List: tile 'Re-check due' goes down by one if this row had a re-check booked" }
  r3@{ shape: rect, label: "Result: 'Time checked' in the facts line, 'Sat 10:40 am, 3 d ago', becomes '10:42 am, live'" }
  r4@{ shape: rect, label: "Verdict, sidebar badge and the other tiles do not change" }
  end
  v1@{ shape: rect, label: "<b>Opens the verify form pre-filled from the case</b><br/>Then the full live check (about 10 seconds)" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › The check finishes and is saved" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Re-check on its own" }
  e1@{ shape: stadium, label: "Patient is up to date" }
  a1 --> q1
  a2 --> q1
  q1 -->|"Yes"| p1
  q1 -->|"No"| p2 --> g0 --> x1 --> w1 --> st1 --> q2
  q2 -->|"No"| t1
  q2 -->|"Yes"| t2
  t1 --> r1 & r3 & r4
  t2 --> r1 & r3 & r4
  r1 --> r2 --> e1
  r3 --> e1
  r4 --> e1
  r2 -.-> g2
  a3 --> v1 --> g1
  class a1,a2,a3 k_start
  class q1,q2 k_decision
  class p1,p2,r1,r2,r3,r4,v1 k_process
  class g0 k_agent
  class x1 k_ext
  class w1 k_wait
  class st1 k_store
  class t1,t2 k_toast
  class g1,g2 k_goto
  class e1 k_end
  style gAfter fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Eligibility & Benefits › Errors and empty states

Everything that can go wrong or come up empty in this module. There are no error pages and no retry buttons. A missing check shows an empty state, a bad link shows a toast or nothing, and bad coverage shows up as a result.

Route: `/authorizations/eligibility/ZZ-9`

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
  s1@{ shape: stadium, label: "<b>A check cannot be found</b><br/>Old link, typed address, or after 'Reset demo data' in the Demo menu" }
  e1@{ shape: curv-trap, label: "<b>Coverage check</b><br/>'That check is not in the list.'" }
  e2@{ shape: curv-trap, label: "<b>Empty state 'We could not find that check'</b><br/>'It may have been cleared when the demo data was reset.'" }
  c1@{ shape: trap-t, label: "Click 'Back to Eligibility & Benefits'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › List › What the screen shows" }
  s2@{ shape: stadium, label: "Open 'Verify a patient' with a referral that does not exist" }
  t1@{ shape: odd, label: "<b>'Referral not found'</b><br/>'We could not find RF-9999. Type the details instead.'" }
  p1@{ shape: rect, label: "<b>The form stays empty</b><br/>No 'Back to referral' link either" }
  s3@{ shape: stadium, label: "Open 'Verify a patient' with a case that is neither on the list nor in the queue" }
  p2@{ shape: rect, label: "<b>The form stays empty</b><br/>No message appears" }
  s4@{ shape: stadium, label: "Type in the form but leave something out or in the wrong shape" }
  q1@{ shape: diam, label: "Payer, a member ID of 4 or more characters and two MM/DD/YYYY dates?" }
  p3@{ shape: rect, label: "<b>'Check now' is off and the hint says what is missing</b><br/>No red error text next to the fields" }
  c2@{ shape: trap-t, label: "Click 'Check now'" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Verify › The live check" }
  s5@{ shape: stadium, label: "Search or filters on the list match nobody" }
  e3@{ shape: curv-trap, label: "<b>'No patients match these filters'</b><br/>'The filters hide every row. Clear them to see all 37 patients.'" }
  c3@{ shape: trap-t, label: "Click 'Clear filters'" }
  e4@{ shape: stadium, label: "All patients are back" }
  s6@{ shape: stadium, label: "<b>The check finds a coverage problem</b><br/>Member ID ends 1012, 9999, 3030, 6060 or 9090, or Evergreen with Detox" }
  e5@{ shape: curv-trap, label: "<b>A normal result page with a red verdict 'Fix before billing'</b><br/>If coverage is not found, headline 'We could not find coverage.', one grey row 'Nothing else could be checked' and no payment lines" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › Next actions" }
  s7@{ shape: stadium, label: "Leave 'Verify a patient' while the live check runs" }
  e6@{ shape: stadium, label: "<b>The check is dropped</b><br/>Nothing is saved and no row is added" }
  s1 --> e1 --> e2 --> c1 --> g1
  s2 --> t1 --> p1
  s3 --> p2
  s4 --> q1
  q1 -->|"No"| p3
  q1 -->|"Yes"| c2 --> g2
  p3 -.-> q1
  s5 --> e3 --> c3 --> e4
  s6 --> e5 --> g3
  s7 --> e6
  class s1,s2,s3,s4,s5,s6,s7 k_start
  class e1,e2,e3,e5 k_screen
  class c1,c2,c3 k_click
  class g1,g2,g3 k_goto
  class t1 k_toast
  class p1,p2,p3 k_process
  class q1 k_decision
  class e4 k_end
  class e6 k_endx
```

## Authorizations › Eligibility & Benefits › Re-check on its own

Five patients have a re-check booked this week. Verify runs each one by itself when the Demo clock passes its time, wherever the person is in the app. If Verify is paused in Settings it waits, and catches up when Verify is resumed.

Route: `/authorizations/eligibility`

Demo only: the Demo clock moves only from the Demo menu. A re-check never changes the verdict. Booked times from the start: I-2207 Tue 11:32 am, I-2144 Tue 3:42 pm, I-2102 Wed 1:42 pm, R-0866 Thu 10:42 am, R-0871 Sat 10:42 am.

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
  s1@{ shape: stadium, label: "<b>On the list, five rows read 'Re-check due Tue 11:32 am' and so on</b><br/>Tile 'Re-check due' counts 5" }
  c1@{ shape: trap-t, label: "Open 'Demo' (top right) and click 'Fast-forward 1 hour' or 'Fast-forward 1 day'" }
  p1@{ shape: rect, label: "<b>The Demo clock moves</b><br/>Toast 'Clock moved forward 1 hour'" }
  q1@{ shape: diam, label: "Has a booked re-check time passed?" }
  e0@{ shape: stadium, label: "<b>Nothing is due yet</b><br/>Rows keep 'Re-check due Tue 11:32 am' on the quiet second line<br/>The result's 'Time checked' says it too: '..., 3 d ago. Re-check due Tue 11:32 am'" }
  q2@{ shape: diam, label: "Is Verify paused in Settings?" }
  subgraph gRun ["Verify re-checks"]
  a1@{ shape: hex, label: "<b>Verify re-checks every patient that came due</b><br/>Asks the state and the plan again (demo: simulated, same answer as before)" }
  st1@{ shape: cyl, label: "<b>Each row updated</b><br/>Checked time is the booked time, booking cleared<br/>Verdict unchanged, sidebar badge unchanged" }
  r1@{ shape: rect, label: "<b>List: second line reads 'Re-checked automatically at 11:32 am'</b><br/>Tile 'Re-check due' goes down by the rows done" }
  r2@{ shape: rect, label: "<b>Result: 'Time checked' reads 'Re-checked automatically at 11:32 am'</b><br/>'Next checks' (inside 'How this was checked') no longer starts with the re-check line" }
  q3@{ shape: diam, label: "How many came due at once?" }
  n1@{ shape: odd, label: "<b>Bell: 'Re-checked automatically'</b><br/>'I-2207 is still Cleared to bill. Verify re-checked it at 11:32 am.'<br/>Click opens that result" }
  n2@{ shape: odd, label: "<b>Bell: 'Re-checked 2 patients automatically'</b><br/>'I-2144, I-2102 came due. None of the verdicts changed.'<br/>Click opens the list" }
  end
  subgraph gPaused ["Verify is paused"]
  w1@{ shape: rect, label: "<b>Nothing runs</b><br/>Row reads 'Not re-checked: Verify is paused in Settings'<br/>Tile 'Re-check due' keeps its count" }
  w2@{ shape: curv-trap, label: "<b>Result shows a banner 'Not re-checked: Verify is paused in Settings'</b><br/>'The re-check was due Tue 11:32 am. It runs as soon as Verify is resumed.'" }
  c2@{ shape: trap-t, label: "In Settings, switch Verify back on, or click 'Resume all agents'" }
  w3@{ shape: rect, label: "<b>Verify catches up at once</b><br/>Checked time is now, then the same rows and bell messages as above" }
  end
  m1@{ shape: trap-t, label: "Meanwhile the person clicks 'Re-check' on a row or 'Check again' on a result" }
  m2@{ shape: rect, label: "That booking is cleared: the person got there first" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Re-verify a patient" }
  g2@{ shape: subproc, label: "Continues in: Settings › Pause › What the rest of the app shows" }
  g3@{ shape: subproc, label: "Continues in: Global shell › Demo menu › Fast-forward the demo clock" }
  e1@{ shape: stadium, label: "Rows and tile are up to date" }
  s1 --> c1 --> p1 --> q1
  c1 -.-> g3
  q1 -->|"No"| e0
  q1 -->|"Yes"| q2
  q2 -->|"No"| a1 --> st1 --> r1 & r2
  st1 --> q3
  q3 -->|"One"| n1 --> e1
  q3 -->|"Several"| n2 --> e1
  r1 & r2 -.-> e1
  q2 -->|"Yes"| w1 --> w2 --> c2 --> w3 --> a1
  w1 -.-> g2
  s1 -.-> m1 --> m2 --> g1
  class s1 k_start
  class c1,c2,m1 k_click
  class p1,r1,r2,w1,w3,m2 k_process
  class q1,q2,q3 k_decision
  class e0 k_endx
  class a1 k_agent
  class st1 k_store
  class n1,n2 k_toast
  class w2 k_screen
  class g1,g2,g3 k_goto
  class e1 k_end
  style gRun fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gPaused fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```
