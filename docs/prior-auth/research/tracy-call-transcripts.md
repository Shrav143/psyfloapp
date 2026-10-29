# Tracy Cosker (Harbor Behavioral Health) — cleaned discovery call transcripts

**Purpose.** Working record of Psyflo's two customer discovery calls with Tracy Cosker of Harbor Behavioral Health. This document replaces the raw transcripts for the prior-auth team: use it for synthesis, requirements, quotes and follow-up questions.

**Sources.**

1. **September 1, 2026 — first discovery call.** Shravan Hans (Psyflo) × Tracy Cosker. Granola recording; speaker labels in the raw file were "System audio (Tracy Cosker)" and "Microphone" (Shravan). No timestamps. The recording begins mid-sentence, partway through Tracy's description of the program, so the opening introductions were not captured.
2. **September 11, 2026 (Friday) — "Tracy x Shravan Reconnect".** Shravan Hans and Deanna "Dee" Oliver (Psyflo) × Tracy Cosker. Attio call recording with timestamps; 17:00–18:09 UTC, about 68 minutes. Psyflo walked through a short deck; Tracy asked for it afterwards as a pre-read for her owner.

**Participants.**

- **Tracy Cosker** — COO of Harbor Behavioral Health (she introduced herself as "the CEO" on the first call and as "COO and AI strategy and implementation executive" on the second). Runs operations, HR, billing, IT, budget planning, finance, compliance and regulatory work, and personally manages the prior-authorization process. Lives and works from Saratoga Springs, NY; the clinic is in Lexington and Hopkinsville, Kentucky.
- **Shravan Hans** — Psyflo; ran the first call and co-ran the second.
- **Deanna "Dee" Oliver** — Psyflo research partner; leads engineering; joined the second call.
- Mentioned but not present: **Luke**, the owner of Harbor Behavioral Health (serial entrepreneur, building clinical-side AI tools); **Heather**, a Harbor clinician who writes the renewal documentation.

**Editing note.** These are cleaned transcripts, not summaries. Filler ("um", "uh", "you know", "like", "kind of"), false starts, stutters and pure backchannel ("Mm-hmm", "Yeah", "Wow") were removed, and consecutive fragments from the same speaker were merged into paragraphs. Obvious speech-recognition errors were corrected: "PriorAuth" / "prioritization" → "prior auth" / "prior authorization"; "Cloud Code" → "Claude Code"; "Claude coworker" → "Claude Cowork"; "Whisper Flow" → "Wispr Flow"; "availability" → "Availity" where the portal is meant; "who the renter is" → "who the rendering provider is"; "the actual pill" → "the actual appeal"; "B-Health" → "behavioral health"; "funnel university" → "Cornell University"; "AC" → "Tracy"; "SunWave" → "Sunwave"; "Apple Minis" → "Mac Minis". Places where the audio is genuinely unclear are marked [unclear]. Square brackets mark short editorial clarifications. Everything else is Tracy's, Shravan's and Dee's own wording, in first person; nothing was added or invented. Tracy mostly says "primary care homes" for the residential facilities her clients live in (Kentucky's regulatory term is "personal care home", which she also uses once); her wording was kept.

---

## Call 1 — September 1, 2026: first discovery call (Shravan × Tracy)

### Key facts at a glance

> **Clinic and population**
>
> - Harbor Behavioral Health, two locations in Kentucky. Treats only patients with severe mental illness (SMI); specific qualifying diagnoses, duration of illness and hospitalization history are checked before intake.
> - Most clients live in a primary/personal care home and have goals of eventually living on their own; programming is around skills of daily living, medication management and coping skills.
> - Referrals come from close to 10 primary care homes across the 2 locations; many clients have guardians who must be involved in paperwork and releases.
> - No self-pay at all. Every client is a Medicaid MCO member (or straight Medicaid/Medicare), so every single client requires a prior authorization for the service billed.
>
> **Regulatory trigger**
>
> - Kentucky did not previously require PAs for these community services; in July 2025 the state mandated them. Initially everyone in treatment got a blanket authorization; over the past year requirements have become much more complicated and payer-specific.
> - Kentucky legislation requires a PA decision within 5 days; approvals are backdated to the request date.
>
> **Staffing and cost**
>
> - 2 full-time FTEs 100% dedicated to prior authorization, plus Tracy herself 2–3 hours every day managing it.
> - 3 contractors used to help with forms; the Claude "engine" let her cut 2 of them.
> - Offshore billing team ≈ $12/hour; a clinician ≈ $90/hour spending 3–4 hours on forms — clinician time is where the ROI is, not submission labor (≈10–15 minutes per request).
> - Clinicians create all the documentation; a PA packet has upwards of 13 assessments/documents.
>
> **Systems (3–7 in play)**
>
> - Sunwave: combined EHR + CRM + RCM, behavioral-health specific; replaced 3 separate systems when Tracy started. Has a "form export" feature used to build the packet.
> - Availity for 4 of 5 payers (per-MCO forms asking for NPIs, EINs, rendering provider, CPT, diagnosis code, start/end dates); the fifth payer's own portal.
> - Clearinghouse connection for eligibility (checks for an active Medicaid policy covering H2020).
> - Excel spreadsheet with about 5 tabs (appeals, renewals, everyone currently approved, …) — the only thing that tracks all the moving parts.
> - Claude / Claude Code "engine": holds all MCO requirements, a large set of denial letters and approved packets; drafts treatment plans and PA documents, grades likelihood of approval and suggests edits; clinicians review and approve everything before it goes out.
> - Inputs to the engine: Sunwave intake forms, voice-recorded sessions, clinician Wispr Flow dictation summaries. Output is written back into Sunwave forms via a Claude Code browser-automation tool (ties up a computer 15–20 minutes; moving to dedicated Mac Minis / own servers).
> - HIPAA: uses the HIPAA-compliant Claude with a BAA (Claude Code, projects and chats; not Cowork); works de-identified where possible.
> - Also builds a "waterfall report" in Claude from three uploads (charges by date of service, payments, the PA spreadsheet).
>
> **Payer mix and billing**
>
> - Contracted with 5 Kentucky Medicaid MCOs (the primary payers); also straight Kentucky Medicaid and Medicare, and some commercial Medicare plans (Anthem, Blue Cross Blue Shield). Claims go to close to 10 different payer entities.
> - Regulatory requirement: bill Medicare first and get the Medicare denial before submitting to Medicaid, even though Medicare never pays.
> - Bills a single CPT code, H2020.
>
> **Rates and timelines**
>
> - ~30% of PA requests denied on first pass (≈70% first-time approval). ~50% of peer-to-peers succeed. ~15% of clients end up in a written appeal. Overall ≈85% approval after peer-to-peer/appeal.
> - Appeals take up to 60 days; every payer has a different channel (fax, portal, email); one also requires a client-signed authorization form.
> - Peer-to-peer costs a clinician 30–60 minutes; some payers refuse to hold one and force a written appeal.
> - PA is requested within 24–48 hours of intake; clients start attending immediately; 1–2 days of claims are typically written off.
> - Initial requests are usually for a ~90-day window; some payers cap at 40 or 60 units regardless of the recommendation; recent "partial approvals" (ask for 60 units, get 30, no reason given).
> - Renewal is triggered when units run out or the end date hits — whichever comes first — and requires updated clinician documentation and the whole process again.
>
> **Money and tracking**
>
> - Waterfall report example: 60 patients seen, but only 45 had an active PA for that date of service; a payer takes 2–3 months to reach 98% of collectible revenue.
> - Existing tools assume a one-to-one patient-to-authorization relationship and overwrite history, so she cannot see trends by payer or the downstream revenue impact of partial approvals.
> - Policy: if a denied client would be harmed by a disruption, Harbor keeps them attending free of charge during the appeal. Several clients have had to be discharged when insurance deemed care not medically necessary.
>
> **Vendor evaluated**
>
> - A browser-based "PA agent" (name she could not recall) that records you doing the process, then acts as you with your credentials in Availity and the EHR. It solved submission only, not approval or tracking — "the smallest part of my problem".
>
> **Next steps agreed**
>
> - Shravan to send a follow-up email with a Google Form (gift card) and to show a demo in a week or two; Tracy: "I'd love to see it."

### Cleaned transcript

#### Clinic and population (recording begins mid-sentence)

**Tracy:** …is around skills of daily living, et cetera. Most of our clients are living in a primary care home facility, and they have goals of being able to potentially live on their own, so they're really trying to keep themselves regulated, make sure they're doing medication management, make sure that they are staying on top of their coping skills and coping mechanisms, things of that nature.

For me — I'm the CEO, and I manage all of our billing and compliance and regulatory things — I'd say our two biggest pain points are prior authorizations and regulatory changes.

#### Why prior auth became the problem: the July 2025 Kentucky mandate

**Tracy:** So right now, prior authorizations — [we used] to not be required to have prior authorizations for our services, these community services, and in July of 2025 they mandated in the state of Kentucky that these now require prior authorizations. Originally they just gave everybody that was getting treatment a blanket authorization, but over the last year they've become much more complicated, much more payer-specific in what the requirements are to receive an authorization. And there just doesn't seem to be the best rhyme or reason on why one person gets approved and another one doesn't. There are certainly stated rules, guidelines, regulations that each of the MCOs will provide. But what we have found —

We're very much an AI-forward organization, and we have built a knowledge base, or database — actually, it's an agent, it's an AI tool — that we've uploaded all of those requirements into. We've uploaded a significant number of denial letters that we received from the payers, as well as a significant number of our approved packets, and even the AI is like, "I don't understand why this one was denied." They even are like, "This makes no sense. You've answered everything." So I think there's a lot of subjectivity involved in some of the prior authorization process that is just very difficult for us to overcome.

#### Staffing cost and the 3–7 systems problem

**Tracy:** The prior authorization process easily takes up — I mean, I have two full-time FTE that are 100% dedicated to the prior authorization process, and then I manage it. So every day I probably spend a good 2 to 3 hours. It shouldn't be that difficult, but there's probably anywhere from 3 to 7 different systems that we have to use to keep track of this information, because each MCO — some of them want you to do it in their specific portals. Others use Availity, which is a larger portal that has multiple payers in it. But if one of your payers isn't using it, then you have to go into their individual portal. And then the EHR systems just don't seem to be set up for the types of authorizations that we do. They're more set up for an authorization for an MRI, where it's just a yes or a no.

#### Denials, appeals and the clinician burden

**Tracy:** Our denials on PAs run about 30% — about 30% of our requests are being denied. And then there's an appeal process that you can go through, but that appeal process can take up to 60 days to be completed, and every single payer has a different way they want their appeals done. Some of them want you to submit it through a fax. Others want you to submit it through a portal. I think we have one that you have to email, and then they also require an authorization form that is signed by the client that has to be submitted as well. So there's just a whole lot of moving parts, and there's nothing that can pull it all together in one consolidated view.

As an operations person, I try desperately to avoid spreadsheets at all costs, especially when we spend a lot of money on some of these tools and technologies. The only thing that we have been able to find that can keep track of all the moving parts well is an Excel spreadsheet. It's got about 5 different tabs: one tracks our appeals, one tracks the actual renewals, one tracks everybody that's approved right now. We've been working with our EHR, trying desperately to get them to make some enhancements, but when you're dealing with software, we're one of hundreds of clients, and if most of the other clients are fine with the way it is, they don't want to mess with it for what we need.

So I would say the prior authorization process is a huge, huge challenge to us. It prevents us from being able to move forward and really is a resource drain for us. It also ties up a pretty significant amount of our clinicians' time, and that's time away from being able to care for the patients, because they have to develop the documentation. I manage the process — how it gets done, the tools — but all the documentation that we need to send has to be created by the clinicians. Prior authorization packets, I think, have upwards of 13 different assessments and documents that we have to send as supporting evidence and information.

