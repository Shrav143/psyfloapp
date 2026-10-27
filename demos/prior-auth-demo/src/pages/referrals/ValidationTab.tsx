import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { AgentChip, Button, Card, CardBody, Dropdown, Meter, Pill } from "@/components/ui";
import { CHECK_EVIDENCE, CHECK_PROBLEM, DOC_TITLE, isOpen, type CheckKey, type DocId, type Referral, type ReferralCheck } from "@/data/referrals";
import { cn } from "@/lib/cn";
import { unresolved } from "@/store/referralsLogic";

type ResolveChoice = "" | "info" | "override";
const GROUPS: DocId[] = ["form", "face"];
export const passed = (c: ReferralCheck): boolean => c.state === "pass" || !!c.resolved;

function Icon({ c }: { c: ReferralCheck }) {
  if (passed(c)) return <CheckCircle2 size={20} className="ico mt-0.5 text-good" aria-label="Passed" />;
  if (c.state === "fail") return <XCircle size={20} className="ico mt-0.5 text-risk" aria-label="Failed" />;
  return <AlertTriangle size={20} className="ico mt-0.5 text-mid" aria-label="Needs attention" />;
}

interface Props {
  r: Referral;
  onView: (blockId: string) => void;
  onRequest: (keys: CheckKey[]) => void;
  onOverride: (key: CheckKey) => void;
}

/** What Reader checked the referral against. Each warning can be answered by asking the referrer or by overriding with a reason. */
export function ValidationTab({ r, onView, onRequest, onOverride }: Props) {
  const total = r.checks.length;
  const ok = r.checks.filter(passed).length;
  const open = unresolved(r);
  const canAct = isOpen(r.status);
  // A failed age check has no "Request information": nobody can change a patient's age by replying.
  const askable = open.filter((c) => c.state !== "fail").map((c) => c.key);
  return (
    <div className="flex flex-col gap-4">
      <Card className="bg-tile">
        <CardBody className="flex flex-col gap-3 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-serif text-[18px] font-semibold">{ok} of {total} checks passed</div>
              <div className="text-sm text-muted">{open.length ? `${open.length} ${open.length === 1 ? "needs" : "need"} your attention.` : "Everything Reader checked is clear."}</div>
            </div>
            <AgentChip agent="reader" />
          </div>
          <Meter value={(ok / total) * 100} color={open.length ? "#A87A26" : "#2E7D52"} height={8} />
          {canAct && askable.length ? (
            <div>
              <Button size="sm" variant="primary" onClick={() => onRequest(askable)}>Request information for all open findings</Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {GROUPS.map((g) => {
        const checks = r.checks.filter((c) => c.doc === g);
        const bad = checks.filter((c) => !passed(c)).length;
        return (
          <section key={g} aria-label={DOC_TITLE[g]}>
            <div className="mb-1 flex items-center gap-2.5 px-1">
              {bad ? <AlertTriangle size={18} className="ico text-mid" /> : <CheckCircle2 size={18} className="ico text-good" />}
              <h4 className="font-serif text-lg font-semibold">{DOC_TITLE[g]}</h4>
              <span className="text-[13px] text-muted">{checks.length - bad} of {checks.length} passed</span>
            </div>
            <ul className="rounded-2xl border border-edge bg-white">
              {checks.map((c) => (
                <li key={c.key} className={cn("flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0", !passed(c) && "bg-[#FDFAF2]")} data-check={c.key}>
                  <Icon c={c} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{c.state === "pass" ? c.label : CHECK_PROBLEM[c.key]}</div>
                    <div className="text-[13px] text-muted">{c.resolved?.how === "override" ? `Marked OK: ${c.resolved.reason}` : c.resolved?.how === "reply" ? `Fixed by the referrer's reply. Before: ${c.detail}` : c.detail}</div>
                    <button type="button" onClick={() => onView(CHECK_EVIDENCE[c.key])} className="mt-1 text-[13px] font-medium text-forest hover:underline">Show in document</button>
                  </div>
                  <div className="shrink-0">
                    {c.resolved ? (
                      <Pill tone="good">{c.resolved.how === "override" ? "Marked OK" : "Fixed by reply"}</Pill>
                    ) : c.state === "fail" && canAct ? (
                      <Button size="sm" aria-label={`Mark OK with reason: ${CHECK_PROBLEM[c.key]}`} onClick={() => onOverride(c.key)}>Mark OK with reason</Button>
                    ) : c.state !== "pass" && canAct ? (
                      <Dropdown<ResolveChoice>
                        ariaLabel={`Resolve: ${CHECK_PROBLEM[c.key]}`}
                        value=""
                        placeholder="Resolve"
                        menuWidth={210}
                        options={[{ value: "info", label: "Request information" }, { value: "override", label: "Mark OK with reason" }]}
                        onChange={(v) => (v === "info" ? onRequest([c.key]) : v === "override" ? onOverride(c.key) : undefined)}
                      />
                    ) : c.state !== "pass" ? (
                      <Pill tone={c.state === "fail" ? "risk" : "mid"}>{c.state === "fail" ? "Failed" : "Warning"}</Pill>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
