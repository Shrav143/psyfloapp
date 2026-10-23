# Global shell

The sidebar, the top bar (site switcher, Ask FLO, Notifications, Demo menu with Viewing as), Help, Sign out, redirects and toasts.

Shapes and colours: see `00-overview.md`. Source: `workflows/src/01-global-shell/`.

## Global shell › Sidebar › Where every item goes

The sidebar is on every page. Each row below is one click and the page it opens. Number bubbles, the Authorizations group and the green highlight have their own diagrams.

Route: `Every page (sidebar on the left)`

The logo 'psyflo.', the caption 'Prior auth & UR', the captions 'Main' and 'Connections' and the 'Demo data' tile are labels only. Nothing happens when they are clicked.

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
  s1@{ shape: stadium, label: "Any page is open" }
  sb@{ shape: curv-trap, label: "<b>Sidebar</b><br/>Logo, then Main, Connections and the footer" }
  subgraph gFoot ["Footer"]
  cSet@{ shape: trap-t, label: "Click 'Settings'" }
  pSet@{ shape: rect, label: "Go to /settings" }
  gSet@{ shape: subproc, label: "Continues in: Settings" }
  cHelp@{ shape: trap-t, label: "Click 'Help'" }
  cOut@{ shape: trap-t, label: "Click 'Sign out'" }
  gFoot2@{ shape: subproc, label: "Continues in: Global shell › Sidebar footer › Settings, Help, Sign out, user card" }
  end
  subgraph gConn ["Connections"]
  cEmr@{ shape: trap-t, label: "Click 'EMR Connect'" }
  pEmr@{ shape: rect, label: "Go to /emr" }
  gEmr@{ shape: subproc, label: "Continues in: EMR Connect" }
  cPay@{ shape: trap-t, label: "Click 'Payers'" }
  pPay@{ shape: rect, label: "Go to /payers" }
  gPay@{ shape: subproc, label: "Continues in: Payers" }
  end
  subgraph gMain ["Main"]
  cDash@{ shape: trap-t, label: "Click 'Dashboard'" }
  pDash@{ shape: rect, label: "Go to /dashboard" }
  gDash@{ shape: subproc, label: "Continues in: Dashboard" }
  cAuth@{ shape: trap-t, label: "Click 'Authorizations'" }
  pAuth@{ shape: rect, label: "<b>Go to /authorizations</b><br/>The group opens under it" }
  gAuth@{ shape: subproc, label: "Continues in: Authorizations › Queue" }
  cNew@{ shape: trap-t, label: "<b>Click 'New case'</b><br/>(listed under Authorizations)" }
  pNew@{ shape: rect, label: "<b>Go to /authorizations/new</b><br/>A blank draft is started" }
  gNew@{ shape: subproc, label: "Continues in: Authorizations › New case › How a case starts and resumes" }
  cElig@{ shape: trap-t, label: "<b>Click 'Eligibility & Benefits'</b><br/>(listed under Authorizations)" }
  pElig@{ shape: rect, label: "Go to /authorizations/eligibility" }
  gElig@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits" }
  cDen@{ shape: trap-t, label: "Click 'Denial Intelligence'" }
  pDen@{ shape: rect, label: "Go to /denials" }
  gDen@{ shape: subproc, label: "Continues in: Denial Intelligence" }
  cMgr@{ shape: trap-t, label: "Click 'Case Manager'" }
  pMgr@{ shape: rect, label: "<b>Go to /manager</b><br/>Active cases tab" }
  gMgr@{ shape: subproc, label: "Continues in: Case Manager" }
  cAna@{ shape: trap-t, label: "Click 'Analytics'" }
  pAna@{ shape: rect, label: "Go to /analytics" }
  gAna@{ shape: subproc, label: "Continues in: Analytics" }
  end
  s1 --> sb
  sb --> cDash & cAuth & cNew & cElig & cDen & cMgr & cAna & cEmr & cPay & cSet & cHelp & cOut
  cDash --> pDash --> gDash
  cAuth --> pAuth --> gAuth
  cNew --> pNew --> gNew
  cElig --> pElig --> gElig
  cDen --> pDen --> gDen
  cMgr --> pMgr --> gMgr
  cAna --> pAna --> gAna
  cEmr --> pEmr --> gEmr
  cPay --> pPay --> gPay
  cSet --> pSet --> gSet
  cHelp --> gFoot2
  cOut --> gFoot2
  class s1 k_start
  class sb k_screen
  class cSet,cHelp,cOut,cEmr,cPay,cDash,cAuth,cNew,cElig,cDen,cMgr,cAna k_click
  class pSet,pEmr,pPay,pDash,pAuth,pNew,pElig,pDen,pMgr,pAna k_process
  class gSet,gFoot2,gEmr,gPay,gDash,gAuth,gNew,gElig,gDen,gMgr,gAna k_goto
  style gFoot fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gConn fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gMain fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Sidebar › Badges and what they count

Seven sidebar rows carry a number bubble. Each number is counted live from the demo data, so it changes the moment something happens on any page, and every one except Payers follows the site view. Analytics and EMR Connect never have a bubble.

Route: `Every page (sidebar on the left)`

Numbers shown are the values when the demo starts or after 'Reset demo data', for Jordan Perez on Both sites. For one site they are that site's share, and Site A plus Site B always equals Both sites. Payers is the one badge that stays the same for every viewer.

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
  s1@{ shape: stadium, label: "Any page is open" }
  sb@{ shape: curv-trap, label: "Sidebar rows with a number bubble" }
  p1@{ shape: rect, label: "Every number is recounted from the demo data each time the data changes or the site view changes (no reload)" }
  vw@{ shape: rect, label: "<b>The sites in view are read first</b><br/>Both sites for Jordan Perez and Alex Morgan, until they choose Site A or Site B; Site A for Dr. Rivera; Site B for Sam Okafor" }
  subgraph gDraw ["How a bubble is drawn"]
  d1@{ shape: diam, label: "Is the count above zero?" }
  z@{ shape: rect, label: "No bubble on that row" }
  nz@{ shape: rect, label: "A round bubble shows the number" }
  d2@{ shape: diam, label: "Is that row the green (current) one?" }
  on@{ shape: rect, label: "Bubble is translucent white on green" }
  off@{ shape: rect, label: "Bubble is tan with dark text" }
  end
  subgraph gB ["What each badge counts, and what moves it (Both sites)"]
  b1@{ shape: rect, label: "<b>'Dashboard'  3</b><br/>Requests at stage 'Info requested'<br/>Falls when an answer is sent" }
  b2@{ shape: rect, label: "<b>'Authorizations'  19</b><br/>Open queue items in 'Act now' (5) and 'Due within 24 hours' (14)<br/>'Due this week' is not counted" }
  b3@{ shape: rect, label: "<b>'New case'  4  (listed under Authorizations)</b><br/>Referrals that are New or In review and not yet opened<br/>Falls when a referral is opened" }
  b4@{ shape: rect, label: "<b>'Eligibility & Benefits'  9  (listed under Authorizations)</b><br/>Patients not cleared: 4 'Authorization first', 5 'Fix before billing'" }
  b5@{ shape: rect, label: "<b>'Denial Intelligence'  8</b><br/>Requests at stage 'Appeal' (open denials)<br/>Falls when a denial is settled" }
  b6@{ shape: rect, label: "<b>'Case Manager'  11</b><br/>3 cases that need a person (2 questions, 1 signature)<br/>plus 8 reviews that 'Need your update'" }
  b7@{ shape: rect, label: "<b>'Payers'  3</b><br/>Payers with a rule change waiting for a person: Cardinal, Evergreen and Harborview<br/>Falls when the change is acknowledged<br/>Clinic-wide: a payer's rules are not site data, so this number is the same for every viewer and every site view" }
  end
  g1@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › Add your update to a review" }
  e1@{ shape: stadium, label: "Badges always match the pages they point to, for the site in view" }
  s1 --> sb --> p1 --> vw
  vw --> d1
  d1 -->|"No"| z
  d1 -->|"Yes"| nz --> d2
  d2 -->|"Yes"| on
  d2 -->|"No"| off
  z & on & off --> e1
  vw --> b1
  b1 ~~~ b2 ~~~ b3 ~~~ b4 ~~~ b5 ~~~ b6 ~~~ b7
  b6 --> g1
  class s1 k_start
  class sb k_screen
  class p1,vw,z,nz,on,off,b1,b2,b3,b4,b5,b6,b7 k_process
  class d1,d2 k_decision
  class g1 k_goto
  class e1 k_end
  style gDraw fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gB fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Sidebar › Authorizations group and green highlight

Two rules decide what the sidebar looks like. First, whether the Authorizations group shows its two sub rows. Second, which single row turns green. There is no collapse button: the group follows the address.

