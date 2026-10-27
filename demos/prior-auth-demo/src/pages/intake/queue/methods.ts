import { AudioLines, Database, FileUp, Globe, Mail, PenLine, Phone, Printer, type LucideIcon } from "lucide-react";
import type { ReferralMethod } from "@/data/intake/types";

/** The eight ways to start an intake, in the order the client listed them. `simulated`: the demo has no live integration for it. */
export const METHODS: { id: ReferralMethod; icon: LucideIcon; line: string; simulated: boolean }[] = [
  { id: "manual", icon: PenLine, line: "Type in a referral you received.", simulated: false },
  { id: "upload", icon: FileUp, line: "Upload a referral; the Referral Agent reads it.", simulated: true },
  { id: "fax", icon: Printer, line: "Import a fax or PDF from the fax inbox.", simulated: true },
  { id: "email", icon: Mail, line: "Import a referral email and its attachment.", simulated: true },
  { id: "emr", icon: Database, line: "Pull a referral order from the EMR.", simulated: true },
  { id: "phone", icon: Phone, line: "Take the referral on a call, with a checklist.", simulated: false },
  { id: "voice", icon: AudioLines, line: "The Voice Intake Assistant asks the questions; staff confirm.", simulated: true },
  { id: "webform", icon: Globe, line: "A patient or caregiver filled in the web form.", simulated: true },
];
