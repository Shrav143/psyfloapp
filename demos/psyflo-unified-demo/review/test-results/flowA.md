# flowA · FAIL

Run 2026-11-11T18-24-51Z · 24707 ms · instance 1 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | family link → five steps → submit → eligibility recorded (clinician session) |  |
| PASS | new-consumer boxes are typed from the referral (yellow) |  |
| PASS | screening opens with the pre-call boxes typed |  |
| FAIL | scripted call: prompts tick while recording; the draft fills the boxes; only what was said | expected a truthy value |
| PASS | Process Form is a person's click; Psyflo learns it from the observed page event |  |
| PASS | the intake (CNA) opens with the screening answers carried forward |  |
| PASS | no console errors in the page or the panel |  |

## Output (tail)

```
PASS family link → five steps → submit → eligibility recorded (clinician session)
PASS new-consumer boxes are typed from the referral (yellow)
PASS screening opens with the pre-call boxes typed
FAIL scripted call: prompts tick while recording; the draft fills the boxes; only what was said — expected a truthy value
PASS Process Form is a person's click; Psyflo learns it from the observed page event
PASS the intake (CNA) opens with the screening answers carried forward
PASS no console errors in the page or the panel
RESULT flowA pass=6 fail=1 skip=0
```