Route: `Any address (the sidebar reads the address after every change)`

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
  s1@{ shape: stadium, label: "<b>The address changes</b><br/>(a click, a link, a redirect or the browser Back button)" }
  d1@{ shape: diam, label: "Does the address start with /authorizations?" }
  open@{ shape: rect, label: "<b>Group is open</b><br/>'New case' and 'Eligibility & Benefits' are listed under 'Authorizations'<br/>Chevron points down" }
  shut@{ shape: rect, label: "<b>Group is closed</b><br/>The two sub rows are hidden<br/>Chevron points right" }
  subgraph gHi ["Which row is green"]
  d2@{ shape: diam, label: "Which address is it?" }
  h1@{ shape: rect, label: "<b>'Authorizations' turns green</b><br/>Address is exactly /authorizations, or a case: /authorizations/case/..." }
  h2@{ shape: rect, label: "<b>'New case' turns green, 'Authorizations' stays plain</b><br/>/authorizations/new, a draft, or a referral" }
  h3@{ shape: rect, label: "<b>'Eligibility & Benefits' turns green, 'Authorizations' stays plain</b><br/>/authorizations/eligibility, /verify or a result" }
  h4@{ shape: rect, label: "<b>'Dashboard' turns green</b><br/>/dashboard (also when the address has ?request=)" }
  h5@{ shape: rect, label: "<b>'Denial Intelligence' turns green</b><br/>/denials and a brief under it" }
  h6@{ shape: rect, label: "<b>'Case Manager' turns green</b><br/>/manager, either tab (the old /active also lands here)" }
  h7@{ shape: rect, label: "<b>'Analytics', 'EMR Connect' or 'Payers' turns green</b><br/>/analytics, /emr, /payers and a payer under it" }
  h8@{ shape: rect, label: "<b>'Settings' in the footer turns green</b><br/>/settings" }
  h9@{ shape: rect, label: "<b>No row is green</b><br/>An address that is not part of the demo" }
  end
  subgraph gClick ["Clicks that change the group"]
  c1@{ shape: trap-t, label: "Click 'Authorizations' while on a sub page" }
  r1@{ shape: rect, label: "<b>Go to /authorizations</b><br/>Group stays open, 'Authorizations' turns green" }
  c2@{ shape: trap-t, label: "<b>Click any row outside the group</b><br/>(for example 'Dashboard')" }
  r2@{ shape: rect, label: "Group closes: the address no longer starts with /authorizations" }
  end
  e1@{ shape: stadium, label: "Exactly one row is green at a time" }
  s1 --> d1
  d1 -->|"Yes"| open
  d1 -->|"No"| shut
  open & shut --> d2
  d2 -->|"/authorizations or a case"| h1
  d2 -->|"New case pages"| h2
  d2 -->|"Eligibility pages"| h3
  d2 -->|"/dashboard"| h4
  d2 -->|"/denials"| h5
  d2 -->|"/manager"| h6
  d2 -->|"Analytics, EMR, Payers"| h7
  d2 -->|"/settings"| h8
  d2 -->|"Anything else"| h9
  h1 & h2 & h3 & h4 & h5 & h6 & h7 & h8 & h9 --> e1
  open --> c1 --> r1 --> e1
  open --> c2 --> r2 --> e1
  class s1 k_start
  class d1,d2 k_decision
  class open,shut,h1,h2,h3,h4,h5,h6,h7,h8,h9,r1,r2 k_process
  class c1,c2 k_click
  class e1 k_end
  style gHi fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gClick fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Top bar › Controls and how drawers close

The top bar holds the site view on the left and three controls on the right: the Demo menu, the 'Ask FLO' button and the 'Notifications' bell. The two drawers close the same three ways. There is no search box and no page title in the bar.

Route: `Every page (top bar, right side)`

Privacy mode is not a control. It is always on and is explained on the Settings page. The Demo menu is for the demo only and is not part of the product.

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
  s1@{ shape: stadium, label: "Any page is open" }
  tb@{ shape: curv-trap, label: "<b>Top bar (stays at the top while the page scrolls)</b><br/>Site view on the left, then 'Demo' with the clock, 'Ask FLO' sparkle button, 'Notifications' bell" }
  nar@{ shape: rect, label: "On a narrow window (under 1024 px) the 'As of' date and the word 'Demo' are hidden so nothing wraps; the clock pill stays" }
  site@{ shape: curv-trap, label: "<b>Site view</b><br/>'Both sites | Site A | Site B', or a locked 'Site A only' for a one-site viewer" }
  gSite@{ shape: subproc, label: "Continues in: Global shell › Top bar › Site switcher" }
  cDemo@{ shape: trap-t, label: "<b>Click 'Demo'</b><br/>(the pill shows the clock, for example 'Tue 10:42 am')" }
  oDemo@{ shape: win-pane, label: "Demo menu opens under the button" }
  gDemo@{ shape: subproc, label: "Continues in: Global shell › Demo menu › Open, close and what is inside" }
  cAsk@{ shape: trap-t, label: "Click 'Ask FLO'" }
  oAsk@{ shape: win-pane, label: "Ask FLO drawer slides in from the right (460 px)" }
  gAsk@{ shape: subproc, label: "Continues in: Global shell › Top bar › Ask FLO › Ask a question" }
  cBell@{ shape: trap-t, label: "<b>Click 'Notifications'</b><br/>(red dot on the bell when anything is unread)" }
  oNot@{ shape: win-pane, label: "Notifications drawer slides in from the right (440 px)" }
  gNot@{ shape: subproc, label: "Continues in: Global shell › Top bar › Notifications › Open, read, click through" }
  dim@{ shape: rect, label: "The page behind is dimmed. The dimmed area covers the top bar, so the three buttons cannot be clicked while a drawer is open" }
  one@{ shape: rect, label: "Only one drawer is open at a time: the app keeps Ask FLO and Notifications exclusive" }
  dClose@{ shape: diam, label: "How does the person close a drawer?" }
  kEsc@{ shape: trap-t, label: "<b>Press Escape</b><br/>(works wherever the cursor is)" }
  kX@{ shape: trap-t, label: "Click 'X' (Close) in the drawer header" }
  kScrim@{ shape: trap-t, label: "Click the dimmed area" }
  closed@{ shape: rect, label: "Drawer closes. The page underneath is exactly as it was, including scroll and filters" }
  keep@{ shape: rect, label: "Nothing typed is lost: the Ask FLO chat and any unsent question stay for the next time it opens" }
  e1@{ shape: stadium, label: "Back on the page" }
  s1 --> tb
  tb --> nar
  tb --> site --> gSite
  tb --> cDemo --> oDemo --> gDemo
  tb --> cAsk --> oAsk --> gAsk
  tb --> cBell --> oNot --> gNot
  oAsk --> dim
  oNot --> dim
  dim --> one --> dClose
  dClose -->|"Keyboard"| kEsc
  dClose -->|"Mouse"| kX
  dClose -->|"Mouse"| kScrim
  kEsc & kX & kScrim --> closed --> keep --> e1
  class s1 k_start
  class tb,site k_screen
  class nar,dim,one,closed,keep k_process
  class gSite,gDemo,gAsk,gNot k_goto
  class cDemo,cAsk,cBell,kEsc,kX,kScrim k_click
  class oDemo,oAsk,oNot k_overlay
  class dClose k_decision
  class e1 k_end
```

## Global shell › Top bar › Ask FLO › Ask a question

Open the drawer, pick a suggested question or type one, and read FLO's answer. The suggestions follow the screen the person is on. FLO answers from the demo data after a short pause, and only from the cases the viewer may see at the sites in view. What it says for each kind of question is in the next two diagrams.

Route: `Every page (Ask FLO drawer)`

The chat lives in the page, not in the demo data. It survives closing the drawer and changing pages, and 'Reset demo data' does not clear it. Reloading the browser does, and so does a change of viewer or of site (see the last row). The suggestions are worked out when the drawer opens, so a case page names its own case and payer.

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
  s1@{ shape: stadium, label: "Click 'Ask FLO' in the top bar" }
  o1@{ shape: win-pane, label: "<b>Ask FLO drawer opens</b><br/>Title 'Ask FLO', subtitle 'Your assistant, answering from your data'" }
  a1@{ shape: hex, label: "<b>FLO greets the person by name and says which sites it reads:</b><br/>'Hi Jordan, I am FLO. Ask me about your requests, a payer, or your denials. I answer from the data you can see: Both sites.'<br/>For Dr. Rivera: 'Hi Dr. Rivera, ... I answer from the data you can see: Site A.'" }
  dr@{ shape: diam, label: "Which screen is open?" }
  o2@{ shape: win-pane, label: "<b>Four suggestion chips under the chat:</b><br/>'What needs me today?'<br/>'What is due soonest?'<br/>'Which payers are slowest right now?'<br/>'Why is Cardinal's approval rate down?'<br/>Any other screen, or a case page that cannot be found" }
  oc@{ shape: win-pane, label: "<b>Three chips on a case page (/authorizations/case/R-1042):</b><br/>'What is missing for R-1042?'<br/>'When does this authorization run out?'<br/>'What does Summit require?'<br/>A line above them: 'Suggested for R-1042'" }
  om@{ shape: win-pane, label: "<b>One chip on Case Manager:</b><br/>'Which reviews are due?'<br/>'Suggested for Case Manager'" }
  od@{ shape: win-pane, label: "<b>One chip on Denial Intelligence:</b><br/>'Which denial is due first?'<br/>'Suggested for Denial Intelligence'" }
  oe@{ shape: win-pane, label: "<b>One chip on Eligibility & Benefits (the list and its pages):</b><br/>'Which patients need a fix before billing?'<br/>'Suggested for Eligibility & Benefits'" }
  d1@{ shape: diam, label: "How does the person ask?" }
  c1@{ shape: trap-t, label: "Click a suggestion chip" }
  i1@{ shape: lean-r, label: "Type in the box 'Ask a question'" }
  d2@{ shape: diam, label: "Is there text, and is FLO idle?" }
  x1@{ shape: rect, label: "<b>'Send' stays disabled</b><br/>Enter does nothing<br/>(blank or spaces only, or FLO is still working)" }
  c2@{ shape: trap-t, label: "Click 'Send' or press Enter" }
  p1@{ shape: rect, label: "<b>The question appears on the right in a green bubble</b><br/>The box is emptied" }
  p2@{ shape: rect, label: "<b>'FLO is working…' pulses under the chat</b><br/>'Send' is disabled until FLO answers" }
  w1@{ shape: delay, label: "About 0.7 seconds" }
  a2@{ shape: hex, label: "<b>FLO answers from the live demo data</b><br/>(picks the answer by key words)" }
  g1@{ shape: subproc, label: "Continues in: Global shell › Top bar › Ask FLO › What FLO answers" }
  d3@{ shape: diam, label: "Does the answer carry a link?" }
  c3@{ shape: trap-t, label: "Click the underlined link under the answer" }
  p3@{ shape: rect, label: "Drawer closes and the app opens that page" }
  g2@{ shape: subproc, label: "Continues in: Global shell › Top bar › Ask FLO › What FLO answers" }
  d4@{ shape: diam, label: "<b>Was the answer the fallback?</b><br/>('I did not find an answer...')" }
  p4@{ shape: rect, label: "<b>The chips are gone</b><br/>They show only while the chat has fewer than three messages, and while FLO is not working<br/>They come back, for the new screen, when the person has moved to another screen since the last message" }
  p7@{ shape: rect, label: "<b>The chips for this screen stay under the fallback answer</b><br/>A second miss keeps them. Any real answer takes them away" }
  c4@{ shape: trap-t, label: "Press Escape, click 'X' or click the dimmed area" }
  p5@{ shape: rect, label: "<b>Drawer closes</b><br/>The chat and any unsent text are kept" }
  p6@{ shape: rect, label: "<b>Open it again, on any page: the same chat is there</b><br/>Typed questions still work; the chips come back under a fallback answer, or when the screen has changed" }
  e1@{ shape: stadium, label: "Back on the page" }
  e2@{ shape: stadium, label: "No question sent" }
  s2@{ shape: stadium, label: "Change the viewer (Demo menu, 'Viewing as') or the site (top bar: Both sites, Site A, Site B)" }
  pv@{ shape: rect, label: "<b>The conversation starts again with a new greeting</b><br/>Whatever FLO said about the other view, including case IDs, does not stay on screen<br/>The chips are worked out again for the view" }
  s1 --> o1 --> a1 --> dr
  s2 --> pv --> a1
  dr -->|"Case page"| oc --> d1
  dr -->|"Case Manager"| om --> d1
  dr -->|"Denial Intelligence"| od --> d1
  dr -->|"Eligibility & Benefits"| oe --> d1
  dr -->|"Anywhere else"| o2 --> d1
  d1 -->|"Suggestion"| c1 --> p1
  d1 -->|"Typed"| i1 --> d2
  d2 -->|"No"| x1 --> e2
  d2 -->|"Yes"| c2 --> p1
  p1 --> p2 --> w1 --> a2 --> g1
  a2 --> d4
  d4 -->|"No"| p4 --> d3
  d4 -->|"Yes"| p7 --> c1
  d3 -->|"Yes"| c3 --> p3 --> g2
  d3 -->|"No"| c4
  c4 --> p5 --> p6 --> e1
  x1 -.-> i1
  class s1,s2 k_start
  class o1,o2,oc,om,od,oe k_overlay
  class a1,a2 k_agent
  class dr,d1,d2,d3,d4 k_decision
  class c1,c2,c3,c4 k_click
  class i1 k_input
  class x1,p1,p2,p3,p4,p7,p5,p6,pv k_process
  class w1 k_wait
  class g1,g2 k_goto
  class e1 k_end
  class e2 k_endx
```

