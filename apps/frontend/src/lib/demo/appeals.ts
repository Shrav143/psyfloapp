import { CALL, docsFor, stepsFor } from "./appeal-parts";
import type { Appeal } from "./appeal-types";
import { denials } from "./denials";
import { addDays, DEMO_TODAY, daysBetween } from "./format";
import { PAYER_BY_ID } from "./payers";

export type {
  Appeal,
  AppealDoc,
  AppealStep,
  ReasoningCard,
  StepState,
} from "./appeal-types";

let cache: Appeal[] | undefined;

export function appeals(): Appeal[] {
  if (cache) {
    return cache;
  }
  cache = denials()
    .filter((d) => d.appealId)
    .map((d) => {
      const payer = PAYER_BY_ID[d.payerId];
      const filedStatus = [
        "appeal_filed",
        "receipt_unconfirmed",
        "under_review",
        "won",
        "lost",
      ].includes(d.status);
      const fallbackFiled = addDays(d.receivedAt, 9);
      const filedAt = filedStatus
        ? (d.appealFiledAt ??
          (fallbackFiled < DEMO_TODAY
            ? fallbackFiled
            : addDays(DEMO_TODAY, -1)))
        : undefined;
      const missing = d.status === "appeal_signoff";
      return {
        id: d.appealId as string,
        denialId: d.id,
        mrn: d.mrn,
        payerId: d.payerId,
        level: "Level 1",
        channel: payer.appealChannel,
        destination:
          payer.appealChannel === "fax"
            ? `Fax ${payer.appealFax}`
            : payer.appealChannel === "portal"
              ? payer.authPortal
              : "appeals@payer.example",
        deadline: d.deadline,
        filedAt,
        receiptConfirmedAt:
          filedAt && ["under_review", "won", "lost"].includes(d.status)
            ? (d.appealReceiptAt ?? addDays(filedAt, 3))
            : undefined,
        decisionDueAt: filedAt ? addDays(filedAt, 30) : undefined,
        outcome:
          d.status === "won" ? "won" : d.status === "lost" ? "lost" : undefined,
        freeCareDays: Math.max(
          0,
          daysBetween(d.receivedAt, d.appealDecidedAt ?? DEMO_TODAY),
        ),
        steps: stepsFor(
          d.status,
          d.receivedAt,
          filedAt,
          d.appealReceiptAt,
          d.appealDecidedAt,
        ),
        docs: docsFor(d.payerId, missing),
        reasoning: [
          {
            title: "Denial reason review",
            body: `${payer.short} cited: "${d.reason}" Notice references ${d.code}. No criteria section was attached.`,
            tone: "info",
          },
          {
            title: "Policy criteria comparison",
            body: `${payer.criteriaSet === "unconfirmed" ? "Payer policy" : payer.criteriaSet} continued-stay criteria require documented functional impairment in two or more domains and a current LOCUS of level 3 or higher. The submitted LOCUS scores level 4 (5 of 6 dimensions).`,
            tone: "good",
          },
          {
            title: "Clinical documentation review",
            body: "Treatment plan and PCH monthly notes document medication non-adherence without daily structure, two crisis contacts in the last 60 days and progress toward independent-living goals contingent on continued programming.",
            tone: "good",
          },
          {
            title: "Root cause",
            body:
              d.validity === "valid"
                ? "Packet element was stale or missing per the payer's current rule. Corrected document attached; argue on the merits as well."
                : "Reviewer appears to have read the merged PDF only to page 12. Three-part split and a one-page criteria crosswalk put the SMI evidence on page 1.",
            tone: "warn",
          },
        ],
        coverLetter: `To: ${payer.name} — Appeals Department\nFrom: Harbor Behavioral Health, Lexington KY\nRe: Level 1 appeal · Member ${d.mrn} · Reference ${d.code}\n\nPlease find enclosed our formal appeal of the adverse determination dated ${d.receivedAt} for therapeutic rehabilitation programming (H2020). Part 1 contains the appeal letter and criteria crosswalk; Part 2 our clinical assessments; Part 3 external medical records. Kindly confirm receipt by fax or phone.`,
        appealLetterExcerpt: `The member meets ${payer.criteriaSet === "unconfirmed" ? "your published" : payer.criteriaSet} continued-stay criteria on every dimension cited in the denial. The LOCUS administered on ${addDays(d.receivedAt, -12)} scores level 4; functional impairment is documented in self-care, social functioning and medication management; and two crisis contacts in the preceding 60 days demonstrate that reducing frequency below three days per week presents a foreseeable risk of decompensation and rehospitalization...`,
        callTranscript: [
          "under_review",
          "won",
          "lost",
          "receipt_unconfirmed",
        ].includes(d.status)
          ? CALL
          : undefined,
      };
    });
  return cache;
}

export function appealById(id: string): Appeal | undefined {
  return appeals().find((a) => a.id === id);
}