And then if we do an appeal, they typically will have to do what they call a peer-to-peer review, which is where they have a conversation with one of the other clinicians. That usually takes anywhere from 30 minutes to an hour for them to go through that conversation. If that gets overturned, great, we can move forward. But I'd say about 50% of our peer-to-peers are successful, meaning that we get the approval, and the other 50% we're having to move forward in the appeal process. So then they have to write an appeal letter and justify that information, et cetera.

So prior authorizations is a drain on all of our resources, both clinical and administrative, and really impacts the patient's ability to get care. We've had several patients that we've had to discharge because insurance has just deemed it's not medically necessary, even though our clinicians who work with them every day feel that they definitely need and will continue to benefit from these services.

#### EHR and payer mix

**Shravan:** This is super helpful. Out of curiosity, Tracy, which EHR do you currently use, and what is the payer mix of the clinic at the moment?

**Tracy:** We currently are using Sunwave. It is a combination EHR, CRM and RCM tool, so it's an all-in-one, which is very helpful. We used to have three different systems we were using, so when I started, one of the things that I felt was really critical was for us to get a more consolidated view of our client experience from the very beginning all the way through until the end. They are behavioral health specific, so that has been very helpful, because they do understand a lot more of the behavioral health CPT codes, our payer mix, et cetera.

Right now our payers are primarily all MCOs, and we are contracted with five different MCOs. And then we also are submitting claims to Medicare. So in addition to the five MCOs, which are Medicaid MCOs within the state of Kentucky — they are the ones who primarily pay — we're submitting claims to close to 10 different [payer] units, because some of our clients have direct Kentucky Medicare, but then we have some who also have some commercial Medicare plans like Anthem, Blue Cross Blue Shield, et cetera. And part of our regulatory requirement states that we have to submit to Medicare and get a denial from Medicare before we can submit to Medicaid. So even though we know that they're not going to pay, and they're never going to pay, we're required to submit them just to get that denial before we can forward them on to Medicaid.

**Shravan:** So the majority of the patients are basically either managed Medicaid, and some of them are commercial, or straight Medicaid, essentially.

**Tracy:** Correct. Medicaid. Yep.

#### Why every patient needs a PA, and how intake triggers it

**Shravan:** Tracy, when you mentioned that you are using other tools to manage the prior authorization process, can you tell me a bit more about that? I know you mentioned an Excel file and then an AI system as well. I'd love to hear how the process works. Let's say I was a patient that walked in — do I automatically need prior auth from the get-go, mandatorily? And why is that? Why do I need it versus another patient that may not need it?

**Tracy:** The reason that you need it — all of our patients need it, because we don't have any self-pay. All of our clients are either managed or members of a managed care organization, and it is required by both the state Medicaid policies as well as our individual MCOs that there is an authorization for these patients before we can bill and provide services.

Now, I will say that for us, we do allow — so they have to first come in and do an intake appointment. During that intake appointment, we do a series of different assessments depending on what their diagnosis is from their current providers. And then we send out all that information, along with their historical medical information, for the prior authorization review. We will allow our clients to start coming even though we don't have a prior authorization for them yet.

The state of Kentucky has put forth some legislation that requires prior authorizations to have a decision within 5 days. So we typically will get our initial decision on that prior authorization, and they'll backdate it to the date that we requested. Most of the time we are able to request that prior authorization within 24 to 48 hours of their intake appointment, so then we're writing off one or two days of claims that weren't covered, and then we'll be able to start getting some revenue recovery from the services that we do provide.

#### Units, windows and renewals

**Tracy:** That's the general process. We'll request an initial based on what the clinician thinks is the best initial set or length of their treatment plan. Most of the time it's about a 90-day window. Some of the payers have said they won't authorize more than 40 units or 60 units, so they're kind of saying, "We don't really care what you think your recommendation is, we're only going to approve this many."

The other trick with our authorizations is that they cover a specific period of time and a specific number of units, which is visits. Our clinicians will recommend that they come three times a week, but whether they actually do or not is tricky. And so once a patient either runs out of units or the end date of that authorized period hits, then we'll have to submit for a renewal, and we'll have to submit for an additional review and authorization. At that point the clinician does updated documentation, we resubmit the whole process, and we go through it again.

In terms of the different systems: obviously we track their interest from the minute that we find out that they're interested in coming to us for our services — that's all tracked in the CRM. All of the requests for information and requests for medical records, all of the release documentation is held there; their signatures on those documents are held there. Once we receive all of that information, then we can submit that to our clinicians for them to do a final review, to see if they feel they really qualify for our services. Then we'll schedule the intake appointment, and they'll come in and meet with the clinician one-on-one, and at that point we'll make a recommendation for their treatment protocol, and at that time we will submit that request for the authorization.

#### SMI eligibility and the referral pathway

**Shravan:** When you mentioned the clinician has to determine whether the patient is appropriate for the program — is that because the clinic only offers Medicaid programs, like intensive outpatient programs, rather than straight behavioral therapy?

**Tracy:** Part of that, yes, for sure, because we don't do just regular therapeutic services. We only treat patients with severe mental illness, and there are specific diagnoses that qualify as severe mental illness. And again, because we do have the requirements by Medicaid, a lot of that is: have they had a severe mental illness for a specific period of time, is it continuing, have they been hospitalized in a certain number of years. So there are a few different things that we have to look at to ensure that they are qualified and the best fit for the programs that we offer.

**Shravan:** That's super helpful. So let's say I'm a potential SMI patient and I'm interested in services. When I call the clinic, do patients typically just walk in or get a referral? And once the information is collected — I know you mentioned the prior authorization process is done adjacent to the patient visit; is that typical? And what happens after that step, if it gets denied or if it's approved?

**Tracy:** Sure. Most of our patients come to us from the primary care homes. We have developed relationships with specific primary care homes within a certain radius of our clinic, and right now I think we have close to ten different primary care homes that we're serving across our two locations. We're very close and in constant contact with those primary care homes. When they have new patients come in, they'll talk to them about this as being an option for them if they would like to attend. And then at that point somebody — one of the clients, or sometimes it's their guardian; so many of our clients have guardians that we also have to build relationships with and work with — so what will happen is either the guardian will reach out to us, or the primary care home will give us the patient's information and their name and say, "This person's interested in coming." And then we will begin the process of collecting all of those documents for them, working with either their guardian or with the client directly. Several times the care home will also have — because the care homes have a weekly doctor that comes in to see them, and they usually have a monthly meeting with a psychiatrist, et cetera — so we can get those records from the primary care home as well. That's how we find them and how they're referred to us.

When they come in and they do the intake, again, it's about 24 to 48 hours after that that we will request the prior authorization. I think some clinics will wait and not start seeing the patient until after that authorization comes through. We as an organization have just made a choice that when somebody is expressing that need, and it seems like they have need, then we would really like to get them started into the treatment and see how they do.

#### What happens on a denial: free care during the appeal

**Tracy:** If it comes back and the authorization is denied, what we will do is go ahead and move forward with the appeal for that authorization, depending on the client. We work really closely with our clinicians. Some patients, with the type of severe mental illness that they have, still have some good cognitive abilities, and we can explain to them: "Your authorization was denied. We're going to appeal it, but it's going to take 60 days for that decision to be made, so you're not going to be able to attend anymore until that decision is made." However, for some of these patients, our clinicians know that their schedule is so important that a disruption like that could be harmful to them from a therapy standpoint. If we have those scenarios, we will let them continue to attend and provide those services free of charge to that individual while we're going through that appeal process. That's just something for us, from an ethical standpoint, making sure that we're doing right by these clients: if we think that telling them they're not able to attend for a little while is going to be detrimental to them, then we'll go ahead and let them continue to attend. If not, then we will just tell them that we'll keep in touch, and as soon as we find out the status of this appeal we will tell them, and then they can return to our services.

**Shravan:** Wow. That's very generous, because I'm assuming if those appeals don't go through, you're absorbing that cost. If every client is going through prior authorization, what portion of those are going through the appeal process?

**Tracy:** Yes, we are. I'd say we've been about 50% successful on our PA [appeals]. About 15% of our clients are going through that appeal process, and the rest — we're at about an 85% approval rate right now. But that's after either a peer-to-peer or an appeal. So I'd say first-time approval is probably closer to about 70%. Then about 50% of those [denials] will go through and be approved through the peer-to-peer process. And then the other 15% will have to go on to that third layer, the actual appeal.

#### The three layers: utilization manager, peer-to-peer, written appeal

**Shravan:** When you said the third layer of the actual appeal, is that when the units have expired?

**Tracy:** Nope. The third layer of the appeal means that we sent in the initial documentation. It was reviewed by what they call utilization managers, which are typically people with some medical background, but they basically have a matrix that they're checking off based on the requirements and criteria. Sometimes the utilization manager will escalate it to a clinical person for review. If that happens, many times that clinical person will deny the initial request and recommend a peer-to-peer consult. So that's the second step: you already got your initial denial, now you're going to go and have the two clinicians talk to each other — our clinician will talk to the clinician at the payer and see if they can come to a meeting of the minds. When we have that process, about 50% of the time that conversation will be a positive one, and they'll say, "Okay, you've convinced us this person does need these services," and they'll approve it at that point. If during that conversation things don't go great, or if some of the payers won't allow us to do a peer-to-peer consult — they're like, "Nope," they don't have time, whatever — then we have to go to that third level, which is the written appeal, I guess is probably the best way to describe it. At that point the clinician writes up: "I've done this, we did this, we did a peer-to-peer, I really still feel that this person needs this treatment." They put together another document that defends it specifically for that patient's needs, and then that goes off to whatever team handles the appeals for that payer. They review it, and then they'll send us back a final determination.

**Shravan:** Wow, this is super, super helpful, Tracy. We've probably had a dozen conversations with private practices, but also community behavioral health clinics, and this is something that's been brought up so many times. Trying to piece it together, the process seems, for lack of a better word, so complicated — there are so many moving pieces.

#### The Claude engine

**Tracy:** There are, and every MCO has their own little way that they want to do it. Every payer has their own way they want to do it. They all have different forms, they all have different sites, they all have different guidelines. Trying to get that all into one consolidated place to be able to effectively manage the process is very challenging.

And again, like I mentioned, we've built — using Claude, Claude Code, et cetera — [something] that actually allows us to take all of those records, all of that information, all of those assessments, and run it through our engine. I call it the engine. It has all of our denials in it, all of our approvals in it, has all the MCOs' standards in it, and it helps us to generate a treatment plan, generate the documents that we need for the prior authorization. Then the actual clinician will go in and review it and approve all that information — from the assessments that the clinician did, from the voice note they do after their intake that gives an overview. Right now we're using it to help speed up that clinical documentation piece, and as a grader: how likely is this to get an approval? That allows us to move forward in that process. If we need to make edits, it might make some suggestions — things that we had missed, or things that, based on the AI's knowledge of that specific payer, "this might be denied because you haven't mentioned this," or "because their score on this assessment is a little bit low" — so that the clinician can use that information to make a more informed recommendation on how they move forward.

#### Building her own tracking tool: submission is easy, visibility is hard

**Tracy:** I've started trying to build out a software tool that will give me all the pieces of these different spreadsheets, these different systems. I'm trying to hook into as many APIs as possible to be able to pull in the actual — Availity has an API, each of our systems has an API, and each of the MCOs has certain types of portal APIs that you can link into. It's just getting them all to talk properly to one another. It's a nightmare. So that's some of the stuff that we're trying to do.

