# Dictation → group note · M.R. · Thu Oct 29, 2026

Synthetic. Acceptance test for Flow B (`test/draft.test.mjs`). M.R. is 15, alcohol and some cannabis, IOP (H0015, three hours a day). His ASAM reassessment is Oct 14: Dimension 3 still 2, one lapse Sept 27, negative screens Oct 1 and Oct 13.

## Input

Psyflo does not time sessions (Track Time was removed on Nov 11): the contact time, direct time and units are typed in Lauris by the person.

Spoken at 1:42 pm by K. Hale after the afternoon group. This is the sentence the phone's "Use the example" loads (`seed/extra/phone.json`, `phone_examples.MR`):

> ran the refusal skills role play with M.R. in group, he practiced saying no to a drink at a party twice, craving was a 5 before and a 2 after

M.R.'s ISP goals (counts, each tied to an ASAM dimension): 1 (Dimension 5) 4 of 5 weekly urine drug screens negative; 2 (Dimension 4) attend 4 of 5 scheduled groups each week; 3 (Dimension 6) identify and use two recovery supports.

## Expected output on the phone ("In your words")

The draft is the staffer's own words, tidied (capital letter, final full stop) and nothing else:

> Ran the refusal skills role play with M.R. in group, he practiced saying no to a drink at a party twice, craving was a 5 before and a 2 after.

Chips: **craving 5 before, 2 after (0 to 10)** · your words. The craving rating is read from what was said; nothing is added to it.

Questions left for the staffer (what the words do not say is never filled in): *Which ISP objective did this address?* · *What did you do (which intervention from the ISP list)?* · *How long was it?*

Buttons: Looks right · Fix it. Footer: "Ready for you when you open M.R. in Lauris."

## Checks

Shown as passed: craving rating (0 to 10) stated; no "observed".
Shown as open: intervention on the ISP list (none named), linked to an ISP objective (not named), duration or a count (not said).

## A fuller dictation, with a screen result

> ran the relapse prevention skills group today, M.R. practiced drug and alcohol refusal skills in a role play about a party, goal 1, craving was 3 of 10, urine screen negative, 40 min

Chips: **objective 1** · **SUD 1.2, SUD 1.4** (the interventions named, from the ISP list) · **40 min** · **craving 3 of 10** · **screen negative**. No question is left; every check passes.

## Negative case

Typed input: "I observed M.R. at group and he sat alone." Psyflo keeps the words, flags "observed" and asks what the staffer did. It never rewrites the verb. The "no observed" check shows as open.

## A lapse or positive screen

Typed input: "M.R. used on Saturday at a party, positive urine screen, craving 6 of 10." Psyflo keeps the words and asks what was done about it (who was told, what changed in the plan). It writes no response for the staffer.
