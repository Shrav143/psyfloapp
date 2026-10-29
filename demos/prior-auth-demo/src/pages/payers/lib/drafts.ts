import { useMemo } from "react";
import { openDrafts, type OpenDraft } from "@/data/payerConfig";
import { siteName, siteOf } from "@/data/sites";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";

/** One payer's drafts that have not been sent, at the sites in view, read live from the Dashboard requests and the saved New Authorization drafts.
    A payer is clinic-wide, but a draft belongs to a case and so to a site: Update drafts counts, lists and redrafts only the ones the viewer may see. */
export function useOpenDrafts(payerId: string): OpenDraft[] {
  const requests = useStore((s) => s.requests);
  const caseDrafts = useStore((s) => s.caseDrafts);
  const { has } = useScope();
  return useMemo(() => openDrafts(requests, caseDrafts, payerId, has), [requests, caseDrafts, payerId, has]);
}

/** A sentence for a viewer who may see both sites but is looking at one: the payer's other unsent drafts are not in this view, so they are not counted or updated.
    Empty for everyone else, so a viewer limited to one site is never told anything about the other site's drafts. */
export function useOtherSiteNote(payerId: string): string {
  const requests = useStore((s) => s.requests);
  const caseDrafts = useStore((s) => s.caseDrafts);
  const { has, restricted, sites } = useScope();
  return useMemo(() => {
    if (restricted || sites.length > 1) return "";
    const out = openDrafts(requests, caseDrafts, payerId, (id) => !has(id));
    if (!out.length) return "";
    const where = siteName(siteOf(out[0].id));
    return `${out.length} more ${out.length === 1 ? "draft" : "drafts"} at ${where} ${out.length === 1 ? "is" : "are"} not in this view, so ${out.length === 1 ? "it is" : "they are"} not updated. Choose Both sites to include ${out.length === 1 ? "it" : "them"}.`;
  }, [requests, caseDrafts, payerId, has, restricted, sites]);
}