There are a lot of tools out there that will submit them for you, and that part of the process, quite honestly, is easy for us. You go in and you click and you upload. We can download the documents from our EHR; we just click on them. That's the smallest part of my problem. The biggest part of the problem is actually knowing where each one is at in the process — if this one's denied, if this one's approved, if this one's been resubmitted — and getting that clarity. A lot of the systems just assume it's a one-to-one relationship. And for us, for me to be able to say what my approval rating is — because we do so many renewals — a lot of the tools you have will overwrite the old one. So you lose your historical information, because they're like, "Oh, you don't need that anymore." But it's really important for me to have that, so I can see trends and I can understand: are we getting more denials from this payer? What's going on? What's changed?

Recently we've started getting what I call partial approvals. We'll ask for 60 units, but they'll only give us 30, and they don't give us a reason why. So then I have to go, "All right, so now that's going to impact our revenue forecast," because if all of a sudden we're getting half of the units approved, I need to be able to see that, to be able to say, "Okay, something's changed. We're not getting 60 units from this payer anymore, we're getting 30. So now we aren't going to be able to see that patient as long," et cetera. And there's just not that ability to see that type of information in a really consolidated and connected way. You can see disparate pieces of it here and here, but seeing it and understanding the downstream impact of that is what's incredibly challenging.

#### The waterfall report, write-back to Sunwave, and HIPAA

**Shravan:** And is that why you're using Excel to keep track of where each claim is in the process, using those tabs? I'm curious — when you're using Claude, what documents are you feeding into Claude, and what are you hoping Claude does with them?

**Tracy:** I've got a couple of things. I build what I call a waterfall report. The waterfall report essentially shows all the charges that we've made based on the date of service. Then I upload a report of all the payments that we've received, attached based on that date of service, and then I upload the entire spreadsheet that we use for our authorizations, so it knows which ones were approved on what days and when. So it can tell me: all right, we saw 60 patients. Of those 60 patients, only 45 of them had active PAs for that date of service. So the most revenue that I can collect is X, because the others all have to get written off. And then it will tell me when we've received that payment, so that I can see: all right, this payer is taking 2 to 3 months for us to get to 98% revenue collected for what is actually collectible.

We've also connected it to Sunwave at this point. We've been able to figure out a way to write back to Sunwave. We use one of the Claude Code tools that allows it to take over a browser, so it will go and do all the data entry of all that stuff for us. The biggest challenge that we have with that right now is just that it ties up somebody's computer, and sometimes it can take 15, 20 minutes for it to do that. So one of the things we're trying to do now is set some of these things up on other servers — Mac Minis, et cetera — so that they can run independently. And of course we want to keep it on our own servers so that we are HIPAA compliant and we're staying within those requirements. All of our stuff that we try to do is de-identified. Anything that is personal, when they do the takeover of the browsers, we're doing that in a HIPAA-compliant version of Claude that we have the BAA with. We can't use Claude Cowork in there, but we can use Claude Code and regular projects and chats, and those are part of our BAA. So we feel we're pretty solidly compliant there.

#### The document set: Sunwave forms, Wispr Flow, the cover sheet and the form export

**Shravan:** And how has that process been? I know you mentioned Claude Code plus another piece of software you're working on, where you have a bunch of different documents. Do they vary based on payer? And is Claude solving that?

**Tracy:** Yes. Some of the documents vary based on payer. We do have a document set that we use for all of our payers, because that's just easiest — a standard document set. These are forms that were created in our Sunwave instance that have all of the answers and the information that the clients provide during the intake session. We also voice-record these sessions, and at the end of that session the clinician will use Wispr Flow as dictation to just do their summary of what [was discussed] and how they spoke. So we're uploading the Wispr Flow file, we're uploading all of the documents that we have gone through — we go through every single line item on those documents and we record that as well. So it's a combination of both the written form and the voice text, and we're using that information to come up with how to fill the form out. Then once we fill the forms out, we run it through the engine that has our denial letters and our approvals, for it to say, "Okay, here's the…" We created what we call our cover sheet, which has all of the criteria for each of the MCOs and says: this is the diagnosis, here's their treatment, here's our recommended protocol, et cetera — so that there's a one-pager that they have, and then we'll send the supplemental information behind it.

**Shravan:** And is that the reason you call it the engine — because you're giving it all the information it needs, uploading all this data, and it's pre-filling all the documents you need? What happens next, once it spits out the documents? Are you copying and pasting that information into the payer portal, or where is it going?

**Tracy:** We aren't copying and pasting. In the EHR that we use, we have what they call a form export feature. The engine automatically fills out all the forms for us in Sunwave, so it's all in Sunwave, in the forms in Sunwave. Then when we go to request the authorization — I said 4 of our 5 payers, we can request their authorizations in Availity. So we log into the Availity portal, and that's a very manual process. That's one of the things that I'm trying to fix a little bit: how do we take this now and put it over here? I'm hoping that the API connections will be helpful. But what we have to do is fill out a whole bunch of information. Each MCO has their own form within Availity that asks for all the different pieces of information: our NPIs, our EINs, who the rendering provider is, what the CPT code is, what their diagnosis code is, what we're recommending as the start and end date, all of that. And then at the end they ask you to upload your supplement. So we export what we call our form package in that system. It lets us pick the documents that we want to export, so we pick all the forms that we think are needed, along with that cover sheet that we've designed, which we [built] into Sunwave as well, and then we export that as one specific document and upload that into the portal.

One of the things that we realized we needed to do is separate our assessment documents from the medical records documents that we get from other providers, because sometimes we found that either there's a data issue, or they just are too lazy to scan to the end of the documents to see those medical records. So we've started separating them, so that they can see "these are our clinical assessments" and "this is the medical records." And if we do have that cover sheet, we put that as a separate document as well. Because we were merging them all into one, and we were getting all these denials saying "not medically necessary, they don't have an SMI." And I'm like, what do you mean? We filled out your SMI checklist. How do you say that there's no SMI? But I think it was just that these were 30-page, 40-page documents, and they just weren't actually looking at all the pages to see what content was there. So we try to make it easy for them as much as possible. Then once we submit that, we're able to see the current status, et cetera, in the review.

**Shravan:** Wow, that's a lot of work. And I'm sure Claude is basically helping you make that process a little bit easier — generating the docs and everything.

**Tracy:** As much as possible, yes. We try to use that as much as possible.

#### Insurance verification and the CRM → EHR → RCM flow

**Shravan:** Honestly, you're the first clinic we've heard of that's actually utilizing Claude as a copilot to do some of the work for you, which is amazing. How does the insurance verification process work — or is that even a thing with your population?

**Tracy:** We do that insurance verification process as part of our intake process. We have an individual who is our intake coordinator, and one of the things that she does when somebody expresses interest — we have a connection with our clearinghouse, which allows us to push a button, and it goes to the clearinghouse. The clearinghouse will let us know if they have a valid or active Medicaid policy that covers H2020, which is the CPT code that we bill. That's how we get our verification. Availity can also do a verification of benefits; you can go in there and submit it that way.

**Shravan:** And is that something you're doing in the EHR or in Availity, where you enter the member's ID?

**Tracy:** We do that in the EHR. Our EHR has a CRM as well as an EHR and the RCM, so we're able to do the intake process there. We do the verification of benefits before they come in for their appointment. Once they come in for their appointment, they get fully admitted, then they move to the EHR. And then once that is done, we do all their billing through the RCM component of the software.

**Shravan:** So once they get through the intake, that's when it triggers the prior authorization. And irrespective of who the client is, you still have to go through prior authorization, because you have to establish the SMI diagnosis and requirements for that Medicaid payer. Is that fair to say?

**Tracy:** Yes. Every single — any Medicaid client, for the services that we provide, requires a prior authorization.

#### What vendors got wrong: submission versus approval

**Shravan:** Out of curiosity, Tracy — my last question; I know it took more than 30 minutes, but this is super helpful — besides Claude, have you looked at any other solutions out there that can streamline this process?

**Tracy:** Yeah, I've looked at a few. There was one — I forget the name of it; I can't remember and I'm sorry, I don't have it right off the top of my head — but I did look at one that had a prior authorization agent that they were talking about. It's a browser-based agent. Essentially the way that they explained the process to me is that they record you doing the process, and then they use that as the training tool. Then the code can go in and use your credentials in the browser and act as you, as an autonomous version of you: logs into Availity using your credentials, logs into the EHR using your credentials, et cetera. But again, they were focused mostly on just the request process, not on what I consider to be the more challenging problem, which is getting the prior authorization approved. Getting it submitted — and that's just our problem; I can imagine at a hospital or a high-volume practice that is billing multiple CPT codes and is getting multiple types of prior auths, that could be a huge time saver for them. But for us, for me, that's not my biggest problem. My biggest problem is the approval process, and I have not found anything out in the market right now that helps with that part of the approval process.

My guess is it's just because it's a sensitive area. A lot of clinicians are like, "A machine shouldn't choose what diagnosis someone should have." We've gotten through that with our clinicians by saying: you're still choosing. You're the one who's doing it all. It's just taking all that documentation piece away from you and helping you to know what's the most valuable information to use for this, to make sure your patient gets approved so they can get that care that you're recommending. And they have the final review of anything that gets sent out. We aren't sending anything automatically; we always have the human. I'm a big proponent of "human plus AI" movements. The human is still doing the most human parts of our assessment, while we're letting the machines do the things that are a drain on the human's ability to do the more cognitive things that they need to do.

**Shravan:** Just to reiterate what you mentioned: when you say "approval," and you didn't go with that other vendor — does that specifically mean generating the documents, like Claude is generating right now, the provider reviewing and approving those documents, and then tracking what stage it's in — is it being denied or partially approved, do we have to do an appeal? So essentially you're trying to streamline those two processes. Is that right?

**Tracy:** Yeah. What they were doing was really — they were doing some of the approve, deny and appeal, but they were really just doing, "We can get all the documents out of your EHR and submit it through Availity for you, so that a human doesn't have to do that process." And for me right now, that's not a huge drain for us. I'd rather use the tool to do other things.

**Shravan:** Right, because you still want the human to review the documentation and then approve it. So documentation generation is not a huge pain point? Or is it still?

**Tracy:** I mean, for the clinicians, yes — a very huge pain point. What they were trying to sell was more like: I have a billing person who goes in and fills out those forms in Availity and attaches those documents. And again, that takes about 10 minutes. Sure, if somebody else could do it, I could save some money, but that's not my biggest problem. That's not where my high-value return on investment would be from this. It's on my clinicians' time. Right now the billing team that we have, they're like $12 an hour — we use an offshore team who does that. And so 15 minutes for them to submit a form is not much. I'm not going to get a huge amount of savings from that, versus one of my clinicians who's $90 an hour and her having to spend 3 or 4 hours on forms. That's a much bigger return on my investment there.

**Shravan:** And isn't Claude already automating that?

**Tracy:** Yes, we're already getting significant [savings]. We have 3 contractors that we used to help with some of our forms, and we've already been able to reduce our contractors by 2 people because of this.

**Shravan:** Wow, that's amazing. That's a big jump from just having Claude at work. What do you like about Claude at the moment? Would you change anything, if you had a magic wand?

**Tracy:** If I had a magic wand — anything that you're building in AI and with Claude right now, you have to iterate all the time, which is important. And it hallucinates a lot. It gives you a really confident answer that it knows what it's doing, and then when you actually start pulling things out, you're like, "I don't think you understood this." And you sit there and you're like, he was so confident when he said that this is what you had to do. So some of that. But a lot of that is also on us as individuals to learn how to work with the tool — to know to say, "don't assume, don't do this, don't do that." So it's an important indicator on both sides.

#### Wrap-up and next steps

