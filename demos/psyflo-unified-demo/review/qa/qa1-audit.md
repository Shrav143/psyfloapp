# Interaction audit (QA1)

Controls swept: 1427 on 175 targets. NAVIGATED 587 · VANISHED 313 · DOM 273 · DETAIL 99 · CLOSE 77 · NO-EFFECT-ALLOWED 23 · POPUP 21 · STATE 11 · TYPED 6 · FILE-CHOOSER 5 · SKIPPED 5 · DISABLED-EXPLAINED 4 · TOAST-ONLY 1 · FOCUS-ONLY 1 · SCROLL 1

## Per role

| Role | Targets | Controls | Findings |
|---|---|---|---|
| direct_support · 1440 px | 8 | 115 | 0 |
| supervisor · 1440 px | 16 | 441 | 0 |
| clinician · 1440 px | 70 | 307 | 0 |
| admin · 1440 px | 20 | 111 | 0 |
| direct_support · 390 px | 3 | 24 | 0 |
| guardian · 390 px | 14 | 131 | 0 |
| school · 390 px | 4 | 82 | 0 |
| signed-out · 1440 px | 2 | 5 | 0 |
| panel · 400 px (all roles) | 38 | 211 | 0 |

## Per route

| Target | Role | Controls | CLOSE | DETAIL | DISABLED-EXPLAINED | DOM | FILE-CHOOSER | FOCUS-ONLY | NAVIGATED | NO-EFFECT-ALLOWED | POPUP | SCROLL | SKIPPED | STATE | TOAST-ONLY | TYPED | VANISHED |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| direct_support · ExtHome | direct_support | 2 |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |
| direct_support · ExtDPN | direct_support | 2 |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |
| direct_support · ExtWeekly | direct_support | 2 |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |
| direct_support · ExtMonthly | direct_support | 2 |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |
| direct_support · ExtIncident | direct_support | 2 |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |
| direct_support · Dashboard | direct_support | 44 |  |  |  | 6 |  |  | 37 | 1 |  |  |  |  |  |  |  |
| direct_support · Patient?id=MR | direct_support | 12 |  |  |  |  |  |  | 11 | 1 |  |  |  |  |  |  |  |
| supervisor · ExtHome | supervisor | 2 |  |  |  |  |  |  | 1 |  | 1 |  |  |  |  |  |  |
| supervisor · Authorizations | supervisor | 48 |  | 1 |  | 1 |  |  | 45 | 1 |  |  |  |  |  |  |  |
| supervisor · Analytics?section=outcomes | supervisor | 39 | 2 | 20 |  | 9 |  |  | 8 |  |  |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0411 | supervisor | 19 | 4 | 3 | 1 | 3 |  |  | 8 |  |  |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0411 [sections open] | supervisor | 5 |  | 5 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0399 | supervisor | 34 | 8 | 11 |  | 7 |  |  | 8 |  |  |  |  |  |  |  |  |
| supervisor · Authorization?id=R-0399 [sections open] | supervisor | 19 | 9 | 5 |  | 4 |  |  |  |  |  |  |  |  | 1 |  |  |
| supervisor · Dashboard | supervisor | 70 |  |  |  | 12 |  |  | 57 | 1 |  |  |  |  |  |  |  |
| supervisor · Documentation | supervisor | 77 | 5 | 9 |  | 10 |  |  | 51 | 2 |  |  |  |  |  |  |  |
| supervisor · Documentation?status=pending_review | supervisor | 63 | 5 | 9 |  | 9 |  |  | 40 |  |  |  |  |  |  |  |  |
| supervisor · Documentation?view=staff | supervisor | 25 | 10 | 4 |  | 5 |  |  | 5 | 1 |  |  |  |  |  |  |  |
| supervisor · Documentation?view=staff [sections open] | supervisor | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| supervisor · Patient?id=MR | supervisor | 8 |  |  |  |  |  |  | 7 | 1 |  |  |  |  |  |  |  |
| supervisor · Patient?id=DW | supervisor | 11 |  |  |  |  |  |  | 10 | 1 |  |  |  |  |  |  |  |
| clinician · Referrals | clinician | 31 | 1 | 1 |  | 1 |  |  | 7 |  |  |  |  |  |  |  | 21 |
| clinician · Referrals [sections open] | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-118 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-121 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-119 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-117 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Referral?id=REF-118&panel=eligibility | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtHome | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtScreening | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtCNA | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtISP | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtSRA | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtSignOff | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtDPN | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtWeekly | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtMonthly | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtIncident | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Authorizations | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtQuarterly | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtCase | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · ExtDischarge | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=outcomes&dataset=case | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=outcomes&dataset=illustrative | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&dataset=case | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=payer&panel=guidance | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Analytics?section=population&dataset=illustrative | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0411 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0402 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0399 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0391 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0388 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Authorization?id=R-0384 | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialIntelligence | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialIntelligence?decision=partial | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=decision | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=evidence | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=options | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=action&action=options | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0402&section=history | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0408&section=action&action=info | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0388&section=action&action=p2p | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0384&section=action&action=appeal | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · DenialCase?id=R-0384&section=action&action=reconsider | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Dashboard | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Documentation | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Documentation?status=pending_review | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Documentation?view=staff | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Patient?id=MR | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Patient?id=TW | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician · Patient?id=KT | clinician | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Authorizations | admin | 58 | 1 | 1 |  | 1 |  |  | 7 |  |  |  |  |  |  |  | 48 |
| admin · Analytics?section=outcomes | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Analytics?section=payer | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Analytics?section=population&dataset=illustrative | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Authorization?id=R-0411 | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Authorization?id=R-0402 | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · DenialIntelligence | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · DenialCase?id=R-0402&section=decision | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=people | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=roles | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=units | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=rules | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=audit | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=family | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Settings?tab=presenter | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Dashboard | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Documentation | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Documentation?view=staff | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin · Patient?id=MR | admin | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-isp-ready · Authorization?id=R-0416&section=submission | clinician@tw-isp-ready | 22 | 1 | 1 |  |  |  |  | 8 |  |  |  |  |  |  |  | 12 |
| clinician@tw-isp-ready · Authorization?id=R-0416&section=submission [sections open] | clinician@tw-isp-ready | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-isp-ready · Authorizations | clinician@tw-isp-ready | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-isp-ready · Referral?id=REF-118 | clinician@tw-isp-ready | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-signed · Authorization?id=R-0416&section=submission | clinician@tw-signed | 22 | 1 | 1 |  |  |  |  | 8 |  |  |  |  |  |  |  | 12 |
| clinician@tw-signed · Authorization?id=R-0416&section=submission [sections open] | clinician@tw-signed | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-signed · Authorizations | clinician@tw-signed | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-signed · Referral?id=REF-118 | clinician@tw-signed | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-sent · Authorization?id=R-0416&section=submission | clinician@tw-sent | 26 | 1 | 1 |  |  |  |  | 8 |  |  |  |  |  |  |  | 16 |
| clinician@tw-sent · Authorization?id=R-0416&section=submission [sections open] | clinician@tw-sent | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-sent · Authorizations | clinician@tw-sent | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@tw-sent · Referral?id=REF-118 | clinician@tw-sent | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| supervisor@tw-signed · Authorization?id=R-0416&section=submission | supervisor@tw-signed | 20 | 1 | 1 |  |  |  |  | 6 |  |  |  |  |  |  |  | 12 |
| supervisor@tw-signed · Authorization?id=R-0416&section=submission [sections open] | supervisor@tw-signed | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=outcomes&dataset=case | clinician@analytics-case | 39 | 1 | 1 |  |  |  |  | 8 |  |  |  |  |  |  |  | 29 |
| clinician@analytics-case · Analytics?section=payer&dataset=case | clinician@analytics-case | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@analytics-case · Analytics?section=population&dataset=case | clinician@analytics-case | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| admin@analytics-case · Analytics?section=outcomes&dataset=case | admin@analytics-case | 35 | 1 | 1 |  |  |  |  | 8 |  |  |  |  |  |  |  | 25 |
| direct_support@mr-daily · Dashboard | direct_support@mr-daily | 49 | 1 | 1 |  | 2 |  |  | 1 |  |  |  |  |  |  |  | 44 |
| clinician@canvas · Dashboard | clinician@canvas | 103 | 1 | 1 |  | 2 |  |  | 6 |  |  |  |  |  |  |  | 93 |
| clinician@canvas · Documentation | clinician@canvas | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@canvas · Authorizations | clinician@canvas | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@canvas · DenialIntelligence | clinician@canvas | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| clinician@canvas · Referrals | clinician@canvas | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| direct_support · MobileApp (390) | direct_support | 11 |  |  | 3 | 6 |  | 1 | 1 |  |  |  |  |  |  |  |  |
| direct_support · MobileDictate (390) | direct_support | 9 |  |  |  | 6 |  |  | 3 |  |  |  |  |  |  |  |  |
| direct_support · MobileAssess (390) | direct_support | 4 |  |  |  | 2 |  |  | 1 | 1 |  |  |  |  |  |  |  |
| guardian · ParentPortal (390) | guardian | 14 | 2 | 1 |  | 1 |  |  | 9 | 1 |  |  |  |  |  |  |  |
| guardian · ParentEnroll (390) | guardian | 20 | 2 | 1 |  | 14 |  |  | 1 | 1 |  |  |  | 1 |  |  |  |
| guardian · ParentSign (390) | guardian | 11 | 2 | 1 |  | 4 |  |  | 1 | 2 |  |  |  | 1 |  |  |  |
| guardian · ParentSign (390) [sections open] | guardian | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guardian · ParentProgress (390) | guardian | 7 | 2 | 1 |  | 1 |  |  | 2 | 1 |  |  |  |  |  |  |  |
| guardian · ParentQuarterly (390) | guardian | 6 | 2 | 1 |  | 1 |  |  | 1 | 1 |  |  |  |  |  |  |  |
| guardian · ParentLetters (390) | guardian | 12 | 2 | 1 |  | 7 |  |  | 1 | 1 |  |  |  |  |  |  |  |
| guardian · ParentLetters (390) [sections open] | guardian | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| guardian · ParentSchedule (390) | guardian | 6 | 2 | 1 |  | 1 |  |  | 1 | 1 |  |  |  |  |  |  |  |
| guardian · ParentSurvey (390) | guardian | 14 | 2 | 1 |  | 9 |  |  | 1 | 1 |  |  |  |  |  |  |  |
| guardian · FamilyLink (390) | guardian | 5 | 2 | 1 |  | 1 |  |  |  | 1 |  |  |  |  |  |  |  |
| guardian · AppealLetter?c=EC (390) | guardian | 11 | 2 | 1 |  | 4 |  |  | 1 | 1 |  | 1 |  | 1 |  |  |  |
| guardian (link ar-demo) · ParentPortal (390) | guardian | 14 | 2 | 1 |  | 1 |  |  | 9 | 1 |  |  |  |  |  |  |  |
| guardian (link ar-demo) · FamilyLink (390) | guardian | 11 | 2 | 1 |  | 6 | 1 |  |  | 1 |  |  |  |  |  |  |  |
| school · SchoolPortal (390) | school | 25 |  |  |  | 4 | 1 |  | 19 |  |  |  | 1 |  |  |  |  |
| school · ReferralForm (390) | school | 13 |  |  |  | 10 |  |  | 1 |  |  |  | 1 | 1 |  |  |  |
| school · ReferralForm (390) [sections open] | school | 40 |  |  |  | 38 | 2 |  |  |  |  |  |  |  |  |  |  |
| school · ReferralSent (390) | school | 4 |  |  |  |  | 1 |  | 2 |  |  |  | 1 |  |  |  |  |
| signed out · Login | signed-out | 5 |  |  |  | 1 |  |  | 4 |  |  |  |  |  |  |  |  |
| signed out · WhereThingsLive | signed-out | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · home (400) | jperez | 7 |  |  |  | 4 |  |  | 2 |  | 1 |  |  |  |  |  |  |
| panel jperez · home (400) [sections open] | jperez | 26 |  |  |  |  |  |  | 24 |  | 2 |  |  |  |  |  |  |
| panel khale · home (direct support) (400) | khale | 4 |  |  |  | 2 |  |  | 1 |  | 1 |  |  |  |  |  |  |
| panel khale · home (direct support) (400) [sections open] | khale | 6 |  |  |  |  |  |  | 6 |  |  |  |  |  |  |  |  |
| panel cdiaz · home (supervisor) (400) | cdiaz | 4 |  |  |  | 1 |  |  | 1 |  | 2 |  |  |  |  |  |  |
| panel cdiaz · home (supervisor) (400) [sections open] | cdiaz | 20 |  |  |  |  |  |  | 20 |  |  |  |  |  |  |  |  |
| panel dowens · home (admin) (400) | dowens | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · record (400) | jperez | 10 |  |  |  | 7 |  |  | 2 |  | 1 |  |  |  |  |  |  |
| panel jperez · record (400) [sections open] | jperez | 6 |  |  |  |  |  |  | 4 |  | 2 |  |  |  |  |  |  |
| panel khale · daily note (400) | khale | 6 |  |  |  | 6 |  |  |  |  |  |  |  |  |  |  |  |
| panel khale · daily note (400) [sections open] | khale | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| panel jperez · daily note (clinician) (400) | jperez | 6 |  |  |  | 6 |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · daily note (clinician) (400) [sections open] | jperez | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| panel jperez · weekly (400) | jperez | 6 |  |  |  | 6 |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · weekly (400) [sections open] | jperez | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| panel jperez · monthly (400) | jperez | 6 |  |  |  | 6 |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · monthly (400) [sections open] | jperez | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| panel jperez · incident (400) | jperez | 5 |  |  |  | 3 |  |  |  |  | 1 |  |  |  |  | 1 |  |
| panel jperez · quarterly (400) | jperez | 6 |  |  |  | 4 |  |  |  |  |  |  | 1 | 1 |  |  |  |
| panel jperez · quarterly (400) [sections open] | jperez | 5 |  |  |  | 5 |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · continued stay (400) | jperez | 11 |  |  |  | 9 |  |  |  |  |  |  |  | 2 |  |  |  |
| panel jperez · continued stay (400) [sections open] | jperez | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · discharge (400) | jperez | 5 |  |  |  | 3 |  |  |  |  | 1 |  |  | 1 |  |  |  |
| panel jperez · discharge (400) [sections open] | jperez | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · forms to approve (400) | jperez | 7 |  |  |  | 1 |  |  | 6 |  |  |  |  |  |  |  |  |
| panel khale · time tracker (400) | khale | 3 |  |  |  | 1 |  |  | 1 |  | 1 |  |  |  |  |  |  |
| panel jperez · authorizations (400) | jperez | 6 |  |  |  | 3 |  |  | 2 |  | 1 |  |  |  |  |  |  |
| panel jperez · authorizations (400) [sections open] | jperez | 6 |  |  |  |  |  |  | 4 |  | 2 |  |  |  |  |  |  |
| panel khale · screening (direct support: not offered) (400) | khale | 1 |  |  |  | 1 |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. screening (400) | jperez | 7 |  |  |  | 1 |  |  |  |  |  |  |  | 2 |  | 3 | 1 |
| panel jperez · T.W. screening (400) [sections open] | jperez | 5 |  | 4 |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| panel jperez · T.W. CNA (400) | jperez | 8 |  |  |  | 7 |  |  |  |  |  |  |  |  |  | 1 |  |
| panel jperez · T.W. CNA (400) [sections open] | jperez | 1 |  |  |  |  |  |  | 1 |  |  |  |  |  |  |  |  |
| panel jperez · T.W. ISP (400) | jperez | 6 |  |  |  | 4 |  |  |  |  |  |  | 1 |  |  | 1 |  |
| panel jperez · T.W. ISP (400) [sections open] | jperez | 6 |  | 6 |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · T.W. initial SRA (400) | jperez | 4 |  |  |  | 3 |  |  |  |  |  |  |  | 1 |  |  |  |
| panel jperez · T.W. initial SRA (400) [sections open] | jperez | 0 |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| panel jperez · forms to approve (signed) (400) | jperez | 8 |  |  |  | 1 |  |  | 7 |  |  |  |  |  |  |  |  |

