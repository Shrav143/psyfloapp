import type { FieldDef, ModuleId, ModuleSchema, SectionDef } from "../types";

/* Authored forms for the community, coordinated specialty care (CSC) and ABA modules. Every field is documentation: what a clinician learned, wrote or
   chose. No form reproduces a licensed instrument, applies a criterion or a threshold, or invents a payer requirement. CPST and CSC are draft service
   descriptions and say so; the ABA and community forms are demo configurations. The CANS and Level of Need modules have their own renderers (cans/). */

type Extra = Pick<FieldDef, "hint" | "required">;
const R: Extra = { required: true };
const text = (key: string, label: string, evidence: string[], extra: Extra = {}): FieldDef => ({ key, label, kind: "text", evidence, ...extra });
const long = (key: string, label: string, evidence: string[], extra: Extra = {}): FieldDef => ({ key, label, kind: "long", evidence, ...extra });
const date = (key: string, label: string, evidence: string[], extra: Extra = {}): FieldDef => ({ key, label, kind: "date", evidence, ...extra });
const num = (key: string, label: string, evidence: string[], extra: Extra = {}): FieldDef => ({ key, label, kind: "number", evidence, ...extra });
const pick = (key: string, label: string, options: string[], evidence: string[], extra: Extra = {}): FieldDef => ({ key, label, kind: "select", options, evidence, ...extra });
const many = (key: string, label: string, options: string[], evidence: string[], extra: Extra = {}): FieldDef => ({ key, label, kind: "multi", options, evidence, ...extra });
const sec = (id: string, label: string, fields: FieldDef[], hint?: string): SectionDef => ({ id, label, fields, ...(hint ? { hint } : {}) });

const DEMO = "Demo configuration. Documentation fields only; no program or payer criteria are applied.";
const CSC_DRAFT = "Draft service description (CSC). Documentation fields only; eligibility criteria are not verified.";
const CONSENT = ["On file", "Requested", "Declined", "Not yet asked"];
const LANGUAGES = ["English", "Spanish", "Arabic", "Vietnamese", "Korean", "Amharic", "Other"];
const WILLING = ["Yes", "Yes, with scheduling help", "Unsure", "Declined", "Not yet asked"];
const CAREGIVER_BARRIERS = ["Work hours", "Childcare for other children", "Transportation", "Language", "Health", "Other"];

