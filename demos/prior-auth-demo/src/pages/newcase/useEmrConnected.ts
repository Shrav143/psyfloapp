import { useMemo } from "react";
import { useStore } from "@/store";
import { selectConnectedEmr } from "@/store/emr";

/** A clinical record system is connected for the sites in view, so Pull from EMR is offered. */
export function useEmrConnected(): boolean {
  const systems = useStore((s) => s.emrSystems);
  const viewerId = useStore((s) => s.viewerId);
  const siteScope = useStore((s) => s.siteScope);
  return useMemo(() => selectConnectedEmr(useStore.getState()).some((x) => x.kind === "Clinical record"), [systems, viewerId, siteScope]);
}
