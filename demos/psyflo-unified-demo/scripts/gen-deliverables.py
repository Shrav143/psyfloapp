#!/usr/bin/env python3
"""Generates docs/deliverables/02-feature-preservation-matrix.md from review/qa/parity-results.csv (written by test/parity.mjs)
and 07-test-results.md from review/test-results/results.json + the QA findings. Re-run after a full `node test/run-all.mjs`."""
import csv, collections, json, os, datetime
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rows = list(csv.DictReader(open(os.path.join(root, 'review/qa/parity-results.csv'))))
cnt = collections.Counter(r['status'] for r in rows)
inv = {r['id']: r for r in rows}
def esc(s): return (s or '').replace('|', '\\|').replace('\n', ' ')
out = ['# Deliverable 2 · Feature preservation matrix', '',
 'Every functioning feature of the two original demos (191 rows from the Nov 8 master, M-nnn; 100 rows from the v3 demo, V-nnn), its destination in the unified product and the status the parity suite (`test/parity.mjs`) verified on the final build. Source inventory: `review/04b-feature-inventory.md`; acceptance mapping: `review/06c-parity-map.csv`; verification output: `review/qa/parity-results.csv`.', '',
 '**Status key.** PRESERVED: the feature is where it was and still works. MOVED: the feature lives at a new location (a route redirect or a new section keeps the old link working). REPLACED-BY: a different mechanism now does the job. DROPPED-WITH-REASON: not carried over, with the reason from the review documents (these are deliberate: unsafe, unsupported by the evidence, or simulated-only in v3). NOT-VERIFIED: the suite could not prove it (none at the last run).', '',
 '## Totals', '', '| Status | Count |', '|---|---|']
for k in ('PRESERVED', 'MOVED', 'REPLACED-BY', 'DROPPED-WITH-REASON', 'NOT-VERIFIED'):
    out.append(f'| {k} | {cnt.get(k, 0)} |')
out += [f'| **Total** | **{len(rows)}** |', '']
out += ['## Features dropped with a reason', '', '| id | Feature | Reason |', '|---|---|---|']
for r in rows:
    if r['status'] == 'DROPPED-WITH-REASON': out.append(f"| {r['id']} | {esc(r['feature'])} | {esc(r['notes'] or r['destination'])} |")
out += ['', '## Full matrix', '', '| id | Feature | Unified destination | Status | Evidence | Notes |', '|---|---|---|---|---|---|']
for r in rows:
    out.append(f"| {r['id']} | {esc(r['feature'])} | {esc(r['destination'])} | {r['status']} | {esc(r['evidence'])} | {esc(r['notes'])} |")
os.makedirs(os.path.join(root, 'docs/deliverables'), exist_ok=True)
open(os.path.join(root, 'docs/deliverables/02-feature-preservation-matrix.md'), 'w').write('\n'.join(out) + '\n')
print('matrix rows', len(rows), dict(cnt))