## Global shell › Top bar › Ask FLO › What FLO answers

FLO lowercases the question and tries its rules in order. The first rule that matches answers, so a question with two key words gets the earlier answer. Counts, names and the request or denial it points to come from the live demo data. Only the Cardinal answer is fixed text, and even that counts only the unsent drafts at the sites in view. Five rules read the screen the person is on and are drawn in the next diagram. Every rule reads only the cases at the sites in view.

Route: `Every page (Ask FLO drawer)`

Typed questions use the same rules as the suggestion chips. Most rules ignore the page; the five on the next diagram use the open case page when the question does not name a case. Every link opens a view that matches the answer. PRD 08 describes row-level citations, thumbs and an escalate action on each answer; the demo gives one paragraph and one link instead.

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
  s1@{ shape: stadium, label: "<b>A question is sent</b><br/>(a chip or typed text)" }
  sx@{ shape: rect, label: "<b>FLO first narrows the data to the cases the viewer may see</b><br/>Both sites, Site A or Site B; a viewer limited to one site gets that site only<br/>Counts and names are for those cases, and a count says 'at Site A' when one site is in view<br/>A case at the other site is never named, counted or linked: 'I did not find I-2207 among the cases you can see.'" }
  d1@{ shape: diam, label: "Contains 'slow', or both 'payer' and 'late'?" }
  a1@{ shape: hex, label: "<b>FLO lists every payer slower than its typical time, worst first:</b><br/>'Evergreen is averaging 3.4 days against 2 typical. Cardinal is averaging 2.8 days against 2 typical. Beacon ... Lakeshore ... Harborview ...<br/>Caller phones when a payer passes twice its typical time.'<br/>If none is slower: 'Every payer is deciding within its typical time right now.'" }
  l1@{ shape: trap-t, label: "Click 'Open Analytics, turnaround'" }
  r1@{ shape: rect, label: "<b>Opens /analytics</b><br/>The Analytics page opens; Turnaround is one of its four figures" }
  g1@{ shape: subproc, label: "Continues in: Analytics › Headline figures" }
  dn@{ shape: diam, label: "<b>Contains 'billing', 'eligib' or 'fix before'?</b><br/>Or 'missing' or 'incomplete'?<br/>Or 'expir', 'run out', 'units' or 'end' (not with 'denial')?<br/>Or 'require'?<br/>Or 'review' (not 'under review')?" }
  an@{ shape: hex, label: "<b>FLO answers from the screen you are on or the case you name:</b><br/>what is missing for a case, when an authorization ends, what a payer requires, which reviews are due, which patients need a fix before billing<br/>Each names the case, quotes live data, says once that it is FLO's reading, and ends with a link to the exact place" }
  gn@{ shape: subproc, label: "Continues in: Global shell › Top bar › Ask FLO › Answers that read the screen" }
  d2@{ shape: diam, label: "Contains 'denial'?" }
  a2@{ shape: hex, label: "<b>'8 denials are open. The nearest deadline is D-3318 (Cardinal), peer-to-peer window, 36 h left. Call booked Wed 9 to 11 am. The brief is ready. The chance of winning is 64%. 3 more deadlines fall this week.'</b><br/>The count, the nearest open denial and the time left are live, so the sentence follows the data and the clock<br/>One muted line: 'This is FLO's reading of the demo data, not a payer confirmation.'<br/>FLO gives no dollar figure: a question that only asks about money gets the fallback answer" }
  l2@{ shape: trap-t, label: "Click 'Open Denial Intelligence'" }
  r2@{ shape: rect, label: "<b>Opens /denials?id=D-3318, the nearest denial</b><br/>With no deadline left to name, it opens the list" }
  g2@{ shape: subproc, label: "Continues in: Denial Intelligence › A denial opened" }
  d2b@{ shape: diam, label: "Contains 'due', 'soon' or 'deadline'?" }
  a2b@{ shape: hex, label: "<b>'R-0988 (Beacon) is due soonest: review due in 3 h. Its approval chance is 79%. After it: R-1042 (Summit), notice due in 5 h; I-2207 (Cardinal), recert due in 5 h. 56 requests are open in Authorizations.'</b><br/>For one site: 'is due soonest at Site A: ...' and only that site's open requests are counted<br/>Read from the open queue, soonest due first. Two due at the same time: the lower approval chance first<br/>Nothing open: 'Nothing is due. Every open request has been sent or handled.' with 'Open Authorizations'" }
  l2b@{ shape: trap-t, label: "Click 'Open R-0988'" }
  r2b@{ shape: rect, label: "<b>Opens /authorizations/case/R-0988</b><br/>The case page of the request due soonest" }
  g2b@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  d3@{ shape: diam, label: "Contains 'cardinal' or 'approval rate'?" }
  a3@{ shape: hex, label: "<b>'Cardinal approved 63% as asked over the last 90 days, down 11 points. Historian links most of the drop to continued-stay evidence. Cardinal also published criteria version 2026.3, which affects 4 drafts you have not sent.'</b><br/>Fixed text" }
  l3@{ shape: trap-t, label: "Click 'Open Payers, Cardinal, Changes'" }
  g3@{ shape: subproc, label: "Continues in: Payers › History & Changes › Read what changed" }
  d4@{ shape: diam, label: "Contains 'need', 'today' or 'first'?" }
  a4@{ shape: hex, label: "<b>'3 requests need you: R-1042, I-2207, P-1499. Start with this: Review and sign R-0988, review due in 3 h.' then one line each for the next four, e.g. 'Answer Scribe's question on R-1042, notice due in 5 h.'</b><br/>It is the same list as Do next on the Dashboard, so the two never disagree; counts and IDs are live, and a Site A viewer gets 'need you at Site A' and only Site A cases<br/>One muted line: 'This is the Do next list on the Dashboard, worked out from today's demo data.'<br/>Nothing waiting: 'Nothing needs you right now.' with 'Open Dashboard'" }
  l4@{ shape: trap-t, label: "Click 'Open Do next on the Dashboard'" }
  r4@{ shape: rect, label: "<b>Opens /dashboard</b><br/>The Do next card is the first card under the Lifecycle" }
  g4@{ shape: subproc, label: "Continues in: Dashboard › Do next › What to do now and where each button leads" }
  d5@{ shape: diam, label: "Contains 'referral'?" }
  a5@{ shape: hex, label: "'New referrals are waiting for review. Reader has already checked each document, and Verify has run coverage for the ones with an insurance card.'" }
  l5@{ shape: trap-t, label: "Click 'Start a case from a referral'" }
  g5@{ shape: subproc, label: "Continues in: Authorizations › New case › Intake › Start with a referral or patient" }
  a6@{ shape: hex, label: "<b>'I did not find an answer to that in the demo data. Try one of the suggestions below.'</b><br/>No link. The four suggestion chips stay right under this answer, so the sentence is true" }
  e1@{ shape: stadium, label: "Answer stays in the chat" }
  s1 --> sx --> d1
  d1 -->|"Yes"| a1 --> l1 --> r1 --> g1
  d1 -->|"No"| dn
  dn -->|"Yes"| an --> gn
  dn -->|"No"| d2
  d2 -->|"Yes"| a2 --> l2 --> r2 --> g2
  d2 -->|"No"| d2b
  d2b -->|"Yes"| a2b --> l2b --> r2b --> g2b
  d2b -->|"No"| d3
  d3 -->|"Yes"| a3 --> l3 --> g3
  d3 -->|"No"| d4
  d4 -->|"Yes"| a4 --> l4 --> r4 --> g4
  d4 -->|"No"| d5
  d5 -->|"Yes"| a5 --> l5 --> g5
  d5 -->|"No"| a6 --> e1
  class s1 k_start
  class sx,r1,r2,r2b,r4 k_process
  class d1,dn,d2,d2b,d3,d4,d5 k_decision
  class a1,an,a2,a2b,a3,a4,a5,a6 k_agent
  class l1,l2,l2b,l3,l4,l5 k_click
  class g1,gn,g2,g2b,g3,g4,g5 k_goto
  class e1 k_end
