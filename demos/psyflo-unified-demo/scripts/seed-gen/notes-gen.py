#!/usr/bin/env python3
# Generates seed/extra/notes-corpus.json: the processed M.R. (#3310) notes, written as substance use IOP notes (ASAM Level 2.1), and the mirrored
# `_lauris_sessions` rows the mock Lauris shows in the Active File. Synthetic. Deterministic: same input, same file. Run from the repo root:
#   python3 scripts/seed-gen/notes-gen.py            write seed/extra/notes-corpus.json
#   python3 scripts/seed-gen/notes-gen.py --check    only run the checks below, write nothing
#
# What is fixed here, on purpose (other code and tests read it):
#   * 51 notes: 40 daily (H0015 "IOP day"), 9 weekly family-member contacts, 2 monthly collateral contacts. Ids mr-d-MMDD / mr-w-MMDD / mr-m-MMDD, sessions 7001..7051.
#     (A third monthly row, Oct 8, is a status stub in seed/extra/staff.json.)
#   * the unit rule stays: units follow direct minutes under rules.json units.tdt.day_tiers (120 = 1, 180 = 2, 300 = 3, daily maximum 3); the 40 days add up to the
#     83 units used on the authorization. A day of group (about 3 hours) earns 2; the five family-session days run past 5 hours and earn 3; two days end early and earn 1.
#   * counts only, no percentages; none of the flagged words (observed, monitored, watched); none of the words the build step rewrites (school, student, teacher ...).
#   * a few sentences repeat across notes on purpose (boilerplate detection has something to find); every other sentence is unique (checked below).
# The story it tells, all from the ASAM assessments in seed/extra/asam.json: last drink Aug 9; assessed Aug 12; IOP starts Aug 18; the stepfather moves out
# Sept 12; one lapse Sunday Sept 27 (two drinks at a party), reported Sept 28, relapse prevention review Sept 28 and family session Sept 29 (within 2 days);
# negative urine drug screens Oct 1 and Oct 13 (and Aug 18, Sept 8, Sept 22, Oct 26); reassessed Oct 14 (PHQ-9 12); 30 days without use on Oct 27.
import json, os, sys, random, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'seed', 'extra', 'notes-corpus.json')
STAFF, CLIENT, CONSUMER = 'khale', 'MR', 3310
RELEASE = '08/18/2026'

# ------------------------------------------------------------------------------------------------------------------ the plan the notes name
# The notes name the plan's own goals and interventions. They are read from seed/seed.json (client MR) so the two always agree; the defaults are the
# same text and only apply when the seed has not been converted.
DEFAULT_GOALS = [
    {'n': 1, 'objective': 'M.R. will have a negative urine or breath alcohol screen in 4 of 5 weekly screens.'},
    {'n': 2, 'objective': 'M.R. will attend 4 of 5 scheduled groups each week.'},
    {'n': 3, 'objective': 'M.R. will have one family session a week and identify and use two recovery supports.'}]
DEFAULT_INTERVENTIONS = [
    ('SUD 1.1', 'Motivational interviewing'), ('SUD 1.2', 'Relapse prevention skills'), ('SUD 1.3', 'Cognitive behavioral skills for substance use'),
    ('SUD 1.4', 'Drug and alcohol refusal skills'), ('SUD 1.5', 'Contingency management'), ('SUD 2.1', 'Family session'), ('SUD 2.2', 'Recovery support planning')]

def load_plan():
    goals, ivs, site = DEFAULT_GOALS, DEFAULT_INTERVENTIONS, 'IOP'
    try:
        seed = json.load(open(os.path.join(ROOT, 'seed', 'seed.json')))
        mr = next(c for c in seed['clients'] if c['id'] == CLIENT)
        if all(str(i['code']).startswith('SUD') for i in seed['interventions']) and len(mr.get('goals', [])) == 3:
            goals = [{'n': g['n'], 'objective': g['objective']} for g in mr['goals']]
            ivs = [(i['code'], i['name']) for i in seed['interventions']]
        name = next((s['name'] for s in seed['schools'] if s['id'] == mr.get('school')), '')
        last = name.split('·')[-1].strip()
        if re.search(r'IOP', last): site = last
    except Exception:
        pass
    return goals, dict(ivs), site

def load_bands():
    rules = json.load(open(os.path.join(ROOT, 'seed', 'extra', 'rules.json')))['rules']
    bands = next(r for r in rules if r['key'] == 'units.tdt.day_tiers')['value']
    cap = next(r for r in rules if r['key'] == 'units.tdt.max_per_day')['value']
    return bands, cap

def units_for(minutes, bands, cap):
    u = 0
    for m, n in bands:
        if minutes >= m: u = n
    return min(cap, u)

# ------------------------------------------------------------------------------------------------------------------ boilerplate (kept on purpose)
BP_A = 'Provided a supportive check-in and reviewed relapse prevention skills with M.R.'
BP_B = 'Reviewed the craving rating with M.R. and updated his skill card.'

