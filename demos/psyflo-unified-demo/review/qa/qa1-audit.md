# Interaction audit (QA1)

Controls swept: 4701 on 205 targets. NAVIGATED 1880 · DOM 1171 · DETAIL 855 · CLOSE 421 · POPUP 98 · DISABLED-EXPLAINED 89 · NO-EFFECT-ALLOWED 60 · STATE 46 · SKIPPED 31 · SCROLL 21 · TOAST-ONLY 7 · VANISHED 5 · FILE-CHOOSER 5 · DISABLED-UNEXPLAINED 4 · TYPED 4 · TOAST-UNEXPLAINED 2 · DOWNLOAD 1 · FOCUS-ONLY 1

## Per role

| Role | Targets | Controls | Findings |
|---|---|---|---|
| direct_support · 1440 px | 8 | 110 | 0 |
| supervisor · 1440 px | 14 | 532 | 0 |
| clinician · 1440 px | 94 | 2537 | 5 |
| admin · 1440 px | 28 | 1070 | 3 |
| direct_support · 390 px | 3 | 24 | 0 |
| guardian · 390 px | 14 | 131 | 0 |
| school · 390 px | 4 | 82 | 0 |
| signed-out · 1440 px | 2 | 4 | 0 |
| panel · 400 px (all roles) | 38 | 211 | 0 |

## Per route

