#!/usr/bin/env python3
# Generates seed/extra/asam.json: dated ASAM multidimensional assessments (dimensional risk ratings 0-4 with the clinician's note per dimension).
# Synthetic. Run from the repo root:  python3 scripts/seed-gen/asam-seed.py
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def A(id, client, date, kind, level, ratings, notes, assessor='jperez', plan=None, trigger=None):
    dims = {}
    for i, r in enumerate(ratings, 1):
        d = {'rating': r}
        if notes.get(i): d['note'] = notes[i]
        dims[str(i)] = d
    a = {'id': id, 'client': client, 'date': date, 'kind': kind, 'assessor': assessor, 'level_recommended': level, 'dims': dims,
         'source': f"ASAM multidimensional assessment · {date}", 'provenance': 'seed'}
    if plan: a['plan'] = plan
    if trigger: a['trigger'] = trigger
    return a

rows = []
# T.W. 16 · cannabis use disorder, moderate · new initial request R-0416
rows.append(A('ASM-TW-1', 'TW', '2026-10-16', 'initial', '2.1', [0, 0, 2, 2, 3, 2], {
  1: 'Last cannabis use Oct 14. No withdrawal symptoms; no alcohol or opioid use.',
  2: 'No medical conditions and no medications.',
  3: 'Generalized anxiety symptoms (GAD-7 11). Denies thoughts of suicide. Safety plan reviewed Oct 16.',
  4: 'Came to intake willingly. Wants to stay eligible for basketball; unsure he wants to stop all use.',
  5: 'Cannabis daily for 8 months. Two quit attempts (Aug, Sept) each lasted under a week. THC screen positive Oct 16.',
  6: 'Lives with his grandmother, who does not use. Two friends who use daily are his main contacts after class.'}))
# M.R. 15 · alcohol use disorder, moderate · continued stay R-0411
rows.append(A('ASM-MR-1', 'MR', '2026-08-12', 'initial', '2.1', [1, 0, 2, 3, 3, 3], {
  1: 'Last drink Aug 9. Mild tremor on day 2, resolved without medication.',
  3: 'PHQ-9 16. Denies thoughts of suicide.',
  4: 'Referred by his mother. Does not see drinking as a problem yet.',
  5: 'Drinking 3 to 4 times a week since spring; four failed attempts to cut down.',
  6: 'Stepfather drinks daily in the home. Mother works two jobs.'}))
rows.append(A('ASM-MR-2', 'MR', '2026-10-14', 'reassessment', '2.1', [0, 0, 2, 2, 2, 2], {
  1: 'No alcohol since Sept 27. No withdrawal signs at any visit.',
  2: 'No medical conditions.',
  3: 'Depressive symptoms persist (PHQ-9 12, down from 16 in August). Denies thoughts of suicide. Seeing the psychiatrist monthly.',
  4: 'Attended 41 of 48 scheduled groups since Aug 18. Names two goals of his own.',
  5: 'One lapse Sept 27 (two drinks at a party). Negative screens Oct 1 and Oct 13.',
  6: 'Stepfather moved out in September. Mother supports treatment. Still sees drinking peers on weekends.'},
  plan='Step down to Level 1 when D3 is 1 or lower and there is no use for 30 days.'))
# D.W. 15 · cannabis use disorder, moderate, with alcohol · partial approval R-0402
rows.append(A('ASM-DW-1', 'DW', '2026-07-21', 'initial', '2.1', [0, 1, 2, 3, 3, 3], {
  3: 'ADHD with anxiety. PHQ-9 9.', 4: 'Ambivalent; wants to keep sports eligibility.', 5: 'Cannabis most days since age 13, alcohol at parties.', 6: 'Older brother uses cannabis in the home.'}))
rows.append(A('ASM-DW-2', 'DW', '2026-10-09', 'reassessment', '2.1', [0, 1, 2, 2, 3, 3], {
  1: 'No withdrawal symptoms. Last use Oct 5.',
  2: 'ADHD medication managed by his pediatrician. Blood pressure normal.',
  3: 'ADHD with anxiety (PHQ-9 9, GAD-7 10). Safety plan reviewed Oct 3.',
  4: 'Attended 8 of 10 scheduled groups. Wants to keep sports eligibility.',
  5: 'THC screen positive Oct 5. Reported drinking at a party Oct 4. Two quit attempts in the period, each under a week.',
  6: 'Older brother uses cannabis in the home. Mother works nights.'},
  plan='Reassess within 7 days of any emergency visit or new incident.'))
