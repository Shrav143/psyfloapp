import { useNavigate } from "react-router-dom";
import { ArrowRight, Settings2 } from "lucide-react";
import { Button, Card, CardBody, Pill } from "@/components/ui";
import type { WorkspaceTarget } from "@/data/assess/nav";
import { effectiveStatus, STATUS_TONE } from "@/data/assess/status";
import { TRIAGE_LABEL } from "@/data/intake/types";
import { statusReason } from "../statusReason";
import type { WorkspaceModel } from "../useWorkspaceModel";

/** Where the intake stands and the one next step. The status follows the work; the words under it say why. */
export function StatusCard({ model, go, onConfigure }: { model: WorkspaceModel; go: (t: WorkspaceTarget) => void; onConfigure: () => void }) {
  const { record: r, plan, next } = model;
  const nav = useNavigate();
  const status = effectiveStatus(r);
  const act = () => (next.configure ? onConfigure() : next.href ? nav(next.href) : next.to ? go(next.to) : undefined);
  return (
    <Card data-card="status">
      <CardBody className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[13px] text-muted">Status</span>
          <Pill tone={STATUS_TONE[status]}>{TRIAGE_LABEL[status]}</Pill>
          <span className="min-w-0 text-[13px] text-ink2">{statusReason(r, plan)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-tile px-4 py-3" data-next-step>
          <div className="min-w-0">
            <div className="text-[12px] text-muted">Next step</div>
            <div className="text-[16px] font-semibold">{next.text}</div>
          </div>
          {next.to || next.configure || next.href ? (
            <Button variant="primary" icon={next.configure ? Settings2 : undefined} trailing={next.configure ? undefined : ArrowRight} onClick={act}>{next.label}</Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
