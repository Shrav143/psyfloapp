# Authorizations › Approved, reviews and tracked cases

What Case Manager did, now inside Authorizations: saved drafts, requests sent today, approved authorizations with their units and the tracked quick view, step-down plans, payer-change notes, Reviews this week with the review drawer and bulk signing, the ledger case page, sites, and where old Case Manager links land.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/07-case-manager/`.

## Authorizations › Old links › Case Manager addresses and links from other tabs

Case Manager is no longer a page. Its old addresses redirect to the matching Authorizations view, and the links other tabs still make to it land there too: Active cases is All, Reviews this week is its own view. The sidebar has no Case Manager row.

Route: `/manager, /active (both redirect to /authorizations)`

The redirect replaces the entry, so Back does not return to /manager. It always names the view, so an old link opens All or Reviews this week, never the last view used. Only ?tab=, ?show= and ?review= carry over; search and filters on an old address are dropped. Some text in other tabs still says Case Manager (the Dashboard's 'Open Active cases', the 'Decision accepted' and 'Drafts updated' messages).

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
  s1@{ shape: stadium, label: "<b>A saved or typed old address</b><br/>/manager, /manager?tab=reviews, /manager?tab=cases, /active" }
  s0@{ shape: stadium, label: "An old queue address: /authorizations?status=ready, ?urgency=now" }
  gQ@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Addresses and old queue links" }
  subgraph gIn ["Old Case Manager links"]
  c1@{ shape: trap-t, label: "Dashboard › Lifecycle: 'Active' or 'Renewal due'" }
  c2@{ shape: trap-t, label: "Dashboard: 'Open Active cases' under the requests table, or a 'Do next' item for a saved draft" }
  c3@{ shape: trap-t, label: "<b>Denial Intelligence › an accepted denial: 'Plan the step-down'</b><br/>or the notification 'Denial closed'" }
  c4@{ shape: trap-t, label: "Ask FLO: 'Open Reviews this week' or 'Open R-0912, review'" }
  c5@{ shape: trap-t, label: "Ledger case page: 'Open the review'" }
  end
  c6@{ shape: trap-t, label: "Notification 'Drafts updated' (after a payer change), Eligibility result 'Open in Authorizations', New Case 'Back to Authorizations'" }
  r6@{ shape: rect, label: "<b>Go to /authorizations with no view</b><br/>The last view and filters used come back" }
  r1@{ shape: rect, label: "/authorizations?view=all&show=active or show=renewal" }
  r2@{ shape: rect, label: "/authorizations?view=all" }
  r4@{ shape: rect, label: "/authorizations?view=reviews, with &review= and the review ID for one review" }
  rd@{ shape: rect, label: "<b>/manager and /active redirect at once</b><br/>?tab=reviews or any ?review= gives view=reviews; anything else view=all<br/>?show=active or renewal and ?review= are kept" }
  d1@{ shape: diam, label: "Which view does the address name?" }
  d2@{ shape: diam, label: "Does it carry ?review=?" }
  ov@{ shape: win-pane, label: "The review drawer opens over Reviews this week" }
  gD@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › The review drawer" }
  gR@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › The view" }
  d3@{ shape: diam, label: "Does it carry ?show=?" }
  sc@{ shape: curv-trap, label: "<b>All, with the chip 'Showing Active (approved, units left)'</b><br/>or 'Showing Renewal due (review due or ending within 7 days)'<br/>Active 40 rows, Renewal due 19: the Dashboard's own numbers" }
  gS@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Deadline, More and the Showing chip" }
  al@{ shape: curv-trap, label: "All, every row" }
  gA@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Arrive and read the views" }
  sb@{ shape: rect, label: "<b>Sidebar: 'All Authorizations' is green</b><br/>The Authorizations badge is unchanged (19): Case Manager's own badge is gone; its items count in 'Needs attention'" }
  e1@{ shape: stadium, label: "Authorizations is open on the view the old link meant" }
  s1 --> rd
  s0 --> gQ
  c1 --> r1
  c2 --> r2
  c3 --> r2
  c4 --> r4
  c5 --> r4
  c6 --> r6 --> gA
  r1 & r2 & r4 --> d1
  rd --> d1
  d1 -->|"Reviews this week"| d2
  d2 -->|"Yes"| ov --> gD
  d2 -->|"No"| gR
  d1 -->|"All"| d3
  d3 -->|"Yes"| sc --> gS
  d3 -->|"No"| al --> gA
  d1 -.-> sb
  sc --> e1
  al --> e1
  ov --> e1
  class s1,s0 k_start
  class gQ,gD,gR,gS,gA k_goto
  class c1,c2,c3,c4,c5,c6 k_click
  class r6,r1,r2,r4,rd,sb k_process
  class d1,d2,d3 k_decision
  class ov k_overlay
  class sc,al k_screen
  class e1 k_end
  style gIn fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › In progress › Drafts being prepared

A case saved in New Case and not sent yet is a row of In progress. When the draft belongs to a request already in the list, it stays on that request's row and the row offers 'Open the draft in New Case'. Otherwise the draft is a row of its own, with its status, the agent line, its due pill and one button: Continue, Answer, Watch or Review and sign. Both lead back into New Case.

Route: `/authorizations?view=progress`

Demo only: the five drafts at the start (R-1042, R-0988, I-2207, R-1101, I-2262) all belong to queue requests, so none is a row of its own until a person saves a new case. Case Manager's 'Being prepared' card, its chips and its eight-step bar are gone: the status chip, the next-action line and the owner carry the same facts.

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
  s1@{ shape: stadium, label: "New Case: click 'Save as draft' (any step)" }
  t1@{ shape: odd, label: "<b>'Draft saved'</b><br/>'R-1710 is in Authorizations.'" }
  s2@{ shape: stadium, label: "Open Authorizations, In progress (or All)" }
  d1@{ shape: diam, label: "<b>Does the draft belong to a request already listed?</b><br/>(same case ID or draft ID)" }
  subgraph gQ ["A draft of a listed request"]
  q1@{ shape: rect, label: "The request's row keeps its own status, next action and button" }
  q2@{ shape: trap-t, label: "<b>Click 'Open the draft in New Case' under the next action</b><br/>(only while the request is in progress)" }
  end
  subgraph gD ["A draft of its own"]
  r1@{ shape: curv-trap, label: "<b>Patient / request: the case ID (or 'New Case'), ' · No patient yet' or 'J.M., 34'</b><br/>'Level not set · No payer yet · Retrospective' until intake names them" }
  r2@{ shape: curv-trap, label: "<b>Status chip: 'Intake not finished', 'Needs your input', 'Agents working' or 'Ready to sign'</b><br/>Next action: the agent line, e.g. 'Intake is not finished.'<br/>Deadline: the due pill, Owner: the agent who has it, Chance: 'None' until intake is done" }
  r3@{ shape: rect, label: "No quick view: a click on the row does nothing" }
  d2@{ shape: diam, label: "What state is the draft in?" }
  b1@{ shape: rect, label: "'Continue' (green)" }
  b2@{ shape: rect, label: "'Answer' (green)" }
  b3@{ shape: rect, label: "'Watch' (outlined)" }
  b4@{ shape: rect, label: "'Review and sign' (green)" }
  c1@{ shape: trap-t, label: "Click the button or the case ID" }
  end
  p1@{ shape: rect, label: "<b>Go to /authorizations/new/ and the draft's code</b><br/>New Case opens on the step the draft is at" }
  d3@{ shape: diam, label: "Which step?" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › New Case › Reopen and resume a case" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › New Case › Authorization preparation › An agent asks a question" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › New Case › Authorization preparation › Start the run and watch it" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › New Case › Review & submit › Sign and send to payer" }
  gR@{ shape: subproc, label: "Continues in: Authorizations › In progress › How a draft row's status and deadline are decided" }
  na@{ shape: rect, label: "<b>'Needs attention' counts it unless agents are simply working</b><br/>(intake unfinished, a question, an agent that could not finish, a signature)" }
  sn@{ shape: rect, label: "<b>Once signed and sent, the draft leaves In progress</b><br/>The request is With the payer, marked 'New today'" }
  gN@{ shape: subproc, label: "Continues in: Authorizations › With the payer › A request sent today joins the list" }
  gU@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Updated for a payer change" }
  e1@{ shape: stadium, label: "The draft is back in front of a person" }
  s1 --> t1 --> d1
  s2 --> d1
  d1 -->|"Yes"| q1 --> q2 --> p1
  d1 -->|"No"| r1 --> r2 --> d2
  r2 -.-> r3
  r2 -.-> gR
  r2 -.-> na
  d2 -->|"Intake not finished"| b1
  d2 -->|"An agent asked"| b2
  d2 -->|"Agents running"| b3
  d2 -->|"All checks passed"| b4
  b1 & b2 & b3 & b4 --> c1 --> p1
  p1 --> d3
  d3 -->|"Intake"| g1
  d3 -->|"Question open"| g2
  d3 -->|"Agents working"| g3
  d3 -->|"Ready to sign"| g4
  g4 -.-> sn --> gN
  r1 -.-> gU
  p1 --> e1
  class s1,s2 k_start
  class t1 k_toast
  class d1,d2,d3 k_decision
  class q1,r3,b1,b2,b3,b4,p1,na,sn k_process
  class q2,c1 k_click
  class r1,r2 k_screen
  class g1,g2,g3,g4,gR,gN,gU k_goto
  class e1 k_end
  style gQ fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gD fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › In progress › How a draft row's status and deadline are decided

A saved draft's row is worked out from how far the agents have got and from the kind of request. The status chip, the next-action line, the owner and the button follow the agents; the due pill follows the request type. All of it follows the demo clock, so Fast-forward turns 'Notice due in 5 h' into 'Overdue'.

Route: `/authorizations?view=progress`

The next-action cell shows the first sentence of the agent line. A red due pill puts the row in Act now, whatever else it says.

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
  s1@{ shape: stadium, label: "A saved draft that is not a request yet is drawn as a row" }
  d1@{ shape: diam, label: "Is an agent waiting for an answer?" }
  a1@{ shape: rect, label: "<b>'Needs your input', button 'Answer'</b><br/>Owner: the agent who asked (Scribe, or Packet for a recertification)<br/>Line says what is needed" }
  d2@{ shape: diam, label: "Have all ten agents finished?" }
  a2@{ shape: rect, label: "<b>'Ready to sign', button 'Review and sign'</b><br/>Owner: Integrity<br/>'Integrity and Scrubber passed.'" }
  d3@{ shape: diam, label: "Has the run started?" }
  a3@{ shape: rect, label: "<b>'Agents working', button 'Watch' (outlined)</b><br/>Owner follows the next agent: Reader, Verify, Criteria, Historian, Placement, Forecaster, Scribe, Integrity, Packet, Scrubber<br/>Line, e.g. 'Packet is assembling the forms and attachments'" }
  a5@{ shape: rect, label: "<b>An agent could not finish: still 'Agents working'</b><br/>Line 'Verify could not reach Cardinal's portal.'<br/>It counts in 'Needs attention'" }
  a4@{ shape: rect, label: "<b>'Intake not finished', button 'Continue'</b><br/>Owner: Reader<br/>'Intake is not finished.'" }
  c1@{ shape: rect, label: "<b>Chance</b><br/>Starts low and climbs while the first six agents finish, then holds<br/>'None' while intake is unfinished" }
  subgraph gDue ["Due pill by request type"]
  d4@{ shape: diam, label: "What type of request?" }
  u1@{ shape: rect, label: "<b>Admission: 'Notice due in 5 h'</b><br/>Red under 24 h, amber after" }
  u2@{ shape: rect, label: "<b>Retro-authorization: 'Window closes in 18 h'</b><br/>Red under 24 h, amber after" }
  u3@{ shape: rect, label: "<b>Recertification: 'Expires in 3 days'</b><br/>Amber under 4 days, grey after" }
  u4@{ shape: rect, label: "<b>Continued stay: 'Review due 4:00 pm'</b><br/>A time when under a day, a weekday after. Amber" }
  u5@{ shape: rect, label: "<b>Initial request: 'Packet due Thu'</b><br/>Grey" }
  u6@{ shape: rect, label: "Any clock that has passed: 'Overdue' in red" }
  u7@{ shape: rect, label: "No type or no clock yet: 'None'" }
  end
  bd@{ shape: rect, label: "<b>Deadline band: a red pill is Act now</b><br/>Otherwise under a day Within 24 hours, under 7 days the week, else later" }
  e1@{ shape: stadium, label: "Row is drawn with its chip, line, owner, pill and button" }
  s1 --> d1
  d1 -->|"Yes"| a1
  d1 -->|"No"| d2
  d2 -->|"Yes"| a2
  d2 -->|"No"| d3
  d3 -->|"Yes"| a3
  d3 -->|"No"| a4
  a3 -.-> a5
  a1 & a2 & a3 & a4 --> c1
  c1 --> d4
  d4 -->|"Admission"| u1
  d4 -->|"Retro-authorization"| u2
  d4 -->|"Recertification"| u3
  d4 -->|"Continued stay"| u4
  d4 -->|"Initial request"| u5
  d4 -->|"Not set"| u7
  u1 & u2 & u3 & u4 & u5 -.-> u6
  u1 & u2 & u3 & u4 & u5 & u6 & u7 --> bd
  bd --> e1
  class s1 k_start
  class d1,d2,d3,d4 k_decision
  class a1,a2,a3,a5,a4,c1,u1,u2,u3,u4,u5,u6,u7,bd k_process
  class e1 k_end
  style gDue fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Denied › Step-down plans from accepted denials

When the clinic accepts a denial in Denial Intelligence, the denial's row in Authorizations becomes its step-down plan: status 'Accepted', the next action 'Plan the step-down', and one button that opens the case. It stays in Denied and counts in Needs attention. Separately, two cases carry a 'Consider a step-down' note, a prompt and never a decision.

Route: `/authorizations?view=denied`

Demo only: Reset demo data clears the accepted denials. Case Manager's folded 'Step-down plans' row and its 'Ready to step down?' card are gone; the row and the note carry them. Denial Intelligence's toast still says 'Case Manager has a step-down plan'.

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
  s1@{ shape: stadium, label: "Denial Intelligence › a denial › 'Accept the decision' › 'Accept and close'" }
  st1@{ shape: cyl, label: "<b>The accepted denial is recorded</b><br/>Which denial (e.g. D-3297), its request's case, the payer and the demo-clock time" }
  g1@{ shape: subproc, label: "Continues in: Denial Intelligence › Accept the denial" }
  c0@{ shape: trap-t, label: "<b>On the denial: click 'Plan the step-down'</b><br/>or the notification 'Denial closed'" }
  p0@{ shape: rect, label: "Go to /authorizations?view=all" }
  s2@{ shape: stadium, label: "Open Authorizations › Denied, or Needs attention" }
  d1@{ shape: diam, label: "<b>Is the denial a row in the list?</b><br/>(by its denial ID or its request's case ID)" }
  n1@{ shape: rect, label: "Nothing changes in Authorizations" }
  p1@{ shape: rect, label: "<b>The row stays in Denied (Denied 8 at the start, still 8)</b><br/>It keeps its site: a denial added from a letter follows its own" }
  r1@{ shape: curv-trap, label: "<b>The row</b><br/>Status 'Accepted' (grey); its other chips go<br/>Next action 'Plan the step-down: choose the next level of care and book the first visit.'<br/>Button 'Open case' (green)" }
  r2@{ shape: rect, label: "<b>Deadline</b><br/>A tracked denial (D-3318) reads 'Step-down plan open'<br/>A denial only the Dashboard has reads 'None'" }
  r3@{ shape: rect, label: "<b>It counts in Needs attention; only Reset demo data clears it</b><br/>The status filter 'Accepted' finds it" }
  c1@{ shape: trap-t, label: "Click 'Open case' or the ID" }
  p2@{ shape: rect, label: "<b>Go to /authorizations/case/ and the case of the denial's request</b><br/>(D-3297 opens I-2141)" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  p3@{ shape: rect, label: "The case page reads 'Accepted. Nothing left to send'" }
  subgraph gN ["'Consider a step-down' notes"]
  n2@{ shape: curv-trap, label: "Under the patient on R-0873 and P-1522: 'Consider a step-down'" }
  n3@{ shape: trap-t, label: "Hover the note" }
  n4@{ shape: rect, label: "<b>'Consider a step-down: Day 18 of 21 · aftercare visit not booked yet'</b><br/>or 'Day 11 · IOP starts Monday'" }
  end
  st2@{ shape: cyl, label: "'Reset demo data' clears the accepted denials" }
  e1@{ shape: stadium, label: "The plan is on the denial's own row" }
  s1 --> st1 --> g1
  st1 --> c0 --> p0 --> d1
  s2 --> d1
  d1 -->|"No"| n1
  d1 -->|"Yes"| p1 --> r1 --> r2
  r1 --> r3
  r1 --> c1 --> p2 --> g2
  p2 -.-> p3
  r2 --> e1
  s2 -.-> n2 --> n3 --> n4
  st1 -.-> st2
  class s1,s2 k_start
  class st1,st2 k_store
  class g1,g2 k_goto
  class c0,c1,n3 k_click
  class p0,n1,p1,r2,r3,p2,p3,n4 k_process
  class d1 k_decision
  class r1,n2 k_screen
  class e1 k_end
  style gN fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Worklist › Updated for a payer change

When Payers updates open drafts after a rule change or saved edits, the rows of the cases it redrafted carry a small note 'Updated for a payer change' with the date, under the patient. The note shows the latest update for the case. Rows that no update lists carry no note.

Route: `/authorizations`

Only drafts not sent yet are redrafted; a request the payer already has is never rewritten. Reset demo data clears the notes. The Payers toast and the 'Drafts updated' notification still say Case Manager; the notification opens plain /authorizations, which brings back the last view used.

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
  s1@{ shape: stadium, label: "Payers › History & Changes: a change is acknowledged and 'Update drafts' is confirmed" }
  s0@{ shape: stadium, label: "Payers › Edits waiting: 'Update drafts' after saved edits" }
  st1@{ shape: cyl, label: "<b>Payers records the update</b><br/>Which change, which payer, the IDs of the drafts and the demo-clock time" }
  g1@{ shape: subproc, label: "Continues in: Payers › History & Changes › Review and apply a change" }
  g0@{ shape: subproc, label: "Continues in: Payers › Edits waiting › Update drafts" }
  pd@{ shape: rect, label: "<b>A redrafted request that is on the Dashboard waits for a new signature</b><br/>It needs you again, so its row counts in 'Needs attention'" }
  nt@{ shape: odd, label: "<b>Notification 'Drafts updated'</b><br/>'2 drafts were redrafted after Cardinal's change. Each needs a new signature in Case Manager.'" }
  cn@{ shape: trap-t, label: "Click the notification" }
  pn@{ shape: rect, label: "Go to /authorizations (the last view and filters come back)" }
  s2@{ shape: stadium, label: "Open Authorizations" }
  d1@{ shape: diam, label: "<b>Does an update list one of the row's IDs?</b><br/>(request, case, ledger or draft ID, any letter case)" }
  p1@{ shape: rect, label: "The newest update for the case is used" }
  t1@{ shape: curv-trap, label: "<b>Grey note under the patient</b><br/>'Updated for a payer change · 10/20'<br/>On a queue request's row, a saved draft's row or a tracked row" }
  n1@{ shape: rect, label: "No note" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › In progress › Drafts being prepared" }
  e1@{ shape: stadium, label: "Rows are marked" }
  e2@{ shape: stadium, label: "Rows as before" }
  s1 --> st1 --> g1
  s0 --> st1
  s0 -.-> g0
  st1 --> pd
  st1 --> nt --> cn --> pn --> d1
  s2 --> d1
  d1 -->|"Yes"| p1 --> t1 --> e1
  t1 -.-> g2
  d1 -->|"No"| n1 --> e2
  class s1,s0,s2 k_start
  class st1 k_store
  class g1,g0,g2 k_goto
  class pd,pn,p1,n1 k_process
  class nt k_toast
  class cn k_click
  class d1 k_decision
  class t1 k_screen
  class e1,e2 k_end
```

