"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/lib/core-ui/button";
import { Panel } from "@/lib/demo-ui/primitives";
import { Pill, StatusBadge } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import { AddCredentialsDialog } from "./add-credentials-dialog";

type Credential = {
  name: string;
  kind: string;
  mfa: string;
  rotated: string;
  missing?: boolean;
};

const CREDENTIALS: Credential[] = [
  {
    name: "Availity",
    kind: "Service account",
    mfa: "MFA · authenticator",
    rotated: "Rotated 12 days ago",
  },
  {
    name: "WellCare provider portal",
    kind: "Service account",
    mfa: "MFA · authenticator",
    rotated: "Rotated 19 days ago",
  },
  {
    name: "Novitas",
    kind: "Portal login · fax cover on file",
    mfa: "MFA · authenticator",
    rotated: "Rotated 41 days ago",
  },
  {
    name: "Sunwave",
    kind: "Export user + API key",
    mfa: "IP-restricted",
    rotated: "Rotated 9 days ago",
  },
  {
    name: "eFax",
    kind: "API key",
    mfa: "Scoped to send + reports",
    rotated: "Rotated 33 days ago",
  },
  {
    name: "Carelon Behavioral Health",
    kind: "Provider portal · carve-out payer",
    mfa: "—",
    rotated: "Nothing on file",
    missing: true,
  },
];

export function CredentialVault() {
  const [stored, setStored] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [open, setOpen] = useState(false);
  const add = (name: string) => {
    setTarget(name);
    setOpen(true);
  };
  return (
    <>
      <Panel
        title="Credential vault"
        description="Agents sign in with vaulted credentials. Nothing is stored in a browser, nothing is shown to staff."
        right={<Pill tone="slate">Rotated on schedule</Pill>}
        padded={false}
      >
        <ul className="divide-y divide-slate-100">
          {CREDENTIALS.map((c) => {
            const justStored = stored.includes(c.name);
            const missing = Boolean(c.missing) && !justStored;
            return (
              <li
                key={c.name}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg",
                      missing
                        ? "bg-amber-50 text-amber-600"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <KeyRound className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900 text-sm">
                      {c.name}
                    </div>
                    <div className="truncate text-slate-500 text-xs">
                      {justStored
                        ? `${c.kind} · MFA enrolled · Rotated just now`
                        : `${c.kind} · ${c.mfa} · ${c.rotated}`}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge
                    status={missing ? "credentials needed" : "connected"}
                  />
                  {missing ? (
                    <Button
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => add(c.name)}
                    >
                      Add credentials
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <AddCredentialsDialog
        name={target}
        open={open}
        onOpenChange={setOpen}
        onStored={(name) => setStored((s) => [...s, name])}
      />
    </>
  );
}