```

## Global shell › Top bar › Ask FLO › Answers that read the screen

Five of FLO's rules read the demo data for one case, one payer or one screen: what is missing, when an authorization ends, what a payer requires, which reviews are due, which patients need a fix before billing. When the question names a case ('R-1042') FLO uses it; otherwise it uses the case page that is open; otherwise the request that needs you first. Each answer names the case, quotes live data and ends with a link to the exact place. They are recommendations, never payer facts. They read only the cases at the sites in view: a case at the other site is 'not found' for a viewer limited to one site, and the review, coverage and denial counts are for the sites in view.

Route: `Every page (Ask FLO drawer)`

The short line 'This is FLO's reading of the demo data, not a payer confirmation.' appears once, under the answers that read payer rules, coverage or an authorization. The numbers and the wording are computed when the question is asked.

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
  s1@{ shape: stadium, label: "<b>A question reaches one of the five rules</b><br/>(a chip for the screen, or typed text)" }
  d0@{ shape: diam, label: "Which key words?" }
  subgraph gM ["Missing: 'What is missing for R-1042?'"]
  m1@{ shape: diam, label: "<b>Which case?</b><br/>Named in the question, else the open case page, else the request that needs you first, among the cases in view" }
  m2@{ shape: hex, label: "<b>FLO reads the case's draft</b><br/>Open items still unresolved, by kind: Missing, To settle, Risk<br/>The payer's document count from the saved Payers list" }
  m3@{ shape: diam, label: "Was the request already sent?" }
  m4@{ shape: odd, label: "'Nothing is missing for R-0870 (Summit, Residential 3.5). It was already sent, so it is with Summit and Navigator is tracking it.'" }
  m5@{ shape: odd, label: "<b>'R-1042 (Summit, Residential 3.5) has 3 open items in the draft.'</b><br/>'To settle: One date conflict needs your answer ...'<br/>'Risk: Relapse risk is high without a named step-down.'<br/>'Missing: A therapy note from the last 14 days is missing (8 of 9 Summit documents).'<br/>'Summit asks for 9 documents at Residential 3.5.'<br/>FLO's reading line" }
  ml@{ shape: trap-t, label: "Click 'Open R-1042, Recommended actions'" }
  end
  subgraph gX ["Expiry: 'When does this authorization run out?'"]
  x1@{ shape: hex, label: "FLO reads the Case Manager ledger row of the case and its next unsigned review" }
  x2@{ shape: diam, label: "What does the row hold?" }
  x3@{ shape: odd, label: "<b>End date: 'I-2207 (Cardinal, IOP) has used 38 of 48 units. The authorization ends in 3 days (Fri 10/23).'</b><br/>'Its next clinical review is Wed 10/21, 4:00 pm.'" }
  x4@{ shape: odd, label: "Measured in units, no date: 'has used 16 of 48 units, so 32 units are left. The ledger holds no end date for it.'" }
  x5@{ shape: odd, label: "<b>Other next event: 'has used 14 of 14 days. The approved days are used up. The payer's decision on the next stay is expected Thu 10/22.'</b><br/>No approval yet: 'has no approval yet, so there is nothing to run out.'" }
  xl@{ shape: trap-t, label: "Click 'Open I-2207'" }
  end
  subgraph gR ["Requires: 'What does Summit require?'"]
  r1@{ shape: hex, label: "<b>FLO reads the payer's saved configuration on Payers</b><br/>The payer is named in the question, else the open case's payer" }
  r2@{ shape: odd, label: "<b>On a case page: 'I-2207: Cardinal Health Plan asks for 6 documents at IOP: ASAM multidimensional assessment, ... and 2 more.'</b><br/>Otherwise: 'asks for 9 documents at Residential 3.5, 6 at IOP, 7 at PHP and 8 at Detox.'<br/>'Timing: ...' and 'After a denial: ...'<br/>'A change waits for you: Criteria changed, version 2026.3' when one is unacknowledged" }
  rl@{ shape: trap-t, label: "Click 'Open Payers, Cardinal, Documents'" }
  end
  subgraph gV ["Reviews: 'Which reviews are due?'"]
  v1@{ shape: hex, label: "FLO reads this week's clinical reviews that are not signed" }
  v2@{ shape: odd, label: "<b>'47 reviews are due this week, 5 of them due now or overdue: 35 drafted (29 clean), 4 not drafted yet, 8 need a clinician's update.'</b><br/>'Next: ...' and 'Needs your update: R-0912, R-0899, R-0881, and 5 more.'" }
  vl@{ shape: trap-t, label: "Click 'Open R-0912, review'" }
  end
  subgraph gE ["Eligibility: 'Which patients need a fix before billing?'"]
  e1@{ shape: hex, label: "FLO reads the coverage checks and their verdicts" }
  e2@{ shape: odd, label: "<b>'5 patients need a fix before billing.'</b><br/>One line each, in the screen's order: 'R-0921 (J.D., Cardinal): 14 of 14 days used.' 'R-1118 (A.F., Beacon): the plan does not cover the service.' 'I-2275 (E.K., Summit): another plan pays first.'<br/>FLO's reading line" }
  el@{ shape: trap-t, label: "Click 'Open R-0921 in Eligibility & Benefits'" }
  end
  n1@{ shape: stadium, label: "<b>Nothing to read: 'I did not find R-9999 among the cases you can see. (the same for a real case at the other site, e.g. I-2207 for Dr. Rivera)' or 'Tell me which payer, for example: What does Summit require?'</b><br/>The chips for the screen stay under it" }
  g1@{ shape: subproc, label: "Continues in: Authorizations › Case page › Recommended actions › The tab" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Case page › Ways in" }
  g3@{ shape: subproc, label: "Continues in: Payers › Rules & Instructions › Read the document list" }
  g4@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › The review drawer" }
  g5@{ shape: subproc, label: "Continues in: Authorizations › Eligibility & Benefits › Result › What the page shows" }
  s1 --> d0
  d0 -->|"missing, incomplete"| m1
  d0 -->|"expir, run out, units, end"| x1
  d0 -->|"require"| r1
  d0 -->|"review"| v1
  d0 -->|"billing, eligib, fix before"| e1
  m1 -->|"Found"| m2 --> m3
  m1 -->|"No such case"| n1
  m3 -->|"Yes"| m4 --> ml
  m3 -->|"No"| m5 --> ml
  ml --> g1
  x1 --> x2
  x2 -->|"Expiry date"| x3 --> xl
  x2 -->|"Units only"| x4 --> xl
  x2 -->|"Anything else"| x5 --> xl
  xl --> g2
  r1 --> r2 --> rl --> g3
  r1 -.-> n1
  v1 --> v2 --> vl --> g4
  e1 --> e2 --> el --> g5
  class s1 k_start
  class d0,m1,m3,x2 k_decision
  class m2,x1,r1,v1,e1 k_agent
  class m4,m5,x3,x4,x5,r2,v2,e2 k_toast
  class ml,xl,rl,vl,el k_click
  class n1 k_endx
  class g1,g2,g3,g4,g5 k_goto
  style gM fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gX fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gR fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gV fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gE fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Top bar › Site switcher

The left of the top bar shows the date the page is as of and the site view. A viewer who may see both sites gets a three-way switch; a viewer limited to one site gets a locked label and a note on why. Every screen follows the choice.

Route: `Every page (top bar, left side)`

The page title can show a small tag such as 'Site A' beside it when a viewer who may see both sites has narrowed the view to one. It is never shown with Both sites, and never for a one-site viewer, whose top bar already says so.

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
  s1@{ shape: stadium, label: "<b>Look at the left of the top bar</b><br/>'As of Tue, Oct 20' (wide windows only), then the site view" }
  d1@{ shape: diam, label: "<b>May the viewer see both sites?</b><br/>(Jordan Perez and Alex Morgan: yes. Dr. Rivera and Sam Okafor: no)" }
  subgraph gSw ["Viewer with both sites"]
  sw@{ shape: curv-trap, label: "<b>Switch with three buttons</b><br/>'Both sites', 'Site A', 'Site B'<br/>The chosen one is green and says it is pressed" }
  cA@{ shape: trap-t, label: "<b>Click 'Site A' (or press Enter or Space on it)</b><br/>Tab reaches each button" }
  cB@{ shape: trap-t, label: "Click 'Site B'" }
  cBoth@{ shape: trap-t, label: "Click 'Both sites'" }
  set@{ shape: rect, label: "<b>The site view is saved in the session</b><br/>Every list, count, badge and chart recomputes at once, on every screen" }
  say@{ shape: rect, label: "<b>A hidden status line announces it for screen readers</b><br/>'Showing Site A. Every screen follows this choice.'" }
  tag@{ shape: rect, label: "<b>Page titles can show a small 'Site A' tag</b><br/>Not with 'Both sites'" }
  cInfo@{ shape: trap-t, label: "Hover, focus or click the info icon 'About the site view'" }
  oInfo@{ shape: win-pane, label: "'Both sites shows everything you may see. Choose one site to narrow every list, count and chart on every screen to it. Staff limited to one site see only that site, with no switch.'" }
  end
  subgraph gLock ["Viewer with one site"]
  lock@{ shape: curv-trap, label: "<b>Locked label with a padlock</b><br/>'Site A only' (Dr. Rivera) or 'Site B only' (Sam Okafor)<br/>No switch, no 'Both sites'" }
  cWhy@{ shape: trap-t, label: "<b>Hover, focus or click the info icon</b><br/>'Why Dr. Rivera sees one site'" }
  oWhy@{ shape: win-pane, label: "'Dr. Rivera works at Site A, so Site A is the only site this role can see. Access is by site (minimum necessary): the other site's patients, requests and records are not listed, counted or searchable, and a link to one shows a notice instead.'" }
  fixed@{ shape: rect, label: "<b>The view cannot be changed from the top bar</b><br/>The other site does not exist for this viewer" }
  end
  kEsc@{ shape: trap-t, label: "Press Escape, click elsewhere or move away" }
  closed@{ shape: rect, label: "The note closes" }
  gOne@{ shape: subproc, label: "Continues in: Who can see what › Roles, sites and a record at the other site" }
  gOut@{ shape: subproc, label: "Continues in: Global shell › Demo menu › Viewing as" }
  e1@{ shape: stadium, label: "Every screen shows only the sites in view" }
  s1 --> d1
  d1 -->|"Yes"| sw
  d1 -->|"No"| lock
  sw --> cA & cB & cBoth --> set --> say --> tag --> e1
  sw --> cInfo --> oInfo --> kEsc
  lock --> fixed --> e1
  lock --> cWhy --> oWhy --> kEsc
  kEsc --> closed --> e1
  e1 --> gOne
  fixed -.-> gOut
  class s1 k_start
  class d1 k_decision
  class sw,lock k_screen
  class cA,cB,cBoth,cInfo,cWhy,kEsc k_click
  class set,say,tag,fixed,closed k_process
  class oInfo,oWhy k_overlay
  class gOne,gOut k_goto
  class e1 k_end
  style gSw fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gLock fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Top bar › Notifications › Open, read, click through

The bell opens a drawer with the notifications about the cases the viewer may see, newest first, and those that belong to no case (a payer rule change). A click on a row marks it read, closes the drawer and opens the page it points to. 'Mark all read' clears the ones in the list in one click. A viewer limited to one site never sees, counts or marks the other site's notifications.

Route: `Every page (Notifications drawer)`

Read and unread marks live in the demo data, so 'Reset demo data' brings back the four unread ones from the start. A notification belongs to the site of the case in its link (or named in its words); the bell's dot, the subtitle count and 'Mark all read' use only the notifications in view.

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
  s1@{ shape: stadium, label: "Click 'Notifications' (the bell) in the top bar" }
  bell@{ shape: curv-trap, label: "<b>Bell shows a red dot while any notification is unread</b><br/>(4 unread at the start)" }
  o1@{ shape: win-pane, label: "<b>Notifications drawer opens (440 px)</b><br/>Subtitle '4 unread', or 'You are all caught up' when none are left<br/>Button 'Mark all read'" }
  l1@{ shape: curv-trap, label: "<b>List, newest first</b><br/>Each row: agent badge, bold title, age ('16 min ago'), one line of text<br/>Unread rows are cream with a red dot" }
  ps@{ shape: rect, label: "<b>Which notifications are listed</b><br/>Both sites: all six, 4 unread<br/>Site A (Dr. Rivera): 4 listed (P-1499, R-1042, the Cardinal rule change, R-0912), 3 unread<br/>Site B (Sam Okafor): 3 listed (D-3297, R-0951, the Cardinal rule change), 2 unread<br/>The denial D-3297 and R-0951 are at Site B" }
  p0@{ shape: rect, label: "Ages follow the demo clock: after 'Fast-forward 1 hour' '16 min ago' reads '1 h ago'" }
  subgraph gRows ["The six notifications at the start"]
  n1@{ shape: rect, label: "<b>Packet · 'Payer asked for info' (unread)</b><br/>→ Dashboard, request P-1499" }
  n2@{ shape: rect, label: "<b>Scribe · 'Scribe has a question' (unread)</b><br/>→ New case, draft of R-1042" }
  n3@{ shape: rect, label: "<b>Advocate · 'Denied today' (unread)</b><br/>→ Denial Intelligence, D-3297" }
  n4@{ shape: rect, label: "<b>Cadence · 'Approved' (read)</b><br/>→ Dashboard, request R-0951" }
  n5@{ shape: rect, label: "<b>Sentinel · 'Payer rule changed' (unread)</b><br/>→ Payers, Cardinal, Changes" }
  n6@{ shape: rect, label: "<b>Caller · 'Very late' (read)</b><br/>→ Dashboard, request R-0912" }
  end
  c1@{ shape: trap-t, label: "Click a notification row" }
  st1@{ shape: cyl, label: "<b>That notification is saved as read</b><br/>(cream tint and red dot go)" }
  p1@{ shape: rect, label: "Drawer closes" }
  d1@{ shape: diam, label: "Does the notification have a destination?" }
  p2@{ shape: rect, label: "App goes to that page" }
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Open and read a request" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › New case › Authorization preparation › An agent asks a question" }
  g3@{ shape: subproc, label: "Continues in: Denial Intelligence › Open a denial" }
  g4@{ shape: subproc, label: "Continues in: Payers › History & Changes › Read what changed" }
  e0@{ shape: stadium, label: "Stays on the page" }
  c2@{ shape: trap-t, label: "Click 'Mark all read'" }
  st2@{ shape: cyl, label: "<b>Every notification in the list is saved as read</b><br/>The other site's stay unread for the people who can see them" }
  p3@{ shape: rect, label: "<b>Drawer stays open</b><br/>Subtitle becomes 'You are all caught up'<br/>The bell's red dot goes" }
  c3@{ shape: trap-t, label: "Press Escape, click 'X' or click the dimmed area" }
  p4@{ shape: rect, label: "Drawer closes. Read marks are kept" }
  e1@{ shape: stadium, label: "Back on the page" }
  s1 --> bell --> o1 --> l1
  l1 --> p0
  o1 --> ps
  l1 --> n1 & n2 & n3 & n4 & n5 & n6
  n1 & n2 & n3 & n4 & n5 & n6 --> c1
  c1 --> st1 --> p1 --> d1
  d1 -->|"Yes: all six do"| p2
  d1 -.->|"No (none today)"| e0
  p2 --> g1 & g2 & g3 & g4
  o1 --> c2 --> st2 --> p3 --> e1
  o1 --> c3 --> p4 --> e1
  class s1 k_start
  class bell,l1 k_screen
  class o1 k_overlay
  class ps,p0,n1,n2,n3,n4,n5,n6,p1,p2,p3,p4 k_process
  class c1,c2,c3 k_click
  class st1,st2 k_store
  class d1 k_decision
  class g1,g2,g3,g4 k_goto
  class e0,e1 k_end
  style gRows fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Top bar › Notifications › What creates a notification

A notification is created only when a person or a demo control does something. Nothing arrives on a timer. The one exception is the demo clock: moving it past a patient's re-check time makes Verify re-check them. Each row below is one action, the notification it adds and the page that notification opens.

Route: `Every page (the bell)`

Each notification is added at the top, unread, stamped with the demo clock ('just now'). Most also raise a toast, shown in 'Toasts'.

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
  s1@{ shape: stadium, label: "A person or a demo control does something in the app" }
  subgraph gPay ["Payers"]
  c10@{ shape: trap-t, label: "<b>Click 'Update drafts' on a payer's change</b><br/>(after 'Acknowledge change', which only raises a toast)" }
  n10@{ shape: cyl, label: "<b>The change's agent or Scribe · 'Drafts updated'</b><br/>→ Case Manager" }
  end
  subgraph gRef ["Referrals (New case)"]
  c9@{ shape: trap-t, label: "<b>Click 'Use sample referral'</b><br/>(or drop referral documents)" }
  n9@{ shape: cyl, label: "<b>Reader · 'New referral read'</b><br/>→ that referral" }
  c9b@{ shape: trap-t, label: "'Demo: simulate the referrer's reply'" }
  n9b@{ shape: cyl, label: "<b>Reader · 'The referrer replied'</b><br/>→ that referral" }
  end
  subgraph gDen ["Denial Intelligence"]
  c8@{ shape: trap-t, label: "Click 'Analyze the denial' on an uploaded letter" }
  n8@{ shape: cyl, label: "<b>Advocate · 'Denial analyzed'</b><br/>→ that denial" }
  c8b@{ shape: trap-t, label: "Sign and file an appeal" }
  n8b@{ shape: cyl, label: "<b>Navigator · 'Appeal filed'</b><br/>→ Dashboard, that request" }
  c8c@{ shape: trap-t, label: "Click 'Accept and close'" }
  n8c@{ shape: cyl, label: "<b>Cadence · 'Denial closed'</b><br/>→ Case Manager, Reviews this week" }
  c8d@{ shape: trap-t, label: "Click 'Log the outcome'" }
  n8d@{ shape: cyl, label: "<b>Advocate · 'Call outcome: ...'</b><br/>→ Dashboard, that request" }
  end
  subgraph gElig ["Eligibility & Benefits"]
  c11@{ shape: trap-t, label: "<b>Demo menu, 'Fast-forward 1 hour' or 'Fast-forward 1 day', past a patient's re-check time</b><br/>Or resume Verify in Settings after a pause" }
  n11@{ shape: cyl, label: "<b>Verify · 'Re-checked automatically' or 'Re-checked N patients automatically'</b><br/>→ Eligibility & Benefits, that patient or the list<br/>Not while Verify is paused" }
  end
  subgraph gAuth ["Authorizations"]
  c7@{ shape: trap-t, label: "<b>Apply recommendations on a case</b><br/>(Actions tab)" }
  n7@{ shape: cyl, label: "<b>Forecaster · 'Approval chance updated'</b><br/>→ that case" }
  end
  subgraph gDash ["Dashboard › Demo controls on a request"]
  c4@{ shape: trap-t, label: "'Asks for information'" }
  n4@{ shape: cyl, label: "<b>Packet · 'Payer asked for info'</b><br/>→ Dashboard, that request" }
  c5@{ shape: trap-t, label: "'Approves'" }
  n5@{ shape: cyl, label: "<b>Cadence · 'Approved'</b><br/>→ Dashboard, that request" }
  c6@{ shape: trap-t, label: "'Approves part' or 'Denies'" }
  n6@{ shape: cyl, label: "<b>Advocate · 'Partly approved' or 'Denied'</b><br/>→ Denial Intelligence, new D- number" }
  end
  subgraph gSend ["New case"]
  c1@{ shape: trap-t, label: "Click 'Sign and send'" }
  n1@{ shape: cyl, label: "<b>Navigator · 'Sent to the payer'</b><br/>→ Dashboard, that request" }
  end
  p1@{ shape: rect, label: "<b>Notification is added at the top of the list</b><br/>Unread, 'just now'" }
  p2@{ shape: rect, label: "<b>Red dot appears on the bell</b><br/>Drawer subtitle counts it ('5 unread')" }
  g1@{ shape: subproc, label: "Continues in: Global shell › Top bar › Notifications › Open, read, click through" }
  e1@{ shape: stadium, label: "Nothing else creates one: no timers, no payer or referrer replies on their own" }
  s1 --> c1 & c4 & c5 & c6 & c7 & c8 & c8b & c8c & c8d & c9 & c9b & c10 & c11
  c1 --> n1
  c4 --> n4
  c5 --> n5
  c6 --> n6
  c7 --> n7
  c8 --> n8
  c8b --> n8b
  c8c --> n8c
  c8d --> n8d
  c9 --> n9
  c9b --> n9b
  c10 --> n10
  c11 --> n11
  n1 & n4 & n5 & n6 & n7 & n8 & n8b & n8c & n8d & n9 & n9b & n10 & n11 --> p1
  p1 --> p2 --> g1
  s1 -.-> e1
  class s1 k_start
  class c10,c9,c9b,c8,c8b,c8c,c8d,c11,c7,c4,c5,c6,c1 k_click
  class n10,n9,n9b,n8,n8b,n8c,n8d,n11,n7,n4,n5,n6,n1 k_store
  class p1,p2 k_process
  class g1 k_goto
  class e1 k_endx
  style gPay fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gRef fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gDen fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gElig fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gAuth fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gDash fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gSend fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Demo menu › Open, close and what is inside

The Demo menu is the presenter's control panel. It is not part of the product. It moves the demo clock, jumps along a suggested path and resets the data. This diagram shows what is in it and how it closes.

Route: `Every page (top bar, 'Demo' button)`

There is no privacy-mode switch here: privacy mode is always on (see Settings). Escape closes this menu, like the two drawers, one layer at a time.

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
  s1@{ shape: stadium, label: "<b>Click 'Demo' in the top bar</b><br/>(pill shows the clock, 'Tue 10:42 am')" }
  o1@{ shape: win-pane, label: "<b>Demo menu opens under the button (340 px, or the window width minus a margin)</b><br/>It scrolls inside itself when the window is short" }
  subgraph gT ["Section 'Time'"]
  t1@{ shape: rect, label: "<b>Text: 'The demo clock is Tue Oct 20 2026, 10:42 am. It only moves when you move it.'</b><br/>(the date and time follow the clock)" }
  f1@{ shape: trap-t, label: "Click 'Fast-forward 1 hour'" }
  f2@{ shape: trap-t, label: "Click 'Fast-forward 1 day'" }
  g1@{ shape: subproc, label: "Continues in: Global shell › Demo menu › Fast-forward the demo clock" }
  end
  subgraph gV ["Section 'Viewing as'"]
  vt@{ shape: rect, label: "Text: 'Access is by site (minimum necessary). Try Dr. Rivera, who sees Site A only.'" }
  fv@{ shape: trap-t, label: "Click a person, for example 'Dr. Rivera'" }
  g4@{ shape: subproc, label: "Continues in: Global shell › Demo menu › Viewing as" }
  end
  subgraph gP ["Section 'Suggested path'"]
  sp@{ shape: rect, label: "Seven numbered steps, 1 to 7" }
  f3@{ shape: trap-t, label: "Click a step, for example '7 Case Manager: reviews this week'" }
  g2@{ shape: subproc, label: "Continues in: Global shell › Demo menu › Suggested path" }
  end
  subgraph gR ["Below a divider (red text)"]
  f4@{ shape: trap-t, label: "Click 'Reset demo data'" }
  g3@{ shape: subproc, label: "Continues in: Global shell › Demo menu › Reset demo data" }
  end
  d1@{ shape: diam, label: "What happens to the open menu?" }
  k1@{ shape: rect, label: "<b>Menu stays open after a Fast-forward or a choice in 'Viewing as'</b><br/>(the pill or the tick changes, so more clicks are possible)" }
  k2@{ shape: rect, label: "Menu closes, then the app opens the step's page" }
  k3@{ shape: rect, label: "Menu closes, the app goes to /dashboard" }
  x1@{ shape: trap-t, label: "Click anywhere outside the menu" }
  x2@{ shape: trap-t, label: "Click 'Demo' again" }
  x3@{ shape: trap-t, label: "Press Escape" }
  k4@{ shape: rect, label: "Menu closes (an outside click still reaches whatever was clicked)" }
  k5@{ shape: rect, label: "<b>Menu closes</b><br/>The page underneath is as it was" }
  e1@{ shape: stadium, label: "Menu is closed" }
  s1 --> o1
  o1 --> t1 & f1 & f2 & vt & sp & f4
  vt --> fv --> g4
  f1 --> g1
  f2 --> g1
  sp --> f3 --> g2
  f4 --> g3
  o1 --> d1
  d1 -->|"After Fast-forward or Viewing as"| k1
  d1 -->|"After a path step"| k2
  d1 -->|"After Reset"| k3
  d1 -->|"Mouse"| x1
  d1 -->|"Mouse"| x2
  d1 -->|"Keyboard"| x3
  x1 --> k4
  x2 --> k4
  x3 --> k5 --> e1
  k2 --> e1
  k3 --> e1
  k4 --> e1
  k1 -.-> o1
  class s1 k_start
  class o1 k_overlay
  class t1,vt,sp,k1,k2,k3,k4,k5 k_process
  class f1,f2,fv,f3,f4,x1,x2,x3 k_click
  class g1,g4,g2,g3 k_goto
  class d1 k_decision
  class e1 k_end
  style gT fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gV fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gP fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gR fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Demo menu › Fast-forward the demo clock

Fast-forward moves the demo clock by an hour or a day. It changes what is worked out from the clock: ages, countdowns and 'overdue' wording. The one thing it can start is Verify's automatic re-check of a patient whose re-check came due.

Route: `Every page (Demo menu › Time)`

The clock starts at Tue 20 Oct 2026, 10:42 am. It has no 'back' button: only 'Reset demo data' returns it.

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
  s1@{ shape: stadium, label: "Open the Demo menu" }
  c1@{ shape: trap-t, label: "Click 'Fast-forward 1 hour'" }
  c2@{ shape: trap-t, label: "Click 'Fast-forward 1 day'" }
  p1@{ shape: rect, label: "Clock moves forward 60 minutes" }
  p2@{ shape: rect, label: "Clock moves forward 1,440 minutes" }
  st1@{ shape: cyl, label: "<b>Demo clock saved</b><br/>(minutes since the start)" }
  p3@{ shape: rect, label: "<b>'Demo' pill shows the new time</b><br/>'Tue 11:42 am' after an hour, 'Wed 10:42 am' after a day" }
  t1@{ shape: odd, label: "<b>'Clock moved forward 1 hour' or 'Clock moved forward 1 day'</b><br/>'Times in stage and deadlines updated.'" }
  p4@{ shape: rect, label: "Toast fades after about 4 seconds. Every click adds its own toast. The menu stays open" }
  subgraph gMove ["What moves with the clock"]
  m1@{ shape: rect, label: "<b>Case Manager</b><br/>Tracker 'Clock' column, 'Being prepared' due pills ('Notice due in 5 h' becomes 'Overdue'), the 'Today' day card on Reviews this week" }
  m2@{ shape: rect, label: "<b>Notifications</b><br/>Ages: '16 min ago' becomes '1 h ago'" }
  m3@{ shape: rect, label: "<b>Dashboard</b><br/>Time in stage and 'late' flags" }
  m4@{ shape: rect, label: "<b>Authorizations, Denial Intelligence</b><br/>Queue bands, case clocks, peer-to-peer and appeal deadlines" }
  m5@{ shape: rect, label: "<b>Eligibility & Benefits, EMR Connect, New case</b><br/>How long ago a check, a sync or a referral was" }
  m6@{ shape: hex, label: "<b>Eligibility & Benefits</b><br/>Verify re-checks every patient whose re-check time has passed, unless Verify is paused in Settings<br/>A 'Re-checked automatically' notification follows" }
  end
  subgraph gStill ["What does not change"]
  s2@{ shape: rect, label: "No payer replies, no referral arrives, no agent finishes a step" }
  s3@{ shape: rect, label: "<b>No case changes status and no badge changes</b><br/>The only new notification a Fast-forward can add is Verify's" }
  s4@{ shape: rect, label: "Ask FLO answers and Case Manager review statuses stay as they were" }
  end
  subgraph gHow ["How things really arrive in the demo"]
  g1@{ shape: subproc, label: "Continues in: Dashboard › Request drawer › Demo controls (payer replies)" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › New case › Intake › Start with a referral or patient" }
  g3@{ shape: subproc, label: "Continues in: Global shell › Top bar › Notifications › What creates a notification" }
  end
  e1@{ shape: stadium, label: "Page keeps its place. Click again to move further" }
  s1 --> c1 & c2
  c1 --> p1 --> st1
  c2 --> p2 --> st1
  st1 --> p3 --> t1 --> p4 --> e1
  st1 --> m1 & m2 & m3 & m4 & m5 & m6
  st1 -.-> s2
  s2 --> s3 --> s4
  s2 --> g1
  s2 --> g2
  m6 -.-> g3
  class s1 k_start
  class c1,c2 k_click
  class p1,p2,p3,p4,m1,m2,m3,m4,m5,s2,s3,s4 k_process
  class st1 k_store
  class t1 k_toast
  class m6 k_agent
  class g1,g2,g3 k_goto
  class e1 k_end
  style gMove fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gStill fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gHow fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Demo menu › Suggested path

Seven numbered shortcuts for a guided walk through the demo. Each one closes the menu and opens a page. The numbers are only labels: the steps can be used in any order and as often as wanted. None of them changes any data or the clock.

Route: `Every page (Demo menu › Suggested path)`

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
  s1@{ shape: stadium, label: "Open the Demo menu" }
  o1@{ shape: win-pane, label: "<b>'SUGGESTED PATH'</b><br/>Seven buttons, each with a number in a circle" }
  p0@{ shape: rect, label: "<b>Every step does the same two things:</b><br/>the menu closes, then the app goes to the address" }
  c1@{ shape: trap-t, label: "Click '1  Dashboard: where every request stands'" }
  r1@{ shape: rect, label: "Go to /dashboard" }
  g1@{ shape: subproc, label: "Continues in: Dashboard" }
  c2@{ shape: trap-t, label: "Click '2  Authorizations: the queue'" }
  r2@{ shape: rect, label: "Go to /authorizations" }
  g2@{ shape: subproc, label: "Continues in: Authorizations › Queue" }
  c3@{ shape: trap-t, label: "Click '3  New case: start from a referral'" }
  r3@{ shape: rect, label: "<b>Go to /authorizations/new</b><br/>A blank draft is started and the address becomes /authorizations/new/draft-..." }
  g3@{ shape: subproc, label: "Continues in: Authorizations › New case › Intake › Start with a referral or patient" }
  c4@{ shape: trap-t, label: "Click '4  Eligibility & Benefits: verify a patient'" }
  r4@{ shape: rect, label: "Go to /authorizations/eligibility/verify" }
  g4@{ shape: subproc, label: "Continues in: Eligibility & Benefits › Verify a patient" }
  c5@{ shape: trap-t, label: "Click '5  Denial Intelligence: D-3318'" }
  r5@{ shape: rect, label: "Go to /denials?id=D-3318" }
  g5@{ shape: subproc, label: "Continues in: Denial Intelligence › Open a denial" }
  c6@{ shape: trap-t, label: "Click '6  Payers: Cardinal, Changes'" }
  r6@{ shape: rect, label: "Go to /payers/cardinal?tab=changes" }
  g6@{ shape: subproc, label: "Continues in: Payers › History & Changes › Read what changed" }
  c7@{ shape: trap-t, label: "Click '7  Case Manager: reviews this week'" }
  r7@{ shape: rect, label: "Go to /manager?tab=reviews" }
  g7@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › The list" }
  s1 --> o1 --> p0
  p0 --> c1 & c2 & c3 & c4 & c5 & c6 & c7
  c1 --> r1 --> g1
  c2 --> r2 --> g2
  c3 --> r3 --> g3
  c4 --> r4 --> g4
  c5 --> r5 --> g5
  c6 --> r6 --> g6
  c7 --> r7 --> g7
  class s1 k_start
  class o1 k_overlay
  class p0,r1,r2,r3,r4,r5,r6,r7 k_process
  class c1,c2,c3,c4,c5,c6,c7 k_click
  class g1,g2,g3,g4,g5,g6,g7 k_goto
```