## Authorizations › Approved › Approved authorizations and their units

The Approved view is what Case Manager's tracker was for: every approved authorization at the sites in view, with how much of the approval is used, what is due next and the one thing to do. It is a view of the same table, so search, filters, sort, pages and the quick view work as on every other view.

Route: `/authorizations?view=approved`

Demo only, at the start: 32 approved authorizations (Site A 17, Site B 15), all from the ledger. A request approved since (on the Dashboard or after it was sent today) joins them as 'Approved' or 'Partial approval'. The tracker's four status tiles (Needs action, Review due, Awaiting payer, On track) are gone: Needs action and Review due are chips on the row, and the quick view keeps the ledger status.

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
  s1@{ shape: stadium, label: "Click the view chip 'Approved 32'" }
  s2@{ shape: stadium, label: "A link with ?view=approved, or the Dashboard's 'Active' or 'Renewal due' (All with a Showing chip)" }
  gS@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Deadline, More and the Showing chip" }
  ad@{ shape: cyl, label: "<b>?view=approved in the address</b><br/>The table goes back to page 1; the other chips keep their counts" }
  tb@{ shape: curv-trap, label: "<b>The table: '32 authorizations'</b><br/>In the list's own order: by deadline band, waiting on a person first, soonest due" }
  subgraph gRow ["What an approved row says"]
  c1@{ shape: rect, label: "Status: 'Approved' (green), plus 'Needs action', 'Review due' or 'Needs your update' when the ledger or the review says so" }
  c2@{ shape: rect, label: "Under it: '12 of 14 days used' (units for IOP), a thin bar, and 'Runs out before review' when the data shows it" }
  c3@{ shape: rect, label: "<b>Next action: the first sentence of the case's next step</b><br/>'Review 2 is drafted.', 'Add your update to review 2 so it can be signed.', 'Review 2 has no draft yet.'" }
  c4@{ shape: rect, label: "<b>Deadline: the ledger's next binding event</b><br/>'Review today', '14 h left', '24 units left', 'Next review Tue 10/27'" }
  c5@{ shape: rect, label: "<b>Owner: the agent drafting its review (Scribe for Residential and Detox, Cadence for PHP and IOP)</b><br/>Chance: the stored approval chance" }
  c6@{ shape: rect, label: "Button: the review's own ('Update the review', 'Review and sign', 'Check the review', 'Open the review'), else 'Open'" }
  end
  gU@{ shape: subproc, label: "Continues in: Authorizations › Approved › Units used and the run-out flag" }
  gD@{ shape: subproc, label: "Continues in: Authorizations › Approved › What a tracked row's deadline says" }
  gO@{ shape: subproc, label: "Continues in: Authorizations › Approved › Open an approved authorization" }
  cq@{ shape: trap-t, label: "Click the row or its quick view icon" }
  gQ@{ shape: subproc, label: "Continues in: Authorizations › Approved › Quick view of a tracked authorization" }
  cs@{ shape: trap-t, label: "Sort by 'Deadline' or 'Chance', or page with 'Next'" }
  gP@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Sort and page" }
  ci@{ shape: trap-t, label: "Hover the info icon 'About units and approval chance'" }
  oi@{ shape: win-pane, label: "<b>Tip: units or days left at the usual pace, a day a day or about three units a week for IOP</b><br/>Approval chance bands: Strong 80 and above, Moderate 55 to 79, At risk below 55" }
  na@{ shape: rect, label: "Needs attention among them: a case marked Needs action, or a review that needs your update" }
  gR@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › The view" }
  e1@{ shape: stadium, label: "Every approved authorization in one list" }
  s1 --> ad --> tb
  s2 -.-> gS
  tb --> c1 --> c2 --> c3 --> c4 --> c5 --> c6
  c2 -.-> gU
  c4 -.-> gD
  c6 --> gO
  c1 -.-> na
  tb --> cq --> gQ
  tb --> cs --> gP
  tb --> ci --> oi
  c3 -.-> gR
  c6 --> e1
  class s1,s2 k_start
  class gS,gU,gD,gO,gQ,gP,gR k_goto
  class ad k_store
  class tb k_screen
  class c1,c2,c3,c4,c5,c6,na k_process
  class cq,cs,ci k_click
  class oi k_overlay
  class e1 k_end
  style gRow fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Approved › Open an approved authorization

