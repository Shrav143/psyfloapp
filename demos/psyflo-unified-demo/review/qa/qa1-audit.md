# Interaction audit (QA1)

Controls swept: 2891 on 203 targets. NAVIGATED 1133 · DOM 653 · DETAIL 571 · CLOSE 319 · POPUP 52 · STATE 51 · NO-EFFECT-ALLOWED 45 · SKIPPED 31 · TOAST-ONLY 10 · FILE-CHOOSER 5 · NO-EFFECT 5 · DISABLED-EXPLAINED 4 · TYPED 4 · DISABLED-UNEXPLAINED 3 · VANISHED 2 · DOWNLOAD 1 · FOCUS-ONLY 1 · SCROLL 1

## Per role

| Role | Targets | Controls | Findings |
|---|---|---|---|
| admin · 1440 px | 23 | 550 | 4 |
| clinician · 1440 px | 95 | 1561 | 0 |
| direct_support · 1440 px | 9 | 36 | 0 |
| direct_support · 390 px | 3 | 29 | 0 |
| guardian · 390 px | 14 | 131 | 0 |
| school · 390 px | 4 | 82 | 0 |
| signed-out · 1440 px | 2 | 5 | 0 |
| panel · 400 px (all roles) | 38 | 224 | 5 |
| supervisor · 1440 px | 15 | 273 | 0 |

## Per route

