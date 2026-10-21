import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardHeader, Chip, IdLink } from "@/components/ui";
import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL, type PayerSummary, type Program } from "@/data/types";
import { shortDate } from "@/lib/time";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { ManagerFilters } from "./helpers";

interface Plan {
  key: string;
  denialId: string;
  caseId: string;
  at: number;
  initials?: string;
  age?: number;
  program?: Program;
  payer?: PayerSummary;
}

/** Search by case or denial id or initials, then level of care and payer, as on Being prepared. */
function fits(p: Plan, f: ManagerFilters): boolean {
  if (f.program !== "all" && p.program !== f.program) return false;
  if (f.payer !== "all" && p.payer?.id !== f.payer) return false;
  const q = f.q.trim().toLowerCase().replace(/[.\s-]/g, "");
  return !q || [p.caseId, p.denialId].some((id) => id.toLowerCase().replace(/-/g, "").includes(q)) || (p.initials ?? "").toLowerCase().replace(/\./g, "").includes(q);
}

/** One plan for each denial the team accepted in Denial Intelligence: the next level of care still has to be chosen and booked. */
export function StepDownCard({ filters }: { filters: ManagerFilters }) {
  const nav = useNavigate();
  const accepted = useStore((s) => s.deniesAccepted);
  const requests = useStore((s) => s.requests);

  const plans = useMemo(
    () =>
      accepted
        .map((a): Plan => {
          const r = requests.find((x) => x.id === a.denialId) ?? requests.find((x) => x.id === a.requestId);
          return { key: a.id, denialId: a.denialId, caseId: r?.caseId ?? a.requestId ?? a.denialId, at: a.at, initials: r?.patient.initials, age: r?.patient.age, program: r?.program, payer: PAYERS.find((x) => x.id === (r?.payerId ?? a.payerId)) };
        })
        .filter((p) => fits(p, filters)),
    [accepted, requests, filters],
  );
  if (!plans.length) return null;

  return (
    <Card>
      <CardHeader title="Step-down plans" subtitle="Started when Denial Intelligence accepts a denial. Choose the next level of care and book the first visit." />
      <ul className="flex flex-col gap-3.5 p-5" aria-label={`${plans.length} ${plans.length === 1 ? "step-down plan" : "step-down plans"}`}>
        {plans.map((p) => {
          const open = () => nav(paths.case(p.caseId));
          return (
            <li key={p.key} className="flex items-start gap-5 rounded-2xl border border-edge bg-tile p-5">
              <div className="w-[142px] shrink-0 pt-0.5">
                <Chip>{p.program ? PROGRAM_LABEL[p.program] : "Level not set"}</Chip>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Step-down plan</div>
                <div>
                  <IdLink onClick={open}>{p.caseId}</IdLink>
                  <span className="text-muted">
                    {p.initials ? ` · ${p.initials}, ${p.age}` : ""}
                    {p.payer ? ` · ${p.payer.name}` : ""}
                  </span>
                </div>
                <div className="mt-0.5 text-sm text-muted">From denial {p.denialId} · accepted {shortDate(p.at)}</div>
              </div>
              <div className="w-[128px] shrink-0 text-right">
                <Button size="sm" variant="primary" onClick={open} aria-label={`Open case ${p.caseId}`}>
                  Open case
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