**Tracy:** I actually have to jump. I didn't realize what time it was — I'm so sorry. I could sit and talk all day, but I do have another meeting that I have to get to. If there's anything else that I can do to assist you guys, please let me know, and good luck with your project, for sure.

**Shravan:** Oh, I'm so sorry. Thank you so much, Tracy. I'd love to send you a short follow-up email with the Google Form — please feel free to submit it so we can process the gift card, because we want to be mindful of your time as well. As I mentioned earlier, we are speaking with a lot of behavioral health practices, and they're bringing up similar issues when it comes to prior authorization, insurance verification, anything related to insurance. So we are actually putting together a demo that we'd love to show you in a week or two from now. You'll hear from me; it'll be very quick. I'll get your feedback on, "Okay, does this solve your problem?" before we go build it. Thank you so much for your input. This is super helpful, and you'll hear back from me very soon.

**Tracy:** Awesome. I'd love to see it. Perfect. Thank you so much. Have a great day.

**Shravan:** Thank you so much, Tracy. Thank you for your time.

---

## Call 2 — September 11, 2026: "Tracy x Shravan Reconnect" (Shravan, Dee × Tracy)

### Key facts at a glance

> **Tracy and the organization**
>
> - Tracy Cosker: COO and "AI strategy and implementation executive" at Harbor Behavioral Health; about 1.5 years in the role. About 20 years of operations and IT experience, mostly higher education / online learning; no healthcare background before this job; started as chief of staff to the owner, who asked her to become COO. Lives and works from Saratoga Springs, NY. Oversees HR, billing, IT, budget planning and finance.
> - Owner: Luke — a serial entrepreneur who has built several AI solutions for the clinical side (records his sessions, uses voice prompts and the Sunwave forms, and the tool assembles the documentation). Has told Tracy, "If you solve this, we're going to sell it."
> - Service: TRP (therapeutic rehabilitation programming), about 3.5–4 hours of programming every day, operating 7 days a week. Not inpatient and not an IOP — "a nice bridge between the two." One CPT code: a bundled code with a decent payout and a low barrier to entry. She knows of at least 3 other providers in the area that "don't do half of the stuff that we do" on compliance; payers are cracking down, and "the good actors are getting beat up because of the bad actors."
> - Scale: 2 locations (Lexington; Hopkinsville in southern Kentucky — very different populations); serves about 7–10 primary care homes; 50–70 clients a day across both locations; clients attend 2–5 days a week.
> - Payers: primarily Medicare/Medicaid — straight Kentucky Medicaid, Medicare, and MCOs (5 MCOs). Harbor cannot charge the patient.
> - Staffing: a third-party billing team ("they're amazing"); the clinical team used to do PA work until it ate into program planning, so Tracy took it over; clinician Heather writes the clinical documents.
> - Tracy is "a Loom and SOP person" and can hand over a decent baseline of process, procedure and policy documentation; some things are still unwritten.
>
> **Money**
>
> - On track for about $3.5 million of revenue this year (she said "profit revenue").
> - Monthly write-off report: roughly 30–35 claims in a slow month; about $10,000/month on a good month, up to $15,000/month — enough for "a new staff member, a new clinician."
> - A year ago the number would have been much higher. When she started they weren't tracking it at all, and she recovered about $86,000 of back claims in her first month.
> - A denied patient attending 5 days a week over a 60-day appeal is "just under $10,000 of revenue" at risk; if the appeal wins it is backdated and recovered, if not it is lost.
> - Recent miss: one patient fell through the cracks and ended up 40 units over (his end date wasn't until November; she hadn't run the unit-usage report in about 3 weeks; he came every day). "Ghost expirations" usually catch four or five patients.
> - This week she found 3 patients with end dates in the last week of September who had only 3–4 units left because they attend 3–4 days a week — renewals not yet started.
>
> **Appeals (the step she would change yesterday)**
>
> - Biggest pain point and least visibility, though "a small portion of our business" and "not the biggest leak of money."
> - Denial reasons keep shifting: fix one reason, get a new one (e.g., "they live in a personal care home"). Her AI, loaded with all payer reference documents, concludes "they're not even following their own rule."
> - There is no online appeal submission for TRP services (portals allow it for claims and some PA types). Appeals are faxed, 50–70 pages; three days later staff call to verify receipt; decisions are supposed to come within 30 days, sometimes 60; sometimes an acknowledgement letter with a date arrives, sometimes nothing.
> - Last week a payer whose determination date had passed said "we don't have that on file," despite a reference number. Missing the submission window means "you're out of luck."
> - Packets must be split into three separate documents (clinical assessments / medical records / cover sheet) or the MCO says "you're missing this" when it's on page 12; some payers require a special form and only say so on the last day of the appeal window.
>
> **Units versus windows (where the money leaks)**
>
> - A PA is approved for a number of units and a time period; no system shows both together. Example: 15 units for Jan 1–31, used up in the first 14 days. The alert she wants: "today this person only has five units left and they still have 12 days on their PA."
> - She currently exports two reports and has Claude merge them, then manually checks for gaps; the unit-usage report is run by hand.
> - Renewals: 13 renewals due between Sep 11 and the end of the month; about 6 documents per renewal; Tracy tells Heather exactly which 3 documents need updating and which are still within their date-range parameters.
> - Insurers "want more and more information to prevent a denial, and they use the lack of information as an excuse."
>
> **Vendors and Sunwave**
>
> - Has done "a lot" of demos: "there just is not anything out there." Got far along with a PA-agent vendor (browser takeover using your log-ins; no APIs needed) but it only pulled documents and requested in Availity; the price was "ridiculous." Other AI PA agents cover one component (request, tracking or appeals); nothing does it all in one place.
> - Sunwave implementation: "Nobody has ever asked us those questions"; other customers "don't track it… they just let it go." Reports are static and separate ("Oh, but they're three separate reports"); the vendor's answer is "export this and work it in Excel." Harbor is working with Sunwave directly to improve their AI components, which Harbor won't use because "it doesn't work."
>
> **Ideal solution (in her words)**
>
> - A dashboard showing her key KPIs plus her workflow for the day; ideally inside Sunwave ("I'm a big one-system person"), but a separate log-in is acceptable. Per-patient view is nice-to-have; the holistic view is what is missing: "74 approvals, 2 that are denied, 3 that are in appeal, 12 that are over here."
> - She has already built a mock-up in a Claude project from her Excel spreadsheet (statuses, rules, guidelines) with an AI chat/search: "What are the next 12 PAs that are coming due in October?"
> - Architecture advice: don't depend on APIs or full integration; sit on top of the EHR's data structure with regular calls to and from it, and let users click from their EHR into a separate PA tool. "There is not a single EHR tool right now that manages the PA process the way it needs to be managed."
>
> **Psyflo's proposal (as presented)**
>
> - About 60 clinics interviewed; 9 of 10 named insurance / the claim lifecycle. Cornell Tech backed (grant). Team includes Dr. Sidari (clinician with insurance experience) and Dr. Dickey (NYU public health professor; value-based care, insurance contracting, Medicaid) [names as transcribed]. Started integrating with EHRs such as Cerner. Everything HIPAA compliant with BAAs.
> - Co-design engagement: about 8 weeks total; something built and ready in about 4–5 weeks; weeks 1–2 learning plus a low-fidelity prototype; a roughly 2-hour design workshop; build 1–3 weeks; implementation with an in-app help feature wired to Psyflo's Slack; a couple of feedback calls in the first two weeks; about 80% of Psyflo's time on it; works around Tracy's availability (email, an hour a week, limited access all fine).
> - Small refundable deposit ("skin in the game"); at the end Tracy can walk away and get it back, or continue at a grandfathered low price as one of 1–2 co-design partners.
> - Scope: start with prior authorization, in phases (visibility dashboard first, then denials/appeals), expanding if capacity allows.
>
> **Next steps agreed**
>
> - Tracy will run it by Luke over the weekend or Monday and reply next week; she is "definitely very interested" and calls it a "real low barrier of entry."
> - Psyflo to send the deck the same day as a pre-read for Luke; likely a follow-up call including Luke; Tracy to share Looms/SOPs; a Sunwave contact may be needed for integration.

### Cleaned transcript

#### [00:46] Greetings and introductions

*(Audio check between Shravan and Dee before Tracy joined is omitted.)*

**Dee:** Hello there.

**Tracy:** Hi. Hello.

**Dee:** How are you? Happy Friday, right?

**Tracy:** Good. Yes, happy Friday. So happy it's Friday.

**Shravan:** Hey, Tracy. It's good to see you again. Thank you so much for hopping on the call. I know we connected last time, and thank you so much for all of the information that you gave us. I wanted to do a quick round robin, since Dee, my research partner, is also on the call — a quick intro, if that's okay.

As I mentioned, Dee and I got connected when we were at Cornell Tech. Dee comes from a public health background, a healthcare and technology background. She leads all the engineering and development on the product that we're working on. But we always wanted to solve for the SMI populations and the clinics that are treating SMI populations: what are some of the issues that they're experiencing, and how can we solve those issues? So essentially, like I mentioned on the previous call, we are doing open discovery interviews with all the IOP clinics in the US. I think we've talked to roughly sixty clinics. Pretty much nine out of ten clinics said the exact same issue: the insurance, the claim lifecycle workflow. That's why, when I started the conversation, I didn't ask specifically about insurance, because I didn't want it to bias the conversation. We wanted to hear what they actually say if you ask about the inherent problem. But insurance has been the number one issue for all of them. Our goal is to essentially synthesize all this research and co-create something, co-design something with a clinic, with a design partner, and hopefully roll that out across all the clinics that have a similar problem. That's our mission, essentially. And being part of Cornell allows us to access funding, capital, the clinical network and things like that, which has been a big help for us. I'll pass it off to Dee to introduce herself.

**Dee:** It's great to meet you, Tracy. I've heard a lot about you. My name is Deanna, but feel free to call me Dee. I am based here in New York, have been for about fifteen years, but I'm originally from KC, if you can't tell — a huge Kansas City fan. I miss the Midwest. I came out to New York to go to NYU. I studied public health; I got my master's of public health, where I focused a lot on social determinants of health, health policy, insurance, all kinds of things. And I realized I really wanted to solve a problem, particularly in mental health. There are a lot of challenges with respect to coverage for mental health, a lot of policies that are impacting that. Of course, there are things like mental health parity now — great, we're making progress. But I really wanted to make strides in that space and didn't know how. So then I went and got another master's from Cornell Tech, where we specifically focused on health technology: health systems, information systems, and how all of them are interacting. Right now they're making people's lives a little harder, but hopefully in the future they might interact to make lives a little bit better, with the goal of improving access to care. The theory is that if you make these systems work a little bit better for providers and the people running these systems, you actually improve access to care. So that's a little bit about me. I lead all of the tech development. Shravan and I both do a lot of insurance research, so that's been really fun. I'm really excited to dive in and tell you more about what we're doing and what we hope to achieve. But I'll pass it off to Tracy.

**Tracy:** Sure. I'm Tracy, and I am currently the COO and the AI strategy and implementation executive for Harbor Behavioral Health. We're based in Lexington, Kentucky, but I actually live and work out of Saratoga Springs, New York — a little bit north of you guys.

**Dee:** I spent some time in Kentucky. Lexington specifically.

**Tracy:** I spent some time down there too, with this job. I've been working with them for about a year and a half now. Prior to that, I have about twenty years of experience in operations and IT, a lot of it in the higher education space, a tech space, mostly online learning. That's where the technology pieces come in and how I've gotten much more involved in technologies, et cetera. I had no background in healthcare when I got this job. I started out as chief of staff for the owner, and he was like, "Would you be our COO?" And I was like, "I don't know anything about insurance. I know nothing about any of this stuff." But I'm definitely the type of person who will learn something. Same thing with AI: I dive in, I experiment, I fail fast, and then I keep moving forward.

