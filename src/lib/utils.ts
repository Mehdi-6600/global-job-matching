import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";  // ← درستش کن

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
