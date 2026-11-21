import { useMemo } from "react";
import { Disclosure, FLAG_LABEL, HistoryFeed, flagOf } from "@/components/ui";
import { viewerById } from "@/data/viewers";
import { useStore } from "@/store";
import type { CaseCtx } from "./caseTypes";
import { historyOf } from "./history";

/** The one History of the request, closed by default: newest first, a flag on the right of each line (Agent, Decision, Logged decision, Scheduled). */
export function CaseHistory({ ctx }: { ctx: CaseCtx }) {
  const { detail, work } = ctx;
  const you = viewerById(useStore((s) => s.viewerId)).name;
  const request = useStore((s) => s.requests.find((r) => r.id === detail.requestId));
  const items = useMemo(() => historyOf(request, work.log), [request, work.log]);
  const logged = items.filter((i) => flagOf(i) === "logged").length;
  return (
    <Disclosure
      title="History"
      summary={items.length ? `${items.length} ${items.length === 1 ? "line" : "lines"}${logged ? ` · ${logged} ${FLAG_LABEL.logged.toLowerCase()}${logged === 1 ? "" : "s"}` : ""}` : "Nothing yet"}
    >
      <HistoryFeed items={items} you={you} label="Request history" />
    </Disclosure>
  );
}
