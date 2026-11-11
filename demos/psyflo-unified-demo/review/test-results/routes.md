# routes · PASS

Run 2026-11-11T20-47-05Z · 117935 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | registry keeps every historic route id and pre-registers the new routes |  |
| PASS | redirect table matches review/04-architecture.md E1 and 03-ux-audit.md e |  |
| PASS | referrals are never redirected away; AppealLetter and every portal route stay put |  |
| PASS | every redirect has a flag, a registered target and no cycle; every flag is used |  |
| PASS | with every flag on, every historic deep link still resolves to a registered route (no dead ids) |  |
| PASS | legacyFor maps a not-yet-live new route back to the old screen that does the job |  |
| PASS | deep link #/Submission?id=R-0399 as jperez renders Submission with its params, no stub unless the route is not live |  |
| PASS | deep link #/PeerBrief?id=R-0388 as jperez renders PeerBrief with its params, no stub unless the route is not live |  |
| PASS | deep link #/Eligibility?referral=REF-118 as jperez renders Eligibility with its params, no stub unless the route is not live |  |
| PASS | deep link #/Referral?id=REF-118 as jperez renders Referral with its params, no stub unless the route is not live |  |
| PASS | deep link #/Partials?id=R-0402 as jperez renders Partials with its params, no stub unless the route is not live |  |
| PASS | deep link #/Partials as jperez renders Partials with its params, no stub unless the route is not live |  |
| PASS | deep link #/InfoRequest?id=R-0408 as jperez renders InfoRequest with its params, no stub unless the route is not live |  |
| PASS | deep link #/EarlyDischarge?id=R-0402 as jperez renders EarlyDischarge with its params, no stub unless the route is not live |  |
| PASS | deep link #/ExtSignOff?request=R-0416 as jperez renders ExtSignOff with its params, no stub unless the route is not live |  |
| PASS | deep link #/ExtScreening?referral=REF-118 as jperez renders ExtScreening with its params, no stub unless the route is not live |  |
| PASS | deep link #/ExtDPN?client=MR as jperez renders ExtDPN with its params, no stub unless the route is not live |  |
| PASS | deep link #/ExtSRA?client=TW as jperez renders ExtSRA with its params, no stub unless the route is not live |  |
| PASS | deep link #/ExtCase?client=MR as jperez renders ExtCase with its params, no stub unless the route is not live |  |
| PASS | deep link #/ExtWeekly?client=MR as jperez renders ExtWeekly with its params, no stub unless the route is not live |  |
| PASS | deep link #/ExtMonthly?client=MR as jperez renders ExtMonthly with its params, no stub unless the route is not live |  |
| PASS | deep link #/Referrals?f=new as jperez renders Referrals with its params, no stub unless the route is not live |  |
| PASS | deep link #/Authorizations?id=R-0416 as jperez renders Authorizations with its params, no stub unless the route is not live |  |
| PASS | deep link #/Authorizations as jperez renders Authorizations with its params, no stub unless the route is not live |  |
| PASS | deep link #/StaffDashboard?v=sup as cdiaz renders StaffDashboard with its params, no stub unless the route is not live |  |
| PASS | deep link #/StaffDashboard?v=me as khale renders StaffDashboard with its params, no stub unless the route is not live |  |
| PASS | deep link #/ReviewQueue as cdiaz renders ReviewQueue with its params, no stub unless the route is not live |  |
| PASS | deep link #/DoNext as jperez renders DoNext with its params, no stub unless the route is not live |  |
| PASS | deep link #/Users as dowens renders Users with its params, no stub unless the route is not live |  |
| PASS | deep link #/PayerPlaybook as jperez renders PayerPlaybook with its params, no stub unless the route is not live |  |
| PASS | deep link #/Analytics as jperez renders Analytics with its params, no stub unless the route is not live |  |
| PASS | deep link #/MobileAssess?client=AG as khale renders MobileAssess with its params, no stub unless the route is not live |  |
| PASS | deep link #/MobileApp as khale renders MobileApp with its params, no stub unless the route is not live |  |
| PASS | deep link #/MobileDictate as khale renders MobileDictate with its params, no stub unless the route is not live |  |
| PASS | deep link #/ReferralSent renders ReferralSent with its params, no stub unless the route is not live |  |
| PASS | deep link #/ReferralForm renders ReferralForm with its params, no stub unless the route is not live |  |
| PASS | deep link #/SchoolPortal renders SchoolPortal with its params, no stub unless the route is not live |  |
| PASS | deep link #/AppealLetter?id=R-0384 renders AppealLetter with its params, no stub unless the route is not live |  |
| PASS | deep link #/ParentPortal?c=TW renders ParentPortal with its params, no stub unless the route is not live |  |
| PASS | deep link #/FamilyLink?preview=1 renders FamilyLink with its params, no stub unless the route is not live |  |
| PASS | deep link #/WhereThingsLive renders WhereThingsLive with its params, no stub unless the route is not live |  |
| PASS | deep link #/MyWork?section=review as jperez renders MyWork with its params, no stub unless the route is not live |  |
| PASS | deep link #/Dashboard as jperez renders Dashboard with its params, no stub unless the route is not live |  |
| PASS | deep link #/Documentation?status=pending_review as jperez renders Documentation with its params, no stub unless the route is not live |  |
| PASS | deep link #/Documentation?view=staff as cdiaz renders Documentation with its params, no stub unless the route is not live |  |
| PASS | deep link #/Patient?id=MR as jperez renders Patient with its params, no stub unless the route is not live |  |
| PASS | deep link #/Dashboard as khale renders Dashboard with its params, no stub unless the route is not live |  |
| PASS | deep link #/Authorization?id=R-0416&section=submission as jperez renders Authorization with its params, no stub unless the route is not live |  |
| PASS | deep link #/DenialIntelligence?decision=partial as jperez renders DenialIntelligence with its params, no stub unless the route is not live |  |
| PASS | deep link #/DenialCase?id=R-0402&section=action&action=options as jperez renders DenialCase with its params, no stub unless the route is not live |  |
| PASS | deep link #/Settings?tab=people as dowens renders Settings with its params, no stub unless the route is not live |  |
| PASS | deep link #/Analytics?section=payer&dataset=illustrative as jperez renders Analytics with its params, no stub unless the route is not live |  |
| PASS | a LIVE route never renders a stub: every route flagged live in redirects-live.js is a built screen |  |
| PASS | a redirect that is live points at a live route (no redirect may lead to a stub) |  |
| PASS | every stub renders the marker, an h1, a one-line body and a way back to the old screen |  |
| PASS | rail: every item of every role opens a built screen (never a stub) |  |
| PASS | hrefFor and route() apply the redirect table before the registry check (flag flipped in the page) |  |
| PASS | WhereThingsLive redirect opens the presenter drawer (flag flipped in the page); the page stays reachable with ?full=1 |  |
| PASS | unknown route id shows "Page not found" inside the shell (never a blank page or a wrong screen) |  |
| PASS | route access follows the permission table: a clinician cannot open Users, a supervisor cannot open Authorizations' denial queue |  |
| PASS | one h1 on every route this foundation owns; routes with none get a hidden h1 from the shell |  |