## Global shell › Demo menu › Reset demo data

One click puts every part of the demo back to its starting point and lands on the Dashboard. Use it between run-throughs. There is no confirmation step.

Route: `Every page (Demo menu › Reset demo data)`

Not reset: the Ask FLO chat (it lives in the page). Anything done before a browser reload is gone anyway, because the demo keeps nothing between reloads.

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
  s1@{ shape: stadium, label: "Open the Demo menu" }
  c1@{ shape: trap-t, label: "Click 'Reset demo data' (red text, below the divider)" }
  p1@{ shape: rect, label: "The demo data is replaced by its starting copy, all at once" }
  subgraph gR ["What goes back to the start"]
  r1@{ shape: cyl, label: "<b>Clock: Tue 20 Oct 2026, 10:42 am</b><br/>('Demo' pill reads 'Tue 10:42 am')" }
  r2@{ shape: cyl, label: "Dashboard: all requests and denials, and all filters" }
  r3@{ shape: cyl, label: "Notifications: the original six, four unread. Open toasts are cleared" }
  r4@{ shape: cyl, label: "Authorizations: answers, applied actions, dismissals, draft edits" }
  r5@{ shape: cyl, label: "New case: the five drafts in progress, '4 sent today', referrals, referral badge" }
  r6@{ shape: cyl, label: "Eligibility & Benefits, Denial Intelligence, Payers, EMR Connect: all work done in them" }
  r9@{ shape: cyl, label: "Settings: every agent back at its starting level, every switch on, no pause" }
  r10@{ shape: cyl, label: "<b>Viewing as: Jordan Perez, UR coordinator, on Both sites</b><br/>(the site switch and the user card follow)" }
  r7@{ shape: cyl, label: "Case Manager: the 56 tracker rows and the 47 reviews. Signed reviews are unsigned, updates added are removed" }
  r8@{ shape: cyl, label: "Next denial number starts again at D-3319" }
  end
  p2@{ shape: rect, label: "Menu closes" }
  p3@{ shape: rect, label: "<b>App goes to /dashboard</b><br/>(even when already there, and from any other page)" }
  t1@{ shape: odd, label: "<b>'Demo data reset'</b><br/>'Everything is back to the starting point.'" }
  p4@{ shape: rect, label: "<b>Sidebar badges return to their starting numbers</b><br/>3, 19, 4, 9, 8, 11, 3" }
  p5@{ shape: rect, label: "Page-only state is lost as the page changes: Case Manager filters, open drawers, typed text" }
  p6@{ shape: rect, label: "Ask FLO chat stays: reset does not touch it" }
  e1@{ shape: stadium, label: "Demo is at its first screen again" }
  s1 --> c1 --> p1
  p1 --> r1 & r2 & r3 & r4 & r5 & r6 & r7 & r8 & r9 & r10
  r1 & r2 & r3 & r4 & r5 & r6 & r7 & r8 & r9 & r10 --> p2
  p2 --> p3 --> t1 --> p4 --> p5 --> p6 --> e1
  class s1 k_start
  class c1 k_click
  class p1,p2,p3,p4,p5,p6 k_process
  class r1,r2,r3,r4,r5,r6,r9,r10,r7,r8 k_store
  class t1 k_toast
  class e1 k_end
  style gR fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Demo menu › Viewing as