| Target | Role | Controls | CLOSE | DETAIL | DISABLED-EXPLAINED | DISABLED-UNEXPLAINED | DOM | DOWNLOAD | FILE-CHOOSER | FOCUS-ONLY | NAVIGATED | NO-EFFECT-ALLOWED | POPUP | SCROLL | SKIPPED | STATE | TOAST-ONLY | TOAST-UNEXPLAINED | TYPED | VANISHED |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| direct_support · ExtHome | direct_support | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| direct_support · ExtDPN | direct_support | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| direct_support · ExtWeekly | direct_support | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| direct_support · ExtMonthly | direct_support | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| direct_support · ExtIncident | direct_support | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| direct_support · Dashboard | direct_support | 41 |  |  | 2 |  | 6 |  |  |  | 30 | 1 | 2 |  |  |  |  |  |  |  |
| direct_support · Patient?id=MR | direct_support | 13 |  |  | 2 |  |  |  |  |  | 8 | 1 | 2 |  |  |  |  |  |  |  |
| supervisor · ExtHome | supervisor | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| supervisor · Authorizations | supervisor | 79 | 10 | 10 | 2 |  | 14 |  |  |  | 43 |  |  |  |  |  |  |  |  |  |
| supervisor · Analytics?section=outcomes | supervisor | 47 | 2 | 21 | 2 |  | 12 |  |  |  | 10 |  |  |  |  |  |  |  |  |  |
| supervisor · Analytics?section=outcomes [sections open] | supervisor | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0411 | supervisor | 37 | 8 | 9 | 1 |  | 17 |  |  |  | 1 |  |  | 1 |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0399 | supervisor | 40 | 9 | 15 |  |  | 14 |  |  |  | 1 |  |  | 1 |  |  |  |  |  |  |
| supervisor · Dashboard | supervisor | 76 |  |  | 2 |  | 12 |  |  |  | 60 | 2 |  |  |  |  |  |  |  |  |
| supervisor · Dashboard?view=documents | supervisor | 83 | 5 | 10 | 1 |  | 6 |  |  |  | 54 | 2 | 5 |  |  |  |  |  |  |  |
| supervisor · Dashboard?view=documents&status=pending_review | supervisor | 70 | 5 | 10 | 2 |  | 6 |  |  |  | 42 |  | 5 |  |  |  |  |  |  |  |
| supervisor · Dashboard?view=staff | supervisor | 26 | 10 | 4 |  |  | 5 |  |  |  | 6 | 1 |  |  |  |  |  |  |  |  |
| supervisor · Dashboard?view=staff [sections open] | supervisor | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| supervisor · Patient?id=MR | supervisor | 13 |  |  | 2 |  |  |  |  |  | 8 | 1 | 2 |  |  |  |  |  |  |  |
| supervisor · Patient?id=DW | supervisor | 16 |  |  | 2 |  |  |  |  |  | 11 | 1 | 2 |  |  |  |  |  |  |  |
| clinician · Referrals | clinician | 30 | 1 | 1 |  |  | 5 |  |  |  | 22 |  |  |  | 1 |  |  |  |  |  |
| clinician · Referrals [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-118 | clinician | 22 | 6 | 2 |  |  | 6 |  |  |  | 6 |  |  |  | 1 | 1 |  |  |  |  |
| clinician · Referral?id=REF-118 [sections open] | clinician | 4 |  | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-121 | clinician | 22 | 6 | 3 |  |  | 6 |  |  |  | 6 |  |  |  | 1 |  |  |  |  |  |
| clinician · Referral?id=REF-121 [sections open] | clinician | 3 |  |  |  |  |  |  |  |  | 2 |  |  |  |  | 1 |  |  |  |  |
| clinician · Referral?id=REF-119 | clinician | 22 | 6 | 2 |  |  | 6 |  |  |  | 6 |  |  |  | 1 | 1 |  |  |  |  |
| clinician · Referral?id=REF-119 [sections open] | clinician | 2 |  | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-117 | clinician | 23 | 6 | 4 |  |  | 6 |  |  |  | 6 |  |  |  | 1 |  |  |  |  |  |
| clinician · Referral?id=REF-117 [sections open] | clinician | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-118&panel=eligibility | clinician | 21 | 6 | 2 |  |  | 6 |  |  |  | 5 |  |  |  | 1 | 1 |  |  |  |  |
| clinician · Referral?id=REF-118&panel=eligibility [sections open] | clinician | 5 |  | 4 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| clinician · ExtHome | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtScreening | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtCNA | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtISP | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtSRA | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtSignOff | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtDPN | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtWeekly | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtMonthly | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtIncident | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · Authorizations | clinician | 80 | 10 | 10 | 2 |  | 14 |  |  |  | 44 |  |  |  |  |  |  |  |  |  |
| clinician · ExtQuarterly | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtCase | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · ExtDischarge | clinician | 2 |  |  |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| clinician · Analytics?section=outcomes&dataset=case | clinician | 48 | 2 | 23 |  | 1 | 10 |  |  |  | 11 |  |  | 1 |  |  |  |  |  |  |
| clinician · Analytics?section=outcomes&dataset=case [sections open] | clinician | 19 | 2 | 5 |  |  |  |  |  |  | 12 |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=outcomes&dataset=illustrative | clinician | 42 | 2 | 14 |  |  | 11 |  |  |  | 14 |  |  | 1 |  |  |  |  |  |  |
| clinician · Analytics?section=outcomes&dataset=illustrative [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&dataset=case | clinician | 65 | 2 | 27 |  |  | 11 |  |  |  | 25 |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&dataset=case [sections open] | clinician | 4 |  | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&panel=guidance | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&panel=guidance [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=population&dataset=illustrative | clinician | 50 | 2 | 19 | 1 |  | 13 |  |  |  | 15 |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=population&dataset=illustrative [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0411 | clinician | 38 | 8 | 9 |  |  | 17 |  |  |  | 1 |  | 2 | 1 |  |  |  |  |  |  |
| clinician · Authorization?id=R-0402 | clinician | 48 | 9 | 9 |  |  | 22 |  |  |  | 4 |  | 1 | 1 |  |  | 1 | 1 |  |  |
| clinician · Authorization?id=R-0399 | clinician | 40 | 9 | 15 |  |  | 14 |  |  |  | 1 |  |  | 1 |  |  |  |  |  |  |
| clinician · Authorization?id=R-0391 | clinician | 39 | 8 | 14 |  |  | 14 |  |  |  | 1 |  | 1 | 1 |  |  |  |  |  |  |
| clinician · Authorization?id=R-0388 | clinician | 44 | 8 | 5 |  |  | 24 |  |  |  | 4 |  | 1 | 1 |  |  | 1 |  |  |  |
| clinician · Authorization?id=R-0384 | clinician | 34 | 8 | 7 |  |  | 14 |  |  |  | 3 |  | 1 | 1 |  |  |  |  |  |  |
| clinician · DenialIntelligence | clinician | 34 |  | 1 | 2 |  | 14 |  |  |  | 17 |  |  |  |  |  |  |  |  |  |
| clinician · DenialIntelligence?decision=partial | clinician | 31 |  | 1 | 2 |  | 12 |  |  |  | 16 |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=decision | clinician | 36 | 6 | 5 | 2 |  | 9 |  |  |  | 11 | 1 | 1 |  | 1 |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=decision [sections open] | clinician | 5 | 1 | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=evidence | clinician | 44 | 5 | 11 | 2 |  | 9 |  |  |  | 11 | 1 | 1 |  | 1 | 3 |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=evidence [sections open] | clinician | 5 | 1 | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=options | clinician | 51 | 6 | 7 | 2 |  | 13 |  |  |  | 20 | 1 | 1 |  | 1 |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=options [sections open] | clinician | 7 | 1 | 4 |  |  | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=action&action=options | clinician | 37 | 6 | 3 | 2 |  | 12 |  |  |  | 11 | 1 | 1 |  | 1 |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=action&action=options [sections open] | clinician | 5 | 1 | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=history | clinician | 47 | 6 | 11 | 2 |  | 8 |  |  |  | 17 | 1 | 1 |  | 1 |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=history [sections open] | clinician | 9 |  |  |  |  | 6 |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0408&section=action&action=info | clinician | 32 | 5 | 2 |  |  | 10 |  |  |  | 10 | 1 | 1 |  | 1 | 1 | 1 |  |  |  |
| clinician · DenialCase?id=R-0408&section=action&action=info [sections open] | clinician | 4 | 1 | 3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0388&section=action&action=p2p | clinician | 43 | 6 | 6 | 2 |  | 14 |  |  |  | 9 | 1 | 1 |  | 1 | 1 | 2 |  |  |  |
| clinician · DenialCase?id=R-0388&section=action&action=p2p [sections open] | clinician | 3 | 1 | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0384&section=action&action=appeal | clinician | 34 | 5 | 2 | 1 |  | 11 |  |  |  | 10 | 1 | 1 |  | 1 | 1 | 1 |  |  |  |
| clinician · DenialCase?id=R-0384&section=action&action=appeal [sections open] | clinician | 5 | 1 | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0384&section=action&action=reconsider | clinician | 31 | 5 | 2 |  |  | 9 |  |  |  | 10 | 1 | 1 |  | 1 | 1 | 1 |  |  |  |
| clinician · DenialCase?id=R-0384&section=action&action=reconsider [sections open] | clinician | 5 | 1 | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Dashboard | clinician | 98 |  |  | 2 |  | 17 |  |  |  | 77 | 2 |  |  |  |  |  |  |  |  |
| clinician · Dashboard?view=documents | clinician | 83 | 5 | 10 | 1 |  | 6 |  |  |  | 54 | 2 | 5 |  |  |  |  |  |  |  |
| clinician · Dashboard?view=documents&status=pending_review | clinician | 70 | 5 | 10 | 2 |  | 6 |  |  |  | 42 |  | 5 |  |  |  |  |  |  |  |
| clinician · Dashboard?view=staff | clinician | 26 | 10 | 4 |  |  | 5 |  |  |  | 6 | 1 |  |  |  |  |  |  |  |  |
| clinician · Dashboard?view=staff [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Patient?id=MR | clinician | 13 |  |  | 2 |  |  |  |  |  | 8 | 1 | 2 |  |  |  |  |  |  |  |
| clinician · Patient?id=TW | clinician | 13 |  |  | 2 |  |  |  |  |  | 8 | 1 | 2 |  |  |  |  |  |  |  |
| clinician · Patient?id=KT | clinician | 13 |  |  | 2 |  |  |  |  |  | 8 | 1 | 2 |  |  |  |  |  |  |  |
| admin · Authorizations | admin | 87 | 10 | 11 | 2 |  | 15 |  |  |  | 48 |  |  |  | 1 |  |  |  |  |  |
| admin · Analytics?section=outcomes | admin | 47 | 2 | 21 |  | 1 | 12 |  |  |  | 10 |  |  | 1 |  |  |  |  |  |  |
| admin · Analytics?section=outcomes [sections open] | admin | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| admin · Analytics?section=payer | admin | 66 | 2 | 27 |  |  | 13 |  |  |  | 24 |  |  |  |  |  |  |  |  |  |
| admin · Analytics?section=payer [sections open] | admin | 4 |  | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| admin · Analytics?section=population&dataset=illustrative | admin | 51 | 2 | 19 | 1 |  | 15 |  |  |  | 14 |  |  |  |  |  |  |  |  |  |
| admin · Analytics?section=population&dataset=illustrative [sections open] | admin | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| admin · Authorization?id=R-0411 | admin | 37 | 8 | 9 | 1 |  | 17 |  |  |  | 1 |  |  | 1 |  |  |  |  |  |  |
| admin · Authorization?id=R-0402 | admin | 44 | 9 | 10 |  |  | 19 |  |  |  | 4 |  |  | 1 |  |  |  | 1 |  |  |
| admin · DenialIntelligence | admin | 34 |  | 1 | 2 |  | 14 |  |  |  | 17 |  |  |  |  |  |  |  |  |  |
| admin · DenialCase?id=R-0402&section=decision | admin | 26 | 4 | 3 | 1 |  | 6 |  |  |  | 11 |  |  |  | 1 |  |  |  |  |  |
| admin · DenialCase?id=R-0402&section=decision [sections open] | admin | 6 | 1 | 5 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| admin · Settings | admin | 31 | 2 | 4 | 2 |  | 12 |  |  |  | 10 |  |  |  |  | 1 |  |  |  |  |
| admin · Settings?view=outline | admin | 37 | 2 | 4 | 2 |  | 18 |  |  |  | 9 | 1 |  |  |  | 1 |  |  |  |  |
| admin · Settings?tab=rules | admin | 188 | 3 | 77 | 2 |  | 92 |  |  |  | 13 |  |  |  |  | 1 |  |  |  |  |
| admin · Settings?tab=rules [sections open] | admin | 21 |  |  |  |  | 21 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| admin · Settings?tab=people | admin | 22 | 1 | 4 |  |  | 9 |  |  |  | 7 | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=roles | admin | 23 | 3 | 7 |  |  | 4 |  |  |  | 7 | 1 |  |  | 1 |  |  |  |  |  |
| admin · Settings?tab=units | admin | 21 | 3 | 5 |  |  | 5 |  |  |  | 7 | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=audit | admin | 33 |  | 1 |  |  | 1 | 1 |  |  | 29 | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=family | admin | 43 | 4 | 6 | 4 |  | 3 |  |  |  | 7 | 3 |  |  |  | 16 |  |  |  |  |
| admin · Settings?tab=presenter | admin | 22 | 1 | 2 |  |  | 1 |  |  |  | 17 | 1 |  |  |  |  |  |  |  |  |
| admin · Dashboard | admin | 97 |  |  | 2 |  | 16 |  |  |  | 77 | 2 |  |  |  |  |  |  |  |  |
| admin · Dashboard?view=documents | admin | 57 |  |  | 1 |  |  |  |  |  | 54 | 2 |  |  |  |  |  |  |  |  |
| admin · Dashboard?view=staff | admin | 7 |  |  |  |  |  |  |  |  | 6 | 1 |  |  |  |  |  |  |  |  |
| admin · Patient?id=MR | admin | 11 |  |  | 2 |  |  |  |  |  | 8 | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-isp-ready · Authorization?id=R-0416&section=submission | clinician@tw-isp-ready | 44 | 8 | 11 |  |  | 14 |  |  |  | 7 |  | 2 | 1 | 1 |  |  |  |  |  |
| clinician@tw-isp-ready · Authorizations | clinician@tw-isp-ready | 84 | 10 | 11 | 2 |  | 15 |  |  |  | 46 |  |  |  |  |  |  |  |  |  |
| clinician@tw-isp-ready · Referral?id=REF-118 | clinician@tw-isp-ready | 10 |  | 2 |  |  | 1 |  |  |  | 6 |  |  |  |  | 1 |  |  |  |  |
| clinician@tw-isp-ready · Referral?id=REF-118 [sections open] | clinician@tw-isp-ready | 13 | 5 | 3 |  |  | 2 |  |  |  | 2 |  | 1 |  |  |  |  |  |  |  |
| clinician@tw-signed · Authorization?id=R-0416&section=submission | clinician@tw-signed | 51 | 10 | 16 |  |  | 14 |  |  |  | 7 |  | 1 | 1 | 1 |  |  |  |  | 1 |
| clinician@tw-signed · Authorizations | clinician@tw-signed | 84 | 10 | 11 | 2 |  | 15 |  |  |  | 46 |  |  |  |  |  |  |  |  |  |
| clinician@tw-signed · Referral?id=REF-118 | clinician@tw-signed | 10 |  | 2 |  |  | 1 |  |  |  | 6 |  |  |  |  | 1 |  |  |  |  |
| clinician@tw-signed · Referral?id=REF-118 [sections open] | clinician@tw-signed | 13 | 5 | 3 |  |  | 2 |  |  |  | 2 |  | 1 |  |  |  |  |  |  |  |
| clinician@tw-sent · Authorization?id=R-0416&section=submission | clinician@tw-sent | 61 | 8 | 24 |  |  | 16 |  |  |  | 7 |  | 2 | 1 | 1 |  |  |  |  | 2 |
| clinician@tw-sent · Authorizations | clinician@tw-sent | 84 | 10 | 11 | 2 |  | 15 |  |  |  | 46 |  |  |  |  |  |  |  |  |  |
| clinician@tw-sent · Referral?id=REF-118 | clinician@tw-sent | 10 |  | 2 |  |  | 1 |  |  |  | 6 |  |  |  |  | 1 |  |  |  |  |
| clinician@tw-sent · Referral?id=REF-118 [sections open] | clinician@tw-sent | 13 | 5 | 3 |  |  | 2 |  |  |  | 2 |  | 1 |  |  |  |  |  |  |  |
| supervisor@tw-signed · Authorization?id=R-0416&section=submission | supervisor@tw-signed | 43 | 10 | 11 |  |  | 14 |  |  |  | 5 |  |  | 1 | 1 |  |  |  |  | 1 |
| clinician@analytics-case · Analytics?section=outcomes&dataset=case | clinician@analytics-case | 56 | 3 | 24 |  | 1 | 9 |  |  |  | 17 |  |  | 1 | 1 |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=outcomes&dataset=case [sections open] | clinician@analytics-case | 19 | 2 | 5 |  |  |  |  |  |  | 12 |  |  |  |  |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=payer&dataset=case | clinician@analytics-case | 69 | 2 | 27 |  |  | 13 |  |  |  | 26 |  |  | 1 |  |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=payer&dataset=case [sections open] | clinician@analytics-case | 4 |  | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=population&dataset=case | clinician@analytics-case | 52 | 2 | 27 |  |  | 12 |  |  |  | 11 |  |  |  |  |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=population&dataset=case [sections open] | clinician@analytics-case | 16 | 2 | 2 |  |  |  |  |  |  | 12 |  |  |  |  |  |  |  |  |  |
| admin@analytics-case · Analytics?section=outcomes&dataset=case | admin@analytics-case | 55 | 3 | 22 |  | 1 | 11 |  |  |  | 16 |  |  | 1 | 1 |  |  |  |  |  |
| admin@analytics-case · Analytics?section=outcomes&dataset=case [sections open] | admin@analytics-case | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| direct_support@mr-daily · Dashboard | direct_support@mr-daily | 46 | 1 | 1 | 2 |  | 8 |  |  |  | 30 | 1 | 2 |  | 1 |  |  |  |  |  |
| clinician@canvas · Dashboard | clinician@canvas | 108 | 1 | 1 | 2 |  | 19 |  |  |  | 82 | 2 |  |  | 1 |  |  |  |  |  |
| clinician@canvas · Dashboard?view=documents | clinician@canvas | 83 | 5 | 10 | 1 |  | 6 |  |  |  | 54 | 2 | 5 |  |  |  |  |  |  |  |
| clinician@canvas · Authorizations | clinician@canvas | 84 | 10 | 11 | 2 |  | 15 |  |  |  | 46 |  |  |  |  |  |  |  |  |  |
| clinician@canvas · DenialIntelligence | clinician@canvas | 34 |  | 1 | 2 |  | 14 |  |  |  | 17 |  |  |  |  |  |  |  |  |  |
| clinician@canvas · Referrals | clinician@canvas | 19 |  |  |  |  | 4 |  |  |  | 15 |  |  |  |  |  |  |  |  |  |
| clinician@canvas · Referrals [sections open] | clinician@canvas | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| direct_support · MobileApp (390) | direct_support | 11 |  |  | 3 |  | 6 |  |  | 1 | 1 |  |  |  |  |  |  |  |  |  |
| direct_support · MobileDictate (390) | direct_support | 9 |  |  |  |  | 6 |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| direct_support · MobileAssess (390) | direct_support | 4 |  |  |  |  | 2 |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  |
| guardian · ParentPortal (390) | guardian | 14 | 2 | 1 |  |  | 1 |  |  |  | 9 | 1 |  |  |  |  |  |  |  |  |
| guardian · ParentEnroll (390) | guardian | 20 | 2 | 1 |  |  | 14 |  |  |  | 1 | 1 |  |  |  | 1 |  |  |  |  |
| guardian · ParentSign (390) | guardian | 11 | 2 | 1 |  |  | 4 |  |  |  | 1 | 2 |  |  |  | 1 |  |  |  |  |
| guardian · ParentSign (390) [sections open] | guardian | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guardian · ParentProgress (390) | guardian | 7 | 2 | 1 |  |  | 1 |  |  |  | 2 | 1 |  |  |  |  |  |  |  |  |
| guardian · ParentQuarterly (390) | guardian | 6 | 2 | 1 |  |  | 1 |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  |
| guardian · ParentLetters (390) | guardian | 12 | 2 | 1 |  |  | 7 |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  |
| guardian · ParentLetters (390) [sections open] | guardian | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guardian · ParentSchedule (390) | guardian | 6 | 2 | 1 |  |  | 1 |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  |
| guardian · ParentSurvey (390) | guardian | 14 | 2 | 1 |  |  | 9 |  |  |  | 1 | 1 |  |  |  |  |  |  |  |  |
| guardian · FamilyLink (390) | guardian | 5 | 2 | 1 |  |  | 1 |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| guardian · AppealLetter?c=EC (390) | guardian | 11 | 2 | 1 |  |  | 4 |  |  |  | 1 | 1 |  | 1 |  | 1 |  |  |  |  |
| guardian (link ar-demo) · ParentPortal (390) | guardian | 14 | 2 | 1 |  |  | 1 |  |  |  | 9 | 1 |  |  |  |  |  |  |  |  |
| guardian (link ar-demo) · FamilyLink (390) | guardian | 11 | 2 | 1 |  |  | 6 |  | 1 |  |  | 1 |  |  |  |  |  |  |  |  |
| school · SchoolPortal (390) | school | 25 |  |  |  |  | 4 |  | 1 |  | 19 |  |  |  | 1 |  |  |  |  |  |
| school · ReferralForm (390) | school | 13 |  |  |  |  | 10 |  |  |  | 1 |  |  |  | 1 | 1 |  |  |  |  |
| school · ReferralForm (390) [sections open] | school | 40 |  |  |  |  | 38 |  | 2 |  |  |  |  |  |  |  |  |  |  |  |
| school · ReferralSent (390) | school | 4 |  |  |  |  |  |  | 1 |  | 2 |  |  |  | 1 |  |  |  |  |  |
| signed out · Login | signed-out | 4 |  |  |  |  | 1 |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| signed out · WhereThingsLive | signed-out | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · home (400) | jperez | 7 |  |  |  |  | 4 |  |  |  | 2 |  | 1 |  |  |  |  |  |  |  |
| panel jperez · home (400) [sections open] | jperez | 26 |  |  |  |  |  |  |  |  | 24 |  | 2 |  |  |  |  |  |  |  |
| panel khale · home (direct support) (400) | khale | 4 |  |  |  |  | 2 |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| panel khale · home (direct support) (400) [sections open] | khale | 6 |  |  |  |  |  |  |  |  | 6 |  |  |  |  |  |  |  |  |  |
| panel cdiaz · home (supervisor) (400) | cdiaz | 4 |  |  |  |  | 1 |  |  |  | 1 |  | 2 |  |  |  |  |  |  |  |
| panel cdiaz · home (supervisor) (400) [sections open] | cdiaz | 20 |  |  |  |  |  |  |  |  | 20 |  |  |  |  |  |  |  |  |  |
| panel dowens · home (admin) (400) | dowens | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · record (400) | jperez | 10 |  |  |  |  | 7 |  |  |  | 2 |  | 1 |  |  |  |  |  |  |  |
| panel jperez · record (400) [sections open] | jperez | 6 |  |  |  |  |  |  |  |  | 4 |  | 2 |  |  |  |  |  |  |  |
| panel khale · daily note (400) | khale | 6 |  |  |  |  | 6 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel khale · daily note (400) [sections open] | khale | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · daily note (clinician) (400) | jperez | 6 |  |  |  |  | 6 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · daily note (clinician) (400) [sections open] | jperez | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · weekly (400) | jperez | 6 |  |  |  |  | 6 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · weekly (400) [sections open] | jperez | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · monthly (400) | jperez | 6 |  |  |  |  | 6 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · monthly (400) [sections open] | jperez | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · incident (400) | jperez | 5 |  |  |  |  | 3 |  |  |  |  |  | 1 |  |  |  |  |  | 1 |  |
| panel jperez · quarterly (400) | jperez | 6 |  |  |  |  | 4 |  |  |  |  |  |  |  | 1 | 1 |  |  |  |  |
| panel jperez · quarterly (400) [sections open] | jperez | 5 |  |  |  |  | 5 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · continued stay (400) | jperez | 11 |  |  |  |  | 9 |  |  |  |  |  |  |  |  | 2 |  |  |  |  |
| panel jperez · continued stay (400) [sections open] | jperez | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · discharge (400) | jperez | 5 |  |  |  |  | 3 |  |  |  |  |  | 1 |  |  | 1 |  |  |  |  |
| panel jperez · discharge (400) [sections open] | jperez | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · forms to approve (400) | jperez | 7 |  |  |  |  | 1 |  |  |  | 6 |  |  |  |  |  |  |  |  |  |
| panel khale · time tracker (400) | khale | 3 |  |  |  |  | 1 |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| panel jperez · authorizations (400) | jperez | 6 |  |  |  |  | 3 |  |  |  | 2 |  | 1 |  |  |  |  |  |  |  |
| panel jperez · authorizations (400) [sections open] | jperez | 6 |  |  |  |  |  |  |  |  | 4 |  | 2 |  |  |  |  |  |  |  |
| panel khale · screening (direct support: not offered) (400) | khale | 1 |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. screening (400) | jperez | 7 |  |  |  |  | 1 |  |  |  |  |  |  |  |  | 4 |  |  | 1 | 1 |
| panel jperez · T.W. screening (400) [sections open] | jperez | 5 |  | 4 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. CNA (400) | jperez | 8 |  |  |  |  | 7 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |
| panel jperez · T.W. CNA (400) [sections open] | jperez | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. ISP (400) | jperez | 6 |  |  |  |  | 4 |  |  |  |  |  |  |  | 1 |  |  |  | 1 |  |
| panel jperez · T.W. ISP (400) [sections open] | jperez | 6 |  | 6 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. initial SRA (400) | jperez | 4 |  |  |  |  | 3 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |
| panel jperez · T.W. initial SRA (400) [sections open] | jperez | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · forms to approve (signed) (400) | jperez | 8 |  |  |  |  | 1 |  |  |  | 7 |  |  |  |  |  |  |  |  |  |

## Findings (dead or unexplained controls, unnamed controls, console errors, dead ends)

- **clinician · Analytics?section=outcomes&dataset=case** · button "Assessment scores" (body) → DISABLED-UNEXPLAINED
- **clinician · Authorization?id=R-0402** · button "Add" (overlay, in the overlay opened by "Add to history") → TOAST-UNEXPLAINED · Write what happened.
- **clinician · Patient?id=TW** · link "Open in Lauris: T.W., Intake form (opens Lauris in a new tab)" (table) → POPUP · BROKEN http://localhost:7711/consumers/4492/session/screening ·  · broken-popup
- **clinician · Patient?id=TW** · link "Open in Lauris: T.W., CNA (opens Lauris in a new tab)" (table) → POPUP · BROKEN http://localhost:7711/consumers/4492/session/cna ·  · broken-popup
- **admin · Analytics?section=outcomes** · button "Assessment scores" (body) → DISABLED-UNEXPLAINED
- **admin · Authorization?id=R-0402** · button "Add" (overlay, in the overlay opened by "Add to history") → TOAST-UNEXPLAINED · Write what happened.
- **clinician@analytics-case · Analytics?section=outcomes&dataset=case** · button "Assessment scores" (body) → DISABLED-UNEXPLAINED
- **admin@analytics-case · Analytics?section=outcomes&dataset=case** · button "Assessment scores" (body) → DISABLED-UNEXPLAINED

## Weak effects (focus or scroll only; accepted, listed for a manual look)

- supervisor · Authorization?id=R-0411 · button "All 2" → SCROLL · scrolled
- supervisor · Authorization?id=R-0399 · button "All 4" → SCROLL · scrolled
- clinician · Analytics?section=outcomes&dataset=case · button "Behavior and school" → SCROLL · scrolled
- clinician · Analytics?section=outcomes&dataset=illustrative · button "Assessment scores" → SCROLL · scrolled
- clinician · Authorization?id=R-0411 · button "All 2" → SCROLL · scrolled
- clinician · Authorization?id=R-0402 · button "All 4" → SCROLL · scrolled
- clinician · Authorization?id=R-0399 · button "All 4" → SCROLL · scrolled
- clinician · Authorization?id=R-0391 · button "All 3" → SCROLL · scrolled
- clinician · Authorization?id=R-0388 · button "All 2" → SCROLL · scrolled
- clinician · Authorization?id=R-0384 · button "All 4" → SCROLL · scrolled
- admin · Analytics?section=outcomes · button "Behavior and school" → SCROLL · scrolled
- admin · Authorization?id=R-0411 · button "All 2" → SCROLL · scrolled
- admin · Authorization?id=R-0402 · button "All 5" → SCROLL · scrolled
- clinician@tw-isp-ready · Authorization?id=R-0416&section=submission · button "All 1" → SCROLL · scrolled
- clinician@tw-signed · Authorization?id=R-0416&section=submission · button "All 5" → SCROLL · scrolled
- clinician@tw-sent · Authorization?id=R-0416&section=submission · button "All 8" → SCROLL · scrolled
- supervisor@tw-signed · Authorization?id=R-0416&section=submission · button "All 5" → SCROLL · scrolled
- clinician@analytics-case · Analytics?section=outcomes&dataset=case · button "Behavior and school" → SCROLL · scrolled
- clinician@analytics-case · Analytics?section=payer&dataset=case · button "Authorization volume" → SCROLL · scrolled
- admin@analytics-case · Analytics?section=outcomes&dataset=case · button "Behavior and school" → SCROLL · scrolled
- direct_support · MobileApp (390) · link "Today" → FOCUS-ONLY · moved focus to main#main
- guardian · AppealLetter?c=EC (390) · button "English" → SCROLL · scrolled

## No change by design (allowlist: active tab or toggle, text field, link to the current page, radio already selected)

- direct_support · Dashboard · button "All 6" · active toggle
- direct_support · Patient?id=MR · button "All" · active toggle
- supervisor · Dashboard · link "Patients" · link to the current page
- supervisor · Dashboard · button "All 13" · active toggle
- supervisor · Dashboard?view=documents · link "Documents" · link to the current page
- supervisor · Dashboard?view=documents · button "Open 39" · active toggle
- supervisor · Dashboard?view=staff · link "Staff" · link to the current page
- supervisor · Patient?id=MR · button "All" · active toggle
- supervisor · Patient?id=DW · button "All" · active toggle
- clinician · DenialCase?id=R-0402&section=decision · radio "Ask where the decision stands" · radio already selected
- clinician · DenialCase?id=R-0402&section=evidence · radio "Ask where the decision stands" · radio already selected
- clinician · DenialCase?id=R-0402&section=options · radio "Ask where the decision stands" · radio already selected
- clinician · DenialCase?id=R-0402&section=action&action=options · radio "Ask where the decision stands" · radio already selected
- clinician · DenialCase?id=R-0402&section=history · radio "Ask where the decision stands" · radio already selected
- clinician · DenialCase?id=R-0408&section=action&action=info · radio "Ask where the decision stands" · radio already selected
- clinician · DenialCase?id=R-0388&section=action&action=p2p · radio "Ask where the decision stands" · radio already selected
- clinician · DenialCase?id=R-0384&section=action&action=appeal · radio "Ask where the decision stands" · radio already selected
- clinician · DenialCase?id=R-0384&section=action&action=reconsider · radio "Ask where the decision stands" · radio already selected
- clinician · Dashboard · link "Patients" · link to the current page
- clinician · Dashboard · button "All 19" · active toggle
- clinician · Dashboard?view=documents · link "Documents" · link to the current page
- clinician · Dashboard?view=documents · button "Open 45" · active toggle
- clinician · Dashboard?view=staff · link "Staff" · link to the current page
- clinician · Patient?id=MR · button "All" · active toggle
- clinician · Patient?id=TW · button "All" · active toggle
- clinician · Patient?id=KT · button "All" · active toggle
- admin · Settings?view=outline · button "Outline" · active toggle
- admin · Settings?tab=people · link "People" · link to the current page
- admin · Settings?tab=roles · link "Roles" · link to the current page
- admin · Settings?tab=units · link "Units" · link to the current page
- admin · Settings?tab=audit · link "Audit" · link to the current page
- admin · Settings?tab=family · link "Family link" · link to the current page
- admin · Settings?tab=family · button "Remote allowed" · active toggle
- admin · Settings?tab=family · button "Remote allowed" · active toggle
- admin · Settings?tab=presenter · link "Presenter" · link to the current page
- admin · Dashboard · link "Patients" · link to the current page
- admin · Dashboard · button "All 19" · active toggle
- admin · Dashboard?view=documents · link "Documents" · link to the current page
- admin · Dashboard?view=documents · button "Open 45" · active toggle
- admin · Dashboard?view=staff · link "Staff" · link to the current page
- admin · Patient?id=MR · button "All" · active toggle
- direct_support@mr-daily · Dashboard · button "All 6" · active toggle
- clinician@canvas · Dashboard · link "Patients" · link to the current page
- clinician@canvas · Dashboard · button "All 19" · active toggle
- clinician@canvas · Dashboard?view=documents · link "Documents" · link to the current page
- clinician@canvas · Dashboard?view=documents · button "Open 45" · active toggle
- direct_support · MobileAssess (390) · link "Assessments (2)" · link to the current page
- guardian · ParentPortal (390) · button "English" · active toggle
- guardian · ParentEnroll (390) · button "English" · active toggle
- guardian · ParentSign (390) · button "English" · active toggle
- guardian · ParentSign (390) · button "Draw" · active toggle
- guardian · ParentProgress (390) · button "English" · active toggle
- guardian · ParentQuarterly (390) · button "English" · active toggle
- guardian · ParentLetters (390) · button "English" · active toggle
- guardian · ParentSchedule (390) · button "English" · active toggle
- guardian · ParentSurvey (390) · button "English" · active toggle
- guardian · FamilyLink (390) · button "English" · active toggle
- guardian · AppealLetter?c=EC (390) · button "Draw" · active toggle
- guardian (link ar-demo) · ParentPortal (390) · button "English" · active toggle
- guardian (link ar-demo) · FamilyLink (390) · button "English" · active toggle

## Skipped on purpose

- clinician · Referrals · "Sign out Jordan Perez" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- clinician · Referral?id=REF-118 · "Who makes the call Jordan Perez, LPC" · select with one option
- clinician · Referral?id=REF-121 · "Who makes the call Jordan Perez, LPC" · select with one option
- clinician · Referral?id=REF-119 · "Who makes the call Jordan Perez, LPC" · select with one option
- clinician · Referral?id=REF-117 · "Who makes the call Jordan Perez, LPC" · select with one option
- clinician · Referral?id=REF-118&panel=eligibility · "Who makes the call Jordan Perez, LPC" · select with one option
- clinician · DenialCase?id=R-0402&section=decision · "Owner" · select with one option
- clinician · DenialCase?id=R-0402&section=evidence · "Owner" · select with one option
- clinician · DenialCase?id=R-0402&section=options · "Owner" · select with one option
- clinician · DenialCase?id=R-0402&section=action&action=options · "Owner" · select with one option
- clinician · DenialCase?id=R-0402&section=history · "Owner" · select with one option
- clinician · DenialCase?id=R-0408&section=action&action=info · "Owner" · select with one option
- clinician · DenialCase?id=R-0388&section=action&action=p2p · "Owner" · select with one option
- clinician · DenialCase?id=R-0384&section=action&action=appeal · "Owner" · select with one option
- clinician · DenialCase?id=R-0384&section=action&action=reconsider · "Owner" · select with one option
- admin · Authorizations · "Sign out Dana Owens" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- admin · DenialCase?id=R-0402&section=decision · "Owner" · select with one option
- admin · Settings?tab=roles · "Person" · select with one option
- clinician@tw-isp-ready · Authorization?id=R-0416&section=submission · "Sign out Jordan Perez" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- clinician@tw-signed · Authorization?id=R-0416&section=submission · "Sign out Jordan Perez" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- clinician@tw-sent · Authorization?id=R-0416&section=submission · "Sign out Jordan Perez" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- supervisor@tw-signed · Authorization?id=R-0416&section=submission · "Sign out Carla Diaz" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- clinician@analytics-case · Analytics?section=outcomes&dataset=case · "Sign out Jordan Perez" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- admin@analytics-case · Analytics?section=outcomes&dataset=case · "Sign out Dana Owens" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- direct_support@mr-daily · Dashboard · "Sign out Kayla Hale" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- clinician@canvas · Dashboard · "Sign out Jordan Perez" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- school · SchoolPortal (390) · "Sign out" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- school · ReferralForm (390) · "Sign out" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- school · ReferralSent (390) · "Sign out" · sign out (covered separately; the rail link is named "Sign out <person>", and clicking it ends the session for the rest of the group)
- panel jperez · quarterly (400) · "Send the family version for the guardian's signature" · outward send (a person presses it); not clicked by the audit
- panel jperez · T.W. ISP (400) · "Send to parent for signature" · outward send (a person presses it); not clicked by the audit
