#!/usr/bin/env python3
# Rewrites the substance-use content of seed/extra/disputes.json: the payer's stated reasons (concerns), the dated evidence records filed under the six ASAM
# dimensions, and the drafting rules. Keeps every other field of each dispute. Synthetic. Run from the repo root: python3 scripts/seed-gen/disputes-seed.py
import json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
P = os.path.join(ROOT, 'seed', 'extra', 'disputes.json')
d = json.load(open(P, encoding='utf8'))

def ev(id, client, kind, date, label, quote, source, dim=None, **kw):
    e = {'id': id, 'client': client, 'kind': kind, 'date': date, 'label': label, 'quote': quote, 'source': source, 'provenance': 'seed'}
    if dim is not None: e['dim'] = dim
    e.update(kw)
    return e

rows = []
# D.W. 15 · cannabis and alcohol · partial approval, continued stay (Sentara). Assessed Oct 9; emergency department visit Oct 28 came after it.
rows += [
 ev('EV-DW-01', 'DW', 'use_episode', '2026-10-04', 'Reported alcohol use', 'Reported drinking at a party on Oct 4 (about four drinks).', 'Group note · Oct 7', substance='alcohol'),
 ev('EV-DW-02', 'DW', 'use_episode', '2026-10-05', 'Urine drug screen · THC positive', 'Urine drug screen positive for THC on Oct 5.', 'Urine drug screen log · Oct 5', substance='cannabis', result='positive'),
 ev('EV-DW-03', 'DW', 'use_episode', '2026-10-21', 'Reported cannabis use', 'Reported cannabis use on Oct 21 and left group early.', 'Group note · Oct 21', substance='cannabis'),
 ev('EV-DW-04', 'DW', 'engagement', '2026-10-09', 'Attendance', 'Attended 8 of 10 scheduled groups from Sept 28 to Oct 9.', 'Attendance log · Oct 9'),
 ev('EV-DW-05', 'DW', 'mh_screen', '2026-10-09', 'PHQ-9 and GAD-7', 'PHQ-9 9 and GAD-7 10 on Oct 9; denies thoughts of suicide.', 'Screening record · Oct 9', instrument='PHQ-9', score=9),
 ev('EV-DW-06', 'DW', 'safety_plan', '2026-10-03', 'Safety plan reviewed', 'Safety plan reviewed with the family on Oct 3.', 'Clinical record · safety plan', dim=3),
 ev('EV-DW-07', 'DW', 'environment', '2026-10-09', 'Home environment', 'An older brother uses cannabis in the home; his mother works nights and is out until 7 am.', 'Family session note · Oct 9'),
 ev('EV-DW-08', 'DW', 'medical', '2026-10-08', 'Medical review', 'ADHD medication is managed by his pediatrician; blood pressure was normal on Oct 8.', 'Pediatrician letter · Oct 8'),
 ev('EV-DW-09', 'DW', 'prior_service', '2026-06-30', 'Weekly outpatient counseling, Level 1 · Blue Ridge Behavioral Health', 'Weekly outpatient counseling from March to June 2026, 12 sessions; use continued weekly and he was referred to IOP in July.', 'Provider discharge summary', dim=5, provider='Blue Ridge Behavioral Health', **{'from': '2026-03', 'to': '2026-06'}, sessions=12, outcome='Use continued weekly; referred to IOP in July 2026.'),
]
# K.T. 16 · alcohol and cannabis · information request (Anthem). No withdrawal screen on file: D1 is the gap.
rows += [
 ev('EV-KT-01', 'KT', 'use_episode', '2026-10-09', 'Screening call · reported use', 'At the screening call on Oct 9 the family reported drinking on 7 of the last 30 days, five to eight drinks each time.', 'Screening call · Oct 9', substance='alcohol'),
 ev('EV-KT-02', 'KT', 'engagement', '2026-10-09', 'Stated readiness', 'At intake she said she is not sure drinking is a problem and agreed to try treatment to close the court diversion case.', 'Intake note · Oct 9'),
 ev('EV-KT-03', 'KT', 'mh_screen', '2026-10-09', 'PHQ-9', 'PHQ-9 6 on Oct 9; denies thoughts of suicide.', 'Screening record · Oct 9', instrument='PHQ-9', score=6),
 ev('EV-KT-04', 'KT', 'environment', '2026-10-09', 'Home environment', 'Alcohol is kept unlocked in the home. Her aunt lives nearby and has offered to help with rides.', 'Family session note · Oct 9'),
 ev('EV-KT-05', 'KT', 'prior_service', '2026-04-30', 'Weekly outpatient counseling, Level 1 · Piedmont Counseling', 'Weekly outpatient counseling from January to April 2026, 9 sessions; drinking episodes did not decrease (four in March, five in April).', 'Piedmont Counseling discharge letter', dim=5, provider='Piedmont Counseling', **{'from': '2026-01', 'to': '2026-04'}, sessions=9, outcome='Ended in April 2026 when the family lost transportation. Drinking episodes did not decrease during or after treatment (four in March, five in April).'),
]
# T.N. 16 · non-prescribed stimulants with depression · partial approval, peer-to-peer (Sentara). Ratings point to Level 2.5; Level 2.1 requested.
rows += [
 ev('EV-TN-01', 'TN', 'use_episode', '2026-10-10', 'Reported stimulant use', 'Reported using a non-prescribed stimulant on Oct 10.', 'Group note · Oct 10', substance='stimulant'),
 ev('EV-TN-02', 'TN', 'use_episode', '2026-10-16', 'Urine drug screen · amphetamine positive', 'Urine drug screen positive for amphetamine on Oct 16.', 'Urine drug screen log · Oct 16', substance='stimulant', result='positive'),
 ev('EV-TN-03', 'TN', 'use_episode', '2026-10-20', 'Reported stimulant use', 'Reported using a non-prescribed stimulant on Oct 20 before an evening group.', 'Group note · Oct 20', substance='stimulant'),
 ev('EV-TN-04', 'TN', 'use_episode', '2026-10-25', 'Urine drug screen · amphetamine positive', 'Urine drug screen positive for amphetamine on Oct 25.', 'Urine drug screen log · Oct 25', substance='stimulant', result='positive'),
 ev('EV-TN-05', 'TN', 'withdrawal', '2026-10-05', 'Stimulant withdrawal checklist', 'Stimulant withdrawal checklist on Oct 5: fatigue and low mood for 3 days after the last use on Sept 28; no medical withdrawal.', 'Clinician checklist · Oct 5'),
 ev('EV-TN-06', 'TN', 'mh_screen', '2026-10-22', 'PHQ-9', 'PHQ-9 17 on Oct 22 (18 at intake); passive thoughts of death, no plan; safety plan updated Oct 22.', 'Screening record · Oct 22', instrument='PHQ-9', score=17),
 ev('EV-TN-07', 'TN', 'safety_plan', '2026-10-22', 'Safety plan updated', 'Safety plan updated with the family on Oct 22.', 'Clinical record · safety plan', dim=3),
 ev('EV-TN-08', 'TN', 'engagement', '2026-10-26', 'Attendance', 'Attended 11 of 14 scheduled groups since Oct 1; missed three evening groups for lack of a ride.', 'Attendance log · Oct 26'),
 ev('EV-TN-09', 'TN', 'environment', '2026-10-12', 'Home environment', 'She shares a bedroom with a cousin who sells pills; her mother works two jobs and is out until 9 pm most evenings.', 'Family session note · Oct 12', sensitivity='sensitive'),
 ev('EV-TN-10', 'TN', 'medical', '2026-10-15', 'Medical review', 'Pediatrician visit on Oct 15: weight down 8 pounds in two months; labs ordered.', 'Pediatrician letter · Oct 15'),
 ev('EV-TN-11', 'TN', 'current_service', '2025-09-01', 'Weekly counseling with the referral partner, ongoing', 'Weekly counseling with the referral partner\'s counselor since September 2025, ongoing; no change in use.', 'Referral partner counselor letter', dim=0, provider='Referral partner counselor', **{'from': '2025-09', 'to': None}, outcome='Ongoing; no change in use.'),
 ev('EV-TN-12', 'TN', 'prior_service', '2026-05-31', 'Outpatient counseling, Level 1', 'Eleven sessions from January to May 2026; the provider ended treatment as "not making progress".', 'Outpatient provider discharge letter', dim=5, provider='Outpatient provider (name on file)', **{'from': '2026-01', 'to': '2026-05'}, sessions=11, outcome='Ended by the provider as "not making progress".'),
 ev('EV-TN-13', 'TN', 'placement_risk', '2026-10-26', 'Level 2.5 raised', 'The psychiatrist raised Level 2.5 (partial hospitalization) after the Oct 22 PHQ-9; the family cannot provide rides for 20 hours a week.', 'Psychiatrist note · Oct 26', dim=0),
]
# E.C. 15 · cannabis and nicotine vape · denial, initial (Anthem): "already connected to other services"
rows += [
 ev('EV-EC-01', 'EC', 'use_episode', '2026-10-05', 'Urine drug screen · THC positive', 'Urine drug screen positive for THC on Oct 5.', 'Referral partner counselor letter', substance='cannabis', result='positive'),
 ev('EV-EC-02', 'EC', 'use_episode', '2026-10-12', 'Found with a vape pen', 'Found with a vape pen at the referring site on Oct 12.', 'Referral partner counselor letter', substance='nicotine'),
 ev('EV-EC-03', 'EC', 'use_episode', '2026-10-19', 'Found with a vape pen', 'Found with a vape pen at the referring site on Oct 19.', 'Referral partner counselor letter', substance='nicotine'),
 ev('EV-EC-04', 'EC', 'use_episode', '2026-10-26', 'Reported use before group', 'Reported cannabis use before an intake session on Oct 26.', 'Referral partner counselor letter', substance='cannabis'),
 ev('EV-EC-05', 'EC', 'engagement', '2026-10-12', 'Stated readiness', 'At intake he said use is "not a big deal"; he came because the referral partner required it.', 'Intake note · Oct 12'),
 ev('EV-EC-06', 'EC', 'environment', '2026-10-12', 'Home environment', 'His parents separated in September; he moves between two homes and neither sets rules on use. An older cousin supplies vape pens.', 'Intake note · Oct 12', sensitivity='sensitive'),
 ev('EV-EC-07', 'EC', 'mh_screen', '2026-10-12', 'PHQ-9', 'PHQ-9 5 on Oct 12; denies thoughts of suicide.', 'Screening record · Oct 12', instrument='PHQ-9', score=5),
 ev('EV-EC-08', 'EC', 'current_service', '2026-09-01', 'Weekly counseling with the referral partner (care coordination)', 'Weekly counseling with the referral partner\'s counselor; listed under care coordination, not as a failed prior treatment.', 'Referral partner counselor letter', dim=0, provider='Referral partner counselor', **{'from': '2026-09', 'to': None}, outcome=None),
]
d['dispute_evidence'] = rows

