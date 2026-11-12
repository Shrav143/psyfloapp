import type { ReactNode } from "react";

/** A label above a control that is not a native input. The kit's Field is a <label>, and a click on a menu option inside a label
    re-opens the menu, so menus use this instead. */
export function Labeled({ label, required, hint, error, children }: { label: string; required?: boolean; hint?: ReactNode; error?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-medium text-ink2">
        {label}
        {required ? <span className="text-risk"> *</span> : null}
      </div>
      {children}
      {error ? <div className="mt-1 text-xs text-risk">{error}</div> : hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}
