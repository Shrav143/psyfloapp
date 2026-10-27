import { useState } from "react";
import { Plus } from "lucide-react";
import { Button, Dropdown, TextArea, TextInput } from "@/components/ui";
import type { PayerId } from "@/data/types";
import type { ReqKind } from "@/data/va/policy";
import { VA_PLANS } from "@/data/va/plans";
import { SERVICES, type VaServiceId } from "@/data/va/services";
import { useStore } from "@/store";
import { KIND_LABEL, ORG_RULE_LABEL } from "./match";

const KINDS: ReqKind[] = ["authorization", "registration", "none", "pending", "channel"];

/** An administrator's local rule (a contract term, a plan's instruction by phone). It is stored in this demo session, labeled
    "Organization rule, unverified", shown beside the DMAS rules and on readiness, and never changes a DMAS rule. */
export function OrgRuleForm() {
  const add = useStore((s) => s.addOrgRule);
  const toast = useStore((s) => s.toast);
  const count = useStore((s) => s.orgRules.length);
  const [label, setLabel] = useState("");
  const [detail, setDetail] = useState("");
  const [kind, setKind] = useState<ReqKind>("authorization");
  const [service, setService] = useState<VaServiceId | "all">("all");
  const [payer, setPayer] = useState<PayerId | "all">("all");
  const ok = label.trim().length > 2;
  const save = () => {
    if (!ok) return;
    add({ label: label.trim(), detail: detail.trim() || "No detail added.", kind, services: service === "all" ? "all" : [service], payers: payer === "all" ? undefined : [payer] });
    toast({ title: "Organization rule added", body: `${ORG_RULE_LABEL}. It shows in matching and on readiness for the services it names.`, tone: "good" });
    setLabel("");
    setDetail("");
  };
  return (
    <div className="mt-2 rounded-2xl border border-dashed border-field bg-white px-4 py-3">
      <p className="text-[13px] text-ink2">{count ? `${count} organization ${count === 1 ? "rule" : "rules"} added in this session.` : "None yet."} Each is labeled “{ORG_RULE_LABEL}”.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="org-label" className="mb-1 block text-[12px] font-medium text-ink2">Rule</label>
          <TextInput id="org-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Anthem asks for a call before outpatient visit 13" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="org-detail" className="mb-1 block text-[12px] font-medium text-ink2">Detail and where it came from</label>
          <TextArea id="org-detail" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Provider relations call, 10/14/2026 (not in writing)" />
        </div>
        <div>
          <span className="mb-1 block text-[12px] font-medium text-ink2">Kind</span>
          <Dropdown<ReqKind> ariaLabel="Rule kind" value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
        </div>
        <div>
          <span className="mb-1 block text-[12px] font-medium text-ink2">Service</span>
          <Dropdown<VaServiceId | "all"> ariaLabel="Rule service" value={service} onChange={setService} options={[{ value: "all", label: "All services" }, ...SERVICES.map((s) => ({ value: s.id, label: s.short }))]} menuWidth={280} />
        </div>
        <div>
          <span className="mb-1 block text-[12px] font-medium text-ink2">Plan</span>
          <Dropdown<PayerId | "all"> ariaLabel="Rule plan" value={payer} onChange={setPayer} options={[{ value: "all", label: "All plans" }, ...VA_PLANS.map((p) => ({ value: p.payerId, label: p.short }))]} />
        </div>
        <div className="flex items-end">
          <Button variant="primary" icon={Plus} disabled={!ok} onClick={save}>Add organization rule</Button>
        </div>
      </div>
    </div>
  );
}