The ways out of a ledger row (an approved authorization, or a request sent today that the ledger now tracks): the ID opens the full case, the row or its icon opens the tracked quick view, and the button does the one thing due. A case that is a request gets the Authorizations case page; one that only the ledger has gets the ledger case page; a case at a site the viewer is not looking at gets the out-of-site card.

Route: `/authorizations?view=approved → /authorizations/case/ID`

Demo only: 26 of the 32 approved authorizations at the start have no request of their own and open the ledger case page; the other 6 are also requests, so they open the Authorizations case page. 'Start reauthorization' shows only for an approval ending within 7 days with no review open or booked. Every approved row at the start has a review this week, and signing books the next one, so it appears for a request sent today and approved, once Fast-forward brings its end within 7 days.

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
  s1@{ shape: stadium, label: "A ledger row on screen (Approved, or With the payer marked 'New today')" }
  c1@{ shape: trap-t, label: "Click the case ID (underlined)" }
  c2@{ shape: trap-t, label: "Click the row away from a link or button, or its quick view icon" }
  gq@{ shape: subproc, label: "Continues in: Authorizations › Approved › Quick view of a tracked authorization" }
  c3@{ shape: trap-t, label: "Click the row's button" }
  db@{ shape: diam, label: "Which button does the row have?" }
  b1@{ shape: rect, label: "<b>A review not signed yet: the review's own button</b><br/>'Update the review', 'Review and sign', 'Check the review' or 'Open the review'" }
  b1s@{ shape: cyl, label: "?review= and the review ID in the address" }
  gr@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › The review drawer" }
  b2@{ shape: rect, label: "A denial waiting on a peer-to-peer call: 'Open the denial'" }
  gd@{ shape: subproc, label: "Continues in: Denial Intelligence › A denial opened" }
  b3@{ shape: rect, label: "Approval ending within 7 days, no review open: 'Start reauthorization'" }
  b3p@{ shape: rect, label: "Go to New Case with type=reauth and the patient's case" }
  gn@{ shape: subproc, label: "Continues in: Authorizations › New Case › Intake › Reauthorization / renewal" }
  b4@{ shape: rect, label: "Anything else: an outlined 'Open'" }
  p1@{ shape: rect, label: "Go to /authorizations/case/ and the case ID" }
  ds@{ shape: diam, label: "Is the case at a site the viewer is looking at?" }
  sos@{ shape: curv-trap, label: "<b>Out-of-site card</b><br/>'This case is not available at Site A'<br/>No patient or detail" }
  gs@{ shape: subproc, label: "Continues in: Authorizations › Sites › Reviews, step-down plans and ledger cases at each site" }
  d2@{ shape: diam, label: "Is the case a request: a queue record or a Dashboard request?" }
  s2@{ shape: curv-trap, label: "Authorizations case page" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  d3@{ shape: diam, label: "Is the case in the ledger?" }
  s3@{ shape: curv-trap, label: "<b>Ledger case page</b><br/>Case summary, next step, history<br/>'Open the review' (when one is due) and 'Back to Authorizations'" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Ledger case page › Open and read" }
  s5@{ shape: curv-trap, label: "<b>'Request not found'</b><br/>(only for an address typed by hand)" }
  c5@{ shape: trap-t, label: "Press the browser Back button" }
  p5@{ shape: rect, label: "<b>Authorizations again, on the same view and filters (they are in the address)</b><br/>Sort and page start again" }
  e1@{ shape: stadium, label: "Back on the list" }
  s1 --> c1 --> p1
  s1 --> c2 --> gq
  s1 --> c3 --> db
  db -->|"Review open"| b1 --> b1s --> gr
  db -->|"Peer-to-peer"| b2 --> gd
  db -->|"Ending soon"| b3 --> b3p --> gn
  db -->|"Other"| b4 --> p1
  p1 --> ds
  ds -->|"No"| sos --> gs
  ds -->|"Yes"| d2
  d2 -->|"Yes"| s2 --> g1
  d2 -->|"No"| d3
  d3 -->|"Yes"| s3 --> g3
  d3 -.->|"No"| s5
  s2 --> c5
  s3 --> c5
  c5 --> p5 --> e1
  class s1 k_start
  class c1,c2,c3,c5 k_click
  class gq,gr,gd,gn,gs,g1,g3 k_goto
  class db,ds,d2,d3 k_decision
  class b1,b2,b3,b3p,b4,p1,p5 k_process
  class b1s k_store
  class sos,s2,s3,s5 k_screen
  class e1 k_end
```

## Authorizations › Approved › What a tracked row's deadline says

The Deadline cell of a row that comes from the ledger says how long until the next thing that binds. When the case is also a request with a due time on its case page, it says exactly what the case page says. Otherwise the wording depends on the kind of event. It turns red when time is short, and it moves with the demo clock.

Route: `/authorizations?view=approved`

A ledger record that joins a queue request's row does not change that row's Deadline: the request's own due time stays. Times under two days show hours ('5 h'), longer ones days ('3 days'). Approval chance and the ledger status are stored and do not move, except that a booked next review sets 'On track'.

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
  s1@{ shape: stadium, label: "Read the Deadline cell of a ledger row" }
  a0@{ shape: diam, label: "Did the clinic accept this denial?" }
  k11@{ shape: rect, label: "'Step-down plan open', never red" }
  b0@{ shape: diam, label: "Did a signature book a next review for this case?" }
  k10@{ shape: rect, label: "<b>'Next review Tue 10/27', then 'Review due' in red when the day comes</b><br/>The ledger status becomes 'On track' (or stays 'Awaiting payer')" }
  q0@{ shape: diam, label: "Is the case also a request with a due time on its case page?" }
  q1@{ shape: rect, label: "<b>The case header's words and hours</b><br/>'Notice due in 9 h', 'Answer due in 9 h', 'Review due in 3 h', 'Decision expected Thu'<br/>Red under a day (a payer decision: only when overdue)" }
  k0@{ shape: diam, label: "What is the next event that binds?" }
  subgraph gK ["The ledger's own clock"]
  k1@{ shape: rect, label: "<b>Notice: 'Notice due in 5 h' or 'Notice overdue'</b><br/>Red under 2 days" }
  k2@{ shape: rect, label: "<b>Retro window: 'Window closes 18 h' or 'Window closed'</b><br/>Red under 2 days" }
  k3@{ shape: rect, label: "<b>Peer-to-peer: 'P2P in 36 h' or 'P2P window closed'</b><br/>Red under 2 days" }
  k4@{ shape: rect, label: "<b>Payer question: 'Answer due in 6 h' or 'Answer overdue'</b><br/>Red under a day" }
  k5@{ shape: rect, label: "<b>Approval ends: '3 days left', '14 h left' or 'Approval ended'</b><br/>Red under a day" }
  k6@{ shape: rect, label: "<b>Clinical review: 'Review in 2 days', 'Review tomorrow', 'Review today', 'Review due'</b><br/>Red only when overdue" }
  k7@{ shape: rect, label: "<b>Payer decision: 'Decision Thu', 'Decision in 5 h' or 'Decision overdue'</b><br/>Red only when overdue" }
  k8@{ shape: rect, label: "<b>Units only: '32 units left'</b><br/>Never red, grey" }
  end
  tn@{ shape: rect, label: "<b>Pill colour: red when urgent, grey for units and a booked review, amber otherwise</b><br/>An urgent or past time puts the row in Act now, with a dot on the pill" }
  rv@{ shape: rect, label: "<b>On Reviews this week the cell shows the review's own time instead</b><br/>'Review 2 · Tue 10/20, 9:00 am'" }
  gR@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › The view" }
  gF@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Deadline, More and the Showing chip" }
  e1@{ shape: stadium, label: "Deadline is read" }
  s1 --> a0
  a0 -->|"Yes"| k11 --> tn
  a0 -->|"No"| b0
  b0 -->|"Yes"| k10 --> tn
  b0 -->|"No"| q0
  q0 -->|"Yes"| q1 --> tn
  q0 -->|"No"| k0
  k0 -->|"Notice"| k1
  k0 -->|"Retro window"| k2
  k0 -->|"P2P call"| k3
  k0 -->|"Payer question"| k4
  k0 -->|"Approval end"| k5
  k0 -->|"Review"| k6
  k0 -->|"Decision"| k7
  k0 -->|"Units"| k8
  k1 & k2 & k3 & k4 & k5 & k6 & k7 & k8 --> tn
  tn --> e1
  tn -.-> gF
  s1 -.-> rv -.-> gR
  class s1 k_start
  class a0,b0,q0,k0 k_decision
  class k11,k10,q1,k1,k2,k3,k4,k5,k6,k7,k8,tn,rv k_process
  class gR,gF k_goto
  class e1 k_end
  style gK fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › With the payer › A request sent today joins the list

A case signed and sent in New Case leaves In progress and becomes a request with the payer. The ledger starts tracking it as 'New today' unless it already had the case, so the list still has one row for it, now in With the payer, with the tracked quick view. The With the payer view counts what was sent today in its header button.

Route: `/authorizations?view=payer`

Demo only: four requests count as sent today at the start (I-2231, R-1088, P-1611, P-1637), so the button reads '4 sent today'. The new row follows its request: Fast-forward moves its clock and Reset demo data removes it.

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
  s1@{ shape: stadium, label: "New Case › Review & submit › 'Sign and send to payer (demo)'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › New Case › Review & submit › Sign and send to payer" }
  st1@{ shape: cyl, label: "<b>The request is on the Dashboard as 'Received'</b><br/>Its ID is added to 'sent today'" }
  d0@{ shape: diam, label: "Was it already a queue request (sent from its row's 'Send to payer')?" }
  p0@{ shape: rect, label: "Its queue record is done: the In progress row it had leaves" }
  p0b@{ shape: rect, label: "A new case: a queue record is added, with the payer" }
  d1@{ shape: diam, label: "<b>Did the ledger already have the case, or is it one of the demo's own requests?</b><br/>(R-0988, I-2207 and the seed requests are)" }
  p1@{ shape: rect, label: "<b>No new record: the case shows its ledger row or its Dashboard request as before</b><br/>e.g. R-0988 reads Approved, its review still due" }
  p2@{ shape: cyl, label: "<b>The ledger adds a record for it, marked 'New today'</b><br/>Initials and age, level of care, request type, approval chance from the draft, not yet approved" }
  r1@{ shape: curv-trap, label: "<b>One row in With the payer</b><br/>'New today' in green under the patient<br/>Status 'With the payer', next action 'Wait for Lakeshore.' (or '... to decide')<br/>Button 'Open' (or 'Open on Dashboard'); the row opens the tracked quick view" }
  p3@{ shape: rect, label: "<b>The row follows the request</b><br/>With the payer: 'Decision expected' and 'Awaiting payer' in the quick view<br/>Info requested: 'Answer due', Needs action<br/>Approved: Approved, '0 of 14 days used' (PHP 10, Detox 5, IOP 24 units)<br/>Denied: Denial route with a peer-to-peer clock, in Denied" }
  p4@{ shape: rect, label: "<b>Counts move together: In progress one fewer, the view it is in now one more</b><br/>The sidebar badge drops if the request was due now or within 24 hours" }
  subgraph gH ["'N sent today'"]
  h1@{ shape: curv-trap, label: "'5 sent today' before 'New Case' (only on With the payer, only when something was sent)" }
  h2@{ shape: trap-t, label: "Click '5 sent today'" }
  h3@{ shape: rect, label: "Go to /dashboard?stage=received" }
  end
  g2@{ shape: subproc, label: "Continues in: Dashboard › Lifecycle › Click a state to filter the table" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Approved › Quick view of a tracked authorization" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Approved › Open an approved authorization" }
  e1@{ shape: stadium, label: "The sent request is one row, with the payer" }
  s1 --> g1
  s1 --> st1 --> d0
  d0 -->|"Yes"| p0 --> d1
  d0 -->|"No"| p0b --> d1
  d1 -->|"Yes"| p1 --> p4
  d1 -->|"No"| p2 --> r1 --> p3 --> p4 --> e1
  r1 -.-> g3
  r1 -.-> g4
  st1 --> h1 --> h2 --> h3 --> g2
  class s1 k_start
  class g1,g2,g3,g4 k_goto
  class st1,p2 k_store
  class d0,d1 k_decision
  class p0,p0b,p1,p3,p4,h3 k_process
  class r1,h1 k_screen
  class h2 k_click
  class e1 k_end
  style gH fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Approved › Units used and the run-out flag

Under the status chip of a row whose approval the ledger holds: how much of the approval is used, a thin bar and, only when the data shows it, that the approval runs out before the next review. The tracked quick view and the ledger case page say the same with how much is left.

Route: `/authorizations?view=approved`

The pace is the demo's own: one day of care a day, and about three units a week for IOP (the case page dates the approval with the same pace). A real payer's day or unit count would replace it. The tracker's 'Units or days' column and its sort are gone; the line sits in the Status cell, or under the patient below 1100 px.

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
  s1@{ shape: stadium, label: "Read the Status cell of a row" }
  d1@{ shape: diam, label: "<b>Does the ledger hold an approval for the case (days or units)?</b><br/>(approved rows, and some with the payer or not sent yet, e.g. R-0912, I-2207)" }
  n1@{ shape: rect, label: "<b>No units line</b><br/>(the quick view says 'Not approved yet. Units count from the first approved day.')" }
  p1@{ shape: rect, label: "<b>'10 of 21 days used' ('units' for IOP)</b><br/>A thin bar under it, terracotta from 75 percent used" }
  q1@{ shape: curv-trap, label: "<b>Tracked quick view and ledger case page</b><br/>'10 of 21 days used, 11 left' ('none left' at zero), with a wider bar" }
  d2@{ shape: diam, label: "Are there days or units left, and a review still to be signed?" }
  n2@{ shape: rect, label: "<b>No flag</b><br/>(nothing left to run out, or no review to run out before)" }
  st1@{ shape: cyl, label: "<b>Next review of the case = the earliest review not yet signed</b><br/>The one due this week, or the one Cadence booked after a signature" }
  pp@{ shape: rect, label: "Pace of use: a day a day, about three units a week for IOP" }
  d3@{ shape: diam, label: "<b>Does the ledger date the end of the approval?</b><br/>(an expiry or units clock that the case page has not replaced with its own)" }
  e1p@{ shape: rect, label: "End of the approval = that date" }
  e2p@{ shape: rect, label: "End of the approval = now + left divided by the pace" }
  d4@{ shape: diam, label: "Does the approval end before that review?" }
  n3@{ shape: rect, label: "No flag" }
  f1@{ shape: curv-trap, label: "<b>'Runs out before review' in red under the bar</b><br/>No pill: it is text<br/>At the start one row shows it (P-1590: 2 days left, its review falls later in the week)" }
  pm@{ shape: rect, label: "<b>Moves with the demo clock and with signatures</b><br/>Signing a review books the next one later: R-0856 and I-2193 then show the flag" }
  ft@{ shape: curv-trap, label: "<b>Info icon 'About units and approval chance' at the top right of the table</b><br/>'... Runs out before review appears only when that pace uses the approval up before the next review.'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Approved › Quick view of a tracked authorization" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Ledger case page › Open and read" }
  e1@{ shape: stadium, label: "Cell is read" }
  s1 --> d1
  d1 -->|"No"| n1 --> e1
  d1 -->|"Yes"| p1 --> d2
  p1 -.-> q1
  q1 -.-> g1
  q1 -.-> g2
  d2 -->|"No"| n2 --> e1
  d2 -->|"Yes"| st1 --> pp --> d3
  d3 -->|"Yes"| e1p --> d4
  d3 -->|"No"| e2p --> d4
  d4 -->|"No"| n3 --> e1
  d4 -->|"Yes"| f1 --> ft --> e1
  f1 -.-> pm
  class s1 k_start
  class d1,d2,d3,d4 k_decision
  class n1,p1,n2,pp,e1p,e2p,n3,pm k_process
  class q1,f1,ft k_screen
  class st1 k_store
  class g1,g2 k_goto
  class e1 k_end
```

## Authorizations › Approved › Quick view of a tracked authorization

A row the ledger tracks opens this right-hand quick view when it is approved or with the payer: the summary first (what is due next, units used and left, the approved window, level of care, payer, site, approval chance, the next review, documents and the three newest lines of history), then 'Open case' and, where it applies, 'Draft review' or 'Open review'. Requests still in progress and denials open the other quick views.

Route: `/authorizations?view=approved&quick=R-0856`

Demo only, at the start: 50 rows open it (the 32 approved authorizations and 18 requests with the payer). The status pill at the top is the ledger's own (Needs action, Review due, Awaiting payer, On track), which the row shows as chips.

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
  s1@{ shape: stadium, label: "A tracked row is on screen (Approved, or With the payer with a ledger record)" }
  c1@{ shape: trap-t, label: "Click the row (any part that is not a link or button)" }
  c2@{ shape: trap-t, label: "<b>Click the small icon 'Quick view R-0856' beside the patient</b><br/>(Tab to it, then Enter or Space)" }
  ad@{ shape: cyl, label: "<b>?quick=R-0856 in the address (replaces the entry)</b><br/>The row is highlighted" }
  ov@{ shape: win-pane, label: "<b>Right-hand panel 'R-0856 · Summit'</b><br/>Subtitle 'J.S., 51 · Residential 3.5 · Continued stay 2', ledger status pill 'Review due' at the right<br/>Big line 'Next due': 'Review today', red when urgent, and the next step: 'Review 2 is drafted. Read it, then sign it. ...'" }
  pf@{ shape: rect, label: "<b>Focus goes to 'Open case'</b><br/>Tab stays inside the panel" }
  kv@{ shape: curv-trap, label: "<b>Facts, one line each</b><br/>Units or days: '12 of 14 days used, 2 left' with a bar, and 'Runs out before review' when it applies<br/>Approved window: 'Thu 10/8 to Thu 10/22'<br/>Level of care, Payer, Workflow (when the case follows one), Site ('Site B · Second campus')<br/>Approval chance with its band, range and how many similar decisions" }
  kr@{ shape: curv-trap, label: "<b>Next review: 'Review 2, Tue 10/20, 9:00 am' with its pill (Not drafted yet, Drafted, Needs your update)</b><br/>Not approved yet: 'None until the request is approved'; approved with no review open: 'None booked'" }
  dd@{ shape: diam, label: "Does the case have a case page of its own (a request)?" }
  dc@{ shape: curv-trap, label: "<b>Documents: 'Complete, all 10 in the packet' or '8 of 9. Missing: ...'</b><br/>Counted the way the case page counts them" }
  dn@{ shape: rect, label: "No Documents line" }
  hh@{ shape: curv-trap, label: "<b>Latest history: the three newest lines, each with who did it and the time</b><br/>e.g. 'Review 2 is due', 'Scribe drafted review 2', 'Summit approved 14 days'<br/>A case that is also a request shows the request's own events" }
  dr@{ shape: diam, label: "What state is the next review in?" }
  cd@{ shape: trap-t, label: "Click 'Draft review'" }
  ag@{ shape: hex, label: "<b>Cadence drafts the review (demo: simulated, about 1.3 seconds)</b><br/>A paused Cadence says so at once: toast 'Cadence is paused in Settings'" }
  tg@{ shape: odd, label: "'Cadence drafted 1 review'" }
  pu@{ shape: rect, label: "The panel updates in place: the pill reads 'Drafted' and 'Draft review' becomes 'Open review'" }
  co@{ shape: trap-t, label: "Click 'Open review'" }
  po@{ shape: rect, label: "<b>The quick view closes and the review drawer opens</b><br/>The address swaps ?quick= for ?review=" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › The review drawer" }
  g5@{ shape: subproc, label: "Continues in: Authorizations › Ledger case page › Workflow line and history" }
  pn2@{ shape: rect, label: "No review button: the next review is not this week, or the case is not approved" }
  cc@{ shape: trap-t, label: "Click 'Open case'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Approved › Open an approved authorization" }
  cx@{ shape: trap-t, label: "Press Escape, click X or the dimmed area" }
  px@{ shape: rect, label: "<b>The panel closes and ?quick= leaves the address</b><br/>Focus returns to the row's quick view icon" }
  ps@{ shape: rect, label: "<b>The panel shows only rows at the sites in view</b><br/>If the view changes so the case is out of site, it closes" }
  e1@{ shape: stadium, label: "Back on the list" }
  s1 --> c1 --> ad
  s1 --> c2 --> ad
  ad --> ov --> pf --> kv --> kr --> dd
  kv -.-> g5
  dd -->|"Yes"| dc --> hh
  dd -->|"No"| dn --> hh
  hh --> dr
  dr -->|"Not drafted yet, due this week"| cd --> ag --> tg --> pu --> co
  dr -->|"Drafted or needs your update"| co
  dr -->|"None, or later than this week"| pn2
  co --> po --> g3
  ov --> cc --> g1
  ov --> cx --> px --> e1
  ov -.-> ps
  class s1 k_start
  class c1,c2,cd,co,cc,cx k_click
  class ad k_store
  class ov k_overlay
  class pf,dn,pu,po,pn2,px,ps k_process
  class kv,kr,dc,hh k_screen
  class dd,dr k_decision
  class ag k_agent
  class tg k_toast
  class g3,g5,g1 k_goto
  class e1 k_end
```

## Authorizations › Reviews this week › The view

Reviews this week is a view of the same table: every row whose continued-stay review is due before the end of Sunday, in review-time order. The Next action and Deadline columns become the review's status and time, each row's button becomes the review's own, and the header gains 'Draft all due reviews' and 'Sign all clean drafts'. Agents have already drafted most reviews.

Route: `/authorizations?view=reviews`

Demo only, at the start: 47 rows (Site A 26, Site B 21): 35 drafted (29 clean, 6 with a check to look at), 8 that need a clinician's update, 4 weekend reviews not drafted yet. One row per request, so a signed review stays on its row as 'Signed' and the count stays 47. Case Manager's day cards, its three tiles, 'Show N more' and the 'Ready to step down?' card are gone; the step-down prompt is a note on the row.

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
  s1@{ shape: stadium, label: "Click the view chip 'Reviews this week 47'" }
  s2@{ shape: stadium, label: "<b>Demo menu › Suggested path › 'Authorizations: reviews this week'</b><br/>or an old /manager?tab=reviews link" }
  ad@{ shape: cyl, label: "<b>?view=reviews in the address</b><br/>The table goes back to page 1" }
  hd@{ shape: curv-trap, label: "Header: 'Draft all due reviews' and 'Sign all clean drafts' before 'New Case'" }
  gB@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › Draft all due reviews and sign all clean drafts" }
  tb@{ shape: curv-trap, label: "'47 authorizations', ordered by the review's time, today first" }
  subgraph gRow ["What a row says in this view"]
  r1@{ shape: rect, label: "<b>Patient / request and Status as on every view</b><br/>The request's own chip: Approved, With the payer, Ready to sign, Denial route ..." }
  r2@{ shape: rect, label: "<b>Column 'Review': 'Not drafted yet', 'Drafted', 'Needs your update' or 'Signed'</b><br/>'Check to look at' (amber) beside a draft whose checks did not all pass<br/>A review that needs an update shows what is missing, in amber" }
  r3@{ shape: rect, label: "<b>Column 'Due': 'Review 2 · Tue 10/20, 8:30 am'</b><br/>Sorting by 'Due' sorts by that time" }
  r4@{ shape: rect, label: "Owner: the agent who drafted it (Scribe for Residential and Detox, Cadence for PHP and IOP) or the request's own" }
  r5@{ shape: rect, label: "Notes: 'Consider a step-down' on R-0873 and P-1522 (hover for why)" }
  end
  db@{ shape: diam, label: "What does the review need?" }
  b1@{ shape: rect, label: "Needs your update: 'Update the review' (green)" }
  b2@{ shape: rect, label: "Not drafted yet: 'Open the review' (outlined)" }
  b3@{ shape: rect, label: "Drafted and clean: 'Review and sign' (green)" }
  b4@{ shape: rect, label: "Drafted with a check to look at: 'Check the review' (green)" }
  b5@{ shape: rect, label: "Signed: the row's own button again ('Open', 'Send to payer', 'Open on Dashboard')" }
  c1@{ shape: trap-t, label: "Click the button" }
  rv@{ shape: cyl, label: "?review= and the review ID in the address (replaces the entry)" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › The review drawer" }
  c2@{ shape: trap-t, label: "Click the ID, the row or its quick view icon" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Read a row" }
  f1@{ shape: rect, label: "<b>Search and every filter narrow the view; 'Any deadline' counts it (6, 16, 32)</b><br/>There is no review-status filter: the 'Review' column shows it" }
  gF@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Search and filter" }
  p5@{ shape: rect, label: "<b>A next review booked inside the week takes the signed one's place on the row</b><br/>The week ends on Sunday night whatever the demo clock says" }
  e1@{ shape: stadium, label: "The week's reviews are on screen" }
  s1 --> ad
  s2 --> ad
  ad --> hd --> gB
  ad --> tb --> r1 --> r2 --> r3 --> r4 --> r5
  r2 --> db
  db -->|"Missing item"| b1
  db -->|"No draft"| b2
  db -->|"Clean"| b3
  db -->|"Check to look at"| b4
  db -->|"Signed"| b5
  b1 & b2 & b3 & b4 --> c1 --> rv --> g1
  tb --> c2 --> g2
  tb -.-> f1 -.-> gF
  r3 -.-> p5
  b5 --> e1
  r5 --> e1
  class s1,s2 k_start
  class ad,rv k_store
  class hd,tb k_screen
  class gB,g1,g2,gF k_goto
  class r1,r2,r3,r4,r5,b1,b2,b3,b4,b5,f1,p5 k_process
  class db k_decision
  class c1,c2 k_click
  class e1 k_end
  style gRow fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Reviews this week › The review drawer

Opening a review shows the draft an agent wrote, the four Integrity checks and the buttons to sign or open the case. It opens from a row's review button on any view, from the tracked quick view's 'Open review' (the quick view closes first), and from a ?review= link (the ledger case page's 'Open the review', Ask FLO, an old /manager?review= address). What the clinician can do depends on the review's status.

Route: `/authorizations?view=reviews&review=rv-R-0856 (drawer over the list)`

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
  s1@{ shape: stadium, label: "Click a row's 'Update the review', 'Review and sign', 'Check the review' or 'Open the review'" }
  o1@{ shape: win-pane, label: "<b>Drawer slides in from the right (640 px); ?review= is in the address</b><br/>Title 'R-0856 · Summit'<br/>Subtitle 'Continued-stay review 2 · Residential 3.5 · due Tue 10/20, 9:00 am'<br/>Status pill at the top right" }
  b1@{ shape: curv-trap, label: "<b>Top of the body</b><br/>'J.S., 51 · privacy mode'   'Drafted by' Scribe (Residential, Detox) or Cadence (PHP, IOP)<br/>Once drafted: 'Draft by FLO's agents. A clinician reviews and signs before anything is sent.'" }
  b2@{ shape: curv-trap, label: "<b>'The draft'</b><br/>Large text box with seven parts: title and payer lines, Clinical status, Treatment progress, Risk and safety, Why this level of care still fits, Request" }
  b3@{ shape: curv-trap, label: "<b>'Integrity checks'</b><br/>'Every sentence traced to the chart'<br/>'Review has no errors'<br/>'All payer requirements covered'<br/>'Level of care matches the request'" }
  b4@{ shape: curv-trap, label: "<b>Footer</b><br/>'Sign review' (green), 'Open case', 'Close'" }
  d1@{ shape: diam, label: "What is the review's status?" }
  t1@{ shape: rect, label: "<b>'Drafted', all four checks green ticks</b><br/>Draft can be edited<br/>Banner: 'Signing is one review at a time. Your edits to the draft are saved with the signature.'" }
  t2@{ shape: rect, label: "<b>'Drafted' with 'Check to look at'</b><br/>One check is amber with Integrity's note, for example 'The draft asks for 7 days. Beacon's usual limit at this level of care is 5.'<br/>Draft can be edited" }
  t3@{ shape: rect, label: "<b>'Needs your update'</b><br/>Amber panel names what is missing; 'All payer requirements covered' is red<br/>Draft is locked: 'The draft is locked until your update is added.'<br/>'Sign review' is greyed, hover text 'Add your update first'" }
  t4@{ shape: rect, label: "<b>'Signed'</b><br/>Draft is read-only<br/>Footer shows 'Signed by Heather K., LISW-S' in place of the button<br/>Green banner 'Next review: Tue 10/27, 9:00 am' with 'Cadence booked it.' and either 'It is on this week's list.' or 'It falls after this week, so it is not on the list yet.'" }
  t5@{ shape: rect, label: "<b>'Not drafted yet'</b><br/>Grey panel 'Not drafted yet': 'Cadence drafts each review a few days ahead. This one is not due until Sat 10/24, 9:00 am, so it has no draft and no Integrity checks yet.'<br/>The line above reads 'To be drafted by' Cadence<br/>No draft box and no checks<br/>'Sign review' is greyed, hover text 'Draft the review first'" }
  c4@{ shape: trap-t, label: "Click 'Draft this review'" }
  dp@{ shape: diam, label: "Is Cadence paused in Settings?" }
  tp@{ shape: odd, label: "<b>'Cadence is paused in Settings'</b><br/>'It drafts no reviews until you resume it there.'" }
  pd@{ shape: rect, label: "Button shows a spinner for about 1.3 seconds" }
  sd@{ shape: cyl, label: "Review becomes 'Drafted': the seven-part text and four green Integrity checks appear" }
  td@{ shape: odd, label: "'Cadence drafted 1 review'" }
  i1@{ shape: lean-r, label: "Edit the draft text" }
  c1@{ shape: trap-t, label: "Click 'Sign review'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › Sign a review" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › Add your update to a review" }
  c2@{ shape: trap-t, label: "Click 'Open case'" }
  p1@{ shape: rect, label: "<b>Go to /authorizations/case/ and the case ID, with ?tab=draft</b><br/>The drawer is gone with the page" }
  d3@{ shape: diam, label: "Is the case a request (a queue record or a Dashboard request)?" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Case page › Draft › Read and edit" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Ledger case page › Open and read" }
  c3@{ shape: trap-t, label: "<b>Click 'Close', the X, the dimmed area, or press Escape</b><br/>(Escape closes one layer at a time: an open sign dialog first, the drawer next)" }
  d2@{ shape: diam, label: "Was the review a draft?" }
  st1@{ shape: cyl, label: "<b>Edits to the draft are saved on the review</b><br/>Open it again and the edited text is there" }
  p2@{ shape: rect, label: "Nothing to save" }
  e1@{ shape: stadium, label: "Back on the list, same view and page; ?review= leaves the address" }
  s1 --> o1 --> b1 --> b2 --> b3 --> b4 --> d1
  d1 -->|"Clean draft"| t1
  d1 -->|"One check to look at"| t2
  d1 -->|"Missing item"| t3
  d1 -->|"Already signed"| t4
  d1 -->|"No draft yet"| t5
  t1 --> i1
  t2 --> i1
  t1 --> c1 --> g1
  t2 --> c1
  t3 --> g2
  t4 --> c2
  t1 --> c2
  c2 --> p1 --> d3
  d3 -->|"Yes"| g3
  d3 -->|"No: only the ledger has it"| g4
  t5 --> c4 --> dp
  dp -->|"Yes"| tp
  dp -->|"No"| pd --> sd --> td --> t1
  b4 --> c3 --> d2
  d2 -->|"Yes: Drafted"| st1 --> e1
  d2 -->|"No"| p2 --> e1
  class s1 k_start
  class o1 k_overlay
  class b1,b2,b3,b4 k_screen
  class d1,dp,d3,d2 k_decision
  class t1,t2,t3,t4,t5,pd,p1,p2 k_process
  class c4,c1,c2,c3 k_click
  class tp,td k_toast
  class sd,st1 k_store
  class i1 k_input
  class g1,g2,g3,g4 k_goto
  class e1 k_end
```

## Authorizations › Reviews this week › Add your update to a review

Eight reviews could not be finished by the agents because the chart lacks one item. The clinician says what applies, in their own words, and Integrity checks the draft again. The review then becomes an ordinary draft that can be signed. This is the 'answer' gate: agents stop and ask a person.

Route: `/authorizations?view=reviews&review=rv-R-0912 (review drawer)`

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
  s1@{ shape: stadium, label: "<b>Click 'Update the review' on a row whose review needs your update</b><br/>(for example R-0912)" }
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
  p3@{ shape: rect, label: "<b>On the row: 'Review' reads 'Drafted' and the button 'Review and sign'</b><br/>The review counts as clean for 'Sign all clean drafts'<br/>A tracked case with no other reason leaves 'Needs attention'; the sidebar badge does not change" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › Sign a review" }
  c2@{ shape: trap-t, label: "Close the drawer without adding anything" }
  p4@{ shape: rect, label: "Nothing is saved: the review stays 'Needs your update'" }
  c3@{ shape: trap-t, label: "Click 'Open case'" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › Draft › Read and edit" }
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

## Authorizations › Reviews this week › Sign a review

Signing is the gate where agents stop. Only a licensed clinician signs, so the coordinator picks who is signing and ticks an attestation. When Integrity left one amber check, the signer must also read and accept it. Signing is one review at a time.

Route: `/authorizations?view=reviews&review=rv-R-0856 (review drawer › sign dialog)`

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
  b1@{ shape: curv-trap, label: "<b>Banner 'Only a licensed clinician signs'</b><br/>'You are signed in as Jordan Perez, UR coordinator. Choose the clinician who is signing. Agents never sign for a person.'" }
  i1@{ shape: lean-r, label: "<b>'Signing clinician' dropdown</b><br/>'Heather K., LISW-S' (Clinical director)<br/>'Dr. R. Lindqvist, MD' (Medical director)" }
  d1@{ shape: diam, label: "Did Integrity leave one amber check?" }
  w1@{ shape: curv-trap, label: "<b>Amber box 'One check needs a look'</b><br/>Integrity's note, for example 'The draft asks for 7 days. Beacon's usual limit at this level of care is 5.'<br/>Tick box 'I read this and I accept it'" }
  i2@{ shape: lean-r, label: "Tick 'I read this and I accept it'" }
  i3@{ shape: lean-r, label: "<b>Tick the attestation</b><br/>'I reviewed this continued-stay review and it reflects the record. The level of care is my clinical judgment.'" }
  d2@{ shape: diam, label: "Are the attestation (and the acceptance, if shown) ticked?" }
  x1@{ shape: rect, label: "Button 'Sign review' stays greyed" }
  c1@{ shape: trap-t, label: "Click 'Sign review' in the dialog" }
  st1@{ shape: cyl, label: "<b>Review is saved as 'Signed'</b><br/>Signed by the chosen clinician, stamped with the demo clock<br/>The draft text, with any edits made in the drawer, is kept<br/>Cadence books the next review (see the next diagram)" }
  t1@{ shape: odd, label: "<b>'Review signed'</b><br/>'R-0856 was signed by Heather K., LISW-S. Cadence booked the next review for Tue 10/27, 9:00 am.'" }
  p1@{ shape: rect, label: "Dialog closes. The drawer stays open and now shows 'Signed by Heather K., LISW-S' with a read-only draft and the banner 'Next review: Tue 10/27, 9:00 am'" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › After a review is signed" }
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

## Authorizations › Reviews this week › Draft all due reviews and sign all clean drafts

Two buttons in the header of Reviews this week work on the whole week at the sites in view (a one-site viewer never drafts or signs the other site's reviews). 'Draft all due reviews' makes Cadence draft every review that has no draft yet, unless Cadence is paused in Settings. 'Sign all clean drafts' signs every draft whose four Integrity checks passed, in one step, and leaves out anything that needs a closer look.

Route: `/authorizations?view=reviews (the two header buttons)`

Both buttons work on the same set: every review due this week at the sites in view, whatever the search and filters show. The dialog's number is the number signed (with Payer set to Cardinal it says 29 and signs 29; 33 once 'Draft all due reviews' has run). The buttons show only on this view.

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
  s1@{ shape: stadium, label: "Authorizations › Reviews this week is open" }
  subgraph gDraft ["Draft all due reviews"]
  c1@{ shape: trap-t, label: "Click 'Draft all due reviews'" }
  dp@{ shape: diam, label: "Is Cadence paused in Settings?" }
  tp@{ shape: odd, label: "<b>'Cadence is paused in Settings'</b><br/>'It drafts no reviews until you resume it there.'<br/>(the button also says so on hover)" }
  pp@{ shape: rect, label: "Nothing changes: no spinner, no drafts" }
  p1@{ shape: rect, label: "Button shows a spinner and is disabled for about 1.3 seconds" }
  a1@{ shape: hex, label: "<b>Cadence drafts every review due this week that has no draft</b><br/>4 at the start: the weekend reviews I-2150, I-2170, I-2144 and I-2157" }
  dn@{ shape: diam, label: "Was any review waiting for a draft?" }
  sd@{ shape: cyl, label: "<b>Each one moves from 'Not drafted yet' to 'Drafted'</b><br/>Its seven-part text and four green Integrity checks are added" }
  t1@{ shape: odd, label: "<b>'Cadence drafted 4 reviews'</b><br/>'They are marked Drafted in the list. Integrity checked each one and all four checks passed.'" }
  t0@{ shape: odd, label: "<b>'Nothing to draft'</b><br/>'Every review due this week already has a draft or a question for you.'" }
  p2@{ shape: rect, label: "<b>Those rows read 'Drafted' with 'Review and sign'</b><br/>Clean drafts go from 29 to 33" }
  end
  subgraph gSign ["Sign all clean drafts"]
  d1@{ shape: diam, label: "<b>Is any review due this week at the sites in view a clean draft?</b><br/>(drafted, and all four checks passed; filters do not matter)" }
  x1@{ shape: rect, label: "Button 'Sign all clean drafts' is greyed out" }
  c2@{ shape: trap-t, label: "Click 'Sign all clean drafts'" }
  o1@{ shape: win-pane, label: "<b>Dialog 'Sign all clean drafts'</b><br/>Subtitle '33 reviews with all four checks passed'<br/>(29 if 'Draft all due reviews' has not run)" }
  b1@{ shape: curv-trap, label: "'Only drafts whose four Integrity checks all passed are signed.'" }
  b2@{ shape: curv-trap, label: "<b>Banner 'Only a licensed clinician signs'</b><br/>Dropdown 'Signing clinician' (Heather K., LISW-S or Dr. R. Lindqvist, MD)" }
  i1@{ shape: lean-r, label: "Tick 'I reviewed these 33 drafts and they reflect the record. The level of care in each is my clinical judgment.'" }
  d2@{ shape: diam, label: "Is the box ticked?" }
  x2@{ shape: rect, label: "Button 'Sign 33 reviews' stays greyed" }
  c3@{ shape: trap-t, label: "Click 'Sign 33 reviews'" }
  st1@{ shape: cyl, label: "<b>Those clean drafts are saved as 'Signed' by the chosen clinician, stamped with the demo clock</b><br/>Cadence books a next review for each<br/>Drafts with an amber check, reviews needing an update and reviews with no draft stay as they were" }
  t2@{ shape: odd, label: "<b>'33 reviews signed'</b><br/>'Heather K., LISW-S signed every draft whose four checks passed. Cadence booked the next review for each. The others wait for a closer look.'" }
  p3@{ shape: rect, label: "<b>Dialog closes</b><br/>Those rows read 'Signed' and show their own button again<br/>The header button is greyed out; the sidebar badge is unchanged" }
  c4@{ shape: trap-t, label: "Click 'Cancel', the X, the dimmed area, or press Escape" }
  p4@{ shape: rect, label: "Dialog closes, nothing is signed" }
  t3@{ shape: odd, label: "<b>'No clean drafts to sign'</b><br/>'Every draft left has a check that needs a look. Open each one to sign it.'<br/>(not seen on screen: the button is greyed out first)" }
  end
  g1@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › After a review is signed" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › Sign a review" }
  e1@{ shape: stadium, label: "Week's clean reviews are signed" }
  e2@{ shape: stadium, label: "Nothing signed" }
  e3@{ shape: stadium, label: "Due reviews are drafted" }
  e4@{ shape: stadium, label: "Nothing was drafted" }
  s1 --> c1 --> dp
  dp -->|"Yes"| tp --> pp --> e4
  dp -->|"No"| p1 --> a1 --> dn
  dn -->|"Yes"| sd --> t1 --> p2 --> e3
  dn -->|"No"| t0 --> e4
  s1 --> d1
  d1 -->|"No"| x1 --> e2
  d1 -->|"Yes"| c2 --> o1 --> b1 --> b2 --> i1 --> d2
  d2 -->|"No"| x2 -.-> i1
  d2 -->|"Yes"| c3 --> st1 --> t2 --> p3 --> g1
  p3 --> e1
  p3 -.-> g2
  o1 --> c4 --> p4 --> e2
  d1 -.-> t3
  class s1 k_start
  class c1,c2,c3,c4 k_click
  class dp,dn,d1,d2 k_decision
  class tp,t1,t0,t2,t3 k_toast
  class pp,p1,p2,x1,x2,p3,p4 k_process
  class a1 k_agent
  class sd,st1 k_store
  class o1 k_overlay
  class b1,b2 k_screen
  class i1 k_input
  class g1,g2 k_goto
  class e1,e3 k_end
  class e2,e4 k_endx
  style gDraft fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSign fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Reviews this week › After a review is signed

What the demo does once a clinician signs. The review changes status, its row changes, and Cadence books the next review: the review's own date plus the interval. When the next review falls before the end of Sunday it takes the signed one's place on the row; otherwise the row stays 'Signed' and the drawer says when the next one is.

Route: `/authorizations?view=reviews`

The PRD (03, Prior Authorization Lifecycle) treats each signed request as a version that is kept, and times renewals from the binding date and the payer's lead time. The demo books the next review from the interval alone and does not send the signed review anywhere.

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
  a1@{ shape: rect, label: "<b>Row: 'Review' reads 'Signed'; 'Check to look at' goes</b><br/>The button is the row's own again: 'Open', 'Send to payer', 'Open on Dashboard'" }
  a2@{ shape: rect, label: "Drawer, if open: footer reads 'Signed by Heather K., LISW-S', the draft is read-only, and a green banner shows 'Next review: Tue 10/27, 9:00 am'" }
  a3@{ shape: rect, label: "Reviews this week still counts the row: 47 stays 47" }
  a5@{ shape: rect, label: "'Sign all clean drafts' is greyed out once no clean draft is left this week at the sites in view" }
  a7@{ shape: rect, label: "<b>The sidebar badge does not change</b><br/>A tracked case with nothing else open leaves 'Needs attention'" }
  end
  subgraph gNext ["The next review"]
  g1@{ shape: hex, label: "<b>Cadence books the next continued-stay review</b><br/>Date: the review's own date and time plus the interval (from now, if it was signed late)" }
  i1@{ shape: rect, label: "<b>Interval: the payer's own rule when Payers has one ('A continued-stay review every 7 days'), else the level of care</b><br/>Residential and PHP 7 days, IOP 14 days, Detox 3 days. The sooner of the two wins" }
  n1@{ shape: cyl, label: "<b>A new review is saved: next review number (e.g. review 3), same time of day, status 'Not drafted yet'</b><br/>The signed review remembers the date" }
  t1@{ shape: odd, label: "<b>Toast: 'R-0856 was signed by Heather K., LISW-S. Cadence booked the next review for Tue 10/27, 9:00 am.'</b><br/>('Sign all clean drafts': 'Cadence booked the next review for each.')" }
  d1@{ shape: diam, label: "Does the next review fall before the end of Sunday?" }
  n2@{ shape: rect, label: "<b>It takes the row's place on this week's list, as 'Not drafted yet' with 'Open the review'</b><br/>'Draft all due reviews' drafts it (Detox reviews do: every 3 days)" }
  n3@{ shape: rect, label: "<b>The row stays 'Signed'</b><br/>The drawer says 'It falls after this week, so it is not on the list yet.'" }
  n4@{ shape: rect, label: "<b>A ledger row's Deadline reads 'Next review Tue 10/27', then 'Review due' when the day comes</b><br/>The ledger status goes to 'On track', so 'Needs action' and 'Review due' leave the row<br/>'Runs out before review' may now show (R-0856, I-2193)" }
  n5@{ shape: rect, label: "Ledger case page: a 'Next review' line and, in the history, 'Cadence booked review 3'" }
  x1@{ shape: st-rect, label: "Payer receives the signed review through its portal or by fax (real product, not drawn in the demo)" }
  end
  subgraph gCase ["Case record"]
  c1@{ shape: trap-t, label: "Click 'Open case' in the drawer" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › Draft › Read and edit" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Ledger case page › Open and read" }
  end
  g4@{ shape: subproc, label: "Continues in: Authorizations › Approved › Units used and the run-out flag" }
  st2@{ shape: cyl, label: "'Reset demo data' puts every review back to its starting state, clears signatures and removes the booked reviews" }
  e1@{ shape: stadium, label: "Review is signed and counted" }
  s1 --> st1
  st1 --> a1 & a2 & a3 & a5 & a7
  st1 --> g1 --> i1 --> n1 --> t1 --> d1
  d1 -->|"Yes"| n2
  d1 -->|"No"| n3
  n2 --> n4
  n3 --> n4
  n4 --> n5
  n4 -.-> g4
  n1 -.-> x1
  a2 --> c1 --> g2
  c1 -.-> g3
  a1 & a3 & a5 & a7 --> e1
  n5 --> e1
  e1 -.-> st2
  class s1 k_start
  class st1,n1,st2 k_store
  class a1,a2,a3,a5,a7,i1,n2,n3,n4,n5 k_process
  class g1 k_agent
  class t1 k_toast
  class d1 k_decision
  class x1 k_ext
  class c1 k_click
  class g2,g3,g4 k_goto
  class e1 k_end
  style gScreen fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gNext fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gCase fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Sites › Reviews, step-down plans and ledger cases at each site

What Case Manager's site rules became. Every tracked case, review and accepted denial belongs to one site, the same site on every screen. The Approved and Reviews this week views, the review buttons, the bulk review actions, the step-down rows, the tracked quick view and the ledger case page all follow the site view. A viewer limited to one site never sees, counts, drafts or signs the other site's cases, and a direct link to one shows an out-of-site card.

Route: `/authorizations?view=reviews`

Demo only, Both sites at the start: Approved 32 = Site A 17 + Site B 15; Reviews this week 47 = 26 + 21. Case Manager's own sidebar bubble is gone; the Authorizations badge follows the site the same way (19 = 11 + 8).

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
  s1@{ shape: stadium, label: "<b>Switch the site in the top bar: Both sites, Site A or Site B</b><br/>Or Demo menu › 'Viewing as': Dr. Rivera (Site A only), Sam Okafor (Site B only)" }
  gW@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Sites: what each viewer sees" }
  sc1@{ shape: curv-trap, label: "<b>The tracked rows follow the view</b><br/>Approved and Reviews this week chips, their rows and their deadline counts<br/>A small 'Site A' tag after the title when the view is narrowed" }
  p1@{ shape: rect, label: "<b>Both sites = Site A + Site B for every count</b><br/>Approved 32 = 17 + 15, Reviews this week 47 = 26 + 21" }
  d1@{ shape: diam, label: "Is the viewer limited to one site?" }
  p3@{ shape: rect, label: "The other site's cases do not exist for the viewer: not listed, not found by the search, not counted" }
  p4@{ shape: rect, label: "A viewer of both sites narrows to one site and widens again; every number changes at once" }
  p5@{ shape: rect, label: "<b>'Draft all due reviews' and 'Sign all clean drafts' act only on reviews at the sites in view</b><br/>The toast counts only those" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › Draft all due reviews and sign all clean drafts" }
  p6@{ shape: rect, label: "An accepted denial's step-down row is shown at the denial's own site" }
  p7@{ shape: rect, label: "<b>A ?quick= or ?review= for the other site's case opens nothing</b><br/>An open quick view closes when its case leaves the view" }
  s2@{ shape: stadium, label: "<b>Open a link to a case</b><br/>/authorizations/case/ID from a row, a review's 'Open case', a notification or a bookmark" }
  d2@{ shape: diam, label: "Is the case at a site in view?" }
  ok@{ shape: curv-trap, label: "<b>The case page opens as usual</b><br/>(Authorizations case page, or the ledger case page)" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Ledger case page › Open and read" }
  o1@{ shape: curv-trap, label: "<b>Out-of-site card instead of the page</b><br/>'This case is not available at Site A'<br/>'R-0856 belongs to Site B ...' with no patient or detail" }
  d3@{ shape: diam, label: "Can the viewer see both sites?" }
  c1@{ shape: trap-t, label: "Click 'Show Site B'" }
  p8@{ shape: rect, label: "The view widens to that site and the case opens" }
  c2@{ shape: trap-t, label: "Click 'Back to the Dashboard'" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Arrive › What the page shows" }
  e1@{ shape: stadium, label: "A viewer limited to one site has no way to the other site's case" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › A case at another site" }
  s1 --> sc1 --> p1
  s1 -.-> gW
  sc1 --> d1
  d1 -->|"Yes"| p3
  d1 -->|"No"| p4
  sc1 -.-> p5 --> g3
  sc1 -.-> p6
  sc1 -.-> p7
  s2 --> d2
  d2 -->|"Yes"| ok
  ok -.-> g4
  d2 -->|"No"| o1 --> d3
  d3 -->|"Yes"| c1 --> p8 --> ok
  d3 -->|"No"| e1
  o1 --> c2 --> g1
  o1 -.-> g2
  class s1,s2 k_start
  class gW,g3,g4,g1,g2 k_goto
  class sc1,ok,o1 k_screen
  class p1,p3,p4,p5,p6,p7,p8 k_process
  class d1,d2,d3 k_decision
  class c1,c2 k_click
  class e1 k_endx
```

## Authorizations › Ledger case page › Open and read

26 of the 32 approved authorizations have no request of their own (no queue record, no Dashboard request). Their ID opens a calm summary built from the ledger record, so a row, its quick view and its review never end at 'Request not found'. It says who, which payer and service, how much of the approval is used, what is due and the next step. A case at a site the viewer is not looking at shows an out-of-site card instead.

Route: `/authorizations/case/ID (a case the ledger has that is not a request)`

Patient shows initials and age only, with a 'Privacy mode on' pill, as everywhere in the demo. Authorization dates are worked out from the units used and the demo clock, or taken from the ledger's own end date when it has one.

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
  s1@{ shape: stadium, label: "<b>Click an approved row's ID or 'Open'</b><br/>or 'Open case' in its tracked quick view or in a review drawer" }
  p1@{ shape: rect, label: "Go to /authorizations/case/ and the case code" }
  d1@{ shape: diam, label: "Is the ID a request (a queue record or a Dashboard request)?" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  d2@{ shape: diam, label: "Is the ID in the ledger?" }
  n1@{ shape: curv-trap, label: "<b>'Request not found'</b><br/>'No request R-9999' and 'Back to Authorizations'<br/>(only for an address typed by hand)" }
  e2@{ shape: stadium, label: "Nothing to show for that ID" }
  subgraph gPage ["Ledger case page"]
  h1@{ shape: curv-trap, label: "<b>Header</b><br/>Crumb 'Authorizations › R-0856'<br/>Level chip, case ID, review type ('Continued stay 2'), status pill ('Review due'), the only status on the page<br/>'J.S., 51 · Summit Medicaid HMO · Residential 3.5'" }
  m1@{ shape: curv-trap, label: "<b>Card 'Case summary', pill 'Privacy mode on'</b><br/>Patient, Payer, Service<br/>Authorization: 'Thu 10/8 to Thu 10/22'<br/>Units used: a bar and '12 of 14 days used, 2 left', and 'Runs out before review' in red only when the data shows it" }
  m2@{ shape: curv-trap, label: "<b>More rows in the card</b><br/>Reviews due: 'Review 2, Tue 10/20, 9:00 am' with its status pill<br/>Next on the clock<br/>Approval chance, its band, range and similar decisions" }
  r1@{ shape: curv-trap, label: "<b>Right side</b><br/>'Next step': one sentence, for example 'Review 2 is drafted. Read it, then sign it. Cadence books the next one.'<br/>'History' (folded, closed at first): '4 entries. Latest: ...'<br/>Opened: approval, drafts, signatures, and what comes next (dashed)" }
  ch@{ shape: trap-t, label: "Click the 'History' header, or press Enter or Space on it" }
  pch@{ shape: rect, label: "Timeline shows; click again to fold it" }
  u1@{ shape: rect, label: "<b>Case not approved yet: Authorization and Units used say 'Not approved yet'</b><br/>Reviews due says 'None until the request is approved'<br/>(no case reaches it at the start: each one not approved is also a request)" }
  u2@{ shape: rect, label: "After a signature: a 'Next review' line shows the date Cadence booked" }
  end
  d3@{ shape: diam, label: "Is a review due this week and not yet signed?" }
  c1@{ shape: trap-t, label: "Click 'Open the review'" }
  p2@{ shape: rect, label: "<b>Go to /authorizations?view=reviews&review= and the review ID</b><br/>The drawer opens over Reviews this week" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Reviews this week › The review drawer" }
  p3@{ shape: rect, label: "<b>No 'Open the review' button</b><br/>(the review is signed, or none is due)" }
  c2@{ shape: trap-t, label: "Click 'Back to Authorizations' or the crumb 'Authorizations'" }
  p4@{ shape: rect, label: "<b>Go to /authorizations</b><br/>The last view and filters used come back" }
  g3@{ shape: subproc, label: "Continues in: Authorizations › Worklist › Arrive and read the views" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › Ledger case page › Workflow line and history" }
  e1@{ shape: stadium, label: "Case is read" }
  s1 --> p1 --> d1
  d1 -->|"Yes"| g1
  d1 -->|"No"| d2
  d2 -->|"No"| n1 --> e2
  d2 -->|"Yes"| h1 --> m1 --> m2 --> r1
  m1 -.->|"A case that follows a payer workflow"| g4
  r1 --> ch --> pch
  m1 -.-> u1
  m2 -.-> u2
  r1 --> d3
  d3 -->|"Yes"| c1 --> p2 --> g2
  d3 -->|"No"| p3
  r1 --> c2 --> p4 --> g3
  p3 --> e1
  c2 -.-> e1
  class s1 k_start
  class p1,pch,u1,u2,p2,p3,p4 k_process
  class d1,d2,d3 k_decision
  class g1,g2,g3,g4 k_goto
  class n1,h1,m1,m2,r1 k_screen
  class e2 k_endx
  class ch,c1,c2 k_click
  class e1 k_end
  style gPage fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Authorizations › Ledger case page › Workflow line and history

A case that was prepared or reviewed in New Case follows a payer workflow, pinned by version. The ledger case page shows one row, 'Workflow', in the case summary, and the lines the workflow wrote appear in its folded History. The tracked quick view in Authorizations shows the same row and the three newest history lines. A case with no workflow shows neither. Workflows are clinic-wide; the case stays at its site.

Route: `/authorizations/case/ID (a ledger case) and the tracked quick view on /authorizations`

A case that is also a request opens the Authorizations case page instead (its facts row has 'Workflow', and its History holds the same lines). Those are drawn in New Case › Workflow › What the workflow adds to the history.

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
  s1@{ shape: stadium, label: "Open a ledger case, or open the quick view of a tracked row" }
  d1@{ shape: diam, label: "<b>Is there a New Case draft for this case with a workflow?</b><br/>Same case ID, or the patient's treatment episode" }
  p1@{ shape: rect, label: "<b>No 'Workflow' row</b><br/>History is the ledger's own" }
  sc1@{ shape: curv-trap, label: "<b>Card 'Case summary'</b><br/>Row 'Workflow': 'Initial Authorization, Residential SUD, version 3'<br/>or 'Default process for a concurrent review' with 'illustrative default'" }
  d2@{ shape: diam, label: "Did the workflow write lines that are not on a request?" }
  sc2@{ shape: curv-trap, label: "<b>'History' (folded)</b><br/>The ledger's lines plus the workflow's: 'Workflow applied: ...', 'Workflow ran to Eligibility & Benefits: ...', 'Waiting: ...'<br/>Each with its time" }
  c1@{ shape: trap-t, label: "Click the 'History' header" }
  p2@{ shape: rect, label: "The Timeline shows, oldest first; click again to fold it" }
  sc3@{ shape: curv-trap, label: "<b>Tracked quick view (right-hand panel)</b><br/>Row 'Workflow' after 'Payer'<br/>'Latest history': the three newest lines, the workflow's among them" }
  c2@{ shape: trap-t, label: "Click an approved row in Authorizations" }
  c3@{ shape: trap-t, label: "Click 'Open case'" }
  p3@{ shape: rect, label: "Opens the case page: the ledger case, or the Authorizations case page for a request" }
  e1@{ shape: stadium, label: "The workflow is read where the case is read" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Ledger case page › Open and read" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › New Case › Workflow › What the workflow adds to the history" }
  s1 --> d1
  d1 -->|"No"| p1 --> e1
  d1 -->|"Yes"| sc1 --> d2
  d2 -->|"Yes"| sc2 --> c1 --> p2 --> e1
  d2 -->|"No"| e1
  s1 --> c2 --> sc3 --> c3 --> p3 --> g1
  sc2 -.-> g2
  class s1 k_start
  class d1,d2 k_decision
  class p1,p2,p3 k_process
  class sc1,sc2,sc3 k_screen
  class c1,c2,c3 k_click
  class e1 k_end
  class g1,g2 k_goto
```
