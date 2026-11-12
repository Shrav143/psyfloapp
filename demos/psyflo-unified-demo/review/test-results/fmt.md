# fmt · PASS

Run 2026-11-12T20-05-25Z · 33717 ms · instance 2 · exit 0

| Result | Test | Note |
|---|---|---|
| PASS | the date cards: "Authorization period" and "Decision date" both come from ui.dateCard: same structure, same size, same place at 1440 px |  |
| PASS | the date cards behave the same: a date is a from/to param, a quick chip lights, "Clear" empties the card; Authorizations keeps its Ends in mode, Denial Intelligence its ranges |  |
| PASS | the two list pages share one page: header (title, maturity or info icon, card top right), one filter grid, one table style, the same cells, the pager at the foot |  |
| PASS | empty states read the same: "Nothing matches" and "Clear a filter to see more." on both lists |  |
| PASS | quiet labels are icons with a definition: the source icon shows its sentence on hover and on keyboard focus, and the visible table carries no source words |  |
| PASS | the case pages share the breadcrumb, the header card and the section card (same width, radius, padding, heading size) |  |
| PASS | administrator and supervisor get the same shared pages with their own scope: the date card on both lists; the admin reads the lock icon, never clinical text |  |
| PASS | evidence missing: the Authorization evidence card shows one warning icon with a count and the items to verify; Denial Intelligence keeps the "Evidence missing | verify …" pills in its evidence list and drafts |
| PASS | phone width 390: both list pages and both case pages have no horizontal page scroll; the date card, inputs and chips are at least 24 px |  |
