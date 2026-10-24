import { useMemo } from "react";
import { openItems } from "@/data/queue";
import { useScope } from "@/lib/scope";
import { useLedgerRows } from "@/pages/manager/ledgerRows";
import { useStore } from "@/store";
import { buildWorkRows, type WorkRow } from "./model";

/** The worklist's rows at the sites in view. Built from every record, then narrowed by site, so a request and its ledger row always meet. */
export function useWorkRows(): WorkRow[] {
  const scope = useScope();
  const items = useStore((s) => s.queueItems);
  const requests = useStore((s) => s.requests);
  const cases = useStore((s) => s.queueCases);
  const drafts = useStore((s) => s.caseDrafts);
  const reviews = useStore((s) => s.reviews);
  const accepted = useStore((s) => s.deniesAccepted);
  const updates = useStore((s) => s.payerChangeUpdates);
  const denialMeta = useStore((s) => s.denialMeta);
  const clock = useStore((s) => s.clock);
  const ledger = useLedgerRows(false);
  return useMemo(() => {
    const rows = buildWorkRows({ items: openItems(items, requests), requests, cases, ledger, drafts, reviews, accepted, updates, denialMeta, clock });
    return rows.filter((r) => scope.sites.includes(r.site));
  }, [items, requests, cases, ledger, drafts, reviews, accepted, updates, denialMeta, clock, scope.sites]);
}
