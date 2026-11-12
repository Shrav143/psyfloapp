import { useStore } from "@/store";

/** True in the hosted preview build (VITE_HOSTED=1), where the host page blocks file downloads and printing. */
export const HOSTED = import.meta.env.VITE_HOSTED === "1";

/** In the hosted preview, says why a save, print or copy-link action does nothing. Returns true when it did, so the caller stops. */
export function blockedInHosted(what: string): boolean {
  if (!HOSTED) return false;
  useStore.getState().toast({ title: `${what} is off in this preview`, body: "Open the single-file version of the demo to use it.", tone: "neutral" });
  return true;
}
