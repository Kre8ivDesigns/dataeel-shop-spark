import { format, isValid } from "date-fns";

export function formatLocalDate(d: Date, fmt: string, fallback: string): string {
  return isValid(d) ? format(d, fmt) : fallback;
}
