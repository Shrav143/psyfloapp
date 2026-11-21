# Psyflo × Harvest demo · next steps (Nov 8)

This zip is the **full product vision** we showed Harvest, updated with the Nov 7 call (Rohit) and the Nov 8 team call. It shows everything Harvest asked for, not what we will build first. Scoping is the next job.

## Run it

1. Install Node.js 20+ (nodejs.org).
2. Unzip and double-click `Start demo (Mac).command` (or the Windows `.bat`). It opens http://localhost:4000.
3. On sign-in, pick a role card (Direct support, Supervisor, Clinician, Admin), or open the **Family portal** or **School counselor** below them.
4. **Reset…** in the top bar puts the data back: *Live flows* walks T.W. from referral to request; *Canvas snapshot* is Oct 29 as designed.

The "How the data gets in" button on every screen says where each piece of data comes from. `README.md` has the details; `docs/product-direction.md` has the vision and the full feature inventory.

## Must-haves for launch (Feb 1 ready, mid-Feb staff training)

- **Note capture and enhancement:** staff say or type what happened (phone or extension), Psyflo drafts the clinical note against the treatment plan, the person fills it into Lauris. Covers daily notes, weekly guardian calls, monthly collateral calls.
- **Screening and intake recording** that fills the Lauris forms, and keeping the version actually saved in Lauris.
- **Referrals and Authorizations** in the platform, working perfectly: tracking, history per request, Sfax.
- Harvest's pilot KPIs: on-time notes (daily notes within 24 h), time spent writing notes. Not approval rate.

**Can wait:** Do next, the supervisor review queue (tier 2), Staff dashboard, Analytics, Payer playbook, incident reports, the family and school portals beyond referral and signing.

## Who's doing what this week

| Who | What | By |
|---|---|---|
| Plaban + Rohit | Review the demo and the roadmap (Product folder); propose milestones (every 2 weeks) and what launches by Feb 1; engineers needed. Be conservative, pad the estimates. | Mon |
| Plaban | Attio → Apollo migration overview with Deanna once roadmapping is done (likely while waiting on Lauris access) | midweek |
| Mariam | Tally analysis of staff responses → a short deck for Harvest on their bottlenecks | Tue night |
| Mariam | UX review of this demo: a shortlist of suggested changes first, then small fixes in Claude Code (no big overhauls) | after the deck |
| Shravan | Review the clinic workflow audit line by line for accuracy; update the workflow map from this week's transcripts | this week |
| Shravan | Virginia TDT provider database; two email drafts for the VACBP pilot sign-ups; conference outreach (direct email, not Apollo) | this week |
| Deanna | Compliance and legal with counsel: BAA, trust center, MOU or contract | Fri |

**By Friday, Harvest should have:** the trust center, the BAA, the MOU or contract, a Lauris walkthrough scheduled, and a walkthrough of this updated demo.

## Open questions for Harvest

- **Lauris access** (pending): the real admission screening, intake, ISP, SRA and DPN forms and their boxes. We have hard copies in the pilot folder.
- **Units:** read them from Lauris (staff already enter them) or confirm them in Psyflo?
- **School counselor updates:** in that day's daily note (credited to the counselor) or a separate non-billable contact note in Lauris? Does school information in a daily note cause billing problems?
- **Incident reports:** the state portal workflow.
- **Peer-to-peer recording:** is it allowed, and with whose consent?
- **Note filling:** can the extension fill Lauris on its own once a student is open, or does a person press Fill each time? (Rohit and Plaban)

## Not real in the demo

Speech-to-text uses the browser's own; AI drafting is canned or rule-based; Sfax, SMS, email and the Google Calendar availability are stubs; the mock Lauris is our approximation, not the real screens. All data is synthetic.

## Reminders

- Internal talk stays in Slack or email. The Harvest Slack channel is client-facing: ask Deanna before contacting Harvest.
- Deanna will never ask for credentials, money or gift cards by text, WhatsApp or LinkedIn. People are impersonating her, so treat any such request as a scam.
- Full-team syncs are Saturday mornings; daily morning check-ins this week.