# ------------------------------------------------------------------------------------------------------------------ the 40 group days
# (mmdd, direct minutes, objective, interventions, mood check-in, progress today, skill topic for the contact-time line, flags, narrative)
# flags: u = urine drug screen collected, f = family session with his mother (extended day), l = left early
DAYS = [
 ('0818', 205, 1, ['SUD 1.1', 'SUD 1.5'], 'Guarded → engaged', 'Craving 7 of 10; screen negative; set 3 goals', 'program orientation', 'u',
  'First day of IOP, group of 8. Reviewed the program schedule, how the craving rating works and what happens after a screen. His urine drug screen at intake was negative and his CIWA-Ar score was 1 with no tremor. Craving was a 7 out of 10 at check-in. M.R. said he is here because his mother asked, and he wrote down three things he wants from the program.'),
 ('0819', 198, 1, ['SUD 1.2'], 'Quiet → talkative', 'Craving 7 to 5; named 3 triggers', 'triggers and cravings', '',
  'Group of 8 on triggers. M.R. wrote three of his own: weekend parties, arguments at home in the evening and being bored after classes. He rated his craving 7 at check-in and 5 after the skills group. He asked what a craving is supposed to feel like, which opened a talk about urges rising and falling.'),
 ('0820', 190, 1, ['SUD 1.4'], 'Calm', 'Craving 6 of 10; role-played refusal twice', 'drug and alcohol refusal skills', '',
  'Taught the refusal skill: say no, give a short reason, offer something else. Group of 7 role-played in pairs, and M.R. practiced twice with a peer who played an older cousin offering a beer. He said the second try felt less awkward. Craving was a 6.'),
 ('0824', 196, 2, ['SUD 1.1'], 'Skeptical', 'Craving 6 of 10; listed 1 con and 4 pros', 'motivational interviewing: pros and cons', '',
  'Pros and cons sheet in the motivational interviewing group of 8. M.R. listed one con of drinking, missing a football practice after a bad morning, and four pros. He said he does not think his drinking is a problem. Staff reflected what he said without arguing and asked what would have to change for him to see it differently. Craving 6 out of 10.'),
 ('0825', 202, 2, ['SUD 1.1'], 'Low', 'Craving 5 of 10; 2 activities scheduled', 'low mood and drinking', '',
  'Low mood and drinking: the group of 8 built an activity schedule with one rewarding activity a day. M.R. picked shooting baskets with his cousin and a call with his aunt. He rated his mood a 4 out of 10 and his craving a 5. All three blocks attended, and he stayed to the end of the process group.'),
 ('0826', 312, 3, ['SUD 2.1', 'SUD 2.2'], 'Nervous → relieved', 'Craving 6 of 10; family plan agreed', 'family plan for evenings', 'f',
  'Family session with M.R. and his mother, 50 minutes in person. Reviewed the home plan: no alcohol within reach, a set time to check in on weeknights while she works two jobs, and what she will say if he comes home after drinking. M.R. agreed to the check-in time. His mother said her husband keeps beer in the garage fridge and agreed to ask him to take it out. Craving was 6 before the session; he also attended the morning group of 8.'),
 ('0827', 188, 1, ['SUD 1.2'], 'Calm', 'Craving 6 to 3 in 10 minutes', 'urge surfing', '',
  'Urge surfing practice in a group of 7. M.R. rated a craving at 6, followed it for ten minutes with the timer and reported it at 3 when the timer ended. He wrote the steps on a skill card and said he would try it at home.'),
 ('0831', 194, 1, ['SUD 1.4'], 'Upbeat', 'Craving 5 of 10; refused a drink once', 'refusal skills with push-back', '',
  'M.R. reported turning down a beer at a family cookout on Saturday with the refusal skill from last week: he said no, gave a short reason and went to get a soda. The group of 8 practiced a harder version where the other person pushes back. Craving 5 out of 10.'),
 ('0901', 200, 3, ['SUD 2.2'], 'Hopeful', 'PHQ-9 15; named 4 recovery supports', 'recovery support planning', '',
  'Recovery support planning in a group of 8. M.R. named four supports: his aunt, his football coach, the Wednesday night teen recovery meeting and one friend who does not drink. He agreed to try the meeting with his aunt. PHQ-9 was 15 today, down from 16 at the assessment, with no thoughts of self-harm. Craving 5 out of 10.'),
 ('0902', 190, 2, ['SUD 1.1', 'SUD 1.5'], 'Tired → steadier', 'Craving 4 of 10; wrote 1 balanced thought', 'thinking traps', '',
  'Thinking traps in a group of 7. M.R. caught "I already messed up, so I may as well drink" as all-or-nothing thinking and wrote a balanced thought to replace it. Craving 4 out of 10. ' + BP_A),
 ('0903', 165, 2, ['SUD 1.1'], 'Calm', 'Craving 4 of 10; stayed for 2 of 3 blocks', 'making up a missed session', 'l',
  'Left after the skills group for a dentist visit with his mother, so he attended two of the three blocks. Craving was 4 at check-in. M.R. asked to make up the process group next week, and staff put it on his schedule. Group of 8.'),
 ('0908', 210, 1, ['SUD 1.2', 'SUD 1.5'], 'Calm', 'Screen negative; craving 4 of 10; 1 draw earned', 'high-risk situations', 'u',
  'Collected a urine drug screen at check-in: negative. M.R. earned a draw from the prize bowl and chose a gift card. High-risk list for the group of 8: he named weekends at a friend\'s house and arguments with his stepfather as the two he is most worried about. Craving 4 out of 10.'),
 ('0909', 192, 2, ['SUD 1.1'], 'Reflective', 'Craving 4 of 10; ranked 3 values', 'values card sort', '',
  'Values card sort in the motivational interviewing group of 8. M.R. put being trusted and playing football at the top and said drinking gets in the way of both. He asked how long it takes for a mother to trust again. Craving 4 out of 10. ' + BP_A),
 ('0910', 305, 3, ['SUD 2.1', 'SUD 2.2'], 'Relieved, a little guilty', 'Craving 5 of 10; weekend plan agreed', 'family plan for the weekend', 'f',
  'Second family session, 50 minutes, with M.R. and his mother. His mother said her husband is moving out this weekend. M.R. said he feels relieved and also guilty. The plan: she will take the alcohol out of the house before Saturday, M.R. will text her when he gets home, and his aunt will stay Saturday night. Craving 5 at check-in. He attended the morning group of 7 as well.'),
 ('0911', 215, None, [], 'Tired', '', 'guest speaker', '',
  'A guest speaker from the teen recovery meeting spoke to the whole group for an hour, and the evening group joined, so there were 12 in the room. M.R. asked one question about what the first month was like.'),
 ('0915', 195, 2, ['SUD 1.1'], 'Low', 'PHQ-9 14; craving 5 of 10', 'changes at home', '',
  'PHQ-9 was 14 with no thoughts of self-harm. M.R. said his stepfather moved out on Saturday, home is quieter, and he is sleeping badly. The group of 7 talked about changes at home and what helps. M.R. said he would try the evening walk plan. Craving was a 5.'),
 ('0916', 198, 1, ['SUD 1.2'], 'Low → steadier', 'Craving 6 of 10; thought about drinking twice', 'evening plan', '',
  'Evenings at home have felt empty since Saturday, and M.R. said he thought about drinking twice this week. He rated his craving a 6 at check-in. He and the group of 8 built an evening plan: a walk, a call to his aunt and the skill card. ' + BP_B),
 ('0917', 186, 3, ['SUD 2.2'], 'Hopeful', 'Craving 4 of 10; attended 1 meeting', 'recovery support planning', '',
  'M.R. went to the teen recovery meeting on Wednesday night with his aunt, stayed for the hour and said he would go again. He wrote down the meeting times and the first name of one peer he talked to. Craving 4 out of 10. Group of 8. ' + BP_B),
 ('0918', 192, 1, ['SUD 1.2'], 'Irritable → calm', 'Craving 4 of 10; used a break skill once', 'managing a trigger in group', '',
  'M.R. got upset when a peer joked about drinking at a party. He asked for a short break, used the counting breath skill and came back within five minutes. Staff named the skill he used when he returned and asked what he would do if it happened outside group. Craving 4. Group of 8.'),
 ('0921', 190, 1, ['SUD 1.4'], 'Upbeat', 'Craving 4 of 10; left a party early', 'leaving a situation early', '',
  'M.R. spent Saturday at a friend\'s house where two friends were drinking. He told the group of 8 he stayed an hour, drank a soda and left by nine with a text to his mother. The group practiced leaving a situation early. Craving was 4 at check-in.'),
 ('0922', 208, 1, ['SUD 1.5'], 'Calm', 'Screen negative; craving 3 of 10', 'contingency management', 'u',
  'Urine drug screen at check-in came back negative. M.R. earned a draw and said he is saving for a football camp fee. Craving was a 3. Group of 7. ' + BP_A),
 ('0923', 193, 2, ['SUD 1.1', 'SUD 1.5'], 'Steady', 'Mood 5 of 10; craving 3 of 10; 4 of 6 activities done', 'activity schedule review', '',
  'Activity schedule review in a group of 8. M.R. finished four of the six activities and rated his mood a 5. He noticed that skipping the evening walk lined up with his worst cravings. Craving 3 out of 10.'),
 ('0924', 200, 1, ['SUD 1.2', 'SUD 1.4'], 'Nervous', 'Craving 5 of 10; party plan written', 'planning for a party', '',
  'M.R. said a friend invited him to a party on Sunday and he was nervous about it. The group of 8 helped him write a plan: bring his own drink, text his mother on arrival, leave by six. He role-played saying no to a cup handed to him. Craving was a 5.'),
 ('0925', 184, 1, ['SUD 1.2'], 'Restless', 'Craving 5 of 10; confidence 6 of 10', 'party plan review', '',
  'Reviewed the party plan again with a group of 6. M.R. said he would go and "probably be fine," and he did not agree to a ride from his aunt. Staff asked what could go wrong and he named two things. He rated his confidence in the plan a 6. Craving 5 out of 10.'),
 ('0928', 214, 1, ['SUD 1.2', 'SUD 1.1'], 'Ashamed → steadier', 'Craving 8 of 10; CIWA-Ar 0; lapse reviewed', 'lapse review (relapse prevention)', '',
  'M.R. told staff at check-in that he had two drinks at the party on Sunday, September 27, and then left. This is his first use since August 9. His craving was an 8 and his CIWA-Ar score was 0 with no tremor or sweating. Staff walked through the lapse step by step with him: what happened before, the first drink and what he did after. He named the point where he stopped following the plan. J. Perez, clinician, was told the same day, and a family session with his mother is set for tomorrow. No screen today; the next one is Thursday.'),
 ('0929', 318, 3, ['SUD 2.1', 'SUD 1.2'], 'Low → steadier', 'PHQ-9 13; craving 6 of 10; home plan revised', 'family session after the lapse', 'f',
  'Family session with M.R. and his mother, 55 minutes, two days after the lapse. M.R. told his mother what happened. They agreed on three changes: no parties without an adult he knows, his mother or his aunt picks him up, and he texts on arrival and on leaving. His mother said she was upset and still wants him in treatment. PHQ-9 was 13 with no thoughts of self-harm. Craving was a 6; he also attended the morning group of 8.'),
 ('1001', 212, 1, ['SUD 1.5', 'SUD 1.2'], 'Determined', 'Screen negative; craving 5 of 10; 4 days no use', 'lapse as a case study', 'u',
  'Urine drug screen negative this morning, four days after the lapse. His draws restart from one, and M.R. said that felt fair. The group of 8 used the lapse as a case study in relapse prevention, with M.R. leading the part on what he would do differently. Craving was a 5.'),
 ('1005', 190, 3, ['SUD 2.2'], 'Calm', 'Craving 4 of 10; attended 1 meeting', 'recovery supports update', '',
  'No use over the weekend. M.R. went to the Wednesday night meeting with his aunt and said it was easier the second time. He updated his supports list and added a teammate who does not drink. Craving 4 out of 10. Group of 8.'),
 ('1006', 196, 2, ['SUD 1.1', 'SUD 1.5'], 'Tired → steadier', 'Craving 3 of 10; wrote 1 balanced thought', 'thought challenge', '',
  'Thought challenge worksheet in a group of 7. M.R. took a thought from the party, "one time does not matter," and wrote a balanced replacement. Craving was a 3. ' + BP_A),
 ('1007', 182, None, [], 'Calm', '', 'group late start', '',
  'Group started late because of a facility safety drill. Checked in with M.R. before and after. Group of 8.'),
 ('1008', 199, 1, ['SUD 1.4'], 'Upbeat', 'Craving 3 of 10; role-played 3 scenarios', 'refusal skills, harder scenarios', '',
  'Refusal skills with harder scenarios: a friend pushes, a cousin jokes, an older teammate offers a ride and a drink. M.R. role-played all three and chose "say no and leave" for two of them. Craving 3 out of 10. Group of 8. ' + BP_B),
 ('1013', 207, 1, ['SUD 1.5'], 'Calm', 'Screen negative; craving 3 of 10', 'contingency management', 'u',
  'Urine drug screen negative, the second since the lapse. M.R. earned a draw and picked the movie pass. Craving 3 out of 10. Group of 7. ' + BP_A),
 ('1014', 204, None, [], 'Nervous → calm', '', 'ASAM reassessment', '',
  'J. Perez completed the ASAM reassessment with M.R. during the process group. PHQ-9 was 12. M.R. stayed for the rest of the day and said the questions about home were the hardest. Group of 7.'),
 ('1015', 310, 3, ['SUD 2.1', 'SUD 1.1'], 'Hopeful', 'Craving 3 of 10; stated the step-down plan', 'family session on the reassessment', 'f',
  'Family session this afternoon: M.R. and his mother for 50 minutes. J. Perez joined for ten minutes to go over the reassessment: the ratings are lower than in August, and the plan is to step down to Level 1 when depression is rated 1 or lower and there has been no use for 30 days. M.R. repeated the plan back in his own words. His mother asked what she can do about evenings and agreed to keep Wednesday night free for the meeting. Craving was a 3; he also attended the morning group of 8.'),
 ('1016', 188, 1, ['SUD 1.2', 'SUD 1.4'], 'Upbeat', 'Craving 3 of 10; weekend plan written', 'weekend plan', '',
  'Weekend plan for Saturday\'s football game and the team dinner afterward. M.R. wrote who he will sit with, who will drive him and what he will say if someone offers him a drink. Craving was a 3. Group of 6.'),
 ('1019', 194, 3, ['SUD 2.2'], 'Calm', 'Craving 2 of 10; left a gathering early', 'peers who drink', '',
  'M.R. reported seeing friends who drink on Saturday and leaving when the drinking started, with a text to his aunt. Staff named what he did well and asked what would make it easier. He added a second friend who does not drink to his supports list. Craving was a 2. Group of 8. ' + BP_B),
 ('1021', 201, 2, ['SUD 1.1', 'SUD 1.5'], 'Low → steadier', 'Craving 5 of 10; used urge surfing once', 'urge surfing after an argument', '',
  'M.R. had an argument with his mother on Tuesday and wanted a drink. He used urge surfing on the way home, told his mother afterward and did not drink. In group he told it as a story, and the group of 7 helped him name the thought behind it. Craving was a 5 at check-in. ' + BP_A),
 ('1022', 140, 2, ['SUD 1.1'], 'Calm', 'Craving 3 of 10; stayed for 2 of 3 blocks', 'psychiatry visit', 'l',
  'Left after the skills group for his monthly psychiatry visit with his mother. Craving was a 3 at check-in. He took the PHQ-9 sheet from group to share with the psychiatrist. Group of 8.'),
 ('1026', 206, 1, ['SUD 1.2', 'SUD 1.5'], 'Upbeat', 'Screen negative; craving 3 of 10', 'planning for Halloween weekend', 'u',
  'The urine drug screen at check-in was negative. M.R. planned for Halloween weekend: two parties are likely, one with an adult host. He and the group of 8 chose which one he would go to, who would drive and when he leaves. Craving was a 3. ' + BP_B),
 ('1028', 304, 3, ['SUD 2.1', 'SUD 1.2'], 'Steady', 'PHQ-9 11; craving 2 of 10; 30 days no use', 'family session on the step-down plan', 'f',
  'Fifth family session, 50 minutes, with his mother and M.R. Thirty days without use were reached on October 27. The other step-down criterion is not met: depression was rated 2 on October 14 and the PHQ-9 today was 11. M.R. and his mother agreed to keep the current level through Halloween weekend and look at the plan again at the next reassessment. Craving was a 2; he also attended the morning group of 7.'),
]

