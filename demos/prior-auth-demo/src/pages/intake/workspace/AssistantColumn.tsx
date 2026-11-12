import { Sparkles } from "lucide-react";
import { Drawer } from "@/components/ui";
import type { WorkspaceTarget } from "@/data/assess/nav";
import type { IntakeRecord } from "@/data/intake/types";
import { AssistantPanel } from "../assistant/AssistantPanel";

/** The right column: the one AI Assistant for whatever section is open. Open in the column from 1280 px, folded to a slim rail when collapsed;
    narrower than that it opens as a drawer from the header button. It is mounted once, so its work and state are not lost when the layout changes. */
export function AssistantColumn({ record, target, mode, open, onOpen, onClose, needs }: {
  record: IntakeRecord;
  target: WorkspaceTarget;
  /** "column": three columns; "drawer": narrower windows. */
  mode: "column" | "drawer";
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  needs: number;
}) {
  if (mode === "drawer") {
    return (
      <Drawer open={open} onClose={onClose} title="AI Assistant" subtitle="Agents suggest. People approve." width={440}>
        <div data-assistant-drawer>
          <AssistantPanel record={record} target={target} />
        </div>
      </Drawer>
    );
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label="Open the AI Assistant"
        aria-expanded={false}
        data-assistant-rail
        className="flex h-full min-h-0 w-10 flex-col items-center gap-3 rounded-[20px] border border-edge bg-white py-4 text-ink2 hover:bg-tile"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-sage-bg text-forest"><Sparkles size={15} className="ico" /></span>
        <span className="text-[13px] font-medium [writing-mode:vertical-rl]">AI Assistant</span>
        {needs ? <span className="rounded-full bg-mid-bg px-1.5 text-[11px] font-semibold text-mid-ink">{needs}</span> : null}
      </button>
    );
  }
  return (
    <aside aria-label="AI Assistant" data-assistant-column className="min-h-0 min-w-0 overflow-y-auto">
      <AssistantPanel record={record} target={target} />
    </aside>
  );
}
