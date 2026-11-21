import type { Metadata } from "next";
import { DemoShell } from "./~lib/demo-shell";

export const metadata: Metadata = {
  title: "Psyflo · Auth Cockpit",
  description: "Prior authorization visibility for behavioral health clinics",
};

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DemoShell>{children}</DemoShell>;
}
