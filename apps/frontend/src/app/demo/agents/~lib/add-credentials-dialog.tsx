"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/lib/core-ui/dialog";
import { Input } from "@/lib/core-ui/input";

type Props = {
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStored: (name: string) => void;
};

/** Two fields, one toast. The secret is written to the vault and never rendered again. */
export function AddCredentialsDialog({
  name,
  open,
  onOpenChange,
  onStored,
}: Props) {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const ready = username.trim().length > 0 && code.trim().length > 0;
  const store = () => {
    if (!ready) {
      return;
    }
    onStored(name);
    onOpenChange(false);
    setUsername("");
    setCode("");
    toast.success("Stored in vault · never shown again");
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add credentials · {name}</DialogTitle>
          <DialogDescription>
            Encrypted in the vault on save. Agents use them to sign in; nobody
            at Harbor or Psyflo can read them back.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            store();
          }}
        >
          <label className="block space-y-1">
            <span className="font-medium text-slate-700 text-xs">
              Portal username
            </span>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. harbor-auths-svc"
              autoComplete="off"
            />
          </label>
          <label className="block space-y-1">
            <span className="font-medium text-slate-700 text-xs">
              One-time code
            </span>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code from the portal's authenticator"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
          </label>
          <p className="text-[11px] text-slate-500">
            The password is set once by the portal owner through a vault link.
            It never passes through this screen.
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!ready}
            >
              Store in vault
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
