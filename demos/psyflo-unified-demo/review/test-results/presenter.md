# presenter · FAIL

Run 2026-11-11T18-34-44Z · 142514 ms · instance 0 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | PRES-01 the product viewport has no "Reset" or "Demo:" text and no presenter controls (Presentation mode, dock hidden) |  |
| PASS | PRES-02 the dock is hidden by default, takes no tab stop, and is not in the page until opened |  |
| PASS | PRES-03 Ctrl+Shift+P opens the dock (focus on its toggle) and toggles it closed again; the page behind keeps its layout |  |
| PASS | PRES-04 collapsed: a 28 px handle is the only dock control; its menus stay out of the tab order until the dock is opened |  |
| PASS | PRES-05 the dock is visually unlike the product (navy ribbon, monospace PRESENTER label, dashed marigold edge) |  |
| FAIL | PRES-06 role switch changes the rail without a reload (clinician -> supervisor -> direct support -> administrator -> clinician) | page.click: Timeout 30000ms exceeded. |
| FAIL | PRES-07 "Demo data · nothing is real" is on every app screen (rail foot) and on the phone and portal screens | screens without the "Demo data · nothing is real" line expected [] but got ["MobileApp (phone)","MobileDictate (phone)","MobileAssess (phone)"] |
| PASS | PRES-08 scenario s1 from the dock lands on its route as its role |  |
| PASS | PRES-08 scenario s2 from the dock lands on its route as its role |  |
| PASS | PRES-08 scenario s3 from the dock lands on its route as its role |  |
| PASS | PRES-08 scenario s4 from the dock lands on its route as its role |  |
| PASS | PRES-08 scenario s5 from the dock lands on its route as its role |  |
| PASS | PRES-08 scenario s6 from the dock lands on its route as its role |  |
| PASS | PRES-09 the dock's menus: Reset offers Live flows and Canvas snapshot and asks before resetting; Simulate and Notes and Maturity work; Surfaces opens Lauris |  |
| PASS | PRES-10 clinician: Sign out (rail) ends the session and lands on the sign-in screen; the next load asks who you are |  |
| PASS | PRES-10 supervisor: Sign out (rail) ends the session and lands on the sign-in screen; the next load asks who you are |  |
| PASS | PRES-10 admin: Sign out (rail) ends the session and lands on the sign-in screen; the next load asks who you are |  |
| PASS | PRES-10 direct_support: Sign out (rail) ends the session and lands on the sign-in screen; the next load asks who you are |  |
| PASS | EXP-01 Explore mode: the dock is always open, the mode label is visible, Ctrl+Shift+P focuses it instead of hiding it, and Presentation mode can be restored |  |
| PASS | EXP-02 clinician: "All screens" lists every route this role may open and each opens in two clicks |  |
| FAIL | EXP-02 supervisor: "All screens" lists every route this role may open and each opens in two clicks | Eligibility opened as supervisor |
| PASS | EXP-02 admin: "All screens" lists every route this role may open and each opens in two clicks |  |
| PASS | EXP-02 direct_support: "All screens" lists every route this role may open and each opens in two clicks |  |
| PASS | EXP-03 portal screens in the picker open as the portal person (guardian, school) in Explore mode |  |
| PASS | EXP-04 clinician: every route this role may open is within three clicks of its home screen (product links: rail, page links) |  |
| PASS | EXP-04 supervisor: every route this role may open is within three clicks of its home screen (product links: rail, page links) |  |
| PASS | EXP-04 admin: every route this role may open is within three clicks of its home screen (product links: rail, page links) |  |
| PASS | EXP-04 direct_support: every route this role may open is within three clicks of its home screen (product links: rail, page links) |  |

## Output (tail)

```
PASS PRES-01 the product viewport has no "Reset" or "Demo:" text and no presenter controls (Presentation mode, dock hidden)
PASS PRES-02 the dock is hidden by default, takes no tab stop, and is not in the page until opened
PASS PRES-03 Ctrl+Shift+P opens the dock (focus on its toggle) and toggles it closed again; the page behind keeps its layout
PASS PRES-04 collapsed: a 28 px handle is the only dock control; its menus stay out of the tab order until the dock is opened
PASS PRES-05 the dock is visually unlike the product (navy ribbon, monospace PRESENTER label, dashed marigold edge)
FAIL PRES-06 role switch changes the rail without a reload (clinician -> supervisor -> direct support -> administrator -> clinician) — page.click: Timeout 30000ms exceeded.
FAIL PRES-07 "Demo data · nothing is real" is on every app screen (rail foot) and on the phone and portal screens — screens without the "Demo data · nothing is real" line expected [] but got ["MobileApp (phone)","MobileDictate (phone)","MobileAssess (phone)"]
PASS PRES-08 scenario s1 from the dock lands on its route as its role
PASS PRES-08 scenario s2 from the dock lands on its route as its role
PASS PRES-08 scenario s3 from the dock lands on its route as its role
PASS PRES-08 scenario s4 from the dock lands on its route as its role
PASS PRES-08 scenario s5 from the dock lands on its route as its role
PASS PRES-08 scenario s6 from the dock lands on its route as its role
PASS PRES-09 the dock's menus: Reset offers Live flows and Canvas snapshot and asks before resetting; Simulate and Notes and Maturity work; Surfaces opens Lauris
PASS PRES-10 clinician: Sign out (rail) ends the session and lands on the sign-in screen; the next load asks who you are
PASS PRES-10 supervisor: Sign out (rail) ends the session and lands on the sign-in screen; the next load asks who you are
PASS PRES-10 admin: Sign out (rail) ends the session and lands on the sign-in screen; the next load asks who you are
PASS PRES-10 direct_support: Sign out (rail) ends the session and lands on the sign-in screen; the next load asks who you are
PASS EXP-01 Explore mode: the dock is always open, the mode label is visible, Ctrl+Shift+P focuses it instead of hiding it, and Presentation mode can be restored
PASS EXP-02 clinician: "All screens" lists every route this role may open and each opens in two clicks
FAIL EXP-02 supervisor: "All screens" lists every route this role may open and each opens in two clicks — Eligibility opened as supervisor
PASS EXP-02 admin: "All screens" lists every route this role may open and each opens in two clicks
PASS EXP-02 direct_support: "All screens" lists every route this role may open and each opens in two clicks
PASS EXP-03 portal screens in the picker open as the portal person (guardian, school) in Explore mode
  clinician: product links reach 11 routes within 3 clicks; the picker lists the rest (48 routes)
PASS EXP-04 clinician: every route this role may open is within three clicks of its home screen (product links: rail, page links)
  supervisor: product links reach 6 routes within 3 clicks; the picker lists the rest (25 routes)
PASS EXP-04 supervisor: every route this role may open is within three clicks of its home screen (product links: rail, page links)
  admin: product links reach 9 routes within 3 clicks; the picker lists the rest (26 routes)
PASS EXP-04 admin: every route this role may open is within three clicks of its home screen (product links: rail, page links)
  direct_support: product links reach 2 routes within 3 clicks; the picker lists the rest (25 routes)
PASS EXP-04 direct_support: every route this role may open is within three clicks of its home screen (product links: rail, page links)
RESULT presenter pass=25 fail=3 skip=0
```
