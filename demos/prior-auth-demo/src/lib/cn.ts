import { clsx, type ClassValue } from "clsx";

/** Join class names. Tailwind v4 has no merge helper here, so avoid passing conflicting utilities. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
