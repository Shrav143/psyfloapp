# school · PASS

Run 2026-11-12T02-13-46Z · 17575 ms · instance 1 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | a school sees only its own school's students, as status fields; nothing clinical, no other school, no outpatient student |  |
| PASS | a referral reaches the school as status only |  |
| PASS | a school cannot touch another school, an outpatient student, or a sent referral; the API asks for the guardian agreement |  |
| PASS | home: one "Harvest needs" card above the referral list, status text only, one h1, landmarks |  |
| PASS | home at 1024 px: no horizontal scroll, targets of 44 px, the card still above the list |  |
| PASS | "Harvest needs" lists missing attachments of the school's own referrals; adding a file records its name and clears the card |  |
| PASS | the form has four sections, required first; nothing is pre-checked; the interventions box starts empty |  |
| PASS | submit without the guardian agreement is stopped with a message that is announced; with it the referral is created and ReferralSent opens |  |
| PASS | save and finish later keeps a draft; the home offers Finish; submitting the draft sends it |  |
| PASS | an update about a student is accepted, credited to the counselor, and shown back as waiting for staff |  |
| PASS | Sign out ends the school session |  |
