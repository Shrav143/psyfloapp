/* Verify's check on Eligibility & Benefits, run through the shared verification module (data/verification.ts, store/eligibility.ts).
   It asks for a check when the case has none that fits, waits about a second so it feels like a call to the plan, and stores the record the Eligibility page shows. */
import { useEffect, useState } from "react";
import type { CaseDraft } from "@/data/cases";
import { verify } from "@/data/verification";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";

const CHECK_MS = 1200;

/** Runs the check when there is nothing usable (none, or one for another payer or level of care) and, for a new patient or a retroactive request, when the last one is old.
    A review, a renewal or a modification shows the patient's last check and leaves the refresh to the person. Returns whether a check is in flight. */
export function useVerifyRun(draft: CaseDraft, env: CaseEnv): boolean {
  const v = env.verification;
  const [running, setRunning] = useState(false);
  const refreshing = useStore((s) => !!v.key && s.ebRechecking.includes(v.key));
  const auto = v.status === "none" || v.status === "other" || (v.status === "stale" && (draft.kind === "initial" || draft.kind === "retro"));
  const signature = `${draft.payerId}|${draft.program}|${draft.memberId}|${draft.startDate}|${draft.endDate ?? ""}|${v.status}|${v.key ?? ""}`;

  useEffect(() => {
    if (!auto || !v.want) return;
    const st = useStore.getState();
    /* A record that belongs to another payer or level of care does not describe this case: the case lets go of it, and its own record is made. */
    if (v.status === "other" && draft.verificationId) {
      st.patchCaseDraft(draft.id, { verificationId: null });
      return;
    }
    /* The record is filed under the case ID, so the case gets its ID now. */
    if (!v.key) {
      st.ensureCaseId(draft.id);
      return;
    }
    const key = v.key;
    setRunning(true);
    const t = setTimeout(() => {
      const s = useStore.getState();
      const d = s.caseDrafts.find((x) => x.id === draft.id);
      if (!d || !d.payerId || !d.program) return;
      const rec = verify({ caseId: key, payerId: d.payerId, program: d.program, dosFrom: v.want?.dosFrom ?? d.startDate, dosTo: v.want?.dosTo ?? d.startDate, initials: d.patient.initials || null, age: d.patient.age, memberId: d.memberId, site: d.site }, s);
      s.saveVerification(rec);
      if (d.verificationId !== rec.id) s.patchCaseDraft(d.id, { verificationId: rec.id });
      setRunning(false);
    }, CHECK_MS);
    return () => {
      clearTimeout(t);
      setRunning(false);
    };
    // The signature stands for everything the check depends on.
  }, [signature, auto]);

  return running || refreshing;
}