export const COMMUNITY_SCHEMAS: Partial<Record<ModuleId, ModuleSchema>> = {
  /* ------------------------------------------------------------------ community services */
  "functional-needs": {
    sections: [
      sec("needs", "Areas of need", [
        long("functionalNeeds.summary", "What the person needs help with, in their own words", ["needs help", "asks for help", "wants help", "help with", "support with", "asking for"], R),
        many("functionalNeeds.areas", "Areas where support is needed", ["Managing symptoms", "Medication routine", "Health care appointments", "Daily routine and self-care", "Money and benefits", "Transportation", "Social connections", "Work or school", "Communication with providers"], ["needs help", "support with", "difficulty with", "assistance with", "reminders"], R),
        long("functionalNeeds.impact", "How symptoms affect daily activities", ["unable to", "difficulty", "struggles", "interferes", "impairment", "daily activities", "daily living"], R),
        pick("functionalNeeds.selfCare", "Self-care and daily routine", ["Manages independently", "Needs reminders", "Needs hands-on help", "Not documented"], ["hygiene", "self-care", "meals", "routine", "independent"]),
        text("functionalNeeds.preferences", "How the person prefers to get support", ["prefers", "preference", "prefer", "in person", "telehealth", "after-school"]),
      ], DEMO),
      sec("current", "Current help and barriers", [
        long("functionalNeeds.currentSupport", "Help the person gets now", ["currently receives", "receives", "case manager", "family helps", "mhss", "skill-building", "current supports"]),
        long("functionalNeeds.gaps", "Help that is missing", ["no support", "unmet", "waitlist", "lacks", "no ride", "no current", "needs a plan"]),
        many("functionalNeeds.barriers", "Barriers to getting help", ["Transportation", "Phone or internet access", "Language or interpreter", "Cost or coverage", "Trust or past experience", "Schedule conflicts", "Memory or concentration", "Other"], ["barrier", "transportation", "no phone", "interpreter", "lost his ride", "afraid"]),
      ]),
      sec("strengths", "Strengths and goals", [
        long("functionalNeeds.strengths", "Strengths and what has worked", ["strength", "motivated", "enjoys", "good at", "stable for", "gets on well", "helped"]),
        long("functionalNeeds.goals", "The person's own goals", ["goal", "goals", "wants to", "hopes to", "would like to", "return to"], R),
        text("functionalNeeds.priority", "First priority for support", ["priority", "most important", "top concern", "main concern"]),
      ]),
    ],
  },

  "community-living": {
    sections: [
      sec("housing", "Housing and living situation", [
        pick("communityLiving.housing", "Current housing", ["Own or family home", "Rental", "Supported housing", "Group home", "Shelter", "Staying temporarily with others", "No stable housing", "Other"], ["lives in", "lives alone", "apartment", "housing", "shelter", "homeless", "lives with"], R),
        pick("communityLiving.stability", "Housing stability", ["Stable", "At risk of losing housing", "Unstable", "Not documented"], ["eviction", "lease", "behind on rent", "keep his apartment", "at risk of losing"]),
        text("communityLiving.livesWith", "Lives with", ["lives with", "roommate", "spouse", "partner", "alone"]),
        long("communityLiving.housingConcerns", "Housing or access concerns", ["unsafe", "no heat", "accessibility", "landlord", "behind on rent", "unpaid rent", "eviction"]),
      ], DEMO),
      sec("daily", "Daily living and participation", [
        many("communityLiving.skills", "Daily living skills that need support", ["Meals and cooking", "Cleaning and laundry", "Shopping", "Budgeting", "Using transportation", "Using a phone", "Keeping appointments", "Personal care"], ["budgeting", "cooking", "cleaning", "grocery", "bus", "skills", "daily living"], R),
        long("communityLiving.participation", "Community places and activities the person uses", ["community", "church", "gym", "library", "volunteer", "clubhouse", "grocery store"], R),
        pick("communityLiving.work", "Work or school status", ["Employed", "Looking for work", "Volunteering", "In school", "Not working", "Not documented"], ["works part time", "employed", "job", "unemployed", "student", "full-time work"]),
        pick("communityLiving.income", "Main source of income", ["Wages", "Disability benefits", "Family support", "Public assistance", "None", "Not documented"], ["income", "ssi", "ssdi", "benefits", "wages", "paycheck"]),
      ]),
      sec("natural", "Natural supports", [
        long("communityLiving.supports", "People and groups who support the person", ["friend", "family", "sister", "neighbor", "peer", "church", "supportive"], R),
        pick("communityLiving.contact", "Contact with supports", ["Daily", "Weekly", "Less than weekly", "None", "Not documented"], ["talks to", "sees", "visits", "weekly", "daily"]),
        long("communityLiving.risks", "Community living risks noted in the records", ["eviction", "isolated", "lonely", "unsafe", "behind on rent", "lease"]),
      ]),
    ],
  },

  "school-functioning": {
    sections: [
      sec("school", "School", [
        text("schoolFunctioning.school", "School and grade", ["school", "grade", "middle school", "high school", "elementary", "student"]),
        pick("schoolFunctioning.status", "Current school status", ["Attending in person", "Attending part time", "Virtual or homebound", "Not attending", "Not enrolled", "Not documented"], ["attending", "missed", "absent", "not attending", "suspended", "homebound"], R),
        pick("schoolFunctioning.attendance", "Attendance", ["Regular", "Some missed days", "Frequent absences", "Not attending", "Not documented"], ["attendance", "missed", "absent", "tardy", "leaves class"]),
        text("schoolFunctioning.absences", "Days missed this school year, as reported", ["days missed", "missed school", "missed", "absences", "absent", "school days"]),
      ], DEMO),
      sec("performance", "Learning and behavior at school", [
        long("schoolFunctioning.academics", "Grades and learning, as reported by the school or family", ["grades", "falling grades", "failing", "academic", "homework", "classes"], R),
        long("schoolFunctioning.behavior", "Behavior at school", ["conflict", "removed from class", "leaves class", "detention", "suspension", "sleeping in class", "behavior", "tearful"], R),
        long("schoolFunctioning.peers", "Peer relationships", ["peers", "friends", "bullied", "conflicts", "isolated"]),
        long("schoolFunctioning.strengths", "Strengths and what helps at school", ["art teacher", "enjoys", "strength", "good at", "gets on well"]),
      ]),
      sec("supports", "Supports and who knows the student", [
        many("schoolFunctioning.supports", "Supports in place", ["IEP", "504 plan", "Behavior plan", "School counseling", "Tutoring", "Other", "None known"], ["iep", "504", "behavior plan", "school counselor", "tutoring", "accommodations"], R),
        text("schoolFunctioning.planDetail", "Plan details (type, date, who reviews it)", ["504 plan", "iep", "plan for", "annual review", "accommodations"]),
        text("schoolFunctioning.staff", "School staff who know the student best (name and role)", ["school counselor", "art teacher", "case manager", "school psychologist", "social worker", "principal"]),
        long("schoolFunctioning.concerns", "Concerns the school has raised", ["concern", "asks for", "school asks", "we are asking", "requests"]),
      ]),
    ],
  },

  "family-community": {
    sections: [
      sec("household", "Household", [
        text("familyCommunity.livesWith", "Lives with (names and relationships)", ["lives with", "mother", "father", "grandmother", "foster", "stepfather"], R),
        pick("familyCommunity.arrangement", "Living arrangement", ["Two caregivers", "One caregiver", "Relative or kinship caregiver", "Foster care", "Shared custody", "Other"], ["custody", "foster", "kinship", "single parent", "joint custody"], R),
        text("familyCommunity.siblings", "Siblings and others in the home", ["sibling", "brother", "sister", "cousin"]),
        text("familyCommunity.language", "Language used at home", ["language at home", "spanish", "english", "interpreter", "bilingual"]),
      ], DEMO),
      sec("family", "Strengths and stressors", [
        long("familyCommunity.strengths", "Family strengths", ["supportive", "close", "involved", "strength", "engaged"], R),
        long("familyCommunity.stressors", "Family stressors", ["stress", "job loss", "financial", "family moved", "illness", "divorce", "conflict"], R),
        long("familyCommunity.history", "Family history relevant to care, as the family shared it", ["family history", "runs in the family", "mother has", "father has"]),
        many("familyCommunity.agencies", "Agencies involved with the family", ["Child welfare", "Juvenile justice or courts", "School system", "Primary care", "Other", "None known"], ["child protective", "dss", "probation", "court", "juvenile", "cps"]),
      ]),
      sec("community", "Community connections", [
        long("familyCommunity.connections", "Friends, activities and community connections", ["friends", "sports", "sports team", "church", "club", "scouts", "art"]),
        text("familyCommunity.culture", "Cultural, language or faith considerations the family wants included", ["culture", "cultural", "faith", "religion", "traditions"]),
        many("familyCommunity.resources", "Community resources the family uses", ["Food assistance", "Housing assistance", "Faith community", "Youth programs", "Mentoring", "Transportation help", "None known"], ["food pantry", "snap", "housing assistance", "youth program", "mentor", "church"]),
      ]),
    ],
  },

  "caregiver-coordination": {
    sections: [
      sec("caregiver", "Caregiver and consent", [
        text("caregiverCoordination.name", "Caregiver or legal guardian", ["guardian:", "legal guardian", "mother", "father", "parent contact"], R),
        pick("caregiverCoordination.relationship", "Relationship to the young person", ["Parent", "Legal guardian", "Grandparent", "Foster parent", "Kinship caregiver", "Other"], ["mother", "father", "grandmother", "foster", "guardian", "aunt"]),
        pick("caregiverCoordination.authority", "Authority to consent for the young person", ["Documents on file", "Requested", "Needs review", "Not documented"], ["legal guardian", "custody", "court order", "guardianship", "power of attorney"], R),
        pick("caregiverCoordination.consent", "Consent for this service", CONSENT, ["consent", "signed", "not yet signed", "permission", "consent to treat"], R),
        pick("caregiverCoordination.release", "Release to share information with other providers", CONSENT, ["release", "authorization to share", "release of information", "not yet signed"]),
        text("caregiverCoordination.contact", "Best way to reach the caregiver", ["555-01", "phone", "email", "best way to reach"]),
        pick("caregiverCoordination.language", "Language for communication", LANGUAGES, ["language", "interpreter", "spanish", "prefers"]),
      ], "Demo configuration. Consent and guardian rules are not verified. Organization protocol, not legal advice."),
      sec("participation", "Participation and needs", [
        long("caregiverCoordination.role", "Caregiver's role in care", ["participate", "attend sessions", "involved", "agrees to", "will take part", "family sessions"], R),
        pick("caregiverCoordination.willing", "Willingness to take part", WILLING, ["willing", "agrees", "declined", "unsure", "wants to be involved"]),
        many("caregiverCoordination.barriers", "Barriers to taking part", CAREGIVER_BARRIERS, ["works", "work schedule", "no car", "childcare", "interpreter", "transportation"]),
        long("caregiverCoordination.needs", "What the caregiver needs", ["support group", "respite", "parent training", "caregiver support", "help for the family"]),
      ]),
    ],
  },

  "school-family": {
    sections: [
      sec("contacts", "Contacts and releases", [
        text("schoolFamily.contact", "School contact (name and role)", ["school counselor", "principal", "social worker", "school contact", "referred by"], R),
        text("schoolFamily.contactInfo", "School contact phone or email", ["school phone", "school email", "counselor phone", "counselor email", "main office"]),
        pick("schoolFamily.release", "Release to share information with the school", CONSENT, ["release", "school records", "not yet signed", "authorization to share", "release of school records"], R),
        many("schoolFamily.releaseCovers", "What the release covers", ["School records", "Attendance and grades", "Treatment updates", "Scheduling", "Crisis contact", "Other"], ["records", "attendance", "grades", "updates", "covers"]),
        date("schoolFamily.releaseDate", "Release date, if on file", ["signed on", "release date", "signed", "release dated"]),
        text("schoolFamily.familyContact", "Family contact for school coordination", ["guardian", "mother", "parent", "phone", "555-01"]),
      ], "Demo configuration. A release needs a person's approval and a consent on file. Organization protocol, not legal advice."),
      sec("plan", "Coordination plan", [
        many("schoolFamily.methods", "How the school and family will be kept informed", ["Phone call", "Secure message", "Meeting at school", "Shared written plan", "Video call"], ["phone call", "meeting", "email", "check in", "communicate"], R),
        text("schoolFamily.cadence", "How often", ["weekly", "monthly", "each term", "check-in", "as needed"]),
        text("schoolFamily.owner", "Who coordinates", ["coordinator", "point person", "case manager", "responsible"], R),
        long("schoolFamily.shared", "What will be shared, and what will not", ["share", "shared", "confidential", "sharing"]),
        date("schoolFamily.firstContact", "First planned contact", ["first meeting", "planned for", "scheduled", "kickoff"]),
      ]),
    ],
  },

  "cpst-review": {
    sections: [
      sec("request", "Service request", [
        pick("cpst.review.service", "CPST service requested", ["CPST: Adult, Community", "CPST: Youth, Community", "CPST: Youth, School Setting", "Other, explain in the rationale"], ["cpst", "community psychiatric support", "school setting", "youth", "adult"]),
        many("cpst.review.services", "Areas of support requested", ["Symptom management", "Daily living skills", "Medication routine", "Linking to other services", "Crisis planning", "Family or caregiver support", "School or work support", "Community participation"], ["skill building", "skill-building", "care coordination", "support with", "medication routine", "community support"], R),
        long("cpst.review.goals", "Goals", ["goal", "goals", "wants to", "hopes to", "would like to", "return to"], R),
        text("cpst.review.frequency", "Frequency requested by the clinician", ["requested frequency", "sessions per week", "requesting weekly", "times per week requested"], { required: true, hint: "As chosen by the clinician. Psyflo applies no limit." }),
        text("cpst.review.duration", "Duration requested by the clinician", ["requested duration", "requested period", "months requested", "requested through"]),
        date("cpst.review.start", "Requested start date", ["start date", "starting", "july 1", "begin services"]),
      ], "Draft service description. Payer requirement not yet verified."),
      sec("rationale", "Rationale and delivery", [
        long("cpst.review.rationale", "Why CPST fits, in the clinician's words", ["retires", "recommend", "referred for", "asking for", "reason for referral", "community support", "needs help"], { required: true, hint: "Clinical reasoning only. No payer criteria are applied here." }),
        text("cpst.review.deliveredBy", "Who delivers (organization and staff role)", ["delivered by", "provider", "qualified mental health professional", "skill-building provider", "current provider", "community services board"], R),
        text("cpst.review.credentials", "Staff credentials, as documented", ["credential", "lcsw", "qmhp", "licensed", "certified"]),
        text("cpst.review.supervisor", "Supervising clinician", ["supervisor", "supervising", "clinical director", "reviewed by"]),
        many("cpst.review.settings", "Where it is delivered", ["Home", "Community", "School", "Clinic", "Telehealth"], ["at home", "in the community", "at school", "telehealth", "clinic"]),
      ]),
      sec("school", "School setting (youth)", [
        text("cpst.school.contact", "School contact for this service (name and role)", ["school counselor", "principal", "school social worker", "school contact", "referred by"]),
        pick("cpst.school.release", "School release for this service", CONSENT, ["release", "school records", "not yet signed", "authorization to share"]),
        text("cpst.school.plan", "IEP or 504 reference (type and date)", ["504 plan", "504", "iep", "accommodations", "education plan"]),
        text("cpst.school.delivery", "Where and when at school it would be delivered", ["during school", "after school", "lunch period", "class period", "school day"]),
      ], "For CPST: Youth, School Setting. Leave empty for other CPST."),
      sec("open", "Outstanding", [
        long("cpst.review.outstanding", "Documents or information still needed", ["not yet signed", "missing", "still needed", "pending", "outstanding", "awaiting"]),
        text("cpst.review.owner", "Who follows up", ["follow up", "assigned to", "responsible", "owner"]),
        date("cpst.review.due", "Follow-up date", ["deadline", "due on", "no later than", "before june"]),
      ]),
    ],
  },

  /* ------------------------------------------------------------------ coordinated specialty care */
  "psychosis-course": {
    sections: [
      sec("onset", "Onset and course", [
        text("psychosisCourse.onset", "When symptoms began, as documented", ["onset", "symptoms began", "first noticed", "weeks of", "began", "months of"], R),
        pick("psychosisCourse.onsetSource", "Source of the onset date", ["Patient report", "Family report", "Medical record", "Referral document", "Clinician estimate"], ["according to", "reported by", "records show", "mother reports", "family reports"]),
        long("psychosisCourse.firstSymptoms", "First symptoms noticed", ["first noticed", "hearing voices", "suspicious", "withdrawn", "stopped classes", "early signs"]),
        long("psychosisCourse.course", "Course since onset", ["since then", "progressed", "worsened", "fluctuated", "improved", "less frequent"], R),
        long("psychosisCourse.events", "Events around the time symptoms began", ["stressor", "triggered", "life event", "job loss", "breakup"]),
      ], CSC_DRAFT),
      sec("untreated", "Time to treatment", [
        text("psychosisCourse.untreated", "Duration of untreated symptoms, as documented", ["untreated", "no treatment", "first treatment", "delay", "before seeking help"], { required: true, hint: "Enter the duration the record states. Psyflo does not calculate it or compare it with a threshold." }),
        date("psychosisCourse.firstContact", "Date of first treatment contact", ["first contact", "first admission", "admitted", "seen on", "first visit"]),
        text("psychosisCourse.firstContactWhere", "Where the first treatment contact took place", ["emergency department", "crisis", "urgent care", "primary care", "first admission", "admitted to"]),
        text("psychosisCourse.medication", "Medication started for these symptoms (name and start date, as documented)", ["prescribed", "medication", "nightly", "mg", "dose"]),
      ]),
      sec("hospital", "Hospital and crisis use", [
        pick("psychosisCourse.hospitalizations", "Psychiatric hospitalizations so far", ["None documented", "One", "Two or more", "Not documented"], ["admitted", "hospitalized", "inpatient", "first admission", "discharge summary", "psychiatric unit"], R),
        long("psychosisCourse.hospitalDetails", "Dates, facility and reason, as documented", ["admitted", "discharged", "facility", "medical center", "psychiatric unit"]),
        long("psychosisCourse.crisis", "Emergency or crisis contacts", ["emergency", "crisis", "ed visit", "mobile crisis", "police"]),
      ]),
    ],
  },

  "functional-changes": {
    sections: [
      sec("before", "Before and after", [
        long("functionalChanges.baseline", "Functioning before symptoms began", ["used to", "previously", "prior to", "before symptoms", "baseline", "was doing well"], R),
        long("functionalChanges.now", "Functioning now", ["currently", "stopped", "unable to", "no longer", "not attending"], R),
        text("functionalChanges.timeline", "When the changes started, as documented", ["weeks of", "months ago", "symptoms began", "began in", "onset"]),
        many("functionalChanges.roles", "Roles affected", ["Student", "Worker", "Parent", "Partner", "Friend", "Household member"], ["classes", "job", "employer", "parent", "relationship", "friends"]),
      ], CSC_DRAFT),
      sec("areas", "Areas of change", [
        long("functionalChanges.school", "School or training", ["classes", "college", "school", "stopped classes", "grades", "enrollment"]),
        long("functionalChanges.work", "Work", ["job", "employer", "fired", "laid off", "stopped working", "worked"]),
        long("functionalChanges.relationships", "Relationships and social life", ["friends", "roommates", "family", "withdrawn", "isolated", "partner"]),
        long("functionalChanges.selfCare", "Self-care and daily activities", ["sleep", "hygiene", "eating", "routine", "self-care"]),
      ]),
      sec("goals", "Where the person wants to be", [
        pick("functionalChanges.status", "Education or work status now", ["In school", "Working", "School and work", "Neither", "On leave", "Not documented"], ["enrolled", "employed", "on leave", "withdrew", "not working", "not in school"], R),
        long("functionalChanges.goals", "What the person wants to get back to", ["wants to return", "go back to", "goal", "return to", "supported education"], R),
        long("functionalChanges.supportsNeeded", "Supports the person says would help", ["would help", "supported education", "job coaching", "tutoring", "accommodation"]),
      ]),
    ],
  },

  "family-supports": {
    sections: [
      sec("people", "People involved", [
        long("familySupports.people", "Family and friends involved (name, relationship, role)", ["mother", "father", "sister", "brother", "parent", "friend", "spouse"], R),
        text("familySupports.primary", "Main support person", ["parent contact", "emergency contact", "main support", "mother", "next of kin"], R),
        text("familySupports.contact", "Best way to reach the support person", ["555-01", "phone", "email", "best way to reach"]),
        pick("familySupports.consent", "Support person included with the person's consent", ["Yes, consent on file", "Asked, not yet decided", "No, the person declined", "Not yet asked"], ["consent", "release", "permission", "agrees to include", "declined"], R),
        text("familySupports.livesWith", "Lives with", ["lives with", "lives alone", "lives at home", "parents' home", "dorm"]),
      ], "Draft service description (CSC). Family takes part in care only with the person's consent."),
      sec("involvement", "Involvement in care", [
        pick("familySupports.willing", "Willingness to take part", WILLING, ["willing", "agrees", "wants to be involved", "unsure", "psychoeducation"], R),
        many("familySupports.roles", "How they could take part", ["Attend appointments", "Family education", "Help with a medication routine", "Transportation", "Crisis plan", "Family sessions"], ["psychoeducation", "family education", "attend", "rides", "safety plan", "family sessions"]),
        long("familySupports.concerns", "Family's understanding and concerns", ["worried", "concerned", "does not understand", "afraid", "stigma"]),
        long("familySupports.needs", "What the family needs", ["psychoeducation", "family education", "support group", "respite", "family support"]),
      ]),
      sec("social", "Friends and community", [
        long("familySupports.friends", "Friends, peers and community", ["friends", "peers", "classmates", "church", "club", "social group"]),
        long("familySupports.strengths", "Strengths in the support network", ["supportive", "strength", "involved", "reliable", "close to"]),
        long("familySupports.gaps", "Gaps in support", ["no one", "isolated", "lives far", "lacks", "gap"]),
      ]),
    ],
  },

  "csc-criteria": {
    sections: [
      sec("facts", "Eligibility facts as documented", [
        text("cscCriteria.source", "Program criteria reviewed (document, version, date)", ["criteria", "eligibility", "program requirements", "referral criteria", "admission criteria"], { required: true, hint: "Name the criteria the program uses. None are loaded in Psyflo." }),
        long("cscCriteria.listed", "Criteria the program asks to be documented, as the program states them", ["eligible", "eligibility", "criteria include", "inclusion", "exclusion", "program criteria"]),
        num("cscCriteria.age", "Age at referral", ["age", "years old", "dob", "born"]),
        pick("cscCriteria.episode", "Episode history, as documented by the clinician", ["Documented as first episode", "Documented as not first episode", "Unclear in the records", "Not yet reviewed"], ["first episode", "first psychiatric admission", "first admission", "previous episode", "prior episodes"], R),
        text("cscCriteria.diagnosis", "Diagnosis written by the treating clinician", ["diagnosis", "diagnosed", "working diagnosis", "impression", "diagnostic"], { hint: "Copy as written. Psyflo does not diagnose." }),
        long("cscCriteria.medicalSubstance", "Medical or substance-related factors the clinician documented", ["substance use", "toxicology", "medical workup", "head ct", "lab results", "rule out"]),
      ], "Draft service description; eligibility criteria are not verified."),
      sec("review", "Clinician review", [
        pick("cscCriteria.status", "Review status", ["Not started", "In progress", "Needs more information", "Review complete"], ["review", "reviewed", "pending", "complete", "needs more information"], R),
        long("cscCriteria.missing", "Information still needed", ["missing", "still needed", "pending", "not yet", "awaiting"]),
        text("cscCriteria.reviewer", "Reviewed by (name and credentials)", ["reviewed by", "psychiatrist", "clinician", "md", "credentials"], R),
        date("cscCriteria.reviewDate", "Review date", ["reviewed on", "date of review", "as of", "reviewed"]),
        long("cscCriteria.notes", "Clinician notes on fit with the program", ["recommend", "specialty care", "appropriate for", "candidate", "referral to a"]),
      ]),
    ],
  },

  "multidisciplinary-plan": {
    sections: [
      sec("team", "Team", [
        text("multidisciplinaryPlan.lead", "Team lead or care coordinator", ["team lead", "care coordinator", "case manager", "coordinator", "assigned to"], R),
        many("multidisciplinaryPlan.roles", "Roles on the team for this person", ["Psychiatric prescriber", "Therapist", "Care coordinator", "Peer support", "Supported education and employment", "Family education", "Primary care link"], ["psychiatrist", "therapist", "prescriber", "peer specialist", "supported education", "case manager"], R),
        long("multidisciplinaryPlan.assigned", "Who is assigned to each role", ["assigned", "team member", "will see", "follow-up with", "psychiatry follow-up"], R),
        text("multidisciplinaryPlan.prescriber", "Prescriber", ["prescriber", "psychiatrist", "nurse practitioner", "medication management", "psychiatry follow-up"]),
        text("multidisciplinaryPlan.external", "Outside providers on the plan", ["primary care", "pcp", "outside provider", "community provider", "school counselor"]),
      ], "Draft service description (CSC). Select the roles this program assigns. No staffing requirement is applied."),
      sec("plan", "Shared plan", [
        long("multidisciplinaryPlan.goals", "Shared goals", ["goal", "goals", "wants to", "return to classes", "supported education", "recommendations"], R),
        long("multidisciplinaryPlan.patientRole", "The person's role in the plan and their preferences", ["preference", "prefers", "shared decision", "choice", "wants"]),
        pick("multidisciplinaryPlan.rhythm", "Team review rhythm", ["Weekly", "Every two weeks", "Monthly", "As needed", "Not set"], ["team meeting", "weekly review", "huddle", "case conference"]),
        date("multidisciplinaryPlan.firstMeeting", "First team meeting", ["first meeting", "scheduled", "team meeting on", "intake meeting"]),
        long("multidisciplinaryPlan.updates", "How the team shares updates", ["shared record", "team meeting", "huddle", "case conference", "secure message"]),
        long("multidisciplinaryPlan.open", "Open actions", ["follow up", "outstanding", "pending", "next steps"]),
      ]),
    ],
  },

  "referral-coordination": {
    sections: [
      sec("partners", "Referral partners", [
        long("referralCoordination.partners", "Partners to coordinate with (organization, contact, service)", ["referred to", "referral to", "coordinate with", "follow-up with", "outpatient follow-up", "secure message"], R),
        many("referralCoordination.types", "Types of referral", ["Hospital or crisis", "Psychiatry", "Primary care", "Housing", "School or employment", "Family support", "Peer support", "Benefits"], ["referral", "referred", "psychiatry follow-up", "supported education", "family psychoeducation"]),
        text("referralCoordination.referredBy", "Referral received from", ["referred by", "referring", "referral from", "faxed by", "sent by"]),
        text("referralCoordination.contact", "Partner contact", ["callback", "intake line", "referrer contact", "partner contact"]),
        long("referralCoordination.ask", "What each partner is asked to do", ["recommendations", "follow-up within", "psychoeducation", "supported education", "referral to"]),
      ], "Draft service description (CSC). Sending a referral needs a person's approval and a consent on file."),
      sec("status", "Status and consent", [
        pick("referralCoordination.status", "Coordination status", ["Not started", "Planned", "Requested, awaiting reply", "Reply received", "Closed"], ["sent", "awaiting reply", "reply", "closed", "planned"], R),
        pick("referralCoordination.consent", "Consent to share with partners", CONSENT, ["consent", "release", "signed", "not yet signed", "permission"], R),
        date("referralCoordination.consentDate", "Consent date", ["signed on", "consent dated", "consent signed"]),
        long("referralCoordination.next", "Follow-up and next step", ["next step", "follow up", "pending", "waiting"]),
        text("referralCoordination.owner", "Who follows up", ["follow up", "assigned to", "responsible", "coordinator"]),
        date("referralCoordination.due", "Follow-up date", ["due on", "no later than", "within 7 days", "scheduled"]),
      ]),
    ],
  },

  /* ------------------------------------------------------------------ applied behavior analysis */
  "developmental-history": {
    sections: [
      sec("early", "Early development", [
        long("developmentalHistory.concerns", "When and how concerns were first noticed", ["first noticed", "concerns about", "delay", "not talking", "regress"], R),
        text("developmentalHistory.concernAge", "Age when concerns began", ["months old", "at age", "by age", "years old", "around age"]),
        long("developmentalHistory.speech", "Speech and language development, as reported", ["first words", "speech", "language", "nonverbal", "babbling", "words"], R),
        long("developmentalHistory.motor", "Motor development, as reported", ["walked", "crawl", "motor", "sat up", "coordination"]),
        long("developmentalHistory.social", "Social and play development, as reported", ["eye contact", "play", "peers", "joint attention", "friends", "social"], R),
        pick("developmentalHistory.regression", "Loss of skills reported", ["Yes", "No", "Unsure", "Not asked"], ["lost skills", "regress", "stopped talking", "lost words", "loss of skills"]),
      ], "Demo configuration. Caregiver report and records only; no standard is applied."),
      sec("medical", "Birth and medical history", [
        long("developmentalHistory.birth", "Pregnancy and birth, as reported by the caregiver", ["premature", "birth", "nicu", "complications", "full term"]),
        long("developmentalHistory.medical", "Relevant medical history", ["seizure", "ear infection", "allergy", "surgery", "hospital", "medical history"]),
        pick("developmentalHistory.hearingVision", "Hearing and vision checks", ["Done, no concerns reported", "Done, concerns reported", "Not done", "Not documented"], ["hearing test", "vision", "audiology", "screening", "passed"]),
        long("developmentalHistory.sleepEating", "Sleep and eating", ["sleep", "eating", "picky", "diet", "feeding"]),
        text("developmentalHistory.medications", "Current medications and supplements", ["medication", "melatonin", "prescribed", "supplement"]),
      ]),
      sec("services", "Earlier evaluations and services", [
        many("developmentalHistory.services", "Earlier services", ["Early intervention", "Speech therapy", "Occupational therapy", "Special education", "Counseling", "Behavioral health", "None", "Not documented"], ["early intervention", "speech therapy", "occupational therapy", "iep", "birth to three", "special education"], R),
        long("developmentalHistory.evaluations", "Earlier evaluations (who, when, what was recommended)", ["evaluation", "evaluated by", "recommended", "report dated", "assessment"]),
        long("developmentalHistory.helped", "What has helped and what has not", ["helped", "did not help", "worked well", "effective", "not effective"]),
      ]),
    ],
  },

  "diagnostic-info": {
    sections: [
      sec("evaluation", "Diagnostic evaluation on file", [
        pick("diagnosticInfo.onFile", "Evaluation on file", ["Yes, a copy is on file", "Yes, not yet received", "Requested", "Not available", "Not yet asked"], ["evaluation", "report", "copy", "on file", "attached"], R),
        text("diagnosticInfo.diagnosis", "Diagnosis as written in the evaluation", ["diagnosis", "diagnosed with", "autism", "impression", "working diagnosis"], { required: true, hint: "Copy as written. Psyflo does not diagnose." }),
        date("diagnosticInfo.date", "Evaluation date", ["diagnosed in", "evaluated on", "evaluation dated", "date of evaluation"], R),
        text("diagnosticInfo.evaluator", "Evaluator name and credentials", ["evaluated by", "psychologist", "developmental pediatrician", "md", "phd", "credentials"], R),
        text("diagnosticInfo.organization", "Evaluating organization", ["evaluated at", "evaluation center", "developmental clinic", "assessment center", "hospital"]),
        pick("diagnosticInfo.type", "Type of evaluation", ["Diagnostic evaluation", "Psychological testing", "Developmental screening", "School evaluation", "Medical visit", "Other"], ["diagnostic evaluation", "testing", "screening", "school evaluation", "visit"]),
        pick("diagnosticInfo.how", "How the document reached us", ["Referral packet", "Caregiver", "School", "Prior provider", "Primary care", "Other"], ["attached", "sent by", "provided by", "referral packet", "faxed"]),
      ], "Demo configuration. Record the evaluation as written. Psyflo does not diagnose or interpret it."),
      sec("documents", "Supporting documents", [
        many("diagnosticInfo.documents", "Documents on file", ["Evaluation report", "Test summary", "School evaluation", "Medical note", "IEP", "Prior treatment summary", "None"], ["report", "summary", "iep", "evaluation", "note"]),
        long("diagnosticInfo.recommendations", "Recommendations as written in the evaluation", ["recommends", "recommended", "recommendation", "suggests", "pediatrician recommends"]),
        text("diagnosticInfo.other", "Other diagnoses listed in the records", ["also diagnosed", "other diagnoses", "co-occurring", "history of"]),
        long("diagnosticInfo.gaps", "Documents missing or out of date", ["missing", "outdated", "out of date", "needs updated", "re-evaluation"]),
      ]),
    ],
  },

  "adaptive-functioning": {
    sections: [
      sec("measure", "Measure used", [
        text("adaptiveFunctioning.measure", "Measure name and version", ["adaptive behavior", "adaptive functioning", "adaptive skills", "administered the", "rating scale"], R),
        date("adaptiveFunctioning.date", "Date administered", ["administered on", "assessed on", "tested on", "date administered"], R),
        text("adaptiveFunctioning.by", "Administered by (name and credentials)", ["administered by", "psychologist", "bcba", "clinician", "examiner"], R),
        pick("adaptiveFunctioning.respondent", "Who answered", ["Caregiver", "Teacher", "Child directly", "Clinician observation", "More than one"], ["parent report", "caregiver reported", "teacher", "interview", "observation"]),
        text("adaptiveFunctioning.result", "Result as the measure reports it", ["composite", "standard score", "age equivalent", "percentile", "results showed"], { required: true, hint: "Type a number or label from the measure. Psyflo does not compute or interpret it." }),
        long("adaptiveFunctioning.reading", "Clinician's reading of the result", ["interpretation", "indicates", "consistent with", "suggests", "findings"]),
      ], "Demo configuration. Enter the result from the administered measure. Psyflo does not score it."),
      sec("skills", "Skills in daily life", [
        many("adaptiveFunctioning.domains", "Domains where needs are documented", ["Communication", "Daily living", "Social skills", "Play and leisure", "Motor skills", "Safety awareness", "Community use"], ["communication", "daily living", "socialization", "motor", "play", "safety"]),
        long("adaptiveFunctioning.communication", "Communication: what the child does now", ["communicates by", "words", "gestures", "pointing", "sentences", "aac", "picture"]),
        long("adaptiveFunctioning.dailyLiving", "Daily living: what the child does now", ["toileting", "dressing", "feeding", "brushing", "independent", "bathing"]),
        long("adaptiveFunctioning.social", "Social skills: what the child does now", ["peers", "turn taking", "play", "eye contact", "sharing"]),
        long("adaptiveFunctioning.safety", "Safety awareness at home and in the community", ["wanders", "elopes", "supervision", "unsafe", "traffic"]),
        long("adaptiveFunctioning.strengths", "Strengths and interests", ["likes", "enjoys", "interests", "strength", "loves"]),
      ]),
    ],
  },

  "behavioral-assessment": {
    sections: [
      sec("behaviors", "Target behaviors", [
        long("behavioralAssessment.targets", "Target behaviors (what each looks like)", ["aggression", "self-injury", "tantrum", "elopement", "hitting", "biting", "screaming", "behavior"], R),
        long("behavioralAssessment.frequency", "How often each occurs", ["times per day", "daily", "weekly", "per week", "frequency", "episodes"], R),
        long("behavioralAssessment.duration", "How long episodes last and how intense they are", ["minutes", "lasts", "intensity", "severe", "duration"]),
        text("behavioralAssessment.onset", "When each behavior began", ["onset", "began at", "first appeared", "started when"]),
        many("behavioralAssessment.harm", "Harm reported", ["To the child", "To others", "To property", "None reported"], ["injury", "injuries", "bruise", "hurt", "damage", "hospital"]),
      ], "Demo configuration. Describe what each behavior looks like, not a label."),
      sec("context", "What surrounds the behavior", [
        many("behavioralAssessment.settings", "Where behaviors occur", ["Home", "School", "Clinic", "Community", "Daycare", "Transportation", "Other"], ["at home", "at school", "in the community", "daycare", "clinic", "bus"], R),
        long("behavioralAssessment.before", "What happens before, as reported", ["triggered by", "when asked", "transition", "denied", "loud noises", "antecedent"]),
        long("behavioralAssessment.after", "What happens after and how caregivers respond", ["responded", "ignored", "calmed down", "consequence", "parents respond", "caregivers respond"]),
        long("behavioralAssessment.lessLikely", "When the behavior is less likely", ["better when", "calm", "does not occur", "less often", "improves"]),
        text("behavioralAssessment.routines", "Times of day or routines affected", ["morning", "bedtime", "mealtime", "transitions", "routine"]),
      ]),
      sec("sources", "How the information was gathered", [
        many("behavioralAssessment.sources", "Sources of information", ["Caregiver interview", "Direct observation", "School report", "Behavior log or data sheet", "Prior provider report", "Rating scale result entered by the clinician"], ["interview", "observed", "observation", "school report", "log", "data sheet"], R),
        text("behavioralAssessment.observer", "Observed or interviewed by", ["observed by", "interviewed", "bcba", "clinician"]),
        date("behavioralAssessment.date", "Date of the observation or interview", ["observed on", "interviewed on", "visit on", "observation dated"]),
        long("behavioralAssessment.unknown", "What could not be observed or is not known", ["not observed", "unknown", "unable to", "limited", "not known"]),
      ]),
    ],
  },

  fba: {
    sections: [
      sec("status", "Whether an FBA applies", [
        pick("fba.applicable", "Is an FBA applicable", ["Yes", "No", "Not yet decided"], ["fba", "functional behavior assessment", "functional assessment", "behavior assessment"], R),
        pick("fba.status", "FBA progress", ["Not started", "In progress", "Completed", "Completed elsewhere, copy on file"], ["fba completed", "in progress", "completed", "copy on file"], R),
        text("fba.by", "Completed by (name and credentials)", ["completed by", "bcba", "behavior analyst", "credentials"]),
        date("fba.date", "Date completed", ["completed on", "fba dated", "date completed", "completed in"]),
        long("fba.why", "Why an FBA is or is not applicable", ["fba", "functional behavior", "not needed", "applicable", "behaviors need to be understood"], R),
      ], "Demo configuration. Where applicable. Findings are the clinician's; Psyflo does not determine function."),
      sec("abc", "Behavior, antecedents and consequences", [
        long("fba.target", "Target behavior (observable description)", ["target behavior", "behavior", "hitting", "elopement", "tantrum"]),
        long("fba.antecedents", "Antecedents (what happens before)", ["antecedent", "trigger", "triggered by", "when asked", "transition"]),
        long("fba.consequences", "Consequences (what happens after)", ["consequence", "responded", "ignored", "given attention", "escape"]),
        long("fba.setting", "Setting and context (where, when, with whom)", ["setting", "at home", "at school", "in the classroom", "community outing"]),
        long("fba.replacement", "Replacement or alternative behaviors noted", ["replacement behavior", "alternative behavior", "functional communication", "communicate needs", "ask for"]),
      ], "Complete this section and the next when an FBA applies."),
      sec("function", "Function hypotheses", [
        many("fba.function", "Hypothesized function", ["Attention", "Escape or avoidance", "Access to items or activities", "Sensory or automatic", "Not yet determined"], ["function", "maintained by", "escape", "attention", "access", "sensory"]),
        long("fba.hypothesis", "Hypothesis statement, in the clinician's words", ["hypothesis", "appears to", "function of", "serves to", "maintained by"]),
        long("fba.basis", "What the hypothesis is based on", ["data", "observation", "abc", "interview", "direct observation"]),
        long("fba.next", "Next step to test or review the hypothesis", ["next step", "plan to", "data collection", "reassess", "to test"]),
      ], "As written by the clinician. A hypothesis is not a finding."),
    ],
  },

  "aba-goals": {
    sections: [
      sec("goals", "Goals", [
        long("abaGoals.skills", "Skills to build", ["skills", "teach", "communication", "toileting", "self-help", "social skills"], R),
        long("abaGoals.reduce", "Behaviors to reduce", ["reduce", "decrease", "target behavior", "aggression", "tantrums"], R),
        text("abaGoals.priority", "First priority", ["priority", "most important", "top goal", "main goal", "first goal"], R),
        long("abaGoals.family", "Goals the family named", ["family wants", "parents hope", "parent goals", "would like", "hopes"]),
        long("abaGoals.baseline", "Where the child is now, as documented", ["baseline", "currently", "at present", "at this time"]),
        long("abaGoals.measure", "How progress will be measured", ["data collection", "measure", "baseline", "track", "probe", "frequency"], R),
      ], "Demo configuration. Goals are the clinician's and the family's; Psyflo writes none."),
      sec("plan", "Review and carry-over", [
        long("abaGoals.mastery", "What meeting a goal looks like", ["mastery", "criteria", "independently", "consistently", "across settings"]),
        long("abaGoals.carryover", "Where skills should carry over (home, school, community)", ["generalize", "carry over", "across settings", "maintain", "community"]),
        text("abaGoals.review", "Planned progress review (when and by whom)", ["reassess", "progress report", "quarterly", "progress review", "reviewed every"]),
        long("abaGoals.stepDown", "Plan for stepping down or ending services", ["step down", "taper", "discharge", "transition", "fade"]),
      ]),
    ],
  },

  "caregiver-participation": {
    sections: [
      sec("who", "Caregivers and schedule", [
        text("caregiverParticipation.caregivers", "Caregivers who will take part (names and relationships)", ["parents", "mother", "father", "caregiver", "guardian"], R),
        text("caregiverParticipation.contact", "Main contact", ["555-01", "phone", "email", "best way to reach"]),
        long("caregiverParticipation.availability", "Schedule and availability", ["available", "work schedule", "evenings", "weekends", "after school"], R),
        pick("caregiverParticipation.agreement", "Caregiver agrees to take part", ["Yes", "Yes, with changes", "Unsure", "Declined", "Not yet asked"], ["agrees", "willing", "wants to", "declined", "unsure"], R),
        pick("caregiverParticipation.language", "Language for training", LANGUAGES, ["language", "spanish", "interpreter", "prefers"]),
      ], DEMO),
      sec("training", "Training and support", [
        many("caregiverParticipation.format", "How caregivers can take part", ["In session with the child", "Separate caregiver sessions", "Telehealth", "Written plans and handouts", "Group", "Practice at home"], ["parent training", "sessions", "telehealth", "practice", "group", "handouts"], R),
        long("caregiverParticipation.learn", "What caregivers want to learn", ["want to learn", "strategies", "parent training", "help with", "wants help"]),
        many("caregiverParticipation.barriers", "Barriers to taking part", CAREGIVER_BARRIERS, ["work schedule", "childcare", "transportation", "interpreter", "health"]),
        long("caregiverParticipation.routines", "Home routines where practice would happen", ["routine", "bedtime", "mealtime", "morning", "after school"]),
        long("caregiverParticipation.support", "Support for caregivers (respite, other help)", ["respite", "support group", "stress", "burnout", "help for parents"]),
      ]),
    ],
  },

  "aba-intensity": {
    sections: [
      sec("request", "Hours and settings", [
        text("abaIntensity.hours", "Hours per week requested", ["hours per week", "hours a week", "recommended hours", "per week"], R),
        many("abaIntensity.settings", "Settings requested", ["Home", "Clinic", "School", "Community", "Telehealth", "Daycare"], ["at home", "clinic", "at school", "community", "telehealth", "daycare"], R),
        long("abaIntensity.split", "How the hours are split across settings and services", ["direct therapy", "supervision", "parent training", "split between", "hours"]),
        date("abaIntensity.start", "Requested start date", ["start date", "begin", "as soon as", "starting"]),
        text("abaIntensity.period", "Period requested", ["authorization period", "period requested", "months of services", "renewal"]),
        text("abaIntensity.staff", "Who delivers (roles and credentials)", ["bcba", "rbt", "behavior technician", "supervision", "behavior analyst"], R),
      ], "Demo configuration. Payer requirement not yet verified. The clinician chooses the hours; Psyflo applies no threshold."),
      sec("rationale", "Clinical reasoning", [
        long("abaIntensity.rationale", "Why these hours and settings fit this child", ["recommends", "recommended", "rationale", "intensity", "pediatrician recommends"], R),
        long("abaIntensity.goalLink", "How the hours link to the goals and target behaviors", ["target behaviors", "treatment goals", "skill building", "reduce"]),
        long("abaIntensity.otherServices", "Other services and school hours that affect the schedule", ["school hours", "speech", "occupational therapy", "schedule", "other services"]),
        long("abaIntensity.family", "Family availability and preferences", ["prefers", "availability", "family schedule", "evenings", "after school"]),
        long("abaIntensity.change", "What would change the request", ["step down", "reassess", "increase hours", "reduce hours", "taper"]),
      ], "Clinical reasoning only. A clinician reviews it before anything is sent."),
    ],
  },
};