I oversee everything from the operational perspective: HR, billing, IT, budget planning, finance, all of that. We provide TRP services, which is therapeutic rehabilitation programming services. It's about three and a half to four hours of programming every day. We are operating seven days a week. We serve, I think, about seven to ten different primary care homes within the area. We have two locations in Kentucky: one is in Lexington, the other is in Hopkinsville, which is in southern Kentucky, so it's a very different type of population across those two areas. We are primarily funded through Medicare, Medicaid benefit coverage, and we work with both straight Kentucky Medicaid, Medicare, as well as MCOs — managed care organizations — as well as direct. We see anywhere from fifty to seventy clients a day across both locations, and they typically will be coming anywhere from two to five days a week to get treatment and services from us. So that's a little bit about who we are, what we do, and who I am.

**Dee:** Amazing. It's great to meet you. I reviewed the notes from your initial meeting with Shravan and had a thousand questions. Now hearing your intro, I have a thousand more, but we definitely won't get to all of those. We put together a short deck that we could show you about who we are and what we're doing. Shravan, if you want to share your screen, you can kick us off.

#### [08:09] Psyflo's deck: mission, team, and what we heard

**Shravan:** A quick intro. Essentially our whole mission has been helping out mental health clinics. But before we figure out what problem we want to solve, we want to co-design something with the actual experts that are seeing the problem every single day. The clinics are the experts in the problem, and we see ourselves as a bunch of healthcare technologists that want to help solve that problem together with the clinic. This is our team: Dee and I started everything and worked on the mission. We also have Dr. Sidari, who's a clinician on our team, to make sure everything we're doing is clinical, and who also has a lot of experience with insurance; and Dr. Dickey, who's a professor of public health at NYU and brings a lot of experience from value-based care, insurance contracting, Medicaid and things like that [names as transcribed]. Our mission has always been serving safety-net behavioral health clinics, and all the problems that you described, Tracy, we kept hearing over and over again — how difficult insurance can be to work with. I don't know if any tech company can do something to actually change how the insurance operates —

**Dee:** Probably not.

**Shravan:** — but maybe we can make that process a little bit easier, so that we can align those incentives and alleviate some of that burden and pressure from the clinics. We're Cornell University backed; we get funding from them, and they also give us access to a lot of the clinician network.

**Dee:** Can you back up really quick, Shravan, just to the last slide, to speak a little bit more to this. The process at Cornell Tech is that they bring together very multidisciplinary folks — some have MBAs, some are in the LL.M. program for law, some are technologists, some are public health advocates like me — and they say, "Okay, we want you to solve any problem. Any problem in the world. It could be anything." We were, I think, one of the only teams that chose a social impact cause, mental health. We were very passionate about it and we've been glued to that ever since we started. And surprisingly, we won this big grant from Cornell — one of the very few — so we're very excited.

But we took a step back and realized, like Shravan said, we didn't really know the problems from the provider side of things. We had a very strong understanding as mental health patients — this is what we're experiencing, these are the challenges. I've been on Medicaid before; these were the challenges. So we knew what it was like for the patients, but we didn't know what it was like for the providers. So we started doing all of these interviews, talking to private practices, safety-net clinics, school-based health centers — you name it, we've probably talked to them — to really identify those problems. The goal was to come out of those interviews with a very clear problem that we wanted to solve for safety-net clinics, and then to identify a design partner where we could work together to actually build that solution. We have done so many hours and rounds of synthesis and qualitative analysis, reviewing transcripts, highlighting everything. And we're hoping, and we think, that your clinic would be a really great fit — one of the couple that we've identified that have this problem that we want to help solve.

What we heard from you — Shravan, you can go to the next slide now — you gave us so much rich information; it was fantastic. We heard a lot about how there are all these issues in the process, from the moment you get the patient's insurance to the moment you're actually getting paid the full amount for care that you delivered. There are gaps in little places in between, and it sounds like all of those gaps are basically draining money from the company. I saw what you mentioned in the notes about your waterfall Excel. I think that was a perfect name for it, because at each stage more money is just leaking and leaking out.

**Tracy:** I try to look at it for when the money's coming in, but yeah. It definitely is.

**Dee:** We've looked at these steps for all of these types of clinics and organizations, and it's interesting whether the problem can be solved from an upstream solution or a downstream solution. Part of it is just about visibility, which is already really difficult: aggregating the data, trying to see it all in one place and understanding where these leaks are in the first place. We've been mapping that out. What I don't want to say is, "Hey, we have the answer to your problem, and this is it," because I'm sure you've heard —

**Tracy:** You'd be very, very rich if you did.

**Dee:** Right. I'm sure you've heard that a thousand times. A lot of technologists will go build something that they think will solve a problem they've never even experienced firsthand, or without talking to someone who experiences it firsthand. Cornell Tech has really taught us: you never want to build *for* people, you want to build *with* them. Where we've really stopped ourselves — and we're very strict about this — is that we're not going to build yet. We're not going to build something for someone and then go show them. So I promise you, in these slides you're not going to see any kind of solution or product, or something that we're trying to sell you. It's an effort to demonstrate that our goal here really is to solve the problem, and to do that we need a really strong understanding of what that is. This is just a high-level map of some of the things that you told us and where we started to map out those steps.

Next slide. This is highlighting where we took a lot of the numbers that you mentioned and mapped out: it seems like there's a portion of claims that are getting denied, some of those are getting appealed, some of those are getting reimbursed. This is why the waterfall terminology is perfect: you're starting with 100% of requests or claims that should be reimbursed, but you're ending with obviously a smaller portion of them actually being paid out.

#### [15:28] Question 1: the one step you would change yesterday — appeals

**Dee:** Before we jump into how our ideal setup would work, or how we'd want to work with a clinic, we did have a few more questions for you. We narrowed our thousand questions to three. The first one: given that there are so many steps in this process, from the moment you collect those insurance details and verify eligibility to the moment you're potentially appealing and maybe getting denied or approved — what is the one step in that full process that, if you could change it yesterday, you would? And you only get one.

**Tracy:** I know. That's what I'm trying to think. I'm like, "Man, just one." There are so many different levers that I would pull to try and figure out what that one would be. I think the biggest pain point is… I want to say appeals, because the visibility on those is so difficult. They get lost all the time. We get told they didn't get their faxes. They get sent to who God knows where, when and how. But that's a small portion of our business. So the operator in me is like, "Eh, that's the biggest pain point," but it's not the biggest leak of money. So I'm weighing it a little bit. Jeez. One step.

**Dee:** And the second question is: where is the money leaking most? So you can separate those if you want.

**Tracy:** Yeah. So I think it would be the appeals process, just because of the fact that it is so driven by random reasons that don't necessarily seem… Every time we get a new reason, we will change our process, change our documentation, update it, and then we'll get a new denial for a completely different reason. Because we've solved that one reason, and now they're like, "Oh, well, now we're going to deny it because they live in a personal care home." So each time we solve one problem, they just come up with another new one.

We've done a lot of work using AI. I've uploaded all of our denial letters and all of our packets that we've sent, as well as a sample set of our approved ones, and said, "Hey, analyze this. What are we missing? Come up with a way to rate how our packets are." And literally, sometimes they're like, "I have no idea why you got a denial on this," because it has everything according to their — I've uploaded all of their reference documents from the providers, all of their rules — and they're like, "They're not even following their own rule. I don't know why they're mentioning this. They don't put that anywhere in their rules." So there's just a lot of complexity to that, and the appeals is just a really challenging step.

#### [18:49] Appeals visibility: faxes, lost packets and submission windows

**Dee:** Is it the manual processes that you would change? Or what part of that appeals process — is it that you don't have enough information to track where it is? Is it that you have to manually pull together the packets? What element of it?

**Tracy:** That's a really good question. I go back to — for the whole thing, it's visibility. That's the biggest pain point. Just knowing. We've put in a lot of manual steps to try and prevent things from falling through the cracks, because that's the biggest obstacle in appeals and even just regular PAs. You've got a couple of systems that are good at tracking, but not one system that tracks all of them. And the appeals has the least amount of visibility. At least for the initial request or a renewal request, most of it I can find in Availity or in the portal. I can see that it's there, and I can run a refresh every day, and it'll pull in, "Yep, this is still on pending status," or, "Oh, this one's finally been decided." But the appeals — you send them to a fax number and you just hope for the best. You can't submit many of the appeals [online]. You can do that for claims, you can do it for some types of prior authorizations in the payer portals, but for TRP services, the ones that we do, they do not have the online appeal submission option. So we have to send them off to a fax number. They're like 50, 60, 70 pages long. We have no idea if they've received them. So now, three days later, I make them call and verify that they've received it, and then we don't always get really good visibility as to when they're going to make their decision. It's supposed to be within 30 days, or sometimes it's within 60 days. It's a little bit fuzzy sometimes, depending on the MCO. Sometimes you'll get a letter from them saying that they received it and giving you a date. Other times you just never hear from them.

And even though we call five days later — last week we got one where we followed up, because the date that they said we'd have a determination by had passed, and they were like, "Oh, I don't see this. We don't have that." And I was like, "We even have a reference number, everything." And they're like, "Oh, we don't have that on file." And if that happens, then we miss our — there's a window. If you don't submit it within a certain timeframe, you can't submit it, and you're out of luck.

So really having the visibility into the status of that appeal process. Submitting it, getting the documentation together, is kind of a pain, but our system right now — we've gotten it to a better place. We've figured out we can't group the whole packet together; we've got to divide it into three separate things, because that's the way they want to see it at the MCO. If we put it all in one, they literally will be like, "You're missing this." And I'm like, "No, it's on page 12." And they're like, "Oh, you need to make that separate." I'm like, "Okay." So there are all these little nuances, things that you have to do in order to get that done.

So it's a pain point, but it's really knowing and being able to say: this is where the appeal is. They've received it. They're making a decision. This is the decision, and it's done. The amount of effort and time that we spend just trying to track that down — following up with phone calls, then finding out, "Oh, we didn't get it," or, "Well, you didn't fill out this special form that you have to fill out with this packet." And they don't tell you that till the last day of the appeal process, and then you have no time to get it done so that it can be part of the appeal.

#### [23:02] Free care during the appeal, and what it costs

**Tracy:** That is really, if there was one piece that I could really fix — and it may not be the biggest financial impact, but it definitely is [an impact] because of our policies. One of the things that we do is, when somebody comes to us and there is a PA that is denied, we will let them continue to come until we get that appeal done. So sometimes we will have somebody who's been attending for free — we're not getting any compensation for those services — for 60 days. It can take up to 60 days. If they approve that appeal, then we can backdate it and recover those. But if they don't, then we lose that revenue. For us, when we have some of these patients who attend five days a week over the course of 60 days, that can be just under $10,000 of revenue sometimes. So it definitely has an impact. Being able to track it, know it's coming, make sure that the packet that we're sending is as strong as possible — that is really a piece that I think would be a huge asset for us.

#### [24:20] Question 2: where the money leaks — units versus windows

**Dee:** And where do you think the biggest money leak is coming from? Would you say it's maybe that denial process, or something else?

**Tracy:** The money leakage would not be the denial process. The money leakage for us right now, because of the way the PA process works for our CPT code specifically — a lot of PAs, it's approved or it's not approved, right? For us, it's approved for only a certain number of units and for only a certain time period. And so you have to monitor not just "this is effective from January 1st to January 31st," but if they got 15 units between January 1st and January 31st, and they came 14 days in the first two weeks, you've got to know that that is coming up before that expiration comes up. And there are no systems that show you both at the same time.

