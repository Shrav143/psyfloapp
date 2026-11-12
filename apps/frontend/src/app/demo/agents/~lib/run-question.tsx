"use client";

import { CircleCheck, MessageCircleQuestionMark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import type { AgentRun } from "@/lib/demo/agents";
import { useDemoStore } from "@/lib/demo/store";

/** The one place an agent stops and asks. Answering resumes the run and is written to the ledger. */
export function RunQuestion({ run }: { run: AgentRun }) {
  const answer = useDemoStore((s) => s.answeredQuestions[run.id]);
  const answerQuestion = useDemoStore((s) => s.answerQuestion);
  const question = run.question;
  if (!question) {
    return null;
  }
  if (answer) {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 text-sm">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
        <div>
          <span className="font-medium text-emerald-900">Answered:</span>{" "}
          <span className="text-emerald-900">{answer}</span>
          <div className="mt-0.5 text-emerald-800/80 text-xs">
            Logged to the ledger under your name. Packet resumes.
          </div>
        </div>
      </div>
    );
  }
  const choose = (option: string) => {
    answerQuestion(run.id, option);
    toast.success("Answer recorded · Packet resumes");
  };
  return (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-3">
      <div className="flex items-start gap-2">
        <MessageCircleQuestionMark className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="text-amber-950 text-sm">{question.text}</div>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2 pl-6">
        {question.options.map((option) => (
          <Button
            key={option}
            type="button"
            size="sm"
            variant="outline"
            className="bg-white"
            onClick={() => choose(option)}
          >
            {option}
          </Button>
        ))}
      </div>
    </div>
  );
}