The Demo menu lists the four demo people. Choosing one changes who is viewing, and with it the sites that can be seen on every screen. The menu stays open, so people can be compared one after another.

Route: `Every page (Demo menu › Viewing as)`

Demo only. The default viewer is Jordan Perez on Both sites. 'Reset demo data' puts the viewer back to Jordan Perez on Both sites. The same switch is in Settings › Sites and access › 'View as'.

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
  s1@{ shape: stadium, label: "<b>Open the Demo menu</b><br/>Section 'Viewing as'" }
  o1@{ shape: win-pane, label: "<b>'Access is by site (minimum necessary). Try Dr. Rivera, who sees Site A only.'</b><br/>Four rows, each with initials, name and role" }
  subgraph gRows ["The four rows"]
  v1@{ shape: rect, label: "<b>Jordan Perez</b><br/>UR coordinator, both sites" }
  v2@{ shape: rect, label: "<b>Alex Morgan</b><br/>Clinic owner, both sites" }
  v3@{ shape: rect, label: "<b>Dr. Rivera</b><br/>Clinician, Site A" }
  v4@{ shape: rect, label: "<b>Sam Okafor</b><br/>Billing, Site B" }
  cur@{ shape: rect, label: "<b>The current viewer has a green tick</b><br/>Each row says whether it is pressed, for screen readers" }
  end
  c1@{ shape: trap-t, label: "Click a row, for example 'Dr. Rivera'" }
  d1@{ shape: diam, label: "Is it the viewer already shown?" }
  same@{ shape: rect, label: "Nothing changes except the toast" }
  sw@{ shape: rect, label: "<b>The viewer changes</b><br/>The site view becomes the viewer's only site, or Both sites for a viewer with two" }
  st@{ shape: cyl, label: "Session saved: viewer and site view" }
  t1@{ shape: odd, label: "<b>'Now viewing as Dr. Rivera'</b><br/>'Clinician, Site A. Only Site A is visible; the other site's records are not available.'<br/>For Jordan or Alex: 'UR coordinator. Both sites are visible.'" }
  subgraph gAll ["Everything on screen follows at once"]
  e1@{ shape: rect, label: "Top bar: the switch for a viewer with both sites, or the locked 'Site A only' label for one site" }
  e2@{ shape: rect, label: "<b>Sidebar: the user card shows the viewer's name and role</b><br/>Every badge recounts for the sites in view (Payers is clinic-wide and stays 3)" }
  e3@{ shape: rect, label: "The open page: lists, figures, charts and pickers leave out the other site" }
  e4@{ shape: rect, label: "A record that belongs to the other site now opens the notice 'This case is not available at Site A'" }
  e5@{ shape: rect, label: "<b>Edits and acknowledgements made from now on carry the viewer's name</b><br/>(Payers edit log, 'Acknowledged by')" }
  end
  g1@{ shape: subproc, label: "Continues in: Who can see what › Roles, sites and a record at the other site" }
  g2@{ shape: subproc, label: "Continues in: Settings › Sites and access › Read the roles and switch with View as" }
  g3@{ shape: subproc, label: "Continues in: Global shell › Demo menu › Reset demo data" }
  e9@{ shape: stadium, label: "The whole demo is seen as that person" }
  s1 --> o1
  o1 --> v1 & v2 & v3 & v4 & cur
  v3 --> c1
  c1 --> d1
  d1 -->|"Yes"| same --> e9
  d1 -->|"No"| sw --> st --> t1
  t1 --> e1 & e2 & e3 & e4 & e5
  e1 & e2 & e3 & e4 & e5 --> e9
  e9 --> g1
  e9 -.-> g2
  e9 -.-> g3
  class s1 k_start
  class o1 k_overlay
  class v1,v2,v3,v4,cur,same,sw,e1,e2,e3,e4,e5 k_process
  class c1 k_click
  class d1 k_decision
  class st k_store
  class t1 k_toast
  class g1,g2,g3 k_goto
  class e9 k_end
  style gRows fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gAll fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Sidebar footer › Settings, Help, Sign out, user card

