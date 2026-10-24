"use client";

import { SendHorizonal, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/lib/core-ui/button";
import { Input } from "@/lib/core-ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/lib/core-ui/sheet";
import { answer, SUGGESTED_QUESTIONS } from "@/lib/demo/ask";
import { useDemoStore } from "@/lib/demo/store";
import { cn } from "@/lib/tailwind-utils";

export function AskPanel() {
  const open = useDemoStore((s) => s.askOpen);
  const setOpen = useDemoStore((s) => s.setAskOpen);
  const messages = useDemoStore((s) => s.askMessages);
  const push = useDemoStore((s) => s.pushAsk);
  const [draft, setDraft] = useState("");

  const ask = (q: string) => {
    if (!q.trim()) {
      return;
    }
    push({ role: "user", text: q });
    setDraft("");
    setTimeout(() => push(answer(q)), 450);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-indigo-600" /> Ask Psyflo
          </SheetTitle>
          <SheetDescription>
            Answers come from the authorization ledger. Every number cites its
            source rows. No predictions.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="space-y-2">
              <div className="text-slate-500 text-xs">Try one of these</div>
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-slate-700 text-sm hover:border-indigo-300 hover:bg-indigo-50"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={cn(
                "max-w-[92%] whitespace-pre-line rounded-xl px-3.5 py-2.5 text-sm",
                m.role === "user"
                  ? "ml-auto bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-800",
              )}
            >
              {m.text}
              {m.sources ? (
                <div className="mt-2 text-[11px] text-slate-500">
                  Sources: {m.sources.join(" · ")}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <form
          className="flex items-center gap-2 border-t px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            ask(draft);
          }}
        >
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What are the next renewals due in October?"
            className="bg-white"
          />
          <Button
            type="submit"
            size="icon"
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <SendHorizonal className="size-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
