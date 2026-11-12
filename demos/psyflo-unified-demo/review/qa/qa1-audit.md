# Interaction audit (QA1)

Controls swept: 338 on 10 targets. DOM 142 · DETAIL 108 · NAVIGATED 54 · STATE 19 · DISABLED-EXPLAINED 10 · NO-EFFECT-ALLOWED 3 · SKIPPED 1 · DOWNLOAD 1

## Per role

| Role | Targets | Controls | Findings |
|---|---|---|---|
| admin · 1440 px | 10 | 338 | 0 |

## Per route

| Target | Role | Controls | DETAIL | DISABLED-EXPLAINED | DOM | DOWNLOAD | NAVIGATED | NO-EFFECT-ALLOWED | SKIPPED | STATE |
|---|---|---|---|---|---|---|---|---|---|---|
| admin · Settings | admin | 26 | 4 | 2 | 10 |  | 8 |  | 1 | 1 |
| admin · Settings?view=outline | admin | 24 | 3 | 2 | 15 |  | 2 | 1 |  | 1 |
| admin · Settings?tab=rules | admin | 174 | 76 | 2 | 89 |  | 6 |  |  | 1 |
| admin · Settings?tab=rules [sections open] | admin | 21 |  |  | 21 |  |  |  |  |  |
| admin · Settings?tab=people | admin | 8 | 4 |  | 3 |  | 1 |  |  |  |
| admin · Settings?tab=roles | admin | 9 | 7 |  | 1 |  | 1 |  |  |  |
| admin · Settings?tab=units | admin | 7 | 5 |  | 1 |  | 1 |  |  |  |
| admin · Settings?tab=audit | admin | 26 | 1 |  | 1 | 1 | 23 |  |  |  |
| admin · Settings?tab=family | admin | 29 | 6 | 4 |  |  | 1 | 2 |  | 16 |
| admin · Settings?tab=presenter | admin | 14 | 2 |  | 1 |  | 11 |  |  |  |

## Findings (dead or unexplained controls, unnamed controls, console errors, dead ends)

None.

## No change by design (allowlist: active tab or toggle, text field, link to the current page, radio already selected)

- admin · Settings?view=outline · button "Outline" · active toggle
- admin · Settings?tab=family · button "Remote allowed" · active toggle
- admin · Settings?tab=family · button "Remote allowed" · active toggle

## Skipped on purpose

- admin · Settings · "Sign out Dana Owens" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
