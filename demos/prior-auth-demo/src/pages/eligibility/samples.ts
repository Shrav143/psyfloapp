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
  form: { payerId, member, dob: dobFor(age), program, dos: "10/21/2026", cardName: null },
});

/* The member ID ending is what scripts the answer (see simulateCheck). Beacon asks for no authorization for IOP, so that one is cleared. */
export const SAMPLES: Sample[] = [
  sample("cleared", "Cleared to bill", "L.M.", 36, "beacon", "IOP", "BP5521072468"),
  sample("lapsed", "Coverage lapsed", "P.O.", 31, "summit", "RES", `SM740322${TAIL.lapsed}`),
  sample("not_found", "Not found", "T.G.", 29, "lakeshore", "IOP", `LB441022${TAIL.notFound}`),
  sample("not_covered", "Not covered", "D.H.", 40, "beacon", "RES", `BP552104${TAIL.notCovered}`),
  sample("other_plan", "Another plan pays first", "R.S.", 34, "summit", "IOP", `SM740318${TAIL.otherPlan}`),
  sample("limit", "Limit reached", "W.P.", 48, "cardinal", "RES", `CH331850${TAIL.limitReached}`),
];
