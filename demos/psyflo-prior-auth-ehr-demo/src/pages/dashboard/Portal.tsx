import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/** The kit Drawer keeps a transform after it slides in, which traps a fixed modal inside it. Modals opened from a drawer render here instead. */
export function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body);
}