The footer has a 'Demo data' tile, three rows (Settings, Help, Sign out) and the user card. Only Settings leaves the page. Help and Sign out answer with a short message, and the tile and the user card are plain labels.

Route: `Every page (bottom of the sidebar)`

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
  s1@{ shape: stadium, label: "Look at the bottom of the sidebar" }
  foot@{ shape: curv-trap, label: "<b>Footer</b><br/>'Demo data' tile, 'Settings', 'Help', 'Sign out', then the user card, 'JP  Jordan Perez  UR coordinator' until another viewer is chosen" }
  cTile@{ shape: trap-t, label: "Click the 'Demo data' tile" }
  pTile@{ shape: rect, label: "Nothing happens: it is a label only" }
  eTile@{ shape: stadium, label: "No change" }
  cSet@{ shape: trap-t, label: "Click 'Settings'" }
  pSet@{ shape: rect, label: "Go to /settings" }
  pSetOn@{ shape: rect, label: "<b>The 'Settings' row turns green while the address starts with /settings</b><br/>(the only footer row that highlights)" }
  gSet@{ shape: subproc, label: "Continues in: Settings" }
  cHelp@{ shape: trap-t, label: "Click 'Help'" }
  tHelp@{ shape: odd, label: "<b>'Help'</b><br/>'Press Ask FLO (top right) to ask a question. Use Demo, top right, to reset, move time forward or view as another person.'" }
  pHelp@{ shape: rect, label: "No page opens and no dialog: the message is the whole of Help" }
  dHelp@{ shape: diam, label: "What does the person do next?" }
  cAsk@{ shape: trap-t, label: "Click 'Ask FLO'" }
  cDemo@{ shape: trap-t, label: "Click 'Demo'" }
  gAsk@{ shape: subproc, label: "Continues in: Global shell › Top bar › Ask FLO › Ask a question" }
  gDemo@{ shape: subproc, label: "Continues in: Global shell › Demo menu › Open, close and what is inside" }
  cOut@{ shape: trap-t, label: "Click 'Sign out'" }
  tOut@{ shape: odd, label: "<b>'This is a demo'</b><br/>'There is nothing to sign out of.'" }
  pOut@{ shape: rect, label: "<b>The person stays signed in as whoever is viewing (Jordan Perez at the start)</b><br/>There is no login screen in the demo" }
  eOut@{ shape: stadium, label: "Same page, same data" }
  cCard@{ shape: trap-t, label: "<b>Click the user card</b><br/>(initials, name and role of the viewer: 'JP', 'Jordan Perez', 'UR coordinator')" }
  pCard@{ shape: rect, label: "Nothing happens: no menu, no profile page" }
  pWho@{ shape: rect, label: "<b>The viewer is the person edits and acknowledgements are credited to</b><br/>It changes with 'Viewing as' in the Demo menu: for Dr. Rivera the card reads 'Clinician, Site A'<br/>The Case Manager sign dialog says 'You are signed in as Jordan Perez, a UR coordinator'" }
  eCard@{ shape: stadium, label: "No change" }
  pToast@{ shape: rect, label: "Toasts fade after about 4 seconds, or on a click" }
  s1 --> foot
  foot --> cTile --> pTile --> eTile
  foot --> cSet --> pSet --> pSetOn --> gSet
  foot --> cHelp --> tHelp --> pHelp --> dHelp
  dHelp -->|"Ask a question"| cAsk --> gAsk
  dHelp -->|"Move the clock, reset or view as someone else"| cDemo --> gDemo
  foot --> cOut --> tOut --> pOut --> eOut
  foot --> cCard --> pCard --> eCard
  pCard -.-> pWho
  tHelp -.-> pToast
  tOut -.-> pToast
  class s1 k_start
  class foot k_screen
  class cTile,cSet,cHelp,cAsk,cDemo,cOut,cCard k_click
  class pTile,pSet,pSetOn,pHelp,pOut,pCard,pWho,pToast k_process
  class eTile,eCard k_endx
  class gSet,gAsk,gDemo k_goto
  class tHelp,tOut k_toast
  class dHelp k_decision
  class eOut k_end