# K.T. 16 · alcohol use disorder, moderate · information request R-0408
rows.append(A('ASM-KT-1', 'KT', '2026-10-09', 'initial', '2.1', [2, 1, 1, 3, 3, 2], {
  1: 'Binge drinking on weekends (5 to 8 drinks). Tremor and nausea after a binge in August. Last drink Oct 4; no symptoms in the last 30 days.',
  2: 'Mild anemia noted by her pediatrician in September; on iron.',
  3: 'PHQ-9 6. Denies thoughts of suicide.',
  4: 'Referred through juvenile court diversion. Does not think her drinking is a problem; agreed to try treatment to close the case.',
  5: 'Seven drinking episodes in the 30 days before intake. Two quit attempts failed within days. Prior weekly counseling Jan to Apr 2026 did not reduce use.',
  6: 'Lives with her father and stepmother; alcohol is kept unlocked in the home. A supportive aunt lives nearby.'}))
# T.N. 16 · stimulant use disorder with depression · partial approval, peer-to-peer R-0388
rows.append(A('ASM-TN-1', 'TN', '2026-10-01', 'initial', '2.5', [1, 1, 3, 2, 3, 3], {
  1: 'Last use of a non-prescribed stimulant Sept 28. Fatigue and low mood for 3 days afterward; no medical withdrawal.',
  2: 'Weight loss of 8 pounds in 2 months. Pediatrician follow-up scheduled.',
  3: 'Major depression (PHQ-9 18). Passive thoughts of death; no plan. Safety plan completed Oct 1. Psychiatry visit booked.',
  4: 'Agreed to treatment. Wants to return to the track team.',
  5: 'Non-prescribed stimulants 4 to 5 days a week since June. Three use episodes in the 14 days before intake.',
  6: 'Shares a bedroom with a cousin who sells pills. Mother works two jobs and is rarely home in the evening.'},
  plan='Level 2.5 was recommended. The family cannot provide transport for 20 hours a week, so Level 2.1 with added psychiatry is requested.'))
# E.C. 15 · cannabis and nicotine vaping · denial R-0384
rows.append(A('ASM-EC-1', 'EC', '2026-10-12', 'initial', '2.1', [0, 0, 1, 3, 3, 3], {
  1: 'Last use Oct 11. No withdrawal symptoms.',
  2: 'No medical conditions.',
  3: 'PHQ-9 5. Denies thoughts of suicide.',
  4: 'Says use is "not a big deal". Came to intake because the school required it.',
  5: 'Four counselor referrals in 30 days: THC screen positive Oct 5, found with a vape Oct 12 and Oct 19, reported use before class Oct 26.',
  6: 'Parents separated in September. He moves between two homes and neither sets rules on use. An older cousin supplies vapes.'}))
# J.O. 17 · readmission after early discharge · new initial R-0391
rows.append(A('ASM-JO-1', 'JO', '2026-10-20', 'initial', '2.1', [0, 0, 1, 2, 2, 1], {
  1: 'No withdrawal symptoms. Last use Oct 11.',
  2: 'No medical conditions.',
  3: 'PHQ-9 4. Denies thoughts of suicide.',
  4: 'Returned on his own after the family moved. Asked to restart.',
  5: 'One lapse Oct 11, three weeks after leaving care Sept 18. Negative screens Oct 15 and Oct 20.',
  6: 'New address since September. Lives with his aunt, who supports treatment. Changed schools in October.'},
  plan='Early discharge Sept 18 after 5 missed groups during the move; a new initial request is made at Level 2.1.'))
# S.B. 14 · cannabis, active continued stay (UHC)
rows.append(A('ASM-SB-1', 'SB', '2026-07-08', 'initial', '2.1', [0, 0, 2, 3, 3, 2], {5: 'Daily cannabis; positive screens in July.', 4: 'Ambivalent at intake.'}))
rows.append(A('ASM-SB-2', 'SB', '2026-09-24', 'reassessment', '2.1', [0, 0, 2, 2, 2, 2], {
  3: 'Anxiety (GAD-7 9). Sees the psychiatrist monthly.', 4: 'Attends consistently; 36 of 40 groups.', 5: 'One lapse Sept 6. Negative screens since Sept 13.', 6: 'Lives with both parents; a sibling vapes.'}))
