import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "dark" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-forest text-white hover:bg-forest-dark border border-transparent",
  dark: "bg-ink text-white hover:bg-black border border-transparent",
  outline: "bg-white text-ink border border-field hover:bg-tile",
  ghost: "text-forest font-semibold hover:bg-sage-bg border border-transparent px-2",
  danger: "bg-white text-risk-ink border border-risk-edge hover:bg-risk-bg",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[10px]",
  md: "h-[38px] px-4 text-sm rounded-xl",
  lg: "h-[46px] px-6 text-[14px] rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  trailing?: LucideIcon;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({ variant = "outline", size = "md", icon: Icon, trailing: Trailing, loading, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn("inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:opacity-50", VARIANT[variant], SIZE[size], className)}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="ico psy-spin" /> : Icon ? <Icon size={16} className="ico" /> : null}
      {children}
      {Trailing ? <Trailing size={16} className="ico" /> : null}
    </button>
  );
}
