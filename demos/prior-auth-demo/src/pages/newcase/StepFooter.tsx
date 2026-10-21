import type { ReactNode } from "react";

/** The Back / Continue bar at the bottom of each step. It stays in view while a long step scrolls.
    The buttons sit on the left because toasts appear at the bottom right and would cover them. */
export function StepFooter({ actions, hint }: { actions: ReactNode; hint?: ReactNode }) {
  return (
    <div className="sticky bottom-4 z-20 flex items-center gap-4 rounded-2xl border border-edge bg-white/95 px-5 py-3 backdrop-blur">
      <div className="flex shrink-0 items-center gap-2.5">{actions}</div>
      <div className="min-w-0 flex-1 text-[13px] text-muted">{hint}</div>
    </div>
  );
}