**Dee:** You're toggling.

**Tracy:** Yes, constantly trying to look back and forth between both of them. A lot of systems really struggle with this. I've been able to use Claude, where I take the two exported reports and I ask it to merge them together for me so that I can see it. But again, I have to manually do that, manually track it, manually then go through and say, "Are we missing anything?" Whereas, from my experience designing systems, there should be a way somehow for those to be caught in the back, and then to be presented — ding, ding, ding, today this person only has five units left, and they still have 12 days on their PA. That shouldn't be difficult to manage in a workflow, so that I don't have to do all that brainpower work on the back end.

I think I'm getting Claude to a point — I'm still learning how to really work with Claude Code to get some stuff done, which is beautiful, and it's amazing, and I love diving into new technology, and it's really fun. But not having that — that's where our leakage comes. For example, this week I just identified three patients whose renewal process we hadn't started yet, because their end date isn't until the last week of September. But when I was looking through the reports, I noticed that three of them only had three or four units left. And then when I look at their attendance pattern — because you can't just look at how many units they have left; if it's somebody who only comes once a week, you'll be fine, but if it's somebody whose attendance is three, four days a week, we're not going to be fine. And so we do lose a lot of money with some of those — I call them ghost expirations. It's usually four or five. But I did have one recently that I don't know how, but he fell through the cracks completely, and he ended up being 40 units over. And that was just painful. I was like, "How did we miss it? How did I miss it?" I think it was just because I hadn't actually run the unit usage report in about three weeks, and he came every day. And his expiration date wasn't until November, so it wasn't even on my radar.

#### [28:05] Question 3: sizing the loss

**Dee:** So you kind of answered the third question, which is what your perfect solution would look like. But out of curiosity, if you had to lump together all the revenue that's lost in every single stage — intake, the PAs, the appeals — what would you estimate, very roughly, that is on a monthly basis, or daily, whatever unit?

**Tracy:** I ran it recently. What did I come up with? I looked at all the write-offs I did, because I do a write-off report every month of anything that I have to write off because we're not going to collect it. I think it was close to 30, 35 claims, and that was for what I consider to be a slow month. So thirty to six— [unclear]. About $10,000 a month, I'd say, on a good month, and it can be up to $15,000 a month. And again, we're a small practice, so I know it's not millions of dollars. But we're on track for about $3.5 million of revenue this year [she said "profit revenue"], so that still is pretty substantial. That could cover a new staff member, a new clinician, et cetera. It's definitely not an insignificant amount for us. If you had asked me a year ago, that number would have been much higher. But we've made a lot of changes, implemented new systems. When I started, they weren't even tracking it, and I recovered, I think, $86,000 in the first month of back claims and that kind of stuff, because it was just a nightmare.

**Dee:** Wow. That is huge. That's really helpful. I wanted to get that big picture of what the biggest problems are and what your ideal solution would look like. As I was going through the notes from the last meeting, the solution you described — I was like, "Oh yeah, we could definitely create something like this."

#### [30:11] Psyflo's hypotheses and the co-design proposal

**Dee:** Going to the next slide, Shravan — we can go through this one pretty quickly. We developed our own hypotheses for what a solution might look like, depending on where in the process it's targeting — appeals, prior auth, et cetera. It sounds like visibility is really key, because you clearly have the expertise to know what to do if you have the right information in front of you, but pulling that information together is the challenge.

Next slide, and continue to the next one as well. This is showing what, in our ideal world, based on what we've heard from clinics similar to yours, [we'd build]: a place where they can see, especially for prior authorizations, the status of those prior auths and when renewals are upcoming — but maybe one of the most important things is how that compares to the number of units remaining. Pulling that together in one place and actually getting auto reminders of, "Hey, it's time to renew," or, "Hey, the units are almost up." We think that is maybe an initial place to start. But we also have big visions of how it could evolve into handling appeals, maybe automating renewals — a lot of that information is already stored somewhere in the EHR, for example, where you can auto-generate that process.

What's really interesting about your clinic is that for the other clinics we've talked to that are like yours, there's almost a defeatism: "Okay, this is just what it is. We're going to have to use all of the systems." And I think they're probably writing off the eighty-six thousand dollars per month for claims [sic — Tracy's $86,000 was a one-time recovery]. But you in particular, Tracy, are actually invested in building these alternatives and trying to figure out how to solve the problem. So our goal would be to create something where, for the people like you who are actually out here trying to solve the problem, there is a solution that doesn't require uploading and plugging in these exports. As much as I love technology, you shouldn't have to learn how to code for there to be a solution to this insurance problem. So we could potentially save a lot of time, hopefully save claim denials from happening and lost revenue, but also save the time and effort put into trying to build these things from scratch, because it's a lofty goal.

We think there are a lot of advantages to co-designing a solution. We've done a lot of research into what available solutions or platforms are out there for this, and we haven't really seen many, if any, that focus on two elements. We haven't seen a lot of solutions that focus on safety-net organizations. They target really big hospitals and health systems, and then they're charging two hundred thousand dollars a year or something crazy like that. We're like, "Okay, this isn't a solution for safety-net clinics." Medicaid operates a lot differently than some of the commercial insurances.

**Tracy:** Correct. Commercial plans, yeah.

**Dee:** The other thing we've noticed with some of these quote-unquote "out-of-the-box solutions" is that they're not specific to the Medicaid population and some of the prior authorization processes that exist, nor do they cater to — as you know, Medicaid differs by state; approval rates and denial reasons differ by state, by payer. There are a lot of niche platforms out there solving this particular problem, which is why it was also very interesting to us. And then the other option, which you've experienced, is building it internally, which we imagine is a very challenging process; it requires a lot of time and new learning. I'm sure that while you like learning new technologies, maybe having the solution in front of you could be a little more helpful.

So our role is to co-design the solution with a clinic that fits the perfect archetype for wanting to bring something like this to life. We would work with your clinic to understand as much as we can about how you all operate. It would basically be like having your own consultants available to you twenty-four seven, to learn not just your processes, systems and protocols, but also the payers, which I think is really important — understanding the processes across those five MCOs that you all are working with in Kentucky. Thankfully, I have some health background and studied health policy and insurance. But just because I studied it, sometimes I'm like, "I have no idea what's going on in insurance." It's such a convoluted, complex field that you could have a degree in health policy and administration and still not know why a claim got denied. What we really bring to the table for a partnership like this is the health tech expertise. What I studied at Cornell Tech was all health systems, AI, machine learning — not just how to build algorithms, but how to actually build systems that talk to each other and work smoothly. You've met Shravan and me now, but we have more people on the team that I lead on the engineering side, so we're able to move pretty quickly. Shravan and I are more in the weeds with the problem space, and then I lead and oversee a lot of the tech development. And then we customize that to your clinic.

This is what it would look like. The goal is that we would take as little of your time as possible to make sure we have a mastery of your clinic and how it works. That can take different forms. Calls like this are super helpful — we gather all that information, have our note-taker transcribe it and piece everything together. We've also done shadowing; that's another thing we can commit to. I've spent some time in Kentucky; my boyfriend is from Cincinnati, Ohio, so we will sometimes cross the border and go over to Kentucky. We've done virtual shadowing but also in-person shadowing, where we really just observe to understand where those gaps are.

Then we move on to prototyping: we take all the information gathered from interviews or shadowing and piece together a solution that we think would work. We prototype a low-fidelity version of it and work with you to refine what you like and what you don't like. It could be something as big as, "No, I really need this information from this system to appear here," or as small as, "I don't like the color of this button." We customize that to your needs, and then we build it.

A few things about us that are probably helpful: everything we've built is HIPAA compliant. We're familiar with BAAs, and we have the whole system and legal infrastructure set up to make sure everything we do is compliant. We've all done our HIPAA trainings; that is very typical for us. At the end of it, you would get to decide whether you wanted to keep working with us. We move pretty quickly with this system: learn, build, test, refine, and continue through that refine process until it's what you want.

#### [39:39] Skin in the game: the deposit and grandfathered pricing

**Dee:** The only thing we ask of clinics, other than their time, which we try to use sparingly, is a small deposit. We realized that when a clinic or a partner has skin in the game, they're equally invested.

**Tracy:** You've got to have skin in the game — otherwise you're just going to get put off over and over and over, right?

**Dee:** We were working with a private practice many months ago, maybe last year, when we were still exploring the private practice side of things, and we realized there's no skin in the game, so it's really hard to get them invested and committed to solving this as quickly as we want to solve it. At the end of eight weeks, you could decide, "Okay, this isn't working, and we don't want to use it," and we just give you back the deposit. Or you could decide, "Okay, we do want to keep working with you, and we'd like to use this tool that we've co-created." At which point our strategy is to begin going to other clinics and offering it to them, but for these one or two co-design partners, to lock them into a grandfathered low price. It benefits the clinic, but it also benefits us, so we want to be cognizant of how that partnership evolves, and we want it to really be a partnership more than anything else. I know I did a lot of talking. Shravan, were you going to say something?

#### [41:10] What vendors got wrong, and the "secret sauce"

**Shravan:** I was just going to repeat what Dee said: it benefits us, but it also benefits the design partner. One thing that really resonated with me, Tracy, was in the last call when I asked, "Have you done any demos? Have you looked at any vendors?" and you mentioned this vendor with a browser extension helping you submit. We may have done maybe 20 demos, and they're all —

**Tracy:** Yes, I've done a lot. I've looked at a lot of different potential solutions, and there just is not anything out there. And it's funny — the owner of our organization, he's a serial entrepreneur, and he's like, "Tracy, if you solve this, we're going to sell it, and we're going to blah, blah, blah." And I'm like, "Yeah, well, I just need extra time, because I'm too busy managing the whole process to actually play right now."

**Dee:** That's really funny. But based on the number of clinics we've talked to, it is a problem for a lot of —

**Tracy:** It's huge. Huge.

**Dee:** And no one's really focusing on it.

**Tracy:** No. Or they're focusing on aspects of it. I did get pretty far along with one organization that was an agent for prior authorizations. They were building a prior authorization agent, and it was very interesting, because they were using an AI that can take over your browser and leverage your sign-ons, your log-ins, that kind of stuff, and basically just act as you, so you didn't have to worry about APIs and hooks and all that other kind of stuff. But it was very limited to just getting the documents out of your system and requesting it in Availity. And I was like, that's not really my pain point. If I was at a hospital, a high-volume place where there are tons of PAs going in and out the door and they're all different types of PAs, I could totally see where that would be really helpful. But we are only using one CPT code right now, and that's not my pain point. And the cost that they wanted for that — I was like, "Holy crap. Yeah, no, that seems ridiculous to me." But I was fascinated by how they were going about it. I've seen several different AI-powered agents for prior auths, but again, they're not solving what I consider to be the biggest pain point, which is complete visibility of the entire process. They will cover one component of it — the request, or the tracking, or the appeals — but nothing that does it all in one place.

In my mind, as I was visioning — and I'm probably giving you guys secret sauce, when I could just start my own business, but I don't have grant funding or anything like that — one of the things I was thinking is: if you come up with that solution, the most advantageous thing would be not using APIs, but coming up with a way that you could easily integrate with some of the top EHRs. It can sit on top of — it doesn't have to fully integrate with, but can sit on top of, or do regular calls to and from, the database elements, because all the elements are in there usually. And somebody can very easily just click from their EHR into their PA tool that operates separately from it, so you don't have all of the complexities of full integration. It's just sitting on top of their data structure, but utilizing the tools, technologies, et cetera. Because there is not a single EHR tool right now that manages the PA process the way it needs to be managed. I think that would be such a game changer for so many people and so many clinics around the world. And mental health is definitely one that has a bigger pain point, I think, than your hospitals, et cetera, because a lot of times the people who are trying to navigate this PA process are the clinicians themselves.

