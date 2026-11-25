## 34 · Additional info request · Oct 29 (`InfoRequest.dc.html`)

HOW THE DATA GETS IN · Additional info

Captured: the payer's questions arrive on Availity (the extension reads them when a staff member opens the case) or by fax (Sfax, read by OCR). The 24-hour clock starts when they are read; the 24 hours is Harvest's practice, not a verified Medicaid rule. Left column: the questions as the payer wrote them.

Flows: Psyflo pairs each question with the request already sent, the last 30 days of notes and the school incident log, and drafts one answer per question. Every sentence carries a numbered source chip (hover it for the source). Nothing is added that was not asked. Edit as text replaces the drafted answers with your own wording (chips drop from an edited reply). A question with no dated source is left for the clinician and Send stays off until it is answered.

Populates: Open Availity and send opens the mock Availity page in the clinician's own login and copies the reply; the extension reads the confirmation and the request moves to Submitted, with the decision clock restarting. Send by fax goes through Sfax instead. A person presses send; Psyflo never does. Everything on K.T. is sample data.

## 35 · Partial approval and denial · Oct 29 (`Partials.dc.html`)

HOW THE DATA GETS IN · Partial approval

Captured: the decision on a partial approval (asked 150, offered 110), with who and when. The reason the payer gave is sample data; the ? shows what worked last time for that reason, from the payer history.

Flows: three choices. Accept 110 and spread them to the current end date (Psyflo shows units a week). Accept, use them and discharge on the day the units run out, then a new initial (36). Request P2P (38): the date is entered when the payer calls to agree a time. The first two are internal: nothing goes to the payer, Psyflo only logs the choice on the request. "Last time with <payer>" reads requested, offered, counter and awarded from the payer history.

Populates: the request's stage and activity log on Authorizations; the early discharge plan; the P2P call notes. A denial (E.C.) shows on the same route as one line, "Denied · appeal window 51 days", with the guardian letter (39). The "Why insurers say no" table is no longer here: the reasons stay under Payer rules and the checks run in the SRA panel's pre-submission list.

## 36 · Early discharge · Oct 29 (`EarlyDischarge.dc.html`)

HOW THE DATA GETS IN · Early discharge

Captured: the decision to discharge, and the planned dates.

Flows: three dates from the units. Units run out = units left at 3 units a school day (Monday to Friday, no holiday calendar) counted from the authorization start. Discharge = the day they run out. New request earliest = the later of 30 days after acceptance (clocks.restart_days, one config value) and the first school day after discharge. The dates are computed from the data, so they agree with each other and with the units; Partial approval shows the same discharge date.

Populates: Set this plan writes the plan on the request and three reminders for the clinician (discharge summary, discharge in Lauris, the new initial). Open question: whether the 30 days count from acceptance (the demo brief) or from discharge (the design prompt's Jan 17); it is one line in `unitPlan`.

## 38 · P2P call notes · Oct 29 (`PeerBrief.dc.html`)

HOW THE DATA GETS IN · P2P call notes

Captured: nothing new. The call date is entered by staff after the payer calls to agree a time (outside Psyflo); Enter date shows while the request is at P2P requested.

Flows: Opening and Points come from the submitted request and the notes, with dated counts for the last 30 days; Ask from the units asked and awarded; Questions to expect from the denial-reason table; Evidence lists what can be sent. Units left on the call date come from the countdown. Assembled in advance; nothing is generated during the call.

Populates: Print saves the notes as a PDF on the request. Record is optional: put the call on speaker, confirm everyone agrees, and the browser's speech-to-text writes a transcript (or type notes); it is kept on the request and pre-fills the outcome note. Log outcome moves the request: awaiting decision keeps it waiting, approved or partial makes it Authorized with the units, denied opens the guardian-led appeal window.

## 39 · Appeal letter · guardian (phone) · Oct 29 (`AppealLetter.dc.html`)

HOW THE DATA GETS IN · Appeal letter

Captured: the guardian's wording and signature, on the phone, in English or Spanish.

Flows: Psyflo drafts the letter from the denial and the record. The guardian reads it, can change the wording and signs with a finger. The appeal is theirs; Psyflo never signs.

Populates: the request moves to Appeal sent and the signed letter is saved as a PDF on it. By payer channel, Harvest then faxes it through Sfax or a clinician uploads it in the payer's portal.
