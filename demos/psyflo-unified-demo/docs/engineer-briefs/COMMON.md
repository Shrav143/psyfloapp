# Cross-engineer contracts (every brief assumes these)

- Case links: authorization case `#/Authorization?id=<requestId>&section=…` (request ids like R-0416); denial workspace `#/DenialCase?id=<requestId>&section=…&action=…` (the request id, not the dispute id; E3 looks the dispute up by request); referral `#/Referral?id=REF-118&panel=eligibility`; analytics `#/Analytics?section=outcomes|payer|population&dataset=case|illustrative`; My Work `#/MyWork?section=…`. Old route ids keep working; redirect flags live in `web/js/shared/redirects-live.js` (F2): each owner flips the flags for the screens they replace when their new screen is complete and tested.
- One lifecycle: `request.stage` (see `web/js/shared/rules.js`, `model.js`, F1's notes in `docs/BUILD-BRIEF.md`). Disputes (E3) reconcile into it through existing `request.*` actions; nobody adds a second status model. Stage `needs_approval` ("Pending clinical approval") sits between `draft_ready` and `awaiting_signature`.
- Units are never written to Lauris by Psyflo. Approved units create a human task "Enter units in Lauris" that closes only when the bridge observes the entry (F1 provides `store.hooks.observed`; E7 provides the mock Lauris authorizations page).
- Deadlines and units come from `rule(s,key)` / `unitsFor()`; every number shown as a rule carries a source chip via `ui.sourceChip`.
- Components come from `web/js/ui/*` (see `docs/UI-KIT.md`). If a component you need is missing, build it in your own file with your owner prefix and tell the lead; do not edit the shared kit.
- Evidence: a statement in a draft carries an evidence chip that resolves to a stored record; missing evidence prints "Evidence missing — verify …".
- Role checks: `can()`; the server enforces; the UI hides and explains ("Needs clinician").
- Do not duplicate selectors: put pure selectors in `web/js/shared/sel/*.js` (importable by server and client).
