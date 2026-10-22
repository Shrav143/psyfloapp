import { Link } from "react-router-dom";
import { Banner, Button } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import type { EmrSystem, UnmappedField } from "@/data/emr";
import type { AgentKey } from "@/data/types";
import { plural } from "@/lib/format";
import { paths } from "@/routes";

/** What needs a person on this page. The first item is the action; the rest are named after "Also". Paused agents are only the two EMR Connect uses. */
export interface Need {
  key: string;
  text: string;
  /** What the person does about it. Absent for the ones named after "Also". */
  action?: { label: string; aria: string; run?: () => void; to?: string };
}

export function needsOf(systems: EmrSystem[], unmapped: UnmappedField[], paused: Partial<Record<AgentKey, boolean>>, h: { fix: (id: string) => void; reconnect: (id: string) => void; map: (f: UnmappedField) => void }): Need[] {
  const out: Need[] = [];
  for (const s of systems.filter((x) => x.status === "attention")) out.push({ key: `fix-${s.id}`, text: `${s.name} needs attention.`, action: { label: "Fix", aria: `Fix: ${s.name}`, run: () => h.fix(s.id) } });
  for (const s of systems.filter((x) => x.status === "disconnected")) out.push({ key: `rec-${s.id}`, text: `${s.name} is disconnected.`, action: { label: "Reconnect", aria: `Reconnect: ${s.name}`, run: () => h.reconnect(s.id) } });
  if (unmapped.length) out.push({ key: "map", text: `${plural(unmapped.length, "field")} ${unmapped.length === 1 ? "needs" : "need"} a mapping, so New case leaves ${unmapped.length === 1 ? "it" : "them"} blank.`, action: { label: "Map field", aria: `Map field: ${unmapped[0].field}`, run: () => h.map(unmapped[0]) } });
  for (const k of ["reader", "navigator"] as AgentKey[]) if (paused[k]) out.push({ key: `paused-${k}`, text: `${AGENTS[k].name} is paused, so ${k === "reader" ? "syncs and new connections" : "fixes and reconnects"} wait.`, action: { label: "Open Settings", aria: "Open Settings", to: paths.settings() } });
  return out;
}

/** The one banner on the page. It shows only when something needs a person. */
export function ActionRequired({ needs }: { needs: Need[] }) {
  if (!needs.length) return null;
  const [first, ...rest] = needs;
  const a = first.action;
  return (
    <Banner
      tone="mid"
      action={
        a?.to ? (
          <Link to={a.to} aria-label={a.aria} className="inline-flex h-8 items-center rounded-[10px] border border-transparent bg-forest px-3 text-[13px] font-medium whitespace-nowrap text-white hover:bg-forest-dark">
            {a.label}
          </Link>
        ) : a ? (
          <Button size="sm" variant="primary" aria-label={a.aria} onClick={a.run}>
            {a.label}
          </Button>
        ) : null
      }
    >
      <p data-testid="action-required">
        <b>Action required:</b> {first.text}
        {rest.length ? ` Also: ${rest.map((r) => r.text.replace(/\.$/, "")).join("; ")}.` : ""}
      </p>
    </Banner>
  );
}
