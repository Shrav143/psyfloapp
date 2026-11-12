import { Dropdown } from "@/components/ui";
import type { AuthKind } from "@/data/cases";
import { useStore } from "@/store";
import { AUTH_TYPES } from "./authType";

/** The Authorization type, under the page heading. It decides what Intake asks, how Eligibility behaves, which documents are typical, what the justification says and the type recorded on the request. */
export function AuthTypePicker({ draftId, kind, disabled }: { draftId: string; kind: AuthKind; disabled?: boolean }) {
  const set = useStore((s) => s.setCaseKind);
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] font-medium text-ink2 max-[1023px]:sr-only">Authorization type</span>
      <Dropdown<AuthKind> ariaLabel="Authorization type" value={kind} onChange={(k) => set(draftId, k)} disabled={disabled} options={AUTH_TYPES.map((t) => ({ value: t.kind, label: t.label }))} menuWidth={290} className="w-[250px] max-[640px]:w-[200px]" />
    </div>
  );
}
