import { TAIL } from "@/data/eligibility";
import type { PayerId, Program } from "@/data/types";
import { dobFor, type VerifyForm } from "./verifySteps";

/** One member who ends in each verdict. The chips on Verify fill the form with them, so every answer can be seen without a trick. */
export interface Sample {
  id: string;
  label: string;
  initials: string;
  age: number;
  form: VerifyForm;
}

const sample = (id: string, label: string, initials: string, age: number, payerId: PayerId, program: Program, member: string): Sample => ({
  id,
  label,
  initials,
  age,
  form: { payerId, member, dob: dobFor(age), program, dos: "10/21/2026", source: null },
});

/* The member ID ending is what scripts the answer (see simulateCheck). L.M. already has an IOP authorization on file with fee-for-service, so that one is cleared.
   J.M.'s card is the headline case: the check updates R-1042, which needs its authorization first. */
export const SAMPLES: Sample[] = [
  sample("cleared", "Cleared to bill", "L.M.", 36, "beacon", "IOP", `BP552107${TAIL.authOnFile}`),
  sample("auth_first", "Authorization first", "J.M.", 34, "summit", "RES", "SM7403964821"),
  sample("lapsed", "Coverage lapsed", "P.O.", 31, "summit", "RES", `SM740322${TAIL.lapsed}`),
  sample("not_found", "Not found", "T.G.", 29, "lakeshore", "IOP", `LB441022${TAIL.notFound}`),
  sample("not_covered", "Not covered", "D.H.", 40, "beacon", "RES", `BP552104${TAIL.notCovered}`),
  sample("other_plan", "Another plan pays first", "R.S.", 34, "summit", "IOP", `SM740318${TAIL.otherPlan}`),
  sample("limit", "Limit reached", "W.P.", 48, "cardinal", "RES", `CH331850${TAIL.limitReached}`),
];

/* More ways a check can end, each with a warning that does not stop New Authorization: the plan changed, the ID differs, the plan did not confirm the service,
   the clinic's enrollment is not confirmed, and no rule is on file for the authorization. A check that cannot run happens when Verify is paused in Settings. */
export const EXCEPTION_SAMPLES: Sample[] = [
  sample("payer_changed", "Payer changed", "H.R.", 44, "summit", "RES", `SM740355${TAIL.payerChanged}`),
  sample("id_mismatch", "Member ID mismatch", "C.A.", 38, "cardinal", "IOP", `CH331877${TAIL.idMismatch}`),
  sample("benefit_unconfirmed", "Benefit not confirmed", "N.W.", 41, "harborview", "PHP", `HV220018${TAIL.benefitUnconfirmed}`),
  sample("provider_unresolved", "Provider not confirmed", "S.D.", 33, "lakeshore", "IOP", `LB441066${TAIL.providerUnresolved}`),
  sample("requirement_unknown", "Requirement unknown", "G.F.", 52, "beacon", "RES", `BP552140${TAIL.requirementUnknown}`),
];
