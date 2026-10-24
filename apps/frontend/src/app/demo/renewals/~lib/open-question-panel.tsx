"use client";

import { Switch } from "@/lib/core-ui/switch";
import { money } from "@/lib/demo/format";
import { Panel } from "@/lib/demo-ui/primitives";

export function OpenQuestionPanel({
  assumeBackdated,
  onChange,
  gapDays,
  gapValue,
}: {
  assumeBackdated: boolean;
  onChange: (v: boolean) => void;
  gapDays: number;
  gapValue: number;
}) {
  return (
    <Panel
      title="Open question for Tracy"
      description="Decides what the overdue lane means."
    >
      <p className="text-slate-700 text-sm leading-relaxed">
        Are renewals backdated the way initial requests are? If yes, gap days
        are recoverable and this screen is about cash timing. If no, they are
        permanent loss and this screen is the highest-value thing we build.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <label
          htmlFor="assume-backdated"
          className="font-medium text-slate-800 text-sm"
        >
          Assume backdated
        </label>
        <Switch
          id="assume-backdated"
          checked={assumeBackdated}
          onCheckedChange={onChange}
          className="data-[state=checked]:bg-indigo-600"
        />
      </div>
      <div className="mt-3 text-xs">
        {assumeBackdated ? (
          <span className="text-amber-800">
            {gapDays} gap days · {money(gapValue)} labelled{" "}
            <strong>recoverable</strong>. Cash timing, not loss. Radar stays
            useful, stakes are lower.
          </span>
        ) : (
          <span className="text-rose-700">
            {gapDays} gap days · {money(gapValue)} labelled{" "}
            <strong>lost</strong>. Permanent and preventable. This lane is the
            case for the product.
          </span>
        )}
      </div>
    </Panel>
  );
}