C = {
 'DI-0402': [
  {'text': '"We\'d really like to give you 110."', 'source': 'Call log · Sentara called Oct 27, 3:30 pm', 'date': '2026-10-27'},
  {'text': 'Asked whether ASAM Level 2.1 is still needed for the remaining units after the Oct 9 reassessment', 'source': 'Call log · Sentara called Oct 27, 3:30 pm', 'date': '2026-10-27'}],
 'DI-0408': [
  {'text': 'Frequency and amount of alcohol and other substance use in the last 30 days, with any urine drug screen or breath alcohol results', 'source': 'Availity request for information · item 1', 'date': '2026-10-28'},
  {'text': 'Withdrawal history and current withdrawal risk', 'source': 'Availity request for information · item 2', 'date': '2026-10-28'},
  {'text': 'Prior treatment at a lower level of care and its outcome', 'source': 'Availity request for information · item 3', 'date': '2026-10-28'},
  {'text': 'Current living situation and recovery supports', 'source': 'Availity request for information · item 4', 'date': '2026-10-28'},
  {'text': 'Current ASAM dimensional ratings and the level of care requested', 'source': 'Availity request for information · item 5', 'date': '2026-10-28'}],
 'DI-0384': [
  {'text': '"Already connected to other services; Level 1 outpatient is appropriate"', 'source': 'Availity determination notice · Oct 22', 'date': '2026-10-22'},
  {'text': '"Does not meet ASAM Level 2.1 criteria"', 'source': 'Availity determination notice · Oct 22', 'date': '2026-10-22'}],
}
for x in d['disputes']:
    if x['id'] in C: x['concerns'] = C[x['id']]
    if x['id'] == 'DI-0384':
        x['docs']['appeal']['sections'][0]['text'] = ("I am Ethan's guardian. I am appealing Anthem's decision of October 22. Ethan's weekly counseling has not stopped his use: four counselor reports in October, "
            "including a positive THC screen on Oct 5. Harvest's intensive outpatient program is the only structured daily support available to him. Please review the attached records and approve the 90 units requested.")

