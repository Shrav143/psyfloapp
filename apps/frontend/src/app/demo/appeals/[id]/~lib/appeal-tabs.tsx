"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lib/core-ui/tabs";
import type { Appeal, AppealDoc } from "@/lib/demo/appeals";
import { FollowupTab } from "./followup-tab";
import { LetterEditor } from "./letters-tab";
import { PacketTab } from "./packet-tab";
import { ReasoningTab } from "./reasoning-tab";
import { SubmissionTab } from "./submission-tab";

const TABS = [
  ["reasoning", "Reasoning"],
  ["cover", "Cover letter"],
  ["letter", "Appeal letter"],
  ["packet", "Packet"],
  ["submission", "Submission"],
  ["call", "Follow-up call"],
] as const;

export function AppealTabs({
  appeal,
  docs,
  pages,
  destination,
  filedAt,
  onTab,
  onDocReady,
}: {
  appeal: Appeal;
  docs: AppealDoc[];
  pages: number;
  destination: string;
  filedAt?: string;
  onTab: (tab: string) => void;
  onDocReady: (name: string) => void;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <Tabs defaultValue="reasoning" onValueChange={onTab} className="gap-0">
        <div className="border-slate-100 border-b px-3 pt-3 pb-2">
          <TabsList className="h-auto flex-wrap bg-slate-100">
            {TABS.map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-none px-3 text-xs"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="p-5">
          <TabsContent value="reasoning">
            <ReasoningTab cards={appeal.reasoning} />
          </TabsContent>
          <TabsContent value="cover">
            <LetterEditor
              title="Cover letter"
              hint="Page 1 of Part 1. Names the three parts so the reviewer knows the packet is complete."
              initial={appeal.coverLetter}
              rows={11}
            />
          </TabsContent>
          <TabsContent value="letter">
            <LetterEditor
              title="Appeal letter · medical necessity argument"
              hint="Excerpt of the 3-page letter. Drafted from the LOCUS, treatment plan and payer criteria; the clinician edits and signs."
              initial={appeal.appealLetterExcerpt}
              rows={9}
            />
          </TabsContent>
          <TabsContent value="packet">
            <PacketTab
              appeal={appeal}
              docs={docs}
              pages={pages}
              onDocReady={onDocReady}
            />
          </TabsContent>
          <TabsContent value="submission">
            <SubmissionTab
              appeal={appeal}
              destination={destination}
              filedAt={filedAt}
              pages={pages}
            />
          </TabsContent>
          <TabsContent value="call">
            <FollowupTab appeal={appeal} pages={pages} filedAt={filedAt} />
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
