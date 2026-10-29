import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Chip } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { NewReferralModal } from "./NewReferralModal";
import { ReferralCard } from "./ReferralCard";
import { isOverdue } from "./referralModel";

/** Closed-loop referral coordination for the record: every referral out, its status and follow-up. `newFor` opens New referral from a pathway. */
export function ReferralPanel({ record, newFor, onNewHandled }: { record: IntakeRecord; newFor: string | null; onNewHandled: () => void }) {
  const clock = useStore((s) => s.clock);
  const [creating, setCreating] = useState<{ pwId: string | null } | null>(null);
  const [openId, setOpenId] = useState<string | null>(() => [...record.referralsOut].reverse().find((r) => r.status !== "completed")?.id ?? null);
  const modal = newFor !== null ? { pwId: newFor } : creating;
  const overdue = record.referralsOut.filter((r) => isOverdue(r, clock)).length;
  const close = () => { setCreating(null); onNewHandled(); };
  return (
    <Card data-referral-panel>
      <CardHeader
        title="Referral coordination"
        subtitle="Delivery is simulated. Nothing leaves the clinic without a person's approval."
        right={<>{overdue ? <Chip>{overdue} overdue</Chip> : null}<Button size="sm" variant="primary" icon={Plus} onClick={() => setCreating({ pwId: null })}>New referral</Button></>}
      />
      <CardBody>
        {record.referralsOut.length ? (
          <ul className="space-y-2.5">
            {record.referralsOut.map((ro) => (
              <ReferralCard key={ro.id} record={record} ro={ro} open={openId === ro.id} onToggle={() => setOpenId((x) => (x === ro.id ? null : ro.id))} onRedirect={() => setCreating({ pwId: ro.pathwayId ?? null })} />
            ))}
          </ul>
        ) : (
          <div className="py-4 text-center">
            <p className="text-[14px] font-semibold text-ink">No referrals yet</p>
            <p className="mt-0.5 text-[13px] text-muted">Create one from a pathway, to this clinic's team or to an external organization.</p>
          </div>
        )}
      </CardBody>
      {modal ? <NewReferralModal record={record} pwId={modal.pwId} onClose={close} onCreated={(id) => setOpenId(id)} /> : null}
    </Card>
  );
}