R = d['drafting_rules']
def setrule(n, title, text, rule=None, keep_rule=True):
    r = next(x for x in R if x['n'] == n); r['title'] = title; r['text'] = text
    if not keep_rule: r['rule'] = rule
setrule(2, 'Counts, never percentages', '"3 of 5 weekly screens negative", "6 dated use episodes (Oct 2, 6, 9, 14, 20, 22)": the forms ask that way')
setrule(3, 'Every dimension rated Moderate or higher is documented', 'a rating of 2 or more needs an instrument score or dated records for that dimension (D1 withdrawal screen, D3 PHQ-9 or GAD-7, D5 dated use or screens); a rating of None or Mild is not argued', None, False)
setrule(4, "Interventions named from Harvest's list", 'with why it was used (refusal skills practice before a weekend party), not just that it happened')
setrule(5, 'Every note names a treatment plan goal', 'and states progress as a count')
setrule(7, 'Prior treatment names the level, provider, dates and outcome', 'an empty outcome blocks the draft and asks the question; "information about outpatient" and pro-bono contacts do not count as prior care')
setrule(8, 'Referral partner counseling goes under care coordination', 'never as the failed prior treatment')
setrule(9, 'State the level and the dimensions that drive it', 'the draft names the dimensions that are above the next lower level, from the stored ratings; when the ratings fit a lower level it asks the clinician for the reason', None, False)
setrule(11, 'Psyflo never rates a dimension or chooses a level', 'ratings and the level recommendation are the clinician\'s; drafts quote the stored assessment and leave a blank where the clinician must decide', None, False)
setrule(14, 'Quiet day rule', 'a day with no use, no cravings and no concerns says what skill was practiced and what still needs follow-up')
json.dump(d, open(P, 'w', encoding='utf8'), indent=1, ensure_ascii=False); open(P, 'a').write('\n')
print(len(rows), 'evidence rows')
