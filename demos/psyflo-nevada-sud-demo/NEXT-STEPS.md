# Psyflo × Community Counseling Center of Southern Nevada · next steps

This demo retargets Psyflo to the Nevada adult substance-use clinic from the discovery call: ASAM Level 1 and Level 2.1 IOP, Nevada Medicaid FFS plus the five southern-Nevada MCOs, grant clients with no PA. It shows the product vision for their stated priorities, not what is built for them yet. **Synthetic data only.**

## Run it

1. Install Node.js 20+ (nodejs.org).
2. Unzip and double-click `Start demo (Mac).command` (or the Windows `.bat`). It opens http://localhost:4000.
3. On sign-in, pick a role card: **Billing & authorizations** (Dana Owens), **Clinician** (Jordan Perez, LCADC), **Clinical supervisor** (Carla Diaz, LCSW) or **Credentialing** (Lena Ortiz).
4. **Reset…** in the top bar puts the data back: *Live flows* walks T.W. from his drug-court referral to a sent PA.

`README.md` has the demo script, the screen list and what is real vs stubbed.

## What to show, in their priority order

1. **Work the denials** — Claims & denials: timely-filing countdowns per claim, denial codes in plain English, "paid last week, denied this week", the write-off trend, a reconsideration packet with proof of timely submission. E.C.'s Anthem denial ("provider type not eligible for 90837") → the reconsideration letter citing the SUAM enrollment.
2. **Prior authorizations** — Flow C (T.W.: 72 units H0015, SilverSummit, UDS attached, sign → send → track); Do next for the clinician; Molina's 5-session renewals drafted at session 3; M.R.'s continued stay arguing D5 against "abstinent in treatment"; T.N.'s peer-to-peer notes.
3. **Credentialing** — each clinician's NPI × Nevada Medicaid × each MCO, days waiting, what is blocking, sessions that cannot be billed yet.
4. **Payer playbook · what changed** — the plan rule changes Psyflo picked up from denials (SilverSummit UDS, Molina 5 sessions, HPN 24-session rule, Anthem SUAM reviewer, CareSource page-1 ratings, Molina abstinent denials) and what Psyflo now does about each.

**Front door, if time allows:** Referrals from drug court / P&P / self / ED / HIV clinic, Nevada Medicaid EVS eligibility, grant routing (REF-116, no PA), Flow A (intake screening and ASAM fill the EHR form).

## Live vs stubbed (say it plainly)

- Live in the demo: Flow A (intake screening / ASAM fills the EHR form), Flow C (draft → sign → send → track a PA), referral review, EVS eligibility recording, grant routing, Do next, Users & roles.
- Seeded: Claims & denials, Credentialing, Payer playbook feed, Analytics numbers (labelled demo numbers).
- Stubs: fax, SMS, email, the payer portals and EVS (a person reads the lookup and records it). The EHR is a mock ("Client Record"), not theirs.
- Rules that never bend: a person signs, a person presses Send, nothing auto-submits; no EHR integration needed to start.

## Questions to confirm with the clinic

- **Provider type / specialty:** Provider Type 17, Specialty 215 · Substance Use Agency Model? Which mental-health codes their enrollment covers (for the Anthem reconsiderations).
- **Timely filing per plan:** FFS and each MCO (the demo uses 180 days from the date of service).
- **Which plan does 5-session authorizations** for IOP (Molina in the demo).
- **Which plan requires the UDS at assessment** for Level 2.1 initials (SilverSummit in the demo), and since when.
- **Which plans stopped applying the 24-session no-PA rule** for Level 1 (HPN in the demo).
- **Their EHR:** name, version, and what it exports or prints (assessment, treatment plan, entitlements, units used, claims).
- **IOP unit definition:** H0015 as 1 unit = 1 hour (9 a week), or per diem / per 15 min with some plans.
- How many open denials and how much AR is past the filing limit today (to size the pilot goal).
- Who submits (two billing staff?), who signs (clinical director only?), and which portals each plan uses.

## Pilot terms (talking points only, from the call)

- **$1,000 refundable deposit** to start; it comes back if they stop.
- **4–8 week pilot**, goals set together first (e.g. denials worked per week, PAs submitted on time, days to decision).
- After the pilot, **about $1,000–1,500 a month** for early partners.
- Not on any screen; confirm before putting numbers in writing.

## Before the call

- Rehearse the Live flows reset → REF-118 → EVS → Flow A → Flow C → Do next → Claims → Credentialing → Payer playbook.
- Have the trust center and a BAA ready to send; 42 CFR Part 2 questions are likely (SUD records).
- The clinic name is a placeholder (Community Counseling Center of Southern Nevada); swap it with one global replace if they want their own name on it.
