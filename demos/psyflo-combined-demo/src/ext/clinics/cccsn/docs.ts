import type { DocSeed } from "../../types";
import { LEVELS, SERVICES } from "./forms";

/* The documents as Lauris has them when the demo opens. */
export const docs: DocSeed[] = [
  /* M.R. · today's group note, empty except what Lauris fills from the record. Scribe fills the rest. */
  {
    id: "dpn-c101", kind: "dpn", consumerId: "c101", date: "2026-10-29",
    title: "Group / Individual Progress Note · 10/29/2026",
    values: { date: "10/29/2026", service: SERVICES[0] },
    prefilled: ["date", "service"],
    status: "draft",
  },
  /* M.R. · continued stay request. Lauris fills the member and authorization lines; the clinician dictates the rest. */
  {
    id: "sra-c101", kind: "sra", consumerId: "c101", date: "2026-10-29",
    title: "Continued Stay / Prior Authorization Request · 10/29/2026",
    values: {
      date: "10/29/2026",
      member: "M.R. · Medicaid # on file",
      auth: "Anthem · 36 units H0015 · 10/09/2026 – 11/13/2026",
      used: "27 of 36 · 3 per IOP day",
    },
    prefilled: ["date", "member", "auth", "used"],
    status: "draft",
  },
  /* T.W. · admission screening. Lauris fills what the referral and the eligibility check already say. */
  {
    id: "adm-c102", kind: "admission", consumerId: "c102", date: "2026-10-29",
    title: "Admission (ASAM screening) · 10/29/2026",
    values: {
      date: "10/29/2026",
      source: "Clark County drug court",
      partner: "R. Bell · Case manager · Clark County drug court",
      payer: "SilverSummit · active, checked 10/15/2026",
      release: "Yes",
    },
    prefilled: ["date", "source", "partner", "payer", "release"],
    status: "draft",
  },
  /* T.W. · ASAM assessment. The clinician has already rated the six dimensions; D6 carries text from an earlier template. */
  {
    id: "asam-c102", kind: "assessment", consumerId: "c102", date: "2026-10-29",
    title: "ASAM Assessment · 10/29/2026",
    values: {
      date: "10/29/2026",
      uds: "10/29/2026 · Positive: buprenorphine (prescribed), fentanyl · EtG positive",
      d1r: "2", d2r: "1", d3r: "2", d4r: "2", d5r: "3", d6r: "3",
      d6n: "Housing is stable and supports are strong; no concerns.",
      loc: LEVELS[1],
    },
    prefilled: ["date", "uds", "d1r", "d2r", "d3r", "d4r", "d5r", "d6r", "d6n", "loc"],
    status: "draft",
  },
  /* L.B. · a note an intern already wrote and saved. Scan reads it. */
  {
    id: "dpn-c103", kind: "dpn", consumerId: "c103", date: "2026-10-27",
    title: "Group / Individual Progress Note · 10/27/2026",
    values: {
      date: "10/27/2026",
      service: SERVICES[0],
      time: "9:00 am – 12:00 pm",
      units: "4",
      intervention: "Observed client in group; participated in 2 of 3 exercises.",
      plan: "Continue.",
    },
    status: "saved",
    author: "R. Owens, CADC-I",
  },
];
