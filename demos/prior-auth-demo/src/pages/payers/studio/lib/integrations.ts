import { useStore } from "@/store";
import type { NodeDef, NodeKind } from "@/data/workflow/types";
import { supportOf } from "./engine";

export interface IntegrationStatus {
  word: "Connected" | "Demo simulation" | "Not configured";
  tone: "good" | "mid" | "neutral";
  detail: string;
}

/** Connected only for what EMR Connect really has connected. Every other integration is a labelled simulation or not set up at all: no credentials are ever entered here. */
export function useIntegrationStatus(kind: NodeKind, def?: NodeDef): IntegrationStatus | null {
  const emrSystems = useStore((s) => s.emrSystems);
  if (!kind.startsWith("int_")) return null;
  const support = supportOf(kind, { emrSystems });
  if (kind === "int_emr_sync" && support === "live") {
    const up = emrSystems.filter((s) => s.status === "connected");
    return { word: "Connected", tone: "good", detail: `${up.map((s) => s.name).join(" and ")} ${up.length === 1 ? "is" : "are"} connected in EMR Connect. The sync itself is a demo simulation.` };
  }
  if (support === "live") return { word: "Connected", tone: "good", detail: def?.supportNote ?? "" };
  if (support === "simulated") return { word: "Demo simulation", tone: "mid", detail: def?.supportNote || "The demo pretends this connection works. Nothing leaves the app." };
  return { word: "Not configured", tone: "neutral", detail: def?.supportNote || "No connection is set up for this. The step stops and asks a person." };
}
