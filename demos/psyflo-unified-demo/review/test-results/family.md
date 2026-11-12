# family · PASS

Run 2026-11-12T02-13-46Z · 68000 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | a guardian link opens only that child: one client, own requests, no diagnosis, no staff-only material |  |
| PASS | a link for another family sees nothing of T.W. and cannot act on T.W.'s records |  |
| PASS | a guardian cannot do staff work: send, approve, decide, send a family link, sign for another child |  |
| PASS | the presenter view of one child is that child: E.C.s guardian sees E.C.s denial and the letter status, never who prepared it |  |
| PASS | ParentPortal without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | ParentSign without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | ParentEnroll without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | ParentLetters without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | ParentProgress without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | ParentQuarterly without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | ParentSchedule without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | ParentSurvey without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | FamilyLink without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | AppealLetter without a family link (bare ?c=MR, no token, no presenter): the neutral "link not valid" screen, nothing of the child |  |
| PASS | a made-up or foreign token is not a page either, and a token never opens another family's child |  |
| PASS | the presenter's view of a child still works when it is deliberate: dock open, or a staff member signed in in this browser |  |
| PASS | the checklist home: one h1, landmarks, "N of M done" equals the selector, next step first, no horizontal scroll |  |
| PASS | language toggle: two buttons of 44 px or more, Español switches the page and marks it lang=es, English switches back |  |
| PASS | "Call us instead" opens an accessible dialog with the demo number and Escape closes it, focus returns to the button |  |
| PASS | ParentPortal at 390 px: landmarks, one h1, 16 px text, targets of 44 px, no horizontal scroll, no console errors, no dead anchors |  |
| PASS | ParentSign at 390 px: landmarks, one h1, 16 px text, targets of 44 px, no horizontal scroll, no console errors, no dead anchors |  |
| PASS | ParentEnroll at 390 px: landmarks, one h1, 16 px text, targets of 44 px, no horizontal scroll, no console errors, no dead anchors |  |
| PASS | ParentLetters at 390 px: landmarks, one h1, 16 px text, targets of 44 px, no horizontal scroll, no console errors, no dead anchors |  |
| PASS | ParentProgress at 390 px: landmarks, one h1, 16 px text, targets of 44 px, no horizontal scroll, no console errors, no dead anchors |  |
| PASS | ParentQuarterly at 390 px: landmarks, one h1, 16 px text, targets of 44 px, no horizontal scroll, no console errors, no dead anchors |  |
| PASS | ParentSchedule at 390 px: landmarks, one h1, 16 px text, targets of 44 px, no horizontal scroll, no console errors, no dead anchors |  |
| PASS | ParentSurvey at 390 px: landmarks, one h1, 16 px text, targets of 44 px, no horizontal scroll, no console errors, no dead anchors |  |
| PASS | Remote allowed: the sign box offers drawing and "Type your name" |  |
| PASS | In person required: no signing here; what to bring and when are shown; the server refuses a remote signature |  |
| PASS | Pending: the guardian is told Harvest is deciding; the server refuses the signature |  |
| PASS | Ready to review: a form Harvest has not asked for can be read, not signed (screen and server) |  |
| PASS | Remote allowed, typed name: signing records the guardian behind the link (never the typed text) and the screen shows Completed |  |
| PASS | Remote allowed, drawn: the signed copy is stored and the checklist moves |  |
| PASS | the empty-pad sign attempt asks for a signature and signs nothing |  |
| PASS | required paperwork: a short form (filled in from the link) and a read-and-acknowledge item are saved; the checklist count moves |  |
| PASS | check-in: three questions are required; Send saves a guardian check-in credited to the guardian |  |
| PASS | the quarterly report: once staff send it, the guardian signs (drawn); the PDF and the guardian's name are stored |  |
| PASS | the first call and the intake: a clinician offers, the family books on the phone (ride, confirm the day before), all recorded |  |
| PASS | appealView reads the four states from the stored records |  |
| PASS | appeal, guardian side: Ready to review → sign (typed) → Signed, staff will send → staff press Send → Submitted by staff |  |
| PASS | appeal signature mode: In person required refuses a remote appeal signature and the screen shows what to bring |  |
| PASS | insurance letters: What this says · What you can do · By when; no 24-hour promise; the appeal date has its source |  |
| PASS | the quarterly report follows the signature mode too (In person required: no signing here) |  |
| PASS | sigState: five states from the rule and the stored records |  |
| PASS | referralStatus never reaches past status text |  |
| PASS | the guardian projection withholds clinical instrument scores of the quarter |  |
| PASS | the guardian gets the appeal-window rule row |  |
