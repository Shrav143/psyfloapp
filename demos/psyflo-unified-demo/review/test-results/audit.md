# audit · FAIL

Run 2026-11-12T00-38-33Z · 1372500 ms · instance 1 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | P19.3 audit · direct_support · ExtHome |  |
| PASS | P19.3 audit · direct_support · ExtDPN |  |
| PASS | P19.3 audit · direct_support · ExtWeekly |  |
| PASS | P19.3 audit · direct_support · ExtMonthly |  |
| PASS | P19.3 audit · direct_support · ExtIncident |  |
| FAIL | P19.3 audit · direct_support · Dashboard | 47 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page" |
| FAIL | P19.3 audit · direct_support · Patient?id=MR | 19 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page" |
| PASS | P19.3 audit · supervisor · ExtHome |  |
| FAIL | P19.3 audit · supervisor · Authorizations | 70 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page" |
| PASS | P19.3 audit · supervisor · Analytics?section=outcomes |  |
| PASS | P19.3 audit · supervisor · Authorization?id=R-0411 |  |
| PASS | P19.3 audit · supervisor · Authorization?id=R-0399 |  |
| FAIL | P19.3 audit · supervisor · Dashboard | 73 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page" |
| FAIL | P19.3 audit · supervisor · Documentation | 107 controls, 1 findings: DISABLED-UNEXPLAINED "Previous page" |
| FAIL | P19.3 audit · supervisor · Documentation?status=pending_review | 77 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page" |
| PASS | P19.3 audit · supervisor · Documentation?view=staff |  |
| FAIL | P19.3 audit · supervisor · Patient?id=MR | 16 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page" |
| FAIL | P19.3 audit · supervisor · Patient?id=DW | 22 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page" |
| PASS | P19.3 audit · clinician · Referrals |  |
| PASS | P19.3 audit · clinician · Referral?id=REF-118 |  |
| PASS | P19.3 audit · clinician · Referral?id=REF-121 |  |
| PASS | P19.3 audit · clinician · Referral?id=REF-119 |  |
| PASS | P19.3 audit · clinician · Referral?id=REF-117 |  |
| PASS | P19.3 audit · clinician · Referral?id=REF-118&panel=eligibility |  |
| PASS | P19.3 audit · clinician · ExtHome |  |
| PASS | P19.3 audit · clinician · ExtScreening |  |
| PASS | P19.3 audit · clinician · ExtCNA |  |
| PASS | P19.3 audit · clinician · ExtISP |  |
| PASS | P19.3 audit · clinician · ExtSRA |  |
| PASS | P19.3 audit · clinician · ExtSignOff |  |
| PASS | P19.3 audit · clinician · ExtDPN |  |
| PASS | P19.3 audit · clinician · ExtWeekly |  |
| PASS | P19.3 audit · clinician · ExtMonthly |  |
| PASS | P19.3 audit · clinician · ExtIncident |  |
| PASS | P19.3 audit · clinician · Authorizations |  |
| PASS | P19.3 audit · clinician · ExtQuarterly |  |
| PASS | P19.3 audit · clinician · ExtCase |  |
| PASS | P19.3 audit · clinician · ExtDischarge |  |
| PASS | P19.3 audit · clinician · Analytics?section=outcomes&dataset=case |  |
| PASS | P19.3 audit · clinician · Analytics?section=outcomes&dataset=illustrative |  |
| PASS | P19.3 audit · clinician · Analytics?section=payer&dataset=case |  |
| PASS | P19.3 audit · clinician · Analytics?section=payer&panel=guidance |  |
| PASS | P19.3 audit · clinician · Analytics?section=population&dataset=illustrative |  |
| PASS | P19.3 audit · clinician · Authorization?id=R-0411 |  |
| PASS | P19.3 audit · clinician · Authorization?id=R-0402 |  |
| PASS | P19.3 audit · clinician · Authorization?id=R-0399 |  |
| PASS | P19.3 audit · clinician · Authorization?id=R-0391 |  |
| PASS | P19.3 audit · clinician · Authorization?id=R-0388 |  |
| PASS | P19.3 audit · clinician · Authorization?id=R-0384 |  |
| PASS | P19.3 audit · clinician · DenialIntelligence |  |
| PASS | P19.3 audit · clinician · DenialIntelligence?decision=partial |  |
| PASS | P19.3 audit · clinician · DenialCase?id=R-0402&section=decision |  |
| PASS | P19.3 audit · clinician · DenialCase?id=R-0402&section=evidence |  |
| PASS | P19.3 audit · clinician · DenialCase?id=R-0402&section=options |  |
| PASS | P19.3 audit · clinician · DenialCase?id=R-0402&section=action&action=options |  |
| PASS | P19.3 audit · clinician · DenialCase?id=R-0402&section=history |  |
| PASS | P19.3 audit · clinician · DenialCase?id=R-0408&section=action&action=info |  |
| PASS | P19.3 audit · clinician · DenialCase?id=R-0388&section=action&action=p2p |  |
| PASS | P19.3 audit · clinician · DenialCase?id=R-0384&section=action&action=appeal |  |
| PASS | P19.3 audit · clinician · DenialCase?id=R-0384&section=action&action=reconsider |  |
| PASS | P19.3 audit · clinician · Dashboard |  |
| PASS | P19.3 audit · clinician · Documentation |  |
| PASS | P19.3 audit · clinician · Documentation?status=pending_review |  |
| PASS | P19.3 audit · clinician · Documentation?view=staff |  |
| PASS | P19.3 audit · clinician · Patient?id=MR |  |
| PASS | P19.3 audit · clinician · Patient?id=TW |  |
| PASS | P19.3 audit · clinician · Patient?id=KT |  |
| PASS | P19.3 audit · admin · Authorizations |  |
| PASS | P19.3 audit · admin · Analytics?section=outcomes |  |
| PASS | P19.3 audit · admin · Analytics?section=payer |  |
| PASS | P19.3 audit · admin · Analytics?section=population&dataset=illustrative |  |
| PASS | P19.3 audit · admin · Authorization?id=R-0411 |  |
| PASS | P19.3 audit · admin · Authorization?id=R-0402 |  |
| PASS | P19.3 audit · admin · DenialIntelligence |  |
| PASS | P19.3 audit · admin · DenialCase?id=R-0402&section=decision |  |
| PASS | P19.3 audit · admin · Settings?tab=people |  |
| PASS | P19.3 audit · admin · Settings?tab=roles |  |
| PASS | P19.3 audit · admin · Settings?tab=units |  |
| PASS | P19.3 audit · admin · Settings?tab=rules |  |
| PASS | P19.3 audit · admin · Settings?tab=audit |  |
| PASS | P19.3 audit · admin · Settings?tab=family |  |
| PASS | P19.3 audit · admin · Settings?tab=presenter |  |
| PASS | P19.3 audit · admin · Dashboard |  |
| PASS | P19.3 audit · admin · Documentation |  |
| PASS | P19.3 audit · admin · Documentation?view=staff |  |
| PASS | P19.3 audit · admin · Patient?id=MR |  |
| PASS | P19.3 audit · clinician@tw-isp-ready · Authorization?id=R-0416&section=submission |  |
| PASS | P19.3 audit · clinician@tw-isp-ready · Authorizations |  |
| PASS | P19.3 audit · clinician@tw-isp-ready · Referral?id=REF-118 |  |
| PASS | P19.3 audit · clinician@tw-signed · Authorization?id=R-0416&section=submission |  |
| PASS | P19.3 audit · clinician@tw-signed · Authorizations |  |
| PASS | P19.3 audit · clinician@tw-signed · Referral?id=REF-118 |  |
| PASS | P19.3 audit · clinician@tw-sent · Authorization?id=R-0416&section=submission |  |
| PASS | P19.3 audit · clinician@tw-sent · Authorizations |  |
| PASS | P19.3 audit · clinician@tw-sent · Referral?id=REF-118 |  |
| PASS | P19.3 audit · supervisor@tw-signed · Authorization?id=R-0416&section=submission |  |
| PASS | P19.3 audit · clinician@analytics-case · Analytics?section=outcomes&dataset=case |  |
| PASS | P19.3 audit · clinician@analytics-case · Analytics?section=payer&dataset=case |  |
| PASS | P19.3 audit · clinician@analytics-case · Analytics?section=population&dataset=case |  |
| PASS | P19.3 audit · admin@analytics-case · Analytics?section=outcomes&dataset=case |  |
| PASS | P19.3 audit · direct_support@mr-daily · Dashboard |  |
| PASS | P19.3 audit · clinician@canvas · Dashboard |  |
| PASS | P19.3 audit · clinician@canvas · Documentation |  |
| PASS | P19.3 audit · clinician@canvas · Authorizations |  |
| PASS | P19.3 audit · clinician@canvas · DenialIntelligence |  |
| PASS | P19.3 audit · clinician@canvas · Referrals |  |
| PASS | P19.3 audit · direct_support · MobileApp (390) |  |
| PASS | P19.3 audit · direct_support · MobileDictate (390) |  |
| PASS | P19.3 audit · direct_support · MobileAssess (390) |  |
| PASS | P19.3 audit · guardian · ParentPortal (390) |  |
| PASS | P19.3 audit · guardian · ParentEnroll (390) |  |
| PASS | P19.3 audit · guardian · ParentSign (390) |  |
| PASS | P19.3 audit · guardian · ParentProgress (390) |  |
| PASS | P19.3 audit · guardian · ParentQuarterly (390) |  |
| PASS | P19.3 audit · guardian · ParentLetters (390) |  |
| PASS | P19.3 audit · guardian · ParentSchedule (390) |  |
| PASS | P19.3 audit · guardian · ParentSurvey (390) |  |
| PASS | P19.3 audit · guardian · FamilyLink (390) |  |
| PASS | P19.3 audit · guardian · AppealLetter?c=EC (390) |  |
| PASS | P19.3 audit · guardian (link ar-demo) · ParentPortal (390) |  |
| PASS | P19.3 audit · guardian (link ar-demo) · FamilyLink (390) |  |
| PASS | P19.3 audit · school · SchoolPortal (390) |  |
| PASS | P19.3 audit · school · ReferralForm (390) |  |
| PASS | P19.3 audit · school · ReferralSent (390) |  |
| PASS | P19.3 audit · signed out · Login |  |
| PASS | P19.3 audit · signed out · WhereThingsLive |  |
| PASS | P19.3 audit · panel jperez · home (400) |  |
| PASS | P19.3 audit · panel khale · home (direct support) (400) |  |
| FAIL | P19.3 audit · panel cdiaz · home (supervisor) (400) | Cannot read properties of undefined (reading 'evaluate') [me/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:228:51)] |
| FAIL | P19.3 audit · panel dowens · home (admin) (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=dowens&next=%2Fconsumers [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · record (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310 [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel khale · daily note (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=khale&next=%2Fconsumers%2F3310%2Fsession%2Fdpn [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · daily note (clinician) (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fdpn [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · weekly (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fweekly [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · monthly (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fcollateral [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · incident (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4102%2Fsession%2Fincident [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · quarterly (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fquarterly [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · continued stay (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fsra-continued [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · discharge (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4102%2Fsession%2Fdischarge [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · forms to approve (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fapprovals [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel khale · time tracker (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=khale&next=%2Ftime [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · authorizations (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fauthorizations [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel khale · screening (direct support: not offered) (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=khale&next=%2Fconsumers%2F3310%2Fsession%2Fscreening [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · T.W. screening (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fscreening [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · T.W. CNA (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fcna [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · T.W. ISP (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fisp [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · T.W. initial SRA (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fsra-initial [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| FAIL | P19.3 audit · panel jperez · forms to approve (signed) (400) | page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fapprovals [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)] |
| PASS | P19.3 audit · panel offers no Process Form, Get Signature or Send (person-only actions) |  |
| PASS | P19.3 audit · the sweep covered what it claims (counts per role, no unreachable targets) |  |

## Output (tail)

```
PASS P19.3 audit · school · SchoolPortal (390)
  53 controls (+40 in sections), 0 findings
PASS P19.3 audit · school · ReferralForm (390)
  4 controls, 0 findings
PASS P19.3 audit · school · ReferralSent (390)
  5 controls, 0 findings
PASS P19.3 audit · signed out · Login
  0 controls, 0 findings
PASS P19.3 audit · signed out · WhereThingsLive
  33 controls (+26 in sections), 0 findings
PASS P19.3 audit · panel jperez · home (400)
  10 controls (+6 in sections), 0 findings
PASS P19.3 audit · panel khale · home (direct support) (400)
FAIL P19.3 audit · panel cdiaz · home (supervisor) (400) — Cannot read properties of undefined (reading 'evaluate') [me/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:228:51)]
FAIL P19.3 audit · panel dowens · home (admin) (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=dowens&next=%2Fconsumers [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · record (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310 [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel khale · daily note (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=khale&next=%2Fconsumers%2F3310%2Fsession%2Fdpn [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · daily note (clinician) (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fdpn [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · weekly (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fweekly [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · monthly (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fcollateral [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · incident (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4102%2Fsession%2Fincident [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · quarterly (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fquarterly [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · continued stay (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fsra-continued [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · discharge (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4102%2Fsession%2Fdischarge [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · forms to approve (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fapprovals [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel khale · time tracker (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=khale&next=%2Ftime [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · authorizations (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fauthorizations [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel khale · screening (direct support: not offered) (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=khale&next=%2Fconsumers%2F3310%2Fsession%2Fscreening [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
  (fixture tw-isp-ready failed: fetch failed)
FAIL P19.3 audit · panel jperez · T.W. screening (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fscreening [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · T.W. CNA (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fcna [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · T.W. ISP (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fisp [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
FAIL P19.3 audit · panel jperez · T.W. initial SRA (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fsra-initial [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
  (fixture tw-signed failed: fetch failed)
FAIL P19.3 audit · panel jperez · forms to approve (signed) (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fapprovals [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
PASS P19.3 audit · panel offers no Process Form, Get Signature or Send (person-only actions)
  controls swept: 1423 on 138 targets · NAVIGATED 531 · VANISHED 382 · DOM 196 · DETAIL 102 · CLOSE 84 · POPUP 65 · NO-EFFECT-ALLOWED 21 · DISABLED-UNEXPLAINED 15 · STATE 7 · DISABLED-EXPLAINED 6 · FILE-CHOOSER 5 · SCROLL 3 · SKIPPED 3 · TYPED 2 · FOCUS-ONLY 1
PASS P19.3 audit · the sweep covered what it claims (counts per role, no unreachable targets)
RESULT audit pass=122 fail=28 skip=0
```