# L.V. 16 · alcohol, IOP evening (Humana)
rows.append(A('ASM-LV-1', 'LV', '2026-06-24', 'initial', '2.1', [0, 0, 2, 3, 3, 3], {5: 'Weekend drinking, 3 episodes a month before intake.', 6: 'Parents divorced; changes homes weekly.'}))
rows.append(A('ASM-LV-2', 'LV', '2026-09-10', 'reassessment', '2.1', [0, 0, 2, 2, 2, 3], {
  3: 'Social anxiety (GAD-7 12).', 4: 'Attends evening groups regularly.', 5: 'No use since July 30. Negative screens.', 6: 'Alternating homes; no alcohol rules at her father\'s house.'}))
# P.G. 17 · stepped down to outpatient (Aetna)
rows.append(A('ASM-PG-1', 'PG', '2026-09-04', 'reassessment', '2.1', [0, 0, 2, 2, 3, 2], {
  3: 'Anxiety (GAD-7 10).', 5: 'One lapse Aug 11; negative screens since.', 6: 'Living with his father.'}))
rows.append(A('ASM-PG-2', 'PG', '2026-10-02', 'reassessment', '1', [0, 0, 1, 1, 2, 1], {
  1: 'No withdrawal symptoms.',
  3: 'GAD-7 6. Sees his counselor weekly.',
  4: 'Attended every scheduled group before the step-down on Sept 8.',
  5: 'No use since Aug 11. Six negative screens.',
  6: 'Lives with his father, who supports treatment. Back at school full time.'},
  plan='Continue Level 1. Move back to Level 2.1 if two screens are positive or D5 rises to 3.'))
# roster clients without a request in the queue
rows.append(A('ASM-JT-1', 'JT', '2026-10-06', 'reassessment', '2.1', [0, 0, 2, 2, 2, 2], {3: 'Depressive symptoms (PHQ-9 11).', 5: 'No use since Sept 14.', 6: 'Stable home; friends who use at school.'}))
rows.append(A('ASM-DP-1', 'DP', '2026-09-30', 'reassessment', '2.1', [0, 0, 1, 2, 3, 2], {5: 'Two lapses in September; screen positive Sept 22.', 6: 'Cousin lives in the home and uses.'}))
rows.append(A('ASM-AG-1', 'AG', '2026-10-12', 'reassessment', '2.1', [0, 0, 2, 2, 2, 2], {3: 'PHQ-9 10.', 5: 'No use since Sept 29.'}))
rows.append(A('ASM-CB-1', 'CB', '2026-09-18', 'reassessment', '2.1', [0, 1, 2, 2, 2, 2], {2: 'Asthma, controlled.', 3: 'GAD-7 9.', 5: 'No use since Aug 30.'}))
# A.L. 15 · initial request R-0399, overdue with the payer
rows.append(A('ASM-AL-1', 'A.L., 15', '2026-10-05', 'initial', '2.1', [1, 0, 2, 2, 3, 2], {
  1: 'Last drink Oct 2. Mild shakiness the next morning; none since.', 3: 'PHQ-9 10. Denies thoughts of suicide.', 4: 'Agreed to attend after a family meeting.',
  5: 'Drinking and cannabis on most weekends; four episodes in 30 days.', 6: 'Lives with her mother; older sister uses in the home.'}))

out = {'_about': "ASAM multidimensional assessments (The ASAM Criteria, 3rd edition dimensions). One row per assessment: the clinician's dimensional risk rating (0 none to 4 severe) and a note per dimension. The level of care that a set of ratings fits is derived at read time by web/js/shared/asam.js, never stored here. `level_recommended` is the clinician's own recommendation. Synthetic data; shown as 'Illustrative sample'.",
       'asam_assessments': rows}
with open(os.path.join(ROOT, 'seed', 'extra', 'asam.json'), 'w') as f:
    json.dump(out, f, indent=1, ensure_ascii=False); f.write('\n')
print(len(rows), 'assessments')
