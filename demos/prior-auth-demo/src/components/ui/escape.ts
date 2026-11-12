import { useEffect, useRef } from "react";

/** Every open drawer, modal, menu and calendar registers here, newest last. */
const layers: symbol[] = [];

/** Esc closes only the layer on top: a menu inside a modal inside a drawer closes one press at a time. */
export function useEscape(open: boolean, onClose: () => void): void {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const id = Symbol("layer");
    layers.push(id);
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || layers[layers.length - 1] !== id) return;
      e.stopPropagation();
      close.current();
    };
    window.addEventListener("keydown", h);
    return () => {
      layers.splice(layers.indexOf(id), 1);
      window.removeEventListener("keydown", h);
    };
  }, [open]);
}
