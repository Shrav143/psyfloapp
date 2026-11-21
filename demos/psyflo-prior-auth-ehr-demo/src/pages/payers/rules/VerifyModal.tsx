import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button, Field, Modal, TextInput } from "@/components/ui";
import type { PayerRule } from "@/data/workflow/types";
import { readDate } from "./ruleText";

export interface VerifyInput {
  sourceLabel: string;
  sourceUrl: string;
  /** ISO date the source was published, if it says. */
  publishedOn: string;
  /** ISO date a person checked the rule against the source. */
  verifiedOn: string;
}

const isUrl = (s: string): boolean => /^https?:\/\/\S+\.\S+/i.test(s.trim());

/** Mark as verified: the only way a rule becomes Verified. A person names the source and the date they checked it. Psyflo cannot check a source itself, and says so.
    A source address is optional, but when it is given it must be a web address. Mounted only while open. */
export function VerifyModal({ rule, today, onClose, onVerify }: { rule: PayerRule; today: string; onClose: () => void; onVerify: (v: VerifyInput) => void }) {
  const [label, setLabel] = useState(rule.source.kind === "demo_sample" || rule.source.kind === "user_entered" ? "" : rule.source.label);
  const [url, setUrl] = useState(rule.source.url ?? "");
  const [published, setPublished] = useState(rule.source.publishedOn ?? "");
  const [on, setOn] = useState(today);
  const [errors, setErrors] = useState<{ label?: string; url?: string; on?: string }>({});
  const save = () => {
    const e: typeof errors = {};
    if (!label.trim()) e.label = "Name the source: the payer's manual, a letter, a call reference.";
    if (url.trim() && !isUrl(url)) e.url = "Use a web address that starts with http:// or https://, or leave it empty.";
    if (!on) e.on = "Add the date you checked it.";
    else if (on > today) e.on = "That date is in the future. Use today or earlier.";
    setErrors(e);
    if (Object.keys(e).length) return;
    onVerify({ sourceLabel: label.trim(), sourceUrl: url.trim(), publishedOn: published, verifiedOn: on });
  };
  return (
    <Modal open size="md" onClose={onClose} title="Mark as verified" subtitle={`${rule.title}. Verified means a person checked it against a source. Psyflo does not check the source itself.`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" icon={BadgeCheck} onClick={save}>Mark as verified</Button></>}>
      <div className="flex flex-col gap-4">
        <Field label="Source" required error={errors.label} hint="For example: the payer's provider manual, section 4, or a call reference."><TextInput value={label} onChange={(e) => { setLabel(e.target.value); setErrors((x) => ({ ...x, label: undefined })); }} /></Field>
        <Field label="Source address" error={errors.url} hint="Optional. Only a real web address; nothing is opened or fetched."><TextInput value={url} onChange={(e) => { setUrl(e.target.value); setErrors((x) => ({ ...x, url: undefined })); }} placeholder="https://" /></Field>
        <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
          <Field label="Source published on" hint="Optional."><TextInput type="date" max={today} value={published} onChange={(e) => setPublished(e.target.value)} /></Field>
          <Field label="Checked on" required error={errors.on} hint={`Today is ${readDate(today)}.`}><TextInput type="date" max={today} value={on} onChange={(e) => { setOn(e.target.value); setErrors((x) => ({ ...x, on: undefined })); }} /></Field>
        </div>
      </div>
    </Modal>
  );
}
