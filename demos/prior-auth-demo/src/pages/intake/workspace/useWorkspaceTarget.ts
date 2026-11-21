import { useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { parseSection, type WorkspaceTarget } from "@/data/assess/nav";
import { workspaceHref } from "./nav";

/** The section of the workspace the address names (`?section=`, old names included), and a way to move to another one. Moving drops `panel`. */
export function useWorkspaceTarget(recordId: string): { target: WorkspaceTarget; go: (t: WorkspaceTarget) => void } {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const raw = params.get("section");
  const target = useMemo(() => parseSection(raw), [raw]);
  const go = useCallback((t: WorkspaceTarget) => nav(workspaceHref(recordId, t)), [nav, recordId]);
  return { target, go };
}

/** Where a readiness item or a need says to go: a module, or a (possibly old-style) section name. */
export function targetOf(go: { section: string; module?: string } | undefined): WorkspaceTarget {
  if (!go) return { section: "overview" };
  return go.module ? parseSection(`m:${go.module}`) : parseSection(go.section);
}
