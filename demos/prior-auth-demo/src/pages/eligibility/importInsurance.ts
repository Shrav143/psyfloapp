/* What an imported insurance record (a pasted card or coverage screen, an export file, an EMR pull) fills on the Verify form: the payer and the member ID.
   The plan type shows under the payer (it follows the payer); the group and the coverage dates on the card are shown as found, and the live check then asks the plan. */
import type { ImportResult } from "@/components/import";
import { PAYERS } from "@/data/seed";
import type { PayerId } from "@/data/types";
import { mdyOf } from "@/data/verification";
import type { VerifyForm } from "./verifySteps";

export function formFromImport(r: ImportResult): { form: Partial<VerifyForm>; found: string[] } {
  const get = (key: string): string | undefined => r.fields.find((f) => f.key === key && f.value.trim())?.value.trim();
  const form: Partial<VerifyForm> = {};
  const payer = get("payerId");
  const pid = payer ? PAYERS.find((p) => p.id === payer)?.id : undefined;
  if (pid) form.payerId = pid as PayerId;
  const member = get("memberId");
  if (member) form.member = member;
  const from = get("effectiveFrom");
  const to = get("effectiveTo");
  const group = get("groupNumber");
  const found = [group ? `Group ${group}` : "", from ? `Effective ${mdyOf(from)}${to ? ` to ${mdyOf(to)}` : ""}` : ""].filter(Boolean);
  return { form, found };
}
