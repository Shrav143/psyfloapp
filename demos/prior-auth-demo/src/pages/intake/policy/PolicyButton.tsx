import { useState } from "react";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui";
import type { PayerId } from "@/data/types";
import type { VaServiceId } from "@/data/va/services";
import { PolicyDrawer } from "./PolicyDrawer";

/** "Policy": opens the policy engine (versions, effective dates, matching rules with their status and sources, open questions).
    Inside a record it can start filtered to that record's service, plan and age. */
export function PolicyButton({ serviceId, payerId, age, label = "Policy", size = "sm" }: { serviceId?: VaServiceId; payerId?: PayerId | null; age?: number | null; label?: string; size?: "sm" | "md" } = {}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} icon={ScrollText} onClick={() => setOpen(true)} aria-haspopup="dialog">{label}</Button>
      {open ? <PolicyDrawer onClose={() => setOpen(false)} initial={{ serviceId, payerId, age }} /> : null}
    </>
  );
}
