import { RequestDrawer } from "@/pages/dashboard/RequestDrawer";
import type { QueueItem } from "@/data/queue";
import type { PsyRequest } from "@/data/types";
import { QuickViewLite } from "./QuickViewLite";
import { useDialogFocus } from "./useDialogFocus";

/** The queue's right-hand quick view for one request, mounted while it is open.
    A request that is on the Dashboard opens the Dashboard's own request panel, so the two screens show the same thing with the same buttons.
    A queue-only request (none on the Dashboard yet) opens a lighter panel built from the case. Escape or the X closes it and focus goes back to that row. */
export function QuickView({ item, request, onClose }: { item: QueueItem; request: PsyRequest | undefined; onClose: () => void }) {
  useDialogFocus(() => document.querySelector<HTMLElement>(`[data-quick="${item.id}"]`));
  // The row is keyed by its case ID, which a denial's new D- number does not change, so there is nothing to switch when the panel renames the request.
  return request ? <RequestDrawer request={request} onClose={onClose} onSwitch={() => undefined} /> : <QuickViewLite item={item} onClose={onClose} />;
}
