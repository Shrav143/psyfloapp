"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { appealById } from "@/lib/demo/appeals";
import { denialById } from "@/lib/demo/denials";
import { useDemoStore } from "@/lib/demo/store";
import { EmptyState } from "@/lib/demo-ui/primitives";
import { applySession, destinationFor } from "../../~lib/appeal-helpers";
import { AppealHeader } from "./appeal-header";
import { AppealTabs } from "./appeal-tabs";
import { AppealTimeline } from "./appeal-timeline";
import { FreeCarePanel } from "./free-care-panel";
import { SignSendPanel } from "./sign-send-panel";
import {
  type DocOverrides,
  docsWith,
  overlaySteps,
  totalPages,
} from "./workspace-helpers";

export function AppealWorkspace({ id }: { id: string }) {
  const signedIds = useDemoStore((s) => s.signed);
  const submittedIds = useDemoStore((s) => s.submitted);
  const [docOverrides, setDocOverrides] = useState<DocOverrides>({});
  const [viewed, setViewed] = useState<string[]>([]);
  const appeal = appealById(id);
  const view = useMemo(
    () => (appeal ? applySession(appeal, signedIds, submittedIds) : undefined),
    [appeal, signedIds, submittedIds],
  );
  if (!appeal || !view) {
    return (
      <div className="space-y-4">
        <Link
          href="/demo/appeals"
          className="inline-flex items-center gap-1 text-slate-500 text-xs hover:text-slate-800"
        >
          <ArrowLeft className="size-3" /> Appeals
        </Link>
        <EmptyState
          title="Appeal not found"
          body={`No appeal with id "${id}". Pick one from the appeals list.`}
        />
      </div>
    );
  }
  const denial = denialById(appeal.denialId);
  const signed = !!appeal.filedAt || signedIds.includes(appeal.id);
  const submitted = !!appeal.filedAt || submittedIds.includes(appeal.id);
  const docs = docsWith(appeal, docOverrides, signed);
  const pages = totalPages(docs);
  const steps = overlaySteps(appeal.steps, signed, submitted, pages);
  const destination = destinationFor(appeal);
  const lettersReviewed =
    submitted || (viewed.includes("cover") && viewed.includes("letter"));
  return (
    <div className="space-y-6">
      <AppealHeader appeal={view} denial={denial} />
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <AppealTimeline steps={steps} />
        <AppealTabs
          appeal={appeal}
          docs={docs}
          pages={pages}
          destination={destination}
          filedAt={view.filedAt}
          onTab={(t) => setViewed((v) => (v.includes(t) ? v : [...v, t]))}
          onDocReady={(name) =>
            setDocOverrides((o) => ({ ...o, [name]: "ready" }))
          }
        />
        <div className="space-y-6">
          <SignSendPanel
            appeal={appeal}
            docs={docs}
            pages={pages}
            destination={destination}
            signed={signed}
            submitted={submitted}
            lettersReviewed={lettersReviewed}
          />
          <FreeCarePanel appeal={appeal} />
        </div>
      </div>
    </div>
  );
}