# ------------------------------------------------------------------------------------------------------------------ weekly family-member contacts
# (mmdd, minutes, discussed, follow-up, household)
WEEKLY = [
 ('0820', 12, 'Introduced the IOP plan to his mother: the group schedule, the craving rating and the urine screens. She said evenings are the hardest part because she works two jobs and is home after nine. We talked about a check-in text on weeknights.',
  'Send the home plan sheet. Next call Aug 25.', None),
 ('0825', 15, 'Reviewed the first week. M.R. attended all three groups and his intake screen was negative. His mother asked what to do if he comes home smelling of alcohol. We agreed she will stay calm, keep him home and talk the next morning, and we set the first family session for tomorrow.',
  'Family session Aug 26. Next call Sep 1.', None),
 ('0901', 10, 'His mother reported a quiet weekend with no sign of drinking. M.R. attended 4 of 5 groups last week and missed Friday for a stomach bug. We talked about the Wednesday night teen recovery meeting and whether his aunt can take him.',
  'Ask his aunt about Wednesday nights. Next call Sep 9.', None),
 ('0909', 14, 'Short week after the holiday. His mother said she asked her husband to leave and he is moving out this weekend. M.R. has been quieter at home. We reviewed what to expect and moved the plan for the weekend into tomorrow\'s family session.',
  'Family session Sep 10. Next call Sep 15.', None),
 ('0915', 11, 'His mother confirmed the stepfather moved out on Saturday and said she emptied the garage fridge. She said home is calmer and M.R. is sleeping badly. We talked about evenings: a walk, a call to his aunt and the check-in text.',
  'Keep the check-in text. Next call Sep 22.', None),
 ('0922', 16, 'Reviewed progress on Goal 1 and Goal 2 in plain words: both screens so far have been negative and M.R. attended all four groups last week. His mother said he asked about a friend\'s party on Sunday and she was unsure. We talked about asking who will be there and who is driving.',
  'Next call Sep 29.', None),
 ('1008', 13, 'Call moved from the week of Sep 28, because the family session on Sep 29 took its place. His mother reported two good weeks since then: no drinking, the house is alcohol free and M.R. is texting when he gets in. We went over the plan for the ASAM reassessment next week.',
  'Reassessment Oct 14. Next call Oct 16.', None),
 ('1016', 18, 'His mother reported a change at home this week. We talked about how M.R. is handling it and agreed to keep routines the same, including the check-in text and the Wednesday meeting. She said she is glad she came to the session on Thursday.',
  'Check in again Oct 22.', 'Mother reported a change at home: her sister now stays with them on weekends while she works, and no alcohol has been kept in the house since the stepfather moved out in September.'),
 ('1022', 14, 'Reviewed the week after the argument on Tuesday. His mother said M.R. told her afterward that he wanted a drink and used the skill instead. We went over how she can respond and praised the choice he made.',
  'Bring the weekend plan to the call. Next call Oct 29.', None),
]

