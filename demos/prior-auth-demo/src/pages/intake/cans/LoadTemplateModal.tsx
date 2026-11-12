import { useState } from "react";
import { FileCog } from "lucide-react";
import { Button, Checkbox, Modal } from "@/components/ui";
import type { IntakeRecord } from "@/data/intake/types";
import { staffOf } from "@/data/intake/seed";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { isAdmin } from "./cansModel";
import { DEMO_DOMAINS, DEMO_TEMPLATE_LABEL, OFFICIAL_NEEDS, OFFICIAL_NOT_VERIFIED } from "./template";

/** The administrator action: load the demo placeholder template. A viewer who is not an administrator can play the clinic owner (a labeled demo control, recorded as role-play). */
export function LoadTemplateModal({ record, open, onClose }: { record: IntakeRecord; open: boolean; onClose: () => void }) {
  const me = useStore((s) => meOf(s));
  const load = useStore((s) => s.loadCansDemoTemplate);
  const toast = useStore((s) => s.toast);
  const [agreed, setAgreed] = useState(false);
  const admin = isAdmin(me);
  const owner = staffOf("am");
  const viewer = staffOf(me);
  const close = () => { setAgreed(false); onClose(); };
  const run = () => {
    const rolePlay = !admin;
    load(record.id, admin ? me : "am", rolePlay);
    toast({ title: "Demo placeholder template loaded", body: `${DEMO_DOMAINS.length} domains of blank prompts. Not CANS content.`, tone: "neutral" });
    close();
  };
  return (
    <Modal
      open={open}
      onClose={close}
      title="Load a demo placeholder template"
      subtitle="Administrator action · applies to every intake that uses the CANS Lifetime"
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" icon={FileCog} disabled={!agreed} onClick={run}>{admin ? "Load the placeholder template" : `Load as ${owner?.name ?? "the clinic owner"} (demo)`}</Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-[14px] text-ink">{DEMO_TEMPLATE_LABEL}. It adds {DEMO_DOMAINS.length} generic domain headings with blank prompts so the item, evidence and rating workflow can be shown. The prompts have no official wording, no rating anchors and no scale. Nothing is computed from what a clinician types.</p>
        <div>
          <p className="text-[13px] font-semibold text-ink2">The official template needs</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink">{OFFICIAL_NEEDS.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="mt-1 text-[12px] text-muted">{OFFICIAL_NOT_VERIFIED}</p>
        </div>
        {!admin ? (
          <p className="rounded-xl bg-mid-bg px-3 py-2 text-[13px] text-mid-ink">
            You are viewing as {viewer?.name ?? "someone who is not an administrator"}. Loading the template is an administrator action. You can play {owner?.name ?? "the clinic owner"}, {owner?.role.toLowerCase() ?? "clinic owner"}, to continue the demo. It is recorded as role-play in the audit trail.
          </p>
        ) : null}
        <Checkbox checked={agreed} onChange={setAgreed} label={<span className="text-[14px]">I understand this is a demo placeholder, not the official CANS Lifetime.</span>} />
      </div>
    </Modal>
  );
}
