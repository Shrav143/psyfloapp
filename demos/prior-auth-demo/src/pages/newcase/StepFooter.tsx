import type { ReactNode } from "react";

/** The Back / Continue bar at the bottom of each step. It stays in view while a long step scrolls.
    The buttons sit on the left because toasts appear at the bottom right and would cover them. */
export function StepFooter({ actions, hint }: { actions: ReactNode; hint?: ReactNode }) {
  return (
    <div className="sticky bottom-4 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-edge bg-white/95 px-5 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      {hint ? <div className="min-w-[200px] flex-1 text-[13px] text-muted">{hint}</div> : null}
    </div>
  );
}