| Target | Role | Controls | CLOSE | DETAIL | DISABLED-EXPLAINED | DISABLED-UNEXPLAINED | DOM | DOWNLOAD | FILE-CHOOSER | FOCUS-ONLY | NAVIGATED | NO-EFFECT | NO-EFFECT-ALLOWED | POPUP | SCROLL | SKIPPED | STATE | TOAST-ONLY | TYPED | VANISHED |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| admin · Authorizations | admin | 53 | 1 | 2 |  |  | 2 |  |  |  | 46 |  | 1 |  |  | 1 |  |  |  |  |
| admin · Authorizations [sections open] | admin | 3 |  |  |  |  |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| admin · Analytics?section=outcomes | admin | 39 | 2 | 20 |  |  | 9 |  |  |  | 8 |  |  |  |  |  |  |  |  |  |
| admin · Analytics?section=payer | admin | 51 | 2 | 20 |  |  | 11 |  |  |  | 18 |  |  |  |  |  |  |  |  |  |
| admin · Analytics?section=payer [sections open] | admin | 4 |  | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| admin · Analytics?section=population&dataset=illustrative | admin | 39 | 2 | 17 |  |  | 9 |  |  |  | 11 |  |  |  |  |  |  |  |  |  |
| admin · MyWork?section=todo | admin | 7 |  |  |  |  | 2 |  |  |  | 4 |  | 1 |  |  |  |  |  |  |  |
| admin · MyWork?section=team | admin | 8 |  |  |  |  | 2 |  |  |  | 5 |  | 1 |  |  |  |  |  |  |  |
| admin · Authorization?id=R-0411 | admin | 19 | 4 | 3 | 1 |  | 3 |  |  |  | 8 |  |  |  |  |  |  |  |  |  |
| admin · Authorization?id=R-0411 [sections open] | admin | 3 |  | 3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| admin · Authorization?id=R-0402 | admin | 25 | 4 | 8 |  |  | 3 |  |  |  | 10 |  |  |  |  |  |  |  |  |  |
| admin · Authorization?id=R-0402 [sections open] | admin | 4 |  | 3 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| admin · DenialIntelligence | admin | 22 |  |  |  |  | 10 |  |  |  | 12 |  |  |  |  |  |  |  |  |  |
| admin · DenialIntelligence [sections open] | admin | 2 |  |  |  |  |  |  |  |  | 2 |  |  |  |  |  |  |  |  |  |
| admin · DenialCase?id=R-0402&section=decision | admin | 17 | 4 | 3 |  |  | 2 |  |  |  | 7 |  |  |  |  | 1 |  |  |  |  |
| admin · Settings?tab=people | admin | 27 | 3 | 3 |  |  | 14 |  |  |  | 6 |  | 1 |  |  |  |  |  |  |  |
| admin · Settings?tab=roles | admin | 28 | 7 | 6 |  |  | 7 |  |  |  | 6 |  | 1 |  |  | 1 |  |  |  |  |
| admin · Settings?tab=units | admin | 26 | 4 | 4 |  |  | 10 |  |  |  | 6 |  | 2 |  |  |  |  |  |  |  |
| admin · Settings?tab=rules | admin | 29 | 2 | 2 |  |  | 12 |  |  |  | 12 |  | 1 |  |  |  |  |  |  |  |
| admin · Settings?tab=audit | admin | 30 |  |  |  |  |  | 1 |  |  | 28 |  | 1 |  |  |  |  |  |  |  |
| admin · Settings?tab=family | admin | 48 | 5 | 5 | 1 | 3 | 9 |  |  |  | 6 |  | 3 |  |  |  | 16 |  |  |  |
| admin · Settings?tab=presenter | admin | 20 | 1 | 1 |  |  | 1 |  |  |  | 16 |  | 1 |  |  |  |  |  |  |  |
| admin@analytics-case · Analytics?section=outcomes&dataset=case | admin@analytics-case | 46 | 3 | 21 |  |  | 9 |  |  |  | 12 |  |  |  |  | 1 |  |  |  |  |
| clinician · Referrals | clinician | 29 | 1 | 1 |  |  | 5 |  |  |  | 21 |  |  |  |  | 1 |  |  |  |  |
| clinician · Referrals [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-118 | clinician | 22 | 6 | 2 |  |  | 6 |  |  |  | 6 |  |  |  |  | 1 | 1 |  |  |  |
| clinician · Referral?id=REF-118 [sections open] | clinician | 4 |  | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-121 | clinician | 22 | 6 | 3 |  |  | 6 |  |  |  | 6 |  |  |  |  | 1 |  |  |  |  |
| clinician · Referral?id=REF-121 [sections open] | clinician | 3 |  |  |  |  |  |  |  |  | 2 |  |  |  |  |  | 1 |  |  |  |
| clinician · Referral?id=REF-119 | clinician | 22 | 6 | 2 |  |  | 6 |  |  |  | 6 |  |  |  |  | 1 | 1 |  |  |  |
| clinician · Referral?id=REF-119 [sections open] | clinician | 2 |  | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-117 | clinician | 23 | 6 | 4 |  |  | 6 |  |  |  | 6 |  |  |  |  | 1 |  |  |  |  |
| clinician · Referral?id=REF-117 [sections open] | clinician | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-118&panel=eligibility | clinician | 21 | 6 | 2 |  |  | 6 |  |  |  | 5 |  |  |  |  | 1 | 1 |  |  |  |
| clinician · Referral?id=REF-118&panel=eligibility [sections open] | clinician | 5 |  | 4 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| clinician · ExtHome | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtScreening | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtCNA | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtISP | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtSRA | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtSignOff | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtDPN | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtWeekly | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtMonthly | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtIncident | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · Authorizations | clinician | 46 |  | 1 |  |  | 2 |  |  |  | 42 |  | 1 |  |  |  |  |  |  |  |
| clinician · Authorizations [sections open] | clinician | 3 |  |  |  |  |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| clinician · ExtQuarterly | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtCase | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · ExtDischarge | clinician | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · Analytics?section=outcomes&dataset=case | clinician | 43 | 2 | 25 |  |  | 9 |  |  |  | 7 |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=outcomes&dataset=illustrative | clinician | 34 | 2 | 13 |  |  | 9 |  |  |  | 10 |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&dataset=case | clinician | 50 | 2 | 20 |  |  | 11 |  |  |  | 17 |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&dataset=case [sections open] | clinician | 4 |  | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&panel=guidance | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&panel=guidance [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=population&dataset=illustrative | clinician | 38 | 2 | 17 |  |  | 9 |  |  |  | 10 |  |  |  |  |  |  |  |  |  |
| clinician · MyWork?section=todo | clinician | 10 |  |  |  |  | 3 |  |  |  | 6 |  | 1 |  |  |  |  |  |  |  |
| clinician · MyWork?section=review | clinician | 21 | 4 | 3 |  |  | 8 |  |  |  | 3 |  | 2 |  |  |  | 1 |  |  |  |
| clinician · MyWork?section=team | clinician | 29 | 10 | 4 |  |  | 7 |  |  |  | 7 |  | 1 |  |  |  |  |  |  |  |
| clinician · MyWork?section=team [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · MyWork?section=referrals | clinician | 9 |  |  |  |  | 2 |  |  |  | 6 |  | 1 |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0411 | clinician | 19 | 4 | 3 |  |  | 3 |  |  |  | 8 |  |  | 1 |  |  |  |  |  |  |
| clinician · Authorization?id=R-0411 [sections open] | clinician | 4 |  | 3 |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · Authorization?id=R-0402 | clinician | 24 | 4 | 7 |  |  | 3 |  |  |  | 10 |  |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0402 [sections open] | clinician | 9 |  | 3 |  |  | 3 |  |  |  | 1 |  |  | 1 |  |  |  | 1 |  |  |
| clinician · Authorization?id=R-0399 | clinician | 34 | 8 | 11 |  |  | 7 |  |  |  | 8 |  |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0399 [sections open] | clinician | 19 | 9 | 5 |  |  | 4 |  |  |  |  |  |  |  |  |  |  | 1 |  |  |
| clinician · Authorization?id=R-0391 | clinician | 31 | 6 | 8 |  |  | 8 |  |  |  | 8 |  |  |  |  |  |  | 1 |  |  |
| clinician · Authorization?id=R-0391 [sections open] | clinician | 24 | 9 | 9 |  |  | 4 |  |  |  |  |  |  | 1 |  |  |  | 1 |  |  |
| clinician · Authorization?id=R-0388 | clinician | 21 | 4 | 4 |  |  | 3 |  |  |  | 10 |  |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0388 [sections open] | clinician | 9 |  | 3 |  |  | 3 |  |  |  | 1 |  |  | 1 |  |  | 1 |  |  |  |
| clinician · Authorization?id=R-0384 | clinician | 23 | 4 | 6 |  |  | 3 |  |  |  | 10 |  |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0384 [sections open] | clinician | 6 |  | 5 |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician · DenialIntelligence | clinician | 22 |  |  |  |  | 11 |  |  |  | 11 |  |  |  |  |  |  |  |  |  |
| clinician · DenialIntelligence [sections open] | clinician | 2 |  |  |  |  |  |  |  |  | 2 |  |  |  |  |  |  |  |  |  |
| clinician · DenialIntelligence?decision=partial | clinician | 21 |  |  |  |  | 11 |  |  |  | 10 |  |  |  |  |  |  |  |  |  |
| clinician · DenialIntelligence?decision=partial [sections open] | clinician | 2 |  |  |  |  |  |  |  |  | 2 |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=decision | clinician | 22 | 6 | 4 |  |  | 3 |  |  |  | 7 |  |  |  |  | 1 |  | 1 |  |  |
| clinician · DenialCase?id=R-0402&section=evidence | clinician | 28 | 4 | 11 |  |  | 2 |  |  |  | 7 |  |  |  |  | 1 | 3 |  |  |  |
| clinician · DenialCase?id=R-0402&section=options | clinician | 20 | 4 | 2 |  |  | 4 |  |  |  | 9 |  |  |  |  | 1 |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=options [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=action&action=options | clinician | 27 | 6 | 3 |  |  | 4 |  |  |  | 12 |  | 1 |  |  | 1 |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=history | clinician | 20 | 5 | 5 |  |  | 2 |  |  |  | 7 |  |  |  |  | 1 |  |  |  |  |
| clinician · DenialCase?id=R-0408&section=action&action=info | clinician | 17 | 4 | 2 |  |  | 2 |  |  |  | 7 |  |  |  |  | 1 | 1 |  |  |  |
| clinician · DenialCase?id=R-0388&section=action&action=p2p | clinician | 34 | 8 | 6 |  |  | 8 |  |  |  | 7 |  | 1 |  |  | 1 | 1 | 2 |  |  |
| clinician · DenialCase?id=R-0388&section=action&action=p2p [sections open] | clinician | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0384&section=action&action=appeal | clinician | 22 | 4 | 2 | 1 |  | 4 |  |  |  | 9 |  |  |  |  | 1 | 1 |  |  |  |
| clinician · DenialCase?id=R-0384&section=action&action=reconsider | clinician | 20 | 4 | 2 |  |  | 2 |  |  |  | 10 |  |  |  |  | 1 | 1 |  |  |  |
| clinician@tw-isp-ready · Authorization?id=R-0416&section=submission | clinician@tw-isp-ready | 25 | 4 | 3 |  |  | 3 |  |  |  | 13 |  |  | 1 |  | 1 |  |  |  |  |
| clinician@tw-isp-ready · Authorization?id=R-0416&section=submission [sections open] | clinician@tw-isp-ready | 8 | 1 | 6 |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| clinician@tw-isp-ready · Authorizations | clinician@tw-isp-ready | 48 |  | 1 |  |  | 2 |  |  |  | 44 |  | 1 |  |  |  |  |  |  |  |
| clinician@tw-isp-ready · Authorizations [sections open] | clinician@tw-isp-ready | 3 |  |  |  |  |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| clinician@tw-isp-ready · Referral?id=REF-118 | clinician@tw-isp-ready | 10 |  | 2 |  |  | 1 |  |  |  | 6 |  |  |  |  |  | 1 |  |  |  |
| clinician@tw-isp-ready · Referral?id=REF-118 [sections open] | clinician@tw-isp-ready | 13 | 5 | 3 |  |  | 2 |  |  |  | 2 |  |  | 1 |  |  |  |  |  |  |
| clinician@tw-signed · Authorization?id=R-0416&section=submission | clinician@tw-signed | 28 | 7 | 4 |  |  | 3 |  |  |  | 13 |  |  |  |  | 1 |  |  |  |  |
| clinician@tw-signed · Authorization?id=R-0416&section=submission [sections open] | clinician@tw-signed | 13 | 1 | 10 |  |  |  |  |  |  |  |  |  | 2 |  |  |  |  |  |  |
| clinician@tw-signed · Authorizations | clinician@tw-signed | 48 |  | 1 |  |  | 2 |  |  |  | 44 |  | 1 |  |  |  |  |  |  |  |
| clinician@tw-signed · Authorizations [sections open] | clinician@tw-signed | 3 |  |  |  |  |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| clinician@tw-signed · Referral?id=REF-118 | clinician@tw-signed | 10 |  | 2 |  |  | 1 |  |  |  | 6 |  |  |  |  |  | 1 |  |  |  |
| clinician@tw-signed · Referral?id=REF-118 [sections open] | clinician@tw-signed | 13 | 5 | 3 |  |  | 2 |  |  |  | 2 |  |  | 1 |  |  |  |  |  |  |
| clinician@tw-sent · Authorization?id=R-0416&section=submission | clinician@tw-sent | 37 | 7 | 7 |  |  | 7 |  |  |  | 13 |  |  |  |  | 1 |  | 1 |  | 1 |
| clinician@tw-sent · Authorization?id=R-0416&section=submission [sections open] | clinician@tw-sent | 34 | 6 | 15 |  |  | 8 |  |  |  |  |  |  | 4 |  |  |  | 1 |  |  |
| clinician@tw-sent · Authorizations | clinician@tw-sent | 48 |  | 1 |  |  | 2 |  |  |  | 44 |  | 1 |  |  |  |  |  |  |  |
| clinician@tw-sent · Authorizations [sections open] | clinician@tw-sent | 3 |  |  |  |  |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| clinician@tw-sent · Referral?id=REF-118 | clinician@tw-sent | 10 |  | 2 |  |  | 1 |  |  |  | 6 |  |  |  |  |  | 1 |  |  |  |
| clinician@tw-sent · Referral?id=REF-118 [sections open] | clinician@tw-sent | 13 | 5 | 3 |  |  | 2 |  |  |  | 2 |  |  | 1 |  |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=outcomes&dataset=case | clinician@analytics-case | 50 | 3 | 25 |  |  | 9 |  |  |  | 12 |  |  |  |  | 1 |  |  |  |  |
| clinician@analytics-case · Analytics?section=payer&dataset=case | clinician@analytics-case | 50 | 2 | 20 |  |  | 11 |  |  |  | 17 |  |  |  |  |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=payer&dataset=case [sections open] | clinician@analytics-case | 4 |  | 4 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=population&dataset=case | clinician@analytics-case | 44 | 2 | 26 |  |  | 9 |  |  |  | 7 |  |  |  |  |  |  |  |  |  |
| clinician@canvas · MyWork?section=todo | clinician@canvas | 18 | 1 | 1 |  |  | 3 |  |  |  | 11 |  | 1 |  |  | 1 |  |  |  |  |
| clinician@canvas · Authorizations | clinician@canvas | 48 |  | 1 |  |  | 2 |  |  |  | 44 |  | 1 |  |  |  |  |  |  |  |
| clinician@canvas · Authorizations [sections open] | clinician@canvas | 3 |  |  |  |  |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| clinician@canvas · DenialIntelligence | clinician@canvas | 22 |  |  |  |  | 11 |  |  |  | 11 |  |  |  |  |  |  |  |  |  |
| clinician@canvas · DenialIntelligence [sections open] | clinician@canvas | 2 |  |  |  |  |  |  |  |  | 2 |  |  |  |  |  |  |  |  |  |
| clinician@canvas · Referrals | clinician@canvas | 19 |  |  |  |  | 4 |  |  |  | 15 |  |  |  |  |  |  |  |  |  |
| clinician@canvas · Referrals [sections open] | clinician@canvas | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| direct_support · ExtHome | direct_support | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| direct_support · ExtDPN | direct_support | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| direct_support · ExtWeekly | direct_support | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| direct_support · ExtMonthly | direct_support | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| direct_support · ExtIncident | direct_support | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| direct_support · MyWork?section=day | direct_support | 13 |  |  |  |  | 3 |  |  |  | 10 |  |  |  |  |  |  |  |  |  |
| direct_support · MyWork?section=day [sections open] | direct_support | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| direct_support@mr-daily · MyWork?section=day | direct_support@mr-daily | 18 | 1 | 1 |  |  | 3 |  |  |  | 12 |  |  |  |  | 1 |  |  |  |  |
| direct_support@mr-daily · MyWork?section=day [sections open] | direct_support@mr-daily | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| direct_support · MobileApp (390) | direct_support | 16 |  |  |  |  | 8 |  |  | 1 | 4 |  | 1 |  |  |  | 2 |  |  |  |
| direct_support · MobileDictate (390) | direct_support | 9 |  |  |  |  | 6 |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| direct_support · MobileAssess (390) | direct_support | 4 |  |  |  |  | 2 |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| guardian · ParentPortal (390) | guardian | 14 | 2 | 1 |  |  | 1 |  |  |  | 9 |  | 1 |  |  |  |  |  |  |  |
| guardian · ParentEnroll (390) | guardian | 20 | 2 | 1 |  |  | 14 |  |  |  | 1 |  | 1 |  |  |  | 1 |  |  |  |
| guardian · ParentSign (390) | guardian | 11 | 2 | 1 |  |  | 4 |  |  |  | 1 |  | 2 |  |  |  | 1 |  |  |  |
| guardian · ParentSign (390) [sections open] | guardian | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guardian · ParentProgress (390) | guardian | 7 | 2 | 1 |  |  | 1 |  |  |  | 2 |  | 1 |  |  |  |  |  |  |  |
| guardian · ParentQuarterly (390) | guardian | 6 | 2 | 1 |  |  | 1 |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| guardian · ParentLetters (390) | guardian | 12 | 2 | 1 |  |  | 7 |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| guardian · ParentLetters (390) [sections open] | guardian | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guardian · ParentSchedule (390) | guardian | 6 | 2 | 1 |  |  | 1 |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| guardian · ParentSurvey (390) | guardian | 14 | 2 | 1 |  |  | 9 |  |  |  | 1 |  | 1 |  |  |  |  |  |  |  |
| guardian · FamilyLink (390) | guardian | 5 | 2 | 1 |  |  | 1 |  |  |  |  |  | 1 |  |  |  |  |  |  |  |
| guardian · AppealLetter?c=EC (390) | guardian | 11 | 2 | 1 |  |  | 4 |  |  |  | 1 |  | 1 |  | 1 |  | 1 |  |  |  |
| guardian (link ar-demo) · ParentPortal (390) | guardian | 14 | 2 | 1 |  |  | 1 |  |  |  | 9 |  | 1 |  |  |  |  |  |  |  |
| guardian (link ar-demo) · FamilyLink (390) | guardian | 11 | 2 | 1 |  |  | 6 |  | 1 |  |  |  | 1 |  |  |  |  |  |  |  |
| school · SchoolPortal (390) | school | 25 |  |  |  |  | 4 |  | 1 |  | 19 |  |  |  |  | 1 |  |  |  |  |
| school · ReferralForm (390) | school | 13 |  |  |  |  | 10 |  |  |  | 1 |  |  |  |  | 1 | 1 |  |  |  |
| school · ReferralForm (390) [sections open] | school | 40 |  |  |  |  | 38 |  | 2 |  |  |  |  |  |  |  |  |  |  |  |
| school · ReferralSent (390) | school | 4 |  |  |  |  |  |  | 1 |  | 2 |  |  |  |  | 1 |  |  |  |  |
| signed out · Login | signed-out | 5 |  |  |  |  | 1 |  |  |  | 4 |  |  |  |  |  |  |  |  |  |
| signed out · WhereThingsLive | signed-out | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · home (400) | jperez | 8 |  |  |  |  | 5 |  |  |  | 1 |  |  | 1 |  |  |  |  | 1 |  |
| panel jperez · home (400) [sections open] | jperez | 26 |  |  |  |  |  |  |  |  | 24 |  |  | 2 |  |  |  |  |  |  |
| panel khale · home (direct support) (400) | khale | 6 |  |  |  |  | 4 |  |  |  | 1 |  |  | 1 |  |  |  |  |  |  |
| panel khale · home (direct support) (400) [sections open] | khale | 6 |  |  |  |  |  |  |  |  | 6 |  |  |  |  |  |  |  |  |  |
| panel cdiaz · home (supervisor) (400) | cdiaz | 4 |  |  |  |  | 1 |  |  |  | 1 |  |  | 2 |  |  |  |  |  |  |
| panel cdiaz · home (supervisor) (400) [sections open] | cdiaz | 20 |  |  |  |  |  |  |  |  | 20 |  |  |  |  |  |  |  |  |  |
| panel dowens · home (admin) (400) | dowens | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · record (400) | jperez | 11 |  |  |  |  | 8 |  |  |  | 2 |  |  | 1 |  |  |  |  |  |  |
| panel jperez · record (400) [sections open] | jperez | 6 |  |  |  |  |  |  |  |  | 4 |  |  | 2 |  |  |  |  |  |  |
| panel khale · daily note (400) | khale | 11 |  |  |  |  | 8 |  |  |  |  | 1 |  |  |  |  | 2 |  |  |  |
| panel khale · daily note (400) [sections open] | khale | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · daily note (clinician) (400) | jperez | 6 |  |  |  |  | 5 |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| panel jperez · daily note (clinician) (400) [sections open] | jperez | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · weekly (400) | jperez | 6 |  |  |  |  | 5 |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| panel jperez · weekly (400) [sections open] | jperez | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · monthly (400) | jperez | 6 |  |  |  |  | 5 |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| panel jperez · monthly (400) [sections open] | jperez | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · incident (400) | jperez | 5 |  |  |  |  | 3 |  |  |  |  |  |  | 1 |  |  |  |  | 1 |  |
| panel jperez · quarterly (400) | jperez | 6 |  |  |  |  | 4 |  |  |  |  |  |  |  |  | 1 | 1 |  |  |  |
| panel jperez · quarterly (400) [sections open] | jperez | 5 |  |  |  |  | 5 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · continued stay (400) | jperez | 11 |  |  |  |  | 9 |  |  |  |  |  |  |  |  |  | 2 |  |  |  |
| panel jperez · continued stay (400) [sections open] | jperez | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · discharge (400) | jperez | 5 |  |  |  |  | 3 |  |  |  |  |  |  | 1 |  |  | 1 |  |  |  |
| panel jperez · discharge (400) [sections open] | jperez | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · forms to approve (400) | jperez | 7 |  |  |  |  | 1 |  |  |  | 6 |  |  |  |  |  |  |  |  |  |
| panel khale · time tracker (400) | khale | 5 |  |  |  |  | 3 |  |  |  | 1 |  |  | 1 |  |  |  |  |  |  |
| panel jperez · authorizations (400) | jperez | 7 |  |  |  |  | 4 |  |  |  | 2 |  |  | 1 |  |  |  |  |  |  |
| panel jperez · authorizations (400) [sections open] | jperez | 6 |  |  |  |  |  |  |  |  | 4 |  |  | 2 |  |  |  |  |  |  |
| panel khale · screening (direct support: not offered) (400) | khale | 2 |  |  |  |  | 2 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. screening (400) | jperez | 7 |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  | 5 |  |  | 1 |
| panel jperez · T.W. screening (400) [sections open] | jperez | 5 |  | 4 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. CNA (400) | jperez | 8 |  |  |  |  | 6 |  |  |  |  | 1 |  |  |  |  |  |  | 1 |  |
| panel jperez · T.W. CNA (400) [sections open] | jperez | 1 |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. ISP (400) | jperez | 6 |  |  |  |  | 4 |  |  |  |  |  |  |  |  | 1 |  |  | 1 |  |
| panel jperez · T.W. ISP (400) [sections open] | jperez | 6 |  | 6 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. initial SRA (400) | jperez | 4 |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  | 1 |  |  |  |
| panel jperez · T.W. initial SRA (400) [sections open] | jperez | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · forms to approve (signed) (400) | jperez | 8 |  |  |  |  | 1 |  |  |  | 7 |  |  |  |  |  |  |  |  |  |
| supervisor · ExtHome | supervisor | 1 |  |  |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |
| supervisor · Authorizations | supervisor | 41 |  | 1 |  |  | 1 |  |  |  | 38 |  | 1 |  |  |  |  |  |  |  |
| supervisor · Authorizations [sections open] | supervisor | 3 |  |  |  |  |  |  |  |  | 3 |  |  |  |  |  |  |  |  |  |
| supervisor · Analytics?section=outcomes | supervisor | 39 | 2 | 20 |  |  | 9 |  |  |  | 8 |  |  |  |  |  |  |  |  |  |
| supervisor · MyWork?section=review | supervisor | 20 | 4 | 3 |  |  | 8 |  |  |  | 2 |  | 2 |  |  |  | 1 |  |  |  |
| supervisor · MyWork?section=team | supervisor | 28 | 10 | 4 |  |  | 7 |  |  |  | 6 |  | 1 |  |  |  |  |  |  |  |
| supervisor · MyWork?section=team [sections open] | supervisor | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| supervisor · MyWork?section=day | supervisor | 28 | 10 | 4 |  |  | 7 |  |  |  | 7 |  |  |  |  |  |  |  |  |  |
| supervisor · MyWork?section=day [sections open] | supervisor | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0411 | supervisor | 19 | 4 | 3 | 1 |  | 3 |  |  |  | 8 |  |  |  |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0411 [sections open] | supervisor | 3 |  | 3 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0399 | supervisor | 34 | 8 | 11 |  |  | 7 |  |  |  | 8 |  |  |  |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0399 [sections open] | supervisor | 19 | 9 | 5 |  |  | 4 |  |  |  |  |  |  |  |  |  |  | 1 |  |  |
| supervisor@tw-signed · Authorization?id=R-0416&section=submission | supervisor@tw-signed | 26 | 7 | 4 |  |  | 3 |  |  |  | 11 |  |  |  |  | 1 |  |  |  |  |
| supervisor@tw-signed · Authorization?id=R-0416&section=submission [sections open] | supervisor@tw-signed | 12 | 1 | 10 |  |  |  |  |  |  |  |  |  | 1 |  |  |  |  |  |  |

## Findings (dead or unexplained controls, unnamed controls, console errors, dead ends)

- **admin · Settings?tab=audit** · link "REF-118" (table) → NAVIGATED · #/Settings?tab=audit -> #/Referral?id=REF-118 · role-dead-end
- **admin · Settings?tab=family** · button "Ask: Child's insurance and Medicaid ID" (table) → DISABLED-UNEXPLAINED
- **admin · Settings?tab=family** · button "Required: Child's insurance and Medicaid ID" (table) → DISABLED-UNEXPLAINED
- **admin · Settings?tab=family** · button "Required: Who else lives in the home" (table) → DISABLED-UNEXPLAINED
- **panel khale · daily note (400)** · select "NOTE" (body) → NO-EFFECT
- **panel jperez · daily note (clinician) (400)** · select "NOTE" (body) → NO-EFFECT
- **panel jperez · weekly (400)** · select "NOTE" (body) → NO-EFFECT
- **panel jperez · monthly (400)** · select "NOTE" (body) → NO-EFFECT
- **panel jperez · T.W. CNA (400)** · select "NOTE" (body) → NO-EFFECT

## Weak effects (focus or scroll only; accepted, listed for a manual look)

- direct_support · MobileApp (390) · link "Change" → FOCUS-ONLY · moved focus to button
- guardian · AppealLetter?c=EC (390) · button "English" → SCROLL · scrolled

## No change by design (allowlist: active tab or toggle, text field, link to the current page, radio already selected)

- admin · Authorizations · button "All 9" · active toggle
- admin · MyWork?section=todo · link "Operations 5 to look at" · link to the current page
- admin · MyWork?section=team · link "Team 4 to look at" · link to the current page
- admin · Settings?tab=people · link "People" · link to the current page
- admin · Settings?tab=roles · link "Roles" · link to the current page
- admin · Settings?tab=units · link "Units" · link to the current page
- admin · Settings?tab=units · number "Value" · text field (focus only)
- admin · Settings?tab=rules · link "Rules" · link to the current page
- admin · Settings?tab=audit · link "Audit" · link to the current page
- admin · Settings?tab=family · link "Family link" · link to the current page
- admin · Settings?tab=family · button "Remote allowed" · active toggle
- admin · Settings?tab=family · button "Remote allowed" · active toggle
- admin · Settings?tab=presenter · link "Presenter" · link to the current page
- clinician · Authorizations · button "All 9" · active toggle
- clinician · MyWork?section=todo · link "To do 13 to look at" · link to the current page
- clinician · MyWork?section=review · link "Review 10 to look at" · link to the current page
- clinician · MyWork?section=review · button "L.B. · Oct 29 R. Owens · 3 units" · link to the current page
- clinician · MyWork?section=team · link "Team 4 to look at" · link to the current page
- clinician · MyWork?section=referrals · link "Referrals 3 to look at" · link to the current page
- clinician · DenialCase?id=R-0402&section=action&action=options · radio "Accept as offered Record 110 of 150 units as awarded. A task asks a person to enter them in Lauris; Psyflo does not." · radio already selected
- clinician · DenialCase?id=R-0388&section=action&action=p2p · radio "Call held · awaiting the decision" · radio already selected
- clinician@tw-isp-ready · Authorizations · button "All 10" · active toggle
- clinician@tw-signed · Authorizations · button "All 10" · active toggle
- clinician@tw-sent · Authorizations · button "All 10" · active toggle
- clinician@canvas · MyWork?section=todo · link "To do 12 to look at" · link to the current page
- clinician@canvas · Authorizations · button "All 10" · active toggle
- direct_support · MobileApp (390) · link "Today" · link to the current page
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
- supervisor · Authorizations · button "All 9" · active toggle
- supervisor · MyWork?section=review · link "Review 10 to look at" · link to the current page
- supervisor · MyWork?section=review · button "L.B. · Oct 29 R. Owens · 3 units" · link to the current page
- supervisor · MyWork?section=team · link "Team 4 to look at" · link to the current page

## Skipped on purpose

- admin · Authorizations · "Sign out" · sign out (covered separately)
- admin · DenialCase?id=R-0402&section=decision · "Owner" · select with one option
- admin · Settings?tab=roles · "Person" · select with one option
- admin@analytics-case · Analytics?section=outcomes&dataset=case · "Sign out" · sign out (covered separately)
- clinician · Referrals · "Sign out" · sign out (covered separately)
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
- clinician@tw-isp-ready · Authorization?id=R-0416&section=submission · "Sign out" · sign out (covered separately)
- clinician@tw-signed · Authorization?id=R-0416&section=submission · "Sign out" · sign out (covered separately)
- clinician@tw-sent · Authorization?id=R-0416&section=submission · "Sign out" · sign out (covered separately)
- clinician@analytics-case · Analytics?section=outcomes&dataset=case · "Sign out" · sign out (covered separately)
- clinician@canvas · MyWork?section=todo · "Sign out" · sign out (covered separately)
- direct_support@mr-daily · MyWork?section=day · "Sign out" · sign out (covered separately)
- school · SchoolPortal (390) · "Sign out" · sign out (covered separately)
- school · ReferralForm (390) · "Sign out" · sign out (covered separately)
- school · ReferralSent (390) · "Sign out" · sign out (covered separately)
- panel jperez · quarterly (400) · "Send the family version for the guardian's signature" · outward send (a person presses it); not clicked by the audit
- panel jperez · T.W. ISP (400) · "Send to parent for signature" · outward send (a person presses it); not clicked by the audit
- supervisor@tw-signed · Authorization?id=R-0416&section=submission · "Sign out" · sign out (covered separately)
