# Test results · 2026-11-12T00-38-33Z

3 suites pass · 4 fail · 0 known-fail · 0 skipped · 0 not runnable · tests: 625 pass, 153 fail, 1 skip · 1373 s

Commit 6e160c9 · node v22.22.0 · demo time 15:30 · workers 3 · base port 5400

| Suite | Status | Pass | Fail | Skip | Seconds |
|---|---|---|---|---|---|
| [parity](parity.md) | FAIL | 3 | 1 | 0 | 155.6 |
| [roles](roles.md) | PASS | 24 | 0 | 0 | 19.5 |
| [a11y](a11y.md) | FAIL | 252 | 3 | 0 | 290.7 |
| [routes](routes.md) | PASS | 61 | 0 | 0 | 199.9 |
| [safety](safety.md) | PASS | 48 | 0 | 1 | 97.8 |
| [visual](visual.md) | FAIL | 115 | 121 | 0 | 354.7 |
| [audit](audit.md) | FAIL | 122 | 28 | 0 | 1372.5 |

## Failures

- **parity** · no id is NOT-VERIFIED that could have been verified: no silent removal of a kept feature, no id without a probe or a passing suite — 7 ids:
- **a11y** · A11Y-R clinician · Analytics?section=outcomes&dataset=case (1440) — 1 targets under 24px: About Assessment trends 18x18
- **a11y** · A11Y-F clinician · Analytics?section=outcomes&dataset=case (1024) — 1 targets under 24px at 1024: About Assessment trends 18x18
- **a11y** · A11Y-F clinician · Analytics?section=outcomes&dataset=case (400) — 1 targets under 24px at 400: About Assessment trends 18x18
- **visual** · P19.5 visual · clinician · Dashboard (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Documentation (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Documentation?status=pending_review (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Documentation?view=staff (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Patient?id=MR (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Patient?id=MR&section=authorization (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Patient?id=TW (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorizations (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0411 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0402 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0399&section=submission (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0391 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0388 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0384 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialIntelligence (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402 (1440) — text over text: "Payer-specific" [span.ui-chip__t] over "Accept the offer…" [button]; "Sentara Health Plans · T" [p.d-hd__s] over "Ask for a peer-to-peer…" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0408 (1440) — text over text: "2 h left" [span.ui-chip__d] over "Draft or review the repl" [button]; "Payer-specific" [span.ui-chip__t] over "Draft or review the repl" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=said (1440) — text over text: "Payer-specific" [span.ui-chip__t] over "Accept the offer…" [button]; "Sentara Health Plans · T" [p.d-hd__s] over "Ask for a peer-to-peer…" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0408&section=weak (1440) — text over text: "2 h left" [span.ui-chip__d] over "Draft or review the repl" [button]; "Payer-specific" [span.ui-chip__t] over "Draft or review the repl" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0408&section=docreq (1440) — text over text: "2 h left" [span.ui-chip__d] over "Draft or review the repl" [button]; "Payer-specific" [span.ui-chip__t] over "Draft or review the repl" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=decision (1440) — text over text: "Payer-specific" [span.ui-chip__t] over "Accept the offer…" [button]; "Sentara Health Plans · T" [p.d-hd__s] over "Ask for a peer-to-peer…" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=evidence (1440) — text over text: "Payer-specific" [span.ui-chip__t] over "Accept the offer…" [button]; "Sentara Health Plans · T" [p.d-hd__s] over "Ask for a peer-to-peer…" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=options (1440) — text over text: "Payer-specific" [span.ui-chip__t] over "Accept the offer…" [button]; "Sentara Health Plans · T" [p.d-hd__s] over "Ask for a peer-to-peer…" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=action&action=options (1440) — text over text: "Payer-specific" [span.ui-chip__t] over "Accept the offer…" [button]; "Sentara Health Plans · T" [p.d-hd__s] over "Ask for a peer-to-peer…" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=history (1440) — text over text: "Payer-specific" [span.ui-chip__t] over "Accept the offer…" [button]; "Sentara Health Plans · T" [p.d-hd__s] over "Ask for a peer-to-peer…" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0408&section=action&action=info (1440) — text over text: "2 h left" [span.ui-chip__d] over "Draft or review the repl" [button]; "Payer-specific" [span.ui-chip__t] over "Draft or review the repl" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0388&section=action&action=p2p (1440) — text over text: "41 d" [span.ui-chip__d] over "Change the call…" [button]; "Sentara Health Plans · T" [p.d-hd__s] over "Log the outcome…" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0384&section=action&action=appeal (1440) — text over text: "53 d" [span.ui-chip__d] over "Prepare an appeal" [button]; "Unverified" [span.ui-chip__t] over "Prepare an appeal" [button]; +2 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Referrals (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Referral?id=REF-118 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Referral?id=REF-118&panel=eligibility (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Referral?id=REF-121 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Analytics?section=outcomes&dataset=case (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Analytics?section=outcomes&dataset=illustrative (1440) — 6 text nodes under 12px: span.sh-top__dot:11:9+; small:10:n = 27; small:10:n = 19; +3 more
- **visual** · P19.5 visual · clinician · Analytics?section=payer&dataset=case (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Analytics?section=population&dataset=illustrative (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Dashboard (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Documentation (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Documentation?status=pending_review (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Documentation?view=staff (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Patient?id=MR (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Patient?id=MR&section=authorization (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Patient?id=TW (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorizations (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0411 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0402 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0399&section=submission (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0391 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0388 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Authorization?id=R-0384 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialIntelligence (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0408 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=said (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0408&section=weak (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0408&section=docreq (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=decision (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=evidence (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=options (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=action&action=options (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0402&section=history (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0408&section=action&action=info (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0388&section=action&action=p2p (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · DenialCase?id=R-0384&section=action&action=appeal (1024) — text over text: "Appeal window closes · D" [span.ui-chip__t] over "Prepare an appeal" [button]; "Anthem HealthKeepers Plu" [p.d-hd__s] over "Request reconsideration" [button]; +2 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Referrals (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Referral?id=REF-118 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Referral?id=REF-118&panel=eligibility (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Referral?id=REF-121 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Analytics?section=outcomes&dataset=case (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Analytics?section=outcomes&dataset=illustrative (1024) — 6 text nodes under 12px: span.sh-top__dot:11:9+; small:10:n = 27; small:10:n = 19; +3 more
- **visual** · P19.5 visual · clinician · Analytics?section=payer&dataset=case (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician · Analytics?section=population&dataset=illustrative (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Dashboard (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Documentation (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Authorizations (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Authorization?id=R-0402 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · DenialIntelligence (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · DenialCase?id=R-0402&section=decision (1440) — text over text: "Authorization" [span.ui-muted] over "Mark for clinical review" [button]; "Partial: decide" [span.ui-chip__t] over "Mark for clinical review" [button]; +1 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Analytics?section=outcomes (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Analytics?section=payer (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=people (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=roles (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=units (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=rules (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=audit (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=family (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=presenter (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Dashboard (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Documentation (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Authorizations (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Authorization?id=R-0402 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · DenialIntelligence (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · DenialCase?id=R-0402&section=decision (1024) — text over text: "Reply by · Oct 30" [span.ui-chip__t] over "Mark for clinical review" [button]; "1 d" [span.ui-chip__d] over "Mark for clinical review" [button]; +2 more · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Analytics?section=outcomes (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Analytics?section=payer (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=people (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=roles (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=units (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=rules (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=audit (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=family (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · admin · Settings?tab=presenter (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician@tw-isp-ready · Authorization?id=R-0416 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician@tw-isp-ready · Authorization?id=R-0416 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician@tw-signed · Authorization?id=R-0416 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician@tw-signed · Authorization?id=R-0416 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician@tw-sent · Authorization?id=R-0416 (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · clinician@tw-sent · Authorization?id=R-0416 (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · long table · Authorizations queue, 60 rows (1440) — header is not sticky (offset -23px after scrolling the page) · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · long table · Denial Intelligence queue, 60 rows (1440) — header is not sticky (offset 24px after scrolling the page) · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · long table · Referrals queue, 60 rows (1440) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · long table · Authorizations queue, 60 rows (1024) — header is not sticky (offset 177px after scrolling the page) · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · long table · Denial Intelligence queue, 60 rows (1024) — header is not sticky (offset 24px after scrolling the page) · 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · long table · Referrals queue, 60 rows (1024) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · empty state · Authorizations (filter that yields none) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · empty state · Denial Intelligence (filter that yields none) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · empty state · Referrals (filter that yields none) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · empty state · Analytics population with the case-backed dataset (minimum group size) — 1 text nodes under 12px: span.sh-top__dot:11:9+
- **visual** · P19.5 visual · Denial case action open (400) — could not open: locator.click: Timeout 30000ms exceeded.
- **visual** · P19.5 visual · Denial case action open (1024) — could not open: locator.click: Timeout 30000ms exceeded.
- **visual** · P19.5 visual · Denial case action open (1440) — could not open: locator.click: Timeout 30000ms exceeded.
- **audit** · P19.3 audit · direct_support · Dashboard — 47 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page"
- **audit** · P19.3 audit · direct_support · Patient?id=MR — 19 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page"
- **audit** · P19.3 audit · supervisor · Authorizations — 70 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page"
- **audit** · P19.3 audit · supervisor · Dashboard — 73 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page"
- **audit** · P19.3 audit · supervisor · Documentation — 107 controls, 1 findings: DISABLED-UNEXPLAINED "Previous page"
- **audit** · P19.3 audit · supervisor · Documentation?status=pending_review — 77 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page"
- **audit** · P19.3 audit · supervisor · Patient?id=MR — 16 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page"
- **audit** · P19.3 audit · supervisor · Patient?id=DW — 22 controls, 2 findings: DISABLED-UNEXPLAINED "Previous page"; DISABLED-UNEXPLAINED "Next page"
- **audit** · P19.3 audit · panel cdiaz · home (supervisor) (400) — Cannot read properties of undefined (reading 'evaluate') [me/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:228:51)]
- **audit** · P19.3 audit · panel dowens · home (admin) (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=dowens&next=%2Fconsumers [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · record (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310 [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel khale · daily note (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=khale&next=%2Fconsumers%2F3310%2Fsession%2Fdpn [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · daily note (clinician) (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fdpn [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · weekly (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fweekly [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · monthly (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fcollateral [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · incident (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4102%2Fsession%2Fincident [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · quarterly (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fquarterly [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · continued stay (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F3310%2Fsession%2Fsra-continued [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · discharge (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4102%2Fsession%2Fdischarge [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · forms to approve (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fapprovals [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel khale · time tracker (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=khale&next=%2Ftime [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · authorizations (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fauthorizations [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel khale · screening (direct support: not offered) (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=khale&next=%2Fconsumers%2F3310%2Fsession%2Fscreening [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · T.W. screening (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fscreening [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · T.W. CNA (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fcna [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · T.W. ISP (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fisp [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · T.W. initial SRA (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fconsumers%2F4492%2Fsession%2Fsra-initial [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]
- **audit** · P19.3 audit · panel jperez · forms to approve (signed) (400) — page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5411/login?as=jperez&next=%2Fapprovals [ome/user/psyfloapp/demos/psyflo-unified-demo/test/lib/audit.mjs:211:5)]

## Skipped (reason required)

- safety · EXA-06 services after a lapse of more than 31 days are flagged for discharge review — NOT-RUNNABLE: the 31-day rule (discharge.lapse_days, officially verified) is displayed text in the transition section only; no queue, banner or My Work line flags a lapse

## Manual checklist (not automatable)

| Item | Owner | State |
|---|---|---|
| MV3 side panel in real Chrome (load unpacked, run S1 and S3) | QA | PENDING |
| Live microphone and Web Speech on the demo laptop | QA | PENDING |
| Safari and Firefox behaviour | QA | PENDING |
| Venue network and fonts | QA | PENDING |
| Run-sheet comprehension check (three people) | Lead | PENDING |