#### [45:32] Clinicians carrying the PA load; Heather and the 13 renewals

**Tracy:** I couldn't imagine trying to be a clinician and serve our patients [and do this]. That's why I manage this process separately. When I started, we did have a lot of this being done by the clinical team, and it was just too much. It was eating into the time that they had to plan our programming, et cetera.

**Shravan:** That's interesting you mention that, because at some of the other clinics we spoke with, the clinicians are actually doing it after hours, at midnight or on the weekends. It was pretty fascinating to hear that.

**Tracy:** Yep. Our clinician today — she sent an email this morning, because we had a little bit of a lull, and then all of a sudden I'd sent her, I think, 13 renewals that are going to happen between now and the end of the month. She has to come up with at least, I think it's six documents for each renewal. And she's like, "I'm doing my best." I'm like, "Heather, anything we can do to help you, let us know. I'm sorry I'm the bearer of bad news that you've got to do this, but I can't write these clinical documents. I'm sorry." She's always very thankful, because I stay on top of it so she doesn't have to. I tell her exactly, "These are the only documents we need. You don't even have to think about it. Here are the three documents you've got to update. The others are all good; they're within their date-range parameters. We're good to go." But it's a significant load, and it just keeps getting bigger instead of smaller. Insurance companies want more and more information to prevent a denial, and they use the lack of information as an excuse in so many different ways.

And I understand. Our line of business does have some people who do not really offer the programming. It's an easy CPT code. It's a bundled code with a pretty decent payout, and the barrier to entry is pretty low. We know of at least three others in our area that don't do half of the stuff that we do from a compliance standpoint, et cetera. So I think they're cracking down on that. It's one of those things where the good actors are getting beat up because of the bad actors, but it is what it is.

**Dee:** This is so helpful. Even as you've been speaking, and as I was reviewing the notes from your first call, my technologist brain is all over the place — "Oh, we could do this, we could do that." There are definitely solutions that can be built to the challenge in front of us. I think integration, like you mentioned, is really important. We started working with one or two EHRs, like Cerner, for example, to start integrating there. But that usability is really important, because that's really the challenge you're running into. It's not just visibility, it's usability of all of these disconnected systems.

**Tracy:** Right. Yep.

#### [48:40] Sunwave: "Nobody has ever asked us those questions"

**Dee:** I'd love to open it up if you have any questions for us. There's no rush; you probably need to think about this.

**Tracy:** What? How about tomorrow? Come on now. It's funny that you mention that. My boss and I were talking about it last week. I experienced this when we did the Sunwave implementation as well. I would ask these questions, and I'd be like, "Why isn't this telling me this?" They're like, "Nobody has ever asked us those questions." And I'm like, "Well, what do they do?" And they're like, "They don't track it. They don't look at it. They just let it go." And I'm like, "What? Are you kidding me?" It's like what you had said — it seems like they're just resolved to the fact that, eh, if they approve it, great; if they don't, who cares. And I'm just like, "Oh my gosh, how does that not drive you crazy?" Our owner, my boss, was like, "You're just tenacious. You find something, and you just don't give up until you solve it." And I'm like, "Yeah, that's probably true." Especially when it doesn't make sense to me that it's as hard as it is. There are some things that just genuinely are hard because they're hard, and there's not much you can do about it — like calculus. It's just hard. I can't solve that, and I'm never going to get it in my brain. But a prior authorization process — there are data structures that are the backbone of all of them; you should be able to get a clear picture of what's happening on them. It's really not that complicated a process. It's just that, for whatever reason, the people who build it, like you're saying, have never done the job, so they think they know what you need to see and how, but they don't.

That became very apparent with Sunwave. One of the biggest gaps is that when you see a demo, if you don't know enough about how things are architected and/or the right questions to ask, on the surface it looks like, oh great, they've got this report for a PA, and they've got this report for a PA, and it shows this. And then all of a sudden, when you're trying to put it together in practice, you're like, "Oh, but they're three separate reports. Oh, and I can't manage my workload from it? Oh, it's just a static report." I just laugh, because they hate me and they love me for the same reason — if we work together, you'll probably hate me and love me. They will say things like, "Well, you could just export this and then work it in Excel." And I'm like, "I'm paying you thousands of dollars for a system. I don't want to export it and work on it in Excel. That is not an acceptable solution to me." They're like, "No, that's what everybody else wants to do." And I'm like, "Well, no. I'm paying you so I could export your fancy GUI interface into an Excel spreadsheet? That's not what I'm paying you for."

**Shravan:** That's insane. Especially in the AI era, when everything AI is out there, and you still have to download it and then work through Excel.

**Tracy:** It's crazy. And it pains me — I think I told you, Shravan, that it pains me every day that right now I have been reduced to tracking our stuff in an Excel spreadsheet. It makes me crazy every day. I'm just like, "This is the bane of my existence."

**Dee:** Well, I can tell you that since we started working on this project, we've literally gotten rid of Microsoft Excel entirely, because we've automated so many things for ourselves. So if that gives you a little confidence — it's definitely possible.

#### [52:40] Tracy's questions: who have you worked with; private practice versus safety net

**Tracy:** How many people have you worked with in this capacity so far?

**Dee:** No safety-net clinics specifically, so that's what's going to be new for us. We have worked with a handful of private practices. They are clinics, but they're more outpatient — just outpatient mental health therapy. We realized when we started doing more of these interviews and segmenting the data that private practices doing outpatient mental health have vastly different issues than safety-net organizations providing higher levels of care, and the problems were far more pressing for the safety-net clinics. Private practices deal with clawbacks and appeals, but their patient volume is so much lower that they're like, "Well, I guess we should just write it off, because it's not worth the three hours of inputting to recoup 100 bucks." So the economics aren't as much there for them; it's just not as urgent a problem. I think that's why we also had trouble with buy-in: if you're used to just letting it go, you might as well just keep letting it go.

**Tracy:** Right. Your rate of return on your level of effort isn't as attractive for somebody who's like, "It's not my wheelhouse. It's not what I like doing. You're going to make me do this IT kind of thing when I just want to see my patients, and I might get an extra 400 bucks?" In their brain they're just like, "Yeah, I don't think I really want to spend my time doing that right now." I get it.

**Shravan:** One other thing we realized was that a lot of the private practices had a lot of commercial patients as well. So they just leave it up to them: "If I don't get paid, I'm just going to charge your card," and the patient becomes responsible. Whereas in Medicaid you really can't do that.

**Tracy:** Right. They'll just charge the patient. In organizations like us, we can't charge the patient. We're not allowed to. So we want to get as much as we possibly can out of Medicaid and Medicare, for sure.

#### [54:51] Expectation-setting: not an IOP, one CPT code

**Tracy:** Now, the one question I would have for you — just for your own getting the most out of this kind of partnership — we aren't an intensive inpatient program. We're not an IOP, even. We are kind of a nice bridge, I guess, between the two. So you wouldn't be getting the experience of multiple CPT codes, multiple types of providers, like you would in an IOP or other safety-net programs. I just wanted to make sure that you understood that expectation. It'd probably be a nice build, taking it from just the private practice piece to something that's a little bit higher volume, a little bit more complex, with the prior authorizations. But you're not going to be like, "Okay, we've got to build the MD for the physical, and the psychologist for this, and the group for the group programs." You're not going to have that with us. Again, because I know you're working towards developing a solution and product, I just want to make sure that it would really be valuable to you.

**Dee:** No, I definitely think it would. When you mentioned earlier that you all are billing one CPT code, I was like, "Oh, this is even more perfect," because the more that we can limit variability as we develop, the better it is for developing algorithms that predict certain use cases, or refining a process or automating a process. So it's actually pretty perfect that you're only billing one CPT code. It allows us to really hone in on getting that one process perfect before even looking at sites with a ton of clinicians and a ton of different CPT codes and a ton of variability. That would work perfectly for us, and based on what you said, it's even better.

**Tracy:** Cool. Great. Awesome.

#### [56:56] Next steps: the owner, SOPs, timeframe and time commitment

**Dee:** I know we've got maybe a few minutes left. Any other questions that you have for us, or any thoughts?

**Tracy:** No, it sounds great. I think I'll just run it by the owner. He pretty much would let me make a decision like this; it's just more out of respect for him, understanding I'm going to start this process here and see what happens and how it works. I definitely can get back in touch with you next week. The other thing would just be: I am a Loom and SOP person. That is how I manage my work and my billing team, which is a third-party billing team that I work with — they're amazing. So I would probably have a decent amount of stuff that I could hand over to you that would cover a lot of our process, procedure, policy. There's definitely some things that aren't written still, but it could at least give you a decent baseline. What kind of timeframe — you mentioned eight weeks; is that from start to finish? And what would your level of time commitment from, say, myself and the people doing the work be?

**Dee:** The goal would be that we'd have something built out and ready to go in about four to five weeks, so we'll aim to move pretty quickly. Maybe I'll start by saying our time commitment to this: we're already full time on this project, so probably about 80% of our time will go to just focusing on getting this right. That'll be reviewing SOPs. We don't have to hop on a call every time we have a question about processes; we can always send you an email if that's easier. The least amount of disruption we can create, the better. So we can work around your preferred commitment. If you're like, "Hey, I can only hop on a call for an hour a week," or shadowing isn't a possibility, or we'll have to work with limited access, we can work with that.

For the first week, week and a half — maybe two max — it would just be us learning and putting together a prototype for you to see. We would then have a quote-unquote design workshop, which would probably be about two hours, where it's literally just you rapid-fire telling us, "This won't work. This I don't like. This can't…" We would take all that feedback in, iterate, and when the prototype is in a good place and this is exactly what you want, then we would start building. In that build process, depending on how complex the solution is, it could be as short as a week; it could be maybe two or three. It just depends on how much we put in that final prototype. During the build we would probably need the least amount of time from you; we would literally just focus on getting it built. We may need a little bit of input — if there's a Sunwave contact that you have that we can talk to about integrations or things like that — but we would handle all the building ourselves. Then we'd move into implementing it. Once it's like, "Hey, this is ready, you have access to the tool," we would have a built-in help feature that goes straight to our Slack channel, so anytime you needed us, you could reach us instantaneously. In the first week or two we'd probably have a couple of calls to get your feedback on what's working, what's not, and continue to iterate as we go. Our goal is basically to learn as quickly and as non-intrusively as possible, so that when we get to the build phase we don't have to ask too much. We want to take things off your plate ultimately. That's the goal. We don't want this to be a very time-intensive eight weeks for you.

#### [61:19] The owner's clinical AI work, Sunwave's AI, and scope

**Tracy:** Sure. Great. The only other thing that I may have is you get on the line with our owner again, because he and I have been talking a lot. He's been doing a lot of work — he's developed several AI solutions for the clinical side, where basically we can upload the documents and it will create all the documentation for him. He records his sessions and uses the voice prompts; they have the forms from Sunwave, and it fills it all together and creates it. So he's done a lot of stuff on the clinical side, and then the next step was for me to start doing a lot more on this operational side. I think he might have some additional insights, et cetera, that he might bring to the table as well from some of the work that he's been doing. We're also working with Sunwave directly to improve their AI components, because we won't use it — it doesn't work. So there are probably some additional insights and questions he might have as well for you guys. And would the scope be primarily the prior authorization process? Is that what the scope of this initiative would be?

**Dee:** I will say, because these issues are popping up everywhere throughout the process, we could start with prior authorization. I know prior authorization has a lot of steps, from submitting that initial PA all the way to potentially an appeal. So we could start with whatever steps in that process. And then if, during the process of working together, you're like, "Hey, I think this would actually be really helpful," or another piece of the puzzle, as long as we have the capacity to work on it and get it done for you all, then we'll continue to build. We're always building.