```

## Global shell › Addresses › Old links, redirects and pages that do not exist

A few old or short addresses are sent on to the page that replaced them, and anything the demo does not know opens a 'Page not found' screen inside the normal sidebar and top bar. Redirects replace the address, so the Back button skips over the old one.

Route: `/  /active  /referrals  /referrals/:id  and any unknown address`

In the single-file build the address lives after a '#'. The hosted preview has no address bar, so it keeps the route in memory and the same rules apply.

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
  s1@{ shape: stadium, label: "<b>An address is opened</b><br/>(typed, a saved link, or a click)" }
  p0@{ shape: rect, label: "The app matches the address against its list of pages" }
  d1@{ shape: diam, label: "Which address is it?" }
  subgraph gRed ["Redirects (the old address is replaced)"]
  r1@{ shape: rect, label: "'/' goes to /dashboard" }
  g1@{ shape: subproc, label: "Continues in: Dashboard" }
  r2@{ shape: rect, label: "<b>'/active' goes to /manager</b><br/>Any '?tab=' on /active is dropped, so the Active cases tab opens" }
  g2@{ shape: subproc, label: "Continues in: Case Manager › Page › Arrive and read the header" }
  r3@{ shape: rect, label: "<b>'/referrals' goes to /authorizations/new</b><br/>Referrals no longer have a tab: they start Intake in New case" }
  r3b@{ shape: rect, label: "New case starts a blank draft and the address becomes /authorizations/new/draft-..." }
  g3@{ shape: subproc, label: "Continues in: Authorizations › New case › Intake › Start with a referral or patient" }
  r4@{ shape: rect, label: "'/referrals/RF-1234' goes to /authorizations/new/referral/RF-1234" }
  g4@{ shape: subproc, label: "Continues in: Authorizations › New case › Referral › The full referral page" }
  end
  subgraph gKnown ["Pages that exist"]
  k1@{ shape: rect, label: "<b>/dashboard, /authorizations..., /denials..., /manager, /analytics, /emr, /payers..., /settings</b><br/>The page opens and starts at the top" }
  g5@{ shape: subproc, label: "Continues in: Global shell › Sidebar › Where every item goes" }
  end
  subgraph gNo ["Anything else"]
  n1@{ shape: curv-trap, label: "<b>Page not found</b><br/>'That address is not part of the demo.'<br/>Empty card: 'Nothing here'<br/>'Use the sidebar to get back on track.'" }
  n2@{ shape: rect, label: "Sidebar and top bar stay as normal. No sidebar row is green. There is no button on the card" }
  n3@{ shape: trap-t, label: "Click any row in the sidebar" }
  g6@{ shape: subproc, label: "Continues in: Global shell › Sidebar › Where every item goes" }
  n4@{ shape: trap-t, label: "Click the browser Back button" }
  n5@{ shape: stadium, label: "Back on the page before the bad address" }
  end
  subgraph gOwn ["Known page, unknown record (the page answers)"]
  o1@{ shape: rect, label: "/authorizations/case/XYZ shows 'Request not found' with 'Back to the queue'" }
  o2@{ shape: rect, label: "/authorizations/new/XYZ shows 'We could not find that draft' with 'Start a new case'" }
  g7@{ shape: subproc, label: "Continues in: Authorizations › New case › How a case starts and resumes" }
  end
  s1 --> p0 --> d1
  d1 -->|"/"| r1 --> g1
  d1 -->|"/active"| r2 --> g2
  d1 -->|"/referrals"| r3 --> r3b --> g3
  d1 -->|"/referrals/id"| r4 --> g4
  d1 -->|"A page above"| k1 --> g5
  d1 -->|"Anything else"| n1 --> n2
  n2 --> n3 --> g6
  n2 --> n4 --> n5
  d1 -->|"Page exists, record does not"| o1
  o1 --> g7
  o2 --> g7
  d1 -.-> o2
  class s1 k_start
  class p0,r1,r2,r3,r3b,r4,k1,n2,o1,o2 k_process
  class d1 k_decision
  class g1,g2,g3,g4,g5,g6,g7 k_goto
  class n1 k_screen
  class n3,n4 k_click
  class n5 k_end
  style gRed fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gKnown fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gNo fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gOwn fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```

## Global shell › Toasts › How they appear and go

A toast is a small message card that confirms something happened. Any page can raise one. It stacks in the bottom right corner, fades after about four seconds, and goes at once when clicked. Toasts are never a place to act: they have no buttons.

Route: `Every page (bottom right corner)`

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
  s1@{ shape: stadium, label: "<b>A page or a control raises a toast</b><br/>(a title, an optional line of text, and a tone)" }
  p1@{ shape: rect, label: "<b>Toast joins the stack in the bottom right corner</b><br/>Newest at the bottom, each 340 px wide" }
  d1@{ shape: diam, label: "Which tone?" }
  t1@{ shape: odd, label: "<b>Good: green tick</b><br/>Done, saved, sent" }
  t2@{ shape: odd, label: "<b>Caution: amber triangle</b><br/>Something needs a look" }
  t3@{ shape: odd, label: "<b>Risk: red cross</b><br/>Denied, urgent" }
  t4@{ shape: odd, label: "<b>Neutral: grey 'i'</b><br/>Information only" }
  w1@{ shape: delay, label: "About 4 seconds pass" }
  p2@{ shape: rect, label: "That toast removes itself. Other toasts keep their own timers" }
  c1@{ shape: trap-t, label: "Click a toast" }
  p3@{ shape: rect, label: "That toast goes at once. Nothing else happens: no link, no undo" }
  p4@{ shape: rect, label: "Page changes do not remove toasts: they belong to the whole app" }
  p5@{ shape: rect, label: "'Reset demo data' empties the stack, then adds its own toast" }
  e1@{ shape: stadium, label: "Stack is empty" }
  subgraph gShell ["Toasts raised by the shell"]
  s2@{ shape: odd, label: "<b>'Help'</b><br/>'Press Ask FLO (top right) to ask a question. Use Demo, top right, to reset, move time forward or view as another person.'" }
  s3@{ shape: odd, label: "<b>'This is a demo'</b><br/>'There is nothing to sign out of.'" }
  s4@{ shape: odd, label: "<b>'Clock moved forward 1 hour' or '1 day'</b><br/>'Times in stage and deadlines updated.'" }
  s7@{ shape: odd, label: "<b>'Now viewing as Dr. Rivera'</b><br/>'Clinician, Site A. Only Site A is visible; the other site's records are not available.'<br/>(Demo menu › Viewing as, or Settings › View as)" }
  s5@{ shape: odd, label: "<b>'Demo data reset'</b><br/>'Everything is back to the starting point.'" }
  s6@{ shape: odd, label: "<b>Hosted preview only: 'Print is off in this preview'</b><br/>'Open the single-file version of the demo to use it.'<br/>Same for 'Copy link' and 'Download'" }
  end
  subgraph gMgr ["Toasts raised in Case Manager"]
  m1@{ shape: odd, label: "<b>'Cadence checked the next 3 days'</b><br/>(after 'Draft all due reviews')" }
  m2@{ shape: odd, label: "'Review signed', 'Review updated'" }
  m3@{ shape: odd, label: "'33 reviews signed' (the number varies) or 'No clean drafts to sign'" }
  g1@{ shape: subproc, label: "Continues in: Case Manager › Reviews this week › Sign a review" }
  end
  g2@{ shape: subproc, label: "Continues in: Site map › Every menu tab and sub tab" }
  s1 --> p1 --> d1
  d1 -->|"Done"| t1
  d1 -->|"Caution"| t2
  d1 -->|"Risk"| t3
  d1 -->|"Information"| t4
  t1 & t2 & t3 & t4 --> w1 --> p2 --> e1
  t1 & t2 & t3 & t4 --> c1 --> p3 --> e1
  p1 --> p4
  p4 --> p5
  s2 & s3 & s4 & s5 & s6 & s7 --> s1
  m1 & m2 & m3 --> s1
  m3 --> g1
  p5 --> g2
  class s1 k_start
  class p1,p2,p3,p4,p5 k_process
  class d1 k_decision
  class t1,t2,t3,t4,s2,s3,s4,s7,s5,s6,m1,m2,m3 k_toast
  class w1 k_wait
  class c1 k_click
  class e1 k_end
  class g1,g2 k_goto
  style gShell fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
  style gMgr fill:#FBF8F3,stroke:#D9CDBB,stroke-width:1.5px,color:#5B6B63
```