# ------------------------------------------------------------------------------------------------------------------ monthly collateral contacts
# (mmdd, collateral, method, shared, coordination)
MONTHLY = [
 ('0827', 'Pediatrician · Dr. A. Shah (pediatric clinic)', 'Phone · 10 min',
  'Pediatrician reports no medical conditions and no medication. The tremor on day 2 after the last drink on Aug 9 settled without treatment. The clinic referred M.R. after his mother asked about his drinking.',
  'Harvest sent the treatment plan Aug 27. The pediatrician will call if a medical concern comes up.'),
 ('0924', 'Psychiatrist · Dr. L. Moreno', 'Phone · 9 min',
  'Psychiatrist sees M.R. monthly for depression and reports the mood is slowly improving. No medication has been started. He asked for the PHQ-9 scores from group.',
  'Harvest will send the PHQ-9 scores before each visit. Next visit Oct 22.'),
]

SKILL_LABEL = {'u': 'Urine drug screen collection and result', 'f': 'Family session with mother'}
SUP_LABELS = ['Peer support group', 'Relapse prevention review', 'Recovery support group']

# ------------------------------------------------------------------------------------------------------------------ helpers
def iso(mmdd): return '2026-' + mmdd[:2] + '-' + mmdd[2:]
def us(mmdd): return mmdd[:2] + '/' + mmdd[2:] + '/2026'
def hm(t): return '%02d:%02d' % (t // 60, t % 60)
def duration_text(m): return ('%d h %d min' % (m // 60, m % 60)) if m >= 60 else '%d min' % m

def blocks(i, minutes, flags, topic, rng):
    """Contact-time lines whose durations add up to the direct minutes."""
    ext, short = 'f' in flags, 'l' in flags
    kinds = []
    if ext:
        ci, ind, sg, pg, fam = 25, 35, 75, 60, 55 if minutes == 318 else 50
        used = ci + ind + sg + pg + fam
        kinds = [('Individual session with counselor', ind), ('Check-in, craving rating and mood', ci), ('Skills group', sg), ('Process group', pg), (rng.choice(SUP_LABELS), minutes - used), ('Family session with mother', fam)]
    elif short:
        ci, sg = 25, 75
        kinds = [('Check-in, craving rating and mood', ci), ('Skills group', sg), ('Process group', minutes - ci - sg)]
    else:
        ci, sg, uds = 20 + 5 * (i % 3), 70 + 5 * (i % 4), 10 if 'u' in flags else 0
        rem = minutes - ci - sg - uds
        pg = round(rem * 0.55)
        kinds = [('Check-in, craving rating and mood', ci)] + ([('Urine drug screen collection and result', uds)] if uds else []) + [('Skills group', sg), ('Process group', pg), (rng.choice(SUP_LABELS), rem - pg)]
    t = 15 * 60 + 15 + 5 * (i % 4); lines = []; total = 0; end = t
    for label, dur in kinds:
        assert dur > 0, (minutes, kinds)
        # the skills group names the topic taught that day
        text = label + (' · ' + topic if label == 'Skills group' else '')
        lines.append('%s–%s · %s' % (hm(t), hm(t + dur), text)); total += dur
        end = t + dur; t = end + rng.choice([5, 10])
    assert total == minutes
    return '\n'.join(lines), end

def build():
    goals, ivname, site = load_plan()
    bands, cap = load_bands()
    rng = random.Random(3310)
    iv_text = lambda codes: ' · '.join('%s %s' % (c, ivname[c]) for c in codes)
    notes, sessions = [], []
    sid = 7001
    for i, (mmdd, minutes, obj, ivs, mood, progress, topic, flags, narrative) in enumerate(DAYS):
        units = units_for(minutes, bands, cap)
        contact, end = blocks(i, minutes, flags, topic, rng)
        proc = '%sT%s' % (iso(mmdd), hm(end + 12 + (i % 5) * 6))          # processed the same evening, inside the 24-hour rule
        fields = {
            'Service': 'H0015 (IOP day)', 'Setting': 'Treatment site · ' + site, 'Direct time': duration_text(minutes), 'Units': str(units), 'Contact time': contact,
            'Objective addressed': ('Obj. %d – %s' % (obj, next(g['objective'] for g in goals if g['n'] == obj))) if obj else '',
            'Interventions': iv_text(ivs) if ivs else '', 'Mood check-in': mood, 'Progress today': progress, 'Narrative': narrative}
        notes.append({'id': 'mr-d-' + mmdd, 'client': CLIENT, 'staff': STAFF, 'type': 'daily', 'date': iso(mmdd), 'units': units, 'direct_time_min': minutes, 'objective': obj,
                      'interventions': ivs, 'mood': mood, 'progress': progress, 'fields': fields, 'enhanced': narrative, 'session': sid, 'consumer': CONSUMER, 'processed_at': proc,
                      'review': 'approved', 'origin': 'seed', 'flags': []})
        sessions.append({'id': sid, 'no': CONSUMER, 'form': 'dpn', 'date': iso(mmdd), 'staff': STAFF, 'status': 'processed', 'processed_at': proc, 'processed_by': STAFF, 'values': fields})
        sid += 1
    for i, (mmdd, minutes, discussed, follow, household) in enumerate(WEEKLY):
        contact = 'Mother (family member) · phone'
        fields = {'Date': us(mmdd), 'Contact with': contact, 'Duration': '%d min' % minutes, 'Release on file': 'Yes · ' + RELEASE, 'What was discussed': discussed, 'Follow-up': follow}
        proc = '%sT16:%02d' % (iso(mmdd), 5 + 3 * i)
        n = {'id': 'mr-w-' + mmdd, 'client': CLIENT, 'staff': STAFF, 'type': 'weekly_guardian', 'date': iso(mmdd), 'contact': contact, 'duration_min': minutes, 'discussed': discussed,
             'follow_up': follow}
        if household: n['household'] = household
        n.update({'fields': fields, 'enhanced': discussed, 'session': sid, 'consumer': CONSUMER, 'processed_at': proc, 'review': 'approved', 'origin': 'seed', 'flags': []})
        notes.append(n)
        sessions.append({'id': sid, 'no': CONSUMER, 'form': 'weekly', 'date': iso(mmdd), 'staff': STAFF, 'status': 'processed', 'processed_at': proc, 'processed_by': STAFF, 'values': fields})
        sid += 1
    for i, (mmdd, who, method, shared, coord) in enumerate(MONTHLY):
        fields = {'Date': us(mmdd), 'Collateral': who, 'Method': method, 'Release on file': 'Yes · ' + RELEASE, 'Information shared / received': shared, 'Coordination': coord}
        proc = '%sT16:%02d' % (iso(mmdd), 20 + 4 * i)
        notes.append({'id': 'mr-m-' + mmdd, 'client': CLIENT, 'staff': STAFF, 'type': 'monthly_collateral', 'date': iso(mmdd), 'collateral': who, 'method': method, 'shared': shared,
                      'coordination': coord, 'fields': fields, 'enhanced': shared, 'session': sid, 'consumer': CONSUMER, 'processed_at': proc, 'review': 'approved', 'origin': 'seed', 'flags': []})
        sessions.append({'id': sid, 'no': CONSUMER, 'form': 'collateral', 'date': iso(mmdd), 'staff': STAFF, 'status': 'processed', 'processed_at': proc, 'processed_by': STAFF, 'values': fields})
        sid += 1
    about = ('M.R. (#3310) notes corpus (E5, rewritten for substance use IOP): processed daily IOP group notes (H0015), weekly family-member contacts and monthly collateral notes '
             'for the authorization period Aug 18 - Oct 28 2026, synthetic. 40 daily notes (units sum to the seeded 83 of 110 under the unit bands), 9 weekly contacts '
             '(the week of Sep 28 has none: the family session on Sep 29 took its place), 2 monthly collateral notes here plus the Oct 8 row in staff.json. '
             'Counts everywhere are computed from these rows. Notes carry origin:"seed" (demo history). Generated by scripts/seed-gen/notes-gen.py. '
             '_lauris_sessions is read by the mock Lauris store to show the same sessions in the Active File of #3310; it is not a Psyflo state key (leading underscore).')
    out = {'_about': about, 'notes': notes, 'doc_versions': [], 'evidence_marks': [], 'evidence_periods': [], 'recording_consents': [], '_lauris_sessions': {'consumer': CONSUMER, 'sessions': sessions}}
    return out, (goals, bands, cap)

# ------------------------------------------------------------------------------------------------------------------ checks (the file is wrong if any fails)
ABBR = re.compile(r'^(?:[A-Za-z]\.)+$|^(?:Mr|Mrs|Ms|Dr|St|vs|etc)\.$')
def split_sentences(text):
    # the same rule as splitSentences() in web/js/shared/enhance.js, so "repeated" here means repeated there
    toks = text.strip().split(); out, cur = [], []
    for i, tok in enumerate(toks):
        cur.append(tok)
        if not re.search(r'[.!?]["\')]?$', tok): continue
        bare = re.sub(r'["\')]+$', '', tok); nxt = toks[i + 1] if i + 1 < len(toks) else None
        if ABBR.match(bare) and nxt and not re.match(r'^[A-Z"\']', nxt): continue
        out.append(' '.join(cur)); cur = []
    if cur: out.append(' '.join(cur))
    return out
BANNED = re.compile(r'\b(school|student|teacher|classroom|guardian|parent|IEP|TDT|grade|after-school|H2016)\b|office referral|\bobserved\b|\bmonitored\b|\bwatched\b|%|\bpercent\b', re.I)

def texts(n):
    f = n['fields']
    yield from (str(v) for v in f.values())
    for k in ('mood', 'progress', 'enhanced', 'discussed', 'shared', 'follow_up', 'coordination', 'contact', 'collateral', 'method', 'household'):
        if n.get(k): yield str(n[k])

def check(out, bands, cap):
    notes = out['notes']; daily = [n for n in notes if n['type'] == 'daily']
    assert len(notes) == 51 and len(daily) == 40 and sum(n['type'] == 'weekly_guardian' for n in notes) == 9 and sum(n['type'] == 'monthly_collateral' for n in notes) == 2
    assert len({n['id'] for n in notes}) == 51 and len({n['date'] for n in daily}) == 40
    assert sum(n['units'] for n in daily) == 83, sum(n['units'] for n in daily)
    for n in daily:
        assert n['units'] == units_for(n['direct_time_min'], bands, cap), n['id']
        assert n['fields']['Units'] == str(n['units'])
        lines = n['fields']['Contact time'].split('\n'); tot = 0
        for ln in lines:
            m = re.match(r'(\d\d):(\d\d)–(\d\d):(\d\d) · ', ln); assert m, ln
            tot += (int(m[3]) * 60 + int(m[4])) - (int(m[1]) * 60 + int(m[2]))
        assert tot == n['direct_time_min'], (n['id'], tot, n['direct_time_min'])
        assert (n['objective'] is None) == (n['fields']['Objective addressed'] == '') and (not n['interventions']) == (n['fields']['Interventions'] == '')
        assert n['fields']['Narrative'] == n['enhanced']
    for n in notes:
        for t in texts(n): assert not BANNED.search(t), (n['id'], BANNED.search(t).group(0), t[:80])
    # the sentence counts: only the two intended boilerplate sentences repeat three or more times
    seen = {}
    for n in notes:
        t = (n['fields'].get('Narrative') or n['fields'].get('What was discussed') or n['fields'].get('Information shared / received'))
        for s in split_sentences(t): seen.setdefault(re.sub(r'\s+', ' ', s.lower()).rstrip('.!?'), []).append(n['id'])
    rep = {k: v for k, v in seen.items() if len(k) >= 30 and len(v) >= 3}
    assert {k for k in rep} == {re.sub(r'\s+', ' ', BP_A.lower()).rstrip('.'), re.sub(r'\s+', ' ', BP_B.lower()).rstrip('.')}, list(rep)
    # the events the story and the ASAM assessments rely on
    byid = {n['id']: n for n in notes}
    for d, word in [('1001', 'negative'), ('1013', 'negative')]: assert 'urine drug screen' in byid['mr-d-' + d]['fields']['Narrative'].lower() and word in byid['mr-d-' + d]['fields']['Narrative'].lower()
    assert 'September 27' in byid['mr-d-0928']['fields']['Narrative'] and byid['mr-d-0928']['interventions'][0] == 'SUD 1.2'
    assert 'Family session' in byid['mr-d-0929']['fields']['Narrative'] and 'SUD 2.1' in byid['mr-d-0929']['interventions']
    assert not any(n['date'] > '2026-10-28' for n in notes)
    sess = out['_lauris_sessions']['sessions']
    assert len(sess) == 51 and [s['id'] for s in sess] == [n['session'] for n in notes] and all(s['values'] == n['fields'] for s, n in zip(sess, notes))
    return rep

if __name__ == '__main__':
    out, (goals, bands, cap) = build()
    rep = check(out, bands, cap)
    if '--check' not in sys.argv:
        with open(OUT, 'w') as f:
            json.dump(out, f, indent=1, ensure_ascii=False); f.write('\n')
    d = [n for n in out['notes'] if n['type'] == 'daily']
    obj = {k: sum(1 for n in d if n['objective'] == k) for k in (1, 2, 3, None)}
    print('%d notes (%d daily, %d units), objectives %s, repeated sentences %d%s' % (len(out['notes']), len(d), sum(n['units'] for n in d), obj, len(rep), '' if '--check' in sys.argv else ' -> ' + os.path.relpath(OUT, ROOT)))