**Tracy:** Yeah, right. Always something new.

**Shravan:** We could always do it in phases. If the visibility dashboard as part of the prior auth is the most important, then we implement that, and then, before we start working on other features, maybe after that we can start the denial and appeal process. So hopefully you can stop using Claude, Excel, and hopefully this system will do everything.

**Tracy:** I love Claude. He's my boyfriend.

**Shravan:** Claude is great. Claude is amazing.

**Dee:** Same. I'm using Claude 24/7.

#### [64:09] The ideal interface: KPIs, the day's workflow, and an AI chat

**Dee:** My last question for you is just, in terms of how you envision the final solution — this just helps me get my gears running a little bit — do you want a separate dashboard or platform where you can see all of this data in one place? Are you wanting more of a browser extension, where when you're in Sunwave you can see something for an individual patient? Both? How do you envision that final solution looking?

**Tracy:** I would be so happy with a dashboard that showed me my key KPIs as well as my workflow for the day. Whether that sits in a separate place or whether it's linked into Sunwave — in Sunwave would be great, because I'm a big one-system person. I think that's just the best user experience for any user. But I wouldn't be upset if I had to log into a different place to see that, to get that visibility and know, "Here are the things I have to do." Being able to see it at a per-patient level would be great, but I can do that if I need to. I can look up the patient and see what their status is; I can get a pretty clear picture. What I can't see is everybody on a holistic view right now: to know we've got 74 approvals, 2 that are denied, 3 that are in appeal, 12 that are over here.

If we do work together, I do have a mock-up of a system that I put together that does this, using a Claude project, using our Excel spreadsheet and telling it, "These are the different statuses and what they mean. Put them here. Here are the rules. Here are the guidelines," et cetera. Something similar to that would be really ideal, because I can search for it based on each individual place, and I added a component of a search engine tool to it so that I could just go in and ask it, "What are the next 12 PAs that are coming due in October?" and it would just spit out the answer. So it's almost like an AI chat within this dashboard thing that I had created. That would really be my ideal solution.

**Dee:** Interface. Okay, perfect. That is great. I hope we do get to work together. I think it'd be really fun to work with you, especially since you're very tech-savvy already; I think it would be a really great partnership.

#### [66:49] Close

**Dee:** I know we've taken over an hour of your time, and it's a Friday. Thank you so much for hopping on with us. It was really great meeting you. If you do have any other questions or follow-up for us — like I said, we're working 24/7. We work on the weekends. We work holidays.

**Tracy:** Me too. Same here. We're the same way.

**Dee:** So feel free to email us if you have any questions or follow-up, and then we'll plan to check in sometime next week.

**Tracy:** Yep. I'll follow up with Luke. I'll probably get some time with him either over the weekend or Monday. We've got another meeting on Monday where we have to go over some things, so I'll probably just give him an update on this on Monday, and then I'll reach out and let you know about next steps. I'm definitely very interested in it — real low barrier of entry, and I think there could definitely be some really cool synergies. It's just a matter of making sure that he's 100% on board too, and we'll go from there.

**Dee:** Awesome. And if there's anything you need from us to help facilitate the conversation, we can send you the deck that we walked through, or anything else.

**Tracy:** The deck would be great. That would be really helpful, because then he can take a look at that too. I can send that to him as a pre-read along with my notes, questions and thoughts, and then we can have a good discussion, and hopefully we can move this forward pretty quickly.

**Dee:** That sounds great. Thank you so much, Tracy. It was lovely meeting you. Really excited to hopefully move forward. We'll look out for your email, and we'll send over the deck today.

**Tracy:** Perfect. Thank you so much, guys. Have a great weekend.

**Shravan:** Thank you, Tracy. Thank you so much.

---

## Verbatim quotes worth reusing

All quotes are Tracy's own words as recorded. Only "um"/"uh"-type filler and stutters were dropped; an ellipsis marks where words were skipped. Call 1 has no timestamps, so the section name is given instead.

1. "There just doesn't seem to be the best rhyme or reason on why one person gets approved and another one doesn't." — Call 1, *Why prior auth became the problem*
2. "Even the AI is like, 'I don't understand why this one was denied.'" — Call 1, *Why prior auth became the problem*
3. "The EHR systems just don't seem to be set up for the types of authorizations that we do. They're more set up for, like, an authorization for an MRI where it's just a yes or a no." — Call 1, *Staffing cost and the 3–7 systems problem*
4. "The only thing that we have been able to find that can keep track of all the moving parts well is an Excel spreadsheet." — Call 1, *Denials, appeals and the clinician burden*
5. "That's like the smallest part of my problem. The biggest part of the problem is … knowing where each one is at in the process." — Call 1, *Building her own tracking tool* (on submission tools)
6. "A lot of the systems just assume it's a one-to-one relationship." — Call 1, *Building her own tracking tool*
7. "We'll ask for 60 units, but they'll only give us 30, and they don't give us a reason why." — Call 1, *Building her own tracking tool*
8. "You can see disparate pieces of it here and here, but seeing it and understanding the downstream impact of that is what's incredibly challenging." — Call 1, *Building her own tracking tool*
9. "My biggest problem is the approval process, and … I have not found anything out in the market right now that helps with that part of the approval process." — Call 1, *What vendors got wrong*
10. "The billing team that we have, they're like $12 an hour … versus one of my clinicians who's $90 an hour and her having to spend 3 or 4 hours on forms. That's a much bigger return on my investment there." — Call 1, *What vendors got wrong*
11. "You're still choosing. You're the one who's doing it all. It's just taking all that documentation piece away from you." — Call 1, *What vendors got wrong* (how she won over clinicians)
12. "The operator in me is like, 'Eh, that's the biggest pain point,' but it's not the biggest leak of money." — Call 2, [16:51] (on appeals)
13. "Every time we get a new reason, we will change our process, change our documentation, update it, and then we'll get a new denial for a completely different reason." — Call 2, [17:42]
14. "The appeals, you send them to a fax number, and you just hope for the best." — Call 2, [20:09]
15. "They literally will be like, 'You're missing this.' And I'm like, 'No, it's on page 12.'" — Call 2, [22:09]
16. "Ding, ding, ding, today this person only has five units left, and they still have 12 days on their PA." — Call 2, [26:00]
17. "We do lose a lot of money with some of those — I call them ghost expirations." — Call 2, [27:13]
18. "When I started, they weren't even tracking it, and I recovered, I think, $86,000 in the first month of back claims." — Call 2, [29:33]
19. "They're not solving what I consider to be the biggest pain point, which is the complete visibility of the entire process." — Call 2, [43:33] (on AI prior-auth agents)
20. "There is not a single EHR tool right now that manages PA process the way it needs to be managed." — Call 2, [45:01]
21. "Insurance companies want more and more information to prevent a denial, and they use the lack of information as an excuse in so many different ways." — Call 2, [47:03]
22. "'Nobody has ever asked us those questions.' … 'They don't track it. They don't look at it. They just let it go.'" — Call 2, [49:11] (quoting Sunwave during implementation)
23. "It pains me every day that right now I have been reduced to tracking our stuff in an Excel spreadsheet. … This is like the bane of my existence." — Call 2, [52:05]
24. "I would be so happy with a dashboard that showed me my key KPIs as well as my workflow for the day." — Call 2, [64:35]
25. "What I can't see is everybody on a holistic view right now, to know we've got 74 approvals, 2 that are denied, 3 that are in appeal, 12 that are over here." — Call 2, [65:27]

---

## Open questions Tracy left us

**Questions she asked us directly**

1. "How many people have you worked with in this capacity so far?" — Call 2, [52:40]. Answered by Dee: no safety-net clinics yet, a handful of outpatient private practices.
2. Would the partnership be valuable to us given that Harbor is not an IOP or inpatient program, bills a single CPT code and has one provider type? — Call 2, [54:51]. Answered by Dee: yes, lower variability is a plus.
3. "What kind of timeframe — you mentioned eight weeks; is that from start to finish? And what would your level of time commitment from, say, myself and the people doing the work be?" — Call 2, [57:59]. Answered by Dee (4–5 weeks to something built; ~2-hour design workshop; a couple of calls; email otherwise), but we never named a specific number of hours for Tracy or her billing team.
4. "Would the scope be primarily the prior authorization process? Is that what the scope of this initiative would be?" — Call 2, [62:41]. Answered: start with prior auth, in phases (visibility dashboard first, then denials/appeals); expand if capacity allows.
5. Whether we can get on a call with the owner, Luke, who has his own clinical-side AI tools and "additional insights and questions" — Call 2, [61:19]. Pending her Monday conversation with him; we promised the deck the same day as a pre-read.

**Things she said she does not know or cannot see today**

6. Why packets that meet every stated criterion are denied. Her AI, loaded with all the MCOs' reference documents, denial letters and approved packets, "sometimes" says "I have no idea why you got a denial on this" and "they're not even following their own rule." (Both calls.)
7. Why partial approvals happen: "We'll ask for 60 units, but they'll only give us 30, and they don't give us a reason why." She also does not currently know which payers have changed behavior or when ("are we getting more denials from this payer? What's going on? What's changed?"), because tools overwrite history. (Call 1.)
8. Whether a faxed appeal has been received and when a decision will come: "supposed to be within 30 days, or sometimes it's within 60 days … fuzzy depending on the MCO." Last week a payer with a reference number said "we don't have that on file." (Call 2, [20:50]–[21:28].)
9. How the patient who ended up 40 units over slipped through: "I don't know how, but he fell through the cracks completely." Her own diagnosis: the unit-usage report hadn't been run in ~3 weeks and his end date (November) wasn't on her radar. (Call 2, [27:29].)
10. Whether the API route will work at all: "I'm hoping that the API connections will be helpful" (Availity, Sunwave, MCO portals); "getting them all to talk properly to one another … it's a nightmare." (Call 1.) On the second call she recommended *not* relying on APIs and instead sitting on top of the EHR's data structure.
11. The name of the browser-based PA-agent vendor she evaluated ("I forget the name of it … I don't have it right off the top of my head") and the price they quoted (only that it was "ridiculous"). (Call 1; Call 2, [43:17].)
12. She is "still learning how to really work with Claude Code," and her write-back automation "ties up somebody's computer" for 15–20 minutes; moving it to Mac Minis / own servers is in progress, not done. (Call 1; Call 2, [26:16].)

**Loose ends for us to close**

13. Reconcile the approval funnel: ~70% first-time approval, ~50% of denials overturned at peer-to-peer, ~15% going to written appeal, ~85% overall approval "after either a peer-to-peer or an appeal." Confirm whether the 15% is of all clients or of denials, and what share of written appeals succeed.
14. Two numbers were unclear on the recording: the monthly write-off count ("30, 35 claims … so thirty to six—") and "$3.5 million of profit revenue" (gross revenue vs. profit).
15. Which of the 5 MCOs is not on Availity, which payer requires the client-signed authorization form, and which requires appeals by email vs. fax vs. portal — she described the variety but named no payers.
16. Whether she will share the artifacts she offered or mentioned: her Looms and SOPs, the Excel tracker (≈5 tabs), the cover-sheet template, the Claude-project dashboard mock-up with the "next 12 PAs coming due" search, and the waterfall report.
17. Whether a Sunwave contact exists for integration questions (Dee asked; not answered), and what Sunwave's form-export and reporting APIs actually expose.
18. Follow-ups we owe her: the Google Form / gift card from Call 1; the demo Shravan promised "in a week or two" on Call 1; the deck (promised same day on Call 2); a check-in the week of September 14.