## Findings (dead or unexplained controls, unnamed controls, console errors, dead ends)

None.

## Weak effects (focus or scroll only; accepted, listed for a manual look)

- direct_support · MobileApp (390) · link "Today" → FOCUS-ONLY · moved focus to main#main
- guardian · AppealLetter?c=EC (390) · button "English" → SCROLL · scrolled

## No change by design (allowlist: active tab or toggle, text field, link to the current page, radio already selected)

- direct_support · Dashboard · button "All 6" · active toggle
- direct_support · Patient?id=MR · button "All" · active toggle
- supervisor · Authorizations · button "All 9" · active toggle
- supervisor · Dashboard · button "All 13" · active toggle
- supervisor · Documentation · link "Documents" · link to the current page
- supervisor · Documentation · button "Open 39" · active toggle
- supervisor · Documentation?view=staff · link "By staff" · link to the current page
- supervisor · Patient?id=MR · button "All" · active toggle
- supervisor · Patient?id=DW · button "All" · active toggle
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

- school · SchoolPortal (390) · "Sign out" · sign out (covered separately)
- school · ReferralForm (390) · "Sign out" · sign out (covered separately)
- school · ReferralSent (390) · "Sign out" · sign out (covered separately)
- panel jperez · quarterly (400) · "Send the family version for the guardian's signature" · outward send (a person presses it); not clicked by the audit
- panel jperez · T.W. ISP (400) · "Send to parent for signature" · outward send (a person presses it); not clicked by the audit
