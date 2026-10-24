import {
  Activity, AlertTriangle, Archive, ArrowRightLeft, BadgeCheck, Ban, Banknote, Bell, BellRing, BookOpen, Bot, Box, Braces, Brain, Building2, CalendarCheck, CalendarClock, CalendarDays, CalendarRange, CalendarX, CheckCircle2, CircleDot, CircleHelp, CircleStop,
  ClipboardCheck, ClipboardList, ClipboardPen, Clock, Cloud, Code, Compass, Copy, Database, Equal, Eye, FileCheck, FileInput, FileOutput, FilePen, FilePlus, FileSearch, FileStack, FileText, FileWarning, Files, Filter, Flag, FolderOpen, Funnel, Gauge, Gavel, GitBranch, GitFork, GitMerge, Globe,
  Hand, Handshake, HeartPulse, History, Hourglass, Inbox, Layers, Link2, ListChecks, ListFilter, ListTodo, Mail, MailCheck, Megaphone, MessageSquare, MessageSquareWarning, MousePointerClick, Network, Package, PackageCheck, PenLine, Phone, PhoneCall, Play, Plug, Printer, Receipt, RefreshCw, Repeat, Route, Scale,
  ScanSearch, ScanText, ScrollText, Send, Server, Shield, ShieldAlert, ShieldCheck, Siren, Sparkles, Split, Stethoscope, Timer, UserCheck, UserRound, Users, Wand2, Webhook, Workflow, Zap, type LucideIcon,
} from "lucide-react";

/* The catalog names each node's icon as a lucide name. Only the icons the builder draws are imported, so the bundle does not carry the whole set. */
const ICONS: Record<string, LucideIcon> = {
  Activity, AlertTriangle, Archive, ArrowRightLeft, BadgeCheck, Ban, Banknote, Bell, BellRing, BookOpen, Bot, Box, Braces, Brain, Building2, CalendarCheck, CalendarClock, CalendarDays, CalendarRange, CalendarX, CheckCircle2, CircleDot, CircleHelp, CircleStop,
  ClipboardCheck, ClipboardList, ClipboardPen, Clock, Cloud, Code, Compass, Copy, Database, Equal, Eye, FileCheck, FileInput, FileOutput, FilePen, FilePlus, FileSearch, FileStack, FileText, FileWarning, Files, Filter, Flag, FolderOpen, Funnel, Gauge, Gavel, GitBranch, GitFork, GitMerge, Globe,
  Hand, Handshake, HeartPulse, History, Hourglass, Inbox, Layers, Link2, ListChecks, ListFilter, ListTodo, Mail, MailCheck, Megaphone, MessageSquare, MessageSquareWarning, MousePointerClick, Network, Package, PackageCheck, PenLine, Phone, PhoneCall, Play, Plug, Printer, Receipt, RefreshCw, Repeat, Route, Scale,
  ScanSearch, ScanText, ScrollText, Send, Server, Shield, ShieldAlert, ShieldCheck, Siren, Sparkles, Split, Stethoscope, Timer, UserCheck, UserRound, Users, Wand2, Webhook, Workflow, Zap,
};

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const BY_NAME = new Map(Object.entries(ICONS).map(([k, v]) => [norm(k), v]));
/** Lucide renamed a few icons; the old names still resolve here. */
for (const [alias, name] of [["checkcircle", "CheckCircle2"], ["helpcircle", "CircleHelp"], ["stopcircle", "CircleStop"], ["trianglealert", "AlertTriangle"], ["wandsparkles", "Wand2"], ["wand", "Wand2"], ["user", "UserRound"], ["circlecheck", "CheckCircle2"]] as const) BY_NAME.set(alias, ICONS[name]);

/** The icon for a catalog name such as "ShieldCheck" or "shield-check". A name the builder does not know draws a plain box. */
export const iconFor = (name: string | undefined): LucideIcon => (name ? BY_NAME.get(norm(name)) : undefined) ?? Box;
export const knownIcon = (name: string): boolean => BY_NAME.has(norm(name));
