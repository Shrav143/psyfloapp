# parity · FAIL

Run 2026-11-12T00-34-45Z · 151724 ms · instance 1 · exit 1

| Result | Test | Note |
|---|---|---|
| PASS | the map holds exactly the 291 ids of the inventory (191 master, 100 v3), no duplicate and none blank |  |
| PASS | every id has a status and evidence; the results file has 291 rows (PRESERVED 48, MOVED 196, REPLACED-BY 4, DROPPED-WITH-REASON 36, NOT-VERIFIED 7) |  |
| FAIL | no id is NOT-VERIFIED that could have been verified: no silent removal of a kept feature, no id without a probe or a passing suite | 7 ids: |
| PASS | every DROPPED id carries a reason from the review documents; drops that 00-unified-recommendations does not itemise are listed |  |

## Output (tail)

```
PASS the map holds exactly the 291 ids of the inventory (191 master, 100 v3), no duplicate and none blank
PARITY COUNTS {"PRESERVED":48,"MOVED":196,"REPLACED-BY":4,"DROPPED-WITH-REASON":36,"NOT-VERIFIED":7}
PASS every id has a status and evidence; the results file has 291 rows (PRESERVED 48, MOVED 196, REPLACED-BY 4, DROPPED-WITH-REASON 36, NOT-VERIFIED 7)
FAIL no id is NOT-VERIFIED that could have been verified: no silent removal of a kept feature, no id without a probe or a passing suite — 7 ids:
DROPPED not itemised in 00: M-138 M-186 V-028 V-100
PASS every DROPPED id carries a reason from the review documents; drops that 00-unified-recommendations does not itemise are listed
RESULT parity pass=3 fail=1 skip=0
```
